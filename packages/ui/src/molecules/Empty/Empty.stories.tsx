// Empty — Storybook 스토리 (CSF3 · Molecules/Empty)
//
// [고정 IA] Empty 는 표현형(presentational) 몰레큘이다 — 사유별 아이콘·색 축이 없으므로 Variants/Sizes 가
// 없다. 세 모드(진짜 비어있음·검색 결과 없음·필터 결과 없음)는 state 가 아니라 hasQuery/hasActiveFilters
// prop 조합이다(계약 states = default 하나). 그래서 아래 그룹만 쓴다:
//   Overview        — 실제 쓰임새 한눈에(진짜 비어있음 + 생성 CTA)
//   Content/        — 콘텐츠 형태: 최소 형태·긴 라벨 줄바꿈·조사(助詞) 자동 선택
//   Examples/       — 실제 사용 사례(검색 결과 없음·필터 결과 없음, 복구 이벤트 발화 단언 포함)
//   Accessibility/  — role=status 라이브 영역(ARIA) · RTL(dir=rtl · 한국어)
// 복구 이벤트(onClearSearch·onResetFilters) 발화 단언은 그 사례가 실제로 놓이는 Examples play 안에 둔다
// (별도 Interaction 그룹으로 분리하지 않는다 — 표현형 자매 컴포넌트 Result 와 동일 방침).
// argTypes 는 계약 생성물(generated/argtypes/Empty.argtypes)을 spread 한다 (수기 작성 금지 — G5).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';

import { EmptyArgTypes } from '../../../generated/argtypes/Empty.argtypes';
import { Button } from '../../atoms/Button';
import { Empty } from './Empty';

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

const meta: Meta<typeof Empty> = {
  title: 'Design System/Components/Empty',
  component: Empty,
  argTypes: { ...EmptyArgTypes },
  args: {
    label: '회원',
    createVerb: '등록',
    hasQuery: false,
    hasActiveFilters: false,
    onClearSearch: fn(),
    onResetFilters: fn(),
  },
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof Empty>;

/** Overview — 실제 쓰임새 한눈에. 진짜 비어있음 + 생성 CTA 슬롯 (받침 있는 label '회원' → 조사 '이') */
export const Overview: Story = {
  args: {
    action: <Button variant="primary">회원 등록</Button>,
  },
};

/** 최소 형태 — 생성 CTA 슬롯이 없으면 제목·설명만 남는다(복구 버튼도 없다) */
export const Minimal: Story = {
  name: 'Content/Minimal',
  args: { action: null },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('등록된 회원이 없어요')).not.toBeNull();
    await expect(canvas.queryAllByRole('button')).toHaveLength(0);
  },
};

/** 긴 라벨 — 라벨이 길어도 제목이 읽기 폭 안에서 줄바꿈된다 (px 리터럴 없이 토큰 폭 상한) */
export const LongMessage: Story = {
  name: 'Content/Long Message',
  args: {
    label: '장기 미접속으로 휴면 전환 예정인 대상 회원',
    action: <Button variant="primary">회원 등록</Button>,
  },
};

/** 조사(助詞) 자동 선택 — 받침 없는 label('카페')은 '가'. 리터럴 '이(가)' 를 절대 출하하지 않는다 (ERP-13) */
export const JosaParticle: Story = {
  name: 'Content/Josa Particle',
  args: { label: '카페', createVerb: '등록', action: null },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status');
    await expect(status.textContent).toContain('등록된 카페가 없어요');
    await expect(status.textContent).not.toContain('이(가)');
  },
};

/** 검색 결과 없음 — hasQuery 로 '조건에 맞는 회원이 없습니다' + '검색 지우기'(onClearSearch 발화) */
export const SearchNoResults: Story = {
  name: 'Examples/No Search Results',
  args: { hasQuery: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('조건에 맞는 회원이 없어요')).not.toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: '검색 지우기' }));
    await expect(args.onClearSearch).toHaveBeenCalled();
  },
};

/** 필터 결과 없음 — hasActiveFilters 로 '필터에 맞는 회원이 없습니다' + '필터 초기화'(onResetFilters 발화) */
export const FilterNoResults: Story = {
  name: 'Examples/No Filter Results',
  args: { hasActiveFilters: true },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('필터에 맞는 회원이 없어요')).not.toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: '필터 초기화' }));
    await expect(args.onResetFilters).toHaveBeenCalled();
  },
};

/** ARIA — role="status"(=aria-live polite) 라이브 영역이 렌더 즉시 '왜 비었는지'를 전달한다. 삽화는 aria-hidden */
export const Aria: Story = {
  name: 'Accessibility/ARIA',
  args: {
    action: <Button variant="primary">회원 등록</Button>,
  },
  play: async ({ canvasElement }) => {
    const status = within(canvasElement).getByRole('status');
    await expect(status).not.toBeNull();
    await expect(status.textContent).toContain('등록된 회원이 없어요');
  },
};

/** RTL — dir=rtl 에서 흐름이 뒤집혀 아이콘·제목·설명·액션이 오른쪽부터 흐른다 (한국어 콘텐츠) */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  args: {
    action: <Button variant="primary">회원 등록</Button>,
  },
  decorators: [rtlFrame],
};
