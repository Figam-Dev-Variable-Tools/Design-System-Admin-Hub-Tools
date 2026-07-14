// 대시보드 탭 해소 훅 (A41 소유)
//
// [왜 훅으로 뺐나] 예전에는 이 6개 분기(권한 필터 · 폴백 · 활성 탭 해소)가 DashboardPage 안에서
// 렌더 게이팅·탭 패널 분기와 섞여 복잡도 18을 만들었다 (A83 축4). 페이지는 마운트하지 않으면
// 테스트할 수 없지만, 이 훅은 PermissionProvider 상대로 단위 테스트할 수 있다.
//
// [권한] 무엇이 보이는지는 오직 권한이 정한다 — 정적 TABS 를 그대로 렌더하지 않는다
// (FS-002-EL-012 · EL-013: 꺼진 탭은 목록에서 사라진다. 죽은 버튼을 남기지 않는다).
import { useState } from 'react';

import { usePermissions } from '../../shared/permissions/PermissionProvider';
import type { FeatureKey } from '../../shared/permissions/feature-registry';
import { DEFAULT_TAB, TABS } from './types';
import type { TabDef, TabId } from './types';

/** 탭 ↔ 권한 키 매핑 — 탭이 늘면 여기와 feature-registry 두 곳만 고친다 */
const TAB_PERMISSION: Record<TabId, FeatureKey> = {
  products: 'dashboard.tab.products',
  inquiries: 'dashboard.tab.inquiries',
  sales: 'dashboard.tab.sales',
};

interface DashboardTabs {
  /** 권한으로 걸러진 탭 — TabBar 는 이것만 받는다 */
  readonly visibleTabs: readonly TabDef[];
  /** 실제로 보고 있는 탭 (요청한 탭의 권한이 꺼졌으면 남은 첫 탭으로 흘러간다) */
  readonly activeTab: TabId;
  readonly selectTab: (tab: TabId) => void;
}

export function useDashboardTabs(): DashboardTabs {
  const { isEnabled } = usePermissions();
  const [requestedTab, setRequestedTab] = useState<TabId>(DEFAULT_TAB);

  const visibleTabs = TABS.filter((tab) => isEnabled(TAB_PERMISSION[tab.id]));
  const fallbackTab = visibleTabs[0]?.id ?? DEFAULT_TAB;

  // 보고 있던 탭의 권한이 꺼지면 남아 있는 첫 탭으로 흘러간다 (죽은 탭에 갇히지 않게 — FS-002-EL-043)
  const activeTab = visibleTabs.some((tab) => tab.id === requestedTab) ? requestedTab : fallbackTab;

  return { visibleTabs, activeTab, selectTab: setRequestedTab };
}
