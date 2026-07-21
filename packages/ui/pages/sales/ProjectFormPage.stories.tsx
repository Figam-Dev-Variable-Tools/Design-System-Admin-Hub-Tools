/**
 * Design System/Templates/Sales/Project Form — 프로젝트 등록/수정 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Sales"(영업 관리)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Sales 그룹 Projects 엔트리에서 확정된다.
 *
 * 대응 실화면: apps/admin/src/pages/sales/projects/ProjectFormPage.tsx (라우트 /sales/projects/new · /:id/edit).
 * 실화면은 승격된 CRUD 프레임워크(useCrudForm) 위에 입력 카드(기회정보·기간·진척·마일스톤·산출물)와
 * 우측 파이프라인 스텝퍼/가중예상매출 미리보기 2단으로 구성한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 앱 조각을 DS 표면으로 갈음한다:
 *   뒤로가기(FormPageShell)         → Button/링크(ghost) + Icon(chevron-left)
 *   페이지 제목(pageTitleStyle)      → 토큰만 쓴 <h1>(title.xl)
 *   카드 표면 · 카드 제목(CardTitle)  → Card + 토큰만 쓴 <h2>(CardTitle 은 앱 조각 — 토큰 레이아웃으로 대체)
 *   입력 필드(FormField+input)        → FormField + 토큰만 쓴 <input>
 *   단계 선택                        → SelectField
 *   기간                             → DateRangeField
 *   마일스톤(ProjectMilestonesField)  → FormField 라벨 + input·ToggleSwitch·IconButton 행 편집기
 *   산출물·메모                       → TextareaField
 *   파이프라인 스텝퍼(PipelineStepper) → Stepper (실주는 흐름 밖 — StatusBadge)
 *   단계/예상매출 배지                → StatusBadge
 *   상세 조회 스켈레톤                → Skeleton
 *   저장/취소                        → Button(primary/secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { useId, useState } from 'react';

import {
  Button,
  Card,
  DateRangeField,
  FormField,
  Icon,
  IconButton,
  SelectField,
  Skeleton,
  StatusBadge,
  Stepper,
  TextareaField,
  ToggleSwitch,
  cssVar,
  typography,
} from '../../src';
import type { StatusBadgeTone } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Sales/Project Form',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 상수 · 데모 데이터(실화면 pages/sales/projects/types 미러) ─────────────────────────────────── */

const PROJECT_NAME_MAX = 80;
const PROJECT_MAX_MILESTONES = 12;

type PipelineStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface StageMeta {
  readonly id: PipelineStage;
  readonly label: string;
  readonly probability: number;
  readonly inFlow: boolean;
  readonly tone: StatusBadgeTone;
}

/** 파이프라인 단계 메타 — 실화면 types.STAGES 미러(순서·기본확률·정상흐름 여부·tone) */
const STAGES: readonly StageMeta[] = [
  { id: 'lead', label: '리드', probability: 10, inFlow: true, tone: 'neutral' },
  { id: 'qualified', label: '상담', probability: 30, inFlow: true, tone: 'info' },
  { id: 'proposal', label: '제안', probability: 50, inFlow: true, tone: 'info' },
  { id: 'negotiation', label: '협상', probability: 70, inFlow: true, tone: 'warning' },
  { id: 'won', label: '수주', probability: 100, inFlow: true, tone: 'success' },
  { id: 'lost', label: '실주', probability: 0, inFlow: false, tone: 'danger' },
];

/** 정상 진행 흐름(실주 제외) — 스텝퍼가 쓴다 */
const PIPELINE_STEPS = STAGES.filter((stage) => stage.inFlow).map((stage) => ({
  id: stage.id,
  label: stage.label,
}));

const STAGE_BY_ID = Object.fromEntries(STAGES.map((meta) => [meta.id, meta])) as Record<
  PipelineStage,
  StageMeta
>;
const stageMeta = (stage: PipelineStage): StageMeta => STAGE_BY_ID[stage];
const stageLabel = (stage: PipelineStage): string => stageMeta(stage).label;
const stageTone = (stage: PipelineStage): StatusBadgeTone => stageMeta(stage).tone;
const defaultProbability = (stage: PipelineStage): number => stageMeta(stage).probability;

/** 가중 예상매출 = 예상매출 × 확률/100 (반올림) — 실화면 weightedRevenue 미러 */
const weightedRevenue = (expectedRevenue: number, probability: number): number =>
  Math.round((expectedRevenue * probability) / 100);

const fmt = (value: number): string => value.toLocaleString('ko-KR');
const formatWon = (amount: number): string => `${fmt(amount)}원`;
const digitsToNumber = (raw: string): number => {
  const digits = raw.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits);
};
const clampPercent = (raw: string): number => Math.min(100, digitsToNumber(raw));

interface DemoMilestone {
  readonly id: string;
  readonly name: string;
  readonly dueDate: string;
  readonly done: boolean;
}

interface SeedValues {
  readonly name: string;
  readonly accountName: string;
  readonly ownerName: string;
  readonly stage: PipelineStage;
  readonly probability: string;
  readonly expectedRevenue: string;
  readonly startAt: string;
  readonly endAt: string;
  readonly progress: string;
  readonly lostReason: string;
  readonly milestones: readonly DemoMilestone[];
  readonly deliverables: string;
  readonly note: string;
}

const EMPTY_SEED: SeedValues = {
  name: '',
  accountName: '',
  ownerName: '',
  stage: 'lead',
  probability: '10',
  expectedRevenue: '0',
  startAt: '',
  endAt: '',
  progress: '0',
  lostReason: '',
  milestones: [],
  deliverables: '',
  note: '',
};

const EDIT_SEED: SeedValues = {
  name: '한빛소프트 ERP 구축',
  accountName: '(주)한빛소프트웨어',
  ownerName: '이영업',
  stage: 'negotiation',
  probability: '70',
  expectedRevenue: '42000000',
  startAt: '2026-03-02',
  endAt: '2026-09-30',
  progress: '40',
  lostReason: '',
  milestones: [
    { id: 'ms-1', name: '요구사항 확정', dueDate: '2026-03-20', done: true },
    { id: 'ms-2', name: '중간 보고', dueDate: '2026-06-15', done: false },
    { id: 'ms-3', name: '오픈', dueDate: '2026-09-25', done: false },
  ],
  deliverables: '요구사항 정의서\n구축 제안서',
  note: '경쟁 3사 참여. 납기 조건이 관건.',
};

/** 검증 오류 데모 — 실화면 zod 스키마가 내는 문구를 대표값으로 미러 */
interface FieldErrors {
  readonly name?: string;
  readonly accountName?: string;
  readonly probability?: string;
  readonly expectedRevenue?: string;
  readonly period?: string;
  readonly progress?: string;
}

const DEMO_ERRORS: FieldErrors = {
  name: '프로젝트명을 입력하세요.',
  accountName: '거래처를 입력하세요.',
  probability: '확률은 0~100 사이여야 합니다.',
  expectedRevenue: '예상매출을 입력하세요.',
  period: '종료일은 시작일과 같거나 뒤여야 합니다.',
  progress: '진척률은 0~100 사이여야 합니다.',
};

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  alignSelf: 'flex-start',
  color: cssVar('color.text.muted'),
  textDecoration: 'none',
  ...typography('typography.label.md'),
};

const pageTitleStyle: CSSProperties = {
  margin: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.xl'),
};

const descriptionStyle: CSSProperties = {
  marginTop: cssVar('space.1'),
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.muted'),
  ...typography('typography.label.md'),
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

const cardBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  minWidth: 0,
};

const cardTitleStyle: CSSProperties = {
  ...typography('typography.title.md'),
  margin: 0,
  color: cssVar('color.text.default'),
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fit, minmax(calc(${cssVar('space.6')} * 4), 1fr))`,
  gap: cssVar('space.4'),
};

const controlStyle = (invalid: boolean): CSSProperties => ({
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: invalid ? cssVar('color.feedback.danger.border') : cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  ...typography('typography.label.md'),
});

const fieldLabelStyle: CSSProperties = {
  ...typography('typography.label.md'),
  color: cssVar('color.text.default'),
};

const hintStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const milestoneRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `minmax(0, 1fr) minmax(calc(${cssVar('space.6')} * 3), auto) auto auto`,
  gap: cssVar('space.2'),
  alignItems: 'center',
};

const milestonesWrapStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
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

const skeletonBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

/* ── 카드 제목 조립(DS Card 는 표면만 소유 — 제목 <h2> 는 토큰만으로 조립하고 aria 로 잇는다) ── */

function FormCard({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId}>
      <div style={cardBodyStyle}>
        <h2 id={titleId} style={cardTitleStyle}>
          {title}
        </h2>
        {children}
      </div>
    </Card>
  );
}

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface ProjectFormScreenProps {
  readonly isEdit?: boolean;
  /** 상세 조회 스켈레톤 — FormPageShell loadingDetail 미러 */
  readonly loadingDetail?: boolean;
  /** 검증 오류 노출 — 제출 실패 상태 재현 */
  readonly errors?: FieldErrors;
  readonly seed?: SeedValues;
}

function ProjectFormScreen({
  isEdit = false,
  loadingDetail = false,
  errors = {},
  seed = EMPTY_SEED,
}: ProjectFormScreenProps) {
  const [name, setName] = useState(seed.name);
  const [accountName, setAccountName] = useState(seed.accountName);
  const [ownerName, setOwnerName] = useState(seed.ownerName);
  const [stage, setStage] = useState<PipelineStage>(seed.stage);
  const [probability, setProbability] = useState(seed.probability);
  const [expectedRevenue, setExpectedRevenue] = useState(seed.expectedRevenue);
  const [startAt, setStartAt] = useState(seed.startAt);
  const [endAt, setEndAt] = useState(seed.endAt);
  const [progress, setProgress] = useState(seed.progress);
  const [lostReason, setLostReason] = useState(seed.lostReason);
  const [milestones, setMilestones] = useState<readonly DemoMilestone[]>(seed.milestones);
  const [deliverables, setDeliverables] = useState(seed.deliverables);
  const [note, setNote] = useState(seed.note);

  const nameId = useId();
  const accountId = useId();
  const ownerId = useId();
  const stageId = useId();
  const probabilityId = useId();
  const revenueId = useId();
  const lostReasonId = useId();
  const progressId = useId();

  // 단계를 바꾸면 확률을 그 단계 기본값으로 맞춘다 — 실화면 onStageChange 미러
  const onStageChange = (next: PipelineStage): void => {
    setStage(next);
    setProbability(String(defaultProbability(next)));
  };

  const patchMilestone = (id: string, part: Partial<DemoMilestone>): void => {
    setMilestones((prev) => prev.map((ms) => (ms.id === id ? { ...ms, ...part } : ms)));
  };
  const removeMilestone = (id: string): void => {
    setMilestones((prev) => prev.filter((ms) => ms.id !== id));
  };
  const addMilestone = (): void => {
    setMilestones((prev) =>
      prev.length >= PROJECT_MAX_MILESTONES
        ? prev
        : [...prev, { id: `ms-new-${String(prev.length)}`, name: '', dueDate: '', done: false }],
    );
  };

  const revenueNum = digitsToNumber(expectedRevenue);
  const probabilityNum = clampPercent(probability);

  return (
    <div style={pageStyle}>
      <a href="#project-list" style={backLinkStyle}>
        <Icon name="chevron-left" />
        목록으로
      </a>

      <div>
        <h1 style={pageTitleStyle}>{isEdit ? '프로젝트 수정' : '프로젝트 등록'}</h1>
        <p style={descriptionStyle}>
          별표(*) 항목은 필수입니다. 단계를 바꾸면 확률이 기본값으로 채워집니다.
        </p>
      </div>

      <form onSubmit={(event) => event.preventDefault()} noValidate>
        <div style={layoutStyle}>
          <div style={columnStyle}>
            <FormCard title="기회 정보">
              {loadingDetail ? (
                <div style={skeletonBodyStyle} aria-busy="true">
                  {[0, 1, 2, 3].map((row) => (
                    <Skeleton key={`row-${String(row)}`} />
                  ))}
                </div>
              ) : (
                <>
                  <FormField
                    htmlFor={nameId}
                    label="프로젝트명"
                    required
                    {...(errors.name !== undefined && { error: errors.name })}
                  >
                    <input
                      id={nameId}
                      type="text"
                      style={controlStyle(errors.name !== undefined)}
                      maxLength={PROJECT_NAME_MAX}
                      placeholder="예: 한빛소프트 ERP 구축"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </FormField>

                  <div style={rowStyle}>
                    <FormField
                      htmlFor={accountId}
                      label="거래처"
                      required
                      {...(errors.accountName !== undefined && { error: errors.accountName })}
                    >
                      <input
                        id={accountId}
                        type="text"
                        style={controlStyle(errors.accountName !== undefined)}
                        placeholder="예: (주)한빛소프트웨어"
                        value={accountName}
                        onChange={(event) => setAccountName(event.target.value)}
                      />
                    </FormField>
                    <FormField htmlFor={ownerId} label="담당자">
                      <input
                        id={ownerId}
                        type="text"
                        style={controlStyle(false)}
                        placeholder="예: 이영업"
                        value={ownerName}
                        onChange={(event) => setOwnerName(event.target.value)}
                      />
                    </FormField>
                  </div>

                  <div style={rowStyle}>
                    <FormField htmlFor={stageId} label="단계" required>
                      <SelectField
                        id={stageId}
                        value={stage}
                        onChange={(event) => onStageChange(event.target.value as PipelineStage)}
                      >
                        {STAGES.map((meta) => (
                          <option key={meta.id} value={meta.id}>
                            {meta.label}
                          </option>
                        ))}
                      </SelectField>
                    </FormField>
                    <FormField
                      htmlFor={probabilityId}
                      label="확률 (%)"
                      {...(errors.probability !== undefined && { error: errors.probability })}
                    >
                      <input
                        id={probabilityId}
                        type="text"
                        inputMode="numeric"
                        style={controlStyle(errors.probability !== undefined)}
                        placeholder="예: 70"
                        value={probability}
                        onChange={(event) => setProbability(event.target.value)}
                      />
                    </FormField>
                    <FormField
                      htmlFor={revenueId}
                      label="예상매출 (원)"
                      {...(errors.expectedRevenue !== undefined && {
                        error: errors.expectedRevenue,
                      })}
                    >
                      <input
                        id={revenueId}
                        type="text"
                        inputMode="numeric"
                        style={controlStyle(errors.expectedRevenue !== undefined)}
                        placeholder="예: 42000000"
                        value={expectedRevenue}
                        onChange={(event) => setExpectedRevenue(event.target.value)}
                      />
                    </FormField>
                  </div>

                  {stage === 'lost' && (
                    <FormField htmlFor={lostReasonId} label="실주 사유" required>
                      <input
                        id={lostReasonId}
                        type="text"
                        style={controlStyle(false)}
                        placeholder="예: 경쟁사 대비 납기 조건 불리"
                        value={lostReason}
                        onChange={(event) => setLostReason(event.target.value)}
                      />
                    </FormField>
                  )}
                </>
              )}
            </FormCard>

            <FormCard title="기간 · 진척">
              <DateRangeField
                label="프로젝트 기간"
                required
                startValue={startAt}
                endValue={endAt}
                onStartChange={setStartAt}
                onEndChange={setEndAt}
                error={errors.period}
              />
              <FormField
                htmlFor={progressId}
                label="진척률 (%)"
                {...(errors.progress !== undefined && { error: errors.progress })}
              >
                <input
                  id={progressId}
                  type="text"
                  inputMode="numeric"
                  style={controlStyle(errors.progress !== undefined)}
                  placeholder="예: 40"
                  value={progress}
                  onChange={(event) => setProgress(event.target.value)}
                />
              </FormField>
            </FormCard>

            <FormCard title="마일스톤">
              <span style={fieldLabelStyle}>마일스톤</span>
              <p style={hintStyle}>
                {`주요 마일스톤을 등록하세요. 완료 표시에 따라 진척률이 계산됩니다. (최대 ${String(PROJECT_MAX_MILESTONES)}개)`}
              </p>
              <div style={milestonesWrapStyle}>
                {milestones.map((milestone, index) => (
                  <div key={milestone.id} style={milestoneRowStyle}>
                    <input
                      type="text"
                      style={controlStyle(false)}
                      value={milestone.name}
                      placeholder={`마일스톤 ${String(index + 1)} (예: 계약 체결)`}
                      aria-label={`마일스톤 ${String(index + 1)} 이름`}
                      onChange={(event) =>
                        patchMilestone(milestone.id, { name: event.target.value })
                      }
                    />
                    <input
                      type="date"
                      style={controlStyle(false)}
                      value={milestone.dueDate}
                      aria-label={`마일스톤 ${String(index + 1)} 목표일`}
                      onChange={(event) =>
                        patchMilestone(milestone.id, { dueDate: event.target.value })
                      }
                    />
                    <ToggleSwitch
                      checked={milestone.done}
                      onChange={(next) => patchMilestone(milestone.id, { done: next })}
                      label={`마일스톤 ${String(index + 1)} 완료 여부`}
                      onLabel="완료"
                      offLabel="진행"
                    />
                    <IconButton
                      icon={<Icon name="trash" />}
                      label={`마일스톤 ${String(index + 1)} 삭제`}
                      size="sm"
                      onClick={() => removeMilestone(milestone.id)}
                    />
                  </div>
                ))}
              </div>
              {milestones.length < PROJECT_MAX_MILESTONES && (
                <span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    iconLeft={<Icon name="plus-circle" />}
                    onClick={addMilestone}
                  >
                    마일스톤 추가
                  </Button>
                </span>
              )}
            </FormCard>

            <FormCard title="산출물 · 비고">
              <TextareaField
                label="산출물 (한 줄에 하나)"
                value={deliverables}
                onChange={setDeliverables}
                maxLength={1000}
                placeholder={'예: 요구사항 정의서\n예: 구축 제안서'}
                rows={3}
              />
              <TextareaField
                label="메모"
                value={note}
                onChange={setNote}
                maxLength={500}
                placeholder="내부 메모"
                rows={2}
              />
            </FormCard>
          </div>

          <FormCard title="파이프라인">
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
                <span style={previewValueStyle}>{formatWon(revenueNum)}</span>
              </div>
              <div style={previewRowStyle}>
                <span style={fieldLabelStyle}>{`가중 예상매출 (${fmt(probabilityNum)}%)`}</span>
                <span style={previewValueStyle}>
                  {formatWon(weightedRevenue(revenueNum, probabilityNum))}
                </span>
              </div>
            </div>
          </FormCard>
        </div>

        <div style={actionsStyle}>
          <Button type="button" variant="secondary" size="md">
            취소
          </Button>
          <Button type="submit" variant="primary" size="md">
            {isEdit ? '저장' : '등록'}
          </Button>
        </div>
      </form>
    </div>
  );
}

/** 정상(등록): 빈 폼 — 신규 프로젝트 입력(단계 리드 · 확률 기본값) */
export const Default: Story = {
  render: () => <ProjectFormScreen />,
};

/** 수정: 기존 값이 채워진 폼(마일스톤·파이프라인 미리보기 포함) */
export const Edit: Story = {
  render: () => <ProjectFormScreen isEdit seed={EDIT_SEED} />,
};

/** 로딩: 상세 조회 중 첫 카드 본문 스켈레톤(FormPageShell loadingDetail 미러) */
export const Loading: Story = {
  render: () => <ProjectFormScreen isEdit loadingDetail seed={EDIT_SEED} />,
};

/** 검증 오류: 필수 항목을 비우고 제출했을 때 각 필드 인라인 오류 노출 */
export const ValidationError: Story = {
  render: () => <ProjectFormScreen errors={DEMO_ERRORS} seed={EMPTY_SEED} />,
};
