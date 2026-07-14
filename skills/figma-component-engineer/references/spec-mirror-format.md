# 스펙 미러(JSON+MD) 규격 (G7 공용 레퍼런스)

> 적용 범위: A51~A55 (미러 생산 의무) + A56 (미러가 유일한 검수 표면).
> 배경: A51~A55의 실소유 대상은 `figma://` 가상 경로라 리포에서 직접 검수할 수 없다 (ADR-0001).
> 따라서 **모든 Figma 변경은 같은 handoff 안에서 `docs/figma/specs/<영역>/`에 미러로 기록**되어야 한다.
> 미러가 없거나 stale이면 A56은 검수 자체를 반려한다.

## 1. 경로 규칙

```
docs/figma/specs/<area>/<Target>.figma-spec.json   ← 기계 검증용
docs/figma/specs/<area>/<Target>.figma-spec.md     ← 사람 검수용 요약
```

| area | 소유자 | Target 명명 |
|---|---|---|
| `components` | A51 | 계약 `name` (예: `Button`) |
| `variables` | A52 | Collection 이름 (예: `color`) |
| `layout` | A53 | `SCR-NNN` 또는 계약 `name` |
| `prototype` | A54 | `SCR-NNN` 또는 계약 `name` |
| `icons` | A55 | 아이콘 이름(kebab) 또는 세트명 |

## 2. JSON 공통 필드 (필수)

```jsonc
{
  "area": "components",              // components | variables | layout | prototype | icons
  "target": "Button",
  "contractVersion": "2.1.0",        // 계약 대상이 아니면 null
  "tokensVersion": null,             // variables 미러는 tokens.json 버전 필수 기입
  "figma": {
    "fileKey": "AbCdEf123",
    "nodeId": "12:345",
    "virtualPath": "figma://file/components"
  },
  "syncedAt": "2026-07-14T09:00:00Z",
  "syncedBy": "A51",                 // 레지스트리 agent id
  "pluginRunId": "run-20260714-091203",   // A50 플러그인 spec-mirror-exporter가 발급
  "binding": {                       // references/variable-binding-rules.md §3 규격
    "boundCount": 128, "totalCount": 128, "bindingRate": 1.0, "detachedCount": 0
  },
  "naming": { "violations": [] },    // references/figma-naming.md 위반 목록 — 빈 배열 필수
  "autoLayout": { "applied": true, "hardcodedSizeCount": 0 }
}
```

## 3. area별 확장 블록

- **components** (A51): `structure` — 계약과 기계 diff 가능해야 함
  ```jsonc
  "structure": {
    "properties": { "Variant": ["primary","secondary","ghost","danger"], "Size": ["sm","md","lg"], "Loading": ["true","false"] },
    "variantCount": 24,
    "states": ["default","hover","active","focus-visible","disabled","loading"]
  }
  ```
- **variables** (A52): `collections` — `[{ "name": "color", "modes": ["Light","Dark"], "variableCount": 96, "unpairedCount": 0 }]`
- **layout** (A53): `frames` — `[{ "name": "SCR-012 회원관리", "autoLayout": true, "constraints": "...", "grid": "...", "breakpoints": ["sm","md","lg"] }]`
- **prototype** (A54): `flows` — `[{ "name": "...", "trigger": "...", "action": "...", "motionToken": "motion.duration.fast" }]` (duration/easing은 raw ms/curve가 아니라 motion 토큰 참조명)
- **icons** (A55): `icons` — `[{ "name": "chevron-down", "sizes": [12,16,20,24], "styles": ["Filled","Outlined","Rounded","Sharp"], "colorVariable": "color/icon/default" }]`

## 4. MD 요약 (사람 검수용, 필수 섹션)

1. **변경 요약** — 무엇을 왜 바꿨나 (계약/토큰 버전, 관련 TASK/CR id)
2. **체크리스트 자기점검** — G7 항목별 O/X (`docs/_templates/checklists/G7.md`)
3. **증거 링크** — 스캐너 결과(JSON 미러), `reports/vrt/` 스크린샷 비교, `reports/contract-test/` 결과
4. **알려진 제약** — 있다면 명시 (없으면 "없음")

## 5. 생성 규칙

- **손으로 쓰지 않는다.** JSON 미러는 A50 플러그인 `spec-mirror-exporter` 출력만 커밋한다. 수기 편집·사후 보정은 A56 반려 사유 (pluginRunId로 추적).
- 미러 갱신과 figma:// 변경은 **동일 handoff envelope**의 `artifacts`에 함께 올라가야 한다 — 미러 없는 Figma 변경은 존재하지 않는 것으로 간주.
- stale 판정: 미러의 `contractVersion`(또는 `tokensVersion`)이 현재 Frozen 계약/토큰 버전과 다르면 stale → 반려.
