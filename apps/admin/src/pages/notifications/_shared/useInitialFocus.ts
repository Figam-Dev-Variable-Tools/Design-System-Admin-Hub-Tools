// 폼 진입 시 첫 편집 필드 포커스 (apps/admin/src/pages/notifications/**)
//
// [A11Y-13] "폼(page·modal) open 시 첫 편집 필드에 포커스한다." 세 폼이 같은 배선을 쓴다.
//
// [왜 autoFocus 가 아닌가] jsx-a11y/no-autofocus 가 error 다(Airbnb 0 warning 규칙). 선언적 autoFocus 는
//   문서 로드 시점을 못 고르기 때문인데, 여기서 필요한 것은 '수정 진입 시 상세 로딩이 끝난 뒤'라는
//   조건부 포커스라 어차피 명령형이어야 한다 — ready 가 true 가 되는 첫 순간에 한 번만 포커스한다.
//
// [react-hook-form 과 함께 쓰기] register() 가 주는 ref 와 이 훅의 ref 를 둘 다 물려야 한다:
//   const { ref: registerRef, ...rest } = register('name');
//   <input ref={(el) => { registerRef(el); focusRef.current = el; }} {...rest} />
//   (검증 실패 시 첫 오류 필드 포커스는 RHF 의 shouldFocusError 기본값이 맡는다 — 이 훅은 진입 포커스만.)
import { useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';

/** ready 가 처음 true 가 될 때 딱 한 번 포커스한다(사용자가 옮긴 포커스를 다시 뺏지 않는다) */
export function useInitialFocus<T extends HTMLElement>(ready: boolean): MutableRefObject<T | null> {
  const ref = useRef<T | null>(null);
  const focused = useRef(false);

  useEffect(() => {
    if (!ready || focused.current) return;
    ref.current?.focus();
    focused.current = true;
  }, [ready]);

  return ref;
}
