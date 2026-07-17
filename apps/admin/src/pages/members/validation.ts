// 회원 화면 폼 검증 규칙 (ADR-0008 §7.3 집행)
//
// **검증 규칙의 정본은 이 zod 스키마다.** 모달 안에 흩어져 있던 손코딩 검증기
// (CreateGroupModal 의 submit() 내부 if 문 · PasswordChangeModal 의 validate())는 삭제했다.
//
// 진입점은 `zod/mini` 다 (ADR-0008 §7.3 — classic zod +17.5 kB vs mini +4.6 kB).
import * as z from 'zod/mini';

/* ── 새 그룹 만들기 ──────────────────────────────────────────────────────── */

/** 그룹명 최대 길이 — 화면의 안내 문구가 이 값을 그대로 읽는다 */
const GROUP_NAME_MAX_LENGTH = 30;

/** 체크 순서 = 에러 우선순위 (resolver 가 필드당 첫 이슈만 싣는다) */
export const createGroupSchema = z.object({
  name: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '그룹명을 입력하세요.' }),
    z.refine((value) => value.trim().length <= GROUP_NAME_MAX_LENGTH, {
      error: `그룹명은 ${String(GROUP_NAME_MAX_LENGTH)}자를 넘을 수 없습니다.`,
    }),
  ),
  type: z.enum(['member', 'staff']),
  shippingBenefit: z.enum(['none', 'free', 'conditional']),
});

export type CreateGroupFormValues = z.infer<typeof createGroupSchema>;

/* ── 비밀번호 변경 ───────────────────────────────────────────────────────── */

/** 최소 길이 — 서버 정책이 생기면 계약(data-source)으로 내려온다. 화면의 안내 문구가 이 값을 읽는다 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * 비밀번호는 **trim 하지 않는다** — 공백도 유효한 비밀번호 문자다.
 * (다만 '입력했는가' 판정은 기존 동작대로 trim 기준이다.)
 *
 * 확인 필드의 일치 검사는 **필드 하나만으로는 판정할 수 없다** — 객체 레벨 check 로 올린다.
 * zod 는 경고 채널이 없으므로 여기 있는 것은 전부 **저장을 막는 에러**다.
 */
export const passwordChangeSchema = z
  .object({
    password: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '새 비밀번호를 입력하세요.' }),
      z.refine((value) => value.trim() === '' || value.length >= PASSWORD_MIN_LENGTH, {
        error: `비밀번호는 ${String(PASSWORD_MIN_LENGTH)}자 이상이어야 합니다.`,
      }),
      z.refine(
        (value) =>
          value.trim() === '' ||
          value.length < PASSWORD_MIN_LENGTH ||
          (/[a-zA-Z]/.test(value) && /[0-9]/.test(value)),
        { error: '영문과 숫자를 모두 포함해야 합니다.' },
      ),
    ),
    confirm: z
      .string()
      .check(
        z.refine((value) => value.trim() !== '', { error: '새 비밀번호를 한 번 더 입력하세요.' }),
      ),
  })
  .check((ctx) => {
    // 확인란이 비어 있으면 '한 번 더 입력하세요' 가 이미 붙는다 — 불일치까지 겹쳐 붙이지 않는다
    if (ctx.value.confirm.trim() === '') return;
    if (ctx.value.password === ctx.value.confirm) return;
    ctx.issues.push({
      code: 'custom',
      input: ctx.value.confirm,
      path: ['confirm'],
      message: '비밀번호가 일치하지 않습니다.',
    });
  });

export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;
