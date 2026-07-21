// 보유 쿠폰 카드 — 읽기 전용 목록.
//
// 쿠폰 수에 상한이 없어 카드가 세로로 무한히 늘어나던 자리다 — 목록과 같은 페이지 크기로 나눈다.
//
// [행이 무엇을 들고 있나] 회원이 들고 있는 것은 쿠폰의 정의가 아니라 **발급 1건**(IssuedCoupon)이다.
// 이름·혜택·만료일은 상품 관리 쿠폰이 정본이라 카탈로그에서 조인해 온다 — 이 카드는 그 모듈을
// import 하지 않는다(페이지 간 결합). 조회기의 자리는 shared/domain/coupon-catalog 다.
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import { Card, CardTitle, hintStyle, mutedTextStyle, Pagination } from '../../../shared/ui';
import { PAGE_SIZE } from '../types';
import { joinIssuedCoupons } from '../../../shared/domain/member';
import type { HeldCoupon, IssuedCoupon } from '../../../shared/domain/member';
import { couponCatalog, couponEditPath } from '../../../shared/domain/coupon-catalog';
import { cssVar } from '@tds/ui';

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

const itemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
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

const nameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

/**
 * 두 번째 줄 문구 — 이미 쓴 쿠폰은 '언제까지' 가 아니라 '언제 썼는지' 가 필요한 정보다.
 * 만료일을 모르는 경우(카탈로그에서 사라진 쿠폰)는 발급일을 대신 보여 준다 — 지어내지 않는다.
 */
function periodText(coupon: HeldCoupon): string {
  if (coupon.usedAt !== null) return `${coupon.usedAt} 사용`;
  if (coupon.expiresAt !== null) return `${coupon.expiresAt} 까지`;
  return `${coupon.issuedAt} 발급`;
}

interface CouponsCardProps {
  readonly coupons: readonly IssuedCoupon[];
}

export function CouponsCard({ coupons }: CouponsCardProps) {
  const [page, setPage] = useState(1);

  // 조회기가 없으면 null — '쿠폰이 없다' 와 '쿠폰을 모른다' 는 다른 말이다(coupon-catalog.ts 머리말)
  const catalog = couponCatalog();
  const held = catalog === null ? null : joinIssuedCoupons(coupons, catalog);

  const totalPages = Math.max(1, Math.ceil(coupons.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible =
    held === null ? [] : held.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Card aria-labelledby="member-coupons-title">
      <CardTitle id="member-coupons-title">보유 쿠폰</CardTitle>

      {held === null ? (
        // 빈 목록으로 뭉개면 운영자는 '이 회원은 쿠폰이 없다' 는 **거짓을 사실로** 읽는다
        <p style={hintStyle}>쿠폰 정보를 불러오지 못했습니다.</p>
      ) : held.length === 0 ? (
        <p style={hintStyle}>사용 가능한 쿠폰이 없습니다.</p>
      ) : (
        <>
          <ul style={listStyle}>
            {visible.map((coupon) => (
              <li key={coupon.couponId} style={itemStyle}>
                <span style={nameStyle}>
                  {/* 발급은 언제나 원본 쿠폰을 가리킨다 — 눌러서 그 정의로 건너뛴다 */}
                  <Link
                    to={couponEditPath(coupon.couponId)}
                    className="tds-ui-link tds-ui-focusable"
                  >
                    {coupon.name ?? `삭제된 쿠폰 (${coupon.couponId})`}
                  </Link>
                  <span style={mutedTextStyle}>{periodText(coupon)}</span>
                </span>
                <span>{coupon.benefitLabel ?? '—'}</span>
              </li>
            ))}
          </ul>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
            label="보유 쿠폰 페이지"
          />
        </>
      )}
    </Card>
  );
}
