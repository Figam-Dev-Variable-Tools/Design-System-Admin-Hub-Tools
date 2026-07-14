// 역할 추가 / 이름 수정 모달 (A40 소유)
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 모듈의 Modal(shared/ui)을 그대로 재사용한다.
// 여기서는 필드와 검증 결과 표시만 담당한다 — 중복/빈 값 검증은 provider(validateRoleName)가 한다.
import { useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  Button,
  controlStyle,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  hintStyle,
  Modal,
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
    <Modal
      title={creating ? '역할 추가' : '역할명 수정'}
      onClose={onClose}
      onSubmit={submit}
      initialFocusRef={nameRef}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
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
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </div>

        {error !== null && (
          <p role="alert" style={errorTextStyle}>
            {error}
          </p>
        )}

        {creating && (
          <p style={hintStyle}>
            새 역할의 권한은 전부 꺼진 상태로 시작합니다. 만든 뒤 권한설정에서 필요한 항목만 켜세요.
          </p>
        )}
      </div>
    </Modal>
  );
}
