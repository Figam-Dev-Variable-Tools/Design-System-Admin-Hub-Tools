// CertificatesTable — 표 구성(이미지 열 제거)과 재정렬 UI 의 렌더 단언
//
// 드래그는 마우스 전용이라 jsdom 에서 재현이 불안정하다 — **키보드 대안(위/아래 버튼)이 접근성
// 경로이자 검증 대상**이다(FaqTable.test.tsx 와 같은 판단). 드래그 쪽은 <tr> 이 draggable 인지와
// 손잡이 열의 존재로 고정한다.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CertificatesTable } from './CertificatesTable';
import type { CertItem } from './types';

const ITEMS: readonly CertItem[] = [
  {
    id: 'a',
    name: '가족친화 인증',
    issuer: '예시가족진흥원',
    issuedOn: '2020-11-30',
    kind: 'certificate',
    imageUrl: '/fixtures/placeholder-image.svg',
    order: 1,
  },
  {
    id: 'b',
    name: '공간 배치 최적화 방법 특허',
    issuer: '특허청(예시)',
    issuedOn: '2022-09-01',
    kind: 'patent',
    imageUrl: '/fixtures/placeholder-image.svg',
    order: 2,
  },
  {
    id: 'c',
    name: '기업부설연구소 인정서',
    issuer: '예시산업진흥원',
    issuedOn: '2021-06-20',
    kind: 'certificate',
    imageUrl: '/fixtures/placeholder-image.svg',
    order: 3,
  },
];

function renderTable(overrides: Partial<Parameters<typeof CertificatesTable>[0]> = {}) {
  const onReorder = vi.fn();
  render(
    <CertificatesTable
      items={ITEMS}
      loading={false}
      entityLabel="인증서/특허"
      canUpdate
      canRemove
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      deletingId={null}
      reorderable
      onReorder={onReorder}
      reordering={false}
      selectedIds={new Set()}
      onToggleOne={vi.fn()}
      onToggleAll={vi.fn()}
      hasActiveFilters={false}
      onResetFilters={vi.fn()}
      {...overrides}
    />,
  );
  return { onReorder };
}

describe('CertificatesTable — 이미지 열 제거 (운영자 지시 ①)', () => {
  it('머리행에 이미지 열이 없다', () => {
    renderTable();
    expect(screen.queryByRole('columnheader', { name: '이미지' })).toBeNull();
  });

  it('행에 썸네일 <img> 가 없다 — 셀 자체가 사라졌다', () => {
    renderTable();
    expect(screen.queryByRole('img', { name: /이미지$/ })).toBeNull();
  });

  /** 지운 열 말고 나머지는 그대로여야 한다 — '이미지가 없다' 만 지키면 표를 통째로 지워도 통과한다 */
  it('명칭·발급기관·발급일·구분 열은 남아 있다', () => {
    renderTable();
    for (const header of ['명칭', '발급기관', '발급일', '구분']) {
      expect(screen.getByRole('columnheader', { name: header })).not.toBeNull();
    }
  });

  /** 캡션이 열 구성을 서술한다 — 없는 열을 읽어 주면 표에 없는 칸을 찾게 된다 */
  it('캡션이 실제 열 구성을 말하고 이미지를 말하지 않는다', () => {
    renderTable();
    const caption = screen.getByText(/열로 이루어져 있어요/);
    expect(caption.textContent).toContain('명칭 · 발급기관 · 발급일 · 구분');
    expect(caption.textContent).not.toContain('이미지');
  });
});

describe('CertificatesTable — 재정렬 (운영자 지시 ②)', () => {
  it('아래로 이동 버튼은 그 행을 한 칸 아래 순서로, 움직인 id 와 함께 onReorder 한다', async () => {
    const user = userEvent.setup();
    const { onReorder } = renderTable();
    await user.click(screen.getByRole('button', { name: '가족친화 인증 아래로 이동' }));
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c'], 'a');
  });

  it('위로 이동 버튼은 그 행을 한 칸 위 순서로 onReorder 한다', async () => {
    const user = userEvent.setup();
    const { onReorder } = renderTable();
    await user.click(screen.getByRole('button', { name: '기업부설연구소 인정서 위로 이동' }));
    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b'], 'c');
  });

  it('첫 행의 위로·마지막 행의 아래로는 잠긴다', () => {
    renderTable();
    expect(
      (screen.getByRole('button', { name: '가족친화 인증 위로 이동' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole('button', {
          name: '기업부설연구소 인정서 아래로 이동',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it('저장 중에는 이동 버튼이 전부 잠기고 행 드래그도 꺼진다', () => {
    renderTable({ reordering: true });
    expect(
      (
        screen.getByRole('button', {
          name: '공간 배치 최적화 방법 특허 아래로 이동',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]?.getAttribute('draggable')).toBe('false');
  });

  it('재정렬 가능하면 행이 드래그 가능하고 손잡이 열이 선다', () => {
    renderTable();
    expect(screen.getByText('정렬 손잡이')).not.toBeNull();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]?.getAttribute('draggable')).toBe('true');
  });

  it('재정렬 불가면 이동 버튼·손잡이 열·드래그가 함께 사라진다', () => {
    renderTable({ reorderable: false });
    expect(screen.queryByRole('button', { name: /이동/ })).toBeNull();
    expect(screen.queryByText('정렬 손잡이')).toBeNull();
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0]?.getAttribute('draggable')).toBeNull();
  });

  it('재정렬 불가면 캡션도 드래그를 안내하지 않는다', () => {
    renderTable({ reorderable: false });
    expect(screen.getByText(/열로 이루어져 있어요/).textContent).not.toContain('드래그');
  });

  /** 순번 열은 화면상 위치이자 저장되는 순서다 — 이 표에서는 둘이 같아야 한다 */
  it('순번은 화면 순서 그대로 1,2,3 이다', () => {
    renderTable();
    const rows = screen.getAllByRole('row').slice(1);
    const firstRow = rows[0];
    if (firstRow === undefined) throw new Error('본문 행이 없다');
    expect(within(firstRow).getByText('1')).not.toBeNull();
  });
});

describe('CertificatesTable — 권한 (EXC-03)', () => {
  it('수정 권한이 없으면 연필이 없다', () => {
    renderTable({ canUpdate: false, reorderable: false });
    expect(screen.queryByRole('button', { name: /수정/ })).toBeNull();
  });

  it('삭제 권한이 없으면 휴지통과 선택 체크박스가 함께 사라진다', () => {
    renderTable({ canRemove: false });
    expect(screen.queryByRole('button', { name: /삭제/ })).toBeNull();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
