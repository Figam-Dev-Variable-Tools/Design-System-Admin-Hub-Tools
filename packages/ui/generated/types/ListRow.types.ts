// AUTO-GENERATED from contracts/ListRow.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Lists · 상태: beta

import type { MouseEvent, ReactNode } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type ListRowState = 'default' | 'hover' | 'focus-visible';

/**
 * 리스트 한 줄 — 좌측 아이콘 + 제목 + 메타(보조 텍스트). href 가 있으면 링크로, 없으면 onClick 만 갖는 행으로 렌더한다. 목록 컨테이너(ul)와 도메인 의미는 조립하는 organism(ListCard 등)이 소유한다. 출처 구현: apps/admin/src/pages/dashboard/components/ListCard.tsx 의 행(row) 부분
 */
export interface ListRowProps {
  /**
   * 행 제목. 길면 줄바꿈(overflow-wrap: anywhere)
   */
  title: string;
  /**
   * 제목 아래 보조 텍스트 (예: '작성자 · 날짜'). 빈 문자열이면 렌더하지 않는다
   * @default ""
   */
  meta?: string;
  /**
   * 좌측 아이콘 슬롯. 장식용이므로 aria-hidden
   * 허용 컴포넌트: Icon
   * @default null
   */
  icon?: ReactNode;
  /**
   * 링크 대상. 빈 문자열이면 링크가 아닌 행으로 렌더한다
   * @default ""
   */
  href?: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 행 클릭. href 가 있어도 라우팅 가로채기/분석 계측을 위해 함께 발화한다
   */
  onClick?: (payload: MouseEvent) => void;
}
