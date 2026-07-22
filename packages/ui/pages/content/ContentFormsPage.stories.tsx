/**
 * Design System/Templates/Content/Forms — 폼 관리 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/content/forms` → 메뉴 en = "Content"(콘텐츠 관리), 화면 en =
 * "Forms" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Content 그룹의
 * `['/content/forms', '폼 관리', 'Forms']`).
 *
 * 대응 실화면: apps/admin/src/pages/content/forms/ContentFormsPage.tsx (라우트 /content/forms) 와
 * 그 규칙(types.ts) · 데이터(data-source.ts) · 공용 껍데기(shared/crud/CrudListShell).
 *
 * [무엇을 관리하나] 홈페이지가 띄우는 **문의 폼의 항목 구성**이다. 지금까지 문의 폼의 칸은 코드에
 * 고정돼 있어 '도면 첨부' 한 칸을 더하려면 배포가 필요했다 — 견적형 커머스에서 파일 업로드는
 * 곁가지가 아니라 문의 그 자체다.
 *
 * [세는 것은 '보이는 항목' 이다] 항목 수 열은 숨긴 항목을 빼고 센다. 숨긴 칸은 방문자에게 나오지
 * 않으므로, 그것까지 세면 목록의 숫자와 실제 폼의 칸 수가 어긋나 그 숫자는 아무 뜻이 없어진다.
 *
 * [개인정보 동의 열이 목록에 있는 이유] 동의 항목이 없는 폼을 발행하면 **동의 없이 개인정보를
 * 수집하는 폼**이 된다. 그 사실은 폼을 열어 봐야 알 수 있는 것이 아니라 목록에서 한눈에 보여야
 * 한다. 그래서 이 열은 '있음/없음' 을 성공/위험 색으로 갈라 놓는다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   폼 이름 검색              → SearchField
 *   상태 필터(전체·초안·발행)   → SelectField
 *   폼 등록                  → Button(primary) + Icon(plus-circle)
 *   전체선택 / 행 선택칸       → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                  → SeqHeaderCell · SeqCell
 *   폼 이름 셀(이름 + 설명)    → 토큰만 쓴 <span> 2줄
 *   상태 배지                → StatusBadge (초안 neutral · 발행 success)
 *   개인정보 동의 유무         → StatusBadge (있음 success · 없음 danger)
 *   행 액션(수정·삭제)        → RowActions
 *   선택 일괄 삭제 바         → SelectionBar + Button(danger)
 *   삭제 확인                → ConfirmDialog(intent=delete)
 *   목록 표                  → Table
 *   빈 결과                  → Empty
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
  title: 'Design System/Templates/Content/Forms',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 어휘(실화면 types.ts 미러) ─────────────────────────────────────────────────────── */

/** 일반 입력 9종 — 홈페이지가 그릴 수 있는 컨트롤의 전부다 */
type FormFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'textarea'
  | 'select'
  | 'multi-select'
  | 'checkbox'
  | 'radio'
  | 'file';

/** 개인정보 동의 — 위 9종과 **나란한 별개**다(필수 해제 불가·숨김 불가·폼당 1개) */
const CONSENT_FIELD_KIND = 'privacy-consent';

type FormFieldKind = FormFieldType | typeof CONSENT_FIELD_KIND;

interface DemoField {
  readonly id: string;
  readonly kind: FormFieldKind;
  readonly label: string;
  readonly required: boolean;
  /** 숨김 — 새 응답에는 나오지 않지만 지난 응답은 계속 읽힌다 */
  readonly hidden: boolean;
}

/**
 * 폼의 상태 — 초안과 발행 둘뿐이다.
 * 예약·보관을 두지 않는 이유: 폼은 콘텐츠가 아니라 **접수 창구**다. 창구는 열려 있거나 닫혀
 * 있을 뿐이고, '언제부터 열림' 은 그 창구를 거는 페이지가 정한다.
 */
type ContentFormStatus = 'draft' | 'published';

const FORM_STATUS_LABEL: Readonly<Record<ContentFormStatus, string>> = {
  draft: '초안',
  published: '발행',
};

const FORM_STATUS_TONE: Readonly<Record<ContentFormStatus, StatusBadgeTone>> = {
  draft: 'neutral',
  published: 'success',
};

interface DemoForm {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly status: ContentFormStatus;
  /** 접수 알림을 받는 담당자 — 비면 응답이 아무에게도 닿지 않는다 */
  readonly recipients: readonly string[];
  readonly fields: readonly DemoField[];
  readonly updatedAt: string;
}

/** 방문자에게 실제로 보이는 항목 — 목록의 '항목 수' 가 세는 것도 이것이다 */
const activeFields = (fields: readonly DemoField[]): readonly DemoField[] =>
  fields.filter((field) => !field.hidden);

const hasConsentField = (fields: readonly DemoField[]): boolean =>
  fields.some((field) => field.kind === CONSENT_FIELD_KIND && !field.hidden);

/* ── 데모 데이터(실화면 data-source.ts 의 SEED 미러) ────────────────────────────────────────── */

const CONSENT_LABEL = '개인정보 수집·이용에 동의합니다';

const DEMO_FORMS: readonly DemoForm[] = [
  {
    id: 'fm-003',
    name: '채용 지원',
    description: '작성 중입니다. 아직 홈페이지에 걸려 있지 않습니다.',
    status: 'draft',
    recipients: ['people@example.com'],
    // 동의 항목이 없다 — 초안이라 저장은 되지만 이 상태로는 발행되지 않는다
    fields: [
      { id: 'fd-201', kind: 'text', label: '이름', required: true, hidden: false },
      { id: 'fd-202', kind: 'email', label: '이메일', required: true, hidden: false },
      { id: 'fd-203', kind: 'file', label: '포트폴리오', required: true, hidden: false },
    ],
    updatedAt: '2026-07-02T09:10',
  },
  {
    id: 'fm-002',
    name: '견적 요청',
    description: '규모·일정이 정해진 프로젝트의 견적 요청을 받습니다.',
    status: 'published',
    recipients: ['sales@example.com'],
    fields: [
      { id: 'fd-101', kind: 'text', label: '회사명', required: true, hidden: false },
      { id: 'fd-102', kind: 'email', label: '이메일', required: true, hidden: false },
      { id: 'fd-103', kind: 'number', label: '예상 면적(㎡)', required: false, hidden: false },
      { id: 'fd-104', kind: 'radio', label: '희망 착수 시기', required: true, hidden: false },
      {
        id: 'fd-105',
        kind: 'multi-select',
        label: '필요한 서비스',
        required: false,
        hidden: false,
      },
      { id: 'fd-106', kind: 'file', label: '참고 자료', required: false, hidden: false },
      // 숨긴 항목 — 지우지 않고 내린 것이다. 항목 수에는 세지 않는다
      { id: 'fd-107', kind: 'text', label: '추천인', required: false, hidden: true },
      {
        id: 'fd-108',
        kind: CONSENT_FIELD_KIND,
        label: CONSENT_LABEL,
        required: true,
        hidden: false,
      },
    ],
    updatedAt: '2026-06-24T15:30',
  },
  {
    id: 'fm-001',
    name: '사업 문의',
    description: '홈페이지 하단 문의 버튼이 여는 기본 폼입니다.',
    status: 'published',
    recipients: ['sales@example.com', 'cs@example.com'],
    fields: [
      { id: 'fd-001', kind: 'text', label: '회사명', required: true, hidden: false },
      { id: 'fd-002', kind: 'text', label: '담당자명', required: true, hidden: false },
      { id: 'fd-003', kind: 'email', label: '이메일', required: true, hidden: false },
      { id: 'fd-004', kind: 'text', label: '연락처', required: false, hidden: false },
      { id: 'fd-005', kind: 'select', label: '문의 유형', required: true, hidden: false },
      { id: 'fd-006', kind: 'textarea', label: '문의 내용', required: true, hidden: false },
      { id: 'fd-007', kind: 'file', label: '도면·사양서 첨부', required: false, hidden: false },
      {
        id: 'fd-008',
        kind: CONSENT_FIELD_KIND,
        label: CONSENT_LABEL,
        required: true,
        hidden: false,
      },
    ],
    updatedAt: '2026-06-20T11:00',
  },
];

/* ── 필터(실화면 FORM_STATUS_FILTERS · filterContentForms 미러) ─────────────────────────────── */

type FormStatusFilter = ContentFormStatus | 'all';

const FORM_STATUS_FILTERS: readonly { readonly id: FormStatusFilter; readonly label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'draft', label: '초안' },
  { id: 'published', label: '발행' },
];

function filterForms(
  list: readonly DemoForm[],
  status: FormStatusFilter,
  keyword: string,
): readonly DemoForm[] {
  const needle = keyword.trim().toLowerCase();
  return list.filter((form) => {
    if (status !== 'all' && form.status !== status) return false;
    if (needle === '') return true;
    return form.name.toLowerCase().includes(needle);
  });
}

const ENTITY_LABEL = '폼';
const SELECT_ALL_LABEL_ID = 'content-forms-select-all';
const PAGE_SIZE = 10;

const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 표 열 정의(데이터 열 6개 — 선택·순번은 leading, 액션은 trailing) ─────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '폼 이름' },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'fields', header: '항목', align: 'end', nowrap: true },
  { id: 'consent', header: '개인정보 동의', nowrap: true },
  { id: 'recipients', header: '수신 담당자' },
  { id: 'updatedAt', header: '최근 수정', nowrap: true },
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

const toolbarLeftStyle: CSSProperties = {
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
  maxWidth: `calc(${cssVar('space.6')} * 12)`,
};

const filterSlotStyle: CSSProperties = {
  display: 'inline-flex',
  minInlineSize: `calc(${cssVar('space.6')} * 5)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const nameCellStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const mutedStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  overflowWrap: 'anywhere',
};

const stampStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
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

interface ContentFormsScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialStatus?: FormStatusFilter;
  readonly initialSelectedIds?: readonly string[];
}

function ContentFormsScreen({
  loading = false,
  initialKeyword = '',
  initialStatus = 'all',
  initialSelectedIds = [],
}: ContentFormsScreenProps) {
  const [forms, setForms] = useState<readonly DemoForm[]>(DEMO_FORMS);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [status, setStatus] = useState<FormStatusFilter>(initialStatus);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoForm | null>(null);

  const visible = useMemo(() => filterForms(forms, status, keyword), [forms, status, keyword]);

  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;

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
      for (const form of visible) {
        if (checked) next.add(form.id);
        else next.delete(form.id);
      }
      return next;
    });
  };

  const removeForm = (id: string): void => {
    setForms((prev) => prev.filter((form) => form.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((form, index) => ({
    id: form.id,
    onActivate: () => {
      /* 실화면: 행 클릭 → 폼 편집(/content/forms/:id/edit) */
    },
    selected: selectedIds.has(form.id),
    leading: [
      <RowSelectCell
        key="select"
        id={form.id}
        label={`${form.name} 선택`}
        checked={selectedIds.has(form.id)}
        onToggle={(checked) => toggleOne(form.id, checked)}
      />,
      <SeqCell key="seq" seq={index + 1} />,
    ],
    cells: [
      <span key="name" style={nameCellStyle}>
        <span>{form.name}</span>
        {form.description !== '' && <span style={mutedStyle}>{form.description}</span>}
      </span>,
      <StatusBadge
        key="status"
        tone={FORM_STATUS_TONE[form.status]}
        label={FORM_STATUS_LABEL[form.status]}
      />,
      <span key="fields" style={stampStyle}>
        {`${fmt(activeFields(form.fields).length)}개`}
      </span>,
      hasConsentField(form.fields) ? (
        <StatusBadge key="consent-yes" tone="success" label="있음" />
      ) : (
        <StatusBadge key="consent-no" tone="danger" label="없음" />
      ),
      form.recipients.length === 0 ? (
        <span key="recipients-none" style={mutedStyle}>
          미지정
        </span>
      ) : (
        <span key="recipients">{form.recipients.join(', ')}</span>
      ),
      <span key="updatedAt" style={stampStyle}>
        {form.updatedAt.replace('T', ' ')}
      </span>,
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <RowActions
          label={form.name}
          onEdit={() => {
            /* 실화면: 연필 → 폼 편집 */
          }}
          onDelete={() => setConfirming(form)}
        />
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>폼 관리</h1>

      <div style={toolbarStyle}>
        <div style={toolbarLeftStyle}>
          <span style={searchWrapStyle}>
            <SearchField
              value={keyword}
              onChange={setKeyword}
              label="폼 이름 검색"
              placeholder="폼 이름 검색"
            />
          </span>
          <span style={filterSlotStyle}>
            <SelectField
              value={status}
              aria-label="상태 필터"
              onChange={(event) => {
                const next = FORM_STATUS_FILTERS.find((filter) => filter.id === event.target.value);
                setStatus(next === undefined ? 'all' : next.id);
              }}
            >
              {FORM_STATUS_FILTERS.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.label}
                </option>
              ))}
            </SelectField>
          </span>
        </div>
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          폼 등록
        </Button>
      </div>

      <p style={summaryStyle}>
        {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
        {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
      </p>

      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button
          variant="danger"
          onClick={() => {
            for (const id of selectedIds) removeForm(id);
          }}
        >
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <div style={tableScrollStyle}>
        <Table
          caption="폼 목록 — 행을 누르면 폼 편집으로 이동합니다. 항목 수는 방문자에게 보이는 항목만 셉니다."
          columns={COLUMNS}
          rows={rows}
          leadingHead={[
            <SelectAllHeaderCell
              key="select-all"
              label="이 페이지의 폼 전체 선택"
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
              hasActiveFilters={status !== 'all'}
              onClearSearch={() => setKeyword('')}
              onResetFilters={() => setStatus('all')}
              action={
                <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
                  폼 등록
                </Button>
              }
            />
          }
        />
      </div>

      <p style={hintStyle}>
        항목 수는 방문자에게 보이는 항목만 셉니다. 발행된 폼의 항목은 삭제할 수 없고 숨기기만 할 수
        있습니다.
      </p>

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="폼 삭제"
          message={`'${confirming.name}' 폼을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="폼 삭제"
          onConfirm={() => {
            removeForm(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/**
 * 정상: 발행 폼 둘과 초안 하나. '견적 요청' 은 숨긴 항목이 하나 있어 **항목 수가 실제 배열보다
 * 적고**, '채용 지원' 은 개인정보 동의 항목이 없어 붉은 '없음' 이 붙는다 — 이 상태로는 발행되지 않는다.
 */
export const Default: Story = {
  render: () => <ContentFormsScreen />,
};

/** 최초 로드: 표 스켈레톤 — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <ContentFormsScreen loading />,
};

/** 초안 필터: 아직 홈페이지에 걸리지 않은 폼 — 발행 조건을 못 갖춘 폼이 여기 머문다 */
export const DraftOnly: Story = {
  render: () => <ContentFormsScreen initialStatus="draft" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <ContentFormsScreen initialSelectedIds={['fm-002', 'fm-003']} />,
};

/** 빈 결과: 검색이 맞지 않음 — Table empty 슬롯에 Empty(검색 지우기 · 필터 초기화 · 등록) */
export const Empty: Story = {
  render: () => <ContentFormsScreen initialKeyword="존재하지 않는 폼" />,
};
