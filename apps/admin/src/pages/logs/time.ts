// 로그 시각 표기 (apps/admin/src/pages/logs/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [이 파일에 남은 것은 하나뿐이다 — ERP-09 수렴 이후]
//
// 여기에는 원래 표시 타임존 고정(Intl·KST)·달력일 환산·달력 산술이 통째로 있었다. 같은 문제의
// 구현이 셋(여기 · stats/_shared/period.ts · login-history/period.ts)이었고, 게다가
// shared/format 자신이 브라우저 로컬 게터였다 — ERP-09 가 지적한 바로 그 지점이다.
//
// 그 셋은 이제 **shared/format.ts 한 벌로 수렴했다.** 이 파일이 갖고 있던 것들이 그 정본이
// 됐다(Intl + formatToParts · KST 고정 · UTC 정오 앵커) — 판정의 근거는 그 파일 머리말에 있다.
// 그러므로 여기서 다시 Intl 을 세우지 않는다: 표시 타임존이 두 곳에 적히는 순간 둘은 갈라진다.
//
// [그런데 왜 파일이 남았나 — 초 때문이다]
// 로그인 이력은 분까지로 충분했지만 **감사 로그는 아니다.** 1초에 40번 두드리는 API 호출은
// 분 단위로 보면 전부 같은 시각이 되어 **순서가 사라진다.** 무차별 대입인지 정상 트래픽인지를
// 가르는 것이 바로 그 순서다. 그래서 이 섹션만 초를 보여주고, 그 요구는 이 섹션의 것이므로
// 공유 모듈로 올리지 않는다 — 공유 조각(seoulTimeParts)을 받아 여기서 조립한다.
// ─────────────────────────────────────────────────────────────────────────────
import { seoulTimeParts } from '../../shared/format';

/**
 * 표 셀의 시각 — 'YYYY-MM-DD HH:mm:ss' (KST).
 *
 * **초까지 보여준다** (머리말 참조). 파싱할 수 없는 값은 **그대로 돌려준다** —
 * 지어내는 것보다 낫다.
 */
export function formatLogTime(iso: string): string {
  const parts = seoulTimeParts(iso);
  if (parts === null) return iso;
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}
