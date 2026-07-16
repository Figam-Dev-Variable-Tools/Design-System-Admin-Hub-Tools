// SiteSettingsPage — 사이트 설정 (라우트: /settings/site) · 시스템 설정 섹션 소유
//
// 사이트의 이름·주소·연락처·시간대와 **두 개의 스위치**(회원가입 허용 · 유지보수 모드)를 정한다.
//
// [이 화면이 위험한 이유 — 유지보수 모드]
// 켜는 순간 방문자는 사이트를 쓸 수 없다. 그래서 세 겹으로 막는다:
//   ① 스위치를 켜면 그 자리에서 danger 경고가 뜬다(저장 전에 무슨 일이 일어날지 알린다)
//   ② 저장은 확인 다이얼로그를 거친다 — 유지보수 전환이면 문구가 그 사실을 명시한다
//   ③ 안내 문구가 비면 저장을 거부한다(방문자에게 빈 화면을 내보내지 않는다 — validation.ts)
//
// [동시 편집] 저장은 내가 읽은 revision 을 함께 보낸다. 다른 관리자가 먼저 저장했으면 덮어쓰지 않고
// 충돌 다이얼로그를 띄운다(EXC-04) — 입력은 그대로 살아 있다.
//
// [권한] 시스템 설정은 최상위 권한이다. 조회 권한이 없으면 403, 수정 권한이 없으면 저장 컨트롤이
// 아예 없다(EXC-03 — _shared/access.tsx).
//
// [데이터] 화면은 data-source.ts 하고만 대화한다. 실제 HTTP 호출은 없다(백엔드 미존재).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, FocusEvent } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  Alert,
  ConfirmDialog,
  FormField,
  SelectField,
  ToggleSwitch,
  useToast,
} from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { divergedLabels, formatAuditAt } from '../_shared/diff';
import { TextInputField } from '../_shared/fields';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import { normalizePhone } from '../_shared/validation';
import { SITE_FIELD_LABELS, siteSettingsKey, siteSettingsStore } from './data-source';
import {
  MAINTENANCE_MESSAGE_MAX,
  SITE_DESCRIPTION_MAX,
  SITE_NAME_MAX,
  siteSettingsSchema,
  TIMEZONE_OPTIONS,
} from './validation';
import type { SiteSettingsValues } from './validation';

const UNSAVED_MESSAGE =
  '사이트 설정에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. 사이트 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.';

const switchRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const switchTextStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  minWidth: 0,
};

const switchLabelStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const switchHintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 7), 1fr))',
  gap: 'var(--tds-space-4)',
};

/** 저장 확인 문구 — 유지보수 전환이면 그 사실을 앞세운다(무엇이 일어나는지 모르고 확인하지 않게) */
function saveConfirmMessage(values: SiteSettingsValues, wasMaintenance: boolean): string {
  if (values.maintenanceMode && !wasMaintenance) {
    return '유지보수 모드를 켭니다. 저장하는 즉시 방문자는 사이트를 이용할 수 없고 안내 문구만 보게 됩니다. 저장할까요?';
  }
  if (!values.maintenanceMode && wasMaintenance) {
    return '유지보수 모드를 끕니다. 저장하는 즉시 사이트가 다시 열립니다. 저장할까요?';
  }
  return '사이트 설정을 저장하면 사이트 전반에 즉시 반영됩니다. 저장할까요?';
}

export default function SiteSettingsPage() {
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  const { data, isFetching, error, refetch } = useSettingsQuery(siteSettingsKey, siteSettingsStore);
  const save = useSaveSettings(siteSettingsKey, siteSettingsStore);
  const saving = save.isPending;
  const lock = useSubmitLock();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<SiteSettingsValues>({
    resolver: zodResolver(siteSettingsSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  /** 확인 다이얼로그에 실을 값 — 검증을 통과한 제출 1건 */
  const [pending, setPending] = useState<SiteSettingsValues | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 409 — 다른 관리자가 먼저 저장했다. 최신 문서를 들고 사용자의 선택을 기다린다 */
  const [conflict, setConflict] = useState<Revisioned<SiteSettingsValues> | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 설정이 도착하면 폼을 채운다 — 이 값이 dirty 판정의 기준선이 된다
  useEffect(() => {
    if (data === undefined) return;
    reset(data.value);
  }, [data, reset]);

  const maintenanceMode = watch('maintenanceMode');
  const siteName = watch('siteName');
  const siteDescription = watch('siteDescription');
  const maintenanceMessage = watch('maintenanceMessage');

  /** 서버가 알고 있는 유지보수 상태 — 확인 문구가 '켜는 중인지 끄는 중인지' 를 이걸로 안다 */
  const savedMaintenance = data?.value.maintenanceMode ?? false;

  // [STATE-01] 첫 로딩에서만 스켈레톤 — 재조회 중에는 이전 값을 유지한다
  const loading = isFetching && data === undefined;

  const audit: AuditInfo | null = data?.audit ?? null;

  const runSave = useCallback(
    (values: SiteSettingsValues, force: boolean) => {
      const revision = data?.revision;
      if (revision === undefined) return;

      // [EXC-08] 동기 잠금 — disabled 렌더를 기다리지 않는다. 빠른 더블 클릭의 2번째가 여기서 멈춘다
      if (!lock.acquire()) return;

      setSaveError(null);

      const controller = new AbortController();
      controllerRef.current = controller;

      save.mutate(
        { value: values, expectedRevision: revision, force, signal: controller.signal },
        {
          onSuccess: () => {
            lock.release();
            if (controller.signal.aborted) return;
            // 저장한 값이 새 기준선이다 — dirty 가 풀려 이탈 가드도 함께 내려간다
            reset(values);
            setPending(null);
            setConflict(null);
            toast.success('사이트 설정을 저장했습니다.');
          },
          onError: (cause: unknown) => {
            lock.release();
            // [EXC-09] 취소는 실패가 아니다 — 사용자가 다이얼로그를 닫은 것이다
            if (isAbort(cause) || controller.signal.aborted) return;

            // [EXC-04] 409 — 덮어쓰지 않는다. 입력을 쥔 채로 선택을 묻는다
            if (isSettingsConflict(cause)) {
              setPending(null);
              setConflict(cause.latest as Revisioned<SiteSettingsValues>);
              return;
            }

            setSaveError('사이트 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, lock, reset, save, toast],
  );

  /** 제출 — 여기서 저장하지 않는다. 검증을 통과한 값을 쥐고 확인 다이얼로그를 세운다 */
  const onValid = useCallback((values: SiteSettingsValues) => {
    setSaveError(null);
    setPending(values);
  }, []);

  /** 확인 — 실제 저장. 실패해도 다이얼로그를 닫지 않는다(재클릭 = 재시도) */
  const confirmSave = useCallback(() => {
    if (pending === null) return;
    runSave(pending, false);
  }, [pending, runSave]);

  /** 취소·Esc·딤 클릭 — 진행 중이던 저장도 함께 취소한다 */
  const cancelSave = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setSaveError(null);
    setPending(null);
  }, [lock, save]);

  /* ── 충돌 해소 ─────────────────────────────────────────────────────────── */

  /** 최신 내용으로 되돌린다 — 내 입력을 버리는 선택이다(라벨이 그렇게 말한다) */
  const reloadLatest = useCallback(() => {
    const latest = conflict;
    if (latest === null) return;
    reset(latest.value);
    setConflict(null);
    void refetch();
    toast.success('최신 사이트 설정을 불러왔습니다.');
  }, [conflict, refetch, reset, toast]);

  /** 덮어쓴다 — 상대의 변경을 버리는 선택이다. force 로 토큰 검사를 건너뛴다 */
  const overwrite = useCallback(() => {
    runSave(getValues(), true);
  }, [getValues, runSave]);

  const closeConflict = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setConflict(null);
  }, [lock, save]);

  const conflictFields = useMemo(() => {
    if (conflict === null) return [];
    return divergedLabels(getValues(), conflict.value, SITE_FIELD_LABELS);
  }, [conflict, getValues]);

  const disabled = saving || loading || !canUpdate;

  return (
    <>
      <SettingsFormShell
        cardTitle="사이트 설정"
        description="별표(*) 항목은 필수입니다. 저장하면 사이트 전반에 즉시 반영됩니다."
        loading={loading}
        loadFailed={error !== null}
        onRetry={() => void refetch()}
        serverError={saveError !== null && pending === null ? saveError : null}
        saving={saving}
        dirty={isDirty}
        canUpdate={canUpdate}
        readOnlyNotice={READ_ONLY_NOTICE}
        unsavedMessage={UNSAVED_MESSAGE}
        audit={audit}
        warning={
          maintenanceMode ? (
            <Alert tone="danger">
              유지보수 모드가 켜져 있습니다. 저장하면 방문자는 사이트를 이용할 수 없고 아래 안내
              문구만 보게 됩니다.
            </Alert>
          ) : null
        }
        onSubmit={(event) => void handleSubmit(onValid)(event)}
      >
        <TextInputField
          id="site-name"
          label="사이트명"
          required
          disabled={disabled}
          error={errors.siteName?.message}
          counter={`${String(siteName.length)}/${String(SITE_NAME_MAX)}`}
          maxLength={SITE_NAME_MAX}
          placeholder="예: TDS 스페이스플래닝"
          registration={register('siteName')}
        />

        <TextInputField
          id="site-description"
          label="사이트 설명"
          disabled={disabled}
          error={errors.siteDescription?.message}
          hint="검색 결과에 노출되는 문구입니다."
          counter={`${String(siteDescription.length)}/${String(SITE_DESCRIPTION_MAX)}`}
          maxLength={SITE_DESCRIPTION_MAX}
          registration={register('siteDescription')}
        />

        <TextInputField
          id="site-base-url"
          label="기본 URL"
          required
          disabled={disabled}
          error={errors.baseUrl?.message}
          hint="https:// 로 시작하는 사이트 주소입니다."
          type="url"
          inputMode="url"
          placeholder="https://example.com"
          registration={register('baseUrl')}
        />

        <div style={rowStyle}>
          <TextInputField
            id="site-contact-email"
            label="대표 이메일"
            required
            disabled={disabled}
            error={errors.contactEmail?.message}
            type="email"
            inputMode="email"
            placeholder="help@example.com"
            registration={register('contactEmail')}
          />

          <TextInputField
            id="site-contact-phone"
            label="대표 전화번호"
            required
            disabled={disabled}
            error={errors.contactPhone?.message}
            inputMode="tel"
            placeholder="02-1234-5678"
            // 붙여넣은 '+82 2 1234 5678' 을 사람이 고치게 하지 않는다 — blur 에서 정규화한다
            registration={register('contactPhone', {
              onBlur: (event: FocusEvent<HTMLInputElement>) => {
                const normalized = normalizePhone(event.target.value);
                if (normalized !== event.target.value) {
                  setValue('contactPhone', normalized, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }
              },
            })}
          />
        </div>

        <FormField htmlFor="site-timezone" label="표시 시간대" required>
          <SelectField id="site-timezone" disabled={disabled} {...register('timezone')}>
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <div style={switchRowStyle}>
          <span style={switchTextStyle}>
            <span style={switchLabelStyle}>회원가입 허용</span>
            <p style={switchHintStyle}>
              끄면 새 회원이 가입할 수 없습니다. 기존 회원은 그대로입니다.
            </p>
          </span>
          <ToggleSwitch
            checked={watch('signupEnabled')}
            label="회원가입 허용"
            disabled={disabled}
            onChange={(next) => {
              setValue('signupEnabled', next, { shouldDirty: true });
            }}
          />
        </div>

        <div style={switchRowStyle}>
          <span style={switchTextStyle}>
            <span style={switchLabelStyle}>유지보수 모드</span>
            <p style={switchHintStyle}>
              켜면 방문자는 사이트를 이용할 수 없고 안내 문구만 보게 됩니다. 관리자는 계속 접속할 수
              있습니다.
            </p>
          </span>
          <ToggleSwitch
            checked={maintenanceMode}
            label="유지보수 모드"
            disabled={disabled}
            onChange={(next) => {
              setValue('maintenanceMode', next, { shouldDirty: true, shouldValidate: true });
            }}
          />
        </div>

        {/* 유지보수 문구는 모드가 켜졌을 때만 의미가 있다 — 꺼져 있으면 자리를 차지하지 않는다 */}
        {maintenanceMode && (
          <TextInputField
            id="site-maintenance-message"
            label="유지보수 안내 문구"
            required
            disabled={disabled}
            error={errors.maintenanceMessage?.message}
            hint="방문자가 보게 될 문구입니다."
            counter={`${String(maintenanceMessage.length)}/${String(MAINTENANCE_MESSAGE_MAX)}`}
            maxLength={MAINTENANCE_MESSAGE_MAX}
            placeholder="예: 더 나은 서비스를 위해 잠시 점검 중입니다. 곧 돌아오겠습니다."
            registration={register('maintenanceMessage')}
          />
        )}
      </SettingsFormShell>

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title="사이트 설정 저장"
          message={saveConfirmMessage(pending, savedMaintenance)}
          busy={saving}
          error={saveError}
          onConfirm={confirmSave}
          onCancel={cancelSave}
        />
      )}

      {conflict !== null && (
        <ConflictDialog
          subject="사이트 설정"
          latestBy={conflict.audit.updatedBy}
          latestAt={formatAuditAt(conflict.audit.updatedAt)}
          divergedFields={conflictFields}
          busy={saving}
          error={saveError}
          onReload={reloadLatest}
          onOverwrite={overwrite}
          onClose={closeConflict}
        />
      )}
    </>
  );
}

/** 폼의 초기 골격 — 조회가 도착하면 reset() 이 실제 값으로 갈아끼운다 */
const DEFAULT_FORM_VALUES: SiteSettingsValues = {
  siteName: '',
  siteDescription: '',
  baseUrl: '',
  contactEmail: '',
  contactPhone: '',
  timezone: 'Asia/Seoul',
  signupEnabled: true,
  maintenanceMode: false,
  maintenanceMessage: '',
};
