// Modal — Storybook 스토리 (CSF3 · Organisms/Modal)
//
// argTypes 는 계약 생성물(generated/argtypes/Modal.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix = 1 (enum/boolean prop 없음). 슬롯(icon) 최소/최대 · 폼 모달 · Dark 를 함께 노출한다.
// onClose·onSubmit·initialFocusRef 는 계약 밖 명령형 props 라 argTypes 에 없다 — Story args 로 직접 준다.
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor } from '@storybook/test';

import { ModalArgTypes } from '../../../generated/argtypes/Modal.argtypes';
import { Modal } from './Modal';

/** 의도 아이콘 예시 — 장식(aria-hidden). currentColor · 1.25em */
function TrashGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}

const Footer = (
  <>
    <button type="button">취소</button>
    <button type="button">확인</button>
  </>
);

const meta: Meta<typeof Modal> = {
  title: 'Organisms/Modal',
  component: Modal,
  argTypes: { ...ModalArgTypes },
  args: {
    title: '모달 제목',
    icon: null,
    children: <p style={{ margin: 0 }}>모달 본문 — 확인 문구나 폼 필드가 들어간다.</p>,
    footer: Footer,
    onClose: fn(),
  },
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof Modal>;

/** default — 제목 + 본문 + 오른쪽 정렬 푸터 액션 */
export const Default: Story = {};

/** 아이콘 슬롯 — 제목 왼쪽에 의도 아이콘이 붙는다 */
export const WithIcon: Story = {
  args: { title: '항목을 삭제할까요?', icon: <TrashGlyph /> },
};

/** 폼 모달 — onSubmit 을 주면 본문/푸터를 <form> 으로 감싸 Enter 로 확인이 동작한다 */
export const AsForm: Story = {
  args: {
    title: '그룹 만들기',
    onSubmit: fn(),
    children: (
      <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tds-space-1)' }}>
        그룹 이름
        <input type="text" defaultValue="" />
      </label>
    ),
  },
};

/** 긴 본문 — 다이얼로그가 최대 높이에서 스크롤된다 */
export const LongContent: Story = {
  args: {
    title: '약관 전문',
    children: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tds-space-3)' }}>
        {Array.from({ length: 12 }, (_, i) => (
          <p key={i} style={{ margin: 0 }}>
            제{i + 1}조 — 이 약관은 서비스 이용에 관한 조건과 절차, 회사와 회원의 권리·의무를
            규정합니다.
          </p>
        ))}
      </div>
    ),
  },
};

/** Esc 로 닫힌다 — onClose 가 호출된다 (계약 a11y keyboard: Escape) */
export const ClosesOnEscape: Story = {
  play: async ({ args }) => {
    const dialog = await waitFor(() => document.querySelector('[role="dialog"]') as HTMLElement);
    await expect(dialog).not.toBeNull();
    dialog.focus();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalled();
  },
};

/** 닫기 버튼 클릭 — onClose 가 호출된다 */
export const ClosesOnCloseButton: Story = {
  play: async ({ args }) => {
    const closeBtn = await waitFor(
      () => document.querySelector('[aria-label="닫기"]') as HTMLElement,
    );
    await userEvent.click(closeBtn);
    await expect(args.onClose).toHaveBeenCalled();
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { title: '항목을 삭제할까요?', icon: <TrashGlyph /> },
  parameters: { backgrounds: { default: 'dark' } },
  decorators: [
    (StoryFn) => (
      <div data-theme="dark">
        <StoryFn />
      </div>
    ),
  ],
};
