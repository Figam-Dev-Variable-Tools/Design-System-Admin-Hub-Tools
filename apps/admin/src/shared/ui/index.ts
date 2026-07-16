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
export {
  Alert,
  Button,
  DateRangeField,
  errorIdOf,
  FormField,
  HelpTip,
  hintIdOf,
  ImageThumb,
  moveArrayItem,
  Pagination,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  RowActions,
  RowSelectCell,
  SearchField,
  SelectAllHeaderCell,
  SelectField,
  SelectionBar,
  SeqCell,
  SeqHeaderCell,
  StatusBadge,
  tableSelectionState,
  TextareaField,
  ToggleSwitch,
  TriStateCheckbox,
  triStateProps,
  useReorderableRows,
} from '@tds/ui';
/** @tds/ui 의 StatusBadgeTone 을 앱이 쓰던 이름(StatusTone)으로 재노출한다 — 호출부 API 보존 */
export type { StatusBadgeTone as StatusTone } from '@tds/ui';

export { Card, CardTitle } from './Card';

export { ConfirmDialog } from './ConfirmDialog';

/* Modal 은 **@tds/ui 의 것**이다 (organism 승격 · B4). 예전엔 shared/ui 안의 사본을 가리켰다 — 그 사본은 삭제됐다. */
export { Modal } from '@tds/ui';

/* Pagination 은 @tds/ui 의 것이다 (상단 재수출). 예전엔 shared/ui 안의 사본을 가리켰다 — 그 사본은 삭제됐다 (B3 승격). */

/* ── 콘텐츠 관리 공통 (공지·FAQ·팝업·배너·약관·개인정보 처리방침이 공유) ─────
 *
 * StatusBadge 는 **@tds/ui 의 것**이다 (위 재수출). StatusTone 은 계약 생성 타입
 * StatusBadgeTone 을 앱 이름으로 alias 한 것이다 — 근거·소비자 목록은 ./README.md. */

/* ── 이벤트 타임라인 (영업 문의·고객센터 티켓 상세가 공유) ─────────────────────
 *
 * 도메인을 모르는 프리미티브 — 각 페이지가 자기 이벤트를 TimelineEvent 로 매핑해 넘긴다. */
/* Timeline 은 **@tds/ui 의 것**이다 (molecule 승격 · B4). 예전엔 shared/ui 사본 — 삭제됨.
 * at(ISO) 포맷은 @tds/ui Timeline 이 자체 순수 함수로 갖는다(앱 shared/format 역의존 제거). */
export { Timeline } from '@tds/ui';
export type { TimelineEvent } from '@tds/ui';

/* FormField · errorIdOf · hintIdOf · TextareaField · SearchField 는 @tds/ui 의 것이다 (상단 재수출).
 * 예전에는 이 이름들이 shared/ui 안의 사본을 가리켰다. 그 사본들은 삭제됐다 (B2 승격). */

/* ImageUploadField · ImageGalleryField 는 **@tds/ui 의 것**이다 (media 승격 · B5).
 * 예전엔 shared/ui 안의 사본을 가리켰다 — 그 사본들(+ imageFile.ts)은 삭제됐다. imageFileError(순수 검증
 * 유틸)는 @tds/ui 안에서 두 필드가 내부적으로만 쓰므로 앱 배럴에 재노출하지 않는다 (죽은 공개 표면 0). */
export { ImageGalleryField, ImageUploadField } from '@tds/ui';

/* ImageThumb 는 @tds/ui 의 것이다 (상단 재수출). */

/* DateRangeField 는 @tds/ui 의 것이다 (상단 재수출). */

/* RowActions 는 @tds/ui 의 것이다 (상단 재수출). 예전엔 shared/ui 사본 — 삭제됨 (B3 승격). */

export { VersionHistoryTable } from './VersionHistoryTable';
export type { VersionRow } from './VersionHistoryTable';

/* ── 표 행 선택 (회원·운영자·콘텐츠 목록이 공유) ───────────────────────────────
 * RowSelectCell · SelectAllHeaderCell · SeqCell · SeqHeaderCell · tableSelectionState 는
 * 전부 @tds/ui 의 것이다 (상단 재수출). 예전엔 shared/ui/TableSelection 사본 — 삭제됨 (B3 승격). */

/* SelectionBar 는 @tds/ui 의 것이다 (상단 재수출). 예전엔 shared/ui 사본 — 삭제됨 (B3 승격). */

export { useRowSelection } from './useRowSelection';

/* ToggleSwitch 는 @tds/ui 의 것이다 (상단 재수출). */

/* ── 표 행 드래그 재정렬 (FAQ·배너가 공유) ───────────────────────────────────
 * moveArrayItem · useReorderableRows · ReorderGripCell · ReorderGripHeaderCell · ReorderMoveButtons 는
 * 전부 @tds/ui 의 것이다 (상단 재수출). 예전엔 shared/ui/tableReorder 사본 — 삭제됨 (B3 승격). */

/* Toast(item) 는 **@tds/ui 의 것**이다 (molecule 승격 · B4). 예전엔 shared/ui 사본 — 삭제됨.
 * ToastProvider(context/큐/위치)·useToast(훅)는 계약 부적합이라 앱에 남아 @tds/ui Toast 를 조립한다.
 * Toast(item)·ToastItem·ToastKind 는 배럴 밖 소비자가 없어 재수출하지 않는다 (죽은 공개 표면 0). */
export { ToastProvider, useToast } from './ToastProvider';

/* TriStateCheckbox · triStateProps 는 @tds/ui 의 것이다 (상단 재수출). */

export { useUnsavedChangesDialog } from './useUnsavedChangesDialog';

/* ── 아이콘 (여러 페이지가 쓰는 것만) ──────────────────────────────────────
 * AlertTriangleIcon·InfoCircleIcon 은 유일 소비자였던 ConfirmDialog·Toast 가 @tds/ui 로 승격되며
 * 각자 인라인 글리프를 갖게 돼 여기서 삭제됐다 (죽은 코드 0). IconProps 는 파일 지역 타입으로 되돌렸다. */
export {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  DownloadIcon,
  ImageIcon,
  PencilIcon,
  PlusCircleIcon,
  SearchIcon,
  TrashIcon,
  UploadIcon,
  XCircleIcon,
} from './icons';

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
  pageTitleStyle,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from './styles';

// [지워진 재수출] feedbackStyle · FeedbackTone · ButtonVariant 는 배럴 밖 소비자가 없어졌다.
// 배너(Alert)와 버튼(Button)이 @tds/ui 로 넘어가면서, 이 셋은 Toast 가 './styles' 에서 직접 쓰는
// 내부 표면으로 남는다. 쓰지 않는 것을 공개하지 않는다 (A83 축5 죽은 코드 0 유지).
