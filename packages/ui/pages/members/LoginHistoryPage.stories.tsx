/**
 * Design System/Templates/Users/Login History — 로그인 이력 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/users/login-history` → 메뉴 en = "Users"(사용자 관리),
 * 화면 en = "Login History" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Users 그룹의
 * `['/users/login-history', '로그인 이력', 'Login History']`).
 *
 * 대응 실화면: apps/admin/src/pages/login-history/LoginHistoryPage.tsx (라우트 /users/login-history)
 * 와 그 하위 조립(components/LoginHistoryFilters·LoginHistoryToolbar·LoginHistoryTable).
 * 배치는 회원 관리·관리자 관리를 그대로 따른다 — 좌: 결과·계정 유형·기간 필터 / 우: 검색 + 내보내기
 * + 표 + 페이지네이션.
 *
 * [이 화면이 다른 목록과 갈라지는 지점 — 읽기 전용 감사 로그]
 *   · **삭제 없음 · 수정 없음 · 행 ⋯ 메뉴 없음 · 체크박스 없음.** 감사 기록은 불변이어야 하고,
 *     일괄 액션이 없으므로 선택도 없다. 그래서 이 템플릿에는 SelectAllHeaderCell·RowSelectCell·
 *     SelectionBar·RowActions 가 **하나도 없다 — 없다는 것이 설계다.**
 *   · **실패 행은 색 하나로 말하지 않는다.** row tone='danger' 위에 ✕ 아이콘 + '실패' 글자 +
 *     실패 사유 + '실패 N회 연속' 배지가 함께 간다(2회부터). 색을 못 보는 사람도 읽을 수 있다.
 *   · **행 클릭 → 그 계정의 상세**(회원/운영자). 미등록 계정은 가리킬 레코드가 없어 onActivate 를
 *     걸지 않는다 — 커서도 pointer 가 되지 않는다.
 *   · **조회 실패는 토스트가 아니라 인라인 배너**다. 토스트가 사라지면 '기록이 없는 것'과
 *     '못 불러온 것'이 구분되지 않는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   FilterRail/FilterPanel → Panel(notice) + SelectField (건수는 선택지 라벨에 함께 적는다)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 필터 레일 + 불변 안내   → Panel (notice = 감사 기록 안내)
 *   결과 · 계정 유형 필터        → SelectField ×2 (실화면 FilterPanel 의 pressable 목록 + counts)
 *   기간 프리셋 / 직접 지정      → SelectField + DateRangeField (custom 일 때만)
 *   검색 입력(돋보기 겹침)       → SearchField
 *   내보내기 버튼               → Button(secondary) + Icon(download)
 *   목록 표(8열)                → Table (선택 열·행 액션 열 없음)
 *   실패 행 강조                → Table row tone='danger' (+ Icon(x-circle)·글자·사유·연속 배지)
 *   연속 실패 배지              → 토큰만 쓴 <span>(danger.border 배경 + on-primary 글자)
 *   빈 결과                    → Empty (createVerb='기록', 검색 지우기 복구)
 *   조회 실패 인라인 배너        → Alert(danger) + Button(secondary)
 *   페이지네이션                → Pagination
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  DateRangeField,
  Empty as EmptyState,
  Icon,
  Pagination,
  Panel,
  SearchField,
  SelectField,
  Table,
  cssVar,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Users/Login History',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 login-history/types.ts 의 LoginHistoryEntry 미러) ─────────────────────── */

type LoginOutcome = 'success' | 'failure';
type AccountKind = 'member' | 'admin';
type LoginFailureReason =
  'invalid_password' | 'account_locked' | 'unknown_account' | 'session_expired';

interface DemoEntry {
  readonly id: string;
  /** 시도 시각 — 실화면은 ISO 를 KST 로 포맷해 보여준다 */
  readonly occurredAt: string;
  readonly account: string;
  /** 마스킹된 이름. 미등록 계정은 빈 문자열 */
  readonly name: string;
  readonly accountKind: AccountKind;
  readonly outcome: LoginOutcome;
  readonly failureReason: LoginFailureReason | null;
  /** 이 시도 시점의 연속 실패 횟수 — **서버가 계산해 내려준다**(페이지 경계가 값을 왜곡하지 않게) */
  readonly consecutiveFailures: number;
  readonly ip: string;
  readonly browser: string;
  readonly os: string;
  /** 이동할 계정 레코드 id. **미등록 계정은 null** — 가리킬 계정이 없다 */
  readonly subjectId: string | null;
}

const OUTCOME_LABEL: Record<LoginOutcome, string> = {
  success: '성공',
  failure: '실패',
};

const ACCOUNT_KIND_LABEL: Record<AccountKind, string> = {
  member: '회원',
  admin: '운영자',
};

const FAILURE_REASON_LABEL: Record<LoginFailureReason, string> = {
  invalid_password: '비밀번호 불일치',
  account_locked: '계정 잠김',
  unknown_account: '미등록 계정',
  session_expired: '세션 만료',
};

/** 연속 실패 배지를 다는 최소 횟수 — 1회는 오타다. **2회부터가 신호**다 */
const FAILURE_STREAK_BADGE_MIN = 2;

const OUTCOME_FILTERS: readonly { readonly id: LoginOutcome | 'all'; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'success', label: '성공' },
  { id: 'failure', label: '실패' },
];

const KIND_FILTERS: readonly { readonly id: AccountKind | 'all'; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'member', label: '회원' },
  { id: 'admin', label: '운영자' },
];

type PeriodId = 'today' | 'last-7d' | 'last-30d' | 'custom';

const PERIOD_FILTERS: readonly { readonly id: PeriodId; readonly label: string }[] = [
  { id: 'today', label: '오늘' },
  { id: 'last-7d', label: '최근 7일' },
  { id: 'last-30d', label: '최근 30일' },
  { id: 'custom', label: '직접 지정' },
];

/** 한 번에 조회할 수 있는 최대 기간 — 그 이상은 내보내기로 받는다 */
const MAX_RANGE_DAYS = 90;
const PAGE_SIZE = 10;

/**
 * 최신순(감사 화면은 방금 일어난 일을 먼저 보여준다).
 * 어제 새벽 낯선 IP 에서 한 회원 계정에 연속 6회 — 5회째부터 서버가 잠근다(BE-001).
 * 계정·이름·IP 는 전부 더미이고, IP 는 RFC 5737 문서용 대역만 쓴다.
 */
const DEMO_ENTRIES: readonly DemoEntry[] = [
  {
    id: 'LH-00012',
    occurredAt: '2026-07-21 09:41',
    account: 'ops01@example.com',
    name: '한**',
    accountKind: 'admin',
    outcome: 'success',
    failureReason: null,
    consecutiveFailures: 0,
    ip: '203.0.113.24',
    browser: 'Chrome 126',
    os: 'Windows 11',
    subjectId: 'A-00001',
  },
  {
    id: 'LH-00011',
    occurredAt: '2026-07-21 08:57',
    account: 'user1003@example.com',
    name: '김**',
    accountKind: 'member',
    outcome: 'success',
    failureReason: null,
    consecutiveFailures: 0,
    ip: '203.0.113.31',
    browser: 'Safari 17',
    os: 'macOS 14',
    subjectId: 'M-00003',
  },
  {
    id: 'LH-00010',
    occurredAt: '2026-07-20 18:42',
    account: 'ops03@example.com',
    name: '서**',
    accountKind: 'admin',
    outcome: 'failure',
    failureReason: 'session_expired',
    consecutiveFailures: 1,
    ip: '203.0.113.52',
    browser: 'Edge 126',
    os: 'Windows 10',
    subjectId: 'A-00003',
  },
  {
    id: 'LH-00009',
    occurredAt: '2026-07-20 03:22',
    account: 'user1017@example.com',
    name: '이**',
    accountKind: 'member',
    outcome: 'failure',
    failureReason: 'account_locked',
    consecutiveFailures: 6,
    ip: '198.51.100.127',
    browser: 'Firefox 127',
    os: 'Android 14',
    subjectId: 'M-00017',
  },
  {
    id: 'LH-00008',
    occurredAt: '2026-07-20 03:20',
    account: 'user1017@example.com',
    name: '이**',
    accountKind: 'member',
    outcome: 'failure',
    failureReason: 'account_locked',
    consecutiveFailures: 5,
    ip: '198.51.100.127',
    browser: 'Firefox 127',
    os: 'Android 14',
    subjectId: 'M-00017',
  },
  {
    id: 'LH-00007',
    occurredAt: '2026-07-20 03:18',
    account: 'user1017@example.com',
    name: '이**',
    accountKind: 'member',
    outcome: 'failure',
    failureReason: 'invalid_password',
    consecutiveFailures: 4,
    ip: '198.51.100.127',
    browser: 'Firefox 127',
    os: 'Android 14',
    subjectId: 'M-00017',
  },
  {
    id: 'LH-00006',
    occurredAt: '2026-07-20 03:16',
    account: 'user1017@example.com',
    name: '이**',
    accountKind: 'member',
    outcome: 'failure',
    failureReason: 'invalid_password',
    consecutiveFailures: 3,
    ip: '198.51.100.127',
    browser: 'Firefox 127',
    os: 'Android 14',
    subjectId: 'M-00017',
  },
  {
    id: 'LH-00005',
    occurredAt: '2026-07-20 02:14',
    account: 'admin@example.com',
    name: '',
    accountKind: 'member',
    outcome: 'failure',
    failureReason: 'account_locked',
    consecutiveFailures: 5,
    ip: '198.51.100.23',
    browser: 'Chrome 126',
    os: 'Windows 11',
    subjectId: null,
  },
  {
    id: 'LH-00004',
    occurredAt: '2026-07-20 02:11',
    account: 'admin@example.com',
    name: '',
    accountKind: 'member',
    outcome: 'failure',
    failureReason: 'unknown_account',
    consecutiveFailures: 4,
    ip: '198.51.100.23',
    browser: 'Chrome 126',
    os: 'Windows 11',
    subjectId: null,
  },
  {
    id: 'LH-00003',
    occurredAt: '2026-07-19 21:05',
    account: 'user1042@example.com',
    name: '박**',
    accountKind: 'member',
    outcome: 'failure',
    failureReason: 'invalid_password',
    consecutiveFailures: 1,
    ip: '203.0.113.66',
    browser: 'Samsung Internet 25',
    os: 'Android 14',
    subjectId: 'M-00042',
  },
  {
    id: 'LH-00002',
    occurredAt: '2026-07-19 21:06',
    account: 'user1042@example.com',
    name: '박**',
    accountKind: 'member',
    outcome: 'success',
    failureReason: null,
    consecutiveFailures: 0,
    ip: '203.0.113.66',
    browser: 'Samsung Internet 25',
    os: 'Android 14',
    subjectId: 'M-00042',
  },
  {
    id: 'LH-00001',
    occurredAt: '2026-07-19 10:33',
    account: 'ops02@example.com',
    name: '오**',
    accountKind: 'admin',
    outcome: 'success',
    failureReason: null,
    consecutiveFailures: 0,
    ip: '203.0.113.10',
    browser: 'Chrome 126',
    os: 'macOS 14',
    subjectId: 'A-00002',
  },
];

/** '실패 3회 연속' — 배지를 달 이유가 없으면 null (성공 행 · 첫 실패) */
const streakLabelOf = (entry: DemoEntry): string | null => {
  if (entry.outcome !== 'failure') return null;
  if (entry.consecutiveFailures < FAILURE_STREAK_BADGE_MIN) return null;
  return `실패 ${String(entry.consecutiveFailures)}회 연속`;
};

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 표 열 정의(실화면 LoginHistoryTable COLUMNS 8열 미러 — 선택 열도 액션 열도 없다) ───────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'time', header: '시각', nowrap: true },
  { id: 'account', header: '계정', nowrap: true },
  { id: 'name', header: '이름', nowrap: true },
  { id: 'kind', header: '유형', nowrap: true },
  { id: 'outcome', header: '결과', nowrap: true },
  { id: 'reason', header: '실패 사유', nowrap: true },
  { id: 'ip', header: 'IP', nowrap: true },
  { id: 'device', header: '기기' },
];

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

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

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

const filterStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
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

/** 실패 건수 — 요약 줄에서도 실패는 실패로 보인다(성공 톤으로 섞지 않는다) */
const failureSummaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.feedback.danger.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  margin: 0,
};

const tableWrapStyle: CSSProperties = { overflowX: 'auto', minWidth: 0 };

const mutedStyle: CSSProperties = { color: cssVar('color.text.muted') };

const accountStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

// 색은 text.default 다(실화면 .tds-ui-link 과 같은 값): 실패 행은 tone='danger'(red.100 surface)라
// action.primary(blue.600)를 얹으면 4.23:1 로 axe color-contrast 미달이다. text.default(gray.900)는
// 흰 행·danger 행 어디서나 통과한다. 색만으로 링크를 표시하지 않도록 밑줄로 어포던스를 준다.
const accountLinkStyle: CSSProperties = {
  ...accountStyle,
  color: cssVar('color.text.default'),
  textDecoration: 'underline',
};

const outcomeInnerStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
};

const failureTextStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  color: cssVar('color.feedback.danger.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

/** '실패 3회 연속' — 계정 탈취 시도의 신호. 이 배지가 이 화면이 존재하는 이유다 */
const streakBadgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.feedback.danger.border'),
  color: cssVar('color.text.on-primary'),
  whiteSpace: 'nowrap',
  ...typography('typography.caption.md'),
  // typography() 뒤에 둔다 — 합성 토큰이 fontWeight 를 함께 싣기 때문에 순서가 뒤집히면 굵기가 죽는다
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const reasonStyle: CSSProperties = { color: cssVar('color.feedback.danger.text') };

/** 기기 — 브라우저와 OS 를 한 칸에 두 줄로 */
const deviceStyle: CSSProperties = { display: 'flex', flexDirection: 'column', gap: 0 };

const deviceSubStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface LoginHistoryScreenProps {
  /** 최초 로드 스켈레톤 — Table loading(STATE-01) */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 결과 필터 초기값 — Filtered 상태에서 '실패'만 남겨 연속 실패 배지를 드러낸다 */
  readonly initialOutcome?: LoginOutcome | 'all';
}

function LoginHistoryScreen({
  loading = false,
  initialKeyword = '',
  initialOutcome = 'all',
}: LoginHistoryScreenProps) {
  const [outcome, setOutcome] = useState<LoginOutcome | 'all'>(initialOutcome);
  const [accountKind, setAccountKind] = useState<AccountKind | 'all'>('all');
  const [period, setPeriod] = useState<PeriodId>('last-30d');
  const [draftFrom, setDraftFrom] = useState('');
  const [draftTo, setDraftTo] = useState('');
  const [keyword, setKeyword] = useState(initialKeyword);
  const [page, setPage] = useState(1);

  // 기간 안의 결과별/유형별 건수 — 좌측 필터 배지의 모수(결과·유형·검색과 무관하다)
  const outcomeCounts = useMemo<Record<string, number>>(
    () => ({
      all: DEMO_ENTRIES.length,
      success: DEMO_ENTRIES.filter((entry) => entry.outcome === 'success').length,
      failure: DEMO_ENTRIES.filter((entry) => entry.outcome === 'failure').length,
    }),
    [],
  );

  const kindCounts = useMemo<Record<string, number>>(
    () => ({
      all: DEMO_ENTRIES.length,
      member: DEMO_ENTRIES.filter((entry) => entry.accountKind === 'member').length,
      admin: DEMO_ENTRIES.filter((entry) => entry.accountKind === 'admin').length,
    }),
    [],
  );

  // 기간 + 결과 + 계정 유형 + 검색어(계정·이름·IP) — 전부 AND (실화면 applyQuery 미러)
  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return DEMO_ENTRIES.filter((entry) => {
      if (outcome !== 'all' && entry.outcome !== outcome) return false;
      if (accountKind !== 'all' && entry.accountKind !== accountKind) return false;
      if (needle === '') return true;
      return (
        entry.account.toLowerCase().includes(needle) ||
        entry.name.toLowerCase().includes(needle) ||
        entry.ip.includes(needle)
      );
    });
  }, [outcome, accountKind, keyword]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const failureTotal = filtered.filter((entry) => entry.outcome === 'failure').length;

  // 조건이 바뀌면 1페이지부터 다시 — 뒤쪽 페이지를 보다 필터를 바꾸면 빈 화면이 뜨는 걸 막는다
  const resetPage = (): void => setPage(1);

  const rows: TableProps['rows'] = pageRows.map((entry) => {
    const failed = entry.outcome === 'failure';
    const streak = streakLabelOf(entry);
    // 미등록 계정은 갈 곳이 없다 — onActivate 를 걸지 않아 커서도 pointer 가 되지 않는다
    const hasDetail = entry.subjectId !== null;

    return {
      id: entry.id,
      // 실패 행은 위험 색조 — 배경은 그 위의 강조일 뿐, 뜻은 셀 안 아이콘·글자·배지가 전한다
      ...(failed ? { tone: 'danger' as const } : {}),
      ...(hasDetail
        ? {
            onActivate: () => {
              /* 실화면: 회원이면 /users/members/:id, 운영자면 /users/admins/:id 로 이동 */
            },
          }
        : {}),
      /* 셀은 DS Table 이 각자 keyed <td> 로 감싸지만, 배열 리터럴 안의 JSX 는 react/jsx-key 가
         키를 요구한다 — 열 id 로 키를 준다(위치 고정이라 안정적이다). */
      cells: [
        entry.occurredAt,
        hasDetail ? (
          <a key="account" style={accountLinkStyle} href="#login-history-account">
            {entry.account}
          </a>
        ) : (
          <span key="account" style={accountStyle}>
            {entry.account}
          </span>
        ),
        // 미등록 계정에는 이름이 없다 — 존재하지 않는 사람의 이름을 지어내지 않는다
        entry.name === '' ? (
          <span key="name" style={mutedStyle}>
            —
          </span>
        ) : (
          entry.name
        ),
        ACCOUNT_KIND_LABEL[entry.accountKind],
        <span key="outcome" style={outcomeInnerStyle}>
          {failed ? (
            <>
              <span style={failureTextStyle}>
                <Icon name="x-circle" />
                {OUTCOME_LABEL.failure}
              </span>
              {streak !== null && <span style={streakBadgeStyle}>{streak}</span>}
            </>
          ) : (
            OUTCOME_LABEL.success
          )}
        </span>,
        entry.failureReason === null ? (
          <span key="reason" style={mutedStyle}>
            —
          </span>
        ) : (
          <span key="reason" style={reasonStyle}>
            {FAILURE_REASON_LABEL[entry.failureReason]}
          </span>
        ),
        entry.ip,
        <span key="device" style={deviceStyle}>
          <span>{entry.browser}</span>
          <span style={deviceSubStyle}>{entry.os}</span>
        </span>,
      ],
    };
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>로그인 이력</h1>

      <div style={layoutStyle}>
        {/* 좌측 필터 레일 — 결과 · 계정 유형 · 기간 세 축(AND) + 불변 안내 */}
        <Panel
          notice={
            <p style={hintStyle}>
              로그인 이력은 감사 기록이에요. 관리자도 수정하거나 삭제할 수 없으며, 조회와 내보내기만
              제공해요. 시각은 모두 한국 표준시(KST) 기준이에요.
            </p>
          }
        >
          <div style={filterStackStyle}>
            <div style={filterFieldStyle}>
              <label htmlFor="login-history-outcome" style={filterLabelStyle}>
                결과
              </label>
              <SelectField
                id="login-history-outcome"
                value={outcome}
                onChange={(event) => {
                  setOutcome(event.target.value as LoginOutcome | 'all');
                  resetPage();
                }}
              >
                {OUTCOME_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${option.label} (${fmt(outcomeCounts[option.id] ?? 0)})`}
                  </option>
                ))}
              </SelectField>
            </div>

            <div style={filterFieldStyle}>
              <label htmlFor="login-history-kind" style={filterLabelStyle}>
                계정 유형
              </label>
              <SelectField
                id="login-history-kind"
                value={accountKind}
                onChange={(event) => {
                  setAccountKind(event.target.value as AccountKind | 'all');
                  resetPage();
                }}
              >
                {KIND_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {`${option.label} (${fmt(kindCounts[option.id] ?? 0)})`}
                  </option>
                ))}
              </SelectField>
            </div>

            <div style={filterFieldStyle}>
              <label htmlFor="login-history-period" style={filterLabelStyle}>
                기간
              </label>
              <SelectField
                id="login-history-period"
                value={period}
                onChange={(event) => {
                  setPeriod(event.target.value as PeriodId);
                  resetPage();
                }}
              >
                {PERIOD_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </div>

            {/* 직접 지정만 사용자 입력을 받는다 — 프리셋은 코드가 만들어 틀릴 수 없다 */}
            {period === 'custom' && (
              <DateRangeField
                label="조회 기간"
                startValue={draftFrom}
                endValue={draftTo}
                onStartChange={setDraftFrom}
                onEndChange={setDraftTo}
                hint={`한 번에 최대 ${String(MAX_RANGE_DAYS)}일까지 조회할 수 있어요.`}
              />
            )}
          </div>
        </Panel>

        <div style={mainColumnStyle}>
          {/* 툴바 — 검색(좌) + 내보내기(우). 일괄 액션 자리가 없다(감사 로그라 일괄로 할 일이 없다) */}
          <div style={toolbarStyle}>
            <div style={searchWrapStyle}>
              <SearchField
                label="계정, 이름 또는 IP 검색"
                placeholder="계정 · 이름 · IP 검색"
                value={keyword}
                onChange={(value) => {
                  setKeyword(value);
                  resetPage();
                }}
              />
            </div>
            <Button variant="secondary" iconLeft={<Icon name="download" />}>
              내보내기
            </Button>
          </div>

          <div style={summaryRowStyle}>
            <p style={hintStyle}>{loading ? '불러오는 중…' : `전체 ${fmt(total)}건`}</p>
            {!loading && failureTotal > 0 && (
              <p style={failureSummaryStyle}>{`이 기간의 로그인 실패 ${fmt(failureTotal)}건`}</p>
            )}
          </div>

          <div style={tableWrapStyle}>
            <Table
              caption="로그인 이력 — 행을 누르면 해당 계정의 상세로 이동해요. 미등록 계정은 가리킬 계정이 없어 이동하지 않아요. 이 목록은 읽기 전용이며 수정·삭제할 수 없어요."
              columns={COLUMNS}
              rows={rows}
              loading={loading}
              skeletonRows={PAGE_SIZE}
              empty={
                <EmptyState
                  label="로그인 이력"
                  createVerb="기록"
                  hasQuery={keyword.trim() !== ''}
                  onClearSearch={() => {
                    setKeyword('');
                    resetPage();
                  }}
                />
              }
            />
          </div>

          <Pagination
            page={safePage}
            totalPages={totalPages}
            label="로그인 이력 페이지"
            onChange={setPage}
          />
        </div>
      </div>
    </div>
  );
}

/** 정상: 성공·실패가 섞인 기본 상태(연속 실패 배지 · 미등록 계정 행 포함) */
export const Default: Story = {
  render: () => <LoginHistoryScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <LoginHistoryScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Empty(createVerb='기록', 검색 지우기 복구) */
export const Empty: Story = {
  render: () => <LoginHistoryScreen initialKeyword="203.0.113.999" />,
};

/** 걸러짐: 결과를 '실패'로 좁힌 상태 — 위험 색조 행과 연속 실패 배지가 한눈에 모인다 */
export const Filtered: Story = {
  render: () => <LoginHistoryScreen initialOutcome="failure" />,
};

/** 조회 실패: 목록을 못 불러온 경우 — 인라인 Alert(danger) + 다시 시도(STATE-02) */
export const LoadError: Story = {
  render: () => (
    <div style={pageStyle}>
      <h1 style={headingStyle}>로그인 이력</h1>
      <Alert tone="danger">
        <div style={errorBodyStyle}>
          <span>로그인 이력을 불러오지 못했어요.</span>
          <Button variant="secondary">다시 시도</Button>
        </div>
      </Alert>
    </div>
  ),
};
