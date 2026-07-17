// 견적 폼 검증 규칙 (A41 — 검증의 정본은 이 zod 스키마다)
//
// 라인아이템은 setValue 로 관리하므로 배열 전체를 한 번에 검증한다: 1개 이상 + 각 행 품목명·수량(≥1)·
// 단가(≥0). 유효기간은 견적일 이후여야 한다. 세부 문구는 라인 인덱스를 포함해 어떤 행이 문제인지 알린다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { isCalendarDate } from '../../../shared/format';

const lineItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  spec: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
});

export const quoteSchema = z
  .object({
    // [자동 채번 값 — 요구하지 않는다] 견적번호는 사람이 정하지 않는다. 폼에서 readOnly 이고
    // (QuoteFormPage '견적번호' 필드), 비어 있으면 데이터소스가 견적일+순번으로 부여한다
    // (data-source nextQuote). 여기서 requiredText 로 요구하면 신규 등록이 **영구 불가능**해진다 —
    // 사용자가 채울 수 없는 값을 검증이 요구해 제출이 언제나 실패한다. 아래 승계 값들과 같은 부류다.
    quoteNo: z.string(),
    accountName: requiredText('거래처', 60),
    accountBizNo: z.string(),
    accountCeo: z.string(),
    contactName: z.string().check(
      z.refine((value) => value.trim().length <= 40, {
        error: '담당자는 40자를 넘을 수 없습니다.',
      }),
    ),
    issueDate: z.string(),
    validUntil: z.string(),
    taxMode: z.enum(['standard', 'zero_rated', 'exempt']),
    items: z.array(lineItemSchema),
    status: z.enum(['draft', 'sent', 'accepted', 'rejected', 'expired', 'ordered']),
    // 승계 값 — 사람이 편집하지 않는다. 폼이 값을 잃지 않도록 스키마에 남긴다(수정 시 보존).
    inquiryId: z.string(),
    inquiryNo: z.string(),
    inquiryBody: z.string(),
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
    if (!isCalendarDate(issue) || !isCalendarDate(valid)) {
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

/**
 * 빈 견적 폼 — 신규 등록(/sales/quotes/new)이 마운트하는 값의 **정본**.
 *
 * 페이지와 테스트가 이 한 벌을 공유한다. 테스트가 자기 사본에 값을 채워 넣으면 실제 제출 경로를
 * 타지 않아, 사용자가 채울 수 없는 필드를 검증이 요구해도 초록불이 난다(quoteNo 교착의 전례).
 */
export const EMPTY_QUOTE_FORM: QuoteFormValues = {
  quoteNo: '',
  accountName: '',
  accountBizNo: '',
  accountCeo: '',
  contactName: '',
  issueDate: '',
  validUntil: '',
  taxMode: 'standard',
  items: [],
  status: 'draft',
  note: '',
  inquiryId: '',
  inquiryNo: '',
  inquiryBody: '',
};
