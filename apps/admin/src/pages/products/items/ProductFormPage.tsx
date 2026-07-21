// ProductFormPage — 상품 등록/수정 (라우트: /products/new · /products/:id/edit)
//
// [프레임워크 재사용 + 엔터프라이즈 레이아웃] 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 그대로
// 쓰고, 화면은 섹션 카드(기본정보·가격·옵션/SKU·배송·이미지·상세설명) + 우측 실시간 상품 카드 미리보기로
// 구성한다. FormPageShell 은 단일 카드 폼 전용이라, 다중 섹션 + 미리보기 2단은 여기서 직접 배치한다.
// [통합] 예전 product-registration(자체 업로드 모듈)을 대체한다 — 이미지는 공통 업로드 모듈을 쓴다.
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { cssVar, isRichTextEmpty, sanitizeRichText } from '@tds/ui';

import './product-form.css';
import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FilterRail,
  FormField,
  FormSectionAnchor,
  FormSectionNav,
  hintStyle,
  Icon,
  ImageGalleryField,
  ImageUploadField,
  pageTitleStyle,
  RichTextField,
  scrollToSection,
  SelectField,
  ToggleSwitch,
  useActiveSection,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import type { FormSectionItem } from '../../../shared/ui';
import {
  FormConflictDialog,
  FormServerError,
  submitButtonLabel,
  useCrudForm,
} from '../../../shared/crud';
// 구매 CTA 는 이 화면이 정하지 않는다 — 결제(PG) 설정에서 파생되는 값이라 규칙 함수를 그대로 부른다
import {
  checkoutCta,
  PAYMENT_SETTINGS_PATH,
  readPaymentSettings,
} from '../../../shared/commerce/payment-settings';
import { fetchProductCategoryOptions, productAdapter } from './data-source';
import { productSchema } from './validation';
import type { ProductFormValues } from './validation';
import { ProductCardPreview } from './components/ProductCardPreview';
import { ProductCouponCard } from './components/ProductCouponCard';
import type { CouponChoice } from './components/ProductCouponCard';
import { ProductOptionMatrix } from './components/ProductOptionMatrix';
import {
  ProductPointsCard,
  ProductPriceDiscountCard,
  ProductShippingCard,
} from './components/ProductPricingCards';
import { SALE_STATUS_OPTIONS } from './types';
import {
  DEFAULT_COUPONS,
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
// 같은 섹션(pages/products) 안이라 페이지 간 결합이 아니다 — 그래도 '무엇이 이 상품을 지목했나' 는
// 쿠폰이 답할 질문이라 시드를 직접 읽지 않고 쿠폰 모듈의 조회기를 부른다.
import { couponsTargetingProduct, fetchCouponOptions } from '../coupons/data-source';

const RESOURCE = 'products';
const ENTITY_LABEL = '상품';
const LIST_PATH = '/products';
const UNSAVED_MESSAGE =
  '상품에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  cursor: 'pointer',
};

/**
 * 폼 구획 — 좌측 레일의 한 줄이자 본문의 한 앵커.
 *
 * [왜 좌측이 '필터' 가 아닌가] 이 화면에는 좁힐 컬렉션이 없다. 카드가 일곱 장이라 저장 버튼을 누른
 * 뒤 오류가 두 화면 아래에 있을 수 있고, 운영자가 알고 싶은 것은 '어느 등급만 보기' 가 아니라
 * **'지금 어디에 있고, 어디를 고쳐야 하나'** 다. 그래서 껍데기(FilterRail)만 목록 화면과 공유하고
 * 내용물은 내비게이션(FormSectionNav)이다 — 상태 표기도 aria-pressed 가 아니라 aria-current 다.
 *
 * fields 는 그 구획이 책임지는 폼 필드다. 이 표가 있어야 레일이 '어느 구획에 오류가 있는지'를
 * 스스로 말할 수 있다 — 화면 어딘가에 흩어진 조건문으로 다시 적지 않는다.
 */
const SECTIONS = [
  {
    id: 'product-section-basic',
    label: '기본 정보',
    fields: ['name', 'code', 'categoryId', 'brand', 'saleStatus', 'displayed'],
  },
  {
    id: 'product-section-pricing',
    label: '가격 · 할인',
    fields: ['price', 'discountType', 'discountValue', 'taxable'],
  },
  { id: 'product-section-points', label: '적립금', fields: ['points'] },
  { id: 'product-section-coupons', label: '쿠폰 사용 설정', fields: ['coupons'] },
  { id: 'product-section-options', label: '옵션 · 재고', fields: ['optionGroups', 'variants'] },
  { id: 'product-section-shipping', label: '배송', fields: ['shipping'] },
  { id: 'product-section-images', label: '이미지', fields: ['coverImageUrl', 'imageUrls'] },
  {
    id: 'product-section-content',
    label: '상세설명 · 검색태그',
    fields: ['description', 'tags'],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  fields: readonly (keyof ProductFormValues)[];
}[];

/** 문서 순서대로 고정한 앵커 id — useActiveSection 이 렌더마다 관측자를 다시 붙이지 않게 모듈 상수다 */
const SECTION_IDS: readonly string[] = SECTIONS.map((section) => section.id);

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 5), 1fr))`,
  gap: cssVar('space.4'),
};

const toggleFieldStyle: CSSProperties = fieldStyle;

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
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
  // 새 상품은 쿠폰을 받는 쪽으로 연다 — 막는 것은 명시적 결정이어야 한다(_shared/store)
  coupons: {
    usable: DEFAULT_COUPONS.usable,
    mode: DEFAULT_COUPONS.mode,
    couponIds: [],
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
    // 쓰이지 않는 축은 눕힌다 — '모든 쿠폰 사용 가능' 으로 되돌린 뒤 예전 선택이 되살아나지 않게
    coupons: {
      usable: values.coupons.usable,
      mode: values.coupons.mode,
      couponIds:
        values.coupons.usable && values.coupons.mode !== 'all' ? [...values.coupons.couponIds] : [],
    },
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
    coupons: {
      usable: product.coupons.usable,
      mode: product.coupons.mode,
      couponIds: [...product.coupons.couponIds],
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
  /** 수정 화면의 상품 id — 쿠폰이 이 상품을 지목했는지 맞춰 보는 값 */
  const { id: productId } = useParams<{ id: string }>();
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

  /**
   * 카테고리는 2단계다 — 폼이 저장하는 값(`categoryId`)은 **최종 선택 하나**이고,
   * 중분류를 고르면 그 id, 고르지 않으면 대분류 id 가 들어간다. 두 셀렉트는 그 값에서 되짚어 그린다.
   */
  const categoryId = watch('categoryId');
  const selectedCategory = categories.find((category) => category.id === categoryId);
  const categoryRootId =
    selectedCategory === undefined ? '' : (selectedCategory.parentId ?? selectedCategory.id);
  const categoryChildId =
    selectedCategory !== undefined && selectedCategory.parentId !== null ? selectedCategory.id : '';
  const categoryRootOptions = categories.filter((category) => category.parentId === null);
  const categoryChildOptions =
    categoryRootId === ''
      ? []
      : categories.filter((category) => category.parentId === categoryRootId);

  /** 대분류를 바꾸면 중분류 선택은 버린다 — 다른 갈래의 중분류가 남아 있으면 안 된다 */
  const setCategory = (next: string) =>
    setValue('categoryId', next, { shouldDirty: true, shouldValidate: true });

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
  const couponUsable = watch('coupons.usable');
  const couponMode = watch('coupons.mode');
  const couponIds = watch('coupons.couponIds');

  /**
   * 쿠폰 선택지 + '이 상품을 지목했는가'.
   *
   * 지목 판정은 저장된 카테고리(categoryId)로 한다 — 폼에서 카테고리를 바꾸면 다음 렌더에 곧바로
   * 다른 쿠폰이 걸린다. 신규 상품은 아직 id 가 없어 상품 지목은 성립하지 않고 카테고리만 걸린다.
   */
  const couponOptionsQuery = useQuery({
    queryKey: ['coupons', 'options'],
    queryFn: ({ signal }) => fetchCouponOptions(signal),
  });

  const couponChoices = useMemo<readonly CouponChoice[]>(() => {
    const options = couponOptionsQuery.data ?? [];
    const targeting = new Set(
      couponsTargetingProduct({ id: productId ?? '', categoryId }).map((coupon) => coupon.id),
    );
    return options.map((coupon) => ({
      id: coupon.id,
      name: coupon.name,
      targetsThisProduct: targeting.has(coupon.id),
    }));
  }, [couponOptionsQuery.data, productId, categoryId]);

  // 좌측 레일 — 지금 보고 있는 구획(스크롤 추적)과 오류가 남은 구획을 함께 말한다
  const activeSectionId = useActiveSection(SECTION_IDS);
  const sectionNavItems = useMemo<readonly FormSectionItem[]>(
    () =>
      SECTIONS.map((section) => {
        // 오류 표시는 errors 하나만 본다 — 구획마다 조건을 다시 적으면 표와 화면이 어긋난다
        const invalid = section.fields.some((field) => errors[field] !== undefined);
        return invalid
          ? { id: section.id, label: section.label, invalid: true }
          : { id: section.id, label: section.label };
      }),
    [errors],
  );

  const imagesError = (errors.imageUrls as { message?: string } | undefined)?.message;
  const variantsError = (errors.variants as { message?: string } | undefined)?.message;

  /**
   * 고객이 보게 될 구매 버튼 — **저장된 상품의 값이 아니라 결제 설정에서 나온다.**
   *
   * PG 를 쓰지 않도록 설정돼 있으면 '구매하기' 가 아니라 '문의하기' 다(그 문의는 상품 문의로
   * 들어온다). 렌더할 때마다 규칙을 다시 부른다 — 설정이 바뀌면 다음 렌더가 곧바로 새 답을 쓴다.
   */
  const checkout = checkoutCta(readPaymentSettings(), 'product');

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
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '상품 수정' : '상품 등록'}</h1>
        <p style={descriptionStyle}>
          {/* 방향('왼쪽·오른쪽')을 적지 않는다 — 좁은 화면에서는 목차가 폼 위로 접혀 올라간다 */}
          별표(*) 항목은 필수입니다. 목차로 구획을 오가고, 미리보기로 고객에게 보일 상품 카드를
          확인하세요.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        {/* 좌: 구획 목차 레일 / 우: 폼 본문 + 미리보기. 좁은 화면에서는 1단으로 접힌다
            (product-form.css — 미디어 쿼리는 인라인 style 로 표현할 수 없다) */}
        <div className="tds-productform-layout">
          <div className="tds-productform-rail">
            {/* 껍데기(간격·안내문 구분선·시각 언어)는 목록 화면의 레일과 같은 것을 쓴다.
                내용물만 다르다 — 필터가 아니라 내비게이션이다 (FormSectionNav 머리말 참조). */}
            <FilterRail
              notice={
                <p style={hintStyle}>
                  구획을 누르면 해당 위치로 이동합니다. 붉은 점이 붙은 구획에는 확인이 필요한 입력이
                  남아 있습니다.
                </p>
              }
            >
              <FormSectionNav
                navLabel="상품 폼 구획 이동"
                heading="구획"
                items={sectionNavItems}
                activeId={activeSectionId}
                onJump={scrollToSection}
              />
            </FilterRail>
          </div>

          <div style={layoutStyle}>
            <div style={columnStyle}>
              {/* ── 기본 정보 ── */}
              <FormSectionAnchor id={SECTIONS[0].id} label={SECTIONS[0].label}>
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
                      label="카테고리 (대분류)"
                      required
                      error={errors.categoryId?.message}
                    >
                      <SelectField
                        id="product-category"
                        isInvalid={errors.categoryId !== undefined}
                        disabled={disabled}
                        aria-invalid={errors.categoryId !== undefined}
                        aria-describedby={
                          errors.categoryId !== undefined
                            ? errorIdOf('product-category')
                            : undefined
                        }
                        value={categoryRootId}
                        onChange={(event) => setCategory(event.target.value)}
                      >
                        <option value="">대분류 선택</option>
                        {categoryRootOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.label}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>

                    {/* 2Depth — 고르지 않으면 대분류에 등록된다. 하위가 없는 대분류면 잠근다 */}
                    <FormField
                      htmlFor="product-category-child"
                      label="카테고리 (중분류)"
                      hint={
                        categoryRootId === ''
                          ? '대분류를 먼저 선택하세요.'
                          : categoryChildOptions.length === 0
                            ? '이 대분류에는 중분류가 없습니다.'
                            : '선택하지 않으면 대분류에 등록됩니다.'
                      }
                    >
                      <SelectField
                        id="product-category-child"
                        disabled={disabled || categoryChildOptions.length === 0}
                        value={categoryChildId}
                        onChange={(event) =>
                          setCategory(
                            event.target.value === '' ? categoryRootId : event.target.value,
                          )
                        }
                      >
                        <option value="">
                          {categoryChildOptions.length === 0 ? '없음' : '선택 안 함'}
                        </option>
                        {categoryChildOptions.map((category) => (
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
              </FormSectionAnchor>

              {/* ── 가격 · 할인 ── */}
              <FormSectionAnchor id={SECTIONS[1].id} label={SECTIONS[1].label}>
                <ProductPriceDiscountCard
                  register={register}
                  errors={errors}
                  setValue={setValue}
                  disabled={disabled}
                  discountType={discountType}
                  taxable={taxable}
                />
              </FormSectionAnchor>

              {/* ── 적립금 (상품별 적립 설정 — 전역 정책의 기본 적립률을 이 상품에 한해 덮어쓴다) ── */}
              <FormSectionAnchor id={SECTIONS[2].id} label={SECTIONS[2].label}>
                <ProductPointsCard
                  register={register}
                  errors={errors}
                  disabled={disabled}
                  mode={pointsMode}
                  earned={earnedPreview}
                />
              </FormSectionAnchor>

              {/* ── 쿠폰 사용 설정 (쿠폰 화면의 '발급 대상' 과 짝 — 어긋나면 상품이 이긴다) ── */}
              <FormSectionAnchor id={SECTIONS[3].id} label={SECTIONS[3].label}>
                <ProductCouponCard
                  register={register}
                  errors={errors}
                  setValue={setValue}
                  disabled={disabled}
                  usable={couponUsable}
                  mode={couponMode}
                  couponIds={couponIds}
                  choices={couponChoices}
                  loading={couponOptionsQuery.isPending}
                />
              </FormSectionAnchor>

              {/* ── 옵션 · 재고(SKU) ── */}
              <FormSectionAnchor id={SECTIONS[4].id} label={SECTIONS[4].label}>
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
              </FormSectionAnchor>

              {/* ── 배송 ── */}
              <FormSectionAnchor id={SECTIONS[5].id} label={SECTIONS[5].label}>
                <ProductShippingCard
                  register={register}
                  errors={errors}
                  disabled={disabled}
                  feeType={feeType}
                />
              </FormSectionAnchor>

              {/* ── 이미지 ── */}
              <FormSectionAnchor id={SECTIONS[6].id} label={SECTIONS[6].label}>
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
              </FormSectionAnchor>

              {/* ── 상세설명 · 검색태그 ── */}
              <FormSectionAnchor id={SECTIONS[7].id} label={SECTIONS[7].label}>
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
              </FormSectionAnchor>
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
                ctaLabel={checkout.label}
                ctaKind={checkout.kind}
              />

              {/* 왜 지금 저 버튼인지 한 줄로 말한다 — 문구는 규칙이 함께 돌려준다(화면이 짓지 않는다).
                  링크는 <Link> 다: 미저장 이탈 가드가 앵커 클릭을 가로챈다(navigate 로 가면 그냥 지나친다). */}
              <p style={hintStyle}>
                {checkout.reason}{' '}
                <Link to={PAYMENT_SETTINGS_PATH} className="tds-ui-link tds-ui-focusable">
                  결제 설정에서 바꾸기
                </Link>
              </p>
            </Card>
          </div>
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
