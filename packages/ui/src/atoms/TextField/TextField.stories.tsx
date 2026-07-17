// TextField — Storybook 스토리 (CSF3 · Atoms/TextField)
//
// argTypes 는 계약 생성물(generated/argtypes/TextField.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// 커버리지: combinationMatrix(type 4 × state 5 = 20) 전수 + boolean(disabled·required) true/false
//           + 슬롯(trailing) 최소/최대 + Dark/RTL.
import { useEffect, useState } from 'react';
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { TextFieldArgTypes } from '../../../generated/argtypes/TextField.argtypes';
import { TextField } from './TextField';
import type { TextFieldProps } from '../../../generated/types/TextField.types';

/** 제어 컴포넌트 — 스토리에서 실제로 입력이 되도록 값을 로컬 상태로 잡는다 */
function ControlledTextField(args: TextFieldProps) {
  const [value, setValue] = useState(args.value);
  useEffect(() => setValue(args.value), [args.value]);
  return (
    <TextField
      {...args}
      value={value}
      onChange={(event) => {
        setValue(event.target.value);
        args.onChange?.(event);
      }}
    />
  );
}

const meta: Meta<typeof TextField> = {
  title: 'Atoms/TextField',
  component: TextField,
  argTypes: { ...TextFieldArgTypes },
  args: {
    id: 'email',
    label: '이메일',
    value: '',
    type: 'text',
    error: '',
    disabled: false,
    required: false,
    placeholder: 'name@company.com',
    onChange: fn(),
    onBlur: fn(),
  },
  render: (args) => <ControlledTextField {...args} />,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof TextField>;

/** password/number 는 role 이 textbox 가 아니므로 DOM 으로 직접 집는다 */
const inputOf = (canvasElement: HTMLElement) => canvasElement.querySelector('input');

/** hover 상태 */
/**
 * play 컨텍스트 — 구조 분해를 파라미터에서 하지 않는다.
 *
 * [왜 이렇게 쓰는가] 테스트 커버리지의 정적 스캐너는 `play: hover` 같은 **참조형 play** 를
 * 모듈 스코프 함수 본문까지 따라가 단언을 센다. 그런데 파라미터에서 구조 분해하면
 * (`async ({ canvasElement }) => {`) 스캐너가 선언 직후의 첫 `{` 를 **함수 본문으로 오인**해
 * 구조 분해 괄호를 본문으로 잡고, 진짜 본문의 expect 를 보지 못한다.
 * 단언은 존재하는데 보이지 않는 것 — 그것도 초록불 위조와 같은 결과를 낸다.
 * 그래서 파라미터를 통째로 받고 본문에서 꺼내 쓴다 (동작은 동일하다).
 */
interface PlayCtx {
  readonly canvasElement: HTMLElement;
}

const hover = async (ctx: PlayCtx) => {
  const input = inputOf(ctx.canvasElement);
  await expect(input).not.toBeNull();
  await userEvent.hover(input as HTMLInputElement);
  await expect(input).toBeEnabled();
};

/** focus-visible 상태 — 키보드 포커스 */
const focusVisible = async (ctx: PlayCtx) => {
  const input = inputOf(ctx.canvasElement);
  await userEvent.tab();
  input?.focus();
  await expect(input).toHaveFocus();
};

/** error 상태 — 메시지 <p> 가 role="alert" 로 announce 되고 aria-invalid ↔ aria-describedby 로 짝지어진다 (A11Y-10/11) */
const errorAlert = async (ctx: PlayCtx) => {
  const canvas = within(ctx.canvasElement);
  const alert = canvas.getByRole('alert');
  await expect(alert).toBeInTheDocument();
  const input = inputOf(ctx.canvasElement);
  await expect(input).toHaveAttribute('aria-invalid', 'true');
  await expect(input).toHaveAttribute('aria-describedby', alert.id);
};

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

const ERROR = '올바른 형식이 아닙니다.';

// --- type=text × state 5 -----------------------------------------------------
/** text · default */
export const TextDefault: Story = { args: { type: 'text', label: '이름', value: '' } };
/** text · hover */
export const TextHover: Story = { args: { type: 'text', label: '이름', value: '' }, play: hover };
/** text · focus-visible */
export const TextFocusVisible: Story = {
  args: { type: 'text', label: '이름', value: '' },
  play: focusVisible,
};
/** text · disabled — onBlur 발화 금지 (계약 blockedWhen) */
export const TextDisabled: Story = {
  args: { type: 'text', label: '이름', value: '홍길동', disabled: true },
};
/** text · error — 테두리 danger + 메시지(role=alert) + aria-invalid + aria-describedby */
export const TextError: Story = {
  args: { type: 'text', label: '이름', value: '', error: '이름을 입력하세요.' },
  play: errorAlert,
};

// --- type=email × state 5 ----------------------------------------------------
/** email · default */
export const EmailDefault: Story = { args: { type: 'email', value: '' } };
/** email · hover */
export const EmailHover: Story = { args: { type: 'email', value: '' }, play: hover };
/** email · focus-visible */
export const EmailFocusVisible: Story = { args: { type: 'email', value: '' }, play: focusVisible };
/** email · disabled */
export const EmailDisabled: Story = {
  args: { type: 'email', value: 'admin@company.com', disabled: true },
};
/** email · error */
export const EmailError: Story = {
  args: { type: 'email', value: 'admin@', error: '이메일 형식이 올바르지 않습니다.' },
};

// --- type=password × state 5 -------------------------------------------------
/** password · default */
export const PasswordDefault: Story = {
  args: { id: 'password', type: 'password', label: '비밀번호', value: '', placeholder: '' },
};
/** password · hover */
export const PasswordHover: Story = {
  args: { id: 'password', type: 'password', label: '비밀번호', value: '', placeholder: '' },
  play: hover,
};
/** password · focus-visible */
export const PasswordFocusVisible: Story = {
  args: { id: 'password', type: 'password', label: '비밀번호', value: '', placeholder: '' },
  play: focusVisible,
};
/** password · disabled */
export const PasswordDisabled: Story = {
  args: {
    id: 'password',
    type: 'password',
    label: '비밀번호',
    value: 'secret',
    placeholder: '',
    disabled: true,
  },
};
/** password · error */
export const PasswordError: Story = {
  args: {
    id: 'password',
    type: 'password',
    label: '비밀번호',
    value: 'abc',
    placeholder: '',
    error: '8자 이상 입력하세요.',
  },
};

// --- type=number × state 5 ---------------------------------------------------
/** number · default */
export const NumberDefault: Story = {
  args: { id: 'stock', type: 'number', label: '재고 수량', value: '0', placeholder: '' },
};
/** number · hover */
export const NumberHover: Story = {
  args: { id: 'stock', type: 'number', label: '재고 수량', value: '0', placeholder: '' },
  play: hover,
};
/** number · focus-visible */
export const NumberFocusVisible: Story = {
  args: { id: 'stock', type: 'number', label: '재고 수량', value: '0', placeholder: '' },
  play: focusVisible,
};
/** number · disabled */
export const NumberDisabled: Story = {
  args: {
    id: 'stock',
    type: 'number',
    label: '재고 수량',
    value: '120',
    placeholder: '',
    disabled: true,
  },
};
/** number · error */
export const NumberError: Story = {
  args: {
    id: 'stock',
    type: 'number',
    label: '재고 수량',
    value: '-1',
    placeholder: '',
    error: ERROR,
  },
};

// --- boolean / slot / theme --------------------------------------------------
/**
 * required=true — native required(→ aria-required)만 붙는다.
 * **라벨에 마커(*)를 주입하지 않는다** (계약 props.required): 라벨의 textContent 가 곧 접근 가능한
 * 이름이라, 마커를 넣으면 이름이 '이메일*' 이 되어 getByLabelText('이메일') 정확일치가 깨진다.
 */
export const Required: Story = {
  args: { required: true, label: '이메일' },
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);

    await expect(input).toBeRequired();
    // 라벨 텍스트가 오염되지 않았다 — 이름으로 그대로 집힌다 (E2E FS-001 의 셀렉터)
    await expect(within(canvasElement).getByLabelText('이메일')).toBe(input);
  },
};

/** required=false — 기본값 대비 */
export const Optional: Story = {
  args: { required: false, label: '이메일(선택)' },
};

/** 폼 표면 — name · autoComplete · inputMode 가 <input> 으로 전달된다 (LoginForm 의 이메일 필드) */
export const FormSurface: Story = {
  args: {
    id: 'email',
    label: '이메일',
    name: 'email',
    autoComplete: 'username',
    inputMode: 'email',
    type: 'email',
  },
  play: async ({ canvasElement }) => {
    const input = inputOf(canvasElement);

    await expect(input).toHaveAttribute('name', 'email');
    await expect(input).toHaveAttribute('autocomplete', 'username');
    await expect(input).toHaveAttribute('inputmode', 'email');
  },
};

/** 슬롯 최소 — trailing 없음(입력 오른쪽 여백이 기본) */
export const SlotMinimal: Story = {
  args: { trailing: null },
};

/** 슬롯 — trailing 요소가 있으면 입력 오른쪽 여백을 넓혀 텍스트와 겹치지 않게 한다 */
export const WithTrailing: Story = {
  args: {
    value: 'admin@company.com',
    trailing: (
      <span aria-hidden="true" style={{ color: 'var(--tds-color-feedback-success-text)' }}>
        ✓
      </span>
    ),
  },
};

/** 최대 콘텐츠 — 긴 라벨 + 긴 값 + 긴 에러 메시지 */
export const SlotLongContent: Story = {
  args: {
    label: '담당자 이메일 주소 (사내 계정만 허용 — 외부 도메인은 관리자 승인 필요)',
    value: 'very.long.email.address.for.overflow.check@extremely-long-corporate-domain.example.com',
    error:
      '외부 도메인 주소는 사용할 수 없습니다. 사내 계정(@company.com)으로 다시 입력하시거나, 관리자에게 예외 승인을 요청해 주세요.',
  },
};

/** Dark */
export const DarkTheme: Story = {
  args: { value: 'admin@company.com' },
  decorators: [darkFrame],
};

/** RTL */
export const RightToLeft: Story = {
  args: { label: 'البريد الإلكتروني', value: '', error: 'هذا الحقل مطلوب' },
  decorators: [rtlFrame],
};

/* ── 계약 events.onBlur.blockedWhen 전수 검증 (disabled) ────────────────────────
 * 비발생은 렌더로 증명되지 않는다 — 스파이(args.onBlur = fn())를 관찰한다.
 * `expect(input).toBeDisabled()` 는 onBlur 가 발화하지 **않음**을 증명하지 못한다.
 */

/** TextField: disabled 상태에서 onBlur 가 발화하지 않는다 (계약 blockedWhen: disabled) */
export const BlockedWhenDisabledOnBlur: Story = {
  name: 'TextField: disabled 상태에서 onBlur 가 발화하지 않는다',
  args: { type: 'text', label: '이름', value: '홍길동', disabled: true },
  play: async ({ canvasElement, args }) => {
    const input = inputOf(canvasElement);

    // disabled 입력은 클릭·탭으로 포커스를 받지 못한다. 그래서 blur/focusout 을 **직접 디스패치해**
    // 컴포넌트의 차단 로직 자체를 시험한다 (브라우저의 포커스 규칙만 시험하면 단언이 공허해진다).
    input?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    await userEvent.click(canvasElement);

    await expect(args.onBlur).not.toHaveBeenCalled();
  },
};

/** TextField: 활성 상태에서는 onBlur 가 발화한다 — 위 비발생 단언이 공허하지 않음을 보인다 */
export const OnBlurFiresWhenEnabled: Story = {
  name: 'TextField: 활성 상태에서는 onBlur 가 발화한다',
  args: { type: 'text', label: '이름', value: '홍길동', disabled: false },
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('textbox'));
    await userEvent.tab();

    await expect(args.onBlur).toHaveBeenCalled();
  },
};
