// Toast — Storybook 스토리 (CSF3 · Molecules/Toast)
//
// argTypes 는 계약 생성물(generated/argtypes/Toast.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix = 4 (kind enum: success/cancelled/error/info). + 재시도 · Dark.
// id·onDismiss·onRetry 는 계약 밖 명령형 props 라 Story args 로 직접 준다.
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { ToastArgTypes } from '../../../generated/argtypes/Toast.argtypes';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Feedback/Toast',
  component: Toast,
  argTypes: { ...ToastArgTypes },
  args: {
    id: 'toast-1',
    kind: 'info',
    message: '작업이 완료되었습니다',
    onDismiss: fn(),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Toast>;

/** success — polite 라이브 영역으로 간다(분배는 ToastProvider) · 4초 자동소멸 */
export const Success: Story = {
  args: { kind: 'success', message: '회원 3명을 삭제했습니다.' },
};

/** cancelled — 2초 자동소멸. '눌렸다'는 확인 */
export const Cancelled: Story = {
  args: { kind: 'cancelled', message: '작업이 취소되었습니다' },
};

/** error — assertive 라이브 영역으로 간다(분배는 ToastProvider) · 자동소멸 없음 */
export const Error: Story = {
  args: { kind: 'error', message: '삭제에 실패했습니다.' },
};

/** info — 4초 자동소멸 */
export const Info: Story = {
  args: { kind: 'info', message: '변경 사항이 저장되었습니다' },
};

/** error + 재시도 — onRetry 를 주면 '다시 시도' 버튼이 붙는다 (누르면 닫고 재시도) */
export const ErrorWithRetry: Story = {
  args: { kind: 'error', message: '삭제에 실패했습니다.', onRetry: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const retry = canvas.getByRole('button', { name: '다시 시도' });
    await userEvent.click(retry);
    await expect(args.onRetry).toHaveBeenCalled();
    await expect(args.onDismiss).toHaveBeenCalledWith('toast-1');
  },
};

/** 닫기(×) — onDismiss 가 이 토스트의 id 로 호출된다 */
export const CloseButton: Story = {
  args: { kind: 'error', message: '삭제에 실패했습니다.' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '알림 닫기' }));
    await expect(args.onDismiss).toHaveBeenCalledWith('toast-1');
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { kind: 'success', message: '회원 3명을 삭제했습니다.' },
  decorators: [
    (StoryFn) => (
      <div data-theme="dark" style={{ padding: 'var(--tds-space-5)' }}>
        <StoryFn />
      </div>
    ),
  ],
};
