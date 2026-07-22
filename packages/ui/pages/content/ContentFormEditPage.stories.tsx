/**
 * Design System/Templates/Content/Form Editor — 폼 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/forms/new` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en =
 * "Forms" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의
 * `['/content/forms', '폼 관리', 'Forms']`. 등록/수정은 그 목록의 하위 라우트다).
 *
 * 대응 실화면: apps/admin/src/pages/content/forms/ContentFormEditPage.tsx
 * (라우트 /content/forms/new · /content/forms/:id/edit) 와 항목 편집기
 * (components/FormFieldEditor.tsx) · 규칙(types.ts) · 공용 껍데기(shared/crud/FormPageShell).
 *
 * [개인정보 동의는 **다른 종류**다 — 이 화면에서 가장 중요한 판단] 겉보기에 동의 체크박스는
 * checkbox 다. 그런데 그 항목은 ① 반드시 필수이고 ② 숨길 수 없고 ③ 동의 이력이 따로 남아야 한다 —
 * 법적 요구가 다르다. checkbox 로 두면 운영자가 필수를 끄거나 숨기는 순간 **동의 없이 개인정보를
 * 수집하는 폼**이 되고, 그 사실을 아무도 알아채지 못한다. 그래서 타입을 갈라 규칙을 붙일 자리를
 * 만들었고, 화면은 그 규칙을 **토글의 disabled 와 그 옆 문장에 그대로 옮길 뿐**이다.
 * 동의 항목은 폼당 하나다 — 두 개면 어느 것이 그 폼의 동의인지 이력이 답할 수 없다.
 *
 * [발행 후에는 항목을 지우지 않는다 — 숨김만] 지우면 이미 들어온 응답의 그 칸이 **어느 질문에
 * 대한 답인지 알 수 없는 값**이 된다(고아). 숨기면 새 응답에는 나오지 않고 지난 응답은 계속
 * 읽힌다. 그래서 삭제 버튼은 초안일 때만 열린다 — 불편이 아니라 보호다.
 *
 * [발행은 문이다] 항목이 없거나, 수신 담당자가 없거나, 개인정보 동의 항목이 없으면 발행되지
 * 않는다. 초안에는 그 문을 걸지 않는다 — 만드는 중인 폼까지 완성을 요구하면 저장 자체를 할 수
 * 없다. 문은 **밖으로 나가는 자리**에만 세운다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계).
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   목록으로                    → 토큰 <a> + Icon(chevron-left)
 *   폼 이름                     → FormField + 토큰 <input>
 *   설명 / 수신 담당자           → TextareaField
 *   상태(초안·발행)              → FormField + SelectField
 *   발행 차단 사유               → Alert(danger)
 *   항목 카드                   → 토큰 <ul>/<li> + StatusBadge(종류 · 숨김)
 *   항목 순서 이동               → ReorderMoveButtons
 *   항목 삭제(발행 후 차단)       → 토큰 <button> + Icon(trash) — 사유를 접근 이름·title 에
 *   항목 이름 / 선택지            → 토큰 <input> · <textarea>
 *   항목 종류(동의는 잠김)        → SelectField(disabled)
 *   필수 / 노출 토글             → ToggleSwitch (동의는 둘 다 잠김 + 사유)
 *   항목 인라인 오류             → 토큰 <p role="alert">
 *   항목 추가 / 동의 항목 추가    → Button(secondary) + Icon(plus-circle · lock)
 *   저장 / 취소                 → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  FormField,
  Icon,
  ReorderMoveButtons,
  SelectField,
  StatusBadge,
  TextareaField,
  ToggleSwitch,
  cssVar,
  moveArrayItem,
  typography,
} from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Content/Form Editor',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 types.ts 미러) ─────────────────────────────────────────────────────── */

type FormFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'radio'
  | 'file';

/** 개인정보 동의 — 위 9종과 나란한 별개다(머리말) */
const CONSENT_FIELD_KIND = 'privacy-consent';

type FormFieldKind = FormFieldType | typeof CONSENT_FIELD_KIND;

const FORM_FIELD_TYPES: readonly FormFieldType[] = [
  'text',
  'email',
  'number',
  'textarea',
  'select',
  'multi-select',
  'checkbox',
  'radio',
  'file',
];

const FIELD_KIND_LABEL: Readonly<Record<FormFieldKind, string>> = {
  text: '한 줄 텍스트',
  email: '이메일',
  number: '숫자',
  textarea: '여러 줄 텍스트',
  select: '드롭다운',
  'multi-select': '드롭다운(복수)',
  checkbox: '체크박스',
  radio: '라디오',
  file: '파일 첨부',
  [CONSENT_FIELD_KIND]: '개인정보 수집·이용 동의',
};

/** 선택지를 스스로 들어야 하는 종류 — 비어 있으면 홈페이지가 빈 목록을 그린다 */
const needsOptions = (kind: FormFieldKind): boolean =>
  kind === 'select' || kind === 'multi-select' || kind === 'radio';

const isConsentKind = (kind: FormFieldKind): boolean => kind === CONSENT_FIELD_KIND;

interface DemoField {
  readonly id: string;
  readonly kind: FormFieldKind;
  readonly label: string;
  readonly required: boolean;
  readonly options: readonly string[];
  readonly hidden: boolean;
}

type ContentFormStatus = 'draft' | 'published';

const FORM_STATUS_LABEL: Readonly<Record<ContentFormStatus, string>> = {
  draft: '초안',
  published: '발행',
};

const STATUS_OPTIONS: readonly ContentFormStatus[] = ['draft', 'published'];

const FIELD_LABEL_MAX = 40;
const FORM_NAME_MAX = 40;
const FORM_DESCRIPTION_MAX = 200;
const RECIPIENTS_MAX = 500;

/* ── 순수 규칙(실화면 types.ts 의 술어 미러 — 버튼의 disabled 와 저장의 거절이 같은 함수를 읽는다) */

const FIELD_LABEL_REQUIRED = '항목 이름을 입력하세요.';
const FIELD_OPTIONS_REQUIRED = '선택지를 한 줄에 하나씩 입력하세요.';
const CONSENT_NOT_OPTIONAL =
  '개인정보 동의 항목은 필수에서 해제할 수 없습니다. 동의 없이 개인정보를 받을 수 없습니다.';
const FIELD_DELETE_PUBLISHED =
  '발행된 폼의 항목은 삭제할 수 없습니다. 숨기면 새 응답에는 나오지 않고 지난 응답은 그대로 남습니다.';
const CONSENT_HIDE_BLOCKED =
  '개인정보 동의 항목은 숨길 수 없습니다. 동의를 받지 않는 폼이 되어 버립니다.';
const CONSENT_DUPLICATE = '개인정보 동의 항목은 폼당 하나만 둘 수 있습니다.';
const PUBLISH_NO_FIELDS = '항목이 하나도 없어 발행할 수 없습니다.';
const PUBLISH_NO_CONSENT =
  '개인정보 동의 항목이 없어 발행할 수 없습니다. 이름·연락처를 받는 폼은 동의를 함께 받아야 합니다.';
const RECIPIENT_REQUIRED =
  '수신 담당자를 한 명 이상 입력하세요. 없으면 접수된 문의가 아무에게도 닿지 않습니다.';

/** 이 필드를 저장할 수 없는 이유 — 저장할 수 있으면 null */
function fieldBlock(field: DemoField): string | null {
  if (field.label.trim() === '') return FIELD_LABEL_REQUIRED;
  if (needsOptions(field.kind) && field.options.filter((o) => o.trim() !== '').length === 0) {
    return FIELD_OPTIONS_REQUIRED;
  }
  // 이것을 끄면 동의 없이 개인정보를 받는 폼이 된다
  if (isConsentKind(field.kind) && !field.required) return CONSENT_NOT_OPTIONAL;
  return null;
}

const fieldDeleteBlock = (status: ContentFormStatus): string | null =>
  status === 'published' ? FIELD_DELETE_PUBLISHED : null;

const fieldHideBlock = (field: DemoField): string | null =>
  isConsentKind(field.kind) ? CONSENT_HIDE_BLOCKED : null;

const addConsentBlock = (fields: readonly DemoField[]): string | null =>
  fields.some((field) => isConsentKind(field.kind)) ? CONSENT_DUPLICATE : null;

const activeFields = (fields: readonly DemoField[]): readonly DemoField[] =>
  fields.filter((field) => !field.hidden);

const hasConsentField = (fields: readonly DemoField[]): boolean =>
  fields.some((field) => isConsentKind(field.kind) && !field.hidden);

const parseRecipients = (raw: string): readonly string[] =>
  raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => value !== '');

/**
 * 이 폼을 발행할 수 없는 이유 — 발행할 수 있으면 null.
 * 초안에는 걸지 않는다(머리말). 문은 밖으로 나가는 자리에만 세운다.
 */
function formPublishBlock(
  status: ContentFormStatus,
  fields: readonly DemoField[],
  recipients: readonly string[],
): string | null {
  if (status !== 'published') return null;
  if (activeFields(fields).length === 0) return PUBLISH_NO_FIELDS;
  if (recipients.length === 0) return RECIPIENT_REQUIRED;
  if (!hasConsentField(fields)) return PUBLISH_NO_CONSENT;
  const invalid = fields
    .map((field) => ({ field, reason: fieldBlock(field) }))
    .find((entry) => entry.reason !== null);
  return invalid === undefined ? null : `'${invalid.field.label}' 항목 — ${invalid.reason ?? ''}`;
}

/* ── 데모 데이터(실화면 픽스처를 폼 값으로 되돌린 형태) ────────────────────────────────────── */

const CONSENT_LABEL = '개인정보 수집·이용에 동의합니다';

interface SeedValues {
  readonly name: string;
  readonly description: string;
  readonly status: ContentFormStatus;
  readonly recipients: string;
  readonly fields: readonly DemoField[];
}

const EMPTY_SEED: SeedValues = {
  name: '',
  description: '',
  status: 'draft',
  recipients: '',
  fields: [],
};

const PUBLISHED_SEED: SeedValues = {
  name: '사업 문의',
  description: '홈페이지 하단 문의 버튼이 여는 기본 폼입니다.',
  status: 'published',
  recipients: 'sales@example.com\ncs@example.com',
  fields: [
    { id: 'fd-001', kind: 'text', label: '회사명', required: true, options: [], hidden: false },
    { id: 'fd-002', kind: 'email', label: '이메일', required: true, options: [], hidden: false },
    {
      id: 'fd-005',
      kind: 'select',
      label: '문의 유형',
      required: true,
      options: ['공간 기획', '시공 관리', '데이터 분석', '기타'],
      hidden: false,
    },
    {
      id: 'fd-006',
      kind: 'textarea',
      label: '문의 내용',
      required: true,
      options: [],
      hidden: false,
    },
    {
      id: 'fd-007',
      kind: 'file',
      label: '도면·사양서 첨부',
      required: false,
      options: [],
      hidden: false,
    },
    // 숨긴 항목 — 지우지 않고 내린 것이다. 지난 응답은 이 칸의 답을 계속 갖고 있다
    { id: 'fd-107', kind: 'text', label: '추천인', required: false, options: [], hidden: true },
    {
      id: 'fd-008',
      kind: CONSENT_FIELD_KIND,
      label: CONSENT_LABEL,
      required: true,
      options: [],
      hidden: false,
    },
  ],
};

/** 발행을 고른 초안 — 동의 항목이 없어 문 앞에서 막힌다 */
const PUBLISH_BLOCKED_SEED: SeedValues = {
  name: '채용 지원',
  description: '작성 중입니다. 아직 홈페이지에 걸려 있지 않습니다.',
  status: 'published',
  recipients: 'people@example.com',
  fields: [
    { id: 'fd-201', kind: 'text', label: '이름', required: true, options: [], hidden: false },
    { id: 'fd-202', kind: 'email', label: '이메일', required: true, options: [], hidden: false },
    {
      id: 'fd-203',
      kind: 'file',
      label: '포트폴리오',
      required: true,
      options: [],
      hidden: false,
    },
  ],
};

/** 항목 자체가 틀린 초안 — 이름이 빈 칸, 선택지가 빈 라디오 */
const FIELD_ERROR_SEED: SeedValues = {
  name: '견적 요청',
  description: '',
  status: 'draft',
  recipients: 'sales@example.com',
  fields: [
    { id: 'fd-301', kind: 'text', label: '', required: true, options: [], hidden: false },
    {
      id: 'fd-302',
      kind: 'radio',
      label: '희망 착수 시기',
      required: true,
      options: [],
      hidden: false,
    },
  ],
};

let localSeq = 0;

/** 새 항목 — id 는 화면에서만 쓰는 임시 키다(저장될 때 서버가 정본 id 를 준다) */
function makeField(kind: FormFieldKind): DemoField {
  localSeq += 1;
  return {
    id: `new-${String(localSeq)}`,
    kind,
    label: kind === CONSENT_FIELD_KIND ? CONSENT_LABEL : '',
    // 동의 항목은 처음부터 필수다 — 끌 수도 없다
    required: kind === CONSENT_FIELD_KIND,
    options: needsOptions(kind) ? ['선택지 1'] : [],
    hidden: false,
  };
}

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
  gap: cssVar('space.2'),
  alignSelf: 'flex-start',
  color: cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
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

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 7), 1fr))`,
  gap: cssVar('space.4'),
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

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  paddingTop: cssVar('space.4'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.md'),
};

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  listStyleType: 'none',
  margin: 0,
  padding: 0,
};

const fieldCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  padding: cssVar('space.3'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
};

const headRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const controlsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

const labelSlotStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
};

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
};

const errorTextStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.feedback.danger.text'),
  margin: 0,
};

const ghostButtonStyle = (blocked: boolean): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'none',
  borderWidth: 0,
  borderRadius: cssVar('radius.md'),
  background: 'transparent',
  color: blocked ? cssVar('color.text.disabled') : cssVar('color.feedback.danger.text'),
  cursor: blocked ? 'not-allowed' : 'pointer',
});

const addRowStyle: CSSProperties = {
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

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface ContentFormEditScreenProps {
  readonly isEdit?: boolean;
  readonly seed?: SeedValues;
}

function ContentFormEditScreen({ isEdit = false, seed = EMPTY_SEED }: ContentFormEditScreenProps) {
  const [name, setName] = useState(seed.name);
  const [description, setDescription] = useState(seed.description);
  const [status, setStatus] = useState<ContentFormStatus>(seed.status);
  const [recipients, setRecipients] = useState(seed.recipients);
  const [fields, setFields] = useState<readonly DemoField[]>(seed.fields);

  const patch = (id: string, changes: Partial<DemoField>): void => {
    setFields((current) =>
      current.map((field) => (field.id === id ? { ...field, ...changes } : field)),
    );
  };

  const move = (index: number, delta: number): void => {
    setFields((current) => moveArrayItem(current, index, index + delta));
  };

  const remove = (id: string): void => {
    setFields((current) => current.filter((field) => field.id !== id));
  };

  const consentBlocked = addConsentBlock(fields);
  const publishBlocked = formPublishBlock(status, fields, parseRecipients(recipients));

  return (
    <div style={pageStyle}>
      <a href="#content-form-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '폼 수정' : '폼 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 항목 구성은 아래에서 추가·정렬합니다.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <Card>
          <div style={cardBodyStyle}>
            <h2 style={cardTitleStyle}>폼 정보</h2>

            {/* 발행 차단은 폼 전체의 문제라 입력 칸이 아니라 폼 레벨 배너로 나간다 */}
            {publishBlocked !== null && <Alert tone="danger">{publishBlocked}</Alert>}

            <FormField htmlFor="content-form-name" label="폼 이름" required>
              <input
                id="content-form-name"
                type="text"
                style={controlStyle(false)}
                maxLength={FORM_NAME_MAX}
                placeholder="예: 사업 문의"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </FormField>

            <TextareaField
              label="설명"
              value={description}
              onChange={setDescription}
              maxLength={FORM_DESCRIPTION_MAX}
              placeholder="이 폼이 어떤 문의를 받는지 적어 두면 운영자가 헷갈리지 않습니다."
              rows={2}
            />

            <div style={rowStyle}>
              <FormField
                htmlFor="content-form-status"
                label="상태"
                required
                hint="발행하려면 항목·수신 담당자·개인정보 동의 항목이 모두 있어야 합니다."
              >
                <SelectField
                  id="content-form-status"
                  value={status}
                  isInvalid={publishBlocked !== null}
                  onChange={(event) => {
                    const next = STATUS_OPTIONS.find((value) => value === event.target.value);
                    if (next !== undefined) setStatus(next);
                  }}
                >
                  {STATUS_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {FORM_STATUS_LABEL[value]}
                    </option>
                  ))}
                </SelectField>
              </FormField>
            </div>

            <TextareaField
              label="수신 담당자"
              required
              value={recipients}
              onChange={setRecipients}
              maxLength={RECIPIENTS_MAX}
              hint="한 줄에 하나씩 이메일을 적습니다. 접수된 문의가 이 주소로 알림됩니다."
              placeholder={'sales@example.com\ncs@example.com'}
              rows={3}
            />

            <section style={sectionStyle}>
              <h2 style={sectionTitleStyle}>항목 구성</h2>
              <p style={hintStyle}>
                방문자가 채우는 항목입니다. 위/아래 버튼으로 순서를 바꿉니다. 발행된 폼의 항목은
                지울 수 없고 숨기기만 할 수 있습니다 — 지우면 이미 들어온 응답의 답이 어느 질문에
                대한 것인지 알 수 없게 됩니다.
              </p>

              <ul style={listStyle}>
                {fields.map((field, index) => {
                  const problem = fieldBlock(field);
                  const deleteBlocked = fieldDeleteBlock(status);
                  const hideBlocked = fieldHideBlock(field);
                  const consent = isConsentKind(field.kind);
                  const inputId = `form-field-label-${field.id}`;
                  const problemId = `${inputId}-error`;
                  const optionsId = `form-field-options-${field.id}`;

                  return (
                    <li key={field.id} style={fieldCardStyle}>
                      <div style={headRowStyle}>
                        <span style={controlsStyle}>
                          <StatusBadge
                            tone={consent ? 'warning' : 'neutral'}
                            label={FIELD_KIND_LABEL[field.kind]}
                          />
                          {field.hidden && <StatusBadge tone="neutral" label="숨김" />}
                        </span>
                        <span style={controlsStyle}>
                          <ReorderMoveButtons
                            label={field.label === '' ? '이름 없는 항목' : field.label}
                            index={index}
                            count={fields.length}
                            locked={false}
                            onMove={move}
                          />
                          {/* 못 누르는 이유를 그대로 접근 이름에 싣는다 */}
                          <button
                            type="button"
                            style={ghostButtonStyle(deleteBlocked !== null)}
                            aria-label={
                              deleteBlocked !== null
                                ? `${field.label} — ${deleteBlocked}`
                                : `${field.label} 항목 삭제`
                            }
                            {...(deleteBlocked !== null && { title: deleteBlocked })}
                            disabled={deleteBlocked !== null}
                            onClick={() => remove(field.id)}
                          >
                            <Icon name="trash" />
                          </button>
                        </span>
                      </div>

                      <div style={rowStyle}>
                        <span style={labelSlotStyle}>
                          <label style={fieldLabelStyle} htmlFor={inputId}>
                            항목 이름
                          </label>
                          <input
                            id={inputId}
                            type="text"
                            style={controlStyle(problem !== null)}
                            maxLength={FIELD_LABEL_MAX}
                            placeholder="예: 회사명"
                            value={field.label}
                            aria-invalid={problem !== null}
                            {...(problem !== null && { 'aria-describedby': problemId })}
                            onChange={(event) => patch(field.id, { label: event.target.value })}
                          />
                        </span>

                        <span style={labelSlotStyle}>
                          <label style={fieldLabelStyle} htmlFor={`form-field-kind-${field.id}`}>
                            종류
                          </label>
                          {/* 동의 항목의 종류는 바꿀 수 없다 — 바꾸는 순간 법적 요구가 달라진다 */}
                          <SelectField
                            id={`form-field-kind-${field.id}`}
                            value={field.kind}
                            disabled={consent}
                            onChange={(event) => {
                              const next = FORM_FIELD_TYPES.find(
                                (kind) => kind === event.target.value,
                              );
                              if (next === undefined) return;
                              patch(field.id, {
                                kind: next,
                                options: needsOptions(next) ? field.options : [],
                              });
                            }}
                          >
                            {consent ? (
                              <option key="consent" value={CONSENT_FIELD_KIND}>
                                {FIELD_KIND_LABEL[CONSENT_FIELD_KIND]}
                              </option>
                            ) : (
                              FORM_FIELD_TYPES.map((kind) => (
                                <option key={kind} value={kind}>
                                  {FIELD_KIND_LABEL[kind]}
                                </option>
                              ))
                            )}
                          </SelectField>
                        </span>
                      </div>

                      {needsOptions(field.kind) && (
                        <span style={labelSlotStyle}>
                          <label style={fieldLabelStyle} htmlFor={optionsId}>
                            선택지 (한 줄에 하나)
                          </label>
                          <textarea
                            id={optionsId}
                            style={controlStyle(problem !== null)}
                            rows={3}
                            value={field.options.join('\n')}
                            onChange={(event) =>
                              patch(field.id, { options: event.target.value.split('\n') })
                            }
                          />
                        </span>
                      )}

                      <div style={controlsStyle}>
                        <ToggleSwitch
                          label={`${field.label} 필수 여부`}
                          onLabel="필수"
                          offLabel="선택"
                          checked={field.required}
                          // 동의 항목은 필수에서 내려올 수 없다
                          disabled={consent}
                          onChange={(next) => patch(field.id, { required: next })}
                        />
                        <ToggleSwitch
                          label={`${field.label} 노출 여부`}
                          onLabel="노출"
                          offLabel="숨김"
                          checked={!field.hidden}
                          disabled={hideBlocked !== null}
                          onChange={(next) => patch(field.id, { hidden: !next })}
                        />
                        {hideBlocked !== null && <span style={hintStyle}>{hideBlocked}</span>}
                      </div>

                      {problem !== null && (
                        <p id={problemId} role="alert" style={errorTextStyle}>
                          {problem}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div style={addRowStyle}>
                <Button
                  type="button"
                  variant="secondary"
                  iconLeft={<Icon name="plus-circle" />}
                  onClick={() => setFields((current) => [...current, makeField('text')])}
                >
                  항목 추가
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  iconLeft={<Icon name="lock" />}
                  disabled={consentBlocked !== null}
                  {...(consentBlocked !== null && { title: consentBlocked })}
                  onClick={() =>
                    setFields((current) => [...current, makeField(CONSENT_FIELD_KIND)])
                  }
                >
                  개인정보 동의 항목 추가
                </Button>
                {consentBlocked !== null && <span style={hintStyle}>{consentBlocked}</span>}
              </div>

              <p style={hintStyle}>
                파일 첨부는 도면·사양서를 받는 자리입니다. 실제 업로드 저장은 백엔드가 붙은 뒤
                연결됩니다.
              </p>
            </section>

            <div style={actionsStyle}>
              <Button variant="secondary" type="button">
                취소
              </Button>
              <Button variant="primary" type="submit">
                저장
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}

/** 등록: 빈 폼 — 항목이 하나도 없다. 초안이라 저장은 되고, 발행하려 하면 문이 걸린다 */
export const Default: Story = {
  render: () => <ContentFormEditScreen />,
};

/**
 * 발행된 폼 수정: 삭제 버튼이 전부 잠기고 **사유가 접근 이름에 실린다**. 동의 항목은 종류·필수·
 * 노출 셋 다 잠겨 있고 왜 잠겼는지를 그 자리에서 말한다. 동의 항목 추가 버튼도 이미 하나가 있어
 * 잠긴다 — 폼당 하나다.
 */
export const PublishedForm: Story = {
  render: () => <ContentFormEditScreen isEdit seed={PUBLISHED_SEED} />,
};

/**
 * 발행 차단: 상태를 '발행' 으로 골랐지만 개인정보 동의 항목이 없다 — 저장 버튼이 통과시킨 것을
 * 저장소가 거절하는 일이 없도록 화면과 저장이 **같은 술어**를 읽는다.
 */
export const PublishBlocked: Story = {
  render: () => <ContentFormEditScreen isEdit seed={PUBLISH_BLOCKED_SEED} />,
};

/**
 * 항목 오류: 이름이 빈 항목과 선택지가 없는 라디오 — 오류는 폼 상단이 아니라 **그 항목 카드
 * 안에** 붙고 `aria-describedby` 로 입력과 이어진다.
 */
export const FieldErrors: Story = {
  render: () => <ContentFormEditScreen isEdit seed={FIELD_ERROR_SEED} />,
};
