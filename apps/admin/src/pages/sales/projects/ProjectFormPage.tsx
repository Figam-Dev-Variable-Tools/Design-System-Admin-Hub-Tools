// ProjectFormPage — 프로젝트 등록/수정 (라우트: /sales/projects/new · /:id/edit)
//
// 데이터 배선은 공용 CRUD 프레임워크(useCrudForm)를 재사용하고, 화면은 입력 카드(기회정보·기간·진척·
// 마일스톤·산출물) + 우측 파이프라인 스텝퍼/가중예상매출 미리보기 2단으로 구성한다. 검증은 ./validation.
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { cssVar, Stepper } from '@tds/ui';

import { formatNumber } from '../../../shared/format';
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
  FormField,
  Icon,
  pageTitleStyle,
  SelectField,
  StatusBadge,
  TextareaField,
  useUnsavedChangesDialog,
} from '../../../shared/ui';
import { FormConflictDialog, FormServerError, useCrudForm } from '../../../shared/crud';
import { formatWon } from '../_shared/business';
import { projectAdapter } from './data-source';
import { projectSchema } from './validation';
import type { ProjectFormValues } from './validation';
import { ProjectMilestonesField } from './components/ProjectMilestonesField';
import {
  defaultProbability,
  PIPELINE_FLOW,
  PROJECT_NAME_MAX,
  STAGES,
  stageLabel,
  stageTone,
  weightedRevenue,
} from './types';
import type { Milestone, PipelineStage, Project, ProjectInput } from './types';

const RESOURCE = 'sales-projects';
const ENTITY_LABEL = '프로젝트';
const LIST_PATH = '/sales/projects';

// DS Stepper 는 도메인을 모른다 — 흐름(정본은 PIPELINE_FLOW)을 라벨과 짝지어 넘긴다.
// 실주는 흐름 밖 종료라 여기 없다: 호출부가 StatusBadge 로 따로 알린다.
const PIPELINE_STEPS = PIPELINE_FLOW.map((stage) => ({ id: stage, label: stageLabel(stage) }));
const UNSAVED_MESSAGE =
  '프로젝트에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.';

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

const previewBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const previewRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
};

const previewValueStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontVariantNumeric: 'tabular-nums',
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
};

const EMPTY: ProjectFormValues = {
  name: '',
  accountName: '',
  stage: 'lead',
  probability: '10',
  expectedRevenue: '0',
  startAt: '',
  endAt: '',
  ownerName: '',
  progress: '0',
  milestones: [],
  deliverables: [],
  lostReason: '',
  note: '',
};

const digitsToNumber = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};

const clampPercent = (raw: string): number => Math.min(100, digitsToNumber(raw));

function toInput(values: ProjectFormValues): ProjectInput {
  return {
    name: values.name.trim(),
    accountName: values.accountName.trim(),
    stage: values.stage,
    probability: clampPercent(values.probability),
    expectedRevenue: digitsToNumber(values.expectedRevenue),
    startAt: values.startAt,
    endAt: values.endAt,
    ownerName: values.ownerName.trim(),
    progress: clampPercent(values.progress),
    milestones: values.milestones.map((milestone) => ({
      ...milestone,
      name: milestone.name.trim(),
    })),
    deliverables: values.deliverables.map((item) => item.trim()).filter((item) => item !== ''),
    lostReason: values.stage === 'lost' ? values.lostReason.trim() : '',
    note: values.note.trim(),
  };
}

function toValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    accountName: project.accountName,
    stage: project.stage,
    probability: String(project.probability),
    expectedRevenue: String(project.expectedRevenue),
    startAt: project.startAt,
    endAt: project.endAt,
    ownerName: project.ownerName,
    progress: String(project.progress),
    milestones: project.milestones.map((milestone) => ({ ...milestone })),
    deliverables: [...project.deliverables],
    lostReason: project.lostReason,
    note: project.note,
  };
}

export default function ProjectFormPage() {
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
  } = useCrudForm<Project, ProjectInput, ProjectFormValues>({
    resource: RESOURCE,
    adapter: projectAdapter,
    entityLabel: ENTITY_LABEL,
    listPath: LIST_PATH,
    schema: projectSchema,
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

  const stage = watch('stage');
  const startAt = watch('startAt');
  const endAt = watch('endAt');
  const milestones: readonly Milestone[] = watch('milestones');
  const deliverables = watch('deliverables');
  const probability = clampPercent(watch('probability'));
  const expectedRevenue = digitsToNumber(watch('expectedRevenue'));
  const periodError = errors.startAt?.message ?? errors.endAt?.message;

  const onStageChange = (next: PipelineStage) => {
    setValue('stage', next, { shouldDirty: true });
    // 단계를 바꾸면 확률을 그 단계 기본값으로 맞춘다(사용자가 다시 조정 가능).
    setValue('probability', String(defaultProbability(next)), { shouldDirty: true });
  };

  // [EXC-12] 404 와 서버 오류는 복구 수단이 다르다 — 이미 삭제된 항목에 '다시 시도'를 권하면
  // 영원히 실패하는 버튼을 누르게 된다.
  if (loadFailure !== null) {
    return (
      <div style={pageStyle}>
        <Alert tone="danger">
          <div style={alertActionRowStyle}>
            <span>
              {loadFailure === 'not-found'
                ? '프로젝트 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.'
                : '프로젝트 불러오지 못했습니다.'}
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
        <h1 style={pageTitleStyle}>{isEdit ? '프로젝트 수정' : '프로젝트 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 단계를 바꾸면 확률이 기본값으로 채워집니다.
        </p>
      </div>

      <form onSubmit={submit} noValidate style={pageStyle}>
        <FormServerError serverError={serverError} errorReference={errorReference} />

        <div style={layoutStyle}>
          <div style={columnStyle}>
            <Card>
              <CardTitle>기회 정보</CardTitle>

              <FormField
                htmlFor="project-name"
                label="프로젝트명"
                required
                error={errors.name?.message}
              >
                <input
                  id="project-name"
                  type="text"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.name !== undefined)}
                  maxLength={PROJECT_NAME_MAX}
                  placeholder="예: 한빛소프트 ERP 구축"
                  disabled={disabled}
                  aria-invalid={errors.name !== undefined}
                  aria-describedby={
                    errors.name !== undefined ? errorIdOf('project-name') : undefined
                  }
                  {...register('name')}
                />
              </FormField>

              <div style={rowStyle}>
                <FormField
                  htmlFor="project-account"
                  label="거래처"
                  required
                  error={errors.accountName?.message}
                >
                  <input
                    id="project-account"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.accountName !== undefined)}
                    placeholder="예: (주)한빛소프트웨어"
                    disabled={disabled}
                    aria-invalid={errors.accountName !== undefined}
                    aria-describedby={
                      errors.accountName !== undefined ? errorIdOf('project-account') : undefined
                    }
                    {...register('accountName')}
                  />
                </FormField>
                <FormField htmlFor="project-owner" label="담당자">
                  <input
                    id="project-owner"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(false)}
                    placeholder="예: 이영업"
                    disabled={disabled}
                    {...register('ownerName')}
                  />
                </FormField>
              </div>

              <div style={rowStyle}>
                <FormField htmlFor="project-stage" label="단계" required>
                  <SelectField
                    id="project-stage"
                    value={stage}
                    disabled={disabled}
                    onChange={(event) => {
                      const next = STAGES.find((meta) => meta.id === event.target.value);
                      if (next !== undefined) onStageChange(next.id);
                    }}
                  >
                    {STAGES.map((meta) => (
                      <option key={meta.id} value={meta.id}>
                        {meta.label}
                      </option>
                    ))}
                  </SelectField>
                </FormField>
                <FormField
                  htmlFor="project-probability"
                  label="확률 (%)"
                  error={errors.probability?.message}
                >
                  <input
                    id="project-probability"
                    type="text"
                    inputMode="numeric"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.probability !== undefined)}
                    placeholder="예: 70"
                    disabled={disabled}
                    {...register('probability')}
                  />
                </FormField>
                <FormField
                  htmlFor="project-revenue"
                  label="예상매출 (원)"
                  error={errors.expectedRevenue?.message}
                >
                  <input
                    id="project-revenue"
                    type="text"
                    inputMode="numeric"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.expectedRevenue !== undefined)}
                    placeholder="예: 42000000"
                    disabled={disabled}
                    {...register('expectedRevenue')}
                  />
                </FormField>
              </div>

              {stage === 'lost' && (
                <FormField
                  htmlFor="project-lost-reason"
                  label="실주 사유"
                  required
                  error={errors.lostReason?.message}
                >
                  <input
                    id="project-lost-reason"
                    type="text"
                    className="tds-ui-input tds-ui-focusable"
                    style={controlStyle(errors.lostReason !== undefined)}
                    placeholder="예: 경쟁사 대비 납기 조건 불리"
                    disabled={disabled}
                    {...register('lostReason')}
                  />
                </FormField>
              )}
            </Card>

            <Card>
              <CardTitle>기간 · 진척</CardTitle>
              <DateRangeField
                label="프로젝트 기간"
                required
                startValue={startAt}
                endValue={endAt}
                onStartChange={(value) => setValue('startAt', value, { shouldDirty: true })}
                onEndChange={(value) => setValue('endAt', value, { shouldDirty: true })}
                disabled={disabled}
                error={periodError}
              />
              <FormField
                htmlFor="project-progress"
                label="진척률 (%)"
                error={errors.progress?.message}
              >
                <input
                  id="project-progress"
                  type="text"
                  inputMode="numeric"
                  className="tds-ui-input tds-ui-focusable"
                  style={controlStyle(errors.progress !== undefined)}
                  placeholder="예: 40"
                  disabled={disabled}
                  {...register('progress')}
                />
              </FormField>
            </Card>

            <Card>
              <CardTitle>마일스톤</CardTitle>
              <ProjectMilestonesField
                milestones={milestones}
                disabled={disabled}
                onChange={(next) => setValue('milestones', [...next], { shouldDirty: true })}
                error={errors.milestones?.message}
              />
            </Card>

            <Card>
              <CardTitle>산출물 · 비고</CardTitle>
              <TextareaField
                label="산출물 (한 줄에 하나)"
                value={deliverables.join('\n')}
                onChange={(value) =>
                  setValue(
                    'deliverables',
                    value.split('\n').map((line) => line.trimStart()),
                    { shouldDirty: true },
                  )
                }
                maxLength={1000}
                disabled={disabled}
                placeholder={'예: 요구사항 정의서\n예: 구축 제안서'}
                rows={3}
              />
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
            <CardTitle>파이프라인</CardTitle>
            <div style={previewBodyStyle}>
              {stage === 'lost' ? (
                <StatusBadge tone={stageTone('lost')} label="실주 — 종료" />
              ) : (
                <Stepper steps={PIPELINE_STEPS} current={stage} ariaLabel="파이프라인 단계" />
              )}
              <div style={previewRowStyle}>
                <span style={fieldLabelStyle}>현재 단계</span>
                <StatusBadge tone={stageTone(stage)} label={stageLabel(stage)} />
              </div>
              <div style={previewRowStyle}>
                <span style={fieldLabelStyle}>예상매출</span>
                <span style={previewValueStyle}>{formatWon(expectedRevenue)}</span>
              </div>
              <div style={previewRowStyle}>
                <span style={fieldLabelStyle}>가중 예상매출 ({formatNumber(probability)}%)</span>
                <span style={previewValueStyle}>
                  {formatWon(weightedRevenue({ expectedRevenue, probability }))}
                </span>
              </div>
            </div>
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
