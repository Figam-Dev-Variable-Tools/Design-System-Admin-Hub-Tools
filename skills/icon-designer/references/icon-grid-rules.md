# 아이콘 그리드 · 파일명 · SVG 규격

> A15(Icon Designer) 산출물 규격. A17이 G2에서 검수하고, A76(Naming Guard)이 파일명을 pre-commit에서 강제하며,
> A55가 이 SVG를 Figma Icon Component로 미러링한다.

## 1. 매트릭스 의무

아이콘 1종 = **4 그리드 × 4 스타일 = 16 파일**. 부분 세트 커밋 금지 (org-design-v2.md §3 A15: 12/16/20/24 × Filled/Outlined/Rounded/Sharp).

| | filled | outlined | rounded | sharp |
|---|---|---|---|---|
| **12** | `<name>-12-filled.svg` | `<name>-12-outlined.svg` | `<name>-12-rounded.svg` | `<name>-12-sharp.svg` |
| **16** | `<name>-16-filled.svg` | `<name>-16-outlined.svg` | `<name>-16-rounded.svg` | `<name>-16-sharp.svg` |
| **20** | `<name>-20-filled.svg` | `<name>-20-outlined.svg` | `<name>-20-rounded.svg` | `<name>-20-sharp.svg` |
| **24** | `<name>-24-filled.svg` | `<name>-24-outlined.svg` | `<name>-24-rounded.svg` | `<name>-24-sharp.svg` |

스타일 정의:
- **filled**: 면 채움 (`fill="currentColor"`), 스트로크 없음
- **outlined**: 선 (`stroke="currentColor" fill="none"`), 단말 `stroke-linecap="butt"`
- **rounded**: outlined 기반 + `stroke-linecap="round" stroke-linejoin="round"`, 외곽 코너 라운딩
- **sharp**: outlined 기반, 모든 코너 각짐(라운딩 0), 단말 butt

## 2. 그리드 규격

경로는 그리드별로 **재조정**한다 — 24px 마스터의 단순 스케일 축소는 반려 (획이 서브픽셀로 깨짐).

| 그리드 | viewBox | live area | padding(상하좌우) | stroke width (outlined/rounded/sharp) |
|---|---|---|---|---|
| 12 | `0 0 12 12` | 10×10 | 1 | 1 |
| 16 | `0 0 16 16` | 14×14 | 1 | 1.5 |
| 20 | `0 0 20 20` | 16×16 | 2 | 1.5 |
| 24 | `0 0 24 24` | 20×20 | 2 | 2 |

공통 규칙:
- 획·좌표는 픽셀 그리드에 스냅 (홀수 stroke는 0.5 오프셋 정렬)
- 시각적 무게 보정: 정사각/원형/삼각 키셰이프 간 크기 보정 허용, live area 초과 금지
- 광학적 중심 정렬 (기하학적 중심이 아니라)

## 3. SVG 파일 규격

파일명 정규식 (A76 Naming Guard 검사와 동일):

```
^[a-z][a-z0-9]*(-[a-z0-9]+)*-(12|16|20|24)-(filled|outlined|rounded|sharp)\.svg$
```

- `<name>`: kebab-case 영어, 의미 기반 (예: `user-add`, `chevron-down`, `filter`). 크기/스타일 단어를 name에 중복 포함 금지 (`user-add-small` 금지)
- 위치: `assets/icons/` 평면 배치 (하위 폴더 없음 — 매트릭스가 파일명에 인코딩됨)

파일 내용:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none">
  <path d="…" stroke="currentColor" stroke-width="2"/>
</svg>
```

- `viewBox="0 0 <size> <size>"` 필수, 파일명의 size와 일치
- **`width`/`height` 속성 금지** — 크기는 사용처가 지정
- 색은 **`currentColor`만** — hex/rgb/`style=` 속성 0건 (다크 모드는 사용처의 색 토큰이 결정)
- `<path>` 중심 구성 — `<g>` 최소화, 에디터 메타데이터(`<metadata>`, `data-*`, sketch/figma id) 제거
- filled는 겹침 없는 단일 컴파운드 패스 권장 (`fill-rule="evenodd"` 일관)
- `<text>`, `<image>`, 래스터 임베드 금지

## 4. 자가 검사

```
# 색 하드코딩 (0건이어야 함)
#[0-9a-fA-F]{3,8}|rgb\(|style=

# width/height 속성 (0건이어야 함)
<svg[^>]*(width|height)=
```

+ `pnpm naming:check` 통과 필수.

## 5. 흔한 반려 사유 (A17 실측 기준)

- 24px만 그리고 나머지를 transform scale로 생성 → 그리드별 재조정 요구 (major)
- outlined와 rounded가 linecap만 다르고 코너 라운딩 미적용 → 스타일 구분 불충분 (major)
- `fill="#111"` 잔존 → 색 하드코딩 (blocker — 다크 모드 파손)
- 매트릭스 16개 중 12px 세트 누락 → 미완성 (major)
