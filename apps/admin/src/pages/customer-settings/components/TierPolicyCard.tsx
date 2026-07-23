// 카드 1 — 등급 정책
//
// 등급 목록(기본 제공 3종 + 운영자가 추가한 등급)의 승급 조건과 할인율을 표로 편집하고,
// 등급 자체를 **추가·이름 수정·삭제**한다.
//
// [무엇이 잠기는가 — 권한 관리의 시스템 역할과 같은 자물쇠]
// 기본 제공 등급(일반회원·VIP·VVIP)은 이름 변경·삭제가 잠긴다. 회원이 그 id 를 참조하고,
// 회원 목록·CSV·쿠폰 발급 기준이 그 라벨을 그대로 읽기 때문이다(types.ts 의 SYSTEM_TIER_REASON).
// 승급 조건·할인율은 잠기지 않는다 — 그건 정책이지 정체성이 아니다.
//
// [사유는 문자열이다] 잠긴 버튼은 disabled 로만 말하지 않는다 — title/aria-label 에 **왜** 가 실린다.
// 그 문자열의 정본은 모델(types.ts)이고, 저장소 쪽 거절(removeTier)도 같은 문자열을 돌려준다.
//
// [검증은 여기 없다] 이 카드는 validateDraft() 가 만든 이슈를 **표시**만 한다.
// 입력을 막지 않는다 — 잘못된 값도 들어올 수 있고, 저장 시점에 모델이 거부한다.
import { useId } from 'react';
import type { CSSProperties } from 'react';

import {
  Alert,
  Button,
  buttonStyle,
  Card,
  CardTitle,
  controlStyle,
  errorTextStyle,
  HelpTip,
  hintStyle,
  Icon,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import {
  BASE_TIER,
  discountFieldOf,
  DISCOUNT_MAX,
  issuesFor,
  SYSTEM_TIER_REASON,
  thresholdFieldOf,
  tierDeletionBlock,
  warningsOf,
} from '../types';
import type { IssueTarget, PolicyIssue, TierDraftRow } from '../types';
import { cssVar } from '@tds/ui';

const tableWrapStyle: CSSProperties = {
  overflowX: 'auto',
  minWidth: 0,
};

/** 입력 + 단위(원/%) 를 한 줄로 — 단위는 표시용이라 스크린 리더에서는 라벨이 대신한다 */
const inputRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  minWidth: 0,
};

const unitStyle: CSSProperties = {
  flexShrink: 0,
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
};

// [세로 정렬] 입력 셀이 (입력 + 접미사) 아래에 힌트/오류 문구를 쌓아 높이가 커지는데, 셀이
// verticalAlign:middle 이면 그 스택 '전체'가 가운데로 몰려 헤더와 어긋난다. 셀을 top 정렬로 두고,
// 행 헤더 텍스트를 입력의 첫 줄에 맞춘다.
const cellStyle: CSSProperties = {
  ...tdStyle,
  minWidth: `calc(${cssVar('space.6')} * 5)`,
  verticalAlign: 'top',
};

const tierCellStyle: CSSProperties = {
  ...tdStyle,
  verticalAlign: 'top',
  // 입력의 텍스트 첫 줄 = 셀 상단 패딩(space-3) + 입력 테두리(thin) + 입력 세로 패딩(space-2)
  paddingTop: `calc(${cssVar('space.3')} + ${cssVar('border-width.thin')} + ${cssVar('space.2')})`,
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  whiteSpace: 'nowrap',
};

const actionsCellStyle: CSSProperties = {
  ...cellStyle,
  minWidth: 0,
  whiteSpace: 'nowrap',
};

const actionsStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const dangerGhostStyle: CSSProperties = {
  ...buttonStyle('ghost'),
  color: cssVar('color.feedback.danger.text'),
};

/** 기본 제공 등급의 자물쇠 — '이름을 못 바꾼다'를 비활성 상태 말고도 알린다 */
const lockStyle: CSSProperties = {
  display: 'inline-flex',
  marginLeft: cssVar('space.1'),
  color: cssVar('color.text.muted'),
  verticalAlign: 'middle',
};

/** 셀 안의 입력 + (있으면) 에러 문구 */
const stackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.1'),
  minWidth: 0,
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

/* ── 행 ─────────────────────────────────────────────────────────────────────
 *
 * [왜 컴포넌트로 떼었나] 한 행이 답해야 하는 질문이 다섯이다: 기본 등급인가 / 기본 제공 등급인가 /
 * 어느 칸이 틀렸는가 / 지울 수 있는가 / 이 역할이 고칠 수 있는가. 그 다섯을 map 콜백 안에 두면
 * 한 함수의 분기가 서른 갈래가 되고(code-quality 축4), 무엇보다 **각 분기가 무엇을 지키는지**가
 * 읽히지 않는다. 판정은 전부 부모가 넘겨주고, 이 컴포넌트는 그리기만 한다.
 */

interface TierPolicyRowProps {
  readonly row: TierDraftRow;
  /** 부모의 useId — 입력·오류 문구 id 가 이 접두어를 공유한다 */
  readonly uid: string;
  readonly baseHintId: string;
  readonly systemReasonId: string;
  /** 이 칸의 오류 문구 — 없으면 null (제출 전에는 늘 null 이다) */
  readonly thresholdError: string | null;
  readonly discountError: string | null;
  /** 삭제를 막는 사유 — 없으면 null. 문구의 정본은 모델(tierDeletionBlock)이다 */
  readonly deleteBlock: string | null;
  readonly disabled: boolean;
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
  readonly onRename: (row: TierDraftRow) => void;
  readonly onDelete: (row: TierDraftRow) => void;
  readonly onThresholdChange: (tierId: string, raw: string) => void;
  readonly onThresholdBlur: (tierId: string) => void;
  readonly onDiscountChange: (tierId: string, raw: string) => void;
}

/** 승급 조건 칸 — 기본 등급은 잠기고(정의), 오류·안내 문구가 입력 아래로 흐른다 */
function ThresholdCell({
  row,
  uid,
  baseHintId,
  error,
  disabled,
  canUpdate,
  onChange,
  onBlur,
}: {
  readonly row: TierDraftRow;
  readonly uid: string;
  readonly baseHintId: string;
  readonly error: string | null;
  readonly disabled: boolean;
  readonly canUpdate: boolean;
  readonly onChange: (tierId: string, raw: string) => void;
  readonly onBlur: (tierId: string) => void;
}) {
  const isBase = row.id === BASE_TIER;
  const inputId = `${uid}-${row.id}-threshold`;
  const errorId = `${inputId}-error`;

  // 기본 등급 행은 '조건 수정 불가' 안내를, 오류가 있으면 오류 문구를 함께 가리킨다
  const describedBy = [isBase ? baseHintId : null, error !== null ? errorId : null]
    .filter((id): id is string => id !== null)
    .join(' ');

  return (
    <td style={cellStyle}>
      <div style={stackStyle}>
        <div style={inputRowStyle}>
          <label htmlFor={inputId} style={visuallyHiddenStyle}>
            {`${row.label} 승급 조건 (누적 구매금액, 원)`}
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(error !== null)}
            value={isBase ? '0' : row.threshold}
            // 기본 등급의 조건은 정책이 아니라 정의다 — 입력을 열어두지 않는다
            disabled={disabled || isBase || !canUpdate}
            aria-invalid={error !== null}
            aria-describedby={describedBy === '' ? undefined : describedBy}
            onChange={(event) => onChange(row.id, event.target.value)}
            onBlur={() => onBlur(row.id)}
          />
          <span style={unitStyle} aria-hidden="true">
            원 이상
          </span>
        </div>

        {isBase && (
          <p id={baseHintId} style={hintStyle}>
            기본 등급이라 승급 조건을 수정할 수 없어요. 가입 직후의 모든 회원이 여기에 속해요.
          </p>
        )}

        {error !== null && (
          <p id={errorId} role="alert" style={errorTextStyle}>
            {error}
          </p>
        )}
      </div>
    </td>
  );
}

/** 할인율 칸 — 기본 등급도 열려 있다(정책이지 정의가 아니다) */
function DiscountCell({
  row,
  uid,
  error,
  disabled,
  canUpdate,
  onChange,
}: {
  readonly row: TierDraftRow;
  readonly uid: string;
  readonly error: string | null;
  readonly disabled: boolean;
  readonly canUpdate: boolean;
  readonly onChange: (tierId: string, raw: string) => void;
}) {
  const inputId = `${uid}-${row.id}-discount`;
  const errorId = `${inputId}-error`;

  return (
    <td style={cellStyle}>
      <div style={stackStyle}>
        <div style={inputRowStyle}>
          <label htmlFor={inputId} style={visuallyHiddenStyle}>
            {`${row.label} 할인율 (0~${String(DISCOUNT_MAX)} 퍼센트)`}
          </label>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className="tds-ui-input tds-ui-focusable"
            style={controlStyle(error !== null)}
            value={row.discount}
            disabled={disabled || !canUpdate}
            aria-invalid={error !== null}
            aria-describedby={error !== null ? errorId : undefined}
            onChange={(event) => onChange(row.id, event.target.value)}
          />
          <span style={unitStyle} aria-hidden="true">
            %
          </span>
        </div>

        {error !== null && (
          <p id={errorId} role="alert" style={errorTextStyle}>
            {error}
          </p>
        )}
      </div>
    </td>
  );
}

/**
 * 행 액션 — 이름 수정 · 삭제.
 * 잠긴 버튼은 **접근성 이름에 사유를 싣는다** — 비활성 상태와 색만으로 이유를 전달하지 않는다.
 */
function RowActionsCell({
  row,
  systemReasonId,
  deleteBlock,
  disabled,
  canUpdate,
  canRemove,
  onRename,
  onDelete,
}: {
  readonly row: TierDraftRow;
  readonly systemReasonId: string;
  readonly deleteBlock: string | null;
  readonly disabled: boolean;
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
  readonly onRename: (row: TierDraftRow) => void;
  readonly onDelete: (row: TierDraftRow) => void;
}) {
  const renameLocked = row.system || disabled;
  const deleteLocked = deleteBlock !== null || disabled;

  return (
    <td style={actionsCellStyle}>
      <span style={actionsStyle}>
        {canUpdate && (
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={buttonStyle('ghost', renameLocked)}
            aria-label={
              row.system ? `${row.label} — ${SYSTEM_TIER_REASON}` : `${row.label} 이름 수정`
            }
            title={row.system ? SYSTEM_TIER_REASON : undefined}
            aria-describedby={row.system ? systemReasonId : undefined}
            disabled={renameLocked}
            onClick={() => onRename(row)}
          >
            <Icon name="pencil" />
          </button>
        )}
        {canRemove && (
          <button
            type="button"
            className="tds-ui-btn-ghost tds-ui-focusable"
            style={deleteLocked ? buttonStyle('ghost', true) : dangerGhostStyle}
            aria-label={deleteBlock ?? `${row.label} 삭제`}
            title={deleteBlock ?? undefined}
            aria-describedby={row.system ? systemReasonId : undefined}
            disabled={deleteLocked}
            onClick={() => onDelete(row)}
          >
            <Icon name="trash" />
          </button>
        )}
      </span>
    </td>
  );
}

function TierPolicyRow({
  row,
  uid,
  baseHintId,
  systemReasonId,
  thresholdError,
  discountError,
  deleteBlock,
  disabled,
  canUpdate,
  canRemove,
  onRename,
  onDelete,
  onThresholdChange,
  onThresholdBlur,
  onDiscountChange,
}: TierPolicyRowProps) {
  return (
    <tr>
      <th scope="row" style={tierCellStyle}>
        {row.label}
        {row.id === BASE_TIER && <span style={hintStyle}> (기본 등급)</span>}
        {row.system && (
          <span style={lockStyle} title={SYSTEM_TIER_REASON}>
            <Icon name="lock" />
            <span style={visuallyHiddenStyle}>기본 제공 등급</span>
          </span>
        )}
      </th>

      <ThresholdCell
        row={row}
        uid={uid}
        baseHintId={baseHintId}
        error={thresholdError}
        disabled={disabled}
        canUpdate={canUpdate}
        onChange={onThresholdChange}
        onBlur={onThresholdBlur}
      />

      <DiscountCell
        row={row}
        uid={uid}
        error={discountError}
        disabled={disabled}
        canUpdate={canUpdate}
        onChange={onDiscountChange}
      />

      {(canUpdate || canRemove) && (
        <RowActionsCell
          row={row}
          systemReasonId={systemReasonId}
          deleteBlock={deleteBlock}
          disabled={disabled}
          canUpdate={canUpdate}
          canRemove={canRemove}
          onRename={onRename}
          onDelete={onDelete}
        />
      )}
    </tr>
  );
}

/* ── 카드 ───────────────────────────────────────────────────────────────── */

interface TierPolicyCardProps {
  readonly rows: readonly TierDraftRow[];
  readonly issues: readonly PolicyIssue[];
  /** 제출을 한 번이라도 시도했는가 — 타이핑 도중에 빨간 문구가 먼저 튀어나오지 않게 한다 */
  readonly showErrors: boolean;
  /** 저장 중에는 폼 전체를 잠근다 */
  readonly disabled: boolean;
  /** 등급 id → 그 등급을 쓰는 회원 수 (null = 확인 불가). 삭제 차단의 근거다 */
  readonly memberCounts: Readonly<Record<string, number | null>>;
  readonly canCreate: boolean;
  readonly canUpdate: boolean;
  readonly canRemove: boolean;
  readonly onAdd: () => void;
  readonly onRename: (row: TierDraftRow) => void;
  readonly onDelete: (row: TierDraftRow) => void;
  readonly onThresholdChange: (tierId: string, raw: string) => void;
  readonly onThresholdBlur: (tierId: string) => void;
  readonly onDiscountChange: (tierId: string, raw: string) => void;
}

export function TierPolicyCard({
  rows,
  issues,
  showErrors,
  disabled,
  memberCounts,
  canCreate,
  canUpdate,
  canRemove,
  onAdd,
  onRename,
  onDelete,
  onThresholdChange,
  onThresholdBlur,
  onDiscountChange,
}: TierPolicyCardProps) {
  const uid = useId();
  const titleId = `${uid}-title`;
  const baseHintId = `${uid}-base-hint`;
  const systemReasonId = `${uid}-system-reason`;

  const warnings = warningsOf(issuesFor(issues, 'policy'));
  const policyErrors = issuesFor(issues, 'policy').filter((issue) => issue.severity === 'error');

  const errorOf = (target: IssueTarget): string | null => {
    if (!showErrors) return null;
    const found = issuesFor(issues, target).find((issue) => issue.severity === 'error');
    return found?.message ?? null;
  };

  return (
    <Card aria-labelledby={titleId}>
      <div style={headerRowStyle}>
        <CardTitle id={titleId}>
          <span style={labelRowStyle}>
            등급 정책
            <HelpTip label="등급 정책 설명">
              누적 구매금액이 승급 조건을 넘으면 해당 등급이 돼요. 할인율은 그 등급의 회원이 주문할
              때 적용돼요. 일반회원은 기본 등급이라 승급 조건이 없어요(항상 0원). 등급의 서열은 승급
              조건 금액이 정해요 — 그래서 금액은 등급마다 달라야 해요.
            </HelpTip>
          </span>
        </CardTitle>

        {/* 등록 권한이 없으면 버튼 자체를 보여 주지 않는다 — 누를 수 없는 것을 보여 주지 않는다 (EXC-03) */}
        {canCreate && (
          <Button variant="secondary" disabled={disabled} onClick={onAdd}>
            <Icon name="plus-circle" />
            등급 추가
          </Button>
        )}
      </div>

      <div style={tableWrapStyle}>
        <table style={tableStyle}>
          <caption style={visuallyHiddenStyle}>
            등급별 승급 조건(누적 구매금액)과 할인율 — 일반회원의 승급 조건은 수정할 수 없고, 기본
            제공 등급은 이름 변경·삭제를 할 수 없어요.
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
              {(canUpdate || canRemove) && (
                <th scope="col" style={thStyle}>
                  관리
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <TierPolicyRow
                key={row.id}
                row={row}
                uid={uid}
                baseHintId={baseHintId}
                systemReasonId={systemReasonId}
                thresholdError={errorOf(thresholdFieldOf(row.id))}
                discountError={errorOf(discountFieldOf(row.id))}
                // 삭제를 막는 사유 — 기본 제공 등급이거나, 그 등급을 쓰는 회원이 남아 있거나,
                // 회원 수를 확인할 수 없거나(미배선). 문구의 정본은 모델이다.
                deleteBlock={tierDeletionBlock(row, memberCounts[row.id] ?? null)}
                disabled={disabled}
                canUpdate={canUpdate}
                canRemove={canRemove}
                onRename={onRename}
                onDelete={onDelete}
                onThresholdChange={onThresholdChange}
                onThresholdBlur={onThresholdBlur}
                onDiscountChange={onDiscountChange}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* 비활성 버튼이 aria-describedby 로 가리키는 문구 — 보이는 텍스트이기도 하다
          (사유를 색·비활성 상태만으로 전달하지 않는다) */}
      <p id={systemReasonId} style={hintStyle}>
        {`일반회원·VIP·VVIP 는 ${SYSTEM_TIER_REASON}`}
      </p>
      <p style={hintStyle}>
        추가한 등급은 저장해야 실제로 만들어져요. 등급을 지우려면 그 등급을 쓰는 회원이 한 명도
        없어야 해요.
      </p>

      {/* 어느 칸에도 붙지 않는 오류(기본 등급 소실·이름 빈 값) — 표 밖에서 말한다 */}
      {showErrors &&
        policyErrors.map((issue) => (
          <Alert key={issue.message} tone="danger">
            {issue.message}
          </Alert>
        ))}

      {/* 경고 — 저장을 막지는 않는다. 다만 조용히 넘기지도 않는다 */}
      {warnings.map((warning) => (
        <Alert key={warning.message} tone="warning">
          {warning.message}
        </Alert>
      ))}
    </Card>
  );
}
