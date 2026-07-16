// Empty — 계약 검증 테스트 (contracts/Empty.contract.json@1.1.0)
//
//   states[]        default
//   events.onClearSearch  '검색 지우기' 클릭 발화 (검색 상태 · 콜백 지정 시에만 버튼 렌더)
//   events.onResetFilters '필터 초기화' 클릭 발화 (필터 상태 · 콜백 지정 시에만 버튼 렌더)
//
// 계약: hasQuery > hasActiveFilters > 진짜 비어있음 우선순위 · 조사('이/가') 자동 선택(ERP-13) ·
//       role="status" live region · 생성 CTA 는 진짜 비어있음에서만.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import emptyCss from './Empty.css?raw';
import { Empty } from './Empty';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('Empty — 계약 states[]', () => {
  it('Empty: default 상태 — role="status" 라이브 영역에 사유 문구를 렌더한다', () => {
    render(<Empty label="회원" />);
    const region = screen.getByRole('status');
    expect(region).not.toBeNull();
    expect(region.textContent).toContain('등록된 회원이 없습니다');
  });
});

describe('Empty — 상태 분기 (STATE-05)', () => {
  it('Empty: 진짜 비어있음 — 생성 CTA 슬롯만 렌더하고 복구 버튼은 없다', () => {
    render(
      <Empty label="회원" onClearSearch={vi.fn()} onResetFilters={vi.fn()}>
        {/* action 슬롯으로 생성 CTA */}
      </Empty>,
    );
    // 검색/필터 상태가 아니므로 복구 버튼이 없다
    expect(screen.queryByRole('button', { name: '검색 지우기' })).toBeNull();
    expect(screen.queryByRole('button', { name: '필터 초기화' })).toBeNull();
  });

  it('Empty: 진짜 비어있음 — createVerb 를 문구에 반영한다 ("접수된 문의가 없습니다")', () => {
    render(<Empty label="문의" createVerb="접수" />);
    // '문의' 는 받침 없음(ㅢ) → '가'
    expect(screen.getByRole('status').textContent).toContain('접수된 문의가 없습니다');
  });

  it('Empty: 검색 결과 없음 — hasQuery 가 filter/empty 보다 우선하고 조건 문구를 보인다', () => {
    render(<Empty label="회원" hasQuery hasActiveFilters onResetFilters={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('조건에 맞는 회원이 없습니다');
    // 우선순위상 검색 상태 → '필터 초기화' 는 없다
    expect(screen.queryByRole('button', { name: '필터 초기화' })).toBeNull();
  });

  it('Empty: 필터 결과 없음 — hasActiveFilters 만 true 면 필터 문구를 보인다', () => {
    render(<Empty label="공지" hasActiveFilters onResetFilters={vi.fn()} />);
    expect(screen.getByRole('status').textContent).toContain('필터에 맞는 공지가 없습니다');
  });
});

describe('Empty — 조사(助詞) 자동 선택 (ERP-13)', () => {
  it('Empty: 받침 있는 label 은 조사 "이" ("회원이")', () => {
    render(<Empty label="회원" />);
    expect(screen.getByRole('status').textContent).toContain('회원이');
    expect(screen.getByRole('status').textContent).not.toContain('회원가');
  });

  it('Empty: 받침 없는 label 은 조사 "가" ("카페가")', () => {
    render(<Empty label="카페" />);
    expect(screen.getByRole('status').textContent).toContain('카페가');
    // 리터럴 '이(가)' fallback 을 절대 출하하지 않는다
    expect(screen.getByRole('status').textContent).not.toContain('이(가)');
  });
});

describe('Empty — 계약 events', () => {
  it('Empty: onClearSearch 지정 시 검색 상태에서 버튼을 그리고 클릭이 발화한다', async () => {
    const onClearSearch = vi.fn();
    render(<Empty label="회원" hasQuery onClearSearch={onClearSearch} />);
    await userEvent.click(screen.getByRole('button', { name: '검색 지우기' }));
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it('Empty: onClearSearch 미지정이면 검색 상태라도 버튼이 없다', () => {
    render(<Empty label="회원" hasQuery />);
    expect(screen.queryByRole('button', { name: '검색 지우기' })).toBeNull();
  });

  it('Empty: onResetFilters 지정 시 필터 상태에서 버튼을 그리고 클릭이 발화한다', async () => {
    const onResetFilters = vi.fn();
    render(<Empty label="회원" hasActiveFilters onResetFilters={onResetFilters} />);
    await userEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });
});

describe('Empty — 토큰/스타일', () => {
  it('Empty: 제목은 title 타이포 토큰, 설명은 muted 텍스트 토큰을 참조한다', () => {
    const title = ruleBody(emptyCss, '.tds-empty__title');
    const desc = ruleBody(emptyCss, '.tds-empty__description');
    expect(title).toContain('var(--tds-typography-title-md-font-size)');
    expect(desc).toContain('var(--tds-color-text-muted)');
  });
});
