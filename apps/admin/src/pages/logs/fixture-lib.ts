// 픽스처 공통 도구 (apps/admin/src/pages/logs/**)
//
// [이 파일의 역할] 4화면의 픽스처가 같은 방식으로 시각·IP·기기를 만든다.
// 백엔드가 붙으면 픽스처와 함께 **통째로 사라진다.**
//
// ─────────────────────────────────────────────────────────────────────────────
// [실명 0건 · 실재 호스트 0건 — 픽스처의 규율]
//   · 이메일 도메인은 `example.com` (RFC 2606 예약) — 실재하는 조직을 가리키지 않는다.
//   · IP 는 RFC 5737 문서용 대역만 (203.0.113.0/24 · 198.51.100.0/24) — 실재 호스트가 아니다.
//   · 이름은 첫 글자만 남긴 마스킹 ('한**') — 감사 화면은 '누가'를 알면 충분하고,
//     관리자에게 전체 성명을 흘릴 이유가 없다.
// (`logs.test.ts` 가 이 규율을 4화면의 픽스처 전수로 단언한다.)
//
// [시각을 UTC 로 만드는 이유 — ERP-09]
// 진짜 서버는 UTC 로 로그를 남긴다. 픽스처가 로컬 순진(naive) 문자열('2026-07-14T03:00:00')을
// 쓰면 **타임존 버그가 숨는다** — 브라우저가 그것을 로컬로 해석해 우연히 맞아 보이기 때문이다.
// 그래서 여기서는 '서울 기준 몇 시'를 받아 **UTC ISO(Z)로 바꿔** 저장한다. 화면은 그것을 다시
// KST 로 환산해 그린다(time.ts). 즉 픽스처부터 화면까지 실제 환산 경로를 그대로 탄다 —
// 환산이 깨지면 새벽 3시의 침입 시도가 정오로 보이고, 그 버그는 테스트에서 잡힌다.
// ─────────────────────────────────────────────────────────────────────────────
import { kstToday, shiftDays } from './time';

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function padId(value: number, size: number): string {
  return String(value).padStart(size, '0');
}

/**
 * '오늘로부터 d일 전, **서울 기준** hh:mm:ss' → UTC ISO 문자열.
 * `now` 를 주입받는다 — 테스트가 '오늘'을 고정할 수 있어야 한다.
 */
export function atKst(
  daysAgo: number,
  hour: number,
  minute: number,
  second: number,
  now: Date = new Date(),
): string {
  const day = shiftDays(kstToday(now), -daysAgo);
  return new Date(`${day}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}+09:00`).toISOString();
}

/** 일상 접속 IP — 문서용 대역 203.0.113.0/24 */
export function usualIp(seed: number): string {
  return `203.0.113.${String(((seed * 7) % 240) + 10)}`;
}

/** 수상한 IP — 문서용 대역 198.51.100.0/24. 실패 연쇄가 이 대역에서 온다 */
export function foreignIp(seed: number): string {
  return `198.51.100.${String(((seed * 13) % 240) + 10)}`;
}

/** 픽스처가 덮는 범위 — 오늘부터 45일 전까지 (기간 프리셋 최대치 30일보다 넉넉하게) */
export const HISTORY_DAYS = 45;

/** 배열에서 seed 로 하나 고른다 — 결정적이다(새로고침해도 같은 값이 나온다) */
export function pick<T>(items: readonly T[], seed: number, fallback: T): T {
  return items[seed % items.length] ?? fallback;
}

/** 최신순 정렬 — 감사 화면이 먼저 보아야 하는 것은 방금 일어난 일이다 */
export function newestFirst<T extends { readonly occurredAtIso: string }>(
  entries: readonly T[],
): readonly T[] {
  return [...entries].sort((a, b) => b.occurredAtIso.localeCompare(a.occurredAtIso));
}
