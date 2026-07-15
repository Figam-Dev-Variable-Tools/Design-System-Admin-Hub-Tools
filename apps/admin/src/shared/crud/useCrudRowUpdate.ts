// 목록에서 바로 항목을 갱신하는 컨트롤러 훅 (A41 소유 — apps/admin/src/shared/crud/** · 앱 공용)
//
// [왜 프레임워크에 있는가] 목록의 한 행을 상세로 들어가지 않고 바로 바꾸는 패턴(노출 여부 토글 등)은
// 어느 섹션에나 나온다. 각 목록이 useCrudUpdate + 진행 중 id + 토스트 배선을 복사하는 대신 여기 한 벌만 둔다.
// 도메인을 모른다 — 무엇을 바꾸는지 알지 못하고, 페이지가 만든 입력(input)을 그대로 어댑터에 넘긴다.
//
// [확장 포인트] CrudColumn.render 안에서 이 훅이 돌려주는 run/pendingId 로 인라인 토글·상태 배지를 그린다.
import { useEffect, useRef, useState } from 'react';

import { isAbort } from '../async';
import { useToast } from '../ui';
import { useCrudUpdate } from './crud';
import type { CrudAdapter } from './crud';

interface RowUpdateMessages {
  /** 성공 토스트(생략 시 토스트 없음) */
  readonly success?: string;
  /** 실패 토스트(생략 시 기본 문구) */
  readonly failure?: string;
}

interface CrudRowUpdate<Input> {
  /** 갱신 진행 중인 행 id — 그 행의 컨트롤을 잠그고 busy 로 표시한다 */
  readonly pendingId: string | null;
  readonly run: (id: string, input: Input, messages?: RowUpdateMessages) => void;
}

export function useCrudRowUpdate<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
): CrudRowUpdate<Input> {
  const toast = useToast();
  const update = useCrudUpdate(resource, adapter);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = (id: string, input: Input, messages?: RowUpdateMessages) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPendingId(id);

    update.mutate(
      { id, input, signal: controller.signal },
      {
        onSuccess: () => {
          if (controller.signal.aborted) return;
          if (messages?.success !== undefined) toast.success(messages.success);
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          toast.error(messages?.failure ?? '변경하지 못했습니다. 잠시 후 다시 시도해 주세요.');
        },
        onSettled: () => {
          if (!controller.signal.aborted) setPendingId(null);
        },
      },
    );
  };

  return { pendingId, run };
}
