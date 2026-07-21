// 메시지 템플릿 폼 검증 규칙 (검증의 정본은 이 zod 스키마와 아래 순수 함수들이다)
//
// [문구는 전부 한글이다] 예외 없다. 한동안 본문 미입력 문구만 `This field is required.` 였고
// 근거는 '목업이 그 자리에 그렇게 적었다' 였다 — 편집기 문구가 한글로 넘어오면서 그 근거가
// 사라졌고(copy.ts 머리말), 지금은 BODY_REQUIRED_MESSAGE 도 한글이다.
//
// [상한값은 types.ts 가 정본] TEXT_BODY_MAX · TEXT_IMAGE_* 를 여기서 다시 세지 않는다 —
// 안내 문구(“~2000자”)와 검증이 같은 상수를 봐야 문구만 고치고 검증이 남는 사고가 없다.
import * as z from 'zod/mini';

import { requiredText } from '../../../shared/crud';
import { unknownTemplateVariableKeys } from '../../../shared/domain/template-variables';
import { byteLengthOf, hasAdPrefix, hasOptOut, LMS_SUBJECT_MAX_BYTES } from '../_shared/messaging';
import { blockingIssues, emailPreflight } from './email/preflight';
import {
  alimtalkBodyError,
  alimtalkVariableBearingText,
  brandMessageBodyError,
  buttonsError,
  cardsError,
  emphasisTitleError,
  extraInfoError,
  hasExtraInfo,
  itemHeaderError,
  itemsError,
  listItemsError,
  missingVariableSamples,
  requiresImage,
} from './kakao';
import type {
  AlimtalkEmphasisType,
  AlimtalkItem,
  AlimtalkLengthParts,
  AlimtalkMessageType,
  BrandCarouselCard,
  BrandListItem,
  BrandMessageBodyType,
  KakaoButton,
  KakaoButtonType,
  VariableSampleMap,
} from './kakao';
import {
  TEMPLATE_NAME_MAX,
  TEXT_BODY_MAX,
  TEXT_IMAGE_FORMAT,
  TEXT_IMAGE_MAX_BYTES,
  TEXT_IMAGE_MAX_EDGE,
} from './types';
import type { EmailTemplateContent } from './types';

/** 본문 미입력 — textarea 아래 인라인 오류 */
export const BODY_REQUIRED_MESSAGE = '메시지 내용을 입력하세요.';

/* ── 첨부 이미지 규칙 (순수 함수) ───────────────────────────────────────────────
 *
 * 파일을 고른 **그 자리에서** 막는다. 폼 제출까지 미루면 운영자는 본문을 다 쓰고 나서야 '이 이미지는
 * 안 된다' 를 듣는다 — 되돌릴 것이 가장 많아진 시점이다.
 *
 * 세 규칙은 확인 시점이 서로 다르다: 확장자는 이름만 보면 되고, 용량은 File 이 알려 주며, 크기는
 * 이미지를 실제로 디코드해야 안다. 그래서 판정을 셋으로 나누고 화면이 알게 된 순서대로 부른다. */

const JPG_RE = /\.jpe?g$/i;

/** JPG 만 허용 — 화면 안내('첨부할 수 있는 이미지 형식은 JPG 입니다.')와 같은 규칙 */
export function imageFormatError(fileName: string): string | null {
  if (fileName.trim() === '') return null;
  return JPG_RE.test(fileName.trim()) ? null : `${TEXT_IMAGE_FORMAT} 파일만 첨부할 수 있습니다.`;
}

/** 용량 상한 — 화면 안내('500KB 이하 이미지만 첨부할 수 있습니다.')와 같은 상수 */
export function imageSizeError(byteLength: number): string | null {
  return byteLength > TEXT_IMAGE_MAX_BYTES
    ? `이미지 용량은 ${String(TEXT_IMAGE_MAX_BYTES / 1024)}KB 를 넘을 수 없습니다.`
    : null;
}

/** 픽셀 크기 상한 — 화면 안내(Required size: 1000×1000px or less.)와 같은 상수 */
export function imageEdgeError(width: number, height: number): string | null {
  return width > TEXT_IMAGE_MAX_EDGE || height > TEXT_IMAGE_MAX_EDGE
    ? `이미지 크기는 ${String(TEXT_IMAGE_MAX_EDGE)}×${String(TEXT_IMAGE_MAX_EDGE)}px 이하여야 합니다.`
    : null;
}

/**
 * 고른 파일이 첨부 가능한가 — 이름·용량을 한 번에 본다(크기는 디코드가 필요해 여기 없다).
 * 첫 번째 위반만 돌려준다: 세 줄을 한꺼번에 쌓으면 무엇부터 고쳐야 할지가 사라진다.
 */
export function pickedImageError(file: {
  readonly name: string;
  readonly size: number;
}): string | null {
  return imageFormatError(file.name) ?? imageSizeError(file.size);
}

/* ── 알 수 없는 치환 변수 ─────────────────────────────────────────────────────
 *
 * ────────────────────────────────────────────────────────────────────────────
 * [왜 저장을 막는가 — 이것이 이 화면 최악의 사고다]
 *
 * `#{member.name}` 을 `#{member.nmae}` 로 잘못 적으면 어디에서도 티가 나지 않는다. 편집기는
 * 파란 글자로 정상 토큰처럼 그리고(VariableText 는 문법만 보지 이름은 모른다), 검증은 통과하고,
 * 발송도 성공한다. **수신자 화면에 `#{member.nmae}` 라는 글자가 그대로 찍힌 뒤에야** 알게 된다.
 * 이미 나간 문자·메일은 되돌릴 수 없고, 수신자 수만큼 그대로 곱해진다.
 *
 * 오타를 만들 수 있는 자리는 삽입 패널이 아니라 **손으로 적는 본문**이다 — 복사·붙여넣기로
 * 옮겨온 문구, 다른 시스템에서 쓰던 토큰이 그대로 남는 경우가 대부분이다.
 *
 * [왜 경고가 아니라 차단인가] 경고는 넘길 수 있고, 넘길 수 있는 경고는 결국 넘긴다. 반면 이
 * 규칙을 어기는 정당한 이유가 없다 — 카탈로그에 없는 토큰은 발송 시점에도 치환되지 않으므로,
 * 통과시켜 봐야 반드시 사고가 된다. 새 값이 필요하면 카탈로그에 넣는 것이 올바른 길이고,
 * 그 자리는 `shared/domain/template-variable-catalog.ts` 하나다.
 *
 * [배선 전에는 판정하지 않는다] 조회기가 null(= 카탈로그를 모른다)이면 **아무것도 막지 않는다**.
 * 빈 목록으로 뭉개면 멀쩡한 본문의 토큰이 전부 오타로 신고되어, 페이지 단위 테스트와 배선이
 * 늦은 화면이 통째로 저장 불가가 된다(shared/domain/template-variables.ts 머리말).
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * 본문에 남은 카탈로그 밖 토큰 — 없거나 판정 불가면 null.
 *
 * [고객센터 문법도 함께 잡는다] `{{고객명}}` 은 고객센터 답변 템플릿의 문법이고
 * (`support/_shared/domain.ts` applyTemplate) **이 화면의 발송 경로는 그것을 모른다**.
 * 위 `#{...}` 검사는 중괄호 하나짜리만 보므로 `{{...}}` 는 그대로 빠져나가 수신자에게 간다 —
 * 오타 토큰과 정확히 같은 사고라 같은 자리에서 막는다.
 *
 * 두 문법이 왜 하나로 합쳐지지 않았는지(합치면 오히려 위험한 이유)는
 * `support/replies/validation.ts` 의 머리말과 명세 FS-036 §7 #30 에 있다.
 */
export function unknownVariableError(text: string): string | null {
  const support = [...new Set(text.match(/\{\{[^}]*\}\}/g) ?? [])];
  if (support.length > 0) {
    return `고객센터 답변 템플릿 문법이 섞였습니다: ${support.join(' · ')} — 발송 템플릿의 치환변수는 #{member.name} 처럼 #{...} 표기입니다. {{...}} 는 발송 시점에 치환되지 않고 수신자에게 그대로 보입니다.`;
  }

  const unknown = unknownTemplateVariableKeys(text);
  if (unknown === null || unknown.length === 0) return null;

  const shown = unknown.map((key) => `#{${key}}`).join(' · ');
  return `변수 목록에 없는 치환변수가 있습니다: ${shown} — 이대로 발송하면 수신자에게 이 글자가 그대로 보입니다. 오타를 고치거나 ✨ 변수에서 다시 고르세요.`;
}

/**
 * 이메일 본문(블록 트리) 전체의 글자 — 토큰을 훑을 대상.
 *
 * [왜 블록을 하나씩 열지 않고 JSON 인가] 토큰은 **문자열 필드에만** 들어갈 수 있고, 블록 종류는
 * 14가지에 컬럼 안의 자식 블록까지 중첩된다. 필드를 손으로 열거하면 새 블록이 생길 때마다 여기를
 * 같이 고쳐야 하고, 빠뜨리면 그 블록의 오타만 검사를 빠져나간다 — 조용히 뚫리는 구멍이다.
 * 직렬화한 글자를 훑으면 구조를 몰라도 전부 걸린다. 토큰 문법(`#{a.b}`)에는 JSON 이 이스케이프할
 * 문자가 없어서 표현이 그대로 남는다.
 */
function emailVariableBearingText(content: EmailTemplateContent): string {
  return JSON.stringify(content);
}

/* ── 문자 템플릿 폼 ──────────────────────────────────────────────────────────── */

export const textTemplateSchema = z
  .object({
    name: requiredText('템플릿명', TEMPLATE_NAME_MAX),
    /**
     * 발행 상태는 폼 값이지만 사용자가 입력하는 칸이 아니다 — 헤더의 '초안 저장' 과 '발행' 이
     * 각자의 값을 실어 제출한다. 폼에 두는 이유는 저장 직전에 값이 한 덩어리로 모여야 하기 때문이다.
     */
    status: z.enum(['draft', 'active', 'inactive']),
    senderProfileId: z.string(),
    senderPhone: z.string(),
    vendor: z.enum(['SureM', 'NHN', 'Solapi']),
    /** 제목 — 선택이지만 적으면 LMS 로 승격된다(types.ts TextTemplateContent.subject 머리말) */
    subject: z.string(),
    body: z.string(),
    imageFileName: z.string(),
  })
  .check((ctx) => {
    /* 제목은 **byte** 로 잰다 — 본문(글자 수)과 다른 축이다. 40byte 는 통신사 표준 규격이고
       근거는 _shared/messaging LMS_SUBJECT_MAX_BYTES 머리말(NHN Cloud SMS API v2.2)에 있다.
       비어 있는 것은 오류가 아니다 — 제목 없이 보내는 것이 곧 SMS 다. */
    const bytes = byteLengthOf(ctx.value.subject);
    if (bytes > LMS_SUBJECT_MAX_BYTES) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.subject,
        path: ['subject'],
        message: `제목은 ${String(LMS_SUBJECT_MAX_BYTES)} byte 를 넘을 수 없습니다(현재 ${String(bytes)} byte).`,
      });
    }
  })
  .check((ctx) => {
    // 발신 프로필·발신번호 — 둘 다 등록된 것 중에서 고르는 자리라 '비었다' 만 막으면 된다
    if (ctx.value.senderProfileId.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderProfileId,
        path: ['senderProfileId'],
        message: '발신 프로필을 선택하세요.',
      });
    }
    if (ctx.value.senderPhone.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderPhone,
        path: ['senderPhone'],
        message: '발신번호를 선택하세요.',
      });
    }
  })
  .check((ctx) => {
    // 본문 — 글자 수로 센다(화면 카운터가 '/ 2000자' 라고 말한다).
    // SMS↔LMS 승격은 EUC-KR 바이트가 가르지만 그건 **발송 등급**이지 입력 상한이 아니다.
    const body = ctx.value.body;
    if (body.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: body,
        path: ['body'],
        message: BODY_REQUIRED_MESSAGE,
      });
      return;
    }
    if (body.length > TEXT_BODY_MAX) {
      ctx.issues.push({
        code: 'custom',
        input: body,
        path: ['body'],
        message: `본문은 ${String(TEXT_BODY_MAX)}자를 넘을 수 없습니다.`,
      });
    }
  })
  .check((ctx) => {
    // 본문에 카탈로그 밖 토큰이 남아 있으면 저장하지 않는다 (위 [알 수 없는 치환 변수] 머리말).
    // 제목도 함께 훑는다 — 제목에 넣은 오타도 똑같이 수신함에 그대로 찍힌다.
    const error = unknownVariableError(`${ctx.value.subject}\n${ctx.value.body}`);
    if (error !== null) {
      ctx.issues.push({ code: 'custom', input: ctx.value.body, path: ['body'], message: error });
    }
  })
  .check((ctx) => {
    // 첨부 이미지는 선택이지만, 붙였다면 JPG 여야 한다(용량·픽셀은 고르는 순간 이미 막혔다)
    const error = imageFormatError(ctx.value.imageFileName);
    if (error !== null) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.imageFileName,
        path: ['imageFileName'],
        message: error,
      });
    }
  });

export type TextTemplateFormValues = z.infer<typeof textTemplateSchema>;

/** 헤더의 저장 버튼을 열어 줄지 — 폼이 통째로 유효할 때만 (부분 유효는 발행을 허락하지 않는다) */
export function isTextTemplateValid(values: TextTemplateFormValues): boolean {
  return textTemplateSchema.safeParse(values).success;
}

/* ── 이메일 템플릿 폼 ────────────────────────────────────────────────────────── */

/**
 * 폼 값에 들어 있는 것이 정말 이메일 본문인가.
 *
 * [왜 타입 가드가 필요한가] 본문(블록 스택 + 캔버스)은 EmailBuilder 가 통째로 소유하는 **한 덩어리
 * 객체**라 스키마로 필드를 하나하나 세지 않는다(블록이 7종이고 각자 속성이 다르다 — 그 모양의 정본은
 * types.ts 의 판별 유니온이다). 대신 `z.custom` 에 이 가드를 물려 **모양을 확인한 뒤에만** 타입을
 * 인정한다 — `as` 로 우기지 않는다.
 *
 * [왜 얕은가] 이 값의 출처는 우리 저장소와 EmailBuilder 둘뿐이고, 블록 하나하나의 속성까지 다시
 * 세는 것은 같은 규칙을 두 번 적는 일이다. 여기서 막고 싶은 것은 '이메일이 아닌 것이 이메일 폼에
 * 들어오는' 경우다(문자 템플릿 id 로 이메일 편집기에 진입 등).
 */
function isEmailContent(value: unknown): value is EmailTemplateContent {
  if (typeof value !== 'object' || value === null) return false;
  if (!('kind' in value) || value.kind !== 'email') return false;
  if (!('blocks' in value) || !Array.isArray(value.blocks)) return false;
  if (!('canvas' in value) || typeof value.canvas !== 'object' || value.canvas === null) {
    return false;
  }
  if (!('subject' in value) || typeof value.subject !== 'string') return false;
  // 프리헤더도 확인한다 — 발송 전 점검이 이 값을 읽으므로(preflight.ts), 없는 채로 통과시키면
  // '문자열인 줄 알았는데 undefined' 가 점검 안에서 터진다. 얕은 가드의 목적은 그대로다.
  if (!('preheader' in value) || typeof value.preheader !== 'string') return false;
  return 'senderEmail' in value && typeof value.senderEmail === 'string';
}

export const emailTemplateSchema = z
  .object({
    name: requiredText('템플릿명', TEMPLATE_NAME_MAX),
    status: z.enum(['draft', 'active', 'inactive']),
    senderProfileId: z.string(),
    /** 제목·발신 주소·블록·캔버스가 한 덩어리로 들어 있다 (EmailBuilder 가 통째로 편집한다) */
    content: z.custom<EmailTemplateContent>(isEmailContent, {
      error: '이메일 본문을 불러오지 못했습니다.',
    }),
  })
  .check((ctx) => {
    if (ctx.value.senderProfileId.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderProfileId,
        path: ['senderProfileId'],
        message: '발신 프로필을 선택하세요.',
      });
    }
  })
  .check((ctx) => {
    // 블록 트리 전체(제목·본문·버튼·푸터)에서 카탈로그 밖 토큰을 찾는다.
    // 오류는 content 에 건다 — 어느 블록인지까지는 짚어 주지 못하지만, 메시지가 토큰을 그대로
    // 적어 주므로 운영자는 캔버스에서 그 글자를 찾아 고칠 수 있다.
    if (!isEmailContent(ctx.value.content)) return;
    const error = unknownVariableError(emailVariableBearingText(ctx.value.content));
    if (error !== null) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.content,
        path: ['content'],
        message: error,
      });
    }
  })
  .check((ctx) => {
    // 제목은 수신함에서 이 메일을 여는 유일한 단서다 — 비운 채로는 저장하지 않는다
    if (!isEmailContent(ctx.value.content)) return;
    if (ctx.value.content.subject.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.content.subject,
        path: ['content', 'subject'],
        message: '이메일 제목을 입력하세요.',
      });
    }
    if (ctx.value.content.senderEmail.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.content.senderEmail,
        path: ['content', 'senderEmail'],
        message: '발신 주소를 선택하세요.',
      });
    }
    // 블록이 하나도 없으면 수신자는 빈 메일을 받는다
    if (ctx.value.content.blocks.length === 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.content.blocks,
        path: ['content', 'blocks'],
        message: '본문 블록을 하나 이상 추가하세요.',
      });
    }
  })
  .check((ctx) => {
    /* ── 발송 전 점검 — **발행할 때만** ─────────────────────────────────────────
     *
     * [왜 초안에는 걸지 않는가] `draft` 는 '작성 중' 이라는 뜻이다(types.ts TemplateStatus).
     * 작성 중인 본문에 CTA 링크가 비어 있고 이미지 파일이 아직 없는 것은 **정상 상태**다. 거기에
     * 점검을 걸면 운영자는 오후에 하던 작업을 저장조차 못 하고 화면을 떠나야 한다 — 그러면 다음에
     * 하는 일은 점검을 통과하는 가짜 값(`https://a.com`)을 채워 넣는 것이고, 점검은 그 순간
     * 아무것도 막지 못하는 장식이 된다.
     *
     * 반대로 **발행은 '이제 이 템플릿으로 발송한다' 는 선언**이다. 되돌릴 수 없는 사고
     * (수신거부 누락·눌러도 안 가는 버튼·빈 상자로 도착하는 이미지)는 정확히 이 문턱에서 막는다.
     *
     * [판정을 여기서 세지 않는다] 규칙의 정본은 email/preflight.ts 하나다. 편집기의 [점검] 탭과
     * 이 스키마가 **같은 함수**를 부른다 — 화면은 빨간데 저장은 통과하는(혹은 그 반대의) 어긋남이
     * 생기지 않게. 경고(severity==='warning')는 걸러진다: 막을 수 없는 것을 막으면 운영자는 경고를
     * 끄는 법부터 배운다(preflight.ts 머리말).
     *
     * [path 를 왜 content 로 모으나] 어느 블록인지까지 짚어 주는 것은 캔버스의 일이고, 폼 오류에는
     * 그럴 자리가 없다(블록 트리는 폼 필드가 아니다). 메시지가 문제를 그대로 적어 주므로 운영자는
     * 편집기의 [점검] 탭에서 같은 문구를 찾아 '해당 블록으로' 를 누를 수 있다. */
    if (ctx.value.status === 'draft') return;
    if (!isEmailContent(ctx.value.content)) return;
    for (const issue of blockingIssues(emailPreflight(ctx.value.content))) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.content,
        path: ['content'],
        message: issue.message,
      });
    }
  });

export type EmailTemplateFormValues = z.infer<typeof emailTemplateSchema>;

/** 헤더의 저장 버튼을 열어 줄지 — 지금 폼이 든 상태(초안/발행) 기준 */
export function isEmailTemplateValid(values: EmailTemplateFormValues): boolean {
  return emailTemplateSchema.safeParse(values).success;
}

/**
 * **발행** 버튼을 열어 줄지 — 폼이 아직 초안 상태여도 '발행했을 때' 를 미리 판정한다.
 *
 * [왜 isEmailTemplateValid 로 대신할 수 없나] 그 함수는 폼에 들어 있는 status 로 검사한다.
 * 편집 중인 새 템플릿의 status 는 'draft' 라서, 발행 버튼까지 그 결과로 잠그면 **점검을
 * 통과하지 못한 본문에도 발행 버튼이 열린다** — 눌러 봐야 오류가 뜨는 버튼은 거짓말이다.
 * 상태만 바꿔 끼워 같은 스키마에 물어본다(규칙을 두 번 적지 않는다).
 */
export function isEmailTemplatePublishable(values: EmailTemplateFormValues): boolean {
  return emailTemplateSchema.safeParse({ ...values, status: 'active' }).success;
}

/* ── 카카오 템플릿 폼 (알림톡 · 브랜드 메시지) ─────────────────────────────────
 *
 * [왜 판정을 여기에 적지 않는가] 글자 수·버튼·변수 규칙의 정본은 kakao.ts 다. 편집기의 카운터와
 * 인라인 오류가 **같은 함수**를 부르고, 이 스키마는 그 함수를 zod issue 로 옮겨 담기만 한다 —
 * 한 규칙을 두 곳에 적으면 카운터는 통과하는데 저장이 막히는(혹은 그 반대의) 화면이 나온다.
 *
 * [왜 buttons·variableSamples 는 z.custom 인가] 이메일 본문과 같은 이유다(위 isEmailContent 머리말):
 * 그 모양의 정본은 kakao.ts 의 타입이고, 여기서 필드를 다시 세면 같은 규칙이 두 벌이 된다.
 * 값의 출처가 우리 저장소와 편집기뿐이라 가드는 **얕게** 둔다 — 막고 싶은 것은 '다른 종류의 값이
 * 이 폼에 들어오는' 경우다. `as` 는 쓰지 않는다.
 */

const BUTTON_TYPES: readonly KakaoButtonType[] = ['WL', 'AL', 'DS', 'BK', 'MD', 'AC'];

function isButtonType(value: unknown): value is KakaoButtonType {
  return BUTTON_TYPES.some((type) => type === value);
}

function isKakaoButton(value: unknown): value is KakaoButton {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || typeof value.id !== 'string') return false;
  if (!('type' in value) || !isButtonType(value.type)) return false;
  if (!('name' in value) || typeof value.name !== 'string') return false;
  if (!('linkMobile' in value) || typeof value.linkMobile !== 'string') return false;
  return 'linkPc' in value && typeof value.linkPc === 'string';
}

function isButtonList(value: unknown): value is readonly KakaoButton[] {
  return Array.isArray(value) && value.every(isKakaoButton);
}

function isVariableSampleMap(value: unknown): value is VariableSampleMap {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  return Object.values(value).every((sample) => typeof sample === 'string');
}

const buttonsField = z.custom<readonly KakaoButton[]>(isButtonList, {
  error: '버튼 목록을 불러오지 못했습니다.',
});

/* ── 배열 필드의 얕은 가드 ─────────────────────────────────────────────────────
 *
 * 아이템리스트 행·리스트 항목·캐러셀 카드는 전부 배열이다. 위 버튼과 같은 이유로 모양의 정본은
 * kakao.ts 의 타입이고, 여기서는 '다른 종류의 값이 들어왔는가' 만 얕게 본다. */

function isAlimtalkItem(value: unknown): value is AlimtalkItem {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || typeof value.id !== 'string') return false;
  if (!('name' in value) || typeof value.name !== 'string') return false;
  return 'description' in value && typeof value.description === 'string';
}

function isItemList(value: unknown): value is readonly AlimtalkItem[] {
  return Array.isArray(value) && value.every(isAlimtalkItem);
}

function isBrandListItem(value: unknown): value is BrandListItem {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || typeof value.id !== 'string') return false;
  if (!('title' in value) || typeof value.title !== 'string') return false;
  return 'imageFileName' in value && typeof value.imageFileName === 'string';
}

function isBrandListItems(value: unknown): value is readonly BrandListItem[] {
  return Array.isArray(value) && value.every(isBrandListItem);
}

function isCarouselCard(value: unknown): value is BrandCarouselCard {
  if (typeof value !== 'object' || value === null) return false;
  if (!('id' in value) || typeof value.id !== 'string') return false;
  if (!('header' in value) || typeof value.header !== 'string') return false;
  if (!('body' in value) || typeof value.body !== 'string') return false;
  if (!('imageFileName' in value) || typeof value.imageFileName !== 'string') return false;
  return 'buttons' in value && isButtonList(value.buttons);
}

function isCarouselCards(value: unknown): value is readonly BrandCarouselCard[] {
  return Array.isArray(value) && value.every(isCarouselCard);
}

const itemsField = z.custom<readonly AlimtalkItem[]>(isItemList, {
  error: '아이템 목록을 불러오지 못했습니다.',
});

const listItemsField = z.custom<readonly BrandListItem[]>(isBrandListItems, {
  error: '리스트 항목을 불러오지 못했습니다.',
});

const cardsField = z.custom<readonly BrandCarouselCard[]>(isCarouselCards, {
  error: '캐러셀 카드를 불러오지 못했습니다.',
});

const variableSamplesField = z.custom<VariableSampleMap>(isVariableSampleMap, {
  error: '치환변수 예시값을 불러오지 못했습니다.',
});

/* ── 알림톡 ────────────────────────────────────────────────────────────────── */

/**
 * 폼 값 → 글자 수 셈의 조각 묶음.
 *
 * [왜 함수로 빼는가] 이 묶음을 필요로 하는 check 가 셋이다(길이·미지 토큰·예시값). 세 곳에서
 * 손으로 조립하면 필드를 하나 늘릴 때 한 곳만 빠지고, 그러면 **길이는 세는데 예시값은 안 묻는**
 * 어긋난 검증이 된다.
 *
 * 배열 필드가 아직 가드를 통과하지 못했으면 null 을 준다 — 그때는 그 자리의 z.custom 이 이미
 * 자기 오류를 냈으므로 여기서 같은 값을 두 번 신고하지 않는다.
 */
function alimtalkLengthPartsOf(value: {
  readonly body: string;
  readonly emphasisType: AlimtalkEmphasisType;
  readonly emphasisTitle: string;
  readonly emphasisSubtitle: string;
  readonly itemHeader: string;
  readonly itemHighlightTitle: string;
  readonly itemHighlightDescription: string;
  readonly items: unknown;
  readonly messageType: AlimtalkMessageType;
  readonly extraInfo: string;
  readonly buttons: unknown;
}): AlimtalkLengthParts | null {
  if (!isItemList(value.items) || !isButtonList(value.buttons)) return null;
  return {
    body: value.body,
    emphasisType: value.emphasisType,
    emphasisTitle: value.emphasisTitle,
    emphasisSubtitle: value.emphasisSubtitle,
    itemHeader: value.itemHeader,
    itemHighlightTitle: value.itemHighlightTitle,
    itemHighlightDescription: value.itemHighlightDescription,
    items: value.items,
    messageType: value.messageType,
    extraInfo: value.extraInfo,
    buttons: value.buttons,
  };
}

export const alimtalkTemplateSchema = z
  .object({
    name: requiredText('템플릿명', TEMPLATE_NAME_MAX),
    status: z.enum(['draft', 'active', 'inactive']),
    senderProfileId: z.string(),
    channelId: z.string(),
    /* 두 축은 서로 독립이다 — 한 필드로 합치지 않는다(kakao.ts '알림톡 — 두 개의 축' 머리말) */
    messageType: z.enum(['basic', 'extra-info', 'channel-add', 'complex']),
    emphasisType: z.enum(['none', 'title', 'image', 'item-list']),
    emphasisTitle: z.string(),
    emphasisSubtitle: z.string(),
    emphasisImageFileName: z.string(),
    itemHeader: z.string(),
    itemHighlightTitle: z.string(),
    itemHighlightDescription: z.string(),
    itemHighlightThumbnailFileName: z.string(),
    items: itemsField,
    extraInfo: z.string(),
    body: z.string(),
    buttons: buttonsField,
    variableSamples: variableSamplesField,
    /** 심사 축 — 발행 상태(status)와 별개다. 카카오가 주인이라 화면이 자유로이 고치지 않는다 */
    approvalStatus: z.enum(['draft', 'inspecting', 'approved', 'rejected']),
    rejectReason: z.string(),
    hasBeenSent: z.boolean(),
  })
  .check((ctx) => {
    if (ctx.value.senderProfileId.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderProfileId,
        path: ['senderProfileId'],
        message: '발신 프로필을 선택하세요.',
      });
    }
    if (ctx.value.channelId.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.channelId,
        path: ['channelId'],
        message: '발신 카카오 채널을 선택하세요.',
      });
    }
  })
  .check((ctx) => {
    /* 본문 — 글자 수(바이트 아님) · 변수 40개 · 변수 전용 금지 · **강조·부가정보·버튼명 합산**.
       합산 대상이 무엇인지는 kakao.ts 가 정본이라 여기서 다시 세지 않고 조각을 넘기기만 한다. */
    const parts = alimtalkLengthPartsOf(ctx.value);
    if (parts === null) return;
    const error = alimtalkBodyError(parts);
    if (error !== null) {
      ctx.issues.push({ code: 'custom', input: ctx.value.body, path: ['body'], message: error });
    }
  })
  .check((ctx) => {
    if (!isButtonList(ctx.value.buttons)) return;
    const error = buttonsError(ctx.value.buttons, {
      kind: 'alimtalk',
      messageType: ctx.value.messageType,
    });
    if (error !== null) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.buttons,
        path: ['buttons'],
        message: error,
      });
    }
  })
  .check((ctx) => {
    /* 강조 유형이 요구하는 것 — 유형마다 '없으면 그 유형이 아닌' 것이 다르다.
       유형이 쓰지 않는 칸은 아예 묻지 않는다: 이미지형으로 바꾼 뒤에도 예전 강조 제목이 값으로
       남아 있을 수 있고(편집기는 값을 지우지 않는다), 그것까지 검사하면 화면에 보이지도 않는
       칸 때문에 저장이 막힌다(kakao.ts alimtalkBillableLength 와 같은 근거). */
    if (ctx.value.emphasisType === 'title') {
      const error = emphasisTitleError(ctx.value.emphasisTitle, ctx.value.emphasisSubtitle);
      if (error !== null) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.emphasisTitle,
          path: ['emphasisTitle'],
          message: error,
        });
      }
      return;
    }

    if (ctx.value.emphasisType === 'image') {
      // 이미지형인데 이미지가 없으면 유형을 고른 뜻이 사라진다 — 빈 자리가 그대로 심사에 나간다
      if (ctx.value.emphasisImageFileName.trim() === '') {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.emphasisImageFileName,
          path: ['emphasisImageFileName'],
          message: '이미지형은 이미지를 첨부해야 합니다.',
        });
      }
      return;
    }

    if (ctx.value.emphasisType === 'item-list') {
      if (!isItemList(ctx.value.items)) return;
      const error = itemsError(ctx.value.items);
      if (error !== null) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.items,
          path: ['items'],
          message: error,
        });
      }
      const optionalError = itemHeaderError(
        ctx.value.itemHeader,
        ctx.value.itemHighlightTitle,
        ctx.value.itemHighlightDescription,
        ctx.value.itemHighlightThumbnailFileName.trim() !== '',
      );
      if (optionalError !== null) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.itemHeader,
          path: ['itemHeader'],
          message: optionalError,
        });
      }
    }
  })
  .check((ctx) => {
    // 부가정보는 부가정보형·복합형에만 있다 — 없는 유형에서 물으면 채울 수 없는 칸을 요구하게 된다
    if (!hasExtraInfo(ctx.value.messageType)) return;
    const error = extraInfoError(ctx.value.extraInfo);
    if (error !== null) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.extraInfo,
        path: ['extraInfo'],
        message: error,
      });
    }
  })
  .check((ctx) => {
    // 심사에 나가는 글자 전부에서 카탈로그 밖 토큰을 찾는다.
    // 알림톡은 특히 위험하다 — 오타 토큰은 예시값 칸도 만들지 못해 심사에서 먼저 반려된다.
    const parts = alimtalkLengthPartsOf(ctx.value);
    if (parts === null) return;
    const error = unknownVariableError(alimtalkVariableBearingText(parts));
    if (error !== null) {
      ctx.issues.push({ code: 'custom', input: ctx.value.body, path: ['body'], message: error });
    }
  })
  .check((ctx) => {
    /* 카카오는 심사에 낼 때 **변수마다 예시값**을 함께 요구한다(kakao.ts VariableSampleMap 머리말).
       빠뜨린 채 제출하면 반려되므로 저장 시점에 막는다. */
    if (!isVariableSampleMap(ctx.value.variableSamples)) return;
    const parts = alimtalkLengthPartsOf(ctx.value);
    if (parts === null) return;
    // 본문뿐 아니라 강조 제목·아이템리스트도 심사에 나간다 — 거기 쓴 변수도 예시값이 필요하다
    const missing = missingVariableSamples(
      alimtalkVariableBearingText(parts),
      ctx.value.variableSamples,
    );
    if (missing.length > 0) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.variableSamples,
        path: ['variableSamples'],
        message: `치환변수 예시값을 입력하세요: ${missing.join(', ')}`,
      });
    }
  });

export type AlimtalkTemplateFormValues = z.infer<typeof alimtalkTemplateSchema>;

export function isAlimtalkTemplateValid(values: AlimtalkTemplateFormValues): boolean {
  return alimtalkTemplateSchema.safeParse(values).success;
}

/* ── 브랜드 메시지 (구 친구톡) ──────────────────────────────────────────────── */

export const brandMessageTemplateSchema = z
  .object({
    name: requiredText('템플릿명', TEMPLATE_NAME_MAX),
    status: z.enum(['draft', 'active', 'inactive']),
    senderProfileId: z.string(),
    channelId: z.string(),
    bodyType: z.enum(['text', 'image', 'wide-image', 'wide-list', 'carousel']),
    body: z.string(),
    imageFileName: z.string(),
    listItems: listItemsField,
    cards: cardsField,
    buttons: buttonsField,
    variableSamples: variableSamplesField,
    isAd: z.boolean(),
  })
  .check((ctx) => {
    if (ctx.value.senderProfileId.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.senderProfileId,
        path: ['senderProfileId'],
        message: '발신 프로필을 선택하세요.',
      });
    }
    if (ctx.value.channelId.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.channelId,
        path: ['channelId'],
        message: '발신 카카오 채널을 선택하세요.',
      });
    }
  })
  .check((ctx) => {
    // 상한이 **유형에서 온다** — 알림톡과 갈리는 지점이다(kakao.ts BRAND_MESSAGE_BODY_MAX)
    const error = brandMessageBodyError(ctx.value.body, ctx.value.bodyType);
    if (error !== null) {
      ctx.issues.push({ code: 'custom', input: ctx.value.body, path: ['body'], message: error });
    }
  })
  .check((ctx) => {
    // 브랜드 메시지는 심사가 없어 오타를 걸러 줄 제3자가 없다 — 저장에서 막는 것이 마지막 문이다
    const error = unknownVariableError(ctx.value.body);
    if (error !== null) {
      ctx.issues.push({ code: 'custom', input: ctx.value.body, path: ['body'], message: error });
    }
  })
  .check((ctx) => {
    // 이미지형에서 이미지가 없으면 유형을 고른 의미가 없다 — 빈 자리가 그대로 발송된다
    if (requiresImage(ctx.value.bodyType) && ctx.value.imageFileName.trim() === '') {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.imageFileName,
        path: ['imageFileName'],
        message: '이미지를 첨부하세요.',
      });
      return;
    }
    const error = imageFormatError(ctx.value.imageFileName);
    if (error !== null) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.imageFileName,
        path: ['imageFileName'],
        message: error,
      });
    }
  })
  .check((ctx) => {
    /* 카드형(와이드 리스트·캐러셀)은 항목·카드가 곧 본문이다 — 배열이 규격을 못 맞추면 그 유형을
       고른 뜻이 사라진다. 유형이 쓰지 않는 배열은 묻지 않는다(값은 남기고 의미만 유형이 정한다). */
    if (ctx.value.bodyType === 'wide-list') {
      if (!isBrandListItems(ctx.value.listItems)) return;
      const error = listItemsError(ctx.value.listItems);
      if (error !== null) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.listItems,
          path: ['listItems'],
          message: error,
        });
      }
      return;
    }
    if (ctx.value.bodyType === 'carousel') {
      if (!isCarouselCards(ctx.value.cards)) return;
      const error = cardsError(ctx.value.cards);
      if (error !== null) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.cards,
          path: ['cards'],
          message: error,
        });
      }
    }
  })
  .check((ctx) => {
    if (!isButtonList(ctx.value.buttons)) return;
    /* 브랜드 메시지에는 메시지 유형 축이 없다 — AC 버튼의 유형 제약은 알림톡만의 규칙이다.
       대신 **본문 유형**이 버튼의 개수·이름 상한을 정한다(와이드 이미지형은 2개·8자) —
       그 판정의 정본은 kakao.ts 의 buttonCountMaxOf · buttonNameMaxOf 다. */
    const error = buttonsError(ctx.value.buttons, {
      kind: 'brandmessage',
      bodyType: ctx.value.bodyType,
    });
    if (error !== null) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.buttons,
        path: ['buttons'],
        message: error,
      });
    }
  })
  .check((ctx) => {
    /* 광고성이면 (광고) 표기와 무료수신거부가 **본문 안에** 있어야 한다(정보통신망법 제50조 제4항).
       판정은 _shared/messaging 의 것을 쓴다 — SMS 광고 발송과 같은 규칙이다. */
    if (!ctx.value.isAd) return;
    if (!hasAdPrefix(ctx.value.body)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.body,
        path: ['body'],
        message: '광고성 메시지는 본문이 (광고) 로 시작해야 합니다.',
      });
      return;
    }
    if (!hasOptOut(ctx.value.body)) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.body,
        path: ['body'],
        message: '광고성 메시지는 무료수신거부 방법을 본문에 적어야 합니다.',
      });
    }
  });

export type BrandMessageTemplateFormValues = z.infer<typeof brandMessageTemplateSchema>;

export function isBrandMessageTemplateValid(values: BrandMessageTemplateFormValues): boolean {
  return brandMessageTemplateSchema.safeParse(values).success;
}

/* ── 문자열 → 유형 좁히기 ──────────────────────────────────────────────────────
 *
 * select 의 onChange 는 string 을 준다. `as` 로 우기는 대신 **허용 목록에서 되찾아** 좁힌다 —
 * 손으로 고친 값이 들어와도 기본값으로 되돌아갈 뿐 폼이 깨지지 않는다
 * (MessageTemplateEditorPage 의 parseKind 와 같은 결). */

const MESSAGE_TYPES: readonly AlimtalkMessageType[] = [
  'basic',
  'extra-info',
  'channel-add',
  'complex',
];
const EMPHASIS_TYPES: readonly AlimtalkEmphasisType[] = ['none', 'title', 'image', 'item-list'];
const BODY_TYPES: readonly BrandMessageBodyType[] = [
  'text',
  'image',
  'wide-image',
  'wide-list',
  'carousel',
];

export function parseMessageType(raw: string): AlimtalkMessageType {
  return MESSAGE_TYPES.find((type) => type === raw) ?? 'basic';
}

export function parseEmphasisType(raw: string): AlimtalkEmphasisType {
  return EMPHASIS_TYPES.find((type) => type === raw) ?? 'none';
}

export function parseBrandMessageBodyType(raw: string): BrandMessageBodyType {
  return BODY_TYPES.find((type) => type === raw) ?? 'text';
}
