# Test Coverage 리포트 — all

> 생성: `@tds/test-coverage` (테스트 커버리지 Test Coverage Guard) — 기계 생성 전용, 수기 편집 금지
> 커밋되는 기준선이다 — **커버리지가 실제로 바뀔 때만 바뀐다.** 실행 시각은 여기 없다(콘솔/tmp 참조).
> **커버리지는 라인 %가 아니다.** 계약이 정의한 상태 전부 + FSD §7 이 정의한 예외 상황 전부다.

- 판정: **WARN** (exit 0) — blocker 0건 · major 1385건
- 입력: 계약 55종 · FSD 화면 154건 · 테스트 파일 252개 · 스토리 파일 224개
- **단언을 가진 실행 단위(= 테스트): 3864건** / 단언 없는 실행 단위: 10건

## 축별 요약

| # | 축 | 심각도 | 커버 | 전체 | 미커버 | 임계값 | 게이트 | 판정 |
|---|---|---|---|---|---|---|---|---|
| 1 | 테스트 존재 (워크스페이스 스코프별 · 단언을 가진 실행 단위) | **blocker** | 2 | 2 | 0 | 스코프마다 >= 1건 | G5·G6 | PASS |
| 2 | 계약 states 커버리지 (contracts/*.contract.json → states[]) | **blocker** | 165 | 165 | 0 | 미커버 상태 0건 (전수) | G5·G6 | PASS |
| 3 | 계약 events.blockedWhen 커버리지 (금지 동작의 비발생 단언) | **blocker** | 26 | 26 | 0 | 미커버 차단 조건 0건 (전수) | G5·G6 | PASS |
| 4 | FSD §7 예외 처리 커버리지 (화면 ID × 예외 상황 격자 — 동작이 정의된 칸만 · 래칫) | major | 14 | 1397 | 1383 | 미커버 칸 0건 (major) · **커버 칸 수 후퇴 = blocker** | G6 | VIOLATED |
| 5 | 검증 도구의 골든 픽스처 (codegen · contract-test) | major | 0 | 2 | 2 | 도구당 골든 픽스처 >= 1건 | G5·G6 | VIOLATED |

### 축 1 — 스코프별 (워크스페이스 파생)

`pnpm-workspace.yaml` 에서 파생한다 — 새 앱/패키지는 자동 편입된다. **한쪽의 초록이 다른 쪽의 빈칸을 가리지 못한다.**

| 스코프 | 경로 | 테스트 (단언 有) | 단언 없는 실행 단위 | 판정 |
|---|---|---|---|---|
| @tds/admin | `apps/admin` | **2980** | 3 | PASS |
| @tds/ui | `packages/ui` | **810** | 6 | PASS |

### 축 4 — 래칫 (후퇴 금지)

- **이 수가 세는 것**: `fsd-screen-x-situation/v1` — FSD `docs/FSD/**` §7 예외 처리 표의 **(화면 ID × 예외 상황)** 칸 중 명세가 `해당 없음` 으로 선언하지 않은 것. 라인 %가 아니다.
- 기준선 **14칸** · 현재 **14칸** / 분모 **1397칸** → 후퇴 없음
- 기준선 출처: `reports/test-coverage/all.json`
- 축 4는 major 다 — **새 테스트를 요구하지 않는다.** 그러나 **있던 커버리지를 잃으면 blocker** 다. 커버 칸 수는 단조 증가만 한다.
- 분모도 함께 지킨다: §7 의 칸을 `해당 없음` 으로 바꾸거나 12상황의 행을 지우면 **명세 표면 축소 major** 가 뜬다 — 테스트 없이 커버리지를 올리는 길을 막는다.

## 단언 없는 실행 단위 — 10건 (테스트로 세지 않는다)

`expect` 가 없는 play function 은 **실패할 수 없다.** 실패할 수 없는 것은 검증하지 않는다 —
`--passWithNoTests` 가 공집합 위에서 참인 것과 같은 종류의 초록불이다. 상태를 *만들기만* 하고 아무것도 단언하지 않는다.

| 파일 | 단언 없는 단위 |
|---|---|
| `packages/ui/src/molecules/Menu/Menu.stories.tsx` | 4건 |
| `apps/admin/src/shared/crud/form-permission.test.tsx` | 2건 |
| `apps/admin/src/shared/token-guard.test.ts` | 1건 |
| `packages/ui/src/foundations/TokenGuard.test.ts` | 1건 |
| `e2e/FS-ai.spec.ts` | 1건 |
| `packages/ui/src/atoms/HelpTip/HelpTip.stories.tsx` | 1건 |

## 축 4 — FSD §7 예외 처리 커버리지 (화면 ID × 예외 상황 격자 — 동작이 정의된 칸만 · 래칫) (1383건, major)

| 원천 | 덮이지 않은 항목 | 기대 테스트 이름 |
|---|---|---|
| `docs/FSD/_common/pop-log-payload.md` | POP-COMMON-LOG-PAYLOAD × 조회 결과 없음 | `POP-COMMON-LOG-PAYLOAD / 조회 결과 없음 — 이 팝업에는 성립하지 않는다 — 열려면 행이 있어야 한다. 목록이 비었을 때의 안내는 부모 로그 화면의 것이` |
| `docs/FSD/_common/pop-log-payload.md` | POP-COMMON-LOG-PAYLOAD × 권한 없음 | `POP-COMMON-LOG-PAYLOAD / 권한 없음 — 이 팝업에 자기 문구가 없다. 로그 화면의 조회 권한이 없으면 부모 화면 자리에 접근 권한이 없어요 화면이 ` |
| `docs/FSD/_common/pop-log-payload.md` | POP-COMMON-LOG-PAYLOAD × 세션 만료 | `POP-COMMON-LOG-PAYLOAD / 세션 만료 — 이 팝업에 자기 문구가 없다. 401 이 관측되면 앱이 로그인 화면으로 보낸다` |
| `docs/FSD/_common/pop-logo-form.md` | POP-COMMON-LOGO-FORM × 저장 실패 | `POP-COMMON-LOGO-FORM / 저장 실패 — 저장하지 못했어요. 잠시 후 다시 시도해 주세요. — LogoFormModal.tsx:97` |
| `docs/FSD/_common/pop-logo-form.md` | POP-COMMON-LOGO-FORM × 수정 실패 | `POP-COMMON-LOGO-FORM / 수정 실패 — 저장 실패와 같은 문구·같은 경로다(한 팝업이 둘을 겸한다)` |
| `docs/FSD/_common/pop-logo-form.md` | POP-COMMON-LOGO-FORM × API 오류 | `POP-COMMON-LOGO-FORM / API 오류 — 저장 실패와 같은 한 줄. 서버 응답 원문을 노출하지 않는다` |
| `docs/FSD/_common/pop-logo-form.md` | POP-COMMON-LOGO-FORM × 서버 오류 | `POP-COMMON-LOGO-FORM / 서버 오류 — 〃 — 코드가 5xx 에 별도 문구를 두지 않는다` |
| `docs/FSD/_common/pop-logo-form.md` | POP-COMMON-LOGO-FORM × 네트워크 오류 | `POP-COMMON-LOGO-FORM / 네트워크 오류 — 〃 — 별도 문구가 없다` |
| `docs/FSD/_common/pop-logo-form.md` | POP-COMMON-LOGO-FORM × 권한 없음 | `POP-COMMON-LOGO-FORM / 권한 없음 — 이 팝업에는 자기 문구가 없다. 권한이 없으면 부모 목록의 추가·수정 컨트롤이 보이지 않아 팝업이 열리지 않` |
| `docs/FSD/_common/pop-logo-form.md` | POP-COMMON-LOGO-FORM × 세션 만료 | `POP-COMMON-LOGO-FORM / 세션 만료 — 이 팝업에는 자기 문구가 없다. 401 이 관측되면 앱이 로그인 화면으로 보내고 그 화면이 알린다` |
| `docs/FSD/_common/pop-logo-form.md` | POP-COMMON-LOGO-FORM × 데이터 충돌 | `POP-COMMON-LOGO-FORM / 데이터 충돌 — 다른 관리자가 먼저 지운 항목을 수정하면 서버가 사유를 준다: 다른 사용자가 먼저 삭제한 항목이에요. — a` |
| `docs/FSD/_common/pop-logo-form.md` | POP-COMMON-LOGO-FORM × 파일 업로드 실패 | `POP-COMMON-LOGO-FORM / 파일 업로드 실패 — 이미지 파일만 올릴 수 있어요. · 파일 용량은 5MB 를 넘을 수 없어요. · 이미지를 불러오지 못했어요.` |
| … 외 **1371건** | 전수 목록은 JSON 리포트 `gaps[]` 참조 | |

## 축 5 — 검증 도구의 골든 픽스처 (codegen · contract-test) (2건, major)

| 원천 | 덮이지 않은 항목 | 기대 테스트 이름 |
|---|---|---|
| `tools/codegen` | tools/codegen · 골든 픽스처 0건 · 도구 테스트 0건 | `tools/codegen/src/__fixtures__/<case>/{input,expected} + tools/codegen/src/<axis>.test.ts` |
| `tools/contract-test` | tools/contract-test · 골든 픽스처 0건 · 도구 테스트 0건 | `tools/contract-test/src/__fixtures__/<case>/{input,expected} + tools/contract-test/src/<axis>.test.ts` |

## SKILL ↔ 레지스트리 불일치 (아키텍처 판정 요청 — 도구가 임의 해소하지 않는다)

- **[아키텍처 판정 완료]** SKILL 축 5 vs 레지스트리 `blockCondition`: **레지스트리가 정본**이라는 판정을 받았다. 축 5는 **major 유지**. `skills/test-coverage-guard/SKILL.md` 의 측정 기준 표를 레지스트리에 맞춰 수정 완료 — 도구가 blocker 를 발명하지 않는다는 원칙이 확인됐다.

## 자기 감사 — 이 도구가 공허 통과할 수 있는 경로

검증기를 검증하는 자가 없다는 것이 이 조직의 반복 패턴이다. 테스트 커버리지은 자기 한계를 스스로 신고한다.

- 대조 키는 **테스트 이름**이다. 이름이 계약 상태·FSD 화면 ID 와 상황 이름을 인용하지 않으면 이 도구는 그것을 "없는 것"으로 센다 — 거짓 음성(실제로 검증했는데 미커버로 셈)이 가능하다. 반대로 **이름만 맞고 단언이 엉뚱한 테스트**는 커버로 세어질 수 있다 — 거짓 양성이다. 도구는 단언의 **존재**를 보지만 단언의 **내용이 옳은지**는 보지 않는다. 그 판정은 스토리북 리뷰(G5)·코드 리뷰(G6)의 사람 검수 몫이다.
- 축 3(blockedWhen)만 예외적으로 단언의 **종류**까지 본다 (비발생 단언 필수). 금지 동작은 렌더 단언으로 증명되지 않기 때문이다.
- 축 4의 대조 격자는 **FSD §7 예외 처리 표**에서 파생된다(2026-07 재조준 — 옛 `specs/**` §4 의 요소 × 7축 격자는 원천이 삭제돼 성립하지 않는다). **기능 명세가 동작 칸을 `해당 없음` 으로 바꾸거나 12상황의 행을 지우면 대조 대상이 줄어든다** — 커버리지 하한을 낮추는 우회로가 명세 쪽에 열려 있다. 이 경로는 명세 리뷰(G9)의 검수를 지나야 하며, 도구는 **분모 축소**와 **상황 누락**을 각각 major 로 신고해 그 변화를 눈에 보이게 만든다.
- **옛 7축 중 3개는 §7 에 자리가 없다.** `로딩`·`유효성` 은 새 양식에서 §8 화면 상태 · §6 Validation 으로 옮겨 갔고, `대량` 은 어느 절에도 자리가 없다. 축 4는 그 셋을 **더 이상 기계로 지키지 않는다.** §8·§6 을 격자에 넣지 않은 이유는 레지스트리 `blockCondition` 이 축 4에 인가한 것이 "FS의 **예외**" 이기 때문이다(§8 은 대부분 정상 경로이고, 상태 전수 렌더는 축 2가 이미 잰다). 범위를 넓히려면 아키텍처의 ADR 이 필요하다 — 도구가 스스로 넓히지 않는다.
- 축 4의 대조 키는 **화면 ID**다. `docs/FSD/_common/index.md` 처럼 §1 에 화면 ID 가 없는 문서(라우트가 없는 공통 층)는 테스트 이름이 가리킬 좌표가 없어 격자에서 빠진다. 그 수를 리포트에 드러내며(`ratchet`·축 4 `scanned`), **조용히 빼지 않는다.** 공통 층의 예외 동작은 그것을 쓰는 각 화면의 §7 에서 측정된다.
- `pnpm test` 의 exit code 를 읽지 않는다. 따라서 **테스트가 존재하지만 실패하는** 경우를 이 도구는 잡지 못한다 — 그것은 CI 의 test job (CI·CD) 이 잡아야 한다. 테스트 커버리지 은 "무엇이 검증되지 않았는가"를 재고, "검증된 것이 통과했는가"는 재지 않는다. **두 장치가 모두 있어야 게이트가 닫힌다.**
- `describe` 블록 이름은 대조에 쓰지 않는다 (테스트 이름만 본다). `describe('Button disabled')` + `it('does not fire')` 조합은 미커버로 셈될 수 있다 — E2E 테스트 명명 규칙(접두를 테스트 이름에 박는다)이 이 한계를 전제로 만들어졌다.
- **[해소됨 — 오케스트레이터/아키텍처 판정 1]** 이전 버전의 축 1은 **리포 전역 카운트**여서, 컴포넌트 엔지니어이 `packages/ui` 에 테스트를 채우면 `apps/admin` 이 0건이어도 초록으로 바뀌었다 — 한쪽의 초록이 다른 쪽의 빈칸을 가렸다. 이제 축 1은 `pnpm-workspace.yaml` 에서 파생한 **스코프별로 독립 판정**한다. **남은 한계**: `e2e/` 는 워크스페이스 패키지가 아니므로 축 1의 스코프가 아니다 — e2e 커버리지는 축 4(major + 래칫)만 잰다. 즉 **e2e 테스트를 한 건도 쓰지 않아도 blocker 는 뜨지 않는다** (래칫 기준선이 0이므로 후퇴도 없다). E2E 테스트가 첫 테스트를 쓰는 순간부터 래칫이 물린다.
- **[해소됨 — 오케스트레이터/아키텍처 판정 1]** `tools/*` 는 워크스페이스 패키지지만 축 1의 스코프에서 **의도적으로 제외**했다 (lib/workspace.ts). 검증 도구의 테스트 요구는 축 5(골든 픽스처)가 담당하며, `tools/*` 11개를 축 1에 넣으면 레지스트리가 인가하지 않은 blocker 11건을 **도구가 발명하는 것**이 된다. 이 경계를 바꾸는 것은 아키텍처의 ADR 사안이다.
- **축 4 래칫의 한계**: 기준선은 `reports/test-coverage/` 의 **직전 리포트 파일**에서 읽는다. 리포트가 삭제되면 기준선이 0으로 떨어져 **후퇴가 은폐된다.** `reports/**` 는 테스트 커버리지 소유이므로 다른 에이전트가 지울 수 없지만, **테스트 커버리지 자신이(또는 CI 캐시 초기화가) 지우면 래칫이 풀린다.** 항구적 방어는 기준선을 리포에 커밋된 파일로 유지하는 것이다 — CI·CD가 CI에서 `reports/` 를 커밋/아티팩트로 보존하도록 배선해야 완성된다.

## 조치 주체

- 테스트 커버리지은 **측정만** 한다 — 테스트를 대신 쓰지 않는다. 없다는 사실을 증명할 뿐이다.
  - `packages/ui/src/**/*.test.*` · `*.stories.tsx` play → **컴포넌트 엔지니어** / `apps/*/src/**/*.test.*` → **프론트 구현** / `e2e/**` → **E2E 테스트**
- 하한 조정 요청은 **아키텍처(ADR)**. 미달이 많다고 하한을 내리지 않는다.
- 계약 `states` 공백 → **계약 엔지니어** 경유 계약 리뷰 / FSD §7 예외 표 공백·상황 누락 → **기능 명세** 경유 명세 리뷰.
