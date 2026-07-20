// 메시지 템플릿 편집기·상세 공용 스타일 조합
//
// [이 파일의 자리] 편집기(문자·이메일)와 상세가 **함께 쓰는** 것만 여기 산다. 한 화면에서만 쓰는
// 치수는 그 파일에 남긴다 (shared/ui/README.md 의 규칙을 폴더 안에서 같은 결로 적용한다).
//
// [목업의 보라 = action.primary] 목업의 강조색은 새 브랜드색이 아니라 이 디자인 시스템의
// action.primary 다. 보라 hex 를 새로 들이면 버튼·링크·포커스링과 다른 색이 화면에 하나 더 생긴다.
//
// [스타일 규칙] 모든 값은 토큰 CSS 변수. 파생 치수는 space 토큰의 calc 배수.
// **단축 속성(padding)과 개별 속성(paddingLeft)을 한 객체에서 섞지 않는다.**
import type { CSSProperties } from 'react';
import { cssVar } from '@tds/ui';

/** 편집기·상세의 페이지 골격 — 헤더와 본문을 띄운다 */
export const editorPageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

/**
 * 3단 배치 (좌 카드 / 중앙 카드 / 우 카드).
 *
 * [왜 grid 가 아니라 flex 인가] grid 의 `repeat(auto-fit, minmax(…, 1fr))` 는 반응형이지만 **모든
 * 열을 같은 폭으로** 만든다. 이 화면의 중앙은 본문을 쓰는 곳이라 좌·우보다 넓어야 한다(목업).
 * 인라인 style 에는 미디어 쿼리를 쓸 수 없으므로, 폭 비율(flex-grow)과 접힘(flex-wrap)을 동시에
 * 주는 flex 로 간다 — 좁아지면 기준 폭(flex-basis)을 넘지 못한 카드부터 아래로 내려간다.
 */
export const threeColumnStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: cssVar('space.5'),
  alignItems: 'flex-start',
  minWidth: 0,
};

/** 좌·우 열 — 셀렉트 두 개와 휴대폰 목업이라 필요 이상으로 넓어질 이유가 없다 */
export const sideColumnStyle: CSSProperties = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 'calc(var(--tds-space-10) * 4)',
  maxWidth: 'calc(var(--tds-space-10) * 6)',
  minWidth: 0,
};

/** 중앙 열 — 남는 폭을 좌·우의 세 배로 가져간다(본문을 쓰는 곳이다) */
export const centerColumnStyle: CSSProperties = {
  flexGrow: 3,
  flexShrink: 1,
  // 기준 폭은 세 카드가 1280px 폭에서 한 줄에 들어가도록 잡는다 — 넘치면 오른쪽 미리보기부터
  // 아래로 내려가고, 그때는 편집기가 아니라 미리보기가 접히는 편이 낫다.
  flexBasis: 'calc(var(--tds-space-10) * 5)',
  minWidth: 0,
};

/**
 * 카드 안의 구역 제목 — 목업의 보라 소제목.
 * 화면 문구는 한글이다: '발신 프로필' · '내용 입력' · '이미지 첨부'
 * (목업 원문은 `Sender profile` · `Content input *` · `Attach image` 였다 — 옮긴 것은 글자이고
 *  가져온 것은 배치다. 정본은 copy.ts).
 * 카드 제목(CardTitle)보다 한 단 아래이며 색으로 구역의 시작을 알린다.
 */
export const sectionHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.action.primary.default'),
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

/**
 * 카드 제목도 같은 보라를 쓴다 — '발신 프로필' · '미리보기' · '상태 이력'
 * (목업 원문 `Sender profile` · `Preview template` · `Template status history`).
 */
export const accentTitleStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
};

/** 구역(제목 + 내용)의 세로 스택 */
export const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* ── 안내 콜아웃 ─────────────────────────────────────────────────────────────
 * 연한 보라 배경 + 좌측 아이콘. Alert(피드백 배너)와 다른 물건이라 재사용하지 않는다 —
 * Alert 는 '방금 일어난 일' 을 알리고 이것은 '항상 참인 제약' 을 적어 둔다. */

export const calloutStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.feedback.info.surface'),
  color: cssVar('color.feedback.info.text'),
  minWidth: 0,
};

export const calloutListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: cssVar('space.4'),
  paddingRight: 0,
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  overflowWrap: 'anywhere',
};

/* ── 채널 칩 (SMS/LMS/MMS) ──────────────────────────────────────────────────── */

/** 제목 아래 보라 pill — 정보이자 선택 가능한 컨트롤이라 pill 모양의 select 로 그린다 */
export const channelChipStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.action.primary.default'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.feedback.info.surface'),
  color: cssVar('color.action.primary.default'),
  fontFamily: 'var(--tds-typography-label-sm-font-family)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
  cursor: 'pointer',
  appearance: 'none',
};

/* ── 아이콘 전용 버튼 (툴바 · 접기) ─────────────────────────────────────────── */

export function iconButtonStyle(disabled = false): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: cssVar('space.6'),
    height: cssVar('space.6'),
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    borderStyle: 'solid',
    borderWidth: cssVar('border-width.thin'),
    borderColor: 'transparent',
    borderRadius: cssVar('radius.sm'),
    background: 'transparent',
    color: disabled ? cssVar('color.text.disabled') : cssVar('color.text.muted'),
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
