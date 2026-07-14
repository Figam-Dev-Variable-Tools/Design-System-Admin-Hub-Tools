# DTCG 3계층 토큰 규칙 — tokens.json (A20)

> 원천: 설계서 §5.1(SSOT 파이프라인) · §8 G4 체크리스트 · W3C Design Tokens Community Group Format
> `tokens/tokens.json`의 구조 계약. 위반은 A21이 G4에서 반려한다.

## 1. DTCG 포맷 기본

- 토큰 = `$value` 필수 + `$type`(토큰 또는 상위 그룹에 명시) + 선택적 `$description`/`$extensions`
- 그룹 = `$value` 없는 중첩 객체. `$type`은 그룹에 선언하면 하위로 상속
- 별칭(alias) = `"{경로.점.표기}"` — 예: `"$value": "{primitive.color.blue.600}"`
- 사용 `$type`: `color` · `dimension` · `duration` · `cubicBezier` · `fontFamily` · `fontWeight` · `number` · `typography`(컴포지트)
- 토큰/그룹 이름에 `.` `{` `}` 금지 (경로 구분자와 충돌). 소문자 + 숫자 + `-`만 사용: `on-primary`, `font-size`, `4`

## 2. 3계층 구조와 참조 방향

```
primitive.*                    ← 1계층: raw 값(hex/px/ms)은 여기에만
  color / space / radius / typography / motion
color.* space.* radius.*       ← 2계층 semantic: 최상위 그룹. primitive 참조만
  typography.* motion.*           (계약의 tokens 블록이 참조하는 계층 = 여기)
component.<name>.*             ← 3계층: semantic 참조만
```

| 규칙 | 판정 |
|---|---|
| semantic/component 계층에 raw 값 | G4 반려 (major) |
| **component가 primitive 직접 참조** | G4 반려 (major) — 설계서 §8 G4 명시 |
| primitive가 다른 토큰 참조 | 금지 — primitive는 리프(raw)만 |
| 순환 참조 (예: a→b→a) | G4 반려 (blocker) |
| 계약(`*.contract.json`)의 tokens 블록이 primitive/component 참조 | 금지 — 계약은 semantic 경로만 참조 |

- 경로 표기: 계약과 파생 도구는 `color.action.primary.default`처럼 **semantic 경로를 그룹 접두어 없이** 쓴다. semantic 계층이 최상위 그룹(`color`/`space`/`radius`/`typography`/`motion`)인 이유다. 계층 식별은 그룹의 `$extensions["tds.tier"]`로 한다.

## 3. 라이트/다크 모드 페어링

- 대상: **semantic 컬러 토큰 전수** (space/radius/motion은 모드 무관)
- 규격: `$extensions["tds.modes"]`에 `light`/`dark` 키 모두 필수. 값은 primitive 별칭
- `$value`는 **light 모드 값과 반드시 동일** (모드 미지원 소비자의 기본값)
- 두 모드 값이 같아도 생략 금지 — 명시적으로 같게 적는다 (페어링 누락 검출을 기계적으로 하기 위함)

```json
"on-primary": {
  "$value": "{primitive.color.gray.0}",
  "$extensions": {
    "tds.modes": { "light": "{primitive.color.gray.0}", "dark": "{primitive.color.gray.900}" }
  }
}
```

- 다크 모드는 라이트의 기계적 반전이 아니다: 배경이 밝아지는 토큰(예: dark의 primary가 blue.400)은 그 위 텍스트 페어도 함께 뒤집어야 한다 — 페어 단위로 대비비를 다시 계산할 것

## 4. 네이밍

- semantic 이름은 **용도(의미)** 기준, 값 기준 금지: `color.action.primary.default` (O) / `color.blue-dark` (X)
- 상태 접미사 어휘 고정: `default` · `hover` · `active` · `disabled` · `focus`
- primitive 스케일: 색은 명도 스텝(`100`~`900`, 0=white), 간격은 4px 배수 인덱스(`space.1`=4px … `space.6`=24px)
- 컴포넌트 토큰: `component.<컴포넌트명>.<속성>` — 속성은 CSS 어휘 kebab(`background-hover`, `padding-x`)

## 5. 대비비 기준 (G2/G4 공통)

- 본문 텍스트/배경: **4.5:1 이상**, 대형 텍스트·UI 경계(focus ring 등): **3:1 이상**
- disabled 상태 페어는 WCAG 예외 — 단 `$description`에 예외임을 명시
- 계산 결과(수치)를 토큰 `$description`에 기록해 A21의 evidence로 남긴다

## 6. 변경 절차

- 토큰 **추가**: 이 문서 규칙 준수 → G4 리뷰 (additive는 파괴 없음)
- 토큰 **값 변경**: 소비 중인 semantic 값 변경은 전 소비자의 시각이 바뀐다 — A00에 영향 범위 handoff + G4 재진입, VRT(A70) 재실행 유발을 명시
- 토큰 **개명/삭제**: 참조하는 계약이 있으면 금지 — A18과 change_request로 계약 SemVer(MAJOR)와 동기화 후에만
- 미사용 토큰: 어떤 계약/컴포넌트도 참조하지 않는 토큰이 전체의 **5% 초과 시 정리 필수** (G4 체크리스트)
