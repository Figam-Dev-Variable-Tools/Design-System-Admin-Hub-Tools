// 알림 발송 규칙 데이터 소스 어댑터 (apps/admin/src/pages/notifications/**)
//
// [백엔드 연동 지점] 공용 CRUD 프레임워크의 CrudAdapter 를 _shared/store 위에 배선한다.
//
// [실 발송 0건] 이 화면은 '무엇을 언제 보낼지'를 **정의**할 뿐 보내지 않는다. 발송 주체는 이벤트를 받은
// 서버다 — 그래서 여기엔 마케팅의 POST /api/.../send 같은 발송 트리거가 없다. 규칙은 상시 대기 상태로
// 켜져(enabled) 있고, 이벤트가 오면 서버가 규칙을 찾아 템플릿을 렌더해 보낸다.
import { createStoreAdapter } from '../../../shared/crud';
import { addRule, getRule, listRules, removeRule, updateRule } from '../_shared/store';
import type { NotificationRule, NotificationRuleInput } from '../_shared/notification';

export const RULE_RESOURCE = 'notification-rules';

// TODO(backend): GET/POST /api/notifications/rules · GET/PUT/DELETE /api/notifications/rules/:id
//   ON/OFF 는 PUT /api/notifications/rules/:id (enabled) 로 같이 나간다 — 전용 엔드포인트를 두지 않는다.
//   발송은 서버 몫이다: 이벤트 버스가 트리거를 받으면 규칙을 조회해 템플릿을 렌더하고 발송사(SMS/메일)로
//   넘긴 뒤 retryPolicy 만큼 재시도한다. 프론트에서 나가는 발송 요청은 없다.
export const ruleAdapter = createStoreAdapter<NotificationRule, NotificationRuleInput>({
  scope: RULE_RESOURCE,
  list: listRules,
  getOne: getRule,
  add: addRule,
  update: updateRule,
  remove: removeRule,
});
