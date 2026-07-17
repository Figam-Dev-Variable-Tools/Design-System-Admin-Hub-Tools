// 문의 유형 등록/수정 모달
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 Modal 을 재사용한다. 하나의 모달이 등록과 수정을
// 겸한다(editing 유무로 갈린다). 쓰기 배선은 CRUD 프레임워크 저수준 훅(useCrudCreate/Update)이다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../../shared/async';
import { zodResolver } from '../../../../shared/form/zodResolver';
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
import { CATEGORY_RESOURCE, supportCategoryAdapter } from '../data-source';
import { CATEGORY_LABEL_MAX } from '../../_shared/domain';
import type { SupportCategoryUsage } from '../../_shared/domain';
import { supportCategorySchema } from '../validation';
import type { SupportCategoryFormValues } from '../validation';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

interface CategoryFormModalProps {
  /** 수정 대상 — null 이면 등록 */
  readonly editing: SupportCategoryUsage | null;
  readonly onClose: () => void;
  readonly onSaved: (name: string, isEdit: boolean) => void;
}

export function CategoryFormModal({ editing, onClose, onSaved }: CategoryFormModalProps) {
  const isEdit = editing !== null;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<SupportCategoryFormValues>({
    resolver: zodResolver(supportCategorySchema),
    defaultValues: { label: editing?.label ?? '', active: editing?.active ?? true },
  });

  const create = useCrudCreate(CATEGORY_RESOURCE, supportCategoryAdapter);
  const update = useCrudUpdate(CATEGORY_RESOURCE, supportCategoryAdapter);
  const saving = create.isPending || update.isPending;

  /**
   * [FEEDBACK-06] 입력이 있는 채로 닫으려 하면 확인을 세운다. requestClose 를 Modal.onClose 와
   * 취소 버튼에 **둘 다** 넘겨 4경로(Esc·딤 클릭·×·취소)를 한 번에 덮는다.
   */
  const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose);

  const [serverError, setServerError] = useState<string | null>(null);
  const labelRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const onValid = (values: SupportCategoryFormValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    const label = values.label.trim();
    const input = { label, active: values.active };

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    };

    if (isEdit && editing !== null) {
      update.mutate(
        { id: editing.id, input, signal: controller.signal },
        { onSuccess: () => onSaved(label, true), onError },
      );
      return;
    }
    create.mutate(
      { input, signal: controller.signal },
      { onSuccess: () => onSaved(label, false), onError },
    );
  };

  const labelField = register('label');
  const invalid = errors.label !== undefined;
  const active = watch('active');

  return (
    <>
      <Modal
        title={isEdit ? '문의 유형 수정' : '문의 유형 추가'}
        onClose={requestClose}
        onSubmit={() => {
          setServerError(null);
          clearErrors();
          void handleSubmit(onValid, () => labelRef.current?.focus())();
        }}
        initialFocusRef={labelRef}
        footer={
          <>
            <Button variant="secondary" size="md" disabled={saving} onClick={requestClose}>
              취소
            </Button>
            <Button variant="primary" size="md" type="submit" disabled={saving}>
              {saving ? '저장 중…' : isEdit ? '저장' : '추가'}
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <FormField
            htmlFor="support-category-label"
            label="유형 이름"
            required
            error={errors.label?.message}
          >
            <input
              id="support-category-label"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(invalid)}
              maxLength={CATEGORY_LABEL_MAX}
              placeholder="예: 주문/결제"
              disabled={saving}
              aria-invalid={invalid}
              aria-describedby={invalid ? errorIdOf('support-category-label') : undefined}
              name={labelField.name}
              ref={(element) => {
                labelField.ref(element);
                labelRef.current = element;
              }}
              onChange={labelField.onChange}
              onBlur={labelField.onBlur}
            />
          </FormField>

          <div style={fieldStyle}>
            <span style={fieldLabelStyle}>사용여부</span>
            <ToggleSwitch
              checked={active}
              onChange={(next) => setValue('active', next, { shouldDirty: true })}
              disabled={saving}
              label="유형 사용여부"
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
