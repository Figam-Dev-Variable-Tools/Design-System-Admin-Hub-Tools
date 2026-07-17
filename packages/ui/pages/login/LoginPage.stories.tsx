/**
 * Pages/로그인 — placeholder 골격 스토리 (조립 전용, 담당: 스토리북 페이지 · 게이트 G5).
 *
 * 대응 화면정의서: docs/plan/ui/SCR-001-login.md
 * 필요 모듈: TextField · Checkbox · Alert · Button(contracts/Button.contract.json@1.0.0)
 *
 * TODO: 모듈 G5 통과 후 실제 컴포넌트로 교체 (SCR-001 참조)
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(var(--tds-*))만 참조한다.
 * 신규 컴포넌트 생성 금지 — 부족한 모듈은 계약 엔지니어에게 변경 요청 발행 (pages/README.md).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties } from 'react';
import { cssVar, tokenVars } from '../../generated/tokens/tokens';

const meta: Meta = {
  title: 'Pages/로그인',
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
function ModuleSlot({ label, blockSize }: { label: string; blockSize?: string }) {
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
      }}
    >
      {label}
    </div>
  );
}

/** 제출 버튼 자리 표시 — component.button 토큰 참조 (Button G5 통과 후 교체) */
function ButtonSlot({ label }: { label: string }) {
  return (
    <div
      style={{
        ...typography('typography.label.md'),
        background: cssVar('component.button.background'),
        color: cssVar('component.button.text'),
        borderRadius: cssVar('component.button.radius'),
        paddingInline: cssVar('component.button.padding-x'),
        paddingBlock: cssVar('component.button.padding-y'),
        display: 'grid',
        placeItems: 'center',
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
        placeItems: 'center',
        minBlockSize: size(20),
        padding: cssVar('space.6'),
        background: cssVar('color.surface.default'),
        color: cssVar('color.text.default'),
      }}
    >
      {/* 로그인 카드 — SCR-001 §1: 단일 인증 폼 */}
      <div
        style={{
          inlineSize: '100%',
          maxInlineSize: size(15),
          border: `thin solid ${cssVar('color.border.default')}`,
          borderRadius: cssVar('radius.lg'),
          padding: cssVar('space.6'),
          background: cssVar('color.surface.default'),
          display: 'grid',
          gap: cssVar('space.4'),
        }}
      >
        <h1 style={{ ...typography('typography.body.md'), margin: 0 }}>로그인</h1>
        {/* TODO: 모듈 G5 통과 후 실제 컴포넌트로 교체 (SCR-001 참조) */}
        <ModuleSlot
          label="Alert — 실패/잠금/세션 만료 안내 슬롯 (TODO: Alert G5)"
          blockSize={size(2)}
        />
        <ModuleSlot label="TextField — 이메일 (TODO: TextField G5)" blockSize={size(2)} />
        <ModuleSlot
          label="TextField — 비밀번호 · 표시/숨김 토글 (TODO: TextField G5)"
          blockSize={size(2)}
        />
        <ModuleSlot label="Checkbox — 이메일 저장 (TODO: Checkbox G5)" blockSize={size(1.5)} />
        <ButtonSlot label="Button(primary) — 로그인 (TODO: Button G5)" />
      </div>
    </div>
  ),
};
