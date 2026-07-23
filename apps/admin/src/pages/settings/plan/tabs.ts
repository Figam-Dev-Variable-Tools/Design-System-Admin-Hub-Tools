// 플랜 화면의 탭 3개 — 정의와 URL 해소
//
// ┌ 왜 라우트가 아니라 쿼리스트링인가 ───────────────────────────────────────┐
// │ 이 앱은 '같은 화면의 상태' 와 '다른 화면' 을 이미 갈라 놓았다:              │
// │   다른 화면(목록 → 상세)  → **라우트**. OAuth 가 펼침을 버리고 별도 라우트로 │
// │                            간 판단이 그것이다(OAuthProviderPage 머리말).   │
// │   같은 화면의 상태        → **쿼리스트링**. AI 채팅의 열린 대화(`?c=`)와     │
// │                            목록의 필터·페이지(IA-13 · useListState)가 그렇다.│
// │                                                                          │
// │ 세 탭은 같은 사실(하나의 구독)을 세 각도로 볼 뿐 서로 다른 자원이 아니다 —   │
// │ 어느 탭에서도 제목은 '플랜·이용 현황' 하나이고, 배너도 셋 모두에 걸린다.     │
// │ 그래서 라우트가 아니다. 그러나 useState 도 아니다: 새로고침·뒤로가기·링크    │
// │ 공유는 OAuth 가 라우트로 간 이유 그대로 여기서도 필요하다. '결제내역 탭 좀   │
// │ 봐 주세요' 라는 링크가 존재할 수 없으면 그 탭은 말로만 전달된다.            │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [기본 탭은 URL 에 쓰지 않는다] `?tab=usage` 와 `` 가 같은 화면이면 한 화면에 두 개의 주소가
// 생긴다. 기본값과 같은 값은 지운다 — useListState 의 filterDefaults 와 같은 규약이다.

/** 표시 순서 = 읽는 순서. 무엇을 쓰고 있나 → 어떻게 내고 있나 → 얼마를 냈나 */
export const PLAN_TABS = [
  { id: 'usage', label: '이용현황' },
  { id: 'billing', label: '결제' },
  { id: 'history', label: '결제내역' },
] as const;

export type PlanTabId = (typeof PLAN_TABS)[number]['id'];

/** 쿼리스트링 키 — 이 화면에는 목록이 없어 useListState 의 page·q·sort 와 겹치지 않는다 */
export const PLAN_TAB_PARAM = 'tab';

export const DEFAULT_PLAN_TAB: PlanTabId = 'usage';

/**
 * 주소의 값 → 탭. **모르는 값은 기본 탭으로 흘러간다.**
 *
 * 손으로 고친 `?tab=거짓말` 이나 탭 이름을 바꾼 뒤의 옛 링크가 빈 화면을 만들지 않게 한다 —
 * AdminsPage 가 삭제된 역할을 가리키는 옛 `?role=` 을 '전체' 로 되돌리는 것과 같은 판단이다.
 */
export function planTabOf(raw: string | null): PlanTabId {
  return PLAN_TABS.find((tab) => tab.id === raw)?.id ?? DEFAULT_PLAN_TAB;
}
