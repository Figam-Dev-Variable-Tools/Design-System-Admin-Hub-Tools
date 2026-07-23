/**
 * Design System/Templates/Marketing/Message Template Editor — 메시지 템플릿 편집기 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/marketing/templates/new` → 메뉴 en = "Marketing"(마케팅 관리),
 * 화면 en = "Templates" (packages/ui/pages/_data/pages.ts 의 Marketing 그룹
 * `['/marketing/templates', '발송 템플릿 관리', 'Templates']` 의 등록/수정 화면).
 *
 * 대응 실화면: apps/admin/src/pages/marketing/message-templates/MessageTemplateEditorPage.tsx
 * (라우트 /marketing/templates/new?kind=… · /marketing/templates/:id/edit). 그 파일 자체는 **라우터**다 —
 * 종류(문자·이메일·알림톡·브랜드 메시지)를 보고 편집기를 고를 뿐이라, 이 템플릿은 기본 종류인
 * **문자 편집기**(TextTemplateEditor + TemplateEditorShell)를 재현한다.
 *
 * [이 화면의 골격] 공용 껍데기(TemplateEditorShell)가 머리를 갖는다: 뒤로 · 편집 가능한 큰 제목 ·
 * 등급 칩 · [취소][초안 저장][발행]. 본문은 3단이다: 좌(발신 프로필) / 중앙(툴바 · 제목 · 본문 ·
 * 첨부 이미지) / 우(휴대폰 미리보기). 좌·우 패널은 툴바에서 접을 수 있다.
 *
 * [화면이 드러내야 하는 두 숫자] 편집 중 바이트와 **치환 후** 바이트다 — `#{이름}` 은 편집기에서
 * 7byte 지만 발송될 때는 사람 이름이 들어간다. 등급이 갈리면 건당 과금이 갈리므로 그때는 안내가
 * 아니라 경고여야 한다. 제목을 한 글자라도 적으면 90byte 안이어도 LMS 로 승격되는 것도 같은 이유로
 * 화면에 적는다.
 *
 * [저장 버튼이 왜 처음부터 회색인가] 목업의 규칙이다 — 폼이 유효하기 전에는 '초안 저장' 도 '발행' 도
 * 잠겨 있다. 잠긴 이유는 각 입력 옆 인라인 오류가 말한다(버튼 옆에 다시 적지 않는다).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면의 앱 조각을 DS 표면으로 갈음한다:
 *   TemplateEditorShell   → 토큰 헤더 + 제목 input(controlStyle) + Button 묶음
 *   EditorToolbar         → IconButton(collapse-left/right · undo · redo · download) + Button 칩
 *   ContentInputCard      → Card + 토큰 <label> + textarea(controlStyle) + 카운터
 *   InfoCallout           → 토큰만 쓴 안내 상자(Alert 와 다른 물건 — '항상 참인 제약' 이다)
 *   SenderProfileCard     → Card + FormField + SelectField
 *   TextPreviewCard       → Card + 토큰 휴대폰 프레임 + StatusBadge(등급)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   제목(템플릿명) 입력        → 토큰 input + 오류 <p>(라벨은 aria-label 로만 — 제목이 둘이 되지 않게)
 *   등급 칩(SMS/LMS/MMS ▾)     → SelectField(대행사 회선) + 토큰 <span>(현재 등급 · 치환 후 등급)
 *   취소 / 초안 저장 / 발행 / 저장 → Button(secondary/secondary/primary)
 *   패널 접기 · 되돌리기 · 내려받기 → IconButton
 *   치환변수 삽입              → Button(secondary·sm) 칩 줄
 *   제목 · 본문 · 첨부          → 토큰 input/textarea + Button(secondary)
 *   미리보기                   → Card + 토큰 프레임 + StatusBadge
 *   조회 실패                  → Alert(danger) + Button(secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Button,
  Card,
  FormField,
  Icon,
  IconButton,
  SelectField,
  StatusBadge,
  cssVar,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Marketing/Message Template Editor',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수(실화면 types · copy · _shared/messaging 미러) ────────────────────────────────────── */

const TEXT_BODY_MAX = 2000;
/** 제목 상한 — LMS·MMS 만 갖는다. 40 byte (한글 20자 / 영문 40자) */
const LMS_SUBJECT_MAX_BYTES = 40;
const SMS_PROMOTION_THRESHOLD = 90;
const LMS_MAX_BYTES = 2000;

type SmsKind = 'sms' | 'lms' | 'mms';
type TextMessageVendor = 'SureM' | 'NHN' | 'Solapi';

const SMS_KIND_LABEL: Record<SmsKind, string> = { sms: 'SMS', lms: 'LMS', mms: 'MMS' };
const VENDORS: readonly TextMessageVendor[] = ['SureM', 'NHN', 'Solapi'];
const CHANNEL_CHIP_LABEL = 'SMS/LMS/MMS';

/** 발신 프로필 후보 — 실화면 listSenderProfiles(발신 자격이 있는 운영진 그룹) 미러 */
const SENDER_PROFILES: readonly {
  readonly id: string;
  readonly name: string;
  readonly phones: readonly string[];
}[] = [
  { id: 'sp-brand', name: '스페이스플래닝 대표', phones: ['1588-1234', '02-577-1000'] },
  { id: 'sp-marketing', name: '마케팅센터', phones: ['02-577-1000', '070-1234-5678'] },
  { id: 'sp-support', name: '고객지원센터', phones: ['1588-1234'] },
];

const VARIABLE_TOKENS: readonly string[] = ['#{이름}', '#{주문번호}', '#{쿠폰명}', '#{적립금}'];

/** 본문 입력 위 콜아웃 — 길이 등급·이미지 승격·변수 여유분(실화면 BODY_CALLOUT_LINES) */
const BODY_CALLOUT_LINES: readonly string[] = [
  `SMS : 90자 이내 / LMS, MMS : ${String(TEXT_BODY_MAX)}자 이내`,
  '이미지를 첨부하면 MMS로 발송돼요.',
  '치환변수 자리에 들어갈 내용에 따라 실제 발송 글자 수가 달라지므로, 템플릿을 작성할 때 20~30자 정도 여유를 두세요.',
];

/** 제목 칸 콜아웃 — 이 칸이 단가를 바꾼다는 사실을 입력 옆에서 말한다 */
const SUBJECT_CALLOUT_LINES: readonly string[] = [
  'SMS 에는 제목 칸이 없어요.',
  '제목을 입력하면 90 byte 이하여도 LMS 로 발송돼요.',
];

/** 첨부 이미지 콜아웃 — 장수·확장자·용량·픽셀 */
const IMAGE_CALLOUT_LINES: readonly string[] = [
  '이미지는 한 장만 등록할 수 있어요.',
  '첨부할 수 있는 이미지 형식은 JPG 예요.',
  '500KB 이하 이미지만 첨부할 수 있어요.',
  '크기는 1000×1000 이하여야 해요.',
];

/* ── 순수 규칙(실화면 _shared/messaging 미러) ─────────────────────────────────────────────── */

const byteLengthOf = (text: string): number =>
  [...text].reduce((sum, char) => sum + ((char.codePointAt(0) ?? 0) > 0x7f ? 2 : 1), 0);

const classifySms = (bytes: number, hasImage: boolean, hasSubject: boolean): SmsKind => {
  if (hasImage) return 'mms';
  return bytes <= SMS_PROMOTION_THRESHOLD && !hasSubject ? 'sms' : 'lms';
};

const smsByteLimit = (kind: SmsKind): number =>
  kind === 'sms' ? SMS_PROMOTION_THRESHOLD : LMS_MAX_BYTES;

/** 치환변수를 표본값으로 바꾼다 — 미리보기·치환 후 길이가 같은 규칙을 쓴다 */
const VARIABLE_SAMPLES: Record<string, string> = {
  '#{이름}': '명재우',
  '#{주문번호}': '20260721-0031',
  '#{쿠폰명}': '여름맞이 15% 쿠폰',
  '#{적립금}': '12,400',
};

const applyVariableSamples = (text: string): string =>
  Object.entries(VARIABLE_SAMPLES).reduce(
    (acc, [token, sample]) => acc.split(token).join(sample),
    text,
  );

/** 길이를 바꾸는 변수가 본문에 있는가 — 있으면 '치환 후' 숫자를 함께 보여 준다 */
const hasLengthShiftingVariables = (text: string): boolean =>
  Object.keys(VARIABLE_SAMPLES).some((token) => text.includes(token));

/* ── 데모 시드(실화면 store 픽스처 mt-text-* 를 폼 값으로 되돌린 형태) ─────────────────────── */

interface SeedValues {
  readonly name: string;
  readonly senderProfileId: string;
  readonly senderPhone: string;
  readonly vendor: TextMessageVendor;
  readonly subject: string;
  readonly body: string;
  readonly imageFileName: string;
}

const EMPTY_SEED: SeedValues = {
  name: '',
  senderProfileId: '',
  senderPhone: '',
  vendor: 'SureM',
  subject: '',
  body: '',
  imageFileName: '',
};

/** 발행본을 수정하는 중 — 헤더에 '초안 저장' 이 없고 [저장] 하나만 남는다 */
const PUBLISHED_SEED: SeedValues = {
  name: '봄맞이 쿠폰 안내(종료)',
  senderProfileId: 'sp-marketing',
  senderPhone: '02-577-1000',
  vendor: 'NHN',
  subject: '봄맞이 쿠폰 도착',
  body: '(광고) #{이름}님, 봄맞이 #{쿠폰명} 쿠폰이 도착했습니다. 무료수신거부 080-123-4567',
  imageFileName: 'spring-coupon.jpg',
};

/** 검증 오류 데모 — 실화면 zod 스키마(message-templates/validation)의 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly name?: string;
  readonly senderProfileId?: string;
  readonly senderPhone?: string;
  readonly subject?: string;
  readonly body?: string;
}

const DEMO_ERRORS: FieldErrors = {
  name: '템플릿명을 입력하세요.',
  senderProfileId: '발신 프로필을 선택하세요.',
  senderPhone: '발신번호를 선택하세요.',
  body: '메시지 내용을 입력해 주세요.',
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

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.4'),
  flexWrap: 'wrap',
  minWidth: 0,
};

const headingColumnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  flexGrow: 1,
  minWidth: 0,
};

const eyebrowStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
};

/** 제목 입력 — 큰 굵은 글씨. 테두리는 포커스 전까지 없는 것처럼 보이게 표면만 눕힌다 */
const titleInputStyle = (invalid: boolean): CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: invalid ? cssVar('color.feedback.danger.border') : 'transparent',
  borderRadius: cssVar('radius.md'),
  background: 'transparent',
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
});

const headerActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const chipRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

/** 제목 아래 보라 pill — 정보이자 선택 가능한 컨트롤이라 pill 폭의 select 로 그린다 */
const chipWrapStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 7)`,
};

const gradeStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

/** 치환 후 등급이 갈릴 때 — 건당 과금이 달라지므로 흐린 회색으로 흘려보내지 않는다 */
const gradeShiftStyle: CSSProperties = {
  ...gradeStyle,
  color: cssVar('color.feedback.warning.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

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

const accentTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.action.primary.default'),
};

/** 카드 제목보다 한 단 아래 — 색으로 구역의 시작을 알린다(목업의 보라 소제목) */
const sectionHeadingStyle: CSSProperties = {
  ...typography('typography.label.md'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  color: cssVar('color.action.primary.default'),
  margin: 0,
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/** 안내 콜아웃 — Alert(방금 일어난 일)와 다른 물건이다. '항상 참인 제약' 을 적어 둔다 */
const calloutStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.feedback.info.surface'),
  color: cssVar('color.feedback.info.text'),
  minWidth: 0,
};

const calloutListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  margin: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: cssVar('space.4'),
  paddingRight: 0,
  ...typography('typography.caption.md'),
  overflowWrap: 'anywhere',
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

/** 목업의 본문 상자 — 16줄 남짓. 카운터가 마지막 줄을 덮지 않도록 아래 여백을 넓힌다 */
const textareaStyle = (invalid: boolean): CSSProperties => ({
  ...controlStyle(invalid),
  minHeight: `calc(${cssVar('space.10')} * 8)`,
  paddingBottom: cssVar('space.7'),
  resize: 'vertical',
  ...typography('typography.body.md'),
});

const fieldWrapStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

/** 입력 안쪽 우하단 — 상자를 기준으로 절대 배치한다 */
const counterStyle: CSSProperties = {
  position: 'absolute',
  right: cssVar('space.3'),
  bottom: cssVar('space.2'),
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none',
};

/** 제목 칸의 바이트 카운터 — 본문 카운터가 글자를 세는 것과 다른 축이다(제목은 byte 규격) */
const subjectCounterStyle: CSSProperties = {
  alignSelf: 'flex-end',
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  fontVariantNumeric: 'tabular-nums',
};

const errorTextStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.feedback.danger.text'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const toolbarSpacerStyle: CSSProperties = { flexGrow: 1 };

const imageRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const imageNameStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
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

/** 치환변수 토큰은 미리보기에서 강조한다 — 치환하지 않고 '여기에 값이 들어간다' 를 보인다 */
const variableTokenStyle: CSSProperties = {
  borderRadius: cssVar('radius.sm'),
  background: cssVar('color.feedback.info.surface'),
  color: cssVar('color.feedback.info.text'),
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

/* ── 조각 컴포넌트 ────────────────────────────────────────────────────────────────────────── */

function EditorCard({ title, children }: { title?: string; children: ReactNode }) {
  const titleId = useId();
  return (
    <Card {...(title !== undefined && { 'aria-labelledby': titleId })}>
      <div style={cardBodyStyle}>
        {title !== undefined && (
          <h2 id={titleId} style={accentTitleStyle}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </Card>
  );
}

function InfoCallout({ lines }: { readonly lines: readonly string[] }) {
  return (
    <div style={calloutStyle}>
      <Icon name="file-text" />
      <ul style={calloutListStyle}>
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

/** 본문을 토큰 단위로 잘라 `#{...}` 만 강조한다 — 실화면 VariableText 미러 */
function VariableText({ body }: { readonly body: string }) {
  const parts = body.split(/(#\{[^}]+\})/g);
  return (
    <>
      {parts.map((part, index) =>
        /^#\{[^}]+\}$/.test(part) ? (
          <span key={`${part}-${String(index)}`} style={variableTokenStyle}>
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface EditorScreenProps {
  /** 발행본을 고치는 중인가 — 헤더 액션이 [저장] 하나로 줄어든다 */
  readonly editingPublished?: boolean;
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
  /** 좌·우 패널 접힘 — 툴바의 collapse 버튼이 소유하는 상태 */
  readonly initialLeftCollapsed?: boolean;
  readonly initialRightCollapsed?: boolean;
}

function MessageTemplateEditorScreen({
  editingPublished = false,
  errors = {},
  seed = EMPTY_SEED,
  initialLeftCollapsed = false,
  initialRightCollapsed = false,
}: EditorScreenProps) {
  const [name, setName] = useState(seed.name);
  const [senderProfileId, setSenderProfileId] = useState(seed.senderProfileId);
  const [senderPhone, setSenderPhone] = useState(seed.senderPhone);
  const [vendor, setVendor] = useState<TextMessageVendor>(seed.vendor);
  const [subject, setSubject] = useState(seed.subject);
  const [body, setBody] = useState(seed.body);
  const [imageFileName, setImageFileName] = useState(seed.imageFileName);
  const [leftCollapsed, setLeftCollapsed] = useState(initialLeftCollapsed);
  const [rightCollapsed, setRightCollapsed] = useState(initialRightCollapsed);
  /** 본문 되돌리기 이력 — 치환변수 삽입은 textarea 의 네이티브 undo 스택에 들어가지 않는다 */
  const [past, setPast] = useState<readonly string[]>([]);
  const [future, setFuture] = useState<readonly string[]>([]);

  const commitBody = (next: string): void => {
    setPast((stack) => [...stack, body]);
    setFuture([]);
    setBody(next);
  };

  const undo = (): void => {
    const previous = past.at(-1);
    if (previous === undefined) return;
    setPast((stack) => stack.slice(0, -1));
    setFuture((stack) => [body, ...stack]);
    setBody(previous);
  };

  const redo = (): void => {
    const next = future[0];
    if (next === undefined) return;
    setFuture((stack) => stack.slice(1));
    setPast((stack) => [...stack, body]);
    setBody(next);
  };

  const hasImage = imageFileName.trim() !== '';
  const hasSubject = subject.trim() !== '';
  const bytes = byteLengthOf(body);
  const grade = classifySms(bytes, hasImage, hasSubject);
  const subjectBytes = byteLengthOf(subject);

  /* 편집 중 글자와 발송되는 글자는 구조적으로 다르다 — 두 숫자를 함께 보여 준다 */
  const hasVariables = hasLengthShiftingVariables(body);
  const sampleBytes = byteLengthOf(applyVariableSamples(body));
  const sampleGrade = classifySms(sampleBytes, hasImage, hasSubject);
  const gradeShifts = hasVariables && sampleGrade !== grade;

  const profile = SENDER_PROFILES.find((item) => item.id === senderProfileId);
  const valid = name.trim() !== '' && body.trim() !== '' && senderProfileId !== '';

  return (
    <div style={pageStyle}>
      <span style={backRowStyle}>
        <Button variant="ghost" size="md" iconLeft={<Icon name="chevron-left" />}>
          목록으로
        </Button>
      </span>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <div style={headerStyle}>
          <div style={headingColumnStyle}>
            {editingPublished && <span style={eyebrowStyle}>문자 템플릿</span>}

            {/* 라벨은 보이지 않는다 — 큰 제목 칸 위에 '템플릿명' 을 또 적으면 제목이 둘이 된다 */}
            <input
              id="message-template-name"
              type="text"
              style={titleInputStyle(errors.name !== undefined)}
              value={name}
              placeholder="템플릿명을 입력하세요"
              aria-label="템플릿명"
              aria-invalid={errors.name !== undefined}
              onChange={(event) => setName(event.target.value)}
            />
            {errors.name !== undefined && (
              <p style={errorTextStyle} role="alert">
                {errors.name}
              </p>
            )}

            <div style={chipRowStyle}>
              {/* 고를 수 있는 것은 대행사 회선이다 — 등급은 길이·이미지가 정하므로 옆에 함께 적는다 */}
              <span style={chipWrapStyle}>
                <SelectField
                  value={vendor}
                  aria-label={`${CHANNEL_CHIP_LABEL} 발송 회선`}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setVendor(VENDORS.find((item) => item === raw) ?? 'SureM');
                  }}
                >
                  {VENDORS.map((item) => (
                    <option key={item} value={item}>
                      {`${CHANNEL_CHIP_LABEL} · ${item}`}
                    </option>
                  ))}
                </SelectField>
              </span>
              <span style={gradeStyle}>
                {`현재 등급 ${SMS_KIND_LABEL[grade]} · ${String(bytes)} byte`}
              </span>
              {hasVariables && (
                <span style={gradeShifts ? gradeShiftStyle : gradeStyle}>
                  {`치환 후 ${SMS_KIND_LABEL[sampleGrade]} · ${String(sampleBytes)} byte (표본 기준 — 수신자마다 달라져요)`}
                </span>
              )}
            </div>
          </div>

          <div style={headerActionsStyle}>
            <Button type="button" variant="secondary" size="md">
              취소
            </Button>
            {editingPublished ? (
              // 이미 발행된 것에는 '초안으로 저장' 이 없다 — 발행을 되돌리는 길은 사용 여부 토글이다
              <Button type="submit" variant="primary" size="md" disabled={!valid}>
                저장
              </Button>
            ) : (
              <>
                <Button type="submit" variant="secondary" size="md" disabled={!valid}>
                  초안 저장
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={!valid}>
                  발행
                </Button>
              </>
            )}
          </div>
        </div>

        <div style={threeColumnStyle}>
          {!leftCollapsed && (
            <div style={sideColumnStyle}>
              <EditorCard title="발신 프로필">
                <FormField
                  htmlFor="message-template-sender-profile"
                  label="발신 프로필"
                  required
                  {...(errors.senderProfileId !== undefined && { error: errors.senderProfileId })}
                >
                  <SelectField
                    id="message-template-sender-profile"
                    value={senderProfileId}
                    isInvalid={errors.senderProfileId !== undefined}
                    onChange={(event) => {
                      setSenderProfileId(event.target.value);
                      // 프로필이 바뀌면 이전 번호는 그 프로필의 것이 아니다 — 비우고 다시 고르게 한다
                      setSenderPhone('');
                    }}
                  >
                    <option value="">발신 프로필을 선택하세요</option>
                    {SENDER_PROFILES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                {/* 후보는 고른 프로필의 것만 보인다 — 조합의 유효성은 이 칸에서 닫는다 */}
                <FormField
                  htmlFor="message-template-sender-phone"
                  label="발신번호"
                  required
                  {...(errors.senderPhone !== undefined && { error: errors.senderPhone })}
                >
                  <SelectField
                    id="message-template-sender-phone"
                    value={senderPhone}
                    isInvalid={errors.senderPhone !== undefined}
                    onChange={(event) => setSenderPhone(event.target.value)}
                  >
                    <option value="">0123456789</option>
                    {(profile?.phones ?? []).map((phone) => (
                      <option key={phone} value={phone}>
                        {phone}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </EditorCard>
            </div>
          )}

          <div style={centerColumnStyle}>
            <EditorCard>
              <div style={toolbarStyle}>
                <IconButton
                  label={leftCollapsed ? '발신 프로필 펼치기' : '발신 프로필 접기'}
                  icon={<Icon name="collapse-left" />}
                  pressed={leftCollapsed ? 'on' : 'off'}
                  onClick={() => setLeftCollapsed((value) => !value)}
                />
                <IconButton
                  label="되돌리기"
                  icon={<Icon name="undo" />}
                  disabled={past.length === 0}
                  onClick={undo}
                />
                <IconButton
                  label="다시 실행"
                  icon={<Icon name="redo" />}
                  disabled={future.length === 0}
                  onClick={redo}
                />
                <IconButton label="본문 내려받기" icon={<Icon name="download" />} />
                <span style={toolbarSpacerStyle} />
                <IconButton
                  label={rightCollapsed ? '미리보기 펼치기' : '미리보기 접기'}
                  icon={<Icon name="collapse-right" />}
                  pressed={rightCollapsed ? 'on' : 'off'}
                  onClick={() => setRightCollapsed((value) => !value)}
                />
              </div>

              {/* ── 제목 — 본문 위에 둔다. 수신 화면에서 제목이 본문 위에 붙기 때문이다 ── */}
              <section style={sectionStyle}>
                <label htmlFor="message-template-subject" style={sectionHeadingStyle}>
                  제목 (LMS/MMS 전용)
                </label>
                <InfoCallout lines={SUBJECT_CALLOUT_LINES} />
                <input
                  id="message-template-subject"
                  type="text"
                  style={controlStyle(errors.subject !== undefined)}
                  value={subject}
                  placeholder="제목을 입력하세요"
                  onChange={(event) => setSubject(event.target.value)}
                />
                {/* 제목은 byte 로 잰다 — 아래 본문 카운터가 글자를 세는 것과 다른 축이다 */}
                <span style={subjectCounterStyle}>
                  {`${String(subjectBytes)} / ${String(LMS_SUBJECT_MAX_BYTES)} byte`}
                </span>
              </section>

              {/* ── 본문 ── */}
              <section style={sectionStyle}>
                <label htmlFor="message-template-body" style={sectionHeadingStyle}>
                  내용 입력 *
                </label>
                <InfoCallout lines={BODY_CALLOUT_LINES} />

                <div style={chipRowStyle}>
                  <span style={gradeStyle}>치환변수</span>
                  {VARIABLE_TOKENS.map((token) => (
                    <Button
                      key={token}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => commitBody(`${body}${token}`)}
                    >
                      {token}
                    </Button>
                  ))}
                </div>

                <div style={fieldWrapStyle}>
                  <textarea
                    id="message-template-body"
                    style={textareaStyle(errors.body !== undefined)}
                    value={body}
                    maxLength={TEXT_BODY_MAX}
                    required
                    aria-required="true"
                    aria-invalid={errors.body !== undefined}
                    placeholder={
                      errors.body === undefined
                        ? '메시지 내용을 입력하세요.'
                        : '메시지 내용을 입력해 주세요.'
                    }
                    onChange={(event) => commitBody(event.target.value)}
                  />
                  {/* 글자 수로 센다 — 카운터가 '자' 라고 말하는 그대로다(등급은 바이트로 가른다) */}
                  <span style={counterStyle}>
                    {`(${String(body.length)} / ${String(TEXT_BODY_MAX)}자)`}
                  </span>
                </div>

                {errors.body !== undefined && (
                  <p style={errorTextStyle} role="alert">
                    {errors.body}
                  </p>
                )}
              </section>

              {/* ── 첨부 이미지 ── */}
              <section style={sectionStyle}>
                <h3 style={sectionHeadingStyle}>이미지 첨부</h3>
                <InfoCallout lines={IMAGE_CALLOUT_LINES} />
                <div style={imageRowStyle}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    iconLeft={<Icon name="upload" />}
                    onClick={() => setImageFileName('spring-coupon.jpg')}
                  >
                    이미지 선택
                  </Button>
                  <span style={imageNameStyle}>
                    {hasImage ? imageFileName : '이미지를 업로드하세요'}
                  </span>
                  {hasImage && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setImageFileName('')}
                    >
                      첨부 해제
                    </Button>
                  )}
                </div>
              </section>
            </EditorCard>
          </div>

          {!rightCollapsed && (
            <div style={sideColumnStyle}>
              <EditorCard title="미리보기">
                <div style={phoneStyle}>
                  <span style={notchStyle} />
                  <p style={senderLineStyle}>
                    {senderPhone === '' ? '(발신번호 미선택)' : senderPhone}
                  </p>
                  <div style={bubbleStyle}>
                    {hasImage && (
                      <span style={imageSlotStyle}>
                        <Icon name="image" />
                      </span>
                    )}
                    {/* SMS 에는 제목 칸이 없다 — 등급이 제목을 보여 줄지 정한다 */}
                    {grade !== 'sms' && hasSubject && (
                      <span style={bubbleSubjectStyle}>{subject}</span>
                    )}
                    {body.trim() === '' ? '(본문 미입력)' : <VariableText body={body} />}
                  </div>
                  <div style={previewMetaStyle}>
                    <StatusBadge
                      tone={bytes > SMS_PROMOTION_THRESHOLD ? 'warning' : 'info'}
                      label={SMS_KIND_LABEL[grade]}
                    />
                    <span>{`${String(bytes)} / ${String(smsByteLimit(grade))} byte`}</span>
                  </div>
                </div>
              </EditorCard>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 편집기 — 저장·발행은 유효해질 때까지 잠겨 있다(목업 규칙) */
export const Default: Story = {
  render: () => <MessageTemplateEditorScreen />,
};

/**
 * 수정(발행본): 헤더가 [취소][저장] 로 줄고 눈썹에 '문자 템플릿' 이 붙는다.
 * 첨부 이미지가 있어 MMS 이고, 치환변수가 있어 '치환 후' 바이트가 함께 보인다.
 */
export const Edit: Story = {
  render: () => <MessageTemplateEditorScreen editingPublished seed={PUBLISHED_SEED} />,
};

/** 패널 접힘: 툴바의 collapse 버튼으로 좌·우를 접어 본문에 폭을 몰아준 상태 */
export const Collapsed: Story = {
  render: () => (
    <MessageTemplateEditorScreen seed={PUBLISHED_SEED} initialLeftCollapsed initialRightCollapsed />
  ),
};

/** 검증 오류: 템플릿명·발신 프로필·발신번호·본문이 비어 인라인 오류 + 자리표시자 교체 */
export const ValidationError: Story = {
  render: () => <MessageTemplateEditorScreen errors={DEMO_ERRORS} />,
};
