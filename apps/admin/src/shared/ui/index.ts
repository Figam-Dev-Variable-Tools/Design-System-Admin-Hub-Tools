// 공통 UI 모듈 배럴 (A40 소유 — apps/admin/src/shared/ui/**)
//
// **페이지는 반드시 여기서만 import 한다.**
//   허용: import { Button, Card, useToast } from '../../shared/ui';
//   금지: import { Button } from '../../shared/ui/Button';   ← 개별 파일 직접 import
//   금지: import { Button } from '../members/components/Button'; ← 다른 페이지에서 가져오기
//
// 규칙과 배경은 ./README.md 를 읽는다.

// 공통 클래스(hover/focus-visible/skeleton/toast) — 배럴을 쓰는 페이지가 자동으로 함께 로드한다
import './ui.css';

// [공개 표면은 실제로 쓰이는 것만] 각 컴포넌트의 Props 타입은 **아무도 import 하지 않는다** —
// 배럴에서 재수출하면 쓰이지도 않는 공개 API 가 되고, 지울 때 파급 범위를 알 수 없게 된다.
// 그래서 Props 타입은 각 파일의 지역 타입으로 되돌렸다 (A83 축5 죽은 코드).
// 필요해지는 순간 그 파일에서 export 하고 여기에 한 줄 더한다.

/* ── 디자인 시스템 재수출 ─────────────────────────────────────────────────────
 *
 * Alert · Button 은 **@tds/ui 의 것**이다. 페이지는 지금까지 쓰던 것처럼 이 배럴에서 가져오면 되고,
 * 그러면 구현은 디자인 시스템의 것이 온다 (호출부 20여 곳을 한꺼번에 갈아끼우지 않아도 된다).
 *
 * 예전에는 이 두 이름이 shared/ui 안의 **사본**을 가리켰다. 그 사본들은 삭제됐다.
 */
export { Alert, Button } from '@tds/ui';

export { Card, CardTitle } from './Card';

export { ConfirmDialog } from './ConfirmDialog';

export { HelpTip } from './HelpTip';

export { Modal } from './Modal';

export { Pagination } from './Pagination';

export { SelectAllHeaderCell, tableSelectionState } from './TableSelection';

export { Toast } from './Toast';
export type { ToastItem, ToastKind } from './Toast';

export { ToastProvider, useToast } from './ToastProvider';

export { TriStateCheckbox, triStateProps } from './TriStateCheckbox';

export { useUnsavedChangesDialog } from './useUnsavedChangesDialog';

/* ── 아이콘 (여러 페이지가 쓰는 것만) ────────────────────────────────────── */
export {
  AlertTriangleIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DownloadIcon,
  InfoCircleIcon,
  PencilIcon,
  PlusCircleIcon,
  SearchIcon,
  TrashIcon,
  XCircleIcon,
} from './icons';
export type { IconProps } from './icons';

/* ── 스타일 토큰 조합 ────────────────────────────────────────────────────── */
export {
  badgeStyle,
  buttonStyle,
  cardBodyStyle,
  cardTitleStyle,
  checkboxStyle,
  controlStyle,
  ddStyle,
  dlStyle,
  dtStyle,
  errorTextStyle,
  fieldLabelStyle,
  fieldStyle,
  filterHeadingStyle,
  filterItemStyle,
  filterListStyle,
  filterNavStyle,
  filterNoticeStyle,
  filterPanelStyle,
  hintStyle,
  mutedTextStyle,
  numericCellStyle,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from './styles';

// [지워진 재수출] feedbackStyle · FeedbackTone · ButtonVariant 는 배럴 밖 소비자가 없어졌다.
// 배너(Alert)와 버튼(Button)이 @tds/ui 로 넘어가면서, 이 셋은 Toast 가 './styles' 에서 직접 쓰는
// 내부 표면으로 남는다. 쓰지 않는 것을 공개하지 않는다 (A83 축5 죽은 코드 0 유지).
