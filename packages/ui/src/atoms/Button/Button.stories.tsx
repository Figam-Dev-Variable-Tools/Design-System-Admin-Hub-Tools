// Button — Storybook 스토리 (CSF3)
//
// [표준 문서화 구조 — 8 그룹] variant×size×state 를 낱개 스토리로 폭발시키지 않는다. 컴포넌트마다
// 아래 8개 그룹으로만 문서화한다(사이드바가 100개가 되면 아무도 못 훑는다):
//   Overview       — 실제 쓰임새 한눈에(대표 조합)
//   Playground     — 모든 props 를 Controls 로 바꿔 보는 곳
//   Variants       — 디자인 토큰(색·스타일) 검증: 전 variant 를 한 화면에
//   Sizes          — 크기 규격 검증: 전 size 를 한 화면에
//   States         — UI 상태 검증: default·disabled·loading 을 한 화면에
//   Icons          — 아이콘 슬롯 옵션(좌측 아이콘·레이블 안 아이콘)
//   Accessibility  — 키보드 포커스·ARIA·type 시맨틱 (play 로 단언)
//   Interaction    — onClick 발화/차단(blockedWhen) (play 로 단언)
// argTypes 는 계약 생성물(generated/argtypes/Button.argtypes)을 spread 한다(수기 금지 — G5).
import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { ButtonArgTypes } from '../../../generated/argtypes/Button.argtypes';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Design System/Components/Button',
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

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-3)',
  flexWrap: 'wrap',
};

/** 좌측 아이콘 슬롯 예시 — packages/ui 는 아이콘 자산을 소유하지 않는다(인라인 SVG · currentColor · 1em) */
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

/** Overview — 실제 쓰임새 한눈에. 저장/취소처럼 primary + secondary 가 짝으로 놓이는 것이 가장 흔하다 */
export const Overview: Story = {
  render: (args) => (
    <div style={rowStyle}>
      <Button {...args} variant="primary">
        저장
      </Button>
      <Button {...args} variant="secondary">
        취소
      </Button>
    </div>
  ),
};

/** Playground — Controls 에서 variant·size·loading·disabled·isFullWidth 를 바꿔 전 조합을 본다 */
export const Playground: Story = {};

/** Variants — 디자인 토큰(색·스타일) 검증. 네 variant 가 각자의 semantic 토큰으로 그려진다 */
export const Variants: Story = {
  render: (args) => (
    <div style={rowStyle}>
      <Button {...args} variant="primary">
        primary
      </Button>
      <Button {...args} variant="secondary">
        secondary
      </Button>
      <Button {...args} variant="ghost">
        ghost
      </Button>
      <Button {...args} variant="danger">
        danger
      </Button>
    </div>
  ),
};

/** Sizes — 크기 규격 검증. sm·md·lg 가 토큰 기반 높이·패딩으로 그려진다 */
export const Sizes: Story = {
  render: (args) => (
    <div style={rowStyle}>
      <Button {...args} size="sm">
        sm
      </Button>
      <Button {...args} size="md">
        md
      </Button>
      <Button {...args} size="lg">
        lg
      </Button>
    </div>
  ),
};

/**
 * States — UI 상태 검증. prop 으로 정해지는 상태(default·disabled·loading)를 한 화면에 둔다.
 * hover·active·focus-visible 는 포인터/키보드가 필요한 상호작용 상태라 정적 스토리로 만들 수 없다 —
 * 그 상태의 스타일 규칙 검증은 Button.test.tsx 가 스타일시트를 읽어 단언한다.
 */
export const States: Story = {
  render: (args) => (
    <div style={rowStyle}>
      <Button {...args}>default</Button>
      <Button {...args} disabled>
        disabled
      </Button>
      <Button {...args} loading>
        loading
      </Button>
    </div>
  ),
};

/** Icons — 아이콘 슬롯 옵션. 좌측 아이콘(iconLeft)과 레이블 안 아이콘 두 쓰임을 보인다 */
export const Icons: Story = {
  render: (args) => (
    <div style={rowStyle}>
      <Button {...args} iconLeft={<PlusGlyph />}>
        아이콘 + 텍스트
      </Button>
      <Button {...args}>
        <PlusGlyph />
        레이블 안 아이콘
      </Button>
    </div>
  ),
};

/** Accessibility — 키보드 포커스·type 시맨틱을 단언한다 */
export const Accessibility: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button');

    // 계약 a11y — type=button 고정(폼 안에서 실수로 제출하지 않는다)
    await expect(button).toHaveAttribute('type', 'button');
    // 키보드로 포커스를 받는다
    await userEvent.tab();
    await expect(button).toHaveFocus();
  },
};

/** Interaction — onClick 이 발화한다(차단 상태 검증은 Button.test.tsx 의 blockedWhen 단언이 소유) */
export const Interaction: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole('button');

    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};
