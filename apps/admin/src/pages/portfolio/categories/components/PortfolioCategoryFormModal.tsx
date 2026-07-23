// 포트폴리오 카테고리 등록/수정 모달
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 Modal 을 재사용한다. 하나의 모달이 등록과 수정을
// 겸한다(editing 유무로 갈린다). 쓰기 배선은 승격된 CRUD 프레임워크의 저수준 훅(useCrudCreate/Update)이다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../../shared/async';
import { zodResolver } from '../../../../shared/form/zodResolver';
import { useCrudCreate, useCrudUpdate } from '../../../../shared/crud';
import {
  useRouteCanSubmitForm,
  WRITE_DENIED,
} from '../../../../shared/permissions/RequirePermission';
import {
  Alert,
  Button,
  controlStyle,
  errorIdOf,
  FormField,
  Modal,
  useModalDirtyGuard,
} from '../../../../shared/ui';
import { CATEGORY_RESOURCE, portfolioCategoryAdapter } from '../data-source';
import { CATEGORY_NAME_MAX } from '../types';
import type { PortfolioCategoryUsage } from '../../_shared/store';
import { portfolioCategorySchema } from '../validation';
import type { PortfolioCategoryFormValues } from '../validation';
import { cssVar } from '@tds/ui';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

interface PortfolioCategoryFormModalProps {
  /** 수정 대상 — null 이면 등록 */
  readonly editing: PortfolioCategoryUsage | null;
  readonly onClose: () => void;
  readonly onSaved: (name: string, isEdit: boolean) => void;
}

export function PortfolioCategoryFormModal({
  editing,
  onClose,
  onSaved,
}: PortfolioCategoryFormModalProps) {
  const isEdit = editing !== null;

  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<PortfolioCategoryFormValues>({
    resolver: zodResolver(portfolioCategorySchema),
    defaultValues: { name: editing?.label ?? '' },
  });

  const create = useCrudCreate(CATEGORY_RESOURCE, portfolioCategoryAdapter);
  const update = useCrudUpdate(CATEGORY_RESOURCE, portfolioCategoryAdapter);
  const saving = create.isPending || update.isPending;

  /**
   * [FEEDBACK-06] 입력이 있는 채로 닫으려 하면 확인을 세운다. requestClose 를 Modal.onClose 와
   * 취소 버튼에 **둘 다** 넘겨 4경로(Esc·딤 클릭·×·취소)를 한 번에 덮는다.
   */
  const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose);

  const [serverError, setServerError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  /**
   * 이 팝업은 부모의 판정을 물려받지 않는다.
   *
   * 부모(목록)는 권한이 없으면 여는 버튼(등록 CTA·연필)을 만들지 않는다. 그러나 그것은 '열리지
   * 않는다' 는 보장일 뿐 '저장되지 않는다' 는 보장이 아니다 — 열려 있는 동안 다른 탭에서 강등되면
   * 부모의 판정은 이미 지나간 과거다. 그래서 같은 술어를 여기서 다시 읽는다: 등록이면 create,
   * 수정이면 update — 폼 라우트와 **같은 한 벌**(useRouteCanSubmitForm)이다.
   */
  const canSubmit = useRouteCanSubmitForm(isEdit);

  const onValid = (values: PortfolioCategoryFormValues) => {
    if (!canSubmit) {
      setServerError(isEdit ? WRITE_DENIED.update : WRITE_DENIED.create);
      return;
    }
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    const name = values.name.trim();

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    };

    if (isEdit && editing !== null) {
      update.mutate(
        { id: editing.id, input: { name }, signal: controller.signal },
        { onSuccess: () => onSaved(name, true), onError },
      );
      return;
    }

    create.mutate(
      { input: { name }, signal: controller.signal },
      { onSuccess: () => onSaved(name, false), onError },
    );
  };

  const nameField = register('name');
  const invalid = errors.name !== undefined;

  return (
    <>
      <Modal
        title={isEdit ? '카테고리 수정' : '카테고리 추가'}
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
            <Button variant="primary" size="md" type="submit" disabled={saving}>
              {saving ? '저장 중…' : isEdit ? '저장' : '추가'}
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          <FormField
            htmlFor="portfolio-category-name"
            label="카테고리 이름"
            required
            error={errors.name?.message}
          >
            <input
              id="portfolio-category-name"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(invalid)}
              maxLength={CATEGORY_NAME_MAX}
              placeholder="예: 주거 공간"
              disabled={saving}
              aria-invalid={invalid}
              aria-describedby={invalid ? errorIdOf('portfolio-category-name') : undefined}
              name={nameField.name}
              ref={(element) => {
                nameField.ref(element);
                nameRef.current = element;
              }}
              onChange={nameField.onChange}
              onBlur={nameField.onBlur}
            />
          </FormField>
        </div>
      </Modal>

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
