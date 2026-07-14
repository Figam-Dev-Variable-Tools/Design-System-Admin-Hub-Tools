// 유효성 규칙 (SCR-003 §5.2) — 에러 메시지 문안은 화면정의서 표를 그대로 따른다.
import type { FieldErrors, FieldName, ProductFormValues } from './types';

/** §5.2 상품명 */
const NAME_MIN = 2;
export const NAME_MAX = 100;
/** §5.2 상품 설명 */
export const DESCRIPTION_MAX = 2000;
/** §5.2 판매가 */
const PRICE_MIN = 100;
const PRICE_MAX = 100_000_000;
/** §5.2 재고 수량 */
const STOCK_MIN = 0;
const STOCK_MAX = 999_999;
/** §5.2 상품 이미지 */
export const IMAGE_MAX_COUNT = 5;
const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const IMAGE_ACCEPTED_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

/** §5.2 위반 시 에러 메시지 — 문안 변경 금지(화면정의서 원문) */
export const MESSAGES = {
  nameRequired: '상품명을 입력해 주세요.',
  nameLength: '상품명은 2자 이상 100자 이하로 입력해 주세요.',
  descriptionLength: '상품 설명은 2,000자 이하로 입력해 주세요.',
  priceRequired: '판매가를 입력해 주세요.',
  priceFormat: '판매가는 숫자만 입력할 수 있습니다.',
  priceRange: '판매가는 100원 이상 100,000,000원 이하로 입력해 주세요.',
  stockRequired: '재고 수량을 입력해 주세요.',
  stockFormat: '재고 수량은 숫자만 입력할 수 있습니다.',
  stockRange: '재고 수량은 0 이상 999,999 이하로 입력해 주세요.',
  categoryRequired: '카테고리를 선택해 주세요.',
  imageRequired: '상품 이미지를 1장 이상 등록해 주세요.',
  imageType: 'JPG·PNG·WebP 형식만 업로드할 수 있습니다.',
  imageSize: '이미지 1장의 크기는 5MB 이하여야 합니다.',
  imageCount: '이미지는 최대 5장까지 등록할 수 있습니다.',
} as const;

/** 정수 문자열 여부 (앞뒤 공백 제거 후 0-9만) — §5.2 "숫자만 입력할 수 있습니다" 판정 */
function isIntegerString(raw: string): boolean {
  return /^\d+$/.test(raw.trim());
}

/** 상품명 — 필수. 앞뒤 공백 제거 후 2자 이상 100자 이하 */
function validateName(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) return MESSAGES.nameRequired;
  if (trimmed.length < NAME_MIN || trimmed.length > NAME_MAX) return MESSAGES.nameLength;
  return undefined;
}

/** 상품 설명 — 선택. 최대 2,000자(줄바꿈 포함) */
function validateDescription(value: string): string | undefined {
  if (value.length > DESCRIPTION_MAX) return MESSAGES.descriptionLength;
  return undefined;
}

/** 판매가 — 필수. 정수(소수점 불가). 100 이상 100,000,000 이하 */
function validatePrice(value: string): string | undefined {
  const raw = value.trim();
  if (raw.length === 0) return MESSAGES.priceRequired;
  if (!isIntegerString(raw)) return MESSAGES.priceFormat;
  const parsed = Number(raw);
  if (parsed < PRICE_MIN || parsed > PRICE_MAX) return MESSAGES.priceRange;
  return undefined;
}

/** 재고 수량 — 필수. 정수. 0 이상 999,999 이하 */
function validateStock(value: string): string | undefined {
  const raw = value.trim();
  if (raw.length === 0) return MESSAGES.stockRequired;
  if (!isIntegerString(raw)) return MESSAGES.stockFormat;
  const parsed = Number(raw);
  if (parsed < STOCK_MIN || parsed > STOCK_MAX) return MESSAGES.stockRange;
  return undefined;
}

/** 카테고리 — 필수. 옵션 로드 실패·빈 상태에서도 미선택이면 위반(§3.3) */
function validateCategory(value: string): string | undefined {
  if (value.trim().length === 0) return MESSAGES.categoryRequired;
  return undefined;
}

/** 상품 이미지 — 필수. 업로드 완료 1장 이상 5장 이하 */
function validateImages(uploadedCount: number): string | undefined {
  if (uploadedCount === 0) return MESSAGES.imageRequired;
  if (uploadedCount > IMAGE_MAX_COUNT) return MESSAGES.imageCount;
  return undefined;
}

/** 단일 필드 검증 — blur 시점 검증에 사용(§5.2 검증 시점 규칙 1) */
export function validateField(
  field: FieldName,
  values: ProductFormValues,
  uploadedCount: number,
): string | undefined {
  switch (field) {
    case 'name':
      return validateName(values.name);
    case 'description':
      return validateDescription(values.description);
    case 'price':
      return validatePrice(values.price);
    case 'stock':
      return validateStock(values.stock);
    case 'categoryId':
      return validateCategory(values.categoryId);
    case 'images':
      return validateImages(uploadedCount);
    default:
      return undefined;
  }
}

/** 파일 선택 시점 검증 — 형식·용량 (§5.2 검증 시점 규칙 4) */
export function validateImageFile(file: File): string | undefined {
  if (!IMAGE_ACCEPTED_TYPES.includes(file.type)) return MESSAGES.imageType;
  if (file.size > IMAGE_MAX_BYTES) return MESSAGES.imageSize;
  return undefined;
}

/** [등록] 제출 검증 — 전체 필드 재검사 (§5.2 검증 시점 규칙 2) */
export function validateAll(values: ProductFormValues, uploadedCount: number): FieldErrors {
  const errors: FieldErrors = {};
  const name = validateName(values.name);
  if (name) errors.name = name;
  const description = validateDescription(values.description);
  if (description) errors.description = description;
  const price = validatePrice(values.price);
  if (price) errors.price = price;
  const stock = validateStock(values.stock);
  if (stock) errors.stock = stock;
  const categoryId = validateCategory(values.categoryId);
  if (categoryId) errors.categoryId = categoryId;
  const images = validateImages(uploadedCount);
  if (images) errors.images = images;
  return errors;
}

/**
 * [임시저장] 완화 검증 (§5.2 검증 시점 규칙 3)
 * - 상품명 필수 검사만 수행
 * - 값이 입력된 필드에 한해 형식·범위 검사 (미입력 필드는 검사 생략)
 * - 이미지는 미등록이어도 저장 가능(장수 초과만 검사)
 */
export function validateForDraft(values: ProductFormValues, uploadedCount: number): FieldErrors {
  const errors: FieldErrors = {};

  const name = validateName(values.name);
  if (name) errors.name = name;

  if (values.description.length > 0) {
    const description = validateDescription(values.description);
    if (description) errors.description = description;
  }
  if (values.price.trim().length > 0) {
    const price = validatePrice(values.price);
    if (price) errors.price = price;
  }
  if (values.stock.trim().length > 0) {
    const stock = validateStock(values.stock);
    if (stock) errors.stock = stock;
  }
  // 카테고리 미선택은 초안에서 허용 — 선택값이 있어도 별도 형식 검사가 없다.
  if (uploadedCount > IMAGE_MAX_COUNT) {
    errors.images = MESSAGES.imageCount;
  }
  return errors;
}

/** 첫 번째 위반 필드 — 없으면 null */
export function firstErrorField(
  errors: FieldErrors,
  order: readonly FieldName[],
): FieldName | null {
  for (const field of order) {
    if (errors[field] !== undefined) return field;
  }
  return null;
}

/** 천 단위 구분 표시 (§5.3 규칙 7) — 정수 문자열이 아니면 원값 그대로 반환 */
export function formatThousands(raw: string): string {
  if (raw.length === 0 || !isIntegerString(raw)) return raw;
  return Number(raw.trim()).toLocaleString('ko-KR');
}

/** 숫자 전용 입력 — 0-9 외 문자는 입력 무시 (§5.3 규칙 7) */
export function stripNonDigits(raw: string): string {
  return raw.replace(/\D/g, '');
}
