// 회원 화면의 쓰기·내보내기 게이팅 (EXC-03) — apps/admin/src/pages/members/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이것이 P1 인가 — 이 화면의 액션이 앱에서 가장 민감하다]
// 회원 목록/상세는 권한을 **한 번도 묻지 않았다.** 그런데 여기 있는 액션은
//   · CSV 내보내기 — 계정·연락처·주소가 담긴 **개인정보를 파일로 반출**한다
//   · 회원 삭제 / 일괄 삭제 — 되돌릴 수 없다
//   · 알림 발송 — 회원에게 실제로 나간다
//   · 비밀번호 변경 · 적립금 지급/차감 — 계정과 돈을 움직인다
// 이다. 읽기만 허용된 역할이 이것을 전부 보고 누를 수 있었다면 권한 모델이 없는 것과 같다.
//
// [기준은 '비활성' 이 아니라 '부재' 다 — EXC-03]
// 누를 수 없는 것은 보여 주지 않는다. 그래서 단언도 disabled 여부가 아니라 **존재 여부**다.
// (로그·통계 화면이 이미 이 규칙으로 서 있다 — LogListShell.test 와 같은 형태의 검사다.)
//
// [왜 액션마다 따로 끄나] 네 액션은 서로 다른 권한(export/remove/update)을 탄다. 한 역할로
// 뭉뚱그려 단언하면 '전부 read-only 면 전부 사라진다' 만 지킬 뿐, **어느 액션이 어느 권한을
// 타는지**는 뒤바뀌어도 통과한다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWidgets } from '../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../shared/permissions/permission-store';
import { createMatrix, withResourceAction } from '../../shared/permissions/resources';
import type { PermissionAction } from '../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../shared/permissions/roles';
import { ToastProvider } from '../../shared/ui';
import type { Member, MemberDetail, MemberListResult } from './types';

const LIST_ROUTE = '/users/members';
const MEMBER_ID = 'm1';

const MEMBER: Member = {
  id: MEMBER_ID,
  nickname: '명재우',
  account: 'myungjw@naver.com',
  tier: 'vip',
  groupId: 'g1',
  group: '일반',
  joinedAt: '2025-03-02',
  joinedAtIso: '2025-03-02T10:11:00.000Z',
  points: 1200,
  activity: { posts: 3, comments: 5, reviews: 2, inquiries: 1 },
  totalPurchase: 350000,
  memo: 'VIP 승급 예정',
};

const LIST: MemberListResult = {
  members: [MEMBER],
  counts: { all: 1, normal: 0, vip: 1, vvip: 0 },
  groupCounts: { g1: 1 },
  total: 1,
};

const DETAIL: MemberDetail = {
  id: MEMBER_ID,
  nickname: '명재우',
  referralCode: 'RF00001',
  tier: 'vip',
  account: 'myungjw@naver.com',
  name: '명재우',
  phone: '010-1234-5678',
  country: '대한민국',
  address: '서울특별시 강남구 테헤란로 123',
  addressDetail: '4층 2호',
  birthday: '1990-05-11',
  socialLogin: '카카오',
  referrer: '',
  consents: [],
  joinedAtIso: '2025-03-02T10:11:00.000Z',
  lastLoginAtIso: '2026-07-14T08:30:00.000Z',
  loginCount: 12,
  lastLoginIp: '211.1.2.3',
  activity: { posts: 3, comments: 5, reviews: 2, inquiries: 1 },
  points: 1200,
  pointHistory: [
    { id: 'p1', date: '2026-07-10', reason: '이벤트 참여 보상', orderNo: null, amount: 500 },
  ],
  coupons: [],
  memo: 'VIP 승급 예정',
};

// 조회만 바꾼다 — 쓰기 계약·픽스처는 진짜를 그대로 쓴다(importOriginal). 이 테스트의 주제는
// '무엇이 그려지는가' 이지 픽스처의 내용이 아니다. (지연 없는 응답이라 표가 즉시 선다.)
const fetchMembers = vi.hoisted(() => vi.fn());
const fetchGroups = vi.hoisted(() => vi.fn());
const fetchMemberDetail = vi.hoisted(() => vi.fn());

vi.mock('./data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./data-source')>()),
  fetchMembers,
  fetchGroups,
  fetchMemberDetail,
}));

const { default: MembersPage } = await import('./MembersPage');
const { default: MemberDetailPage } = await import('./MemberDetailPage');

/** 활성 역할의 권한을 심는다 — 전 권한 ON 에서 시작해 지정한 액션만 끈다 */
function seedPermissions(off: readonly PermissionAction[]): void {
  let permissions = createMatrix(true);
  for (const action of off) {
    permissions = withResourceAction(permissions, `page:${LIST_ROUTE}`, action, false);
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

function newClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderList() {
  render(
    <QueryClientProvider client={newClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={[LIST_ROUTE]}>
          <Routes>
            <Route path={LIST_ROUTE} element={<MembersPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

function renderDetail() {
  render(
    <QueryClientProvider client={newClient()}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`${LIST_ROUTE}/${MEMBER_ID}`]}>
          <Routes>
            <Route path={`${LIST_ROUTE}/:id`} element={<MemberDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** 표가 실제로 섰는지 — 액션의 '부재' 를 단언하기 전에 화면이 비어 있지 않음을 먼저 못 박는다 */
async function waitForRow(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByText('myungjw@naver.com')).not.toBeNull();
  });
}

beforeEach(() => {
  fetchMembers.mockReset();
  fetchMembers.mockResolvedValue(LIST);
  fetchGroups.mockReset();
  fetchGroups.mockResolvedValue([{ id: 'g1', label: '일반' }]);
  fetchMemberDetail.mockReset();
  fetchMemberDetail.mockResolvedValue(DETAIL);
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

afterEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('MembersPage — 액션마다 다른 권한을 탄다 (EXC-03)', () => {
  it('export 권한이 없으면 내보내기 버튼이 존재하지 않는다 — 개인정보 반출 손잡이를 남기지 않는다', async () => {
    seedPermissions(['export']);
    renderList();
    await waitForRow();

    expect(screen.queryByRole('button', { name: /내보내기/ })).toBeNull();
    // 삭제·발송은 그대로다 — 액션이 서로 다른 권한을 탄다는 증거
    expect(screen.getByRole('button', { name: /회원 액션/ })).not.toBeNull();
  });

  it('remove·update 권한이 없으면 행 액션과 선택 체크박스가 모두 사라진다', async () => {
    seedPermissions(['remove', 'update']);
    renderList();
    await waitForRow();

    expect(screen.queryByRole('button', { name: /회원 액션/ })).toBeNull();
    // 고르고 나서 할 일이 없는 체크박스는 두지 않는다 (일괄 삭제·일괄 발송이 유일한 소비처다)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('remove 만 없으면 선택은 남는다 — 일괄 알림 발송이 아직 가능하기 때문이다', async () => {
    seedPermissions(['remove']);
    renderList();
    await waitForRow();

    expect(screen.queryAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('권한이 다 있으면 내보내기·행 액션·체크박스가 함께 보인다', async () => {
    seedPermissions([]);
    renderList();
    await waitForRow();

    expect(screen.getByRole('button', { name: /내보내기/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: /회원 액션/ })).not.toBeNull();
    expect(screen.queryAllByRole('checkbox').length).toBeGreaterThan(0);
  });
});

describe('MemberDetailPage — 읽기는 열리고 쓰기만 닫힌다 (EXC-03)', () => {
  it('쓰기 권한이 없으면 ⋯ 액션·비밀번호 변경·적립금 조정·메모 저장이 모두 사라진다', async () => {
    seedPermissions(['remove', 'update']);
    renderDetail();

    // 회원 정보 자체는 읽을 수 있다 — 막는 것은 그 위에 얹힌 액션뿐이다
    await waitFor(() => {
      expect(screen.getByText('RF00001')).not.toBeNull();
    });

    expect(screen.queryByRole('button', { name: /회원 액션/ })).toBeNull();
    expect(screen.queryByRole('button', { name: '비밀번호 변경' })).toBeNull();
    expect(screen.queryByRole('button', { name: '확인' })).toBeNull();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.queryByRole('button', { name: /내역 삭제/ })).toBeNull();
  });

  it('update 만 있으면 발송·비밀번호·적립금 조정은 되고 내역 삭제는 안 된다', async () => {
    seedPermissions(['remove']);
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('RF00001')).not.toBeNull();
    });

    expect(screen.getByRole('button', { name: '비밀번호 변경' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '확인' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '저장' })).not.toBeNull();
    // 적립금 내역 삭제는 remove 를 탄다 — update 로는 열리지 않는다
    expect(screen.queryByRole('button', { name: /내역 삭제/ })).toBeNull();
  });

  it('권한이 다 있으면 쓰기 액션이 전부 보인다', async () => {
    seedPermissions([]);
    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('RF00001')).not.toBeNull();
    });

    expect(screen.getByRole('button', { name: /회원 액션/ })).not.toBeNull();
    expect(screen.getByRole('button', { name: '비밀번호 변경' })).not.toBeNull();
    expect(screen.getByRole('button', { name: /내역 삭제/ })).not.toBeNull();
  });
});
