// 로그인 폼 유효성 규칙 (A41 — ADR-0008 §7.3 집행)
//
// **검증 규칙의 정본은 이 zod 스키마다.** 손으로 쓴 validateEmail/validatePassword 는 삭제했다 —
// 규칙이 두 벌이면 어느 쪽이 진실인지 알 수 없다.
//
// 진입점은 `zod/mini` 다 (ADR-0008 §7.3 — classic zod 는 +17.5 kB, mini 는 +4.6 kB).
// classic 의 체이닝 API(`.email()` 등)를 쓰지 않고 `check(refine(...))` 로 규칙을 세운다.
//
// [규칙의 원천]
// - SCR-001 §5.2 유효성 규칙 표 — 에러 문안은 SCR 원문 그대로다 (임의 변형 금지).
// - BE-001 §4 서버 제약과 짝을 이룬다: 이메일 254자 · 비밀번호 8–64자.
//   서버도 같은 값을 다시 검증한다 — 프론트 검증은 UX 이지 보증이 아니다.
import * as z from 'zod/mini';

/** 이메일 최대 길이 (SCR-001 §5.2 · BE-001 §4) */
const EMAIL_MAX_LENGTH = 254;
/** 비밀번호 길이 범위 (SCR-001 §5.2 · BE-001 §4) */
const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 64;

/** SCR-001 §5.2 "위반 시 에러 메시지" 열 — 문안 원문 */
const MESSAGES = {
  emailRequired: '이메일을 입력해 주세요.',
  emailFormat: '이메일 형식이 올바르지 않습니다.',
  passwordRequired: '비밀번호를 입력해 주세요.',
  passwordLength: '비밀번호는 8자 이상 64자 이하로 입력해 주세요.',
} as const;

/**
 * 형식: `로컬부@도메인부.TLD`
 * - 공백 불가
 * - `@` 정확히 1개 (로컬부·도메인부 모두 `@` 미포함)
 * - 도메인부에 `.` 1개 이상 (각 라벨은 비어 있을 수 없다)
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

/**
 * 체크 순서 = 에러 우선순위다 (resolver 가 필드당 첫 이슈만 싣는다).
 * '필수' 가 '형식' 보다 먼저 온다 — 빈 칸에 '형식이 올바르지 않습니다' 를 띄우지 않기 위해서다.
 *
 * 길이 초과도 **형식 위반으로 안내한다** — §5.2 는 형식/필수 2종의 문안만 정의한다.
 * 비밀번호는 **trim 하지 않는다** — 공백도 유효한 비밀번호 문자다.
 */
export const loginSchema = z.object({
  email: z.string().check(
    z.refine((value) => value.trim() !== '', { error: MESSAGES.emailRequired }),
    z.refine((value) => value.trim().length <= EMAIL_MAX_LENGTH, { error: MESSAGES.emailFormat }),
    z.refine((value) => EMAIL_PATTERN.test(value.trim()), { error: MESSAGES.emailFormat }),
  ),
  password: z.string().check(
    z.refine((value) => value !== '', { error: MESSAGES.passwordRequired }),
    z.refine(
      (value) =>
        value === '' ||
        (value.length >= PASSWORD_MIN_LENGTH && value.length <= PASSWORD_MAX_LENGTH),
      { error: MESSAGES.passwordLength },
    ),
  ),
  /** 이메일 저장 — 검증 대상은 아니지만 폼 값이라 스키마에 함께 둔다 (§5.3-2) */
  rememberEmail: z.boolean(),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
