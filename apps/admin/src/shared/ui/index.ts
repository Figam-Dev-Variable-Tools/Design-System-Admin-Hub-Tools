// 공통 UI 모듈 배럴
//
// **페이지는 반드시 여기서만 import 한다.**
//   허용: import { Button, Card, useToast } from '../../shared/ui';
//   금지: import { Button } from '../../shared/ui/Button';   ← 개별 파일 직접 import
//   금지: import { Button } from '../members/components/Button'; ← 다른 페이지에서 가져오기
//
// 규칙과 배경은 ./README.md 를 읽는다.
//
// [예외 — 이미 승격된 DS 컴포넌트는 '@tds/ui' 에서 직접 가져온다]
// 위 규칙이 지키려는 것은 '페이지가 다른 페이지/개별 파일을 가로질러 import 하지 않는다' 이다.
// @tds/ui 는 그 어느 쪽도 아니다 — 별도 패키지의 **public entry** 이고, eslint-plugin-boundaries 가
// 내부 경로 직접 import 를 이미 막는다. 그래서 승격이 끝난 컴포넌트는 배럴을 한 번 더 거치지 않는다
// (README 규칙 7: "승격되면 이 폴더의 파일은 사라지고 `import { Button } from '@tds/ui'` 로 바뀐다").
// 실제 관례도 그렇다: Tabs · SegmentedControl · DataTable · Empty · StatsCard · LineAreaChart 는
// 각 페이지가 '@tds/ui' 에서 직접 가져간다.
//
// 아래 남아 있는 DS 재수출(Alert · Button · Modal … )은 **호출부가 20여 곳이라 한꺼번에 갈아끼우지
// 않으려고 남긴 과도기 표면**이다 — 새로 승격되는 것은 여기에 더하지 않는다.

// 공통 클래스(hover/focus-visible/skeleton/toast) — 배럴을 쓰는 페이지가 자동으로 함께 로드한다
import './ui.css';

// [공개 표면은 실제로 쓰이는 것만] 각 컴포넌트의 Props 타입은 **아무도 import 하지 않는다** —
// 배럴에서 재수출하면 쓰이지도 않는 공개 API 가 되고, 지울 때 파급 범위를 알 수 없게 된다.
// 그래서 Props 타입은 각 파일의 지역 타입으로 되돌렸다 (클린코드 점검 축5 죽은 코드).
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
  Empty,
  errorIdOf,
  /**
   * 폼 줄바꿈 규약 — **입력 칸은 한 줄에 하나**, 예외는 날짜 쌍(formDateRowStyle)뿐이다.
   *
   * 예전에는 화면마다 `repeat(auto-fit, minmax(calc(space.6 * N), 1fr))` 을 손으로 적었고 N 이
   * 3·4·5·6·7·8 로 갈려 같은 폭에서도 화면마다 칸 수가 달랐다. 정의는 DS 한 곳뿐이다
   * (packages/ui/src/foundations/FormLayout/index.ts).
   */
  formDateRowStyle,
  formRowStyle,
  FormField,
  HelpTip,
  hintIdOf,
  Icon,
  ImageThumb,
  /**
   * 글자 + 배지가 나란히 서는 한 줄 (카드 제목 옆 · 표 셀 안 · dd 안).
   *
   * 감싸지 않으면 '…오지 않아요높음' 처럼 배지가 낱말에 붙어 읽힌다. 예전엔 화면마다
   * titleGroupStyle · cellRowStyle · keywordCellStyle 이라는 이름으로 사본이 흩어져 있었고,
   * 사본을 만들지 않은 화면이 정확히 그 증상을 갖고 있었다. 정의는 DS 한 곳뿐이다
   * (packages/ui/src/foundations/FormLayout/index.ts) — Templates 스토리도 같은 객체를 읽는다.
   */
  inlineBadgeRowStyle,
  moveArrayItem,
  Pagination,
  rangeTextOf,
  ReorderGripCell,
  ReorderGripHeaderCell,
  ReorderMoveButtons,
  RichTextField,
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

/* ── 타사 브랜드 마크 ──────────────────────────────────────────────────────
 *
 * 디자인 시스템 아이콘이 **아니다** — 각 사 가이드가 고정한 색을 그대로 든 타사 자산이라
 * @tds/ui Icon(currentColor 계약)에 들어갈 수 없다. 그런데도 shared/ui 에 있는 이유는
 * 소셜 로그인 설정(/settings/oauth)과 연동 마켓스토어(/settings/api-keys)가 **같은 마크**를
 * 필요로 하고, 화면마다 복제하면 언젠가 한쪽만 교체되어 갈라지기 때문이다 (./brand-marks.tsx 머리말). */
export { BrandMark, BRAND_MARK_IDS, isBrandMarkId } from './brand-marks';
export type { BrandMarkId } from './brand-marks';

export { Card, CardTitle } from './Card';

/**
 * 표 로딩 자리표시 행. 회색 블록 한 장은 @tds/ui 의 Skeleton 이 소유하고,
 * 이 파일은 그것을 표의 R×C 로 배치하는 앱 쪽 껍데기다 (근거는 ./SkeletonRows.tsx 머리말).
 *
 * 예전엔 표 9곳이 같은 함수를 각자 로컬로 정의했다 — 시그니처만 셋으로 갈리고 본문은 동일했다.
 */
export { SkeletonRows } from './SkeletonRows';

export { ConfirmDialog } from './ConfirmDialog';

/* FileChip · FileDropzone · formatFileSize 는 **@tds/ui 의 것**이다 (File 승격 · 계약 2건:
 * FileChip · FileDropzone). 예전엔 shared/ui/FilePicker.tsx 사본 — 삭제됐다. 호출부(AssetField)는
 * '@tds/ui' 에서 직접 가져간다: 승격된 DS 컴포넌트는 배럴을 거치지 않는다는 것이 이 앱의 관례다
 * (Tabs·SegmentedControl·DataTable·Empty 선례 · README 규칙 7). */

/* RadioCardGroup 은 **@tds/ui 의 것**이다 (molecule 승격). 예전엔 shared/ui 사본 — 삭제됐다.
 * 제네릭(RadioCardOption<T>)은 계약에서 사라졌다 — DS 는 도메인을 모르므로 value 가 string 이고,
 * 좁힌 유니온으로 되돌리는 일은 호출부가 옵션 목록에서 되찾아 한다 (SegmentedControl 선례 · ADR-0003). */

/**
 * 좌측 분류 필터 패널 (ESG·알림 관리가 공유). 도메인은 options/counts 로 주입한다 —
 * 예전엔 두 화면이 같은 골격을 각자 복제해 aria 표기가 갈라져 있었다 (A11Y-12).
 */
export { FilterPanel, FilterRail } from './FilterPanel';
export type { FilterOption } from './FilterPanel';

/**
 * 긴 **폼**의 좌측 레일 내용물 (구획 내비게이션 + 본문 앵커 + 활성 구획 추적).
 *
 * FilterRail(껍데기)은 목록 화면과 공유하지만 내용물은 다르다 — 폼에는 좁힐 컬렉션이 없다.
 * 그래서 상태 표기도 반대다: 필터는 aria-pressed, 이쪽은 **aria-current** (A11Y-12).
 */
export {
  FormSectionAnchor,
  FormSectionNav,
  scrollToSection,
  useActiveSection,
} from './FormSectionNav';
export type { FormSectionItem } from './FormSectionNav';

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

/* RichTextField 는 TextareaField 의 형제다 — 평문이 아니라 **sanitize 된 HTML** 을 value 로 받는다
 * (서식이 필요한 본문: 상품 상세설명). value/onChange(string) 계약이 같아 필드만 갈아끼우면 된다.
 * 함께 나오는 순수 유틸(sanitizeRichText·richTextLength·ensureRichText)은 컴포넌트가 아니라
 * 저장·검증 경로가 쓰는 것이라 이 배럴에 재노출하지 않는다 — 필요한 곳이 '@tds/ui' 에서 직접
 * 가져간다(validation.ts·types.ts). 죽은 공개 표면 0 — imageFileError 와 같은 판단이다. */

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
/**
 * 폼을 담은 **모달**의 이탈 가드 (FEEDBACK-06). 페이지 폼은 useUnsavedChangesDialog 를 쓴다 —
 * 둘은 막는 경로가 다르다(모달: Esc·딤·×·취소 / 페이지: unload·링크·뒤로가기).
 */
export { useModalDirtyGuard } from './useModalDirtyGuard';

/* ── 아이콘 ────────────────────────────────────────────────────────────────
 * UI 프리미티브 아이콘 11종은 @tds/ui 의 Icon(contracts/Icon.contract.json)으로 승격됐다 —
 * 개별 컴포넌트 대신 `<Icon name="trash" />` 로 쓰고, 여기서는 DS 재수출만 한다(죽은 코드 0).
 * 사이드바 내비 아이콘은 여전히 shared/icons.tsx 소유다 — 글리프가 다르므로 합치지 않았다. */

/* ── 스타일 토큰 조합 ────────────────────────────────────────────────────── */
export {
  alertActionRowStyle,
  badgeStyle,
  buttonStyle,
  checkboxStyle,
  countBadgeStyle,
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
  hintStyle,
  mutedTextStyle,
  numericCellStyle,
  pageTitleStyle,
  tableStyle,
  tdStyle,
  thStyle,
  visuallyHiddenStyle,
} from './styles';

// [지워진 재수출 ②] cardBodyStyle · cardTitleStyle · filterPanelStyle 도 배럴 밖 소비자가 0이다 —
// 셋은 shared/ui 안의 Card.tsx · FilterPanel.tsx 가 './styles' 에서 **직접** 가져다 쓰는 내부 표면이다.
// 배럴에 남겨 두면 쓰이지 않는 공개 API 가 되고, 지울 때 파급 범위를 알 수 없게 된다(머리말 규칙).
//
// [지워진 재수출] feedbackStyle · FeedbackTone · ButtonVariant 는 배럴 밖 소비자가 없어졌다.
// 배너(Alert)와 버튼(Button)이 @tds/ui 로 넘어가면서, 이 셋은 Toast 가 './styles' 에서 직접 쓰는
// 내부 표면으로 남는다. 쓰지 않는 것을 공개하지 않는다 (클린코드 점검 축5 죽은 코드 0 유지).
