// AUTO-GENERATED from contracts/Badge.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 카테고리: Data Display · 상태: beta

/** `Badge.tone` 허용 값 (계약이 유일한 원천) */
export type BadgeTone = 'neutral' | 'danger' | 'success';

/** 계약에 선언된 상호작용 상태 */
export type BadgeState = 'default';

/**
 * 카운트 뱃지 — 제목/라벨 옆에 개수를 표시하는 원형 pill. 출처: apps/admin/src/pages/dashboard/components/Card.tsx 의 CountBadge (count<=0 이면 렌더하지 않음). 비대화형 표시 전용이며 클릭 이벤트를 갖지 않는다.
 */
export interface BadgeProps {
  /**
   * 표시할 개수. hideWhenZero=true 이고 count<=0 이면 아무것도 렌더하지 않는다 (구현: `if (count <= 0) return null`)
   */
  count: number;
  /**
   * 시각 의미. neutral = 텍스트색 배경 위 서피스색 숫자(현행 구현), danger/success = feedback 토큰 페어
   * @default "neutral"
   */
  tone?: BadgeTone;
  /**
   * count<=0 일 때 렌더 생략 여부. false 면 0 도 표시한다
   * @default true
   */
  hideWhenZero?: boolean;
}
