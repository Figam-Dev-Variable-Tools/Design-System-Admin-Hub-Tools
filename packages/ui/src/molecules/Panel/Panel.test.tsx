// Panel — 계약 검증 테스트 (contracts/Panel.contract.json@1.0.0)
//
//   a11y.role         complementary (<aside>)
//   a11y.aria         landmark-complementary · no-heading
//   states[]          default
//   events            없음 (껍데기다)
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import panelCss from './Panel.css?raw';
import { Panel } from './Panel';

describe('Panel — 랜드마크와 슬롯', () => {
  it('Panel: default 상태 — role=complementary 인 <aside> 다', () => {
    const { container } = render(<Panel>내용</Panel>);
    expect(screen.getByRole('complementary')).not.toBeNull();
    expect(container.querySelector('aside')).not.toBeNull();
  });

  it('children 을 문서 순서 그대로 흘린다', () => {
    render(
      <Panel>
        <nav aria-label="등급">등급 축</nav>
        <nav aria-label="그룹">그룹 축</nav>
      </Panel>,
    );
    // 이름이 필요한 것은 패널이 아니라 그 안의 각 <nav> 다
    expect(screen.getByRole('navigation', { name: '등급' })).not.toBeNull();
    expect(screen.getByRole('navigation', { name: '그룹' })).not.toBeNull();
  });

  it('패널 자신은 이름도 제목도 갖지 않는다', () => {
    const { container } = render(<Panel>내용</Panel>);
    const aside = container.querySelector('aside');
    expect(aside?.getAttribute('aria-label')).toBeNull();
    // 껍데기가 <h2> 를 강제하면 블록이 둘일 때 제목이 두 층이 된다
    expect(container.querySelector('h1, h2, h3')).toBeNull();
  });
});

describe('Panel — 안내 영역', () => {
  it('notice 를 주면 구분선 영역이 생기고 내용이 들어간다', () => {
    const { container } = render(
      <Panel notice={<p>그룹은 회원을 묶는 단위입니다.</p>}>내용</Panel>,
    );
    expect(container.querySelector('.tds-panel__notice')).not.toBeNull();
    expect(screen.getByText('그룹은 회원을 묶는 단위입니다.')).not.toBeNull();
  });

  it('notice 가 없으면 그 영역이 통째로 사라진다 — 빈 영역이 남으면 아래가 떠 보인다', () => {
    const { container } = render(<Panel>내용</Panel>);
    expect(container.querySelector('.tds-panel__notice')).toBeNull();
  });

  it('안내 영역은 <div> 다 — 문단 여럿을 받아야 하므로 <p> 로 감쌀 수 없다', () => {
    const { container } = render(
      <Panel
        notice={
          <>
            <p>첫 문단</p>
            <p>둘째 문단</p>
            <p>셋째 문단</p>
          </>
        }
      >
        내용
      </Panel>,
    );
    const notice = container.querySelector('.tds-panel__notice');
    expect(notice?.tagName).toBe('DIV');
    // <p> 로 감쌌다면 브라우저가 태그를 강제로 닫아 문단이 형제로 흩어진다
    expect(notice?.querySelectorAll('p')).toHaveLength(3);
  });
});

describe('Panel — 토큰과 RTL', () => {
  it('CSS 에 hex·px·rgb 가 없다', () => {
    expect(panelCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(panelCss).not.toMatch(/\brgb\(/);
    expect(panelCss).not.toMatch(/\b\d+px\b/);
  });

  it('물리 방향 속성을 쓰지 않는다 — RTL 에서 구분선과 여백이 따라 뒤집히게', () => {
    const physical = panelCss.match(/\b(border|padding|margin)-(left|right|top|bottom)\b/g) ?? [];
    expect(physical).toEqual([]);
  });

  it('폭을 박지 않고 min-inline-size 만 0 으로 낮춘다 — 격자와 두 곳에서 싸우지 않게', () => {
    expect(panelCss).toContain('min-inline-size: 0');
    expect(panelCss).not.toMatch(/^\s*inline-size:/m);
  });
});
