// 답변 템플릿 데이터 소스 어댑터
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 위에 배선한다. 목록·상세·
// 등록·수정·삭제 모두 관리자 흐름에 있다(자주 쓰는 답변/매크로 관리). 티켓 상세가 이 템플릿을 삽입한다.
import { createStoreAdapter } from '../../../shared/crud';
import {
  addTemplate,
  getTemplate,
  listTemplates,
  removeTemplate,
  updateTemplate,
} from '../_shared/store';
import type { ReplyTemplate, ReplyTemplateInput } from '../_shared/domain';

export const TEMPLATE_RESOURCE = 'support-templates';
const SCOPE = TEMPLATE_RESOURCE;

// TODO(backend): GET/POST /api/support/reply-templates · GET/PUT/DELETE /api/support/reply-templates/:id
export const replyTemplateAdapter = createStoreAdapter<ReplyTemplate, ReplyTemplateInput>({
  scope: SCOPE,
  list: listTemplates,
  getOne: getTemplate,
  add: addTemplate,
  update: updateTemplate,
  remove: removeTemplate,
});
