# 파트너사 — 비기능 명세서

| 항목 | 내용 |
|---|---|
| 자원명 | 파트너사 |
| 화면 ID | `SCR-COMPANY-PARTNERS` · `POP-COMMON-LOGO-FORM`(공유 팝업) |
| 메뉴 경로 | 기업 관리 > 파트너사 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |
| 관련 기능 명세서 | [목록](../../FSD/company/partners/index.md) · [로고 등록·수정 팝업](../../FSD/_common/pop-logo-form.md) |

**이 자원의 성격** — **파트너사와 [고객사](clients.md)는 한 화면 모듈을 설정으로 공유한다.** 그래서 이 문서가 그 모듈의 정본이고 고객사 문서는 차이만 적는다. 기업 관리 목록형이지만 [연혁](history.md)과 달리 **공용 목록 껍데기를 쓰지 않는다** — 드래그 재정렬 때문이다. 그 대가로 **쓰기 권한 게이팅이 없다**(§3).

## 1. 성능

| 항목 | 요구 | 이 자원의 값 | 측정 방법 |
|---|---|---|---|
| 응답 시간 | 공통 준수 | 측정하지 않음 — 백엔드가 없다 | 백엔드 연동 후 재작성 |
| 조회 성능 | 공통 준수 | 목록 1건이 전부다. **팝업은 별도 조회를 하지 않는다** — 목록이 들고 있던 값을 그대로 채운다 | 코드 확인 |
| 대용량 데이터 처리 | 가상화 없이 대량 행을 그리지 않는다 | ⚠ **페이지네이션도 가상화도 없다.** 그 이유가 코드에 적혀 있다 — **로고는 순서가 곧 의미라 전부 한 화면에 그리고 드래그로 옮긴다** — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:6-8` | 코드 확인 |
| 재조회 중 표시 | 데이터가 있는 상태의 재조회는 표를 비우지 않는다 | 스켈레톤 조건을 '데이터가 아직 없을 때'로 좁혔다 — **노출 토글과 순서 이동이 일상이고 둘 다 재조회를 부르기 때문**이다 — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:116-126` | 코드 확인 |
| 요청 중복 방지 | 빠른 연속 이동이 요청을 쌓지 않는다 | 앞선 재정렬 요청을 중단하고 새 것을 보낸다 — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:135-137` | 코드 확인 |
| 이미지 비용 | 목록이 이미지 때문에 무거워지지 않는다 | **표에 썸네일 열이 없다** — 열은 이름·링크·상태 셋뿐이다 — `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:70` | 코드 확인 |

## 2. 사용성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| UI 일관성 | 공통 준수 | 배치·패턴을 콘텐츠 목록(FAQ)에서 가져왔다 — 검색 + 등록 + 선택 일괄 삭제 + 표 + 확인 다이얼로그 — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:3-4` |
| 조회 상태 보존 | 목록이 Back·새로고침을 견딘다 | 검색어를 주소가 소유한다. **두 라우트가 각자 자기 주소를 가지므로 파트너사와 고객사의 검색어가 서로 섞이지 않는다** — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:9-10` |
| 한글 입력 | 조합 중에 요청을 보내지 않는다 | 이름이 대부분 한글이라, 조합 중 조회가 나가면 자모 단위로 요청이 붙고 조합 확정용 Enter 가 반쯤 조합된 낱말로 제출된다 — 그것을 훅이 막는다 — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:86-88` |
| 여러 건을 한 번에 정리하기 | 반복 작업을 왕복시키지 않는다 | 노출을 **표에서 바로** 켜고 끈다. 팝업을 열게 하면 열 건을 내리는 데 열 번 저장해야 한다 |
| 드래그를 쓸 수 없는 사용자 | 같은 일을 다른 경로로 할 수 있다 | 행마다 위/아래 이동 버튼이 있다 — `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:194-201` |
| ⚠ 재정렬이 막힌 이유를 말하지 않는다 | 왜 못 하는지 알 수 있어야 한다 | **검색어가 걸리면 손잡이와 이동 버튼이 조용히 사라진다** — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:132`. [인증서/특허](certificates.md)는 같은 자리에서 사유를 문장으로 남긴다 |
| 표 설명이 실제 조작을 따라간다 | — | caption 이 재정렬 가능 여부에 따라 한 문장을 더하거나 뺀다 — `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:118-122` |
| 비어 있음을 값으로 말한다 | 빈 칸을 남기지 않는다 | 링크가 없으면 `—` 를 그린다 — `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:181` |
| ⚠ 빈 상태의 사유 | 검색·진짜 비어 있음을 구분한다 | **구분하지 않는다** — 0행이면 언제나 같은 한 줄이고 복구 컨트롤이 없다 — `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:151` |
| ⚠ 접근성 — 라이브 영역 | 0행 전환을 소리로 전한다 | **없다** — 공용 목록 껍데기를 쓰지 않아 그 영역이 오지 않는다 |
| 사용자 피드백 | 공통 준수 | 토스트 7건(성공 5 · 실패 2)이며 **파트너사와 고객사가 그 한 벌을 공유한다.** 실패 둘에는 '다시 시도'가 붙는다 |

## 3. 보안

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 권한 | 리소스 키 | 잎 `page:/company/partners`. **고객사와 별개 키**이므로 한쪽만 열어 줄 수 있다 — `apps/admin/src/shared/permissions/resources.ts:66-68` |
| ⚠ 권한 게이팅 | 누를 수 없는 것을 보여 주지 않는다 | **없다.** 이 화면은 공용 목록 껍데기를 쓰지 않고 권한 판정도 부르지 않아, 추가·연필·토글·드래그·삭제가 권한과 무관하게 보이고 동작한다. 같은 재정렬 사정을 가진 [인증서/특허](certificates.md)는 화면이 직접 판정해 이 문제가 없다 |
| 프런트 게이팅의 지위 | 공통 준수 | 프런트 게이팅은 보안 경계가 아니라 UX 다 — 실제 차단은 서버의 몫이다 — `apps/admin/src/shared/permissions/RequirePermission.tsx:8-11` |
| 플랜(엔타이틀먼트) | 공통 준수 | **걸리지 않는다** — 모듈 대응표에 없다 |
| 개인정보 마스킹 | 어떤 필드를 어떤 규칙으로 가리는가 | **가리는 필드가 없다** — 이름(법인명)·로고 이미지·링크·순서·노출 여부뿐이며 개인 식별 정보가 아니다 |
| 입력값 검증 | 화면 검증과 서버 검증을 구분한다 | 검증은 팝업이 갖는다 — `apps/admin/src/pages/company/logo-list/validation.ts`. 이름 필수·60자, 로고 필수, 링크는 비었거나 `http(s)://` |
| 이미지 형식을 강제하지 않는다 | — | 업로드 이음매가 없어 조이면 저장 자체가 불가능해진다 — `apps/admin/src/shared/crud/validation.ts:39-63` |
| ⚠ 중복 제출 | — | 팝업은 **버튼 비활성만으로** 막는다(공용 폼 컨트롤러를 쓰지 않는다) |
| 외부 링크의 열림 | — | 목록의 링크는 새 탭으로 열리며 참조 정보를 넘기지 않는다 — `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:172-177` |

## 4. 안정성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 쓰기가 반영된다 | — | **반영된다** — 어댑터가 픽스처 배열을 갱신한다 — `apps/admin/src/pages/company/logo-list/adapter.ts:52-82` |
| 없는 대상에 대한 쓰기 | 조용히 통과시키지 않는다 | **수정·삭제·노출 토글이 전부 409 로 막힌다** — `map`·`filter` 는 없는 id 를 지나치고 성공을 반환하므로, 다른 관리자가 방금 지운 로고를 만지면 '변경했습니다'가 뜨지만 바뀐 것이 없었다 — `apps/admin/src/pages/company/logo-list/adapter.ts:32-44` |
| ⚠ 재정렬만 그 방어가 없다 | — | **`reorder` 만 존재 검사를 하지 않는다** — `apps/admin/src/pages/company/logo-list/adapter.ts:72-76`. 지워진 항목이 섞인 순서를 보내도 거절되지 않는다(다만 없는 id 는 재배치에서 무시된다 — `apps/admin/src/pages/company/logo-list/types.ts:46-49`) |
| ⚠ 충돌 사유를 갈라 보여 주지 않는다 | — | 어댑터는 `다른 사용자가 먼저 삭제한 항목이에요.` · `이미 삭제된 항목이에요.` 를 구분해 주는데(`apps/admin/src/pages/company/logo-list/adapter.ts:63,69,80`), **화면은 그것을 일반 실패 문구로 뭉갠다** |
| ⚠ 이미지가 서버로 가지 않는다 | — | 로고는 브라우저 안 참조뿐이라 **팝업을 떠나면 목록 썸네일이 깨진다**. 그 사실을 숨기려 가짜 업로드 성공을 지어내지 않는다 — `apps/admin/src/shared/crud/validation.ts:56-62` |
| 낙관적 업데이트와 롤백 | — | 재정렬은 낙관적으로 먼저 옮기고 실패 시 되돌린 뒤 재시도 토스트를 준다 — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:145-148` |
| 부분 실패 | 일괄 삭제의 실패를 건수로 알린다 | 전부 성공했을 때만 다이얼로그가 닫히고 선택이 해제된다 — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:237-248` |
| 취소는 실패가 아니다 | 공통 준수 | 중단된 요청은 아무 표시도 만들지 않는다 — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:146,167,212` |
| 로그 기록 | — | **확인하지 못했다** |

## 5. 호환성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 지원 브라우저 | 공통 준수 | 리포에 정의되어 있지 않다 |
| 모바일 지원 | 공통 준수 | 측정하지 않음 |
| ⚠ 해상도 | 넓은 표는 가로 스크롤 방식을 갖는다 | **가로 스크롤 감싸개가 없다** — 공용 목록 껍데기를 쓰지 않는데 인증서/특허처럼 직접 두르지도 않았다. 열은 여섯(체크박스·손잡이·순번·이름·링크·상태·행 액션)이다 |
| 드래그 입력 | 포인터가 없는 환경에서도 같은 일을 할 수 있다 | 이동 버튼이 그 대체 경로다 |
| 파일 선택 | — | 팝업에서 드래그앤드롭과 파일 선택 둘 다 받는다 — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:128` |

## 6. 운영성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 로그 관리 | 공통 준수 | 확인하지 못했다 |
| 모니터링 | 공통 준수 | 없다 |
| 배포 영향 | 이 자원을 고치면 어느 화면이 함께 영향을 받는가 | ⚠ **이 화면을 고치면 [고객사](clients.md)가 함께 바뀐다** — 한 컴포넌트를 공유하기 때문이다. 반대로 **한쪽만 고치는 것이 불가능하다** — 차이를 두려면 설정 인자를 늘려야 한다 |
| 설정 관리 | — | 주입되는 값은 셋뿐이다: 자원 이름 · 엔티티 라벨 · 데이터 소스 — `apps/admin/src/pages/company/partners/PartnersPage.tsx:8` |
| 실패 재현 손잡이 | — | **자원별로 갈린다** — `?fail=partners:save` 처럼 스코프를 지정해 파트너사만 실패시킬 수 있다 — `apps/admin/src/pages/company/logo-list/adapter.ts:49,54,62,68,74,79` |
| 새 항목의 자리 | — | 등록하면 **맨 끝에 노출 상태로** 붙는다 — `apps/admin/src/pages/company/logo-list/adapter.ts:57-58` |

## 7. 유지보수성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 코드 확장성 | 새 화면이 공통 규칙을 자동으로 물려받는다 | ⚠ **공용 목록 껍데기를 쓰지 않아 그 이득을 받지 못한다** — 권한 게이팅·라이브 영역·사유별 빈 상태·가로 스크롤이 전부 빠져 있다 |
| 두 화면이 한 모듈이다 | 같은 것을 두 벌로 두지 않는다 | 데이터 모양과 화면이 동일해 **config 로 공유한다** — 각자 표·모달·필터를 복사하면 배치가 어긋난다 — `apps/admin/src/pages/company/logo-list/types.ts:3-5` |
| 공통 컴포넌트 사용 여부 | 페이지가 UI 를 손수 조립하지 않는다 | 표와 팝업 골격이 지역 컴포넌트다. **재정렬 UI 는 디자인 시스템 것을 쓴다** — `apps/admin/src/pages/company/logo-list/LogoListTable.tsx:110` |
| 규칙의 정본 하나 | — | 필터·재배치·다음 순서가 순수 함수로 한 파일에 있고 테스트가 직접 부른다 — `apps/admin/src/pages/company/logo-list/types.ts:28-59` |
| 어댑터를 팩토리로 만든다 | — | 두 자원이 같은 CRUD 규약을 쓰므로 시드만 다른 어댑터를 팩토리가 만든다 — `apps/admin/src/pages/company/logo-list/adapter.ts:1-6` |

## 8. 제약사항

| 항목 | 내용 |
|---|---|
| 외부 시스템 연계 | 홈페이지는 이 리포 밖이다. 저장된 순서와 노출 여부가 그 화면의 로고 띠를 정한다 |
| API 제약 | **백엔드가 없다** — `apps/admin/src/pages/company/partners/data-source.ts:47`(CRUD · 순서 · 노출) |
| 파일 업로드 | **업로드 엔드포인트가 없다** — `apps/admin/src/pages/company/logo-list/adapter.ts:1-4` 의 어댑터도 파일을 보내지 않는다 |
| 파일 용량 제한 | 이미지 최대 5MB — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:136` |
| 업로드 가능 확장자 | 안내 표기는 `PNG · JPG · GIF · 최대 5MB` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:271`. 판정은 파일 종류가 이미지인지로 한다 |
| 페이지 크기 상한 | **없다** — 순서가 곧 의미라 전량을 그린다 |
| 입력 길이 제한 | 이름 60자 — `apps/admin/src/pages/company/logo-list/types.ts:61` |
| 이름 중복 | **막지 않는다** |
| 순서 변경의 조건 | **검색어가 비어 있을 때만** — `apps/admin/src/pages/company/logo-list/LogoListPage.tsx:132` |
| 권한 게이팅 | **없다**(§3) |
