// 레이아웃 공통 치수
//
// 사이드바 로고 영역과 콘텐츠 헤더는 아래 구분선이 한 줄로 이어져야 한다.
// 두 곳이 같은 상수를 참조하게 해 값이 갈라지는 것을 막는다.
//
// [G6] 값은 토큰(space)의 calc 배수로만 표현 — raw px 리터럴 금지.

/** 상단 바 높이 — 사이드바 로고 영역 == 콘텐츠 헤더 (24 * 3.5 = 84px) */
export const TOP_BAR_HEIGHT = 'calc(var(--tds-space-6) * 3.5)';

/** 사이드바 폭 (24 * 12 = 288px) */
export const SIDEBAR_WIDTH = 'calc(var(--tds-space-6) * 12)';
