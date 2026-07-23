// 콘텐츠 관리 6종의 쓰기 게이팅 — 목록·상세·폼 (EXC-03)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나 — 이 일가가 가장 크고 가장 무방비였다]
// `content/**`(공지·FAQ·배너·팝업·약관·처리방침)의 목록은 CrudListShell 보다 먼저 손으로 만들어졌다.
// 그래서 껍데기가 대신 해 주던 게이팅을 **하나도** 받지 못했다:
//   · 등록 CTA · 행 삭제(휴지통) · 일괄 삭제 바 · 선택 체크박스
//   · 인라인 노출/ON-OFF 스위치 — 조회 권한만으로 눌리고 저장까지 됐다
//   · 폼 라우트(/new · /:id/edit) — RequirePermission 은 read 만 보므로 URL 을 직접 치면 들어갔다
//
// [기본 세션이 전권이라 헛돌기 가장 쉬운 축이다]
// 그래서 매번 활성 역할의 매트릭스를 직접 심고(seedPermissions), **반대 방향**(권한이 있으면
// 보인다 · 저장이 나간다)을 같은 파일에서 함께 단언한다.
//
// [바깥 가드를 걷어내고 저장 경로를 확인한다 — 이 파일의 핵심]
// 컨트롤을 없애면 그 저장 경로는 화면에서 닿을 수 없어진다. 그 상태로 '뮤테이션이 안 나간다' 를
// 단언하면 **바깥 가드가 막아서 통과하는** 헛도는 검사가 된다. 그래서 표 컴포넌트를 스텁으로
// 갈아끼워 **컨트롤이 살아 있는 상태**(= 바깥 가드를 되돌린 상태)를 만들고, 그때도 저장이
// 거절되는지를 본다. 다른 탭에서 방금 강등된 세션의 잔여 클릭이 정확히 이 모양이다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';

import { createWidgets } from '../../shared/permissions/feature-registry';
import { usePermissionStore } from '../../shared/permissions/permission-store';
import { createMatrix, withResourceAction } from '../../shared/permissions/resources';
import type { PermissionAction } from '../../shared/permissions/resources';
import { OPERATOR_ROLE_ID, ROLE_STATE_VERSION } from '../../shared/permissions/roles';
import { ToastProvider } from '../../shared/ui';
import type { NoticeSummary } from './notices/types';
import type { FaqSummary } from './faq/types';

/* ── 표 스텁 ────────────────────────────────────────────────────────────────
   화면이 표에 넘기는 콜백을 **권한과 무관하게** 눌러 볼 수 있는 버튼으로 바꾼다.
   이것이 곧 '바깥 가드를 되돌린 상태' 다 — 진짜 표는 canRemove/canUpdate 로 그 버튼을 지운다. */

const noticeRow: NoticeSummary = {
  id: 'n1',
  title: '첫 공지',
  category: 'notice',
  status: 'published',
  pinned: false,
  author: '콘텐츠 운영팀',
  publishedAtIso: '2026-01-01T09:00:00.000Z',
  views: 10,
};

vi.mock('./notices/components/NoticesTable', () => ({
  NoticesTable: ({ onDelete }: { readonly onDelete: (notice: NoticeSummary) => void }) => (
    <button
      type="button"
      onClick={() => {
        onDelete(noticeRow);
      }}
    >
      스텁 행 삭제
    </button>
  ),
}));

vi.mock('./faq/components/FaqTable', () => ({
  FaqTable: ({
    faqs,
    onToggleVisible,
  }: {
    readonly faqs: readonly FaqSummary[];
    readonly onToggleVisible: (faq: FaqSummary, next: boolean) => void;
  }) => (
    <button
      type="button"
      disabled={faqs[0] === undefined}
      onClick={() => {
        const first = faqs[0];
        if (first !== undefined) onToggleVisible(first, !first.visible);
      }}
    >
      스텁 노출 토글
    </button>
  ),
}));

/* ── 데이터 소스 — 쓰기 함수만 감시한다(조회는 진짜 픽스처 그대로) ─────────── */

const deleteNotice = vi.hoisted(() => vi.fn());
vi.mock('./notices/data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./notices/data-source')>()),
  deleteNotice,
}));

const setFaqVisibility = vi.hoisted(() => vi.fn());
vi.mock('./faq/data-source', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./faq/data-source')>()),
  setFaqVisibility,
}));

const { default: NoticesPage } = await import('./notices/NoticesPage');
const { default: NoticeDetailPage } = await import('./notices/NoticeDetailPage');
const { default: NoticeFormPage } = await import('./notices/NoticeFormPage');
const { default: FaqPage } = await import('./faq/FaqPage');
const { default: BannersPage } = await import('./banners/BannersPage');
const { default: PopupsPage } = await import('./popups/PopupsPage');
const { default: TermsPage } = await import('./terms/TermsPage');
const { default: PrivacyPage } = await import('./privacy/PrivacyPage');

/** 활성 역할의 권한 — 전 권한 ON 에서 시작해 **그 라우트의** 지정한 액션만 끈다 */
function seedPermissions(route: string, off: readonly PermissionAction[]): void {
  let permissions = createMatrix(true);
  for (const action of off) {
    permissions = withResourceAction(permissions, `page:${route}`, action, false);
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

function renderAt(path: string, routePath: string, element: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={routePath} element={element} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  deleteNotice.mockReset();
  deleteNotice.mockResolvedValue(undefined);
  setFaqVisibility.mockReset();
  setFaqVisibility.mockResolvedValue(undefined);
});

afterEach(() => {
  // 스토어는 모듈 싱글턴이라 다음 파일로 역할이 새지 않게 되돌린다
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

/* ── 목록: 등록 CTA · 일괄 삭제 바 ────────────────────────────────────────── */

interface ListCase {
  readonly label: string;
  readonly route: string;
  readonly element: ReactNode;
  /** 등록 CTA 의 접근성 이름 */
  readonly createLabel: RegExp;
}

const LIST_CASES: readonly ListCase[] = [
  {
    label: '공지사항',
    route: '/content/notices',
    element: <NoticesPage />,
    createLabel: /공지 등록/,
  },
  { label: 'FAQ', route: '/content/faq', element: <FaqPage />, createLabel: /FAQ 등록/ },
  {
    label: '배너',
    route: '/content/banners',
    element: <BannersPage />,
    createLabel: /배너 등록/,
  },
  {
    label: '팝업',
    route: '/content/popups',
    element: <PopupsPage />,
    createLabel: /팝업 등록/,
  },
  { label: '약관', route: '/content/terms', element: <TermsPage />, createLabel: /새 버전 등록/ },
  {
    label: '처리방침',
    route: '/content/privacy',
    element: <PrivacyPage />,
    createLabel: /새 버전 등록/,
  },
];

describe('콘텐츠 목록 6종 — 등록 CTA 는 create 를 탄다 (EXC-03)', () => {
  it.each(LIST_CASES)('$label — create 가 없으면 등록 버튼이 존재하지 않는다', async (item) => {
    seedPermissions(item.route, ['create']);
    renderAt(item.route, item.route, item.element);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: item.createLabel })).toBeNull();
    });
  });

  /** 반대 방향 — 이게 없으면 '버튼을 아예 지웠다' 로도 위 단언이 통과한다 */
  it.each(LIST_CASES)('$label — create 가 있으면 등록 버튼이 보인다', async (item) => {
    seedPermissions(item.route, []);
    renderAt(item.route, item.route, item.element);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: item.createLabel })).not.toBeNull();
    });
  });
});

/* ── 목록: 저장 경로 (바깥 가드를 스텁으로 되돌린 상태에서 확인한다) ───────── */

describe('공지 목록 — 삭제는 remove 를 탄다 (버튼과 저장이 같은 술어다)', () => {
  it('remove 가 없으면 확인을 눌러도 삭제 요청이 나가지 않고 사유가 남는다', async () => {
    seedPermissions('/content/notices', ['remove']);
    renderAt('/content/notices', '/content/notices', <NoticesPage />);

    // 스텁 표가 행 삭제를 열어 준다 — 진짜 표라면 이 버튼이 canRemove=false 로 없다
    fireEvent.click(await screen.findByRole('button', { name: '스텁 행 삭제' }));
    fireEvent.click(await screen.findByRole('button', { name: '공지 삭제' }));

    await waitFor(() => {
      expect(screen.getByText(/삭제 권한이 없어요/)).not.toBeNull();
    });
    expect(deleteNotice).not.toHaveBeenCalled();
  });

  it('remove 가 있으면 같은 클릭이 삭제 요청으로 나간다 — 반대 방향', async () => {
    seedPermissions('/content/notices', []);
    renderAt('/content/notices', '/content/notices', <NoticesPage />);

    fireEvent.click(await screen.findByRole('button', { name: '스텁 행 삭제' }));
    fireEvent.click(await screen.findByRole('button', { name: '공지 삭제' }));

    await waitFor(() => {
      expect(deleteNotice).toHaveBeenCalled();
    });
  });
});

describe('FAQ 목록 — 인라인 노출 토글은 update 를 탄다', () => {
  it('update 가 없으면 토글이 저장 요청을 내지 않고 사유를 말한다', async () => {
    seedPermissions('/content/faq', ['update']);
    renderAt('/content/faq', '/content/faq', <FaqPage />);

    const toggle = await screen.findByRole('button', { name: '스텁 노출 토글' });
    await waitFor(() => {
      expect((toggle as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(screen.getByText(/수정 권한이 없어요/)).not.toBeNull();
    });
    expect(setFaqVisibility).not.toHaveBeenCalled();
  });

  it('update 가 있으면 같은 토글이 저장 요청으로 나간다 — 반대 방향', async () => {
    seedPermissions('/content/faq', []);
    renderAt('/content/faq', '/content/faq', <FaqPage />);

    const toggle = await screen.findByRole('button', { name: '스텁 노출 토글' });
    await waitFor(() => {
      expect((toggle as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.click(toggle);

    await waitFor(() => {
      expect(setFaqVisibility).toHaveBeenCalled();
    });
  });
});

/* ── 상세 · 폼 ──────────────────────────────────────────────────────────── */

describe('공지 상세 — 수정은 update, 삭제는 remove 를 탄다', () => {
  it('update·remove 가 없으면 두 버튼이 모두 사라진다 (본문은 남는다)', async () => {
    seedPermissions('/content/notices', ['update', 'remove']);
    renderAt('/content/notices/NT-001', '/content/notices/:id', <NoticeDetailPage />);

    // 읽기는 그대로 열린다 — 막는 것은 그 위에 얹힌 액션뿐이다
    await waitFor(() => {
      expect(screen.getByText('분류')).not.toBeNull();
    });
    expect(screen.queryByRole('button', { name: '수정' })).toBeNull();
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
  });

  it('remove 만 없으면 수정은 남는다 — 두 액션이 다른 권한을 탄다는 증거', async () => {
    seedPermissions('/content/notices', ['remove']);
    renderAt('/content/notices/NT-001', '/content/notices/:id', <NoticeDetailPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '수정' })).not.toBeNull();
    });
    expect(screen.queryByRole('button', { name: '삭제' })).toBeNull();
  });
});

describe('공지 폼 — 등록 라우트는 create 를 탄다 (딥링크가 들어가던 자리)', () => {
  it('create 가 없으면 폼 대신 403 이 선다', async () => {
    seedPermissions('/content/notices', ['create']);
    renderAt('/content/notices/new', '/content/notices/new', <NoticeFormPage />);

    await waitFor(() => {
      expect(screen.queryByRole('textbox', { name: /제목/ })).toBeNull();
    });
    // 403 화면은 제목과 설명 두 줄로 사유를 말한다
    expect(screen.getAllByText(/권한이 없어요/).length).toBeGreaterThan(0);
  });

  it('create 가 있으면 폼이 열린다 — 위 단언이 헛돌지 않는다', async () => {
    seedPermissions('/content/notices', []);
    renderAt('/content/notices/new', '/content/notices/new', <NoticeFormPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /등록/ })).not.toBeNull();
    });
  });
});
