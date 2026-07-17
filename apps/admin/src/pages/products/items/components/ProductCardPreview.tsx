// 상품 카드 실시간 미리보기 (오너 지시 — 고객 노출 모습 확인)
//
// 왼쪽 입력이 바뀌면 오른쪽에서 실제 스토어 상품 카드처럼 즉시 반영한다 — 이미지·브랜드·상품명·
// 판매가·할인·판매상태 뱃지. 상품 폼 1곳만 쓰므로 페이지 전용으로 둔다(README 규칙 1 — 소비자 1개).
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { ImageIcon, StatusBadge } from '../../../../shared/ui';
import { finalPrice } from '../../_shared/store';
import type { DiscountType, ProductSaleStatus } from '../../_shared/store';
import { saleStatusLabel, saleStatusTone } from '../types';

const formatWon = (value: number): string => `${value.toLocaleString('ko-KR')}원`;

const stageStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxSizing: 'border-box',
  width: '100%',
  paddingTop: 'var(--tds-space-5)',
  paddingBottom: 'var(--tds-space-5)',
  paddingLeft: 'var(--tds-space-4)',
  paddingRight: 'var(--tds-space-4)',
  borderStyle: 'dashed',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: 'calc(var(--tds-space-6) * 9)',
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-lg)',
  background: 'var(--tds-color-surface-default)',
};

const thumbStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  aspectRatio: '1 / 1',
  overflow: 'hidden',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
  color: 'var(--tds-color-text-muted)',
};

const thumbImageStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const soldOutOverlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--tds-color-text-default)',
  opacity: 0.55,
  color: 'var(--tds-color-surface-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

const brandStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const nameStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-medium)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  overflowWrap: 'anywhere',
};

const priceRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  gap: 'var(--tds-space-2)',
};

const rateStyle: CSSProperties = {
  color: 'var(--tds-color-feedback-danger-text)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

const finalPriceStyle: CSSProperties = {
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-title-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  fontVariantNumeric: 'tabular-nums',
};

const originalPriceStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  textDecorationLine: 'line-through',
  fontVariantNumeric: 'tabular-nums',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  flexWrap: 'wrap',
};

const captionStyle: CSSProperties = {
  marginTop: 'var(--tds-space-3)',
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

interface ProductCardPreviewProps {
  readonly name: string;
  readonly brand: string;
  readonly coverImageUrl: string;
  readonly price: number;
  readonly discountType: DiscountType;
  readonly discountValue: number;
  readonly saleStatus: ProductSaleStatus;
  readonly displayed: boolean;
}

export function ProductCardPreview({
  name,
  brand,
  coverImageUrl,
  price,
  discountType,
  discountValue,
  saleStatus,
  displayed,
}: ProductCardPreviewProps) {
  const trimmedImage = coverImageUrl.trim();
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => setLoadFailed(false), [trimmedImage]);

  const pricing = { price, discountType, discountValue, taxable: true };
  const final = finalPrice(pricing);
  const discounted = discountType !== 'none' && discountValue > 0 && final < price;
  const rate =
    discountType === 'percent'
      ? discountValue
      : price > 0
        ? Math.round((1 - final / price) * 100)
        : 0;
  const soldOut = saleStatus === 'sold_out';

  return (
    <div>
      <div style={stageStyle}>
        <div style={{ ...cardStyle, opacity: displayed ? 1 : 0.55 }}>
          <div style={thumbStyle}>
            {trimmedImage !== '' && !loadFailed ? (
              <img
                src={trimmedImage}
                alt=""
                style={thumbImageStyle}
                onError={() => setLoadFailed(true)}
              />
            ) : (
              <ImageIcon aria-hidden="true" />
            )}
            {soldOut && <span style={soldOutOverlayStyle}>품절</span>}
          </div>

          <span style={brandStyle}>{brand.trim() === '' ? '브랜드' : brand}</span>
          <p style={nameStyle}>{name.trim() === '' ? '상품명' : name}</p>

          <div style={priceRowStyle}>
            {discounted && <span style={rateStyle}>{rate}%</span>}
            <span style={finalPriceStyle}>{formatWon(final)}</span>
            {discounted && <span style={originalPriceStyle}>{formatWon(price)}</span>}
          </div>

          <div style={badgeRowStyle}>
            <StatusBadge tone={saleStatusTone(saleStatus)} label={saleStatusLabel(saleStatus)} />
          </div>
        </div>
      </div>

      <p style={captionStyle}>
        {displayed
          ? '전시중 — 고객 스토어에 이 모습으로 노출됩니다.'
          : '숨김 — 저장해도 고객에게 보이지 않습니다.'}
      </p>
    </div>
  );
}
