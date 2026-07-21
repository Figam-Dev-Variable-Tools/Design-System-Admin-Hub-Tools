// 폼 라우트의 쓰기 권한 게이팅 (EXC-03) — apps/admin/src/shared/crud/**
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// `RequirePermission` 은 **read 만** 본다. 그래서 등록/수정 폼 라우트(/products/new ·
// /sales/contracts/:id/edit …)는 read 만 가진 역할에게도 **열리고 제출까지 됐다** —
// 목록의 등록 버튼은 옳게 숨겨 놓고, URL 을 직접 치면 그대로 걸어 들어갔다.
//
// [왜 껍데기를 태우나 — 화면 25개를 하나씩 태우지 않는 이유]
// 이 결함의 성질은 '화면마다 잊을 수 있다' 였다. 그래서 고침도 화면이 아니라 **껍데기**에 있다:
//   · FormPageShell     — isEdit 으로 등록/수정을 갈라 create/update 를 요구하고 403 을 그린다
//   · DocumentFormShell — 언제나 수정이므로 update 를 요구한다
//   · useCrudForm       — 껍데기를 쓰지 않는 폼(다중 구획 화면)까지 덮는 **저장 경로의 마지막 문**
// 셋을 여기서 함께 태우면, 새 폼이 추가돼도 이 세 지점 중 하나는 반드시 지난다.
//
// [왜 등록·수정을 따로 단언하나] `isEdit ? update : create` 는 한 줄이지만 뒤집혀도 화면은
// 멀쩡해 보인다 — create 만 가진 역할이 수정 폼을 열 수 있게 되는 식이다. 그래서 네 조합
// (등록×create / 수정×update / 등록×update / 수정×create)을 전부 고정한다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import * as z from 'zod/mini';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWidgets } from '../permissions/feature-registry';
import { usePermissionStore } from '../permissions/permission-store';
import { createMatrix, withResourceAction } from '../permissions/resources';
import type { PermissionAction } from '../permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../permissions/roles';
import { ToastProvider } from '../ui';
import type { CrudAdapter } from './crud';
import { DocumentFormShell } from './DocumentFormShell';
import { FormPageShell } from './FormPageShell';
import { useCrudForm } from './useCrudForm';

/** 실제로 존재하는 잎 — 폼 라우트의 리소스는 이 잎에서 파생된다 (route-resource.ts) */
const LIST_PATH = '/company/history';
const NEW_ROUTE = `${LIST_PATH}/new`;
const EDIT_ROUTE = `${LIST_PATH}/9/edit`;

/** 활성 역할의 권한을 심는다 — 전 권한 ON 에서 시작해 지정한 액션만 끈다 (LogListShell.test 와 같은 방식) */
function seedPermissions(off: readonly PermissionAction[]): void {
  let permissions = createMatrix(true);
  for (const action of off) {
    permissions = withResourceAction(permissions, `page:${LIST_PATH}`, action, false);
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

function renderAt(path: string, routePath: string, node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={node} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/* ── FormPageShell — 등록/수정을 isEdit 으로 가른다 ─────────────────────────── */

function renderFormShell(isEdit: boolean) {
  const node = (
    <FormPageShell
      entityLabel="연혁"
      cardTitle="연혁 정보"
      description="별표(*) 항목은 필수입니다."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={false}
      loadFailure={null}
      serverError={null}
      saving={false}
      isDirty={false}
      unsavedMessage="저장하지 않은 변경 사항이 있습니다."
      onSubmit={(event) => event.preventDefault()}
    >
      <input aria-label="내용" />
    </FormPageShell>
  );

  if (isEdit) {
    renderAt(EDIT_ROUTE, `${LIST_PATH}/:id/edit`, node);
    return;
  }
  renderAt(NEW_ROUTE, `${LIST_PATH}/new`, node);
}

/** 403 이 그려졌는가 — 폼(제출 버튼·입력)은 하나도 남지 않아야 한다 */
function expectForbidden(): void {
  expect(screen.getByText('접근 권한이 없습니다')).not.toBeNull();
  expect(screen.queryByRole('button', { name: '등록' })).toBeNull();
  expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
  expect(screen.queryByLabelText('내용')).toBeNull();
}

/** 스토어는 모듈 싱글턴이라 테스트 사이에 역할이 새지 않게 매번 되돌린다 */
beforeEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

afterEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
  vi.restoreAllMocks();
});

describe('FormPageShell — 등록은 create, 수정은 update (EXC-03)', () => {
  it('등록 폼: create 권한이 없으면 403 을 그린다 — URL 을 직접 쳐도 폼이 열리지 않는다', () => {
    seedPermissions(['create']);
    renderFormShell(false);

    expectForbidden();
  });

  it('수정 폼: update 권한이 없으면 403 을 그린다', () => {
    seedPermissions(['update']);
    renderFormShell(true);

    expectForbidden();
  });

  it('등록 폼은 update 권한을 묻지 않는다 — create 만 있으면 열린다', () => {
    seedPermissions(['update']);
    renderFormShell(false);

    expect(screen.getByRole('button', { name: '등록' })).not.toBeNull();
  });

  it('수정 폼은 create 권한을 묻지 않는다 — update 만 있으면 열린다', () => {
    seedPermissions(['create']);
    renderFormShell(true);

    expect(screen.getByRole('button', { name: '저장' })).not.toBeNull();
  });

  it('권한이 다 있으면 등록·수정 둘 다 폼을 그린다', () => {
    seedPermissions([]);
    renderFormShell(false);

    expect(screen.getByRole('button', { name: '등록' })).not.toBeNull();
    expect(screen.getByLabelText('내용')).not.toBeNull();
  });
});

/* ── DocumentFormShell — 언제나 '수정' 이다 ────────────────────────────────── */

function renderDocumentShell() {
  renderAt(
    LIST_PATH,
    LIST_PATH,
    <DocumentFormShell
      cardTitle="회사 정보"
      description="필수 항목을 채우고 저장하세요."
      loading={false}
      loadFailed={false}
      onRetry={() => undefined}
      serverError={null}
      saving={false}
      dirty
      unsavedMessage="저장하지 않은 변경 사항이 있습니다."
      onSubmit={(event) => event.preventDefault()}
    >
      <input aria-label="회사명" />
    </DocumentFormShell>,
  );
}

describe('DocumentFormShell — 단일 문서 편집은 update 를 요구한다 (EXC-03)', () => {
  it('update 권한이 없으면 403 을 그린다 — 고칠 수 없는 입력을 남겨 두지 않는다', () => {
    seedPermissions(['update']);
    renderDocumentShell();

    expect(screen.getByText('접근 권한이 없습니다')).not.toBeNull();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.queryByLabelText('회사명')).toBeNull();
  });

  it('update 권한이 있으면 폼을 그린다', () => {
    seedPermissions([]);
    renderDocumentShell();

    expect(screen.getByRole('button', { name: '저장' })).not.toBeNull();
  });
});

/* ── useCrudForm — 껍데기를 쓰지 않는 폼까지 덮는 마지막 문 ────────────────── */

interface Row {
  readonly id: string;
  readonly title: string;
}

const schema = z.object({ title: z.string() });
type Values = z.infer<typeof schema>;

/**
 * 껍데기 없이 손으로 조립한 폼 — 상품·프로그램처럼 구획이 여럿인 화면의 축소판이다.
 * 이런 화면은 FormPageShell 의 403 을 받지 못하므로, 막는 일은 useCrudForm 의 submit 이 한다.
 */
function BareForm({ adapter }: { readonly adapter: CrudAdapter<Row, Values> }) {
  const { submit, serverError } = useCrudForm<Row, Values, Values>({
    resource: 'form-permission-test',
    adapter,
    entityLabel: '연혁',
    listPath: LIST_PATH,
    schema,
    empty: { title: '' },
    toInput: (values) => values,
    toValues: (item) => ({ title: item.title }),
  });

  return (
    <form onSubmit={submit} noValidate>
      {serverError !== null && <p role="alert">{serverError}</p>}
      <button type="submit">등록</button>
    </form>
  );
}

function adapterWith(create: CrudAdapter<Row, Values>['create']): CrudAdapter<Row, Values> {
  return {
    fetchAll: () => Promise.resolve([]),
    fetchOne: () => Promise.resolve({ id: '9', title: '기존' }),
    create,
    update: () => Promise.resolve(),
    remove: () => Promise.resolve(),
  };
}

describe('useCrudForm — 권한 없는 제출은 요청이 되지 않는다 (EXC-03)', () => {
  it('create 권한이 없으면 어댑터를 부르지 않고 이유를 남긴다', async () => {
    seedPermissions(['create']);
    const create = vi.fn(() => Promise.resolve());
    renderAt(NEW_ROUTE, `${LIST_PATH}/new`, <BareForm adapter={adapterWith(create)} />);

    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    // 조용히 삼키지 않는다 — 왜 저장되지 않았는지 폼 안에 남는다
    expect(await screen.findByRole('alert')).not.toBeNull();
    expect(screen.getByRole('alert').textContent).toContain('등록할 권한이 없습니다');
    expect(create).not.toHaveBeenCalled();
  });

  it('create 권한이 있으면 평소대로 저장된다 — 게이팅이 정상 경로를 막지 않는다', async () => {
    seedPermissions([]);
    const create = vi.fn(() => Promise.resolve());
    renderAt(NEW_ROUTE, `${LIST_PATH}/new`, <BareForm adapter={adapterWith(create)} />);

    fireEvent.click(screen.getByRole('button', { name: '등록' }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledTimes(1);
    });
  });
});
