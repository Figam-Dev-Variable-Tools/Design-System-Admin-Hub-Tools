// RepliesPage — 답변 템플릿 목록 (라우트: /support/replies) · A41 소유
//
// 목록 + 등록/수정(폼 페이지) + 삭제·일괄 삭제. 데이터·선택·삭제 배선은 공용 CRUD 프레임워크
// (useCrudList + CrudListShell). 화면은 검색 툴바와 컬럼(제목·유형 태그·본문 미리보기)만 주입한다.
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, PlusCircleIcon, SearchField, StatusBadge, tdStyle } from '../../../shared/ui';
import { useCrudList, CrudListShell } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';
import { replyTemplateAdapter, TEMPLATE_RESOURCE } from './data-source';
import { searchTemplates } from '../_shared/domain';
import type { ReplyTemplate, ReplyTemplateInput } from '../_shared/domain';

const ENTITY_LABEL = '답변 템플릿';
const LIST_PATH = '/support/replies';
const SELECT_ALL_LABEL_ID = 'support-templates-select-all';

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const bodyPreviewStyle: CSSProperties = {
  ...tdStyle,
  color: 'var(--tds-color-text-muted)',
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
  const [keyword, setKeyword] = useState('');

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
        value={keyword}
        onChange={setKeyword}
        label="제목·본문 검색"
        placeholder="제목 · 본문 검색"
      />
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        템플릿 등록
      </Button>
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
        selectAllLabelId={SELECT_ALL_LABEL_ID}
        toolbar={toolbar}
        onEdit={(template) => navigate(`${LIST_PATH}/${template.id}/edit`)}
      />
    </div>
  );
}
