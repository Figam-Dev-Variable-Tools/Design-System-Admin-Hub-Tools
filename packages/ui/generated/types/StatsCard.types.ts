// AUTO-GENERATED from contracts/StatsCard.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: organism · 카테고리: Data Display · 상태: beta

import type { ReactNode } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type StatsCardState = 'default' | 'loading' | 'error';

/**
 * 통계 카드 껍데기 — 헤더(제목 + 우측 액션 슬롯) + 본문 슬롯. 본문에 무엇이 오는지는 조립하는 쪽(Pages)이 정한다: 방문자 차트(LineAreaChart)든 기간별 표(DataTable)든 children 으로 주입한다. 도메인 이름을 계약에 박지 않으므로 통계 카드가 늘어나도 중복이 생기지 않는다 (ADR-0003).

[1.0.1 — action.hiddenWhen 오기(erratum) 정정] 1.0.0 은 action.hiddenWhen: ["loading"] 을 선언해 loading 중 액션 슬롯을 언마운트하게 했다. 그런데 실제 화면에서 그 액션은 **기간 토글 자신**이고 loading 은 isFetching 이다 (StatsSection.tsx:72-94) — 토글을 누르면 재조회가 시작되고, 그 순간 토글이 사라진다 (헤더 레이아웃 점프 + 포커스 상실). 계약이 존재하지 않는 요구사항을 강제하던 사례다. 액션은 loading 중에도 **떠 있는 채 비활성**되어야 하며(현행 로컬 동작), 비활성은 호출부가 <SegmentedControl disabled={loading}> 로 준다 — StatsCard 는 action 을 그대로 렌더하기만 하면 되고 새 prop 이 필요 없다. DataTable·LineAreaChart 의 진입 불가 loading 상태 제거와 동일 논증·동일 SemVer 판정(PATCH).

[1.1.0 — value(KPI 수치) 슬롯 추가] 대시보드는 지배적인 숫자가 필요한데 기존 카드는 제목(label.md)과 본문(body.md=16px)이 같은 크기대에 몰려 KPI 가 밋밋했다. value 를 주면 본문 위에 display 타이포(typography.display.sm=24px, tabular-nums)로 렌더해 body-md 보다 확실히 크게 세운다 (TOKEN-05). 차트/표만 담는 카드는 value 를 비워 두면 기존과 동일하게 렌더된다 — prop 추가이므로 MINOR.
 */
export interface StatsCardProps {
  /**
   * 카드 제목 (예: '방문자', '기간별 분석')
   */
  title: string;
  /**
   * 헤더 우측 액션 슬롯 — 기간 토글(SegmentedControl) 또는 단일 액션(Button). 없으면 제목만 렌더. **loading/error 상태에서도 계속 렌더한다** — 이 슬롯은 본문을 다시 불러오는 손잡이(기간 토글)라서 로딩 중에 사라지면 자기 클릭에 자기가 없어진다. 로딩 중 비활성이 필요하면 호출부가 슬롯 컴포넌트에 disabled 를 준다 (SegmentedControl·Button 모두 disabled 를 지원한다)
   * 허용 컴포넌트: SegmentedControl, Button
   * @default null
   */
  action?: ReactNode;
  /**
   * KPI 대표 수치 — 비어 있지 않으면 본문 위에 display 타이포(typography.display.sm = 24px, tabular-nums)로 렌더한다. 대시보드의 지배적 숫자이므로 본문(body.md)보다 확실히 크다 (TOKEN-05). 포맷팅(천단위·단위)은 호출부가 shared/format 으로 끝낸 문자열을 넘긴다 — 카드는 숫자를 모른다. 차트/표만 담는 카드는 비워 둔다
   * @default ""
   */
  value?: string;
  /**
   * 본문 슬롯. 차트·표 등 통계 표현 단위를 조립하는 쪽이 주입한다. loading/error 상태에서는 스켈레톤/에러 문구로 대체되어 렌더되지 않는다
   */
  children: ReactNode;
  /**
   * 로딩 중 본문을 스켈레톤으로 대체 + aria-busy
   * @default false
   */
  loading?: boolean;
  /**
   * 빈 문자열이 아니면 본문 대신 이 문구를 role="alert" 로 렌더한다 (error 상태). loading 보다 우선
   * @default ""
   */
  error?: string;
}
