// SelectField — 드롭다운 컨트롤 (atom · contracts/SelectField.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/SelectField.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// raw <select> 의 무손실 드롭인 — 네이티브 화살표를 지우고(appearance:none) 토큰 여백을 둔 커스텀
// chevron 을 얹는다. 입력(TextField)과 표면을 공유한다.
//
// [네이티브 속성 패스스루 — Button/Card 선례]
//   계약 props(isInvalid·children) 외의 표준 <select> 속성(value · onChange · name · id · disabled ·
//   aria-* …)은 <select> 로 그대로 전달한다 (**native 를 마지막에 spread**). className/style 은 토큰
//   규칙 보호를 위해 차단한다. ref 는 forwardRef 로 노출한다 (RHF register spread 가 물릴 수 있게).
//   계약이 소유한 표면(children)은 native 슬라이스에서 제외한다.
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
import { forwardRef } from 'react';
import type { SelectHTMLAttributes } from 'react';

import type { SelectFieldProps } from '../../../generated/types/SelectField.types';
import './SelectField.css';

type SelectNativeProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  'style' | 'className' | 'children'
>;

/** 커스텀 chevron 글리프 — 아이콘 자산 패키지에 의존하지 않는 인라인 SVG (px 리터럴 0건, 장식) */
function ChevronGlyph() {
  return (
    <svg
      className="tds-select__chevron-glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps & SelectNativeProps>(
  function SelectField({ isInvalid = false, children, ...native }, ref) {
    const controlClass = isInvalid
      ? 'tds-select__control tds-select__control--invalid'
      : 'tds-select__control';

    return (
      <span className="tds-select">
        {/* native 가 마지막이다 — 호출부의 aria-* / value / onChange 를 그대로 흘려보낸다 */}
        <select ref={ref} className={controlClass} {...native}>
          {children}
        </select>
        <span className="tds-select__chevron" aria-hidden="true">
          <ChevronGlyph />
        </span>
      </span>
    );
  },
);
