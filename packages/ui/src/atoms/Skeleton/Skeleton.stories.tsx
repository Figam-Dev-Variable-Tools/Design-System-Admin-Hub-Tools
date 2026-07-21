// Skeleton — Storybook 스토리 (CSF3)
//
// [고정 IA] 오너 확정 어휘만·이 순서로: Docs(autodocs) · Overview · Variants(shape) · Examples(구성) ·
// Accessibility(aria-hidden/aria-busy · RTL). shape 3형(line·circle·block)과 isAnimated 는 Variants,
// 표 로딩 같은 실제 구성은 Examples, aria 시맨틱과 RTL 은 Accessibility.
// argTypes 는 계약 생성물(generated/argtypes/Skeleton.argtypes)을 spread 한다 (수기 작성 금지 — G5).
import type { CSSProperties } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { SkeletonArgTypes } from '../../../generated/argtypes/Skeleton.argtypes';
import { Skeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'Design System/Components/Skeleton',
  component: Skeleton,
  argTypes: { ...SkeletonArgTypes },
  args: { shape: 'line', isAnimated: true },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Skeleton>;

/** line/block 은 컨테이너 폭을 채우는 형태라, 폭을 주지 않으면 캔버스 전체로 퍼진다 */
const widthFrame: Decorator = (Story) => (
  <div style={{ inlineSize: 'var(--tds-space-10)' }}>
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ inlineSize: 'var(--tds-space-10)', padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  inlineSize: 'var(--tds-space-10)',
};

/* ── Overview ───────────────────────────────────────────────────────────── */

/**
 * Overview — 실제 쓰임새 한눈에. 텍스트 블록이 로딩되는 자리를 line 몇 줄로 그린 것이
 * 가장 흔한 쓰임이다 (승계한 `.tds-ui-skeleton` 과 같은 형태).
 */
export const Overview: Story = {
  render: (args) => (
    <div style={stackStyle}>
      <Skeleton {...args} shape="line" />
      <Skeleton {...args} shape="line" />
      <Skeleton {...args} shape="line" />
    </div>
  ),
};

/* ── Variants ───────────────────────────────────────────────────────────── */

/** line — 텍스트 한 줄 자리. 승계한 `.tds-ui-skeleton` 과 같은 형태이며 표 9곳이 쓰던 유일한 형태다 */
export const Line: Story = {
  name: 'Variants/Line',
  args: { shape: 'line' },
  decorators: [widthFrame],
};

/** circle — 아바타/아이콘 자리. 폭을 채우면 타원이 되므로 여기만 정사각 고정이다 */
export const Circle: Story = {
  name: 'Variants/Circle',
  args: { shape: 'circle' },
};

/** block — 카드/썸네일 자리 */
export const Block: Story = {
  name: 'Variants/Block',
  args: { shape: 'block' },
  decorators: [widthFrame],
};

/** isAnimated=false — 정지한 회색 블록. 정적 스냅샷(VRT·인쇄)용 옵트아웃이다 */
export const Static: Story = {
  name: 'Variants/Static',
  args: { shape: 'line', isAnimated: false },
  decorators: [widthFrame],
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/**
 * 표 로딩 — 승계 원본의 배치. 반복은 계약에 없다.
 * 호출부가 자기 표의 컬럼 수로 `<tr>`/`<td>` 를 반복하고 칸마다 Skeleton 한 장을 둔다
 * (apps/admin 의 표 9곳이 이 형태로 이관됐다). aria-busy 는 담는 영역(tbody)의 책임이다.
 */
export const TableRows: Story = {
  name: 'Examples/Table Rows',
  parameters: { controls: { disable: true } },
  render: () => (
    <table style={{ borderCollapse: 'collapse', inlineSize: 'var(--tds-space-10)' }}>
      <caption style={{ captionSide: 'top', paddingBlockEnd: 'var(--tds-space-2)' }}>
        불러오는 중
      </caption>
      <tbody aria-busy="true">
        {Array.from({ length: 3 }, (_, row) => (
          <tr key={`skeleton-${String(row)}`}>
            {Array.from({ length: 4 }, (_cell, cell) => (
              <td key={`cell-${String(cell)}`} style={{ padding: 'var(--tds-space-2)' }}>
                <Skeleton />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/**
 * ARIA 시맨틱 — 스켈레톤 한 장은 항상 `aria-hidden="true"` 라 AT 에 노출되지 않고 role 도 없다.
 * 로딩 사실은 블록이 아니라 이를 담은 영역의 `aria-busy="true"` 가 알린다 (표 한 장에 수십 장이
 * 렌더되므로 장마다 알리면 낭독이 무너진다).
 */
export const AriaSemantics: Story = {
  name: 'Accessibility/ARIA',
  parameters: { controls: { disable: true } },
  render: () => (
    <div aria-busy="true" style={stackStyle}>
      <Skeleton shape="line" />
      <Skeleton shape="line" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const block = canvasElement.querySelector('.tds-skeleton');

    // 계약 a11y.aria — 항상 aria-hidden, role 없음
    await expect(block).toHaveAttribute('aria-hidden', 'true');
    await expect(block).not.toHaveAttribute('role');
    // 로딩 사실은 담는 영역이 알린다
    const busy = within(canvasElement).getByRole('generic', { busy: true });
    await expect(busy).toHaveAttribute('aria-busy', 'true');
  },
};

/** RTL — 논리 속성(inline-size)만 쓰므로 방향이 뒤집혀도 같은 형태다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { shape: 'line' },
  decorators: [rtlFrame],
};
