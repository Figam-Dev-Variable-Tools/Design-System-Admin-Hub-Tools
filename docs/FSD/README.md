# 프로젝트 문서 작성 가이드

이 문서는 **처음 오는 사람**을 위한 것이다. 무엇을 만드는 프로젝트이고, 어떤 문서가 어디에 있으며,
기능 명세서와 비기능 명세서를 어디서 찾고 어떻게 쓰는지를 한자리에 모았다.

---

## 1. 프로젝트 개요

**TDS Admin Hub** — 홈페이지를 운영하는 회사가 쓰는 **관리자(admin) 웹 애플리케이션**이다.
회원·콘텐츠·기업 정보·상품·주문·프로그램(후원형 펀딩)·영업·고객센터·마케팅·통계·로그·시스템 설정을
한 화면 체계 안에서 다룬다.

| 항목 | 내용 |
|---|---|
| 대상 사용자 | 사이트 운영자 · 영업 담당자 · 고객센터 상담원 · 최상위 관리자 |
| 화면 수 | 사이드바 메뉴(잎) **74** · 상세/등록·수정/보조 목록 **51** · 로그인 **1** = 라우트 화면 **126개**. 여기에 탭 9 · 팝업 19 를 더해 **기능 명세서 대상은 154건**이다 |
| 앱 구성 | 워크스페이스에 앱은 `apps/admin` **하나**다. 고객이 보는 홈페이지는 이 리포 **밖**에 있다 |
| 백엔드 | 아직 없다. 화면은 픽스처(고정 데이터)로 돌고, 서버가 맡을 일은 각 명세의 API 절이 계약으로 적는다 |

**고객 홈페이지가 이 리포에 없다는 사실이 명세에 미치는 영향**은
[`../reference/user-view.md`](../reference/user-view.md) 와
[`../reference/site-connect-contract.md`](../reference/site-connect-contract.md) 가 다룬다.

---

## 2. 주요 기술 스택

| 층 | 무엇을 쓰는가 |
|---|---|
| 언어·빌드 | TypeScript · Vite · pnpm 워크스페이스 · Turbo |
| UI | React 18 · react-router-dom 6 |
| 디자인 시스템 | `@tds/ui` (사내 패키지) — 모든 화면 UI 는 여기서 온다. 페이지가 컴포넌트를 손수 조립하지 않는다 |
| 스타일 | 디자인 토큰(`var(--tds-*)`) 전용. 색상 hex·px 직접 입력 금지 |
| 서버 상태 | TanStack Query v5 |
| 클라이언트 상태 | Zustand · URL 쿼리스트링(목록 필터·페이지·탭) |
| 폼·검증 | React Hook Form + Zod |
| 표·차트 | TanStack Table · Recharts |
| 테스트 | Vitest(단위·렌더) · Playwright(E2E) · Storybook play function |
| 문서 | Storybook(디자인 시스템) · Mermaid(플로우) · OpenAPI(`openapi/openapi.yaml`) |

---

## 3. 프로젝트 구성 및 주요 문서

| 문서 | 무엇을 담는가 | 위치 |
|---|---|---|
| **Flow Chart** | 화면 흐름도. 메뉴별 플로우 74건 + 전체 플로우 | [`../flow/`](../flow/) — `admin-flowchart.html` · `html/menus/*.html` · 원본 `mmd/` |
| **IA (정보 구조)** | 메뉴 트리와 화면 계층 | [`../plan/ia/admin-ia.html`](../plan/ia/admin-ia.html) |
| **Storybook** | 디자인 시스템 컴포넌트 카탈로그 + 어드민 화면 템플릿 복제 | `pnpm sb` (로컬 6006) · 원본 `packages/ui/src/**` · `packages/ui/pages/**` |
| **Admin 화면** | 실제 구현 | `apps/admin/src/pages/**` · 라우트 정의는 `apps/admin/src/App.tsx` · 메뉴 정의는 `apps/admin/src/shared/layout/nav-config.ts` |
| **Design System** | 토큰·컴포넌트 계약 | `packages/ui/` · 계약 `contracts/*.contract.json` |
| **API 문서** | 엔드포인트 스키마 | `openapi/openapi.yaml` — ⚠ **지금 워킹트리에서 삭제된 상태다**(`git ls-files` 에는 있다). 이 파일을 참조하기 전에 살아 있는지 확인한다. `pnpm openapi:types` 도 이 경로를 쓴다 |
| **컴포넌트 계약** | DS 컴포넌트의 states·events 계약 | `contracts/*.contract.json` |
| **품질 기준** | 9차원 102요구사항. 모든 배치의 acceptance 기준 | [`../reference/quality-bar.md`](../reference/quality-bar.md) |
| **ADR** | 아키텍처 결정 기록 (이력이 곧 가치라 재작성 대상이 아니다) | [`../adr/`](../adr/) |

**화면 전수 목록은 [`inventory.md`](inventory.md) 가 정본이다.** 코드(`nav-config.ts` · `App.tsx`)에서 직접 뽑았고,
어느 화면이 어느 파일에 있는지까지 달려 있다. 명세를 쓰기 시작하는 사람은 **거기서 출발한다.**

---

## 4. 기능 명세서 (FSD) 위치

```
docs/FSD/
  README.md          ← 지금 이 문서
  inventory.md       ← 전수 인벤토리 (정본)
  id-convention.md   ← 화면 ID · 폴더 · 파일 이름 규칙
  plan.md            ← 작성 묶음과 순서
  _template.md       ← 기능 명세서 템플릿 (10절)
  _common/           ← 여러 화면이 공유하는 팝업·다이얼로그·토스트
  <폴더>/<잎>/…       ← 화면별 기능 명세서
```

**구성은 `폴더 > 페이지(목록) > 페이지(등록) > 팝업(토스트, 모달)` 계층을 그대로 따른다.**
폴더는 사이드바 최상위 항목 15개(+로그인)이고, 그 밑에 잎 하나가 디렉터리 하나다.

| 화면 | 파일 | 화면 ID |
|---|---|---|
| 회원 관리 목록 (`/users/members`) | `docs/FSD/users/members/index.md` | `SCR-USERS-MEMBERS` |
| 회원 상세 (`/users/members/:id`) | `docs/FSD/users/members/detail.md` | `SCR-USERS-MEMBERS-DETAIL` |
| 운영자 등록·수정 (`/users/admins/new` · `/:id/edit`) | `docs/FSD/users/admins/form.md` | `SCR-USERS-ADMINS-FORM` |
| 회원 그룹 만들기 팝업 | `docs/FSD/users/members/pop-create-group.md` | `POP-USERS-MEMBERS-CREATE-GROUP` |
| 플랜 결제 탭 (`/settings/plan?tab=billing`) | `docs/FSD/settings/plan/tab-billing.md` | `TAB-SETTINGS-PLAN-BILLING` |

**작성 규칙**

- [`_template.md`](_template.md) 를 복사해서 쓴다. **절 이름과 순서를 바꾸지 않는다.**
- 화면 ID·파일 이름은 [`id-convention.md`](id-convention.md) 가 정한 규칙으로 만든다.
- **기획자 관점 · UI 중심 · 표 형식 우선.** 기능마다 성공·실패·예외를 반드시 적는다.
- **API 는 호출 목적과 연계 여부만** 적는다. 구현 로직·DB 설계·SQL·알고리즘은 적지 않는다.
- 개발자와 QA 가 **같은 기준으로** 구현하고 테스트할 수 있을 만큼 상세해야 한다.
- **팝업은 별도 문서**, **확인 다이얼로그와 안내 토스트는 부모 문서의 절**이다 —
  판정 근거는 [`id-convention.md`](id-convention.md) §5 에 있다.
- 여러 화면이 공유하는 것은 `_common/` 에 **한 번** 적고 참조한다. 화면마다 반복해 적지 않는다.

**작성 시점** — [`plan.md`](plan.md) §1. 사용자 문구 정리가 끝난 뒤에 시작한다.

---

## 5. 비기능 명세서 (NFRS) 위치

```
docs/NFRS/
  README.md      ← 작성 단위와 규칙
  _template.md   ← 비기능 명세서 템플릿 (8절)
  <메뉴 경로>.md  ← 자원별 비기능 명세서
```

비기능 명세서는 **성능 · 사용성 · 보안 · 안정성 · 호환성 · 운영성 · 유지보수성 · 제약사항** 8개 절을 갖는다.
작성 단위는 **화면이 아니라 자원(사이드바 잎)** 이다 — 목록·상세·폼이 같은 성능 특성과 같은 권한 축을 공유하기 때문이다.
자세한 것은 [`../NFRS/README.md`](../NFRS/README.md) 를 본다.
