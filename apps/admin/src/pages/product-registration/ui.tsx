// 상품 등록 화면 로컬 UI 프리미티브 (SCR-003 §4 필요 컴포넌트)
//
// [의도적 로컬 구현 — MP-001 §2-D 판정] 이 프리미티브들은 @tds/ui 로 올리지 않는다:
// Field/FormSection/EmptyState 는 이 화면 하나만 쓰고(소비자 1), 이 파일의 Alert/Button/Badge 도
// DS 판본과 모양이 다르다(라벨 접두 배너 · text variant · 대표 이미지 표식). 과잉 추상화를 피한다.
// (승격 대상이었던 Card·Tabs·DataTable 등은 이미 @tds/ui 소비로 교체됐다 — CR-2026-0715-006.)
//
// 스타일 값은 전부 styles.ts의 토큰(var(--tds-*)) 기반 CSSProperties다 — 하드코딩 색상/px 0건.
import type { CSSProperties, ReactNode } from 'react';
import type { AlertTone } from './types';
import {
  alertActionsStyle,
  alertLabelStyle,
  alertMessageStyle,
  alertStyle,
  badgeStyle,
  buttonStyle,
  counterStyle,
  emptyStateStyle,
  errorTextStyle,
  fieldStyle,
  fieldsetStyle,
  hintStyle,
  labelRowStyle,
  labelStyle,
  legendStyle,
  requiredMarkStyle,
  sectionDescriptionStyle,
  visuallyHiddenStyle,
  type ButtonVariant,
} from './styles';

/** 로딩 스피너 — 장식 요소이므로 접근성 트리에서 숨긴다(버튼이 aria-busy를 노출) */
function Spinner() {
  return <span className="tds-pr-spinner" aria-hidden="true" />;
}

interface ButtonProps {
  children: ReactNode;
  variant: ButtonVariant;
  onClick: () => void;
  type?: 'button' | 'submit' | undefined;
  disabled?: boolean | undefined;
  loading?: boolean | undefined;
  ariaLabel?: string | undefined;
  ariaDescribedBy?: string | undefined;
}

/**
 * Button — SCR-003 §4의 유일한 '기존' 컴포넌트(contracts/Button.contract.json@1.0.0).
 * @tds/ui 모듈이 G5를 통과하면 이 로컬 구현을 public entry import로 교체한다.
 */
export function Button({
  children,
  variant,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  ariaLabel,
  ariaDescribedBy,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      className="tds-pr-focusable"
      style={buttonStyle(variant, isDisabled)}
      onClick={onClick}
      disabled={isDisabled}
      aria-busy={loading}
      {...(ariaLabel === undefined ? {} : { 'aria-label': ariaLabel })}
      {...(ariaDescribedBy === undefined ? {} : { 'aria-describedby': ariaDescribedBy })}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

/** Alert tone별 접두 라벨 — 토큰에 feedback 색상이 없어 색 대신 라벨/role로 심각도를 전달한다 */
const ALERT_LABEL: Record<AlertTone, string> = {
  info: '안내',
  success: '완료',
  danger: '오류',
};

interface AlertProps {
  tone: AlertTone;
  message: string;
  /** [다시 시도] · [이어서 작성] 등 Alert 내 액션 */
  actions?: ReactNode | undefined;
  id?: string | undefined;
}

/**
 * Alert — 복원 안내 · 서버 오류 · 성공 안내 (§3 등록-에러 (c)/(d), §3.2).
 * danger/info는 즉시 통지가 필요하므로 role="alert", success는 role="status"로 낮춘다.
 */
export function Alert({ tone, message, actions, id }: AlertProps) {
  return (
    <div
      {...(id === undefined ? {} : { id })}
      role={tone === 'success' ? 'status' : 'alert'}
      style={alertStyle}
    >
      <p style={alertMessageStyle}>
        <span style={alertLabelStyle}>{ALERT_LABEL[tone]}</span>
        <span>{message}</span>
      </p>
      {actions === undefined ? null : <div style={alertActionsStyle}>{actions}</div>}
    </div>
  );
}

interface FormSectionProps {
  /** legend id — 섹션 제목 */
  titleId: string;
  title: string;
  description?: string | undefined;
  children: ReactNode;
}

/** FormSection — fieldset/legend로 폼 구획을 그룹화한다(a11y: 그룹 이름이 legend로 노출된다) */
export function FormSection({ titleId, title, description, children }: FormSectionProps) {
  return (
    <fieldset style={fieldsetStyle}>
      <legend id={titleId} style={legendStyle}>
        {title}
      </legend>
      {description === undefined ? null : <p style={sectionDescriptionStyle}>{description}</p>}
      {children}
    </fieldset>
  );
}

interface FieldProps {
  /** 컨트롤의 id — 에러/힌트 id는 `${id}-error`, `${id}-hint`로 파생한다 */
  id: string;
  label: string;
  required?: boolean | undefined;
  error?: string | undefined;
  hint?: string | undefined;
  /** 글자 수 카운터 등 라벨 우측 보조 표시 */
  counter?: string | undefined;
  children: ReactNode;
  /** label 대신 group 라벨을 쓰는 경우(이미지 업로드) label 요소를 렌더링하지 않는다 */
  asGroup?: boolean | undefined;
}

/** 필드 셸 — 라벨 · 컨트롤 · 인라인 에러(aria-describedby 대상) · 힌트를 배치한다 */
export function Field({
  id,
  label,
  required = false,
  error,
  hint,
  counter,
  children,
  asGroup = false,
}: FieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div style={fieldStyle}>
      <div style={labelRowStyle}>
        {asGroup ? (
          <span id={`${id}-label`} style={labelStyle}>
            {label}
            {required ? (
              <span style={requiredMarkStyle} aria-hidden="true">
                *
              </span>
            ) : null}
            {required ? <span style={visuallyHiddenStyle}>(필수)</span> : null}
          </span>
        ) : (
          <label htmlFor={id} style={labelStyle}>
            {label}
            {required ? (
              <span style={requiredMarkStyle} aria-hidden="true">
                *
              </span>
            ) : null}
            {required ? <span style={visuallyHiddenStyle}>(필수)</span> : null}
          </label>
        )}
        {counter === undefined ? null : (
          <span style={counterStyle} aria-hidden="true">
            {counter}
          </span>
        )}
      </div>
      {children}
      {hint === undefined ? null : (
        <p id={hintId} style={hintStyle}>
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} style={errorTextStyle} role="alert">
          오류: {error}
        </p>
      )}
    </div>
  );
}

/** aria-describedby 값 조합 — 없으면 undefined(속성 미출력) */
export function describedBy(...ids: (string | undefined)[]): string | undefined {
  const joined = ids.filter((id): id is string => id !== undefined).join(' ');
  return joined.length === 0 ? undefined : joined;
}

interface BadgeProps {
  children: ReactNode;
  style?: CSSProperties | undefined;
}

/** Badge — 대표 이미지 표시(§5.3 규칙 6) */
export function Badge({ children, style }: BadgeProps) {
  return (
    <span style={style === undefined ? badgeStyle : { ...badgeStyle, ...style }}>{children}</span>
  );
}

interface EmptyStateProps {
  title: string;
  description?: string | undefined;
}

/** EmptyState — 권한없음 안내(§3 등록-권한없음) */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div style={emptyStateStyle} role="status">
      <strong>{title}</strong>
      {description === undefined ? null : <p style={hintStyle}>{description}</p>}
    </div>
  );
}
