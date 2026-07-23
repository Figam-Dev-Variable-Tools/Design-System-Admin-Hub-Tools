// 노출 여부 인라인 토글 열
//
// 포트폴리오·성공 사례 목록이 똑같은 '노출 토글' 열을 쓴다(이진 상태 → ToggleSwitch, 오너 규칙).
// 두 목록이 같은 열을 복사하는 대신 여기 한 벌만 둔다. 갱신 배선은 shared/crud 의 useCrudRowUpdate 가 맡고,
// 이 헬퍼는 그 pendingId/콜백을 CrudColumn 으로 감싼다(프레임워크의 커스텀 컬럼 렌더 확장 포인트 활용).
import { RowToggle } from '../../../shared/crud';
import type { CrudColumn } from '../../../shared/crud';

interface Publishable {
  readonly id: string;
  readonly title: string;
  readonly published: boolean;
}

export function publishToggleColumn<T extends Publishable>(
  pendingId: string | null,
  /**
   * 이 라우트의 수정 권한 — `useCrudRowUpdate` 가 돌려주는 값을 그대로 넘긴다 (EXC-03).
   *
   * [왜 옵션이 아니라 필수 인자인가] 기본값 true 를 주면 이 열을 쓰는 새 목록이 인자를 빠뜨렸을
   * 때 **조용히 열린 채로** 통과한다 — 이 결함이 원래 그렇게 생겼다. 빠뜨리면 컴파일이 막힌다.
   */
  canUpdate: boolean,
  onToggle: (item: T, next: boolean) => void,
): CrudColumn<T> {
  return {
    header: '노출',
    nowrap: true,
    render: (item) => (
      <RowToggle
        checked={item.published}
        busy={pendingId === item.id}
        canUpdate={canUpdate}
        onChange={(next) => onToggle(item, next)}
        label={`${item.title} 노출 여부`}
        onLabel="게시"
        offLabel="숨김"
      />
    ),
  };
}
