// RichTextField — Storybook 스토리 (CSF3 · Molecules/RichTextField)
//
// argTypes 는 계약 생성물(generated/argtypes/RichTextField.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(required 2 × disabled 2 = 4) 전수 + states(default/focus-visible/disabled/error)
//           + events.onChange.blockedWhen(disabled) 비발생 + Dark/RTL + sanitize 시연.
//
// 에디터는 지연 로드되므로 play 함수는 findBy* 로 청크를 기다린 뒤 단언한다.
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { RichTextFieldArgTypes } from '../../../generated/argtypes/RichTextField.argtypes';
import { RichTextField } from './RichTextField';

/** 제어 컴포넌트 — 값은 스토리가 잡는다 (TextareaField 스토리와 같은 결) */
function ControlledRichTextField(args: ComponentProps<typeof RichTextField>) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <RichTextField
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

const SAMPLE_HTML =
  '<h2>제품 특징</h2><p>가벼운 충전재로 <strong>보온성</strong>과 <em>활동성</em>을 모두 잡았습니다.</p><ul><li>초경량 충전재</li><li>발수 가공</li></ul>';

const meta: Meta<typeof RichTextField> = {
  title: 'Molecules/RichTextField',
  component: RichTextField,
  argTypes: { ...RichTextFieldArgTypes },
  args: {
    label: '상세설명',
    value: SAMPLE_HTML,
    maxLength: 2000,
    required: false,
    disabled: false,
    error: '',
    hint: '',
    placeholder: '상품의 소재·핏·관리법 등 상세 정보를 입력하세요.',
    rows: 6,
    onChange: fn(),
  },
  render: (args) => <ControlledRichTextField {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof RichTextField>;

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

/* ── combinationMatrix 전수 (required 2 × disabled 2) ─────────────────────── */

/** default — 툴바 + 서식 있는 본문 + 평문 길이 카운터 */
export const Default: Story = {
  args: { required: false, disabled: false, hint: '최대 2000자 (서식은 글자 수에 세지 않습니다)' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('toolbar', { name: '본문 서식' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: '굵게' })).toBeEnabled();
  },
};

/** focus-visible — 키보드 포커스가 툴바 첫 버튼에 닿는다 */
export const FocusVisible: Story = {
  name: 'RichTextField: focus-visible 상태',
  args: { required: false, disabled: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('toolbar', { name: '본문 서식' });
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: '굵게' })).toHaveFocus();
  },
};

/** required=true / disabled=false */
export const RequiredField: Story = {
  args: { required: true, disabled: false },
};

/** disabled — 툴바 native disabled + 편집 불가 */
export const Disabled: Story = {
  args: { required: false, disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('button', { name: '굵게' })).toBeDisabled();
  },
};

/** required=true / disabled=true (조합 전수) */
export const RequiredDisabled: Story = {
  args: { required: true, disabled: true },
};

/** error — role=alert 오류 + 붉은 테두리 */
export const Error: Story = {
  name: 'RichTextField: error 상태',
  args: { value: '', error: '상세설명을 입력하세요' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
      '상세설명을 입력하세요',
    );
  },
};

/** blockedWhen — disabled 에서 툴바를 눌러도 onChange 가 발화하지 않는다 (스파이 비발생) */
export const BlockedWhenDisabledOnChange: Story = {
  name: 'RichTextField: disabled 상태에서 onChange 가 발화하지 않는다',
  args: { disabled: true, onChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const bold = await canvas.findByRole('button', { name: '굵게' });
    await userEvent.click(bold, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};

/** 굵게 토글이 aria-pressed 로 상태를 알린다 — 색만으로는 AT 에 닿지 않는다 */
export const ToolbarStateIsAnnounced: Story = {
  name: 'RichTextField: 툴바 켜짐이 aria-pressed 로 노출된다',
  args: {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bold = await canvas.findByRole('button', { name: '굵게' });
    await expect(bold).toHaveAttribute('aria-pressed', 'false');
  },
};

/** 빈 본문 — placeholder */
export const Empty: Story = {
  args: { value: '', hint: '본문이 비어 있으면 placeholder 를 그린다' },
};

/** sanitize — 저장된 값에 script/onerror 가 섞여 있어도 렌더 지점에서 걸러진다 */
export const SanitizesStoredValue: Story = {
  name: 'RichTextField: 오염된 저장 값을 렌더 지점에서 sanitize 한다',
  args: {
    value:
      '<p>정상 본문</p><script>alert(1)</script><img src="x" onerror="alert(2)"><p onclick="alert(3)">클릭 핸들러가 지워진 문단</p>',
    hint: 'script · onerror · onclick 이 모두 사라진 상태로 그려진다',
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole('toolbar', { name: '본문 서식' });
    await expect(canvasElement.innerHTML).not.toContain('onerror');
    await expect(canvasElement.innerHTML).not.toContain('alert(1)');
  },
};

/** 긴 본문 — 카운터가 상한에 가까워진 상태 */
export const LongContent: Story = {
  args: {
    value: `<p>${'이 상품은 매우 긴 상세설명을 담고 있어 카운터가 상한에 가까워진 상태를 보여 줍니다. '.repeat(6)}</p>`,
    hint: '최대 2000자',
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { hint: '최대 2000자' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: {
    label: 'الوصف',
    value: '<p>نص تجريبي للوصف</p>',
    placeholder: 'أدخل الوصف',
  },
  decorators: [rtlFrame],
};
