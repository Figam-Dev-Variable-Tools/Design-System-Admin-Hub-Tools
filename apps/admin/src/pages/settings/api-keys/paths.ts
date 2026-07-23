// AI 연동 화면의 경로 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/api-keys/**)
//
// 목록과 상세가 서로의 주소를 만든다(행 → 상세, 뒤로가기 → 목록). 문자열을 양쪽에 적어 두면
// 한쪽만 고쳐졌을 때 **링크가 조용히 죽는다** — 타입 검사도 테스트도 그걸 잡아 주지 못한다.
// 그래서 주소는 여기 한 군데서만 만든다. (../oauth/paths.ts 와 같은 규약이다 — 두 화면이
// 같은 전환을 하므로 같은 모양이어야 다음 사람이 어느 쪽을 따를지 고민하지 않는다.)

/** 연동 카탈로그 — 6종의 진열대 */
export const AI_CONNECTION_LIST_PATH = '/settings/api-keys';

/**
 * 프로바이더 하나의 자격증명 화면 — App.tsx 의 `/settings/api-keys/:providerId` 와 짝이다.
 *
 * 카탈로그의 `id` 를 그대로 쓴다(`openai` · `azure-openai` …). 별도의 슬러그를 만들지 않는다 —
 * 만들면 id ↔ 슬러그 표가 하나 더 생기고, 그 표가 어긋나는 날 링크가 404 가 된다.
 *
 * [카탈로그에서 빠진 id 도 주소는 만들어진다] 이 함수는 문자열을 이어 붙일 뿐 카탈로그를 보지
 * 않는다 — 그래서 옛 링크(`/settings/api-keys/mistral`)를 눌러도 라우트는 열리고, 그 화면이
 * '이 화면이 아는 AI 프로바이더가 아닙니다' 와 돌아갈 길을 준다(AiConnectionPage).
 * 여기서 막으면 **빈 화면**이 되고, 빈 화면은 고장과 구분되지 않는다.
 */
export function aiConnectionPath(providerId: string): string {
  return `${AI_CONNECTION_LIST_PATH}/${providerId}`;
}
