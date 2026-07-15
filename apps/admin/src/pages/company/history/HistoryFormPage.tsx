// HistoryFormPage — 연혁 등록/수정 (라우트: /company/history/new · /company/history/:id/edit) · A41 소유
import type { CSSProperties } from 'react';

import { controlStyle, errorIdOf, FormField, SelectField, TextareaField } from '../../../shared/ui';
import { FormPageShell } from '../_shared/FormPageShell';
import { useCrudForm } from '../_shared/useCrudForm';
import { historyAdapter } from './data-source';
import { CONTENT_MAX_LENGTH, YEAR_MAX, YEAR_MIN } from './types';
import type { HistoryInput, HistoryItem } from './types';
import { historySchema } from './validation';
import type { HistoryFormValues } from './validation';

const ENTITY_LABEL = '연혁';
const LIST_PATH = '/company/history';
const UNSAVED_MESSAGE =
  '연혁에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 5), 1fr))',
  gap: 'var(--tds-space-4)',
};

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

export default function HistoryFormPage() {
  const { form, isEdit, saving, loadingDetail, loadFailed, serverError, submit, isDirty } =
    useCrudForm<HistoryItem, HistoryInput, HistoryFormValues>({
      resource: 'history',
      adapter: historyAdapter,
      entityLabel: ENTITY_LABEL,
      listPath: LIST_PATH,
      schema: historySchema,
      empty: { year: '', month: '', content: '' },
      toInput: (values) => ({
        year: Number(values.year.trim()),
        month: Number(values.month.trim()),
        content: values.content.trim(),
      }),
      toValues: (item) => ({
        year: String(item.year),
        month: String(item.month),
        content: item.content,
      }),
    });

  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;
  const disabled = saving || loadingDetail;
  const content = watch('content');

  return (
    <FormPageShell
      entityLabel={ENTITY_LABEL}
      cardTitle="연혁 정보"
      description="별표(*) 항목은 필수입니다. 연도·월과 내용을 입력하세요."
      listPath={LIST_PATH}
      isEdit={isEdit}
      loadingDetail={loadingDetail}
      loadFailed={loadFailed}
      serverError={serverError}
      saving={saving}
      isDirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={submit}
    >
      <div style={rowStyle}>
        <FormField
          htmlFor="history-year"
          label="연도"
          required
          error={errors.year?.message}
          hint={`${String(YEAR_MIN)} ~ ${String(YEAR_MAX)}`}
        >
          <input
            id="history-year"
            type="number"
            min={YEAR_MIN}
            max={YEAR_MAX}
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(errors.year !== undefined)}
            placeholder="예: 2024"
            disabled={disabled}
            aria-invalid={errors.year !== undefined}
            aria-describedby={errors.year !== undefined ? errorIdOf('history-year') : undefined}
            {...register('year')}
          />
        </FormField>

        <FormField htmlFor="history-month" label="월" required error={errors.month?.message}>
          <SelectField
            id="history-month"
            invalid={errors.month !== undefined}
            disabled={disabled}
            aria-invalid={errors.month !== undefined}
            {...register('month')}
          >
            <option value="">선택</option>
            {MONTHS.map((month) => (
              <option key={month} value={String(month)}>
                {`${String(month)}월`}
              </option>
            ))}
          </SelectField>
        </FormField>
      </div>

      <TextareaField
        label="내용"
        required
        value={content}
        onChange={(value) =>
          setValue('content', value, { shouldValidate: false, shouldDirty: true })
        }
        maxLength={CONTENT_MAX_LENGTH}
        disabled={disabled}
        error={errors.content?.message}
        placeholder="예: 기업부설 연구소 설립"
        rows={4}
      />
    </FormPageShell>
  );
}
