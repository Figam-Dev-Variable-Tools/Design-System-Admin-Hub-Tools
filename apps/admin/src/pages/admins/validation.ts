// 관리자 화면 폼 검증 규칙 (ADR-0008 §7.3 집행)
//
// 진입점은 `zod/mini` 다 (ADR-0008 §7.3 — classic zod +17.5 kB vs mini +4.6 kB),
// 회원 화면(`pages/members/validation.ts`)과 같은 규약이다.
//
// [그룹명 길이는 회원 그룹과 같은 값을 본다] 상수는 shared/domain/admin-group.ts 가 갖는다 —
// 두 모달이 같은 화면에서 서로 다른 길이를 허용하면 그것은 규칙이 아니라 사고다.
import * as z from 'zod/mini';

import { GROUP_NAME_MAX_LENGTH } from '../../shared/domain/admin-group';
import {
  ADMIN_ACCOUNT_MAX_LENGTH,
  ADMIN_DEPARTMENT_MAX_LENGTH,
  ADMIN_MEMO_MAX_LENGTH,
  ADMIN_NICKNAME_MAX_LENGTH,
  ADMIN_POSITION_MAX_LENGTH,
} from './types';

/** 형식은 최소한만 본다 — 실제로 받을 수 있는 주소인지는 서버(초대 메일)가 판정한다 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 새 운영진 그룹 만들기.
 *
 * [발신번호가 자유 입력이 아닌 이유] 사전등록제라 미등록 번호로는 발송 자체가 되지 않는다
 * (shared/fixtures/admin-groups.ts 머리말). 화면이 셀렉트로 고르게 하고, 검증은 '골랐는가' 만
 * 본다 — 값 자체의 형식을 여기서 다시 판정하면 등록 풀과 정규식이 어긋날 수 있다.
 *
 * [대표값 1개씩만 받는 이유] 그룹은 발신번호·발신 이메일을 **여러 개** 가질 수 있지만
 * (AdminGroup 은 배열로 갖는다), 만드는 순간에 전부 채우게 하면 입력이 무거워진다. 여기서는
 * 대표값 하나씩만 받고 나머지는 그룹이 생긴 뒤 덧붙인다.
 *
 * [발신 자격이 꺼져 있으면 두 칸은 선택 입력이다] 조회·권한 필터 전용 그룹은 발신하지 않으므로
 * 번호·주소를 요구할 이유가 없다. 객체 레벨 check 로 올린다 — 필드 하나만으로는 판정할 수 없다.
 *
 * 체크 순서 = 에러 우선순위 (resolver 가 필드당 첫 이슈만 싣는다)
 */
export const createAdminGroupSchema = z
  .object({
    name: z.string().check(
      z.refine((value) => value.trim() !== '', { error: '그룹명을 입력하세요.' }),
      z.refine((value) => value.trim().length <= GROUP_NAME_MAX_LENGTH, {
        error: `그룹명은 ${String(GROUP_NAME_MAX_LENGTH)}자를 넘을 수 없어요.`,
      }),
    ),
    /** 사전등록 풀에서 고른 대표 발신번호. 빈 문자열 = 아직 고르지 않음 */
    senderPhone: z.string(),
    /** 대표 발신 이메일 */
    senderEmail: z.string(),
    /** 메시지 템플릿의 발신 프로필로 쓸 것인가 */
    usableAsSender: z.boolean(),
  })
  .check((ctx) => {
    if (!ctx.value.usableAsSender) return;

    if (ctx.value.senderPhone.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderPhone,
        path: ['senderPhone'],
        message: '발신 프로필로 쓰려면 대표 발신번호를 골라야 해요.',
      });
    }

    const email = ctx.value.senderEmail.trim();
    if (email === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderEmail,
        path: ['senderEmail'],
        message: '발신 프로필로 쓰려면 대표 발신 이메일을 입력해야 해요.',
      });
      return;
    }
    // 형식은 최소한만 본다 — 실제 발신 가능 여부는 SPF/DKIM 이 걸렸는지이며 서버가 판정한다
    if (!EMAIL_PATTERN.test(email)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderEmail,
        path: ['senderEmail'],
        message: '이메일 주소 형식이 올바르지 않아요.',
      });
    }
  });

export type CreateAdminGroupFormValues = z.infer<typeof createAdminGroupSchema>;

/**
 * 운영자 등록·수정 폼.
 *
 * [필수는 넷뿐이다 — 닉네임·계정·그룹·역할]
 * 이 넷이 없으면 만들어진 레코드가 **뜻을 갖지 못한다**: 계정은 이 사람이 누구인지를 정하고
 * (세션의 이메일과 맞춰 자기 자신을 찾는다 — guards.ts), 그룹은 소속이자 발신 프로필이며,
 * 역할은 이 사람이 무엇을 할 수 있는지다. 반대로 부서·직급·연락처·메모는 있으면 좋은 정보라
 * 요구하지 않는다 — 목록의 부서·직급 셀이 처음부터 '비어 있을 수 있는 값' 이었다.
 *
 * [계정 중복은 여기서 보지 않는다] 이 스키마는 명부를 모른다. 지금 화면이 든 목록으로 판정하면
 * 다른 탭에서 방금 만들어진 계정을 통과시킨다 — 중복은 **명부를 쥔 쪽**, 즉 어댑터가 409 로
 * 거절한다(data-source.ts). 화면은 그 409 를 계정 칸의 인라인 오류로 되돌린다.
 *
 * [그룹·역할은 '골랐는가' 만 본다] 두 값 모두 셀렉트가 목록에서 고르게 하므로, 값 자체의 유효성을
 * 여기서 다시 판정하면 목록과 규칙이 어긋날 수 있다(발신번호에 대해 위 스키마가 하는 판단과 같다).
 *
 * 체크 순서 = 에러 우선순위 (resolver 가 필드당 첫 이슈만 싣는다)
 */
export const adminSchema = z.object({
  nickname: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '닉네임을 입력하세요.' }),
    z.refine((value) => value.trim().length <= ADMIN_NICKNAME_MAX_LENGTH, {
      error: `닉네임은 ${String(ADMIN_NICKNAME_MAX_LENGTH)}자를 넘을 수 없어요.`,
    }),
  ),
  account: z.string().check(
    z.refine((value) => value.trim() !== '', { error: '계정(이메일)을 입력하세요.' }),
    z.refine((value) => EMAIL_PATTERN.test(value.trim()), {
      error: '이메일 주소 형식이 올바르지 않아요.',
    }),
    z.refine((value) => value.trim().length <= ADMIN_ACCOUNT_MAX_LENGTH, {
      error: `계정은 ${String(ADMIN_ACCOUNT_MAX_LENGTH)}자를 넘을 수 없어요.`,
    }),
  ),
  /** 운영진 그룹 = 발신 프로필. 빈 문자열 = 아직 고르지 않음 */
  groupId: z
    .string()
    .check(z.refine((value) => value.trim() !== '', { error: '소속 그룹을 고르세요.' })),
  /** 권한 역할 id — 목록의 정본은 권한 스토어다(shared/permissions) */
  roleId: z.string().check(z.refine((value) => value.trim() !== '', { error: '역할을 고르세요.' })),
  department: z.string().check(
    z.refine((value) => value.trim().length <= ADMIN_DEPARTMENT_MAX_LENGTH, {
      error: `부서는 ${String(ADMIN_DEPARTMENT_MAX_LENGTH)}자를 넘을 수 없어요.`,
    }),
  ),
  position: z.string().check(
    z.refine((value) => value.trim().length <= ADMIN_POSITION_MAX_LENGTH, {
      error: `직급은 ${String(ADMIN_POSITION_MAX_LENGTH)}자를 넘을 수 없어요.`,
    }),
  ),
  /**
   * 연락처 — 선택 입력이지만 **적었다면** 형식을 본다.
   *
   * 문자 발송·비상 연락이 이 값으로 나간다. 형식이 깨진 번호는 저장은 되고 발송만 실패해서,
   * 실패한 뒤에야 잘못을 알게 된다(발신번호 사전등록제를 셀렉트로 푼 것과 같은 판단이다).
   */
  phone: z.string().check(
    z.refine((value) => value.trim() === '' || /^[\d-]{9,20}$/.test(value.trim()), {
      error: "연락처는 숫자와 '-' 로만 입력하세요. 예: 010-1234-5678",
    }),
  ),
  memo: z.string().check(
    z.refine((value) => value.trim().length <= ADMIN_MEMO_MAX_LENGTH, {
      error: `메모는 ${String(ADMIN_MEMO_MAX_LENGTH)}자를 넘을 수 없어요.`,
    }),
  ),
});

export type AdminFormValues = z.infer<typeof adminSchema>;
