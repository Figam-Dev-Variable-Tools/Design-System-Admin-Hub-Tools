// LoginPage — 로그인 화면 (라우트: /login) · A40 소유 — apps/admin/src/pages/login/**
//
// 대응 Screen Spec: docs/plan/ui/SCR-001-login.md (§3 CRUD 상태 · §5 비즈니스 규칙 전수 반영)
//
// [컴포넌트 조립 정책]
// TextField/PasswordField/Checkbox/Alert/Button 은 **@tds/ui 가 소유한다** (LoginForm 이 조립한다).
// 상태 · API 호출 · 유효성 · 타임아웃 · 리다이렉트는 전부 이 페이지가 소유한다 — 그 경계는 그대로다.
//
// [스타일 규칙 — G6 체크리스트]
// - 모든 시각 값은 토큰 CSS 변수(var(--tds-*))만 사용 — 하드코딩 색상 hex / px 리터럴 0건.
// - 토큰에 없는 파생 치수(카드 폭 등)는 space 토큰의 calc 배수로만 표현한다.
// - :focus-visible / :hover / @keyframes 등 인라인 style로 표현 불가한 상태는 ./login.css에 둔다.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useController, useForm } from 'react-hook-form';
import type { FieldErrors } from 'react-hook-form';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import './login.css';
import { zodResolver } from '../../shared/form/zodResolver';
import { LoginForm } from './components/LoginForm';
import type { AlertState } from './components/LoginForm';
import { LOGIN_TIMEOUT_MS, login, normalizeEmail } from './api';
import type { LoginResult } from './api';
import {
  clearRememberedEmail,
  readRememberedEmail,
  readSession,
  writeRememberedEmail,
  writeSession,
} from './session';
// maxLength 속성으로 입력을 잘라내지 않는다 — 길이 초과도 §5.2 에러 문안으로 안내해야 하므로
// 길이 제약은 zod 스키마의 검증으로만 강제한다 (validation.ts 가 규칙의 정본이다).
import { loginSchema } from './validation';
import type { LoginFormValues } from './validation';

/** 인증 성공 시 기본 이동처 (SCR-002 대시보드) */
const DEFAULT_REDIRECT = '/dashboard';

/** 리다이렉트 진입 시 원래 목적지를 보존하는 쿼리 파라미터 (§5.3-3) */
const RETURN_URL_PARAM = 'returnUrl';
/** 세션 만료 리다이렉트 진입 표식 (§5.3-7) */
const REASON_PARAM = 'reason';
const SESSION_EXPIRED_REASON = 'session_expired';

/** SCR-001 §3 등록-에러 · §5.3-7 안내 문안 — SCR 원문 그대로 사용한다(임의 변형 금지) */
const ALERT_MESSAGES = {
  accountLocked:
    '비밀번호 5회 오류로 계정이 잠겼습니다. 30분 후 다시 시도하거나 시스템 관리자에게 문의하세요.',
  accountInactive: '사용이 중지된 계정입니다. 시스템 관리자에게 문의하세요.',
  networkOrServer: '일시적인 오류로 로그인하지 못했습니다. 다시 시도해 주세요.',
  sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
} as const;

/** §3 등록-에러 (a) 자격 증명 불일치 — 실패 카운트를 포함한 SCR 원문 */
function invalidCredentialsMessage(failedCount: number, maxAttempts: number): string {
  return `이메일 또는 비밀번호가 일치하지 않습니다. (실패 ${failedCount}/${maxAttempts}회)`;
}

/**
 * returnUrl 검증 (§5.3-3 — 오픈 리다이렉트 차단).
 * 같은 오리진의 절대 경로만 허용한다. 외부 도메인/프로토콜 상대 경로는 무시하고 대시보드로 보낸다.
 */
function resolveReturnUrl(raw: string | null): string {
  if (raw === null || raw === '') return DEFAULT_REDIRECT;
  if (!raw.startsWith('/')) return DEFAULT_REDIRECT;
  // '//evil.com', '/\evil.com' 형태의 프로토콜 상대/스킴 우회 차단
  if (raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_REDIRECT;
  return raw;
}

/* ── 레이아웃 스타일 (토큰 변수만 사용) ───────────────────────────────────
 * 폼 내부 요소의 스타일은 각 컴포넌트(./components)가 소유한다 — 여기에는 페이지 레이아웃만 둔다. */

// 좌우 5:5 분할 — 왼쪽 비주얼 패널 / 오른쪽 폼 패널.
// 좁은 화면(md 미만)에서는 왼쪽 패널을 감추고 폼만 노출한다 (login.css 미디어 쿼리).
const pageStyle: CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-body-md-font-family)',
  fontSize: 'var(--tds-typography-body-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

// 왼쪽 — 비주얼/브랜드 패널.
// 이미지 에셋은 A16(Illustration Designer) 산출물이 들어올 자리다. 지금은 토큰 색만으로
// 그라디언트를 깔아 자리를 잡아두고, 에셋이 생기면 backgroundImage 만 교체하면 된다.
const visualPanelStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: 'calc(var(--tds-space-6) * 2)',
  overflow: 'hidden',
  background:
    'linear-gradient(135deg, var(--tds-color-action-primary-active), var(--tds-color-action-primary-default))',
  color: 'var(--tds-color-text-on-primary)',
};

const visualHeadlineStyle: CSSProperties = {
  margin: 0,
  fontSize: 'var(--tds-primitive-typography-font-size-18)',
  lineHeight: 'var(--tds-primitive-typography-line-height-tight)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

const visualBodyStyle: CSSProperties = {
  margin: 0,
  marginTop: 'var(--tds-space-3)',
  maxWidth: 'calc(var(--tds-space-6) * 14)',
  opacity: 0.9,
};

const visualBrandStyle: CSSProperties = {
  margin: 0,
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  letterSpacing: '0.08em',
};

// 오른쪽 — 흰 배경 폼 패널
const formPanelStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  padding: 'var(--tds-space-6)',
  background: 'var(--tds-color-surface-default)',
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
  width: '100%',
  // 폼 폭 = space.6 배수 (토큰 파생 치수 — raw px 금지). 24 * 20 = 480px
  maxWidth: 'calc(var(--tds-space-6) * 20)',
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 'var(--tds-primitive-typography-font-size-18)',
  lineHeight: 'var(--tds-primitive-typography-line-height-tight)',
};

const subtitleStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const hintStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

/* ── 화면 ──────────────────────────────────────────────────────────────── */

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 진입 시점의 세션 — 이미 인증된 사용자는 폼 노출 없이 대시보드로 즉시 리다이렉트 (§5.1)
  const [initialSession] = useState(() => readSession());
  const [rememberedEmail] = useState(() => readRememberedEmail());

  /**
   * 폼 상태·검증은 react-hook-form + zod 가 소유한다 (ADR-0008 §7.2 · §7.3).
   *
   * `mode: 'onBlur'` = 필드 blur 시 그 필드만 검증 (SCR-001 §5.2 검증 시점 규칙 1).
   * `reValidateMode: 'onBlur'` = 제출 후에도 재검증 시점은 blur 다 — 타이핑 중에 문구가
   *   다시 튀어나오지 않게 한다. 타이핑 중 인라인 에러를 **걷어내는** 것은 아래 clearErrors 다 (§5.2).
   * `shouldFocusError: false` = 포커스 이동은 우리가 한다 — TextField 는 controlled 라
   *   RHF 가 input ref 를 갖고 있지 않다. onInvalid 에서 첫 위반 필드로 직접 보낸다 (§5.2).
   *
   * TextField/PasswordField/Checkbox 는 **controlled 계약을 그대로 유지한다** —
   * useController 는 필드 단위로 구독하므로 한 필드 입력이 폼 전체를 리렌더하지 않는다.
   */
  const {
    control,
    handleSubmit,
    formState: { errors },
    clearErrors,
    setValue,
    watch,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    reValidateMode: 'onBlur',
    shouldFocusError: false,
    // '이메일 저장' 기본값: 직전 로그인에서 저장된 이메일이 있으면 체크 (§5.2)
    defaultValues: {
      email: rememberedEmail ?? '',
      password: '',
      rememberEmail: rememberedEmail !== null,
    },
  });

  const emailField = useController({ control, name: 'email' }).field;
  const passwordField = useController({ control, name: 'password' }).field;
  const rememberField = useController({ control, name: 'rememberEmail' }).field;

  const email = watch('email');

  /**
   * **전송(인증 요청) 진행 중** — 폼 잠금의 단 하나의 근거다 (FS-001-EL-018).
   *
   * react-hook-form 의 `isSubmitting` 을 쓰지 않는다. 그 값은 **검증 단계에서도 true** 라
   * 두 개의 다른 상태('검증 중' · '전송 중')를 한 플래그로 뭉갠다. 그 결과:
   *   ① 눌린 제출 버튼이 검증 중에 disabled 되며 포커스를 잃고(→ body),
   *   ② onInvalid 가 첫 위반 필드에 focus() 를 부르는 시점에 그 입력이 **아직 disabled** 라
   *      focus() 가 조용히 무시됐다 — 키보드·스크린리더 사용자가 어디가 틀렸는지 알 수 없었다.
   *
   * 잠가야 하는 것은 **전송 중**뿐이다. 그래서 이 플래그는 검증을 통과해 실제로 요청을 보내는
   * onValid 안에서만 켜지고, 응답·타임아웃·예외 중 어느 경로로 끝나든 finally 에서 꺼진다.
   * (검증 중에는 입력이 enabled 인 채로 남으므로 focus() 가 정상 동작한다 — setTimeout 지연 없이.)
   */
  const [isSending, setIsSending] = useState(false);

  /** 잠긴 계정의 이메일 — 해당 이메일로는 제출 버튼을 비활성화한다 (§3 등록-에러 (b)) */
  const [lockedEmail, setLockedEmail] = useState<string | null>(null);
  const [alert, setAlert] = useState<AlertState | null>(() =>
    searchParams.get(REASON_PARAM) === SESSION_EXPIRED_REASON
      ? { tone: 'info', message: ALERT_MESSAGES.sessionExpired }
      : null,
  );

  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  // @tds/ui Alert 의 루트는 <div> 다 (<p> 가 아니다 — 블록 자식을 받아야 하므로)
  const alertRef = useRef<HTMLDivElement>(null);
  /** 중복 제출 차단 — state 반영을 기다리지 않는 동기 가드 (§3 등록-로딩: 중복 요청 0건) */
  const submitLockRef = useRef(false);

  const isLocked = lockedEmail !== null && lockedEmail === normalizeEmail(email);
  const isSubmitDisabled = isSending || isLocked;

  // 에러 Alert 발생 시 Alert로 포커스 이동 (a11y — 스크린리더/키보드 사용자에게 즉시 전달)
  useEffect(() => {
    if (alert !== null && alert.tone === 'danger') {
      alertRef.current?.focus();
    }
  }, [alert]);

  // 입력 중에는 인라인 에러를 걷어낸다 — 재검증은 blur/제출 시점 (§5.2)
  const handleEmailChange = useCallback(
    (event: unknown) => {
      emailField.onChange(event);
      clearErrors('email');
    },
    [clearErrors, emailField],
  );

  const handlePasswordChange = useCallback(
    (event: unknown) => {
      passwordField.onChange(event);
      clearErrors('password');
    },
    [clearErrors, passwordField],
  );

  /** 인증 실패 응답 → §3 등록-에러 (a)~(d) 처리 */
  const applyFailure = useCallback(
    (result: Extract<LoginResult, { ok: false }>, submittedEmail: string) => {
      switch (result.kind) {
        case 'invalid_credentials':
          // (a) 자격 증명 불일치 — Alert + 비밀번호 필드만 초기화
          setValue('password', '');
          setAlert({
            tone: 'danger',
            message: invalidCredentialsMessage(result.failedCount, result.maxAttempts),
          });
          break;
        case 'account_locked':
          // (b) 계정 잠금 — 제출 버튼 비활성
          setLockedEmail(submittedEmail);
          setAlert({ tone: 'danger', message: ALERT_MESSAGES.accountLocked });
          break;
        case 'account_inactive':
          // (c) 계정 비활성
          setAlert({ tone: 'danger', message: ALERT_MESSAGES.accountInactive });
          break;
        case 'server_error':
          // (d) 서버 오류 — 입력값 전부 유지
          setAlert({ tone: 'danger', message: ALERT_MESSAGES.networkOrServer });
          break;
      }
    },
    [setValue],
  );

  /** 검증 통과 — 서버로 보낸다. 검증은 zod 스키마가 이미 끝냈다 (§5.2) */
  const onValid = useCallback(
    async (values: LoginFormValues) => {
      // 중복 제출 차단: 클릭·Enter 모두 응답 수신 전에는 요청을 만들지 않는다 (§3 등록-로딩 · §5.3-5)
      if (submitLockRef.current) return;
      // 잠금 상태에서는 제출 자체를 막는다 (§3 등록-에러 (b))
      if (lockedEmail !== null && lockedEmail === normalizeEmail(values.email)) return;

      submitLockRef.current = true;
      // 여기서부터가 '전송 중' 이다 — 입력·토글·체크박스·버튼이 잠긴다 (FS-001-EL-018)
      setIsSending(true);
      setAlert(null);

      const submittedEmail = normalizeEmail(values.email);
      const controller = new AbortController();
      // 제출 타임아웃 10초 — 초과 시 요청 중단 후 §3 에러 (d) (§5.3-6)
      const timeoutId = globalThis.setTimeout(() => controller.abort(), LOGIN_TIMEOUT_MS);

      try {
        const result = await login(
          { email: submittedEmail, password: values.password },
          controller.signal,
        );

        if (result.ok) {
          writeSession(result.session);
          // '이메일 저장' — 이메일 값만 보관/삭제. 비밀번호는 저장하지 않는다 (§5.3-2)
          if (values.rememberEmail) writeRememberedEmail(result.session.email);
          else clearRememberedEmail();

          // returnUrl 보존 시 그 경로, 없으면 대시보드 (§5.3-3)
          navigate(resolveReturnUrl(searchParams.get(RETURN_URL_PARAM)), { replace: true });
          return;
        }

        applyFailure(result, submittedEmail);
      } catch {
        // 타임아웃(LoginAbortError) · 네트워크 오류 → §3 에러 (d), 입력값 전부 유지
        setAlert({ tone: 'danger', message: ALERT_MESSAGES.networkOrServer });
      } finally {
        // 응답 수신·타임아웃·예외 — 어느 경로로 끝나도 잠금과 로딩 표시를 함께 해제한다 (FS-001-EL-018)
        globalThis.clearTimeout(timeoutId);
        submitLockRef.current = false;
        setIsSending(false);
      }
    },
    [applyFailure, lockedEmail, navigate, searchParams],
  );

  /**
   * 검증 실패 — 서버 요청 없이 **첫 위반 필드로 포커스** (FS-001-EL-016 · §5.2 검증 시점 규칙).
   * 필드 순서는 email → password 다 (SCR-001 §5.2 표 순서).
   * RHF 의 shouldFocusError 를 끄고 여기서 직접 보낸다 — controlled 필드라 RHF 에 input ref 가 없다.
   *
   * 이 경로에서는 `isSending` 이 false 다(전송을 시작하지 않았으므로) — 입력이 enabled 이므로
   * focus() 가 실제로 먹는다. disabled 요소에 focus() 를 부르면 브라우저가 조용히 무시한다.
   */
  const onInvalid = useCallback((invalid: FieldErrors<LoginFormValues>) => {
    if (invalid.email !== undefined) emailInputRef.current?.focus();
    else passwordInputRef.current?.focus();
  }, []);

  // 이미 인증된 사용자 — 폼 노출 없이 대시보드로 즉시 리다이렉트 (§5.1)
  // (모든 훅 호출 이후에 반환한다 — 훅 순서 불변)
  if (initialSession !== null) {
    return <Navigate to={DEFAULT_REDIRECT} replace />;
  }

  return (
    <main style={pageStyle} className="tds-login-page">
      {/* 왼쪽 — 비주얼 패널. 장식이므로 스크린리더에서 제외한다 */}
      <aside style={visualPanelStyle} className="tds-login-visual" aria-hidden="true">
        <p style={visualBrandStyle}>TDS ADMIN HUB</p>
        <div>
          <p style={visualHeadlineStyle}>디자인 시스템으로 움직이는 어드민</p>
          <p style={visualBodyStyle}>
            토큰 · 계약 · Storybook · Figma가 하나의 원천에서 동기화됩니다.
          </p>
        </div>
      </aside>

      {/* 오른쪽 — 흰 배경 폼 패널 */}
      <section style={formPanelStyle}>
        <div style={cardStyle} aria-labelledby="login-title">
          <header>
            <h1 id="login-title" style={titleStyle}>
              로그인
            </h1>
            <p style={subtitleStyle}>어드민 허브 계정으로 로그인하세요.</p>
          </header>

          <LoginForm
            email={emailField.value}
            password={passwordField.value}
            onEmailChange={handleEmailChange}
            onPasswordChange={handlePasswordChange}
            onEmailBlur={emailField.onBlur}
            onPasswordBlur={passwordField.onBlur}
            rememberEmail={rememberField.value}
            onRememberChange={rememberField.onChange}
            fieldErrors={{
              email: errors.email?.message ?? null,
              password: errors.password?.message ?? null,
            }}
            alert={alert}
            alertRef={alertRef}
            emailInputRef={emailInputRef}
            passwordInputRef={passwordInputRef}
            isSending={isSending}
            isSubmitDisabled={isSubmitDisabled}
            onSubmit={(event) => {
              void handleSubmit(onValid, onInvalid)(event);
            }}
          />

          <p style={hintStyle}>
            mock 계정 — admin@tds.local / password123 (백엔드 연동 전 로컬 mock: ./api.ts)
          </p>
        </div>
      </section>
    </main>
  );
}
