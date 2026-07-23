// 주소 검색 모달 — 카카오(다음) 우편번호 서비스를 우리 모달 안에 심는다
//
// [왜 shared 에 있나] 소비자가 둘이다 — 오시는 길(company/directions)과 회사 정보(company/profile).
// 두 화면이 각자 사본을 두면 '한 곳만 고쳐진' 상태가 반드시 생긴다. (page-coupling 축은
// pages/<최상위 세그먼트> 하나를 한 페이지로 보므로 company 안에서의 참조 자체는 축 위반이 아니지만,
// 이 부품이 company 라는 이름 아래 있을 이유는 없다 — 주소를 받는 화면은 앞으로도 늘어난다.)
//
// [모달 인프라를 발명하지 않는다] 포커스 트랩·Esc·딤 클릭·**닫힌 뒤 초점 복귀**는 전부 DS Modal 의
// 것이다(packages/ui/src/organisms/Modal). 이 파일은 그 안에 검색 위젯을 심고, 고른 주소를 위로
// 올려 보내고, 로딩/실패를 말하는 일만 한다.
//
// [왜 팝업이 아니라 임베드인가] 우편번호 서비스는 `open()`(별도 창)과 `embed()`(iframe) 둘을 준다.
// 팝업은 차단기에 막히면 **아무 일도 일어나지 않는 버튼**이 되고, 그 실패를 우리가 관측할 방법이
// 마땅치 않다. 임베드는 우리 DOM 안에서 벌어지므로 로딩·실패를 우리가 그릴 수 있고, Esc·포커스
// 복귀 같은 약속도 모달 하나가 일관되게 지킨다.
//
// [로딩과 실패를 뭉개지 않는다] 스크립트는 네트워크에서 온다 — 늦게 올 수도, 안 올 수도 있다.
// 둘을 같은 빈 상자로 그리면 운영자는 기다려야 할지 다시 눌러야 할지 알 수 없다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { cssVar } from '@tds/ui';

import { Alert, Button, Modal, hintStyle } from '../ui';
import { addressSearchAdapter } from './adapter';
import type { AddressSearchFailure, PostalAddress } from './contract';

const bodyStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/**
 * 위젯이 들어앉을 자리 — 검색창 + 결과 목록이 한 화면에 들어오는 높이.
 *
 * 아직 심기 전에는 높이를 0 으로 접는다. **노드 자체는 절대 언마운트하지 않는다** — 실패했을 때
 * 지우면 '다시 시도' 가 심을 자리가 사라져, 눌러도 영원히 로딩에 머무는 버튼이 된다.
 */
const hostStyle = (ready: boolean): CSSProperties => ({
  width: '100%',
  height: ready ? `calc(${cssVar('space.6')} * 10)` : '0',
  overflow: 'hidden',
  minWidth: 0,
});

const statusStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.3'),
  justifyContent: 'center',
  minHeight: `calc(${cssVar('space.6')} * 3)`,
};

/**
 * 실패 문구.
 *
 * 지금 이유는 하나뿐인데도 Record 로 두는 것은, 나중에 계약에 이유가 하나 늘면 **여기가 타입
 * 오류로 먼저 터지게** 하기 위해서다 — 새 실패가 빈 문장으로 조용히 지나가지 않는다.
 */
const FAILURE_MESSAGE: Record<AddressSearchFailure, string> = {
  unreachable:
    '주소 검색을 불러오지 못했어요. 인터넷 연결이 끊겼거나 브라우저 확장 프로그램이 막고 있을 수 있으니, 확인한 뒤 다시 시도해 주세요.',
};

type EmbedState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'failed'; readonly reason: AddressSearchFailure };

interface AddressSearchModalProps {
  readonly onSelect: (address: PostalAddress) => void;
  readonly onClose: () => void;
}

export function AddressSearchModal({ onSelect, onClose }: AddressSearchModalProps) {
  /**
   * **콜백 ref 다 — useRef 가 아니다.**
   *
   * Modal 은 내용물을 포털로 옮기고, 그 포털은 첫 렌더에 null 을 그린 뒤 layout effect 에서야
   * 실제로 마운트된다(Radix Portal). 그래서 `useRef` 를 쓰면 이 컴포넌트의 첫 effect 가 도는
   * 시점에 노드가 **아직 없고**, 의존성이 바뀌지 않으니 effect 는 다시 돌지 않는다 — 검색 위젯이
   * 영원히 심기지 않고 화면은 '불러오는 중' 에 멈춘다(실제로 이 배치에서 관측했다).
   * 노드가 붙는 순간을 상태로 받아 effect 를 그때 돌린다.
   */
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [state, setState] = useState<EmbedState>({ kind: 'loading' });
  /** '다시 시도' 를 누를 때마다 증가 — 아래 effect 를 다시 돌리는 유일한 스위치 */
  const [attempt, setAttempt] = useState(0);

  /* 콜백을 ref 로 든다 — 부모가 매 렌더 새 함수를 넘겨도 위젯을 다시 심지 않는다.
     의존성에 그대로 넣으면 부모가 렌더될 때마다 iframe 이 새로 뜨고, 그때마다 사용자가 치던
     검색어가 사라진다. */
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    if (host === null) return undefined;

    let disposed = false;
    let teardown: (() => void) | null = null;
    setState({ kind: 'loading' });

    void (async () => {
      const result = await addressSearchAdapter().embedAddressSearch(host, (address) => {
        selectRef.current(address);
      });

      // 심는 사이에 모달이 닫혔을 수 있다 — 그때는 즉시 거둔다(유령 iframe 을 남기지 않는다)
      if (disposed) {
        if (result.ok) result.value();
        return;
      }
      if (!result.ok) {
        setState({ kind: 'failed', reason: result.reason });
        return;
      }
      teardown = result.value;
      setState({ kind: 'ready' });
    })();

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [host, attempt]);

  return (
    <Modal
      title="주소 검색"
      onClose={onClose}
      footer={
        <Button variant="secondary" size="md" onClick={onClose}>
          닫기
        </Button>
      }
    >
      <div style={bodyStyle}>
        {state.kind === 'failed' && (
          <div style={statusStyle}>
            <Alert tone="danger">{FAILURE_MESSAGE[state.reason]}</Alert>
            <div>
              <Button variant="secondary" size="md" onClick={() => setAttempt((n) => n + 1)}>
                다시 시도
              </Button>
            </div>
          </div>
        )}
        {state.kind === 'loading' && (
          <p style={{ ...hintStyle, ...statusStyle }} aria-busy="true">
            주소 검색을 여는 중이에요…
          </p>
        )}
        <div ref={setHost} style={hostStyle(state.kind === 'ready')} />
      </div>
    </Modal>
  );
}
