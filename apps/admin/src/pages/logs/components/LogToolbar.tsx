// 목록 상단 툴바 — 검색 + 페이지 크기 + 내보내기 (apps/admin/src/pages/logs/**)
//
// [IA-04] 목록 템플릿의 toolbar row: 검색은 좌측, 액션은 우상단.
// 감사 로그에는 '등록' 이 없으므로 우상단의 primary 자리는 **내보내기**가 갖는다 —
// 이 화면에서 운영자가 시작할 수 있는 유일한 작업이다.
//
// [COMP-03] 검색은 DS <SearchField> 다. raw <input type="search"> 에 아이콘을 절대 위치로
// 얹어 재구현하지 않는다 (로그인 이력이 그렇게 만들었고, 그것이 COMP-03 이 지적한 바로 그 이탈이다).
//
// [COMP-10 — 한글 IME] 조합 판정·Enter 차단은 공유 useDebouncedSearch 가 갖는다 —
// 이 컴포넌트는 그 핸들러 묶음을 SearchField 의 native 패스스루로 <input> 에 흘리기만 한다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import {
  Button,
  DownloadIcon,
  SearchField,
  SelectField,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import type { DebouncedSearch } from '../../../shared/crud';
import { PAGE_SIZE_OPTIONS } from '../types';
import type { PageSize } from '../types';

const barStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: 'calc(var(--tds-space-6) * 14)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

const sizeWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

interface LogToolbarProps {
  readonly search: DebouncedSearch;
  readonly searchLabel: string;
  readonly searchPlaceholder: string;
  readonly pageSize: PageSize;
  readonly onPageSizeChange: (size: PageSize) => void;
  readonly exporting: boolean;
  /** 내보내기 권한이 없으면 버튼 자체를 렌더하지 않는다 (EXC-03) */
  readonly canExport: boolean;
  readonly onExport: () => void;
  readonly onCancelExport: () => void;
}

export function LogToolbar({
  search,
  searchLabel,
  searchPlaceholder,
  pageSize,
  onPageSizeChange,
  exporting,
  canExport,
  onExport,
  onCancelExport,
}: LogToolbarProps) {
  const sizeId = useId();

  return (
    <div style={barStyle}>
      <div style={searchWrapStyle}>
        <SearchField
          label={searchLabel}
          placeholder={searchPlaceholder}
          value={search.input}
          onChange={search.setInput}
          {...search.inputProps}
        />
      </div>

      <div style={actionsStyle}>
        {/* ERP-05 — 페이지 크기. 상한(100)은 ERP-15 의 렌더 계약이다: 그 이상은 CSV 로 받는다 */}
        <div style={sizeWrapStyle}>
          <label htmlFor={sizeId} style={visuallyHiddenStyle}>
            페이지당 행 수
          </label>
          <SelectField
            id={sizeId}
            value={String(pageSize)}
            onChange={(event) => onPageSizeChange(Number(event.target.value) as PageSize)}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={String(size)}>
                {`${String(size)}줄씩`}
              </option>
            ))}
          </SelectField>
        </div>

        {/* 내보내는 중에는 그만둘 수 있어야 한다 — 90일치는 길다 (ERP-12 cancel 경로).
            취소는 실패가 아니므로 토스트를 띄우지 않는다 (EXC-09 — 셸의 isAbort 판정). */}
        {exporting && (
          <Button variant="ghost" onClick={onCancelExport}>
            취소
          </Button>
        )}

        {canExport && (
          <Button
            variant="secondary"
            loading={exporting}
            iconLeft={<DownloadIcon />}
            onClick={onExport}
          >
            내보내기
          </Button>
        )}
      </div>
    </div>
  );
}
