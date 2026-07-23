/**
 * Design System/Templates/Programs/Program Detail — 프로그램 상세 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/programs/:id` → 메뉴 en = "Programs"(프로그램 관리), 화면 en = "Programs"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Programs 그룹의 `['/programs', '프로그램', 'Programs']`).
 *
 * 대응 실화면: apps/admin/src/pages/programs/ProgramDetailPage.tsx (라우트 /programs/:id).
 * **읽는 화면이다** — 값을 고치는 것은 등록/수정 폼(/programs/:id/edit)의 일이라 입력 필드가 없다.
 * 달성률·남은 일수는 저장된 값이 아니라 목표·모금액·종료일에서 계산되는 파생값이라, 목록의 배지와
 * 상세의 진행바가 서로 다른 숫자를 말할 수 없게 store 의 순수 규칙(fundingRate·daysLeft)을 그대로
 * 미러한다. 기준일은 실화면과 같은 고정 시계 `TODAY = '2026-07-21'` 이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   shared/ui CardTitle · dl/dt/dd · pageTitleStyle → 토큰만 쓴 로컬 조립(신규 DS 컴포넌트 아님)
 *   손으로 쓴 리워드 <table>                        → DS Table
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   프로그램 목록으로 복귀        → Icon(chevron-left) + 토큰 <a>
 *   화면 제목 + 진행 상태     → 토큰 <h1> + StatusBadge (programStatusTone/Label 미러)
 *   펀딩 현황 카드           → Card + 로컬 카드 제목 + 달성 배지(StatusBadge)
 *   달성률 진행바            → role="progressbar" 토큰 트랙/채움(DS 진행바 부재 — 토큰 조립)
 *   현황 값(목표·모금·후원자) → dl/dt/dd(토큰)
 *   프로그램 정보 카드        → Card + dl/dt/dd(스토리는 pre-wrap 으로 줄바꿈을 지킨다)
 *   리워드 표                → Table (마감된 리워드 = StatusBadge(warning))
 *   리워드 없음              → 토큰 안내 문구
 *   최초 로드                → Card + Skeleton ×N (재조회로는 덮지 않는다 — STATE-01)
 *   404 / 조회 실패          → Alert(danger) (+ 서버 오류에만 다시 시도 — EXC-12)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';

import {
  Alert,
  Button,
  Card,
  Icon,
  inlineBadgeRowStyle,
  Skeleton,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Programs/Program Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 도메인 규칙(실화면 _shared/store · types 미러) ─────────────────────────────────────── */

/** 남은 일수의 기준일 — 목록 화면과 **같은 값**이어야 두 화면의 숫자가 갈라지지 않는다 */
const TODAY = '2026-07-21';

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

const KO_NUMBER = new Intl.NumberFormat('ko-KR');
const fmt = (value: number): string => KO_NUMBER.format(value);

/** 달성률(%) — 목표가 0이면 0. 100을 넘을 수 있다(초과 달성) */
const fundingRate = (goalAmount: number, pledgedAmount: number): number =>
  goalAmount <= 0 ? 0 : Math.round((pledgedAmount / goalAmount) * 100);

const isGoalReached = (goalAmount: number, pledgedAmount: number): boolean =>
  goalAmount > 0 && pledgedAmount >= goalAmount;

/** 남은 일수 — 종료일 포함으로 센다. 이미 지났으면 0 */
function daysLeft(endDate: string, today: string): number {
  const end = Date.parse(`${endDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(end) || Number.isNaN(now)) return 0;
  const diff = Math.ceil((end - now) / 86_400_000);
  return diff > 0 ? diff : 0;
}

/* ── 데모 데이터(실화면 _shared/store 픽스처 pgm-1·pgm-3 미러) ─────────────────────────────────── */

interface DemoReward {
  readonly id: string;
  readonly title: string;
  readonly amount: number;
  readonly description: string;
  /** 수량 한정. 0 이면 무제한 */
  readonly limitCount: number;
  readonly claimedCount: number;
}

interface DemoProgram {
  readonly id: string;
  readonly title: string;
  readonly categoryLabel: string;
  readonly creator: string;
  readonly summary: string;
  readonly story: string;
  readonly goalAmount: number;
  readonly pledgedAmount: number;
  readonly backerCount: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly status: ProgramStatus;
  readonly rewards: readonly DemoReward[];
}

/** 진행 중 · 초과 달성(143%) — 목록 첫 행과 같은 건이다 */
const DEMO_LIVE: DemoProgram = {
  id: 'pgm-1',
  title: '무선 스튜디오 모니터 헤드폰',
  categoryLabel: '음향기기',
  creator: '사운드랩',
  summary: '스튜디오 모니터링을 그대로 옮긴 무선 헤드폰',
  story: '작업실 밖에서도 같은 소리를 듣고 싶었어요. 지연 없는 무선 전송을 목표로 만들었어요.',
  goalAmount: 10_000_000,
  pledgedAmount: 14_320_000,
  backerCount: 412,
  startDate: '2026-06-01',
  endDate: '2026-07-31',
  status: 'live',
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
};

/** 종료 · 성공(116%) — 기간이 끝나 결론이 난 건 */
const DEMO_SUCCEEDED: DemoProgram = {
  id: 'pgm-3',
  title: '도시 산책 에세이집',
  categoryLabel: '출판',
  creator: '걷는사람',
  summary: '열두 도시의 골목을 걸어 적은 산문집',
  story: '2년간 기록한 골목의 표정을 한 권으로 묶었어요.',
  goalAmount: 3_000_000,
  pledgedAmount: 3_480_000,
  backerCount: 231,
  startDate: '2026-04-01',
  endDate: '2026-05-31',
  status: 'succeeded',
  rewards: [
    {
      id: 'rw-3-1',
      title: '초판 1권',
      amount: 18_000,
      description: '작가 사인본',
      limitCount: 200,
      claimedCount: 200,
    },
  ],
};

/** 오픈 예정 · 리워드 미등록 — 아직 후원이 없어 모든 수치가 0 인 건 */
const DEMO_NO_REWARD: DemoProgram = {
  id: 'pgm-5',
  title: '마그네틱 충전 스탠드',
  categoryLabel: '모바일 액세서리',
  creator: '스냅기어',
  summary: '각도가 고정되는 자석식 충전 거치대',
  story: '책상 위에서 각도가 흘러내리지 않는 거치대를 목표로 했어요.',
  goalAmount: 6_000_000,
  pledgedAmount: 0,
  backerCount: 0,
  startDate: '2026-08-01',
  endDate: '2026-09-10',
  status: 'scheduled',
  rewards: [],
};

/* ── 리워드 표 열 정의 ─────────────────────────────────────────────────────────────────────── */

const REWARD_COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '리워드' },
  { id: 'amount', header: '금액', align: 'end' },
  { id: 'description', header: '설명' },
  { id: 'limit', header: '한정 수량', align: 'end' },
  { id: 'claimed', header: '신청 수', align: 'end' },
];

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

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

const titleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 16), 1fr))`,
  gap: cssVar('space.4'),
  alignItems: 'start',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/* 진행바 — DS 에는 아직 진행바 컴포넌트가 없다. 트랙은 raised 표면, 채움은 액션 색, 폭은 백분율이다.
   달성률은 100% 를 넘을 수 있으므로(초과 달성) **채움 폭만** 100 에서 자른다 — 숫자는 자르지 않는다. */

const progressWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const progressTrackStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: cssVar('space.3'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  overflow: 'hidden',
};

const progressFillStyle = (rate: number, reached: boolean): CSSProperties => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  width: `${String(Math.max(0, Math.min(100, rate)))}%`,
  // 색은 보조 신호다 — 같은 사실을 바로 옆 문구가 글자로도 말한다
  background: reached
    ? cssVar('color.feedback.success.text')
    : cssVar('color.action.primary.default'),
});

const progressLabelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const rateTextStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontVariantNumeric: 'tabular-nums',
  ...typography('typography.title.md'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
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

/** 스토리는 줄바꿈이 의미다 — 한 문단으로 뭉개지 않는다 */
const storyStyle: CSSProperties = {
  ...ddStyle,
  whiteSpace: 'pre-wrap',
};

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function DetailCard({
  title,
  action,
  children,
}: {
  readonly title: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <div style={cardHeadStyle}>
          <h2 id={titleId} style={cardTitleStyle}>
            {title}
          </h2>
          {action}
        </div>
        {children}
      </div>
    </Card>
  );
}

/* ── 리워드 표(한정 수량 0 은 '무제한' 이지 '0개' 가 아니다) ─────────────────────────────────── */

function RewardTable({ program }: { readonly program: DemoProgram }) {
  if (program.rewards.length === 0) {
    return <p style={hintStyle}>등록된 리워드가 없어요. 리워드는 등록/수정 화면에서 추가해요.</p>;
  }

  const rows: TableProps['rows'] = program.rewards.map((reward) => {
    const soldOut = reward.limitCount > 0 && reward.claimedCount >= reward.limitCount;
    return {
      id: reward.id,
      cells: [
        <span key="title" style={inlineBadgeRowStyle}>
          {reward.title}
          {soldOut && <StatusBadge tone="warning" label="마감" />}
        </span>,
        `${fmt(reward.amount)}원`,
        reward.description,
        reward.limitCount === 0 ? '무제한' : `${fmt(reward.limitCount)}개`,
        `${fmt(reward.claimedCount)}건`,
      ],
    };
  });

  return (
    <Table
      caption={`'${program.title}' 의 리워드 목록 — 후원 금액과 그 대가, 한정 수량과 신청 수예요.`}
      columns={REWARD_COLUMNS}
      rows={rows}
    />
  );
}

/* ── 최초 로드 자리표시(재조회로는 덮지 않는다 — STATE-01) ─────────────────────────────────── */

function LoadingSkeleton() {
  return (
    <div style={gridStyle} aria-busy="true">
      {[0, 1].map((column) => (
        <Card key={`col-${String(column)}`}>
          <div style={skeletonBodyStyle}>
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ── 화면 ─────────────────────────────────────────────────────────────────────────────────── */

interface ProgramDetailScreenProps {
  readonly program?: DemoProgram;
  readonly loading?: boolean;
  /** 조회 실패의 종류 — 404 에는 '다시 시도'를 권하지 않는다(영원히 실패한다 · EXC-12) */
  readonly failure?: 'not-found' | 'error';
}

function ProgramDetailScreen({
  program = DEMO_LIVE,
  loading = false,
  failure,
}: ProgramDetailScreenProps) {
  const backLink = (
    <a href="#program-list" style={backLinkStyle}>
      <Icon name="chevron-left" />
      프로그램 목록으로
    </a>
  );

  if (failure !== undefined) {
    const notFound = failure === 'not-found';
    return (
      <div style={pageStyle}>
        {backLink}
        <Alert tone="danger">
          <div style={alertRowStyle}>
            <span>
              {notFound
                ? '프로그램을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '프로그램을 불러오지 못했어요.'}
            </span>
            {!notFound && <Button variant="secondary">다시 시도</Button>}
          </div>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        {backLink}
        <LoadingSkeleton />
      </div>
    );
  }

  const rate = fundingRate(program.goalAmount, program.pledgedAmount);
  const reached = isGoalReached(program.goalAmount, program.pledgedAmount);
  const ended = program.status === 'succeeded' || program.status === 'failed';
  const left = daysLeft(program.endDate, TODAY);
  // 끝난 펀딩에 '0일 남음' 은 거짓이다 — 결론이 난 건은 숫자 대신 그 사실을 적는다
  const leftText = ended ? '종료됨' : left === 0 ? '오늘 마감' : `${fmt(left)}일 남음`;
  const statusMeta = STATUS_META[program.status];

  return (
    <div style={pageStyle}>
      {backLink}

      <div style={titleRowStyle}>
        <h1 style={pageTitleStyle}>{program.title}</h1>
        <StatusBadge tone={statusMeta.tone} label={statusMeta.label} />
      </div>

      <DetailCard
        title="펀딩 현황"
        action={
          <StatusBadge
            tone={reached ? 'success' : 'info'}
            label={reached ? '목표 달성' : '모금 중'}
          />
        }
      >
        <div style={progressWrapStyle}>
          <div style={progressLabelRowStyle}>
            <span style={rateTextStyle}>{`${fmt(rate)}%`}</span>
            <span style={hintStyle}>
              {`목표 ${fmt(program.goalAmount)}원 중 ${fmt(program.pledgedAmount)}원`}
            </span>
          </div>
          {/* 진행바는 값을 그림으로 되풀이할 뿐이다 — 같은 사실이 바로 위에 글자로도 있다.
              그래도 progressbar 역할과 valuetext 를 주는 이유: 이 그림만 훑는 사용자에게도
              숫자가 읽혀야 하기 때문이다. */}
          <div
            role="progressbar"
            aria-label="펀딩 달성률"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.max(0, Math.min(100, rate))}
            aria-valuetext={`목표 대비 ${fmt(rate)}% 달성`}
            style={progressTrackStyle}
          >
            <span style={progressFillStyle(rate, reached)} />
          </div>
        </div>

        <dl style={dlStyle}>
          <dt style={dtStyle}>목표 금액</dt>
          <dd style={ddStyle}>{`${fmt(program.goalAmount)}원`}</dd>
          <dt style={dtStyle}>모금액</dt>
          <dd style={ddStyle}>{`${fmt(program.pledgedAmount)}원`}</dd>
          <dt style={dtStyle}>달성률</dt>
          <dd style={ddStyle}>{`${fmt(rate)}%`}</dd>
          <dt style={dtStyle}>후원자 수</dt>
          <dd style={ddStyle}>{`${fmt(program.backerCount)}명`}</dd>
          <dt style={dtStyle}>남은 일수</dt>
          <dd style={ddStyle}>{leftText}</dd>
          <dt style={dtStyle}>기간</dt>
          <dd style={ddStyle}>{`${program.startDate} ~ ${program.endDate}`}</dd>
        </dl>
      </DetailCard>

      <DetailCard title="프로그램 정보">
        <dl style={dlStyle}>
          <dt style={dtStyle}>창작자</dt>
          <dd style={ddStyle}>{program.creator}</dd>
          <dt style={dtStyle}>카테고리</dt>
          <dd style={ddStyle}>{program.categoryLabel}</dd>
          <dt style={dtStyle}>한 줄 소개</dt>
          <dd style={ddStyle}>{program.summary}</dd>
          <dt style={dtStyle}>스토리</dt>
          <dd style={storyStyle}>{program.story}</dd>
        </dl>
      </DetailCard>

      <DetailCard title={`리워드 ${fmt(program.rewards.length)}종`}>
        <RewardTable program={program} />
      </DetailCard>
    </div>
  );
}

/** 정상: 진행 중 · 초과 달성(143%) — 진행바가 100%에서 잘리고 숫자는 잘리지 않는다 */
export const Default: Story = {
  render: () => <ProgramDetailScreen />,
};

/** 최초 로드: 카드 본문 스켈레톤 — 아직 데이터가 없을 때만 켠다(재조회로는 덮지 않는다 · STATE-01) */
export const Loading: Story = {
  render: () => <ProgramDetailScreen loading />,
};

/** 빈 상태: 리워드가 아직 없는 오픈 예정 건 — 표 대신 안내 문구 */
export const Empty: Story = {
  render: () => <ProgramDetailScreen program={DEMO_NO_REWARD} />,
};

/** 종료: 기간이 끝나 결론이 난 성공 건 — 남은 일수 대신 '종료됨' */
export const Succeeded: Story = {
  render: () => <ProgramDetailScreen program={DEMO_SUCCEEDED} />,
};

/** 404: 이미 삭제된 프로그램 — '다시 시도'를 권하지 않고 목록으로만 돌려보낸다 (EXC-12) */
export const NotFound: Story = {
  render: () => <ProgramDetailScreen failure="not-found" />,
};
