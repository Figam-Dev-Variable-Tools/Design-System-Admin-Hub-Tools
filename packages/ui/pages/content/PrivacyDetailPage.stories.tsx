/**
 * Design System/Templates/Content/Privacy Detail — 처리방침 버전 상세(전문) 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/privacy` → 메뉴 en = "Content"(콘텐츠 관리),
 * 화면 en = "Privacy Policy" (packages/ui/pages/_data/pages.ts 의 Content 그룹 — 상세는 `:id` 라우트).
 *
 * 대응 실화면: apps/admin/src/pages/content/privacy/PrivacyDetailPage.tsx (라우트 /content/privacy/:id).
 * 약관 상세와 같은 결이되 **단일 문서**라 상단에 문서 종류 표기가 없다. 목록이 전문을 쏟지 않기
 * 때문에 이 화면이 존재한다 — 버전 행을 눌러 여기서 전문을 읽는다. 읽기 전용 뷰 + 상단 액션
 * (수정 → 폼 / 삭제 → 확인 다이얼로그) 이 전부이고, 본문은 서식 없는 조문 텍스트라
 * `white-space: pre-wrap` 으로 원문 줄바꿈을 그대로 보존한다.
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
  title: 'Design System/Templates/Content/Privacy Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 content/privacy/types.ts 미러 — 레이어 경계라 값으로 복사) ───────────── */

type PrivacyStatus = 'active' | 'scheduled' | 'archived';

const STATUS_LABEL: Record<PrivacyStatus, string> = {
  active: '시행중',
  scheduled: '시행예정',
  archived: '만료',
};

const STATUS_TONE: Record<PrivacyStatus, StatusBadgeTone> = {
  active: 'success',
  scheduled: 'info',
  archived: 'neutral',
};

/** 현재 시행본인가 — 상태가 '시행중'인 버전 (실화면 isCurrent 미러) */
const isCurrent = (status: PrivacyStatus): boolean => status === 'active';

/* ── 데모 데이터(실화면 PrivacyVersion 픽스처 privacy-v2.0 미러) ───────────────────────────── */

interface DemoPrivacyVersion {
  readonly id: string;
  readonly version: string;
  readonly effectiveDate: string;
  readonly status: PrivacyStatus;
  readonly body: string;
}

const CURRENT_VERSION: DemoPrivacyVersion = {
  id: 'privacy-v2.0',
  version: 'v2.0',
  effectiveDate: '2025-03-01',
  status: 'active',
  body: [
    '개인정보 처리방침 v2.0',
    '',
    '1. 개인정보의 처리 목적: 회사는 회원 가입 및 관리, 서비스 제공, 고충처리 등의 목적으로 개인정보를 처리합니다.',
    '',
    '2. 개인정보의 처리 및 보유 기간: 법령에 따른 보유·이용 기간 내에서 처리하며, 목적이 달성되면 지체 없이 파기합니다.',
    '   - 회원 가입 및 관리: 회원 탈퇴 시까지',
    '   - 전자상거래 기록: 관계 법령이 정한 기간(5년)',
    '',
    '3. 개인정보의 제3자 제공: 회사는 정보주체의 동의, 법률의 특별한 규정 등 관련 법령에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.',
    '',
    '4. 정보주체의 권리·의무 및 행사 방법: 정보주체는 언제든지 개인정보 열람·정정·삭제·처리정지를 요구할 수 있습니다.',
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

interface PrivacyDetailScreenProps {
  /** 상세 조회 중 — 실화면 스켈레톤 조건은 `data === undefined` 하나뿐이다(STATE-01) */
  readonly loading?: boolean;
  /** 조회 실패 — 인라인 Alert 로 갈린다 */
  readonly failed?: boolean;
  /** 삭제 확인 다이얼로그를 연 채로 시작한다 */
  readonly confirmingDelete?: boolean;
  readonly version?: DemoPrivacyVersion;
}

function PrivacyDetailScreen({
  loading = false,
  failed = false,
  confirmingDelete = false,
  version = CURRENT_VERSION,
}: PrivacyDetailScreenProps) {
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
            <span>처리방침 버전을 불러오지 못했어요.</span>
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
          title="처리방침 버전 삭제"
          message={`${version.version} 버전을 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="버전 삭제"
          onConfirm={() => setConfirming(false)}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}

/** 정상: 현재 시행 중인 처리방침 v2.0 전문 — '현재' + '시행중' 배지가 함께 붙는다 */
export const Default: Story = {
  render: () => <PrivacyDetailScreen />,
};

/** 만료: 지난 버전 v1.1 — '현재' 배지가 없고 상태만 '만료'다(이력 열람용) */
export const Archived: Story = {
  render: () => (
    <PrivacyDetailScreen
      version={{
        id: 'privacy-v1.1',
        version: 'v1.1',
        effectiveDate: '2024-06-01',
        status: 'archived',
        body: CURRENT_VERSION.body.replace('v2.0', 'v1.1'),
      }}
    />
  ),
};

/** 로딩: 전문 조회 중 카드 본문 스켈레톤 — 상단 수정/삭제 액션은 아직 뜨지 않는다 */
export const Loading: Story = {
  render: () => <PrivacyDetailScreen loading />,
};

/** 삭제 확인: 상단 삭제를 누른 직후 — ConfirmDialog(intent=delete) */
export const DeleteConfirm: Story = {
  render: () => <PrivacyDetailScreen confirmingDelete />,
};

/** 에러: 전문 조회 실패 — Alert(danger) + 다시 시도 · 목록으로 */
export const Error: Story = {
  render: () => <PrivacyDetailScreen failed />,
};
