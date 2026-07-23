// ConfirmDialog — Storybook 스토리 (CSF3 · Overlay 계열)
//
// [고정 IA — Overlay 계열] Docs · Overview · Playground · Variants(intent 톤: Create·Update=primary /
// Delete·Discard=danger) · States(Loading·Error) · Content(Long Message·Minimal) ·
// Examples(Custom Confirm Label) · Accessibility(Focus Trap·Keyboard·RTL) ·
// Interaction(Confirm·Cancel·Escape Close).
// States 의 Closed·Open 은 생략한다 — 마운트가 곧 '열림'이고 닫히면 렌더되지 않으므로(계약 states =
// default·loading·error). intent×busy 세부 조합은 낱개로 폭발시키지 않고 Playground Controls 로 넘긴다.
//
// argTypes 는 계약 생성물(generated/argtypes/ConfirmDialog.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// onConfirm·onCancel 은 계약 밖 명령형 props 라 Story args 로 직접 준다.
//
// [portal] 다이얼로그는 Modal 을 통해 document.body 로 포탈된다 — play 는 canvas 가 아니라 document 를 조회한다.
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, waitFor, within } from '@storybook/test';

import { ConfirmDialogArgTypes } from '../../../generated/argtypes/ConfirmDialog.argtypes';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * RTL — 다이얼로그는 body 로 포탈되므로 데코레이터 div 의 dir 은 닿지 않는다. 문서 루트에 dir 을
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

const meta: Meta<typeof ConfirmDialog> = {
  title: 'Design System/Components/ConfirmDialog',
  component: ConfirmDialog,
  argTypes: { ...ConfirmDialogArgTypes },
  args: {
    intent: 'delete',
    title: '항목을 삭제할까요?',
    message: '되돌릴 수 없어요.',
    confirmLabel: '',
    cancelLabel: '취소',
    busy: false,
    error: '',
    onConfirm: fn(),
    onCancel: fn(),
  },
  parameters: {
    layout: 'fullscreen',
    // 다이얼로그는 body 로 포탈된다 — Docs 에서 여러 스토리를 인라인으로 겹쳐 열면 페이지를
    // 가린다. Docs 임베드는 각 스토리를 독립 iframe 으로 렌더해 포탈을 그 안에 가둔다.
    docs: { story: { inline: false, height: '27.5rem' } },
  },
};

export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

/** 포탈된 다이얼로그를 문서에서 집는다 — 다이얼로그는 canvasElement 밖(body)에 렌더된다 */
const dialogInDocument = () =>
  waitFor(() => {
    const dialog = document.querySelector('[role="dialog"]');
    if (dialog === null) throw new Error('dialog not yet mounted');
    return dialog as HTMLElement;
  });

/* ── Overview ───────────────────────────────────────────────────────────── */

/** Overview — 대표 쓰임새. 되돌릴 수 없는 삭제 확인(danger 톤, 기본 라벨 '삭제') */
export const Overview: Story = {};

/* ── Playground ─────────────────────────────────────────────────────────── */

/** Playground — intent·busy·error·confirmLabel 을 Controls 로 바꿔 전 조합을 본다 */
export const Playground: Story = {};

/* ── Variants ───────────────────────────────────────────────────────────── */

/** 생성 — primary 톤, 기본 라벨 '만들기' */
export const CreateDefault: Story = {
  name: 'Variants/Create',
  args: { intent: 'create', title: '그룹을 만들까요?', message: '새 그룹이 생성돼요.' },
};

/** 수정 — primary 톤, 기본 라벨 '저장' */
export const UpdateDefault: Story = {
  name: 'Variants/Update',
  args: {
    intent: 'update',
    title: '변경 사항을 저장할까요?',
    message: '수정한 내용을 저장해요.',
  },
};

/** 삭제 — danger 톤, 기본 라벨 '삭제' */
export const DeleteDefault: Story = {
  name: 'Variants/Delete',
  args: { intent: 'delete' },
};

/** 이탈 — danger 톤, 기본 라벨 '나가기' */
export const DiscardDefault: Story = {
  name: 'Variants/Discard',
  args: {
    intent: 'discard',
    title: '저장하지 않고 나갈까요?',
    message: '입력한 내용이 사라져요.',
  },
};

/* ── States ─────────────────────────────────────────────────────────────── */

/**
 * Loading — busy 면 확인 버튼이 비활성(aria-busy)되고 라벨이 '처리 중…' 으로 바뀌어 중복 클릭을 막는다
 * (계약 onConfirm.blockedWhen: busy). 취소는 살아 있다.
 */
export const BlockedWhenBusyOnConfirm: Story = {
  name: 'States/Loading',
  args: { intent: 'delete', busy: true },
  play: async ({ args }) => {
    const dialog = await dialogInDocument();
    const confirm = within(dialog).getByRole('button', { name: '처리 중…' });
    await expect(confirm).toBeDisabled();
    await expect(confirm).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(confirm);
    await expect(args.onConfirm).not.toHaveBeenCalled();
  },
};

/** Error — 본문 아래 danger 배너(Alert). 확인 버튼이 되살아나 재클릭이 곧 재시도다 */
export const WithError: Story = {
  name: 'States/Error',
  args: { intent: 'delete', error: '삭제에 실패했어요. 다시 시도하세요.' },
  play: async () => {
    const dialog = await dialogInDocument();
    await expect(within(dialog).getByRole('alert')).toHaveTextContent(
      '삭제에 실패했어요. 다시 시도하세요.',
    );
    // 실패는 다이얼로그를 닫지 않는다 — 확인 버튼은 계속 눌린다
    await expect(within(dialog).getByRole('button', { name: '삭제' })).toBeEnabled();
  },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 긴 확인 문구 — 문장이 길어도 본문이 무너지지 않고 확인/취소 액션이 유지된다 */
export const LongMessage: Story = {
  name: 'Content/Long Message',
  args: {
    intent: 'delete',
    title: '회원을 삭제할까요?',
    message:
      '이 회원과 연결된 모든 주문 내역·적립 포인트·문의 기록이 함께 삭제돼요. 삭제 후에는 어떤 방법으로도 데이터를 복구할 수 없으니 신중하게 확인해 주세요.',
  },
};

/** 최소 확인 문구 — 가장 단순한 한 줄 확인 */
export const MinimalMessage: Story = {
  name: 'Content/Minimal',
  args: { intent: 'discard', title: '나갈까요?', message: '변경 내용이 저장되지 않아요.' },
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/** 커스텀 확인 라벨 — intent 기본 라벨('삭제')을 덮어써 대상을 밝힌다('회원 삭제') */
export const CustomConfirmLabel: Story = {
  name: 'Examples/Custom Confirm Label',
  args: { intent: 'delete', confirmLabel: '회원 삭제' },
  play: async () => {
    const dialog = await dialogInDocument();
    await expect(within(dialog).getByRole('button', { name: '회원 삭제' })).not.toBeNull();
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/**
 * 포커스 트랩 — 열리면 다이얼로그 안으로 포커스가 들어가고 aria-modal 로 배경을 격리한다.
 * 마지막 요소에서 Tab 하면 포커스가 다이얼로그 안으로 되감긴다(트랩 순환은 Modal.test.tsx 가 전수 소유).
 */
export const FocusTrap: Story = {
  name: 'Accessibility/Focus Trap',
  play: async () => {
    const dialog = await dialogInDocument();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));

    // 마지막 요소(확인)에서 Tab → 포커스가 다이얼로그 밖으로 새지 않는다
    within(dialog).getByRole('button', { name: '삭제' }).focus();
    await userEvent.tab();
    await expect(dialog.contains(document.activeElement)).toBe(true);
  },
};

/** 키보드 조작 — 확인 버튼에 포커스를 두고 Enter 를 누르면 onConfirm 이 발화한다(포인터 없이도 확인 가능) */
export const Keyboard: Story = {
  name: 'Accessibility/Keyboard',
  play: async ({ args }) => {
    const dialog = await dialogInDocument();
    const confirm = within(dialog).getByRole('button', { name: '삭제' });
    confirm.focus();
    await expect(confirm).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

/** RTL — 논리 속성으로 그려지므로 문서 dir=rtl 에서 헤더·푸터가 자동으로 뒤집힌다(문구는 한국어) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  decorators: [rtlFrame],
  args: {
    intent: 'delete',
    title: '항목을 삭제할까요?',
    message: '되돌릴 수 없어요.',
  },
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 확인 버튼 클릭 — onConfirm 이 한 번 발화한다 */
export const InteractionConfirm: Story = {
  name: 'Interaction/Confirm',
  args: { intent: 'delete' },
  play: async ({ args }) => {
    const dialog = await dialogInDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '삭제' }));
    await expect(args.onConfirm).toHaveBeenCalledTimes(1);
  },
};

/** 취소 버튼 클릭 — onCancel 이 발화한다 (busy 중에도 취소는 살아 있다) */
export const CancelFires: Story = {
  name: 'Interaction/Cancel',
  args: { intent: 'delete', busy: true },
  play: async ({ args }) => {
    const dialog = await dialogInDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: '취소' }));
    await expect(args.onCancel).toHaveBeenCalled();
  },
};

/** Escape — 다이얼로그가 닫힘을 요청하고 onCancel 이 발화한다 (계약 a11y keyboard: Escape) */
export const InteractionEscapeClose: Story = {
  name: 'Interaction/Escape Close',
  play: async ({ args }) => {
    const dialog = await dialogInDocument();
    dialog.focus();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(args.onCancel).toHaveBeenCalled());
  },
};
