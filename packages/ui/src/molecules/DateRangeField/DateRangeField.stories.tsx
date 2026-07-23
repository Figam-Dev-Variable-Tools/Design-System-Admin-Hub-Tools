// DateRangeField — Storybook 스토리 (CSF3)
//
// [고정 IA — Form 계열] required×disabled 조합을 낱개로 폭발시키지 않는다. 조합은 Controls 로 돌려 보고,
// 대표 상태/상황만 그룹으로 남긴다(Button 기준 IA · Behavior 금지 → Interaction · Slot 금지 → Content):
//   Overview · Playground · States/ · Form/ · Content/ · Accessibility/ · Interaction/
// 상태 규칙(focus-visible·error 스타일) 검증은 DateRangeField.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, fn, userEvent, within } from '@storybook/test';

import { DateRangeFieldArgTypes } from '../../../generated/argtypes/DateRangeField.argtypes';
import { DateRangeField } from './DateRangeField';

/** 제어 컴포넌트 — 시작/종료 값은 스토리가 로컬 상태로 잡아 실제 입력이 반영되게 한다 */
function ControlledDateRangeField(args: ComponentProps<typeof DateRangeField>) {
  const [start, setStart] = useState(args.startValue);
  const [end, setEnd] = useState(args.endValue);
  useEffect(() => setStart(args.startValue), [args.startValue]);
  useEffect(() => setEnd(args.endValue), [args.endValue]);
  return (
    <DateRangeField
      {...args}
      startValue={start}
      endValue={end}
      onStartChange={(next) => {
        setStart(next);
        args.onStartChange?.(next);
      }}
      onEndChange={(next) => {
        setEnd(next);
        args.onEndChange?.(next);
      }}
    />
  );
}

const meta: Meta<typeof DateRangeField> = {
  title: 'Design System/Components/DateRangeField',
  component: DateRangeField,
  argTypes: { ...DateRangeFieldArgTypes },
  args: {
    label: '노출 기간',
    startValue: '2026-07-01',
    endValue: '2026-07-31',
    required: false,
    disabled: false,
    error: '',
    hint: '',
    onStartChange: fn(),
    onEndChange: fn(),
  },
  render: (args) => <ControlledDateRangeField {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof DateRangeField>;

/** 각 date 칸을 라벨로 집는다 — 그룹 라벨에서 파생한 숨김 라벨('… 시작일'·'… 종료일') */
const startInputOf = (canvasElement: HTMLElement) =>
  within(canvasElement).getByLabelText('노출 기간 시작일') as HTMLInputElement;
const endInputOf = (canvasElement: HTMLElement) =>
  within(canvasElement).getByLabelText('노출 기간 종료일') as HTMLInputElement;

/* ── Overview ───────────────────────────────────────────────────────────── */

/** Overview — 대표 쓰임새. 시작~종료 두 칸 + 보조 안내 힌트 */
export const Overview: Story = {
  args: { hint: '비워 두면 상시 노출돼요' },
};

/** Playground — Controls 에서 required·disabled·error·hint 를 바꿔 전 조합을 여기서 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** focus-visible — 키보드(Tab)로 시작일 칸에 포커스가 들어오면 포커스 링이 뜬다 */
export const FocusVisible: Story = {
  name: 'States/Focus Visible',
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(startInputOf(canvasElement)).toHaveFocus();
  },
};

/** disabled — 두 날짜 입력이 모두 native disabled 로 함께 잠긴다 */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    await expect(startInputOf(canvasElement)).toBeDisabled();
    await expect(endInputOf(canvasElement)).toBeDisabled();
  },
};

/** error — 오류 메시지가 role=alert 로 그려지고 두 입력이 danger 테두리 + aria-invalid 로 바뀐다 */
export const Error: Story = {
  name: 'States/Error',
  args: { error: '기간을 다시 확인해 주세요' },
};

/* ── Form ────────────────────────────────────────────────────────────────── */

/** 필수 입력 — 그룹 라벨에 마커(*)가 붙고 두 입력 각각에 native required + aria-required 가 켜진다 */
export const RequiredField: Story = {
  name: 'Form/Required',
  args: { required: true },
};

/** 선택 입력 — required 없이 라벨에 '(선택)' 을 명시하는 관례 */
export const Optional: Story = {
  name: 'Form/Optional',
  args: { label: '행사 기간 (선택)', startValue: '', endValue: '' },
};

/** 폼 배경 위 — surface.raised 컨테이너 안에서의 대비를 본다 */
export const FormSurface: Story = {
  name: 'Form/Form Surface',
  decorators: [
    ((Story) => (
      <div
        style={{
          background: 'var(--tds-color-surface-raised)',
          padding: 'var(--tds-space-5)',
          borderRadius: 'var(--tds-radius-md)',
        }}
      >
        <Story />
      </div>
    )) as Decorator,
  ],
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 최소 콘텐츠 — 짧은 라벨·빈 값 */
export const MinimalContent: Story = {
  name: 'Content/Minimal Content',
  args: { label: '기간', startValue: '', endValue: '' },
};

/** 긴 콘텐츠 — 라벨과 힌트가 길어져도 두 칸 레이아웃이 밀리거나 깨지지 않는다 */
export const LongContent: Story = {
  name: 'Content/Long Content',
  args: {
    label: '프로모션 노출 기간 (등록 시점부터 종료일 자정까지 상시 노출)',
    hint: '시작일과 종료일을 모두 비워 두면 저장 시점부터 별도 종료 없이 상시 노출돼요',
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성이라 라벨·두 칸·'~' 의 좌우가 문서 방향(rtl)을 따른다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { label: '노출 기간' },
  decorators: [
    ((Story) => (
      <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
        <Story />
      </div>
    )) as Decorator,
  ],
};

/** Keyboard — Tab 으로 시작일 → 종료일 순서로 포커스가 이동한다 */
export const KeyboardNavigation: Story = {
  name: 'Accessibility/Keyboard',
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(startInputOf(canvasElement)).toHaveFocus();
    await userEvent.tab();
    await expect(endInputOf(canvasElement)).toHaveFocus();
  },
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 활성 상태에서 날짜를 바꾸면 onStartChange·onEndChange 가 새 값(문자열)으로 발화한다 */
export const ChangeEnabled: Story = {
  name: 'Interaction/Enabled Change',
  play: async ({ canvasElement, args }) => {
    fireEvent.change(startInputOf(canvasElement), { target: { value: '2026-08-01' } });
    fireEvent.change(endInputOf(canvasElement), { target: { value: '2026-08-31' } });

    await expect(args.onStartChange).toHaveBeenCalledWith('2026-08-01');
    await expect(args.onEndChange).toHaveBeenCalledWith('2026-08-31');
  },
};

/** disabled 면 두 입력이 잠겨 값 변경이 막히고 onStartChange·onEndChange 가 발화하지 않는다 */
export const ChangeDisabled: Story = {
  name: 'Interaction/Disabled Change',
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const start = startInputOf(canvasElement);
    await expect(start).toBeDisabled();
    fireEvent.change(start, { target: { value: '2026-08-01' } });

    await expect(args.onStartChange).not.toHaveBeenCalled();
    await expect(args.onEndChange).not.toHaveBeenCalled();
  },
};

/** 종료<시작 위반 — 호출부 스키마가 error 로 내려준 상태. role=alert 로 사유를 알린다 */
export const RangeValidation: Story = {
  name: 'Interaction/Range Validation',
  args: {
    startValue: '2026-07-31',
    endValue: '2026-07-01',
    error: '종료일은 시작일 이후여야 해요',
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
      '종료일은 시작일 이후여야 해요',
    );
    await expect(startInputOf(canvasElement)).toHaveAttribute('aria-invalid', 'true');
  },
};
