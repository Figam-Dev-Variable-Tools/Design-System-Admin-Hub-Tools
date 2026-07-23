// CertificatesListPage — 목록의 순서가 **저장되는 값**인지, 거부 사유가 말로 나오는지 (렌더)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 표 단위 테스트로는 부족한가]
// CertificatesTable 은 '이동 버튼을 누르면 새 순서로 onReorder 를 부른다' 까지만 안다. 이 화면에서
// 실제로 틀리기 쉬운 자리는 그 다음이다:
//   ① 그 순서가 캐시에 반영되는가 — 재정렬 뮤테이션이 목록과 **같은 쿼리 키**를 봐야 한다
//      (queries.ts 머리말: shared/crud 가 키를 export 하지 않아 같은 모양을 손으로 적는다).
//      키가 어긋나면 눌러도 행이 꿈쩍하지 않는다. 아래 '즉시 바뀐다' 가 그 순간을 잡는다.
//   ② 그 순서가 **다음 조회에서도 살아남는가** — 목록이 예전처럼 발급일 내림차순으로 정렬되면
//      옮긴 행이 제자리로 돌아가 조작이 없던 일이 된다. 새로 마운트해 다시 조회하며 확인한다.
//   ③ 못 바꾸는 상황에서 **왜 못 바꾸는지 말하는가** — 손잡이만 조용히 사라지면 안 된다.
//
// [픽스처는 진짜를 쓴다] data-source 를 갈아 끼우지 않는다 — 여기서 검증하려는 것이 바로
// '어댑터가 순서를 들고 있는가' 이기 때문이다. 대신 저장소가 모듈 싱글턴이라 테스트마다 순서가
// 누적되므로, 단언은 전부 **상대적**이다(지금 화면의 순서를 읽고 그 변화를 본다).
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { usePermissionStore } from '../../../shared/permissions/permission-store';
import { OPERATOR_ROLE_ID, VIEWER_ROLE_ID } from '../../../shared/permissions/roles';
import { ToastProvider } from '../../../shared/ui';
import CertificatesListPage from './CertificatesListPage';

/** 픽스처 3건의 명칭 — 화면에 그려진 순서를 이 이름들의 자리로 읽는다 */
const NAMES = [
  'ISO 9001 품질경영시스템 인증',
  '공간 배치 최적화 방법 특허',
  '기업부설연구소 인정서',
] as const;

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/company/certificates']}>
          <CertificatesListPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** 그 명칭이 몇 번째 본문 행에 있는가 (머리행 제외) */
function rowIndexOf(name: string): number {
  const rows = screen.getAllByRole('row').slice(1);
  return rows.findIndex((row) => within(row).queryByText(name) !== null);
}

/** 지금 화면에 그려진 순서 */
function currentOrder(): string[] {
  return [...NAMES].sort((a, b) => rowIndexOf(a) - rowIndexOf(b));
}

async function waitForRows() {
  await waitFor(() => {
    expect(screen.getByText(NAMES[0])).not.toBeNull();
  });
}

beforeEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

afterEach(() => {
  usePermissionStore.getState().activateRole(OPERATOR_ROLE_ID);
});

describe('CertificatesListPage — 이미지 열 제거 (운영자 지시 ①)', () => {
  it('목록에 이미지 열도, 썸네일도 없다 — 폼의 이미지 입력은 그대로다', async () => {
    renderPage();
    await waitForRows();

    expect(screen.queryByRole('columnheader', { name: '이미지' })).toBeNull();
    expect(screen.queryByRole('img', { name: /이미지$/ })).toBeNull();
    // 나머지 열은 남아 있다 — 표를 통째로 지워도 위 두 줄은 통과하기 때문이다
    expect(screen.getByRole('columnheader', { name: '명칭' })).not.toBeNull();
  });
});

describe('CertificatesListPage — 순서는 저장되는 값이다 (운영자 지시 ②)', () => {
  it('이동 버튼을 누르면 행 순서가 즉시 바뀐다 (낙관적 업데이트 · 같은 캐시 키)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    const before = currentOrder();
    const [first, second] = before;
    if (first === undefined || second === undefined) throw new Error('행이 2건 미만이다');

    await user.click(screen.getByRole('button', { name: `${first} 아래로 이동` }));

    await waitFor(() => {
      expect(currentOrder().slice(0, 2)).toEqual([second, first]);
    });
  });

  it('순서가 바뀐 사실을 라이브 영역이 말한다 (드래그·버튼 모두 시각적 사실만 남기므로)', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    const [first] = currentOrder();
    if (first === undefined) throw new Error('행이 없다');

    await user.click(screen.getByRole('button', { name: `${first} 아래로 이동` }));

    await waitFor(() => {
      const live = document.querySelectorAll('[aria-live="polite"]');
      const texts = [...live].map((node) => node.textContent ?? '');
      expect(texts.some((text) => text.includes(`'${first}'`) && text.includes('2번째로'))).toBe(
        true,
      );
    });
  });

  /**
   * 가장 쉽게 틀리는 자리 — **수동 순서 vs 발급일 내림차순**.
   * 옮긴 뒤 화면을 새로 띄워 다시 조회한다. 목록이 예전 규칙(발급일)으로 정렬되면 여기서 되돌아간다.
   */
  it('바꾼 순서가 다음 조회에서도 유지된다 — 발급일 정렬로 되돌아가지 않는다', async () => {
    const user = userEvent.setup();
    const firstMount = renderPage();
    await waitForRows();

    const before = currentOrder();
    const [first, second] = before;
    if (first === undefined || second === undefined) throw new Error('행이 2건 미만이다');

    await user.click(screen.getByRole('button', { name: `${first} 아래로 이동` }));
    // 저장이 끝나야 픽스처 저장소가 갱신된다
    await screen.findByText('정렬 순서를 변경했어요.');

    firstMount.unmount();
    renderPage();
    await waitForRows();

    expect(currentOrder().slice(0, 2)).toEqual([second, first]);
  });
});

describe('CertificatesListPage — 못 바꿀 때는 이유를 말한다 (boolean 으로 조용히 끄지 않는다)', () => {
  it('구분 필터를 걸면 이동 버튼이 사라지고 사유가 뜬다', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitForRows();

    expect(screen.queryAllByRole('button', { name: /이동/ }).length).toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText('구분 필터'), 'patent');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /이동/ })).toBeNull();
    });
    expect(screen.getByText(/필터를 전체로 되돌린 뒤 순서를 바꾸세요/)).not.toBeNull();
  });

  it('수정 권한이 없으면 사유가 권한을 말한다 — 버튼과 저장 거부가 같은 술어를 읽는다', async () => {
    usePermissionStore.getState().activateRole(VIEWER_ROLE_ID);
    renderPage();
    await waitForRows();

    expect(screen.queryByRole('button', { name: /이동/ })).toBeNull();
    expect(screen.getByText(/수정 권한이 없어 순서를 바꿀 수 없어요/)).not.toBeNull();
  });

  it('순서를 바꿀 수 있을 때는 어떻게 바꾸는지와 저장 시점을 알린다', async () => {
    renderPage();
    await waitForRows();

    expect(screen.getByText(/바꾸는 즉시 저장돼요/)).not.toBeNull();
  });
});
