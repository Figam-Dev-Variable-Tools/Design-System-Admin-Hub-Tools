// 값 비교 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// 충돌 다이얼로그가 '무엇이 달라졌는가' 를 짚을 때 쓴다 (EXC-04: "가능하면 diverge 한 field 를 표시").
// '충돌했습니다' 만 알리고 무엇이 다른지 말하지 않으면 운영자는 두 값을 눈으로 대조해야 한다.
import { formatDate, formatDateTime } from '../../../shared/format';

/**
 * 값이 같은가 — 배열은 **내용**으로 비교한다.
 *
 * Object.is 만 쓰면 `supported: ['ko']` 와 `['ko']` 가 참조가 달라 '변경됨' 이 된다 —
 * 아무것도 안 바꿨는데 충돌 다이얼로그가 '지원 언어가 달라졌다' 고 거짓말하게 된다.
 */
function sameValue(mine: unknown, theirs: unknown): boolean {
  if (Array.isArray(mine) && Array.isArray(theirs)) {
    return (
      mine.length === theirs.length && mine.every((item, index) => Object.is(item, theirs[index]))
    );
  }
  return Object.is(mine, theirs);
}

/**
 * 두 문서에서 값이 갈린 필드의 **라벨**을 돌려준다.
 *
 * 평면 객체(문자열/불리언/숫자/문자열 배열 필드)만 다룬다 — 이 섹션의 설정 문서가 전부 그 모양이다.
 * 중첩이 생기면 그 화면이 자기 비교기를 갖는 편이 낫다(여기서 일반화하지 않는다).
 */
export function divergedLabels<T extends object>(
  mine: T,
  theirs: T,
  labels: Readonly<Record<keyof T, string>>,
): readonly string[] {
  const diverged: string[] = [];

  for (const key of Object.keys(labels) as (keyof T)[]) {
    if (!sameValue(mine[key], theirs[key])) diverged.push(labels[key]);
  }

  return diverged;
}

/** 감사 시각 표기 — 충돌 다이얼로그가 '언제 저장됐는지' 를 말할 때 (ERP-08: 인라인 포맷 금지) */
export function formatAuditAt(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return formatDateTime(iso);
}

/** 날짜만 필요한 자리(생성일 등) */
export function formatDateOnly(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return formatDate(parsed);
}
