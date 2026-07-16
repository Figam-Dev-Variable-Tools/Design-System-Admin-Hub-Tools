// Pagination — 범위 요약 / 이전 / 번호 창 / 다음 / 크기 선택 (molecule · contracts/Pagination.contract.json@1.1.0)
//
// Props 타입은 계약에서 생성된 generated/types/Pagination.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 번호는 현재 페이지 주변 최대 5개만 보여준다(497명=50페이지라 전부 그리면 줄이 넘친다). 도메인을 모른다 —
// 회원·운영자·적립금 내역 어느 목록이든 label 만 바꿔 쓴다.
//
// [범위·크기 표면은 pageSize opt-in — 하위호환] 한국 ERP grid 는 가시 record 범위와 조정 가능한 page size 를
//   기대한다(ERP-05). 기존 소비자 11곳은 page·totalPages·label·onChange 만 넘기므로, 범위/크기는 pageSize
//   (기본 0 = 미지정)를 받았을 때만 그린다 — 미지정이면 렌더 결과가 1.0.0 과 완전히 동일하다.
//
// [범위 계산은 순수 함수로 분리한다 — rangeTextOf] 경계(첫/마지막 페이지·0건·1페이지·범위 밖 page)의
//   오프-바이-원은 렌더를 거치지 않고 직접 단언한다 (계약 acceptanceCheck: "range math 경계를 unit test 로 커버").
//
// [ko-KR 포맷] 숫자는 toLocaleString('ko-KR') 로 자릿수 구분한다 — SeqCell/SelectionBar 와 같은 규약이다
//   (@tds/ui 는 앱의 shared/format 을 import 할 수 없다 — 경계).
// 시각 값은 전부 semantic 토큰 CSS 변수 — 하드코딩 hex/px 0건. 출처 인라인 스타일을 클래스로 옮긴 것.
import { useId } from 'react';

import { SelectField } from '../../atoms/SelectField';
import type { PaginationProps } from '../../../generated/types/Pagination.types';
import './Pagination.css';

/** 한 번에 노출할 번호 개수 */
const WINDOW = 5;

/** 자릿수 구분 — 목록 요약의 숫자는 늘 ko-KR 규약을 따른다 (SeqCell/SelectionBar 미러) */
function formatNumber(value: number): string {
  return value.toLocaleString('ko-KR');
}

/**
 * 범위 요약 문구 — '전체 N건 중 x–y' (0건이면 '전체 0건').
 *
 * 경계 규약:
 *  - total === 0        → '전체 0건' (x–y 가 없다 — 보이는 행이 없으므로)
 *  - 마지막 페이지       → y 는 total 에서 잘린다 (first+pageSize-1 이 아니라 min(…, total))
 *  - page 가 범위 밖     → 마지막 유효 페이지로 clamp 해서 계산한다 (동시 삭제로 total 이 줄어든 뒤의
 *                          refetch 사이에 '전체 3건 중 11–13' 같은 헛것을 그리지 않는다 — STATE-04 미러)
 *  - pageSize ≤ 0       → 호출 금지(호출부가 opt-in 스위치로 이미 걸러낸다)
 */
export function rangeTextOf(total: number, page: number, pageSize: number): string {
  if (total <= 0) return '전체 0건';
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(page, 1), lastPage);
  const first = (safePage - 1) * pageSize + 1;
  const last = Math.min(first + pageSize - 1, total);
  // EN DASH(–) — 범위 표기의 관례다 (하이픈이 아니다)
  return `전체 ${formatNumber(total)}건 중 ${formatNumber(first)}–${formatNumber(last)}`;
}

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
  total = 0,
  pageSize = 0,
  pageSizeOptions = [],
  sizeLabel = '페이지당',
  onChange,
  onPageSizeChange,
}: PaginationProps) {
  const sizeId = useId();

  // pageSize 가 opt-in 스위치다 — 미지정(0)이면 1.0.0 과 동일하게 번호 줄만 그린다 (하위호환)
  const showRange = pageSize > 0;
  const showSizeSelect = showRange && pageSizeOptions.length > 0;
  const showPages = totalPages > 1;

  // 그릴 것이 하나도 없으면 렌더하지 않는다 (1.0.0 의 'totalPages ≤ 1 → null' 을 그대로 포함한다)
  if (!showRange && !showPages) return null;

  const pages = pageWindow(page, totalPages);
  const atFirst = page <= 1;
  const atLast = page >= totalPages;

  const numbers = showPages ? (
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
  ) : null;

  // 번호 줄만 쓰는 기존 소비자에겐 <nav> 를 그대로 최상위로 돌려준다 — DOM 구조 무변경(하위호환)
  if (!showRange) return numbers;

  return (
    <div className="tds-pagination-bar">
      {/* 페이지/크기를 바꾼 뒤 '지금 몇 번째 행을 보고 있는지'를 AT 에도 알린다 (계약 a11y.range-summary) */}
      <p className="tds-pagination-bar__summary" role="status">
        {rangeTextOf(total, page, pageSize)}
      </p>

      {numbers}

      {showSizeSelect ? (
        <span className="tds-pagination-bar__size">
          <label htmlFor={sizeId} className="tds-pagination-bar__size-label">
            {sizeLabel}
          </label>
          <SelectField
            id={sizeId}
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange?.(Number(event.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={String(size)}>
                {`${formatNumber(size)}건`}
              </option>
            ))}
          </SelectField>
        </span>
      ) : null}
    </div>
  );
}
