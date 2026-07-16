// HistoryListPage — 연혁 목록 (라우트: /company/history) · A41 소유
//
// 목록 + 등록/수정 폼(별도 라우트) + 삭제팝업. 연·월 내림차순(최근이 위). 공용 목록 키트를 쓴다.
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { formatNumber } from '../../../shared/format';
import { Button, PlusCircleIcon } from '../../../shared/ui';
import { CrudListShell, useCrudList, type CrudColumn } from '../../../shared/crud';
import { historyAdapter } from './data-source';
import type { HistoryInput, HistoryItem } from './types';

const RESOURCE = 'history';
const ENTITY_LABEL = '연혁';
const LIST_PATH = '/company/history';

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const nameOf = (item: HistoryItem) => `${formatNumber(item.year)}년 ${String(item.month)}월`;

export default function HistoryListPage() {
  const navigate = useNavigate();
  const controller = useCrudList<HistoryItem, HistoryInput>({
    resource: RESOURCE,
    adapter: historyAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });

  const columns: readonly CrudColumn<HistoryItem>[] = [
    { header: '연도', nowrap: true, render: (item) => `${formatNumber(item.year)}년` },
    { header: '월', nowrap: true, render: (item) => `${String(item.month)}월` },
    { header: '내용', render: (item) => item.content },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        연혁 등록
      </Button>
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={controller.items}
      columns={columns}
      nameOf={nameOf}
      selectAllLabelId="history-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
