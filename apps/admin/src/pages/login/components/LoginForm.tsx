// LoginForm — 로그인 폼 조립
//
// 순수 프레젠테이션에 가깝게 유지한다: 상태·API 호출·유효성·타임아웃·리다이렉트는 전부 LoginPage 가
// 소유하고, 여기서는 값과 콜백만 받아 **@tds/ui 의 TextField/PasswordField/Checkbox/Alert/Button** 을
// 배치한다. (표시/숨김 토글 상태만 PasswordField 내부의 표현 관심사로 남는다.)
//
// [예전에는 이 5종이 ./components 에 사본으로 있었다] "@tds/ui 에는 아직 승인된 계약이 없다" 는
// 주석이 그 근거였고, 그 주석은 낡은 뒤에도 아무도 만료시키지 않아 사본을 영구화했다.
// 계약 15종은 존재하고 contract-test 15/15 가 통과한다 — 사본은 지웠다.
//
// ─────────────────────────────────────────────────────────────────────────────
// [DS 승격 판단 — 2026-07-20: 분류표 Authentication/login-form 은 비워 둔다]
//
// 이 파일은 Authentication 9행 중 유일한 실물이라 승격 후보로 지목됐다. 검토 결과
// **DS 가 이미 필요한 것을 전부 주고 있고 남는 것은 조립뿐**이라고 판정했다. 근거 셋:
//
//   1. 이 파일에서 @tds/ui 를 걷어내면 남는 것은 flex column 하나, 한국어 라벨 4개
//      ('이메일'·'비밀번호'·'이메일 저장'·'로그인'), 필드 id 4개, 그리고 배치 순서뿐이다.
//      TextField·PasswordField·Alert·Checkbox·Button 다섯 계약이 이미 전부 존재한다.
//      이걸 올리면 DS 가 **제품 카피와 '로그인 = 이메일+비밀번호+기억하기' 라는 제품 결정**을
//      소유하게 된다 — FilterPanel 승격이 막힌 이유('건수를 불러오지 못했습니다.' 리터럴)와
//      정확히 같은 문제다.
//   2. 지목 사유였던 "이 폼이 인증 엔드포인트·세션·returnUrl 을 안다" 는 **사실이 아니다.**
//      실측: 이 파일에는 fetch 도 세션도 returnUrl 도 없다. 전부 LoginPage 가 소유한다
//      (./api.ts · ./session.ts · resolveReturnUrl · ALERT_MESSAGES). 이 컴포넌트는 값과
//      콜백만 받는 순수 프레젠테이션이고, 그 경계는 이 파일 머리말이 이미 선언하고 있다.
//   3. 성격이 컴포넌트가 아니라 **페이지 템플릿**이다. templates 계층은 현재 실체 0이고
//      그 설계는 아직 열려 있다 — 지금 molecules/organisms 에 밀어 넣으면 오분류가 된다.
//
// 선례: 같은 사이클에서 loading · toolbar · navbar · logos 네 행이 같은 판단으로 비었다.
// 되돌리려면: 두 번째 제품이 같은 폼을 요구할 때 **템플릿 계층에서** 다시 검토한다.
// ─────────────────────────────────────────────────────────────────────────────
import type { ChangeEvent, CSSProperties, FocusEvent, FormEvent, RefObject } from 'react';
import { Alert, Button, Checkbox, cssVar, PasswordField, TextField } from '@tds/ui';
import type { AlertTone } from '@tds/ui';

export interface AlertState {
  readonly tone: AlertTone;
  readonly message: string;
}

interface FieldErrors {
  readonly email: string | null;
  readonly password: string | null;
}

interface LoginFormProps {
  readonly email: string;
  readonly password: string;
  readonly onEmailChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onPasswordChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly onEmailBlur: (event: FocusEvent<HTMLInputElement>) => void;
  readonly onPasswordBlur: (event: FocusEvent<HTMLInputElement>) => void;
  readonly rememberEmail: boolean;
  readonly onRememberChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly fieldErrors: FieldErrors;
  /** 공통 안내/에러 — null이면 렌더하지 않는다 */
  readonly alert: AlertState | null;
  readonly alertRef: RefObject<HTMLDivElement>;
  readonly emailInputRef: RefObject<HTMLInputElement>;
  readonly passwordInputRef: RefObject<HTMLInputElement>;
  /**
   * **전송(인증 요청) 진행 중** — 입력/토글 비활성 + 스피너 (FS-001-EL-018).
   *
   * '검증 중'이 아니라 '전송 중'이다. 검증 단계에서 입력을 잠그면 유효성 위반 시
   * 첫 위반 필드로 포커스를 옮길 수 없다(disabled 요소는 focus() 를 무시한다).
   * 두 상태의 분리는 LoginPage 가 소유한다.
   */
  readonly isSending: boolean;
  /** 제출 버튼 비활성 조건(전송 중 또는 계정 잠금) */
  readonly isSubmitDisabled: boolean;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const EMAIL_FIELD_ID = 'login-email';
const PASSWORD_FIELD_ID = 'login-password';
const REMEMBER_FIELD_ID = 'login-remember';
const ALERT_ID = 'login-alert';

/**
 * 계약의 error 센티널은 **빈 문자열 = 오류 없음** 이다 (로컬 사본은 null 을 썼다).
 * 폼 상태의 `string | null` 을 여기서 한 번만 흡수한다.
 */
function errorText(message: string | null): string {
  return message ?? '';
}

export function LoginForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onEmailBlur,
  onPasswordBlur,
  rememberEmail,
  onRememberChange,
  fieldErrors,
  alert,
  alertRef,
  emailInputRef,
  passwordInputRef,
  isSending,
  isSubmitDisabled,
  onSubmit,
}: LoginFormProps) {
  return (
    <form style={formStyle} onSubmit={onSubmit} noValidate aria-busy={isSending}>
      {/* 이메일 */}
      <TextField
        ref={emailInputRef}
        id={EMAIL_FIELD_ID}
        label="이메일"
        type="email"
        name="email"
        value={email}
        autoComplete="username"
        inputMode="email"
        required
        disabled={isSending}
        error={errorText(fieldErrors.email)}
        onChange={onEmailChange}
        onBlur={onEmailBlur}
      />

      {/* 비밀번호 (+ 표시/숨김 토글 — §5.3-4) */}
      <PasswordField
        ref={passwordInputRef}
        id={PASSWORD_FIELD_ID}
        label="비밀번호"
        name="password"
        value={password}
        autoComplete="current-password"
        required
        disabled={isSending}
        error={errorText(fieldErrors.password)}
        onChange={onPasswordChange}
        onBlur={onPasswordBlur}
      />

      {/* 공통 안내/에러 — 체크박스 바로 위. danger 는 빨강(feedback 토큰) + 경고 아이콘 */}
      {alert !== null && (
        <Alert ref={alertRef} id={ALERT_ID} tone={alert.tone}>
          {alert.message}
        </Alert>
      )}

      {/* 이메일 저장 — 이메일 값만 보관, 비밀번호 저장 금지 (§5.3-2) */}
      <Checkbox
        id={REMEMBER_FIELD_ID}
        name="rememberEmail"
        label="이메일 저장"
        checked={rememberEmail}
        disabled={isSending}
        onChange={onRememberChange}
      />

      {/*
        제출 — 전송 중 재클릭/Enter 차단 (§3 등록-로딩), 잠금 시 비활성 (§3 등록-에러 (b)).

        [aria-busy 를 왜 명시하는가] @tds/ui Button 은 loading=false 일 때 aria-busy 속성을
        **생략**한다. 이 화면의 계약(FS-001-EL-016.1)은 로딩이 끝났을 때 aria-busy="false" 가
        **관측 가능해야** 한다고 정한다 — 스피너가 걷혔음을 보조기술이 알 수 있어야 한다.
        Button 은 native 속성을 마지막에 spread 하므로, 여기서 준 값이 파생값을 덮는다.
      */}
      <Button
        type="submit"
        variant="primary"
        isFullWidth
        loading={isSending}
        disabled={isSubmitDisabled}
        aria-busy={isSending}
      >
        {isSending ? '로그인 중' : '로그인'}
      </Button>
    </form>
  );
}
