/**
 * Pages/Login — 실제 DS 컴포넌트 조립 스토리 (조립 전용, 담당: 스토리북 페이지 · 게이트 G5).
 *
 * 로그인은 사이드바 메뉴에 속하지 않는 인증 화면이라 `Templates` 바로 아래에 둔다.
 *
 * 대응 화면정의서: docs/plan/ui/SCR-001-login.md — §3 CRUD 상태(정상·자격증명 불일치·계정 잠금·
 * 계정 비활성·서버 오류·로딩)를 스토리 6벌로 재현한다.
 * 사용 모듈: Card · Alert · TextField · PasswordField · Checkbox · Button.
 *
 * [조립 원칙] 여기서 신규 DS 컴포넌트를 만들지 않는다. `../../src` public API 만 조합한다.
 * LoginForm 은 스토리 로컬 제어 조립 컴포넌트이며 DS 컴포넌트가 아니다(../../src 로 내보내지 않는다).
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';
import { Alert, Button, Card, Checkbox, PasswordField, TextField } from '../../src';
import { cssVar, typography } from '../../generated/tokens/tokens';

/** 토큰 배수 치수 — px 리터럴 대신 space 토큰의 calc 배수만 사용 */
const size = (multiple: number): string => `calc(${cssVar('space.6')} * ${multiple})`;

/** LoginForm 조립에 넘기는 상태 표면 — 각 스토리가 SCR §3 상태 1개씩을 주입한다 */
interface LoginFormProps {
  /** 폼 상단 Alert 문구. 빈 문자열이면 배너를 렌더하지 않는다(정상 상태) */
  alertMessage?: string;
  /** 제출 버튼 비활성(계정 잠금 — SCR §3 등록-에러 (b)) */
  submitDisabled?: boolean;
  /** 제출 중(로딩) — 버튼 loading + 입력 전부 비활성 + 중복 제출 차단 */
  loading?: boolean;
  /** 초기 이메일 값(자격증명 불일치 시 이메일은 유지, 서버 오류 시 전체 유지) */
  initialEmail?: string;
}

const pageStyle: CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  minBlockSize: size(20),
  padding: cssVar('space.6'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const formStyle: CSSProperties = {
  display: 'grid',
  gap: cssVar('space.4'),
  inlineSize: '100%',
};

const cardWrapStyle: CSSProperties = {
  inlineSize: '100%',
  maxInlineSize: size(15),
};

const headingStyle: CSSProperties = { ...typography('typography.title.lg'), margin: 0 };

/**
 * 로그인 폼 — SCR-001 §1 단일 인증 폼의 제어 조립.
 * email/password/remember/revealed 를 useState 로 소유한다(스토리 로컬 상태).
 */
function LoginForm({
  alertMessage = '',
  submitDisabled = false,
  loading = false,
  initialEmail = '',
}: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(initialEmail !== '');
  const [revealed, setRevealed] = useState(false);

  const inputsDisabled = loading;

  return (
    <div style={pageStyle}>
      <div style={cardWrapStyle}>
        <Card padding="lg" elevation="raised">
          <form
            style={formStyle}
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <h1 style={headingStyle}>로그인</h1>

            {alertMessage !== '' ? <Alert tone="danger">{alertMessage}</Alert> : null}

            <TextField
              id="login-email"
              label="이메일"
              type="email"
              name="email"
              autoComplete="username"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              disabled={inputsDisabled}
              onChange={(event) => setEmail(event.target.value)}
            />

            <PasswordField
              id="login-password"
              label="비밀번호"
              name="password"
              autoComplete="current-password"
              value={password}
              disabled={inputsDisabled}
              revealed={revealed}
              onChange={(event) => setPassword(event.target.value)}
              onToggleReveal={() => setRevealed((prev) => !prev)}
            />

            <Checkbox
              id="login-remember"
              label="이메일 저장"
              name="rememberEmail"
              checked={remember}
              disabled={inputsDisabled}
              onChange={(event) => setRemember(event.target.checked)}
            />

            <Button
              variant="primary"
              type="submit"
              isFullWidth
              loading={loading}
              disabled={submitDisabled}
            >
              {loading ? '제출 중' : '로그인'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

const meta: Meta<typeof LoginForm> = {
  title: 'Design System/Templates/Login',
  component: LoginForm,
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof LoginForm>;

/** 정상 — 빈 폼(SCR §3 등록-정상) */
export const Default: Story = {
  args: {},
};

/** 자격증명 불일치 — Alert(danger) + 실패 카운트 노출, 비밀번호 필드는 비운 채 이메일은 유지 (SCR §3 등록-에러 (a)) */
export const CredentialError: Story = {
  args: {
    initialEmail: 'admin@example.com',
    alertMessage: '이메일 또는 비밀번호가 일치하지 않아요. (실패 3/5회)',
  },
};

/** 계정 잠금 — Alert(danger) + 제출 버튼 비활성 (SCR §3 등록-에러 (b)) */
export const AccountLocked: Story = {
  args: {
    initialEmail: 'admin@example.com',
    alertMessage:
      '비밀번호 5회 오류로 계정이 잠겼어요. 30분 후 다시 시도하거나 시스템 관리자에게 문의하세요.',
    submitDisabled: true,
  },
};

/** 계정 비활성 — Alert(danger) (SCR §3 등록-에러 (c)) */
export const AccountInactive: Story = {
  args: {
    initialEmail: 'admin@example.com',
    alertMessage: '사용이 중지된 계정이에요. 시스템 관리자에게 문의하세요.',
  },
};

/** 서버 오류 — Alert(danger), 입력값은 전부 유지 (SCR §3 등록-에러 (d)) */
export const ServerError: Story = {
  args: {
    initialEmail: 'admin@example.com',
    alertMessage: '일시적인 오류로 로그인하지 못했어요. 다시 시도해 주세요.',
  },
};

/** 로딩 — 제출 버튼 loading + 입력 전부 비활성(중복 제출 차단) (SCR §3 등록-로딩) */
export const Submitting: Story = {
  args: {
    initialEmail: 'admin@example.com',
    loading: true,
  },
};
