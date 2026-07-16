// FS-003 회원 목록 — 예외 7축 E2E (A85 소유 — e2e/**)
//
// 명세: specs/users/members/FS-003-members.md  ·  구현: apps/admin/src/pages/members/**
//
// [예외 축의 주입 지점] data-source.ts 의 실패 스위치 — `?fail=members,groups,export,notify,delete,...`
// 지연(400ms)·빈 상태에는 파라미터가 없다: 빈 상태는 **검색으로** 만든다(그것이 실제 사용자 경로다).
//
// [명세 정합] 예전에 FS §4 가 "§7 미결 사항 — 실패 안내가 표시되지 않는다" 로 적어 두었던 항목들
// (알림 발송 실패 · 삭제 실패)은 구현에서 이미 고쳐져 있었고, **명세도 현실에 맞춰 갱신됐다**
// (FS-003 §4 EL-011.12.2 · EL-017 · EL-017.4, §7.1 종결 목록). 아래 테스트가 그 동작의 회귀 방어선이다.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import { seedAuthenticated } from '../../support/app';

const LIST = '/users/members';

// [인증 전제 — EXC-02] 셸 라우트는 이제 세션이 없으면 /login?returnUrl=… 으로 보낸다.
// 이 파일이 검증하는 것은 **인증된 운영자가 보는 회원 목록**이므로 그 전제를 세워 준다.
// (인증 자체의 축은 FS-001 이 소유한다 — 여기서 다시 검증하지 않는다.)
test.beforeEach(seedAuthenticated);

/**
 * 로딩 축을 관측할 때 쓰는 지연 (data-source.ts 의 `?delay=<ms>`).
 *
 * [왜 필요한가] 기본 지연은 400ms 다. `waitUntil:'commit'` 직후 스켈레톤을 단언하면
 * **첫 페인트 vs 400ms** 의 경주가 된다 — 콜드 서버에서 첫 렌더가 400ms 를 넘으면 관측이
 * 시작될 때 스켈레톤 창은 이미 닫혀 있다. FS-004 의 로딩 테스트가 3회 중 1회 그렇게 터졌고,
 * 이 테스트는 **같은 형태의 시한폭탄**이었다(같은 패턴 · 같은 400ms 기본값).
 *
 * 관측 창을 2초로 넓혀 경주 자체를 없앤다. 단언은 그대로다 — 로딩 축은 진짜 검증 대상이다.
 */
const SLOW_MS = 2_000;

function ui(page: Page) {
  const table = page.getByRole('table');
  return {
    table,
    body: table.locator('tbody'),
    rows: table.locator('tbody').getByRole('row'),
    search: page.getByLabel('닉네임 또는 계정 검색'),
    exportButton: page.getByRole('button', { name: /내보내기|내보내는 중/ }),
    pagination: page.getByRole('navigation', { name: '회원 목록 페이지' }),
    dialog: page.getByRole('dialog'),
  };
}

/** 첫 행의 ⋯ 메뉴를 연다 — 행마다 접근 가능한 이름이 다르므로 첫 행의 것을 집는다 */
async function openFirstRowMenu(page: Page): Promise<Locator> {
  const trigger = page.getByRole('button', { name: /회원 액션$/ }).first();
  await trigger.click();
  return page.getByRole('menu').first();
}

/* ── 빈 상태 ──────────────────────────────────────────────────────────────── */

test('FS-003-EL-013 / FS-003-EL-011 / FS-003-EL-008 / FS-003-EL-015: 빈 상태 — 검색 결과가 0건이면 표 본문이 빈 상태 문구로 바뀌고 페이지네이션이 사라진다', async ({
  page,
}) => {
  await page.goto(LIST);
  const u = ui(page);
  await expect(u.rows).toHaveCount(10);

  await u.search.fill('존재하지않는닉네임zzzz');

  // FS-003-EL-013: 표 본문 전체를 병합한 셀에 문구를 보여준다
  await expect(page.getByText('검색 결과가 없습니다.')).toBeVisible();
  // FS-003-EL-011: 본문이 빈 상태로 대체된다 (행 1줄만 남는다)
  await expect(u.rows).toHaveCount(1);
  await expect(page.getByText('전체 0명')).toBeVisible();
  // FS-003-EL-015: 총 페이지가 1 이하면 페이지네이션 영역 자체가 렌더되지 않는다
  await expect(u.pagination).toHaveCount(0);
});

/* ── 로딩 ────────────────────────────────────────────────────────────────── */

test('FS-003-EL-012 / FS-003-EL-011 / FS-003-EL-010: 로딩 — 조회 중에는 표가 aria-busy 로 스켈레톤 10행을 보이고 요약이 불러오는 중으로 바뀐다', async ({
  page,
}) => {
  // commit 만 기다리고, 지연을 2초로 벌려 스켈레톤 관측 창을 넓힌다 — 첫 페인트와 경주하지 않는다
  await page.goto(`${LIST}?delay=${String(SLOW_MS)}`, { waitUntil: 'commit' });
  const u = ui(page);

  await expect(u.table).toHaveAttribute('aria-busy', 'true'); // FS-003-EL-011
  await expect(page.getByText('불러오는 중…')).toBeVisible(); // FS-003-EL-010
  // FS-003-EL-012: 본문은 페이지 크기(10행) 만큼의 스켈레톤이다 — 아직 회원 링크가 없다
  await expect(u.rows).toHaveCount(10);
  await expect(u.body.getByRole('link')).toHaveCount(0);

  // 조회가 끝나면 실제 행으로 바뀐다
  await expect(u.table).toHaveAttribute('aria-busy', 'false');
  await expect(u.body.getByRole('link').first()).toBeVisible();
});

test('FS-003-EL-008: 로딩 — 조회 중 키워드가 바뀌면 마지막 키워드만 반영된다', async ({ page }) => {
  await page.goto(LIST);
  const u = ui(page);
  await expect(u.rows).toHaveCount(10);

  // 디바운스(250ms) 안에서 키워드를 갈아탄다 — 입력은 잠기지 않는다
  await u.search.fill('존재하지않는닉네임zzzz');
  await u.search.fill('명재우');

  await expect(u.body.getByRole('link', { name: '명재우' }).first()).toBeVisible();
  // 앞선 키워드의 늦은 응답이 최신 결과를 덮어쓰면 빈 상태가 튀어나온다
  await expect(page.getByText('검색 결과가 없습니다.')).toHaveCount(0);
  await expect(u.search).toBeEnabled();
});

test('FS-003-EL-009: 로딩 — 내보내는 중에는 버튼 라벨이 바뀌고 비활성되어 다시 눌리지 않는다', async ({
  page,
}) => {
  await page.goto(LIST);
  const u = ui(page);
  await expect(u.rows).toHaveCount(10);

  const download = page.waitForEvent('download');
  await u.exportButton.click();

  await expect(u.exportButton).toHaveText(/내보내는 중…/);
  await expect(u.exportButton).toBeDisabled();

  await download;
  // 조건에 걸린 **전체** 회원(현재 페이지가 아니다)을 내보낸다
  await expect(page.getByText('회원 497명을 CSV 로 내보냈습니다.')).toBeVisible();
  await expect(u.exportButton).toBeEnabled();
});

/* ── 실패 ────────────────────────────────────────────────────────────────── */

test('FS-003-EL-014 / FS-003-EL-014.1 / FS-003-EL-011 / FS-003-EL-010 / FS-003-EL-015: 실패 — 목록 조회가 실패하면 표·요약·페이지네이션이 배너로 대체되고 재시도가 다시 실패하면 배너가 다시 뜬다', async ({
  page,
}) => {
  await page.goto(`${LIST}?fail=members`);

  const banner = page.getByRole('alert');
  await expect(banner).toContainText('회원 목록을 불러오지 못했습니다.');

  // FS-003-EL-011 / EL-010 / EL-015: 표·요약·페이지네이션이 전부 자리를 비운다
  await expect(page.getByRole('table')).toHaveCount(0);
  await expect(page.getByText('불러오는 중…')).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: '회원 목록 페이지' })).toHaveCount(0);

  // FS-003-EL-014.1: 마지막 조회 조건을 그대로 재조회한다 — 다시 실패하면 같은 배너가 다시 뜬다
  await page.getByRole('button', { name: '다시 시도' }).click();
  await expect(banner).toContainText('회원 목록을 불러오지 못했습니다.');
});

test('FS-003-EL-011.12.2: 실패 — 알림 발송이 실패하면 조용히 삼키지 않고 실패를 알리고 재시도 경로를 준다', async ({
  page,
}) => {
  await page.goto(`${LIST}?fail=notify`);
  await expect(ui(page).rows).toHaveCount(10);

  const menu = await openFirstRowMenu(page);
  await menu.getByRole('menuitem', { name: '알림 발송' }).click();

  // 실패가 아무 흔적 없이 사라지면 관리자는 발송된 줄 안다 — 그것이 과거의 결함이었다
  // 토스트는 role 을 갖지 않는다 (A11Y-01: 통지는 ToastProvider 의 지속 라이브 영역이 소유) — 시각 단위로 집는다
  const toast = page.locator('.tds-toast');
  await expect(toast).toContainText('알림을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  await expect(toast.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

test('FS-003-EL-017.4 / FS-003-EL-017: 실패 — 삭제가 실패하면 다이얼로그가 닫히지 않고 실패 안내를 띄운다', async ({
  page,
}) => {
  await page.goto(`${LIST}?fail=delete`);
  await expect(ui(page).rows).toHaveCount(10);

  const menu = await openFirstRowMenu(page);
  await menu.getByRole('menuitem', { name: '회원 삭제' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '회원 삭제' }).click();

  // 실패했는데 다이얼로그가 닫히면 사용자는 삭제된 줄 안다
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('회원을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  // 재클릭 = 재시도 경로가 살아 있다
  await expect(dialog.getByRole('button', { name: '회원 삭제' })).toBeEnabled();
});

/* ── 권한없음 ────────────────────────────────────────────────────────────── */

test('FS-003-EL-011.12: 권한없음 — 행 액션 메뉴의 두 항목은 항상 표시되며 비활성되지 않는다', async ({
  page,
}) => {
  await page.goto(LIST);
  await expect(ui(page).rows).toHaveCount(10);

  const menu = await openFirstRowMenu(page);
  const items = menu.getByRole('menuitem');

  // 요구사항: 항목은 2개뿐이다 (회원 삭제 / 알림 발송)
  await expect(items).toHaveCount(2);
  await expect(menu.getByRole('menuitem', { name: '회원 삭제' })).toBeEnabled();
  await expect(menu.getByRole('menuitem', { name: '알림 발송' })).toBeEnabled();
});

/* ── 대량 ────────────────────────────────────────────────────────────────── */

test('FS-003-EL-011 / FS-003-EL-015: 대량 — 497명을 페이지당 10행으로 나누고 번호 버튼은 최대 5개만 노출한다', async ({
  page,
}) => {
  await page.goto(LIST);
  const u = ui(page);

  await expect(page.getByText('전체 497명')).toBeVisible();
  await expect(u.rows).toHaveCount(10);

  // 50페이지를 전부 그리면 줄이 넘친다 — 번호 5개 + 이전/다음 2개 = 7개 버튼
  await expect(u.pagination.getByRole('button')).toHaveCount(7);

  await u.pagination.getByRole('button', { name: '다음 페이지' }).click();
  await expect(u.rows).toHaveCount(10);
  await expect(u.pagination.getByRole('button')).toHaveCount(7);
});

/* ── 행 동작 (§3 — 예외 축이 아니라 화면 규칙 자체) ──────────────────────── */

test('FS-003-EL-011.13 / FS-003-EL-011.2 / FS-003-EL-011.3: 행의 빈 영역을 누르면 상세로 가지만, 행 안의 체크박스를 누르면 이동하지 않는다', async ({
  page,
}) => {
  await page.goto(LIST);
  const u = ui(page);
  await expect(u.rows).toHaveCount(10);

  const firstRow = u.rows.first();

  // FS-003-EL-011.2: 체크박스는 자기 일만 한다 — 여기서 화면이 튀면 목록에서 아무것도 고를 수 없다
  const checkbox = firstRow.getByRole('checkbox');
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  expect(new URL(page.url()).pathname).toBe(LIST);
  await expect(page.getByText('1명 선택됨')).toBeVisible();

  // FS-003-EL-011.13: 빈 셀(계정)을 누르면 상세로 간다
  await firstRow.getByRole('cell').nth(2).click();
  await expect(page).toHaveURL(/\/users\/members\/M-\d{5}$/);

  // FS-003-EL-011.3: 닉네임 링크는 키보드 사용자의 상세 진입 경로다
  await page.goto(LIST);
  await expect(u.rows).toHaveCount(10);
  await u.body.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/users\/members\/M-\d{5}$/);
});

test('FS-003-EL-011.12.1 / FS-003-EL-017 / FS-003-EL-017.1: 회원은 확인 다이얼로그를 거치지 않고 삭제되지 않는다', async ({
  page,
}) => {
  await page.goto(LIST);
  const u = ui(page);
  await expect(u.rows).toHaveCount(10);

  const menu = await openFirstRowMenu(page);
  await menu.getByRole('menuitem', { name: '회원 삭제' }).click();

  // 메뉴 항목 자체는 삭제하지 않는다 — 확인을 먼저 세운다
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '회원 삭제' })).toBeVisible();
  await expect(dialog).toContainText('이 작업은 되돌릴 수 없습니다.');

  // 취소하면 아무 일도 일어나지 않는다
  await dialog.getByRole('button', { name: '취소' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(u.rows).toHaveCount(10);
  expect(new URL(page.url()).pathname).toBe(LIST);
});
