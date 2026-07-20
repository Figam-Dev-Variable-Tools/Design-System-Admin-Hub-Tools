// RepliesPage — 답변 템플릿 목록 (라우트: /support/replies)
//
// 목록 + 등록/수정(폼 페이지) + 삭제·일괄 삭제. 데이터·선택·삭제 배선은 공용 CRUD 프레임워크
// (useCrudList + CrudListShell). 화면은 검색 툴바와 컬럼(제목·유형 태그·본문 미리보기)만 주입한다.
//
// [조회 상태의 소유자] 검색어는 이 파일의 useState 였다. 이제 shared/crud 의 useListState 가
// **URL 쿼리스트링**으로 소유한다 (IA-13) — 필터는 없지만 검색어만으로도 같은 손실이 난다:
// '환불' 로 좁혀 템플릿을 고치고 목록으로 돌아오면 검색어가 날아가 처음부터 다시 쳐야 했다.
// 검색은 IME 안전이다 (COMP-10) — 이 화면은 검색이 유일한 조회 수단이라 특히 그렇다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, Icon, SearchField, StatusBadge, tdStyle } from '../../../shared/ui';
import { useCrudList, CrudListShell, useListState } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { replyTemplateAdapter, TEMPLATE_RESOURCE } from './data-source';
import { searchTemplates } from '../_shared/domain';
import type { ReplyTemplate, ReplyTemplateInput } from '../_shared/domain';
import { cssVar } from '@tds/ui';

const ENTITY_LABEL = '답변 템플릿';
const LIST_PATH = '/support/replies';
const SELECT_ALL_LABEL_ID = 'support-templates-select-all';

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const bodyPreviewStyle: CSSProperties = {
  ...tdStyle,
  color: cssVar('color.text.muted'),
  maxWidth: 'calc(var(--tds-space-6) * 12)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function bodyPreview(body: string): string {
  const oneLine = body.replace(/\s+/g, ' ').trim();
  return oneLine.length > 60 ? `${oneLine.slice(0, 60)}…` : oneLine;
}

const COLUMNS: readonly CrudColumn<ReplyTemplate>[] = [
  { header: '제목', render: (template) => template.title },
  {
    header: '유형 태그',
    nowrap: true,
    render: (template) => (
      <StatusBadge
        tone={template.categoryId === '' ? 'neutral' : 'info'}
        label={template.categoryLabel}
      />
    ),
  },
  {
    header: '본문 미리보기',
    render: (template) => <span style={bodyPreviewStyle}>{bodyPreview(template.body)}</span>,
  },
];

export default function RepliesPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();

  // 검색어의 단일 원천 = URL (IA-13). 이 화면엔 필터가 없어 filterDefaults 도 없다.
  const list = useListState();
  const { keyword } = list;

  const controller = useCrudList<ReplyTemplate, ReplyTemplateInput>({
    resource: TEMPLATE_RESOURCE,
    adapter: replyTemplateAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf: (template) => template.title,
  });

  const visibleItems = useMemo(
    () => searchTemplates(controller.items, keyword),
    [controller.items, keyword],
  );

  const toolbar = (
    <div style={toolbarStyle}>
      <SearchField
        value={list.searchInput}
        onChange={list.setSearchInput}
        label="제목·본문 검색"
        placeholder="제목 · 본문 검색"
        // 조합 중 커밋 금지 + Enter 차단 — '환불 안내' 를 치는 도중 '환불 안ㄴ' 로 검색되지 않는다 (COMP-10)
        {...list.searchInputProps}
      />
      {/* 등록 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03) */}
      {canCreate && (
        <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
          <Icon name="plus-circle" />
          템플릿 등록
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
        columns={COLUMNS}
        nameOf={(template) => template.title}
        empty={{
          hasQuery: list.hasQuery,
          onClearSearch: list.clearSearch,
        }}
        selectAllLabelId={SELECT_ALL_LABEL_ID}
        toolbar={toolbar}
        onEdit={(template) => navigate(`${LIST_PATH}/${template.id}/edit`)}
      />
    </div>
  );
}
