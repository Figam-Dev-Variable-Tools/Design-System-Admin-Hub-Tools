// QuoteFormPage — 견적 등록/수정 (라우트: /sales/quotes/new · /:id/edit) · A41 소유
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드(견적정보 · 라인아이템
// 편집표 · 비고) + 우측 견적서 문서 미리보기 2단으로 구성한다. 검증의 정본은 ./validation.
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
  DateRangeField,
  errorIdOf,
  FormField,
  pageTitleStyle,
  SelectField,
  TextareaField,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { formatBizNo } from '../_shared/business';
import { quoteAdapter } from './data-source';
import { quoteSchema } from './validation';
import type { QuoteFormValues } from './validation';
import { QuoteLineItemsTable } from './components/QuoteLineItemsTable';
import { QuotePreview } from './components/QuotePreview';
import { QUOTE_NOTE_MAX, QUOTE_STATUS_OPTIONS, TAX_MODE_OPTIONS } from './types';
import type { Quote, QuoteInput, QuoteLineItem } from './types';

const RESOURCE = 'sales-quotes';
const ENTITY_LABEL = '견적';
const LIST_PATH = '/sales/quotes';
const UNSAVED_MESSAGE =
  '견적에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

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
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 15), 1fr))',
  gap: 'var(--tds-space-5)',
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
  minWidth: 0,
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

// 시스템 자동 부여 값(견적번호)의 읽기 전용 표면 — 입력과 구분되게 죽은 배경·흐린 글자·기본 커서로
// "편집 불가한 시스템 값"임을 시각으로 알린다(토큰만).
const systemValueStyle: CSSProperties = {
  ...controlStyle(false),
  background: 'var(--tds-color-surface-raised)',
  color: 'var(--tds-color-text-muted)',
  cursor: 'default',
};

const EMPTY: QuoteFormValues = {
  quoteNo: '',
  accountName: '',
  accountBizNo: '',
  accountCeo: '',
  issueDate: '',
  validUntil: '',
  taxMode: 'standard',
  items: [],
  status: 'draft',
  note: '',
};

function toInput(values: QuoteFormValues): QuoteInput {
  return {
    quoteNo: values.quoteNo.trim(),
    accountName: values.accountName.trim(),
    accountBizNo: values.accountBizNo.trim() === '' ? '' : formatBizNo(values.accountBizNo),
    accountCeo: values.accountCeo.trim(),
    issueDate: values.issueDate,
    validUntil: values.validUntil,
    taxMode: values.taxMode,
    items: values.items.map((item) => ({
      ...item,
      name: item.name.trim(),
      spec: item.spec.trim(),
    })),
    status: values.status,
    note: values.note.trim(),
  };
}

function toValues(quote: Quote): QuoteFormValues {
  return {
    quoteNo: quote.quoteNo,
    accountName: quote.accountName,
    accountBizNo: quote.accountBizNo,
    accountCeo: quote.accountCeo,
    issueDate: quote.issueDate,
    validUntil: quote.validUntil,
    taxMode: quote.taxMode,
    items: quote.items.map((item) => ({ ...item })),
    status: quote.status,
    note: quote.note,
  };
}

export default function QuoteFormPage() {
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
  } = useCrudForm<Quote, QuoteInput, QuoteFormValues>({
    resource: RESOURCE,
    adapter: quoteAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: quoteSchema,
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

  const items: readonly QuoteLineItem[] = watch('items');
  const taxMode = watch('taxMode');
  const issueDate = watch('issueDate');
  const validUntil = watch('validUntil');
  const periodError = errors.issueDate?.message ?? errors.validUntil?.message;

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '견적을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '견적을 불러오지 못했습니다.'}
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
        <h1 style={pageTitleStyle}>{isEdit ? '견적 수정' : '견적 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 오른쪽 미리보기로 실제 견적서 모습을 확인하세요. 견적번호는
          시스템이 저장 시 자동 부여하며 수정할 수 없습니다.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <Card>
              <CardTitle>견적 정보</CardTitle>

              <div style={rowStyle}>
                <FormField
                  htmlFor="quote-no"
                  label="견적번호"
                  hint="시스템이 저장 시 자동 부여합니다 (수정 불가)"
                >
                  {/* 자동 채번 값 — 편집 불가. register 로 폼에 남겨 수정 시 기존 번호를 보존하고,
                      신규 등록 시 빈 값이면 저장 시점에 자동 부여된다. */}
                  <input
                    id="quote-no"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={systemValueStyle}
                    placeholder="저장 시 자동 부여"
                    readOnly
                    aria-readonly="true"
                    {...register('quoteNo')}
                  />
                </FormField>
                <FormField htmlFor="quote-status" label="상태" required>
                  <SelectField id="quote-status" disabled={disabled} {...register('status')}>
                    {QUOTE_STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField htmlFor="quote-tax" label="과세유형" required>
                  <SelectField id="quote-tax" disabled={disabled} {...register('taxMode')}>
                    {TAX_MODE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>

              <div style={rowStyle}>
                <FormField
                  htmlFor="quote-account"
                  label="거래처(공급받는자)"
                  required
                  error={errors.accountName?.message}
                >
                  <input
                    id="quote-account"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.accountName !== undefined)}
                    placeholder="예: (주)한빛소프트웨어"
                    disabled={disabled}
                    aria-invalid={errors.accountName !== undefined}
                    aria-describedby={
                      errors.accountName !== undefined ? errorIdOf('quote-account') : undefined
                    }
                    {...register('accountName')}
                  />
                </FormField>
                <FormField htmlFor="quote-account-ceo" label="대표자">
                  <input
                    id="quote-account-ceo"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(false)}
                    placeholder="예: 김한빛"
                    disabled={disabled}
                    {...register('accountCeo')}
                  />
                </FormField>
                <FormField htmlFor="quote-account-biz" label="사업자등록번호">
                  <input
                    id="quote-account-biz"
                    type="text"
                    inputMode="numeric"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(false)}
                    value={watch('accountBizNo')}
                    placeholder="000-00-00000"
                    disabled={disabled}
                    onChange={(event) =>
                      setValue('accountBizNo', formatBizNo(event.target.value), {
                        shouldDirty: true,
                      })
                    }
                  />
                </FormField>
              </div>

              <DateRangeField
                label="견적일 · 유효기간"
                required
                startValue={issueDate}
                endValue={validUntil}
                onStartChange={(value) => setValue('issueDate', value, { shouldDirty: true })}
                onEndChange={(value) => setValue('validUntil', value, { shouldDirty: true })}
                disabled={disabled}
                error={periodError}
              />
            </Card>

            <Card>
              <CardTitle>품목 명세</CardTitle>
              <QuoteLineItemsTable
                items={items}
                taxMode={taxMode}
                disabled={disabled}
                onChange={(next) => setValue('items', [...next], { shouldDirty: true })}
                error={errors.items?.message}
              />
            </Card>

            <Card>
              <CardTitle>비고</CardTitle>
              <TextareaField
                label="비고"
                value={watch('note')}
                onChange={(value) => setValue('note', value, { shouldDirty: true })}
                maxLength={QUOTE_NOTE_MAX}
                disabled={disabled}
                error={errors.note?.message}
                placeholder="납기·결제조건·할인 안내 등을 기록하세요."
                rows={3}
              />
            </Card>
          </div>

          <Card>
            <CardTitle>미리보기</CardTitle>
            <QuotePreview
              quoteNo={watch('quoteNo')}
              accountName={watch('accountName')}
              accountBizNo={watch('accountBizNo')}
              accountCeo={watch('accountCeo')}
              issueDate={issueDate}
              validUntil={validUntil}
              taxMode={taxMode}
              items={items}
              status={watch('status')}
              note={watch('note')}
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
