// 프로젝트 마일스톤 편집기
//
// 마일스톤(이름·목표일·완료)을 행으로 추가·삭제·편집한다. 프로젝트 폼 1곳만 쓰므로 페이지 전용이다.
import type { CSSProperties } from 'react';

import { formatNumber } from '../../../../shared/format';
import {
  Button,
  controlStyle,
  errorTextStyle,
  fieldLabelStyle,
  hintStyle,
  PlusCircleIcon,
  ToggleSwitch,
  TrashIcon,
} from '../../../../shared/ui';
import { milestoneProgress, PROJECT_MAX_MILESTONES } from '../types';
import type { Milestone } from '../types';

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
};

const rowsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-2)',
};

const rowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(calc(var(--tds-space-6) * 3), auto) auto auto',
  gap: 'var(--tds-space-2)',
  alignItems: 'center',
};

const iconButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  paddingTop: 'var(--tds-space-1)',
  paddingBottom: 'var(--tds-space-1)',
  paddingLeft: 'var(--tds-space-1)',
  paddingRight: 'var(--tds-space-1)',
  borderStyle: 'none',
  borderWidth: 0,
  background: 'transparent',
  color: 'var(--tds-color-feedback-danger-text)',
  cursor: 'pointer',
};

const summaryStyle: CSSProperties = {
  ...hintStyle,
  fontVariantNumeric: 'tabular-nums',
};

const newMilestone = (): Milestone => ({
  id: `ms-new-${String(Date.now())}-${String(Math.round(Math.random() * 1000))}`,
  name: '',
  dueDate: '',
  done: false,
});

interface ProjectMilestonesFieldProps {
  readonly milestones: readonly Milestone[];
  readonly disabled: boolean;
  readonly onChange: (next: readonly Milestone[]) => void;
  readonly error?: string | undefined;
}

export function ProjectMilestonesField({
  milestones,
  disabled,
  onChange,
  error,
}: ProjectMilestonesFieldProps) {
  const patch = (id: string, part: Partial<Milestone>) => {
    onChange(
      milestones.map((milestone) => (milestone.id === id ? { ...milestone, ...part } : milestone)),
    );
  };
  const remove = (id: string) => onChange(milestones.filter((milestone) => milestone.id !== id));
  const add = () => {
    if (milestones.length >= PROJECT_MAX_MILESTONES) return;
    onChange([...milestones, newMilestone()]);
  };

  return (
    <div style={sectionStyle}>
      <span style={fieldLabelStyle}>마일스톤</span>
      <p style={hintStyle}>
        주요 마일스톤을 등록하세요. 완료 표시에 따라 아래 진척률이 계산됩니다. (최대{' '}
        {PROJECT_MAX_MILESTONES}개)
      </p>

      <div style={rowsStyle}>
        {milestones.map((milestone, index) => (
          <div key={milestone.id} style={rowStyle}>
            <input
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(false)}
              value={milestone.name}
              placeholder={`마일스톤 ${String(index + 1)} (예: 계약 체결)`}
              disabled={disabled}
              aria-label={`마일스톤 ${String(index + 1)} 이름`}
              onChange={(event) => patch(milestone.id, { name: event.target.value })}
            />
            <input
              type="date"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(false)}
              value={milestone.dueDate}
              disabled={disabled}
              aria-label={`마일스톤 ${String(index + 1)} 목표일`}
              onChange={(event) => patch(milestone.id, { dueDate: event.target.value })}
            />
            <ToggleSwitch
              checked={milestone.done}
              onChange={(next) => patch(milestone.id, { done: next })}
              disabled={disabled}
              label={`마일스톤 ${String(index + 1)} 완료 여부`}
              onLabel="완료"
              offLabel="진행"
            />
            <button
              type="button"
              className="tds-ui-focusable"
              style={iconButtonStyle}
              disabled={disabled}
              aria-label={`마일스톤 ${String(index + 1)} 삭제`}
              onClick={() => remove(milestone.id)}
            >
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      {milestones.length < PROJECT_MAX_MILESTONES && (
        <span>
          <Button variant="secondary" size="md" disabled={disabled} onClick={add}>
            <PlusCircleIcon />
            마일스톤 추가
          </Button>
        </span>
      )}

      {milestones.length > 0 && (
        <span style={summaryStyle}>
          마일스톤 진척 {formatNumber(milestoneProgress(milestones))}%
        </span>
      )}

      {error !== undefined && error !== '' && (
        <p role="alert" style={errorTextStyle}>
          {error}
        </p>
      )}
    </div>
  );
}
