// FormField — Storybook 스토리 (CSF3 · Molecules/FormField)
//
// [고정 IA — Form 계열] TextField 를 그대로 미러한다. 라벨/오류/힌트 껍데기라 hover/focus/disabled 는
// 없다(계약 states = default·error). 조합을 낱개로 폭발시키지 않고 대표 상태만 그룹에 남긴다:
//   Overview · Playground · States/ · Form/ · Content/ · Accessibility/ · Interaction/
// 상태 검증(role=alert·aria-required 주입)은 FormField.test.tsx 가 소유. argTypes 는 계약 생성물 spread(G5).
import { cloneElement } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';

import { FormFieldArgTypes } from '../../../generated/argtypes/FormField.argtypes';
import { FormField, hintIdOf } from './FormField';

/** 자식 컨트롤 자리 — 껍데기가 감싸지 않고 그대로 렌더한다 */
const control = (
  <input
    id="demo-field"
    aria-label="control-probe"
    className="tds-formfield__demo-input"
    style={{
      boxSizing: 'border-box',
      inlineSize: '100%',
      paddingBlock: 'var(--tds-space-2)',
      paddingInline: 'var(--tds-space-3)',
      borderStyle: 'solid',
      borderWidth: 'var(--tds-border-width-thin)',
      borderColor: 'var(--tds-color-border-default)',
      borderRadius: 'var(--tds-radius-md)',
      background: 'var(--tds-color-surface-default)',
      color: 'var(--tds-color-text-default)',
    }}
  />
);

const meta: Meta<typeof FormField> = {
  title: 'Design System/Components/FormField',
  component: FormField,
  argTypes: { ...FormFieldArgTypes },
  args: {
    htmlFor: 'demo-field',
    label: '제목',
    required: false,
    error: '',
    hint: '',
    counter: '',
    children: control,
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof FormField>;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/** Overview — 대표 쓰임새(계약 default 상태). 라벨 + 컨트롤 + 힌트, 오류는 없다 */
export const Overview: Story = {
  name: 'Overview',
  args: { hint: '최대 50자' },
};

/** Playground — Controls 에서 required·error·hint·counter 를 바꿔 전 조합을 여기서 본다 */
export const Playground: Story = { name: 'Playground' };

/* ── States ─────────────────────────────────────────────────────────────── */

/** error — role=alert 오류를 그리고 힌트 대신 표시한다(색+시맨틱 이중 전달) */
export const Error: Story = {
  name: 'States/Error',
  args: { required: true, hint: '최대 50자', error: '필수 항목이에요' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('필수 항목이에요');
    await expect(canvas.queryByText('최대 50자')).toBeNull();
  },
};

/* ── Form ────────────────────────────────────────────────────────────────── */

/** 필수 입력 — required 가 라벨 옆에 aria-hidden 마커(*)를 붙이고 자식 컨트롤에 aria-required 를 잇는다 */
export const RequiredField: Story = {
  name: 'Form/Required',
  args: { required: true },
  play: async ({ canvasElement }) => {
    const marker = canvasElement.querySelector('.tds-formfield__required');
    await expect(marker).not.toBeNull();
    await expect(marker).toHaveAttribute('aria-hidden', 'true');
  },
};

/** 선택 입력 — required 없이 라벨에 '(선택)' 을 명시하는 관례 */
export const OptionalField: Story = {
  name: 'Form/Optional',
  args: { required: false, label: '회사명 (선택)' },
};

/** 카운터 — 라벨 행 오른쪽 끝에 글자수 문자열(tabular-nums) */
export const WithCounter: Story = {
  name: 'Form/Counter',
  args: { label: '본문', counter: '128/500' },
};

/** 힌트(보조 안내) — 오류가 없을 때만 hintIdOf 파생 id 로 그린다 */
export const HelperText: Story = {
  name: 'Form/Helper Text',
  args: { label: '표시 이름', hint: '나중에 언제든지 변경할 수 있어요.' },
};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 최소 콘텐츠 — 짧은 라벨만, 힌트·카운터·도움말 없음 */
export const MinimalContent: Story = {
  name: 'Content/Minimal',
  args: { label: '코드', hint: '', counter: '' },
};

/** 긴 라벨 — 라벨이 길어져도 마커·카운터 정렬이 깨지지 않는다 */
export const LongLabel: Story = {
  name: 'Content/Long Label',
  args: {
    label:
      '개인정보 수집 및 이용에 대한 동의 (마케팅 정보 수신 목적 포함) — 라벨이 아주 길어지는 경우',
    required: true,
    counter: '0/50',
  },
};

/** 긴 도움말 — ⓘ 패널 본문이 길어져도 패널 안에서 줄바꿈된다 */
export const LongHelp: Story = {
  name: 'Content/Long Help',
  args: {
    label: '구분',
    help: (
      <span>
        적립과 차감은 회원 등급과 프로모션 조건에 따라 다르게 계산돼요. 자세한 규칙은 정책 문서를
        참고하세요. 이 도움말은 길어질 수 있으며 패널 안에서 자연스럽게 줄바꿈돼요.
      </span>
    ),
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성이라 라벨·카운터·힌트의 좌우가 문서 방향(dir="rtl")을 따른다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: { label: '제목', hint: '최대 50자', counter: '12/50' },
  decorators: [rtlFrame],
};

/** ARIA 배선 — 라벨(htmlFor)·힌트(hintIdOf)·필수(aria-required)가 자식 컨트롤에 잇힌다 */
export const AriaWiring: Story = {
  name: 'Accessibility/ARIA',
  args: {
    required: true,
    hint: '최대 50자',
    children: cloneElement(control, { 'aria-describedby': hintIdOf('demo-field') }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText('control-probe');
    // required=true 가 컨트롤의 aria-required 로 주입된다 (A11Y-11)
    await expect(input).toHaveAttribute('aria-required', 'true');
    // 호출부가 물린 aria-describedby 가 힌트 <p> 의 파생 id 를 가리킨다
    await expect(input).toHaveAttribute('aria-describedby', hintIdOf('demo-field'));
    await expect(canvas.getByText('최대 50자')).toHaveAttribute('id', hintIdOf('demo-field'));
  },
};

/* ── Interaction ────────────────────────────────────────────────────────── */

/** 도움말 토글 — ⓘ 트리거를 누르면 HelpTip disclosure 가 펼쳐진다 */
export const WithHelp: Story = {
  name: 'Interaction/Help Toggle',
  args: { label: '구분', help: <span>적립/차감 설명</span> },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole('button', { name: '구분 설명' });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  },
};
