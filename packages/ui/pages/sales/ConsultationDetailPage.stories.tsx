/**
 * Design System/Templates/Sales/Consultation Detail — 상담 이력 상세 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹에서 확정된다(화면 en = Consultations).
 *
 * 대응 실화면: apps/admin/src/pages/sales/consultations/ConsultationDetailPage.tsx
 * (라우트 /sales/consultations/:id). 감사 이력이라 **읽기 전용**이다 — 수정/삭제 없이 조회만 한다.
 * 논리 카드 3장(상담 정보 · 상담 내용 · 후속조치) + 목록 복귀 액션으로 구성된다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기 버튼               → Button(ghost) + Icon(chevron-left)
 *   페이지 제목                → 토큰만 쓴 <h1>(title.xl)
 *   카드 표면                  → Card (제목 <h2>·<h3> 은 토큰만으로 조립 — CardTitle 은 DS 부재)
 *   상태·유형·대기 배지         → StatusBadge
 *   정보 나열(dl/dt/dd)         → 토큰만 쓴 dl 그리드
 *   조회 실패                  → Alert(danger) + 목록 복귀 Button
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId } from 'react';

import { Alert, Button, Card, Icon, StatusBadge, cssVar, typography } from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Consultation Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 모델 · 순수 규칙(실화면 consultations/types.ts 미러) ───────────────────────────────── */

type ConsultType = 'phone' | 'visit' | 'email' | 'video' | 'meeting';
type ConsultOutcome = 'positive' | 'neutral' | 'negative';

interface Consultation {
  readonly id: string;
  readonly accountName: string;
  readonly contactPerson: string;
  readonly consultType: ConsultType;
  readonly topic: string;
  readonly consultedAt: string;
  readonly consultant: string;
  readonly content: string;
  readonly outcome: ConsultOutcome;
  readonly followUpAction: string;
  readonly followUpAt: string;
  readonly followUpDone: boolean;
  readonly related: string;
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

const consultOutcomeTone = (outcome: ConsultOutcome): StatusBadgeTone => {
  if (outcome === 'positive') return 'success';
  if (outcome === 'negative') return 'danger';
  return 'neutral';
};

const hasPendingFollowUp = (item: Consultation): boolean =>
  item.followUpAction.trim() !== '' && !item.followUpDone;

const formatDateTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

/* ── 데모 데이터(실화면 시드 cs-1 을 대표값으로 인라인) ──────────────────────────────────────── */

/** 후속조치 대기가 걸린 상담 — Default 스토리 */
const CONSULT_PENDING: Consultation = {
  id: 'cs-1',
  accountName: '(주)한빛소프트웨어',
  contactPerson: '이영업 팀장',
  consultType: 'meeting',
  topic: 'ERP 구축 범위 협의',
  consultedAt: '2026-07-14T15:00:00',
  consultant: '이영업',
  content:
    '구축 범위·일정·라이선스 규모를 협의함. 100석 기준으로 견적 요청받음.\n다음 미팅 전까지 구축 일정표 초안을 공유하기로 함.',
  outcome: 'positive',
  followUpAction: '견적서 발송 및 구축 일정표 공유',
  followUpAt: '2026-07-18',
  followUpDone: false,
  related: '견적 Q-20260710-001',
};

/** 후속조치가 없는(완료된) 상담 — NoFollowUp 스토리 */
const CONSULT_DONE: Consultation = {
  id: 'cs-3',
  accountName: '미래테크놀로지',
  contactPerson: '오미래 대표',
  consultType: 'visit',
  topic: '납품 지연 클레임 대면 사과',
  consultedAt: '2026-07-11T13:00:00',
  consultant: '박계약',
  content: '납기 지연 경위를 설명하고 보상안(차기 발주 할인)을 제시함. 고객 수용.',
  outcome: 'positive',
  followUpAction: '',
  followUpAt: '',
  followUpDone: true,
  related: '',
};

/* ── 스타일(토큰만) ───────────────────────────────────────────────────────────────────────── */

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
  alignSelf: 'flex-start',
};

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.xl'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const badgeRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(0, max-content) minmax(0, 1fr)`,
  columnGap: cssVar('space.4'),
  rowGap: cssVar('space.3'),
  margin: 0,
};

const dtStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.muted'),
};

const ddStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  margin: 0,
  overflowWrap: 'anywhere',
};

const bodyTextStyle: CSSProperties = {
  ...typography('typography.body.md'),
  margin: 0,
  color: cssVar('color.text.default'),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
};

const mutedBodyStyle: CSSProperties = {
  ...bodyTextStyle,
  color: cssVar('color.text.muted'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목은 토큰만으로 조립하고 aria 로 잇는다) ──────────── */

function DetailCard({
  title,
  extra,
  children,
}: {
  title: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <div style={cardTitleRowStyle}>
          <h2 id={titleId} style={cardTitleStyle}>
            {title}
          </h2>
          {extra}
        </div>
        {children}
      </div>
    </Card>
  );
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt style={dtStyle}>{label}</dt>
      <dd style={ddStyle}>{children}</dd>
    </>
  );
}

/* ── 제어형 화면 ─────────────────────────────────────────────────────────────────────────── */

interface ConsultationDetailScreenProps {
  readonly consultation?: Consultation;
  /** 조회 중 — 카드 자리에 '불러오는 중…' */
  readonly loading?: boolean;
  /** 조회 실패 — Alert(danger) */
  readonly error?: boolean;
}

function ConsultationDetailScreen({
  consultation = CONSULT_PENDING,
  loading = false,
  error = false,
}: ConsultationDetailScreenProps) {
  const backButton = (
    <div style={backLinkStyle}>
      <Button variant="ghost" iconLeft={<Icon name="chevron-left" />}>
        목록으로
      </Button>
    </div>
  );

  if (error) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>상담 이력을 불러오지 못했습니다. </span>
          <Button variant="secondary">목록으로</Button>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {backButton}

      <h1 style={pageTitleStyle}>상담 이력</h1>

      {loading ? (
        <Card>
          <p style={mutedBodyStyle}>불러오는 중…</p>
        </Card>
      ) : (
        <>
          <DetailCard
            title={consultation.topic}
            extra={
              <StatusBadge
                tone={consultOutcomeTone(consultation.outcome)}
                label={CONSULT_OUTCOME_LABEL[consultation.outcome]}
              />
            }
          >
            <div style={badgeRowStyle}>
              <StatusBadge tone="info" label={CONSULT_TYPE_LABEL[consultation.consultType]} />
              {hasPendingFollowUp(consultation) && (
                <StatusBadge tone="warning" label="후속조치 대기" />
              )}
            </div>

            <dl style={dlStyle}>
              <InfoRow label="거래처">{consultation.accountName}</InfoRow>
              <InfoRow label="상담 대상자">{consultation.contactPerson}</InfoRow>
              <InfoRow label="상담일시">{formatDateTime(consultation.consultedAt)}</InfoRow>
              <InfoRow label="상담 담당자">{consultation.consultant}</InfoRow>
              <InfoRow label="관련">
                {consultation.related === '' ? '—' : consultation.related}
              </InfoRow>
            </dl>
          </DetailCard>

          <DetailCard title="상담 내용">
            <p style={bodyTextStyle}>{consultation.content}</p>
          </DetailCard>

          <DetailCard title="후속조치">
            {consultation.followUpAction === '' ? (
              <p style={mutedBodyStyle}>등록된 후속조치가 없습니다.</p>
            ) : (
              <dl style={dlStyle}>
                <InfoRow label="조치 내용">{consultation.followUpAction}</InfoRow>
                <InfoRow label="예정일">
                  {consultation.followUpAt === '' ? '—' : consultation.followUpAt}
                </InfoRow>
                <InfoRow label="완료 여부">
                  <StatusBadge
                    tone={consultation.followUpDone ? 'success' : 'warning'}
                    label={consultation.followUpDone ? '완료' : '대기'}
                  />
                </InfoRow>
              </dl>
            )}
          </DetailCard>

          <div style={actionsStyle}>
            <Button variant="secondary">목록으로</Button>
          </div>
        </>
      )}
    </div>
  );
}

/** 정상: 후속조치가 걸린 상담 상세(정보·내용·후속조치 3카드 모두 채워짐) */
export const Default: Story = {
  render: () => <ConsultationDetailScreen />,
};

/** 로딩: 상세 조회 중 — 카드 자리에 '불러오는 중…' */
export const Loading: Story = {
  render: () => <ConsultationDetailScreen loading />,
};

/** 후속조치 없음: 완료된 상담 — 후속조치 카드가 '등록된 후속조치가 없습니다'로 비워진다 */
export const NoFollowUp: Story = {
  render: () => <ConsultationDetailScreen consultation={CONSULT_DONE} />,
};

/** 조회 실패: fetchOne 오류 — Alert(danger) + 목록 복귀(EXC 계열) */
export const Error: Story = {
  render: () => <ConsultationDetailScreen error />,
};
