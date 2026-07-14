// AUTO-GENERATED from contracts/ListCard.contract.json@2.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: organism · 상태: beta

import type { MouseEvent, ReactNode } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type ListCardState = 'default' | 'loading';

/**
 * 제목 + 카운트 뱃지 + 행 목록 카드. Card + Badge + ListRow 를 조립한 업무 위젯 (ADR-0003 organism). rows 는 데이터 prop 이라 Figma 대응이 없다 — 최근 주문·최근 문의·최근 상담 등 도메인별 목록을 같은 껍데기로 렌더한다.

[2.0.0 — SPA 내비게이션 탈출구] onRowClick 이 MouseEvent 를 함께 넘긴다. 1.x 는 row.id 문자열만 넘겨 preventDefault() 가 불가능했고, 그래서 href 를 주면 전체 페이지 새로고침, 안 주면 <button> 이 되어 새탭/가운데클릭/URL 미리보기를 잃었다 — react-router 로 SPA 내비를 하는 화면(대시보드)을 **어떤 prop 조합으로도 만들 수 없었다**. 호출부는 이제 href 로 진짜 <a> 를 유지한 채, 좌클릭만 preventDefault 하고 navigate() 로 가로챌 수 있다 (수식키/가운데클릭은 브라우저에 맡긴다).
 */
export interface ListCardProps {
  /**
   * 카드 제목
   */
  title: string;
  /**
   * 제목 옆 Badge 에 표시할 총 건수. rows.length 와 다를 수 있다(전체 건수 vs 미리보기 행)
   * @default 0
   */
  count?: number;
  /**
   * 행 목록. 빈 배열이면 empty 문구를 렌더한다. meta 는 보조 정보(작성자·날짜 등), href 가 있으면 행 전체가 링크. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003)
   */
  rows: ReadonlyArray<{ id: string; title: string; meta?: string; href?: string }>;
  /**
   * 로딩 중 스켈레톤 행 표시 + aria-busy + onRowClick 차단
   * @default false
   */
  loading?: boolean;
  /**
   * rows 가 빈 배열일 때 표시할 문구
   * @default "표시할 항목이 없습니다."
   */
  empty?: string;
  /**
   * 각 행 앞에 붙는 아이콘 슬롯. 목록 성격(주문·문의·상담)을 시각적으로 구분한다
   * 허용 컴포넌트: Icon
   * @default null
   */
  icon?: ReactNode;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 행 클릭 시 해당 row.id 와 **원본 MouseEvent** 를 함께 전달한다. 호출부가 event.preventDefault() 로 기본 내비게이션을 가로채 SPA 라우팅으로 바꿀 수 있다 — 이 인자가 없으면 href 있는 행은 전체 새로고침이 된다. loading 상태에서는 발화 금지 (구현은 발화 차단과 함께 event.preventDefault() 로 <a> 기본 동작도 막는다) — Storybook Play Function이 전수 검증. **2.0.0 파괴적 변경**: 1.x 의 payload 는 string 이었다
   * 발화 차단 상태: loading (Storybook Play Function 이 전수 검증)
   */
  onRowClick?: (payload: { id: string; event: MouseEvent }) => void;
}
