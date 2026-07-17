// 증감의 3중 인코딩이 한 곳에서만 나온다 — apps/admin/src/pages/stats/**
//
// [무엇을 지키나]
// 증감은 색 + ▲/▼ 글리프 + 스크린리더 문장, 셋으로 말한다. 색은 보조 신호일 뿐이고(WCAG 1.4.1),
// 화살표는 **눈에만** 방향이다 — '▲' 를 스크린리더가 어떻게 읽어 줄지는 리더·설정마다 다르고
// 아예 건너뛰기도 한다. 그래서 '증가/감소'를 말로 한 번 더 해야 방향이 사실로 전달된다.
//
// [왜 이 파일이 생겼나]
// 예전엔 KPI 카드(StatsKpiRow)와 구성비 막대(ShareBarList)가 증감을 **각자** 그렸고, 그 결과
// 한쪽만 SR 문장을 갖고 있었다(막대 쪽 누락). 같은 사실을 두 곳에서 각자 인코딩하면 언젠가
// 한쪽이 빠진다 — DeltaText 로 모으고, 그 3중을 여기서 고정한다.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DeltaText } from './DeltaText';
import { deltaOf } from './format';

describe('DeltaText — 증감 3중 인코딩 (색 + 글리프 + SR 문장)', () => {
  it('증가를 글리프와 문장 둘 다로 말한다 — 문장에는 실제 증감량이 단위와 함께 들어간다', () => {
    render(<DeltaText delta={deltaOf(1100, 1000)} unit="people" />);

    // 눈 — 화살표는 aria-hidden 이라 SR 이 문자로 더듬지 않는다
    const glyph = screen.getByText('▲ 10.0%');
    expect(glyph.getAttribute('aria-hidden')).toBe('true');

    // 귀 — 방향을 말로. 퍼센트만이 아니라 증감량(100명)까지 붙는다
    expect(screen.getByText('비교 기간 대비 10.0% (100명) 증가')).not.toBeNull();
  });

  it('감소도 같은 3중이다', () => {
    render(<DeltaText delta={deltaOf(900, 1000)} unit="people" />);

    expect(screen.getByText('▼ 10.0%').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('비교 기간 대비 10.0% (100명) 감소')).not.toBeNull();
  });

  it('변동 없음도 말로 한다 — 침묵하지 않는다', () => {
    render(<DeltaText delta={deltaOf(1000, 1000)} unit="count" />);

    expect(screen.getByText('변동 없음').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText('비교 기간과 변동 없음')).not.toBeNull();
  });

  it('색은 셋째 신호다 — 색을 빼도 방향이 글리프와 문장에 남아 있다', () => {
    const { container } = render(<DeltaText delta={deltaOf(1100, 1000)} unit="count" />);

    // 색은 토큰으로만 온다 (하드코딩 hex 금지)
    const colored = container.querySelector('span[style*="color"]');
    expect(colored?.getAttribute('style')).toContain('var(--tds-color-feedback-success-text)');

    // 색 정보를 지워도 방향은 여전히 두 경로로 전달된다
    expect(screen.getByText('▲ 10.0%')).not.toBeNull();
    expect(screen.getByText(/증가$/)).not.toBeNull();
  });

  it('낮을수록 좋은 지표는 색이 뒤집힌다 — 탈퇴 급증이 초록으로 뜨지 않는다', () => {
    // isLowerBetter=true: 증가는 나쁨 → danger 색. 글리프/문장은 사실 그대로 '증가'다.
    const { container } = render(<DeltaText delta={deltaOf(1100, 1000, true)} unit="people" />);

    const colored = container.querySelector('span[style*="color"]');
    expect(colored?.getAttribute('style')).toContain('var(--tds-color-feedback-danger-text)');
    expect(screen.getByText('▲ 10.0%')).not.toBeNull();
    expect(screen.getByText(/증가$/)).not.toBeNull();
  });
});
