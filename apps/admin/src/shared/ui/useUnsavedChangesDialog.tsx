// 미저장 이탈 가드 (A40 소유 — apps/admin/src/shared/ui/**)
//
// 저장하지 않은 변경이 있는 채로 화면을 떠나려 하면 intent="discard" ConfirmDialog 를 세운다.
// 예전에는 product-registration 과 customer-settings 가 각자 window.confirm 가드를 갖고 있었다 —
// 문구도 모양도 달랐다. 이제 하나다.
//
// [세 갈래 이탈 경로]
//   (a) 브라우저 이탈(탭 닫기·새로고침·외부 URL) → beforeunload. 브라우저 기본 confirm 만 가능하다
//       (커스텀 다이얼로그를 띄울 권한이 없다 — 스펙상 불가).
//   (b) 앱 내 링크 클릭 → document capture 단계에서 가로채 다이얼로그를 띄우고, 확인해야 이동한다.
//   (c) 뒤로/앞으로 → dirty 가 되는 시점에 sentinel history 항목을 1건 심어 두고, 그것이 pop 될 때
//       다이얼로그를 띄운다. 취소하면 sentinel 을 다시 심어 다음 뒤로가기도 가드한다.
//
// [구현 메모] react-router v6 의 useBlocker 는 데이터 라우터(createBrowserRouter)에서만 동작한다.
// 이 앱은 <BrowserRouter>(비 데이터 라우터)라 (b)/(c)를 직접 구현했다. 라우터를 교체하면
// 이 훅의 내부는 useBlocker 한 줄로 줄어들고, 반환하는 다이얼로그는 그대로 남는다.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { ConfirmDialog } from './ConfirmDialog';

const DEFAULT_TITLE = '저장하지 않은 변경 사항이 있습니다';
const DEFAULT_MESSAGE =
  '이 화면을 벗어나면 입력한 내용이 사라집니다. 저장하지 않고 나가시겠습니까?';

/** 이탈 시도의 종류 — 확인했을 때 무엇을 해야 하는지가 다르다 */
type Pending = { readonly kind: 'link'; readonly to: string } | { readonly kind: 'pop' };

/** history.state 를 보존한 채 sentinel 플래그만 얹는다 (react-router 의 idx/key 유지) */
function pushSentinel(): void {
  const current: unknown = window.history.state;
  const base = typeof current === 'object' && current !== null ? current : {};
  window.history.pushState({ ...base, tdsUnsavedGuard: true }, '', window.location.href);
}

/* ── 링크 가로채기의 세 판정 (순수 함수) ──────────────────────────────────────
 *
 * 예전에는 세 판정이 한 핸들러 안에 15개 분기로 뭉쳐 있었다 (A83 축4 복잡도 16).
 * 셋으로 갈라 놓으면 각 판정을 훅을 마운트하지 않고 단위 테스트할 수 있다.
 */

/**
 * 이 클릭을 가로채도 되는가 — **가로채면 안 되는 클릭을 먼저 걸러낸다.**
 *
 * 수식키(⌘/Ctrl/Shift/Alt)나 가운데/오른쪽 버튼은 브라우저의 것이다: 새 탭·새 창·다운로드를
 * 만들어야 한다. 여기서 preventDefault 하면 사용자가 기대한 새 탭이 열리지 않는다.
 */
function isPlainLeftClick(event: MouseEvent): boolean {
  if (event.defaultPrevented) return false;
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/**
 * 같은 탭에서 열리는 target 값 — 그 외(`_blank` 등)는 새 탭이므로 이 화면을 떠나지 않는다.
 *
 * ⚠ `_self` 는 **빈 문자열과 같은 뜻**(같은 탭)이라 반드시 가드 대상이다.
 * `target !== ''` 한 줄로 접으면 `<a target="_self">` 가 가드를 빠져나가 미저장 변경이 조용히 날아간다.
 */
const SAME_TAB_TARGETS: ReadonlySet<string> = new Set(['', '_self']);

/** 클릭 지점에서 라우팅 가능한 앵커를 찾는다 — 없거나 다운로드/새 탭 링크면 null */
function routableAnchorFrom(target: EventTarget | null): HTMLAnchorElement | null {
  if (!(target instanceof Element)) return null;
  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return null;
  if (anchor.hasAttribute('download')) return null;
  if (!SAME_TAB_TARGETS.has(anchor.target)) return null;
  return anchor;
}

/**
 * 이 앵커가 가리키는 **이 앱 안의 다른 화면** 경로 — 이탈이 아니면 null.
 *
 * 외부 오리진은 beforeunload(a)가 담당하고, 현재 경로와 같은 곳(문서 내 앵커)은 이탈이 아니다.
 */
function internalDestination(anchor: HTMLAnchorElement): string | null {
  const destination = new URL(anchor.href, window.location.href);
  if (destination.origin !== window.location.origin) return null;
  if (
    destination.pathname === window.location.pathname &&
    destination.search === window.location.search
  ) {
    return null;
  }
  return `${destination.pathname}${destination.search}${destination.hash}`;
}

interface UnsavedChangesOptions {
  readonly title?: string;
  readonly message?: string;
}

/**
 * @param isDirty 저장하지 않은 변경이 있는가
 * @returns 렌더해야 할 다이얼로그 (없으면 null) — 페이지는 `{unsavedDialog}` 한 줄만 두면 된다
 */
export function useUnsavedChangesDialog(
  isDirty: boolean,
  options: UnsavedChangesOptions = {},
): ReactNode {
  const { title = DEFAULT_TITLE, message = DEFAULT_MESSAGE } = options;

  const navigate = useNavigate();
  const [pending, setPending] = useState<Pending | null>(null);

  const dirtyRef = useRef(isDirty);
  const sentinelRef = useRef(false);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  // 더 이상 dirty 가 아니면(저장 완료) 떠 있던 확인 창은 의미가 없다
  useEffect(() => {
    if (!isDirty) setPending(null);
  }, [isDirty]);

  // (a) 브라우저 이탈 — 문구는 브라우저가 고정 문구로 대체한다
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      // 레거시 브라우저 호환
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // (b) 앱 내 링크 클릭 — capture 단계에서 라우터 핸들러보다 먼저 가로챈다
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!dirtyRef.current) return;
      if (!isPlainLeftClick(event)) return;

      const anchor = routableAnchorFrom(event.target);
      if (anchor === null) return;

      const to = internalDestination(anchor);
      if (to === null) return;

      // 라우터에 닿기 전에 멈춘다 — 확인해야만 이동한다
      event.preventDefault();
      event.stopPropagation();
      setPending({ kind: 'link', to });
    };

    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('click', handleClick, true);
    };
  }, []);

  // (c-1) 뒤로/앞으로 가드 — dirty 진입 시 sentinel history 항목을 1건 확보한다
  useEffect(() => {
    if (!isDirty || sentinelRef.current) return;
    pushSentinel();
    sentinelRef.current = true;
  }, [isDirty]);

  // (c-2) sentinel 이 pop 되면 다이얼로그를 세운다
  useEffect(() => {
    const handlePopState = () => {
      if (!sentinelRef.current) return; // 우리가 심은 항목이 아니면 관여하지 않는다
      sentinelRef.current = false;

      // 이미 저장되어 dirty 가 풀렸다면 사용자가 소비한 sentinel 을 그대로 통과시킨다
      if (!dirtyRef.current) {
        window.history.back();
        return;
      }
      setPending({ kind: 'pop' });
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const confirm = useCallback(() => {
    const target = pending;
    setPending(null);
    if (target === null) return;

    // 우리 스스로 일으키는 이동이다 — 가드가 다시 붙잡지 않게 dirty 를 먼저 내린다
    dirtyRef.current = false;

    if (target.kind === 'link') {
      navigate(target.to);
      return;
    }
    window.history.back();
  }, [navigate, pending]);

  const cancel = useCallback(() => {
    const target = pending;
    setPending(null);
    // 뒤로가기를 취소했다면 sentinel 을 다시 심어 다음 뒤로가기도 가드한다
    if (target?.kind === 'pop') {
      pushSentinel();
      sentinelRef.current = true;
    }
  }, [pending]);

  if (pending === null) return null;

  return (
    <ConfirmDialog
      intent="discard"
      title={title}
      message={message}
      busy={false}
      onConfirm={confirm}
      onCancel={cancel}
      // 여기서 '취소'는 작업 취소가 아니라 '이 화면에 머무른다'는 뜻이다 — 토스트를 띄우지 않는다
      suppressCancelToast
    />
  );
}
