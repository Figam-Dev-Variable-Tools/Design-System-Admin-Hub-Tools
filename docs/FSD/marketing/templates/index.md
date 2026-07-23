# 발송 템플릿 관리

> **템플릿 4종(이메일 · 문자 · 알림톡 · 브랜드 메시지)이 한 모델을 공유한다.**
> 이름 · 발행 상태 · 발신 프로필 · 이력은 넷이 같고, **본문(`content`)만 종류마다 통째로 다르다**
> — `apps/admin/src/pages/marketing/message-templates/types.ts:564-569`.
> **그 한 모델의 전부를 이 문서와 [등록·수정](form.md) 이 갖고**, 종류별 차이는 그 두 문서 안에서
> **한 표로** 다룬다. 종류마다 문서를 복제하지 않는다.

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 발송 템플릿 관리 |
| 화면 ID | `SCR-MARKETING-TEMPLATES` |
| 메뉴 경로 | 비즈니스 > 마케팅 관리 > 발송 템플릿 관리 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 이메일·문자·알림톡·브랜드 메시지 템플릿을 한 목록에서 보고, 종류·상태·발신 프로필·최종 수정을 확인하며 만들거나 지운다.

**업무 배경** — 발송 화면(SMS·이메일·뉴스레터)이 본문을 채울 때 고르는 것이 이 템플릿이다. 템플릿 메뉴가 둘이면 어느 쪽에 만들어야 하는지를 매번 고민하게 되므로 **이 화면 하나가 그 자리를 통째로 갖는다** — `apps/admin/src/pages/marketing/message-templates/data-source.ts:20-23`.

**화면 설명** — 툴바(검색 · 종류 필터 · 상태 필터 · `새 템플릿`) 아래 표가 있고, 열은 템플릿명 · 종류 · 상태 · 발신 프로필 · 최종 수정이다. **행을 누르면 수정이 아니라 상세로 간다.**

**주요 사용자** — 최상위 관리자 · 마케팅 담당 운영자.

**사용 시나리오**

1. 종류 필터를 `카카오 알림톡` 으로 좁혀 심사 중인 템플릿을 찾는다.
2. 상태 필터를 `사용중` 으로 좁혀 지금 발송에 쓰이는 것만 본다.
3. 행을 눌러 상세로 가서 사용 여부를 켜고 끈다.
4. `새 템플릿` 을 누르면 **종류 고르기 팝업**이 뜨고, 고르면 그 종류의 편집기로 들어간다.

**선행 조건** — 로그인. 이 화면의 읽기 권한.

**후행 처리** — 만든 템플릿이 이 목록에 반영되고, **발행되어 켜진 것만** 발송 화면의 '템플릿 불러오기' 목록에 나타난다.

**관련 화면** — [템플릿 상세](detail.md)(`SCR-MARKETING-TEMPLATES-DETAIL`) · [템플릿 등록·수정](form.md)(`SCR-MARKETING-TEMPLATES-FORM`) · 종류 고르기 팝업 [`POP-MARKETING-TEMPLATES-NEW-KIND`](pop-new-kind.md) · 이 템플릿을 쓰는 [SMS 발송](../sms/index.md) · [이메일 발송](../email/index.md) · [뉴스레터](../newsletters/index.md). 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**이 화면으로 오는 옛 경로 둘** — `/marketing/templates/alimtalk`(및 그 하위)과 `/marketing/message-templates`(및 그 하위)가 이 목록으로 되돌려진다 — [인벤토리](../../inventory.md) 의 리다이렉트 표. 알림톡만 옛 심사 모델 화면에 남아 있던 시기의 잔재이며, 지금은 이 모델이 알림톡까지 덮는다 — `apps/admin/src/pages/marketing/message-templates/data-source.ts:25-28`.

**관련 메뉴** — 사이드바 `비즈니스 > 마케팅 관리` 의 여섯 번째 항목 — `apps/admin/src/shared/layout/nav-config.ts:228`. **플랜으로 잠기지 않는다** — 마케팅 모듈 매핑에 이 경로가 없다 — `apps/admin/src/shared/entitlements/module-resources.ts:75-79`. ⚠ 그래서 **`SMS 발송` 모듈이 없는 계정도 문자·알림톡 템플릿을 만들 수 있다**(보낼 수는 없다).

**관련 기능** — 발신 프로필과 카카오 채널은 이 폴더의 저장소가 갖는다. 치환변수의 정본은 공통 층의 카탈로그다.

**관련 API** — 목적 여섯: 목록 조회 · 단건 조회 · 등록 · 수정 · 삭제 · **상태만 바꾸기**. 마지막 하나는 상세 화면이 쓰며 본문 전체를 되보내지 않는다 — `apps/admin/src/pages/marketing/message-templates/data-source.ts:39-40`. 백엔드가 없다.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md) · [품질 기준](../../../reference/quality-bar.md)

**구현 파일**

| 무엇 | 파일 |
|---|---|
| 목록 화면 | `apps/admin/src/pages/marketing/message-templates/MessageTemplateListPage.tsx` |
| 종류 고르기 팝업 | `apps/admin/src/pages/marketing/message-templates/components/NewTemplateKindDialog.tsx` |
| 도메인 모델(4종 공유) | `apps/admin/src/pages/marketing/message-templates/types.ts` |
| 카카오 두 종의 모델·규칙 | `apps/admin/src/pages/marketing/message-templates/kakao.ts` |
| 발행 상태 전이 | `apps/admin/src/pages/marketing/message-templates/status.ts` |
| 화면 문구 | `apps/admin/src/pages/marketing/message-templates/copy.ts` |
| 저장소 · 어댑터 | `apps/admin/src/pages/marketing/message-templates/store.ts` · `message-templates/data-source.ts` |

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| 검색영역(툴바 좌측) | 템플릿명·내용으로 좁힌다 | 항상 | 전체 | 불가 | 표시 |
| 필터영역(툴바 좌측) | **종류**와 **상태** 두 축 | 항상 | 전체 | 불가 | 표시 |
| 버튼영역(툴바 우측) | `새 템플릿` | `create` 권한이 있을 때만 — `apps/admin/src/pages/marketing/message-templates/MessageTemplateListPage.tsx:234` | 권한 보유자 | 불가 | 조건부 |
| 선택영역 | 선택 건수와 일괄 삭제 | 1건 이상 선택했을 때 | 삭제 권한 보유자 | 불가 | 숨김 |
| 목록영역 | 다섯 열의 표 | 조회 실패가 아닐 때 | 전체 | 불가 | 표시 |
| 오류영역 | 조회 실패 인라인 배너 | 조회 실패 시(공용 껍데기) | 전체 | 불가 | 숨김 |
| 빈 상태 | 왜 비었는지 세 갈래 | 0행일 때 | 전체 | 불가 | 숨김 |
| 종류 고르기 팝업 | 새 템플릿의 종류를 먼저 묻는다 | `새 템플릿` 을 눌렀을 때 — `MessageTemplateListPage.tsx:263` | 권한 보유자 | 불가 | 숨김 |

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 검색 입력 | SearchField | `템플릿명·내용 검색` — `apps/admin/src/pages/marketing/message-templates/MessageTemplateListPage.tsx:199` | 템플릿명 · **종류마다 다른 '내용'** · 종류 라벨을 훑는다 — `MessageTemplateListPage.tsx:113-150` | N | N | 없음 | 빈 값 | `템플릿명 · 내용 검색` — `MessageTemplateListPage.tsx:200` | — | 항상 | §4.2 |
| 2 | 종류 필터 | SelectField | 접근성 이름 `종류로 거르기` — `MessageTemplateListPage.tsx:208` | 항목 `전체 종류` — `MessageTemplateListPage.tsx:210` + 종류 4종 | N | N | 없음 | `전체 종류` | — | 목록 밖의 값은 `전체` 로 | 항상 | 종류 이름은 §4.1 표 |
| 3 | 상태 필터 | SelectField | 접근성 이름 `상태로 거르기` — `MessageTemplateListPage.tsx:222` | 항목 `전체 상태` — `MessageTemplateListPage.tsx:224` + `초안`·`사용중`·`미사용` — `apps/admin/src/pages/marketing/message-templates/types.ts:39-43` | N | N | 없음 | `전체 상태` | — | 〃 | 항상 | — |
| 4 | `새 템플릿` 버튼 | Button(primary) | `새 템플릿` — `MessageTemplateListPage.tsx:236` | **폼이 아니라 종류 고르기 팝업**을 연다 | N | N | 없음 | — | — | — | `create` 권한이 있을 때만 — `MessageTemplateListPage.tsx:234` | 가려야 하는 이유는 같다 — 팝업에서 고르면 곧바로 편집기로 들어간다 — `MessageTemplateListPage.tsx:230-233` |
| 5 | 템플릿명 열 | Table 열 | 헤더 `템플릿명` — `MessageTemplateListPage.tsx:85` | 목록에서 찾는 이름 | N | Y | — | — | — | — | 항상 | — |
| 6 | 종류 배지 | StatusBadge(neutral) | 헤더 `종류` — `MessageTemplateListPage.tsx:87`. 값 `이메일` · `문자` · `카카오 알림톡` · `브랜드 메시지 (구 친구톡)` — `apps/admin/src/pages/marketing/message-templates/types.ts:71-76` | 본문 모델을 가르는 축 | N | Y | — | — | — | — | 항상 | **종류는 저장된 본문이 갖는다** — 별도 필드가 아니다 — `message-templates/types.ts:586-589` |
| 7 | 상태 배지 | StatusBadge | 헤더 `상태` — `MessageTemplateListPage.tsx:94`. 값 `초안`(info) · `사용중`(success) · `미사용`(neutral) — `message-templates/types.ts:39-43` · 색 `apps/admin/src/pages/marketing/message-templates/status.ts:18-21` | 발행 상태 | N | Y | — | — | — | — | 항상 | **초안만 info 로 띄운다** — 기본 회색이면 `미사용` 과 같은 색이 되어 '발행 전'과 '발행됐지만 꺼짐'이 구분되지 않는다 — `message-templates/status.ts:10-17` |
| 8 | 발신 프로필 열 | Table 열 | 헤더 `발신 프로필` — `MessageTemplateListPage.tsx:101` | 누구 이름으로 나가는가 | N | Y | — | — | — | — | 항상 | 흐린 글자 |
| 9 | 최종 수정 열 | Table 열 | 헤더 `최종 수정` — `MessageTemplateListPage.tsx:105` | `{일시} · {수정자}` — `MessageTemplateListPage.tsx:107` | N | Y | — | — | — | — | 항상 | 등폭 숫자 · 줄바꿈 없음 |
| 10 | 빈 상태 | Empty | `등록된 메시지 템플릿이 없어요` / `조건에 맞는 메시지 템플릿이 없어요` / `필터에 맞는 메시지 템플릿이 없어요` — 조립은 `packages/ui/src/molecules/Empty/Empty.tsx:71-76`(엔티티 이름 `메시지 템플릿` 은 `MessageTemplateListPage.tsx:31`) | 왜 비었는지 세 갈래 | N | Y | — | — | — | — | 0행일 때 | 복구 수단 `검색 지우기` · `필터 초기화` |

**⚠ 심사 상태(알림톡)는 목록에 열이 없다** — 발행 상태와 심사 상태는 별개 축인데(§4.3) 목록은 발행 상태만 보여 준다. 반려된 알림톡을 목록에서 알아볼 수 없다.

## 4. 기능 명세

### 4.1 한 모델이 네 종류를 덮는다

| 항목 | 내용 |
|---|---|
| 기능 목적 | 종류가 늘어도 목록·검색·필터·삭제가 한 벌로 돈다 |
| 실행 조건 | 항상 |
| 사용자 동작 | 없음(구조) |
| 시스템 처리 | 템플릿 1건은 이름 · 발행 상태 · 발신 프로필 · 본문 · 이력을 갖고, **본문만 종류별 판별 유니온**이다 — `apps/admin/src/pages/marketing/message-templates/types.ts:564-585`. 종류는 본문이 들고 있어 별도 필드를 두지 않는다 — `message-templates/types.ts:586-589` |
| 데이터 처리 | 없음(읽기) |
| Validation | 종류마다 다른 규칙이 걸린다([등록·수정](form.md) §6) |
| API 호출 여부 | N |
| 성공 처리 | 목록·검색·필터·삭제가 종류와 무관하게 동작한다 |
| 실패 처리 | 실패 경로가 없다 |
| 예외 처리 | 종류가 늘면 검색 대상 판정이 **컴파일 오류로** 빠진 자리를 알려 준다 — 삼항으로 늘어놓으면 조용히 마지막 갈래로 흘러가 검색되지 않는 종류가 된다 — `MessageTemplateListPage.tsx:110-116` |
| 화면 변경 사항 | 목록영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

| 종류 | 목록 배지 이름 | 상세가 부르는 이름 | 본문 모델의 뼈대 | 심사 | 발송 시간 제한 |
|---|---|---|---|---|---|
| 이메일 | `이메일` | `이메일` | 제목 · 프리헤더 · **블록 스택** · 캔버스 스타일 — `message-templates/types.ts:546-553` | 없다 | 없다 |
| 문자 | `문자` | `문자` | 제목(LMS/MMS 전용) · 본문 · 이미지 파일명 · 발송사 · 발신번호 — `message-templates/types.ts:98-114` | 없다 | 없다 |
| 카카오 알림톡 | `카카오 알림톡` | **`알림톡`** | 채널 · 메시지 유형 × 강조 유형 · 본문 · 버튼 · 변수 예시값 · **심사 상태** — `apps/admin/src/pages/marketing/message-templates/kakao.ts:671-704` | **필수**(등록→검수중→승인/반려) | 없다 |
| 브랜드 메시지 (구 친구톡) | `브랜드 메시지 (구 친구톡)` | `브랜드 메시지 (구 친구톡)` | 채널 · 본문 유형 5종 · 본문 · 버튼 · 광고성 — `message-templates/kakao.ts:705-737` | 없다 | **08:00 ~ 20:50** — `message-templates/kakao.ts:651` |

**이름이 두 표로 갈린 이유** — 목록·칩·편집기는 다른 종류와 나란히 서므로 `카카오 알림톡` 이라 부르고, 상세는 이미 카카오 화면임이 분명해 `알림톡` 으로 짧게 부른다. **그 한 줄을 위해 표가 둘이다** — `apps/admin/src/pages/marketing/message-templates/copy.ts:145-158`.

**`brandmessage` 인데 라벨이 '구 친구톡'인 이유** — 친구톡은 2025-12-31 자로 종료됐고 그 뒤의 발송은 전부 브랜드 메시지로 대체된다. 모델 이름은 살아 있는 제품이고, 라벨만 옛 이름을 달아 둔다 — 운영자가 아직 '친구톡'으로 이 기능을 찾기 때문이다 — `message-templates/kakao.ts:1-14`.

### 4.2 검색은 종류마다 다른 자리를 훑는다

| 항목 | 내용 |
|---|---|
| 기능 목적 | 운영자가 기억하는 문구로 찾게 한다 |
| 실행 조건 | 항상 |
| 사용자 동작 | 검색어 입력 |
| 시스템 처리 | 세 건초더미를 훑는다: ① 템플릿명 ② **종류별 '내용'** ③ **종류 라벨** — `MessageTemplateListPage.tsx:129-150` |
| 데이터 처리 | 없음 — 이미 받은 목록을 거른다 |
| Validation | 없음 |
| API 호출 여부 | N |
| 성공 처리 | 표가 좁혀진다 |
| 실패 처리 | 실패 경로가 없다 |
| 예외 처리 | **종류 라벨을 건초더미에 넣는 이유** — 코드상 종류는 `brandmessage` 지만 라벨이 `브랜드 메시지 (구 친구톡)` 이라, 라벨을 훑으면 `친구톡` 으로도 걸린다. 옛 이름을 검색 코드에 직접 박지 않아, 카카오가 그 낱말을 완전히 거둘 때 **라벨 한 곳만** 지우면 된다 — `MessageTemplateListPage.tsx:140-148` |
| 화면 변경 사항 | 목록영역 |
| 후속 동작 | 선택 해제 |
| 로그 기록 여부 | N |

| 종류 | 검색이 훑는 '내용' |
|---|---|
| 문자 | 본문 |
| 이메일 | **제목**(본문 블록은 훑지 않는다) |
| 알림톡 | 강조 제목 + 본문 |
| 브랜드 메시지 | 본문 |

출처: `MessageTemplateListPage.tsx:117-128`.

### 4.3 발행 상태와 심사 상태는 별개 축이다

| 항목 | 내용 |
|---|---|
| 기능 목적 | **우리가 켜고 끄는 것**과 **카카오가 판정하는 것**을 섞지 않는다 |
| 실행 조건 | 항상 |
| 사용자 동작 | 없음(구조) |
| 시스템 처리 | 발행 상태는 `초안` → `사용중` ↔ `미사용` 셋이고 이 앱이 소유한다 — `apps/admin/src/pages/marketing/message-templates/types.ts:19-25`. 심사 상태는 알림톡 본문 안의 별도 필드이며 카카오가 판정한다 — `message-templates/types.ts:10-13` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 두 축이 독립으로 움직인다 |
| 실패 처리 | 실패 경로가 없다 |
| 예외 처리 | **`사용중`인데 `반려`도 정상 상태다** — 한 필드로 합치면 표현할 수 없다 — `message-templates/types.ts:10-13`. ⚠ **목록에는 심사 상태 열이 없어** 그 조합을 목록에서 알아볼 수 없다(상세에서만 보인다) |
| 화면 변경 사항 | 목록영역 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

**`미사용` 을 두고 삭제하지 않는 이유** — 삭제는 이력을 끊는다. 시즌이 지난 템플릿을 지우면 '이 발송이 무슨 문구였나'를 되짚을 수 없다. 끄는 것과 없애는 것은 다른 행위라 둘 다 둔다 — `message-templates/types.ts:21-22`.

### 4.4 행을 누르면 상세로 간다

| 항목 | 내용 |
|---|---|
| 기능 목적 | 가장 흔한 조작(켜고 끄기)에 가장 짧은 길을 준다 |
| 실행 조건 | 행이 있을 때 |
| 사용자 동작 | 행 클릭 |
| 시스템 처리 | 상세 경로로 이동한다 — `MessageTemplateListPage.tsx:258,260` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N(도착 화면이 자기 조회를 한다) |
| 성공 처리 | [템플릿 상세](detail.md) 가 열린다 |
| 실패 처리 | 그 템플릿이 사라졌으면 도착 화면이 자기 실패를 알린다 |
| 예외 처리 | ⚠ **다른 목록 화면과 다른 선택이다** — 이벤트·프로모션·발송 3화면은 행 클릭이 수정으로 간다. 이 화면만 상세로 가는데, 켜고 끄기가 상세 헤더에 있어 편집기로 곧장 보내면 켜기만 하려던 운영자가 매번 편집기를 열고 나오기 때문이다 — `MessageTemplateListPage.tsx:6-7` |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

### 4.5 새 템플릿 — 종류를 먼저 묻는다

| 항목 | 내용 |
|---|---|
| 기능 목적 | **되돌릴 것이 가장 적은 시점에** 종류를 정하게 한다 |
| 실행 조건 | `create` 권한 |
| 사용자 동작 | `새 템플릿` 클릭 → 팝업에서 종류 선택 |
| 시스템 처리 | 팝업을 열고, 고른 종류를 쿼리로 실어 편집기로 보낸다(`/marketing/templates/new?kind={종류}`) — `apps/admin/src/pages/marketing/message-templates/data-source.ts:32-33` |
| 데이터 처리 | 없음 — 아직 아무것도 만들지 않는다 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 그 종류의 편집기가 열린다 |
| 실패 처리 | 실패 경로가 없다 |
| 예외 처리 | **편집기에 들어간 뒤 종류를 바꾸게 두지 않는다** — 이미 쓴 내용을 버려야 하고, 그것은 되돌릴 것이 가장 많아진 시점이다 — `apps/admin/src/pages/marketing/message-templates/components/NewTemplateKindDialog.tsx:3-5` |
| 화면 변경 사항 | 팝업 |
| 후속 동작 | 편집기 진입 |
| 로그 기록 여부 | N |

팝업의 상세는 [`POP-MARKETING-TEMPLATES-NEW-KIND`](pop-new-kind.md) 가 갖는다.

### 4.6 삭제(단건 · 일괄)

| 항목 | 내용 |
|---|---|
| 기능 목적 | 필요 없는 템플릿을 지운다 |
| 실행 조건 | 삭제 권한 |
| 사용자 동작 | 행 삭제 · 일괄 삭제 |
| 시스템 처리 | 공용 목록 껍데기가 확인 다이얼로그를 세운다 |
| 데이터 처리 | 대상이 목록에서 사라진다. 되돌릴 수 없다 |
| Validation | 선택 0건이면 아무 요청도 만들지 않는다 |
| API 호출 여부 | Y |
| 성공 처리 | 목록 갱신 + 공통 성공 토스트 — `MSG-COMMON-02` · `MSG-COMMON-03` |
| 실패 처리 | 공통 규칙(다이얼로그를 닫지 않고 배너로) |
| 예외 처리 | ⚠ **상태와 무관하게 지울 수 있다** — 사용중인 템플릿도 목록에서 바로 삭제된다. 상태별 액션 판정은 삭제를 언제나 허용한다 — `apps/admin/src/pages/marketing/message-templates/status.ts:69-76`. 발송 이력이 그 템플릿을 참조하고 있어도 화면이 막지 않는다 |
| 화면 변경 사항 | 목록영역 · 선택영역 |
| 후속 동작 | 목록 재조회 |
| 로그 기록 여부 | 확인하지 못했다 |

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 화면 진입 | `/marketing/templates` 도달 | 주소의 조건을 읽어 조회 | 화면 전체 | 템플릿 목록 |
| 옛 경로 진입 | `/marketing/templates/alimtalk` · `/marketing/message-templates` (및 하위) | 이 목록으로 되돌린다 | 화면 전체 | 템플릿 목록 |
| 검색어 입력 | 타이핑(조합 종료 후) | 주소 갱신 + 목록 좁힘 + 선택 해제 | 검색 입력 | 좁혀진 목록 |
| 종류 필터 변경 | 선택 변경 | 〃 | 종류 필터 | 좁혀진 목록 |
| 상태 필터 변경 | 선택 변경 | 〃 | 상태 필터 | 좁혀진 목록 |
| 행 클릭 | 표의 행 | **상세로** 이동 | 목록영역 | `SCR-MARKETING-TEMPLATES-DETAIL` |
| `새 템플릿` 클릭 | 버튼 | 종류 고르기 팝업을 연다 | 버튼영역 | `POP-MARKETING-TEMPLATES-NEW-KIND` |
| 팝업에서 종류 선택 | 팝업의 항목 클릭 | 그 종류의 편집기로 이동 | 팝업 | `SCR-MARKETING-TEMPLATES-FORM` |
| 팝업 취소 | `취소` · Esc · 딤 | 팝업만 닫는다 | 팝업 | 목록 |
| 행 삭제 클릭 | 행 액션 | 공통 단건 삭제 확인 | 목록영역 | `DLG-COMMON-DELETE-ONE` |
| 일괄 삭제 클릭 | 선택 바 | 공통 일괄 삭제 확인 | 선택영역 | `DLG-COMMON-DELETE-BULK` |
| 조회 실패 | 조회 오류 | 표 자리를 인라인 배너로 대체 | 오류영역 | 배너 |
| 빈 상태의 복구 클릭 | `검색 지우기` · `필터 초기화` | 그 조건만 되돌린다 | 빈 상태 | 목록 |

**이 화면 고유의 확인 다이얼로그는 없다** — 인벤토리 §8.2 의 마케팅 항목은 상세 화면 하나뿐이다.

## 6. Validation

**해당 없음 — 이 목록 화면에는 입력 검증이 없다.** 사용자가 치는 값은 검색어 하나이고 형식 제한이 없다. 주소에서 읽는 두 필터 값만 허용 목록으로 좁힌다 — `MessageTemplateListPage.tsx:38-49`. 템플릿 본문의 검증 규칙은 [템플릿 등록·수정](form.md) 이 갖는다.

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | `등록된 메시지 템플릿이 없어요` / `조건에 맞는 메시지 템플릿이 없어요` / `필터에 맞는 메시지 템플릿이 없어요` — `packages/ui/src/molecules/Empty/Empty.tsx:71-76` | 표 구조를 유지한 채 빈 상태 | `검색 지우기` · `필터 초기화` · `새 템플릿` |
| 저장 실패 · 수정 실패 | 해당 없음 — 이 화면에 저장 폼이 없다 | — | — |
| 삭제 실패 | 공통 규칙(다이얼로그를 닫지 않고 배너로) | — | 확인 재클릭 |
| API 오류 · 서버 오류 · 네트워크 오류 | 공용 목록 껍데기의 조회 실패 인라인 배너. 자동 재시도 없음 — `apps/admin/src/shared/query/queryClient.ts:82,108` | 표 자리를 대체한다 | 배너의 다시 시도 |
| 권한 없음 | 읽기 없음 → `접근 권한이 없어요` — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. 등록 권한만 없으면 `새 템플릿` 이 보이지 않는다 | 셸은 남는다 | 관리자에게 권한 요청 |
| 세션 만료 | 이 화면에 자기 문구가 없다 | 원래 주소를 보존한 채 로그인 화면으로 | 재로그인 후 같은 조건으로 복귀 |
| 데이터 충돌 | 이 화면에는 쓰기 폼이 없다 | — | — |
| 중복 데이터 | **템플릿명 중복을 막지 않는다** — 유일성 검사가 코드에 없다 | — | — |
| 파일 업로드 실패 | 해당 없음 — 이 목록에 파일 입력이 없다(이미지는 편집기가 다룬다) | — | — |
| 사용중 템플릿 삭제 | **경고가 없다** — 상태와 무관하게 지워진다(§4.6) | 확인 다이얼로그만 거친다 | 없음 |
| 알림톡 반려 | **목록에서 알 수 없다** — 심사 상태 열이 없다(§4.3) | — | 상세를 연다 |

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 툴바는 즉시 그려지고 표 자리에 스켈레톤 | 검색·필터 ○ · `새 템플릿` ○ | Y | 없음 |
| 데이터 있음 | 다섯 열의 표 | 전부 ○ | N | 없음 |
| 데이터 없음 | 빈 상태 카드 | 전부 ○ | N | §7 의 세 갈래 |
| 재조회 중 | 데이터가 있으면 이전 목록을 유지한다 — `apps/admin/src/shared/crud/useCrudList.tsx:132-133` | 전부 ○ | Y | 없음 |
| 조회 실패 | 표 자리를 인라인 배너가 대체 | 검색·필터 ○ | N | 공용 껍데기의 실패 문구 |
| 종류 고르기 팝업 열림 | 목록 위에 팝업. 배경은 격리되고 스크롤이 잠긴다 | 팝업의 항목·`취소` ○ | N | 종류마다 한 줄 설명([팝업 문서](pop-new-kind.md)) |
| 삭제 중 | 확인 다이얼로그의 확인 버튼이 잠긴다 | 취소 ○ · 확인 × | Y | 진행 표시가 곧 안내다 |
| 읽기 전용(권한) | `새 템플릿`·삭제 컨트롤이 사라진다 | 검색·필터 ○ | N | 없음 |

**세 상태를 색으로만 가르지 않는다** — `초안`·`사용중`·`미사용`이 각각 다른 색이면서 **글자로도 다르다**. 기본 회색을 두 상태가 나눠 쓰면 '발행 전'과 '발행됐지만 꺼짐'이 구분되지 않는다 — `apps/admin/src/pages/marketing/message-templates/status.ts:10-17`.

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | ○ | ○ | ○ | — | — | — | — |
| 운영자 | 역할의 `/marketing/templates` 리소스 × `read` | 같은 리소스 × `create` | × `update` | × `remove` | — | — | — | — |
| 뷰어 | ○ | × | × | × | — | — | — | — |
| 권한 없음 | × | × | × | × | — | — | — | — |

**승인·반려는 이 앱의 권한 액션이 아니다** — 알림톡 심사는 카카오가 판정하며 이 화면에서 승인하거나 반려할 수 없다.

**권한이 없을 때 화면이 어떻게 되는가**

| 없는 것 | 결과 | 근거 |
|---|---|---|
| 읽기(`read`) | 본문이 `접근 권한이 없어요` 화면으로 대체된다 | `apps/admin/src/shared/errors/ErrorScreens.tsx:73` |
| 등록(`create`) | `새 템플릿` 이 **사라진다**(비활성이 아니다) | `MessageTemplateListPage.tsx:234` |
| 수정·삭제 | 그 컨트롤이 사라진다(공용 목록 껍데기가 판정한다) | `apps/admin/src/shared/permissions/RequirePermission.tsx:1-6` |
| 플랜(엔타이틀먼트) | **걸리지 않는다** — 이 경로에 모듈 매핑이 없다 | `apps/admin/src/shared/entitlements/module-resources.ts:75-79` |

**미결(플랜 잠금)** — 발송 템플릿(문자·알림톡)을 어느 등급부터 열지는 상용 패키징 결정이라 **아직 정하지 않는다**(운영자 확정: 지금은 미결로 남긴다). 그때까지 `/marketing/templates` 는 모든 플랜에서 열린다(fail-open). 패키징이 정해지면 `module-resources.ts` 에 이 경로 매핑을 추가해 플랜별 잠금이 걸린다.

⚠ **템플릿을 만들 수 있는 것과 보낼 수 있는 것이 다르다** — `SMS 발송` 모듈이 없는 계정도 문자·알림톡 템플릿을 만들 수 있다. 화면은 그 사실을 알리지 않는다.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-MARKETING-TEMPLATES` | `새 템플릿` 클릭 | `POP-MARKETING-TEMPLATES-NEW-KIND` | **Y** | `create` 권한 | 없음 | 같은 목록 |
| `POP-MARKETING-TEMPLATES-NEW-KIND` | 종류 선택 | `SCR-MARKETING-TEMPLATES-FORM` | N | 언제나 | `?kind={종류}` | 편집기의 `목록으로` |
| `SCR-MARKETING-TEMPLATES` | 행 클릭 | `SCR-MARKETING-TEMPLATES-DETAIL` | N | 언제나 | 템플릿 id | 뒤로가기로 같은 조건의 목록 |
| `SCR-MARKETING-TEMPLATES` | 행 삭제 클릭 | `DLG-COMMON-DELETE-ONE` | Y | 삭제 권한 | 대상 1건의 id·이름 | 같은 목록 |
| `SCR-MARKETING-TEMPLATES` | 일괄 삭제 클릭 | `DLG-COMMON-DELETE-BULK` | Y | 1건 이상 선택 | 선택된 id 목록·건수 | 같은 목록 |
| `/marketing/templates/alimtalk`(및 하위) | 진입 | `SCR-MARKETING-TEMPLATES` | N | 언제나 | 없음 | — |
| `/marketing/message-templates`(및 하위) | 진입 | `SCR-MARKETING-TEMPLATES` | N | 언제나 | 없음 | — |
| `SCR-MARKETING-TEMPLATES` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | 원래 주소 · 만료 표식 | 재인증 후 같은 조건의 이 화면 |

**이 화면이 여는 팝업은 하나다** — 종류 고르기(`POP-MARKETING-TEMPLATES-NEW-KIND`).

**이 화면에는 자기 결과 통지 토스트가 없다** — 인벤토리 §9.3 에 `pages/marketing/message-templates/MessageTemplateListPage.tsx` 가 없다. 삭제 통지는 공통 층의 `MSG-COMMON-02` · `MSG-COMMON-03` 이 말한다. 마케팅 15화면 중 자기 토스트를 가진 것은 [템플릿 상세](detail.md) 하나뿐이다.
