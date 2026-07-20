// 쿠폰 카드 실시간 미리보기 (오너 지시 — 고객 노출 모습 확인)
//
// 왼쪽 입력이 바뀌면 오른쪽에서 실제 쿠폰함 카드처럼 즉시 반영한다 — 할인·조건·기간·대상.
// 쿠폰 폼 1곳만 쓰므로 페이지 전용으로 둔다(README 규칙 1 — 소비자 1개).
import type { CSSProperties } from 'react';

import { formatNumber } from '../../../../shared/format';
import { discountLabel, targetLabel } from '../types';
import type { CouponIssueType, CouponTarget } from '../types';
import { cssVar } from '@tds/ui';

const stageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  paddingTop: cssVar('space.5'),
  paddingBottom: cssVar('space.5'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'dashed',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const cardStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  alignItems: 'center',
  gap: cssVar('space.3'),
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: 'calc(var(--tds-space-6) * 12)',
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.action.primary.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const leftStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const discountStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const nameStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  overflowWrap: 'anywhere',
};

const metaStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const dividerStyle: CSSProperties = {
  borderLeftStyle: 'dashed',
  borderLeftWidth: cssVar('border-width.thin'),
  borderLeftColor: cssVar('color.border.default'),
  paddingLeft: cssVar('space.3'),
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

const captionStyle: CSSProperties = {
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

interface CouponCardPreviewProps {
  readonly name: string;
  readonly issueType: CouponIssueType;
  readonly discountValue: number;
  readonly minOrderAmount: number;
  readonly maxDiscount: number;
  readonly target: CouponTarget;
  readonly startAt: string;
  readonly endAt: string;
  readonly enabled: boolean;
}

export function CouponCardPreview({
  name,
  issueType,
  discountValue,
  minOrderAmount,
  maxDiscount,
  target,
  startAt,
  endAt,
  enabled,
}: CouponCardPreviewProps) {
  const conditions: string[] = [];
  if (minOrderAmount > 0) conditions.push(`${formatNumber(minOrderAmount)}원 이상 구매 시`);
  if (issueType === 'percent' && maxDiscount > 0) {
    conditions.push(`최대 ${formatNumber(maxDiscount)}원`);
  }
  conditions.push(targetLabel(target));

  const period = startAt !== '' && endAt !== '' ? `${startAt} ~ ${endAt}` : '사용 기간 미설정';

  return (
    <div>
      <div style={stageStyle}>
        <div style={{ ...cardStyle, opacity: enabled ? 1 : 0.55 }}>
          <div style={leftStyle}>
            <span style={discountStyle}>{discountLabel({ issueType, discountValue })}</span>
            <span style={nameStyle}>{name.trim() === '' ? '쿠폰명' : name}</span>
            <span style={metaStyle}>{conditions.join(' · ')}</span>
            <span style={metaStyle}>{period}</span>
          </div>
          <span style={dividerStyle}>COUPON</span>
        </div>
      </div>

      <p style={captionStyle}>
        {enabled
          ? '발급중 — 고객 쿠폰함에 이 모습으로 노출됩니다.'
          : '중지 — 저장해도 고객에게 발급되지 않습니다.'}
      </p>
    </div>
  );
}
