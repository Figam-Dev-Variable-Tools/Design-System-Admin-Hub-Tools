// E2E 지원 유틸 (A85 소유 — e2e/**)
//
// **여기에 화면 지식을 넣지 않는다.** 여기 있는 것은 브라우저 상태(저장소·전역)를 테스트가
// 시작되기 전에 세팅하는 장치뿐이다. 단언과 로케이터는 각 spec 이 소유한다.
//
// [왜 저장소를 직접 심는가]
// 권한(역할)과 세션은 백엔드가 아니라 브라우저 저장소가 원천이다
// (apps/admin/src/shared/permissions/PermissionProvider.tsx · pages/login/session.ts).
// 즉 저장소가 이 화면들의 **주입 지점**이다 — 앱 코드를 고치지 않고 권한 축을 재현할 수 있다.
import type { Page } from '@playwright/test';

/** PermissionProvider 의 저장 키 */
const ROLE_STORAGE_KEY = 'tds-admin.roles';
/** session.ts 의 저장 키 */
const SESSION_KEY = 'tds.admin.session';
const REMEMBERED_EMAIL_KEY = 'tds.admin.remembered-email';

/** 사이드바 메뉴 권한 키 14종 (feature-registry.ts) */
export const MENU_KEYS = [
  'menu.dashboard',
  'menu.users',
  'menu.content',
  'menu.company',
  'menu.portfolio',
  'menu.products',
  'menu.sales',
  'menu.support',
  'menu.marketing',
  'menu.reservations',
  'menu.stats',
  'menu.logs',
  'menu.notifications',
  'menu.settings',
] as const;

/** 대시보드 위젯 권한 키 7종 (feature-registry.ts) */
export const WIDGET_KEYS = [
  'dashboard.tab.products',
  'dashboard.tab.inquiries',
  'dashboard.tab.sales',
  'dashboard.todo',
  'dashboard.lists',
  'dashboard.stats.visitors',
  'dashboard.stats.period',
] as const;

export type PermissionOverrides = Partial<
  Record<(typeof MENU_KEYS)[number] | (typeof WIDGET_KEYS)[number], boolean>
>;

/**
 * 활성 역할의 권한을 심는다. **적어 준 키만 끄고 나머지는 전부 ON** 이다 —
 * 이것은 테스트의 편의가 아니라 명세된 동작이다:
 *   FS-002-EL-042 유효성 — "등록되지 않은 키는 버리고, 빠진 키와 boolean 이 아닌 값은 기본값 ON 으로 채운다"
 *   (normalizeLegacyPermissions: "값이 없으면 전부 ON 으로 본다")
 */
export async function seedPermissions(page: Page, overrides: PermissionOverrides): Promise<void> {
  const state = {
    roles: [{ id: 'role-e2e', name: 'E2E 역할', permissions: overrides }],
    activeRoleId: 'role-e2e',
  };
  await seedRoleState(page, JSON.stringify(state));
}

/** 저장값을 날것으로 심는다 (JSON 파손 · 알 수 없는 형태의 방어를 검증할 때) */
export async function seedRoleState(page: Page, raw: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
    },
    [ROLE_STORAGE_KEY, raw] as const,
  );
}

/**
 * 다른 브라우저 탭이 권한을 바꾼 상황을 재현한다 —
 * 저장소를 갈아끼우고 storage 이벤트를 쏜다 (PermissionProvider 가 구독하는 바로 그 이벤트다).
 */
export async function changePermissionsInOtherTab(
  page: Page,
  overrides: PermissionOverrides,
): Promise<void> {
  const raw = JSON.stringify({
    roles: [{ id: 'role-e2e', name: 'E2E 역할', permissions: overrides }],
    activeRoleId: 'role-e2e',
  });
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
      window.dispatchEvent(new StorageEvent('storage', { key: key as string }));
    },
    [ROLE_STORAGE_KEY, raw] as const,
  );
}

export interface SeedSession {
  readonly userId: string;
  readonly email: string;
  readonly role: 'system_admin' | 'operator' | 'viewer';
  readonly issuedAt: number;
}

/** 인증된 사용자로 진입시킨다 (FS-001-EL-025) */
export async function seedSession(page: Page, session: SeedSession | string): Promise<void> {
  const raw = typeof session === 'string' ? session : JSON.stringify(session);
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
    },
    [SESSION_KEY, raw] as const,
  );
}

/**
 * 셸 라우트 진입의 **인증 전제** — `test.beforeEach(seedAuthenticated)` 로 쓴다 (EXC-02).
 *
 * [왜 생겼나] 인증 가드가 붙기 전에는 세션 없이도 /dashboard·/users/members 가 그대로 렌더됐고,
 * FS-002/003/004 는 그 사실에 기대어 세션을 심지 않았다. 이제 셸 라우트는 세션이 없으면
 * /login?returnUrl=… 으로 보낸다 — 인증된 화면을 검증하는 스펙은 인증을 세워야 한다.
 *
 * 이 헬퍼는 **전제만** 만든다. 인증의 축(성공·실패·만료·오픈 리다이렉트)은 FS-001 이 소유하며,
 * 세션 형식이 깨진 경우 등은 그쪽에서 seedSession 으로 직접 심는다.
 */
export async function seedAuthenticated({ page }: { readonly page: Page }): Promise<void> {
  await seedSession(page, {
    userId: 'U-0001',
    email: 'admin@klipse.com',
    role: 'system_admin',
    issuedAt: Date.now(),
  });
}

/** '이메일 저장' 으로 보관된 이메일 (FS-001-EL-015) */
export async function seedRememberedEmail(page: Page, email: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
    },
    [REMEMBERED_EMAIL_KEY, email] as const,
  );
}

/** 다른 탭이 저장된 이메일을 바꾼 상황 (진입 후 재동기화하지 않는지 본다) */
export async function changeRememberedEmailInOtherTab(page: Page, email: string): Promise<void> {
  await page.evaluate(
    ([key, value]) => {
      window.localStorage.setItem(key as string, value as string);
      window.dispatchEvent(new StorageEvent('storage', { key: key as string }));
    },
    [REMEMBERED_EMAIL_KEY, email] as const,
  );
}

/**
 * 브라우저 저장소 접근 차단 (사생활 보호 모드 등) — 읽기·쓰기가 전부 throw 한다.
 * FS-001 §4.1 "브라우저 저장소 접근 불가" · FS-002-EL-007 실패 축의 재현 수단이다.
 */
export async function blockLocalStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const boom = () => {
      throw new DOMException('저장소 접근이 차단되었습니다.', 'SecurityError');
    };
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: boom,
    });
  });
}

/**
 * 멱등키 발급 횟수를 관찰한다.
 *
 * 적립금 지급의 멱등키는 `crypto.randomUUID()` 로 만들어진다(PointsCard). 백엔드가 없어
 * `Idempotency-Key` 헤더를 관측할 수 없으므로, **키가 몇 개 발급됐는지**를 센다.
 * 재시도가 새 키를 만들면 서버는 두 요청을 별개 거래로 보고 **적립금을 두 번 지급한다**
 * (BE-004 §7.6 #1 — 감사가 적발한 결함). 그 회귀를 여기서 막는다.
 */
export async function spyIdempotencyKeys(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = crypto.randomUUID.bind(crypto);
    const counter = { count: 0, keys: [] as string[] };
    (window as unknown as Record<string, unknown>)['__tdsUuid'] = counter;
    Object.defineProperty(crypto, 'randomUUID', {
      configurable: true,
      writable: true,
      value: () => {
        const key = original();
        counter.count += 1;
        counter.keys.push(key);
        return key;
      },
    });
  });
}

export async function idempotencyKeysIssued(page: Page): Promise<number> {
  return page.evaluate(() => {
    const counter = (window as unknown as Record<string, unknown>)['__tdsUuid'] as
      { count: number } | undefined;
    return counter?.count ?? 0;
  });
}

/**
 * 실패 스위치(`?fail=...`)를 끈다 — **리로드 없이**.
 * data-source 의 failIfRequested 는 호출 시점의 `window.location.search` 를 읽는다. 그래서
 * 히스토리만 바꿔 두면 다음 요청부터 성공한다 — '응답이 유실됐다가 복구된' 상황의 재현이다.
 * (리로드하면 화면 상태가 초기화되어 재시도 시나리오 자체가 사라진다.)
 */
export async function clearFailureSwitch(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.history.replaceState({}, '', window.location.pathname);
  });
}
