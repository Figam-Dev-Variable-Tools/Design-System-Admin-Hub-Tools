// 로그인 검증 규칙 회귀 테스트 (A41)
//
// [왜 이 테스트가 있는가]
// 이 규칙은 손으로 쓴 validateEmail/validatePassword 에서 **zod 스키마로 옮겨졌다**.
// 옮기는 과정에서 문구가 한 글자라도 바뀌면 안 된다 — SCR-001 §5.2 는
// "에러 문안은 SCR 문구를 **문자 그대로** 사용한다(임의 변형 금지)"고 못박고 있다.
// 아래 표가 그 문구를 고정한다.
import { describe, expect, it } from 'vitest';

import { loginSchema } from './validation';

/** 필드별 첫 이슈만 본다 — resolver 가 화면에 싣는 것이 그것이다 */
function errorsOf(values: { email: string; password: string }): Record<string, string | undefined> {
  const result = loginSchema.safeParse({ ...values, rememberEmail: false });
  if (result.success) return {};

  const found: Record<string, string | undefined> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0]);
    found[key] ??= issue.message;
  }
  return found;
}

const REQUIRED_EMAIL = '이메일을 입력해 주세요.';
const BAD_EMAIL = '이메일 형식이 올바르지 않습니다.';
const REQUIRED_PASSWORD = '비밀번호를 입력해 주세요.';
const BAD_PASSWORD_LENGTH = '비밀번호는 8자 이상 64자 이하로 입력해 주세요.';

describe('loginSchema — SCR-001 §5.2 유효성 규칙 표', () => {
  it.each([
    // 입력                                     이메일 오류        비밀번호 오류
    [{ email: '', password: '' }, REQUIRED_EMAIL, REQUIRED_PASSWORD],
    // 공백만 있는 이메일은 '필수' 다 ('형식' 이 아니다) — 빈 칸에 형식 오류를 띄우지 않는다
    [{ email: '   ', password: 'password123' }, REQUIRED_EMAIL, undefined],
    [{ email: 'abc', password: 'password123' }, BAD_EMAIL, undefined],
    // @ 는 있으나 도메인에 점이 없다
    [{ email: 'a@b', password: 'password123' }, BAD_EMAIL, undefined],
    // 공백 포함
    [{ email: 'a b@c.co', password: 'password123' }, BAD_EMAIL, undefined],
    // 254자 초과 → **형식 위반으로 안내한다** (§5.2 는 필수/형식 2종의 문안만 정의한다)
    [{ email: `${'x'.repeat(250)}@b.co`, password: 'password123' }, BAD_EMAIL, undefined],
    // 8자 미만 / 64자 초과
    [{ email: 'a@b.co', password: 'short1' }, undefined, BAD_PASSWORD_LENGTH],
    [{ email: 'a@b.co', password: 'a'.repeat(65) }, undefined, BAD_PASSWORD_LENGTH],
    // 경계값은 통과한다 (8자 · 64자)
    [{ email: 'a@b.co', password: 'a'.repeat(8) }, undefined, undefined],
    [{ email: 'a@b.co', password: 'a'.repeat(64) }, undefined, undefined],
    [{ email: 'admin@tds.local', password: 'password123' }, undefined, undefined],
  ])('%j', (input, email, password) => {
    const errors = errorsOf(input);
    expect(errors['email']).toBe(email);
    expect(errors['password']).toBe(password);
  });

  it('비밀번호는 trim 하지 않는다 — 공백도 유효한 문자다', () => {
    // 8자짜리 공백 비밀번호는 길이 규칙을 만족한다 (지우지 말 것: 손코딩 검증기도 그랬다)
    expect(errorsOf({ email: 'a@b.co', password: ' '.repeat(8) })['password']).toBeUndefined();
  });
});
