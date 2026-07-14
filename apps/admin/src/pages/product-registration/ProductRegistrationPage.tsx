// ProductRegistrationPage — 상품 등록 화면 (라우트: /products/new)
//
// 대응 Screen Spec: docs/plan/ui/SCR-003-product-registration.md
//   §3 CRUD 상태 매트릭스(등록: 정상·에러(a~d)·로딩·권한없음) / §3.1 이미지 업로드 / §3.2 임시저장·복원 /
//   §3.3 카테고리 로드 / §5.1 권한 / §5.2 유효성 / §5.3 기타 규칙(이중 액션·이탈 경고·중복 제출 차단·타임아웃·대표 이미지·숫자 표시)
//
// [컴포넌트 출처] 이 화면의 폼 프리미티브(./ui.tsx · ./ImageUploadField.tsx)는 **의도적으로 로컬**이다:
// Field/FormSection/EmptyState 는 이 화면 하나만 쓰고(소비자 1), Alert/Button/Badge 도 여기서는
// 다른 모양이다(라벨 접두 배너 · text variant · 대표 이미지 표식). MP-001 §2-D 판정 — 승격하지 않는다.
// 승격 대상이었던 것들(Card·Tabs·DataTable·…)은 이미 @tds/ui 소비로 교체됐다.
// [스타일] 값은 전부 토큰 CSS 변수(var(--tds-*)) — 하드코딩 색상/px 0건 (G6 체크리스트).
// AppShell(<Outlet />) 내부에 렌더링되므로 최상위 요소는 <main>이 아닌 <section>이다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, KeyboardEvent, MutableRefObject } from 'react';
import { Navigate } from 'react-router-dom';
import {
  DRAFT_DELETE_ERROR_MESSAGE,
  DRAFT_SAVE_ERROR_MESSAGE,
  SUBMIT_ERROR_MESSAGE,
  SUBMIT_SUCCESS_MESSAGE,
  UPLOAD_IN_PROGRESS_MESSAGE,
  deleteDraft,
  fetchCategories,
  formatDateTime,
  formatTime,
  getCurrentRole,
  loadDraft,
  saveDraft,
  submitProduct,
} from './api';
import ImageUploadField from './ImageUploadField';
import { ConfirmDialog, useToast, useUnsavedChangesDialog } from '../../shared/ui';
import {
  SCOPED_CSS,
  actionsRowStyle,
  errorTextStyle,
  formStyle,
  hintStyle,
  inputStyle,
  pageDescriptionStyle,
  pageStyle,
  pageTitleStyle,
  selectStyle,
  textareaStyle,
} from './styles';
import type {
  Category,
  DraftSnapshot,
  FieldErrors,
  FieldName,
  PageAlert,
  ProductFormValues,
} from './types';
import { EMPTY_VALUES, FIELD_ORDER } from './types';
import { Alert, Button, EmptyState, Field, FormSection, describedBy } from './ui';
import { useImageUploads } from './useImageUploads';
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  firstErrorField,
  formatThousands,
  stripNonDigits,
  validateAll,
  validateField,
  validateForDraft,
} from './validation';

/** §5.3 규칙 3 (b) 라우트 가드 confirm 문구 */
const LEAVE_CONFIRM_MESSAGE =
  '저장되지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다. 계속할까요?';
/** §3.2 복원 실행 — dirty 상태에서의 덮어쓰기 확인 문구 */
const RESTORE_CONFIRM_MESSAGE = '현재 입력한 내용이 임시저장본으로 대체됩니다. 계속할까요?';
/** §3.3 에러 상태 인라인 문구 */
const CATEGORY_LOAD_ERROR = '카테고리를 불러오지 못했습니다.';
/** §3.3 빈 상태 안내 */
const CATEGORY_EMPTY_HINT = '등록 가능한 카테고리가 없습니다. 시스템 관리자에게 문의하세요.';

const FIELD_ID: Record<FieldName, string> = {
  name: 'product-name',
  description: 'product-description',
  price: 'product-price',
  stock: 'product-stock',
  categoryId: 'product-category',
  images: 'product-images',
};

type CategoryState =
  { status: 'loading' } | { status: 'success'; categories: Category[] } | { status: 'error' };

/** dirty 판정용 직렬화 — 필드 값 + 업로드 완료 이미지 목록 (§5.3 규칙 3) */
function serialize(values: ProductFormValues, imageIds: string[]): string {
  return JSON.stringify({ values, imageIds });
}

/** 숫자 필드는 판매가·재고 둘뿐이다 — 편집 중 원값 표시 대상(§5.3 규칙 7) */
type NumberField = 'price' | 'stock';

interface NumberFieldSectionProps {
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly field: NumberField;
  readonly label: string;
  readonly hint: string;
  /** 표시값 — 편집 중이면 원값, 아니면 천 단위 구분 (§5.3 규칙 7) */
  readonly display: string;
  readonly error: string | undefined;
  readonly busy: boolean;
  readonly fieldRefs: MutableRefObject<Record<FieldName, HTMLElement | null>>;
  readonly onFocusField: (field: NumberField | null) => void;
  readonly onChangeValue: (field: NumberField, value: string) => void;
  readonly onBlurValidate: (field: NumberField) => void;
}

/**
 * 숫자 입력 섹션 — 판매가와 재고가 **글자 몇 개만 빼고 똑같은 40줄**이었다
 * (A83 축3 `clone:073e7e19f9b7ec44`). 규칙이 하나면 코드도 하나여야 한다:
 * 숫자만 입력받고(stripNonDigits), 포커스 중에는 원값을, 벗어나면 천 단위 구분을 보여준다.
 *
 * 승격하지 않는다 — 소비자가 이 페이지 하나다 (MP-001 §2-D 과잉 추상화 회피).
 */
function NumberFieldSection({
  sectionId,
  sectionTitle,
  field,
  label,
  hint,
  display,
  error,
  busy,
  fieldRefs,
  onFocusField,
  onChangeValue,
  onBlurValidate,
}: NumberFieldSectionProps) {
  const id = FIELD_ID[field];
  const invalid = error !== undefined;

  return (
    <FormSection titleId={sectionId} title={sectionTitle}>
      <Field id={id} label={label} required error={error} hint={hint}>
        <input
          id={id}
          ref={(element) => {
            fieldRefs.current[field] = element;
          }}
          className="tds-pr-input tds-pr-focusable"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          disabled={busy}
          style={inputStyle(invalid)}
          aria-required="true"
          aria-invalid={invalid}
          aria-describedby={describedBy(`${id}-hint`, invalid ? `${id}-error` : undefined)}
          onFocus={() => {
            onFocusField(field);
          }}
          onChange={(event) => {
            onChangeValue(field, stripNonDigits(event.target.value));
          }}
          onBlur={() => {
            onFocusField(null);
            onBlurValidate(field);
          }}
        />
      </Field>
    </FormSection>
  );
}

/** 이 섹션이 만지는 필드는 둘뿐이다 — 'images' 같은 비-텍스트 필드는 여기 오지 않는다 */
type BasicField = 'name' | 'description';

interface BasicInfoSectionProps {
  readonly values: ProductFormValues;
  readonly nameError: string | undefined;
  readonly descriptionError: string | undefined;
  readonly busy: boolean;
  readonly fieldRefs: MutableRefObject<Record<FieldName, HTMLElement | null>>;
  readonly onChangeValue: (field: BasicField, value: string) => void;
  readonly onBlurValidate: (field: BasicField) => void;
}

/** 기본 정보 — 상품명(필수) + 상품 설명(선택). 두 필드 모두 글자 수 카운터를 단다 */
function BasicInfoSection({
  values,
  nameError,
  descriptionError,
  busy,
  fieldRefs,
  onChangeValue,
  onBlurValidate,
}: BasicInfoSectionProps) {
  const nameInvalid = nameError !== undefined;
  const descriptionInvalid = descriptionError !== undefined;

  return (
    <FormSection titleId="section-basic" title="기본 정보">
      <Field
        id={FIELD_ID.name}
        label="상품명"
        required
        error={nameError}
        counter={`${String(values.name.length)}/${String(NAME_MAX)}`}
      >
        <input
          id={FIELD_ID.name}
          ref={(element) => {
            fieldRefs.current.name = element;
          }}
          className="tds-pr-input tds-pr-focusable"
          type="text"
          value={values.name}
          maxLength={NAME_MAX}
          placeholder="예: 겨울 패딩 점퍼"
          disabled={busy}
          style={inputStyle(nameInvalid)}
          aria-required="true"
          aria-invalid={nameInvalid}
          aria-describedby={describedBy(nameInvalid ? `${FIELD_ID.name}-error` : undefined)}
          onChange={(event) => {
            onChangeValue('name', event.target.value);
          }}
          onBlur={() => {
            onBlurValidate('name');
          }}
        />
      </Field>

      <Field
        id={FIELD_ID.description}
        label="상품 설명"
        error={descriptionError}
        counter={`${String(values.description.length)}/${String(DESCRIPTION_MAX)}`}
        hint="선택 입력입니다. 최대 2,000자까지 작성할 수 있습니다."
      >
        <textarea
          id={FIELD_ID.description}
          ref={(element) => {
            fieldRefs.current.description = element;
          }}
          className="tds-pr-input tds-pr-focusable"
          value={values.description}
          rows={5}
          disabled={busy}
          style={textareaStyle(descriptionInvalid)}
          aria-invalid={descriptionInvalid}
          aria-describedby={describedBy(
            `${FIELD_ID.description}-hint`,
            descriptionInvalid ? `${FIELD_ID.description}-error` : undefined,
          )}
          onChange={(event) => {
            onChangeValue('description', event.target.value);
          }}
          onBlur={() => {
            onBlurValidate('description');
          }}
        />
      </Field>
    </FormSection>
  );
}

const categoryRetryRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
} as const;

interface CategorySectionProps {
  readonly value: string;
  readonly error: string | undefined;
  readonly busy: boolean;
  readonly state: CategoryState;
  readonly fieldRefs: MutableRefObject<Record<FieldName, HTMLElement | null>>;
  readonly onChangeValue: (value: string) => void;
  readonly onBlurValidate: () => void;
  readonly onRetry: () => void;
}

/**
 * 카테고리 (§3.3) — 로딩·실패·빈 상태를 **한 곳에서** 해소한다.
 * 세 상태가 select 의 disabled · aria-busy · aria-describedby · 힌트 문구를 함께 결정하기 때문에,
 * 이 분기들이 페이지 본문에 흩어져 있으면 무엇이 어느 상태를 그리는지 아무도 추적하지 못한다.
 */
function CategorySection({
  value,
  error,
  busy,
  state,
  fieldRefs,
  onChangeValue,
  onBlurValidate,
  onRetry,
}: CategorySectionProps) {
  const loading = state.status === 'loading';
  const loadFailed = state.status === 'error';
  const options = state.status === 'success' ? state.categories : [];
  const empty = state.status === 'success' && options.length === 0;
  const disabled = busy || loading || loadFailed || empty;
  const invalid = error !== undefined;

  return (
    <FormSection titleId="section-category" title="카테고리">
      <Field
        id={FIELD_ID.categoryId}
        label="카테고리"
        required
        error={error}
        hint={empty ? CATEGORY_EMPTY_HINT : undefined}
      >
        <select
          id={FIELD_ID.categoryId}
          ref={(element) => {
            fieldRefs.current.categoryId = element;
          }}
          className="tds-pr-focusable"
          value={value}
          disabled={disabled}
          style={selectStyle(invalid, disabled)}
          aria-required="true"
          aria-invalid={invalid}
          aria-busy={loading}
          aria-describedby={describedBy(
            empty ? `${FIELD_ID.categoryId}-hint` : undefined,
            invalid ? `${FIELD_ID.categoryId}-error` : undefined,
            loadFailed ? `${FIELD_ID.categoryId}-load-error` : undefined,
          )}
          onChange={(event) => {
            onChangeValue(event.target.value);
          }}
          onBlur={onBlurValidate}
        >
          <option value="">{loading ? '카테고리 불러오는 중…' : '카테고리를 선택하세요'}</option>
          {options.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        {/* §3.3 에러 — 인라인 에러 + [다시 시도] (재로드 경로는 이것 하나뿐 · §5.3 규칙 8) */}
        {loadFailed ? (
          <div style={categoryRetryRowStyle}>
            <span id={`${FIELD_ID.categoryId}-load-error`} style={errorTextStyle} role="alert">
              오류: {CATEGORY_LOAD_ERROR}
            </span>
            <Button variant="text" disabled={busy} onClick={onRetry}>
              다시 시도
            </Button>
          </div>
        ) : null}
      </Field>
    </FormSection>
  );
}

export default function ProductRegistrationPage() {
  // §5.1 권한 매트릭스 — 인증 컨텍스트가 아직 없어 mock 역할을 사용한다(api.getCurrentRole).
  const role = getCurrentRole();

  // 미인증 사용자: SCR-001로 리다이렉트(returnUrl 보존)
  if (role === 'guest') {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent('/products/new')}`} replace />;
  }

  // 뷰어: 화면 진입은 허용하되 폼 미노출 — 본문 전체를 권한없음 안내로 대체
  if (role === 'viewer') {
    return (
      <section style={pageStyle} aria-labelledby="product-registration-title">
        <h1 id="product-registration-title" style={pageTitleStyle}>
          상품 등록
        </h1>
        <EmptyState title="상품 등록 권한이 없습니다. 권한이 필요하면 시스템 관리자에게 요청하세요." />
      </section>
    );
  }

  return <ProductRegistrationForm />;
}

function ProductRegistrationForm() {
  // 쓰기 작업(등록·임시저장·임시저장본 삭제)의 성공/실패는 토스트가 나른다.
  // 인라인 Alert 로 남는 것은 두 가지뿐이다:
  //   ① 임시저장 복원 안내 (사용자가 결정할 때까지 남아야 한다)
  //   ② 업로드 진행 중 제출 안내 (지금 뭘 기다려야 하는지 알려주는 상태 안내)
  // 필드 에러는 언제나 필드 옆 인라인이다 — 사라지면 어느 칸이 틀렸는지 알 수 없다.
  const toast = useToast();

  const [values, setValues] = useState<ProductFormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pageAlert, setPageAlert] = useState<PageAlert | null>(null);
  /** 임시저장본으로 덮어쓰기 확인 — 입력 중(dirty)일 때만 뜬다 */
  const [confirmingRestore, setConfirmingRestore] = useState(false);
  const [categoryState, setCategoryState] = useState<CategoryState>({ status: 'loading' });
  /** 진입 시 발견한 임시저장본 — 복원 안내 Alert 표시용(§3.2). 복원/삭제로 해소되면 null */
  const [restorePrompt, setRestorePrompt] = useState<DraftSnapshot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  /** 숫자 필드 편집 중 여부 — 포커스 시 원값, blur 시 천 단위 구분 표시(§5.3 규칙 7) */
  const [editingNumber, setEditingNumber] = useState<'price' | 'stock' | null>(null);
  /** 마지막 저장(임시저장/등록 성공) 시점의 스냅샷 — dirty 판정 기준 */
  const [baseline, setBaseline] = useState<string>(serialize(EMPTY_VALUES, []));

  const uploads = useImageUploads();
  const fieldRefs = useRef<Record<FieldName, HTMLElement | null>>({
    name: null,
    description: null,
    price: null,
    stock: null,
    categoryId: null,
    images: null,
  });

  const imageIds = useMemo(() => uploads.uploadedRefs.map((ref) => ref.id), [uploads.uploadedRefs]);
  const uploadedCount = uploads.uploadedRefs.length;

  // §5.3 규칙 4 — 등록/임시저장 동시 요청 최대 1건: 한쪽 진행 중이면 폼 전체 비활성
  const busy = submitting || savingDraft;
  const isDirty = serialize(values, imageIds) !== baseline;

  // 공통 모듈 — 고객 설정 화면과 같은 이탈 가드를 쓴다 (예전에는 이 페이지가 자기 것을 갖고 있었다)
  const unsavedDialog = useUnsavedChangesDialog(isDirty && !busy, {
    message: LEAVE_CONFIRM_MESSAGE,
  });

  // ── §3.3 카테고리 로드 (진입 시 1회 · 재로드는 [다시 시도] 1가지 경로 — §5.3 규칙 8)
  const loadCategories = useCallback((signal?: AbortSignal) => {
    setCategoryState({ status: 'loading' });
    void fetchCategories(signal).then((result) => {
      if (signal?.aborted === true) return;
      if (result.status === 'error') {
        setCategoryState({ status: 'error' });
        return;
      }
      setCategoryState({ status: 'success', categories: result.categories });
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadCategories(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadCategories]);

  // ── §3.2 복원 안내 — 진입 시 임시저장본 조회(1회)
  useEffect(() => {
    setRestorePrompt(loadDraft());
  }, []);

  const focusField = useCallback((field: FieldName) => {
    const element = fieldRefs.current[field] ?? document.getElementById(FIELD_ID[field]);
    element?.focus();
  }, []);

  const setFieldValue = useCallback((field: keyof ProductFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);

  /** blur 시점 단일 필드 검증 (§5.2 검증 시점 규칙 1) */
  const handleBlurValidate = useCallback(
    (field: FieldName) => {
      const message = validateField(field, values, uploadedCount);
      setErrors((current) => {
        if (message !== undefined) return { ...current, [field]: message };
        // 통과한 필드는 **키 자체를 지운다** (undefined 를 남기지 않는다 — `field in errors` 가 참이 된다).
        // 동적 delete 는 객체 shape 을 런타임에 바꾸므로 쓰지 않는다 (@typescript-eslint/no-dynamic-delete).
        return Object.fromEntries(
          Object.entries(current).filter(([key]) => key !== field),
        ) as FieldErrors;
      });
    },
    [values, uploadedCount],
  );

  // ── §5.3 규칙 1 — 폼 내 Enter 키 제출 비활성(제출 수단은 버튼 클릭 1가지)
  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== 'Enter') return;
    const target = event.target;
    // textarea의 줄바꿈과 버튼의 키보드 활성화는 유지한다.
    if (target instanceof HTMLTextAreaElement || target instanceof HTMLButtonElement) return;
    event.preventDefault();
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    // 폼 submit 이벤트 자체를 차단한다(제출은 [등록] 버튼 클릭 핸들러에서만 수행).
    event.preventDefault();
  };

  const resetForm = useCallback(() => {
    setValues(EMPTY_VALUES);
    setErrors({});
    uploads.reset();
    setBaseline(serialize(EMPTY_VALUES, []));
  }, [uploads]);

  // ── §3 등록 제출
  // 실패 토스트의 '다시 시도'가 자기 자신을 다시 호출한다 — 자기 참조라 타입을 명시한다
  const handleSubmit: () => void = useCallback(() => {
    if (busy) return; // 중복 제출 차단(§5.3 규칙 4)
    setPageAlert(null);

    // (d) 이미지 업로드 진행 중 제출 — 서버 요청 없이 안내
    if (uploads.isUploading) {
      setPageAlert({ tone: 'info', message: UPLOAD_IN_PROGRESS_MESSAGE });
      return;
    }

    // (a) 클라이언트 유효성 위반 — 서버 요청 없이 인라인 에러 + 첫 위반 필드 포커스(§5.2)
    const nextErrors = validateAll(values, uploadedCount);
    setErrors(nextErrors);
    const first = firstErrorField(nextErrors, FIELD_ORDER);
    if (first !== null) {
      focusField(first);
      return;
    }

    setSubmitting(true);
    void submitProduct({ values, imageIds }).then((result) => {
      setSubmitting(false);

      if (result.status === 'field-error') {
        // (b) 서버 필드 검증 실패 — 필드 코드를 인라인 에러로 매핑, 입력값 전부 유지
        const mapped: FieldErrors = { ...result.fieldErrors };
        setErrors(mapped);
        const firstServerField = firstErrorField(mapped, FIELD_ORDER);
        if (firstServerField !== null) focusField(firstServerField);
        return;
      }
      if (result.status === 'error') {
        // (c) 네트워크/서버 오류·타임아웃 — 입력값·업로드 이미지 전부 유지.
        // 실패 토스트는 자동으로 사라지지 않고 '다시 시도'를 들고 있다
        toast.error(SUBMIT_ERROR_MESSAGE, { retry: handleSubmit });
        return;
      }

      // 정상 — 성공 안내 + 폼 초기화(연속 등록) + 임시저장본 삭제 + dirty 해제(§3 등록-정상, §5.3 규칙 2)
      void deleteDraft().then(() => {
        setRestorePrompt(null);
      });
      resetForm();
      toast.success(SUBMIT_SUCCESS_MESSAGE);
    });
  }, [busy, focusField, imageIds, resetForm, toast, uploadedCount, uploads.isUploading, values]);

  // ── §3.2 임시저장
  const handleSaveDraft: () => void = useCallback(() => {
    if (busy) return; // 동시 요청 최대 1건(§5.3 규칙 4)
    setPageAlert(null);

    // 완화 검증(§5.2 검증 시점 규칙 3) — 위반 1건 이상이면 저장 요청을 보내지 않는다
    const nextErrors = validateForDraft(values, uploadedCount);
    setErrors(nextErrors);
    const first = firstErrorField(nextErrors, FIELD_ORDER);
    if (first !== null) {
      focusField(first);
      return;
    }

    setSavingDraft(true);
    const snapshotValues = values;
    const snapshotImages = uploads.uploadedRefs;
    void saveDraft(snapshotValues, snapshotImages).then((result) => {
      setSavingDraft(false);
      if (result.status === 'error') {
        toast.error(DRAFT_SAVE_ERROR_MESSAGE, { retry: handleSaveDraft });
        return;
      }
      // dirty 해제(§3.2 저장 성공). 진입 시 안내(restorePrompt)는 이미 해소된 상태이므로 되살리지 않는다.
      setBaseline(
        serialize(
          snapshotValues,
          snapshotImages.map((ref) => ref.id),
        ),
      );
      toast.success(`임시저장되었습니다. (${formatTime(result.savedAt)})`);
    });
  }, [busy, focusField, toast, uploadedCount, uploads.uploadedRefs, values]);

  // ── §3.2 복원 실행 / 복원 거부
  /** 임시저장본을 실제로 적용한다 (덮어쓰기 확인을 통과한 뒤) */
  const applyRestore = useCallback(() => {
    if (restorePrompt === null) return;

    setValues(restorePrompt.values);
    uploads.restore(restorePrompt.images);
    setErrors({});
    setBaseline(
      serialize(
        restorePrompt.values,
        restorePrompt.images.map((ref) => ref.id),
      ),
    );
    setRestorePrompt(null);
    setConfirmingRestore(false);
    setPageAlert(null);
    toast.success('임시저장본을 불러왔습니다.');
  }, [restorePrompt, toast, uploads]);

  const handleRestore = useCallback(() => {
    if (restorePrompt === null) return;
    // 이미 입력을 시작한 상태(dirty)면 덮어쓰기 확인을 거친다 — 취소 시 안내 Alert 유지(§3.2 복원 실행).
    // window.confirm 이 아니라 공통 ConfirmDialog 를 쓴다 (앱 전체가 같은 확인 창을 쓴다).
    if (isDirty) {
      setConfirmingRestore(true);
      return;
    }
    applyRestore();
  }, [applyRestore, isDirty, restorePrompt]);

  const handleDiscardDraft: () => void = useCallback(() => {
    // §3.2 복원 거부 — 임시저장본 삭제. 실패 시 Alert(danger) + 안내 Alert 유지
    void deleteDraft().then((result) => {
      if (result.status === 'error') {
        toast.error(DRAFT_DELETE_ERROR_MESSAGE, { retry: handleDiscardDraft });
        return;
      }
      setRestorePrompt(null);
    });
  }, [toast]);

  // 카테고리의 로딩/실패/빈 상태 파생은 <CategorySection/> 이 categoryState 를 받아 안에서 계산한다
  const nameError = errors.name;
  const descriptionError = errors.description;
  const priceError = errors.price;
  const stockError = errors.stock;
  const categoryError = errors.categoryId;
  const imageError = errors.images;

  const priceDisplay = editingNumber === 'price' ? values.price : formatThousands(values.price);
  const stockDisplay = editingNumber === 'stock' ? values.stock : formatThousands(values.stock);

  return (
    <section style={pageStyle} aria-labelledby="product-registration-title">
      {/* 인라인 style로 표현 불가한 상태(:focus-visible/::placeholder/스피너 keyframes) — 토큰 변수만 사용 */}
      <style>{SCOPED_CSS}</style>

      <div>
        <h1 id="product-registration-title" style={pageTitleStyle}>
          상품 등록
        </h1>
        <p style={pageDescriptionStyle}>새 상품 1건을 등록합니다. 별표(*) 항목은 필수입니다.</p>
      </div>

      {/* §3.2 복원 안내 */}
      {restorePrompt === null ? null : (
        <Alert
          tone="info"
          message={`임시저장된 상품이 있습니다. (저장 시각: ${formatDateTime(restorePrompt.savedAt)})`}
          actions={
            <>
              <Button variant="secondary" onClick={handleRestore} disabled={busy}>
                이어서 작성
              </Button>
              <Button variant="text" onClick={handleDiscardDraft} disabled={busy}>
                삭제하고 새로 작성
              </Button>
            </>
          }
        />
      )}

      {/* §3 등록-에러 (c)/(d) · §3.2 저장 성공/실패 · 등록 성공 안내 */}
      {pageAlert === null ? null : <Alert tone={pageAlert.tone} message={pageAlert.message} />}

      <form style={formStyle} onSubmit={handleFormSubmit} onKeyDown={handleFormKeyDown} noValidate>
        <BasicInfoSection
          values={values}
          nameError={nameError}
          descriptionError={descriptionError}
          busy={busy}
          fieldRefs={fieldRefs}
          onChangeValue={setFieldValue}
          onBlurValidate={handleBlurValidate}
        />

        {/* ── 가격 · 재고 — 같은 숫자 필드 규칙(천 단위 표시 · 숫자만 입력 · 포커스 시 원값) */}
        <NumberFieldSection
          sectionId="section-price"
          sectionTitle="가격"
          field="price"
          label="판매가 (원)"
          hint="100원 이상 100,000,000원 이하의 정수만 입력할 수 있습니다."
          display={priceDisplay}
          error={priceError}
          busy={busy}
          fieldRefs={fieldRefs}
          onFocusField={setEditingNumber}
          onChangeValue={setFieldValue}
          onBlurValidate={handleBlurValidate}
        />

        <NumberFieldSection
          sectionId="section-stock"
          sectionTitle="재고"
          field="stock"
          label="재고 수량"
          hint="0 이상 999,999 이하의 정수만 입력할 수 있습니다."
          display={stockDisplay}
          error={stockError}
          busy={busy}
          fieldRefs={fieldRefs}
          onFocusField={setEditingNumber}
          onChangeValue={setFieldValue}
          onBlurValidate={handleBlurValidate}
        />

        <CategorySection
          value={values.categoryId}
          error={categoryError}
          busy={busy}
          state={categoryState}
          fieldRefs={fieldRefs}
          onChangeValue={(next) => {
            setFieldValue('categoryId', next);
            setErrors((current) => {
              const rest = { ...current };
              delete rest.categoryId;
              return rest;
            });
          }}
          onBlurValidate={() => {
            handleBlurValidate('categoryId');
          }}
          onRetry={() => {
            loadCategories();
          }}
        />

        {/* ── 이미지 업로드 (§3.1) */}
        <FormSection titleId="section-images" title="상품 이미지">
          <Field
            id={FIELD_ID.images}
            label="상품 이미지"
            required
            error={imageError}
            asGroup
            counter={`${String(uploadedCount)}/5`}
          >
            <ImageUploadField
              uploads={uploads}
              disabled={busy}
              error={imageError}
              dropzoneId={FIELD_ID.images}
              hintId={`${FIELD_ID.images}-hint`}
              errorId={`${FIELD_ID.images}-error`}
              labelId={`${FIELD_ID.images}-label`}
            />
          </Field>
        </FormSection>

        {/* ── 이중 액션 (§5.3 규칙 1) */}
        <div style={actionsRowStyle}>
          <Button
            variant="secondary"
            onClick={handleSaveDraft}
            loading={savingDraft}
            disabled={submitting}
          >
            임시저장
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            loading={submitting}
            disabled={savingDraft}
          >
            등록
          </Button>
        </div>

        <p style={hintStyle}>
          {isDirty ? '저장되지 않은 변경 사항이 있습니다.' : '변경 사항이 모두 저장된 상태입니다.'}
        </p>
      </form>

      {/* §3.2 복원 실행 — 입력 중이면 덮어쓰기 확인 (현재 입력을 버리는 것이라 discard 다) */}
      {confirmingRestore && (
        <ConfirmDialog
          intent="discard"
          title="임시저장본으로 대체"
          message={RESTORE_CONFIRM_MESSAGE}
          confirmLabel="대체하기"
          busy={false}
          onConfirm={applyRestore}
          onCancel={() => {
            setConfirmingRestore(false);
          }}
        />
      )}

      {/* 저장하지 않은 채 화면을 떠나려 하면 discard 확인이 뜬다 */}
      {unsavedDialog}
    </section>
  );
}
