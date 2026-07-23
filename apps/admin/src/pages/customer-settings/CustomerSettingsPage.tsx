// CustomerSettingsPage — 고객 설정 (라우트: /users/settings)
//
// 회원 등급을 **추가·이름 수정·삭제**하고, 각 등급의 **승급 조건**·**할인율**과 등급 **산정 기준**을
// 정한다. 좌: 등급 정책 + 산정 기준 / 우: 현재 등급 분포(읽기 전용 미리보기) + 승급 쿠폰 요약 /
// 하단 우측: 저장.
//
// [등급의 SSOT]
//   - 기본 제공 3종(일반회원·VIP·VVIP)의 id·라벨은 shared/domain/member.ts 가 갖는다 — 여기서
//     이름을 바꾸지 않는다(잠근다). 회원이 그 id 를 참조하고 회원 목록·CSV 가 그 라벨을 읽는다.
//   - 그 위에 얹히는 **추가된 등급**의 정본은 이 화면이다. 다른 화면은 이 모듈을 import 하지 않고
//     shared/domain/member-tier-catalog 조회기로 읽는다(src/wiring.ts 가 꽂는다).
//
// [권한] 추가/수정/삭제/저장은 전부 이 라우트의 권한 술어를 읽는다(useRouteWritePermissions).
// **버튼을 잠그는 술어와 저장을 거절하는 술어가 같다** — 버튼만 잠그면 URL 로 걸어 들어온 사람이
// 그대로 저장한다.
//
// [검증의 자리] 규칙은 화면이 아니라 모델(validation.ts)이 강제한다. 화면은 입력을 막지 않고,
// 저장 시점에 모델이 정책을 만들어 주지 못하면 저장을 거부한다.
//
// [저장 확인] 정책 변경은 전 회원의 등급/할인율을 움직인다 — 저장은 intent="update" 공통 확인 모달을
// 거친다. 저장하지 않은 채 이탈하면 intent="discard" 가드가 막는다.
//
// [데이터] 화면은 data-source.ts 하고만 대화한다. 실제 HTTP 호출은 없다(백엔드 미존재).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { isAbort } from '../../shared/async';
import { memberTierUsage } from '../../shared/domain/member-tier-catalog';
import { MEMBERS } from '../../shared/fixtures/members';
import { useRouteWritePermissions } from '../../shared/permissions/RequirePermission';
import { cssVar, Skeleton } from '@tds/ui';

import { Alert, Button, ConfirmDialog, useToast, useUnsavedChangesDialog } from '../../shared/ui';
import { TierCriteriaCard } from './components/TierCriteriaCard';
import { TierDistributionCard } from './components/TierDistributionCard';
import { TierPolicyCard } from './components/TierPolicyCard';
import { TierUpCouponCard } from './components/TierUpCouponCard';
import { computeDistribution } from './distribution';
import { useSaveTierPolicy, useTierPolicyQuery } from './queries';
import { draftFromPolicy, formatAmountOnBlur, sanitizeDigits, serializeDraft } from './types';
import type { AggregationPeriod, PolicyDraft, RecalcTrigger } from './types';
// 등급 추가·이름 수정·삭제(모달·확인 다이얼로그·권한 재판정)는 이 훅이 통째로 소유한다
import { useTierEditing } from './useTierEditing';
// 검증 규칙의 정본은 zod 스키마다 (./validation.ts) — 화면은 판정 결과만 읽는다
import { validateDraft } from './validation';

const UNSAVED_MESSAGE =
  '등급 정책에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 변경 내용이 사라져요.';

/** 저장 확인 — 정책 변경은 전 회원의 등급/할인율을 움직이므로 되돌리기 어렵다 */
const SAVE_CONFIRM_MESSAGE =
  '등급 정책을 저장하면 이후 등급 산정부터 새 기준이 적용돼요. 저장할까요?';

/** 수정 권한이 없을 때 저장 버튼에 실리는 사유 — 거절도 같은 술어를 본다 */
const NO_UPDATE_REASON = '이 화면의 수정 권한이 없어 저장할 수 없어요.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  // 좌: 편집 카드(넓게) / 우: 분포 미리보기 — minmax(0,…) 이라야 표가 그리드를 밀지 않는다
  gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)',
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

/** 하단 우측 저장 툴바 */
const footerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.3'),
};

const footerHintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const skeletonStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/**
 * 하단 저장 툴바 — 지금 무엇을 할 수 있고, 할 수 없다면 왜인지를 말한다.
 *
 * 상태가 넷이다(저장 중 / 권한 없음 / 변경 있음 / 변경 없음). 그 넷을 페이지 본문의 JSX 안에
 * 중첩 삼항으로 두면 분기가 페이지 전체 복잡도에 얹히고, 무엇보다 '권한 없음' 이 다른 셋 사이에
 * 묻힌다 — 그 하나만 **버튼의 접근성 이름**까지 바꾸는 상태다.
 */
function SaveToolbar({
  saving,
  isDirty,
  canUpdate,
  onSave,
}: {
  readonly saving: boolean;
  readonly isDirty: boolean;
  readonly canUpdate: boolean;
  readonly onSave: () => void;
}) {
  const hint = saving
    ? '저장하는 중이에요…'
    : !canUpdate
      ? NO_UPDATE_REASON
      : isDirty
        ? '저장하지 않은 변경 사항이 있어요.'
        : '변경 사항이 없어요.';

  return (
    <div style={footerStyle}>
      <p style={footerHintStyle}>{hint}</p>
      {/* 변경이 없거나·저장 중이거나·수정 권한이 없으면 비활성.
          검증 실패로는 비활성화하지 않는다(제출 시점에 거부한다) */}
      <Button
        variant="primary"
        disabled={!isDirty || saving || !canUpdate}
        title={canUpdate ? undefined : NO_UPDATE_REASON}
        aria-label={canUpdate ? undefined : `저장 — ${NO_UPDATE_REASON}`}
        onClick={onSave}
      >
        {saving ? '저장 중…' : '저장'}
      </Button>
    </div>
  );
}

export default function CustomerSettingsPage() {
  const toast = useToast();
  const { canCreate, canUpdate, canRemove } = useRouteWritePermissions();
  const { data, isFetching, error, refetch } = useTierPolicyQuery();
  /**
   * [STATE-01] 스켈레톤은 '데이터가 아직 **없을** 때' 만이다.
   *
   * `isFetching` 을 그대로 쓰면 저장이 정책을 invalidate 할 때마다 **편집 중이던 폼 전체가
   * 스켈레톤으로 교체**된다 — 방금 저장한 사람이 자기 화면을 잃는다.
   */
  const firstLoading = isFetching && data === undefined;

  const [draft, setDraft] = useState<PolicyDraft | null>(null);
  /** 마지막으로 저장된(=서버가 알고 있는) 상태의 정규화 문자열 — 변경 감지의 기준선 */
  const [baseline, setBaseline] = useState<string | null>(null);
  /** 제출을 한 번이라도 시도했는가 — 타이핑 도중 빨간 문구가 먼저 튀어나오지 않게 한다 */
  const [attempted, setAttempted] = useState(false);
  /** 저장 확인 다이얼로그가 떠 있는가 — 확인해야 실제로 저장한다 */
  const [confirmingSave, setConfirmingSave] = useState(false);
  /** 저장 실패 — 다이얼로그 안에 danger 배너로 뜬다 (확인 버튼 재클릭 = 재시도) */
  const [saveError, setSaveError] = useState<string | null>(null);

  const savePolicy = useSaveTierPolicy();
  const saving = savePolicy.isPending;

  const controllerRef = useRef<AbortController | null>(null);
  // 화면을 떠나면 진행 중이던 저장을 취소한다 — 언마운트 후 setState 가 일어나지 않는다
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 정책이 도착하면 초안과 기준선을 함께 세운다
  useEffect(() => {
    if (data === undefined) return;
    const next = draftFromPolicy(data);
    setDraft(next);
    setBaseline(serializeDraft(next));
    setAttempted(false);
  }, [data]);

  const validation = useMemo(() => (draft === null ? null : validateDraft(draft)), [draft]);

  const isDirty =
    draft !== null && baseline !== null && serializeDraft(draft) !== baseline && !saving;

  // 저장하지 않은 변경이 있는 채로 이탈하면 discard 확인 다이얼로그를 세운다
  const unsavedDialog = useUnsavedChangesDialog(isDirty, { message: UNSAVED_MESSAGE });

  /**
   * 등급 id → 그 등급을 쓰는 회원 수. 조회기가 없으면 **null('확인 불가')** 이고, 그때 삭제는 막힌다.
   * 0 으로 뭉개지 않는 이유는 shared/domain/member-tier-catalog.ts 머리말에 있다.
   */
  const memberCounts = useMemo<Readonly<Record<string, number | null>>>(() => {
    const counts: Record<string, number | null> = {};
    for (const row of draft?.rows ?? []) counts[row.id] = memberTierUsage(row.id);
    return counts;
  }, [draft]);

  /** 등급 추가·이름 수정·삭제 — 상태와 다이얼로그를 훅이 소유한다(./useTierEditing) */
  const tierEditing = useTierEditing({
    draft,
    onDraftChange: setDraft,
    canCreate,
    canUpdate,
    canRemove,
    memberCounts,
  });

  /** 정책이 유효할 때만 계산한다 — 강등 허용/승급 조건이 바뀌면 즉시 다시 돈다 */
  const distribution = useMemo(() => {
    const policy = validation?.policy ?? null;
    if (policy === null) return null;
    return computeDistribution(MEMBERS, policy.tiers, policy.allowDemotion);
  }, [validation]);

  const patchRow = useCallback(
    (tierId: string, patch: { readonly threshold?: string; readonly discount?: string }) => {
      setDraft((prev) => {
        if (prev === null) return prev;
        return {
          ...prev,
          rows: prev.rows.map((row) =>
            row.id === tierId
              ? {
                  ...row,
                  threshold: patch.threshold ?? row.threshold,
                  discount: patch.discount ?? row.discount,
                }
              : row,
          ),
        };
      });
    },
    [],
  );

  // 입력 중에는 숫자만 받는다 — 포맷(천 단위 구분)은 blur 에서 한다
  const onThresholdChange = useCallback(
    (tierId: string, raw: string) => {
      patchRow(tierId, { threshold: sanitizeDigits(raw) });
    },
    [patchRow],
  );

  const onThresholdBlur = useCallback((tierId: string) => {
    setDraft((prev) => {
      if (prev === null) return prev;
      return {
        ...prev,
        rows: prev.rows.map((row) =>
          row.id === tierId ? { ...row, threshold: formatAmountOnBlur(row.threshold) } : row,
        ),
      };
    });
  }, []);

  const onDiscountChange = useCallback(
    (tierId: string, raw: string) => {
      patchRow(tierId, { discount: sanitizeDigits(raw) });
    },
    [patchRow],
  );

  const onPeriodChange = useCallback((value: AggregationPeriod) => {
    setDraft((prev) => (prev === null ? prev : { ...prev, period: value }));
  }, []);

  const onAllowDemotionChange = useCallback((value: boolean) => {
    setDraft((prev) => (prev === null ? prev : { ...prev, allowDemotion: value }));
  }, []);

  const onRecalcTriggerChange = useCallback((value: RecalcTrigger) => {
    setDraft((prev) => (prev === null ? prev : { ...prev, recalcTrigger: value }));
  }, []);

  /**
   * [저장] 클릭 — 여기서는 저장하지 않는다. 검증만 하고 **확인 다이얼로그**를 세운다.
   * 등급 정책은 전 회원의 등급/할인율을 움직이므로 클릭 한 번으로 바뀌지 않는다.
   */
  const requestSave = useCallback(() => {
    // 중복 제출 차단 — 저장 중이면 아무 일도 일어나지 않는다
    if (saving || draft === null) return;

    // 버튼 disabled 와 같은 술어 — URL 로 걸어 들어와도 여기서 멈춘다
    if (!canUpdate) {
      toast.error(NO_UPDATE_REASON);
      return;
    }

    setAttempted(true);
    const { policy } = validateDraft(draft);

    // 모델이 정책을 만들어 주지 못했다 = 규칙 위반. 화면은 저장을 거부하고 이유를 표시한다.
    // **어느 칸이 틀렸는지는 표 안에 인라인으로** 남는다 (토스트는 사라지므로 그 역할을 못 한다).
    if (policy === null) {
      toast.error('입력값이 규칙에 맞지 않아 저장하지 않았어요. 표의 오류 문구를 확인해 주세요.');
      return;
    }

    setSaveError(null);
    setConfirmingSave(true);
  }, [canUpdate, draft, saving, toast]);

  /** 확인 후 실제 저장. 실패하면 다이얼로그를 닫지 않는다 — 재클릭이 곧 재시도다 */
  const confirmSave = useCallback(() => {
    if (saving || draft === null || !canUpdate) return;

    const { policy } = validateDraft(draft);
    if (policy === null) {
      setConfirmingSave(false);
      return;
    }

    setSaveError(null);

    const controller = new AbortController();
    controllerRef.current = controller;
    const saved = serializeDraft(draft);

    savePolicy.mutate(
      { policy, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          // 저장 성공 → 이 상태가 새 기준선이다 (dirty 해제 → 저장 버튼 비활성)
          setBaseline(saved);
          setAttempted(false);
          setConfirmingSave(false);
          toast.success('등급 정책을 저장했어요.');
        },
        onError: (cause: unknown) => {
          // 취소는 실패가 아니다 — 사용자가 다이얼로그를 닫은 것이므로 아무것도 알리지 않는다
          if (isAbort(cause) || controller.signal.aborted) return;
          // 실패를 조용히 삼키지 않는다 — 다이얼로그 안 danger 배너 + 재클릭 = 재시도
          setSaveError('등급 정책을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  }, [canUpdate, draft, saving, savePolicy, toast]);

  /** 취소·Esc·딤 클릭 — 진행 중이던 저장 요청도 함께 취소한다 */
  const cancelSave = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    // 취소된 뮤테이션의 isPending 을 되돌린다 (react-query 는 abort 를 모른다 — signal 은 우리 것이다)
    savePolicy.reset();
    setSaveError(null);
    setConfirmingSave(false);
  }, [savePolicy]);

  if (error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>등급 정책을 불러오지 못했어요.</span>
            <Button
              variant="secondary"
              onClick={() => {
                void refetch();
              }}
            >
              다시 시도
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  if (firstLoading || draft === null || validation === null) {
    return (
      <div style={pageStyle}>
        <div style={skeletonStackStyle} aria-busy="true" aria-live="polite">
          {/* 로딩 사실은 이 블록이 아니라 위 컨테이너의 aria-busy·aria-live 가 알린다 (Skeleton 계약 a11y) */}
          <Skeleton />
          <Skeleton />
          <Skeleton />
          <span style={footerHintStyle}>등급 정책을 불러오는 중이에요…</span>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <div style={columnStyle}>
          <TierPolicyCard
            rows={draft.rows}
            issues={validation.issues}
            showErrors={attempted}
            disabled={saving}
            memberCounts={memberCounts}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canRemove={canRemove}
            onAdd={tierEditing.openCreate}
            onRename={tierEditing.openRename}
            onDelete={tierEditing.requestDelete}
            onThresholdChange={onThresholdChange}
            onThresholdBlur={onThresholdBlur}
            onDiscountChange={onDiscountChange}
          />

          <TierCriteriaCard
            period={draft.period}
            allowDemotion={draft.allowDemotion}
            recalcTrigger={draft.recalcTrigger}
            disabled={saving || !canUpdate}
            onPeriodChange={onPeriodChange}
            onAllowDemotionChange={onAllowDemotionChange}
            onRecalcTriggerChange={onRecalcTriggerChange}
          />
        </div>

        <div style={columnStyle}>
          <TierDistributionCard distribution={distribution} allowDemotion={draft.allowDemotion} />
          {/* 승급 규칙의 나머지 절반 — 올라가면 무엇이 나가는가. 읽기 전용이고 정본은 쿠폰이다 */}
          <TierUpCouponCard tiers={draft.rows} />
        </div>
      </div>

      <SaveToolbar saving={saving} isDirty={isDirty} canUpdate={canUpdate} onSave={requestSave} />

      {/* 등급 추가·이름 수정 모달 + 삭제 확인 — 훅이 만들어 준다 */}
      {tierEditing.dialogs}

      {confirmingSave && (
        <ConfirmDialog
          intent="update"
          title="등급 정책 저장"
          message={SAVE_CONFIRM_MESSAGE}
          busy={saving}
          error={saveError}
          onConfirm={confirmSave}
          onCancel={cancelSave}
        />
      )}

      {/* 저장하지 않은 채 화면을 떠나려 하면 discard 확인이 뜬다 */}
      {unsavedDialog}
    </div>
  );
}
