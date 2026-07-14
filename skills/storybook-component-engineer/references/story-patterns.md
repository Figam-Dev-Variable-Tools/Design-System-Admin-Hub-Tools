# Story 패턴 — A30 Storybook Component Engineer

> 예시는 설계서 §5.2의 Button 계약(variant 4 × size 3 × states 6, `onClick.blockedWhen: ["disabled","loading"]`) 기준.
> **모든 enum 값 목록·argTypes는 손으로 쓰지 않는다** — `packages/ui/generated/**`(codegen 산출물)에서 import한다.
> 산출물이 없으면 먼저 `pnpm codegen` (= `pnpm --filter @tds/codegen run generate`), 검증은 `pnpm contract-test`.

## 0. Meta 골격 (CSF3 + generated argTypes)

```tsx
// packages/ui/src/atoms/Button/Button.stories.tsx
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
// codegen 산출물 — 계약에서 자동 생성된 argTypes/타입만 사용 (수동 선언 금지)
import { buttonArgTypes, buttonVariants, buttonSizes } from "../../../generated/Button";

const meta = {
  title: "Atoms/Button",       // 레벨 경로 반영 (atomic-design-rules.md §5)
  component: Button,
  argTypes: buttonArgTypes,     // 계약 → 자동 생성. 여기에 항목을 손으로 추가하면 A74가 G5를 차단한다
  args: { children: "확인" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;
```

## 1. 조합 커버리지 패턴 (variant × size × state 전수)

기본 Story는 조합마다 1개씩 명시적으로 두는 대신, **generated enum 배열을 순회하는 매트릭스 Story + 상태별 개별 Story**로 전수를 보장한다. A74(contract-test)가 계약과 대조해 커버리지 100%를 기계 검증하므로, 조합을 수동 열거로 누락시키지 않는 것이 핵심이다.

```tsx
// variant × size 매트릭스 — generated 배열 순회 (계약이 바뀌면 자동 추종)
export const VariantSizeMatrix: Story = {
  render: (args) => (
    <table>
      <tbody>
        {buttonVariants.map((variant) => (
          <tr key={variant}>
            {buttonSizes.map((size) => (
              <td key={size}>
                <Button {...args} variant={variant} size={size}>
                  {variant}/{size}
                </Button>
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  ),
};

// 상태(state)축 — 계약 states 전부. pseudo-state(hover/active/focus-visible)는
// @storybook/addon-pseudo-states의 parameters.pseudo로 재현한다
export const Hover: Story = { parameters: { pseudo: { hover: true } } };
export const Active: Story = { parameters: { pseudo: { active: true } } };
export const FocusVisible: Story = { parameters: { pseudo: { focusVisible: true } } };

// boolean prop은 true/false 모두 Story 존재해야 함 (G5 체크리스트)
export const Loading: Story = { args: { loading: true } };
export const NotLoading: Story = { args: { loading: false } };
export const Disabled: Story = { args: { disabled: true } };
export const Enabled: Story = { args: { disabled: false } };
```

규칙:
- enum × enum 조합은 매트릭스 Story로 전수, boolean/state 축은 각각 명시 Story로.
- 조합 목록의 원천은 항상 generated 배열 — 문자열 리터럴 하드코딩 금지 (계약 변경 시 drift 발생).
- 작성 후 `pnpm contract-test`로 커버리지 100% 확인. 미달 항목은 리포트(`reports/contract-test/`)에 나온다.

## 2. Play Function 패턴 (`events.blockedWhen` 전수 검증)

계약의 각 이벤트 × 각 차단 상태마다 **별도 Story**를 만든다. Button 계약은 `onClick.blockedWhen: ["disabled", "loading"]` → 2개 Story 필수.

```tsx
import { expect, fn, userEvent, within } from "@storybook/test";

// blockedWhen: "disabled" — disabled 상태에서 onClick 미발화 검증
export const DisabledBlocksClick: Story = {
  args: { disabled: true, onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button"); // 계약 a11y.role
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(button).toHaveAttribute("aria-disabled", "true"); // 계약 a11y.ariaDisabled
  },
};

// blockedWhen: "loading" — loading 상태에서 onClick 미발화 + aria-busy 검증
export const LoadingBlocksClick: Story = {
  args: { loading: true, onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
    await expect(button).toHaveAttribute("aria-busy", "true"); // 계약 a11y.ariaBusy
  },
};

// 대조군: 차단 상태가 아닐 때는 정상 발화해야 한다
export const ClickFires: Story = {
  args: { onClick: fn() },
  play: async ({ args, canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button"));
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

// 키보드 발화 — 계약 a11y.keyboard: ["Enter", "Space"] 전수
export const KeyboardFires: Story = {
  args: { onClick: fn() },
  play: async ({ args, canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    button.focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard(" ");
    await expect(args.onClick).toHaveBeenCalledTimes(2);
  },
};
```

규칙:
- 콜백은 반드시 `fn()`(spy)로 주입 — 호출 여부를 단언 가능해야 한다.
- 차단 검증(`not.toHaveBeenCalled`)과 대조군(정상 발화) Story를 짝으로 둔다.
- 요소 조회는 계약 `a11y.role` 기반 `getByRole` — CSS 셀렉터 조회 금지 (a11y 구조까지 함께 검증).

## 3. Dark 패턴 (`parameters.backgrounds` + 테마 데코레이터)

배경색 전환만으로는 다크 토큰이 적용되지 않는다 — **backgrounds와 테마 스코프(data-theme)를 함께** 건다. 배경값도 토큰에서 온 값이어야 한다 (하드코딩 hex 금지 원칙은 Story 파라미터에도 적용, 토큰 빌드 산출 CSS 변수 사용).

```tsx
export const DarkMode: Story = {
  parameters: {
    backgrounds: {
      default: "dark",
      values: [
        // 값은 tokens.json 다크 페어링에서 빌드된 CSS 변수 — 임의 hex 금지
        { name: "dark", value: "var(--tds-color-bg-canvas-dark)" },
        { name: "light", value: "var(--tds-color-bg-canvas)" },
      ],
    },
  },
  decorators: [
    (Story) => (
      <div data-theme="dark">
        <Story />
      </div>
    ),
  ],
};
```

규칙:
- 다크 Story는 컴포넌트마다 최소 1개 필수 (G5 exit: "Dark/RTL/Responsive/Long-content Story").
- 다크에서 대비비가 계약 `a11y.contrastMin` 미만으로 떨어지면 구현 문제가 아니라 토큰 페어링 문제일 수 있다 → A20 change_request (임의로 색을 밝게 하드코딩 금지).

## 4. RTL 패턴

```tsx
export const RTL: Story = {
  globals: { direction: "rtl" }, // 툴바 글로벌 사용 시
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
  args: { iconLeft: undefined /* 방향성 슬롯이 있으면 RTL에서 미러링 확인 */ },
};
```

- 물리 속성(`margin-left` 등) 대신 논리 속성(`margin-inline-start`)을 썼는지 이 Story에서 눈으로 확인된다.

## 5. Responsive 패턴 (계약 `responsive.breakpoints` 전수)

```tsx
// 계약 responsive.breakpoints: ["sm","md","lg"] → 각 브레이크포인트 Story
export const ViewportSm: Story = { parameters: { viewport: { defaultViewport: "sm" } } };
export const ViewportMd: Story = { parameters: { viewport: { defaultViewport: "md" } } };
export const ViewportLg: Story = { parameters: { viewport: { defaultViewport: "lg" } } };
```

- viewport 프리셋 이름은 Storybook 전역 설정의 브레이크포인트 정의(토큰 기반)와 일치시킨다.
- 계약 `responsive.behavior`(size-fixed/fluid/stack/hide/collapse)가 각 뷰포트에서 실제로 나타나는지 Story 화면으로 검증 가능해야 한다.

## 6. Long-content 패턴 (slot 최소/최대 케이스)

```tsx
// 최대: 긴 텍스트 — 말줄임/줄바꿈 정책 확인
export const LongLabel: Story = {
  args: { children: "저장하고 다음 단계로 진행하기 ".repeat(8).trim() },
};

// 줄바꿈 강제
export const MultilineLabel: Story = {
  args: { children: <>첫 번째 줄<br />두 번째 줄</> },
};

// 오버플로우 — 좁은 컨테이너 안에서의 거동
export const OverflowInNarrowContainer: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: "var(--tds-size-container-xs)" }}>
        <Story />
      </div>
    ),
  ],
  args: { children: "UnbreakableSuperLongSingleTokenLabelForOverflowTest" },
};

// 최소: 빈/최소 콘텐츠 (slot prop이 optional인 경우)
export const MinimalContent: Story = { args: { children: "OK" } };
```

- slot prop(`type: "slot" | "node"`)마다 최소 1개(최소 콘텐츠) + 최소 1개(최대/오버플로우) Story가 있어야 G5 체크리스트("Slot에 최소/최대 콘텐츠 케이스") 통과.

## 7. 제출 전 셀프 체크 (G5 체크리스트 §8 순서 그대로)

```
pnpm contract-test   # argTypes 일치 + 조합 커버리지 100% (reports/contract-test/)
pnpm a11y            # axe critical/serious 0건 (reports/a11y/)
pnpm sb:build        # Storybook 빌드 통과
```

셋 중 하나라도 실패하면 review_request를 내지 않는다 — envelope의 `automated_checks`는 실제 실행 결과만 기록한다.
