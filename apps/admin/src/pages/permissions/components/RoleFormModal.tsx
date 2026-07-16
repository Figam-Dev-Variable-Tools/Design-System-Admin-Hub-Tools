// 역할 추가 / 이름 수정 모달 (A40 소유)
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 모듈의 Modal(shared/ui)을 그대로 재사용한다.
// 여기서는 필드와 검증 결과 표시만 담당한다 — 중복/빈 값 검증은 provider(validateRoleName)가 한다.
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
import { ROLE_NAME_MAX_LENGTH } from '../../../shared/permissions/roles';
import type { RoleMutationResult } from '../../../shared/permissions/PermissionProvider';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

interface RoleFormModalProps {
  readonly mode: 'create' | 'rename';
  /** 수정 모드의 초기 이름 */
  readonly initialName: string;
  readonly onClose: () => void;
  /** 성공하면 모달을 닫는다. 실패 사유는 이 모달 안에 그대로 남는다 */
  readonly onSubmit: (name: string) => RoleMutationResult;
}

export function RoleFormModal({ mode, initialName, onClose, onSubmit }: RoleFormModalProps) {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  const nameId = useId();
  const nameRef = useRef<HTMLInputElement>(null);

  const creating = mode === 'create';

  /**
   * [FEEDBACK-06] 이 모달은 RHF 를 쓰지 않는다 — dirty 는 '초기값에서 달라졌는가' 그 자체다.
   * (추가 모드의 초기값은 빈 문자열이라, 한 글자라도 치면 dirty 다.)
   * 저장 성공 경로는 onClose 를 직접 부르므로 가드를 지나지 않는다 — 저장했으면 물을 이유가 없다.
   */
  const { requestClose, discardDialog } = useModalDirtyGuard(name !== initialName, onClose);

  const submit = () => {
    const result = onSubmit(name);
    if (result.ok) {
      onClose();
      return;
    }
    setError(result.error);
    nameRef.current?.focus();
  };

  return (
    <>
      <Modal
        title={creating ? '역할 추가' : '역할명 수정'}
        // Esc · 딤 클릭 · × 가 모두 이 한 곳으로 모인다 (FEEDBACK-06)
        onClose={requestClose}
        onSubmit={submit}
        initialFocusRef={nameRef}
        footer={
          <>
            <Button variant="secondary" onClick={requestClose}>
              취소
            </Button>
            <Button variant="primary" type="submit">
              {creating ? '역할 만들기' : '저장'}
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          <div style={fieldStyle}>
            <label htmlFor={nameId} style={fieldLabelStyle}>
              역할명
            </label>
            <input
              ref={nameRef}
              id={nameId}
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(error !== null)}
              value={name}
              maxLength={ROLE_NAME_MAX_LENGTH}
              placeholder="예: 콘텐츠 운영"
              aria-invalid={error !== null}
              // [A11Y-11] aria-invalid 는 **항상** 그 이유(에러 <p>)와 함께 나간다 —
              // 없으면 스크린리더가 '잘못됨'만 알리고 '왜'를 말하지 못한다
              aria-describedby={error !== null ? errorIdOf(nameId) : undefined}
              onChange={(event) => {
                setName(event.target.value);
                setError(null);
              }}
            />
          </div>

          {error !== null && (
            <p id={errorIdOf(nameId)} role="alert" style={errorTextStyle}>
              {error}
            </p>
          )}

          {creating && (
            <p style={hintStyle}>
              새 역할의 권한은 전부 꺼진 상태로 시작합니다. 만든 뒤 권한설정에서 필요한 항목만
              켜세요.
            </p>
          )}
        </div>
      </Modal>

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
