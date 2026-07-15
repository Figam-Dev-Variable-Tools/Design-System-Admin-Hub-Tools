// 거래처 사업자 정보 미리보기 (A41 소유 — apps/admin/src/pages/sales/**)
//
// 입력한 사업자정보를 사업자등록증 요약 카드처럼 보여준다. 거래처 폼 1곳만 쓰므로 페이지 전용이다.
import type { CSSProperties } from 'react';

import { StatusBadge } from '../../../../shared/ui';
import { formatBizNo, formatWon } from '../../_shared/business';
import {
  creditGradeLabel,
  creditGradeTone,
  paymentTermLabel,
  taxTypeLabel,
  tradeTypeLabel,
  tradeTypeTone,
} from '../types';
import type { CreditGrade, PaymentTerm, TaxType, TradeType } from '../types';

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
  paddingTop: 'var(--tds-space-4)',
  paddingBottom: 'var(--tds-space-4)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
};

const headStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const nameStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-title-md-font-family)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-typography-title-md-font-weight)',
  lineHeight: 'var(--tds-typography-title-md-line-height)',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(calc(var(--tds-space-6) * 2), auto) minmax(0, 1fr)',
  columnGap: 'var(--tds-space-3)',
  rowGap: 'var(--tds-space-2)',
};

const keyStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const valueStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  overflowWrap: 'anywhere',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const placeholder = (value: string): string => (value.trim() === '' ? '—' : value.trim());

interface AccountBusinessPreviewProps {
  readonly name: string;
  readonly bizNo: string;
  readonly ceoName: string;
  readonly bizType: string;
  readonly bizItem: string;
  readonly address: string;
  readonly tradeType: TradeType;
  readonly taxType: TaxType;
  readonly creditGrade: CreditGrade;
  readonly creditLimit: number;
  readonly paymentTerm: PaymentTerm;
}

export function AccountBusinessPreview({
  name,
  bizNo,
  ceoName,
  bizType,
  bizItem,
  address,
  tradeType,
  taxType,
  creditGrade,
  creditLimit,
  paymentTerm,
}: AccountBusinessPreviewProps) {
  return (
    <div style={cardStyle} aria-label="사업자 정보 미리보기">
      <div style={headStyle}>
        <span style={nameStyle}>{name.trim() === '' ? '(상호 미입력)' : name.trim()}</span>
        <StatusBadge tone={tradeTypeTone(tradeType)} label={tradeTypeLabel(tradeType)} />
      </div>

      <div style={rowStyle}>
        <span style={keyStyle}>사업자번호</span>
        <span style={valueStyle}>{bizNo.trim() === '' ? '—' : formatBizNo(bizNo)}</span>
        <span style={keyStyle}>대표자</span>
        <span style={valueStyle}>{placeholder(ceoName)}</span>
        <span style={keyStyle}>업태 / 종목</span>
        <span style={valueStyle}>{`${placeholder(bizType)} / ${placeholder(bizItem)}`}</span>
        <span style={keyStyle}>과세유형</span>
        <span style={valueStyle}>{taxTypeLabel(taxType)}</span>
        <span style={keyStyle}>사업장</span>
        <span style={valueStyle}>{placeholder(address)}</span>
      </div>

      <div style={badgeRowStyle}>
        <StatusBadge
          tone={creditGradeTone(creditGrade)}
          label={`신용 ${creditGradeLabel(creditGrade)}`}
        />
        <StatusBadge tone="neutral" label={`여신 ${formatWon(creditLimit)}`} />
        <StatusBadge tone="neutral" label={paymentTermLabel(paymentTerm)} />
      </div>
    </div>
  );
}
