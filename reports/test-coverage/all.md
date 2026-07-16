# Test Coverage 리포트 — all

> 생성: `@tds/test-coverage` (A77 Test Coverage Guard) — 기계 생성 전용, 수기 편집 금지
> 커밋되는 기준선이다 — **커버리지가 실제로 바뀔 때만 바뀐다.** 실행 시각은 여기 없다(콘솔/tmp 참조).
> **커버리지는 라인 %가 아니다.** 계약이 정의한 상태 전부 + FS가 정의한 예외 축 전부다.

- 판정: **WARN** (exit 0) — blocker 0건 · major 2105건
- 입력: 계약 37종 · FS 14건 · 테스트 파일 110개 · 스토리 파일 47개
- **단언을 가진 실행 단위(= 테스트): 1129건** / 단언 없는 실행 단위: 4건

## 축별 요약

| # | 축 | 심각도 | 커버 | 전체 | 미커버 | 임계값 | 게이트 | 판정 |
|---|---|---|---|---|---|---|---|---|
| 1 | 테스트 존재 (워크스페이스 스코프별 · 단언을 가진 실행 단위) | **blocker** | 2 | 2 | 0 | 스코프마다 >= 1건 | G5·G6 | PASS |
| 2 | 계약 states 커버리지 (contracts/*.contract.json → states[]) | **blocker** | 109 | 109 | 0 | 미커버 상태 0건 (전수) | G5·G6 | PASS |
| 3 | 계약 events.blockedWhen 커버리지 (금지 동작의 비발생 단언) | **blocker** | 17 | 17 | 0 | 미커버 차단 조건 0건 (전수) | G5·G6 | PASS |
| 4 | FS 예외 7축 커버리지 (요소 × 축 격자 — 동작이 정의된 칸만 · 래칫) | major | 137 | 2240 | 2103 | 미커버 칸 0건 (major) · **커버 칸 수 후퇴 = blocker** | G6 | VIOLATED |
| 5 | 검증 도구의 골든 픽스처 (codegen · contract-test) | major | 0 | 2 | 2 | 도구당 골든 픽스처 >= 1건 | G5·G6 | VIOLATED |

### 축 1 — 스코프별 (워크스페이스 파생)

`pnpm-workspace.yaml` 에서 파생한다 — 새 앱/패키지는 자동 편입된다. **한쪽의 초록이 다른 쪽의 빈칸을 가리지 못한다.**

| 스코프 | 경로 | 테스트 (단언 有) | 단언 없는 실행 단위 | 판정 |
|---|---|---|---|---|
| @tds/admin | `apps/admin` | **650** | 1 | PASS |
| @tds/ui | `packages/ui` | **416** | 3 | PASS |

### 축 4 — 래칫 (후퇴 금지)

- 기준선 **137칸** · 현재 **137칸** → 후퇴 없음
- 기준선 출처: `reports/test-coverage/all.json`
- 축 4는 major 다 — **새 테스트를 요구하지 않는다.** 그러나 **있던 커버리지를 잃으면 blocker** 다. 커버 칸 수는 단조 증가만 한다.

## 단언 없는 실행 단위 — 4건 (테스트로 세지 않는다)

`expect` 가 없는 play function 은 **실패할 수 없다.** 실패할 수 없는 것은 검증하지 않는다 —
`--passWithNoTests` 가 공집합 위에서 참인 것과 같은 종류의 초록불이다. 상태를 *만들기만* 하고 아무것도 단언하지 않는다.

| 파일 | 단언 없는 단위 |
|---|---|
| `packages/ui/src/atoms/HelpTip/HelpTip.stories.tsx` | 2건 |
| `apps/admin/src/shared/token-guard.test.ts` | 1건 |
| `packages/ui/src/foundations/TokenGuard.test.ts` | 1건 |

## 축 4 — FS 예외 7축 커버리지 (요소 × 축 격자 — 동작이 정의된 칸만 · 래칫) (2103건, major)

| 원천 | 덮이지 않은 항목 | 기대 테스트 이름 |
|---|---|---|
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-001 × 빈 상태 | `FS-012-EL-001: 빈 상태 — 매치 0건이면 빈 상태(FS-012-EL-008)` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-001 × 로딩 | `FS-012-EL-001: 로딩 — 250ms 디바운스 후 조회. 조회 중 키워드 변경 시 이전 요청 취소` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-001 × 실패 | `FS-012-EL-001: 실패 — 조회 실패 시 FS-012-EL-009 로 대체. 입력값 유지` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-001 × 유효성 | `FS-012-EL-001: 유효성 — 자유 텍스트, 제약 없음. 앞뒤 공백 제거. 빈 문자열이면 조건 없음` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-001 × 경합 | `FS-012-EL-001: 경합 — 조회 시점만 반영` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-001 × 대량 | `FS-012-EL-001: 대량 — 매치 10건 초과 시 페이지네이션` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-002 × 빈 상태 | `FS-012-EL-002: 빈 상태 — 해당 위치 0건이면 빈 상태` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-002 × 로딩 | `FS-012-EL-002: 로딩 — 변경 시 진행 중 조회 취소 후 재조회` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-002 × 실패 | `FS-012-EL-002: 실패 — 조회 실패 시 FS-012-EL-009 로 대체` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-002 × 경합 | `FS-012-EL-002: 경합 — 조회 시점만 반영` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-002 × 대량 | `FS-012-EL-002: 대량 — 결과 10건 초과 시 페이지네이션` |
| `specs/content/banners/FS-012-banners.md` | FS-012-EL-004 × 빈 상태 | `FS-012-EL-004: 빈 상태 — 0건이면 '전체 0건'` |
| … 외 **2091건** | 전수 목록은 JSON 리포트 `gaps[]` 참조 | |

## 축 5 — 검증 도구의 골든 픽스처 (codegen · contract-test) (2건, major)

| 원천 | 덮이지 않은 항목 | 기대 테스트 이름 |
|---|---|---|
| `tools/codegen` | tools/codegen · 골든 픽스처 0건 · 도구 테스트 0건 | `tools/codegen/src/__fixtures__/<case>/{input,expected} + tools/codegen/src/<axis>.test.ts` |
| `tools/contract-test` | tools/contract-test · 골든 픽스처 0건 · 도구 테스트 0건 | `tools/contract-test/src/__fixtures__/<case>/{input,expected} + tools/contract-test/src/<axis>.test.ts` |

## SKILL ↔ 레지스트리 불일치 (A01 판정 요청 — 도구가 임의 해소하지 않는다)

- **[A01 판정 완료]** SKILL 축 5 vs 레지스트리 `blockCondition`: **레지스트리가 정본**이라는 판정을 받았다. 축 5는 **major 유지**. `skills/test-coverage-guard/SKILL.md` 의 측정 기준 표를 레지스트리에 맞춰 수정 완료 — 도구가 blocker 를 발명하지 않는다는 원칙이 확인됐다.

## 자기 감사 — 이 도구가 공허 통과할 수 있는 경로

검증기를 검증하는 자가 없다는 것이 이 조직의 반복 패턴이다. A77은 자기 한계를 스스로 신고한다.

- 대조 키는 **테스트 이름**이다. 이름이 계약 상태·FS 요소 번호를 인용하지 않으면 이 도구는 그것을 "없는 것"으로 센다 — 거짓 음성(실제로 검증했는데 미커버로 셈)이 가능하다. 반대로 **이름만 맞고 단언이 엉뚱한 테스트**는 커버로 세어질 수 있다 — 거짓 양성이다. 도구는 단언의 **존재**를 보지만 단언의 **내용이 옳은지**는 보지 않는다. 그 판정은 A33(G5)·A42(G6)의 사람 검수 몫이다.
- 축 3(blockedWhen)만 예외적으로 단언의 **종류**까지 본다 (비발생 단언 필수). 금지 동작은 렌더 단언으로 증명되지 않기 때문이다.
- 축 4의 대조 격자는 FS §4 예외 표에서 파생된다. **A62가 동작 칸을 N/A 로 바꾸면 대조 대상이 줄어든다** — 커버리지 하한을 낮추는 우회로가 명세 쪽에 열려 있다. 이 경로는 A62의 서명 + A64(G9)의 검수를 지나야 하며, 도구는 요소별 N/A 수를 리포트에 남겨 그 변화를 추적 가능하게 만든다.
- `pnpm test` 의 exit code 를 읽지 않는다. 따라서 **테스트가 존재하지만 실패하는** 경우를 이 도구는 잡지 못한다 — 그것은 CI 의 test job (A82) 이 잡아야 한다. A77 은 "무엇이 검증되지 않았는가"를 재고, "검증된 것이 통과했는가"는 재지 않는다. **두 장치가 모두 있어야 게이트가 닫힌다.**
- `describe` 블록 이름은 대조에 쓰지 않는다 (테스트 이름만 본다). `describe('Button disabled')` + `it('does not fire')` 조합은 미커버로 셈될 수 있다 — A85 명명 규칙(접두를 테스트 이름에 박는다)이 이 한계를 전제로 만들어졌다.
- **[해소됨 — A00/A01 판정 1]** 이전 버전의 축 1은 **리포 전역 카운트**여서, A30이 `packages/ui` 에 테스트를 채우면 `apps/admin` 이 0건이어도 초록으로 바뀌었다 — 한쪽의 초록이 다른 쪽의 빈칸을 가렸다. 이제 축 1은 `pnpm-workspace.yaml` 에서 파생한 **스코프별로 독립 판정**한다. **남은 한계**: `e2e/` 는 워크스페이스 패키지가 아니므로 축 1의 스코프가 아니다 — e2e 커버리지는 축 4(major + 래칫)만 잰다. 즉 **e2e 테스트를 한 건도 쓰지 않아도 blocker 는 뜨지 않는다** (래칫 기준선이 0이므로 후퇴도 없다). A85가 첫 테스트를 쓰는 순간부터 래칫이 물린다.
- **[해소됨 — A00/A01 판정 1]** `tools/*` 는 워크스페이스 패키지지만 축 1의 스코프에서 **의도적으로 제외**했다 (lib/workspace.ts). 검증 도구의 테스트 요구는 축 5(골든 픽스처)가 담당하며, `tools/*` 11개를 축 1에 넣으면 레지스트리가 인가하지 않은 blocker 11건을 **도구가 발명하는 것**이 된다. 이 경계를 바꾸는 것은 A01의 ADR 사안이다.
- **축 4 래칫의 한계**: 기준선은 `reports/test-coverage/` 의 **직전 리포트 파일**에서 읽는다. 리포트가 삭제되면 기준선이 0으로 떨어져 **후퇴가 은폐된다.** `reports/**` 는 A77 소유이므로 다른 에이전트가 지울 수 없지만, **A77 자신이(또는 CI 캐시 초기화가) 지우면 래칫이 풀린다.** 항구적 방어는 기준선을 리포에 커밋된 파일로 유지하는 것이다 — A82가 CI에서 `reports/` 를 커밋/아티팩트로 보존하도록 배선해야 완성된다.

## 조치 주체

- A77은 **측정만** 한다 — 테스트를 대신 쓰지 않는다. 없다는 사실을 증명할 뿐이다.
  - `packages/ui/src/**/*.test.*` · `*.stories.tsx` play → **A30** / `apps/*/src/**/*.test.*` → **A40** / `e2e/**` → **A85**
- 하한 조정 요청은 **A01(ADR)**. 미달이 많다고 하한을 내리지 않는다.
- 계약 `states` 공백 → **A18** 경유 A19 / FS 예외 표 공백 → **A62** 경유 A64.
