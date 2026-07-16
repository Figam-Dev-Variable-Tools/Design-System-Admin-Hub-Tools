// 앱은 반드시 이 entry로만 import (@tds/ui). 내부 경로 직접 import는 eslint-plugin-boundaries + G6 체크리스트가 차단.
// 계약(contracts/*.contract.json) 15종의 구현이 여기서 re-export될 때만 public API가 된다.
// Props 타입은 전부 codegen 산출물(generated/types/*)이 원천이다 — 수동 타입 선언 금지 (G6).

// --- Atoms ---
export { Alert } from './atoms/Alert';
export type { AlertProps, AlertState, AlertTone } from './atoms/Alert';
export { Badge } from './atoms/Badge';
export type { BadgeProps, BadgeState, BadgeTone } from './atoms/Badge';
export { Button } from './atoms/Button';
export type { ButtonProps, ButtonSize, ButtonState, ButtonVariant } from './atoms/Button';
export { Card } from './atoms/Card';
export type { CardPadding, CardProps, CardState } from './atoms/Card';
export { Checkbox } from './atoms/Checkbox';
export type { CheckboxProps, CheckboxState } from './atoms/Checkbox';
export { HelpTip } from './atoms/HelpTip';
export type { HelpTipProps, HelpTipState } from './atoms/HelpTip';
export { ImageThumb } from './atoms/ImageThumb';
export type { ImageThumbProps, ImageThumbState } from './atoms/ImageThumb';
export { SelectField } from './atoms/SelectField';
export type { SelectFieldProps, SelectFieldState } from './atoms/SelectField';
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
export { errorIdOf, FormField, hintIdOf } from './molecules/FormField';
export type { FormFieldProps, FormFieldState } from './molecules/FormField';
export { LineAreaChart } from './molecules/LineAreaChart';
export type { LineAreaChartProps, LineAreaChartState } from './molecules/LineAreaChart';
export { ListRow } from './molecules/ListRow';
export type { ListRowProps, ListRowState } from './molecules/ListRow';
export { Pagination } from './molecules/Pagination';
export type { PaginationProps, PaginationState } from './molecules/Pagination';
export { PasswordField } from './molecules/PasswordField';
export type { PasswordFieldProps, PasswordFieldState } from './molecules/PasswordField';
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
export { Tabs, tabId, tabPanelId } from './molecules/Tabs';
export type { TabsProps, TabsState } from './molecules/Tabs';
export { TextareaField } from './molecules/TextareaField';
export type { TextareaFieldProps, TextareaFieldState } from './molecules/TextareaField';

// --- Organisms ---
export { ListCard } from './organisms/ListCard';
export type { ListCardProps, ListCardState } from './organisms/ListCard';
export { StatsCard } from './organisms/StatsCard';
export type { StatsCardProps, StatsCardState } from './organisms/StatsCard';
export { TodoCard } from './organisms/TodoCard';
export type { TodoCardProps, TodoCardState } from './organisms/TodoCard';
