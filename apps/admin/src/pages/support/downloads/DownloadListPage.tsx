// DownloadListPage — 자료실 목록 (라우트: /support/downloads)
//
// 목록 + 등록/수정(폼) + 삭제·일괄 삭제. 데이터·선택·삭제 배선은 공용 CRUD 프레임워크
// (useCrudList + CrudListShell). 목록엔 이미지 열을 넣지 않는다 — 파일은 상세/폼 업로드로만 다룬다.
// 노출 토글은 목록에서 바로 바꾼다(useCrudRowUpdate). 카테고리·노출 필터 + 검색 툴바.
//
// [조회 상태의 소유자] 카테고리·노출·검색어는 이 파일의 useState 3개였다. 이제 shared/crud 의
// useListState 가 **URL 쿼리스트링**으로 소유한다 (IA-13) — '숨김 자료만' 으로 걸러 한 건을 수정하고
// 목록으로 돌아오면 그 정리 작업 view 가 그대로다(예전엔 전체 목록 처음으로 튕겨 매번 다시 걸었다).
// 검색은 IME 안전이다 (COMP-10).
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import {
  Button,
  Icon,
  numericCellStyle,
  SearchField,
  SelectField,
  StatusBadge,
  tdStyle,
  ToggleSwitch,
} from '../../../shared/ui';
import {
  useCrudList,
  CrudListShell,
  parseFilter,
  useCrudRowUpdate,
  useListState,
} from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { downloadAdapter, DOWNLOAD_RESOURCE } from './data-source';
import {
  DOWNLOAD_CATEGORY_OPTIONS,
  DOWNLOAD_FILTER_ALL,
  fileKindLabel,
  filterDownloads,
  formatBytes,
  searchDownloads,
  toDownloadInput,
  visibilityLabel,
} from './types';
import type { CategoryFilter, DownloadInput, DownloadItem, VisibilityFilter } from './types';
import { cssVar } from '@tds/ui';

const ENTITY_LABEL = '자료';
const LIST_PATH = '/support/downloads';
const SELECT_ALL_LABEL_ID = 'support-downloads-select-all';

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const spacerStyle: CSSProperties = { flex: 1 };

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 3.5)' };

const fileCellStyle: CSSProperties = { ...tdStyle, color: cssVar('color.text.muted') };

const VISIBILITY_OPTIONS: readonly { readonly id: VisibilityFilter; readonly label: string }[] = [
  { id: 'all', label: '전체 노출상태' },
  { id: 'visible', label: '노출' },
  { id: 'hidden', label: '숨김' },
] as const;
const VISIBILITY_FILTER_VALUES: readonly VisibilityFilter[] = VISIBILITY_OPTIONS.map(
  (option) => option.id,
);

/** URL 파라미터 기본값 — 기본값과 같은 값은 URL 에서 지운다(공유 링크를 짧게 · IA-13) */
const FILTER_DEFAULTS = { category: DOWNLOAD_FILTER_ALL, visibility: 'all' } as const;

export default function DownloadListPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  // 카테고리·노출·검색어의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 카테고리는 서버가 주는 자유 문자열이라 좁힐 유니온이 없다 — 모르는 값은 filterDownloads 가
  // '일치하는 자료 없음' 으로 흘려보낸다(빈 목록일 뿐, 조회가 깨지지 않는다).
  const category: CategoryFilter = list.filters['category'] ?? DOWNLOAD_FILTER_ALL;
  // 노출 상태는 닫힌 유니온이다 — 손으로 고친 ?visibility=거짓말 은 '전체'로 되돌린다
  const visibility: VisibilityFilter = parseFilter(
    list.filters['visibility'] ?? 'all',
    VISIBILITY_FILTER_VALUES,
    'all',
  );
  const { keyword } = list;

  const controller = useCrudList<DownloadItem, DownloadInput>({
    resource: DOWNLOAD_RESOURCE,
    adapter: downloadAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf: (item) => item.title,
  });

  const rowUpdate = useCrudRowUpdate(DOWNLOAD_RESOURCE, downloadAdapter);

  const visibleItems = useMemo(
    () => searchDownloads(filterDownloads(controller.items, category, visibility), keyword),
    [controller.items, category, visibility, keyword],
  );

  const onToggleVisible = (item: DownloadItem, next: boolean) => {
    rowUpdate.run(
      item.id,
      { ...toDownloadInput(item), visible: next },
      {
        success: next ? `'${item.title}' 를 노출합니다.` : `'${item.title}' 를 숨겼습니다.`,
        failure: '노출 상태를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.',
      },
    );
  };

  const columns: readonly CrudColumn<DownloadItem>[] = [
    { header: '제목', render: (item) => item.title },
    {
      header: '카테고리',
      nowrap: true,
      render: (item) => <StatusBadge tone="info" label={item.categoryLabel} />,
    },
    {
      header: '파일',
      render: (item) => (
        <span style={fileCellStyle}>
          {`${item.fileName} · ${fileKindLabel(item.fileKind)} · ${formatBytes(item.fileSize)}`}
        </span>
      ),
    },
    {
      header: '버전',
      nowrap: true,
      render: (item) => (item.version.trim() === '' ? '-' : item.version),
    },
    {
      header: '다운로드수',
      numeric: true,
      render: (item) => <span style={numericCellStyle}>{formatNumber(item.downloadCount)}</span>,
    },
    {
      header: '노출',
      nowrap: true,
      render: (item) => (
        <ToggleSwitch
          checked={item.visible}
          label={`${item.title} 노출 여부`}
          busy={rowUpdate.pendingId === item.id}
          onLabel={visibilityLabel(true)}
          offLabel={visibilityLabel(false)}
          onChange={(next) => onToggleVisible(item, next)}
        />
      ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <SearchField
        value={list.searchInput}
        onChange={list.setSearchInput}
        label="제목·파일명 검색"
        placeholder="제목 · 파일명 검색"
        // 조합 중 커밋 금지 + Enter 차단 — '설치 매뉴얼' 을 치는 도중 '설치 매뉴ㅇ' 로 검색되지 않는다 (COMP-10)
        {...list.searchInputProps}
      />
      <span style={selectWrapStyle}>
        <SelectField
          value={category}
          onChange={(event) => list.setFilter('category', event.target.value)}
          aria-label="카테고리로 거르기"
        >
          <option value={DOWNLOAD_FILTER_ALL}>전체 카테고리</option>
          {DOWNLOAD_CATEGORY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
      <span style={selectWrapStyle}>
        <SelectField
          value={visibility}
          onChange={(event) => list.setFilter('visibility', event.target.value)}
          aria-label="노출 상태로 거르기"
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
      <span style={spacerStyle} />
      {/* 등록 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03) */}
      {canCreate && (
        <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
          <Icon name="plus-circle" />
          자료 등록
        </Button>
      )}
    </div>
  );

  return (
    <div style={columnStyle}>
      <CrudListShell
        entityLabel={ENTITY_LABEL}
        controller={controller}
        visibleItems={visibleItems}
        columns={columns}
        nameOf={(item) => item.title}
        empty={{
          hasQuery: list.hasQuery,
          onClearSearch: list.clearSearch,
        }}
        selectAllLabelId={SELECT_ALL_LABEL_ID}
        toolbar={toolbar}
        onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
      />
    </div>
  );
}
