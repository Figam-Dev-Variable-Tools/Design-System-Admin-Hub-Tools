// ContractFormPage — 계약 수정 (라우트: /sales/contracts/:id/edit · /new 는 막힌다)
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드(계약정보·금액·기간·
// 갱신·서명·조항·첨부) + 우측 계약서 요약 미리보기 2단으로 구성한다. 검증의 정본은 ./validation.
//
// [등록 모드가 사라졌다] 계약은 **승인된 견적에서만** 만들어진다(./data-source 의
// createContractFromQuote — 견적 상세의 '계약 만들기' 가 그 유일한 문이다). 예전에는 이 화면이
// `?quoteId=` 로 값을 미리 채운 빈 폼을 열었고, 그 폼은 **견적 없이도 저장할 수 있었다** — 그래서
// 어디서 왔는지 앱이 모르는 계약이 생겼다. 지금 `/new` 는 왜 여기서 만들 수 없는지와 만드는 곳을
// 말하는 화면으로 돌아간다(../_shared/ChainOnlyCreateNotice). 수정은 그대로다 — 막은 것은 생성뿐이다.
//
// [이 화면이 사슬의 다음 칸을 연다] 체결이 끝난 계약(진행중·서명완료)은 여기서 프로젝트가 된다.
// 견적 → 계약과 **같은 모양**이다: 술어(projectDraftBlock)가 버튼의 존재를 정하고, 저장소가 계약
// id 를 멱등키로 중복을 한 번 더 막고, 이미 있으면 '연결된 프로젝트' 링크가 그 자리를 대신한다.
import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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
  formRowStyle,
  Icon,
  ImageGalleryField,
  pageTitleStyle,
  SelectField,
  TextareaField,
  ToggleSwitch,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { usePermissions } from '../../../shared/permissions/PermissionProvider';
import { navPageResourceId } from '../../../shared/permissions/resources';
import { AccountSelectField } from '../_shared/AccountSelectField';
import { ChainOnlyCreateNotice } from '../_shared/ChainOnlyCreateNotice';
import { contractSchema } from './validation';
import type { ContractFormValues } from './validation';
import { ContractSummaryPreview } from './components/ContractSummaryPreview';
import {
  CONTRACT_MAX_ATTACHMENTS,
  CONTRACT_STATUS_OPTIONS,
  CONTRACT_TERMS_MAX,
  CONTRACT_TITLE_MAX,
  CONTRACT_TYPE_OPTIONS,
  isConcludedContract,
  SIGN_STATUS_OPTIONS,
} from './types';
import type { Contract, ContractInput } from './types';
import { contractAdapter } from './data-source';
import { createProjectFromContract, findProjectIdByContract } from '../projects/data-source';
import { projectDraftBlock } from '../projects/types';
import { seoulDayOf } from '../../../shared/format';
import { cssVar } from '@tds/ui';

const RESOURCE = 'sales-contracts';
const ENTITY_LABEL = '계약';
const LIST_PATH = '/sales/contracts';
const QUOTE_PATH = '/sales/quotes';
const PROJECT_PATH = '/sales/projects';
const UNSAVED_MESSAGE =
  '계약에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

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

/** 제목과 '다음 칸' 액션을 한 줄에 — 좁은 화면에서는 접힌다 */
const headRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const EMPTY: ContractFormValues = {
  title: '',
  accountId: '',
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
  quoteId: '',
  quoteNo: '',
};

const digitsToNumber = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};

function toInput(values: ContractFormValues): ContractInput {
  return {
    title: values.title.trim(),
    accountId: values.accountId,
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
    quoteId: values.quoteId,
    quoteNo: values.quoteNo,
  };
}

function toValues(contract: Contract): ContractFormValues {
  return {
    title: contract.title,
    accountId: contract.accountId,
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
    quoteId: contract.quoteId,
    quoteNo: contract.quoteNo,
  };
}

export default function ContractFormPage() {
  const navigate = useNavigate();

  const {
    form,
    isEdit,
    loaded,
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

  /**
   * 이 계약이 이미 프로젝트를 갖고 있는가.
   *
   * [왜 동기 조회인가] 버튼을 **그리는 순간** 답이 있어야 한다 — 비동기로 나중에 알면 '만들기'
   * 버튼이 잠깐 살아 있다가 죽고, 그 사이에 누른 사람은 두 번째 프로젝트를 만든다. 견적 → 계약이
   * 같은 함정을 같은 방식으로 막는다(../quotes/QuoteDetailPage 의 주석이 그 사고를 적어 두었다).
   */
  const projectId = useMemo(() => findProjectIdByContract(loaded?.id ?? ''), [loaded]);
  /** 방금 만든 프로젝트 — 저장소는 바뀌었지만 loaded 는 아직 옛것이라 화면이 즉시 반영되게 붙든다 */
  const [createdProjectId, setCreatedProjectId] = useState('');
  const linkedProjectId = createdProjectId === '' ? projectId : createdProjectId;

  /**
   * '계약 완료' 의 판정은 **계약 도메인**이 갖는다(./types 의 isConcludedContract) — 무엇을 완료로
   * 볼지는 거기 머리말에 근거와 함께 적혀 있다. 폼 값이 아니라 **저장된 원본**(loaded)을 본다:
   * 폼에서 상태만 '진행중' 으로 바꿔 놓고 저장하지 않은 채 프로젝트를 만들면, 그 프로젝트의 근거인
   * 계약은 여전히 검토중이다. 잠금의 근거는 화면이 아니라 서버가 갖고 있어야 한다.
   */
  const concluded = loaded !== undefined && isConcludedContract(loaded.status, loaded.signStatus);
  const projectBlock = projectDraftBlock(concluded, linkedProjectId);

  /**
   * [EXC-03] '프로젝트 만들기' 는 버튼이 아니라 **생성**이다 — 누르는 순간 프로젝트가 실제로 저장소에
   * 들어간다(폼도 확인도 없다). 그런데 이 버튼에는 쓰기 권한 판정이 하나도 없었다.
   *
   * [왜 계약이 아니라 프로젝트에 묻는가] 만들어지는 것은 **프로젝트**이고, 버튼은 곧바로
   * `/sales/projects/:id/edit` 로 데려간다. 계약의 권한으로 열면 프로젝트 등록 권한이 없는 역할이
   * 프로젝트를 만들어 놓고 그 다음 화면에서 403 을 받는다 — 만들어진 것은 남고 손댈 수는 없는
   * 반쪽 상태다. 그래서 '무엇이 만들어지는가' 의 리소스에 묻는다
   * (StatsPageShell 이 route → resourceId 로 직접 묻는 것과 같은 방식이다).
   *
   * 도메인 잠금(projectDraftBlock: 체결이 끝났는가 · 이미 있는가)과는 층이 다르다 — 그쪽은
   * '지금 만들 수 있는 계약인가', 이쪽은 '내가 만들어도 되는가' 다. 둘 다 통과해야 버튼이 존재한다.
   */
  const { can } = usePermissions();
  const canCreateProject = can(navPageResourceId(PROJECT_PATH), 'create');

  /**
   * 프로젝트를 만든다 — 폼이 없다. 이름·거래처·기간·금액은 계약이 이미 알고 있고, 진척·마일스톤은
   * 프로젝트 수정에서 바로 채운다. 물어볼 것이 없는 화면을 한 장 세우지 않는다(견적 → 청구와 같은 판단).
   *
   * 계약 id 가 멱등키라 두 번 눌러도 프로젝트는 하나다 — 저장소가 기존 프로젝트를 그대로 돌려준다.
   * 되돌려 쓰기는 없다: 계약에는 '프로젝트가 생겼다' 를 적을 칸이 없고 만들지도 않는다(파생값 금지).
   */
  const onCreateProject = (): void => {
    if (loaded === undefined || projectBlock !== null) return;
    // 버튼을 없앤 술어가 생성 경로도 막는다 — 감추기만 하면 막은 것이 아니다 (EXC-03)
    if (!canCreateProject) return;
    const { project } = createProjectFromContract(
      loaded,
      seoulDayOf(new Date().toISOString()) ?? '',
    );
    setCreatedProjectId(project.id);
    navigate(`${PROJECT_PATH}/${project.id}/edit`);
  };

  // [사슬 밖 생성 차단] 계약은 승인된 견적에서만 만들어진다 — 이 화면 머리말 참조.
  if (!isEdit) {
    return (
      <ChainOnlyCreateNotice
        title="계약 등록"
        reason="계약은 견적에서 만들어져요. 고객이 승인한 견적 상세에서 ‘계약 만들기’를 누르세요."
        source={{ to: QUOTE_PATH, label: '견적 목록으로' }}
        list={{ to: LIST_PATH, label: '계약 목록으로' }}
      />
    );
  }

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '계약을 찾을 수 없어요. 이미 삭제되었을 수 있어요.'
                : '계약을 불러오지 못했어요.'}
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

      <div style={headRowStyle}>
        <div>
          <h1 style={pageTitleStyle}>계약 수정</h1>
          <p style={descriptionStyle}>별표(*) 항목은 필수예요. 계약 기간·금액을 확인하세요.</p>
        </div>
        {/* 사슬의 다음 칸 — 전이 규칙(projectDraftBlock)이 열어 준 것만 존재한다 (EXC-03).
            화면이 자기 조건문으로 다시 판단하지 않는다: 그러면 이 버튼과 저장소의 거절이 갈라진다. */}
        {projectBlock === null && canCreateProject && (
          <Button variant="secondary" onClick={onCreateProject}>
            프로젝트 만들기
          </Button>
        )}
      </div>

      {/* 원 견적으로 가는 역링크 — 계약 ↔ 견적은 양방향이다 */}
      {watch('quoteId') !== '' && (
        <Alert tone="info">
          <div style={alertActionRowStyle}>
            <span>{`원 견적 ${watch('quoteNo')} 에서 만든 계약이에요. 금액·거래처는 견적을 따라요.`}</span>
            <Link to={`${QUOTE_PATH}/${watch('quoteId')}`} className="tds-ui-link tds-ui-focusable">
              원 견적 보기
            </Link>
          </div>
        </Alert>
      )}

      {/* [어긋난 옛 데이터] 계약은 이제 견적에서만 생기는데, 이 규칙 이전에 견적 없이 등록된 계약이
          남아 있다(픽스처의 ct-1 · ct-3). 조용히 정상인 척하지 않고 그 사실을 말한다 — 지우지도
          않는다: 실제로 맺어진 계약이고, 소급해서 견적을 지어내면 없던 거래가 하나 생긴다. */}
      {watch('quoteId') === '' && (
        <Alert tone="warning">
          견적 없이 등록된 계약이에요. 이 규칙(계약은 견적에서만 만든다)이 생기기 전의 기록이라 원
          견적으로 가는 길이 없어요. 계약 내용은 그대로 수정할 수 있어요.
        </Alert>
      )}

      {/* 다음 칸이 이미 있거나 아직 열리지 않은 이유 — 버튼이 없는 자리에 침묵을 두지 않는다.
          거절은 boolean 이 아니라 사유 문자열이다(../projects/types 의 projectDraftBlock). */}
      {projectBlock !== null && (
        <Alert tone={linkedProjectId === '' ? 'info' : 'success'}>
          <div style={alertActionRowStyle}>
            <span>{projectBlock}</span>
            {linkedProjectId !== '' && (
              <Link
                to={`${PROJECT_PATH}/${linkedProjectId}/edit`}
                className="tds-ui-link tds-ui-focusable"
              >
                연결된 프로젝트 열기
              </Link>
            )}
          </div>
        </Alert>
      )}

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

              {/* 거래처는 **마스터에서 고른다** — 예전에는 자유 입력이라 같은 거래처가 표기
                  하나로 둘이 됐고, 저장된 뒤엔 어느 거래처인지 앱이 알 수 없었다. */}
              <AccountSelectField
                id="contract-account"
                accountId={watch('accountId')}
                accountName={watch('accountName')}
                required
                disabled={disabled}
                error={errors.accountName?.message}
                onChange={(next) => {
                  setValue('accountId', next.accountId, { shouldDirty: true });
                  setValue('accountName', next.accountName, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              />

              <div style={formRowStyle}>
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

              <div style={formRowStyle}>
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

              <div style={formRowStyle}>
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

              <div style={formRowStyle}>
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
