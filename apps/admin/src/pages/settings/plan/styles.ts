// 플랜 화면 세 탭이 공유하는 레이아웃 토큰 조합
//
// 세 패널이 각자 같은 상수를 선언하면 탭을 옮겨 다닐 때 카드 간격이 미묘하게 달라진다 —
// 같은 화면 안에서 그 차이는 결함으로 읽힌다. 시각 값은 전부 토큰 CSS 변수다(하드코딩 0건).
import type { CSSProperties } from 'react';

import { cssVar } from '@tds/ui';

import { tdStyle } from '../../../shared/ui';

/** 탭 패널 한 장 — 카드들을 세로로 쌓는다 */
export const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

/**
 * 행 머리 칸(`<th scope="row">`) — **시작 정렬이다.**
 *
 * `<th>` 의 브라우저 기본 정렬은 가운데라, 데이터 셀(`<td>`, 시작 정렬)과 나란히 두면 이름만
 * 가운데로 떠서 표의 왼쪽 모서리가 들쭉날쭉해진다. 행 머리는 읽는 순서의 시작점이므로 시작
 * 정렬이어야 한다 — 정렬을 명시하지 않으면 태그가 대신 정한다.
 * (논리 속성으로 적어 RTL 에서도 읽는 방향의 시작에 붙는다.)
 */
export const rowHeaderStyle: CSSProperties = { ...tdStyle, textAlign: 'start' };

/** 가로로 넘치는 표를 화면 밖으로 밀지 않는다 — 표만 스크롤한다 */
export const tableScrollStyle: CSSProperties = { overflowX: 'auto', minWidth: 0 };

/** 카드 안에서 문단·표를 띄우는 간격 */
export const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};
