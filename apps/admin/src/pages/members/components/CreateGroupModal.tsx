// 새 그룹 만들기 모달 (A40 소유)
//
// 껍데기(포커스 트랩·Esc·딤·포커스 복귀)는 공통 모듈의 Modal 을 그대로 재사용한다.
// 여기서는 폼 필드와 검증만 담당한다.
//
// [생성 확인] 폼을 제출하면 곧바로 만들지 않는다 — intent="create" ConfirmDialog 로 한 번 확인한다.
// 그룹은 만들고 나면 배송비 정책이 붙는 실체라, '엔터를 눌렀더니 생겼다'가 되면 안 된다.
// 폼 모달 위에 확인 다이얼로그가 겹친다 (Modal 이 중첩을 지원한다 — 포커스/스크롤 잠금 모두 복원된다).
//
// [주의] 이건 '회원'을 만드는 게 아니라 '그룹'을 만드는 것이다 — 회원은 여전히 가입으로만 유입된다.
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
import { useCreateGroup } from '../queries';
import { GROUP_TYPE_OPTIONS, SHIPPING_BENEFIT_OPTIONS } from '../types';
import { createGroupSchema } from '../validation';
import type { CreateGroupFormValues } from '../validation';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-4)',
};

const labelRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-1)',
};

interface CreateGroupModalProps {
  readonly onClose: () => void;
  /** 생성 성공 — 화면이 성공 Alert 를 띄우고 그룹 목록을 다시 불러온다 */
  readonly onCreated: (name: string) => void;
}

export function CreateGroupModal({ onClose, onCreated }: CreateGroupModalProps) {
  // 검증 규칙의 정본은 ../validation.ts 의 zod 스키마다 — 손으로 쓴 if 검증은 삭제했다.
  // RHF 기본값(mode:'onSubmit')이 기존 동작과 같다: 제출 전에는 에러를 띄우지 않는다.
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isDirty },
    clearErrors,
  } = useForm<CreateGroupFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: { name: '', type: 'member', shippingBenefit: 'none' },
  });

  /** 서버 생성 실패 — 필드 오류(인라인)와 같은 자리에 뜬다 (기존 동작) */
  const [serverError, setServerError] = useState<string | null>(null);
  /** 검증을 통과한 그룹명 — 확인 다이얼로그가 떠 있는 동안의 대상 */
  const [confirming, setConfirming] = useState<string | null>(null);

  const create = useCreateGroup();
  const saving = create.isPending;

  const nameId = useId();
  const typeId = useId();
  const shippingId = useId();
  const nameRef = useRef<HTMLInputElement | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // 모달을 Esc·딤 클릭·닫기(×)·취소로 닫으면 진행 중이던 생성 요청도 함께 취소한다 —
  // 화면을 떠난 요청의 결과가 뒤늦게 배너로 튀어나오지 않게 한다
  useEffect(() => () => controllerRef.current?.abort(), []);

  /**
   * [FEEDBACK-06] 입력이 있는 채로 닫으려 하면 확인을 세운다.
   *
   * 이 모달은 **생성** 방향은 이미 ConfirmDialog 로 막아 뒀지만('엔터를 눌렀더니 생겼다'가 되면
   * 안 되므로) **폐기** 방향은 무방비였다 — 빗나간 딤 클릭 하나가 반쯤 채운 폼을 조용히 지웠다.
   * requestClose 를 Modal.onClose 와 취소 버튼에 **둘 다** 넘겨 4경로를 한 번에 덮는다.
   */
  const { requestClose, discardDialog } = useModalDirtyGuard(isDirty && !saving, onClose);

  /** 폼 제출 = 검증까지. 실제 생성은 확인 다이얼로그를 거친다 */
  const onValid = (values: CreateGroupFormValues) => {
    setServerError(null);
    setConfirming(values.name.trim());
  };

  /** 검증 실패 — 그룹명으로 포커스를 보낸다 (기존 동작) */
  const onInvalid = () => {
    nameRef.current?.focus();
  };

  const confirmCreate = () => {
    if (confirming === null) return;
    const trimmed = confirming;
    const { type, shippingBenefit } = getValues();

    setServerError(null);

    const controller = new AbortController();
    controllerRef.current = controller;

    create.mutate(
      { input: { name: trimmed, type, shippingBenefit }, signal: controller.signal },
      {
        onSuccess: () => {
          onCreated(trimmed);
        },
        onError: (cause: unknown) => {
          // 취소는 실패가 아니다 — 요청이 이미 버려졌으므로 아무것도 알리지 않는다
          if (isAbort(cause)) return;
          // 실패하면 확인 다이얼로그를 닫고 폼으로 돌려보낸다 — 값을 고쳐 다시 시도할 수 있다
          setConfirming(null);
          setServerError('그룹을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.');
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
  const typeField = register('type');
  const shippingField = register('shippingBenefit');

  /** 필드 오류와 서버 실패는 같은 한 줄을 쓴다 — 기존 동작 그대로 */
  const shownError = errors.name?.message ?? serverError;

  return (
    <>
      <Modal
        title="새 그룹 만들기"
        // Esc · 딤 클릭 · × 가 모두 이 한 곳으로 모인다 (FEEDBACK-06)
        onClose={requestClose}
        onSubmit={() => {
          // 새 제출 시도 — 직전 서버 실패 문구를 걷어낸다
          setServerError(null);
          clearErrors();
          void handleSubmit(onValid, onInvalid)();
        }}
        initialFocusRef={nameRef}
        footer={
          <>
            {/* 네 번째 경로 — 취소 버튼도 같은 가드를 지난다 */}
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
              style={controlStyle(shownError !== null && shownError !== undefined)}
              placeholder="예: 무료 배송 결제 그룹"
              aria-invalid={shownError !== null && shownError !== undefined}
              // [A11Y-11] aria-invalid 는 **항상** 그 이유(에러 <p>)와 함께 나간다 — 없으면
              // 스크린리더가 '잘못됨'만 알리고 '왜'를 말하지 못한다. 그리고 필수는 필수라고 말한다:
              // zod 는 이 필드를 필수로 알지만 그 사실이 AT 에게 전달되던 경로가 없었다.
              aria-describedby={
                shownError !== null && shownError !== undefined ? errorIdOf(nameId) : undefined
              }
              aria-required
              // 요청 중에 값을 바꾸면 전송된 값과 화면 값이 어긋난다 — 응답까지 잠근다
              disabled={saving}
              name={nameField.name}
              // Modal 의 initialFocusRef(첫 포커스)와 RHF 의 ref 를 함께 물린다
              ref={(element) => {
                nameField.ref(element);
                nameRef.current = element;
              }}
              onChange={nameField.onChange}
              onBlur={nameField.onBlur}
            />
          </div>

          <div style={fieldStyle}>
            <span style={labelRowStyle}>
              <label htmlFor={typeId} style={fieldLabelStyle}>
                그룹 유형
              </label>
              <HelpTip label="그룹 유형 설명">
                일반 회원 그룹은 회원 목록에서 필터로 쓰입니다. 운영진 그룹은 관리자 화면(관리자
                관리)에서만 쓰이며, 회원 상세에는 나타나지 않습니다.
              </HelpTip>
            </span>
            <SelectField
              id={typeId}
              disabled={saving}
              name={typeField.name}
              ref={typeField.ref}
              onChange={typeField.onChange}
              onBlur={typeField.onBlur}
            >
              {GROUP_TYPE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>

          <div style={fieldStyle}>
            <span style={labelRowStyle}>
              <label htmlFor={shippingId} style={fieldLabelStyle}>
                배송비 혜택
              </label>
              <HelpTip label="배송비 혜택 설명">
                이 그룹에 속한 회원의 주문에 적용할 배송비 정책입니다. '조건부 무료 배송'은 상품
                관리의 배송 정책에서 기준 금액을 따릅니다.
              </HelpTip>
            </span>
            <SelectField
              id={shippingId}
              disabled={saving}
              name={shippingField.name}
              ref={shippingField.ref}
              onChange={shippingField.onChange}
              onBlur={shippingField.onBlur}
            >
              {SHIPPING_BENEFIT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectField>
          </div>

          {shownError !== null && shownError !== undefined && (
            <p id={errorIdOf(nameId)} role="alert" style={errorTextStyle}>
              {shownError}
            </p>
          )}

          <p style={hintStyle}>
            그룹을 만들어도 회원이 자동으로 들어가지는 않습니다. 회원은 회원가입으로만 유입되며,
            그룹 배정은 별도 운영 정책을 따릅니다.
          </p>
        </div>
      </Modal>

      {confirming !== null && (
        <ConfirmDialog
          intent="create"
          title="그룹 만들기"
          message={`'${confirming}' 그룹을 만듭니다.`}
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
