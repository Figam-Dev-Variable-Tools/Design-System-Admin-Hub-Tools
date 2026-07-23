// 거래처 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 사업자등록번호는 국세청 체크섬으로 실검증하고, 여신한도는 원값 보존을 위해 문자열로 받는다.
// 담당자(복수)는 setValue 로 관리하므로 배열 전체를 한 번에 검증해 단일 문구로 노출한다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { isValidBizNo } from '../_shared/business';
import { ACCOUNT_NAME_MAX, ACCOUNT_NOTE_MAX } from './types';

const INT_RE = /^\d+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const contactValuesSchema = z.object({
  id: z.string(),
  name: z.string(),
  department: z.string(),
  position: z.string(),
  phone: z.string(),
  email: z.string(),
  primary: z.boolean(),
});

export const accountSchema = z
  .object({
    name: requiredText('상호', ACCOUNT_NAME_MAX),
    bizNo: z.string(),
    ceoName: requiredText('대표자명', 40),
    bizType: z.string(),
    bizItem: z.string(),
    tradeType: z.enum(['sales', 'purchase', 'both']),
    taxType: z.enum(['general', 'simplified', 'exempt', 'zero_rated']),
    creditGrade: z.enum(['A', 'B', 'C', 'D']),
    creditLimit: z.string(),
    paymentTerm: z.enum(['cash', 'eom', 'net_30', 'net_60', 'next_eom']),
    address: z.string(),
    phone: z.string(),
    contacts: z.array(contactValuesSchema),
    active: z.boolean(),
    lastTradeAt: z.string(),
    note: z.string().check(
      z.refine((value) => value.trim().length <= ACCOUNT_NOTE_MAX, {
        error: `비고는 ${String(ACCOUNT_NOTE_MAX)}자를 넘을 수 없어요.`,
      }),
    ),
  })
  .check((ctx) => {
    // 사업자등록번호 — 10자리 + 국세청 체크섬.
    if (!isValidBizNo(ctx.value.bizNo)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.bizNo,
        path: ['bizNo'],
        message: '올바른 사업자등록번호가 아니에요. (000-00-00000)',
      });
    }
  })
  .check((ctx) => {
    // 여신한도 — 숫자만.
    if (!INT_RE.test(ctx.value.creditLimit.trim())) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.creditLimit,
        path: ['creditLimit'],
        message: '여신한도는 숫자만 입력할 수 있어요.',
      });
    }
  })
  .check((ctx) => {
    // 담당자 — 최소 1명 + 각 행 이름 필수 + 이메일 형식.
    const contacts = ctx.value.contacts;
    if (contacts.length === 0) {
      ctx.issues.push({
        code: 'custom',
        input: contacts,
        path: ['contacts'],
        message: '담당자를 한 명 이상 등록하세요.',
      });
      return;
    }
    if (contacts.some((contact) => contact.name.trim() === '')) {
      ctx.issues.push({
        code: 'custom',
        input: contacts,
        path: ['contacts'],
        message: '담당자 이름을 입력하세요.',
      });
      return;
    }
    if (
      contacts.some(
        (contact) => contact.email.trim() !== '' && !EMAIL_RE.test(contact.email.trim()),
      )
    ) {
      ctx.issues.push({
        code: 'custom',
        input: contacts,
        path: ['contacts'],
        message: '담당자 이메일 형식이 올바르지 않아요.',
      });
    }
  });

export type AccountFormValues = z.infer<typeof accountSchema>;
