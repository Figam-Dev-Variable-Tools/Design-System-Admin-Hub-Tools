// DashboardPage — 대시보드 (라우트: /dashboard) · A41 소유
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
import { Tabs } from '@tds/ui';

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

const errorStyle: CSSProperties = {
  margin: 0,
  padding: 'var(--tds-space-4)',
  borderStyle: 'solid',
  borderWidth: 'thin',
  borderColor: 'var(--tds-color-feedback-danger-border)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-feedback-danger-surface)',
  color: 'var(--tds-color-feedback-danger-text)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
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

  // isFetching(= 재조회 중에도 true)을 로딩으로 쓴다 — useAsyncData 도 재조회 중 loading 이 true 였다
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
        <p style={errorStyle} role="alert">
          대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
        </p>
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
