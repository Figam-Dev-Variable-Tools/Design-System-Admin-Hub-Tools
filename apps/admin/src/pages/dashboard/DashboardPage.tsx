// DashboardPage — 대시보드 (라우트: /dashboard)
//
// 구성: 업무 탭(상품/문의/영업) → 오늘의 할일 → 리스트 카드 2종 → 통계(방문자 차트 · 기간별 분석)
//
// [권한] 모든 위젯이 shared/permissions 의 키에 걸려 있다. 최상위 관리자가 권한 관리 화면에서
// 끄면 리로드 없이 즉시 사라진다. 위젯 추가 시 feature-registry 에 키를 등록하고 여기서 참조한다.
//
// [조립만 한다] 탭 해소는 useDashboardTabs(), 패널 내용은 <DashboardTabPanel/>, 통계는
// <StatsSection/> 이 소유한다. 이 페이지에 남은 분기는 **무엇을 렌더할지 고르는 것**뿐이다.
//
// [스타일] 토큰 CSS 변수만 — 하드코딩 색상 hex / px 리터럴 0건.
import { useCallback, useState } from 'react';
import type { CSSProperties } from 'react';
import { Alert, Tabs } from '@tds/ui';

import { usePermissions } from '../../shared/permissions/PermissionProvider';
import { DashboardTabPanel } from './components/DashboardTabPanel';
import { StatsSection } from './components/StatsSection';
import { useTabDataQuery } from './queries';
import { DEFAULT_STATS_RANGE } from './stats-types';
import type { StatsRange } from './stats-types';
import { useDashboardTabs } from './useDashboardTabs';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const emptyStyle: CSSProperties = {
  margin: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

export default function DashboardPage() {
  const { isEnabled } = usePermissions();
  const { visibleTabs, activeTab, selectTab } = useDashboardTabs();

  const [statsRange, setStatsRange] = useState<StatsRange>(DEFAULT_STATS_RANGE);

  /**
   * @tds/ui Tabs 는 도메인을 모른다 — onChange 로 `string` 을 준다.
   * 캐스팅하지 않고 **보이는 탭 목록에서 되찾아** 좁힌다: 권한이 없는 탭 id 는 여기서 걸러진다.
   */
  const handleTabChange = useCallback(
    (id: string) => {
      const next = visibleTabs.find((tab) => tab.id === id);
      if (next !== undefined) selectTab(next.id);
    },
    [visibleTabs, selectTab],
  );

  const showTodo = isEnabled('dashboard.todo');
  const showLists = isEnabled('dashboard.lists');
  const needsTabData = visibleTabs.length > 0 && (showTodo || showLists);

  /**
   * [STATE-01 의 예외 — `isFetching` 이 여기서는 **옳다**. 지우지 말 것]
   *
   * 목록 화면들은 스켈레톤 조건을 `data === undefined` 로 좁혔다(재조회 중 이전 행 유지).
   * 이 화면은 그 규칙을 따르지 않는다. 이유는 '옛 동작 보존'이 아니라 **조회가 화면의 컨트롤에
   * 종속**되기 때문이다:
   *
   *   · 탭 데이터 조회는 **활성 탭**의 함수다 (FS-002-EL-014). 탭을 '문의'로 바꾼 순간
   *     이전 '상품' 탭 데이터는 갱신 중인 같은 행이 아니라 **다른 탭의 내용**이다 —
   *     그것을 '문의' 탭 아래 남겨 두는 것은 유지가 아니라 **거짓말**이다.
   *   · 그래서 명세가 스켈레톤을 요구한다: FS-002-EL-014 '조회 중에는 카드 골격을 유지한 채
   *     EL-020 · EL-026 스켈레톤으로 대체한다', FS-002-EL-015 '조회 중 aria-busy="true" +
   *     스켈레톤(EL-020)'.
   *
   * (TodoCard/ListCard 는 `busy` 와 스켈레톤을 `loading` 하나로 묶어 둔 계약이라, 설령 규칙을
   *  바꾸고 싶어도 앱층에서 'aria-busy 는 켜고 내용은 남긴다'를 만들 수 없다 — packages/ui 의
   *  계약 변경 사안이다.)
   */
  const { data, isFetching: loading, error } = useTabDataQuery(activeTab, needsTabData);

  const hasStats = isEnabled('dashboard.stats.visitors') || isEnabled('dashboard.stats.period');

  // 위젯이 하나도 없으면 셸만 남기고 안내 한 줄로 대체한다 (FS-002-EL-044)
  if (visibleTabs.length === 0 && !hasStats) {
    return (
      <p style={emptyStyle}>표시할 수 있는 대시보드 항목이 없습니다. 권한 설정을 확인하세요.</p>
    );
  }

  return (
    <div style={pageStyle}>
      {/* 권한으로 걸러진 탭만 넘긴다 — Tabs 는 받은 것만 렌더한다 (FS-002-EL-012 · EL-013) */}
      {visibleTabs.length > 0 && (
        <Tabs
          value={activeTab}
          items={visibleTabs}
          ariaLabel="업무 영역"
          onChange={handleTabChange}
        />
      )}

      {error !== null && (
        <Alert tone="danger">
          대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </Alert>
      )}

      {needsTabData && error === null && (
        <DashboardTabPanel
          activeTab={activeTab}
          data={data}
          loading={loading}
          showTodo={showTodo}
          showLists={showLists}
        />
      )}

      <StatsSection range={statsRange} onRangeChange={setStatsRange} />
    </div>
  );
}
