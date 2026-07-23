// ImageUploadField — Storybook 스토리 (CSF3 · Form 계열)
//
// [고정 IA — Form 계열] required×disabled 조합을 낱개로 폭발시키지 않는다. 세부 조합은 Controls 로 넘기고,
// 대표 상태만 그룹으로 남긴다(Button 기준 IA · Behavior 금지 → Interaction · Slot 금지 → Content):
//   Overview · Playground · States/ · Form/ · Content/ · Accessibility/ · Interaction/
// 'Uploading' 상태는 이 필드에 없다(동기 · createObjectURL 즉시) — 생략한다.
// 계약 states(default·error·disabled) 전수는 ImageUploadField.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { ImageUploadFieldArgTypes } from '../../../generated/argtypes/ImageUploadField.argtypes';
import { ImageUploadField } from './ImageUploadField';
import type { ImageUploadFieldProps } from '../../../generated/types/ImageUploadField.types';

// 데모용 인라인 SVG data URL (외부 자산 의존 없음)
const SAMPLE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='120'%3E%3Crect width='200' height='120' fill='%234f8cff'/%3E%3C/svg%3E";

// 미리보기 콘텐츠 데모용 그라디언트 (사진 같은 콘텐츠 형태를 보이려고 SAMPLE 과 구분)
const PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='140'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%234f8cff'/%3E%3Cstop offset='1' stop-color='%2300c2a8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='240' height='140' fill='url(%23g)'/%3E%3C/svg%3E";

/** 제어 컴포넌트 — 스토리에서 실제로 선택·제거가 반영되도록 값을 로컬 상태로 잡는다 */
function ControlledImageUploadField(args: ImageUploadFieldProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <ImageUploadField
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

/** RTL — 논리 속성 확인용 프레임(한국어 콘텐츠) */
const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** 드롭존은 접근 가능한 이름(aria-label)으로 집는다 */
const dropzoneOf = (canvasElement: HTMLElement) =>
  within(canvasElement).getByRole('button', { name: /이미지 업로드/ });

/** 시각적으로 숨긴 파일 input 트리거 — role 이 없어 DOM 으로 직접 집는다 */
const fileInputOf = (canvasElement: HTMLElement) =>
  canvasElement.querySelector<HTMLInputElement>('input[type="file"]');

const meta: Meta<typeof ImageUploadField> = {
  title: 'Design System/Components/ImageUploadField',
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
  render: (args) => <ControlledImageUploadField {...(args as ImageUploadFieldProps)} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof ImageUploadField>;

/** Overview — 대표 쓰임새. 빈 드롭존 + 도움말. Controls 에서 required·disabled·error 를 바꿔 본다 */
export const Overview: Story = {
  args: { hint: '권장 크기 1200×630 · 5MB 이하' },
};

/** Playground — Controls 에서 required·disabled·error·hint·maxSizeMB 를 바꿔 전 조합을 여기서 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** 빈 상태 — 값이 없으면 업로드 안내(placeholder)를 그린다 */
export const Empty: Story = {
  name: 'States/Empty',
  args: { value: '' },
};

/** error — danger 테두리 + role=alert 인라인 오류 (스키마가 내려준 오류가 로컬 검증보다 우선) */
export const Error: Story = {
  name: 'States/Error',
  args: { error: '이미지 파일만 올릴 수 있어요.' },
};

/** 채워진 상태 — 값이 있으면 미리보기 + 업로드 완료 피드백 + 교체/제거 */
export const Filled: Story = {
  name: 'States/Filled',
  args: { value: SAMPLE },
};

/** disabled — 드롭존/교체/제거가 모두 잠긴다 */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { value: SAMPLE, disabled: true },
};

/* ── Form ────────────────────────────────────────────────────────────────── */

/** 필수 입력 — 라벨에 표식(*)이 붙고, 접근성 이름에 '(필수)' 가 더해진다 (aria-required 자리가 없어서) */
export const Required: Story = {
  name: 'Form/Required',
  args: { required: true },
};

/** 선택 입력 — required 없이 라벨에 '(선택)' 을 명시하는 관례 */
export const Optional: Story = {
  name: 'Form/Optional',
  args: { label: '배경 이미지 (선택)' },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 미리보기 — 값이 있으면 원본 비율을 유지한 미리보기 이미지를 드롭존 안에 담는다 */
export const WithPreview: Story = {
  name: 'Content/With Preview',
  args: { label: '대표 사진', value: PHOTO },
};

/** 도움말 — 오류가 없을 때만 표시되고 aria-describedby 로 드롭존에 연결된다 */
export const HintText: Story = {
  name: 'Content/Hint Text',
  args: { hint: '권장 크기 1200×630 · 5MB 이하' },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성이라 라벨·드롭존·교체/제거의 좌우가 문서 방향을 따른다 (문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { label: '로고 이미지', value: SAMPLE },
  decorators: [rtlFrame],
};

/** ARIA — 드롭존이 접근 가능한 이름을 갖고, 숨긴 파일 input 은 AT 에 보이지 않으며, hint 가 describedby 로 이어진다 */
export const Aria: Story = {
  name: 'Accessibility/ARIA',
  args: { hint: '권장 크기 1200×630 · 5MB 이하' },
  play: async ({ canvasElement }) => {
    const dropzone = dropzoneOf(canvasElement);
    await expect(dropzone).toHaveAttribute('aria-label');

    // 진짜 <input type=file> 은 시각적으로 숨긴 트리거일 뿐 — AT 가 보지 못한다
    const fileInput = fileInputOf(canvasElement);
    await expect(fileInput).toHaveAttribute('aria-hidden', 'true');
    await expect(fileInput).toHaveAttribute('tabindex', '-1');

    // hint 가 aria-describedby 로 드롭존에 연결된다
    const describedBy = dropzone.getAttribute('aria-describedby');
    await expect(describedBy).not.toBeNull();
    await expect(canvasElement.ownerDocument.getElementById(describedBy ?? '')).not.toBeNull();
  },
};

/** 키보드 — 드롭존은 진짜 <button> 이라 Tab 으로 포커스가 닿고 Enter·Space 로 활성화된다 */
export const Keyboard: Story = {
  name: 'Accessibility/Keyboard',
  play: async ({ canvasElement }) => {
    const dropzone = dropzoneOf(canvasElement);
    await userEvent.tab();
    await expect(dropzone).toHaveFocus();
    await expect(dropzone).toBeEnabled();
  },
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 이미지 파일을 고르면 object URL 로 onChange 가 발화한다 */
export const InteractionSelectImage: Story = {
  name: 'Interaction/Select Image',
  play: async ({ canvasElement, args }) => {
    const fileInput = fileInputOf(canvasElement);
    if (fileInput === null) return;
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    await userEvent.upload(fileInput, file);

    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(args.onChange).toHaveBeenCalledWith(expect.stringMatching(/^blob:/));
  },
};

/** 제거를 누르면 빈 문자열('')로 onChange 가 발화한다 (계약 경계) */
export const InteractionRemove: Story = {
  name: 'Interaction/Remove',
  args: { value: SAMPLE },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: '제거' }));
    await expect(args.onChange).toHaveBeenCalledWith('');
  },
};

/** disabled 면 드롭존이 잠겨 클릭해도 onChange 가 발화하지 않는다 (계약 blockedWhen) */
export const InteractionDisabled: Story = {
  name: 'Interaction/Disabled',
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const dropzone = dropzoneOf(canvasElement);
    await expect(dropzone).toBeDisabled();
    await userEvent.click(dropzone, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};
