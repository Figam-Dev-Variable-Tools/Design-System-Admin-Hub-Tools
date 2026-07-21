// Modal — Storybook 스토리 (CSF3 · Overlay 계열)
//
// [고정 IA — Overlay 계열] Docs · Overview · Playground · Content(Long Content·Minimal) ·
// Examples(실제 사용: With Icon·Form Modal) · Accessibility(Focus Trap·RTL) ·
// Interaction(Escape Close·Close Button·Backdrop Close).
// States(Closed·Open)는 생략한다 — 모달은 마운트가 곧 '열림'이고 닫히면 렌더되지 않으므로
// 'Closed' 는 상태가 아니고 'Open' 은 Overview 가 이미 보인다(계약 states = open 하나).
//
// argTypes 는 계약 생성물(generated/argtypes/Modal.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// onClose·onSubmit·initialFocusRef 는 계약 밖 명령형 props 라 argTypes 에 없다 — Story args 로 직접 준다.
//
// [portal] 모달은 document.body 로 포탈된다 — play 는 canvas 가 아니라 document 를 조회한다.
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';

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

/**
 * RTL — 모달은 body 로 포탈되므로 데코레이터 div 의 dir 은 닿지 않는다. 문서 루트에 dir 을
 * 걸어 포탈된 다이얼로그까지 논리 속성이 뒤집히게 한다(스토리를 벗어나면 원복). 문구는 한국어.
 */
/** 문서 루트에 dir 을 걸었다 스토리를 벗어나면 원복하는 래퍼 — 훅은 컴포넌트 안에서만(rules-of-hooks) */
function RtlDocumentDir({ children }: { children: ReactNode }) {
  useEffect(() => {
    const prev = document.documentElement.getAttribute('dir');
    document.documentElement.setAttribute('dir', 'rtl');
    return () => {
      if (prev === null) document.documentElement.removeAttribute('dir');
      else document.documentElement.setAttribute('dir', prev);
    };
  }, []);
  return <>{children}</>;
}

const rtlFrame: Decorator = (Story) => (
  <RtlDocumentDir>
    <Story />
  </RtlDocumentDir>
);

const meta: Meta<typeof Modal> = {
  title: 'Design System/Components/Modal',
  component: Modal,
  argTypes: { ...ModalArgTypes },
  args: {
    title: '모달 제목',
    icon: null,
    children: <p style={{ margin: 0 }}>모달 본문 — 확인 문구나 폼 필드가 들어간다.</p>,
    footer: Footer,
    onClose: fn(),
  },
  parameters: {
    layout: 'fullscreen',
    // 모달은 body 로 포탈된다 — Docs 에서 여러 스토리를 인라인으로 겹쳐 열면 페이지를 가린다.
    // Docs 임베드는 각 스토리를 독립 iframe 으로 렌더해 포탈을 그 안에 가둔다.
    docs: { story: { inline: false, height: '27.5rem' } },
  },
};

export default meta;

type Story = StoryObj<typeof Modal>;

/** 포탈된 다이얼로그를 문서에서 집는다 — 모달은 canvasElement 밖(body)에 렌더된다 */
const dialogInDocument = () =>
  waitFor(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog === null) throw new Error('dialog not yet mounted');
    return dialog as HTMLElement;
  });

/* ── Overview ───────────────────────────────────────────────────────────── */

/** Overview — 대표 쓰임새. 제목 + 본문 + 오른쪽 정렬 푸터 액션 */
export const Overview: Story = {};

/* ── Playground ─────────────────────────────────────────────────────────── */

/** Playground — title·children·footer 를 Controls 로 바꿔 본다 */
export const Playground: Story = {};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 긴 본문 — 다이얼로그가 최대 높이에서 스크롤된다 */
export const LongContent: Story = {
  name: 'Content/Long Content',
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

/** 최소 콘텐츠 — 짧은 확인 문구 + 확인 버튼 하나(가장 단순한 알림 모달) */
export const Minimal: Story = {
  name: 'Content/Minimal',
  args: {
    title: '저장했습니다',
    children: <p style={{ margin: 0 }}>변경 사항이 반영되었습니다.</p>,
    footer: <button type="button">확인</button>,
  },
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/** 아이콘 슬롯 — 제목 왼쪽에 의도(삭제) 아이콘이 붙는다 */
export const WithIcon: Story = {
  name: 'Examples/With Icon',
  args: { title: '항목을 삭제할까요?', icon: <TrashGlyph /> },
};

/** 폼 모달 — onSubmit 을 주면 본문/푸터를 <form> 으로 감싸 Enter 로 확인이 동작한다 */
export const AsForm: Story = {
  name: 'Examples/Form Modal',
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

/* ── Accessibility ──────────────────────────────────────────────────────── */

/**
 * 포커스 트랩 — 열리면 첫 포커스 가능 요소(닫기 버튼)로 포커스가 가고, aria-modal 로 배경을 격리한다.
 * 마지막 요소에서 Tab 하면 포커스가 다이얼로그 안으로 되감긴다(트랩 순환은 Modal.test.tsx 가 전수 소유).
 */
export const FocusTrap: Story = {
  name: 'Accessibility/Focus Trap',
  play: async () => {
    const dialog = await dialogInDocument();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');

    const closeBtn = within(dialog).getByRole('button', { name: '닫기' });
    await expect(closeBtn).toHaveFocus();

    // 마지막 요소에서 Tab → 포커스가 다이얼로그 밖으로 새지 않는다
    within(dialog).getByRole('button', { name: '확인' }).focus();
    await userEvent.tab();
    await expect(dialog.contains(document.activeElement)).toBe(true);
  },
};

/** RTL — 논리 속성으로 그려지므로 문서 dir=rtl 에서 헤더·푸터가 자동으로 뒤집힌다(문구는 한국어) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  decorators: [rtlFrame],
  args: {
    title: '항목을 삭제할까요?',
    icon: <TrashGlyph />,
    children: <p style={{ margin: 0 }}>이 작업은 되돌릴 수 없습니다.</p>,
  },
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** Esc 로 닫힌다 — onClose 가 호출된다 (계약 a11y keyboard: Escape) */
export const ClosesOnEscape: Story = {
  name: 'Interaction/Escape Close',
  play: async ({ args }) => {
    const dialog = await dialogInDocument();
    dialog.focus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

/** 닫기 버튼(×) 클릭 — onClose 가 호출된다 */
export const ClosesOnCloseButton: Story = {
  name: 'Interaction/Close Button',
  play: async ({ args }) => {
    const dialog = await dialogInDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '닫기' }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

/** 딤(backdrop) 클릭 — 바깥 포인터다운으로 onClose 가 호출된다 */
export const BackdropClose: Story = {
  name: 'Interaction/Backdrop Close',
  play: async ({ args }) => {
    await dialogInDocument();
    const backdrop = document.querySelector('.tds-modal__backdrop') as HTMLElement;
    await expect(backdrop).not.toBeNull();
    await userEvent.click(backdrop);
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};
