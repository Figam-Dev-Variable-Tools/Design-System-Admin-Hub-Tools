// ContractFormPage — 계약 등록/수정 (라우트: /sales/contracts/new · /:id/edit)
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드(계약정보·금액·기간·
// 갱신·서명·조항·첨부) + 우측 계약서 요약 미리보기 2단으로 구성한다. 검증의 정본은 ./validation.
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  controlStyle,
  DateRangeField,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  Icon,
  ImageGalleryField,
  pageTitleStyle,
  SelectField,
  TextareaField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { contractAdapter } from './data-source';
import { contractSchema } from './validation';
import type { ContractFormValues } from './validation';
import { ContractSummaryPreview } from './components/ContractSummaryPreview';
import {
  CONTRACT_MAX_ATTACHMENTS,
  CONTRACT_STATUS_OPTIONS,
  CONTRACT_TERMS_MAX,
  CONTRACT_TITLE_MAX,
  CONTRACT_TYPE_OPTIONS,
  SIGN_STATUS_OPTIONS,
} from './types';
import type { Contract, ContractInput } from './types';
import { cssVar } from '@tds/ui';

const RESOURCE = 'sales-contracts';
const ENTITY_LABEL = '계약';
const LIST_PATH = '/sales/contracts';
const UNSAVED_MESSAGE =
  '계약에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: 0,
  paddingRight: 0,
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: cssVar('color.text.muted'),
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
  cursor: 'pointer',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 13), 1fr))',
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(calc(var(--tds-space-6) * 4), 1fr))',
  gap: cssVar('space.4'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const EMPTY: ContractFormValues = {
  title: '',
  accountName: '',
  contractType: 'supply',
  startAt: '',
  endAt: '',
  amount: '0',
  vatIncluded: false,
  autoRenew: false,
  renewNoticeDays: '30',
  status: 'draft',
  signStatus: 'unsigned',
  ownerName: '',
  attachments: [],
  terms: '',
  note: '',
};

const digitsToNumber = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};

function toInput(values: ContractFormValues): ContractInput {
  return {
    title: values.title.trim(),
    accountName: values.accountName.trim(),
    contractType: values.contractType,
    startAt: values.startAt,
    endAt: values.endAt,
    amount: digitsToNumber(values.amount),
    vatIncluded: values.vatIncluded,
    autoRenew: values.autoRenew,
    renewNoticeDays: values.autoRenew ? digitsToNumber(values.renewNoticeDays) : 0,
    status: values.status,
    signStatus: values.signStatus,
    ownerName: values.ownerName.trim(),
    attachments: [...values.attachments],
    terms: values.terms.trim(),
    note: values.note.trim(),
  };
}

function toValues(contract: Contract): ContractFormValues {
  return {
    title: contract.title,
    accountName: contract.accountName,
    contractType: contract.contractType,
    startAt: contract.startAt,
    endAt: contract.endAt,
    amount: String(contract.amount),
    vatIncluded: contract.vatIncluded,
    autoRenew: contract.autoRenew,
    renewNoticeDays: String(contract.renewNoticeDays),
    status: contract.status,
    signStatus: contract.signStatus,
    ownerName: contract.ownerName,
    attachments: [...contract.attachments],
    terms: contract.terms,
    note: contract.note,
  };
}

export default function ContractFormPage() {
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
  } = useCrudForm<Contract, ContractInput, ContractFormValues>({
    resource: RESOURCE,
    adapter: contractAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: contractSchema,
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

  const startAt = watch('startAt');
  const endAt = watch('endAt');
  const autoRenew = watch('autoRenew');
  const vatIncluded = watch('vatIncluded');
  const attachments = watch('attachments');
  const periodError = errors.startAt?.message ?? errors.endAt?.message;

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '계약을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '계약을 불러오지 못했습니다.'}
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
        <Icon name="chevron-left" />
        목록으로
      </button>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '계약 수정' : '계약 등록'}</h1>
        <p style={descriptionStyle}>별표(*) 항목은 필수입니다. 계약 기간·금액을 확인하세요.</p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <Card>
              <CardTitle>계약 정보</CardTitle>

              <FormField
                htmlFor="contract-title"
                label="계약명"
                required
                error={errors.title?.message}
              >
                <input
                  id="contract-title"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.title !== undefined)}
                  maxLength={CONTRACT_TITLE_MAX}
                  placeholder="예: 2026년 SaaS 연간 이용계약"
                  disabled={disabled}
                  aria-invalid={errors.title !== undefined}
                  aria-describedby={
                    errors.title !== undefined ? errorIdOf('contract-title') : undefined
                  }
                  {...register('title')}
                />
              </FormField>

              <div style={rowStyle}>
                <FormField
                  htmlFor="contract-account"
                  label="거래처"
                  required
                  error={errors.accountName?.message}
                >
                  <input
                    id="contract-account"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.accountName !== undefined)}
                    placeholder="예: (주)한빛소프트웨어"
                    disabled={disabled}
                    aria-invalid={errors.accountName !== undefined}
                    aria-describedby={
                      errors.accountName !== undefined ? errorIdOf('contract-account') : undefined
                    }
                    {...register('accountName')}
                  />
                </FormField>
                <FormField htmlFor="contract-type" label="계약유형" required>
                  <SelectField id="contract-type" disabled={disabled} {...register('contractType')}>
                    {CONTRACT_TYPE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField htmlFor="contract-owner" label="담당자">
                  <input
                    id="contract-owner"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(false)}
                    placeholder="예: 김영업"
                    disabled={disabled}
                    {...register('ownerName')}
                  />
                </FormField>
              </div>
            </Card>

            <Card>
              <CardTitle>금액 · 기간</CardTitle>

              <div style={rowStyle}>
                <FormField
                  htmlFor="contract-amount"
                  label="계약금액 (원)"
                  required
                  error={errors.amount?.message}
                >
                  <input
                    id="contract-amount"
                    type="text"
                    inputMode="numeric"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.amount !== undefined)}
                    placeholder="예: 36000000"
                    disabled={disabled}
                    aria-invalid={errors.amount !== undefined}
                    aria-describedby={
                      errors.amount !== undefined ? errorIdOf('contract-amount') : undefined
                    }
                    {...register('amount')}
                  />
                </FormField>
                <div style={fieldStyle}>
                  <span style={fieldLabelStyle}>부가세</span>
                  <ToggleSwitch
                    checked={vatIncluded}
                    onChange={(next) => setValue('vatIncluded', next, { shouldDirty: true })}
                    disabled={disabled}
                    label="부가세 포함 여부"
                    onLabel="포함"
                    offLabel="별도"
                  />
                </div>
              </div>

              <DateRangeField
                label="계약 기간"
                required
                startValue={startAt}
                endValue={endAt}
                onStartChange={(value) => setValue('startAt', value, { shouldDirty: true })}
                onEndChange={(value) => setValue('endAt', value, { shouldDirty: true })}
                disabled={disabled}
                error={periodError}
              />
            </Card>

            <Card>
              <CardTitle>갱신 · 서명 · 상태</CardTitle>

              <div style={rowStyle}>
                <div style={fieldStyle}>
                  <span style={fieldLabelStyle}>자동갱신</span>
                  <ToggleSwitch
                    checked={autoRenew}
                    onChange={(next) => setValue('autoRenew', next, { shouldDirty: true })}
                    disabled={disabled}
                    label="자동갱신 여부"
                    onLabel="사용"
                    offLabel="미사용"
                  />
                </div>
                {autoRenew && (
                  <FormField
                    htmlFor="contract-renew-notice"
                    label="갱신 통지기한 (일)"
                    error={errors.renewNoticeDays?.message}
                    hint="만료 N일 전 통지"
                  >
                    <input
                      id="contract-renew-notice"
                      type="text"
                      inputMode="numeric"
                      className="tds-ui-input tds-ui-focusable"
                      style={controlStyle(errors.renewNoticeDays !== undefined)}
                      placeholder="예: 30"
                      disabled={disabled}
                      {...register('renewNoticeDays')}
                    />
                  </FormField>
                )}
              </div>

              <div style={rowStyle}>
                <FormField htmlFor="contract-status" label="계약 상태" required>
                  <SelectField id="contract-status" disabled={disabled} {...register('status')}>
                    {CONTRACT_STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField htmlFor="contract-sign" label="전자서명 상태" required>
                  <SelectField id="contract-sign" disabled={disabled} {...register('signStatus')}>
                    {SIGN_STATUS_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>
            </Card>

            <Card>
              <CardTitle>조항 · 첨부</CardTitle>
              <TextareaField
                label="주요 조항 요약"
                value={watch('terms')}
                onChange={(value) => setValue('terms', value, { shouldDirty: true })}
                maxLength={CONTRACT_TERMS_MAX}
                disabled={disabled}
                error={errors.terms?.message}
                placeholder="지급조건·해지조건·SLA 등 핵심 조항을 요약하세요."
                rows={4}
              />
              <ImageGalleryField
                label="계약서 첨부(스캔)"
                values={attachments}
                onChange={(values) => setValue('attachments', [...values], { shouldDirty: true })}
                disabled={disabled}
                maxFiles={CONTRACT_MAX_ATTACHMENTS}
                hint="계약서·부속합의서 스캔본을 업로드하세요."
              />
            </Card>

            <Card>
              <CardTitle>비고</CardTitle>
              <TextareaField
                label="메모"
                value={watch('note')}
                onChange={(value) => setValue('note', value, { shouldDirty: true })}
                maxLength={500}
                disabled={disabled}
                placeholder="내부 메모"
                rows={2}
              />
            </Card>
          </div>

          <Card>
            <CardTitle>미리보기</CardTitle>
            <ContractSummaryPreview
              title={watch('title')}
              accountName={watch('accountName')}
              contractType={watch('contractType')}
              startAt={startAt}
              endAt={endAt}
              amount={digitsToNumber(watch('amount'))}
              vatIncluded={vatIncluded}
              autoRenew={autoRenew}
              status={watch('status')}
              signStatus={watch('signStatus')}
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
