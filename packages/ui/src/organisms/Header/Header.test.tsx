// Header — 계약 검증 테스트 (contracts/Header.contract.json@1.0.0)
//
//   a11y.role         banner (<header>)
//   a11y.aria         heading-level(h1 하나) · no-eyebrow-heading
//   props             title(필수) · eyebrow(빈 문자열이면 미렌더) · meta(node 슬롯)
//
// [왜 이 파일이 이관보다 먼저 존재해야 하나] 어드민 AppHeader 에는 검사가 **하나도 없었다.**
// 그 상태로 DS 로 옮기면 통과가 아무것도 증명하지 않는다 (work-cycle.md §6).
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import headerCss from './Header.css?raw';
import { Header } from './Header';

describe('Header — 랜드마크와 제목 계층', () => {
  it('Header: default 상태 — banner 랜드마크다. role 속성 없이 네이티브 <header> 시맨틱으로', () => {
    const { container } = render(<Header title="회원 관리" />);
    expect(screen.getByRole('banner')).not.toBeNull();
    // 네이티브 시맨틱으로 충분하다 — 중복 role 속성을 달지 않는다
    expect(container.querySelector('header[role]')).toBeNull();
  });

  /** 화면 130여 개가 자기 제목을 그리지 않고 이 헤더에 맡긴다 (IA-02) */
  it('화면 제목은 <h1> 이며 하나뿐이다', () => {
    render(<Header title="회원 관리" eyebrow="LOGO · 관리자" />);
    expect(screen.getByRole('heading', { level: 1, name: '회원 관리' })).not.toBeNull();
    expect(screen.getAllByRole('heading')).toHaveLength(1);
  });

  /** <h2> 로 만들면 스크린리더 제목 목록이 브랜드 이름으로 오염된다 */
  it('눈썹 문구는 제목이 아니다 — 제목 계층에 들어가지 않는다', () => {
    render(<Header title="회원 관리" eyebrow="LOGO · 관리자" />);
    expect(screen.getByText('LOGO · 관리자').tagName).toBe('P');
  });
});

describe('Header — 선택 요소', () => {
  it('eyebrow 가 빈 문자열이면 그 줄을 아예 그리지 않는다', () => {
    const { container } = render(<Header title="회원 관리" />);
    expect(container.querySelector('.tds-header__eyebrow')).toBeNull();
  });

  it('meta 슬롯이 주입한 것을 그대로 그린다 — 날짜 포맷도 세션 조회도 DS 밖의 일이다', () => {
    render(<Header title="회원 관리" meta={<span>test@example.com</span>} />);
    expect(screen.getByText('test@example.com')).not.toBeNull();
  });

  it('meta 를 주지 않으면 그 컨테이너 자체가 없다', () => {
    const { container } = render(<Header title="회원 관리" />);
    expect(container.querySelector('.tds-header__meta')).toBeNull();
  });
});

describe('Header — 토큰', () => {
  /** 예전 구현은 primitive 를 직접 읽어 title.xl 의 값을 손으로 재현한 사본이었다 (TOKEN-05) */
  it('제목은 semantic 합성 토큰(title.xl)만 읽는다 — primitive 직접 참조 0건', () => {
    // '.tds-header__titles'(컨테이너)가 파일 앞쪽에 있으므로 여는 중괄호까지 붙여 가른다
    const rule = headerCss.slice(headerCss.indexOf('.tds-header__title {'));
    const body = rule.slice(rule.indexOf('{'), rule.indexOf('}'));
    expect(body).toContain('var(--tds-typography-title-xl-font-size)');
    expect(body).not.toContain('--tds-primitive-');
  });

  /** Sidebar 브랜드 영역과 같은 배수여야 두 구분선이 한 줄로 이어진다 */
  it('높이가 space.6 의 3.5배로 고정돼 있다', () => {
    expect(headerCss).toContain('calc(var(--tds-space-6) * 3.5)');
  });

  it('방향 의존 속성이 전부 논리 속성이다 (left/right 0건)', () => {
    const physical = headerCss.match(/\b(border|padding|margin)-(left|right)\b/g) ?? [];
    expect(physical).toStrictEqual([]);
  });
});
