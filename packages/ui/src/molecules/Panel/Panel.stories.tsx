// Panel — Storybook 스토리 (CSF3 · molecule surface)
//
// [고정 IA] Overview · Content(Minimal·Rich Content·Long Content·With Footer) ·
// Examples(실사용 조립) · Accessibility(RTL·ARIA). Panel 은 props 2개(children·notice)뿐이라
// Playground/Variants/Interaction 을 두지 않는다 — 껍데기(presentational)이며 상호작용은
// 전부 children 의 것이고, 세부 조합은 Docs 의 Controls 로 조작한다.
// Panel 자신은 header/action 슬롯이 없어 Content/With Header Actions 는 해당 없음(생략).
// argTypes 는 계약 생성물(generated/argtypes/Panel.argtypes)을 spread 한다 (수기 작성 금지 — G5).
import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';

import { PanelArgTypes } from '../../../generated/argtypes/Panel.argtypes';
import { Panel } from './Panel';

/** 패널은 좁은 기둥이라 폭을 주지 않으면 캔버스 전체로 퍼진다 */
const railFrame: Decorator = (Story) => (
  <div style={{ inlineSize: 'calc(var(--tds-space-10) * 5)' }}>
    <Story />
  </div>
);

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ inlineSize: 'calc(var(--tds-space-10) * 5)' }}>
    <Story />
  </div>
);

/** 스토리용 표본 블록 — 패널이 담는 '축' 한 벌. DS 컴포넌트가 아니라 데모 데이터다 */
interface SampleAxisProps {
  readonly title: string;
  readonly items: readonly string[];
}

function SampleAxis({ title, items }: SampleAxisProps) {
  return (
    <nav
      aria-label={title}
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tds-space-2)' }}
    >
      <h2
        style={{
          margin: 0,
          color: 'var(--tds-color-text-muted)',
          fontSize: 'var(--tds-typography-label-sm-font-size)',
        }}
      >
        {title}
      </h2>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((item) => (
          <li key={item} style={{ padding: 'var(--tds-space-2)' }}>
            {item}
          </li>
        ))}
      </ul>
    </nav>
  );
}

const noticeTextStyle = { margin: 0, color: 'var(--tds-color-text-muted)' } as const;

const meta: Meta<typeof Panel> = {
  title: 'Design System/Components/Panel',
  component: Panel,
  argTypes: { ...PanelArgTypes },
  args: {
    children: <SampleAxis title="분류" items={['전체', '환경', '사회', '지배구조']} />,
  },
  decorators: [railFrame],
};

export default meta;

type Story = StoryObj<typeof Panel>;

/* ── Overview ───────────────────────────────────────────────────────────── */

/** Overview — 대표 사용. 곁 영역 껍데기 위에 분류 축 한 벌이 세로로 놓인다 */
export const Overview: Story = {};

/* ── Content ────────────────────────────────────────────────────────────── */

/** 최소 콘텐츠 — 블록 하나. 안내문이 없으면 구분선 영역도 없다 */
export const ContentMinimal: Story = {
  name: 'Content/Minimal',
  args: {
    children: <SampleAxis title="분류" items={['전체', '환경']} />,
  },
};

/**
 * 구조화 콘텐츠 — 블록이 둘. 축 사이 간격은 껍데기가 소유한다.
 * 화면마다 그릇을 만들면 그 간격이 어긋난다.
 */
export const ContentRich: Story = {
  name: 'Content/Rich Content',
  args: {
    children: (
      <>
        <SampleAxis title="등급" items={['전체', '일반', 'VIP']} />
        <SampleAxis title="그룹" items={['전체', '신규', '휴면']} />
      </>
    ),
  },
};

/**
 * 긴 콘텐츠 — 안내문이 세 문단. <div> 라 문단 여럿을 받는다.
 * <p> 로 감싸면 문단 안에 문단이 들어가 브라우저가 태그를 강제로 닫는다.
 */
export const ContentLong: Story = {
  name: 'Content/Long Content',
  args: {
    notice: (
      <>
        <p style={{ margin: 0 }}>역할은 권한의 묶음이에요.</p>
        <p style={{ margin: 0 }}>기본 역할은 삭제할 수 없어요.</p>
        <p style={{ margin: 0 }}>변경은 즉시 반영돼요.</p>
      </>
    ),
  },
};

/** 하단 안내 영역(footer) — 위쪽 구분선으로 본문 블록들과 갈린다 */
export const ContentWithFooter: Story = {
  name: 'Content/With Footer',
  args: {
    notice: <p style={noticeTextStyle}>그룹은 회원을 묶는 단위예요.</p>,
  },
};

/* ── Examples ───────────────────────────────────────────────────────────── */

/**
 * 실사용 조립 — 필터가 아닌 내용물(상품 폼의 섹션 내비게이션).
 * 이 껍데기는 안에 무엇이 오는지 모른다 (이름을 FilterRail 에서 바꾼 이유).
 */
export const ExampleFormSectionNav: Story = {
  name: 'Examples/Form Section Nav',
  args: {
    children: (
      <nav
        aria-label="폼 섹션"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tds-space-2)' }}
      >
        <a href="#basic">기본 정보</a>
        <a href="#price">가격</a>
        <a href="#images">이미지</a>
      </nav>
    ),
  },
};

/* ── Accessibility ──────────────────────────────────────────────────────── */

/** RTL — 논리 속성만 쓰므로 안내문의 여백이 반대편으로 따라가고 구분선은 위쪽에 남는다 */
export const RightToLeft: Story = {
  name: 'Accessibility/RTL',
  decorators: [rtlFrame],
  args: {
    children: <SampleAxis title="분류" items={['전체', '환경', '사회']} />,
    notice: <p style={noticeTextStyle}>그룹은 회원을 묶는 단위예요.</p>,
  },
};

/**
 * ARIA — 껍데기는 complementary 랜드마크만 내고, 이름은 안의 <nav> 가 갖는다.
 * 패널 자신은 aria-label 도 제목도 갖지 않는다.
 */
export const AriaRegion: Story = {
  name: 'Accessibility/ARIA',
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByRole('complementary')).not.toBeNull();
    await expect(canvas.queryByRole('navigation', { name: '분류' })).not.toBeNull();
  },
};
