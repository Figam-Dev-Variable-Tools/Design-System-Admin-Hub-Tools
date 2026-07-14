// 상품 등록 화면 로컬 타입 (SCR-003)
//
// 이 폴더(pages/product-registration/**) 안에서만 사용하는 **도메인 지역 타입**이다.
// 상품 등록 화면의 필드·검증·초안 개념이라 @tds/ui 로 올라가지 않는다 (ADR-0003: 도메인은 DS 에 넣지 않는다).

/** 폼 필드 식별자 — 제출 시 첫 위반 필드 포커스 이동 순서와 동일하다 (SCR-003 §5.2 검증 시점 규칙) */
export type FieldName = 'name' | 'description' | 'price' | 'stock' | 'categoryId' | 'images';

/** 제출 시 포커스 이동 탐색 순서 (§5.2: "첫 번째 위반 필드로 포커스 이동") */
export const FIELD_ORDER: readonly FieldName[] = [
  'name',
  'description',
  'price',
  'stock',
  'categoryId',
  'images',
] as const;

/**
 * 텍스트 입력 필드 값 — 판매가/재고는 문자열로 보관한다.
 * (§5.3 규칙 7: 포커스 시 원값 편집 · blur 시 천 단위 구분 표시 — 표시 포맷과 원값을 분리하기 위함)
 */
export interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  stock: string;
  categoryId: string;
}

export const EMPTY_VALUES: ProductFormValues = {
  name: '',
  description: '',
  price: '',
  stock: '',
  categoryId: '',
};

/** 필드별 인라인 에러 문구 — 값이 없는 키는 에러 없음 */
export type FieldErrors = Partial<Record<FieldName, string>>;

/** §3.3 카테고리 옵션 */
export interface Category {
  id: string;
  name: string;
}

/** 업로드 완료된 이미지 참조 — 제출(§3.1) · 임시저장(§3.2) 시 이 목록만 전송한다 */
export interface UploadedImageRef {
  id: string;
  name: string;
  url: string;
}

/** §3.2 임시저장본 스냅샷 */
export interface DraftSnapshot {
  values: ProductFormValues;
  images: UploadedImageRef[];
  /** ISO 8601 저장 시각 */
  savedAt: string;
}

/** 화면 상단 Alert 톤 — 토큰에 feedback 색상이 없어 색상 대신 role/문구로 구분한다 (README 참조) */
export type AlertTone = 'info' | 'success' | 'danger';

export interface PageAlert {
  tone: AlertTone;
  message: string;
}
