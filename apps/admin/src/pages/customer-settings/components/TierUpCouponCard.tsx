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
import { couponEditPath } from '../../../shared/domain/coupon-catalog';
import { tierUpCoupons, tierUpCouponsByTier } from '../../../shared/domain/coupon-issuance';
import { isBuiltInTierId } from '../types';
import type { TierDraftRow } from '../types';
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

interface TierUpCouponCardProps {
  /** 지금 편집 중인 등급 목록(초안) — 추가한 등급도 이 카드에 자기 줄을 갖는다 */
  readonly tiers: readonly TierDraftRow[];
}

export function TierUpCouponCard({ tiers }: TierUpCouponCardProps) {
  // 조회기가 없으면 null — '없다' 와 '모른다' 는 다른 말이다 (coupon-issuance.ts 머리말)
  const coupons = tierUpCoupons();

  return (
    <Card aria-labelledby="tier-up-coupon-title">
      <CardTitle id="tier-up-coupon-title">승급 시 발급 쿠폰</CardTitle>

      {coupons === null ? (
        // 빈 목록으로 뭉개면 운영자는 '걸린 쿠폰이 없다' 는 거짓을 사실로 읽는다
        <p style={hintStyle}>승급 쿠폰 정보를 불러오지 못했어요.</p>
      ) : (
        <>
          <ul style={listStyle}>
            {tiers.map((tier) => {
              /**
               * [추가한 등급은 아직 쿠폰을 걸 수 없다 — 숨기지 않고 말한다]
               * 쿠폰의 '회원 등급 승급 시' 트리거가 드는 값은 기본 제공 등급 3종의 유니온이다
               * (pages/products/coupons 의 CouponTrigger). 그래서 방금 만든 등급은 쿠폰 폼의
               * 선택지에 나타나지 않는다. 이 줄을 빼면 운영자는 '아직 안 걸었나 보다' 로 읽고
               * 쿠폰 화면에서 없는 선택지를 찾아 헤맨다 — 사실을 그 자리에서 말한다.
               */
              const forTier = isBuiltInTierId(tier.id)
                ? tierUpCouponsByTier(coupons)[tier.id]
                : null;
              return (
                <li key={tier.id} style={rowStyle}>
                  <span style={tierStyle}>{tier.label} 승급 시</span>
                  <span style={couponListStyle}>
                    {forTier === null ? (
                      <span style={mutedTextStyle}>
                        쿠폰 발급 기준이 아직 이 등급을 고를 수 없어요
                      </span>
                    ) : forTier.length === 0 ? (
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
            발급 기준은 쿠폰이 소유해요. 바꾸려면 쿠폰의 <strong>발급 기준</strong>을 &lsquo;회원
            등급 승급 시&rsquo;로 두고 대상 등급을 고르세요.
          </p>
          {tiers.some((tier) => !isBuiltInTierId(tier.id)) && (
            <p style={hintStyle}>
              추가한 등급은 아직 쿠폰의 발급 기준에서 고를 수 없어요 — 쿠폰은 기본 제공 등급 3종만
              알아요. 그 등급으로 올라간 회원에게는 승급 쿠폰이 나가지 않아요.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
