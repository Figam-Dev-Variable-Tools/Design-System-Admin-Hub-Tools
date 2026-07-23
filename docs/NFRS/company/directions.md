# 오시는 길 — 비기능 명세서

| 항목 | 내용 |
|---|---|
| 자원명 | 오시는 길 |
| 화면 ID | `SCR-COMPANY-DIRECTIONS` · `POP-COMPANY-DIRECTIONS-ADDRESS-SEARCH` |
| 메뉴 경로 | 기업 관리 > 오시는 길 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |
| 관련 기능 명세서 | [오시는 길](../../FSD/company/directions/index.md) · [주소 검색 팝업](../../FSD/company/directions/pop-address-search.md) |

**이 자원의 성격** — [회사 정보](profile.md)와 **같은 껍데기·같은 주소 부품**을 쓰는 단일 문서형 자원이다. 세 결정(수정 권한이 없으면 화면이 열리지 않음 · 바뀐 것이 있을 때만 저장 가능 · 충돌 처리 없음)이 모두 같다. 아래 각 절은 그 문서 대비 **다른 것만** 적는다. **이 자원의 가장 큰 사실은 좌표와 지도가 없다는 것이다**(§8).

## 1. 성능

| 항목 | 요구 | 이 자원의 값 | 측정 방법 |
|---|---|---|---|
| 응답 시간 | 공통 준수 | 측정하지 않음 — 백엔드가 없다 | 백엔드 연동 후 재작성 |
| 조회 성능 | 공통 준수 | **문서 1건이 전부다** | 코드 확인 |
| 동시 사용자 | 공통 준수 | 측정하지 않음 | — |
| 대용량 데이터 처리 | 공통 준수 | 해당 없음 — 목록도 표도 없다. 세 값이 전부다 | — |
| 지도 렌더 비용 | — | **없다.** 지도를 그리지 않으므로 지도 SDK 도, 타일 요청도, 그것을 기다리는 상태도 없다 — `apps/admin/src/shared/address-search/contract.ts:4-8` | 코드 확인 |
| 지오코딩 비용 | — | **없다.** 좌표를 만들지 않는다 — 같은 자리 | 코드 확인 |
| 주소 검색의 비용 | 외부 스크립트가 화면 진입을 막지 않는다 | 위젯은 팝업을 열 때 비로소 내려받는다 — `apps/admin/src/shared/address-search/AddressSearchModal.tsx:98-127` | 코드 확인 |

## 2. 사용성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| UI 일관성 | 공통 준수 | 단일 문서형 껍데기 + 회사 정보와 **같은 주소 부품**. 두 화면이 같은 일을 다르게 하면 운영자가 두 번 배운다 — `apps/admin/src/pages/company/profile/CompanyProfilePage.tsx:6-8` |
| 잘못된 주소가 저장되지 않게 한다 | — | 주소 입력이 **읽기 전용**이다. 자유 입력을 열어 두면 **홈페이지에 실제로 찾아갈 수 없는 주소가 뜰 수 있다 — 화면 어디에도 틀렸다는 표시가 없는 채로** — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:5-9` |
| 접근성 — 읽기 전용 입력의 조작 | 클릭에만 걸지 않는다 | Enter·Space 로도 열리고 옆의 `주소 검색` 버튼이 정식 트리거다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:11-14` |
| 사용자의 입력을 덮지 않는다 | — | 건물명은 상세주소가 비어 있을 때만 제안한다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:94-98` |
| 주소만으로 못 찾는 것을 적을 자리 | 잃은 기능의 대안을 준다 | 지도의 핀 미세조정이 사라진 대신, **정문 위치·주차 입구 같은 안내를 교통편 칸에 문장으로** 적게 한다 — 힌트가 그것을 명시한다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:169` |
| 설정이 필요 없다는 사실을 말한다 | — | 입력 아래에 `주소 검색은 카카오(다음) 우편번호 서비스를 그대로 써요. 따로 설정할 것은 없어요.` 가 상시 표시된다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:186` |
| 사용자 피드백 | 공통 준수 | 성공 토스트 1건뿐이다 |
| 미저장 보호 | 공통 준수 | 문구는 이 자원의 것이다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:46-47` |

## 3. 보안

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 권한 | 리소스 키 | 잎 `page:/company/directions`. 언제나 `update` 를 요구한다 |
| ⚠ 조회 전용 상태가 없다 | — | **수정 권한이 없으면 화면 전체가 `접근 권한이 없어요` 다** — `apps/admin/src/shared/crud/DocumentFormShell.tsx:112-114` |
| 플랜(엔타이틀먼트) | 공통 준수 | **걸리지 않는다** — 모듈 대응표에 없다 |
| 개인정보 마스킹 | 어떤 필드를 어떤 규칙으로 가리는가 | **가리는 필드가 없다** — 주소·상세주소·교통편은 회사 소재지 정보이며 홈페이지에 공개되는 값이다 |
| 입력값 검증 | 화면 검증과 서버 검증을 구분한다 | 화면 검증만 있다 — `apps/admin/src/pages/company/directions/validation.ts`. 주소는 필수이고 **자유 입력이 없어 형식 검증이 필요하지 않다**. 상세주소·교통편은 선택이며 길이만 본다 |
| 주소의 신뢰 경계 | 외부 스크립트가 준 값을 그대로 믿지 않는다 | 날것을 한 겹 검사해 전부 문자열로 수렴시킨다 — `apps/admin/src/shared/address-search/contract.ts:89-104` |
| 사용자가 고른 표기를 존중한다 | — | 도로명을 골랐는데 지번을 저장하면 **홈페이지에 뜨는 주소가 운영자가 확인한 것과 달라진다** — `apps/admin/src/shared/address-search/contract.ts:106-117` |
| ⚠ 중복 제출 | — | **버튼 비활성만으로 막는다** |

## 4. 안정성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 장애 대응 | 조회 실패 시 무엇을 남기는가 | 폼이 사라지고 공통 문장이 뜬다 — `apps/admin/src/shared/crud/DocumentFormShell.tsx:121` |
| 외부 스크립트 실패 | 로딩과 실패를 뭉개지 않는다 | 팝업이 **대기 안내**와 **실패 배너 + '다시 시도'** 를 다른 상태로 그린다. 위젯 자리는 실패해도 **DOM 에서 지우지 않는다** — 지우면 '다시 시도'가 심을 자리가 사라져 눌러도 영원히 로딩에 머무는 버튼이 된다 — `apps/admin/src/shared/address-search/AddressSearchModal.tsx:38-40` |
| 유령 위젯을 남기지 않는다 | — | 심는 사이에 팝업이 닫혔으면 즉시 거둔다 — `apps/admin/src/shared/address-search/AddressSearchModal.tsx:110-114` |
| 치던 검색어가 사라지지 않는다 | — | 부모가 다시 렌더돼도 위젯을 새로 심지 않는다 — `apps/admin/src/shared/address-search/AddressSearchModal.tsx:92-96` |
| ⚠ 덮어쓰기 방지 | — | **충돌 처리가 없다** — 마지막에 저장한 쪽이 이긴다 |
| 좌표와 주소가 어긋나지 않는다 | 파생값을 저장하지 않는다 | **좌표를 저장하지 않으므로 어긋날 대상 자체가 없다** — 함께 저장하면 주소를 고친 뒤 좌표가 그대로 남는 순간이 반드시 오고, 그때 어느 쪽이 진실인지 아무도 모른다 — `apps/admin/src/pages/company/directions/types.ts:6-9` |
| 로그 기록 | — | **확인하지 못했다** |

## 5. 호환성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 지원 브라우저 | 공통 준수 | 리포에 정의되어 있지 않다 |
| 모바일 지원 | 공통 준수 | 측정하지 않음 |
| 해상도 | — | 표도 지도도 없어 폭 요구가 낮다. 교통편 입력은 세로로 늘릴 수 있다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:49-53` |
| 주소 검색의 형태 | — | 모달 안 임베드다(팝업 차단기에 막히지 않는다) — `apps/admin/src/shared/address-search/AddressSearchModal.tsx:12-15` |
| 확장 프로그램·프록시 | — | 스크립트가 차단될 수 있다. 브라우저가 '끊김'과 '차단'을 구분해 주지 않아 **문구가 두 가능성을 함께 말한다** — `apps/admin/src/shared/address-search/contract.ts:51-55` |

## 6. 운영성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 로그 관리 | 공통 준수 | 확인하지 못했다 |
| 모니터링 | 공통 준수 | 없다 |
| 배포 영향 | 이 자원을 고치면 어느 화면이 함께 영향을 받는가 | 주소 부품을 고치면 [회사 정보](profile.md)도 함께 바뀐다. **홈페이지가 지도를 그린다면 주소 문자열로 직접 지오코딩해야 한다** — 우리는 좌표를 내려보내지 않는다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:25-26` |
| 설정 관리 | 이 자원의 동작을 바꾸는 설정값이 어느 화면에 있는가 | **없다.** 우편번호 서비스는 앱 키도 도메인 등록도 요구하지 않아 `키 미등록` 이라는 실패가 이 경로에 존재하지 않는다 — `apps/admin/src/shared/address-search/contract.ts:16-18` |
| 운영이 잃은 것 | — | ⚠ **지도의 핀 미세조정이 사라졌다.** 지오코딩이 주는 점은 '주소의 대표점'이라 실제 출입구·주차 입구와 다를 수 있는데, 그 차이를 표현할 수단이 없다. **운영자가 받아들인 손실**이며 대안은 교통편 문장이다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:22-24` |
| 실패 재현 손잡이 | — | `?fail=list` · `?fail=save` — `apps/admin/src/pages/company/directions/data-source.ts:16` 이 그 스위치를 지난다. **주소 검색 실패는 스크립트를 못 받는 상황으로만 재현된다**(네트워크 차단) |

## 7. 유지보수성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 코드 확장성 | — | 단일 문서형 껍데기의 규칙을 그대로 받는다 |
| 화면 확장성 | — | 값이 늘면 스키마와 폼에 한 줄씩 더하면 된다 |
| 공통 컴포넌트 사용 여부 | 페이지가 UI 를 손수 조립하지 않는다 | **손수 조립한 UI 가 없다.** 주소 칸도 부품이다 — 두 화면이 같은 30여 줄(행 레이아웃·키보드 처리·모달 열고 닫기)을 들고 있으면 **특히 접근성 처리처럼 눈에 띄지 않는 부분이 한쪽만 고쳐진다** — `apps/admin/src/shared/address-search/AddressField.tsx:3-5` |
| 외부 SDK 를 가둔다 | — | 우편번호 서비스는 계약 파일 너머로 새지 않는다 — `apps/admin/src/shared/address-search/contract.ts:10-14` |
| 실패는 결과값이다 | 예외로 던지지 않는다 | 검색 어댑터는 성공/실패를 **값으로** 돌려준다 — 예외로 던지면 호출부가 타입을 다시 좁혀야 하고 그것을 빠뜨리면 실패가 '알 수 없는 오류'로 뭉개진다 — `apps/admin/src/shared/address-search/contract.ts:20-22` |
| 없는 실패를 타입에 적지 않는다 | — | 실패 이유가 하나뿐인 유니온이다. 이유가 늘면 **문구 지도가 타입 오류로 먼저 터진다** — 새 실패가 조용히 빈 문장이 되는 길을 막는다 — `apps/admin/src/shared/address-search/contract.ts:57-59` |

## 8. 제약사항

| 항목 | 내용 |
|---|---|
| 외부 시스템 연계 | **주소 검색은 카카오(다음) 우편번호 서비스**를 브라우저에서 그대로 쓴다. 우리 서버도 앱 키도 필요 없다 — `apps/admin/src/shared/address-search/contract.ts:16-18,24` |
| API 제약 | **백엔드가 없다** — `apps/admin/src/pages/company/directions/data-source.ts:16`(조회·저장). 주소 검색은 백엔드가 필요 없다 — `apps/admin/src/pages/company/directions/DirectionsPage.tsx:28-29` |
| **좌표를 저장하지 않는다** | 위도·경도 칸이 이 문서에도, 회사 정보에도 없다 — `apps/admin/src/pages/company/directions/types.ts:5-9` |
| **지도를 그리지 않는다** | 지도 렌더도 지오코딩도 이 앱에 없다. 그 둘만 요구하던 지도 앱 키도 함께 사라졌다 — `apps/admin/src/shared/address-search/contract.ts:4-8` |
| 우편번호 | **저장하지 않는다** — 어느 폼에도 칸이 없다 — `apps/admin/src/shared/address-search/contract.ts:38-39` |
| 입력 길이 제한 | 주소 200자 · 상세주소 100자 · 교통편 1,000자 — `apps/admin/src/pages/company/directions/types.ts:19-21` |
| 필수·선택 | 주소만 필수이고 상세주소·교통편은 선택이다 — `apps/admin/src/pages/company/directions/validation.ts:17-19` |
| 파일 용량 제한 | 해당 없음 — **이 자원에 파일 입력이 없다** |
| 업로드 가능 확장자 | 해당 없음 — 같은 이유 |
