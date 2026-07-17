// CertificatesListPage — 인증서/특허 목록 (라우트: /company/certificates)
//
// 목록 + 등록/수정 폼(별도 라우트) + 삭제팝업. 구분(인증서/특허) 필터. 공용 목록 키트를 쓴다.
import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button, ImageThumb, PlusCircleIcon, SelectField, StatusBadge } from '../../../shared/ui';
import { CrudListShell, parseFilter, useCrudList, type CrudColumn } from '../../../shared/crud';
import { certificatesAdapter } from './data-source';
import {
  CERT_FILTER_ALL,
  CERT_KIND_OPTIONS,
  certKindLabel,
  certKindTone,
  filterCertificates,
} from './types';
import type { CertFilter, CertInput, CertItem } from './types';

const RESOURCE = 'certificates';
const ENTITY_LABEL = '인증서/특허';
const LIST_PATH = '/company/certificates';
const CERT_FILTER_VALUES: readonly CertFilter[] = [
  CERT_FILTER_ALL,
  ...CERT_KIND_OPTIONS.map((option) => option.id),
];

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const filterWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

const filterSelectStyle: CSSProperties = {
  width: 'calc(var(--tds-space-6) * 6)',
};

const nameOf = (item: CertItem) => item.name;

export default function CertificatesListPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CertFilter>(CERT_FILTER_ALL);

  const controller = useCrudList<CertItem, CertInput>({
    resource: RESOURCE,
    adapter: certificatesAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear } = controller;

  // 필터가 바뀌면 보이지 않는 행의 선택이 남지 않게 비운다
  useEffect(() => {
    clear();
  }, [filter, clear]);

  const visible = useMemo(
    () => filterCertificates(controller.items, filter),
    [controller.items, filter],
  );

  const columns: readonly CrudColumn<CertItem>[] = [
    {
      header: '이미지',
      render: (item) => <ImageThumb src={item.imageUrl} alt={`${item.name} 이미지`} />,
    },
    { header: '명칭', render: (item) => item.name },
    { header: '발급기관', nowrap: true, render: (item) => item.issuer },
    { header: '발급일', nowrap: true, render: (item) => item.issuedOn },
    {
      header: '구분',
      nowrap: true,
      render: (item) => (
        <StatusBadge tone={certKindTone(item.kind)} label={certKindLabel(item.kind)} />
      ),
    },
  ];

  const toolbar = (
    <div style={toolbarStyle}>
      <div style={filterWrapStyle}>
        <span style={filterSelectStyle}>
          <SelectField
            aria-label="구분 필터"
            value={filter}
            onChange={(event) =>
              setFilter(parseFilter(event.target.value, CERT_FILTER_VALUES, CERT_FILTER_ALL))
            }
          >
            <option value={CERT_FILTER_ALL}>전체</option>
            {CERT_KIND_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
        <PlusCircleIcon />
        인증서/특허 등록
      </Button>
    </div>
  );

  return (
    <CrudListShell
      entityLabel={ENTITY_LABEL}
      controller={controller}
      visibleItems={visible}
      columns={columns}
      nameOf={nameOf}
      empty={{
        hasActiveFilters: filter !== CERT_FILTER_ALL,
        onResetFilters: () => setFilter(CERT_FILTER_ALL),
      }}
      selectAllLabelId="cert-select-all"
      toolbar={toolbar}
      onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
    />
  );
}
