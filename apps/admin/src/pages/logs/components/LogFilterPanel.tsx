// 좌측 필터 패널 — 화면별 축 + 기간 + 보존기간 안내 (apps/admin/src/pages/logs/**)
//
// 배치와 시각 규칙은 회원 관리·로그인 이력과 **같다** — 골격은 공유 FilterPanel/FilterRail 한 벌이고
// 여기서 다시 만들지 않는다 (COMP-05). 선택 상태는 aria-pressed 로만 표기한다 (A11Y-12).
//
// [축이 데이터인 이유] 4화면의 축은 라벨과 배지만 다르고 구조가 같다. 축을 prop 으로 받으면
// 이 파일 한 벌이 4화면을 그린다 — 화면마다 30줄짜리 클론을 만들지 않는다.
//
// [여기에 없는 것] 필터를 저장하거나 로그를 삭제하는 버튼이 없다. 감사 로그는 조회 대상일 뿐이다.
import type { CSSProperties } from 'react';

import { TIME_ZONE_NOTICE } from '../../../shared/format';
import {
  DateRangeField,
  FilterPanel,
  FilterRail,
  filterNavStyle,
  hintStyle,
} from '../../../shared/ui';
import type { FilterOption } from '../../../shared/ui';
import { ALL_FILTER, isPeriodId, MAX_RANGE_DAYS, PERIOD_FILTERS } from '../types';
import type { LogAxisCounts, LogFilterAxis, PeriodId, RetentionPolicy } from '../types';
import { firstIssueMessage } from '../validation';
import type { CustomRangeDraft, RangeIssue } from '../validation';
import { cssVar } from '@tds/ui';

/** 직접 지정 입력 — 기간 목록 아래에 붙는다 */
const rangeFormStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  marginTop: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
};

/** 보존기간은 흘려 읽히면 안 된다 — 안내문 중 이 줄만 강조한다 */
const retentionStyle: CSSProperties = {
  ...hintStyle,
  color: cssVar('color.text.default'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
};

/** 기간 항목에는 배지를 달지 않는다 — '오늘 12건'은 어차피 목록 상단의 총 건수와 같은 말이다 */
const PERIOD_OPTIONS: readonly FilterOption<string>[] = PERIOD_FILTERS.map((option) => ({
  id: option.id,
  label: option.label,
  hideCount: true,
}));

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
    <FilterRail
      notice={
        /* 이 섹션의 성격을 화면에 적는다 — 코드에만 있는 규칙은 운영자에게 없는 규칙이다 */
        <>
          <p style={retentionStyle}>{`보존기간 ${retention.label}`}</p>
          <p style={hintStyle}>{retention.basis}</p>
          <p style={hintStyle}>
            이 기록은 감사 로그예요. 관리자도 수정하거나 삭제할 수 없으며, 조회와 내보내기만
            제공해요.
          </p>
          <p style={hintStyle}>{TIME_ZONE_NOTICE}</p>
        </>
      }
    >
      {axes.map((axis) => (
        <FilterPanel
          key={axis.key}
          navLabel={axis.ariaLabel}
          heading={axis.heading}
          options={axis.options}
          value={axisValues[axis.key] ?? ALL_FILTER}
          counts={axisCounts === null ? null : (axisCounts[axis.key] ?? {})}
          onChange={(value) => onAxisChange(axis.key, value)}
        />
      ))}

      <div style={filterNavStyle}>
        <FilterPanel
          navLabel="조회 기간 필터"
          heading="기간"
          options={PERIOD_OPTIONS}
          value={period}
          counts={null}
          // 값은 상수 목록에서 왔지만 타입은 string 이다 — 'as' 로 우기지 않고 가드로 좁힌다
          onChange={(value) => {
            if (isPeriodId(value)) onPeriodChange(value);
          }}
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
              {`한 번에 최대 ${String(MAX_RANGE_DAYS)}일까지 조회할 수 있어요.`}
            </p>
          </div>
        )}
      </div>
    </FilterRail>
  );
}
