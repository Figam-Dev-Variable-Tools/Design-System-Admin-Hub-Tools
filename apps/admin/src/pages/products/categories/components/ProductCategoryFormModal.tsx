// 상품 카테고리 등록/수정 모달
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
import { CATEGORY_RESOURCE, productCategoryAdapter } from '../data-source';
import { CATEGORY_NAME_MAX } from '../types';
import { listProductCategoryRoots } from '../../_shared/store';
import type { ProductCategoryUsage } from '../../_shared/store';
import { productCategorySchema } from '../validation';
import type { ProductCategoryFormValues } from '../validation';
import { cssVar, SelectField } from '@tds/ui';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

interface ProductCategoryFormModalProps {
  /** 수정 대상 — null 이면 등록 */
  readonly editing: ProductCategoryUsage | null;
  /** 등록 시 미리 고정할 상위 카테고리 — '하위 카테고리 추가' 로 열면 채워진다 */
  readonly presetParentId?: string | null;
  readonly onClose: () => void;
  readonly onSaved: (name: string, isEdit: boolean) => void;
}

export function ProductCategoryFormModal({
  editing,
  presetParentId = null,
  onClose,
  onSaved,
}: ProductCategoryFormModalProps) {
  const isEdit = editing !== null;

  /**
   * 상위로 고를 수 있는 것은 **1Depth 뿐**이다(2단계 제한). 수정 중이면 자기 자신과,
   * 하위를 가진 카테고리(옮기면 3단계가 된다)는 후보에서 뺀다.
   */
  const parentOptions = listProductCategoryRoots().filter(
    (candidate) => editing === null || candidate.id !== editing.id,
  );
  /** 하위를 이미 가진 대분류는 다른 대분류 밑으로 옮길 수 없다 — 상위 선택 자체를 잠근다 */
  const parentLocked = isEdit && editing.hasChildren;

  const {
    register,
    handleSubmit,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<ProductCategoryFormValues>({
    resolver: zodResolver(productCategorySchema),
    defaultValues: {
      name: editing?.label ?? '',
      parentId: editing?.parentId ?? presetParentId ?? '',
    },
  });

  const create = useCrudCreate(CATEGORY_RESOURCE, productCategoryAdapter);
  const update = useCrudUpdate(CATEGORY_RESOURCE, productCategoryAdapter);
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
   * 부모(카테고리 목록)는 권한이 없으면 여는 버튼('카테고리 추가'·연필)을 만들지 않는다. 그러나
   * 그것은 '열리지 않는다' 는 보장일 뿐 '저장되지 않는다' 는 보장이 아니다 — 열려 있는 동안
   * 다른 탭에서 강등되면 부모의 판정은 이미 지나간 과거다. 그래서 같은 술어를 여기서 다시 읽는다.
   * 등록이면 create, 수정이면 update — 폼 라우트와 **같은 한 벌**(useRouteCanSubmitForm)이다.
   */
  const canSubmit = useRouteCanSubmitForm(isEdit);

  const onValid = (values: ProductCategoryFormValues) => {
    if (!canSubmit) {
      setServerError(isEdit ? WRITE_DENIED.update : WRITE_DENIED.create);
      return;
    }
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    const name = values.name.trim();
    // 빈 문자열(셀렉트의 '없음')은 최상위를 뜻한다 — 저장소에는 null 로 넘긴다
    const parentId = values.parentId === '' ? null : values.parentId;

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
    };

    if (isEdit && editing !== null) {
      update.mutate(
        { id: editing.id, input: { name, parentId }, signal: controller.signal },
        { onSuccess: () => onSaved(name, true), onError },
      );
      return;
    }

    create.mutate(
      { input: { name, parentId }, signal: controller.signal },
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
            htmlFor="product-category-name"
            label="카테고리 이름"
            required
            error={errors.name?.message}
          >
            <input
              id="product-category-name"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(invalid)}
              maxLength={CATEGORY_NAME_MAX}
              placeholder="예: 아우터"
              disabled={saving}
              aria-invalid={invalid}
              aria-describedby={invalid ? errorIdOf('product-category-name') : undefined}
              name={nameField.name}
              ref={(element) => {
                nameField.ref(element);
                nameRef.current = element;
              }}
              onChange={nameField.onChange}
              onBlur={nameField.onBlur}
            />
          </FormField>

          {/* 상위 카테고리 — 없음이면 1Depth(대분류), 고르면 그 아래 2Depth(중분류)로 만들어진다 */}
          <FormField
            htmlFor="product-category-parent"
            label="상위 카테고리"
            hint={
              parentLocked
                ? '하위 카테고리가 있어 상위를 바꿀 수 없어요.'
                : '선택하지 않으면 대분류(1Depth)로 만들어져요. 카테고리는 2단계까지 만들 수 있어요.'
            }
          >
            <SelectField
              id="product-category-parent"
              disabled={saving || parentLocked}
              {...register('parentId')}
            >
              <option value="">없음 (대분류)</option>
              {parentOptions.map((parent) => (
                <option key={parent.id} value={parent.id}>
                  {parent.label}
                </option>
              ))}
            </SelectField>
          </FormField>
        </div>
      </Modal>

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
