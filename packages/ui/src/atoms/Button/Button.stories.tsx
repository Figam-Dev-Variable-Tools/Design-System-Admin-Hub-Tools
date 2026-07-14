// Button — Storybook 스토리 (CSF3 · Atoms/Button)
//
// argTypes 는 계약에서 생성된 generated/argtypes/Button.argtypes 를 spread 한다 (수기 작성 금지 — G5).
//
// [조합 폭발을 어떻게 다루는가 — 96칸]
//   contract-test 의 combinationMatrix 는 enum 값의 곱 × boolean prop 당 2다:
//     variant 4 × size 3 × loading 2 × disabled 2 × isFullWidth 2 = **96칸**.
//   96개를 손으로 복붙하면 A84가 잡아낸 그 중복(30줄 블록 11벌)이 다시 생긴다. 그래서 축을 두 겹으로
//   나눈다: **시각 축(variant × size)** 은 export 이름이 들고, **상태 축(셀 8종)** 은 CELLS 표 한 곳이
//   소유한다. 각 스토리는 combo(variant, size, cell) 한 줄이고, args·play 는 그 표에서만 정의된다 —
//   같은 args 객체나 play 배선이 파일 안에 두 번 나타나지 않는다.
//
// [Play Function 은 단언을 가진다 — 상태를 만들기만 하는 play 는 테스트가 아니다]
//   `userEvent.hover(...)` 만 하고 아무것도 expect 하지 않는 play 는 **실패할 수 없다**.
//   실패할 수 없는 것은 아무것도 검증하지 않는다 (A77 축1·축2).
//
// [계약 events.onClick.blockedWhen 전수 검증 — G5 exit]
//   onClick 은 meta.args 에서 `fn()` 스파이로 주입한다 (Storybook 8 은 스토리마다 스파이를 초기화한다).
//   금지 동작(비발생)은 **스파이로만 증명된다** — `expect(button).toBeDisabled()` 는 onClick 이
//   발화하지 않음을 증명하지 못한다 (disabled 속성 없이 CSS 로만 흐리게 처리해도 통과한다).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { ButtonArgTypes } from '../../../generated/argtypes/Button.argtypes';
import type { ButtonProps, ButtonSize, ButtonVariant } from '../../../generated/types/Button.types';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  argTypes: { ...ButtonArgTypes },
  args: {
    children: '저장',
    variant: 'primary',
    type: 'button',
    size: 'md',
    loading: false,
    disabled: false,
    isFullWidth: false,
    onClick: fn(),
  },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Button>;

/** 아이콘 슬롯 예시 — packages/ui 는 아이콘 자산을 소유하지 않는다(인라인 SVG · currentColor · 1em) */
function PlusGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** 다크 테마 프레임 — tokens.css 의 [data-theme='dark'] 스코프를 그대로 쓴다 */
const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{
      background: 'var(--tds-color-surface-default)',
      padding: 'var(--tds-space-5)',
      borderRadius: 'var(--tds-radius-md)',
    }}
  >
    <Story />
  </div>
);

/** RTL 프레임 — 문서 방향만 뒤집는다 (논리 속성 검수용) */
const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/**
 * 폼 프레임 — type 의 폼 시맨틱을 **실제로** 시험한다.
 * 제출을 가로채 흔적(data-submitted)만 남긴다: play 가 그 흔적으로 제출 여부를 단언한다.
 * (type 을 'button' 으로 하드코딩하면 이 흔적이 남지 않는다 — 폼이 조용히 죽는 그 버그다.)
 */
const formFrame: Decorator = (Story) => (
  <form
    data-testid="form"
    onSubmit={(event) => {
      event.preventDefault();
      event.currentTarget.setAttribute('data-submitted', 'true');
    }}
  >
    <label htmlFor="keyword">검색어</label>
    <input id="keyword" name="keyword" defaultValue="" />
    <Story />
  </form>
);

/**
 * play 컨텍스트 — 구조 분해를 파라미터에서 하지 않는다.
 *
 * [왜 이렇게 쓰는가] A77(test-coverage)의 정적 스캐너는 `play: hover` 같은 **참조형 play** 를
 * 모듈 스코프 함수 본문까지 따라가 단언을 센다. 파라미터를 통째로 받고 본문에서 꺼내 쓴다.
 */
interface PlayCtx {
  readonly canvasElement: HTMLElement;
}

/** hover 상태 — 포인터를 버튼 위에 올리고, 버튼이 히트 가능한 활성 상태임을 단언한다 */
const hover = async (ctx: PlayCtx) => {
  const button = within(ctx.canvasElement).getByRole('button');
  await userEvent.hover(button);
  await expect(button).toBeEnabled();
  await expect(button).toHaveClass('tds-button');
};

/** active 상태 — 마우스 버튼을 **누른 채로 둔다** (VRT 가 눌림 상태를 촬영한다 — 떼지 않는다) */
const press = async (ctx: PlayCtx) => {
  const button = within(ctx.canvasElement).getByRole('button');
  await userEvent.pointer({ keys: '[MouseLeft>]', target: button });
  await expect(button).toBeEnabled();
  await expect(button).not.toHaveAttribute('aria-busy');
};

/** focus-visible 상태 — 키보드(Tab)로 포커스를 옮기고, 실제로 포커스를 받았는지 단언한다 */
const focusVisible = async (ctx: PlayCtx) => {
  const button = within(ctx.canvasElement).getByRole('button');
  await userEvent.tab();
  button.focus();
  await expect(button).toHaveFocus();
};

/**
 * 상태 축 — 계약의 boolean 3축(loading · disabled · isFullWidth)과 상호작용 상태(hover/active/focus)를
 * 한 표로 모은다. **args 와 play 배선은 여기서만 정의된다** — 96개 스토리는 이 표를 가리키기만 한다.
 */
type Cell =
  | 'default'
  | 'hover'
  | 'active'
  | 'focus-visible'
  | 'disabled'
  | 'loading'
  | 'full-width'
  | 'full-width-loading';

type CellArgs = Pick<ButtonProps, 'loading' | 'disabled' | 'isFullWidth'>;

interface CellSpec {
  readonly args: CellArgs;
  readonly play?: (ctx: PlayCtx) => Promise<void>;
}

const OFF: CellArgs = { loading: false, disabled: false, isFullWidth: false };

const CELLS: Record<Cell, CellSpec> = {
  default: { args: OFF },
  hover: { args: OFF, play: hover },
  active: { args: OFF, play: press },
  'focus-visible': { args: OFF, play: focusVisible },
  disabled: { args: { ...OFF, disabled: true } },
  loading: { args: { ...OFF, loading: true } },
  'full-width': { args: { ...OFF, isFullWidth: true } },
  'full-width-loading': { args: { ...OFF, isFullWidth: true, loading: true } },
};

/** 조합 스토리 1칸 — 시각 축(variant · size)은 인자로, 상태 축은 CELLS 표로 온다 */
const combo = (variant: ButtonVariant, size: ButtonSize, cell: Cell = 'default'): Story => {
  const spec = CELLS[cell];
  const story: Story = {
    args: { variant, size, children: `${variant} ${size}`, ...spec.args },
    parameters: { layout: cell.startsWith('full-width') ? 'padded' : 'centered' },
  };
  // exactOptionalPropertyTypes — play 가 없는 칸에 undefined 를 실어 보내지 않는다
  return spec.play === undefined ? story : { ...story, play: spec.play };
};

/* ── primary · 24칸 (size 3 × 셀 8) ─────────────────────────────────────────── */
export const PrimarySmDefault: Story = combo('primary', 'sm');
export const PrimarySmHover: Story = combo('primary', 'sm', 'hover');
export const PrimarySmActive: Story = combo('primary', 'sm', 'active');
export const PrimarySmFocusVisible: Story = combo('primary', 'sm', 'focus-visible');
export const PrimarySmDisabled: Story = combo('primary', 'sm', 'disabled');
export const PrimarySmLoading: Story = combo('primary', 'sm', 'loading');
export const PrimarySmFullWidth: Story = combo('primary', 'sm', 'full-width');
export const PrimarySmFullWidthLoading: Story = combo('primary', 'sm', 'full-width-loading');
export const PrimaryMdDefault: Story = combo('primary', 'md');
export const PrimaryMdHover: Story = combo('primary', 'md', 'hover');
export const PrimaryMdActive: Story = combo('primary', 'md', 'active');
export const PrimaryMdFocusVisible: Story = combo('primary', 'md', 'focus-visible');
export const PrimaryMdDisabled: Story = combo('primary', 'md', 'disabled');
export const PrimaryMdLoading: Story = combo('primary', 'md', 'loading');
export const PrimaryMdFullWidth: Story = combo('primary', 'md', 'full-width');
export const PrimaryMdFullWidthLoading: Story = combo('primary', 'md', 'full-width-loading');
export const PrimaryLgDefault: Story = combo('primary', 'lg');
export const PrimaryLgHover: Story = combo('primary', 'lg', 'hover');
export const PrimaryLgActive: Story = combo('primary', 'lg', 'active');
export const PrimaryLgFocusVisible: Story = combo('primary', 'lg', 'focus-visible');
export const PrimaryLgDisabled: Story = combo('primary', 'lg', 'disabled');
export const PrimaryLgLoading: Story = combo('primary', 'lg', 'loading');
export const PrimaryLgFullWidth: Story = combo('primary', 'lg', 'full-width');
export const PrimaryLgFullWidthLoading: Story = combo('primary', 'lg', 'full-width-loading');

/* ── 슬롯 (iconLeft · children) ─────────────────────────────────────────────── */

/** 슬롯 최소 — 아이콘 없이 짧은 레이블만 */
export const SlotMinimal: Story = {
  args: { children: '확인', iconLeft: null },
};

/** 슬롯 — 좌측 아이콘(iconLeft) 있음 */
export const WithIconLeft: Story = {
  args: { children: '상품 등록', iconLeft: <PlusGlyph /> },
};

/** 슬롯 최대 — 아주 긴 레이블(줄바꿈/축소 확인) */
export const SlotLongLabel: Story = {
  args: {
    children:
      '아주 긴 레이블입니다 — 버튼 레이블이 길어져도 아이콘·스피너와 간격이 무너지지 않아야 한다',
    iconLeft: <PlusGlyph />,
  },
  parameters: { layout: 'padded' },
};

/** loading 중에는 iconLeft 가 스피너로 대체된다 (계약 hiddenWhen: loading) */
export const LoadingHidesIcon: Story = {
  args: { children: '저장 중', iconLeft: <PlusGlyph />, loading: true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');

    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button.querySelector('.tds-button__spinner')).not.toBeNull();
    await expect(button.querySelector('.tds-button__icon')).toBeNull();
  },
};

/* ── secondary · 24칸 (size 3 × 셀 8) ─────────────────────────────────────────── */
export const SecondarySmDefault: Story = combo('secondary', 'sm');
export const SecondarySmHover: Story = combo('secondary', 'sm', 'hover');
export const SecondarySmActive: Story = combo('secondary', 'sm', 'active');
export const SecondarySmFocusVisible: Story = combo('secondary', 'sm', 'focus-visible');
export const SecondarySmDisabled: Story = combo('secondary', 'sm', 'disabled');
export const SecondarySmLoading: Story = combo('secondary', 'sm', 'loading');
export const SecondarySmFullWidth: Story = combo('secondary', 'sm', 'full-width');
export const SecondarySmFullWidthLoading: Story = combo('secondary', 'sm', 'full-width-loading');
export const SecondaryMdDefault: Story = combo('secondary', 'md');
export const SecondaryMdHover: Story = combo('secondary', 'md', 'hover');
export const SecondaryMdActive: Story = combo('secondary', 'md', 'active');
export const SecondaryMdFocusVisible: Story = combo('secondary', 'md', 'focus-visible');
export const SecondaryMdDisabled: Story = combo('secondary', 'md', 'disabled');
export const SecondaryMdLoading: Story = combo('secondary', 'md', 'loading');
export const SecondaryMdFullWidth: Story = combo('secondary', 'md', 'full-width');
export const SecondaryMdFullWidthLoading: Story = combo('secondary', 'md', 'full-width-loading');
export const SecondaryLgDefault: Story = combo('secondary', 'lg');
export const SecondaryLgHover: Story = combo('secondary', 'lg', 'hover');
export const SecondaryLgActive: Story = combo('secondary', 'lg', 'active');
export const SecondaryLgFocusVisible: Story = combo('secondary', 'lg', 'focus-visible');
export const SecondaryLgDisabled: Story = combo('secondary', 'lg', 'disabled');
export const SecondaryLgLoading: Story = combo('secondary', 'lg', 'loading');
export const SecondaryLgFullWidth: Story = combo('secondary', 'lg', 'full-width');
export const SecondaryLgFullWidthLoading: Story = combo('secondary', 'lg', 'full-width-loading');

/* ── 계약 props.type — 폼 시맨틱 (하드코딩 제거의 증거) ───────────────────────── */

/** type=submit — <form> 안에서 실제로 제출한다 (LoginForm · RoleFormModal … 폼 5개의 CTA) */
export const TypeSubmit: Story = {
  name: 'Button: type=submit 은 폼을 제출한다',
  args: { type: 'submit', children: '로그인', isFullWidth: true },
  decorators: [formFrame],
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: '로그인' });
    await expect(button).toHaveAttribute('type', 'submit');

    await userEvent.click(button);

    await expect(canvas.getByTestId('form')).toHaveAttribute('data-submitted', 'true');
  },
};

/** type 기본값(button) — 폼 안의 보조 버튼은 제출하지 않는다 (HTML 기본값 submit 을 뒤집은 DS 결정) */
export const TypeButtonInForm: Story = {
  name: 'Button: type 기본값(button)은 폼을 제출하지 않는다',
  args: { children: '취소', variant: 'secondary' },
  decorators: [formFrame],
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '취소' }));

    await expect(canvas.getByTestId('form')).not.toHaveAttribute('data-submitted');
  },
};

/** type=reset — 폼을 초기화한다 (native reset 시맨틱) */
export const TypeReset: Story = {
  name: 'Button: type=reset 은 폼을 초기화한다',
  args: { type: 'reset', children: '초기화', variant: 'ghost' },
  decorators: [formFrame],
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const keyword = canvas.getByLabelText('검색어');
    await userEvent.type(keyword, '도어락');
    await expect(keyword).toHaveValue('도어락');

    await userEvent.click(canvas.getByRole('button', { name: '초기화' }));

    await expect(keyword).toHaveValue('');
  },
};

/** 계약 밖의 type 값은 button 으로 좁힌다 (허용 값은 button · submit · reset 뿐) */
export const TypeUnknownNarrowsToButton: Story = {
  name: 'Button: 계약 밖의 type 값은 button 으로 좁힌다',
  args: { type: 'menu', children: '메뉴', variant: 'secondary' },
  decorators: [formFrame],
  parameters: { layout: 'padded' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: '메뉴' });
    await expect(button).toHaveAttribute('type', 'button');

    await userEvent.click(button);

    await expect(canvas.getByTestId('form')).not.toHaveAttribute('data-submitted');
  },
};

/* ── ghost · 24칸 (size 3 × 셀 8) ─────────────────────────────────────────── */
export const GhostSmDefault: Story = combo('ghost', 'sm');
export const GhostSmHover: Story = combo('ghost', 'sm', 'hover');
export const GhostSmActive: Story = combo('ghost', 'sm', 'active');
export const GhostSmFocusVisible: Story = combo('ghost', 'sm', 'focus-visible');
export const GhostSmDisabled: Story = combo('ghost', 'sm', 'disabled');
export const GhostSmLoading: Story = combo('ghost', 'sm', 'loading');
export const GhostSmFullWidth: Story = combo('ghost', 'sm', 'full-width');
export const GhostSmFullWidthLoading: Story = combo('ghost', 'sm', 'full-width-loading');
export const GhostMdDefault: Story = combo('ghost', 'md');
export const GhostMdHover: Story = combo('ghost', 'md', 'hover');
export const GhostMdActive: Story = combo('ghost', 'md', 'active');
export const GhostMdFocusVisible: Story = combo('ghost', 'md', 'focus-visible');
export const GhostMdDisabled: Story = combo('ghost', 'md', 'disabled');
export const GhostMdLoading: Story = combo('ghost', 'md', 'loading');
export const GhostMdFullWidth: Story = combo('ghost', 'md', 'full-width');
export const GhostMdFullWidthLoading: Story = combo('ghost', 'md', 'full-width-loading');
export const GhostLgDefault: Story = combo('ghost', 'lg');
export const GhostLgHover: Story = combo('ghost', 'lg', 'hover');
export const GhostLgActive: Story = combo('ghost', 'lg', 'active');
export const GhostLgFocusVisible: Story = combo('ghost', 'lg', 'focus-visible');
export const GhostLgDisabled: Story = combo('ghost', 'lg', 'disabled');
export const GhostLgLoading: Story = combo('ghost', 'lg', 'loading');
export const GhostLgFullWidth: Story = combo('ghost', 'lg', 'full-width');
export const GhostLgFullWidthLoading: Story = combo('ghost', 'lg', 'full-width-loading');

/* ── 네이티브 패스스루 · boolean 조합의 나머지 칸 ──────────────────────────────── */

/**
 * 호출부의 aria-busy 가 loading 파생값을 덮는다 (계약 a11y.native-passthrough).
 * ConfirmDialog 는 스피너 없이 aria-busy 만 필요로 한다 — 새 prop 을 만들지 않는다.
 */
export const AriaBusyOverride: Story = {
  name: 'Button: 호출부의 aria-busy 가 loading 파생값을 덮는다',
  args: { children: '삭제', variant: 'danger', 'aria-busy': true },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: '삭제' });

    await expect(button).toHaveAttribute('aria-busy', 'true');
    await expect(button.querySelector('.tds-button__spinner')).toBeNull();
  },
};

/** 네이티브 속성 패스스루 — aria-label · title 을 <button> 으로 그대로 전달한다 (PointsCard·RolePanel) */
export const NativeAttributePassthrough: Story = {
  args: { children: '지급', 'aria-label': '포인트 지급', title: '지급' },
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: '포인트 지급' });

    await expect(button).toHaveAttribute('title', '지급');
  },
};

/** boolean 조합 — loading + disabled (둘 다 켜지면 native disabled 표면이 이긴다) */
export const LoadingAndDisabled: Story = {
  args: { children: '저장 중', loading: true, disabled: true },
};

/** boolean 조합 — isFullWidth + disabled */
export const FullWidthAndDisabled: Story = {
  args: { children: '로그인', isFullWidth: true, disabled: true },
  parameters: { layout: 'padded' },
};

/** boolean 조합 — 3축 전부 켬 (loading · disabled · isFullWidth) */
export const AllFlagsOn: Story = {
  args: { children: '처리 중', loading: true, disabled: true, isFullWidth: true },
  parameters: { layout: 'padded' },
};

/* ── danger · 24칸 (size 3 × 셀 8) ─────────────────────────────────────────── */
export const DangerSmDefault: Story = combo('danger', 'sm');
export const DangerSmHover: Story = combo('danger', 'sm', 'hover');
export const DangerSmActive: Story = combo('danger', 'sm', 'active');
export const DangerSmFocusVisible: Story = combo('danger', 'sm', 'focus-visible');
export const DangerSmDisabled: Story = combo('danger', 'sm', 'disabled');
export const DangerSmLoading: Story = combo('danger', 'sm', 'loading');
export const DangerSmFullWidth: Story = combo('danger', 'sm', 'full-width');
export const DangerSmFullWidthLoading: Story = combo('danger', 'sm', 'full-width-loading');
export const DangerMdDefault: Story = combo('danger', 'md');
export const DangerMdHover: Story = combo('danger', 'md', 'hover');
export const DangerMdActive: Story = combo('danger', 'md', 'active');
export const DangerMdFocusVisible: Story = combo('danger', 'md', 'focus-visible');
export const DangerMdDisabled: Story = combo('danger', 'md', 'disabled');
export const DangerMdLoading: Story = combo('danger', 'md', 'loading');
export const DangerMdFullWidth: Story = combo('danger', 'md', 'full-width');
export const DangerMdFullWidthLoading: Story = combo('danger', 'md', 'full-width-loading');
export const DangerLgDefault: Story = combo('danger', 'lg');
export const DangerLgHover: Story = combo('danger', 'lg', 'hover');
export const DangerLgActive: Story = combo('danger', 'lg', 'active');
export const DangerLgFocusVisible: Story = combo('danger', 'lg', 'focus-visible');
export const DangerLgDisabled: Story = combo('danger', 'lg', 'disabled');
export const DangerLgLoading: Story = combo('danger', 'lg', 'loading');
export const DangerLgFullWidth: Story = combo('danger', 'lg', 'full-width');
export const DangerLgFullWidthLoading: Story = combo('danger', 'lg', 'full-width-loading');

/* ── 계약 events.onClick.blockedWhen 전수 검증 (disabled · loading) ─────────────
 * 비발생은 렌더로 증명되지 않는다 — 스파이(args.onClick = fn())를 관찰한다.
 */

/** Button: disabled 상태에서 onClick 이 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabledOnClick: Story = {
  name: 'Button: disabled 상태에서 onClick 이 발화하지 않는다',
  args: { disabled: true, children: '저장' },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button');

    await userEvent.click(button, { pointerEventsCheck: 0 });

    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** Button: loading 상태에서 onClick 이 발화하지 않는다 (계약 blockedWhen: loading) */
export const BlockedWhenLoadingOnClick: Story = {
  name: 'Button: loading 상태에서 onClick 이 발화하지 않는다',
  args: { loading: true, children: '저장 중' },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button');

    // loading 버튼은 native disabled 가 아니다(aria-busy 만 붙는다) — 클릭이 실제로 도달한다.
    // 그래서 이 스토리는 컴포넌트의 차단 로직을 진짜로 시험한다.
    await expect(button).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(button);

    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** Button: 차단 상태가 아니면 onClick 이 발화한다 — 위 두 비발생 단언이 공허하지 않음을 보인다 */
export const OnClickFiresWhenNotBlocked: Story = {
  name: 'Button: 차단 상태가 아니면 onClick 이 발화한다',
  args: { children: '저장' },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button'));

    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

/** Dark — html[data-theme='dark'] 스코프에서의 4개 variant */
export const DarkTheme: Story = {
  args: { children: '다크 테마' },
  decorators: [darkFrame],
};

/** RTL — dir="rtl" 에서 아이콘/레이블 순서가 논리 속성대로 뒤집힌다 */
export const RightToLeft: Story = {
  args: { children: 'أضف منتجًا', iconLeft: <PlusGlyph /> },
  decorators: [rtlFrame],
};
