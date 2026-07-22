// SiteMenusPage — 메뉴 관리 (라우트: /content/menus)
//
// **B2C 홈페이지의 메뉴 트리**를 만든다. 어드민 사이드바(nav-config.ts)와는 다른 세계다 — 이
// 화면은 그것을 알지 못한다(types.ts 머리말).
//
// 위치 탭(상단/하단/모바일) + 2뎁스 트리 + 순서 이동 + 노출 토글 + 추가/수정 모달 + 삭제 가드.
// 조회 상태(고른 위치·접은 메뉴)의 단일 원천은 URL 이다 (IA-13 · useListState).
//
// [끊긴 링크를 화면이 먼저 말한다] 내부 페이지를 가리키는 메뉴는 그 페이지가 지워지면 죽는다.
// 그 사실은 저장된 값이 아니라 **볼 때마다 조회**해서 판정한다 — 저장하면 그 순간부터 낡는다.
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { cssVar, SegmentedControl } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import {
  DetailCellLink,
  parseFilter,
  useCrudDelete,
  useCrudListQuery,
  useListState,
} from '../../../shared/crud';
import { sitePageCatalog, sitePageEditPath } from '../../../shared/domain/site-page-catalog';
import { formatNumber } from '../../../shared/format';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import {
  Alert,
  Button,
  buttonStyle,
  Card,
  ConfirmDialog,
  Empty,
  hintStyle,
  Icon,
  moveArrayItem,
  ReorderMoveButtons,
  StatusBadge,
  ToggleSwitch,
  useToast,
} from '../../../shared/ui';
import { SiteMenuFormModal } from './components/SiteMenuFormModal';
import { MENU_RESOURCE, siteMenuAdapter } from './data-source';
import { useReorderSiteMenus, useSetSiteMenuVisible } from './queries';
import {
  brokenMenuCount,
  childMenus,
  MENU_LOCATION_LABEL,
  MENU_LOCATIONS,
  MENU_TARGET_KIND_LABEL,
  menuDeleteBlock,
  menuLinkHealth,
  menuLinkWarning,
  menuTargetLabel,
  rootMenus,
} from './types';
import type { MenuLocation, SiteMenu } from './types';

const FILTER_DEFAULTS = { location: 'header' } as const;

const pageStyle: CSSProperties = {
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

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

/** 2뎁스 행은 상위 아래에 들여쓴다 — 계층이 한눈에 보이게 (상품 카테고리와 같은 처리) */
const childListStyle: CSSProperties = {
  ...listStyle,
  marginTop: cssVar('space.2'),
  paddingLeft: cssVar('space.6'),
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const rowLeftStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
  flexWrap: 'wrap',
};

const labelTextStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  lineHeight: cssVar('typography.label.md.line-height'),
  overflowWrap: 'anywhere',
};

const targetTextStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  lineHeight: cssVar('typography.label.sm.line-height'),
  overflowWrap: 'anywhere',
};

const actionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  color: cssVar('color.feedback.danger.text'),
};

const disclosureStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  paddingLeft: cssVar('space.1'),
  paddingRight: cssVar('space.1'),
};

const disclosureSpacerStyle: CSSProperties = {
  display: 'inline-block',
  inlineSize: cssVar('space.6'),
  flexShrink: 0,
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const LOCATION_OPTIONS = MENU_LOCATIONS.map((value) => ({
  id: value,
  label: MENU_LOCATION_LABEL[value],
}));

type ModalState =
  | { readonly kind: 'closed' }
  | { readonly kind: 'create'; readonly parentId: string | null }
  | { readonly kind: 'edit'; readonly menu: SiteMenu };

interface MenuRowProps {
  readonly menu: SiteMenu;
  readonly index: number;
  readonly siblingCount: number;
  readonly warning: string | null;
  readonly broken: boolean;
  readonly targetLabel: string;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
  readonly deleteBlocked: string | null;
  readonly busy: boolean;
  readonly locked: boolean;
  /** 하위를 펼쳤나 — 1뎁스에만 준다. undefined 면 토글 자체가 없다 */
  readonly expanded?: boolean;
  readonly childPanelId?: string;
  readonly childCount?: number;
  readonly onToggleExpand?: () => void;
  readonly onMove: (index: number, delta: number) => void;
  readonly onToggleVisible: (menu: SiteMenu, next: boolean) => void;
  readonly onEdit: (menu: SiteMenu) => void;
  readonly onDelete: (menu: SiteMenu) => void;
  readonly onAddChild?: (parent: SiteMenu) => void;
}

function MenuRow({
  menu,
  index,
  siblingCount,
  warning,
  broken,
  targetLabel,
  canCreate,
  canUpdate,
  canRemove,
  deleteBlocked,
  busy,
  locked,
  expanded,
  childPanelId,
  childCount = 0,
  onToggleExpand,
  onMove,
  onToggleVisible,
  onEdit,
  onDelete,
  onAddChild,
}: MenuRowProps) {
  const isRoot = menu.parentId === null;
  const togglable = expanded !== undefined && onToggleExpand !== undefined && childCount > 0;
  const blocked = deleteBlocked !== null;

  return (
    <li style={rowStyle}>
      <span style={rowLeftStyle}>
        {togglable ? (
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={disclosureStyle}
            aria-expanded={expanded}
            aria-controls={childPanelId}
            aria-label={`${menu.label} 하위 메뉴 ${expanded ? '접기' : '펼치기'} (${String(childCount)}개)`}
            onClick={onToggleExpand}
          >
            <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />
          </button>
        ) : (
          <span aria-hidden="true" style={disclosureSpacerStyle} />
        )}

        <span style={labelTextStyle}>{menu.label}</span>
        <StatusBadge tone="neutral" label={MENU_TARGET_KIND_LABEL[menu.target.kind]} />
        <span style={targetTextStyle}>{targetLabel}</span>

        {/* 끊긴 링크는 배지로 먼저 눈에 띄고, 왜 그런지는 바로 옆 문장이 말한다 */}
        {warning !== null && (
          <StatusBadge
            tone={broken ? 'danger' : 'warning'}
            label={broken ? '끊긴 링크' : '공개 전'}
          />
        )}
        {menu.target.kind === 'page' && !broken && (
          <DetailCellLink
            to={sitePageEditPath(menu.target.pageId)}
            ariaLabel={`${menu.label} 이 가리키는 페이지 열기`}
          >
            페이지 열기
          </DetailCellLink>
        )}
      </span>

      <span style={actionsStyle}>
        {/* 노출 토글 — 지우지 않고 잠깐 내리는 손잡이 */}
        <ToggleSwitch
          label={`${menu.label} 노출 여부`}
          checked={menu.visible}
          disabled={!canUpdate}
          busy={busy}
          onChange={(next) => onToggleVisible(menu, next)}
        />

        {/* 순서 이동 — 형제 안에서만 움직인다(공용 관용구) */}
        {canUpdate && (
          <ReorderMoveButtons
            label={menu.label}
            index={index}
            count={siblingCount}
            locked={locked}
            onMove={onMove}
          />
        )}

        {/* 하위 추가는 1뎁스에만 — 2뎁스 아래로는 만들지 않는다 */}
        {isRoot && canCreate && onAddChild !== undefined && (
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={buttonStyle('ghost')}
            aria-label={`${menu.label} 하위 메뉴 추가`}
            title="하위 메뉴 추가"
            onClick={() => onAddChild(menu)}
          >
            <Icon name="plus-circle" />
          </button>
        )}

        {canUpdate && (
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={buttonStyle('ghost')}
            aria-label={`${menu.label} 수정`}
            onClick={() => onEdit(menu)}
          >
            <Icon name="pencil" />
          </button>
        )}

        {canRemove && (
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={blocked ? buttonStyle('ghost', true) : dangerGhostStyle}
            // 못 누르는 이유를 그대로 말한다 — 화면이 사유를 다시 지어내지 않는다
            aria-label={blocked ? `${menu.label} — ${deleteBlocked}` : `${menu.label} 삭제`}
            {...(blocked && { title: deleteBlocked })}
            disabled={blocked || busy}
            onClick={() => onDelete(menu)}
          >
            <Icon name="trash" />
          </button>
        )}
      </span>
    </li>
  );
}

export default function SiteMenusPage() {
  const toast = useToast();
  const { canCreate, canUpdate, canRemove } = useRouteWritePermissions();

  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const location: MenuLocation = parseFilter(
    list.filters['location'] ?? 'header',
    MENU_LOCATIONS,
    'header',
  );

  const [modal, setModal] = useState<ModalState>({ kind: 'closed' });
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [pendingDelete, setPendingDelete] = useState<SiteMenu | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);
  const reorderControllerRef = useRef<AbortController | null>(null);
  const visibleControllerRef = useRef<AbortController | null>(null);

  const { data, isFetching, error, refetch } = useCrudListQuery(MENU_RESOURCE, siteMenuAdapter);
  const deleteMenu = useCrudDelete(MENU_RESOURCE, siteMenuAdapter);
  const reorder = useReorderSiteMenus();
  const setVisible = useSetSiteMenuVisible();

  const menus = useMemo(() => data ?? [], [data]);
  // [STATE-01] 스켈레톤/'불러오는 중'은 최초 로드에만 — 재조회 중에는 이전 행을 유지한다
  const firstLoading = isFetching && data === undefined;

  /** 조회기가 주는 것만 읽는다 — null 은 '없다' 가 아니라 '모른다' 다 */
  const catalog = sitePageCatalog();
  const broken = brokenMenuCount(menus, catalog);

  const roots = useMemo(() => rootMenus(menus, location), [menus, location]);

  const toggleExpand = (rootId: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  };

  /** 형제 배열 안에서 한 칸 옮긴다 — 공용 moveArrayItem 이 옮기고 저장소가 번호를 다시 매긴다 */
  const moveWithin = (siblings: readonly SiteMenu[]) => (index: number, delta: number) => {
    const orderedIds = moveArrayItem(
      siblings.map((menu) => menu.id),
      index,
      index + delta,
    );
    reorderControllerRef.current?.abort();
    const controller = new AbortController();
    reorderControllerRef.current = controller;
    reorder.mutate(
      { orderedIds, signal: controller.signal },
      {
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error('순서를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const onToggleVisible = (menu: SiteMenu, next: boolean) => {
    visibleControllerRef.current?.abort();
    const controller = new AbortController();
    visibleControllerRef.current = controller;
    setVisible.mutate(
      { id: menu.id, visible: next, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          toast.success(`'${menu.label}' 메뉴를 ${next ? '노출' : '숨김'}으로 바꿨습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error('노출 여부를 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    deleteMenu.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null) return;
    const target = pendingDelete;
    const controller = new AbortController();
    deleteControllerRef.current = controller;
    setDeleteError(null);

    deleteMenu.mutate(
      { id: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          setPendingDelete(null);
          toast.success(`'${target.label}' 메뉴를 삭제했습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setDeleteError('삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const busy = deleteMenu.isPending || setVisible.isPending;
  const locked = reorder.isPending;

  const createButton = canCreate ? (
    <Button
      variant="primary"
      size="md"
      onClick={() => setModal({ kind: 'create', parentId: null })}
    >
      <Icon name="plus-circle" />
      메뉴 추가
    </Button>
  ) : null;

  const rowPropsFor = (menu: SiteMenu, index: number, siblings: readonly SiteMenu[]) => ({
    menu,
    index,
    siblingCount: siblings.length,
    warning: menuLinkWarning(menu.target, catalog),
    broken: menuLinkHealth(menu.target, catalog) === 'missing',
    targetLabel: menuTargetLabel(menu.target, catalog),
    canCreate,
    canUpdate,
    canRemove,
    deleteBlocked: menuDeleteBlock(menus, menu.id),
    busy,
    locked,
    onMove: moveWithin(siblings),
    onToggleVisible,
    onEdit: (target: SiteMenu) => setModal({ kind: 'edit', menu: target }),
    onDelete: (target: SiteMenu) => {
      setDeleteError(null);
      setPendingDelete(target);
    },
  });

  return (
    <div style={pageStyle}>
      <div style={toolbarStyle}>
        <SegmentedControl
          ariaLabel="메뉴 위치"
          value={location}
          options={LOCATION_OPTIONS}
          onChange={(next) => list.setFilter('location', next)}
        />
        {createButton}
      </div>

      {/* 끊긴 링크는 데이터 사고다 — 개수를 먼저 알리고, 어느 행인지는 배지가 가리킨다 */}
      {broken > 0 && (
        <Alert tone="danger">
          {`연결된 페이지가 사라진 메뉴가 ${formatNumber(broken)}건 있습니다. 그대로 두면 방문자가 없는 주소로 이동합니다.`}
        </Alert>
      )}
      {catalog === null && (
        <Alert tone="warning">
          페이지 목록을 불러올 수 없어 내부 링크가 살아 있는지 확인하지 못했습니다.
        </Alert>
      )}

      {error !== null ? (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>메뉴를 불러오지 못했습니다.</span>
            <Button variant="secondary" onClick={() => void refetch()}>
              다시 시도
            </Button>
          </div>
        </Alert>
      ) : (
        <Card>
          {firstLoading ? (
            <p style={hintStyle}>불러오는 중…</p>
          ) : roots.length === 0 ? (
            <Empty label="메뉴" action={createButton} />
          ) : (
            <ul style={listStyle}>
              {roots.map((root, index) => {
                const panelId = `site-menu-children-${root.id}`;
                const children = childMenus(menus, root.id);
                const expanded = !collapsed.has(root.id);
                return (
                  <li key={root.id} style={groupStyle}>
                    <ul style={listStyle}>
                      <MenuRow
                        {...rowPropsFor(root, index, roots)}
                        expanded={expanded}
                        childPanelId={panelId}
                        childCount={children.length}
                        onToggleExpand={() => toggleExpand(root.id)}
                        onAddChild={(parent) => setModal({ kind: 'create', parentId: parent.id })}
                      />
                    </ul>
                    {children.length > 0 && expanded && (
                      <ul id={panelId} style={childListStyle}>
                        {children.map((child, childIndex) => (
                          <MenuRow key={child.id} {...rowPropsFor(child, childIndex, children)} />
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p style={hintStyle}>
            메뉴는 2단계까지 만들 수 있습니다. 하위 메뉴가 있는 메뉴는 하위를 먼저 정리해야 삭제할
            수 있습니다.
          </p>
        </Card>
      )}

      {modal.kind !== 'closed' && (
        <SiteMenuFormModal
          menus={menus}
          editing={modal.kind === 'edit' ? modal.menu : null}
          presetLocation={location}
          presetParentId={modal.kind === 'create' ? modal.parentId : null}
          onClose={() => setModal({ kind: 'closed' })}
          onSaved={(label, isEdit) => {
            setModal({ kind: 'closed' });
            toast.success(
              isEdit ? `'${label}' 메뉴를 저장했습니다.` : `'${label}' 메뉴를 추가했습니다.`,
            );
          }}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="메뉴 삭제"
          message={`'${pendingDelete.label}' 메뉴를 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="메뉴 삭제"
          busy={deleteMenu.isPending}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
