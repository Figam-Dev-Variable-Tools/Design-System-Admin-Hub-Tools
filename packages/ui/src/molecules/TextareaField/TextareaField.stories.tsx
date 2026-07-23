// TextareaField — Storybook 스토리 (CSF3 · Molecules/TextareaField)
//
// [고정 IA — Form 계열] 조합을 낱개로 폭발시키지 않는다(required×disabled 세부 조합은 Playground Controls).
// 대표 상태만 그룹으로 남긴다(Button 기준 IA · Behavior 금지 → Interaction · Slot 금지 → Content):
//   Overview · Playground · States/ · Form/ · Content/ · Accessibility/RTL · Interaction/
// 상태 규칙(focus-visible·disabled·error) 검증은 TextareaField.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { TextareaFieldArgTypes } from '../../../generated/argtypes/TextareaField.argtypes';
import { TextareaField } from './TextareaField';

/** 제어 컴포넌트 — 값은 스토리가 잡는다(onChange 는 새 문자열을 넘긴다) */
function ControlledTextareaField(args: ComponentProps<typeof TextareaField>) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <TextareaField
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof TextareaField> = {
  title: 'Design System/Components/TextareaField',
  component: TextareaField,
  argTypes: { ...TextareaFieldArgTypes },
  args: {
    label: '본문',
    value: '공지 본문 예시예요.',
    maxLength: 500,
    required: false,
    disabled: false,
    error: '',
    hint: '',
    placeholder: '내용을 입력하세요',
    rows: 6,
    onChange: fn(),
  },
  render: (args) => <ControlledTextareaField {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof TextareaField>;

/** Overview — 대표 쓰임새. 라벨 + 값이 채워진 여러 줄 입력 + 힌트 */
export const Overview: Story = { args: { value: '공지 본문 예시예요.', hint: '최대 500자' } };

/** Playground — Controls 에서 required·disabled·error·rows·maxLength 를 바꿔 전 조합을 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** disabled — native disabled 로 입력이 잠긴다 */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('textbox', { name: '본문' })).toBeDisabled();
  },
};

/** error — role=alert 오류가 뜨고 테두리가 danger 로 바뀐다 */
export const Error: Story = {
  name: 'States/Error',
  args: { value: '', error: '본문을 입력하세요' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent('본문을 입력하세요');
  },
};

/** focus-visible — 키보드(Tab)로 포커스가 들어오면 포커스 링이 뜬다 */
export const FocusVisible: Story = {
  name: 'States/Focus Visible',
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole('textbox', { name: '본문' })).toHaveFocus();
  },
};

/* ── Form ────────────────────────────────────────────────────────────────── */

/** 필수 입력 — required 가 라벨에 표식을 붙이고 textarea 에 native required + aria-required 를 잇는다 */
export const Required: Story = {
  name: 'Form/Required',
  args: { required: true },
};

/** 선택 입력 — required 없이 라벨에 '(선택)' 을 명시하는 관례 */
export const Optional: Story = {
  name: 'Form/Optional',
  args: { label: '비고 (선택)', value: '', placeholder: '자유롭게 입력하세요' },
};

/** 글자수 카운터 — FormField 우측에 'N/max' 형식으로 현재 길이를 보여 준다 */
export const Counter: Story = {
  name: 'Form/Counter',
  args: { value: '공지 본문 예시예요.', hint: '최대 500자' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText('12/500')).toBeVisible();
  },
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
  name: 'Content/Minimal',
  args: { label: '메모', value: '', placeholder: '' },
};

/** 긴 콘텐츠 — 긴 본문이 카운터 상한에 가까워지고 여러 줄로 흐른다 */
export const LongContent: Story = {
  name: 'Content/Long',
  args: {
    value: '이 공지는 매우 긴 본문을 담고 있어 카운터가 상한에 가까워진 상태를 보여 줘요. '.repeat(
      4,
    ),
    hint: '최대 500자',
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성이라 라벨·입력·카운터의 좌우가 문서 방향을 따른다(한국어 콘텐츠) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: {
    label: '메모',
    value: '오른쪽에서 왼쪽으로 읽는 문서 방향',
    placeholder: '내용을 입력하세요',
  },
  decorators: [
    ((Story) => (
      <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
        <Story />
      </div>
    )) as Decorator,
  ],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 활성 상태에서 타이핑하면 onChange 가 새 문자열로 발화한다 */
export const EnabledChange: Story = {
  name: 'Interaction/Enabled Change',
  args: { value: '', onChange: fn() },
  play: async ({ canvasElement, args }) => {
    const textarea = within(canvasElement).getByRole('textbox', { name: '본문' });
    await userEvent.type(textarea, '입력');
    await expect(args.onChange).toHaveBeenCalled();
  },
};

/** disabled 면 onChange 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabledOnChange: Story = {
  name: 'Interaction/Disabled Change',
  args: { value: '', disabled: true, onChange: fn() },
  play: async ({ canvasElement, args }) => {
    const textarea = within(canvasElement).getByRole('textbox', { name: '본문' });
    await userEvent.type(textarea, 'xyz', { pointerEventsCheck: 0 });
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};
