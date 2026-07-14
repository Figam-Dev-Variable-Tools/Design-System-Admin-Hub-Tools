/**
 * 간이 JSX 토크나이저 — .tsx 소스에서 JSX 엘리먼트 트리를 추출한다.
 *
 * 외부 파서 의존성 0 (가드 도구 원칙: node 내장 + tsx 만 사용, 정규식/문자 스캐너로 구현).
 * 완전한 TSX 파서가 아니라 "페이지 마크업 구조 추출"에 충분한 수준의 스캐너다:
 *   - 문자열('..', "..", `..`) · 주석(//, 슬래시-별) · 정규식 리터럴을 건너뛰며 태그 시작을 탐지
 *   - 제네릭(Array<T>)·비교 연산(a < b)은 직전 토큰 휴리스틱(표현식 시작 문맥)으로 배제
 *   - 태그 속성 값 표현식(attr={...}) 내부의 JSX 는 구조 집계 대상에서 제외(건너뜀)
 *   - children 표현식({list.map(...)} 등) 내부의 JSX 는 **독립 루트**로 수집한다 —
 *     조건부/반복 렌더링 자식은 출현 횟수가 가변이므로 부모 시그니처에 포함하지 않는다
 *
 * 알려진 한계(간이 스캐너 트레이드오프 — 페이지 코드 스캔 목적에는 영향 미미):
 *   - 제네릭 화살표 함수(<T,>(x) => x, <T extends U>(x) => x)는 방어 휴리스틱으로 배제하지만
 *     모든 변형을 보장하지는 않는다
 *   - 템플릿 리터럴 표현식(`${...}`) 내부의 JSX 는 수집하지 않는다
 */

export interface JsxNode {
  /** 태그명 (Fragment 는 'Fragment' 로 정규화, Foo.Bar 는 점 포함 원문 유지) */
  tag: string;
  /** 속성 키 목록 (등장 순서, 스프레드는 '...') */
  attrKeys: string[];
  /** className/class 정적 문자열 값의 공백 분리 토큰 (후보명 제안용) */
  classTokens: string[];
  children: JsxNode[];
  /** 1-based 시작 라인 */
  line: number;
  /** 소스 오프셋 (포함 관계 판정용) */
  start: number;
  end: number;
}

export interface ParseResult {
  /** 다른 JSX 정적 자식이 아닌 엘리먼트 목록 (children 표현식 내부 JSX 포함) */
  roots: JsxNode[];
  /** 발견한 전체 엘리먼트 수 (자식 포함) */
  elementCount: number;
}

const NAME_START_RE = /[A-Za-z_$]/;
const TAG_NAME_CHAR_RE = /[\w$.-]/;
const ATTR_NAME_CHAR_RE = /[\w$:-]/;
/** 이 문자 뒤의 '<' 는 표현식 시작 문맥 → JSX 태그로 간주 */
const EXPR_PREV_CHARS = new Set(['(', ',', '=', '{', '[', '?', ':', ';', '&', '|', '!', '>']);
/** 이 키워드 뒤의 '<' 또는 '/' 는 표현식 시작 문맥 */
const EXPR_PREV_KEYWORDS = new Set([
  'return',
  'case',
  'default',
  'do',
  'else',
  'yield',
  'await',
  'typeof',
  'instanceof',
  'in',
  'of',
  'new',
  'void',
  'delete',
]);

export function parseJsx(source: string): ParseResult {
  const src = source;
  const len = src.length;
  const roots: JsxNode[] = [];
  let elementCount = 0;
  let pos = 0;

  // ---- 라인 번호: 라인 시작 오프셋 테이블 + 이진 탐색 ----
  const lineStarts: number[] = [0];
  for (let i = 0; i < len; i++) {
    if (src[i] === '\n') lineStarts.push(i + 1);
  }
  const lineAt = (offset: number): number => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if ((lineStarts[mid] ?? 0) <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const at = (i: number): string => src[i] ?? '';

  // ---- 스킵 유틸 (진입 문자를 포함해 스킵하고 pos 를 다음 위치로 전진) ----
  const skipLineComment = (): void => {
    while (pos < len && at(pos) !== '\n') pos++;
  };
  const skipBlockComment = (): void => {
    pos += 2;
    while (pos < len && !(at(pos) === '*' && at(pos + 1) === '/')) pos++;
    pos = Math.min(pos + 2, len);
  };
  const skipString = (quote: string): void => {
    pos++;
    while (pos < len) {
      const c = at(pos);
      if (c === '\\') {
        pos += 2;
        continue;
      }
      pos++;
      if (c === quote || c === '\n') return; // 개행 = 잘못된 문자열, 안전 탈출
    }
  };
  const skipTemplate = (): void => {
    pos++; // '`'
    while (pos < len) {
      const c = at(pos);
      if (c === '\\') {
        pos += 2;
        continue;
      }
      if (c === '`') {
        pos++;
        return;
      }
      if (c === '$' && at(pos + 1) === '{') {
        pos += 2;
        skipBraces(1); // 템플릿 표현식 내부 JSX 는 수집하지 않는다 (한계 명시)
        continue;
      }
      pos++;
    }
  };
  /** 중괄호 균형 스킵 — 문자열/주석/템플릿 인지. depth 0 도달 시 반환. */
  const skipBraces = (initialDepth: number): void => {
    let depth = initialDepth;
    while (pos < len && depth > 0) {
      const c = at(pos);
      if (c === "'" || c === '"') {
        skipString(c);
      } else if (c === '`') {
        skipTemplate();
      } else if (c === '/' && at(pos + 1) === '/') {
        skipLineComment();
      } else if (c === '/' && at(pos + 1) === '*') {
        skipBlockComment();
      } else if (c === '{') {
        depth++;
        pos++;
      } else if (c === '}') {
        depth--;
        pos++;
      } else {
        pos++;
      }
    }
  };

  // ---- 문맥 휴리스틱 ----
  /** offset 직전의 의미 있는 문자와, 그 문자가 식별자라면 그 단어를 돌려준다. */
  const prevMeaningful = (from: number): { ch: string; word: string } => {
    let i = from - 1;
    while (i >= 0 && /\s/.test(at(i))) i--;
    if (i < 0) return { ch: '', word: '' };
    const ch = at(i);
    let word = '';
    if (/[\w$]/.test(ch)) {
      let j = i;
      while (j >= 0 && /[\w$]/.test(at(j))) j--;
      word = src.slice(j + 1, i + 1);
    }
    return { ch, word };
  };
  const isExprStartContext = (): boolean => {
    const { ch, word } = prevMeaningful(pos);
    if (word) return EXPR_PREV_KEYWORDS.has(word);
    return ch === '' || EXPR_PREV_CHARS.has(ch);
  };
  /** JS 문맥에서 '<' 가 JSX 태그 시작인지 판정 (제네릭·비교 연산 배제) */
  const looksLikeTagStart = (): boolean => {
    const nxt = at(pos + 1);
    if (!(NAME_START_RE.test(nxt) || nxt === '>')) return false; // '</' 는 JS 문맥에서 태그 아님
    return isExprStartContext();
  };
  /** 정규식 리터럴 스킵 (오판 시 개행에서 안전 탈출) */
  const skipRegex = (): void => {
    pos++; // '/'
    let inClass = false;
    while (pos < len) {
      const c = at(pos);
      if (c === '\\') {
        pos += 2;
        continue;
      }
      if (c === '\n') return;
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) {
        pos++;
        return;
      }
      pos++;
    }
  };

  const readWhile = (re: RegExp): string => {
    const s = pos;
    while (pos < len && re.test(at(pos))) pos++;
    return src.slice(s, pos);
  };
  const skipWsAndComments = (): void => {
    for (;;) {
      const c = at(pos);
      if (c !== '' && /\s/.test(c)) {
        pos++;
        continue;
      }
      if (c === '/' && at(pos + 1) === '/') {
        skipLineComment();
        continue;
      }
      if (c === '/' && at(pos + 1) === '*') {
        skipBlockComment();
        continue;
      }
      return;
    }
  };
  const readAttrString = (quote: string): string => {
    pos++;
    const s = pos;
    while (pos < len && at(pos) !== quote) pos++;
    const v = src.slice(s, pos);
    if (pos < len) pos++;
    return v;
  };

  /**
   * JS 문맥 스캔 — 문자열/주석/정규식을 건너뛰며 JSX 태그를 찾아 roots 에 수집한다.
   * initialDepth > 0 이면 '{' 표현식 내부 스캔이며 균형 '}' 에서 반환한다.
   */
  const scanJs = (initialDepth: number): void => {
    const stopAtZero = initialDepth > 0;
    let depth = initialDepth;
    while (pos < len) {
      const c = at(pos);
      if (c === "'" || c === '"') {
        skipString(c);
        continue;
      }
      if (c === '`') {
        skipTemplate();
        continue;
      }
      if (c === '/') {
        if (at(pos + 1) === '/') {
          skipLineComment();
          continue;
        }
        if (at(pos + 1) === '*') {
          skipBlockComment();
          continue;
        }
        if (isExprStartContext()) {
          skipRegex();
          continue;
        }
        pos++;
        continue;
      }
      if (c === '{') {
        depth++;
        pos++;
        continue;
      }
      if (c === '}') {
        if (depth > 0) depth--;
        pos++;
        if (stopAtZero && depth === 0) return;
        continue;
      }
      if (c === '<' && looksLikeTagStart()) {
        const el = parseElement();
        if (el) roots.push(el);
        continue;
      }
      pos++;
    }
  };

  /** '<' 위치에서 엘리먼트 하나를 파싱한다. 태그가 아니라고 판명되면 pos 를 1 만 전진시키고 null. */
  const parseElement = (): JsxNode | null => {
    const start = pos; // '<'
    pos++;
    // Fragment: <> ... </>
    if (at(pos) === '>') {
      pos++;
      const node: JsxNode = {
        tag: 'Fragment',
        attrKeys: [],
        classTokens: [],
        children: [],
        line: lineAt(start),
        start,
        end: start,
      };
      elementCount++;
      parseChildren(node);
      node.end = pos;
      return node;
    }
    if (!NAME_START_RE.test(at(pos))) {
      pos = start + 1;
      return null;
    }
    const tag = readWhile(TAG_NAME_CHAR_RE);
    const node: JsxNode = {
      tag,
      attrKeys: [],
      classTokens: [],
      children: [],
      line: lineAt(start),
      start,
      end: start,
    };
    // 속성 루프
    for (;;) {
      skipWsAndComments();
      const c = at(pos);
      if (c === '') {
        node.end = pos; // EOF — 불완전 태그, 리프로 취급
        break;
      }
      if (c === '/' && at(pos + 1) === '>') {
        pos += 2;
        node.end = pos;
        break;
      }
      if (c === '>') {
        pos++;
        parseChildren(node);
        node.end = pos;
        break;
      }
      if (c === '{') {
        // 스프레드 속성 {...rest} — '...' 키로 정규화
        pos++;
        skipBraces(1);
        node.attrKeys.push('...');
        continue;
      }
      if (NAME_START_RE.test(c)) {
        const attr = readWhile(ATTR_NAME_CHAR_RE);
        // 제네릭 화살표 오인 방어: <T extends U>(...) => ...
        if (attr === 'extends' && node.attrKeys.length === 0 && /^[A-Z][\w$]*$/.test(tag)) {
          pos = start + 1;
          return null;
        }
        skipWsAndComments();
        if (at(pos) === '=') {
          pos++;
          skipWsAndComments();
          const vc = at(pos);
          if (vc === '"' || vc === "'") {
            const val = readAttrString(vc);
            if (attr === 'className' || attr === 'class') {
              for (const t of val.split(/\s+/)) {
                if (t) node.classTokens.push(t);
              }
            }
          } else if (vc === '{') {
            pos++;
            skipBraces(1); // 속성 값 표현식 내부 JSX 는 무시 (간이 스캐너 한계)
          } else if (vc === '`') {
            skipTemplate();
          }
        }
        node.attrKeys.push(attr);
        continue;
      }
      // 예상 밖 문자(',' ')' ';' 등) — 제네릭/비교 연산 오인으로 판단, 태그 파싱 포기
      pos = start + 1;
      return null;
    }
    elementCount++;
    return node;
  };

  /** 여는 태그 '>' 직후부터 닫는 태그까지 자식을 수집한다 (JSX 텍스트 문맥). */
  const parseChildren = (parent: JsxNode): void => {
    while (pos < len) {
      const c = at(pos);
      if (c === '<') {
        if (at(pos + 1) === '/') {
          // 닫는 태그 — 균형 잡힌 소스 전제, 이름 불일치도 현재 엘리먼트 종료로 관용 처리
          while (pos < len && at(pos) !== '>') pos++;
          if (pos < len) pos++;
          return;
        }
        const nxt = at(pos + 1);
        if (NAME_START_RE.test(nxt) || nxt === '>') {
          const child = parseElement();
          if (child) parent.children.push(child);
          continue; // parseElement 이 실패해도 pos 는 전진해 있다
        }
        pos++;
        continue;
      }
      if (c === '{') {
        // children 표현식 — 내부 JSX 는 독립 루트로 수집 (조건부/반복 렌더링)
        pos++;
        scanJs(1);
        continue;
      }
      pos++; // JSX 텍스트
    }
  };

  scanJs(0);
  return { roots, elementCount };
}
