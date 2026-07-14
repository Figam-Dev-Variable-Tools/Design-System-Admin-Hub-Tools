// FS-001 로그인 — 예외 7축 E2E (A85 소유 — e2e/**)
//
// 명세: specs/login/FS-001-login.md  ·  구현: apps/admin/src/pages/login/**
// 계약면(에러 종류 · 실패 카운트 · 잠금 · 타임아웃): specs/login/BE-001-login.md
//
// [요청 횟수를 어떻게 세는가 — 백엔드가 없는데]
// 이 앱에는 네트워크 요청이 없다(mock 어댑터). 그래서 요청을 가로채 셀 수 없다.
// 대신 mock 이 들고 있는 **서버측 상태**를 오라클로 쓴다: 인증 실패는 계정별 연속 실패 횟수를
// 1 올리고, 그 횟수가 Alert 문구에 그대로 실린다('(실패 N/5회)').
//   → 중복 클릭으로 요청이 2건 나갔다면 문구는 '(실패 2/5회)' 가 된다.
//   → 문구가 '(실패 1/5회)' 라는 것은 **요청이 1건이었다는 증명**이다.
// 이것이 FS-001-EL-018 경합 축("동시 요청 최대 1건")의 관측 가능한 단언이다.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import {
  blockLocalStorage,
  changeRememberedEmailInOtherTab,
  seedRememberedEmail,
  seedSession,
} from '../support/app';

/** mock 계정 (apps/admin/src/pages/login/api.ts) */
const VALID_EMAIL = 'admin@tds.local';
const VALID_PASSWORD = 'password123';
const LOCKED_EMAIL = 'locked@tds.local';
const INACTIVE_EMAIL = 'inactive@tds.local';
const SERVER_ERROR_EMAIL = 'error@tds.local';
const NO_RESPONSE_EMAIL = 'timeout@tds.local';

function form(page: Page) {
  return {
    email: page.getByLabel('이메일', { exact: true }),
    password: page.getByLabel('비밀번호', { exact: true }),
    toggle: page.getByRole('button', { name: '비밀번호 표시' }),
    remember: page.getByLabel('이메일 저장', { exact: true }),
    // 접근 가능한 이름은 '로그인' → 제출 중에는 '로그인 중' 이다 (부분 일치로 두 상태를 모두 잡는다)
    submit: page.getByRole('button', { name: '로그인' }),
    alert: page.getByRole('alert'),
  };
}

async function fillAndSubmit(page: Page, email: string, password: string): Promise<void> {
  const f = form(page);
  await f.email.fill(email);
  await f.password.fill(password);
  await f.submit.click();
}

/* ── 빈 상태 ──────────────────────────────────────────────────────────────── */

test('FS-001-EL-025: 빈 상태 — 세션이 없으면 리다이렉트하지 않고 로그인 폼을 렌더한다', async ({
  page,
}) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  await expect(form(page).submit).toBeEnabled();
  expect(new URL(page.url()).pathname).toBe('/login');
});

test('FS-001-EL-014 / FS-001-EL-008 / FS-001-EL-011: 빈 상태 — 진입 시 Alert 는 렌더되지 않고 두 입력이 빈 값으로 시작한다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  // FS-001-EL-014: alert 상태가 null 이면 요소를 렌더하지 않는다 — 빈 자리를 남기지 않는다
  await expect(f.alert).toHaveCount(0);
  // FS-001-EL-008 / EL-011: 값이 빈 문자열이면 빈 입력으로 렌더한다
  await expect(f.email).toHaveValue('');
  await expect(f.password).toHaveValue('');
});

test('FS-001-EL-026: 빈 상태 — returnUrl 이 없으면 인증 성공 후 대시보드로 이동한다', async ({
  page,
}) => {
  await page.goto('/login');
  await fillAndSubmit(page, VALID_EMAIL, VALID_PASSWORD);

  await page.waitForURL('**/dashboard');
  expect(new URL(page.url()).pathname).toBe('/dashboard');
});

/* ── 로딩 ────────────────────────────────────────────────────────────────── */

test('FS-001-EL-018 / FS-001-EL-016 / FS-001-EL-016.1 / FS-001-EL-024 / FS-001-EL-008 / FS-001-EL-011 / FS-001-EL-012 / FS-001-EL-015 / FS-001-EL-009 / FS-001-EL-013: 로딩 — 제출 중에는 폼이 잠기고 입력·토글·체크박스·버튼이 모두 비활성된다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  // 응답하지 않는 계정 — 제출 상태를 관측할 수 있을 만큼 오래 잠긴다 (10초 타임아웃 전까지)
  await fillAndSubmit(page, NO_RESPONSE_EMAIL, VALID_PASSWORD);

  // FS-001-EL-016 / EL-016.1: 라벨 '로그인 중' + aria-busy (스피너는 aria-hidden 이라 버튼이 대신 알린다)
  await expect(f.submit).toHaveText('로그인 중');
  await expect(f.submit).toHaveAttribute('aria-busy', 'true');
  await expect(f.submit).toBeDisabled();

  // FS-001-EL-018: 폼 aria-busy + 입력·토글·체크박스가 전부 disabled
  await expect(page.locator('form[aria-busy="true"]')).toBeVisible();
  await expect(f.email).toBeDisabled(); // FS-001-EL-008 로딩
  await expect(f.password).toBeDisabled(); // FS-001-EL-011 로딩
  await expect(f.toggle).toBeDisabled(); // FS-001-EL-012 로딩
  await expect(f.remember).toBeDisabled(); // FS-001-EL-015 로딩

  // FS-001-EL-009 / EL-013: 검증을 통과한 제출이므로 인라인 에러는 렌더되지 않는다
  await expect(page.getByText('이메일을 입력해 주세요.')).toHaveCount(0);
  await expect(page.getByText('비밀번호를 입력해 주세요.')).toHaveCount(0);

  // FS-001-EL-024: 타이머는 제출과 함께 시작된다 — 10초 경과 전까지 폼은 잠긴 상태를 유지한다
  await page.waitForTimeout(2_000);
  await expect(f.submit).toBeDisabled();
  await expect(f.email).toBeDisabled();
});

test('FS-001-EL-014: 로딩 — 제출을 다시 시작하면 기존 Alert 를 제거한다', async ({ page }) => {
  await page.goto('/login');
  const f = form(page);

  await fillAndSubmit(page, SERVER_ERROR_EMAIL, VALID_PASSWORD);
  await expect(f.alert).toBeVisible();

  // 두 번째 제출 — 응답을 기다리는 동안 이전 Alert 는 사라져 있어야 한다
  await f.email.fill(NO_RESPONSE_EMAIL);
  await f.password.fill(VALID_PASSWORD);
  await f.submit.click();

  await expect(f.submit).toHaveText('로그인 중');
  await expect(f.alert).toHaveCount(0);
});

/* ── 실패 ────────────────────────────────────────────────────────────────── */

test('FS-001-EL-019 / FS-001-EL-022 / FS-001-EL-014 / FS-001-EL-008 / FS-001-EL-011: 실패 — 자격 증명 불일치는 비밀번호만 비우고, 서버 오류는 입력값을 전부 유지한다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  // (a) 자격 증명 불일치 — FS-001-EL-019
  await fillAndSubmit(page, VALID_EMAIL, 'wrong-password');
  await expect(f.alert).toHaveText(/이메일 또는 비밀번호가 일치하지 않습니다\. \(실패 1\/5회\)/);

  // FS-001-EL-008: 이메일은 유지 / FS-001-EL-011: 비밀번호만 초기화
  await expect(f.email).toHaveValue(VALID_EMAIL);
  await expect(f.password).toHaveValue('');

  // FS-001-EL-014: Alert 는 비밀번호 필드와 '이메일 저장' 체크박스 **사이**에 뜬다.
  // (에러가 체크박스 아래로 밀려나면 실패를 놓친다 — 위치가 곧 동작이다)
  const alertBox = await f.alert.boundingBox();
  const rememberBox = await f.remember.boundingBox();
  expect(alertBox).not.toBeNull();
  expect(rememberBox).not.toBeNull();
  expect(alertBox?.y ?? 0).toBeLessThan(rememberBox?.y ?? 0);

  // (d) 서버 오류 — FS-001-EL-022: 이메일·비밀번호를 전부 유지한다
  await f.email.fill(SERVER_ERROR_EMAIL);
  await f.password.fill(VALID_PASSWORD);
  await f.submit.click();

  await expect(f.alert).toHaveText(/일시적인 오류로 로그인하지 못했습니다\. 다시 시도해 주세요\./);
  await expect(f.email).toHaveValue(SERVER_ERROR_EMAIL);
  await expect(f.password).toHaveValue(VALID_PASSWORD);
});

test('FS-001-EL-019: 실패 — 미등록 계정도 등록 계정과 똑같은 문구로 응답한다 (계정 열거 차단)', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  // 존재하지 않는 계정
  await fillAndSubmit(page, 'ghost-nobody@tds.local', 'wrong-password');
  await expect(f.alert).toBeVisible();
  const unknownAccountMessage = await f.alert.innerText();

  // 존재하는 계정 + 틀린 비밀번호
  await f.email.fill(VALID_EMAIL);
  await f.password.fill('wrong-password');
  await f.submit.click();
  await expect(f.alert).toBeVisible();
  const knownAccountMessage = await f.alert.innerText();

  // 화면이 '없는 계정' 이라고 말하면 공격자에게 계정 목록을 준 것이다
  expect(unknownAccountMessage).toBe(knownAccountMessage);
  expect(unknownAccountMessage).toContain('이메일 또는 비밀번호가 일치하지 않습니다.');
});

test('FS-001-EL-016 / FS-001-EL-016.1 / FS-001-EL-018: 실패 — 실패로 끝나도 잠금이 풀려 폼을 다시 제출할 수 있다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  await fillAndSubmit(page, SERVER_ERROR_EMAIL, VALID_PASSWORD);
  await expect(f.alert).toBeVisible();

  // FS-001-EL-016: 실패 후 버튼은 다시 활성화된다 / FS-001-EL-016.1: 스피너·로딩 라벨이 걷힌다
  await expect(f.submit).toBeEnabled();
  await expect(f.submit).toHaveText('로그인');
  await expect(f.submit).toHaveAttribute('aria-busy', 'false');

  // FS-001-EL-018: 잠금(submitLockRef)이 해제되어 재제출이 실제로 요청을 만든다
  await f.email.fill(VALID_EMAIL);
  await f.password.fill(VALID_PASSWORD);
  await f.submit.click();
  await page.waitForURL('**/dashboard');
});

test('FS-001-EL-020: 실패 — 계정 잠금은 30분 후 재시도 안내를 표시한다', async ({ page }) => {
  await page.goto('/login');
  await fillAndSubmit(page, LOCKED_EMAIL, VALID_PASSWORD);

  await expect(form(page).alert).toHaveText(
    /비밀번호 5회 오류로 계정이 잠겼습니다\. 30분 후 다시 시도하거나 시스템 관리자에게 문의하세요\./,
  );
});

test('FS-001-EL-021: 실패 — 계정 비활성은 관리자 문의 안내를 표시하고 입력값을 유지한다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  await fillAndSubmit(page, INACTIVE_EMAIL, VALID_PASSWORD);

  await expect(f.alert).toHaveText(/사용이 중지된 계정입니다\. 시스템 관리자에게 문의하세요\./);
  await expect(f.email).toHaveValue(INACTIVE_EMAIL);
  await expect(f.password).toHaveValue(VALID_PASSWORD);
});

test('FS-001-EL-024: 실패 — 10초 안에 응답이 없으면 요청을 중단하고 일시적 오류로 전환한다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  await fillAndSubmit(page, NO_RESPONSE_EMAIL, VALID_PASSWORD);
  await expect(f.submit).toHaveText('로그인 중');

  // LOGIN_TIMEOUT_MS = 10초. mock 은 20초 뒤에나 응답하므로, 문구가 뜬다면 프론트가 중단시킨 것이다.
  await expect(f.alert).toHaveText(/일시적인 오류로 로그인하지 못했습니다\./, { timeout: 20_000 });
  await expect(f.submit).toBeEnabled();
  expect(new URL(page.url()).pathname).toBe('/login');
});

test('FS-001-EL-025 / FS-001-EL-015: 실패 — 저장소 접근이 차단돼도 폼은 렌더되고 인증 결과는 유효하다', async ({
  page,
}) => {
  await blockLocalStorage(page);
  await page.goto('/login');

  // FS-001-EL-025: 저장소 읽기 실패는 '세션 없음' 으로 처리한다 (화면이 깨지지 않는다)
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();

  // FS-001-EL-015: 이메일 저장(편의 기능)만 동작하지 않을 뿐, 인증은 성공한다
  await form(page).remember.check();
  await fillAndSubmit(page, VALID_EMAIL, VALID_PASSWORD);
  await page.waitForURL('**/dashboard');
});

/* ── 유효성 ──────────────────────────────────────────────────────────────── */

test('FS-001-EL-009 / FS-001-EL-013 / FS-001-EL-008 / FS-001-EL-011: 유효성 — 빈 값과 형식 위반은 인증 요청 없이 인라인 에러로 안내된다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  await f.submit.click();

  // FS-001-EL-009 / EL-013: 위반 문구가 각 입력 아래에 뜬다
  await expect(page.getByText('이메일을 입력해 주세요.')).toBeVisible();
  await expect(page.getByText('비밀번호를 입력해 주세요.')).toBeVisible();
  await expect(f.email).toHaveAttribute('aria-invalid', 'true');
  await expect(f.password).toHaveAttribute('aria-invalid', 'true');

  // 인증 요청을 만들지 않는다 — 서버 응답이 만드는 Alert 가 뜨지 않는다
  await expect(f.alert).toHaveCount(0);

  // FS-001-EL-008 / EL-011: 형식·길이 위반도 같은 자리에서 안내된다
  await f.email.fill('not-an-email');
  await f.password.fill('short');
  await f.submit.click();
  await expect(page.getByText('이메일 형식이 올바르지 않습니다.')).toBeVisible();
  await expect(page.getByText('비밀번호는 8자 이상 64자 이하로 입력해 주세요.')).toBeVisible();
  await expect(f.alert).toHaveCount(0);
});

/**
 * ⛔ 이 테스트는 **실패한다 — 구현 결함이다** (A40 change_request).
 *
 * FS-001-EL-016 §3 · §4(유효성): "위반이 1건 이상이면 서버 요청 없이 **첫 위반 필드로 포커스를 옮긴다**".
 * 실제로는 포커스가 <body> 로 떨어진다 — 키보드·스크린리더 사용자는 어디가 틀렸는지 알 수 없고
 * 폼 맨 위로 되짚어 올라가야 한다.
 *
 * 원인: react-hook-form 의 `isSubmitting` 은 **검증 단계에서도 true** 다. LoginForm 은 그 값으로
 * 입력과 버튼을 `disabled` 시키므로(§ 로딩 축 요구사항),
 *   ① 눌린 버튼이 disabled 되며 포커스를 잃고(→ body),
 *   ② onInvalid 가 `emailInputRef.current.focus()` 를 부르는 시점에 그 입력은 **아직 disabled** 라
 *      focus() 가 조용히 무시된다.
 * 로딩 잠금과 포커스 이동이 같은 플래그를 공유해서 생긴 충돌이다. 테스트를 고쳐 통과시키지 않는다.
 */
test('FS-001-EL-016: 유효성 — 위반이 있으면 첫 위반 필드로 포커스를 옮긴다', async ({ page }) => {
  await page.goto('/login');
  const f = form(page);

  await f.submit.click();
  await expect(page.getByText('이메일을 입력해 주세요.')).toBeVisible();

  await expect(f.email).toBeFocused();
});

test('FS-001-EL-025: 유효성 — 저장된 세션의 형식이 어긋나면 세션 없음으로 취급한다', async ({
  page,
}) => {
  // issuedAt 이 숫자가 아니다 → isAuthSession 실패 → 폼을 렌더해야 한다
  await seedSession(
    page,
    JSON.stringify({
      userId: 'u-001',
      email: VALID_EMAIL,
      role: 'system_admin',
      issuedAt: '어제',
    }),
  );
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/login');
});

test('FS-001-EL-026: 유효성 — 오픈 리다이렉트 returnUrl 을 차단하고 대시보드로 보낸다', async ({
  page,
}) => {
  // 프로토콜 상대 경로 — 외부 도메인으로 튀면 안 된다
  await page.goto('/login?returnUrl=//evil.example.com');
  await fillAndSubmit(page, VALID_EMAIL, VALID_PASSWORD);

  await page.waitForURL('**/dashboard');
  expect(new URL(page.url()).pathname).toBe('/dashboard');
  expect(page.url()).not.toContain('evil.example.com');

  // 같은 오리진의 절대 경로는 허용된다 (세션을 지워 폼으로 되돌아간다)
  await page.evaluate(() => {
    window.localStorage.clear();
  });
  await page.goto('/login?returnUrl=/users/members');
  await fillAndSubmit(page, VALID_EMAIL, VALID_PASSWORD);
  // 글롭이 아니라 술어로 기다린다 — returnUrl 이 쿼리 문자열에도 들어 있어 글롭이 즉시 참이 된다
  await page.waitForURL((url) => url.pathname === '/users/members');
  expect(new URL(page.url()).pathname).toBe('/users/members');
});

/* ── 권한없음 ────────────────────────────────────────────────────────────── */

test('FS-001-EL-025: 권한없음 — 이미 인증된 사용자에게는 폼을 노출하지 않고 대시보드로 보낸다', async ({
  page,
}) => {
  await seedSession(page, {
    userId: 'u-001',
    email: VALID_EMAIL,
    role: 'system_admin',
    issuedAt: Date.now(),
  });

  await page.goto('/login');

  await page.waitForURL('**/dashboard');
  await expect(page.getByLabel('비밀번호', { exact: true })).toHaveCount(0);
});

/* ── 경합 ────────────────────────────────────────────────────────────────── */

test('FS-001-EL-018: 경합 — 제출 중 중복 클릭이 인증 요청을 두 번 만들지 않는다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  await f.email.fill(VALID_EMAIL);
  await f.password.fill('wrong-password');

  // 같은 태스크 안에서 두 번 클릭한다 — React 가 isSubmitting 을 반영하기 **전**이므로
  // 버튼 disabled 는 아직 걸리지 않았다. 여기서 요청을 막는 것은 동기 가드(submitLockRef)뿐이다.
  await f.submit.evaluate((button: HTMLElement) => {
    button.click();
    button.click();
  });

  // 오라클: mock 서버의 연속 실패 횟수. 요청이 2건 나갔다면 '(실패 2/5회)' 가 된다.
  await expect(f.alert).toHaveText(/\(실패 1\/5회\)/);
  await expect(f.alert).not.toHaveText(/\(실패 2\/5회\)/);
});

test('FS-001-EL-016: 경합 — 잠긴 계정 이메일이 남아 있는 동안 제출 버튼이 비활성이고 요청을 만들지 않는다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  await fillAndSubmit(page, LOCKED_EMAIL, VALID_PASSWORD);
  await expect(f.alert).toHaveText(/계정이 잠겼습니다/);

  // 잠긴 이메일이 입력되어 있는 동안 버튼은 비활성이다
  await expect(f.submit).toBeDisabled();

  // Enter 로 폼 submit 이벤트를 쏴도 요청이 나가지 않는다 (로딩으로 들어가지 않고 Alert 도 그대로다)
  await f.password.fill(VALID_PASSWORD);
  await f.password.press('Enter');
  await expect(f.submit).toHaveText('로그인');
  await expect(f.alert).toHaveText(/계정이 잠겼습니다/);

  // 이메일을 바꾸면 다시 활성화된다
  await f.email.fill(VALID_EMAIL);
  await expect(f.submit).toBeEnabled();
});

test('FS-001-EL-015 / FS-001-EL-025: 경합 — 진입 후 다른 탭이 저장소를 바꿔도 화면은 진입 시점 판정을 유지한다', async ({
  page,
}) => {
  await seedRememberedEmail(page, 'kept@tds.local');
  await page.goto('/login');

  const f = form(page);
  await expect(f.email).toHaveValue('kept@tds.local');
  await expect(f.remember).toBeChecked();

  // 다른 탭이 저장된 이메일을 바꾸고 세션까지 만들어 넣는다
  await changeRememberedEmailInOtherTab(page, 'other@tds.local');
  await page.evaluate(() => {
    window.localStorage.setItem(
      'tds.admin.session',
      JSON.stringify({ userId: 'u-001', email: 'other@tds.local', role: 'operator', issuedAt: 1 }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'tds.admin.session' }));
  });

  // FS-001-EL-015: 진입 시점에 읽은 이메일을 유지한다 (재동기화하지 않는다)
  await expect(f.email).toHaveValue('kept@tds.local');
  // FS-001-EL-025: 진입 후에는 세션을 재판정하지 않는다 — 폼이 그대로 남는다
  await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/login');
});

/* ── 대량 ────────────────────────────────────────────────────────────────── */

test('FS-001-EL-008 / FS-001-EL-011: 대량 — 길이 상한을 넘겨도 입력을 잘라내지 않고 제출 시 문구로 안내한다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  // 255자 (상한 254) · 65자 (상한 64) — maxLength 로 조용히 잘리면 사용자는 잘린 줄도 모른다
  const longEmail = `${'a'.repeat(250)}@t.co`;
  const longPassword = 'p'.repeat(65);
  expect(longEmail.length).toBe(255);

  await f.email.fill(longEmail);
  await f.password.fill(longPassword);

  await expect(f.email).toHaveValue(longEmail);
  await expect(f.password).toHaveValue(longPassword);

  await f.submit.click();
  await expect(page.getByText('이메일 형식이 올바르지 않습니다.')).toBeVisible();
  await expect(page.getByText('비밀번호는 8자 이상 64자 이하로 입력해 주세요.')).toBeVisible();
});

test('FS-001-EL-014: 대량 — 새 Alert 가 이전 Alert 를 대체해 한 번에 1건만 표시된다', async ({
  page,
}) => {
  await page.goto('/login');
  const f = form(page);

  await fillAndSubmit(page, INACTIVE_EMAIL, VALID_PASSWORD);
  await expect(f.alert).toHaveText(/사용이 중지된 계정입니다\./);

  await f.email.fill(SERVER_ERROR_EMAIL);
  await f.password.fill(VALID_PASSWORD);
  await f.submit.click();

  await expect(f.alert).toHaveText(/일시적인 오류로 로그인하지 못했습니다\./);
  // 이전 Alert 가 남아 쌓이지 않는다
  await expect(f.alert).toHaveCount(1);
});
