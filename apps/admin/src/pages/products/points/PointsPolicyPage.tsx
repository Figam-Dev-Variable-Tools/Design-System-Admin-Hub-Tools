// PointsPolicyPage — 적립금 정책 (라우트: /products/points) · A41 소유
//
// 정책 설정형: 문서 1건을 불러와 고치고 저장한다(회사 정보 화면과 같은 단일 문서형 껍데기 재사용).
// 회원 상세의 PointsCard(개별 잔액)와는 별개 — 여기는 적립 기준·사용조건·유효기간 **정책**이다.
//
// [상품별 적립과의 경계 — 이 화면이 남아 있는 이유]
// 적립률은 상품별로 갈라졌다(상품 폼의 '적립금' 카드 — 상품마다 정률/정액/미적용). 하지만 이 화면의
// 나머지 다섯 가지는 **상품에 속하지 않는다**:
//   · 회원가입 적립금 — 가입 시점의 지급이라 상품이 없다
//   · 최소 사용 포인트 · 사용 단위 · 1회 사용 한도 — 주문 단위의 '사용' 규칙이다(적립이 아니다)
//   · 유효기간 — 적립된 포인트의 소멸 규칙이라 어느 상품에서 왔는지와 무관하다
// 그래서 여기 '기본 적립률'은 **새 상품의 초기값**(DEFAULT_POINTS)으로 남고, 상품이 그 값을 자기
// 사정에 맞게 덮어쓴다. 배송(전역 배송 정책 ↔ 상품별 배송 카드)과 정확히 같은 구조다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { controlStyle, errorIdOf, FormField, SelectField, useToast } from '../../../shared/ui';
import { DocumentFormShell, useDocumentQuery, useSaveDocument } from '../../../shared/crud';
import { pointsPolicyKey, pointsPolicyStore } from './data-source';
import { DEFAULT_POINTS_POLICY, EARN_BASELINE_OPTIONS } from './types';
import { pointsPolicySchema } from './validation';
import type { PointsPolicyValues } from './validation';

const UNSAVED_MESSAGE =
  '적립금 정책에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 6), 1fr))',
  gap: 'var(--tds-space-4)',
};

interface NumberFieldSpec {
  readonly name: keyof PointsPolicyValues;
  readonly id: string;
  readonly label: string;
  readonly placeholder: string;
  readonly hint?: string;
}

const NUMBER_FIELDS: readonly NumberFieldSpec[] = [
  {
    name: 'earnRate',
    id: 'pts-earn-rate',
    label: '기본 적립률 (%)',
    placeholder: '예: 1',
    hint: '새 상품의 초기 적립률입니다. 상품별 적립 설정이 이 값을 덮어씁니다.',
  },
  { name: 'signupBonus', id: 'pts-signup', label: '회원가입 적립금 (원)', placeholder: '예: 3000' },
  {
    name: 'minUseAmount',
    id: 'pts-min-use',
    label: '최소 사용 포인트 (P)',
    placeholder: '예: 5000',
  },
  { name: 'useUnit', id: 'pts-use-unit', label: '사용 단위 (P)', placeholder: '예: 100' },
  {
    name: 'maxUseRate',
    id: 'pts-max-rate',
    label: '1회 사용 한도 (%)',
    placeholder: '예: 50',
    hint: '주문금액 대비 사용 상한',
  },
  { name: 'expireMonths', id: 'pts-expire', label: '유효기간 (개월)', placeholder: '예: 12' },
] as const;

export default function PointsPolicyPage() {
  const toast = useToast();
  const { data, isFetching, error, refetch } = useDocumentQuery(pointsPolicyKey, pointsPolicyStore);
  const save = useSaveDocument(pointsPolicyKey, pointsPolicyStore);
  const saving = save.isPending;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<PointsPolicyValues>({
    resolver: zodResolver(pointsPolicySchema),
    defaultValues: DEFAULT_POINTS_POLICY,
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (data === undefined) return;
    reset(data);
  }, [data, reset]);

  const loading = isFetching && data === undefined;
  const disabled = saving || loading;

  const onValid = (values: PointsPolicyValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    save.mutate(
      { input: values, signal: controller.signal },
      {
        onSuccess: () => {
          reset(values);
          toast.success('적립금 정책을 저장했습니다.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  return (
    <DocumentFormShell
      cardTitle="적립금 정책"
      description="별표(*) 항목은 필수입니다. 적립률은 상품별로 설정하며, 여기서는 새 상품의 기본 적립률과 적립금 사용·소멸 규칙을 정합니다."
      loading={loading}
      loadFailed={error !== null}
      onRetry={() => void refetch()}
      serverError={serverError}
      saving={saving}
      dirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={(event) => void handleSubmit(onValid)(event)}
    >
      <FormField htmlFor="pts-baseline" label="적립 기준" required>
        <SelectField id="pts-baseline" disabled={disabled} {...register('earnBaseline')}>
          {EARN_BASELINE_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
      </FormField>

      <div style={rowStyle}>
        {NUMBER_FIELDS.map((spec) => {
          const fieldError = errors[spec.name]?.message;
          return (
            <FormField
              key={spec.name}
              htmlFor={spec.id}
              label={spec.label}
              required
              error={fieldError}
              hint={spec.hint}
            >
              <input
                id={spec.id}
                type="text"
                inputMode="numeric"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(fieldError !== undefined)}
                placeholder={spec.placeholder}
                disabled={disabled}
                aria-invalid={fieldError !== undefined}
                aria-describedby={fieldError !== undefined ? errorIdOf(spec.id) : undefined}
                {...register(spec.name)}
              />
            </FormField>
          );
        })}
      </div>
    </DocumentFormShell>
  );
}
