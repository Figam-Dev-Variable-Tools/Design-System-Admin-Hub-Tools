<div align="center">

# Design-System-Admin-Hub-Tools

**KR** · [EN](README.en.md) · [JP](README.ja.md) · [CN](README.zh.md)

한국형 **B2C** / **B2C + Company** 서비스의 관리자 화면을 전역으로 덮는 어드민 플랫폼<br />
Contract · Token 단일 원천에서 **React · Storybook · Figma 4자 100% 동기화**

</div>

---

## 배경

한국의 B2C 서비스는 회사가 달라도 어드민의 화면 목록이 거의 같다. 회원과 권한, 상품과 카테고리, 쿠폰·적립금, 리뷰, 교환·반품, 예약·신청, 고객센터 티켓, 마케팅 발송, 공지·FAQ·약관. 여기에 회사 소개 사이트가 붙는 순간(**B2C + Company**) 기업 정보·연혁·인증서·ESG·파트너사·포트폴리오·성공사례, 그리고 거래처·계약·견적·프로젝트 같은 영업 화면이 그대로 따라온다.

문제는 이 화면들이 프로젝트마다 처음부터 다시 만들어진다는 것이다. 같은 목록 테이블을, 같은 필터 바를, 같은 삭제 확인 팝업을 — 매번 조금씩 다르게. 그렇게 만들어진 어드민은 화면 수가 늘어날수록 서로 닮지 않는다.

이 리포지토리는 그 반복을 **한 번** 제대로 만들어 고정한 결과물이다. 한국형 B2C / B2C + Company가 실제로 필요로 하는 관리 화면의 **전역**을 하나의 디자인 시스템 위에서 구현하고, 그 일관성을 사람의 검수가 아니라 **파이프라인과 게이트로** 강제한다.

### 무엇을 덮는가

| 도메인 | 관리 화면 |
| --- | --- |
| **대시보드** | 지표 요약 · 할 일 · 추이 차트 |
| **회원 · 운영** | 회원 / 회원 상세 · 관리자 · 권한(역할) · 고객 설정 · 로그인 이력 |
| **상품** (B2C) | 상품 · 카테고리 · 쿠폰 · 리뷰 · 교환/반품 · 배송 정책 · 적립금 정책 |
| **예약 · 신청** (B2C) | 예약 · 신청서 · 상담 예약 · 일정 캘린더 |
| **고객센터** (B2C) | 티켓 · 문의 유형 · 답변 템플릿 · FAQ 큐레이션 · 자료실 |
| **마케팅** (B2C) | 이벤트 · 프로모션 · 뉴스레터 · SMS · 이메일 · 발송 템플릿 |
| **콘텐츠** (공통) | 공지 · FAQ · 팝업 · 배너 · 약관 · 개인정보처리방침 (버전 이력 포함) |
| **기업** (Company) | 회사 정보 · CEO 인사말 · 오시는 길 · 파트너사 · 고객사 · 연혁 · 인증서 · ESG |
| **포트폴리오** (Company) | 포트폴리오 · 카테고리 · 성공사례 |
| **영업** (Company) | 거래처 · 계약 · 견적 · 문의 · 프로젝트 · 상담 이력 |

목록/상세/등록/수정이 한 벌로 들어 있고, 화면을 채우는 컴포넌트는 전부 `@tds/ui` 하나에서 나온다 — atoms 12 · molecules 21 · organisms 5, 계약 **38종**.

---

## 빠른 시작

> **한 줄로 시작:** `pnpm i && pnpm dev` → **http://localhost:5173** (Admin 앱, 전 라우트가 살아 있음)

> 요구 사항: **Node ≥ 20** · **pnpm 9.15**

```bash
pnpm install && pnpm dev  # ← 최상단 원커맨드. Admin 앱을 :5173 에 띄우고 전 라우트를 서빙

# 더 자세히:
pnpm dev                  # Admin 앱 (:5173) — 모든 페이지 라우트
pnpm dev:all              # Admin(:5173) + Storybook(:6006) 동시
pnpm codegen              # 계약/토큰 → 타입 · argTypes · figma.json · CSS 생성
pnpm gate:precheck        # 계약 + 네이밍 + 4자 일치 + 커버리지 + 클린코드 (리뷰 요청 전 필수)
pnpm sb                   # Storybook (:6006)
```

> 오케스트레이션은 **Turborepo** 가 담당한다 — `dev`·`build`·`lint`·`test`·`typecheck` 를 워크스페이스
> 의존 그래프와 로컬 캐시로 실행한다. 새 앱/패키지를 추가하면 루트 스크립트 수정 없이 자동 포함된다.

---

## 명세

화면은 만들기 전에 문서로 고정된다. `specs/` 에 **196건** — 화면 번호를 축으로 세 종류가 짝을 이루고, 문서는 `specs/<섹션>/<하위>/` 에 화면별로 놓인다(예: `specs/users/members/`).

| 문서 | 건수 | 무엇을 고정하는가 |
| --- | --- | --- |
| **FS** 기능명세서 | **70** (`FS-001`~`FS-070`) | 화면의 요소를 전수 넘버링한다(`FS-001-EL-008`). §4 예외 명세는 요소 × **7축**(빈 상태 · 로딩 · 실패 · 유효성 · 권한없음 · 경합 · 대량)을 **빈칸 없이** 채운다 |
| **BE** 백엔드 기능명세서 | **70** (`BE-001`~`BE-070`) | 엔드포인트 · 공통 에러 봉투 · 인증/권한 모델. §5 예외 매트릭스는 **9축**(400 검증 · 401 인증 · 403 vs 404 · 404 대상없음 · 409 충돌 · 422 상태위반 · 429 과부하 · 500 오류 · 타임아웃) |
| **NFR** 비기능명세서 | **56** (`NFR-015`~`NFR-070`) | `quality-bar.md` 의 **P0 30건을 그 화면에 전수 판정**한다. `적용` 축(`직접` / `상속` / `N/A`)으로 표면의 실재를 먼저 가리고, 성능 예산 · 가용성 · 데이터 보존을 덧붙인다 |

### 정본 — [`specs/quality-bar.md`](specs/quality-bar.md)

9차원(STATE · TOKEN · COMP · FEEDBACK · A11Y · MOTION · IA · ERP · EXC) · 요구 **100건**, 그중 **P0 30건은 전량 충족이 필수**다. 모든 배치가 이 문서를 acceptance criteria 로 삼는다. NFR 은 요구 문구를 재서술하지 않고 **ID 로만 참조**한다 — 정본은 한 곳에만 있다.

### BE 는 "구현된 것"이 아니라 "구현할 것"이다

**백엔드는 아직 없다.** `BE-*` 는 백엔드 개발자가 구현할 명세이며, 코드에 심어 둔 `// TODO(backend)` 를 근거로 쓰였다. **근거가 되는 FS 요소가 없는 엔드포인트는 만들지 않는다** — 모든 엔드포인트가 자기 근거 FS 요소 번호를 인용하고, 근거가 없는 것은 §1 '범위 밖'에 사유와 함께 남긴다. `openapi/openapi.yaml` 도 같은 성격이다 — 문서지 서버가 아니다.

---

## 게이트 검사

### 검사의 존재와 검사의 작동은 다르다

이 리포에서 가장 비싸게 배운 원칙이다. **게이트는 후자만을 증거로 받는다.**

실제로 발견된 **공허 통과(vacuous pass)** 4건 — 전부 초록불을 켜고 있었고, 전부 아무것도 보증하지 않았다.

| 무엇이 | 어떻게 거짓말했나 | 처리 |
| --- | --- | --- |
| `pnpm test` | `--passWithNoTests` → **테스트 0건에 초록불** | 플래그 제거 — 지금 테스트 **152건** |
| Storybook play function **62건** | `expect` **0개** · 스파이 **0개** → **실패할 수 없는 검사** | 단언 주입 |
| `bundle-size` CI job | dist 없이 초록불 | 되살리지 않고 **제거** → 실제로 잴 수 있게 된 뒤 **복원**해 `verify:all`(`perf:gate`)에 편입 ([ADR-0009](docs/adr/0009-ci-and-code-quality-gates.md)) |
| `tools/vrt` | 기준 이미지 0건 → "비교 0건 중 실패 0건 → **PASS**" | 전제 부재 시 `NOT_VERIFIED`(exit 2) — 기준 이미지 **501건**을 등록해 실제로 픽셀을 비교한다 |

**공집합 위에서 참인 명제는 아무것도 증명하지 않는다.** 측정 불가는 통과가 아니다 — 전제가 없으면 도구는 초록불 대신 `NOT_VERIFIED`를 낸다.

### 명령

```bash
pnpm validate:contracts   # 계약 스키마 검증
pnpm contract-test        # 4자 일치
pnpm coverage:check       # 계약 states · blockedWhen · FS 예외축 (라인 % 아님)
pnpm quality:check        # 클린코드 6축 (blocker 1건 → PR 차단)
pnpm naming:check         # 네이밍 규칙
pnpm lint && pnpm format:check
pnpm test                 # 단언 있는 테스트만 테스트로 센다
pnpm verify:all           # 위 전체 + codegen 재현성 + tsc --noEmit + 번들 예산
pnpm verify:full          # verify:all + E2E
```

---

## 리포지토리 구조

제품 표면은 다음과 같다 — 리포지토리의 모든 최상위 디렉터리를 나열한 것은 아니다.

```
├── contracts/              컴포넌트 계약 38종(SSOT) + schemas/
├── tokens/                 tokens.json (W3C DTCG, 3계층)
├── packages/ui/            @tds/ui — atoms/molecules/organisms/templates · foundations/ · generated/(수정 금지)
├── apps/admin/             React Admin 앱
├── specs/                  화면 명세 196건 — FS-*(요소 전수 넘버링 + 예외 7축) · BE-*(예외 9축) · NFR-*(P0 30 전수 판정) · quality-bar.md
├── openapi/                OpenAPI 3.1 스키마 (문서 — 서버 아님)
├── e2e/                    Playwright 시나리오 (테스트명이 FS 요소 번호를 인용)
├── tools/
│   ├── codegen/            계약/토큰 → 4곳 생성 파이프라인
│   ├── contract-test/      4자 일치 검증
│   ├── test-coverage/      계약 states · blockedWhen · FS 예외축 커버리지 (라인 % 아님)
│   ├── code-quality/       클린코드 6축 (결합·누수·중복·복잡도·죽은코드·레이어)
│   ├── vrt/                Visual Regression (기준 이미지 501건)
│   ├── drift/              Design Drift 감시
│   ├── a11y/               접근성 감사
│   ├── perf/               성능 예산 감사
│   ├── reuse-guard/        중복 컴포넌트 차단
│   ├── naming-guard/       네이밍 규칙 강제
│   └── figma-plugin/       Contract/Token → Figma 자동 생성
├── docs/
│   ├── adr/                아키텍처 결정 기록 (0001~0010)
│   ├── architecture/       프론트엔드 컨벤션
│   ├── plan/               계획 문서
│   ├── figma/              Figma 스펙 미러 + 검수
│   ├── tds/                디자인 시스템 문서
│   └── _templates/         표준 문서 템플릿
└── reports/                검증 산출물 (게이트 입력 — 기계 생성, 포매터 제외)
```

pnpm workspace: `packages/*` · `apps/*` · `tools/*` · `e2e`.

---

## 라이브러리 명세

선정 기준은 하나다 — **직접 만들지 않는다.** 표준이 있는 문제(폼 상태, 서버 캐시, 스키마 검증, 라우팅)는 검증된 라이브러리를 쓰고, 이 리포는 그 위에 얹히는 **계약 · 토큰 · 게이트**만 고유하게 유지한다.

### 런타임 — `apps/admin`

| 라이브러리 | 버전 | 역할 | 선정 이유 |
| --- | --- | --- | --- |
| `react` · `react-dom` | ^18.3 | UI 렌더링 | 동시성 렌더 · 생태계 |
| `react-router-dom` | ^6.28 | 라우팅 | 라우트 배열이 [App.tsx](apps/admin/src/App.tsx)의 단일 원천 — 사이드바 죽은 링크를 코드가 검출 |
| `@tanstack/react-query` | ^5.101 | 서버 상태 (조회 · 캐시 · 무효화) | `data-source` 어댑터 뒤의 fixture를 감싼다. 백엔드가 붙어도 화면 코드는 그대로 |
| `zustand` | ^5.0 | 클라이언트 전역 상태 | 보일러플레이트 없는 최소 스토어 — 서버 상태는 Query가 가져가므로 범위가 좁다 |
| `react-hook-form` | ^7.81 | 폼 상태 | 비제어 기반, 대형 폼에서 리렌더 최소 |
| `zod` | ^4.4 | 스키마 검증 | RHF resolver + 런타임 경계 검증. 타입은 스키마에서 추론 |
| `axios` | ^1.18 | HTTP 클라이언트 (인스턴스 + 인터셉터) | 실제 네트워크 호출은 **0건**이다 — `adapter` 확장점에 픽스처를 꽂아 **인터셉터가 하중을 받게** 했다. 스캐폴드로 두면 죽은 코드가 된다. 백엔드가 붙는 날 `adapter` 한 줄만 지운다 |

### 디자인 시스템 — `packages/ui`

| 라이브러리 | 버전 | 역할 | 선정 이유 |
| --- | --- | --- | --- |
| `@radix-ui/react-dialog` | 1.1.19 | `Modal` · `ConfirmDialog` 의 포커스 트랩 · 스크롤 락 | 손으로 짠 포커스 트랩이 실재 결함 3건을 냈다. 다이얼로그 접근성은 직접 만들 문제가 아니다 |
| `@tiptap/*` (`core` · `react` · `pm` · `starter-kit` · `extension-image`) | 3.28.0 | `RichTextField` 의 에디터 코어 | ProseMirror 기반 — 문서 모델이 DOM 이 아니라 스키마다 |
| `dompurify` | 3.4.12 | 에디터 HTML 살균 | XSS 경계. 직접 만들지 않는다 |

| 도구 | 버전 | 역할 |
| --- | --- | --- |
| `storybook` · `@storybook/react-vite` | ^8.6 | 컴포넌트 문서 · 상태 카탈로그 (리뷰 게이트의 증거) |
| `@storybook/addon-interactions` · `@storybook/test` | ^8.6 | play function — **단언이 있어야 검사로 센다** |
| `@storybook/addon-a11y` | ^8.6 | 스토리 단위 접근성 검사 |
| `@storybook/addon-essentials` | ^8.6 | controls · viewport · docs |

디자인 값은 라이브러리가 아니라 [tokens/tokens.json](tokens/tokens.json) — **W3C DTCG** 포맷, 3계층(primitive → semantic → component), light/dark 모드는 `$extensions['tds.modes']`에 기록한다.

### 빌드 · 타입

| 도구 | 버전 | 역할 |
| --- | --- | --- |
| `vite` | ^5.4 | 개발 서버 · 번들 (Storybook builder 공유) |
| `typescript` | ^5.6 | `strict` · `pnpm -r exec tsc --noEmit`이 `verify:all`에 포함 |
| `pnpm` | 9.15 | workspace · `workspace:*` 내부 링크 |
| `node` | ≥ 20 | `engines`로 고정 |
| `openapi-typescript` | ^7.13 | `openapi.yaml` → 타입. 어댑터 경계 양방향 컴파일 검증용 (**서버 아님**) |

### 품질

| 도구 | 버전 | 역할 |
| --- | --- | --- |
| `vitest` · `jsdom` | ^2.1 · ^25 | 단위/컴포넌트 테스트 (`--passWithNoTests` **금지**) |
| `@testing-library/react` · `user-event` · `jest-dom` | ^16 · ^14 · ^6 | 구현이 아니라 사용자 관점으로 검사 |
| `@playwright/test` | 1.61.1 | E2E — 테스트명이 `FS-NNN` 요소 번호를 인용 |
| `eslint` (flat) · `typescript-eslint` | ^9.17 · ^8.18 | 린트 기반 |
| `eslint-plugin-react` · `react-hooks` · `jsx-a11y` · `import-x` | — | 접근성 · 훅 규칙 · deep import 차단 |
| `eslint-config-prettier` | ^10.1 | 포맷 규칙 충돌 제거 |
| `prettier` | ^3.9 | 포맷 (`format:check`가 게이트) |
| `husky` | ^9.1 | 커밋 훅 |

린트에는 이 리포 고유의 커스텀 룰이 얹혀 있다 — **하드코딩 hex/px 금지**(`no-restricted-syntax`), **`@tds/ui` deep import 금지**(`no-restricted-imports`). 규칙이 아니라 빌드가 막는다.
