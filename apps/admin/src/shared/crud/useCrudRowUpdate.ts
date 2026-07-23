// 목록에서 바로 항목을 갱신하는 컨트롤러 훅 (앱 공용)
//
// [왜 프레임워크에 있는가] 목록의 한 행을 상세로 들어가지 않고 바로 바꾸는 패턴(노출 여부 토글 등)은
// 어느 섹션에나 나온다. 각 목록이 useCrudUpdate + 진행 중 id + 토스트 배선을 복사하는 대신 여기 한 벌만 둔다.
// 도메인을 모른다 — 무엇을 바꾸는지 알지 못하고, 페이지가 만든 입력(input)을 그대로 어댑터에 넘긴다.
//
// [확장 포인트] CrudColumn.render 안에서 이 훅이 돌려주는 run/pendingId 로 인라인 토글·상태 배지를 그린다.
//
// ┌ [EXC-03] 인라인 토글이 게이팅을 빠져나가던 자리 ──────────────────────────────────┐
// │ CrudListShell 은 **행 액션(연필·휴지통)과 일괄 삭제**를 스스로 게이팅한다. 그런데       │
// │ 인라인 토글은 화면이 `CrudColumn.render` 로 넘기는 ReactNode 라 껍데기가 붙잡을         │
// │ 손잡이가 없다 — 등록 CTA 가 빠져나가던 것과 정확히 같은 구멍이다. 그래서 노출/공개      │
// │ 토글 7종이 **조회 권한만으로 눌리고 저장까지 됐다**(리뷰 노출, 포트폴리오 공개,        │
// │ 상품·쿠폰 판매, 거래처 상태, 자료 공개).                                            │
// │                                                                                  │
// │ 화면마다 canUpdate 를 적게 하면 한 곳만 빠뜨려도 그 토글만 조용히 열린다(이 결함의     │
// │ 원래 모양이 그것이다). 그래서 **판정을 이 훅이 갖는다**: run 은 권한이 없으면 저장     │
// │ 요청을 내지 않고, 같은 판정을 `canUpdate` 로 돌려줘 화면이 컨트롤을 잠그게 한다.       │
// │ 버튼을 잠그는 술어와 저장을 거절하는 술어가 **한 값**이라 갈라질 수 없다.              │
// └──────────────────────────────────────────────────────────────────────────────────┘
import { useEffect, useRef, useState } from 'react';

import { isAbort } from '../async';
import { useRouteCan, WRITE_DENIED } from '../permissions/RequirePermission';
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
  /**
   * 이 라우트의 수정 권한 — `run` 이 거절하는 조건과 **같은 값**이다.
   * 화면은 이 값으로 인라인 컨트롤을 그릴지 정한다(권한이 없으면 값만 남기고 컨트롤은 없앤다).
   */
  readonly canUpdate: boolean;
  readonly run: (id: string, input: Input, messages?: RowUpdateMessages) => void;
}

export function useCrudRowUpdate<T extends { id: string }, Input>(
  resource: string,
  adapter: CrudAdapter<T, Input>,
): CrudRowUpdate<Input> {
  const toast = useToast();
  const update = useCrudUpdate(resource, adapter);
  const canUpdate = useRouteCan('update');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = (id: string, input: Input, messages?: RowUpdateMessages) => {
    // 거절은 침묵이 아니다 — 이 훅의 실패 경로가 이미 토스트라, 같은 자리에 사유를 낸다
    if (!canUpdate) {
      toast.error(WRITE_DENIED.update);
      return;
    }
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
          toast.error(messages?.failure ?? '변경하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
        onSettled: () => {
          if (!controller.signal.aborted) setPendingId(null);
        },
      },
    );
  };

  return { pendingId, canUpdate, run };
}
