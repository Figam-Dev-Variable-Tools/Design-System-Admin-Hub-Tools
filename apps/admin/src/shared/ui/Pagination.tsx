// 페이지네이션 — 이전 / 번호 / 다음 (A40 소유 — apps/admin/src/shared/ui/**)
//
// 번호는 현재 페이지 주변 최대 5개만 보여준다 (497명 = 50페이지라 전부 그리면 줄이 넘친다).
// 도메인을 모른다 — 회원/운영자/적립금 내역 어느 목록이든 label 만 바꿔서 쓴다.
import type { CSSProperties } from 'react';

import { ChevronLeftIcon, ChevronRightIcon } from './icons';
import { visuallyHiddenStyle } from './styles';

/** 한 번에 노출할 번호 개수 */
const WINDOW = 5;

const navStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--tds-space-1)',
};

function pageButtonStyle(active: boolean, disabled: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box',
    minWidth: 'var(--tds-space-6)',
    height: 'var(--tds-space-6)',
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 'var(--tds-space-2)',
    paddingRight: 'var(--tds-space-2)',
    borderStyle: 'solid',
    borderWidth: 'var(--tds-border-width-thin)',
    borderColor: active ? 'var(--tds-color-action-primary-default)' : 'transparent',
    borderRadius: 'var(--tds-radius-md)',
    background: active ? 'var(--tds-color-action-primary-default)' : 'transparent',
    color: disabled
      ? 'var(--tds-color-text-disabled)'
      : active
        ? 'var(--tds-color-text-on-primary)'
        : 'var(--tds-color-text-default)',
    fontFamily: 'var(--tds-typography-label-md-font-family)',
    fontSize: 'var(--tds-typography-label-md-font-size)',
    fontWeight: active
      ? 'var(--tds-primitive-typography-font-weight-bold)'
      : 'var(--tds-primitive-typography-font-weight-regular)',
    lineHeight: 'var(--tds-typography-label-md-line-height)',
    fontVariantNumeric: 'tabular-nums',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

/** 현재 페이지가 가운데 오도록 번호 창을 민다 (양 끝에서는 창이 붙는다) */
function pageWindow(page: number, totalPages: number): readonly number[] {
  const size = Math.min(WINDOW, totalPages);
  let start = page - Math.floor(size / 2);
  if (start < 1) start = 1;
  if (start + size - 1 > totalPages) start = totalPages - size + 1;
  return Array.from({ length: size }, (_, index) => start + index);
}

interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly onChange: (page: number) => void;
  /**
   * nav 의 접근성 이름 — 회원 목록이 기본값이다.
   * 다른 목록(운영자·적립금 내역 등)이 이 컴포넌트를 재사용할 때만 바꾼다.
   */
  readonly label?: string;
}

export function Pagination({
  page,
  totalPages,
  onChange,
  label = '회원 목록 페이지',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);
  const atFirst = page <= 1;
  const atLast = page >= totalPages;

  return (
    <nav style={navStyle} aria-label={label}>
      <button
        type="button"
        className="tds-ui-page tds-ui-focusable"
        style={pageButtonStyle(false, atFirst)}
        disabled={atFirst}
        aria-label="이전 페이지"
        onClick={() => onChange(page - 1)}
      >
        <ChevronLeftIcon />
      </button>

      {pages.map((item) => {
        const active = item === page;
        return (
          <button
            key={item}
            type="button"
            className="tds-ui-page tds-ui-focusable"
            style={pageButtonStyle(active, false)}
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange(item)}
          >
            <span style={visuallyHiddenStyle}>{active ? '현재 페이지, ' : ''}</span>
            {item}
          </button>
        );
      })}

      <button
        type="button"
        className="tds-ui-page tds-ui-focusable"
        style={pageButtonStyle(false, atLast)}
        disabled={atLast}
        aria-label="다음 페이지"
        onClick={() => onChange(page + 1)}
      >
        <ChevronRightIcon />
      </button>
    </nav>
  );
}
