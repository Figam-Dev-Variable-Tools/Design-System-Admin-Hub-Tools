// 목록의 인라인 노출/판매 토글 — 권한이 없으면 값만 남고 컨트롤이 사라진다
//
// ┌ [EXC-03] 왜 이 컴포넌트가 생겼나 ────────────────────────────────────────────────┐
// │ CrudListShell 은 행 액션(연필·휴지통)과 일괄 삭제를 스스로 게이팅하지만, 인라인       │
// │ 토글은 화면이 `CrudColumn.render` 로 넘기는 ReactNode 라 껍데기가 붙잡을 손잡이가     │
// │ 없다. 그래서 노출/판매 토글 7종이 조회 권한만으로 눌리고 저장까지 됐다.               │
// │                                                                                  │
// │ 화면 7곳이 각자 `{canUpdate && <ToggleSwitch …>}` 를 적으면 한 곳만 빠뜨려도 그      │
// │ 토글만 조용히 열린다 — 이 결함의 원래 모양이 정확히 그것이다. 그래서 표현을 한 벌로  │
// │ 모으고, 판정은 저장 경로와 **같은 값**(useCrudRowUpdate 의 canUpdate)에서 온다.      │
// └──────────────────────────────────────────────────────────────────────────────────┘
//
// [왜 '비활성' 이 아니라 배지인가] 이 열은 **데이터 열이기도 하다** — '이 상품이 지금 판매 중인가'
// 는 조회 권한만 있어도 볼 수 있어야 하는 사실이다. 컨트롤을 통째로 지우면 그 사실까지 사라지고,
// disabled 토글로 남기면 '고칠 수 있는데 잠깐 막힌 것' 으로 읽힌다(그리고 스크린리더에는 그냥
// 눌리지 않는 스위치다). 그래서 컨트롤은 사라지고 **값은 배지로 남는다**.
import { StatusBadge, ToggleSwitch } from '../ui';

interface RowToggleProps {
  readonly checked: boolean;
  /** 이 행의 요청이 진행 중인가 (useCrudRowUpdate 의 pendingId 비교 결과) */
  readonly busy: boolean;
  /**
   * 이 라우트의 수정 권한 — `useCrudRowUpdate` 가 돌려주는 값을 그대로 넘긴다.
   * 그 훅의 `run` 이 거절하는 조건과 같은 값이라, 컨트롤과 저장 경로가 갈라질 수 없다.
   */
  readonly canUpdate: boolean;
  /**
   * 권한 **뒤**의 축으로 잠긴 상태 (예: PG 를 쓰지 않으면 쿠폰 발급은 못 켠다).
   *
   * 판정 순서는 인증 → 플랜 → 권한 → 설정이라, 권한이 없으면 이 값과 무관하게 배지가 이긴다:
   * '설정이 꺼져 있어 잠김' 이라고 말하면 켤 수 있는 것처럼 읽히는데 실은 켤 수도 없다.
   */
  readonly disabled?: boolean;
  /** 스크린리더용 이름 — 표 안에서 무엇을 켜는지 알린다 */
  readonly label: string;
  readonly onLabel: string;
  readonly offLabel: string;
  readonly onChange: (next: boolean) => void;
}

export function RowToggle({
  checked,
  busy,
  canUpdate,
  disabled = false,
  label,
  onLabel,
  offLabel,
  onChange,
}: RowToggleProps) {
  if (!canUpdate) {
    return (
      <StatusBadge tone={checked ? 'success' : 'neutral'} label={checked ? onLabel : offLabel} />
    );
  }

  return (
    <ToggleSwitch
      checked={checked}
      busy={busy}
      disabled={disabled}
      onChange={onChange}
      label={label}
      onLabel={onLabel}
      offLabel={offLabel}
    />
  );
}
