// BannersTable — 재정렬·ON/OFF 토글 동작 단언 (A41)
//
// 드래그는 마우스 전용이라 jsdom 재현이 불안정하다 — 키보드 대안(위/아래 버튼)과 토글이 검증 대상이다.
// FAQ 와 같은 공통 재정렬 모듈(shared/ui/tableReorder)을 쓰므로 배너에서도 동일 동작을 확인한다.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BannersTable } from './BannersTable';
import type { Banner } from '../types';

function bannerOf(overrides: Partial<Banner> & { id: string; title: string }): Banner {
  return {
    imageUrl: 'https://cdn.example.com/b.png',
    linkUrl: '',
    placement: 'main',
    startAt: '2026-05-01',
    endAt: '2026-05-31',
    enabled: true,
    order: 1,
    ...overrides,
  };
}

const BANNERS: readonly Banner[] = [
  bannerOf({ id: 'a', title: '첫 배너', order: 1, enabled: true }),
  bannerOf({ id: 'b', title: '둘째 배너', order: 2, enabled: false }),
  bannerOf({ id: 'c', title: '셋째 배너', order: 3, enabled: true }),
];

function renderTable(overrides: Partial<Parameters<typeof BannersTable>[0]> = {}) {
  const onReorder = vi.fn();
  const onToggleEnabled = vi.fn();
  render(
    <BannersTable
      banners={BANNERS}
      loading={false}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      deletingId={null}
      selectedIds={new Set()}
      onToggleOne={vi.fn()}
      onToggleAll={vi.fn()}
      startIndex={0}
      onToggleEnabled={onToggleEnabled}
      togglingIds={new Set()}
      reorderable
      onReorder={onReorder}
      reordering={false}
      {...overrides}
    />,
  );
  return { onReorder, onToggleEnabled };
}

describe('BannersTable — 재정렬·토글', () => {
  it('아래로 이동 버튼은 그 행을 한 칸 아래 순서로 onReorder 한다', async () => {
    const user = userEvent.setup();
    const { onReorder } = renderTable();
    await user.click(screen.getByRole('button', { name: '첫 배너 아래로 이동' }));
    expect(onReorder).toHaveBeenCalledWith(['b', 'a', 'c']);
  });

  it('재정렬 불가(필터/검색) 화면에서는 이동 버튼이 없다', () => {
    renderTable({ reorderable: false });
    expect(screen.queryByRole('button', { name: /이동/ })).toBeNull();
  });

  it('상태 토글은 반대 상태로 onToggleEnabled 를 부른다', async () => {
    const user = userEvent.setup();
    const { onToggleEnabled } = renderTable();
    await user.click(screen.getByRole('switch', { name: '첫 배너 노출 여부' }));
    expect(onToggleEnabled).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }), false);
  });
});
