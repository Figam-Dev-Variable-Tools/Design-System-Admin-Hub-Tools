// FS-000 모션 — quality-bar MOTION 축 E2E (e2e/**)
//
// 명세: specs/quality-bar.md §MOTION (MOTION-01/02/03/08/09)
// 구현: packages/ui/src/organisms/Modal · molecules/Toast · atoms/ToggleSwitch
//
// [왜 FS-000 인가] FS-001~004 는 화면(기능) 명세를 미러링한다. MOTION 은 특정 화면이 아니라
// **모든 화면을 가로지르는 품질 기준**이라 기능 번호가 없다 — 그래서 0 번이다.
//
// [왜 여기서만 검증할 수 있나 — 단위 테스트로는 불가능하다]
// jsdom 은 CSS 를 적용하지 않는다. 그래서 `prefers-reduced-motion` 매체 쿼리도, keyframes 도
// 존재하지 않는다 — 단위 테스트에서 "reduced-motion 이면 즉시" 를 단언하면 **CSS 가 없어서
// 통과하는 무의미한 테스트**가 된다. 진짜 매체 쿼리를 흉내내려면 실제 브라우저가 필요하다.
//
// [매체 쿼리 흉내가 진짜인지 어떻게 아는가 — 이 파일이 실제로 잡은 함정]
//   처음엔 `test.use({ reducedMotion: 'reduce' })` 로 썼다. 그런데 이 저장소/버전 조합에서 그것은
//   **조용히 적용되지 않았다** — `matchMedia('(prefers-reduced-motion: reduce)').matches === false`.
//   만약 단언이 "애니메이션이 시작되지 않았다" 뿐이었다면, 에뮬레이션이 꺼진 채로도 통과할 수
//   있는 **거짓 초록불**이 됐을 것이다. 그래서 두 겹으로 막는다:
//     ① `expectReducedMotion()` 이 매체 쿼리가 **실제로 매칭됐음**을 먼저 단언한다 (에뮬레이션 자체의 검증)
//     ② 대조군 테스트가 **같은 선택자**로 reduce 아닐 때 다른 값을 단언한다 (선택자 오타로 인한 위양성 차단)
//
// [경주(race)를 만들지 않는 관측법]
//   ① animationstart 를 **미리 구독해 기록**해 둔다 → 퇴장(150ms)이 끝난 뒤 읽어도 증거가 남는다.
//   ② animation-name 은 애니메이션이 끝나도 computed style 에 남는 **정적 CSS 속성**이라
//      언제 읽어도 같은 값이다. `waitForTimeout` 이 필요 없다.
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { seedAuthenticated } from '../support/app';

const MEMBERS = '/users/members';
/** ToggleSwitch 가 있는 화면 (LogoListTable 의 노출 토글) */
const LOGOS = '/company/partners';
/** 미저장 이탈 가드가 붙은 폼 모달이 있는 화면 (문의 유형 등록/수정) */
const SUPPORT_CATEGORIES = '/support/categories';

test.beforeEach(seedAuthenticated);

/**
 * 문서에서 시작된 모든 CSS 애니메이션의 이름을 기록한다.
 * 페이지 스크립트보다 먼저 심어 캡처 단계에서 듣는다 — 요소가 사라진 뒤에 읽어도 기록은 남는다.
 */
async function recordAnimations(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const started: string[] = [];
    (window as unknown as Record<string, unknown>)['__tdsAnimations'] = started;
    document.addEventListener(
      'animationstart',
      (event) => {
        started.push((event as AnimationEvent).animationName);
      },
      true,
    );
  });
}

/** 지금까지 시작된 애니메이션 이름들 */
async function startedAnimations(page: Page): Promise<string[]> {
  return page.evaluate(
    () => ((window as unknown as Record<string, unknown>)['__tdsAnimations'] as string[]) ?? [],
  );
}

/** 특정 접두사로 시작된 애니메이션만 (다른 컴포넌트의 pulse 등을 걸러낸다) */
async function startedWithPrefix(page: Page, prefix: string): Promise<string[]> {
  const started = await startedAnimations(page);
  return started.filter((name) => name.startsWith(prefix));
}

/** computed animation-name (정적 속성 — 재생 여부와 무관) */
async function animationNameOf(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    return element === null ? '(요소없음)' : window.getComputedStyle(element).animationName;
  }, selector);
}

/** computed transition-property */
async function transitionPropertyOf(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const element = document.querySelector(sel);
    return element === null ? '(요소없음)' : window.getComputedStyle(element).transitionProperty;
  }, selector);
}

/**
 * reduced-motion 을 켜고, **켜졌는지 확인한다.**
 * 확인이 없으면 에뮬레이션이 조용히 실패해도 테스트가 통과한다 (위 주석의 함정).
 */
async function enableReducedMotion(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const matches = await page.evaluate(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  expect(matches, 'reduced-motion 에뮬레이션이 실제로 적용되어야 한다').toBe(true);
}

/** 회원 삭제 확인 다이얼로그를 연다 (ConfirmDialog → Modal 상속 경로) */
async function openDeleteDialog(page: Page): Promise<void> {
  await expect(page.getByRole('table').locator('tbody').getByRole('row')).toHaveCount(10);
  await page
    .getByRole('button', { name: /회원 액션$/ })
    .first()
    .click();
  await page.getByRole('menu').first().getByRole('menuitem', { name: '회원 삭제' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

/** 실패하는 알림 발송으로 error 토스트를 띄운다 (자동 소멸 없음 — 수동 dismiss 축) */
async function raiseErrorToast(page: Page): Promise<void> {
  await expect(page.getByRole('table').locator('tbody').getByRole('row')).toHaveCount(10);
  await page
    .getByRole('button', { name: /회원 액션$/ })
    .first()
    .click();
  await page.getByRole('menu').first().getByRole('menuitem', { name: '알림 발송' }).click();
  await expect(page.locator('.tds-toast')).toContainText('알림을 발송하지 못했습니다.');
}

/** 미저장 이탈 가드가 붙은 폼 모달을 열고 입력을 채워 dirty 로 만든다 (문의 유형 추가) */
async function openDirtyFormModal(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /유형 추가/ })
    .first()
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.locator('#support-category-label').fill('갇힘 테스트');
}

/** 폐기 확인 다이얼로그 (미저장 이탈 가드가 세운 것) */
function discardPrompt(page: Page) {
  return page.locator('[role="dialog"]', {
    has: page.getByText('저장하지 않은 변경 사항이 있습니다'),
  });
}

/* ── MOTION-01 — Modal enter/exit ─────────────────────────────────────────── */

test('MOTION-01: 모달은 딤 fade + 다이얼로그 scale 로 등장하고, 퇴장 애니메이션이 끝난 뒤에 DOM 에서 사라진다', async ({
  page,
}) => {
  await recordAnimations(page);
  await page.goto(MEMBERS);
  await openDeleteDialog(page);

  // 등장 — 딤은 opacity, 다이얼로그는 scale+opacity (overlay recipe 의 enter)
  expect(await animationNameOf(page, '.tds-modal__dialog')).toBe('tds-modal-dialog-in');
  expect(await animationNameOf(page, '.tds-modal__backdrop')).toBe('tds-modal-backdrop-in');
  expect(await startedWithPrefix(page, 'tds-modal-')).toEqual(
    expect.arrayContaining(['tds-modal-backdrop-in', 'tds-modal-dialog-in']),
  );

  // 닫기(×) — Modal 이 소유한 닫기 경로
  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();

  // 사라진다 — 그리고 **사라지기 전에** 퇴장이 돌았다는 증거가 기록에 남아 있다.
  // 두 단언이 함께 있어야 "exit 완료 후에만 unmount" 가 증명된다:
  // 하나는 결과(제거), 하나는 그 제거가 애니메이션 뒤였다는 인과다.
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await startedWithPrefix(page, 'tds-modal-')).toEqual(
    expect.arrayContaining(['tds-modal-backdrop-out', 'tds-modal-dialog-out']),
  );
});

test('MOTION-01: Esc 와 딤 클릭도 같은 퇴장 경로를 거친다', async ({ page }) => {
  await recordAnimations(page);
  await page.goto(MEMBERS);

  // ① Esc
  await openDeleteDialog(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await startedWithPrefix(page, 'tds-modal-')).toContain('tds-modal-dialog-out');

  // ② 딤 클릭 — 좌상단(다이얼로그 바깥)을 찍는다
  await openDeleteDialog(page);
  await page.locator('.tds-modal__backdrop').click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await startedWithPrefix(page, 'tds-modal-')).toContain('tds-modal-backdrop-out');
});

/* ── MOTION-09 — 퇴장은 되돌릴 수 있다 (닫기 거부) ────────────────────────── */

/**
 * [왜 e2e 인가] 이 회귀는 **진짜 CSS 가 있어야** 최종 증상(화면에서 사라짐 + 클릭 불가)이 나온다.
 * jsdom 에는 keyframes 도 pointer-events 도 없다 — 단위 테스트는 latch 논리까지만 볼 수 있다.
 * 여기서는 사용자가 실제로 보는 것(opacity·pointer-events)을 관측한다.
 */
test('MOTION-09: 미저장 가드가 닫기를 거부하면 모달이 등장 상태로 되돌아온다 (퇴장한 채 갇히지 않는다)', async ({
  page,
}) => {
  await page.goto(SUPPORT_CATEGORIES);
  await openDirtyFormModal(page);

  // Esc → 가드가 거부하고 폐기 확인을 세운다 (부모는 언마운트하지 않는다)
  await page.keyboard.press('Escape');
  await expect(discardPrompt(page)).toBeVisible();

  // '취소' = 이 모달에 머무른다
  await discardPrompt(page).getByRole('button', { name: '취소' }).click();
  await expect(discardPrompt(page)).toHaveCount(0);

  // 거부됐으니 퇴장은 되돌려져야 한다. 되돌리지 않으면 사용자에게는 이렇게 보였다:
  // 딤·다이얼로그가 opacity 0 으로 사라지고 overlay 는 pointer-events:none — 화면엔 아무것도 없는데
  // 모달은 살아서 포커스를 붙들고 있다.
  const overlay = page.locator('.tds-modal__overlay');
  await expect(overlay).not.toHaveClass(/tds-modal__overlay--closing/);
  await expect(page.locator('.tds-modal__dialog')).toHaveCSS('opacity', '1');
  await expect(overlay).toHaveCSS('pointer-events', 'auto');
  // 입력은 그대로 살아 있다 — 이 가드의 존재 이유다
  await expect(page.locator('#support-category-label')).toHaveValue('갇힘 테스트');
});

test('MOTION-09: 닫기가 거부돼도 Modal 소유 경로(Esc·×·딤)가 계속 살아 있다', async ({ page }) => {
  await page.goto(SUPPORT_CATEGORIES);
  await openDirtyFormModal(page);

  const dialog = page.getByRole('dialog').first();

  // 세 제스처를 차례로 — 매번 거부(머무르기)한 뒤 **다음 제스처가 여전히 먹어야 한다**.
  // latch 가 남으면 첫 거부 이후 전부 조기 반환되어 아무 반응이 없었다.
  for (const fire of [
    async () => {
      await dialog.click({ position: { x: 10, y: 10 } });
      await page.keyboard.press('Escape');
    },
    async () => {
      await dialog.getByRole('button', { name: '닫기' }).click();
    },
    async () => {
      await page
        .locator('.tds-modal__backdrop')
        .first()
        .click({ position: { x: 5, y: 5 } });
    },
  ]) {
    await fire();
    await expect(discardPrompt(page)).toBeVisible();
    await discardPrompt(page).getByRole('button', { name: '취소' }).click();
    await expect(discardPrompt(page)).toHaveCount(0);
  }

  // 그리고 마지막엔 진짜로 닫힌다 — 거부가 닫기 능력을 영구히 태우지 않았다
  await dialog.getByRole('button', { name: '닫기' }).click();
  await discardPrompt(page).getByRole('button', { name: '나가기' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  // 배경 스크롤 잠금도 함께 풀린다 (갇힌 모달은 이것도 영구히 붙들고 있었다)
  expect(await page.evaluate(() => document.body.style.overflow)).toBe('');
});

/* ── MOTION-02 — Toast exit ───────────────────────────────────────────────── */

test('MOTION-02: 토스트는 퇴장 애니메이션을 재생한 뒤에 큐에서 빠진다 (수동 dismiss)', async ({
  page,
}) => {
  await recordAnimations(page);
  await page.goto(`${MEMBERS}?fail=notify`);
  await raiseErrorToast(page);

  const toast = page.locator('.tds-toast');
  expect(await animationNameOf(page, '.tds-toast')).toBe('tds-toast-in');

  await toast.getByRole('button', { name: '알림 닫기' }).click();

  await expect(toast).toHaveCount(0);
  expect(await startedWithPrefix(page, 'tds-toast-')).toContain('tds-toast-out');
});

test('MOTION-02: 자동 소멸도 퇴장 애니메이션을 거친다 (타이머 → 퇴장 → 큐에서 제거)', async ({
  page,
}) => {
  await recordAnimations(page);
  await page.goto(MEMBERS);
  await expect(page.getByRole('table').locator('tbody').getByRole('row')).toHaveCount(10);

  // 성공 토스트 — 4초 뒤 스스로 사라진다
  await page
    .getByRole('button', { name: /회원 액션$/ })
    .first()
    .click();
  await page.getByRole('menu').first().getByRole('menuitem', { name: '알림 발송' }).click();

  const toast = page.locator('.tds-toast');
  await expect(toast).toBeVisible();

  // 자동 소멸을 기다린다 — waitForTimeout 이 아니라 **사라짐 자체**를 기다린다
  await expect(toast).toHaveCount(0, { timeout: 15_000 });
  expect(await startedWithPrefix(page, 'tds-toast-')).toContain('tds-toast-out');
});

/* ── MOTION-03 — reduced-motion (진짜 매체 쿼리 흉내) ──────────────────────── */

test('MOTION-03: reduced-motion 이면 모달이 이동/스케일 없이 즉시 등장하고 즉시 제거된다', async ({
  page,
}) => {
  await recordAnimations(page);
  await enableReducedMotion(page);
  await page.goto(MEMBERS);
  await openDeleteDialog(page);

  // 매체 쿼리가 실제로 먹었다는 직접 증거 — 같은 선택자가 위 테스트에선 '...-in' 이었다
  expect(await animationNameOf(page, '.tds-modal__dialog')).toBe('none');
  expect(await animationNameOf(page, '.tds-modal__backdrop')).toBe('none');

  await page.getByRole('dialog').getByRole('button', { name: '닫기' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // 애니메이션이 **하나도** 시작되지 않았다 — move/scale 0.
  // 그런데도 모달은 정상적으로 닫혔다 = willAnimate() 관측이 즉시 경로를 탄 것이다.
  expect(await startedWithPrefix(page, 'tds-modal-')).toEqual([]);
});

test('MOTION-03: reduced-motion 이면 토스트가 이동 없이 즉시 사라진다', async ({ page }) => {
  await recordAnimations(page);
  await enableReducedMotion(page);
  await page.goto(`${MEMBERS}?fail=notify`);
  await raiseErrorToast(page);

  expect(await animationNameOf(page, '.tds-toast')).toBe('none');

  await page.locator('.tds-toast').getByRole('button', { name: '알림 닫기' }).click();
  await expect(page.locator('.tds-toast')).toHaveCount(0);

  expect(await startedWithPrefix(page, 'tds-toast-')).toEqual([]);
});

test('MOTION-03: reduced-motion 이면 ToggleSwitch 손잡이의 transform transition 이 꺼진다 (quality-bar 가 지목한 위반)', async ({
  page,
}) => {
  await enableReducedMotion(page);
  await page.goto(LOGOS);
  await expect(page.locator('.tds-toggle__knob').first()).toBeVisible();

  expect(await transitionPropertyOf(page, '.tds-toggle__knob')).toBe('none');
  expect(await transitionPropertyOf(page, '.tds-toggle__track')).toBe('none');
});

test('MOTION-03 대조군: 기본(reduce 아님)에서는 ToggleSwitch transition 이 살아 있다', async ({
  page,
}) => {
  await page.goto(LOGOS);
  await expect(page.locator('.tds-toggle__knob').first()).toBeVisible();

  // 이 대조군이 없으면 위 테스트는 선택자가 틀려도(요소없음/none) 통과할 수 있다 —
  // **같은 선택자가 조건에 따라 다른 값**을 내야 매체 쿼리가 진짜로 동작한 것이다
  expect(await transitionPropertyOf(page, '.tds-toggle__knob')).toBe('transform');
  expect(await transitionPropertyOf(page, '.tds-toggle__track')).toBe('background-color');
});
