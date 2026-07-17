// 1:1 문의(티켓) 데이터 소스 어댑터
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 위에 배선한다. 목록/상세는
// fetchAll/fetchOne, 답변·상태·담당 저장은 update 를 쓴다. 문의는 고객 채널이 만들고 관리자는 처리만
// 하므로 create/remove 는 관리자 흐름에 없다(호출되지 않지만 인터페이스를 채운다).
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';
import type { CrudAdapter } from '../../../shared/crud';
import { HTTP_STATUS, HttpError } from '../../../shared/errors/http-error';
import { getTicket, listTickets, updateTicket } from '../_shared/store';
import type { Ticket, TicketInput } from '../_shared/domain';

export const TICKET_RESOURCE = 'support-tickets';
const SCOPE = TICKET_RESOURCE;

/** id 가 저장소에 아직 있는가 — store 의 map 은 없는 id 를 조용히 지나친다 */
const exists = (id: string): boolean => listTickets().some((ticket) => ticket.id === id);

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
    // [EXC-12] store 의 getTicket 은 status 없는 generic Error 를 던진다 — 그러면 폼 셸의 404
    // 분기가 발현되지 않고 '다시 시도'(재시도해도 없다)를 권한다. status 를 실어 구분 가능하게 한다.
    if (!exists(id)) {
      throw new HttpError(HTTP_STATUS.notFound, '문의를 찾을 수 없습니다.');
    }
    return getTicket(id);
  },
  create() {
    return Promise.reject(new Error('문의는 고객 채널에서 접수됩니다.'));
  },
  async update(id, input, context) {
    await wait(LATENCY_MS, context?.signal);
    failIfRequested(SCOPE, 'save');
    // [EXC-04] store 의 updateTicket 은 map 이다 — 없는 id 를 조용히 지나치고 성공을 반환했다.
    // 다른 관리자가 처리·삭제한 문의에 답변을 저장하면 유령 저장이 된다. 409 로 알린다.
    if (!exists(id)) {
      throw new HttpError(HTTP_STATUS.conflict, '다른 사용자가 먼저 변경한 문의입니다.');
    }
    updateTicket(id, input);
  },
  remove() {
    return Promise.reject(new Error('문의는 삭제할 수 없습니다.'));
  },
};
