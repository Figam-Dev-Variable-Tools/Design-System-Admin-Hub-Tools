// ShipmentListPage — 배송 처리 (라우트: /orders/shipments)
//
// [무엇을 하는 화면인가] 주문 목록이 '무엇이 어디에 고여 있는가' 를 보는 곳이라면, 여기는
// **오늘 무엇을 내보낼 것인가** 를 처리하는 곳이다(화면 유형 E — 처리 워크플로). 그래서 등록 폼이
// 없고, 삭제도 없다. 관리자가 하는 일은 셋뿐이다: 준비중으로 옮기고, 송장을 붙이고, 발송처리한다.
//
// [순서가 곧 규칙이다 — 카페24의 실제 동작] 배송준비중 → 송장 입력(= 배송대기) → 발송처리(= 배송중).
// 가운데 단계를 건너뛰지 않는 이유는 '배송대기' 가 실제 상태이기 때문이다: 운송장은 출력됐지만
// 아직 인수인계 전인 구간이 있고, 그 구간을 이름으로 부르지 못하면 운영자는 나가지도 않은 물건을
// '배송중' 이라고 고객에게 말하게 된다. 발송처리(waiting → shipping)가 고객 알림의 발화 지점이다
// (알림 자체는 아직 없다 — 여기서는 이력만 남는다).
//
// [주문 상태는 배송이 직접 정하지 않는다] 이 화면이 주문을 미는 것은 맞지만, 판정은 언제나
// shared/domain/shipment.ts 의 orderShipmentBlock 을 지나고 그 안에서 다시 order.ts 의
// orderTransitionBlock 을 지난다. 규칙이 두 벌이 되면 주문 목록의 버튼과 이 화면의 버튼이 같은
// 주문을 두고 다른 답을 한다.
//
// [조회 상태의 소유자] work·keyword 는 useState 가 아니라 useListState 가 URL 로 소유한다(IA-13).
// 검색은 IME 안전이다(COMP-10).
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { cssVar, Empty } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { formatNumber } from '../../../shared/format';
import { settleAllDetailed } from '../../../shared/bulk';
import {
  parseFilter,
  useCrudCreate,
  useCrudListQuery,
  useCrudUpdate,
  useListState,
} from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import {
  Alert,
  alertActionRowStyle,
  Button,
  ConfirmDialog,
  FilterPanel,
  FilterRail,
  hintStyle,
  SearchField,
  SelectionBar,
  useToast,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { applyOrderStatus, toOrderInput } from '../../../shared/domain/order';
import {
  activeCarriers,
  applyShipmentStatus,
  applyShippedQuantities,
  canDispatchShipment,
  orderShipmentBlock,
  toShipmentInput,
} from '../../../shared/domain/shipment';
import type { Shipment } from '../../../shared/domain/shipment';
import { ORDER_RESOURCE, orderAdapter } from '../data-source';
import { SHIPMENT_RESOURCE, shipmentAdapter } from './data-source';
import { ShipmentTable } from './components/ShipmentTable';
import { InvoiceBulkDialog } from './components/InvoiceBulkDialog';
import type { InvoiceEntry } from './components/InvoiceBulkDialog';
import {
  buildShipmentRows,
  countRowsByWork,
  eligibleForDispatch,
  eligibleForInvoice,
  eligibleForPreparing,
  filterRowsByWork,
  searchShipmentRows,
  SHIPMENT_WORK_ALL,
  SHIPMENT_WORK_FILTER_VALUES,
  SHIPMENT_WORK_FILTERS,
} from './types';
import type { ShipmentRow, ShipmentWorkFilter } from './types';

const ENTITY_LABEL = '배송 건';
const ORDER_LIST_PATH = '/orders';
const CARRIER_SETTINGS_PATH = '/products/shipping';
const SELECT_ALL_LABEL_ID = 'shipments-select-all';

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게) */
const FILTER_DEFAULTS = { work: SHIPMENT_WORK_ALL } as const;

/** 좌: 고정 폭 필터 / 우: 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다) */
const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const mainColumnStyle: CSSProperties = {
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

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

const bulkActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/** 지금 열려 있는 일괄 작업 — 셋은 서로를 밀어낸다(동시에 두 개가 열리지 않는다) */
type PendingAction = 'prepare' | 'invoice' | 'dispatch';

export default function ShipmentListPage() {
  const toast = useToast();
  // [EXC-03] 배송 처리는 주문의 수정이다 — 권한이 없으면 체크박스도 일괄 처리 바도 그리지 않는다.
  const { canUpdate } = useRouteWritePermissions();

  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?work=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체' 로 되돌린다
  const work: ShipmentWorkFilter = parseFilter(
    list.filters['work'] ?? SHIPMENT_WORK_ALL,
    SHIPMENT_WORK_FILTER_VALUES,
    SHIPMENT_WORK_ALL,
  );

  /* 두 조회가 함께 이 화면을 만든다 — 주문(행)과 배송 건(그 행에 딸린 송장).
     배송 건만 읽으면 아직 송장이 없는 주문이 목록에서 사라진다(types.ts 머리말). */
  const orders = useCrudListQuery(ORDER_RESOURCE, orderAdapter);
  const shipments = useCrudListQuery(SHIPMENT_RESOURCE, shipmentAdapter);

  // [STATE-01] skeleton 은 최초 로드에서만 — refetch 중에는 이전 행을 유지한다.
  const firstLoading =
    (orders.isFetching && orders.data === undefined) ||
    (shipments.isFetching && shipments.data === undefined);
  const refreshing = (orders.isFetching || shipments.isFetching) && !firstLoading;
  const loadError = orders.error ?? shipments.error;

  const orderItems = useMemo(() => orders.data ?? [], [orders.data]);
  const shipmentItems = useMemo(() => shipments.data ?? [], [shipments.data]);
  const rows = useMemo(
    () => buildShipmentRows(orderItems, shipmentItems),
    [orderItems, shipmentItems],
  );

  // 건수는 **필터 이전** 전체 집합에서 센다. 아직 못 셌으면 null 이다 — 0 과 '모름' 은 다른 사실이다.
  const loaded = !firstLoading && loadError === null;
  const counts = useMemo(() => (loaded ? countRowsByWork(rows) : null), [rows, loaded]);

  const visible = useMemo(
    () => searchShipmentRows(filterRowsByWork(rows, work), list.keyword),
    [rows, work, list.keyword],
  );

  const selectedRows = useMemo(
    () => visible.filter((row) => list.selectedIds.has(row.id)),
    [visible, list.selectedIds],
  );
  const selectedCount = selectedRows.length;

  /* ── 일괄 처리 ───────────────────────────────────────────────────────────
     세 버튼 모두 **처리 가능한 건수**를 미리 세어 글자에 싣는다 — 30건을 골라 눌렀는데 28건이
     조용히 거절당하는 일을 만들지 않는다(주문 목록과 같은 규약). 판정은 전부 순수 함수다. */

  const prepareTargets = useMemo(() => eligibleForPreparing(selectedRows), [selectedRows]);
  const invoiceTargets = useMemo(() => eligibleForInvoice(selectedRows), [selectedRows]);
  const dispatchTargets = useMemo(() => eligibleForDispatch(selectedRows), [selectedRows]);

  const updateOrder = useCrudUpdate(ORDER_RESOURCE, orderAdapter);
  const createShipment = useCrudCreate(SHIPMENT_RESOURCE, shipmentAdapter);
  const updateShipment = useCrudUpdate(SHIPMENT_RESOURCE, shipmentAdapter);

  const [pending, setPending] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const closeAction = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setPending(null);
    setActionError(null);
    setBusy(false);
  };

  const openAction = (action: PendingAction) => {
    setActionError(null);
    setPending(action);
  };

  /** 일괄 작업 한 벌의 공통 마무리 — 성공은 토스트, 부분 실패는 다이얼로그에 남긴다 */
  const runBulk = <T,>(
    items: readonly T[],
    run: (item: T, signal: AbortSignal) => Promise<unknown>,
    successMessage: (count: number) => string,
  ) => {
    if (items.length === 0) return;
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    setActionError(null);

    void settleAllDetailed(items, (item) => run(item, controller.signal))
      .then(({ failed }) => {
        if (controller.signal.aborted) return;
        setBusy(false);
        if (failed === 0) {
          toast.success(successMessage(items.length));
          list.clearSelection();
          setPending(null);
          return;
        }
        // 실패가 남으면 다이얼로그를 닫지 않는다 — 재클릭이 곧 재시도다(ConfirmDialog 계약).
        setActionError(
          `${formatNumber(failed)}건을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.`,
        );
      })
      .catch((cause: unknown) => {
        if (isAbort(cause)) return;
        setBusy(false);
        setActionError('처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
      });
  };

  /** ① 배송준비중 처리 — 주문 축만 움직인다(배송 건은 아직 없다) */
  const runPrepare = () => {
    const at = new Date().toISOString();
    runBulk(
      prepareTargets,
      (row, signal) =>
        updateOrder.mutateAsync({
          id: row.id,
          input: toOrderInput(applyOrderStatus(row.order, 'preparing', at, '운영자')),
          signal,
        }),
      (count) => `${formatNumber(count)}건을 배송준비중으로 처리했어요.`,
    );
  };

  /**
   * ② 송장 등록 — 배송 건을 만들고, **전 품목이 덮였으면** 주문을 배송대기로 민다.
   *
   * 주문을 미는 판정을 여기서 직접 하지 않는 이유: '전 품목이 덮였는가' 는 SKU 단위 셈이고
   * 그 셈의 정본은 도메인이다(orderShipmentBlock). 화면이 다시 세면 목록의 배지와 저장의 결과가
   * 갈라진다.
   */
  const runInvoice = (entries: readonly InvoiceEntry[]) => {
    const at = new Date().toISOString();
    runBulk(
      entries,
      async (entry, signal) => {
        const row = rows.find((candidate) => candidate.id === entry.orderId);
        if (row === undefined) return;

        const created: Shipment = {
          // 저장 전의 임시 id — 어댑터가 진짜 id 를 붙인다. 판정에는 id 가 쓰이지 않는다.
          id: `draft-${entry.orderId}`,
          orderId: entry.orderId,
          carrierId: entry.carrierId,
          invoiceNo: entry.invoiceNo,
          // 남은 잔량 전부를 이 송장에 싣는다 — 한 주문에 송장 둘을 나눠 붙이는 것은 다음 회차다.
          lines: row.remaining.map((line) => ({ ...line })),
          status: 'waiting',
          shippedAt: '',
          deliveredAt: '',
        };

        await createShipment.mutateAsync({ input: toShipmentInput(created), signal });

        const next = [...row.shipments, created];
        if (orderShipmentBlock(row.order, next, 'waiting') !== null) return;
        await updateOrder.mutateAsync({
          id: row.id,
          input: toOrderInput(applyOrderStatus(row.order, 'waiting', at, '운영자')),
          signal,
        });
      },
      (count) => `${formatNumber(count)}건에 송장을 등록했어요. 발송처리하면 배송중이 돼요.`,
    );
  };

  /**
   * ③ 발송처리 — 배송대기 건을 내보내고, 출고 수량을 주문에 반영한다.
   *
   * 주문이 '배송중' 이 되는 것은 **전 품목이 실제로 나갔을 때뿐**이다(규칙 2). 일부만 나간 주문은
   * 상태를 그대로 두고 shippedQuantity 만 올라간다 — 주문 목록의 '부분배송 1/3' 배지가 그 사실을
   * 말한다. 부분발송을 상태로 만들지 않는 것은 주문 도메인의 전제(한 주문 = 한 상태)를 지키는 것이다.
   */
  const runDispatch = () => {
    const at = new Date().toISOString();
    runBulk(
      dispatchTargets,
      async (row, signal) => {
        const dispatched = row.shipments
          .filter((shipment) => canDispatchShipment(shipment))
          .map((shipment) => applyShipmentStatus(shipment, 'shipping', at));

        await Promise.all(
          dispatched.map((shipment) =>
            updateShipment.mutateAsync({
              id: shipment.id,
              input: toShipmentInput(shipment),
              signal,
            }),
          ),
        );

        const next = row.shipments.map(
          (shipment) => dispatched.find((moved) => moved.id === shipment.id) ?? shipment,
        );
        const withQuantities = {
          ...row.order,
          lines: applyShippedQuantities(row.order.lines, next),
        };
        const blocked = orderShipmentBlock(withQuantities, next, 'shipping');
        const finalOrder =
          blocked === null
            ? applyOrderStatus(withQuantities, 'shipping', at, '운영자')
            : withQuantities;

        await updateOrder.mutateAsync({
          id: row.id,
          input: toOrderInput(finalOrder),
          signal,
        });
      },
      (count) => `${formatNumber(count)}건을 발송처리했어요.`,
    );
  };

  /* ── 렌더 ────────────────────────────────────────────────────────────────── */

  const emptyNode = (
    <Empty
      label={ENTITY_LABEL}
      createVerb="접수"
      hasQuery={list.hasQuery}
      hasActiveFilters={list.hasActiveFilters}
      onClearSearch={list.clearSearch}
      onResetFilters={list.resetFilters}
    />
  );

  const bulkButtons: readonly {
    readonly action: PendingAction;
    readonly label: string;
    readonly count: number;
  }[] = [
    { action: 'prepare', label: '배송준비중 처리', count: prepareTargets.length },
    { action: 'invoice', label: '송장 입력', count: invoiceTargets.length },
    { action: 'dispatch', label: '발송처리', count: dispatchTargets.length },
  ];

  return (
    <div style={layoutStyle}>
      <FilterRail
        notice={
          <>
            <p style={hintStyle}>
              송장을 등록하면 배송대기, 발송처리하면 배송중이 돼요. 일부만 나간 주문은 남은 품목
              기준으로 발송대기에 남아요.
            </p>
            <p style={hintStyle}>
              택배사는{' '}
              <Link to={CARRIER_SETTINGS_PATH} className="tds-ui-link tds-ui-focusable">
                배송 설정
              </Link>
              에 등록된 목록에서만 고를 수 있어요.
            </p>
            {!canUpdate && <p style={hintStyle}>배송을 처리할 권한이 없어 조회만 가능해요.</p>}
          </>
        }
      >
        <FilterPanel
          navLabel="배송 상태 필터"
          heading="배송 상태"
          options={SHIPMENT_WORK_FILTERS}
          value={work}
          counts={counts}
          onChange={(next) => {
            list.setFilter('work', next);
          }}
        />
      </FilterRail>

      <div style={mainColumnStyle}>
        {/* [A11Y-16] 항상 마운트된 polite live region — 필터·검색으로 0행이 되는 전환이 이 줄로 들린다 */}
        <div aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
          {firstLoading
            ? ''
            : loadError !== null
              ? `${ENTITY_LABEL} 목록을 불러오지 못했어요.`
              : visible.length === 0
                ? `조건에 맞는 ${ENTITY_LABEL} 결과가 없어요.`
                : `${ENTITY_LABEL} ${formatNumber(visible.length)}건을 찾았어요.`}
        </div>

        <div style={toolbarStyle}>
          <span style={searchWrapStyle}>
            <SearchField
              value={list.searchInput}
              onChange={list.setSearchInput}
              label="주문번호·수령인·송장번호 검색"
              placeholder="주문번호 · 수령인 · 송장번호 검색"
              // 조합 중 커밋 금지 + Enter 차단 — 자모마다 조회가 나가지 않는다 (COMP-10)
              {...list.searchInputProps}
            />
          </span>
        </div>

        {loadError === null ? (
          <>
            <p style={hintStyle} aria-busy={refreshing}>
              {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}
              {refreshing && ' · 새로고침 중…'}
              {selectedCount > 0 && ` · ${formatNumber(selectedCount)}건 선택됨`}
            </p>

            {canUpdate && (
              <SelectionBar count={selectedCount} onClear={list.clearSelection}>
                <span style={bulkActionsStyle}>
                  {bulkButtons.map((button) => (
                    <Button
                      key={button.action}
                      variant="secondary"
                      // 처리 가능한 건이 하나도 없으면 누를 수 없다 — 눌러 놓고 전부 거절당하지 않는다
                      disabled={button.count === 0 || busy}
                      onClick={() => {
                        openAction(button.action);
                      }}
                    >
                      {`${button.label} (${formatNumber(button.count)})`}
                    </Button>
                  ))}
                </span>
              </SelectionBar>
            )}

            <div style={tableScrollStyle}>
              <ShipmentTable
                rows={visible}
                loading={firstLoading}
                orderPathOf={(row: ShipmentRow) => `${ORDER_LIST_PATH}/${row.id}`}
                selectable={canUpdate}
                selectedIds={list.selectedIds}
                onToggleOne={list.toggleOne}
                onToggleAll={(checked) => {
                  list.toggleAll(
                    visible.map((row) => row.id),
                    checked,
                  );
                }}
                selectAllLabelId={SELECT_ALL_LABEL_ID}
                empty={emptyNode}
              />
            </div>
          </>
        ) : (
          <Alert tone="danger">
            <div style={alertActionRowStyle}>
              <span>배송 목록을 불러오지 못했어요.</span>
              <Button
                variant="secondary"
                onClick={() => {
                  void orders.refetch();
                  void shipments.refetch();
                }}
              >
                다시 시도
              </Button>
            </div>
          </Alert>
        )}
      </div>

      {pending === 'prepare' && (
        <ConfirmDialog
          intent="update"
          title="배송준비중 일괄 처리"
          message={
            prepareTargets.length === selectedCount
              ? `선택한 주문 ${formatNumber(selectedCount)}건을 배송준비중으로 진행해요. 주문 상태는 되돌릴 수 없어요.`
              : `선택한 ${formatNumber(selectedCount)}건 중 ${formatNumber(prepareTargets.length)}건만 배송준비중으로 진행해요. 나머지는 이미 지난 단계이거나 입금이 확인되지 않은 주문이에요.`
          }
          confirmLabel={`${formatNumber(prepareTargets.length)}건 처리`}
          busy={busy}
          {...(actionError !== null && { error: actionError })}
          onConfirm={runPrepare}
          onCancel={closeAction}
        />
      )}

      {pending === 'invoice' && (
        <InvoiceBulkDialog
          rows={invoiceTargets}
          /* 선택지는 등록된 택배사뿐이다 — 배선 전에는 null 이고, 그때 다이얼로그가 그 사실을 말한다.
             빈 목록으로 뭉개면 '택배사가 하나도 없다' 로 읽혀 운영자가 등록하러 간다(사실이 아니다). */
          carriers={activeCarriers()}
          existing={shipmentItems}
          busy={busy}
          serverError={actionError}
          onSubmit={runInvoice}
          onCancel={closeAction}
        />
      )}

      {pending === 'dispatch' && (
        <ConfirmDialog
          intent="update"
          title="발송처리"
          message={`선택한 ${formatNumber(dispatchTargets.length)}건을 발송처리해요. 전 품목이 나간 주문만 배송중이 되고, 일부만 나간 주문은 발송대기에 남아요. 되돌릴 수 없어요.`}
          confirmLabel={`${formatNumber(dispatchTargets.length)}건 발송처리`}
          busy={busy}
          {...(actionError !== null && { error: actionError })}
          onConfirm={runDispatch}
          onCancel={closeAction}
        />
      )}
    </div>
  );
}
