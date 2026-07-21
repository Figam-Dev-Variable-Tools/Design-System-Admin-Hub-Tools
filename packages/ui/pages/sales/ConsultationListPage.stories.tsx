/**
 * Design System/Templates/Sales/Consultation List — 상담 이력 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹에서 `['/sales/consultations', '상담 이력', 'Consultations']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/sales/consultations/ConsultationListPage.tsx
 * (라우트 /sales/consultations). 상담 이력은 감사 성격이라 **읽기 전용**이다 — 실화면은 읽기 전용
 * 껍데기 CrudReadListShell(선택·삭제·일괄작업 없음, 행 클릭 → 상세)을 쓴다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 껍데기(CrudReadListShell/CrudTable)와 앱 조각을 DS 표면으로 갈음한다:
 *   상단 라이브 리전(A11Y-16)   → 토큰만 쓴 visually-hidden div(aria-live=polite)
 *   검색 입력                  → SearchField
 *   유형 필터                  → SelectField
 *   후속조치 대기만 토글        → Checkbox (실화면은 raw <input type=checkbox> — DS Checkbox 로 미러)
 *   요약 줄('전체 N건')         → 토큰만 쓴 <p>
 *   순번 열                    → SeqHeaderCell · SeqCell
 *   목록 표(데이터 6열)         → Table (행 클릭 onActivate → 상세, 선택/액션 열 없음)
 *   유형·후속조치 배지          → StatusBadge
 *   주제(상세로 가는 키보드 경로) → 토큰만 쓴 <a>(실화면 DetailCellLink 미러)
 *   빈 결과                    → Empty (검색 지우기 / 필터 초기화)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useMemo, useState } from 'react';

import {
  Checkbox,
  Empty as EmptyState,
  SearchField,
  SeqCell,
  SeqHeaderCell,
  SelectField,
  StatusBadge,
  Table,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Consultation List',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 모델 · 순수 규칙(실화면 consultations/types.ts 를 화면이 쓰는 필드만 축약해 미러) ─────── */

type ConsultType = 'phone' | 'visit' | 'email' | 'video' | 'meeting';
type ConsultOutcome = 'positive' | 'neutral' | 'negative';

interface Consultation {
  readonly id: string;
  readonly accountName: string;
  readonly consultType: ConsultType;
  readonly topic: string;
  readonly consultedAt: string;
  readonly consultant: string;
  readonly outcome: ConsultOutcome;
  readonly followUpAction: string;
  readonly followUpDone: boolean;
}

const CONSULT_TYPE_LABEL: Record<ConsultType, string> = {
  phone: '전화상담',
  visit: '방문상담',
  email: '이메일',
  video: '화상상담',
  meeting: '대면미팅',
};

const CONSULT_OUTCOME_LABEL: Record<ConsultOutcome, string> = {
  positive: '긍정',
  neutral: '보통',
  negative: '부정',
};

/** 상담 결과 톤 — 긍정 success · 부정 danger · 보통 neutral (실화면 consultOutcomeTone 미러) */
const consultOutcomeTone = (outcome: ConsultOutcome): StatusBadgeTone => {
  if (outcome === 'positive') return 'success';
  if (outcome === 'negative') return 'danger';
  return 'neutral';
};

/** 후속조치 대기 — 조치가 있고 아직 완료되지 않았다 (실화면 hasPendingFollowUp 미러) */
const hasPendingFollowUp = (item: Consultation): boolean =>
  item.followUpAction.trim() !== '' && !item.followUpDone;

const CONSULT_FILTER_ALL = 'all';
type ConsultTypeFilter = typeof CONSULT_FILTER_ALL | ConsultType;

const CONSULT_TYPE_OPTIONS: readonly { readonly id: ConsultType; readonly label: string }[] = [
  { id: 'phone', label: '전화상담' },
  { id: 'visit', label: '방문상담' },
  { id: 'email', label: '이메일' },
  { id: 'video', label: '화상상담' },
  { id: 'meeting', label: '대면미팅' },
];

/* ── 데모 데이터(실화면 data-source 시드를 대표값으로 인라인, 목록이 채워지도록 몇 건 보강) ───────── */

const DEMO_CONSULTATIONS: readonly Consultation[] = [
  {
    id: 'cs-1',
    accountName: '(주)한빛소프트웨어',
    consultType: 'meeting',
    topic: 'ERP 구축 범위 협의',
    consultedAt: '2026-07-14T15:00:00',
    consultant: '이영업',
    outcome: 'positive',
    followUpAction: '견적서 발송 및 구축 일정표 공유',
    followUpDone: false,
  },
  {
    id: 'cs-2',
    accountName: '대성물산 주식회사',
    consultType: 'phone',
    topic: '유지보수 계약 갱신 조건 문의',
    consultedAt: '2026-07-13T11:20:00',
    consultant: '박계약',
    outcome: 'neutral',
    followUpAction: '갱신 견적 재산정 후 회신',
    followUpDone: false,
  },
  {
    id: 'cs-3',
    accountName: '미래테크놀로지',
    consultType: 'visit',
    topic: '납품 지연 클레임 대면 사과',
    consultedAt: '2026-07-11T13:00:00',
    consultant: '박계약',
    outcome: 'positive',
    followUpAction: '',
    followUpDone: true,
  },
  {
    id: 'cs-4',
    accountName: '푸른들유통',
    consultType: 'email',
    topic: '반품 정책 및 교환 절차 안내',
    consultedAt: '2026-07-09T09:40:00',
    consultant: '김상담',
    outcome: 'neutral',
    followUpAction: '',
    followUpDone: true,
  },
  {
    id: 'cs-5',
    accountName: '한결엔지니어링',
    consultType: 'video',
    topic: '신규 라이선스 도입 데모 요청',
    consultedAt: '2026-07-07T16:10:00',
    consultant: '이영업',
    outcome: 'negative',
    followUpAction: '경쟁사 대비 자료 보완 후 재제안',
    followUpDone: false,
  },
];

/** 'YYYY-MM-DD HH:mm' KST 표기 — 실화면 formatDateTime 규약(@tds/ui 경계로 직접 구현) */
const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

/* ── 표 열 정의(데이터 6열 — 순번은 leadingHead 로 별도) ─────────────────────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'consultedAt', header: '상담일시', nowrap: true },
  { id: 'accountName', header: '거래처' },
  { id: 'type', header: '유형', nowrap: true },
  { id: 'topic', header: '주제' },
  { id: 'consultant', header: '담당자', nowrap: true },
  { id: 'followUp', header: '후속조치', nowrap: true },
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

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const selectWrapStyle: CSSProperties = { width: `calc(${cssVar('space.6')} * 5)` };

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

/** 상세로 가는 키보드 경로 — 실화면 DetailCellLink 미러(행 클릭은 마우스 전용이라 링크로 상세에 닿는다) */
const topicLinkStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
  cursor: 'pointer',
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

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface ConsultationListScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 검색어 초기값 — Empty(검색 결과 없음)를 만들 때 미매칭어를 넣는다 */
  readonly initialKeyword?: string;
  /** 후속조치 대기만 필터 초기값 — status 스토리에서 켠다 */
  readonly initialPendingOnly?: boolean;
}

function ConsultationListScreen({
  loading = false,
  initialKeyword = '',
  initialPendingOnly = false,
}: ConsultationListScreenProps) {
  const [keyword, setKeyword] = useState(initialKeyword);
  const [type, setType] = useState<ConsultTypeFilter>(CONSULT_FILTER_ALL);
  const [pendingOnly, setPendingOnly] = useState(initialPendingOnly);
  const pendingId = useId();

  // 유형 + 후속조치 대기(AND) + 거래처/주제/담당자 키워드 — 실화면 filter/search 미러
  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return DEMO_CONSULTATIONS.filter((item) => {
      if (type !== CONSULT_FILTER_ALL && item.consultType !== type) return false;
      if (pendingOnly && !hasPendingFollowUp(item)) return false;
      if (needle === '') return true;
      return (
        item.accountName.toLowerCase().includes(needle) ||
        item.topic.toLowerCase().includes(needle) ||
        item.consultant.toLowerCase().includes(needle)
      );
    });
  }, [keyword, type, pendingOnly]);

  const hasQuery = keyword.trim() !== '';
  const hasActiveFilters = type !== CONSULT_FILTER_ALL || pendingOnly;

  const rows: TableProps['rows'] = visible.map((item, index) => ({
    id: item.id,
    onActivate: () => {
      /* 실화면에서는 상담 상세(/sales/consultations/:id)로 이동한다 — 템플릿에서는 조작 없음 */
    },
    leading: [<SeqCell key="seq" seq={index + 1} />],
    cells: [
      formatDateTime(item.consultedAt),
      item.accountName,
      <StatusBadge
        key="type"
        tone={consultOutcomeTone(item.outcome)}
        label={CONSULT_TYPE_LABEL[item.consultType]}
      />,
      <a key="topic" href={`#consultation-${item.id}`} style={topicLinkStyle}>
        {item.topic}
      </a>,
      item.consultant,
      hasPendingFollowUp(item) ? (
        <StatusBadge key="fu" tone="warning" label="대기" />
      ) : (
        <StatusBadge key="fu" tone="neutral" label={CONSULT_OUTCOME_LABEL[item.outcome]} />
      ),
    ],
  }));

  const announcement = loading
    ? ''
    : visible.length === 0
      ? '조건에 맞는 상담 이력 결과가 없습니다.'
      : `상담 이력 ${String(visible.length)}건을 찾았습니다.`;

  const toolbar: ReactNode = (
    <div style={toolbarStyle}>
      <SearchField
        value={keyword}
        onChange={setKeyword}
        label="거래처·주제·담당자 검색"
        placeholder="거래처 · 주제 · 담당자 검색"
      />
      <span style={selectWrapStyle}>
        <SelectField
          value={type}
          onChange={(event) => setType(event.target.value as ConsultTypeFilter)}
          aria-label="상담유형으로 거르기"
        >
          <option value={CONSULT_FILTER_ALL}>전체 유형</option>
          {CONSULT_TYPE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </span>
      <Checkbox
        id={pendingId}
        label="후속조치 대기만"
        checked={pendingOnly}
        onChange={(event) => setPendingOnly(event.target.checked)}
      />
    </div>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>상담 이력</h1>

      {/* [A11Y-16] 항상 마운트된 polite live region — 실화면 껍데기가 소유하는 자리 */}
      <div aria-live="polite" aria-atomic="true" style={visuallyHidden}>
        {announcement}
      </div>

      {toolbar}

      <p style={summaryStyle} aria-busy={loading}>
        {loading ? '불러오는 중…' : `전체 ${String(visible.length)}건`}
      </p>

      <Table
        caption="상담 이력 목록 — 조회 전용입니다. 행을 누르면 상담 상세로 이동합니다."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[<SeqHeaderCell key="seq" />]}
        loading={loading}
        skeletonRows={5}
        empty={
          <EmptyState
            label="상담 이력"
            hasQuery={hasQuery}
            hasActiveFilters={hasActiveFilters}
            onClearSearch={() => setKeyword('')}
            onResetFilters={() => {
              setType(CONSULT_FILTER_ALL);
              setPendingOnly(false);
            }}
          />
        }
      />
    </div>
  );
}

/** 정상: 상담 이력이 채워진 기본 상태(읽기 전용 · 행 클릭 → 상세) */
export const Default: Story = {
  render: () => <ConsultationListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ConsultationListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Empty(검색 지우기 복구) */
export const Empty: Story = {
  render: () => <ConsultationListScreen initialKeyword="등록되지 않은 상담" />,
};

/** 후속조치 대기: '후속조치 대기만' 필터를 켠 상태 — 대기 배지가 걸린 행만 남는다(STATE-05 필터) */
export const PendingOnly: Story = {
  render: () => <ConsultationListScreen initialPendingOnly />,
};
