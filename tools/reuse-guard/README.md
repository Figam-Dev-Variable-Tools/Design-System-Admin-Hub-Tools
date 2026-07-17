# @tds/reuse-guard — 중복 컴포넌트 차단 + 모듈 추출 스캐너

> 담당: 재사용 가드 (Layer 3 · Verification)
> 근거: `docs/architecture/org-design-v2.md` §3 · §7.2 · §13,
> `docs/tds/guidelines/page-module-pipeline.md` §2-②
> 차단 규칙: **유사도 >= 85% → 신규 생성 차단(EXTEND 강제)**. G0에서 사전 조회 필수 — 판정 없이 신규 계약 생성 금지

## 모드

| 모드 | 명령 | 용도 |
|---|---|---|
| `check` | `pnpm reuse:check -- --name <이름> [--props a,b,c]` | G0 신규 컴포넌트 요청을 기존 계약과 비교해 사전 판정 |
| `scan` | `pnpm --filter @tds/reuse-guard run scan` | **page-module-pipeline ② 단계 도구** — 어드민 페이지를 조사해 공통 모듈 후보 추출 |

## check 모드 — 신규 컴포넌트 사전 판정

```bash
# 권장 (pnpm 은 run 뒤 인자를 스크립트에 그대로 전달한다)
pnpm --filter @tds/reuse-guard run check --name StatusFilter --props options,value,multiple,onChange

# 루트 스크립트 경유
pnpm reuse:check -- --name StatusFilter --props options,value,multiple,onChange

# props 없이 이름만으로 조회
pnpm --filter @tds/reuse-guard run check --name Buttom
```

| 인자 | 필수 | 설명 |
|---|---|---|
| `--name <이름>` | O | 신규 컴포넌트명 (PascalCase 권장) |
| `--props a,b,c` | X | 신규 컴포넌트의 prop 이름 목록 (콤마 구분) |

### 알고리즘

기존 `contracts/*.contract.json` 전체와 비교해 후보별 종합 유사도를 계산한다.

```
종합 유사도 = 0.4 × 이름 유사도 + 0.6 × props 유사도

이름 유사도  = 1 - levenshtein(lower(a), lower(b)) / max(len)   (레벤슈타인 정규화)
props 유사도 = |A ∩ B| / |A ∪ B|                                 (집합 자카드, 대소문자 무시)
```

`--props` 미제공 시 **이름 단독 모드**로 동작한다 (자카드를 0으로 두면 동명 컴포넌트조차
차단하지 못하므로, 이름 유사도 단독을 종합 점수로 사용). 정밀 판정을 위해 props 제공을 권장한다.

### 판정 (최고 점수 기준)

| 종합 유사도 | 판정 | 의미 |
|---|---|---|
| >= 85% | `CREATE_BLOCKED` | 신규 생성 차단 — 기존 컴포넌트 **EXTEND 강제**. 계약 엔지니어에 변경 요청 발행 (G3 재진입) |
| 60% ~ 85% | `EXTEND_RECOMMENDED` | 확장 우선 검토. 신규 생성하려면 근거를 Screen Spec 에 기록 |
| < 60% | `CREATE_OK` | 신규 계약 생성 진행 가능 |

비교할 계약이 하나도 없으면(부트스트랩 단계) `CREATE_OK`.

### 산출물

| 경로 | 내용 |
|---|---|
| `reports/reuse/<name>.json` | 판정 + 상위 5개 후보의 점수 분해 (기계 판독용 — Task Graph 첨부) |
| `reports/reuse/<name>.md` | 판정 요약 + 후속 조치 안내 (G1 Screen Spec 첨부용) |

### 종료 코드

| 코드 | 의미 |
|---|---|
| 0 | `EXTEND_RECOMMENDED` 또는 `CREATE_OK` |
| 1 | `CREATE_BLOCKED` — 신규 생성 차단 |
| 2 | 사용법 오류(`--name` 누락) 또는 실행 오류 |

## scan 모드 — 모듈 추출 스캐너 (page-module-pipeline ② 단계 도구)

어드민 페이지 구축(①) 완료 후 **각 페이지를 조사해 공통 모듈 후보를 찾는
② 페이지 조사 · 공통 모듈 후보 추출** 단계(`docs/tds/guidelines/page-module-pipeline.md`)를
자동화한다. 산출 리포트는 ③ 단계(모듈 후보별 G0 접수)의 입력값이며,
**이 리포트 없이 신규 모듈 계약(G3)을 생성하는 것은 금지**된다.

```bash
pnpm --filter @tds/reuse-guard run scan

# 최소 출현 수 조정 (기본 2)
pnpm --filter @tds/reuse-guard run scan --min 3
```

### 동작

1. `apps/<app>/src` 아래 `.tsx` 전체를 **간이 JSX 토크나이저**(`src/lib/jsx.ts` — 외부 파서
   의존성 0)로 파싱한다 (`.test/.spec/.stories.tsx` 제외).
2. JSX 엘리먼트 시그니처를 정규화(태그 구조 + 주요 속성 키 — `key`/`ref`/스프레드 제외)하고
   파일 간 반복 출현을 집계한다.
   - 동일 시그니처끼리 묶고, **유사 구조**(태그 골격 동일 + 위치-속성 키 자카드 >= 60%)는 병합
   - 외부 패키지 import 컴포넌트(react-router 의 `Route` 등)는 후보에서 제외 —
     앱 로컬 컴포넌트와 `@tds/*` 는 유지 (후자는 REUSE 판정 대상)
   - 더 큰 반복 구조의 출현 범위 안에만 나타나는 하위 구조는 별도 후보로 보고하지 않음
3. 동일/유사 구조가 **2회 이상** 출현하면 모듈 후보로 판정하고, 구조 기반 후보명 제안 ·
   출현 위치(파일:라인) · 제안 atomic level · 기존 계약 유사도(check 와 동일한 similarity
   로직 재사용)를 병기한다.

### 제안 레벨 (Storybook 카테고리 판정 기준과 정렬)

| 구조 깊이 | 제안 레벨 |
|---|---|
| 1 (리프) | `atom` |
| 2 | `molecule` |
| 3+ | `organism` |

### 권고 (기존 계약과의 최고 유사도 기준)

| 계약 유사도 | 권고 | 의미 |
|---|---|---|
| >= 85% | `REUSE` | 기존 컴포넌트 소비로 교체 — 페이지 사본 잔존은 중복률 SLO(<= 3%) 위반 |
| 60% ~ 85% | `EXTEND` | 기존 계약 확장 검토 — 계약 엔지니어에 변경 요청 (G3 재진입) |
| < 60% | `CREATE` | 신규 모듈 후보 — 후보 1건 = 1 Task 로 G0 접수 후 check 모드로 정밀 판정 |

스캔 후보의 속성 키는 계약 props 만큼 정제되어 있지 않으므로 이름 단독 유사도를 하한으로
사용하며, G0 접수 시 `check` 모드로 정밀 판정을 다시 받는다.

### 산출물

| 경로 | 내용 |
|---|---|
| `reports/reuse/module-candidates-<YYYY-MM-DD>.json` | 후보 전체 구조 데이터 (기계 판독용 — ③ Task 분해 입력) |
| `reports/reuse/module-candidates-<YYYY-MM-DD>.md` | 후보 표(후보명/출현 수/위치/제안 레벨/계약 유사도/권고) + 상세 + 후속 조치 |

### 종료 코드

| 코드 | 의미 |
|---|---|
| 0 | 정상 (후보 유무 무관 — 스캔은 게이트가 아니라 ③ G0 접수의 입력값 생성) |
| 2 | 실행 오류 |

### 한계 (간이 토크나이저)

- 정규식/문자 스캐너 기반이라 완전한 TSX 파서가 아니다: 속성 값 표현식 내부의 JSX,
  템플릿 리터럴 표현식 내부의 JSX 는 구조 집계에서 제외된다.
- children 표현식(`{list.map(...)}` 등) 내부의 JSX 는 부모 시그니처에 포함하지 않고
  **독립 구조**로 집계한다 (조건부/반복 렌더링은 출현 횟수가 가변이므로).
- 후보명은 구조(커스텀 컴포넌트명 → 정적 className 최빈 토큰 → 태그 조합) 기반 **제안**일 뿐
  확정 명칭이 아니다 — G0 접수 시 네이밍 가드 규칙에 따라 재검토한다.

## 경계 (Hard Boundary)

- 본 도구는 **판정/제안만** 한다 — 계약/코드를 생성·수정하지 않는다 (P1 단일 소유권).
- 리포트 경로 `reports/reuse/**` 는 재사용 가드 소유.
- 판정에 대한 이의는 오케스트레이터 에스컬레이션으로만 해소한다 — 가드 우회 금지 (§13: 유사도 85% 이상은 확장 강제).
