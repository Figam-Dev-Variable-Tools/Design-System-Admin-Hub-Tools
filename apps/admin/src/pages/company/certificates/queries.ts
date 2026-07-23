// 인증서/특허 재정렬 뮤테이션
//
// 조회·삭제·폼은 전부 공용 CRUD 프레임워크(useCrudList · useCrudForm)가 한다. 여기 있는 것은 그
// 프레임워크에 없는 단 하나, **순서 변경**뿐이다.
//
// [같은 캐시 키를 봐야 한다]
// 목록 캐시는 useCrudListQuery 가 `[resource, 'list']` 로 잡는다(shared/crud/crud.ts 의 listKey).
// 그 함수는 export 되지 않으므로 여기서 같은 모양을 적는다 — 어긋나면 재정렬이 **다른 캐시**를
// 고쳐서 화면이 꿈쩍도 하지 않는다. 그래서 이 결합은 주석이 아니라 테스트가 지킨다:
// CertificatesListPage.test.tsx 의 '이동 버튼을 누르면 행 순서가 즉시 바뀐다' 가 키가 어긋나는 순간
// 깨진다(낙관적 업데이트가 이 키에 쓰기 때문이다).
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isAbort } from '../../../shared/async';
import { reorderCertificates } from './data-source';
import type { CertItem } from './types';

const CERT_LIST_KEY = ['certificates', 'list'] as const;

interface ReorderVars {
  readonly orderedIds: readonly string[];
  readonly signal: AbortSignal;
}

/**
 * 드래그/키보드 재정렬 — 낙관적 업데이트 후 실패 시 스냅샷으로 롤백(FAQ·배너·로고와 같은 규칙).
 *
 * 낙관적 업데이트가 필수인 이유: 순서 변경은 **연속 조작**이다(한 행을 세 칸 올리려면 세 번 누른다).
 * 응답을 기다렸다가 반영하면 매번 지연만큼 행이 뒤늦게 튀어, 방금 옮긴 행을 눈으로 좇을 수 없다.
 */
export function useReorderCertificates() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: ({ orderedIds, signal }: ReorderVars) => reorderCertificates(orderedIds, signal),
    onMutate: async ({ orderedIds }) => {
      await client.cancelQueries({ queryKey: CERT_LIST_KEY });
      const snapshot = client.getQueryData<readonly CertItem[]>(CERT_LIST_KEY);
      client.setQueryData<readonly CertItem[]>(CERT_LIST_KEY, (old) => {
        if (old === undefined) return old;
        const byId = new Map(old.map((item) => [item.id, item]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((item): item is CertItem => item !== undefined);
        // 화면이 들고 있던 목록과 길이가 다르면(그 사이 삭제·추가) 추측하지 않는다 — 서버 응답을 기다린다
        if (reordered.length !== old.length) return old;
        return reordered.map((item, index) => ({ ...item, order: index + 1 }));
      });
      return { snapshot };
    },
    onError: (error, _vars, context) => {
      /* 취소된 요청은 롤백하지 않는다 — 취소의 이유는 **더 새로운 이동**이다(화면이 직전 요청을
         abort 한다). 그 스냅샷은 두 번 전의 순서라, 되돌리면 방금 옮긴 행이 눈앞에서 제자리로
         튀었다가 다시 움직인다. 실패가 아니라 대체된 것이므로 새 요청의 결과에 맡긴다 (EXC-09). */
      if (isAbort(error)) return;
      if (context?.snapshot !== undefined) {
        client.setQueryData(CERT_LIST_KEY, context.snapshot);
      }
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: CERT_LIST_KEY });
    },
  });
}
