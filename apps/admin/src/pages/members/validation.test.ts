// 회원 화면 폼 검증 규칙 회귀 테스트 (A41)
//
// 이 규칙들은 모달 안의 손코딩 검증기(CreateGroupModal 의 submit() if 문 ·
// PasswordChangeModal 의 validate())에서 **zod 스키마로 옮겨졌다.**
// 옮기는 과정에서 문구·경계값이 바뀌지 않았음을 아래 표가 고정한다.
import { describe, expect, it } from 'vitest';

import { createGroupSchema, passwordChangeSchema } from './validation';

type Errors = Record<string, string | undefined>;

function firstIssues(result: { success: boolean; error?: { issues: readonly unknown[] } }): Errors {
  if (result.success) return {};
  const issues = (result.error?.issues ?? []) as readonly {
    path: readonly PropertyKey[];
    message: string;
  }[];

  const found: Errors = {};
  for (const issue of issues) {
    const key = String(issue.path[0]);
    found[key] ??= issue.message;
  }
  return found;
}

describe('createGroupSchema — 새 그룹 만들기', () => {
  const parse = (name: string): Errors =>
    firstIssues(createGroupSchema.safeParse({ name, type: 'member', shippingBenefit: 'none' }));

  it.each([
    ['', '그룹명을 입력하세요.'],
    // 공백만 입력해도 '입력하세요' 다 — trim 기준으로 판정한다
    ['   ', '그룹명을 입력하세요.'],
    ['x'.repeat(31), '그룹명은 30자를 넘을 수 없습니다.'],
  ])('%j → %s', (name, message) => {
    expect(parse(name)['name']).toBe(message);
  });

  it('경계값 30자는 통과한다', () => {
    expect(parse('x'.repeat(30))['name']).toBeUndefined();
  });
});

describe('passwordChangeSchema — 비밀번호 변경', () => {
  const parse = (password: string, confirm: string): Errors =>
    firstIssues(passwordChangeSchema.safeParse({ password, confirm }));

  it.each([
    // 입력                       password 오류                        confirm 오류
    ['', '', '새 비밀번호를 입력하세요.', '새 비밀번호를 한 번 더 입력하세요.'],
    ['short1', 'short1', '비밀번호는 8자 이상이어야 합니다.', undefined],
    // 8자 이상이지만 숫자가 없다 / 영문이 없다
    ['abcdefgh', 'abcdefgh', '영문과 숫자를 모두 포함해야 합니다.', undefined],
    ['12345678', '12345678', '영문과 숫자를 모두 포함해야 합니다.', undefined],
    // 규칙은 만족하나 확인란이 다르다
    ['abcd1234', 'abcd9999', undefined, '비밀번호가 일치하지 않습니다.'],
    ['abcd1234', 'abcd1234', undefined, undefined],
  ])('%j/%j', (password, confirm, passwordError, confirmError) => {
    const errors = parse(password, confirm);
    expect(errors['password']).toBe(passwordError);
    expect(errors['confirm']).toBe(confirmError);
  });

  it('확인란이 비어 있으면 불일치 문구를 겹쳐 붙이지 않는다', () => {
    // '한 번 더 입력하세요' 만 뜬다 — 두 문구가 동시에 뜨면 사용자는 무엇을 고칠지 모른다
    expect(parse('abcd1234', '')['confirm']).toBe('새 비밀번호를 한 번 더 입력하세요.');
  });
});
