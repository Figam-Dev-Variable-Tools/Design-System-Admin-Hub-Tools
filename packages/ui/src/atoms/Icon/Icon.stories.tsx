// Icon — Storybook 스토리 (CSF3)
//
// [폭발 방지 — 운영 가이드 §14] 아이콘 이름은 **자산 축**이라 값마다 동작이 달라지지 않는다.
// 59종 × 4단 = 236개 스토리는 커버리지가 아니라 소음이다. 이름 전량은 Gallery 한 칸에 격자로,
// 크기는 Sizes 한 칸에 나란히 싣는다(Search Sm/Md/Lg 처럼 나누지 않는다).
//   Playground · Gallery · Sizes · Color Inherit · Decorative · Labelled · RTL · Docs
import type { CSSProperties } from 'react';
import type { Meta, StoryObj } from '@storybook/react';

import { IconArgTypes } from '../../../generated/argtypes/Icon.argtypes';
import { ICON_SHAPES } from '../../../generated/icons/icon-geometry';
import type { IconName } from '../../../generated/types/Icon.types';
import { Icon } from './Icon';

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-4)',
};

/** Playground 의 color 컨트롤 — Icon 은 currentColor 라 부모 color 를 따른다. 그 부모색을 고른다 */
const COLORS: Record<string, string> = {
  'inherit (기본)': 'inherit',
  'text.default': 'var(--tds-color-text-default)',
  'text.muted': 'var(--tds-color-text-muted)',
  danger: 'var(--tds-color-feedback-danger-text)',
  primary: 'var(--tds-color-action-primary-default)',
};

const meta: Meta<typeof Icon> = {
  title: 'Design System/Components/Icon',
  component: Icon,
  argTypes: { ...IconArgTypes },
  args: { name: 'close', size: 'md', label: '' },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Icon>;

/** Playground — iconName·size·color 를 Controls 로 바꿔 모든 조합을 여기서 본다 */
export const Playground: StoryObj<{ name: IconName; size: string; label: string; color: string }> =
  {
    argTypes: {
      color: {
        control: 'select',
        options: Object.keys(COLORS),
        description: '부모 color (Icon 은 currentColor 를 상속한다)',
      },
    },
    args: { color: 'inherit (기본)' },
    render: (args) => (
      <span style={{ color: COLORS[args.color] ?? 'inherit' }}>
        <Icon name={args.name} size={args.size as never} label={args.label} />
      </span>
    ),
  };

/** Sizes — 크기 규격 검증. sm·md·lg 를 한 화면에 나란히(자산×크기로 나누지 않는다) */
export const Sizes: Story = {
  parameters: { controls: { disable: true } },
  render: () => (
    <div style={rowStyle}>
      <Icon name="trash" size="sm" />
      <Icon name="trash" size="md" />
      <Icon name="trash" size="lg" />
    </div>
  ),
};

/** Color Inherit — 색은 currentColor 다. 부모의 color 를 그대로 따른다 */
export const ColorInherit: Story = {
  name: 'Color Inherit',
  args: { name: 'plus-circle', size: 'lg' },
  decorators: [
    (Story) => (
      <div style={{ color: 'var(--tds-color-feedback-danger-text)' }}>
        <Story />
      </div>
    ),
  ],
};

/** Decorative — label 이 없으면 장식으로 간주해 aria-hidden 이다(인접 텍스트가 의미를 준다) */
export const Decorative: Story = {
  args: { name: 'search', label: '' },
};

/** Labelled — label 이 있으면 role=img + aria-label 로 이름이 노출된다 */
export const Labelled: Story = {
  args: { name: 'trash', label: '삭제' },
};

/** RTL — 방향 아이콘은 미러링하지 않는다(레이아웃이 뒤집혀도 글리프는 그대로) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { name: 'chevron-right', size: 'lg' },
  decorators: [
    (Story) => (
      <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
        <Story />
      </div>
    ),
  ],
};

/**
 * Gallery — 계약이 선언한 아이콘 **전량**을 이름과 함께 격자로. 목록을 손으로 적지 않는다:
 * 생성 기하(ICON_SHAPES)의 키를 그대로 쓰므로 아이콘이 늘면 이 화면도 자동으로 따라온다.
 */
export const Gallery: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => {
    const names = Object.keys(ICON_SHAPES) as IconName[];
    return (
      <section>
        <p
          style={{
            marginBottom: 'var(--tds-space-4)',
            color: 'var(--tds-color-text-muted)',
            fontFamily: 'var(--tds-typography-body-md-font-family)',
            fontSize: 'var(--tds-typography-body-md-font-size)',
            fontWeight: 'var(--tds-typography-body-md-font-weight)',
            lineHeight: 'var(--tds-typography-body-md-line-height)',
          }}
        >
          아이콘 {names.length}종 — 이름은 계약(contracts/Icon.contract.json)의 name 값
          그대로입니다.
        </p>
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(7.5rem, 1fr))',
            gap: 'var(--tds-space-3)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {names.map((name) => (
            <li
              key={name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--tds-space-2)',
                padding: 'var(--tds-space-3)',
                border: 'var(--tds-border-width-thin) solid var(--tds-color-border-default)',
                borderRadius: 'var(--tds-radius-md)',
                background: 'var(--tds-color-surface-raised)',
              }}
            >
              <Icon name={name} size="lg" />
              <code
                style={{
                  fontFamily: 'var(--tds-typography-caption-md-font-family)',
                  fontSize: 'var(--tds-typography-caption-md-font-size)',
                  fontWeight: 'var(--tds-typography-caption-md-font-weight)',
                  lineHeight: 'var(--tds-typography-caption-md-line-height)',
                  color: 'var(--tds-color-text-muted)',
                  textAlign: 'center',
                  wordBreak: 'break-all',
                }}
              >
                {name}
              </code>
            </li>
          ))}
        </ul>
      </section>
    );
  },
};
