# docs/figma/specs/ — Figma 미러 스펙 규격

Figma 파일은 리포 밖에 있어 게이트·리뷰·CODEOWNERS가 직접 닿지 않는다. 그래서
**Figma 담당들은 자기 영역의 상태를 이 디렉터리에 미러로 기록할 의무**를
진다 (ADR-0001 결정 5). Figma 리뷰의 G7 검수와 비주얼 회귀의 VRT는
Figma 파일이 아니라 **이 미러와 exports/ 기준 PNG**를 evidence로 판정한다.

```
docs/figma/specs/
├── components/   Figma 컴포넌트 — Component / Variant / Component Set 미러
├── variables/    Figma 변수 — Color/Type/Radius/Spacing/Shadow Variables 미러
├── layout/       Figma 레이아웃 — Auto Layout · Constraints · Grid · Responsive 미러
├── prototype/    Figma 프로토타입 — Prototype · Interaction · Animation 미러
├── icons/        Figma 아이콘 — Icon Component + Variable 연결 미러
└── exports/      VRT 기준 PNG (비주얼 회귀 담당이 pnpm vrt로 Storybook 스크린샷과 픽셀 비교)
```

각 하위 디렉터리의 쓰기 소유자는 해당 Figma 담당 한 명뿐이다.
`exports/`에는 Figma 담당들이 자기 영역의 기준 이미지를 내보낸다.

## 1. 미러 스펙 파일 규격

- **경로 규칙**: `docs/figma/specs/<area>/<Component>.md` (컴포넌트 단위,
  variables는 `<Collection>.md`, icons는 `<IconSet>.md`).
- **형식**: Markdown + YAML frontmatter. frontmatter는 기계 판정용(G7 체크리스트),
  본문은 구조 요약용.

```markdown
---
component: Button                  # 계약 name과 일치 (variables/icons는 컬렉션명)
contractVersion: 2.1.0             # 이 미러가 반영하는 계약 SemVer — G7 검수의 동기 기준
figmaFileKey: <파일 키>            # figma://file/<area>의 실제 파일 키
nodeId: "1234:567"                 # 대상 최상위 노드 ID
owner: Figma 컴포넌트               # 기록 담당 (Figma 담당들)
lastSyncedAt: 2026-07-14T09:30:00Z # 플러그인 스캔·기록 시각 (UTC)
bindingRate: 100                   # Variable 바인딩률 % — G7 #1은 100만 통과
detachedCount: 0                   # Detached style 수 — G7 #1은 0만 통과
autoLayout: true                   # layout 미러: Auto Layout 전면 적용 여부
hardcodedSizeCount: 0              # layout 미러: 하드코딩 사이즈 노드 수
exports:                           # 이 컴포넌트의 VRT 기준 PNG 목록
  - exports/Button/variant=primary,size=md,state=default.png
  - exports/Button/variant=primary,size=md,state=disabled.png
---

## 구조 요약
<!-- Component Set 트리, Property 목록(이름/타입/값 — 계약 figmaProperty와 1:1),
     바인딩된 Variable 목록을 표로 기록한다. -->
```

## 2. exports/ — VRT 기준 PNG

- **경로 규칙**: `exports/<Component>/<Variant조합>.png`
  파일명은 Figma 네이밍 규격 그대로 `variant=primary,size=md,state=default.png`
  (`pnpm naming:check` 대상).
- 계약의 variant × size × state 중 **시각 차이가 있는 조합 전부**를 내보낸다.
- `pnpm vrt`가 Storybook 스크린샷과 이 PNG를 픽셀 비교해 `reports/vrt/`에 리포트를
  남긴다. diff > 0.1%면 비주얼 회귀 담당이 G7을 차단한다.

## 3. 기록 의무 (Figma 담당들)

1. Figma 파일을 변경하면 **같은 작업(PR) 안에서** 해당 미러 스펙과 exports/ PNG를 갱신한다.
   미러 갱신 없는 Figma 변경은 검수 불가로 G7 반려된다 (체크리스트 G7 #6 — blocker).
2. `bindingRate`·`detachedCount` 등 frontmatter 수치는 플러그인(tools/figma-plugin)
   스캔 결과를 그대로 옮긴다 — 수기 추정 금지.
3. `contractVersion`은 반드시 현재 Frozen 계약 버전과 일치해야 한다. 계약이 G3를
   재진입해 버전이 바뀌면 미러도 재기록 대상이다.
4. Variables(Figma 변수)는 tokens.json에서 플러그인으로 생성한 결과만 미러링한다 —
   Figma에서 수동 생성한 Variable은 그 자체가 드리프트다 (디자인 드리프트 감시 대상).

## 4. 소비자

| 소비자 | 용도 |
|---|---|
| Figma 리뷰 | G7 체크리스트 판정 evidence (docs/_templates/checklists/G7.md) |
| 비주얼 회귀 | `pnpm vrt` 기준 이미지 → `reports/vrt/` |
| 계약 테스트 | Contract ↔ Figma 축 대조 (Property 이름/타입/값) |
| 디자인 드리프트 | Storybook ≠ Figma ≠ Token 드리프트 상시 감시 |
