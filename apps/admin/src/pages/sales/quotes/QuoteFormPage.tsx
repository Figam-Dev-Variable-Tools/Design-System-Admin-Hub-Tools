// QuoteFormPage — 견적 등록/수정 (라우트: /sales/quotes/new · /:id/edit)
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
  controlStyle,
  DateRangeField,
  ddStyle,
  dlStyle,
  dtStyle,
  errorIdOf,
  FormField,
  Icon,
  pageTitleStyle,
  SelectField,
  StatusBadge,
  TextareaField,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { AccountSelectField } from '../_shared/AccountSelectField';
import { formatBizNo } from '../_shared/business';
import { quoteAdapter } from './data-source';
import { EMPTY_QUOTE_FORM, quoteSchema } from './validation';
import type { QuoteFormValues } from './validation';
import { QuoteLineItemsTable } from './components/QuoteLineItemsTable';
import { QuotePreview } from './components/QuotePreview';
import { isInherited, QUOTE_NOTE_MAX, QUOTE_STATUS_OPTIONS, TAX_MODE_OPTIONS } from './types';
import type { Quote, QuoteInput, QuoteLineItem } from './types';
import { cssVar } from '@tds/ui';

const RESOURCE = 'sales-quotes';
const ENTITY_LABEL = '견적';
const LIST_PATH = '/sales/quotes';
const INQUIRY_PATH = '/sales/inquiries';
const UNSAVED_MESSAGE =
  '견적에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

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
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 15), 1fr))`,
  gap: cssVar('space.5'),
  alignItems: 'start',
};

const columnStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  minWidth: 0,
};

/** 미리보기 카드 머리 — 제목과 인쇄 버튼을 한 줄에 */
const previewHeadStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
};

/**
 * 견적서를 종이/PDF 로 낸다 (ERP-10).
 *
 * [왜 브라우저 인쇄인가 — react-pdf 를 쓰지 않은 이유]
 * PDF 렌더러(@react-pdf/renderer)는 자체 폰트를 임베드하므로 **한글 글리프가 있는 TTF 를 함께
 * 배포해야** 한다. 등록하지 않으면 기본 Helvetica 로 떨어지고 '견적서'가 코드포인트 하위 바이트로
 * 잘려 깨진 라틴 글자로 찍힌다(실측). 한글 폰트는 자유 배포본(Noto Sans KR)도 gzip 수 MB 라
 * 앱 진입 번들(131 kB)의 수십 배다 — 견적서 한 장을 위해 치를 값이 아니다.
 * 브라우저 인쇄는 그 문제가 없다: 시스템 폰트로 한글을 정확히 찍고, CSS 변수를 그대로 읽으므로
 * print 토큰이 **원값 export 없이** 바로 소비된다. 추가 번들은 0 바이트다.
 * (측정치와 근거는 배치 보고서에 있다.)
 *
 * 인쇄 대상 지정은 ../quotes.css 의 `@media print` 가 한다 — 여기서는 인쇄를 부르기만 한다.
 */
function printQuote(): void {
  window.print();
}

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 4), 1fr))`,
  gap: cssVar('space.4'),
};

// 공급받는자 4개 필드(거래처·담당자·대표자·사업자번호)는 한 줄에 밀어 넣으면 회사명이 잘린다
// ('대성물산 주식회…'). 최소 폭을 넉넉히 줘서 좁아지면 2×2 로 접히게 한다.
const partyRowStyle: CSSProperties = {
  ...rowStyle,
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 7), 1fr))`,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

// 시스템 자동 부여 값(견적번호)의 읽기 전용 표면 — 입력과 구분되게 죽은 배경·흐린 글자·기본 커서로
// "편집 불가한 시스템 값"임을 시각으로 알린다(토큰만).
const systemValueStyle: CSSProperties = {
  ...controlStyle(false),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  cursor: 'default',
};

function toInput(values: QuoteFormValues): QuoteInput {
  return {
    quoteNo: values.quoteNo.trim(),
    accountId: values.accountId,
    accountName: values.accountName.trim(),
    accountBizNo: values.accountBizNo.trim() === '' ? '' : formatBizNo(values.accountBizNo),
    accountCeo: values.accountCeo.trim(),
    contactName: values.contactName.trim(),
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
    inquiryId: values.inquiryId,
    inquiryNo: values.inquiryNo,
    inquiryBody: values.inquiryBody,
  };
}

function toValues(quote: Quote): QuoteFormValues {
  return {
    quoteNo: quote.quoteNo,
    accountId: quote.accountId,
    accountName: quote.accountName,
    accountBizNo: quote.accountBizNo,
    accountCeo: quote.accountCeo,
    contactName: quote.contactName,
    issueDate: quote.issueDate,
    validUntil: quote.validUntil,
    taxMode: quote.taxMode,
    items: quote.items.map((item) => ({ ...item })),
    status: quote.status,
    note: quote.note,
    inquiryId: quote.inquiryId,
    inquiryNo: quote.inquiryNo,
    inquiryBody: quote.inquiryBody,
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
    empty: EMPTY_QUOTE_FORM,
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

  // [자동생성 값 잠금] 문의에서 발행된 견적은 승계 필드를 사람이 고치지 못한다 — 원본 문의와
  // 어긋나면 어느 쪽이 진실인지 알 수 없기 때문이다. 견적번호와 같은 규칙을 그대로 확장한다.
  const inquiryId = watch('inquiryId');
  const inquiryNo = watch('inquiryNo');
  const inquiryBody = watch('inquiryBody');
  const inherited = isInherited({ inquiryId });

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
        <Icon name="chevron-left" />
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

              {/* [거래처 참조] 이름 문자열이 아니라 거래처 마스터를 가리킨다. 승계 견적은
                  **이름을 사람이 고쳐 쓰지 못하지만**(nameLocked — 원본 문의와 어긋나면 어느 쪽이
                  진실인지 알 수 없다) 마스터에서 고르는 것은 허용한다: 그것은 승계 값을 바꾸는
                  일이 아니라 문의가 애초에 갖지 못한 '어느 거래처인가' 를 뒤늦게 채우는 일이고,
                  이 연결이 없으면 그 견적은 거래처 상세의 견적 이력에서 영원히 빠진다. */}
              <AccountSelectField
                id="quote-account"
                label="거래처(공급받는자)"
                accountId={watch('accountId')}
                accountName={watch('accountName')}
                required
                disabled={disabled}
                nameLocked={inherited}
                error={errors.accountName?.message}
                onChange={(next) => {
                  setValue('accountId', next.accountId, { shouldDirty: true });
                  setValue('accountName', next.accountName, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                  // 견적서는 공급받는자의 사업자번호·대표자까지 인쇄한다 — 마스터에서 골랐으면
                  // 그 값도 함께 승계한다(운영자가 세 칸을 손으로 옮겨 적지 않게).
                  if (next.account !== undefined) {
                    setValue('accountBizNo', formatBizNo(next.account.bizNo), {
                      shouldDirty: true,
                    });
                    setValue('accountCeo', next.account.ceoName, { shouldDirty: true });
                  }
                }}
              />

              <div style={partyRowStyle}>
                <FormField
                  htmlFor="quote-contact"
                  label="담당자"
                  error={errors.contactName?.message}
                  hint={inherited ? '문의에서 승계한 값입니다 (수정 불가)' : ''}
                >
                  <input
                    id="quote-contact"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={
                      inherited ? systemValueStyle : controlStyle(errors.contactName !== undefined)
                    }
                    placeholder="예: 김담당"
                    disabled={disabled}
                    readOnly={inherited}
                    aria-readonly={inherited || undefined}
                    aria-invalid={errors.contactName !== undefined}
                    aria-describedby={
                      errors.contactName !== undefined ? errorIdOf('quote-contact') : undefined
                    }
                    {...register('contactName')}
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

            {inherited && (
              <Card>
                <CardTitle>
                  원본 문의
                  <StatusBadge tone="info" label="자동 승계" />
                </CardTitle>
                <p style={descriptionStyle}>
                  이 견적은 문의 처리 상태를 &lsquo;견적 발행&rsquo;으로 바꿔 자동 생성되었습니다.
                  거래처·담당자·문의내용은 원본 문의를 따르며 수정할 수 없습니다.
                </p>
                <dl style={dlStyle}>
                  <dt style={dtStyle}>문의번호</dt>
                  <dd style={ddStyle}>{inquiryNo}</dd>
                  <dt style={dtStyle}>문의내용</dt>
                  <dd style={ddStyle}>{inquiryBody}</dd>
                </dl>
                <span>
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`${INQUIRY_PATH}/${inquiryId}`)}
                  >
                    원본 문의 보기
                  </Button>
                </span>
              </Card>
            )}

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
            <div style={previewHeadStyle}>
              <CardTitle>미리보기</CardTitle>
              <Button type="button" variant="secondary" size="sm" onClick={printQuote}>
                인쇄 · PDF 저장
              </Button>
            </div>
            <QuotePreview
              quoteNo={watch('quoteNo')}
              accountName={watch('accountName')}
              accountBizNo={watch('accountBizNo')}
              accountCeo={watch('accountCeo')}
              contactName={watch('contactName')}
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
