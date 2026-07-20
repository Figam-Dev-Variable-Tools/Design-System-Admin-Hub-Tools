// Icon — Storybook 스토리 (CSF3 · Media/Icon)
//
// argTypes 는 계약 생성물(generated/argtypes/Icon.argtypes)을 spread 한다 (수기 작성 금지 — G5).
//
// 커버리지 방침: 아이콘 이름은 **자산 축**이라 값마다 동작이 달라지지 않는다. 59종 × 4단
// = 236개 스토리는 커버리지가 아니라 소음이므로, 이름 전량은 Gallery 한 칸에 격자로 싣는다
// (사람이 한 화면에서 빠진 것을 눈으로 찾을 수 있어야 한다는 것이 목적이다).
// 크기·label·Dark/RTL 같은 **동작이 달라지는 축**만 개별 스토리로 남긴다.
import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { IconArgTypes } from '../../../generated/argtypes/Icon.argtypes';
import { ICON_SHAPES } from '../../../generated/icons/icon-geometry';
import type { IconName, IconSize } from '../../../generated/types/Icon.types';
import { Icon } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'Media/Icon',
  component: Icon,
  argTypes: { ...IconArgTypes },
  args: { name: 'close', size: 'inherit', label: '' },
  parameters: { layout: 'centered' },
};

export default meta;

type Story = StoryObj<typeof Icon>;

const rtlFrame: Decorator = (Story) => (
  <div dir="rtl" style={{ padding: 'var(--tds-space-5)' }}>
    <Story />
  </div>
);

/* ── name × size 조합 ───────────────────────────────────────────────────────
 * 대표 11종 × 4단(sm·md·lg·inherit). 이름 전량은 아래 Gallery 가 맡는다 —
 * 여기서 보려는 것은 '이름이 몇 개인가' 가 아니라 **단이 바뀌면 무엇이 달라지는가** 다.
 */

/** 이름과 크기만 다른 조합 스토리를 한 줄로 만든다 (본문이 같아 손으로 반복할 이유가 없다) */
const combo = (name: IconName, size: IconSize): Story => ({ args: { name, size } });

export const CloseSm: Story = combo('close', 'sm');
export const CloseMd: Story = combo('close', 'md');
export const CloseLg: Story = combo('close', 'lg');
export const XCircleSm: Story = combo('x-circle', 'sm');
export const XCircleMd: Story = combo('x-circle', 'md');
export const XCircleLg: Story = combo('x-circle', 'lg');
export const PlusCircleSm: Story = combo('plus-circle', 'sm');
export const PlusCircleMd: Story = combo('plus-circle', 'md');
export const PlusCircleLg: Story = combo('plus-circle', 'lg');
export const PencilSm: Story = combo('pencil', 'sm');
export const PencilMd: Story = combo('pencil', 'md');
export const PencilLg: Story = combo('pencil', 'lg');
export const TrashSm: Story = combo('trash', 'sm');
export const TrashMd: Story = combo('trash', 'md');
export const TrashLg: Story = combo('trash', 'lg');
export const DownloadSm: Story = combo('download', 'sm');
export const DownloadMd: Story = combo('download', 'md');
export const DownloadLg: Story = combo('download', 'lg');
export const ImageSm: Story = combo('image', 'sm');
export const ImageMd: Story = combo('image', 'md');
export const ImageLg: Story = combo('image', 'lg');
export const UploadSm: Story = combo('upload', 'sm');
export const UploadMd: Story = combo('upload', 'md');
export const UploadLg: Story = combo('upload', 'lg');
export const SearchSm: Story = combo('search', 'sm');
export const SearchMd: Story = combo('search', 'md');
export const SearchLg: Story = combo('search', 'lg');
export const ChevronLeftSm: Story = combo('chevron-left', 'sm');
export const ChevronLeftMd: Story = combo('chevron-left', 'md');
export const ChevronLeftLg: Story = combo('chevron-left', 'lg');
export const ChevronRightSm: Story = combo('chevron-right', 'sm');
export const ChevronRightMd: Story = combo('chevron-right', 'md');
export const ChevronRightLg: Story = combo('chevron-right', 'lg');

/* size=inherit — 부모 글자 크기를 그대로 따르는 단. 본문 안에 섞여 들어가는 자리다 */
export const CloseInherit: Story = combo('close', 'inherit');
export const XCircleInherit: Story = combo('x-circle', 'inherit');
export const PlusCircleInherit: Story = combo('plus-circle', 'inherit');
export const PencilInherit: Story = combo('pencil', 'inherit');
export const TrashInherit: Story = combo('trash', 'inherit');
export const DownloadInherit: Story = combo('download', 'inherit');
export const ImageInherit: Story = combo('image', 'inherit');
export const UploadInherit: Story = combo('upload', 'inherit');
export const SearchInherit: Story = combo('search', 'inherit');
export const ChevronLeftInherit: Story = combo('chevron-left', 'inherit');
export const ChevronRightInherit: Story = combo('chevron-right', 'inherit');

/* ── 접근성·색 축 ───────────────────────────────────────────────────────────── */

/** label 없음 — 장식으로 간주해 aria-hidden 처리된다 (인접 텍스트가 의미를 제공하는 경우) */
export const Decorative: Story = {
  args: { name: 'search', label: '' },
};

/** label 있음 — role=img + aria-label 로 이름이 노출된다 */
export const Labelled: Story = {
  args: { name: 'trash', label: '삭제' },
};

/** 색은 currentColor — 부모의 color 를 그대로 따른다 */
export const InheritsColor: Story = {
  args: { name: 'plus-circle', size: 'lg' },
  decorators: [
    (Story) => (
      <div style={{ color: 'var(--tds-color-feedback-danger-text)' }}>
        <Story />
      </div>
    ),
  ],
};

/** RTL — 방향 아이콘은 미러링하지 않는다(레이아웃이 뒤집혀도 글리프는 그대로) */
export const RightToLeft: Story = {
  args: { name: 'chevron-right', size: 'lg' },
  decorators: [rtlFrame],
};

/* ── 전량 갤러리 ────────────────────────────────────────────────────────────── */

/**
 * Gallery — 계약이 선언한 아이콘 **전량**을 이름과 함께 격자로 늘어놓는다.
 *
 * 목록을 손으로 적지 않는다: 생성 기하(ICON_SHAPES)의 키를 그대로 쓰므로 아이콘이 늘면
 * 이 화면도 자동으로 따라온다. 빠진 아이콘은 눈으로 바로 찾을 수 있고, 모양이 비어 있으면
 * 빈 칸으로 드러난다.
 */
export const Gallery: Story = {
  parameters: { layout: 'padded', controls: { disable: true } },
  render: () => {
    const names = Object.keys(ICON_SHAPES) as IconName[];
    return (
      <section>
        <p
          style={{
            marginBottom: 'var(--tds-space-4)',
            color: 'var(--tds-color-text-muted)',
            // typography 토큰은 축약형 `font` 로 해석되지 않는다 — codegen 이 네 속성으로 전개한다.
            // 한 이름으로 쓰면 선언이 무효가 되어 조용히 상속값으로 떨어진다.
            fontFamily: 'var(--tds-typography-body-md-font-family)',
            fontSize: 'var(--tds-typography-body-md-font-size)',
            fontWeight: 'var(--tds-typography-body-md-font-weight)',
            lineHeight: 'var(--tds-typography-body-md-line-height)',
          }}
        >
          아이콘 {names.length}종 — 이름은 계약(contracts/Icon.contract.json)의 name 값
          그대로입니다.
        </p>
        <ul
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(7.5rem, 1fr))',
            gap: 'var(--tds-space-3)',
            listStyle: 'none',
            margin: 0,
            padding: 0,
          }}
        >
          {names.map((name) => (
            <li
              key={name}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--tds-space-2)',
                padding: 'var(--tds-space-3)',
                border: 'var(--tds-border-width-thin) solid var(--tds-color-border-default)',
                borderRadius: 'var(--tds-radius-md)',
                background: 'var(--tds-color-surface-raised)',
              }}
            >
              <Icon name={name} size="lg" />
              <code
                style={{
                  fontFamily: 'var(--tds-typography-caption-md-font-family)',
                  fontSize: 'var(--tds-typography-caption-md-font-size)',
                  fontWeight: 'var(--tds-typography-caption-md-font-weight)',
                  lineHeight: 'var(--tds-typography-caption-md-line-height)',
                  color: 'var(--tds-color-text-muted)',
                  textAlign: 'center',
                  wordBreak: 'break-all',
                }}
              >
                {name}
              </code>
            </li>
          ))}
        </ul>
      </section>
    );
  },
};
