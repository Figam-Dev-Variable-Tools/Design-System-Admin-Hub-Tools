// 이메일 템플릿 데이터 소스 어댑터 (apps/admin/src/pages/notifications/**)
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 위에 배선한다.
// 이 화면은 문구만 관리한다 — **발송하지 않는다**. 실제 발송은 이벤트를 받은 서버가 발송 규칙에 따라
// 이 템플릿을 렌더해 보낸다(프론트에 발송 경로가 없다 — 마케팅 발송 화면과 결정적으로 다른 점).
import { createStoreAdapter } from '../../../shared/crud';
import {
  addEmailTemplate,
  getEmailTemplate,
  listEmailTemplates,
  removeEmailTemplate,
  updateEmailTemplate,
} from '../_shared/store';
import type { EmailTemplate, EmailTemplateInput } from '../_shared/notification';

export const EMAIL_TEMPLATE_RESOURCE = 'notification-email-templates';

// TODO(backend): GET/POST /api/notifications/email-templates · GET/PUT/DELETE /api/notifications/email-templates/:id
//   템플릿은 트리거(order.placed 등)에 묶인다 — 서버가 이벤트 수신 시 GET /api/notifications/rules 로
//   규칙을 찾아 이 템플릿을 렌더해 발송한다. 이 화면에서 나가는 발송 요청은 없다.
export const emailTemplateAdapter = createStoreAdapter<EmailTemplate, EmailTemplateInput>({
  scope: EMAIL_TEMPLATE_RESOURCE,
  list: listEmailTemplates,
  getOne: getEmailTemplate,
  add: addEmailTemplate,
  update: updateEmailTemplate,
  remove: removeEmailTemplate,
});
