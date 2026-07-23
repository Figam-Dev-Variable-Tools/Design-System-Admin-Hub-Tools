/**
 * Design System/Templates/Marketing/Message Template Detail — 메시지 템플릿 상세 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/marketing/templates/:id` → 메뉴 en = "Marketing"(마케팅 관리),
 * 화면 en = "Templates" (packages/ui/pages/_data/pages.ts 의 Marketing 그룹
 * `['/marketing/templates', '발송 템플릿 관리', 'Templates']` 의 상세 화면).
 *
 * 대응 실화면: apps/admin/src/pages/marketing/message-templates/MessageTemplateDetailPage.tsx
 * (라우트 /marketing/templates/:id). **읽기 전용 3단**이다: 좌(발신 프로필 · 잠김) / 중앙(상태 이력 표)
 * / 우(종류별 미리보기).
 *
 * [헤더 액션이 상태마다 통째로 갈린다] 규칙의 정본은 실화면 status.ts 의 actionsFor 다:
 *   active   → [사용 여부 토글 ON] [삭제]        — 지금 발송에 쓰이는 문구라 수정이 없다(먼저 꺼야 한다)
 *   inactive → [사용 여부 토글 OFF] [삭제] [수정]
 *   draft    → [삭제] [수정] [발행]
 * 상태 변경이 저장(update)이 아니라 별도 호출인 이유도 같다 — 이 화면에는 편집 폼이 없어서, 토글
 * 하나를 켜려고 본문 전체를 되보내면 그 사이 다른 관리자가 고친 본문을 옛 값으로 덮어쓴다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면의 앱 조각을 DS 표면으로 갈음한다:
 *   SenderProfileCard(잠김) → Card + FormField + SelectField(disabled)
 *   TextPreviewCard         → Card + 토큰만 쓴 휴대폰 프레임 + StatusBadge(등급)
 *   상태 이력 dl/dt/dd       → 토큰만 쓴 로컬 레이아웃(신규 DS 컴포넌트 아님)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로                  → Button(ghost) + Icon(chevron-left)
 *   눈썹 + 제목               → 토큰 <span>(label.sm) + <h1>(title.xl)
 *   사용 여부 토글            → ToggleSwitch (보이는 라벨 없이 접근성 이름만)
 *   삭제 / 수정 / 발행         → Button(danger·secondary·primary) + Icon(trash)
 *   발신 프로필(잠김)          → Card + FormField + SelectField(disabled)
 *   상태 이력 표              → Card + dl/dt/dd + StatusBadge(발행 상태)
 *   미리보기                  → Card + 토큰 프레임 + StatusBadge(SMS/LMS/MMS)
 *   조회 실패                 → Alert(danger) + Button(secondary)
 *   로딩                     → Card + Skeleton
 *   삭제 확인                 → ConfirmDialog(intent=delete)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Alert,
  Button,
  Card,
  ConfirmDialog,
  FormField,
  Icon,
  SelectField,
  Skeleton,
  StatusBadge,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Marketing/Message Template Detail',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 types · status · copy 미러) ────────────────────────────────────────── */

type TemplateStatus = 'draft' | 'active' | 'inactive';

const TEMPLATE_STATUS_LABEL: Record<TemplateStatus, string> = {
  draft: '초안',
  active: '사용중',
  inactive: '미사용',
};

const STATUS_TONE: Record<TemplateStatus, StatusBadgeTone> = {
  draft: 'info',
  active: 'success',
  inactive: 'neutral',
};

/** 상세 헤더가 그릴 액션 — 상태마다 통째로 갈린다(실화면 actionsFor 미러) */
interface TemplateActions {
  readonly canToggleActive: boolean;
  readonly canEdit: boolean;
  readonly canPublish: boolean;
  readonly canDelete: boolean;
}

const actionsFor = (status: TemplateStatus): TemplateActions => ({
  // 발행된 것만 켜고 끈다 — 초안에 토글을 걸면 '발행하지 않고 켠' 상태가 생긴다
  canToggleActive: status !== 'draft',
  // 켜져 있는 템플릿은 지금 발송에 쓰이는 문구다 — 고치려면 먼저 꺼야 한다
  canEdit: status !== 'active',
  canPublish: status === 'draft',
  canDelete: true,
});

/** 문자 등급 — 제목을 한 글자라도 적으면 90byte 안이어도 LMS 로 승격된다 */
type SmsKind = 'sms' | 'lms' | 'mms';

const SMS_KIND_LABEL: Record<SmsKind, string> = { sms: 'SMS', lms: 'LMS', mms: 'MMS' };

const SMS_PROMOTION_THRESHOLD = 90;

const byteLengthOf = (text: string): number =>
  [...text].reduce((sum, char) => sum + ((char.codePointAt(0) ?? 0) > 0x7f ? 2 : 1), 0);

const classifySms = (bytes: number, hasImage: boolean, hasSubject: boolean): SmsKind => {
  if (hasImage) return 'mms';
  return bytes <= SMS_PROMOTION_THRESHOLD && !hasSubject ? 'sms' : 'lms';
};

/* ── 데모 데이터(실화면 store 픽스처 mt-text-* 를 상세가 쓰는 필드만 미러) ─────────────────── */

interface DemoTemplateDetail {
  readonly id: string;
  readonly name: string;
  readonly status: TemplateStatus;
  readonly senderProfileName: string;
  readonly senderPhone: string;
  /** 문자 발송 대행사 — 상세의 '문자 발송사'. 계약된 회선이 어디인지 보여 준다 */
  readonly vendor: string;
  /** 제목 — LMS/MMS 만 갖는다. SMS 에는 제목 필드 자체가 없다 */
  readonly subject: string;
  readonly body: string;
  readonly imageFileName: string;
  readonly createdBy: string;
  readonly createdAt: string;
  readonly lastEditedBy: string;
  readonly lastEditedAt: string;
}

const ACTIVE_TEMPLATE: DemoTemplateDetail = {
  id: 'mt-text-active',
  name: '주문 완료 안내',
  status: 'active',
  senderProfileName: '스페이스플래닝 대표',
  senderPhone: '1588-1234',
  vendor: 'SureM',
  subject: '',
  body: '#{이름}님, 주문(#{주문번호})이 정상 접수되었습니다.\n배송 시작 시 다시 안내드리겠습니다.',
  imageFileName: '',
  createdBy: '홍성보',
  createdAt: '2026-05-02T09:12',
  lastEditedBy: '홍성보',
  lastEditedAt: '2026-07-02T14:30',
};

const DRAFT_TEMPLATE: DemoTemplateDetail = {
  id: 'mt-text-draft',
  name: '여름 시즌 프리뷰(작성 중)',
  status: 'draft',
  senderProfileName: '마케팅센터',
  senderPhone: '070-1234-5678',
  vendor: 'Solapi',
  // 본문은 90byte 안이지만 제목이 있어 LMS 로 승격된다 — 승격 사유가 길이가 아닌 픽스처
  subject: '여름 신상 예고',
  body: '(광고) #{이름}님, 여름 시즌 신상품이 곧 공개됩니다.',
  imageFileName: '',
  createdBy: '김다연',
  createdAt: '2026-07-14T16:05',
  lastEditedBy: '김다연',
  lastEditedAt: '2026-07-16T09:40',
};

const INACTIVE_TEMPLATE: DemoTemplateDetail = {
  id: 'mt-text-inactive',
  name: '봄맞이 쿠폰 안내(종료)',
  status: 'inactive',
  senderProfileName: '마케팅센터',
  senderPhone: '02-577-1000',
  vendor: 'NHN',
  subject: '봄맞이 쿠폰 도착',
  body: '(광고) #{이름}님, 봄맞이 #{쿠폰명} 쿠폰이 도착했습니다. 무료수신거부 080-123-4567',
  imageFileName: 'spring-coupon.jpg',
  createdBy: '김다연',
  createdAt: '2026-03-04T10:00',
  lastEditedBy: '김다연',
  lastEditedAt: '2026-06-01T11:20',
};

/** 발신 프로필 후보 — 실화면 listSenderProfiles(운영진 그룹 중 발신 자격이 있는 것) 미러 */
const SENDER_PROFILES: readonly string[] = ['스페이스플래닝 대표', '마케팅센터', '고객지원센터'];

const ENTITY_LABEL = '메시지 템플릿';

const formatDateTime = (value: string): string => value.replace('T', ' ');

/* ── 스타일(토큰·rem·% 만) ────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backRowStyle: CSSProperties = { alignSelf: 'flex-start' };

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const titleColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const eyebrowStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
};

const titleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
  overflowWrap: 'anywhere',
};

const headerActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/**
 * 3단 배치 — grid 의 균등 분할 대신 flex 를 쓴다. 중앙은 상태 이력 표라 좌·우보다 넓어야 하고,
 * 인라인 style 에는 미디어 쿼리를 쓸 수 없으므로 폭 비율(flexGrow)과 접힘(flexWrap)을 함께 준다.
 */
const threeColumnStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: cssVar('space.5'),
  alignItems: 'flex-start',
  minWidth: 0,
};

const sideColumnStyle: CSSProperties = {
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: `calc(${cssVar('space.10')} * 4)`,
  maxWidth: `calc(${cssVar('space.10')} * 6)`,
  minWidth: 0,
};

const centerColumnStyle: CSSProperties = {
  flexGrow: 3,
  flexShrink: 1,
  flexBasis: `calc(${cssVar('space.10')} * 5)`,
  minWidth: 0,
};

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

/** 카드 제목도 목업의 보라를 쓴다 — action.primary 그대로(새 색을 들이지 않는다) */
const accentTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.action.primary.default'),
};

const dlStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, auto) minmax(0, 1fr)',
  rowGap: cssVar('space.3'),
  columnGap: cssVar('space.4'),
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
  textAlign: 'right',
  overflowWrap: 'anywhere',
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 휴대폰 미리보기 스타일(PhoneFrame 미러) ──────────────────────────────────────────────── */

const phoneStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.5'),
  paddingBottom: cssVar('space.5'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thick'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.xl'),
  background: cssVar('color.surface.raised'),
};

const notchStyle: CSSProperties = {
  alignSelf: 'center',
  width: `calc(${cssVar('space.6')} * 2)`,
  height: cssVar('space.1'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.border.default'),
};

const senderLineStyle: CSSProperties = {
  textAlign: 'center',
  color: cssVar('color.text.muted'),
  ...typography('typography.label.sm'),
  fontVariantNumeric: 'tabular-nums',
  margin: 0,
};

const bubbleStyle: CSSProperties = {
  alignSelf: 'flex-start',
  maxWidth: '92%',
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderRadius: cssVar('radius.lg'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.body.md'),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  margin: 0,
};

const bubbleSubjectStyle: CSSProperties = {
  display: 'block',
  marginBottom: cssVar('space.2'),
  ...typography('typography.label.md'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const imageSlotStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: `calc(${cssVar('space.6')} * 3)`,
  marginBottom: cssVar('space.2'),
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
};

const previewMetaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function DetailCard({ title, children }: { title: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={accentTitleStyle}>
          {title}
        </h2>
        {children}
      </div>
    </Card>
  );
}

/** 라벨/값 한 줄 — dl 격자의 한 행이다(display: contents 로 격자를 지나 보낸다) */
function Row({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div style={{ display: 'contents' }}>
      <dt style={dtStyle}>{label}</dt>
      <dd style={ddStyle}>{children}</dd>
    </div>
  );
}

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface DetailScreenProps {
  readonly template?: DemoTemplateDetail;
  readonly loading?: boolean;
  readonly failed?: boolean;
  readonly initialConfirmingDelete?: boolean;
}

function MessageTemplateDetailScreen({
  template = ACTIVE_TEMPLATE,
  loading = false,
  failed = false,
  initialConfirmingDelete = false,
}: DetailScreenProps) {
  const [status, setStatus] = useState<TemplateStatus>(template.status);
  const [confirmingDelete, setConfirmingDelete] = useState(initialConfirmingDelete);

  if (failed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertRowStyle}>
            <span>{`${ENTITY_LABEL}을(를) 불러오지 못했어요. 이미 삭제되었을 수 있어요.`}</span>
            <Button variant="secondary">목록으로</Button>
          </div>
        </Alert>
      </div>
    );
  }

  const actions = actionsFor(status);
  const bytes = byteLengthOf(template.body);
  const kind = classifySms(
    bytes,
    template.imageFileName.trim() !== '',
    template.subject.trim() !== '',
  );
  const showsSubject = kind !== 'sms';

  return (
    <div style={pageStyle}>
      <span style={backRowStyle}>
        <Button variant="ghost" size="md" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>
      </span>

      <div style={headerStyle}>
        <div style={titleColumnStyle}>
          <span style={eyebrowStyle}>문자 템플릿</span>
          <h1 style={titleStyle}>{template.name}</h1>
        </div>

        <div style={headerActionsStyle}>
          {actions.canToggleActive && (
            // 토글에는 보이는 라벨이 없다 — 무엇을 켜는지는 접근성 이름이 말한다 (A11Y)
            <ToggleSwitch
              checked={status === 'active'}
              label={`'${template.name}' 발송 사용 여부`}
              onChange={() => setStatus(status === 'active' ? 'inactive' : 'active')}
            />
          )}
          {actions.canDelete && (
            <Button
              variant="danger"
              size="md"
              iconLeft={<Icon name="trash" />}
              onClick={() => setConfirmingDelete(true)}
            >
              삭제
            </Button>
          )}
          {actions.canEdit && (
            <Button variant="secondary" size="md">
              수정
            </Button>
          )}
          {actions.canPublish && (
            <Button variant="primary" size="md" onClick={() => setStatus('active')}>
              발행
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <Card>
          <div style={skeletonBodyStyle} aria-busy="true">
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <Skeleton key={`row-${String(row)}`} />
            ))}
          </div>
        </Card>
      ) : (
        <div style={threeColumnStyle}>
          <div style={sideColumnStyle}>
            {/* 상세는 읽기 전용이다 — 편집기와 같은 카드를 잠근 모습으로 쓴다 */}
            <DetailCard title="발신 프로필">
              <FormField htmlFor="detail-sender-profile" label="발신 프로필" required>
                <SelectField id="detail-sender-profile" value={template.senderProfileName} disabled>
                  {SENDER_PROFILES.map((profile) => (
                    <option key={profile} value={profile}>
                      {profile}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              {/* 둘째 칸은 종류가 정한다 — 문자면 발신번호, 이메일이면 발신 주소(없는 개념은 그리지 않는다) */}
              <FormField htmlFor="detail-sender-phone" label="발신번호" required>
                <SelectField id="detail-sender-phone" value={template.senderPhone} disabled>
                  <option value={template.senderPhone}>{template.senderPhone}</option>
                </SelectField>
              </FormField>
            </DetailCard>
          </div>

          <div style={centerColumnStyle}>
            <DetailCard title="상태 이력">
              <dl style={dlStyle}>
                <Row label="템플릿 상태">
                  <StatusBadge tone={STATUS_TONE[status]} label={TEMPLATE_STATUS_LABEL[status]} />
                </Row>
                <Row label="템플릿 종류">문자</Row>
                {/* 대행사 회선은 문자에만 있는 개념이다 — 이메일에는 이 줄 자체를 그리지 않는다 */}
                <Row label="문자 발송사">{template.vendor}</Row>
                <Row label="발신 프로필">{template.senderProfileName}</Row>
                <Row label="등록자">{template.createdBy}</Row>
                <Row label="등록일시">{formatDateTime(template.createdAt)}</Row>
                <Row label="최종 수정자">{template.lastEditedBy}</Row>
                <Row label="최종 수정일시">{formatDateTime(template.lastEditedAt)}</Row>
              </dl>
            </DetailCard>
          </div>

          <div style={sideColumnStyle}>
            <DetailCard title="미리보기">
              <div style={phoneStyle}>
                <span style={notchStyle} />
                <p style={senderLineStyle}>{template.senderPhone}</p>
                <div style={bubbleStyle}>
                  {template.imageFileName.trim() !== '' && (
                    <span style={imageSlotStyle}>
                      <Icon name="image" />
                    </span>
                  )}
                  {/* SMS 에는 제목 칸이 없다 — 등급이 제목을 보여 줄지 정한다 */}
                  {showsSubject && template.subject.trim() !== '' && (
                    <span style={bubbleSubjectStyle}>{template.subject}</span>
                  )}
                  {template.body}
                </div>
                <div style={previewMetaStyle}>
                  <StatusBadge tone="info" label={SMS_KIND_LABEL[kind]} />
                  <span>{`${String(bytes)} byte`}</span>
                </div>
              </div>
            </DetailCard>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <ConfirmDialog
          intent="delete"
          title={`${ENTITY_LABEL} 삭제`}
          message={`'${template.name}'을(를) 삭제해요. 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          onConfirm={() => setConfirmingDelete(false)}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  );
}

/** 정상(사용중): 켜져 있는 문자 템플릿 — 헤더는 [토글 ON] [삭제] 만. 수정은 먼저 꺼야 열린다 */
export const Default: Story = {
  render: () => <MessageTemplateDetailScreen />,
};

/** 초안: 아직 발행 전 — 헤더는 [삭제] [수정] [발행]. 토글은 그리지 않는다 */
export const Draft: Story = {
  render: () => <MessageTemplateDetailScreen template={DRAFT_TEMPLATE} />,
};

/** 미사용: 발행됐지만 꺼짐 — 헤더는 [토글 OFF] [삭제] [수정]. MMS(첨부 이미지) 미리보기 */
export const Inactive: Story = {
  render: () => <MessageTemplateDetailScreen template={INACTIVE_TEMPLATE} />,
};

/** 로딩: 상세 도착 전 카드 스켈레톤(useCrudItem data === undefined 미러) */
export const Loading: Story = {
  render: () => <MessageTemplateDetailScreen loading />,
};

/** 삭제 확인: 되돌릴 수 없는 작업이라 확인 다이얼로그로 한 번 막는다 */
export const DeleteConfirm: Story = {
  render: () => <MessageTemplateDetailScreen initialConfirmingDelete />,
};
