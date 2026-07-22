// 번역 대상 조회기 — **자리만** 만든다 (원문의 정본은 각 작성 화면이 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 다국어 화면은 원문을 만들지 않는다]
// 다국어 설정(/settings/languages)은 언어·지역·URL 전략을 정하고, 그다음 '무엇을 번역할 것인가'
// 를 보여 준다. 그 '무엇' 은 공지·FAQ·회사소개처럼 **다른 화면이 쓴 글**이다. 다국어 화면이
// 자기 목록을 들면 원문이 수정·삭제돼도 번역 대상 목록만 옛것을 계속 보여 준다.
//
// [발행된 것만 온다 — 그것이 이 계약의 요점이다]
// 초안을 번역 대상에 넣으면 번역가는 아직 확정되지 않은 문장을 번역하고, 발행 직전에 원문이
// 통째로 바뀌면 그 작업이 버려진다. 번역은 원문이 멈춘 뒤에 시작한다. 그래서 조회기는
// **발행분만** 돌려주기로 계약한다(publishedAt 이 필수인 이유다 — 없는 것은 담을 수 없다).
//
// [왜 다국어 화면이 콘텐츠 화면을 직접 import 하지 않나]
// `pages/settings` → `pages/content` 는 페이지 간 결합이고 code-quality 축1(page-coupling,
// blocker, 임계값 0건)이 그대로 잡는다. 공통 층은 계약과 등록기만 갖고, 목록을 꽂는 일은 두
// 도메인을 아는 `src/wiring.ts` 가 한다.
//
// [왜 '모른다(null)' 인가]
// 빈 배열을 주면 화면이 '번역할 항목이 없습니다' 라고 완결되게 말한다 — 운영자는 그것을 사실로
// 읽고 다국어 준비가 끝났다고 판단한다. 배선 사고를 완료 상태로 위장하지 않는다.
// ─────────────────────────────────────────────────────────────────────────────

/** 번역 대상 한 건 — 원문의 **식별과 표시**에 필요한 값만 담는다(본문은 없다) */
export interface TranslatableEntry {
  /** 원문 id — 번역 레코드가 이 값을 키로 삼는다 */
  readonly id: string;
  /** 어느 종류의 글인가 ('공지사항' · 'FAQ' …) — 화면이 묶음으로 보여 준다 */
  readonly kindLabel: string;
  /** 기본 언어로 쓰인 제목 — 미번역 폴백이 그대로 보여 주는 문자열이다 */
  readonly title: string;
  /** 발행 시각 (ISO 8601). 발행되지 않은 것은 애초에 담기지 않는다 */
  readonly publishedAt: string;
}

type TranslatableLookup = () => readonly TranslatableEntry[];

/** 미배선 상태 — null 은 '대상이 없다' 가 아니라 '읽을 통로가 없다' 다(머리말) */
let lookup: TranslatableLookup | null = null;

/** 조회기를 꽂는다 — 멱등. 호출자는 `src/wiring.ts` 하나다 */
export function registerTranslatableLookup(next: TranslatableLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetTranslatableLookup(): void {
  lookup = null;
}

/** 지금 번역할 수 있는 발행 항목 — **배선되지 않았으면 null**(빈 배열이 아니다) */
export function translatableEntries(): readonly TranslatableEntry[] | null {
  if (lookup === null) return null;
  try {
    return lookup();
  } catch {
    return null;
  }
}
