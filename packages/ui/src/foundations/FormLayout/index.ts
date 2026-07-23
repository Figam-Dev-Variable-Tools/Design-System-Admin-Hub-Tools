// 폼 줄바꿈 규칙 — **입력 칸은 한 줄에 하나**.
//
// [왜 여기 있나 — 사본 75벌의 종착지]
// 폼의 '한 줄'은 지금까지 공용 정의가 없었다. 화면마다
//   gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * N), 1fr))`
// 을 손으로 적었고, N 이 3·4·5·6·7·8 로 제각각이라 **같은 폭에서도 화면마다 2칸이 되기도 3칸이
// 되기도 했다**. 줄바꿈은 화면의 취향이 아니라 폼 전체가 지키는 하나의 규약이므로 정의를 한 곳에 둔다.
// 어드민 화면(apps/admin)과 Templates 스토리(packages/ui/pages)가 **같은 객체**를 읽어야 둘이
// 갈라지지 않는다 — 그래서 앱이 아니라 DS 가 소유한다(SSOT 헌장).
//
// [규칙]
//   1. 상세·등록 폼의 입력 칸은 한 줄에 하나다 (`formRowStyle`).
//   2. 예외는 **날짜뿐**이다 — 시작~종료처럼 *한 쌍이 곧 하나의 값*인 것만 가로로 둔다
//      (`formDateRowStyle`). 이미 한 덩어리인 DateRangeField 는 이 격자가 필요 없다.
//   폼이 **아닌** 격자(카드 목록·통계 타일·미리보기 문서·좌우 2단 페이지 레이아웃)는 여기 대상이
//   아니다 — 그것들은 여전히 각자의 auto-fit 격자를 갖는다.
//
// 모든 값은 토큰 CSS 변수(var(--tds-*))만 — 하드코딩 px 0건.
import type { CSSProperties } from 'react';

import { cssVar } from '../../../generated/tokens/tokens';

/**
 * 폼 한 줄 — 입력 칸 **하나**가 폭을 다 쓴다.
 *
 * flex 가 아니라 grid 인 이유: `minmax(0, 1fr)` 이 있어야 긴 값(파일명·URL)이 든 칸이 격자를
 * 밀어내지 않는다. flex-column 은 자식의 min-content 를 하한으로 삼아 가로 스크롤을 만든다.
 *
 * gap 은 space.4 — 옮겨 온 사본 43벌 중 39벌이 이미 이 값이었다(나머지 space.2·space.3 은
 * 근거 없이 갈라진 것이라 여기로 수렴시킨다).
 */
export const formRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: cssVar('space.4'),
};

/**
 * 폼 한 줄 — **날짜 쌍 전용** 예외. 시작일·종료일처럼 한 쌍이 곧 하나의 값일 때만 쓴다.
 *
 * auto-fit 이 아니라 고정 2열인 이유: 기간은 '두 칸이 나란히'가 의미의 일부다. auto-fit 은 폭이
 * 모자라면 조용히 1열로 떨어뜨리는데, 그러면 예외를 둔 이유가 사라진 채 규칙만 어긴 모양이 된다.
 * 좁은 화면에서도 두 칸을 유지하고, 대신 `minmax(0, 1fr)` 로 각 칸이 줄어들게 한다.
 *
 * 날짜가 **아닌** 칸을 여기 넣지 않는다 — 그 순간 이 상수는 '2열 격자'라는 옛 사본으로 되돌아간다.
 */
export const formDateRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: cssVar('space.4'),
};

/**
 * **글자와 배지가 나란히 서는 한 줄** — 제목 옆이든 표 셀 안이든 하나다.
 *
 * [무엇이 고장나 있었나] `{ticket.title}<StatusBadge label="높음" />` 처럼 텍스트와 배지를 그냥
 * 이어 두면 사이에 **간격이 0** 이다 — '배송이 오지 않아요높음' 으로 한 낱말처럼 읽히고 배지가
 * 제목의 일부로 보인다. 인라인 흐름에는 gap 이 없고, JSX 는 줄바꿈 공백도 지운다.
 *
 * [왜 하나로 충분한가] 이 값은 화면마다 지역 사본으로 흩어져 있었다 —
 * `titleGroupStyle`(FAQ·공지·약관·개인정보 상세 + 공지 표) · `cellRowStyle`(프로그램 상세 표) ·
 * `keywordCellStyle`(검색어 통계 표) · `cardTitleRowStyle`(문의 상세). **전부 gap 이 space.2 다.**
 * 제목 줄이든 표 셀 안이든 같은 값을 골랐으므로 '자리마다 달라야 한다' 는 관측이 아니라 추측이다.
 *   ↔ 페이지 `<h1>` 옆에 **액션 버튼까지** 세우는 줄(gap space.3)은 이것이 아니다 — 축이 다르다.
 *
 * [왜 inline-flex 인가] 표 셀(`<td>`)·정의 목록(`<dd>`)·카드 제목 안쪽처럼 **인라인 자리**에
 * 들어간다. block flex 는 그 자리의 인라인 흐름을 끊는다. `flexWrap` 은 좁은 폭에서 배지가
 * 글자를 밀어내는 대신 아래로 내려가게 한다.
 */
export const inlineBadgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};
