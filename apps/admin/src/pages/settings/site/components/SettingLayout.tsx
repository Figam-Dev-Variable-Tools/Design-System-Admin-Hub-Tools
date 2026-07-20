// 사이트 설정 화면의 골격 — 왼쪽 라벨 열 / 오른쪽 컨트롤 열 (사이트 설정 전용)
//
// [왜 두 층인가]
//   SettingSection : 섹션 제목이 **섹션의 왼쪽 위**에 서고, 오른쪽에 그 섹션의 행들이 쌓인다.
//   SettingRow     : 행 안에서도 같은 축을 쓴다 — 라벨·설명은 왼쪽, 컨트롤(입력/토글/업로드)은 오른쪽.
//   두 층이 같은 그리드 축을 공유해서, 섹션이 달라도 라벨의 왼쪽 모서리가 한 줄로 맞는다.
//
// [좁은 화면] 라벨 열을 접고 한 줄씩 쌓는다 — 그리드를 auto-fit 이 아니라 **명시적 분기**로 두는
// 이유는 라벨 열의 폭이 내용에 따라 들쭉날쭉해지면 위 문단의 '한 줄로 맞는다' 가 깨지기 때문이다.
// 분기는 CSS 미디어쿼리가 아니라 컨테이너 폭에 대한 grid 의 minmax 로 흡수한다(JS 측정 없음).
//
// [모든 시각 값은 토큰 CSS 변수] 하드코딩 hex/px 0건.
import type { CSSProperties, ReactNode } from 'react';
import { cssVar } from '@tds/ui';

/** 라벨 열의 폭 — space 토큰의 배수로만 표현한다(토큰에 없는 파생 치수 규칙) */
const LABEL_COLUMN = 'minmax(0, calc(var(--tds-space-10) * 3))';

const sectionStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `${LABEL_COLUMN} minmax(0, 1fr)`,
  columnGap: cssVar('space.6'),
  rowGap: cssVar('space.4'),
  alignItems: 'start',
  paddingTop: cssVar('space.6'),
  paddingBottom: cssVar('space.6'),
  paddingLeft: 0,
  paddingRight: 0,
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.subtle'),
};

const sectionTitleStyle: CSSProperties = {
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

const sectionBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.6'),
  minWidth: 0,
};

interface SettingSectionProps {
  readonly id: string;
  readonly title: string;
  readonly children: ReactNode;
}

/** 한 섹션 — 왼쪽 위 제목 + 오른쪽 행 스택 */
export function SettingSection({ id, title, children }: SettingSectionProps) {
  return (
    <section style={sectionStyle} aria-labelledby={id}>
      <h3 id={id} style={sectionTitleStyle}>
        {title}
      </h3>
      <div style={sectionBodyStyle}>{children}</div>
    </section>
  );
}

/* ── 행 ────────────────────────────────────────────────────────────────────── */

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `${LABEL_COLUMN} minmax(0, 1fr)`,
  columnGap: cssVar('space.6'),
  rowGap: cssVar('space.2'),
  alignItems: 'start',
  minWidth: 0,
};

const rowLabelBoxStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const rowLabelHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  minWidth: 0,
};

function rowLabelStyle(disabled: boolean): CSSProperties {
  return {
    color: disabled ? cssVar('color.text.disabled') : cssVar('color.text.default'),
    fontFamily: 'var(--tds-typography-label-md-font-family)',
    fontSize: 'var(--tds-typography-label-md-font-size)',
    fontWeight: 'var(--tds-typography-label-md-font-weight)',
    lineHeight: 'var(--tds-typography-label-md-line-height)',
  };
}

const rowHintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const rowControlStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

interface SettingRowProps {
  readonly label: string;
  /**
   * 라벨이 가리키는 컨트롤의 id. 주면 `<label htmlFor>` 로 렌더한다.
   * 토글·라디오·업로드처럼 라벨을 자기가 갖는 컨트롤에는 주지 않는다 — 이름이 두 번 읽힌다.
   */
  readonly htmlFor?: string;
  /** 라벨 밑 설명. 링크를 끼울 수 있어야 해서 문자열이 아니라 노드다 */
  readonly hint?: ReactNode;
  /** 설명 문단의 id — 컨트롤이 aria-describedby 로 잇는다 */
  readonly hintId?: string;
  /** 라벨 옆 도움말(HelpTip 등) */
  readonly help?: ReactNode;
  readonly disabled?: boolean;
  readonly children: ReactNode;
}

/** 한 행 — 왼쪽 라벨·설명 / 오른쪽 컨트롤 */
export function SettingRow({
  label,
  htmlFor,
  hint,
  hintId,
  help,
  disabled = false,
  children,
}: SettingRowProps) {
  return (
    <div style={rowStyle}>
      <div style={rowLabelBoxStyle}>
        <span style={rowLabelHeadStyle}>
          {htmlFor === undefined ? (
            <span style={rowLabelStyle(disabled)}>{label}</span>
          ) : (
            <label htmlFor={htmlFor} style={rowLabelStyle(disabled)}>
              {label}
            </label>
          )}
          {help}
        </span>
        {hint !== undefined && (
          <p {...(hintId === undefined ? {} : { id: hintId })} style={rowHintStyle}>
            {hint}
          </p>
        )}
      </div>

      <div style={rowControlStyle}>{children}</div>
    </div>
  );
}
