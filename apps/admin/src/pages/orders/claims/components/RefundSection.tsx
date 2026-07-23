// 환불 처리 섹션 (클레임 상세 1곳 전용)
//
// 세 가지를 한 카드에서 말한다: **얼마를 왜 그만큼 돌려주는가**(계산 내역) · **무엇을 뺄 것인가**
// (차감 입력) · **완료하면 무엇이 돌아가는가**(복원 예고/결과).
//
// [계산은 이 컴포넌트가 하지 않는다] 화면이 스스로 빼기 시작하면 목록·상세·정산이 각자 다른 금액을
// 말하는 날이 온다. 부모가 편집 중인 값으로 만든 draft 를 넘기고, 여기서는 refundBreakdown 의
// 결과를 그리기만 한다(계산의 유일한 자리는 ../refund).
//
// [막힌 버튼은 이유를 말한다] 접수·완료 버튼의 disabled 는 전이 가드가 돌려준 사유 문자열이 있다는
// 뜻이고, 그 문자열을 그대로 버튼 옆에 쓴다 — 화면이 사유를 다시 지어내지 않는다.
import type { CSSProperties } from 'react';
import { Checkbox, cssVar, TextField } from '@tds/ui';

import { formatDateTime, formatNumber } from '../../../../shared/format';
import {
  Alert,
  Button,
  Card,
  CardTitle,
  ddStyle,
  dlStyle,
  dtStyle,
  hintStyle,
  StatusBadge,
} from '../../../../shared/ui';
import { refundBreakdown, refundStatusLabel, refundStatusTone } from '../refund';
import type { ClaimRefund } from '../refund';

const sectionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
};

const totalRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.3'),
  borderTopStyle: 'solid',
  borderTopWidth: cssVar('border-width.thin'),
  borderTopColor: cssVar('color.border.default'),
};

/** 실제 환불액 — 다른 값보다 굵게. 운영자가 가장 먼저 찾는 숫자다(주문 상세의 결제금액과 같은 결) */
const totalValueStyle: CSSProperties = {
  ...ddStyle,
  fontWeight: cssVar('primitive.typography.font-weight.bold'),
  fontVariantNumeric: 'tabular-nums',
};

const deductionStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  maxWidth: `calc(${cssVar('space.6')} * 8)`,
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: cssVar('space.2'),
  flexWrap: 'wrap',
};

interface RefundSectionProps {
  /** 편집 중인 값이 반영된 환불 정보 — 계산은 이 draft 로 한다 */
  readonly draft: ClaimRefund;
  /** 저장된 환불 정보 — 완료 여부·복원 결과처럼 '이미 일어난 사실' 은 이쪽을 읽는다 */
  readonly saved: ClaimRefund;
  readonly feeInput: string;
  readonly feeError: string | undefined;
  /** 배송 정책이 준 반품배송비 — 모르면 null(그 사실을 그대로 밝힌다) */
  readonly policyFee: number | null;
  readonly disabled: boolean;
  /** 환불 접수를 막는 사유 — null 이면 누를 수 있다 */
  readonly requestBlock: string | null;
  /** 환불 완료를 막는 사유 — null 이면 누를 수 있다 */
  readonly completeBlock: string | null;
  readonly onFeeChange: (next: string) => void;
  readonly onCouponRestoredChange: (next: boolean) => void;
  readonly onRequest: () => void;
  readonly onComplete: () => void;
}

export function RefundSection({
  draft,
  saved,
  feeInput,
  feeError,
  policyFee,
  disabled,
  requestBlock,
  completeBlock,
  onFeeChange,
  onCouponRestoredChange,
  onRequest,
  onComplete,
}: RefundSectionProps) {
  const breakdown = refundBreakdown(draft);
  const done = saved.completedAt !== '';
  // 완료된 환불의 차감은 이미 나간 돈의 근거다 — 사후에 고칠 수 없다(어댑터도 같은 이유로 막는다).
  const locked = disabled || done;

  return (
    <Card>
      <CardTitle>
        환불 처리
        <StatusBadge
          tone={refundStatusTone(saved.status)}
          label={refundStatusLabel(saved.status)}
        />
      </CardTitle>

      <div style={sectionStyle}>
        <dl style={dlStyle}>
          <dt style={dtStyle}>결제액</dt>
          <dd style={ddStyle}>{`${formatNumber(breakdown.paid)}원`}</dd>
          <dt style={dtStyle}>반품배송비 차감</dt>
          <dd style={ddStyle}>{`− ${formatNumber(breakdown.returnShippingFee)}원`}</dd>
          <dt style={dtStyle}>회수 쿠폰분</dt>
          <dd style={ddStyle}>
            {draft.couponDiscount === 0
              ? '사용한 쿠폰 없음'
              : `− ${formatNumber(breakdown.couponClawback)}원${draft.couponRestored ? ` (${draft.couponName} 복원)` : ' (쿠폰을 복원하지 않아 회수하지 않아요)'}`}
          </dd>
        </dl>

        <div style={totalRowStyle}>
          <span style={hintStyle}>실제 환불액</span>
          <span style={totalValueStyle}>{`${formatNumber(breakdown.total)}원`}</span>
        </div>

        <div style={deductionStyle}>
          <TextField
            id="claim-return-fee"
            label="반품배송비(원)"
            type="number"
            inputMode="numeric"
            value={feeInput}
            disabled={locked}
            error={feeError ?? ''}
            onChange={(event) => onFeeChange(event.target.value)}
          />
          <span style={hintStyle}>
            {policyFee === null
              ? '배송 정책의 반품배송비를 불러오지 못했어요. 금액을 직접 입력하세요.'
              : `배송 정책 기본값 ${formatNumber(policyFee)}원 — 이 건만 다르게 정할 수 있어요.`}
          </span>
          {draft.couponDiscount > 0 && (
            <Checkbox
              id="claim-coupon-restore"
              label={`${draft.couponName} 복원(환불액에서 ${formatNumber(draft.couponDiscount)}원 회수)`}
              checked={draft.couponRestored}
              disabled={locked}
              onChange={(event) => onCouponRestoredChange(event.target.checked)}
            />
          )}
        </div>

        {done ? (
          <Alert tone="success">
            {`${formatDateTime(saved.completedAt)} 환불 완료 — 적립금 ${formatNumber(saved.restoredPoint)}원을 원장에 복원했어요.${
              saved.couponRestored ? ` ${saved.couponName} 쿠폰도 복원했어요.` : ''
            }`}
          </Alert>
        ) : (
          <>
            <p style={hintStyle}>
              {draft.pointUsed === 0
                ? '이 주문에는 사용한 적립금이 없어요. 환불완료 시 복원할 적립금도 없어요.'
                : `환불완료 처리를 해야 사용한 적립금 ${formatNumber(draft.pointUsed)}원이 원장으로 돌아가요.`}
            </p>
            <div style={actionsStyle}>
              {(requestBlock ?? completeBlock) !== null && (
                <span style={hintStyle}>{requestBlock ?? completeBlock}</span>
              )}
              <Button
                variant="secondary"
                disabled={disabled || requestBlock !== null}
                onClick={onRequest}
              >
                환불 접수
              </Button>
              <Button
                variant="primary"
                disabled={disabled || completeBlock !== null || feeError !== undefined}
                onClick={onComplete}
              >
                환불 완료 처리
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
