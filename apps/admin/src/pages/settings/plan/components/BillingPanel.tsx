// 결제 탭 — 이 구독이 **어떻게 청구되고 있는가**
//
// ┌ 이 탭에 쓰기가 없는 것이 원칙과 충돌하지 않는가 ─────────────────────────┐
// │ 충돌하지 않는다. '결제 탭' 은 결제를 **하는** 곳이 아니라 결제가 어떻게      │
// │ 되고 있는지를 **보는** 곳이다. 결제 수단 등록·카드 교체·재청구는 전부 사내   │
// │ 홈페이지 소관이고, 여기에 그 버튼을 두면 화면과 실제 계약이 갈라진다        │
// │ (PlanPage.tsx 머리말). 그래서 이 탭의 유일한 행동은 **바깥으로 나가는 링크** │
// │ 하나다.                                                                  │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 청구 상태는 이 화면의 장식이 아니다 ─────────────────────────────────────┐
// │ `billingState` 는 엔타이틀먼트 판정이 실제로 읽는 값이다: 정상이 아니면      │
// │ `planReadOnly` 가 참이 되고 앱 전체가 조회 전용으로 내려앉는다              │
// │ (shared/entitlements/plan.ts · RequireEntitlement.usePlanWriteBlock).      │
// │ 그래서 이 카드는 상태 배지만 찍고 끝내지 않고 **그 상태가 지금 앱에 무엇을    │
// │ 하고 있는지**를 함께 말한다 — 운영자가 '왜 저장 버튼이 잠겼지' 를 여기서     │
// │ 끝낼 수 있어야 그 연결이 산 것이다.                                        │
// │ 미납·정지가 기능을 **지우지 않는다**는 사실도 여기서 못박는다: 조회·내보내기 │
// │ 는 그대로다. 데이터를 감추면 무엇을 결제해야 하는지조차 확인할 수 없다.      │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [모르는 값은 모른다고 한다] 결제 수단·다음 청구일·금액은 사내 어드민이 내려 주는 값이고 지금은
// 아무도 내려 주지 않았다. 0원·'등록된 카드 없음' 으로 그리면 화면이 거짓 사실을 단정한다
// (../subscription.ts 머리말).
import {
  Alert,
  Card,
  CardTitle,
  ddStyle,
  dlStyle,
  dtStyle,
  hintStyle,
  StatusBadge,
} from '../../../../shared/ui';
import type { StatusTone } from '../../../../shared/ui';
import {
  BILLING_STATE_LABEL,
  PLAN_PORTAL_URL,
  billingNotice,
  planReadOnly,
} from '../../../../shared/entitlements/plan';
import type { BillingState, PlanState } from '../../../../shared/entitlements/plan';
import { BILLING_CYCLE_LABEL, formatBillingMethod, formatMoney, orUnknown } from '../subscription';
import type { SubscriptionBilling } from '../subscription';
import { panelStyle, stackStyle } from '../styles';

/** 청구 상태의 색 의도 — 문구가 의미를 싣고 색은 보조다 (WCAG 1.4.1) */
const BILLING_TONE: Readonly<Record<BillingState, StatusTone>> = {
  active: 'success',
  past_due: 'warning',
  suspended: 'danger',
};

/**
 * 상태가 **지금 앱에 무엇을 하고 있는지**.
 *
 * `billingNotice` 는 '무엇을 해야 하는가'(사내 홈페이지에서 확인하세요)를 말한다. 여기서 말하는
 * 것은 '무엇이 잠겼는가' 다 — 둘은 다른 질문이고, 배너와 이 줄이 각각 하나씩 답한다.
 */
const BILLING_EFFECT: Readonly<Record<BillingState, string>> = {
  active: '등록·수정·삭제가 모두 열려 있어요.',
  past_due:
    '이 어드민은 지금 조회 전용이에요 — 등록·수정·삭제가 잠겨요. 기능이 사라지지는 않고 조회·내보내기는 그대로예요.',
  suspended:
    '이 어드민은 지금 조회 전용이에요 — 등록·수정·삭제가 잠겨요. 쌓인 데이터는 지워지지 않아요.',
};

/** 결제 정보를 아직 받지 못한 상태의 안내 — 0원·'수단 없음' 으로 흉내 내지 않는다 */
const NOT_RECEIVED =
  '이 어드민은 아직 결제 수단·다음 청구 정보를 받지 못했어요. 값이 없다는 뜻이 아니라 이 화면이 모른다는 뜻이에요 — 사내 홈페이지에서 확인해 주세요.';

function BillingFacts({ billing }: { readonly billing: SubscriptionBilling }) {
  return (
    <dl style={dlStyle}>
      <dt style={dtStyle}>결제 수단</dt>
      <dd style={ddStyle}>{orUnknown(billing.method, formatBillingMethod)}</dd>

      <dt style={dtStyle}>청구 주기</dt>
      <dd style={ddStyle}>{orUnknown(billing.cycle, (cycle) => BILLING_CYCLE_LABEL[cycle])}</dd>

      <dt style={dtStyle}>다음 청구일</dt>
      <dd style={ddStyle}>{orUnknown(billing.nextChargeAt, (at) => at)}</dd>

      <dt style={dtStyle}>다음 청구 금액</dt>
      <dd style={ddStyle}>{orUnknown(billing.nextChargeAmount, formatMoney)}</dd>

      <dt style={dtStyle}>청구서 수신처</dt>
      <dd style={ddStyle}>{orUnknown(billing.invoiceEmail, (email) => email)}</dd>
    </dl>
  );
}

export function BillingPanel({
  plan,
  billing,
}: {
  readonly plan: PlanState;
  /** 사내 어드민에게서 받은 결제 정보. **null 은 '아직 받지 못했다'** 이지 '없다' 가 아니다 */
  readonly billing: SubscriptionBilling | null;
}) {
  const notice = billingNotice(plan);

  return (
    <div style={panelStyle}>
      <Card aria-labelledby="plan-billing-state">
        <CardTitle
          id="plan-billing-state"
          action={
            <StatusBadge
              tone={BILLING_TONE[plan.billingState]}
              label={BILLING_STATE_LABEL[plan.billingState]}
            />
          }
        >
          청구 상태
        </CardTitle>
        <div style={stackStyle}>
          <p style={hintStyle}>{BILLING_EFFECT[plan.billingState]}</p>
          {/* 배너와 같은 문구를 여기서 한 번 더 말하는 것이 아니다 — 배너는 화면 위에서 '무엇을
              해야 하는가' 를, 이 카드는 '지금 무엇이 잠겼는가' 를 말한다. 정상일 때는 notice 가
              null 이므로 이 줄 자체가 없다. */}
          {notice !== null && <Alert tone="warning">{notice}</Alert>}
          {planReadOnly(plan) && (
            <p style={hintStyle}>
              결제 상태를 되돌리는 일은 이 화면에서 할 수 없어요.{' '}
              <a
                href={PLAN_PORTAL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="tds-ui-link tds-ui-focusable"
              >
                사내 홈페이지
              </a>
              에서 처리해 주세요.
            </p>
          )}
        </div>
      </Card>

      <Card aria-labelledby="plan-billing-method">
        <CardTitle id="plan-billing-method">결제 수단 · 다음 청구</CardTitle>
        <div style={stackStyle}>
          {billing === null ? (
            <Alert tone="info">{NOT_RECEIVED}</Alert>
          ) : (
            <BillingFacts billing={billing} />
          )}
          <p style={hintStyle}>
            결제 수단 등록·변경과 청구 주기 변경은 이 화면에 없어요 — 여기서 바꾸면 실제 계약과
            어긋나는 두 번째 정본이 생겨요.{' '}
            <a
              href={PLAN_PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="tds-ui-link tds-ui-focusable"
            >
              사내 홈페이지의 요금제 안내
            </a>
            에서 진행해 주세요.
          </p>
        </div>
      </Card>
    </div>
  );
}
