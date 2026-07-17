// RichTextField — 서식 있는 본문 입력 (molecule · contracts/RichTextField.contract.json@1.0.0)
//
// Props 타입은 계약에서 생성된 generated/types/RichTextField.types 를 그대로 import 한다 (수동 선언 금지 — G6).
// 계약 dependencies: FormField (molecule) — 라벨/오류/힌트/필수 표식 + 카운터('N/max')를 위임한다.
// imageFileError(ImageUploadField 의 순수 함수)도 재사용한다 — 컴포넌트가 아닌 같은 layer 의 유틸이라
// 계약 dependencies 에 오르지 않는다 (ImageUploadField 가 FormField 의 id 헬퍼를 쓰는 것과 같은 선례).
//
// ─────────────────────────────────────────────────────────────────────────────
// [왜 TextareaField 를 고치지 않고 형제를 내는가]
// TextareaField 계약(v1.1.0)이 이 순간을 예고했다: "[리치 텍스트 아님] 지금은 제어된 <textarea> 로만
// 본문을 받는다(WYSIWYG 미도입 — ADR 사안). 서식 본문이 요구되면 내부만 에디터로 바꾸고 value/onChange
// 계약은 유지한다." 그러나 TextareaField 는 **소비 30곳**이다 — 그 자리에서 내부를 바꾸면 공지 본문·FAQ
// 답변·약관 조문까지 전부 HTML 이 된다. 그래서 value/onChange(string) 계약을 미러한 **형제**로 낸다.
// 호출부는 필드만 갈아끼우면 되고, 평문이 맞는 30곳은 그대로 둔다.
//
// [이 파일은 가볍다 — Tiptap 은 여기 없다]
// Tiptap(ProseMirror)은 무겁다. 이 껍데기는 FormField 배선과 순수 함수만 갖고, 에디터 본체는
// React.lazy 로 분할한다(RichTextFieldEditor). 이 필드를 쓰지 않는 화면은 Tiptap 청크를 내려받지
// 않는다 — 라우트가 eager 여도 그렇다(App.tsx 를 건드리지 않고 코드 분할을 얻는 이유).
// DOMPurify 는 반대로 **일부러 eager** 다 — 저장 경로의 sanitize 는 동기여야 하고, 보안 경계를
// 청크 로딩 실패에 걸 수 없다.
// ─────────────────────────────────────────────────────────────────────────────
import purify from 'dompurify';
import { lazy, Suspense, useId, useMemo } from 'react';

import { errorIdOf, FormField, hintIdOf, labelIdOf } from '../FormField';
import type { RichTextFieldProps } from '../../../generated/types/RichTextField.types';
import './RichTextField.css';

/**
 * 허용 태그 — **허용목록**이다(차단목록 아님). 여기 없는 것은 전부 사라진다:
 * script·style·iframe·object·embed·form 은 물론, 아직 세상에 없는 태그도 기본이 '차단' 이다.
 * 툴바가 낼 수 있는 서식(굵게·기울임·제목·목록·링크·이미지)의 상한과 일치시킨다.
 */
const RICH_TEXT_ALLOWED_TAGS: readonly string[] = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'a',
  'img',
  'blockquote',
  'code',
  'pre',
  'hr',
];

/**
 * 허용 속성 — on* 핸들러(onclick 등)·style·class·id 는 목록에 없으므로 전부 제거된다.
 * style 을 허용하지 않는 것이 토큰 규율이기도 하다 — 본문이 자기 색·크기를 들고 다니면
 * 디자인 시스템 밖의 값이 문서에 굳는다.
 */
const RICH_TEXT_ALLOWED_ATTR: readonly string[] = ['href', 'target', 'rel', 'src', 'alt', 'title'];

/**
 * 허용 URI 스킴 — DOMPurify 기본값에서 **blob: 을 더하고** data: 를 뺀다.
 *
 * blob: 을 더하는 이유는 정직함이다. 툴바 이미지 버튼은 ImageUploadField 와 같은 심을 쓴다 —
 * 업로드가 없으므로 URL.createObjectURL 핸들이 유일하게 도달 가능한 값이다. 이걸 sanitize 가
 * 지우면 사용자가 방금 넣은 이미지가 조용히 증발한다(= 더 나쁜 거짓말). blob: 은 같은 문서
 * 세션의 로컬 핸들이라 img/src 경로에서 스크립트를 실행시키지 못한다.
 * data: 는 뺀다 — data:text/html 류가 <a href> 로 들어오면 실제 실행 경로가 된다.
 * (그 대가는 심의 알려진 빚 그대로다: blob: 은 새로고침·언마운트 후 죽는다.)
 */
const RICH_TEXT_URI_REGEXP = /^(?:https?:|mailto:|tel:|blob:|[^a-z]|[a-z+.-]+(?:[^a-z+.:-]|$))/i;

/**
 * target="_blank" 링크에 rel="noopener noreferrer" 를 강제한다 — reverse tabnabbing 차단.
 * DOMPurify 공식 레시피. 모듈 로드 시 1회만 등록한다: sanitizeRichText 가 이 패키지의 유일한
 * DOMPurify 소비자라 훅의 영향 범위가 이 허용목록과 정확히 같다.
 * (Tiptap Link 확장도 rel 을 붙이지만, 붙지 않은 **과거 값·붙여넣은 HTML** 이 sanitize 를 지나갈 때
 *  기댈 곳은 여기다 — 렌더 지점의 방어는 에디터 설정이 아니라 sanitize 여야 한다.)
 */
purify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'A' && node.hasAttribute('target')) {
    node.setAttribute('rel', 'noopener noreferrer');
  }
  // [alt 없는 img 는 장식으로 표시한다 — rel 훅과 같은 자리, 같은 이유]
  //
  // alt 속성이 **아예 없는** img 를 스크린리더는 파일명/URL 로 읽는다 — 저장 값의
  // `<img src="x">` 는 "x" 라고 읽힌다. 정보가 아니라 소음이고, axe 는 이것을
  // `image-alt`(**critical**) 로 잡는다 (실측: richtextfield--sanitizes-stored-value 1건).
  // alt="" 를 넣으면 접근성 트리에서 장식으로 빠져 아무것도 읽지 않는다 — 잘못된 이름을
  // 읽어주는 것보다 정직하다.
  //
  // 저자가 쓴 alt 는 건드리지 않는다 (alt 는 허용목록에 있어 그대로 살아남는다) — 여기서
  // 채우는 것은 **속성이 없는** 경우뿐이다. 에디터가 삽입 시 alt 를 묻게 하는 것은 별개 과제이고,
  // 그때도 이 훅은 '과거 값·붙여넣은 HTML' 의 마지막 방어선으로 남는다 (rel 훅과 같은 논리).
  if (node.nodeName === 'IMG' && !node.hasAttribute('alt')) {
    node.setAttribute('alt', '');
  }
});

/**
 * 리치 텍스트 HTML 을 허용목록으로 sanitize 한다 — **저장 지점과 렌더 지점 양쪽에서 부른다.**
 *
 * 렌더 지점에서도 다시 부르는 이유: 저장된 값이 이 앱의 sanitize 를 거쳤다고 가정하지 않는다.
 * 과거 값·수기 편집·다른 클라이언트·백엔드가 붙은 뒤의 서버 값은 모두 신뢰 밖이다.
 * XSS 방어를 '입력 때 한 번 걸렀으니 안전하다' 에 걸면, 그 가정이 깨지는 날 전부 깨진다.
 */
export function sanitizeRichText(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS: [...RICH_TEXT_ALLOWED_TAGS],
    ALLOWED_ATTR: [...RICH_TEXT_ALLOWED_ATTR],
    ALLOWED_URI_REGEXP: RICH_TEXT_URI_REGEXP,
    // 허용목록에서 지워진 태그의 **텍스트는 남긴다** — <script> 본문처럼 코드가 텍스트로
    // 노출되는 경우를 막으려 script/style 은 아래에서 통째로 버린다.
    KEEP_CONTENT: true,
    FORBID_CONTENTS: ['script', 'style'],
  });
}

/** 태그를 걷어낸 사람이 보는 텍스트 — 카운터·길이 검증·빈값 판정의 공통 기반 */
function richTextPlain(html: string): string {
  const sanitized = sanitizeRichText(html);
  const holder = document.createElement('div');
  holder.innerHTML = sanitized;
  return holder.textContent ?? '';
}

/**
 * 평문 길이 — maxLength 는 마크업이 아니라 **사람이 보는 글자 수**를 센다.
 * '<p>가</p>' 는 7자가 아니라 1자다. 마크업을 세면 굵게 한 번에 카운터가 튀고,
 * 사용자는 왜 2000자 제한에 900자에서 걸리는지 알 수 없다.
 */
export function richTextLength(html: string): number {
  return richTextPlain(html).length;
}

/**
 * 본문이 비었는지 — 에디터는 빈 상태에서도 '<p></p>' 를 낸다.
 * 문자열 비교('' 검사)로는 빈 본문을 못 잡는다. 이미지만 있는 본문은 비지 않은 것으로 본다.
 */
export function isRichTextEmpty(html: string): boolean {
  if (/<img\b/i.test(sanitizeRichText(html))) return false;
  return richTextPlain(html).trim() === '';
}

/**
 * **마이그레이션** — 평문을 리치 텍스트로 승격한다 (textarea 시절 값의 경로).
 *
 * 빈 줄로 나뉜 덩어리는 <p>, 홑 줄바꿈은 <br> 로 옮긴다 — textarea 에서 사람이 만든 문단이
 * 한 줄로 뭉개지지 않게. 텍스트는 이스케이프한다: 평문에 있던 '<b>' 는 굵게가 아니라
 * 사용자가 친 '<b>' 라는 글자 그대로였으므로 그렇게 보존하는 것이 무손실이다.
 */
export function plainToRichText(text: string): string {
  const escaped = (raw: string): string => {
    const holder = document.createElement('div');
    holder.textContent = raw;
    return holder.innerHTML;
  };
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block !== '');
  if (blocks.length === 0) return '';
  return blocks.map((block) => `<p>${escaped(block).split('\n').join('<br>')}</p>`).join('');
}

/**
 * 저장된 값을 에디터가 먹을 수 있는 HTML 로 정규화한다 — **호출부의 마이그레이션 진입점**.
 *
 * 이미 HTML 이면 sanitize 만 하고, 평문이면 plainToRichText 로 승격한다. 판별은 '태그처럼
 * 생긴 것이 있는가' 휴리스틱이다 — 평문에 '<' 가 있어도 '<b>' 같은 태그 꼴이 아니면 평문으로 본다.
 * 값을 읽을 때마다 불러도 안전하다(이미 HTML 인 값에는 멱등).
 */
export function ensureRichText(value: string): string {
  if (value.trim() === '') return '';
  const looksLikeHtml = /<\/?[a-z][a-z0-9]*(?:\s[^<>]*)?\/?>/i.test(value);
  return looksLikeHtml ? sanitizeRichText(value) : plainToRichText(value);
}

/** exactOptionalPropertyTypes — 옵셔널 문자열 prop 을 경계에서 undefined 허용으로 넓힌다 */
type RichTextFieldComponentProps = Omit<RichTextFieldProps, 'error' | 'hint' | 'placeholder'> & {
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
  readonly placeholder?: string | undefined;
};

/**
 * 에디터 본체는 지연 로드한다 — 기본 export 를 만들지 않으려 named export 를 default 로 감싼다
 * (이 리포는 named export 규약이다).
 */
const LazyEditor = lazy(async () => {
  const module = await import('./RichTextFieldEditor');
  return { default: module.RichTextFieldEditor };
});

export function RichTextField({
  label,
  value,
  onChange,
  maxLength,
  required = false,
  disabled = false,
  error,
  hint,
  placeholder,
  rows = 6,
}: RichTextFieldComponentProps) {
  const id = useId();
  const invalid = error !== undefined && error !== '';
  const describedBy = invalid ? errorIdOf(id) : hint !== undefined ? hintIdOf(id) : undefined;
  // **렌더 지점 sanitize** — 저장된 값이 이 앱의 sanitize 를 거쳤다고 가정하지 않는다.
  // 에디터는 sanitize 를 모른다(그래야 순환 의존이 없다) — 경계인 이 껍데기가 양쪽을 다 건다.
  const safeValue = useMemo(() => sanitizeRichText(value), [value]);

  return (
    <FormField
      htmlFor={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
      counter={`${String(richTextLength(value))}/${String(maxLength)}`}
    >
      <Suspense
        fallback={
          <div
            className="tds-richtext__skeleton"
            aria-busy="true"
            aria-label="편집기를 불러오는 중"
            style={{ '--tds-richtext-rows': String(rows) } as Record<string, string>}
          />
        }
      >
        <LazyEditor
          id={id}
          value={safeValue}
          rows={rows}
          invalid={invalid}
          required={required}
          disabled={disabled}
          describedBy={describedBy}
          // FormField 의 <label for={id}> 는 이 contenteditable 에 닿지 않는다 —
          // 이름은 label 의 id 를 aria-labelledby 로 가리켜야만 생긴다.
          labelledBy={labelIdOf(id)}
          placeholder={placeholder}
          onChange={(html) => {
            // 계약 events.onChange.blockedWhen — disabled 에서는 발화 금지
            // (에디터도 non-editable 이라 이중 차단이다 — 렌더만으로는 비발생을 증명하지 못한다)
            if (disabled) return;
            // **저장 지점 sanitize** — 이 필드에서 나가는 값은 항상 허용목록을 지난다
            onChange?.(sanitizeRichText(html));
          }}
        />
      </Suspense>
    </FormField>
  );
}
