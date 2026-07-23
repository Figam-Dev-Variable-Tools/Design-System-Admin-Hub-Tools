/**
 * Design System/Templates/Sales/Account Detail — 거래처 상세 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹의 Accounts 엔트리(`/sales/accounts`)에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/sales/accounts/AccountDetailPage.tsx (라우트 /sales/accounts/:id)
 * 와 그 하위 조각(components/RelatedRecordsCard).
 *
 * [이 화면이 생긴 두 가지 이유] ① 거래처에는 읽기 전용 상세가 없어 **고칠 수 없는 사람에게도 수정
 * 폼을 열어야** 했다(오조작의 초대장이다). 여기는 전부 읽기 전용이고 고치는 길은 명시적 버튼 하나뿐이다.
 * ② **거래처 → 그 거래처의 계약/견적/프로젝트** 역방향 조회가 앱 전체에 없었다 — 계약도 견적도
 * 거래처를 자유 입력 문자열로 들고 있었으니 애초에 물을 수 없는 질문이었다. accountId 참조가 생긴
 * 지금 그 질문에 답하는 곳이 여기고, 그래서 아래 네 구획이 이 화면의 본론이다.
 *
 * [네 구획은 세 상태를 뭉개지 않는다] 못 불러왔다(Alert + 다시 시도) / 아직 못 읽었다(스켈레톤) /
 * 정말 없다(안내 문구)는 서로 다른 사실이다. 셋을 '없습니다' 하나로 합치면 조회가 실패한 거래처가
 * '거래 이력 없는 거래처' 로 보인다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면·토큰 레이아웃으로 갈음한다:
 *   RelatedRecordsCard → Card + 토큰 <h2> + DS Table(loading/empty 슬롯) + Alert(다시 시도)
 *   CardTitle · dl/dt/dd · pageTitleStyle → 토큰만 쓴 로컬 조립(신규 DS 컴포넌트 아님)
 *   DetailCellLink     → 토큰만 쓴 <a>
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로 복귀              → Icon(chevron-left) + 토큰 <button>
 *   상호 + 거래유형·신용등급·거래상태 → 토큰 <h1> + StatusBadge ×3 (tradeTypeTone·creditGradeTone 미러)
 *   거래처 수정 CTA            → Button(primary) — 권한이 없으면 그리지 않는다 (EXC-03)
 *   기본 정보 · 거래 조건 · 신용   → Card ×2 + dl/dt/dd(토큰) + 신용등급 StatusBadge
 *   담당자 목록(대표담당 배지)    → 토큰 <ul>/<li> + StatusBadge(info)
 *   이 거래처의 계약/견적/프로젝트 → Card + Table ×3 (역방향 조회 · 각 행은 링크)
 *   구획 조회 실패             → Alert(danger) + Button(다시 시도)
 *   구획 스켈레톤 / 빈 구획      → Table loading · Table empty 슬롯(토큰 안내 문구)
 *   404 / 조회 실패            → Alert(danger) (+ 서버 오류에만 다시 시도 · EXC-12)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';

import { Alert, Button, Card, Icon, StatusBadge, Table, cssVar, typography } from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Account Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 도메인 규칙(실화면 sales/accounts·contracts·quotes·projects types 미러) ─ */

type TradeType = 'sales' | 'purchase' | 'both';
type TaxType = 'general' | 'simplified' | 'exempt' | 'zero_rated';
type CreditGrade = 'A' | 'B' | 'C' | 'D';
type PaymentTerm = 'cash' | 'eom' | 'net_30' | 'net_60' | 'next_eom';

const TRADE_TYPE_LABEL: Record<TradeType, string> = {
  sales: '매출처',
  purchase: '매입처',
  both: '매입매출',
};

const TRADE_TYPE_TONE: Record<TradeType, StatusBadgeTone> = {
  sales: 'info',
  purchase: 'warning',
  both: 'success',
};

const TAX_TYPE_LABEL: Record<TaxType, string> = {
  general: '일반과세',
  simplified: '간이과세',
  exempt: '면세',
  zero_rated: '영세율',
};

const CREDIT_GRADE_LABEL: Record<CreditGrade, string> = {
  A: 'A (우량)',
  B: 'B (정상)',
  C: 'C (주의)',
  D: 'D (불량)',
};

/** 신용등급 배지 색 — A 에서 멀어질수록 위험 */
const CREDIT_GRADE_TONE: Record<CreditGrade, StatusBadgeTone> = {
  A: 'success',
  B: 'info',
  C: 'warning',
  D: 'danger',
};

const PAYMENT_TERM_LABEL: Record<PaymentTerm, string> = {
  cash: '현금',
  eom: '말일결제',
  net_30: 'Net-30',
  net_60: 'Net-60',
  next_eom: '익월말',
};

type ContractStatus = 'draft' | 'review' | 'active' | 'expired' | 'terminated';
type ContractType = 'supply' | 'service' | 'maintenance' | 'license' | 'lease' | 'nda';
type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired' | 'ordered';
type PipelineStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface BadgeMeta {
  readonly label: string;
  readonly tone: StatusBadgeTone;
}

const CONTRACT_STATUS_META: Record<ContractStatus, BadgeMeta> = {
  draft: { label: '초안', tone: 'neutral' },
  review: { label: '검토중', tone: 'info' },
  active: { label: '진행중', tone: 'success' },
  expired: { label: '만료', tone: 'neutral' },
  terminated: { label: '해지', tone: 'danger' },
};

const CONTRACT_TYPE_LABEL: Record<ContractType, string> = {
  supply: '공급계약',
  service: '용역계약',
  maintenance: '유지보수',
  license: '라이선스',
  lease: '임대',
  nda: '비밀유지(NDA)',
};

const QUOTE_STATUS_META: Record<QuoteStatus, BadgeMeta> = {
  draft: { label: '작성중', tone: 'neutral' },
  sent: { label: '발송', tone: 'info' },
  accepted: { label: '승인', tone: 'success' },
  rejected: { label: '반려', tone: 'danger' },
  expired: { label: '만료', tone: 'neutral' },
  ordered: { label: '수주전환', tone: 'success' },
};

const STAGE_META: Record<PipelineStage, BadgeMeta> = {
  lead: { label: '리드', tone: 'neutral' },
  qualified: { label: '상담', tone: 'info' },
  proposal: { label: '제안', tone: 'info' },
  negotiation: { label: '협상', tone: 'warning' },
  won: { label: '수주', tone: 'success' },
  lost: { label: '실주', tone: 'danger' },
};

const KO_NUMBER = new Intl.NumberFormat('ko-KR');
/** '36,000,000원' — 실화면 formatWon 미러 */
const formatWon = (value: number): string => `${KO_NUMBER.format(value)}원`;

/** 빈 문자열은 '값이 없다' 는 뜻이다 — 빈 칸으로 두면 로딩 중인지 없는 것인지 구분되지 않는다 */
const dash = (value: string): string => (value.trim() === '' ? '—' : value);

/* ── 데모 데이터(실화면 각 모듈 시드의 acc-1 관련 행만 미러) ───────────────────────────────────── */

interface DemoContact {
  readonly id: string;
  readonly name: string;
  readonly department: string;
  readonly position: string;
  readonly phone: string;
  readonly email: string;
  /** 대표담당 여부 — 한 명만 true 로 유지한다 */
  readonly primary: boolean;
}

interface DemoAccount {
  readonly id: string;
  readonly name: string;
  readonly bizNo: string;
  readonly ceoName: string;
  readonly bizType: string;
  readonly bizItem: string;
  readonly tradeType: TradeType;
  readonly taxType: TaxType;
  readonly creditGrade: CreditGrade;
  /** 여신한도(원) — 0 이면 '미설정'(한도 없음이 아니다) */
  readonly creditLimit: number;
  readonly paymentTerm: PaymentTerm;
  readonly address: string;
  readonly phone: string;
  readonly contacts: readonly DemoContact[];
  readonly active: boolean;
  readonly lastTradeAt: string;
  readonly note: string;
}

interface DemoContract {
  readonly id: string;
  readonly title: string;
  readonly contractType: ContractType;
  readonly startAt: string;
  readonly endAt: string;
  readonly amount: number;
  readonly status: ContractStatus;
}

interface DemoQuote {
  readonly id: string;
  readonly quoteNo: string;
  readonly issueDate: string;
  readonly total: number;
  readonly status: QuoteStatus;
}

interface DemoProject {
  readonly id: string;
  readonly name: string;
  readonly stage: PipelineStage;
  readonly expectedRevenue: number;
  readonly startAt: string;
  readonly endAt: string;
}

interface DemoRecords {
  readonly contracts: readonly DemoContract[];
  readonly quotes: readonly DemoQuote[];
  readonly projects: readonly DemoProject[];
}

/** acc-1 — 담당자 둘(대표담당 1명)·여신 5천만·Net-30 (실화면 ACCOUNT_SEED 미러) */
const DEMO_ACCOUNT: DemoAccount = {
  id: 'acc-1',
  name: '(주)한빛소프트웨어',
  bizNo: '124-81-00998',
  ceoName: '김한빛',
  bizType: '서비스',
  bizItem: '소프트웨어 개발',
  tradeType: 'sales',
  taxType: 'general',
  creditGrade: 'A',
  creditLimit: 50_000_000,
  paymentTerm: 'net_30',
  address: '서울특별시 강남구 테헤란로 123, 8층',
  phone: '02-1234-5678',
  contacts: [
    {
      id: 'ct-1',
      name: '이영업',
      department: '구매팀',
      position: '팀장',
      phone: '010-1111-2222',
      email: 'lee@hanbit.example',
      primary: true,
    },
    {
      id: 'ct-2',
      name: '박담당',
      department: '개발팀',
      position: '대리',
      phone: '010-3333-4444',
      email: 'park@hanbit.example',
      primary: false,
    },
  ],
  active: true,
  lastTradeAt: '2026-07-10',
  note: '연간 유지보수 계약 갱신 예정 거래처.',
};

/** 거래가 끊긴 거래처 — 담당자도 이력도 없다(신규 등록 직후이거나 거래중지된 건) */
const DEMO_QUIET_ACCOUNT: DemoAccount = {
  id: 'acc-3',
  name: '미래테크놀로지',
  bizNo: '120-81-47521',
  ceoName: '오미래',
  bizType: '제조',
  bizItem: '전자부품',
  tradeType: 'both',
  taxType: 'general',
  creditGrade: 'C',
  creditLimit: 0,
  paymentTerm: 'net_60',
  address: '인천광역시 연수구 송도과학로 32',
  phone: '032-555-1212',
  contacts: [],
  active: false,
  lastTradeAt: '',
  note: '여신 한도 초과 이력 있음 — 거래 재개 전 검토 필요.',
};

/** acc-1 을 accountId 로 가리키는 네 모듈의 행들 — 이름만 같은 행은 하나도 없다 */
const DEMO_RECORDS: DemoRecords = {
  contracts: [
    {
      id: 'ctr-1',
      title: '2026년 SaaS 연간 이용계약',
      contractType: 'license',
      startAt: '2026-01-01',
      endAt: '2026-12-31',
      amount: 36_000_000,
      status: 'active',
    },
  ],
  quotes: [
    {
      id: 'qt-1',
      quoteNo: 'Q-20260710-001',
      issueDate: '2026-07-10',
      total: 33_000_000,
      status: 'sent',
    },
  ],
  projects: [
    {
      id: 'prj-1',
      name: '한빛소프트 ERP 구축',
      stage: 'negotiation',
      expectedRevenue: 42_000_000,
      startAt: '2026-07-01',
      endAt: '2026-10-31',
    },
  ],
};

const EMPTY_RECORDS: DemoRecords = {
  contracts: [],
  quotes: [],
  projects: [],
};

/* ── 표 열 정의(역방향 조회 세 구획) ────────────────────────────────────────────────────────── */

const CONTRACT_COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '계약명' },
  { id: 'type', header: '유형', nowrap: true },
  { id: 'period', header: '계약기간', nowrap: true },
  { id: 'amount', header: '금액', align: 'end' },
  { id: 'status', header: '상태', nowrap: true },
];

const QUOTE_COLUMNS: TableProps['columns'] = [
  { id: 'quoteNo', header: '견적번호', nowrap: true },
  { id: 'issueDate', header: '견적일', nowrap: true },
  { id: 'total', header: '합계금액', align: 'end' },
  { id: 'status', header: '상태', nowrap: true },
];

const PROJECT_COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '프로젝트명' },
  { id: 'stage', header: '단계', nowrap: true },
  { id: 'revenue', header: '예상매출', align: 'end' },
  { id: 'period', header: '기간', nowrap: true },
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
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
  cursor: 'pointer',
};

const headRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  marginTop: cssVar('space.2'),
};

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 12), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
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

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 5) minmax(0, 1fr)`,
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

const numericStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const mutedTextStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const contactListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const contactItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
};

const contactNameStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  ...typography('typography.label.md'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const detailLinkStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.action.primary.default'),
  textDecoration: 'none',
};

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function DetailCard({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          {title}
        </h2>
        {children}
      </div>
    </Card>
  );
}

/** 역방향 조회 한 구획 — 실화면 RelatedRecordsCard 미러(세 상태를 뭉개지 않는다) */
function RelatedRecordsCard({
  title,
  entityLabel,
  columns,
  rows,
  loading = false,
  failed = false,
  emptyText,
}: {
  readonly title: string;
  readonly entityLabel: string;
  readonly columns: TableProps['columns'];
  readonly rows: TableProps['rows'];
  readonly loading?: boolean;
  readonly failed?: boolean;
  readonly emptyText: string;
}) {
  if (failed) {
    return (
      <DetailCard title={title}>
        <Alert tone="danger">
          <div style={alertRowStyle}>
            <span>{`${entityLabel} 이력을 불러오지 못했어요.`}</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      </DetailCard>
    );
  }

  return (
    <DetailCard title={title}>
      <Table
        caption={`이 거래처의 ${entityLabel} 목록 — 각 행의 링크로 해당 화면으로 이동해요.`}
        columns={columns}
        rows={rows}
        loading={loading}
        skeletonRows={2}
        empty={<p style={hintStyle}>{emptyText}</p>}
      />
    </DetailCard>
  );
}

/* ── 화면 ─────────────────────────────────────────────────────────────────────────────────── */

interface AccountDetailScreenProps {
  readonly account?: DemoAccount;
  readonly records?: DemoRecords;
  readonly loading?: boolean;
  /** 역방향 구획만 실패 — 거래처 본문은 멀쩡하다(구획이 자기 오류를 소유한다) */
  readonly recordsFailed?: boolean;
  /** 조회 실패의 종류 — 404 에는 '다시 시도'를 권하지 않는다(영원히 실패한다 · EXC-12) */
  readonly failure?: 'not-found' | 'error';
  readonly canUpdate?: boolean;
}

function AccountDetailScreen({
  account = DEMO_ACCOUNT,
  records = DEMO_RECORDS,
  loading = false,
  recordsFailed = false,
  failure,
  canUpdate = true,
}: AccountDetailScreenProps) {
  const backLink = (
    <button type="button" style={backLinkStyle}>
      <Icon name="chevron-left" />
      목록으로
    </button>
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
                ? '거래처를 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '거래처를 불러오지 못했어요.'}
            </span>
            <span style={actionsStyle}>
              {!notFound && <Button variant="secondary">다시 시도</Button>}
              <Button variant="secondary">목록으로</Button>
            </span>
          </div>
        </Alert>
      </div>
    );
  }

  const contractRows: TableProps['rows'] = records.contracts.map((contract) => ({
    id: contract.id,
    cells: [
      // 계약은 아직 읽기 전용 상세가 없다 — 유일한 조회 표면인 수정 폼으로 간다
      <a key="title" href="#contract-edit" style={detailLinkStyle}>
        {contract.title}
      </a>,
      CONTRACT_TYPE_LABEL[contract.contractType],
      <span key="period" style={mutedTextStyle}>
        {`${contract.startAt} ~ ${contract.endAt}`}
      </span>,
      <span key="amount" style={numericStyle}>
        {formatWon(contract.amount)}
      </span>,
      <StatusBadge
        key="status"
        tone={CONTRACT_STATUS_META[contract.status].tone}
        label={CONTRACT_STATUS_META[contract.status].label}
      />,
    ],
  }));

  const quoteRows: TableProps['rows'] = records.quotes.map((quote) => ({
    id: quote.id,
    cells: [
      <a key="quoteNo" href="#quote-detail" style={detailLinkStyle}>
        <span style={numericStyle}>{quote.quoteNo}</span>
      </a>,
      quote.issueDate,
      <span key="total" style={numericStyle}>
        {formatWon(quote.total)}
      </span>,
      <StatusBadge
        key="status"
        tone={QUOTE_STATUS_META[quote.status].tone}
        label={QUOTE_STATUS_META[quote.status].label}
      />,
    ],
  }));

  const projectRows: TableProps['rows'] = records.projects.map((project) => ({
    id: project.id,
    cells: [
      // 프로젝트도 상세가 없어 수정 폼이 유일한 조회 표면이다
      <a key="name" href="#project-edit" style={detailLinkStyle}>
        {project.name}
      </a>,
      <StatusBadge
        key="stage"
        tone={STAGE_META[project.stage].tone}
        label={STAGE_META[project.stage].label}
      />,
      <span key="revenue" style={numericStyle}>
        {formatWon(project.expectedRevenue)}
      </span>,
      <span key="period" style={mutedTextStyle}>
        {`${project.startAt} ~ ${project.endAt}`}
      </span>,
    ],
  }));

  return (
    <div style={pageStyle}>
      {backLink}

      <div style={headRowStyle}>
        <div>
          <h1 style={pageTitleStyle}>{account.name}</h1>
          <div style={badgeRowStyle}>
            <StatusBadge
              tone={TRADE_TYPE_TONE[account.tradeType]}
              label={TRADE_TYPE_LABEL[account.tradeType]}
            />
            <StatusBadge
              tone={CREDIT_GRADE_TONE[account.creditGrade]}
              label={`신용 ${CREDIT_GRADE_LABEL[account.creditGrade]}`}
            />
            <StatusBadge
              tone={account.active ? 'success' : 'neutral'}
              label={account.active ? '거래중' : '거래중지'}
            />
          </div>
        </div>
        {/* 이 화면은 읽기 전용이다 — 고치는 길은 이 버튼 하나뿐이고, 권한이 없으면 없다 (EXC-03) */}
        {canUpdate && (
          <Button variant="primary" size="md">
            거래처 수정
          </Button>
        )}
      </div>

      <div style={gridStyle}>
        <DetailCard title="기본 정보">
          <dl style={dlStyle}>
            <dt style={dtStyle}>상호</dt>
            <dd style={ddStyle}>{account.name}</dd>
            <dt style={dtStyle}>사업자등록번호</dt>
            <dd style={{ ...ddStyle, ...numericStyle }}>{dash(account.bizNo)}</dd>
            <dt style={dtStyle}>대표자</dt>
            <dd style={ddStyle}>{dash(account.ceoName)}</dd>
            <dt style={dtStyle}>업태 · 종목</dt>
            <dd style={ddStyle}>{`${dash(account.bizType)} · ${dash(account.bizItem)}`}</dd>
            <dt style={dtStyle}>주소</dt>
            <dd style={ddStyle}>{dash(account.address)}</dd>
            <dt style={dtStyle}>대표전화</dt>
            <dd style={ddStyle}>{dash(account.phone)}</dd>
            <dt style={dtStyle}>최근거래</dt>
            <dd style={ddStyle}>{dash(account.lastTradeAt)}</dd>
            <dt style={dtStyle}>비고</dt>
            <dd style={ddStyle}>{dash(account.note)}</dd>
          </dl>
        </DetailCard>

        <DetailCard title="거래 조건 · 신용">
          <dl style={dlStyle}>
            <dt style={dtStyle}>거래유형</dt>
            <dd style={ddStyle}>{TRADE_TYPE_LABEL[account.tradeType]}</dd>
            <dt style={dtStyle}>과세유형</dt>
            <dd style={ddStyle}>{TAX_TYPE_LABEL[account.taxType]}</dd>
            <dt style={dtStyle}>여신한도</dt>
            <dd style={{ ...ddStyle, ...numericStyle }}>
              {/* 0 은 '한도 없음' 이 아니라 '아직 정하지 않음' 이다 */}
              {account.creditLimit === 0 ? '미설정' : formatWon(account.creditLimit)}
            </dd>
            <dt style={dtStyle}>결제조건</dt>
            <dd style={ddStyle}>{PAYMENT_TERM_LABEL[account.paymentTerm]}</dd>
            <dt style={dtStyle}>신용등급</dt>
            <dd style={ddStyle}>
              <StatusBadge
                tone={CREDIT_GRADE_TONE[account.creditGrade]}
                label={CREDIT_GRADE_LABEL[account.creditGrade]}
              />
            </dd>
          </dl>
        </DetailCard>
      </div>

      <DetailCard title="담당자">
        {account.contacts.length === 0 ? (
          <p style={hintStyle}>등록된 담당자가 없어요.</p>
        ) : (
          <ul style={contactListStyle}>
            {account.contacts.map((contact) => (
              <li key={contact.id} style={contactItemStyle}>
                <span style={contactNameStyle}>
                  <span>{contact.name}</span>
                  {contact.primary && <StatusBadge tone="info" label="대표담당" />}
                  <span style={mutedTextStyle}>
                    {`${dash(contact.department)} · ${dash(contact.position)}`}
                  </span>
                </span>
                <span style={mutedTextStyle}>
                  {`${dash(contact.phone)} · ${dash(contact.email)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DetailCard>

      {/* ── 역방향 조회 — 이 거래처가 등장하는 네 모듈(이 화면이 생긴 이유) ─────────────── */}
      <RelatedRecordsCard
        title="이 거래처의 계약"
        entityLabel="계약"
        columns={CONTRACT_COLUMNS}
        rows={contractRows}
        loading={loading}
        failed={recordsFailed}
        emptyText="이 거래처로 체결된 계약이 없어요."
      />

      <RelatedRecordsCard
        title="이 거래처의 견적"
        entityLabel="견적"
        columns={QUOTE_COLUMNS}
        rows={quoteRows}
        loading={loading}
        emptyText="이 거래처로 발행된 견적이 없어요."
      />

      <RelatedRecordsCard
        title="이 거래처의 프로젝트"
        entityLabel="프로젝트"
        columns={PROJECT_COLUMNS}
        rows={projectRows}
        loading={loading}
        emptyText="이 거래처로 진행 중인 영업 기회가 없어요."
      />

      <div style={actionsStyle}>
        <Button variant="secondary">목록으로</Button>
      </div>
    </div>
  );
}

/** 정상: 거래 중인 거래처 — 기본 정보·거래 조건·담당자 + 네 구획의 역방향 이력이 모두 찬 상태 */
export const Default: Story = {
  render: () => <AccountDetailScreen />,
};

/** 최초 로드: 네 구획의 표만 스켈레톤 — 거래처 본문은 이미 도착해 있다(STATE-01) */
export const Loading: Story = {
  render: () => <AccountDetailScreen loading records={EMPTY_RECORDS} />,
};

/** 빈 이력: 거래중지 · 담당자 없음 · 네 구획 모두 '아직 없습니다' — 여신한도 0 은 '미설정' 이다 */
export const Empty: Story = {
  render: () => <AccountDetailScreen account={DEMO_QUIET_ACCOUNT} records={EMPTY_RECORDS} />,
};

/** 구획 조회 실패: 계약 이력만 못 불러왔다 — '없다' 가 아니라 '못 불러왔다' 로 말하고 재시도를 준다 */
export const RelatedLoadFailed: Story = {
  render: () => <AccountDetailScreen recordsFailed />,
};

/** 404: 이미 삭제된 거래처 — '다시 시도'를 권하지 않고 목록으로만 돌려보낸다 (EXC-12) */
export const NotFound: Story = {
  render: () => <AccountDetailScreen failure="not-found" />,
};
