// 기간 '직접 지정' 검증 (A40 소유 — apps/admin/src/pages/login-history/**)
//
// 손으로 쓴 if 문 검증기를 두지 않는다 — **규칙의 정본은 zod 스키마다** (ADR-0008 §7.3).
// 진입점은 `zod/mini` 다 (classic zod +17.5 kB vs mini +4.6 kB — 같은 이유로 customer-settings 도 mini 다).
//
// [왜 이 화면에 검증이 필요한가]
// 프리셋(오늘·최근 7일·최근 30일)은 코드가 만든다 — 틀릴 수 없다. **직접 지정만 사람이 친다.**
// 그리고 감사 로그에는 두 가지 불가능이 있다:
//   ① **미래는 없다.** 아직 일어나지 않은 로그인은 기록될 수 없다.
//   ② **시작이 끝보다 뒤일 수 없다.**
// 이 둘을 막지 않으면 사용자는 '아무 결과 없음'을 보고 *시스템이 로그를 지웠다*고 의심하게 된다.
// 빈 결과의 원인이 데이터가 아니라 **자기 입력**임을 알려주는 것이 이 검증의 일이다.
import * as z from 'zod/mini';

import { dayCount, formatDate, isCalendarDate } from '../../shared/format';
import { MAX_RANGE_DAYS } from './types';
import type { DateRange } from './types';

// [공개 표면은 실제로 쓰이는 것만] `RangeIssueTarget` · `CustomRangeValidation` 은 **export 하지 않는다** —
// 호출부는 `issueOf(issues, 'from')` 처럼 리터럴을 넘기고 반환 타입을 추론받을 뿐, 이름으로 import 하지
// 않는다. 내보내면 아무도 쓰지 않는 공개 API 가 되고 지울 때 파급 범위를 알 수 없게 된다 (A83 축5).

/** 화면의 입력 칸 id 와 1:1 — 그래야 어느 칸이 틀렸는지 그 자리에 짚을 수 있다 */
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

// [isCalendarDate 는 여기 없다 — ERP-09] '실재하는 날짜인가'(2026-02-31 은 형식은 맞지만
// 존재하지 않는다)의 판정은 shared/format 한 벌이다. 여기 있던 사본은 로컬 자정으로 되읽어
// 판정했고, 그래서 같은 입력이 보는 사람의 타임존에 따라 다른 답을 낼 수 있었다.

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
  // '오늘'은 서울의 오늘이다 (formatDate 는 KST 고정 — shared/format, ERP-09)
  const parsed = customRangeSchema(formatDate(now)).safeParse(draft);

  if (parsed.success) return { range: { from: draft.from, to: draft.to }, issues: [] };

  // zod 이슈의 path[0] 이 곧 화면의 입력 칸 id 다 (스키마가 그렇게 싣는다)
  const issues: readonly RangeIssue[] = parsed.error.issues.map((issue) => ({
    target: (issue.path[0] ?? 'range') as RangeIssueTarget,
    message: issue.message,
  }));

  return { range: null, issues };
}

/** 특정 칸의 첫 이슈 — 인라인 에러 문구를 그 입력 옆에 붙일 때 쓴다 */
export function issueOf(
  issues: readonly RangeIssue[],
  target: RangeIssueTarget,
): RangeIssue | undefined {
  return issues.find((issue) => issue.target === target);
}
