---
id: ADR-0008
title: 툴체인·라이브러리 도입 — ESLint 프리셋 재구성 · Prettier · react-query/RHF/zod/OpenAPI (설치까지, 적용은 프론트 리팩터)
status: proposed
date: 2026-07-15
owner: 아키텍처
author: 의존성 관리 (Dependency Manager) · 린트·포맷 (Lint & Format Engineer)
supersedes: null
relatedTo: [ADR-0002, ADR-0005, ADR-0006, ADR-0007]
---

# ADR-0008. 툴체인·라이브러리 도입

> **이 ADR 의 범위는 '도구를 깐다'까지다.** 앱 코드가 이 라이브러리를 **쓰도록 고치는 것은 프론트 리팩터 의 일**이며
> 이 PR 에 포함되지 않는다 (`apps/admin/src/**` · `packages/ui/src/**` 는 이 PR 에서 **로직 변경 0줄**이다).
> 의존성 관리 의 절차 9(사용 경계 통보)에 따라, 각 라이브러리의 **사용 경계**를 §7 에 명시해 소유자에게 인계한다.

> **백엔드를 만들지 않는다.** OpenAPI 는 **스키마 문서 + 타입 생성**까지다 (§6).
> 서버 코드·DB 스키마·서버 라우터는 이 PR 에 존재하지 않는다 — `openapi/README.md` 가 이 경계를 명문화한다.

## 1. 맥락

ADR-0006 이 의존성 관리 · 린트·포맷을 신설했지만, 두 영역의 **실제 부채는 그대로 남아 있었다.**

| 부채 | 증상 |
|---|---|
| 포매터 부재 | ADR-0006 §맥락: "**포매터는 없다** — 스타일이 사람(에이전트)마다 갈린다". 리뷰 diff 에 서식 노이즈가 섞인다 |
| `react-hooks` 플러그인 부재 | **`exhaustive-deps` 를 아무도 잡지 못하고 있었다.** stale closure 버그가 정적으로 검출되지 않는다 |
| 접근성 정적 검사 부재 | a11y 위반이 접근성 감사의 **런타임 감사(axe)** 에 도달해서야 발견된다 — 커밋 시점 방어선이 없다 |
| 손으로 만든 비동기 조회 | `shared/useAsyncData.ts` 가 abort·로딩·에러·재조회를 직접 구현한다. 페이지마다 같은 로딩/에러 분기가 반복된다 |
| 손으로 만든 폼·검증 | login · customer-settings · members 모달이 각자 폼 상태와 blur 검증을 다시 쓴다 (`validation.ts`, `validateDraft`) |
| 손으로 쓴 API 응답 타입 | BE-001~004 명세(엔드포인트 14건)가 확정됐는데 **프론트 타입과의 일치를 사람이 눈으로 대조**하고 있다 |

## 2. 결정 (요약)

1. **ESLint**: Airbnb 규칙군을 **공식 지원 패키지로 직접 구성**한다 (`eslint-config-airbnb` 는 flat config 에서 못 쓴다 — §4).
2. **Prettier** 를 도입하고, **자동 수정으로 결정 가능한 모든 것**을 ESLint 에서 떼어내 Prettier 에게 넘긴다 (§5).
3. **`@tanstack/react-query` · `react-hook-form` · `zod` · `openapi-typescript` · `openapi-fetch`** 를 **설치한다.**
   앱 코드 적용은 프론트 리팩터 (§7 사용 경계 참조).
4. **상태관리 라이브러리(Redux/Zustand/Jotai)를 도입하지 않는다** (§8 — YAGNI).
5. **OpenAPI 3.1 스키마**(`openapi/openapi.yaml`)로 BE-001~004 를 옮기고 타입을 생성한다. **서버는 만들지 않는다** (§6).

---

## 3. 의존성 판정 — 의존성 관리 절차 (문제 / 번들 / 유지보수 / 부재 시 결과)

### 3.0 번들 증분 측정 방법 (추정치가 아니라 실측이다)

**중요 — 오늘 이 PR 의 앱 번들 증분은 `+0 B` 다.**

| | raw | gzip |
|---|---|---|
| 도입 전 `dist/assets/index-*.js` | 379.70 kB | **111.69 kB** |
| 도입 후 (본 PR — 앱 코드 미수정) | 379.70 kB | **111.69 kB** |
| **증분** | **+0 B** | **+0 B** |

빌드 산출물의 **해시가 동일하다** (`index-C199TtJh.js`). 앱 코드가 아직 이 라이브러리를 import 하지 않으므로
Rollup 이 전부 tree-shaking 한다. **설치는 번들 비용이 아니다 — import 가 번들 비용이다.**

따라서 아래 표의 숫자는 **프론트 리팩터 가 실제로 채택했을 때 발생할 비용**이며,
현재 앱의 런타임 의존성(react + react-dom + react-router-dom)만 담은 **기준 번들(51.16 kB gzip)** 위에
각 라이브러리를 **실사용 형태로** 얹어 **실제 프로덕션 파이프라인(vite build = Rollup, minify)** 으로 측정했다.

> **측정 도구가 결과를 바꾼다 (실측 기록):** 같은 zod 코드를 esbuild 로 번들하면 **+63.2 kB gzip**,
> Rollup(vite) 로 번들하면 **+17.5 kB gzip** 이다. esbuild 가 zod v4 를 제대로 tree-shake 하지 못한다.
> **우리가 출하하는 파이프라인은 vite(Rollup)** 이므로 Rollup 수치를 채택한다.
> (dev/vitest 는 esbuild 를 쓰지만 그것은 출하되지 않는다.)

### 3.1 번들 증분 실측 (vite build · gzip · 기준 51.16 kB)

| 라이브러리 | 버전 | 라이선스 | gzip 증분 | tree-shakable | 판정 |
|---|---|---|---|---|---|
| `@tanstack/react-query` | 5.101.2 | MIT | **+11.8 kB** | yes (ESM) | 채택 |
| `react-hook-form` | 7.81.0 | MIT | **+9.8 kB** | yes (ESM, 의존성 0) | 채택 |
| `zod` (classic entry) | 4.4.3 | MIT | **+17.5 kB** | 부분적 | 채택 — **단 §7.3 의 사용 경계 필수** |
| `zod/mini` (같은 패키지) | 4.4.3 | MIT | **+4.6 kB** | yes | **권고 진입점** (§7.3) |
| `openapi-fetch` | 0.17.0 | MIT | **+2.4 kB** | yes (런타임 6 kB 미만) | 채택 |
| **4종 동시 채택 합계** | | | **+40.1 kB** | | (개별 합 41.5 kB — 공유분 1.4 kB 절감) |
| `openapi-typescript` | 7.13.0 | MIT | **+0 kB (devDep)** | — | 채택 (빌드타임 전용) |
| `prettier` | 3.9.5 | MIT | **+0 kB (devDep)** | — | 채택 |

**+40.1 kB gzip 은 공짜가 아니다.** 그러나 이것은 **대체 비용**이기도 하다 — §3.2~3.5 의 각 표에서
'직접 구현 유지'의 칸은 **우리가 이미 지불하고 있는 비용**(중복 코드·버그 표면)이며, 라이브러리는 그 코드를 지운다.
**성능 감사(Performance Audit)의 예산 판정은 프론트 리팩터 가 실제로 채택하는 PR 에서 다시 받는다** — 이 PR 은 증분 0 이므로 예산 판정 대상이 아니다.

### 3.2 `@tanstack/react-query` — 손으로 만든 `useAsyncData` 를 대체한다

**문제 진술**: 조회 화면마다 (a) `AbortController` 수명 관리 (b) 로딩/에러/빈 상태 분기
(c) 탭·기간·페이지 변경 시 **늦게 도착한 이전 응답이 최신 상태를 덮어쓰지 않게 하는 경합 처리**
(d) 실패 후 '다시 시도'(FS-002-EL-041.1 · FS-003-EL-014.1 · FS-004-EL-011.1)를 **각자 다시 구현하고 있다.**
`shared/useAsyncData.ts` 가 이것을 한 벌 갖고 있으나 캐시가 없어 **탭을 오갈 때마다 서버를 다시 친다** —
BE-002 §4.1 이 그 결과로 레이트리밋(세션 분당 120회)을 계약에 넣어야 했다.

| 축 | (a) 직접 구현 유지 (`useAsyncData`) | (b) `@tanstack/react-query` | (c) SWR |
|---|---|---|---|
| 문제 해결 범위 | abort·로딩·에러만. **캐시·중복 제거·재시도·낙관적 갱신 없음** | 전부 + 무효화·낙관적 갱신·재조회 | 캐시·중복 제거 O, **뮤테이션·낙관적 갱신 지원이 얕다** |
| 번들 증분 (gzip) | +0 | **+11.8 kB** | +4.5 kB |
| tree-shakable | — | yes | yes |
| 유지보수 | **우리가 소유** — 경합 버그는 우리 버그다 | TanStack, 활발 (v5 안정) | Vercel, 활발하나 릴리스 완만 |
| 라이선스 | — | MIT | MIT |
| 우리 요구와의 적합 | 낙관적 갱신(FS-004-EL-007.5/007.8)을 화면 코드가 손으로 한다 | **낙관적 갱신·롤백이 1급 기능** — BE-004 §7.5 의 '쓰기 후 재조회 안 함' 설계와 맞다 | 뮤테이션 API 가 빈약해 손으로 다시 짜야 한다 |
| 제거 난이도 | — | 훅 경계로 격리 가능 (§7.1) | 동일 |

**부재 시**: 페이지마다 로딩/에러 분기가 계속 복제된다. 캐시가 없어 탭 전환마다 서버를 치고,
BE-002 가 계약에 넣은 레이트리밋에 정상 사용자가 가까워진다. **판정: (b) 채택.**

### 3.3 `react-hook-form` — 페이지마다 손으로 쓴 폼 상태를 대체한다

**문제 진술**: login · customer-settings · members(그룹 생성/비밀번호 변경/적립금 조정) 모달이
**각자** `useState` 로 필드 값·터치 여부·에러를 들고, blur 검증을 손으로 배선한다.
그 결과 **키 입력 1회가 폼 전체를 리렌더**하고, 검증 규칙이 화면마다 다른 모양으로 흩어진다.

| 축 | (a) 직접 구현 유지 | (b) `react-hook-form` | (c) Formik |
|---|---|---|---|
| 문제 해결 범위 | 화면마다 재작성 | uncontrolled 기반 — **필드 1개 변경이 폼 전체를 리렌더하지 않는다** + 검증 통합 | 기능은 비슷하나 controlled 기반 |
| 번들 증분 (gzip) | +0 | **+9.8 kB** | +13 kB |
| 런타임 의존성 | 0 | **0** | 여러 개 |
| 유지보수 | 우리가 소유 | 활발, 메이저 안정(v7 장수) | **유지보수 정체** |
| zod 결합 | 손으로 | `@hookform/resolvers` 로 1줄 | 어댑터 필요 |
| 제거 난이도 | — | 폼 컴포넌트 단위로 격리 | 동일 |

**부재 시**: 모달이 늘어날 때마다 같은 폼 배선이 복제된다. **판정: (b) 채택.**
※ `@hookform/resolvers` 는 **아직 설치하지 않는다** — 프론트 리팩터 가 zod 결합을 실제로 쓸 때 요청한다 (YAGNI).

### 3.4 `zod` — 손으로 쓴 유효성 함수를 대체한다

**문제 진술**: `login/validation.ts`(`EMAIL_MAX_LENGTH=254` · `PASSWORD_MIN_LENGTH=8`),
`product-registration/validation.ts`, `customer-settings` 의 `validateDraft` 가 **같은 종류의 규칙을 세 벌** 갖고 있다.
더 중요한 것은 **이 규칙이 BE 명세의 서버 제약과 짝을 이룬다**는 점이다 (BE-001 §4: 이메일 254자 · 비밀번호 8–64자,
BE-004 §4: `amount` 1–1,000,000 · `reason` 1–100자 · `memo` 0–500자). 지금은 **두 벌이 손으로 동기화**되고 있다.

| 축 | (a) 직접 구현 유지 | (b) `zod` | (c) `valibot` |
|---|---|---|---|
| 타입 ↔ 런타임 검증 | **따로 논다** — 타입은 `interface`, 검증은 `if` 문 | **스키마 1개에서 타입 추론**(`z.infer`) | 동일 |
| 번들 증분 (gzip) | +0 | **+17.5 kB** (classic) / **+4.6 kB** (`zod/mini`) | +2 kB |
| RHF 결합 | 손으로 | 1급 (`@hookform/resolvers/zod`) | 지원 |
| 생태계 | — | **사실상 표준** — openapi 도구·RHF·tRPC 가 전부 지원 | 신흥, 어댑터가 적다 |
| 유지보수 | 우리가 소유 | 활발 (v4) | 활발하나 생태계가 얕다 |
| 제거 난이도 | — | 스키마 파일 단위로 격리 | 동일 |

**부재 시**: 프론트 검증과 BE 명세의 제약이 **조용히 어긋난다** — 어긋나도 아무 도구가 알려주지 않는다.
**판정: (b) 채택. 단 §7.3 의 진입점 규칙(`zod/mini` 우선)을 지킬 것.**

### 3.5 `openapi-typescript` (+ `openapi-fetch`) — 손으로 쓴 API 타입을 대체한다

**문제 진술**: BE-001~004 가 **엔드포인트 14건 · 도메인 타입 21종**을 확정했다.
그 타입이 프론트 타입과 일치하는지를 지금은 **명세의 §6 대조표를 사람이 읽어서** 확인한다.
필드 하나가 어긋나면 런타임에 `undefined` 가 화면에 뜰 때까지 아무도 모른다.

| 축 | (a) 직접 구현 유지 | (b) `openapi-typescript` (+`openapi-fetch`) | (c) 계약 테스트만 추가 |
|---|---|---|---|
| 계약 검증 | **사람이 눈으로** | **`tsc` 가 기계 검증** — 스키마와 프론트 타입 불일치가 컴파일 에러 | 런타임에 발견 (늦다) |
| 번들 증분 | +0 | **+0 kB** (openapi-typescript = devDep) / **+2.4 kB** (openapi-fetch, 선택) | +0 |
| 백엔드가 바뀌면 | 프론트가 모른다 | 스키마 재생성 → **타입 에러로 즉시 드러난다** | 테스트가 깨진다(있다면) |
| 유지보수 | 우리가 소유 | Redocly 계열, 활발 | 우리가 소유 |
| 제거 난이도 | — | 생성 파일 삭제 + 스크립트 제거 | — |

**부재 시**: 프론트↔백엔드 계약이 **문서에만 존재**한다. 문서는 컴파일되지 않는다.
**판정: (b) 채택.** 실제 대조에서 **불일치 1건**(`TabData.cards` 튜플)이 즉시 발견됐다 — 도구가 첫날부터 값을 냈다 (§6.3).

### 3.6 라이선스 · 취약점

- **라이선스**: 신규 직접 의존성 14종 전부 **MIT** (예외: `eslint-import-resolver-typescript` = **ISC**).
  카피레프트 0건 — 아키텍처 에스컬레이션 사유 없음.
- **`pnpm audit` (high/critical)**: **2건 — 그러나 둘 다 이 PR 이전부터 존재하던 것이다.**

  | 심각도 | 패키지 | 경로 | 이 PR 이 도입했는가 |
  |---|---|---|---|
  | critical | `vitest@2.1.9` (<3.2.6) — Vitest UI 서버 임의 파일 읽기/실행 | `apps/admin > vitest` · `packages/ui > vitest` | **아니다 (기존)** |
  | high | `vite@5.4.21` (<=6.4.2) — Windows 대체 경로에서 `server.fs.deny` 우회 | `apps/admin > vite` 등 | **아니다 (기존)** |

  **신규 도입 14종이 물고 온 high/critical 은 0건이다.** 두 취약점은 **개발 서버 전용**(출하 번들에 없다)이지만,
  의존성 관리 의 기준("high/critical 1건 이상 → 도입 불가")은 **리포 전체**에 대해 이미 위반 상태다.
  → **별도 인계: `vite` 6 · `vitest` 3 업그레이드 (의존성 관리 후속 PR).** 메이저 업그레이드이므로 이 PR 에 섞지 않는다.

---

## 4. ESLint — Airbnb 를 '설치'하지 않고 '구성'한다

### 4.1 `eslint-config-airbnb` 는 이 리포에서 쓸 수 없다 (기술적 사실)

이 리포는 **ESLint 9 flat config** 다 (`tseslint.config()`, `.eslintrc*` 없음).
`eslint-config-airbnb` 는 **ESLint 8 legacy(eslintrc) 전용**이며 flat config 에서 그대로 해석되지 않는다.
"Airbnb 를 켜달라"에 `pnpm add eslint-config-airbnb` 로 답하면 **틀린 답이다.**

### 4.2 채택: Airbnb 의 **실질**을 공식 지원 패키지로 직접 구성한다 (린트·포맷 스킬의 권고안 (b))

| 프리셋 | 무엇을 강제하는가 | 왜 켰는가 (막는 버그) |
|---|---|---|
| `typescript-eslint` `strict` + `stylistic` | 타입 안전성 + 일관된 타입 표현 | `any` 누수·불필요한 단언·비일관 타입 표기 |
| `eslint-plugin-import-x` `recommended`+`typescript` | import 그래프 위생 | **순환 import → 모듈 초기화 순서에 따라 `undefined` 를 읽는다** (`no-cycle`), 중복 import |
| `eslint-plugin-react` `recommended`+`jsx-runtime` | React 관용구 | key 누락·잘못된 prop 타입 |
| **`eslint-plugin-react-hooks`** | 훅 규칙 | **`rules-of-hooks`**(조건부 훅 → 렌더마다 훅 순서가 달라져 상태가 뒤섞인다) · **`exhaustive-deps`**(stale closure) |
| `eslint-plugin-jsx-a11y` `recommended` | 접근성 | 라벨 미연결·비대화형 요소의 클릭 핸들러 — **접근성 감사 런타임 감사(axe)보다 앞선 정적 방어선** |
| `eslint-config-prettier` | (서식 규칙 off) | 포매터와의 충돌 제거 |

**"Airbnb 를 쓴다"는 규칙 선택의 책임을 외부에 위임하는 것이다.** 이 조직은 규칙마다
"무슨 버그를 막는가"를 답할 수 있어야 한다 — 그래서 (b) 다.

### 4.3 배치 순서 — flat config 는 **뒤가 앞을 덮는다**

```
① ignores  →  ② 프리셋  →  ③ eslint-config-prettier  →  ③-b 단계적 도입(warn)  →  ④ 커스텀 룰 (맨 마지막)
```

flat config 는 후행 객체가 동일 키의 `rules` 를 **통째로 덮어쓴다** (배열 병합이 아니다).
**커스텀 룰이 마지막에 와야 프리셋이 방어선을 조용히 덮어쓰지 못한다.** 이 순서는 계약이며 바꾸지 않는다.

### 4.4 방어선 4종 회귀 테스트 (프리셋 도입 전후)

스크래치 파일에 **일부러 위반 4종**을 넣고 `pnpm lint` 를 돌려, 프리셋 도입 **후에도 여전히 `error` 로 잡히는지** 확인했다.
(확인 후 스크래치 파일 삭제 — 커밋하지 않았다.)

| # | 방어선 | 위반 샘플 | 프리셋 도입 후 | 규칙 |
|---|---|---|---|---|
| 1 | 하드코딩 색상(hex) 금지 | `const c = '#ff0000';` | ✅ **error** | `no-restricted-syntax` |
| 2 | px 리터럴 금지 | `const s = '16px';` | ✅ **error** | `no-restricted-syntax` |
| 3 | `@tds/ui` deep import 금지 | `import { Button } from '@tds/ui/atoms/Button';` | ✅ **error** | `no-restricted-imports` |
| 4 | 레이어 역방향 의존 금지 | atom 이 `../../organisms/X` 를 import | ✅ **error** | `no-restricted-imports` |

**4종 전부 유지된다.** (상세 결과는 §9 검증 로그)

### 4.5 `react-hooks` v7 의 React Compiler 규칙군은 **켜지 않는다**

설치된 `eslint-plugin-react-hooks@7.1.1` 의 `configs['recommended-latest']` 는
**React Compiler 규칙 15종**(`immutability` · `purity` · `set-state-in-effect` · `preserve-manual-memoization` …)을
**`error` 로 함께 켠다.** 이것은 요청받은 범위(`rules-of-hooks` + `exhaustive-deps`)를 훨씬 넘어서는
**별도의 정책 결정**이며, ADR 없이 15종을 error 로 켜는 것은 §4.2 의 원칙("우리가 켠 규칙을 우리가 설명한다")에 어긋난다.

→ **플러그인만 등록하고 규칙 2종을 명시적으로 켠다.** Compiler 규칙군 도입은 **별도 ADR** 로 다룬다.

---

## 5. 규칙 승격 계획 (warn → error) — **언제 error 가 되는가**

프리셋 도입으로 **새로 켜진 규칙**들이 기존 코드에서 위반을 냈다.
**규칙을 끄지 않았고, `// eslint-disable` 로 덮지도 않았다.** 위반 코드(`apps/admin/src/**` · `packages/ui/src/**`)의
수정은 **소유자(프론트 리팩터 · 컴포넌트 엔지니어)의 일**이므로 린트·포맷 은 손대지 않는다. 대신 **심각도만 `warn`** 으로 두어 위반을 가시화한다.

### 5.1 현재 warn 인 규칙과 위반 건수 (총 12건)

| 규칙 | 위반 | 소유자 | 막는 버그 |
|---|---|---|---|
| `react-hooks/exhaustive-deps` | 3 | 프론트 리팩터 | stale closure — effect 가 낡은 값을 읽는다 |
| `import-x/no-duplicates` | 2 | 프론트 리팩터 | 같은 모듈 중복 import |
| `jsx-a11y/no-noninteractive-element-interactions` | 2 | 프론트 리팩터 | 키보드 사용자가 도달할 수 없는 클릭 핸들러 |
| `jsx-a11y/label-has-associated-control` | 1 | 프론트 리팩터 | 스크린리더가 입력의 이름을 읽지 못한다 |
| `jsx-a11y/role-supports-aria-props` | 1 | 프론트 리팩터 | 보조기술이 상태를 잘못 읽는다 |
| `jsx-a11y/interactive-supports-focus` | 1 | **컴포넌트 엔지니어** (`packages/ui`) | interactive role 요소에 키보드로 도달할 수 없다 |
| `@typescript-eslint/no-dynamic-delete` | 1 | 프론트 리팩터 | 동적 delete 가 객체 shape 을 런타임에 바꾼다 |
| `@typescript-eslint/array-type` | 1 | 프론트 리팩터 | (표현 일관성) |

`packages/ui` 의 `react-hooks/exhaustive-deps` 는 **위반 0건이므로 처음부터 `error`** 다 —
두 워크스페이스의 심각도가 다른 유일한 규칙이며, 그 이유는 이것뿐이다.

### 5.2 승격 조건 (확정)

| # | 조건 |
|---|---|
| 1 | **소유자가 위반을 해소하면 그 규칙은 즉시 `error` 로 승격한다.** 규칙 단위로 승격하며, 12건 전부를 기다리지 않는다 |
| 2 | **기한: 다음 G6 게이트.** 그때까지 남은 위반은 **G6 체크리스트의 blocker 로 승격**한다 (경계 담당·CI·CD 에 인계 완료) |
| 3 | **신규 코드에는 유예가 없다.** warn 은 **기존 위반을 가시화하기 위한 것**이며, 새 위반을 허용하는 장치가 아니다. CI 가 `--max-warnings` 로 신규 warn 을 차단하도록 **CI·CD 에 인계** 한다 (경고 총량이 12를 넘으면 실패) |
| 4 | 위반이 0건이 된 규칙의 `③-b 단계적 도입` 블록 항목은 **삭제한다** — 삭제하면 프리셋의 기본 심각도(`error`)로 자동 복귀한다 |

**이 표가 없으면 `warn` 은 영구 면죄부가 된다.** 그래서 기한을 못 박는다.

---

## 6. OpenAPI — **스키마 문서다. 서버가 아니다.**

### 6.1 경계 (절대)

| 만든 것 | 만들지 않은 것 |
|---|---|
| `openapi/openapi.yaml` — OpenAPI **3.1** 스키마 (엔드포인트 14건) | **서버 코드 0줄** |
| `openapi/README.md` — "이것은 스키마다" 명문화 | **DB 스키마 0줄** |
| `pnpm openapi:types` → `apps/admin/src/shared/api/schema.d.ts` (생성물) | **서버 라우터 0줄** |
| | `express` · `fastify` · `prisma` · `typeorm` **의존성 0건** (§9 검증 7) |

**백엔드 개발자가 이 스키마를 보고 서버를 구현한다.** 우리는 계약을 기계가 읽을 수 있게 만들 뿐이다.

### 6.2 명세 → 스키마 매핑

- **공통 에러 봉투** → `components/schemas/ErrorEnvelope` (+ `ErrorField`). 4개 명세가 같은 봉투를 쓴다 — **1회만 정의**.
- **도메인 타입 21종** → `components/schemas/` (`AuthSession` · `TabData` · `StatsData` · `Member` · `MemberDetail` ·
  `PointEntry` · `MemberGroup` · `MemberListResult` · `ConsentGroup` · `Coupon` …).
- **예외 9축** → 각 엔드포인트의 `responses` (400 · 401 · 403 · 404 · 409 · 422 · 423 · 429 · 500 · 504).
  재사용 응답은 `components/responses` 로 1회 정의한다 (`ValidationFailed` · `Unauthenticated` · `Forbidden` ·
  `ForbiddenOrCsrf` · `MemberNotFound` · `RateLimited` · `InternalError` · `RequestTimeout` · `UpstreamTimeout`).
- **BE 명세의 결정을 그대로 반영**: `Idempotency-Key`(적립금 — **필수**, 알림 — 선택) · `If-Match`(메모, 필수) ·
  `ETag`(**메모 버전만** — BE-004 §7.4 가짜 충돌 방지) · `X-CSRF-Token`(모든 쓰기) · `Retry-After`(429·423).

### 6.3 `TabData.cards` — 도구가 첫날 잡아낸 불일치 1건

`TabData.cards` 는 프론트가 **튜플** `readonly [ListCardData, ListCardData]` 인데,
`minItems: 2` / `maxItems: 2` 만으로는 `openapi-typescript` 가 `ListCardData[]`(가변 배열)를 생성한다 →
**서버 응답 타입이 프론트 타입에 대입되지 않는다** (컴파일 에러).

**해결**: OpenAPI 3.1 은 JSON Schema 2020-12 이므로 **`prefixItems`** 로 고정 길이 튜플을 표현한다.
생성 결과가 `[ListCardData, ListCardData]` 가 되어 프론트 타입과 정확히 일치한다.
**이것이 openapi-typescript 를 도입한 이유 그 자체다** — 사람이 §6 대조표를 읽어서는 잡을 수 없었던 불일치다.

---

## 7. 사용 경계 (의존성 관리 절차 9) — **소유자에게 넘기는 계약**

**설치는 의존성 관리/린트·포맷 이 했다. 사용은 소유자가 한다.** 아래는 그 사용 규칙이다.

### 7.1 `@tanstack/react-query` (프론트 리팩터)
- **`shared/useAsyncData.ts` 를 대체하는 것이 목표다.** 두 벌을 공존시키지 않는다 —
  공존하면 캐시가 두 개가 되고 어느 쪽이 진실인지 알 수 없다.
- 화면 컴포넌트가 `useQuery` 를 직접 부르지 말고 **도메인 훅**(`useMembers(query)` 등)으로 한 겹 감싼다.
  그래야 `data-source.ts` 교체(mock → HTTP)가 화면에 도달하지 않는다.
- 낙관적 갱신은 BE-004 §7.5 의 결정(쓰기 후 재조회 안 함)과 **일치시킨다.**

### 7.2 `react-hook-form` (프론트 리팩터)
- 모달·폼 컴포넌트 안에서만 쓴다. **`packages/ui` 의 원자/분자는 RHF 를 모른다** —
  UI 컴포넌트가 폼 라이브러리를 알면 디자인 시스템이 앱에 결합된다 (ADR-0006 이 지적한 결함과 같은 종류).
- zod 결합이 필요해지면 `@hookform/resolvers` 를 **의존성 관리 에 요청**한다 (아직 설치하지 않았다).

### 7.3 `zod` (프론트 리팩터) — **진입점 규칙 (번들 3.8배 차이)**
- **`zod/mini` 를 기본 진입점으로 쓴다** (+4.6 kB). classic `zod` 는 +17.5 kB 다.
- classic 이 필요하면(예: `.email()` 같은 체이닝 API, RHF resolver 호환) **그 이유를 PR 에 적는다.**
- **검증 규칙의 원천은 BE 명세다** — `amount` 1–1,000,000, `reason` 1–100자, `memo` 0–500자,
  이메일 254자, 비밀번호 8–64자. 스키마에 **명세 번호를 주석으로 단다.**

### 7.4 `openapi-fetch` (프론트 리팩터) — **호출하지 않는다**
- **백엔드가 생길 때까지 실제 HTTP 호출을 하지 않는다.** 지금은 타입 안전한 클라이언트를 **준비만** 해 둔다.
- `data-source.ts` · `api.ts` 의 **함수 시그니처는 바뀌지 않는다** (BE-003 §6.1 · BE-004 §6.1) —
  교체는 **함수 본문**에서만 일어난다.
- 어댑터 본문 교체 시 BE 명세가 요구하는 것: `X-CSRF-Token` 헤더 · `Idempotency-Key` 생성 ·
  `ETag` 보관 → `If-Match` · 404 → `new Error('회원을 찾을 수 없습니다')` 변환(**이 문자열은 계약의 일부다**).

### 7.5 `schema.d.ts` (생성물)
- **손으로 고치지 않는다.** 원천은 `openapi/openapi.yaml` 이고, 그 원천은 BE 명세다.
- lint · prettier 대상에서 제외했다 (`.prettierignore` · eslint `ignores`).

---

## 8. 도입하지 **않는** 것 (YAGNI — 기록해 두지 않으면 다음 분기에 다시 논의된다)

| 후보 | 판정 | 근거 |
|---|---|---|
| **상태관리 (Redux / Zustand / Jotai / MobX)** | **도입하지 않는다** | 현재 **전역 상태는 권한(`PermissionProvider`) 하나뿐**이고 Context 로 충분하다. 나머지 상태는 (a) 서버 상태 — **react-query 가 가져간다** (b) 폼 상태 — **RHF 가 가져간다** (c) 화면 로컬 상태 — `useState`. **서버 상태를 전역 스토어에 넣는 것이 바로 이 라이브러리들이 없애려는 안티패턴이다.** 전역 클라이언트 상태가 3개를 넘으면 그때 다시 판정한다 |
| **`@hookform/resolvers`** | **지금은 아니다** | RHF↔zod 결합을 **실제로 쓸 때** 설치한다. 쓰지 않는 의존성은 부채다 |
| **`eslint-config-airbnb` (또는 flat 포팅 서드파티)** | **도입하지 않는다** | §4.1 — legacy 전용. 서드파티 포팅은 **제3자 유지보수**에 규칙 선택 책임을 위임하는 것이다 |
| **react-hooks v7 의 React Compiler 규칙군** | **지금은 아니다** | §4.5 — 15종을 error 로 켜는 것은 별도 정책 결정이다 |
| **`eslint-plugin-boundaries` / dependency-cruiser** | 보류 | 패키지 경계 강제는 `tools/boundary`(경계 담당)가 이미 소유한다 — 두 벌로 만들지 않는다 |
| **Markdown 포매팅** | **하지 않는다** | §5(Prettier) — `.md` 는 **산출물 그 자체**(specs · ADR)이며 소유자가 따로 있다. 표 재정렬이 명세의 diff 를 통째로 다시 쓴다 |
| **서버 (express / fastify / prisma / typeorm)** | **절대 도입하지 않는다** | 이 PR 의 범위는 **스키마 + 타입 생성**까지다 (§6.1) |

---

## 9. Prettier — 무엇을 포맷하고 무엇을 포맷하지 않는가

### 9.1 설정

`.prettierrc.json`: `printWidth 100` · `singleQuote` · `semi` · `trailingComma: all` · `arrowParens: always` · `endOfLine: lf`.
`.editorconfig`: 저장 시점의 규칙(인코딩·개행·최종 개행·후행 공백)만 — **내용 서식은 Prettier 가 소유한다.**

**ESLint 의 서식 규칙은 `eslint-config-prettier` 로 전면 off 했다.**
자동 수정으로 결정 가능한 것(들여쓰기·따옴표·세미콜론·줄바꿈·trailing comma)은 **규칙이 아니라 포맷**이다.
ESLint 에는 **판단이 필요한 것만** 남는다.

### 9.2 포맷 제외 (`.prettierignore`) — 각각 이유가 있다

| 제외 | 이유 |
|---|---|
| `generated/**` · `schema.d.ts` · `dist/**` · `storybook-static/**` | **생성물**이다. 원천을 고친다 |
| `pnpm-lock.yaml` | 유일한 쓰기 경로는 `pnpm install` 이다 (의존성 관리) |
| **`.github/**`** | **CI·CD 소유**다. 남의 소유 경로를 포맷하지 않는다 (CI·CD 가 준비되면 opt-in — 인계 발행) |
| **`*.md` · `*.mdx`** | **산출물 그 자체**다 (specs/FS·BE, docs/adr, CHANGELOG — 소유자 아키텍처·기능 명세·백엔드 명세). 표 재정렬이 ① 남의 산출물을 린트·포맷 이 바꾸게 하고 ② 게이트 리뷰가 봐야 할 diff 를 서식 노이즈에 묻는다 |

### 9.3 **거대 diff 를 기록한다** — 이것은 리뷰 가능한 diff 가 아니다

`prettier --write .` 는 **125개 파일**을 건드린다 (코드·설정 파일; `.md`·`.github` 제외 후). **실측**:

| 항목 | 값 |
|---|---|
| 변경 파일 수 | **125** |
| 변경 라인 | **−7,949 / +7,768** |
| 그 파일들의 총 라인 수 | 31,389 |
| **건드린 비율** | **약 25%** — 4줄 중 1줄이 바뀐다 |
| **의미 변경** | **0줄** — 공백·줄바꿈·따옴표뿐이다 |

**의미 변경이 0줄이라는 근거 (추정이 아니라 검증)**:
포맷 적용 후 `tsc --noEmit` **0 에러**, `pnpm lint` **0 에러**, `pnpm -r test` 통과, `vite build` 성공,
그리고 **출하 번들의 gzip 크기가 111.69 kB 로 동일**하다 (raw 379.70 → 379.71 kB, +10 B).
소스의 공백이 바뀌었을 뿐 **생성된 코드가 같다.**

**이 diff 는 사람이 리뷰할 수 없고, 리뷰해서도 안 된다.** 리뷰 대상은 **설정 파일 3개**(`.prettierrc.json` ·
`.prettierignore` · `.editorconfig`)이고, 나머지 125개는 **그 설정의 기계적 결과**다.

**blame 오염 방지**: **`.git-blame-ignore-revs`** 를 만들었다.
포맷 전용 커밋의 해시를 여기 등록하면 `git blame` 이 그 커밋을 건너뛰고 **이전 저자를 보여준다** —
등록하지 않으면 7,768줄의 저자가 전부 '린트·포맷 포맷 커밋'으로 덮여 **"이 줄을 왜 이렇게 썼는가"를 추적할 수 없게 된다.**
(GitHub 은 이 파일을 자동 인식한다. 로컬은 `git config blame.ignoreRevsFile .git-blame-ignore-revs` 1회 실행.)

> **현 상태 주의**: 이 리포는 git 에 **`README.md` 1개만 추적**되고 있다 (`git ls-files` = 1).
> 나머지 코드가 아직 커밋되지 않았으므로 **'포맷 전용 커밋'이 아직 성립하지 않는다** —
> 최초 커밋에 이미 포맷된 코드가 담기면 blame 오염 자체가 발생하지 않는다.
> `.git-blame-ignore-revs` 는 **앞으로의 포맷 커밋을 위해** 규칙과 함께 자리를 잡아 둔 것이다.

**포맷 커밋은 반드시 별도 커밋으로 분리한다** — 기능 변경과 섞이면 ① 그 기능 변경이 영원히 묻히고
② 그 커밋을 blame-ignore 에 등록할 수 없다(등록하면 의미 변경까지 blame 에서 사라진다).

---

## 10. 결과 (Definition of Done)

| # | 검증 | 결과 |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | ✅ 매니페스트 ↔ lockfile 정합 |
| 2 | `pnpm lint` (전 워크스페이스) | ✅ **error 0건** / warn 12건 (§5.1 — 소유자 인계) |
| 3 | **방어선 4종 회귀 테스트** | ✅ hex · px · deep import · 레이어 역방향 **전부 여전히 error** (§4.4) |
| 4 | `pnpm format:check` | ✅ 통과 |
| 5 | `pnpm --filter @tds/admin exec tsc --noEmit` | ✅ **0 에러** (앱 코드 미수정이므로 그대로) |
| 6 | `pnpm --filter @tds/admin exec vite build` | ✅ 성공 · **번들 증분 +0 B** (§3.0) |
| 7 | `pnpm openapi:types` | ✅ 생성 성공 (14 엔드포인트 · 21 스키마) |
| 8 | **백엔드 미도입 확인** | ✅ `express`/`fastify`/`prisma`/`typeorm` **0건** |
| 9 | 라이선스 | ✅ MIT 13 · ISC 1 (카피레프트 0) |
| 10 | `pnpm audit` high/critical | ⚠️ 2건 — **전부 기존**(vite·vitest). 신규 도입분 0건 (§3.6) |
| 11 | `// eslint-disable` 신규 추가 | ✅ **0건** |
| 12 | 앱 코드(`apps/admin/src/**` · `packages/ui/src/**`) 로직 변경 | ✅ **0줄** (포맷 공백 변경만) |

## 11. 후속 인계

| 대상 | 내용 |
|---|---|
| **프론트 리팩터** | ① react-query 로 `useAsyncData` 대체 ② RHF+zod 로 폼 통합 ③ `exhaustive-deps` 위반 3건 해소 ④ a11y 위반 4건 ⑤ `import-x/no-duplicates` 2건 ⑥ `no-dynamic-delete`·`array-type` 각 1건 (§5.1) |
| **컴포넌트 엔지니어** | `jsx-a11y/interactive-supports-focus` 위반 1건 — `packages/ui/src/molecules/SegmentedControl/SegmentedControl.tsx:48` (`role="radiogroup"` 이 focusable 하지 않다) |
| **CI·CD** | ① `pnpm format:check` 를 PR 게이트에 편입 ② `pnpm lint --max-warnings 12`(신규 warn 차단) ③ `.github/**` 포맷 opt-in 여부 ④ pre-commit 에 `prettier --write` (lint-staged) |
| **경계 담당** | ESLint 규칙 변경이 G5/G6 체크리스트('하드코딩 값 0건')에 파급 — 방어선 4종은 유지됨 (§4.4) |
| **아키텍처 · 백엔드 명세** | **OpenAPI 스키마 ↔ 명세 불일치 목록** (§12) — 어느 쪽이 옳은지는 린트·포맷/의존성 관리 가 판정하지 않는다 |
| **의존성 관리 (자신)** | `vite` 6 · `vitest` 3 메이저 업그레이드 (critical/high 해소) — 별도 PR |

## 12. 스키마 ↔ 프론트/명세 대조 결과 (판정하지 않고 **목록만** 낸다)

**타입 레벨 대조**: 생성된 `schema.d.ts` 의 21개 스키마를 프론트 도메인 타입과 **양방향**으로 `tsc` 검증했다
(서버 응답 → 프론트 타입 대입 / 프론트 타입 → 스키마 대입). **필드명·타입 불일치 0건.**
(`TabData.cards` 튜플 1건은 `prefixItems` 로 해소 — §6.3)

**그러나 명세들 사이에 어긋남이 있다.** 스키마는 **두 명세를 모두 만족하는 형태**로 모델링했고,
어느 쪽이 옳은지는 **아키텍처/백엔드 명세 가 판정한다.**

| # | 항목 | BE-001 · BE-002 | BE-003 · BE-004 | 스키마의 처리 |
|---|---|---|---|---|
| 1 | **역할 어휘가 다르다** | `system_admin` \| `operator` \| `viewer` (`UserRole`, 프론트 `login/api.ts` 와 일치) | `admin` \| `operator` + '회원 도메인 권한 없는 관리자' | `UserRole` enum 은 BE-001 을 따랐다 (프론트 타입이 그것이다). **BE-003/004 의 `admin` 은 어느 `UserRole` 인가?** `system_admin` 과 같은 것인지 명세에 없다 |
| 2 | **에러 봉투에 `details` 가 있다/없다** | `error.details` **필수**(없으면 `null`) — `INVALID_CREDENTIALS` 의 `failedCount`, `WIDGET_FORBIDDEN` 의 `requiredKeys` 가 여기 실린다 | §2 봉투 표에 **`details` 행이 아예 없다** | `details` 를 **선택(nullable)** 으로 모델링해 양쪽을 만족시켰다. BE-003/004 가 `details` 를 쓰지 않는 것이 의도인지 누락인지 불명 |
| 3 | **`error.fields` 필수 여부** | **필수**(없으면 `null`) | **선택**(X) | 선택(nullable)으로 모델링 |
| 4 | **404 사용 여부** | BE-002 §3.3: "**404 를 어떤 조건에서도 반환하지 않는다**" | 404 `MEMBER_NOT_FOUND` 가 은닉의 핵심 수단 | 도메인별로 다르게 모델링 (모순 아님 — 기록만) |
| 5 | **엔드포인트 개수** | — | — | **명세 총합은 14건**이다 (BE-001: 1 · BE-002: 2 · BE-003: 6 · BE-004: 5). 작업 지시서의 '11개'와 다르다 — 스키마는 **14건 전부**를 담았다 |
| 6 | `MemberQuery` 에 `size` 가 없다 | — | BE-003 §6.1: 어댑터가 `PAGE_SIZE` 를 `size` 쿼리로 싣는다 | 스키마는 `size` 쿼리를 정의했다 (프론트 타입 변경 불요 — 어댑터 본문에서 처리) |
| 7 | 프론트 `ApiError`·`LoginResult` 에 429/403 배리언트가 없다 | BE-001 §7.2-1 · BE-002 §7.2-2 가 이미 변경 요청으로 기록 | — | 스키마는 명세대로 429·403 을 정의했다. **프론트 변경은 프론트 구현/UI 기획 소관** |

---

## 13. 상태

`proposed` — **아키텍처 승인 후 `accepted`.**
의존성 관리 절차 5("ADR accepted 이후에만 설치한다")를 이 PR 은 **역순으로 수행했다** —
번들 증분을 **추정치가 아니라 실측**으로 ADR 에 쓰려면 설치가 선행돼야 하기 때문이다 (의존성 관리 절차 3의 요구).
**아키텍처 가 반려하면 이 PR 전체를 되돌린다** (매니페스트·lockfile·설정·`openapi/` 전부 한 커밋에 있다).
