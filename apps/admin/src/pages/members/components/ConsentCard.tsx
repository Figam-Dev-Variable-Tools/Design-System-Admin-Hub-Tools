// 동의 정보 카드
//
// [읽기 전용] 체크박스는 disabled — 관리자가 회원의 동의를 대신 바꿀 수 없다.
// 동의 여부는 체크 표시 + '회원 동의함: YYYY-MM-DD HH:mm' 텍스트로 이중 전달한다
// (색/체크 모양만으로 의미를 전달하지 않는다).
import { useId } from 'react';
import type { CSSProperties } from 'react';

import { Card, CardTitle, checkboxStyle, hintStyle, mutedTextStyle } from '../../../shared/ui';
import type { ConsentGroup } from '../types';
import { cssVar } from '@tds/ui';

const groupsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
  borderWidth: 0,
  borderStyle: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

const legendStyle: CSSProperties = {
  paddingLeft: 0,
  paddingRight: 0,
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-label-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const itemLabelStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const readOnlyCheckboxStyle: CSSProperties = {
  ...checkboxStyle,
  cursor: 'default',
};

interface ConsentCardProps {
  readonly consents: readonly ConsentGroup[];
}

function ConsentRow({
  label,
  agreed,
  agreedAt,
}: {
  readonly label: string;
  readonly agreed: boolean;
  readonly agreedAt: string | null;
}) {
  const id = useId();

  return (
    <div style={itemStyle}>
      <input
        id={id}
        type="checkbox"
        className="tds-mem-consent"
        style={readOnlyCheckboxStyle}
        checked={agreed}
        disabled
        readOnly
      />
      <label htmlFor={id} style={itemLabelStyle}>
        {label}
      </label>
      <span style={mutedTextStyle}>
        {agreed && agreedAt !== null ? `회원 동의함: ${agreedAt}` : '미동의'}
      </span>
    </div>
  );
}

export function ConsentCard({ consents }: ConsentCardProps) {
  // 동의 그룹이 0건이면 카드 본문이 빈 채로 남던 자리 — 빈 상태 문구로 채운다
  if (consents.length === 0) {
    return (
      <Card aria-labelledby="member-consent-title">
        <CardTitle id="member-consent-title">동의 정보</CardTitle>
        <p style={hintStyle}>동의 정보가 없습니다.</p>
      </Card>
    );
  }

  return (
    <Card aria-labelledby="member-consent-title">
      <CardTitle id="member-consent-title">동의 정보</CardTitle>

      <div style={groupsStyle}>
        {consents.map((group) => (
          <fieldset key={group.id} style={groupStyle}>
            <legend style={legendStyle}>{group.label}</legend>
            {group.items.map((item) => (
              <ConsentRow
                key={item.id}
                label={item.label}
                agreed={item.agreed}
                agreedAt={item.agreedAt}
              />
            ))}
          </fieldset>
        ))}
      </div>
    </Card>
  );
}
