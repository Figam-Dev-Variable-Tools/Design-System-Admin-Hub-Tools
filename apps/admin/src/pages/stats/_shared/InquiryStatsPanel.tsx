// 결제를 쓰지 않을 때의 매출·주문 통계 — **매출 0 대신 문의·견적 지표**
//
// [왜 0 을 그리지 않는가] 결제가 꺼져 있으면 매출도 주문도 구조적으로 0 이다. 그 0 을 KPI 카드와
// 추이 차트로 그리면 운영자는 **장애로 읽는다** — 집계가 멈췄는지, 오늘만 안 팔렸는지 화면에서는
// 구분되지 않는다. 그래서 매출 통계·주문 통계는 이 패널로 통째로 갈린다: 지금 실제로 움직이는
// 것(문의가 몇 건 들어왔고, 얼마나 빨리 답했고, 견적이 얼마나 받아들여졌는가)을 센다.
//
// [숫자의 출처] 문의는 shared/commerce 의 조회 seam, 견적은 같은 파일의 견적 퍼널 seam 이다.
// 통계 화면이 상품 문의·영업 견적 모듈을 직접 읽으면 페이지 간 결합이라, 배선은 wiring.ts 가 한다.
// **배선 전에는 0 이 아니라 '모름'** 이라 카드가 '—' 를 띄운다 — 없는 숫자를 지어내지 않는다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { cssVar } from '@tds/ui';

import { Alert, alertActionRowStyle, Card, CardTitle } from '../../../shared/ui';
import { INQUIRY_PATH, PAYMENT_SETTINGS_PATH } from '../../../shared/commerce/payment-settings';
import {
  quoteAcceptanceRate,
  readInquiryBacklog,
  readQuoteFunnel,
} from '../../../shared/commerce/inquiry-backlog';
import { StatsKpiRow } from './StatsKpiRow';
import type { StatsKpi } from './types';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  margin: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

/** 모르는 값은 0 이 아니다 — KPI 는 숫자만 받으므로 '아직 모름' 은 0 으로 두고 힌트가 말한다 */
function kpiOf(
  id: string,
  label: string,
  unit: StatsKpi['unit'],
  value: number | null,
  hint: string,
): StatsKpi {
  return {
    id,
    label,
    unit,
    value: value ?? 0,
    // 비교 기간이 없다 — 결제를 끈 기간과 견줄 '지난 기간의 매출' 이 애초에 없다
    compareValue: null,
    hint: value === null ? `${hint} (아직 집계를 불러오지 못했어요)` : hint,
  };
}

interface InquiryStatsPanelProps {
  /** 이 화면이 원래 무엇이었는지 — '매출 통계' · '주문 통계' */
  readonly replacedLabel: string;
}

export function InquiryStatsPanel({ replacedLabel }: InquiryStatsPanelProps) {
  const product = readInquiryBacklog('product');
  const program = readInquiryBacklog('program');
  const known = product !== null || program !== null;

  const inquiries = known ? (product?.open ?? 0) + (program?.open ?? 0) : null;
  // 평균은 합산하지 않는다 — 도메인마다 응대 방식이 다르다. 상품 쪽이 이 화면의 기준이다
  const responseHours = product?.averageResponseHours ?? null;
  const funnel = readQuoteFunnel();

  const kpis: readonly StatsKpi[] = [
    kpiOf(
      'inquiries',
      '문의 건수',
      'count',
      inquiries,
      '종결되지 않은 상품·프로그램 문의의 합이에요.',
    ),
    kpiOf(
      'response',
      '평균 응답시간',
      'seconds',
      responseHours === null ? null : responseHours * 3600,
      '문의 접수부터 첫 답변까지 걸린 평균 시간이에요.',
    ),
    kpiOf(
      'quotes',
      '견적 발행',
      'count',
      funnel?.issued ?? null,
      '기간 안에 발행한 견적 건수예요.',
    ),
    kpiOf(
      'accepted',
      '견적 수락률',
      'percent',
      funnel === null ? null : quoteAcceptanceRate(funnel),
      '발행한 견적 중 고객이 수락한 비율이에요.',
    ),
  ];

  return (
    <div style={pageStyle}>
      <Alert tone="info">
        <div style={alertActionRowStyle}>
          <span>
            현재 결제를 사용하지 않아 주문·매출이 발생하지 않아요. {replacedLabel} 대신 지금 실제로
            움직이는 지표(문의·견적)를 보여 줘요.
          </span>
          <Link to={PAYMENT_SETTINGS_PATH} className="tds-ui-link tds-ui-focusable">
            결제 설정 열기
          </Link>
          <Link to={INQUIRY_PATH.product} className="tds-ui-link tds-ui-focusable">
            상품 문의 열기
          </Link>
        </div>
      </Alert>

      <StatsKpiRow kpis={kpis} loading={false} error="" />

      <Card>
        <CardTitle>지금 볼 수 있는 것</CardTitle>
        <div style={listStyle}>
          <span>
            · 문의의 내용과 응대 이력은 문의 화면에서 봐요 —{' '}
            <Link to={INQUIRY_PATH.product} className="tds-ui-link tds-ui-focusable">
              상품 문의
            </Link>
            {' · '}
            <Link to={INQUIRY_PATH.program} className="tds-ui-link tds-ui-focusable">
              프로그램 문의
            </Link>
          </span>
          <span>
            · 견적의 발행·수락 이력은 영업 관리의 견적 화면이 가져요 —{' '}
            <Link to="/sales/quotes" className="tds-ui-link tds-ui-focusable">
              견적
            </Link>
          </span>
          <span>
            · 결제를 켜면 이 화면은 다시 {replacedLabel}로 돌아와요. 지난 기록은 사라지지 않아요.
          </span>
        </div>
      </Card>
    </div>
  );
}
