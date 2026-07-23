// ImageGalleryField — Storybook 스토리 (CSF3 · Form 계열)
//
// [고정 IA — Form 계열] type×state 조합을 낱개로 폭발시키지 않는다. 대표 상태만 그룹으로 남기고
// 세부 조합(required·disabled·maxFiles…)은 Playground Controls 로 넘긴다(Behavior 금지 → Interaction):
//   Overview · Playground · States/ · Form/ · Content/ · Accessibility/ · Interaction/
// 이 필드에는 '업로드 진행(Uploading)' prop 도, 순서 바꾸기(Reorder) 기능도 없어서 두 칸은 생략한다.
// 상태 전수(default·error·disabled) 검증은 ImageGalleryField.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fireEvent, fn, userEvent, within } from '@storybook/test';

import { ImageGalleryFieldArgTypes } from '../../../generated/argtypes/ImageGalleryField.argtypes';
import { ImageGalleryField } from './ImageGalleryField';
import type { ImageGalleryFieldProps } from '../../../generated/types/ImageGalleryField.types';

/** 외부 URL 금지 — 인라인 SVG data: URI 스와치로 미리보기를 만든다 */
const swatch = (color: string) =>
  `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='${color}'/%3E%3C/svg%3E`;

const SAMPLES = [swatch('%234f8cff'), swatch('%2334c759'), swatch('%23ff9f0a')];
const MANY = [
  ...SAMPLES,
  swatch('%23af52de'),
  swatch('%23ff375f'),
  swatch('%235ac8fa'),
  swatch('%23ffd60a'),
  swatch('%2364d2ff'),
];

/**
 * 제어 컴포넌트 — values 는 부모가 쥐는 상태다. 스토리에서 실제로 추가/제거가 반영되도록
 * 로컬 상태로 잡고, onChange 스파이도 함께 호출해 play 단언이 값을 받게 한다.
 */
function ControlledImageGalleryField(args: ImageGalleryFieldProps) {
  const [values, setValues] = useState<readonly string[]>(args.values);
  useEffect(() => setValues(args.values), [args.values]);
  return (
    <ImageGalleryField
      {...args}
      values={values}
      onChange={(next) => {
        setValues(next);
        args.onChange?.(next);
      }}
    />
  );
}

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

const meta: Meta<typeof ImageGalleryField> = {
  title: 'Design System/Components/ImageGalleryField',
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
  render: (args) => <ControlledImageGalleryField {...(args as ImageGalleryFieldProps)} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof ImageGalleryField>;

/* ── Overview ───────────────────────────────────────────────────────────── */

/** Overview — 대표 쓰임새. 세 장이 담긴 그리드 프리뷰 + '추가' 칸 */
export const Overview: Story = { args: { values: SAMPLES } };

/* ── Playground ─────────────────────────────────────────────────────────── */

/** Playground — Controls 에서 required·disabled·error·maxFiles·maxSizeMB 를 바꿔 전 조합을 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** 빈 상태 — 값이 없으면 드롭존만 나온다(클릭·드래그로 업로드) */
export const Empty: Story = {
  name: 'States/Empty',
  args: { values: [] },
};

/** 채워진 상태 — 그리드 프리뷰 + 각 타일 제거 + '추가' 칸 */
export const Filled: Story = {
  name: 'States/Filled',
  args: { values: SAMPLES },
};

/** 오류 — error 가 비지 않으면 danger 테두리 + role=alert 인라인 오류 */
export const Error: Story = {
  name: 'States/Error',
  args: { values: [], error: '이미지는 최대 10장까지 등록할 수 있어요.' },
};

/** 비활성 — 드롭존·추가·제거가 모두 잠긴다 */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { values: SAMPLES, disabled: true },
};

/** 개수 상한 도달 — maxFiles 만큼 차면 '추가' 칸이 사라진다 */
export const AtMax: Story = {
  name: 'States/At Max',
  args: { values: SAMPLES, maxFiles: 3 },
};

/* ── Form ────────────────────────────────────────────────────────────────── */

/** 필수 입력 — '최소 한 장'. 빈 드롭존의 접근 가능한 이름에 (필수)가 붙는다(라벨엔 * 표식) */
export const Required: Story = {
  name: 'Form/Required',
  args: { values: [], required: true },
};

/** 선택 입력 — required 없이 라벨에 '(선택)' 을 명시하고, 도움말(hint)로 허용 형식을 안내한다 */
export const Optional: Story = {
  name: 'Form/Optional',
  args: { values: [], label: '본문 이미지 (선택)', hint: 'JPG · PNG · 장당 5MB 이하' },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 한 장 — 단일 이미지도 그리드로 그리고 옆에 '추가' 칸을 둔다 */
export const SingleImage: Story = {
  name: 'Content/Single Image',
  args: { values: [SAMPLES[0] ?? ''] },
};

/** 여러 장 — 타일이 많아도 그리드가 줄바꿈되어 무너지지 않는다 */
export const ManyImages: Story = {
  name: 'Content/Many Images',
  args: { values: MANY, maxFiles: 12 },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성이라 라벨·카운터·타일·제거 버튼의 좌우가 문서 방향을 따른다(문구는 한국어로 검수) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { values: SAMPLES },
  decorators: [rtlFrame],
};

/** ARIA — 필수 드롭존은 이름에 (필수)를 담고 오류를 aria-describedby 로 잇는다. 숨긴 입력은 탭 밖 */
export const Aria: Story = {
  name: 'Accessibility/ARIA',
  args: { values: [], required: true, error: '이미지는 최소 한 장 등록해야 해요.' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dropzone = canvas.getByRole('button', { name: /이미지 \(필수\)/ });
    await expect(dropzone).toHaveAttribute('aria-describedby');
    await expect(canvas.getByRole('alert')).toHaveTextContent('최소 한 장');

    const input = canvasElement.querySelector('input[type="file"]');
    await expect(input).toHaveAttribute('aria-hidden', 'true');
    await expect(input).toHaveAttribute('tabindex', '-1');
  },
};

/** 키보드 — 숨긴 파일 입력은 탭 순서 밖이라, Tab 이 곧바로 드롭존 버튼으로 포커스를 옮긴다 */
export const Keyboard: Story = {
  name: 'Accessibility/Keyboard',
  args: { values: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const dropzone = canvas.getByRole('button', { name: /끌어다 놓으세요/ });
    await userEvent.tab();
    await expect(dropzone).toHaveFocus();
  },
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 파일을 고르면 URL 배열로 onChange 가 발화하고 타일이 하나 생긴다 */
export const AddImage: Story = {
  name: 'Interaction/Add Image',
  args: { values: [] },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const input = canvasElement.querySelector('input[type="file"]');
    if (input === null) return;

    fireEvent.change(input, {
      target: { files: [new File(['x'], 'photo.png', { type: 'image/png' })] },
    });

    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(canvas.getAllByLabelText(/번째 이미지 제거/)).toHaveLength(1);
  },
};

/** 타일의 제거 버튼을 누르면 그 항목만 뺀 배열로 onChange 가 발화한다 */
export const RemoveImage: Story = {
  name: 'Interaction/Remove Image',
  args: { values: SAMPLES },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByLabelText('1번째 이미지 제거'));

    await expect(args.onChange).toHaveBeenCalledTimes(1);
    await expect(canvas.getAllByLabelText(/번째 이미지 제거/)).toHaveLength(2);
  },
};
