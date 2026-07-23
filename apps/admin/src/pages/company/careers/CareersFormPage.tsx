// CareersFormPage — 채용 공고 등록/수정 (라우트: /company/careers/new · /:id/edit)
//
// [상시 채용을 먼저 묻는다] '마감일을 비워 두면 상시' 가 아니라, **상시인지 먼저 고르고** 그때
// 날짜 칸이 사라진다. 빈 칸을 남겨 두면 '아직 안 정했다' 와 '없다' 가 같은 모양이 된다
// (./types.ts 머리말).
//
// [지원 방법에 따라 한 칸의 뜻이 바뀐다] 이메일이면 주소, 링크면 URL, 폼이면 목록에서 고르기.
// 세 칸을 다 그리지 않는 이유: 안 쓰는 칸이 값을 들고 있으면 저장 뒤에 어느 것이 진짜인지
// 알 수 없다.
//
// [지원 방법은 둘이다] 예전에는 '지원 폼' 이 셋째로 있었고 폼 관리 화면이 만든 폼을 참조했다.
// 그 화면이 IA 에서 빠지면서 폼을 만들 곳이 사라졌으므로 선택지도 함께 걷었다 (./types.ts).
import type { CSSProperties } from 'react';

import { cssVar, ToggleSwitch } from '@tds/ui';

import {
  Alert,
  controlStyle,
  errorIdOf,
  FormField,
  formRowStyle,
  SelectField,
  TextareaField,
} from '../../../shared/ui';
import { FormPageShell, useCrudForm } from '../../../shared/crud';
import { careersAdapter } from './data-source';
import {
  APPLY_METHODS,
  APPLY_TARGET_MAX_LENGTH,
  applyMethodBlock,
  DESCRIPTION_MAX_LENGTH,
  EMPLOYMENT_TYPES,
  JOB_FUNCTIONS,
  LOCATION_MAX_LENGTH,
  publishBlock,
  TITLE_MAX_LENGTH,
} from './types';
import type { Career, CareerInput } from './types';
import { careerSchema, EMPTY_CAREER } from './validation';
import type { CareerFormValues } from './validation';

const ENTITY_LABEL = '채용 공고';
const LIST_PATH = '/company/careers';
const UNSAVED_MESSAGE =
  '채용 공고에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

const toggleRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const hintTextStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

export default function CareersFormPage() {
  // 조회기가 없으면 null('모른다') — 빈 배열이 아니다

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
  } = useCrudForm<Career, CareerInput, CareerFormValues>({
    resource: 'careers',
    adapter: careersAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: careerSchema,
    empty: EMPTY_CAREER,
    toInput: (values) => ({
      title: values.title.trim(),
      jobFunction: values.jobFunction,
      employmentType: values.employmentType,
      location: values.location.trim(),
      // 상시 채용은 **null 로** 저장한다 — 빈 문자열은 '아직 안 정함' 과 구분되지 않는다.
      // 상시가 아닌데 빈 값인 경우는 여기 오지 않는다: 스키마가 그것을 거절한다(validation.ts).
      closesOn: values.alwaysOpen ? null : values.closesOn.trim(),
      applyMethod: values.applyMethod,
      applyTarget: values.applyTarget.trim(),
      description: values.description.trim(),
      published: values.published,
    }),
    toValues: (career) => ({
      title: career.title,
      jobFunction: career.jobFunction,
      employmentType: career.employmentType,
      location: career.location,
      closesOn: career.closesOn ?? '',
      alwaysOpen: career.closesOn === null,
      applyMethod: career.applyMethod,
      applyTarget: career.applyTarget,
      description: career.description,
      published: career.published,
    }),
  });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const disabled = saving || loadingDetail;
  const alwaysOpen = watch('alwaysOpen');
  const applyMethod = watch('applyMethod');
  const applyTarget = watch('applyTarget');
  const published = watch('published');

  /** 버튼의 잠금과 저장의 거절이 읽는 같은 술어 (./types.ts) */
  const applyBlock = applyMethodBlock(applyMethod, applyTarget);
  const publishRejection = publishBlock({
    title: watch('title'),
    jobFunction: watch('jobFunction'),
    employmentType: watch('employmentType'),
    location: watch('location'),
    closesOn: alwaysOpen ? null : watch('closesOn'),
    applyMethod,
    applyTarget,
    description: watch('description'),
    published,
  });

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="채용 공고"
      description="별표(*) 항목은 필수예요. 비공개로 저장하면 홈페이지에 나가지 않아요."
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
      {/* 공개하려는데 지원 경로가 열리지 않으면 그 사실을 **저장 전에** 말한다 —
          열리지 않는 '지원하기' 는 기능이 아니라 거짓 약속이다.

          이 배너는 안내이지 방어선이 아니다: 같은 `publishBlock` 을 `careerSchema` 와
          `careersAdapter` 가 함께 읽어 **공개 저장 자체를 거절**한다(비공개 저장은 언제나 통과).
          예전에는 소비처가 이 배너뿐이라 경고를 띄운 채 저장이 성공했다 — 경고를 무시한 성공은
          no-op 보다 나쁘다. */}
      {publishRejection !== null && <Alert tone="warning">{publishRejection}</Alert>}

      <FormField htmlFor="career-title" label="공고 제목" required error={errors.title?.message}>
        <input
          id="career-title"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.title !== undefined)}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="예: 프로덕트 디자이너 (신규 서비스)"
          disabled={disabled}
          aria-invalid={errors.title !== undefined}
          aria-describedby={errors.title !== undefined ? errorIdOf('career-title') : undefined}
          {...register('title')}
        />
      </FormField>

      <div style={formRowStyle}>
        <FormField htmlFor="career-job" label="직무" required error={errors.jobFunction?.message}>
          <SelectField
            id="career-job"
            isInvalid={errors.jobFunction !== undefined}
            disabled={disabled}
            {...register('jobFunction')}
          >
            <option value="">직무 선택</option>
            {JOB_FUNCTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField
          htmlFor="career-employment"
          label="고용형태"
          required
          error={errors.employmentType?.message}
        >
          <SelectField
            id="career-employment"
            isInvalid={errors.employmentType !== undefined}
            disabled={disabled}
            {...register('employmentType')}
          >
            {EMPLOYMENT_TYPES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField
          htmlFor="career-location"
          label="근무지"
          required
          error={errors.location?.message}
        >
          <input
            id="career-location"
            type="text"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.location !== undefined)}
            maxLength={LOCATION_MAX_LENGTH}
            placeholder="예: 서울 성동구 (재택 병행)"
            disabled={disabled}
            aria-invalid={errors.location !== undefined}
            aria-describedby={
              errors.location !== undefined ? errorIdOf('career-location') : undefined
            }
            {...register('location')}
          />
        </FormField>
      </div>

      {/* 상시 채용을 **먼저** 묻는다 — 그 답이 마감일 칸의 존재를 정한다 */}
      <div style={toggleRowStyle}>
        <span style={hintTextStyle}>
          상시 채용 — 마감일 없이 계속 지원을 받아요. 목록에서 닫히지 않아요.
        </span>
        <ToggleSwitch
          checked={alwaysOpen}
          label="상시 채용"
          onLabel="상시"
          offLabel="마감일 지정"
          disabled={disabled}
          onChange={(next) => {
            setValue('alwaysOpen', next, { shouldDirty: true });
            // 상시로 바꾸면 남아 있던 날짜를 지운다 — 안 쓰는 칸이 값을 들고 있지 않게
            if (next) setValue('closesOn', '', { shouldDirty: true });
          }}
        />
      </div>

      {!alwaysOpen && (
        <FormField htmlFor="career-closes" label="마감일" error={errors.closesOn?.message}>
          <input
            id="career-closes"
            type="date"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.closesOn !== undefined)}
            disabled={disabled}
            aria-invalid={errors.closesOn !== undefined}
            aria-describedby={
              errors.closesOn !== undefined ? errorIdOf('career-closes') : undefined
            }
            {...register('closesOn')}
          />
        </FormField>
      )}

      <div style={formRowStyle}>
        <FormField
          htmlFor="career-apply-method"
          label="지원 방법"
          required
          error={errors.applyMethod?.message}
        >
          <SelectField
            id="career-apply-method"
            isInvalid={errors.applyMethod !== undefined}
            disabled={disabled}
            {...register('applyMethod')}
          >
            {APPLY_METHODS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
        </FormField>

        <FormField
          htmlFor="career-apply-target"
          label={applyMethod === 'link' ? '지원 페이지 주소' : '지원서 접수 이메일'}
          required
          error={errors.applyTarget?.message}
        >
          <input
            id="career-apply-target"
            type={applyMethod === 'link' ? 'url' : 'email'}
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.applyTarget !== undefined)}
            maxLength={APPLY_TARGET_MAX_LENGTH}
            placeholder={
              applyMethod === 'link' ? 'https://recruit.example.com/…' : 'recruit@example.com'
            }
            disabled={disabled}
            aria-invalid={errors.applyTarget !== undefined}
            aria-describedby={
              errors.applyTarget !== undefined ? errorIdOf('career-apply-target') : undefined
            }
            {...register('applyTarget')}
          />
        </FormField>
      </div>

      {applyBlock !== null && <Alert tone="info">{applyBlock}</Alert>}

      <TextareaField
        label="공고 내용"
        required
        rows={10}
        value={watch('description')}
        onChange={(value) => {
          setValue('description', value, { shouldValidate: false, shouldDirty: true });
        }}
        maxLength={DESCRIPTION_MAX_LENGTH}
        placeholder="담당 업무, 자격 요건, 우대 사항을 적어요."
        disabled={disabled}
        error={errors.description?.message}
      />

      <div style={toggleRowStyle}>
        <span style={hintTextStyle}>
          공개 — 끄면 홈페이지에 나가지 않아요. 작성 중인 공고를 잃지 않고 저장할 수 있어요.
        </span>
        <ToggleSwitch
          checked={published}
          label="공고 공개"
          onLabel="공개"
          offLabel="비공개"
          disabled={disabled}
          onChange={(next) => {
            setValue('published', next, { shouldDirty: true });
          }}
        />
      </div>
    </FormPageShell>
  );
}
