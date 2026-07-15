// 포트폴리오 카테고리 동작 회귀 테스트 (A41) — 사용 중 삭제 차단 + 사용량 문구 + 폼 검증
import { describe, expect, it } from 'vitest';

import { addCategory, listCategoryUsage, removeCategory } from '../_shared/store';
import { usageLabel } from './types';
import { portfolioCategorySchema } from './validation';

describe('usageLabel — 사용 여부 문구', () => {
  it('미사용/사용 중을 구분한다', () => {
    expect(usageLabel(0)).toBe('미사용');
    expect(usageLabel(3)).toContain('3개');
  });
});

describe('store 카테고리 — 사용 중 삭제 차단(안전 기본값)', () => {
  it('시드 카테고리는 사용 중이라 삭제를 거부한다', () => {
    // 시드: 각 카테고리를 쓰는 포트폴리오가 1건씩 있다
    expect(() => removeCategory('residential')).toThrow('사용 중');
  });

  it('미사용 카테고리는 삭제된다', () => {
    addCategory('임시 분류');
    const created = listCategoryUsage().find((category) => category.label === '임시 분류');
    if (created === undefined) throw new Error('생성된 카테고리를 찾지 못했습니다');
    expect(created.itemCount).toBe(0);
    expect(() => removeCategory(created.id)).not.toThrow();
    expect(listCategoryUsage().some((category) => category.label === '임시 분류')).toBe(false);
  });
});

describe('portfolioCategorySchema — 폼 검증', () => {
  it('이름이 있으면 통과, 비면 막는다', () => {
    expect(portfolioCategorySchema.safeParse({ name: '주거 공간' }).success).toBe(true);
    expect(portfolioCategorySchema.safeParse({ name: '   ' }).success).toBe(false);
  });
});
