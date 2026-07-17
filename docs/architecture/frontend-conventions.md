# 프론트엔드 작업 규약

> 담당: 아키텍처 · 강제: 린트·포맷(ESLint/Prettier) · 측정: 클린코드 점검 · 승인: 코드 리뷰(G6)
>
> **프론트 구현(중급) · 프론트 리팩터(고급) · 컴포넌트 엔지니어(Storybook) 는 작업 착수 전 이 문서를 읽는다.**
> 여기 적힌 것은 취향이 아니라 **기계가 강제하는 규칙**이다. 어기면 lint 또는 CI 가 막는다.

---

## 0. 한 줄 요약

| 무엇을 | 어떻게 | 어기면 |
|---|---|---|
| 색·치수 | **토큰 CSS 변수만** (`var(--tds-*)`) | ESLint error → 커밋 차단 |
| 컴포넌트 | `@tds/ui` **public entry** 로만 import | ESLint error |
| 페이지 | **다른 페이지를 import 하지 않는다** | 클린코드 점검 blocker → PR 차단 |
| 공통 모듈 | **도메인을 모른다** (회원/권한 타입 import 금지) | 클린코드 점검 blocker |
| 포맷 | **Prettier 가 정한다** — 손으로 맞추지 않는다 | `format:check` 실패 |

---

## 1. 절대 방어선 (ESLint `error` — 어떤 프리셋도 이것을 끄지 못한다)

이 4종은 핵심 방어선이다. `// eslint-disable` 로 덮지 않는다 —
규칙이 틀렸다고 판단되면 **규칙을 고친다** (ADR-0002 · ADR-0005 가 확립한 절차).

### 1.1 하드코딩 색상 금지
```tsx
// ✗ ESLint error
const style = { color: '#2563EB' };
const style = { color: 'rgb(37, 99, 235)' };

// ✓
const style = { color: 'var(--tds-color-action-primary-default)' };
```
**왜**: 하드코딩된 색은 다크모드에서 안 바뀌고, Figma 와 어긋나며, 토큰을 고쳐도 안 따라온다.

### 1.2 px 리터럴 금지
```tsx
// ✗ ESLint error
const style = { padding: '16px', gap: '8px' };

// ✓ 토큰, 또는 토큰의 calc 배수
const style = { padding: 'var(--tds-space-4)', gap: 'var(--tds-space-2)' };
const style = { maxWidth: 'calc(var(--tds-space-6) * 20)' };
```
**예외 — 미디어 쿼리**: CSS 스펙상 `@media` 는 `var()` 를 받지 못한다.
그 한 곳만 리터럴을 쓰되, **어느 토큰을 미러링한 것인지 주석으로 남긴다**.
```css
/* 768px = 토큰 breakpoint.md. 미디어 쿼리는 var() 를 받지 못한다(CSS 스펙 제약) */
@media (max-width: 768px) { … }
```

### 1.3 deep import 금지
```tsx
// ✗ ESLint error
import { Button } from '@tds/ui/src/atoms/Button';

// ✓ public entry 만
import { Button } from '@tds/ui';

// ✓ 공개 서브패스는 deep import 가 아니다
import '@tds/ui/tokens.css';
```

### 1.4 레이어 역방향 의존 금지
`atom → molecule → organism` 방향으로만 흐른다. atom 이 organism 을 import 하면 error.

---

## 2. 구조 규칙 (클린코드 점검이 측정 · 위반 시 PR 차단)

### 2.1 페이지는 다른 페이지를 import 하지 않는다 — **blocker**
```tsx
// ✗ pages/admins 가 pages/members 를 가로지른다
import { Button } from '../members/components/Button';

// ✓ 공통 모듈에서
import { Button } from '../../shared/ui';
```
**실제로 일어난 사고**: `members/components` 를 `admins`·`permissions`·`customer-settings` 가
가로질러 import 해 **58건의 결합**이 자랐다. 회원 관리를 지우면 3개 페이지가 함께 죽는 상태였다.
2개 이상의 페이지가 쓰는 UI 는 **전부 `shared/ui` 로 승격**한다.

### 2.2 공통 모듈은 도메인을 모른다 — **blocker**
`shared/ui/**` 와 `packages/ui/src/**` 는 `Member`·`Role`·`MemberTier` 같은 도메인 타입을
import 하면 안 된다. 값과 콜백만 받는다.
```tsx
// ✗ shared/ui/Badge.tsx
import type { MemberTier } from '../domain/member';   // 도메인 누수

// ✓ 도메인을 모르는 prop
export interface BadgeProps { readonly count: number; readonly tone: BadgeTone; }
```
**왜**: 도메인을 아는 컴포넌트는 그 도메인에서만 쓸 수 있다. 공통이 아니다.

### 2.3 그 외 클린코드 점검 측정 축
| 축 | 임계값 |
|---|---|
| 중복 코드 | 30줄 이상 동일 구조 2회 이상 = major |
| 순환 복잡도 | 함수당 15 초과 = major |
| 죽은 코드 | 미사용 export = major |

---

## 3. React 스타일 함정 (실제로 버그를 냈다)

### 3.1 padding 단축 속성과 개별 속성을 섞지 않는다
```tsx
// ✗ React 스타일 병합이 깨져 padding-top/bottom/left 가 빈 값으로 렌더된다
const style = { padding: 'var(--tds-space-3)', paddingRight: 'var(--tds-space-6)' };

// ✓ 개별 속성으로만
const style = {
  paddingTop: 'var(--tds-space-3)',
  paddingBottom: 'var(--tds-space-3)',
  paddingLeft: 'var(--tds-space-3)',
  paddingRight: 'var(--tds-space-6)',
};
```
**실제 사고**: 입력 필드의 세로 패딩이 통째로 사라져 있었다.

### 3.2 훅은 조건부 return 뒤에 오지 않는다
early return 뒤에 `useState` 를 부르면 Rules of Hooks 위반이다. 타입으로 분기를 없애라.

### 3.3 `useEffect` 의 deps 를 속이지 않는다
`react-hooks/exhaustive-deps` 를 끄지 않는다. 매 렌더 새로 생기는 함수는
`useCallback` 으로 고정하거나 `useRef` 에 담는다.

---

## 4. 라이브러리 — 무엇을 쓰고 무엇을 쓰지 않는가

**도입 결정은 의존성 관리의 ADR 이 내린다. 프론트 구현/리팩터가 임의로 추가하지 않는다.**
라이브러리가 필요하면 의존성 관리에 변경 요청을 낸다.

| 목적 | 쓴다 | 손으로 만들지 않는다 |
|---|---|---|
| 서버 상태 (조회·캐시·재시도) | `@tanstack/react-query` | 직접 만든 `useAsyncData` — 대체 후 **지운다** |
| 폼 상태·검증 | `react-hook-form` + `zod` | 손으로 쓴 blur 검증·에러 상태 |
| API 타입 | `openapi-typescript` (스키마 → 타입 **생성**) | 손으로 쓴 응답 타입 |
| 라우팅 | `react-router-dom` | — |

**도입하지 않는 것**: 전역 상태 라이브러리(Redux/Zustand). 지금 전역 상태는 권한 하나뿐이라
Context 로 충분하다 — YAGNI.

**라이브러리로 대체한 수제 코드는 지운다.** 두 벌이 공존하면 다음 사람이 어느 쪽을 쓸지 모른다.

---

## 5. 백엔드 — **절대 조건**

**서버 코드·DB 스키마·실제 HTTP 호출을 만들지 않는다.** 백엔드는 나중에 백엔드 개발자가 만든다.

```
fixtures.ts      더미 데이터 (브라우저 안)
data-source.ts   ← 백엔드가 붙을 자리. 함수 시그니처 = 프론트↔백엔드 계약
                 // TODO(backend): GET /api/members?tier=&keyword=&page=
화면              data-source 하고만 대화한다
```

백엔드가 붙으면 **`data-source.ts` 의 함수 본문만** 실제 호출로 바뀌고, 화면 코드는 한 줄도 안 바뀐다.
`openapi/openapi.yaml` 은 **스키마 문서**이지 서버 구현이 아니다.

---

## 6. 역할 경계 (누가 무엇을 하는가)

| 질문 | 주체 | 하지 않는 것 |
|---|---|---|
| 무엇을 만드는가 (구현) | **프론트 구현** (중급) | 대규모 리팩터 · 의존성 임의 추가 |
| 무엇을 도입하는가 (정책) | **의존성 관리** | 라이브러리 사용 코드 작성 |
| 어떻게 정리·집행하는가 | **프론트 리팩터** (고급) | 동작 변경 · 신규 기능 |
| 얼마나 나쁜가 (측정) | **클린코드 점검** | 코드 수정 |
| 무엇을 모듈로 뽑는가 | **모듈 추출** | 코드 수정 |
| 통과인가 (G6) | **코드 리뷰** | 직접 수정 |

**재는 자와 고치는 자를 분리한다** — 자기 코드를 자기가 재면 기준이 무뎌진다.

---

## 7. 착수 전 체크리스트

- [ ] 이 문서를 읽었다
- [ ] 계약(`contracts/`)이 G3 APPROVED 인가 (컴포넌트 작업이면)
- [ ] 필요한 토큰이 `tokens.json` 에 전부 있는가 — 없으면 토큰 엔지니어에 요청 (임의로 하드코딩하지 않는다)
- [ ] 쓰려는 컴포넌트가 이미 `@tds/ui` 나 `shared/ui` 에 있는가 (`pnpm reuse:check`)
- [ ] 라이브러리가 필요하면 의존성 관리의 ADR 이 있는가

## 8. 완료 전 체크리스트

- [ ] `pnpm --filter @tds/admin exec tsc --noEmit` → 0
- [ ] `pnpm lint` → 0 (방어선 4종 포함)
- [ ] `pnpm format:check` → 통과
- [ ] `pnpm code-quality` → blocker 0
- [ ] `pnpm --filter @tds/admin exec vite build` → 성공
- [ ] 실패 경로에 사용자에게 보이는 안내가 있는가 (조용히 삼키지 않는다)
