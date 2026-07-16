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

목록/상세/등록/수정이 한 벌로 들어 있고, 화면을 채우는 컴포넌트는 전부 `@tds/ui` 하나에서 나온다 — atoms 12 · molecules 20 · organisms 5, 계약 **37종**.

---

## 빠른 시작

> 요구 사항: **Node ≥ 20** · **pnpm 9.15**

```bash
pnpm install
pnpm codegen              # 계약/토큰 → 타입 · argTypes · figma.json · CSS 생성
pnpm gate:precheck        # 계약 + 소유권 + 네이밍 + 4자 일치 (리뷰 요청 전 필수)
pnpm dev:admin            # Admin 앱
pnpm sb                   # Storybook (:6006)
```

---

## 게이트 검사

### 검사의 존재와 검사의 작동은 다르다

이 리포에서 가장 비싸게 배운 원칙이다. **게이트는 후자만을 증거로 받는다.**

실제로 발견된 **공허 통과(vacuous pass)** 4건 — 전부 초록불을 켜고 있었고, 전부 아무것도 보증하지 않았다.

| 무엇이 | 어떻게 거짓말했나 | 처리 |
| --- | --- | --- |
| `pnpm test` | `--passWithNoTests` → **테스트 0건에 초록불** | 제거 (A77이 차단) |
| Storybook play function **62건** | `expect` **0개** · 스파이 **0개** → **실패할 수 없는 검사** | 단언 주입 (A30) |
| `bundle-size` CI job | dist 없이 초록불 | job **제거** ([ADR-0009](docs/adr/0009-ci-and-code-quality-gates.md)) |
| `tools/vrt` | 기준 이미지 0건 → "비교 0건 중 실패 0건 → **PASS**" | `NOT_VERIFIED` (exit 2) |

**공집합 위에서 참인 명제는 아무것도 증명하지 않는다.** 측정 불가는 통과가 아니다 — 전제가 없으면 도구는 초록불 대신 `NOT_VERIFIED`를 낸다.

### 명령

```bash
pnpm validate:registry    # A02  에이전트 50 · 게이트 11 · SKILL 정합성
pnpm boundary:check       # A02  소유권 경계 (CODEOWNERS와 동일 규칙)
pnpm contract-test        # A74  4자 일치
pnpm coverage:check       # A77  계약 states · blockedWhen · FS 예외축 (라인 % 아님)
pnpm quality:check        # A83  클린코드 6축 (blocker 1건 → PR 차단)
pnpm naming:check         # A76  네이밍 규칙
pnpm lint && pnpm format:check
pnpm test                 # 단언 있는 테스트만 테스트로 센다
pnpm verify:all           # 위 전체 + codegen 재현성 + tsc --noEmit
pnpm verify:full          # verify:all + E2E
```

---

## 리포지토리 구조

```
├── orchestration/          A00  조직 SSOT — 에이전트/게이트 레지스트리, 핸드오프 스키마, 태스크
├── contracts/              A18  컴포넌트 계약 37종(SSOT) + 스키마 · review/(A19)
├── tokens/                 A20  tokens.json (W3C DTCG, 3계층) · review/(A21)
├── packages/ui/            A30~A33  @tds/ui — atoms/molecules/organisms/templates · foundations/ · generated/(수정 금지)
├── apps/admin/             A40~A41  React Admin 앱 (Mid / Senior 순차 배타)
├── specs/                  A62~A64  기능명세 FS-* (요소별 넘버링 + 예외 7축) · BE-* (예외 9축) · quality-bar.md
├── openapi/                A80  OpenAPI 3.1 스키마 (문서 — 서버 아님)
├── e2e/                    A85  Playwright 시나리오 (테스트명이 FS 요소 번호를 인용)
├── tools/
│   ├── codegen/                 계약/토큰 → 4곳 생성 파이프라인
│   ├── boundary/           A02  CODEOWNERS 생성 + 소유권/reads 스코프 검사
│   ├── contract-test/      A74  4자 일치 검증
│   ├── test-coverage/      A77  계약 states · blockedWhen · FS 예외축 커버리지 (라인 % 아님)
│   ├── code-quality/       A83  클린코드 6축 (결합·누수·중복·복잡도·죽은코드·레이어)
│   ├── vrt/                A70  Visual Regression
│   ├── drift/              A71  Design Drift 감시
│   ├── a11y/               A72  접근성 감사
│   ├── perf/               A73  성능 예산 감사
│   ├── reuse-guard/        A75  중복 컴포넌트 차단
│   ├── naming-guard/       A76  네이밍 규칙 강제
│   └── figma-plugin/       A50  Contract/Token → Figma 자동 생성
├── docs/
│   ├── adr/                A01  아키텍처 결정 기록 (0001~0010)
│   ├── architecture/       A01  프론트엔드 컨벤션 (A40/A41/A30 필독) · 조직 감사
│   ├── plan/ design/            A10~A17
│   ├── figma/              A51~A56  Figma 스펙 미러 + 검수
│   ├── tds/                A60~A61  디자인 시스템 문서
│   ├── security/           A86  보안 검토 (G6·G9 차단)
│   └── _templates/              표준 문서 + 게이트 체크리스트
├── reports/                Layer 3 검증 산출물 (게이트 입력 — 기계 생성, 포매터 제외)
└── skills/                 50 에이전트 SKILL.md (+ _templates/)
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

### 디자인 시스템 — `packages/ui`

| 라이브러리 | 버전 | 역할 |
| --- | --- | --- |
| `storybook` · `@storybook/react-vite` | ^8.6 | 컴포넌트 문서 · 상태 카탈로그 (G5의 증거) |
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
