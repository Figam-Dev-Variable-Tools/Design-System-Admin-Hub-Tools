// 치환변수 예시값 — 카카오 심사 제출에 함께 나가는 표
//
// [왜 이 표가 필요한가] 카카오는 템플릿을 심사할 때 **변수마다 예시값**을 요구한다. 심사자는
// `#{주문번호}` 만 보고는 그 자리에 주문번호가 들어올지 광고 문구가 들어올지 알 수 없기 때문이다.
// 예시값이 빠지면 반려된다 — 그래서 본문과 별개의 값으로 템플릿이 들고 있다(kakao.ts VariableSampleMap).
//
// [왜 미리보기의 치환값이 아닌가] 이 화면의 미리보기는 변수를 **치환하지 않는다**(VariableText 머리말).
// 여기 적는 값은 화면을 위한 것이 아니라 카카오에 제출하는 것이다. 두 용도를 겹치면 '미리보기를
// 예쁘게 만들려고' 적은 값이 그대로 심사에 나간다.
//
// [행은 글자가 정한다] 변수 목록을 따로 관리하지 않는다 — 사라진 변수의 예시값은 물어볼 이유가
// 없고, 새로 쓴 변수는 묻지 않으면 빠뜨린다. 작성한 글자가 정본이고 이 표는 그 파생이다.
//
// [무엇을 훑는가는 호출부가 정한다] 알림톡은 본문뿐 아니라 **강조 제목·보조문구도 심사에 함께
// 제출**되므로 그 셋을 이어 붙여 넘긴다(kakao.ts alimtalkVariableBearingText). 이 카드가 '본문' 만
// 안다고 가정하면 보조문구에 쓴 변수의 입력칸이 생기지 않고, 운영자는 빠뜨린 줄도 모른 채 반려된다.
import type { CSSProperties } from 'react';

import { controlStyle, FormField } from '../../../../shared/ui';
import { KAKAO_LABEL_VARIABLE_SAMPLES } from '../copy';
import { variableTokensOf } from '../kakao';
import type { VariableSampleMap } from '../kakao';
import { sectionHeadingStyle, sectionStyle } from '../styles';
import { cssVar } from '@tds/ui';

const emptyStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.body.md.line-height'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* 입력 표면은 공용 controlStyle 의 것이다 — 앱의 다른 입력과 같은 테두리·여백·잠금 배경을 쓴다 */

interface VariableSamplesCardProps {
  /** 예시값을 물어볼 변수를 여기서 뽑는다 — 심사에 나가는 글자 전부를 넘긴다(머리말) */
  readonly text: string;
  readonly samples: VariableSampleMap;
  readonly disabled: boolean;
  readonly onChange: (samples: VariableSampleMap) => void;
}

export function VariableSamplesCard({
  text,
  samples,
  disabled,
  onChange,
}: VariableSamplesCardProps) {
  const tokens = variableTokensOf(text);

  return (
    <section style={sectionStyle}>
      <h3 style={sectionHeadingStyle}>{KAKAO_LABEL_VARIABLE_SAMPLES}</h3>

      {tokens.length === 0 ? (
        <p style={emptyStyle}>본문에 치환변수가 없어요. 변수를 넣으면 여기에 예시값 칸이 생겨요.</p>
      ) : (
        <div style={listStyle}>
          {tokens.map((token) => {
            const fieldId = `kakao-variable-sample-${token}`;
            return (
              <FormField key={token} htmlFor={fieldId} label={token} required>
                <input
                  id={fieldId}
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(false, disabled)}
                  /* noUncheckedIndexedAccess — 없는 키는 undefined 다. 빈 문자열로 받아
                     제어 컴포넌트가 uncontrolled 로 떨어지지 않게 한다. */
                  value={samples[token] ?? ''}
                  disabled={disabled}
                  /* 문구를 채널에 매지 않는다 — 알림톡은 이 값을 심사에 제출하지만 브랜드
                     메시지에는 심사가 없다. 두 화면이 같은 카드를 쓰므로 자리표시자는 중립이다. */
                  placeholder="예시값 (예: 홍길동)"
                  onChange={(event) => onChange({ ...samples, [token]: event.target.value })}
                />
              </FormField>
            );
          })}
        </div>
      )}
    </section>
  );
}
