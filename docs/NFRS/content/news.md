# 뉴스·보도자료 — 비기능 명세서

| 항목 | 내용 |
|---|---|
| 자원명 | 뉴스·보도자료 |
| 화면 ID | `SCR-CONTENT-NEWS` · `SCR-CONTENT-NEWS-FORM` |
| 메뉴 경로 | 콘텐츠 관리 > 뉴스·보도자료 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |
| 관련 기능 명세서 | [목록](../../FSD/content/news/index.md) · [등록·수정](../../FSD/content/news/form.md) |

**이 자원의 성격** — 콘텐츠 관리에서 **유일하게 공용 목록·폼 껍데기를 쓰는 자원**이다. 그래서 [공지사항](notices.md)이 이 묶음의 결함으로 적은 셋이 여기에는 **없다** — 쓰기가 실제로 반영되고, 권한 게이팅이 있으며, 충돌·422·중복 제출 방어가 있다. 아래 각 절은 [공지사항](notices.md) 대비 **다른 것만** 적는다.

## 1. 성능

| 항목 | 요구 | 이 자원의 값 | 측정 방법 |
|---|---|---|---|
| 응답 시간 | 공통 준수 | **측정하지 않음** — 백엔드가 없다 | 백엔드 연동 후 재작성 |
| 조회 성능 | 공통 준수 | 목록 1건 · 폼(수정) 1건. **좁히기를 서버가 하지 않는다** — 전체를 한 번 받아 화면에서 분류·상태·검색어를 건다 — `apps/admin/src/pages/content/news/NewsPage.tsx:114-118` |
| 동시 사용자 | 공통 준수 | **측정하지 않음** | — |
| 대용량 데이터 처리 | 가상화 없이 대량 행을 그리지 않는다 | ⚠ **페이지네이션도 가상화도 없다** — 받은 전량을 그린다. 공지사항(10행 페이지)과 다른 결정이며, 뉴스가 더 느리게 쌓인다는 전제가 코드에 명시돼 있지는 않다 | 코드 확인 |
| 목록 재조회 중 표시 | 공통 준수 | 껍데기가 표를 비우지 않고 요약에 ` · 새로고침 중…` 만 덧붙인다 — `apps/admin/src/shared/crud/CrudListShell.tsx:167-173` | 코드 확인 |
| 상태 계산 비용 | — | 상태는 **행마다 지금 시각과 비교해** 만든다 — `apps/admin/src/shared/domain/publish-schedule.ts:97-105`. 행 수만큼의 비교이며 서버 왕복이 없다 | 코드 확인 |

## 2. 사용성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| UI 일관성 | 공통 준수 | 목록은 공용 목록 껍데기, 폼은 공용 폼 껍데기. **손수 조립한 UI 가 없다** |
| 접근성 — 라이브 영역 | 0행 전환을 소리로 전한다 | **있다.** 항상 마운트된 라이브 영역이 목록 상태를 읽는다 — `apps/admin/src/shared/crud/CrudListShell.tsx:150-160` |
| 빈 상태의 사유 | 검색·필터·진짜 비어 있음을 구분한다 | **구분한다.** 사유마다 문장과 복구 수단이 다르다(`검색 지우기` · `필터 초기화` · 등록 CTA) — `packages/ui/src/molecules/Empty/Empty.tsx:78-93` · `apps/admin/src/pages/content/news/NewsPage.tsx:226-232` |
| 조회 상태 보존 | 공통 준수 | 분류·상태·검색어를 주소가 소유한다. **페이지 파라미터가 없다**(페이지네이션이 없다) |
| 정렬 규칙을 미리 말한다 | — | 필터 레일 위에 `목록은 고정 글이 먼저, 그 다음 발행일 순이에요.` 가 상시 표시된다 — `apps/admin/src/pages/content/news/NewsPage.tsx:204` |
| `null` 과 0 을 섞지 않는다 | 모르는 값을 0으로 그리지 않는다 | **조회에 실패하면 좌측 분류 배지를 그리지 않는다** — 0건으로 그리지 않는다 — `apps/admin/src/pages/content/news/NewsPage.tsx:109-112` |
| 사용자 피드백 | 공통 준수 | **이 자원 고유의 토스트가 0건이다** — 삭제·저장 통지는 전부 공통 층의 문구다 |
| 입력 편의성 | 공통 준수 | 본문은 타이핑 중 재검증하지 않는다. 공개 일시 힌트가 규칙을 미리 말한다 — `apps/admin/src/pages/content/news/NewsFormPage.tsx:172` |

## 3. 보안

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 권한 | 이 자원의 리소스 키와 동작별 요구 | 리소스 키는 잎 `page:/content/news` |
| 권한 게이팅 | 누를 수 없는 것을 보여 주지 않는다 | **있다.** 등록 버튼은 화면이 직접 가리고(`apps/admin/src/pages/content/news/NewsPage.tsx:120`), 연필·휴지통·선택 체크박스·선택 바는 껍데기가 가린다(`apps/admin/src/shared/crud/CrudListShell.tsx:146,178,216-217`). 폼은 권한이 없으면 **열리지 않는다** — `apps/admin/src/shared/crud/FormPageShell.tsx:132` |
| 저장 경로의 마지막 문 | 껍데기를 지나쳐도 막힌다 | 컨트롤러가 저장 직전에 한 번 더 판정한다 — `apps/admin/src/shared/crud/useCrudForm.ts:290-298` |
| 플랜(엔타이틀먼트) | 공통 준수 | 모듈 `cms.pages` — `apps/admin/src/shared/entitlements/module-resources.ts:74` |
| 개인정보 마스킹 | — | **해당 없음** — 제목·분류·상태·공개 일시·본문·수정 시각뿐이다 |
| 입력값 검증 | 화면 검증과 서버 검증을 구분한다 | 화면 검증(스키마)과 **저장소 검증이 같은 함수를 읽는다** — 화면이 통과시킨 것을 저장소가 거절하거나 그 반대가 생기지 않게 한다 — `apps/admin/src/pages/content/news/validation.ts:3-4` · `apps/admin/src/pages/content/news/data-source.ts:99-106` |
| 중복 제출 | 두 번째 요청을 만들지 않는다 | **있다** — 렌더를 기다리지 않는 동기 잠금 + 제출 시도 단위 멱등키. 재시도는 같은 키를 재사용한다 — `apps/admin/src/shared/crud/useCrudForm.ts:122-150` |
| 오류 노출 | 공통 준수 | 서버 원문을 노출하지 않고 **짧은 참조 코드**만 보인다 — `apps/admin/src/shared/crud/FormFeedback.tsx:34-45` |

## 4. 안정성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 쓰기가 반영된다 | — | **반영된다.** 데이터 소스가 배열을 실제로 갱신한다 — `apps/admin/src/pages/content/news/data-source.ts:108-121`. 콘텐츠 관리의 나머지 여섯과 다른 점이다 |
| 없는 대상에 대한 쓰기 | 조용히 통과시키지 않는다 | 없는 id 의 수정·삭제는 409, 상세 조회는 404 로 갈린다 — `apps/admin/src/shared/crud/crud.ts:217-219,256-258,275-277` |
| 덮어쓰기 방지 | 충돌로 거절된 저장에 성공을 띄우지 않는다 | `DLG-COMMON-FORM-CONFLICT` 가 뜬다. 성공 토스트도 목록 이동도 없고 입력이 살아 있다 — `apps/admin/src/shared/crud/useCrudForm.ts:191-206` |
| 필드 거절(422) | 폼 배너가 아니라 그 칸에 꽂는다 | 저장소가 사유를 `publishAt` 이라는 필드 이름과 함께 돌려주고, 컨트롤러가 그 칸에 인라인 오류를 꽂고 포커스를 옮긴다 — `apps/admin/src/pages/content/news/data-source.ts:103-105` · `apps/admin/src/shared/crud/useCrudForm.ts:208-219` |
| 조회 실패의 갈래 | 없는 것과 고장난 것을 같은 문구로 말하지 않는다 | 폼이 404 와 오류를 가르고, 404 에는 '다시 시도'를 주지 않는다 — `apps/admin/src/shared/crud/FormPageShell.tsx:136-149` |
| 시간이 만드는 상태 | 배치 없이도 답이 맞는다 | **'예약'을 저장하지 않는다.** 저장하면 예약 시각이 지난 뒤에도 레코드가 계속 '예약'이라 말하고 그것을 바꿔 줄 배치가 없다 — `apps/admin/src/shared/domain/publish-schedule.ts:10-15`. 초안·보관은 시각과 무관해 되살아나지 않는다 — 같은 파일 `:94-95` |
| 날짜의 조용한 굴림을 막는다 | — | `2026-02-31` 같은 값을 되읽어 같은 값인지 확인해 거절한다 — `apps/admin/src/shared/domain/publish-schedule.ts:64-89` |
| 로그 기록 | — | **확인하지 못했다** |

## 5. 호환성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 지원 브라우저 | 공통 준수 | 리포에 정의되어 있지 않다 |
| 모바일 지원 | 공통 준수 | 측정하지 않음 |
| 해상도 | 넓은 표는 가로 스크롤 방식을 갖는다 | **있다** — 공용 목록 껍데기가 표를 가로 스크롤 감싸개에 넣는다 — `apps/admin/src/shared/crud/CrudListShell.tsx:52-55`. 공지사항 목록과 다른 점이다 |
| 입력 종류 | — | 공개 일시는 브라우저의 날짜·시각 입력을 그대로 쓴다 — 표기와 달력 UI 는 브라우저가 정한다 — `apps/admin/src/pages/content/news/NewsFormPage.tsx:176` |

## 6. 운영성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 로그 관리 | 공통 준수 | 확인하지 못했다 |
| 모니터링 | 공통 준수 | 없다 |
| 배포 영향 | — | **공용 발행 판정을 고치면 이 자원이 함께 바뀐다** — 지금 그 규칙을 쓰는 화면은 뉴스 하나다 — `apps/admin/src/shared/domain/publish-schedule.ts:4-8` |
| 설정 관리 | — | 플랜과 역할 권한뿐이다. **분류 세 종은 코드 상수**이며 늘리는 화면이 없다 — 그 자리에 `TODO(backend)` 가 표시돼 있다 — `apps/admin/src/pages/content/news/data-source.ts:16-18` |
| 실패 재현 손잡이 | — | 공통 스위치를 쓴다: `?fail=list` · `?fail=save` · `?fail=delete` · `?status=save:409` 처럼 상태 코드까지 지정할 수 있다 — `apps/admin/src/shared/crud/dev.ts:92-97` |

## 7. 유지보수성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 코드 확장성 | 새 화면이 공통 규칙을 자동으로 물려받는다 | 껍데기를 쓰므로 껍데기에 더해지는 규칙을 그대로 받는다 |
| 화면 확장성 | 열·필터·상태값이 늘 때 견디는가 | 상태 축이 늘면 라벨·색 지도에 타입 오류로 먼저 걸린다 — `apps/admin/src/shared/domain/publish-schedule.ts:34-47` |
| 공통 컴포넌트 사용 여부 | 페이지가 UI 를 손수 조립하지 않는다 | **손수 조립한 UI 가 없다** |
| 규칙의 정본 하나 | 같은 판정을 두 곳에 적지 않는다 | 예약 판정은 공통 도메인 모듈 하나가 갖고 화면·스키마·저장소가 그것을 부른다 |
| 걷어낸 축을 되살리지 않는다 | — | **첨부 축이 모델째 제거됐다** — 참조가 가리킬 정본(미디어 라이브러리)이 사라졌기 때문이며, 해석되지 않는 id 목록은 데이터가 아니라 잔해라고 코드가 적어 두었다 — `apps/admin/src/pages/content/news/types.ts:12-14` |

## 8. 제약사항

| 항목 | 내용 |
|---|---|
| 외부 시스템 연계 | 홈페이지는 이 리포 밖이다. 공개 여부 판정은 어드민과 같은 함수를 써야 어긋나지 않는다 — `apps/admin/src/shared/domain/publish-schedule.ts:107-110` |
| API 제약 | **백엔드가 없다** — `apps/admin/src/pages/content/news/data-source.ts:130`. 분류 조회·등록도 아직 없다 — 같은 파일 `:16-18` |
| 페이지 크기 상한 | **없다** — 페이지네이션 자체가 없다 |
| 입력 길이 제한 | 제목 100자 · 본문 10,000자 — `apps/admin/src/pages/content/news/types.ts:53-54` |
| 공개 일시 형식 | `YYYY-MM-DDTHH:mm` 이며 **발행 상태에서만** 지정할 수 있다 — `apps/admin/src/shared/domain/publish-schedule.ts:114-116` |
| 파일 용량 제한 | 해당 없음 — **이 자원에 파일 입력이 없다**(첨부 축이 제거됐다) |
| 업로드 가능 확장자 | 해당 없음 — 같은 이유 |
