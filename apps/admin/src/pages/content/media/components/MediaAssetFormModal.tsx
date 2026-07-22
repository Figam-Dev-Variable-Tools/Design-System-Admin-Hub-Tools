// 미디어 업로드/수정 모달
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 Modal 을 재사용한다. 하나의 모달이 업로드와
// 수정을 겸한다(editing 유무로 갈린다).
//
// [파일은 실제로 올라가지 않는다 — 그 사실을 감추지 않는다]
// 백엔드가 없으므로 파일 선택 대신 **이름과 용량을 적는다.** 가짜 업로드 진행바를 그려 성공한
// 척하면, 백엔드가 붙은 날 '되던 것이 안 된다' 는 신고를 받는다. 지금 하는 일은 메타데이터를
// 등록하는 것뿐이고 안내 문구가 그렇게 말한다.
// TODO(backend): POST /api/uploads — 파일 선택으로 바뀌고 이 두 칸은 사라진다.
//
// [중복은 막지 않고 알린다] 같은 이름·크기가 이미 있으면 경고를 띄운다 — 개정본을 올리는 일은
// 정당하고, 막으면 운영자가 파일명을 무의미하게 비튼다(types.findDuplicate 머리말).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { cssVar, SelectField } from '@tds/ui';

import { isAbort } from '../../../../shared/async';
import { useCrudCreate, useCrudUpdate } from '../../../../shared/crud';
import { zodResolver } from '../../../../shared/form/zodResolver';
import {
  Alert,
  Button,
  controlStyle,
  errorIdOf,
  FormField,
  Modal,
  useModalDirtyGuard,
} from '../../../../shared/ui';
import {
  MEDIA_FOLDERS,
  MEDIA_PLACEHOLDER_URL,
  MEDIA_RESOURCE,
  MEDIA_UPLOADER,
  mediaAssetAdapter,
  stampNow,
} from '../data-source';
import {
  ALT_MAX,
  duplicateWarningMessage,
  extensionOf,
  findDuplicate,
  UNFILED_FOLDER_ID,
} from '../types';
import type { MediaAsset, MediaAssetInput } from '../types';
import { formatTags, mediaAssetSchema, parseTags } from '../validation';
import type { MediaAssetFormValues } from '../validation';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

interface MediaAssetFormModalProps {
  /** 지금 목록 — 중복 감지가 이것을 읽는다 */
  readonly assets: readonly MediaAsset[];
  /** 수정 대상 — null 이면 새로 등록 */
  readonly editing: MediaAsset | null;
  readonly onClose: () => void;
  readonly onSaved: (fileName: string, isEdit: boolean) => void;
}

export function MediaAssetFormModal({
  assets,
  editing,
  onClose,
  onSaved,
}: MediaAssetFormModalProps) {
  const isEdit = editing !== null;

  const {
    register,
    handleSubmit,
    watch,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<MediaAssetFormValues>({
    resolver: zodResolver(mediaAssetSchema),
    defaultValues: {
      fileName: editing?.fileName ?? '',
      sizeBytes: editing === null ? '' : String(editing.sizeBytes),
      folderId: editing?.folderId ?? UNFILED_FOLDER_ID,
      tags: editing === null ? '' : formatTags(editing.tags),
      alt: editing?.alt ?? '',
    },
  });

  const fileName = watch('fileName');
  const sizeBytes = watch('sizeBytes');

  /** 자기 자신은 중복이 아니다 — 수정 화면에서 이름을 그대로 둔 것을 경고하지 않는다 */
  const duplicate = findDuplicate(
    assets.filter((asset) => asset.id !== editing?.id),
    { fileName, sizeBytes: Number(sizeBytes.trim()) },
  );

  const create = useCrudCreate(MEDIA_RESOURCE, mediaAssetAdapter);
  const update = useCrudUpdate(MEDIA_RESOURCE, mediaAssetAdapter);
  const saving = create.isPending || update.isPending;

  const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose);

  const [serverError, setServerError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const onValid = (values: MediaAssetFormValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    const name = values.fileName.trim();
    const input: MediaAssetInput = {
      fileName: name,
      // 업로드가 없으므로 주소는 자리표시다 — 백엔드가 붙으면 응답 URL 이 온다
      url: editing?.url ?? MEDIA_PLACEHOLDER_URL,
      folderId: values.folderId,
      tags: parseTags(values.tags),
      alt: values.alt.trim(),
      sizeBytes: Number(values.sizeBytes.trim()),
      extension: extensionOf(name),
      uploadedAt: editing?.uploadedAt ?? stampNow(),
      uploader: editing?.uploader ?? MEDIA_UPLOADER,
    };

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    };

    if (editing !== null) {
      update.mutate(
        { id: editing.id, input, signal: controller.signal },
        { onSuccess: () => onSaved(name, true), onError },
      );
      return;
    }

    create.mutate(
      { input, signal: controller.signal },
      { onSuccess: () => onSaved(name, false), onError },
    );
  };

  const nameField = register('fileName');
  const nameInvalid = errors.fileName !== undefined;

  return (
    <>
      <Modal
        title={isEdit ? '파일 정보 수정' : '파일 등록'}
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
              {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          {serverError !== null && <Alert tone="danger">{serverError}</Alert>}

          {!isEdit && (
            <Alert tone="info">
              지금은 파일이 실제로 업로드되지 않습니다. 파일 정보(이름·용량·대체텍스트)만 등록되며,
              업로드 연결은 백엔드가 붙은 뒤 이어집니다.
            </Alert>
          )}

          {/* 막지 않는다 — 무엇이 겹치는지 알린다(types.findDuplicate 머리말) */}
          {duplicate !== null && <Alert tone="warning">{duplicateWarningMessage(duplicate)}</Alert>}

          <FormField
            htmlFor="media-file-name"
            label="파일 이름"
            required
            error={errors.fileName?.message}
            hint="확장자를 포함해 적습니다. 예: office-lobby.jpg"
          >
            <input
              id="media-file-name"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(nameInvalid)}
              placeholder="office-lobby.jpg"
              disabled={saving}
              aria-invalid={nameInvalid}
              aria-describedby={nameInvalid ? errorIdOf('media-file-name') : undefined}
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
            htmlFor="media-size"
            label="용량(바이트)"
            required
            error={errors.sizeBytes?.message}
            hint="백엔드가 붙으면 파일에서 자동으로 읽습니다."
          >
            <input
              id="media-size"
              type="number"
              min={1}
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.sizeBytes !== undefined)}
              placeholder="842100"
              disabled={saving}
              aria-invalid={errors.sizeBytes !== undefined}
              aria-describedby={
                errors.sizeBytes !== undefined ? errorIdOf('media-size') : undefined
              }
              {...register('sizeBytes')}
            />
          </FormField>

          <FormField htmlFor="media-folder" label="폴더">
            <SelectField id="media-folder" disabled={saving} {...register('folderId')}>
              {MEDIA_FOLDERS.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.label}
                </option>
              ))}
            </SelectField>
          </FormField>

          <FormField htmlFor="media-tags" label="태그" hint="쉼표로 구분합니다. 예: 로고, 브랜드">
            <input
              id="media-tags"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(false)}
              placeholder="로고, 브랜드"
              disabled={saving}
              {...register('tags')}
            />
          </FormField>

          <FormField
            htmlFor="media-alt"
            label="대체텍스트"
            required
            error={errors.alt?.message}
            hint="화면을 읽어 주는 사용자에게는 이 문장이 곧 이미지입니다."
          >
            <input
              id="media-alt"
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.alt !== undefined)}
              maxLength={ALT_MAX}
              placeholder="리모델링을 마친 사무실 로비 전경"
              disabled={saving}
              aria-invalid={errors.alt !== undefined}
              aria-describedby={errors.alt !== undefined ? errorIdOf('media-alt') : undefined}
              {...register('alt')}
            />
          </FormField>
        </div>
      </Modal>

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
