// Toast — Storybook 스토리 (CSF3 · Molecules/Toast)
//
// [고정 IA — Overlay 계열] Docs·Overview·Playground·Variants·Content·Accessibility·Interaction.
//   Variants  — 의미 톤(success·cancelled·error·info). 톤마다 문구·자동소멸·라이브 분배가 달라
//               한 화면 비교 대신 톤별 sub-story 로 둔다.
//   Content   — 콘텐츠 형태(긴 문구·액션 버튼).
//   Accessibility — 라이브 영역 소유 안 함(A11Y-01)·RTL.
//   Interaction   — 닫기(×) → onDismiss.
// argTypes 는 계약 생성물(generated/argtypes/Toast.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// id·onDismiss·onRetry 는 계약 밖 명령형 props 라 Story args 로 직접 준다.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { ToastArgTypes } from '../../../generated/argtypes/Toast.argtypes';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Design System/Components/Toast',
  component: Toast,
  argTypes: { ...ToastArgTypes },
  args: {
    id: 'toast-1',
    kind: 'info',
    message: '작업이 완료되었어요',
    onDismiss: fn(),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Toast>;

/** RTL 프레임 — 아이콘/문구/버튼 배치가 논리 속성대로 뒤집히는지 본다 */
const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** Overview — 실제 쓰임새 한눈에. 가장 흔한 결과 통지는 성공 확인이다 (4초 자동소멸) */
export const Overview: Story = {
  args: { kind: 'success', message: '회원 3명을 삭제했어요.' },
};

/** Playground — Controls 에서 kind·message 를 바꿔 톤·아이콘·자동소멸을 돌려 본다 */
export const Playground: Story = {};

/** success — polite 라이브 영역으로 간다(분배는 ToastProvider) · 4초 자동소멸 */
export const Success: Story = {
  name: 'Variants/Success',
  args: { kind: 'success', message: '회원 3명을 삭제했어요.' },
};

/** cancelled — 2초 자동소멸. '눌렸다'는 확인 (info 톤을 공유하되 아이콘·시간이 다르다) */
export const Cancelled: Story = {
  name: 'Variants/Cancelled',
  args: { kind: 'cancelled', message: '작업이 취소되었어요' },
};

/** error — assertive 라이브 영역으로 간다(분배는 ToastProvider) · 자동소멸 없음 */
export const Error: Story = {
  name: 'Variants/Error',
  args: { kind: 'error', message: '삭제에 실패했어요.' },
};

/** info — 4초 자동소멸 */
export const Info: Story = {
  name: 'Variants/Info',
  args: { kind: 'info', message: '변경 사항이 저장되었어요' },
};

/** 긴 문구 — 아이콘이 첫 줄에 정렬되고 문구만 줄바꿈되는지 (max-inline-size 안에서 wrap) */
export const LongMessage: Story = {
  name: 'Content/Long Message',
  args: {
    kind: 'info',
    message:
      '요청하신 대량 작업이 백그라운드에서 처리되고 있어요. 완료되면 다시 알려드리며, 그 전에 페이지를 벗어나도 작업은 계속돼요.',
  },
};

/** 액션 동반 — onRetry 를 주면 '다시 시도' 버튼이 붙는다 (누르면 닫고 재시도) */
export const ErrorWithRetry: Story = {
  name: 'Content/With Action',
  args: { kind: 'error', message: '삭제에 실패했어요.', onRetry: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const retry = canvas.getByRole('button', { name: '다시 시도' });
    await userEvent.click(retry);
    await expect(args.onRetry).toHaveBeenCalled();
    await expect(args.onDismiss).toHaveBeenCalledWith('toast-1');
  },
};

/**
 * 라이브 영역을 소유하지 않는다 (A11Y-01) — Toast 에는 role/aria-live 가 없다.
 * 동적 삽입 노드의 라이브 영역은 스크린리더가 신뢰성 있게 읽지 않아, 통지는 먼저·항상 존재하는
 * ToastProvider 의 지속 라이브 영역이 소유한다. Toast 는 시각 표현과 배선만 담당한다.
 */
export const AriaLiveRegion: Story = {
  name: 'Accessibility/ARIA live region',
  args: { kind: 'error', message: '삭제에 실패했어요.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const root = canvasElement.querySelector('.tds-toast');

    // 의도된 제거 — 결손이 아니다. 통지 소유는 ToastProvider 조립 층에 있다.
    await expect(root?.getAttribute('role')).toBeNull();
    await expect(root?.getAttribute('aria-live')).toBeNull();
    await expect(canvas.queryByRole('alert')).toBeNull();
    await expect(canvas.queryByRole('status')).toBeNull();
    // 닫기(×) 는 아이콘뿐이라 접근 가능한 이름을 aria-label 로 준다
    await expect(canvas.getByRole('button', { name: '알림 닫기' })).toBeInTheDocument();
  },
};

/** RTL — dir="rtl" 에서 아이콘·문구·닫기 버튼이 논리 속성대로 뒤집힌다 (한국어 콘텐츠) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { kind: 'info', message: '변경 사항이 저장되었어요' },
  decorators: [rtlFrame],
};

/** 닫기(×) — onDismiss 가 이 토스트의 id 로 호출된다 */
export const CloseButton: Story = {
  name: 'Interaction/Dismiss',
  args: { kind: 'error', message: '삭제에 실패했어요.' },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '알림 닫기' }));
    await expect(args.onDismiss).toHaveBeenCalledWith('toast-1');
  },
};
