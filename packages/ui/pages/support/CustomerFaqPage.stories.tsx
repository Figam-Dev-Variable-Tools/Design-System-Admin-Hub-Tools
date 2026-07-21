/**
 * Design System/Templates/Support/Customer FAQ — 고객노출 FAQ 큐레이션 화면 (조립 전용 · 게이트 G5).
 *
 * 카테고리 영문 메뉴명은 "Support"(고객센터)다 — packages/ui/pages/_data/pages.ts 의 Business 섹션
 * Support 그룹, 화면 en = "FAQ"(자주 묻는 질문).
 *
 * 대응 실화면: apps/admin/src/pages/support/faq/CustomerFaqPage.tsx (라우트 /support/faq) 와 그 하위
 * 조립(components/CustomerFaqTable.tsx). 행은 콘텐츠 관리 FAQ 에서 노출 중인 FAQ 를 그대로 가져온 것이고
 * (카테고리 어휘도 그쪽 것이다 — 계정·결제·배송·기타), 이 화면은 고객센터에서 어떻게 보여줄지만
 * 큐레이션한다: 표시 순서(재정렬)·노출·BEST 고정. 그래서 등록/삭제·선택 열이 없다.
 *
 * [조립 원칙] `../../src` public DS 컴포넌트만 조합한다 — 신규 DS 컴포넌트를 만들지 않고 apps/admin 을
 * import 하지 않는다. 실화면 조각을 DS 표면으로 갈음한다:
 *   상단 안내 + 이동 링크       → Alert(info) + 토큰만 쓴 <a>
 *   요약(전체·노출 건수)         → 토큰만 쓴 <p>
 *   카드 표면                   → Card
 *   목록 표                     → Table (leadingHead=grip+순번 / trailingHead=순서 이동)
 *   재정렬 손잡이·순번·이동 버튼  → ReorderGripCell/HeaderCell · SeqCell/HeaderCell · ReorderMoveButtons
 *   노출·BEST 토글              → ToggleSwitch ×2 (moveArrayItem 로 로컬 순서 재계산)
 *   조회 실패 배너              → Alert(danger) + Button(secondary)
 *
 * 하드코딩 색상(hex)/px 리터럴 0건 — 시각 값은 토큰 CSS 변수(cssVar/typography)와 rem 만 참조한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { useState } from 'react';

import {
  Alert,
  Button,
  Card,
  Empty as EmptyState,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  SeqCell,
  SeqHeaderCell,
  Table,
  ToggleSwitch,
  cssVar,
  moveArrayItem,
  typography,
} from '../../src';
import type { TableProps } from '../../src';

const meta: Meta = {
  title: 'Design System/Templates/Support/Customer FAQ',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/* ── 데모 데이터(실화면 faq/types CustomerFaq 미러) ──────────────────────────────────────────── */

interface DemoFaq {
  readonly id: string;
  readonly question: string;
  readonly categoryLabel: string;
  readonly visible: boolean;
  readonly pinned: boolean;
  readonly order: number;
}

const DEMO_FAQS: readonly DemoFaq[] = [
  {
    id: 'f-1',
    question: '배송은 얼마나 걸리나요',
    categoryLabel: '배송',
    visible: true,
    pinned: true,
    order: 1,
  },
  {
    id: 'f-2',
    question: '결제 수단은 무엇이 있나요',
    categoryLabel: '결제',
    visible: true,
    pinned: true,
    order: 2,
  },
  {
    id: 'f-3',
    question: '비밀번호를 잊어버렸어요',
    categoryLabel: '계정',
    visible: true,
    pinned: false,
    order: 3,
  },
  {
    id: 'f-4',
    question: '탈퇴는 어떻게 하나요',
    categoryLabel: '기타',
    visible: true,
    pinned: false,
    order: 4,
  },
  {
    id: 'f-5',
    question: '주문 내역은 어디서 보나요',
    categoryLabel: '기타',
    visible: false,
    pinned: false,
    order: 5,
  },
];

/** ko-KR 자릿수 구분 — 실화면 shared/format.formatNumber 규약 */
const fmt = (value: number): string => value.toLocaleString('ko-KR');

/** 노출 건수 — 상단 요약에 쓴다(실화면 countVisible 미러) */
const countVisible = (list: readonly DemoFaq[]): number => list.filter((faq) => faq.visible).length;

/* ── 표 열 정의(데이터 열 5개 — grip·순번·이동 열은 leadingHead·trailingHead 로 별도) ─────────── */

const COLUMNS: TableProps['columns'] = [
  { id: 'question', header: '질문' },
  { id: 'category', header: '카테고리', nowrap: true },
  { id: 'visible', header: '노출', nowrap: true },
  { id: 'pinned', header: 'BEST', nowrap: true },
  { id: 'order', header: '순서', align: 'end' },
];

/* ── 스타일(토큰·rem 만) ──────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
  padding: cssVar('space.6'),
  minBlockSize: '100vh',
  background: cssVar('color.surface.default'),
  color: cssVar('color.text.default'),
};

const headingStyle: CSSProperties = {
  ...typography('typography.title.lg'),
  margin: 0,
};

const noticeStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const noticeLinkStyle: CSSProperties = {
  color: cssVar('color.action.primary.default'),
  textDecoration: 'underline',
  whiteSpace: 'nowrap',
  ...typography('typography.label.md'),
};

const summaryStyle: CSSProperties = {
  ...typography('typography.label.sm'),
  color: cssVar('color.text.muted'),
  margin: 0,
};

const questionStyle: CSSProperties = {
  fontWeight: cssVar('primitive.typography.font-weight.medium'),
};

const numericStyle: CSSProperties = { fontVariantNumeric: 'tabular-nums' };

const errorBodyStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
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

/* ── 제어형 화면(hooks-of-rules 준수: Capitalized 컴포넌트에서 useState) ─────────────────────── */

interface CustomerFaqScreenProps {
  /** 최초 로드 스켈레톤 — Table loading */
  readonly loading?: boolean;
  /** 조회 실패 — danger 배너 */
  readonly error?: boolean;
  readonly faqs?: readonly DemoFaq[];
}

function CustomerFaqScreen({
  loading = false,
  error = false,
  faqs = DEMO_FAQS,
}: CustomerFaqScreenProps) {
  const [items, setItems] = useState<readonly DemoFaq[]>(faqs);

  // 위/아래 이동 → moveArrayItem 로 새 순서를 만들고 order 를 1..n 으로 다시 매긴다(실화면 applyFaqOrder 미러)
  const moveBy = (index: number, delta: number): void => {
    setItems((prev) =>
      moveArrayItem(prev, index, index + delta).map((faq, position) => ({
        ...faq,
        order: position + 1,
      })),
    );
  };

  const toggleVisible = (id: string, next: boolean): void => {
    setItems((prev) => prev.map((faq) => (faq.id === id ? { ...faq, visible: next } : faq)));
  };

  const togglePinned = (id: string, next: boolean): void => {
    setItems((prev) => prev.map((faq) => (faq.id === id ? { ...faq, pinned: next } : faq)));
  };

  if (error) {
    return (
      <div style={pageStyle}>
        <h1 style={headingStyle}>자주 묻는 질문</h1>
        <Alert tone="danger">
          <div style={errorBodyStyle}>
            <span>고객노출 FAQ 를 불러오지 못했습니다.</span>
            <Button variant="secondary">다시 시도</Button>
          </div>
        </Alert>
      </div>
    );
  }

  const rows: TableProps['rows'] = items.map((faq, index) => ({
    id: faq.id,
    leading: [<ReorderGripCell key="grip" />, <SeqCell key="seq" seq={index + 1} />],
    cells: [
      <span style={questionStyle}>{faq.question}</span>,
      faq.categoryLabel,
      <ToggleSwitch
        key="visible"
        checked={faq.visible}
        label={`${faq.question} 노출 여부`}
        onLabel="노출"
        offLabel="숨김"
        onChange={(next) => toggleVisible(faq.id, next)}
      />,
      <ToggleSwitch
        key="pinned"
        checked={faq.pinned}
        label={`${faq.question} BEST 고정`}
        onLabel="고정"
        offLabel="일반"
        onChange={(next) => togglePinned(faq.id, next)}
      />,
      <span style={numericStyle}>{fmt(faq.order)}</span>,
    ],
    trailing: [
      <td key="move" className="tds-table__cell tds-table__cell--end">
        <ReorderMoveButtons
          label={faq.question}
          index={index}
          count={items.length}
          locked={false}
          onMove={moveBy}
        />
      </td>,
    ],
  }));

  return (
    <div style={pageStyle}>
      <h1 style={headingStyle}>자주 묻는 질문</h1>

      <Alert tone="info">
        <div style={noticeStyle}>
          <span>
            콘텐츠 관리에서 노출 중인 FAQ 가 이 목록에 그대로 올라옵니다. 질문·답변·카테고리 수정과
            등록·삭제는 콘텐츠 관리에서 하고, 이 화면은 고객센터 노출 순서·노출 여부·BEST 고정만
            큐레이션합니다.
          </span>
          <a href="#content-faq" style={noticeLinkStyle}>
            콘텐츠 관리 FAQ 로 이동
          </a>
        </div>
      </Alert>

      <p style={summaryStyle}>
        {loading
          ? '불러오는 중…'
          : `전체 ${fmt(items.length)}건 · 노출 ${fmt(countVisible(items))}건`}
      </p>

      <Card>
        <Table
          caption="고객노출 FAQ 큐레이션 — 각 행의 위/아래 버튼으로 고객센터 표시 순서를 바꾸고, 노출·BEST 를 토글합니다."
          columns={COLUMNS}
          rows={rows}
          leadingHead={[
            <ReorderGripHeaderCell key="grip-head" />,
            <SeqHeaderCell key="seq-head" />,
          ]}
          trailingHead={[
            <th key="move-head" scope="col" className="tds-table__head tds-table__head--end">
              <span style={visuallyHidden}>순서 이동</span>
            </th>,
          ]}
          loading={loading}
          skeletonRows={5}
          empty={<EmptyState label="고객센터에 노출할 FAQ" />}
        />
      </Card>
    </div>
  );
}

/** 정상: 고객노출 FAQ 큐레이션 목록(노출·BEST 토글 + 순서 이동 버튼) */
export const Default: Story = {
  render: () => <CustomerFaqScreen />,
};

/** 최초 로드: 표 스켈레톤(Table loading) — 재조회가 아니라 첫 로드에서만 켠다(STATE-01) */
export const Loading: Story = {
  render: () => <CustomerFaqScreen loading faqs={[]} />,
};

/** 빈 상태: 고객센터에 노출할 FAQ 없음 */
export const Empty: Story = {
  render: () => <CustomerFaqScreen faqs={[]} />,
};

/** 조회 실패: danger 배너 + 다시 시도 (STATE-02) */
export const LoadError: Story = {
  render: () => <CustomerFaqScreen error />,
};
