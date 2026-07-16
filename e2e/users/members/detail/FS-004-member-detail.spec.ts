// FS-004 회원 상세 — 예외 7축 E2E (A85 소유 — e2e/**)
//
// 명세: specs/users/members/detail/FS-004-member-detail.md · 계약면: BE-004-member-detail.md
// 구현: apps/admin/src/pages/members/{MemberDetailPage,components/PointsCard}.tsx
//
// [적립금은 돈이다]
// BE-004 §7.1 — 적립금 지급은 **비멱등**이며 `Idempotency-Key` 헤더가 필수다. 같은 키 + 같은 바디는
// 서버가 최초 응답을 재생한다(중복 지급 없음). BE-004 §7.6 #1 이 적발한 결함은 프론트가 **호출마다**
// 새 키를 만드는 것이었다 — 응답이 유실된 뒤 사용자가 재클릭하면 두 번 지급된다.
// 지금 구현은 키를 **제출 시도 단위**로 잡아 재시도에 같은 키를 재사용한다(PointsCard.idempotencyKeyRef).
// 아래 테스트가 그 회귀 방어선이다: 재시도 후에도 발급된 키는 **1개**여야 한다.
//
// [명세 정합] 예전에 FS-004 §4 가 "확인 다이얼로그 없이 즉시 삭제한다 (§7 미결)" 로 적어 두었던
// 내역 삭제에는 구현이 이미 확인 다이얼로그를 세워 두었고, "실패 안내가 표시되지 않는다" 던 실패
// 경로들도 이미 드러나 있었다. **명세가 현실에 맞춰 갱신됐다** — FS-004 §4(EL-007.8 · EL-002.2 ·
// EL-014.4), 새 요소 SEC-12/EL-007.11~.13 · EL-014.5 · EL-013.10, §7.1 종결 목록.
// 아래 테스트가 그 동작들의 회귀 방어선이다.
import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

import {
  clearFailureSwitch,
  idempotencyKeysIssued,
  seedAuthenticated,
  spyIdempotencyKeys,
} from '../../../support/app';

// [인증 전제 — EXC-02] 셸 라우트는 세션이 없으면 /login 으로 보낸다. 인증의 축은 FS-001 소유다.
test.beforeEach(seedAuthenticated);

/** 픽스처 회원 1번 — 모든 회원의 초기 적립금은 10,000 이다 (shared/fixtures/members.ts) */
const MEMBER = '/users/members/M-00001';
const INITIAL_BALANCE = '10,000 포인트 (KRW)';

/**
 * 로딩 축을 관측할 때 쓰는 지연 (data-source.ts 의 `?delay=<ms>`).
 *
 * [왜 필요한가 — 이 테스트가 간헐적으로 빨개졌던 이유]
 * 기본 지연은 400ms 다. `waitUntil:'commit'` 직후 스켈레톤을 단언하면 **첫 페인트 vs 400ms** 의
 * 경주가 된다 — 콜드 서버(vite 최초 컴파일)에서 첫 렌더가 400ms 를 넘으면 관측이 시작될 때
 * 스켈레톤 창은 이미 닫혀 있다. 3회 중 1회가 그렇게 터졌다.
 *
 * 고치는 방향은 **경주를 없애는 것**이지 단언을 지우거나(로딩 축은 진짜 검증 대상이다)
 * 임의의 sleep 을 끼우는 것(경주를 더 느린 경주로 바꿀 뿐이다)이 아니다. 관측 창을 2초로
 * 넓히면 첫 렌더가 아무리 늦어도 스켈레톤이 떠 있는 동안 단언이 도착한다.
 * 지연이 끝나면 테스트는 **로딩이 끝난 상태까지** 그대로 단언한다 — 축을 약화시키지 않는다.
 */
const SLOW_MS = 2_000;

function ui(page: Page) {
  const history = page.getByRole('table', { name: '적립금 증감 내역' });
  return {
    back: page.getByRole('link', { name: '리스트로 돌아가기' }),
    actions: page.getByRole('button', { name: /회원 액션$/ }),
    balance: page.getByText(/포인트 \(KRW\)$/),
    kind: page.getByLabel('구분'),
    amount: page.getByLabel('금액'),
    reason: page.getByLabel('사유'),
    submit: page.getByRole('button', { name: /^(확인|처리 중…)$/ }),
    formError: page.getByRole('alert'),
    history,
    historyRows: history.locator('tbody').getByRole('row'),
    dialog: page.getByRole('dialog'),
  };
}

async function openActions(page: Page): Promise<Locator> {
  await ui(page).actions.click();
  return page.getByRole('menu');
}

/* ── 로딩 ────────────────────────────────────────────────────────────────── */

test('FS-004-EL-010 / FS-004-EL-002: 로딩 — 상세 조회 중에는 본문이 스켈레톤으로 대체되고 액션 메뉴는 렌더되지 않는다', async ({
  page,
}) => {
  // 지연을 2초로 벌려 스켈레톤 관측 창을 넓힌다 — 첫 페인트와 경주하지 않는다 (SLOW_MS 주석 참조)
  await page.goto(`${MEMBER}?delay=${String(SLOW_MS)}`, { waitUntil: 'commit' });
  const u = ui(page);

  await expect(page.locator('[aria-busy="true"]').first()).toBeVisible();
  // FS-004-EL-002: 회원이 특정되지 않았으므로 삭제·발송 대상이 없다 — 메뉴를 띄우지 않는다
  await expect(u.actions).toHaveCount(0);
  // FS-004-EL-001: 돌아가기 링크는 로딩 중에도 살아 있다
  await expect(u.back).toBeVisible();

  await expect(u.balance).toHaveText(INITIAL_BALANCE);
  await expect(u.actions).toBeVisible();
});

test("FS-004-EL-007.5: 로딩 — 지급 요청 중에는 확인 버튼이 '처리 중…' 으로 잠긴다", async ({
  page,
}) => {
  await page.goto(MEMBER);
  const u = ui(page);
  await expect(u.balance).toHaveText(INITIAL_BALANCE);

  await u.amount.fill('1000');
  await u.reason.fill('E2E 로딩 확인');
  await u.submit.click();

  await expect(u.submit).toHaveText('처리 중…');
  await expect(u.submit).toBeDisabled();

  await expect(u.balance).toHaveText('11,000 포인트 (KRW)');
  await expect(u.submit).toHaveText('확인');
});

/* ── 실패 ────────────────────────────────────────────────────────────────── */

test('FS-004-EL-007.5 / FS-004-EL-007.6: 실패 — 지급이 실패하면 잔액을 건드리지 않고 안내를 띄우며, 재시도는 같은 멱등키로 처리되어 두 번 지급되지 않는다', async ({
  page,
}) => {
  await spyIdempotencyKeys(page);
  await page.goto(`${MEMBER}?fail=points`);

  const u = ui(page);
  await expect(u.balance).toHaveText(INITIAL_BALANCE);
  const before = await u.historyRows.count();

  await u.amount.fill('5000');
  await u.reason.fill('이벤트 참여 보상');
  await u.submit.click();

  // FS-004-EL-007.6: 실패는 폼 하단에 드러난다 — 조용히 삼키지 않는다
  await expect(u.formError).toContainText('처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  // FS-004-EL-007.5: 잔액·내역은 갱신되지 않는다
  await expect(u.balance).toHaveText(INITIAL_BALANCE);
  await expect(u.historyRows).toHaveCount(before);
  await expect(u.submit).toBeEnabled();

  expect(await idempotencyKeysIssued(page)).toBe(1);

  // '응답이 유실됐다가 복구된' 상황 — 이번에는 서버가 살아 있다. 복구 경로는 버튼 재클릭이다.
  await clearFailureSwitch(page);
  await u.submit.click();

  await expect(u.balance).toHaveText('15,000 포인트 (KRW)');
  await expect(u.historyRows).toHaveCount(before + 1);

  // **핵심**: 재시도는 새 거래가 아니다. 키가 2개 발급됐다면 서버는 두 번 지급했을 것이다.
  expect(await idempotencyKeysIssued(page)).toBe(1);
});

test('FS-004-EL-007.8: 실패 — 내역 삭제가 실패하면 다이얼로그 안에서 알리고 행과 잔액을 그대로 둔다', async ({
  page,
}) => {
  await page.goto(`${MEMBER}?fail=pointsDelete`);
  const u = ui(page);
  await expect(u.balance).toHaveText(INITIAL_BALANCE);
  const before = await u.historyRows.count();

  // 돈이 움직이는 파괴적 액션 — 클릭 한 번으로 잔액이 움직이면 안 된다
  await u.history
    .getByRole('button', { name: /내역 삭제$/ })
    .first()
    .click();

  const dialog = u.dialog;
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('heading', { name: '적립금 내역 삭제' })).toBeVisible();
  await expect(u.historyRows).toHaveCount(before);

  await dialog.getByRole('button', { name: '내역 삭제' }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    '적립금 내역을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  );
  await expect(u.balance).toHaveText(INITIAL_BALANCE);
  await expect(u.historyRows).toHaveCount(before);
});

test('FS-004-EL-011 / FS-004-EL-004 / FS-004-EL-002 / FS-004-EL-001: 실패 — 상세 조회가 실패하면 카드 대신 배너를 띄우고 돌아가기 링크는 남는다', async ({
  page,
}) => {
  await page.goto(`${MEMBER}?fail=detail`);
  const u = ui(page);

  await expect(page.getByRole('alert')).toContainText('회원 정보를 불러오지 못했습니다.');
  await expect(page.getByRole('button', { name: '다시 시도' })).toBeVisible();

  // FS-004-EL-004: 회원 정보 카드가 통째로 사라진다 / FS-004-EL-002: 액션 메뉴도 렌더되지 않는다
  await expect(page.getByRole('heading', { name: '회원 정보' })).toHaveCount(0);
  await expect(u.actions).toHaveCount(0);
  // FS-004-EL-001: 실패 상태에서도 돌아갈 길은 열려 있다
  await expect(u.back).toBeVisible();

  await page.getByRole('button', { name: '목록으로' }).click();
  await expect(page).toHaveURL(/\/users\/members$/);
});

test('FS-004-EL-002.2: 실패 — 알림 발송이 실패하면 조용히 삼키지 않고 실패를 알리고 재시도 경로를 준다', async ({
  page,
}) => {
  await page.goto(`${MEMBER}?fail=notify`);
  await expect(ui(page).balance).toHaveText(INITIAL_BALANCE);

  const menu = await openActions(page);
  await menu.getByRole('menuitem', { name: '알림 발송' }).click();

  // 토스트는 role 을 갖지 않는다 (A11Y-01: 통지는 ToastProvider 의 지속 라이브 영역이 소유) — 시각 단위로 집는다
  const toast = page.locator('.tds-toast');
  await expect(toast).toContainText('알림을 발송하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  await expect(toast.getByRole('button', { name: '다시 시도' })).toBeVisible();
});

test('FS-004-EL-014.4 / FS-004-EL-014: 실패 — 회원 삭제가 실패하면 다이얼로그가 닫히지 않고 화면을 떠나지 않는다', async ({
  page,
}) => {
  await page.goto(`${MEMBER}?fail=delete`);
  await expect(ui(page).balance).toHaveText(INITIAL_BALANCE);

  const menu = await openActions(page);
  await menu.getByRole('menuitem', { name: '회원 삭제' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('이 작업은 되돌릴 수 없습니다.');

  await dialog.getByRole('button', { name: '회원 삭제' }).click();

  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('회원을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
  expect(new URL(page.url()).pathname).toBe('/users/members/M-00001');
});

/* ── 빈 상태 ──────────────────────────────────────────────────────────────── */

test('FS-004-EL-012: 빈 상태 — 존재하지 않는 회원 id 로 들어가면 회원을 찾을 수 없다고 알린다', async ({
  page,
}) => {
  await page.goto('/users/members/M-99999');

  await expect(page.getByRole('alert')).toContainText('회원을 찾을 수 없습니다.');
  await expect(page.getByRole('button', { name: '목록으로' })).toBeVisible();
  await expect(page.getByRole('link', { name: '리스트로 돌아가기' })).toBeVisible();
});

/* ── 유효성 ──────────────────────────────────────────────────────────────── */

test('FS-004-EL-007.5 / FS-004-EL-007.6: 유효성 — 금액·사유·차감 상한을 검증하고 위반이면 서버를 호출하지 않는다', async ({
  page,
}) => {
  await page.goto(MEMBER);
  const u = ui(page);
  await expect(u.balance).toHaveText(INITIAL_BALANCE);
  const before = await u.historyRows.count();

  // ① 금액 미입력
  await u.reason.fill('사유는 있다');
  await u.submit.click();
  await expect(u.formError).toHaveText('금액은 1 이상의 정수로 입력하세요.');

  // ② 사유 미입력 (공백만)
  await u.amount.fill('1000');
  await u.reason.fill('   ');
  await u.submit.click();
  await expect(u.formError).toHaveText('사유를 입력하세요.');

  // ③ 보유 적립금보다 많은 차감
  await u.reason.fill('과도한 차감');
  await u.amount.fill('999999');
  await u.kind.selectOption('deduct');
  await u.submit.click();
  await expect(u.formError).toHaveText('보유 적립금보다 많이 차감할 수 없습니다.');

  // 서버를 호출하지 않았다 — 잔액도 내역도 그대로다
  await expect(u.balance).toHaveText(INITIAL_BALANCE);
  await expect(u.historyRows).toHaveCount(before);
});

/* ── 돈이 걸린 동작 (§3 · BE-004 §7.1 — 예외 축이 아니라 계약 자체) ─────────── */

test('FS-004-EL-007.5 / FS-004-EL-007.1 / FS-004-EL-007.7: 제출 중 이중 클릭이 적립금을 두 번 올리지 않는다', async ({
  page,
}) => {
  await spyIdempotencyKeys(page);
  await page.goto(MEMBER);

  const u = ui(page);
  await expect(u.balance).toHaveText(INITIAL_BALANCE);
  const before = await u.historyRows.count();

  await u.amount.fill('1000');
  await u.reason.fill('이벤트 참여 보상');

  // 같은 태스크 안에서 두 번 누른다 — React 가 아직 버튼을 disabled 로 만들기 전이다.
  await u.submit.evaluate((button: HTMLElement) => {
    button.click();
    button.click();
  });

  // FS-004-EL-007.1: 잔액은 한 번만 움직인다 (12,000 이면 이중 지급이다)
  await expect(u.balance).toHaveText('11,000 포인트 (KRW)');
  // FS-004-EL-007.7: 내역 행도 1건만 늘어난다
  await expect(u.historyRows).toHaveCount(before + 1);

  // 두 요청이 나갔더라도 **같은 멱등키**를 실었다면 서버는 최초 응답을 재생한다 (BE-004 §7.1)
  expect(await idempotencyKeysIssued(page)).toBe(1);

  // 성공하면 폼이 비워진다 — 다음 제출은 새 거래다
  await expect(u.amount).toHaveValue('');
  await expect(u.reason).toHaveValue('');
});
