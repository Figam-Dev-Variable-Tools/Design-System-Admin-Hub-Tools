// CompanyProfilePage — 회사 정보 (라우트: /company/profile) · A41 소유
//
// 단일 편집 폼(회사당 1건). 목록 없음 — 문서 하나를 불러와 고치고 저장한다. 저장은 토스트, 필드
// 오류는 인라인, 저장하지 않은 채 이탈하면 가드가 막는다(단일 문서형 4종 공통 껍데기 재사용).
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { controlStyle, errorIdOf, FormField, ImageUploadField, useToast } from '../../../shared/ui';
import { DocumentFormShell } from '../_shared/DocumentFormShell';
import { companyProfileKey, companyProfileStore } from './data-source';
import { useDocumentQuery, useSaveDocument } from '../_shared/document';
import {
  ADDRESS_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  CONTACT_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from './types';
import { companyProfileSchema } from './validation';
import type { CompanyProfileFormValues } from './validation';

const UNSAVED_MESSAGE =
  '회사 정보에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 6), 1fr))',
  gap: 'var(--tds-space-4)',
};

const EMPTY: CompanyProfileFormValues = {
  companyName: '',
  businessNumber: '',
  address: '',
  ceoName: '',
  contact: '',
  logoUrl: '',
};

export default function CompanyProfilePage() {
  const toast = useToast();
  const { data, isFetching, error, refetch } = useDocumentQuery(
    companyProfileKey,
    companyProfileStore,
  );
  const save = useSaveDocument(companyProfileKey, companyProfileStore);
  const saving = save.isPending;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: EMPTY,
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (data === undefined) return;
    reset(data);
  }, [data, reset]);

  const loading = isFetching && data === undefined;
  const logoUrl = watch('logoUrl');
  const disabled = saving || loading;

  const onValid = (values: CompanyProfileFormValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    save.mutate(
      { input: values, signal: controller.signal },
      {
        onSuccess: () => {
          // 저장된 값을 새 기준선으로 삼아 dirty 를 해제한다
          reset(values);
          toast.success('회사 정보를 저장했습니다.');
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
      cardTitle="회사 정보"
      description="별표(*) 항목은 필수입니다. 저장하면 사용자 화면의 회사 소개에 반영됩니다."
      loading={loading}
      loadFailed={error !== null}
      onRetry={() => void refetch()}
      serverError={serverError}
      saving={saving}
      dirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={(event) => void handleSubmit(onValid)(event)}
    >
      <FormField htmlFor="profile-name" label="회사명" required error={errors.companyName?.message}>
        <input
          id="profile-name"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.companyName !== undefined)}
          maxLength={COMPANY_NAME_MAX_LENGTH}
          placeholder="예: 주식회사 예시플래닝"
          disabled={disabled}
          aria-invalid={errors.companyName !== undefined}
          aria-describedby={
            errors.companyName !== undefined ? errorIdOf('profile-name') : undefined
          }
          {...register('companyName')}
        />
      </FormField>

      <div style={rowStyle}>
        <FormField
          htmlFor="profile-biznum"
          label="사업자등록번호"
          required
          error={errors.businessNumber?.message}
          hint="예: 123-45-67890"
        >
          <input
            id="profile-biznum"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.businessNumber !== undefined)}
            placeholder="123-45-67890"
            disabled={disabled}
            aria-invalid={errors.businessNumber !== undefined}
            {...register('businessNumber')}
          />
        </FormField>

        <FormField htmlFor="profile-ceo" label="대표자명" required error={errors.ceoName?.message}>
          <input
            id="profile-ceo"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.ceoName !== undefined)}
            maxLength={NAME_MAX_LENGTH}
            placeholder="예: 홍길동"
            disabled={disabled}
            aria-invalid={errors.ceoName !== undefined}
            {...register('ceoName')}
          />
        </FormField>
      </div>

      <FormField htmlFor="profile-contact" label="연락처" required error={errors.contact?.message}>
        <input
          id="profile-contact"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.contact !== undefined)}
          maxLength={CONTACT_MAX_LENGTH}
          placeholder="예: 02-0000-0000"
          disabled={disabled}
          aria-invalid={errors.contact !== undefined}
          {...register('contact')}
        />
      </FormField>

      <FormField htmlFor="profile-address" label="주소" required error={errors.address?.message}>
        <input
          id="profile-address"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.address !== undefined)}
          maxLength={ADDRESS_MAX_LENGTH}
          placeholder="예: 서울특별시 예시구 가상대로 123"
          disabled={disabled}
          aria-invalid={errors.address !== undefined}
          {...register('address')}
        />
      </FormField>

      <ImageUploadField
        label="로고 이미지"
        value={logoUrl}
        onChange={(value) =>
          setValue('logoUrl', value, { shouldValidate: false, shouldDirty: true })
        }
        disabled={disabled}
        error={errors.logoUrl?.message}
        hint="이미지를 끌어다 놓거나 클릭해 업로드합니다. 비워 두면 로고가 표시되지 않습니다."
      />
    </DocumentFormShell>
  );
}
