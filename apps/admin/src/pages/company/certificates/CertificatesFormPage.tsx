// CertificatesFormPage — 인증서/특허 등록/수정 (라우트: /company/certificates/new · /:id/edit)
import type { CSSProperties } from 'react';

import {
  controlStyle,
  errorIdOf,
  FormField,
  ImageUploadField,
  SelectField,
} from '../../../shared/ui';
import { FormPageShell, useCrudForm } from '../../../shared/crud';
import { certificatesAdapter } from './data-source';
import { CERT_KIND_OPTIONS, ISSUER_MAX_LENGTH, NAME_MAX_LENGTH } from './types';
import type { CertInput, CertItem, CertKind } from './types';
import { certSchema } from './validation';
import type { CertFormValues } from './validation';

const ENTITY_LABEL = '인증서/특허';
const LIST_PATH = '/company/certificates';
const UNSAVED_MESSAGE =
  '인증서/특허에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 5), 1fr))',
  gap: 'var(--tds-space-4)',
};

export default function CertificatesFormPage() {
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
  } = useCrudForm<CertItem, CertInput, CertFormValues>({
    resource: 'certificates',
    adapter: certificatesAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: certSchema,
    empty: { name: '', issuer: '', issuedOn: '', kind: 'certificate', imageUrl: '' },
    toInput: (values) => ({
      name: values.name.trim(),
      issuer: values.issuer.trim(),
      issuedOn: values.issuedOn.trim(),
      kind: values.kind as CertKind,
      imageUrl: values.imageUrl.trim(),
    }),
    toValues: (item) => ({
      name: item.name,
      issuer: item.issuer,
      issuedOn: item.issuedOn,
      kind: item.kind,
      imageUrl: item.imageUrl,
    }),
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;
  const imageUrl = watch('imageUrl');

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="인증서/특허 정보"
      description="별표(*) 항목은 필수입니다. 이미지 URL 로 인증서/특허 이미지를 등록합니다."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={loadingDetail}
      loadFailure={loadFailure}
      onRetryLoad={retryLoad}
      errorReference={errorReference}
      conflict={conflict}
      serverError={serverError}
      saving={saving}
      isDirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={submit}
    >
      <FormField htmlFor="cert-name" label="명칭" required error={errors.name?.message}>
        <input
          id="cert-name"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.name !== undefined)}
          maxLength={NAME_MAX_LENGTH}
          placeholder="예: ISO 9001 품질경영시스템 인증"
          disabled={disabled}
          aria-invalid={errors.name !== undefined}
          aria-describedby={errors.name !== undefined ? errorIdOf('cert-name') : undefined}
          {...register('name')}
        />
      </FormField>

      <div style={rowStyle}>
        <FormField htmlFor="cert-issuer" label="발급기관" required error={errors.issuer?.message}>
          <input
            id="cert-issuer"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.issuer !== undefined)}
            maxLength={ISSUER_MAX_LENGTH}
            placeholder="예: 예시인증원"
            disabled={disabled}
            aria-invalid={errors.issuer !== undefined}
            aria-describedby={errors.issuer !== undefined ? errorIdOf('cert-issuer') : undefined}
            {...register('issuer')}
          />
        </FormField>

        <FormField htmlFor="cert-date" label="발급일" required error={errors.issuedOn?.message}>
          <input
            id="cert-date"
            type="date"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.issuedOn !== undefined)}
            disabled={disabled}
            aria-invalid={errors.issuedOn !== undefined}
            aria-describedby={errors.issuedOn !== undefined ? errorIdOf('cert-date') : undefined}
            {...register('issuedOn')}
          />
        </FormField>

        <FormField htmlFor="cert-kind" label="구분" required error={errors.kind?.message}>
          <SelectField
            id="cert-kind"
            isInvalid={errors.kind !== undefined}
            disabled={disabled}
            aria-invalid={errors.kind !== undefined}
            aria-describedby={errors.kind !== undefined ? errorIdOf('cert-kind') : undefined}
            {...register('kind')}
          >
            {CERT_KIND_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>
      </div>

      <ImageUploadField
        label="이미지"
        required
        value={imageUrl}
        onChange={(value) =>
          setValue('imageUrl', value, { shouldValidate: false, shouldDirty: true })
        }
        disabled={disabled}
        error={errors.imageUrl?.message}
        hint="이미지를 끌어다 놓거나 클릭해 업로드합니다."
      />
    </FormPageShell>
  );
}
