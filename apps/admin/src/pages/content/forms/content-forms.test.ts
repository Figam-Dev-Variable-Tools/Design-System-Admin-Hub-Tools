// 폼 관리 순수 규칙 회귀 테스트
//
// [무엇을 못 박는가] 이 화면의 사고는 셋이다.
//   ① 발행된 폼의 항목을 지워 이미 들어온 응답을 고아로 만드는 것
//   ② 개인정보 동의 항목을 일반 체크박스처럼 다뤄 필수를 끄거나 숨기는 것
//   ③ 수신 담당자 없이 발행해 접수된 문의가 아무에게도 닿지 않는 것
import { describe, expect, it } from 'vitest';

import {
  activeFields,
  addFieldBlock,
  canDeleteField,
  CONSENT_DUPLICATE,
  CONSENT_FIELD_KIND,
  CONSENT_HIDE_BLOCKED,
  CONSENT_NOT_OPTIONAL,
  FIELD_DELETE_PUBLISHED,
  FIELD_LABEL_REQUIRED,
  FIELD_OPTIONS_REQUIRED,
  fieldBlock,
  fieldDeleteBlock,
  fieldHideBlock,
  filterContentForms,
  formPublishBlock,
  formatRecipients,
  hasConsentField,
  invalidFields,
  needsOptions,
  parseRecipients,
  PUBLISH_NO_CONSENT,
  PUBLISH_NO_FIELDS,
  RECIPIENT_REQUIRED,
  recipientFormatMessage,
  recipientsBlock,
  sortContentForms,
} from './types';
import type { ContentForm, FormFieldDef } from './types';

const field = (overrides: Partial<FormFieldDef> = {}): FormFieldDef => ({
  id: 'fd-1',
  kind: 'text',
  label: '회사명',
  required: true,
  options: [],
  hidden: false,
  ...overrides,
});

const CONSENT = field({
  id: 'fd-c',
  kind: CONSENT_FIELD_KIND,
  label: '개인정보 수집·이용에 동의합니다',
  required: true,
});

const form = (overrides: Partial<ContentForm> = {}): ContentForm => ({
  id: 'fm-1',
  name: '사업 문의',
  description: '',
  status: 'draft',
  recipients: ['sales@example.com'],
  fields: [field(), CONSENT],
  updatedAt: '2026-06-20T11:00',
  ...overrides,
});

describe('필드 종류', () => {
  it('선택지가 필요한 종류는 셋뿐이다', () => {
    expect(needsOptions('select')).toBe(true);
    expect(needsOptions('multi-select')).toBe(true);
    expect(needsOptions('radio')).toBe(true);
    expect(needsOptions('checkbox')).toBe(false);
    expect(needsOptions('file')).toBe(false);
  });
});

describe('fieldBlock', () => {
  it('이름이 비면 막는다', () => {
    expect(fieldBlock(field({ label: '  ' }))).toBe(FIELD_LABEL_REQUIRED);
  });

  it('선택지가 필요한데 비어 있으면 막는다 — 홈페이지가 빈 목록을 그리지 않게', () => {
    expect(fieldBlock(field({ kind: 'select', options: [] }))).toBe(FIELD_OPTIONS_REQUIRED);
    expect(fieldBlock(field({ kind: 'select', options: ['  '] }))).toBe(FIELD_OPTIONS_REQUIRED);
    expect(fieldBlock(field({ kind: 'select', options: ['가', '나'] }))).toBeNull();
  });

  it('동의 항목의 필수를 끄면 막는다 — 동의 없이 개인정보를 받을 수 없다', () => {
    expect(fieldBlock({ ...CONSENT, required: false })).toBe(CONSENT_NOT_OPTIONAL);
  });

  it('문제 있는 항목만 골라 준다', () => {
    const list = [field(), field({ id: 'fd-2', label: '' })];
    expect(invalidFields(list).map((entry) => entry.field.id)).toEqual(['fd-2']);
  });
});

describe('삭제 · 숨김 가드', () => {
  it('발행된 폼의 항목은 지울 수 없다 — 숨김만', () => {
    expect(fieldDeleteBlock('published')).toBe(FIELD_DELETE_PUBLISHED);
    expect(canDeleteField('published')).toBe(false);
  });

  it('초안이면 지울 수 있다', () => {
    expect(canDeleteField('draft')).toBe(true);
  });

  it('동의 항목은 숨길 수 없다 — 숨기면 동의를 받지 않는 폼이 된다', () => {
    expect(fieldHideBlock(CONSENT)).toBe(CONSENT_HIDE_BLOCKED);
    expect(fieldHideBlock(field())).toBeNull();
  });

  it('동의 항목은 폼당 하나뿐이다', () => {
    expect(addFieldBlock([field()], CONSENT_FIELD_KIND)).toBeNull();
    expect(addFieldBlock([field(), CONSENT], CONSENT_FIELD_KIND)).toBe(CONSENT_DUPLICATE);
    // 일반 항목은 몇 개든 더할 수 있다
    expect(addFieldBlock([field(), CONSENT], 'text')).toBeNull();
  });
});

describe('보이는 항목', () => {
  it('숨긴 항목은 세지 않는다', () => {
    const list = [field(), field({ id: 'fd-2', hidden: true }), CONSENT];
    expect(activeFields(list)).toHaveLength(2);
  });

  it('숨긴 동의 항목은 있는 것으로 치지 않는다', () => {
    expect(hasConsentField([field(), CONSENT])).toBe(true);
    expect(hasConsentField([field(), { ...CONSENT, hidden: true }])).toBe(false);
  });
});

describe('수신 담당자', () => {
  it('줄바꿈·쉼표 어느 쪽으로 적어도 같은 목록이 된다', () => {
    expect(parseRecipients('a@example.com\n b@example.com , ')).toEqual([
      'a@example.com',
      'b@example.com',
    ]);
    expect(formatRecipients(['a@example.com', 'b@example.com'])).toBe(
      'a@example.com\nb@example.com',
    );
  });

  it('비면 막는다 — 아무에게도 닿지 않는 폼을 만들지 않는다', () => {
    expect(recipientsBlock([])).toBe(RECIPIENT_REQUIRED);
  });

  it('형식이 아닌 값은 어느 값인지까지 말한다', () => {
    expect(recipientsBlock(['sales'])).toBe(recipientFormatMessage('sales'));
  });
});

describe('formPublishBlock', () => {
  it('초안에는 걸지 않는다 — 만드는 중인 폼까지 완성을 요구하지 않는다', () => {
    expect(formPublishBlock(form({ status: 'draft', fields: [], recipients: [] }))).toBeNull();
  });

  it('항목이 없으면 발행할 수 없다', () => {
    expect(formPublishBlock(form({ status: 'published', fields: [] }))).toBe(PUBLISH_NO_FIELDS);
  });

  it('수신 담당자가 없으면 발행할 수 없다', () => {
    expect(formPublishBlock(form({ status: 'published', recipients: [] }))).toBe(
      RECIPIENT_REQUIRED,
    );
  });

  it('개인정보 동의 항목이 없으면 발행할 수 없다', () => {
    expect(formPublishBlock(form({ status: 'published', fields: [field()] }))).toBe(
      PUBLISH_NO_CONSENT,
    );
  });

  it('항목 자체에 문제가 있으면 어느 항목인지까지 말한다', () => {
    const broken = field({ id: 'fd-9', kind: 'select', label: '문의 유형', options: [] });
    const message = formPublishBlock(form({ status: 'published', fields: [broken, CONSENT] }));
    expect(message).toContain('문의 유형');
    expect(message).toContain(FIELD_OPTIONS_REQUIRED);
  });

  it('전부 갖추면 발행된다', () => {
    expect(formPublishBlock(form({ status: 'published' }))).toBeNull();
  });
});

describe('목록 정렬 · 필터', () => {
  const a = form({ id: 'fm-1', name: '사업 문의', updatedAt: '2026-06-01T09:00' });
  const b = form({
    id: 'fm-2',
    name: '견적 요청',
    status: 'published',
    updatedAt: '2026-06-05T09:00',
  });

  it('최근 수정이 위다', () => {
    expect(sortContentForms([a, b]).map((item) => item.id)).toEqual(['fm-2', 'fm-1']);
  });

  it('상태와 이름으로 거른다', () => {
    expect(filterContentForms([a, b], 'published', '').map((item) => item.id)).toEqual(['fm-2']);
    expect(filterContentForms([a, b], 'all', '견적').map((item) => item.id)).toEqual(['fm-2']);
  });
});
