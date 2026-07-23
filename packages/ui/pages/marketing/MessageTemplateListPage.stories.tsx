/**
 * Design System/Templates/Marketing/Message Templates — 메시지 템플릿 목록 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명이다: `/marketing/templates` → 메뉴 en = "Marketing"(마케팅 관리),
 * 화면 en = "Templates" (packages/ui/pages/_data/pages.ts 의 Marketing 그룹
 * `['/marketing/templates', '발송 템플릿 관리', 'Templates']`).
 *
 * 대응 실화면: apps/admin/src/pages/marketing/message-templates/MessageTemplateListPage.tsx
 * (라우트 /marketing/templates). 열은 템플릿명·종류·상태·발신 프로필·최종 수정 다섯이고, 조회 조건
 * (검색·종류·상태)은 URL 이 소유한다(useListState · IA-13).
 *
 * [이 목록의 두 축] 종류(문자·이메일·알림톡·브랜드 메시지)는 편집기와 미리보기를 통째로 가르고,
 * 발행 상태(초안→사용중↔미사용)는 **운영자가 켜고 끄는** 축이다(카카오 심사 상태와 별개다).
 * [행을 누르면 어디로 가나] 상세다(수정이 아니다) — 가장 흔한 조작인 '켜고 끄기' 가 상세 헤더에 있다.
 * 그래서 새 템플릿 CTA 도 폼 이동이 아니라 **종류 선택 팝업**을 연다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 이 폴더에서 신규 DS 컴포넌트를 만들지 않고
 * apps/admin 을 import 하지 않는다(레이어 경계). 앱 전용 조각은 DS 표면으로 갈음한다:
 *   CrudListShell/CrudTable  → DS Table(+ SelectAllHeaderCell·RowSelectCell·SeqHeaderCell·SeqCell·RowActions)
 *   NewTemplateKindDialog    → DS Modal + 토큰만 쓴 선택 버튼 4개
 *
 * 실화면 ↔ DS 컴포넌트 매핑:
 *   템플릿명·내용 검색         → SearchField
 *   종류 필터 · 상태 필터       → SelectField ×2
 *   새 템플릿 버튼             → Button(primary) + Icon(plus-circle)
 *   전체선택 헤더 / 행 선택칸   → SelectAllHeaderCell · RowSelectCell (+ tableSelectionState)
 *   순번 열                   → SeqHeaderCell · SeqCell
 *   종류 배지                  → StatusBadge(neutral)
 *   상태 배지(초안·사용중·미사용) → StatusBadge(info·success·neutral — statusToneOf 미러)
 *   최종 수정(일시 · 수정자)     → 토큰 <span>(tabular-nums)
 *   행 액션(상세·삭제)          → RowActions
 *   선택 일괄 삭제 바           → SelectionBar + Button(danger)
 *   삭제 확인                  → ConfirmDialog(intent=delete)
 *   목록 표                    → Table (leadingHead=선택+순번 / trailingHead=행 액션)
 *   빈 결과                    → Empty
 *   종류 선택 팝업              → Modal + Button(secondary)
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
  Modal,
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
  title: 'Design System/Templates/Marketing/Message Templates',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 도메인 상수(실화면 message-templates/types · status 미러) ───────────────────────────────── */

/** 발행 상태 — draft(작성 중) → active(켜짐) ↔ inactive(꺼짐). 삭제와 끄기는 다른 행위다 */
type TemplateStatus = 'draft' | 'active' | 'inactive';

/** 종류 — 편집기와 미리보기가 통째로 갈린다 */
type TemplateKind = 'email' | 'text' | 'alimtalk' | 'brandmessage';

const TEMPLATE_STATUS_LABEL: Record<TemplateStatus, string> = {
  draft: '초안',
  active: '사용중',
  inactive: '미사용',
};

/**
 * 상태 배지의 색 의도 — 초안만 info 로 띄운다.
 * neutral 이 '회색 표면 + 테두리' 라 미사용과 초안이 같은 색이 되는데, 둘은 '발행됐지만 꺼짐' 과
 * '아직 발행 전' 이라 목록에서 반드시 갈라져야 한다(실화면 statusToneOf 머리말).
 */
const STATUS_TONE: Record<TemplateStatus, StatusBadgeTone> = {
  draft: 'info',
  active: 'success',
  inactive: 'neutral',
};

/** 코드는 brandmessage, 라벨은 '구 친구톡' — 친구톡은 2025-12-31 종료됐다(kakao.ts 머리말) */
const TEMPLATE_KIND_LABEL: Record<TemplateKind, string> = {
  email: '이메일',
  text: '문자',
  alimtalk: '카카오 알림톡',
  brandmessage: '브랜드 메시지 (구 친구톡)',
};

const FILTER_ALL = 'all';
type StatusFilter = typeof FILTER_ALL | TemplateStatus;
type KindFilter = typeof FILTER_ALL | TemplateKind;

const STATUS_FILTER_OPTIONS: readonly { readonly id: StatusFilter; readonly label: string }[] = [
  { id: FILTER_ALL, label: '전체 상태' },
  { id: 'draft', label: TEMPLATE_STATUS_LABEL.draft },
  { id: 'active', label: TEMPLATE_STATUS_LABEL.active },
  { id: 'inactive', label: TEMPLATE_STATUS_LABEL.inactive },
];

const KIND_FILTER_OPTIONS: readonly { readonly id: KindFilter; readonly label: string }[] = [
  { id: FILTER_ALL, label: '전체 종류' },
  { id: 'text', label: TEMPLATE_KIND_LABEL.text },
  { id: 'email', label: TEMPLATE_KIND_LABEL.email },
  { id: 'alimtalk', label: TEMPLATE_KIND_LABEL.alimtalk },
  { id: 'brandmessage', label: TEMPLATE_KIND_LABEL.brandmessage },
];

/** 새 템플릿 팝업의 네 갈래 — 실화면 NewTemplateKindDialog CHOICES 미러 */
const KIND_CHOICES: readonly { readonly kind: TemplateKind; readonly note: string }[] = [
  {
    kind: 'text',
    note: '단일 본문 + 이미지 1장. 길이와 이미지에 따라 SMS·LMS·MMS 가 자동으로 결정돼요.',
  },
  { kind: 'email', note: '제목과 블록(제목·본문·버튼·이미지)으로 본문을 조립해요.' },
  {
    kind: 'alimtalk',
    note: '정보성 메시지. 카카오 사전 심사(영업일 2일)를 받아야 발송할 수 있고 광고는 넣을 수 없어요.',
  },
  {
    kind: 'brandmessage',
    note: '광고성 메시지를 보낼 수 있어요. 사전 심사가 없는 대신 08:00~20:50 에만 발송돼요.',
  },
];

/* ── 데모 데이터(실화면 message-templates/store 픽스처를 목록 열만 축약해 미러) ───────────────── */

interface DemoTemplate {
  readonly id: string;
  readonly name: string;
  readonly kind: TemplateKind;
  readonly status: TemplateStatus;
  /** 검색은 템플릿명·내용·종류 라벨을 함께 훑는다(실화면 searchableContentOf) */
  readonly content: string;
  readonly senderProfileName: string;
  readonly lastEditedBy: string;
  readonly lastEditedAt: string;
}

const DEMO_TEMPLATES: readonly DemoTemplate[] = [
  {
    id: 'mt-text-active',
    name: '주문 완료 안내',
    kind: 'text',
    status: 'active',
    content: '#{이름}님, 주문(#{주문번호})이 정상 접수되었습니다.',
    senderProfileName: '스페이스플래닝 대표',
    lastEditedBy: '홍성보',
    lastEditedAt: '2026-07-02T14:30',
  },
  {
    id: 'mt-text-inactive',
    name: '봄맞이 쿠폰 안내(종료)',
    kind: 'text',
    status: 'inactive',
    content: '(광고) #{이름}님, 봄맞이 #{쿠폰명} 쿠폰이 도착했습니다.',
    senderProfileName: '마케팅센터',
    lastEditedBy: '김다연',
    lastEditedAt: '2026-06-01T11:20',
  },
  {
    id: 'mt-text-draft',
    name: '여름 시즌 프리뷰(작성 중)',
    kind: 'text',
    status: 'draft',
    content: '(광고) #{이름}님, 여름 시즌 신상품이 곧 공개됩니다.',
    senderProfileName: '마케팅센터',
    lastEditedBy: '김다연',
    lastEditedAt: '2026-07-16T09:40',
  },
  {
    id: 'mt-email-active',
    name: '월간 뉴스레터 기본형',
    kind: 'email',
    status: 'active',
    content: '[스페이스플래닝] #{이름}님을 위한 이달의 소식',
    senderProfileName: '스페이스플래닝 대표',
    lastEditedBy: '홍성보',
    lastEditedAt: '2026-07-05T10:15',
  },
  {
    id: 'mt-alimtalk-active',
    name: '배송 출발 알림',
    kind: 'alimtalk',
    status: 'active',
    content: '배송 출발 안내 #{이름}님, 주문하신 상품이 출발했습니다.',
    senderProfileName: '고객지원센터',
    lastEditedBy: '이서준',
    lastEditedAt: '2026-07-08T14:00',
  },
  {
    id: 'mt-brand-draft',
    name: '여름 세일 브랜드 메시지',
    kind: 'brandmessage',
    status: 'draft',
    content: '(광고) 여름맞이 최대 50% 세일이 시작됩니다.',
    senderProfileName: '마케팅센터',
    lastEditedBy: '김다연',
    lastEditedAt: '2026-07-18T17:05',
  },
];

const ENTITY_LABEL = '메시지 템플릿';
const SELECT_ALL_LABEL_ID = 'marketing-message-templates-select-all';
const PAGE_SIZE = 10;

const fmt = (value: number): string => value.toLocaleString('ko-KR');
const formatDateTime = (value: string): string => value.replace('T', ' ');

/* ── 표 열 정의(데이터 열 5개 — 선택·순번은 leading, 액션은 trailing) ───────────────────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'name', header: '템플릿명' },
  { id: 'kind', header: '종류', nowrap: true },
  { id: 'status', header: '상태', nowrap: true },
  { id: 'sender', header: '발신 프로필' },
  { id: 'edited', header: '최종 수정', nowrap: true },
];

/* ── 스타일(토큰·rem·% 만) ────────────────────────────────────────────────────────────────── */

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

const filtersStyle: CSSProperties = {
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
  maxWidth: `calc(${cssVar('space.6')} * 11)`,
};

/** '전체 종류'·'전체 상태' 가 잘리지 않는 폭 (chevron 자리까지 포함한다) */
const selectWrapStyle: CSSProperties = {
  width: `calc(${cssVar('space.6')} * 6)`,
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const mutedCellStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
  whiteSpace: 'nowrap',
};

const dateStyle: CSSProperties = {
  ...mutedCellStyle,
  fontVariantNumeric: 'tabular-nums',
};

const actionCellStyle: CSSProperties = {
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  textAlign: 'right',
};

const choiceListStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

const choiceStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: cssVar('space.1'),
  width: '100%',
  boxSizing: 'border-box',
  paddingTop: cssVar('space.4'),
  paddingBottom: cssVar('space.4'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
  textAlign: 'left',
  cursor: 'pointer',
};

const choiceTitleStyle: CSSProperties = {
  ...typography('typography.label.md'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

const choiceNoteStyle: CSSProperties = {
  ...typography('typography.caption.md'),
  color: cssVar('color.text.muted'),
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

/* ── 제어형 화면(rules-of-hooks: Capitalized 컴포넌트에서 useState) ───────────────────────── */

interface TemplateListScreenProps {
  readonly loading?: boolean;
  readonly initialKeyword?: string;
  readonly initialKind?: KindFilter;
  readonly initialStatus?: StatusFilter;
  readonly initialPicking?: boolean;
}

function MessageTemplateListScreen({
  loading = false,
  initialKeyword = '',
  initialKind = FILTER_ALL,
  initialStatus = FILTER_ALL,
  initialPicking = false,
}: TemplateListScreenProps) {
  const [templates, setTemplates] = useState<readonly DemoTemplate[]>(DEMO_TEMPLATES);
  const [keyword, setKeyword] = useState(initialKeyword);
  const [kind, setKind] = useState<KindFilter>(initialKind);
  const [status, setStatus] = useState<StatusFilter>(initialStatus);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [confirming, setConfirming] = useState<DemoTemplate | null>(null);
  const [picking, setPicking] = useState(initialPicking);

  const visible = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return templates.filter((template) => {
      if (status !== FILTER_ALL && template.status !== status) return false;
      if (kind !== FILTER_ALL && template.kind !== kind) return false;
      if (needle === '') return true;
      return (
        template.name.toLowerCase().includes(needle) ||
        template.content.toLowerCase().includes(needle) ||
        // 종류 라벨도 건초더미에 넣는다 — '친구톡' 으로 찾는 사람을 빈 화면으로 보내지 않는다
        TEMPLATE_KIND_LABEL[template.kind].toLowerCase().includes(needle)
      );
    });
  }, [templates, keyword, kind, status]);

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
      for (const template of visible) {
        if (checked) next.add(template.id);
        else next.delete(template.id);
      }
      return next;
    });
  };

  const removeTemplate = (id: string): void => {
    setTemplates((prev) => prev.filter((template) => template.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const rows: TableProps['rows'] = visible.map((template, index) => ({
    id: template.id,
    selected: selectedIds.has(template.id),
    onActivate: () => {
      /* 실화면: 행 클릭 → 상세(/marketing/templates/:id) — 수정 폼이 아니다 */
    },
    leading: [
      <RowSelectCell
        key="select"
        id={template.id}
        label={`${template.name} 선택`}
        checked={selectedIds.has(template.id)}
        onToggle={(checked) => toggleOne(template.id, checked)}
      />,
      <SeqCell key="seq" seq={index + 1} />,
    ],
    cells: [
      template.name,
      <StatusBadge key="kind" tone="neutral" label={TEMPLATE_KIND_LABEL[template.kind]} />,
      <StatusBadge
        key="status"
        tone={STATUS_TONE[template.status]}
        label={TEMPLATE_STATUS_LABEL[template.status]}
      />,
      <span key="sender" style={mutedCellStyle}>
        {template.senderProfileName}
      </span>,
      <span key="edited" style={dateStyle}>
        {`${formatDateTime(template.lastEditedAt)} · ${template.lastEditedBy}`}
      </span>,
    ],
    trailing: [
      <td key="actions" style={actionCellStyle}>
        <RowActions
          label={template.name}
          onEdit={() => {
            /* 실화면: 연필 → 상세(/marketing/templates/:id) */
          }}
          onDelete={() => setConfirming(template)}
        />
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>{ENTITY_LABEL}</h1>

      <div style={toolbarStyle}>
        <div style={filtersStyle}>
          <div style={searchWrapStyle}>
            <SearchField
              label="템플릿명·내용 검색"
              value={keyword}
              placeholder="템플릿명 · 내용 검색"
              onChange={setKeyword}
            />
          </div>
          <span style={selectWrapStyle}>
            <SelectField
              value={kind}
              aria-label="종류로 거르기"
              onChange={(event) => {
                const raw = event.target.value;
                setKind(KIND_FILTER_OPTIONS.find((option) => option.id === raw)?.id ?? FILTER_ALL);
              }}
            >
              {KIND_FILTER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </span>
          <span style={selectWrapStyle}>
            <SelectField
              value={status}
              aria-label="상태로 거르기"
              onChange={(event) => {
                const raw = event.target.value;
                setStatus(
                  STATUS_FILTER_OPTIONS.find((option) => option.id === raw)?.id ?? FILTER_ALL,
                );
              }}
            >
              {STATUS_FILTER_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </span>
        </div>
        <Button
          variant="primary"
          size="md"
          iconLeft={<Icon name="plus-circle" />}
          onClick={() => setPicking(true)}
        >
          새 템플릿
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
            for (const id of selectedIds) removeTemplate(id);
          }}
        >
          {`선택 ${fmt(selectedCount)}건 삭제`}
        </Button>
      </SelectionBar>

      <Table
        caption="메시지 템플릿 목록 — 행을 누르면 상세로 이동해요. 사용 여부 토글은 상세 헤더에 있어요."
        columns={COLUMNS}
        rows={rows}
        leadingHead={[
          <SelectAllHeaderCell
            key="select-all"
            label="이 페이지의 메시지 템플릿 전체 선택"
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
            hasActiveFilters={kind !== FILTER_ALL || status !== FILTER_ALL}
            onClearSearch={() => setKeyword('')}
            onResetFilters={() => {
              setKind(FILTER_ALL);
              setStatus(FILTER_ALL);
            }}
          />
        }
      />

      {confirming !== null && (
        <ConfirmDialog
          intent="delete"
          title="메시지 템플릿 삭제"
          message={`'${confirming.name}'을(를) 삭제해요. 되돌릴 수 없어요.`}
          confirmLabel="삭제"
          onConfirm={() => {
            removeTemplate(confirming.id);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}

      {picking && (
        <Modal
          title="새 템플릿 만들기"
          onClose={() => setPicking(false)}
          footer={
            <Button variant="secondary" size="md" onClick={() => setPicking(false)}>
              취소
            </Button>
          }
        >
          <div style={choiceListStyle}>
            {KIND_CHOICES.map((choice) => (
              <button
                key={choice.kind}
                type="button"
                style={choiceStyle}
                onClick={() => setPicking(false)}
              >
                <span style={choiceTitleStyle}>{TEMPLATE_KIND_LABEL[choice.kind]}</span>
                <span style={choiceNoteStyle}>{choice.note}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

/** 정상: 네 종류 × 세 상태를 덮는 템플릿 6건이 보이는 기본 상태 */
export const Default: Story = {
  render: () => <MessageTemplateListScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <MessageTemplateListScreen loading />,
};

/** 빈 결과: 검색 결과 없음 — Table empty 슬롯에 Empty(검색 지우기 · 필터 초기화 복구) */
export const Empty: Story = {
  render: () => <MessageTemplateListScreen initialKeyword="등록되지 않은 템플릿" />,
};

/** 필터 적용: 종류='문자' + 상태='사용중' — 두 축이 함께 걸린 목록(URL 이 소유하는 조회 조건) */
export const Filtered: Story = {
  render: () => <MessageTemplateListScreen initialKind="text" initialStatus="active" />,
};

/** 종류 선택: '새 템플릿' 이 여는 팝업 — 편집기가 통째로 갈리므로 아무것도 쓰기 전에 묻는다 */
export const KindPicker: Story = {
  render: () => <MessageTemplateListScreen initialPicking />,
};
