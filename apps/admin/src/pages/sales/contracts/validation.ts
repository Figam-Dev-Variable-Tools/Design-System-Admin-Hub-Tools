// 계약 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
//
// 금액은 원값 보존을 위해 문자열로 받고, 계약 기간 역전·금액 0·자동갱신 통지기한을 경계값으로 막는다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { isCalendarDate } from '../../../shared/format';
import { CONTRACT_TERMS_MAX, CONTRACT_TITLE_MAX } from './types';

const INT_RE = /^\d+$/;

export const contractSchema = z
  .object({
    title: requiredText('계약명', CONTRACT_TITLE_MAX),
    // 거래처 마스터 참조. 빈 문자열을 허용한다 — 아직 등록되지 않은 거래처와의 첫 계약을 막지
    // 않기 위해서다. 대신 폼이 그 대가(역방향 조회에서 빠진다)를 경고로 드러낸다
    // (../_shared/AccountSelectField). 이름은 계속 필수라 '아무것도 모르는 계약'은 생기지 않는다.
    accountId: z.string(),
    accountName: requiredText('거래처', 60),
    contractType: z.enum(['supply', 'service', 'maintenance', 'license', 'lease', 'nda']),
    startAt: z.string(),
    endAt: z.string(),
    amount: z.string(),
    vatIncluded: z.boolean(),
    autoRenew: z.boolean(),
    renewNoticeDays: z.string(),
    status: z.enum(['draft', 'review', 'active', 'expired', 'terminated']),
    signStatus: z.enum(['unsigned', 'sent', 'partial', 'signed']),
    ownerName: z.string(),
    attachments: z.array(z.string()),
    terms: z.string().check(
      z.refine((value) => value.trim().length <= CONTRACT_TERMS_MAX, {
        error: `조항 요약은 ${String(CONTRACT_TERMS_MAX)}자를 넘을 수 없습니다.`,
      }),
    ),
    note: z.string(),
  })
  .check((ctx) => {
    // 계약금액 — 숫자 + 0 초과.
    const raw = ctx.value.amount.trim();
    if (!INT_RE.test(raw)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.amount,
        path: ['amount'],
        message: '계약금액은 숫자만 입력할 수 있습니다.',
      });
      return;
    }
    if (Number(raw) <= 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.amount,
        path: ['amount'],
        message: '계약금액은 0보다 커야 합니다.',
      });
    }
  })
  .check((ctx) => {
    // 계약기간 — 실재 날짜 + 종료 ≥ 시작.
    const start = ctx.value.startAt.trim();
    const end = ctx.value.endAt.trim();
    if (!isCalendarDate(start) || !isCalendarDate(end)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.startAt,
        path: ['startAt'],
        message: '계약 기간을 YYYY-MM-DD 형식으로 입력하세요.',
      });
      return;
    }
    if (end < start) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.endAt,
        path: ['endAt'],
        message: '종료일은 시작일보다 빠를 수 없습니다.',
      });
    }
  })
  .check((ctx) => {
    // 자동갱신 통지기한 — 갱신 사용 시 숫자.
    if (!ctx.value.autoRenew) return;
    if (!INT_RE.test(ctx.value.renewNoticeDays.trim())) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.renewNoticeDays,
        path: ['renewNoticeDays'],
        message: '갱신 통지기한(일)은 숫자만 입력할 수 있습니다.',
      });
    }
  });

export type ContractFormValues = z.infer<typeof contractSchema>;
