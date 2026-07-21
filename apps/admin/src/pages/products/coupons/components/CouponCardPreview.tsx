// 쿠폰 카드 실시간 미리보기 (오너 지시 — 고객 노출 모습 확인)
//
// 왼쪽 입력이 바뀌면 오른쪽에서 실제 쿠폰함 카드처럼 즉시 반영한다 — 할인·조건·기간·대상.
// 쿠폰 폼 1곳만 쓰므로 페이지 전용으로 둔다(README 규칙 1 — 소비자 1개).
import type { CSSProperties } from 'react';

import { conditionSummary, discountLabel, targetLabel } from '../types';
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
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
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
  fontSize: cssVar('typography.title.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const nameStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  overflowWrap: 'anywhere',
};

const metaStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const dividerStyle: CSSProperties = {
  borderLeftStyle: 'dashed',
  borderLeftWidth: cssVar('border-width.thin'),
  borderLeftColor: cssVar('color.border.default'),
  paddingLeft: cssVar('space.3'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  textAlign: 'center',
  whiteSpace: 'nowrap',
};

const captionStyle: CSSProperties = {
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

interface CouponCardPreviewProps {
  readonly name: string;
  readonly issueType: CouponIssueType;
  readonly discountValue: number;
  readonly minOrderAmount: number;
  readonly maxDiscount: number;
  readonly stackable: boolean;
  readonly target: CouponTarget;
  /** 사용 기간 문구 — 고정 기간이냐 발급일 기준이냐를 페이지가 규칙(usagePeriodLabel)으로 만든다 */
  readonly periodText: string;
  /** 발급 기준 요약 — 고객에게 보이는 값은 아니지만 운영자가 함께 확인해야 하는 축이다 */
  readonly triggerText: string;
  readonly enabled: boolean;
}

export function CouponCardPreview({
  name,
  issueType,
  discountValue,
  minOrderAmount,
  maxDiscount,
  stackable,
  target,
  periodText,
  triggerText,
  enabled,
}: CouponCardPreviewProps) {
  // 조건 문구의 정본은 순수 규칙이다 — 미리보기와 목록이 다른 말을 하지 않게 한다
  const conditions = `${conditionSummary({ issueType, minOrderAmount, maxDiscount, stackable })} · ${targetLabel(target)}`;

  return (
    <div>
      <div style={stageStyle}>
        <div style={{ ...cardStyle, opacity: enabled ? 1 : 0.55 }}>
          <div style={leftStyle}>
            <span style={discountStyle}>{discountLabel({ issueType, discountValue })}</span>
            <span style={nameStyle}>{name.trim() === '' ? '쿠폰명' : name}</span>
            <span style={metaStyle}>{conditions}</span>
            <span style={metaStyle}>{periodText}</span>
          </div>
          <span style={dividerStyle}>COUPON</span>
        </div>
      </div>

      <p style={captionStyle}>
        {enabled
          ? `발급중 — ${triggerText} 이 모습으로 고객 쿠폰함에 들어갑니다.`
          : '중지 — 저장해도 고객에게 발급되지 않습니다.'}
      </p>
    </div>
  );
}
