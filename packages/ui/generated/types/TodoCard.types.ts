// AUTO-GENERATED from contracts/TodoCard.contract.json@2.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: organism · 카테고리: Data Display · 상태: beta

import type { MouseEvent } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type TodoCardState = 'default' | 'loading';

/**
 * '오늘의 할일' 카드. Card + Badge 를 조립해 처리 대기 건수를 한 줄로 보여주는 업무 위젯 (ADR-0003 organism). items 는 데이터 prop 이라 Figma 대응이 없다 — 탭(상품·문의·영업)에 따라 항목 집합이 통째로 바뀌므로 항목을 계약에 고정하지 않고 호출부(Pages)가 주입한다.

[2.0.0 — SPA 내비게이션 탈출구] ListCard 와 동일 결함·동일 처방이다 (같은 판정으로 함께 올린다). onItemClick 이 MouseEvent 를 함께 넘겨 호출부가 preventDefault() 후 navigate() 할 수 있다.
 */
export interface TodoCardProps {
  /**
   * 카드 제목
   * @default "오늘의 할일"
   */
  title?: string;
  /**
   * 할일 항목 목록. count > 0 인 항목은 강조색(color.feedback.danger.text), 0 인 항목은 흐리게(color.text.disabled) 렌더한다. href 가 있으면 링크, 없으면 정적 텍스트. 데이터 prop — Figma Component Property 대응 없음 (ADR-0003)
   */
  items: ReadonlyArray<{ key: string; label: string; count: number; href?: string }>;
  /**
   * 로딩 중 스켈레톤 표시 + aria-busy + onItemClick 차단
   * @default false
   */
  loading?: boolean;
  /**
   * 제목 옆에 items 의 count 합계를 Badge 로 표시
   * @default true
   */
  showTotal?: boolean;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 항목 클릭 시 해당 item.key 와 **원본 MouseEvent** 를 함께 전달한다. 호출부가 event.preventDefault() 로 기본 내비게이션을 가로채 SPA 라우팅으로 바꿀 수 있다. loading 상태에서는 발화 금지 (구현은 이미 event.preventDefault() 로 <a> 기본 동작도 막는다 — TodoCard.tsx:25-28) — Storybook Play Function이 전수 검증. **2.0.0 파괴적 변경**: 1.x 의 payload 는 string 이었다
   * 발화 차단 상태: loading (Storybook Play Function 이 전수 검증)
   */
  onItemClick?: (payload: { key: string; event: MouseEvent }) => void;
}
