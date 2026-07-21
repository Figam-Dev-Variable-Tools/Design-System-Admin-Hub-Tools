/**
 * Design System/Templates/Logs/Member Activity — 회원 활동 로그 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/logs/member-activity` → 메뉴 en = "Logs"(로그 관리),
 * 화면 en = "Member Activity" (packages/ui/pages/_data/pages.ts 의 인벤토리에서 확인).
 *
 * 대응 실화면: apps/admin/src/pages/logs/member-activity/MemberActivityPage.tsx
 * (라우트 /logs/member-activity) 와 4화면이 공유하는 LogListShell·LogFilterPanel·LogToolbar·
 * LogTable(components/*).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다.
 *
 * [두 개의 목적지] 행을 누르면 그 요청의 페이로드가 열리고(본업), 계정 링크를 누르면 회원 상세로
 * 간다. 탈퇴 회원은 링크가 아니다 — 가리킬 레코드가 없다(실화면 MemberCell 미러). 템플릿에서는
 * 이동이 없으므로 등록 회원 계정만 링크 스타일(밑줄·action 색)로 표기한다.
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 필터 레일 + 보존기간 안내 → Panel (notice = 보존기간)
 *   결과·활동 필터 축             → SelectField ×2
 *   기간 프리셋 / 직접 지정        → SelectField + DateRangeField
 *   검색 입력                     → SearchField
 *   페이지당 행 수 / 내보내기       → SelectField + Button(secondary)
 *   목록 표(6열, 정렬 헤더)        → Table (occurredAt 기본 정렬 desc)
 *   실패 행 강조                  → Table row tone='danger' + 셀 안 ✕ 아이콘·글자(이중 인코딩)
 *   빈 결과 / 조회 실패            → Empty / Alert(danger)
 *   페이지네이션                   → Pagination + rangeTextOf
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  DateRangeField,
  Empty as EmptyState,
  Icon,
  Panel,
  Pagination,
  SearchField,
  SelectField,
  Table,
  cssVar,
  rangeTextOf,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Logs/Member Activity',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 member-activity/types.ts 의 MemberActivityEntry 를 축약해 흉내) ─────────── */

type MemberActivity =
  'signup' | 'login' | 'order' | 'payment' | 'review' | 'point' | 'profile' | 'withdraw';
type Outcome = 'success' | 'failure';

/** 활동 라벨 — 실화면 MEMBER_ACTIVITY_LABEL 미러 */
const ACTIVITY_LABEL: Record<MemberActivity, string> = {
  signup: '가입',
  login: '로그인',
  order: '주문',
  payment: '결제',
  review: '리뷰',
  point: '적립금',
  profile: '정보 수정',
  withdraw: '탈퇴',
};

interface MemberActivityRow {
  readonly id: string;
  readonly occurredAt: string;
  readonly memberAccount: string;
  readonly memberName: string;
  /** 회원 상세로 이동할 id. 탈퇴 회원은 null — 가리킬 레코드가 없다 */
  readonly memberId: string | null;
  readonly activity: MemberActivity;
  readonly summary: string;
  readonly outcome: Outcome;
  readonly failureReason: string | null;
  readonly ip: string;
  readonly device: string;
}

const DEMO_ROWS: readonly MemberActivityRow[] = [
  {
    id: 'v-1',
    occurredAt: '2026-07-21 14:32:08',
    memberAccount: 'seoyeon@example.com',
    memberName: '김**',
    memberId: 'm-1',
    activity: 'order',
    summary: '주문 ORD-20260721-0031 · 128,000원',
    outcome: 'success',
    failureReason: null,
    ip: '58.29.140.77',
    device: 'Chrome 126 · Windows 11',
  },
  {
    id: 'v-2',
    occurredAt: '2026-07-21 14:11:47',
    memberAccount: 'junho@example.com',
    memberName: '이**',
    memberId: 'm-2',
    activity: 'payment',
    summary: '카드 결제 · 452,000원',
    outcome: 'failure',
    failureReason: '한도 초과',
    ip: '104.28.5.130',
    device: 'Safari 17 · iOS 18',
  },
  {
    id: 'v-3',
    occurredAt: '2026-07-21 13:58:02',
    memberAccount: 'minji@example.com',
    memberName: '박**',
    memberId: 'm-3',
    activity: 'review',
    summary: '리뷰 등록 · 사무용 의자 (별점 5)',
    outcome: 'success',
    failureReason: null,
    ip: '211.234.11.9',
    device: 'Chrome 126 · macOS 15',
  },
  {
    id: 'v-4',
    occurredAt: '2026-07-21 12:40:19',
    memberAccount: 'yujin@example.com',
    memberName: '최**',
    memberId: null,
    activity: 'withdraw',
    summary: '회원 탈퇴 · 사유: 서비스 미이용',
    outcome: 'success',
    failureReason: null,
    ip: '58.29.140.12',
    device: 'Chrome 125 · Android 14',
  },
  {
    id: 'v-5',
    occurredAt: '2026-07-21 11:22:35',
    memberAccount: 'woosung@example.com',
    memberName: '정**',
    memberId: 'm-5',
    activity: 'login',
    summary: '로그인 · 신규 기기',
    outcome: 'success',
    failureReason: null,
    ip: '104.28.5.201',
    device: 'Edge 126 · Windows 11',
  },
  {
    id: 'v-6',
    occurredAt: '2026-07-21 10:05:44',
    memberAccount: 'haneul@example.com',
    memberName: '강**',
    memberId: 'm-6',
    activity: 'signup',
    summary: '이메일 가입 · 마케팅 수신 동의',
    outcome: 'success',
    failureReason: null,
    ip: '211.234.11.40',
    device: 'Chrome 126 · Windows 10',
  },
  {
    id: 'v-7',
    occurredAt: '2026-07-20 22:47:03',
    memberAccount: 'areum@example.com',
    memberName: '윤**',
    memberId: 'm-7',
    activity: 'point',
    summary: '적립금 사용 · 3,200원',
    outcome: 'failure',
    failureReason: '잔액 부족',
    ip: '58.29.140.77',
    device: 'Safari 17 · iOS 17',
  },
  {
    id: 'v-8',
    occurredAt: '2026-07-20 20:31:12',
    memberAccount: 'dohyun@example.com',
    memberName: '임**',
    memberId: 'm-8',
    activity: 'profile',
    summary: '배송지 변경 · 기본 배송지',
    outcome: 'success',
    failureReason: null,
    ip: '104.28.5.130',
    device: 'Chrome 126 · macOS 14',
  },
];

/* ── 필터 축 선택지 — 실화면 MEMBER_ACTIVITY_AXES 미러 ──────────────────────────────────────── */

const OUTCOME_OPTIONS: readonly { readonly value: Outcome | 'all'; readonly label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'success', label: '성공' },
  { value: 'failure', label: '실패' },
];

const ACTIVITY_OPTIONS: readonly {
  readonly value: MemberActivity | 'all';
  readonly label: string;
}[] = [
  { value: 'all', label: '전체' },
  ...(Object.keys(ACTIVITY_LABEL) as MemberActivity[]).map((activity) => ({
    value: activity,
    label: ACTIVITY_LABEL[activity],
  })),
];

const PERIOD_OPTIONS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'today', label: '오늘' },
  { value: 'last-7d', label: '최근 7일' },
  { value: 'last-30d', label: '최근 30일' },
  { value: 'custom', label: '직접 지정' },
];

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

/** 보존기간 — 실화면 MEMBER_ACTIVITY_RETENTION 미러(남의 개인정보라 짧게 남긴다) */
const RETENTION = {
  label: '1년',
  basis: '개인정보 최소 보관 원칙. 보존기간이 지나면 자동 폐기됩니다.',
} as const;

/* ── 표 열 정의(실화면 member-activity/MemberActivityPage COLUMNS 6열 미러) ─────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'occurredAt', header: '시각', nowrap: true, sortable: true },
  { id: 'member', header: '회원', nowrap: true },
  { id: 'activity', header: '활동', nowrap: true },
  { id: 'summary', header: '내용' },
  { id: 'outcome', header: '결과', nowrap: true },
  { id: 'device', header: '접속', nowrap: true },
];

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = { ...typography('typography.title.lg'), margin: 0 };

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 9) minmax(0, 1fr)`,
  gap: cssVar('space.6'),
  alignItems: 'start',
};

const mainColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
};

const toolbarActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: cssVar('space.2'),
};

const filterFieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const filterLabelStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
};

const filterStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const hintStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const highlightStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.feedback.danger.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  margin: 0,
};

const retentionStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  margin: 0,
};

const tableWrapStyle: CSSProperties = { overflowX: 'auto', minWidth: 0 };

const stackStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0 };

const mutedStyle: CSSProperties = { color: cssVar('color.text.muted') };

/** 등록 회원 계정 — 실화면은 회원 상세로 가는 링크. 템플릿에선 링크 스타일만(이동 없음) */
const accountLinkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
};

const outcomeRowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

const failureStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  color: cssVar('color.feedback.danger.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 셀 조각(실화면 member-activity/MemberActivityPage 의 MemberCell·OutcomeCell·StackCell 재현) ── */

function Stack({
  primary,
  secondary,
}: {
  readonly primary: ReactNode;
  readonly secondary: ReactNode;
}) {
  return (
    <span style={stackStyle}>
      <span>{primary}</span>
      <span style={mutedStyle}>{secondary}</span>
    </span>
  );
}

/** 회원 셀 — 등록 회원은 계정을 링크 스타일로, 탈퇴 회원은 그냥 글자 + '탈퇴' */
function MemberText({ row }: { readonly row: MemberActivityRow }) {
  if (row.memberId === null) {
    return <Stack primary={row.memberAccount} secondary={`${row.memberName} · 탈퇴`} />;
  }
  return (
    <Stack
      primary={<span style={accountLinkStyle}>{row.memberAccount}</span>}
      secondary={row.memberName}
    />
  );
}

function Outcome({ failed, reason }: { readonly failed: boolean; readonly reason: string | null }) {
  if (!failed) return <span style={outcomeRowStyle}>성공</span>;
  return (
    <span style={outcomeRowStyle}>
      <span style={failureStyle}>
        <Icon name="x-circle" />
        실패
      </span>
      {reason !== null && reason !== '' ? <span style={mutedStyle}>{reason}</span> : null}
    </span>
  );
}

/** 실패 행만 붉게(실화면 toneOf 미러) */
type RowTone = 'danger' | 'warning';
function toneOf(row: MemberActivityRow): RowTone | undefined {
  return row.outcome === 'failure' ? 'danger' : undefined;
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface MemberActivityScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
}

function MemberActivityScreen({ loading = false, initialKeyword = '' }: MemberActivityScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [outcome, setOutcome] = useState<Outcome | 'all'>('all');
  const [activity, setActivity] = useState<MemberActivity | 'all'>('all');
  const [period, setPeriod] = useState<string>('last-30d');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [page, setPage] = useState(1);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    const rows = DEMO_ROWS.filter((row) => {
      if (outcome !== 'all' && row.outcome !== outcome) return false;
      if (activity !== 'all' && row.activity !== activity) return false;
      if (kw === '') return true;
      return (
        row.memberAccount.toLowerCase().includes(kw) ||
        row.memberName.toLowerCase().includes(kw) ||
        row.summary.toLowerCase().includes(kw) ||
        row.ip.toLowerCase().includes(kw)
      );
    });
    return [...rows].sort((left, right) =>
      sortDir === 'desc'
        ? right.occurredAt.localeCompare(left.occurredAt)
        : left.occurredAt.localeCompare(right.occurredAt),
    );
  }, [keyword, outcome, activity, sortDir]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const withdrawCount = filtered.filter((row) => row.activity === 'withdraw').length;
  const failureCount = filtered.filter((row) => row.outcome === 'failure').length;
  const highlight =
    withdrawCount > 0
      ? `이 기간의 탈퇴 ${withdrawCount.toLocaleString('ko-KR')}건`
      : failureCount > 0
        ? `이 기간의 실패 ${failureCount.toLocaleString('ko-KR')}건`
        : null;

  const resetPage = (): void => setPage(1);

  const rows: TableProps['rows'] = pageRows.map((row) => {
    const tone = toneOf(row);
    return {
      id: row.id,
      onActivate: () => {
        /* 실화면: 행을 누르면 요청 페이로드가, 계정을 누르면 회원 상세가 열린다 — 템플릿에선 조작 없음 */
      },
      ...(tone === undefined ? {} : { tone }),
      cells: [
        row.occurredAt,
        <MemberText row={row} />,
        ACTIVITY_LABEL[row.activity],
        row.summary,
        <Outcome failed={row.outcome === 'failure'} reason={row.failureReason} />,
        <Stack primary={row.ip} secondary={row.device} />,
      ],
    };
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>회원 활동 로그</h1>

      <div style={layoutStyle}>
        <Panel
          notice={
            <>
              <p style={retentionStyle}>{`보존기간 ${RETENTION.label}`}</p>
              <p style={hintStyle}>{RETENTION.basis}</p>
              <p style={hintStyle}>
                이 기록은 감사 로그입니다. 관리자도 수정하거나 삭제할 수 없으며, 조회와 내보내기만
                제공합니다.
              </p>
              <p style={hintStyle}>시각은 모두 한국 표준시(KST) 기준입니다.</p>
            </>
          }
        >
          <div style={filterStackStyle}>
            <div style={filterFieldStyle}>
              <label htmlFor="member-log-outcome" style={filterLabelStyle}>
                결과
              </label>
              <SelectField
                id="member-log-outcome"
                value={outcome}
                onChange={(event) => {
                  setOutcome(event.target.value as Outcome | 'all');
                  resetPage();
                }}
              >
                {OUTCOME_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div style={filterFieldStyle}>
              <label htmlFor="member-log-activity" style={filterLabelStyle}>
                활동
              </label>
              <SelectField
                id="member-log-activity"
                value={activity}
                onChange={(event) => {
                  setActivity(event.target.value as MemberActivity | 'all');
                  resetPage();
                }}
              >
                {ACTIVITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div style={filterFieldStyle}>
              <label htmlFor="member-log-period" style={filterLabelStyle}>
                기간
              </label>
              <SelectField
                id="member-log-period"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value);
                  resetPage();
                }}
              >
                {PERIOD_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            {period === 'custom' && (
              <div style={filterFieldStyle}>
                <DateRangeField
                  label="조회 기간"
                  startValue={draftFrom}
                  endValue={draftTo}
                  onStartChange={setDraftFrom}
                  onEndChange={setDraftTo}
                  hint="한 번에 최대 90일까지 조회할 수 있습니다."
                />
              </div>
            )}
          </div>
        </Panel>

        <div style={mainColumnStyle}>
          <div style={toolbarStyle}>
            <div style={searchWrapStyle}>
              <SearchField
                label="회원, 내용 또는 IP 검색"
                placeholder="회원 · 내용 · IP 검색"
                value={keyword}
                onChange={(value) => {
                  setKeyword(value);
                  resetPage();
                }}
              />
            </div>

            <div style={toolbarActionsStyle}>
              <div style={filterFieldStyle}>
                <label htmlFor="member-log-size" style={filterLabelStyle}>
                  페이지당 행 수
                </label>
                <SelectField
                  id="member-log-size"
                  value={String(pageSize)}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value) as PageSize);
                    resetPage();
                  }}
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={String(size)}>
                      {`${String(size)}줄씩`}
                    </option>
                  ))}
                </SelectField>
              </div>

              <Button variant="secondary" iconLeft={<Icon name="download" />}>
                내보내기
              </Button>
            </div>
          </div>

          <div style={summaryRowStyle}>
            <p style={hintStyle}>
              {loading ? '불러오는 중…' : rangeTextOf(total, safePage, pageSize)}
            </p>
            {!loading && highlight !== null && <p style={highlightStyle}>{highlight}</p>}
          </div>

          <div style={tableWrapStyle}>
            <Table
              caption="회원 활동 로그 — 행을 누르면 그 요청의 상세 페이로드가 열리고, 계정을 누르면 회원 상세로 이동합니다. 이 목록은 읽기 전용이며 수정·삭제할 수 없습니다."
              columns={COLUMNS}
              rows={rows}
              sortKey="occurredAt"
              sortDirection={sortDir}
              onSortToggle={() => setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
              loading={loading}
              skeletonRows={pageSize}
              empty={
                <EmptyState
                  label="회원 활동 로그"
                  createVerb="기록"
                  hasQuery={keyword.trim() !== ''}
                  onClearSearch={() => setKeyword('')}
                />
              }
            />
          </div>

          <Pagination
            page={safePage}
            totalPages={totalPages}
            label="회원 활동 로그 페이지"
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

/** 정상: 회원 활동 로그가 채워진 기본 상태(최신순 · 탈퇴/실패 강조) */
export const Default: Story = {
  render: () => <MemberActivityScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) */
export const Loading: Story = {
  render: () => <MemberActivityScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <MemberActivityScreen initialKeyword="존재하지 않는 회원" />,
};

/** 조회 실패: 인라인 Alert(danger) + 다시 시도(STATE-02) */
export const LoadError: Story = {
  render: () => (
    <div style={pageStyle}>
      <h1 style={headingStyle}>회원 활동 로그</h1>
      <Alert tone="danger">
        <div style={errorBodyStyle}>
          <span>회원 활동 로그를 불러오지 못했습니다.</span>
          <Button variant="secondary">다시 시도</Button>
        </div>
      </Alert>
    </div>
  ),
};
