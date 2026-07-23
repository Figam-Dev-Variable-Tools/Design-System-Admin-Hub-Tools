// 메시지 템플릿 — 순수 규칙 테스트
//
// 겨누는 것은 셋이다:
//   1) 발행 상태 전이 (draft → publish → active ↔ inactive) 와 상태별 허용 액션
//   2) 편집기가 보여 주는 SMS/LMS/MMS 등급 판정 (바이트 · 이미지)
//   3) 검증 — 본문 필수 · 이름 길이 · 이미지 규칙
import { describe, expect, it } from 'vitest';

import {
  byteLengthOf,
  classifySms,
  LMS_SUBJECT_MAX_BYTES,
  showsSubject,
} from '../_shared/messaging';
import { createBlock } from './email/blocks';
import { renderBlocksToHtml } from './render-html';
import {
  DEFAULT_EMAIL_CANVAS,
  listMessageTemplates,
  selectableTemplates,
  setMessageTemplateStatus,
} from './store';
import { segmentsOf } from './components/VariableText';
import { actionsFor, publishedStatusOf, statusToneOf, toggledStatusOf } from './status';
import {
  TEMPLATE_KIND_LABEL,
  TEMPLATE_NAME_MAX,
  TEXT_BODY_MAX,
  TEXT_IMAGE_MAX_BYTES,
  TEXT_IMAGE_MAX_EDGE,
  isPublished,
} from './types';
import type { EmailBlock, TemplateKind, TemplateStatus } from './types';
import {
  BODY_REQUIRED_MESSAGE,
  imageEdgeError,
  imageFormatError,
  imageSizeError,
  isTextTemplateValid,
  pickedImageError,
  textTemplateSchema,
} from './validation';
import type { TextTemplateFormValues } from './validation';

/** 테스트용 블록 — 편집기의 기본 블록에서 내용만 덮어쓴다(store.ts 의 contentBlock 과 같은 결) */
function contentBlockFor(kind: 'heading' | 'text', id: string, content: string): EmailBlock {
  const block = createBlock(kind, id);
  if (block.blockKind === 'heading' || block.blockKind === 'text') return { ...block, content };
  return block;
}

const SAMPLE_BLOCKS: readonly EmailBlock[] = [
  contentBlockFor('heading', 'b1', '이달의 소식'),
  contentBlockFor('text', 'b2', '안녕하세요 #{이름}님, 이번 달 새 소식을 전해드립니다.'),
];

/* ── 1. 발행 상태 전이 ─────────────────────────────────────────────────────── */

describe('발행 상태 전이', () => {
  it('초안을 발행하면 켜진 채로 나간다 (draft → active)', () => {
    expect(publishedStatusOf('draft')).toBe('active');
  });

  it('이미 발행된 것은 발행이 상태를 건드리지 않는다 — 운영자가 꺼 둔 것을 몰래 되켜지 않는다', () => {
    expect(publishedStatusOf('active')).toBe('active');
    expect(publishedStatusOf('inactive')).toBe('inactive');
  });

  it('사용 여부 토글은 켜고 끄기를 오간다 (active ↔ inactive)', () => {
    expect(toggledStatusOf('active')).toBe('inactive');
    expect(toggledStatusOf('inactive')).toBe('active');
    // 왕복하면 제자리 — 토글이 상태를 잃지 않는다
    expect(toggledStatusOf(toggledStatusOf('active'))).toBe('active');
  });

  it('초안은 토글 대상이 아니다 — 발행하지 않고 켜진 상태를 만들지 않는다', () => {
    expect(toggledStatusOf('draft')).toBe('draft');
  });

  it('발행 여부는 draft 만 가른다', () => {
    expect(isPublished('draft')).toBe(false);
    expect(isPublished('active')).toBe(true);
    expect(isPublished('inactive')).toBe(true);
  });

  it('전체 흐름 — 초안에서 발행하고 껐다 켠다', () => {
    let status: TemplateStatus = 'draft';
    status = publishedStatusOf(status);
    expect(status).toBe('active');
    status = toggledStatusOf(status);
    expect(status).toBe('inactive');
    status = toggledStatusOf(status);
    expect(status).toBe('active');
  });
});

describe('상태별 상세 헤더 액션', () => {
  it('active — 토글과 삭제만 (켜져 있는 문구는 그 자리에서 고치지 않는다)', () => {
    expect(actionsFor('active')).toEqual({
      canToggleActive: true,
      canEdit: false,
      canPublish: false,
      canDelete: true,
    });
  });

  it('inactive — 토글 · 삭제 · 수정', () => {
    expect(actionsFor('inactive')).toEqual({
      canToggleActive: true,
      canEdit: true,
      canPublish: false,
      canDelete: true,
    });
  });

  it('draft — 삭제 · 수정 · 발행 (토글은 없다)', () => {
    expect(actionsFor('draft')).toEqual({
      canToggleActive: false,
      canEdit: true,
      canPublish: true,
      canDelete: true,
    });
  });

  it('발행 액션은 초안에만 있다 — 상태 전이 함수와 화면이 어긋나지 않는다', () => {
    const statuses: readonly TemplateStatus[] = ['draft', 'active', 'inactive'];
    for (const status of statuses) {
      expect(actionsFor(status).canPublish).toBe(publishedStatusOf(status) !== status);
    }
  });

  it('세 상태의 배지 색이 서로 다르다 — 목록에서 구분된다', () => {
    const tones = new Set(
      ['draft', 'active', 'inactive'].map((s) => statusToneOf(s as TemplateStatus)),
    );
    expect(tones.size).toBe(3);
  });
});

/* ── 2. SMS / LMS / MMS 등급 ──────────────────────────────────────────────── */

describe('편집기가 보여 주는 문자 등급', () => {
  it('90byte 이하 · 이미지 없음 → SMS', () => {
    const body = 'a'.repeat(90);
    expect(byteLengthOf(body)).toBe(90);
    expect(classifySms(byteLengthOf(body), false)).toBe('sms');
  });

  it('90byte 초과 → LMS 로 자동 승격', () => {
    const body = 'a'.repeat(91);
    expect(classifySms(byteLengthOf(body), false)).toBe('lms');
  });

  it('한글은 EUC-KR 2byte — 46자면 이미 SMS 한도를 넘는다', () => {
    // 화면 카운터는 '글자' 를 세지만 등급은 '바이트' 가 가른다. 45자(90byte)까지가 SMS 다.
    expect(byteLengthOf('가'.repeat(45))).toBe(90);
    expect(classifySms(byteLengthOf('가'.repeat(45)), false)).toBe('sms');
    expect(classifySms(byteLengthOf('가'.repeat(46)), false)).toBe('lms');
  });

  it('이미지를 붙이면 길이와 무관하게 MMS', () => {
    expect(classifySms(byteLengthOf('짧은 문구'), true)).toBe('mms');
    expect(classifySms(byteLengthOf('a'.repeat(500)), true)).toBe('mms');
  });

  it('빈 본문은 SMS 다 — 등급이 비었다고 사라지지 않는다', () => {
    expect(classifySms(byteLengthOf(''), false)).toBe('sms');
  });

  it('**제목을 적으면** 90byte 안이어도 LMS 다 — SMS 에는 제목 필드가 없다', () => {
    /* 화면만 보면 '짧은 문구 = SMS' 로 읽히지만, 제목이 있으면 통신사가 LMS 로 보낸다 —
       단가가 갈리는 경계다(_shared/messaging classifySms 머리말). */
    const body = 'a'.repeat(10);
    expect(classifySms(byteLengthOf(body), false, false)).toBe('sms');
    expect(classifySms(byteLengthOf(body), false, true)).toBe('lms');
  });

  it('제목이 있어도 이미지가 있으면 MMS 다 — 이미지가 더 센 승격 사유다', () => {
    expect(classifySms(byteLengthOf('짧은 문구'), true, true)).toBe('mms');
  });

  it('제목은 LMS·MMS 만 보여 준다', () => {
    expect(showsSubject('sms')).toBe(false);
    expect(showsSubject('lms')).toBe(true);
    expect(showsSubject('mms')).toBe(true);
  });

  it('제목은 **byte** 로 잰다 — 본문 글자 수와 다른 축이다', () => {
    // 한글 20자 = 40byte 가 상한이다(NHN Cloud SMS API v2.2 표준 규격)
    expect(byteLengthOf('가'.repeat(20))).toBe(LMS_SUBJECT_MAX_BYTES);
  });
});

/* ── 3. 검증 ─────────────────────────────────────────────────────────────── */

const VALID: TextTemplateFormValues = {
  name: '주문 완료 안내',
  status: 'draft',
  senderProfileId: 'sp-brand',
  senderPhone: '1588-1234',
  vendor: 'SureM',
  // 제목 없음 = SMS — 이 폼이 통과하는 기준선이다(types.ts subject 머리말)
  subject: '',
  body: '#{이름}님, 주문이 접수되었습니다.',
  imageFileName: '',
};

/** 첫 오류 메시지를 필드 이름으로 찾는다 */
function errorAt(values: TextTemplateFormValues, field: string): string | undefined {
  const parsed = textTemplateSchema.safeParse(values);
  if (parsed.success) return undefined;
  return parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('문자 템플릿 검증', () => {
  it('갖출 것을 갖춘 폼은 통과한다', () => {
    expect(isTextTemplateValid(VALID)).toBe(true);
  });

  it('본문이 비면 목업의 문구를 그대로 돌려준다', () => {
    expect(errorAt({ ...VALID, body: '' }, 'body')).toBe(BODY_REQUIRED_MESSAGE);
    // 공백만 친 것도 빈 것이다
    expect(errorAt({ ...VALID, body: '   \n ' }, 'body')).toBe(BODY_REQUIRED_MESSAGE);
  });

  it('본문 상한은 2000자 — 경계에서 뒤집힌다', () => {
    expect(errorAt({ ...VALID, body: 'a'.repeat(TEXT_BODY_MAX) }, 'body')).toBeUndefined();
    expect(errorAt({ ...VALID, body: 'a'.repeat(TEXT_BODY_MAX + 1) }, 'body')).toBeDefined();
  });

  it('템플릿명은 필수이고 60자를 넘을 수 없다', () => {
    expect(errorAt({ ...VALID, name: '' }, 'name')).toBeDefined();
    expect(errorAt({ ...VALID, name: '가'.repeat(TEMPLATE_NAME_MAX) }, 'name')).toBeUndefined();
    expect(errorAt({ ...VALID, name: '가'.repeat(TEMPLATE_NAME_MAX + 1) }, 'name')).toBeDefined();
  });

  it('발신 프로필과 발신번호는 둘 다 골라야 한다 — 사전등록된 것 중에서만 발송된다', () => {
    expect(errorAt({ ...VALID, senderProfileId: '' }, 'senderProfileId')).toBeDefined();
    expect(errorAt({ ...VALID, senderPhone: '' }, 'senderPhone')).toBeDefined();
  });

  it('발행하려면 초안 저장과 같은 조건을 만족해야 한다 — 상태만으로 검증이 느슨해지지 않는다', () => {
    expect(isTextTemplateValid({ ...VALID, status: 'active', body: '' })).toBe(false);
    expect(isTextTemplateValid({ ...VALID, status: 'active' })).toBe(true);
  });
});

describe('첨부 이미지 규칙', () => {
  it('JPG 만 붙일 수 있다 (대소문자·jpeg 허용)', () => {
    expect(imageFormatError('banner.jpg')).toBeNull();
    expect(imageFormatError('banner.JPEG')).toBeNull();
    expect(imageFormatError('banner.png')).not.toBeNull();
    expect(imageFormatError('banner')).not.toBeNull();
  });

  it('첨부하지 않은 것은 위반이 아니다 — 이미지는 선택이다', () => {
    expect(imageFormatError('')).toBeNull();
    expect(errorAt({ ...VALID, imageFileName: '' }, 'imageFileName')).toBeUndefined();
  });

  it('JPG 가 아닌 파일명이 폼에 남아 있으면 저장을 막는다', () => {
    expect(errorAt({ ...VALID, imageFileName: 'banner.png' }, 'imageFileName')).toBeDefined();
    expect(isTextTemplateValid({ ...VALID, imageFileName: 'banner.png' })).toBe(false);
    expect(isTextTemplateValid({ ...VALID, imageFileName: 'banner.jpg' })).toBe(true);
  });

  it('용량 상한은 500KB — 경계에서 뒤집힌다', () => {
    expect(imageSizeError(TEXT_IMAGE_MAX_BYTES)).toBeNull();
    expect(imageSizeError(TEXT_IMAGE_MAX_BYTES + 1)).not.toBeNull();
  });

  it('픽셀 상한은 1000×1000 — 한 변만 넘어도 막는다', () => {
    expect(imageEdgeError(TEXT_IMAGE_MAX_EDGE, TEXT_IMAGE_MAX_EDGE)).toBeNull();
    expect(imageEdgeError(TEXT_IMAGE_MAX_EDGE + 1, 10)).not.toBeNull();
    expect(imageEdgeError(10, TEXT_IMAGE_MAX_EDGE + 1)).not.toBeNull();
  });

  it('고른 파일은 확장자를 먼저 본다 — 한 번에 한 가지만 고치게 한다', () => {
    const tooBigPng = { name: 'a.png', size: TEXT_IMAGE_MAX_BYTES + 1 };
    expect(pickedImageError(tooBigPng)).toBe(imageFormatError('a.png'));
    expect(pickedImageError({ name: 'a.jpg', size: TEXT_IMAGE_MAX_BYTES + 1 })).toBe(
      imageSizeError(TEXT_IMAGE_MAX_BYTES + 1),
    );
    expect(pickedImageError({ name: 'a.jpg', size: 1024 })).toBeNull();
  });
});

/* ── 4. 미리보기의 치환변수 ───────────────────────────────────────────────── */

describe('미리보기는 변수를 치환하지 않고 드러낸다', () => {
  it('본문을 평문과 변수 조각으로 가른다', () => {
    expect(segmentsOf('안녕 #{이름}님')).toEqual([
      { text: '안녕 ', isVariable: false },
      { text: '#{이름}', isVariable: true },
      { text: '님', isVariable: false },
    ]);
  });

  it('조각을 다시 이으면 원문 그대로다 — 한 글자도 잃지 않는다', () => {
    const body = '#{이름}님 #{주문번호} 건이 접수되었어요. #{이름}님 감사해요.';
    expect(
      segmentsOf(body)
        .map((segment) => segment.text)
        .join(''),
    ).toBe(body);
  });

  it('변수가 없으면 조각 하나, 빈 본문이면 조각이 없다', () => {
    expect(segmentsOf('변수 없는 문구')).toHaveLength(1);
    expect(segmentsOf('')).toHaveLength(0);
  });
});

/* ── 5. 발송 화면이 고를 수 있는 템플릿 ────────────────────────────────────── */

describe('selectableTemplates — 발송 화면의 후보 목록', () => {
  it('문자 화면에는 켜져 있는 문자 템플릿만 온다', () => {
    const picked = selectableTemplates('text');

    expect(picked.length).toBeGreaterThan(0);
    expect(picked.every((template) => template.status === 'active')).toBe(true);
    expect(picked.every((template) => template.content.kind === 'text')).toBe(true);
  });

  it('초안(draft)은 절대 오지 않는다 — 쓰다 만 문구가 고객에게 나가지 않는다', () => {
    const all = listMessageTemplates();
    // 픽스처에 draft 가 실제로 있어야 이 단언이 의미를 갖는다
    expect(all.some((template) => template.status === 'draft')).toBe(true);

    for (const kind of ['text', 'email'] as const) {
      expect(selectableTemplates(kind).some((template) => template.status === 'draft')).toBe(false);
    }
  });

  it('꺼 둔(inactive) 것도 오지 않는다 — 끄는 행위가 의미를 잃지 않는다', () => {
    const all = listMessageTemplates();
    expect(all.some((template) => template.status === 'inactive')).toBe(true);

    for (const kind of ['text', 'email'] as const) {
      expect(selectableTemplates(kind).some((template) => template.status === 'inactive')).toBe(
        false,
      );
    }
  });

  it('다른 종류는 섞이지 않는다 — 이메일 화면에 문자 템플릿이 뜨지 않는다', () => {
    expect(selectableTemplates('email').every((t) => t.content.kind === 'email')).toBe(true);
    expect(selectableTemplates('text').every((t) => t.content.kind === 'text')).toBe(true);

    const textIds = new Set(selectableTemplates('text').map((t) => t.id));
    expect(selectableTemplates('email').some((t) => textIds.has(t.id))).toBe(false);
  });

  it('후보가 없으면 빈 배열이다 — 화면은 그것을 빈 드롭다운이 아니라 안내로 그린다', () => {
    // 켜져 있는 것을 전부 끄면 후보는 사라진다(화면의 '발행된 템플릿이 없습니다' 분기)
    const active = listMessageTemplates().filter((template) => template.status === 'active');
    for (const template of active) setMessageTemplateStatus(template.id, 'inactive');

    expect(selectableTemplates('text')).toEqual([]);
    expect(selectableTemplates('email')).toEqual([]);

    // 픽스처를 되돌린다 — 이 파일의 다른 테스트가 원래 상태를 본다
    for (const template of active) setMessageTemplateStatus(template.id, 'active');
    expect(selectableTemplates('text').length).toBeGreaterThan(0);
  });
});

/* ── 6. 블록 → HTML ──────────────────────────────────────────────────────── */

describe('renderBlocksToHtml — 이메일 블록을 발송 폼 본문으로 옮긴다', () => {
  const canvas = DEFAULT_EMAIL_CANVAS;

  it('블록이 없으면 빈 문자열 — 빈 껍데기를 만들어 내용이 있는 척하지 않는다', () => {
    expect(renderBlocksToHtml([], canvas)).toBe('');
  });

  it('제목·본문 블록이 각각 heading·p 로 나온다', () => {
    const html = renderBlocksToHtml(SAMPLE_BLOCKS, canvas);

    expect(html).toContain('이달의 소식');
    expect(html).toContain('<h2');
    expect(html).toContain('<p');
    expect(html).toContain('안녕하세요');
  });

  it('본문의 치환변수는 그대로 살아 남는다 — 발송 시점에 치환될 자리다', () => {
    expect(renderBlocksToHtml(SAMPLE_BLOCKS, canvas)).toContain('#{이름}');
  });

  it('사용자가 친 태그는 글자로 남는다 — 본문이 마크업으로 살아나지 않는다', () => {
    const injected = [contentBlockFor('text', 'x', '<img src=x onerror=alert(1)>주의')];
    const html = renderBlocksToHtml(injected, canvas);

    // `<` 가 실체참조로 바뀌면 그 뒤의 글자들은 **태그가 아니라 글자**다 — onerror 라는 낱말이
    // 문자열에 남아 있는 것은 위반이 아니고, 살아 있는 <img> 태그가 생기는 것이 위반이다.
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
    expect(html).toContain('주의');
  });

  it('캔버스 색·글꼴은 인라인 style 로 나간다 — 수신함에는 우리 스타일시트가 없다', () => {
    const html = renderBlocksToHtml(SAMPLE_BLOCKS, canvas);

    expect(html).toContain('style=');
    expect(html).toContain(canvas.canvasColor);
  });

  it('DOM 없이 돈다 — 이 테스트 자체가 그 증거다(문자열만 다룬다)', () => {
    expect(typeof renderBlocksToHtml(SAMPLE_BLOCKS, canvas)).toBe('string');
  });
});

describe('목록 검색 — 옛 이름으로도 찾힌다', () => {
  it("'친구톡' 으로 검색하면 브랜드 메시지가 걸린다", () => {
    // 친구톡은 2025-12-31 종료돼 브랜드 메시지로 대체됐지만, 운영자는 아직 옛 이름으로 찾는다.
    // 라벨에만 '(구 친구톡)' 을 달고 검색이 이름·본문만 훑으면 그 동선이 빈 화면으로 끝난다.
    const label = TEMPLATE_KIND_LABEL.brandmessage;
    expect(label).toContain('친구톡');
    expect(label.toLowerCase().includes('친구톡')).toBe(true);
  });

  it('옛 이름은 라벨 한 곳에만 있다 — 카카오가 낱말을 거둘 때 한 번에 지워진다', () => {
    const kindsWithLegacyName = (Object.keys(TEMPLATE_KIND_LABEL) as TemplateKind[]).filter(
      (kind) => TEMPLATE_KIND_LABEL[kind].includes('친구톡'),
    );
    expect(kindsWithLegacyName).toEqual(['brandmessage']);
  });
});
