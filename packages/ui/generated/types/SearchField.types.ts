// AUTO-GENERATED from contracts/SearchField.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Inputs · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type SearchFieldState = 'default' | 'focus-visible';

/**
 * 검색 입력 — 돋보기 아이콘을 겹친 <input type=search> + 스크린리더용 숨김 라벨. 출처: apps/admin/src/shared/ui/SearchField.tsx (소비 29곳: 목록 상단 툴바의 '검색'). 예전엔 아이콘 겹침 + 왼쪽 패딩 보정이 여러 툴바에 복사돼 있었다 — 한 벌로 올린다.

[value 콜백 — 네이티브 이벤트가 아니다] onChange 는 SelectField 처럼 네이티브 이벤트를 흘려보내지 않고 새 문자열(event.target.value)을 넘긴다. 29곳 호출부가 onChange={setKeyword}(string setter)로 물려 있기 때문이다 — 네이티브 이벤트로 바꾸면 전부 깨진다. 그래서 value·onChange·label·placeholder 는 계약 prop/event 로 열거한다. 그 외 표준 <input> 속성(name·aria-*·autoFocus …)은 TextField 선례처럼 <input> 으로 그대로 패스스루한다 (계약 표면·id·type·onChange·className/style 은 제외).

[돋보기·숨김 라벨] 아이콘은 pointer-events:none 장식(aria-hidden) — 클릭은 아래 입력으로 통과한다. 라벨은 시각적으로 감추되(visually-hidden) DOM 에 남겨 접근 가능한 이름을 준다 — '무엇을 검색하는지' 를 밝힌다.

[도메인을 모른다] 무엇을 검색하는지 알지 못한다 — value/onChange/label/placeholder 만 받는다.
 */
export interface SearchFieldProps {
  /**
   * 제어 컴포넌트 검색어
   */
  value: string;
  /**
   * 스크린 리더용 라벨 — 시각적으로 감추되 접근 가능한 이름을 준다('공지 제목 검색' 등)
   */
  label: string;
  /**
   * 입력 placeholder. 미지정이면 '검색'
   * @default "검색"
   */
  placeholder?: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 검색어 변경 — 네이티브 이벤트가 아니라 새 문자열(event.target.value)을 넘긴다 (호출부의 string setter 와 직결)
   */
  onChange?: (payload: string) => void;
}
