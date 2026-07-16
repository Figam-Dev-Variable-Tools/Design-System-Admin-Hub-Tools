// ImageUploadField — Storybook 스토리 (CSF3 · Molecules/ImageUploadField)
//
// argTypes 는 계약 생성물(generated/argtypes/ImageUploadField.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix = required(2) × disabled(2) = 4 + error/hint/미리보기 + Dark.
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';

import { ImageUploadFieldArgTypes } from '../../../generated/argtypes/ImageUploadField.argtypes';
import { ImageUploadField } from './ImageUploadField';

// 데모용 인라인 SVG data URL (외부 자산 의존 없음)
const SAMPLE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120'%3E%3Crect width='200' height='120' fill='%234f8cff'/%3E%3C/svg%3E";

const meta: Meta<typeof ImageUploadField> = {
  title: 'Molecules/ImageUploadField',
  component: ImageUploadField,
  argTypes: { ...ImageUploadFieldArgTypes },
  args: {
    label: '로고 이미지',
    value: '',
    required: false,
    disabled: false,
    error: '',
    hint: '',
    maxSizeMB: 5,
    onChange: fn(),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof ImageUploadField>;

/** default(required=false · disabled=false) — 빈 드롭존 placeholder */
export const Empty: Story = {};

/** required=true — 라벨에 필수 표식(*) */
export const Required: Story = {
  args: { required: true },
};

/** disabled=true — 드롭존/교체/제거 비활성 */
export const Disabled: Story = {
  args: { value: SAMPLE, disabled: true },
};

/** required + disabled 조합 */
export const RequiredDisabled: Story = {
  args: { required: true, disabled: true },
};

/** 값이 있으면 미리보기 이미지 + 교체/제거 */
export const WithImage: Story = {
  args: { value: SAMPLE },
};

/** error — danger 테두리 + 인라인 오류 */
export const WithError: Story = {
  args: { error: '이미지 파일만 올릴 수 있습니다.' },
};

/** hint — 오류가 없을 때 도움말 */
export const WithHint: Story = {
  args: { hint: '권장 크기 1200×630 · 5MB 이하' },
};

/** Dark */
export const DarkTheme: Story = {
  args: { value: SAMPLE },
  decorators: [
    (StoryFn) => (
      <div data-theme="dark" style={{ padding: 'var(--tds-space-5)' }}>
        <StoryFn />
      </div>
    ),
  ],
};
