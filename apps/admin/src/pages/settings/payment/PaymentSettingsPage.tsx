// PaymentSettingsPage — 결제(PG) 설정 (라우트: /settings/payment) · 시스템 설정 섹션 소유
//
// ┌ 이 화면이 정하는 것 ─────────────────────────────────────────────────────┐
// │ 상품과 프로그램을 **결제로 파는가, 문의로 받는가**. 스위치 하나(PG 결제 사용)  │
// │ 가 그 갈림이고, 나머지 칸은 전부 그 스위치에 딸린 값이다:                    │
// │   켜짐 → PG사·상점 ID·연동 모드·결제수단을 정한다                           │
// │   꺼짐 → 고객에게 보일 안내 문구를 정한다(구매/후원 버튼이 '문의하기' 가 된다) │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [결과를 먼저 보여 준다] 여기서 정한 값은 이 화면 밖(상품 카드·프로그램 상세)에서만 눈에 띈다.
// 그래서 스위치 아래에 **지금 버튼이 어떻게 보이는지**를 두 도메인 모두 그린다(CheckoutCtaPreview) —
// ../site 가 사이트 이름 옆에 OG 카드를 그리는 것과 같은 이유다.
//
// [라벨을 이 화면이 고르지 않는다] '구매하기/후원하기/문의하기' 는 shared/commerce 의 checkoutCta 가
// 정한다. 미리보기가 자기 문구를 따로 쓰면, 정작 고객 화면과 다른 것을 보여 주는 미리보기가 된다.
//
// [동시 편집] 저장은 내가 읽은 revision 을 함께 보낸다. 다른 관리자가 먼저 저장했으면 덮어쓰지 않고
// 충돌 다이얼로그를 띄운다(EXC-04).
//
// [권한] 시스템 설정은 최상위 권한이다. 수정 권한이 없으면 저장 컨트롤이 아예 없다(EXC-03).
//
// [데이터] 화면은 data-source.ts 하고만 대화한다. 실제 HTTP 호출은 없다(백엔드 미존재).
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { cssVar, typography } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  Alert,
  checkboxStyle,
  ConfirmDialog,
  errorTextStyle,
  fieldLabelStyle,
  FormField,
  hintStyle,
  SelectField,
  TextareaField,
  ToggleSwitch,
  useToast,
} from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { INQUIRY_PATH } from '../../../shared/commerce/payment-settings';
import type { PaymentMethod, PaymentSettings } from '../../../shared/commerce/payment-settings';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { divergedLabels, formatAuditAt } from '../_shared/diff';
import { TextInputField } from '../_shared/fields';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import { CheckoutCtaPreview } from './components/CheckoutCtaPreview';
import { PAYMENT_FIELD_LABELS, paymentSettingsKey, paymentSettingsStore } from './data-source';
import { METHOD_OPTIONS, MODE_OPTIONS, PROVIDER_OPTIONS, toPaymentFormValues } from './types';
import { INQUIRY_GUIDE_MAX, MERCHANT_ID_MAX, paymentSettingsSchema } from './validation';
import type { PaymentSettingsValues } from './validation';

const PAGE_DESCRIPTION =
  '상품과 프로그램을 결제로 판매할지, 문의로 받을지 정합니다. PG 결제를 끄면 구매·후원 버튼이 문의하기로 바뀝니다.';

const UNSAVED_MESSAGE =
  '결제 설정에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const READ_ONLY_NOTICE =
  '조회 권한만 있습니다. 결제 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.';

/* ── 스타일 ────────────────────────────────────────────────────────────────── */

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.5'),
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.subtle'),
  minWidth: 0,
};

const sectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.md'),
};

const sectionBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 6), 1fr))`,
  gap: cssVar('space.4'),
  alignItems: 'start',
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const methodListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(calc(${cssVar('space.6')} * 4), 1fr))`,
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const methodItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
  cursor: 'pointer',
};

/* ── 구획 ──────────────────────────────────────────────────────────────────── */

interface SectionProps {
  readonly id: string;
  readonly title: string;
  /** 이 구획이 무엇을 정하는지 — 제목만으로는 결과가 보이지 않는 값들이라 한 줄을 함께 둔다 */
  readonly description: ReactNode;
  readonly children: ReactNode;
}

function Section({ id, title, description, children }: SectionProps) {
  return (
    <section style={sectionStyle} aria-labelledby={id}>
      <h3 id={id} style={sectionTitleStyle}>
        {title}
      </h3>
      <p style={hintStyle}>{description}</p>
      <div style={sectionBodyStyle}>{children}</div>
    </section>
  );
}

/* ── 문구 ──────────────────────────────────────────────────────────────────── */

/**
 * 저장 확인 문구 — **판매 방식이 바뀌는 저장**이면 그 사실을 앞세운다.
 *
 * 이 저장은 이 화면 밖(고객이 보는 버튼)을 즉시 바꾼다. '저장할까요?' 만 묻고 넘어가면
 * 운영자는 무엇이 일어나는지 모른 채 확인을 누른다(../site 의 비공개 전환과 같은 판단).
 */
function saveConfirmMessage(next: PaymentSettingsValues, wasUsingPg: boolean): string {
  if (wasUsingPg && !next.usePg) {
    return 'PG 결제를 끕니다. 저장하는 즉시 상품의 구매하기와 프로그램의 후원하기가 문의하기로 바뀌고, 접수된 문의는 상품 문의·프로그램 문의로 들어옵니다. 저장할까요?';
  }
  if (!wasUsingPg && next.usePg) {
    return next.mode === 'test'
      ? 'PG 결제를 켭니다. 지금은 테스트 모드라 결제창은 열리지만 실제 결제는 일어나지 않습니다. 저장할까요?'
      : 'PG 결제를 켭니다. 저장하는 즉시 고객이 상품·프로그램을 실제로 결제할 수 있습니다. 저장할까요?';
  }
  return '결제 설정을 저장하면 상품·프로그램 화면에 즉시 반영됩니다. 저장할까요?';
}

/* ── 화면 ──────────────────────────────────────────────────────────────────── */

export default function PaymentSettingsPage() {
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();
  const methodsErrorId = useId();

  const { data, isFetching, error, refetch } = useSettingsQuery(
    paymentSettingsKey,
    paymentSettingsStore,
  );
  const save = useSaveSettings(paymentSettingsKey, paymentSettingsStore);
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
  } = useForm<PaymentSettingsValues>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  /** 확인 다이얼로그에 실을 값 — 검증을 통과한 제출 1건 */
  const [pending, setPending] = useState<PaymentSettingsValues | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 409 — 다른 관리자가 먼저 저장했다 */
  const [conflict, setConflict] = useState<Revisioned<PaymentSettings> | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 설정이 도착하면 폼을 채운다 — 이 값이 dirty 판정의 기준선이 된다
  useEffect(() => {
    if (data === undefined) return;
    reset(toPaymentFormValues(data.value));
  }, [data, reset]);

  const values = watch();

  /** 서버가 알고 있는 사용 여부 — 확인 문구가 '켜는 중인지 끄는 중인지' 를 이걸로 안다 */
  const savedUsingPg = data?.value.usePg ?? false;

  // [STATE-01] 첫 로딩에서만 스켈레톤 — 재조회 중에는 이전 값을 유지한다
  const loading = isFetching && data === undefined;
  const audit: AuditInfo | null = data?.audit ?? null;
  const disabled = saving || loading || !canUpdate;

  /* ── 저장 ───────────────────────────────────────────────────────────────── */

  const runSave = useCallback(
    (next: PaymentSettingsValues, force: boolean) => {
      const revision = data?.revision;
      if (revision === undefined) return;

      // [EXC-08] 동기 잠금 — disabled 렌더를 기다리지 않는다
      if (!lock.acquire()) return;

      setSaveError(null);

      const controller = new AbortController();
      controllerRef.current = controller;

      save.mutate(
        { value: next, expectedRevision: revision, force, signal: controller.signal },
        {
          onSuccess: () => {
            lock.release();
            if (controller.signal.aborted) return;
            // 저장한 값이 새 기준선이다 — dirty 가 풀려 이탈 가드도 함께 내려간다
            reset(toPaymentFormValues(next));
            setPending(null);
            setConflict(null);
            toast.success(
              next.usePg
                ? '결제 설정을 저장했습니다. 상품·프로그램에서 결제로 판매합니다.'
                : '결제 설정을 저장했습니다. 상품·프로그램의 버튼이 문의하기로 바뀌었습니다.',
            );
          },
          onError: (cause: unknown) => {
            lock.release();
            // [EXC-09] 취소는 실패가 아니다
            if (isAbort(cause) || controller.signal.aborted) return;

            // [EXC-04] 409 — 덮어쓰지 않는다
            if (isSettingsConflict(cause)) {
              setPending(null);
              setConflict(cause.latest as Revisioned<PaymentSettings>);
              return;
            }

            setSaveError('결제 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, lock, reset, save, toast],
  );

  /** 제출 — 여기서 저장하지 않는다. 앞뒤 공백을 다듬은 값을 쥐고 확인 다이얼로그를 세운다 */
  const onValid = useCallback((form: PaymentSettingsValues) => {
    setSaveError(null);
    setPending({
      ...form,
      merchantId: form.merchantId.trim(),
      inquiryGuide: form.inquiryGuide.trim(),
    });
  }, []);

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

  const reloadLatest = useCallback(() => {
    const latest = conflict;
    if (latest === null) return;
    reset(toPaymentFormValues(latest.value));
    setConflict(null);
    void refetch();
    toast.success('최신 결제 설정을 불러왔습니다.');
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
    // 폼 값은 공용 문서 타입으로 그대로 읽힌다(가변 배열 → readonly) — 비교는 평면 필드만 본다
    return divergedLabels<PaymentSettings>(getValues(), conflict.value, PAYMENT_FIELD_LABELS);
  }, [conflict, getValues]);

  /* ── 결제수단 다중 선택 ────────────────────────────────────────────────── */

  const toggleMethod = useCallback(
    (method: PaymentMethod, checked: boolean) => {
      const current = getValues('methods');
      // 순서를 카탈로그 순서로 되맞춘다 — 켰다 껐다 한 순서가 저장 값에 남지 않게 한다
      const next = METHOD_OPTIONS.filter((option) =>
        option.id === method ? checked : current.includes(option.id),
      ).map((option) => option.id);

      setValue('methods', next, { shouldDirty: true, shouldValidate: true });
    },
    [getValues, setValue],
  );

  const methodsError = (errors.methods as { message?: string } | undefined)?.message;

  return (
    <>
      <SettingsFormShell
        cardTitle="결제 설정"
        description={PAGE_DESCRIPTION}
        loading={loading}
        loadFailed={error !== null}
        onRetry={() => void refetch()}
        serverError={saveError !== null && pending === null && conflict === null ? saveError : null}
        saving={saving}
        dirty={isDirty}
        canUpdate={canUpdate}
        readOnlyNotice={READ_ONLY_NOTICE}
        unsavedMessage={UNSAVED_MESSAGE}
        audit={audit}
        warning={
          values.usePg ? null : (
            <Alert tone="info">
              지금은 <strong>PG 결제를 쓰지 않는 상태</strong>입니다. 상품의 구매하기와 프로그램의
              후원하기가 모두 <strong>문의하기</strong>로 보이고, 접수된 문의는{' '}
              <Link to={INQUIRY_PATH.product} className="tds-ui-link tds-ui-focusable">
                상품 문의
              </Link>
              {' · '}
              <Link to={INQUIRY_PATH.program} className="tds-ui-link tds-ui-focusable">
                프로그램 문의
              </Link>
              로 들어옵니다.
            </Alert>
          )
        }
        onSubmit={(event) => void handleSubmit(onValid)(event)}
      >
        {/* ── 구획 1 · 결제 연동 ─────────────────────────────────────────── */}
        <Section
          id="payment-use-pg"
          title="결제 연동"
          description="이 스위치 하나가 판매 방식을 정합니다. 끄면 상품·프로그램의 구매·후원 버튼이 문의하기로 바뀌고, 문의는 상품 문의·프로그램 문의로 들어옵니다."
        >
          <ToggleSwitch
            checked={values.usePg}
            label="PG 결제 사용"
            onLabel="사용"
            offLabel="미사용"
            disabled={disabled}
            onChange={(next) => {
              setValue('usePg', next, { shouldDirty: true, shouldValidate: true });
            }}
          />

          {/* 스위치 바로 아래에 결과를 그린다 — 저장 전에 '무엇이 어떻게 보이는지' 를 확인한다 */}
          <div style={groupStyle}>
            <span style={fieldLabelStyle}>고객 화면 미리보기</span>
            <CheckoutCtaPreview settings={values} />
          </div>
        </Section>

        {/* ── 구획 2 · PG 설정 (쓸 때만) ─────────────────────────────────────
            꺼져 있을 때는 **자리를 없앤다.** 잠가 두면 '지금 무엇을 정해야 하는가' 가 흐려진다 —
            이 값들은 PG 를 켠 뒤에만 의미가 있고, 이미 저장된 값은 그대로 보관된다. */}
        {values.usePg && (
          <Section
            id="payment-pg"
            title="PG 설정"
            description="PG사에서 발급받은 정보를 넣습니다. 상점 ID 가 비어 있으면 결제창을 열 수 없어 버튼은 문의하기로 남습니다."
          >
            <div style={rowStyle}>
              <FormField htmlFor="payment-provider" label="PG사" required>
                <SelectField id="payment-provider" disabled={disabled} {...register('provider')}>
                  {PROVIDER_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <FormField
                htmlFor="payment-mode"
                label="연동 모드"
                required
                hint={
                  values.mode === 'test'
                    ? '테스트 모드에서는 결제창이 열려도 실제 결제가 일어나지 않습니다.'
                    : '운영 모드에서는 고객의 결제가 실제로 승인됩니다.'
                }
              >
                <SelectField id="payment-mode" disabled={disabled} {...register('mode')}>
                  {MODE_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            <TextInputField
              id="payment-merchant-id"
              label="상점 ID"
              required
              registration={register('merchantId')}
              disabled={disabled}
              error={errors.merchantId?.message}
              hint="PG사 관리자에서 발급한 상점 아이디(MID)입니다. 결제 API 키는 여기가 아니라 API 연동 설정에서 관리합니다."
              counter={`${String(values.merchantId.length)}/${String(MERCHANT_ID_MAX)}`}
              maxLength={MERCHANT_ID_MAX}
              placeholder="예: tosspayments-mid-0001"
            />

            <div style={groupStyle}>
              <span style={fieldLabelStyle}>
                결제수단
                <span aria-hidden="true"> *</span>
              </span>

              {/* 묶음 이름이 필수를 싣는다 — 개별 체크박스가 아니라 '고르는 행위' 가 필수다 (A11Y-11) */}
              <ul
                style={methodListStyle}
                role="group"
                aria-label="결제수단 (필수)"
                {...(methodsError === undefined ? {} : { 'aria-describedby': methodsErrorId })}
              >
                {METHOD_OPTIONS.map((option) => (
                  <li key={option.id}>
                    <label style={methodItemStyle}>
                      <input
                        type="checkbox"
                        className="tds-ui-check tds-ui-focusable"
                        style={checkboxStyle}
                        checked={values.methods.includes(option.id)}
                        disabled={disabled}
                        onChange={(event) => toggleMethod(option.id, event.target.checked)}
                      />
                      <span>{option.label}</span>
                    </label>
                  </li>
                ))}
              </ul>

              {methodsError === undefined ? (
                <p style={hintStyle}>
                  고객 결제창에 노출할 수단입니다. PG 계약에 있는 것만 켭니다.
                </p>
              ) : (
                <p id={methodsErrorId} role="alert" style={errorTextStyle}>
                  {methodsError}
                </p>
              )}
            </div>
          </Section>
        )}

        {/* ── 구획 3 · 문의 전환 안내 (끄고 있을 때만) ────────────────────── */}
        {!values.usePg && (
          <Section
            id="payment-inquiry"
            title="문의 전환 안내"
            description="결제 대신 문의를 받는 동안 고객에게 보일 문구입니다. 왜 지금 살 수 없는지 말하지 않으면 문의 버튼만 덩그러니 남습니다."
          >
            <TextareaField
              label="안내 문구"
              required
              value={values.inquiryGuide}
              onChange={(next) => {
                setValue('inquiryGuide', next, { shouldDirty: true, shouldValidate: true });
              }}
              maxLength={INQUIRY_GUIDE_MAX}
              disabled={disabled}
              error={errors.inquiryGuide?.message}
              hint="상품 카드와 프로그램 상세의 문의하기 버튼 아래에 그대로 보입니다."
              placeholder="예: 현재 온라인 결제를 준비 중입니다. 문의를 남겨 주시면 담당자가 확인 후 연락드립니다."
              rows={4}
            />
          </Section>
        )}
      </SettingsFormShell>

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title="결제 설정 저장"
          message={saveConfirmMessage(pending, savedUsingPg)}
          busy={saving}
          error={saveError}
          onConfirm={confirmSave}
          onCancel={cancelSave}
        />
      )}

      {conflict !== null && (
        <ConflictDialog
          subject="결제 설정"
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
const DEFAULT_FORM_VALUES: PaymentSettingsValues = {
  usePg: false,
  provider: 'toss',
  merchantId: '',
  mode: 'test',
  methods: [],
  inquiryGuide: '',
};
