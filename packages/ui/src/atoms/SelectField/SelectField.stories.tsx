// SelectField — Storybook 스토리 (CSF3 · Atoms/SelectField)
//
// [고정 IA — Form 계열] isInvalid·disabled·required 를 낱개 조합으로 폭발시키지 않는다. 나머지는
// Controls 로 바꾸고, 대표 상태만 그룹으로 남긴다(Button 기준 IA · Behavior 금지 → Interaction):
//   Overview · Playground · States/ · Form/ · Content/ · Accessibility/RTL · Interaction/
// Select 는 입력 타입(Text·Email·…)이 없으므로 Types 그룹은 생략한다.
// 상태 규칙(focus-visible·error 테두리) 검증은 SelectField.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';

import { SelectFieldArgTypes } from '../../../generated/argtypes/SelectField.argtypes';
import { SelectField } from './SelectField';

/** 대표 옵션 — 포인트 구분(적립/차감). 호출부가 <option> 을 그대로 넣는다(raw <select> 와 동일) */
const OPTIONS = (
  <>
    <option value="grant">적립</option>
    <option value="deduct">차감</option>
  </>
);

const meta: Meta<typeof SelectField> = {
  title: 'Design System/Components/SelectField',
  component: SelectField,
  argTypes: { ...SelectFieldArgTypes },
  args: { isInvalid: false, disabled: false, required: false },
  render: (args) => (
    <SelectField {...args} aria-label="구분" defaultValue="grant">
      {OPTIONS}
    </SelectField>
  ),
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof SelectField>;

/** 구분 combobox 를 집는다 — 대표 render 는 aria-label="구분" 을 준다 */
const comboboxOf = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole('combobox', { name: '구분' }) as HTMLSelectElement;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** Overview — 대표 쓰임새. 네이티브 combobox 로 렌더되는 유효 상태의 단일 드롭다운 */
export const Overview: Story = { args: { isInvalid: false } };

/** Playground — Controls 에서 isInvalid·disabled·required 를 바꿔 전 조합을 여기서 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** focus-visible — 키보드(Tab)로 포커스가 들어오면 포커스 링이 뜬다 */
export const FocusVisible: Story = {
  name: 'States/Focus Visible',
  play: async ({ canvasElement }) => {
    const select = comboboxOf(canvasElement);
    await userEvent.tab();
    select.focus();
    await expect(select).toHaveFocus();
  },
};

/** disabled — native disabled 패스스루로 드롭다운이 잠긴다 */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(comboboxOf(canvasElement)).toBeDisabled();
  },
};

/** error(isInvalid) — 붉은(feedback.danger) 테두리 + aria-invalid (메시지는 감싸는 FormField 담당) */
export const Invalid: Story = {
  name: 'States/Error',
  args: { isInvalid: true },
  play: async ({ canvasElement }) => {
    // A11Y-05 — isInvalid 는 시각(테두리)만이 아니라 AT 에도 aria-invalid 로 알린다
    await expect(comboboxOf(canvasElement)).toHaveAttribute('aria-invalid', 'true');
  },
};

/* ── Form ────────────────────────────────────────────────────────────────── */

/** 필수 입력 — required 가 native required + aria-required 를 함께 낸다 (A11Y-11) */
export const Required: Story = {
  name: 'Form/Required',
  args: { required: true },
  play: async ({ canvasElement }) => {
    await expect(comboboxOf(canvasElement)).toHaveAttribute('aria-required', 'true');
  },
};

/** 선택 입력 — 필수가 아닐 때의 '전체' 중립 옵션(필터 드롭다운의 흔한 관례) */
export const Optional: Story = {
  name: 'Form/Optional',
  render: (args) => (
    <SelectField {...args} aria-label="구분" defaultValue="all">
      <option value="all">전체</option>
      <option value="grant">적립</option>
      <option value="deduct">차감</option>
    </SelectField>
  ),
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

/** 최소 콘텐츠 — 짧은 옵션 하나 */
export const MinimalContent: Story = {
  name: 'Content/Minimal Content',
  render: (args) => (
    <SelectField {...args} aria-label="구분" defaultValue="grant">
      <option value="grant">적립</option>
    </SelectField>
  ),
};

/** 긴 콘텐츠 — 선택 값이 컨트롤 폭을 넘어가도 잘리거나 레이아웃을 밀지 않는다 */
export const LongContent: Story = {
  name: 'Content/Long Content',
  render: (args) => (
    <SelectField {...args} aria-label="구분" defaultValue="long">
      <option value="long">
        아주 긴 옵션 라벨이 컨트롤 폭을 넘어가도 chevron 을 덮지 않고 말줄임으로 정리된다 — 이
        문장이 그 확인이다
      </option>
      <option value="short">짧은 옵션</option>
    </SelectField>
  ),
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성이라 값 텍스트·chevron 의 좌우가 문서 방향을 따른다 (한국어 콘텐츠) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  render: (args) => (
    <SelectField {...args} aria-label="구분" defaultValue="grant">
      {OPTIONS}
    </SelectField>
  ),
  decorators: [rtlFrame],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 무손실 드롭인 — 값을 고르면 네이티브로 선택되고 onChange 가 그 값과 함께 발화한다 */
export const SelectChange: Story = {
  name: 'Interaction/Enabled Change',
  play: async ({ canvasElement }) => {
    const select = comboboxOf(canvasElement);
    await userEvent.selectOptions(select, 'deduct');
    await expect(select.value).toBe('deduct');
  },
};

/** disabled 면 옵션을 고를 수 없어 선택이 바뀌지 않는다 (native disabled 패스스루) */
export const DisabledChange: Story = {
  name: 'Interaction/Disabled Change',
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const select = comboboxOf(canvasElement);
    await expect(select).toBeDisabled();
    await expect(select.value).toBe('grant');
  },
};
