// 확인 다이얼로그 — 앱 어댑터
//
// [왜 앱에 남는가] 다이얼로그의 렌더링·의도(intent) 톤·busy 잠금·error 배너·포커스/Esc 는 전부
// **@tds/ui ConfirmDialog(organism)** 의 것이다 (B4 승격). 이 파일에 남는 것은 **취소 토스트 배선**뿐이다:
// 취소 시 '작업이 취소되었습니다' 토스트는 앱의 결과 통지 큐(useToast)의 것이라 DS 가 모른다(계약 부적합).
// 이 얇은 어댑터가 onCancel 을 감싸 토스트를 얹고 나머지는 그대로 DS 에 위임한다 (ToastProvider 와 동일 판정).
//
// [취소 토스트] 취소하면 토스트를 이 어댑터가 띄운다 — 아무 반응이 없으면 눌렸는지 알 수 없기 때문이다.
// 성공/실패 토스트는 결과를 아는 **호출부**가 띄운다. 폼 모달 닫기처럼 '작업'이라 부르기 어색한 자리는
// suppressCancelToast 로 끈다.
import { ConfirmDialog as DsConfirmDialog } from '@tds/ui';
import type { ConfirmDialogProps as DsConfirmDialogProps } from '@tds/ui';

import { useToast } from './ToastProvider';

interface ConfirmDialogProps extends Omit<
  DsConfirmDialogProps,
  'onConfirm' | 'onCancel' | 'error'
> {
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
  suppressCancelToast = false,
  onCancel,
  error = null,
  ...rest
}: ConfirmDialogProps) {
  const toast = useToast();

  const cancel = () => {
    if (!suppressCancelToast) toast.cancelled();
    onCancel();
  };

  return <DsConfirmDialog {...rest} error={error} onCancel={cancel} />;
}
