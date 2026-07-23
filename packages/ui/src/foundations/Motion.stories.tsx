/**
 * Foundations/Motion — duration/easing 토큰 시각 데모.
 *
 * [선행 조건] `pnpm codegen` 선행 필요 — generated/tokens/* 미생성 시 Storybook 빌드 불가.
 * 값 하드코딩 0건: tokenVars 맵 순회 + tokens.css(CSSOM) 런타임 해석 (_shared.tsx 참고).
 * tokens/tokens.json 에 motion 토큰을 추가하면 이 스토리는 자동 갱신된다.
 *
 * 참고: 런타임 규칙상 prefers-reduced-motion 설정 시 duration 은 0ms 로 치환된다
 * (tokens.json motion.$description). 데모도 사용자의 OS 설정을 존중한다.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Code,
  cssVar,
  EmptyNote,
  metaTextStyle,
  Section,
  thinBorder,
  tokenEntries,
  TokenTable,
  typographyStyle,
  type TokenEntry,
} from './_shared';

const meta: Meta = {
  title: 'Design System/Foundations/Motion',
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj;

const durationEntries = () => tokenEntries((p) => p.startsWith('motion.duration.'));
const easingEntries = () => tokenEntries((p) => p.startsWith('motion.easing.'));

/** 데모 기본값 — 목록에서 동적으로 선택 (있으면 normal/standard, 없으면 첫 항목) */
function pickDefault(entries: TokenEntry[], preferredSuffix: string): TokenEntry | undefined {
  return entries.find((e) => e.path.endsWith(preferredSuffix)) ?? entries[0];
}

/** easing 토큰 → CSS timing function. 토큰은 이미 cubic-bezier() 로 감싸 emit 되므로 var() 로 그대로 쓴다 (TOKEN-03) */
const timingOf = (easing: TokenEntry | undefined): string =>
  easing !== undefined ? `var(${easing.varName})` : 'ease';

/** 재생 토글 + 트랙별 이동 박스 데모 */
function MotionDemo() {
  const [play, setPlay] = useState(false);
  const durations = durationEntries();
  const easings = easingEntries();
  const baseEasing = pickDefault(easings, '.standard');
  const baseDuration = pickDefault(durations, '.normal');

  if (durations.length === 0 && easings.length === 0) {
    return (
      <EmptyNote>
        아직 정의된 motion 토큰이 없어요. <Code>tokens/tokens.json</Code> 에 duration/easing 토큰이
        추가되면 이 데모는 자동으로 채워져요.
      </EmptyNote>
    );
  }

  const trackStyle: CSSProperties = {
    background: cssVar('color.surface.raised'),
    borderRadius: cssVar('radius.md'),
    padding: cssVar('space.2'),
    marginBlockEnd: cssVar('space.2'),
  };
  const boxStyle = (transition: string): CSSProperties => ({
    inlineSize: `calc(${cssVar('space.6')} * 2)`,
    blockSize: cssVar('space.6'),
    background: cssVar('color.action.primary.default'),
    borderRadius: cssVar('radius.sm'),
    transition,
    transform: play ? `translateX(calc(${cssVar('space.6')} * 8))` : 'translateX(0)',
  });

  return (
    <div>
      {/* 데모 버튼 — component.button 토큰으로 스타일링 (3계층 소비 예시) */}
      <button
        type="button"
        onClick={() => setPlay((v) => !v)}
        style={{
          // component.button.typography 는 semantic 참조 별칭이라 서브 변수가 없다 — 원본 컴포지트를 직접 전개
          ...typographyStyle('typography.label.md'),
          background: cssVar('component.button.background'),
          color: cssVar('component.button.text'),
          border: 'none',
          borderRadius: cssVar('component.button.radius'),
          paddingInline: cssVar('component.button.padding-x'),
          paddingBlock: cssVar('component.button.padding-y'),
          marginBlockEnd: cssVar('space.4'),
          cursor: 'pointer',
          transitionProperty: 'background',
          transitionDuration: cssVar('component.button.transition-duration'),
        }}
      >
        {play ? '원위치' : '재생'}
      </button>

      <h3 style={{ ...metaTextStyle, margin: 0, marginBlockEnd: cssVar('space.2') }}>
        Duration 비교 — easing 고정({baseEasing?.path ?? 'ease'})
      </h3>
      {durations.map((d) => (
        <div key={d.path} style={trackStyle}>
          <div
            aria-hidden
            style={boxStyle(`transform var(${d.varName}) ${timingOf(baseEasing)}`)}
          />
          <span style={metaTextStyle}>{d.path}</span>
        </div>
      ))}

      <h3
        style={{
          ...metaTextStyle,
          margin: 0,
          marginBlockStart: cssVar('space.4'),
          marginBlockEnd: cssVar('space.2'),
        }}
      >
        Easing 비교 — duration 고정({baseDuration?.path ?? '(없음)'})
      </h3>
      {easings.map((e) => (
        <div key={e.path} style={trackStyle}>
          <div
            aria-hidden
            style={boxStyle(
              baseDuration !== undefined
                ? `transform var(${baseDuration.varName}) ${timingOf(e)}`
                : 'none',
            )}
          />
          <span style={metaTextStyle}>{e.path}</span>
        </div>
      ))}
    </div>
  );
}

/** duration/easing 시각 데모 */
export const Demo: Story = {
  render: () => (
    <Section
      title="Motion Demo"
      description="재생 버튼으로 트랙별 이동을 비교한다. duration·easing 모두 var() 로 그대로 적용된다 (easing 토큰이 이미 cubic-bezier() 로 감싸져 유효 timing-function 이다)."
    >
      <MotionDemo />
    </Section>
  ),
};

/** 표 형태 — motion 토큰 전체 해석값 */
export const Table: Story = {
  render: () => (
    <Section title="Motion Tokens" description="duration(ms) / easing(cubic-bezier 좌표).">
      <TokenTable
        previewLabel="분류"
        rows={tokenEntries((p) => p.startsWith('motion.')).map((entry) => ({
          ...entry,
          preview: (
            <span style={metaTextStyle}>
              {entry.path.includes('.duration.') ? 'duration' : 'easing'}
            </span>
          ),
        }))}
      />
    </Section>
  ),
};

/* ── MOTION-07 — 허용/금지 목록 ───────────────────────────────────────────── */

interface GuideRow {
  readonly rule: string;
  readonly why: string;
}

/** 허용 — 인과가 있는 곳에만 모션을 쓴다 */
const ALLOWED: GuideRow[] = [
  {
    rule: 'Modal 등장/퇴장 — 딤 opacity + 다이얼로그 scale(0.96→1). component.overlay recipe',
    why: '맥락이 바뀌는 지점이다. 어디서 열렸고 어디로 닫혔는지를 눈이 따라갈 수 있어야 한다',
  },
  {
    rule: 'Toast 등장/퇴장 — opacity + translateY. component.overlay recipe',
    why: '스스로 나타나고 사라지는 요소다. 소리 없이 튀어나오면 알아채지 못한다',
  },
  {
    rule: 'hover/press 등 상호작용 — duration.fast + easing.standard, 색·배경만',
    why: '입력에 대한 즉각 응답. 짧고 색만 바뀌므로 읽기를 방해하지 않는다',
  },
  {
    rule: '기존 skeleton pulse · Button spinner',
    why: '"아직 오지 않았다"는 유일한 신호다. 이 둘만 무한 반복이 허용된다',
  },
];

/** 금지 — 남용은 산만·인지부하·멀미를 부른다 */
const FORBIDDEN: GuideRow[] = [
  {
    rule: 'focus ring 에 transition',
    why: '포커스는 **지금 어디인가**의 답이다. 한 프레임이라도 늦으면 키보드 사용자가 위치를 잃는다',
  },
  {
    rule: '기존 pulse 외 추가 skeleton motion (shimmer·슬라이드 등)',
    why: '로딩은 이미 전달됐다. 그 위에 얹는 모션은 정보가 0 이고 시선만 끈다',
  },
  {
    rule: 'KPI count-up 남용',
    why: '숫자를 읽으려는 사람에게 숫자가 굴러가면 읽기를 기다려야 한다',
  },
  {
    rule: 'spinner 외 영구/무한 애니메이션',
    why: '끝나지 않는 움직임은 주변시야에서 계속 주의를 훔친다',
  },
  { rule: 'parallax', why: '스크롤과 화면이 어긋나 멀미를 유발한다. admin 에 얻을 것이 없다' },
  {
    rule: 'route/section 전환 slide · AppShell/header/sidebar 이동 (MOTION-06)',
    why: '화면 전환마다 대기가 붙는다. 운영자는 하루에 수백 번 전환한다',
  },
  {
    rule: '콘텐츠를 지연시키는 대형 entrance',
    why: '모션이 끝나야 읽을 수 있다면 그 모션은 콘텐츠의 적이다',
  },
];

const cellStyle: CSSProperties = {
  textAlign: 'left',
  verticalAlign: 'top',
  padding: cssVar('space.2'),
  borderBlockEnd: thinBorder(),
};

function GuideTable({ rows, verdict }: { readonly rows: GuideRow[]; readonly verdict: string }) {
  return (
    <table style={{ inlineSize: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th
            style={{ ...cellStyle, ...typographyStyle('typography.label.md'), inlineSize: '45%' }}
          >
            {verdict}
          </th>
          <th style={{ ...cellStyle, ...typographyStyle('typography.label.md') }}>왜</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.rule}>
            <td style={{ ...cellStyle, ...typographyStyle('typography.body.md') }}>{row.rule}</td>
            <td style={{ ...cellStyle, ...metaTextStyle }}>{row.why}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * [MOTION-07] 모션 가이드 — 허용/금지 목록.
 * 모션 라이브러리·keyframes 를 추가하는 PR 은 이 표를 acceptance 로 리뷰한다.
 */
export const Guide: Story = {
  render: () => (
    <Section
      title="Motion Guide — 허용 vs 금지"
      description="모션은 장식이 아니라 인과의 설명이다. 원인(클릭·요청)과 결과(등장·소멸) 사이를 이어 줄 때만 쓴다. 아래 금지 목록은 새 모션 PR 의 리뷰 기준이다 (MOTION-07)."
    >
      <GuideTable rows={ALLOWED} verdict="허용" />
      <div style={{ blockSize: cssVar('space.6') }} />
      <GuideTable rows={FORBIDDEN} verdict="금지" />
      <p style={{ ...metaTextStyle, marginBlockStart: cssVar('space.4') }}>
        모든 모션은 <Code>@media (prefers-reduced-motion: reduce)</Code> 에서 꺼진다 (MOTION-03).
        판단자는 CSS 하나다 — JS 는 computed style 로 &ldquo;애니메이션이 없다&rdquo;를 관측해 즉시
        경로를 탄다. 그래서 CSS 와 JS 의 판단이 어긋날 수 없다.
      </p>
    </Section>
  ),
};
