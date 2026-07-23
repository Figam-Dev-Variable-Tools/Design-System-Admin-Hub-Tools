/**
 * Design System/Templates/Marketing/Newsletters — 뉴스레터 발송회차 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/marketing/newsletters` → 메뉴 en = "Marketing"(마케팅 관리), 화면 en =
 * "Newsletters" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Marketing 그룹의
 * `['/marketing/newsletters', '뉴스레터', 'Newsletters']`).
 *
 * 대응 실화면: apps/admin/src/pages/marketing/newsletters/NewsletterListPage.tsx
 * (라우트 /marketing/newsletters). 발송회차 목록이라 열이 회차·제목·구독자수·상태(+예약일시)·오픈율·
 * 클릭율 여섯이고, 수치 열 넷이 우측 정렬 + tabular-nums 다. 실화면은 shared/crud 의 CrudListShell →
 * CrudTable → DS Table 로 조립되고, 조회 조건(status·keyword)의 단일 원천은 URL(useListState · IA-13)이다.
 *
 * [발송 상태가 편집 진입을 가른다 — 권한과 다른 축] sendActionsFor(status) 가 판정한다:
 *   초안·예약 → 수정 가능 / 발송중 → 수정·삭제 모두 불가 / 발송완료·취소 → 삭제만 가능.
 * 발송완료 회차를 편집으로 열면 상태가 조용히 '초안' 으로 강등되던 사고(FS-033-EL-032)가 근거다.
 * 실화면은 rowTarget.disabled 로 행 클릭까지 함께 막고 이유를 밝힌다 — 커서만 pointer 이고 눌러도
 * 아무 일이 없는 '조용한 무반응' 을 없애려는 조치다. 템플릿은 그 판정 결과를 그대로 미러해 수정
 * 불가 행에서는 연필을, 삭제 불가 행에서는 휴지통을 아예 그리지 않는다.
 *
 * [오픈율·클릭율은 발송완료에만 있다] 아직 나가지 않은 회차의 비율은 0% 가 아니라 '없음' 이다 —
 * 0 을 찍으면 성과가 나쁜 것처럼 읽힌다. 그래서 '—'(muted)로 비운다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·
 *   RowActions·SelectionBar·tableSelectionState)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   상단 라이브 리전(A11Y-16)    → 토큰만 쓴 visually-hidden div(aria-live=polite)
 *   제목 검색                   → SearchField
 *   발송 상태 필터               → SelectField
 *   등록 CTA(canCreate 게이팅)   → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸     → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                     → SeqHeaderCell · SeqCell
 *   회차·구독자수·오픈율·클릭율   → Table column align='end' + 토큰만 쓴 <span>(tabular-nums)
 *   상태 배지 + 예약일시          → StatusBadge + 토큰만 쓴 muted <span>
 *   행 액션(수정·삭제)           → RowActions (sendActionsFor 판정 결과에 따라 버튼을 뺀다)
 *   선택 일괄 삭제 바            → SelectionBar + Button(danger)
 *   삭제 확인                   → ConfirmDialog(intent=delete)
 *   목록 표(데이터 6열)          → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                     → Empty (검색 지우기 / 필터 초기화)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·em 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Marketing/Newsletters',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수 · 순수 규칙(실화면 newsletters/types.ts · _shared/messaging.ts 미러) ───────────── */

type SendStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'canceled';

const SEND_STATUS_OPTIONS: readonly { readonly id: SendStatus; readonly label: string }[] = [
  { id: 'draft', label: '초안' },
  { id: 'scheduled', label: '예약' },
  { id: 'sending', label: '발송중' },
  { id: 'sent', label: '발송완료' },
  { id: 'canceled', label: '취소' },
];

interface SendStatusMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

/** 발송 상태 → 라벨·톤(키 접근 안전) — 실화면 sendStatusLabel · sendStatusTone 미러 */
const SEND_STATUS_META: Record<SendStatus, SendStatusMeta> = {
  draft: { label: '초안', tone: 'neutral' },
  scheduled: { label: '예약', tone: 'info' },
  sending: { label: '발송중', tone: 'warning' },
  sent: { label: '발송완료', tone: 'success' },
  canceled: { label: '취소', tone: 'danger' },
};

interface SendActions {
  readonly canEdit: boolean;
  readonly canDelete: boolean;
}

/** 발송 상태가 허용하는 액션 — 실화면 sendActionsFor 미러(전이 규칙의 정본은 _shared/messaging) */
function sendActionsFor(status: SendStatus): SendActions {
  return {
    canEdit: status === 'draft' || status === 'scheduled',
    canDelete: status !== 'sending',
  };
}

/** 이메일 발송 결과 — 오픈/클릭은 전달(성공) 기준. 성공 0 이면 0 */
interface MailStats {
  readonly total: number;
  readonly success: number;
  readonly failed: number;
  readonly opened: number;
  readonly clicked: number;
}

const openRate = (stats: MailStats): number =>
  stats.success <= 0 ? 0 : Math.round((stats.opened / stats.success) * 100);

const clickRate = (stats: MailStats): number =>
  stats.success <= 0 ? 0 : Math.round((stats.clicked / stats.success) * 100);

const NEWSLETTER_FILTER_ALL = 'all';
type NewsletterStatusFilter = typeof NEWSLETTER_FILTER_ALL | SendStatus;

/** 'YYYY-MM-DDTHH:mm' → 'YYYY-MM-DD HH:mm' (실화면 formatDateTime 의 목록 표기 미러) */
const formatDateTime = (value: string): string => value.replace('T', ' ');

/* ── 데모 데이터(실화면 NewsletterIssue 를 목록이 쓰는 필드만 축약해 흉내) ─────────────────────── */

interface DemoIssue {
  readonly id: string;
  readonly issueNo: number;
  readonly title: string;
  readonly recipientCount: number;
  readonly status: SendStatus;
  readonly scheduledAt: string;
  readonly stats: MailStats;
}

const NO_STATS: MailStats = { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 };

/** 회차번호 내림차순 — 실화면 sortNewsletters 가 이미 정렬해 넘긴다 */
const DEMO_ISSUES: readonly DemoIssue[] = [
  {
    id: 'nl-4',
    issueNo: 15,
    title: '스페이스플래닝 9월 뉴스레터(발송중)',
    recipientCount: 5320,
    status: 'sending',
    scheduledAt: '2026-07-21T09:00',
    stats: NO_STATS,
  },
  {
    id: 'nl-3',
    issueNo: 14,
    title: '스페이스플래닝 8월 뉴스레터(초안)',
    recipientCount: 5320,
    status: 'draft',
    scheduledAt: '',
    stats: NO_STATS,
  },
  {
    id: 'nl-2',
    issueNo: 13,
    title: '스페이스플래닝 7월 뉴스레터',
    recipientCount: 5320,
    status: 'scheduled',
    scheduledAt: '2026-07-25T09:00',
    stats: NO_STATS,
  },
  {
    id: 'nl-1',
    issueNo: 12,
    title: '스페이스플래닝 6월 뉴스레터',
    recipientCount: 5180,
    status: 'sent',
    scheduledAt: '2026-06-01T09:00',
    stats: { total: 5180, success: 5100, failed: 80, opened: 2295, clicked: 510 },
  },
  {
    id: 'nl-0',
    issueNo: 11,
    title: '스페이스플래닝 5월 뉴스레터(취소)',
    recipientCount: 5040,
    status: 'canceled',
    scheduledAt: '2026-05-01T09:00',
    stats: NO_STATS,
  },
];

const nameOf = (item: DemoIssue): string => `${String(item.issueNo)}회 ${item.title}`;

/* ── 표 열 정의(데이터 6열 — 선택·순번은 leadingHead, 액션은 trailingHead 로 별도) ─────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'issueNo', header: '회차', align: 'end' },
  { id: 'title', header: '제목' },
  { id: 'recipients', header: '구독자수', align: 'end' },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'openRate', header: '오픈율', align: 'end' },
  { id: 'clickRate', header: '클릭율', align: 'end' },
];

const ENTITY_LABEL = '뉴스레터';
const SELECT_ALL_LABEL_ID = 'marketing-newsletters-select-all';
const PAGE_SIZE = 10;

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
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filtersStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const numStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const mutedStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const statusCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const actionCellStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  justifyContent: 'flex-end',
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

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface NewsletterListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading(STATE-01) */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 발송 상태 필터 초기값 — 실화면은 URL ?status=… 가 소유한다(IA-13) */
  readonly initialFilter?: NewsletterStatusFilter;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 → SelectionBar 노출 */
  readonly initialSelectedIds?: readonly string[];
}

function NewsletterListScreen({
  loading = false,
  initialKeyword = '',
  initialFilter = NEWSLETTER_FILTER_ALL,
  initialSelectedIds = [],
}: NewsletterListScreenProps) {
  const [issues, setIssues] = useState<readonly DemoIssue[]>(DEMO_ISSUES);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<NewsletterStatusFilter>(initialFilter);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoIssue | null>(null);

  // 상태 필터 + 제목 키워드 — 실화면 filterNewsletters/searchNewsletters 미러
  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return issues.filter((item) => {
      if (filter !== NEWSLETTER_FILTER_ALL && item.status !== filter) return false;
      if (needle === '') return true;
      return item.title.toLowerCase().includes(needle);
    });
  }, [issues, keyword, filter]);

  const selection = tableSelectionState(visible, selectedIds);
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
      for (const item of visible) {
        if (checked) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });
  };

  const removeIssue = (id: string): void => {
    setIssues((prev) => prev.filter((item) => item.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // 조건이 바뀌면 선택을 비운다 — 화면에 없는 행이 선택된 채 '선택 N건 삭제' 가 되지 않게 (STATE-04-b)
  const changeKeyword = (value: string): void => {
    setKeyword(value);
    setSelectedIds(new Set());
  };
  const changeFilter = (value: NewsletterStatusFilter): void => {
    setFilter(value);
    setSelectedIds(new Set());
  };

  const hasQuery = keyword.trim() !== '';
  const hasActiveFilters = filter !== NEWSLETTER_FILTER_ALL;

  const rows: TableProps['rows'] = visible.map((item, index) => {
    const meta = SEND_STATUS_META[item.status];
    const actions = sendActionsFor(item.status);
    const sent = item.status === 'sent';
    return {
      id: item.id,
      selected: selectedIds.has(item.id),
      // 발송이 끝난 회차는 행 클릭도 걸지 않는다 — 실화면 rowTarget.disabled 미러
      ...(actions.canEdit && {
        onActivate: () => {
          /* 실화면: 행 클릭 → 뉴스레터 수정(/marketing/newsletters/:id/edit) */
        },
      }),
      leading: [
        <RowSelectCell
          key="select"
          id={item.id}
          label={`${nameOf(item)} 선택`}
          checked={selectedIds.has(item.id)}
          onToggle={(checked) => toggleOne(item.id, checked)}
        />,
        <SeqCell key="seq" seq={index + 1} />,
      ],
      cells: [
        <span key="issue-no" style={numStyle}>{`${String(item.issueNo)}회`}</span>,
        item.title,
        <span key="recipients" style={numStyle}>
          {`${item.recipientCount.toLocaleString('ko-KR')}명`}
        </span>,
        <span key="status" style={statusCellStyle}>
          <StatusBadge tone={meta.tone} label={meta.label} />
          {item.scheduledAt !== '' && (
            <span style={mutedStyle}>{formatDateTime(item.scheduledAt)}</span>
          )}
        </span>,
        sent ? (
          <span key="open" style={numStyle}>{`${String(openRate(item.stats))}%`}</span>
        ) : (
          <span key="open" style={mutedStyle}>
            —
          </span>
        ),
        sent ? (
          <span key="click" style={numStyle}>{`${String(clickRate(item.stats))}%`}</span>
        ) : (
          <span key="click" style={mutedStyle}>
            —
          </span>
        ),
      ],
      trailing: [
        <td key="actions" className="tds-table__cell tds-table__cell--end">
          <span style={actionCellStyle}>
            <RowActions
              label={nameOf(item)}
              {...(actions.canEdit && {
                onEdit: () => {
                  /* 실화면: 연필 → 뉴스레터 수정 화면으로 이동 */
                },
              })}
              {...(actions.canDelete && { onDelete: () => setConfirming(item) })}
            />
          </span>
        </td>,
      ],
    };
  });

  const announcement = loading
    ? ''
    : visible.length === 0
      ? '조건에 맞는 뉴스레터 결과가 없어요.'
      : `뉴스레터 ${String(visible.length)}건을 찾았어요.`;

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <div style={filtersStyle}>
        <SearchField
          value={keyword}
          onChange={changeKeyword}
          label="제목 검색"
          placeholder="제목 검색"
        />
        <span style={selectWrapStyle}>
          <SelectField
            value={filter}
            onChange={(event) => changeFilter(event.target.value as NewsletterStatusFilter)}
            aria-label="상태로 거르기"
          >
            <option value={NEWSLETTER_FILTER_ALL}>전체 상태</option>
            {SEND_STATUS_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </span>
      </div>
      {/* 등록 CTA — 실화면은 create 권한이 있을 때만 존재한다(EXC-03). 템플릿은 항상 표시 */}
      <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
        뉴스레터 등록
      </Button>
    </div>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>뉴스레터</h1>

      <div aria-live="polite" aria-atomic="true" style={visuallyHidden}>
        {announcement}
      </div>

      {toolbar}

      <p style={summaryStyle} aria-busy={loading}>
        {loading ? '불러오는 중…' : `전체 ${visible.length.toLocaleString('ko-KR')}건`}
        {selectedCount > 0 ? ` · ${selectedCount.toLocaleString('ko-KR')}건 선택됨` : ''}
      </p>

      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            for (const id of selectedIds) removeIssue(id);
          }}
        >
          {`선택 ${selectedCount.toLocaleString('ko-KR')}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        caption="뉴스레터 발송회차 목록 — 초안·예약 회차는 행을 누르면 수정 화면으로 이동해요. 발송중·발송완료·취소 회차는 수정할 수 없어요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 뉴스레터 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={toggleAll}
          />,
          <SeqHeaderCell key="seq" />,
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
            label={ENTITY_LABEL}
            hasQuery={hasQuery}
            hasActiveFilters={hasActiveFilters}
            onClearSearch={() => setKeyword('')}
            onResetFilters={() => setFilter(NEWSLETTER_FILTER_ALL)}
          />
        }
      />

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="뉴스레터 삭제"
          message={`${nameOf(confirming)} 회차를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="회차 삭제"
          onConfirm={() => {
            removeIssue(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/** 정상: 다섯 발송 상태가 한 화면에 모인 기본 상태(발송중 행은 액션이 아예 없다) */
export const Default: Story = {
  render: () => <NewsletterListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <NewsletterListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <NewsletterListScreen initialKeyword="등록되지 않은 회차" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <NewsletterListScreen initialSelectedIds={['nl-1', 'nl-3']} />,
};

/** 필터 적용: 상태='발송완료' — 오픈율·클릭율이 실제로 채워지는 유일한 상태다(IA-13 URL 복원) */
export const Filtered: Story = {
  render: () => <NewsletterListScreen initialFilter="sent" />,
};
