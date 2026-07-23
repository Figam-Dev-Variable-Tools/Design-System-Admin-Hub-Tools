/**
 * Design System/Templates/Marketing/Email Form — 이메일 발송 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Marketing"(마케팅 관리)이다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Marketing 그룹에서 `['/marketing/email', '이메일 발송', 'Email']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/marketing/email/EmailFormPage.tsx
 * (라우트 /marketing/email/new · /marketing/email/:id/edit). SMS 발송 폼과 형제 구조다: 좌측 입력
 * 카드 4장(발송정보·수신자·본문·발송예약) + 우측 메일 클라이언트 미리보기 2단. 규칙만 이메일의 것으로
 * 갈린다 — 제목이 생기고(광고성이면 '(광고)' 로 시작), 발신자는 SPF/DKIM 인증된 주소만 고르며,
 * **수신거부 링크는 마케팅 메일의 필수 항목**이라 끄면 미리보기가 붉게 경고한다.
 * **저장은 실제 전송이 아니다** — 캠페인(초안/예약)을 저장할 뿐이다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면의 앱 조각을 DS 표면으로 갈음한다:
 *   목록으로(FormPageShell)      → Button(ghost) + Icon(chevron-left)
 *   카드 제목(CardTitle)          → Card + 토큰만 쓴 <h2>
 *   세그먼트 선택(SegmentPicker)  → Checkbox 목록 + 토큰 레이아웃
 *   치환변수 삽입(VariableInsertBar) → Button(secondary·sm) 칩 줄
 *   메일 미리보기(EmailPreview/MailFrame) → 토큰만 쓴 프레임 + StatusBadge(수신거부 누락)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   발송명 · 제목               → TextField ×2
 *   발신자 · 발송 방식 · 템플릿   → FormField + SelectField
 *   수신자 세그먼트             → Checkbox ×5 + 토큰 레이아웃
 *   광고성 · 수신거부 링크        → ToggleSwitch ×2
 *   본문                       → TextareaField
 *   예약 일시                  → FormField + datetime-local input(토큰 controlStyle)
 *   광고 제목 경고              → Alert(warning)
 *   상세 조회 스켈레톤          → Card + Skeleton
 *   취소 / 초안 저장 · 예약 저장 → Button(secondary/primary)
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
  Checkbox,
  FormField,
  formRowStyle,
  Icon,
  SelectField,
  Skeleton,
  StatusBadge,
  TextField,
  TextareaField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Marketing/Email Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 선택지(실화면 email/types · _shared/store 미러) ──────────────────────────────────── */

const EMAIL_NAME_MAX = 60;
const EMAIL_SUBJECT_MAX = 120;
const EMAIL_BODY_MAX = 5000;

type SendMode = 'draft' | 'scheduled';

/** 발신자(이메일) — 도메인 인증(SPF/DKIM)이 완료된 주소만 고를 수 있다 */
interface DemoSenderEmail {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly verified: boolean;
}

const SENDERS: readonly DemoSenderEmail[] = [
  { id: 'from-news', email: 'news@spaceplanning.ai', name: '스페이스플래닝 뉴스', verified: true },
  {
    id: 'from-mkt',
    email: 'marketing@spaceplanning.ai',
    name: '스페이스플래닝 마케팅',
    verified: true,
  },
  {
    id: 'from-noreply',
    email: 'noreply@spaceplanning.ai',
    name: '스페이스플래닝',
    verified: false,
  },
];

interface DemoSegment {
  readonly id: string;
  readonly label: string;
  readonly recipientCount: number;
  readonly description: string;
}

const SEGMENTS: readonly DemoSegment[] = [
  {
    id: 'seg-all',
    label: '전체 수신동의 회원',
    recipientCount: 12840,
    description: '마케팅 수신에 동의한 전체 회원',
  },
  {
    id: 'seg-vip',
    label: 'VIP 등급',
    recipientCount: 640,
    description: '최근 6개월 구매금액 상위 5%',
  },
  {
    id: 'seg-dormant',
    label: '휴면 직전(90일 미방문)',
    recipientCount: 2130,
    description: '90일간 로그인·구매 없음',
  },
  {
    id: 'seg-cart',
    label: '장바구니 이탈',
    recipientCount: 415,
    description: '장바구니 담기 후 미결제 3일 경과',
  },
  {
    id: 'seg-newsletter',
    label: '뉴스레터 구독자',
    recipientCount: 5320,
    description: '뉴스레터 수신에 동의한 구독자',
  },
];

/** 발행되어 켜져 있는(Active) 이메일 템플릿 — 실화면 selectableTemplates('email') 미러 */
const EMAIL_TEMPLATES: readonly { readonly id: string; readonly name: string }[] = [
  { id: 'mt-email-active', name: '월간 뉴스레터 기본형' },
];

const VARIABLE_TOKENS: readonly string[] = ['#{이름}', '#{주문번호}', '#{쿠폰명}', '#{적립금}'];

/* ── 순수 규칙(실화면 _shared/messaging 미러) ─────────────────────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');

const hasAdPrefix = (text: string): boolean => text.trimStart().startsWith('(광고)');

const totalRecipients = (selectedIds: ReadonlySet<string>): number =>
  SEGMENTS.filter((segment) => selectedIds.has(segment.id)).reduce(
    (sum, segment) => sum + segment.recipientCount,
    0,
  );

const sendSubmitLabel = (mode: SendMode): string =>
  mode === 'scheduled' ? '예약 저장' : '초안 저장';

/* ── 데모 시드(실화면 EMAIL_SEED 의 em-2 를 폼 값으로 되돌린 형태) ─────────────────────────── */

interface SeedValues {
  readonly name: string;
  readonly subject: string;
  readonly senderId: string;
  readonly segmentIds: readonly string[];
  readonly isAd: boolean;
  readonly body: string;
  readonly includeUnsubscribe: boolean;
  readonly mode: SendMode;
  readonly scheduledAt: string;
}

const EMPTY_SEED: SeedValues = {
  name: '',
  subject: '',
  senderId: '',
  segmentIds: [],
  isAd: false,
  body: '',
  includeUnsubscribe: true,
  mode: 'draft',
  scheduledAt: '',
};

const EDIT_SEED: SeedValues = {
  name: 'VIP 단독 할인 안내',
  subject: '(광고) VIP 고객님만을 위한 단독 혜택',
  senderId: 'from-mkt',
  segmentIds: ['seg-vip'],
  isAd: true,
  body: '#{이름}님, VIP 고객님만을 위한 단독 할인 혜택을 준비했습니다.\n\n감사합니다.',
  includeUnsubscribe: true,
  mode: 'scheduled',
  scheduledAt: '2026-07-22T10:00',
};

/** 검증 오류 데모 — 실화면 zod 스키마(email/validation)가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly name?: string;
  readonly subject?: string;
  readonly senderId?: string;
  readonly segmentIds?: string;
  readonly body?: string;
  readonly includeUnsubscribe?: string;
}

/** 광고 제목 경고를 함께 드러내려고 제목만 (광고) 없이 채운 상태로 제출한 모습 */
const ERROR_SEED: SeedValues = {
  ...EMPTY_SEED,
  subject: '여름 단독 혜택 안내',
  isAd: true,
  includeUnsubscribe: false,
};

const DEMO_ERRORS: FieldErrors = {
  name: '발송명을 입력하세요.',
  senderId: '발신자를 선택하세요.',
  segmentIds: '수신자 세그먼트를 한 개 이상 선택하세요.',
  body: '본문을 입력하세요.',
  includeUnsubscribe: '마케팅 이메일에는 수신거부 링크가 반드시 포함되어야 해요.',
};

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

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
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

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const errorTextStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.feedback.danger.text'),
  margin: 0,
};

const controlStyle = (invalid: boolean): CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: invalid ? cssVar('color.feedback.danger.border') : cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
});

const segmentListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const segmentRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const segmentMetaStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

const chipRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/* ── 메일 클라이언트 미리보기 스타일(MailFrame 미러) ──────────────────────────────────────── */

const mailFrameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  width: '100%',
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.lg'),
  background: cssVar('color.surface.default'),
  overflow: 'hidden',
};

const mailHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  background: cssVar('color.surface.raised'),
};

const mailSubjectStyle: CSSProperties = {
  ...typography('typography.title.md'),
  color: cssVar('color.text.default'),
  margin: 0,
  overflowWrap: 'anywhere',
};

const mailFromStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
  overflowWrap: 'anywhere',
};

const mailBodyStyle: CSSProperties = {
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  ...typography('typography.body.md'),
  color: cssVar('color.text.default'),
  whiteSpace: 'pre-wrap',
  overflowWrap: 'anywhere',
  margin: 0,
};

const mailFooterStyle: CSSProperties = {
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.subtle'),
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const unsubStyle: CSSProperties = {
  textDecorationLine: 'underline',
  color: cssVar('color.text.muted'),
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰으로 조립하고 aria 로 잇는다) ── */

function FormCard({ title, children }: { title: string; children: ReactNode }) {
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

/* ── 메일 미리보기(EmailPreview 미러 — 발송 시점에만 있는 값: 발신자·수신거부) ─────────────── */

function EmailPreview({
  subject,
  senderName,
  senderEmail,
  body,
  includeUnsubscribe,
}: {
  readonly subject: string;
  readonly senderName: string;
  readonly senderEmail: string;
  readonly body: string;
  readonly includeUnsubscribe: boolean;
}) {
  return (
    <div style={mailFrameStyle}>
      <div style={mailHeaderStyle}>
        <p style={mailSubjectStyle}>{subject.trim() === '' ? '(제목 미입력)' : subject}</p>
        <p style={mailFromStyle}>
          {senderEmail === '' ? '(발신자 미선택)' : `${senderName} <${senderEmail}>`}
        </p>
      </div>
      <p style={mailBodyStyle}>{body.trim() === '' ? '(본문 미입력)' : body}</p>
      <div style={mailFooterStyle}>
        {includeUnsubscribe ? (
          <span>
            본 메일을 원치 않으시면 <span style={unsubStyle}>수신거부</span> 하실 수 있습니다.
          </span>
        ) : (
          <StatusBadge tone="danger" label="수신거부 링크 없음 — 마케팅 이메일 필수" />
        )}
      </div>
    </div>
  );
}

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface EmailFormScreenProps {
  readonly isEdit?: boolean;
  readonly loadingDetail?: boolean;
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function EmailFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: EmailFormScreenProps) {
  const [name, setName] = useState(seed.name);
  const [subject, setSubject] = useState(seed.subject);
  const [senderId, setSenderId] = useState(seed.senderId);
  const [segmentIds, setSegmentIds] = useState<ReadonlySet<string>>(() => new Set(seed.segmentIds));
  const [isAd, setIsAd] = useState(seed.isAd);
  const [body, setBody] = useState(seed.body);
  const [includeUnsubscribe, setIncludeUnsubscribe] = useState(seed.includeUnsubscribe);
  const [mode, setMode] = useState<SendMode>(seed.mode);
  const [scheduledAt, setScheduledAt] = useState(seed.scheduledAt);
  const [templatePick, setTemplatePick] = useState('');

  const sender = SENDERS.find((item) => item.id === senderId);
  const recipients = totalRecipients(segmentIds);
  /** 광고성이면 제목이 '(광고)' 로 시작해야 한다 */
  const adSubjectWarning = isAd && subject.trim() !== '' && !hasAdPrefix(subject);

  const toggleSegment = (id: string, checked: boolean): void => {
    setSegmentIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <div style={pageStyle}>
      <span style={backRowStyle}>
        <Button variant="ghost" size="md" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>
      </span>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '이메일 발송 수정' : '이메일 발송 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 저장은 발송 예약일 뿐이며 이 화면에서 메일이 즉시 전송되지
          않아요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <div style={layoutStyle}>
          <div style={columnStyle}>
            {loadingDetail ? (
              <Card>
                <div style={skeletonBodyStyle} aria-busy="true">
                  {[0, 1, 2, 3, 4, 5].map((row) => (
                    <Skeleton key={`row-${String(row)}`} />
                  ))}
                </div>
              </Card>
            ) : (
              <>
                <FormCard title="발송 정보">
                  <TextField
                    id="email-name"
                    label="발송명"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="예: 7월 뉴스레터 발송"
                    maxLength={EMAIL_NAME_MAX}
                    error={errors.name ?? ''}
                  />

                  <TextField
                    id="email-subject"
                    label="제목"
                    required
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="예: [스페이스플래닝] 7월의 새로운 소식"
                    maxLength={EMAIL_SUBJECT_MAX}
                    error={errors.subject ?? ''}
                  />
                  <p style={hintStyle}>광고성 메일은 제목이 (광고)로 시작해야 해요.</p>

                  <FormField
                    htmlFor="email-sender"
                    label="발신자"
                    required
                    hint="도메인 인증(SPF/DKIM)이 완료된 발신자만 선택할 수 있어요."
                    {...(errors.senderId !== undefined && { error: errors.senderId })}
                  >
                    <SelectField
                      id="email-sender"
                      value={senderId}
                      isInvalid={errors.senderId !== undefined}
                      onChange={(event) => setSenderId(event.target.value)}
                    >
                      <option value="">발신자 선택</option>
                      {SENDERS.map((item) => (
                        <option key={item.id} value={item.id} disabled={!item.verified}>
                          {`${item.name} <${item.email}>${item.verified ? '' : ' (미검증)'}`}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                </FormCard>

                <FormCard title="수신자">
                  <div style={fieldStyle}>
                    <span style={fieldLabelStyle}>수신자 세그먼트 *</span>
                    <ul style={segmentListStyle}>
                      {SEGMENTS.map((segment) => (
                        <li key={segment.id} style={segmentRowStyle}>
                          <Checkbox
                            id={`email-segment-${segment.id}`}
                            label={segment.label}
                            checked={segmentIds.has(segment.id)}
                            onChange={(event) => toggleSegment(segment.id, event.target.checked)}
                          />
                          <span style={segmentMetaStyle}>
                            {`${fmt(segment.recipientCount)}명 · ${segment.description}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {errors.segmentIds !== undefined && (
                      <p style={errorTextStyle} role="alert">
                        {errors.segmentIds}
                      </p>
                    )}
                  </div>

                  <div style={fieldStyle}>
                    <span style={fieldLabelStyle}>광고성 여부</span>
                    <ToggleSwitch
                      checked={isAd}
                      onChange={setIsAd}
                      label="광고성 메일 여부"
                      onLabel="광고성"
                      offLabel="정보성"
                    />
                    <p style={hintStyle}>광고성이면 제목에 (광고) 표기가 필요해요.</p>
                  </div>
                </FormCard>

                <FormCard title="본문">
                  <FormField
                    htmlFor="email-template"
                    label="템플릿 불러오기"
                    hint="발행되어 켜져 있는(Active) 이메일 템플릿의 제목·본문을 채워요."
                  >
                    <SelectField
                      id="email-template"
                      value={templatePick}
                      onChange={(event) => setTemplatePick(event.target.value)}
                    >
                      <option value="">템플릿 선택 안 함</option>
                      {EMAIL_TEMPLATES.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>

                  <TextareaField
                    label="본문"
                    required
                    value={body}
                    onChange={setBody}
                    maxLength={EMAIL_BODY_MAX}
                    rows={6}
                    placeholder="메일 본문을 입력하세요. #{이름} 등 치환변수를 넣을 수 있어요."
                    error={errors.body ?? ''}
                  />

                  <div style={chipRowStyle}>
                    <span style={hintStyle}>치환변수</span>
                    {VARIABLE_TOKENS.map((token) => (
                      <Button
                        key={token}
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setBody((prev) => `${prev}${token}`)}
                      >
                        {token}
                      </Button>
                    ))}
                  </div>

                  {adSubjectWarning && (
                    <Alert tone="warning">
                      광고성 메일이에요. 제목을 (광고)로 시작하도록 수정하세요.
                    </Alert>
                  )}

                  <div style={fieldStyle}>
                    <span style={fieldLabelStyle}>수신거부 링크</span>
                    <ToggleSwitch
                      checked={includeUnsubscribe}
                      onChange={setIncludeUnsubscribe}
                      label="수신거부 링크 포함 여부"
                      onLabel="포함"
                      offLabel="미포함"
                    />
                    {errors.includeUnsubscribe === undefined ? (
                      <p style={hintStyle}>
                        마케팅 이메일에는 수신거부 링크가 반드시 포함되어야 해요.
                      </p>
                    ) : (
                      <p style={errorTextStyle} role="alert">
                        {errors.includeUnsubscribe}
                      </p>
                    )}
                  </div>
                </FormCard>

                <FormCard title="발송 예약">
                  <div style={formRowStyle}>
                    <FormField htmlFor="email-status" label="발송 방식" required>
                      <SelectField
                        id="email-status"
                        value={mode}
                        onChange={(event) =>
                          setMode(event.target.value === 'scheduled' ? 'scheduled' : 'draft')
                        }
                      >
                        <option value="draft">초안 저장</option>
                        <option value="scheduled">예약 발송</option>
                      </SelectField>
                    </FormField>

                    {mode === 'scheduled' && (
                      <FormField htmlFor="email-scheduled" label="예약 일시" required>
                        <input
                          id="email-scheduled"
                          type="datetime-local"
                          style={controlStyle(false)}
                          value={scheduledAt}
                          onChange={(event) => setScheduledAt(event.target.value)}
                        />
                      </FormField>
                    )}
                  </div>
                </FormCard>
              </>
            )}
          </div>

          <FormCard title="미리보기">
            <EmailPreview
              subject={subject}
              senderName={sender?.name ?? ''}
              senderEmail={sender?.email ?? ''}
              body={body}
              includeUnsubscribe={includeUnsubscribe}
            />
            <p style={hintStyle}>
              {`선택 대상 ${fmt(recipients)}명 · 오픈율/클릭율은 발송 후 집계돼요. 저장은 발송이 아니에요.`}
            </p>
          </FormCard>
        </div>

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md">
            취소
          </Button>
          <Button type="submit" variant="primary" size="md">
            {sendSubmitLabel(mode)}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 신규 이메일 캠페인 입력. 수신거부 링크는 처음부터 켜져 있다 */
export const Default: Story = {
  render: () => <EmailFormScreen />,
};

/** 수정: 예약 캠페인(VIP 단독 할인) — 광고성 제목·세그먼트·예약 일시가 채워진 폼 */
export const Edit: Story = {
  render: () => <EmailFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 입력 열 스켈레톤(useCrudForm loadingDetail 미러) — 미리보기는 남는다 */
export const Loading: Story = {
  render: () => <EmailFormScreen isEdit loadingDetail />,
};

/**
 * 검증 오류: 필수 항목을 비우고 제출 — 인라인 오류 + 광고 제목 경고(Alert) +
 * 수신거부 링크를 끈 미리보기의 danger 배지가 함께 보인다.
 */
export const ValidationError: Story = {
  render: () => <EmailFormScreen errors={DEMO_ERRORS} seed={ERROR_SEED} />,
};
