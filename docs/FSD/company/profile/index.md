# 회사 정보

> **이 문서는 단일 문서형 화면의 정본이다.** 기업 관리에는 목록 없이 문서 한 건을 고쳐 쓰는 화면이
> 셋 있다 — 회사 정보 · [CEO 인사말](../ceo-message/index.md) · [오시는 길](../directions/index.md).
> 세 화면은 같은 껍데기(`DocumentFormShell`)를 쓰므로 나머지 둘은 **차이만** 적는다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 회사 정보 |
| 화면 ID | `SCR-COMPANY-PROFILE` |
| 메뉴 경로 | 기업 관리 > 회사 정보 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 회사의 기본 정보(회사명 · 사업자등록번호 · 대표자명 · 연락처 · 주소 · 상세주소 · 로고)를 한 화면에서 고쳐 저장한다.

**업무 배경** — 이 값들은 홈페이지 푸터·사업자정보 표기·견적서에 그대로 나간다. 회사 이전이나 대표자 변경 때 개발자를 부르지 않고 고칠 수 있어야 하고, 반대로 **아무렇게나 적힌 주소가 그대로 나가서도 안 된다** — 그래서 주소는 검색으로만 고른다(§4.3).

**화면 설명** — 목록이 없다. 안내문 한 줄 아래 카드 하나에 일곱 칸이 놓이고, 카드 오른쪽 아래에 저장 상태 문구와 저장 버튼이 나란히 선다. **저장 버튼은 바뀐 것이 있을 때만 눌린다.**

**주요 사용자** — 최상위 관리자 · 기업 정보를 다루는 운영자.

**사용 시나리오**

1. 회사가 이전해 '주소 검색'으로 새 주소를 고르고 상세주소를 적어 저장한다.
2. 대표자가 바뀌어 대표자명만 고치고 저장한다.
3. 로고를 새로 올리다 마음이 바뀌어 다른 메뉴를 누른다 → 저장하지 않은 변경 확인이 뜬다.

**선행 조건** — 로그인 · **이 화면의 수정 권한**(없으면 화면이 열리지 않는다 — §9). 기업 관리 잎 여덟은 플랜 모듈 매핑에 없어 플랜 축으로 잠기지 않는다 — `apps/admin/src/shared/entitlements/module-resources.ts:64-76`(채용 공고만 `cms.pages` 에 들어 있다).

**후행 처리** — 저장하면 홈페이지의 회사 소개에 반영된다고 화면이 안내한다 — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:119`. 홈페이지는 이 리포 밖이라 반영 경로를 코드에서 확인하지 못했다.

**관련 화면** — [CEO 인사말](../ceo-message/index.md) · [오시는 길](../directions/index.md)(같은 껍데기) · [주소 검색](../directions/pop-address-search.md)(`POP-COMPANY-DIRECTIONS-ADDRESS-SEARCH` — 이 화면도 같은 팝업을 쓴다) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 기업 관리 가지의 첫 잎 — `apps/admin/src/shared/layout/nav-config.ts:155`.

**관련 기능** — 견적서의 공급자 정보가 이 문서의 주소를 읽는다. ⚠ **지금은 `주소` 한 칸만 읽어 상세주소가 빠진다** — 코드가 그 사실을 `TODO(consumer)` 로 적어 두었다 — `apps/admin/src/pages/company/profile/types.ts:11-15`.

**관련 API** — 문서 조회 1건 · 저장 1건. **백엔드가 없다** — `apps/admin/src/pages/company/profile/data-source.ts:25`. **이미지 업로드 엔드포인트도 없다** — `apps/admin/src/shared/crud/validation.ts:56-58`.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md)

**구현 파일** — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx` (껍데기 `apps/admin/src/shared/crud/DocumentFormShell.tsx` · 주소 부품 `apps/admin/src/shared/address-search/AddressField.tsx` · 검증 `validation.ts` · 상수 `types.ts`)

---

**⚠ 지금 코드에서 확인되는 사실 둘**

| 무엇 | 근거 |
|---|---|
| 로고 이미지가 서버로 올라가지 않는다 | 이미지 입력은 브라우저 안 미리보기 참조만 만든다. 화면을 떠나면 그 참조가 죽는다. 검증을 조여도 해결되지 않으며 고칠 곳은 업로드 이음매다 — `apps/admin/src/shared/crud/validation.ts:41-62` |
| 좌표(위도·경도)를 저장하지 않는다 | 이 문서에도, 오시는 길에도 좌표 칸이 없다 — `apps/admin/src/pages/company/directions/types.ts:5-9` |

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 권한 없음 화면 | 고칠 수 없는 폼은 열지 않는다 | **수정 권한이 없을 때** — `apps/admin/src/shared/crud/DocumentFormShell.tsx:114` | — | 불가 | 숨김 |
| 안내영역 | 필수 표기와 저장의 효과를 미리 말한다 | 권한이 있고 조회에 실패하지 않았을 때 | 전체 | 불가 | 표시 |
| 오류영역 | 저장 실패를 카드 맨 위 danger 배너로 | 저장 실패 | 전체 | 불가 | 숨김 |
| 입력영역 | 일곱 칸 | 〃 | 전체 | 불가 | 표시 |
| 버튼영역 | 저장 상태 문구 + 저장 버튼 | 〃 | 전체 | 불가 | 표시 |
| 조회 실패영역 | 문서를 못 읽었을 때 폼 대신 | 조회 실패 | 전체 | 불가 | 숨김 |

**권한 화면이 조회 실패보다 앞선다** — 권한이 없으면 문서를 읽었는지 여부조차 알릴 일이 아니다 — `apps/admin/src/shared/crud/DocumentFormShell.tsx:112-116`.

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 안내문 | Text | `별표(*)는 꼭 입력해야 하는 항목이에요. 저장하면 홈페이지의 회사 소개에 바로 반영돼요.` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:119` | 필수 표기와 저장 효과 | N | Y | — | — | — | — | 항상 | — |
| 2 | 카드 제목 | Heading(h2) | `회사 정보` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:118` | 입력 묶음의 이름 | N | Y | — | — | — | — | 항상 | 이 화면에는 h1 페이지 제목이 없다 |
| 3 | 저장 실패 배너 | Alert(danger) | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:110` | 실패의 유일한 표면 | N | Y | — | 숨김 | — | — | 저장 실패 | 오류 참조 코드가 붙지 않는다 |
| 4 | 회사명 | TextField | `회사명` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:129` | 홈페이지 푸터·견적서에 나간다 | Y | N | 저장 중 또는 최초 로딩 중 | 서버 값 | `예: 주식회사 예시플래닝` — `:136` | 100자 — `apps/admin/src/pages/company/profile/types.ts:27`(입력에서도 잘린다) | 항상 | — |
| 5 | 사업자등록번호 | TextField | `사업자등록번호` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:149` | `XXX-XX-XXXXX` | Y | N | 〃 | 서버 값 | `123-45-67890` — `:159` | 형식은 검증에서만 본다(입력에서 자르지 않는다) | 항상 | 힌트 `예: 123-45-67890` — `:152` |
| 6 | 대표자명 | TextField | `대표자명` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:169` | — | Y | N | 〃 | 서버 값 | `예: 홍길동` — `:176` | 50자 — `apps/admin/src/pages/company/profile/types.ts:31` | 항상 | — |
| 7 | 연락처 | TextField | `연락처` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:185` | 대표 전화 | Y | N | 〃 | 서버 값 | `예: 02-0000-0000` — `:192` | 40자 — `apps/admin/src/pages/company/profile/types.ts:32` | 항상 | 형식을 검사하지 않는다(길이만 본다) |
| 8 | 주소 | TextField(**읽기 전용**) | `주소` — `apps/admin/src/shared/address-search/AddressField.tsx:83` | **직접 타이핑할 수 없다** — 누르면 검색 팝업이 열린다 | Y | **Y** | 저장 중 또는 최초 로딩 중 | 서버 값 | `주소 검색으로 선택하세요` — `apps/admin/src/shared/address-search/AddressField.tsx:92` | 200자 — `apps/admin/src/pages/company/profile/types.ts:28` | 항상 | 힌트 `주소 칸이나 '주소 검색' 버튼을 누르면 검색창이 열려요. 층·호수는 아래 상세주소에 적어 주세요.` — `apps/admin/src/shared/address-search/AddressField.tsx:43-44` |
| 9 | 주소 검색 | Button(secondary) | `주소 검색` — `apps/admin/src/shared/address-search/AddressField.tsx:104` | 검색 팝업을 여는 정식 트리거 | N | N | 저장 중 또는 최초 로딩 중 | — | — | — | 항상 | 보조기술에 보이는 트리거는 이 버튼이다 |
| 10 | 상세주소 | TextField | `상세주소` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:211` | 건물명·층·호수 | N | N | 저장 중 또는 최초 로딩 중 | 서버 값 | `예: 예시타워 8층` — `:221` | 100자 — `apps/admin/src/pages/company/profile/types.ts:30` | 항상 | 힌트 `건물명·층·호수 등 (선택)` — `:213`. **오시는 길과 같은 길이를 쓴다** — 두 화면이 같은 칸을 다른 길이로 받으면 운영자가 두 번 배운다 — `apps/admin/src/pages/company/profile/types.ts:29` |
| 11 | 로고 이미지 | ImageUploadField | `로고 이미지` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:232` | 끌어다 놓거나 클릭해 올린다 | N | N | 저장 중 또는 최초 로딩 중 | 서버 값 | 빈 상태 안내 `클릭하거나 이미지를 이 영역에 끌어다 놓으세요` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:128` | 이미지 파일만 · 최대 5MB — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38-40,136` | 항상 | 힌트 `이미지를 끌어다 놓거나 클릭해 올려요. 비워 두면 로고가 나오지 않아요.` — `:239` |
| 12 | 저장 상태 문구 | Text(caption) | 저장 중 `저장하는 중이에요…` · 바뀐 것이 있으면 `저장하지 않은 변경 사항이 있어요.` · 없으면 `변경 사항이 없어요.` — `apps/admin/src/shared/crud/DocumentFormShell.tsx:153-157` | 저장 버튼이 왜 잠겼는지를 말한다 | N | Y | — | `변경 사항이 없어요.` | — | — | 항상 | 버튼 옆에 붙는다 |
| 13 | 저장 | Button(primary) | `저장` · 저장 중 `저장 중…` — `apps/admin/src/shared/crud/DocumentFormShell.tsx:165` | 검증 후 요청 | Y | N | **바뀐 것이 없을 때** · 저장 중 · 최초 로딩 중 — `apps/admin/src/shared/crud/DocumentFormShell.tsx:163` | — | — | — | 항상 | **취소 버튼이 없다** — 목록이 없어 돌아갈 곳이 없다 |
| 14 | 조회 실패 배너 | Alert(danger) + Button | `내용을 불러오지 못했어요.` + `다시 시도` — `apps/admin/src/shared/crud/DocumentFormShell.tsx:121-124` | 폼 전체를 대신한다 | N | Y | — | 숨김 | — | — | 조회 실패 | 도메인 이름이 들어가지 않는 공통 문장이다 |
| 15 | 스켈레톤 | 상태 표시 | (없음) | 카드 안 4행 | N | Y | — | — | — | — | 최초 조회 중 | `apps/admin/src/shared/crud/DocumentFormShell.tsx:141-147` |
| 16 | 필드 오류 문구 | Text(error) | §6 의 문구 | 해당 입력 아래 인라인 | N | Y | — | 없음 | — | — | 검증 위반 | `aria-invalid` 와 함께 나간다 |
| 17 | 권한 없음 화면 | ForbiddenScreen | `접근 권한이 없어요` — `apps/admin/src/shared/errors/ErrorScreens.tsx:73` | 폼 대신 화면 전체 | N | Y | — | 숨김 | — | — | 수정 권한 없음 | — |

## 4. 기능 명세

### 4.1 문서 조회

| 항목 | 내용 |
|---|---|
| 기능 목적 | 저장된 회사 정보 한 건을 읽어 폼을 채운다 |
| 실행 조건 | 화면 진입(수정 권한이 있을 때) |
| 사용자 동작 | 메뉴 클릭 |
| 시스템 처리 | 문서 1건을 조회해 도착하면 폼을 그 값으로 다시 세운다 — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:76-79` |
| 데이터 처리 | 아무것도 바꾸지 않는다 |
| Validation | 해당 없음 |
| API 호출 여부 | Y — 문서 조회 1건 |
| 성공 처리 | 일곱 칸이 채워지고 입력이 풀린다. 저장 버튼은 **바뀐 것이 없어 잠겨 있다** |
| 실패 처리 | 폼 대신 배너: `내용을 불러오지 못했어요.` + '다시 시도' — `apps/admin/src/shared/crud/DocumentFormShell.tsx:121-124` |
| 예외 처리 | 조회가 끝나기 전에는 카드 안이 스켈레톤 4행이고 입력이 잠긴다 — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:81,83` |
| 화면 변경 사항 | 입력영역 전체 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.2 저장

| 항목 | 내용 |
|---|---|
| 기능 목적 | 고친 값을 문서에 반영한다 |
| 실행 조건 | 바뀐 것이 있고 §6 의 검증을 전부 통과했을 때 |
| 사용자 동작 | '저장' 클릭 또는 폼에서 Enter |
| 시스템 처리 | 이전 오류 배너를 지우고 요청 1건을 보낸다. 진행 중에는 입력과 버튼이 잠긴다 |
| 데이터 처리 | 일곱 값이 통째로 저장된다(부분 저장이 없다) |
| Validation | §6 전부 |
| API 호출 여부 | Y — 저장 1건 |
| 성공 처리 | **저장된 값을 새 기준선으로 삼아 '바뀐 것 없음'으로 되돌린다**(저장 버튼이 다시 잠긴다) — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:105`. 토스트 `MSG-COMPANY-PROFILE-01`: `회사 정보를 저장했어요.` — `:106`. **화면 이동이 없다** |
| 실패 처리 | 화면에 남고 카드 맨 위 배너: `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:110`. 입력은 그대로 유지된다 |
| 예외 처리 | 요청이 중단되면(화면을 떠나 언마운트) 아무 표시도 하지 않는다 — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:74,109`. ⚠ 동기 중복 제출 잠금이 없다(버튼 비활성만으로 막는다) |
| 화면 변경 사항 | 오류영역 · 입력영역 · 버튼영역 |
| 후속 동작 | 없음 — 같은 화면에 머문다 |
| 로그 기록 여부 | 확인하지 못했다 |

### 4.3 주소 고르기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 우편번호 체계에 있는 주소만 저장되게 한다 |
| 실행 조건 | 저장 중·최초 로딩 중이 아닐 때 |
| 사용자 동작 | 주소 칸 클릭 · 주소 칸에서 Enter 또는 Space · '주소 검색' 버튼 클릭 — **세 경로가 같은 팝업을 연다** — `apps/admin/src/shared/address-search/AddressField.tsx:69-79,96-104` |
| 시스템 처리 | [주소 검색 팝업](../directions/pop-address-search.md)을 연다. 고른 주소가 돌아오면 주소 칸에 넣는다 |
| 데이터 처리 | **사용자가 목록에서 고른 표기를 존중한다**(도로명을 골랐으면 도로명, 지번을 골랐으면 지번). 고른 쪽이 비어 있으면 다른 쪽으로 넘어간다 — `apps/admin/src/shared/address-search/contract.ts:106-117`. 우편번호는 저장하지 않는다(칸이 없다) — `apps/admin/src/shared/address-search/contract.ts:38-39` |
| Validation | 주소는 필수다(§6). 자유 입력이 없어 형식 검증이 필요하지 않다 |
| API 호출 여부 | N — 우리 서버를 부르지 않는다. 검색 위젯은 브라우저가 외부 스크립트를 내려받아 돈다 — `apps/admin/src/shared/address-search/contract.ts:24` |
| 성공 처리 | 주소 칸이 채워지고 그 자리에서 검증이 다시 돈다. **상세주소가 비어 있을 때만** 건물명을 상세주소에 제안한다 — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:88-92` |
| 실패 처리 | 팝업 안에서 다룬다(스크립트를 받지 못하면 팝업이 그 사실을 말한다) |
| 예외 처리 | 이미 `8층 802호` 라고 적어 둔 상세주소는 **검색 한 번으로 덮이지 않는다** — 되돌릴 방법이 없는 손실이기 때문이다 — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:88-89` |
| 화면 변경 사항 | 주소 칸 · (비어 있었다면) 상세주소 칸 |
| 후속 동작 | 폼이 바뀐 상태가 되어 저장 버튼이 살아나고 이탈 가드가 걸린다 |
| 로그 기록 여부 | N |

### 4.4 로고 올리기 · 교체 · 제거

| 항목 | 내용 |
|---|---|
| 기능 목적 | 홈페이지에 쓸 로고 이미지를 고른다 |
| 실행 조건 | 저장 중·최초 로딩 중이 아닐 때 |
| 사용자 동작 | 드롭존 클릭(파일 선택) · 파일 끌어다 놓기 · 교체 · 제거 |
| 시스템 처리 | 고른 파일이 이미지인지, 5MB 이하인지 그 자리에서 검사한다 — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:37-41` |
| 데이터 처리 | **업로드하지 않는다.** 브라우저 안 미리보기 참조가 값이 된다(§1) |
| Validation | 로고는 **선택**이다 — 비우면 로고가 나오지 않는다 — `apps/admin/src/pages/company/profile/validation.ts:35-36` |
| API 호출 여부 | N — 업로드 엔드포인트가 없다 |
| 성공 처리 | 미리보기가 그려지고 안내가 `업로드 완료 — 아래에서 이미지를 교체하거나 제거할 수 있어요.` 로 바뀐다 — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:279` |
| 실패 처리 | 인라인 오류: `이미지 파일만 올릴 수 있어요.` 또는 `파일 용량은 5MB 를 넘을 수 없어요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40` |
| 예외 처리 | 브라우저가 그리지 못하면 `이미지를 불러오지 못했어요. 다시 선택하세요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:116` |
| 화면 변경 사항 | 입력영역의 로고 칸 |
| 후속 동작 | 폼이 바뀐 상태가 된다 |
| 로그 기록 여부 | N |

### 4.5 저장하지 않은 채 떠나기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 고친 값이 남은 채 화면을 떠나면 되돌릴 기회를 준다 |
| 실행 조건 | 폼이 바뀐 상태이고 저장 중이 아닐 때 — `apps/admin/src/shared/crud/DocumentFormShell.tsx:110` |
| 사용자 동작 | 앱 안 링크 클릭 · 뒤로가기 · 탭 닫기·새로고침 |
| 시스템 처리 | `DLG-COMMON-LEAVE-FORM` 을 세운다([공통 문서](../../_common/index.md) §4.3) |
| 데이터 처리 | 확인하면 입력이 버려진다 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 요청한 곳으로 이동한다. 토스트를 띄우지 않는다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | 이 화면은 공통 기본 문구 대신 자기 문장을 준다: `회사 정보에 아직 저장하지 않은 내용이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:37-38` |
| 화면 변경 사항 | 다이얼로그만 |
| 후속 동작 | 이동 또는 머무름 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 화면 진입 | `/company/profile` 도달 | 권한 판정 → 문서 조회 | 화면 전체 | 스켈레톤 → 채워진 폼 |
| 권한 없음 | 수정 권한이 없을 때 | 폼을 그리지 않고 `접근 권한이 없어요` 화면 | 화면 전체 | 권한 화면 |
| 조회 실패 | 오류 | 폼을 감추고 배너 | 조회 실패영역 | 배너 |
| 다시 시도 클릭 | 배너 버튼 | 문서 재조회 | 조회 실패영역 | 폼 또는 배너 |
| 값 입력 | 어느 칸이든 타이핑 | 저장 상태 문구가 `저장하지 않은 변경 사항이 있어요.` 로 바뀌고 저장 버튼이 살아난다 | 버튼영역 | 저장 가능 상태 |
| 주소 칸 클릭·Enter·Space | 읽기 전용 주소 칸 | 검색 팝업을 연다(Enter 가 폼을 제출하지 않는다 — `apps/admin/src/shared/address-search/AddressField.tsx:75-78`) | 주소 | `POP-COMPANY-DIRECTIONS-ADDRESS-SEARCH` |
| 주소 검색 클릭 | 옆 버튼 | 〃 | 주소 검색 | 〃 |
| 주소 선택 | 팝업이 주소를 돌려줌 | 주소 칸을 채우고, 상세주소가 비어 있으면 건물명을 제안한다 | 주소 · 상세주소 | 채워진 폼 |
| 파일 선택 · 드롭 | 클릭 또는 드래그앤드롭 | 형식·용량 검사 후 미리보기 | 로고 이미지 | 미리보기 또는 인라인 오류 |
| 제출 | '저장' 클릭 또는 Enter | 배너를 지우고 검증 → 요청 | 폼 | 저장 중 상태 |
| 검증 실패 | 위반이 있을 때 | 요청을 만들지 않고 첫 위반 필드로 포커스(RHF 기본) | 입력영역 | 인라인 오류 |
| 저장 중 | 요청이 나간 뒤 | 입력·버튼 잠금 · 상태 문구 `저장하는 중이에요…` · 버튼 라벨 `저장 중…` | 입력영역 · 버튼영역 | 잠긴 폼 |
| 저장 성공 | 응답 도착 | 기준선 갱신(저장 버튼이 다시 잠긴다) + 토스트 | 버튼영역 | 같은 화면 |
| 저장 실패 | 오류 | 카드 맨 위 배너 · 입력 유지 | 오류영역 | 폼 + 배너 |
| dirty 이탈 | 링크·뒤로가기·탭 닫기 | `DLG-COMMON-LEAVE-FORM` | 다이얼로그 | 이동 또는 머무름 |

## 6. Validation

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 회사명 | 공백만이면 안 된다 | 제출 시 | `회사명을 입력하세요.` — `apps/admin/src/shared/crud/validation.ts:21-23` 의 규칙에 `회사명` 라벨이 들어간 값 | 제출 차단 · 첫 위반 필드로 포커스 · 인라인 오류 |
| 회사명 | 100자 이하 | 제출 시 | `회사명은 100자를 넘을 수 없어요.` — `apps/admin/src/pages/company/profile/validation.ts:24-26` 의 규칙에 `회사명`·100 이 들어간 값 | 〃 |
| 사업자등록번호 | 공백만이면 안 된다 | 제출 시 | `사업자등록번호를 입력하세요.` — `apps/admin/src/pages/company/profile/validation.ts:21` | 〃 |
| 사업자등록번호 | `숫자3-숫자2-숫자5` | 제출 시 | `사업자등록번호 형식이 올바르지 않아요. (예: 123-45-67890)` — `apps/admin/src/pages/company/profile/validation.ts:23` | 〃. **체크섬은 검사하지 않는다** |
| 주소 | 공백만이면 안 된다 | 제출 시 | `주소를 입력하세요.` — 공통 규칙에 `주소` 라벨이 들어간 값 | 〃. 자유 입력이 없어 형식 검증은 필요 없다 |
| 주소 | 200자 이하 | 제출 시 | `주소는 200자를 넘을 수 없어요.` | 〃 |
| 상세주소 | **선택** — 100자 이하 | 제출 시 | `상세주소는 100자를 넘을 수 없어요.` — `apps/admin/src/pages/company/profile/validation.ts:29-31` | 〃 |
| 대표자명 | 공백만이면 안 된다 · 50자 이하 | 제출 시 | `대표자명을 입력하세요.` · `대표자명은 50자를 넘을 수 없어요.` — 공통 규칙에 `대표자명`·50 이 들어간 값 | 〃 |
| 연락처 | 공백만이면 안 된다 · 40자 이하 | 제출 시 | `연락처를 입력하세요.` · `연락처는 40자를 넘을 수 없어요.` | 〃. **전화번호 형식을 검사하지 않는다** |
| 로고 이미지 | **선택** — 형식을 강제하지 않는다 | — | 없음 | 업로드 이음매가 없어 조이면 저장 자체가 불가능해진다 — `apps/admin/src/shared/crud/validation.ts:39-63` |
| 로고 이미지 | 이미지 파일 · 5MB 이하 | 파일을 고른 즉시 | `이미지 파일만 올릴 수 있어요.` · `파일 용량은 5MB 를 넘을 수 없어요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40` | 값을 바꾸지 않고 인라인 오류 |

**검증 규칙의 정본은 zod 스키마다** — `apps/admin/src/pages/company/profile/validation.ts`. 필수 텍스트 규칙과 문구는 공통 조각이 갖는다 — `apps/admin/src/shared/crud/validation.ts:19-28`(조사는 라벨의 받침이 고른다).

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | 해당 없음 — 이 문서는 언제나 한 건이 있다(픽스처가 기본값을 준다). 조회가 실패하면 아래 'API 오류'로 다룬다 | — | — |
| 저장 실패 | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:110` | 화면에 남고 배너 · 입력 유지 | 저장 재클릭 |
| 수정 실패 | 저장 실패와 같다 — 이 화면의 저장은 언제나 수정이다 | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 이 화면에 삭제가 없다(문서를 지우는 경로가 없다) | — | — |
| API 오류 | 조회면 `내용을 불러오지 못했어요.` — `apps/admin/src/shared/crud/DocumentFormShell.tsx:121`. 저장이면 위 문구. 서버 응답 원문을 노출하지 않는다 | 배너 | 다시 시도 |
| 서버 오류 | 위와 같다 — 5xx 에 별도 문구가 없다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | 자동 재시도 없음 — `apps/admin/src/shared/query/queryClient.ts:82,108` | 〃 |
| 권한 없음 | 화면 전체가 `접근 권한이 없어요` 로 바뀐다 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73` | **폼을 그리지 않는다** — 고칠 수 있다는 거짓 신호를 주지 않기 위해서다 — `apps/admin/src/shared/crud/DocumentFormShell.tsx:112-114` | 관리자에게 권한 요청 |
| 세션 만료 | 자기 문구가 없다 — 401 이면 앱이 로그인 화면으로 보낸다 | 세션 폐기 · 원래 경로 보존 | 재로그인(입력은 사라진다) |
| 데이터 충돌 | ⚠ **충돌 처리가 없다** — 이 껍데기는 저장 충돌 다이얼로그를 쓰지 않는다. 다른 관리자가 먼저 저장했어도 마지막에 저장한 쪽이 이긴다 | 배너도 뜨지 않는다(성공으로 끝난다) | 새로고침해 최신 값을 확인 |
| 중복 데이터 | 해당 없음 — 문서가 한 건이다 | — | — |
| 파일 업로드 실패 | `이미지 파일만 올릴 수 있어요.` · `파일 용량은 5MB 를 넘을 수 없어요.` · `이미지를 불러오지 못했어요. 다시 선택하세요.` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:38,40,116` | 값을 바꾸지 않고 인라인 오류만 붙인다 | 다른 파일을 고른다 |

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 카드 안 스켈레톤 4행 · 입력 잠금 | 저장 × | Y | 안내문 |
| 데이터 있음(바뀐 것 없음) | 일곱 칸이 서버 값으로 채워져 있다 | **저장 ×**(바뀐 것이 없다) | N | `변경 사항이 없어요.` |
| 데이터 있음(바뀐 것 있음) | 고친 값이 그대로 보인다 | 저장 ○ | N | `저장하지 않은 변경 사항이 있어요.` |
| 데이터 없음 | 성립하지 않는다 — 문서가 한 건이다. 값이 빈 문자열이면 빈 칸으로 그린다 | 저장 × | N | `변경 사항이 없어요.` |
| 조회 실패 | 폼이 사라지고 배너 하나 | 다시 시도 ○ | N | `내용을 불러오지 못했어요.` |
| 저장 중 | 입력과 저장이 잠기고 라벨이 `저장 중…` | 저장 × | Y | `저장하는 중이에요…` |
| 저장 실패 | 카드 맨 위 배너 · 입력 유지 | 저장 ○ | N | `저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 검증 실패 | 위반한 칸 아래 인라인 오류 · 첫 위반 칸으로 포커스 | 저장 ○ | N | §6 의 해당 문구 |
| 읽기 전용(권한) | **폼이 열리지 않는다** — 화면 전체가 `접근 권한이 없어요` | — | N | `접근 권한이 없어요` |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | — | ○ | — | — | ○ | — | — |
| 운영자 | 역할의 `page:/company/profile` 권한을 따른다 | — | 〃 | — | — | 〃 | — | — |
| 뷰어 | 화면이 열리지 않는다(아래) | — | × | — | — | × | — | — |
| 권한 없음 | × | — | × | — | — | × | — | — |

등록·삭제 축이 없다 — 이 껍데기는 **언제나 수정**이다(문서는 이미 존재한다) — `apps/admin/src/shared/crud/DocumentFormShell.tsx:103-107`. 업로드는 수정 권한에 딸린다.

**권한이 없을 때 화면이 어떻게 되는가** — ⚠ **수정 권한이 없으면 조회조차 할 수 없다.** 이 화면에는 조회 전용 표시가 없어, 읽기 권한만 가진 사람도 `접근 권한이 없어요` 화면을 본다 — `apps/admin/src/shared/crud/DocumentFormShell.tsx:112-114`. 목록형 화면(조회는 되고 쓰기 컨트롤만 사라진다)과 다른 결정이다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-COMPANY-PROFILE` | 주소 칸 클릭·Enter·Space · '주소 검색' 클릭 | `POP-COMPANY-DIRECTIONS-ADDRESS-SEARCH` | Y | 저장 중·로딩 중이 아님 | 없음 | 이 화면(고른 주소가 칸에 들어온다) |
| `SCR-COMPANY-PROFILE` | dirty 상태로 앱 안 링크·뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 dirty 이고 저장 중이 아님 | 이동하려던 경로 | 확인=목적지 · 취소=이 화면 |
| `SCR-COMPANY-PROFILE` | dirty 상태로 탭 닫기·새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-COMPANY-PROFILE` | 수정 권한 없이 진입 | `접근 권한이 없어요` 화면 | N | 수정 권한 없음 | 없음 | 사이드바로 다른 메뉴 |
| `SCR-COMPANY-PROFILE` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | `returnUrl` · 만료 표식 | 재인증 후 이 화면 |

**저장에 성공해도 화면이 바뀌지 않는다** — 목록이 없어 돌아갈 곳이 없다.

**이 화면의 결과 통지 토스트는 1건**(`MSG-COMPANY-PROFILE-01`)이고 §4.2 에 문구 그대로 적혀 있다. 인벤토리(성공 1 · 실패 0)와 일치한다. 화면 고유 확인 다이얼로그는 0건이다.
