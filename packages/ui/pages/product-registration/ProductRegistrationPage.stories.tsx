/**
 * Pages/Products/Product Registration — placeholder 골격 스토리 (조립 전용, 담당: 스토리북 페이지 · 게이트 G5).
 *
 * 카테고리는 영문 메뉴명(`Pages/Products` = 상품 관리)이다 — 메뉴 개요는 같은 카테고리의
 * Overview 스토리 (pages/menus/ProductsOverview.stories.tsx) 에 있다.
 *
 * 대응 화면정의서: docs/plan/ui/SCR-003-product-registration.md
 * 필요 모듈: TextField · TextArea · NumberField · Select · FileUpload · FormSection · Alert ·
 *            EmptyState · Badge · Button(contracts/Button.contract.json@1.0.0)
 *
 * TODO: 모듈 G5 통과 후 실제 컴포넌트로 교체 (SCR-003 참조)
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 하드코딩 색상(hex)/px 리터럴 0건 — 모든 시각 값은 토큰 CSS 변수(var(--tds-*))만 참조한다.
 * 신규 컴포넌트 생성 금지 — 부족한 모듈은 계약 엔지니어에게 변경 요청 발행 (pages/README.md).
 */
import type { Meta, StoryObj } from '@storybook/react';
import type { CSSProperties, ReactNode } from 'react';
import { cssVar, tokenVars } from '../../generated/tokens/tokens';

const meta: Meta = {
  title: 'Pages/Products/Product Registration',
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

/** FormSection 자리 표시 — 섹션 제목 + 필드 그룹 (FormSection G5 통과 후 교체) */
function SectionSlot({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        border: `thin solid ${cssVar('color.border.default')}`,
        borderRadius: cssVar('radius.lg'),
        padding: cssVar('space.5'),
        background: cssVar('color.surface.default'),
        display: 'grid',
        gap: cssVar('space.3'),
      }}
    >
      <h2
        style={{
          ...typography('typography.label.md'),
          color: cssVar('color.text.muted'),
          margin: 0,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

/** [등록] 버튼 자리 표시 — component.button 토큰 참조 (Button G5 통과 후 교체) */
function PrimaryButtonSlot({ label }: { label: string }) {
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

/** [임시저장] 버튼 자리 표시 — secondary 시각(토큰 참조, Button G5 통과 후 교체) */
function SecondaryButtonSlot({ label }: { label: string }) {
  return (
    <div
      style={{
        ...typography('typography.label.md'),
        background: cssVar('color.surface.raised'),
        color: cssVar('color.text.default'),
        border: `thin solid ${cssVar('color.border.default')}`,
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
        gap: cssVar('space.5'),
        padding: cssVar('space.6'),
        maxInlineSize: size(30),
        marginInline: 'auto',
        minBlockSize: size(20),
        background: cssVar('color.surface.default'),
        color: cssVar('color.text.default'),
      }}
    >
      <h1 style={{ ...typography('typography.body.md'), margin: 0 }}>상품 등록</h1>

      {/* TODO: 모듈 G5 통과 후 실제 컴포넌트로 교체 (SCR-003 참조) */}
      <ModuleSlot
        label="Alert — 임시저장 복원 안내 슬롯 (SCR-003 §3.2, TODO: Alert G5)"
        blockSize={size(2)}
      />

      {/* 기본 정보 — SCR-003 §5.2: 상품명(필수) · 상품 설명(선택) */}
      <SectionSlot title="FormSection — 기본 정보 (TODO: FormSection G5)">
        <ModuleSlot
          label="TextField — 상품명, 글자 수 카운터 (TODO: TextField G5)"
          blockSize={size(2)}
        />
        <ModuleSlot
          label="TextArea — 상품 설명, 최대 2,000자 (TODO: TextArea G5)"
          blockSize={size(4)}
        />
      </SectionSlot>

      {/* 가격 · 재고 — SCR-003 §5.2: 판매가(필수) · 재고 수량(필수) */}
      <SectionSlot title="FormSection — 가격 · 재고 (TODO: FormSection G5)">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(${size(8)}, 1fr))`,
            gap: cssVar('space.3'),
          }}
        >
          <ModuleSlot label="NumberField — 판매가 (TODO: NumberField G5)" blockSize={size(2)} />
          <ModuleSlot label="NumberField — 재고 수량 (TODO: NumberField G5)" blockSize={size(2)} />
        </div>
      </SectionSlot>

      {/* 카테고리 — SCR-003 §3.3: 로드 상태(정상/로딩/에러/빈) 포함 */}
      <SectionSlot title="FormSection — 카테고리 (TODO: FormSection G5)">
        <ModuleSlot label="Select — 카테고리 선택 (TODO: Select G5)" blockSize={size(2)} />
      </SectionSlot>

      {/* 이미지 업로드 — SCR-003 §3.1: 파일별 진행/실패/삭제 + '대표' Badge */}
      <SectionSlot title="FormSection — 상품 이미지 (TODO: FormSection G5)">
        <ModuleSlot
          label="FileUpload — 드롭존, JPG·PNG·WebP · 1장당 5MB · 최대 5장 (TODO: FileUpload·Badge G5)"
          blockSize={size(6)}
        />
      </SectionSlot>

      {/* 이중 액션 — SCR-003 §5.3 규칙 1: [임시저장] secondary · [등록] primary */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: cssVar('space.3') }}>
        <SecondaryButtonSlot label="Button(secondary) — 임시저장 (TODO: Button G5)" />
        <PrimaryButtonSlot label="Button(primary) — 등록 (TODO: Button G5)" />
      </div>
    </div>
  ),
};
