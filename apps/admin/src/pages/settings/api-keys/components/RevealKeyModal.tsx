// 발급 직후 1회 노출 모달 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// ┌ 이 모달이 닫히면 평문은 이 세상에서 사라진다 ──────────────────────────────┐
// │ 평문은 발급 응답에만 실렸고(서버는 해시만 갖는다), 화면은 그것을 이 모달의       │
// │ **지역 state 로만** 쥐고 있다 — 목록에도, react-query 캐시에도, 전역 상태에도    │
// │ 없다. 그래서 '다시 보기' 는 기능이 아니라 **불가능**이다.                       │
// │                                                                          │
// │ 그 사실이 사용자에게도 참이어야 한다: 복사하지 않고 닫으려 하면 한 번 붙잡는다.   │
// │ 붙잡지 않으면 '나중에 볼 수 있겠지' 하고 닫은 뒤 키를 잃고 다시 발급하게 된다 —   │
// │ 그게 폐기되지 않은 유령 키가 쌓이는 경로다.                                   │
// └──────────────────────────────────────────────────────────────────────────┘
import { useCallback, useId, useState } from 'react';
import type { CSSProperties } from 'react';

import { Alert, Button, ConfirmDialog, Modal, useToast } from '../../../../shared/ui';
import { copyToClipboard } from '../../_shared/secret';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--tds-space-3)',
};

const textStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-default)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
};

const keyRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--tds-space-2)',
  minWidth: 0,
};

/**
 * 키 표시 — 한 글자도 틀리면 안 되는 값이다.
 *
 * ⚠ **mono 토큰이 없다.** 시크릿·송장번호처럼 글자를 눈으로 대조해야 하는 값은 고정폭이라야
 * 0/O·1/l 이 구분되는데, tokens.json 에는 sans 계열밖에 없다(tokens/ 는 F1 소유라 이번 배치에서
 * 추가하지 않는다 — 보고서에 기재). 하드코딩 `monospace` 로 우회하지 않는다: TOKEN-01 이
 * 금지하는 '토큰 밖 시각 값' 이고, 한 화면이 몰래 쓰기 시작하면 그게 곧 drift 다.
 * 지금 할 수 있는 것(tabular-nums 로 자릿수 정렬 + 넉넉한 줄바꿈)만 하고 토큰을 기다린다.
 */
const keyTextStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  paddingTop: 'var(--tds-space-2)',
  paddingBottom: 'var(--tds-space-2)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-3)',
  borderStyle: 'solid',
  borderWidth: 'var(--tds-border-width-thin)',
  borderColor: 'var(--tds-color-border-default)',
  borderRadius: 'var(--tds-radius-md)',
  background: 'var(--tds-color-surface-raised)',
  color: 'var(--tds-color-text-default)',
  fontFamily: 'var(--tds-typography-body-md-font-family)',
  fontSize: 'var(--tds-typography-label-md-font-size)',
  lineHeight: 'var(--tds-typography-body-md-line-height)',
  fontVariantNumeric: 'tabular-nums',
  overflowWrap: 'anywhere',
};

const hintStyle: CSSProperties = {
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: 'var(--tds-color-text-muted)',
  fontSize: 'var(--tds-typography-caption-md-font-size)',
  lineHeight: 'var(--tds-typography-caption-md-line-height)',
};

const DISCARD_MESSAGE =
  '아직 키를 복사하지 않았습니다. 이 창을 닫으면 키를 다시 볼 수 없고, 필요하면 새로 발급해야 합니다. 닫을까요?';

interface RevealKeyModalProps {
  readonly keyName: string;
  /** 다시는 볼 수 없는 값 — 이 컴포넌트 밖으로 새지 않는다 */
  readonly plaintext: string;
  readonly onClose: () => void;
}

export function RevealKeyModal({ keyName, plaintext, onClose }: RevealKeyModalProps) {
  const toast = useToast();
  const messageId = useId();

  /** 한 번이라도 복사했는가 — 닫기를 붙잡을지 결정한다 */
  const [copied, setCopied] = useState(false);
  /** 복사 없이 닫으려 함 — 확인을 받는다 */
  const [confirmingClose, setConfirmingClose] = useState(false);

  const copy = useCallback(() => {
    void (async () => {
      const ok = await copyToClipboard(plaintext);
      if (ok) {
        setCopied(true);
        toast.success('키를 클립보드에 복사했습니다.');
        return;
      }
      // 조용히 실패하지 않는다 — 복사가 안 되는 환경이면 직접 복사할 수 있게 알린다
      toast.error('클립보드에 복사하지 못했습니다. 키를 직접 선택해 복사해 주세요.');
    })();
  }, [plaintext, toast]);

  /** 닫기 요청(딤·Esc·×·버튼) — 복사 전이면 한 번 붙잡는다 */
  const requestClose = useCallback(() => {
    if (copied) {
      onClose();
      return;
    }
    setConfirmingClose(true);
  }, [copied, onClose]);

  return (
    <>
      <Modal
        title="API Key가 발급되었습니다"
        describedBy={messageId}
        onClose={requestClose}
        footer={
          <>
            <Button variant="secondary" onClick={copy}>
              키 복사
            </Button>
            {/* '닫기' 라 부르지 않는다 — 헤더의 ×(aria-label='닫기')와 접근 가능한 이름이 겹쳐
                스크린리더에서 같은 이름의 버튼이 둘이 된다 (A11Y-15). */}
            <Button variant="primary" onClick={requestClose}>
              완료
            </Button>
          </>
        }
      >
        <div style={bodyStyle}>
          <Alert tone="danger">
            이 키는 지금 이 화면에서만 볼 수 있습니다. 창을 닫으면 다시 확인할 수 없습니다.
          </Alert>

          <p id={messageId} style={textStyle}>
            ‘{keyName}’ 키가 발급되었습니다. 아래 값을 복사해 안전한 곳에 보관하세요.
          </p>

          <div style={keyRowStyle}>
            {/* 키를 선택 가능한 텍스트로 둔다 — 클립보드 API 가 없는 환경에서도 직접 복사할 수 있다 */}
            <code style={keyTextStyle}>{plaintext}</code>
          </div>

          <p style={hintStyle}>
            키는 비밀번호와 같습니다. 저장소·메신저·이슈 트래커에 붙여넣지 말고 시크릿 관리 도구에
            보관하세요. 노출이 의심되면 즉시 폐기하고 새로 발급하세요.
          </p>

          {copied && <Alert tone="success">복사했습니다. 안전한 곳에 보관했는지 확인하세요.</Alert>}
        </div>
      </Modal>

      {confirmingClose && (
        <ConfirmDialog
          intent="discard"
          title="키를 복사하지 않았습니다"
          message={DISCARD_MESSAGE}
          // 결과를 말하는 라벨 — 이 버튼이 무엇을 잃게 하는지 버튼 스스로 밝힌다
          confirmLabel="복사하지 않고 닫기"
          cancelLabel="키 보기"
          busy={false}
          onConfirm={() => {
            setConfirmingClose(false);
            onClose();
          }}
          onCancel={() => {
            setConfirmingClose(false);
          }}
          // '취소' 는 작업 취소가 아니라 '키를 계속 본다' 는 뜻이다 — 토스트를 띄우지 않는다
          suppressCancelToast
        />
      )}
    </>
  );
}
