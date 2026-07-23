// 답변 조립 — 파싱 결과와 실행 결과를 **화면이 그대로 그릴 수 있는 값**으로 바꾼다
//
// [여기가 정직성의 마지막 관문] 화면은 이 함수가 돌려준 것만 그린다. 그래서 '모르겠다' 를
// 말해야 하는 경우가 값으로 존재해야 한다 — 문자열을 화면에서 즉흥적으로 짓지 않는다.
//
// [답변은 네 종류뿐이다]
//   result       — 실제 행을 찾았다(0행 포함). 숫자와 표는 전부 픽스처에서 나온 것이다.
//   guidance     — 알아듣지 못했다. **무엇을 할 수 있는지** 대신 말한다.
//   not-wired    — 도메인은 알지만 데이터가 아직 연결되지 않았다.
//   error        — 조회 자체가 실패했다.
// 'AI 가 생각해서 지어낸 문장' 은 이 유니온에 없다. 없어야 한다.
import { DOMAINS } from './domains';
import { executeQuery } from './execute';
import type { QueryOutcome } from './execute';
import { parseQuery } from './parser';
import type { ParseNotice, ParsedQuery } from './parser';

/** 후속 제안(↳) 한 줄 — 누르면 그대로 다시 묻는다. 반드시 **파싱되는 질의**여야 한다 */
export interface FollowUp {
  readonly label: string;
  readonly query: string;
}

export type AgentAnswer =
  | {
      readonly kind: 'result';
      readonly outcome: QueryOutcome;
      /** 요청과 답이 다른 지점 — 화면이 표보다 **먼저** 그린다 */
      readonly notices: readonly ParseNotice[];
      readonly followUps: readonly FollowUp[];
    }
  | {
      readonly kind: 'guidance';
      readonly headline: string;
      readonly detail: string;
      readonly followUps: readonly FollowUp[];
    }
  | {
      readonly kind: 'not-wired';
      readonly domainLabel: string;
      readonly followUps: readonly FollowUp[];
    }
  | { readonly kind: 'error'; readonly message: string; readonly followUps: readonly FollowUp[] };

/** 어떤 답변에도 붙일 수 있는 기본 제안 — 이 화면이 확실히 할 수 있는 것들 */
const STARTER_FOLLOW_UPS: readonly FollowUp[] = [
  { label: '이번달 가입한 VIP 회원 보기', query: '@회원목록 이번달 가입한 VIP 보여줘' },
  { label: '구매 이력이 있는 VVIP 회원 보기', query: '@회원목록 구매한 VVIP 보여줘' },
  { label: '처리중인 1:1 문의 보기', query: '@문의 처리중 보여줘' },
];

/** 이 화면이 답할 수 있는 것의 목록 — 못 알아들었을 때 이것을 대신 보여준다 */
export function capabilityDetail(): string {
  const names = DOMAINS.map((domain) => `@${domain.aliases[0] ?? domain.label}`).join(' · ');
  return `${names} 를 멘션하고 조건을 함께 적어 주세요. 이 화면은 저장된 데이터를 조건으로 거르는 조회만 해요 — 요약·분석·예측·추천은 하지 않아요.`;
}

/** 통지가 제안을 갖고 있으면 후속 제안으로 올린다 */
function followUpsFromNotices(notices: readonly ParseNotice[]): readonly FollowUp[] {
  return notices.flatMap((notice) =>
    notice.suggestion === null
      ? []
      : [{ label: notice.suggestion.replace(/^@\S+\s*/, '').trim(), query: notice.suggestion }],
  );
}

/** 결과가 나온 뒤 이어서 물어볼 만한 것 — 조건을 한 칸 넓히거나 좁힌다 */
function followUpsForOutcome(query: ParsedQuery, outcome: QueryOutcome): readonly FollowUp[] {
  const alias = DOMAINS.find((domain) => domain.id === query.domainId)?.aliases[0] ?? '';
  if (outcome.total === 0) {
    // 0건일 때 같은 조건을 다시 권하는 것은 무의미하다 — 조건을 **푸는** 쪽을 권한다
    return [{ label: `조건 없이 ${outcome.domainLabel} 전체 보기`, query: `@${alias} 보여줘` }];
  }
  return [{ label: `${outcome.domainLabel} 전체 건수 보기`, query: `@${alias} 몇 건이야` }];
}

/**
 * 질문 한 줄에 대한 답을 만든다. **순수 함수** — 시각을 주입받는다.
 *
 * @param now 기간('이번달')의 기준 시각
 */
export function buildAnswer(input: string, now: Date): AgentAnswer {
  const parsed = parseQuery(input);

  switch (parsed.kind) {
    case 'no-mention':
      return {
        kind: 'guidance',
        headline: '어떤 데이터를 봐야 할지 알 수 없어요.',
        detail: capabilityDetail(),
        followUps: STARTER_FOLLOW_UPS,
      };

    case 'unknown-domain':
      return {
        kind: 'guidance',
        headline: `'@${parsed.alias}' 는 조회할 수 있는 데이터가 아니에요.`,
        detail: capabilityDetail(),
        followUps: STARTER_FOLLOW_UPS,
      };

    case 'unsupported-intent':
      return {
        kind: 'guidance',
        headline: `'${parsed.verb}' 은 이 화면이 할 수 없는 요청이에요.`,
        detail:
          '저장된 데이터를 조건으로 거르는 조회만 해요. 판단·추론이 필요한 질문에 답하려면 언어 모델 연동이 필요하며, 아직 연결되어 있지 않아요.',
        followUps: STARTER_FOLLOW_UPS,
      };

    case 'ok': {
      const executed = executeQuery(parsed.query, now);

      if (executed.kind === 'failed') {
        return {
          kind: 'not-wired',
          domainLabel: executed.failure.domainLabel,
          followUps: STARTER_FOLLOW_UPS,
        };
      }

      return {
        kind: 'result',
        outcome: executed.outcome,
        notices: parsed.query.notices,
        followUps: [
          ...followUpsFromNotices(parsed.query.notices),
          ...followUpsForOutcome(parsed.query, executed.outcome),
        ],
      };
    }
  }
}

/** 조회가 던진 예외를 답변으로 바꾼다 — 대화는 살아남아야 한다 */
export function errorAnswer(message: string): AgentAnswer {
  return { kind: 'error', message, followUps: STARTER_FOLLOW_UPS };
}

export { STARTER_FOLLOW_UPS };
