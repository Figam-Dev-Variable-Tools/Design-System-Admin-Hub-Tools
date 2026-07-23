// 이메일 빌더의 크롬 스타일 (레일·툴바·패널)
//
// [토큰만 쓴다] 여기 있는 값은 전부 var(--tds-*) 다 — 이 파일은 **화면의 껍데기**를 그리고,
// 껍데기는 디자인 시스템의 것이다. 운영자가 고른 블록 색(hex)은 여기 오지 않는다: 그것은
// 데이터이므로 렌더 시점에 state 에서 style 로 직접 흐른다 (blocks.ts 주석 참조).
//
// [단축/개별 속성을 섞지 않는다] padding 과 paddingLeft 를 한 객체에 함께 쓰면 스프레드 병합에서
// 한쪽이 통째로 지워진다. 아래 객체는 전부 개별 속성만 쓴다 (shared/ui/styles.ts 규약).
import type { CSSProperties } from 'react';
import { cssVar, typography } from '@tds/ui';

/* ── 레이아웃 ────────────────────────────────────────────────────────────── */

/** [레일][캔버스][패널] 3열. 양옆은 고정 폭, 가운데가 남는 폭을 먹는다 */
export const builderStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.10')} * 3.5) minmax(0, 1fr) calc(${cssVar('space.10')} * 4)`,
  gap: cssVar('space.4'),
  alignItems: 'start',
  minWidth: 0,
};

/** 한쪽 사이드가 접혔을 때 — 접힌 열은 트랙에서 아예 빠진다 */
export function builderGridStyle(leftOpen: boolean, rightOpen: boolean): CSSProperties {
  const left = leftOpen ? `calc(${cssVar('space.10')} * 3.5)` : '0';
  const right = rightOpen ? `calc(${cssVar('space.10')} * 4)` : '0';
  return { ...builderStyle, gridTemplateColumns: `${left} minmax(0, 1fr) ${right}` };
}

export const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* ── 제목 ────────────────────────────────────────────────────────────────── */

/** 레일 머리글 — 목업의 보라색 제목 */
export const railHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.action.primary.default'),
  ...typography('typography.title.md'),
};

/** INSPECT 의 'HEADING BLOCK' — 대문자 소제목 */
export const panelHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontFamily: cssVar('typography.label.sm.font-family'),
  fontSize: cssVar('typography.label.sm.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: cssVar('typography.label.sm.line-height'),
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};

/* ── 프리셋 레일 ─────────────────────────────────────────────────────────── */

export const presetListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyle: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

/** 프리셋 한 줄 — 선택된 줄만 옅은 회색 바탕 */
export function presetItemStyle(selected: boolean): CSSProperties {
  return {
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    borderStyle: 'none',
    borderRadius: cssVar('radius.md'),
    background: selected ? cssVar('color.surface.raised') : 'transparent',
    color: cssVar('color.text.default'),
    fontFamily: cssVar('typography.body.md.font-family'),
    fontSize: cssVar('typography.label.md.font-size'),
    fontWeight: selected
      ? cssVar('primitive.typography.font-weight.semibold')
      : cssVar('primitive.typography.font-weight.regular'),
    lineHeight: cssVar('typography.body.md.line-height'),
    textAlign: 'left',
    cursor: 'pointer',
  };
}

/* ── 툴바 ────────────────────────────────────────────────────────────────── */

export const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
};

/** 툴바를 좌/우로 가르는 여백 */
export const toolbarSpacerStyle: CSSProperties = { flex: 1, minWidth: 0 };

/** 툴바 구획선 */
export const toolbarDividerStyle: CSSProperties = {
  alignSelf: 'stretch',
  width: cssVar('border-width.thin'),
  background: cssVar('color.border.subtle'),
};

/** 아이콘 버튼 — 눌린 상태면 보라색으로 뜬다 */
export function iconButtonStyle(pressed = false, disabled = false): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: cssVar('space.1'),
    width: cssVar('space.7'),
    height: cssVar('space.7'),
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    borderStyle: 'solid',
    borderWidth: cssVar('border-width.thin'),
    borderColor: pressed ? cssVar('color.action.primary.default') : 'transparent',
    borderRadius: cssVar('radius.sm'),
    background: pressed ? cssVar('color.surface.raised') : 'transparent',
    color: disabled
      ? cssVar('color.text.disabled')
      : pressed
        ? cssVar('color.action.primary.default')
        : cssVar('color.text.default'),
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

/* ── 캔버스 ──────────────────────────────────────────────────────────────── */

/** 캔버스 바깥 — 배경(backdrop)은 데이터라 호출부가 background 를 덧씌운다 */
export const canvasScrollStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: cssVar('space.4'),
  paddingTop: cssVar('space.5'),
  paddingBottom: cssVar('space.5'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderRadius: cssVar('radius.md'),
  minWidth: 0,
  overflowX: 'auto',
};

/**
 * 데스크톱/모바일 폭 — space.10(64) 의 배수로만 표현한다(px 리터럴 금지).
 * 9.375배 = 600 — 이메일 본문의 사실상 표준 폭이다(MailFrame 의 MAIL_WIDTH 와 같은 근거).
 * 6배 = 384 — 휴대폰 본문 폭에 가깝다.
 */
export const CANVAS_WIDTH_DESKTOP = `calc(${cssVar('space.10')} * 9.375)`;
export const CANVAS_WIDTH_MOBILE = `calc(${cssVar('space.10')} * 6)`;

/** 발신 설정 카드 — 왼쪽에 보라색 강조 바 */
export const senderCardStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderLeftStyle: 'solid',
  borderLeftWidth: cssVar('border-width.thick'),
  borderLeftColor: cssVar('color.action.primary.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
};

/** 미리보기 탭의 읽기 전용 한 줄 — 'From  …' / 'Subject  …' */
export const senderReadonlyRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  gap: cssVar('space.3'),
  minWidth: 0,
};

export const senderReadonlyLabelStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.semibold'),
  minWidth: cssVar('space.8'),
};

export const senderReadonlyValueStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  overflowWrap: 'anywhere',
};

/** 제목은 보라색으로 — 목업이 유일하게 강조하는 값이다 */
export const senderReadonlySubjectStyle: CSSProperties = {
  ...senderReadonlyValueStyle,
  color: cssVar('color.action.primary.default'),
  fontWeight: cssVar('primitive.typography.font-weight.semibold'),
};

/* ── 블록 스택 ───────────────────────────────────────────────────────────── */

export const blockStackStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  overflow: 'hidden',
};

/* [삭제됨 — blockShellStyle] 블록 하나를 통째로 <button> 이 감싸던 시절의 껍데기였다
 * (cursor/textAlign/background/padding 0 은 전부 버튼 리셋이다). 컬럼(다단)이 생기면서 그 방식이
 * 무너져 **평범한 <div> 의 윤곽 + 형제로 놓인 투명 버튼** 둘로 갈라졌다 — 지금은
 * blockOutlineStyle(윤곽)과 blockSelectOverlayStyle(클릭)이 그 일을 나눠 한다(바로 아래 머리말에
 * 왜 갈랐는지가 있다). 갈라진 뒤로 호출부가 0이 되었는데 함수만 남아 있었다. */

/**
 * 선택용 투명 덮개 — 블록 위에 겹쳐 놓는 **버튼**.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * [왜 블록을 <button> 으로 감싸지 않는가 — 컬럼이 생기면서 바뀐 것]
 * 예전에는 블록 하나를 통째로 <button> 이 감쌌다. 컬럼(다단)이 생기면서 그 방식이 무너진다:
 * 칸 안의 블록도 각자 고를 수 있어야 하는데, 그러면 **버튼 안에 버튼**이 들어간다. 이것은
 *   (1) HTML 명세 위반이고(<button> 의 내용 모델은 interactive content 를 금지한다),
 *   (2) 브라우저가 파싱 단계에서 안쪽 버튼을 바깥으로 끄집어내 DOM 이 예상과 달라지며,
 *   (3) 스크린리더가 중첩된 버튼의 이름을 서로 삼켜 어느 것을 고르는지 읽어 주지 못한다.
 *
 * 그래서 블록의 시각 표현은 평범한 <div> 로 두고, **형제**로 놓인 투명 버튼이 클릭을 받는다.
 * 부모 덮개와 자식 덮개는 DOM 상 중첩되지 않으므로 위 세 문제가 전부 사라진다.
 * 겹치는 영역은 z-index 로 가른다 — 자식이 위(2), 부모가 아래(1). 칸의 빈 곳을 누르면 행이,
 * 칸 안의 블록을 누르면 그 블록이 선택된다.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function blockSelectOverlayStyle(nested: boolean): CSSProperties {
  return {
    position: 'absolute',
    inset: 0,
    // 자식이 부모 덮개보다 위에 있어야 칸 안의 블록을 고를 수 있다
    zIndex: nested ? 2 : 1,
    display: 'block',
    width: '100%',
    height: '100%',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    borderStyle: 'none',
    background: 'transparent',
    cursor: 'pointer',
  };
}

/**
 * 블록의 시각 껍데기 — 선택 윤곽만 담당한다(더 이상 버튼이 아니다).
 * 윤곽이 생겨도 내용이 밀리지 않게 항상 같은 두께의 테두리를 둔다(투명 → 보라).
 */
export function blockOutlineStyle(active: boolean, nested = false): CSSProperties {
  return {
    position: 'relative',
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
    borderStyle: 'solid',
    borderWidth: cssVar('border-width.medium'),
    borderColor: active
      ? cssVar('color.action.primary.default')
      : nested
        ? cssVar('color.border.subtle')
        : 'transparent',
  };
}

/**
 * 빈 칸의 + — 선택 덮개보다 **위**에 있어야 눌린다.
 *
 * [왜 z-index 가 필요한가] 덮개(z-index 1)는 행 전체를 덮는다. 그 아래에 놓인 버튼은 클릭이
 * 덮개에 먼저 잡혀 영영 눌리지 않는다 — jsdom 은 히트 테스트를 하지 않아 단위 테스트가 통과하고,
 * 실제 브라우저에서만 드러나는 종류의 버그다(실제로 그렇게 드러났다). 자식 덮개(2)보다도 위인
 * 3 을 준다: 빈 칸에는 자식이 없지만, 값이 서로를 넘지 않게 한 자리에 모아 둔다.
 */
export const columnAddButtonStyle: CSSProperties = {
  ...roundAddButtonStyle(),
  position: 'relative',
  zIndex: 3,
};

/** 빈 칸의 자리표시 — 여기에 무언가를 넣을 수 있다는 것을 보여 준다 */
export const emptyColumnStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: cssVar('space.10'),
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.raised'),
};

/** 블록 아래 가장자리에 뜨는 동그란 + */
export const blockInsertHandleStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 0,
  transform: 'translate(-50%, 50%)',
  // 덮개보다 위여야 눌린다 (columnAddButtonStyle 머리말과 같은 이유)
  zIndex: 4,
};

/** 선택된 블록의 지우기 버튼 자리 — 오른쪽 위 모서리 */
export const blockRemoveHandleStyle: CSSProperties = {
  position: 'absolute',
  right: 0,
  top: 0,
  // 가로로는 밀지 않는다 — 밀면 캔버스 오른쪽 경계 밖으로 나가 잘린다(브라우저에서 드러났다).
  // 세로로만 반쯤 걸쳐 블록 모서리에 얹힌 것처럼 보이게 한다.
  transform: 'translate(0, -50%)',
  // 덮개(1·2)와 칸의 +(3) 보다 위 — 선택된 블록에서 가장 먼저 눌려야 하는 것이 지우기다
  zIndex: 4,
};

/** 동그란 보라색 + 버튼 */
export function roundAddButtonStyle(large = false): CSSProperties {
  const size = large ? cssVar('space.9') : cssVar('space.6');
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: size,
    height: size,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    borderStyle: 'none',
    borderRadius: cssVar('radius.full'),
    background: cssVar('color.action.primary.default'),
    color: cssVar('color.text.on-primary'),
    cursor: 'pointer',
    boxShadow: cssVar('shadow.raised'),
  };
}

/** 블록이 하나도 없을 때의 빈 카드 */
export const emptyStackStyle: CSSProperties = {
  boxSizing: 'border-box',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: `calc(${cssVar('space.10')} * 2)`,
  paddingTop: cssVar('space.8'),
  paddingBottom: cssVar('space.8'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
};

/** 미완성 블록의 빨간 안내 — 색과 문구로 이중 전달한다 */
export const incompleteTextStyle: CSSProperties = {
  marginTop: cssVar('space.2'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.feedback.danger.text'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

/** 파일이 없는 이미지/로고/아바타 자리의 회색 도형 */
export function placeholderShapeStyle(radius: string): CSSProperties {
  return {
    display: 'inline-block',
    width: cssVar('space.9'),
    height: cssVar('space.9'),
    borderRadius: radius,
    background: cssVar('color.surface.skeleton'),
  };
}

/* ── 블록 피커 ───────────────────────────────────────────────────────────── */

export const blockPickerStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(calc(${cssVar('space.10')} * 1.5), 1fr))`,
  gap: cssVar('space.2'),
  minWidth: 0,
};

export const blockPickerItemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.sm.font-size'),
  cursor: 'pointer',
};

/* ── 블록 묶음(구성) ─────────────────────────────────────────────────────────
 *
 * [왜 종류 격자와 다른 모양인가] 블록 종류는 이름 하나로 무엇인지 알 수 있어서 작은 정사각 칸에
 * 아이콘 + 낱말이면 충분하다. 묶음은 그렇지 않다 — '상품 카드 2단' 이 몇 장의 블록으로 들어오는지,
 * 사진이 포함되는지는 이름이 말해 주지 않는다. 그래서 한 줄에 하나씩, 설명을 데리고 선다. */

export const blockGroupListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

export const blockGroupItemStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: cssVar('space.1'),
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  textAlign: 'left',
  cursor: 'pointer',
};

export const blockGroupLabelStyle: CSSProperties = {
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.semibold'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

export const blockGroupDescriptionStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

/** 모달 안 구획 제목 — '블록 종류' / '구성' */
export const pickerSectionTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: cssVar('space.2'),
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

/** 구획 사이 간격 — 모달 안에서 두 목록이 붙어 보이지 않게 */
export const pickerSectionStyle: CSSProperties = {
  marginTop: cssVar('space.5'),
};

/* ── 블록 이동 손잡이 ─────────────────────────────────────────────────────────
 *
 * [왜 지우기 반대편인가] 지우기는 오른쪽 위에 있다(blockRemoveHandleStyle). 이동을 그 옆에 붙이면
 * '한 칸 아래로' 를 누르려다 '삭제' 를 누르는 일이 반드시 생긴다 — 되돌릴 수 있는 조작과 파괴적인
 * 조작은 손가락 거리가 멀어야 한다. */
export const blockMoveHandleStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  top: 0,
  display: 'flex',
  alignItems: 'center',
  transform: 'translate(0, -50%)',
  // 덮개(1·2)와 칸의 +(3) 보다 위 — 선택된 블록 위에서 눌려야 한다
  zIndex: 4,
};

/* ── 발송 전 점검 패널 ───────────────────────────────────────────────────────── */

export const preflightListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyle: 'none',
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

/** 지적 한 줄 — 왼쪽에 심각도 색 띠. 색만으로 구분하지 않는다(배지가 글자로도 말한다) */
export function preflightItemStyle(blocking: boolean): CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: cssVar('space.1'),
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    borderLeftStyle: 'solid',
    borderLeftWidth: cssVar('border-width.thick'),
    borderLeftColor: blocking
      ? cssVar('color.feedback.danger.border')
      : cssVar('color.feedback.warning.border'),
    borderRadius: cssVar('radius.sm'),
    background: cssVar('color.surface.raised'),
  };
}

export const preflightMessageStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

/** 지적이 하나도 없을 때 — 빈 화면이 아니라 '통과' 라고 말한다 */
export const preflightOkStyle: CSSProperties = {
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
};

/* ── 변수 패널 ───────────────────────────────────────────────────────────── */

/** 툴바 아래로 내려오는 드롭다운 — 툴바 버튼이 position:relative 를 갖는다 */
export const variableMenuStyle: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  zIndex: 2,
  // 6개 도메인 · 한국어 라벨 + 영문 토큰이 한 줄에 들어가야 한다 — 예전 목록(다섯 낱말)보다 넓다
  width: `calc(${cssVar('space.10')} * 7)`,
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  marginTop: cssVar('space.1'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  boxShadow: cssVar('shadow.overlay'),
};

// [삭제됨] variableGroupButtonStyle / variableLeafButtonStyle
//   드롭다운의 목록을 이 화면이 직접 그리던 시절의 것이다. 그리는 일이 세 화면 공용
//   `marketing/_shared/TemplateVariablePicker` 로 옮겨 가면서 소비자가 0 이 됐다 —
//   소비자 없는 export 는 죽은 코드다(클린코드 점검 축5). 목록의 표면은 이제 그쪽이 소유한다.

/* ── 오른쪽 패널 ─────────────────────────────────────────────────────────── */

export const panelFieldListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/** 두 칸 나란히 (Width / Height) */
export const panelPairStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: cssVar('space.2'),
  minWidth: 0,
};

export const panelEmptyStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
};
