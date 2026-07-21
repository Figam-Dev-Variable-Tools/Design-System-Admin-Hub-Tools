// 견적서 문서 — print 토큰 소비 고정 (ERP-10)
//
// [이 파일이 지키는 것]
// ERP-10 의 print 토큰은 **소비자가 있어야** 살아남는다 — 소비자 없는 토큰은 죽은 토큰으로
// 제거당한 전례가 있다. 그런데 이 토큰들의 소비는 대부분 `@media print` 안에서 일어나 화면
// 테스트로는 보이지 않고, 종이에서만 틀어진다(아무도 안 본다). 그래서 소비 자체를 여기 못박는다.
//
// A4 치수(print.page.*)는 quotes.css 가 갖고 jsdom 이 `@media print` 를 적용하지 않으므로,
// 여기서는 문서가 그 규칙의 **손잡이(className)** 를 실제로 달고 있는지를 단언한다 —
// 손잡이가 빠지면 인쇄가 통째로 조용히 깨진다.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { QuotePreview } from './QuotePreview';
import type { QuoteLineItem } from '../types';

const items: readonly QuoteLineItem[] = [
  { id: 'a', name: '강의실 리모델링', spec: '3층 A동', quantity: 2, unitPrice: 1_500_000 },
];

function renderDoc() {
  return render(
    <QuotePreview
      quoteNo="Q-20260717-001"
      accountName="스페이스플래닝"
      // 공급자 블록의 사업자번호와 겹치지 않게 둔다 — 겹치면 두 블록이 같은 텍스트가 된다.
      // (이 파일은 공급자 조회기를 배선하지 않으므로 공급자는 폴백 '000-00-00000' 이다 —
      //  견적서가 배선 없이도 그려진다는 사실을 함께 고정한다. shared/domain/supplier.ts)
      accountBizNo="1234567890"
      accountCeo="김대표"
      contactName="이담당"
      issueDate="2026-07-17"
      validUntil="2026-08-16"
      taxMode="standard"
      items={items}
      status="draft"
      note=""
    />,
  );
}

describe('QuotePreview — print 토큰 소비 (ERP-10)', () => {
  it('문서가 인쇄 규칙의 손잡이(tds-quote-doc)를 단다 — 빠지면 A4 규칙이 아무 곳에도 걸리지 않는다', () => {
    renderDoc();
    const doc = screen.getByLabelText('견적서 미리보기');
    expect(doc.classList.contains('tds-quote-doc')).toBe(true);
  });

  it('합계 블록이 페이지 나눔 방지 손잡이를 단다 — 품목표와 갈라지면 검산 근거를 잃는다', () => {
    const { container } = renderDoc();
    expect(container.querySelector('.tds-quote-totals')).not.toBeNull();
  });

  it('사업자등록번호는 figure(mono) 토큰으로 그린다 — 자릿수 대조가 이 값의 용도다', () => {
    renderDoc();
    const bizNo = screen.getByText(/사업자 123-45-67890/);
    expect(bizNo.style.fontFamily).toBe('var(--tds-print-document-figure-font-family)');
  });

  it('품목표 금액 셀은 figure(mono) + tabular-nums 로 자릿수를 맞춘다', () => {
    const { container } = renderDoc();
    // 공급가액 = 2 × 1,500,000 — 라인의 금액 셀(td)
    const cell = [...container.querySelectorAll('td')].find((td) => td.textContent === '3,000,000');
    expect(cell).toBeDefined();
    expect(cell?.style.fontFamily).toBe('var(--tds-print-document-figure-font-family)');
    expect(cell?.style.fontVariantNumeric).toBe('tabular-nums');
  });

  it('합계 블록의 각 행이 figure(mono) 로 선다 — 공급가액·부가세·합계의 자릿수가 맞아야 검산된다', () => {
    const { container } = renderDoc();
    // 값은 행(div)의 자식 span 이고 서체는 행이 갖는다 — 행을 본다
    const rows = [...(container.querySelector('.tds-quote-totals')?.children ?? [])];
    expect(rows).toHaveLength(3); // 공급가액 · 부가세 · 합계금액
    for (const row of rows) {
      expect((row as HTMLElement).style.fontFamily).toBe(
        'var(--tds-print-document-figure-font-family)',
      );
    }
  });
});
