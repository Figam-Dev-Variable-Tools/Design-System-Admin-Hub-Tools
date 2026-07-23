/**
 * Design System/Templates/Marketing/Email — 이메일 발송 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/marketing/email` → 메뉴 en = "Marketing"(마케팅 관리), 화면 en = "Email"
 * (packages/ui/pages/_data/pages.ts 의 인벤토리 — Marketing 그룹의 `['/marketing/email', '이메일 발송', 'Email']`).
 *
 * 대응 실화면: apps/admin/src/pages/marketing/email/EmailListPage.tsx (라우트 /marketing/email).
 * SMS 발송 목록과 **형제 구조**다 — 같은 CRUD 껍데기·같은 발송 상태 축을 쓰고, 다른 것은 열뿐이다:
 * 이메일은 유형·성공률 대신 **제목**과 **오픈율/클릭율**을 보여 준다(MailStats). 발송이 끝난 캠페인은
 * 행 클릭도 연필도 잠긴다 — 오픈율/클릭율이 무엇에 대한 수치인지 흐려지지 않게 하기 위해서다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   발송명·제목 검색          → SearchField
 *   발송상태 필터             → SelectField
 *   이메일 발송 등록 버튼      → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸  → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                  → SeqHeaderCell · SeqCell
 *   발송상태 배지             → StatusBadge(neutral·info·warning·success·danger) + 토큰 <span>(예약일시)
 *   오픈율/클릭율             → 토큰 <span>(tabular-nums) · 발송 전에는 대시
 *   행 액션(수정·삭제)        → RowActions (발송이 끝난 행은 연필을 넘기지 않는다)
 *   선택 일괄 삭제 바         → SelectionBar + Button(danger)
 *   삭제 확인                → ConfirmDialog(intent=delete)
 *   목록 표                  → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                  → Empty
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·em 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
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
  title: 'Design System/Templates/Marketing/Email',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 _shared/messaging · email/types 미러) ────────────────────────────────── */

type SendStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'canceled';

const SEND_STATUS_LABEL: Record<SendStatus, string> = {
  draft: '초안',
  scheduled: '예약',
  sending: '발송중',
  sent: '발송완료',
  canceled: '취소',
};

const SEND_STATUS_TONE: Record<SendStatus, StatusBadgeTone> = {
  draft: 'neutral',
  scheduled: 'info',
  sending: 'warning',
  sent: 'success',
  canceled: 'danger',
};

/** 초안·예약만 편집한다 — 실화면 sendActionsFor(status).canEdit 미러 */
const canEditOf = (status: SendStatus): boolean => status === 'draft' || status === 'scheduled';

/** 발송중만 지울 수 없다 */
const canDeleteOf = (status: SendStatus): boolean => status !== 'sending';

const STATUS_FILTER_ALL = 'all';
type StatusFilter = typeof STATUS_FILTER_ALL | SendStatus;

const STATUS_FILTER_OPTIONS: readonly { readonly id: StatusFilter; readonly label: string }[] = [
  { id: STATUS_FILTER_ALL, label: '전체 상태' },
  { id: 'draft', label: '초안' },
  { id: 'scheduled', label: '예약' },
  { id: 'sending', label: '발송중' },
  { id: 'sent', label: '발송완료' },
  { id: 'canceled', label: '취소' },
];

/* ── 데모 데이터(실화면 email/data-source 의 EMAIL_SEED 를 목록 열만 축약해 미러) ────────────── */

/** 이메일·뉴스레터 결과 — 발송 통계에 오픈/클릭을 더한다(MailStats) */
interface DemoMailStats {
  readonly total: number;
  readonly success: number;
  readonly failed: number;
  readonly opened: number;
  readonly clicked: number;
}

interface DemoEmailCampaign {
  readonly id: string;
  readonly name: string;
  readonly subject: string;
  readonly recipientCount: number;
  readonly status: SendStatus;
  readonly scheduledAt: string;
  readonly stats: DemoMailStats;
}

const DEMO_CAMPAIGNS: readonly DemoEmailCampaign[] = [
  {
    id: 'em-1',
    name: '7월 뉴스레터 발송',
    subject: '[스페이스플래닝] 7월의 새로운 소식',
    recipientCount: 5320,
    status: 'sent',
    scheduledAt: '2026-07-01T09:00',
    stats: { total: 5320, success: 5240, failed: 80, opened: 2410, clicked: 620 },
  },
  {
    id: 'em-2',
    name: 'VIP 단독 할인 안내',
    subject: '(광고) VIP 고객님만을 위한 단독 혜택',
    recipientCount: 640,
    status: 'scheduled',
    scheduledAt: '2026-07-22T10:00',
    stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
  },
  {
    id: 'em-3',
    name: '장바구니 리마인드',
    subject: '담아두신 상품을 잊지 않으셨나요?',
    recipientCount: 415,
    status: 'draft',
    scheduledAt: '',
    stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
  },
  {
    id: 'em-4',
    name: '휴면 전환 예정 안내',
    subject: '휴면 계정 전환 예정 안내드려요',
    recipientCount: 2130,
    status: 'sending',
    scheduledAt: '2026-07-21T08:30',
    stats: { total: 2130, success: 810, failed: 4, opened: 120, clicked: 18 },
  },
  {
    id: 'em-5',
    name: '여름 휴가 공지(취소)',
    subject: '여름 휴가 기간 배송 안내',
    recipientCount: 12840,
    status: 'canceled',
    scheduledAt: '2026-07-10T13:00',
    stats: { total: 0, success: 0, failed: 0, opened: 0, clicked: 0 },
  },
];

const ENTITY_LABEL = '이메일 발송';
const SELECT_ALL_LABEL_ID = 'marketing-email-select-all';
const PAGE_SIZE = 10;

/* ── 순수 계산(실화면 openRate · clickRate · formatDateTime 미러) ──────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 오픈율(%) — 오픈÷성공(전달) 기준. 성공 0 이면 0 */
const openRate = (stats: DemoMailStats): number =>
  stats.success <= 0 ? 0 : Math.round((stats.opened / stats.success) * 100);

/** 클릭율(%) — 클릭÷성공(전달) 기준. 성공 0 이면 0 */
const clickRate = (stats: DemoMailStats): number =>
  stats.success <= 0 ? 0 : Math.round((stats.clicked / stats.success) * 100);

const formatDateTime = (value: string): string => value.replace('T', ' ');

/* ── 표 열 정의(데이터 열 5개 — 선택·순번은 leading, 액션은 trailing) ───────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '발송명' },
  { id: 'subject', header: '제목' },
  { id: 'recipients', header: '대상수', align: 'end' },
  { id: 'status', header: '발송상태', nowrap: true },
  { id: 'rates', header: '오픈율/클릭율', align: 'end' },
];

/* ── 스타일(토큰·rem·em 만) ───────────────────────────────────────────────────────────────── */

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

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const selectWrapStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 5)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const subjectStyle: CSSProperties = {
  display: 'block',
  maxWidth: `calc(${cssVar('space.6')} * 10)`,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const numStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const mutedNumStyle: CSSProperties = {
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
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  textAlign: 'right',
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

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface EmailListScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialFilter?: StatusFilter;
  readonly initialSelectedIds?: readonly string[];
}

function EmailListScreen({
  loading = false,
  initialKeyword = '',
  initialFilter = STATUS_FILTER_ALL,
  initialSelectedIds = [],
}: EmailListScreenProps) {
  const [campaigns, setCampaigns] = useState<readonly DemoEmailCampaign[]>(DEMO_CAMPAIGNS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [filter, setFilter] = useState<StatusFilter>(initialFilter);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoEmailCampaign | null>(null);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      if (filter !== STATUS_FILTER_ALL && campaign.status !== filter) return false;
      if (needle === '') return true;
      return (
        campaign.name.toLowerCase().includes(needle) ||
        campaign.subject.toLowerCase().includes(needle)
      );
    });
  }, [campaigns, keyword, filter]);

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
      for (const campaign of visible) {
        if (checked) next.add(campaign.id);
        else next.delete(campaign.id);
      }
      return next;
    });
  };

  const removeCampaign = (id: string): void => {
    setCampaigns((prev) => prev.filter((campaign) => campaign.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((campaign, index) => {
    const editable = canEditOf(campaign.status);
    return {
      id: campaign.id,
      selected: selectedIds.has(campaign.id),
      ...(editable && {
        onActivate: () => {
          /* 실화면: 행 클릭 → 수정 폼(/marketing/email/:id/edit) */
        },
      }),
      leading: [
        <RowSelectCell
          key="select"
          id={campaign.id}
          label={`${campaign.name} 선택`}
          checked={selectedIds.has(campaign.id)}
          onToggle={(checked) => toggleOne(campaign.id, checked)}
        />,
        <SeqCell key="seq" seq={index + 1} />,
      ],
      cells: [
        campaign.name,
        <span key="subject" style={subjectStyle}>
          {campaign.subject}
        </span>,
        <span key="recipients" style={numStyle}>{`${fmt(campaign.recipientCount)}명`}</span>,
        <span key="status" style={statusCellStyle}>
          <StatusBadge
            tone={SEND_STATUS_TONE[campaign.status]}
            label={SEND_STATUS_LABEL[campaign.status]}
          />
          {campaign.scheduledAt !== '' && (
            <span style={mutedNumStyle}>{formatDateTime(campaign.scheduledAt)}</span>
          )}
        </span>,
        campaign.status === 'sent' ? (
          <span key="rates" style={numStyle}>
            {`${String(openRate(campaign.stats))}% / ${String(clickRate(campaign.stats))}%`}
          </span>
        ) : (
          <span key="rates" style={mutedNumStyle}>
            —
          </span>
        ),
      ],
      trailing: [
        <td key="actions" style={actionCellStyle}>
          <RowActions
            label={campaign.name}
            {...(editable && {
              onEdit: () => {
                /* 실화면: 연필 → 수정 폼. 발송이 끝나면 이 콜백 자체를 넘기지 않는다 */
              },
            })}
            {...(canDeleteOf(campaign.status) && { onDelete: () => setConfirming(campaign) })}
          />
        </td>,
      ],
    };
  });

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>{ENTITY_LABEL}</h1>

      <div style={toolbarStyle}>
        <div style={filtersStyle}>
          <div style={searchWrapStyle}>
            <SearchField
              label="발송명·제목 검색"
              value={keyword}
              placeholder="발송명 · 제목 검색"
              onChange={setKeyword}
            />
          </div>
          <span style={selectWrapStyle}>
            <SelectField
              value={filter}
              aria-label="발송상태로 거르기"
              onChange={(event) => {
                const raw = event.target.value;
                setFilter(
                  STATUS_FILTER_OPTIONS.find((option) => option.id === raw)?.id ??
                    STATUS_FILTER_ALL,
                );
              }}
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </span>
        </div>
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          이메일 발송 등록
        </Button>
      </div>

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button
          variant="danger"
          onClick={() => {
            for (const id of selectedIds) removeCampaign(id);
          }}
        >
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        caption="이메일 발송 목록 — 초안·예약 캠페인은 행을 누르면 수정 폼으로 이동해요. 발송이 끝난 캠페인은 수정할 수 없어요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 이메일 발송 전체 선택"
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
            hasQuery={keyword.trim() !== ''}
            hasActiveFilters={filter !== STATUS_FILTER_ALL}
            onClearSearch={() => setKeyword('')}
            onResetFilters={() => setFilter(STATUS_FILTER_ALL)}
          />
        }
      />

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="이메일 발송 삭제"
          message={`'${confirming.name}'을(를) 삭제해요. 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          onConfirm={() => {
            removeCampaign(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/** 정상: 발송 캠페인 5건(초안·예약·발송중·발송완료·취소)이 모두 보이는 기본 상태 */
export const Default: Story = {
  render: () => <EmailListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <EmailListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <EmailListScreen initialKeyword="등록되지 않은 캠페인" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <EmailListScreen initialSelectedIds={['em-2', 'em-3']} />,
};

/** 필터 적용: 상태='발송완료' — 오픈율/클릭율 열이 실제 수치를 갖는 유일한 상태 */
export const Filtered: Story = {
  render: () => <EmailListScreen initialFilter="sent" />,
};
