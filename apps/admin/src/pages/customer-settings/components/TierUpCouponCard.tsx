// 카드 4 — 등급 승급 시 발급되는 쿠폰 (읽기 전용 요약)
//
// [왜 읽기 전용인가] '어느 등급으로 올라가면 무엇이 나가는가' 는 **쿠폰이 자기 발급 기준으로
// 선언한 사실**이다(쿠폰 폼의 '발급 기준 = 회원 등급 승급 시'). 여기서 다시 고르게 하면 같은
// 규칙을 두 화면이 각자 들고 있다가 갈라진다 — 한쪽만 바꾼 뒤 왜 쿠폰이 안 나가는지 못 찾는다.
// 그래서 이 카드는 승급 규칙의 **전체 그림을 한자리에서 보여 주고**, 고치러 갈 링크를 준다.
//
// [쿠폰 화면을 import 하지 않는다] pages/customer-settings → pages/products 는 페이지 간 결합이다
// (code-quality 축1, 임계값 0건). 목록은 shared/domain/coupon-issuance 의 조회기가 준다.
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { Card, CardTitle, hintStyle, mutedTextStyle, StatusBadge } from '../../../shared/ui';
import { TIER_LABEL } from '../../../shared/domain/member';
import { couponEditPath } from '../../../shared/domain/coupon-catalog';
import { tierUpCoupons, tierUpCouponsByTier } from '../../../shared/domain/coupon-issuance';
import { TIER_ORDER } from '../types';
import { cssVar } from '@tds/ui';

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  marginTop: 0,
  marginBottom: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
};

const tierStyle: CSSProperties = {
  flexShrink: 0,
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  whiteSpace: 'nowrap',
};

const couponListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: cssVar('space.2'),
  minWidth: 0,
  textAlign: 'right',
};

const couponRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  justifyContent: 'flex-end',
};

export function TierUpCouponCard() {
  // 조회기가 없으면 null — '없다' 와 '모른다' 는 다른 말이다 (coupon-issuance.ts 머리말)
  const coupons = tierUpCoupons();

  return (
    <Card aria-labelledby="tier-up-coupon-title">
      <CardTitle id="tier-up-coupon-title">승급 시 발급 쿠폰</CardTitle>

      {coupons === null ? (
        // 빈 목록으로 뭉개면 운영자는 '걸린 쿠폰이 없다' 는 거짓을 사실로 읽는다
        <p style={hintStyle}>승급 쿠폰 정보를 불러오지 못했습니다.</p>
      ) : (
        <>
          <ul style={listStyle}>
            {TIER_ORDER.map((tier) => {
              const forTier = tierUpCouponsByTier(coupons)[tier];
              return (
                <li key={tier} style={rowStyle}>
                  <span style={tierStyle}>{TIER_LABEL[tier]} 승급 시</span>
                  <span style={couponListStyle}>
                    {forTier.length === 0 ? (
                      <span style={mutedTextStyle}>발급되는 쿠폰 없음</span>
                    ) : (
                      forTier.map((coupon) => (
                        <span key={coupon.couponId} style={couponRowStyle}>
                          <Link
                            to={couponEditPath(coupon.couponId)}
                            className="tds-ui-link tds-ui-focusable"
                          >
                            {coupon.couponName}
                          </Link>
                          <StatusBadge tone="info" label={coupon.benefitLabel} />
                          {/* 중지된 채 걸려 있는 규칙은 숨기지 않는다 — 왜 안 나가는지가 여기서 읽혀야 한다 */}
                          {!coupon.enabled && <StatusBadge tone="neutral" label="발급 중지" />}
                        </span>
                      ))
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <p style={hintStyle}>
            발급 기준은 쿠폰이 소유합니다. 바꾸려면 쿠폰의 <strong>발급 기준</strong>을 &lsquo;회원
            등급 승급 시&rsquo;로 두고 대상 등급을 고르세요.
          </p>
        </>
      )}
    </Card>
  );
}
