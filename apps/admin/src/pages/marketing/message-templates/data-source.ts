// 메시지 템플릿 데이터 소스 어댑터
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 이 폴더의 store 위에 배선한다.
// 목록·편집기·상세가 모두 이 어댑터 하나를 통해 읽고 쓴다(react-query 캐시 키가 한 벌이라
// 편집기에서 저장하면 목록과 상세가 함께 무효화된다).
import { createStoreAdapter } from '../../../shared/crud';
import {
  addMessageTemplate,
  getMessageTemplate,
  listMessageTemplates,
  removeMessageTemplate,
  updateMessageTemplate,
} from './store';
import type { MessageTemplateDraft } from './store';
import type { MessageTemplate } from './types';

export const MESSAGE_TEMPLATE_RESOURCE = 'marketing-message-templates';

/**
 * 이 시스템이 **'발송 템플릿' 자리 그 자체**다 (/marketing/templates).
 *
 * [왜 별도 경로를 쓰지 않는가] 운영자가 이미 매일 여는 화면이 이것으로 바뀌는 것이지, 옆에 새 화면이
 * 하나 더 생기는 것이 아니다. 메뉴에 '템플릿' 이 둘이면 어느 쪽에 만들어야 하는지를 매번 고민하게 된다.
 *
 * [알림톡도 이제 이 모델이 덮는다] 한때 알림톡만 옛 심사 모델 화면(/marketing/templates/alimtalk)에
 * 남아 재구축을 기다렸다. 지금은 이 시스템의 종류(TemplateKind)가 알림톡·브랜드메시지까지 포함하고
 * 편집기도 갖췄으므로 그 화면들은 삭제했다 — 옛 경로는 App.tsx 가 이 목록으로 되돌린다.
 */
export const MESSAGE_TEMPLATE_LIST_PATH = '/marketing/templates';

/** 편집기 진입 경로 — 새로 만들 때는 종류를 쿼리로 들고 간다(?kind=text|email) */
export const messageTemplateNewPath = (kind: string): string =>
  `${MESSAGE_TEMPLATE_LIST_PATH}/new?kind=${kind}`;
export const messageTemplateDetailPath = (id: string): string =>
  `${MESSAGE_TEMPLATE_LIST_PATH}/${id}`;
export const messageTemplateEditPath = (id: string): string =>
  `${MESSAGE_TEMPLATE_LIST_PATH}/${id}/edit`;

// TODO(backend): GET/POST /api/marketing/message-templates · GET/PUT/DELETE /api/marketing/message-templates/:id
//   상태만 바꾸는 발행·사용 여부 토글은 PATCH /api/marketing/message-templates/:id/status (store.ts 참고).
export const messageTemplateAdapter = createStoreAdapter<MessageTemplate, MessageTemplateDraft>({
  scope: MESSAGE_TEMPLATE_RESOURCE,
  list: listMessageTemplates,
  getOne: getMessageTemplate,
  add: addMessageTemplate,
  update: updateMessageTemplate,
  remove: removeMessageTemplate,
});
