// AUTO-GENERATED from contracts/RichTextField.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Inputs · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type RichTextFieldState = 'default' | 'focus-visible' | 'disabled' | 'error';

/**
 * 서식 있는 본문 입력 필드 — Tiptap(headless) WYSIWYG 을 FormField 껍데기 안에 담는다. TextareaField 계약(v1.1.0)이 예고한 '서식 본문' 경로다: 그 계약은 '[리치 텍스트 아님] … WYSIWYG 미도입 — ADR 사안. 서식 본문이 요구되면 내부만 에디터로 바꾸고 value/onChange 계약은 유지한다' 고 적었다. TextareaField 는 소비 30곳이라 그 자리에서 바꾸면 30곳이 함께 흔들린다 — 그래서 형제 컴포넌트로 낸다. value/onChange(string) 계약은 그대로 미러하므로 호출부는 필드만 갈아끼우면 된다.

[value 는 sanitize 된 HTML 이다] TextareaField 의 value 는 평문이고 이 필드의 value 는 HTML 이다 — 그것이 유일한 계약 차이다. onChange 로 나가는 값은 **이미 sanitize 된 HTML** 이다(저장 지점). 렌더 지점(dangerouslySetInnerHTML)에서도 다시 sanitize 한다 — 저장된 값이 신뢰 경로를 거쳤다고 가정하지 않는다(과거 값·수기 편집·다른 클라이언트). sanitizeRichText 순수 함수를 함께 내보내 호출부가 같은 허용목록을 쓰게 한다.

[허용목록 방식] 태그·속성 allowlist(차단목록 아님) + URI 스킴 제한. script/style/iframe/on* 은 물론 허용목록에 없는 모든 것이 사라진다.

[maxLength 는 평문 길이다] HTML 마크업이 아니라 사람이 보는 텍스트 길이를 센다 — '<p>가</p>' 는 7자가 아니라 1자다. 마크업을 세면 굵게 한 번에 카운터가 튄다. richTextLength 순수 함수를 함께 내보낸다.

[에디터는 지연 로드된다] Tiptap(ProseMirror)은 무겁다. 이 컴포넌트는 가벼운 껍데기이고 에디터 본체는 React.lazy 로 분할된다 — 이 필드를 쓰지 않는 화면은 Tiptap 을 내려받지 않는다. 로드 전에는 스켈레톤을 그린다.

[이미지: 업로드하지 않는다] 툴바 이미지 버튼은 ImageUploadField 와 **같은 심**을 쓴다 — URL.createObjectURL 로 만든 blob: 미리보기 핸들을 삽입할 뿐 아무것도 업로드하지 않는다(TODO(backend): POST /api/uploads). 가짜 업로드 성공을 지어내지 않는다. 그래서 sanitize 는 blob: 을 img 경로에서 허용한다 — 허용하지 않으면 방금 넣은 이미지가 sanitize 에 지워져 더 나쁜 거짓말이 된다.

[도메인을 모른다] 무슨 본문인지 알지 못한다 — label/value/onChange/maxLength 만 받는다.

[exactOptionalPropertyTypes] 옵셔널 문자열 prop(error·hint·placeholder)은 호출부가 string|undefined 를 그대로 넘긴다 — 구현이 경계에서 undefined 를 허용해 받고 정규화한다 (TextareaField 와 동일 처리).
 */
export interface RichTextFieldProps {
  /**
   * 필드 레이블 — FormField 로 내려보낸다
   */
  label: string;
  /**
   * 제어 컴포넌트 입력값 — **sanitize 된 HTML 문자열**. 에디터에 넣기 전에 다시 sanitize 한다(저장된 값을 신뢰하지 않는다)
   */
  value: string;
  /**
   * 최대 **평문** 길이 — 카운터('N/max')의 분모. HTML 마크업 길이가 아니라 richTextLength(value) 를 센다
   */
  maxLength: number;
  /**
   * 필수 필드 — FormField 로 내려보내 레이블에 마커(*)를 그리고, 편집 영역에 aria-required 를 함께 잇는다 (마커는 aria-hidden 장식이라 그것만으로는 AT 에 닿지 않는다 — A11Y-11 · TextareaField 미러)
   * @default false
   */
  required?: boolean;
  /**
   * 비활성 — 에디터를 non-editable 로 두고 툴바 버튼을 native disabled 로 막는다. onChange 발화도 차단한다(blockedWhen)
   * @default false
   */
  disabled?: boolean;
  /**
   * 인라인 오류 메시지 — FormField 로 내려보낸다. 값이 있으면 aria-invalid=true + aria-describedby=errorIdOf(id). 빈 문자열/미지정이면 오류 없음
   * @default ""
   */
  error?: string;
  /**
   * 보조 안내 — FormField 로 내려보낸다. 오류가 없을 때만 그리고, 그때 aria-describedby=hintIdOf(id)
   * @default ""
   */
  hint?: string;
  /**
   * 본문이 비었을 때 편집 영역에 그리는 보조 예시 텍스트
   * @default ""
   */
  placeholder?: string;
  /**
   * 편집 영역 최소 표시 행 수 — 최소 높이를 space 토큰 배수로 환산한다(TextareaField 의 rows 미러)
   * @default 6
   */
  rows?: number;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 본문 변경 — 이벤트가 아니라 **sanitize 된 새 HTML 문자열**을 넘긴다. disabled 에서는 발화 금지
   * 발화 차단 상태: disabled (Storybook Play Function 이 전수 검증)
   */
  onChange?: (payload: string) => void;
}
