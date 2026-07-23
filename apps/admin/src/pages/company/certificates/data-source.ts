// 인증서/특허 데이터 소스 어댑터
//
// [백엔드 연동 지점] 공용 CRUD 어댑터에 픽스처 저장소를 물린다. 실제 연동 시 // TODO(backend) 로 교체.
// [더미] 실명·실제 회사명 금지. 이미지는 앱이 직접 서빙하는 자리표시 자산(public/fixtures/)을 가리킨다 —
// 예전에는 cdn.example.com 을 가리켰는데 그 호스트는 **실재하지 않아서** 화면마다 이미지가 깨지고
// 콘솔에 ERR_NAME_NOT_RESOLVED 가 쌓였다(전 라우트 순회에서 36건). 백엔드가 없는 픽스처 앱이라
// 외부 호스트는 영원히 해석되지 않는다 — 자리표시는 앱 안에 있어야 실제로 그려진다.
//
// [왜 createCrudAdapter 가 아니라 createStoreAdapter 인가]
// 목록에 **순서 변경**이 생겼기 때문이다. createCrudAdapter 는 항목 배열을 자기 클로저 안에 감춰 두고
// CRUD 다섯 가지만 노출한다 — 재정렬은 그 다섯 중 어느 것도 아니라서 배열에 닿을 방법이 없다.
// createStoreAdapter 는 **바깥의 저장소**에 위임하는 형제 팩토리라, 같은 배열을 재정렬 함수와 나눠 쓸 수
// 있다(멱등키·404·409 가드는 그쪽이 동일하게 해 준다). 로고 목록이 자기 어댑터를 손으로 짜면서 갖게 된
// reorder 를, 여기서는 공용 팩토리를 그대로 쓰면서 얻는다.
import { wait } from '../../../shared/async';
import { createStoreAdapter, failIfRequested, LATENCY_MS } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { nextCertOrder, reorderCertificatesByIds, seedCertOrder, sortCertificates } from './types';
import type { CertInput, CertItem } from './types';

const SCOPE = 'certificates';

/**
 * 시드에는 order 가 없다 — 발급일 내림차순으로 최초 배정한다(seedCertOrder).
 * 그 뒤로는 운영자가 만든 순서가 정본이고, 발급일은 표시 열일 뿐이다 (types.ts 의 CertItem.order).
 */
const CERT_SEED: readonly Omit<CertItem, 'order'>[] = [
  {
    id: 'cert-1',
    name: 'ISO 9001 품질경영시스템 인증',
    issuer: '예시인증원',
    issuedOn: '2023-04-12',
    kind: 'certificate',
    imageUrl: '/fixtures/placeholder-image.svg',
  },
  {
    id: 'cert-2',
    name: '공간 배치 최적화 방법 특허',
    issuer: '특허청(예시)',
    issuedOn: '2022-09-01',
    kind: 'patent',
    imageUrl: '/fixtures/placeholder-image.svg',
  },
  {
    id: 'cert-3',
    name: '기업부설연구소 인정서',
    issuer: '예시산업진흥원',
    issuedOn: '2021-06-20',
    kind: 'certificate',
    imageUrl: '/fixtures/placeholder-image.svg',
  },
];

/** mutable — CRUD 와 재정렬이 이 배열을 함께 갱신한다(백엔드가 붙으면 통째로 사라진다) */
let ITEMS: readonly CertItem[] = seedCertOrder(CERT_SEED);

let seq = CERT_SEED.length;

// TODO(backend): GET/POST /api/company/certificates · GET/PUT/DELETE /api/company/certificates/:id
export const certificatesAdapter = createStoreAdapter<CertItem, CertInput>({
  scope: SCOPE,
  // 조회는 **order 오름차순**이다 — 목록에서 바꾼 순서가 다음 조회에서도 그대로여야 조작이 성립한다
  list: () => sortCertificates(ITEMS),
  getOne: (id) => {
    const found = ITEMS.find((item) => item.id === id);
    // createStoreAdapter 가 존재 여부를 먼저 확인하지만(404), 타입상 T 를 돌려줘야 하므로 여기서도 막는다
    if (found === undefined) {
      throw new HttpError(HTTP_STATUS.notFound, '항목을 찾을 수 없어요.');
    }
    return found;
  },
  // 새 항목은 발급일과 무관하게 **맨 끝**이다 — 손으로 만든 순서에 끼어들지 않는다
  add: (input) => {
    seq += 1;
    ITEMS = [...ITEMS, { id: `cert-${String(seq)}`, order: nextCertOrder(ITEMS), ...input }];
  },
  update: (id, input) => {
    // input 에 order 가 없으므로 순서는 수정 폼을 지나도 보존된다
    ITEMS = ITEMS.map((item) => (item.id === id ? { ...item, ...input } : item));
  },
  remove: (id) => {
    ITEMS = ITEMS.filter((item) => item.id !== id);
  },
});

/**
 * 드래그/키보드 재정렬 — 새 순서를 **영속**시킨다(order 를 1..n 으로 다시 매긴다).
 *
 * 낙관적 업데이트·롤백·토스트는 호출부(queries.ts · CertificatesListPage)의 몫이다.
 */
// TODO(backend): PUT /api/company/certificates/reorder  { orderedIds }
export async function reorderCertificates(
  orderedIds: readonly string[],
  signal?: AbortSignal,
): Promise<void> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SCOPE, 'reorder');
  ITEMS = reorderCertificatesByIds(ITEMS, orderedIds);
}
