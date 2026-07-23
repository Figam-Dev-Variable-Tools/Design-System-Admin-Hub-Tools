// TextField — Storybook 스토리 (CSF3)
//
// [고정 IA — Form 계열] type×state 조합을 낱개로 폭발시키지 않는다. type 은 Controls 로 바꾸고,
// 대표 상태만 그룹으로 남긴다(Button 기준 IA · Behavior 금지 → Interaction):
//   Overview · Playground · Types/ · States/ · Form/ · Content/ · Accessibility/RTL · Interaction/
// 상태 규칙(hover·focus-visible) 검증은 TextField.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent } from '@storybook/test';

import { TextFieldArgTypes } from '../../../generated/argtypes/TextField.argtypes';
import { TextField } from './TextField';
import type { TextFieldProps } from '../../../generated/types/TextField.types';

/** 제어 컴포넌트 — 스토리에서 실제로 입력이 되도록 값을 로컬 상태로 잡는다 */
function ControlledTextField(args: TextFieldProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <TextField
      {...args}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        args.onChange?.(event);
      }}
    />
  );
}

/** password/number 는 role 이 textbox 가 아니므로 DOM 으로 직접 집는다 */
const inputOf = (canvasElement: HTMLElement) => canvasElement.querySelector('input');

const meta: Meta<typeof TextField> = {
  title: 'Design System/Components/TextField',
  component: TextField,
  argTypes: { ...TextFieldArgTypes },
  args: {
    id: 'email',
    label: '이메일',
    value: '',
    type: 'text',
    error: '',
    disabled: false,
    required: false,
    placeholder: 'name@company.com',
    onChange: fn(),
    onBlur: fn(),
  },
  render: (args) => <ControlledTextField {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof TextField>;

/** Overview — 대표 쓰임새. 라벨 + 값이 채워진 단일행 입력 */
export const Overview: Story = { args: { value: 'name@company.com' } };

/** Playground — Controls 에서 type·error·disabled·required 를 바꿔 전 조합을 여기서 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** hover — 포인터를 올린 상태(테두리 강조 규칙) */
export const Hover: Story = {
  name: 'States/Hover',
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);
    if (input === null) return;
    await userEvent.hover(input);
    await expect(input).toBeEnabled();
  },
};

/** focus-visible — 키보드(Tab)로 포커스가 들어오면 포커스 링이 뜬다 */
export const FocusVisible: Story = {
  name: 'States/Focus Visible',
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);
    if (input === null) return;
    await userEvent.tab();
    input.focus();
    await expect(input).toHaveFocus();
  },
};

/** disabled — 입력이 잠긴다 */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { disabled: true, value: 'name@company.com' },
};

/** error — 메시지가 aria-describedby 로 입력에 연결되고 테두리가 danger 로 바뀐다 */
export const Error: Story = {
  name: 'States/Error',
  args: { value: 'invalid-email', error: '올바른 이메일 형식이 아니에요.' },
};

/* ── Types ──────────────────────────────────────────────────────────────── */

export const TypeText: Story = {
  name: 'Types/Text',
  args: { label: '이름', type: 'text', placeholder: '홍길동' },
};

export const TypeEmail: Story = { name: 'Types/Email', args: { label: '이메일', type: 'email' } };

export const TypePassword: Story = {
  name: 'Types/Password',
  args: { label: '비밀번호', type: 'password', placeholder: '', value: 'secret1234' },
};

export const TypeNumber: Story = {
  name: 'Types/Number',
  args: { label: '수량', type: 'number', placeholder: '0', inputMode: 'numeric' },
};

/* ── Form ────────────────────────────────────────────────────────────────── */

/** 필수 입력 — required 가 라벨에 표식을 붙이고 aria-required 를 켠다 */
export const Required: Story = {
  name: 'Form/Required',
  args: { label: '이메일', required: true },
};

/** 선택 입력 — required 없이 라벨에 '(선택)' 을 명시하는 관례 */
export const Optional: Story = {
  name: 'Form/Optional',
  args: { label: '회사명 (선택)', placeholder: '스페이스플래닝' },
};

/** 폼 배경 위 — surface.raised 컨테이너 안에서의 대비를 본다 */
export const FormSurface: Story = {
  name: 'Form/Form Surface',
  decorators: [
    (Story) => (
      <div
        style={{
          background: 'var(--tds-color-surface-raised)',
          padding: 'var(--tds-space-5)',
          borderRadius: 'var(--tds-radius-md)',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 최소 콘텐츠 — 짧은 라벨·빈 값 */
export const MinimalContent: Story = {
  name: 'Content/Minimal Content',
  args: { label: '코드', placeholder: '' },
};

/** 긴 콘텐츠 — 긴 값이 입력 폭을 넘어도 깨지지 않는다 */
export const LongContent: Story = {
  name: 'Content/Long Content',
  args: {
    label: '설명',
    value:
      '아주 긴 값이 입력 폭을 넘어가도 잘리거나 레이아웃을 밀지 않고 가로로 스크롤된다 — 이 문장이 그 확인이다',
  },
};

/** trailing 슬롯 — 입력 오른쪽에 단위·아이콘·버튼 같은 완성 요소를 붙인다 */
export const TrailingContent: Story = {
  name: 'Content/Trailing Content',
  args: {
    label: '금액',
    type: 'number',
    value: '15000',
    trailing: <span style={{ color: 'var(--tds-color-text-muted)' }}>원</span>,
  },
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 활성 상태에서 포커스를 잃으면 onBlur 가 발화한다 */
export const BlurEnabled: Story = {
  name: 'Interaction/Enabled Blur',
  play: async ({ canvasElement, args }) => {
    const input = inputOf(canvasElement);
    if (input === null) return;
    input.focus();
    await userEvent.tab();

    await expect(args.onBlur).toHaveBeenCalledTimes(1);
  },
};

/** disabled 면 포커스를 받지 못하므로 onBlur 도 발화하지 않는다 (계약 blockedWhen) */
export const BlurDisabled: Story = {
  name: 'Interaction/Disabled Blur',
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const input = inputOf(canvasElement);
    if (input === null) return;

    await expect(input).toBeDisabled();
    await userEvent.click(input, { pointerEventsCheck: 0 });
    await userEvent.tab();

    await expect(args.onBlur).not.toHaveBeenCalled();
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성이라 라벨·입력·trailing 의 좌우가 문서 방향을 따른다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { label: '이메일', value: 'name@company.com' },
  decorators: [
    ((Story) => (
      <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
        <Story />
      </div>
    )) as Decorator,
  ],
};
