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
  tokenEntries,
  TokenTable,
  typographyStyle,
  type TokenEntry,
} from './_shared';

const meta: Meta = {
  title: 'Foundations/Motion',
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

/** easing 토큰(쉼표 구분 좌표) → CSS timing function */
const timingOf = (easing: TokenEntry | undefined): string =>
  easing !== undefined ? `cubic-bezier(var(${easing.varName}))` : 'ease';

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
        아직 정의된 motion 토큰이 없습니다. <Code>tokens/tokens.json</Code> 에 duration/easing
        토큰이 추가되면 이 데모는 자동으로 채워집니다.
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
      description="재생 버튼으로 트랙별 이동을 비교한다. duration 은 var() 로, easing 은 cubic-bezier(var()) 로 그대로 적용된다."
    >
      <MotionDemo />
    </Section>
  ),
};

/** 표 형태 — motion 토큰 전체 해석값 */
export const Table: Story = {
  render: () => (
    <Section
      title="Motion Tokens"
      description="duration(ms) / easing(cubic-bezier 좌표) — 모드 무관이라 라이트/다크 값이 같다."
    >
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
