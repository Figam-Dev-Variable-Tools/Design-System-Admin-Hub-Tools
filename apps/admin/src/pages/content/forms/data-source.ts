// 폼 관리 데이터 소스 어댑터
//
// [백엔드 연동 지점] 이 파일의 함수 시그니처가 프론트 ↔ 백엔드의 계약이다. 지금은 픽스처를
// 돌려준다. 백엔드가 붙으면 **이 파일의 함수 본문만** 실제 HTTP 호출로 바꾼다.
//
// [가드는 순수 규칙이 갖는다] 발행 조건·필드 검증은 types.ts 의 술어가 판정하고 여기서는 부를
// 뿐이다 — 화면의 저장 버튼과 저장소의 거절이 같은 함수를 읽어야 둘이 갈라지지 않는다.
import { createStoreAdapter } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { formPublishBlock, invalidFields, sortContentForms } from './types';
import type { ContentForm, ContentFormInput } from './types';

export const FORM_RESOURCE = 'content-forms';

/* ── 픽스처 (표시용 더미 — 가상 회사) ────────────────────────────────────── */

const CONSENT_LABEL = '개인정보 수집·이용에 동의합니다';

const SEED: readonly ContentForm[] = [
  {
    id: 'fm-001',
    name: '사업 문의',
    description: '홈페이지 하단 문의 버튼이 여는 기본 폼입니다.',
    status: 'published',
    recipients: ['sales@example.com', 'cs@example.com'],
    fields: [
      { id: 'fd-001', kind: 'text', label: '회사명', required: true, options: [], hidden: false },
      { id: 'fd-002', kind: 'text', label: '담당자명', required: true, options: [], hidden: false },
      { id: 'fd-003', kind: 'email', label: '이메일', required: true, options: [], hidden: false },
      { id: 'fd-004', kind: 'text', label: '연락처', required: false, options: [], hidden: false },
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
      {
        id: 'fd-008',
        kind: 'privacy-consent',
        label: CONSENT_LABEL,
        required: true,
        options: [],
        hidden: false,
      },
    ],
    updatedAt: '2026-06-20T11:00',
  },
  {
    id: 'fm-002',
    name: '견적 요청',
    description: '규모·일정이 정해진 프로젝트의 견적 요청을 받습니다.',
    status: 'published',
    recipients: ['sales@example.com'],
    fields: [
      { id: 'fd-101', kind: 'text', label: '회사명', required: true, options: [], hidden: false },
      { id: 'fd-102', kind: 'email', label: '이메일', required: true, options: [], hidden: false },
      {
        id: 'fd-103',
        kind: 'number',
        label: '예상 면적(㎡)',
        required: false,
        options: [],
        hidden: false,
      },
      {
        id: 'fd-104',
        kind: 'radio',
        label: '희망 착수 시기',
        required: true,
        options: ['1개월 이내', '3개월 이내', '미정'],
        hidden: false,
      },
      {
        id: 'fd-105',
        kind: 'multi-select',
        label: '필요한 서비스',
        required: false,
        options: ['공간 기획', '시공 관리', '가구 선정', '운영 컨설팅'],
        hidden: false,
      },
      {
        id: 'fd-106',
        kind: 'file',
        label: '참고 자료',
        required: false,
        options: [],
        hidden: false,
      },
      // 숨긴 항목 — 지우지 않고 내린 것이다. 지난 응답은 이 칸의 답을 계속 갖고 있다
      { id: 'fd-107', kind: 'text', label: '추천인', required: false, options: [], hidden: true },
      {
        id: 'fd-108',
        kind: 'privacy-consent',
        label: CONSENT_LABEL,
        required: true,
        options: [],
        hidden: false,
      },
    ],
    updatedAt: '2026-06-24T15:30',
  },
  {
    id: 'fm-003',
    name: '채용 지원',
    description: '작성 중입니다. 아직 홈페이지에 걸려 있지 않습니다.',
    status: 'draft',
    recipients: ['people@example.com'],
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
    updatedAt: '2026-07-02T09:10',
  },
];

/** mutable — 등록·수정·삭제가 이 배열을 갱신한다 */
let FORMS: readonly ContentForm[] = sortContentForms(SEED);

let seq = SEED.length;

/* ── 저장소 표면 ─────────────────────────────────────────────────────────── */

export function listContentForms(): readonly ContentForm[] {
  return FORMS;
}

export function getContentForm(id: string): ContentForm {
  const form = FORMS.find((item) => item.id === id);
  if (form === undefined) throw new Error('폼을 찾을 수 없습니다.');
  return form;
}

/**
 * 저장 전 마지막 문.
 *
 * 필드 오류는 **어느 항목인지까지** 422 로 되돌린다 — 폼 편집기가 그 항목에 인라인으로 꽂는다
 * (EXC-07). 발행 조건은 폼 전체의 문제라 필드가 아니라 폼 레벨 메시지로 나간다.
 */
function assertSavable(input: ContentFormInput): void {
  const broken = invalidFields(input.fields)[0];
  if (broken !== undefined) {
    throw new HttpError(
      HTTP_STATUS.unprocessable,
      `'${broken.field.label}' 항목 — ${broken.reason}`,
      {
        violations: [{ field: 'fields', message: broken.reason }],
      },
    );
  }
  const publish = formPublishBlock(input);
  if (publish !== null) {
    throw new HttpError(HTTP_STATUS.unprocessable, publish, {
      violations: [{ field: 'status', message: publish }],
    });
  }
}

export function addContentForm(input: ContentFormInput): void {
  assertSavable(input);
  seq += 1;
  FORMS = sortContentForms([...FORMS, { id: `fm-${String(seq).padStart(3, '0')}`, ...input }]);
}

export function updateContentForm(id: string, input: ContentFormInput): void {
  assertSavable(input);
  FORMS = sortContentForms(FORMS.map((form) => (form.id === id ? { ...form, ...input } : form)));
}

export function removeContentForm(id: string): void {
  FORMS = FORMS.filter((form) => form.id !== id);
}

/** 'YYYY-MM-DDTHH:mm' — 저장 시각의 표기를 한 곳에서만 만든다 */
export function stampNow(): string {
  return new Date().toISOString().slice(0, 16);
}

/* ── CRUD 어댑터 ─────────────────────────────────────────────────────────── */

// TODO(backend): GET/POST /api/content-forms · GET/PUT/DELETE /api/content-forms/:id
// TODO(backend): POST /api/content-forms/:id/responses — 방문자 제출을 받는 자리(홈페이지가 쓴다)
export const contentFormAdapter = createStoreAdapter<ContentForm, ContentFormInput>({
  scope: FORM_RESOURCE,
  list: listContentForms,
  getOne: getContentForm,
  add: addContentForm,
  update: updateContentForm,
  remove: removeContentForm,
});
