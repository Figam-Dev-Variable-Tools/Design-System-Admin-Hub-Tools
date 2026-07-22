// 시행 중 약관 버전 조회기 — **자리만** 만든다 (약관 본문은 콘텐츠 관리가 갖는다)
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 이 파일이 있나 — 동의는 '무엇에' 동의했는지까지가 동의다]
// 동의 이력(/users/consents)은 '언제 동의했다' 만으로는 쓸모가 없다. 분쟁이 생기면 답해야 하는
// 질문은 **"그때 이 사람이 읽은 문서가 무엇이었나"** 이고, 그 답은 약관 **버전**이다. 버전이
// 없으면 개정 전 문구에 동의한 사람과 개정 후 문구에 동의한 사람이 한 줄로 보이고, 재동의
// 대상을 산출할 수도 없다.
//
// 그 버전의 정본은 콘텐츠 관리 약관(/content/terms)이다 — 동의 화면이 자기 버전 목록을 따로
// 들면 두 화면이 서로 다른 'v1.1' 을 말하게 된다.
//
// [왜 동의 화면이 약관 화면을 직접 import 하지 않나]
// `pages/users` → `pages/content` 는 페이지 간 결합이고 code-quality 축1(page-coupling, blocker,
// 임계값 0건)이 그대로 잡는다. 그래서 방향을 뒤집는다: 공통 층인 여기는 **계약과 등록기**만 갖고,
// 목록을 꽂는 일은 두 도메인을 아는 `src/wiring.ts` 가 한다.
// (같은 결의 선례: shared/domain/faq-catalog.ts · shared/domain/site-policy.ts)
//
// [왜 fail-closed 가 아니라 '모른다(null)' 인가]
// 미배선일 때 빈 배열을 주면 재동의 산출이 **'재동의 대상 0명'** 이라는 완결된 문장을 그린다.
// 운영자는 그것을 사실로 읽고 개정 공지를 보내지 않는다 — 배선 사고가 법적 사고로 번지는 경로다.
// 그래서 '없다' 와 '모른다' 를 가르고, 모르는 동안에는 화면이 숫자 대신 그 사실을 말한다.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 지금 시행 중인 약관 한 건 — **동의 쪽이 필요한 값만** 담는다.
 *
 * 본문(body)은 여기 없다. 동의 이력은 문서를 렌더하지 않고 '어느 버전에 동의했는가' 만 기록한다 —
 * 본문까지 실어 나르면 이력 한 줄이 수십 KB 가 되고, 동의 화면이 약관 편집기의 관심사를 배운다.
 */
export interface ActiveTermsVersion {
  /** 약관 종류 id — 어휘의 정본은 콘텐츠 관리 약관이다 ('service' · 'marketing' …) */
  readonly typeId: string;
  readonly typeLabel: string;
  /** 'v1.1' 같은 표시용 버전 문자열 */
  readonly version: string;
  /** 시행일 'YYYY-MM-DD' — 이 날 이전의 동의가 재동의 대상이다 */
  readonly effectiveDate: string;
}

type ActiveTermsLookup = () => readonly ActiveTermsVersion[];

/** 미배선 상태 — null 은 '약관이 없다' 가 아니라 '읽을 통로가 없다' 다(머리말) */
let lookup: ActiveTermsLookup | null = null;

/** 조회기를 꽂는다 — 멱등. 호출자는 `src/wiring.ts` 하나다 */
export function registerActiveTermsLookup(next: ActiveTermsLookup): void {
  lookup = next;
}

/** 테스트가 미배선 상태로 되돌린다 — '모른다' 경로를 실제로 밟아 보기 위한 것이다 */
export function resetActiveTermsLookup(): void {
  lookup = null;
}

/** 지금 시행 중인 약관 버전들 — **배선되지 않았으면 null**(빈 배열이 아니다) */
export function activeTermsVersions(): readonly ActiveTermsVersion[] | null {
  if (lookup === null) return null;
  try {
    return lookup();
  } catch {
    return null;
  }
}
