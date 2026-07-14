// AdminsPage — 관리자(운영진) 목록 (라우트: /users/admins) · A40 소유
//
// 좌: 운영진 그룹 패널 + 안내문 / 우: 탭 + 검색 카드 + 표 카드 + 페이지네이션.
// 구조·스타일·패턴은 회원 관리(MembersPage)를 그대로 따른다.
//
// [요구사항 — 지우지 말 것]
// - **'새 운영진 그룹 만들기' 를 만들지 않는다.** 운영진 그룹은 조회/필터 대상일 뿐이다.
// - 상세(/users/admins/:id)는 회원 상세 화면(MemberDetailPage)을 재사용한다 — App.tsx 참조.
//
// [데이터] 화면은 data-source.ts 하고만 대화한다. 백엔드가 붙어도 이 파일은 바뀌지 않는다.
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Tabs, tabId, tabPanelId } from '@tds/ui';

import { Alert, Button, Card, CardTitle, Pagination } from '../../shared/ui';
import { formatNumber } from '../../shared/format';
import { AdminGroupPanel } from './components/AdminGroupPanel';
import { AdminsSearchCard } from './components/AdminsSearchCard';
import { AdminsTable } from './components/AdminsTable';

import { useAdminGroupsQuery, useAdminsQuery } from './queries';
import { ADMIN_TABS, GROUP_ALL, PAGE_SIZE } from './types';
import type { AdminTabId } from './types';

/** 검색어 디바운스 — 타이핑 한 글자마다 조회하지 않는다 */
const SEARCH_DEBOUNCE_MS = 250;

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  // 좌측 패널은 고정 폭, 표는 남는 폭 전부 (minmax(0,…) 이라야 표가 그리드를 밀지 않는다)
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

const panelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  minWidth: 0,
};

/** 표 카드의 가로 스크롤 — 컬럼이 많아 좁은 화면에서 넘칠 수 있다 */
const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/** '전체 운영자 N명' 의 숫자 — 파란색 강조 */
const countStyle: CSSProperties = {
  color: 'var(--tds-color-action-primary-default)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  fontVariantNumeric: 'tabular-nums',
};

const selectedHintStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-regular)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

export default function AdminsPage() {
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(keywordInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keywordInput]);

  // 조건이 바뀌면 1페이지부터 다시 — 뒤쪽 페이지를 보다 검색하면 빈 화면이 뜨는 걸 막는다
  useEffect(() => {
    setPage(1);
  }, [groupId, keyword]);

  // 페이지/필터가 바뀌면 선택은 무의미해진다 (보이지 않는 행이 선택된 채로 남지 않게)
  useEffect(() => {
    setSelectedIds(new Set());
  }, [groupId, keyword, page]);

  const query = useMemo(() => ({ groupId, keyword, page }), [groupId, keyword, page]);
  // isFetching(= 재조회 중에도 true)을 로딩으로 쓴다 — useAsyncData 도 재조회 중 loading 이 true 였다
  const { data, isFetching: loading, error, refetch } = useAdminsQuery(query);

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

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <AdminGroupPanel
          value={groupId}
          groups={groups ?? []}
          counts={data?.groupCounts ?? null}
          totalAll={data?.totalAll ?? null}
          onChange={setGroupId}
        />

        <div style={mainColumnStyle}>
          <Tabs value={tab} items={ADMIN_TABS} ariaLabel="관리자 관리 영역" onChange={selectTab} />

          <div id={tabPanelId(tab)} role="tabpanel" aria-labelledby={tabId(tab)} style={panelStyle}>
            <AdminsSearchCard keyword={keywordInput} onKeywordChange={setKeywordInput} />

            {error === null ? (
              <>
                <Card aria-labelledby="admins-table-title">
                  <CardTitle id="admins-table-title">
                    <>
                      전체 운영자{' '}
                      <span style={countStyle}>{loading ? '—' : formatNumber(total)}</span>명
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
                      loading={loading}
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
    </div>
  );
}
