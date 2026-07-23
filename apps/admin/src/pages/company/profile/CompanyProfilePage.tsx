// CompanyProfilePage — 회사 정보 (라우트: /company/profile)
//
// 단일 편집 폼(회사당 1건). 목록 없음 — 문서 하나를 불러와 고치고 저장한다. 저장은 토스트, 필드
// 오류는 인라인, 저장하지 않은 채 이탈하면 가드가 막는다(단일 문서형 4종 공통 껍데기 재사용).
//
// [주소는 검색으로 고른다 — 오시는 길과 **같은 규칙**]
// 주소 칸을 누르면 우편번호 서비스를 담은 모달이 열리고, 입력은 readOnly 다. 두 화면이 같은 부품을
// 다르게 쓰면 운영자는 같은 일을 두 번 배운다. 자유 입력을 열어 두면 우편번호 체계에 없는 주소가
// 저장될 수 있는데, 이 값은 홈페이지 푸터·사업자정보·견적서에 그대로 나가는 값이다.
// 층·호수는 상세주소 칸으로 갈라졌다 — 검색이 주는 주소에는 그것이 들어 있지 않기 때문이다.
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  controlStyle,
  errorIdOf,
  FormField,
  formRowStyle,
  ImageUploadField,
  useToast,
} from '../../../shared/ui';
import { DocumentFormShell, useDocumentQuery, useSaveDocument } from '../../../shared/crud';
import { AddressField, selectedAddressOf } from '../../../shared/address-search';
import type { PostalAddress } from '../../../shared/address-search';
import { companyProfileKey, companyProfileStore } from './data-source';
import {
  ADDRESS_DETAIL_MAX_LENGTH,
  ADDRESS_MAX_LENGTH,
  COMPANY_NAME_MAX_LENGTH,
  CONTACT_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from './types';
import { companyProfileSchema } from './validation';
import type { CompanyProfileFormValues } from './validation';
const UNSAVED_MESSAGE =
  '회사 정보에 아직 저장하지 않은 내용이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

const EMPTY: CompanyProfileFormValues = {
  companyName: '',
  businessNumber: '',
  address: '',
  addressDetail: '',
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
    getValues,
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

  const onAddressSelected = (address: PostalAddress) => {
    setValue('address', selectedAddressOf(address), { shouldDirty: true, shouldValidate: true });

    /* 건물명은 **상세주소가 비어 있을 때만** 제안한다(오시는 길과 같은 규칙). 이미 '8층 802호' 라고
       적어 둔 사람의 입력을 검색 한 번으로 덮으면, 되돌릴 방법이 없는 손실이다. */
    if (address.buildingName !== '' && getValues('addressDetail').trim() === '') {
      setValue('addressDetail', address.buildingName, { shouldDirty: true });
    }
  };

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
          toast.success('회사 정보를 저장했어요.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  return (
    <DocumentFormShell
      cardTitle="회사 정보"
      description="별표(*)는 꼭 입력해야 하는 항목이에요. 저장하면 홈페이지의 회사 소개에 바로 반영돼요."
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

      <div style={formRowStyle}>
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
            aria-describedby={
              errors.businessNumber !== undefined ? errorIdOf('profile-biznum') : undefined
            }
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
            aria-describedby={errors.ceoName !== undefined ? errorIdOf('profile-ceo') : undefined}
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
          aria-describedby={errors.contact !== undefined ? errorIdOf('profile-contact') : undefined}
          {...register('contact')}
        />
      </FormField>

      <AddressField
        id="profile-address"
        field={register('address')}
        error={errors.address?.message}
        disabled={disabled}
        maxLength={ADDRESS_MAX_LENGTH}
        onSelect={onAddressSelected}
      />

      <FormField
        htmlFor="profile-address-detail"
        label="상세주소"
        error={errors.addressDetail?.message}
        hint="건물명·층·호수 등 (선택)"
      >
        <input
          id="profile-address-detail"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.addressDetail !== undefined)}
          maxLength={ADDRESS_DETAIL_MAX_LENGTH}
          placeholder="예: 예시타워 8층"
          disabled={disabled}
          aria-invalid={errors.addressDetail !== undefined}
          aria-describedby={
            errors.addressDetail !== undefined ? errorIdOf('profile-address-detail') : undefined
          }
          {...register('addressDetail')}
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
        hint="이미지를 끌어다 놓거나 클릭해 올려요. 비워 두면 로고가 나오지 않아요."
      />
    </DocumentFormShell>
  );
}
