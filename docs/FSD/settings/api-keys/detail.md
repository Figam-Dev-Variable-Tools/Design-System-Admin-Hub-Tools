# API Key 설정 — 연동 상세 (앱 설정)

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 화면명 | 연동 설정 (화면 제목은 연동 이름, 카드 제목은 `자격증명`) |
| 화면 ID | `SCR-SETTINGS-API-KEYS-DETAIL` |
| 메뉴 경로 | 시스템 설정 > API Key 설정 > (연동) — 사이드바에 자기 자리는 없다 |
| 작성자 | Admin Hub 문서화 |
| 작성일 | 2026-07-22 |
| 버전 | 1.0 |

**화면 목적** — 연동 하나의 **자격증명을 넣고 그 연동을 켜거나 끈다.** 저장은 **이 연동 자리만** 쓴다 — 다른 연동은 서버 값 그대로 남는다. 목록에서 이름 또는 `앱 설정`을 누르면 여기로 온다.

**업무 배경** — 연동마다 요구하는 값의 모양이 다르다. 모델 4종은 키 한 칸이면 되지만 Azure OpenAI 는 리소스 주소와 배포명이 함께 있어야 하고(배포명이 틀리면 호출이 404 다), Amazon Bedrock 은 키가 리전에 묶여 있으며, CJ대한통운은 계약으로 받은 고객코드가 함께 필요하다. '어차피 API 키 한 칸이겠지'로 폼을 만들면 **저장은 되는데 호출이 실패하는**, 가장 진단하기 어려운 고장이 난다 — `apps/admin/src/pages/settings/api-keys/integrations.ts:39-47`.

**화면 설명** — `목록으로` 링크 → 로고가 붙은 연동 이름 → 카드 하나(사용 토글 · 그 연동만의 주의 안내 · 자격증명 칸)가 온다. 그 아래에 조건부 카드 둘(배송 정책 연결 · 계약하면 열리는 API)과 `연결 상태` 카드가 붙는다. 저장은 확인 다이얼로그를 한 번 거친다.

**주요 사용자** — 최상위 관리자 · 시스템 설정 수정 권한을 가진 운영자(조회 권한만 있으면 값은 볼 수 있고 바꿀 수 없다).

**사용 시나리오**

1. 운영자가 목록에서 `Azure OpenAI` 를 눌러 들어와 키·리소스 엔드포인트·배포명을 넣고 토글을 켜서 저장한다 → 목록으로 돌아가면 그 행이 `연동 완료`다.
2. OpenAI 키를 새로 발급받았다 → 저장된 키 자리에는 고정 길이 글리프만 보이고, `변경`을 눌러 새 값을 넣는다. 저장하면 그 자리는 다시 글리프로 돌아간다.
3. CJ대한통운을 열어 인증키와 고객코드를 저장한 뒤, 아래 `배송 정책 연결` 카드가 `등록되지 않음`이라고 말하는 것을 보고 배송 정책으로 가서 택배사 코드를 맞춰 등록한다.

**선행 조건** — 로그인 · `/settings/api-keys` 잎의 조회 권한. 저장하려면 수정 권한이 필요하다. 주소의 연동 id 가 카탈로그의 7종 중 하나여야 한다.

**후행 처리** — 저장된 자격증명이 목록의 상태·연동 시작일·탭 건수를 바꾼다. 모델 4종을 켜면 AI 화면의 응답 모드 잠금이 풀린다 — `apps/admin/src/pages/settings/api-keys/data-source.ts:328-345`. 배송 연동을 켜도 **앱에서 달라지는 것이 아직 없다**(§4.5).

**관련 화면** — `SCR-SETTINGS-API-KEYS`(목록 · `목록으로` 로 돌아간다) · `SCR-PRODUCTS-SHIPPING`(배송 연동이 가리키는 택배사 원장 · §4.7) · `SCR-AI-CHAT`(모델 연동을 켜면 응답 모드가 열린다). 저장 충돌 팝업은 공유 문서다: [저장 충돌(설정)](../../_common/pop-settings-conflict.md) · 공통 규약은 [공통 확인 다이얼로그 · 토스트](../../_common/index.md).

**관련 메뉴** — 사이드바에 자기 항목이 없다. 메뉴 강조와 권한 리소스는 잎 `/settings/api-keys` 가 덮는다 — `apps/admin/src/App.tsx:205-208`.

**관련 기능** — 목록의 탭·상태 표시는 이 화면의 저장 결과를 읽기만 한다. 반대로 자격증명 입력과 켜고 끄기는 **여기서만** 한다 — 목록의 더보기 `연동 해제`도 결국 이 화면으로 보낸다.

**관련 API** — 목적 둘: ① 저장된 연동 문서 1건 조회(목록과 같은 문서·같은 캐시 키) ② 그 문서 저장(개정 토큰 동반). **백엔드가 없다** — 계약은 `apps/admin/src/pages/settings/api-keys/data-source.ts:53-93` 의 `TODO(backend)` 가 갖는다. ⚠ **조회 응답에 비밀 칸의 값은 실리지 않는다** — 저장 여부만 온다. 저장 요청에만 평문이 실리고 응답에는 실리지 않는다. **연결 검증 호출은 이 화면이 부르지 않는다**(§4.9) — 계약만 적혀 있다.

**참고 문서** — [ID 규약](../../id-convention.md) · [인벤토리](../../inventory.md) · [품질 기준](../../../reference/quality-bar.md)

**구현 파일** — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx` (자격증명 칸 `components/AiCredentialFields.tsx` · 배송 정책 연결 `components/CarrierPolicyCard.tsx` · API 묶음 `components/ApiPackageCard.tsx` · 카탈로그 `integrations.ts` · 비밀 여부·연동 성립 판정 `ai-connections.ts` · 검증 `validation.ts` · 저장 `data-source.ts` · 공용 껍데기 `../_shared/SettingsFormShell.tsx` · 시크릿 표시 규약 `../_shared/secret.ts`)

**⚠ 파일·심볼 이름이 지금의 사실과 어긋난다** — 이 화면은 배송 연동(CJ대한통운)도 그리는데 구현 이름은 아직 `Ai` 접두다: `AiConnectionPage` · `aiConnectionsStore` · `AI_CREDENTIAL_FIELDS` · `aiConnectionPath`. 화면 문구에는 AI 전제가 남아 있지 않으나 **이름은 그대로**이며, 이 폴더 밖(`apps/admin/src/wiring.ts`)이 그 이름들을 가져다 쓰고 있어 개명이 이 폴더의 변경으로 끝나지 않는다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:4-16` · `apps/admin/src/pages/settings/api-keys/integrations.ts:8-9`. 이 문서는 **화면에 보이는 문구를 기준으로** 쓰고, 이름의 어긋남은 §7 아래 격차 표에 남긴다.

### 1.1 자격증명 취급 — 이 화면의 규율

**저장된 비밀은 화면에 채워지지 않는다.** 화면이 아는 것은 '저장돼 있는가' 하나이고, 그것을 고정 길이 글리프로 표시한다. **그 글리프는 원본을 가린 표시가 아니라 우리가 가진 정보의 전부다** — `apps/admin/src/pages/settings/_shared/secret.ts:3-14`.

| 축 | 규칙 | 근거 |
|---|---|---|
| 무엇이 비밀인가 | **칸의 성질이다.** 정본은 칸 이름 하나당 한 번 답하는 표(`CREDENTIAL_SECRECY`)이고, **카탈로그 항목에는 그것을 적을 자리가 타입에 없다.** 항목마다 적을 수 있으면 오탈자 하나가 '이 연동에서만 키가 평문으로 저장된다'가 된다 — 라벨이 갈리면 눈에 보이지만 이것은 조용하다 | `apps/admin/src/pages/settings/api-keys/ai-connections.ts:109-130` |
| 새 칸이 생기면 | 표가 `Record` 라 **칸을 더하면 반드시 비밀 여부에 답해야 한다.** 기본값을 두지 않는 이유: 두면 새 칸이 조용히 '공개'가 되고, 그 방향의 실수가 더 비싸다 | `apps/admin/src/pages/settings/api-keys/ai-connections.ts:128-129,131` |
| 저장된 비밀의 표시 | `••••••••••••` — `apps/admin/src/pages/settings/_shared/secret.ts:28`. 자릿수도 마지막 4자도 남기지 않는다 | 〃 |
| 저장된 비밀이 있을 때의 입력 요소 | **아예 렌더하지 않는다.** 가리는 것이 아니라 평문이 들어갈 자리를 두지 않는 것이 방어다 | `apps/admin/src/pages/settings/api-keys/components/AiCredentialFields.tsx:14-22,141` |
| 새로 넣을 값의 뜻 | 빈 문자열 = 기존 값 유지 · 값이 있음 = 교체 | `apps/admin/src/pages/settings/api-keys/validation.ts:3-11` |
| 저장 문서에 남는 것 | 비밀 칸은 **이름만** 남고 평문은 버려진다. 그래서 이 모듈이 든 문서를 통째로 출력해도 키는 없다 | `apps/admin/src/pages/settings/api-keys/data-source.ts:14-21,155-184` |
| 비밀이 아닌 값 | 베이스 URL · 기본 모델 · 리소스 엔드포인트 · 배포명 · API 버전 · 리전 · 고객코드 · 조직/프로젝트 ID 는 **값으로 저장되고 되읽힌다.** 되읽지 못하면 폼이 쓸모없어진다 — 배포명을 매번 다시 입력해야 하고 한 글자 틀리면 호출이 404 다 | `apps/admin/src/pages/settings/api-keys/ai-connections.ts:196-220` |
| 비밀이 아닌 값을 비밀처럼 다루지 않는다 | 조직·프로젝트 ID 는 그것만으로 아무 호출도 인증되지 않는다. 고객코드는 '어느 계약으로 부르는가'를 가리키는 값이다 | `apps/admin/src/pages/settings/api-keys/ai-connections.ts:80-104` |
| 저장 직후 | 저장이 돌려준 문서로 폼을 다시 세운다 — 그 문서에 평문이 없으므로 **저장은 평문이 화면에서 사라지는 시점**이기도 하다 | `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:342-349` |
| 연결 검증 | **없다.** 버튼도 두지 않는다(§4.9) | `apps/admin/src/pages/settings/api-keys/ai-connections.ts:184-191` |

**비밀 여부의 정본 표** — 열두 칸이 각자 한 번씩 답한다 — `apps/admin/src/pages/settings/api-keys/ai-connections.ts:131-147`.

| 칸 이름 | 비밀인가 | 화면에서 | 이 카탈로그에서 쓰는 곳 |
|---|---|---|---|
| `apiKey` | **예** | 마스크 + `변경` | 7종 전부 |
| `secretAccessKey` | **예** | 〃 | 없음 — 자리만 열려 있다 |
| `accessKeyId` | 아니오 | 값으로 왕복 | 없음 — 자리만 열려 있다 |
| `baseUrl` | 아니오 | 〃 | 모델 4종 |
| `endpoint` | 아니오 | 〃 | Azure OpenAI |
| `deployment` | 아니오 | 〃 | Azure OpenAI |
| `apiVersion` | 아니오 | 〃 | Azure OpenAI |
| `region` | 아니오 | 〃 | Amazon Bedrock |
| `customerCode` | 아니오 | 〃 | CJ대한통운 |
| `defaultModel` | 아니오 | 〃 | 모델 4종 |
| `organizationId` | 아니오 | 〃 | OpenAI |
| `projectId` | 아니오 | 〃 | OpenAI |

AWS 서명 한 쌍(`accessKeyId` · `secretAccessKey`)은 오늘 어느 항목도 요구하지 않아 **화면에 그려지지 않는다.** 표에서 지우지 않는 이유는 그 둘이 비밀 판정의 정본 두 개로 테스트에 못박혀 있고, `accessKeyId` 는 'CJ대한통운이 그 칸을 만들지 않는다'는 부정 단언의 대상이기 때문이다 — `apps/admin/src/pages/settings/api-keys/ai-connections.ts:57-77`.

## 2. 페이지(UI) 구성

| 영역 | 영역 목적 | 표시 조건 | 노출 대상 | 접기·펼치기 | 기본 표시 상태 |
|---|---|---|---|---|---|
| Navigation | `목록으로` 링크 | 항상(알 수 없는 연동일 때도) | 전체 | 불가 | 표시 |
| Header(화면 제목) | 로고 + 연동 이름 | 아는 연동일 때 | 전체 | 불가 | 표시 |
| 오류영역(알 수 없는 연동) | 주소의 id 를 모를 때 그 사실과 돌아갈 길 | 카탈로그에서 좁히기 실패 시 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:463` | 전체 | 불가 | 조건부 |
| 안내문 | 이 연동이 무엇이고 어느 분류인지 한 줄 | 아는 연동이고 조회 실패가 아닐 때 | 전체 | 불가 | 표시 |
| 오류영역(조회) | 조회 실패 배너 + 재시도. 이때 폼도 아래 카드 셋도 그리지 않는다 | 조회 실패 시 | 전체 | 불가 | 숨김 |
| 오류영역(저장) | 저장 실패 사유를 카드 안에서 알린다 | 저장 실패이고 다이얼로그·팝업이 닫혀 있을 때 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:503-505` | 전체 | 불가 | 숨김 |
| 읽기 전용 안내 | 수정 권한이 없다는 사실과 그 이유 | 수정 권한이 없을 때 | 조회 권한만 있는 역할 | 불가 | 조건부 |
| 안내영역 — 이 연동만의 주의 | 입력칸으로 만들지 않은 것과 그 이유, 계약·헤더의 함정 | 그 항목에 주의 문장이 있을 때(7종 전부 있다) — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:512-516` | 전체 | 불가 | 표시 |
| 토글 줄 | 이 연동의 사용 여부 + 켜면 무엇이 요구되는지 | 조회가 끝났을 때 | 전체 | 불가 | 표시 |
| 입력영역 — 자격증명 | **카탈로그가 정한 칸만** 그린다 | 〃 | 전체 | 불가 | 표시 |
| 스켈레톤 | 첫 조회 동안 카드 본문 자리를 4줄로 잡는다 | 첫 조회 중 | 전체 | 불가 | 조건부 |
| 버튼영역 | 마지막 변경 표기 + 상태 문구 + 저장 버튼 | 저장 버튼은 수정 권한이 있을 때만 렌더된다 | 수정 권한 보유자 | 불가 | 표시 |
| 배송 정책 연결 카드 | 이 연동의 택배사가 배송 정책에 등록돼 있는가 | 조회가 끝났고 그 항목에 택배사 코드가 있을 때(CJ대한통운만) — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:561` | 전체 | 불가 | 조건부 |
| 계약 API 카드 | 계약하면 함께 열리는 API 묶음 | 조회가 끝났고 그 항목에 묶음이 있을 때(CJ대한통운만) — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:570` | 전체 | 불가 | 조건부 |
| 연결 상태 카드 | '자격증명이 채워짐'과 '실제로 연결됨'을 가른다 | 조회가 끝났을 때 | 전체 | 불가 | 표시 |

**세 카드가 폼 밖에 있다** — 배송 정책 연결·계약 API·연결 상태는 읽기 전용 사실이라 저장 폼 안에 두지 않는다. 조회에 실패하면 셋 다 그리지 않는다 — 값을 모르는 채로 상태를 말하지 않기 위해서다.

## 3. UI 컴포넌트 정의

| No | 컴포넌트명 | 컴포넌트 타입 | Label | 설명 | 필수 | ReadOnly | Disabled 조건 | 기본값 | Placeholder | 입력 제한 | 표시 조건 | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 목록으로 | Link | `목록으로` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:452` | 연동 목록으로 돌아간다 | N | N | 없음 | — | — | — | 항상 | **버튼이 아니라 링크다** — 이탈 가드가 앵커 클릭을 가로챈다 |
| 2 | 화면 제목 | Heading(h2) | 연동 이름 + 로고 | 앱 헤더가 이미 최상위 제목을 그린다 | N | Y | — | — | — | — | 아는 연동 | 한 문서에 최상위 제목을 둘 두지 않는다 |
| 3 | 알 수 없는 연동 배너 | Alert(danger) | `{주소에 적힌 값}은(는) 이 화면이 아는 연동이 아니에요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:469` (값은 곡선 따옴표로 감싸 보인다) | 빈 화면을 내놓지 않는다 | N | Y | — | — | — | — | 좁히기 실패 시 | 폼을 아예 그리지 않는다 |
| 4 | 목록으로 돌아가기 | Link | `연동 목록으로 돌아가기` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:471` | 배너 안의 돌아갈 길 | N | N | 없음 | — | — | — | 〃 | 위쪽 `목록으로` 도 함께 남는다 |
| 5 | 화면 안내문 | Text | `{연동 이름} · {분류} — {항목 설명}` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:499` | 무엇을 다루는 화면인지 | N | Y | — | — | — | — | 아는 연동 | 분류 문구는 목록의 탭과 같은 낱말이다 |
| 6 | 카드 제목 | CardTitle | `자격증명` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:498` | 문서 구획 | N | Y | — | — | — | — | 〃 | — |
| 7 | 조회 실패 배너 | Alert(danger) | `설정을 불러오지 못했어요.` — `apps/admin/src/pages/settings/_shared/SettingsFormShell.tsx:132` | 폼 대신 이것만 그린다 | N | Y | — | — | — | — | 조회 실패 | 아래 카드 셋도 함께 사라진다 |
| 8 | 다시 시도 | Button(secondary) | `다시 시도` — `apps/admin/src/pages/settings/_shared/SettingsFormShell.tsx:134` | 같은 조회를 다시 건다 | N | N | 없음 | — | — | — | 조회 실패 | — |
| 9 | 저장 실패 배너 | Alert(danger) | `연동을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:362` | 카드 맨 위 | N | Y | — | 없음 | — | — | 저장 실패이고 다이얼로그가 닫혀 있을 때 | 다이얼로그가 떠 있으면 그 안에서 보인다 |
| 10 | 읽기 전용 안내 | Alert(info) | `조회 권한만 있어요. 연동을 바꾸려면 시스템 설정 수정 권한이 필요해요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:97` | 저장 컨트롤이 왜 없는지 | N | Y | — | — | — | — | 수정 권한 없음 | — |
| 11 | 연동 주의 안내 | Alert(info) | 항목별 문장. 예(CJ대한통운): `이 화면만으로는 연동되지 않아요 — CJ대한통운과 기업고객 계약을 맺고 오픈API 사용 승인을 받아야 고객코드와 인증키가 나와요.` 로 시작한다 — `apps/admin/src/pages/settings/api-keys/integrations.ts:795-796` | 값을 다 넣어도 연동이 안 되는 이유는 대개 여기 있다 | N | Y | — | — | — | — | 항목에 주의 문장이 있을 때 | 일곱 값의 정본은 카탈로그다(§3.2) |
| 12 | 사용 토글 | ToggleSwitch | `{연동 이름} 사용` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:521` | 이 연동을 켜고 끈다 | N | N | 저장 중 · 첫 조회 중 · 수정 권한 없음 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:323` | 저장된 값(초기 픽스처는 저장된 연동이 0건이라 꺼짐) | — | — | 항상 | **켜면 필수 자격증명이 필수가 된다**(§6) |
| 13 | 토글 설명 | Text(caption) | `켜면 필수 자격증명을 모두 요구해요. 끄는 것은 언제나 할 수 있어요 — 자격증명은 지워지지 않고 그대로 남아요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:529-530` | 끄는 일이 파괴적이지 않다는 사실 | N | Y | — | — | — | — | 항상 | — |
| 14 | 자격증명 입력칸(공개) | TextField | 칸 라벨(§3.2). 예: `베이스 URL` — `apps/admin/src/pages/settings/api-keys/integrations.ts:182` · `기본 모델` — `apps/admin/src/pages/settings/api-keys/integrations.ts:213` | 값으로 저장되고 되읽힌다 | 켜져 있고 그 칸이 필수면 Y | N | 저장 중 · 첫 조회 중 · 수정 권한 없음 | 저장된 값 | 없음 | 500자 — `apps/admin/src/pages/settings/api-keys/validation.ts:52` | 카탈로그가 요구한 칸만 | 힌트는 칸마다 다르다(§3.2) |
| 15 | 자격증명 입력칸(비밀·미저장) | PasswordField | `API 키` — `apps/admin/src/pages/settings/api-keys/integrations.ts:147` | 아직 저장된 값이 없을 때 | 켜져 있으면 Y | N | 〃 | 빈 칸 | 없음 | 500자 | 비밀 칸이고 저장된 값이 없을 때 | 브라우저 저장 제안을 끈다 |
| 16 | 저장된 비밀 표시 | Text | `••••••••••••` — `apps/admin/src/pages/settings/_shared/secret.ts:28` | 저장돼 있다는 **사실만** 보여준다 | N | Y | — | — | — | — | 비밀 칸이 저장돼 있고 변경 중이 아닐 때 | 가린 값이 아니라 우리가 가진 정보의 전부다 |
| 17 | 비밀 변경 | Button(secondary) | `변경` — `apps/admin/src/pages/settings/api-keys/components/AiCredentialFields.tsx:176` | 마스크를 걷고 빈 입력칸을 연다 | N | N | 저장 중 · 첫 조회 중 · 수정 권한 없음 | — | — | — | 〃 | — |
| 18 | 비밀 변경 취소 | Button(secondary) | `취소` — `apps/admin/src/pages/settings/api-keys/components/AiCredentialFields.tsx:206` | 입력하던 새 값을 버리고 기존 값 유지로 되돌린다 | N | N | 〃 | — | — | — | 비밀 칸이 저장돼 있고 변경 중일 때 | — |
| 19 | 저장된 비밀의 힌트 | Text(hint) | `저장돼 있어요. 값은 다시 표시할 수 없어요 — 바꾸려면 연동 상대의 콘솔에서 새로 발급해 넣으세요.` — `apps/admin/src/pages/settings/api-keys/components/AiCredentialFields.tsx:160` | 잃어버렸을 때 무엇을 해야 하는가 | N | Y | — | — | — | — | 마스크가 보일 때 | 그 자리에는 항목별 힌트 대신 이 문장이 온다 |
| 20 | 변경 중 안내 | Placeholder | `비워 두면 저장된 키를 그대로 써요` — `apps/admin/src/pages/settings/api-keys/components/AiCredentialFields.tsx:193` | 빈 칸의 뜻을 말한다 | — | — | — | — | 이 문구 | — | 비밀 칸이 저장돼 있고 변경 중일 때 | — |
| 21 | 형식 경고 | Text(caption) | 칸별 문장(§6.2) | **저장을 막지 않는다.** 오류가 있으면 오류가 이긴다 | N | Y | — | 없음 | — | — | 그 칸에 경고 조건이 걸리고 오류가 없을 때 | `apps/admin/src/pages/settings/api-keys/components/AiCredentialFields.tsx:214` |
| 22 | 마지막 변경 표기 | Text(caption) | `마지막 변경: {변경자} · {상대 시각}` — `apps/admin/src/pages/settings/_shared/AuditNote.tsx:33` | 누가 언제 바꿨는가 | N | Y | — | 픽스처 초기값 `김운영` — `apps/admin/src/pages/settings/api-keys/data-source.ts:97` | — | — | 조회가 끝났을 때 | 정확한 일시는 툴팁으로 남는다 |
| 23 | 저장 상태 문구 | Text(caption) | `저장하는 중이에요…` / `저장하지 않은 변경 사항이 있어요.` / `변경 사항이 없어요.` — `apps/admin/src/pages/settings/_shared/SettingsFormShell.tsx:172-175` | 저장 버튼의 상태 | N | Y | — | `변경 사항이 없어요.` | — | — | 수정 권한이 있을 때 | — |
| 24 | 저장 버튼 | Button(primary) | `저장` · 진행 중 `저장 중…` — `apps/admin/src/pages/settings/_shared/SettingsFormShell.tsx:183` | 검증 후 확인 다이얼로그를 연다 | Y | N | 변경 없음 · 저장 중 · 첫 조회 중 | — | — | — | **수정 권한이 있을 때만 렌더된다** | 눌러 보고 거절당하는 자리를 만들지 않는다 |
| 25 | 저장 확인 다이얼로그 | ConfirmDialog | 제목 `{연동 이름} 연동 저장` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:650` | 본문은 켜고 끄기 여부로 갈린다(§4.5) | Y | N | 확인 버튼은 저장 중 잠긴다 | — | — | — | 저장 제출 후 | 화면 고유 다이얼로그다 |
| 26 | 저장 충돌 팝업 | Modal | `POP-COMMON-SETTINGS-CONFLICT` — 설정 이름 `{연동 이름} 연동` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:661` | 문구·동작은 공유 문서가 갖는다 | Y | N | 진행 중 두 버튼 잠금 | — | — | — | 저장이 충돌로 거절됐을 때 | [저장 충돌(설정)](../../_common/pop-settings-conflict.md) |
| 27 | 배송 정책 연결 — 카드 제목 | CardTitle | `배송 정책 연결` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:81` | 택배사 원장과의 관계 | N | Y | — | — | — | — | 택배 연동일 때 | — |
| 28 | 배송 정책 연결 — 택배사 코드 | Text(등폭) | `택배사 코드` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:85` · 값은 카탈로그의 코드(CJ대한통운은 `CJGLS` — `apps/admin/src/pages/settings/api-keys/integrations.ts:812`) | 운영자가 배송 정책에 그대로 옮겨 적어야 하는 값이라 등폭으로 그린다 | N | Y | — | — | — | — | 〃 | 옆 설명: `배송 정책의 택배사 코드가 이 값과 같아야 같은 택배사로 봐요.` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:88` |
| 29 | 배송 정책 연결 — 등록 상태 | StatusBadge + 문장 | `등록 상태` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:93`. 네 갈래는 §4.7 | 배송 정책이 이 택배사를 어떻게 알고 있는가 | N | Y | — | — | — | — | 〃 | 판정은 이 화면이 하지 않는다 |
| 30 | 배송 정책 연결 — 어긋남 경고 | Alert(warning) | `자격증명이 저장돼 있어도 이 택배사로는 배송이 나가지 않아요.` 로 시작하고 배송 정책 링크를 담는다 — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:126-132` | 무엇을 해야 하는지까지 말한다 | N | Y | — | — | — | — | 등록 상태가 `등록되지 않음` · `사용 꺼짐` 일 때만 | **`확인하지 못함` 일 때는 뜨지 않는다**(§4.7) |
| 31 | 계약 API — 카드 제목 | CardTitle | `계약하면 열리는 API` — `apps/admin/src/pages/settings/api-keys/components/ApiPackageCard.tsx:63` | 계약 단위가 API 하나가 아니라 묶음이다 | N | Y | — | — | — | — | 묶음이 있는 연동 | — |
| 32 | 계약 API — 묶음 이름 | Text | `{묶음 이름} · {개수}종` — `apps/admin/src/pages/settings/api-keys/components/ApiPackageCard.tsx:67`. CJ대한통운은 `(일반)택배 운영 API` — `apps/admin/src/pages/settings/api-keys/integrations.ts:815` | 무엇을 사는가 | N | Y | — | — | — | — | 〃 | — |
| 33 | 계약 API — 목록 | 목록(ul/li) | 7종(§4.8) | **넘겨받은 표기 그대로** 그린다 | N | Y | — | — | — | — | 〃 | 순서에 뜻이 없어 번호를 붙이지 않는다 |
| 34 | 계약 API — 부르지 않는다는 고지 | Alert(info) | `이 화면은 아직 이 중 어느 것도 부르지 않아요.` 로 시작한다 — `apps/admin/src/pages/settings/api-keys/components/ApiPackageCard.tsx:77-79` | 읽는 목록이지 부르는 버튼이 아니다 | N | Y | — | — | — | — | 〃 | 그래서 API 마다 버튼·상태 배지·호출 시각이 없다 |
| 35 | 연결 상태 — 카드 제목 | CardTitle | `연결 상태` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:580` | 두 사실을 가른다 | N | Y | — | — | — | — | 조회가 끝났을 때 | — |
| 36 | 연결 상태 — 자격증명 | StatusBadge + 문장 | `채워짐` / `채워지지 않음` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:587` | **저장된 문서**를 본다. 입력 중인 값은 연동이 아니다 | N | Y | — | `채워지지 않음` | — | — | 〃 | 문장: `필수 칸이 모두 저장돼 있고 사용 설정이 켜져 있어요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:591` / `연동이 성립하려면 사용 설정을 켜고 필수 칸을 모두 저장해야 해요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:592` |
| 37 | 연결 상태 — 연결 검증 | StatusBadge + 값 | `연결 검증` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:597` · 배지 `확인한 적 없음` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:598` · 값 `-` | **언제나 이 값이다** — 검증 시각이 채워지는 경로가 없다(§4.9) | N | Y | — | `확인한 적 없음` · `-` | — | — | 〃 | 검증 버튼이 **없다** |
| 38 | 연결 상태 — 검증 부재 안내 | Alert(info) | `자격증명이 채워진 것과 실제로 연결되는 것은 다른 사실이에요.` 로 시작하는 문단 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:611-618` | 왜 검증이 없는지 · 제공자 공식 문서도 같은 말을 한다 | N | Y | — | — | — | — | 〃 | §4.9 |
| 39 | 연결 상태 — 사용량 안내 | Text(caption) | `사용량·요금·한도는 이 화면에 없어요 — 프로바이더마다 조회 수단이 다르고, 어떤 곳은 자격증명을 하나 더 요구해요. 값의 정본은 각 콘솔이에요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:627-628` | 숫자를 들이지 않는 이유 | N | Y | — | — | — | — | 〃 | §4.10 |
| 40 | 연결 상태 — 한도 링크 | Link(새 창) | `{연동 이름} 한도 안내 열기` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:638` | 확인된 주소가 있는 항목만 | N | N | 없음 | — | — | — | 그 항목에 한도 주소가 있을 때 | 없으면 대신 `이 연동은 한도 안내 주소를 확인하지 못해 링크를 걸지 않았어요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:630` |

### 3.1 연동별로 그려지는 칸

**폼은 카탈로그에서 만들어진다** — 화면에 `이 연동이면 이 칸` 같은 분기가 없다. 분기를 화면에 두면 요구(카탈로그)와 폼이 갈라지고, 갈라진 채로 저장되면 진단하기 어려운 고장이 된다 — `apps/admin/src/pages/settings/api-keys/components/AiCredentialFields.tsx:3-12`.

| 연동 | 그려지는 칸(순서대로) | 필수 | 선택 |
|---|---|---|---|
| OpenAI | API 키 · 베이스 URL · 기본 모델 · 조직 ID · 프로젝트 ID | API 키 | 나머지 넷 |
| Anthropic Claude | API 키 · 베이스 URL · 기본 모델 | API 키 | 나머지 둘 |
| Google Gemini | 〃 | API 키 | 〃 |
| Grok | 〃 | API 키 | 〃 |
| Azure OpenAI | API 키 · 리소스 엔드포인트 · 배포명 · API 버전 | 앞의 셋 | API 버전 |
| Amazon Bedrock | API 키 · 리전 | 둘 다 | 없음 |
| CJ대한통운 | API 키(인증키) · 고객코드 | 둘 다 | 없음 |

### 3.2 칸별 라벨과 힌트

| 칸 | 라벨 | 힌트 | 출처 |
|---|---|---|---|
| API 키(기본형) | `API 키` | `프로바이더 콘솔에서 발급한 키예요. 저장하면 다시 볼 수 없어요.` | `apps/admin/src/pages/settings/api-keys/integrations.ts:145-150` |
| API 키(CJ) | `API 키` | `CJ대한통운 오픈API 포털에서 발급받은 인증키예요. 저장하면 다시 볼 수 없어요.` — `apps/admin/src/pages/settings/api-keys/integrations.ts:786` | 항목마다 힌트만 갈아 끼운다 |
| 베이스 URL | `베이스 URL` | 항목별 문장. 예(Grok): `비우면 기본 주소(https://api.x.ai/v1)로 불러요.` 로 시작한다 — `apps/admin/src/pages/settings/api-keys/integrations.ts:628-630` | 모델 4종에만 둔다 |
| 기본 모델 | `기본 모델` | `비우면 클라이언트 기본값으로 불러요. 표시명이 아니라 API 가 받는 id 를 넣어요. {예시} (2026-07 확인분 — 모델 목록은 빠르게 낡아요. 지금 쓸 수 있는 id 는 프로바이더 콘솔에서 확인하세요.)` — `apps/admin/src/pages/settings/api-keys/integrations.ts:215` | 예시는 항목마다 다르다 |
| 리소스 엔드포인트 | `리소스 엔드포인트` — `apps/admin/src/pages/settings/api-keys/integrations.ts:678` | `예: https://내리소스이름.openai.azure.com` — `apps/admin/src/pages/settings/api-keys/integrations.ts:680` | Azure OpenAI |
| 배포명 | `배포명` — `apps/admin/src/pages/settings/api-keys/integrations.ts:684` | `모델명이 아니라 배포에 붙인 이름이에요. 다르면 호출이 404가 나요.` — `apps/admin/src/pages/settings/api-keys/integrations.ts:686` | 〃 |
| API 버전 | `API 버전` — `apps/admin/src/pages/settings/api-keys/integrations.ts:690` | `기존(dated) 엔드포인트를 쓸 때만 채워요. 예: 2024-06-01. v1 엔드포인트는 비워요.` — `apps/admin/src/pages/settings/api-keys/integrations.ts:692` | 선택이지만 **아무래도 좋은 칸이 아니다** — 이 칸의 유무가 어느 표면을 부를지를 가른다 |
| 리전 | `리전` — `apps/admin/src/pages/settings/api-keys/integrations.ts:727` | `예: us-east-1. 엔드포인트 주소에 들어가므로 키와 같은 리전이어야 해요.` — `apps/admin/src/pages/settings/api-keys/integrations.ts:729` | Amazon Bedrock |
| 고객코드 | `고객코드` — `apps/admin/src/pages/settings/api-keys/integrations.ts:789` | `기업고객 계약 후 발급되는 숫자 8자리예요(주관고객번호). CNPLUS 에서 조회해요.` — `apps/admin/src/pages/settings/api-keys/integrations.ts:792` | CJ대한통운 |
| 조직 ID | `조직 ID` — `apps/admin/src/pages/settings/api-keys/integrations.ts:495` | 헤더 이름과 접두어, 필요한 조건을 적는다 — `apps/admin/src/pages/settings/api-keys/integrations.ts:497` | OpenAI |
| 프로젝트 ID | `프로젝트 ID` — `apps/admin/src/pages/settings/api-keys/integrations.ts:501` | 〃 — `apps/admin/src/pages/settings/api-keys/integrations.ts:503` | 〃 |

**모델 id 를 카탈로그에 박지 않는다** — 기본 모델은 선택지가 아니라 **자유 입력**이다. 근거 셋: ① 목록이 우리 배포 주기보다 빨리 낡는다(문서화된 모델이 다음 달에 폐기되는 일이 실제로 있다) ② **표시명과 API 가 받는 id 가 다르다** — 표시명을 박으면 틀린 문자열을 카탈로그가 보증하게 되고 운영자는 우리가 확인했다고 믿는다 ③ **키마다 보이는 모델이 다르다** — 그래서 전역 카탈로그는 원리적으로 정확할 수 없다 — `apps/admin/src/pages/settings/api-keys/integrations.ts:186-208`. 그래서 힌트의 예시에는 **확인 날짜가 함께 적혀 있다**: 낡은 목록이라도 낡았다는 사실이 함께 적혀 있으면 거짓말이 아니고, 날짜가 없으면 '지금 유효한 목록'으로 읽힌다.

## 4. 기능 명세

### 4.1 연동 좁히기 — 주소창에서 온 값의 유일한 관문

| 항목 | 내용 |
|---|---|
| 기능 목적 | 주소의 연동 id 가 카탈로그의 7종 중 하나인지 판정한다 |
| 실행 조건 | 화면이 그려질 때마다 |
| 사용자 동작 | 없음(자동). 주소를 손으로 고쳤거나 카탈로그에서 빠진 연동의 옛 링크를 눌렀을 때 걸린다 |
| 시스템 처리 | 카탈로그에서 같은 id 를 찾는다 — 주소를 만드는 쪽은 카탈로그를 보지 않으므로(문자열을 잇기만 한다) **모르는 id 로도 라우트는 열리고**, 판정은 이 화면이 한다 — `apps/admin/src/pages/settings/api-keys/paths.ts:17-20` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 제목·폼·아래 카드들이 그려지고 **검증 스키마가 그 연동이 요구하는 칸에 매인다** — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:275-278` |
| 실패 처리 | 폼을 아예 그리지 않고 danger 배너로 말한다: `{주소에 적힌 값}은(는) 이 화면이 아는 연동이 아니에요.` + `연동 목록으로 돌아가기` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:469,471`. 위쪽 `목록으로` 링크도 그대로 남는다 |
| 예외 처리 | **조용한 404 를 만들지 않는다.** 빈 화면은 고장과 구분되지 않으므로, 없다는 **사실**과 돌아갈 **길**을 함께 준다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:456-462` |
| 화면 변경 사항 | 화면 전체 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

**문구가 'AI 프로바이더'가 아니게 됐다** — 배송 연동을 열려다 오타를 낸 운영자에게 'AI 프로바이더가 아닙니다'라고 답하면 그는 자기가 엉뚱한 화면에 왔다고 읽는다. 실제로는 화면이 맞고 id 만 틀렸다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:460-462`.

### 4.2 설정 조회

| 항목 | 내용 |
|---|---|
| 기능 목적 | 저장된 연동 문서 1건을 가져와 이 연동 자리를 폼에 채운다 |
| 실행 조건 | 화면 진입 시 자동. **목록과 같은 문서·같은 캐시 키**를 쓴다 — `apps/admin/src/pages/settings/api-keys/data-source.ts:37` |
| 사용자 동작 | 없음(자동). 실패 후 `다시 시도` |
| 시스템 처리 | 문서에 이 연동의 기록이 없으면 **빈 문서**를 기준선으로 세운다('아직 저장한 적 없음') — `apps/admin/src/pages/settings/api-keys/data-source.ts:126-136`. 다른 연동으로 이동하면 '변경 중' 상태를 들고 가지 않는다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:314-317` |
| 데이터 처리 | 없음(읽기만). **비밀 칸의 값은 오지 않는다** — 저장 여부만 온다 |
| API 호출 여부 | Y — 저장된 연동 문서 1건 조회(목록에서 넘어왔다면 30초 안에는 캐시가 답한다) |
| 성공 처리 | 카탈로그가 정한 칸이 그려지고 공개 칸에 저장된 값이 채워진다. **토스트를 띄우지 않는다** |
| 실패 처리 | 폼 대신 danger 배너 하나: `설정을 불러오지 못했어요.` + `다시 시도`. 아래 카드 셋(배송 정책 연결 · 계약 API · 연결 상태)도 그리지 않는다 |
| 예외 처리 | 재조회 중에는 이전 값을 유지한다 — 스켈레톤은 첫 조회에서만 |
| 화면 변경 사항 | 입력영역 · 버튼영역 · 아래 카드 셋 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

**재현 손잡이** — `?fail=load` · `?fail=api-keys:load` — `apps/admin/src/pages/settings/_shared/store.ts:53-58`.

### 4.3 비밀 칸의 세 상태

| 항목 | 내용 |
|---|---|
| 기능 목적 | 저장된 비밀을 화면에 되돌리지 않으면서도 '있는가 / 바꾸는가'를 다루게 한다 |
| 실행 조건 | 그 연동에 비밀 칸이 있을 때(7종 전부 `API 키` 를 요구한다) |
| 사용자 동작 | `변경` 클릭 → 새 값 입력 → (마음이 바뀌면) `취소` |
| 시스템 처리 | 세 상태를 가른다 — `apps/admin/src/pages/settings/api-keys/components/AiCredentialFields.tsx:14-22`: ① 저장된 적 없음 → 입력칸 ② 저장돼 있고 그대로 둠 → 고정 길이 글리프 + `변경`, **입력 요소를 렌더하지 않는다** ③ 변경 중 → 빈 입력칸 + `취소` |
| 데이터 처리 | '변경 중'은 **화면 상태이지 저장값이 아니다.** `취소` 는 입력하던 새 값을 비워 기존 값 유지로 되돌린다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:545-552` |
| Validation | 저장돼 있으면 비워 둬도 되므로 **필수 표식이 붙지 않는다** — `apps/admin/src/pages/settings/api-keys/components/AiCredentialFields.tsx:147` |
| API 호출 여부 | N(저장 시점에 함께 나간다) |
| 성공 처리 | 저장이 성공하면 새 기준선은 '저장됨 + 빈 입력'이다 — 평문이 화면에서 사라진다 |
| 실패 처리 | 저장 실패면 입력한 평문이 그대로 남는다(다시 시도할 수 있어야 한다) |
| 예외 처리 | 다른 연동으로 주소가 바뀌면 '변경 중'이 초기화된다 — 앞 화면의 상태를 들고 가지 않는다 |
| 화면 변경 사항 | 그 자격증명 칸 |
| 후속 동작 | 저장 |
| 로그 기록 여부 | N |

**저장된 값을 다시 요구하지 않는다** — 이미 저장돼 있으면 그 칸은 '채워진 것'으로 센다. 이 판정이 없으면 저장할 때마다 키를 새로 입력하라고 요구하게 되는데, 우리는 그 키를 돌려줄 수 없으므로 운영자는 **콘솔에서 키를 재발급받아야 한다** — `apps/admin/src/pages/settings/api-keys/validation.ts:115-128`.

### 4.4 켜고 끄기

| 항목 | 내용 |
|---|---|
| 기능 목적 | 이 연동을 쓸지 정한다 |
| 실행 조건 | 조회가 끝났고 수정 권한이 있을 때 |
| 사용자 동작 | 토글 클릭 |
| 시스템 처리 | 켜짐 값이 바뀌고 자격증명 칸의 **필수 표식이 함께 바뀐다** — 즉시 재검증된다 |
| 데이터 처리 | 켜짐/꺼짐 한 값. 저장해야 반영된다 |
| Validation | **켜려면 필수 칸이 다 와야 한다. 끄는 것은 언제나 허용한다** — 자격증명이 반쯤 채워져 있어도 끌 수 있다(§6) — `apps/admin/src/pages/settings/api-keys/validation.ts:36-40` |
| API 호출 여부 | N(저장 시점에 함께 나간다) |
| 성공 처리 | 토글 상태가 바뀌고 폼이 변경 상태가 된다 |
| 실패 처리 | 켜려는데 필수 칸이 비어 있으면 저장 단계에서 막히고 그 칸에 오류가 붙는다 |
| 예외 처리 | 끄더라도 **자격증명은 지워지지 않는다** — 토글 아래 설명이 그 사실을 말한다. 다시 켤 때 값을 다시 넣지 않아도 된다 |
| 화면 변경 사항 | 토글 · 입력영역(필수 표식) · 버튼영역 |
| 후속 동작 | 저장하면 목록의 상태와 AI 응답 모드 잠금이 함께 바뀐다 |
| 로그 기록 여부 | N |

### 4.5 저장 — 이 연동 자리만 쓴다

| 항목 | 내용 |
|---|---|
| 기능 목적 | 이 연동의 자격증명과 켜짐 여부를 저장한다 |
| 실행 조건 | 변경 사항이 있고, 저장 중이 아니며, 수정 권한이 있을 때 |
| 사용자 동작 | 저장 클릭 → 확인 다이얼로그에서 확인 또는 취소 |
| 시스템 처리 | 저장 페이로드를 **서버가 준 최신 문서**에서 만들고 이 연동 자리만 폼 값으로 갈아 끼운다 — `apps/admin/src/pages/settings/api-keys/data-source.ts:198-217`. 보이지도 않는 값을 조용히 쓰는 '저장'은 기능이 아니라 결함이다 |
| 데이터 처리 | 비밀 칸은 **이름만** 문서에 남고 평문은 버려진다. 새 값을 넣지 않았으면 기존 비밀이 유지된다. 공개 칸은 값이 그대로 담기되 **빈 문자열이면 키 자체를 넣지 않는다** — 빈 값을 저장해 두면 호출부가 그것을 보낼 값으로 읽고, 빈 헤더를 실제로 보내면 상대가 거절한다 — `apps/admin/src/pages/settings/api-keys/data-source.ts:141-153` |
| Validation | **이 연동이 요구하는 칸만** 검증한다 — 그리지 않는 칸까지 보면 고칠 입력칸이 없는 오류가 저장을 막는다(§6) |
| API 호출 여부 | Y — 연동 문서 저장(개정 토큰 동반) |
| 성공 처리 | 다이얼로그가 닫히고 폼이 저장된 문서로 다시 세워진다(평문 자리가 비워진다). 토스트 `MSG-SETTINGS-API-KEYS-DETAIL-01`: `{연동 이름} 연동을 저장했어요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:352` |
| 실패 처리 | 다이얼로그가 닫히지 않고 그 안 danger 배너: `연동을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:362` |
| 예외 처리 | 충돌 거절은 실패가 아니라 §4.6 으로 간다. 취소·Esc·딤은 진행 중 요청을 **중단**하고 실패로 치지 않는다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:387-394`. 빠른 더블 클릭의 두 번째는 동기 잠금이 막는다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:329` |
| 화면 변경 사항 | 확인 다이얼로그 · 카드 · 버튼영역 · 연결 상태 카드 |
| 후속 동작 | 목록의 상태·연동 시작일·탭 건수가 바뀐다. 모델 4종이면 AI 화면의 응답 모드 잠금도 함께 바뀐다 |
| 로그 기록 여부 | 확인하지 못했다 — 이 화면의 저장을 관리자 로그로 남기는 배선을 코드에서 찾지 못했다 |

**확인 문구는 세 갈래이고, '켜면 달라지는 것'을 항목에서 가져온다** — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:201-216`.

| 언제 | 본문 |
|---|---|
| 켜짐 → 꺼짐 | `{연동 이름} 연동을 꺼요. 자격증명은 지워지지 않고 남지만 이 연동은 쓰이지 않아요.{켜면 달라지는 것} 이 연동만 저장돼요. 저장할까요?` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:210` |
| 꺼짐 → 켜짐 | `{연동 이름} 연동을 켜요. 입력한 자격증명이 저장돼요.{켜면 달라지는 것} 이 연동만 저장돼요. 저장할까요?` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:213` |
| 그 밖 | `{연동 이름} 연동 설정을 저장해요. 다른 연동은 바뀌지 않아요. 저장할까요?` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:215` |

'켜면 달라지는 것'은 **항목이 말한다.** AI 6종에는 응답 모드 문장이 붙고(`켜 두는 동안 AI 화면이 이 연동을 응답에 써요` 로 시작한다 — `apps/admin/src/pages/settings/api-keys/integrations.ts:448-449`), CJ대한통운에는 **아무 문장도 붙지 않는다** — 이 연동을 부르는 곳이 아직 하나도 없어 켜도 앱에서 달라지는 것이 없기 때문이다. 문장을 화면에 하드코딩하면 항목이 늘 때마다 거짓말이 하나씩 는다 — `apps/admin/src/pages/settings/api-keys/integrations.ts:806-808`.

**연동 시작일은 프론트가 지어내지 않는다** — `disconnected → connected` 로 **처음 넘어간 순간**에만 찍히고, 해제 후 재연동해도 최초 값을 유지한다. 이 값은 픽스처 저장소(서버 자리)가 찍는 것이지 화면이 만드는 것이 아니다 — `apps/admin/src/pages/settings/api-keys/data-source.ts:219-250`.

**재현 손잡이** — `?fail=save` · `?fail=api-keys:save`.

### 4.6 저장 충돌 — 이 연동만 짚는다

| 항목 | 내용 |
|---|---|
| 기능 목적 | 다른 관리자가 먼저 저장했을 때 덮어쓰기 전에 사람이 고르게 한다 |
| 실행 조건 | 저장이 개정 토큰 불일치로 거절됐을 때 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:357-360` |
| 사용자 동작 | 최신 내용 불러오기 · 내 변경으로 덮어쓰기 · 닫기 |
| 시스템 처리 | 갈린 항목은 **이 연동 이름 한 줄**이다 — 이 화면이 쓰는 것이 이 연동뿐이기 때문이다. **비밀 칸은 값을 비교할 수 없으므로**(양쪽 다 값이 없다) '저장 여부'가 갈라졌는지만 본다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:423-443` |
| 데이터 처리 | 이 시점에는 아무것도 바뀌지 않는다 |
| Validation | 이미 통과한 상태다 |
| API 호출 여부 | 불러오기는 재조회 1건 · 덮어쓰기는 토큰 검사를 건너뛴 저장 1건 |
| 성공 처리 | 불러오기 → 폼이 최신 값으로 교체되고 '변경 중'이 초기화되며 토스트 `MSG-SETTINGS-API-KEYS-DETAIL-02`: `최신 연동 설정을 불러왔어요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:406`. 덮어쓰기 → `MSG-SETTINGS-API-KEYS-DETAIL-01` |
| 실패 처리 | 덮어쓰기 실패는 팝업 안 danger 배너(§4.5 와 같은 문구) |
| 예외 처리 | 닫기는 판단 보류다 — 입력이 남고 토스트도 배너도 없다. 덮어쓰기도 **서버 최신 문서 + 내 연동 값**으로 만들어 보내므로 다른 연동의 최신 변경은 살아남는다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:409-413` |
| 화면 변경 사항 | 팝업 · (불러오기 시) 입력영역 |
| 후속 동작 | 불러오기는 재조회를 함께 건다 |
| 로그 기록 여부 | 확인하지 못했다 |

**재현 손잡이** — `?fail=conflict` · `?fail=api-keys:conflict` — `apps/admin/src/pages/settings/_shared/store.ts:53-58`.

### 4.7 배송 정책 연결 — 정본은 배송 정책이고 이 카탈로그는 참조다

| 항목 | 내용 |
|---|---|
| 기능 목적 | 이 연동이 가리키는 택배사가 **배송 정책에 등록돼 있고 켜져 있는가**를 말한다 |
| 실행 조건 | 조회가 끝났고 그 항목에 택배사 코드가 있을 때 — 지금은 CJ대한통운 하나다 |
| 사용자 동작 | 없음(자동). 어긋났을 때 배송 정책 링크를 누른다 |
| 시스템 처리 | **택배사를 여기서 정의하지 않는다.** 카탈로그가 든 것은 코드 하나(`CJGLS`)이고, 그 코드로 원장에게 묻는 일은 공통 층이 한다 — 페이지끼리는 서로를 모른다 — `apps/admin/src/shared/domain/carrier-integration.ts:19-23`. 대조 키는 코드이고 이름으로 맞추지 않는다(이름은 사람이 읽는 표기라 언제든 바뀐다) |
| 데이터 처리 | 없음(읽기만). 이 카드는 아무것도 저장하지 않는다 |
| Validation | 코드의 대소문자와 앞뒤 공백만 무시하고 대조한다. 그 밖의 표기 차이는 맞추지 않는다 — `apps/admin/src/shared/domain/carrier-integration.ts:60-63` |
| API 호출 여부 | N — 배송 정책의 택배사 목록을 앱 안에서 읽는다. 조회기가 배선되지 않았으면 읽을 값이 없다 |
| 성공 처리 | 등록 상태 배지와 한 줄 설명이 그려진다. 어긋난 두 경우에만 그 아래 경고가 붙는다 |
| 실패 처리 | 목록을 읽지 못하면 `확인하지 못함` 이다 — **`등록되지 않음` 으로 뭉개지 않는다** |
| 예외 처리 | 이 화면에는 택배사를 등록·수정하는 수단이 없다 — 그 일은 배송 정책 화면의 것이다 |
| 화면 변경 사항 | 배송 정책 연결 카드 |
| 후속 동작 | 배송 정책에서 코드를 맞춰 등록하고 사용을 켜면 이 카드가 `사용 중` 으로 바뀐다 |
| 로그 기록 여부 | N |

**판정은 네 갈래다** — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:95-119`.

| 판정 | 배지 | 화면 문장 | 경고 배너 |
|---|---|---|---|
| **모른다**(`null`) — 조회기가 배선되지 않았거나 목록을 읽지 못했다 | `확인하지 못함` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:97` | `배송 정책의 택배사 목록을 읽지 못했어요. 등록돼 있을 수도 있어요.` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:99` | **뜨지 않는다** |
| `missing` — 그 코드를 쓰는 택배사가 정책에 없다 | `등록되지 않음` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:104` | `이 코드를 쓰는 택배사가 배송 정책에 없어요.` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:105` | 뜬다 |
| `inactive` — 등록돼 있으나 꺼져 있다 | `사용 꺼짐` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:109` | `등록돼 있지만 새 송장의 선택지에서 빠져 있어요.` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:111` + 정책이 가진 택배사 이름 | 뜬다 |
| `active` — 등록돼 있고 켜져 있다 | `사용 중` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:115` | `배송 정책에 등록돼 있고 송장에서 고를 수 있어요.` — `apps/admin/src/pages/settings/api-keys/components/CarrierPolicyCard.tsx:117` + 이름 | 뜨지 않는다 |

**`null` 을 `missing` 으로 뭉개지 않는 이유** — 뭉개면 화면이 '운영자가 할 일이 있다'고 말한다(배송 정책에 가서 등록하세요). 그런데 실제로는 **이미 등록돼 있는데 우리가 못 읽었을 수도** 있고, 그러면 운영자는 하지 않아도 될 일을 하러 간다 — `apps/admin/src/shared/domain/carrier-integration.ts:31-34`. 같은 이유로 `확인하지 못함` 일 때는 '무엇을 하라'는 경고 배너를 띄우지 않는다 — 할 일이 있는지조차 아직 모르기 때문이다.

**`inactive` 를 `active` 와 뭉개지 않는 이유** — 꺼진 택배사는 새 송장의 선택지에서 빠진다. 자격증명이 저장돼 있어도 그 택배사로는 아무것도 나가지 않으므로, 연동만 보고 '된다'고 읽으면 안 된다 — `apps/admin/src/shared/domain/carrier-integration.ts:41-45`.

### 4.8 계약하면 열리는 API 묶음

| 항목 | 내용 |
|---|---|
| 기능 목적 | 이 연동을 계약하면 **무엇을 할 수 있게 되는지** 보여 준다 — 자격증명 칸만 봐서는 알 수 없다 |
| 실행 조건 | 조회가 끝났고 그 항목에 묶음이 있을 때 — 지금은 CJ대한통운 하나다 |
| 사용자 동작 | 읽는다. 누를 것이 없다 |
| 시스템 처리 | 이름과 목록을 **넘겨받은 표기 그대로** 그린다(괄호 안의 구분 포함) — 우리가 다듬으면 운영자가 포털에서 같은 이름을 찾지 못한다 — `apps/admin/src/pages/settings/api-keys/components/ApiPackageCard.tsx:19-20` |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | **N — 이 화면은 이 중 어느 것도 부르지 않는다.** 그래서 API 마다 버튼도, 상태 배지도, 마지막 호출 시각도 두지 않았다. 그런 것을 붙이면 목록이 '동작하는 것들'로 읽히는데 이 앱에는 이 API 를 부르는 코드가 한 줄도 없다 — `apps/admin/src/pages/settings/api-keys/components/ApiPackageCard.tsx:9-17` |
| 성공 처리 | 묶음 이름 + 개수 + 목록 + 부르지 않는다는 고지가 그려진다 |
| 실패 처리 | 실패할 것이 없다 — 카탈로그가 든 정적 목록이다 |
| 예외 처리 | 묶음이 없는 연동에는 이 카드가 아예 붙지 않는다 — 확보하지 못한 목록을 지어내지 않는다 |
| 화면 변경 사항 | 계약 API 카드 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

**CJ대한통운의 묶음 — `(일반)택배 운영 API` 7종** — `apps/admin/src/pages/settings/api-keys/integrations.ts:813-825`.

| # | 표기 그대로 | 출처 |
|---|---|---|
| 1 | `(공통) 상품 추적(운송장 번호 기준)` | `apps/admin/src/pages/settings/api-keys/integrations.ts:817` |
| 2 | `(공통) 운송장 번호 생성` | `apps/admin/src/pages/settings/api-keys/integrations.ts:818` |
| 3 | `(공통) 주소 정제` | `apps/admin/src/pages/settings/api-keys/integrations.ts:819` |
| 4 | `(일반) 상품 추적(예약 정보 기준)` | `apps/admin/src/pages/settings/api-keys/integrations.ts:820` |
| 5 | `(일반) 상품 추적(예약 정보 기준) 수신 여부 확정` | `apps/admin/src/pages/settings/api-keys/integrations.ts:821` |
| 6 | `(일반) 예약 접수` | `apps/admin/src/pages/settings/api-keys/integrations.ts:822` |
| 7 | `(일반) 예약 취소` | `apps/admin/src/pages/settings/api-keys/integrations.ts:823` |

**확인하지 못한 것은 칸으로 만들지 않았고, 그 사실을 화면이 말한다** — CJ대한통운 오픈API 포털이 해시 라우트로 도는 단일 페이지 앱이라 문서 본문이 서버에서 오지 않는다. 그래서 **인증키를 어느 헤더로 보내는지 · 테스트 환경이 따로 있는지 · 우리 쪽 수신 주소를 등록해야 하는지가 [미확인]** 이다. 추측한 헤더 이름을 적으면 운영자는 그것이 확인된 사실이라고 믿는다 — 그래서 적지 않았고, 대신 주의 안내가 그 사실을 그대로 말한다 — `apps/admin/src/pages/settings/api-keys/integrations.ts:765-784,795-796`. 재판매 솔루션이 함께 요구하는 가맹점코드·협력사코드도 오픈API 가 요구하는지 확인되지 않아 칸을 두지 않았다.

### 4.9 연결 상태 — '채워짐'과 '검증됨'을 가른다

| 항목 | 내용 |
|---|---|
| 기능 목적 | 우리가 아는 사실(자격증명이 저장돼 있다)과 모르는 사실(그 키가 실제로 통한다)을 **한 값으로 뭉치지 않는다** |
| 실행 조건 | 조회가 끝났을 때 항상 |
| 사용자 동작 | 없음 — **누를 것이 없다. 연결 테스트 버튼이 존재하지 않는다** |
| 시스템 처리 | 자격증명 줄은 **저장된 문서**를 보고 판정한다(입력 중인 값이 아니다) — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:479-483`. 연결 검증 줄은 저장 문서의 검증 시각을 그리는데, **그 값은 언제나 비어 있어 `-` 가 나온다** |
| 데이터 처리 | 없음(읽기만). 저장소는 검증 시각을 **절대 채우지 않는다** — `apps/admin/src/pages/settings/api-keys/data-source.ts:8-11` |
| Validation | 해당 없음 |
| API 호출 여부 | **N — 그리고 이것이 이 화면의 판단이다.** 연결 검증은 서버가 상대를 실제로 한 번 불러 봐야 성립한다. 브라우저에서 부르면 **키가 브라우저로 내려와야 하고, 그 순간 '평문을 저장하지 않는다'가 거짓이 된다.** 제공자 공식 문서도 같은 말을 한다 — 키를 브라우저 같은 클라이언트 코드에 노출하지 말고 자체 백엔드를 거치라고 적고, 공식 SDK 는 브라우저 사용을 기본 차단한 뒤 그것을 켜는 옵션 이름에 '위험하게'라는 낱말을 붙여 두었다(`dangerouslyAllowBrowser`). 그래서 이 화면은 검증 결과를 지어내지 않고 `확인한 적 없음` 으로 둔다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:606-619` · `apps/admin/src/pages/settings/api-keys/ai-connections.ts:184-191`. 서버가 부를 검증 경로의 계약은 이미 적혀 있으나 이 화면은 부르지 않는다 — `apps/admin/src/pages/settings/api-keys/data-source.ts:63-86` |
| 성공 처리 | 두 줄(자격증명 · 연결 검증)과 안내 문단이 그려진다 |
| 실패 처리 | 실패할 것이 없다 — 서버를 부르지 않는다 |
| 예외 처리 | **없는 버튼을 그리지 않는다.** 눌러서 아무 일도 없거나 성공을 지어내는 것보다, 없는 이유를 적는 편이 정직하다 |
| 화면 변경 사항 | 연결 상태 카드 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

**두 사실을 뭉치면 무엇이 숨는가** — 배포명 오타 같은 고장이 `연동 완료` 배지 뒤에 숨는다. 우리가 아는 것은 **우리 쪽 사실**뿐이고, 그 키가 실제로 통하는지는 **상대 쪽 사실**이다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:574-577`.

### 4.10 사용량·요금·한도를 이 화면에 두지 않는다

| 항목 | 내용 |
|---|---|
| 기능 목적 | 숫자를 들이지 않고 **갈 곳만** 가리킨다 |
| 실행 조건 | 연결 상태 카드가 그려질 때 항상 |
| 사용자 동작 | 링크가 있으면 클릭(새 창) |
| 시스템 처리 | 항목이 든 한도 안내 주소로 링크를 만든다. **주소를 확인하지 못한 항목은 링크를 지어내지 않는다** |
| 데이터 처리 | 없음 |
| Validation | 해당 없음 |
| API 호출 여부 | N — 사용량을 조회하지 않는다 |
| 성공 처리 | 링크가 있으면 `{연동 이름} 한도 안내 열기` 가 새 창으로 열린다 |
| 실패 처리 | 링크가 없으면 그 자리에 `이 연동은 한도 안내 주소를 확인하지 못해 링크를 걸지 않았어요.` 한 줄이 온다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:630` |
| 예외 처리 | 해당 없음 |
| 화면 변경 사항 | 연결 상태 카드 |
| 후속 동작 | 없음 |
| 로그 기록 여부 | N |

**왜 값이 아니라 링크인가** — 조회 수단이 **연동마다 고르지 않다.** 프로그램으로 읽을 수 있는 곳도 있고 콘솔 화면뿐인 곳도 있으며, 결정적으로 어떤 곳은 사용량이 일반 API 키로 읽히지 않고 **더 강한 admin 키**를 따로 요구한다. 그것은 이 화면이 **비밀을 하나 더 받아야 한다**는 뜻이고, '받는 비밀을 늘리지 않는다'는 이 섹션의 규약과 정면으로 부딪친다. 일곱 중 넷만 숫자를 보여 주는 화면은 '왜 여기는 안 나오지'를 만든다 — `apps/admin/src/pages/settings/api-keys/integrations.ts:310-325`. 한도 주소는 4종이 갖고 있고 3종(Azure OpenAI · Amazon Bedrock · CJ대한통운)은 단일 주소가 없거나 확인하지 못해 `null` 이다.

### 4.11 목록으로 돌아가기 · 미저장 이탈

| 항목 | 내용 |
|---|---|
| 기능 목적 | 목록으로 돌아가되, 입력한 자격증명이 조용히 사라지지 않게 한다 |
| 실행 조건 | 항상(가드는 변경 상태일 때만) |
| 사용자 동작 | `목록으로` 클릭 · 앱 안 링크 · 뒤로/앞으로 · 탭 닫기·새로고침 |
| 시스템 처리 | `목록으로` 는 **버튼이 아니라 링크**다 — 이탈 가드가 앵커 클릭을 가로챈다. 프로그램 이동으로 만들면 가드를 그냥 지나쳐 입력이 사라진다 — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:45-47` |
| 데이터 처리 | 확인하면 입력이 버려진다 |
| Validation | 해당 없음 |
| API 호출 여부 | N |
| 성공 처리 | 목록으로 이동한다. 토스트를 띄우지 않는다 |
| 실패 처리 | 실패할 것이 없다 |
| 예외 처리 | 저장 중에는 가드하지 않는다(곧 변경 없음 상태가 된다). 이 화면의 이탈 문구는 `{연동 이름} 연동에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:510`. 상세 규칙은 [공통 문서](../../_common/index.md) `DLG-COMMON-LEAVE-FORM` |
| 화면 변경 사항 | 다이얼로그만 |
| 후속 동작 | 이동 또는 머무름 |
| 로그 기록 여부 | N |

## 5. 이벤트 정의

| 이벤트 | 발생 조건 | 처리 내용 | 대상 컴포넌트 | 결과 화면 |
|---|---|---|---|---|
| 화면 진입 | `/settings/api-keys/{연동 id}` 도달 | 연동 좁히기 → 설정 조회 | 화면 전체 | 스켈레톤 → 폼 |
| 알 수 없는 연동 | 좁히기 실패 | 폼을 그리지 않고 danger 배너 + 목록 링크 | 오류영역 | '아는 연동이 아니다' 화면 |
| 조회 성공 | 문서 도착 | 폼을 채우고 '변경 중'을 초기화한다 | 입력영역 | 값이 채워진 폼 |
| 조회 실패 | 조회 오류 | 폼 대신 danger 배너 + `다시 시도`. 아래 카드 셋도 그리지 않는다 | 오류영역 | 배너만 있는 화면 |
| 다른 연동으로 이동 | 주소의 id 변경 | '변경 중'을 초기화하고 검증 스키마를 새 연동에 맨다 | 화면 전체 | 새 연동 폼 |
| 사용 토글 변경 | 토글 클릭 | 켜짐이 바뀌고 필수 표식이 함께 바뀐다 | 토글 · 입력영역 | 필수 표식 갱신 |
| 자격증명 입력 | 타이핑 | 변경 상태가 켜지고 형식 경고가 즉시 재판정된다 | 입력영역 | 경고 표시/해제 |
| 비밀 `변경` 클릭 | 저장된 비밀이 있을 때 | 마스크를 걷고 빈 입력칸을 연다 | 그 칸 | 입력칸 + `취소` |
| 비밀 `취소` 클릭 | 변경 중일 때 | 입력하던 새 값을 비우고 마스크로 되돌린다 | 그 칸 | 글리프 + `변경` |
| 저장 클릭 | 변경 사항이 있을 때 | 이 연동이 요구하는 칸만 검증 → 통과하면 확인 다이얼로그 | 저장 버튼 | 확인 다이얼로그 |
| 검증 실패 | 규칙 위반 | 다이얼로그를 띄우지 않고 첫 위반 필드로 포커스를 옮긴다 | 해당 입력 | 인라인 오류 |
| 확인 클릭 | 확인 다이얼로그에서 | 서버 최신 문서 + 이 연동 값으로 저장 1건 | 확인 다이얼로그 | 성공=닫힘+토스트 · 실패=배너 |
| 취소·Esc·딤 | 확인 다이얼로그에서 | 진행 중 저장을 중단하고 닫는다 | 확인 다이얼로그 | 폼(입력 유지) |
| 저장 충돌 | 개정 토큰 불일치 | 확인 다이얼로그를 닫고 충돌 팝업을 세운다 | 충돌 팝업 | 팝업 |
| 최신 내용 불러오기 | 충돌 팝업에서 | 폼 교체 → '변경 중' 초기화 → 재조회 → 토스트 | 입력영역 | 최신 값 |
| 내 변경으로 덮어쓰기 | 충돌 팝업에서 | 토큰 검사를 건너뛴 저장 1건 | 충돌 팝업 | 성공=닫힘 · 실패=배너 |
| 저장 성공 | 저장 완료 | 평문 입력칸이 비워지고 마스크로 돌아간다. 이탈 가드가 내려간다 | 입력영역 · 버튼영역 · 연결 상태 카드 | `변경 사항이 없어요.` |
| 배송 정책 링크 클릭 | 어긋남 경고 안에서 | 배송 정책 화면으로 이동한다(변경 상태면 가드를 먼저 거친다) | 배송 정책 연결 카드 | `SCR-PRODUCTS-SHIPPING` |
| 한도 안내 클릭 | 주소가 있을 때 | 1차 문서를 **새 창**으로 연다 | 연결 상태 카드 | 새 창 |
| `목록으로` 클릭 | 링크 클릭 | 변경 상태면 가드, 아니면 목록으로 | Navigation | 목록 또는 가드 |
| 미저장 이탈 시도 | 변경 상태에서 화면을 떠남 | `DLG-COMMON-LEAVE-FORM` | 폼 전체 | 확인=이동 · 취소=머무름 |

## 6. Validation

**꺼진 연동의 필수 칸은 검증하지 않는다** — 쓰지 않을 값을 채우라고 요구하지 않는다. 반대로 켜서 저장하려면 필수 칸이 다 와야 한다: 켜기와 자격증명을 분리해 받으면 '켰는데 안 된다'가 생긴다 — `apps/admin/src/pages/settings/api-keys/validation.ts:36-40`.

### 6.1 막는 것 — 둘뿐이다

| 대상 항목 | 검증 조건 | 검증 시점 | 오류 메시지 | 처리 방식 |
|---|---|---|---|---|
| 그리는 모든 칸 | 500자 이하 | 제출 시 | `{칸 이름}는 500자를 넘을 수 없어요.` — `apps/admin/src/pages/settings/api-keys/validation.ts:154` | 저장 차단 · 첫 위반 필드로 포커스. **켜짐과 무관하게 본다** — 꺼진 채로도 저장되는 값이라 폭주를 그대로 두면 안 된다 |
| 비밀 칸(필수) | 켜져 있으면 저장된 값도, 새로 넣은 값도 없으면 안 된다 | 제출 시 | `연동을 켜려면 {칸 이름}를 입력해야 해요.` — `apps/admin/src/pages/settings/api-keys/validation.ts:165` | 〃 |
| 공개 칸(필수) | 켜져 있으면 비어 있으면 안 된다 | 제출 시 | `연동을 켜려면 {칸 이름}를 입력하세요.` — `apps/admin/src/pages/settings/api-keys/validation.ts:166` | 〃 |

**길이 상한은 형식 판정이 아니다** — 이 숫자의 근거는 '어떤 제공자도 이보다 긴 키를 쓰지 않는다'가 아니라 **붙여넣기 사고로 문서 한 편이 들어오는 것을 막는다** 이다 — `apps/admin/src/pages/settings/api-keys/validation.ts:46-52`.

**길이·문자셋·접두어를 검사하지 않는다** — 키가 특정 접두어로 시작한다는 것은 관찰이지 규약이 아니고, 제공자가 형식을 바꾸는 날 멀쩡한 값이 거절된다. 카탈로그 전 항목에 그 위험이 있고 우리는 그중 어느 형식도 문서로 보장받지 못했다 — `apps/admin/src/pages/settings/api-keys/validation.ts:22-34`.

**그리는 칸만 검증한다** — 폼은 열두 칸을 담지만 화면에 보이는 것은 카탈로그가 요구한 칸뿐이다. 보이지 않는 칸까지 검증하면 **고칠 입력칸이 없는 오류**가 저장을 막는다 — 그것이 '저장을 눌렀는데 아무 일도 안 난다'의 정체다 — `apps/admin/src/pages/settings/api-keys/validation.ts:174-192`.

### 6.2 경고 — 저장을 막지 않는다

| 대상 항목 | 조건 | 문구 | 왜 막지 않는가 |
|---|---|---|---|
| 리소스 엔드포인트 | `https://` 로 시작하지 않는다 | `엔드포인트는 보통 https:// 로 시작해요. 주소를 다시 확인해 보세요.` — `apps/admin/src/pages/settings/api-keys/validation.ts:209` | 사설 엔드포인트·프록시·국가 클라우드를 쓰는 조직이 실재한다 — 막으면 실재하는 구성이 거절된다 |
| 리소스 엔드포인트 | 배포 경로까지 붙어 있다 | `배포 경로까지 붙어 있어요. 리소스 주소(https://내리소스이름.openai.azure.com)까지만 넣고 배포명은 아래 칸에 넣으세요.` — `apps/admin/src/pages/settings/api-keys/validation.ts:212` | 〃 |
| 베이스 URL | `http://` 로 시작한다 | `평문(http) 주소예요. 사내 프록시가 아니라면 https 주소인지 다시 확인해 보세요.` — `apps/admin/src/pages/settings/api-keys/validation.ts:236` | 사내 프록시가 평문으로만 열려 있는 구성이 실재한다 — 다만 키가 평문으로 나가므로 한 번 되묻는다 |
| 베이스 URL | 어느 스킴으로도 시작하지 않는다 | `베이스 URL 은 보통 https:// 로 시작해요. 주소를 다시 확인해 보세요.` — `apps/admin/src/pages/settings/api-keys/validation.ts:239` | **경로는 되묻지 않는다** — 이 칸에 들어오는 정상값이 실제로 경로를 갖는다 |
| 기본 모델 | 주소를 붙여 넣었다 | `모델 id 가 아닌 것 같아요 — 주소는 위 베이스 URL 칸에 넣어요. 그대로 저장할 수는 있어요.` — `apps/admin/src/pages/settings/api-keys/validation.ts:264` | 접두어 정규식을 박으면 실재하는 id 가 거절된다(§3.2) |
| 기본 모델 | 값에 공백이 있다(표시명을 붙여 넣었다) | `모델 id 가 아닌 것 같아요 — 표시명이 아니라 API 가 받는 id 를 넣으세요` 로 시작하고 예를 든다 — `apps/admin/src/pages/settings/api-keys/validation.ts:267` | 〃 |
| 리전 | 리전 코드 모양이 아니다 | `리전 코드 형태가 아니에요(예: us-east-1). 엔드포인트 주소에 그대로 들어가는 값이에요.` — `apps/admin/src/pages/settings/api-keys/validation.ts:285` | 리전 목록은 계속 늘어난다 — 코드에 박으면 새 리전이 열리는 날 멀쩡한 값이 거절된다 |
| 고객코드 | 숫자 8자리가 아니다 | `고객코드는 보통 숫자 8자리예요(주관고객번호). 값을 다시 확인해 보세요.` — `apps/admin/src/pages/settings/api-keys/validation.ts:307` | 자릿수의 근거가 **재판매 솔루션의 안내**이지 CJ 의 1차 문서가 아니다 — 계약 형태에 따라 다를 수 있다 |

**경고와 오류가 함께 걸리면 오류가 이긴다** — 그 칸에 오류가 있으면 경고를 그리지 않는다 — `apps/admin/src/pages/settings/api-keys/components/AiCredentialFields.tsx:214`. 마스크가 보이는 칸에는 경고를 판정하지 않는다(볼 값이 없다).

## 7. 예외 처리

| 발생 상황 | 사용자 메시지 | 시스템 처리 | 복구 방법 |
|---|---|---|---|
| 조회 결과 없음 | 주소의 연동을 모를 때: `{주소에 적힌 값}은(는) 이 화면이 아는 연동이 아니에요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:469`. 아는 연동인데 저장 기록이 없는 것은 '없음'이 아니라 **'아직 저장한 적 없음'** 이고 빈 폼으로 그린다 | 전자는 폼을 아예 그리지 않고 돌아갈 길을 준다 · 후자는 정상 상태다 | `연동 목록으로 돌아가기` |
| 저장 실패 | `연동을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:362` | 확인 다이얼로그를 닫지 않고 그 안 danger 배너. 입력한 평문도 그대로 남는다 | 확인 재클릭이 곧 재시도 |
| 수정 실패 | 저장 실패와 같다 — 이 화면은 등록과 수정을 구분하지 않는다(연동 자리는 늘 하나다) | 〃 | 〃 |
| 삭제 실패 | 해당 없음 — 연동을 지우는 개념이 없다. 쓰지 않으면 끄는 것이고, 꺼도 자격증명은 남는다 | — | — |
| API 오류 | 위 저장 실패 문구. 조회 오류면 `설정을 불러오지 못했어요.` — `apps/admin/src/pages/settings/_shared/SettingsFormShell.tsx:132` | 서버 응답 원문·상태 코드를 문장으로 노출하지 않는다 | 재시도 |
| 서버 오류 | 위와 같다 — 5xx 에 별도 문구가 없다 | 〃 | 〃 |
| 네트워크 오류 | 위와 같다 | **자동 재시도를 하지 않는다** — `apps/admin/src/shared/query/queryClient.ts:82,108` | `다시 시도` 또는 확인 재클릭 |
| 권한 없음 | 조회 권한이 없으면 `접근 권한이 없어요` 화면 — `apps/admin/src/shared/errors/ErrorScreens.tsx:73`. 수정 권한만 없으면 `조회 권한만 있어요. 연동을 바꾸려면 시스템 설정 수정 권한이 필요해요.` — `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:97` | 저장 버튼을 **렌더하지 않고** 토글·입력·`변경`을 잠근다. 값은 그대로 읽힌다(저장된 비밀은 글리프뿐이라 읽어도 새는 것이 없다) | 관리자에게 권한 요청 |
| 세션 만료 | 이 화면에 자기 문구가 없다. 401 이면 앱이 로그인 화면으로 보낸다 | 세션을 지우고 원래 경로를 보존해 이동한다. **입력한 평문 자격증명은 사라진다** | 재로그인 후 다시 입력 |
| 데이터 충돌 | `POP-COMMON-SETTINGS-CONFLICT` — 설정 이름 `{연동 이름} 연동`. 갈린 항목은 이 연동 이름 한 줄이다 | 덮어쓰지 않는다. 덮어쓰기를 골라도 **다른 연동의 최신 변경은 살아남는다** | 불러오기 · 덮어쓰기 · 닫고 판단 보류 |
| 중복 데이터 | 해당 없음 — 한 연동은 문서에 한 번만 실린다. 저장은 그 자리를 치환하거나(있으면) 새로 붙인다(없으면) — `apps/admin/src/pages/settings/api-keys/data-source.ts:208-216` | — | — |
| 파일 업로드 실패 | 해당 없음 — 이 화면에 파일 입력이 없다. 자격증명은 전부 텍스트 칸이다 | — | — |

**⚠ 지금 확인되는 격차 넷**

| 무엇 | 사실 | 근거 |
|---|---|---|
| **파일·심볼 이름이 사실과 어긋난다** | 이 화면은 배송 연동도 그리는데 구현 이름은 `AiConnectionPage` · `aiConnectionsStore` · `AI_CREDENTIAL_FIELDS` · `aiConnectionPath` 로 `Ai` 접두를 유지한다. 화면 문구에서는 AI 전제가 사라졌으나 **이름은 그대로**다. 이 폴더 밖(`apps/admin/src/wiring.ts`)이 그 이름들을 import 하고 있어 개명이 이 폴더 안에서 끝나지 않는다. 라우트 선언 옆 주석도 아직 이 화면을 'AI 프로바이더 자격증명 상세'라고 부른다 | `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:4-16` · `apps/admin/src/pages/settings/api-keys/integrations.ts:8-9` · `apps/admin/src/App.tsx:205-207` |
| **연결 검증이 없다** | 자격증명이 실제로 통하는지 확인할 수단이 화면에 없다. 검증 시각은 언제나 비어 있고 버튼도 두지 않았다(§4.9) | `apps/admin/src/pages/settings/api-keys/ai-connections.ts:184-191` |
| **CJ대한통운의 인증 방식 일부가 [미확인]** | 인증키를 어느 헤더로 보내는지, 테스트 환경이 따로 있는지, 우리 쪽 수신 주소를 등록해야 하는지를 공개 문서에서 확인하지 못했다(포털이 해시 라우트라 문서 본문을 읽을 수 없다). 화면이 그 사실을 말한다 | `apps/admin/src/pages/settings/api-keys/integrations.ts:770-778` |
| **배송 정책 조회기가 배선되지 않으면 등록 상태를 알 수 없다** | 그때 카드는 `확인하지 못함` 을 그리고 경고를 띄우지 않는다(§4.7). 이것은 고장이 아니라 **모른다는 사실의 표시**다 | `apps/admin/src/shared/domain/carrier-integration.ts:31-34` |

## 8. 화면 상태(State)

| 상태 | 화면 표시 | 버튼 활성화 여부 | Loading 여부 | 사용자 안내 메시지 |
|---|---|---|---|---|
| 최초 로딩 | 제목은 즉시 그려지고 카드 본문이 스켈레톤 4줄. 아래 카드 셋은 아직 없다 | 저장 × | Y | 없음 |
| 데이터 있음(꺼짐) | 토글이 꺼진 채 자격증명 칸이 보인다. **필수 표식이 붙지 않는다** | 저장 ×(변경 없음) | N | `변경 사항이 없어요.` |
| 데이터 있음(켜짐) | 필수 칸에 표식이 붙는다 | 저장 × | N | 〃 |
| 데이터 없음 | **성립하지 않는다** — 아는 연동이면 빈 문서를 기준선으로 그리고, 모르는 id 면 아래 '알 수 없는 연동'이다 | — | N | — |
| 알 수 없는 연동 | 폼 없이 danger 배너 + 목록 링크. 아래 카드 셋도 없다 | 목록 링크 ○ | N | `{주소에 적힌 값}은(는) 이 화면이 아는 연동이 아니에요.` |
| 값을 모름(조회 실패) | 폼을 그리지 않고 배너 하나만. 아래 카드 셋도 그리지 않는다 | 다시 시도 ○ | N | `설정을 불러오지 못했어요.` |
| 재조회 중(값이 이미 있음) | 이전 값을 유지한다 | 그대로 | N | 없음 |
| 비밀 저장됨 | 고정 길이 글리프 + `변경`. **입력 요소가 DOM 에 없다** | 변경 ○ | N | `저장돼 있어요. 값은 다시 표시할 수 없어요 — 바꾸려면 연동 상대의 콘솔에서 새로 발급해 넣으세요.` |
| 비밀 변경 중 | 빈 입력칸 + `취소` | 취소 ○ | N | placeholder `비워 두면 저장된 키를 그대로 써요` |
| 비밀 미저장 | 빈 입력칸(취소 버튼 없음) | — | N | 그 칸의 항목별 힌트 |
| 형식 경고 | 그 칸 아래 회색 한 줄 | 저장 ○(막지 않는다) | N | §6.2 의 문구 |
| 변경 있음 | 저장 버튼이 살아난다 | 저장 ○ | N | `저장하지 않은 변경 사항이 있어요.` |
| 저장 중 | 모든 입력이 잠기고 버튼 라벨이 `저장 중…` | 저장 × | Y | `저장하는 중이에요…` |
| 저장 확인 중 | 확인 다이얼로그가 뜬다 | 확인 ○ · 취소 ○ | N | §4.5 의 세 문구 중 하나 |
| 저장 실패 | 다이얼로그 안(닫혀 있으면 카드 위) danger 배너 | 확인 ○ | N | `연동을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.` |
| 저장 충돌 | 충돌 팝업. 폼은 그대로 | 불러오기 ○ · 덮어쓰기 ○ | N | [공유 문서](../../_common/pop-settings-conflict.md) |
| 읽기 전용(권한) | 저장 버튼·상태 문구가 사라지고 토글·입력·`변경`이 잠긴다 | 저장 컨트롤 없음 | N | `조회 권한만 있어요. 연동을 바꾸려면 시스템 설정 수정 권한이 필요해요.` |
| 배송 정책을 모름 | 배송 정책 연결 카드가 `확인하지 못함` 을 그리고 **경고를 띄우지 않는다** | — | N | `배송 정책의 택배사 목록을 읽지 못했어요. 등록돼 있을 수도 있어요.` |
| 연결 검증 | **언제나 `확인한 적 없음` · 값 `-`** | 검증 버튼 없음 | N | §4.9 의 안내 문단 |

**`null`(모름)과 빈 값·0 을 가르는 자리** — 이 화면에서 가장 중요한 구분이다.

| 값 | 화면이 아는 것 | 그리는 것 |
|---|---|---|
| 저장된 비밀 | **저장 여부만** 안다. 값은 **우리도 모른다** | `••••••••••••` — 자릿수도 마지막 4자도 없다 |
| 새로 넣을 비밀이 빈 문자열 | '바꾸지 않는다'는 **사실**이다(모름이 아니다) | 저장돼 있으면 placeholder `비워 두면 저장된 키를 그대로 써요` |
| 공개 칸이 빈 문자열 | 조회가 돌려준 값이다 — 저장에서는 '없음'으로 수렴한다 | 빈 입력칸. 켜져 있고 필수면 오류가 걸린다 |
| 마지막 검증 시각 | **없다.** 검증한 적이 한 번도 없고 채워질 경로도 없다 | 배지 `확인한 적 없음` + 값 `-` |
| 연동 시작일 | 한 번도 연결된 적 없으면 없다 | 목록에서 `-` (이 화면에는 칸이 없다) |
| 배송 정책의 등록 여부 | **읽지 못하면 모른다** — `등록되지 않음` 과 다른 값이다 | `확인하지 못함` + 경고 없음 |
| 감사 정보(마지막 변경) | 없으면 그 줄을 그리지 않는다 | — |

## 9. 권한

| 권한 | 조회 | 등록 | 수정 | 삭제 | 다운로드 | 업로드 | 승인 | 반려 |
|---|---|---|---|---|---|---|---|---|
| 슈퍼어드민(전체권한) | ○ | — | ○ | — | — | — | — | — |
| 운영자 | 역할의 `page:/settings/api-keys` 리소스 권한을 따른다 | — | 〃 | — | — | — | — | — |
| 뷰어 | ○ | — | × | — | — | — | — | — |
| 권한 없음 | × | — | × | — | — | — | — | — |

등록·삭제·다운로드·업로드·승인·반려는 이 화면에 존재하지 않는 동작이다. 연동은 고정 7종이라 만들거나 지우는 개념이 없고, 저장된 비밀은 **다운로드할 수단이 없다** — 우리도 값을 모른다.

**권한이 없을 때 화면이 어떻게 되는가**

| 없는 것 | 결과 | 근거 |
|---|---|---|
| 조회 권한(`read`) | 본문이 `접근 권한이 없어요` 화면으로 대체된다 | `apps/admin/src/shared/errors/ErrorScreens.tsx:73` |
| 수정 권한(`update`) | 저장 버튼이 **사라지고** 토글·입력칸·`변경`·`취소`가 잠긴다. 값 조회와 아래 카드 셋은 그대로 보인다 | `apps/admin/src/pages/settings/_shared/SettingsFormShell.tsx:167-168` · `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:323` |

**권한 리소스는 목록 잎이 덮는다** — `/settings/api-keys/:providerId` 에 별도 권한을 걸지 않고, 경로를 감싸는 가장 구체적인 잎(`/settings/api-keys`)이 리소스가 된다 — `apps/admin/src/App.tsx:205-208`.

**플랜(엔타이틀먼트) 축** — 시스템 설정 경로에는 모듈 매핑이 없어 잠금 판정이 `granted` 로 열린다 — `apps/admin/src/shared/entitlements/module-resources.ts:15-17`.

## 10. 화면 이동(Screen Flow)

| 현재 화면 | 이벤트 | 이동 화면 | 팝업 여부 | 이동 조건 | 전달 파라미터 | 복귀 화면 |
|---|---|---|---|---|---|---|
| `SCR-SETTINGS-API-KEYS` | 이름·`앱 설정`·더보기 `연동 해제` | `SCR-SETTINGS-API-KEYS-DETAIL` | N | 그 항목에 갈 곳이 있을 때 | 연동 id(경로 세그먼트) | 목록 |
| `SCR-SETTINGS-API-KEYS-DETAIL` | `목록으로` 클릭 | `SCR-SETTINGS-API-KEYS` | N | 변경 상태가 아니면 즉시 · 변경 상태면 가드를 거친 뒤 | 없음 | — |
| `SCR-SETTINGS-API-KEYS-DETAIL` | 알 수 없는 연동에서 `연동 목록으로 돌아가기` | `SCR-SETTINGS-API-KEYS` | N | 항상 | 없음 | — |
| `SCR-SETTINGS-API-KEYS-DETAIL` | 저장 클릭(검증 통과) | 저장 확인 다이얼로그(`{연동 이름} 연동 저장`) | Y | 변경 사항이 있을 때 | 저장할 문서 · 이전/이후 켜짐 여부 | 같은 화면 |
| `SCR-SETTINGS-API-KEYS-DETAIL` | 저장 → 충돌 거절 | `POP-COMMON-SETTINGS-CONFLICT` | Y | 다른 관리자가 먼저 저장 | 설정 이름 `{연동 이름} 연동` · 최신 문서 · 갈린 항목 | 같은 화면(입력 유지) |
| `SCR-SETTINGS-API-KEYS-DETAIL` | 변경 상태에서 앱 안 링크·뒤로가기 | `DLG-COMMON-LEAVE-FORM` | Y | 폼이 변경 상태 | 이동하려던 경로 | 확인=목적지 · 취소=같은 화면 |
| `SCR-SETTINGS-API-KEYS-DETAIL` | 변경 상태에서 탭 닫기·새로고침 | 브라우저 기본 확인창 | Y | 〃 | 없음 | 브라우저가 정한다 |
| `SCR-SETTINGS-API-KEYS-DETAIL` | 배송 정책 연결의 링크 클릭 | `SCR-PRODUCTS-SHIPPING` | N | 등록 상태가 `등록되지 않음` · `사용 꺼짐` 일 때 그 배너가 있다 | 없음 | 뒤로가기 |
| `SCR-SETTINGS-API-KEYS-DETAIL` | 한도 안내 클릭 | 그 연동의 한도 문서(새 창) | N | 확인된 주소가 있을 때 | 없음 | 같은 화면 |
| `SCR-SETTINGS-API-KEYS-DETAIL` | 401 관측 | `SCR-LOGIN` | N | 세션 만료 | 원래 경로 · 만료 표식 | 재인증 후 같은 화면 |

**이 화면이 여는 팝업·다이얼로그는 넷이다** — 저장 확인(화면 고유) · 저장 충돌(공유) · 이탈 가드 2종(공통). [인벤토리](../../inventory.md)의 확인 다이얼로그 표에서 이 화면 몫은 `{연동 이름} 연동 저장` 1건이다.

**이 화면의 결과 통지 토스트는 2건이다** — [인벤토리](../../inventory.md)의 화면별 토스트 표에서 `pages/settings/api-keys/AiConnectionPage.tsx` 행(성공 2 · 실패 0)과 일치한다. 저장 실패는 토스트가 아니라 다이얼로그 안 배너다.

| ID | 종류 | 문구 | 언제 | 출처 |
|---|---|---|---|---|
| `MSG-SETTINGS-API-KEYS-DETAIL-01` | success | `{연동 이름} 연동을 저장했어요.` | 저장 성공(덮어쓰기 성공 포함) | `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:352` |
| `MSG-SETTINGS-API-KEYS-DETAIL-02` | success | `최신 연동 설정을 불러왔어요.` | 충돌 팝업에서 '최신 내용 불러오기' | `apps/admin/src/pages/settings/api-keys/AiConnectionPage.tsx:406` |
