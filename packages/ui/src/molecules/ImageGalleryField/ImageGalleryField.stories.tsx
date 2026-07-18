// ImageGalleryField — Storybook 스토리 (CSF3 · Molecules/ImageGalleryField)
//
// argTypes 는 계약 생성물(generated/argtypes/ImageGalleryField.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix = required(2) × disabled(2) = 4 + 그리드/오류/힌트 + Dark.
// values 는 데이터 prop 이라 control 비활성 — Story args 로 직접 준다 (ADR-0003).
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { ImageGalleryFieldArgTypes } from '../../../generated/argtypes/ImageGalleryField.argtypes';
import { ImageGalleryField } from './ImageGalleryField';

const swatch = (color: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='${color}'/%3E%3C/svg%3E`;

const SAMPLES = [swatch('%234f8cff'), swatch('%2334c759'), swatch('%23ff9f0a')];

const meta: Meta<typeof ImageGalleryField> = {
  title: 'Inputs/ImageGalleryField',
  component: ImageGalleryField,
  argTypes: { ...ImageGalleryFieldArgTypes },
  args: {
    label: '본문 이미지',
    values: [],
    required: false,
    disabled: false,
    error: '',
    hint: '',
    maxFiles: 10,
    maxSizeMB: 5,
    onChange: fn(),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof ImageGalleryField>;

/** default(required=false · disabled=false) — 빈 드롭존 */
export const Empty: Story = {};

/** required=true — 라벨에 필수 표식(*) */
export const Required: Story = {
  args: { required: true },
};

/** disabled=true */
export const Disabled: Story = {
  args: { values: SAMPLES, disabled: true },
};

/** required + disabled 조합 */
export const RequiredDisabled: Story = {
  args: { required: true, disabled: true },
};

/** 값이 있으면 그리드 프리뷰 + 개별 제거 + '추가' 칸 */
export const WithImages: Story = {
  args: { values: SAMPLES },
};

/** 개수 상한 도달 — '추가' 칸이 사라진다 */
export const Full: Story = {
  args: { values: SAMPLES, maxFiles: 3 },
};

/** error — danger 테두리 + 인라인 오류 */
export const WithError: Story = {
  args: { error: '이미지는 최대 10장까지 등록할 수 있습니다.' },
};

/** hint */
export const WithHint: Story = {
  args: { hint: 'JPG · PNG · 장당 5MB 이하' },
};

/** Dark */
export const DarkTheme: Story = {
  args: { values: SAMPLES },
  decorators: [
    (StoryFn) => (
      <div data-theme="dark" style={{ padding: 'var(--tds-space-5)' }}>
        <StoryFn />
      </div>
    ),
  ],
};
