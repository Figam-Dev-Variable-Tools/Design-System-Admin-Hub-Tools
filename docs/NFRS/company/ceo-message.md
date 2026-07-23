# CEO 인사말 — 비기능 명세서

| 항목 | 내용 |
|---|---|
| 자원명 | CEO 인사말 |
| 화면 ID | `SCR-COMPANY-CEO-MESSAGE` |
| 메뉴 경로 | 기업 관리 > CEO 인사말 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |
| 관련 기능 명세서 | [CEO 인사말](../../FSD/company/ceo-message/index.md) |

**이 자원의 성격** — [회사 정보](profile.md)와 **같은 껍데기**를 쓰는 단일 문서형 자원이다. 세 결정(수정 권한이 없으면 화면이 열리지 않음 · 바뀐 것이 있을 때만 저장 가능 · 충돌 처리 없음)이 모두 같다. 아래 각 절은 그 문서 대비 **다른 것만** 적는다. 다른 것은 둘이다: **주소 축이 없다** · **입력이 세 칸(제목·본문·사진)뿐이다**.

## 1. 성능

| 항목 | 요구 | 이 자원의 값 | 측정 방법 |
|---|---|---|---|
| 응답 시간 | 공통 준수 | 측정하지 않음 — 백엔드가 없다 | 백엔드 연동 후 재작성 |
| 조회 성능 | 공통 준수 | **문서 1건이 전부다** | 코드 확인 |
| 동시 사용자 | 공통 준수 | 측정하지 않음 | — |
| 대용량 데이터 처리 | 공통 준수 | 해당 없음 — 목록도 표도 없다 | — |
| 외부 스크립트 | — | **없다** — 이 화면은 주소 검색을 쓰지 않는다(회사 정보·오시는 길과 다른 점) | 코드 확인 |
| 본문 크기 | — | 본문 최대 길이가 상수로 고정돼 있고 카운터가 그것을 읽는다 — `apps/admin/src/pages/company/ceo-message/types.ts` 의 `BODY_MAX_LENGTH` | 코드 상수 확인 |

## 2. 사용성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| UI 일관성 | 공통 준수 | 단일 문서형 공용 껍데기를 쓴다 — 회사 정보와 같다 |
| 저장 버튼이 왜 잠겼는지 말한다 | 공통 준수 | 회사 정보와 같은 세 갈래 문구 — `apps/admin/src/shared/crud/DocumentFormShell.tsx:153-157` |
| 저장 뒤 기준선을 갱신한다 | 공통 준수 | 저장된 값을 새 기준선으로 삼는다 — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:73-74` |
| 입력 편의성 | 공통 준수 | 본문은 **타이핑 중 재검증하지 않는다** — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:117`. 리치 텍스트를 도입하지 않고 글자 수 카운터가 붙은 열 줄짜리 입력을 쓴다 |
| 사진의 폭을 제한한다 | 큰 이미지가 폼을 밀지 않는다 | 사진 입력을 감싼 자리에 최대 폭이 걸려 있다 — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:27-29` |
| 저장의 효과를 미리 말한다 | — | 안내문이 `저장하면 사용자 화면의 인사말 페이지에 반영돼요.` 라고 알린다 — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:88` |
| 사용자 피드백 | 공통 준수 | 성공 토스트 1건뿐이다 |
| 미저장 보호 | 공통 준수 | 문구는 이 자원의 것이다 — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:24-25` |

## 3. 보안

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 권한 | 리소스 키 | 잎 `page:/company/ceo-message`. 언제나 `update` 를 요구한다 |
| ⚠ 조회 전용 상태가 없다 | 읽기만 되는 사람도 볼 수 있어야 한다 | **수정 권한이 없으면 화면 전체가 `접근 권한이 없어요` 다** — 회사 정보와 같은 결정 — `apps/admin/src/shared/crud/DocumentFormShell.tsx:112-114` |
| 플랜(엔타이틀먼트) | 공통 준수 | **걸리지 않는다** — 모듈 대응표에 없다 |
| 개인정보 마스킹 | 어떤 필드를 어떤 규칙으로 가리는가 | **가리는 필드가 없다.** 이 자원이 담는 것은 제목·본문·사진이며 **사진은 대표(CEO)의 얼굴 사진**이지만 홈페이지에 공개되는 값이다 — 가리면 기능이 성립하지 않는다 |
| 입력값 검증 | 화면 검증과 서버 검증을 구분한다 | 화면 검증만 있다 — `apps/admin/src/pages/company/ceo-message/validation.ts`. **사진은 선택이고 형식을 강제하지 않는다** — 업로드 결과 값이라 조이면 저장 자체가 불가능해진다 — 같은 파일 `:15-16` |
| ⚠ 중복 제출 | — | **버튼 비활성만으로 막는다** — 회사 정보와 같다 |

## 4. 안정성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 장애 대응 | 조회 실패 시 무엇을 남기는가 | 폼이 사라지고 공통 문장이 뜬다 — `apps/admin/src/shared/crud/DocumentFormShell.tsx:121` |
| 재시도 | — | 조회 실패 배너의 '다시 시도'와 저장 재클릭이 전부다 |
| ⚠ 덮어쓰기 방지 | — | **충돌 처리가 없다** — 마지막에 저장한 쪽이 이긴다 |
| ⚠ 이미지가 서버로 가지 않는다 | — | 사진 입력은 브라우저 안 참조만 만든다. 화면을 떠나면 죽는다 — `apps/admin/src/shared/crud/validation.ts:41-62` |
| 취소는 실패가 아니다 | 공통 준수 | 중단된 저장 요청은 아무 표시도 만들지 않는다 — `apps/admin/src/pages/company/ceo-message/CeoMessagePage.tsx:78` |
| 로그 기록 | — | **확인하지 못했다** |

## 5. 호환성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 지원 브라우저 | 공통 준수 | 리포에 정의되어 있지 않다 |
| 모바일 지원 | 공통 준수 | 측정하지 않음 |
| 해상도 | — | 표가 없다. 세 칸이 세로로 쌓이는 단순한 배치다 |
| 파일 선택 | — | 드래그앤드롭과 파일 선택 둘 다 받는다 — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:128` |

## 6. 운영성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 로그 관리 | 공통 준수 | 확인하지 못했다 |
| 모니터링 | 공통 준수 | 없다 |
| 배포 영향 | — | **다른 화면이 이 문서를 읽는 배선을 코드에서 확인하지 못했다.** 단일 문서형 껍데기를 고치면 회사 정보·오시는 길과 함께 바뀐다 |
| 설정 관리 | — | 이 자원의 동작을 바꾸는 설정값이 없다 |
| 실패 재현 손잡이 | — | `?fail=list` · `?fail=save` — `apps/admin/src/pages/company/ceo-message/data-source.ts:19` 이 그 스위치를 지난다 |
| 버전을 쌓지 않는다 | — | 인사말은 **한 건을 고쳐 쓴다.** 대표가 바뀌면 통째로 갈아 쓰는 문서라 버전 이력이 필요 없다는 판단이며, 약관·처리방침과 다른 결정이다 |

## 7. 유지보수성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 코드 확장성 | — | 단일 문서형 껍데기의 규칙을 그대로 받는다. 공용 폼 컨트롤러의 이득(충돌·422·멱등키)은 받지 못한다 |
| 화면 확장성 | — | 값이 늘면 스키마와 폼에 한 줄씩 더하면 된다 |
| 공통 컴포넌트 사용 여부 | — | **손수 조립한 UI 가 없다** |
| 규칙의 정본 하나 | — | 검증은 스키마 하나. 필수 텍스트 규칙과 문구는 공통 조각이 갖는다 — `apps/admin/src/shared/crud/validation.ts:19-28` |

## 8. 제약사항

| 항목 | 내용 |
|---|---|
| 외부 시스템 연계 | 홈페이지는 이 리포 밖이다. 이 자원의 값이 그 화면에서 무엇이 되는지는 코드에서 확인하지 못했다 |
| API 제약 | **백엔드가 없다** — `apps/admin/src/pages/company/ceo-message/data-source.ts:19`(조회·저장) |
| 파일 업로드 | **업로드 엔드포인트가 없다** — `apps/admin/src/shared/crud/validation.ts:56-58` |
| 파일 용량 제한 | 이미지 최대 5MB — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:136` |
| 업로드 가능 확장자 | 안내 표기는 `PNG · JPG · GIF · 최대 5MB` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:271`. 판정은 파일 종류가 이미지인지로 한다 |
| 입력 길이 제한 | 제목·본문의 상한이 상수로 고정돼 있다 — `apps/admin/src/pages/company/ceo-message/types.ts` 의 `TITLE_MAX_LENGTH`·`BODY_MAX_LENGTH` |
| 버전 이력 | **없다** — 고쳐 쓰는 문서다(§6) |
