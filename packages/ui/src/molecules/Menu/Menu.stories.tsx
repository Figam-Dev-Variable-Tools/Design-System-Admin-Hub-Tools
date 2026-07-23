// Menu — Storybook 스토리 (CSF3 · Overlay 계열)
//
// [고정 IA — Overlay 계열] Docs · Overview · Playground · States(Closed·Open) · Content ·
// Examples(실제 사용) · Accessibility(Keyboard Navigation·Focus Management·RTL) · Interaction.
// align×trigger 세부 조합은 낱개 스토리로 폭발시키지 않고 Playground Controls 로 넘긴다.
// 계약 states 전수(hover·focus-visible 등)·키보드 축은 Menu.test.tsx 가 소유한다.
//
// argTypes 는 계약 생성물(generated/argtypes/Menu.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// items 는 데이터 prop 이라 control 비활성 — Story args 로 직접 준다 (ADR-0003).
//
// [팝업이 잘리지 않게] 팝업은 absolute 라 부모의 높이를 넘어선다. 스토리마다 아래쪽 여백을
// 확보하는 프레임으로 감싼다 — 안 그러면 Docs 캔버스에서 잘려 나온다.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { MenuArgTypes } from '../../../generated/argtypes/Menu.argtypes';
import { Menu } from './Menu';

const MEMBER_ACTIONS = [
  { id: 'notify', label: '알림 발송' },
  { id: 'export', label: '내보내기' },
  { id: 'delete', label: '회원 삭제', danger: true },
];

/** 팝업이 캔버스 아래로 넘치지 않도록 아래쪽 여백을 확보한다 */
const popupFrame: Decorator = (Story) => (
  <div style={{ paddingBlockEnd: 'calc(var(--tds-space-10) * 2)' }}>
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div
    dir="rtl"
    style={{ padding: 'var(--tds-space-5)', paddingBlockEnd: 'calc(var(--tds-space-10) * 2)' }}
  >
    <Story />
  </div>
);

const meta: Meta<typeof Menu> = {
  title: 'Design System/Components/Menu',
  component: Menu,
  argTypes: { ...MenuArgTypes },
  args: {
    label: '명재우 회원 액션',
    items: MEMBER_ACTIONS,
    align: 'end',
    trigger: 'more-horizontal',
    onSelect: fn(),
    onOpenChange: fn(),
  },
  decorators: [popupFrame],
  parameters: {
    layout: 'padded',
    // 팝업은 absolute 라 Docs 인라인 미리보기 블록을 넘쳐 잘리고 겹친다. Docs 임베드는 각 스토리를
    // 독립 iframe 으로 렌더해 팝업을 그 안에 담고 스토리끼리 겹치지 않게 한다.
    docs: { story: { inline: false, height: '22rem' } },
  },
};

export default meta;

type Story = StoryObj<typeof Menu>;

/** 트리거는 접근 가능한 이름으로 집는다 — 라벨을 바꾸는 스토리는 이름을 넘긴다 */
const triggerOf = (canvasElement: HTMLElement, name = '명재우 회원 액션') =>
  within(canvasElement).getByRole('button', { name });

/* ── Overview ───────────────────────────────────────────────────────────── */

/** Overview — 대표 쓰임새(회원 행 액션, 닫힌 트리거). Controls 에서 align·trigger 를 바꿔 본다 */
export const Overview: Story = {};

/* ── Playground ─────────────────────────────────────────────────────────── */

/** Playground — align·trigger·label 을 Controls 로 바꿔 전 조합을 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** 닫힘 — 트리거만 있고 팝업은 없다. aria-haspopup=menu · aria-expanded=false */
export const Closed: Story = {
  name: 'States/Closed',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const trigger = triggerOf(canvasElement);
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  },
};

/** 열림 — 팝업이 열려 role=menu 가 label 로 이름을 갖고 각 명령이 menuitem 이다 */
export const Open: Story = {
  name: 'States/Open',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(triggerOf(canvasElement));
    await expect(canvas.getByRole('menu', { name: '명재우 회원 액션' })).not.toBeNull();
    await expect(canvas.getAllByRole('menuitem')).toHaveLength(3);
  },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 긴 콘텐츠 — 라벨이 길어도 항목이 무너지지 않는다 */
export const LongContent: Story = {
  name: 'Content/Long Content',
  args: {
    items: [
      { id: 'export', label: '이번 달 신규 가입 회원 전체 정보를 CSV 파일로 내보내기' },
      { id: 'memo', label: '운영자 전용 장기 미접속 회원 관리 메모 남기기' },
      { id: 'suspend', label: '약관 위반으로 계정 이용을 영구 정지해요', danger: true },
    ],
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.click(triggerOf(canvasElement));
  },
};

/** 많은 항목 — 명령이 많을 때의 세로 목록 */
export const ManyItems: Story = {
  name: 'Content/Many Items',
  args: {
    items: [
      { id: 'notify', label: '알림 발송' },
      { id: 'export', label: '회원 정보 내보내기 (CSV)' },
      { id: 'grade', label: '등급 변경' },
      { id: 'memo', label: '운영 메모 남기기' },
      { id: 'suspend', label: '계정 이용 정지', danger: true },
      { id: 'delete', label: '회원 삭제', danger: true },
    ],
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.click(triggerOf(canvasElement));
  },
};

/** 파괴적 명령 포함 — danger 는 붉은 글자이되 라벨 문구가 '삭제' 를 말한다(색만으로 의미 전달 금지) */
export const WithDangerItem: Story = {
  name: 'Content/With Danger Item',
  args: {
    items: [
      { id: 'view', label: '연동 상세' },
      { id: 'delete', label: '회원 삭제', danger: true },
    ],
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(triggerOf(canvasElement));
    await expect(canvas.getByRole('menuitem', { name: '회원 삭제' })).toHaveClass(
      'tds-menu__item--danger',
    );
  },
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/** 좌측 툴바 — align=start. 논리 속성이라 RTL 에서 자동으로 뒤집힌다 */
export const LeftToolbar: Story = {
  name: 'Examples/Left Toolbar',
  args: { align: 'start' },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.click(triggerOf(canvasElement));
  },
};

/** 세로 트리거 — trigger=more-vertical. 같은 글리프를 CSS 로 90도 돌려 쓴다 */
export const VerticalTrigger: Story = {
  name: 'Examples/Vertical Trigger',
  args: { trigger: 'more-vertical' },
};

/** 잠긴 명령 — 지우지 않고 잠그고 **이유를 적는다**. '아직'과 '없음'은 다른 사실이다 */
export const LockedActions: Story = {
  name: 'Examples/Locked Actions',
  args: {
    label: '구글 로그인 더보기',
    trigger: 'more-vertical',
    items: [
      { id: 'view', label: '연동 상세' },
      { id: 'edit', label: '설정 수정', disabledReason: '발송이 끝난 뒤에 바꿀 수 있어요' },
      { id: 'unlink', label: '연동 해제', danger: true, disabledReason: '권한이 없어요' },
    ],
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(triggerOf(canvasElement, '구글 로그인 더보기'));
    const locked = canvas.getByRole('menuitem', { name: '설정 수정' });
    await expect(locked).toHaveAttribute('aria-disabled', 'true');
    // 잠근 이유가 항목에 이어져 있다 — 잠긴 버튼만 있으면 왜인지 알 길이 없다
    await expect(locked).toHaveAttribute('aria-describedby');
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/**
 * 키보드로 연다 — 이 컴포넌트를 승격한 이유 그 자체다(출처 구현 둘 중 약한 쪽엔 화살표가 없었다).
 * 닫힌 트리거에서 ArrowDown 이 곧바로 열고 첫 항목으로 간다.
 */
export const KeyboardNavigation: Story = {
  name: 'Accessibility/Keyboard Navigation',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const trigger = triggerOf(canvasElement);

    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');

    trigger.focus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(true);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(canvas.getByRole('menuitem', { name: '알림 발송' })).toHaveFocus();
  },
};

/**
 * 포커스 관리 — 열리면 첫 항목이 포커스를 받고, Escape 로 닫으면 **트리거로 되돌아온다**.
 * 다만 명령 실행으로 닫힐 때는 되돌리지 않는다 — 그 명령이 연 다이얼로그에서 포커스를 빼앗지 않게.
 */
export const FocusManagement: Story = {
  name: 'Accessibility/Focus Management',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = triggerOf(canvasElement);

    await userEvent.click(trigger);
    await expect(canvas.getByRole('menuitem', { name: '알림 발송' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    await expect(trigger).toHaveFocus();

    // 명령 실행으로 닫힐 때는 트리거로 포커스를 되돌리지 않는다
    await userEvent.click(trigger);
    await userEvent.click(canvas.getByRole('menuitem', { name: '알림 발송' }));
    await expect(trigger).not.toHaveFocus();
  },
};

/** RTL — align 이 논리 속성이라 팝업이 반대 모서리로 붙는다(문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: {
    label: '회원 액션',
    items: [
      { id: 'notify', label: '알림 발송' },
      { id: 'export', label: '내보내기' },
      { id: 'delete', label: '회원 삭제', danger: true },
    ],
  },
  decorators: [rtlFrame],
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    await userEvent.click(triggerOf(canvasElement, '회원 액션'));
  },
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 트리거를 누르면 팝업이 열리고 onOpenChange(true) 가 발화한다 */
export const InteractionOpen: Story = {
  name: 'Interaction/Open',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(triggerOf(canvasElement));
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(true);
    await expect(canvas.getByRole('menu', { name: '명재우 회원 액션' })).not.toBeNull();
  },
};

/** 화살표·Home/End 로 항목 사이를 순환 이동한다 */
export const InteractionArrowNavigation: Story = {
  name: 'Interaction/Arrow Navigation',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(triggerOf(canvasElement));
    await expect(canvas.getByRole('menuitem', { name: '알림 발송' })).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('menuitem', { name: '내보내기' })).toHaveFocus();
    await userEvent.keyboard('{ArrowUp}');
    await expect(canvas.getByRole('menuitem', { name: '알림 발송' })).toHaveFocus();

    await userEvent.keyboard('{End}');
    await expect(canvas.getByRole('menuitem', { name: '회원 삭제' })).toHaveFocus();
    await userEvent.keyboard('{Home}');
    await expect(canvas.getByRole('menuitem', { name: '알림 발송' })).toHaveFocus();
  },
};

/** Escape 는 팝업을 닫고 onOpenChange(false) 가 발화한다 */
export const InteractionEscapeClose: Story = {
  name: 'Interaction/Escape Close',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(triggerOf(canvasElement));
    await userEvent.keyboard('{Escape}');
    await expect(canvas.queryByRole('menu')).toBeNull();
    await expect(args.onOpenChange).toHaveBeenLastCalledWith(false);
  },
};

/** 항목을 누르면 onSelect(id) 가 발화하고 팝업이 닫힌다 */
export const InteractionSelectItem: Story = {
  name: 'Interaction/Select Item',
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(triggerOf(canvasElement));
    await userEvent.click(canvas.getByRole('menuitem', { name: '알림 발송' }));
    await expect(args.onSelect).toHaveBeenCalledWith('notify');
    await expect(canvas.queryByRole('menu')).toBeNull();
  },
};
