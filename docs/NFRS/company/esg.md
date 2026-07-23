# ESG — 비기능 명세서

| 항목 | 내용 |
|---|---|
| 자원명 | ESG |
| 화면 ID | `SCR-COMPANY-ESG` · `SCR-COMPANY-ESG-FORM` |
| 메뉴 경로 | 기업 관리 > ESG |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |
| 관련 기능 명세서 | [목록](../../FSD/company/esg/index.md) · [등록·수정](../../FSD/company/esg/form.md) |

**이 자원의 성격** — [연혁](history.md)과 **같은 공용 목록·폼 껍데기**를 쓴다. 계열의 결정 셋(쓰기 반영 · 권한 게이팅 · 충돌 방어)이 모두 같다. 아래 각 절은 그 문서 대비 **다른 것만** 적는다. 다른 것은 둘이다: **왼쪽 분류 필터가 있다** · **이미지를 여러 장 다룬다**.

## 1. 성능

| 항목 | 요구 | 이 자원의 값 | 측정 방법 |
|---|---|---|---|
| 응답 시간 | 공통 준수 | 측정하지 않음 — 백엔드가 없다 | 백엔드 연동 후 재작성 |
| 조회 성능 | 공통 준수 | 목록 1건 · 폼(수정) 1건. **분류 필터는 서버를 다시 부르지 않는다** — 받아 둔 목록 위에서 건다 — `apps/admin/src/pages/company/esg/types.ts:70-74` | 코드 확인 |
| 대용량 데이터 처리 | 가상화 없이 대량 행을 그리지 않는다 | ⚠ **페이지네이션도 가상화도 없다** — 전량을 그린다 | 코드 확인 |
| 이미지 비용(목록) | 목록이 이미지 때문에 무거워지지 않는다 | **목록에 이미지 열이 없다.** 표에 뜨는 것은 분류·제목·내용·일자 넷뿐이다 — `apps/admin/src/pages/company/esg/EsgListPage.tsx:72-86` | 코드 확인 |
| 이미지 비용(폼) | — | 한 활동에 **최대 10장**을 붙일 수 있고 전부 브라우저 안 참조라 네트워크 왕복이 없다(업로드가 없기 때문이다 — §8) — `apps/admin/src/pages/company/esg/types.ts:26` | 코드 상수 확인 |
| 긴 내용의 표시 비용 | — | 목록의 내용 열은 **한 줄 말줄임**으로 잘라 그린다 — `apps/admin/src/pages/company/esg/EsgListPage.tsx:42-48` | 코드 확인 |

## 2. 사용성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| UI 일관성 | 공통 준수 | 목록은 공용 목록 껍데기, 폼은 공용 폼 껍데기. **손수 조립한 UI 가 없다** |
| 축을 숫자로 보여 준다 | — | 왼쪽 분류 필터에 **건수 배지**가 붙는다 — 어느 축이 얼마나 쌓였는지가 곧 대외 설명의 근거다 — `apps/admin/src/pages/company/esg/types.ts:76-82` |
| 빈 상태의 사유 | 필터·진짜 비어 있음을 구분한다 | **구분한다** — 필터 때문일 때만 `필터 초기화` 가 붙는다 — `apps/admin/src/pages/company/esg/EsgListPage.tsx:119-122` |
| 필터를 바꾸면 선택이 풀린다 | 보이지 않는 것을 지우지 않는다 | 분류가 바뀌면 행 선택이 해제된다 — `apps/admin/src/pages/company/esg/EsgListPage.tsx:65-67` |
| ⚠ 조회 조건이 주소에 남지 않는다 | 목록이 Back·새로고침을 견딘다 | 분류 필터는 **화면 상태**다 — 폼에 갔다 돌아오면 전체로 되돌아가고, 그 조건의 링크도 존재하지 않는다 — `apps/admin/src/pages/company/esg/EsgListPage.tsx:55` |
| 여러 장을 한 번에 올린다 | 반복 작업을 왕복시키지 않는다 | 파일 여러 개를 한 번에 고르거나 끌어다 놓을 수 있다 — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:138-149` |
| 상한을 넘겨도 통째로 버리지 않는다 | — | 상한을 넘겨 고르면 **넘치는 파일만** 버리고 나머지는 받는다 — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:143-146` |
| 사용자 피드백 | 공통 준수 | **이 자원 고유의 토스트가 0건이다** — 삭제·저장 통지가 전부 공통 층의 문구다 |
| 입력 편의성 | 공통 준수 | 내용은 타이핑 중 재검증하지 않는다 — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:144` |
| 미저장 보호 | 공통 준수 | 문구는 이 자원의 것이다 — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:24-25` |

## 3. 보안

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 권한 | 리소스 키 | 잎 `page:/company/esg` |
| 권한 게이팅 | 누를 수 없는 것을 보여 주지 않는다 | 등록 버튼은 화면이 가리고(`apps/admin/src/pages/company/esg/EsgListPage.tsx:91`), 나머지는 껍데기가 가린다(`apps/admin/src/shared/crud/CrudListShell.tsx:146,178,216-217`). 폼은 권한이 없으면 열리지 않는다 |
| 플랜(엔타이틀먼트) | 공통 준수 | **걸리지 않는다** — 모듈 대응표에 없다 |
| 개인정보 마스킹 | 어떤 필드를 어떤 규칙으로 가리는가 | **가리는 필드가 없다** — 분류·제목·내용·일자·이미지뿐이다. ⚠ **본문 이미지에 사람 얼굴이 담길 가능성이 높은 자원**이지만(봉사·행사 사진) 업로드 전 검사가 없고, 그 판단은 운영자에게 맡겨져 있다 |
| 입력값 검증 | 화면 검증과 서버 검증을 구분한다 | 화면 검증만 있다 — `apps/admin/src/pages/company/esg/validation.ts`. 일자는 **형태만** 보고 실재하는 날짜인지는 보지 않는다 — 같은 파일 `:7,24-26` |
| 이미지 형식을 강제하지 않는다 | — | 업로드 이음매가 없어 조이면 저장 자체가 불가능해진다 — `apps/admin/src/shared/crud/validation.ts:39-63` |
| 중복 제출 | 공통 준수 | 동기 잠금 + 멱등키 — `apps/admin/src/shared/crud/useCrudForm.ts:122-150` |

## 4. 안정성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 쓰기가 반영된다 | — | **반영된다** — `apps/admin/src/shared/crud/crud.ts:118-170` |
| 없는 대상에 대한 쓰기 | 조용히 통과시키지 않는다 | 수정·삭제는 409, 상세 조회는 404 |
| 덮어쓰기 방지 | — | `DLG-COMMON-FORM-CONFLICT` 를 쓴다 |
| 조회 실패의 갈래 | — | 폼이 404 와 오류를 가르고 404 에는 '다시 시도'를 주지 않는다 — `apps/admin/src/shared/crud/FormPageShell.tsx:134-149` |
| ⚠ 이미지가 서버로 가지 않는다 | — | 본문 이미지 전부가 브라우저 안 참조다. **화면을 떠나면 여러 장이 한꺼번에 죽는다** — `apps/admin/src/shared/crud/validation.ts:41-62` |
| 원본을 건드리지 않는다 | — | 수정 진입에서 이미지 목록을 **새 배열로 복사해** 폼에 넣는다 — `apps/admin/src/pages/company/esg/EsgFormPage.tsx:59` |
| 부분 실패 | 일괄 삭제의 실패를 건수와 사유로 알린다 | 공용 컨트롤러가 재시도로 풀리는 실패와 그렇지 않은 실패를 갈라 말한다 — `apps/admin/src/shared/crud/useCrudList.tsx:94-107` |
| 로그 기록 | — | **확인하지 못했다** |

## 5. 호환성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 지원 브라우저 | 공통 준수 | 리포에 정의되어 있지 않다 |
| 모바일 지원 | 공통 준수 | 측정하지 않음 |
| 해상도 | 넓은 표는 가로 스크롤 방식을 갖는다 | **껍데기가 가로 스크롤을 두른다** — `apps/admin/src/shared/crud/CrudListShell.tsx:52-55`. 왼쪽 필터 폭은 토큰 배수로 고정돼 있다 — `apps/admin/src/pages/company/esg/EsgListPage.tsx:27-32` |
| 파일 선택 | — | 여러 개 선택과 드래그앤드롭 둘 다 받는다 |

## 6. 운영성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 로그 관리 | 공통 준수 | 확인하지 못했다 |
| 모니터링 | 공통 준수 | 없다 |
| 배포 영향 | — | 공용 CRUD 층을 고치면 기업 관리 목록형 자원 전체가 함께 바뀐다. **여러 장 이미지 입력을 고치면 그 부품을 쓰는 화면이 함께 바뀐다** |
| 설정 관리 | — | 분류 세 종(환경·사회·지배구조)은 **코드 상수**다 — `apps/admin/src/pages/company/esg/types.ts:33-37` |
| 실패 재현 손잡이 | — | 공통 스위치: `?fail=list` · `?fail=detail` · `?fail=save` · `?fail=delete` · 스코프 지정 `?fail=esg:save` — `apps/admin/src/shared/crud/dev.ts:92-97` |

## 7. 유지보수성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 코드 확장성 | — | 껍데기의 규칙을 코드 0줄로 받는다 |
| 화면 확장성 | 분류가 늘 때 견디는가 | 분류가 늘면 라벨·색·건수 지도에 타입 오류로 먼저 걸린다 — `apps/admin/src/pages/company/esg/types.ts:33-49` |
| 공통 컴포넌트 사용 여부 | — | **손수 조립한 UI 가 없다** |
| 규칙의 정본 하나 | — | 정렬·필터·건수 세 규칙이 순수 함수로 한 파일에 있고 테스트가 직접 부른다 — `apps/admin/src/pages/company/esg/types.ts:51-82` |

## 8. 제약사항

| 항목 | 내용 |
|---|---|
| 외부 시스템 연계 | 홈페이지는 이 리포 밖이다 |
| API 제약 | **백엔드가 없다** — `apps/admin/src/pages/company/esg/data-source.ts:45`(CRUD) |
| 파일 업로드 | **업로드 엔드포인트가 없다** — `apps/admin/src/shared/crud/validation.ts:56-58` |
| 파일 용량 제한 | **장당 5MB** — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:72` |
| 장수 제한 | **최대 10장** — `apps/admin/src/pages/company/esg/types.ts:26`. 화면 안내 표기는 `PNG · JPG · GIF · 최대 {최대 장수}장 · 장당 {최대 용량}MB` — `packages/ui/src/molecules/ImageGalleryField/ImageGalleryField.tsx:251` |
| 페이지 크기 상한 | **없다** — 페이지네이션 자체가 없다 |
| 입력 길이 제한 | 제목 120자 · 내용 1,000자 — `apps/admin/src/pages/company/esg/types.ts:84-85` |
| 제목·일자 중복 | **막지 않는다** |
| 조회 조건의 보존 | **분류 필터가 주소에 남지 않는다**(§2) |
