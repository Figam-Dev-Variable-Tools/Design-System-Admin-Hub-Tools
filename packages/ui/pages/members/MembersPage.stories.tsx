/**
 * Design System/Templates/Users/Members — 회원 목록(사용자 목록) 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/users/members` → 메뉴 en = "Users"(사용자 관리), 화면 en = "Members"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리에서 확인 — Users 그룹의 Members 엔트리).
 *
 * 대응 실화면: apps/admin/src/pages/members/MembersPage.tsx (라우트 /users/members) 와 그
 * 하위 조립(components/MembersToolbar.tsx · components/MembersTable.tsx).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각(FilterRail/FilterPanel 등)은
 * DS 표면으로 갈음한다: 좌측 등급/그룹 필터 라디오 목록 → 툴바의 SelectField 두 개.
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   검색 입력(돋보기 겹침)     → SearchField
 *   등급·그룹 필터            → SelectField ×2 (실화면은 좌측 FilterRail 의 FilterPanel)
 *   내보내기 버튼             → Button(secondary) + Icon(download)
 *   선택 일괄 액션            → SelectionBar (알림 발송 / 삭제 — 실화면 툴바의 일괄 액션 2종)
 *   전체선택 헤더 / 행 선택칸  → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   목록 표(9열 + 선택 + 액션) → Table (leadingHead=선택 / trailingHead=행 액션)
 *   메모 편집 아이콘           → IconButton + Icon(pencil)
 *   행 ⋯ 메뉴(삭제/알림)       → Menu
 *   빈 결과                   → Empty
 *   페이지네이션(범위+번호)    → Pagination
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
  Empty as EmptyState,
  Icon,
  IconButton,
  Menu,
  Pagination,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  Table,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Users/Members',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 shared/domain/member 모델을 화면이 쓰는 필드만 축약해 흉내) ───────────── */

type MemberTier = 'normal' | 'vip' | 'vvip';

interface DemoActivity {
  readonly posts: number;
  readonly comments: number;
  readonly reviews: number;
  readonly inquiries: number;
}

interface DemoMember {
  readonly id: string;
  readonly nickname: string;
  readonly account: string;
  readonly tier: MemberTier;
  readonly groupId: string;
  readonly group: string;
  readonly joinedAt: string;
  readonly points: number;
  readonly activity: DemoActivity;
  readonly totalPurchase: number;
  readonly memo: string;
}

/** 회원 유형 라벨 — 실화면 shared/domain/member 의 TIER_LABEL 과 같은 값 */
const TIER_LABEL: Record<MemberTier, string> = {
  normal: '일반회원',
  vip: 'VIP',
  vvip: 'VVIP',
};

/** 등급 필터 선택지 — 실화면 TIER_FILTERS 미러 */
const TIER_OPTIONS: readonly { readonly value: MemberTier | 'all'; readonly label: string }[] = [
  { value: 'all', label: '전체 사용자' },
  { value: 'normal', label: '일반 사용자' },
  { value: 'vip', label: 'VIP 사용자' },
  { value: 'vvip', label: 'VVIP 사용자' },
];

/** 그룹 필터 선택지 — 실화면 좌측 그룹 목록 미러('전체 그룹' + 묶음들) */
const GROUP_ALL = 'all';
const GROUPS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'g-regular', label: '단골 고객' },
  { id: 'g-wholesale', label: '도매 회원' },
  { id: 'g-staff', label: '임직원' },
];

const PAGE_SIZE = 10;

const DEMO_MEMBERS: readonly DemoMember[] = [
  {
    id: 'm-1',
    nickname: '김서연',
    account: 'seoyeon@example.com',
    tier: 'vip',
    groupId: 'g-regular',
    group: '단골 고객',
    joinedAt: '2026-06-14',
    points: 12800,
    activity: { posts: 12, comments: 34, reviews: 8, inquiries: 3 },
    totalPurchase: 1284000,
    memo: '전화 상담 선호',
  },
  {
    id: 'm-2',
    nickname: '이준호',
    account: 'junho@example.com',
    tier: 'normal',
    groupId: 'g-wholesale',
    group: '도매 회원',
    joinedAt: '2026-06-02',
    points: 3200,
    activity: { posts: 2, comments: 5, reviews: 1, inquiries: 0 },
    totalPurchase: 452000,
    memo: '',
  },
  {
    id: 'm-3',
    nickname: '박민지',
    account: 'minji@example.com',
    tier: 'vvip',
    groupId: 'g-regular',
    group: '단골 고객',
    joinedAt: '2026-05-21',
    points: 45200,
    activity: { posts: 40, comments: 120, reviews: 26, inquiries: 5 },
    totalPurchase: 8730000,
    memo: 'VVIP 전담 관리',
  },
  {
    id: 'm-4',
    nickname: '최유진',
    account: 'yujin@example.com',
    tier: 'normal',
    groupId: 'g-staff',
    group: '임직원',
    joinedAt: '2026-05-18',
    points: 8000,
    activity: { posts: 5, comments: 9, reviews: 2, inquiries: 1 },
    totalPurchase: 210000,
    memo: '',
  },
  {
    id: 'm-5',
    nickname: '정우성',
    account: 'woosung@example.com',
    tier: 'vip',
    groupId: 'g-wholesale',
    group: '도매 회원',
    joinedAt: '2026-05-10',
    points: 21500,
    activity: { posts: 18, comments: 44, reviews: 11, inquiries: 2 },
    totalPurchase: 3120000,
    memo: '대량 발주 고객',
  },
  {
    id: 'm-6',
    nickname: '강하늘',
    account: 'haneul@example.com',
    tier: 'normal',
    groupId: 'g-regular',
    group: '단골 고객',
    joinedAt: '2026-04-28',
    points: 1500,
    activity: { posts: 0, comments: 2, reviews: 0, inquiries: 0 },
    totalPurchase: 98000,
    memo: '',
  },
  {
    id: 'm-7',
    nickname: '윤아름',
    account: 'areum@example.com',
    tier: 'vip',
    groupId: 'g-regular',
    group: '단골 고객',
    joinedAt: '2026-04-15',
    points: 33400,
    activity: { posts: 25, comments: 60, reviews: 15, inquiries: 4 },
    totalPurchase: 5410000,
    memo: '리뷰 이벤트 당첨',
  },
  {
    id: 'm-8',
    nickname: '임도현',
    account: 'dohyun@example.com',
    tier: 'normal',
    groupId: 'g-wholesale',
    group: '도매 회원',
    joinedAt: '2026-04-03',
    points: 900,
    activity: { posts: 1, comments: 0, reviews: 0, inquiries: 2 },
    totalPurchase: 64000,
    memo: '',
  },
  {
    id: 'm-9',
    nickname: '한소희',
    account: 'sohee@example.com',
    tier: 'vvip',
    groupId: 'g-regular',
    group: '단골 고객',
    joinedAt: '2026-03-22',
    points: 51200,
    activity: { posts: 55, comments: 140, reviews: 33, inquiries: 7 },
    totalPurchase: 11200000,
    memo: '누적 구매 1천만원 돌파',
  },
  {
    id: 'm-10',
    nickname: '오세훈',
    account: 'sehoon@example.com',
    tier: 'normal',
    groupId: 'g-staff',
    group: '임직원',
    joinedAt: '2026-03-11',
    points: 4200,
    activity: { posts: 3, comments: 7, reviews: 1, inquiries: 0 },
    totalPurchase: 175000,
    memo: '',
  },
  {
    id: 'm-11',
    nickname: '신재민',
    account: 'jaemin@example.com',
    tier: 'vip',
    groupId: 'g-wholesale',
    group: '도매 회원',
    joinedAt: '2026-02-27',
    points: 18900,
    activity: { posts: 14, comments: 30, reviews: 9, inquiries: 3 },
    totalPurchase: 2740000,
    memo: '',
  },
  {
    id: 'm-12',
    nickname: '배수지',
    account: 'suji@example.com',
    tier: 'normal',
    groupId: 'g-regular',
    group: '단골 고객',
    joinedAt: '2026-02-14',
    points: 2600,
    activity: { posts: 4, comments: 11, reviews: 2, inquiries: 1 },
    totalPurchase: 132000,
    memo: '가입 축하 쿠폰 발송',
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 활동 요약 '글·댓글·구매평·문의' */
const activityText = (a: DemoActivity): string =>
  `${fmt(a.posts)}·${fmt(a.comments)}·${fmt(a.reviews)}·${fmt(a.inquiries)}`;

/* ── 표 열 정의(데이터 열 9개 — 선택/액션 열은 leadingHead·trailingHead 로 별도) ─────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'nickname', header: '닉네임', nowrap: true },
  { id: 'account', header: '계정', nowrap: true },
  { id: 'tier', header: '회원 유형', nowrap: true },
  { id: 'group', header: '그룹', nowrap: true },
  { id: 'joined', header: '가입일', nowrap: true },
  { id: 'points', header: '적립금', align: 'end' },
  { id: 'activity', header: '글·댓글·구매평·문의', nowrap: true },
  { id: 'purchase', header: '누적 구매금액', align: 'end' },
  { id: 'memo', header: '메모' },
];

/** 헤더 전체선택의 보이지 않는 라벨 id — TriStateCheckbox 가 aria-labelledby 로 가리킨다 */
const SELECT_ALL_LABEL_ID = 'members-select-all-label';

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

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 14)`,
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

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const nicknameStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  whiteSpace: 'nowrap',
};

/** 시각적으로만 숨김(접근성 트리에는 남긴다) — px 없이 rem·무단위 0 만 사용 */
const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '0.0625rem',
  height: '0.0625rem',
  padding: 0,
  margin: '-0.0625rem',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* ── 제어형 화면(hooks-of-rules 준수: Decorator 화살표가 아닌 Capitalized 컴포넌트에서 useState) ── */

interface MembersScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty 상태(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
}

function MembersScreen({
  loading = false,
  initialKeyword = '',
  initialSelectedIds = [],
}: MembersScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [tier, setTier] = useState<MemberTier | 'all'>('all');
  const [group, setGroup] = useState<string>(GROUP_ALL);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );

  // 등급 + 그룹(AND) + 닉네임/계정 키워드 — 실화면 applyQuery 미러
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return DEMO_MEMBERS.filter((member) => {
      if (tier !== 'all' && member.tier !== tier) return false;
      if (group !== GROUP_ALL && member.groupId !== group) return false;
      if (kw === '') return true;
      return (
        member.nickname.toLowerCase().includes(kw) || member.account.toLowerCase().includes(kw)
      );
    });
  }, [keyword, tier, group]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selection = tableSelectionState(pageRows, selectedIds);
  const selectedCount = selectedIds.size;

  const toggleOne = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const member of pageRows) {
        if (checked) next.add(member.id);
        else next.delete(member.id);
      }
      return next;
    });
  };

  // 조건이 바뀌면 첫 페이지로 되돌린다(실화면 useListState 의 resetPage 미러)
  const changeKeyword = (value: string): void => {
    setKeyword(value);
    setPage(1);
  };
  const changeTier = (value: MemberTier | 'all'): void => {
    setTier(value);
    setPage(1);
  };
  const changeGroup = (value: string): void => {
    setGroup(value);
    setPage(1);
  };

  const rows: TableProps['rows'] = pageRows.map((member) => ({
    id: member.id,
    selected: selectedIds.has(member.id),
    onActivate: () => {
      /* 실화면에서는 회원 상세(/users/members/:id)로 이동한다 — 템플릿에서는 조작 없음 */
    },
    leading: [
      <RowSelectCell
        key="select"
        id={member.id}
        label={`${member.nickname} 선택`}
        checked={selectedIds.has(member.id)}
        onToggle={(checked) => toggleOne(member.id, checked)}
      />,
    ],
    cells: [
      <span key="nickname" style={nicknameStyle}>
        {member.nickname}
      </span>,
      member.account,
      TIER_LABEL[member.tier],
      member.group,
      member.joinedAt,
      fmt(member.points),
      activityText(member.activity),
      fmt(member.totalPurchase),
      <IconButton
        key="memo"
        icon={<Icon name="pencil" />}
        label={`${member.nickname} 관리자 메모`}
        size="sm"
      />,
    ],
    trailing: [
      <td key="actions" className="tds-table__cell tds-table__cell--end">
        <Menu
          label={`${member.nickname} 회원 액션`}
          items={[
            { id: 'delete', label: '회원 삭제', danger: true },
            { id: 'notify', label: '알림 발송' },
          ]}
          onSelect={() => {
            /* 실화면: delete → 확인 다이얼로그 / notify → 즉시 발송 */
          }}
        />
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>회원 관리</h1>

      {/* 툴바 — 검색 + 등급/그룹 필터 + 내보내기 */}
      <div style={toolbarStyle}>
        <div style={filtersStyle}>
          <div style={searchWrapStyle}>
            <SearchField
              label="닉네임 또는 계정 검색"
              value={keyword}
              placeholder="검색"
              onChange={changeKeyword}
            />
          </div>

          <div style={filterFieldStyle}>
            <label htmlFor="members-filter-tier" style={filterLabelStyle}>
              등급
            </label>
            <SelectField
              id="members-filter-tier"
              value={tier}
              onChange={(event) => changeTier(event.target.value as MemberTier | 'all')}
            >
              {TIER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div style={filterFieldStyle}>
            <label htmlFor="members-filter-group" style={filterLabelStyle}>
              그룹
            </label>
            <SelectField
              id="members-filter-group"
              value={group}
              onChange={(event) => changeGroup(event.target.value)}
            >
              <option value={GROUP_ALL}>전체 그룹</option>
              {GROUPS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>
        </div>

        <Button variant="secondary" iconLeft={<Icon name="download" />}>
          내보내기
        </Button>
      </div>

      {/* 선택 일괄 액션 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
      <SelectionBar count={selectedCount} noun="명" onClear={() => setSelectedIds(new Set())}>
        <Button variant="secondary" size="sm">
          {`선택 ${fmt(selectedCount)}명 알림 발송`}
        </Button>
        <Button variant="danger" size="sm">
          {`선택 ${fmt(selectedCount)}명 삭제`}
        </Button>
      </SelectionBar>

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${fmt(total)}명`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}명 선택됨` : ''}
      </p>

      <Table
        caption="회원 목록 — 행을 누르면 회원 상세로 이동해요. 체크박스·메모·액션 버튼은 각자 따로 동작해요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 회원 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={toggleAll}
          />,
        ]}
        trailingHead={[
          <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
            <span style={visuallyHidden}>행 액션</span>
          </th>,
        ]}
        loading={loading}
        skeletonRows={PAGE_SIZE}
        empty={
          <EmptyState
            label="회원"
            hasQuery={keyword.trim() !== ''}
            onClearSearch={() => setKeyword('')}
          />
        }
      />

      <Pagination
        page={safePage}
        totalPages={totalPages}
        label="회원 목록 페이지"
        total={total}
        pageSize={PAGE_SIZE}
        onChange={setPage}
      />
    </div>
  );
}

/** 정상: 회원 목록이 채워진 기본 상태(선택 없음 · 2페이지) */
export const Default: Story = {
  render: () => <MembersScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <MembersScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <MembersScreen initialKeyword="등록되지 않은 회원" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(알림 발송/삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <MembersScreen initialSelectedIds={['m-1', 'm-2', 'm-4']} />,
};
