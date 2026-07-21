// Spinner — Storybook 스토리 (CSF3 · Design System/Components/Spinner)
//
// [고정 IA — 오너 확정 어휘] 조합을 낱개로 폭발시키지 않는다. 아래 그룹만 쓴다:
//   Overview       — 대표 쓰임새(로딩 신호) 한눈에
//   Sizes          — inherit·sm·md·lg 를 한 화면에 비교(크기별로 쪼개지 않는다)
//   Examples       — 실제 사용 맥락(버튼 안 · 로딩 영역)
//   Accessibility  — 장식(aria-hidden) ↔ role=status 승격 · RTL
// argTypes 는 계약 생성물(generated/argtypes/Spinner.argtypes)을 spread 한다 (수기 금지 — G5).
import type { CSSProperties } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { SpinnerArgTypes } from '../../../generated/argtypes/Spinner.argtypes';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Design System/Components/Spinner',
  component: Spinner,
  argTypes: { ...SpinnerArgTypes },
  args: { size: 'inherit', label: '' },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Spinner>;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** 버튼 껍데기 — packages/ui 는 이 스토리에서 Button 을 소비하지 않고, 맥락만 흉내 낸다 */
const buttonShell: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  background: 'transparent',
  border: 'var(--tds-border-width-thin) solid currentColor',
  borderRadius: 'var(--tds-radius-md)',
  padding: 'var(--tds-space-2) var(--tds-space-3)',
};

/** Overview — 대표 쓰임새. '무언가 불러오는 중' 이라는 진행 신호. 인접 텍스트가 뜻을 주므로 스피너는 장식이다 */
export const Overview: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--tds-space-2)',
        color: 'var(--tds-color-text-default)',
      }}
    >
      <Spinner size="md" /> 불러오는 중
    </span>
  ),
};

/**
 * Sizes — inherit·sm·md·lg 를 한 화면에 나란히(크기별로 스토리를 쪼개지 않는다).
 * `inherit` 은 1em 이라 부모 글자 크기를 따르므로 큰 글자 문맥과 함께 보여야 뜻이 통한다.
 */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--tds-space-5)' }}>
      <span style={{ fontSize: 'var(--tds-typography-title-lg-font-size)' }}>
        <Spinner size="inherit" /> inherit
      </span>
      <span>
        <Spinner size="sm" /> sm
      </span>
      <span>
        <Spinner size="md" /> md
      </span>
      <span>
        <Spinner size="lg" /> lg
      </span>
    </div>
  ),
};

/**
 * Examples/Current Color — 버튼 맥락. 색은 `currentColor` 라 버튼 글자색을 따르고,
 * `inherit` 은 1em 이라 버튼 글자 크기를 따른다. 토큰을 직접 읽으면 danger 위에서 스피너만 파랗게 남는다.
 */
export const CurrentColor: Story = {
  name: 'Examples/Current Color',
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={{ display: 'flex', gap: 'var(--tds-space-4)' }}>
      <button
        type="button"
        disabled
        style={{ ...buttonShell, color: 'var(--tds-color-feedback-danger-text)' }}
      >
        <Spinner size="inherit" /> 삭제 중
      </button>
      <button
        type="button"
        disabled
        style={{ ...buttonShell, color: 'var(--tds-color-action-primary-default)' }}
      >
        <Spinner size="inherit" /> 저장 중
      </button>
    </div>
  ),
};

/** Examples/Loading Area — 빈 영역 중앙. 글자 문맥이 없으니 고정 크기(lg)를 쓰고, 인접 텍스트가 뜻을 준다 */
export const LoadingArea: Story = {
  name: 'Examples/Loading Area',
  parameters: { controls: { disable: true } },
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--tds-space-3)',
        width: '16rem',
        height: '9rem',
        border: 'var(--tds-border-width-thin) solid var(--tds-color-border-default)',
        borderRadius: 'var(--tds-radius-md)',
        background: 'var(--tds-color-surface-raised)',
        color: 'var(--tds-color-text-muted)',
      }}
    >
      <Spinner size="lg" />
      <span>콘텐츠를 불러오는 중</span>
    </div>
  ),
};

/**
 * Accessibility/Decorative — label 이 비면(기본) 장식이다. `aria-hidden="true"` 이고 role 이 없다 —
 * Button 안에서 버튼의 aria-busy 가 이미 로딩을 알리므로 중복 낭독을 피한다.
 */
export const Decorative: Story = {
  name: 'Accessibility/Decorative',
  args: { size: 'lg', label: '' },
};

/**
 * Accessibility/Labelled — label 이 있으면 상태다. `role="status"` + `aria-label` 로 승격돼
 * polite 라이브 영역이 된다(패널 로딩 등 독립적으로 쓸 때).
 */
export const Labelled: Story = {
  name: 'Accessibility/Labelled',
  args: { size: 'lg', label: '불러오는 중' },
};

/** Accessibility/RTL — 원이라 방향이 뒤집혀도 같은 형태다. 회전 방향도 바뀌지 않는다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { size: 'lg', label: '불러오는 중' },
  decorators: [rtlFrame],
};
