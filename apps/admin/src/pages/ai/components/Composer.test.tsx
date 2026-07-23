// 입력줄의 접근성 계약 — combobox(자동완성)와 menu(모드 선택)
//
// [왜 이 테스트가 필요한가] 두 팝업은 눈으로 보면 똑같이 '목록이 떴다' 로 보인다. 그래서 역할을
// 잘못 붙여도 시각적으로는 아무 문제가 없고, 스크린리더·키보드 사용자에게만 깨진다 — 즉 사람이
// 화면을 보고 잡을 수 없는 종류의 결함이다. 계약을 여기에 고정한다.
//
// [무엇이 다른가]
//   `@` 자동완성 = combobox — 값을 편집하는 입력에 붙은 목록. 포커스는 입력에 머물고
//                              aria-activedescendant 가 활성 항목을 가리킨다.
//   응답 모드     = menu     — 값이 아닌 항목(문법 도움말)이 섞인 명령 표면. 단일 선택은
//                              menuitemradio + aria-checked 로 말한다.
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  registerAiProviderLookup,
  resetAiProviderLookup,
} from '../../../shared/fixtures/ai-providers';
import { DEFAULT_MODE_ID } from '../_shared/modes';
import type { ResponseModeId } from '../_shared/modes';
import { Composer } from './Composer';

/**
 * 실제 사용처와 같게 — 입력값을 부모가 쥔다(제어 컴포넌트).
 * 모드 메뉴가 설정 화면으로 가는 <Link> 를 갖게 되어 라우터 컨텍스트가 필요하다.
 */
function Harness({ onSubmit = () => undefined }: { readonly onSubmit?: () => void }) {
  const [value, setValue] = useState('');
  const [modeId, setModeId] = useState<ResponseModeId>(DEFAULT_MODE_ID);
  return (
    <MemoryRouter>
      <Composer
        value={value}
        onChange={setValue}
        onSubmit={onSubmit}
        busy={false}
        modeId={modeId}
        onModeChange={setModeId}
      />
    </MemoryRouter>
  );
}

// 연동 상태는 모듈 전역이라 테스트 간에 새 나가지 않게 되돌린다
afterEach(() => {
  resetAiProviderLookup();
});

describe('Composer — `@` 자동완성은 combobox 다', () => {
  it('처음에는 목록이 닫혀 있다', () => {
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: '질문 입력' });
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('`@` 를 치면 목록이 열리고 aria-expanded 가 참이 된다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: '질문 입력' });

    await user.type(input, '@');

    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('listbox', { name: '데이터 멘션 후보' })).not.toBeNull();
    expect(screen.getAllByRole('option').length).toBeGreaterThan(0);
  });

  it('입력한 접두사로 후보를 좁힌다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByRole('combobox', { name: '질문 입력' }), '@회원');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]?.textContent).toContain('@회원목록');
  });

  it('포커스는 입력에 머물고, 활성 항목은 aria-activedescendant 로 가리킨다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: '질문 입력' });
    await user.type(input, '@');

    // 포커스가 목록으로 옮겨가면 계속 타이핑할 수 없다 — 입력에 남아 있어야 한다
    expect(document.activeElement).toBe(input);

    const active = input.getAttribute('aria-activedescendant');
    expect(active).not.toBeNull();
    const options = screen.getAllByRole('option');
    expect(options[0]?.id).toBe(active);
    expect(options[0]?.getAttribute('aria-selected')).toBe('true');
  });

  it('아래 화살표로 활성 항목이 옮겨간다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: '질문 입력' });
    await user.type(input, '@');

    const before = input.getAttribute('aria-activedescendant');
    await user.keyboard('{ArrowDown}');
    const after = input.getAttribute('aria-activedescendant');

    expect(after).not.toBe(before);
    expect(screen.getAllByRole('option')[1]?.getAttribute('aria-selected')).toBe('true');
  });

  it('Enter 로 활성 항목을 채워 넣고 목록을 닫는다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByRole('combobox', { name: '질문 입력' });
    await user.type(input, '@회원');
    await user.keyboard('{Enter}');

    expect(input).toHaveProperty('value', '@회원목록 ');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('목록이 닫힌 상태의 Enter 는 질문을 보낸다', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);
    const input = screen.getByRole('combobox', { name: '질문 입력' });

    await user.type(input, '@회원목록');
    await user.keyboard('{Enter}'); // 후보 채우기 — 아직 보내지 않는다
    expect(onSubmit).not.toHaveBeenCalled();

    await user.type(input, 'VIP 보여줘');
    await user.keyboard('{Enter}'); // 이제 보낸다
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('Composer — 한 줄 알약 구성', () => {
  it('왼쪽부터 첨부 · 입력 · 모드 · 마이크 · 보내기 순으로 놓인다', () => {
    render(<Harness />);

    // 참조 디자인의 좌→우 순서를 DOM 순서로 고정한다 (보조기술의 읽기 순서이기도 하다)
    const shell = screen.getByRole('combobox', { name: '질문 입력' }).parentElement;
    expect(shell).not.toBeNull();
    const names = Array.from(shell?.querySelectorAll('button, input') ?? []).map((el) =>
      el.getAttribute('aria-label'),
    );
    expect(names).toEqual([
      '내용 첨부',
      '질문 입력',
      '응답 모드: 규칙 기반 조회',
      '음성 입력',
      '보내기',
    ]);
  });

  it('입력 placeholder 가 참조 문구다', () => {
    render(<Harness />);
    expect(screen.getByRole('combobox', { name: '질문 입력' }).getAttribute('placeholder')).toBe(
      '무엇을 알고 싶으세요?',
    );
  });
});

describe('Composer — 연결되지 않은 컨트롤은 사유와 함께 비활성이다 (FEEDBACK-03)', () => {
  // 이 화면에 대응 기능이 없는 두 컨트롤(첨부·음성)이 **눌리는 것처럼 보이지 않는지**를 고정한다.
  // 조용한 no-op 으로 되돌아가면 여기서 깨진다.
  it.each([['내용 첨부'], ['음성 입력']])(
    '%s 는 aria-disabled 이고 사유를 함께 노출한다',
    (name) => {
      render(<Harness />);
      const button = screen.getByRole('button', { name });

      expect(button.getAttribute('aria-disabled')).toBe('true');

      // 사유가 스크린리더에 닿아야 한다 — aria-describedby 가 실제 문장을 가리킨다
      const describedBy = button.getAttribute('aria-describedby');
      expect(describedBy).not.toBeNull();
      const reason = document.getElementById(describedBy ?? '');
      expect(reason?.textContent).toContain('아직 연결되지 않았어요');

      // 마우스 사용자에게도 같은 사유가 보인다
      expect(button.getAttribute('title')).toContain('아직 연결되지 않았어요');
    },
  );

  it('두 컨트롤에는 클릭 핸들러가 없어 눌러도 아무 일이 일어나지 않는다', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: '내용 첨부' }));
    await user.click(screen.getByRole('button', { name: '음성 입력' }));

    // 무엇도 보내지지 않았고 입력도 바뀌지 않았다
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: '질문 입력' })).toHaveProperty('value', '');
  });

  it('보내기 원형 버튼은 반대로 **실제로 동작한다** — 내용이 있을 때만 눌린다', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);

    const send = screen.getByRole('button', { name: '보내기' });
    // 빈 입력에서는 보낼 것이 없다
    expect(send).toHaveProperty('disabled', true);

    const input = screen.getByRole('combobox', { name: '질문 입력' });
    await user.click(input);
    await user.paste('@회원목록 VIP 보여줘');

    expect(send).toHaveProperty('disabled', false);
    await user.click(send);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('Composer — 한글 조합 중 Enter 는 보내지 않는다 (COMP-10)', () => {
  it('조합 중(isComposing)의 Enter 는 제출도 후보 선택도 하지 않는다', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSubmit={onSubmit} />);
    const input = screen.getByRole('combobox', { name: '질문 입력' });

    await user.click(input);
    await user.paste('@회원목록 VIP 뽑아줘');

    // 한글 마지막 글자를 확정하려고 누른 Enter — 조합 중이므로 보내면 안 된다.
    // (userEvent 는 isComposing 을 만들지 못하므로 실제 keydown 을 직접 쏜다.)
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', isComposing: true });
    expect(onSubmit).not.toHaveBeenCalled();

    // 조합이 끝난 뒤의 Enter 는 보낸다
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', isComposing: false });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});

describe('Composer — 응답 모드는 menu 다 (listbox 가 아니다)', () => {
  it('트리거가 현재 모드를 보여주고 aria-haspopup="menu" 를 갖는다', () => {
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: '응답 모드: 규칙 기반 조회' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // 보이는 글자는 짧은 이름이다(참조 디자인의 `빠른 ⌄` 모양) — 접근 가능한 이름은 위처럼 온전하다
    expect(trigger.textContent).toBe('규칙 기반');
  });

  it('열면 menu 가 뜨고, 모드 항목은 menuitemradio 다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: '응답 모드: 규칙 기반 조회' }));

    expect(screen.getByRole('menu', { name: '응답 모드' })).not.toBeNull();
    // 값 성격의 네 줄 — 단일 선택이므로 radio 다
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(4);
    // listbox 였다면 담을 수 없었을 명령 항목이 같은 표면에 있다
    expect(screen.getByRole('menuitem', { name: /질의 문법 도움말/ })).not.toBeNull();
  });

  it('동작하는 모드에만 체크가 있고, 나머지는 aria-disabled 다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: '응답 모드: 규칙 기반 조회' }));

    const items = screen.getAllByRole('menuitemradio');
    const checked = items.filter((item) => item.getAttribute('aria-checked') === 'true');
    expect(checked).toHaveLength(1);
    expect(checked[0]?.textContent).toContain('규칙 기반 조회');

    // 언어 모델이 없어 고를 수 없는 세 모드 — 지우지 않고 '미연결' 로 남긴다
    const disabled = items.filter((item) => item.getAttribute('aria-disabled') === 'true');
    expect(disabled).toHaveLength(3);
    for (const item of disabled) {
      expect(item.textContent).toContain('미연결');
    }
  });

  it('잠긴 모드는 어떤 프로바이더를 연동해야 하는지 말하고 설정 경로를 준다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: '응답 모드: 규칙 기반 조회' }));

    // 사유가 이름을 대야 한다 — '미연결' 만으로는 무엇을 할지 알 수 없다
    const note = screen.getByText(/중 하나를 연동하면 열려요/);
    expect(note.textContent).toContain('OpenAI');
    expect(note.textContent).toContain('Claude');
    // 규칙 기반은 연동 없이도 동작한다는 사실을 함께 밝힌다
    expect(note.textContent).toContain('규칙 기반 조회는 연동 없이도 동작해요');

    // 잠긴 항목이 그 사유를 aria-describedby 로 가리킨다
    const locked = screen.getByRole('menuitemradio', { name: '빠른 미연결 빠른 응답' });
    expect(locked.getAttribute('aria-describedby')).toBe(note.getAttribute('id'));

    // 갈 곳도 함께 준다
    const link = screen.getByRole('menuitem', { name: 'API Key 설정 열기' });
    expect(link.getAttribute('href')).toBe('/settings/api-keys');
  });

  it('프로바이더가 연동되면 세 모드가 실제로 선택 가능해진다', async () => {
    // 연동 상태를 켠다 — 화면 코드를 바꾸지 않고 상태만 바꾼다
    registerAiProviderLookup(() => [{ id: 'claude', label: 'Claude', enabled: true }]);

    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: '응답 모드: 규칙 기반 조회' }));

    // '미연결' 배지가 사라지고 잠금도 풀린다
    expect(screen.queryByText('미연결')).toBeNull();
    const items = screen.getAllByRole('menuitemradio');
    for (const item of items) {
      expect(item.getAttribute('aria-disabled')).toBe('false');
    }

    // 연동됐다는 사실을 프로바이더 이름으로 말한다
    expect(screen.getByText(/Claude 연동됨/)).not.toBeNull();
    // 잠긴 것이 없으니 설정으로 보내는 줄도 없다
    expect(screen.queryByRole('menuitem', { name: 'API Key 설정 열기' })).toBeNull();

    // 그리고 실제로 골라진다 ('전문가' 는 헤비의 설명에도 나오므로 정확한 이름으로 집는다)
    await user.click(screen.getByRole('menuitemradio', { name: '전문가 깊게 생각' }));
    expect(screen.getByRole('button', { name: '응답 모드: 전문가' })).not.toBeNull();
  });

  it('비활성 모드를 눌러도 모드가 바뀌지 않는다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: '응답 모드: 규칙 기반 조회' }));
    // '전문가' 는 '헤비(전문가 팀)' 설명에도 나온다 — 정확한 이름으로 집는다
    await user.click(screen.getByRole('menuitemradio', { name: '전문가 미연결 깊게 생각' }));

    // 메뉴는 열린 채로 남고 트리거 라벨도 그대로다 — 고른 척하지 않는다
    expect(screen.getByRole('button', { name: '응답 모드: 규칙 기반 조회' })).not.toBeNull();
  });

  it('Escape 로 메뉴를 닫는다', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: '응답 모드: 규칙 기반 조회' }));
    expect(screen.queryByRole('menu')).not.toBeNull();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
