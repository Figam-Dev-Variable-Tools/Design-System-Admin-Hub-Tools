// DownloadListPage — 자료실 목록 (라우트: /support/downloads) · A41 소유
//
// 목록 + 등록/수정(폼) + 삭제·일괄 삭제. 데이터·선택·삭제 배선은 공용 CRUD 프레임워크
// (useCrudList + CrudListShell). 목록엔 이미지 열을 넣지 않는다 — 파일은 상세/폼 업로드로만 다룬다.
// 노출 토글은 목록에서 바로 바꾼다(useCrudRowUpdate). 카테고리·노출 필터 + 검색 툴바.
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import {
  Button,
  numericCellStyle,
  PlusCircleIcon,
  SearchField,
  SelectField,
  StatusBadge,
  tdStyle,
  ToggleSwitch,
} from '../../../shared/ui';
import { useCrudList, CrudListShell, useCrudRowUpdate } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
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

const ENTITY_LABEL = '자료';
const LIST_PATH = '/support/downloads';
const SELECT_ALL_LABEL_ID = 'support-downloads-select-all';

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  flexWrap: 'wrap',
};

const spacerStyle: CSSProperties = { flex: 1 };

const selectWrapStyle: CSSProperties = { width: 'calc(var(--tds-space-6) * 3.5)' };

const fileCellStyle: CSSProperties = { ...tdStyle, color: 'var(--tds-color-text-muted)' };

const VISIBILITY_OPTIONS: readonly { readonly id: VisibilityFilter; readonly label: string }[] = [
  { id: 'all', label: '전체 노출상태' },
  { id: 'visible', label: '노출' },
  { id: 'hidden', label: '숨김' },
] as const;

export default function DownloadListPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState<CategoryFilter>(DOWNLOAD_FILTER_ALL);
  const [visibility, setVisibility] = useState<VisibilityFilter>('all');
  const [keyword, setKeyword] = useState('');

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
        value={keyword}
        onChange={setKeyword}
        label="제목·파일명 검색"
        placeholder="제목 · 파일명 검색"
      />
      <span style={selectWrapStyle}>
        <SelectField
          value={category}
          onChange={(event) => setCategory(event.target.value)}
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
          onChange={(event) => {
            const next = event.target.value;
            if (next === 'all' || next === 'visible' || next === 'hidden') setVisibility(next);
          }}
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
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        자료 등록
      </Button>
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
        selectAllLabelId={SELECT_ALL_LABEL_ID}
        toolbar={toolbar}
        onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
      />
    </div>
  );
}
