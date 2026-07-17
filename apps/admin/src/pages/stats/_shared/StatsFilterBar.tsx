// 통계 조회 조건 바 — 기간 프리셋 · 직접 입력 · 비교 · 세그먼트 · 검색 · 내보내기
//
//
// [대시보드와 다른 점] 대시보드에는 조회 조건이 없다(일/주/월 토글뿐). 통계 화면의 본체는
// **조건을 좁히는 일**이라 이 바가 화면의 1급 시민이다. 모든 조건은 URL 에 실린다 (IA-13).
//
// [A11Y-12] 프리셋은 토글이다 — 선택 상태를 aria-pressed 하나로만 말한다. aria-current 를
// 섞으면 AT 가 화면마다 다르게 읽는다.
import type { CSSProperties } from 'react';
import {
  Button,
  DateRangeField,
  DownloadIcon,
  SearchField,
  SelectField,
  filterItemStyle,
  mutedTextStyle,
} from '../../../shared/ui';
import { useDebouncedSearch } from '../../../shared/crud';

import {
  COMPARE_MODES,
  DEFAULT_COMPARE_MODE,
  PERIOD_PRESETS,
  formatPeriodLabel,
  isCompareMode,
  periodErrorOf,
} from './period';
import type { SegmentOption } from './types';
import type { StatsParamsApi } from './useStatsParams';
import type { CsvExportState } from './useCsvExport';

const barStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
  padding: 'var(--tds-space-4)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-lg)',
  background: 'var(--tds-color-surface-default)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  flexWrap: 'wrap',
  gap: 'var(--tds-space-3)',
};

const presetListStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--tds-space-1)',
  margin: 0,
  paddingInlineStart: 0,
  listStyle: 'none',
};

const fieldStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  inlineSize: 'calc(var(--tds-space-6) * 7)',
};

const labelStyle: CSSProperties = {
  color: 'var(--tds-color-text-muted)',
  fontFamily: 'var(--tds-typography-label-sm-font-family)',
  fontSize: 'var(--tds-typography-label-sm-font-size)',
  fontWeight: 'var(--tds-typography-label-sm-font-weight)',
  lineHeight: 'var(--tds-typography-label-sm-line-height)',
};

const spacerStyle: CSSProperties = { marginInlineStart: 'auto' };

const exportWrapStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

/** 프리셋 버튼은 가로로 눕는다 — filterItemStyle 은 세로 패널용이라 폭만 되돌린다 */
const presetButtonStyle = (active: boolean): CSSProperties => ({
  ...filterItemStyle(active),
  inlineSize: 'auto',
  justifyContent: 'center',
  cursor: 'pointer',
});

interface StatsFilterBarProps {
  readonly params: StatsParamsApi;
  readonly segments: readonly SegmentOption[];
  /** 세그먼트 축의 이름 — '방문자 유형'·'결제수단'처럼 화면마다 다르다 */
  readonly segmentLabel: string;
  /** 지정하면 검색 입력을 그린다 (검색어 분석 화면) */
  readonly searchLabel?: string | undefined;
  readonly exportState: CsvExportState;
  readonly onExport: () => void;
  /** 내보내기 권한이 없으면 버튼 자체를 그리지 않는다 (EXC-03) */
  readonly canExport: boolean;
  /** 내보낼 행 수 — '현재 필터 조건 전체 N건' 을 정직하게 말한다 (ERP-12) */
  readonly exportCount: number;
}

export function StatsFilterBar({
  params,
  segments,
  segmentLabel,
  searchLabel,
  exportState,
  onExport,
  canExport,
  exportCount,
}: StatsFilterBarProps) {
  // COMP-10 — IME 조합 판정·디바운스는 공유 훅이 소유한다 (이 섹션의 사본은 수렴됐다).
  const search = useDebouncedSearch({ initial: params.keyword, onCommit: params.setKeyword });
  const periodError = periodErrorOf(params.period);

  return (
    <section style={barStyle} aria-label="조회 조건">
      <div style={rowStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--tds-space-2)' }}>
          <span style={labelStyle}>조회 기간</span>
          <ul style={presetListStyle}>
            {PERIOD_PRESETS.map((preset) => {
              const active = params.preset === preset.id;
              return (
                <li key={preset.id}>
                  <button
                    type="button"
                    className="tds-ui-focusable tds-ui-listitem"
                    style={presetButtonStyle(active)}
                    aria-pressed={active}
                    onClick={() => {
                      params.setPreset(preset.id);
                    }}
                  >
                    {preset.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 직접 입력일 때만 날짜 칸을 연다 — 프리셋이 계산한 날짜를 사용자가 고칠 수 있는 것처럼
            보이면 안 된다(프리셋은 '오늘' 기준으로 매번 다시 계산된다) */}
        {params.preset === 'custom' ? (
          <DateRangeField
            label="조회 기간"
            startValue={params.period.start}
            endValue={params.period.end}
            error={periodError}
            onStartChange={(start) => {
              params.setPeriod({ start, end: params.period.end });
            }}
            onEndChange={(end) => {
              params.setPeriod({ start: params.period.start, end });
            }}
          />
        ) : null}
      </div>

      <div style={rowStyle}>
        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="stats-compare">
            비교 기준
          </label>
          <SelectField
            id="stats-compare"
            value={params.compare}
            onChange={(event) => {
              // 네이티브 select 값은 string 이다 — 캐스트 대신 타입가드로 좁힌다
              const next = event.target.value;
              params.setCompare(isCompareMode(next) ? next : DEFAULT_COMPARE_MODE);
            }}
          >
            {COMPARE_MODES.map((mode) => (
              <option key={mode.id} value={mode.id}>
                {mode.label}
              </option>
            ))}
          </SelectField>
        </div>

        {segments.length === 0 ? null : (
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="stats-segment">
              {segmentLabel}
            </label>
            <SelectField
              id="stats-segment"
              value={params.segment}
              onChange={(event) => {
                params.setSegment(event.target.value);
              }}
            >
              {segments.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>
        )}

        {searchLabel === undefined ? null : (
          <div style={fieldStyle}>
            <SearchField
              label={searchLabel}
              placeholder={searchLabel}
              value={search.input}
              onChange={search.setInput}
              {...search.inputProps}
            />
          </div>
        )}

        <div style={spacerStyle} />

        {canExport ? (
          <div style={exportWrapStyle}>
            {exportState.isExporting ? (
              <>
                {/* 대량 내보내기의 진행률과 취소 경로 (ERP-12) */}
                <span
                  style={{ ...mutedTextStyle, fontVariantNumeric: 'tabular-nums' }}
                  role="status"
                >
                  {`${String(exportState.progress)}% 생성 중…`}
                </span>
                <Button variant="secondary" size="sm" onClick={exportState.cancel}>
                  취소
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                iconLeft={<DownloadIcon />}
                disabled={exportCount === 0}
                onClick={onExport}
              >
                {`엑셀 내보내기 (${String(exportCount)}건)`}
              </Button>
            )}
          </div>
        ) : null}
      </div>

      <p style={{ ...mutedTextStyle, margin: 0 }}>
        {`조회 범위 ${formatPeriodLabel(params.period)} · 내보내기는 현재 조건 전체를 담습니다.`}
      </p>
    </section>
  );
}
