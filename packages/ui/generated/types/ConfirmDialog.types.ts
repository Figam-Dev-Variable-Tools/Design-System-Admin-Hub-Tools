// AUTO-GENERATED from contracts/ConfirmDialog.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: organism · 카테고리: Dialogs & Overlays · 상태: beta

/** `ConfirmDialog.intent` 허용 값 (계약이 유일한 원천) */
export type ConfirmDialogIntent = 'create' | 'update' | 'delete' | 'discard';

/** 계약에 선언된 상호작용 상태 */
export type ConfirmDialogState = 'default' | 'loading' | 'error';

/**
 * 확인 다이얼로그 — CRUD 확인의 단일 창구. Modal 을 조립해 의도(intent)별 톤·라벨·아이콘을 강제한다 (ADR-0003). 도메인을 모른다 — 무엇을 확인하는지는 title/message 로 받는다.

[intent 가 톤·기본 라벨·아이콘을 정한다] create='만들기'/primary/원+, update='저장'/primary/연필, delete='삭제'/danger/휴지통, discard='나가기'/danger/삼각형. 호출부가 매번 색과 문구를 고르면 같은 '삭제'가 화면마다 다른 색으로 보인다 — 그래서 의도만 받는다.

[실패는 다이얼로그를 닫지 않는다] error 를 주면 다이얼로그 안에 danger 배너(Alert)로 뜨고 확인 버튼이 되살아난다 — 재클릭이 곧 재시도다. (모달이 떠 있는 동안 토스트는 시선 밖이고 닫히면 사라지므로 여기서는 인라인 배너를 쓴다.)

[busy 잠금] busy 면 확인 버튼이 비활성(aria-busy)되어 중복 클릭을 막는다 — 확인은 요청 1건만 만든다. busy 중에도 취소/Esc/딤 클릭은 살아 있다(진행 중 요청의 abort 경로는 호출부 onCancel 이 소유).

[취소 토스트는 앱의 것] 취소 시 '작업이 취소되었습니다' 토스트는 앱(shared/ui 어댑터 + useToast)이 얹는다 — DS 는 토스트 큐를 모른다. DS 는 onCancel 을 부르기만 한다.

[imperative props — 계약 밖 경계] onConfirm(필수)·onCancel(필수)은 명령형 배선이라 Figma 대응이 없다. error/confirmLabel/cancelLabel 은 exactOptionalPropertyTypes 경계에서 undefined 허용으로 넓힌다 (B2 선례).
 */
export interface ConfirmDialogProps {
  /**
   * 확인의 의도 — 톤(primary/danger)·기본 확인 라벨·아이콘을 함께 결정한다. 앱 전체에서 '삭제'가 항상 같은 빨강으로 보이게 하는 장치다
   */
  intent: ConfirmDialogIntent;
  /**
   * 다이얼로그 제목
   */
  title: string;
  /**
   * 확인 문구 — 무엇을 확인하는지 사람이 읽는 문장
   */
  message: string;
  /**
   * 확인 버튼 라벨. 빈 문자열이면 intent 의 기본 라벨을 쓴다 ('회원 삭제' 처럼 대상을 밝힐 때만 덮어쓴다)
   * @default ""
   */
  confirmLabel?: string;
  /**
   * 취소 버튼 라벨
   * @default "취소"
   */
  cancelLabel?: string;
  /**
   * 확인 진행 중 — 확인 버튼을 비활성(aria-busy)하고 라벨을 '처리 중…' 으로 바꿔 중복 클릭을 막는다. 취소/Esc/딤은 살아 있다
   * @default false
   */
  busy?: boolean;
  /**
   * 빈 문자열이 아니면 본문 아래에 danger 배너(Alert)로 표시된다. 복구 경로는 확인 버튼 재클릭이다 (실패해도 다이얼로그를 닫지 않는다)
   * @default ""
   */
  error?: string;

  // --- events (계약 events 블록에서 생성) ---
  /**
   * 확인 버튼 클릭. busy 중에는 발화 금지 (구현은 확인 버튼을 disabled 로 잠근다) — Storybook Play Function이 전수 검증
   * 발화 차단 상태: busy (Storybook Play Function 이 전수 검증)
   */
  onConfirm?: (payload: void) => void;
  /**
   * 취소·Esc·딤 클릭. 진행 중 요청이 있으면 호출부가 여기서 abort 한다. busy 중에도 살아 있다
   */
  onCancel?: (payload: void) => void;
}
