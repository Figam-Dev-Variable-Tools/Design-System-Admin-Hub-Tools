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
| 스토리 title | `Pages/<화면명>` — 화면명은 대응 SCR frontmatter의 `title`과 동일한 한국어 표기 (예: `Pages/로그인`) |
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
| `login/` | Pages/로그인 | docs/plan/ui/SCR-001-login.md | placeholder 골격 (모듈 G5 대기) |
| `dashboard/` | Pages/대시보드 | docs/plan/ui/SCR-002-dashboard.md | placeholder 골격 (모듈 G5 대기) |
| `product-registration/` | Pages/상품 등록 | docs/plan/ui/SCR-003-product-registration.md | placeholder 골격 (모듈 G5 대기) |

각 폴더의 README.md에 필요 모듈 목록(SCR §4 기준)과 '모듈 G5 통과 후 조립' 체크리스트가 있다.
모듈별 G5 승인 여부는 해당 모듈의 G5 승인 상태로 확인한다.
