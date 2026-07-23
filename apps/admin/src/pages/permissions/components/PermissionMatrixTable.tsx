// 권한 매트릭스 표 — 리소스(행) × 액션(열)
//
// [행] shared/permissions/resources.ts 가 nav-config 에서 파생한 리소스를 그대로 그린다.
//   - '전체' 행      — 모든 리소스 × 모든 액션의 마스터 + 열(액션)별 전체선택
//   - 그룹 행        — 접기/펼치기. 체크박스는 자식 기준 3상태이고, 누르면 자식 전체가 따라간다
//   - 자식(페이지) 행 — 실제로 권한을 갖는 단위
//   - 단독 행(대시보드) — 잎이라 자식이 없다
//
// [모델이 규칙을 갖는다] read 를 끄면 나머지 4개가 함께 꺼지고, 다른 액션을 켜면 read 가 함께
// 켜진다 — 이 판단은 전부 provider→resources.ts 에서 일어난다. 이 컴포넌트는 결과를 그릴 뿐
// 규칙을 흉내 내지 않는다 (UI 만 막으면 저장값이 모순 상태가 될 수 있다).
//
// [a11y] 숨김 caption · th scope=col/row · 칸마다 접근 가능한 이름('{리소스명} {액션명}')
//   · 3상태는 indeterminate DOM 프로퍼티 + aria-checked="mixed" · 접기/펼치기는 aria-expanded/controls.
import { useId, useState } from 'react';
import type { CSSProperties } from 'react';

import { ChevronDownIcon, ChevronRightIcon } from '../../../shared/icons';
import {
  ACTION_META,
  PERMISSION_RESOURCES,
  columnState,
  groupActionState,
  hasAnyGrant,
  isActionOn,
  matrixState,
} from '../../../shared/permissions/resources';
import type {
  PermissionAction,
  PermissionMatrix,
  PermissionResource,
  ResourceId,
} from '../../../shared/permissions/resources';
import {
  tableStyle,
  tdStyle,
  thStyle,
  TriStateCheckbox,
  triStateProps,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { cssVar } from '@tds/ui';

/* ── 스타일 (토큰 변수만 · padding 은 개별 속성만) ───────────────────────── */

/** 액션 열 5개가 좁아지지 않도록 표 자체에 최소 폭을 준다 — 넘치면 카드 안에서 가로 스크롤 */
const matrixTableStyle: CSSProperties = {
  ...tableStyle,
  minWidth: `calc(${cssVar('space.6')} * 20)`,
};

/** 좌측 리소스명 열 — sticky. 폭을 고정해야 스크롤 중 열 너비가 흔들리지 않는다 */
const resourceHeadStyle: CSSProperties = {
  ...thStyle,
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  width: `calc(${cssVar('space.6')} * 8)`,
  minWidth: `calc(${cssVar('space.6')} * 8)`,
};

const actionHeadStyle: CSSProperties = {
  ...thStyle,
  width: `calc(${cssVar('space.6')} * 2)`,
  textAlign: 'center',
};

const actionHeadLabelStyle: CSSProperties = {
  display: 'block',
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.label.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

const actionHeadHintStyle: CSSProperties = {
  display: 'block',
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  fontWeight: cssVar('primitive.typography.font-weight.regular'),
  lineHeight: cssVar('typography.caption.md.line-height'),
  whiteSpace: 'nowrap',
};

/** 행 이름 셀 — 그룹/단독 행 (굵게) */
const groupNameCellStyle: CSSProperties = {
  ...tdStyle,
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  textAlign: 'left',
};

/** 행 이름 셀 — 자식 행 (한 단 들여쓴다) */
const childNameCellStyle: CSSProperties = {
  ...tdStyle,
  paddingLeft: `calc(${cssVar('space.6')} + ${cssVar('space.3')})`,
  paddingRight: cssVar('space.3'),
  fontWeight: cssVar('primitive.typography.font-weight.regular'),
  textAlign: 'left',
};

const nameRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const nameTextStyle: CSSProperties = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

function nameTextColor(disabled: boolean): CSSProperties {
  return {
    ...nameTextStyle,
    color: disabled ? cssVar('color.text.disabled') : cssVar('color.text.default'),
  };
}

const cellStyle: CSSProperties = {
  ...tdStyle,
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  textAlign: 'center',
};

/* ── 행 ──────────────────────────────────────────────────────────────────── */

interface RowProps {
  readonly matrix: PermissionMatrix;
  readonly disabled: boolean;
  /** 비활성 사유 문구의 id — 없으면 빈 문자열('' → aria-describedby 미부여, TriStateCheckbox 규약) */
  readonly describedBy: string;
  readonly onToggle: (resourceId: ResourceId, action: PermissionAction, enabled: boolean) => void;
}

/** 자식(페이지) 행 — 실제 권한의 단위 */
function LeafRow({
  id,
  resource,
  matrix,
  disabled,
  describedBy,
  onToggle,
}: RowProps & { readonly id: string; readonly resource: PermissionResource }) {
  return (
    <tr id={id} className="tds-perm-childrow">
      <th scope="row" className="tds-perm-sticky" style={childNameCellStyle}>
        <span style={nameRowStyle}>
          <span style={nameTextColor(disabled)}>{resource.label}</span>
        </span>
      </th>

      {ACTION_META.map((action) => (
        <td key={action.key} style={cellStyle}>
          <TriStateCheckbox
            checked={isActionOn(matrix, resource.id, action.key)}
            indeterminate={false}
            disabled={disabled}
            describedBy={describedBy}
            label={`${resource.label} ${action.label}`}
            onChange={(next) => onToggle(resource.id, action.key, next)}
          />
        </td>
      ))}
    </tr>
  );
}

/**
 * 최상위 행 — 그룹(자식 있음) 또는 단독 잎(대시보드).
 *
 * 그룹의 체크박스는 자식 전부 ON → checked / 일부 → indeterminate / 전부 OFF → unchecked 이고,
 * 누르면 자식 전체가 그 액션을 따라간다 (모델의 withResourceAction 이 처리한다).
 * 기본은 접힘 — 권한이 하나라도 켜진 그룹만 펼친 채로 시작한다.
 */
function ResourceRows({
  resource,
  matrix,
  disabled,
  describedBy,
  onToggle,
}: RowProps & { readonly resource: PermissionResource }) {
  const rowId = useId();
  const [open, setOpen] = useState(() => hasAnyGrant(matrix, resource));

  const children = resource.children;
  const isGroup = children.length > 0;
  const childRowIds = children.map((_, index) => `${rowId}-${String(index)}`);

  return (
    <>
      <tr className="tds-perm-grouprow">
        <th scope="row" className="tds-perm-sticky" style={groupNameCellStyle}>
          <span style={nameRowStyle}>
            {isGroup && (
              <button
                type="button"
                className="tds-perm-disclosure tds-ui-focusable"
                aria-expanded={open}
                aria-controls={childRowIds.join(' ')}
                onClick={() => setOpen((prev) => !prev)}
              >
                {open ? <ChevronDownIcon /> : <ChevronRightIcon />}
                <span style={visuallyHiddenStyle}>
                  {`${resource.label} 하위 메뉴 ${open ? '접기' : '펼치기'}`}
                </span>
              </button>
            )}
            <span style={nameTextColor(disabled)}>{resource.label}</span>
          </span>
        </th>

        {ACTION_META.map((action) => (
          <td key={action.key} style={cellStyle}>
            <TriStateCheckbox
              {...triStateProps(groupActionState(matrix, resource, action.key))}
              disabled={disabled}
              describedBy={describedBy}
              label={`${resource.label} ${action.label}`}
              onChange={(next) => onToggle(resource.id, action.key, next)}
            />
          </td>
        ))}
      </tr>

      {open &&
        children.map((child, index) => (
          <LeafRow
            key={child.id}
            id={childRowIds[index] ?? `${rowId}-${String(index)}`}
            resource={child}
            matrix={matrix}
            disabled={disabled}
            describedBy={describedBy}
            onToggle={onToggle}
          />
        ))}
    </>
  );
}

/* ── 표 ──────────────────────────────────────────────────────────────────── */

interface PermissionMatrixTableProps {
  readonly matrix: PermissionMatrix;
  /** 시스템 역할(슈퍼어드민)이면 전부 체크 + 전부 비활성 */
  readonly disabled: boolean;
  /** 비활성 사유 문구의 id — 비활성일 때만 각 체크박스에 aria-describedby 로 잇는다 */
  readonly disabledReasonId?: string | undefined;

  readonly onToggleAction: (
    resourceId: ResourceId,
    action: PermissionAction,
    enabled: boolean,
  ) => void;
  /** 열 전체선택 — 그 액션을 모든 리소스에 */
  readonly onToggleColumn: (action: PermissionAction, enabled: boolean) => void;
  /** '전체' 행의 마스터 — 모든 액션 × 모든 리소스 */
  readonly onToggleAll: (enabled: boolean) => void;
}

export function PermissionMatrixTable({
  matrix,
  disabled,
  disabledReasonId,
  onToggleAction,
  onToggleColumn,
  onToggleAll,
}: PermissionMatrixTableProps) {
  // 빈 문자열이면 TriStateCheckbox 가 aria-describedby 를 부여하지 않는다 (계약 규약)
  const describedBy = disabled ? (disabledReasonId ?? '') : '';

  return (
    <div className="tds-perm-matrix-wrap">
      <table style={matrixTableStyle}>
        <caption style={visuallyHiddenStyle}>
          권한 매트릭스 — 행은 메뉴 리소스, 열은 액션(조회·등록·수정·삭제·내보내기)예요. 조회를 끄면
          나머지 액션도 함께 꺼지고, 다른 액션을 켜면 조회가 함께 켜져요. 그룹 행의 체크박스는 하위
          메뉴 전체에 적용돼요.
        </caption>

        <thead>
          <tr className="tds-perm-headrow">
            <th scope="col" className="tds-perm-sticky" style={resourceHeadStyle}>
              리소스
            </th>
            {ACTION_META.map((action) => (
              <th key={action.key} scope="col" style={actionHeadStyle}>
                <span style={actionHeadLabelStyle}>{action.label}</span>
                <span style={actionHeadHintStyle}>{action.description}</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* '전체' 행 — 이름 칸의 마스터(모든 액션 × 모든 리소스) + 열별 전체선택 */}
          <tr className="tds-perm-grouprow">
            <th scope="row" className="tds-perm-sticky" style={groupNameCellStyle}>
              <span style={nameRowStyle}>
                <TriStateCheckbox
                  {...triStateProps(matrixState(matrix))}
                  disabled={disabled}
                  describedBy={describedBy}
                  label="모든 리소스의 모든 액션"
                  onChange={onToggleAll}
                />
                <span style={nameTextColor(disabled)}>전체</span>
              </span>
            </th>

            {ACTION_META.map((action) => (
              <td key={action.key} style={cellStyle}>
                <TriStateCheckbox
                  {...triStateProps(columnState(matrix, action.key))}
                  disabled={disabled}
                  describedBy={describedBy}
                  label={`모든 리소스 ${action.label}`}
                  onChange={(next) => onToggleColumn(action.key, next)}
                />
              </td>
            ))}
          </tr>

          {PERMISSION_RESOURCES.map((resource) => (
            <ResourceRows
              key={resource.id}
              resource={resource}
              matrix={matrix}
              disabled={disabled}
              describedBy={describedBy}
              onToggle={onToggleAction}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
