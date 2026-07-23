# 채용 공고 — 비기능 명세서

| 항목 | 내용 |
|---|---|
| 자원명 | 채용 공고 |
| 화면 ID | `SCR-COMPANY-CAREERS` · `SCR-COMPANY-CAREERS-FORM` |
| 메뉴 경로 | 기업 관리 > 채용 공고 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |
| 관련 기능 명세서 | [목록](../../FSD/company/careers/index.md) · [등록·수정](../../FSD/company/careers/form.md) |

**이 자원의 성격** — [연혁](history.md)과 **같은 공용 껍데기**를 쓰되, 기업 관리에서 **홀로 플랜에 걸리고**(모듈 `cms.pages`) **업무 규칙이 가장 많다**. 아래 각 절은 그 문서 대비 **다른 것만** 적는다. 이 자원의 두 축은 ① **마감을 저장하지 않고 계산한다** ② **공개는 지원 경로가 열려 있을 때만 허용한다(fail-closed)** 이다.

## 1. 성능

| 항목 | 요구 | 이 자원의 값 | 측정 방법 |
|---|---|---|---|
| 응답 시간 | 공통 준수 | 측정하지 않음 — 백엔드가 없다 | 백엔드 연동 후 재작성 |
| 조회 성능 | 공통 준수 | 목록 1건 · 폼(수정) 1건. **세 축 필터와 검색을 서버가 하지 않는다** — 전체를 한 번 받아 화면에서 좁힌다 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:125-128` | 코드 확인 |
| 대용량 데이터 처리 | 가상화 없이 대량 행을 그리지 않는다 | ⚠ **페이지네이션도 가상화도 없다** — 전량을 그린다 | 코드 확인 |
| 상태 계산 비용 | — | 상태는 **행마다 마감일과 오늘을 비교해** 만든다. 서버 왕복이 없다 — `apps/admin/src/pages/company/careers/types.ts:117-121` | 코드 확인 |
| '오늘'을 고정한다 | 같은 화면이 두 답을 내지 않는다 | '오늘'을 렌더마다 새로 만들지 않고 **한 번만** 만들어 고정한다 — 그러지 않으면 자정 언저리에 같은 목록이 다른 답을 낸다 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:118-122` | 코드 확인 |
| 배치가 필요 없다 | 야간 작업 없이도 답이 맞는다 | 마감 여부를 저장하지 않으므로 **바꿔 줄 배치가 필요 없다.** 서버 응답에도 그 값이 없다 — `apps/admin/src/pages/company/careers/data-source.ts:81` | 코드 확인 |

## 2. 사용성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| UI 일관성 | 공통 준수 | 목록·폼 모두 공용 껍데기. **손수 조립한 UI 가 없다** |
| 조회 상태 보존 | 목록이 Back·새로고침을 견딘다 | 직무·고용형태·상태·검색어를 **주소 쿼리스트링**이 소유한다 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:91-103`. 기업 관리 목록 중 조건이 주소에 남는 유일한 자원이다 |
| 빈 상태의 사유 | 검색·필터·진짜 비어 있음을 구분한다 | **구분한다** — `검색 지우기`·`필터 초기화` 가 사유에 맞게 붙는다 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:227-232` |
| 빈 값을 문장으로 말한다 | 빈 칸을 남기지 않는다 | 마감일이 없으면 빈 칸이 아니라 `상시 채용` 이라고 적는다 — `apps/admin/src/pages/company/careers/types.ts:143-146` |
| 먼저 묻고 그 다음 칸을 연다 | 안 쓰는 칸이 값을 들지 않게 한다 | **상시 채용을 먼저 고르게** 하고, 켜면 마감일 칸이 사라지며 남아 있던 날짜도 지운다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:3-5,251-255` |
| 한 칸이 두 뜻을 겸한다 | 저장 뒤 어느 값이 진짜인지 알 수 있게 한다 | 지원 대상은 **한 칸**이고 지원 방법이 라벨·입력 종류·자리표시자를 바꾼다. 칸을 둘로 나누면 안 쓰는 칸이 값을 들고 있어 뒤에 구별할 수 없다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:7-9` |
| 저장 전에 막힐 이유를 말한다 | 제출해 보고 알게 하지 않는다 | 공개하려는데 지원 경로가 열리지 않으면 **카드 맨 위에 경고 배너**가 미리 뜬다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:156-163` |
| 경고를 무시한 성공을 만들지 않는다 | — | 예전에는 소비처가 배너뿐이라 **경고를 띄운 채 저장이 성공했다.** 지금은 스키마와 저장소가 함께 막는다 — 같은 자리 `:159-162` |
| 사용자 피드백 | 공통 준수 | **이 자원 고유의 토스트가 0건이다** — 전부 공통 층의 문구다 |
| 미저장 보호 | 공통 준수 | 문구는 이 자원의 것이다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:45-46` |

## 3. 보안

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 권한 | 리소스 키 | 잎 `page:/company/careers` |
| 권한 게이팅 | 누를 수 없는 것을 보여 주지 않는다 | 등록 버튼은 화면이(`apps/admin/src/pages/company/careers/CareersListPage.tsx:211`), 나머지는 껍데기가 가린다. 폼은 권한이 없으면 열리지 않는다 |
| 플랜(엔타이틀먼트) | 공통 준수 | ⚠ **기업 관리에서 유일하게 플랜에 걸린다** — 모듈 `cms.pages` 다. 기업 관리 가지에 있지만 **홈페이지 게시판이라 파는 단위가 CMS 다** — `apps/admin/src/shared/entitlements/module-resources.ts:75-76`. 판정 순서는 인증 → 플랜 → 권한이다 — `apps/admin/src/shared/entitlements/plan.ts:10-17` |
| 개인정보 마스킹 | 어떤 필드를 어떤 규칙으로 가리는가 | **가리는 필드가 없다.** 다만 `지원서 접수 이메일` 은 회사 채용 담당 주소이며 **홈페이지에 공개되는 값**이라 가리면 기능이 성립하지 않는다. 지원자의 개인정보는 이 어드민에 들어오지 않는다(접수는 메일·외부 페이지에서 일어난다) |
| 지원 경로의 프로토콜 | 개인정보를 받는 화면은 암호화된 연결이어야 한다 | **외부 링크는 `https://` 만 받는다** — 취향이 아니라 **지원자가 개인정보를 입력하는 화면**이기 때문이다 — `apps/admin/src/pages/company/careers/types.ts:160-161,172-174` |
| 실패 방향 | 모르면 막는다 | ⚠ **옛 공고가 지금 없는 지원 방법 값을 들고 있으면 공개 저장이 거절된다**(fail-closed). 가드가 `지원 방법을 고르세요.` 를 돌려주고 공개 게이트가 그것을 막는다 — `apps/admin/src/pages/company/careers/types.ts:177`. **비공개 저장은 통과하므로 공고 자체는 잃지 않는다** |
| 입력값 검증 | 화면 검증과 서버 검증을 구분한다 | 화면 검증과 **저장소 가드가 같은 순수 함수를 읽는다** — 폼이 저장의 유일한 입구가 아니기 때문이다 — `apps/admin/src/pages/company/careers/validation.ts:2-8` · `apps/admin/src/pages/company/careers/data-source.ts:93-116` |
| 이슈를 필드에 붙인다 | 화면 어디에도 안 그려지는 오류를 만들지 않는다 | 객체 수준 이슈는 어느 입력의 오류로도 흘러가지 않으므로 **언제나 필드 경로를 준다** — 공개 게이트는 지원 대상, 마감일은 마감일 칸 — `apps/admin/src/pages/company/careers/validation.ts:10-13` |
| 중복 제출 | 공통 준수 | 동기 잠금 + 멱등키 — `apps/admin/src/shared/crud/useCrudForm.ts:122-150` |

## 4. 안정성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 쓰기가 반영된다 | — | **반영된다** — `apps/admin/src/shared/crud/crud.ts:118-170` |
| 시간이 만드는 상태 | 배치 없이도 답이 맞는다 | **마감을 저장하지 않는다.** 저장하면 그 값을 바꿔 줄 배치가 필요해지고, 배치가 하루 실패하면 **지난 공고가 '모집 중'으로 남아 지원서를 계속 받는다** — `apps/admin/src/pages/company/careers/types.ts:3-8` |
| 경계값을 자르지 않는다 | — | **마감일 당일까지는 모집 중**이다 — D-day 에 지원하는 사람을 자정 기준으로 잘라 내면 마지막 날이 사실상 없는 날이 된다 — `apps/admin/src/pages/company/careers/types.ts:113-116` |
| `null` 과 빈 값을 섞지 않는다 | 모름과 없음을 구분한다 | 마감일 `null` 은 **상시 채용이라는 의도**이지 '아직 안 정함'이 아니다. 빈 문자열을 `null` 로 조용히 접지 않고 **검증에서 막는다** — 접으면 '아직 안 정함'이 소리 없이 '상시 채용'이 되어 아무도 모른 채 홈페이지에 걸린다 — `apps/admin/src/pages/company/careers/validation.ts:14-24` |
| 저장소의 마지막 문 | 폼이 유일한 입구가 아니다 | 마감일이 빈 문자열이거나 공개 게이트에 걸리면 **저장소가 422 로 거절하고 필드 이름을 함께 준다** — `apps/admin/src/pages/company/careers/data-source.ts:101-116` |
| 덮어쓰기 방지 | — | `DLG-COMMON-FORM-CONFLICT` 를 쓴다 |
| 정렬이 날마다 달라지지 않는다 | — | 정렬 함수는 **'오늘'을 받지 않는다** — 받으면 같은 목록이 날마다 다른 순서로 저장되고 그 순서는 어디에도 기록되지 않는다. 마감일 내림차순이 같은 일을 한다 — `apps/admin/src/pages/company/careers/types.ts:226-233` |
| 로그 기록 | — | **확인하지 못했다** |

## 5. 호환성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 지원 브라우저 | 공통 준수 | 리포에 정의되어 있지 않다 |
| 모바일 지원 | 공통 준수 | 측정하지 않음 |
| 해상도 | 넓은 표는 가로 스크롤 방식을 갖는다 | **껍데기가 가로 스크롤을 두른다** — `apps/admin/src/shared/crud/CrudListShell.tsx:52-55`. 이 표는 열이 여덟(체크박스·순번·제목·직무·고용형태·근무지·마감일·상태·행 액션)으로 이 묶음에서 가장 넓다 |
| 툴바의 폭 | — | 검색과 select 셋이 한 줄에 들어가지 못하면 줄바꿈된다 — `apps/admin/src/pages/company/careers/CareersListPage.tsx:75-83` |
| 입력 종류 | — | 마감일은 브라우저의 날짜 입력, 지원 대상은 지원 방법에 따라 이메일 또는 URL 입력으로 바뀐다 — `apps/admin/src/pages/company/careers/CareersFormPage.tsx:305` |

## 6. 운영성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 로그 관리 | 공통 준수 | 확인하지 못했다 |
| 모니터링 | 공통 준수 | 없다 |
| 배포 영향 | 이 자원을 고치면 어느 화면이 함께 영향을 받는가 | 공용 CRUD 층을 고치면 기업 관리 목록형 자원 전체가 함께 바뀐다. **플랜 대응표에서 이 잎을 빼면 어떤 플랜에서도 잠기지 않게 된다**(매핑에 없으면 열린다) — `apps/admin/src/shared/entitlements/module-resources.ts:75-76` |
| 사라진 선택지의 흔적 | 없어진 기능의 잔해를 남기지 않는다 | **`지원 폼` 선택지가 걷혔다** — 그 폼을 만들 화면(폼 관리)이 IA 에서 빠지면서 고를 수는 있는데 절대 공개할 수 없는 선택지가 됐기 때문이다 — `apps/admin/src/pages/company/careers/types.ts:57-64`. 옛 공고가 그 값을 들고 있어도 §3 의 fail-closed 가 막는다 |
| 설정 관리 | — | 직무 여섯 · 고용형태 넷 · 지원 방법 둘이 전부 **코드 상수**다 — `apps/admin/src/pages/company/careers/types.ts:26-33,38-43,65-68` |
| 실패 재현 손잡이 | — | 공통 스위치: `?fail=list` · `?fail=detail` · `?fail=save` · `?fail=delete` · 스코프 지정 `?fail=careers:save` · 상태 지정 `?status=save:422` — `apps/admin/src/shared/crud/dev.ts:92-97` |
| 픽스처가 네 상태를 담는다 | 파생이 실제로 도는지 화면에서 볼 수 있어야 한다 | 시드에 **상시 채용 · 모집 중 · 이미 지난 마감일 · 비공개** 넷이 다 있고, 날짜는 오늘에 상대적이라 시간이 지나도 그대로 유지된다 — `apps/admin/src/pages/company/careers/data-source.ts:6-7,18-21` |

## 7. 유지보수성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 코드 확장성 | — | 껍데기의 규칙을 코드 0줄로 받는다 |
| 화면 확장성 | 축이 늘 때 견디는가 | 직무·고용형태·지원 방법이 **`as const satisfies` 로 선언돼 있어** 항목을 더하면 타입이 함께 넓어진다 — `apps/admin/src/pages/company/careers/types.ts:26-33` |
| 공통 컴포넌트 사용 여부 | — | **손수 조립한 UI 가 없다** |
| 규칙의 정본 하나 | 같은 판정을 두 곳에 적지 않는다 | 상태 판정 · 지원 방법 가드 · 공개 게이트 · 필터 · 검색 · 정렬이 **전부 순수 함수로 한 파일에 있고** 화면·스키마·저장소가 그것을 부른다 — `apps/admin/src/pages/company/careers/types.ts:99-248` |
| 사유를 boolean 으로 두지 않는다 | — | 가드가 **문자열 사유**를 돌려준다 — 화면이 왜 막혔는지를 스스로 지어내지 않게 한다 |

## 8. 제약사항

| 항목 | 내용 |
|---|---|
| 외부 시스템 연계 | 홈페이지는 이 리포 밖이다. 지원 접수는 **이메일 또는 외부 페이지**에서 일어나며 이 어드민은 그 주소만 갖는다 |
| API 제약 | **백엔드가 없다** — `apps/admin/src/pages/company/careers/data-source.ts:80`. **마감 여부는 응답에 없다 — 서버도 저장하지 않는다** — 같은 파일 `:81` |
| 플랜 제약 | 모듈 `cms.pages` 가 잠기면 화면이 잠금 안내로 바뀌거나 메뉴에서 사라진다 — `apps/admin/src/shared/entitlements/plan.ts:109-112` |
| 지원 방법 | **`이메일 접수` 와 `외부 링크` 둘뿐이다.** `지원 폼` 은 제거됐다(§6) |
| 외부 링크의 프로토콜 | **`https://` 만 허용한다** — `apps/admin/src/pages/company/careers/types.ts:151,172-174` |
| 페이지 크기 상한 | **없다** — 페이지네이션 자체가 없다 |
| 입력 길이 제한 | 공고 제목 100자 · 근무지 60자 · 공고 내용 2,000자 · 지원 대상 300자 — `apps/admin/src/pages/company/careers/types.ts:250-253` |
| 제목 중복 | **막지 않는다** |
| 파일 용량 제한 | 해당 없음 — **이 자원에 파일 입력이 없다** |
| 업로드 가능 확장자 | 해당 없음 — 같은 이유 |
