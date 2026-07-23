// Checkbox — Storybook 스토리 (CSF3)
//
// [고정 IA — Button 기준] 스토리 name 에 '/' 를 써서 사이드바에서 States·Examples·Interaction 로 묶는다.
// 조합을 낱개로 폭발시키지 않되, 의미 있는 상태(States)와 쓰임(Examples)·인터랙션(Interaction)은 나눈다.
// argTypes 는 계약 생성물 spread(수기 금지 — G5). hover·focus-visible 규칙 검증은 Checkbox.test.tsx 소유.
import { useEffect, useState, type CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { CheckboxArgTypes } from '../../../generated/argtypes/Checkbox.argtypes';
import { Checkbox } from './Checkbox';
import type { CheckboxProps } from '../../../generated/types/Checkbox.types';

/** 제어 컴포넌트라 스토리에서 checked 를 실제로 토글해 보여준다 (계약: 비제어 미지원) */
function ControlledCheckbox(args: CheckboxProps) {
  const [checked, setChecked] = useState(args.checked);
  useEffect(() => setChecked(args.checked), [args.checked]);
  return (
    <Checkbox
      {...args}
      checked={checked}
      onChange={(event) => {
        setChecked(event.target.checked);
        args.onChange?.(event);
      }}
    />
  );
}

const meta: Meta<typeof Checkbox> = {
  title: 'Design System/Components/Checkbox',
  component: Checkbox,
  argTypes: { ...CheckboxArgTypes },
  args: {
    id: 'remember-me',
    label: '로그인 상태 유지',
    checked: false,
    disabled: false,
    onChange: fn(),
  },
  render: (args) => <ControlledCheckbox {...args} />,
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

const rtlStyle: CSSProperties = { padding: 'var(--tds-space-5)' };

/** Overview — 대표 쓰임새(미체크 상태). Controls 에서 checked·disabled 를 바꿔 본다 */
export const Overview: Story = { args: { checked: false } };

/* ── States ─────────────────────────────────────────────────────────────── */

export const Checked: Story = { name: 'States/Checked', args: { checked: true } };

export const Disabled: Story = {
  name: 'States/Disabled',
  args: { checked: false, disabled: true },
};

export const CheckedDisabled: Story = {
  name: 'States/Checked Disabled',
  args: { checked: true, disabled: true },
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/** 긴 라벨 — 체크박스와 여러 줄 라벨의 상단 정렬 확인 */
export const LongLabel: Story = {
  name: 'Examples/Long Label',
  args: {
    checked: true,
    label:
      '개인정보 수집·이용에 동의해요 (수집 항목: 이름·이메일·연락처 / 보유 기간: 회원 탈퇴 시까지)',
  },
  parameters: { layout: 'padded' },
};

/** name — 폼 제출 키(LoginForm: rememberEmail). 빈 문자열이면 속성을 부여하지 않는다 */
export const WithName: Story = {
  name: 'Examples/With Name',
  args: { checked: true, name: 'rememberEmail' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('checkbox')).toHaveAttribute(
      'name',
      'rememberEmail',
    );
  },
};

/** 라벨 클릭이 히트 영역 — 라벨을 눌러 토글된다 (htmlFor={id}) */
export const LabelClick: Story = {
  name: 'Examples/Label Click',
  args: { checked: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('로그인 상태 유지'));

    await expect(canvas.getByRole('checkbox')).toBeChecked();
  },
};

/** RTL — 논리 속성이라 체크박스가 라벨의 오른쪽에 온다(문서 방향만 뒤집는다) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { checked: true },
  decorators: [
    (Story) => (
      <div dir="rtl" style={rtlStyle}>
        <Story />
      </div>
    ),
  ],
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 활성 상태에서는 클릭이 onChange 를 발화한다 (아래 비발생 단언이 공허하지 않음을 보인다) */
export const OnChangeEnabled: Story = {
  name: 'Interaction/Enabled Change',
  args: { checked: false, disabled: false },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('checkbox'));

    await expect(args.onChange).toHaveBeenCalledTimes(1);
  },
};

/** disabled 면 컨트롤·라벨 어느 히트 경로로도 onChange 가 발화하지 않는다 (계약 blockedWhen) */
export const OnChangeDisabled: Story = {
  name: 'Interaction/Disabled Change',
  args: { checked: false, disabled: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);

    await userEvent.click(canvas.getByRole('checkbox'), { pointerEventsCheck: 0 });
    await userEvent.click(canvas.getByText('로그인 상태 유지'), { pointerEventsCheck: 0 });

    await expect(args.onChange).not.toHaveBeenCalled();
    await expect(canvas.getByRole('checkbox')).not.toBeChecked();
  },
};
