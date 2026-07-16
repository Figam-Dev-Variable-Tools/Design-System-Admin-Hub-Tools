// 이벤트 열 (apps/admin/src/pages/notifications/**)
//
// 세 목록(발송 규칙·이메일 템플릿·SMS 템플릿)의 첫 열은 모두 '이 행이 어느 이벤트에 묶였는가'다 —
// 이 섹션을 마케팅과 가르는 바로 그 축이라 세 화면 모두 맨 앞에 둔다. 같은 열을 세 번 복사하는 대신
// 여기 한 벌만 둔다(선례: pages/portfolio/_shared/publishColumn — 목록 공용 열을 섹션 _shared 에 둔다).
import { StatusBadge } from '../../../shared/ui';
import type { CrudColumn } from '../../../shared/crud';
import { triggerCategoryOf, triggerCategoryTone, triggerLabel } from './notification';
import type { TriggerId } from './notification';

interface TriggerBound {
  readonly trigger: TriggerId;
}

/** 분류(주문/배송/계정/보안)를 색으로, 이벤트명을 글자로 — 색만으로 정보를 전달하지 않는다(WCAG 1.4.1) */
export function triggerColumn<T extends TriggerBound>(): CrudColumn<T> {
  return {
    header: '이벤트',
    nowrap: true,
    render: (item) => {
      const category = triggerCategoryOf(item.trigger);
      // 픽스처/서버가 모르는 트리거를 주면 배지 대신 id 를 그대로 — 화면이 깨지지 않는다.
      return category === null ? (
        <span>{triggerLabel(item.trigger)}</span>
      ) : (
        <StatusBadge tone={triggerCategoryTone(category)} label={triggerLabel(item.trigger)} />
      );
    },
  };
}
