// Button — 계약 검증 테스트 (contracts/Button.contract.json@1.1.0)
//
// 검증 대상
//   states[]           default · hover · active · focus-visible · disabled · loading
//   props.type         submit · reset 은 그대로, 그 외 값은 button 으로 좁힘 (하드코딩 금지)
//   props.isFullWidth  컨테이너 100% 폭
//   native passthrough aria-label · title · aria-describedby … + 호출부 aria-busy 우선
//   events.onClick     blockedWhen: ["disabled", "loading"]
//
// **금지 동작(blockedWhen)은 스파이로만 증명된다.**
// `expect(button).toBeDisabled()` 는 onClick 이 발화하지 **않음**을 증명하지 못한다 —
// disabled 속성 없이 CSS 로만 흐리게 처리하고 핸들러를 그대로 물려도 그 단언은 통과한다.
// 그래서 여기서는 콜백에 스파이(vi.fn())를 주입하고 not.toHaveBeenCalled() 로 비발생을 단언한다.
//
// hover / active 는 포인터 의사 클래스라 jsdom 에 실제 상태가 없다(브라우저의 실제 포인터가 필요).
// 그 상태가 "DOM/스타일에 반영되는지"를 검증할 수 있는 유일한 진짜 단언은 **스타일시트 규칙**이다 —
// 규칙 자체를 읽어 셀렉터와 토큰을 단언한다. 규칙을 지우면 이 테스트는 실패한다.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';

import buttonCss from './Button.css?raw';
import { Button } from './Button';

/** 스타일시트에서 셀렉터의 선언 블록을 뽑는다 — 규칙이 없으면 null (그러면 단언이 실패한다) */
function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('Button — 계약 states[]', () => {
  it('Button: default 상태 — 활성 버튼으로 렌더되고 aria-busy 도 aria-disabled 도 없다', () => {
    render(<Button>저장</Button>);
    const button = screen.getByRole('button', { name: '저장' });

    expect(button).not.toBeNull();
    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(button.className).toContain('tds-button--primary');
  });

  it('Button: hover 상태 — :hover 규칙이 variant 별 hover 배경 토큰을 적용한다', () => {
    const primary = ruleBody(buttonCss, '.tds-button--primary:hover:not(:disabled)');
    const danger = ruleBody(buttonCss, '.tds-button--danger:hover:not(:disabled)');

    // variant 마다 component.button.<variant>.* 를 읽는다 — 값은 예전과 같고 출처만 한 층 올라갔다.
    // (danger hover 는 여전히 color.feedback.danger.text 로 별칭된다)
    expect(primary).not.toBeNull();
    expect(primary).toContain('var(--tds-component-button-primary-background-hover)');
    expect(danger).not.toBeNull();
    expect(danger).toContain('var(--tds-component-button-danger-background-hover)');
  });

  it('Button: active 상태 — :active 규칙이 눌림 배경 토큰을 적용한다', () => {
    const primary = ruleBody(buttonCss, '.tds-button--primary:active:not(:disabled)');

    expect(primary).not.toBeNull();
    expect(primary).toContain('var(--tds-component-button-primary-background-active)');
  });

  it('Button: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(<Button>저장</Button>);
    const button = screen.getByRole('button', { name: '저장' });

    await userEvent.tab();
    expect(document.activeElement).toBe(button);

    const ring = ruleBody(buttonCss, '.tds-button:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-component-button-focus-ring)');
  });

  it('Button: disabled 상태 — native disabled + aria-disabled 로 반영된다', () => {
    render(<Button disabled>저장</Button>);
    const button = screen.getByRole('button', { name: '저장' });

    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(ruleBody(buttonCss, '.tds-button:disabled')).toContain('var(--tds-color-text-disabled)');
  });

  it('Button: loading 상태 — aria-busy=true + 스피너가 iconLeft 를 대체한다 (계약 hiddenWhen)', () => {
    const { container } = render(
      <Button loading iconLeft={<span data-testid="icon" />}>
        저장
      </Button>,
    );
    const button = screen.getByRole('button', { name: '저장' });

    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('.tds-spinner')).not.toBeNull();
    expect(screen.queryByTestId('icon')).toBeNull();
  });
});

describe('Button — 레이블 정렬 (아이콘+텍스트)', () => {
  it('Button: children 의 아이콘과 텍스트가 같은 .tds-button__label 안에 함께 렌더된다', () => {
    const { container } = render(
      <Button>
        <svg data-testid="glyph" aria-hidden="true" />
        공지 등록
      </Button>,
    );
    const label = container.querySelector('.tds-button__label');

    expect(label).not.toBeNull();
    // 아이콘과 텍스트가 label 의 직접 자식으로 함께 온다 — label 의 flex+gap 이 둘을 정렬한다
    expect(label?.querySelector('[data-testid="glyph"]')).not.toBeNull();
    expect(label?.textContent).toContain('공지 등록');
  });

  it('Button: .tds-button__label 규칙이 inline-flex + 중앙 정렬 + 토큰 gap 으로 아이콘/텍스트를 정렬한다', () => {
    const label = ruleBody(buttonCss, '.tds-button__label');

    expect(label).not.toBeNull();
    // 세로 중앙 정렬 + 간격 (baseline 어긋남/gap 0 회귀 방지)
    expect(label).toContain('display: inline-flex');
    expect(label).toContain('align-items: center');
    // gap 은 하드코딩 px 가 아니라 토큰이어야 한다
    expect(label).toContain('gap: var(--tds-component-button-gap)');
    // 아이콘 1.25em 이 line-height 를 밀어내 높이가 늘어나지 않도록 최소 높이를 확보한다
    expect(label).toContain('min-block-size: 1.25em');
  });
});

describe('Button — 계약 events.onClick.blockedWhen', () => {
  it('Button: disabled 상태에서 onClick 이 발화하지 않는다', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        저장
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('Button: loading 상태에서 onClick 이 발화하지 않는다', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        저장
      </Button>,
    );

    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('Button: 차단 상태가 아니면 onClick 이 발화한다 (비발생 단언이 공허하지 않음을 보인다)', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>저장</Button>);

    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe('Button — 계약 props.type (하드코딩 금지)', () => {
  it('Button: type=submit 은 폼을 제출한다 (type 을 하드코딩하면 폼이 조용히 죽는다)', async () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">로그인</Button>
      </form>,
    );

    const button = screen.getByRole('button', { name: '로그인' });
    expect(button.getAttribute('type')).toBe('submit');

    await userEvent.click(button);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('Button: type 기본값은 button — 폼 안의 보조 버튼은 제출하지 않는다 (HTML 기본값 submit 을 뒤집은 DS 결정)', async () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button>취소</Button>
      </form>,
    );

    const button = screen.getByRole('button', { name: '취소' });
    expect(button.getAttribute('type')).toBe('button');

    await userEvent.click(button);

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Button: type=reset 은 폼을 초기화한다 (native reset 시맨틱)', async () => {
    render(
      <form>
        <label htmlFor="q">검색어</label>
        <input id="q" name="q" defaultValue="" />
        <Button type="reset">초기화</Button>
      </form>,
    );
    const input = screen.getByLabelText('검색어') as HTMLInputElement;
    await userEvent.type(input, '도어락');
    expect(input.value).toBe('도어락');

    await userEvent.click(screen.getByRole('button', { name: '초기화' }));

    expect(input.value).toBe('');
  });

  it('Button: 계약 밖의 type 값은 button 으로 좁힌다 (허용 값은 button · submit · reset 뿐)', async () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <Button type="menu">메뉴</Button>
      </form>,
    );

    const button = screen.getByRole('button', { name: '메뉴' });
    expect(button.getAttribute('type')).toBe('button');

    await userEvent.click(button);

    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('Button — 계약 props.isFullWidth', () => {
  it('Button: isFullWidth=true — full-width 클래스가 붙고 규칙이 컨테이너 100% 폭을 준다', () => {
    render(<Button isFullWidth>로그인</Button>);
    const button = screen.getByRole('button', { name: '로그인' });

    expect(button.className).toContain('tds-button--full-width');

    const rule = ruleBody(buttonCss, '.tds-button--full-width');
    expect(rule).not.toBeNull();
    expect(rule).toContain('inline-size: 100%');
  });

  it('Button: isFullWidth 기본값은 false — 내용 폭(inline-flex)을 유지한다', () => {
    render(<Button>로그인</Button>);

    expect(screen.getByRole('button', { name: '로그인' }).className).not.toContain(
      'tds-button--full-width',
    );
  });
});

describe('Button — 레이블은 접히지 않는다', () => {
  // jsdom 은 레이아웃을 계산하지 않는다(줄바꿈이 실제로 일어나는지 볼 수 없다). 그래서 검증할 수
  // 있는 유일한 진짜 단언은 **규칙 자체**다 — 이 선언을 지우면 여기서 실패한다.
  it('Button: .tds-button 규칙이 white-space: nowrap 을 선언한다 (좁은 줄에서 레이블이 두 줄로 접히지 않는다)', () => {
    const rule = ruleBody(buttonCss, '.tds-button');

    expect(rule).not.toBeNull();
    expect(rule).toContain('white-space: nowrap');
  });
});

describe('Button — 네이티브 속성 패스스루 (Card 선례)', () => {
  it('Button: 계약에 없는 표준 HTML/ARIA 속성을 <button> 으로 그대로 전달한다 (aria-label · title · aria-describedby)', () => {
    render(
      <>
        <span id="help">포인트를 지급해요</span>
        <Button aria-label="포인트 지급" title="지급" aria-describedby="help">
          지급
        </Button>
      </>,
    );

    const button = screen.getByRole('button', { name: '포인트 지급' });
    expect(button.getAttribute('title')).toBe('지급');
    expect(button.getAttribute('aria-describedby')).toBe('help');
  });

  it('Button: 호출부가 명시한 aria-busy 가 loading 파생값을 덮는다 (ConfirmDialog: 스피너 없이 aria-busy 만)', () => {
    const { container } = render(<Button aria-busy>삭제</Button>);
    const button = screen.getByRole('button', { name: '삭제' });

    expect(button.getAttribute('aria-busy')).toBe('true');
    // loading 이 아니므로 스피너는 없다 — aria-busy 만 켠다
    expect(container.querySelector('.tds-spinner')).toBeNull();
  });

  it('Button: loading=true 여도 호출부의 aria-busy=false 가 우선한다 (파생값은 기본값일 뿐이다)', () => {
    render(
      <Button loading aria-busy={false}>
        저장 중
      </Button>,
    );

    expect(screen.getByRole('button', { name: '저장 중' }).getAttribute('aria-busy')).toBe('false');
  });
});
