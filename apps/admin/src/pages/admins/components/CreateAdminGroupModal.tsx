// 새 운영진 그룹 만들기 모달
//
// ─────────────────────────────────────────────────────────────────────────────
// [회원 화면의 CreateGroupModal 을 확장하지 않고 형제로 둔 이유 — 기록해 둔다]
//
// 두 모달이 공유하는 것은 **그룹명 한 칸**뿐이다. 회원 쪽은 '그룹 유형 + 배송비 혜택' 을 받고,
// 이쪽은 '대표 발신번호(사전등록 풀에서 선택) + 대표 발신 이메일 + 발신 자격' 을 받는다 —
// 검증 스키마도, 제출할 뮤테이션도, 확인 다이얼로그 문구도 갈린다. 한 컴포넌트에 variant 를
// 달면 **모든 필드가 조건부**가 되고, 한쪽 요구가 바뀔 때마다 다른 쪽 폼이 함께 흔들린다.
//
// 대신 **정말 중복이면 안 되는 것들은 실제로 공유한다**:
//   · 껍데기(포커스 트랩·Esc·딤·포커스 복귀)  → shared/ui 의 Modal
//   · 입력이 있는 채로 닫기 가드              → useModalDirtyGuard (FEEDBACK-06)
//   · '엔터를 눌렀더니 생겼다' 방지            → intent="create" ConfirmDialog
//   · 그룹명 길이 규칙                        → GROUP_NAME_MAX_LENGTH (shared/domain/admin-group)
//   · 만들어진 그룹이 도착하는 곳              → shared/fixtures/admin-groups 정본 저장소
// 즉 포크한 것은 **폼 본문**이고, 규칙·껍데기·저장소는 한 벌로 남는다.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import {
  Button,
  ConfirmDialog,
  controlStyle,
  errorIdOf,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  HelpTip,
  hintStyle,
  Modal,
  SelectField,
  useModalDirtyGuard,
} from '../../../shared/ui';
import { zodResolver } from '../../../shared/form/zodResolver';
import { useCreateAdminGroup, useRegisteredSenderPhonesQuery } from '../queries';
import { createAdminGroupSchema } from '../validation';
import type { CreateAdminGroupFormValues } from '../validation';
import { cssVar } from '@tds/ui';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.1'),
};

/** 체크박스 한 줄 — 라벨을 클릭 대상에 포함시킨다(작은 사각형만 노리게 두지 않는다) */
const checkboxRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.2'),
  cursor: 'pointer',
};

interface CreateAdminGroupModalProps {
  readonly onClose: () => void;
  /** 생성 성공 — 화면이 토스트를 띄운다(목록 재조회는 useCreateAdminGroup 의 무효화가 맡는다) */
  readonly onCreated: (name: string) => void;
}

export function CreateAdminGroupModal({ onClose, onCreated }: CreateAdminGroupModalProps) {
  const {
    register,
    handleSubmit,
    getValues,
    watch,
    formState: { errors, isDirty },
    clearErrors,
  } = useForm<CreateAdminGroupFormValues>({
    resolver: zodResolver(createAdminGroupSchema),
    defaultValues: { name: '', senderPhone: '', senderEmail: '', usableAsSender: true },
  });

  /** 서버 생성 실패(중복 이름 포함) — 폼 하단 한 줄에 뜬다 */
  const [serverError, setServerError] = useState<string | null>(null);
  /** 검증을 통과한 그룹명 — 확인 다이얼로그가 떠 있는 동안의 대상 */
  const [confirming, setConfirming] = useState<string | null>(null);

  const create = useCreateAdminGroup();
  const saving = create.isPending;

  // 사전등록 풀 — 실패해도 폼을 막지 않는다. 발신 자격을 끈 그룹은 번호가 필요 없기 때문이다
  const { data: phones, error: phonesError } = useRegisteredSenderPhonesQuery();

  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const senderId = useId();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // 모달을 어떤 경로로 닫든 진행 중이던 생성 요청도 함께 취소한다 —
  // 화면을 떠난 요청의 결과가 뒤늦게 토스트로 튀어나오지 않게 한다
  useEffect(() => () => controllerRef.current?.abort(), []);

  const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose);

  /** 폼 제출 = 검증까지. 실제 생성은 확인 다이얼로그를 거친다 */
  const onValid = (values: CreateAdminGroupFormValues) => {
    setServerError(null);
    setConfirming(values.name.trim());
  };

  /** 검증 실패 — 그룹명으로 포커스를 보낸다 (회원 그룹 모달과 같은 동작) */
  const onInvalid = () => {
    nameRef.current?.focus();
  };

  const confirmCreate = () => {
    if (confirming === null) return;
    const trimmed = confirming;
    const { senderPhone, senderEmail, usableAsSender } = getValues();

    setServerError(null);

    const controller = new AbortController();
    controllerRef.current = controller;

    create.mutate(
      {
        draft: {
          name: trimmed,
          // 1:N 을 지키는 자리 — 지금은 대표값 1개지만 모델은 처음부터 배열이다.
          // 나중에 번호를 덧붙일 때 스키마가 바뀌지 않는다.
          phoneNumbers: senderPhone.trim() === '' ? [] : [senderPhone.trim()],
          emails: senderEmail.trim() === '' ? [] : [senderEmail.trim()],
          usableAsSender,
        },
        signal: controller.signal,
      },
      {
        onSuccess: () => {
          onCreated(trimmed);
        },
        onError: (cause: unknown) => {
          // 취소는 실패가 아니다 — 요청이 이미 버려졌으므로 아무것도 알리지 않는다
          if (isAbort(cause)) return;
          // 실패하면 확인 다이얼로그를 닫고 폼으로 돌려보낸다 — 값을 고쳐 다시 시도할 수 있다.
          // 중복 이름은 저장소가 준 문구를 그대로 쓴다(무엇을 고쳐야 하는지가 그 문장에 있다).
          setConfirming(null);
          setServerError(
            cause instanceof Error && cause.message !== ''
              ? cause.message
              : '그룹을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.',
          );
        },
      },
    );
  };

  /** 확인 다이얼로그를 닫으면 진행 중이던 생성 요청도 취소한다 */
  const cancelCreate = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    // 취소된 뮤테이션의 isPending 을 되돌린다 (react-query 는 abort 를 모른다 — signal 은 우리 것이다)
    create.reset();
    setConfirming(null);
  };

  const nameField = register('name');
  const phoneField = register('senderPhone');
  const emailField = register('senderEmail');
  const senderField = register('usableAsSender');

  const usableAsSender = watch('usableAsSender');
  const nameError = errors.name?.message;
  const phoneError = errors.senderPhone?.message;
  const emailError = errors.senderEmail?.message;

  return (
    <>
      <Modal
        title="새 운영진 그룹 만들기"
        onClose={requestClose}
        onSubmit={() => {
          setServerError(null);
          clearErrors();
          void handleSubmit(onValid, onInvalid)();
        }}
        initialFocusRef={nameRef}
        footer={
          <>
            <Button variant="secondary" disabled={saving} onClick={requestClose}>
              취소
            </Button>
            <Button variant="primary" type="submit" disabled={saving}>
              {saving ? '만드는 중…' : '그룹 만들기'}
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          <div style={fieldStyle}>
            <label htmlFor={nameId} style={fieldLabelStyle}>
              그룹명
            </label>
            <input
              id={nameId}
              type="text"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(nameError !== undefined)}
              placeholder="예: 고객지원센터"
              aria-invalid={nameError !== undefined}
              // [A11Y-11] aria-invalid 는 항상 그 이유와 함께 나간다
              aria-describedby={nameError !== undefined ? errorIdOf(nameId) : undefined}
              aria-required
              disabled={saving}
              name={nameField.name}
              ref={(element) => {
                nameField.ref(element);
                nameRef.current = element;
              }}
              onChange={nameField.onChange}
              onBlur={nameField.onBlur}
            />
            {nameError !== undefined && (
              <p id={errorIdOf(nameId)} role="alert" style={errorTextStyle}>
                {nameError}
              </p>
            )}
          </div>

          <div style={fieldStyle}>
            <span style={labelRowStyle}>
              <label htmlFor={senderId} style={fieldLabelStyle}>
                발신 프로필로 사용
              </label>
              <HelpTip label="발신 프로필 설명">
                켜면 이 그룹을 메시지 템플릿의 '발신 프로필' 로 고를 수 있습니다. 조회·권한 필터
                용도로만 쓸 그룹은 꺼 두세요 — 발송 화면 목록이 보낼 수 없는 이름으로 채워집니다.
              </HelpTip>
            </span>
            <label htmlFor={senderId} style={checkboxRowStyle}>
              <input
                id={senderId}
                type="checkbox"
                className="tds-ui-focusable"
                disabled={saving}
                name={senderField.name}
                ref={senderField.ref}
                onChange={senderField.onChange}
                onBlur={senderField.onBlur}
              />
              <span style={hintStyle}>메시지 템플릿의 발신 프로필 목록에 표시합니다.</span>
            </label>
          </div>

          <div style={fieldStyle}>
            <span style={labelRowStyle}>
              <label htmlFor={phoneId} style={fieldLabelStyle}>
                대표 발신번호
              </label>
              <HelpTip label="대표 발신번호 설명">
                문자 발신번호는 사전등록제입니다. 통신사에 등록을 마친 번호만 목록에 나타나며,
                등록되지 않은 번호로는 발송이 거절됩니다. 번호는 그룹을 만든 뒤 더 추가할 수
                있습니다.
              </HelpTip>
            </span>
            <SelectField
              id={phoneId}
              disabled={saving}
              isInvalid={phoneError !== undefined}
              aria-invalid={phoneError !== undefined}
              {...(phoneError !== undefined && { 'aria-describedby': errorIdOf(phoneId) })}
              name={phoneField.name}
              ref={phoneField.ref}
              onChange={phoneField.onChange}
              onBlur={phoneField.onBlur}
            >
              <option value="">선택 안 함</option>
              {(phones ?? []).map((phone) => (
                <option key={phone} value={phone}>
                  {phone}
                </option>
              ))}
            </SelectField>
            {phonesError !== null && (
              <p style={hintStyle} role="alert">
                등록된 발신번호 목록을 불러오지 못했습니다. 번호는 그룹을 만든 뒤 추가할 수
                있습니다.
              </p>
            )}
            {phoneError !== undefined && (
              <p id={errorIdOf(phoneId)} role="alert" style={errorTextStyle}>
                {phoneError}
              </p>
            )}
          </div>

          <div style={fieldStyle}>
            <label htmlFor={emailId} style={fieldLabelStyle}>
              대표 발신 이메일
            </label>
            <input
              id={emailId}
              type="email"
              className="tds-ui-input tds-ui-focusable"
              style={controlStyle(emailError !== undefined)}
              placeholder="예: support@spaceplanning.ai"
              aria-invalid={emailError !== undefined}
              aria-describedby={emailError !== undefined ? errorIdOf(emailId) : undefined}
              disabled={saving}
              name={emailField.name}
              ref={emailField.ref}
              onChange={emailField.onChange}
              onBlur={emailField.onBlur}
            />
            {emailError !== undefined && (
              <p id={errorIdOf(emailId)} role="alert" style={errorTextStyle}>
                {emailError}
              </p>
            )}
          </div>

          {serverError !== null && (
            <p role="alert" style={errorTextStyle}>
              {serverError}
            </p>
          )}

          <p style={hintStyle}>
            {usableAsSender
              ? '그룹을 만들어도 운영자가 자동으로 들어가지는 않습니다. 발신번호와 발신 이메일은 그룹을 만든 뒤 더 추가할 수 있습니다.'
              : '그룹을 만들어도 운영자가 자동으로 들어가지는 않습니다. 이 그룹은 메시지 템플릿의 발신 프로필 목록에 나타나지 않습니다.'}
          </p>
        </div>
      </Modal>

      {confirming !== null && (
        <ConfirmDialog
          intent="create"
          title="운영진 그룹 만들기"
          message={
            usableAsSender
              ? `'${confirming}' 그룹을 만듭니다. 메시지 템플릿의 발신 프로필로 고를 수 있게 됩니다.`
              : `'${confirming}' 그룹을 만듭니다.`
          }
          confirmLabel="그룹 만들기"
          busy={saving}
          onConfirm={confirmCreate}
          onCancel={cancelCreate}
        />
      )}

      {/* 모달 **밖**에 둔다 — 안에 두면 모달의 포커스 트랩이 이 확인 다이얼로그를 가둔다 */}
      {discardDialog}
    </>
  );
}
