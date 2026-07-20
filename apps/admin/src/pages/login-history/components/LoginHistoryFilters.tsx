// 좌측 필터 패널 — 결과 · 계정 유형 · 기간
//
// 배치와 시각 규칙은 회원 관리와 **같다** — 골격은 공유 FilterPanel/FilterRail 한 벌이고
// 여기서 다시 만들지 않는다. 세 축은 서로 다른 축이며, 함께 고르면 **AND** 로 걸린다.
//
// [여기에 없는 것] 필터를 저장하거나 이력을 삭제하는 버튼이 없다. 감사 로그는 조회 대상일 뿐이다.
import type { CSSProperties } from 'react';

import {
  controlStyle,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  FilterPanel,
  filterNavStyle,
  FilterRail,
  hintStyle,
} from '../../../shared/ui';
import type { FilterOption } from '../../../shared/ui';
import { issueOf } from '../validation';
import type { CustomRangeDraft, RangeIssue } from '../validation';
import { ACCOUNT_KIND_FILTERS, MAX_RANGE_DAYS, OUTCOME_FILTERS, PERIOD_FILTERS } from '../types';
import type {
  AccountKindCounts,
  AccountKindFilter,
  OutcomeCounts,
  OutcomeFilter,
  PeriodId,
} from '../types';
import { cssVar } from '@tds/ui';

/** 직접 지정 입력 두 칸 — 기간 목록 아래에 붙는다 */
const rangeFormStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  marginTop: cssVar('space.2'),
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
};

/** 기간 항목에는 배지를 달지 않는다 — '오늘 12건'은 어차피 목록 상단의 총 건수와 같은 말이다 */
const PERIOD_OPTIONS: readonly FilterOption<PeriodId>[] = PERIOD_FILTERS.map((option) => ({
  id: option.id,
  label: option.label,
  hideCount: true,
}));

interface LoginHistoryFiltersProps {
  readonly outcome: OutcomeFilter;
  readonly accountKind: AccountKindFilter;
  readonly period: PeriodId;
  /** 기간 안의 결과별/유형별 건수 — 아직 안 불러왔으면 null */
  readonly outcomeCounts: OutcomeCounts | null;
  readonly kindCounts: AccountKindCounts | null;
  readonly customDraft: CustomRangeDraft;
  readonly rangeIssues: readonly RangeIssue[];
  readonly onOutcomeChange: (outcome: OutcomeFilter) => void;
  readonly onAccountKindChange: (kind: AccountKindFilter) => void;
  readonly onPeriodChange: (period: PeriodId) => void;
  readonly onCustomDraftChange: (draft: CustomRangeDraft) => void;
}

export function LoginHistoryFilters({
  outcome,
  accountKind,
  period,
  outcomeCounts,
  kindCounts,
  customDraft,
  rangeIssues,
  onOutcomeChange,
  onAccountKindChange,
  onPeriodChange,
  onCustomDraftChange,
}: LoginHistoryFiltersProps) {
  const fromIssue = issueOf(rangeIssues, 'from');
  const toIssue = issueOf(rangeIssues, 'to');
  const rangeIssue = issueOf(rangeIssues, 'range');

  return (
    <FilterRail
      notice={
        <p style={hintStyle}>
          로그인 이력은 감사 기록입니다. 관리자도 수정하거나 삭제할 수 없으며, 조회와 내보내기만
          제공합니다.
        </p>
      }
    >
      <FilterPanel
        navLabel="로그인 결과 필터"
        heading="결과"
        options={OUTCOME_FILTERS}
        value={outcome}
        counts={outcomeCounts}
        onChange={onOutcomeChange}
      />

      <FilterPanel
        navLabel="계정 유형 필터"
        heading="계정 유형"
        options={ACCOUNT_KIND_FILTERS}
        value={accountKind}
        counts={kindCounts}
        onChange={onAccountKindChange}
      />

      <div style={filterNavStyle}>
        <FilterPanel
          navLabel="조회 기간 필터"
          heading="기간"
          options={PERIOD_OPTIONS}
          value={period}
          counts={null}
          onChange={onPeriodChange}
        />

        {period === 'custom' && (
          <div style={rangeFormStyle}>
            <div style={fieldStyle}>
              <label htmlFor="login-history-from" style={fieldLabelStyle}>
                시작일
              </label>
              <input
                id="login-history-from"
                type="date"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(fromIssue !== undefined)}
                value={customDraft.from}
                aria-invalid={fromIssue !== undefined}
                aria-describedby={fromIssue === undefined ? undefined : 'login-history-from-error'}
                onChange={(event) =>
                  onCustomDraftChange({ ...customDraft, from: event.target.value })
                }
              />
              {/* 필드 에러는 인라인이다 — 토스트로 띄우면 사라진 뒤 어느 칸이 틀렸는지 알 수 없다 */}
              {fromIssue !== undefined && (
                <p id="login-history-from-error" role="alert" style={errorTextStyle}>
                  {fromIssue.message}
                </p>
              )}
            </div>

            <div style={fieldStyle}>
              <label htmlFor="login-history-to" style={fieldLabelStyle}>
                종료일
              </label>
              <input
                id="login-history-to"
                type="date"
                className="tds-ui-input tds-ui-focusable"
                style={controlStyle(toIssue !== undefined)}
                value={customDraft.to}
                aria-invalid={toIssue !== undefined}
                aria-describedby={toIssue === undefined ? undefined : 'login-history-to-error'}
                onChange={(event) =>
                  onCustomDraftChange({ ...customDraft, to: event.target.value })
                }
              />
              {toIssue !== undefined && (
                <p id="login-history-to-error" role="alert" style={errorTextStyle}>
                  {toIssue.message}
                </p>
              )}
            </div>

            {rangeIssue !== undefined && (
              <p role="alert" style={errorTextStyle}>
                {rangeIssue.message}
              </p>
            )}

            <p style={hintStyle}>
              {`한 번에 최대 ${String(MAX_RANGE_DAYS)}일까지 조회할 수 있습니다.`}
            </p>
          </div>
        )}
      </div>
    </FilterRail>
  );
}
