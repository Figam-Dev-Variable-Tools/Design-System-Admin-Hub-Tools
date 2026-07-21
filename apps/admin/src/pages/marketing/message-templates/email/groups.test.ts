// 블록 묶음과 블록 이동의 계약
//
// [묶음은 데이터라 '깨진다' 는 느낌이 없다] 그래도 깨지는 방식이 있다: 칸 개수와 채운 내용이
// 어긋나 한 칸이 빈 채로 들어가거나, id 가 겹쳐 캔버스의 선택이 두 블록을 동시에 가리키거나,
// 묶음이 발송 HTML 에서 무너지거나. 전부 타입이 잡아 주지 못한다.
//
// [이동은 반대다] 로직이라 깨지면 눈에 띄지만, **칸 안의 블록**을 옮길 때만 조용히 틀린다 —
// 최상위 배열에서 못 찾고 아무 일도 안 하는 것이 가장 흔한 실패다.
import { describe, expect, it } from 'vitest';
import { moveArrayItem } from '@tds/ui';

import {
  blockPositionOf,
  createBlock,
  createLeafBlock,
  DEFAULT_CANVAS,
  insertBlocksAfter,
  moveBlock,
} from './blocks';
import { EMAIL_BLOCK_GROUPS, findBlockGroup, isBlockGroupId } from './groups';
import { flattenBlocks } from './preflight';
import { renderBlocksToHtml } from '../render-html';
import type { EmailBlock } from '../types';

/** 테스트용 id 발급기 — 빌더의 것과 같은 모양이되 테스트마다 0 에서 시작한다 */
function idFactory(): () => string {
  let seq = 0;
  return () => {
    seq += 1;
    return `block-${String(seq)}`;
  };
}

describe('EMAIL_BLOCK_GROUPS', () => {
  it('묶음마다 id·이름·설명이 서로 다르다 — 같으면 피커에서 고를 수 없다', () => {
    const ids = EMAIL_BLOCK_GROUPS.map((group) => group.id);
    const labels = EMAIL_BLOCK_GROUPS.map((group) => group.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
    expect(EMAIL_BLOCK_GROUPS.every((group) => group.description.trim() !== '')).toBe(true);
  });

  it('블록 id 가 묶음 안에서 겹치지 않는다 — 겹치면 선택이 두 블록을 동시에 가리킨다', () => {
    for (const group of EMAIL_BLOCK_GROUPS) {
      const ids = flattenBlocks(group.build(idFactory())).map((block) => block.id);
      expect(new Set(ids).size, `${group.id} 의 블록 id 가 겹친다`).toBe(ids.length);
    }
  });

  it('모든 칸이 채워진다 — 비율이 정한 칸 수와 채운 수가 어긋나면 빈 칸이 남는다', () => {
    for (const group of EMAIL_BLOCK_GROUPS) {
      for (const block of group.build(idFactory())) {
        if (block.blockKind !== 'columns') continue;
        expect(
          block.columns.every((column) => column.blocks.length > 0),
          `${group.id} 에 빈 칸이 있다`,
        ).toBe(true);
      }
    }
  });

  it('발송 HTML 로 무너지지 않고 나간다', () => {
    for (const group of EMAIL_BLOCK_GROUPS) {
      const html = renderBlocksToHtml(group.build(idFactory()), DEFAULT_CANVAS);
      expect(html, `${group.id} 가 빈 HTML 을 냈다`).not.toBe('');
      // 다단은 Outlook 유령 표 없이는 세로로 쌓인다 — 묶음의 핵심이 나란함이므로 반드시 있어야 한다
      expect(html).toContain('<!--[if mso]>');
    }
  });

  it('상품 카드의 이미지는 파일이 빈 채로 들어온다 — 운영자가 자기 사진을 넣어야 한다', () => {
    const grid = findBlockGroup('product-grid');
    expect(grid).toBeDefined();
    const images = flattenBlocks(grid?.build(idFactory()) ?? []).filter(
      (block) => block.blockKind === 'image',
    );
    expect(images.length).toBeGreaterThan(0);
    // 대체 텍스트는 반대로 채워 둔다(groups.ts cardImage 머리말)
    expect(images.every((block) => block.blockKind === 'image' && block.fileName === '')).toBe(
      true,
    );
    expect(images.every((block) => block.blockKind === 'image' && block.alt !== '')).toBe(true);
  });

  it('isBlockGroupId 는 목록에 있는 id 만 통과시킨다', () => {
    expect(isBlockGroupId('product-grid')).toBe(true);
    expect(isBlockGroupId('없는-묶음')).toBe(false);
  });
});

describe('insertBlocksAfter', () => {
  it('묶음이 넣은 순서 그대로 쌓인다 — 뒤집히지 않는다', () => {
    const nextId = idFactory();
    const first = createLeafBlock('heading', nextId());
    const a = createLeafBlock('text', nextId());
    const b = createLeafBlock('divider', nextId());
    const result = insertBlocksAfter([first], first.id, [a, b]);
    expect(result.map((block) => block.id)).toEqual([first.id, a.id, b.id]);
  });

  it('afterId 가 null 이면 맨 뒤에 붙는다', () => {
    const nextId = idFactory();
    const first = createLeafBlock('heading', nextId());
    const a = createLeafBlock('text', nextId());
    expect(insertBlocksAfter([first], null, [a]).map((block) => block.id)).toEqual([
      first.id,
      a.id,
    ]);
  });

  it('빈 묶음은 원본을 그대로 돌려준다', () => {
    const first = createLeafBlock('heading', 'block-1');
    expect(insertBlocksAfter([first], null, [])).toEqual([first]);
  });
});

describe('moveBlock', () => {
  function stack(): readonly EmailBlock[] {
    const nextId = idFactory();
    return [
      createLeafBlock('heading', nextId()),
      createLeafBlock('text', nextId()),
      createLeafBlock('button', nextId()),
    ];
  }

  it('최상위 블록을 위로 옮긴다', () => {
    const blocks = stack();
    const target = blocks[2];
    expect(target).toBeDefined();
    const moved = moveBlock(blocks, target?.id ?? '', -1, moveArrayItem);
    expect(moved.map((block) => block.id)).toEqual(['block-1', 'block-3', 'block-2']);
  });

  it('첫 줄에서 위로는 아무 일도 일어나지 않는다 — 경계 처리는 DS 의 moveArrayItem 것이다', () => {
    const blocks = stack();
    const moved = moveBlock(blocks, 'block-1', -1, moveArrayItem);
    expect(moved.map((block) => block.id)).toEqual(['block-1', 'block-2', 'block-3']);
  });

  it('칸 **안**의 블록도 그 칸 안에서 움직인다', () => {
    const nextId = idFactory();
    const columns = createBlock('columns', nextId());
    if (columns.blockKind !== 'columns') throw new Error('columns 팩토리가 다른 블록을 냈다');
    const first = createLeafBlock('text', nextId());
    const second = createLeafBlock('button', nextId());
    const filled: EmailBlock = {
      ...columns,
      columns: columns.columns.map((column, index) =>
        index === 0 ? { ...column, blocks: [first, second] } : column,
      ),
    };

    const moved = moveBlock([filled], second.id, -1, moveArrayItem);
    const row = moved[0];
    expect(row?.blockKind).toBe('columns');
    if (row?.blockKind !== 'columns') return;
    expect(row.columns[0]?.blocks.map((block) => block.id)).toEqual([second.id, first.id]);
  });
});

describe('blockPositionOf', () => {
  it('최상위 블록의 자리와 형제 수를 답한다', () => {
    const nextId = idFactory();
    const blocks = [createLeafBlock('heading', nextId()), createLeafBlock('text', nextId())];
    expect(blockPositionOf(blocks, 'block-2')).toEqual({ index: 1, count: 2 });
  });

  it('칸 안의 블록은 **그 칸 기준**으로 답한다 — 이동 버튼이 잠글 경계가 그것이다', () => {
    const nextId = idFactory();
    const columns = createBlock('columns', nextId());
    if (columns.blockKind !== 'columns') throw new Error('columns 팩토리가 다른 블록을 냈다');
    const child = createLeafBlock('text', nextId());
    const filled: EmailBlock = {
      ...columns,
      columns: columns.columns.map((column, index) =>
        index === 0 ? { ...column, blocks: [child] } : column,
      ),
    };
    expect(blockPositionOf([filled], child.id)).toEqual({ index: 0, count: 1 });
  });

  it('없는 id 는 null 이다', () => {
    expect(blockPositionOf([], 'block-없음')).toBeNull();
  });
});
