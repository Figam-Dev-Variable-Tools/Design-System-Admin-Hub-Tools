/**
 * Design System/Templates/Marketing/Newsletter Form — 뉴스레터 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Marketing"(마케팅 관리)다 — packages/ui/pages/_data/pages.ts 의 Business
 * 섹션 Marketing 그룹에서 `['/marketing/newsletters', '뉴스레터', 'Newsletters']` 로 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/marketing/newsletters/NewsletterFormPage.tsx
 * (라우트 /marketing/newsletters/new · /:id/edit). 실화면은 공용 CRUD 프레임워크(useCrudForm) 위에
 * **좌측 입력 카드 4장**(발송 정보 · 구독자 · 본문 · 발송 예약) + **우측 이메일 미리보기 카드** 를
 * 2단으로 놓는다 — 이벤트/프로모션 폼과 달리 FormPageShell 을 쓰지 않고 페이지가 직접 조립하는 이유는
 * 미리보기 열이 폼 옆에 붙어야 하기 때문이다. 검증의 정본은 ./validation(zod)이다.
 *
 * [이 폼만의 사실 셋]
 *   (1) 회차번호는 입력 필드가 아니다 — 저장 시 서버가 채번한다(nextIssueNo).
 *   (2) 구독형이라 **수신거부 링크는 항상 포함**된다 — 미리보기 하단이 그것을 늘 보여 준다.
 *   (3) **저장은 발송이 아니다** — 버튼 라벨이 '초안 저장'/'예약 저장' 으로만 갈린다(sendSubmitLabel).
 *
 * [404 와 서버 오류는 복구 수단이 다르다 — EXC-12] 이미 삭제된 회차에 '다시 시도' 를 권하면 영원히
 * 실패하는 버튼을 누르게 된다. 그래서 not-found 는 '목록으로' 만, error 는 '다시 시도' + '목록으로' 를
 * 준다 — LoadFailure 스토리가 그 분기를 그대로 보여 준다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 앱 조각을 DS 표면으로 갈음한다:
 *   목록으로 버튼               → Button(ghost) + Icon(chevron-left)
 *   페이지 제목/설명            → 토큰만 쓴 <h1>(title.xl) + <p>
 *   카드 표면 · CardTitle       → Card + 토큰만 쓴 <h2>(CardTitle 은 DS 부재 — 토큰 레이아웃으로 대체)
 *   FormServerError / loadFailure → Alert(danger) + Button(secondary)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   제목                       → TextField (자체 라벨·필수·오류·maxLength)
 *   발신자(검증된 것만 선택)      → FormField + SelectField (미검증 발신자는 option disabled)
 *   구독자 세그먼트(SegmentPicker) → role=group <ul> + Checkbox ×N + 토큰만 쓴 합계 <p>
 *   템플릿 불러오기              → FormField + SelectField (제목·본문을 채운다)
 *   본문                       → TextareaField (글자수 카운터 포함)
 *   치환변수 삽입(VariableInsertBar) → Button(secondary·sm) 묶음 + 토큰만 쓴 안내 <p>
 *   발송 방식(초안/예약)         → FormField + SelectField
 *   예약 일시(조건부 필수)       → FormField + datetime-local input(토큰 표면)
 *   이메일 미리보기(EmailPreview·MailFrame) → 토큰만 쓴 메일 프레임 + StatusBadge
 *   저장/취소                   → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
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
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Marketing/Newsletter Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수 · 픽스처(실화면 newsletters/types.ts · _shared/store.ts 미러) ─────────────────── */

const NEWSLETTER_TITLE_MAX = 120;
const NEWSLETTER_BODY_MAX = 5000;
const NO_TEMPLATE = '';

/** 발송 방식 — 폼이 만들 수 있는 상태는 초안·예약 둘뿐이다(발송중/완료/취소는 서버가 만든다) */
type FormSendStatus = 'draft' | 'scheduled';

/** 발신자(이메일) — 사전등록·검증된 발신자만 고를 수 있다 */
interface DemoSender {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly verified: boolean;
}

const SENDERS: readonly DemoSender[] = [
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

/** id → 발신자(키 접근 안전) — 배열 find + 인덱스 접근을 쓰지 않는다 */
const SENDER_BY_ID: Record<string, DemoSender | undefined> = Object.fromEntries(
  SENDERS.map((sender) => [sender.id, sender]),
);

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
    id: 'seg-newsletter',
    label: '뉴스레터 구독자',
    recipientCount: 5320,
    description: '뉴스레터 수신에 동의한 구독자',
  },
  { id: 'seg-vip', label: 'VIP 등급', recipientCount: 640, description: '최근 6개월 구매 상위 5%' },
  {
    id: 'seg-dormant',
    label: '휴면 직전(90일 미방문)',
    recipientCount: 2130,
    description: '90일간 로그인·구매 없음',
  },
];

/** 선택 세그먼트 수신자 합 — 실화면 totalRecipients 미러 */
function totalRecipients(selectedIds: readonly string[]): number {
  const selected = new Set(selectedIds);
  return SEGMENTS.filter((segment) => selected.has(segment.id)).reduce(
    (sum, segment) => sum + segment.recipientCount,
    0,
  );
}

/** 이메일 채널의 발송 가능 템플릿 — 실화면 listSendableTemplates('email') 미러 */
const EMAIL_TEMPLATES: readonly {
  readonly id: string;
  readonly name: string;
  readonly title: string;
  readonly body: string;
}[] = [
  {
    id: 'tpl-email-1',
    name: '월간 뉴스레터 기본형',
    title: '[스페이스플래닝] #{이름}님을 위한 이달의 소식',
    body: '#{이름}님, 이달의 새로운 소식과 혜택을 전해드립니다.',
  },
  {
    id: 'tpl-email-2',
    name: '신상품 안내형',
    title: '[스페이스플래닝] 새로 나온 상품을 만나보세요',
    body: '#{이름}님, 이번 주 새로 입고된 상품을 소개합니다.',
  },
];

/** 치환변수 — 실화면은 6개 도메인 카탈로그(TemplateVariablePicker). 템플릿은 대표 토큰만 미러 */
const VARIABLE_TOKENS: readonly string[] = ['#{이름}', '#{등급}', '#{주문번호}', '#{쿠폰명}'];

/** 미리보기 표본 치환 — 실화면 applyVariableSamples 를 대표값으로 축약 미러 */
const VARIABLE_SAMPLES: Record<string, string | undefined> = {
  '#{이름}': '홍길동',
  '#{등급}': 'VIP',
  '#{주문번호}': '20260721-0001',
  '#{쿠폰명}': '여름맞이 10% 쿠폰',
};

const applyVariableSamples = (text: string): string =>
  text.replace(/#\{[^}]+\}/g, (token) => VARIABLE_SAMPLES[token] ?? token);

/* ── 폼 값 · 데모 시드(실화면 NewsletterFormValues 미러) ───────────────────────────────────── */

interface FormValues {
  readonly title: string;
  readonly senderId: string;
  readonly segmentIds: readonly string[];
  readonly body: string;
  readonly status: FormSendStatus;
  readonly scheduledAt: string;
}

const EMPTY_SEED: FormValues = {
  title: '',
  senderId: 'from-news',
  segmentIds: ['seg-newsletter'],
  body: '',
  status: 'draft',
  scheduledAt: '',
};

/** 수정 시드 — 실화면 data-source 픽스처 nl-2(예약 회차)를 폼 값으로 되돌린 형태 */
const EDIT_SEED: FormValues = {
  title: '스페이스플래닝 7월 뉴스레터',
  senderId: 'from-news',
  segmentIds: ['seg-newsletter'],
  body: '#{이름}님, 7월의 새로운 소식과 혜택을 전해드립니다.\n\n이달의 추천 상품과 구독자 전용 쿠폰을 준비했습니다.',
  status: 'scheduled',
  scheduledAt: '2026-07-25T09:00',
};

/** 검증 오류 데모 — 실화면 zod 스키마(validation.ts)가 내는 문구를 그대로 미러 */
interface FieldErrors {
  readonly title?: string;
  readonly senderId?: string;
  readonly segmentIds?: string;
  readonly body?: string;
  readonly scheduledAt?: string;
}

const DEMO_ERRORS: FieldErrors = {
  title: '제목을 입력하세요.',
  senderId: '검증이 완료된 발신자만 사용할 수 있어요.',
  segmentIds: '구독자 세그먼트를 하나 이상 선택하세요.',
  body: '본문을 입력하세요.',
  scheduledAt: '예약 일시는 현재 시각 이후여야 해요.',
};

/** 검증 오류 화면의 시드 — 미검증 발신자 · 대상 0 · 과거 예약 */
const INVALID_SEED: FormValues = {
  title: '',
  senderId: 'from-noreply',
  segmentIds: [],
  body: '',
  status: 'scheduled',
  scheduledAt: '2026-01-01T09:00',
};

/** 상세 조회 실패 — 실화면 useCrudForm loadFailure('not-found' | 'error') 미러 */
type LoadFailure = 'not-found' | 'error';

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = { alignSelf: 'flex-start' };

const pageTitleStyle: CSSProperties = {
  ...typography('typography.title.xl'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const descriptionStyle: CSSProperties = {
  ...typography('typography.label.md'),
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
};

const formStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

/** 좌: 입력 카드 4장 / 우: 미리보기 — 실화면 layoutStyle 미러(auto-fit 2단) */
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

/** FormField 슬롯에 직접 넣는 네이티브 컨트롤의 표면 — 실화면 shared/ui 의 controlStyle 미러 */
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

const alertRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 세그먼트 선택 스타일(실화면 SegmentPicker 미러) ────────────────────────────────────────── */

const segmentListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  margin: 0,
  padding: 0,
  listStyle: 'none',
};

const segmentItemStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
};

const segmentCountStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const segmentTotalStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
  fontVariantNumeric: 'tabular-nums',
};

const variableBarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/* ── 이메일 미리보기 스타일(실화면 EmailPreview → MailFrame 미러) ─────────────────────────── */

const mailFrameStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
  marginLeft: 'auto',
  marginRight: 'auto',
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  overflow: 'hidden',
};

const mailHeaderStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderBottomStyle: 'solid',
  borderBottomWidth: cssVar('border-width.thin'),
  borderBottomColor: cssVar('color.border.default'),
  background: cssVar('color.surface.raised'),
};

const mailSubjectStyle: CSSProperties = {
  ...typography('typography.title.md'),
  color: cssVar('color.text.default'),
  overflowWrap: 'anywhere',
};

const mailFromStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
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
  minBlockSize: `calc(${cssVar('space.6')} * 4)`,
};

const mailEmptyBodyStyle: CSSProperties = {
  ...mailBodyStyle,
  color: cssVar('color.text.muted'),
};

const mailFooterStyle: CSSProperties = {
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
};

const unsubStyle: CSSProperties = {
  textDecorationLine: 'underline',
  color: cssVar('color.text.muted'),
};

const previewNoteStyle: CSSProperties = {
  ...hintStyle,
  marginTop: cssVar('space.3'),
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰만으로 조립하고 aria 로 잇는다) ────── */

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

/* ── 구독자 세그먼트 선택(실화면 SegmentPicker 미러 — 묶음 이름이 필수를 싣는다 · A11Y-11) ────── */

function SegmentPicker({
  selectedIds,
  onToggle,
  disabled,
  error,
}: {
  readonly selectedIds: readonly string[];
  readonly onToggle: (id: string, checked: boolean) => void;
  readonly disabled: boolean;
  readonly error: string;
}) {
  const noteId = useId();
  const selected = new Set(selectedIds);
  const invalid = error !== '';
  const total = totalRecipients(selectedIds);

  return (
    <div style={fieldStyle}>
      <span style={fieldLabelStyle}>
        구독자 세그먼트
        <span aria-hidden="true"> *</span>
      </span>

      <ul
        style={segmentListStyle}
        role="group"
        aria-label="구독자 세그먼트 (필수)"
        aria-describedby={noteId}
      >
        {SEGMENTS.map((segment) => (
          <li key={segment.id} style={segmentItemStyle}>
            <Checkbox
              id={`nl-segment-${segment.id}`}
              label={`${segment.label} · ${segment.description}`}
              checked={selected.has(segment.id)}
              disabled={disabled}
              onChange={(event) => onToggle(segment.id, event.target.checked)}
            />
            <span style={segmentCountStyle}>
              {`${segment.recipientCount.toLocaleString('ko-KR')}명`}
            </span>
          </li>
        ))}
      </ul>

      {invalid ? (
        <p id={noteId} role="alert" style={errorTextStyle}>
          {error}
        </p>
      ) : (
        <p id={noteId} style={hintStyle}>
          선택 대상 <span style={segmentTotalStyle}>{`${total.toLocaleString('ko-KR')}명`}</span> —
          중복 수신자는 발송 시 1회로 합산돼요.
        </p>
      )}
    </div>
  );
}

/* ── 이메일 미리보기(실화면 EmailPreview → MailFrame 미러 — 수신거부는 항상 포함) ───────────── */

function EmailPreview({
  subject,
  sender,
  body,
}: {
  readonly subject: string;
  readonly sender: DemoSender | undefined;
  readonly body: string;
}) {
  const renderedSubject = applyVariableSamples(subject);
  const renderedBody = applyVariableSamples(body);
  const emptyBody = renderedBody.trim() === '';

  return (
    <div style={mailFrameStyle} aria-label="이메일 미리보기">
      <div style={mailHeaderStyle}>
        <span style={mailSubjectStyle}>
          {renderedSubject.trim() === '' ? '(제목 미입력)' : renderedSubject}
        </span>
        <span style={mailFromStyle}>
          보낸사람: {sender === undefined ? '(발신자 미선택)' : `${sender.name} <${sender.email}>`}
        </span>
      </div>

      {emptyBody ? (
        <div style={mailEmptyBodyStyle}>(본문 미입력)</div>
      ) : (
        <div style={mailBodyStyle}>{renderedBody}</div>
      )}

      <div style={mailFooterStyle}>
        {sender !== undefined && !sender.verified ? (
          <StatusBadge tone="danger" label="미검증 발신자 — 발송할 수 없어요" />
        ) : (
          <span>
            본 메일을 원치 않으시면 <span style={unsubStyle}>수신거부</span> 하실 수 있습니다.
          </span>
        )}
      </div>
    </div>
  );
}

/* ── 제어형 화면(rules-of-hooks 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface NewsletterFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — useCrudForm loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 상세 조회 실패 — 404 와 서버 오류는 복구 수단이 다르다(EXC-12) */
  readonly loadFailure?: LoadFailure | null;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: FormValues;
}

function NewsletterFormScreen({
  isEdit = false,
  loadingDetail = false,
  loadFailure = null,
  errors = {},
  seed = EMPTY_SEED,
}: NewsletterFormScreenProps) {
  const [values, setValues] = useState<FormValues>(seed);
  const [templatePick, setTemplatePick] = useState(NO_TEMPLATE);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]): void => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSegment = (id: string, checked: boolean): void => {
    setValues((prev) => ({
      ...prev,
      segmentIds: checked
        ? [...prev.segmentIds, id]
        : prev.segmentIds.filter((value) => value !== id),
    }));
  };

  const insertVariable = (token: string): void => {
    setValues((prev) => ({ ...prev, body: `${prev.body}${token}` }));
  };

  const applyTemplate = (id: string): void => {
    setTemplatePick(id);
    if (id === NO_TEMPLATE) return;
    const picked = EMAIL_TEMPLATES.find((template) => template.id === id);
    if (picked === undefined) return;
    setValues((prev) => ({
      ...prev,
      title: prev.title.trim() === '' ? picked.title : prev.title,
      body: picked.body,
    }));
  };

  const disabled = loadingDetail;
  const hasErrors = Object.keys(errors).length > 0;
  const sender = SENDER_BY_ID[values.senderId];
  const recipients = totalRecipients(values.segmentIds);

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 삭제된 회차에 '다시 시도' 를 권하지 않는다
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '뉴스레터를 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '뉴스레터를 불러오지 못했어요.'}
            </span>
            {loadFailure === 'error' && (
              <Button variant="secondary" size="sm">
                다시 시도
              </Button>
            )}
            <Button variant="secondary" size="sm">
              목록으로
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={backLinkStyle}>
        <Button variant="ghost" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>
      </div>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '뉴스레터 수정' : '뉴스레터 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 회차번호는 저장 시 자동 부여되며, 수신거부 링크는 항상 포함돼요.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate style={formStyle}>
        {/* 서버 오류 배너 — 실화면 FormServerError 의 자리 */}
        {hasErrors && (
          <Alert tone="danger">
            입력한 내용을 다시 확인하세요. 표시된 항목을 수정해야 저장돼요.
          </Alert>
        )}

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <FormCard title="발송 정보">
              {loadingDetail ? (
                <div style={skeletonBodyStyle} aria-busy="true">
                  {[0, 1, 2].map((row) => (
                    <Skeleton key={`sender-${String(row)}`} />
                  ))}
                </div>
              ) : (
                <>
                  <TextField
                    id="nl-title"
                    label="제목"
                    required
                    value={values.title}
                    onChange={(event) => set('title', event.target.value)}
                    maxLength={NEWSLETTER_TITLE_MAX}
                    placeholder="예: 스페이스플래닝 7월 뉴스레터"
                    disabled={disabled}
                    error={errors.title ?? ''}
                  />
                  <FormField
                    htmlFor="nl-sender"
                    label="발신자"
                    required
                    {...(errors.senderId !== undefined && { error: errors.senderId })}
                  >
                    <SelectField
                      id="nl-sender"
                      value={values.senderId}
                      disabled={disabled}
                      isInvalid={errors.senderId !== undefined}
                      onChange={(event) => set('senderId', event.target.value)}
                    >
                      <option value="">발신자 선택</option>
                      {SENDERS.map((item) => (
                        <option key={item.id} value={item.id} disabled={!item.verified}>
                          {`${item.name} <${item.email}>${item.verified ? '' : ' (미검증)'}`}
                        </option>
                      ))}
                    </SelectField>
                  </FormField>
                </>
              )}
            </FormCard>

            <FormCard title="구독자">
              <SegmentPicker
                selectedIds={values.segmentIds}
                onToggle={toggleSegment}
                disabled={disabled}
                error={errors.segmentIds ?? ''}
              />
            </FormCard>

            <FormCard title="본문">
              <FormField
                htmlFor="nl-template"
                label="템플릿 불러오기"
                hint="이메일 템플릿의 제목·본문을 채워요."
              >
                <SelectField
                  id="nl-template"
                  value={templatePick}
                  disabled={disabled}
                  onChange={(event) => applyTemplate(event.target.value)}
                >
                  <option value={NO_TEMPLATE}>템플릿 선택 안 함</option>
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
                value={values.body}
                onChange={(value) => set('body', value)}
                maxLength={NEWSLETTER_BODY_MAX}
                disabled={disabled}
                placeholder="뉴스레터 본문을 입력하세요. #{이름} 등 치환변수를 넣을 수 있어요."
                rows={6}
                error={errors.body ?? ''}
              />

              <div style={fieldStyle}>
                <div style={variableBarStyle}>
                  {VARIABLE_TOKENS.map((token) => (
                    <Button
                      key={token}
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={disabled}
                      onClick={() => insertVariable(token)}
                    >
                      {token}
                    </Button>
                  ))}
                </div>
                <p style={hintStyle}>
                  치환변수 삽입 — 미리보기에서 표본값으로 치환돼요. 치환 후 길이는 수신자마다
                  달라져요.
                </p>
              </div>
            </FormCard>

            <FormCard title="발송 예약">
              <div style={formRowStyle}>
                <FormField htmlFor="nl-status" label="발송 방식" required>
                  <SelectField
                    id="nl-status"
                    value={values.status}
                    disabled={disabled}
                    onChange={(event) => set('status', event.target.value as FormSendStatus)}
                  >
                    <option value="draft">초안 저장</option>
                    <option value="scheduled">예약 발송</option>
                  </SelectField>
                </FormField>
                {values.status === 'scheduled' && (
                  <FormField
                    htmlFor="nl-scheduled"
                    label="예약 일시"
                    required
                    {...(errors.scheduledAt !== undefined && { error: errors.scheduledAt })}
                  >
                    <input
                      id="nl-scheduled"
                      type="datetime-local"
                      style={controlStyle(errors.scheduledAt !== undefined)}
                      value={values.scheduledAt}
                      disabled={disabled}
                      onChange={(event) => set('scheduledAt', event.target.value)}
                    />
                  </FormField>
                )}
              </div>
            </FormCard>
          </div>

          <FormCard title="미리보기">
            <EmailPreview subject={values.title} sender={sender} body={values.body} />
            <p style={previewNoteStyle}>
              {`구독자 ${recipients.toLocaleString('ko-KR')}명 · 오픈율/클릭율은 발송 후 집계돼요. 저장은 발송이 아니에요.`}
            </p>
          </FormCard>
        </div>

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md">
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={disabled}>
            {values.status === 'scheduled' ? '예약 저장' : '초안 저장'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 뉴스레터 구독자 세그먼트가 기본 선택되고 미리보기가 빈 메일을 보여 준다 */
export const Default: Story = {
  render: () => <NewsletterFormScreen />,
};

/** 수정: 예약 회차의 값이 채워진 폼 — 예약 일시 칸이 펼쳐지고 미리보기가 표본값으로 치환된다 */
export const Edit: Story = {
  render: () => <NewsletterFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 발송 정보 카드 본문 스켈레톤(useCrudForm loadingDetail 미러) */
export const Loading: Story = {
  render: () => <NewsletterFormScreen isEdit loadingDetail />,
};

/** 검증 오류: 제목·본문 누락 + 미검증 발신자 + 대상 0명 + 과거 예약 → 배너 + 인라인 오류 */
export const ValidationError: Story = {
  render: () => <NewsletterFormScreen errors={DEMO_ERRORS} seed={INVALID_SEED} />,
};

/** 조회 실패(404): 이미 삭제된 회차 — '다시 시도' 대신 '목록으로' 만 준다(EXC-12) */
export const LoadFailure: Story = {
  render: () => <NewsletterFormScreen isEdit loadFailure="not-found" />,
};
