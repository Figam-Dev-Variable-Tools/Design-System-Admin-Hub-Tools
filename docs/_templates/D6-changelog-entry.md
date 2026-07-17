---
# ── D6 · Changelog Entry 템플릿 ─────────────────────────────────────────
# 대상 파일: CHANGELOG.md (이 템플릿은 단위 항목 형식)
doc: D6
owner: 릴리스 담당
gate: G8
---

<!--
[작성 지침]
- CHANGELOG.md 최상단(최신 버전이 위)에 아래 형식의 항목을 추가한다.
- 버전은 계약 diff 기준 SemVer 판정(D4 §3 표)을 따른다 — 임의 판정 금지.
- MAJOR면 "💥 BREAKING CHANGES" 섹션이 반드시 존재해야 하고, Migration Guide
  (docs/migration/vX-to-vY.md, D7)를 링크해야 한다 — 없으면 G8에서 릴리스 차단.
- Deprecated 항목에는 제거 예정 버전(removeIn)과 대체재를 반드시 명시한다.
- 항목은 컴포넌트 단위로 쓰고, 계약 버전(Name@version)을 함께 표기한다.
- 사용하지 않는 섹션(Added/Changed/…)은 삭제한다.
-->

## [X.Y.Z] - YYYY-MM-DD

### 💥 BREAKING CHANGES

<!-- MAJOR 릴리스에서만. 무엇이/왜 깨지는지 + 마이그레이션 경로. -->

- **<Component>@<version>**: <제거/변경된 API와 영향> → 마이그레이션: [vX → vY 가이드](docs/migration/vX-to-vY.md)

### Added

- **<Component>@<version>**: <추가된 prop/variant/이벤트> (MINOR)

### Changed

- **<Component>@<version>**: <하위호환 변경 내용>

### Deprecated

- **<Component>@<version>**: `<prop>` deprecated → `<대체 prop>` 사용. **v<removeIn>에서 제거 예정**

### Removed

- **<Component>@<version>**: `<prop>` 제거 (v<X>.0.0에서 deprecated 고지 완료)

### Fixed

- **<Component>@<version>**: <수정된 결함>
