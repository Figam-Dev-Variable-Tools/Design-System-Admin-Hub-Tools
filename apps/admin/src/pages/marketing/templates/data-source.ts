// 발송 템플릿 데이터 소스 어댑터 (A41 소유 — apps/admin/src/pages/marketing/**)
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 위에 배선한다. 알림톡 템플릿은
// 사전 승인 대상이라 저장 시 서버가 승인 상태를 관리한다(여기선 폼이 상태를 직접 지정).
import { wait } from '../../../shared/async';
import { failIfRequested, LATENCY_MS } from '../../../shared/crud';
import type { CrudAdapter } from '../../../shared/crud';
import {
  addTemplate,
  getTemplate,
  listTemplates,
  removeTemplate,
  updateTemplate,
} from '../_shared/store';
import type { MessageTemplate, MessageTemplateInput } from '../_shared/messaging';

export const TEMPLATE_RESOURCE = 'marketing-templates';
const SCOPE = TEMPLATE_RESOURCE;

// TODO(backend): GET/POST /api/marketing/message-templates · GET/PUT/DELETE /api/marketing/message-templates/:id
//   알림톡은 POST /api/marketing/message-templates/:id/submit 로 카카오 심사에 제출한다(승인 후 발송 가능).
export const templateAdapter: CrudAdapter<MessageTemplate, MessageTemplateInput> = {
  async fetchAll(signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'list');
    return listTemplates();
  },
  async fetchOne(id, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'detail');
    return getTemplate(id);
  },
  async create(input, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'save');
    addTemplate(input);
  },
  async update(id, input, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'save');
    updateTemplate(id, input);
  },
  async remove(id, signal) {
    await wait(LATENCY_MS, signal);
    failIfRequested(SCOPE, 'delete');
    removeTemplate(id);
  },
};
