// 보유 쿠폰 카드 (A40 소유) — 읽기 전용 목록.
//
// 쿠폰 수에 상한이 없어 카드가 세로로 무한히 늘어나던 자리다 — 목록과 같은 페이지 크기로 나눈다.
import { useState } from 'react';
import type { CSSProperties } from 'react';

import { Card, CardTitle, hintStyle, mutedTextStyle, Pagination } from '../../../shared/ui';
import { PAGE_SIZE } from '../types';
import type { Coupon } from '../types';

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
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
  gap: 'var(--tds-space-3)',
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
};

const nameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  minWidth: 0,
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

interface CouponsCardProps {
  readonly coupons: readonly Coupon[];
}

export function CouponsCard({ coupons }: CouponsCardProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(coupons.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = coupons.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Card aria-labelledby="member-coupons-title">
      <CardTitle id="member-coupons-title">보유 쿠폰</CardTitle>

      {coupons.length === 0 ? (
        <p style={hintStyle}>사용 가능한 쿠폰이 없습니다.</p>
      ) : (
        <>
          <ul style={listStyle}>
            {visible.map((coupon) => (
              <li key={coupon.id} style={itemStyle}>
                <span style={nameStyle}>
                  <span>{coupon.name}</span>
                  <span style={mutedTextStyle}>{`${coupon.expiresAt} 까지`}</span>
                </span>
                <span>{coupon.benefit}</span>
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
