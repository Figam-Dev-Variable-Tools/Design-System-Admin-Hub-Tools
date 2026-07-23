// Result — 계약 검증 테스트 (contracts/Result.contract.json@1.0.0)
//
//   states[]   default
//   events     없음 — 액션은 슬롯이라 발화 주체가 슬롯 안의 Button 이다
//
// 계약: role="alert" live region · 제목은 h2 · 빈 문자열 센티널로 줄을 지운다(description·reference) ·
//       raw stack/서버 body 를 노출할 prop 이 없다(EXC-20) · 참조 코드는 tabular + user-select 전체.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import resultCss from './Result.css?raw';
import { Button } from '../../atoms/Button';
import { Result } from './Result';

function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('Result — 계약 states[]', () => {
  it('Result: default 상태 — role="alert" 라이브 영역에 제목을 렌더한다', () => {
    render(<Result title="문제가 발생했어요" />);
    const region = screen.getByRole('alert');
    expect(region).not.toBeNull();
    expect(region.textContent).toContain('문제가 발생했어요');
  });
});

describe('Result — 계약 a11y', () => {
  it('Result: 제목은 h2 다 — 페이지의 h1 은 Header 가 소유하므로 h1 을 더 만들지 않는다', () => {
    render(<Result title="접근 권한이 없어요" />);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('접근 권한이 없어요');
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
  });

  it('Result: 액션 슬롯의 Button 이 포커스 순서에 들어간다 (블록 자체는 받지 않는다)', () => {
    render(
      <Result title="문제가 발생했어요" actions={<Button variant="primary">다시 시도</Button>} />,
    );
    expect(screen.getByRole('button', { name: '다시 시도' })).not.toBeNull();
    expect(screen.getByRole('alert').getAttribute('tabindex')).toBeNull();
  });
});

describe('Result — 빈 문자열 센티널', () => {
  it('Result: description 이 빈 문자열이면 설명 줄을 그리지 않는다', () => {
    const { container } = render(<Result title="접근 권한이 없어요" description="" />);
    expect(container.querySelector('.tds-result__description')).toBeNull();
    // '없음' 단언 옆의 '있음' 앵커 — 제목은 그려져 있어야 한다 (work-cycle §6 toBe(0) 함정)
    expect(container.querySelector('.tds-result__title')).not.toBeNull();
  });

  it('Result: reference 가 빈 문자열이면 참조 코드 줄을 그리지 않는다', () => {
    const { container } = render(<Result title="접근 권한이 없어요" reference="" />);
    expect(container.querySelector('.tds-result__reference')).toBeNull();
    expect(container.querySelector('.tds-result__title')).not.toBeNull();
  });

  it('Result: reference 가 있으면 그 코드를 그대로 보인다 (운영자가 복사해 티켓에 붙인다)', () => {
    render(<Result title="문제가 발생했어요" reference="A1B2-C3D4" />);
    expect(screen.getByRole('alert').textContent).toContain('A1B2-C3D4');
  });

  it('Result: actions 를 주지 않으면 액션 줄 자체가 없다', () => {
    const { container } = render(<Result title="문제가 발생했어요" />);
    expect(container.querySelector('.tds-result__actions')).toBeNull();
    expect(container.querySelector('.tds-result__title')).not.toBeNull();
  });

  it('Result: 액션을 여럿 주면 한 줄에 함께 놓인다', () => {
    render(
      <Result
        title="문제가 발생했어요"
        actions={
          <>
            <Button variant="primary">다시 시도</Button>
            <Button variant="secondary">대시보드로</Button>
          </>
        }
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });
});

describe('Result — 토큰/스타일', () => {
  it('Result: 제목은 title.xl 타이포 토큰, 설명은 muted 텍스트 토큰을 참조한다', () => {
    const title = ruleBody(resultCss, '.tds-result__title');
    const desc = ruleBody(resultCss, '.tds-result__description');
    expect(title).toContain('var(--tds-typography-title-xl-font-size)');
    expect(desc).toContain('var(--tds-color-text-muted)');
  });

  it('Result: 참조 코드는 tabular-nums 이고 한 번의 선택으로 통째로 잡힌다 (EXC-20)', () => {
    const reference = ruleBody(resultCss, '.tds-result__reference');
    expect(reference).toContain('tabular-nums');
    expect(reference).toContain('user-select: all');
  });
});
