// RowActions — Storybook 스토리 (CSF3 · Molecules/RowActions)
//
// argTypes 는 계약 생성물(generated/argtypes/RowActions.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(disabled = 2) + states(default/hover/focus-visible/disabled) +
//           events.onEdit/onDelete.blockedWhen(disabled) 전수 + 조건부 렌더 + Dark/RTL.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { RowActionsArgTypes } from '../../../generated/argtypes/RowActions.argtypes';
import { RowActions } from './RowActions';

const meta: Meta<typeof RowActions> = {
  title: 'Molecules/RowActions',
  component: RowActions,
  argTypes: { ...RowActionsArgTypes },
  args: {
    label: '공지 제목',
    disabled: false,
    onEdit: fn(),
    onDelete: fn(),
  },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof RowActions>;

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

/* ── combinationMatrix 전수 (disabled = 2) ─────────────────────────────────── */

/** 활성 — 수정 + 삭제 */
export const Enabled: Story = { args: { disabled: false } };

/** 잠금 — 진행 중(삭제 요청 등) */
export const Disabled: Story = { args: { disabled: true } };

/* ── 계약 events.blockedWhen(disabled) 전수 검증 ───────────────────────────── */

/** RowActions: disabled 에서 onEdit/onDelete 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabled: Story = {
  name: 'RowActions: disabled 상태에서 액션이 발화하지 않는다',
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '공지 제목 수정' }), {
      pointerEventsCheck: 0,
    });
    await userEvent.click(canvas.getByRole('button', { name: '공지 제목 삭제' }), {
      pointerEventsCheck: 0,
    });
    await expect(args.onEdit).not.toHaveBeenCalled();
    await expect(args.onDelete).not.toHaveBeenCalled();
  },
};

/** RowActions: 활성 상태에서는 발화한다 (비발생 단언이 공허하지 않음을 보인다) */
export const FiresWhenEnabled: Story = {
  name: 'RowActions: 활성 상태에서는 액션이 발화한다',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '공지 제목 수정' }));
    await expect(args.onEdit).toHaveBeenCalled();
    await userEvent.click(canvas.getByRole('button', { name: '공지 제목 삭제' }));
    await expect(args.onDelete).toHaveBeenCalled();
  },
};

/** 삭제만 — onEdit 미지정(읽기 전용 행)이면 연필이 없다 (prop 부재를 리터럴 render 로 보인다) */
export const DeleteOnly: Story = {
  name: 'RowActions: onEdit 미지정이면 연필 버튼이 없다',
  render: () => <RowActions label="공지 제목" onDelete={fn()} />,
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).queryByRole('button', { name: '공지 제목 수정' }),
    ).toBeNull();
    await expect(
      within(canvasElement).getByRole('button', { name: '공지 제목 삭제' }),
    ).not.toBeNull();
  },
};

/** Dark */
export const DarkTheme: Story = { decorators: [darkFrame] };

/** RTL */
export const RightToLeft: Story = { decorators: [rtlFrame] };
