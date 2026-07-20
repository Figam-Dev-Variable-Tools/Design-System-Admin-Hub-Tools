// 앱은 반드시 이 entry로만 import (@tds/ui). 내부 경로 직접 import는 eslint-plugin-boundaries + G6 체크리스트가 차단.
// 계약(contracts/*.contract.json) 15종의 구현이 여기서 re-export될 때만 public API가 된다.
// Props 타입은 전부 codegen 산출물(generated/types/*)이 원천이다 — 수동 타입 선언 금지 (G6).

// --- 토큰 헬퍼 ---
// 인라인 style 의 토큰 참조는 손글씨 `var(--tds-*)` 문자열이 아니라 이 헬퍼를 쓴다.
// TokenPath 는 codegen 이 tokens.json 에서 만든 리터럴 유니온이라 오타가 컴파일 타임에 잡히고
// 자동완성이 붙는다. 문자열은 타입 검사가 닿지 않아 실재하지 않는 토큰이 조용히 렌더됐다
// (work-cycle.md §7 — `--tds-shadow-md` 가 그림자를 안 그리고 있던 사고).
//
// [서브패스가 아니라 배럴인 이유] eslint-plugin-boundaries 가 `@tds/ui/*` deep import 를 막고
// (apps/admin/eslint.config.js:147) 이 파일 머리말이 "앱은 반드시 이 entry 로만" 을 못박는다.
// `./generated/*` 서브패스를 열면 그 규칙에 예외를 하나 더 뚫어야 하고, 앱이 산출물 경로 모양에
// 직접 의존하게 된다. 배럴은 예외를 만들지 않고 산출물 위치를 캡슐화한다.
export { cssVar, tokenVars } from '../generated/tokens/tokens';
export type { TokenPath } from '../generated/tokens/tokens';

// --- Atoms ---
export { Alert } from './atoms/Alert';
export type { AlertProps, AlertState, AlertTone } from './atoms/Alert';
export { Badge } from './atoms/Badge';
export type { BadgeProps, BadgeState, BadgeTone } from './atoms/Badge';
export { Button } from './atoms/Button';
export type { ButtonProps, ButtonSize, ButtonState, ButtonVariant } from './atoms/Button';
export { Card } from './atoms/Card';
export type { CardElevation, CardPadding, CardProps, CardState } from './atoms/Card';
export { Checkbox } from './atoms/Checkbox';
export type { CheckboxProps, CheckboxState } from './atoms/Checkbox';
// ColorField 묶음 — 계약 대상(ColorField) + 함께 이동한 순수 hex 유틸(호출부가 같은 판정을 쓰게 한다)
export { ColorField, isHexColor, toSwatchValue } from './atoms/ColorField';
export type { ColorFieldProps, ColorFieldState } from './atoms/ColorField';
export { Divider } from './atoms/Divider';
export type { DividerOrientation, DividerProps, DividerState } from './atoms/Divider';
export { HelpTip } from './atoms/HelpTip';
export type { HelpTipProps, HelpTipState } from './atoms/HelpTip';
export { Icon } from './atoms/Icon';
export type { IconName, IconProps, IconSize, IconState } from './atoms/Icon';
export { IconButton } from './atoms/IconButton';
export type {
  IconButtonPressed,
  IconButtonProps,
  IconButtonSize,
  IconButtonState,
} from './atoms/IconButton';
export { ImageThumb } from './atoms/ImageThumb';
export type { ImageThumbProps, ImageThumbState } from './atoms/ImageThumb';
export { Slider } from './atoms/Slider';
export type { SliderProps, SliderState } from './atoms/Slider';
export { SelectField } from './atoms/SelectField';
export type { SelectFieldProps, SelectFieldState } from './atoms/SelectField';
export { Skeleton } from './atoms/Skeleton';
export type { SkeletonProps, SkeletonShape, SkeletonState } from './atoms/Skeleton';
export { Spinner } from './atoms/Spinner';
export type { SpinnerProps, SpinnerSize, SpinnerState } from './atoms/Spinner';
export { StatusBadge } from './atoms/StatusBadge';
export type { StatusBadgeProps, StatusBadgeState, StatusBadgeTone } from './atoms/StatusBadge';
export { TextField, textFieldErrorId } from './atoms/TextField';
export type { TextFieldProps, TextFieldState, TextFieldType } from './atoms/TextField';
export { ToggleSwitch } from './atoms/ToggleSwitch';
export type { ToggleSwitchProps, ToggleSwitchState } from './atoms/ToggleSwitch';
export { TriStateCheckbox, triStateProps } from './atoms/TriStateCheckbox';
export type { TriStateCheckboxProps, TriStateCheckboxState } from './atoms/TriStateCheckbox';

// --- Molecules ---
export { DataTable } from './molecules/DataTable';
export type { DataTableProps, DataTableState } from './molecules/DataTable';
export { DateRangeField } from './molecules/DateRangeField';
export type { DateRangeFieldProps, DateRangeFieldState } from './molecules/DateRangeField';
export { Empty } from './molecules/Empty';
export type { EmptyProps, EmptyState } from './molecules/Empty';
// FilePicker 묶음 — 계약 대상 둘(FileChip · FileDropzone) + 함께 이동한 순수 유틸(formatFileSize).
// ImageUploadField 와 겹치지 않는다: 그 필드는 미리보기를 자기가 소유하는 큰 정사각 드롭존이고,
// 이쪽은 '칩 + 가로 드롭존' 으로 나뉜 조각이라 미리보기를 다른 자리에 그릴 수 있다.
export { FileChip, FileDropzone, formatFileSize } from './molecules/FilePicker';
export type {
  FileChipProps,
  FileChipState,
  FileDropzoneProps,
  FileDropzoneState,
} from './molecules/FilePicker';
export { errorIdOf, FormField, hintIdOf, labelIdOf } from './molecules/FormField';
export type { FormFieldProps, FormFieldState } from './molecules/FormField';
export { ImageGalleryField } from './molecules/ImageGalleryField';
export type { ImageGalleryFieldProps, ImageGalleryFieldState } from './molecules/ImageGalleryField';
// ImageUploadField 묶음 — 계약 대상(ImageUploadField) + 함께 이동한 순수 유틸(imageFileError)
export { ImageUploadField, imageFileError } from './molecules/ImageUploadField';
export type { ImageUploadFieldProps, ImageUploadFieldState } from './molecules/ImageUploadField';
export { LineAreaChart } from './molecules/LineAreaChart';
export type { LineAreaChartProps, LineAreaChartState } from './molecules/LineAreaChart';
export { ListRow } from './molecules/ListRow';
export type { ListRowProps, ListRowState } from './molecules/ListRow';
export { Menu } from './molecules/Menu';
export type { MenuAlign, MenuProps, MenuState, MenuTrigger } from './molecules/Menu';
export { Pagination, rangeTextOf } from './molecules/Pagination';
export type { PaginationProps, PaginationState } from './molecules/Pagination';
export { RadioCardGroup } from './molecules/RadioCardGroup';
export type { RadioCardGroupProps, RadioCardGroupState } from './molecules/RadioCardGroup';
export { PasswordField } from './molecules/PasswordField';
export type { PasswordFieldProps, PasswordFieldState } from './molecules/PasswordField';
// RichTextField 묶음 — 계약 대상(RichTextField) + 함께 내보내는 순수 유틸
// (sanitize/길이/마이그레이션). 호출부가 저장 지점에서 같은 허용목록을 쓰게 하려면
// sanitizeRichText 가 컴포넌트와 같은 문에서 나와야 한다 — imageFileError 선례.
export {
  RichTextField,
  ensureRichText,
  isRichTextEmpty,
  plainToRichText,
  richTextLength,
  sanitizeRichText,
} from './molecules/RichTextField';
export type { RichTextFieldProps, RichTextFieldState } from './molecules/RichTextField';
export { RowActions } from './molecules/RowActions';
export type { RowActionsProps, RowActionsState } from './molecules/RowActions';
export { SearchField } from './molecules/SearchField';
export type { SearchFieldProps, SearchFieldState } from './molecules/SearchField';
export { SelectionBar } from './molecules/SelectionBar';
export type { SelectionBarProps, SelectionBarState } from './molecules/SelectionBar';
// TableSelection 묶음 — 계약 대상(RowSelectCell·SelectAllHeaderCell) + 함께 이동하는 표 조각/유틸
export {
  RowSelectCell,
  SelectAllHeaderCell,
  SeqCell,
  SeqHeaderCell,
  tableSelectionState,
} from './molecules/TableSelection';
export type {
  RowSelectCellProps,
  RowSelectCellState,
  SelectAllHeaderCellProps,
  SelectAllHeaderCellState,
  TableSelectionState,
} from './molecules/TableSelection';
// TableReorder 묶음 — 계약 비대상 순수 훅/유틸 + 표 조각
export {
  moveArrayItem,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  useReorderableRows,
} from './molecules/TableReorder';
export { SegmentedControl } from './molecules/SegmentedControl';
export type {
  SegmentedControlProps,
  SegmentedControlSize,
  SegmentedControlState,
} from './molecules/SegmentedControl';
export { Stepper } from './molecules/Stepper';
export type { StepperProps, StepperState } from './molecules/Stepper';
export { Tabs, tabId, tabPanelId } from './molecules/Tabs';
export type { TabsProps, TabsState } from './molecules/Tabs';
export { TextareaField } from './molecules/TextareaField';
export type { TextareaFieldProps, TextareaFieldState } from './molecules/TextareaField';
export { Timeline } from './molecules/Timeline';
export type { TimelineEvent, TimelineProps, TimelineState } from './molecules/Timeline';
export { Toast } from './molecules/Toast';
export type { ToastKind, ToastProps, ToastState } from './molecules/Toast';

// --- Organisms ---
export { ConfirmDialog } from './organisms/ConfirmDialog';
export type {
  ConfirmDialogIntent,
  ConfirmDialogProps,
  ConfirmDialogState,
} from './organisms/ConfirmDialog';
export { ListCard } from './organisms/ListCard';
export type { ListCardProps, ListCardState } from './organisms/ListCard';
export { Modal } from './organisms/Modal';
export type { ModalProps, ModalState } from './organisms/Modal';
export { StatsCard } from './organisms/StatsCard';
export type { StatsCardProps, StatsCardState } from './organisms/StatsCard';
export { TodoCard } from './organisms/TodoCard';
export type { TodoCardProps, TodoCardState } from './organisms/TodoCard';
// 앱 셸 크롬 — 시각·상호작용만 소유한다. 라우트·권한·활성 판정은 앱에 남는다(각 계약 description 참조)
export { Header } from './organisms/Header';
export type { HeaderProps, HeaderState } from './organisms/Header';
export { Sidebar } from './organisms/Sidebar';
export type { SidebarProps, SidebarState } from './organisms/Sidebar';
// 곁 영역 껍데기 — 안에 무엇이 들어오는지 모른다 (필터 축·역할 목록·폼 섹션 내비게이션 전부)
export { Panel } from './molecules/Panel';
export type { PanelProps, PanelState } from './molecules/Panel';
// 상호작용 목록 표 — 권한·선택·행 모델은 앱에 남는다 (DataTable 은 정적 수치 표라 별개다)
export { Table } from './organisms/Table';
export type { TableProps, TableSortDirection, TableState } from './organisms/Table';
// 화면을 그리지 못했을 때 그 자리를 채우는 상태 — 문구·참조 코드·빠져나갈 곳은 앱이 정한다
export { Result } from './molecules/Result';
export type { ResultProps, ResultState } from './molecules/Result';
