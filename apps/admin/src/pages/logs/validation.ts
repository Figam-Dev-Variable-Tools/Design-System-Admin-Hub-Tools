// 기간 '직접 지정' 검증 (apps/admin/src/pages/logs/**)
//
// 손으로 쓴 if 문 검증기를 두지 않는다 — **규칙의 정본은 zod 스키마다** (ADR-0008 §7.3).
// 진입점은 `zod/mini` 다 (classic zod +17.5 kB vs mini +4.6 kB — 이 앱의 다른 화면과 같은 선택).
//
// [왜 이 화면에 검증이 필요한가]
// 프리셋(오늘·최근 7일·최근 30일)은 코드가 만든다 — 틀릴 수 없다. **직접 지정만 사람이 친다.**
// 그리고 감사 로그에는 두 가지 불가능이 있다:
//   ① **미래는 없다.** 아직 일어나지 않은 일은 기록될 수 없다.
//   ② **시작이 끝보다 뒤일 수 없다.**
// 이 둘을 막지 않으면 사용자는 '아무 결과 없음'을 보고 *시스템이 로그를 지웠다*고 의심하게 된다.
// 빈 결과의 원인이 데이터가 아니라 **자기 입력**임을 알려주는 것이 이 검증의 일이다 (COMP-11).
import * as z from 'zod/mini';

import { dayCount, isCalendarDate, kstToday } from './time';
import { MAX_RANGE_DAYS } from './types';
import type { DateRange } from './types';

// [공개 표면은 실제로 쓰이는 것만] `RangeIssueTarget` · `CustomRangeValidation` 은 export 하지
// 않는다 — 호출부는 `issueOf(issues, 'from')` 처럼 리터럴을 넘기고 반환 타입을 추론받을 뿐이다.
// 내보내면 아무도 쓰지 않는 공개 API 가 되고 지울 때 파급 범위를 알 수 없게 된다 (죽은 코드 0).

/** 화면의 입력 칸과 1:1 — 그래야 어느 칸이 틀렸는지 그 자리에 짚을 수 있다 */
type RangeIssueTarget = 'from' | 'to' | 'range';

export interface RangeIssue {
  readonly target: RangeIssueTarget;
  readonly message: string;
}

export interface CustomRangeDraft {
  readonly from: string;
  readonly to: string;
}

interface CustomRangeValidation {
  /** 이슈가 하나라도 있으면 null — 화면은 조회하지 않는다 */
  readonly range: DateRange | null;
  readonly issues: readonly RangeIssue[];
}

const FORMAT_MESSAGE = '날짜를 YYYY-MM-DD 형식으로 입력하세요.';

/**
 * 저장이 아니라 **조회를 막는** 규칙 전부.
 * `today` 를 인자로 받는 팩터리인 이유: '미래'의 기준이 실행 시각이면 테스트가 흔들린다.
 */
function customRangeSchema(today: string) {
  return z.object({ from: z.string(), to: z.string() }).check((ctx) => {
    const { from, to } = ctx.value;

    const fromOk = isCalendarDate(from);
    const toOk = isCalendarDate(to);

    if (!fromOk) {
      ctx.issues.push({ code: 'custom', input: from, path: ['from'], message: FORMAT_MESSAGE });
    }
    if (!toOk) {
      ctx.issues.push({ code: 'custom', input: to, path: ['to'], message: FORMAT_MESSAGE });
    }
    // 한쪽이라도 날짜가 아니면 비교는 의미가 없다 — 이미 그 칸에 이슈가 붙었다
    if (!fromOk || !toOk) return;

    if (to > today) {
      ctx.issues.push({
        code: 'custom',
        input: to,
        path: ['to'],
        message: '미래 날짜는 조회할 수 없습니다. 감사 기록에 미래는 없습니다.',
      });
    }

    if (from > to) {
      ctx.issues.push({
        code: 'custom',
        input: from,
        path: ['from'],
        message: '시작일은 종료일보다 늦을 수 없습니다.',
      });
      return;
    }

    const days = dayCount(from, to);
    if (days !== null && days > MAX_RANGE_DAYS) {
      ctx.issues.push({
        code: 'custom',
        input: from,
        path: ['range'],
        message: `조회 기간은 최대 ${String(MAX_RANGE_DAYS)}일입니다. (선택한 기간 ${String(days)}일)`,
      });
    }
  });
}

/**
 * 직접 지정 입력 → 조회 구간 + 이슈.
 * **화면이 부르는 유일한 검증 진입점이다.** 규칙은 여기서 판정하지 않는다 — 스키마가 판정한다.
 */
export function validateCustomRange(
  draft: CustomRangeDraft,
  now: Date = new Date(),
): CustomRangeValidation {
  const parsed = customRangeSchema(kstToday(now)).safeParse(draft);

  if (parsed.success) return { range: { from: draft.from, to: draft.to }, issues: [] };

  // zod 이슈의 path[0] 이 곧 화면의 입력 칸이다 (스키마가 그렇게 싣는다)
  const issues: readonly RangeIssue[] = parsed.error.issues.map((issue) => ({
    target: (issue.path[0] ?? 'range') as RangeIssueTarget,
    message: issue.message,
  }));

  return { range: null, issues };
}

/**
 * 화면에 띄울 **한 줄** — DateRangeField 는 그룹 단위로 error 하나를 받는다.
 * 우선순위: 시작일 → 종료일 → 구간. 가장 앞의 칸부터 고치게 한다.
 */
export function firstIssueMessage(issues: readonly RangeIssue[]): string | undefined {
  const order: readonly RangeIssueTarget[] = ['from', 'to', 'range'];
  for (const target of order) {
    const found = issues.find((issue) => issue.target === target);
    if (found !== undefined) return found.message;
  }
  return undefined;
}
