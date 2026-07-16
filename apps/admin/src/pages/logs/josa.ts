// 조사(助詞) 선택 (apps/admin/src/pages/logs/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [ERP-13 — '을(를)' 은 출하하지 않는다]
//
// `'관리자 로그' + '을(를) 불러오지 못했습니다'` 는 문법을 사람에게 떠넘긴 문장이다.
// 괄호를 읽는 사람은 없다 — 눈에 걸릴 뿐이고, 그 순간 화면은 '대충 만든 것'이 된다.
// 한국어는 앞말의 **받침 유무**로 조사가 갈린다. 그건 런타임에 계산할 수 있는 것이고,
// 계산할 수 있는 것을 사용자에게 미루지 않는다.
//
//   받침 있음: 로그**을** …  ← 틀림. '로그'는 받침이 없다 → 로그**를**
//   'API 로그를 불러오지 못했습니다' / '오류 로그를 …'
//
// [왜 여기 있나 — shared/format 이 정답이다]
// ERP-13 의 appliesTo 는 `shared/format josa helper` 다. 그러나 `shared/**` 는 이번 배치의
// 소유가 아니다(다른 에이전트가 개편 중). 승격 후보로 보고서에 남기고, 그때까지 이 섹션이
// 자기 사본을 갖는다. @tds/ui 의 Empty 도 같은 이유로 자족 헬퍼를 갖고 있다(레이어 경계).
//
// [한글이 아니면 어떻게 되나] 영문·숫자로 끝나는 말('API')은 받침을 판정할 수 없다.
// 관용을 따라 **받침 없음**으로 본다 — 'API를' 이 'API을' 보다 자연스럽다.
// 다만 이 섹션의 라벨은 전부 '…로그' 로 끝나므로 실제로는 한글 경로만 탄다.
// ─────────────────────────────────────────────────────────────────────────────

/** 한글 음절 영역 U+AC00–U+D7A3 */
const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;

/** 한 음절은 초성×21×28 + 중성×28 + 종성 로 조합된다 — 나머지가 0이 아니면 종성(받침)이 있다 */
const JONGSEONG_CYCLE = 28;

/** 마지막 글자에 받침이 있는가. 한글이 아니거나 빈 문자열이면 false */
export function hasBatchim(word: string): boolean {
  if (word.length === 0) return false;
  const code = word.charCodeAt(word.length - 1);
  if (code < HANGUL_FIRST || code > HANGUL_LAST) return false;
  return (code - HANGUL_FIRST) % JONGSEONG_CYCLE !== 0;
}

/** 목적격 — '로그를 불러오지 못했습니다' / '기록을 …' */
function objectParticle(word: string): string {
  return hasBatchim(word) ? '을' : '를';
}

/** 목적격 조사를 붙인 말 — 호출부가 문장을 조각으로 잇지 않게 한다 (EXC-17) */
export function withObjectParticle(word: string): string {
  return `${word}${objectParticle(word)}`;
}
