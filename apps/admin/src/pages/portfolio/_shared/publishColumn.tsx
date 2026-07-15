// 노출 여부 인라인 토글 열 (A41 소유 — apps/admin/src/pages/portfolio/**)
//
// 포트폴리오·성공 사례 목록이 똑같은 '노출 토글' 열을 쓴다(이진 상태 → ToggleSwitch, 오너 규칙).
// 두 목록이 같은 열을 복사하는 대신 여기 한 벌만 둔다. 갱신 배선은 shared/crud 의 useCrudRowUpdate 가 맡고,
// 이 헬퍼는 그 pendingId/콜백을 CrudColumn 으로 감싼다(프레임워크의 커스텀 컬럼 렌더 확장 포인트 활용).
import { ToggleSwitch } from '../../../shared/ui';
import type { CrudColumn } from '../../../shared/crud';

interface Publishable {
  readonly id: string;
  readonly title: string;
  readonly published: boolean;
}

export function publishToggleColumn<T extends Publishable>(
  pendingId: string | null,
  onToggle: (item: T, next: boolean) => void,
): CrudColumn<T> {
  return {
    header: '노출',
    nowrap: true,
    render: (item) => (
      <ToggleSwitch
        checked={item.published}
        busy={pendingId === item.id}
        onChange={(next) => onToggle(item, next)}
        label={`${item.title} 노출 여부`}
        onLabel="게시"
        offLabel="숨김"
      />
    ),
  };
}
