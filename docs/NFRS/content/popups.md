# 팝업 관리 — 비기능 명세서

| 항목 | 내용 |
|---|---|
| 자원명 | 팝업 관리 |
| 화면 ID | `SCR-CONTENT-POPUPS` · `SCR-CONTENT-POPUPS-FORM` |
| 메뉴 경로 | 콘텐츠 관리 > 팝업 관리 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |
| 관련 기능 명세서 | [목록](../../FSD/content/popups/index.md) · [등록·수정](../../FSD/content/popups/form.md) |

**이 자원의 성격** — [공지사항](notices.md)과 **같은 골격·같은 한계**를 갖는다. 아래 각 절은 그 문서 대비 **다른 것만** 적는다. 다른 것은 셋이다: **이미지를 다룬다**(업로드 이음매가 없다) · **목록에서 ON/OFF 를 켜고 끈다** · **상세 화면이 없다**. [배너 관리](banners.md)는 이 자원과 다시 한 번 같은 형태다.

## 1. 성능

| 항목 | 요구 | 이 자원의 값 | 측정 방법 |
|---|---|---|---|
| 응답 시간 | 공통 준수 | 측정하지 않음 — 백엔드가 없다 | 백엔드 연동 후 재작성 |
| 조회 성능 | 공통 준수 | 목록 1건 · 폼 화면 2건(다음 우선순위 + 수정이면 단건) | 코드 확인 |
| 대용량 데이터 처리 | 공통 준수 | 서버 페이지네이션 · 한 페이지 10행 — `apps/admin/src/pages/content/popups/types.ts:54` | 코드 상수 확인 |
| 목록 재조회 중 표시 | 공통 준수 | 스켈레톤 조건이 '데이터가 아직 없을 때' 하나다 — 삭제와 토글이 곧 무효화라 그렇지 않으면 만지던 행이 사라진다 — `apps/admin/src/pages/content/popups/PopupsPage.tsx:120-126` | 코드 확인 |
| 이미지 비용 | 목록이 이미지 때문에 무거워지지 않는다 | **목록에 이미지 열이 없다.** 이미지는 폼의 미리보기에서만 그려진다 | 코드 확인 |
| ⚠ 미리보기 비용 | — | 폼의 오른쪽 미리보기는 **입력이 바뀔 때마다 다시 그려진다**. 이미지가 브라우저 안 참조라 네트워크 왕복은 없다 | 코드 확인 |

## 2. 사용성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| UI 일관성 | 공통 준수 | 공지사항과 같다 — 표·툴바·폼 골격을 화면이 직접 조립한다 |
| 조회 상태 보존 | 공통 준수 | ON/OFF 필터·검색어·페이지를 주소가 소유한다 — `apps/admin/src/pages/content/popups/PopupsPage.tsx:85-97` |
| 필터의 자리 | — | 왼쪽 패널이 아니라 **툴바 안의 세그먼트 컨트롤**이다(축이 하나뿐이다) — `apps/admin/src/pages/content/popups/PopupsPage.tsx:272-277` |
| 사고를 즉시 되돌린다 | 잘못 나간 노출을 빨리 내릴 수 있어야 한다 | 목록에서 **행 토글 한 번**으로 끈다. 여러 건은 선택 후 `일괄 OFF` — 둘 다 확인 다이얼로그를 거치지 않는다(되돌릴 수 있는 조작이다) |
| 저장 전에 결과를 본다 | — | 폼 오른쪽에 **실시간 미리보기**가 있다. 넓으면 2단, 좁으면 세로로 쌓인다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:57-63` |
| 기간 오류를 한 자리에 모은다 | — | 시작일·종료일 오류가 기간 필드 한 자리에 모인다(시작일 오류가 있으면 그것을 먼저 보인다) — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:211` |
| 순서를 매번 계산하게 하지 않는다 | — | 등록 진입에서 **현재 최대 + 1** 을 우선순위 칸에 한 번만 채운다. 사용자가 고친 값은 덮지 않는다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:146-152` |
| ⚠ 자동 채움 실패를 알리지 않는다 | — | 다음 우선순위 조회가 실패하면 칸이 빈 채로 남고 아무 안내도 없다 |
| ⚠ 빈 상태의 사유 | 검색·필터·진짜 비어 있음을 구분한다 | **구분하지 않는다** — 0행이면 언제나 `등록된 팝업이 없어요.` 다 — `apps/admin/src/pages/content/popups/components/PopupsTable.tsx:120` |
| 사용자 피드백 | 공통 준수 | 토스트 6건(성공 4 · 실패 2). 실패 둘에는 '다시 시도'가 붙는다 |

## 3. 보안

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 권한 | 리소스 키 | 잎 `page:/content/popups` |
| ⚠ 권한 게이팅 | 공통 준수 | **없다** — 공지사항과 같다. 등록·연필·토글·삭제가 권한과 무관하게 동작한다 |
| 플랜(엔타이틀먼트) | 공통 준수 | 모듈 `cms.pages` — `apps/admin/src/shared/entitlements/module-resources.ts:68` |
| 개인정보 마스킹 | — | **해당 없음** — 제목·이미지·링크·위치·기간·ON/OFF·우선순위뿐이다 |
| 입력값 검증 | 화면 검증과 서버 검증을 구분한다 | 화면 검증만 있다 — `apps/admin/src/pages/content/popups/validation.ts`. 링크는 `http(s)://` 로 시작해야 하고, 기간은 실재하는 날짜여야 하며 종료일이 시작일보다 빠를 수 없다 |
| ⚠ 이미지 형식을 강제하지 않는다 | — | **의도적으로 느슨하다.** 업로드 이음매가 없어 값이 브라우저 안 참조뿐이라, 형식을 요구하면 저장 자체가 불가능해진다 — `apps/admin/src/shared/crud/validation.ts:39-63` |
| 링크의 프로토콜 | — | `http` 도 허용한다 — `apps/admin/src/pages/content/popups/validation.ts:11-13`. 채용 공고의 지원 링크가 `https` 만 받는 것과 다르다(그쪽은 개인정보를 입력하는 화면이기 때문이다) |
| 중복 제출 · 멱등키 | — | **없다** — 공지사항과 같은 이유 |

## 4. 안정성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| ⚠ 쓰기가 부분적으로만 반영된다 | — | **등록·수정·삭제는 픽스처를 바꾸지 않는다**(`apps/admin/src/pages/content/popups/data-source.ts:142-164`). **ON/OFF 변경만 실제로 바꾼다**(같은 파일 `:117-126`) |
| ⚠ 이미지가 서버로 가지 않는다 | — | 이미지 입력은 브라우저 안 미리보기 참조만 만든다. **폼을 떠나면 그 참조가 죽어 목록·홈페이지에서 깨진다.** 검증을 조여도 해결되지 않으며 고칠 곳은 업로드 이음매다 — `apps/admin/src/shared/crud/validation.ts:41-62` |
| 동시 조작 방지 | — | 행별 토글은 그 행만 잠근다 — `apps/admin/src/pages/content/popups/PopupsPage.tsx:177-204` |
| 부분 실패 | 일괄 처리의 실패를 건수로 알린다 | 일괄 삭제는 전부 성공했을 때만 닫히고, 일괄 ON/OFF 는 실패해도 선택을 유지한다 — `apps/admin/src/pages/content/popups/PopupsPage.tsx:212-225` |
| ⚠ 덮어쓰기 방지 | — | **충돌 처리가 없다** — 공지사항과 같다 |
| 취소는 실패가 아니다 | 공통 준수 | 중단된 요청은 아무 표시도 만들지 않는다 — `apps/admin/src/pages/content/popups/PopupsPage.tsx:167,195` |
| 로그 기록 | — | **확인하지 못했다** |

## 5. 호환성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 지원 브라우저 | 공통 준수 | 리포에 정의되어 있지 않다 |
| 모바일 지원 | 공통 준수 | 측정하지 않음 |
| ⚠ 해상도(목록) | 넓은 표는 가로 스크롤 방식을 갖는다 | **가로 스크롤 감싸개가 없다** — 공지사항과 같은 한계 |
| 해상도(폼) | — | **폼은 반응형이다** — 카드 최소 폭을 기준으로 2단과 세로 스택이 자동으로 갈린다 — `apps/admin/src/pages/content/popups/PopupFormPage.tsx:58-63` |
| 파일 선택 | — | 드래그앤드롭과 파일 선택 둘 다 받는다 — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:128` |

## 6. 운영성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 로그 관리 | 공통 준수 | 확인하지 못했다 |
| 모니터링 | 공통 준수 | 없다 |
| 배포 영향 | — | 이 자원과 [배너 관리](banners.md)는 **닮은 쌍이지만 서로를 참조하지 않는다** — 공유는 도메인을 모르는 공통 부품(이미지 입력·기간 입력·배지·행 액션)으로만 한다 — `apps/admin/src/pages/content/popups/types.ts:3-4`. 그래서 한쪽을 고쳐도 다른 쪽이 따라 바뀌지 않는다(같은 결함이 두 벌 남을 수 있다) |
| 설정 관리 | — | 노출 위치 세 종(메인 홈·이벤트 페이지·전체 페이지)은 **코드 상수**다 — `apps/admin/src/pages/content/popups/types.ts:15-19` |
| 실패 재현 손잡이 | — | `?fail=list` · `?fail=detail` · `?fail=save` · `?fail=delete` — `apps/admin/src/pages/content/popups/data-source.ts:72,88,142,161` |

## 7. 유지보수성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 코드 확장성 | — | 공지사항과 같다 — 공용 껍데기를 쓰지 않는다 |
| 화면 확장성 | — | 노출 위치·필터가 늘면 라벨 지도에 타입 오류로 먼저 걸린다 — `apps/admin/src/pages/content/popups/types.ts:9-13` |
| 공통 컴포넌트 사용 여부 | 페이지가 UI 를 손수 조립하지 않는다 | 손수 조립한 것은 표·폼 골격·미리보기 셋이다. 이미지 입력·기간 입력·토글·확인 다이얼로그는 공통이다 |
| 죽은 코드를 남기지 않는다 | — | ON/OFF 를 배지에서 토글로 옮기면서 **배지용 헬퍼를 삭제했다** — 소비자가 사라진 export 를 남기지 않는다 — `apps/admin/src/pages/content/popups/types.ts:36-37` |

## 8. 제약사항

| 항목 | 내용 |
|---|---|
| 외부 시스템 연계 | 홈페이지는 이 리포 밖이다. **ON/OFF 를 끄면 기간 안이라도 노출되지 않는다**는 것이 이 자원의 계약이다 — `apps/admin/src/pages/content/popups/types.ts:30` |
| API 제약 | **백엔드가 없다** — `apps/admin/src/pages/content/popups/data-source.ts:72`(목록) · `:88`(단건) · `:117`(ON/OFF) · `:135`(다음 우선순위) · `:142`·`:149`·`:161`(CRUD) |
| 파일 업로드 | **업로드 엔드포인트가 없다** — `apps/admin/src/pages/content/popups/data-source.ts:5` |
| 파일 용량 제한 | 이미지 최대 5MB — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:136` |
| 업로드 가능 확장자 | 화면 안내 표기는 `PNG · JPG · GIF · 최대 5MB` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:271`. 실제 판정은 확장자 목록이 아니라 **파일 종류가 이미지인지**로 한다 — 같은 파일 `:38` |
| 페이지 크기 상한 | 한 페이지 10행 고정 — `apps/admin/src/pages/content/popups/types.ts:54` |
| 입력 길이 제한 | 제목 100자 — `apps/admin/src/pages/content/popups/types.ts:55` |
| 우선순위의 중복 | **막지 않는다** — 같은 우선순위를 여러 팝업이 가질 수 있다 |
