// 택배사 등록/수정 모달
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 Modal 을 재사용한다. 하나의 모달이 등록과 수정을
// 겸한다(editing 유무로 갈린다). 쓰기 배선은 CRUD 프레임워크의 저수준 훅(useCrudCreate/Update)이다.
//
// [코드는 수정할 수 있게 열어 둔다] 오타로 등록한 코드를 고칠 길이 없으면 운영자는 택배사를 하나
// 더 만든다 — 유한 집합으로 좁힌 이유가 그 순간 사라진다. 대신 이미 나간 배송 건은 carrierId 를
// 가리키므로 코드를 고쳐도 과거 기록이 끊기지 않는다(도메인 머리말: 식별자는 id 다).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { cssVar } from '@tds/ui';

import { isAbort } from '../../../../shared/async';
import { zodResolver } from '../../../../shared/form/zodResolver';
import {
  useRouteCanSubmitForm,
  WRITE_DENIED,
} from '../../../../shared/permissions/RequirePermission';
import { useCrudCreate, useCrudUpdate } from '../../../../shared/crud';
import {
  Alert,
  Button,
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  Modal,
  ToggleSwitch,
  useModalDirtyGuard,
} from '../../../../shared/ui';
import { CARRIER_CODE_MAX, CARRIER_NAME_MAX } from '../../../../shared/domain/shipment';
import type { Carrier } from '../../../../shared/domain/shipment';
import { CARRIER_RESOURCE, carrierAdapter } from '../data-source';
import { TRACKING_TEMPLATE_HINT } from '../types';
import { carrierSchema } from '../validation';
import type { CarrierFormValues } from '../validation';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const EMPTY: CarrierFormValues = {
  name: '',
  code: '',
  trackingUrlTemplate: '',
  active: true,
};

interface CarrierFormModalProps {
  /** 수정 대상 — null 이면 등록 */
  readonly editing: Carrier | null;
  readonly onClose: () => void;
  readonly onSaved: (name: string, isEdit: boolean) => void;
}

export function CarrierFormModal({ editing, onClose, onSaved }: CarrierFormModalProps) {
  const isEdit = editing !== null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<CarrierFormValues>({
    resolver: zodResolver(carrierSchema),
    defaultValues:
      editing === null
        ? EMPTY
        : {
            name: editing.name,
            code: editing.code,
            trackingUrlTemplate: editing.trackingUrlTemplate,
            active: editing.active,
          },
  });

  const create = useCrudCreate(CARRIER_RESOURCE, carrierAdapter);
  const update = useCrudUpdate(CARRIER_RESOURCE, carrierAdapter);
  const saving = create.isPending || update.isPending;

  // [FEEDBACK-06] 입력이 있는 채로 닫으려 하면 확인을 세운다 — Esc·딤·×·취소 4경로를 함께 덮는다.
  const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose);

  const [serverError, setServerError] = useState<string | null>(null);

  /**
   * [EXC-03] 이 팝업은 **부모의 판정을 물려받지 않는다.**
   *
   * 부모(배송 정책 화면)는 권한이 없으면 여는 버튼('택배사 추가'·연필)을 만들지 않는다. 그러나
   * 그것은 '열리지 않는다' 는 보장일 뿐 '저장되지 않는다' 는 보장이 아니다 — 열려 있는 동안 다른
   * 탭에서 강등되면 부모의 판정은 이미 지나간 과거다. 등록이면 create, 수정이면 update —
   * 폼 라우트·다른 팝업과 **같은 한 벌**(useRouteCanSubmitForm)이다.
   */
  const canSubmit = useRouteCanSubmitForm(isEdit);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const active = watch('active');

  const onValid = (values: CarrierFormValues) => {
    if (!canSubmit) {
      setServerError(isEdit ? WRITE_DENIED.update : WRITE_DENIED.create);
      return;
    }
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    // 저장 전에 다듬는다 — ' 가상택배 ' 가 그대로 들어가면 이름이 두 벌이 된다(FS-043 미결 17번).
    const input = {
      name: values.name.trim(),
      code: values.code.trim(),
      trackingUrlTemplate: values.trackingUrlTemplate.trim(),
      active: values.active,
    };

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    };

    if (editing !== null) {
      update.mutate(
        { id: editing.id, input, signal: controller.signal },
        { onSuccess: () => onSaved(input.name, true), onError },
      );
      return;
    }

    create.mutate(
      { input, signal: controller.signal },
      { onSuccess: () => onSaved(input.name, false), onError },
    );
  };

  const nameField = register('name');
  const nameInvalid = errors.name !== undefined;
  const codeInvalid = errors.code !== undefined;
  const templateInvalid = errors.trackingUrlTemplate !== undefined;

  return (
    <>
      <Modal
        title={isEdit ? '택배사 수정' : '택배사 추가'}
        onClose={requestClose}
        onSubmit={() => {
          setServerError(null);
          clearErrors();
          void handleSubmit(onValid, () => nameRef.current?.focus())();
        }}
        initialFocusRef={nameRef}
        footer={
          <>
            <Button variant="secondary" size="md" disabled={saving} onClick={requestClose}>
              취소
            </Button>
            {canSubmit && (
              <Button variant="primary" size="md" type="submit" disabled={saving}>
                {saving ? '저장 중…' : isEdit ? '저장' : '추가'}
              </Button>
            )}
          </>
        }
      >
        <div style={bodyStyle}>
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <FormField
            htmlFor="carrier-name"
            label="택배사 이름"
            required
            error={errors.name?.message}
          >
            <input
              id="carrier-name"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(nameInvalid)}
              maxLength={CARRIER_NAME_MAX}
              placeholder="예: 가상택배"
              disabled={saving}
              aria-invalid={nameInvalid}
              aria-describedby={nameInvalid ? errorIdOf('carrier-name') : undefined}
              name={nameField.name}
              ref={(element) => {
                nameField.ref(element);
                nameRef.current = element;
              }}
              onChange={nameField.onChange}
              onBlur={nameField.onBlur}
            />
          </FormField>

          <FormField
            htmlFor="carrier-code"
            label="택배사 코드"
            required
            error={errors.code?.message}
            hint="연동 키예요. 이름을 바꿔도 이 값은 그대로 둬요."
          >
            <input
              id="carrier-code"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(codeInvalid)}
              maxLength={CARRIER_CODE_MAX}
              placeholder="예: VIRTUAL"
              disabled={saving}
              aria-invalid={codeInvalid}
              aria-describedby={codeInvalid ? errorIdOf('carrier-code') : undefined}
              {...register('code')}
            />
          </FormField>

          <FormField
            htmlFor="carrier-tracking"
            label="추적 URL 템플릿"
            error={errors.trackingUrlTemplate?.message}
            hint={TRACKING_TEMPLATE_HINT}
          >
            <input
              id="carrier-tracking"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(templateInvalid)}
              placeholder="https://tracking.example.com/track?invoice={{invoice}}"
              disabled={saving}
              aria-invalid={templateInvalid}
              aria-describedby={templateInvalid ? errorIdOf('carrier-tracking') : undefined}
              {...register('trackingUrlTemplate')}
            />
          </FormField>

          <div style={fieldStyle}>
            <span style={fieldLabelStyle}>사용 여부</span>
            <ToggleSwitch
              checked={active}
              onChange={(next) => setValue('active', next, { shouldDirty: true })}
              disabled={saving}
              label="택배사 사용 여부"
              onLabel="사용"
              offLabel="미사용"
            />
          </div>
        </div>
      </Modal>

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
