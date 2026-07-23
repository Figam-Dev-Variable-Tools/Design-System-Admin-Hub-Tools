// 문의 대기 · SLA 초과 — **결제를 쓰지 않는 동안 매출/주문 위젯이 서 있던 자리**
//
// [왜 매출 0 을 그리지 않는가] 결제가 꺼져 있으면 주문도 매출도 구조적으로 0 이다. 그 0 을
// 카드에 크게 띄우면 운영자는 '오늘 하나도 안 팔렸다' 또는 '집계가 고장났다' 로 읽는다 — 둘 다
// 사실이 아니다. 사실은 "지금 들어오는 것은 주문이 아니라 문의" 이고, 대시보드가 그날 아침
// 답해야 할 질문도 바뀐다: 몇 건이 답을 기다리는가, 그중 몇 건이 약속한 시간을 넘겼는가.
//
// [숫자의 출처] 상품 문의·프로그램 문의는 서로 다른 페이지 트리에 있다. 대시보드가 그 둘을 직접
// import 하면 페이지 간 결합이라, shared/commerce 의 조회 seam 을 읽는다(inquiry-backlog.ts).
// 배선 전에는 0 이 아니라 **모름**이므로 '—' 를 띄운다 — 없는 숫자를 지어내지 않는다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { cssVar, StatsCard } from '@tds/ui';

import { formatNumber } from '../../../shared/format';
import { INQUIRY_PATH, PAYMENT_SETTINGS_PATH } from '../../../shared/commerce/payment-settings';
import { readInquiryBacklog } from '../../../shared/commerce/inquiry-backlog';

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const sectionTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  margin: 0,
  color: cssVar('color.action.primary.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 12), 1fr))`,
  gap: cssVar('space.4'),
  alignItems: 'start',
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/** 두 도메인의 합 — 운영자에게 '지금 답을 기다리는 사람' 은 상품이든 프로그램이든 하나의 줄이다 */
interface Pulse {
  readonly waiting: number | null;
  readonly breached: number | null;
}

function readPulse(): Pulse {
  const product = readInquiryBacklog('product');
  const program = readInquiryBacklog('program');
  // 둘 다 모르면 모름이다. 한쪽만 배선돼 있으면 아는 쪽까지는 센다(부분이라도 사실이다)
  if (product === null && program === null) return { waiting: null, breached: null };
  return {
    waiting: (product?.open ?? 0) + (program?.open ?? 0),
    breached: (product?.slaBreached ?? 0) + (program?.slaBreached ?? 0),
  };
}

const valueOf = (count: number | null): string => (count === null ? '—' : formatNumber(count));

export function InquiryPulseSection() {
  const pulse = readPulse();

  return (
    <section style={sectionStyle} aria-labelledby="dashboard-inquiry-pulse-title">
      <h2 id="dashboard-inquiry-pulse-title" style={sectionTitleStyle}>
        문의 현황
      </h2>

      <div style={gridStyle}>
        <StatsCard title="답변 대기" value={valueOf(pulse.waiting)} loading={false} error="">
          <p style={bodyStyle}>
            <span>
              결제를 쓰지 않는 동안 고객의 요청은 주문이 아니라 문의로 들어와요. 종결되지 않은
              건수예요.
            </span>
            <Link to={INQUIRY_PATH.product} className="tds-ui-link tds-ui-focusable">
              상품 문의 열기
            </Link>
          </p>
        </StatsCard>

        <StatsCard title="응답 기한 초과" value={valueOf(pulse.breached)} loading={false} error="">
          <p style={bodyStyle}>
            <span>약속한 응답 시간을 넘긴 문의예요. 오늘 가장 먼저 처리할 줄여요.</span>
            <Link to={PAYMENT_SETTINGS_PATH} className="tds-ui-link tds-ui-focusable">
              결제 설정 열기
            </Link>
          </p>
        </StatsCard>
      </div>
    </section>
  );
}
