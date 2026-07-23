// PaymentSettingsPage — 결제 서비스 **목록** (라우트: /settings/payment) · 시스템 설정 섹션 소유
//
// ┌ 화면 구조 — 목록이 결과를 말한다 ────────────────────────────────────────┐
// │ ① 결제 연동      : 마스터 스위치(PG 결제 사용)                              │
// │ ② 사용하고 있는 결제 서비스 : 지금 연결된 PG (없으면 '문의로 받습니다')       │
// │ ③ 연동할 수 있는 결제 서비스 : 나머지 PG · 통합 게이트웨이                   │
// │ ④ 문의 전환 안내 : 결제를 쓰지 않는 동안 고객에게 보일 문구                  │
// │                                                                          │
// │ 타일을 누르면 **주소가 바뀐다** — /settings/payment/:target.                │
// │ 두 묶음은 **하나의 카탈로그에서 파생**된다(목록을 복제하지 않는다).           │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 이 화면의 저장은 **무엇을 쓰는가** — 마스터 스위치와 안내 문구뿐이다 ──────┐
// │ 자격증명 입력칸이 여기 없으므로 자격증명을 쓸 이유도 없다. 그런데 폼이 문서    │
// │ 전체를 담고 있으니 그대로 보내면 **화면에 보이지도 않는 자격증명**을 함께 쓰게 │
// │ 된다 — 그 사이 상세 화면에서 비밀을 바꿨다면 낡은 값으로 덮어쓴다. 그래서     │
// │ 저장 페이로드를 폼이 아니라 **서버가 준 최신 문서**에서 만든다               │
// │ (listSavePayload). 자격증명은 그것을 그리는 화면(상세)이 저장한다.           │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [자격증명을 검증하지 않는다] 켜 두고 값이 반쪽인 상태를 목록이 막지 않는다 — 고칠 칸이 이
// 화면에 없기 때문이다(../oauth 가 같은 이유로 목록 스키마를 좁혔다). 대신 **경고 배너 + 상세
// 링크**로 말하고, 그 상태에서 결제는 fail-closed 로 닫힌다(pgSellable) — 저장은 되지만 고객은
// 문의 버튼을 본다. 그 사실도 미리보기가 그대로 보여준다.
//
// [권한] 시스템 설정은 최상위 권한이다. 수정 권한이 없으면 저장 컨트롤이 아예 없다(EXC-03).
// [데이터] 화면은 data-source.ts 하고만 대화한다. 실제 HTTP 호출은 없다(백엔드 미존재).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';

import { cssVar, typography } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  Alert,
  ConfirmDialog,
  hintStyle,
  TextareaField,
  ToggleSwitch,
  useToast,
} from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import {
  checkoutCta,
  DEFAULT_PAYMENT_SETTINGS,
  INQUIRY_PATH,
  missingCredentialLabels,
  pgSellable,
} from '../../../shared/commerce/payment-settings';
import { resolvePriceDisplay } from '../../../shared/commerce/price-display';
import type { PaymentSettings } from '../../../shared/commerce/payment-settings';
import {
  connectionComplete,
  connectionTarget,
  PG_TARGETS,
  pgLabel,
} from '../../../shared/commerce/pg-catalog';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { formatAuditAt } from '../_shared/diff';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import { PgTileList } from './components/PgTileList';
import type { PgTileItem } from './components/PgTileList';
import { paymentDivergedLabels, paymentSettingsKey, paymentSettingsStore } from './data-source';
import { pgTargetPath } from './paths';
import { toPaymentFormValues } from './types';
import { INQUIRY_GUIDE_MAX, paymentListSchema, pgTileStatus } from './validation';
import type { PaymentSettingsValues } from './validation';

const PAGE_DESCRIPTION =
  '상품과 프로그램을 결제로 판매할지, 문의로 받을지 정해요. 자격증명은 PG 를 눌러 각자의 화면에서 넣어요.';

const UNSAVED_MESSAGE =
  '결제 사용 여부 또는 문의 전환 안내에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

const READ_ONLY_NOTICE =
  '조회 권한만 있어요. 결제 설정을 바꾸려면 시스템 설정 수정 권한이 필요해요.';

/* ── 스타일 ────────────────────────────────────────────────────────────────── */

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

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

/* ── 저장 페이로드 ─────────────────────────────────────────────────────────── */

/**
 * 이 화면이 실제로 보낼 문서 — **마스터 스위치와 안내 문구만** 폼에서 온다.
 *
 * 자격증명·결제수단·계약 상태는 서버가 준 최신 문서에서 그대로 가져온다. 폼이 들고 있는 사본을
 * 쓰면 그 사이 상세 화면에서 바뀐 값을 낡은 값으로 덮어쓴다 — 화면에 없는 데이터를 조용히 쓰는
 * 것은 기능이 아니라 결함이다(파일 머리말).
 */
export function listSavePayload(
  server: PaymentSettings,
  form: PaymentSettingsValues,
): PaymentSettings {
  return { ...server, usePg: form.usePg, inquiryGuide: form.inquiryGuide.trim() };
}

/**
 * 저장 확인 문구 — **판매 방식이 바뀌는 저장**이면 그 사실을 앞세운다.
 *
 * 이 저장은 이 화면 밖(고객이 보는 버튼)을 즉시 바꾼다. '저장할까요?' 만 묻고 넘어가면
 * 운영자는 무엇이 일어나는지 모른 채 확인을 누른다(../site 의 비공개 전환과 같은 판단).
 */
function saveConfirmMessage(next: PaymentSettings, wasUsingPg: boolean): string {
  if (wasUsingPg && !next.usePg) {
    return 'PG 결제를 꺼요. 저장하는 즉시 상품의 구매하기와 프로그램의 후원하기가 문의하기로 바뀌고, 접수된 문의는 상품 문의·프로그램 문의로 들어와요. 자격증명은 지워지지 않아요. 저장할까요?';
  }

  if (!wasUsingPg && next.usePg) {
    const label = pgLabel(connectionTarget(next.connection));

    if (!connectionComplete(next.connection)) {
      return `${label} 필수 자격증명이 아직 다 채워지지 않아, 켜도 결제창은 열리지 않고 버튼은 문의하기로 남아요. 이대로 저장할까요?`;
    }
    return next.mode === 'test'
      ? `${label} 결제를 켜요. 지금은 테스트 모드라 결제창은 열리지만 실제 결제는 일어나지 않아요. 저장할까요?`
      : `${label} 결제를 켜요. 저장하는 즉시 고객이 상품·프로그램을 실제로 결제할 수 있어요. 저장할까요?`;
  }

  return '문의 전환 안내를 저장하면 상품·프로그램 화면에 즉시 반영돼요. 자격증명은 바뀌지 않아요. 저장할까요?';
}

/* ── 화면 ──────────────────────────────────────────────────────────────────── */

const DEFAULT_FORM_VALUES: PaymentSettingsValues = toPaymentFormValues(DEFAULT_PAYMENT_SETTINGS);

export default function PaymentSettingsPage() {
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  const { data, isFetching, error, refetch } = useSettingsQuery(
    paymentSettingsKey,
    paymentSettingsStore,
  );
  const save = useSaveSettings(paymentSettingsKey, paymentSettingsStore);
  const saving = save.isPending;
  const lock = useSubmitLock();

  const {
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<PaymentSettingsValues>({
    resolver: zodResolver(paymentListSchema),
    defaultValues: DEFAULT_FORM_VALUES,
  });

  /** 확인 다이얼로그에 실을 값 — 검증을 통과한 제출 1건(저장 문서 그대로) */
  const [pending, setPending] = useState<PaymentSettings | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  /** 409 — 다른 관리자가 먼저 저장했다 */
  const [conflict, setConflict] = useState<Revisioned<PaymentSettings> | null>(null);

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (data === undefined) return;
    reset(toPaymentFormValues(data.value));
  }, [data, reset]);

  const usePg = watch('usePg');
  const inquiryGuide = watch('inquiryGuide');

  // [STATE-01] 첫 로딩에서만 스켈레톤 — 재조회 중에는 이전 값을 유지한다
  const loading = isFetching && data === undefined;
  const audit: AuditInfo | null = data?.audit ?? null;
  const disabled = saving || loading || !canUpdate;

  /** 서버가 알고 있는 사용 여부 — 확인 문구가 '켜는 중인지 끄는 중인지' 를 이걸로 안다 */
  const savedUsingPg = data?.value.usePg ?? false;
  const server = data?.value ?? DEFAULT_PAYMENT_SETTINGS;

  /* ── 저장 ───────────────────────────────────────────────────────────────── */

  const runSave = useCallback(
    (next: PaymentSettings, force: boolean) => {
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
                ? '결제 설정을 저장했어요. 상품·프로그램에서 결제로 판매해요.'
                : '결제 설정을 저장했어요. 상품·프로그램의 버튼이 문의하기로 바뀌었어요.',
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

            setSaveError('결제 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, lock, reset, save, toast],
  );

  const onValid = useCallback(
    (form: PaymentSettingsValues) => {
      const latest = data?.value;
      if (latest === undefined) return;
      setSaveError(null);
      // 자격증명은 서버 문서에서 가져온다 — 이 화면은 스위치와 문구만 쓴다(파일 머리말)
      setPending(listSavePayload(latest, form));
    },
    [data?.value],
  );

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
    toast.success('최신 결제 설정을 불러왔어요.');
  }, [conflict, refetch, reset, toast]);

  const overwrite = useCallback(() => {
    const latest = data?.value;
    if (latest === undefined) return;
    runSave(listSavePayload(latest, getValues()), true);
  }, [data?.value, getValues, runSave]);

  const closeConflict = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setConflict(null);
  }, [lock, save]);

  /**
   * 무엇이 갈라졌는지 — 이 화면이 쓰는 것(스위치·안내 문구)만 짚는다.
   * 자격증명은 여기서 쓰지 않으므로 갈라져도 이 화면의 충돌이 아니다.
   */
  const conflictFields = useMemo(() => {
    if (conflict === null) return [];
    const mine = listSavePayload(server, getValues());
    return paymentDivergedLabels(mine, conflict.value).filter(
      (label) => label === 'PG 결제 사용' || label === '문의 전환 안내 문구',
    );
  }, [conflict, getValues, server]);

  /* ── 두 묶음은 카탈로그에서 파생된다 — 목록을 복제하지 않는다 ─────────────── */

  const tiles: readonly PgTileItem[] = useMemo(() => {
    // 저장된 문서가 아니라 **지금 폼의 스위치**를 반영한다 — 껐다 켜면 타일이 곧바로 옮겨 간다
    const current: PaymentSettings = { ...server, usePg };

    return PG_TARGETS.map((target) => {
      const status = pgTileStatus(current, target);
      return {
        target,
        inUse: status === 'in-use',
        ready: status === 'ready',
        complete:
          connectionComplete(server.connection) && connectionTarget(server.connection) === target,
      };
    });
  }, [server, usePg]);

  const inUseTiles = tiles.filter((tile) => tile.inUse);
  const availableTiles = tiles.filter((tile) => !tile.inUse);

  /** 켜 두었는데 값이 반쪽인가 — 목록이 막지 않는 대신 이 배너가 말한다 */
  const halfConfigured = usePg && !pgSellable({ ...server, usePg: true });

  /**
   * 지금 이 설정이면 사이트 전체가 어떻게 보이는가 — **판정을 여기서 다시 하지 않는다.**
   * 상품·프로그램이 읽는 바로 그 두 함수가 낸 문장을 이어 붙일 뿐이다.
   */
  const siteWideFact = useMemo(() => {
    const current: PaymentSettings = { ...server, usePg };
    const price = resolvePriceDisplay(current);
    const cta = checkoutCta(current, 'product');

    if (price.kind === 'inquiry') {
      return `${price.reason} 구매·후원 버튼도 '${cta.label}'로 나가요.`;
    }
    return `상품·프로그램의 금액이 그대로 노출되고, 버튼은 '${cta.label}'예요. ${cta.reason}`;
  }, [server, usePg]);
  const missingLabels = missingCredentialLabels(server);
  const activeTarget = connectionTarget(server.connection);

  const guideError = errors.inquiryGuide?.message;

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
          halfConfigured && !loading ? (
            <Alert tone="warning">
              <strong>{pgLabel(activeTarget)}</strong> 자격증명이 아직 다 채워지지 않았어요
              {missingLabels.length === 0 ? '' : ` (${missingLabels.join(' · ')})`}. 지금 저장해도
              결제창은 열리지 않고 구매·후원 버튼은 문의하기로 남아요.{' '}
              <Link to={pgTargetPath(activeTarget)} className="tds-ui-link tds-ui-focusable">
                {pgLabel(activeTarget)} 자격증명 채우기
              </Link>
            </Alert>
          ) : null
        }
        onSubmit={(event) => void handleSubmit(onValid)(event)}
      >
        <div style={stackStyle}>
          {/* ── ① 결제 연동 — 마스터 스위치와 그 결과 ─────────────────────── */}
          <Section
            id="payment-use-pg"
            title="결제 연동"
            description="이 스위치 하나가 판매 방식을 정해요. 끄면 상품·프로그램의 구매·후원 버튼이 문의하기로 바뀌고, 문의는 상품 문의·프로그램 문의로 들어와요."
          >
            <ToggleSwitch
              checked={usePg}
              label="PG 결제 사용"
              onLabel="사용"
              offLabel="미사용"
              disabled={disabled}
              onChange={(next) => {
                setValue('usePg', next, { shouldDirty: true, shouldValidate: true });
              }}
            />

            {/* ── 지금 사이트 전체가 어떻게 보이는가 — **미리보기가 아니라 사실 한 줄** ──
                가짜 상품 카드를 그려 놓고 '이렇게 보입니다' 라고 하면, 그 카드가 실제 상품
                화면과 어긋나는 날 아무도 눈치채지 못한다. 대신 판정을 소유한 함수가 낸 문장을
                그대로 옮긴다(resolvePriceDisplay·checkoutCta) — 상품·프로그램이 읽는 것과
                **같은 출처**라 어긋날 수가 없다. */}
            <p style={hintStyle}>
              <strong>지금 사이트 전체:</strong> {siteWideFact}
            </p>
          </Section>

          {/* ── ② 사용하고 있는 결제 서비스 ────────────────────────────────
              비어 있을 때가 이 화면의 핵심 상태다: '결제 없이 운영한다' 는 사실과 **그 결과**를
              함께 말한다. checkoutCta 가 이미 그 규칙이므로 화면은 드러내기만 하면 된다. */}
          <PgTileList
            groupId="in-use"
            heading="사용하고 있는 결제 서비스"
            items={inUseTiles}
            hrefOf={pgTargetPath}
            emptyNote={
              <>
                <span>
                  지금은 <strong>결제 없이 운영해요</strong> — 상품의 구매하기와 프로그램의
                  후원하기가 모두 <strong>문의하기</strong>로 나가요.
                </span>
                <span>
                  접수된 문의는{' '}
                  <Link to={INQUIRY_PATH.product} className="tds-ui-link tds-ui-focusable">
                    상품 문의
                  </Link>
                  {' · '}
                  <Link to={INQUIRY_PATH.program} className="tds-ui-link tds-ui-focusable">
                    프로그램 문의
                  </Link>
                  로 들어와요. 결제로 받으려면 아래에서 PG 를 골라 자격증명을 넣고, 위 스위치를
                  켜세요.
                </span>
              </>
            }
          />

          {/* ── ③ 연동할 수 있는 결제 서비스 ──────────────────────────────── */}
          <PgTileList
            groupId="available"
            heading="연동할 수 있는 결제 서비스"
            items={availableTiles}
            hrefOf={pgTargetPath}
            emptyNote={<span>연동할 수 있는 결제 서비스가 없어요.</span>}
          />

          {/* ── ④ 문의 전환 안내 (끄고 있을 때만) ────────────────────────── */}
          {!usePg && (
            <Section
              id="payment-inquiry"
              title="문의 전환 안내"
              description="결제 대신 문의를 받는 동안 고객에게 보일 문구예요. 왜 지금 살 수 없는지 말하지 않으면 문의 버튼만 덩그러니 남아요."
            >
              <TextareaField
                label="안내 문구"
                required
                value={inquiryGuide}
                onChange={(next) => {
                  setValue('inquiryGuide', next, { shouldDirty: true, shouldValidate: true });
                }}
                maxLength={INQUIRY_GUIDE_MAX}
                disabled={disabled}
                error={guideError}
                hint="상품 카드와 프로그램 상세의 문의하기 버튼 아래에 그대로 보여요."
                placeholder="예: 현재 온라인 결제를 준비 중이에요. 문의를 남겨 주시면 담당자가 확인 후 연락드려요."
                rows={4}
              />
            </Section>
          )}
        </div>
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
