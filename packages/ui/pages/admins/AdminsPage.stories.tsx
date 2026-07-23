/**
 * Design System/Templates/Admins/Admins — 관리자(운영진) 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/users/admins` → _data/pages.ts 의 Users 그룹에서 이 화면의
 * 영문명은 "Admins" 로 확정된다(`['/users/admins', '관리자 관리', 'Admins']`).
 *
 * 대응 실화면: apps/admin/src/pages/admins/AdminsPage.tsx (라우트 /users/admins) 와 그 하위 조립
 * (components/AdminGroupPanel · AdminsToolbar · AdminsSearchCard · AdminsTable).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 실화면의 앱 전용 조각은 가장 가까운 DS 표면 +
 * 토큰만 쓴 로컬 레이아웃으로 갈음한다.
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   좌측 운영진 그룹 레일(FilterRail)       → Panel (notice 슬롯 + 안쪽 그룹 필터 목록은 토큰만 쓴 로컬 조립)
 *   그룹 필터 항목(FilterPanel · 건수 배지)  → 토큰 스타일 <button> 목록 + 선택 강조(신규 DS 컴포넌트 아님)
 *   새 그룹 만들기 / 그룹 삭제              → Button ×2 (Panel notice 위 footer 영역)
 *   상단 탭 + 운영자 등록 CTA               → Tabs + Button(primary) + Icon(plus-circle)
 *   검색 카드(돋보기 겹침 입력)            → Card + SearchField
 *   표 카드 제목(CardTitle)                → 토큰만 쓴 <h2> (DS Card 는 표면만 소유)
 *   목록 표(8열 + 선택칸)                  → Table (leadingHead=전체선택 · RowSelectCell)
 *   메모 편집(연필 → 상세로 이동)          → IconButton + Icon(pencil)
 *   목록 조회 실패                         → Alert(danger) + 다시 시도 Button
 *   페이지네이션                           → Pagination
 *
 * [실화면과의 차이 — 의도적] 운영자 목록에는 회원 목록과 달리 일괄 액션 바(SelectionBar)가 없다.
 * 선택은 표 카드 제목의 '· N명 선택됨' 문구로만 드러난다 — 이 템플릿도 그대로 미러한다.
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  Empty as EmptyState,
  Icon,
  IconButton,
  Pagination,
  Panel,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  Table,
  Tabs,
  tabId,
  tableSelectionState,
  tabPanelId,
} from '../../src';
import type { TableProps } from '../../src';
import { cssVar, typography } from '../../generated/tokens/tokens';

const meta: Meta = {
  title: 'Design System/Templates/Admins/Admins',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 pages/admins/types.ts 의 AdminUser 를 표가 쓰는 필드만 축약해 흉내) ────── */

interface DemoAdmin {
  readonly id: string;
  readonly nickname: string;
  readonly account: string;
  readonly groupId: string;
  readonly group: string;
  readonly joinedAt: string;
  readonly department: string;
  readonly position: string;
  readonly phone: string;
  readonly memo: string;
}

/** 그룹 필터의 '전체' 값 — 그룹 id 와 섞이지 않게 상수로 둔다(실화면 GROUP_ALL) */
const GROUP_ALL = 'all';

/** 운영진 그룹 = 메시지 템플릿의 '발신 프로필'(shared/domain/admin-group.ts) — 여기서 만들고 지운다 */
const GROUPS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'g-super', label: '운영 - 최고 관리자' },
  { id: 'g-content', label: '운영 - 콘텐츠 운영' },
  { id: 'g-cs', label: '운영 - 고객지원' },
];

const PAGE_SIZE = 10;

const DEMO_ADMINS: readonly DemoAdmin[] = [
  {
    id: 'a-1',
    nickname: '김운영',
    account: 'operator@tds.local',
    groupId: 'g-super',
    group: '최고 관리자',
    joinedAt: '2025-01-04',
    department: '운영본부',
    position: '본부장',
    phone: '010-1234-5678',
    memo: '전체 권한 · 시스템 역할 보유',
  },
  {
    id: 'a-2',
    nickname: '박콘텐츠',
    account: 'content.park@tds.local',
    groupId: 'g-content',
    group: '콘텐츠 운영',
    joinedAt: '2025-02-11',
    department: '콘텐츠팀',
    position: '팀장',
    phone: '010-2222-3131',
    memo: '공지·배너·팝업 담당',
  },
  {
    id: 'a-3',
    nickname: '이상담',
    account: 'cs.lee@tds.local',
    groupId: 'g-cs',
    group: '고객지원',
    joinedAt: '2025-02-27',
    department: '고객지원팀',
    position: '매니저',
    phone: '010-3535-7788',
    memo: '',
  },
  {
    id: 'a-4',
    nickname: '정마케팅',
    account: 'mkt.jung@tds.local',
    groupId: 'g-content',
    group: '콘텐츠 운영',
    joinedAt: '2025-03-15',
    department: '마케팅팀',
    position: '주임',
    phone: '010-4646-1212',
    memo: '뉴스레터 발신 프로필 관리',
  },
  {
    id: 'a-5',
    nickname: '최지원',
    account: 'cs.choi@tds.local',
    groupId: 'g-cs',
    group: '고객지원',
    joinedAt: '2025-04-02',
    department: '고객지원팀',
    position: '',
    phone: '010-5757-9090',
    memo: '',
  },
  {
    id: 'a-6',
    nickname: '한시스템',
    account: 'sysadmin@tds.local',
    groupId: 'g-super',
    group: '최고 관리자',
    joinedAt: '2025-04-19',
    department: '인프라팀',
    position: '리드',
    phone: '010-6868-2323',
    memo: 'API Key·OAuth 설정 담당',
  },
  {
    id: 'a-7',
    nickname: '윤편집',
    account: 'editor.yoon@tds.local',
    groupId: 'g-content',
    group: '콘텐츠 운영',
    joinedAt: '2025-05-06',
    department: '콘텐츠팀',
    position: '에디터',
    phone: '010-7979-3434',
    memo: '',
  },
  {
    id: 'a-8',
    nickname: '강응대',
    account: 'cs.kang@tds.local',
    groupId: 'g-cs',
    group: '고객지원',
    joinedAt: '2025-05-22',
    department: '고객지원팀',
    position: '주임',
    phone: '010-8080-4545',
    memo: '1:1 문의 답변 담당',
  },
  {
    id: 'a-9',
    nickname: '오퍼블',
    account: 'pub.oh@tds.local',
    groupId: 'g-content',
    group: '콘텐츠 운영',
    joinedAt: '2025-06-08',
    department: '콘텐츠팀',
    position: '',
    phone: '010-9191-5656',
    memo: '',
  },
  {
    id: 'a-10',
    nickname: '신관리',
    account: 'admin.shin@tds.local',
    groupId: 'g-super',
    group: '최고 관리자',
    joinedAt: '2025-06-25',
    department: '운영본부',
    position: '차장',
    phone: '010-1010-6767',
    memo: '',
  },
  {
    id: 'a-11',
    nickname: '배지원',
    account: 'cs.bae@tds.local',
    groupId: 'g-cs',
    group: '고객지원',
    joinedAt: '2025-07-03',
    department: '고객지원팀',
    position: '사원',
    phone: '010-1212-7878',
    memo: '',
  },
  {
    id: 'a-12',
    nickname: '서콘텐츠',
    account: 'content.seo@tds.local',
    groupId: 'g-content',
    group: '콘텐츠 운영',
    joinedAt: '2025-07-14',
    department: '콘텐츠팀',
    position: '주임',
    phone: '010-1313-8989',
    memo: 'FAQ·자료실 담당',
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 와 같은 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 상단 탭 — 실화면 ADMIN_TABS(지금은 '운영진 목록' 하나뿐) */
const ADMIN_TABS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'list', label: '운영진 목록' },
];

/* ── 표 열 정의(데이터 열 8개 — 선택 열은 leadingHead 로 별도) ──────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'nickname', header: '닉네임', nowrap: true },
  { id: 'account', header: '계정', nowrap: true },
  { id: 'group', header: '그룹', nowrap: true },
  { id: 'joined', header: '가입일', nowrap: true },
  { id: 'department', header: '부서', nowrap: true },
  { id: 'position', header: '직급', nowrap: true },
  { id: 'phone', header: '연락처', nowrap: true },
  { id: 'memo', header: '메모' },
];

const SELECT_ALL_LABEL_ID = 'admins-select-all-label';

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

/** 좌: 고정 폭 그룹 레일 / 우: 남는 폭 전부 (실화면 layoutStyle 미러) */
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

const panelBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const panelHeadingStyle: CSSProperties = {
  ...typography('typography.label.md'),
  margin: 0,
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const filterListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const filterItemStyle = (active: boolean): CSSProperties => ({
  ...typography('typography.label.md'),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  width: '100%',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  border: 0,
  borderRadius: cssVar('radius.md'),
  cursor: 'pointer',
  textAlign: 'left',
  background: active ? cssVar('color.surface.raised') : 'transparent',
  color: active ? cssVar('color.action.primary.default') : cssVar('color.text.default'),
  fontWeight: active
    ? cssVar('primitive.typography.font-weight.bold')
    : cssVar('primitive.typography.font-weight.regular'),
});

const filterCountStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

const footerActionsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  width: '100%',
};

const noticeTextStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const tablePanelStyle: CSSProperties = {
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

/** '전체 운영자 N명' 의 숫자 — 파란색 강조 (실화면 countStyle) */
const countStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  fontVariantNumeric: 'tabular-nums',
};

const selectedHintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const nicknameStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
  whiteSpace: 'nowrap',
};

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 좌측 그룹 레일 — Panel(껍데기) + 토큰만 쓴 그룹 필터 목록 ──────────────────────────────── */

interface GroupOption {
  readonly id: string;
  readonly label: string;
  readonly count: number;
}

function AdminGroupRail({
  value,
  options,
  onChange,
}: {
  readonly value: string;
  readonly options: readonly GroupOption[];
  readonly onChange: (id: string) => void;
}) {
  const selectedIsGroup = value !== GROUP_ALL;

  return (
    <Panel
      notice={
        <>
          <p style={noticeTextStyle}>
            여러 사람과 함께 사이트를 관리할 수 있어요. 믿을 수 있는 사용자 그룹에게만 조심해서 관리
            권한을 주세요.
          </p>
          <p style={noticeTextStyle}>
            각 항목에는 알림 발신 및 수신 권한과 사이트 내 조회 및 편집 권한을 포함하고 있어요.
          </p>
        </>
      }
    >
      <div style={panelBodyStyle}>
        <nav aria-label="운영진 그룹 필터">
          <h2 style={panelHeadingStyle}>운영진 그룹</h2>
          <ul style={filterListStyle}>
            {options.map((option) => {
              const active = option.id === value;
              return (
                <li key={option.id}>
                  <button
                    type="button"
                    style={filterItemStyle(active)}
                    aria-current={active ? 'true' : undefined}
                    onClick={() => onChange(option.id)}
                  >
                    <span>{option.label}</span>
                    <span style={filterCountStyle}>{fmt(option.count)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* 그룹은 이 화면에서 만들고 지운다 — '전체 운영자' 는 그룹이 아니라 삭제 버튼을 잠근다 */}
        <div style={footerActionsStyle}>
          <Button variant="secondary">+ 새 그룹 만들기</Button>
          <Button variant="secondary" disabled={!selectedIsGroup}>
            {selectedIsGroup ? '선택한 그룹 삭제' : '그룹 삭제'}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아닌 Capitalized 컴포넌트에서 useState) ───── */

type ScreenState = 'default' | 'loading' | 'empty' | 'error' | 'selection';

function AdminsScreen({ state }: { state: ScreenState }) {
  const loading = state === 'loading';
  const failed = state === 'error';

  const [tab, setTab] = useState('list');
  const [groupId, setGroupId] = useState<string>(GROUP_ALL);
  const [keyword, setKeyword] = useState(state === 'empty' ? '등록되지 않은 운영자' : '');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(state === 'selection' ? ['a-1', 'a-3', 'a-6'] : []),
  );

  const selectTab = (id: string): void => {
    const next = ADMIN_TABS.find((item) => item.id === id);
    if (next !== undefined) setTab(next.id);
  };

  // 그룹(AND) + 닉네임/계정 키워드 — 실화면 조회 조건 미러
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return DEMO_ADMINS.filter((admin) => {
      if (groupId !== GROUP_ALL && admin.groupId !== groupId) return false;
      if (kw === '') return true;
      return admin.nickname.toLowerCase().includes(kw) || admin.account.toLowerCase().includes(kw);
    });
  }, [groupId, keyword]);

  const total = failed ? 0 : filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const selection = tableSelectionState(pageRows, selectedIds);
  const selectedCount = selectedIds.size;

  const groupOptions: readonly GroupOption[] = [
    { id: GROUP_ALL, label: '전체 운영자', count: DEMO_ADMINS.length },
    ...GROUPS.map((group) => ({
      id: group.id,
      label: group.label,
      count: DEMO_ADMINS.filter((admin) => admin.groupId === group.id).length,
    })),
  ];

  const changeGroup = (id: string): void => {
    setGroupId(id);
    setPage(1);
    setSelectedIds(new Set());
  };
  const changeKeyword = (value: string): void => {
    setKeyword(value);
    setPage(1);
    setSelectedIds(new Set());
  };

  const toggleOne = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean): void => {
    setSelectedIds(checked ? new Set(pageRows.map((admin) => admin.id)) : new Set());
  };

  const rows: TableProps['rows'] = pageRows.map((admin) => ({
    id: admin.id,
    selected: selectedIds.has(admin.id),
    onActivate: () => {
      /* 실화면에서는 운영자 상세(/users/admins/:id)로 이동한다 — 템플릿에서는 조작 없음 */
    },
    leading: [
      <RowSelectCell
        key="select"
        id={admin.id}
        label={`${admin.nickname} 선택`}
        checked={selectedIds.has(admin.id)}
        onToggle={(checked) => toggleOne(admin.id, checked)}
      />,
    ],
    cells: [
      <span key="nickname" style={nicknameStyle}>
        {admin.nickname}
      </span>,
      admin.account,
      admin.group,
      admin.joinedAt,
      // 부서·직급은 비어 있을 수 있다 — 빈 셀로 둔다(값을 지어내지 않는다)
      admin.department,
      admin.position,
      admin.phone,
      <IconButton
        key="memo"
        icon={<Icon name="pencil" />}
        label={`${admin.nickname} 관리자 메모`}
        size="sm"
      />,
    ] as ReactNode[],
  }));

  return (
    <div style={pageStyle}>
      <div style={layoutStyle}>
        <AdminGroupRail value={groupId} options={groupOptions} onChange={changeGroup} />

        <div style={mainColumnStyle}>
          {/* 상단 줄 — 탭 + 운영자 등록 CTA */}
          <div style={toolbarStyle}>
            <Tabs
              value={tab}
              items={ADMIN_TABS}
              ariaLabel="관리자 관리 영역"
              onChange={selectTab}
            />
            <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
              운영자 등록
            </Button>
          </div>

          <div
            id={tabPanelId(tab)}
            role="tabpanel"
            aria-labelledby={tabId(tab)}
            style={tablePanelStyle}
          >
            {/* 검색 카드 — 돋보기 겹친 입력을 DS SearchField 로 갈음 */}
            <Card>
              <SearchField
                label="운영자 닉네임 또는 계정 검색"
                value={keyword}
                placeholder="전체 운영자 검색"
                onChange={changeKeyword}
              />
            </Card>

            {failed ? (
              <Alert tone="danger">
                <div style={errorBodyStyle}>
                  <span>운영자 목록을 불러오지 못했어요.</span>
                  <Button variant="secondary">다시 시도</Button>
                </div>
              </Alert>
            ) : (
              <>
                <Card aria-labelledby="admins-table-title">
                  <h2 id="admins-table-title" style={cardTitleStyle}>
                    전체 운영자 <span style={countStyle}>{loading ? '—' : fmt(total)}</span>명
                    {selectedCount > 0 && (
                      <span style={selectedHintStyle}>{` · ${fmt(selectedCount)}명 선택됨`}</span>
                    )}
                  </h2>

                  <div style={tableWrapStyle}>
                    <Table
                      caption="운영자 목록 — 행을 누르면 운영자 상세로 이동해요. 체크박스·메모 버튼은 각자 따로 동작해요."
                      columns={COLUMNS}
                      rows={rows}
                      leadingHead={[
                        <SelectAllHeaderCell
                          key="select-all"
                          label="이 페이지의 운영자 전체 선택"
                          labelId={SELECT_ALL_LABEL_ID}
                          selection={selection}
                          onToggleAll={toggleAll}
                        />,
                      ]}
                      loading={loading}
                      skeletonRows={PAGE_SIZE}
                      empty={
                        <EmptyState
                          label="운영자"
                          hasQuery={keyword.trim() !== ''}
                          onClearSearch={() => changeKeyword('')}
                        />
                      }
                    />
                  </div>
                </Card>

                <Pagination
                  page={safePage}
                  totalPages={totalPages}
                  total={total}
                  pageSize={PAGE_SIZE}
                  label="운영자 목록 페이지"
                  onChange={setPage}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** 정상: 좌 그룹 레일 + 우 탭·검색·표가 모두 채워진 기본 상태(선택 없음 · 2페이지) */
export const Default: Story = {
  render: () => <AdminsScreen state="default" />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <AdminsScreen state="loading" />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <AdminsScreen state="empty" />,
};

/** 선택됨: 여러 행 선택 → 표 카드 제목에 '· N명 선택됨' + 선택 행 강조(운영자 목록에는 일괄 액션 바 없음) */
export const Selection: Story = {
  render: () => <AdminsScreen state="selection" />,
};

/** 에러: 목록 조회 실패 — Alert(danger) + 다시 시도 버튼(실화면 error !== null 흐름) */
export const Error: Story = {
  render: () => <AdminsScreen state="error" />,
};
