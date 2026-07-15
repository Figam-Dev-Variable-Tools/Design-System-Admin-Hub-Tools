// 견적 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
//
// 라인아이템은 setValue 로 관리하므로 배열 전체를 한 번에 검증한다: 1개 이상 + 각 행 품목명·수량(≥1)·
// 단가(≥0). 유효기간은 견적일 이후여야 한다. 세부 문구는 라인 인덱스를 포함해 어떤 행이 문제인지 알린다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';

const lineItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  spec: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
}

export const quoteSchema = z
  .object({
    quoteNo: requiredText('견적번호', 40),
    accountName: requiredText('거래처', 60),
    accountBizNo: z.string(),
    accountCeo: z.string(),
    issueDate: z.string(),
    validUntil: z.string(),
    taxMode: z.enum(['standard', 'zero_rated', 'exempt']),
    items: z.array(lineItemSchema),
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'ordered']),
    note: z.string().check(
      z.refine((value) => value.trim().length <= 500, {
        error: '비고는 500자를 넘을 수 없습니다.',
      }),
    ),
  })
  .check((ctx) => {
    // 라인아이템 — 1개 이상 + 각 행 유효.
    const items = ctx.value.items;
    if (items.length === 0) {
      ctx.issues.push({
        code: 'custom',
        input: items,
        path: ['items'],
        message: '품목을 한 개 이상 추가하세요.',
      });
      return;
    }
    if (items.some((item) => item.name.trim() === '')) {
      ctx.issues.push({
        code: 'custom',
        input: items,
        path: ['items'],
        message: '모든 품목의 품목명을 입력하세요.',
      });
      return;
    }
    if (items.some((item) => !Number.isInteger(item.quantity) || item.quantity < 1)) {
      ctx.issues.push({
        code: 'custom',
        input: items,
        path: ['items'],
        message: '수량은 1 이상의 정수여야 합니다.',
      });
      return;
    }
    if (items.some((item) => item.unitPrice < 0)) {
      ctx.issues.push({
        code: 'custom',
        input: items,
        path: ['items'],
        message: '단가는 0 이상이어야 합니다.',
      });
    }
  })
  .check((ctx) => {
    // 유효기간 — 실재 날짜 + 견적일 이후.
    const issue = ctx.value.issueDate.trim();
    const valid = ctx.value.validUntil.trim();
    if (!isRealDate(issue) || !isRealDate(valid)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.issueDate,
        path: ['issueDate'],
        message: '견적일·유효기간을 YYYY-MM-DD 형식으로 입력하세요.',
      });
      return;
    }
    if (valid < issue) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.validUntil,
        path: ['validUntil'],
        message: '유효기간은 견적일보다 빠를 수 없습니다.',
      });
    }
  });

export type QuoteFormValues = z.infer<typeof quoteSchema>;
