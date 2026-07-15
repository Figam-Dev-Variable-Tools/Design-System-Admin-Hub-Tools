# shared/ui — 공통 UI 모듈

**이 폴더는 공통 모듈이다.** 관리자 앱의 어느 화면에서든 쓰이는 UI 프리미티브가 여기 산다.

이 폴더가 생긴 이유: `Modal`·`ConfirmDialog`·`Button`·`Card`·`Alert`·`Pagination`·`HelpTip` 이
`pages/members/components/` 안에 살고 있었고, 운영자·권한·고객 설정 화면이 **회원 화면을 가로질러**
import 하고 있었다. 회원 관리를 지우면 다른 화면이 전부 깨지는 구조였다. 그래서 옮겼다.

---

## 규칙 (지키지 않으면 리뷰에서 되돌린다)

1. **2개 이상의 페이지가 쓰는 UI 는 전부 여기 산다.**
   한 페이지에서만 쓰는 컴포넌트(`MembersTable`, `TierFilter`, `PermissionMatrixTable` …)는
   그 페이지에 남긴다. 여기는 프리미티브만 둔다.

2. **페이지는 다른 페이지의 컴포넌트를 import 하지 않는다.**
   운영자 화면이 회원 화면의 `Card` 를 가져다 쓰는 일은 없다. 필요하면 **여기로 승격시킨다.**
   (검증: `pages/**` 안에서 다른 페이지 폴더를 가리키는 상대 경로 import 는 0건이어야 한다.)

3. **페이지는 배럴(`index.ts`)에서만 import 한다.**
   ```ts
   import { Button, Card, ConfirmDialog, useToast } from '../../shared/ui'; // ✅
   import { Button } from '../../shared/ui/Button';                          // ❌ 개별 파일 직접 import
   ```

4. **여기 있는 컴포넌트는 도메인 로직을 모른다.**
   회원·운영자·권한·등급을 알면 안 된다. **값과 콜백만 받는다.**
   `ConfirmDialog` 는 "무엇을 삭제하는지" 모른다 — `intent="delete"` 와 문구만 받는다.

5. **스타일은 토큰만.** 하드코딩 색상(hex/rgb)·px 리터럴 0건, `var(--tds-*)` 만 쓴다.
   React 인라인 스타일에서 단축 속성(`padding`)과 개별 속성(`paddingLeft`)을 **섞지 않는다** —
   객체 병합이 깨져 값이 사라진다.

6. **CSS 클래스 이름은 `tds-ui-*` 다.** (`ui.css`)
   페이지 전용 상태 클래스는 그 페이지의 CSS 가 `tds-mem-*`, `tds-perm-*` 처럼 자기 접두사로 갖는다.

7. 여기 있는 컴포넌트는 다음 단계에서 **계약(G3) → `packages/ui` Storybook 모듈로 승격될 후보**다.
   그래서 props 시그니처를 표준 HTML 요소에 최대한 맞춰 둔다 (`Button` 이 `ButtonHTMLAttributes` 를
   확장하는 이유). 승격되면 이 폴더의 파일은 사라지고 `import { Button } from '@tds/ui'` 로 바뀐다.

---

## 파일

| 파일 | 무엇 |
|---|---|
| `index.ts` | 배럴. 페이지는 여기서만 import 한다. `ui.css` 도 여기서 로드된다 |
| `Button.tsx` | primary / secondary / ghost / danger |
| `Card.tsx` | `Card` + `CardTitle` (제목 우측에 액션 슬롯) |
| `Alert.tsx` | 인라인 피드백 배너 (success/danger/warning/info) |
| `Modal.tsx` | 모든 모달의 껍데기 — 포커스 트랩·Esc·딤·`aria-modal`·스크롤 잠금·포커스 복귀 |
| `ConfirmDialog.tsx` | 의도(intent) 기반 확인 다이얼로그. `Modal` 조립 |
| `Toast.tsx` | 토스트 1건 (아이콘·문구·다시 시도·닫기) |
| `ToastProvider.tsx` | 토스트 큐 + `useToast()` |
| `useUnsavedChangesDialog.tsx` | 미저장 이탈 가드 (`intent="discard"` 다이얼로그) |
| `Pagination.tsx` | 이전 / 번호(최대 5) / 다음 |
| `HelpTip.tsx` | ⓘ disclosure 도움말 (hover 툴팁 아님 — 키보드로 열린다) |
| `TriStateCheckbox.tsx` | on / off / mixed (indeterminate) |
| `StatusBadge.tsx` | **콘텐츠 공통** — 상태 pill(tone + label). 도메인 상태(게시/임시저장/ON·OFF/노출/시행중…)를 색으로 이중 전달한다. 소비자: 공지·FAQ·팝업·배너·약관 목록(5). 도메인을 모른다 — `tone`(색 의도)만 받고 '무엇의 상태'인지 모른다 |
| `FormField.tsx` | **콘텐츠 공통** — 라벨(+필수/도움말) · 컨트롤 슬롯 · 우측 카운터 · 인라인 오류 · 힌트 골격. 소비자: 공지·FAQ·팝업·배너·약관·개인정보 폼(6). 컨트롤은 호출부가 넣는다 |
| `TextareaField.tsx` | **콘텐츠 공통** — 제어 textarea + 글자수 카운터. 리치 텍스트는 도입하지 않는다(라이브러리·ADR 사안 — 파일 상단 TODO). 소비자: 공지 본문·FAQ 답변·약관 조문·개인정보 처리방침(4) |
| `SearchField.tsx` | **콘텐츠 공통** — 돋보기 겹친 검색 입력. `MembersToolbar`·`LoginHistoryToolbar` 에 두 벌 복사돼 있던 패턴을 콘텐츠 목록(공지·FAQ)이 세·네 번째 소비자가 되며 올렸다 |
| `ImageUrlField.tsx` | **콘텐츠 공통** — 이미지 URL 입력 + `<img>` 미리보기. 업로드 없음(URL만 — TODO(backend): POST /api/uploads). 소비자: 팝업·배너(2) |
| `DateRangeField.tsx` | **콘텐츠 공통** — 노출 기간(시작~종료) 날짜 입력 쌍. 종료≥시작 규칙은 호출부 zod 스키마가 판정해 error 로 내려준다. 소비자: 팝업·배너(2) |
| `RowActions.tsx` | **콘텐츠 공통** — 행 끝 인라인 액션(수정 연필 + 삭제 휴지통). 삭제는 호출부가 ConfirmDialog 로 확인한다. 소비자: 공지·FAQ·팝업·배너·약관 목록(5) |
| `VersionHistoryTable.tsx` | **콘텐츠 공통** — 버전 이력 표(버전·시행일·상태·'현재' 표식·수정/삭제). 약관과 개인정보 처리방침이 같은 '버전 이력 + 현재 시행본' 구조를 쓴다. 도메인을 모른다 — 이미 만들어진 `VersionRow`(tone/label 포함)만 받는다. 소비자: 약관·개인정보(2) |
| `icons.tsx` | 여러 페이지가 쓰는 아이콘만 |
| ↳ `DownloadIcon` | **승격됨** — `pages/members/icons.tsx` 에 있던 것을 올렸다. 로그인 이력(`/users/login-history`)이 같은 내보내기 버튼을 갖게 되어 소비자가 2개가 됐다. 그대로 뒀다면 로그인 이력이 회원 화면을 가로질러 import 해야 했다(규칙 2 위반 · A83 축1 blocker). 회원 화면에서만 쓰는 `MoreHorizontalIcon`·`ArrowLeftIcon` 은 승격하지 않았다 — 소비자가 하나다(규칙 1) |
| `styles.ts` | 공통 스타일 토큰 조합 (`buttonStyle`, `tableStyle`, `controlStyle` …) |
| ↳ `filterHeadingStyle` · `filterListStyle` · `filterItemStyle` | **승격됨** — 좌측 필터 패널의 제목/목록/선택항목. `TierFilter`(등급) · `GroupFilter`(그룹) · `AdminGroupPanel`(운영진) · `RolePanel`(역할) 에 **네 벌이 글자 하나 다르지 않게 복사돼** 있었다(A83 축3 중복). 로그인 이력의 필터(결과·계정 유형·기간)가 다섯 번째 소비자가 되는 자리에서 다섯 벌로 늘리는 대신 올렸다. 도메인을 모른다 — **`active` 불리언 하나만 받는다**(규칙 4). 이제 선택 강조를 바꾸면 다섯 화면이 함께 바뀐다 |
| `ui.css` | 인라인 style 로 표현 불가한 것 (`:hover`, `:focus-visible`, `::placeholder`, `@keyframes`) |

---

## ConfirmDialog — 의도가 톤을 정한다

호출부가 색과 라벨을 매번 고르면 같은 '삭제'가 화면마다 다른 색이 된다. 그래서 **의도만 받는다.**

| `intent` | 용도 | 기본 확인 라벨 | 톤 | 아이콘 |
|---|---|---|---|---|
| `create` | 생성 확인 | `만들기` | primary | ⊕ |
| `update` | 수정/저장 확인 | `저장` | primary | ✎ |
| `delete` | 삭제 확인 | `삭제` | **danger** | 🗑 |
| `discard` | 저장하지 않은 변경을 버리고 이탈 | `나가기` | **danger** | ⚠ |

- `confirmLabel` 로 라벨만 덮어쓸 수 있다 (`'회원 삭제'`). **톤은 덮어쓸 수 없다** — 그게 요점이다.
- `busy` 중에는 확인 버튼이 로딩('처리 중…')이 되고 잠긴다(중복 클릭 차단).
  **취소는 잠기지 않는다** — 취소/Esc/딤 클릭이 곧 진행 중 요청의 abort 경로이기 때문이다.
- `error` 를 주면 실패가 **다이얼로그 안** danger 배너로 뜨고 확인 버튼이 되살아난다.
  재클릭이 곧 재시도다. (모달이 떠 있는 동안 토스트는 시선 밖이라 여기서는 토스트를 쓰지 않는다.)
- 취소하면 `ConfirmDialog` 가 **취소 토스트**를 띄운다. 성공/실패 토스트는 결과를 아는 **호출부**가 띄운다.
  '작업'이라 부르기 어색한 자리(폼 모달 닫기, 이탈 가드의 '머무르기')는 `suppressCancelToast` 로 끈다.

---

## 토스트 vs 인라인 — 무엇을 어디에 띄우는가

> 기준 한 줄: **사라져도 되는가?**
> 사용자가 그걸 보고 *할 일이 남는다면* 인라인이다. 토스트는 사라진다.

### 토스트 (`useToast()`)

사용자가 **방금 명시적으로 시작한 쓰기 작업의 결과**.

- 삭제·저장·생성·발송·내보내기의 성공 → `toast.success()` (4초 후 자동 소멸)
- 그 작업의 실패 → `toast.error(문구, { retry })` — **자동으로 사라지지 않는다.**
  복구 경로를 토스트가 직접 들고 있으므로(다시 시도) 사라져도 길을 잃지 않는다.
- 확인 다이얼로그의 취소 → `toast.cancelled()` (2초 후 자동 소멸)

위치는 화면 **정중앙 하단**. 최대 3개까지 위로 쌓이고(최근 것이 아래), 넘치면 오래된 것부터 사라진다.

### 인라인 (`Alert` · 필드 에러)

- **폼 안의 필드 에러** — 고치려면 그 입력 옆에 문구가 붙어 있어야 한다.
  토스트로 띄우면 사라진 뒤 어느 칸이 틀렸는지 알 수 없다.
- **조회 실패** — 목록/상세를 못 불러온 화면 전체 에러. 화면이 비어 있고 사용자가 할 일은
  '다시 시도' 하나뿐이다. 토스트가 사라지면 빈 화면만 남는다.
- **지속 안내** — 임시저장 복원 안내, 상단 공지처럼 사용자가 결정할 때까지 남아야 하는 것.
- **다이얼로그 안의 실패** — 모달이 떠 있는 동안 토스트는 시선 밖이다. `ConfirmDialog` 의 `error` 를 쓴다.
