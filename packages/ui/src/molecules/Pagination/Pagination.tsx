// Pagination — 이전 / 번호 창 / 다음 (molecule · contracts/Pagination.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/Pagination.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 번호는 현재 페이지 주변 최대 5개만 보여준다(497명=50페이지라 전부 그리면 줄이 넘친다). 도메인을 모른다 —
// 회원·운영자·적립금 내역 어느 목록이든 label 만 바꿔 쓴다. totalPages ≤ 1 이면 아무것도 렌더하지 않는다.
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건. 출처 인라인 스타일을 클래스로 옮긴 것.
import type { PaginationProps } from '../../../generated/types/Pagination.types';
import './Pagination.css';

/** 한 번에 노출할 번호 개수 */
const WINDOW = 5;

/** 왼쪽 화살표 — 아이콘 자산 패키지에 의존하지 않는 인라인 SVG (currentColor·1.25em, 장식) */
function ChevronLeftGlyph() {
  return (
    <svg
      className="tds-pagination__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}

/** 오른쪽 화살표 */
function ChevronRightGlyph() {
  return (
    <svg
      className="tds-pagination__glyph"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** 현재 페이지가 가운데 오도록 번호 창을 민다 (양 끝에서는 창이 붙는다) */
function pageWindow(page: number, totalPages: number): readonly number[] {
  const size = Math.min(WINDOW, totalPages);
  let start = page - Math.floor(size / 2);
  if (start < 1) start = 1;
  if (start + size - 1 > totalPages) start = totalPages - size + 1;
  return Array.from({ length: size }, (_, index) => start + index);
}

export function Pagination({
  page,
  totalPages,
  label = '회원 목록 페이지',
  onChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);
  const atFirst = page <= 1;
  const atLast = page >= totalPages;

  return (
    <nav className="tds-pagination" aria-label={label}>
      <button
        type="button"
        className="tds-pagination__page"
        disabled={atFirst}
        aria-label="이전 페이지"
        onClick={() => onChange?.(page - 1)}
      >
        <ChevronLeftGlyph />
      </button>

      {pages.map((item) => {
        const active = item === page;
        return (
          <button
            key={item}
            type="button"
            className={
              active ? 'tds-pagination__page tds-pagination__page--active' : 'tds-pagination__page'
            }
            aria-current={active ? 'page' : undefined}
            onClick={() => onChange?.(item)}
          >
            <span className="tds-pagination__sr">{active ? '현재 페이지, ' : ''}</span>
            {item}
          </button>
        );
      })}

      <button
        type="button"
        className="tds-pagination__page"
        disabled={atLast}
        aria-label="다음 페이지"
        onClick={() => onChange?.(page + 1)}
      >
        <ChevronRightGlyph />
      </button>
    </nav>
  );
}
