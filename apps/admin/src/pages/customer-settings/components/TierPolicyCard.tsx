// 카드 1 — 등급 정책
//
// 등급 3종의 승급 조건(누적 구매금액)과 할인율을 표로 편집한다.
//
// [검증은 여기 없다] 이 카드는 model(types.ts)의 validateDraft() 가 만든 이슈를 **표시**만 한다.
// 입력을 막지 않는다 — 잘못된 값도 들어올 수 있고, 저장 시점에 모델이 거부한다.
// 예외는 일반회원 승급 조건뿐이다: 기본 등급이라 입력이 비활성이고, 모델도 값을 0 으로 고정한다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import {
  Alert,
  Card,
  CardTitle,
  controlStyle,
  errorTextStyle,
  HelpTip,
  hintStyle,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { TIER_LABEL } from '../../../shared/domain/member';
import type { MemberTier } from '../../../shared/domain/member';
import { BASE_TIER, DISCOUNT_MAX, issuesFor, TIER_ORDER, warningsOf } from '../types';
import type { PolicyIssue, TierDraftRows } from '../types';

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/** 입력 + 단위(원/%) 를 한 줄로 — 단위는 표시용이라 스크린 리더에서는 라벨이 대신한다 */
const inputRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

const unitStyle: CSSProperties = {
  flexShrink: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-label-md-line-height)',
};

// [세로 정렬 — 오너 피드백] 한 등급 행 안에서 행 헤더(th)와 입력 셀이 어긋나 보였다. 원인은
// 입력 셀이 (입력 + 접미사) 아래에 힌트/오류 문구를 쌓아 높이가 커지는데, 셀이 verticalAlign:middle
// 이라 그 스택 '전체'가 가운데로 몰리면서 첫 줄(입력)과 헤더의 높이가 어긋난 것이다.
// 셀을 top 정렬로 바꾸고, 헤더 텍스트를 입력의 첫 줄(테두리 thin + 세로 패딩 space-2 만큼 내려간
// 자리)에 맞춘다 — 헤더와 입력이 한 줄로 정렬되고, 힌트/오류는 그 아래로 흐른다.
const cellStyle: CSSProperties = {
  ...tdStyle,
  minWidth: 'calc(var(--tds-space-6) * 5)',
  verticalAlign: 'top',
};

const tierCellStyle: CSSProperties = {
  ...tdStyle,
  verticalAlign: 'top',
  // 입력의 텍스트 첫 줄 = 셀 상단 패딩(space-3) + 입력 테두리(thin) + 입력 세로 패딩(space-2)
  paddingTop: 'calc(var(--tds-space-3) + var(--tds-border-width-thin) + var(--tds-space-2))',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
  whiteSpace: 'nowrap',
};

/** 셀 안의 입력 + (있으면) 에러 문구 */
const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-1)',
  minWidth: 0,
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
};

interface TierPolicyCardProps {
  readonly rows: TierDraftRows;
  readonly issues: readonly PolicyIssue[];
  /** 제출을 한 번이라도 시도했는가 — 타이핑 도중에 빨간 문구가 먼저 튀어나오지 않게 한다 */
  readonly showErrors: boolean;
  /** 저장 중에는 폼 전체를 잠근다 */
  readonly disabled: boolean;
  readonly onThresholdChange: (tier: MemberTier, raw: string) => void;
  readonly onThresholdBlur: (tier: MemberTier) => void;
  readonly onDiscountChange: (tier: MemberTier, raw: string) => void;
}

export function TierPolicyCard({
  rows,
  issues,
  showErrors,
  disabled,
  onThresholdChange,
  onThresholdBlur,
  onDiscountChange,
}: TierPolicyCardProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const baseHintId = `${uid}-base-hint`;

  const warnings = warningsOf(issuesFor(issues, 'policy'));

  const errorOf = (target: `${MemberTier}-threshold` | `${MemberTier}-discount`): string | null => {
    if (!showErrors) return null;
    const found = issuesFor(issues, target).find((issue) => issue.severity === 'error');
    return found?.message ?? null;
  };

  return (
    <Card aria-labelledby={titleId}>
      <CardTitle id={titleId}>
        <span style={labelRowStyle}>
          등급 정책
          <HelpTip label="등급 정책 설명">
            누적 구매금액이 승급 조건을 넘으면 해당 등급이 됩니다. 할인율은 그 등급의 회원이 주문할
            때 적용됩니다. 일반회원은 기본 등급이라 승급 조건이 없습니다(항상 0원).
          </HelpTip>
        </span>
      </CardTitle>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <caption style={visuallyHiddenStyle}>
            등급별 승급 조건(누적 구매금액)과 할인율 — 일반회원의 승급 조건은 수정할 수 없습니다.
          </caption>
          <thead>
            <tr>
              <th scope="col" style={thStyle}>
                등급
              </th>
              <th scope="col" style={thStyle}>
                승급 조건 (누적 구매금액)
              </th>
              <th scope="col" style={thStyle}>
                할인율
              </th>
            </tr>
          </thead>
          <tbody>
            {TIER_ORDER.map((tier) => {
              const row = rows[tier];
              const isBase = tier === BASE_TIER;

              const thresholdId = `${uid}-${tier}-threshold`;
              const thresholdErrorId = `${thresholdId}-error`;
              const thresholdError = errorOf(`${tier}-threshold`);

              const discountId = `${uid}-${tier}-discount`;
              const discountErrorId = `${discountId}-error`;
              const discountError = errorOf(`${tier}-discount`);

              // 기본 등급 행은 '조건 수정 불가' 안내를, 오류가 있으면 오류 문구를 함께 가리킨다
              const thresholdDescribedBy = [
                isBase ? baseHintId : null,
                thresholdError !== null ? thresholdErrorId : null,
              ]
                .filter((id): id is string => id !== null)
                .join(' ');

              return (
                <tr key={tier}>
                  <th scope="row" style={tierCellStyle}>
                    {TIER_LABEL[tier]}
                    {isBase && <span style={hintStyle}> (기본 등급)</span>}
                  </th>

                  <td style={cellStyle}>
                    <div style={stackStyle}>
                      <div style={inputRowStyle}>
                        <label htmlFor={thresholdId} style={visuallyHiddenStyle}>
                          {`${TIER_LABEL[tier]} 승급 조건 (누적 구매금액, 원)`}
                        </label>
                        <input
                          id={thresholdId}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          className="tds-ui-input tds-ui-focusable"
                          style={controlStyle(thresholdError !== null)}
                          value={isBase ? '0' : row.threshold}
                          // 기본 등급의 조건은 정책이 아니라 정의다 — 입력을 열어두지 않는다
                          disabled={disabled || isBase}
                          aria-invalid={thresholdError !== null}
                          aria-describedby={
                            thresholdDescribedBy === '' ? undefined : thresholdDescribedBy
                          }
                          onChange={(event) => onThresholdChange(tier, event.target.value)}
                          onBlur={() => onThresholdBlur(tier)}
                        />
                        <span style={unitStyle} aria-hidden="true">
                          원 이상
                        </span>
                      </div>

                      {isBase && (
                        <p id={baseHintId} style={hintStyle}>
                          기본 등급이라 승급 조건을 수정할 수 없습니다. 가입 직후의 모든 회원이
                          여기에 속합니다.
                        </p>
                      )}

                      {thresholdError !== null && (
                        <p id={thresholdErrorId} role="alert" style={errorTextStyle}>
                          {thresholdError}
                        </p>
                      )}
                    </div>
                  </td>

                  <td style={cellStyle}>
                    <div style={stackStyle}>
                      <div style={inputRowStyle}>
                        <label htmlFor={discountId} style={visuallyHiddenStyle}>
                          {`${TIER_LABEL[tier]} 할인율 (0~${String(DISCOUNT_MAX)} 퍼센트)`}
                        </label>
                        <input
                          id={discountId}
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          className="tds-ui-input tds-ui-focusable"
                          style={controlStyle(discountError !== null)}
                          value={row.discount}
                          disabled={disabled}
                          aria-invalid={discountError !== null}
                          aria-describedby={discountError !== null ? discountErrorId : undefined}
                          onChange={(event) => onDiscountChange(tier, event.target.value)}
                        />
                        <span style={unitStyle} aria-hidden="true">
                          %
                        </span>
                      </div>

                      {discountError !== null && (
                        <p id={discountErrorId} role="alert" style={errorTextStyle}>
                          {discountError}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 경고 — 저장을 막지는 않는다. 다만 조용히 넘기지도 않는다 */}
      {warnings.map((warning) => (
        <Alert key={warning.message} tone="warning">
          {warning.message}
        </Alert>
      ))}
    </Card>
  );
}
