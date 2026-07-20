// 계약서 요약 미리보기
//
// 입력한 계약 정보를 계약서 표제부처럼 요약해 보여준다. 계약 폼 1곳만 쓰므로 페이지 전용이다.
import type { CSSProperties } from 'react';

import { StatusBadge } from '../../../../shared/ui';
import { formatWon } from '../../_shared/business';
import { contractStatusMeta, contractTypeLabel, signStatusLabel, signStatusTone } from '../types';
import type { ContractStatus, ContractType, SignStatus } from '../types';
import { cssVar } from '@tds/ui';

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const titleStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontFamily: 'var(--tds-typography-title-md-font-family)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-typography-title-md-font-weight)',
  lineHeight: 'var(--tds-typography-title-md-line-height)',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(calc(var(--tds-space-6) * 2), auto) minmax(0, 1fr)',
  columnGap: cssVar('space.3'),
  rowGap: cssVar('space.2'),
};

const keyStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-sm-font-size)',
};

const valueStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontVariantNumeric: 'tabular-nums',
  overflowWrap: 'anywhere',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

interface ContractSummaryPreviewProps {
  readonly title: string;
  readonly accountName: string;
  readonly contractType: ContractType;
  readonly startAt: string;
  readonly endAt: string;
  readonly amount: number;
  readonly vatIncluded: boolean;
  readonly autoRenew: boolean;
  readonly status: ContractStatus;
  readonly signStatus: SignStatus;
}

export function ContractSummaryPreview({
  title,
  accountName,
  contractType,
  startAt,
  endAt,
  amount,
  vatIncluded,
  autoRenew,
  status,
  signStatus,
}: ContractSummaryPreviewProps) {
  const statusMeta = contractStatusMeta(status);
  const period = startAt !== '' && endAt !== '' ? `${startAt} ~ ${endAt}` : '—';

  return (
    <div style={cardStyle} aria-label="계약서 요약 미리보기">
      <span style={titleStyle}>{title.trim() === '' ? '(계약명 미입력)' : title.trim()}</span>

      <div style={badgeRowStyle}>
        <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />
        <StatusBadge
          tone={signStatusTone(signStatus)}
          label={`서명 ${signStatusLabel(signStatus)}`}
        />
        {autoRenew && <StatusBadge tone="info" label="자동갱신" />}
      </div>

      <div style={rowStyle}>
        <span style={keyStyle}>거래처</span>
        <span style={valueStyle}>{accountName.trim() === '' ? '—' : accountName.trim()}</span>
        <span style={keyStyle}>계약유형</span>
        <span style={valueStyle}>{contractTypeLabel(contractType)}</span>
        <span style={keyStyle}>계약기간</span>
        <span style={valueStyle}>{period}</span>
        <span style={keyStyle}>계약금액</span>
        <span style={valueStyle}>
          {formatWon(amount)}
          <span style={keyStyle}>{vatIncluded ? ' (부가세 포함)' : ' (부가세 별도)'}</span>
        </span>
      </div>
    </div>
  );
}
