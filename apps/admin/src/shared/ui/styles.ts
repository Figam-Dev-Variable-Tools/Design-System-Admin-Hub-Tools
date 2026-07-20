// 공통 스타일 토큰 조합
//
// [이 파일의 자리] 두 개 이상의 페이지가 쓰는 스타일만 여기 산다. 페이지 한 곳에서만 쓰는
// 레이아웃/치수는 그 페이지에 남긴다. 규칙은 shared/ui/README.md 를 따른다.
//
// [스타일 규칙 — G6 체크리스트]
// - 모든 시각 값은 토큰 CSS 변수(var(--tds-*))만 — 하드코딩 색상 hex / px 리터럴 0건.
// - 토큰에 없는 파생 치수(사이드 폭·아바타 크기 등)는 space 토큰의 calc 배수로 표현한다.
// - 보더 두께는 px 리터럴 대신 CSS 키워드(thin/medium) 또는 border-width 토큰을 쓴다.
// - **단축 속성(padding)과 개별 속성(paddingLeft)을 한 객체에서 섞지 않는다** — 병합이 깨져 빈 값이 된다.
//   그래서 아래 객체들은 padding/margin/border 를 전부 개별 속성으로만 쓴다.
import type { CSSProperties } from 'react';
import { cssVar } from '@tds/ui';

/* ── 텍스트 ──────────────────────────────────────────────────────────────── */

export const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: cssVar('space.1'),
  height: cssVar('space.1'),
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  marginTop: 'calc(var(--tds-space-1) * -1)',
  marginBottom: 'calc(var(--tds-space-1) * -1)',
  marginLeft: 'calc(var(--tds-space-1) * -1)',
  marginRight: 'calc(var(--tds-space-1) * -1)',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
  borderStyle: 'none',
};

/**
 * 페이지 `<h1>` — 화면당 하나뿐인 지배적 제목 (TOKEN-05).
 *
 * [왜 title.xl(20/600) 인가]
 * 예전 스케일은 title.lg(18px bold)에서 멈춰 page title·card title·body·KPI 가 16–18px 에 몰려
 * 위계가 없었다. F1 이 display tier 를 열었으므로 이제 아래로 명확히 내려간다:
 *   display.sm(24/600) KPI 수치  >  **title.xl(20/600) 페이지 제목**  >  title.lg(18/700) 카드 제목
 *   >  body.md(16/400) 본문
 * page `<h1>` 에 display.sm(24)을 쓰면 KPI 수치와 같은 급이 되어 대시보드에서 무엇이 지배적인지
 * 다시 흐려진다 — 그래서 제목은 한 단 아래 title.xl 을 쓴다. 이 배치는 기존 토큰만으로 성립하므로
 * F1 이 dead 로 지운 display.md(28)/font-size 28·32 를 되살리지 않는다 (소비자 없는 토큰 금지).
 *
 * [왜 공유하나] 이 객체는 24개 파일에 복붙돼 있었고, 그중 AppHeader·LoginPage·PlaceholderPage 는
 * semantic 토큰을 건너뛰고 primitive(font-size-18)를 직접 읽어 title.lg 의 값을 손으로 재현했다 —
 * 토큰을 바꿔도 따라오지 않는 사본이다. 페이지 제목의 정의는 여기 하나뿐이다 (TOKEN-10).
 */
export const pageTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-title-xl-font-family)',
  fontSize: 'var(--tds-typography-title-xl-font-size)',
  fontWeight: 'var(--tds-typography-title-xl-font-weight)',
  lineHeight: 'var(--tds-typography-title-xl-line-height)',
};

export const mutedTextStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

/**
 * Alert 안의 '문구 + 복구 버튼' 한 줄 — 조회 실패 배너의 공통 골격 (STATE-02).
 *
 * 좁은 폭에서 버튼이 문구를 밀어내지 않도록 wrap 한다. 같은 값이 CrudListShell·FormPageShell·
 * MembersPage 와 preview 폼 10곳에 각각 선언돼 있었다 — 배너 간격을 조정하려면 13곳을 고쳐야 했다.
 */
export const alertActionRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

export const hintStyle: CSSProperties = {
  ...mutedTextStyle,
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
};

/* ── 카드 ────────────────────────────────────────────────────────────────── */

/**
 * 카드 **본문의 세로 스택** — 표면(배경·테두리·라운드·패딩)은 @tds/ui Card 가 소유한다.
 *
 * 예전에는 이 객체가 표면까지 전부 손으로 그린 사본이었다(`cardStyle`). 그 사본은 사라졌고,
 * 남은 것은 '제목과 본문을 space.4 로 쌓는다' 는 **이 앱의 규약**뿐이다. DS Card 는 자식 간격을
 * 정해 주지 않는다 — 정해 주면 모든 소비자에게 강요되기 때문이다.
 */
export const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

export const cardTitleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-title-md-font-family)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-typography-title-md-font-weight)',
  lineHeight: 'var(--tds-typography-title-md-line-height)',
};

/* ── 버튼 ────────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function buttonStyle(variant: ButtonVariant, disabled = false): CSSProperties {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: cssVar('component.button.gap'),
    paddingTop: cssVar('component.button.padding-y'),
    paddingBottom: cssVar('component.button.padding-y'),
    paddingLeft: cssVar('component.button.padding-x'),
    paddingRight: cssVar('component.button.padding-x'),
    borderStyle: 'solid',
    borderWidth: cssVar('border-width.thin'),
    borderColor: 'transparent',
    borderRadius: cssVar('component.button.radius'),
    fontFamily: 'var(--tds-typography-label-md-font-family)',
    fontSize: 'var(--tds-typography-label-md-font-size)',
    fontWeight: 'var(--tds-typography-label-md-font-weight)',
    lineHeight: 'var(--tds-typography-label-md-line-height)',
    whiteSpace: 'nowrap',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background-color var(--tds-component-button-transition-duration)',
  };

  if (variant === 'primary') {
    return {
      ...base,
      background: disabled
        ? cssVar('component.button.background-disabled')
        : cssVar('component.button.background'),
      color: disabled ? cssVar('color.text.disabled') : cssVar('component.button.text'),
    };
  }

  if (variant === 'secondary') {
    return {
      ...base,
      background: cssVar('color.surface.default'),
      borderColor: disabled
        ? cssVar('color.action.primary.disabled')
        : cssVar('color.border.default'),
      color: disabled ? cssVar('color.text.disabled') : cssVar('color.text.default'),
    };
  }

  if (variant === 'danger') {
    return {
      ...base,
      background: cssVar('color.feedback.danger.surface'),
      borderColor: cssVar('color.feedback.danger.border'),
      color: cssVar('color.feedback.danger.text'),
    };
  }

  // ghost — 아이콘 전용 버튼(연필/⋯/×)
  return {
    ...base,
    paddingTop: cssVar('space.1'),
    paddingBottom: cssVar('space.1'),
    paddingLeft: cssVar('space.1'),
    paddingRight: cssVar('space.1'),
    background: 'transparent',
    color: disabled ? cssVar('color.text.disabled') : cssVar('color.text.muted'),
  };
}

/* ── 좌측 필터 패널 (제목 · 목록 · 항목) ─────────────────────────────────── */
//
// [승격 이력] 이 세 조각은 `TierFilter` · `GroupFilter` · `AdminGroupPanel` · `RolePanel` 에
// **네 벌이 글자 하나 다르지 않게 복사돼** 있었다 (클린코드 점검 축3 중복). 로그인 이력 화면의 필터가
// 다섯 번째 소비자가 되는 자리에서 다섯 벌로 늘리는 대신 여기로 올렸다.
// 한 벌만 남았으므로, 선택 강조를 바꾸면 네 화면이 함께 바뀐다.
//
// 도메인을 모른다 — 등급·그룹·역할·결과 중 무엇을 고르는 목록인지 알지 못한다. **active 하나만 받는다.**

/**
 * 좌측 패널 껍데기 — 제목 + 목록 + 하단 안내문을 세로로 쌓는다.
 *
 * [승격 이력] `AdminGroupPanel` 과 `RolePanel` 에 **두 벌이 글자 하나 다르지 않게 복사**돼 있었다
 * (클린코드 점검 축3 `clone:ba83801c796d0f33`). 여기로 올려 한 벌만 남긴다.
 *
 * ⚠ 같은 클론 윈도에 걸렸던 `RolePanel.actionsStyle`(상단 액션바 · border-bottom)은 **여기 없다** —
 * 하단 안내문(`filterNoticeStyle` · border-top)과 토큰 모양만 닮았을 뿐 변경 축이 다르다. 합치지 않는다.
 */
export const filterPanelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

/** 패널 안의 필터 목록을 감싸는 nav */
export const filterNavStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

/** 패널 하단 안내문 — 위쪽 구분선으로 목록과 갈라 놓는다 */
export const filterNoticeStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.4'),
  paddingBottom: 0,
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
};

export const filterHeadingStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: cssVar('space.3'),
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontFamily: 'var(--tds-typography-label-sm-font-family)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: 'var(--tds-typography-label-sm-font-weight)',
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
};

export const filterListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

/** 선택 시 배경 강조 + 파란 텍스트. hover 는 `.tds-ui-listitem` 이 CSS 로 준다 */
export function filterItemStyle(active: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: cssVar('space.2'),
    width: '100%',
    boxSizing: 'border-box',
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    borderStyle: 'none',
    borderWidth: 0,
    borderRadius: cssVar('radius.md'),
    background: active ? cssVar('color.surface.raised') : 'transparent',
    color: active ? cssVar('color.action.primary.default') : cssVar('color.text.default'),
    fontFamily: 'var(--tds-typography-label-md-font-family)',
    fontSize: 'var(--tds-typography-label-md-font-size)',
    fontWeight: active
      ? cssVar('primitive.typography.font-weight.bold')
      : cssVar('primitive.typography.font-weight.regular'),
    lineHeight: 'var(--tds-typography-label-md-line-height)',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background-color var(--tds-motion-duration-fast)',
  };
}

/* ── 폼 컨트롤 ───────────────────────────────────────────────────────────── */

/**
 * 입력 표면.
 *
 * [왜 disabled 를 인자로 받나 — CSS 로는 못 이긴다] 잠긴 칸의 회색 배경은 `.tds-ui-input:disabled`
 * 규칙으로 두는 게 자연스럽지만, 이 함수가 `background` 를 **인라인 style 로** 박기 때문에 규칙이
 * 항상 진다(인라인이 스타일시트를 이긴다). `!important` 로 억지로 이기게 하는 대신, 배경을 정하는
 * 곳이 상태도 함께 알게 한다 — 배경의 주인은 한 곳이어야 한다.
 */
export function controlStyle(invalid = false, disabled = false): CSSProperties {
  return {
    boxSizing: 'border-box',
    width: '100%',
    minWidth: 0,
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    borderStyle: 'solid',
    borderWidth: invalid ? cssVar('border-width.medium') : cssVar('border-width.thin'),
    borderColor: invalid ? cssVar('color.feedback.danger.border') : cssVar('color.border.default'),
    borderRadius: cssVar('radius.md'),
    background: disabled ? cssVar('color.surface.raised') : cssVar('color.surface.default'),
    // 글자는 흐리지 않는다 — 잠긴 칸의 내용은 여전히 **읽으라고** 있는 것이다(대비를 유지한다)
    color: cssVar('color.text.default'),
    fontFamily: 'var(--tds-typography-body-md-font-family)',
    fontSize: 'var(--tds-typography-label-md-font-size)',
    lineHeight: 'var(--tds-typography-body-md-line-height)',
  };
}

export const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

export const fieldLabelStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-typography-label-md-font-weight)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

/** 인라인 오류 문구 — 색 + role="alert" 로 이중 전달 */
export const errorTextStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.feedback.danger.text'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

/* ── 피드백 (배너 · 토스트) ──────────────────────────────────────────────────
 * feedbackStyle · FeedbackTone 은 유일 소비자였던 Toast 가 @tds/ui 로 승격되며 삭제됐다 (죽은 코드 0).
 * 피드백 배너는 이제 @tds/ui 의 Alert · Toast 가 소유한다. */

/* ── 표 ──────────────────────────────────────────────────────────────────── */

export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

/* 셀 여백·구분선은 component.table 토큰이 정본이다 (ERP-02). 여기서 px 를 세지 않는다 —
   밀도를 바꾸려면 tokens.json 의 component.table.* 한 곳만 고치면 DataTable 과 함께 움직인다.
   thead 밑줄만 border.default 를 유지한다: 머리/몸통을 가르는 구조선이라 행 divider(subtle)보다 진해야 한다. */
export const thStyle: CSSProperties = {
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('component.table.cell-padding-x'),
  paddingRight: cssVar('component.table.cell-padding-x'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.default'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: 'var(--tds-typography-label-sm-font-weight)',
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

export const tdStyle: CSSProperties = {
  paddingTop: cssVar('component.table.cell-padding-y'),
  paddingBottom: cssVar('component.table.cell-padding-y'),
  paddingLeft: cssVar('component.table.cell-padding-x'),
  paddingRight: cssVar('component.table.cell-padding-x'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('component.table.divider'),
  color: cssVar('color.text.default'),
  verticalAlign: 'middle',
};

export const numericCellStyle: CSSProperties = {
  ...tdStyle,
  fontVariantNumeric: 'tabular-nums',
  textAlign: 'right',
};

export const checkboxStyle: CSSProperties = {
  width: cssVar('space.4'),
  height: cssVar('space.4'),
  accentColor: cssVar('color.action.primary.default'),
  cursor: 'pointer',
};

/* ── 읽기 전용 정의 목록 (dl/dt/dd) ──────────────────────────────────────── */

export const dlStyle: CSSProperties = {
  display: 'grid',
  // 라벨 열은 고정 폭, 값 열은 남는 만큼 — 라벨이 길어도 값이 밀리지 않는다
  gridTemplateColumns: 'minmax(calc(var(--tds-space-6) * 4), auto) minmax(0, 1fr)',
  columnGap: cssVar('space.4'),
  rowGap: cssVar('space.3'),
  alignItems: 'center',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
};

export const dtStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

export const ddStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  overflowWrap: 'anywhere',
};

/* ── 배지 ────────────────────────────────────────────────────────────────── */

export const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: 'var(--tds-typography-label-sm-font-weight)',
  lineHeight: 'calc(var(--tds-space-5))',
  whiteSpace: 'nowrap',
  fontVariantNumeric: 'tabular-nums',
};
