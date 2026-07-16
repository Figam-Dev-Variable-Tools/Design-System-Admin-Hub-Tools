// MembersPage — 회원 목록 (라우트: /users/members) · A40 소유
//
// 좌: 등급 필터 + 그룹 필터 사이드 / 우: 검색 + 일괄 액션 + 표 + 페이지네이션.
// 등급과 그룹은 다른 축이며, 함께 고르면 AND 로 걸린다.
//
// [요구사항 — 지우지 말 것]
// - '사용자 추가' / '대량 추가' 버튼은 만들지 않는다. 고객은 회원가입으로만 유입된다.
//   ('새 그룹 만들기'는 회원이 아니라 묶음을 만드는 것이라 이 규칙과 무관하다.)
// - 행 ⋯ 메뉴에는 '회원 삭제' / '알림 발송' 두 개만 둔다. 일괄 액션도 같은 2종이다.
//
// [실패는 조용히 삼키지 않는다]
// 내보내기·알림 발송·회원 삭제·그룹 목록 조회는 실패할 수 있다. 실패는 전부 사용자에게 보인다.
// - 쓰기 작업(내보내기·발송·삭제)의 성공/실패 → **토스트** (실패는 자동으로 사라지지 않고 '다시 시도'가 붙는다)
// - 목록 **조회** 실패 → 인라인 배너 (화면이 비어 있고 할 일이 '다시 시도' 하나뿐이라 사라지면 안 된다)
// - 삭제 실패 → 확인 다이얼로그 **안** 배너 (모달이 떠 있는 동안 토스트는 시선 밖이다)
// 이 구분 기준은 shared/ui/README.md 에 적혀 있다.
//
// [데이터] 화면은 data-source.ts 하고만 대화한다. 백엔드가 붙어도 이 파일은 바뀌지 않는다.
//
// [조회 상태의 소유자 — F2에서 바뀐 것]
// page·tier·group·keyword 와 선택은 예전에 이 파일의 useState 6개였다. 그 상태는 이제
// shared/crud/useListState 가 **URL 쿼리스트링**으로 소유한다 (IA-13). 이 화면이 이미 옳게
// 하던 두 가지(페이지 보정·조건 변경 시 선택 해제)도 그 훅으로 승격됐다 — 여기 있던 사본이
// 정본이었지만, 사본인 한 다른 26개 목록은 그 혜택을 받지 못했다.
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

import './members.css';
import { isAbort } from '../../shared/async';
import { useListState } from '../../shared/crud';
import { downloadCsv } from '../../shared/download';
import { formatNumber } from '../../shared/format';
import { Alert, Button, ConfirmDialog, hintStyle, Pagination, useToast } from '../../shared/ui';
import { CreateGroupModal } from './components/CreateGroupModal';
import { GroupFilter } from './components/GroupFilter';
import { MembersToolbar } from './components/MembersToolbar';
import { MembersTable } from './components/MembersTable';
import { TierFilter } from './components/TierFilter';
import { toCsv } from './data-source';
import {
  useBulkSendNotification,
  useDeleteMembers,
  useExportMembers,
  useMemberGroupsQuery,
  useMembersQuery,
  useSendNotification,
} from './queries';
import { GROUP_ALL, PAGE_SIZE } from './types';
import type { Member, MemberTier } from './types';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  // 좌측 필터는 고정 폭, 표는 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다)
  gridTemplateColumns: 'calc(var(--tds-space-6) * 9) minmax(0, 1fr)',
  gap: 'var(--tds-space-6)',
  alignItems: 'start',
};

const mainColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
};

const bannerLinkStyle: CSSProperties = {
  color: 'inherit',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  textDecoration: 'underline',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

const sidebarStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
  minWidth: 0,
};

const sidebarNoticeStyle: CSSProperties = {
  ...hintStyle,
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 0,
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderTopStyle: 'solid',
  borderTopWidth: 'var(--tds-border-width-thin)',
  borderTopColor: 'var(--tds-color-border-default)',
};

/** URL 파라미터의 기본값 — 이 값과 같으면 URL 에서 지운다(공유 링크를 짧게) */
const FILTER_DEFAULTS = { tier: 'all', group: GROUP_ALL } as const;

/** URL 문자열 → MemberTier — 손으로 고친 ?tier=거짓말 이 조회를 깨지 않게 한다 */
function isMemberTier(value: string): value is MemberTier {
  return value === 'normal' || value === 'vip' || value === 'vvip';
}

export default function MembersPage() {
  const toast = useToast();

  // page·tier·group·keyword·선택의 단일 원천 = URL (IA-13). 검색은 IME 안전 (COMP-10).
  const list = useListState({ filterDefaults: FILTER_DEFAULTS });
  const rawTier = list.filters['tier'] ?? 'all';
  const tier: MemberTier | 'all' = isMemberTier(rawTier) ? rawTier : 'all';
  const groupId = list.filters['group'] ?? GROUP_ALL;
  const { keyword, page, selectedIds } = list;

  // 닫으면 세션 동안 다시 뜨지 않는다 (저장하지 않는다 — 새로고침하면 다시 보인다)
  const [bannerOpen, setBannerOpen] = useState(true);

  /** 알림 발송이 진행 중인 회원 — 행 메뉴 항목이 잠기고 라벨이 '발송 중…' 이 된다.
   *  행마다 동시에 보낼 수 있어 뮤테이션의 단일 isPending 으로는 표현되지 않는다 — 집합을 유지한다 */
  const [notifyingIds, setNotifyingIds] = useState<ReadonlySet<string>>(new Set());

  /** 삭제 확인 대상 — 행 ⋯ 메뉴(1명)와 일괄 삭제(N명)가 같은 다이얼로그를 쓴다 */
  const [pendingDelete, setPendingDelete] = useState<readonly Member[] | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteControllerRef = useRef<AbortController | null>(null);

  const [creatingGroup, setCreatingGroup] = useState(false);

  // 쓰기 — 전부 도메인 뮤테이션을 거친다 (재시도는 끈다: shared/query/queryClient.ts 참조)
  const exportMembers = useExportMembers();
  const notify = useSendNotification();
  const bulkNotify = useBulkSendNotification();
  const deleteMembers = useDeleteMembers();

  const exporting = exportMembers.isPending;
  const bulkNotifying = bulkNotify.isPending;
  const deleting = deleteMembers.isPending;

  // [지워진 것들 — useListState 가 소유한다]
  //  · 검색어 디바운스 → useDebouncedSearch (조합 중 커밋 금지가 추가됐다 — COMP-10)
  //  · 조건 변경 시 page=1 → patchParams(resetPage)
  //  · 조건 변경 시 선택 해제 → viewSignature effect (STATE-04-b)

  const query = useMemo(() => ({ tier, groupId, keyword, page }), [tier, groupId, keyword, page]);
  const { data, isFetching, error, refetch } = useMembersQuery(query);

  /**
   * [STATE-01] 스켈레톤은 **최초 로드에만**.
   * 예전에는 `isFetching` 을 그대로 loading 으로 썼다 — 재조회 때도 true 라 이미 보고 있던
   * 497명의 표가 스켈레톤으로 덮였다. useAsyncData 시절의 동작을 보존한 것이었지만,
   * placeholderData(keepPrevious)를 켜 둔 이유를 화면이 스스로 무효화하고 있었다.
   */
  const firstLoading = isFetching && data === undefined;
  const refreshing = isFetching && data !== undefined;

  // 그룹 목록은 필터/검색과 무관하다 — 캐시 키가 달라 목록 조회와 별개로 산다.
  // 실패하면 좌측 필터에 전용 재시도 경로가 열린다 (목록 조회와 별개의 요청이다)
  const { data: groups, error: groupsError, refetch: refetchGroups } = useMemberGroupsQuery();

  // useMemo 로 고정한다 — `data?.members ?? []` 를 그대로 쓰면 매 렌더 새 배열이 되어
  // 아래 toggleAll(useCallback)의 deps 가 매번 바뀐다 (react-hooks/exhaustive-deps)
  const members = useMemo(() => data?.members ?? [], [data]);
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // 다른 관리자가 회원을 지워 총 페이지가 줄면 현재 페이지가 범위를 벗어난다 —
  // 빈 화면을 보여주는 대신 마지막 페이지로 보정하고 재조회한다 (STATE-04-a · useListState 소유)
  const { clampPage } = list;
  useEffect(() => {
    if (data === undefined) return;
    clampPage(Math.ceil(data.total / PAGE_SIZE));
  }, [data, clampPage]);

  const selectedMembers = members.filter((member) => selectedIds.has(member.id));

  /** 내보내기 — 현재 필터/검색에 걸린 전체를 CSV 로 받아 a[download] 로 떨군다 */
  const onExport: () => void = () => {
    const controller = new AbortController();

    exportMembers.mutate(
      { query, signal: controller.signal },
      {
        onSuccess: (all) => {
          // BOM·이스케이프·파일 저장은 shared/download 가 맡는다 (로그인 이력 화면과 같은 구현)
          downloadCsv('members', toCsv(all));
          toast.success(`회원 ${formatNumber(all.length)}명을 CSV 로 내보냈습니다.`);
        },
        onError: () => {
          // 실패는 성공 톤으로 알릴 수 없다 — 자동으로 사라지지 않는 실패 토스트 + 재시도
          toast.error('내보내기에 실패했습니다. 잠시 후 다시 시도해 주세요.', { retry: onExport });
        },
      },
    );
  };

  const markNotifying = (id: string, busy: boolean) => {
    setNotifyingIds((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  /** 행 ⋯ '알림 발송' — 확인 절차 없이 즉시 요청한다. 진행 중에는 그 행의 항목이 잠긴다 */
  const onNotify: (member: Member) => void = (member) => {
    if (notifyingIds.has(member.id)) return;
    markNotifying(member.id, true);

    notify.mutate(member.id, {
      onSuccess: () => {
        toast.success(`${member.nickname} 회원에게 알림을 발송했습니다.`);
      },
      onError: () => {
        toast.error(
          `${member.nickname} 회원에게 알림을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
          { retry: () => onNotify(member) },
        );
      },
      onSettled: () => {
        markNotifying(member.id, false);
      },
    });
  };

  /** 일괄 알림 발송 — 선택된 회원 전원. 부분 실패도 건수로 알린다 */
  const onBulkNotify: (targets: readonly Member[]) => void = (targets) => {
    if (targets.length === 0 || bulkNotifying) return;

    bulkNotify.mutate(targets, {
      onSuccess: (results) => {
        const failed = results.filter((result) => result.status === 'rejected').length;

        if (failed === 0) {
          toast.success(`회원 ${formatNumber(targets.length)}명에게 알림을 발송했습니다.`);
          return;
        }

        toast.error(
          `회원 ${formatNumber(targets.length)}명 중 ${formatNumber(failed)}명에게 알림을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
          { retry: () => onBulkNotify(targets) },
        );
      },
    });
  };

  const openDelete = (targets: readonly Member[]) => {
    setDeleteError(null);
    setPendingDelete(targets);
  };

  /** 다이얼로그를 닫으면 진행 중이던 삭제 요청도 취소한다 */
  const closeDelete = () => {
    deleteControllerRef.current?.abort();
    deleteControllerRef.current = null;
    // 취소된 뮤테이션의 isPending 을 되돌린다 (react-query 는 abort 를 모른다 — signal 은 우리 것이다)
    deleteMembers.reset();
    setDeleteError(null);
    setPendingDelete(null);
  };

  const onConfirmDelete = () => {
    if (pendingDelete === null || pendingDelete.length === 0) return;
    const targets = pendingDelete;
    const first = targets[0];
    if (first === undefined) return;

    const controller = new AbortController();
    deleteControllerRef.current = controller;

    setDeleteError(null);

    // 목록 무효화(= 예전의 reload())는 뮤테이션 훅의 onSuccess 가 전원 성공일 때만 수행한다
    deleteMembers.mutate(
      { targets, signal: controller.signal },
      {
        onSuccess: (results) => {
          if (controller.signal.aborted) return;

          const failed = results.filter(
            (result) => result.status === 'rejected' && !isAbort(result.reason),
          ).length;

          if (failed > 0) {
            // 실패하면 다이얼로그를 닫지 않는다 — 안내를 띄우고 버튼을 되살린다(재클릭 = 재시도)
            setDeleteError(
              targets.length === 1
                ? '회원을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.'
                : `회원 ${formatNumber(targets.length)}명 중 ${formatNumber(failed)}명을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.`,
            );
            return;
          }

          setPendingDelete(null);
          list.clearSelection();
          toast.success(
            targets.length === 1
              ? `${first.nickname} 회원을 삭제했습니다.`
              : `회원 ${formatNumber(targets.length)}명을 삭제했습니다.`,
          );
        },
      },
    );
  };

  const deleteMessage =
    pendingDelete === null || pendingDelete.length === 0
      ? ''
      : pendingDelete.length === 1 && pendingDelete[0] !== undefined
        ? `${pendingDelete[0].nickname}(${pendingDelete[0].account}) 회원을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`
        : `선택한 회원 ${formatNumber(pendingDelete.length)}명을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`;

  return (
    <div style={pageStyle}>
      {bannerOpen && (
        <Alert tone="warning" onClose={() => setBannerOpen(false)}>
          회원이 가입했어요! 가입 축하, 비밀번호 찾기 등 메일을 보내려면{' '}
          <Link to="/marketing/templates" style={bannerLinkStyle} className="tds-ui-focusable">
            메일 발송 설정
          </Link>
          을 해보세요.
        </Alert>
      )}

      <div style={layoutStyle}>
        <aside style={sidebarStyle}>
          <TierFilter
            value={tier}
            counts={data?.counts ?? null}
            onChange={(next) => list.setFilter('tier', next)}
          />

          <GroupFilter
            value={groupId}
            groups={groups ?? []}
            counts={data?.groupCounts ?? null}
            onChange={(next) => list.setFilter('group', next)}
            onCreate={() => setCreatingGroup(true)}
            failed={groupsError !== null}
            onRetry={() => {
              void refetchGroups();
            }}
          />

          <p style={sidebarNoticeStyle}>
            고객 목록은 회원가입으로만 유입됩니다. 관리자가 회원을 직접 추가하는 기능은 제공하지
            않습니다.
          </p>
        </aside>

        <div style={mainColumnStyle}>
          <MembersToolbar
            keyword={list.searchInput}
            onKeywordChange={list.setSearchInput}
            searchInputProps={list.searchInputProps}
            onExport={onExport}
            exporting={exporting}
            selectedCount={selectedMembers.length}
            onBulkNotify={() => onBulkNotify(selectedMembers)}
            onBulkDelete={() => openDelete(selectedMembers)}
            bulkNotifying={bulkNotifying}
          />

          {error === null ? (
            <>
              <div style={summaryRowStyle}>
                {/* 재조회 중에도 건수를 지우지 않는다 — 이전 사실을 유지한 채 덧붙인다 (STATE-01/03) */}
                <p style={hintStyle} aria-busy={refreshing}>
                  {firstLoading ? '불러오는 중…' : `전체 ${formatNumber(total)}명`}
                  {selectedIds.size > 0 && ` · ${formatNumber(selectedIds.size)}명 선택됨`}
                </p>
              </div>

              <MembersTable
                members={members}
                loading={firstLoading}
                selectedIds={selectedIds}
                onToggleOne={list.toggleOne}
                onToggleAll={(checked) =>
                  list.toggleAll(
                    members.map((member) => member.id),
                    checked,
                  )
                }
                onDelete={(member) => openDelete([member])}
                onNotify={onNotify}
                notifyingIds={notifyingIds}
              />

              <Pagination page={page} totalPages={totalPages} onChange={list.setPage} />
            </>
          ) : (
            <Alert tone="danger">
              <div style={errorBodyStyle}>
                <span>회원 목록을 불러오지 못했습니다.</span>
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

      {creatingGroup && (
        <CreateGroupModal
          onClose={() => setCreatingGroup(false)}
          onCreated={(name) => {
            setCreatingGroup(false);
            toast.success(`'${name}' 그룹을 만들었습니다.`);
            // 그룹 목록 재조회는 useCreateGroup 의 onSuccess 무효화가 맡는다 (예전의 reloadGroups() 자리)
          }}
        />
      )}

      {pendingDelete !== null && (
        <ConfirmDialog
          intent="delete"
          title="회원 삭제"
          message={deleteMessage}
          confirmLabel="회원 삭제"
          busy={deleting}
          error={deleteError}
          onConfirm={onConfirmDelete}
          onCancel={closeDelete}
        />
      )}
    </div>
  );
}
