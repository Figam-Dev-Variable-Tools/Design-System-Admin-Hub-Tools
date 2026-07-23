// 결제내역 탭 — **우리가 낸** 구독료의 지난 청구
//
// ┌ /sales/billing 과 무엇이 다른가 (이 파일에서 가장 중요한 문단) ──────────┐
// │ 두 화면은 낱말이 거의 같다 — 청구·금액·상태·미납. 그래서 한쪽을 만들다      │
// │ 보면 다른 쪽을 흉내 내게 되고, 흉내 낸 순간 운영자는 **돈의 방향을 잃는다.** │
// │                                                                          │
// │   /sales/billing (영업 관리 > 청구·입금)                                   │
// │     · 우리가 **고객에게** 청구한 건 — 받을 돈                              │
// │     · 수주 전환된 견적에서만 생긴다. 운영자가 입금을 확인해 상태를 바꾼다    │
// │     · 필터·검색·상세가 있고, 실제로 **쓰기가 있다**                        │
// │                                                                          │
// │   이 탭 (/settings/plan · 결제내역)                                        │
// │     · 우리가 **사내에** 낸 구독료 — 낼 돈                                  │
// │     · 사내 어드민이 만든다. 이 어드민은 결과를 받아 보여줄 뿐이다           │
// │     · 필터도 상세도 쓰기도 없다. 영수증 링크만 바깥으로 나간다              │
// │                                                                          │
// │ 그래서 이 표에는 '입금 확인' 같은 행 액션이 없고, 앞으로도 없어야 한다.      │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 세 상태를 반드시 가른다 ─────────────────────────────────────────────────┐
// │   null → **모른다**. 이 어드민이 아직 청구 목록을 받지 못했다               │
// │   []   → 받았고 지난 청구가 **정말 0건이다**(계약 첫 달)                    │
// │   목록 → 받았고 건이 있다                                                 │
// │ 모름을 '내역이 없습니다' 로 그리면, 3년째 결제 중인 고객에게도 같은 문장이   │
// │ 나온다. 이 화면에서 가장 비싼 결함이 그것이라 상태를 뭉치지 않는다.         │
// └──────────────────────────────────────────────────────────────────────────┘
import type { CSSProperties } from 'react';

import { Empty } from '@tds/ui';

import {
  Alert,
  Card,
  CardTitle,
  hintStyle,
  StatusBadge,
  tableStyle,
  tdStyle,
  thStyle,
} from '../../../../shared/ui';
import type { StatusTone } from '../../../../shared/ui';
import { INVOICE_STATE_LABEL, formatMoney } from '../subscription';
import type { InvoiceState, SubscriptionInvoice } from '../subscription';
import { panelStyle, rowHeaderStyle, stackStyle, tableScrollStyle } from '../styles';

/** 문구가 의미를 싣고 색은 보조다 (WCAG 1.4.1) */
const INVOICE_TONE: Readonly<Record<InvoiceState, StatusTone>> = {
  paid: 'success',
  unpaid: 'warning',
  refunded: 'info',
  void: 'neutral',
};

const NOT_RECEIVED =
  '이 어드민은 아직 지난 청구 목록을 받지 못했어요. 청구가 없다는 뜻이 아니라 이 화면이 모른다는 뜻이에요 — 청구서·영수증은 사내 홈페이지에서 확인해 주세요.';

const SCOPE_NOTE =
  '여기 있는 것은 우리가 사내에 내는 구독료예요. 고객에게 청구한 건은 영업 관리 > 청구·입금(/sales/billing) 화면에서 봐요.';

/** 금액 칸 — 오른쪽 정렬 + 고정폭 숫자. 자릿수를 눈으로 비교하는 유일한 열이다 */
const amountCellStyle: CSSProperties = {
  ...tdStyle,
  textAlign: 'end',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const amountHeaderStyle: CSSProperties = { ...thStyle, textAlign: 'end' };

const dateCellStyle: CSSProperties = { ...tdStyle, whiteSpace: 'nowrap' };

/** 청구일 칸(`<th scope="row">`) — 왼쪽 정렬 + 숫자 고정폭 */
const chargedAtStyle: CSSProperties = { ...rowHeaderStyle, whiteSpace: 'nowrap' };

function InvoiceTable({ invoices }: { readonly invoices: readonly SubscriptionInvoice[] }) {
  return (
    <div style={tableScrollStyle}>
      <table style={tableStyle}>
        <caption style={hintStyle}>구독료 청구 내역 — 최근 건이 위에 와요.</caption>
        <thead>
          <tr>
            <th scope="col" style={thStyle}>
              청구일
            </th>
            <th scope="col" style={thStyle}>
              이용 기간
            </th>
            <th scope="col" style={thStyle}>
              계약
            </th>
            <th scope="col" style={amountHeaderStyle}>
              금액
            </th>
            <th scope="col" style={thStyle}>
              상태
            </th>
            <th scope="col" style={thStyle}>
              영수증
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <th scope="row" style={chargedAtStyle}>
                {invoice.chargedAt}
              </th>
              <td style={dateCellStyle}>
                {invoice.periodStart} ~ {invoice.periodEnd}
              </td>
              <td style={tdStyle}>{invoice.planLabel}</td>
              <td style={amountCellStyle}>{formatMoney(invoice.amount)}</td>
              <td style={tdStyle}>
                <StatusBadge
                  tone={INVOICE_TONE[invoice.state]}
                  label={INVOICE_STATE_LABEL[invoice.state]}
                />
              </td>
              <td style={tdStyle}>
                {/* 영수증이 없는 청구가 정상적으로 있다(취소·환불 건). 없는 링크를 만들지 않는다 */}
                {invoice.receiptUrl === null ? (
                  '—'
                ) : (
                  <a
                    href={invoice.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="tds-ui-link tds-ui-focusable"
                  >
                    영수증 보기
                  </a>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function InvoiceHistoryPanel({
  invoices,
}: {
  /** **null 은 '받지 못했다'**, `[]` 는 '정말 0건이다'. 둘을 같은 화면으로 그리지 않는다 */
  readonly invoices: readonly SubscriptionInvoice[] | null;
}) {
  return (
    <div style={panelStyle}>
      <Card aria-labelledby="plan-invoices">
        <CardTitle id="plan-invoices">결제내역</CardTitle>
        <div style={stackStyle}>
          <p style={hintStyle}>{SCOPE_NOTE}</p>

          {invoices === null && <Alert tone="info">{NOT_RECEIVED}</Alert>}

          {/* 0건은 '모름' 과 다른 화면이다 — 여기서는 단정해도 된다. 받았고, 정말 없다.
              검색·필터가 없는 표라 Empty 의 복구 콜백(onClearSearch·onResetFilters)도 넘기지
              않는다: 누를 것이 없는 버튼을 그리면 그것이 곧 죽은 버튼이다. */}
          {invoices !== null && invoices.length === 0 && (
            <>
              <Empty label="구독료 청구" createVerb="발생" />
              <p style={hintStyle}>
                첫 청구가 아직 발생하지 않았어요. 다음 청구일은 결제 탭에서 확인해요.
              </p>
            </>
          )}

          {invoices !== null && invoices.length > 0 && <InvoiceTable invoices={invoices} />}
        </div>
      </Card>
    </div>
  );
}
