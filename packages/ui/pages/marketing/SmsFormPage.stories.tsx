/**
 * Design System/Templates/Marketing/SMS Form — SMS 발송 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Marketing"(마케팅 관리)이다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Marketing 그룹에서 `['/marketing/sms', 'SMS 발송', 'SMS']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/marketing/sms/SmsFormPage.tsx
 * (라우트 /marketing/sms/new · /marketing/sms/:id/edit). 실화면은 승격된 CRUD 프레임워크(useCrudForm)
 * 위에 좌측 입력 카드 4장(발송정보·수신자·메시지·발송예약) + 우측 휴대폰 말풍선 미리보기를 2단으로
 * 배치한다. **저장은 실제 전송이 아니다** — 캠페인(초안/예약)을 저장할 뿐이라 화면 곳곳이 그 사실을
 * 반복해 말한다. 규제 축 셋(발신번호 사전등록 · (광고) 표기·무료수신거부 · 야간 광고 전송 제한)이
 * 이 폼의 경고를 만든다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면의 앱 조각을 DS 표면으로 갈음한다:
 *   목록으로(FormPageShell)      → Button(ghost) + Icon(chevron-left)
 *   카드 제목(CardTitle)          → Card + 토큰만 쓴 <h2>(DS 부재 — 토큰 레이아웃으로 대체)
 *   세그먼트 선택(SegmentPicker)  → Checkbox 목록 + FormField(토큰 레이아웃)
 *   치환변수 삽입(VariableInsertBar) → Button(secondary·sm) 칩 줄
 *   휴대폰 미리보기(PhoneMessagePreview) → 토큰만 쓴 프레임 + StatusBadge(등급)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   발송명                     → TextField
 *   발신번호 · 발송 방식 · 템플릿 → FormField + SelectField
 *   수신자 세그먼트             → FormField + Checkbox ×5
 *   광고성 · 이미지 첨부(MMS)    → ToggleSwitch
 *   본문(바이트·등급 안내)       → TextareaField + 토큰 <p>(hint)
 *   예약 일시                  → FormField + datetime-local input(토큰 controlStyle)
 *   광고 요건 경고 / 야간 차단   → Alert(warning) / Alert(danger)
 *   유형 배지(SMS/LMS/MMS)      → StatusBadge
 *   저장 실패·404               → Alert(danger) + Button(secondary)
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
  title: 'Design System/Templates/Marketing/SMS Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 선택지(실화면 sms/types · _shared/messaging · _shared/store 미러) ─────────────────── */

const SMS_NAME_MAX = 60;
const SMS_BODY_MAX = 2000;
/** SMS 가 끝나고 LMS 가 시작되는 경계 — 미리보기가 '어디를 넘으면 승격되는가' 를 그린다 */
const SMS_PROMOTION_THRESHOLD = 90;
const LMS_MAX_BYTES = 2000;

type SmsKind = 'sms' | 'lms' | 'mms';
type SendMode = 'draft' | 'scheduled';

const SMS_KIND_LABEL: Record<SmsKind, string> = {
  sms: 'SMS',
  lms: 'LMS',
  mms: 'MMS',
};

/** 발신번호(SMS) — 사전등록·검증된 번호만 발신 가능 (전기통신사업법 제84조의2) */
interface DemoSender {
  readonly id: string;
  readonly number: string;
  readonly label: string;
  readonly verified: boolean;
}

const SENDERS: readonly DemoSender[] = [
  { id: 'snd-main', number: '15881234', label: '대표번호', verified: true },
  { id: 'snd-mkt', number: '025771000', label: '마케팅센터', verified: true },
  { id: 'snd-new', number: '070123456789', label: '신규 등록(검수중)', verified: false },
];

/** 수신자 세그먼트(그룹) — 발송 대상 선택 단위 */
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

/** 발행되어 켜져 있는(Active) 문자 템플릿 — 실화면 selectableTemplates('text') 미러 */
const TEXT_TEMPLATES: readonly { readonly id: string; readonly name: string }[] = [
  { id: 'mt-text-active', name: '주문 완료 안내' },
  { id: 'mt-text-inactive', name: '봄맞이 쿠폰 안내(종료)' },
];

/** 치환변수 — 문법은 `#{변수}` (솔라피·카카오 공통) */
const VARIABLE_TOKENS: readonly string[] = ['#{이름}', '#{주문번호}', '#{쿠폰명}', '#{적립금}'];

/* ── 순수 규칙(실화면 _shared/messaging 미러) ─────────────────────────────────────────────── */

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** EUC-KR 기준 바이트 길이 — 한글/비ASCII 2byte, ASCII 1byte */
const byteLengthOf = (text: string): number =>
  [...text].reduce((sum, char) => sum + ((char.codePointAt(0) ?? 0) > 0x7f ? 2 : 1), 0);

/** 이미지가 있으면 MMS, 없으면 90byte 이하 SMS · 초과 LMS 로 자동 승격 */
const classifySms = (bytes: number, hasImage: boolean): SmsKind => {
  if (hasImage) return 'mms';
  return bytes <= SMS_PROMOTION_THRESHOLD ? 'sms' : 'lms';
};

const smsByteLimit = (kind: SmsKind): number =>
  kind === 'sms' ? SMS_PROMOTION_THRESHOLD : LMS_MAX_BYTES;

const hasAdPrefix = (text: string): boolean => text.trimStart().startsWith('(광고)');

const hasOptOut = (text: string): boolean =>
  ['무료수신거부', '무료거부', '수신거부'].some((keyword) => text.includes(keyword));

/** 광고 발송 본문 요건 — (광고) 표기 + 무료수신거부 문구를 모두 갖췄는가 */
const meetsAdRequirements = (text: string): boolean => hasAdPrefix(text) && hasOptOut(text);

/** 예약 시각이 야간(21~08시)인가 — 광고성 메시지의 전송 제한(정보통신망법 제50조 제3항) */
const isNightAt = (value: string): boolean => {
  const hour = Number(value.slice(11, 13));
  if (Number.isNaN(hour)) return false;
  return hour >= 21 || hour < 8;
};

/** 국내 전화번호 표기 — 02 는 지역번호 2자리 */
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.startsWith('02')) {
    const mid = digits.length > 9 ? digits.slice(2, 6) : digits.slice(2, 5);
    return [digits.slice(0, 2), mid, digits.slice(2 + mid.length)]
      .filter((part) => part !== '')
      .join('-');
  }
  const mid = digits.length > 10 ? digits.slice(3, 7) : digits.slice(3, 6);
  return [digits.slice(0, 3), mid, digits.slice(3 + mid.length)]
    .filter((part) => part !== '')
    .join('-');
};

const totalRecipients = (selectedIds: ReadonlySet<string>): number =>
  SEGMENTS.filter((segment) => selectedIds.has(segment.id)).reduce(
    (sum, segment) => sum + segment.recipientCount,
    0,
  );

/** 저장 버튼 라벨 — 저장은 실제 전송이 아니다 */
const sendSubmitLabel = (mode: SendMode): string =>
  mode === 'scheduled' ? '예약 저장' : '초안 저장';

/* ── 데모 시드(실화면 SMS_SEED 의 sms-2 를 폼 값으로 되돌린 형태) ───────────────────────────── */

interface SeedValues {
  readonly name: string;
  readonly senderId: string;
  readonly segmentIds: readonly string[];
  readonly isAd: boolean;
  readonly hasImage: boolean;
  readonly body: string;
  readonly mode: SendMode;
  readonly scheduledAt: string;
}

const EMPTY_SEED: SeedValues = {
  name: '',
  senderId: '',
  segmentIds: [],
  isAd: false,
  hasImage: false,
  body: '',
  mode: 'draft',
  scheduledAt: '',
};

const EDIT_SEED: SeedValues = {
  name: 'VIP 사은품 증정 안내',
  senderId: 'snd-mkt',
  segmentIds: ['seg-vip'],
  isAd: true,
  hasImage: false,
  body: '(광고) VIP 고객님께 특별 사은품을 드립니다. 무료수신거부 080-123-4567',
  mode: 'scheduled',
  scheduledAt: '2026-07-20T14:00',
};

/** 야간 예약 — 광고성인데 22시로 잡아 전송 제한에 걸리는 상태 */
const NIGHT_SEED: SeedValues = {
  ...EDIT_SEED,
  name: '심야 타임세일 예고',
  body: '(광고) 밤 11시 타임세일이 시작됩니다.',
  scheduledAt: '2026-07-24T22:30',
};

/** 검증 오류 데모 — 실화면 zod 스키마(sms/validation)가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly name?: string;
  readonly senderId?: string;
  readonly segmentIds?: string;
  readonly body?: string;
  readonly scheduledAt?: string;
}

const DEMO_ERRORS: FieldErrors = {
  name: '발송명을 입력하세요.',
  senderId: '발신번호를 선택하세요.',
  segmentIds: '수신자 세그먼트를 한 개 이상 선택하세요.',
  body: '본문을 입력하세요.',
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

const backRowStyle: CSSProperties = {
  alignSelf: 'flex-start',
};

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

/** 입력(좌) · 미리보기(우) 2단 — 좁은 화면에서는 자동으로 한 단으로 접힌다 */
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

/* ── 휴대폰 미리보기 스타일(PhoneFrame 미러) ──────────────────────────────────────────────── */

const phoneStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  width: '100%',
  maxWidth: `calc(${cssVar('space.10')} * 5)`,
  marginLeft: 'auto',
  marginRight: 'auto',
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

/** 이미지 자리 — MMS 일 때만. 실제 이미지가 아니라 '여기에 붙는다' 는 표시다 */
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

const gaugeTrackStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
  height: cssVar('space.2'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.default'),
  overflow: 'hidden',
};

const gaugeFillStyle = (ratio: number, over: boolean): CSSProperties => ({
  width: `${String(Math.min(100, Math.round(ratio * 100)))}%`,
  height: '100%',
  background: over
    ? cssVar('color.feedback.warning.border')
    : cssVar('color.action.primary.default'),
});

const previewMetaStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
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

/* ── 휴대폰 말풍선 미리보기(PhoneMessagePreview 미러) ─────────────────────────────────────── */

function PhoneMessagePreview({
  senderNumber,
  body,
  kind,
  hasImage,
  bytes,
}: {
  readonly senderNumber: string;
  readonly body: string;
  readonly kind: SmsKind;
  readonly hasImage: boolean;
  readonly bytes: number;
}) {
  const limit = smsByteLimit(kind);
  const over = bytes > SMS_PROMOTION_THRESHOLD;

  return (
    <div style={phoneStyle}>
      <span style={notchStyle} />
      <p style={senderLineStyle}>
        {senderNumber === '' ? '(발신번호 미선택)' : formatPhone(senderNumber)}
      </p>
      <div style={bubbleStyle}>
        {hasImage && (
          <span style={imageSlotStyle}>
            <Icon name="image" />
          </span>
        )}
        {body.trim() === '' ? '(본문 미입력)' : body}
      </div>
      <div style={previewMetaStyle}>
        <StatusBadge tone={over ? 'warning' : 'info'} label={SMS_KIND_LABEL[kind]} />
        <span style={segmentMetaStyle}>{`${String(bytes)} / ${String(limit)} byte`}</span>
      </div>
      <div style={gaugeTrackStyle}>
        <div style={gaugeFillStyle(bytes / limit, over)} />
      </div>
      <p style={hintStyle}>
        {over
          ? `${String(SMS_PROMOTION_THRESHOLD)} byte 를 넘어 LMS 로 승격돼요 — 건당 단가가 달라져요.`
          : `${String(SMS_PROMOTION_THRESHOLD)} byte 를 넘으면 LMS 로 승격돼요.`}
      </p>
    </div>
  );
}

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface SmsFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function SmsFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: SmsFormScreenProps) {
  const [name, setName] = useState(seed.name);
  const [senderId, setSenderId] = useState(seed.senderId);
  const [segmentIds, setSegmentIds] = useState<ReadonlySet<string>>(() => new Set(seed.segmentIds));
  const [isAd, setIsAd] = useState(seed.isAd);
  const [hasImage, setHasImage] = useState(seed.hasImage);
  const [body, setBody] = useState(seed.body);
  const [mode, setMode] = useState<SendMode>(seed.mode);
  const [scheduledAt, setScheduledAt] = useState(seed.scheduledAt);
  const [templatePick, setTemplatePick] = useState('');

  const bytes = byteLengthOf(body);
  const kind = classifySms(bytes, hasImage);
  const senderNumber = SENDERS.find((sender) => sender.id === senderId)?.number ?? '';
  const recipients = totalRecipients(segmentIds);

  /** 광고 요건 — (광고) 표기 + 무료수신거부 문구를 모두 갖췄는가 */
  const adWarning = isAd && body.trim() !== '' && !meetsAdRequirements(body);
  const nightWarning = isAd && mode === 'scheduled' && scheduledAt !== '' && isNightAt(scheduledAt);

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
        <h1 style={pageTitleStyle}>{isEdit ? 'SMS 발송 수정' : 'SMS 발송 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 저장은 발송 예약일 뿐이며 이 화면에서 문자가 즉시 전송되지
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
                    id="sms-name"
                    label="발송명"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="예: 7월 여름세일 안내"
                    maxLength={SMS_NAME_MAX}
                    error={errors.name ?? ''}
                  />

                  <FormField
                    htmlFor="sms-sender"
                    label="발신번호"
                    required
                    hint="사전등록(검증)된 번호만 선택할 수 있어요(전기통신사업법 제84조의2)."
                    {...(errors.senderId !== undefined && { error: errors.senderId })}
                  >
                    <SelectField
                      id="sms-sender"
                      value={senderId}
                      isInvalid={errors.senderId !== undefined}
                      onChange={(event) => setSenderId(event.target.value)}
                    >
                      <option value="">발신번호 선택</option>
                      {SENDERS.map((sender) => (
                        <option key={sender.id} value={sender.id} disabled={!sender.verified}>
                          {`${formatPhone(sender.number)} · ${sender.label}${
                            sender.verified ? '' : ' (미검증)'
                          }`}
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
                            id={`sms-segment-${segment.id}`}
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
                      label="광고성 메시지 여부"
                      onLabel="광고성"
                      offLabel="정보성"
                    />
                    <p style={hintStyle}>
                      광고성이면 본문에 (광고) 표기·무료수신거부 안내가 필요하고, 야간(21~08시)
                      발송이 제한돼요.
                    </p>
                  </div>
                </FormCard>

                <FormCard title="메시지">
                  <FormField
                    htmlFor="sms-template"
                    label="템플릿 불러오기"
                    hint="발행되어 켜져 있는(Active) 문자 템플릿을 본문에 채워요."
                  >
                    <SelectField
                      id="sms-template"
                      value={templatePick}
                      onChange={(event) => setTemplatePick(event.target.value)}
                    >
                      <option value="">템플릿 선택 안 함</option>
                      {TEXT_TEMPLATES.map((template) => (
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
                    maxLength={SMS_BODY_MAX}
                    rows={5}
                    placeholder="발송할 문구를 입력하세요. #{이름} 등 치환변수를 넣을 수 있어요."
                    error={errors.body ?? ''}
                  />

                  <p style={hintStyle}>
                    {`${String(bytes)} byte · ${SMS_KIND_LABEL[kind]} (한도 ${String(
                      smsByteLimit(kind),
                    )} byte)`}
                    {kind === 'lms' && ' — 90 byte 초과로 LMS 로 발송돼요.'}
                  </p>

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

                  <div style={fieldStyle}>
                    <span style={fieldLabelStyle}>이미지 첨부(MMS)</span>
                    <ToggleSwitch
                      checked={hasImage}
                      onChange={setHasImage}
                      label="이미지 첨부 여부"
                      onLabel="첨부"
                      offLabel="없음"
                    />
                  </div>

                  {adWarning && (
                    <Alert tone="warning">
                      광고성 메시지예요. 본문에 (광고) 표기와 무료수신거부(예: 080) 안내를
                      포함하세요
                      {hasAdPrefix(body) ? '' : ' — (광고) 표기 누락'}
                      {hasOptOut(body) ? '' : ' — 수신거부 문구 누락'}.
                    </Alert>
                  )}
                </FormCard>

                <FormCard title="발송 예약">
                  <div style={formRowStyle}>
                    <FormField htmlFor="sms-status" label="발송 방식" required>
                      <SelectField
                        id="sms-status"
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
                      <FormField
                        htmlFor="sms-scheduled"
                        label="예약 일시"
                        required
                        {...(errors.scheduledAt !== undefined && { error: errors.scheduledAt })}
                      >
                        <input
                          id="sms-scheduled"
                          type="datetime-local"
                          style={controlStyle(errors.scheduledAt !== undefined)}
                          value={scheduledAt}
                          onChange={(event) => setScheduledAt(event.target.value)}
                        />
                      </FormField>
                    )}
                  </div>

                  {nightWarning && (
                    <Alert tone="danger">
                      광고성 메시지는 21시~익일 8시에 예약할 수 없어요(야간 광고 전송 제한,
                      정보통신망법 제50조 제3항).
                    </Alert>
                  )}
                </FormCard>
              </>
            )}
          </div>

          <FormCard title="미리보기">
            <PhoneMessagePreview
              senderNumber={senderNumber}
              body={body}
              kind={kind}
              hasImage={hasImage}
              bytes={bytes}
            />
            <p style={hintStyle}>
              {`선택 대상 ${fmt(recipients)}명 · 건당 과금(유형별 단가)은 발송 시 합산돼요. 저장은 발송이 아니에요.`}
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

/** 정상(등록): 빈 폼 — 신규 SMS 캠페인 입력. 미리보기는 '(본문 미입력)' 자리를 지킨다 */
export const Default: Story = {
  render: () => <SmsFormScreen />,
};

/** 수정: 예약 캠페인(VIP 사은품) — 세그먼트·광고성·예약 일시가 채워진 폼 */
export const Edit: Story = {
  render: () => <SmsFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 입력 열 스켈레톤(useCrudForm loadingDetail 미러) — 미리보기는 남는다 */
export const Loading: Story = {
  render: () => <SmsFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 필수 항목을 비우고 제출 — 각 필드 인라인 오류(zod 스키마 문구 미러) */
export const ValidationError: Story = {
  render: () => <SmsFormScreen errors={DEMO_ERRORS} />,
};

/** 야간 예약 차단: 광고성 + 22:30 예약 → 정보통신망법 제50조 제3항 danger 배너 */
export const NightSchedule: Story = {
  render: () => <SmsFormScreen isEdit seed={NIGHT_SEED} />,
};
