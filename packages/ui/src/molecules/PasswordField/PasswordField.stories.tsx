// PasswordField — Storybook 스토리 (CSF3 · Molecules/PasswordField)
//
// argTypes 는 계약 생성물(generated/argtypes/PasswordField.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(state 5: default/hover/focus-visible/disabled/error) 전수
//           + boolean(disabled·required·revealed) true/false + Dark/RTL.
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { PasswordFieldArgTypes } from '../../../generated/argtypes/PasswordField.argtypes';
import { PasswordField } from './PasswordField';
import type { PasswordFieldProps } from '../../../generated/types/PasswordField.types';

/** 제어 컴포넌트 — 값은 스토리가 잡고, revealed 는 컴포넌트가 소유한다(계약) */
function ControlledPasswordField(args: PasswordFieldProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <PasswordField
      {...args}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        args.onChange?.(event);
      }}
    />
  );
}

const meta: Meta<typeof PasswordField> = {
  title: 'Inputs/PasswordField',
  component: PasswordField,
  argTypes: { ...PasswordFieldArgTypes },
  args: {
    id: 'password',
    label: '비밀번호',
    value: 'hunter2-secret',
    error: '',
    disabled: false,
    required: false,
    revealed: false,
    onChange: fn(),
    onBlur: fn(),
    onToggleReveal: fn(),
  },
  render: (args) => <ControlledPasswordField {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof PasswordField>;

const inputOf = (canvasElement: HTMLElement) => canvasElement.querySelector('input');

/**
 * play 컨텍스트 — 구조 분해를 파라미터에서 하지 않는다.
 *
 * [왜 이렇게 쓰는가] 테스트 커버리지의 정적 스캐너는 `play: hover` 같은 **참조형 play** 를
 * 모듈 스코프 함수 본문까지 따라가 단언을 센다. 그런데 파라미터에서 구조 분해하면
 * (`async ({ canvasElement }) => {`) 스캐너가 선언 직후의 첫 `{` 를 **함수 본문으로 오인**해
 * 구조 분해 괄호를 본문으로 잡고, 진짜 본문의 expect 를 보지 못한다.
 * 단언은 존재하는데 보이지 않는 것 — 그것도 초록불 위조와 같은 결과를 낸다.
 * 그래서 파라미터를 통째로 받고 본문에서 꺼내 쓴다 (동작은 동일하다).
 */
interface PlayCtx {
  readonly canvasElement: HTMLElement;
}

const hover = async (ctx: PlayCtx) => {
  const input = inputOf(ctx.canvasElement);
  await expect(input).not.toBeNull();
  await userEvent.hover(input as HTMLInputElement);
  await expect(input).toBeEnabled();
};

const focusVisible = async (ctx: PlayCtx) => {
  const input = inputOf(ctx.canvasElement);
  await userEvent.tab();
  input?.focus();
  await expect(input).toHaveFocus();
};

const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{ background: 'var(--tds-color-surface-default)', padding: 'var(--tds-space-5)' }}
  >
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** default — 숨김 상태(type=password) + 눈 아이콘 */
export const Default: Story = {
  args: { revealed: false },
};

/** hover — 입력 위에 포인터 */
export const Hover: Story = {
  args: { revealed: false },
  play: hover,
};

/** focus-visible — 키보드 포커스 */
export const FocusVisible: Story = {
  args: { revealed: false },
  play: focusVisible,
};

/** disabled — 입력·토글 모두 차단 (onChange/onToggleReveal 발화 금지) */
export const Disabled: Story = {
  args: { disabled: true },
};

/** error — aria-invalid + aria-describedby 연결 (테두리 danger + 메시지) */
export const Error: Story = {
  args: { value: 'abc', error: '8자 이상, 숫자와 특수문자를 포함해야 합니다.' },
};

/** revealed=true — 평문(type=text) + 눈 감김 아이콘 + aria-pressed=true */
export const Revealed: Story = {
  args: { revealed: true },
};

/** required=true — native required(→ aria-required)만 붙는다. 라벨에 마커(*)를 주입하지 않는다 (계약) */
export const RequiredField: Story = {
  args: { required: true },
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);

    await expect(input).toBeRequired();
    await expect(within(canvasElement).getByLabelText('비밀번호')).toBe(input);
  },
};

/** required=false */
export const OptionalField: Story = {
  args: { required: false },
};

/** 폼 표면 — name · autoComplete · placeholder 를 자식 TextField 로 내려보낸다 (LoginForm 의 비밀번호) */
export const FormSurface: Story = {
  args: {
    value: '',
    name: 'password',
    autoComplete: 'current-password',
    placeholder: '비밀번호를 입력하세요',
  },
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);

    await expect(input).toHaveAttribute('name', 'password');
    await expect(input).toHaveAttribute('autocomplete', 'current-password');
    await expect(input).toHaveAttribute('placeholder', '비밀번호를 입력하세요');
  },
};

/** 토글 클릭 — 표시/숨김이 전환되고 입력값·커서 위치가 유지된다 */
export const ToggleReveal: Story = {
  args: { revealed: false },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = inputOf(canvasElement);

    await expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(canvas.getByRole('button', { name: '비밀번호 표시' }));

    await expect(input).toHaveAttribute('type', 'text');
    await expect(input).toHaveValue('hunter2-secret'); // 전환 후에도 입력값이 유지된다
    await expect(args.onToggleReveal).toHaveBeenCalledTimes(1);
  },
};

/* ── 계약 events.blockedWhen 전수 검증 (onChange · onToggleReveal — 둘 다 disabled) ──── */

/** PasswordField: disabled 상태에서 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabledOnChange: Story = {
  name: 'PasswordField: disabled 상태에서 onChange 가 발화하지 않는다',
  args: { disabled: true, value: 'hunter2-secret' },
  play: async ({ canvasElement, args }) => {
    const input = inputOf(canvasElement);

    // disabled 입력에는 타이핑이 도달하지 않는다 — change 를 직접 디스패치해 차단 로직을 시험한다
    await userEvent.type(input as HTMLInputElement, 'xyz', { pointerEventsCheck: 0 });
    input?.dispatchEvent(new Event('change', { bubbles: true }));

    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/** PasswordField: disabled 상태에서 onToggleReveal 이 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabledOnToggleReveal: Story = {
  name: 'PasswordField: disabled 상태에서 onToggleReveal 이 발화하지 않는다',
  args: { disabled: true, value: 'hunter2-secret' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = inputOf(canvasElement);

    await userEvent.click(canvas.getByRole('button', { name: '비밀번호 표시' }), {
      pointerEventsCheck: 0,
    });

    await expect(args.onToggleReveal).not.toHaveBeenCalled();
    // 차단은 콜백뿐 아니라 상태 전환에도 적용된다 — 여전히 가려져 있어야 한다
    await expect(input).toHaveAttribute('type', 'password');
  },
};

/** PasswordField: disabled 상태에서 onBlur 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabledOnBlur: Story = {
  name: 'PasswordField: disabled 상태에서 onBlur 가 발화하지 않는다',
  args: { disabled: true, value: 'hunter2-secret' },
  play: async ({ canvasElement, args }) => {
    const input = inputOf(canvasElement);

    // disabled 입력은 클릭·탭으로 포커스를 받지 못한다 — blur/focusout 을 직접 디스패치해
    // 컴포넌트의 차단 로직 자체를 시험한다 (브라우저의 포커스 규칙만 시험하면 단언이 공허해진다).
    input?.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
    input?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await userEvent.click(canvasElement);

    await expect(args.onBlur).not.toHaveBeenCalled();
  },
};

/** PasswordField: 활성 상태에서는 onBlur 가 발화한다 — 위 비발생 단언이 공허하지 않음을 보인다 */
export const OnBlurFiresWhenEnabled: Story = {
  name: 'PasswordField: 활성 상태에서는 onBlur 가 발화한다',
  args: { disabled: false, value: 'hunter2-secret' },
  play: async ({ canvasElement, args }) => {
    inputOf(canvasElement)?.focus();
    await userEvent.tab();

    await expect(args.onBlur).toHaveBeenCalled();
  },
};

/** disabled + error — 두 상태가 겹칠 때의 표현 */
export const DisabledWithError: Story = {
  args: { disabled: true, error: '비밀번호가 만료되었습니다.' },
};

/** 최대 콘텐츠 — 긴 라벨 + 긴 에러 (토글 버튼과 텍스트가 겹치지 않아야 한다) */
export const LongContent: Story = {
  args: {
    label: '새 비밀번호 (직전 3회에 사용한 비밀번호는 재사용할 수 없습니다)',
    value: 'a-very-long-password-value-to-check-trailing-slot-overlap-behaviour',
    error:
      '비밀번호는 8자 이상이어야 하며 영문 대소문자·숫자·특수문자를 각각 1자 이상 포함해야 합니다. 최근 3회 이내에 사용한 비밀번호는 다시 사용할 수 없습니다.',
    revealed: true,
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { revealed: true },
  decorators: [darkFrame],
};

/** RTL — 토글 버튼이 논리 속성(inset-inline-end)을 따라 좌측으로 간다 */
export const RightToLeft: Story = {
  args: { label: 'كلمة المرور', value: 'كلمة-سر' },
  decorators: [rtlFrame],
};
