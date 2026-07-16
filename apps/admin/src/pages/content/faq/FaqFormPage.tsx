// FaqFormPage — FAQ 등록/수정 (라우트: /content/faq/new · /content/faq/:id/edit) · A41 소유
//
// 하나의 폼이 등록과 수정을 겸한다(:id 유무로 갈린다). 폼 = RHF + zod/mini.
// 답변은 리치 텍스트를 도입하지 않는다 — 제어 textarea(TextareaField, 카운터 포함).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  FormField,
  pageTitleStyle,
  SelectField,
  TextareaField,
  useToast,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import {
  useCreateFaq,
  useFaqCategoriesQuery,
  useFaqQuery,
  useNextFaqOrder,
  useUpdateFaq,
} from './queries';
import { ANSWER_MAX_LENGTH, QUESTION_MAX_LENGTH } from './types';
import { faqSchema } from './validation';
import type { FaqFormValues } from './validation';

const UNSAVED_MESSAGE =
  'FAQ 에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

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

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 8), 1fr))',
  gap: 'var(--tds-space-4)',
};

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

const checkStyle: CSSProperties = {
  width: 'var(--tds-space-4)',
  height: 'var(--tds-space-4)',
  accentColor: 'var(--tds-color-action-primary-default)',
  cursor: 'pointer',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

const EMPTY: FaqFormValues = {
  question: '',
  categoryId: '',
  answer: '',
  visible: true,
  order: '',
};

export default function FaqFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<FaqFormValues>({
    resolver: zodResolver(faqSchema),
    defaultValues: EMPTY,
  });

  const { data: categories } = useFaqCategoriesQuery();
  const createFaq = useCreateFaq();
  const updateFaq = useUpdateFaq();
  const saving = createFaq.isPending || updateFaq.isPending;

  const detailQuery = useFaqQuery(id ?? '');
  const loadingDetail = isEdit && detailQuery.isFetching && detailQuery.data === undefined;
  const disabled = saving || loadingDetail;
  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const loaded = detailQuery.data;
  useEffect(() => {
    if (loaded === undefined) return;
    reset({
      question: loaded.question,
      categoryId: loaded.categoryId,
      answer: loaded.answer,
      visible: loaded.visible,
      order: String(loaded.order),
    });
  }, [loaded, reset]);

  // 정렬 순서 자동 채움 — 새 등록이면 현재 최대 + 1 을 기본값으로(사용자는 수정 가능).
  const nextOrderQuery = useNextFaqOrder(!isEdit);
  const orderPrefilledRef = useRef(false);
  useEffect(() => {
    if (isEdit || orderPrefilledRef.current || nextOrderQuery.data === undefined) return;
    orderPrefilledRef.current = true;
    setValue('order', String(nextOrderQuery.data));
  }, [isEdit, nextOrderQuery.data, setValue]);

  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const answer = watch('answer');
  const visible = watch('visible');

  const onValid = (values: FaqFormValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    const input = {
      question: values.question,
      categoryId: values.categoryId,
      answer: values.answer,
      visible: values.visible,
      order: Number(values.order.trim()),
    };

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    };

    if (isEdit && id !== undefined) {
      updateFaq.mutate(
        { id, input, signal: controller.signal },
        {
          onSuccess: () => {
            toast.success('FAQ 를 저장했습니다.');
            navigate(`/content/faq/${id}`, { replace: true });
          },
          onError,
        },
      );
      return;
    }

    createFaq.mutate(
      { input, signal: controller.signal },
      {
        onSuccess: () => {
          toast.success('FAQ 를 등록했습니다.');
          navigate('/content/faq', { replace: true });
        },
        onError,
      },
    );
  };

  if (isEdit && detailQuery.error !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <span>FAQ 를 불러오지 못했습니다. </span>
          <Button variant="secondary" onClick={() => navigate('/content/faq')}>
            목록으로
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div>
        <h1 style={pageTitleStyle}>{isEdit ? 'FAQ 수정' : 'FAQ 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 노출을 끄면 사용자 화면에서 숨겨집니다.
        </p>
      </div>

      <form onSubmit={(event) => void handleSubmit(onValid)(event)} noValidate>
        <Card>
          <CardTitle>FAQ 정보</CardTitle>

          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <div style={bodyStyle}>
            <FormField
              htmlFor="faq-question"
              label="질문"
              required
              error={errors.question?.message}
            >
              <input
                id="faq-question"
                type="text"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(errors.question !== undefined)}
                maxLength={QUESTION_MAX_LENGTH}
                placeholder="예: 비밀번호를 잊어버렸어요"
                disabled={disabled}
                aria-invalid={errors.question !== undefined}
                aria-describedby={
                  errors.question !== undefined ? errorIdOf('faq-question') : undefined
                }
                {...register('question')}
              />
            </FormField>

            <div style={rowStyle}>
              <FormField
                htmlFor="faq-category"
                label="카테고리"
                required
                error={errors.categoryId?.message}
              >
                <SelectField
                  id="faq-category"
                  isInvalid={errors.categoryId !== undefined}
                  disabled={disabled}
                  aria-invalid={errors.categoryId !== undefined}
                  aria-describedby={
                    errors.categoryId !== undefined ? errorIdOf('faq-category') : undefined
                  }
                  {...register('categoryId')}
                >
                  <option value="">카테고리를 선택하세요</option>
                  {(categories ?? []).map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>

              <FormField
                htmlFor="faq-order"
                label="정렬 순서"
                required
                error={errors.order?.message}
                hint="작을수록 위에 노출됩니다."
              >
                <input
                  id="faq-order"
                  type="number"
                  min={0}
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.order !== undefined)}
                  disabled={disabled}
                  aria-invalid={errors.order !== undefined}
                  aria-describedby={errors.order !== undefined ? errorIdOf('faq-order') : undefined}
                  {...register('order')}
                />
              </FormField>
            </div>

            <div style={checkboxRowStyle}>
              <input
                id="faq-visible"
                type="checkbox"
                className="tds-ui-focusable"
                style={checkStyle}
                checked={visible}
                disabled={disabled}
                onChange={(event) =>
                  setValue('visible', event.target.checked, { shouldDirty: true })
                }
              />
              <label htmlFor="faq-visible" style={fieldLabelStyle}>
                사용자 화면에 노출
              </label>
            </div>

            <TextareaField
              label="답변"
              required
              value={answer}
              onChange={(value) =>
                setValue('answer', value, { shouldValidate: false, shouldDirty: true })
              }
              maxLength={ANSWER_MAX_LENGTH}
              disabled={disabled}
              error={errors.answer?.message}
              placeholder="답변 내용을 입력하세요."
            />
          </div>

          <div style={actionsStyle}>
            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => navigate(-1)}
            >
              취소
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={disabled}>
              {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
            </Button>
          </div>
        </Card>
      </form>

      {unsavedDialog}
    </div>
  );
}
