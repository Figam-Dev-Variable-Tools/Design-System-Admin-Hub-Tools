# pages — Storybook Pages 탭 (스토리북 페이지 담당, 게이트 G5)

**조립 전용** 영역이다. `../src`의 public 컴포넌트만 조합해 Dashboard / User / Product / Settings 등
페이지 단위 시나리오 스토리(`pages/**/*.stories.tsx`)를 만든다.

- 신규 컴포넌트 생성 금지 — 필요한 컴포넌트가 없으면 작업을 멈추고 계약 엔지니어에게
  변경 요청을 발행한다.
- 하드코딩 색상/px 금지 — 토큰 참조만 허용.
- 스토리 글롭은 `.storybook/main.ts`의 `../pages/**/*.stories.tsx`에 이미 등록되어 있다.

## Pages 탭 규격

| 규격 | 내용 |
|---|---|
| 스토리 title | `Pages/<English Menu>/<Screen>` — 카테고리는 **영문 메뉴명**(`_data/pages.ts` 의 `MENUS[].en`), 그 아래에 화면 스토리를 둔다 (예: `Pages/Products/Product Registration`). 메뉴에 속하지 않는 인증 화면만 `Pages/<Screen>` (예: `Pages/Login`) |
| 스토리 형식 | Storybook CSF3 (`Meta` / `StoryObj`), 파일명 `<화면명 파스칼케이스>Page.stories.tsx` |
| 조립 원칙 | `../src` public 컴포넌트만 조합. **이 폴더에서 신규 컴포넌트를 만들지 않는다** — 없으면 계약 엔지니어에게 변경 요청 발행 후 대기 |
| 스타일 원칙 | 하드코딩 색상(hex)/px 리터럴 0건 — 토큰 CSS 변수(`var(--tds-*)`, `generated/tokens/tokens.ts`의 `cssVar`/`tokenVars`)만 사용 |
| placeholder 단계 | 필요 모듈이 G5를 통과하기 전까지는 토큰만 사용한 골격(placeholder) 스토리를 유지하고, G5 통과 모듈부터 순서대로 실제 컴포넌트로 교체한다 |
| 상태 재현 | 교체 시점에 대응 SCR §3(CRUD 상태 매트릭스 + 보충 절)의 빈/에러/로딩/권한없음 상태를 스토리로 재현한다 |
| 선행 조건 | `pnpm codegen` 선행 필수 — `generated/tokens/*` 미생성 시 Storybook 빌드 불가 (packages/ui/README.md 참고) |

## 페이지 ↔ SCR 1:1 매핑

각 페이지 폴더는 화면정의서(SCR) 1건과 1:1로 대응한다. SCR 없이 페이지를 추가하지 않는다
(먼저 UI 기획에게 SCR 작성을 요청한다).

| 폴더 | 스토리 title | 대응 SCR | 현재 상태 |
|---|---|---|---|
| `login/` | Pages/Login | docs/plan/ui/SCR-001-login.md | placeholder 골격 (모듈 G5 대기) |
| `dashboard/` | Pages/Dashboard/Dashboard Screen | docs/plan/ui/SCR-002-dashboard.md | placeholder 골격 (모듈 G5 대기) |
| `product-registration/` | Pages/Products/Product Registration | docs/plan/ui/SCR-003-product-registration.md | placeholder 골격 (모듈 G5 대기) |

각 폴더의 README.md에 필요 모듈 목록(SCR §4 기준)과 '모듈 G5 통과 후 조립' 체크리스트가 있다.
모듈별 G5 승인 여부는 해당 모듈의 G5 승인 상태로 확인한다.

## 메뉴 개요 스토리 — `menus/`

어드민 사이드바 메뉴 13개마다 `Pages/<English Menu>/Overview` 스토리가 하나씩 있다. 그 메뉴에
속한 화면 목록(한국어명 · 영문명 · 경로)을 표로 보여준다 — 어떤 화면이 아직 스토리로 조립되지
않았는지 한눈에 보이는 자리다.

- 데이터 원천: `_data/pages.ts` — `apps/admin/src/shared/layout/nav-config.ts` 의 **값 복사본**이다.
  packages/ui 는 앱 코드도 `tools/figma-plugin/generated/*` 도 import 할 수 없다(레이어 역방향 의존
  금지). nav-config.ts 가 바뀌면 이 파일을 함께 갱신한다.
- 렌더러: `_data/menu-overview.tsx` — 스토리 13벌이 같은 표를 복사하지 않도록 묶은 **스토리 전용**
  골격이다. DS 컴포넌트가 아니며 `../src` public API 로 내보내지 않는다. DataTable 이 Pages 조립에
  열리면 이 파일을 그 컴포넌트로 교체한다.

| 섹션 (KO) | Section (EN) | 메뉴 (KO) | Menu (EN) | basePath | 화면 수 |
|---|---|---|---|---|---|
| 일반 관리 | General | 대시보드 | Dashboard | `/dashboard` | 1 |
| 일반 관리 | General | 사용자 관리 | Users | `/users` | 5 |
| 일반 관리 | General | 콘텐츠 관리 | Content | `/content` | 6 |
| 일반 관리 | General | 기업 관리 | Company | `/company` | 8 |
| 비즈니스 | Business | 포트폴리오 관리 | Portfolio | `/portfolio` | 3 |
| 비즈니스 | Business | 상품 관리 | Products | `/products` | 7 |
| 비즈니스 | Business | 영업 관리 | Sales | `/sales` | 6 |
| 비즈니스 | Business | 고객센터 | Support | `/support` | 5 |
| 비즈니스 | Business | 마케팅 관리 | Marketing | `/marketing` | 6 |
| 비즈니스 | Business | 예약/신청 관리 | Reservations | `/reservations` | 4 |
| 분석 · 운영 | Analytics & Operations | 통계 | Statistics | `/stats` | 6 |
| 분석 · 운영 | Analytics & Operations | 로그 관리 | Logs | `/logs` | 4 |
| 시스템 | System | 시스템 설정 | Settings | `/settings` | 4 |

화면 65건의 한국어 ↔ 영문 매핑 전체는 `_data/pages.ts` 에 있다. 영문 표기는 화면의 URL 경로에서
유도한다(`/users/members` → Members); 경로가 이름을 담지 못하는 경우(`/users/settings` → Customer
Settings, `/support/categories` → Inquiry Categories)만 한국어 라벨의 뜻을 살려 붙인다.
