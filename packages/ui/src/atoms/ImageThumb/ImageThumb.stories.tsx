// ImageThumb — Storybook 스토리 (CSF3 · Atoms/ImageThumb)
//
// argTypes 는 계약 생성물(generated/argtypes/ImageThumb.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(enum·boolean 없음 → 1) + states(default 이미지 / error placeholder) 재현.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { ImageThumbArgTypes } from '../../../generated/argtypes/ImageThumb.argtypes';
import { ImageThumb } from './ImageThumb';

/** 데모용 인라인 이미지 (외부 네트워크에 의존하지 않는다) */
const SAMPLE_SRC =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='24'%3E%3Crect width='60' height='24' rx='4' fill='%234f46e5'/%3E%3Ctext x='30' y='16' font-size='10' fill='white' text-anchor='middle'%3ELOGO%3C/text%3E%3C/svg%3E";

const meta: Meta<typeof ImageThumb> = {
  title: 'Atoms/ImageThumb',
  component: ImageThumb,
  argTypes: { ...ImageThumbArgTypes },
  args: { src: SAMPLE_SRC, alt: '샘플 로고' },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof ImageThumb>;

const darkFrame: Decorator = (Story) => (
  <div
    data-theme="dark"
    style={{ background: 'var(--tds-color-surface-default)', padding: 'var(--tds-space-5)' }}
  >
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** default — 유효한 src → 실제 이미지 (alt 로 접근 가능한 이름) */
export const Default: Story = {
  args: { src: SAMPLE_SRC, alt: '샘플 로고' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('img', { name: '샘플 로고' })).toBeInTheDocument();
  },
};

/** error(빈 src) — 빈 문자열/공백이면 placeholder (role=img + aria-label) */
export const EmptyPlaceholder: Story = {
  args: { src: '   ', alt: '로고 없음' },
  play: async ({ canvasElement }) => {
    const ph = within(canvasElement).getByRole('img', { name: '로고 없음' });
    await expect(ph.tagName).toBe('SPAN');
  },
};

/** error(로드 실패) — 깨진 URL 은 onError 로 placeholder 로 폴백한다 */
export const BrokenImage: Story = {
  args: { src: 'https://invalid.example/nope.png', alt: '깨진 이미지' },
};

/** Dark */
export const DarkTheme: Story = {
  args: { src: '', alt: '로고 없음' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { src: SAMPLE_SRC, alt: 'شعار' },
  decorators: [rtlFrame],
};
