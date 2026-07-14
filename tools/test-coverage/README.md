# @tds/test-coverage — A77 Test Coverage Guard

> **"통과했다"와 "검증되지 않았다"를 구분한다.**
> `pnpm test` 는 `vitest run --passWithNoTests` 다. **테스트가 0건이어도 초록불이 켜진다.**
> 그리고 그 초록불이 G5 체크리스트 #6 · G6 체크리스트 #7의 자동 증거로 인용되고 있다.
> **공집합 위에서는 모든 명제가 참이다.** 그 참은 아무것도 보증하지 않는다.

```bash
pnpm coverage:check                            # PR 게이트 (A80이 루트 스크립트 등록 예정)
pnpm --filter @tds/test-coverage run check     # 5축 대조 → reports/test-coverage/
pnpm --filter @tds/test-coverage run selftest  # 검증기를 검증한다 (골든 픽스처)
```

## 커버리지는 라인 %가 아니다

라인 커버리지 80%는 **예외 경로를 하나도 짚지 않고 해피패스만 세 번 돈** 코드에서도 나온다.
이 도구가 재는 것은 **계약이 정의한 상태 전부 + FS가 정의한 예외 축 전부**다.

| # | 축 | 원천 | 위반 조건 | 심각도 | 게이트 |
|---|---|---|---|---|---|
| 1 | 테스트 존재 | `apps/**` · `packages/**` · `e2e/**` | 단언을 가진 실행 단위 **0건** | blocker | G5·G6 |
| 2 | 계약 states | `contracts/*.contract.json` → `states[]` | 미커버 상태 ≥ 1 | blocker | G5·G6 |
| 3 | 계약 events.blockedWhen | 동 `events.*.blockedWhen` | 미커버 차단 조건 ≥ 1 | blocker | G5·G6 |
| 4 | FS 예외 7축 | `specs/**/FS-*.md` §4 | 미커버 (요소 × 축) 칸 ≥ 1 | major | G6 |
| 5 | 검증 도구 골든 픽스처 | `tools/codegen` · `tools/contract-test` | 픽스처 0건 | major¹ | G5·G6 |

¹ SKILL 표는 blocker 로 적었으나 레지스트리 `blockCondition` 은 이 축을 열거하지 않는다.
SKILL 자신이 *"하한의 원천은 레지스트리"* 라고 명령하므로 **레지스트리를 따라 major** 로 재고,
불일치는 리포트에 남겨 **A01의 판정**을 받는다. 도구가 스스로 blocker 를 발명하지 않는다.

## 세 가지 설계 결정

### 1. 러너의 exit code 를 읽지 않는다

`pnpm test` 의 초록불을 입력으로 삼는 순간 이 도구는 **자기가 고발하려던 거짓말을 물려받는다.**
그래서 A77은 러너의 판정이 아니라 **소스에 실제로 존재하는 단언**을 정적으로 센다.

> 한계(자백): 따라서 **테스트가 존재하지만 실패하는** 경우는 잡지 못한다 — 그것은 CI 의 test job(A82)이 잡아야 한다.
> A77은 *"무엇이 검증되지 않았는가"* 를 재고, *"검증된 것이 통과했는가"* 는 재지 않는다. **두 장치가 모두 있어야 게이트가 닫힌다.**

### 2. 단언이 없는 실행 단위는 테스트가 아니다

Storybook play function 은 테스트로 인정한다 — **단, `expect` 가 있을 때만.**

현재 리포의 실측: **play function 62건 · `expect` 0건 · 스파이(`fn()`) 0건.**
전부 `userEvent.hover/tab/pointer` 로 **상태를 만들기만** 하고 아무것도 단언하지 않는다.
**실패할 수 없는 것은 검증하지 않는다** — `--passWithNoTests` 와 같은 종류의 초록불이다.
G5 exit *"Play Function으로 events.blockedWhen 전수 검증"* 은 이 62개의 초록불로 통과돼 왔다.

### 3. 금지 동작(blockedWhen)은 렌더 단언으로 증명되지 않는다

`expect(button).toBeDisabled()` 는 `onClick` 이 발화하지 **않음**을 증명하지 못한다 —
`disabled` 속성 없이 CSS 로만 흐리게 처리하고 핸들러를 그대로 물려도 그 단언은 통과한다.

비발생을 증명하려면 콜백을 **관찰**해야 한다:

```tsx
it('Button: onClick — loading 상태에서 발화하지 않는다', () => {
  const spy = fn();
  render(<Button loading onClick={spy} />);
  fireEvent.click(screen.getByRole('button'));
  expect(spy).not.toHaveBeenCalled();   // ← 축 3은 이 단언을 요구한다
});
```

## "동작이 정의된 요소" — FS 209요소 중 무엇이 테스트 대상인가

**정적 표시 요소(라벨·아이콘)는 테스트 대상이 아니다.** 그러나 무엇이 라벨인지 **도구가 추측하지 않는다.**

FS §4 는 요소마다 7축을 **빈칸 없이** 채우도록 강제된다(G9 자기점검: *"예외 7축에 빈칸 0건.
모든 `N/A` 에 사유가 붙어 있다"*). 축이 성립하지 않는 요소에 대해 A62는 **이미
`N/A — 고정 문구다` 처럼 사유와 함께 선언해 두었다.** 그러므로:

> **동작이 정의된 칸** = `N/A` 도, 빈칸도, 공통 규칙으로의 **순수 위임**(`§4.1 공통 규칙 적용`)도 아닌 칸
> **동작이 정의된 요소** = 그런 칸을 1개 이상 가진 요소

즉 이 도구는 무엇을 테스트할지 **판단하지 않고 센다.** 판단은 이미 A62가 §4에 했다.
어떤 요소를 대상에서 빼려면 도구의 규칙이 아니라 **명세의 칸을 `N/A` 로 바꿔야** 하고,
그것은 A62의 서명과 A64(G9)의 검수를 지난다. **커버리지 하한을 조용히 낮출 경로가 없다.**

판정 규칙은 `src/thresholds.ts` (`NA_CELL` · `COMMON_RULE_DELEGATION_ONLY` · `EMPTY_CELL`)에
상수로 노출돼 있고, 리포트는 배제된 칸 수를 사유별로 집계해 남긴다.

## 검증기를 검증한다 — `run selftest`

감사 실측: 재작업 8건 중 **2건이 검증 도구의 오판**이었다. 도구의 판정도 검증돼야 한다.
A77은 다른 도구에게 골든 픽스처를 요구하므로(축 5) **스스로 그것을 갖는다.**

`src/__fixtures__/covered/` 는 **전 항목이 커버된 가상 미니 리포**다. selftest 는:

1. **기준선** — 커버가 존재하면 GREEN 이 된다 (항상 RED 를 뱉는 도구는 쓸모없다)
2. **검출** — 위반을 심으면 **정확히 그 항목**에서 RED 가 된다 (6가지 돌연변이)
3. **복귀** — 위반을 지우면 기준선으로 돌아온다

돌연변이는 임시 복사본에서만 일어나며 픽스처 원본은 불변이다.

| 돌연변이 | 기대 |
|---|---|
| M1 `blockedWhen` 테스트 삭제 | 축3 blocker 2건 |
| M2 비발생 단언 → **렌더 단언으로 약화** | 축3 blocker 2건 (이름만 맞으면 통과시키지 않는다) |
| M3 테스트 전부 삭제 | 축1 blocker (`--passWithNoTests` 에 대한 답) |
| M4 단언 없는 play 만 존재 | 축1 blocker 유지 (테스트로 세지 않는다) |
| M5 계약 `states` 공백 | 축2 blocker **"대조 불가"** (측정 불가 ≠ 통과) |
| M6 골든 픽스처 삭제 | 축5 major |

## 종료 코드

| 코드 | 의미 |
|---|---|
| **0** | blocker 0건 (major 는 경고로 남고 통과) |
| **1** | blocker ≥ 1건 → **G5 · G6 BLOCKED** |
| **2** | 실행 오류 / **측정 불가** — 계약도 명세도 없으면 PASS 가 아니라 `NOT_VERIFIED` 다 |

> exit 2 는 `tools/perf` 가 dist 부재 시 조용히 exit 0 한 실수를 반복하지 않기 위한 것이다.
> 그 공허 통과 때문에 `bundle-size` job 이 제거됐다 (ADR-0009). **측정할 수 없다는 것은 통과가 아니다.**

## 경계

- **테스트를 대신 작성하지 않는다.** 없다는 사실을 리포트로 증명할 뿐이다.
  단위·렌더는 A30(`packages/ui`)·A40(`apps`), 시나리오·통합은 A85(`e2e/**`)의 일이다.
- 검증 대상(`apps/**` · `packages/**` · `specs/**` · `contracts/**`)은 전부 **읽기 전용**이다.
- `package.json` 은 **A80**, `.github/workflows/` 는 **A82**, `.prettierignore` 는 **A81** 소유 —
  필요한 변경은 직접 하지 않고 handoff 로 요청한다.
- 하한 조정은 **A01의 ADR** 사안이다. 미달이 많다고 하한을 내리지 않는다.

## 산출물

- `reports/test-coverage/<date>-<scope>.json` — 5축 대조 결과 · `gaps[]` 전수 · `selfAudit` · `discrepancies`
- `reports/test-coverage/<date>-<scope>.md` — 축별 요약 표 + 미커버 목록 (150행 이내, ADR-0010 T4)
- `reports/test-coverage/<date>-escalations.json` — `handoff.v1` 봉투 (차단 시. → A30·A33·A40·A85·A42·A00)
