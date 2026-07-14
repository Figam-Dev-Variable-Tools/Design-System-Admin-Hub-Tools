// 확인 다이얼로그 — CRUD 확인의 단일 창구 (A40 소유 — apps/admin/src/shared/ui/**)
//
// [의도(intent)가 톤·라벨·아이콘을 정한다]
// 호출부가 매번 색과 문구를 고르면 같은 '삭제'가 화면마다 다른 색으로 보인다. 그래서 의도만 받는다:
//
//   intent      | 용도                          | 기본 확인 라벨 | 톤
//   ------------|-------------------------------|----------------|--------
//   'create'    | 생성 확인                     | '만들기'       | primary
//   'update'    | 수정/저장 확인                | '저장'         | primary
//   'delete'    | 삭제 확인                     | '삭제'         | danger
//   'discard'   | 저장하지 않은 변경을 버리고 이탈 | '나가기'      | danger
//
// [실패는 다이얼로그를 닫지 않는다]
// error 를 주면 다이얼로그 안에 danger 배너로 뜨고 확인 버튼이 되살아난다 — **재클릭이 곧 재시도**다.
// (여기서 토스트를 쓰지 않는 이유: 모달이 떠 있는 동안 토스트는 시선 밖이고, 닫히면 사라진다.)
//
// [취소 = abort] busy 중에도 취소/Esc/딤 클릭은 살아 있다. 호출부의 onCancel 이 진행 중인 요청을
// abort 하므로, 사용자는 느린 요청에 갇히지 않는다.
//
// [취소 토스트] 취소하면 '작업이 취소되었습니다' 토스트를 이 컴포넌트가 띄운다 — 아무 반응이 없으면
// 눌렸는지 알 수 없기 때문이다. 성공/실패 토스트는 결과를 아는 **호출부**가 띄운다.
// 폼 모달을 그냥 닫는 것처럼 '작업'이라 부르기 어색한 자리는 suppressCancelToast 로 끈다.
import type { CSSProperties, ReactNode } from 'react';
import { Alert, Button } from '@tds/ui';
import type { ButtonVariant } from '@tds/ui';

import { AlertTriangleIcon, PencilIcon, PlusCircleIcon, TrashIcon } from './icons';
import { Modal } from './Modal';
import { useToast } from './ToastProvider';

type ConfirmIntent = 'create' | 'update' | 'delete' | 'discard';

interface IntentSpec {
  readonly confirmLabel: string;
  readonly variant: ButtonVariant;
  readonly icon: ReactNode;
  /** 아이콘 색 — 톤을 색으로도 이중 전달한다 (아이콘 모양 + 버튼 색) */
  readonly iconColor: string;
}

const INTENT: Record<ConfirmIntent, IntentSpec> = {
  create: {
    confirmLabel: '만들기',
    variant: 'primary',
    icon: <PlusCircleIcon />,
    iconColor: 'var(--tds-color-action-primary-default)',
  },
  update: {
    confirmLabel: '저장',
    variant: 'primary',
    icon: <PencilIcon />,
    iconColor: 'var(--tds-color-action-primary-default)',
  },
  delete: {
    confirmLabel: '삭제',
    variant: 'danger',
    icon: <TrashIcon />,
    iconColor: 'var(--tds-color-feedback-danger-text)',
  },
  discard: {
    confirmLabel: '나가기',
    variant: 'danger',
    icon: <AlertTriangleIcon />,
    iconColor: 'var(--tds-color-feedback-danger-text)',
  },
};

const messageStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
};

function iconWrapStyle(color: string): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    flexShrink: 0,
    color,
  };
}

interface ConfirmDialogProps {
  /** 톤·기본 라벨·아이콘을 결정한다 — 앱 전체에서 삭제가 항상 같은 빨강으로 보이게 하는 장치 */
  readonly intent: ConfirmIntent;
  readonly title: string;
  readonly message: string;
  /** intent 의 기본 라벨을 덮어쓴다 ('회원 삭제' 처럼 대상을 밝힐 때) */
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly busy: boolean;
  /** 실패 안내 — 주면 다이얼로그 안에 danger 배너로 표시된다. 복구 경로는 확인 버튼 재클릭이다 */
  readonly error?: string | null;
  readonly onConfirm: () => void;
  /** 취소·Esc·딤 클릭 — 진행 중인 요청이 있으면 여기서 abort 한다 */
  readonly onCancel: () => void;
  /** 취소 토스트를 띄우지 않는다 (폼 모달 닫기, 이탈 가드의 '머무르기' 등) */
  readonly suppressCancelToast?: boolean;
}

export function ConfirmDialog({
  intent,
  title,
  message,
  confirmLabel,
  cancelLabel = '취소',
  busy,
  error = null,
  onConfirm,
  onCancel,
  suppressCancelToast = false,
}: ConfirmDialogProps) {
  const toast = useToast();
  const spec = INTENT[intent];

  const cancel = () => {
    if (!suppressCancelToast) toast.cancelled();
    onCancel();
  };

  return (
    <Modal
      title={title}
      icon={<span style={iconWrapStyle(spec.iconColor)}>{spec.icon}</span>}
      onClose={cancel}
      footer={
        <>
          {/* busy 중에도 취소는 살아 있다 — 이것이 진행 중 요청의 abort 경로다 */}
          <Button variant="secondary" onClick={cancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={spec.variant}
            // 중복 클릭 차단 — 확인은 요청 1건만 만든다
            disabled={busy}
            aria-busy={busy}
            onClick={onConfirm}
          >
            {busy ? '처리 중…' : (confirmLabel ?? spec.confirmLabel)}
          </Button>
        </>
      }
    >
      <div style={bodyStyle}>
        <p style={messageStyle}>{message}</p>
        {error !== null && <Alert tone="danger">{error}</Alert>}
      </div>
    </Modal>
  );
}
