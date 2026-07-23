// 등급 추가·수정·삭제가 화면에서 실제로 그렇게 보이는가 — apps/admin/src/pages/customer-settings/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 모델 테스트로 충분하지 않은가]
// tiers.test.ts 는 순수 함수가 무엇을 돌려주는지 고정한다. 그런데 이 화면이 실제로 틀릴 수 있는
// 자리는 그 위다:
//   · 잠긴 버튼이 **사유를 달고 있는가** (disabled 만 걸고 이유를 안 말하는 것이 이 앱의 옛 병이다)
//   · 잠금과 거절이 **같은 술어**를 보는가 (버튼만 잠그면 URL 로 걸어 들어온 사람이 그대로 저장한다)
//   · 조회기가 미배선일 때 '0명' 이 아니라 **'확인하지 못했다'** 고 말하는가
// 그래서 여기서는 페이지를 진짜로 렌더하고 접근성 이름(aria-label)을 읽는다.
//
// [권한 축은 스토어에 심는다] usePermissions 는 Zustand 스토어를 읽으므로 Provider 없이
// setState 로 활성 역할의 권한을 갈아끼울 수 있다 (members.permission.test.tsx 와 같은 방식).
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  registerMemberTierUsageLookup,
  resetMemberTierUsageLookup,
} from '../../shared/domain/member-tier-catalog';
import { createWidgets } from '../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../shared/permissions/permission-store';
import { createMatrix, withResourceAction } from '../../shared/permissions/resources';
import type { PermissionAction } from '../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../shared/permissions/roles';
import { ToastProvider } from '../../shared/ui';
import { SYSTEM_TIER_REASON } from './types';
import type { TierPolicy } from './types';

const ROUTE = '/users/settings';

const POLICY: TierPolicy = {
  tiers: [
    { id: 'normal', label: '일반회원', system: true, threshold: 0, discountPercent: 0 },
    { id: 'vip', label: 'VIP', system: true, threshold: 1_000_000, discountPercent: 3 },
    { id: 'vvip', label: 'VVIP', system: true, threshold: 5_000_000, discountPercent: 5 },
  ],
  period: 'all',
  allowDemotion: false,
  recalcTrigger: 'order-completed',
};

/** 이미 '골드' 가 저장돼 있는 상태 — 수정·삭제 경로를 밟기 위한 표본 */
const POLICY_WITH_GOLD: TierPolicy = {
  ...POLICY,
  tiers: [
    ...POLICY.tiers.slice(0, 2),
    { id: 'tier-gold', label: '골드', system: false, threshold: 3_000_000, discountPercent: 4 },
    ...POLICY.tiers.slice(2),
  ],
};

// 조회만 바꾼다 — 검증(zod)·모델·라벨은 진짜를 그대로 쓴다(importOriginal).
const fetchTierPolicy = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchTierPolicy,
}));

const { default: CustomerSettingsPage } = await import('./CustomerSettingsPage');

/** 활성 역할의 권한을 심는다 — 전 권한 ON 에서 시작해 지정한 액션만 끈다 */
function seedPermissions(off: readonly PermissionAction[]): void {
  let permissions = createMatrix(true);
  for (const action of off) {
    permissions = withResourceAction(permissions, `page:${ROUTE}`, action, false);
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

function renderPage() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <ToastProvider>
        <MemoryRouter initialEntries={[ROUTE]}>
          <Routes>
            <Route path={ROUTE} element={<CustomerSettingsPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** 표가 실제로 섰는지 — 버튼 상태를 단언하기 전에 화면이 비어 있지 않음을 먼저 못 박는다 */
async function waitForTable(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByLabelText('VIP 승급 조건 (누적 구매금액, 원)')).not.toBeNull();
  });
}

beforeEach(() => {
  fetchTierPolicy.mockReset();
  fetchTierPolicy.mockResolvedValue(POLICY);
  resetMemberTierUsageLookup();
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

afterEach(() => {
  resetMemberTierUsageLookup();
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('기본 제공 등급의 자물쇠', () => {
  it('이름 수정·삭제 버튼이 비활성이고, 버튼 이름에 그 사유가 실린다', async () => {
    renderPage();
    await waitForTable();

    const rename = screen.getByLabelText<HTMLButtonElement>(`VIP — ${SYSTEM_TIER_REASON}`);
    expect(rename.disabled).toBe(true);

    // 삭제는 사유가 하나 더 있을 수 있지만, 시스템 등급이면 그 사유가 먼저다(하나만 말한다)
    const remove = screen.getByLabelText<HTMLButtonElement>(`'VIP' 은(는) ${SYSTEM_TIER_REASON}`);
    expect(remove.disabled).toBe(true);
  });

  it('승급 조건·할인율은 잠기지 않는다 — 정체성이 아니라 정책이다', async () => {
    renderPage();
    await waitForTable();

    const threshold = screen.getByLabelText<HTMLInputElement>('VIP 승급 조건 (누적 구매금액, 원)');
    expect(threshold.disabled).toBe(false);
  });
});

describe('등급 추가', () => {
  it('모달에서 이름을 넣으면 표에 새 행이 생긴다 — 승급 조건은 비어 있다', async () => {
    renderPage();
    await waitForTable();

    fireEvent.click(screen.getByRole('button', { name: '등급 추가' }));
    fireEvent.change(screen.getByLabelText('등급 이름'), { target: { value: '골드' } });
    fireEvent.click(screen.getByRole('button', { name: '등급 만들기' }));

    const threshold =
      await screen.findByLabelText<HTMLInputElement>('골드 승급 조건 (누적 구매금액, 원)');
    // 금액을 지어내지 않는다 — 비어 있고, 그래서 저장이 막힌다(아래 테스트)
    expect(threshold.value).toBe('');
  });

  it('이미 있는 이름은 거절하고 모달을 닫지 않는다', async () => {
    renderPage();
    await waitForTable();

    fireEvent.click(screen.getByRole('button', { name: '등급 추가' }));
    fireEvent.change(screen.getByLabelText('등급 이름'), { target: { value: 'VIP' } });
    fireEvent.click(screen.getByRole('button', { name: '등급 만들기' }));

    expect(screen.getByText('이미 같은 이름의 등급이 있어요.')).not.toBeNull();
    // 닫히지 않았다 = 고칠 자리가 그대로 남아 있다
    expect(screen.getByLabelText('등급 이름')).not.toBeNull();
  });

  it('승급 조건을 비운 채로는 저장을 거부하고, 어느 칸이 틀렸는지 표 안에 남긴다', async () => {
    renderPage();
    await waitForTable();

    fireEvent.click(screen.getByRole('button', { name: '등급 추가' }));
    fireEvent.change(screen.getByLabelText('등급 이름'), { target: { value: '골드' } });
    fireEvent.click(screen.getByRole('button', { name: '등급 만들기' }));
    await screen.findByLabelText('골드 승급 조건 (누적 구매금액, 원)');

    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    // 토스트는 사라진다 — 인라인 문구가 남아야 고칠 수 있다
    expect(
      await screen.findByText('골드 승급 조건은 0 이상의 정수(원)로 입력하세요.'),
    ).not.toBeNull();
    // 저장 확인 다이얼로그까지 가지 않는다
    expect(screen.queryByText('등급 정책 저장')).toBeNull();
  });
});

describe('등급 이름 수정', () => {
  it('추가한 등급은 이름을 바꿀 수 있다', async () => {
    fetchTierPolicy.mockResolvedValue(POLICY_WITH_GOLD);
    renderPage();
    await waitForTable();

    fireEvent.click(screen.getByRole('button', { name: '골드 이름 수정' }));
    fireEvent.change(screen.getByLabelText('등급 이름'), { target: { value: '플래티넘' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    // 라벨이 바뀌면 그 행의 입력 접근성 이름도 함께 바뀐다
    expect(await screen.findByLabelText('플래티넘 승급 조건 (누적 구매금액, 원)')).not.toBeNull();
  });
});

describe('등급 삭제는 참조 검사 뒤에', () => {
  it('조회기가 미배선이면 삭제를 막고 "확인하지 못했다" 고 말한다 (0명이 아니다)', async () => {
    fetchTierPolicy.mockResolvedValue(POLICY_WITH_GOLD);
    renderPage();
    await waitForTable();

    const remove = screen.getByLabelText<HTMLButtonElement>(
      "'골드' 등급을 쓰는 회원을 확인하지 못해 삭제할 수 없어요. 잠시 후 다시 시도해 주세요.",
    );
    expect(remove.disabled).toBe(true);
  });

  it('쓰는 회원이 있으면 몇 명인지와 어디서 바꾸는지를 버튼 이름에 싣는다', async () => {
    registerMemberTierUsageLookup((tierId) => (tierId === 'tier-gold' ? 3 : 0));
    fetchTierPolicy.mockResolvedValue(POLICY_WITH_GOLD);
    renderPage();
    await waitForTable();

    const remove = screen.getByLabelText<HTMLButtonElement>(
      "'골드' 등급을 쓰는 회원이 3명 있어 삭제할 수 없어요. 회원 관리(/users/members)에서 이 회원들의 등급을 먼저 바꾼 뒤 다시 삭제해 주세요.",
    );
    expect(remove.disabled).toBe(true);
  });

  it('쓰는 회원이 없으면 확인 후 목록에서 사라진다', async () => {
    registerMemberTierUsageLookup(() => 0);
    fetchTierPolicy.mockResolvedValue(POLICY_WITH_GOLD);
    renderPage();
    await waitForTable();

    fireEvent.click(screen.getByLabelText('골드 삭제'));
    fireEvent.click(screen.getByRole('button', { name: '등급 삭제' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('골드 승급 조건 (누적 구매금액, 원)')).toBeNull();
    });
    // 기본 제공 등급은 그대로 남는다
    expect(screen.getByLabelText('VIP 승급 조건 (누적 구매금액, 원)')).not.toBeNull();
  });
});

describe('권한 게이팅 — 버튼을 잠그는 술어와 저장을 거절하는 술어가 같다', () => {
  it('등록 권한이 없으면 등급 추가 버튼이 아예 없다 (EXC-03)', async () => {
    seedPermissions(['create']);
    renderPage();
    await waitForTable();

    expect(screen.queryByRole('button', { name: '등급 추가' })).toBeNull();
  });

  it('삭제 권한이 없으면 삭제 버튼이 아예 없다', async () => {
    registerMemberTierUsageLookup(() => 0);
    seedPermissions(['remove']);
    fetchTierPolicy.mockResolvedValue(POLICY_WITH_GOLD);
    renderPage();
    await waitForTable();

    expect(screen.queryByLabelText('골드 삭제')).toBeNull();
  });

  /**
   * [이 테스트가 공허하지 않다는 증거 — 지우지 말 것]
   * 저장 버튼은 '변경 없음' 만으로도 비활성이다. 그래서 **초안을 실제로 더럽힌 뒤에** 단언해야
   * 권한 축을 검사한 것이 된다 — 그러지 않으면 저장 버튼이 canUpdate 를 아예 안 읽어도 초록이다.
   * (update 만 끄고 create 는 남긴 이유가 이것이다: 등급을 추가해 dirty 를 만든다.)
   */
  it('수정 권한이 없으면 변경이 있어도 저장 버튼이 잠기고, 사유가 버튼 이름에 실린다', async () => {
    seedPermissions(['update']);
    renderPage();
    await waitForTable();

    fireEvent.click(screen.getByRole('button', { name: '등급 추가' }));
    fireEvent.change(screen.getByLabelText('등급 이름'), { target: { value: '골드' } });
    fireEvent.click(screen.getByRole('button', { name: '등급 만들기' }));
    await screen.findByLabelText('골드 승급 조건 (누적 구매금액, 원)');

    const save = screen.getByRole<HTMLButtonElement>('button', {
      name: '저장 — 이 화면의 수정 권한이 없어 저장할 수 없어요.',
    });
    // 변경은 분명히 있다(방금 등급을 하나 더했다) — 그런데도 잠겨 있다
    expect(save.disabled).toBe(true);
    expect(screen.getByText('이 화면의 수정 권한이 없어 저장할 수 없어요.')).not.toBeNull();

    // 입력도 함께 잠긴다 — 고칠 수 없는 것을 고치게 두지 않는다
    expect(
      screen.getByLabelText<HTMLInputElement>('VIP 승급 조건 (누적 구매금액, 원)').disabled,
    ).toBe(true);
  });
});
