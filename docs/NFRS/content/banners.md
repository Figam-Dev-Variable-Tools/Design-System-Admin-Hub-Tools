# 배너 관리 — 비기능 명세서

| 항목 | 내용 |
|---|---|
| 자원명 | 배너 관리 |
| 화면 ID | `SCR-CONTENT-BANNERS` · `SCR-CONTENT-BANNERS-FORM` |
| 메뉴 경로 | 콘텐츠 관리 > 배너 관리 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |
| 관련 기능 명세서 | [목록](../../FSD/content/banners/index.md) · [등록·수정](../../FSD/content/banners/form.md) |

**이 자원의 성격** — [팝업 관리](popups.md)와 **글자 수준까지 같은 형태**다(이미지 · ON/OFF 토글 · 실시간 미리보기 · 상세 없음 · 같은 한계 셋). 아래 각 절은 그 문서 대비 **다른 것만** 적는다. 다른 것은 둘이다: **위치 축이 메인/서브** · **목록에서 드래그로 순서를 바꾼다**.

## 1. 성능

| 항목 | 요구 | 이 자원의 값 | 측정 방법 |
|---|---|---|---|
| 응답 시간 | 공통 준수 | 측정하지 않음 — 백엔드가 없다 | 백엔드 연동 후 재작성 |
| 조회 성능 | 공통 준수 | 목록 1건 · 폼 화면 2건(다음 정렬 순서 + 수정이면 단건) | 코드 확인 |
| 대용량 데이터 처리 | 공통 준수 | 서버 페이지네이션 · 한 페이지 10행 — `apps/admin/src/pages/content/banners/types.ts:56` | 코드 상수 확인 |
| 재정렬의 비용 | 순서를 바꿀 때마다 표가 깜빡이지 않는다 | 토글·삭제·재정렬이 모두 목록 무효화라, 스켈레톤 조건을 '데이터가 아직 없을 때'로 좁혔다 — `apps/admin/src/pages/content/banners/BannersPage.tsx:146-153` | 코드 확인 |
| ⚠ 재정렬과 페이지네이션의 겹침 | — | 순서 저장은 **전체 순서를 1부터 다시 매기되 보이지 않는 항목의 상대 순서는 보존한다** — `apps/admin/src/pages/content/banners/data-source.ts:148-158`. 즉 한 페이지 안에서 옮긴 결과가 다른 페이지의 순서를 흔들지 않는다 | 코드 확인 |

## 2. 사용성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| UI 일관성 | 공통 준수 | 팝업 관리와 같다 |
| 조회 상태 보존 | 공통 준수 | 위치 필터·검색어·페이지를 주소가 소유한다. 그 이유가 코드에 적혀 있다 — 노출 사고가 나면 **'메인 배너 2페이지의 그 배너'를 링크로 주고받으며 확인**하기 때문이다 — `apps/admin/src/pages/content/banners/BannersPage.tsx:86-92` |
| 필터의 축 | — | 위치(전체·메인·서브)다. **ON/OFF 축이 필터에 없다** — 팝업과 반대다 |
| 순서를 손으로 바꾼다 | 드래그를 쓸 수 없는 사용자도 같은 일을 할 수 있다 | 드래그 손잡이와 행마다의 위/아래 이동 버튼을 함께 준다 — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:179-187` |
| ⚠ 재정렬이 막힌 이유를 말하지 않는다 | 왜 못 하는지 알 수 있어야 한다 | 위치 필터나 검색어가 걸리면 **손잡이와 이동 버튼이 조용히 사라진다** — `apps/admin/src/pages/content/banners/BannersPage.tsx:120` |
| 표 설명이 실제 조작을 따라간다 | — | caption 이 재정렬 가능 여부에 따라 한 문장을 더하거나 뺀다 — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:115-118` |
| 순서 칸의 이름 | 같은 뜻을 다른 이름으로 부르지 않는다 | ⚠ 이 자원은 `정렬 순서`, 팝업은 `우선순위` 로 **같은 성격의 축을 다른 이름**으로 부른다 — `apps/admin/src/pages/content/banners/BannerFormPage.tsx:303` |
| 사용자 피드백 | 공통 준수 | 토스트 8건(성공 5 · 실패 3) — 콘텐츠 관리에서 FAQ 다음으로 많다. 실패 셋에 전부 '다시 시도'가 붙는다 |
| ⚠ 빈 상태의 사유 | — | **구분하지 않는다** — 팝업과 같다 |

## 3. 보안

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 권한 | 리소스 키 | 잎 `page:/content/banners` |
| ⚠ 권한 게이팅 | 공통 준수 | **없다** — 팝업 관리와 같다 |
| 플랜(엔타이틀먼트) | 공통 준수 | 모듈 `cms.pages` — `apps/admin/src/shared/entitlements/module-resources.ts:69` |
| 개인정보 마스킹 | — | **해당 없음** — 제목·이미지·링크·위치·기간·ON/OFF·정렬 순서뿐이다 |
| 입력값 검증 | 화면 검증과 서버 검증을 구분한다 | 화면 검증만 있다 — `apps/admin/src/pages/content/banners/validation.ts`. 팝업과 규칙 형태는 닮았지만 **위치·정렬 필드가 달라 각자 스키마를 갖는다** — 같은 파일 머리말 |
| 이미지 형식을 강제하지 않는다 | — | 팝업과 같은 이유(업로드 이음매가 없다) |
| 중복 제출 · 멱등키 | — | **없다** |

## 4. 안정성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| ⚠ 쓰기가 부분적으로만 반영된다 | — | **등록·수정·삭제는 픽스처를 바꾸지 않는다**(`apps/admin/src/pages/content/banners/data-source.ts:170-193`). **ON/OFF 와 순서 저장은 실제로 바꾼다**(같은 파일 `:117`·`:160-168`) |
| ⚠ 이미지가 서버로 가지 않는다 | — | 팝업과 같다 — `apps/admin/src/shared/crud/validation.ts:41-62` |
| 낙관적 업데이트와 롤백 | 실패하면 화면을 되돌린다 | 재정렬은 낙관적으로 먼저 옮기고 실패 시 롤백한 뒤 재시도 토스트를 준다 — `apps/admin/src/pages/content/banners/BannersPage.tsx:136-140` |
| 동시 조작 방지 | — | 행별 토글은 그 행만 잠근다. 재정렬 저장 중에는 드래그·이동 버튼이 전부 잠긴다 |
| ⚠ 덮어쓰기 방지 | — | **충돌 처리가 없다** |
| 로그 기록 | — | **확인하지 못했다** |

## 5. 호환성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 지원 브라우저 | 공통 준수 | 리포에 정의되어 있지 않다 |
| 모바일 지원 | 공통 준수 | 측정하지 않음 |
| ⚠ 해상도(목록) | 넓은 표는 가로 스크롤 방식을 갖는다 | **가로 스크롤 감싸개가 없다.** 재정렬이 켜지면 손잡이 열이 하나 더 늘어 더 넓어진다 |
| 해상도(폼) | — | 팝업 폼과 같은 반응형 2단이다 |
| 드래그 입력 | 포인터가 없는 환경에서도 같은 일을 할 수 있다 | 이동 버튼이 그 대체 경로다 |

## 6. 운영성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 로그 관리 | 공통 준수 | 확인하지 못했다 |
| 모니터링 | 공통 준수 | 없다 |
| 배포 영향 | — | 팝업 관리와 **서로를 참조하지 않는다** — 공유는 도메인을 모르는 공통 부품으로만 한다 — `apps/admin/src/pages/content/banners/types.ts:3`. 한쪽을 고쳐도 다른 쪽은 따라 바뀌지 않는다 |
| 설정 관리 | — | 노출 위치 두 종(메인·서브)은 **코드 상수**다 — `apps/admin/src/pages/content/banners/types.ts:13-19` |
| 실패 재현 손잡이 | — | `?fail=list` · `?fail=detail` · `?fail=save` · `?fail=delete` · **`?fail=reorder`** — `apps/admin/src/pages/content/banners/data-source.ts:72,88,160,170,189` |

## 7. 유지보수성

| 항목 | 요구 | 이 자원의 값 |
|---|---|---|
| 코드 확장성 | — | 공용 껍데기를 쓰지 않는다 |
| 화면 확장성 | — | 위치 축이 늘면 라벨 지도에 타입 오류로 먼저 걸린다 — `apps/admin/src/pages/content/banners/types.ts:8-11` |
| 공통 컴포넌트 사용 여부 | — | 재정렬 UI 는 새로 만들지 않고 디자인 시스템 것을 쓴다 — `apps/admin/src/pages/content/banners/components/BannersTable.tsx:5` |
| 규칙의 정본 하나 | — | 순서 재배치 계산은 순수 함수 하나가 갖는다 — `apps/admin/src/pages/content/banners/data-source.ts:148-158` |
| 죽은 코드를 남기지 않는다 | — | ON/OFF 배지용 헬퍼는 소비자가 사라져 삭제됐다 — `apps/admin/src/pages/content/banners/types.ts:35-36` |

## 8. 제약사항

| 항목 | 내용 |
|---|---|
| 외부 시스템 연계 | 홈페이지는 이 리포 밖이다 |
| API 제약 | **백엔드가 없다** — `apps/admin/src/pages/content/banners/data-source.ts:72`(목록) · `:88`(단건) · `:117`(ON/OFF) · `:135`(다음 순서) · `:160`(순서 저장) · `:170`·`:177`·`:189`(CRUD) |
| 파일 업로드 | **업로드 엔드포인트가 없다** — `apps/admin/src/pages/content/banners/data-source.ts:4` |
| 파일 용량 제한 | 이미지 최대 5MB — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:136` |
| 업로드 가능 확장자 | 안내 표기는 `PNG · JPG · GIF · 최대 5MB` — `packages/ui/src/molecules/ImageUploadField/ImageUploadField.tsx:271`. 실제 판정은 파일 종류가 이미지인지로 한다 |
| 페이지 크기 상한 | 한 페이지 10행 고정 — `apps/admin/src/pages/content/banners/types.ts:56` |
| 입력 길이 제한 | 제목 100자 — `apps/admin/src/pages/content/banners/types.ts:57` |
| 정렬 순서의 중복 | **막지 않는다** — 폼에서 같은 숫자를 여러 배너에 줄 수 있고, 그때의 표시 순서는 저장소 정렬에 맡겨진다 |
