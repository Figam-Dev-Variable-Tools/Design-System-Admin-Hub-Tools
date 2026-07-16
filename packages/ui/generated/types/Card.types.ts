// AUTO-GENERATED from contracts/Card.contract.json@1.2.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 상태: beta

import type { ReactNode } from 'react';

/** `Card.padding` 허용 값 (계약이 유일한 원천) */
export type CardPadding = 'md' | 'lg';

/** `Card.elevation` 허용 값 (계약이 유일한 원천) */
export type CardElevation = 'flat' | 'raised';

/** 계약에 선언된 상호작용 상태 */
export type CardState = 'default' | 'loading';

/**
 * 표면 컨테이너 — 서피스 배경 + 테두리 + 라운드 + 내부 패딩을 제공하는 최소 단위 surface. 출처: apps/admin/src/pages/dashboard/components/Card.tsx 의 Card(<section>). 헤더/본문 구조나 도메인 데이터는 이 계약에 없다 — 조립은 organism(StatsCard/TodoCard/ListCard)이 한다 (ADR-0003).

[1.1.0 — elevation] flat(기본, 그림자 없음) / raised(강조 카드 — shadow.raised 로 배경 위에 부드럽게 부상). Toss 급 depth 는 border 가 아니라 layered shadow 에서 온다 (TOKEN-04).
 */
export interface CardProps {
  /**
   * 카드 본문. 컨테이너는 flex column 이며 minWidth:0 으로 그리드 내 축소를 허용한다
   */
  children: ReactNode;
  /**
   * 내부 여백. md = space.5(현행 구현값), lg = space.6
   * @default "md"
   */
  padding?: CardPadding;
  /**
   * 표면 높이. flat = 그림자 없음(기본), raised = shadow.raised 로 강조 카드처럼 부상시킨다
   * @default "flat"
   */
  elevation?: CardElevation;
  /**
   * 데이터 로딩 중. aria-busy="true" 를 부여한다
   * @default false
   */
  busy?: boolean;
}
