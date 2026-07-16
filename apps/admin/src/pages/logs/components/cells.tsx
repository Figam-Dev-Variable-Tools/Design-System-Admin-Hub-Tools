// 표 셀 조각 (apps/admin/src/pages/logs/**)
//
// [왜 공유하나] '결과' 칸은 4화면 중 3화면에 있고 규칙이 같다: **색만으로 전달하지 않는다.**
// 세 벌을 각자 쓰면 한 화면의 실패만 아이콘이 빠지는 식으로 어긋난다.
//
// [색맹 안전 — 이중 인코딩]
// 실패 행은 배경(danger surface)만으로 구분되지 않는다. 셀 안에 ✕ 아이콘 + '실패' 글자 +
// 사유가 함께 있다. 색을 못 보는 사람도, 흑백으로 인쇄해도 어느 행이 실패인지 읽을 수 있다.
import type { CSSProperties, ReactNode } from 'react';

import { mutedTextStyle, XCircleIcon } from '../../../shared/ui';

const rowStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
};

const failureStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
  color: 'var(--tds-color-feedback-danger-text)',
  fontWeight: 'var(--tds-primitive-typography-font-weight-bold)',
};

const reasonStyle: CSSProperties = {
  color: 'var(--tds-color-feedback-danger-text)',
};

const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  minWidth: 0,
};

interface OutcomeCellProps {
  readonly failed: boolean;
  readonly successLabel: string;
  readonly failureLabel: string;
  /** 실패 사유 — 있으면 결과 옆에 함께 (실패의 '왜'가 없으면 감사가 되지 않는다) */
  readonly reason?: string | null;
}

export function OutcomeCell({ failed, successLabel, failureLabel, reason }: OutcomeCellProps) {
  if (!failed) return <span style={rowStyle}>{successLabel}</span>;

  return (
    <span style={rowStyle}>
      <span style={failureStyle}>
        <XCircleIcon />
        {failureLabel}
      </span>
      {reason !== null && reason !== undefined && reason !== '' && (
        <span style={reasonStyle}>{reason}</span>
      )}
    </span>
  );
}

interface StackCellProps {
  readonly primary: ReactNode;
  readonly secondary: ReactNode;
}

/** 두 줄 셀 — 주 값 아래 보조 값 (계정/이름 · 브라우저/OS 처럼 붙어 다니는 쌍) */
export function StackCell({ primary, secondary }: StackCellProps) {
  return (
    <span style={stackStyle}>
      <span>{primary}</span>
      <span style={mutedTextStyle}>{secondary}</span>
    </span>
  );
}
