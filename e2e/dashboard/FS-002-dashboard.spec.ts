// FS-002 대시보드 — 예외 7축 E2E (A85 소유 — e2e/**)
//
// 명세: specs/dashboard/FS-002-dashboard.md  ·  구현: apps/admin/src/pages/dashboard/** + shared/layout/**
//
// [예외 축의 주입 지점]
//  - 탭 데이터: 재현용 쿼리 파라미터 `?delay=<ms>` · `?error=1` · `?empty=1` (pages/dashboard/api.ts)
//  - 권한: localStorage 의 역할 상태 (shared/permissions/PermissionProvider.tsx)
// 통계 조회(stats-api.ts)에는 재현 파라미터가 **없다** — 그래서 통계의 실패·빈 상태 축은 덮지 못했다.
// (A40 에게 `?statsError=1` · `?statsEmpty=1` · `?statsDelay=<ms>` 를 요청한다 — 보고서 참조)
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import {
  changePermissionsInOtherTab,
  MENU_KEYS,
  seedAuthenticated,
  seedPermissions,
  seedRoleState,
  WIDGET_KEYS,
} from '../support/app';
import type { PermissionOverrides } from '../support/app';

// [인증 전제 — EXC-02] 셸 라우트는 세션이 없으면 /login 으로 보낸다. 인증의 축은 FS-001 소유다.
test.beforeEach(seedAuthenticated);

function nav(page: Page): Locator {
  return page.getByRole('navigation', { name: '주 내비게이션' });
}

/**
 * 카드는 <section aria-busy> 다 — 제목으로 그 카드를 특정한다.
 * 통계 섹션도 <section> 이라 제목을 가진 section 이 둘(바깥 섹션 · 카드) 잡힌다 →
 * 문서 순서상 마지막(= 가장 안쪽)이 카드다.
 */
function cardByTitle(page: Page, title: string): Locator {
  return page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: title }) })
    .last();
}

const allWidgetsOff: PermissionOverrides = Object.fromEntries(
  WIDGET_KEYS.map((key) => [key, false]),
);
const allMenusOff: PermissionOverrides = Object.fromEntries(MENU_KEYS.map((key) => [key, false]));

/* ── 실패 ────────────────────────────────────────────────────────────────── */

test('FS-002-EL-041 / FS-002-EL-014 / FS-002-EL-015 / FS-002-EL-016 / FS-002-EL-021 / FS-002-EL-022 / FS-002-EL-025: 실패 — 탭 데이터 조회가 실패하면 패널 대신 배너를 렌더하고 통계는 영향을 받지 않는다', async ({
  page,
}) => {
  await page.goto('/dashboard?error=1');

  // FS-002-EL-041: 인라인 배너다 — 토스트가 아니다 (사라지면 안 되는 안내다)
  const banner = page.getByRole('alert');
  await expect(banner).toHaveText(
    '대시보드 데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  );

  // FS-002-EL-014: 패널(할일 + 리스트 카드 2장) 전체가 렌더되지 않는다
  await expect(page.getByRole('tabpanel')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '오늘의 할일' })).toHaveCount(0); // EL-015 · EL-016
  await expect(page.getByRole('heading', { name: '최근 주문' })).toHaveCount(0); // EL-021
  await expect(page.getByRole('heading', { name: '판매 신청' })).toHaveCount(0); // EL-022

  // FS-002-EL-025: 실패를 '빈 상태' 로 위장하지 않는다 — 두 상태를 혼동시키면 사용자가 오판한다
  await expect(page.getByText('표시할 항목이 없습니다.')).toHaveCount(0);

  // FS-002-EL-041: 통계는 별도 조회다 — 탭 조회 실패에 끌려 내려가지 않는다
  await expect(page.getByRole('heading', { name: '통계' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '방문자' })).toBeVisible();
});

test('FS-002-EL-042 / FS-002-EL-007: 실패 — 저장값이 JSON 으로 해석되지 않으면 기본값(전부 ON)으로 동작한다', async ({
  page,
}) => {
  await seedRoleState(page, '{ 이건 JSON 이 아니다');
  await page.goto('/dashboard');

  // 권한 저장값이 깨졌다고 화면이 잠기면 안 된다 — 기본값(전부 ON)으로 되돌아간다
  await expect(page.getByRole('tab', { name: '상품' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '오늘의 할일' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '통계' })).toBeVisible();
  await expect(nav(page).getByRole('link', { name: '대시보드' })).toBeVisible();
});

/* ── 빈 상태 ──────────────────────────────────────────────────────────────── */

test('FS-002-EL-025 / FS-002-EL-014 / FS-002-EL-017 / FS-002-EL-019 / FS-002-EL-023: 빈 상태 — 항목이 0건이면 카드가 빈 상태 문구를 보이고 카운트 뱃지가 사라진다', async ({
  page,
}) => {
  await page.goto('/dashboard?empty=1');

  // FS-002-EL-014: 0건은 실패가 아니다 — 패널을 감추지 않는다
  await expect(page.getByRole('tabpanel')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);

  // FS-002-EL-025: 리스트 카드 2장이 각자 빈 상태 문구를 보여준다
  await expect(page.getByText('표시할 항목이 없습니다.')).toHaveCount(2);

  // FS-002-EL-017: 합계가 0 이하면 뱃지를 렌더하지 않는다 (제목만 남는다)
  await expect(page.getByRole('heading', { name: '오늘의 할일' })).toHaveText('오늘의 할일');
  // FS-002-EL-023: 카운트가 0 이하면 카드 뱃지도 사라지고 제목만 남는다
  await expect(page.getByRole('heading', { name: '판매 신청' })).toHaveText('판매 신청');

  // FS-002-EL-019: 건수 0 은 빈 상태가 아니라 값 '0' 으로 표시된다
  await expect(page.getByRole('link', { name: /신규주문/ })).toContainText('0');
});

test('FS-002-EL-012: 빈 상태 — 표시 가능한 탭이 0개이면 탭바를 렌더하지 않는다', async ({
  page,
}) => {
  await seedPermissions(page, {
    'dashboard.tab.products': false,
    'dashboard.tab.inquiries': false,
    'dashboard.tab.sales': false,
  });
  await page.goto('/dashboard');

  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('tabpanel')).toHaveCount(0);
  // 통계는 남아 있으므로 '전 위젯 OFF' 안내는 뜨지 않는다
  await expect(page.getByRole('heading', { name: '통계' })).toBeVisible();
});

test('FS-002-EL-007: 빈 상태 — 모든 메뉴 권한이 꺼지면 내비게이션이 비고 로고 칸만 남는다', async ({
  page,
}) => {
  await seedPermissions(page, allMenusOff);
  await page.goto('/dashboard');

  await expect(nav(page).getByRole('link')).toHaveCount(0);
  await expect(nav(page).getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('img', { name: '로고 자리표시' })).toBeVisible();
});

/* ── 로딩 ────────────────────────────────────────────────────────────────── */

test('FS-002-EL-020 / FS-002-EL-026 / FS-002-EL-015 / FS-002-EL-021 / FS-002-EL-012 / FS-002-EL-013: 로딩 — 조회 중에는 카드가 aria-busy 로 남고 탭바는 잠기지 않는다', async ({
  page,
}) => {
  await page.goto('/dashboard?delay=2000');

  // FS-002-EL-015 / EL-020: 할일 카드는 골격을 유지한 채 aria-busy 로 스켈레톤을 보인다
  const todo = cardByTitle(page, '오늘의 할일');
  await expect(todo).toHaveAttribute('aria-busy', 'true');

  // FS-002-EL-021 / EL-026: 최초 조회에서는 자리표시 카드 2장을 미리 렌더해 레이아웃 높이를 지킨다
  // (탭 패널 안으로 한정한다 — 통계 카드는 별도 조회라 자기 리듬으로 로딩한다)
  await expect(page.getByRole('tabpanel').locator('section[aria-busy="true"]')).toHaveCount(3);

  // FS-002-EL-012 / EL-013: 탭바는 잠기지 않는다 — 조회 중에도 다른 탭을 즉시 선택할 수 있다
  await expect(page.getByRole('tab', { name: '문의' })).toBeEnabled();
  await page.getByRole('tab', { name: '문의' }).click();
  await expect(page.getByRole('tab', { name: '문의' })).toHaveAttribute('aria-selected', 'true');
});

test('FS-002-EL-029 / FS-002-EL-027 / FS-002-EL-028 / FS-002-EL-036: 로딩 — 통계 조회 중에는 기간 토글 세 개가 모두 비활성되고 두 카드가 aria-busy 로 남는다', async ({
  page,
}) => {
  await page.goto('/dashboard');
  const chart = page.getByRole('img', { name: /기간별 방문자 및 페이지뷰 추이/ });
  await expect(chart).toBeVisible();

  const range = page.getByRole('radiogroup', { name: '조회 기간' });
  await range.getByRole('radio', { name: '주' }).click();

  // FS-002-EL-029: 조회 중에는 세 세그먼트가 모두 잠긴다 — 기간을 연달아 바꾸지 못하게 막는다
  for (const label of ['일', '주', '월']) {
    await expect(range.getByRole('radio', { name: label })).toBeDisabled();
  }
  // FS-002-EL-027 / EL-028 / EL-036: 두 카드가 함께 aria-busy 가 된다 (조회 1건을 공유한다)
  await expect(cardByTitle(page, '방문자')).toHaveAttribute('aria-busy', 'true');
  await expect(cardByTitle(page, '기간별 분석')).toHaveAttribute('aria-busy', 'true');

  // 조회가 끝나면 잠금이 풀리고 선택한 기간이 반영된다
  await expect(range.getByRole('radio', { name: '주' })).toHaveAttribute('aria-checked', 'true');
  await expect(chart).toBeVisible();
  await expect(chart.getByText('7월 2주', { exact: true })).toBeVisible();
});

/* ── 경합 ────────────────────────────────────────────────────────────────── */

test('FS-002-EL-014 / FS-002-EL-013 / FS-002-EL-013.1: 경합 — 탭을 전환하면 늦게 도착한 이전 탭의 응답이 새 탭 데이터를 덮어쓰지 않는다', async ({
  page,
}) => {
  // 상품 탭 조회가 1.5초 동안 떠 있는 사이에 문의 탭으로 갈아탄다
  await page.goto('/dashboard?delay=1500');
  await page.getByRole('tab', { name: '문의' }).click();

  await expect(page.getByRole('heading', { name: '최근 문의' })).toBeVisible();

  // 뒤늦게 도착한 상품 탭 응답이 화면을 되돌리면 안 된다
  await page.waitForTimeout(2_000);
  await expect(page.getByRole('heading', { name: '최근 문의' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '최근 주문' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '판매 신청' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: '문의' })).toHaveAttribute('aria-selected', 'true');
});

test('FS-002-EL-042 / FS-002-EL-007: 경합 — 다른 탭에서 권한을 바꾸면 리로드 없이 즉시 반영된다', async ({
  page,
}) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: '오늘의 할일' })).toBeVisible();
  await expect(nav(page).getByRole('button', { name: '사용자 관리' })).toBeVisible();

  await changePermissionsInOtherTab(page, { 'dashboard.todo': false, 'menu.users': false });

  // 리로드 없이 사라져야 한다 (storage 이벤트를 구독한다)
  await expect(page.getByRole('heading', { name: '오늘의 할일' })).toHaveCount(0);
  await expect(nav(page).getByRole('button', { name: '사용자 관리' })).toHaveCount(0);
});

/* ── 유효성 ──────────────────────────────────────────────────────────────── */

test('FS-002-EL-042: 유효성 — 등록되지 않은 키는 버리고 빠진 키는 기본값 ON 으로 채운다', async ({
  page,
}) => {
  await seedRoleState(
    page,
    JSON.stringify({
      roles: [
        {
          id: 'role-e2e',
          name: 'E2E 역할',
          // 등록되지 않은 키 + boolean 이 아닌 값 + 빠진 키들
          permissions: { 'dashboard.unknown.widget': false, 'dashboard.todo': '아니오' },
        },
      ],
      activeRoleId: 'role-e2e',
    }),
  );
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: '오늘의 할일' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '상품' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '기간별 분석' })).toBeVisible();
});

/* ── 권한없음 ────────────────────────────────────────────────────────────── */

test('FS-002-EL-042 / FS-002-EL-015 / FS-002-EL-016 / FS-002-EL-017: 권한없음 — dashboard.todo 가 꺼지면 오늘의 할일 카드가 통째로 사라진다 (비활성이 아니라 미렌더)', async ({
  page,
}) => {
  await seedPermissions(page, { 'dashboard.todo': false });
  await page.goto('/dashboard');

  await expect(page.getByRole('heading', { name: '오늘의 할일' })).toHaveCount(0);
  // 리스트 카드는 별도 키다 — 함께 사라지면 안 된다
  await expect(page.getByRole('heading', { name: '판매 신청' })).toBeVisible();
});

test('FS-002-EL-044: 권한없음 — 모든 위젯이 꺼지면 본문이 안내 문구 한 줄로 대체되고 셸은 유지된다', async ({
  page,
}) => {
  await seedPermissions(page, allWidgetsOff);
  await page.goto('/dashboard');

  await expect(
    page.getByText('표시할 수 있는 대시보드 항목이 없습니다. 권한 설정을 확인하세요.'),
  ).toBeVisible();
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '통계' })).toHaveCount(0);

  // 사이드바와 헤더는 그대로 남는다 (권한 없음 전용 화면으로 갈아치우지 않는다)
  await expect(nav(page)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: '대시보드' })).toBeVisible();
});

test('FS-002-EL-043: 권한없음 — 보던 탭의 권한이 꺼지면 남은 첫 탭으로 활성 탭이 옮겨간다', async ({
  page,
}) => {
  await seedPermissions(page, { 'dashboard.tab.products': false });
  await page.goto('/dashboard');

  // 죽은 탭에 갇히지 않는다 — 활성 탭이 남은 첫 탭(문의)으로 흘러가고 그 데이터를 조회한다
  await expect(page.getByRole('tab', { name: '문의' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: '최근 문의' })).toBeVisible();
});

/**
 * ⛔ 이 테스트는 **실패한다 — 구현 결함이다** (A40 change_request).
 *
 * FS-002-EL-013 · EL-013.1 · EL-013.2(권한없음): "`dashboard.tab.products` 가 꺼지면 **이 탭이 사라진다**".
 * FS-002-EL-012(권한없음): "꺼진 탭은 목록에서 사라지고, **남은 탭만 렌더된다**".
 *
 * 실제로는 꺼진 탭 버튼이 그대로 남는다. DashboardPage 는 `visibleTabs` 를 계산해 놓고도
 * TabBar 에 넘기지 않고(`<TabBar value={activeTab} onChange={...} />`), TabBar 는 권한을 모르는 채
 * 정적 `TABS` 3개를 전부 렌더한다(components/TabBar.tsx). 그 결과 **권한이 없는 탭이 보이고,
 * 눌러도 활성 탭 폴백(EL-043)에 걸려 아무 일도 일어나지 않는** 죽은 버튼이 된다.
 * (탭이 **전부** 꺼진 경우만 우연히 맞다 — 그때는 TabBar 자체를 렌더하지 않기 때문이다.)
 */
test('FS-002-EL-013 / FS-002-EL-013.1 / FS-002-EL-012: 권한없음 — 권한이 꺼진 탭은 탭바에서 사라지고 남은 탭만 렌더된다', async ({
  page,
}) => {
  await seedPermissions(page, {
    'dashboard.tab.products': false,
    'dashboard.tab.inquiries': false,
  });
  await page.goto('/dashboard');

  await expect(page.getByRole('tab', { name: '영업' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '상품' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: '문의' })).toHaveCount(0);
  await expect(page.getByRole('tab')).toHaveCount(1);
});

/**
 * [동작이 의도적으로 바뀐 지점 — EXC-03 · quality-bar.md]
 *
 * 예전 이 테스트는 "메뉴가 사라져도 **라우트는 차단되지 않는다**" 를 단언했다. 근거는
 * '프론트 권한은 보안 경계가 아니다 — 실제 차단은 서버의 몫' 이었고, 그 원칙 자체는 **지금도
 * 유효하다**. 하지만 그 원칙에서 '그러므로 아무것도 하지 않는다' 가 따라 나오지는 않는다.
 *
 * quality-bar.md 의 EXC-03(P0)이 그 간극을 메운다: read 권한이 없는 화면을 deep-link 하면
 * **403 화면**을 보여야 한다. 이것은 보안 주장이 아니라 **UX** 다 — 권한이 없어 데이터가 오지
 * 않는 화면에서 운영자가 '빈 목록'과 '권한 없음'을 구분하지 못한 채 새로고침을 반복하는 것을
 * 막는다. 서버는 여전히 진짜 경계로 남는다(위조된 localStorage 는 이 가드를 우회한다).
 *
 * 그래서 **단언만** 새 계약으로 바꾼다: 메뉴가 사라지는 부분(EL-003/004/005)은 그대로 두고,
 * '라우트가 열린다' 를 '403 이 뜨고 셸은 살아 있다' 로 교체한다. 테스트 건수는 그대로다.
 */
test('FS-002-EL-007 / FS-002-EL-003 / FS-002-EL-004 / FS-002-EL-005: 권한없음 — 권한이 꺼진 메뉴는 사이드바에서 사라지고, 그 화면을 deep-link 하면 403 이 뜬다', async ({
  page,
}) => {
  await seedPermissions(page, { 'menu.dashboard': false, 'menu.users': false });
  await page.goto('/dashboard');

  // FS-002-EL-003: 잎이 사라진다 / FS-002-EL-004: 가지가 사라진다 / FS-002-EL-005: 서브메뉴도 함께
  await expect(nav(page).getByRole('link', { name: '대시보드' })).toHaveCount(0);
  await expect(nav(page).getByRole('button', { name: '사용자 관리' })).toHaveCount(0);
  await expect(nav(page).getByRole('link', { name: '회원 관리' })).toHaveCount(0);

  // EXC-03: read 가 꺼진 화면은 본문 대신 403 을 렌더한다 (탭바가 아니라)
  await expect(page.getByRole('heading', { name: '접근 권한이 없습니다' })).toBeVisible();
  await expect(page.getByRole('tablist')).toHaveCount(0);

  // deep-link 도 마찬가지다 — 본문(회원 표)이 오지 않는다
  await page.goto('/users/members');
  await expect(page.getByRole('heading', { name: '접근 권한이 없습니다' })).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);

  // **셸은 살아 있다** — 권한 있는 메뉴로 걸어 나갈 수 있다. 그래서 AppHeader 의 화면 이름
  // ('회원 관리') 은 그대로 남는다: 403 은 셸이 아니라 <main> 본문만 대체한다.
  await expect(page.getByRole('heading', { level: 1, name: '회원 관리' })).toBeVisible();
  await expect(nav(page)).toBeVisible();
  await expect(page.getByRole('img', { name: '로고 자리표시' })).toBeVisible();
});

test('FS-002-EL-002 / FS-002-EL-001 / FS-002-EL-008 / FS-002-EL-009 / FS-002-EL-010 / FS-002-EL-011: 권한없음 — 모든 메뉴 권한이 꺼져도 로고·헤더는 남고 항목이 0개인 섹션 제목은 사라진다', async ({
  page,
}) => {
  await seedPermissions(page, allMenusOff);
  await page.goto('/dashboard');

  // FS-002-EL-002: 표시 가능한 항목이 0개인 섹션은 제목까지 렌더하지 않는다
  await expect(nav(page).getByRole('heading')).toHaveCount(0);

  // 권한 키에 걸려 있지 않은 것들은 그대로 남는다
  await expect(page.getByRole('img', { name: '로고 자리표시' })).toBeVisible(); // EL-001
  await expect(page.getByText('LOGO · 관리자')).toBeVisible(); // EL-008
  await expect(page.getByRole('heading', { level: 1, name: '대시보드' })).toBeVisible(); // EL-009
  await expect(page.locator('time')).toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}$/); // EL-010
  await expect(page.getByText('admin@klipse.com')).toBeVisible(); // EL-011
});

test('FS-002-EL-018 / FS-002-EL-024: 권한없음 — 이동 대상 화면의 메뉴 권한이 꺼져 있어도 카드 안의 링크는 그대로 동작한다', async ({
  page,
}) => {
  await seedPermissions(page, { 'menu.products': false });
  await page.goto('/dashboard');

  // 사이드바에서 '상품 관리' 는 사라졌다
  await expect(nav(page).getByRole('button', { name: '상품 관리' })).toHaveCount(0);

  // FS-002-EL-018: 그래도 할일 항목 링크는 동작한다 (라우트 차단이 없다)
  await page.getByRole('link', { name: /신규주문/ }).click();
  await expect(page).toHaveURL(/\/products$/);

  // FS-002-EL-024: 리스트 행 링크도 마찬가지다
  await page.goto('/dashboard');
  const firstRow = cardByTitle(page, '최근 주문').getByRole('link').first();
  await firstRow.click();
  await expect(page).toHaveURL(/\/products$/);
});

/* ── 대량 ────────────────────────────────────────────────────────────────── */

test('FS-002-EL-002 / FS-002-EL-004: 대량 — 사이드바는 섹션 4개와 확장형 가지 13개를 고정으로 렌더한다', async ({
  page,
}) => {
  await page.goto('/dashboard');

  await expect(nav(page).getByRole('heading')).toHaveCount(4);
  // 가지만 button 이다 (잎은 link) — 13개
  await expect(nav(page).getByRole('button')).toHaveCount(13);
});

test('FS-002-EL-031 / FS-002-EL-033: 대량 — 기간을 바꾸면 데이터 점 수와 x축 라벨 수가 그에 맞게 바뀐다', async ({
  page,
}) => {
  await page.goto('/dashboard');

  const chart = page.getByRole('img', { name: /기간별 방문자 및 페이지뷰 추이/ });
  // 일: 데이터 점 7개 · 최댓값 430(페이지뷰)
  await expect(chart).toHaveAttribute('aria-label', '기간별 방문자 및 페이지뷰 추이 — 최대 430');
  await expect(chart.locator('circle')).toHaveCount(7);
  await expect(chart.getByText('7.14', { exact: true })).toBeVisible();

  // 월: 데이터 점 5개 · 최댓값 2100
  await page.getByRole('radio', { name: '월' }).click();
  await expect(chart).toHaveAttribute('aria-label', '기간별 방문자 및 페이지뷰 추이 — 최대 2100');
  await expect(chart.locator('circle')).toHaveCount(5);
  await expect(chart.getByText('3월', { exact: true })).toBeVisible();
  await expect(chart.getByText('7월', { exact: true })).toBeVisible();
});

test('FS-002-EL-038: 대량 — 기간별 분석 표는 합계 행 2건을 전부 렌더한다', async ({ page }) => {
  await page.goto('/dashboard');

  const periodCard = cardByTitle(page, '기간별 분석');
  await expect(periodCard.getByText('최근 7일 합계')).toBeVisible();
  await expect(periodCard.getByText('이번달 합계')).toBeVisible();
});
