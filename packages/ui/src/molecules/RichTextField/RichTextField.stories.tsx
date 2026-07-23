// RichTextField — Storybook 스토리 (CSF3 · Form 계열 표준 IA)
//
// [고정 IA — Form 계열] 상태·조합을 낱개로 폭발시키지 않는다. 대표 상태만 그룹으로 남기고
// 세부 조합(required×disabled)은 Playground Controls 로 미룬다(Button 기준 IA · Behavior 금지 → Interaction):
//   Overview · Playground · States/ · Form/ · Content/ · Examples/ · Accessibility/ · Interaction/
//   (Types/ 는 이 필드에 입력 타입 변형이 없어 생략한다 — 리치 텍스트 하나다)
// focus-visible 상태 커버리지는 States/Focus Visible 의 play 가 소유한다(단언 있음). argTypes 는 계약 생성물 spread(G5).
//
// 에디터는 지연 로드되므로 play 함수는 findBy* 로 청크를 기다린 뒤 단언한다.
import { useEffect, useState } from 'react';
import type { ComponentProps } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { RichTextFieldArgTypes } from '../../../generated/argtypes/RichTextField.argtypes';
import { RichTextField } from './RichTextField';

/** 제어 컴포넌트 — 값은 스토리가 잡는다 (TextareaField 스토리와 같은 결) */
function ControlledRichTextField(args: ComponentProps<typeof RichTextField>) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <RichTextField
      {...args}
      value={value}
      onChange={(next) => {
        setValue(next);
        args.onChange?.(next);
      }}
    />
  );
}

/** 대표 서식 본문 — 제목·굵게·기울임·목록을 한 번에 담는다 */
const SAMPLE_HTML =
  '<h2>제품 특징</h2><p>가벼운 충전재로 <strong>보온성</strong>과 <em>활동성</em>을 모두 잡았어요.</p><ul><li>초경량 충전재</li><li>발수 가공</li></ul>';

/** 서식 전체(굵게·기울임·제목·글머리/번호 목록·링크)를 한 화면에 보이는 콘텐츠 */
const RICH_HTML =
  '<h2>상세 안내</h2><p><strong>굵게</strong>와 <em>기울임</em>, 그리고 <a href="https://example.com" target="_blank">링크</a>를 함께 쓸 수 있어요.</p><h3>소재</h3><ul><li>초경량 충전재</li><li>발수 가공</li></ul><ol><li>세탁 전 지퍼를 잠가요</li><li>단독 세탁해요</li></ol>';

const meta: Meta<typeof RichTextField> = {
  title: 'Design System/Components/RichTextField',
  component: RichTextField,
  argTypes: { ...RichTextFieldArgTypes },
  args: {
    label: '상세설명',
    value: SAMPLE_HTML,
    maxLength: 2000,
    required: false,
    disabled: false,
    error: '',
    hint: '',
    placeholder: '상품의 소재·핏·관리법 등 상세 정보를 입력하세요.',
    rows: 6,
    onChange: fn(),
  },
  render: (args) => <ControlledRichTextField {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof RichTextField>;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

const surfaceFrame: Decorator = (Story) => (
  <div
    style={{
      background: 'var(--tds-color-surface-raised)',
      padding: 'var(--tds-space-5)',
      borderRadius: 'var(--tds-radius-md)',
    }}
  >
    <Story />
  </div>
);

/* ── Overview ───────────────────────────────────────────────────────────── */

/** Overview — 대표 쓰임새. 툴바 + 서식 있는 본문 + 평문 길이 카운터 */
export const Overview: Story = {
  args: { hint: '최대 2000자 (서식은 글자 수에 세지 않아요)' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('toolbar', { name: '본문 서식' })).toBeVisible();
    await expect(await canvas.findByRole('button', { name: '굵게' })).toBeEnabled();
  },
};

/** Playground — Controls 에서 required·disabled·error·rows 를 바꿔 전 조합을 여기서 본다 */
export const Playground: Story = {};

/* ── States ─────────────────────────────────────────────────────────────── */

/** disabled — 에디터 non-editable + 툴바 버튼 native disabled */
export const Disabled: Story = {
  name: 'States/Disabled',
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('button', { name: '굵게' })).toBeDisabled();
  },
};

/** error — role=alert 오류 메시지 + 붉은 테두리 */
export const Error: Story = {
  name: 'States/Error',
  args: { value: '', error: '상세설명을 입력하세요' },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('alert')).toHaveTextContent(
      '상세설명을 입력하세요',
    );
  },
};

/** focus-visible — 키보드 포커스가 툴바 첫 버튼에 닿으면 포커스 링이 뜬다 */
export const FocusVisible: Story = {
  name: 'States/Focus Visible',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('toolbar', { name: '본문 서식' });
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: '굵게' })).toHaveFocus();
  },
};

/* ── Form ───────────────────────────────────────────────────────────────── */

/** 필수 입력 — required 가 라벨에 마커(*)를 붙이고 편집 영역에 aria-required 를 잇는다 */
export const RequiredField: Story = {
  name: 'Form/Required',
  args: { required: true },
};

/** 선택 입력 — required 없이 라벨에 '(선택)' 을 명시하는 관례 */
export const Optional: Story = {
  name: 'Form/Optional',
  args: { label: '상세설명 (선택)', value: '', hint: '입력하지 않아도 저장할 수 있어요.' },
};

/** 폼 배경 위 — surface.raised 컨테이너 안에서의 대비를 본다 */
export const FormSurface: Story = {
  name: 'Form/Form Surface',
  decorators: [surfaceFrame],
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 최소 콘텐츠 — 본문이 비면 placeholder 를 그린다 */
export const MinimalContent: Story = {
  name: 'Content/Minimal Content',
  args: { value: '', hint: '본문이 비어 있으면 placeholder 를 그린다' },
};

/** 긴 콘텐츠 — 카운터가 상한에 가까워져도 레이아웃이 깨지지 않는다 */
export const LongContent: Story = {
  name: 'Content/Long Content',
  args: {
    value: `<p>${'이 상품은 매우 긴 상세설명을 담고 있어 카운터가 상한에 가까워진 상태를 보여 줘요. '.repeat(6)}</p>`,
    hint: '최대 2000자',
  },
};

/** 서식 있는 콘텐츠 — 굵게·기울임·제목·글머리/번호 목록·링크를 한 화면에 담는다 */
export const RichContent: Story = {
  name: 'Content/Rich Content',
  args: { value: RICH_HTML, hint: '툴바가 낼 수 있는 서식의 상한을 한 화면에 담았다' },
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/** 상품 상세설명 — 툴바로 만든 실제 본문(제목·강조·목록·링크)이 들어간 폼 필드 */
export const ProductDescription: Story = {
  name: 'Examples/Product Description',
  args: {
    label: '상품 상세설명',
    value: RICH_HTML,
    hint: '최대 2000자 (서식은 글자 수에 세지 않아요)',
  },
};

/** 저장 값 sanitize — 저장된 값에 script/onerror 가 섞여 있어도 렌더 지점에서 걸러진다 */
export const SanitizesStoredValue: Story = {
  name: 'Examples/Sanitized Stored Value',
  args: {
    value:
      '<p>정상 본문</p><script>alert(1)</script><img src="x" onerror="alert(2)"><p onclick="alert(3)">클릭 핸들러가 지워진 문단</p>',
    hint: 'script · onerror · onclick 이 모두 사라진 상태로 그려진다',
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole('toolbar', { name: '본문 서식' });
    await expect(canvasElement.innerHTML).not.toContain('onerror');
    await expect(canvasElement.innerHTML).not.toContain('alert(1)');
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성이라 툴바·본문 정렬이 문서 방향을 따른다 (한국어 콘텐츠) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: {
    label: '상세설명',
    value: '<p>오른쪽에서 왼쪽으로 읽는 방향에서도 툴바와 본문 정렬이 논리 속성을 따른다.</p>',
    placeholder: '상세 정보를 입력하세요.',
  },
  decorators: [rtlFrame],
};

/** 키보드 이동 — Tab 이 툴바 버튼을 순서대로(굵게 → 기울임) 옮겨 간다 */
export const Keyboard: Story = {
  name: 'Accessibility/Keyboard',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole('toolbar', { name: '본문 서식' });
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: '굵게' })).toHaveFocus();
    await userEvent.tab();
    await expect(canvas.getByRole('button', { name: '기울임' })).toHaveFocus();
  },
};

/** ARIA — 편집 영역이 label 로부터 접근성 이름을 얻고, 툴바 켜짐이 aria-pressed 로 노출된다 */
export const ToolbarStateIsAnnounced: Story = {
  name: 'Accessibility/ARIA',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const editor = await canvas.findByRole('textbox', { name: '상세설명' });
    await expect(editor).toHaveAttribute('aria-multiline', 'true');
    const bold = canvas.getByRole('button', { name: '굵게' });
    await expect(bold).toHaveAttribute('aria-pressed', 'false');
  },
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 굵게 — 툴바 버튼을 누르면 서식이 켜지고 aria-pressed 가 true 로 바뀐다 */
export const Bold: Story = {
  name: 'Interaction/Bold',
  args: { value: '' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bold = await canvas.findByRole('button', { name: '굵게' });
    await userEvent.click(bold);
    await expect(bold).toHaveAttribute('aria-pressed', 'true');
  },
};

/** disabled 에서는 툴바를 눌러도 onChange 가 발화하지 않는다 (계약 blockedWhen · 스파이 비발생) */
export const BlockedWhenDisabledOnChange: Story = {
  name: 'Interaction/Disabled Change',
  args: { disabled: true, onChange: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const bold = await canvas.findByRole('button', { name: '굵게' });
    await userEvent.click(bold, { pointerEventsCheck: 0 });
    await expect(args.onChange).not.toHaveBeenCalled();
  },
};
