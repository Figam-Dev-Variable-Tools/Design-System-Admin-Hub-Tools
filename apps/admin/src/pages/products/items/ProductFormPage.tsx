// ProductFormPage — 상품 등록/수정 (라우트: /products/new · /products/:id/edit)
//
// [프레임워크 재사용 + 엔터프라이즈 레이아웃] 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 그대로
// 쓰고, 화면은 섹션 카드(기본정보·가격·옵션/SKU·배송·이미지·상세설명) + 우측 실시간 상품 카드 미리보기로
// 구성한다. FormPageShell 은 단일 카드 폼 전용이라, 다중 섹션 + 미리보기 2단은 여기서 직접 배치한다.
// [통합] 예전 product-registration(자체 업로드 모듈)을 대체한다 — 이미지는 공통 업로드 모듈을 쓴다.
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { isRichTextEmpty, sanitizeRichText } from '@tds/ui';

import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  ChevronLeftIcon,
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  ImageGalleryField,
  ImageUploadField,
  pageTitleStyle,
  RichTextField,
  SelectField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import {
  FormConflictDialog,
  FormServerError,
  submitButtonLabel,
  useCrudForm,
} from '../../../shared/crud';
import { fetchProductCategoryOptions, productAdapter } from './data-source';
import { productSchema } from './validation';
import type { ProductFormValues } from './validation';
import { ProductCardPreview } from './components/ProductCardPreview';
import { ProductOptionMatrix } from './components/ProductOptionMatrix';
import {
  ProductPointsCard,
  ProductPriceDiscountCard,
  ProductShippingCard,
} from './components/ProductPricingCards';
import { SALE_STATUS_OPTIONS } from './types';
import {
  DEFAULT_POINTS,
  DEFAULT_SHIPPING,
  earnedPoints,
  MAX_PRODUCT_IMAGES,
  PRODUCT_BRAND_MAX,
  PRODUCT_CODE_MAX,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_NAME_MAX,
} from '../_shared/store';
import type { Product, ProductInput } from '../_shared/store';

const RESOURCE = 'products';
const ENTITY_LABEL = '상품';
const LIST_PATH = '/products';
const UNSAVED_MESSAGE =
  '상품에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const descriptionStyle: CSSProperties = {
  marginTop: 'var(--tds-space-1)',
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 13), 1fr))',
  gap: 'var(--tds-space-5)',
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
  minWidth: 0,
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 5), 1fr))',
  gap: 'var(--tds-space-4)',
};

const toggleFieldStyle: CSSProperties = fieldStyle;

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

const EMPTY: ProductFormValues = {
  name: '',
  code: '',
  categoryId: '',
  brand: '',
  price: '',
  discountType: 'none',
  discountValue: '',
  taxable: true,
  saleStatus: 'on_sale',
  displayed: true,
  shipping: {
    method: DEFAULT_SHIPPING.method,
    feeType: DEFAULT_SHIPPING.feeType,
    fee: String(DEFAULT_SHIPPING.fee),
    freeThreshold: String(DEFAULT_SHIPPING.freeThreshold),
  },
  // 새 상품은 전역 정책의 기본 적립률에서 출발한다 — 필요할 때만 이 상품에 한해 바꾼다
  points: {
    mode: DEFAULT_POINTS.mode,
    rate: String(DEFAULT_POINTS.rate),
    amount: '',
  },
  optionGroups: [],
  variants: [
    { id: 'variant-single', sku: '', optionValues: [], addPrice: 0, stock: 0, soldOut: false },
  ],
  coverImageUrl: '',
  imageUrls: [],
  description: '',
  tags: [],
};

function toInput(values: ProductFormValues): ProductInput {
  const discountValue =
    values.discountType === 'none' ? 0 : Number(values.discountValue.trim() || '0');
  const fee = values.shipping.feeType === 'free' ? 0 : Number(values.shipping.fee.trim() || '0');
  const freeThreshold =
    values.shipping.feeType === 'conditional'
      ? Number(values.shipping.freeThreshold.trim() || '0')
      : 0;
  // 쓰이지 않는 축은 0 으로 눕힌다 — '정액'으로 바꿔 저장한 뒤 남은 적립률이 되살아나지 않게 한다
  const pointsRate = values.points.mode === 'rate' ? Number(values.points.rate.trim() || '0') : 0;
  const pointsAmount =
    values.points.mode === 'fixed' ? Number(values.points.amount.trim() || '0') : 0;
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    categoryId: values.categoryId,
    brand: values.brand.trim(),
    pricing: {
      price: Number(values.price.trim() || '0'),
      discountType: values.discountType,
      discountValue,
      taxable: values.taxable,
    },
    saleStatus: values.saleStatus,
    displayed: values.displayed,
    shipping: {
      method: values.shipping.method,
      feeType: values.shipping.feeType,
      fee,
      freeThreshold,
    },
    points: { mode: values.points.mode, rate: pointsRate, amount: pointsAmount },
    optionGroups: values.optionGroups,
    variants: values.variants,
    coverImageUrl: values.coverImageUrl,
    imageUrls: values.imageUrls,
    // **저장 지점 sanitize** — 필드가 이미 걸러 내보내지만 여기서 한 번 더 건다. 폼 값은 필드
    // 말고도 닿을 수 있는 자리(setValue·리셋·복원)라, 저장으로 나가는 마지막 길목에서 확인한다.
    // trim() 하지 않는다 — HTML 이라 앞뒤 공백은 마크업 사이의 것이고, 빈 본문('<p></p>')은
    // 문자열 비교가 아니라 isRichTextEmpty 가 판정한다.
    description: isRichTextEmpty(values.description) ? '' : sanitizeRichText(values.description),
    tags: values.tags,
  };
}

/**
 * 입력 중인 문자열 → 숫자(미리보기 전용).
 *
 * 검증을 통과하기 **전** 값도 그려야 한다 — '129,000' 처럼 타이핑 중인 값에서 숫자만 건져낸다.
 * 저장 경로(toInput)는 이 관대함을 쓰지 않는다: 거기서는 스키마가 이미 형식을 통과시킨 뒤다.
 */
function previewNumber(raw: string): number {
  return Number((raw.trim() || '0').replace(/\D/g, '')) || 0;
}

function toValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    code: product.code,
    categoryId: product.categoryId,
    brand: product.brand,
    price: String(product.pricing.price),
    discountType: product.pricing.discountType,
    discountValue:
      product.pricing.discountType === 'none' ? '' : String(product.pricing.discountValue),
    taxable: product.pricing.taxable,
    saleStatus: product.saleStatus,
    displayed: product.displayed,
    shipping: {
      method: product.shipping.method,
      feeType: product.shipping.feeType,
      fee: String(product.shipping.fee),
      freeThreshold: String(product.shipping.freeThreshold),
    },
    // 쓰이지 않는 축은 빈 칸으로 — '미적용' 상품의 폼에 의미 없는 0 이 찍혀 있지 않게 한다
    points: {
      mode: product.points.mode,
      rate: product.points.mode === 'rate' ? String(product.points.rate) : '',
      amount: product.points.mode === 'fixed' ? String(product.points.amount) : '',
    },
    optionGroups: product.optionGroups.map((group) => ({ ...group, values: [...group.values] })),
    variants: product.variants.map((variant) => ({
      ...variant,
      optionValues: [...variant.optionValues],
    })),
    coverImageUrl: product.coverImageUrl,
    imageUrls: [...product.imageUrls],
    description: product.description,
    tags: [...product.tags],
  };
}

export default function ProductFormPage() {
  const navigate = useNavigate();
  const {
    form,
    isEdit,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit,
    isDirty,
  } = useCrudForm<Product, ProductInput, ProductFormValues>({
    resource: RESOURCE,
    adapter: productAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: productSchema,
    empty: EMPTY,
    toInput,
    toValues,
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;

  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const categoriesQuery = useQuery({
    queryKey: [RESOURCE, 'category-options'],
    queryFn: ({ signal }) => fetchProductCategoryOptions(signal),
  });
  const categories = categoriesQuery.data ?? [];

  const name = watch('name');
  const brand = watch('brand');
  const code = watch('code');
  const price = watch('price');
  const discountType = watch('discountType');
  const discountValue = watch('discountValue');
  const saleStatus = watch('saleStatus');
  const displayed = watch('displayed');
  const taxable = watch('taxable');
  const coverImageUrl = watch('coverImageUrl');
  const imageUrls = watch('imageUrls');
  const description = watch('description');
  const tags = watch('tags');
  const optionGroups = watch('optionGroups');
  const variants = watch('variants');
  const feeType = watch('shipping.feeType');
  const pointsMode = watch('points.mode');
  const pointsRate = watch('points.rate');
  const pointsAmount = watch('points.amount');

  const imagesError = (errors.imageUrls as { message?: string } | undefined)?.message;
  const variantsError = (errors.variants as { message?: string } | undefined)?.message;

  // 적립 미리보기는 순수 규칙(earnedPoints)이 계산한다 — 화면이 적립 산식을 따로 갖지 않는다
  const earnedPreview = earnedPoints(
    {
      price: previewNumber(price),
      discountType,
      discountValue: previewNumber(discountValue),
    },
    { mode: pointsMode, rate: previewNumber(pointsRate), amount: previewNumber(pointsAmount) },
  );

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '상품을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '상품을 불러오지 못했습니다.'}
            </span>
            {loadFailure === 'error' && (
              <Button variant="secondary" onClick={retryLoad}>
                다시 시도
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(LIST_PATH)}
      >
        <ChevronLeftIcon />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '상품 수정' : '상품 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 오른쪽 미리보기로 고객에게 보일 상품 카드를 확인하세요.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        <div style={layoutStyle}>
          <div style={columnStyle}>
            {/* ── 기본 정보 ── */}
            <Card>
              <CardTitle>기본 정보</CardTitle>

              <FormField
                htmlFor="product-name"
                label="상품명"
                required
                error={errors.name?.message}
              >
                <input
                  id="product-name"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.name !== undefined)}
                  maxLength={PRODUCT_NAME_MAX}
                  placeholder="예: 루미엔 경량 패딩 점퍼"
                  disabled={disabled}
                  aria-invalid={errors.name !== undefined}
                  aria-describedby={
                    errors.name !== undefined ? errorIdOf('product-name') : undefined
                  }
                  {...register('name')}
                />
              </FormField>

              <div style={rowStyle}>
                <FormField
                  htmlFor="product-code"
                  label="상품코드(SKU)"
                  required
                  error={errors.code?.message}
                >
                  <input
                    id="product-code"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.code !== undefined)}
                    maxLength={PRODUCT_CODE_MAX}
                    placeholder="예: LMN-PAD-001"
                    disabled={disabled}
                    aria-invalid={errors.code !== undefined}
                    aria-describedby={
                      errors.code !== undefined ? errorIdOf('product-code') : undefined
                    }
                    {...register('code')}
                  />
                </FormField>

                <FormField htmlFor="product-brand" label="브랜드" error={errors.brand?.message}>
                  <input
                    id="product-brand"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.brand !== undefined)}
                    maxLength={PRODUCT_BRAND_MAX}
                    placeholder="예: 루미엔"
                    disabled={disabled}
                    aria-invalid={errors.brand !== undefined}
                    aria-describedby={
                      errors.brand !== undefined ? errorIdOf('product-brand') : undefined
                    }
                    {...register('brand')}
                  />
                </FormField>
              </div>

              <div style={rowStyle}>
                <FormField
                  htmlFor="product-category"
                  label="카테고리"
                  required
                  error={errors.categoryId?.message}
                >
                  <SelectField
                    id="product-category"
                    isInvalid={errors.categoryId !== undefined}
                    disabled={disabled}
                    aria-invalid={errors.categoryId !== undefined}
                    aria-describedby={
                      errors.categoryId !== undefined ? errorIdOf('product-category') : undefined
                    }
                    {...register('categoryId')}
                  >
                    <option value="">카테고리 선택</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>

                <FormField htmlFor="product-sale-status" label="판매상태" required>
                  <SelectField
                    id="product-sale-status"
                    disabled={disabled}
                    {...register('saleStatus')}
                  >
                    {SALE_STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>

              <div style={toggleFieldStyle}>
                <span style={fieldLabelStyle}>전시상태</span>
                <ToggleSwitch
                  checked={displayed}
                  onChange={(next) => setValue('displayed', next, { shouldDirty: true })}
                  disabled={disabled}
                  label="상품 전시 여부"
                  onLabel="전시중"
                  offLabel="숨김"
                />
              </div>
            </Card>

            {/* ── 가격 · 할인 ── */}
            <ProductPriceDiscountCard
              register={register}
              errors={errors}
              setValue={setValue}
              disabled={disabled}
              discountType={discountType}
              taxable={taxable}
            />

            {/* ── 적립금 (상품별 적립 설정 — 전역 정책의 기본 적립률을 이 상품에 한해 덮어쓴다) ── */}
            <ProductPointsCard
              register={register}
              errors={errors}
              disabled={disabled}
              mode={pointsMode}
              earned={earnedPreview}
            />

            {/* ── 옵션 · 재고(SKU) ── */}
            <Card>
              <CardTitle>옵션 · 재고</CardTitle>
              <ProductOptionMatrix
                disabled={disabled}
                code={code}
                optionGroups={optionGroups}
                variants={variants}
                error={variantsError}
                onChange={(next) => {
                  setValue(
                    'optionGroups',
                    next.optionGroups.map((group) => ({ ...group, values: [...group.values] })),
                    { shouldDirty: true },
                  );
                  setValue(
                    'variants',
                    next.variants.map((variant) => ({
                      ...variant,
                      optionValues: [...variant.optionValues],
                    })),
                    { shouldDirty: true, shouldValidate: true },
                  );
                }}
              />
            </Card>

            {/* ── 배송 ── */}
            <ProductShippingCard
              register={register}
              errors={errors}
              disabled={disabled}
              feeType={feeType}
            />

            {/* ── 이미지 ── */}
            <Card>
              <CardTitle>이미지</CardTitle>
              <ImageUploadField
                label="대표 이미지"
                required
                value={coverImageUrl}
                onChange={(value) => setValue('coverImageUrl', value, { shouldDirty: true })}
                disabled={disabled}
                error={errors.coverImageUrl?.message}
                hint="목록에는 노출되지 않습니다 — 상세/미리보기의 대표 이미지입니다."
              />
              <ImageGalleryField
                label="상세 이미지"
                values={imageUrls}
                onChange={(next) => setValue('imageUrls', [...next], { shouldDirty: true })}
                disabled={disabled}
                error={imagesError}
                hint={`상품 상세를 보여줄 이미지를 여러 장 올릴 수 있습니다. 최대 ${String(MAX_PRODUCT_IMAGES)}장.`}
                maxFiles={MAX_PRODUCT_IMAGES}
              />
            </Card>

            {/* ── 상세설명 · 검색태그 ── */}
            <Card>
              <CardTitle>상세설명 · 검색태그</CardTitle>
              {/* 상세설명은 서식이 필요한 본문이라 RichTextField(Tiptap) 다 — value/onChange 계약은
                  TextareaField 와 같아 배선은 그대로다. 나가는 값은 이미 sanitize 된 HTML 이고,
                  들어오는 값도 필드가 렌더 지점에서 다시 sanitize 한다. */}
              <RichTextField
                label="상세설명"
                value={description}
                onChange={(value) => setValue('description', value, { shouldDirty: true })}
                maxLength={PRODUCT_DESCRIPTION_MAX}
                disabled={disabled}
                error={errors.description?.message}
                hint="굵게·기울임·제목·목록·링크·이미지를 쓸 수 있습니다. 글자 수는 서식을 빼고 셉니다."
                placeholder="상품의 소재·핏·관리법 등 상세 정보를 입력하세요."
                rows={6}
              />
              <FormField
                htmlFor="product-tags"
                label="검색 태그"
                error={(errors.tags as { message?: string } | undefined)?.message}
                hint="쉼표(,)로 구분해 입력하세요. 예: 패딩, 겨울, 경량"
              >
                <input
                  id="product-tags"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(false)}
                  value={tags.join(', ')}
                  disabled={disabled}
                  onChange={(event) =>
                    setValue(
                      'tags',
                      event.target.value
                        .split(',')
                        .map((tag) => tag.trim())
                        .filter((tag) => tag !== ''),
                      { shouldDirty: true },
                    )
                  }
                />
              </FormField>
            </Card>
          </div>

          {/* ── 우측 실시간 미리보기 ── */}
          <Card>
            <CardTitle>고객 노출 미리보기</CardTitle>
            <ProductCardPreview
              name={name}
              brand={brand}
              coverImageUrl={coverImageUrl}
              price={previewNumber(price)}
              discountType={discountType}
              discountValue={previewNumber(discountValue)}
              saleStatus={saleStatus}
              displayed={displayed}
            />
          </Card>
        </div>

        <div style={actionsStyle}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={disabled}>
            {submitButtonLabel(saving, isEdit)}
          </Button>
        </div>
      </form>

      <FormConflictDialog conflict={conflict} />

      {unsavedDialog}
    </div>
  );
}
