// 기능 키 레지스트리
//
// [이 파일의 역할 — 재설계 후]
// 권한의 본체는 더 이상 '기능당 boolean 하나'가 아니다. 메뉴 권한은 **리소스 × 액션 매트릭스**
// (./resources.ts)가 갖고, 이 파일은 두 가지만 책임진다.
//
//   1) FeatureKey — 기존 소비처(nav-config 의 NavEntry.permission, DashboardPage 의 탭 매핑)가
//      쓰는 평면 키. **타입을 그대로 유지해야** 그 파일들을 건드리지 않고 재설계할 수 있다.
//      menu.* 키는 이제 '메뉴 그룹 리소스의 read' 로 해석된다 (resources.ts 의 menuResourceIdFor).
//
//   2) 대시보드 위젯 — 메뉴와 성격이 다르다(등록/수정/삭제/내보내기라는 액션이 없다).
//      그래서 매트릭스에 넣지 않고 read/off 단일 토글의 별도 목록으로 남긴다.
//
// [PermissionMap] 재설계 이전의 평면 맵. 지금은 **마이그레이션 입력**으로만 쓰인다
// (localStorage 에 남아 있는 옛 저장값을 읽어 새 매트릭스로 흡수한다).

const FEATURE_KEYS = [
  // 사이드바 메뉴 그룹 — nav-config 의 NavEntry.permission 이 참조한다
  'menu.dashboard',
  'menu.users',
  'menu.content',
  'menu.company',
  'menu.orders',
  'menu.portfolio',
  'menu.products',
  'menu.programs',
  'menu.sales',
  'menu.support',
  'menu.marketing',
  'menu.ai',
  'menu.stats',
  'menu.logs',
  'menu.settings',

  // 대시보드 위젯 — DashboardPage / StatsSection 이 isEnabled('dashboard.*') 로 참조한다
  'dashboard.tab.products',
  'dashboard.tab.inquiries',
  'dashboard.tab.sales',
  'dashboard.todo',
  'dashboard.lists',
  'dashboard.stats.visitors',
  'dashboard.stats.period',
] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number];

/* ── 대시보드 위젯 ───────────────────────────────────────────────────────── */

/** 위젯 권한 키 — FeatureKey 중 'dashboard.' 로 시작하는 7개 */
export const DASHBOARD_WIDGET_KEYS = [
  'dashboard.tab.products',
  'dashboard.tab.inquiries',
  'dashboard.tab.sales',
  'dashboard.todo',
  'dashboard.lists',
  'dashboard.stats.visitors',
  'dashboard.stats.period',
] as const satisfies readonly FeatureKey[];

export type DashboardWidgetKey = (typeof DASHBOARD_WIDGET_KEYS)[number];

interface DashboardWidgetMeta {
  readonly key: DashboardWidgetKey;
  readonly label: string;
}

export const DASHBOARD_WIDGET_META: readonly DashboardWidgetMeta[] = [
  { key: 'dashboard.tab.products', label: '탭 — 상품' },
  { key: 'dashboard.tab.inquiries', label: '탭 — 문의' },
  { key: 'dashboard.tab.sales', label: '탭 — 영업' },
  { key: 'dashboard.todo', label: '오늘의 할일' },
  { key: 'dashboard.lists', label: '리스트 카드 2종' },
  { key: 'dashboard.stats.visitors', label: '통계 — 방문자 차트' },
  { key: 'dashboard.stats.period', label: '통계 — 기간별 분석' },
];

/** 위젯 노출 여부 — 액션 개념이 없는 단일 토글 */
export type WidgetMap = Readonly<Record<DashboardWidgetKey, boolean>>;

const WIDGET_KEY_SET: ReadonlySet<string> = new Set<string>(DASHBOARD_WIDGET_KEYS);

/** isEnabled 가 위젯 키와 메뉴 키를 갈라내는 지점 */
export function isDashboardWidgetKey(key: FeatureKey): key is DashboardWidgetKey {
  return WIDGET_KEY_SET.has(key);
}

export function createWidgets(enabled: boolean): WidgetMap {
  return Object.fromEntries(DASHBOARD_WIDGET_KEYS.map((key) => [key, enabled])) as WidgetMap;
}

/** 저장값 방어 — 알 수 없는 키는 버리고, 빠진 키는 fallback 으로 채운다 */
export function normalizeWidgets(raw: unknown, fallback: WidgetMap): WidgetMap {
  if (typeof raw !== 'object' || raw === null) return fallback;

  const source = raw as Record<string, unknown>;
  const entries = DASHBOARD_WIDGET_KEYS.map((key) => {
    const value = source[key];
    return [key, typeof value === 'boolean' ? value : fallback[key]];
  });
  return Object.fromEntries(entries) as WidgetMap;
}

/* ── 레거시 평면 맵 (마이그레이션 전용) ──────────────────────────────────── */

/** 재설계 이전의 저장 형태 — 기능당 boolean 하나. 새로 쓰지 말 것 */
export type PermissionMap = Readonly<Record<FeatureKey, boolean>>;

/** 옛 저장값(JSON)을 PermissionMap 으로 되돌린다 — 값이 없으면 전부 ON 으로 본다 */
export function normalizeLegacyPermissions(raw: unknown): PermissionMap {
  const allOn = Object.fromEntries(FEATURE_KEYS.map((key) => [key, true])) as PermissionMap;
  if (typeof raw !== 'object' || raw === null) return allOn;

  const source = raw as Record<string, unknown>;
  const entries = FEATURE_KEYS.map((key) => {
    const value = source[key];
    return [key, typeof value === 'boolean' ? value : allOn[key]];
  });
  return Object.fromEntries(entries) as PermissionMap;
}
