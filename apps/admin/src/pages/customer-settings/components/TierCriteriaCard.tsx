// 카드 2 — 등급 산정 기준
//
// 집계 기간 / 강등 허용 / 재계산 시점. 각 항목에 ⓘ 도움말(members 의 HelpTip 재사용)을 달고,
// 도움말과 별개로 항목 아래 설명문을 aria-describedby 로 연결한다 — 도움말을 열지 않아도
// 스크린 리더가 무엇을 고르는지 알 수 있어야 한다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import {
  Card,
  CardTitle,
  checkboxStyle,
  fieldLabelStyle,
  fieldStyle,
  HelpTip,
  hintStyle,
  SelectField,
} from '../../../shared/ui';
import { PERIOD_OPTIONS, RECALC_OPTIONS } from '../types';
import type { AggregationPeriod, RecalcTrigger } from '../types';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-5)',
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
};

const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

interface TierCriteriaCardProps {
  readonly period: AggregationPeriod;
  readonly allowDemotion: boolean;
  readonly recalcTrigger: RecalcTrigger;
  readonly disabled: boolean;
  readonly onPeriodChange: (value: AggregationPeriod) => void;
  readonly onAllowDemotionChange: (value: boolean) => void;
  readonly onRecalcTriggerChange: (value: RecalcTrigger) => void;
}

export function TierCriteriaCard({
  period,
  allowDemotion,
  recalcTrigger,
  disabled,
  onPeriodChange,
  onAllowDemotionChange,
  onRecalcTriggerChange,
}: TierCriteriaCardProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const periodId = `${uid}-period`;
  const periodHintId = `${uid}-period-hint`;
  const demotionId = `${uid}-demotion`;
  const demotionHintId = `${uid}-demotion-hint`;
  const recalcId = `${uid}-recalc`;
  const recalcHintId = `${uid}-recalc-hint`;

  return (
    <Card aria-labelledby={titleId}>
      <CardTitle id={titleId}>등급 산정 기준</CardTitle>

      <div style={bodyStyle}>
        {/* 집계 기간 */}
        <div style={fieldStyle}>
          <span style={labelRowStyle}>
            <label htmlFor={periodId} style={fieldLabelStyle}>
              집계 기간
            </label>
            <HelpTip label="집계 기간 설명">
              승급 조건과 비교할 누적 구매금액을 어느 구간에서 합산할지 정합니다. '최근 12개월'을
              고르면 그보다 오래된 주문은 누적에서 빠지므로, 강등 허용과 함께 쓰면 활동이 끊긴
              회원의 등급이 내려갑니다.
            </HelpTip>
          </span>
          <SelectField
            id={periodId}
            value={period}
            disabled={disabled}
            aria-describedby={periodHintId}
            onChange={(event) => {
              const next = PERIOD_OPTIONS.find((option) => option.id === event.target.value);
              onPeriodChange(next?.id ?? 'all');
            }}
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <p id={periodHintId} style={hintStyle}>
            누적 구매금액을 합산할 구간입니다.
          </p>
        </div>

        {/* 강등 허용 */}
        <div style={fieldStyle}>
          <span style={checkboxRowStyle}>
            <input
              id={demotionId}
              type="checkbox"
              className="tds-ui-focusable"
              style={checkboxStyle}
              checked={allowDemotion}
              disabled={disabled}
              aria-describedby={demotionHintId}
              onChange={(event) => onAllowDemotionChange(event.target.checked)}
            />
            <label htmlFor={demotionId} style={fieldLabelStyle}>
              강등 허용
            </label>
            <HelpTip label="강등 허용 설명">
              켜면 집계 기간의 누적 구매금액이 승급 조건에 미달할 때 등급이 내려갑니다. 끄면 한 번
              오른 등급은 조건에 미달해도 유지됩니다. 오른쪽 '현재 등급 분포'의 미리보기가 이 설정을
              반영해 다시 계산됩니다.
            </HelpTip>
          </span>
          <p id={demotionHintId} style={hintStyle}>
            {allowDemotion
              ? '조건에 미달하면 등급이 내려갑니다.'
              : '한 번 오른 등급은 조건에 미달해도 유지됩니다.'}
          </p>
        </div>

        {/* 재계산 시점 */}
        <div style={fieldStyle}>
          <span style={labelRowStyle}>
            <label htmlFor={recalcId} style={fieldLabelStyle}>
              재계산 시점
            </label>
            <HelpTip label="재계산 시점 설명">
              등급을 다시 산정하는 트리거입니다. '주문 완료 시'는 결제가 확정될 때마다 그 회원만
              다시 계산하고, '매일 자정' · '매월 1일'은 전체 회원을 한 번에 다시 계산합니다.
            </HelpTip>
          </span>
          <SelectField
            id={recalcId}
            value={recalcTrigger}
            disabled={disabled}
            aria-describedby={recalcHintId}
            onChange={(event) => {
              const next = RECALC_OPTIONS.find((option) => option.id === event.target.value);
              onRecalcTriggerChange(next?.id ?? 'order-completed');
            }}
          >
            {RECALC_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </SelectField>
          <p id={recalcHintId} style={hintStyle}>
            등급을 다시 산정하는 시점입니다.
          </p>
        </div>
      </div>
    </Card>
  );
}
