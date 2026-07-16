// 폼 쓰기 실패의 두 표면 (A41 소유 — apps/admin/src/shared/crud/**)
//
// [왜 컴포넌트로 빼는가]
// FormPageShell 을 쓰는 폼(21개)과, 우측 미리보기 때문에 자기 골격을 손으로 만든 폼(10개)이
// 있다(IA-12 가 지적하는 중복이다 — 통합은 별도 배치의 일). 두 갈래가 **같은 계약**을 지켜야
// EXC-04/EXC-20 이 '어떤 폼이냐'에 따라 갈리지 않는다. 그래서 배치가 아니라 이 두 조각을 공유한다.
import type { CSSProperties } from 'react';

import { Alert, ConfirmDialog } from '../ui';
import type { ConflictState } from './useCrudForm';

/** 참조 코드 — 복사해서 티켓에 붙일 수 있게 tabular + 전체 선택 (EXC-20) */
const referenceStyle: CSSProperties = {
  marginTop: 'var(--tds-space-1)',
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
  fontVariantNumeric: 'tabular-nums',
  userSelect: 'all',
};

interface FormServerErrorProps {
  readonly serverError: string | null;
  /** 5xx/예상외 실패의 상관관계 코드 — 있을 때만 보인다 (EXC-20) */
  readonly errorReference?: string | null;
}

/**
 * 폼 레벨 저장 실패 배너.
 *
 * [무엇을 보이지 않는가] raw 서버 body·stack trace·status 코드를 산문으로 쓰지 않는다 — 내부를
 * 흘리고 고장처럼 읽힌다. 대신 짧은 참조 코드만 보여 운영자가 신고할 수 있게 한다.
 * 필드 단위 거절(422)은 여기 오지 않는다 — 그 입력의 인라인 에러로 간다 (EXC-07).
 */
export function FormServerError({ serverError, errorReference = null }: FormServerErrorProps) {
  if (serverError === null) return null;

  return (
    <Alert tone="danger">
      <span>{serverError}</span>
      {errorReference !== null && <p style={referenceStyle}>오류 코드 {errorReference}</p>}
    </Alert>
  );
}

/**
 * 낙관적 동시성 충돌 다이얼로그 (EXC-04).
 *
 * **입력은 그대로 살아 있다** — 이 다이얼로그는 폼 위에 뜰 뿐 폼을 언마운트하지 않는다. 그래서
 * '이어서 편집' 을 고르면 방금 쓰던 내용이 그 자리에 있다. 성공 토스트도 목록 이동도 없다.
 *
 * '최신 내용 불러오기' 가 danger intent 인 이유: 그것이 **내 입력을 버리는** 파괴적 선택이다.
 * (덜 파괴적인 쪽이 기본 포커스를 받는다 — ConfirmDialog 가 취소에 초기 포커스를 준다.)
 */
export function FormConflictDialog({ conflict }: { readonly conflict: ConflictState | null }) {
  if (conflict === null) return null;

  return (
    <ConfirmDialog
      intent="delete"
      title="다른 사용자가 먼저 변경했습니다"
      message={`${conflict.message} 최신 내용을 불러오면 지금 입력한 내용은 사라집니다. 입력한 내용을 지키려면 '이어서 편집'을 선택하세요.`}
      confirmLabel="최신 내용 불러오기"
      cancelLabel="이어서 편집"
      busy={false}
      onConfirm={conflict.reload}
      onCancel={conflict.dismiss}
      // '이어서 편집'은 작업 취소가 아니다 — 토스트를 띄우지 않는다
      suppressCancelToast
    />
  );
}
