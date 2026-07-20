// 보유 쿠폰 카드 — 읽기 전용 목록.
//
// 쿠폰 수에 상한이 없어 카드가 세로로 무한히 늘어나던 자리다 — 목록과 같은 페이지 크기로 나눈다.
import { useState } from 'react';
import type { CSSProperties } from 'react';

import { Card, CardTitle, hintStyle, mutedTextStyle, Pagination } from '../../../shared/ui';
import { PAGE_SIZE } from '../types';
import type { Coupon } from '../types';
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
