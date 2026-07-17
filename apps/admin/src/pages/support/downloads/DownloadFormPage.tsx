// DownloadFormPage — 자료 등록/수정 (라우트: /support/downloads/new · /:id/edit)
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드(제목·카테고리·버전·노출·
// 파일 업로드) + 우측 자료 카드 미리보기 2단으로 구성한다. 검증의 정본은 ./validation.
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  ChevronLeftIcon,
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  pageTitleStyle,
  SelectField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { downloadAdapter, DOWNLOAD_RESOURCE } from './data-source';
import { downloadSchema } from './validation';
import type { DownloadFormValues } from './validation';
import { DownloadPreview } from './components/DownloadPreview';
import { FileUploadField } from './components/FileUploadField';
import { DOWNLOAD_CATEGORY_OPTIONS, fileKindOf, TITLE_MAX, VERSION_MAX } from './types';
import type { DownloadItem, DownloadInput } from './types';

const ENTITY_LABEL = '자료';
const LIST_PATH = '/support/downloads';
const UNSAVED_MESSAGE =
  '자료에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

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

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: 'var(--tds-space-2)',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 13), 1fr))',
  gap: 'var(--tds-space-5)',
  alignItems: 'start',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 4), 1fr))',
  gap: 'var(--tds-space-4)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 'var(--tds-space-2)',
};

const EMPTY: DownloadFormValues = {
  title: '',
  categoryLabel: DOWNLOAD_CATEGORY_OPTIONS[0]?.id ?? '기타',
  version: '',
  visible: true,
  fileName: '',
  fileSize: 0,
};

function toInput(values: DownloadFormValues): DownloadInput {
  return {
    title: values.title.trim(),
    categoryLabel: values.categoryLabel,
    version: values.version.trim(),
    visible: values.visible,
    fileName: values.fileName,
    fileSize: values.fileSize,
    fileKind: fileKindOf(values.fileName),
  };
}

function toValues(item: DownloadItem): DownloadFormValues {
  return {
    title: item.title,
    categoryLabel: item.categoryLabel,
    version: item.version,
    visible: item.visible,
    fileName: item.fileName,
    fileSize: item.fileSize,
  };
}

export default function DownloadFormPage() {
  const navigate = useNavigate();
  const {
    form,
    isEdit,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit,
    isDirty,
  } = useCrudForm<DownloadItem, DownloadInput, DownloadFormValues>({
    resource: DOWNLOAD_RESOURCE,
    adapter: downloadAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: downloadSchema,
    empty: EMPTY,
    toInput,
    toValues,
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;
  const unsavedDialog = useUnsavedChangesDialog(isDirty && !saving, { message: UNSAVED_MESSAGE });

  const fileName = watch('fileName');
  const fileSize = watch('fileSize');
  const visible = watch('visible');

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '자료 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '자료 불러오지 못했습니다.'}
            </span>
            {loadFailure === 'error' && (
              <Button variant="secondary" onClick={retryLoad}>
                다시 시도
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(LIST_PATH)}>
              목록으로
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <button
        type="button"
        className="tds-ui-focusable"
        style={backLinkStyle}
        onClick={() => navigate(LIST_PATH)}
      >
        <ChevronLeftIcon />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '자료 수정' : '자료 등록'}</h1>
        <p style={descriptionStyle}>별표(*) 항목은 필수입니다. 배포할 파일을 첨부하세요.</p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        <div style={layoutStyle}>
          <Card>
            <CardTitle>자료 정보</CardTitle>

            <FormField htmlFor="download-title" label="제목" required error={errors.title?.message}>
              <input
                id="download-title"
                type="text"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(errors.title !== undefined)}
                maxLength={TITLE_MAX}
                placeholder="예: 2026 상반기 제품 카탈로그"
                disabled={disabled}
                aria-invalid={errors.title !== undefined}
                aria-describedby={
                  errors.title !== undefined ? errorIdOf('download-title') : undefined
                }
                {...register('title')}
              />
            </FormField>

            <div style={rowStyle}>
              <FormField htmlFor="download-category" label="카테고리" required>
                <SelectField
                  id="download-category"
                  disabled={disabled}
                  {...register('categoryLabel')}
                >
                  {DOWNLOAD_CATEGORY_OPTIONS.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </SelectField>
              </FormField>
              <FormField
                htmlFor="download-version"
                label="버전"
                error={errors.version?.message}
                hint="개정본이면 판을 적으세요(예: v2.1)"
              >
                <input
                  id="download-version"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.version !== undefined)}
                  maxLength={VERSION_MAX}
                  placeholder="예: v1.0"
                  disabled={disabled}
                  {...register('version')}
                />
              </FormField>
            </div>

            <div style={fieldStyle}>
              <span style={fieldLabelStyle}>노출 여부</span>
              <ToggleSwitch
                checked={visible}
                onChange={(next) => setValue('visible', next, { shouldDirty: true })}
                disabled={disabled}
                label="고객센터 노출 여부"
                onLabel="노출"
                offLabel="숨김"
              />
            </div>

            <FileUploadField
              label="첨부 파일"
              required
              fileName={fileName}
              fileSize={fileSize}
              onSelect={(name, size) => {
                setValue('fileName', name, { shouldDirty: true, shouldValidate: true });
                setValue('fileSize', size, { shouldDirty: true });
              }}
              onClear={() => {
                setValue('fileName', '', { shouldDirty: true, shouldValidate: true });
                setValue('fileSize', 0, { shouldDirty: true });
              }}
              disabled={disabled}
              error={errors.fileName?.message}
            />
          </Card>

          <Card>
            <CardTitle>미리보기</CardTitle>
            <DownloadPreview
              title={watch('title')}
              categoryLabel={watch('categoryLabel')}
              version={watch('version')}
              fileName={fileName}
              fileSize={fileSize}
              visible={visible}
            />
          </Card>
        </div>

        <div style={actionsStyle}>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={saving}
            onClick={() => navigate(LIST_PATH)}
          >
            취소
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={saving || loadingDetail}>
            {saving ? '저장 중…' : isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>

      <FormConflictDialog conflict={conflict} />

      {unsavedDialog}
    </div>
  );
}
