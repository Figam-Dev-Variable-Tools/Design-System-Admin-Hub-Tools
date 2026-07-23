// 발송 전 점검의 계약
//
// [무엇을 지키려는 테스트인가] 이 규칙들은 '한 번 나가면 되돌릴 수 없는 것' 을 막는다. 그런데
// 규칙은 조용히 무력해진다 — 판정이 `url !== ''` 로 되돌아가거나, 새 블록이 분기에서 빠지거나,
// 경고가 오류로 승격되어 저장이 통째로 막히거나. 전부 화면에서는 아무 일도 안 일어난 것처럼
// 보이므로 여기서 잡는다.
//
// [문구가 아니라 rule id 로 검사한다] 근거는 preflight.ts 머리말.
import { describe, expect, it } from 'vitest';

import { createBlock, createLeafBlock, emptyEmailContent } from './blocks';
import {
  blockingIssues,
  emailPreflight,
  flattenBlocks,
  isSendable,
  preflightSummary,
} from './preflight';
import type { PreflightRuleId } from './preflight';
import { isEmailTemplatePublishable, isEmailTemplateValid } from '../validation';
import type { EmailTemplateFormValues } from '../validation';
import { SUBJECT_TRUNCATE_HINT } from '../types';
import type { EmailBlock, EmailTemplateContent, FooterBlock } from '../types';

let seq = 0;
function nextId(): string {
  seq += 1;
  return `block-${String(seq)}`;
}

/** 법 요건을 채운 푸터 — 이것이 없으면 어떤 본문도 오류를 하나 달고 시작한다 */
function legalFooter(): FooterBlock {
  const base = createLeafBlock('footer', nextId());
  if (base.blockKind !== 'footer') throw new Error('footer 팩토리가 다른 블록을 냈다');
  return {
    ...base,
    companyName: '스페이스플래닝',
    companyAddress: '서울특별시 어딘가 1길 2',
    contactEmail: 'help@example.com',
    unsubscribeUrl: 'https://example.com/unsubscribe',
  };
}

/** 오류가 하나도 없는 기준 본문 — 각 테스트는 여기서 한 곳만 망가뜨린다 */
function healthyContent(blocks: readonly EmailBlock[] = []): EmailTemplateContent {
  const heading = createLeafBlock('heading', nextId());
  const button = createLeafBlock('button', nextId());
  return {
    ...emptyEmailContent(),
    senderEmail: 'news@example.com',
    subject: '이달의 소식',
    preheader: '이번 달 신상품과 혜택을 모았어요.',
    blocks: [
      heading.blockKind === 'heading' ? { ...heading, content: '이달의 소식' } : heading,
      button.blockKind === 'button'
        ? { ...button, content: '자세히 보기', url: 'https://example.com/news' }
        : button,
      ...blocks,
      legalFooter(),
    ],
  };
}

function rulesOf(content: EmailTemplateContent): readonly PreflightRuleId[] {
  return emailPreflight(content).map((issue) => issue.rule);
}

describe('emailPreflight — 기준 본문', () => {
  it('제목·발신·프리헤더·CTA·푸터가 모두 갖춰지면 지적이 없다', () => {
    expect(emailPreflight(healthyContent())).toEqual([]);
    expect(isSendable(healthyContent())).toBe(true);
  });

  it('빈 본문은 발행할 수 없다 — 수신자가 빈 메일을 받는다', () => {
    const rules = rulesOf(emptyEmailContent());
    expect(rules).toContain('subject-missing');
    expect(rules).toContain('sender-missing');
    expect(rules).toContain('blocks-empty');
    expect(isSendable(emptyEmailContent())).toBe(false);
  });

  it('본문이 비면 블록 단위 지적은 내지 않는다 — 없는 블록을 나무라지 않는다', () => {
    // 블록이 0 인데 'CTA 가 없다'·'푸터가 없다' 까지 쏟아지면 고칠 것이 한 가지(블록 추가)인데
    // 지적이 셋으로 보인다. 첫 걸음만 말한다.
    expect(rulesOf(emptyEmailContent())).not.toContain('cta-missing');
    expect(rulesOf(emptyEmailContent())).not.toContain('unsubscribe-missing');
  });
});

describe('emailPreflight — 법 요건 (정보통신망법 제50조)', () => {
  it('법적 푸터가 없으면 오류다 — 없는 블록은 스스로를 신고하지 못한다', () => {
    const content = healthyContent();
    const withoutFooter: EmailTemplateContent = {
      ...content,
      blocks: content.blocks.filter((block) => block.blockKind !== 'footer'),
    };
    expect(rulesOf(withoutFooter)).toContain('unsubscribe-missing');
    expect(isSendable(withoutFooter)).toBe(false);
  });

  it('푸터는 있는데 수신거부 주소가 비면 오류다 — 문구만 있고 거부할 수 없는 메일이다', () => {
    const content = healthyContent();
    const broken: EmailTemplateContent = {
      ...content,
      blocks: content.blocks.map((block) =>
        block.blockKind === 'footer' ? { ...block, unsubscribeUrl: '' } : block,
      ),
    };
    expect(rulesOf(broken)).toContain('unsubscribe-url-missing');
  });

  it('전송자 명칭이 없으면 오류다', () => {
    const content = healthyContent();
    const broken: EmailTemplateContent = {
      ...content,
      blocks: content.blocks.map((block) =>
        block.blockKind === 'footer' ? { ...block, companyName: '' } : block,
      ),
    };
    expect(rulesOf(broken)).toContain('sender-name-missing');
  });
});

describe('emailPreflight — 죽은 링크', () => {
  /**
   * [이 테스트가 이 파일에서 가장 중요하다]
   * 주소가 '비어 있지 않다' 는 것과 '발송 HTML 에서 살아남는다' 는 것은 다르다. 판정이
   * `url !== ''` 로 되돌아가는 순간 이 케이스가 통과하기 시작하고, 그러면 눌러도 아무 데도
   * 가지 않는 버튼이 검사를 지나 발송된다.
   */
  it('토큰만 적힌 주소는 렌더러가 버리므로 오류다', () => {
    const content = healthyContent();
    const broken: EmailTemplateContent = {
      ...content,
      blocks: content.blocks.map((block) =>
        block.blockKind === 'button' ? { ...block, url: '#{TRACKING_URL}' } : block,
      ),
    };
    expect(rulesOf(broken)).toContain('cta-url-missing');
  });

  it('스킴이 없어도 도메인 꼴이면 통과한다 — 렌더러가 https 를 붙여 준다', () => {
    const content = healthyContent();
    const relaxed: EmailTemplateContent = {
      ...content,
      blocks: content.blocks.map((block) =>
        block.blockKind === 'button' ? { ...block, url: 'example.com/promo' } : block,
      ),
    };
    expect(rulesOf(relaxed)).not.toContain('cta-url-missing');
  });

  it('버튼 문구가 비면 오류다', () => {
    const content = healthyContent();
    const broken: EmailTemplateContent = {
      ...content,
      blocks: content.blocks.map((block) =>
        block.blockKind === 'button' ? { ...block, content: '  ' } : block,
      ),
    };
    expect(rulesOf(broken)).toContain('cta-label-missing');
  });
});

describe('emailPreflight — 이미지', () => {
  it('대체 텍스트가 없으면 오류다 — 이미지를 차단하는 수신자에게 빈 상자가 간다', () => {
    const image = createLeafBlock('image', nextId());
    const filled =
      image.blockKind === 'image' ? { ...image, fileName: 'hero.jpg', alt: '' } : image;
    expect(rulesOf(healthyContent([filled]))).toContain('image-alt-missing');
  });

  it('장식용이라고 표시하면 대체 텍스트를 요구하지 않는다', () => {
    const image = createLeafBlock('image', nextId());
    const decorative =
      image.blockKind === 'image'
        ? { ...image, fileName: 'divider.jpg', alt: '', decorative: true }
        : image;
    expect(rulesOf(healthyContent([decorative]))).not.toContain('image-alt-missing');
  });

  it('파일이 없으면 대체 텍스트와 무관하게 오류다', () => {
    const image = createLeafBlock('image', nextId());
    const empty = image.blockKind === 'image' ? { ...image, alt: '히어로 이미지' } : image;
    expect(rulesOf(healthyContent([empty]))).toContain('image-file-missing');
  });
});

describe('emailPreflight — 칸 안의 블록', () => {
  it('컬럼 안에 숨은 블록도 점검한다', () => {
    const columns = createBlock('columns', nextId());
    if (columns.blockKind !== 'columns') throw new Error('columns 팩토리가 다른 블록을 냈다');
    const child = createLeafBlock('button', nextId());
    const nested: EmailBlock = {
      ...columns,
      columns: columns.columns.map((column, index) =>
        index === 0 ? { ...column, blocks: [child] } : column,
      ),
    };
    // 갓 만든 버튼은 문구도 주소도 비어 있다 — 칸 안에 있다고 검사를 빠져나가면 안 된다
    const rules = rulesOf(healthyContent([nested]));
    expect(rules).toContain('cta-label-missing');
    expect(rules).toContain('cta-url-missing');
  });

  it('flattenBlocks 는 컬럼 자신과 칸 안의 블록을 모두 낸다', () => {
    const columns = createBlock('columns', nextId());
    if (columns.blockKind !== 'columns') throw new Error('columns 팩토리가 다른 블록을 냈다');
    const child = createLeafBlock('text', nextId());
    const nested: EmailBlock = {
      ...columns,
      columns: columns.columns.map((column, index) =>
        index === 0 ? { ...column, blocks: [child] } : column,
      ),
    };
    expect(flattenBlocks([nested]).map((block) => block.id)).toEqual([nested.id, child.id]);
  });
});

describe('emailPreflight — 경고는 막지 않는다', () => {
  it('프리헤더가 비면 경고하되 발행은 막지 않는다', () => {
    const content: EmailTemplateContent = { ...healthyContent(), preheader: '' };
    expect(rulesOf(content)).toContain('preheader-missing');
    expect(blockingIssues(emailPreflight(content))).toEqual([]);
    expect(isSendable(content)).toBe(true);
  });

  it('CTA 가 하나도 없으면 경고하되 발행은 막지 않는다', () => {
    const content = healthyContent();
    const noCta: EmailTemplateContent = {
      ...content,
      blocks: content.blocks.filter((block) => block.blockKind !== 'button'),
    };
    expect(rulesOf(noCta)).toContain('cta-missing');
    expect(isSendable(noCta)).toBe(true);
  });

  it('제목이 길면 경고한다 — 모바일 수신함에서 잘린다', () => {
    const content: EmailTemplateContent = {
      ...healthyContent(),
      subject: '가'.repeat(SUBJECT_TRUNCATE_HINT + 1),
    };
    expect(rulesOf(content)).toContain('subject-long');
    expect(isSendable(content)).toBe(true);
  });

  it('제목이 비면 길이 경고를 겹쳐 내지 않는다 — 고칠 것은 하나다', () => {
    const content: EmailTemplateContent = { ...healthyContent(), subject: '' };
    expect(rulesOf(content)).toContain('subject-missing');
    expect(rulesOf(content)).not.toContain('subject-long');
  });
});

describe('preflightSummary', () => {
  it('지적이 없으면 숫자가 아니라 안심을 말한다', () => {
    expect(preflightSummary([])).toBe('발송 전 점검 통과');
  });

  it('오류와 주의를 나눠 센다', () => {
    const content: EmailTemplateContent = { ...emptyEmailContent(), preheader: '' };
    const summary = preflightSummary(emailPreflight(content));
    expect(summary).toContain('오류');
    expect(summary).toContain('주의');
  });
});

describe('블록을 짚어 준다', () => {
  it('블록에서 난 지적은 그 블록 id 를 갖고, 본문 전체의 지적은 null 이다', () => {
    const content = healthyContent();
    const broken: EmailTemplateContent = {
      ...content,
      preheader: '',
      blocks: content.blocks.map((block) =>
        block.blockKind === 'button' ? { ...block, url: '' } : block,
      ),
    };
    const issues = emailPreflight(broken);
    const cta = issues.find((issue) => issue.rule === 'cta-url-missing');
    const preheader = issues.find((issue) => issue.rule === 'preheader-missing');
    expect(cta?.blockId).not.toBeNull();
    expect(preheader?.blockId).toBeNull();
  });
});

/* ── 저장 문턱 — 초안과 발행은 다르다 ──────────────────────────────────────────
 *
 * [이 테스트가 지키는 것] 점검을 저장 전체에 걸면 운영자는 **작성 중인 본문을 저장조차 못 한다**.
 * 그 다음에 하는 일은 점검을 통과하는 가짜 값을 채워 넣는 것이고, 그러면 점검은 아무것도 막지
 * 못하는 장식이 된다. 반대로 발행에서까지 느슨하면 수신거부 없는 메일이 그대로 나간다.
 * 문턱이 둘이라는 사실 자체가 규칙이므로 여기서 못박는다. */
describe('초안 저장 vs 발행 — 문턱이 다르다', () => {
  /** 제목·발신·블록은 있지만 수신거부(법적 푸터)가 없는, 작성 중인 본문 */
  function inProgress(): EmailTemplateFormValues {
    const content = healthyContent();
    return {
      name: '작성 중인 템플릿',
      status: 'draft',
      senderProfileId: 'sp-brand',
      content: {
        ...content,
        blocks: content.blocks.filter((block) => block.blockKind !== 'footer'),
      },
    };
  }

  it('작성 중인 본문도 초안으로는 저장된다', () => {
    expect(isEmailTemplateValid(inProgress())).toBe(true);
  });

  it('같은 본문을 발행하려 하면 막힌다 — 수신거부가 없다', () => {
    expect(isEmailTemplatePublishable(inProgress())).toBe(false);
  });

  it('점검을 통과하면 발행도 열린다', () => {
    const ready: EmailTemplateFormValues = {
      name: '발행 준비된 템플릿',
      status: 'draft',
      senderProfileId: 'sp-brand',
      content: healthyContent(),
    };
    expect(isEmailTemplatePublishable(ready)).toBe(true);
  });

  it('제목이 없으면 초안 저장도 막힌다 — 그것은 작성 중이라는 이유로 미룰 수 없다', () => {
    const noSubject: EmailTemplateFormValues = {
      ...inProgress(),
      content: { ...healthyContent(), subject: '' },
    };
    expect(isEmailTemplateValid(noSubject)).toBe(false);
  });
});
