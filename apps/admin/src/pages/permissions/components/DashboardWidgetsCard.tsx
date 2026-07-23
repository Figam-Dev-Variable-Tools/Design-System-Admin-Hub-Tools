// 대시보드 위젯 권한 카드
//
// 위젯은 메뉴 리소스와 성격이 다르다 — 등록/수정/삭제/내보내기라는 액션이 없다.
// 그래서 매트릭스에 억지로 끼워 넣지 않고, **노출/숨김 단일 토글**의 별도 섹션으로 둔다.
// 목록의 SSOT 는 shared/permissions/feature-registry 의 DASHBOARD_WIDGET_META 다.
//
// 여기서 끈 위젯은 DashboardPage / StatsSection 의 isEnabled('dashboard.*') 가 곧바로 읽는다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import {
  Card,
  CardTitle,
  checkboxStyle,
  hintStyle,
  TriStateCheckbox,
  triStateProps,
} from '../../../shared/ui';
import { DASHBOARD_WIDGET_META } from '../../../shared/permissions/feature-registry';
import type { DashboardWidgetKey, WidgetMap } from '../../../shared/permissions/feature-registry';
import { cssVar } from '@tds/ui';

const listStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: `repeat(auto-fill, minmax(calc(${cssVar('space.6')} * 6), 1fr))`,
  gap: cssVar('space.1'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

function itemStyle(disabled: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: cssVar('space.2'),
    boxSizing: 'border-box',
    minWidth: 0,
    paddingTop: cssVar('space.2'),
    paddingBottom: cssVar('space.2'),
    paddingLeft: cssVar('space.2'),
    paddingRight: cssVar('space.2'),
    borderRadius: cssVar('radius.md'),
    color: disabled ? cssVar('color.text.disabled') : cssVar('color.text.default'),
    fontFamily: cssVar('typography.label.md.font-family'),
    fontSize: cssVar('typography.label.md.font-size'),
    lineHeight: cssVar('typography.label.md.line-height'),
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

const labelTextStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const selectAllStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.sm.font-size'),
  fontWeight: cssVar('typography.label.sm.font-weight'),
  lineHeight: cssVar('typography.label.sm.line-height'),
  cursor: 'pointer',
};

interface DashboardWidgetsCardProps {
  readonly widgets: WidgetMap;
  readonly disabled: boolean;
  readonly disabledReasonId?: string | undefined;
  readonly onToggle: (key: DashboardWidgetKey, enabled: boolean) => void;
  readonly onToggleAll: (enabled: boolean) => void;
}

export function DashboardWidgetsCard({
  widgets,
  disabled,
  disabledReasonId,
  onToggle,
  onToggleAll,
}: DashboardWidgetsCardProps) {
  const titleId = useId();
  const selectAllId = useId();
  /** '전체 선택' 체크박스의 id — label 이 htmlFor 로 명시 연결한다 (a11y) */
  const selectAllControlId = useId();

  // 빈 문자열이면 TriStateCheckbox 가 aria-describedby 를 부여하지 않는다 (계약 규약)
  const describedBy = disabled ? (disabledReasonId ?? '') : '';

  const onCount = DASHBOARD_WIDGET_META.filter((meta) => widgets[meta.key]).length;
  const state =
    onCount === DASHBOARD_WIDGET_META.length ? 'on' : onCount === 0 ? 'off' : ('mixed' as const);

  return (
    <Card aria-labelledby={titleId}>
      <CardTitle
        id={titleId}
        action={
          <label
            htmlFor={selectAllControlId}
            style={selectAllStyle}
            className={disabled ? undefined : 'tds-perm-row'}
          >
            <TriStateCheckbox
              {...triStateProps(state)}
              id={selectAllControlId}
              disabled={disabled}
              describedBy={describedBy}
              labelledBy={selectAllId}
              onChange={onToggleAll}
            />
            <span id={selectAllId}>전체 선택</span>
          </label>
        }
      >
        대시보드 위젯
      </CardTitle>

      <p style={hintStyle}>
        위젯은 액션(등록·수정·삭제)이 없어 노출/숨김만 정해요. 끄면 대시보드에서 즉시 사라져요.
      </p>

      <ul style={listStyle}>
        {DASHBOARD_WIDGET_META.map((meta) => (
          <li key={meta.key}>
            <label style={itemStyle(disabled)} className={disabled ? undefined : 'tds-perm-row'}>
              <input
                type="checkbox"
                className="tds-ui-check tds-ui-focusable"
                style={checkboxStyle}
                checked={widgets[meta.key]}
                disabled={disabled}
                aria-describedby={describedBy}
                onChange={(event) => onToggle(meta.key, event.target.checked)}
              />
              <span style={labelTextStyle}>{meta.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}
