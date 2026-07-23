// 발송 전 점검 — 이메일 본문이 '보내도 되는 상태' 인지 판정한다 (순수 · DOM 없이 돈다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 isBlockIncomplete 로 부족한가]
// 그 함수(types.ts)는 **블록 하나**를 보고 '이 블록이 덜 채워졌나' 를 답한다. 캔버스가 그 자리에
// 경고 딱지를 붙이는 데는 그것으로 충분하다. 그런데 발송 사고는 대개 블록 하나의 문제가 아니다:
//
//   · 수신거부가 없다        — **어느 블록의 문제도 아니다.** 없는 블록은 스스로를 신고하지 못한다.
//   · CTA 가 하나도 없다     — 블록마다 보면 전부 정상인데 메일 전체로는 목적이 없다.
//   · 주소를 적었는데 죽었다  — `#{TRACKING_URL}` 은 비어 있지 않지만 렌더러가 href 를 통째로 버린다
//                             (render-html safeUrl). '비었나' 만 보는 판정은 이것을 통과시킨다.
//
// 그래서 **본문 전체를 한 번에** 보는 판정이 따로 필요하다. 이 파일은 그 판정의 정본이고,
// 저장 검증(validation.ts)과 편집기의 점검 패널(PreflightPanel)이 **같은 함수**를 부른다 —
// 화면은 통과인데 저장이 막히는(혹은 그 반대의) 어긋남이 생기지 않게.
//
// [error 와 warning 을 왜 나누나]
//   error   — 이대로 나가면 **되돌릴 수 없는 사고**다. 저장/발행을 막는다.
//             (법 요건 누락 · 눌러도 안 가는 버튼 · 수신자에게 빈 상자로 도착하는 이미지)
//   warning — 나쁜 메일이지만 잘못된 메일은 아니다. 알리되 막지 않는다.
//             막을 수 없는 것을 막으면 운영자는 경고를 끄는 법부터 배운다.
//
// [왜 규칙마다 id 를 두나] 문구는 다듬어지지만 규칙은 그대로다. 테스트가 문구를 검사하면 말투
// 하나 고칠 때마다 테스트가 깨지고, 그러면 문구를 안 고치게 된다. 검사의 축은 id 다.
// ─────────────────────────────────────────────────────────────────────────────
import { safeUrl } from '../render-html';
import { SUBJECT_TRUNCATE_HINT } from '../types';
import type { EmailBlock, EmailTemplateContent } from '../types';
import { BLOCK_KIND_LABEL } from './blocks';

export type PreflightSeverity = 'error' | 'warning';

/**
 * 규칙 식별자. 문구가 아니라 이것이 규칙의 이름이다(위 머리말).
 * 새 규칙을 더할 때 여기에 이름을 먼저 적으면, 아래 표가 채워지지 않아 타입이 막는다.
 */
export type PreflightRuleId =
  | 'subject-missing'
  | 'subject-long'
  | 'sender-missing'
  | 'preheader-missing'
  | 'blocks-empty'
  | 'content-empty'
  | 'cta-missing'
  | 'cta-label-missing'
  | 'cta-url-missing'
  | 'image-file-missing'
  | 'image-alt-missing'
  | 'link-url-missing'
  | 'unsubscribe-missing'
  | 'unsubscribe-url-missing'
  | 'sender-name-missing';

export interface PreflightIssue {
  readonly rule: PreflightRuleId;
  readonly severity: PreflightSeverity;
  /** 운영자가 읽는 한 줄. '무엇이 없다' 가 아니라 '그래서 무슨 일이 생긴다' 까지 적는다 */
  readonly message: string;
  /**
   * 짚어 줄 블록. 없는 것에 대한 지적(수신거부 누락 등)은 가리킬 블록이 없으므로 null 이다 —
   * 패널이 '이동' 버튼을 낼지 말지를 이 값으로 가른다.
   */
  readonly blockId: string | null;
}

/* ── 순회 ────────────────────────────────────────────────────────────────────
 *
 * 컬럼 안까지 본다. 깊이는 최대 2다(컬럼 안에 컬럼은 없다 — types.ts EmailLeafBlock). */

/** 최상위 + 모든 칸의 블록을 한 줄로 편다. 컬럼 자신도 포함한다 */
export function flattenBlocks(blocks: readonly EmailBlock[]): readonly EmailBlock[] {
  return blocks.flatMap((block) =>
    block.blockKind === 'columns'
      ? [block, ...block.columns.flatMap((column) => column.blocks)]
      : [block],
  );
}

/** 이 주소가 **발송 HTML 에서 살아남는가** — 판정은 렌더러의 것을 그대로 쓴다 */
function isDeadLink(url: string): boolean {
  return safeUrl(url) === '';
}

function label(block: EmailBlock): string {
  return BLOCK_KIND_LABEL[block.blockKind];
}

/* ── 블록 하나가 내는 지적 ───────────────────────────────────────────────────
 *
 * blockKind 로 전수 분기한다 — default 를 두지 않아 블록이 하나 늘면 **여기서 타입 에러가 난다**.
 * (점검을 빠져나가는 블록이 조용히 생기지 않게 하는 장치다. render-html 의 renderLeafRow 와 같은 결.) */
function blockIssues(block: EmailBlock): readonly PreflightIssue[] {
  const at = (
    rule: PreflightRuleId,
    severity: PreflightSeverity,
    message: string,
  ): PreflightIssue => ({ rule, severity, message, blockId: block.id });

  switch (block.blockKind) {
    case 'button': {
      const issues: PreflightIssue[] = [];
      if (block.content.trim() === '') {
        issues.push(at('cta-label-missing', 'error', '버튼에 문구가 없어요. 빈 버튼이 나가요.'));
      }
      if (isDeadLink(block.url)) {
        issues.push(
          at(
            'cta-url-missing',
            'error',
            '버튼 링크가 비어 있거나 주소로 인정되지 않아요. 버튼은 그려지지만 눌러도 아무 데도 가지 않아요.',
          ),
        );
      }
      return issues;
    }

    case 'image': {
      const issues: PreflightIssue[] = [];
      if (block.fileName.trim() === '') {
        issues.push(at('image-file-missing', 'error', '이미지 파일이 지정되지 않았어요.'));
      }
      // 장식용은 alt="" 로 나가는 것이 옳다 — 요구하면 오히려 스크린리더가 파일명을 읽는다
      if (!block.decorative && block.alt.trim() === '') {
        issues.push(
          at(
            'image-alt-missing',
            'error',
            '이미지 대체 텍스트가 없어요. 이미지를 차단하는 메일 클라이언트(Outlook 기본값)에서는 빈 상자만 도착해요.',
          ),
        );
      }
      return issues;
    }

    case 'video':
      return isDeadLink(block.videoUrl)
        ? [at('link-url-missing', 'error', '비디오 링크 주소가 비어 있거나 유효하지 않아요.')]
        : [];

    case 'logo':
    case 'avatar':
      return block.fileName.trim() === ''
        ? [at('image-file-missing', 'error', `${label(block)} 파일이 지정되지 않았어요.`)]
        : [];

    case 'heading':
    case 'text':
      return block.content.trim() === ''
        ? [at('content-empty', 'error', `${label(block)} 블록이 비어 있어요.`)]
        : [];

    case 'list':
      return block.items.every((item) => item.text.trim() === '')
        ? [at('content-empty', 'error', '목록 블록에 항목이 하나도 채워지지 않았어요.')]
        : [];

    case 'menu':
      return block.items.some((item) => item.label.trim() === '' || isDeadLink(item.url))
        ? [
            at(
              'link-url-missing',
              'error',
              '메뉴 항목 중 이름이나 주소가 빠진 것이 있어요. 그 항목은 눌리지 않는 글자로 나가요.',
            ),
          ]
        : [];

    case 'social':
      return block.links.length === 0 || block.links.some((link) => isDeadLink(link.url))
        ? [
            at(
              'link-url-missing',
              'error',
              '소셜 링크 중 주소가 빠진 것이 있어요. 그 항목은 눌리지 않는 글자로 나가요.',
            ),
          ]
        : [];

    case 'footer': {
      const issues: PreflightIssue[] = [];
      // 정보통신망법 제50조 — 전송자 명칭과 수신거부 방법 (types.ts FooterBlock 머리말)
      if (block.companyName.trim() === '') {
        issues.push(
          at(
            'sender-name-missing',
            'error',
            '푸터에 전송자 명칭이 없어요. 광고성 메일은 전송자를 밝혀야 해요.',
          ),
        );
      }
      if (isDeadLink(block.unsubscribeUrl)) {
        issues.push(
          at(
            'unsubscribe-url-missing',
            'error',
            '수신거부 링크 주소가 비어 있거나 유효하지 않아요. 수신거부 문구만 있고 실제로 거부할 수 없는 메일이 돼요.',
          ),
        );
      }
      return issues;
    }

    case 'columns':
      // 칸이 전부 비면 그릴 것이 없다. 칸 **안**의 블록은 flattenBlocks 가 따로 훑으므로 여기서 보지 않는다
      return block.columns.every((column) => column.blocks.length === 0)
        ? [at('content-empty', 'error', '다단 블록의 칸이 모두 비어 있어요.')]
        : [];

    case 'divider':
    case 'spacer':
      // 채울 것이 없는 블록이다 — 비어 있는 것이 정상 상태다
      return [];
  }
}

/* ── 본문 전체가 내는 지적 ─────────────────────────────────────────────────── */

/**
 * 발송 전 점검 — 이 본문을 지금 보내면 무엇이 문제인가.
 *
 * 순서는 '고치는 순서' 다: 머리(제목·발신·프리헤더) → 몸(블록) → 법 요건. 심각도로 정렬하지
 * 않는 이유는, 운영자가 화면을 위에서 아래로 훑으며 고치기 때문이다.
 */
export function emailPreflight(content: EmailTemplateContent): readonly PreflightIssue[] {
  const issues: PreflightIssue[] = [];
  /** 가리킬 블록이 없는 지적 — 본문 전체에 대한 것이다 */
  function push(rule: PreflightRuleId, severity: PreflightSeverity, message: string): void {
    issues.push({ rule, severity, message, blockId: null });
  }

  /* ── 머리 ── */
  if (content.subject.trim() === '') {
    push('subject-missing', 'error', '제목이 없어요. 수신함에서 이 메일을 여는 유일한 단서예요.');
  } else if (content.subject.trim().length > SUBJECT_TRUNCATE_HINT) {
    push(
      'subject-long',
      'warning',
      `제목이 ${String(SUBJECT_TRUNCATE_HINT)}자를 넘어요. 모바일 수신함에서는 뒷부분이 잘려 보여요.`,
    );
  }

  if (content.senderEmail.trim() === '') {
    push('sender-missing', 'error', '발신 주소가 선택되지 않았어요.');
  }

  if (content.preheader.trim() === '') {
    push(
      'preheader-missing',
      'warning',
      '프리헤더가 비어 있어요. 수신함에서 제목 뒤에 본문 맨 앞 글자가 그대로 끌려 나와요.',
    );
  }

  /* ── 몸 ── */
  if (content.blocks.length === 0) {
    push('blocks-empty', 'error', '본문 블록이 하나도 없어요. 수신자는 빈 메일을 받아요.');
    return issues;
  }

  const flat = flattenBlocks(content.blocks);
  for (const block of flat) issues.push(...blockIssues(block));

  if (!flat.some((block) => block.blockKind === 'button')) {
    push(
      'cta-missing',
      'warning',
      '버튼(CTA)이 하나도 없어요. 수신자가 다음에 무엇을 하면 되는지 알 수 없어요.',
    );
  }

  /* ── 법 요건 ──
   *
   * 푸터가 **없는** 경우는 어느 블록의 문제도 아니다 — 없는 블록은 스스로를 신고하지 못한다.
   * 그래서 이 판정만 본문 전체를 보는 자리에 있다(위 머리말).
   * 푸터가 있는데 내용이 빠진 경우는 blockIssues 가 이미 잡았다. */
  if (!content.blocks.some((block) => block.blockKind === 'footer')) {
    push(
      'unsubscribe-missing',
      'error',
      '수신거부 안내(법적 푸터)가 없어요. 광고성 정보를 전송하려면 전송자 명칭과 무료 수신거부 방법을 본문에 밝혀야 해요(정보통신망법 제50조).',
    );
  }

  return issues;
}

/** 저장·발행을 막는 지적만 — 경고는 알리기만 한다(위 머리말) */
export function blockingIssues(issues: readonly PreflightIssue[]): readonly PreflightIssue[] {
  return issues.filter((issue) => issue.severity === 'error');
}

/** 지금 이 본문을 발행해도 되는가 */
export function isSendable(content: EmailTemplateContent): boolean {
  return blockingIssues(emailPreflight(content)).length === 0;
}

/**
 * 점검 결과 한 줄 요약 — 툴바 배지가 쓴다.
 * 0건일 때 '0건' 이라고 말하지 않는 이유: 그 자리에 필요한 것은 숫자가 아니라 안심이다.
 */
export function preflightSummary(issues: readonly PreflightIssue[]): string {
  const errors = issues.filter((issue) => issue.severity === 'error').length;
  const warnings = issues.length - errors;
  if (errors === 0 && warnings === 0) return '발송 전 점검 통과';
  if (errors === 0) return `주의 ${String(warnings)}건`;
  return warnings === 0
    ? `오류 ${String(errors)}건`
    : `오류 ${String(errors)}건 · 주의 ${String(warnings)}건`;
}
