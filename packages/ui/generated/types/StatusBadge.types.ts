// AUTO-GENERATED from contracts/StatusBadge.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 카테고리: Feedback · 상태: beta

/** `StatusBadge.tone` 허용 값 (계약이 유일한 원천) */
export type StatusBadgeTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

/** 계약에 선언된 상호작용 상태 */
export type StatusBadgeState = 'default';

/**
 * 상태 배지 — 게시/노출/시행 등 도메인 상태를 색(tone)과 문구(label)로 이중 전달하는 비대화형 pill. 출처: apps/admin/src/shared/ui/StatusBadge.tsx (소비 54곳: 마케팅·상품·예약·영업·고객지원·회사·콘텐츠 목록의 상태 열). 도메인을 모른다 — 무엇의 상태인지 알지 못하고 tone(색 의도)과 label(문구)만 받는다. 호출부가 '게시→success', '임시저장→neutral' 처럼 도메인 상태→tone 을 정한다.

[색만으로 의미를 전달하지 않는다 — WCAG 1.4.1] label 문구가 상태 의미를 담고 tone 색은 보조다. 그래서 색약 사용자도 문구로 상태를 읽는다.

[루트는 별도 role 없는 <span>] 현행 구현은 단순 <span> 이며 ARIA role 을 부여하지 않는다 — 인접 문맥(행·항목 제목)이 이 배지가 무엇의 상태인지 제공한다. role="status" 라이브 리전으로 만들면 목록의 수십 개 배지가 과도하게 통지되므로 두지 않는다 (Badge 와 대비되는 판정 — Badge 는 카운트 단독 표시라 role=status).
 */
export interface StatusBadgeProps {
  /**
   * 색 의도 — 무엇의 상태인지가 아니라 '중립/좋음/주의/위험/정보'만 표현한다. neutral 은 회색 표면(surface-raised)+테두리(border-default), 나머지 4종은 feedback 토큰 페어(surface/border/text). 호출부가 도메인 상태→tone 매핑을 소유한다
   */
  tone: StatusBadgeTone;
  /**
   * 상태 문구 — 색만으로 의미를 전달하지 않도록(WCAG 1.4.1) 상태 의미를 담는 텍스트. 예: '게시', '임시저장', '노출', '만료'
   */
  label: string;
}
