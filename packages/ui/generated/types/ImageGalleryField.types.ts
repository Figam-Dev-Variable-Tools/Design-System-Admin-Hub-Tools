// AUTO-GENERATED from contracts/ImageGalleryField.contract.json@1.1.0 — DO NOT EDIT (pnpm codegen)
// 레벨: molecule · 카테고리: Inputs · 상태: beta

/** 계약에 선언된 상호작용 상태 */
export type ImageGalleryFieldState = 'default' | 'error' | 'disabled';

/**
 * 다중 이미지 업로드(갤러리) 필드 — ImageUploadField 와 같은 메커니즘(드래그드롭·클릭 선택·object URL 프리뷰·클라이언트 검증)을 여러 장으로 확장한다. 값(values)은 이미지 URL 배열이다. 도메인을 모른다 — label/values/onChange 와 힌트만 받는다 (ADR-0003).

[손코딩 유지] react-dropzone 기각(오너 검토) — 드롭존 버튼을 직접 만든다.
[프리뷰] 그리드 타일, 각 타일에 개별 제거 버튼. 순서는 추가 순서 유지. 타일 URL 이 비거나 로드 실패면 이미지 아이콘 placeholder.
[검증] image/* · 파일당 용량 상한(maxSizeMB) · 개수 상한(maxFiles). 위반은 인라인 오류(토스트 아님). imageFileError 순수 함수를 ImageUploadField 와 공유.
[누수 방지] 우리가 만든 object URL 만 추적해 제거/언마운트 시 revoke 한다.

[imperative/경계] onChange 는 새 URL 배열을 넘기는 값 콜백. error/hint 는 exactOptionalPropertyTypes 경계에서 undefined 허용으로 넓힌다 (B2 선례).
 */
export interface ImageGalleryFieldProps {
  /**
   * 필드 라벨 — 드롭존의 접근 가능한 이름과 각 타일 alt 의 기준
   */
  label: string;
  /**
   * 현재 이미지 URL 배열. 빈 배열이면 드롭존만, 있으면 그리드 프리뷰 + 개별 제거. 데이터 prop — Figma 대응 없음 (ADR-0003)
   */
  values: ReadonlyArray<string>;
  /**
   * 필수 표식(*)을 라벨에 붙인다 (장식 — aria-hidden)
   * @default false
   */
  required?: boolean;
  /**
   * 드롭존/추가/제거를 비활성한다
   * @default false
   */
  disabled?: boolean;
  /**
   * 스키마가 내려주는 오류 — 로컬 검증 오류(타입·용량·개수)보다 우선. 비어 있지 않으면 danger 테두리 + role=alert 인라인 오류
   * @default ""
   */
  error?: string;
  /**
   * 도움말 문구 — 오류가 없을 때만 표시된다
   * @default ""
   */
  hint?: string;
  /**
   * 등록 가능한 최대 장수. 초과분은 인라인 오류로 막고 상한까지만 담는다
   * @default 10
   */
  maxFiles?: number;
  /**
   * 파일당 용량 상한(MB). 초과하면 인라인 오류로 막는다
   * @default 5
   */
  maxSizeMB?: number;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 이미지 목록이 바뀌면 새 URL 배열을 넘긴다 — 네이티브 이벤트가 아니라 값 콜백이다
   */
  onChange?: (payload: readonly string[]) => void;
}
