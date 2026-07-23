/**
 * Design System/Templates/Company/Certificates — 인증서/특허 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/company/certificates` → 메뉴 en = "Company"(기업 관리),
 * 화면 en = "Certificates" (packages/ui/pages/_data/pages.ts 의 인벤토리 — Company 그룹의
 * `['/company/certificates', '인증서/특허', 'Certificates']`).
 *
 * 대응 실화면: apps/admin/src/pages/company/certificates/CertificatesListPage.tsx
 * (라우트 /company/certificates). 인증서/특허는 **순서를 손으로 정하는 삭제 가능 CRUD 목록**이고,
 * 구분(인증서/특허) 필터 하나만 갖는다 — 검색이 없다. 등록/수정은 모달이 아니라 별도 라우트
 * (/new · /:id/edit)다.
 *
 * [2026-07-22 운영자 지시 두 가지를 그대로 미러한다]
 *   ① **이미지 열 삭제** — 목록에서 증빙 썸네일 열을 뺐다(ImageThumb 없음). 이미지 자체는 남아 있고
 *      등록·수정 폼에서 다룬다(CertificatesFormPage.stories 의 ImageUploadField). 캡션의 열 서술도
 *      함께 줄였다 — 없는 열을 읽어 주면 스크린리더 사용자가 표에 없는 칸을 찾는다.
 *   ② **행 순서 변경** — 표의 순서가 저장되는 값이 됐다(order). 실화면은 드래그 + 위/아래 버튼이고,
 *      바꾸는 즉시 저장한다(낙관적 업데이트 · 실패 시 롤백).
 *
 * [드래그가 아니라 키보드 경로만 미러하는 이유] DS Table 은 <tr> 을 자기가 그리고 행 모델에
 * draggable/onDrop 손잡이가 없다. 그래서 실화면은 이 화면만의 지역 표(CertificatesTable)를 갖고,
 * 이 스토리는 DS 표면으로 표현 가능한 **손잡이 열 + 위/아래 이동 버튼**만 조립한다
 * (로고 목록·배너 스토리와 같은 판단). 순서 계산은 DS moveArrayItem 이 그대로 한다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CertificatesTable → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   구분(인증서/특허) 필터      → SelectField (실화면 parseFilter + CERT_KIND_OPTIONS)
 *   등록 CTA                   → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸    → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   정렬 손잡이 열              → ReorderGripHeaderCell · ReorderGripCell (순서를 바꿀 수 있을 때만)
 *   위/아래 순서 이동           → ReorderMoveButtons (+ moveArrayItem 로 order 1..n 재계산)
 *   순번 열                    → SeqHeaderCell · SeqCell (이 표에서는 순번이 곧 저장되는 순서다)
 *   구분 배지                  → StatusBadge (certKindTone 미러 — 인증서=info · 특허=success)
 *   행 액션(수정·삭제)          → RowActions (연필 → 수정 라우트, 휴지통 → 삭제 확인)
 *   선택 일괄 삭제 바           → SelectionBar + Button(danger)
 *   삭제 확인                  → ConfirmDialog(intent=delete)
 *   목록 표                    → Table (leadingHead=선택+손잡이+순번 / trailingHead=이동·행 액션)
 *   빈 결과                    → Empty (필터 초기화 복구)
 *
 * [행 클릭이 없다] 재정렬 표에서는 행 제스처가 드래그에 점유된다 — 실화면도 행 클릭 이동을 두지
 * 않고 연필 버튼으로만 수정 화면에 간다. 그래서 여기서도 onActivate 를 걸지 않는다.
 *
 * [페이지네이션 없음] 실화면은 필터를 적용한 목록을 한 번에 보여 준다(순서를 눈으로 맞춰야 한다).
 * 충실히 미러하여 여기에도 페이지네이션을 두지 않는다.
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem·calc 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';

import {
  Button,
  ConfirmDialog,
  Empty as EmptyState,
  Icon,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  RowActions,
  RowSelectCell,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  Table,
  cssVar,
  moveArrayItem,
  tableSelectionState,
  typography,
} from '../../src';
import type { StatusBadgeTone, TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Company/Certificates',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 certificates/types.ts 의 CertItem 미러) ────────────────────────────────── */

type CertKind = 'certificate' | 'patent';

interface DemoCert {
  readonly id: string;
  readonly name: string;
  /** 발급기관 */
  readonly issuer: string;
  /** 발급일 'YYYY-MM-DD' */
  readonly issuedOn: string;
  readonly kind: CertKind;
  /**
   * 정렬 순서 — 작을수록 위. **저장되는 값이다**(실화면 CertItem.order).
   * 목록은 발급일이 아니라 이 값으로 정렬된다 — 손으로 옮긴 순서가 발급일 규칙을 이긴다.
   */
  readonly order: number;
}

/** 구분 라벨·톤 — 실화면 certKindLabel · certKindTone 미러(키 접근 안전) */
const KIND_META: Record<CertKind, { readonly label: string; readonly tone: StatusBadgeTone }> = {
  certificate: { label: '인증서', tone: 'info' },
  patent: { label: '특허', tone: 'success' },
};

const KIND_OPTIONS: readonly CertKind[] = ['certificate', 'patent'];

const FILTER_ALL = 'all';
type CertFilter = typeof FILTER_ALL | CertKind;

/**
 * order 오름차순 — 실화면 sortCertificates 가 내려주는 순서.
 * 발급일과 일부러 어긋나게 두 건을 배치했다(cert-5 가 가장 오래됐는데 2번째다) — 목록이
 * 발급일로 되돌아가면 그 자리에서 눈에 띈다.
 */
const DEMO_CERTS: readonly DemoCert[] = [
  {
    id: 'cert-1',
    name: 'ISO 9001 품질경영시스템 인증',
    issuer: '예시인증원',
    issuedOn: '2023-04-12',
    kind: 'certificate',
    order: 1,
  },
  {
    id: 'cert-5',
    name: '가족친화 인증',
    issuer: '예시가족진흥원',
    issuedOn: '2020-11-30',
    kind: 'certificate',
    order: 2,
  },
  {
    id: 'cert-2',
    name: '공간 배치 최적화 방법 특허',
    issuer: '특허청(예시)',
    issuedOn: '2022-09-01',
    kind: 'patent',
    order: 3,
  },
  {
    id: 'cert-3',
    name: '기업부설연구소 인정서',
    issuer: '예시산업진흥원',
    issuedOn: '2021-06-20',
    kind: 'certificate',
    order: 4,
  },
  {
    id: 'cert-4',
    name: '모듈형 파티션 결합 구조 특허',
    issuer: '특허청(예시)',
    issuedOn: '2021-02-08',
    kind: 'patent',
    order: 5,
  },
];

const ENTITY_LABEL = '인증서/특허';
const SELECT_ALL_LABEL_ID = 'cert-select-all';

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약(@tds/ui 경계로 직접 구현) */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/* ── 표 열 정의(데이터 열 4개 — 선택·손잡이·순번은 leading, 이동·액션은 trailing) ────────────────
   이미지 열은 없다(운영자 지시 ① · 파일 머리말). */

const COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '명칭' },
  { id: 'issuer', header: '발급기관', nowrap: true },
  { id: 'issuedOn', header: '발급일', nowrap: true },
  { id: 'kind', header: '구분', nowrap: true },
];

/** 순서를 바꿀 수 있을 때 무엇을 하면 되는지 — 실화면 REORDER_HINT 미러 */
const REORDER_HINT =
  '행을 끌어 놓거나 각 행의 위/아래 버튼으로 순서를 바꿔요. 바꾸는 즉시 저장돼요.';

/**
 * 순서 변경을 **왜 못 하는지** — 실화면 certReorderRefusal 미러(가능하면 null).
 * boolean 으로 조용히 끄지 않는다: 손잡이가 사라진 이유를 문장으로 남긴다.
 */
function reorderRefusal(filtered: boolean, count: number): string | null {
  if (filtered) {
    return '구분 필터를 걸면 걸러진 일부만 보여 전체 순서를 알 수 없어요. 필터를 전체로 되돌린 뒤 순서를 바꾸세요.';
  }
  if (count < 2) return '인증서/특허가 2건 이상일 때 순서를 바꿀 수 있어요.';
  return null;
}

/* ── 스타일(토큰·rem·calc 만) ─────────────────────────────────────────────────────────────── */

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

const filterStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 6)`,
};

const summaryRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const rowActionsWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
  justifyContent: 'flex-end',
};

const nameCellStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

/** 시각적으로만 숨김(접근성 트리에는 남긴다) — px 없이 rem·무단위 0 만 사용 */
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

interface CertificatesScreenProps {
  /** 최초 로드 스켈레톤 — Table loading(STATE-01) */
  readonly loading?: boolean;
  /** 구분 필터 초기값 — 항목 0건인 구분으로 Empty(필터 결과 없음)를 만든다 */
  readonly initialFilter?: CertFilter;
  /** 선택 초기값 — Selection 상태에서 몇 행을 미리 고른다 */
  readonly initialSelectedIds?: readonly string[];
  /** 시드 — Empty(진짜 비어있음) 상태에서 빈 배열을 넣는다 */
  readonly items?: readonly DemoCert[];
}

function CertificatesScreen({
  loading = false,
  initialFilter = FILTER_ALL,
  initialSelectedIds = [],
  items = DEMO_CERTS,
}: CertificatesScreenProps) {
  const [certs, setCerts] = useState<readonly DemoCert[]>(items);
  const [filter, setFilter] = useState<CertFilter>(initialFilter);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
    () => new Set(initialSelectedIds),
  );
  const [confirming, setConfirming] = useState<DemoCert | null>(null);

  const visible = useMemo(
    () => (filter === FILTER_ALL ? certs : certs.filter((cert) => cert.kind === filter)),
    [certs, filter],
  );

  const selection = tableSelectionState(visible, selectedIds);
  const selectedCount = selectedIds.size;

  /** 순서 변경 게이팅 — 손잡이·이동 버튼의 존재와 사유 문장이 같은 값을 읽는다 */
  const refusal = reorderRefusal(filter !== FILTER_ALL, visible.length);
  const reorderable = refusal === null;

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
      for (const cert of visible) {
        if (checked) next.add(cert.id);
        else next.delete(cert.id);
      }
      return next;
    });
  };

  // 필터가 바뀌면 보이지 않는 행의 선택이 남지 않게 비운다(실화면 useEffect(clear) 미러)
  const changeFilter = (value: CertFilter): void => {
    setFilter(value);
    setSelectedIds(new Set());
  };

  // 위/아래 이동 → moveArrayItem 로 새 순서를 만들고 order 를 1..n 으로 다시 매긴다
  // (실화면 reorderCertificatesByIds 미러 — 순서는 파생값이 아니라 저장되는 값이다)
  const moveBy = (index: number, delta: number): void => {
    setCerts((prev) =>
      moveArrayItem(prev, index, index + delta).map((cert, position) => ({
        ...cert,
        order: position + 1,
      })),
    );
  };

  const removeCert = (id: string): void => {
    setCerts((prev) => prev.filter((cert) => cert.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((cert, index) => ({
    id: cert.id,
    // 선택 열이 있는 표라 selected 를 항상 실어 보낸다(실화면 미러)
    selected: selectedIds.has(cert.id),
    /* onActivate 를 걸지 않는다 — 재정렬 표는 행 제스처가 드래그에 점유돼 행 클릭 이동이 없다
       (파일 머리말). 수정은 연필 버튼이 연다. */
    leading: [
      <RowSelectCell
        key="select"
        id={cert.id}
        label={`${cert.name} 선택`}
        checked={selectedIds.has(cert.id)}
        onToggle={(checked) => toggleOne(cert.id, checked)}
      />,
      ...(reorderable ? [<ReorderGripCell key="grip" />] : []),
      <SeqCell key="seq" seq={index + 1} />,
    ],
    /* 셀은 DS Table 이 각자 keyed <td> 로 감싸지만, 배열 리터럴 안의 JSX 는 react/jsx-key 가
       키를 요구한다 — 열 id 로 키를 준다(위치 고정이라 안정적이다). */
    cells: [
      <span key="name" style={nameCellStyle}>
        {cert.name}
      </span>,
      cert.issuer,
      cert.issuedOn,
      <StatusBadge
        key="kind"
        tone={KIND_META[cert.kind].tone}
        label={KIND_META[cert.kind].label}
      />,
    ],
    trailing: [
      <td key="actions" className="tds-table__cell tds-table__cell--end">
        <span style={rowActionsWrapStyle}>
          {reorderable && (
            <ReorderMoveButtons
              label={cert.name}
              index={index}
              count={visible.length}
              locked={false}
              onMove={moveBy}
            />
          )}
          <RowActions
            label={cert.name}
            onEdit={() => {
              /* 실화면: 연필 → 수정 화면으로 이동 */
            }}
            onDelete={() => setConfirming(cert)}
          />
        </span>
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>인증서/특허</h1>

      {/* 툴바 — 구분 필터(좌) + 등록 CTA(우). 이 화면에는 검색이 없다 */}
      <div style={toolbarStyle}>
        <span style={filterStyle}>
          <SelectField
            value={filter}
            aria-label="구분 필터"
            onChange={(event) => {
              const raw = event.target.value;
              changeFilter(
                KIND_OPTIONS.find((kind) => kind === raw) === undefined
                  ? FILTER_ALL
                  : (raw as CertKind),
              );
            }}
          >
            <option value={FILTER_ALL}>전체</option>
            {KIND_OPTIONS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_META[kind].label}
              </option>
            ))}
          </SelectField>
        </span>
        <Button variant="primary" size="md" iconLeft={<Icon name="plus-circle" />}>
          인증서/특허 등록
        </Button>
      </div>

      <div style={summaryRowStyle}>
        <p style={summaryStyle}>
          {loading ? '불러오는 중…' : `전체 ${fmt(visible.length)}건`}
          {selectedCount > 0 ? ` · ${fmt(selectedCount)}건 선택됨` : ''}
        </p>

        {/* 순서를 못 바꾸는 화면에서 손잡이만 조용히 사라지면 이유를 알 수 없다 — 문장으로 남긴다 */}
        {!loading && visible.length > 0 && <p style={summaryStyle}>{refusal ?? REORDER_HINT}</p>}
      </div>

      {/* 선택 일괄 삭제 — 1건 이상 선택 시에만(count 0 이면 SelectionBar 가 스스로 렌더 안 함) */}
      <SelectionBar count={selectedCount} onClear={() => setSelectedIds(new Set())}>
        <Button
          variant="danger"
          onClick={() => {
            for (const id of selectedIds) removeCert(id);
          }}
        >
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        /* 캡션이 **실제 열 구성**을 말한다 — 이미지 열을 지웠으니 캡션에서도 사라진다.
           재정렬 안내는 순서를 바꿀 수 있을 때만 붙는다(없는 조작을 읽어 주지 않는다). */
        caption={
          '인증서/특허 목록 — 명칭 · 발급기관 · 발급일 · 구분 열로 이루어져 있어요. ' +
          '체크박스로 선택, 연필 버튼으로 수정, 휴지통 버튼으로 삭제해요.' +
          (reorderable ? ' 각 행의 위/아래 버튼 또는 행 드래그로 정렬 순서를 바꿔요.' : '')
        }
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 인증서/특허 전체 선택"
            labelId={SELECT_ALL_LABEL_ID}
            selection={selection}
            onToggleAll={toggleAll}
          />,
          ...(reorderable ? [<ReorderGripHeaderCell key="grip-head" />] : []),
          <SeqHeaderCell key="seq" />,
        ]}
        trailingHead={[
          <th key="actions-head" scope="col" className="tds-table__head tds-table__head--end">
            <span style={visuallyHidden}>행 액션</span>
          </th>,
        ]}
        loading={loading}
        skeletonRows={5}
        empty={
          <EmptyState
            label={ENTITY_LABEL}
            hasActiveFilters={filter !== FILTER_ALL}
            onResetFilters={() => changeFilter(FILTER_ALL)}
          />
        }
      />

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="인증서/특허 삭제"
          message={`'${confirming.name}'을(를) 삭제해요. 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          onConfirm={() => {
            removeCert(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

/**
 * 정상: 인증서·특허가 섞여 채워진 기본 상태(선택 없음).
 * 순서를 바꿀 수 있는 상태라 정렬 손잡이 열과 각 행의 위/아래 이동 버튼이 함께 선다 —
 * 버튼을 누르면 순번이 실제로 다시 매겨진다(no-op 아님). 이미지 열은 없다.
 */
export const Default: Story = {
  render: () => <CertificatesScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <CertificatesScreen loading />,
};

/** 빈 결과: 아직 한 건도 등록하지 않은 상태 — Empty(등록 안내, 필터·검색 없음) */
export const Empty: Story = {
  render: () => <CertificatesScreen items={[]} />,
};

/**
 * 걸러짐: 구분을 '특허'로 좁힌 상태 — 배지 톤이 success 로 통일된다.
 * 이때 **순서 변경은 막힌다**: 걸러진 일부에서 순서를 바꾸면 전체 순서가 어떻게 되는지 알 수 없다.
 * 손잡이와 이동 버튼이 사라지고, 그 자리에 **왜 막혔는지**가 문장으로 남는다(조용한 boolean 아님).
 */
export const Filtered: Story = {
  render: () => <CertificatesScreen initialFilter="patent" />,
};

/** 선택됨: 여러 행 선택 → SelectionBar(일괄 삭제) 노출 + 선택 행 강조 */
export const Selection: Story = {
  render: () => <CertificatesScreen initialSelectedIds={['cert-2', 'cert-3']} />,
};
