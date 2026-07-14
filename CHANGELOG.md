# Changelog

이 파일은 A03 (Release Manager AI) 단독 소유다. 다른 에이전트의 직접 수정은 Boundary Enforcer가 차단한다.
형식: [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) · 버전: [SemVer](https://semver.org/lang/ko/)

## [Unreleased]

### Added
- 조직 부트스트랩: 39 에이전트 레지스트리, G0~G8 게이트, 계약/핸드오프 스키마, codegen 파이프라인, 가드 도구, 스킬 카탈로그 (ADR-0001)
- Phase 2: 페이지-모듈 파이프라인 정식 규정(docs/tds/guidelines/page-module-pipeline.md) + `reuse:scan` 루트 스크립트 — Admin 페이지 → 모듈 추출 → Storybook/Pages → Figma 동기화 → 검증 6단계
- Storybook Foundations 카테고리 7종 (Colors · Font Colors · Typography · Spacing · Radius · Shadow · Motion) — `tokens.json` 단일 원천에서 동적 렌더, Figma Variables와 동일 원천
- Storybook Pages 카테고리 3종 (로그인 · 대시보드 · 상품 등록) + 대응 Screen Spec SCR-001~003
- Figma 플러그인 TDS 문서 생성기 — Cover/Foundations/Components/Pages를 Variable 바인딩으로 생성 (docs/figma/specs/tds-doc-style.md)
- codegen: `tokens.json` → Figma Variables 페이로드 생성기

### Fixed
- **다크 모드 값이 CSS/TS 산출물에서 전량 유실**되던 문제 — codegen이 `$extensions["tds.modes"].dark` 키를 읽지 않아 `[data-theme='dark']` 블록이 비어 있었다. Figma Variables 경로는 정상이라 두 뷰가 구조적으로 어긋난 상태였음
- Figma 컴포넌트 페이로드 형식 불일치 — codegen 산출물을 플러그인이 거부해 Variant Property 동기화가 항상 실패하던 문제 (`name`/`variantProperties` 병기)
- contract-test Figma 축이 codegen의 이름 유도 폴백(`figmaProperty ?? PascalCase(propName)`)을 재현하지 않아 정상 생성물을 '계약 밖'으로 오판하던 문제
- codegen 생성물 헤더에 계약 세대(`@<semver>`) 미표기 → contract-test의 Contract↔React 축이 세대 판별 불가로 FAIL하던 문제
- Button 계약이 component 계층을 건너뛰고 semantic 토큰을 직접 참조 — `component.button.*` 13개 토큰이 죽어 있었다. 3계층(component → semantic → primitive) 참조로 교정 (미사용 토큰 42.4% → 27.1%)
- SCR 문서 경로 참조 규약 통일 (`SCR-NNN-<slug>.md`)
- 루트 `README.md` 소유자 공백 → A01 귀속

### Changed
- 네이밍 규칙: `foundations`를 문서 전용 카테고리로 규정, `_` 접두 비공개 모듈 허용 (ADR-0002)
