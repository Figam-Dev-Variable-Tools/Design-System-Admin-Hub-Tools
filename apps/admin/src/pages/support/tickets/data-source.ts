// 1:1 문의(티켓) 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/support/**)
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 위에 배선한다. 목록/상세는
// fetchAll/fetchOne, 답변·상태·담당 저장은 update 를 쓴다. 문의는 고객 채널이 만들고 관리자는 처리만
// 하므로 create/remove 는 관리자 흐름에 없다(호출되지 않지만 인터페이스를 채운다).
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';
import type { CrudAdapter } from '../../../shared/crud';
import { getTicket, listTickets, updateTicket } from '../_shared/store';
import type { Ticket, TicketInput } from '../_shared/domain';

export const TICKET_RESOURCE = 'support-tickets';
const SCOPE = TICKET_RESOURCE;

// TODO(backend): GET /api/support/tickets · GET/PUT /api/support/tickets/:id (답변·상태·담당 저장)
export const ticketAdapter: CrudAdapter<Ticket, TicketInput> = {
  async fetchAll(signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'list');
    return listTickets();
  },
  async fetchOne(id, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'detail');
    return getTicket(id);
  },
  create() {
    return Promise.reject(new Error('문의는 고객 채널에서 접수됩니다.'));
  },
  async update(id, input, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'save');
    updateTicket(id, input);
  },
  remove() {
    return Promise.reject(new Error('문의는 삭제할 수 없습니다.'));
  },
};
