// 엔타이틀먼트 축을 **렌더로** 고정한다 (EXC-21) · apps/admin/src/shared/entitlements/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나 — 왜 단위 테스트로는 부족한가]
// plan.test.ts / route-entitlement.test.ts 는 `entitlementStateOf` 가 어떤 3상태를 **계산**하는지를
// 고정한다. 그런데 이 층이 실제로 약속한 것은 계산값이 아니라 **화면**이다:
//   · locked 는 잠금 화면이어야 하고 403 의 말투를 쓰면 안 된다
//   · absent 는 설명 화면이 아니라 되돌림이어야 한다
//   · 플랜 판정이 권한 판정보다 **먼저** 서야 한다
// 셋 다 판정 함수가 옳아도 배선 한 줄이 뒤집히면 그대로 깨지고, 깨져도 함수 테스트는 전부 초록이다.
// 그래서 여기서는 `<RequireEntitlement>` 를 실제로 렌더해 화면에 남은 글자로 단언한다.
//
// [네 말투 규칙 — 이 파일의 본체]
// 이 앱은 '못 하는 이유' 를 네 가지 말투로 나눠 말한다: 인증 → 플랜 → 권한 → 도메인 설정.
// 가장 비싼 혼동은 **플랜과 권한**이다. 사지 않은 기능에 '접근 권한이 없습니다' 라고 말하면
// 운영자는 관리자에게 권한을 요청하고, 관리자도 켤 수 없어 그 요청은 지원 티켓이 된다
// (shared/entitlements/plan.ts 머리말). 그래서 잠금 화면에 403 문구가 **없다는 사실**을 단언한다 —
// '업그레이드 문구가 있다' 만으로는 두 문구가 나란히 붙어 있어도 통과한다.
//
// [두 축을 한 단언에 섞지 않는다]
// list-create-cta.permission.test.tsx 가 권한 축을 보기 전에 PG 축을 먼저 열어 둔 것과 같은 규율이다.
// 여기서도 플랜을 볼 때는 권한을 전부 켜 두고, 권한을 볼 때는 플랜을 granted 로 열어 둔다.
// 두 축을 함께 끄는 조합은 **판정 순서를 보는 테스트 한 건**뿐이며, 그때는 그것이 요점이다.
// ─────────────────────────────────────────────────────────────────────────────
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWidgets } from '../permissions/feature-registry';
import { usePermissionStore } from '../permissions/permission-store';
import { RequirePermission } from '../permissions/RequirePermission';
import { createMatrix, navPageResourceId, withResourceAction } from '../permissions/resources';
import type { ResourceId } from '../permissions/resources';
import { ROLE_STATE_VERSION } from '../permissions/roles';
import { useEntitlementStore } from './entitlement-store';
import { PLAN_TIER_LABEL, planStateForTier } from './plan';
import type { EntitlementKey, Entitlement, PlanState } from './plan';
import { RequireEntitlement } from './RequireEntitlement';

/* ── 좌표 ─────────────────────────────────────────────────────────────────── */

/**
 * 잠금(locked)을 보는 경로 — AI 에이전트는 엔터프라이즈 전에는 잠긴다(plan.ts MODULE_SPECS).
 * 살 수 있는 모듈이므로 '메뉴에서 지우지 않고 잠금 화면을 보여 준다' 가 옳은 답이다.
 */
const LOCKED_PATH = '/ai/chat';
const LOCKED_UPGRADE_TO = 'enterprise';

/**
 * 숨김(absent)을 보는 경로 — SMS 는 발송사 계약이 따로 있어야 켤 수 있어 티어 사다리에 없다
 * (minTier: null). 플랜을 올려도 저절로 열리지 않으므로 잠금이 아니라 완전 숨김이다.
 */
const ABSENT_PATH = '/marketing/sms';

/** absent 가 되돌아가는 곳 — RequireEntitlement 가 하드코딩한 유일한 목적지다 */
const DASHBOARD_PATH = '/dashboard';

/** 뒤로 가기 단언용 앵커 — 어떤 잎에도 속하지 않아 게이팅과 무관하다 */
const PREVIOUS_PATH = '/entitlement-test-previous';

const SCREEN_BODY = '가드를 통과한 본문';
const DASHBOARD_BODY = '대시보드 본문';
const PREVIOUS_BODY = '직전 화면';

/** 403 의 말투 — 잠금 화면에 **이 두 조각이 없다는 사실**이 네 말투 규칙의 전부다 */
const FORBIDDEN_TITLE = '접근 권한이 없어요';
const FORBIDDEN_HINT = '관리자에게 권한을 요청';

/** 잠금 화면의 말투 — 문구의 정본은 ErrorScreens.UpgradeScreen · plan.ts 의 lockReason 이다 */
const UPGRADE_TITLE = `${PLAN_TIER_LABEL[LOCKED_UPGRADE_TO]} 플랜에서 사용할 수 있어요`;

/* ── 축 조작 ──────────────────────────────────────────────────────────────── */

/**
 * 두 스토어 모두 모듈 싱글턴이라 테스트 사이에 값이 샌다. 손으로 기본값을 적어 두면 그 사본이
 * 두 번째 정본이 되므로, **import 시점의 상태를 그대로 떠서** 되돌린다.
 */
const PRISTINE_ROLE_STATE = usePermissionStore.getState().roleState;
const PRISTINE_PLAN = useEntitlementStore.getState().plan;

/** 활성 역할을 심는다 — 전 권한 ON 에서 시작해 지정한 리소스의 read 만 끈다 (form-permission.test 와 같은 방식) */
function seedRole(readOff: readonly ResourceId[]): void {
  let permissions = createMatrix(true);
  for (const resourceId of readOff) {
    permissions = withResourceAction(permissions, resourceId, 'read', false);
  }

  usePermissionStore.setState({
    roleState: {
      version: ROLE_STATE_VERSION,
      roles: [
        {
          id: 'role-test',
          name: '테스트 역할',
          system: false,
          scope: 'all',
          permissions,
          widgets: createWidgets(true),
        },
      ],
      activeRoleId: 'role-test',
    },
  });
}

/** 플랜을 심는다 — 사내 어드민이 값을 준 것과 같은 통로(receivePlan)를 쓴다 */
function seedPlan(plan: PlanState): void {
  useEntitlementStore.getState().receivePlan(plan);
}

/** SMS 를 명시적으로 끈 플랜 — 티어 사다리에 없는 모듈은 이때만 absent 가 된다 */
function planWithSmsOff(): PlanState {
  return {
    ...planStateForTier('enterprise'),
    overrides: { 'marketing.sms': { kind: 'switch', enabled: false } },
  };
}

/**
 * AI 모듈 키가 **응답에 아예 없는** 플랜 — 서버 카탈로그가 앱보다 오래된 상태의 재현이다.
 * 값을 false 로 넣는 것과 다르다: 없는 것과 꺼진 것은 이 축에서 정반대 결론으로 간다.
 */
function planWithoutAiKey(): PlanState {
  const base = planStateForTier('free');
  const kept = Object.entries(base.entitlements).filter(([key]) => key !== 'ai.agent');
  return {
    ...base,
    entitlements: Object.fromEntries(kept) as Readonly<Record<EntitlementKey, Entitlement>>,
  };
}

/* ── 렌더 ─────────────────────────────────────────────────────────────────── */

/** 뒤로 가기 — absent 의 되돌림이 push 인지 replace 인지는 이 버튼으로만 드러난다 */
function BackButton() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        void navigate(-1);
      }}
    >
      뒤로
    </button>
  );
}

/**
 * 앱과 **같은 중첩**으로 렌더한다 — AppShell.tsx 의 두 줄을 그대로 옮긴 것이다.
 * 이 순서(플랜 바깥 · 권한 안쪽)가 곧 판정 순서이므로, 테스트가 순서를 스스로 정하면 아무것도
 * 지키지 못한다. 여기서는 앱의 배선을 복제하고 결과만 단언한다.
 */
function renderGuard(entries: readonly string[], initialIndex: number): void {
  render(
    // main.tsx 와 같은 v7 동작으로 맞춘다 — 앱과 다른 라우터 설정 위에서 단언하지 않는다
    <MemoryRouter
      initialEntries={[...entries]}
      initialIndex={initialIndex}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path={DASHBOARD_PATH} element={<p>{DASHBOARD_BODY}</p>} />
        <Route path={PREVIOUS_PATH} element={<p>{PREVIOUS_BODY}</p>} />
        <Route
          path="*"
          element={
            <RequireEntitlement>
              <RequirePermission>
                <p>{SCREEN_BODY}</p>
              </RequirePermission>
            </RequireEntitlement>
          }
        />
      </Routes>
      <BackButton />
    </MemoryRouter>,
  );
}

function renderAt(pathname: string): void {
  renderGuard([pathname], 0);
}

/** 화면 전체의 글자 — '없다' 를 단언할 때는 요소 조회가 아니라 본문 전체를 본다 */
function bodyText(): string {
  return document.body.textContent ?? '';
}

beforeEach(() => {
  // 기본 자세: 두 축 모두 열려 있다. 각 테스트는 **자기가 보려는 축 하나만** 닫는다.
  seedRole([]);
  seedPlan(planStateForTier('enterprise'));
});

afterEach(() => {
  usePermissionStore.setState({ roleState: PRISTINE_ROLE_STATE });
  useEntitlementStore.setState({ plan: PRISTINE_PLAN });
  vi.restoreAllMocks();
});

/* ── locked — 잠금 화면이고, 403 의 말투를 쓰지 않는다 ────────────────────── */

describe('locked — 잠금 화면을 그린다. 403 문구는 한 조각도 쓰지 않는다 (EXC-21)', () => {
  beforeEach(() => {
    // 권한은 전부 켜 둔다 — 여기서 보려는 것은 플랜 축 하나다
    seedPlan(planStateForTier('free'));
  });

  it('본문 대신 UpgradeScreen 을 그린다 — 어느 플랜에서 열리는지까지 말한다', () => {
    renderAt(LOCKED_PATH);

    expect(screen.getByText(UPGRADE_TITLE)).not.toBeNull();
    // 나가는 길은 사내 홈페이지다 — 이 어드민 안에 플랜 변경 수단을 두지 않는다
    expect(screen.getByRole('link', { name: '플랜 보기' })).not.toBeNull();
    expect(screen.queryByText(SCREEN_BODY)).toBeNull();
  });

  /**
   * **이 파일에서 가장 중요한 단언이다.**
   *
   * 잠금 화면이 403 의 말투를 쓰면 운영자는 켜 줄 수 없는 관리자에게 권한을 요청한다. '업그레이드
   * 문구가 있다' 만 단언하면 두 문구가 나란히 붙어 있어도 통과하므로, **없다는 사실**을 직접 못박는다.
   * 요소 조회가 아니라 본문 전체 문자열을 보는 이유도 같다 — 어느 노드에 섞여 들어와도 잡힌다.
   */
  it('403 의 말투가 화면 어디에도 없다 — 플랜과 권한은 다른 사람이 다른 행동을 해야 한다', () => {
    renderAt(LOCKED_PATH);

    expect(bodyText()).not.toContain(FORBIDDEN_TITLE);
    expect(bodyText()).not.toContain(FORBIDDEN_HINT);
  });

  /**
   * 잠금은 '지금 못 본다' 이지 '없어졌다' 가 아니다. 되돌리지 않고 그 자리에 머무는 것이
   * absent 와 갈리는 지점이며, 그래야 운영자가 무엇을 사야 하는지 읽고 나갈 수 있다.
   */
  it('되돌리지 않는다 — 잠금은 그 자리에서 설명한다 (absent 와 갈리는 지점)', () => {
    renderAt(LOCKED_PATH);

    expect(screen.queryByText(DASHBOARD_BODY)).toBeNull();
  });
});

/* ── absent — 설명하지 않고 되돌린다 ──────────────────────────────────────── */

describe('absent — 살 수 없는 모듈은 설명 대신 되돌린다 (EXC-21)', () => {
  beforeEach(() => {
    seedPlan(planWithSmsOff());
  });

  it('대시보드로 되돌린다 — 잠금 화면을 그리지 않는다', () => {
    renderAt(ABSENT_PATH);

    expect(screen.getByText(DASHBOARD_BODY)).not.toBeNull();
    expect(screen.queryByText(SCREEN_BODY)).toBeNull();
    // '살 수 없는 것' 에 자물쇠를 달면 그 화면 자체가 티저가 된다 — 업그레이드 문구가 없어야 한다
    expect(bodyText()).not.toContain('플랜에서 사용할 수 있어요');
    expect(bodyText()).not.toContain('플랜 보기');
  });

  /** 사지 못하는 모듈을 소개하지도 않는다 — 카탈로그의 설명 문구가 새어 나가면 그것도 티저다 */
  it('모듈 설명을 노출하지 않는다 — 되돌림은 설명의 대체재가 아니라 설명의 부재다', () => {
    renderAt(ABSENT_PATH);

    expect(bodyText()).not.toContain('문자·알림톡을 발송');
  });

  /**
   * replace 다 — push 로 되돌리면 히스토리에 '들어가자마자 튕기는 주소' 가 남아 뒤로 가기가
   * 무한 고리가 된다(RequireEntitlement.tsx 머리말). 그 사실은 **뒤로 가 봐야만** 드러난다.
   */
  it('되돌림은 replace 다 — 뒤로 가면 직전 화면이지, 튕겨 나온 주소가 아니다', () => {
    renderGuard([PREVIOUS_PATH, ABSENT_PATH], 1);
    expect(screen.getByText(DASHBOARD_BODY)).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '뒤로' }));

    expect(screen.getByText(PREVIOUS_BODY)).not.toBeNull();
    expect(screen.queryByText(DASHBOARD_BODY)).toBeNull();
  });
});

/* ── granted — 권한 층으로 넘긴다 ─────────────────────────────────────────── */

describe('granted — 판정을 멈추지 않고 권한 층으로 넘긴다', () => {
  it('플랜도 권한도 열려 있으면 본문이 그대로 렌더된다', () => {
    renderAt(LOCKED_PATH); // enterprise 플랜이므로 이 경로는 granted 다

    expect(screen.getByText(SCREEN_BODY)).not.toBeNull();
  });

  /**
   * granted 가 children 을 실제로 렌더했다는 **증거**다. 여기서 403 이 나온다는 것은 안쪽의
   * RequirePermission 이 돌았다는 뜻이고, 그것 말고 이 화면에 403 이 나올 경로는 없다.
   */
  it('권한이 없으면 그 다음 층이 403 을 그린다 — 플랜은 통과했다는 증거다', () => {
    seedRole([navPageResourceId(LOCKED_PATH)]);
    renderAt(LOCKED_PATH);

    expect(screen.getByText(FORBIDDEN_TITLE)).not.toBeNull();
    expect(screen.queryByText(SCREEN_BODY)).toBeNull();
  });
});

/* ── 판정 순서 — 이 파일이 존재하는 이유 ──────────────────────────────────── */

/**
 * 두 축을 **함께** 닫는 유일한 자리다. 다른 곳에서는 축을 섞지 않지만, 여기서는 섞는 것이 요점이다:
 * 둘 다 닫혔을 때 화면이 무엇을 말하는가가 곧 판정 순서다.
 *
 * 중첩을 뒤집어도(권한이 바깥) 두 화면 모두 '뭔가 막혔다' 로 보이므로 눈으로는 잡히지 않는다.
 * 이 단언 하나가 AppShell.tsx 의 두 줄 순서를 고정한다.
 */
describe('판정 순서 — 플랜이 먼저, 권한이 나중 (뒤집으면 진단이 틀린다)', () => {
  it('플랜도 권한도 없으면 **잠금 화면**이다 — 403 이 아니다', () => {
    seedPlan(planStateForTier('free'));
    seedRole([navPageResourceId(LOCKED_PATH)]);
    renderAt(LOCKED_PATH);

    expect(screen.getByText(UPGRADE_TITLE)).not.toBeNull();
    expect(bodyText()).not.toContain(FORBIDDEN_TITLE);
    expect(bodyText()).not.toContain(FORBIDDEN_HINT);
  });

  /** 반대 방향 — 이게 없으면 '늘 잠금 화면을 그린다' 로도 위 단언이 통과한다 */
  it('플랜이 열려 있으면 같은 역할이 403 을 만난다 — 잠금 화면이 권한 판정을 삼키지 않는다', () => {
    seedRole([navPageResourceId(LOCKED_PATH)]);
    renderAt(LOCKED_PATH);

    expect(screen.getByText(FORBIDDEN_TITLE)).not.toBeNull();
    expect(bodyText()).not.toContain(UPGRADE_TITLE);
  });

  /** absent 도 권한보다 먼저다 — 403 을 그리는 대신 되돌린다 */
  it('absent 도 권한보다 먼저다 — 403 대신 되돌림이다', () => {
    seedPlan(planWithSmsOff());
    seedRole([navPageResourceId(ABSENT_PATH)]);
    renderAt(ABSENT_PATH);

    expect(screen.getByText(DASHBOARD_BODY)).not.toBeNull();
    expect(bodyText()).not.toContain(FORBIDDEN_TITLE);
  });
});

/* ── fail-open — 권한 축과 정반대 방향 ────────────────────────────────────── */

/**
 * 이 축의 모든 '모르겠다' 는 granted 로 수렴한다(plan.ts 머리말). 고객이 돈을 낸 기능이 우리
 * 조회 실패로 멈추는 것은 어떤 과금 실수보다 나쁘기 때문이다. 그런데 이 리포의 기존 이음매는
 * 전부 fail-closed 관성이라, 누군가 '일관성' 을 이유로 이 방향을 되돌리기 쉽다 — 그러면
 * **저장값 파손 = 전 기능 정지**가 되고 아무도 이유를 모른다. 화면으로 못박는다.
 */
describe('fail-open — 플랜을 모르면 화면은 열린다 (권한 축의 fail-closed 와 반대)', () => {
  /**
   * 조회기가 던진다 — 저장값 파손·프라이빗 모드 차단이 모두 이 한 갈래로 들어온다.
   *
   * [왜 localStorage 를 스파이하지 않는가] jsdom 의 Storage 는 Proxy 라 인스턴스 메서드를 갈아끼워도
   * 가로채지지 않는다(실측: 스파이가 걸리지 않아 옛 플랜이 그대로 살아 있었다). 파싱 단계에서
   * 던지면 loadState 의 **같은 catch** 에 도달하므로 방어하려는 지점은 동일하고, 조작은 확실하다.
   */
  it('플랜 조회기가 던져도 화면이 열린다 — 저장값 파손이 전 기능 정지가 되지 않는다', () => {
    seedPlan(planStateForTier('free')); // 이대로면 LOCKED_PATH 는 잠긴다
    const parse = vi.spyOn(JSON, 'parse').mockImplementation(() => {
      throw new SyntaxError('저장값이 깨졌다');
    });

    // 다른 탭의 변경을 따라가는 경로가 곧 재조회 경로다 — 실제 실패는 여기서 일어난다
    useEntitlementStore.getState().syncFromStorage();
    parse.mockRestore();

    renderAt(LOCKED_PATH);

    expect(screen.getByText(SCREEN_BODY)).not.toBeNull();
    expect(bodyText()).not.toContain(UPGRADE_TITLE);
  });

  /**
   * 미배선 — 이 앱에는 아직 백엔드가 없어 '아무도 플랜을 주지 않은 상태' 가 정상 상태다.
   * 그때 기능이 사라지면 엔타이틀먼트 층을 **추가한 것만으로** 어제의 앱과 오늘의 앱이 달라진다.
   */
  it('아무도 플랜을 주지 않았으면 전 기능이 열린다 — 층을 추가한 것만으로 화면이 사라지지 않는다', () => {
    seedPlan(planStateForTier('free'));
    window.localStorage.clear();

    useEntitlementStore.getState().syncFromStorage();
    renderAt(LOCKED_PATH);

    expect(screen.getByText(SCREEN_BODY)).not.toBeNull();
  });

  /**
   * 응답에 키가 없다 — '이 계정이 못 산 기능' 이 아니라 **서버 카탈로그가 앱보다 오래됐다** 일
   * 가능성이 훨씬 높다. 이것을 차단으로 읽으면 새 모듈이 출시일에 전 고객에게서 사라진다.
   */
  it('플랜 응답이 모르는 모듈은 열린다 — 앱이 카탈로그보다 앞섰을 뿐이다', () => {
    seedPlan(planWithoutAiKey());
    renderAt(LOCKED_PATH);

    expect(screen.getByText(SCREEN_BODY)).not.toBeNull();
    expect(bodyText()).not.toContain(UPGRADE_TITLE);
  });

  /**
   * 방향 대조 — 같은 상황에서 권한 축은 열리지 않는다. 두 축의 실패 방향이 정말 반대라는 것을
   * 한 화면 위에서 보여 준다(엔타이틀먼트가 열어 준 화면을 권한이 그대로 막는다).
   */
  it('플랜이 열려도 권한은 자기 판정을 그대로 한다 — fail-open 이 권한까지 열지 않는다', () => {
    seedPlan(planStateForTier('free'));
    seedRole([navPageResourceId(LOCKED_PATH)]);
    window.localStorage.clear();

    useEntitlementStore.getState().syncFromStorage();
    renderAt(LOCKED_PATH);

    expect(screen.getByText(FORBIDDEN_TITLE)).not.toBeNull();
    expect(screen.queryByText(SCREEN_BODY)).toBeNull();
  });
});
