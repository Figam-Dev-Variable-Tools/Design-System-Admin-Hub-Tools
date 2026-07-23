// PlanPage — 플랜·이용 현황 (라우트: /settings/plan) · 시스템 설정 섹션
//
// ┌ 이 화면이 하지 않는 일 ──────────────────────────────────────────────────┐
// │ **플랜을 바꾸지 않는다.** 구독·결제·계약은 사내 홈페이지 소관이고 이 어드민 │
// │ 은 그 값을 받는 쪽이다. 여기에 변경 수단을 두면 실제 계약과 어긋나는       │
// │ **두 번째 정본**이 생긴다 — 화면에서는 프로인데 청구는 베이직인 상태가     │
// │ 만들어지고, 그때 어느 쪽이 맞는지 아무도 답할 수 없다.                     │
// │ 카드 등록·재청구·플랜 업그레이드 버튼이 세 탭 어디에도 없는 이유가 이것이다.│
// │ 바깥으로 나가는 링크 하나가 이 화면의 유일한 행동이다.                     │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 탭 셋은 한 구독을 세 각도로 본다 ────────────────────────────────────────┐
// │   이용현황 — 무엇을 계약했고 무엇이 열려 있나 (모듈 3상태 · 쿼터)          │
// │   결제     — 어떻게 청구되고 있나 (청구 상태 · 결제 수단 · 다음 청구)      │
// │   결제내역 — 얼마를 냈나 (지난 청구)                                      │
// │ 셋 다 **읽기 화면**이다. 탭이 늘어난 것은 볼 것이 늘어난 것이지 할 수 있는  │
// │ 일이 늘어난 것이 아니다.                                                  │
// │                                                                          │
// │ 탭은 라우트가 아니라 쿼리스트링(`?tab=`)이다 — 근거는 ./tabs.ts 머리말.    │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [배너는 탭 위에 있다] 미납·정지와 플랜 변경 예고는 특정 탭의 사실이 아니라 **이 계정의 사실**이다.
// 결제 탭에만 두면 이용현황을 보러 온 운영자는 자기 앱이 조회 전용이라는 것을 모른 채 저장 버튼이
// 잠긴 화면을 만난다.
//
// [개발용 플랜 전환 패널은 없다] 예전에는 이 화면 아래에 DEV 전용 select 두 개가 있었다. 화면이
// '읽기 전용' 이라고 말하면서 화면 안에 플랜을 바꾸는 손잡이를 두는 것은 — 운영 빌드에서 접힌다
// 해도 — 개발·스테이징을 보는 사람에게 그대로 '플랜 변경 UI' 로 보인다. 플랜 상태를 손으로
// 재현하는 일은 화면이 아니라 스토어(entitlement-store 의 dev 액션)와 테스트가 한다.
//
// [데이터] 백엔드 없음.
//   플랜·엔타이틀먼트 → localStorage 픽스처(shared/entitlements/entitlement-store.ts)
//   결제·결제내역     → 아직 아무도 내려 주지 않았다 = **null(모른다)** (./subscription.ts)
// TODO(backend): GET /api/tenant/entitlements — 이 화면은 조회만 한다(쓰기 엔드포인트가 없다).
import { useCallback } from 'react';
import type { CSSProperties } from 'react';
import { useSearchParams } from 'react-router-dom';

import { cssVar, Tabs, tabId, tabPanelId } from '@tds/ui';

import { Alert } from '../../../shared/ui';
import { usePlan } from '../../../shared/entitlements/RequireEntitlement';
import { billingNotice, planChangeNotice } from '../../../shared/entitlements/plan';
import { BillingPanel } from './components/BillingPanel';
import { InvoiceHistoryPanel } from './components/InvoiceHistoryPanel';
import { UsagePanel } from './components/UsagePanel';
import { fetchSubscriptionBilling, fetchSubscriptionInvoices } from './subscription';
import { DEFAULT_PLAN_TAB, PLAN_TABS, PLAN_TAB_PARAM, planTabOf } from './tabs';
import type { PlanTabId } from './tabs';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const noteRowStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/**
 * 활성 탭의 단일 원천 = URL.
 *
 * [왜 replace 인가] 탭을 훑어보는 것은 화면을 떠나는 일이 아니다. push 하면 탭 세 번 누른 뒤
 * Back 이 세 번 필요해지고, 그때 운영자가 원한 것은 '설정 목록으로 돌아가기' 였다.
 * replace 로 현재 주소를 늘 최신 탭으로 유지하면 새로고침·링크 공유는 살고 뒤로가기는 화면
 * 단위로 남는다 — useListState 가 필터에 대해 내린 것과 같은 판단이다 (IA-13).
 */
function usePlanTab(): readonly [PlanTabId, (next: string) => void] {
  const [params, setParams] = useSearchParams();
  const tab = planTabOf(params.get(PLAN_TAB_PARAM));

  const selectTab = useCallback(
    (next: string) => {
      // @tds/ui Tabs 는 도메인을 모른다 — onChange 로 `string` 을 준다. 캐스팅하지 않고
      // 목록에서 되찾아 좁힌다(모르는 id 는 무시한다) — AdminsPage·DashboardPage 와 같은 규약.
      const found = PLAN_TABS.find((item) => item.id === next);
      if (found === undefined) return;

      setParams(
        (current) => {
          const draft = new URLSearchParams(current);
          // 기본 탭은 주소에 쓰지 않는다 — 한 화면이 두 개의 URL 을 갖지 않게 (./tabs.ts)
          if (found.id === DEFAULT_PLAN_TAB) draft.delete(PLAN_TAB_PARAM);
          else draft.set(PLAN_TAB_PARAM, found.id);
          return draft;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return [tab, selectTab];
}

export default function PlanPage() {
  const plan = usePlan();
  const [tab, selectTab] = usePlanTab();

  const billing = billingNotice(plan);
  const change = planChangeNotice(plan);

  /*
   * 두 조회는 지금 상수를 돌려준다(둘 다 null = 모른다). 그래도 렌더마다 부르는 이유는 값이 오는
   * 자리를 화면 코드에 남겨 두기 위해서다 — 서버가 붙으면 ./subscription.ts 의 두 함수만 바뀐다.
   * 파생값을 상태로 들고 있지 않는다(저장 금지 규칙).
   */
  const subscriptionBilling = fetchSubscriptionBilling();
  const invoices = fetchSubscriptionInvoices();

  return (
    <div style={pageStyle}>
      {(billing !== null || change !== null) && (
        <div style={noteRowStyle}>
          {/* 미납·정지는 기능을 지우지 않는다 — 조회는 그대로 열려 있고 쓰기만 잠긴다 */}
          {billing !== null && <Alert tone="warning">{billing}</Alert>}
          {/* 다운그레이드 예고 — 무엇이 사라지는지는 말하지 않는다. 이 앱은 다음 플랜의
              엔타이틀먼트를 아직 모르고, 모르는 것을 지어내면 예고와 실제가 갈라진다. */}
          {change !== null && <Alert tone="info">{change}</Alert>}
        </div>
      )}

      <Tabs
        value={tab}
        items={[...PLAN_TABS]}
        ariaLabel="플랜·이용 현황 영역"
        onChange={selectTab}
      />

      <div id={tabPanelId(tab)} role="tabpanel" aria-labelledby={tabId(tab)}>
        {tab === 'usage' && <UsagePanel plan={plan} />}
        {tab === 'billing' && <BillingPanel plan={plan} billing={subscriptionBilling} />}
        {tab === 'history' && <InvoiceHistoryPanel invoices={invoices} />}
      </div>
    </div>
  );
}
