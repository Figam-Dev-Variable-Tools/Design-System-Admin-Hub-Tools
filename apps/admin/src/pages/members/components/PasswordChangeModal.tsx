// 비밀번호 변경 모달 (RHF+zod 로 전환)
//
// [요구사항] 회원 정보 중 **관리자가 바꿀 수 있는 유일한 값이 비밀번호**다.
// 나머지(이름·연락처·주소·등급 …)는 상세 화면에서 읽기 전용 텍스트로만 보여준다.
//
// [검증] 규칙의 정본은 ../validation.ts 의 zod 스키마다 — 손으로 쓴 validate() 는 삭제했다.
// RHF 기본값(mode:'onSubmit' + reValidateMode:'onChange')이 기존 동작과 정확히 같다:
// 첫 제출 전에는 에러를 띄우지 않고, 한 번 제출한 뒤로는 입력할 때마다 즉시 재검증한다.
//
// [에러 표시 규칙 — 유지] 필드 오류는 **입력 아래 인라인**, 서버 저장 실패는 **모달 안 배너**.
import { useEffect, useId, useRef } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import {
  Alert,
  Button,
  controlStyle,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  hintStyle,
  Modal,
  useModalDirtyGuard,
} from '../../../shared/ui';
import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { useChangePassword } from '../queries';
import { PASSWORD_MIN_LENGTH, passwordChangeSchema } from '../validation';
import type { PasswordChangeFormValues } from '../validation';
import { cssVar } from '@tds/ui';

const formBodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

interface PasswordChangeModalProps {
  readonly memberId: string;
  readonly onClose: () => void;
  /** 저장 성공 — 화면이 성공 Alert 를 띄운다 */
  readonly onSaved: () => void;
}

export function PasswordChangeModal({ memberId, onClose, onSaved }: PasswordChangeModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    clearErrors,
  } = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { password: '', confirm: '' },
  });

  /** 서버 저장 실패 — 클라이언트 유효성 문구(입력 아래)와 자리를 나눈다 */
  const save = useChangePassword();
  const saving = save.isPending;

  /**
   * [FEEDBACK-06] 입력이 있는 채로 닫으려 하면 확인을 세운다. requestClose 를 Modal.onClose 와
   * 취소 버튼에 **둘 다** 넘겨 4경로(Esc·딤 클릭·×·취소)를 한 번에 덮는다.
   */
  const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose);

  const saveError =
    save.error === null ? null : '비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해 주세요.';

  const passwordId = useId();
  const confirmId = useId();
  const controllerRef = useRef<AbortController | null>(null);

  // 모달을 닫으면 진행 중이던 저장 요청도 취소한다
  useEffect(() => () => controllerRef.current?.abort(), []);

  const onValid = (values: PasswordChangeFormValues) => {
    const controller = new AbortController();
    controllerRef.current = controller;

    save.mutate(
      { memberId, password: values.password, signal: controller.signal },
      {
        onSuccess: () => {
          onSaved();
        },
        onError: (cause: unknown) => {
          // 취소는 실패가 아니다 — 모달이 닫힌 것이므로 아무것도 알리지 않는다
          if (isAbort(cause)) save.reset();
          // 실패를 조용히 삼키지 않는다 — 모달을 열어 둔 채 안내하고 버튼을 되살린다(재클릭 = 재시도).
          // 배너 문구는 save.error 를 읽어 렌더한다.
        },
      },
    );
  };

  const passwordField = register('password');
  const confirmField = register('confirm');

  return (
    <>
      <Modal
        title="비밀번호 변경"
        onClose={requestClose}
        onSubmit={() => {
          // 새 제출 시도 — 직전 서버 실패 배너를 걷어낸다
          save.reset();
          clearErrors();
          void handleSubmit(onValid)();
        }}
        footer={
          <>
            <Button variant="secondary" disabled={saving} onClick={requestClose}>
              취소
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? '저장 중…' : '저장'}
            </Button>
          </>
        }
      >
        <div style={formBodyStyle}>
          <p style={hintStyle}>
            영문과 숫자를 포함해 {PASSWORD_MIN_LENGTH}자 이상으로 설정하세요. 변경된 비밀번호는
            회원에게 별도로 안내해야 합니다.
          </p>

          <div style={fieldStyle}>
            <label htmlFor={passwordId} style={fieldLabelStyle}>
              새 비밀번호
            </label>
            <input
              id={passwordId}
              type="password"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.password !== undefined)}
              autoComplete="new-password"
              aria-invalid={errors.password !== undefined}
              aria-describedby={errors.password === undefined ? undefined : `${passwordId}-error`}
              // 요청 중 값이 바뀌면 전송한 값과 화면 값이 어긋난다 — 응답까지 잠근다
              disabled={saving}
              name={passwordField.name}
              ref={passwordField.ref}
              onChange={passwordField.onChange}
              onBlur={passwordField.onBlur}
            />
            {errors.password !== undefined && (
              <p id={`${passwordId}-error`} role="alert" style={errorTextStyle}>
                {errors.password.message}
              </p>
            )}
          </div>

          <div style={fieldStyle}>
            <label htmlFor={confirmId} style={fieldLabelStyle}>
              새 비밀번호 확인
            </label>
            <input
              id={confirmId}
              type="password"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(errors.confirm !== undefined)}
              autoComplete="new-password"
              aria-invalid={errors.confirm !== undefined}
              aria-describedby={errors.confirm === undefined ? undefined : `${confirmId}-error`}
              disabled={saving}
              name={confirmField.name}
              ref={confirmField.ref}
              onChange={confirmField.onChange}
              onBlur={confirmField.onBlur}
            />
            {errors.confirm !== undefined && (
              <p id={`${confirmId}-error`} role="alert" style={errorTextStyle}>
                {errors.confirm.message}
              </p>
            )}
          </div>

          {saveError !== null && <Alert tone="danger">{saveError}</Alert>}
        </div>
      </Modal>

      {/* 모달 밖에 둔다 — 안에 두면 모달의 포커스 트랩이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
