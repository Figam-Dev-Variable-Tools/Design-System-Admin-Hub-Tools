// ShippingPolicyPage — 배송 정책 (라우트: /products/shipping)
//
// 목록형이 아니라 정책 설정형: 문서 1건을 불러와 고치고 저장한다(회사 정보 화면과 같은 단일 문서형
// 껍데기 재사용). 저장은 토스트, 필드 오류는 인라인, 저장하지 않은 이탈은 가드가 막는다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  SelectField,
  ToggleSwitch,
  useToast,
} from '../../../shared/ui';
import { DocumentFormShell, useDocumentQuery, useSaveDocument } from '../../../shared/crud';
import { shippingPolicyKey, shippingPolicyStore } from './data-source';
import { DEFAULT_SHIPPING_POLICY, SHIPPING_FEE_OPTIONS } from './types';
import { shippingPolicySchema } from './validation';
import type { ShippingPolicyValues } from './validation';

const UNSAVED_MESSAGE =
  '배송 정책에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 6), 1fr))',
  gap: 'var(--tds-space-4)',
};

export default function ShippingPolicyPage() {
  const toast = useToast();
  const { data, isFetching, error, refetch } = useDocumentQuery(
    shippingPolicyKey,
    shippingPolicyStore,
  );
  const save = useSaveDocument(shippingPolicyKey, shippingPolicyStore);
  const saving = save.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<ShippingPolicyValues>({
    resolver: zodResolver(shippingPolicySchema),
    defaultValues: DEFAULT_SHIPPING_POLICY,
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
  const feeType = watch('feeType');
  const bundleShipping = watch('bundleShipping');

  const onValid = (values: ShippingPolicyValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    save.mutate(
      { input: values, signal: controller.signal },
      {
        onSuccess: () => {
          reset(values);
          toast.success('배송 정책을 저장했습니다.');
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
      cardTitle="배송 정책"
      description="별표(*) 항목은 필수입니다. 저장하면 스토어 전체 배송비 계산에 반영됩니다."
      loading={loading}
      loadFailed={error !== null}
      onRetry={() => void refetch()}
      serverError={serverError}
      saving={saving}
      dirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={(event) => void handleSubmit(onValid)(event)}
    >
      <div style={rowStyle}>
        <FormField htmlFor="ship-carrier" label="택배사" required error={errors.carrier?.message}>
          <input
            id="ship-carrier"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.carrier !== undefined)}
            placeholder="예: 가상택배"
            disabled={disabled}
            aria-invalid={errors.carrier !== undefined}
            aria-describedby={errors.carrier !== undefined ? errorIdOf('ship-carrier') : undefined}
            {...register('carrier')}
          />
        </FormField>

        <FormField htmlFor="ship-fee-type" label="배송비 정책" required>
          <SelectField id="ship-fee-type" disabled={disabled} {...register('feeType')}>
            {SHIPPING_FEE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>
      </div>

      <div style={rowStyle}>
        {feeType !== 'free' && (
          <FormField
            htmlFor="ship-base-fee"
            label="기본 배송비 (원)"
            required
            error={errors.baseFee?.message}
          >
            <input
              id="ship-base-fee"
              type="text"
              inputMode="numeric"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.baseFee !== undefined)}
              placeholder="예: 3000"
              disabled={disabled}
              aria-invalid={errors.baseFee !== undefined}
              aria-describedby={
                errors.baseFee !== undefined ? errorIdOf('ship-base-fee') : undefined
              }
              {...register('baseFee')}
            />
          </FormField>
        )}

        {feeType === 'conditional' && (
          <FormField
            htmlFor="ship-free-threshold"
            label="무료배송 기준 (원)"
            required
            error={errors.freeThreshold?.message}
            hint="이 금액 이상 주문 시 무료배송"
          >
            <input
              id="ship-free-threshold"
              type="text"
              inputMode="numeric"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.freeThreshold !== undefined)}
              placeholder="예: 50000"
              disabled={disabled}
              aria-invalid={errors.freeThreshold !== undefined}
              aria-describedby={
                errors.freeThreshold !== undefined ? errorIdOf('ship-free-threshold') : undefined
              }
              {...register('freeThreshold')}
            />
          </FormField>
        )}
      </div>

      <div style={rowStyle}>
        <FormField
          htmlFor="ship-jeju"
          label="제주 추가배송비 (원)"
          required
          error={errors.jejuExtraFee?.message}
        >
          <input
            id="ship-jeju"
            type="text"
            inputMode="numeric"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.jejuExtraFee !== undefined)}
            placeholder="예: 3000"
            disabled={disabled}
            aria-invalid={errors.jejuExtraFee !== undefined}
            aria-describedby={
              errors.jejuExtraFee !== undefined ? errorIdOf('ship-jeju') : undefined
            }
            {...register('jejuExtraFee')}
          />
        </FormField>

        <FormField
          htmlFor="ship-island"
          label="도서산간 추가배송비 (원)"
          required
          error={errors.islandExtraFee?.message}
        >
          <input
            id="ship-island"
            type="text"
            inputMode="numeric"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.islandExtraFee !== undefined)}
            placeholder="예: 5000"
            disabled={disabled}
            aria-invalid={errors.islandExtraFee !== undefined}
            aria-describedby={
              errors.islandExtraFee !== undefined ? errorIdOf('ship-island') : undefined
            }
            {...register('islandExtraFee')}
          />
        </FormField>

        <FormField
          htmlFor="ship-return-fee"
          label="반품 배송비 (원)"
          required
          error={errors.returnFee?.message}
        >
          <input
            id="ship-return-fee"
            type="text"
            inputMode="numeric"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.returnFee !== undefined)}
            placeholder="예: 3000"
            disabled={disabled}
            aria-invalid={errors.returnFee !== undefined}
            aria-describedby={
              errors.returnFee !== undefined ? errorIdOf('ship-return-fee') : undefined
            }
            {...register('returnFee')}
          />
        </FormField>
      </div>

      <div style={fieldStyle}>
        <span style={fieldLabelStyle}>묶음배송</span>
        <ToggleSwitch
          checked={bundleShipping}
          onChange={(next) => setValue('bundleShipping', next, { shouldDirty: true })}
          disabled={disabled}
          label="묶음배송 사용 여부"
          onLabel="사용"
          offLabel="미사용"
        />
      </div>
    </DocumentFormShell>
  );
}
