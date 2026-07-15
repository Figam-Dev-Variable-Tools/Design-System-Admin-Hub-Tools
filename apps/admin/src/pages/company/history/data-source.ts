// 연혁 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/company/history/**)
//
// [백엔드 연동 지점] 공용 CRUD 어댑터에 연혁 시드를 넣는다. 실제 연동 시 아래 // TODO(backend)
// 엔드포인트로 어댑터 본문만 바꾼다(화면·공용 모듈 코드는 그대로).
import { createCrudAdapter } from '../_shared/crud';
import { sortHistory } from './types';
import type { HistoryInput, HistoryItem } from './types';

const HISTORY_SEED: readonly HistoryItem[] = [
  { id: 'history-1', year: 2018, month: 3, content: '주식회사 예시플래닝 설립' },
  { id: 'history-2', year: 2019, month: 7, content: '첫 공공기관 공간 기획 프로젝트 수주' },
  { id: 'history-3', year: 2021, month: 5, content: '기업부설 연구소 설립' },
  { id: 'history-4', year: 2022, month: 11, content: '누적 프로젝트 100건 달성' },
  { id: 'history-5', year: 2024, month: 2, content: '데이터 기반 공간 분석 솔루션 출시' },
];

let seq = HISTORY_SEED.length;

// TODO(backend): GET/POST /api/company/history · GET/PUT/DELETE /api/company/history/:id
export const historyAdapter = createCrudAdapter<HistoryItem, HistoryInput>({
  scope: 'history',
  seed: HISTORY_SEED,
  build: (input) => {
    seq += 1;
    return { id: `history-${String(seq)}`, ...input };
  },
  patch: (item, input) => ({ ...item, ...input }),
  sort: sortHistory,
});
