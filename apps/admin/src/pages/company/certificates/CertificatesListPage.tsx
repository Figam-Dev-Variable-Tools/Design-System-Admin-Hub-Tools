// CertificatesListPage — 인증서/특허 목록 (라우트: /company/certificates)
//
// 목록 + 등록/수정 폼(별도 라우트) + 삭제팝업. 구분(인증서/특허) 필터. 조회·선택·삭제는 공용 CRUD
// 키트(useCrudList)가 그대로 한다.
//
// ┌ 이 화면이 공용 CrudListShell 을 쓰지 않는 단 하나의 이유 ─────────────────────┐
// │ **행 드래그 재정렬**이다. 드래그는 <tr> 에 핸들러를 걸어야 하는데 그 <tr> 은 DS   │
// │ Table 이 소유한다(CertificatesTable.tsx 머리말). 그래서 표만 지역 컴포넌트로 두고,│
// │ 껍데기가 하던 나머지(라이브 영역 · 요약 · 선택 바 · 조회 실패 배너 · 다이얼로그)는  │
// │ 여기서 같은 형태로 조립한다. 재정렬 UI 자체는 DS TableReorder 를 그대로 쓴다.     │
// └──────────────────────────────────────────────────────────────────────────────┘
//
// ┌ 저장은 **놓는 즉시**다 (별도 '순서 저장' 버튼을 두지 않았다) ────────────────────┐
// │ 이 리포에는 두 관용구가 있다.                                                  │
// │  (a) /settings/oauth — 순서를 폼의 dirty 상태로 들고 있다가 저장 버튼으로 함께     │
// │      보낸다. 그 화면은 **원래 폼**이라 저장 버튼과 미저장 이탈 가드                │
// │      (SettingsFormShell.unsavedMessage)가 이미 있고, 순서는 거기에 얹혀 갈 뿐이다. │
// │  (b) FAQ·배너·로고 **목록** — 놓는 즉시 저장하고 낙관적 업데이트 + 실패 시 롤백.    │
// │ 이 화면은 (b) 다. 목록에는 폼도 저장 버튼도 없어서 (a) 를 택하면 '저장 버튼이 있는  │
// │ 목록' 과 '연필을 누르면 폼으로 떠나는데 그때마다 경고하는 이탈 가드' 를 이 화면에만  │
// │ 새로 만들어야 한다. 즉시 저장이면 **미저장 변경이라는 상태 자체가 존재하지 않는다** —│
// │ 이탈 경고가 지키려던 것을 더 강한 방식으로 지킨다. 실패는 롤백 + 재시도 토스트다.    │
// └──────────────────────────────────────────────────────────────────────────────┘
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
import {
  Alert,
  alertActionRowStyle,
  Button,
  hintStyle,
  Icon,
  SelectField,
  SelectionBar,
  useToast,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { parseFilter, useCrudList } from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { CertificatesTable } from './CertificatesTable';
import { certificatesAdapter } from './data-source';
import { useReorderCertificates } from './queries';
import {
  CERT_FILTER_ALL,
  CERT_KIND_OPTIONS,
  certOrderAnnouncement,
  certReorderRefusal,
  filterCertificates,
} from './types';
import type { CertFilter, CertInput, CertItem } from './types';
import { cssVar } from '@tds/ui';

const RESOURCE = 'certificates';
const ENTITY_LABEL = '인증서/특허';
const LIST_PATH = '/company/certificates';
const CERT_FILTER_VALUES: readonly CertFilter[] = [
  CERT_FILTER_ALL,
  ...CERT_KIND_OPTIONS.map((option) => option.id),
];

/** 순서를 바꿀 수 있을 때 무엇을 하면 되는지 — 거부 사유와 같은 자리에 선다 */
const REORDER_HINT =
  '행을 끌어 놓거나 각 행의 위/아래 버튼으로 순서를 바꿔요. 바꾸는 즉시 저장돼요.';

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filterWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const filterSelectStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 6)`,
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/** 표의 가로 스크롤 (IA-14 · ERP-15) — DS Table 과 마찬가지로 폭 대응은 감싸는 쪽의 일이다 */
const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const nameOf = (item: CertItem) => item.name;

/** 스크린리더에 알릴 목록 상태 한 줄 (A11Y-16) — CrudListShell 과 같은 문장 */
function announcementOf(firstLoading: boolean, error: Error | null, count: number): string {
  if (firstLoading) return '';
  if (error !== null) return `${ENTITY_LABEL} 목록을 불러오지 못했어요.`;
  if (count === 0) return `조건에 맞는 ${ENTITY_LABEL} 결과가 없어요.`;
  return `${ENTITY_LABEL} ${formatNumber(count)}건을 찾았어요.`;
}

export default function CertificatesListPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { canCreate, canUpdate, canRemove } = useRouteWritePermissions();
  const [filter, setFilter] = useState<CertFilter>(CERT_FILTER_ALL);
  /** 순서가 바뀐 사실을 읽어 주는 문장 — 행이 움직인 것은 시각적 사실이라 이 줄이 없으면 전달되지 않는다 */
  const [orderNotice, setOrderNotice] = useState('');

  const controller = useCrudList<CertItem, CertInput>({
    resource: RESOURCE,
    adapter: certificatesAdapter,
    entityLabel: ENTITY_LABEL,
    nameOf,
  });
  const { clear, firstLoading, refreshing, error, selectedCount } = controller;

  const reorder = useReorderCertificates();
  const reordering = reorder.isPending;
  const reorderControllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => reorderControllerRef.current?.abort(), []);

  // 필터가 바뀌면 보이지 않는 행의 선택이 남지 않게 비운다
  useEffect(() => {
    clear();
  }, [filter, clear]);

  const visible = useMemo(
    () => filterCertificates(controller.items, filter),
    [controller.items, filter],
  );

  /**
   * 순서 변경의 **단 하나의 술어** — 손잡이·이동 버튼의 존재와 저장 거부가 같은 것을 읽는다.
   * (권한 강등이나 필터 적용은 표가 다시 그려지기 전에도 일어날 수 있다 — 저장 경로가 스스로 막는다.)
   */
  const reorderRefusal = certReorderRefusal({
    canUpdate,
    filtered: filter !== CERT_FILTER_ALL,
    count: visible.length,
  });
  const reorderable = reorderRefusal === null;

  const onReorder = (orderedIds: readonly string[], movedId: string) => {
    if (reorderRefusal !== null) {
      toast.error(reorderRefusal);
      return;
    }

    reorderControllerRef.current?.abort();
    const abortController = new AbortController();
    reorderControllerRef.current = abortController;

    // 낙관적 업데이트가 행을 이미 옮겼으므로, 같은 시점에 그 사실을 말한다
    setOrderNotice(certOrderAnnouncement(visible, orderedIds, movedId) ?? '');

    reorder.mutate(
      { orderedIds, signal: abortController.signal },
      {
        onSuccess: () => {
          if (abortController.signal.aborted) return;
          toast.success('정렬 순서를 변경했어요.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          // 낙관적 업데이트는 뮤테이션이 롤백했다 — 옮겼다는 낭독도 함께 거둔다
          setOrderNotice('');
          toast.error('정렬 순서를 변경하지 못했어요.', {
            retry: () => onReorder(orderedIds, movedId),
          });
        },
      },
    );
  };

  return (
    <div style={columnStyle}>
      {/* [A11Y-16] **항상 마운트된** polite live region 두 개 — 내용과 함께 생성된 라이브 영역은
          NVDA/JAWS 가 신뢰성 있게 읽지 않는다. 목록 상태와 순서 변경은 수명이 달라 영역을 나눈다
          (한 영역에 섞으면 재렌더의 건수 문장이 방금 넣은 순서 문장을 덮어쓴다). */}
      <div aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {announcementOf(firstLoading, error, visible.length)}
      </div>
      <div aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
        {orderNotice}
      </div>

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
        {/* 등록 버튼은 create 권한이 있을 때만 존재한다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03) */}
        {canCreate && (
          <Button variant="primary" size="md" onClick={() => navigate(`${LIST_PATH}/new`)}>
            <Icon name="plus-circle" />
            인증서/특허 등록
          </Button>
        )}
      </div>

      {error === null ? (
        <>
          <div style={summaryRowStyle}>
            {/* 재조회 중에는 건수를 지우지 않는다 — 이전 값을 유지한 채 '새로고침 중' 만 덧붙인다 */}
            <p style={hintStyle} aria-busy={refreshing}>
              {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}
              {refreshing && ' · 새로고침 중…'}
              {selectedCount > 0 && ` · ${formatNumber(selectedCount)}건 선택됨`}
            </p>

            {/* 순서를 못 바꾸는 화면에서 손잡이만 조용히 사라지면 운영자는 이유를 알 수 없다 —
             **왜 막혔는지**를 문장으로 남긴다. 아직 아무것도 없는 목록에서는 빈 상태가 이미 말한다. */}
            {!firstLoading && visible.length > 0 && (
              <p style={hintStyle}>{reorderRefusal ?? REORDER_HINT}</p>
            )}
          </div>

          {/* 삭제 권한이 없으면 선택 바 자체를 그리지 않는다 — 이 바의 유일한 액션이 일괄 삭제다 */}
          {canRemove && (
            <SelectionBar count={selectedCount} onClear={clear}>
              <Button
                variant="danger"
                disabled={controller.deletingId !== null}
                onClick={controller.requestBulkDelete}
              >
                {`선택 ${formatNumber(selectedCount)}건 삭제`}
              </Button>
            </SelectionBar>
          )}

          <div style={tableScrollStyle}>
            <CertificatesTable
              items={visible}
              loading={firstLoading}
              entityLabel={ENTITY_LABEL}
              canUpdate={canUpdate}
              canRemove={canRemove}
              onEdit={(item) => navigate(`${LIST_PATH}/${item.id}/edit`)}
              onDelete={controller.requestDelete}
              deletingId={controller.deletingId}
              reorderable={reorderable}
              onReorder={onReorder}
              reordering={reordering}
              selectedIds={controller.selectedIds}
              onToggleOne={controller.toggleOne}
              onToggleAll={(checked) =>
                controller.toggleAll(
                  visible.map((item) => item.id),
                  checked,
                )
              }
              hasActiveFilters={filter !== CERT_FILTER_ALL}
              onResetFilters={() => setFilter(CERT_FILTER_ALL)}
            />
          </div>
        </>
      ) : (
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>{ENTITY_LABEL} 목록을 불러오지 못했어요.</span>
            <Button variant="secondary" onClick={controller.refetch}>
              다시 시도
            </Button>
          </div>
        </Alert>
      )}

      {controller.dialogs}
    </div>
  );
}
