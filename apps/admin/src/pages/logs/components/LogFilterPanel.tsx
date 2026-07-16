// 좌측 필터 패널 — 화면별 축 + 기간 + 보존기간 안내 (apps/admin/src/pages/logs/**)
//
// 배치와 시각 규칙은 회원 관리(TierFilter/GroupFilter)·로그인 이력과 **같다** — 제목 + 목록 + 선택 강조.
// 그 조각들(filterPanelStyle/filterNavStyle/filterHeadingStyle/filterListStyle/filterItemStyle/
// filterNoticeStyle)은 전부 shared/ui 에 있다 — 여기서 로컬로 다시 선언하지 않는다 (COMP-05).
//
// [축이 데이터인 이유] 4화면의 축은 라벨과 배지만 다르고 구조가 같다. 축을 prop 으로 받으면
// 이 파일 한 벌이 4화면을 그린다 — 화면마다 30줄짜리 클론을 만들지 않는다.
//
// [A11Y-12] 선택 상태는 **aria-pressed** 로만 표기한다. 이 앱의 다른 필터가 전부 그렇고,
// 같은 토글이 화면마다 다른 속성으로 읽히면 보조기술 사용자가 매번 다시 배워야 한다.
// (aria-current 는 쓰지 않는다 — 그것은 '현재 위치'이지 '눌린 상태'가 아니다.)
//
// [여기에 없는 것] 필터를 저장하거나 로그를 삭제하는 버튼이 없다. 감사 로그는 조회 대상일 뿐이다.
import type { CSSProperties } from 'react';

import { formatNumber } from '../../../shared/format';
import {
  badgeStyle,
  DateRangeField,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  filterNavStyle,
  filterNoticeStyle,
  filterPanelStyle,
  hintStyle,
} from '../../../shared/ui';
import { TIME_ZONE_NOTICE } from '../time';
import { ALL_FILTER, MAX_RANGE_DAYS, PERIOD_FILTERS } from '../types';
import type { LogAxisCounts, LogFilterAxis, PeriodId, RetentionPolicy } from '../types';
import { firstIssueMessage } from '../validation';
import type { CustomRangeDraft, RangeIssue } from '../validation';

/** 직접 지정 입력 — 기간 목록 아래에 붙는다 */
const rangeFormStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
  marginTop: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
};

/** 보존기간은 흘려 읽히면 안 된다 — 안내문 중 이 줄만 강조한다 */
const retentionStyle: CSSProperties = {
  ...hintStyle,
  color: 'var(--tds-color-text-default)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

interface FilterGroupProps {
  readonly heading: string;
  readonly ariaLabel: string;
  readonly options: readonly { readonly id: string; readonly label: string }[];
  readonly value: string;
  /** 배지 숫자. `undefined` 를 돌려주면 배지를 달지 않는다(기간 목록), `null` 이면 '—' */
  readonly countOf: (id: string) => number | null | undefined;
  readonly onChange: (id: string) => void;
}

function FilterGroup({ heading, ariaLabel, options, value, countOf, onChange }: FilterGroupProps) {
  return (
    <nav style={filterNavStyle} aria-label={ariaLabel}>
      <h2 style={filterHeadingStyle}>{heading}</h2>

      <ul style={filterListStyle}>
        {options.map((option) => {
          const active = option.id === value;
          const count = countOf(option.id);

          return (
            <li key={option.id}>
              <button
                type="button"
                className="tds-ui-listitem tds-ui-focusable"
                style={filterItemStyle(active)}
                aria-pressed={active}
                onClick={() => onChange(option.id)}
              >
                <span>{option.label}</span>
                {/* 아직 안 불러왔으면 '—' — 0 이라고 거짓말하지 않는다 */}
                {count !== undefined && (
                  <span style={badgeStyle}>{count === null ? '—' : formatNumber(count)}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

interface LogFilterPanelProps {
  readonly axes: readonly LogFilterAxis[];
  readonly axisValues: Readonly<Record<string, string>>;
  /** 축 key → (optionId → 건수). 아직 안 불러왔으면 null */
  readonly axisCounts: Readonly<Record<string, LogAxisCounts>> | null;
  readonly period: PeriodId;
  readonly draft: CustomRangeDraft;
  readonly rangeIssues: readonly RangeIssue[];
  readonly retention: RetentionPolicy;
  readonly onAxisChange: (axisKey: string, value: string) => void;
  readonly onPeriodChange: (period: PeriodId) => void;
  readonly onDraftChange: (draft: CustomRangeDraft) => void;
}

export function LogFilterPanel({
  axes,
  axisValues,
  axisCounts,
  period,
  draft,
  rangeIssues,
  retention,
  onAxisChange,
  onPeriodChange,
  onDraftChange,
}: LogFilterPanelProps) {
  // DateRangeField 는 그룹 단위로 error 하나를 받는다 — 가장 앞 칸의 이슈부터 짚는다
  const rangeError = firstIssueMessage(rangeIssues);

  return (
    <aside style={filterPanelStyle}>
      {axes.map((axis) => (
        <FilterGroup
          key={axis.key}
          heading={axis.heading}
          ariaLabel={axis.ariaLabel}
          options={axis.options}
          value={axisValues[axis.key] ?? ALL_FILTER}
          countOf={(id) => axisCounts?.[axis.key]?.[id] ?? (axisCounts === null ? null : 0)}
          onChange={(value) => onAxisChange(axis.key, value)}
        />
      ))}

      <div style={filterNavStyle}>
        {/* 기간에는 배지를 달지 않는다 — '오늘 12건'은 어차피 목록 상단의 총 건수와 같은 말이다 */}
        <FilterGroup
          heading="기간"
          ariaLabel="조회 기간 필터"
          options={PERIOD_FILTERS}
          value={period}
          countOf={() => undefined}
          onChange={(value) => onPeriodChange(value as PeriodId)}
        />

        {period === 'custom' && (
          <div style={rangeFormStyle}>
            {/* 검증은 스키마가 한다 — 이 컴포넌트는 error 를 role=alert 로 그리고 두 입력에
                aria-invalid + aria-describedby 를 짝지어 준다 (A11Y-11 · COMP-11) */}
            <DateRangeField
              label="조회 기간"
              startValue={draft.from}
              endValue={draft.to}
              error={rangeError}
              onStartChange={(from) => onDraftChange({ ...draft, from })}
              onEndChange={(to) => onDraftChange({ ...draft, to })}
            />
            <p style={hintStyle}>
              {`한 번에 최대 ${String(MAX_RANGE_DAYS)}일까지 조회할 수 있습니다.`}
            </p>
          </div>
        )}
      </div>

      {/* 이 섹션의 성격을 화면에 적는다 — 코드에만 있는 규칙은 운영자에게 없는 규칙이다 */}
      <div style={filterNoticeStyle}>
        <p style={retentionStyle}>{`보존기간 ${retention.label}`}</p>
        <p style={hintStyle}>{retention.basis}</p>
        <p style={hintStyle}>
          이 기록은 감사 로그입니다. 관리자도 수정하거나 삭제할 수 없으며, 조회와 내보내기만
          제공합니다.
        </p>
        <p style={hintStyle}>{TIME_ZONE_NOTICE}</p>
      </div>
    </aside>
  );
}
