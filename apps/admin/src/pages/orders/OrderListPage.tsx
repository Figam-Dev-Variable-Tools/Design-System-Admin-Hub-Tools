// OrderListPage — 주문 목록 (라우트: /orders)
//
// [무엇을 하는 화면인가] 주문은 고객의 결제가 만든다. 관리자가 여기서 하는 일은 둘뿐이다 —
// **지금 무엇이 어디에 고여 있는지 보고**(좌측 상태 필터의 건수), **여러 건을 골라 다음 단계로
// 옮기는 것**(일괄 상태 처리). 그래서 이 화면에는 등록 버튼이 없고, 삭제도 없다(거래 기록이다).
//
// [일괄 처리는 술어를 먼저 통과한다] '선택 12건 배송준비중 처리' 를 눌렀는데 그중 3건이 조용히
// 거절당하면 운영자는 무엇이 처리됐는지 알 수 없다. 그래서 버튼은 **처리 가능한 건수**를 미리
// 세어 글자에 싣고(eligibleForTransition), 확인 창이 제외되는 건수와 그 이유를 함께 말한다.
// 판정은 도메인의 canTransitionOrder 하나가 하고, 저장(어댑터)도 같은 규칙을 지난다.
//
// [결제가 꺼져 있으면 이 목록은 자라지 않는다] PG 를 쓰지 않는 설정에서는 스토어프론트의
// '구매하기' 가 '문의하기' 로 바뀐다 — 주문이 들어올 통로 자체가 없다. 그것은 '오늘 주문이 없다'
// 와 **구조적으로 다른 사실**이라 빈 상태 문구도 다르고, 갈 곳(결제 설정)도 다르다.
//
// [조회 상태의 소유자] status·keyword 는 이 화면의 useState 가 아니라 useListState 가 URL
// 쿼리스트링으로 소유한다 (IA-13) — 필터를 건 목록을 그대로 공유할 수 있고, 상세에서 Back 하면
// 그 조건이 복원된다. 검색은 IME 안전이다 (COMP-10).
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { cssVar, Empty } from '@tds/ui';

import { isAbort } from '../../shared/async';
import { formatNumber } from '../../shared/format';
import { INQUIRY_PATH, PAYMENT_SETTINGS_PATH } from '../../shared/commerce/payment-settings';
import { parseFilter, useCrudListQuery, useCrudUpdate, useListState } from '../../shared/crud';
import { useRouteWritePermissions } from '../../shared/permissions/RequirePermission';
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
} from '../../shared/ui';
import { settleAllDetailed } from '../../shared/bulk';
import {
  applyOrderStatus,
  orderStatusLabel,
  toOrderInput,
  ORDER_TRANSITION_UNPAID,
} from '../../shared/domain/order';
import type { Order, OrderStatus } from '../../shared/domain/order';
import { ORDER_RESOURCE, orderAdapter } from './data-source';
import { ordersCanArrive } from './_shared/store';
import { OrderTable } from './components/OrderTable';
import {
  BULK_TRANSITIONS,
  bulkTransitionLabel,
  countOrdersByStatus,
  eligibleForTransition,
  filterOrdersByStatus,
  ORDER_STATUS_ALL,
  ORDER_STATUS_FILTER_VALUES,
  ORDER_STATUS_FILTERS,
  searchOrders,
} from './types';
import type { OrderStatusFilter } from './types';

const ENTITY_LABEL = '주문';
const LIST_PATH = '/orders';
const SELECT_ALL_LABEL_ID = 'orders-select-all';

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게) */
const FILTER_DEFAULTS = { status: ORDER_STATUS_ALL } as const;

/** 상세 경로 — 주문번호가 곧 id 다(도메인 머리말) */
const detailPathOf = (order: Order) => `${LIST_PATH}/${order.id}`;

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

/** 일괄 처리 버튼들 — 선택 바 안에서 가로로 늘어선다 */
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

export default function OrderListPage() {
  const toast = useToast();
  // [EXC-03] 상태 전이는 수정이다 — 권한이 없으면 체크박스도 일괄 처리 바도 그리지 않는다.
  const { canUpdate } = useRouteWritePermissions();

  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?status=거짓말 이 조회를 깨지 않게 한다 — 모르는 값은 '전체' 로 되돌린다
  const status: OrderStatusFilter = parseFilter(
    list.filters['status'] ?? ORDER_STATUS_ALL,
    ORDER_STATUS_FILTER_VALUES,
    ORDER_STATUS_ALL,
  );

  const { data, isFetching, error, refetch } = useCrudListQuery(ORDER_RESOURCE, orderAdapter);
  // [STATE-01] skeleton 은 최초 로드에서만 — refetch 중에는 이전 행을 유지한다.
  const firstLoading = isFetching && data === undefined;
  const items = useMemo(() => data ?? [], [data]);

  // 건수는 **필터 이전** 전체 집합에서 센다. 아직 못 셌으면 null 이다 —
  // 0 과 '모름' 은 다른 사실이라 FilterPanel 이 '—' 를 띄운다.
  const loaded = !firstLoading && error === null;
  const statusCounts = useMemo(() => (loaded ? countOrdersByStatus(items) : null), [items, loaded]);

  const visible = useMemo(
    () => searchOrders(filterOrdersByStatus(items, status), list.keyword),
    [items, status, list.keyword],
  );

  /* 결제(PG)가 꺼져 있으면 주문이 들어올 통로가 없다 — '오늘 0건' 과 구조적으로 다른 사실이다.
     렌더 시점에 읽는다: 설정을 바꾸면 다음 렌더가 곧바로 새 규칙을 쓴다(checkoutCta 와 같은 어법). */
  const canArrive = ordersCanArrive();

  /* ── 일괄 상태 처리 ─────────────────────────────────────────────────────── */

  const update = useCrudUpdate(ORDER_RESOURCE, orderAdapter);
  const [pendingTransition, setPendingTransition] = useState<OrderStatus | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const selectedOrders = useMemo(
    () => visible.filter((order) => list.selectedIds.has(order.id)),
    [visible, list.selectedIds],
  );
  const selectedCount = selectedOrders.length;

  const eligible = useMemo(
    () =>
      pendingTransition === null ? [] : eligibleForTransition(selectedOrders, pendingTransition),
    [selectedOrders, pendingTransition],
  );

  const closeBulk = () => {
    controllerRef.current?.abort();
    setPendingTransition(null);
    setBulkError(null);
  };

  const runBulk = () => {
    if (pendingTransition === null || eligible.length === 0) return;
    const to = pendingTransition;
    const at = new Date().toISOString();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBulkBusy(true);
    setBulkError(null);

    // 부분 실패도 건수로 알린다 — 하나가 실패해도 나머지는 반영된다(shared/bulk 의 규약).
    void settleAllDetailed(eligible, (order) =>
      update.mutateAsync({
        id: order.id,
        input: toOrderInput(applyOrderStatus(order, to, at, '운영자')),
        signal: controller.signal,
      }),
    )
      .then(({ failed }) => {
        if (controller.signal.aborted) return;
        setBulkBusy(false);
        if (failed === 0) {
          toast.success(
            `${formatNumber(eligible.length)}건을 ${orderStatusLabel(to)}(으)로 처리했어요.`,
          );
          list.clearSelection();
          setPendingTransition(null);
          return;
        }
        // 실패가 남으면 다이얼로그를 닫지 않는다 — 재클릭이 곧 재시도다(ConfirmDialog 계약).
        setBulkError(`${formatNumber(failed)}건을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.`);
      })
      .catch((cause: unknown) => {
        if (isAbort(cause)) return;
        setBulkBusy(false);
        setBulkError('상태를 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
      });
  };

  /* ── 빈 상태 (STATE-05 + 결제 설정이라는 네 번째 사실) ──────────────────── */

  const emptyNode =
    !canArrive && !list.hasQuery && !list.hasActiveFilters ? (
      <Alert tone="info">
        <div style={alertActionRowStyle}>
          <span>
            현재 결제를 사용하지 않아 주문이 들어오지 않아요. 지금 상품 페이지의 버튼은
            &lsquo;구매하기&rsquo; 대신 &lsquo;문의하기&rsquo;이며, 고객의 글은 상품 문의로
            접수돼요.
          </span>
          <Link to={PAYMENT_SETTINGS_PATH} className="tds-ui-link tds-ui-focusable">
            결제 설정 열기
          </Link>
          {/* 지금 실제로 봐야 할 화면 — 주문 대신 문의가 쌓이는 곳이다 */}
          <Link to={INQUIRY_PATH.product} className="tds-ui-link tds-ui-focusable">
            상품 문의 열기
          </Link>
        </div>
      </Alert>
    ) : (
      <Empty
        label={ENTITY_LABEL}
        createVerb="접수"
        hasQuery={list.hasQuery}
        hasActiveFilters={list.hasActiveFilters}
        onClearSearch={list.clearSearch}
        onResetFilters={list.resetFilters}
      />
    );

  return (
    <div style={layoutStyle}>
      <FilterRail
        notice={
          <>
            <p style={hintStyle}>
              주문은 고객의 결제로 만들어져요. 이 화면에서는 상태를 진행하고 취소·메모를 남겨요.
            </p>
            {!canArrive && (
              <p style={hintStyle}>
                결제 설정이 꺼져 있어 새 주문이 들어오지 않아요.{' '}
                <Link to={PAYMENT_SETTINGS_PATH} className="tds-ui-link tds-ui-focusable">
                  결제 설정
                </Link>{' '}
                ·{' '}
                <Link to={INQUIRY_PATH.product} className="tds-ui-link tds-ui-focusable">
                  상품 문의
                </Link>
              </p>
            )}
            {!canUpdate && <p style={hintStyle}>상태를 바꿀 권한이 없어 조회만 가능해요.</p>}
          </>
        }
      >
        <FilterPanel
          navLabel="주문 상태 필터"
          heading="주문 상태"
          options={ORDER_STATUS_FILTERS}
          value={status}
          counts={statusCounts}
          onChange={(next) => {
            list.setFilter('status', next);
          }}
        />
      </FilterRail>

      <div style={mainColumnStyle}>
        {/* [A11Y-16] 항상 마운트된 polite live region — 필터·검색으로 0행이 되는 전환이 이 줄로 들린다 */}
        <div aria-live="polite" aria-atomic="true" style={visuallyHiddenStyle}>
          {firstLoading
            ? ''
            : error !== null
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
              label="주문번호·주문자·상품명 검색"
              placeholder="주문번호 · 주문자 · 상품명 검색"
              // 조합 중 커밋 금지 + Enter 차단 — 자모마다 조회가 나가지 않는다 (COMP-10)
              {...list.searchInputProps}
            />
          </span>
        </div>

        {error === null ? (
          <>
            <p style={hintStyle} aria-busy={isFetching && !firstLoading}>
              {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(visible.length)}건`}
              {isFetching && !firstLoading && ' · 새로고침 중…'}
              {selectedCount > 0 && ` · ${formatNumber(selectedCount)}건 선택됨`}
            </p>

            {canUpdate && (
              <SelectionBar count={selectedCount} onClear={list.clearSelection}>
                <span style={bulkActionsStyle}>
                  {BULK_TRANSITIONS.map((target) => {
                    const count = eligibleForTransition(selectedOrders, target).length;
                    return (
                      <Button
                        key={target}
                        variant="secondary"
                        // 처리 가능한 건이 하나도 없으면 누를 수 없다 — 눌러 놓고 전부 거절당하지 않는다
                        disabled={count === 0 || bulkBusy}
                        onClick={() => {
                          setBulkError(null);
                          setPendingTransition(target);
                        }}
                      >
                        {`${bulkTransitionLabel(target)} (${formatNumber(count)})`}
                      </Button>
                    );
                  })}
                </span>
              </SelectionBar>
            )}

            <div style={tableScrollStyle}>
              <OrderTable
                orders={visible}
                loading={firstLoading}
                detailPathOf={detailPathOf}
                selectable={canUpdate}
                selectedIds={list.selectedIds}
                onToggleOne={list.toggleOne}
                onToggleAll={(checked) => {
                  list.toggleAll(
                    visible.map((order) => order.id),
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
              <span>주문 목록을 불러오지 못했어요.</span>
              <Button
                variant="secondary"
                onClick={() => {
                  void refetch();
                }}
              >
                다시 시도
              </Button>
            </div>
          </Alert>
        )}
      </div>

      {/* 일괄 전이 확인 — 제외되는 건수와 그 이유를 함께 말한다. 상태 전이는 되돌릴 수 없다.
          intent='update' 인 이유: 이것은 삭제가 아니라 '진행' 이다. */}
      {pendingTransition !== null && (
        <ConfirmDialog
          intent="update"
          title={`${orderStatusLabel(pendingTransition)} 일괄 처리`}
          message={
            eligible.length === selectedCount
              ? `선택한 주문 ${formatNumber(selectedCount)}건을 ${orderStatusLabel(pendingTransition)}(으)로 진행해요. 주문 상태는 되돌릴 수 없어요.`
              : `선택한 ${formatNumber(selectedCount)}건 중 ${formatNumber(eligible.length)}건만 ${orderStatusLabel(pendingTransition)}(으)로 진행해요. 나머지 ${formatNumber(selectedCount - eligible.length)}건은 이미 지난 단계이거나, 취소되었거나, ${ORDER_TRANSITION_UNPAID}`
          }
          confirmLabel={`${formatNumber(eligible.length)}건 처리`}
          busy={bulkBusy}
          {...(bulkError !== null && { error: bulkError })}
          onConfirm={runBulk}
          onCancel={closeBulk}
        />
      )}
    </div>
  );
}
