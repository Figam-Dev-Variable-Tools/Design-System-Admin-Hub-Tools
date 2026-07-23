# 인증서/특허 — 비기능 명세서

| 항목 | 내용 |
|---|---|
| 자원명 | 인증서/특허 |
| 화면 ID | `SCR-COMPANY-CERTIFICATES` · `SCR-COMPANY-CERTIFICATES-FORM` |
| 메뉴 경로 | 기업 관리 > 인증서/특허 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |
| 관련 기능 명세서 | [목록](../../FSD/company/certificates/index.md) · [등록·수정](../../FSD/company/certificates/form.md) |

**이 자원의 성격** — [연혁](history.md)과 **같은 계열**이되(쓰기 반영 · 권한 게이팅 · 충돌 방어) **목록만 공용 껍데기를 쓰지 못한다** — 행 드래그 재정렬 때문이다. 아래 각 절은 그 문서 대비 **다른 것만** 적는다. 이 자원의 가장 큰 특징은 **순서를 바꿀 수 없을 때 그 이유를 문장으로 말한다**는 것이다 — 같은 재정렬을 가진 다른 화면(FAQ·배너·로고 목록) 넷은 조용히 컨트롤만 감춘다.

## 1. 성능

| 항목 | 요구 | 이 자원의 값 | 측정 방법 |
|---|---|---|---|
| 응답 시간 | 공통 준수 | 측정하지 않음 — 백엔드가 없다 | 백엔드 연동 후 재작성 |
| 조회 성능 | 공통 준수 | 목록 1건 · 폼(수정) 1건. **구분 필터는 서버를 다시 부르지 않는다** — 받아 둔 목록 위에서 건다 — `apps/admin/src/pages/company/certificates/types.ts:170-177` | 코드 확인 |
| 대용량 데이터 처리 | 가상화 없이 대량 행을 그리지 않는다 | ⚠ **페이지네이션도 가상화도 없다** — 전량을 그린다. 재정렬이 성립하려면 전체가 한 화면에 있어야 한다는 제약과 맞물려 있다 | 코드 확인 |
| 재정렬의 비용 | 순서를 바꿀 때마다 표가 깜빡이지 않는다 | 낙관적으로 먼저 옮기고 저장한다. 재조회 중에도 표를 비우지 않는다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:234-240` | 코드 확인 |
| 요청 중복 방지 | 빠른 연속 이동이 요청을 쌓지 않는다 | 앞선 재정렬 요청이 있으면 **중단하고 새 것을 보낸다** — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:166-168` | 코드 확인 |
| 이미지 비용 | 목록이 이미지 때문에 무거워지지 않는다 | **목록에 이미지 열이 없다.** 이미지는 폼에서만 다룬다 — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:5-8` | 코드 확인 |

## 2. 사용성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| UI 일관성 | 공통 준수 | ⚠ **목록만 공용 껍데기를 쓰지 못한다** — 드래그는 행에 핸들러를 걸어야 하는데 그 행은 디자인 시스템 표가 소유한다. 그래서 껍데기가 하던 나머지(라이브 영역·요약·선택 바·실패 배너·다이얼로그)를 **같은 형태로 손수 조립한다** — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:6-11` |
| 왜 못 하는지 말한다 | 비활성·부재의 이유를 남긴다 | **순서를 바꿀 수 없으면 그 자리에 사유 문장이 온다** — 권한 없음 · 필터가 걸림 · 2건 미만 셋 — `apps/admin/src/pages/company/certificates/types.ts:127-145`. 손잡이가 그냥 사라지면 운영자는 '이 화면은 원래 못 바꾸는구나'와 '지금 조건에서만 못 바꾸는구나'를 구별할 수 없다 — 같은 파일 `:120-122` |
| 접근성 — 라이브 영역이 둘이다 | 수명이 다른 통지를 섞지 않는다 | 목록 상태와 순서 변경을 **각각 다른 라이브 영역**이 읽는다. 한 영역에 섞으면 재렌더의 건수 문장이 방금 넣은 순서 문장을 덮어쓴다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:194-196` |
| 접근성 — 순서 변경을 소리로 전한다 | 시각적 사실을 놓치지 않는다 | 옮긴 뒤 `'{명칭}'{조사} {전체}건 중 {위치}번째로 옮겼어요.` 를 라이브 영역에 넣는다. **움직인 행이 무엇인지는 훅이 알려 준 값으로** 정한다 — 배열 비교로 추측하면 이웃 맞바꿈에서 엉뚱한 행을 부른다 — `apps/admin/src/pages/company/certificates/types.ts:147-163` |
| 접근성 — 표 설명이 사실을 따라간다 | 없는 버튼을 있다고 읽지 않는다 | caption 이 **열 목록 + 권한이 있는 조작 + 재정렬 가능 여부**를 조립해 읽는다. 조작이 하나도 없으면 ` 조회 전용이에요.` 가 붙는다 — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:133-144` |
| 드래그를 쓸 수 없는 사용자 | 같은 일을 다른 경로로 할 수 있다 | 행마다 위/아래 이동 버튼이 있다 — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:216-224` |
| 행 클릭을 쓰지 않는다 | 제스처가 겹치지 않는다 | 재정렬 표에서는 행 제스처가 드래그에 점유된다. **끌다 만 동작이 클릭으로 읽히면 수정 화면으로 튕겨 나간다** — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:17-18` |
| 빈 상태의 사유 | 필터·진짜 비어 있음을 구분한다 | **구분한다** — 필터 때문일 때만 `필터 초기화` 가 붙는다 — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:181-186` |
| 사용자 피드백 | 공통 준수 | 이 자원 고유의 토스트 3건(성공 1 · 실패 2). 실패에는 '다시 시도'가 붙고 자동으로 사라지지 않는다 |
| ⚠ 조회 조건이 주소에 남지 않는다 | 목록이 Back·새로고침을 견딘다 | 구분 필터는 **화면 상태**다 — 폼에 갔다 돌아오면 전체로 되돌아간다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:122` |

## 3. 보안

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 권한 | 리소스 키 | 잎 `page:/company/certificates` |
| 권한 게이팅 | 누를 수 없는 것을 보여 주지 않는다 | **화면이 직접 판정한다**(껍데기를 쓰지 않으므로). 등록 버튼·선택 바·표의 체크박스·연필·휴지통이 각각 권한을 따른다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:121,224,250` · `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:126-131,229-230` |
| 순서 변경의 권한 | 게이팅이 장식이 되지 않게 한다 | **화면과 저장이 같은 술어를 읽는다** — 버튼을 숨기기만 하고 저장 경로를 열어 두면 게이팅이 아니라 장식이다. 권한 강등이나 필터 적용은 표가 다시 그려지기 전에도 일어날 수 있어 **저장 경로가 스스로 막는다** — `apps/admin/src/pages/company/certificates/types.ts:124-125` · `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:149-164` |
| 폼의 권한 문 | 저장할 수 없는 폼을 열지 않는다 | 공용 폼 껍데기를 쓰므로 연혁과 같다 |
| 플랜(엔타이틀먼트) | 공통 준수 | **걸리지 않는다** — 모듈 대응표에 없다 |
| 개인정보 마스킹 | — | **가리는 필드가 없다** — 명칭·발급기관·발급일·구분·이미지뿐이다. **증빙 이미지에 개인정보가 찍혀 있을 가능성은 운영자의 판단에 맡겨진다**(업로드 전 검사가 없다) |
| 입력값 검증 | 화면 검증과 서버 검증을 구분한다 | 화면 검증만 있다 — `apps/admin/src/pages/company/certificates/validation.ts`. 발급일은 **형태만** 보고 실재하는 날짜인지는 보지 않는다 — 같은 파일 `:7,14-16` |
| 이미지 형식을 강제하지 않는다 | — | 업로드 이음매가 없어 조이면 저장 자체가 불가능해진다 — `apps/admin/src/shared/crud/validation.ts:39-63` |
| 중복 제출 | 공통 준수 | 폼은 동기 잠금 + 멱등키를 쓴다. **재정렬은 그 보호가 없다** — 대신 앞선 요청을 중단한다(§1) |

## 4. 안정성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 쓰기가 반영된다 | — | **반영된다** — `apps/admin/src/shared/crud/crud.ts:118-170` |
| 없는 대상에 대한 쓰기 | 조용히 통과시키지 않는다 | 수정·삭제는 409, 상세 조회는 404 — 연혁과 같다 |
| 낙관적 업데이트와 롤백 | 실패하면 화면을 되돌린다 | 실패 시 행이 원래 자리로 돌아가고 **옮겼다는 낭독도 함께 거둔다** — 화면과 소리가 어긋나지 않게 한다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:180-187` |
| 즉시 저장을 고른 이유 | 미저장 상태를 만들지 않는다 | 별도 '순서 저장' 버튼을 두면 **저장 버튼이 있는 목록**과 **연필을 누를 때마다 경고하는 이탈 가드**를 이 화면에만 새로 만들어야 한다. 즉시 저장이면 **미저장 변경이라는 상태 자체가 존재하지 않는다** — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:13-23` |
| 수동 순서와 자동 정렬의 충돌 | 조작이 없던 일이 되지 않게 한다 | **수동 순서가 이긴다.** 목록 조회는 순서 오름차순이고 발급일은 정렬 규칙이 아니라 표시되는 열이다. 발급일 내림차순은 **아직 아무도 순서를 만지지 않은 최초 배정**에만 쓴다 — `apps/admin/src/pages/company/certificates/types.ts:16-26` |
| 덮어쓰기 방지 | — | 폼은 `DLG-COMMON-FORM-CONFLICT` 를 쓴다. ⚠ **재정렬에는 충돌 개념이 없다** — 두 관리자가 동시에 옮기면 마지막 저장이 이긴다 |
| ⚠ 이미지가 서버로 가지 않는다 | — | 증빙 이미지는 브라우저 안 참조뿐이라 화면을 떠나면 죽는다 — `apps/admin/src/shared/crud/validation.ts:41-62` |
| 로그 기록 | — | **확인하지 못했다** |

## 5. 호환성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 지원 브라우저 | 공통 준수 | 리포에 정의되어 있지 않다 |
| 모바일 지원 | 공통 준수 | 측정하지 않음 |
| 해상도 | 넓은 표는 가로 스크롤 방식을 갖는다 | **있다** — 껍데기를 쓰지 못하는 대신 같은 감싸개를 화면이 직접 둘렀다 — `apps/admin/src/pages/company/certificates/CertificatesListPage.tsx:102-106` |
| 드래그 입력 | 포인터가 없는 환경에서도 같은 일을 할 수 있다 | 이동 버튼이 그 대체 경로다(§2) |
| 파일 선택 | — | 드래그앤드롭과 파일 선택 둘 다 받는다 — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:128` |

## 6. 운영성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 로그 관리 | 공통 준수 | 확인하지 못했다 |
| 모니터링 | 공통 준수 | 없다 |
| 배포 영향 | — | 재정렬 UI(손잡이 셀·이동 버튼·드래그 훅)는 디자인 시스템 것을 쓰므로, **그것을 고치면 같은 UI 를 쓰는 다섯 화면(FAQ·배너·고객센터 FAQ·로고 목록·이 화면)이 함께 바뀐다** — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:10-15` |
| 설정 관리 | — | 구분 두 종(인증서·특허)은 코드 상수다 — `apps/admin/src/pages/company/certificates/types.ts:43-46` |
| 실패 재현 손잡이 | — | `?fail=list` · `?fail=save` · `?fail=delete` · **`?fail=reorder`** · 스코프 지정 `?fail=certificates:save` — `apps/admin/src/shared/crud/dev.ts:92-97` |
| 새 항목의 자리 | — | 등록하면 **맨 끝**에 붙는다(발급일과 무관) — 운영자가 직접 옮긴다 — `apps/admin/src/pages/company/certificates/types.ts:113-116` |

## 7. 유지보수성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 코드 확장성 | 새 화면이 공통 규칙을 자동으로 물려받는다 | ⚠ **목록은 그 이득을 절반만 받는다** — 조회·선택·삭제는 공용 컨트롤러가 하지만, 껍데기가 그리던 것은 화면이 직접 조립한다. 껍데기에 새 규칙이 더해지면 **이 화면에는 손으로 옮겨야 한다** |
| 화면 확장성 | — | 열이 늘면 표의 열 배열과 caption 이 함께 갱신돼야 한다(caption 이 열 목록을 읽어 만든다) — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:141-144` |
| 공통 컴포넌트 사용 여부 | 페이지가 UI 를 손수 조립하지 않는다 | 표만 지역 컴포넌트다. **재정렬 UI 는 새로 만들지 않았다** — `apps/admin/src/pages/company/certificates/CertificatesTable.tsx:15` |
| 규칙의 정본 하나 | 같은 판정을 두 곳에 적지 않는다 | 재정렬 거부 사유 · 순서 재배치 · 최초 배정 · 다음 순서 · 낭독 문장이 **전부 순수 함수로 한 파일에 있고 테스트가 그것을 직접 부른다** — `apps/admin/src/pages/company/certificates/types.ts:71-163` |
| 사유를 boolean 으로 두지 않는다 | — | 거부 사유를 **문자열로** 돌려준다. boolean 만 주면 사유가 화면마다 다시 쓰이고 갈라진다 — `apps/admin/src/pages/company/certificates/types.ts:118-125` |

## 8. 제약사항

| 항목 | 내용 |
|---|---|
| 외부 시스템 연계 | 홈페이지는 이 리포 밖이다. 저장된 순서가 그 화면의 노출 순서가 된다 |
| API 제약 | **백엔드가 없다** — `apps/admin/src/pages/company/certificates/data-source.ts:59`(CRUD) · `:91`(순서 저장) |
| 파일 업로드 | **업로드 엔드포인트가 없다** — `apps/admin/src/shared/crud/validation.ts:56-58` |
| 파일 용량 제한 | 이미지 최대 5MB — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:136` |
| 업로드 가능 확장자 | 안내 표기는 `PNG · JPG · GIF · 최대 5MB` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:271`. 판정은 파일 종류가 이미지인지로 한다 |
| 페이지 크기 상한 | **없다** — 페이지네이션 자체가 없다 |
| 입력 길이 제한 | 명칭 100자 · 발급기관 100자 — `apps/admin/src/pages/company/certificates/types.ts:179-180` |
| 순서 변경의 조건 | **수정 권한 · 필터가 전체 · 2건 이상** 셋을 모두 만족해야 한다 — `apps/admin/src/pages/company/certificates/types.ts:127-145` |
| 명칭 중복 | **막지 않는다** |
| 이미지의 필수 여부 | **필수다** — 다른 화면의 로고·사진이 선택인 것과 다르다 — `apps/admin/src/pages/company/certificates/validation.ts:23` |
