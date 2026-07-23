/**
 * Design System/Templates/Company/Careers — 채용 공고 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/careers` → 메뉴 en = "Company"(회사 소개), 화면 en =
 * "Careers" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Company 그룹의
 * `['/company/careers', '채용 공고', 'Careers']`).
 *
 * 대응 실화면: apps/admin/src/pages/company/careers/CareersListPage.tsx (라우트 /company/careers) 와
 * 그 규칙(types.ts) · 데이터(data-source.ts) · 공용 껍데기(shared/crud/CrudListShell).
 *
 * [상태 열은 저장된 값이 아니다 — 이 화면의 중심 판단] '마감' 을 컬럼으로 두면 그 값을 누군가
 * 바꿔 줘야 한다. 그런데 마감일이 지나는 순간은 아무도 로그인해 있지 않은 새벽 0시다 — 결국
 * 배치가 필요해지고, 배치가 하루 실패하면 지난 공고가 '모집 중' 으로 남아 지원서를 계속 받는다.
 * 마감은 **마감일과 오늘을 비교하면 나오는 사실**이다. 계산하면 언제나 맞는다.
 * 그리고 **마감일 당일까지는 모집 중**이다: 'D-day 에 지원서를 넣는 사람' 을 자정 기준으로 잘라
 * 내면 마지막 날이 사실상 없는 날이 된다.
 *
 * [상시 채용은 '마감일 없음' 이 아니라 1급 상태다] 마감일을 빈 문자열로 두고 '비었으면 상시' 로
 * 읽으면, 마감일을 **아직 안 정한** 공고와 상시 채용 공고가 같은 모양이 된다. 그래서
 * `closesOn: string | null` 이고 **null 은 의도**다 — 목록의 마감일 칸도 날짜 대신 '상시 채용'
 * 이라고 그 사실을 그대로 말한다.
 *
 * [정렬은 살아 있는 공고가 위] 상시 → 모집 중(먼 마감일 순) → 비공개. '오늘' 을 정렬에 넣지
 * 않는 이유는 같은 목록이 날짜마다 다른 순서로 저장되기 때문이다 — 마감일 내림차순이 같은 일을
 * 한다(지나간 날짜는 자연히 아래로 간다).
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   공고 제목·근무지 검색       → SearchField
 *   직무 · 고용형태 · 상태 필터  → SelectField ×3
 *   채용 공고 등록             → Button(primary) + Icon(plus-circle)
 *   전체선택 / 행 선택칸        → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                   → SeqHeaderCell · SeqCell
 *   마감일 칸(상시는 문구)       → 토큰 <span>
 *   상태 배지(파생)            → StatusBadge (비공개·상시 채용·모집 중·마감)
 *   행 액션(수정·삭제)         → RowActions
 *   선택 일괄 삭제 바          → SelectionBar + Button(danger)
 *   삭제 확인                 → ConfirmDialog(intent=delete)
 *   목록 표                   → Table
 *   빈 결과                   → Empty
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc·% 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/Careers',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 축 3종(실화면 types.ts 미러) ──────────────────────────────────────────────────────────── */

/** 직무 — 지원자가 자기 자리를 찾는 첫 축이다 */
const JOB_FUNCTIONS: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'planning', label: '기획' },
  { id: 'design', label: '디자인' },
  { id: 'engineering', label: '개발' },
  { id: 'sales', label: '영업' },
  { id: 'marketing', label: '마케팅' },
  { id: 'operations', label: '경영지원' },
];

/** 고용형태 — 지원 여부를 가르는 축이라 목록에 그대로 보인다 */
const EMPLOYMENT_TYPES: readonly { readonly id: string; readonly label: string }[] = [
  { id: 'full-time', label: '정규직' },
  { id: 'contract', label: '계약직' },
  { id: 'intern', label: '인턴' },
  { id: 'part-time', label: '시간제' },
];

const jobFunctionLabel = (id: string): string =>
  JOB_FUNCTIONS.find((option) => option.id === id)?.label ?? id;

const employmentTypeLabel = (id: string): string =>
  EMPLOYMENT_TYPES.find((option) => option.id === id)?.label ?? id;

interface DemoCareer {
  readonly id: string;
  readonly title: string;
  readonly jobFunction: string;
  readonly employmentType: string;
  /** 근무지 — '서울 성동구' 처럼 사람이 읽는 문자열. 원격이면 '원격' */
  readonly location: string;
  /** 마감일 'YYYY-MM-DD'. **null 은 상시 채용이다**(비어 있는 것이 아니다 — 머리말) */
  readonly closesOn: string | null;
  readonly applyMethod: string;
  readonly description: string;
  /** 비공개 저장 — 꺼져 있으면 홈페이지에 나가지 않는다 */
  readonly published: boolean;
}

/**
 * 공고의 지금 상태.
 *   draft  : 비공개 — 마감 여부를 따지기 전에 아직 나가지 않은 공고다
 *   always : 상시 채용 — 닫히지 않는다
 *   open   : 모집 중
 *   closed : 마감 — **마감일이 오늘보다 이전**이면 자동으로 이 상태다
 */
type CareerState = 'draft' | 'always' | 'open' | 'closed';

const CAREER_STATE_LABEL: Readonly<Record<CareerState, string>> = {
  draft: '비공개',
  always: '상시 채용',
  open: '모집 중',
  closed: '마감',
};

const CAREER_STATE_TONE: Readonly<Record<CareerState, StatusBadgeTone>> = {
  draft: 'neutral',
  always: 'info',
  open: 'success',
  closed: 'warning',
};

/** '오늘' — 스토리가 날짜에 흔들리지 않도록 고정한다(실화면은 렌더당 한 번만 만든다) */
const TODAY = '2026-07-22';

/** 마감일 **당일까지는 모집 중**이다(머리말) */
function careerStateOf(career: DemoCareer, today: string): CareerState {
  if (!career.published) return 'draft';
  if (career.closesOn === null) return 'always';
  return career.closesOn < today ? 'closed' : 'open';
}

/** 마감일 표기 — 상시 채용은 날짜가 없다는 사실을 그대로 말한다 */
const closesOnText = (career: DemoCareer): string => career.closesOn ?? '상시 채용';

/* ── 데모 데이터(실화면 CAREER_SEED 미러 — 네 상태가 다 있어야 파생이 도는지 볼 수 있다) ───── */

const DEMO_CAREERS: readonly DemoCareer[] = [
  {
    id: 'career-1',
    title: '공간 데이터 플랫폼 프론트엔드 개발자',
    jobFunction: 'engineering',
    employmentType: 'full-time',
    location: '서울 성동구 (재택 병행)',
    // 상시 채용 — 마감일이 '없다' 는 것이 값이다(빈 문자열이 아니다)
    closesOn: null,
    applyMethod: 'email',
    description:
      '공간 배치 데이터를 다루는 어드민과 고객 화면을 함께 만들어요. 디자인 시스템 기반 개발 경험이 있으면 좋아요.',
    published: true,
  },
  {
    id: 'career-4',
    title: '경영지원 담당자',
    jobFunction: 'operations',
    employmentType: 'contract',
    location: '원격',
    closesOn: '2026-09-05',
    applyMethod: 'email',
    description: '총무·회계 지원 업무를 담당해요. 공고 문구 검토 중이에요.',
    // 비공개 저장 — 초안을 잃지 않고 다듬을 수 있어야 한다
    published: false,
  },
  {
    id: 'career-2',
    title: '프로덕트 디자이너 (신규 서비스)',
    jobFunction: 'design',
    employmentType: 'full-time',
    location: '서울 성동구',
    closesOn: '2026-08-12',
    applyMethod: 'link',
    description: '신규 서비스의 화면 설계와 디자인 시스템 운영을 맡아요.',
    published: true,
  },
  {
    id: 'career-5',
    title: '퍼포먼스 마케터',
    jobFunction: 'marketing',
    employmentType: 'full-time',
    location: '서울 성동구',
    // 오늘이 마감일이다 — **당일까지는 모집 중**이라는 규칙이 이 행에서 보인다
    closesOn: TODAY,
    applyMethod: 'form',
    description: '유입 채널별 성과를 분석하고 예산을 배분해요.',
    published: true,
  },
  {
    id: 'career-3',
    title: '2026 상반기 영업 인턴',
    jobFunction: 'sales',
    employmentType: 'intern',
    location: '서울 성동구',
    // 이미 지난 마감일 — 아무도 손대지 않아도 목록에서 '마감' 으로 보여야 한다
    closesOn: '2026-07-13',
    applyMethod: 'email',
    description: '영업 제안서 작성과 고객 미팅 지원 업무를 함께해요.',
    published: true,
  },
];

/**
 * 정렬 — 살아 있는 공고가 위, 지난 공고가 아래.
 * 상시 채용은 맨 위(닫히지 않는 공고라 언제 봐도 지원할 수 있다), 비공개는 맨 아래
 * (아직 나가지 않은 것을 먼저 보여 줄 이유가 없다).
 */
function sortCareers(list: readonly DemoCareer[]): readonly DemoCareer[] {
  const rank = (career: DemoCareer): number => {
    if (!career.published) return 2;
    return career.closesOn === null ? 0 : 1;
  };
  return [...list].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    if (a.closesOn !== null && b.closesOn !== null && a.closesOn !== b.closesOn) {
      return a.closesOn < b.closesOn ? 1 : -1;
    }
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  });
}

/* ── 필터(실화면 filterCareers · searchCareers 미러) ───────────────────────────────────────── */

const CAREER_FILTER_ALL = 'all';

const STATE_OPTIONS: readonly { readonly id: CareerState; readonly label: string }[] = [
  { id: 'always', label: CAREER_STATE_LABEL.always },
  { id: 'open', label: CAREER_STATE_LABEL.open },
  { id: 'closed', label: CAREER_STATE_LABEL.closed },
  { id: 'draft', label: CAREER_STATE_LABEL.draft },
];

function filterCareers(
  list: readonly DemoCareer[],
  jobFunction: string,
  employmentType: string,
  state: string,
  today: string,
): readonly DemoCareer[] {
  return list.filter((career) => {
    if (jobFunction !== CAREER_FILTER_ALL && career.jobFunction !== jobFunction) return false;
    if (employmentType !== CAREER_FILTER_ALL && career.employmentType !== employmentType) {
      return false;
    }
    if (state !== CAREER_FILTER_ALL && careerStateOf(career, today) !== state) return false;
    return true;
  });
}

function searchCareers(list: readonly DemoCareer[], keyword: string): readonly DemoCareer[] {
  const needle = keyword.trim().toLowerCase();
  if (needle === '') return list;
  return list.filter((career) =>
    [career.title, career.location].some((field) => field.toLowerCase().includes(needle)),
  );
}

const ENTITY_LABEL = '채용 공고';
const SELECT_ALL_LABEL_ID = 'careers-select-all';
const PAGE_SIZE = 10;

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 표 열 정의(데이터 열 6개 — 선택·순번은 leading, 액션은 trailing) ─────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'title', header: '공고 제목' },
  { id: 'job', header: '직무', nowrap: true },
  { id: 'employment', header: '고용형태', nowrap: true },
  { id: 'location', header: '근무지', nowrap: true },
  { id: 'closesOn', header: '마감일', nowrap: true },
  { id: 'state', header: '상태', nowrap: true },
];

/* ── 스타일(토큰·rem·calc·% 만) ───────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.5'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const toolbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const filterWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
  flexGrow: 1,
  minWidth: 0,
};

const searchWrapStyle: CSSProperties = {
  flexGrow: 1,
  minWidth: 0,
  maxWidth: `calc(${cssVar('space.6')} * 10)`,
};

const selectWrapStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 5)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const dateTextStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

/** 상시 채용은 날짜가 아니라 사실이다 — 숫자 정렬 서체를 쓰지 않는다 */
const alwaysTextStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  whiteSpace: 'nowrap',
};

const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  textAlign: 'right',
};

const hintStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const tableScrollStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

const visuallyHidden: CSSProperties = {
  position: 'absolute',
  width: '0.0625rem',
  height: '0.0625rem',
  padding: 0,
  margin: '-0.0625rem',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

/* ── 제어형 화면(rules-of-hooks: Decorator 화살표가 아니라 Capitalized 컴포넌트에서 useState) ── */

interface CareersScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialJob?: string;
  readonly initialEmployment?: string;
  readonly initialState?: string;
  readonly initialSelectedIds?: readonly string[];
}

function CareersScreen({
  loading = false,
  initialKeyword = '',
  initialJob = CAREER_FILTER_ALL,
  initialEmployment = CAREER_FILTER_ALL,
  initialState = CAREER_FILTER_ALL,
  initialSelectedIds = [],
}: CareersScreenProps) {
  const [careers, setCareers] = useState<readonly DemoCareer[]>(() => sortCareers(DEMO_CAREERS));
  const [keyword, setKeyword] = useState(initialKeyword);
  const [job, setJob] = useState(initialJob);
  const [employment, setEmployment] = useState(initialEmployment);
  const [state, setState] = useState(initialState);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoCareer | null>(null);

  const visible = useMemo(
    () => searchCareers(filterCareers(careers, job, employment, state, TODAY), keyword),
    [careers, job, employment, state, keyword],
  );

  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;
  const hasActiveFilters =
    job !== CAREER_FILTER_ALL || employment !== CAREER_FILTER_ALL || state !== CAREER_FILTER_ALL;

  const toggleOne = (id: string, checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean): void => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const career of visible) {
        if (checked) next.add(career.id);
        else next.delete(career.id);
      }
      return next;
    });
  };

  const removeCareer = (id: string): void => {
    setCareers((prev) => prev.filter((career) => career.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((career, index) => {
    const current = careerStateOf(career, TODAY);
    return {
      id: career.id,
      onActivate: () => {
        /* 실화면: 행 클릭 → 공고 수정(/company/careers/:id/edit) */
      },
      selected: selectedIds.has(career.id),
      leading: [
        <RowSelectCell
          key="select"
          id={career.id}
          label={`${career.title} 선택`}
          checked={selectedIds.has(career.id)}
          onToggle={(checked) => toggleOne(career.id, checked)}
        />,
        <SeqCell key="seq" seq={index + 1} />,
      ],
      cells: [
        <span key="title">{career.title}</span>,
        <span key="job">{jobFunctionLabel(career.jobFunction)}</span>,
        <span key="employment">{employmentTypeLabel(career.employmentType)}</span>,
        <span key="location">{career.location}</span>,
        career.closesOn === null ? (
          <span key="closes-always" style={alwaysTextStyle}>
            {closesOnText(career)}
          </span>
        ) : (
          <span key="closes-date" style={dateTextStyle}>
            {closesOnText(career)}
          </span>
        ),
        <StatusBadge
          key="state"
          tone={CAREER_STATE_TONE[current]}
          label={CAREER_STATE_LABEL[current]}
        />,
      ],
      trailing: [
        <td key="actions" style={actionCellStyle}>
          <RowActions
            label={career.title}
            onEdit={() => {
              /* 실화면: 연필 → 공고 수정 */
            }}
            onDelete={() => setConfirming(career)}
          />
        </td>,
      ],
    };
  });

  const createButton = (
    <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
      채용 공고 등록
    </Button>
  );

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>채용 공고</h1>

      <div style={toolbarStyle}>
        <div style={filterWrapStyle}>
          <span style={searchWrapStyle}>
            <SearchField
              value={keyword}
              onChange={setKeyword}
              label="공고 제목·근무지 검색"
              placeholder="공고 제목 · 근무지"
            />
          </span>
          <span style={selectWrapStyle}>
            <SelectField
              value={job}
              aria-label="직무 필터"
              onChange={(event) => setJob(event.target.value)}
            >
              <option value={CAREER_FILTER_ALL}>전체 직무</option>
              {JOB_FUNCTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </span>
          <span style={selectWrapStyle}>
            <SelectField
              value={employment}
              aria-label="고용형태 필터"
              onChange={(event) => setEmployment(event.target.value)}
            >
              <option value={CAREER_FILTER_ALL}>전체 고용형태</option>
              {EMPLOYMENT_TYPES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </span>
          <span style={selectWrapStyle}>
            <SelectField
              value={state}
              aria-label="상태 필터"
              onChange={(event) => setState(event.target.value)}
            >
              <option value={CAREER_FILTER_ALL}>전체 상태</option>
              {STATE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </span>
        </div>
        {createButton}
      </div>

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button
          variant="danger"
          onClick={() => {
            for (const id of selectedIds) removeCareer(id);
          }}
        >
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <div style={tableScrollStyle}>
        <Table
          caption="채용 공고 목록 — 상태는 저장값이 아니라 마감일과 오늘의 비교에서 나와요. 행을 누르면 공고 수정으로 이동해요."
          columns={COLUMNS}
          rows={rows}
          leadingHead={[
            <SelectAllHeaderCell
              key="select-all"
              label="이 페이지의 공고 전체 선택"
              labelId={SELECT_ALL_LABEL_ID}
              selection={selection}
              onToggleAll={toggleAll}
            />,
            <SeqHeaderCell key="seq" />,
          ]}
          trailingHead={[
            <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
              <span style={visuallyHidden}>행 액션</span>
            </th>,
          ]}
          loading={loading}
          skeletonRows={PAGE_SIZE}
          empty={
            <EmptyState
              label={ENTITY_LABEL}
              hasQuery={keyword.trim() !== ''}
              hasActiveFilters={hasActiveFilters}
              onClearSearch={() => setKeyword('')}
              onResetFilters={() => {
                setJob(CAREER_FILTER_ALL);
                setEmployment(CAREER_FILTER_ALL);
                setState(CAREER_FILTER_ALL);
              }}
              action={createButton}
            />
          }
        />
      </div>

      <p style={hintStyle}>
        마감 여부는 저장하지 않아요 — 마감일과 오늘을 비교해 매번 계산하므로, 아무도 손대지 않아도
        마감일 다음 날부터 &apos;마감&apos; 으로 보여요. 마감일 당일까지는 모집 중이에요.
      </p>

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="채용 공고 삭제"
          message={`'${confirming.title}' 공고를 삭제할까요? 되돌릴 수 없어요.`}
          confirmLabel="공고 삭제"
          onConfirm={() => {
            removeCareer(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/**
 * 정상: 네 상태가 한 화면에 다 있다 — 상시 채용(맨 위) · 모집 중 · **오늘이 마감일인 공고(아직
 * 모집 중)** · 이미 지난 마감(자동으로 마감) · 비공개(맨 아래).
 */
export const Default: Story = {
  render: () => <CareersScreen />,
};

/** 최초 로드: 표 스켈레톤 — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <CareersScreen loading />,
};

/** 상태 필터(마감): 아무도 손대지 않았는데 마감으로 넘어간 공고만 남는다 — 파생값이라 언제나 맞는다 */
export const ClosedOnly: Story = {
  render: () => <CareersScreen initialState="closed" />,
};

/** 상태 필터(비공개): 아직 나가지 않은 초안 — 마감 여부를 따지기 전의 상태다 */
export const DraftOnly: Story = {
  render: () => <CareersScreen initialState="draft" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <CareersScreen initialSelectedIds={['career-2', 'career-3']} />,
};

/** 빈 결과: 직무 + 검색이 맞지 않음 — Empty(검색 지우기 · 필터 초기화 · 등록) */
export const Empty: Story = {
  render: () => <CareersScreen initialJob="planning" initialKeyword="디자이너" />,
};
