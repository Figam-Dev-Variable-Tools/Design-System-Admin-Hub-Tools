// FormField — Storybook 스토리 (CSF3 · Molecules/FormField)
//
// argTypes 는 계약 생성물(generated/argtypes/FormField.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(required 2) 전수 + states(default/error) + counter/help + Dark/RTL.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';

import { FormFieldArgTypes } from '../../../generated/argtypes/FormField.argtypes';
import { FormField } from './FormField';

/** 자식 컨트롤 자리 — 껍데기가 감싸지 않고 그대로 렌더한다 */
const control = (
  <input
    id="demo-field"
    aria-label="control-probe"
    className="tds-formfield__demo-input"
    style={{
      boxSizing: 'border-box',
      inlineSize: '100%',
      paddingBlock: 'var(--tds-space-2)',
      paddingInline: 'var(--tds-space-3)',
      borderStyle: 'solid',
      borderWidth: 'var(--tds-border-width-thin)',
      borderColor: 'var(--tds-color-border-default)',
      borderRadius: 'var(--tds-radius-md)',
      background: 'var(--tds-color-surface-default)',
      color: 'var(--tds-color-text-default)',
    }}
  />
);

const meta: Meta<typeof FormField> = {
  title: 'Forms/FormField',
  component: FormField,
  argTypes: { ...FormFieldArgTypes },
  args: {
    htmlFor: 'demo-field',
    label: '제목',
    required: false,
    error: '',
    hint: '',
    counter: '',
    children: control,
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof FormField>;

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

/* ── combinationMatrix 전수 (required 2) ─────────────────────────────────── */

/** default — 힌트가 보이고 오류(role=alert)는 없다 */
export const Default: Story = {
  args: { required: false, hint: '최대 50자' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.getByText('최대 50자')).toBeVisible();
  },
};

/** error — role=alert 오류를 그리고 힌트 대신 표시한다 */
export const Error: Story = {
  name: 'FormField: error 상태 — role=alert 오류',
  args: { required: true, hint: '최대 50자', error: '필수 항목입니다' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('필수 항목입니다');
    await expect(canvas.queryByText('최대 50자')).toBeNull();
  },
};

/** required=false — 마커(*)가 없다 */
export const OptionalField: Story = {
  args: { required: false },
};

/** required=true — 라벨 옆 aria-hidden 마커(*) */
export const RequiredField: Story = {
  args: { required: true },
  play: async ({ canvasElement }) => {
    const marker = canvasElement.querySelector('.tds-formfield__required');
    await expect(marker).not.toBeNull();
    await expect(marker).toHaveAttribute('aria-hidden', 'true');
  },
};

/** counter — 우측 상단 글자수 */
export const WithCounter: Story = {
  args: { label: '본문', counter: '128/500' },
};

/** help — ⓘ 도움말 disclosure (HelpTip 조립) */
export const WithHelp: Story = {
  args: { label: '구분', help: <span>적립/차감 설명</span> },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '구분 설명' });
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { hint: '최대 50자' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { label: 'العنوان', hint: 'حد أقصى 50 حرفًا', counter: '12/50' },
  decorators: [rtlFrame],
};
