// 리뷰 상세 — 쓰기 권한과 저장 규칙 (EXC-03)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 화면은 쓰기 권한을 **한 번도 묻지 않았다.** 조회 권한만 가진 사람이
//   · 노출/숨김을 뒤집고(고객 화면에서 리뷰가 사라진다)
//   · 고객에게 그대로 나가는 판매자 답변을 쓰고
//   · 리뷰를 삭제할 수 있었다(되돌릴 수 없다)
// 게다가 저장 규칙(zod 스키마)도 없어, 길이 제한은 `<textarea maxLength>` 하나뿐이었다 —
// 그것은 타이핑을 막는 편의이지 저장을 막는 규칙이 아니다.
//
// [왜 저장 규칙까지 여기서 보나] 권한과 검증은 **같은 저장 경로의 두 관문**이다. 권한만 고치고
// 규칙을 두지 않으면 '권한 있는 사람은 무엇이든 저장할 수 있다' 가 되어, 이 화면이 원래 갖고
// 있던 결함의 절반만 메운다. 스키마 자체의 단언은 아래 마지막 describe 에 있다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import { createWidgets } from '../../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { createMatrix, withResourceAction } from '../../../shared/permissions/resources';
import type { PermissionAction } from '../../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';
import ReviewDetailPage from './ReviewDetailPage';
import { REVIEW_REPLY_MAX } from './types';
import { reviewReplyError } from './validation';

const LIST_ROUTE = '/products/reviews';
const REVIEW_ID = 'rv-1';

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

function renderDetail() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[`${LIST_ROUTE}/${REVIEW_ID}`]}>
          <Routes>
            <Route path={`${LIST_ROUTE}/:id`} element={<ReviewDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** 상세가 실제로 왔는지 — '부재' 를 단언하기 전에 화면이 비어 있지 않음을 먼저 못 박는다 */
async function waitForDetail(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByText('루미엔 경량 패딩 점퍼')).not.toBeNull();
  });
}

afterEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('ReviewDetailPage — 읽기는 열리고 쓰기만 닫힌다 (EXC-03)', () => {
  it('update 권한이 없으면 노출 토글·답변 입력·저장이 모두 사라지고 이유가 남는다', async () => {
    seedPermissions(['update']);
    renderDetail();
    await waitForDetail();

    expect(screen.queryByRole('switch', { name: '리뷰 노출 여부' })).toBeNull();
    expect(screen.queryByLabelText('관리자 답변')).toBeNull();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    // 왜 못 하는지가 화면에 남는다 — 컨트롤만 조용히 사라지지 않는다
    expect(screen.getByText(/처리할 권한이 없어요/)).not.toBeNull();
    // 삭제는 다른 권한을 탄다 — update 만 끈 것이지 화면을 닫은 것이 아니다
    expect(screen.getByRole('button', { name: '리뷰 삭제' })).not.toBeNull();
  });

  it('remove 권한이 없으면 리뷰 삭제 버튼만 사라진다', async () => {
    seedPermissions(['remove']);
    renderDetail();
    await waitForDetail();

    expect(screen.queryByRole('button', { name: '리뷰 삭제' })).toBeNull();
    expect(screen.getByRole('switch', { name: '리뷰 노출 여부' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '저장' })).not.toBeNull();
  });

  /** 반대 방향 — 이게 없으면 '버튼을 아예 지웠다' 로도 위 단언들이 통과한다 */
  it('권한이 다 있으면 노출 토글·답변·저장·삭제가 함께 보인다', async () => {
    seedPermissions([]);
    renderDetail();
    await waitForDetail();

    expect(screen.getByRole('switch', { name: '리뷰 노출 여부' })).not.toBeNull();
    expect(screen.getByLabelText('관리자 답변')).not.toBeNull();
    expect(screen.getByRole('button', { name: '저장' })).not.toBeNull();
    expect(screen.getByRole('button', { name: '리뷰 삭제' })).not.toBeNull();
  });
});

/**
 * 저장 규칙의 정본은 스키마다 — 화면이 조건문으로 다시 판단하지 않는다(onSave 가 이 함수를 부른다).
 *
 * `<textarea maxLength>` 로는 이 사실을 지킬 수 없다: 붙여넣기·IME 조합·자동완성은 브라우저에
 * 따라 그 한도를 넘겨 들어오고, 그렇게 들어온 값은 예전엔 아무 검사 없이 저장 요청으로 나갔다.
 */
describe('reviewReplyError — 저장 규칙', () => {
  it('빈 답변은 통과한다 — 비우는 것이 곧 답변 내리기다', () => {
    expect(reviewReplyError('', true)).toBeNull();
  });

  it('한도를 넘긴 답변은 고칠 방법을 말하며 거절한다', () => {
    const tooLong = 'ㄱ'.repeat(REVIEW_REPLY_MAX + 1);

    const error = reviewReplyError(tooLong, true);

    expect(error).not.toBeNull();
    expect(error ?? '').toContain(String(REVIEW_REPLY_MAX));
  });

  it('한도와 같은 길이는 통과한다 — 경계에서 한 칸 어긋나지 않는다', () => {
    expect(reviewReplyError('ㄱ'.repeat(REVIEW_REPLY_MAX), false)).toBeNull();
  });
});
