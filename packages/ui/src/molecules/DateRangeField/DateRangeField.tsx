// DateRangeField — 시작~종료 날짜 쌍 입력 (molecule · contracts/DateRangeField.contract.json@1.1.0)
//
// Props 타입은 계약에서 생성된 generated/types/DateRangeField.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 팝업·배너·이벤트·프로모션·쿠폰·계약 등의 '노출 시작~종료' — 두 date 입력을 '~' 로 잇는다.
//
// [검증은 스키마가] 종료≥시작 규칙은 이 컴포넌트가 판정하지 않는다 — 호출부 zod 스키마가 error 로 내려준다.
//   이 컴포넌트는 error 를 role=alert 로 주입해 그리고 두 입력에 aria-invalid 를 줄 뿐이다.
//
// [field-association 계약 — A11Y-11] aria-invalid 는 **항상** aria-describedby 로 에러 <p> id 와
//   짝을 이룬다 (describedby 없는 aria-invalid 는 '왜' 무효인지 못 알린다). 유효할 때는 두 속성
//   모두 부여하지 않는다 (aria-invalid="false" 를 남기지 않는다 — TextField/SelectField 미러).
//
// [라벨] 그룹 라벨(<span>)은 한 번, 각 칸엔 visually-hidden <label>(htmlFor)로 '시작일'·'종료일'을 구분한다.
//
// [exactOptionalPropertyTypes] 호출부는 error/hint 에 string|undefined 를 그대로 넘긴다 —
//   계약 타입을 경계에서 넓혀 받고 정규화한다 (호출부 9곳 무변경).
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건.
import { useId } from 'react';

import type { DateRangeFieldProps } from '../../../generated/types/DateRangeField.types';
import './DateRangeField.css';

/** exactOptionalPropertyTypes — 옵셔널 문자열 prop 을 경계에서 undefined 허용으로 넓힌다 */
type DateRangeFieldComponentProps = Omit<DateRangeFieldProps, 'error' | 'hint'> & {
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
};

export function DateRangeField({
  label,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  required = false,
  disabled = false,
  error,
  hint,
}: DateRangeFieldComponentProps) {
  const startId = useId();
  const endId = useId();
  const errorId = useId();
  const invalid = error !== undefined && error !== '';
  // aria-invalid 는 반드시 describedby 와 함께 나간다 (A11Y-11)
  const invalidProps = invalid ? { 'aria-invalid': true, 'aria-describedby': errorId } : {};
  // 마커(*)는 aria-hidden 장식이라 AT 에 필수 여부가 닿지 않는다 — 두 칸 모두에 잇는다 (A11Y-11).
  // 범위는 시작·종료가 함께 있어야 성립하므로 required 는 두 입력 각각에 참이다.
  const requiredProps = required ? { required: true, 'aria-required': true } : {};
  const controlClass = invalid
    ? 'tds-daterange__control tds-daterange__control--invalid'
    : 'tds-daterange__control';

  return (
    <div className="tds-daterange">
      <span className="tds-daterange__label">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </span>

      <div className="tds-daterange__row">
        <label htmlFor={startId} className="tds-daterange__hidden-label">
          {`${label} 시작일`}
        </label>
        <input
          id={startId}
          type="date"
          className={controlClass}
          value={startValue}
          disabled={disabled}
          {...requiredProps}
          {...invalidProps}
          onChange={(event) => onStartChange?.(event.target.value)}
        />

        <span className="tds-daterange__tilde" aria-hidden="true">
          ~
        </span>

        <label htmlFor={endId} className="tds-daterange__hidden-label">
          {`${label} 종료일`}
        </label>
        <input
          id={endId}
          type="date"
          className={controlClass}
          value={endValue}
          disabled={disabled}
          {...requiredProps}
          {...invalidProps}
          onChange={(event) => onEndChange?.(event.target.value)}
        />
      </div>

      {invalid ? (
        <p id={errorId} role="alert" className="tds-daterange__error">
          {error}
        </p>
      ) : (
        hint !== undefined && <p className="tds-daterange__hint">{hint}</p>
      )}
    </div>
  );
}
