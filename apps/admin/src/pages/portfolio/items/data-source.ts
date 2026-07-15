// 포트폴리오 항목 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/portfolio/**)
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 저장소 위에 배선한다.
// 실제 연동 시 아래 함수 본문만 HTTP 로 바꾸고 화면 코드는 그대로 둔다.
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';
import type { CrudAdapter } from '../../../shared/crud';
import {
  addItem,
  getItem,
  listCategories,
  listItems,
  removeItem,
  updateItem,
} from '../_shared/store';
import type { PortfolioCategory, PortfolioItem, PortfolioItemInput } from '../_shared/store';

const SCOPE = 'portfolio';

// TODO(backend): GET/POST /api/portfolio/items · GET/PUT/DELETE /api/portfolio/items/:id
export const portfolioAdapter: CrudAdapter<PortfolioItem, PortfolioItemInput> = {
  async fetchAll(signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'list');
    return listItems();
  },
  async fetchOne(id, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'detail');
    return getItem(id);
  },
  async create(input, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'save');
    addItem(input);
  },
  async update(id, input, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'save');
    updateItem(id, input);
  },
  async remove(id, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'delete');
    removeItem(id);
  },
};

// TODO(backend): GET /api/portfolio/categories  (폼의 분류 선택지)
export async function fetchPortfolioCategoryOptions(
  signal?: AbortSignal,
): Promise<readonly PortfolioCategory[]> {
  await wait(LATENCY_MS, signal);
  failIfRequested(SCOPE, 'list');
  return listCategories();
}
