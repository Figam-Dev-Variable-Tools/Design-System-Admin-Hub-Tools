/**
 * Pages/대시보드 — placeholder 골격 스토리 (조립 전용, 담당: 스토리북 페이지 · 게이트 G5).
 *
 * 대응 화면정의서: docs/plan/ui/SCR-002-dashboard.md
 * 필요 모듈: StatCard · Table · Pagination · Select · Badge · EmptyState · Skeleton · Alert ·
 *            Button(contracts/Button.contract.json@1.0.0)
 *
 * TODO: 모듈 G5 통과 후 실제 컴포넌트로 교체 (SCR-002 참조)
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(var(--tds-*))만 참조한다.
 * 신규 컴포넌트 생성 금지 — 부족한 모듈은 계약 엔지니어에게 변경 요청 발행 (pages/README.md).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { cssVar, tokenVars } from '../../generated/tokens/tokens';

const meta: Meta = {
  title: 'Pages/대시보드',
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj;

/** 토큰 배수 치수 — px 리터럴 대신 space 토큰의 calc 배수만 사용 */
const size = (multiple: number): string => `calc(${cssVar('space.6')} * ${multiple})`;

/** 타이포그래피 컴포지트 토큰 → CSSProperties (codegen이 생성한 서브 변수 4종 전개) */
function typography(path: 'typography.body.md' | 'typography.label.md'): CSSProperties {
  const v = tokenVars[path];
  return {
    fontFamily: `var(${v}-font-family)`,
    fontSize: `var(${v}-font-size)`,
    fontWeight: `var(${v}-font-weight)` as CSSProperties['fontWeight'],
    lineHeight: `var(${v}-line-height)`,
  };
}

/** 미구현 모듈 자리 표시 — 해당 모듈 G5 통과 후 실제 컴포넌트로 교체한다 */
function ModuleSlot({
  label,
  blockSize,
  style,
}: {
  label: string;
  blockSize?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        ...typography('typography.label.md'),
        border: `thin dashed ${cssVar('color.border.default')}`,
        borderRadius: cssVar('radius.md'),
        background: cssVar('color.surface.raised'),
        color: cssVar('color.text.muted'),
        display: 'grid',
        placeItems: 'center',
        padding: cssVar('space.2'),
        textAlign: 'center',
        blockSize,
        ...style,
      }}
    >
      {label}
    </div>
  );
}

/** 페이지 골격 — 모듈 G5 통과 전까지의 자리 표시 조립 */
export const Placeholder: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: cssVar('space.5'),
        padding: cssVar('space.6'),
        minBlockSize: size(20),
        background: cssVar('color.surface.default'),
        color: cssVar('color.text.default'),
      }}
    >
      {/* 헤더 — 화면 제목 + 기간 필터 (SCR-002 §3 필터: 오늘/최근 7일/최근 30일) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: cssVar('space.4'),
        }}
      >
        <h1 style={{ ...typography('typography.body.md'), margin: 0 }}>대시보드</h1>
        {/* TODO: 모듈 G5 통과 후 실제 컴포넌트로 교체 (SCR-002 참조) */}
        <ModuleSlot
          label="Select — 기간 필터 (TODO: Select G5)"
          blockSize={size(1.5)}
          style={{ inlineSize: size(8) }}
        />
      </div>

      {/* KPI 스탯 카드 4종 — SCR-002 §3.1 (카드 단위 독립 상태) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(auto-fit, minmax(${size(8)}, 1fr))`,
          gap: cssVar('space.4'),
        }}
      >
        <ModuleSlot
          label="StatCard — 주문 수 (TODO: StatCard·Badge·Skeleton G5)"
          blockSize={size(4)}
        />
        <ModuleSlot
          label="StatCard — 매출액 (TODO: StatCard·Badge·Skeleton G5)"
          blockSize={size(4)}
        />
        <ModuleSlot
          label="StatCard — 신규 가입 (TODO: StatCard·Badge·Skeleton G5)"
          blockSize={size(4)}
        />
        <ModuleSlot
          label="StatCard — 미처리 문의 (TODO: StatCard·Badge·Skeleton G5)"
          blockSize={size(4)}
        />
      </div>

      {/* 차트 영역 — SCR-002 §3.2: 본 릴리스는 플레이스홀더 패널 고정 */}
      <ModuleSlot
        label="차트 영역 — 지표 추이 차트, 준비 중 (SCR-002 §3.2 플레이스홀더)"
        blockSize={size(8)}
      />

      {/* 최근 활동 테이블 + 페이지네이션 — SCR-002 §3 목록 */}
      <ModuleSlot
        label="Table — 최근 활동 (TODO: Table·Badge·EmptyState·Skeleton·Alert G5)"
        blockSize={size(10)}
      />
      <ModuleSlot label="Pagination — 페이지 이동 (TODO: Pagination G5)" blockSize={size(1.5)} />
    </div>
  ),
};
