// 적립금 카드
//
// 보유 적립금 + 지급/차감 폼 + 증감 내역 표.
//
// [저장 위치] 지급/차감·삭제는 data-source 의 쓰기 계약을 호출한 뒤, 응답을 화면 상태에 반영한다.
// 지금 data-source 는 저장하지 않으므로(백엔드 대기) 반영 결과는 이 화면을 벗어나면 사라진다.
// 백엔드가 붙으면 재조회 없이도 서버가 돌려준 행을 그대로 쓰게 되어 이 코드는 그대로 유효하다.
//
// [돈이 걸린 액션]
// - 내역 삭제는 **확인 다이얼로그**를 거친다. 클릭 한 번으로 잔액이 움직이지 않는다.
// - 지급/차감·삭제 실패는 조용히 삼키지 않는다 — 폼 에러 또는 위험 톤 배너로 알린다.
// - 요청 중에는 폼 입력이 잠긴다 (보낸 값과 화면 값이 어긋나지 않게).
import { useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  Button,
  Card,
  CardTitle,
  ConfirmDialog,
  controlStyle,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  hintStyle,
  Icon,
  numericCellStyle,
  Pagination,
  SelectField,
  tableStyle,
  tdStyle,
  thStyle,
  useToast,
  visuallyHiddenStyle,
} from '../../../shared/ui';
import { isAbort } from '../../../shared/async';
import { formatNumber, formatSignedNumber } from '../../../shared/format';
import { useAddPointHistory, useRemovePointHistory } from '../queries';
import { PAGE_SIZE, POINT_ADJUST_LABEL } from '../types';
import type { PointAdjustKind, PointEntry } from '../types';
import { cssVar } from '@tds/ui';

const balanceStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontSize: cssVar('typography.title.lg.font-size'),
  fontWeight: cssVar('typography.title.lg.font-weight'),
  lineHeight: cssVar('typography.title.lg.line-height'),
  fontVariantNumeric: 'tabular-nums',
};

const formStyle: CSSProperties = {
  display: 'grid',
  // 구분(고정) · 금액(고정) · 사유(가변) · 확인(고정)
  gridTemplateColumns: `calc(${cssVar('space.6')} * 4) calc(${cssVar('space.6')} * 5) minmax(0, 1fr) auto`,
  gap: cssVar('space.2'),
  alignItems: 'end',
};

const formErrorStyle: CSSProperties = {
  ...errorTextStyle,
  gridColumn: '1 / -1',
};

const signStyle = (amount: number): CSSProperties => ({
  ...numericCellStyle,
  color: amount < 0 ? cssVar('color.feedback.danger.text') : cssVar('color.feedback.success.text'),
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
});

const deleteCellStyle: CSSProperties = {
  ...tdStyle,
  width: cssVar('space.6'),
  textAlign: 'right',
};

const emptyCellStyle: CSSProperties = {
  ...tdStyle,
  paddingTop: cssVar('space.5'),
  paddingBottom: cssVar('space.5'),
  color: cssVar('color.text.muted'),
  textAlign: 'center',
};

interface PointsCardProps {
  readonly memberId: string;
  readonly initialPoints: number;
  readonly initialHistory: readonly PointEntry[];
  /** 적립금 지급·차감 권한 (EXC-03) — 없으면 조정 폼을 그리지 않는다. 잔액·내역은 계속 읽는다 */
  readonly canUpdate: boolean;
  /** 내역 삭제 권한 (EXC-03) — 없으면 삭제 열 자체가 없다 */
  readonly canRemove: boolean;
}

export function PointsCard({
  memberId,
  initialPoints,
  initialHistory,
  canUpdate,
  canRemove,
}: PointsCardProps) {
  // 결과 통지는 공통 토스트가 맡는다 — 부모에게 콜백으로 올려보내지 않는다
  const toast = useToast();

  const [points, setPoints] = useState(initialPoints);
  const [entries, setEntries] = useState<readonly PointEntry[]>(initialHistory);

  const [kind, setKind] = useState<PointAdjustKind>('grant');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  /** 진행 중인 제출의 멱등키 — 재시도가 같은 거래임을 서버에 알린다 (BE-004-EP-03) */
  const idempotencyKeyRef = useRef<string | null>(null);

  /** 삭제 확인 대상 — 돈이 움직이는 파괴적 액션이라 확인을 거친다 */
  const [pendingRemove, setPendingRemove] = useState<PointEntry | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const removeControllerRef = useRef<AbortController | null>(null);

  // 자동 재시도는 꺼져 있다(shared/query/queryClient.ts) — 재시도는 사용자가 '확인'을 다시 누르는 것뿐이고,
  // 그때 idempotencyKeyRef 가 같은 키를 재사용해 서버가 최초 응답을 재생한다(중복 지급 없음).
  const addPoints = useAddPointHistory();
  const removePoints = useRemovePointHistory();
  const submitting = addPoints.isPending;
  const removing = removePoints.isPending;

  // 내역 표는 건수 상한 없이 늘어나던 자리다 — 목록과 같은 페이지 크기로 나눈다
  const [page, setPage] = useState(1);

  const kindId = useId();
  const amountId = useId();
  const reasonId = useId();

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleEntries = entries.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const submit = () => {
    const parsed = Number(amount);
    if (
      amount.trim() === '' ||
      !Number.isFinite(parsed) ||
      !Number.isInteger(parsed) ||
      parsed <= 0
    ) {
      setError('금액은 1 이상의 정수로 입력하세요.');
      return;
    }
    if (reason.trim() === '') {
      setError('사유를 입력하세요.');
      return;
    }
    if (kind === 'deduct' && parsed > points) {
      setError('보유 적립금보다 많이 차감할 수 없습니다.');
      return;
    }

    setError(null);

    /**
     * 멱등키는 **제출 시도 단위**로 고정한다 (호출 단위가 아니다 — BE-004-EP-03).
     *
     * 응답이 유실된 뒤 사용자가 '확인'을 다시 누르면 같은 키가 실려 서버가 최초 응답을 재생한다.
     * 호출마다 새 키를 만들면 서버가 두 요청을 별개로 보고 **적립금을 두 번 지급한다.**
     * 성공하면 키를 버려 다음 제출이 새 거래가 되게 한다.
     *
     * [react-query 재시도와의 관계 — 여기서 키를 만드는 이유]
     * 키를 mutationFn **안에서** 만들면, react-query 가 (설정에 따라) 재시도할 때마다 **새 키**가 생겨
     * 보호가 통째로 사라진다. 그래서 키는 **mutationFn 밖**(여기)에서 만들어 variables 로 넘긴다 —
     * 재시도가 자동이든(같은 variables 재사용) 수동이든(이 ref 재사용) **같은 거래는 같은 키**를 갖는다.
     */
    const key = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = key;

    addPoints.mutate(
      {
        memberId,
        input: { kind, amount: parsed, reason: reason.trim() },
        idempotencyKey: key,
      },
      {
        onSuccess: (entry) => {
          idempotencyKeyRef.current = null;
          setEntries((prev) => [entry, ...prev]);
          setPoints((prev) => prev + entry.amount);
          setAmount('');
          setReason('');
          // 새 행은 표 맨 위에 붙는다 — 그 행이 보이도록 첫 페이지로 돌아간다
          setPage(1);
          toast.success(
            `적립금 ${formatNumber(parsed)}포인트를 ${POINT_ADJUST_LABEL[kind]}했습니다.`,
          );
        },
        onError: () => {
          // 키는 남겨 둔다 — 재시도가 같은 거래임을 서버가 알아야 중복 지급이 없다
          setError('처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  const confirmRemove = () => {
    if (pendingRemove === null) return;
    const entry = pendingRemove;

    const controller = new AbortController();
    removeControllerRef.current = controller;

    setRemoveError(null);

    removePoints.mutate(
      { memberId, entryId: entry.id, signal: controller.signal },
      {
        onSuccess: () => {
          // 취소된 요청의 결과는 잔액에 반영하지 않는다
          if (controller.signal.aborted) return;
          setEntries((prev) => prev.filter((item) => item.id !== entry.id));
          setPoints((prev) => prev - entry.amount);
          setPendingRemove(null);
          toast.success('적립금 내역을 삭제했습니다.');
        },
        onError: (cause: unknown) => {
          // 취소는 실패가 아니다 — 사용자가 다이얼로그를 닫은 것이므로 아무것도 알리지 않는다
          if (isAbort(cause) || controller.signal.aborted) return;
          // 실패하면 다이얼로그를 열어 둔 채 위험 톤으로 알린다 (ConfirmDialog 가 Alert 로 렌더한다).
          // 복구 경로는 '내역 삭제' 버튼 재클릭 또는 취소다.
          setRemoveError('적립금 내역을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  /** 취소·Esc·딤 클릭 — 진행 중이던 삭제 요청도 함께 취소한다 (잔액이 뒤늦게 움직이지 않게) */
  const cancelRemove = () => {
    removeControllerRef.current?.abort();
    removeControllerRef.current = null;
    // 취소된 뮤테이션의 isPending 을 되돌린다 (react-query 는 abort 를 모른다 — signal 은 우리 것이다)
    removePoints.reset();
    setRemoveError(null);
    setPendingRemove(null);
  };

  return (
    <Card aria-labelledby="member-points-title">
      <CardTitle id="member-points-title">적립금</CardTitle>

      <p style={balanceStyle}>{`${formatNumber(points)} 포인트 (KRW)`}</p>

      {/* 돈이 움직이는 폼이다 — 지급·차감 권한이 없으면 입력 자체를 두지 않는다 (EXC-03) */}
      {canUpdate && (
        <form
          noValidate
          style={formStyle}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div style={fieldStyle}>
            <label htmlFor={kindId} style={fieldLabelStyle}>
              구분
            </label>
            <SelectField
              id={kindId}
              value={kind}
              disabled={submitting}
              onChange={(event) => setKind(event.target.value === 'deduct' ? 'deduct' : 'grant')}
            >
              <option value="grant">{POINT_ADJUST_LABEL.grant}</option>
              <option value="deduct">{POINT_ADJUST_LABEL.deduct}</option>
            </SelectField>
          </div>

          <div style={fieldStyle}>
            <label htmlFor={amountId} style={fieldLabelStyle}>
              금액
            </label>
            <input
              id={amountId}
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(error !== null)}
              value={amount}
              // 요청 중에 값을 바꾸면 전송한 값과 화면 값이 어긋난다 — 응답까지 잠근다
              disabled={submitting}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label htmlFor={reasonId} style={fieldLabelStyle}>
              사유
            </label>
            <input
              id={reasonId}
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(false)}
              value={reason}
              placeholder="예: 이벤트 참여 보상"
              disabled={submitting}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>

          <Button variant="primary" type="submit" disabled={submitting}>
            {submitting ? '처리 중…' : '확인'}
          </Button>

          {error !== null && (
            <p role="alert" style={formErrorStyle}>
              {error}
            </p>
          )}
        </form>
      )}

      <table style={tableStyle}>
        <caption style={visuallyHiddenStyle}>적립금 증감 내역</caption>
        <thead>
          <tr>
            <th scope="col" style={thStyle}>
              일자
            </th>
            <th scope="col" style={thStyle}>
              사유
            </th>
            <th scope="col" style={thStyle}>
              관련주문
            </th>
            <th scope="col" style={thStyle}>
              증감
            </th>
            {canRemove && (
              <th scope="col" style={thStyle}>
                <span style={visuallyHiddenStyle}>삭제</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {visibleEntries.length === 0 ? (
            <tr>
              {/* 삭제 열은 권한이 있을 때만 존재한다 — 빈 상태의 colSpan 도 그것을 따라간다 */}
              <td colSpan={canRemove ? 5 : 4} style={emptyCellStyle}>
                적립 내역이 없습니다.
              </td>
            </tr>
          ) : (
            visibleEntries.map((entry) => (
              <tr key={entry.id} className="tds-ui-row">
                <td style={tdStyle}>{entry.date}</td>
                <td style={tdStyle}>{entry.reason}</td>
                <td style={tdStyle}>{entry.orderNo ?? '—'}</td>
                <td style={signStyle(entry.amount)}>{formatSignedNumber(entry.amount)}</td>
                {canRemove && (
                  <td style={deleteCellStyle}>
                    <Button
                      variant="ghost"
                      aria-label={`${entry.date} ${entry.reason} 내역 삭제`}
                      disabled={removing && pendingRemove?.id === entry.id}
                      // 클릭 즉시 삭제하지 않는다 — 확인 다이얼로그를 먼저 세운다
                      onClick={() => {
                        setRemoveError(null);
                        setPendingRemove(entry);
                      }}
                    >
                      <Icon name="trash" />
                    </Button>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        onChange={setPage}
        label="적립금 증감 내역 페이지"
      />

      <p style={hintStyle}>최근 3개월간 적립 내역만 출력됩니다.</p>

      {pendingRemove !== null && (
        <ConfirmDialog
          intent="delete"
          title="적립금 내역 삭제"
          message={`${pendingRemove.date} '${pendingRemove.reason}' 내역(${formatSignedNumber(pendingRemove.amount)})을 삭제하고 잔액을 되돌립니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmLabel="내역 삭제"
          busy={removing}
          error={removeError}
          onConfirm={confirmRemove}
          onCancel={cancelRemove}
        />
      )}
    </Card>
  );
}
