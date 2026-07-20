// IconButton — 계약 검증 테스트 (contracts/IconButton.contract.json@1.0.0)
//
//   states[]     default · hover · active · focus-visible · disabled · selected
//   events       onClick — blockedWhen: disabled
//   a11y.role    button (네이티브 <button> 의 암묵 role)
//
// 이 파일이 못 박는 핵심은 **pressed 3값의 구분**이다. off 와 unset 은 픽셀이 같아
// 시각 검사(VRT)로는 영원히 구분되지 않는다 — DOM 속성으로만 증명할 수 있다.
//
// hover 는 포인터 의사 클래스라 jsdom 에 실제 상태가 없다(브라우저의 실제 포인터가 필요).
// 그 상태가 반영되는지를 검증할 수 있는 유일한 진짜 단언은 **스타일시트 규칙**이다 —
// 규칙 자체를 읽어 셀렉터와 토큰을 단언한다. 규칙을 지우면 이 테스트는 실패한다 (Button 선례).
//
// active 도 hover 와 같은 이유로 스타일시트 규칙을 읽어 단언한다. 이전에는 구현·계약 양쪽에
// active 항목이 아예 없어 "단언할 대상이 없다" 로 비워 두었으나, 그 결손을 메우는 쪽이 옳다:
// 계약에 tokens.textActive 를 넣고 구현에 `:active` 규칙을 두었다 (Button ghost 와 같은 어법).
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import iconButtonCss from './IconButton.css?raw';
import { IconButton } from './IconButton';

/** 글리프는 장식이므로 테스트에서도 이름을 갖지 않는 표식만 쓴다 */
const glyph = <svg data-testid="glyph" />;

/** 스타일시트에서 셀렉터의 선언 블록을 뽑는다 — 규칙이 없으면 null (그러면 단언이 실패한다) */
function ruleBody(css: string, selector: string): string | null {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) return null;
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  return close < 0 ? null : css.slice(open + 1, close);
}

describe('IconButton — 계약 states[]', () => {
  it('IconButton: default 상태 — size 기본값 md 로 렌더한다', () => {
    render(<IconButton icon={glyph} label="되돌리기" />);
    const button = screen.getByRole('button', { name: '되돌리기' });

    expect(button.className).toContain('tds-icon-button--md');
    expect(button.hasAttribute('disabled')).toBe(false);
  });

  it.each([
    ['sm', 'tds-icon-button--sm'],
    ['md', 'tds-icon-button--md'],
  ] as const)('IconButton: size=%s 는 %s 를 낸다 (계약 enum 전수)', (size, expected) => {
    render(<IconButton icon={glyph} label="되돌리기" size={size} />);

    expect(screen.getByRole('button', { name: '되돌리기' }).className).toContain(expected);
  });

  it('IconButton: hover 상태 — :hover 규칙이 배경만 raised 로 올린다', () => {
    const rule = ruleBody(iconButtonCss, '.tds-icon-button:hover:not(:disabled)');

    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-surface-raised)');
    // 눌린 상태의 강조(테두리+글자색)와 섞이면 두 상태가 시각적으로 구분되지 않는다.
    // `background-color` 가 'color:' 를 부분 문자열로 담으므로 선언 시작을 앵커로 잡는다.
    expect(rule).not.toMatch(/(^|[\s;])border-color\s*:/);
    expect(rule).not.toMatch(/(^|[\s;])color\s*:/);
  });

  it('IconButton: active 상태 — :active 규칙이 글자색만 action.primary.active 로 눌러 넣는다', () => {
    const rule = ruleBody(iconButtonCss, '.tds-icon-button:active:not(:disabled)');

    expect(rule).not.toBeNull();
    expect(rule).toContain('var(--tds-color-action-primary-active)');
    // 배경을 또 바꾸면 hover 와 pressed=on 사이에 구분 안 되는 세 번째 배경이 생긴다 —
    // 계약 tokens 에 backgroundActive 가 없는 것이 그 의도다.
    expect(rule).not.toMatch(/(^|[\s;])background(-color)?\s*:/);
  });

  it('IconButton: focus-visible 상태 — 키보드 포커스를 받고 :focus-visible 규칙이 포커스 링을 그린다', async () => {
    render(<IconButton icon={glyph} label="되돌리기" />);
    const button = screen.getByRole('button', { name: '되돌리기' });

    await userEvent.tab();
    expect(document.activeElement).toBe(button);

    // 두께는 단일 토큰 border-width.medium 에서만 온다 (TOKEN-02)
    const ring = ruleBody(iconButtonCss, '.tds-icon-button:focus-visible');
    expect(ring).not.toBeNull();
    expect(ring).toContain('var(--tds-border-width-medium)');
    expect(ring).toContain('var(--tds-color-border-focus)');
  });

  it('IconButton: disabled 상태 — 네이티브 disabled 를 걸어 포커스 순서에서 뺀다', () => {
    render(<IconButton icon={glyph} label="되돌리기" disabled />);
    const button = screen.getByRole('button', { name: '되돌리기' });

    // 계약 a11y.ariaDisabled — aria-disabled 가 아니라 네이티브 disabled 다
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.hasAttribute('aria-disabled')).toBe(false);
  });
});

describe('IconButton — 계약 props.pressed (3값 · 거짓 시맨틱 방지)', () => {
  // 여기가 이 컴포넌트의 존재 이유 중 하나다. 일반 액션에 aria-pressed="false" 를 달면
  // 스크린리더가 '토글 버튼, 안 눌림' 이라고 읽어 사용자가 잘못된 기대를 갖는다.
  it('IconButton: pressed 기본값(unset) 에서는 aria-pressed 속성이 아예 없다', () => {
    render(<IconButton icon={glyph} label="되돌리기" />);

    expect(screen.getByRole('button', { name: '되돌리기' }).hasAttribute('aria-pressed')).toBe(
      false,
    );
  });

  it('IconButton: pressed="off" 는 aria-pressed="false" 를 낸다 — unset 과 다른 말이다', () => {
    render(<IconButton icon={glyph} label="패널 접기" pressed="off" />);

    expect(screen.getByRole('button', { name: '패널 접기' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  // 계약 states 의 `selected` 가 곧 pressed="on" 이다 — 계약 props.pressed 가
  // "시각은 on 에서만 달라지고 off 와 unset 은 같다" 로 그 대응을 못 박는다.
  it('IconButton: selected 상태 — pressed="on" 이 aria-pressed="true" 를 낸다', () => {
    render(<IconButton icon={glyph} label="패널 접기" pressed="on" />);

    expect(screen.getByRole('button', { name: '패널 접기' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('IconButton: pressed 상태는 클래스가 아니라 aria-pressed 가 소유한다 (시각↔접근성 단일 원천)', () => {
    // 눌린 시각을 pressed 전용 클래스로 그리면 속성과 클래스가 갈라질 수 있다.
    // CSS 가 [aria-pressed='true'] 를 직접 보므로 그 갈라짐이 원리적으로 생기지 않는다.
    render(<IconButton icon={glyph} label="패널 접기" pressed="on" />);
    const button = screen.getByRole('button', { name: '패널 접기' });

    expect(button.className).toBe('tds-icon-button tds-icon-button--md');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('IconButton — 계약 a11y', () => {
  it('IconButton: label 이 aria-label 과 title 양쪽에 같은 값으로 들어간다', () => {
    render(<IconButton icon={glyph} label="HTML 내려받기" />);
    const button = screen.getByRole('button', { name: 'HTML 내려받기' });

    // 문자 편집기 쪽에만 있고 이메일 쪽에는 없던 title — 마우스 사용자가 아이콘의 뜻을 알 길이었다
    expect(button.getAttribute('title')).toBe('HTML 내려받기');
    expect(button.getAttribute('aria-label')).toBe('HTML 내려받기');
  });

  it('IconButton: 글리프는 aria-hidden 이라 접근 가능한 이름을 오염시키지 않는다', () => {
    render(
      <IconButton
        icon={<svg data-testid="glyph" aria-label="이 이름은 새어 나가면 안 된다" />}
        label="되돌리기"
      />,
    );
    const button = screen.getByRole('button', { name: '되돌리기' });

    expect(button.querySelector('.tds-icon-button__icon')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('IconButton: type="button" 이 고정이라 폼 안에서 실수로 제출하지 않는다', () => {
    render(<IconButton icon={glyph} label="되돌리기" />);

    expect(screen.getByRole('button', { name: '되돌리기' }).getAttribute('type')).toBe('button');
  });

  it('IconButton: 계약 밖 네이티브 ARIA 속성(aria-expanded · aria-haspopup)을 그대로 흘린다', () => {
    // 변수 드롭다운 트리거가 이것을 쓴다 — 계약 prop 을 늘리지 않고 표현하기 위한 통로다
    render(<IconButton icon={glyph} label="변수" aria-expanded aria-haspopup="menu" />);
    const button = screen.getByRole('button', { name: '변수' });

    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-haspopup')).toBe('menu');
  });
});

describe('IconButton — 계약 events.onClick.blockedWhen', () => {
  it('IconButton: 클릭하면 onClick 이 발화한다', async () => {
    const onClick = vi.fn();
    render(<IconButton icon={glyph} label="되돌리기" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('IconButton: disabled 면 onClick 이 발화하지 않는다 (계약 blockedWhen)', async () => {
    const onClick = vi.fn();
    render(<IconButton icon={glyph} label="되돌리기" disabled onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: '되돌리기' }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
