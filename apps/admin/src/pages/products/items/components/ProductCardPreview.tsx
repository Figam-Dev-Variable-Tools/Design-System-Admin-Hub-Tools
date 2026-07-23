// 상품 카드 실시간 미리보기 (오너 지시 — 고객 노출 모습 확인)
//
// 왼쪽 입력이 바뀌면 오른쪽에서 실제 스토어 상품 카드처럼 즉시 반영한다 — 이미지·브랜드·상품명·
// 판매가·할인·판매상태 뱃지. 상품 폼 1곳만 쓰므로 페이지 전용으로 둔다(README 규칙 1 — 소비자 1개).
import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

import { buttonStyle, Icon, StatusBadge } from '../../../../shared/ui';
import type { CheckoutCtaKind } from '../../../../shared/commerce/payment-settings';
import { finalPrice } from '../../_shared/store';
import type { DiscountType, ProductSaleStatus } from '../../_shared/store';
import { saleStatusLabel, saleStatusTone } from '../types';
import { cssVar } from '@tds/ui';

const formatWon = (value: number): string => `${value.toLocaleString('ko-KR')}원`;

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
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  boxSizing: 'border-box',
  width: '100%',
  maxWidth: `calc(${cssVar('space.6')} * 9)`,
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const thumbStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  aspectRatio: '1 / 1',
  overflow: 'hidden',
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
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
  background: cssVar('color.text.default'),
  opacity: 0.55,
  color: cssVar('color.surface.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const brandStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const nameStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
};

const priceRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  flexWrap: 'wrap',
  gap: cssVar('space.2'),
};

const rateStyle: CSSProperties = {
  color: cssVar('color.feedback.danger.text'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const finalPriceStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.title.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  fontVariantNumeric: 'tabular-nums',
};

const originalPriceStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  textDecorationLine: 'line-through',
  fontVariantNumeric: 'tabular-nums',
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

/** 결제로 가는 버튼은 주 동작(primary), 문의로 가는 버튼은 보조(secondary) — 위계가 갈린다 */
function ctaStyle(kind: CheckoutCtaKind): CSSProperties {
  return { ...buttonStyle(kind === 'purchase' ? 'primary' : 'secondary'), width: '100%' };
}

const captionStyle: CSSProperties = {
  marginTop: cssVar('space.3'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
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
  /**
   * 구매 버튼의 글자·성격 — **이 컴포넌트가 정하지 않는다.**
   *
   * 결제(PG) 설정에 따라 '구매하기' 가 되기도 하고 '문의하기' 가 되기도 한다. 그 판정은
   * shared/commerce 의 checkoutCta 하나뿐이고(프로그램 화면도 같은 함수를 쓴다), 미리보기는
   * 결과만 받아 그린다 — 여기서 조건을 한 번 더 쓰면 고객 화면과 다른 버튼을 보여 주게 된다.
   */
  readonly ctaLabel: string;
  readonly ctaKind: CheckoutCtaKind;
  /**
   * 금액 자리에 넣을 문구 — 빈 문자열이면 금액을 그린다.
   *
   * 이 컴포넌트가 정하지 않는다: 금액을 노출하는가를 판정하는 것은 shared/commerce 의
   * resolvePriceDisplay 하나뿐이고, 그 답은 **사이트 전역 결제 연동 상태**에서 나온다(상품마다
   * 고르던 축은 없다). 목록도 같은 함수의 답을 그리므로 미리보기와 목록이 어긋날 수 없다 —
   * 여기서 조건을 한 번 더 쓰면 그 보장이 사라진다.
   */
  readonly priceText: string;
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
  ctaLabel,
  ctaKind,
  priceText,
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
        {/* 숨김을 opacity 로 흐리지 않는다 — 컨테이너 opacity 는 안의 글자를 배경으로 합성해 대비를
            4.5:1 아래로 떨어뜨린다(axe color-contrast). 숨김은 아래 캡션이 글자로 전한다. */}
        <div style={cardStyle}>
          <div style={thumbStyle}>
            {trimmedImage !== '' && !loadFailed ? (
              <img
                src={trimmedImage}
                alt=""
                style={thumbImageStyle}
                onError={() => setLoadFailed(true)}
              />
            ) : (
              <Icon name="image" />
            )}
            {soldOut && <span style={soldOutOverlayStyle}>품절</span>}
          </div>

          <span style={brandStyle}>{brand.trim() === '' ? '브랜드' : brand}</span>
          <p style={nameStyle}>{name.trim() === '' ? '상품명' : name}</p>

          {/* 금액 칸 — 문구로 대체된 상품은 할인율·정가까지 함께 감춘다.
              금액을 지우면서 '20% 할인' 만 남기면 고객은 무엇에서 20% 인지 알 수 없다. */}
          <div style={priceRowStyle}>
            {priceText === '' ? (
              <>
                {discounted && <span style={rateStyle}>{rate}%</span>}
                <span style={finalPriceStyle}>{formatWon(final)}</span>
                {discounted && <span style={originalPriceStyle}>{formatWon(price)}</span>}
              </>
            ) : (
              <span style={finalPriceStyle}>{priceText}</span>
            )}
          </div>

          <div style={badgeRowStyle}>
            <StatusBadge tone={saleStatusTone(saleStatus)} label={saleStatusLabel(saleStatus)} />
          </div>

          {/* 고객이 누르는 자리. 미리보기라 진짜 버튼이 아니다 — DS 버튼의 시각 토큰만 빌린
              <span> 이다(누를 것이 없는 자리에 버튼을 두면 눌러 보고 아무 일도 없는 것을 확인하게 된다). */}
          <span style={ctaStyle(ctaKind)}>{ctaLabel}</span>
        </div>
      </div>

      <p style={captionStyle}>
        {displayed
          ? '전시중 — 고객 스토어에 이 모습으로 노출돼요.'
          : '숨김 — 저장해도 고객에게 보이지 않아요.'}
      </p>
    </div>
  );
}
