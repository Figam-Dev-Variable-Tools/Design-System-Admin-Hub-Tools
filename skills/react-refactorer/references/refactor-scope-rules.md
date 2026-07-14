# 리팩터 범위 규칙 (A41 Frontend Engineer (Senior) 참고 문서)

> 원천: `orchestration/registry/agents.json` A41 notes ("동작 변경 금지 — 리팩터만. 신규 기능이 필요하면 A40에 반환"),
> `docs/adr/0007-frontend-seniority-split.md` (A40 중급 = 구현 / A41 고급 = 검수·리팩터 + 라이브러리·OpenAPI 집행),
> `docs/adr/0006-infra-agents-and-toolchain.md` (A80 정책 · A83 측정 · 페이지 간 결합 부채).

## 0. 리팩터의 경계 — 한눈에

| 축 | **바꿔도 되는 것** (in-scope) | **바꾸면 안 되는 것** (out-of-scope → 반환) |
|---|---|---|
| **동작** | 없음 — 동작은 **보존 대상**이다 | 렌더 결과 · 이벤트 반응 · 네트워크 호출 · 계약 준수. 버그조차 고치지 않는다 → **A40** |
| **구조** | 파일 배치 · 함수/훅/컴포넌트 추출 · 중복 통합 · 추상화 제거 | 계약이 정의한 컴포넌트 경계 (props · events · states) → **A18** |
| **이름** | 변수 · 함수 · 훅 · 컴포넌트 · 파일 (naming:check 통과 시) | 계약에 정의된 prop/이벤트 이름 · 사용자에게 보이는 텍스트·라벨 |
| **타입** | 수동 선언 → **생성 타입**(계약 codegen · OpenAPI)으로 치환 | 생성물 자체를 손으로 수정 (스키마를 고친다) |
| **의존성** | ADR이 `accepted`인 라이브러리를 **앱 코드에 적용** | `package.json` · lockfile 편집, ADR 없는 도입, 라이브러리 **선택 변경** → **A80** |
| **테스트** | 리팩터로 위치가 바뀐 import 경로 갱신 | 기대값 수정 · 약화 · 삭제 — **동작 보존의 증거를 파괴하는 행위** |
| **판정 근거** | A83 측정 위반(`reports/code-quality/`) · SOLID/DRY/KISS/YAGNI 위반 | **"내가 보기에 별로다"** — 취향은 근거가 아니다 |
| **소유 경로** | `apps/*/src/**` | `packages/ui/**`(A30/A31/A32) · `contracts/**`(A18) · `tokens/**`(A20) · `package.json`(A80) · `eslint.config.*`(A81) · `reports/code-quality/**`(A83) |

## 1. 원칙 — 관찰 가능한 동작 보존

**관찰 가능한 동작**의 정의:

- 렌더 결과 (DOM 구조 · 접근성 트리 · 화면에 보이는 내용)
- 이벤트 처리 결과 (클릭/키보드/포커스에 대한 반응, `events.blockedWhen` 차단 동작 포함)
- 네트워크 호출 (엔드포인트 · 페이로드 · 호출 조건)
- 계약(contract) 준수 상태 — props · 이벤트 · states의 의미

**리트머스 테스트**: *기존 테스트를 한 글자도 고치지 않고 전부 통과하는가?*
테스트를 고쳐야 통과한다면 그것은 동작 변경이며, 이 스킬의 범위 밖이다.

> **라이브러리 교체에도 이 원칙이 그대로 적용된다.** 수제 `useAsyncData`를 `useQuery`로 바꿔도
> 화면이 보여주는 것과 호출하는 엔드포인트는 **동일해야** 한다. 캐싱·재시도로 **호출 횟수·타이밍이 달라지면**
> 그것은 동작 변경이다 — ADR에 그 변화가 명시되어 있어야 하고, 없으면 A80에 확인한다.

## 2. 허용되는 변환 (in-scope)

| 변환 | 조건 |
|---|---|
| 이름 변경 (변수/함수/훅/컴포넌트/파일) | 네이밍 규칙 통과 (`pnpm naming:check`) |
| 함수/훅/하위 컴포넌트 추출 | 렌더 결과 동일 |
| 중복 로직/JSX → 공용 훅·유틸 통합 (DRY) | 3회 이상 반복 + 의미가 진짜로 동일할 때만 (**같은 이유로 함께 변하는가**) |
| dead code · 미사용 import · 주석 처리 코드 제거 (YAGNI) | **계약에 정의된 항목은 제외** |
| 수동 타입 선언 → 계약 생성 타입 치환 | G6 체크리스트 정합 (적극 권장) |
| **수동 타입 선언 → OpenAPI 생성 타입 치환** | 스키마 확정 + 생성 파이프라인 등록 완료 (스크립트 등록은 A80) |
| **수제 코드 → ADR accepted 라이브러리 치환** | 관찰 가능한 동작 동일 + **§6 잔해 제거 체크리스트 전항 통과** |
| 파일/폴더 재배치 | 레이어 의존 규칙 · public entry 규칙 유지 |
| **페이지 간 import 해소 → `shared/ui` 승격** | 승격된 모듈이 **도메인을 모름**(도메인 값은 prop 주입) · 원본 사본 삭제 |
| **공통 모듈의 도메인 누수 제거** | 도메인 타입/상수를 prop으로 주입 전환 — 렌더 결과 동일 |
| `React.memo` / `useMemo` / `useCallback` 정리(추가·제거) | 렌더 **결과** 동일 — 렌더 횟수 등 성능 특성만 변화 |
| 조건 로직의 등가 단순화 | 진리표 동일 (드모르간, early return 등) |
| 하드코딩 값 → 토큰 참조 치환 | 시각 결과 동일 (동일 토큰 값일 때만) |

## 3. 금지되는 변환 (out-of-scope → 반환)

| 변환 | 사유 | 반환 대상 |
|---|---|---|
| prop · 이벤트 · 상태의 추가/제거/의미 변경 | 기능 변경 (계약 사안) | A18 / A40 |
| 조건부 렌더의 분기 **결과** 변경 | 동작 변경 | A40 |
| API 엔드포인트 · 페이로드 · 에러 처리 변경 | 동작 변경 | A40 |
| 버그 수정 | 동작 변경 — 발견 즉시 handoff | A40 |
| **신규 라이브러리 의존성 추가 · 버전 변경 · 라이브러리 교체 결정** | 도입은 **정책**이다 — ADR 사안 (번들 예산 gzip +2KB 포함) | **A80** |
| **백엔드/서버 구현 · 목 서버 상주화 · 엔드포인트 신설** | **조직의 절대 조건** — 프론트는 서버를 구현하지 않는다 | A63 (명세) |
| **생성물 수동 편집** (`packages/ui/generated/**`, OpenAPI 생성 타입) | 다음 생성에서 덮어써진다 — 스키마를 고쳐야 한다 | A18 / A63 |
| 테스트 수정 · 삭제 · 기대값 변경 | 동작 보존 증거 파괴 | — (금지) |
| **취향 기반 변경** (이름이 마음에 안 듦, 구조가 어색함) | 근거 없는 diff — 회귀 위험만 증가 | — (금지) |
| `packages/ui/**` · `contracts/**` · `tokens/**` · `package.json` 수정 | 소유권 위반 (A30/A31/A32 · A18 · A20 · A80) | 각 소유자 |
| 텍스트 · 라벨 · 문구 변경 | 렌더 결과 변경 | A40 |

## 4. A40 반환 절차 (신규 기능 필요 / 버그 발견 시)

1. 해당 파일에 대한 리팩터 변경을 **되돌린다** — 리팩터 커밋과 기능/수정 커밋을 절대 섞지 않는다
2. handoff envelope 작성 → `orchestration/tasks/TASK-YYYY-MMDD-NNN.json` (handoff.v1.json 준수):

```jsonc
{
  "id": "TASK-2026-0714-042",
  "type": "handoff",
  "from": "A41",
  "to": "A40",
  "gate": "G6",
  "subject": "UserTable 리팩터 중 기능 결함 발견 — 반환: 삭제 확인 모달 미구현 (SCR-014 4.2절 요구)",
  "target": "UserTable@1.2.0",
  "artifacts": ["apps/admin/src/pages/users/UserTable.tsx"],
  "preconditions_met": {
    "contract_approved": true,
    "contract_version": "1.2.0",
    "tokens_available": true
  },
  "automated_checks": { "test": "pass (반환 시점 green)", "lint": "pass" },
  "blockers": [
    { "reason": "신규 기능(확인 모달)은 A41 범위 밖 — 동작 변경 금지 원칙", "owner": "A40" }
  ],
  "sla_hours": 4,
  "escalation_count": 0
}
```

3. A00에도 동일 envelope 참조로 통보 (Task Graph 갱신 주체는 A00)
4. 반환 대상과 무관하게 계속 진행 가능한 리팩터 범위가 남으면 분리해서 진행하고, 없으면 작업을 종료한다

## 5. 커밋 규율

- 한 커밋 = 한 변환 유형 (예: "extract hook", "rename", "dedupe", "replace useAsyncData with useQuery")
- 커밋 메시지는 `refactor:` prefix + 변환 유형 명시
- **라이브러리 교체는 라이브러리 1개 = 커밋 1개** — 여러 개를 한 커밋에 섞으면 회귀 원인을 못 찾는다
- 모든 커밋 시점에 테스트 green — 중간 상태로 커밋하지 않는다

## 6. 라이브러리 교체 시 잔해 제거 체크리스트

> **두 벌은 한 벌보다 나쁘다.** 라이브러리를 넣고 수제 코드를 남기면, 다음 사람은 어느 쪽을 써야 할지 모른다.
> 아래를 **전항 통과**하지 못하면 그 교체는 완료가 아니다 (DoD: 잔해 0).

### 6.1 적용 범위표를 먼저 그린다 (코드 수정 전)

| 파일 | 현재 (수제) | 대체 (라이브러리) | 삭제 대상 | 확인 |
|---|---|---|---|---|
| `pages/members/MemberList.tsx` | `useAsyncData` 호출 | `useQuery` | — | ☐ |
| `hooks/useAsyncData.ts` | 수제 비동기 훅 | — | **파일 삭제** | ☐ |
| `pages/admins/validate.ts` | 수동 검증 분기 | `zod` 스키마 | **파일 삭제** | ☐ |
| `types/api.ts` | 손으로 쓴 응답 타입 | OpenAPI 생성 타입 | **파일 삭제** | ☐ |

### 6.2 잔해 유형별 체크

| # | 잔해 유형 | 확인 방법 | 통과 기준 |
|---|---|---|---|
| 1 | **수제 훅** (`useAsyncData`, `useFetch`, `useDebounce` 등 라이브러리가 대체하는 것) | `Grep` 사용처 · `pnpm quality:check`(A83 축3 미사용 export) | 파일 삭제 완료 · 사용처 0 |
| 2 | **수동 검증 로직** (if 분기 검증, 정규식 산재, 커스텀 에러 메시지 조립) | Grep + 스키마 라이브러리 도입 범위 대조 | 스키마 1곳으로 통합 · 옛 분기 삭제 |
| 3 | **손으로 쓴 API 타입** (`interface UserResponse`, `type ApiError`) | Grep `interface .*Response` / `type .*Payload` | OpenAPI 생성 타입으로 전량 치환 · 수동 선언 0건 |
| 4 | **수제 상태 관리** (전역 Context + reducer 조합을 라이브러리가 대체) | import 그래프 | 옛 Provider/Context 제거 · 이중 상태원 0 |
| 5 | **수제 유틸** (`formatNumber`, `debounce`, `deepClone` 등 라이브러리 동등 함수) | Grep · 동작 동등 확인 | 동작이 **정확히 같을 때만** 치환 · 다르면 남기고 근거 기록 |
| 6 | **어댑터 껍데기** (교체 후 남은 wrapper — 이제 그냥 pass-through) | 호출 체인 추적 | pass-through wrapper 제거 (격리 목적의 어댑터는 **유지** — A80 지시 확인) |
| 7 | **주석 처리된 옛 구현** ("// 기존 방식 — 나중에 제거") | Grep 주석 블록 | 0건. "나중에"는 오지 않는다 |
| 8 | **미사용 import · 미사용 파일** | `pnpm lint` · `pnpm quality:check`(A83 축3) | 0건 |
| 9 | **문서·주석의 옛 사용법 안내** (`apps/*/src` 내 JSDoc·README 주석) | Grep | 새 라이브러리 사용법으로 갱신 (앱 밖 문서는 A60에 handoff) |
| 10 | **옛 의존성이 이제 미사용** | `pnpm why <pkg>` · Grep | **직접 제거하지 않는다** — 사용처 0건임을 확인해 **A80에 제거 요청** (`package.json`은 A80 소유) |

### 6.3 완료 판정

- ☐ 적용 범위표의 **삭제 대상이 전부 삭제**됨 (사용처 0건 확인 후)
- ☐ **같은 일을 하는 두 벌의 코드가 없다** — 수제/라이브러리 병존 0건
- ☐ 기존 테스트 **무수정** 전원 통과 (동작 회귀 0)
- ☐ `pnpm quality:check` (A83) 위반 0 · `pnpm lint` 0 · `pnpm build` pass
- ☐ `pnpm perf` — 번들 증분이 **A80 ADR의 예상치 이내** (초과 시 A80에 통보: ADR의 번들 비용 항목이 틀렸다는 뜻)
- ☐ 미사용이 된 옛 의존성 목록을 **A80에 제거 요청**으로 전달
- ☐ 적용 범위표를 review_request envelope에 첨부 → **A42 G6 검수**
