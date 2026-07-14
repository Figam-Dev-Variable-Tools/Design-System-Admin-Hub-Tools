// AUTO-GENERATED from contracts/Button.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: atom · 상태: beta

import type { MouseEvent, ReactNode } from 'react';

/** `Button.variant` 허용 값 (계약이 유일한 원천) */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** `Button.size` 허용 값 (계약이 유일한 원천) */
export type ButtonSize = 'sm' | 'md' | 'lg';

/** 계약에 선언된 상호작용 상태 */
export type ButtonState = 'default' | 'hover' | 'active' | 'focus-visible' | 'disabled' | 'loading';

/**
 * 기본 액션 버튼. 이 계약에서 React Props 타입, Storybook argTypes, Figma Component Properties, Docs가 자동 생성된다 (tools/codegen). G3 승인 시 Frozen — 변경은 change_request → G3 재진입 + SemVer 재판정.

[네이티브 속성 패스스루 — 계약 prop 이 아니다] 계약 props 외의 표준 HTML/ARIA 속성(aria-label · aria-describedby · aria-busy · title …)은 구현이 <button> 으로 그대로 전달한다 (Card 선례: CardProps & Omit<HTMLAttributes,'style'|'children'|'className'>). 이 속성들은 시각 변형이 아니고 Figma Component Property 대응도 없으므로 계약 prop 으로 열거하지 않는다. 실사용: RolePanel(aria-describedby·title) · PointsCard(aria-label) · ConfirmDialog(aria-busy). className/style 은 토큰 규칙 보호를 위해 차단한다.
 */
export interface ButtonProps {
  /**
   * 시각 위계. 디자인 스펙(DS)의 variant 목록과 완전 일치해야 함. 기본값 primary 는 유지한다 — apps/admin 의 <Button> 호출부는 전수 감사 결과 100% variant 를 명시하고 있어(무지정 호출부 0건) 기본값 차이로 시각이 뒤집히는 호출부가 없다
   * @default "primary"
   */
  variant?: ButtonVariant;
  /**
   * 네이티브 button type. 허용 값은 button · submit · reset 이며 그 외 값은 구현이 button 으로 좁힌다. **기본값 button 은 HTML 기본값(submit) 을 의도적으로 뒤집은 DS 결정이다** — 폼 안의 보조 버튼이 실수로 제출하지 않게 한다. submit 을 주면 폼을 제출한다 (실사용: LoginForm · RoleFormModal · CreateGroupModal · PasswordChangeModal · PointsCard 의 폼 5개). [enum 이 아닌 이유] type 은 시각 변형이 아니라 HTML 시맨틱이라 Figma Component Property 대응이 없다. enum 으로 선언하면 스키마가 figmaProperty 를 강제해(G3) 시각차 0인 3값 Figma Variant 축이 생기고, contract-test 의 조합 커버리지 요구가 3배로 뛴다. 허용 값은 values 로 기술하되 Figma/Variant 축은 만들지 않는다 (스키마 확장 제안: CR-2026-0715-008)
   * @default "button"
   */
  type?: string;
  /**
   * @default "md"
   */
  size?: ButtonSize;
  /**
   * 로딩 중 스피너 표시 + onClick 차단 + aria-busy
   * @default false
   */
  loading?: boolean;
  /**
   * 비활성. onClick 차단 + aria-disabled
   * @default false
   */
  disabled?: boolean;
  /**
   * 컨테이너 100% 폭. 기본은 내용 폭(inline-flex). 실사용: 로그인 제출 CTA (LoginForm — 오너 확정 화면의 시각이다). [이름] boolean prop 은 is/has/can 접두 또는 상태 형용사 화이트리스트만 허용된다 (naming-guard boolean-prop 규칙 · ADR-0005) — CR 원안의 fullWidth 는 규칙 위반이라 isFullWidth 로 좁혔다. Figma 쪽 이름은 FullWidth 로 유지한다
   * @default false
   */
  isFullWidth?: boolean;
  /**
   * 좌측 아이콘 슬롯. loading 중에는 스피너로 대체되어 숨김
   * 허용 컴포넌트: Icon
   * 숨김 조건: loading
   * @default null
   */
  iconLeft?: ReactNode;
  /**
   * 버튼 레이블
   */
  children: ReactNode;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * disabled/loading 상태에서는 발화 금지 — Storybook Play Function이 전수 검증
   * 발화 차단 상태: disabled, loading (Storybook Play Function 이 전수 검증)
   */
  onClick?: (payload: MouseEvent) => void;
}
