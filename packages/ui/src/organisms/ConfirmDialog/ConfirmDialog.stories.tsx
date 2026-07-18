// ConfirmDialog — Storybook 스토리 (CSF3 · Organisms/ConfirmDialog)
//
// argTypes 는 계약 생성물(generated/argtypes/ConfirmDialog.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix = intent(4) × busy(2) = 8 전수 + error 배너 + 커스텀 라벨 + blockedWhen + Dark.
// onConfirm·onCancel 은 계약 밖 명령형 props 라 Story args 로 직접 준다.
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { ConfirmDialogArgTypes } from '../../../generated/argtypes/ConfirmDialog.argtypes';
import { ConfirmDialog } from './ConfirmDialog';

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Dialogs & Overlays/ConfirmDialog',
  component: ConfirmDialog,
  argTypes: { ...ConfirmDialogArgTypes },
  args: {
    intent: 'delete',
    title: '항목을 삭제할까요?',
    message: '이 작업은 되돌릴 수 없습니다.',
    confirmLabel: '',
    cancelLabel: '취소',
    busy: false,
    error: '',
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

/* ── combinationMatrix: intent(4) × busy(2) 전수 ─────────────────────────── */

/** create · default — primary 톤, 기본 라벨 '만들기' */
export const CreateDefault: Story = {
  args: { intent: 'create', title: '그룹을 만들까요?', message: '새 그룹이 생성됩니다.' },
};
/** create · busy — 확인 버튼 잠금 + '처리 중…' */
export const CreateBusy: Story = {
  args: {
    intent: 'create',
    title: '그룹을 만들까요?',
    message: '새 그룹이 생성됩니다.',
    busy: true,
  },
};
/** update · default — primary 톤, 기본 라벨 '저장' */
export const UpdateDefault: Story = {
  args: {
    intent: 'update',
    title: '변경 사항을 저장할까요?',
    message: '수정한 내용을 저장합니다.',
  },
};
/** update · busy */
export const UpdateBusy: Story = {
  args: {
    intent: 'update',
    title: '변경 사항을 저장할까요?',
    message: '수정한 내용을 저장합니다.',
    busy: true,
  },
};
/** delete · default — danger 톤, 기본 라벨 '삭제' */
export const DeleteDefault: Story = {
  args: { intent: 'delete' },
};
/** delete · busy */
export const DeleteBusy: Story = {
  args: { intent: 'delete', busy: true },
};
/** discard · default — danger 톤, 기본 라벨 '나가기' */
export const DiscardDefault: Story = {
  args: {
    intent: 'discard',
    title: '저장하지 않고 나갈까요?',
    message: '입력한 내용이 사라집니다.',
  },
};
/** discard · busy */
export const DiscardBusy: Story = {
  args: {
    intent: 'discard',
    title: '저장하지 않고 나갈까요?',
    message: '입력한 내용이 사라집니다.',
    busy: true,
  },
};

/* ── 부가 상태 ─────────────────────────────────────────────────────────────── */

/** error — 본문 아래 danger 배너. 확인 버튼이 되살아나 재클릭이 곧 재시도다 */
export const WithError: Story = {
  args: { intent: 'delete', error: '삭제에 실패했습니다. 다시 시도하세요.' },
};

/** 커스텀 확인 라벨 — intent 기본 라벨을 덮어쓴다 (대상을 밝힐 때) */
export const CustomConfirmLabel: Story = {
  args: { intent: 'delete', confirmLabel: '회원 삭제' },
};

/** busy 중 확인 발화 차단 (계약 onConfirm.blockedWhen: busy) */
export const BlockedWhenBusyOnConfirm: Story = {
  name: 'ConfirmDialog: busy 상태에서 onConfirm 이 발화하지 않는다',
  args: { intent: 'delete', busy: true },
  play: async ({ args }) => {
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    const confirm = within(dialog).getByRole('button', { name: '처리 중…' });
    await expect(confirm).toBeDisabled();
    await userEvent.click(confirm);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** 취소 — onCancel 이 호출된다 (busy 여부와 무관하게 살아 있다) */
export const CancelFires: Story = {
  args: { intent: 'delete', busy: true },
  play: async ({ args }) => {
    const dialog = document.querySelector('[role="dialog"]') as HTMLElement;
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    await expect(args.onCancel).toHaveBeenCalled();
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { intent: 'delete' },
  decorators: [
    (StoryFn) => (
      <div data-theme="dark">
        <StoryFn />
      </div>
    ),
  ],
};
