// 좌측 필터 패널 — 결과 · 계정 유형 · 기간 (A40 소유)
//
// 배치와 시각 규칙은 회원 관리(TierFilter/GroupFilter)와 **같다** — 제목 + 목록 + 선택 강조.
// 그 세 조각(filterHeadingStyle/filterListStyle/filterItemStyle)은 shared/ui 에 있다.
// 세 축은 서로 다른 축이며, 함께 고르면 **AND** 로 걸린다.
//
// [FilterGroup 이 왜 있나] 결과·계정 유형·기간 목록은 라벨과 배지만 다르고 구조가 같다.
// 세 벌을 그대로 쓰면 30줄짜리 클론이 생긴다(A83 축3). 이 페이지 안에서만 쓰이므로
// shared/ui 로 올리지 않고 여기 지역 컴포넌트로 둔다 (shared/ui/README 규칙 1 — 소비자가 하나다).
//
// [여기에 없는 것] 필터를 저장하거나 이력을 삭제하는 버튼이 없다. 감사 로그는 조회 대상일 뿐이다.
import type { CSSProperties } from 'react';

import {
  badgeStyle,
  controlStyle,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  hintStyle,
} from '../../../shared/ui';
import { formatNumber } from '../../../shared/format';
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

const wrapperStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
  minWidth: 0,
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

/** 직접 지정 입력 두 칸 — 기간 목록 아래에 붙는다 */
const rangeFormStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
  marginTop: 'var(--tds-space-2)',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
};

const noticeStyle: CSSProperties = {
  ...hintStyle,
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 0,
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderTopStyle: 'solid',
  borderTopWidth: 'var(--tds-border-width-thin)',
  borderTopColor: 'var(--tds-color-border-default)',
};

interface FilterGroupProps<T extends string> {
  readonly heading: string;
  readonly ariaLabel: string;
  readonly options: readonly { readonly id: T; readonly label: string }[];
  readonly value: T;
  /** 배지 숫자. `undefined` 를 돌려주면 배지를 달지 않는다(기간 목록), `null` 이면 '—' */
  readonly countOf: (id: T) => number | null | undefined;
  readonly onChange: (id: T) => void;
}

function FilterGroup<T extends string>({
  heading,
  ariaLabel,
  options,
  value,
  countOf,
  onChange,
}: FilterGroupProps<T>) {
  return (
    <nav style={groupStyle} aria-label={ariaLabel}>
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
    <aside style={wrapperStyle}>
      <FilterGroup
        heading="결과"
        ariaLabel="로그인 결과 필터"
        options={OUTCOME_FILTERS}
        value={outcome}
        countOf={(id) => (outcomeCounts === null ? null : outcomeCounts[id])}
        onChange={onOutcomeChange}
      />

      <FilterGroup
        heading="계정 유형"
        ariaLabel="계정 유형 필터"
        options={ACCOUNT_KIND_FILTERS}
        value={accountKind}
        countOf={(id) => (kindCounts === null ? null : kindCounts[id])}
        onChange={onAccountKindChange}
      />

      <div style={groupStyle}>
        {/* 기간에는 배지를 달지 않는다 — '오늘 12건'은 어차피 목록 상단의 총 건수와 같은 말이다 */}
        <FilterGroup
          heading="기간"
          ariaLabel="조회 기간 필터"
          options={PERIOD_FILTERS}
          value={period}
          countOf={() => undefined}
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

      <p style={noticeStyle}>
        로그인 이력은 감사 기록입니다. 관리자도 수정하거나 삭제할 수 없으며, 조회와 내보내기만
        제공합니다.
      </p>
    </aside>
  );
}
