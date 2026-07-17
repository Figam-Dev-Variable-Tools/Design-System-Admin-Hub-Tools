// 알림 관리 목록 화면 공용 스타일 (apps/admin/src/pages/notifications/**)
//
// 세 목록(발송 규칙·이메일 템플릿·SMS 템플릿)이 같은 골격이다: 안내 배너 → [좌측 분류 필터 | 목록].
// 같은 값의 CSSProperties 를 세 파일이 재선언하면 여백을 손볼 때 화면이 어긋난다(클린코드 점검 축3 중복) — 한 벌만 둔다.
//
// [토큰만] 시각 값은 전부 semantic 토큰 CSS 변수다 — 하드코딩 hex/px 0건.
// [shorthand 금지] shared/ui/styles.ts 규칙과 같이 shorthand(padding)와 longhand(paddingLeft)를 한 객체에
//   섞지 않는다 — 스프레드로 합칠 때 값이 조용히 사라진다.
import type { CSSProperties } from 'react';

/** 화면 최상위 세로 스택 — 안내 배너 + 본문 */
export const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

/** 좌측 필터 + 목록 2열. 좁아지면 minmax(0,1fr) 이 목록을 줄여 가로 스크롤 대신 셀을 접는다 */
export const listLayoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'calc(var(--tds-space-6) * 8) minmax(0, 1fr)',
  gap: 'var(--tds-space-6)',
  alignItems: 'start',
};

/** 툴바 — 좌측 검색/필터, 우측 primary 등록 버튼 (IA-04) */
export const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

/** 툴바 좌측 묶음 */
export const toolbarFiltersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

/** 숫자·일시 셀 — tabular-nums 로 자릿수를 세로로 맞춘다 */
export const numericMutedStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/** 긴 자유 텍스트 셀 — 줄임표로 자른다(COMP-09: 긴 값이 컬럼을 밀어 표를 깨뜨리지 않는다) */
export const ellipsisCellStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  display: 'block',
  maxWidth: 'calc(var(--tds-space-6) * 11)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

/** 배너/경고 안의 '문구 + 링크' 한 줄 */
export const noticeBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

/** 한 줄로 줄인 본문 미리보기 — 표 셀에 넣기 전 줄바꿈을 없앤다 */
export function oneLinePreview(body: string, max: number): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}
