// AdminsPage — 관리자(운영진) 목록 (라우트: /users/admins)
//
// 좌: 운영진 그룹 패널 + 안내문 / 우: 탭 + 검색 카드 + 표 카드 + 페이지네이션.
// 구조·스타일·패턴은 회원 관리(MembersPage)를 그대로 따른다.
//
// [요구사항 — 지우지 말 것]
// - 운영진 그룹은 **이 화면에서 만들고 지운다**. 그 그룹은 메시지 템플릿의 '발신 프로필' 과
//   같은 실체이며(shared/domain/admin-group.ts), 두 화면이 같은 정본 저장소를 읽는다.
//   (예전 요구사항 '그룹을 만들지 않는다' 는 그 통합으로 대체됐다 — FS-005 §1.1.)
// - 상세(/users/admins/:id)와 등록/수정(/new · /:id/edit)은 **운영자 전용 화면**이다
//   (AdminDetailPage · AdminFormPage). 예전에는 상세가 회원 상세를 재사용했는데, 그 재사용이
//   운영자에게 회원 등급·적립금을 붙이고 삭제를 회원 엔드포인트로 보냈다 — types.ts 머리말 참조.
//
// [데이터] 화면은 data-source.ts 하고만 대화한다. 백엔드가 붙어도 이 파일은 바뀌지 않는다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { cssVar, tabId, tabPanelId } from '@tds/ui';

import { isAbort } from '../../shared/async';
import { parseFilter, useListState } from '../../shared/crud';
import { adminGroupDeletionBlock } from '../../shared/domain/admin-group';
import { usePermissions } from '../../shared/permissions/PermissionProvider';
import { useRouteWritePermissions } from '../../shared/permissions/RequirePermission';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  Pagination,
  useToast,
} from '../../shared/ui';
import { formatNumber } from '../../shared/format';
import { AdminGroupPanel } from './components/AdminGroupPanel';
import { AdminsSearchCard } from './components/AdminsSearchCard';
import { AdminsTable } from './components/AdminsTable';
import { AdminsToolbar } from './components/AdminsToolbar';
import { CreateAdminGroupModal } from './components/CreateAdminGroupModal';

import {
  useAdminGroupsQuery,
  useAdminGroupUsageQuery,
  useAdminsQuery,
  useDeleteAdminGroup,
} from './queries';
import { ADMIN_TABS, GROUP_ALL, PAGE_SIZE, ROLE_ALL } from './types';
import type { AdminTabId } from './types';

/** 검색어 디바운스 — 타이핑 한 글자마다 조회하지 않는다 */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * 역할 필터의 URL 기본값 (IA-13).
 *
 * [왜 이 축만 URL 인가] 역할 필터는 **다른 화면이 링크로 가리키는** 유일한 조건이다 — 권한 관리의
 * '이 역할 운영자 N명' 이 `/users/admins?role=<id>` 로 착지한다. 링크가 존재하려면 그 상태의
 * 소유자가 URL 이어야 한다. (그룹·검색·페이지는 이 화면 안에서만 쓰이므로 지금 구조를 건드리지
 * 않는다 — 필요해지면 같은 useListState 로 옮기면 된다.)
 */
const FILTER_DEFAULTS = { role: ROLE_ALL } as const;

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  // 좌측 패널은 고정 폭, 표는 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다)
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

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

/** 표 카드의 가로 스크롤 — 컬럼이 많아 좁은 화면에서 넘칠 수 있다 */
const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/** '전체 운영자 N명' 의 숫자 — 파란색 강조 */
const countStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  fontVariantNumeric: 'tabular-nums',
};

const selectedHintStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.regular'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

export default function AdminsPage() {
  const navigate = useNavigate();
  const { canCreate } = useRouteWritePermissions();
  const [tab, setTab] = useState<AdminTabId>('list');

  /**
   * @tds/ui Tabs 는 도메인을 모른다 — onChange 로 `string` 을 준다.
   * 캐스팅하지 않고 목록에서 되찾아 좁힌다 (모르는 id 는 무시한다).
   */
  const selectTab = useCallback((id: string) => {
    const next = ADMIN_TABS.find((item) => item.id === id);
    if (next !== undefined) setTab(next.id);
  }, []);
  const [groupId, setGroupId] = useState<string>(GROUP_ALL);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  /* ── 역할 (열 + 필터) ─────────────────────────────────────────────────────
   *
   * 역할의 정본은 권한 스토어다 — 운영자 레코드는 roleId 만 들고 있다(types.ts). 표는 이름을
   * 받아 그리고, 필터는 id 로 건다.
   */
  const { roles } = usePermissions();

  // 고른 역할의 단일 원천 = URL (IA-13)
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  // 손으로 고친 ?role=거짓말 이나 **삭제된 역할을 가리키는 옛 링크**가 목록을 0건으로 만들지
  // 않게 한다 — 지금 존재하는 역할이 아니면 '전체'로 되돌린다
  const roleValues = useMemo(() => [ROLE_ALL, ...roles.map((role) => role.id)], [roles]);
  const roleId = parseFilter(list.filters['role'] ?? ROLE_ALL, roleValues, ROLE_ALL);

  const roleNames = useMemo<Readonly<Record<string, string>>>(
    () => Object.fromEntries(roles.map((role) => [role.id, role.name])),
    [roles],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  // 조건이 바뀌면 1페이지부터 다시 — 뒤쪽 페이지를 보다 검색하면 빈 화면이 뜨는 걸 막는다
  useEffect(() => {
    setPage(1);
  }, [groupId, keyword, roleId]);

  // 페이지/필터가 바뀌면 선택은 무의미해진다 (보이지 않는 행이 선택된 채로 남지 않게)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [groupId, keyword, roleId, page]);

  const query = useMemo(
    () => ({ groupId, roleId, keyword, page }),
    [groupId, roleId, keyword, page],
  );
  const { data, isFetching, error, refetch } = useAdminsQuery(query);
  /**
   * [STATE-01] 스켈레톤은 '데이터가 아직 **없을** 때' 만이다.
   *
   * 예전 주석은 "useAsyncData 도 재조회 중 loading 이 true 였다"며 `isFetching` 을 그대로
   * 넘기는 것을 **동작 보존**이라 정당화했다. 그러나 그것은 useAsyncData 의 한계였지 지키기로
   * 한 계약이 아니다 — react-query 를 도입한 이유가 바로 '재조회 중 이전 행 유지'다(ADR-0008
   * §3.2). queries.ts 의 placeholderData 도 그래서 켜 두었다. 보존해야 할 동작이 아니라
   * 고쳐야 할 버그였다.
   */
  const firstLoading = isFetching && data === undefined;

  // 그룹 목록은 필터/검색과 무관하다 — 캐시 키가 달라 목록 조회와 별개로 산다
  const { data: groups } = useAdminGroupsQuery();

  // useMemo 로 고정한다 — `data?.admins ?? []` 를 그대로 쓰면 매 렌더 새 배열이 되어
  // 아래 toggleAll(useCallback)의 deps 가 매번 바뀐다 (react-hooks/exhaustive-deps)
  const admins = useMemo(() => data?.admins ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const toggleOne = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      setSelectedIds(checked ? new Set(admins.map((admin) => admin.id)) : new Set());
    },
    [admins],
  );

  /* ── 그룹 만들기 · 지우기 ────────────────────────────────────────────────── */

  const toast = useToast();
  const [creatingGroup, setCreatingGroup] = useState(false);

  /**
   * 삭제 흐름은 두 단계다.
   *
   *   1) '삭제' 를 누르면 **참조 현황부터** 조회한다(운영자 수 · 이 그룹을 발신 프로필로 쓰는
   *      템플릿). 조회가 끝날 때까지 다이얼로그를 열지 않는다.
   *   2) 막을 이유가 있으면 다이얼로그 대신 **이유를 화면에 띄운다.** ConfirmDialog 에는 확인
   *      버튼을 잠그는 수단이 없어서(@tds/ui 계약), 막힌 그룹에 다이얼로그를 띄우면 눌러도 매번
   *      같은 오류만 나오는 버튼을 보여 주게 된다. 막을 이유가 없을 때만 확인을 세운다.
   */
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  /** 삭제가 막힌 이유 — 다이얼로그가 아니라 패널 위 배너로 뜬다 */
  const [deletionBlock, setDeletionBlock] = useState<string | null>(null);

  const usage = useAdminGroupUsageQuery(deletingGroupId);
  const remove = useDeleteAdminGroup();
  const deleteControllerRef = useRef<AbortController | null>(null);

  const deletingGroup = groups?.find((group) => group.id === deletingGroupId) ?? null;

  /**
   * 참조 현황이 도착하면 판정한다 — 막히면 다이얼로그를 열지 않고 배너로 돌린다.
   * 판정 문구의 정본은 도메인(adminGroupDeletionBlock)이다: 여기서 만든 문장과 어댑터가 거절할 때
   * 던지는 문장이 달라지면, 같은 사실을 경로에 따라 다르게 말하게 된다.
   */
  useEffect(() => {
    if (deletingGroup === null || usage.data === undefined) return;
    const blocked = adminGroupDeletionBlock(deletingGroup.name, usage.data);
    if (blocked === null) return;
    setDeletionBlock(blocked);
    setDeletingGroupId(null);
  }, [deletingGroup, usage.data]);

  /** 현황 조회 자체가 실패하면 지울 수 있는지 알 수 없다 — 모른 채 지우게 두지 않는다 */
  useEffect(() => {
    if (usage.error === null) return;
    setDeletionBlock(
      '그룹의 사용 현황을 확인하지 못해 삭제할 수 없습니다. 잠시 후 다시 시도해 주세요.',
    );
    setDeletingGroupId(null);
  }, [usage.error]);

  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    remove.reset();
    setDeletingGroupId(null);
    setDeleteError(null);
  };

  const confirmDelete = () => {
    if (deletingGroup === null) return;
    const target = deletingGroup;
    setDeleteError(null);

    const controller = new AbortController();
    deleteControllerRef.current = controller;

    remove.mutate(
      { groupId: target.id, signal: controller.signal },
      {
        onSuccess: () => {
          setDeletingGroupId(null);
          // 지운 그룹이 필터에 걸린 채로 남으면 목록이 영원히 0건이다 — '전체 운영자' 로 되돌린다
          setGroupId(GROUP_ALL);
          toast.success(`'${target.name}' 그룹을 삭제했습니다.`);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          // 실패해도 다이얼로그는 닫지 않는다 — 확인 재클릭이 곧 재시도다(ConfirmDialog 계약).
          // 경합으로 가드에 걸린 경우 어댑터가 준 문장이 그대로 뜬다.
          setDeleteError(
            cause instanceof Error && cause.message !== ''
              ? cause.message
              : '그룹을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
          );
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      {deletionBlock !== null && (
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>{deletionBlock}</span>
            <Button variant="secondary" onClick={() => setDeletionBlock(null)}>
              닫기
            </Button>
          </div>
        </Alert>
      )}

      <div style={layoutStyle}>
        <AdminGroupPanel
          value={groupId}
          groups={groups ?? []}
          counts={data?.groupCounts ?? null}
          totalAll={data?.totalAll ?? null}
          checkingDeletion={usage.isFetching}
          onChange={setGroupId}
          onCreate={() => setCreatingGroup(true)}
          onDelete={() => {
            setDeletionBlock(null);
            setDeleteError(null);
            setDeletingGroupId(groupId);
          }}
        />

        <div style={mainColumnStyle}>
          <AdminsToolbar
            tab={tab}
            onTabChange={selectTab}
            canCreate={canCreate}
            onCreate={() => navigate('/users/admins/new')}
          />

          <div id={tabPanelId(tab)} role="tabpanel" aria-labelledby={tabId(tab)} style={panelStyle}>
            <AdminsSearchCard
              keyword={keywordInput}
              onKeywordChange={setKeywordInput}
              roles={roles}
              roleId={roleId}
              onRoleChange={(next) => list.setFilter('role', next)}
            />

            {error === null ? (
              <>
                <Card aria-labelledby="admins-table-title">
                  <CardTitle id="admins-table-title">
                    <>
                      전체 운영자{' '}
                      <span style={countStyle}>{firstLoading ? '—' : formatNumber(total)}</span>명
                      {selectedIds.size > 0 && (
                        <span style={selectedHintStyle}>
                          {` · ${formatNumber(selectedIds.size)}명 선택됨`}
                        </span>
                      )}
                    </>
                  </CardTitle>

                  <div style={tableWrapStyle}>
                    <AdminsTable
                      admins={admins}
                      roleNames={roleNames}
                      loading={firstLoading}
                      selectedIds={selectedIds}
                      onToggleOne={toggleOne}
                      onToggleAll={toggleAll}
                    />
                  </div>
                </Card>

                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                  label="운영자 목록 페이지"
                />
              </>
            ) : (
              <Alert tone="danger">
                <div style={errorBodyStyle}>
                  <span>운영자 목록을 불러오지 못했습니다.</span>
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
        </div>
      </div>

      {creatingGroup && (
        <CreateAdminGroupModal
          onClose={() => setCreatingGroup(false)}
          onCreated={(name) => {
            setCreatingGroup(false);
            toast.success(`'${name}' 그룹을 만들었습니다.`);
            // 좌측 목록·건수 재조회는 useCreateAdminGroup 의 무효화가 맡는다
          }}
        />
      )}

      {deletingGroup !== null && usage.data !== undefined && (
        <ConfirmDialog
          intent="delete"
          title="운영진 그룹 삭제"
          message={
            deletingGroup.usableAsSender
              ? `'${deletingGroup.name}' 그룹을 삭제합니다. 이 그룹에 속한 운영자는 없으며, 등록된 발신번호·발신 이메일도 함께 사라져 메시지 템플릿의 발신 프로필 목록에서 빠집니다.`
              : `'${deletingGroup.name}' 그룹을 삭제합니다. 이 그룹에 속한 운영자는 없으며, 좌측 그룹 필터에서 사라집니다.`
          }
          confirmLabel="그룹 삭제"
          busy={remove.isPending}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
