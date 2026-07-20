// FieldBox — 작은 라벨이 떠 있는 외곽선 상자
//
// [왜 FormField 가 아닌가] FormField(@tds/ui)는 라벨을 컨트롤 **위에** 두고 오류/힌트/카운터를
// 함께 그리는 폼 골격이다. 오른쪽 STYLE/INSPECT 패널의 상자는 그것과 생김새가 다르다 — 라벨이
// 테두리 위에 걸터앉고(floating), 상자 안에 스와치·슬라이더 같은 **폼 컨트롤이 아닌 것**이 들어간다.
// 둘을 한 컴포넌트로 합치면 FormField 의 계약(단일 폼 컨트롤 + aria 배선)이 흐려지므로 분리한다.
//
// [라벨과 컨트롤의 연결은 호출부가 한다] 이 상자는 시각 껍데기일 뿐 htmlFor 를 소유하지 않는다 —
// 안에 들어가는 것이 input 한 개일 수도, 버튼 세 개일 수도 있기 때문이다. 접근 가능한 이름은
// 각 컨트롤이 스스로 갖는다(aria-label 또는 <label htmlFor>).
import type { CSSProperties, ReactNode } from 'react';
import { cssVar } from '@tds/ui';

const boxStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
};

const invalidBoxStyle: CSSProperties = {
  ...boxStyle,
  borderWidth: cssVar('border-width.medium'),
  borderColor: cssVar('color.feedback.danger.border'),
};

/** 테두리 위에 걸터앉는 라벨 — 배경을 깔아 선을 끊는다 */
const floatingLabelStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: cssVar('space.2'),
  transform: 'translateY(-50%)',
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.muted'),
  fontFamily: 'var(--tds-typography-label-sm-font-family)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
  whiteSpace: 'nowrap',
};

const requiredMarkStyle: CSSProperties = {
  color: cssVar('color.feedback.danger.text'),
};

const helperStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.feedback.danger.text'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

interface FieldBoxProps {
  readonly label: string;
  readonly children: ReactNode;
  /** 라벨 옆 * — aria-hidden 장식이다(필수 여부는 컨트롤이 aria-required 로 스스로 알린다) */
  readonly required?: boolean;
  /** 붉은 테두리로 바꾼다. 메시지는 helper 가 그린다 */
  readonly invalid?: boolean;
  /** 상자 아래 붉은 안내 문구 (예: 'Max 800 px') */
  readonly helper?: string;
  /** helper <p> 의 id — 컨트롤이 aria-describedby 로 되짚는다 */
  readonly helperId?: string;
}

export function FieldBox({ label, children, required, invalid, helper, helperId }: FieldBoxProps) {
  return (
    <div>
      <div style={invalid === true ? invalidBoxStyle : boxStyle}>
        <span style={floatingLabelStyle}>
          {label}
          {required === true && (
            <span style={requiredMarkStyle} aria-hidden="true">
              {' *'}
            </span>
          )}
        </span>
        {children}
      </div>
      {helper !== undefined && helper !== '' && (
        <p style={helperStyle} {...(helperId === undefined ? {} : { id: helperId })} role="alert">
          {helper}
        </p>
      )}
    </div>
  );
}
