// SiteConnectPage — 사이트 연동 (라우트: /settings/site-connect) · 시스템 설정 섹션 소유
//
// ┌ 이 화면이 답하는 질문 ─────────────────────────────────────────────────────┐
// │ B2C 홈페이지가 붙으면 주문·문의·회원에 대해 가장 먼저 나오는 질문은 하나다:     │
// │ **"이거 어디서 왔어요?"**                                                   │
// │                                                                          │
// │ 지금 문의의 `channel`(storefront/app/phone…)은 그 질문에 답하지 않는다 —      │
// │ 그건 **접점**(어느 창구로 말을 걸었나)이고, 유입원은 **출처**(어디서 왔나)다.   │
// │ 둘을 한 필드에 뭉치면 '전화로 문의한 인스타 광고 유입' 을 표현할 수 없다.       │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [여기서 하는 일 / 하지 않는 일]
//   함 : 연동 도메인·허용 출처·연동 키 설정, 그리고 **이미 도착한 관측을 보여 주기**
//   안 함 : 이벤트 수신. 웹훅을 흉내 내지 않는다 — 경계는 data-source.ts 의
//           `TODO(backend): POST /api/site-connect/events` 까지다.
//
// [키는 저장 여부만 노출한다] ../api-keys · ../oauth 와 같은 규약이다: 평문을 담을 자리를 만들지
// 않는 것이 방어다. 화면이 그리는 고정 길이 글리프는 가린 표시가 아니라 **우리가 가진 정보의 전부**다.
//
// [유입 데이터에 편집 표면이 없다] 관측값이기 때문이다. 운영자가 '이건 인스타 같은데' 하며 고칠
// 수 있으면 이 데이터는 측정이 아니라 의견이 되고, 광고비 판단의 근거로 쓸 수 없다.
//
// [미상은 direct 로 흡수한다 — 그리고 그것은 설정이 아니다] 카탈로그와 흡수 규칙은
// shared/domain/traffic-source.ts 가 갖는다. 여기서 고를 수 있게 만들면 계정마다 기여도 계산이
// 달라져 두 사이트의 숫자를 비교할 수 없다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { cssVar, StatusBadge, ToggleSwitch } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { formatDateTime } from '../../../shared/format';
import {
  Alert,
  Card,
  CardTitle,
  ConfirmDialog,
  errorIdOf,
  FormField,
  hintIdOf,
  hintStyle,
  tableStyle,
  tdStyle,
  thStyle,
  useToast,
} from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { trafficChannelLabel } from '../../../shared/domain/traffic-source';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { formatAuditAt, divergedLabels } from '../_shared/diff';
import { TextInputField } from '../_shared/fields';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { MASKED_SECRET_TEXT } from '../_shared/secret';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import {
  listTrafficObservations,
  siteConnectKey,
  siteConnectStore,
  SITE_CONNECT_FIELD_LABELS,
} from './data-source';
import { enableBlock, saveBlock, toDoc, toValues } from './rules';
import type { SiteConnectDoc } from './rules';
import { EMPTY_SITE_CONNECT, SECRET_MAX, siteConnectSchema, SITE_URL_MAX } from './validation';
import type { SiteConnectValues } from './validation';

const PAGE_DESCRIPTION =
  'B2C 홈페이지를 이 어드민에 연결하고, 주문·문의·회원이 어디서 왔는지를 함께 받습니다. 연동 키는 저장 여부만 표시하며 값은 다시 보여 주지 않습니다.';

const UNSAVED_MESSAGE =
  '사이트 연동에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. 사이트 연동을 바꾸려면 시스템 설정 수정 권한이 필요합니다.';

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const secretRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const maskStyle: CSSProperties = {
  fontFamily: cssVar('typography.code.md.font-family'),
  fontSize: cssVar('typography.code.md.font-size'),
  color: cssVar('color.text.muted'),
  letterSpacing: cssVar('space.1'),
};

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const scrollStyle: CSSProperties = { overflowX: 'auto', minWidth: 0 };

export default function SiteConnectPage() {
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  const { data, isFetching, error, refetch } = useSettingsQuery(siteConnectKey, siteConnectStore);
  const save = useSaveSettings(siteConnectKey, siteConnectStore);
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
  } = useForm<SiteConnectValues>({
    resolver: zodResolver(siteConnectSchema),
    defaultValues: EMPTY_SITE_CONNECT,
  });

  const [pending, setPending] = useState<SiteConnectValues | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 규칙이 거절한 이유 — 저장 실패(서버)와 성격이 달라 자리를 나눈다 */
  const [rejected, setRejected] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Revisioned<SiteConnectDoc> | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 설정이 도착하면 폼을 채운다 — 이 값이 dirty 판정의 기준선이 된다
  useEffect(() => {
    if (data === undefined) return;
    reset(toValues(data.value));
  }, [data, reset]);

  const enabled = watch('enabled');
  const hasSecret = watch('hasSecret');
  const siteUrl = watch('siteUrl');
  const secretInput = watch('secretInput');
  const allowedOrigins = watch('allowedOrigins');

  const loading = isFetching && data === undefined;
  const audit: AuditInfo | null = data?.audit ?? null;
  const disabled = saving || loading || !canUpdate;

  /**
   * 토글의 disabled 와 저장의 거절이 읽는 **같은 술어**.
   *
   * 이미 켜져 있는 연동은 끌 수 있어야 하므로 잠금은 '켜려 할 때' 만 건다.
   */
  const blockReason = enableBlock({
    enabled,
    siteUrl,
    allowedOrigins,
    hasSecret,
    secretInput,
  });

  const observations = useMemo(() => listTrafficObservations(), []);

  const runSave = useCallback(
    (values: SiteConnectValues, force: boolean) => {
      const revision = data?.revision;
      if (revision === undefined) return;

      // [EXC-08] 동기 잠금 — 빠른 더블 클릭의 두 번째가 여기서 멈춘다
      if (!lock.acquire()) return;

      setSaveError(null);
      const controller = new AbortController();
      controllerRef.current = controller;

      save.mutate(
        { value: toDoc(values), expectedRevision: revision, force, signal: controller.signal },
        {
          onSuccess: (saved) => {
            lock.release();
            if (controller.signal.aborted) return;
            // 저장된 문서가 새 기준선이다 — 키 입력 칸은 다시 비워진다(평문을 들고 있지 않는다)
            reset(toValues(saved.value));
            setPending(null);
            setConflict(null);
            toast.success('사이트 연동을 저장했습니다.');
          },
          onError: (cause: unknown) => {
            lock.release();
            // [EXC-09] 취소는 실패가 아니다
            if (isAbort(cause) || controller.signal.aborted) return;

            // [EXC-04] 409 — 덮어쓰지 않는다. 입력을 쥔 채로 선택을 묻는다
            if (isSettingsConflict(cause)) {
              setPending(null);
              setConflict(cause.latest as Revisioned<SiteConnectDoc>);
              return;
            }

            setSaveError('사이트 연동을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, lock, reset, save, toast],
  );

  /** 제출 — 저장하지 않는다. 규칙을 한 번 더 보고, 통과하면 확인 다이얼로그를 세운다 */
  const onValid = useCallback((values: SiteConnectValues) => {
    setSaveError(null);
    const block = saveBlock(values);
    if (block !== null) {
      setRejected(block);
      return;
    }
    setRejected(null);
    setPending(values);
  }, []);

  const cancelSave = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setSaveError(null);
    setPending(null);
  }, [lock, save]);

  const reloadLatest = useCallback(() => {
    const latest = conflict;
    if (latest === null) return;
    reset(toValues(latest.value));
    setConflict(null);
    void refetch();
    toast.success('최신 사이트 연동 설정을 불러왔습니다.');
  }, [conflict, refetch, reset, toast]);

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
    return divergedLabels(toDoc(getValues()), conflict.value, SITE_CONNECT_FIELD_LABELS);
  }, [conflict, getValues]);

  return (
    <div style={pageStyle}>
      <SettingsFormShell
        cardTitle="사이트 연동"
        description={PAGE_DESCRIPTION}
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
          rejected !== null ? (
            <Alert tone="danger">{rejected}</Alert>
          ) : enabled ? null : (
            <Alert tone="info">
              연동이 꺼져 있습니다. 홈페이지에서 보내는 유입·주문·문의 이벤트는 모두 거절됩니다.
            </Alert>
          )
        }
        onSubmit={(event) => void handleSubmit(onValid)(event)}
      >
        <div style={sectionStyle}>
          <div style={toggleRowStyle}>
            <span style={hintStyle}>
              연동 사용 — 켜려면 홈페이지 도메인과 연동 키가 모두 있어야 합니다.
            </span>
            <ToggleSwitch
              checked={enabled}
              label="사이트 연동 사용"
              disabled={disabled || (!enabled && blockReason !== null)}
              onChange={(next) => {
                setValue('enabled', next, { shouldDirty: true });
                setRejected(null);
              }}
            />
          </div>

          {/* 잠긴 토글은 이유를 그 자리에서 말한다 — 이유 없는 disabled 는 고장으로 읽힌다 */}
          {!enabled && blockReason !== null && <Alert tone="info">{blockReason}</Alert>}

          <TextInputField
            id="site-connect-url"
            label="홈페이지 도메인"
            type="url"
            registration={register('siteUrl')}
            disabled={disabled}
            error={errors.siteUrl?.message}
            hint="https:// 로 시작하는 주소입니다. 이 도메인에서 온 이벤트만 받습니다."
            placeholder="https://shop.example.com"
            maxLength={SITE_URL_MAX}
          />

          {/* aria-invalid 를 켜면 반드시 오류 <p> 의 id 를 describedby 로 잇는다 (A11Y-11) —
              FormField 가 그 <p> 를 errorIdOf(id) 로 그린다 */}
          <FormField
            htmlFor="site-connect-origins"
            label="추가 허용 출처"
            error={errors.allowedOrigins?.message ?? ''}
            hint="서브도메인·스테이징을 한 줄에 하나씩 적습니다. 경로는 붙이지 않습니다."
          >
            <textarea
              id="site-connect-origins"
              className="tds-ui-input tds-ui-focusable"
              rows={3}
              disabled={disabled}
              aria-invalid={errors.allowedOrigins !== undefined}
              aria-describedby={
                errors.allowedOrigins === undefined
                  ? hintIdOf('site-connect-origins')
                  : errorIdOf('site-connect-origins')
              }
              placeholder={'https://www.example.com\nhttps://stage.example.com'}
              {...register('allowedOrigins')}
            />
          </FormField>

          <div style={secretRowStyle}>
            <span style={hintStyle}>연동 키</span>
            {hasSecret ? (
              <>
                <StatusBadge tone="success" label="저장됨" />
                <span style={maskStyle}>{MASKED_SECRET_TEXT}</span>
              </>
            ) : (
              <StatusBadge tone="neutral" label="저장된 키 없음" />
            )}
          </div>

          <TextInputField
            id="site-connect-secret"
            label={hasSecret ? '새 연동 키 (교체할 때만 입력)' : '연동 키'}
            type="password"
            registration={register('secretInput')}
            disabled={disabled}
            error={errors.secretInput?.message}
            hint={
              hasSecret
                ? '비워 두면 저장된 키가 그대로 유지됩니다. 저장된 키는 다시 보여 드릴 수 없습니다.'
                : '홈페이지에서 이벤트를 보낼 때 서명에 쓰는 키입니다. 저장 후에는 다시 보여 드릴 수 없습니다.'
            }
            maxLength={SECRET_MAX}
          />
        </div>
      </SettingsFormShell>

      <Card>
        <CardTitle>최근 유입 관측</CardTitle>
        <p style={hintStyle}>
          주문·문의·회원의 <strong>최초 접점</strong>입니다. 마지막 접점으로 덮어쓰지 않습니다 —
          그러면 광고 기여도가 마지막 클릭으로 뭉개집니다. 관측값이므로 이 화면에서 고칠 수
          없습니다.
        </p>

        {observations.length === 0 ? (
          <p style={hintStyle}>아직 도착한 유입 이벤트가 없습니다.</p>
        ) : (
          <div style={scrollStyle}>
            <table style={tableStyle}>
              <caption style={hintStyle}>최초 접점 기준 최신순 — 조회 전용</caption>
              <thead>
                <tr>
                  <th style={thStyle} scope="col">
                    대상
                  </th>
                  <th style={thStyle} scope="col">
                    채널
                  </th>
                  <th style={thStyle} scope="col">
                    캠페인
                  </th>
                  <th style={thStyle} scope="col">
                    직전 페이지
                  </th>
                  <th style={thStyle} scope="col">
                    최초 접점
                  </th>
                </tr>
              </thead>
              <tbody>
                {observations.map((observation) => (
                  <tr key={observation.id}>
                    <td style={tdStyle}>{observation.subjectLabel}</td>
                    <td style={tdStyle}>
                      <StatusBadge
                        tone={observation.source.channel === 'direct' ? 'neutral' : 'info'}
                        label={trafficChannelLabel(observation.source.channel)}
                      />
                    </td>
                    {/* 없는 값은 '—' 다 — 빈 칸을 만들면 '값이 빈 문자열' 과 구분되지 않는다 */}
                    <td style={tdStyle}>{observation.source.campaign ?? '—'}</td>
                    <td style={tdStyle}>{observation.source.referrer ?? '—'}</td>
                    <td style={tdStyle}>{formatDateTime(observation.source.landedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title="사이트 연동 저장"
          message={
            pending.enabled
              ? '저장하는 즉시 이 도메인에서 오는 이벤트를 받기 시작합니다. 저장할까요?'
              : '연동이 꺼진 채로 저장합니다. 홈페이지에서 보내는 이벤트는 모두 거절됩니다. 저장할까요?'
          }
          busy={saving}
          error={saveError}
          onConfirm={() => {
            runSave(pending, false);
          }}
          onCancel={cancelSave}
        />
      )}

      {conflict !== null && (
        <ConflictDialog
          subject="사이트 연동"
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
    </div>
  );
}
