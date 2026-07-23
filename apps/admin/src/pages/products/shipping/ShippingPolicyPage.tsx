// ShippingPolicyPage — 배송 정책 (라우트: /products/shipping)
//
// 목록형이 아니라 정책 설정형: 문서 1건을 불러와 고치고 저장한다(회사 정보 화면과 같은 단일 문서형
// 껍데기 재사용). 저장은 토스트, 필드 오류는 인라인, 저장하지 않은 이탈은 가드가 막는다.
//
// [화면에 표가 하나 붙었다 — 택배사] 정책 문서 아래에 택배사 CRUD 섹션이 선다(CarrierSection).
// 별도 메뉴로 만들지 않은 이유와 자유 입력을 없앤 이유는 그 파일의 머리말에 적었다. 여기서 달라진
// 것은 하나다: '택배사' 필드가 텍스트 입력이 아니라 **등록된 목록에서 고르는 select** 가 됐고,
// 그 값이 배송 처리 화면에서 송장을 붙일 때의 기본 선택이 된다.
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
  formRowStyle,
  hintStyle,
  SelectField,
  ToggleSwitch,
  useToast,
} from '../../../shared/ui';
import {
  DocumentFormShell,
  useCrudListQuery,
  useDocumentQuery,
  useSaveDocument,
} from '../../../shared/crud';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import {
  CARRIER_RESOURCE,
  carrierAdapter,
  shippingPolicyKey,
  shippingPolicyStore,
} from './data-source';
import { DEFAULT_SHIPPING_POLICY, SHIPPING_FEE_OPTIONS } from './types';
import { shippingPolicySchema } from './validation';
import type { ShippingPolicyValues } from './validation';
import { CarrierSection } from './components/CarrierSection';
import { cssVar } from '@tds/ui';

const UNSAVED_MESSAGE =
  '배송 정책에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

/** 정책 카드와 택배사 카드 사이 — DocumentFormShell 안쪽의 세로 간격과 같은 리듬 */
const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

export default function ShippingPolicyPage() {
  const toast = useToast();
  /* [EXC-03] 택배사 섹션의 추가·수정·삭제는 각자 권한에 묶인다. 정책 폼 자체의 게이팅은
     DocumentFormShell 이 이미 한다(update 권한이 없으면 403). */
  const { canCreate, canUpdate, canRemove } = useRouteWritePermissions();
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

  /* 선택지는 택배사 표와 **같은 조회**를 읽는다 — 방금 추가한 택배사가 곧바로 선택지에 뜬다.
     별도 조회를 만들면 한쪽만 새로고침되어 '표에는 있는데 고를 수 없는' 택배사가 생긴다. */
  const carrierList = useCrudListQuery(CARRIER_RESOURCE, carrierAdapter);
  const carriers = carrierList.data ?? [];

  const loading = isFetching && data === undefined;
  const disabled = saving || loading;
  const feeType = watch('feeType');
  const bundleShipping = watch('bundleShipping');
  const defaultCarrierId = watch('defaultCarrierId');
  /* 끈 택배사도 **지금 값이면** 선택지에 남긴다. 빼 버리면 select 가 조용히 첫 항목으로 튀어
     운영자가 건드리지도 않은 정책이 저장 시 바뀐다. */
  const carrierOptions = carriers.filter(
    (carrier) => carrier.active || carrier.id === defaultCarrierId,
  );

  const onValid = (values: ShippingPolicyValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    save.mutate(
      { input: values, signal: controller.signal },
      {
        onSuccess: () => {
          reset(values);
          toast.success('배송 정책을 저장했어요.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  return (
    <div style={pageStyle}>
      <DocumentFormShell
        cardTitle="배송 정책"
        description="별표(*) 항목은 필수예요. 저장하면 스토어 전체 배송비 계산에 반영돼요."
        loading={loading}
        loadFailed={error !== null}
        onRetry={() => void refetch()}
        serverError={serverError}
        saving={saving}
        dirty={isDirty}
        unsavedMessage={UNSAVED_MESSAGE}
        onSubmit={(event) => void handleSubmit(onValid)(event)}
      >
        <div style={formRowStyle}>
          <FormField
            htmlFor="ship-carrier"
            label="기본 택배사"
            required
            error={errors.defaultCarrierId?.message}
            hint="이 스토어의 대표 택배사예요. 정책 안내 문구가 이 이름을 인용해요."
          >
            <SelectField
              id="ship-carrier"
              disabled={disabled || carrierOptions.length === 0}
              isInvalid={errors.defaultCarrierId !== undefined}
              aria-invalid={errors.defaultCarrierId !== undefined}
              aria-describedby={
                errors.defaultCarrierId !== undefined ? errorIdOf('ship-carrier') : undefined
              }
              {...register('defaultCarrierId')}
            >
              {/* 목록이 비면 고를 것이 없다는 사실을 선택지 자체가 말한다 — 빈 select 는 침묵한다 */}
              {carrierOptions.length === 0 ? (
                <option value="">등록된 택배사가 없어요</option>
              ) : (
                carrierOptions.map((carrier) => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.active ? carrier.name : `${carrier.name} (미사용)`}
                  </option>
                ))
              )}
            </SelectField>
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

        <div style={formRowStyle}>
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

        <div style={formRowStyle}>
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

        {carrierList.error !== null && (
          <p style={hintStyle}>
            택배사 목록을 불러오지 못해 기본 택배사를 고를 수 없어요. 아래 표에서 다시 시도해
            주세요.
          </p>
        )}
      </DocumentFormShell>

      {/* 택배사 표는 폼 **밖**에 선다 — 안에 두면 <form> 안에 폼 모달의 <form> 이 겹친다.
          정책 폼과 별개의 저장소를 쓰므로 저장 버튼도 서로를 건드리지 않는다.

          canUpdate 로 함께 잠그는 이유: 이 권한이 없으면 위의 DocumentFormShell 이 화면 전체를
          403 으로 바꾼다. 그 아래에 표만 남겨 두면 '거부됨' 과 편집 가능한 표가 한 화면에 선다. */}
      {canUpdate && (
        <CarrierSection canCreate={canCreate} canUpdate={canUpdate} canRemove={canRemove} />
      )}
    </div>
  );
}
