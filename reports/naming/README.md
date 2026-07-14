# reports/naming/ — 네이밍 위반 리포트 (A76)

`tools/naming-guard`(`@tds/naming-guard`, `pnpm naming:check`)가 생성한다. 트리거는 pre-commit 훅(및 CI 재검증)이며, Folder/Component/Variant/Variable/Token/Icon/Story/Page 네이밍 규칙을 검사해 **위반이 1건이라도 있으면 커밋을 차단**한다. 포맷: `<date>.json` — 위반별 대상 경로/식별자, 위반 규칙 id, 기대 형식(예: boolean prop은 `is/has/can` 또는 형용사, 이벤트는 `on*`, 컴포넌트는 PascalCase). A19(Contract Reviewer)·각 게이트 Reviewer가 evidence로 인용하며, 규칙 추가·변경은 A01(Architecture AI) 승인 사항이다.
