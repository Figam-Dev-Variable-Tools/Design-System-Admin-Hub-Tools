# Variable 바인딩 규칙 — 바인딩률 100% · Detach 0 (G7 공용 레퍼런스)

> 적용 범위: A51~A55 생산물 전체 + A56 검수 기준.
> 원천: `orchestration/registry/gates.json` G7 exit(「Variable 바인딩률 100% (Detach 0)」), org-design-v2 §8 G7.

## 1. 바인딩 대상 (전수)

시각 속성 전부가 Variable 바인딩 대상이다. 하나라도 raw 값이면 바인딩률 100% 미달:

- Fill / Stroke 색상
- Typography (font size, line height, weight, letter spacing)
- Corner radius
- Auto Layout padding / gap (spacing)
- Effect (shadow)
- Opacity 등 토큰화된 기타 시각 속성

## 2. 절대 규칙

1. **raw hex / raw px 0건** — 모든 값은 Variable 바인딩. 하드코딩 사이즈도 0 (Auto Layout + spacing Variable).
2. **Variable의 유일한 원천은 `tokens/tokens.json`** — A52가 A50 플러그인 `variables-importer`로 생성한다. Figma UI에서 수동 생성한 Variable은 출처 불명이므로 **blocker** (A52 스킬의 절대 금지).
3. **계층 준수**: 컴포넌트는 semantic / component 계층 Variable만 바인딩. primitive 계층 직접 바인딩 금지 (G4 3계층 규칙의 Figma 측 대응).
4. **Detach 0**: detached instance, local style, 인스턴스 스타일 override 금지. 구(舊) Styles 기능도 사용 금지 — Variables만.
5. **Light/Dark 완비**: 바인딩된 모든 Variable은 두 Mode 값이 존재해야 한다. 미페어링 발견 시 작업 중단 후 A52에 change_request (A52는 필요 시 A20에 재발행).

## 3. 측정 방법 (수치 기준)

- A50 플러그인의 `binding-scanner` 모듈을 실행 → 결과가 스펙 미러 JSON의 `binding` 블록에 기록된다:

```jsonc
"binding": {
  "boundCount": 128,      // Variable 바인딩된 속성 수
  "totalCount": 128,      // 바인딩 대상 속성 총수
  "bindingRate": 1.0,     // boundCount / totalCount — 1.0 필수
  "detachedCount": 0      // detached instance + local style 합계 — 0 필수
}
```

- 판정 기준 (gates.json G7 exit): `bindingRate == 1.0` **AND** `detachedCount == 0`. 미달 시 A56이 BLOCKED 판정.
- 스캐너 결과를 수기로 고쳐 쓰는 행위는 검수 무효 — `pluginRunId`로 실행 이력이 추적된다.

## 4. 위반 시 처리

| 위반 | 심각도 | 조치 |
|---|---|---|
| raw hex/px 발견 | blocker | 해당 속성을 Variable로 재바인딩 후 재스캔 |
| 수동 생성 Variable | blocker | 삭제 후 A52에 tokens.json 경유 생성 요청 (change_request) |
| primitive 직접 바인딩 | major | semantic/component 계층으로 재바인딩 |
| Dark 모드 값 누락 | blocker | A52 → A20 페어링 요청, 완료 전 G7 진입 불가 |
| detached instance | blocker | 원본 컴포넌트로 재연결(reattach) |
