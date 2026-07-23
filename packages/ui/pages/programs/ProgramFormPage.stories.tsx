/**
 * Design System/Templates/Programs/Program Form — 프로그램(펀딩) 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/programs/new` → 메뉴 en = "Programs"(프로그램 관리),
 * 화면 en = "Program Form" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Programs 그룹의
 * `['/programs/new', '프로그램 등록', 'Program Form']`).
 *
 * 대응 실화면: apps/admin/src/pages/programs/ProgramFormPage.tsx
 * (라우트 /programs/new · /programs/:id/edit). 후원형 펀딩은 '목표 금액 · 기간 · 리워드' 세 가지가
 * 계약의 전부라, 화면은 구획 카드 5개(기본정보·펀딩설정·스토리·대표이미지·리워드) + 좌측 구획 목차
 * 레일 + 우측 실시간 미리보기로 짜인다. 모금액·후원자수는 **후원이 만드는 값**이라 이 폼에 없다.
 * 미리보기의 남은 일수는 실화면과 같은 고정 시계 `TODAY = '2026-07-21'` 로 센다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   FormPageShell / Card+CardTitle → Card + 토큰만 쓴 <h2>
 *   FilterRail + FormSectionNav    → Panel(notice) + aria-current 앵커 목록 + 오류 점
 *   손으로 쓴 리워드 <table>        → DS Table (칸마다 입력 · 삭제는 IconButton)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로                    → Button 대신 토큰 <a> + Icon(chevron-left)
 *   좌측 구획 목차(FormSectionNav) → Panel + aria-current 목록 + 오류 점
 *   카드 표면 · 카드 제목         → Card + 토큰만 쓴 <h2>
 *   프로그램명/창작자/한 줄 소개   → TextField
 *   카테고리(대분류·중분류)       → FormField + SelectField ×2 (2Depth 연동 · 하위 없으면 잠금)
 *   목표 금액 · 시작일 · 종료일    → FormField + input(text/date, 토큰 controlStyle)
 *   진행 상태                   → FormField + SelectField
 *   스토리(서식)                 → RichTextField
 *   대표 이미지                  → ImageUploadField
 *   리워드 목록 편집기            → Table + 칸별 input + IconButton(trash, 후원된 건은 잠금)
 *   우측 미리보기                → Card + ImageThumb + StatusBadge + dl/dt/dd(토큰)
 *   저장 실패/권한 없음           → Alert(danger/warning)
 *   저장/취소                   → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  formDateRowStyle,
  formRowStyle,
  Icon,
  IconButton,
  ImageThumb,
  ImageUploadField,
  Panel,
  RichTextField,
  SelectField,
  Skeleton,
  StatusBadge,
  Table,
  TextField,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Programs/Program Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 선택지(실화면 _shared/store · types 미러) ─────────────────────────────────────────── */

/** 미리보기 남은 일수의 기준일 — 목록·상세와 같은 고정 시계 */
const TODAY = '2026-07-21';

const PROGRAM_TITLE_MAX = 60;
const PROGRAM_SUMMARY_MAX = 120;
const PROGRAM_CREATOR_MAX = 40;
/** 스토리 카운터의 분모 — 검증이 아니라 **작성 가이드**다(넘겨도 저장은 막히지 않는다) */
const STORY_GUIDE_MAX = 5000;

type ProgramStatus = 'draft' | 'scheduled' | 'live' | 'succeeded' | 'failed';

const STATUS_META: Record<
  ProgramStatus,
  { readonly label: string; readonly tone: StatusBadgeTone }
> = {
  draft: { label: '작성 중', tone: 'neutral' },
  scheduled: { label: '오픈 예정', tone: 'info' },
  live: { label: '진행 중', tone: 'success' },
  succeeded: { label: '성공', tone: 'success' },
  failed: { label: '실패', tone: 'danger' },
};

const STATUS_OPTIONS: readonly ProgramStatus[] = [
  'draft',
  'scheduled',
  'live',
  'succeeded',
  'failed',
];

interface DemoCategory {
  readonly id: string;
  readonly label: string;
  /** 상위 카테고리 id. null 이면 최상위(1Depth · 대분류) */
  readonly parentId: string | null;
}

/** 실화면 store 의 프로그램 카테고리 픽스처 미러 — 2단계(대분류 → 중분류) */
const CATEGORIES: readonly DemoCategory[] = [
  { id: 'tech', label: '테크·가전', parentId: null },
  { id: 'life', label: '리빙·생활', parentId: null },
  { id: 'culture', label: '문화·예술', parentId: null },
  { id: 'tech-audio', label: '음향기기', parentId: 'tech' },
  { id: 'tech-mobile', label: '모바일 액세서리', parentId: 'tech' },
  { id: 'life-kitchen', label: '주방', parentId: 'life' },
  { id: 'life-furniture', label: '가구', parentId: 'life' },
  { id: 'culture-book', label: '출판', parentId: 'culture' },
];

const KO_NUMBER = new Intl.NumberFormat('ko-KR');
const fmt = (value: number): string => KO_NUMBER.format(value);

/** 남은 일수 — 종료일 포함으로 센다. 이미 지났으면 0 */
function daysLeft(endDate: string, today: string): number {
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(end) || Number.isNaN(now)) return 0;
  const diff = Math.ceil((end - now) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/**
 * 입력 중인 문자열 → 숫자(미리보기 전용) — '10,000,000' 처럼 타이핑 중인 값에서 숫자만 건져낸다.
 * 저장 경로는 이 관대함을 쓰지 않는다(거기서는 스키마가 이미 형식을 통과시킨 뒤다).
 */
const previewNumber = (raw: string): number => Number((raw.trim() || '0').replace(/\D/g, '')) || 0;

/* ── 폼 구획(좌측 레일의 한 줄이자 본문의 한 앵커) ────────────────────────────────────────── */

/** 검증 오류 데모 — 실화면 zod 스키마가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly creator?: string;
  readonly categoryId?: string;
  readonly summary?: string;
  readonly goalAmount?: string;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly story?: string;
  readonly coverImageUrl?: string;
  readonly rewards?: string;
}

const SECTIONS: readonly {
  readonly id: string;
  readonly label: string;
  readonly fields: readonly (keyof FieldErrors)[];
}[] = [
  {
    id: 'program-section-basic',
    label: '기본 정보',
    fields: ['title', 'creator', 'categoryId', 'summary'],
  },
  {
    id: 'program-section-funding',
    label: '펀딩 설정',
    fields: ['goalAmount', 'startDate', 'endDate'],
  },
  { id: 'program-section-story', label: '스토리', fields: ['story'] },
  { id: 'program-section-cover', label: '대표 이미지', fields: ['coverImageUrl'] },
  { id: 'program-section-rewards', label: '리워드', fields: ['rewards'] },
];

/** 최초 활성 구획 id — 배열 인덱스 접근 대신 상수로 고정한다(noUncheckedIndexedAccess) */
const FIRST_SECTION_ID = 'program-section-basic';

const DEMO_ERRORS: FieldErrors = {
  title: '프로그램명을 입력하세요.',
  creator: '창작자를 입력하세요.',
  categoryId: '카테고리를 선택하세요.',
  summary: '한 줄 소개를 입력하세요.',
  goalAmount: '목표 금액을 입력하세요.',
  endDate: '종료일은 시작일보다 뒤여야 해요.',
  rewards: '리워드를 한 개 이상 등록하세요.',
};

/* ── 데모 데이터(실화면 store 픽스처 pgm-1 을 폼 값으로 되돌린 형태) ─────────────────────────── */

interface DemoReward {
  readonly id: string;
  readonly title: string;
  readonly amount: number;
  readonly description: string;
  /** 수량 한정. 0 이면 무제한 */
  readonly limitCount: number;
  /** 후원이 만드는 값 — 폼이 손댈 축이 아니고, 1 이상이면 삭제도 막힌다 */
  readonly claimedCount: number;
}

interface SeedValues {
  readonly title: string;
  readonly creator: string;
  readonly categoryId: string;
  readonly summary: string;
  readonly story: string;
  readonly goalAmount: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: ProgramStatus;
  readonly coverImageUrl: string;
  readonly rewards: readonly DemoReward[];
  /** 저장된 모금 현황 — 폼 값이 아니라 사실이라 입력에 따라 움직이지 않는다 */
  readonly pledgedAmount?: number;
}

/** 인라인 SVG 미리보기 — 외부 자산 없이 data: URI 로만 이미지를 흉내낸다 */
const svgDataUri = (label: string, hue: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="140" viewBox="0 0 240 140"><rect width="240" height="140" fill="${hue}"/><text x="120" y="74" font-family="sans-serif" font-size="16" fill="white" text-anchor="middle">${label}</text></svg>`,
  )}`;

const EMPTY_SEED: SeedValues = {
  title: '',
  creator: '',
  categoryId: '',
  summary: '',
  story: '',
  goalAmount: '',
  startDate: '',
  endDate: '',
  // 새 프로그램은 '작성 중' 에서 출발한다 — 열기 전에 스토리·리워드를 마저 채우는 것이 보통이다
  status: 'draft',
  coverImageUrl: '',
  rewards: [],
};

const EDIT_SEED: SeedValues = {
  title: '무선 스튜디오 모니터 헤드폰',
  creator: '사운드랩',
  categoryId: 'tech-audio',
  summary: '스튜디오 모니터링을 그대로 옮긴 무선 헤드폰',
  story:
    '<p>작업실 밖에서도 <strong>같은 소리</strong>를 듣고 싶었어요.</p><ul><li>지연 없는 무선 전송</li><li>스튜디오 튜닝 그대로</li></ul>',
  goalAmount: '10000000',
  startDate: '2026-06-01',
  endDate: '2026-07-31',
  status: 'live',
  coverImageUrl: svgDataUri('대표 이미지', 'steelblue'),
  rewards: [
    {
      id: 'rw-1-1',
      title: '얼리버드 1대',
      amount: 189_000,
      description: '정가 대비 30% 할인',
      limitCount: 100,
      claimedCount: 100,
    },
    {
      id: 'rw-1-2',
      title: '일반 1대',
      amount: 219_000,
      description: '본품 + 파우치',
      limitCount: 0,
      claimedCount: 280,
    },
    {
      id: 'rw-1-3',
      title: '2대 세트',
      amount: 398_000,
      description: '본품 2대 + 스탠드',
      limitCount: 50,
      claimedCount: 32,
    },
  ],
  pledgedAmount: 14_320_000,
};

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  color: cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
};

/** 좌: 구획 목차 레일 / 우: 폼 본문 + 미리보기 */
const shellStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const bodyGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const railHeadingStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const railListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

const railLinkStyle = (active: boolean): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.text.default') : cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
});

const invalidDotStyle: CSSProperties = {
  display: 'inline-block',
  width: cssVar('space.2'),
  height: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.feedback.danger.border'),
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const controlStyle = (invalid: boolean): CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: invalid ? cssVar('color.feedback.danger.border') : cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
});

const rewardInputStyle: CSSProperties = {
  ...controlStyle(false),
  minWidth: `calc(${cssVar('space.6')} * 4)`,
};

const rewardNumberInputStyle: CSSProperties = {
  ...controlStyle(false),
  width: `calc(${cssVar('space.6')} * 3)`,
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
};

const rewardSectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const errorTextStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.feedback.danger.text'),
  margin: 0,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/* ── 미리보기 스타일 ──────────────────────────────────────────────────────────────────────── */

const previewCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  boxSizing: 'border-box',
  width: '100%',
  padding: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
};

const previewTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
  overflowWrap: 'anywhere',
};

const previewSummaryStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.caption.md'),
  overflowWrap: 'anywhere',
};

const previewBadgeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  flexWrap: 'wrap',
};

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 4) minmax(0, 1fr)`,
  gap: cssVar('space.2'),
  margin: 0,
};

const dtStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const ddStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  margin: 0,
  overflowWrap: 'anywhere',
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function FormCard({
  id,
  title,
  children,
}: {
  readonly id?: string;
  readonly title: string;
  readonly children: ReactNode;
}) {
  const titleId = useId();
  return (
    <section {...(id !== undefined && { id })} aria-labelledby={titleId}>
      <Card aria-labelledby={titleId}>
        <div style={cardBodyStyle}>
          <h2 id={titleId} style={cardTitleStyle}>
            {title}
          </h2>
          {children}
        </div>
      </Card>
    </section>
  );
}

/* ── 좌측 구획 목차(FormSectionNav 미러: aria-current + 오류 점) ───────────────────────────── */

function SectionNav({
  activeId,
  errors,
}: {
  readonly activeId: string;
  readonly errors: FieldErrors;
}) {
  return (
    <Panel
      notice={
        <p style={hintStyle}>
          구획을 누르면 해당 위치로 이동해요. 붉은 점이 붙은 구획에는 확인이 필요한 입력이 남아
          있어요.
        </p>
      }
    >
      <nav aria-label="프로그램 폼 구획 이동">
        <p style={railHeadingStyle}>구획</p>
        <ul style={railListStyle}>
          {SECTIONS.map((section) => {
            const active = section.id === activeId;
            const invalid = section.fields.some((field) => errors[field] !== undefined);
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  style={railLinkStyle(active)}
                  {...(active ? { 'aria-current': 'true' as const } : {})}
                >
                  <span>{section.label}</span>
                  {invalid && <span style={invalidDotStyle} aria-label="확인 필요" role="img" />}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </Panel>
  );
}

/* ── 리워드 편집기(칸마다 직접 편집 · 이미 후원된 리워드는 삭제 잠금) ───────────────────────── */

const REWARD_COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '리워드명' },
  { id: 'amount', header: '후원 금액(원)', align: 'end' },
  { id: 'description', header: '설명' },
  { id: 'limit', header: '수량 한정', align: 'end' },
  { id: 'claimed', header: '후원 수', align: 'end' },
  { id: 'remove', header: '삭제', nowrap: true },
];

function RewardEditor({
  rewards,
  disabled,
  error,
  onChange,
}: {
  readonly rewards: readonly DemoReward[];
  readonly disabled: boolean;
  readonly error?: string;
  readonly onChange: (next: readonly DemoReward[]) => void;
}) {
  const rows: TableProps['rows'] = rewards.map((reward, index) => {
    const rowName = reward.title.trim() === '' ? `리워드 ${String(index + 1)}` : reward.title;
    const claimed = reward.claimedCount > 0;
    return {
      id: reward.id,
      cells: [
        <input
          key="title"
          type="text"
          style={rewardInputStyle}
          defaultValue={reward.title}
          placeholder="예: 얼리버드 1대"
          disabled={disabled}
          aria-label={`${rowName} 리워드명`}
        />,
        <input
          key="amount"
          type="text"
          inputMode="numeric"
          style={rewardNumberInputStyle}
          defaultValue={String(reward.amount)}
          disabled={disabled}
          aria-label={`${rowName} 후원 금액`}
        />,
        <input
          key="description"
          type="text"
          style={rewardInputStyle}
          defaultValue={reward.description}
          placeholder="예: 본품 + 파우치"
          disabled={disabled}
          aria-label={`${rowName} 설명`}
        />,
        <input
          key="limit"
          type="text"
          inputMode="numeric"
          style={rewardNumberInputStyle}
          defaultValue={String(reward.limitCount)}
          disabled={disabled}
          aria-label={`${rowName} 수량 한정 (0 이면 무제한)`}
        />,
        // 후원 수는 후원이 만드는 값이라 읽기 전용이다 — 폼이 손댈 축이 아니다
        `${fmt(reward.claimedCount)}명`,
        <IconButton
          key="remove"
          icon={<Icon name="trash" />}
          label={claimed ? `${rowName} — 이미 후원된 리워드라 삭제할 수 없어요` : `${rowName} 삭제`}
          size="sm"
          disabled={disabled || claimed}
          onClick={() => onChange(rewards.filter((item) => item.id !== reward.id))}
        />,
      ],
    };
  });

  return (
    <div style={rewardSectionStyle}>
      <p style={hintStyle}>
        후원자가 고를 리워드를 등록하세요. 수량 한정은 0 이면 무제한이에요. 이미 후원된 리워드는
        삭제할 수 없어요 — 후원자가 받기로 한 대가가 사라지기 때문이에요.
      </p>

      {rewards.length === 0 ? (
        <p style={hintStyle}>등록된 리워드가 없어요. 리워드가 없으면 후원자가 고를 것이 없어요.</p>
      ) : (
        <Table
          caption="리워드 목록 — 리워드명·후원 금액·설명·수량 한정을 각 칸에서 직접 편집해요. 후원 수는 읽기 전용이에요."
          columns={REWARD_COLUMNS}
          rows={rows}
        />
      )}

      <span>
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={disabled}
          iconLeft={<Icon name="plus-circle" />}
          onClick={() =>
            onChange([
              ...rewards,
              {
                id: `rw-new-${String(rewards.length + 1)}`,
                title: '',
                amount: 0,
                description: '',
                limitCount: 0,
                claimedCount: 0,
              },
            ])
          }
        >
          리워드 추가
        </Button>
      </span>

      {error !== undefined && (
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}
    </div>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface ProgramFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function ProgramFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: ProgramFormScreenProps) {
  const [title, setTitle] = useState(seed.title);
  const [creator, setCreator] = useState(seed.creator);
  const [categoryId, setCategoryId] = useState(seed.categoryId);
  const [summary, setSummary] = useState(seed.summary);
  const [goalAmount, setGoalAmount] = useState(seed.goalAmount);
  const [startDate, setStartDate] = useState(seed.startDate);
  const [endDate, setEndDate] = useState(seed.endDate);
  const [status, setStatus] = useState<ProgramStatus>(seed.status);
  const [story, setStory] = useState(seed.story);
  const [coverImageUrl, setCoverImageUrl] = useState(seed.coverImageUrl);
  const [rewards, setRewards] = useState<readonly DemoReward[]>(seed.rewards);

  const disabled = loadingDetail;

  /**
   * 카테고리는 2단계다 — 폼이 저장하는 값(categoryId)은 **최종 선택 하나**이고, 중분류를 고르면
   * 그 id, 고르지 않으면 대분류 id 가 들어간다. 두 셀렉트는 그 값에서 되짚어 그린다.
   */
  const selectedCategory = CATEGORIES.find((category) => category.id === categoryId);
  const categoryRootId =
    selectedCategory === undefined ? '' : (selectedCategory.parentId ?? selectedCategory.id);
  const categoryChildId =
    selectedCategory !== undefined && selectedCategory.parentId !== null ? selectedCategory.id : '';
  const categoryRootOptions = CATEGORIES.filter((category) => category.parentId === null);
  const categoryChildOptions =
    categoryRootId === ''
      ? []
      : CATEGORIES.filter((category) => category.parentId === categoryRootId);

  // 미리보기 파생값 — 아직 검증을 통과하지 않은 입력에서도 그린다
  const goalPreview = previewNumber(goalAmount);
  const leftDays = endDate === '' ? null : daysLeft(endDate, TODAY);
  const cheapestReward = rewards.reduce<number | null>(
    (lowest, reward) => (lowest === null || reward.amount < lowest ? reward.amount : lowest),
    null,
  );
  const statusMeta = STATUS_META[status];

  return (
    <div style={pageStyle}>
      <a href="#program-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '프로그램 수정' : '프로그램 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 목차로 구획을 오가고, 미리보기로 후원자에게 보일 요약을
          확인하세요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <div style={shellStyle}>
          <SectionNav activeId={FIRST_SECTION_ID} errors={errors} />

          <div style={bodyGridStyle}>
            <div style={columnStyle}>
              {loadingDetail ? (
                <Card>
                  <div style={skeletonBodyStyle} aria-busy="true">
                    {[0, 1, 2, 3, 4, 5].map((row) => (
                      <Skeleton key={`row-${String(row)}`} />
                    ))}
                  </div>
                </Card>
              ) : (
                <>
                  {/* ── 기본 정보 ── */}
                  <FormCard id="program-section-basic" title="기본 정보">
                    <TextField
                      id="program-title"
                      label="프로그램명"
                      required
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={PROGRAM_TITLE_MAX}
                      placeholder="예: 무선 스튜디오 모니터 헤드폰"
                      error={errors.title ?? ''}
                    />

                    <div style={formRowStyle}>
                      <TextField
                        id="program-creator"
                        label="창작자"
                        required
                        value={creator}
                        onChange={(event) => setCreator(event.target.value)}
                        maxLength={PROGRAM_CREATOR_MAX}
                        placeholder="예: 사운드랩"
                        error={errors.creator ?? ''}
                      />

                      <FormField
                        htmlFor="program-category"
                        label="카테고리 (대분류)"
                        required
                        {...(errors.categoryId !== undefined && { error: errors.categoryId })}
                      >
                        <SelectField
                          id="program-category"
                          value={categoryRootId}
                          isInvalid={errors.categoryId !== undefined}
                          disabled={disabled}
                          onChange={(event) => setCategoryId(event.target.value)}
                        >
                          <option value="">대분류 선택</option>
                          {categoryRootOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.label}
                            </option>
                          ))}
                        </SelectField>
                      </FormField>

                      {/* 2Depth — 고르지 않으면 대분류에 등록된다. 하위가 없는 대분류면 잠근다 */}
                      <FormField
                        htmlFor="program-category-child"
                        label="카테고리 (중분류)"
                        hint={
                          categoryRootId === ''
                            ? '대분류를 먼저 선택하세요.'
                            : categoryChildOptions.length === 0
                              ? '이 대분류에는 중분류가 없어요.'
                              : '선택하지 않으면 대분류에 등록돼요.'
                        }
                      >
                        <SelectField
                          id="program-category-child"
                          value={categoryChildId}
                          disabled={disabled || categoryChildOptions.length === 0}
                          onChange={(event) =>
                            setCategoryId(
                              event.target.value === '' ? categoryRootId : event.target.value,
                            )
                          }
                        >
                          <option value="">
                            {categoryChildOptions.length === 0 ? '없음' : '선택 안 함'}
                          </option>
                          {categoryChildOptions.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.label}
                            </option>
                          ))}
                        </SelectField>
                      </FormField>
                    </div>

                    <TextField
                      id="program-summary"
                      label="한 줄 소개"
                      required
                      value={summary}
                      onChange={(event) => setSummary(event.target.value)}
                      maxLength={PROGRAM_SUMMARY_MAX}
                      placeholder="예: 스튜디오 모니터링을 그대로 옮긴 무선 헤드폰"
                      error={errors.summary ?? ''}
                    />
                    <p style={hintStyle}>목록과 카드에 제목 아래로 붙는 한 줄여요.</p>
                  </FormCard>

                  {/* ── 펀딩 설정 ── */}
                  <FormCard id="program-section-funding" title="펀딩 설정">
                    <FormField
                      htmlFor="program-goal"
                      label="목표 금액(원)"
                      required
                      hint="기간이 끝나는 순간 이 금액을 넘겼는지로 성공·실패가 갈려요."
                      {...(errors.goalAmount !== undefined && { error: errors.goalAmount })}
                    >
                      <input
                        id="program-goal"
                        type="text"
                        inputMode="numeric"
                        style={controlStyle(errors.goalAmount !== undefined)}
                        value={goalAmount}
                        placeholder="예: 10000000"
                        disabled={disabled}
                        onChange={(event) => setGoalAmount(event.target.value)}
                      />
                    </FormField>

                    {/* 시작일~종료일은 한 쌍이 곧 하나의 값(모금 기간)이라 규칙의 유일한 예외로
                        가로에 남는다. '상태'는 날짜가 아니므로 이 격자 밖으로 나간다. */}
                    <div style={formDateRowStyle}>
                      <FormField
                        htmlFor="program-start"
                        label="시작일"
                        required
                        {...(errors.startDate !== undefined && { error: errors.startDate })}
                      >
                        <input
                          id="program-start"
                          type="date"
                          style={controlStyle(errors.startDate !== undefined)}
                          value={startDate}
                          disabled={disabled}
                          onChange={(event) => setStartDate(event.target.value)}
                        />
                      </FormField>

                      <FormField
                        htmlFor="program-end"
                        label="종료일"
                        required
                        {...(errors.endDate !== undefined && { error: errors.endDate })}
                      >
                        <input
                          id="program-end"
                          type="date"
                          style={controlStyle(errors.endDate !== undefined)}
                          value={endDate}
                          disabled={disabled}
                          onChange={(event) => setEndDate(event.target.value)}
                        />
                      </FormField>
                    </div>

                    <FormField
                      htmlFor="program-status"
                      label="상태"
                      required
                      hint="성공·실패는 기간이 끝난 뒤 목표 달성 여부로 갈려요."
                    >
                      <SelectField
                        id="program-status"
                        value={status}
                        disabled={disabled}
                        onChange={(event) => setStatus(event.target.value as ProgramStatus)}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {STATUS_META[option].label}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>
                  </FormCard>

                  {/* ── 스토리 ── */}
                  <FormCard id="program-section-story" title="스토리">
                    <RichTextField
                      label="프로그램 스토리"
                      value={story}
                      onChange={setStory}
                      maxLength={STORY_GUIDE_MAX}
                      disabled={disabled}
                      rows={8}
                      placeholder="이 프로그램을 시작한 이유와 만들려는 것을 설명하세요."
                      hint="왜 만들었는지·무엇을 만드는지·언제 보내는지를 적으면 후원 결정이 쉬워져요. 글자 수를 셀 때 서식은 빼요."
                      error={errors.story ?? ''}
                    />
                  </FormCard>

                  {/* ── 대표 이미지 ── */}
                  <FormCard id="program-section-cover" title="대표 이미지">
                    <ImageUploadField
                      label="대표 이미지"
                      value={coverImageUrl}
                      onChange={setCoverImageUrl}
                      disabled={disabled}
                      hint="목록과 상세의 첫인상이에요. 가로가 긴 이미지가 잘 맞아요."
                      error={errors.coverImageUrl ?? ''}
                    />
                  </FormCard>

                  {/* ── 리워드 ── */}
                  <FormCard id="program-section-rewards" title="리워드">
                    <RewardEditor
                      rewards={rewards}
                      disabled={disabled}
                      {...(errors.rewards !== undefined && { error: errors.rewards })}
                      onChange={setRewards}
                    />
                  </FormCard>
                </>
              )}
            </div>

            {/* ── 우측 실시간 미리보기 ── */}
            <FormCard title="후원자 노출 미리보기">
              {/* 값이 비어 있어도 자리를 비우지 않는다 — '무엇이 아직 안 채워졌는지'가 곧 정보다 */}
              <div style={previewCardStyle}>
                <ImageThumb src={coverImageUrl} alt={`${title.trim() || '프로그램'} 대표 이미지`} />
                <p style={previewTitleStyle}>{title.trim() === '' ? '프로그램명 미입력' : title}</p>
                <p style={previewSummaryStyle}>
                  {summary.trim() === '' ? '한 줄 소개 미입력' : summary}
                </p>
                <span style={previewBadgeRowStyle}>
                  <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />
                </span>
              </div>

              <dl style={dlStyle}>
                <dt style={dtStyle}>창작자</dt>
                <dd style={ddStyle}>{creator.trim() === '' ? '—' : creator}</dd>

                <dt style={dtStyle}>목표 금액</dt>
                <dd style={ddStyle}>{`${fmt(goalPreview)}원`}</dd>

                <dt style={dtStyle}>기간</dt>
                <dd style={ddStyle}>
                  {startDate === '' || endDate === '' ? '—' : `${startDate} ~ ${endDate}`}
                </dd>

                <dt style={dtStyle}>남은 일수</dt>
                <dd style={ddStyle}>
                  {leftDays === null ? '—' : leftDays === 0 ? '오늘 마감' : `${fmt(leftDays)}일`}
                </dd>

                <dt style={dtStyle}>리워드</dt>
                <dd style={ddStyle}>
                  {rewards.length === 0
                    ? '없음'
                    : `${fmt(rewards.length)}종 · 최저 ${fmt(cheapestReward ?? 0)}원`}
                </dd>
              </dl>

              {/* 모금 현황은 **저장된 사실**이다 — 폼에 없는 값이라 입력에 따라 움직이지 않는다.
                  등록 화면에는 아직 후원이 없으므로 이 줄 자체를 그리지 않는다. */}
              {seed.pledgedAmount !== undefined && (
                <p style={hintStyle}>
                  저장된 모금 현황{' '}
                  <StatusBadge
                    tone={seed.pledgedAmount >= goalPreview && goalPreview > 0 ? 'success' : 'info'}
                    label={`${fmt(goalPreview === 0 ? 0 : Math.round((seed.pledgedAmount / goalPreview) * 100))}% · ${fmt(seed.pledgedAmount)}원`}
                  />
                </p>
              )}
            </FormCard>
          </div>
        </div>

        {Object.keys(errors).length > 0 && (
          <Alert tone="danger">
            입력을 확인해 주세요. 붉은 점이 붙은 구획에 확인이 필요한 입력이 남아 있어요.
          </Alert>
        )}

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md">
            취소
          </Button>
          <Button type="submit" variant="primary" size="md">
            {isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 새 프로그램은 '작성 중'에서 출발한다 */
export const Default: Story = {
  render: () => <ProgramFormScreen />,
};

/** 수정: 기존 값이 채워진 폼(2Depth 카테고리 · 리워드 3종 · 저장된 모금 현황 포함) */
export const Edit: Story = {
  render: () => <ProgramFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 카드 본문 스켈레톤(useCrudForm loadingDetail 미러) */
export const Loading: Story = {
  render: () => <ProgramFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 각 필드 인라인 오류 + 좌측 구획 오류 점 노출 */
export const ValidationError: Story = {
  render: () => <ProgramFormScreen errors={DEMO_ERRORS} />,
};
