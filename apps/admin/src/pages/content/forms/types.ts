// 폼 관리 화면 전용 타입 + 순수 규칙
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 만드는 화면인가] 홈페이지가 띄우는 **문의 폼의 항목 구성**이다. 지금까지 문의 폼의
// 항목은 코드에 고정돼 있어, '도면 첨부' 한 칸을 더하려면 배포가 필요했다. 견적형 커머스에서
// 파일 업로드(도면·사양서)는 곁가지가 아니라 문의 그 자체다.
//
// [개인정보 동의는 **다른 종류**다 — 이 파일에서 가장 중요한 판단]
// 겉보기에 동의 체크박스는 checkbox 다. 그런데 그 항목은 ① 반드시 필수이고 ② 숨길 수 없고
// ③ 동의 이력이 별도로 남아야 한다 — 법적 요구가 다른 것이다. checkbox 로 두면 운영자가
// 필수를 끄거나 숨기는 순간 **동의 없이 개인정보를 수집하는 폼**이 되고, 그 사실을 아무도
// 알아채지 못한다. 그래서 타입을 갈라 규칙을 붙일 자리를 만든다.
// (동의 이력 자체는 다른 모듈이 소유한다 — 이 폼은 '동의 항목이 있다' 는 사실까지만 안다.)
//
// [발행 후에는 필드를 지우지 않는다 — 숨김만]
// 지우면 이미 들어온 응답의 그 칸이 **어느 질문에 대한 답인지 알 수 없는 값**이 된다(고아).
// 숨기면 새 응답에는 나오지 않고 지난 응답은 계속 읽힌다. 그래서 삭제는 초안일 때만이다.
// ─────────────────────────────────────────────────────────────────────────────
import type { StatusBadgeTone } from '@tds/ui';

/* ── 필드 종류 ───────────────────────────────────────────────────────────── */

/** 일반 입력 9종 — 홈페이지가 그릴 수 있는 컨트롤의 전부다 */
export type FormFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'radio'
  | 'file';

/** 개인정보 동의 — 위 9종과 **나란한 별개**다(머리말) */
export const CONSENT_FIELD_KIND = 'privacy-consent';

export type FormFieldKind = FormFieldType | typeof CONSENT_FIELD_KIND;

export const FORM_FIELD_TYPES: readonly FormFieldType[] = [
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

export const FORM_FIELD_KINDS: readonly FormFieldKind[] = [...FORM_FIELD_TYPES, CONSENT_FIELD_KIND];

export const FIELD_KIND_LABEL: Readonly<Record<FormFieldKind, string>> = {
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

export function isFormFieldKind(value: unknown): value is FormFieldKind {
  return typeof value === 'string' && value in FIELD_KIND_LABEL;
}

/** 선택지를 스스로 들어야 하는 종류 — 비어 있으면 홈페이지가 빈 목록을 그린다 */
export function needsOptions(kind: FormFieldKind): boolean {
  return kind === 'select' || kind === 'multi-select' || kind === 'radio';
}

export function isConsentKind(kind: FormFieldKind): boolean {
  return kind === CONSENT_FIELD_KIND;
}

/* ── 필드 ────────────────────────────────────────────────────────────────── */

export interface FormFieldDef {
  readonly id: string;
  readonly kind: FormFieldKind;
  /** 방문자가 보는 항목 이름 */
  readonly label: string;
  readonly required: boolean;
  /** select·multi-select·radio 의 선택지. 나머지 종류에서는 비어 있다 */
  readonly options: readonly string[];
  /** 숨김 — 새 응답에는 나오지 않지만 지난 응답은 계속 읽힌다(머리말) */
  readonly hidden: boolean;
}

export const FIELD_LABEL_MAX = 40;
export const FORM_NAME_MAX = 40;
export const FORM_DESCRIPTION_MAX = 200;
export const FORM_LIST_PATH = '/content/forms';

/* ── 폼 ──────────────────────────────────────────────────────────────────── */

/**
 * 폼의 상태 — 초안과 발행 둘뿐이다.
 *
 * 예약·보관을 두지 않는 이유: 폼은 콘텐츠가 아니라 **접수 창구**다. 창구는 열려 있거나 닫혀
 * 있을 뿐이고, '언제부터 열림' 은 그 창구를 거는 페이지가 정한다.
 */
export type ContentFormStatus = 'draft' | 'published';

export const FORM_STATUS_LABEL: Readonly<Record<ContentFormStatus, string>> = {
  draft: '초안',
  published: '발행',
};

export const FORM_STATUS_TONE: Readonly<Record<ContentFormStatus, StatusBadgeTone>> = {
  draft: 'neutral',
  published: 'success',
};

export interface ContentForm {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: ContentFormStatus;
  /** 접수 알림을 받는 담당자 이메일 — 비면 응답이 아무에게도 닿지 않는다 */
  readonly recipients: readonly string[];
  /** 화면에 그려지는 순서 그대로다 — 순서가 곧 배열이다(별도 order 필드를 두지 않는다) */
  readonly fields: readonly FormFieldDef[];
  readonly updatedAt: string;
}

export type ContentFormInput = Omit<ContentForm, 'id'>;

export function toContentFormInput(form: ContentForm): ContentFormInput {
  return {
    name: form.name,
    description: form.description,
    status: form.status,
    recipients: [...form.recipients],
    fields: form.fields.map((field) => ({ ...field, options: [...field.options] })),
    updatedAt: form.updatedAt,
  };
}

/** 방문자에게 실제로 보이는 항목 — 목록의 '항목 수' 가 세는 것도 이것이다 */
export function activeFields(fields: readonly FormFieldDef[]): readonly FormFieldDef[] {
  return fields.filter((field) => !field.hidden);
}

/** 이 폼에 개인정보 동의 항목이 있는가 */
export function hasConsentField(fields: readonly FormFieldDef[]): boolean {
  return fields.some((field) => isConsentKind(field.kind) && !field.hidden);
}

/* ── 필드 규칙 (버튼의 disabled 와 저장의 거절이 같은 술어를 읽는다) ───────── */

export const FIELD_LABEL_REQUIRED = '항목 이름을 입력하세요.';
export const FIELD_LABEL_TOO_LONG = `항목 이름은 ${String(FIELD_LABEL_MAX)}자를 넘을 수 없습니다.`;
export const FIELD_OPTIONS_REQUIRED = '선택지를 한 줄에 하나씩 입력하세요.';
export const CONSENT_NOT_OPTIONAL =
  '개인정보 동의 항목은 필수에서 해제할 수 없습니다. 동의 없이 개인정보를 받을 수 없습니다.';

/** 이 필드를 저장할 수 없는 이유 — 저장할 수 있으면 null */
export function fieldBlock(field: FormFieldDef): string | null {
  const label = field.label.trim();
  if (label === '') return FIELD_LABEL_REQUIRED;
  if (label.length > FIELD_LABEL_MAX) return FIELD_LABEL_TOO_LONG;
  if (needsOptions(field.kind) && field.options.filter((o) => o.trim() !== '').length === 0) {
    return FIELD_OPTIONS_REQUIRED;
  }
  // 동의 항목은 필수여야 한다 — 이것을 끄면 동의 없이 개인정보를 받는 폼이 된다
  if (isConsentKind(field.kind) && !field.required) return CONSENT_NOT_OPTIONAL;
  return null;
}

/** 지금 문제가 있는 필드들 — 편집기의 인라인 오류와 저장 거절이 같은 목록을 읽는다 */
export function invalidFields(
  fields: readonly FormFieldDef[],
): readonly { readonly field: FormFieldDef; readonly reason: string }[] {
  const found: { field: FormFieldDef; reason: string }[] = [];
  for (const field of fields) {
    const reason = fieldBlock(field);
    if (reason !== null) found.push({ field, reason });
  }
  return found;
}

export const FIELD_DELETE_PUBLISHED =
  '발행된 폼의 항목은 삭제할 수 없습니다. 숨기면 새 응답에는 나오지 않고 지난 응답은 그대로 남습니다.';

/**
 * 이 항목을 지울 수 없는 이유 — 지울 수 있으면 null.
 *
 * 지우지 못하게 하는 것이 불편이 아니라 **보호**인 이유는 머리말에 있다: 지운 칸의 답은
 * 어느 질문에 대한 것인지 영영 알 수 없는 값이 된다.
 */
export function fieldDeleteBlock(status: ContentFormStatus): string | null {
  return status === 'published' ? FIELD_DELETE_PUBLISHED : null;
}

export function canDeleteField(status: ContentFormStatus): boolean {
  return fieldDeleteBlock(status) === null;
}

export const CONSENT_HIDE_BLOCKED =
  '개인정보 동의 항목은 숨길 수 없습니다. 동의를 받지 않는 폼이 되어 버립니다.';

/** 이 항목을 숨길 수 없는 이유 — 숨길 수 있으면 null */
export function fieldHideBlock(field: FormFieldDef): string | null {
  return isConsentKind(field.kind) ? CONSENT_HIDE_BLOCKED : null;
}

export const CONSENT_DUPLICATE = '개인정보 동의 항목은 폼당 하나만 둘 수 있습니다.';

/** 이 종류의 항목을 더 넣을 수 없는 이유 — 넣을 수 있으면 null */
export function addFieldBlock(fields: readonly FormFieldDef[], kind: FormFieldKind): string | null {
  if (!isConsentKind(kind)) return null;
  return fields.some((field) => isConsentKind(field.kind)) ? CONSENT_DUPLICATE : null;
}

/* ── 수신 담당자 ─────────────────────────────────────────────────────────── */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const RECIPIENT_REQUIRED =
  '수신 담당자를 한 명 이상 입력하세요. 없으면 접수된 문의가 아무에게도 닿지 않습니다.';

export function recipientFormatMessage(value: string): string {
  return `'${value}' 는 이메일 형식이 아닙니다.`;
}

/** 줄바꿈·쉼표로 적은 것을 목록으로 — 폼과 저장이 같은 방식으로 나눈다 */
export function parseRecipients(raw: string): readonly string[] {
  return raw
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => value !== '');
}

export function formatRecipients(recipients: readonly string[]): string {
  return recipients.join('\n');
}

/** 수신 담당자를 저장할 수 없는 이유 — 저장할 수 있으면 null */
export function recipientsBlock(recipients: readonly string[]): string | null {
  if (recipients.length === 0) return RECIPIENT_REQUIRED;
  const bad = recipients.find((value) => !EMAIL_RE.test(value));
  return bad === undefined ? null : recipientFormatMessage(bad);
}

/* ── 발행 가드 ───────────────────────────────────────────────────────────── */

export const PUBLISH_NO_FIELDS = '항목이 하나도 없어 발행할 수 없습니다.';
export const PUBLISH_NO_CONSENT =
  '개인정보 동의 항목이 없어 발행할 수 없습니다. 이름·연락처를 받는 폼은 동의를 함께 받아야 합니다.';

/**
 * 이 폼을 발행할 수 없는 이유 — 발행할 수 있으면 null.
 *
 * 초안에는 걸지 않는다: 만드는 중인 폼까지 완성을 요구하면 저장 자체를 할 수 없다. 문은
 * **밖으로 나가는 자리**에만 세운다.
 */
export function formPublishBlock(
  form: Pick<ContentForm, 'status' | 'fields' | 'recipients'>,
): string | null {
  if (form.status !== 'published') return null;
  if (activeFields(form.fields).length === 0) return PUBLISH_NO_FIELDS;
  const recipients = recipientsBlock(form.recipients);
  if (recipients !== null) return recipients;
  if (!hasConsentField(form.fields)) return PUBLISH_NO_CONSENT;
  const invalid = invalidFields(form.fields)[0];
  return invalid === undefined ? null : `'${invalid.field.label}' 항목 — ${invalid.reason}`;
}

export function canPublishForm(
  form: Pick<ContentForm, 'status' | 'fields' | 'recipients'>,
): boolean {
  return formPublishBlock(form) === null;
}

/* ── 목록 정렬 · 필터 ────────────────────────────────────────────────────── */

export type FormStatusFilter = ContentFormStatus | 'all';

export const FORM_STATUS_FILTERS: readonly {
  readonly id: FormStatusFilter;
  readonly label: string;
}[] = [
  { id: 'all', label: '전체' },
  { id: 'draft', label: '초안' },
  { id: 'published', label: '발행' },
];

export const FORM_STATUS_FILTER_VALUES: readonly FormStatusFilter[] = FORM_STATUS_FILTERS.map(
  (filter) => filter.id,
);

/** 최근 수정이 위 */
export function sortContentForms(list: readonly ContentForm[]): readonly ContentForm[] {
  return [...list].sort((a, b) => {
    if (a.updatedAt !== b.updatedAt) return b.updatedAt.localeCompare(a.updatedAt);
    return a.id.localeCompare(b.id);
  });
}

/** 상태 + 이름 키워드 — 서버 쿼리로 대체될 자리 */
export function filterContentForms(
  list: readonly ContentForm[],
  status: FormStatusFilter,
  keyword: string,
): readonly ContentForm[] {
  const needle = keyword.trim().toLowerCase();
  return list.filter((form) => {
    if (status !== 'all' && form.status !== status) return false;
    if (needle === '') return true;
    return form.name.toLowerCase().includes(needle);
  });
}
