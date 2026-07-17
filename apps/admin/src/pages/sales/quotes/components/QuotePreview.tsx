// 견적서 미리보기(문서 형태) (A41 소유 — apps/admin/src/pages/sales/**)
//
// 실제 견적서처럼 표제·공급자/공급받는자·품목표·합계·유효기간을 문서 레이아웃으로 그린다.
// 견적 폼 1곳만 쓰므로 페이지 전용이다. 계산은 ../types 의 computeTotals 를 그대로 재사용한다.
//
// [화면과 종이 — ERP-10]
// 이 파일은 **화면 모습**을 소유한다. A4 치수·페이지 나눔 같은 **종이 전용 규칙**은 인라인 style 로
// 표현할 수 없어(@media/@page 는 규칙이지 선언이 아니다) ../quotes.css 가 갖는다. 두 벌은 같은
// print 토큰(tokens.json `print.*`)을 본다 — 치수 리터럴은 어느 쪽에도 없다.
import type { CSSProperties } from 'react';

import { formatNumber } from '../../../../shared/format';
import { StatusBadge } from '../../../../shared/ui';
import { formatBizNo } from '../../_shared/business';
import '../quotes.css';
import { computeTotals, lineSupply, quoteStatusMeta, SUPPLIER, taxModeLabel } from '../types';
import type { QuoteLineItem, QuoteStatus, QuoteTaxMode } from '../types';

const docStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  paddingTop: 'var(--tds-space-5)',
  paddingBottom: 'var(--tds-space-5)',
  paddingLeft: 'var(--tds-space-5)',
  paddingRight: 'var(--tds-space-5)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-default)',
};

const headStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const docTitleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  letterSpacing: 'var(--tds-space-1)',
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-title-lg-font-family)',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  fontWeight: 'var(--tds-typography-title-lg-font-weight)',
  lineHeight: 'var(--tds-typography-title-lg-line-height)',
};

const metaStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  textAlign: 'right',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontVariantNumeric: 'tabular-nums',
};

const partiesStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 5), 1fr))',
  gap: 'var(--tds-space-3)',
};

const partyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-sm)',
  background: 'var(--tds-color-surface-raised)',
};

const partyLabelStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const partyNameStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

const partyLineStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  overflowWrap: 'anywhere',
};

/**
 * 사업자등록번호 줄 (ERP-10 'mono/tabular figure').
 *
 * 사업자번호는 자릿수를 하나씩 대조해 읽는 값이다 — 비례폭에서는 0/O·1/l 이 붙어 오독을 부르고,
 * 공급자/공급받는자 두 블록이 나란히 설 때 자리수가 어긋나 비교가 안 된다.
 */
const partyBizNoStyle: CSSProperties = {
  ...partyLineStyle,
  fontFamily: 'var(--tds-print-document-figure-font-family)',
  fontVariantNumeric: 'tabular-nums',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const cellStyle: CSSProperties = {
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-2)',
  paddingRight: 'var(--tds-space-2)',
  borderBottomStyle: 'solid',
  borderBottomWidth: 'var(--tds-border-width-thin)',
  borderBottomColor: 'var(--tds-color-border-default)',
  color: 'var(--tds-color-text-default)',
  verticalAlign: 'top',
};

const headCellStyle: CSSProperties = {
  ...cellStyle,
  background: 'var(--tds-color-surface-raised)',
  color: 'var(--tds-color-text-muted)',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};

const numCellStyle: CSSProperties = {
  ...cellStyle,
  textAlign: 'right',
  // 수량·단가·공급가액이 세로로 쌓인다 — 자릿수가 맞아야 눈으로 검산된다 (ERP-10)
  fontFamily: 'var(--tds-print-document-figure-font-family)',
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const totalsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  alignItems: 'flex-end',
};

const totalRowStyle: CSSProperties = {
  display: 'flex',
  gap: 'var(--tds-space-4)',
  justifyContent: 'space-between',
  minWidth: 'calc(var(--tds-space-6) * 6)',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  // 공급가액 → 부가세 → 합계가 세로로 쌓이는 블록 — 세 값의 자릿수가 맞아야
  // '공급가액 + 부가세 = 합계' 가 눈으로 검산된다 (ERP-10 합계/부가세 블록)
  fontFamily: 'var(--tds-print-document-figure-font-family)',
  fontVariantNumeric: 'tabular-nums',
};

const grandTotalStyle: CSSProperties = {
  ...totalRowStyle,
  paddingTop: 'var(--tds-space-2)',
  borderTopStyle: 'solid',
  borderTopWidth: 'var(--tds-border-width-medium)',
  borderTopColor: 'var(--tds-color-border-default)',
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

const noteStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  overflowWrap: 'anywhere',
};

const dash = (value: string): string => (value.trim() === '' ? '—' : value.trim());

interface QuotePreviewProps {
  readonly quoteNo: string;
  readonly accountName: string;
  readonly accountBizNo: string;
  readonly accountCeo: string;
  readonly contactName: string;
  readonly issueDate: string;
  readonly validUntil: string;
  readonly taxMode: QuoteTaxMode;
  readonly items: readonly QuoteLineItem[];
  readonly status: QuoteStatus;
  readonly note: string;
}

export function QuotePreview({
  quoteNo,
  accountName,
  accountBizNo,
  accountCeo,
  contactName,
  issueDate,
  validUntil,
  taxMode,
  items,
  status,
  note,
}: QuotePreviewProps) {
  const totals = computeTotals(items, taxMode);
  const statusMeta = quoteStatusMeta(status);

  return (
    /* className 은 종이 전용 규칙(../quotes.css)이 이 문서를 집는 손잡이다 — 화면 모습은 style 이 갖는다 */
    <div className="tds-quote-doc" style={docStyle} aria-label="견적서 미리보기">
      <div style={headStyle}>
        <h2 style={docTitleStyle}>견 적 서</h2>
        <div style={metaStyle}>
          <span>{dash(quoteNo === '' ? '(자동 부여)' : quoteNo)}</span>
          <span>견적일 {dash(issueDate)}</span>
          <span>유효기간 {dash(validUntil)}</span>
          <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />
        </div>
      </div>

      <div style={partiesStyle}>
        <div style={partyStyle}>
          <span style={partyLabelStyle}>공급받는자</span>
          <span style={partyNameStyle}>
            {accountName.trim() === '' ? '(거래처 미입력)' : accountName.trim()}
          </span>
          <span style={partyBizNoStyle}>
            사업자 {accountBizNo.trim() === '' ? '—' : formatBizNo(accountBizNo)}
          </span>
          <span style={partyLineStyle}>대표 {dash(accountCeo)}</span>
          <span style={partyLineStyle}>담당 {dash(contactName)}</span>
        </div>
        <div style={partyStyle}>
          <span style={partyLabelStyle}>공급자</span>
          <span style={partyNameStyle}>{SUPPLIER.name}</span>
          <span style={partyBizNoStyle}>사업자 {formatBizNo(SUPPLIER.bizNo)}</span>
          <span style={partyLineStyle}>대표 {SUPPLIER.ceoName}</span>
          <span style={partyLineStyle}>{SUPPLIER.address}</span>
          <span style={partyLineStyle}>{SUPPLIER.phone}</span>
        </div>
      </div>

      <table style={tableStyle}>
        <thead>
          <tr>
            <th scope="col" style={headCellStyle}>
              품목
            </th>
            <th scope="col" style={headCellStyle}>
              규격
            </th>
            <th scope="col" style={{ ...headCellStyle, textAlign: 'right' }}>
              수량
            </th>
            <th scope="col" style={{ ...headCellStyle, textAlign: 'right' }}>
              단가
            </th>
            <th scope="col" style={{ ...headCellStyle, textAlign: 'right' }}>
              공급가액
            </th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={5}
                style={{ ...cellStyle, textAlign: 'center', color: 'var(--tds-color-text-muted)' }}
              >
                품목이 없습니다.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td style={cellStyle}>{dash(item.name)}</td>
                <td style={cellStyle}>{dash(item.spec)}</td>
                <td style={numCellStyle}>{formatNumber(item.quantity)}</td>
                <td style={numCellStyle}>{formatNumber(item.unitPrice)}</td>
                <td style={numCellStyle}>{formatNumber(lineSupply(item))}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="tds-quote-totals" style={totalsStyle}>
        <div style={totalRowStyle}>
          <span>공급가액</span>
          <span>{formatNumber(totals.supply)}</span>
        </div>
        <div style={totalRowStyle}>
          <span>부가세({taxModeLabel(taxMode)})</span>
          <span>{formatNumber(totals.vat)}</span>
        </div>
        <div style={grandTotalStyle}>
          <span>합계금액</span>
          <span>{`${formatNumber(totals.total)}원`}</span>
        </div>
      </div>

      {note.trim() !== '' && <p style={noteStyle}>비고: {note.trim()}</p>}
    </div>
  );
}
