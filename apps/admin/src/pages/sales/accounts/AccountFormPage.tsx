// AccountFormPage — 거래처 등록/수정 (라우트: /sales/accounts/new · /:id/edit)
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드(사업자정보·거래조건·
// 담당자) + 우측 사업자 정보 미리보기 2단으로 구성한다. 검증의 정본은 ./validation 의 zod 스키마다.
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  Alert,
  alertActionRowStyle,
  Button,
  Card,
  CardTitle,
  controlStyle,
  errorIdOf,
  fieldLabelStyle,
  fieldStyle,
  FormField,
  formRowStyle,
  Icon,
  pageTitleStyle,
  SelectField,
  TextareaField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { accountAdapter } from './data-source';
import { accountSchema } from './validation';
import type { AccountFormValues } from './validation';
import { AccountBusinessPreview } from './components/AccountBusinessPreview';
import { AccountContactsField } from './components/AccountContactsField';
import { formatBizNo } from '../_shared/business';
import {
  ACCOUNT_NAME_MAX,
  ACCOUNT_NOTE_MAX,
  CREDIT_GRADE_OPTIONS,
  PAYMENT_TERM_OPTIONS,
  TAX_TYPE_OPTIONS,
  TRADE_TYPE_OPTIONS,
} from './types';
import type { Account, AccountContact, AccountInput } from './types';
import { cssVar } from '@tds/ui';

const RESOURCE = 'sales-accounts';
const ENTITY_LABEL = '거래처';
const LIST_PATH = '/sales/accounts';
const UNSAVED_MESSAGE =
  '거래처에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

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
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
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
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  cursor: 'pointer',
};

const layoutStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 13), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const EMPTY: AccountFormValues = {
  name: '',
  bizNo: '',
  ceoName: '',
  bizType: '',
  bizItem: '',
  tradeType: 'sales',
  taxType: 'general',
  creditGrade: 'B',
  creditLimit: '0',
  paymentTerm: 'net_30',
  address: '',
  phone: '',
  contacts: [],
  active: true,
  lastTradeAt: '',
  note: '',
};

const digitsToNumber = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};

function toInput(values: AccountFormValues): AccountInput {
  return {
    name: values.name.trim(),
    bizNo: formatBizNo(values.bizNo),
    ceoName: values.ceoName.trim(),
    bizType: values.bizType.trim(),
    bizItem: values.bizItem.trim(),
    tradeType: values.tradeType,
    taxType: values.taxType,
    creditGrade: values.creditGrade,
    creditLimit: digitsToNumber(values.creditLimit),
    paymentTerm: values.paymentTerm,
    address: values.address.trim(),
    phone: values.phone.trim(),
    contacts: values.contacts.map((contact) => ({
      ...contact,
      name: contact.name.trim(),
      department: contact.department.trim(),
      position: contact.position.trim(),
      phone: contact.phone.trim(),
      email: contact.email.trim(),
    })),
    active: values.active,
    lastTradeAt: values.lastTradeAt,
    note: values.note.trim(),
  };
}

function toValues(account: Account): AccountFormValues {
  return {
    name: account.name,
    bizNo: account.bizNo,
    ceoName: account.ceoName,
    bizType: account.bizType,
    bizItem: account.bizItem,
    tradeType: account.tradeType,
    taxType: account.taxType,
    creditGrade: account.creditGrade,
    creditLimit: String(account.creditLimit),
    paymentTerm: account.paymentTerm,
    address: account.address,
    phone: account.phone,
    contacts: account.contacts.map((contact) => ({ ...contact })),
    active: account.active,
    lastTradeAt: account.lastTradeAt,
    note: account.note,
  };
}

export default function AccountFormPage() {
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
  } = useCrudForm<Account, AccountInput, AccountFormValues>({
    resource: RESOURCE,
    adapter: accountAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: accountSchema,
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

  const bizNo = watch('bizNo');
  const contacts: readonly AccountContact[] = watch('contacts');
  const active = watch('active');

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '거래처 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '거래처 불러오지 못했어요.'}
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
        <h1 style={pageTitleStyle}>{isEdit ? '거래처 수정' : '거래처 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수예요. 사업자등록번호는 국세청 형식으로 검증돼요.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <Card>
              <CardTitle>사업자 정보</CardTitle>

              <FormField
                htmlFor="account-name"
                label="상호(거래처명)"
                required
                error={errors.name?.message}
              >
                <input
                  id="account-name"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.name !== undefined)}
                  maxLength={ACCOUNT_NAME_MAX}
                  placeholder="예: (주)한빛소프트웨어"
                  disabled={disabled}
                  aria-invalid={errors.name !== undefined}
                  aria-describedby={
                    errors.name !== undefined ? errorIdOf('account-name') : undefined
                  }
                  {...register('name')}
                />
              </FormField>

              <div style={formRowStyle}>
                <FormField
                  htmlFor="account-biz-no"
                  label="사업자등록번호"
                  required
                  error={errors.bizNo?.message}
                >
                  <input
                    id="account-biz-no"
                    type="text"
                    inputMode="numeric"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.bizNo !== undefined)}
                    value={bizNo}
                    placeholder="000-00-00000"
                    disabled={disabled}
                    aria-invalid={errors.bizNo !== undefined}
                    aria-describedby={
                      errors.bizNo !== undefined ? errorIdOf('account-biz-no') : undefined
                    }
                    onChange={(event) =>
                      setValue('bizNo', formatBizNo(event.target.value), { shouldDirty: true })
                    }
                  />
                </FormField>

                <FormField
                  htmlFor="account-ceo"
                  label="대표자명"
                  required
                  error={errors.ceoName?.message}
                >
                  <input
                    id="account-ceo"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.ceoName !== undefined)}
                    maxLength={40}
                    placeholder="예: 김한빛"
                    disabled={disabled}
                    aria-invalid={errors.ceoName !== undefined}
                    aria-describedby={
                      errors.ceoName !== undefined ? errorIdOf('account-ceo') : undefined
                    }
                    {...register('ceoName')}
                  />
                </FormField>
              </div>

              <div style={formRowStyle}>
                <FormField htmlFor="account-biz-type" label="업태">
                  <input
                    id="account-biz-type"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(false)}
                    placeholder="예: 서비스"
                    disabled={disabled}
                    {...register('bizType')}
                  />
                </FormField>
                <FormField htmlFor="account-biz-item" label="종목">
                  <input
                    id="account-biz-item"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(false)}
                    placeholder="예: 소프트웨어 개발"
                    disabled={disabled}
                    {...register('bizItem')}
                  />
                </FormField>
                <FormField htmlFor="account-tax" label="과세유형" required>
                  <SelectField id="account-tax" disabled={disabled} {...register('taxType')}>
                    {TAX_TYPE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>

              <FormField htmlFor="account-address" label="사업장 주소">
                <input
                  id="account-address"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(false)}
                  placeholder="예: 서울특별시 강남구 테헤란로 123"
                  disabled={disabled}
                  {...register('address')}
                />
              </FormField>

              <FormField htmlFor="account-phone" label="대표 전화">
                <input
                  id="account-phone"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(false)}
                  placeholder="예: 02-1234-5678"
                  disabled={disabled}
                  {...register('phone')}
                />
              </FormField>
            </Card>

            <Card>
              <CardTitle>거래 조건</CardTitle>

              <div style={formRowStyle}>
                <FormField htmlFor="account-trade-type" label="거래유형" required>
                  <SelectField
                    id="account-trade-type"
                    disabled={disabled}
                    {...register('tradeType')}
                  >
                    {TRADE_TYPE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField htmlFor="account-credit-grade" label="신용등급" required>
                  <SelectField
                    id="account-credit-grade"
                    disabled={disabled}
                    {...register('creditGrade')}
                  >
                    {CREDIT_GRADE_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
              </div>

              <div style={formRowStyle}>
                <FormField
                  htmlFor="account-credit-limit"
                  label="여신한도 (원)"
                  required
                  error={errors.creditLimit?.message}
                  hint="0 이면 미설정"
                >
                  <input
                    id="account-credit-limit"
                    type="text"
                    inputMode="numeric"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.creditLimit !== undefined)}
                    placeholder="예: 50000000"
                    disabled={disabled}
                    aria-invalid={errors.creditLimit !== undefined}
                    aria-describedby={
                      errors.creditLimit !== undefined
                        ? errorIdOf('account-credit-limit')
                        : undefined
                    }
                    {...register('creditLimit')}
                  />
                </FormField>
                <FormField htmlFor="account-payment-term" label="결제조건" required>
                  <SelectField
                    id="account-payment-term"
                    disabled={disabled}
                    {...register('paymentTerm')}
                  >
                    {PAYMENT_TERM_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField htmlFor="account-last-trade" label="최근 거래일">
                  <input
                    id="account-last-trade"
                    type="date"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(false)}
                    disabled={disabled}
                    {...register('lastTradeAt')}
                  />
                </FormField>
              </div>

              <div style={fieldStyle}>
                <span style={fieldLabelStyle}>거래 상태</span>
                <ToggleSwitch
                  checked={active}
                  onChange={(next) => setValue('active', next, { shouldDirty: true })}
                  disabled={disabled}
                  label="거래처 거래 여부"
                  onLabel="거래중"
                  offLabel="중지"
                />
              </div>
            </Card>

            <Card>
              <CardTitle>담당자</CardTitle>
              <AccountContactsField
                contacts={contacts}
                disabled={disabled}
                onChange={(next) => setValue('contacts', [...next], { shouldDirty: true })}
                error={errors.contacts?.message}
              />
            </Card>

            <Card>
              <CardTitle>비고</CardTitle>
              <TextareaField
                label="메모"
                value={watch('note')}
                onChange={(value) => setValue('note', value, { shouldDirty: true })}
                maxLength={ACCOUNT_NOTE_MAX}
                disabled={disabled}
                error={errors.note?.message}
                placeholder="거래 이력·특이사항을 기록하세요."
                rows={3}
              />
            </Card>
          </div>

          <Card>
            <CardTitle>미리보기</CardTitle>
            <AccountBusinessPreview
              name={watch('name')}
              bizNo={bizNo}
              ceoName={watch('ceoName')}
              bizType={watch('bizType')}
              bizItem={watch('bizItem')}
              address={watch('address')}
              tradeType={watch('tradeType')}
              taxType={watch('taxType')}
              creditGrade={watch('creditGrade')}
              creditLimit={digitsToNumber(watch('creditLimit'))}
              paymentTerm={watch('paymentTerm')}
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
