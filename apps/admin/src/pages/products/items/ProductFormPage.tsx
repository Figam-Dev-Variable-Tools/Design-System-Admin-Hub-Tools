// ProductFormPage — 상품 등록/수정 (라우트: /products/new · /products/:id/edit) · A41 소유
//
// [프레임워크 재사용 + 엔터프라이즈 레이아웃] 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 그대로
// 쓰고, 화면은 섹션 카드(기본정보·가격·옵션/SKU·배송·이미지·상세설명) + 우측 실시간 상품 카드 미리보기로
// 구성한다. FormPageShell 은 단일 카드 폼 전용이라, 다중 섹션 + 미리보기 2단은 여기서 직접 배치한다.
// [통합] 예전 product-registration(자체 업로드 모듈)을 대체한다 — 이미지는 공통 업로드 모듈을 쓴다.
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
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
  SelectField,
  TextareaField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { submitButtonLabel, useCrudForm } from '../../../shared/crud';
import { fetchProductCategoryOptions, productAdapter } from './data-source';
import { productSchema } from './validation';
import type { ProductFormValues } from './validation';
import { ProductCardPreview } from './components/ProductCardPreview';
import { ProductOptionMatrix } from './components/ProductOptionMatrix';
import { ProductPriceDiscountCard, ProductShippingCard } from './components/ProductPricingCards';
import { SALE_STATUS_OPTIONS } from './types';
import {
  DEFAULT_SHIPPING,
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

const titleStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  fontFamily: 'var(--tds-typography-title-lg-font-family)',
  fontSize: 'var(--tds-typography-title-lg-font-size)',
  fontWeight: 'var(--tds-typography-title-lg-font-weight)',
  lineHeight: 'var(--tds-typography-title-lg-line-height)',
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
    optionGroups: values.optionGroups,
    variants: values.variants,
    coverImageUrl: values.coverImageUrl,
    imageUrls: values.imageUrls,
    description: values.description.trim(),
    tags: values.tags,
  };
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
  const { form, isEdit, saving, loadingDetail, loadFailed, serverError, submit, isDirty } =
    useCrudForm<Product, ProductInput, ProductFormValues>({
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

  const imagesError = (errors.imageUrls as { message?: string } | undefined)?.message;
  const variantsError = (errors.variants as { message?: string } | undefined)?.message;

  if (isEdit && loadFailed) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>상품을 불러오지 못했습니다. </span>
          <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
            목록으로
          </Button>
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
        <h1 style={titleStyle}>{isEdit ? '상품 수정' : '상품 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 오른쪽 미리보기로 고객에게 보일 상품 카드를 확인하세요.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

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
              <TextareaField
                label="상세설명"
                value={description}
                onChange={(value) => setValue('description', value, { shouldDirty: true })}
                maxLength={PRODUCT_DESCRIPTION_MAX}
                disabled={disabled}
                error={errors.description?.message}
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
              price={Number((price.trim() || '0').replace(/\D/g, '')) || 0}
              discountType={discountType}
              discountValue={Number((discountValue.trim() || '0').replace(/\D/g, '')) || 0}
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

      {unsavedDialog}
    </div>
  );
}
