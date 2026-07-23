/**
 * Design System/Templates/Content/Terms Detail — 약관 버전 상세(전문) 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/terms` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en = "Terms"
 * (packages/ui/pages/_data/pages.ts 의 Content 그룹 — 상세는 그 화면의 `:id` 라우트다).
 *
 * 대응 실화면: apps/admin/src/pages/content/terms/TermsDetailPage.tsx (라우트 /content/terms/:id).
 * 목록이 문서 전문을 쏟지 않기 때문에 이 화면이 존재한다 — 버전 행을 눌러 여기서 전문을 읽는다.
 * **읽기 전용 뷰 + 상단 액션(수정 → 폼 / 삭제 → 확인 다이얼로그)** 이 전부이고, 본문은 서식 없는
 * 조문 텍스트라 `white-space: pre-wrap` 으로 원문 줄바꿈을 그대로 보존한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CardTitle(앱)           → Card + 토큰만 쓴 <h2>(title.md) + aria-labelledby
 *   dlStyle·dtStyle·ddStyle → 토큰만 쓴 정의 목록 스타일
 *   목록으로 버튼(라우팅)     → Button(secondary) + Icon(chevron-left)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로                 → Button(secondary) + Icon(chevron-left)
 *   수정 / 삭제 상단 액션     → Button(secondary) · Button(danger)
 *   버전 제목 + 현재/상태 배지 → StatusBadge ×2 (현재=info / 시행중·시행예정·만료)
 *   시행일 요약              → 토큰만 쓴 <dl>/<dt>/<dd>
 *   전문 본문                → 토큰만 쓴 <p>(body.md · pre-wrap)
 *   조회 중 스켈레톤          → Card + Skeleton ×5
 *   조회 실패                → Alert(danger) + 다시 시도 · 목록으로 Button
 *   삭제 확인                → ConfirmDialog(intent=delete)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  Icon,
  Skeleton,
  StatusBadge,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/Terms Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 content/terms/types.ts 미러 — 레이어 경계라 값으로 복사) ─────────────── */

type TermsStatus = 'active' | 'scheduled' | 'archived';

const STATUS_LABEL: Record<TermsStatus, string> = {
  active: '시행중',
  scheduled: '시행예정',
  archived: '만료',
};

const STATUS_TONE: Record<TermsStatus, StatusBadgeTone> = {
  active: 'success',
  scheduled: 'info',
  archived: 'neutral',
};

/** 현재 시행본인가 — 상태가 '시행중'인 버전 (실화면 isCurrent 미러) */
const isCurrent = (status: TermsStatus): boolean => status === 'active';

/* ── 데모 데이터(실화면 TermsVersion 픽스처 service-v1.1 미러) ──────────────────────────────── */

interface DemoTermsVersion {
  readonly id: string;
  readonly typeLabel: string;
  readonly version: string;
  readonly effectiveDate: string;
  readonly status: TermsStatus;
  readonly body: string;
}

const CURRENT_VERSION: DemoTermsVersion = {
  id: 'service-v1.1',
  typeLabel: '이용약관',
  version: 'v1.1',
  effectiveDate: '2025-01-01',
  status: 'active',
  body: [
    '이용약관 v1.1',
    '',
    '제1조(목적) 이 약관은 회사가 제공하는 서비스의 이용 조건 및 절차, 회사와 회원의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.',
    '',
    '제2조(용어의 정의) 이 약관에서 사용하는 용어의 정의는 다음과 같습니다.',
    '  1. "회원"이란 이 약관에 동의하고 서비스 이용계약을 체결한 자를 말합니다.',
    '  2. "계정"이란 회원의 식별과 서비스 이용을 위하여 회원이 정하고 회사가 승인한 문자와 숫자의 조합을 말합니다.',
    '',
    '제3조(약관의 효력 및 변경) 회사는 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있으며, 변경 시 적용일자와 변경사유를 명시하여 시행일 7일 전부터 공지합니다.',
    '',
    '제4조(서비스의 제공 및 중단) 회사는 연중무휴 1일 24시간 서비스를 제공함을 원칙으로 하되, 설비 점검·교체 등 운영상 필요한 경우 서비스의 전부 또는 일부를 일시 중단할 수 있습니다.',
  ].join('\n'),
};

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

const topRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  gap: cssVar('space.2'),
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const titleGroupStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.md'),
};

const typeLabelStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
};

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `calc(${cssVar('space.6')} * 3) minmax(0, 1fr)`,
  gap: cssVar('space.2'),
  margin: 0,
};

const dtStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
};

const ddStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  fontVariantNumeric: 'tabular-nums',
  ...typography('typography.label.md'),
};

const bodyTextStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  ...typography('typography.body.md'),
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface TermsDetailScreenProps {
  /** 상세 조회 중 — 실화면 스켈레톤 조건은 `data === undefined` 하나뿐이다(STATE-01) */
  readonly loading?: boolean;
  /** 조회 실패 — 인라인 Alert 로 갈린다 */
  readonly failed?: boolean;
  /** 삭제 확인 다이얼로그를 연 채로 시작한다 */
  readonly confirmingDelete?: boolean;
  readonly version?: DemoTermsVersion;
}

function TermsDetailScreen({
  loading = false,
  failed = false,
  confirmingDelete = false,
  version = CURRENT_VERSION,
}: TermsDetailScreenProps) {
  const [confirming, setConfirming] = useState(confirmingDelete);
  const titleId = useId();
  const loaded = !loading && !failed;

  return (
    <div style={pageStyle}>
      <div style={topRowStyle}>
        <Button variant="secondary" size="md" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>

        {loaded && (
          <div style={actionsStyle}>
            <Button variant="secondary">수정</Button>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              삭제
            </Button>
          </div>
        )}
      </div>

      {failed ? (
        <Alert tone="danger">
          <div style={topRowStyle}>
            <span>약관 버전을 불러오지 못했어요.</span>
            <span style={actionsStyle}>
              <Button variant="secondary">다시 시도</Button>
              <Button variant="secondary">목록으로</Button>
            </span>
          </div>
        </Alert>
      ) : loading ? (
        <Card>
          <div style={skeletonBodyStyle} aria-busy="true">
            {[0, 1, 2, 3, 4].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </Card>
      ) : (
        <section aria-labelledby={titleId}>
          <Card>
            <div style={cardBodyStyle}>
              <h2 id={titleId} style={titleGroupStyle}>
                <span style={typeLabelStyle}>{version.typeLabel}</span>
                {version.version}
                {isCurrent(version.status) && <StatusBadge tone="info" label="현재" />}
                <StatusBadge
                  tone={STATUS_TONE[version.status]}
                  label={STATUS_LABEL[version.status]}
                />
              </h2>

              <dl style={dlStyle}>
                <dt style={dtStyle}>시행일</dt>
                <dd style={ddStyle}>{version.effectiveDate}</dd>
              </dl>

              <p style={bodyTextStyle}>{version.body}</p>
            </div>
          </Card>
        </section>
      )}

      {confirming && loaded && (
        <ConfirmDialog
          intent="delete"
          title="약관 버전 삭제"
          message={`${version.version} 버전을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="버전 삭제"
          onConfirm={() => setConfirming(false)}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

/** 정상: 현재 시행 중인 이용약관 v1.1 전문 — '현재' + '시행중' 배지가 함께 붙는다 */
export const Default: Story = {
  render: () => <TermsDetailScreen />,
};

/** 시행예정: 아직 시행되지 않은 v2.0 — '현재' 배지가 없고 상태만 '시행예정'이다 */
export const Scheduled: Story = {
  render: () => (
    <TermsDetailScreen
      version={{
        id: 'service-v2.0',
        typeLabel: '이용약관',
        version: 'v2.0',
        effectiveDate: '2027-01-01',
        status: 'scheduled',
        body: CURRENT_VERSION.body.replace('v1.1', 'v2.0'),
      }}
    />
  ),
};

/** 로딩: 전문 조회 중 카드 본문 스켈레톤 — 상단 수정/삭제 액션은 아직 뜨지 않는다 */
export const Loading: Story = {
  render: () => <TermsDetailScreen loading />,
};

/** 삭제 확인: 상단 삭제를 누른 직후 — ConfirmDialog(intent=delete) */
export const DeleteConfirm: Story = {
  render: () => <TermsDetailScreen confirmingDelete />,
};

/** 에러: 전문 조회 실패 — Alert(danger) + 다시 시도 · 목록으로 */
export const Error: Story = {
  render: () => <TermsDetailScreen failed />,
};
