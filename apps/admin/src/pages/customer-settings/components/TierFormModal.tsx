// 등급 추가 / 이름 수정 모달
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 모듈의 Modal(shared/ui)을 그대로 재사용한다.
// 여기서는 필드와 검증 결과 표시만 담당한다 — 빈 값/길이/중복 검증은 모델(validateTierLabel)이 한다.
//
// [왜 이름만 받나 — 역할 추가와 같은 관례]
// 권한 관리의 역할 추가 모달도 이름 하나만 받고, 권한은 만든 뒤 본문에서 켠다(RoleFormModal).
// 여기서 승급 조건까지 받으면 모달과 표가 같은 값을 두 곳에서 편집하게 된다. 더 나쁜 것은
// **여기서 금액을 지어내는 것**이다 — 지어낸 숫자는 그대로 정책이 되어 회원 등급을 움직인다.
// 그래서 새 등급의 승급 조건은 비워 두고, 채우지 않으면 검증이 저장을 막는다.
import { useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  Button,
  controlStyle,
  errorIdOf,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  hintStyle,
  Modal,
  useModalDirtyGuard,
} from '../../../shared/ui';
import { TIER_LABEL_MAX } from '../types';
import type { TierMutationResult } from '../types';
import { cssVar } from '@tds/ui';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

interface TierFormModalProps {
  readonly mode: 'create' | 'rename';
  /** 수정 모드의 초기 이름 */
  readonly initialLabel: string;
  readonly onClose: () => void;
  /** 성공하면 모달을 닫는다. 실패 사유는 이 모달 안에 그대로 남는다 */
  readonly onSubmit: (label: string) => TierMutationResult;
}

export function TierFormModal({ mode, initialLabel, onClose, onSubmit }: TierFormModalProps) {
  const [label, setLabel] = useState(initialLabel);
  const [error, setError] = useState<string | null>(null);

  const labelId = useId();
  const labelRef = useRef<HTMLInputElement>(null);

  const creating = mode === 'create';

  /**
   * [FEEDBACK-06] 이 모달은 RHF 를 쓰지 않는다 — dirty 는 '초기값에서 달라졌는가' 그 자체다.
   * 저장 성공 경로는 onClose 를 직접 부르므로 가드를 지나지 않는다 — 저장했으면 물을 이유가 없다.
   */
  const { requestClose, discardDialog } = useModalDirtyGuard(label !== initialLabel, onClose);

  const submit = () => {
    const result = onSubmit(label);
    if (result.ok) {
      onClose();
      return;
    }
    setError(result.error);
    labelRef.current?.focus();
  };

  return (
    <>
      <Modal
        title={creating ? '등급 추가' : '등급 이름 수정'}
        // Esc · 딤 클릭 · × 가 모두 이 한 곳으로 모인다 (FEEDBACK-06)
        onClose={requestClose}
        onSubmit={submit}
        initialFocusRef={labelRef}
        footer={
          <>
            <Button variant="secondary" onClick={requestClose}>
              취소
            </Button>
            <Button variant="primary" type="submit">
              {creating ? '등급 만들기' : '저장'}
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          <div style={fieldStyle}>
            <label htmlFor={labelId} style={fieldLabelStyle}>
              등급 이름
            </label>
            <input
              ref={labelRef}
              id={labelId}
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(error !== null)}
              value={label}
              maxLength={TIER_LABEL_MAX}
              placeholder="예: 골드"
              aria-invalid={error !== null}
              // [A11Y-11] aria-invalid 는 **항상** 그 이유(에러 <p>)와 함께 나간다
              aria-describedby={error !== null ? errorIdOf(labelId) : undefined}
              onChange={(event) => {
                setLabel(event.target.value);
                setError(null);
              }}
            />
          </div>

          {error !== null && (
            <p id={errorIdOf(labelId)} role="alert" style={errorTextStyle}>
              {error}
            </p>
          )}

          {creating ? (
            <p style={hintStyle}>
              새 등급의 승급 조건은 비어 있고 할인율은 0%로 시작해요. 만든 뒤 표에서 값을 채우고
              저장하세요 — 승급 조건을 비운 채로는 저장할 수 없어요.
            </p>
          ) : (
            <p style={hintStyle}>
              이름만 바뀌어요. 이 등급을 쓰는 회원은 그대로 유지돼요 — 회원은 이름이 아니라 등급
              식별자를 참조해요.
            </p>
          )}
        </div>
      </Modal>

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
