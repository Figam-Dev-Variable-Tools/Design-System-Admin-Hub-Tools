// 플랜 상태 전역 스토어 — 사내 어드민이 준 값을 '받은 척' 하는 자리
//
// [왜 permission-store 를 그대로 본뜨는가]
// 두 축은 소비 모양이 같다: 전역 클라이언트 상태 하나 + localStorage 영속 + 크로스탭 동기화 +
// 조각 구독. 이미 검증된 모양을 두 번째 축이 다시 발명하면 저장·동기화 버그가 두 벌이 된다.
// 그래서 구조는 같게 두고, **다른 것 하나만 다르게** 한다 — 실패 방향이다(아래).
//
// [실패 방향이 반대다 — 복사하면서 가장 놓치기 쉬운 지점]
// permission-store 의 loadState 는 깨진 저장값을 '기본 역할(대부분 OFF)' 로 되돌린다(fail-closed).
// 여기서 같은 자세를 취하면 **저장값 파손 = 전 기능 정지**가 된다. 이 스토어의 모든 실패 경로는
// DEFAULT_PLAN_STATE(전 기능 가용)로 수렴한다 (plan.ts 머리말).
//
// TODO(backend): GET /api/tenant/entitlements · webhook /entitlements.updated
//   loadState/saveState 두 함수만 갈아끼우면 화면 코드는 그대로다 (PermissionProvider 선례).
//   웹훅 수신·서명 검증은 서버의 일이다 — 프론트가 흉내 내지 않는다.
// TODO(backend): 서버에서 동일 판정을 재검증한다 — 이 스토어는 UX 층이지 보안이 아니다.
import { create } from 'zustand';

import {
  DEFAULT_PLAN_STATE,
  normalizePlanState,
  planStateForTier,
  quotaCreateBlock,
  quotaStatusOf,
} from './plan';
import type { BillingState, EntitlementKey, PlanState, PlanTier, QuotaStatus } from './plan';

/** 저장 키. 크로스탭 리스너가 이 키의 storage 이벤트만 반응한다 */
const STORAGE_KEY = 'tds-admin.plan';

function saveState(state: PlanState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장 실패는 무시한다 — 현재 세션 동안은 메모리 상태로 계속 동작한다
  }
}

/** 저장값 → PlanState. 어느 갈래로 실패해도 **전 기능 가용**으로 떨어진다 (fail-open) */
function loadState(): PlanState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_PLAN_STATE;
    return normalizePlanState(JSON.parse(raw));
  } catch {
    // 저장소 접근 불가(프라이빗 모드) · JSON 파손 — 고객이 산 기능을 우리 파싱 실패로 멈추지 않는다
    return DEFAULT_PLAN_STATE;
  }
}

/* ── 사용량 조회기 — 의존 방향을 뒤집는다 (주입 이음매) ──────────────────────
 *
 * [문제] 쿼터는 '상품 200/200' 처럼 **실제 건수**를 말해야 쓸모가 있다. 그런데 그 숫자는 상품
 * 저장소(pages/products)가 갖고 있고, 이 파일이 그 모듈을 import 하면 shared/entitlements →
 * pages/products 결합이 되어 code-quality 게이트(페이지 결합 축 임계치 0)가 곧바로 잡는다.
 *
 * [해법] 여기는 조회기의 **자리만** 만들고, 구현을 꽂는 일은 두 도메인을 모두 아는 합성 지점
 * (src/wiring.ts)이 한다 — registerRoleAssigneeCountLookup · registerOrderLookup 과 같은 이음매다.
 *
 * [등록 전에는 저장값의 usage 를 쓴다] 여기서 0 을 돌려주면 '아무것도 안 썼다' 로 읽혀 한도가 찬
 * 계정도 등록이 열린다. 모르는 것과 없는 것은 다르므로 null 을 주고, 호출부는 서버가 준 usage 로
 * 되돌아간다. 권한 쪽 조회기가 null 일 때 **거절**하는 것과 방향이 반대인 이유는 이 축의 실패
 * 방향이 fail-open 이기 때문이다.
 */
type EntitlementUsageLookup = (key: EntitlementKey) => number | null;

let usageLookup: EntitlementUsageLookup | null = null;

/** 조회기를 꽂는다 — 여러 번 불러도 결과가 같다(멱등). 배선 지점은 `src/wiring.ts` */
export function registerEntitlementUsageLookup(lookup: EntitlementUsageLookup): void {
  usageLookup = lookup;
}

/** 지금 쓴 건수 — 조회기가 없거나 그 키를 모르면 null(저장값의 usage 로 되돌아간다) */
function entitlementUsageOf(key: EntitlementKey): number | null {
  return usageLookup === null ? null : usageLookup(key);
}

/* ── 스토어 ──────────────────────────────────────────────────────────────── */

export interface EntitlementStore {
  readonly plan: PlanState;

  /**
   * 사내 어드민이 준 값을 통째로 받는다 — 이 앱이 플랜을 **바꾸는** 유일한 통로다.
   * (구독·결제·계약은 사내 홈페이지 소관이라 여기에 편집 액션을 두지 않는다.)
   */
  readonly receivePlan: (next: PlanState) => void;

  /*
   * 아래 둘은 **화면이 아니라 재현 수단**이다 — UI 호출부가 0이다.
   *
   * 예전에는 /settings/plan 아래에 DEV 전용 전환 패널이 이 둘을 불렀다. 그 패널은 없앴다:
   * '이 어드민은 플랜을 바꾸지 않는다' 고 말하는 화면 안에 플랜을 바꾸는 select 를 두면 —
   * 운영 빌드에서 접힌다 해도 — 개발·스테이징을 보는 사람에게 그것이 곧 플랜 변경 UI 다.
   *
   * 액션 자체는 남긴다. 이 앱의 기본 상태는 '전 기능 가용'(DEFAULT_PLAN_STATE)이라 낮은 티어의
   * 잠금 배지·업그레이드 화면·쿼터 소진을 재현할 통로가 하나는 있어야 하고, 그 통로가 화면이
   * 아니어야 한다는 것이 위 판단이다. 지금 소비자는 테스트다
   * (pages/settings/plan/PlanPage.test.tsx · 청구 상태 3종).
   */
  readonly devSetTier: (tier: PlanTier) => void;
  readonly devSetBillingState: (billingState: BillingState) => void;

  /** 다른 탭에서 바뀐 저장값을 다시 읽어들인다 — AppShell 의 storage 리스너가 호출한다 */
  readonly syncFromStorage: () => void;
}

export const useEntitlementStore = create<EntitlementStore>((set) => {
  /** 모든 영속 변경의 단일 통로 — 저장과 상태 갱신을 한 곳에서 묶는다 */
  function mutate(updater: (prev: PlanState) => PlanState): void {
    set((store) => {
      const next = updater(store.plan);
      saveState(next);
      return { plan: next };
    });
  }

  return {
    plan: loadState(),

    receivePlan: (next) => {
      mutate(() => normalizePlanState(next));
    },

    devSetTier: (tier) => {
      mutate((prev) => ({
        ...planStateForTier(tier),
        // 티어를 바꿔도 예외와 청구 상태는 남긴다 — 이 둘은 티어와 다른 축이다
        overrides: prev.overrides,
        billingState: prev.billingState,
        effectiveAt: prev.effectiveAt,
      }));
    },

    devSetBillingState: (billingState) => {
      mutate((prev) => ({ ...prev, billingState }));
    },

    syncFromStorage: () => {
      set({ plan: loadState() });
    },
  };
});

/* ── 파생 조회 (화면이 쓰는 표면) ────────────────────────────────────────── */

/** 쿼터 현황 — 배선된 조회기의 실제 건수가 저장값의 usage 를 이긴다 */
export function planQuotaStatus(plan: PlanState, key: EntitlementKey): QuotaStatus | null {
  return quotaStatusOf(plan, key, entitlementUsageOf(key));
}

/** 신규 생성을 막아야 하면 그 사유 문구, 아니면 null */
export function planQuotaCreateBlock(plan: PlanState, key: EntitlementKey): string | null {
  return quotaCreateBlock(plan, key, entitlementUsageOf(key));
}

/**
 * 다른 탭에서 바뀐 플랜을 따라간다. storage 이벤트는 그 이벤트를 낸 탭 **이외에서만** 발화하므로
 * 저장→재로드 루프가 생기지 않는다 (permission-store 의 subscribeToOtherTabs 와 같은 규약).
 *
 * 사내 어드민이 플랜을 내리면 이 앱의 모든 탭이 같은 순간에 같은 화면을 보여야 한다 — 한 탭만
 * 옛 플랜으로 남으면 운영자는 '어떤 창에서는 되고 어떤 창에서는 안 되는' 상태를 만난다.
 */
export function subscribeToOtherTabs(): () => void {
  function handleStorage(event: StorageEvent): void {
    if (event.key !== STORAGE_KEY) return;
    useEntitlementStore.getState().syncFromStorage();
  }
  window.addEventListener('storage', handleStorage);
  return () => {
    window.removeEventListener('storage', handleStorage);
  };
}
