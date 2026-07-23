// Result — Storybook 스토리 (CSF3 · Feedback/Result)
//
// [고정 IA] 결과 화면은 사유별 아이콘·색(status) 축을 만들지 않았다 — 두 승격 원본이 시각적으로
// 완전히 동일하고 사유는 제목 문구로만 갈린다(계약 '상태(status) 축을 만들지 않았다'). 그래서
// status kinds(Success·Error…)를 비교하는 Variants 그룹이 없다. 대신 아래 그룹만 쓴다:
//   Overview        — 실제 쓰임새 한눈에(네 줄이 모두 있는 대표 복구 화면)
//   Content/        — 콘텐츠 형태: 어느 줄이 그려지고 어느 줄이 빈 문자열 센티널로 사라지는가
//   Examples/       — 실제 사용 사례(권한 없음 403 · 찾을 수 없음 404)
//   Accessibility/  — Live Region(role=alert · ARIA) · RTL(dir=rtl · 한국어)
// argTypes 는 계약 생성물(generated/argtypes/Result.argtypes)을 spread 한다 (수기 작성 금지 — G5).
// actions 는 슬롯이라 control 비활성 — Story args 로 <Button> 을 직접 넣는다.
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { ResultArgTypes } from '../../../generated/argtypes/Result.argtypes';
import { Button } from '../../atoms/Button';
import { Result } from './Result';

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

const meta: Meta<typeof Result> = {
  title: 'Design System/Components/Result',
  component: Result,
  argTypes: { ...ResultArgTypes },
  args: {
    title: '문제가 발생했어요',
    description:
      '화면을 그리는 중 예상하지 못한 오류가 났어요. 다시 시도해도 같은 문제가 계속되면 아래 코드와 함께 알려 주세요.',
    reference: 'A1B2-C3D4',
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Result>;

/** Overview — 실제 쓰임새 한눈에. 네 줄이 모두 있는 최대 형태 (렌더 예외 복구 화면, EXC-01) */
export const Overview: Story = {
  args: {
    actions: (
      <>
        <Button variant="primary">다시 시도</Button>
        <Button variant="secondary">대시보드로</Button>
      </>
    ),
  },
};

/** 복구 액션 하나 — 가장 흔한 형태. 제목·설명·참조·단일 액션이 놓인다 */
export const WithAction: Story = {
  name: 'Content/With Action',
  args: {
    actions: <Button variant="primary">다시 시도</Button>,
  },
};

/** 최소 콘텐츠 — 제목 하나. 설명·참조·액션이 모두 비면 h2 만 남는다 */
export const Minimal: Story = {
  name: 'Content/Minimal',
  args: { description: '', reference: '', actions: null },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { level: 2 })).not.toBeNull();
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
  },
};

/** 긴 설명 — 한 문단이 읽기 폭 상한 안에서 줄바꿈된다 (space.6 배수, px 리터럴 없음) */
export const LongMessage: Story = {
  name: 'Content/Long Message',
  args: {
    description:
      '요청을 처리하는 중 서버가 응답하지 않았어요. 잠시 후 다시 시도해 주세요. 문제가 계속되면 화면 하단의 참조 코드를 복사해 운영 담당자에게 전달해 주시면 더 빠르게 확인할 수 있어요.',
    actions: <Button variant="primary">다시 시도</Button>,
  },
};

/** 참조 코드 없음 — 빈 문자열이면 그 줄 자체가 사라진다 (빈 줄을 남기지 않는다) */
export const WithoutReference: Story = {
  name: 'Content/Without Reference',
  args: {
    reference: '',
    actions: <Button variant="primary">다시 시도</Button>,
  },
};

/** 액션 없음 — 빠져나갈 수단을 주지 않으면 액션 줄을 그리지 않는다 */
export const WithoutActions: Story = {
  name: 'Content/Without Actions',
  args: { actions: null },
};

/**
 * 권한 없음 (EXC-03) — 재시도 버튼을 주지 않는다. 다시 눌러도 또 403 이므로
 * 할 수 있는 일은 권한이 있는 곳으로 가는 것뿐이다. 참조 코드도 없다.
 */
export const Forbidden: Story = {
  name: 'Examples/Forbidden',
  args: {
    title: '접근 권한이 없어요',
    description: '이 화면을 볼 수 있는 권한이 없어요. 필요하다면 관리자에게 권한을 요청해 주세요.',
    reference: '',
    actions: <Button variant="secondary">대시보드로</Button>,
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    // 액션은 하나뿐 — '다시 시도' 가 없는 것이 이 화면의 계약이다
    await expect(canvas.getAllByRole('button')).toHaveLength(1);
  },
};

/** 찾을 수 없음 (404) — 주소가 가리키는 화면이 없다. 참조 코드 없이 목록으로 되돌린다 */
export const NotFound: Story = {
  name: 'Examples/Not Found',
  args: {
    title: '페이지를 찾을 수 없어요',
    description: '주소가 바뀌었거나 삭제된 화면이에요. 목록에서 다시 찾아 주세요.',
    reference: '',
    actions: <Button variant="secondary">목록으로</Button>,
  },
};

/** Live Region — role="alert" 로 렌더 즉시 보조기술에 참조 코드까지 전달된다 */
export const LiveRegion: Story = {
  name: 'Accessibility/Live Region',
  args: {
    actions: <Button variant="primary">다시 시도</Button>,
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const alert = within(canvasElement).getByRole('alert');
    await expect(alert.textContent).toContain('A1B2-C3D4');
  },
};

/** RTL — dir=rtl 에서 flex 흐름이 뒤집혀 제목·설명·액션이 오른쪽부터 흐른다 (한국어 콘텐츠) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: {
    title: '문제가 발생했어요',
    description: '화면을 그리는 중 예상하지 못한 오류가 났어요. 다시 시도해 주세요.',
    reference: 'A1B2-C3D4',
    actions: <Button variant="primary">다시 시도</Button>,
  },
  decorators: [rtlFrame],
};
