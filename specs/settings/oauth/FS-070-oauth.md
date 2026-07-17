---
id: FS-070
title: "OAuth 설정"
screen: SCR-070               # ⚠ 시스템 설정 SCR 미작성 — §7 미결 사항 참조
route: /settings/oauth
owner: 기능 명세
reviewer: 명세 리뷰
gate: G9
status: draft
confirmedAt: 2026-07-17
version: 1.0
date: 2026-07-17
---

# FS-070. OAuth 설정

## 1. 화면 개요

| 항목 | 내용 |
|---|---|
| 목적 | 소셜 로그인 제공자(Google · 카카오 · 네이버)의 **사용 여부**와 **자격증명**(Client ID · Client Secret) · **Redirect URI** 를 한 폼에서 정하고 저장한다 |
| 역할(주 사용자) | 관리자 (구현에 역할 분기 없음 — 권한은 `useRouteWritePermissions` 로 게이팅. §4.1) |
| 진입 경로 | 좌측 GNB > 시스템 > 시스템 설정 > OAuth 설정 (`nav-config.ts:230` `['OAuth 설정', '/settings/oauth']`) |
| 포함 화면 | 단일 라우트 `/settings/oauth` — **하위 라우트가 없다(잎)** |
| **범위 밖** | **연결 테스트** — 버튼이 **비활성**이다. '프론트가 흉내 낼 수 없다(시크릿은 서버에만 있고 CORS 도 막힌다)'(`OAuthProviderCard.tsx:214-217`). **제공자 추가** — 3종이 코드 상수(`validation.ts:14`)이며 화면에서 만들 수 없다. **실제 소셜 로그인 동작** — 이 화면은 자격증명을 저장할 뿐 인증 흐름의 주체가 아니다(백엔드 소관). **저장된 시크릿 조회** — 기능이 아니라 **불가능**하다(§1.1) |
| 구현 경로 | `apps/admin/src/pages/settings/oauth/**` (`OAuthPage.tsx` · `data-source.ts` · `validation.ts` · `oauth.test.ts` · `components/OAuthProviderCard.tsx`) · 공유 `pages/settings/_shared/**` |
| 대응 SCR | SCR-070 (미작성 — §7 #1) |
| 공통 컴포넌트 | `settings/_shared/{SettingsFormShell,ConflictDialog,AuditNote,MASKED_SECRET_TEXT,useSettingsQuery,useSaveSettings,useSubmitLock,createRevisionedStore,formatAuditAt}` · `shared/ui/{Alert,Button,Card,CardTitle,ConfirmDialog,FormField,ToggleSwitch,controlStyle,errorIdOf,useToast,useUnsavedChangesDialog}` · `shared/permissions/RequirePermission` · `shared/form/zodResolver` · `shared/async(isAbort)` |

> **이 화면은 사이트·언어 설정과 같은 셸·저장소를 쓴다**(`SettingsFormShell` + `createRevisionedStore`) — 단일 문서 폼이다. **다른 점은 문서가 배열(`providers[]`)이라는 것**이며 그로 인해 충돌 표시(EL-021.1)·시크릿 취급(§1.1)이 갈린다.

### 1.1 이 화면의 설계 원칙 (요구사항 — 명세에 고정한다)

| 원칙 | 내용과 이유 (코드 근거) |
|---|---|
| **저장된 시크릿은 폼에 채워지지 않는다** | `validation.ts:3-11` 이 선언한다: '폼의 `secret` 필드는 **저장된 시크릿이 아니라 "새로 넣을 값"** 이다. 빈 문자열 = 그대로 둔다(기존 유지) / 값이 있음 = 이 값으로 교체한다.' **채우면 DOM 에 평문이 살고, 그 순간 마스킹은 눈속임이 된다** |
| **모델은 `hasSecret` 불리언만 안다** | 화면·저장소가 저장된 시크릿의 값을 갖지 않는다(`data-source.ts:3-5` '저장소는 **평문 시크릿을 갖지 않는다** — `hasSecret` 불리언만 안다. 조회 응답에도 시크릿은 실리지 않는다') |
| **마스킹은 자릿수도 흘리지 않는다** | `MASKED_SECRET_TEXT = '••••••••••••'` — 고정 글리프. **last4 도 남기지 않는다**(`_shared/secret.ts:36-37` '식별이 이름으로 충분하다'). API Key 화면(`sk_test_••••0001`)과 다른 판정이며 근거가 코드에 있다 |
| **저장은 시크릿을 화면에서 지우는 시점이다** | `normalizeAfterSave`(`data-source.ts:59-73`)가 새로 넣은 평문을 비우고 `hasSecret: true` 로 바꾼다. '이걸 하지 않으면 저장한 뒤에도 입력칸에 평문이 남아 있고, 그 상태가 곧 새 기준선이 되어 **DOM 에 평문이 계속 산다**' |
| **꺼진 제공자는 검증하지 않는다** | '쓰지 않을 값을 채우라고 요구하지 않는다'(`validation.ts:89-90`) |
| **Redirect URI 를 저장 시점에 막는다** | '이걸 저장 시점에 막지 않으면 실패는 **로그인 순간에, 사용자 앞에서** 난다'(`validation.ts:53-54`) |
| **가짜 성공을 보여주지 않는다** | 연결 테스트가 **비활성** + 이유 문구. '눌러서 아무 일도 없거나 가짜 성공을 보여주는 것보다, 왜 못 쓰는지 적어 두는 편이 정직하다 (FEEDBACK-03: no-op 금지)'(`OAuthProviderCard.tsx:8-9`) |
| **동시 편집을 덮어쓰지 않는다** | revision 토큰 기반 409 → 충돌 다이얼로그(`_shared/store.ts:124-126`). 사이트·언어 설정과 같은 계약 |

## 2. 영역 구성

| 영역번호 | 이름 | 설명 |
|---|---|---|
| FS-070-SEC-01 | 화면 안내문 | 카드 위 muted 문구 |
| FS-070-SEC-02 | 설정 카드 | 제목 + (저장 실패 배너 · 읽기전용 안내 · 미사용 안내) + 제공자 카드 스택 + 푸터 |
| FS-070-SEC-03 | 제공자 카드 (×3) | 제목 + 사용 스위치 + Client ID · Client Secret · Redirect URI + 연결 테스트 행 |
| FS-070-SEC-04 | 카드 푸터 | 감사 기록 + 저장 상태 문구 + 저장 버튼 |
| FS-070-SEC-05 | 조회 실패 배너(비표시 기본) | 폼 전체를 대체 |
| FS-070-SEC-06 | 첫 로딩 스켈레톤(비표시 기본) | 제공자 카드 자리를 대체 |
| FS-070-SEC-07 | 저장 확인 다이얼로그(비표시 기본) | 켜고 끄는 제공자를 이름으로 말한다 |
| FS-070-SEC-08 | 동시 편집 충돌 다이얼로그(비표시 기본) | 3-액션. 제공자 이름으로 짚는다 |
| FS-070-SEC-09 | 미저장 이탈 가드(비표시 기본) | 3경로 discard 확인 |

## 3. 요소 명세

| 요소번호 | 영역 | 이름 | 유형 | 동작 | [서버] | 비고 |
|---|---|---|---|---|---|---|
| FS-070-EL-001 | FS-070-SEC-01 | 화면 안내문 | 텍스트 | `<p>` '소셜 로그인 제공자의 자격증명과 Redirect URI를 관리합니다. 켠 제공자만 검증합니다.'(`OAuthPage.tsx:243`) | — | **in-content `<h1>` 이 없다** — 제목은 AppHeader 가 nav 잎 라벨('OAuth 설정')로 그린다(IA-02 pass 근거). **검증 규칙(켠 것만)을 미리 알린다** |
| FS-070-EL-002 | FS-070-SEC-02 | 카드 제목 | 텍스트 | `CardTitle` 'OAuth 설정'(`:242`) | — | `<h1>` 이 아니다. nav 라벨과 **일치**한다(언어 화면은 갈린다 — FS-068 §7 #5) |
| FS-070-EL-003 | FS-070-SEC-02 | 미사용 안내 배너 | 배너 | `!anyEnabled && !loading` 이면 info `Alert`: '켜져 있는 소셜 로그인이 없습니다. 사용자는 이메일과 비밀번호로만 로그인합니다.'(`:254-260`) | — | 비표시 기본. **`warning` 슬롯**(카드 상단·필드 위). 드래프트 기준(`anyEnabled = providers.some(p => p.enabled)` — `:237`). **로딩 중에는 뜨지 않는다**(`!loading` — 스켈레톤 위에 뜨면 거짓말이다) |
| FS-070-EL-004 | FS-070-SEC-02 | 제공자 카드 스택 | 표시 | `<div style={stackStyle}>` 안에 `providers.map(...)`(`:263-301`) — `key={provider.provider}`. 순서는 서버가 준 배열 순서(픽스처: google · kakao · naver) | O | **카드 안에 카드**(`SettingsFormShell` 의 `<Card>` 안에 `OAuthProviderCard` 의 `<Card>`) — 중첩 표면(§7 #10) |
| FS-070-EL-005 | FS-070-SEC-03 | 제공자 카드 제목 | 텍스트 | `CardTitle action={<ToggleSwitch/>}` + `providerLabel(value.provider)`(`OAuthProviderCard.tsx:93,123-134`) — 'Google' · '카카오' · '네이버' | O | `providerLabel`(`validation.ts:39-41`)이 못 찾으면 id 를 그대로 돌려준다 |
| FS-070-EL-006 | FS-070-SEC-03 | 사용 스위치 | 입력 | `ToggleSwitch` 접근 이름 `'<라벨> 로그인 사용'`(`:125-130`). `onChange` → `setValue('providers.<i>.enabled', next, { shouldDirty: true, shouldValidate: true })`(`OAuthPage.tsx:285-291`) | O | **`shouldValidate: true`** — 켜는 즉시 자격증명 필수 규칙이 걸려야 하기 때문(`validation.ts:89-90`). `CardTitle` 의 `action` 슬롯에 있다 |
| FS-070-EL-007 | FS-070-SEC-03 | Client ID 입력 | 입력 | `FormField htmlFor="oauth-<provider>-client-id"` 라벨 'Client ID', **`required={value.enabled}`**, 힌트 `'<라벨> 개발자 콘솔에서 발급받은 값입니다.'`. 자식이 **네이티브 `<input type="text">`**(`:143`)이라 `FormField` 가 **`aria-required` 를 주입한다**(`FormField.tsx:50-56`). `maxLength=200`(`CLIENT_ID_MAX`). `aria-invalid`+`aria-describedby` 짝 배선(`:150-151`) | O | 켠 경우에만 검증: 비면 `'<라벨> Client ID를 입력하세요.'` · 200자 초과 시 `'Client ID는 200자를 넘을 수 없습니다.'`(`validation.ts:94-108`) |
| FS-070-EL-008 | FS-070-SEC-03 | **Client Secret 필드** | 입력 | `FormField htmlFor="oauth-<provider>-secret"` 라벨 'Client Secret', **`required={secretRequired}`**(`:159`, `secretRequired = value.enabled && !value.hasSecret` — `:113`). 힌트가 **상태에 따라 갈린다**: 마스킹 중이면 '저장된 시크릿은 다시 볼 수 없습니다. 바꾸려면 새 값을 넣으세요.' / 그 외 '입력한 값은 저장 후 다시 표시되지 않습니다.'(`:161-165`) | O | 자식이 삼항 양쪽 모두 `<span style={secretRowStyle}>` 래퍼(`:168`·`:176`)라 `FormField.tsx:36-41` `isRequirableChild` 가 거부해 **`withAriaRequired` 주입은 일어나지 않는다** — 그러나 **PR #30 이후 호출부가 진짜 `<input>` 에 직접 준다**: `secretRequiredProps`(`:114`) → spread(`:186`). `false` 면 속성 자체를 생략한다. **필수 여부가 AT 에 닿는다**(§7 #2 — **해소됨**). 근거 `:103-112` |
| FS-070-EL-008.1 | FS-070-SEC-03 | 시크릿 3상태 규칙 | 텍스트 | `OAuthProviderCard.tsx:3-7` 이 정의한다: ① **저장된 것 없음** → 입력칸을 바로 보여준다 ② **저장돼 있고 그대로 둠** → `••••••••••••` + '변경' 버튼. **입력칸에 평문을 채우지 않는다** ③ **변경 중** → 빈 입력칸 + '취소'. 빈 채로 저장하면 기존 값이 유지된다. 판정: `showMasked = value.hasSecret && !changingSecret`(`:97`) | O | 비표시 규칙. **`required` 와 `showMasked` 는 상호 배타적이다** — `required = enabled && !hasSecret` 이 참이면 `hasSecret` 이 거짓이므로 `showMasked` 는 반드시 거짓이다. 즉 **required 일 때 렌더되는 것은 항상 입력 분기**다 — `:110` 이 이 논증을 코드에 남겼고, PR #30 의 `aria-required` 직접 부여(EL-008)가 그 위에 선다 |
| FS-070-EL-008.2 | FS-070-SEC-03 | 마스킹 표시 | 텍스트 | `showMasked` 면 `<span style={maskedStyle}>{MASKED_SECRET_TEXT}</span>`(`:170`) — `••••••••••••` 고정 12자 | O | **저장돼 있다는 사실만 보여준다 — 값은 우리도 모른다**(`:169`). **last4 를 남기지 않는다**(`_shared/secret.ts:36-37`) — API Key 화면과 다른 판정(§7 #9). ⚠ **`<span>` 이라 폼 컨트롤이 아니다** — `FormField` 의 `htmlFor` 가 가리킬 대상이 없다(§7 #3) |
| FS-070-EL-008.3 | FS-070-SEC-03 | '변경' 버튼 | 버튼 | `showMasked` 일 때만. `secondary` · `size="sm"`. `onClick` → `startChange()`(`:116-118`) → `onChangeSecretStart()` → `startChangeSecret(provider)`(`OAuthPage.tsx:221-223`) — `changingSecrets` 배열에 추가 | — | `changingSecrets` 는 **화면 상태이지 저장값이 아니다**(`OAuthPage.tsx:104-105`) |
| FS-070-EL-008.4 | FS-070-SEC-03 | 시크릿 입력 | 입력 | `!showMasked` 면 `<input type="password" id="oauth-<provider>-secret">`(`:177-190`). `autoComplete="new-password"`(`:184`) · `maxLength=200`(`CLIENT_SECRET_MAX`, `:183`). placeholder 는 `hasSecret` 이면 '비워 두면 기존 시크릿을 유지합니다', 아니면 `''`(`:185`). **`{...secretRequiredProps}`**(`:186`) · `aria-invalid`+`aria-describedby` 짝 배선(`:187-188`) | O | **`type="password"`** — 어깨너머 노출을 막는다. **`autoComplete="new-password"`** — 브라우저가 기존 비밀번호를 채우지 않게 한다. ✔ **`<span>` 래퍼 안에 있어도 `aria-required` 를 받는다** — 호출부가 `FormField` 주입을 우회해 이 `<input>` 에 직접 준다(`:114,186`, PR #30). 테스트 4건(`OAuthProviderCard.test.tsx:61-88`) |
| FS-070-EL-008.5 | FS-070-SEC-03 | '취소' 버튼 | 버튼 | `!showMasked && value.hasSecret` 일 때만(`:191`). `secondary` · `size="sm"`. `onClick` → `cancelChangeSecret(provider, index)`(`OAuthPage.tsx:225-235`): `setValue('providers.<i>.secret', '', { shouldDirty: true, shouldValidate: true })` + `changingSecrets` 에서 제거 | — | '입력하던 새 시크릿을 버린다 — 기존 값이 그대로 유지된다'(`:227`). **저장된 시크릿이 없으면 렌더되지 않는다**(취소할 대상이 없다) |
| FS-070-EL-009 | FS-070-SEC-03 | Redirect URI 입력 | 입력 | `FormField htmlFor="oauth-<provider>-redirect"` 라벨 'Redirect URI', **`required={value.enabled}`**, 힌트 `'이 주소를 <라벨> 콘솔에도 똑같이 등록해야 합니다.'`. 자식이 **네이티브 `<input type="url" inputMode="url">`**(`:212-224`)이라 `aria-required` 가 주입된다. `aria-invalid`+`aria-describedby` 짝(`:219-220`) | O | **`maxLength` 가 없다**(§7 #11). 검증은 EL-009.1 |
| FS-070-EL-009.1 | FS-070-SEC-03 | Redirect URI 규칙 | 텍스트 | `redirectUriError(value)`(`validation.ts:56-74`) — **URL 파서로 판정**(`new URL(trimmed)`): ① 비면 'Redirect URI를 입력하세요.' ② 파싱 실패 시 'Redirect URI는 https:// 로 시작하는 전체 주소여야 합니다.'(상대 경로가 여기 걸린다) ③ **fragment(#) 있으면** 'Redirect URI에는 # 이후 값을 넣을 수 없습니다.' ④ https 면 통과 ⑤ **http + localhost/127.0.0.1 이면 통과** ⑥ 그 외 'Redirect URI는 https:// 여야 합니다. (http는 localhost에서만 허용됩니다)' | — | 비표시 규칙. **근거가 코드에 있다**(`validation.ts:46-54`): 절대 URL(제공자가 상대 경로를 거절) · https(http 운영 주소는 인가 코드가 평문으로 흐른다) · fragment 금지(인가 코드가 그 자리를 차지하면 콜백이 깨진다). **사이트 설정의 `baseUrl` 은 정규식인데 여기는 파서다** — 같은 섹션 안에서 두 방식이 갈렸다(§7 #12). 테스트 6건(`oauth.test.ts:27-52`) |
| FS-070-EL-010 | FS-070-SEC-03 | 연결 테스트 버튼 | 버튼 | `<Button variant="secondary" size="sm" disabled>연결 테스트</Button>`(`:232-234`) — **항상 비활성** | — | **`disabled` 가 하드코딩이다**(조건이 없다). 심이 이유와 계획을 밝힌다(`:228-231` `// TODO(backend): POST /api/settings/oauth/:provider/test` — '서버가 제공자에게 실제로 토큰 교환을 시도하고 결과를 돌려준다. **프론트가 흉내 낼 수 없다(시크릿은 서버에만 있고 CORS 도 막힌다)**. 백엔드가 붙으면 이 버튼이 활성화되고 결과는 인라인 배너로 표시한다') |
| FS-070-EL-010.1 | FS-070-SEC-03 | 연결 테스트 안내 | 텍스트 | `<p style={hintStyle}>연결 테스트는 백엔드 연동 후 제공됩니다.</p>`(`:221`) | — | **비활성 버튼 옆에 이유를 적는다** — '가짜 성공을 보여주지 않는다'(§1.1). ⚠ **버튼과 프로그램적으로 연결돼 있지 않다**(`aria-describedby` 없음) — 시각 사용자만 이유를 안다(§7 #4) |
| FS-070-EL-011 | FS-070-SEC-04 | 감사 기록 | 텍스트 | `AuditNote` — 픽스처 초기값 `{ updatedBy: '김운영', updatedAt: '2026-07-02T08:05:00.000Z' }`(`data-source.ts:56`) | O | FS-067-EL-013 과 같은 컴포넌트·규칙 |
| FS-070-EL-012 | FS-070-SEC-04 | 저장 상태 문구 | 텍스트 | `canUpdate` 일 때만. 3분기(`SettingsFormShell.tsx:168-174`) | — | FS-067-EL-014 와 동일 |
| FS-070-EL-013 | FS-070-SEC-04 | 저장 버튼 | 버튼 | `type="submit"` · `primary`. 비활성 조건 `!dirty \|\| saving \|\| loading` | O | **`canUpdate` 가 false 면 렌더되지 않는다**(EXC-03) |
| FS-070-EL-014 | FS-070-SEC-02 | 읽기 전용 안내 | 배너 | `!canUpdate` 면 info `Alert`: '조회 권한만 있습니다. OAuth 설정을 바꾸려면 시스템 설정 수정 권한이 필요합니다.'(`:33-34`) | — | 비표시 기본 |
| FS-070-EL-015 | FS-070-SEC-02 | 필드 일괄 비활성 규칙 | 텍스트 | `disabled = saving \|\| loading \|\| !canUpdate`(`:120`) → 각 `OAuthProviderCard` 에 전달 → 스위치·입력 3종·'변경'·'취소' 전부 | — | 비표시 규칙. **연결 테스트는 이 규칙과 무관하게 항상 비활성**(EL-010) |
| FS-070-EL-016 | FS-070-SEC-05 | 조회 실패 배너 | 배너 | 폼 대신 danger `Alert` '설정을 불러오지 못했습니다.' + '다시 시도'(`SettingsFormShell.tsx:125-138`) | O | 비표시. 토스트로 알리지 않는다(STATE-02) |
| FS-070-EL-017 | FS-070-SEC-06 | 첫 로딩 스켈레톤 | 스켈레톤 | `loading = isFetching && data === undefined`(`:118`) 면 4행 스켈레톤 + `aria-busy="true"` | — | 비표시. **재조회에서는 뜨지 않는다**(STATE-01 pass) |
| FS-070-EL-018 | FS-070-SEC-02 | 저장 실패 배너 | 배너 | danger `Alert` 'OAuth 설정을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'(`:154`) | O | 비표시. 표시 조건 `saveError !== null && pending === null && conflict === null`(`:247`) — ✔ **세 조건을 전부 본다**(사이트 설정은 `conflict === null` 을 빠뜨렸다 — FS-067 §7 #5) |
| FS-070-EL-019 | FS-070-SEC-07 | 저장 확인 다이얼로그 | 모달 | `onValid` → `setPending(values)`(`:162-165`) → `ConfirmDialog intent="update"` 제목 'OAuth 설정 저장' | — | 비표시. `busy={saving}` · `error={saveError}` — **실패해도 닫지 않는다** |
| FS-070-EL-019.1 | FS-070-SEC-07 | 확인 문구 조립 규칙 | 텍스트 | `saveConfirmMessage(next, saved)`(`:48-74`): 저장값과 대조해 **켜는·끄는 제공자를 이름으로 모은다**. ① 끄는 것이 있으면 `'<이름들> 로그인을 끕니다. 이 방식으로 가입한 사용자는 로그인할 수 없게 됩니다.'` ② 켜는 것이 있으면 `'<이름들> 로그인을 켭니다.'` ③ 둘 다 없으면 'OAuth 설정을 저장하면 즉시 반영됩니다. 저장할까요?' ④ `saved === undefined` 면 'OAuth 설정을 저장할까요?' | — | 비표시 규칙. **'저장할까요?' 만 물으면 무엇이 바뀌는지 모르고 확인하게 된다**(`:45-46`). **언어 화면은 고정 문구다**(FS-068 §7 #6) — 같은 섹션 안에서 구체성이 갈렸고 **이 화면이 낫다**. 기준은 `data?.value`(**서버가 아는 상태**) |
| FS-070-EL-019.2 | FS-070-SEC-07 | 확인 취소 | 버튼 | `cancelSave`(`:172-179`) — abort · `save.reset()` · `lock.release()` · `saveError`·`pending` 비움 | — | 비표시. 진행 중 저장도 취소 |
| FS-070-EL-020 | FS-070-SEC-02 | 저장 실행 규칙 | 텍스트 | `runSave(values, force)`(`:122-160`): revision 없으면 중단 → `lock.acquire()` → `save.mutate({ value, expectedRevision, force, signal })` | O | 비표시 규칙. FS-067-EL-022 와 동일 구조 |
| FS-070-EL-020.1 | FS-070-SEC-02 | 동기 제출 잠금 | 텍스트 | `useSubmitLock()`(`_shared/queries.ts:58-75`) — `if (!lock.acquire()) return`(`:126`) | — | 비표시. **멱등키는 없다**(§7 #7) |
| FS-070-EL-020.2 | FS-070-SEC-02 | **저장 성공 처리 — 시크릿 정규화** | 텍스트 | `lock.release()` → aborted 면 중단 → **`normalizeAfterSave(values)`**(`:139`) → `reset(normalized)` → `setChangingSecrets([])` → `pending`·`conflict` 비움 → 토스트 'OAuth 설정을 저장했습니다.'(`:135-144`) | O | 비표시. **'저장한 순간 평문 시크릿은 화면에서 사라진다 — 새 기준선은 "저장됨 + 빈 입력" 이다'**(`:138`). `normalizeAfterSave`(`data-source.ts:65-73`): `hasSecret: provider.hasSecret \|\| provider.secret.trim() !== ''` · `secret: ''`. **테스트 3건이 이를 고정**(`oauth.test.ts:112-137`) |
| FS-070-EL-021 | FS-070-SEC-08 | 충돌 다이얼로그 | 모달 | `isSettingsConflict(cause)`(`:149`) → `ConflictDialog subject="OAuth 설정"` 제목 'OAuth 설정이 이미 변경되었습니다' | O | 비표시. **입력 보존.** FS-067-EL-024 와 같은 계약 |
| FS-070-EL-021.1 | FS-070-SEC-08 | 달라진 제공자 목록 | 텍스트 | **`divergedLabels` 를 쓰지 않는다.** 대신 `conflict.value.providers` 를 순회하며 내 값과 대조해(`enabled`·`clientId`·`redirectUri`·**`hasSecret`** 4필드) 갈린 제공자의 **이름**을 모은다(`:204-219`) | — | 비표시. **근거가 코드에 있다**(`data-source.ts:75-77`): '이 화면의 문서는 제공자 배열이라 필드 단위로 나열하면 `providers` 한 줄이 되어 아무것도 알려주지 못한다.' ⚠ **`secret`(새로 넣을 평문)은 대조하지 않는다** — 옳다(양쪽 모두 '새 값'이라 비교 의미가 없다). ⚠ **내게 없는 제공자는 건너뛴다**(`:210` `if (ours === undefined) return false`) — 상대가 추가한 제공자를 못 짚는다(§7 #13) |
| FS-070-EL-021.2 | FS-070-SEC-08 | '최신 내용 불러오기' | 버튼 | `reset(latest.value)` → **`setChangingSecrets([])`** → `conflict` 비움 → `refetch()` → 토스트 '최신 OAuth 설정을 불러왔습니다.'(`:181-189`) | O | 내 입력을 버리는 선택. **시크릿 변경 상태도 함께 초기화**한다 |
| FS-070-EL-021.3 | FS-070-SEC-08 | '내 변경으로 덮어쓰기' | 버튼 | `danger`. `runSave(getValues(), true)`(`:191-193`) | O | 상대의 변경을 버리는 선택 |
| FS-070-EL-021.4 | FS-070-SEC-08 | 충돌 다이얼로그 닫기 | 버튼 | `closeConflict`(`:195-201`) — abort · `save.reset()` · `lock.release()` · `conflict` 비움 | — | 비표시. **`changingSecrets` 를 건드리지 않는다** — 입력 중이던 시크릿 UI 상태가 유지된다(입력 보존과 일관) |
| FS-070-EL-022 | FS-070-SEC-09 | 미저장 이탈 가드 | 모달 | `useUnsavedChangesDialog(dirty && !saving, { message })`(`SettingsFormShell.tsx:122`). 문구 'OAuth 설정에 저장하지 않은 변경 사항이 있습니다. 이 화면을 벗어나면 입력한 내용이 사라집니다.'(`:30-31`) | — | 비표시. 3경로. **입력한 평문 시크릿이 사라진다는 뜻이기도 하다** — 그것이 옳다(§4.1) |
| FS-070-EL-023 | FS-070-SEC-02 | 폼 초기값·리셋 규칙 | 텍스트 | `DEFAULT_FORM_VALUES = { providers: [] }`(`:42`)로 시작해 도착 시 `reset(data.value)` + **`setChangingSecrets([])`**(`:110-114`) | O | 비표시. **빈 배열로 시작해 로딩 중 카드가 0개다**(스켈레톤이 대체). **편집 중 재조회가 오면 입력·시크릿 변경 상태가 덮인다**(§7 #8) |
| FS-070-EL-024 | FS-070-SEC-02 | 언마운트 abort | 텍스트 | `useEffect(() => () => controllerRef.current?.abort(), [])`(`:108`) | — | 비표시 규칙 |
| FS-070-EL-024.1 | FS-070-SEC-02 | abort 는 실패가 아니다 | 텍스트 | `if (isAbort(cause) \|\| controller.signal.aborted) return;`(`:148`) · `onSuccess` 도 aborted 면 중단(`:137`) | — | 비표시 규칙(EXC-09) |
| FS-070-EL-025 | FS-070-SEC-02 | dirty 판정 | 텍스트 | RHF `formState.isDirty`(`:95`) | — | 비표시. ⚠ **'변경' 버튼(EL-008.3)을 눌러도 dirty 가 되지 않는다** — `changingSecrets` 는 폼 밖 state 다. 입력칸이 열렸는데 저장 버튼이 비활성이다(§7 #6) |
| FS-070-EL-026 | FS-070-SEC-02 | 제출 경로 | 텍스트 | `<form onSubmit={handleSubmit(onValid)} noValidate>`(`SettingsFormShell.tsx:144`) | — | 비표시. **`onInvalid` 가 없다** — 첫 오류로 포커스가 가지 않는다(§7 #5) |
| FS-070-EL-027 | FS-070-SEC-02 | 필드 오류 전달 규칙 | 텍스트 | `errors.providers?.[index]` 에서 `clientId`·`secret`·`redirectUri` 메시지만 추려 `OAuthProviderCard` 에 넘긴다(`:265-284`) — `exactOptionalPropertyTypes` 대응으로 spread 조건부 조립 | — | 비표시 규칙 |

## 4. 예외 명세

| 요소번호 | 빈 상태 | 로딩 | 실패 | 유효성 | 권한없음 | 경합 | 대량 |
|---|---|---|---|---|---|---|---|
| FS-070-EL-001 | N/A — 정적 문구 | 로딩 중에도 표시(카드 밖) | 조회 실패 시 EL-016 이 화면을 대체해 함께 사라진다 | N/A — 입력 없음 | 권한과 무관 | N/A — 정적 | 고정 문구 |
| FS-070-EL-002 | N/A — 정적 문구 | 로딩 중에도 표시 | 조회 실패 시 사라진다 | N/A — 입력 없음 | 권한과 무관 | N/A — 정적 | 고정 문구 |
| FS-070-EL-003 | **제공자가 0개면 `anyEnabled` 가 false 라 뜬다** — 픽스처 3종 고정이라 실현되지 않는다 | **`!loading` 조건이라 로딩 중에는 뜨지 않는다** — 스켈레톤 위에 뜨면 거짓말이다 | 조회 실패 시 폼째 사라진다 | N/A — 표시 전용 | 권한과 무관하게 표시 | 드래프트 기준 — 스위치를 켜면 즉시 사라진다 | 1건 |
| FS-070-EL-004 | `providers` 가 비면 카드가 0개 — **초기값이 `[]` 라 도착 전에는 실제로 0개다**(스켈레톤이 대체) | 스켈레톤이 대체 | 조회 실패 시 미표시 | N/A — 컨테이너 | 카드는 보이되 내용이 비활성 | 재조회가 오면 배열이 통째로 교체된다(EL-023) | **3건 고정** — 상한 문제 없음 |
| FS-070-EL-005 | N/A — 카드마다 항상 | 스켈레톤이 대체 | 조회 실패 시 미표시 | N/A — 표시 전용 | 권한과 무관하게 표시 | 조회 시점 값 | 3건 고정 |
| FS-070-EL-006 | N/A — 불리언 | `disabled`(EL-015) | 저장 실패는 EL-018 | `z.boolean()` — 위반 값 없음. **켜면 교차 규칙 3개가 걸린다** | 비활성 | 충돌 시 그 제공자 이름으로 짚힌다(EL-021.1) | N/A — 불리언 |
| FS-070-EL-007 | 초기값 `''`(픽스처) | `disabled` | 저장 실패는 EL-018. **입력 보존** | **꺼져 있으면 검증하지 않는다.** 켜면: 비면 missing · 200자 초과 시 tooLong(**trim 후 판정**). `maxLength=200` 이 입력을 먼저 자른다 | 비활성 | 충돌 시 제공자 이름으로 짚힌다 | 200자 상한. **카운터가 없다**(§7 #14) |
| FS-070-EL-008 | 초기값 `hasSecret: false` + `secret: ''` → 입력 분기 | `disabled` | 저장 실패는 EL-018 | **꺼져 있으면 검증하지 않는다.** 켜고 `!hasSecret && secret.trim() === ''` 이면 `'<라벨> Client Secret을 입력하세요.'`(`validation.ts:110-117`). **저장된 시크릿이 있으면 비워도 통과**(테스트 `oauth.test.ts:84-92`) | 비활성 | 충돌 시 `hasSecret` 이 갈리면 제공자 이름으로 짚힌다 | 200자 상한 |
| FS-070-EL-008.1 | N/A — 규칙 | N/A — 동기 판정 | N/A — 서버 호출 없음 | **`required` 와 `showMasked` 가 상호 배타적**이라 required 일 때는 항상 입력 분기다(§7 #2) | N/A | **재조회가 `changingSecrets` 를 비운다**(EL-023) — 변경 중이던 UI 가 마스킹으로 되돌아간다 | 3상태 고정 |
| FS-070-EL-008.2 | N/A — `hasSecret` 이어야 성립 | 스켈레톤이 대체 | N/A — 표시 전용 | N/A — 표시 전용 | 권한과 무관하게 표시 — **읽기 전용 역할도 '저장돼 있음' 은 안다** | 재조회로 `hasSecret` 이 false 가 되면 입력 분기로 바뀐다 | 고정 12자 |
| FS-070-EL-008.3 | N/A — `showMasked` 여야 성립 | `disabled` | N/A — 서버 호출 없음 | N/A — 입력 없음 | 비활성 | **누르면 UI 만 바뀌고 dirty 가 되지 않는다**(§7 #6) | 카드마다 1개 |
| FS-070-EL-008.4 | 초기값 `''`. placeholder 가 `hasSecret` 에 따라 갈린다 | `disabled` | 저장 실패 시 **입력한 평문이 폼에 남는다** — 옳다(재시도 가능). 이탈하면 EL-022 가드가 막는다 | EL-008 과 동일 | 비활성 | 재조회가 오면 **입력하던 평문이 사라진다**(EL-023 · §7 #8) | 200자 상한. **카운터가 없다** |
| FS-070-EL-008.5 | N/A — `hasSecret && !showMasked` 여야 성립 | `disabled` | N/A — 서버 호출 없음 | 누르면 `shouldValidate: true` 로 즉시 재판정 | 비활성 | N/A — 로컬 | 조건부 1개 |
| FS-070-EL-009 | 초기값이 픽스처 URL(`https://example.com/auth/<provider>/callback`) | `disabled` | 저장 실패는 EL-018 | **꺼져 있으면 검증하지 않는다.** 켜면 EL-009.1 규칙 6분기 | 비활성 | 충돌 시 제공자 이름으로 짚힌다 | **`maxLength` 없음 — 상한이 없다**(§7 #11) |
| FS-070-EL-009.1 | 빈 문자열이면 'Redirect URI를 입력하세요.' | N/A — 동기 판정 | N/A — 서버 호출 없음 | **이것이 유효성 규칙.** `new URL()` 파서 기반이라 상대 경로·스킴 누락이 catch 로 떨어진다 | N/A | N/A — 로컬 | 상수 비용 |
| FS-070-EL-010 | N/A — 항상 표시 | **`disabled` 가 하드코딩이라 로딩과 무관하게 항상 비활성** | N/A — 서버 호출이 없다(그것이 이 요소의 내용) | N/A — 입력 없음 | **권한과 무관하게 비활성** — `disabled` prop 을 받지 않는다 | N/A | 카드마다 1개 |
| FS-070-EL-010.1 | N/A — 항상 표시 | 항상 표시 | N/A | N/A | 권한과 무관 | N/A | 고정 문구 |
| FS-070-EL-011 | `audit === null` 이면 미표시 | `loading` 이면 미표시 | 조회 실패 시 폼째 사라진다 | N/A — 표시 전용 | 권한과 무관 — 읽기 전용 역할도 본다 | 저장 성공 시 새 감사 정보로 갱신 | 1건 |
| FS-070-EL-012 | N/A — 3분기 중 하나 | '저장하는 중입니다…' | N/A — 실패는 EL-018 | N/A — 표시 전용 | **`!canUpdate` 면 렌더되지 않는다** | 기준선이 바뀌면 판정도 바뀐다 | 고정 문구 |
| FS-070-EL-013 | N/A — 항상 표시(권한 있으면) | '저장 중…' + 비활성 | 실패 시 EL-018, 버튼 재활성, **입력 보존** | 미변경·로딩 중 비활성. 검증 실패는 제출을 막는다 | **렌더되지 않는다**(EXC-03) | 성공이 새 revision 을 캐시에 심는다 | 단건 |
| FS-070-EL-014 | N/A — 권한이 없어야 성립 | 로딩 중에도 표시 | 조회 실패 시 폼째 사라진다 | N/A — 표시 전용 | **이것이 권한없음 표현** | 권한 스토어 변경 시 재렌더(강등 reconcile) | 1건 |
| FS-070-EL-015 | N/A — 규칙 | `loading` 이 입력 | `saving` 이 입력 | N/A | `!canUpdate` 가 입력 | N/A | 3카드 × 5컨트롤 일괄 |
| FS-070-EL-016 | N/A — 실패 상태 | 재시도 시 스켈레톤으로 | **이것이 조회 실패 표현.** 문구 1종 + '다시 시도'. **status 를 구분하지 않는다**(§7 #15) | N/A — 입력 없음 | read 권한 부족은 여기 오지 않는다 — `RequirePermission` 이 403 화면(§4.1) | 재시도는 같은 조회를 재발행 | N/A |
| FS-070-EL-017 | N/A — 도착 전 | **이것이 로딩 표현.** 4행 + `aria-busy` | 조회 실패 시 EL-016 으로 | N/A | 권한과 무관 | **재조회에서는 뜨지 않는다** | 4행 고정(실제 카드 3개와 무관) |
| FS-070-EL-018 | N/A — 오류가 있어야 성립 | 재저장 시 먼저 지운다(`:128`) | **이것이 저장 실패 표현.** 문구 1종. abort 는 표시하지 않는다 | 검증 실패는 여기 오지 않는다(필드로 간다) | 서버 403 도 이 문구로 뭉개진다 | **409 는 여기 오지 않는다** — EL-021 로 갈린다 | 1건 |
| FS-070-EL-019 | N/A — 제출이 있어야 성립 | `busy={saving}` → 확인 버튼 '처리 중…' + 잠김. 취소는 살아 있다 | 실패해도 **닫지 않는다** — 다이얼로그 안 배너 | **검증 통과 값만 도달** | 저장 버튼이 없어 도달 불가 | 확인 중 상대가 저장하면 확인 후 409 → EL-021 | 1건 |
| FS-070-EL-019.1 | `saved === undefined` 면 'OAuth 설정을 저장할까요?' | N/A — 순수 조립 | N/A — 서버 호출 없음 | N/A — 규칙 | N/A | **기준이 `data?.value` 라 재조회가 오면 문구가 바뀐다** | 최대 3개 이름 `·` 조인 |
| FS-070-EL-019.2 | N/A — 다이얼로그가 떠야 성립 | 저장 중에도 누를 수 있다(abort 경로) | abort 는 통지하지 않는다 | N/A | N/A | 서버 도달 여부는 미보장(§7 #16) | 단건 |
| FS-070-EL-020 | N/A — 규칙 | revision 없으면(로딩 중) 중단 | 실패는 EL-018 또는 EL-021 로 갈린다 | N/A — 검증은 상류에서 | N/A | `expectedRevision` 이 핵심 | 단건 |
| FS-070-EL-020.1 | N/A — 규칙 | 렌더와 무관하게 즉시 | 양쪽에서 `release`(`:136,147`) | N/A | N/A | **연타의 2번째가 멈춘다** | **멱등키 없음** — 재시도는 낡은 revision 때문에 409(§7 #7) |
| FS-070-EL-020.2 | N/A — 성공이 있어야 성립 | N/A | N/A — 성공 경로 | N/A | N/A | `setQueryData` 로 새 revision 즉시 반영 | **평문이 폼에서 지워진다 — 이것이 이 화면의 시크릿 계약**(테스트 3건이 고정) |
| FS-070-EL-021 | N/A — 충돌이 있어야 성립 | `busy={saving}` — 두 액션 잠김 | 덮어쓰기 실패 시 다이얼로그 안 배너. ✔ EL-018 이 중복 표시되지 않는다(`:247`) | N/A — 입력 없음 | 저장 불가라 도달 불가 | **이것이 경합 표현.** revision 토큰 기반(BE-070 §7.4) | 1건 |
| FS-070-EL-021.1 | **갈린 제공자가 0개면 목록을 그리지 않는다**(`ConflictDialog.tsx:115`) | N/A — 순수 계산 | N/A | N/A | N/A | `getValues().providers` vs `conflict.value.providers` | 최대 3개 이름. ⚠ **내게 없는 제공자는 건너뛴다**(§7 #13) |
| FS-070-EL-021.2 | N/A | `busy` 면 잠김 | `refetch()` 실패 시 EL-016 이 폼을 대체 — 불러온 값은 이미 폼에 있다 | N/A | N/A | reset 후 refetch 로 최신 revision 재취득. **`changingSecrets` 도 초기화** | 단건 |
| FS-070-EL-021.3 | N/A | `busy` 면 '처리 중…' | 실패 시 다이얼로그 유지 + 배너. 재클릭이 재시도 | N/A | N/A | **`force: true` — 상대 변경이 사라진다.** ⚠ **상대가 넣은 시크릿은 덮이지 않는다** — 내 `secret` 이 비어 있으면 서버가 기존을 유지한다(BE-070 §7.3) | 단건 |
| FS-070-EL-021.4 | N/A | 진행 중 저장을 abort | abort 는 통지하지 않는다 | N/A | N/A | 닫아도 revision 이 낡아 재저장 시 또 409 | 단건 |
| FS-070-EL-022 | N/A — dirty 여야 성립 | **저장 중 가드가 꺼진다**(`dirty && !saving`) | N/A — 서버 호출 없음 | N/A | `!canUpdate` 면 편집 불가라 dirty 가 안 된다 | 저장 성공 후 `reset(normalized)` 로 dirty 해제 | **입력한 평문 시크릿을 지키는 가드이기도 하다** |
| FS-070-EL-023 | 도착 전 `providers: []` — **카드가 0개**(스켈레톤이 대체) | `data === undefined` 면 reset 안 함 | 조회 실패 시 폼 미렌더 | N/A — 규칙 | N/A | **편집 중 재조회가 입력·평문 시크릿·`changingSecrets` 를 전부 덮는다**(§7 #8) | 단건 문서 |
| FS-070-EL-024 | N/A — 진행 요청이 있어야 성립 | 이것이 취소 규칙 | abort 는 실패가 아니다 | N/A | N/A | 서버 도달 여부 미보장(§7 #16) | 단건 |
| FS-070-EL-024.1 | N/A — 규칙 | N/A | **이것이 abort 판정 규칙**(EXC-09) | N/A | N/A | `signal.aborted` 를 양쪽에서 확인 | 단건 |
| FS-070-EL-025 | 기준선과 같으면 not-dirty | N/A — 동기 판정 | N/A | N/A | N/A | 기준선이 바뀌면 판정도 바뀐다 | ⚠ **'변경' 클릭이 dirty 를 만들지 않는다**(§7 #6) |
| FS-070-EL-026 | N/A — 제출이 있어야 성립 | 저장 중 버튼 비활성 + EL-020.1 | N/A — 검증은 로컬 | **이것이 유효성 게이트.** `noValidate` + zod | 권한 없으면 submit 버튼이 없다 | N/A | 3제공자 × 3필드 일괄 |
| FS-070-EL-027 | 오류가 없으면 빈 객체 | N/A — 파생 | N/A | 서버 422 를 필드에 꽂는 경로가 아니다(§7 #17) | N/A | N/A | 제공자당 최대 3필드 |

### 4.1 공통 예외 규칙

| 규칙 | 내용 |
|---|---|
| 네트워크 단절 | 조회 실패는 폼을 대체하는 인라인 배너(EL-016), 저장 실패는 카드 배너(EL-018). **오프라인 감지·복귀 재조회가 앱 전역에 없다**(`navigator.onLine` grep 0건) — §7 #18 |
| 세션 만료 | 401 은 앱 전역 인터셉터(`shared/query/queryClient.ts`)가 받아 `/login?returnUrl=/settings/oauth&reason=session_expired` 로 보낸다. **입력한 평문 시크릿은 그때 사라진다** — 프로그램적 이동이라 EL-022 가드가 발화하지 않는다. **다만 시크릿이 사라지는 것은 안전 방향의 결과**다 — §7 #18 |
| 요청 타임아웃 | 프론트 상한 없음(`AbortSignal.timeout` 앱 전역 0건). abort 는 언마운트·확인 취소·충돌 닫기에서만 — §7 #18 |
| 중복 제출 | `disabled` + **동기 잠금 `useSubmitLock`**(EL-020.1). **멱등키 없음** — `expectedRevision` 이 있어 재시도는 **중복 적용이 아니라 409**(§7 #7) |
| 실패 통지의 자리 | ① 조회 실패 = 폼 대체 배너 ② 저장 실패 = 카드 배너(다이얼로그가 떠 있으면 그 안에만 — `:247` 이 세 조건을 전부 본다) ③ 저장 **성공** = 토스트 ④ 409 = 충돌 다이얼로그 ⑤ abort = 아무것도 띄우지 않는다 |
| 낙관적 업데이트 | **이 화면에 없다.** 저장은 비관적 — 롤백 경로가 필요 없다 |
| 동시 조회 | `useSettingsQuery` 가 `queryKey: ['settings','oauth']` 로 1건만 유지. 전역 `staleTime` 30초 · `retry: false` · `refetchOnWindowFocus: false` 를 따른다(재정의 없음) |
| 권한 없음 | **read** — `RequirePermission` 이 `<Outlet>` 을 감싸 403 화면(`AppShell.tsx:20`). 리소스는 `page:/settings/oauth`(`route-resource.ts:32-35`). **write** — `useRouteWritePermissions().canUpdate`(`:78`)가 저장 컨트롤을 게이팅(EL-013·EL-014). 권한 스토어 변경 시 재렌더 → **강등 reconcile 이 별도 코드 없이 성립**(`RequirePermission.tsx:23-25`). 서버 403 은닉 정책은 BE-070 §7.6 |
| 렌더 예외 | AppShell 이 `<Outlet>` 바깥에 `ErrorBoundary`(`AppShell.tsx:484`) — 사이드바가 남고 `RouteErrorScreen`. **입력한 평문 시크릿은 사라진다**(안전 방향) |
| 프론트 검증은 보증이 아니다 | zod 는 UX 다. 서버가 같은 규칙을 다시 검증한다(BE-070 §7.1) — `data-source.ts:52` 심이 `422 → 검증 실패` 를 명시 |
| **시크릿의 수명** | 입력된 평문은 **RHF 폼 상태에만** 산다(`providers.<i>.secret`). ① **저장 성공** → `normalizeAfterSave` 가 비운다(EL-020.2) ② **저장 실패** → 남는다(재시도 가능 — 옳다) ③ **재조회** → `reset(data.value)` 가 덮는다(§7 #8) ④ **이탈** → 사라진다(EL-022 가드가 경고). **조회 응답에 시크릿이 실리지 않으므로**(`data-source.ts:4,49`) 폼에 채워질 경로가 없다. ⚠ **API Key 화면과 달리 평문이 폼 상태에 산다** — 불가피하다(사용자가 입력하는 값이다) |

## 5. 서버 연동 지점

| 요소번호 | 이름 | 읽기/쓰기 | 필요 데이터 | 프론트 어댑터 | 비고 |
|---|---|---|---|---|---|
| FS-070-EL-011 / EL-016 / EL-017 / EL-023 | OAuth 설정 조회 | R | `{ value: OAuthSettingsValues, revision, audit }` — **`secret` 은 실리지 않는다** | `oauthSettingsStore.fetch(signal)` (`_shared/store.ts:108-112`) | `useSettingsQuery(oauthSettingsKey, oauthSettingsStore)`. 심(`data-source.ts:49`): 'GET 응답: providers[] — clientId·redirectUri·enabled·hasSecret. **secret 은 실리지 않는다**' |
| FS-070-EL-013 / EL-018 / EL-020 / EL-020.2 / EL-021 | OAuth 설정 저장 | W | `{ value, expectedRevision, force? }` — `providers[]` 에 **`secret?` 포함** | `oauthSettingsStore.save(input, signal)` (`_shared/store.ts:114-134`) | `useSaveSettings`. 심(`:50-51`): 'PUT 요청: If-Match + providers[] { provider, enabled, clientId, redirectUri, secret? } — **secret 이 없거나 빈 문자열이면 서버는 기존 시크릿을 유지한다(덮어쓰지 않는다)**'. revision 불일치 → `SettingsConflictError` |
| FS-070-EL-021.2 | 최신 내용 재조회 | R | 위와 동일 | `refetch()` (react-query) | 충돌 해소 경로 |
| FS-070-EL-010 | **연결 테스트** | W | `provider` | **없음 — 버튼이 비활성이다** | **심은 있다**(`OAuthProviderCard.tsx:228-231` `// TODO(backend): POST /api/settings/oauth/:provider/test`)**나 어댑터가 없다.** '서버가 제공자에게 실제로 토큰 교환을 시도하고 결과를 돌려준다. **프론트가 흉내 낼 수 없다**(시크릿은 서버에만 있고 CORS 도 막힌다). 백엔드가 붙으면 이 버튼이 활성화되고 결과는 인라인 배너로 표시한다' — **연동 시 화면 코드가 함께 바뀐다**(§7 #19) |
| FS-070-EL-004 / EL-005 | 제공자 후보 목록 | — | — | **없음 — `OAUTH_PROVIDERS`·`OAUTH_PROVIDER_META` 코드 상수**(`validation.ts:14,25-37`) | **서버를 거치지 않는다.** 3종(google·kakao·naver)이 빌드 시점에 고정되며 새 제공자를 추가하려면 코드를 고쳐야 한다. **의도된 부재** — 제공자마다 인증 흐름·SDK 가 달라 데이터로 추가할 수 없다(BE-070 §7.7) |

> **현재 구현 상태 (백엔드 명세 참고)**: 백엔드는 없다. `oauthSettingsStore` 는 `createRevisionedStore('oauth', DEFAULT_OAUTH_SETTINGS, { updatedBy: '김운영', updatedAt: '2026-07-02T08:05:00.000Z' })`(`data-source.ts:53-57`)로 만든 **브라우저 안 mutable 클로저 1건**에 400ms 지연(`LATENCY_MS`)과 실패 스위치(`failIfRequested('oauth', op)`)를 얹은 것이다 — 실제 네트워크 0건. **저장소가 평문 시크릿을 갖지 않는다** — `hasSecret` 불리언만 안다(`:3-5`). 픽스처는 **세 제공자 모두 꺼져 있고 자격증명이 없다**(`:19-46`) — `:15-17` 이 이유를 밝힌다: '켜져 있는 척하면 "왜 로그인이 안 되지" 로 돌아온다 — 백엔드가 없으니 실제로 동작하지 않는다'. Redirect URI 픽스처는 `https://example.com/auth/<provider>/callback`. 저장 주체는 하드코딩 `CURRENT_ADMIN = '김운영'`(`_shared/store.ts:84`). 새로고침하면 시드로 돌아간다. 연동 심 2건: `data-source.ts:48-52`(`GET`/`PUT` + `If-Match` + **secret 유지 규칙** + 200/409·412/422) · `OAuthProviderCard.tsx:228-231`(`POST /api/settings/oauth/:provider/test` — **어댑터 없음**). BE-070 §4 는 이 심들을 그대로 계약으로 옮긴 것이며 **발명한 엔드포인트가 없다.** 위 표는 백엔드 연결 후 의도된 동작이다. |

## 6. 자기 점검 (제출 전 확인)

- [x] 구현 소스를 전수 대조했다 — `OAuthPage.tsx` · `data-source.ts` · `validation.ts` · `oauth.test.ts` · `components/OAuthProviderCard.tsx` · `_shared/{SettingsFormShell,ConflictDialog,AuditNote,secret,queries,store,diff}`
- [x] 보이지 않는 요소(스켈레톤·조회/저장 실패 배너·읽기전용 안내·미사용 안내·확인/충돌 다이얼로그·이탈 가드·시크릿 3상태 규칙·정규화·동기 잠금·abort 규칙·dirty 판정·reset 규칙·오류 전달 규칙)에 번호를 줬다
- [x] §4 예외 7축 빈칸 0건. 모든 `N/A` 에 사유
- [x] `[서버]` = O 요소가 §5 에 전부 요약됐다. **심은 있으나 어댑터가 없는 연결 테스트(EL-010)** 와 **서버를 거치지 않는 제공자 후보 목록(코드 상수)** 을 '없음'으로 명시했다
- [x] 엔드포인트·HTTP·에러코드·DB 스키마를 쓰지 않았다 (BE-070 영역)
- [x] **in-content `<h1>` 이 없음을 grep 으로 확인**하고 EL-001 에 기록했다 — IA-02 판정 근거
- [x] **`OAuthProviderCard.tsx:156-203` 의 `aria-required` 경로를 코드로 재확인**하고 EL-008 · EL-008.4 · §7 #2 에 기록했다 — 자식이 삼항 양쪽 모두 `<span>`(`:168` · `:176`)이라 `FormField.tsx:36-41` 의 주입은 여전히 일어나지 않으나, **PR #30 이후 호출부가 진짜 `<input>`(`:177`)에 직접 준다**(`:113,114,186`, 근거 `:103-112`). **이전 배치의 '이 화면의 대표 결함' 판정은 해소됐다.** `required` 와 `showMasked` 가 상호 배타적이라 **required 일 때는 항상 입력 분기임**(`:110` 이 논증)을 EL-008.1 에 유지했다 — 그것이 이 해법이 성립하는 근거다
- [x] **PR #30 이후 `OAuthProviderCard.tsx` 의 라인이 +13 이동해 이전 배치 인용이 전부 어긋나 있었다** — EL-005·006·007·008·008.1~008.5·009·010 과 §5·§7 의 인용 라인을 실제 파일로 재확인해 고쳤다
- [x] **시크릿이 폼에 채워지지 않음**(`validation.ts:3-11`)과 **저장이 평문을 지움**(`normalizeAfterSave` + 테스트 3건)을 §1.1 · EL-020.2 · §4.1 에 고정했다
- [x] §7 의 미결 항목이 BE-070 §7.9 · NFR-070 §5 와 일치한다

## 7. 미결 사항 (UI 기획 / 아키텍처 / 백엔드 명세 / 프론트 구현 이관)

| # | 내용 | 이관 대상 |
|---|---|---|
| 1 | 대응 SCR 문서 부재 (시스템 설정 SCR 미작성) | UI 기획 / 아키텍처 |
| 2 | ~~**Client Secret 의 `aria-required` 가 주입되지 않는다**~~ — **PR #30 에서 해소됐다(기록으로만 남긴다).** 자식이 삼항 양쪽 모두 `<span style={secretRowStyle}>` 래퍼(`OAuthProviderCard.tsx:168`·`:176`)라 `FormField.tsx:36-41` `isRequirableChild` 가 거부하는 사실은 **그대로**이나, 이전 배치가 제시한 해법('입력 분기의 `<input>` 에 직접 준다')이 **그대로 채택됐다**: `secretRequired`(`:113`) · `secretRequiredProps = secretRequired ? { 'aria-required': true } : {}`(`:114`) → `<input type="password">` 에 spread(`:186`). **`false` 면 속성 자체를 생략한다**(`aria-invalid` 를 짝지어 다루는 방식과 같다). 근거 주석 `:103-112` 가 '래퍼에 얹으면 거짓 시맨틱이라 FormField 가 의도적으로 거부한다 → **호출부가 진짜 컨트롤에 준다**'를 못박았다. 컴포넌트 테스트 4건 신설(`OAuthProviderCard.test.tsx:61-88`) | **해소 — 재작업 없음** |
| 3 | **마스킹 분기에 `FormField htmlFor` 가 가리킬 컨트롤이 없다** — `showMasked` 면 자식이 `<span>` 뿐이라(`:168-174`) `<label for="oauth-<p>-secret">` 이 **존재하지 않는 id 를 가리킨다.** 라벨 클릭이 아무 데도 포커스하지 않고, AT 가 라벨을 컨트롤과 연결하지 못한다. **#2 와 뿌리(래퍼)는 같으나 별개 증상이며 #2 가 해소된 뒤에도 남아 있다** — PR #30 은 required 축만 고쳤고, 이 증상은 required 가 false 인 분기(`:110` 이 논증)에서 나므로 그 수정으로 닿지 않는다 | UI 기획 쪽 변경 요청 |
| 4 | **연결 테스트 비활성 사유가 버튼과 연결되지 않는다** — `<p style={hintStyle}>연결 테스트는 백엔드 연동 후 제공됩니다.</p>`(`:235`)가 형제 노드일 뿐 `aria-describedby` 가 없다. **시각 사용자만 왜 비활성인지 안다.** 언어 화면의 잠금 사유(FS-068 §7 #4)·API Key 의 스코프 오류(FS-069 §7 #3)와 같은 계열 — **섹션 전체에 반복되는 패턴** | UI 기획 쪽 변경 요청 |
| 5 | **검증 실패 시 첫 오류 필드로 포커스가 가지 않는다** — `handleSubmit(onValid)`(`:261`)에 `onInvalid` 가 없다. **이 화면에서 특히 아프다**: 제공자 3 × 필드 3 = 최대 9개 오류가 한 번에 뜰 수 있는데 어디를 고쳐야 하는지 포커스가 알려주지 않는다(quality-bar A11Y-13 P1). 설정 폼 3화면 공통 | UI 기획 쪽 변경 요청 |
| 6 | **'변경' 버튼(EL-008.3)을 눌러도 dirty 가 되지 않는다** — `changingSecrets` 는 폼 밖 `useState`(`:105`)라 RHF `isDirty` 에 잡히지 않는다. **입력칸이 열렸는데 저장 버튼이 비활성**이고 상태 문구는 '변경 사항이 없습니다.'라 말한다. 시크릿을 입력하면 dirty 가 되므로 실질 피해는 작으나 **'변경'을 눌러 놓고 이탈하면 가드도 안 뜬다** | UI 기획 쪽 변경 요청 |
| 7 | 저장에 **멱등키가 없다** — 동기 잠금(EL-020.1)은 연타를 막지만 응답 유실 후 재시도는 새 요청이 된다. `expectedRevision` 덕에 중복 적용이 아니라 **409** 가 되나 사용자는 영문 모를 충돌 다이얼로그를 본다. 선례: `members/components/PointsCard.tsx:103,162-173`(quality-bar EXC-08 P0) | UI 기획 · 백엔드 명세 (BE-070 §7.5) |
| 8 | 데이터 도착 시 `reset(data.value)` + `setChangingSecrets([])` 하는 효과(EL-023)가 **편집 중 재조회에서도 돈다** — **입력하던 평문 시크릿이 사라지고** 변경 중 UI 가 마스킹으로 되돌아간다. 설정 4화면 공통이나 **이 화면은 잃는 것이 시크릿이라 더 아프다**(다시 발급받아 와야 할 수도 있다) | UI 기획 쪽 변경 요청 |
| 9 | **마스킹 표기가 API Key 화면과 다르다** — 이 화면은 `••••••••••••`(last4 없음 — `_shared/secret.ts:36-37` '식별이 이름으로 충분하다'), API Key 는 `sk_test_••••0001`. **둘 다 근거가 있어 결함은 아니나** 한 섹션 안에서 시크릿 표기가 두 가지다. 운영자가 '왜 여긴 뒷자리가 없지?'라 물을 수 있다 | 아키텍처 (도메인 경계) · UI 기획 |
| 10 | **카드 안에 카드가 있다** — `SettingsFormShell` 의 `<Card>`(`:145`) 안에 `OAuthProviderCard` 의 `<Card>`(`:108`) 3개. shadow·padding 이 중첩돼 시각적 위계가 흐려질 수 있다. 다른 3화면은 단층이다 | UI 기획 쪽 변경 요청(경미) · 프론트 리팩터(DS 판정) |
| 11 | **Redirect URI(EL-009)·Client ID(EL-007) 에 길이 상한이 갈린다** — Client ID·Secret 은 `maxLength=200` 인데 **Redirect URI 는 `maxLength` 가 없고 스키마도 길이를 보지 않는다.** 사이트 설정의 `baseUrl` 도 같은 문제다(FS-067 §7 #13) | UI 기획 쪽 변경 요청 |
| 12 | **URL 검증 방식이 섹션 안에서 갈렸다** — 이 화면은 **URL 파서**(`new URL()` — `validation.ts:60-65`), 사이트 설정은 **정규식**(`HTTPS_URL_RE` — `site/validation.ts:25`). **파서 쪽이 옳다**(정규식은 `https://evil@real.example.com` 류 authority 트릭을 거르지 못한다 — BE-067 §7.6 #4). `redirectUriError` 를 `_shared` 로 승격해 양쪽이 쓰는 것이 옳다 | UI 기획 쪽 변경 요청 |
| 13 | **충돌 표시(EL-021.1)가 내게 없는 제공자를 건너뛴다** — `if (ours === undefined) return false`(`:210`). 상대가 제공자를 추가했으면 그 사실을 짚지 못한다. **현재는 제공자가 코드 상수 3종이라 실현되지 않으나** 제공자가 데이터로 바뀌면 발현된다 | UI 기획 쪽 변경 요청(잠재) |
| 14 | **Client ID·Secret 에 카운터가 없다** — `maxLength=200` 인데 `FormField counter` 를 주지 않는다. `_shared/fields.tsx:34` 가 '길이 제한이 있는 필드는 반드시 준다 (COMP-12)'를 계약으로 못박는데 **이 화면은 `TextInputField` 를 쓰지 않고 직접 조립해 그 계약을 상속하지 못했다**(quality-bar COMP-12 P1) | UI 기획 쪽 변경 요청 |
| 15 | 조회 실패(EL-016)·저장 실패(EL-018)가 **status 를 구분하지 않는다** — 401/403/404/500 이 한 문구다. `createRevisionedStore` 가 `HttpError`(status 보유)를 던지지 않아 화면이 분기할 근거가 없다(quality-bar EXC-06 · EXC-12 P1) | UI 기획 · 백엔드 명세 |
| 16 | 이탈·취소 시 abort 는 **클라이언트만 결과를 버릴 뿐** 서버 도달 여부를 보장하지 않는다 — 이미 반영된 저장이 화면에 안 보일 수 있다 | 백엔드 명세 (BE-070) |
| 17 | 서버 422 의 `error.fields` 를 RHF `setError` 로 꽂는 경로가 없다(EL-027 은 **로컬** 오류만 전달) — `useCrudForm` 미사용. **이 화면에서 특히 아깝다**: 서버가 `providers[1].redirectUri` 처럼 정확한 경로를 아는데 화면이 버린다(quality-bar EXC-07 P1) | UI 기획 |
| 18 | 프론트 타임아웃 상한 없음(`AbortSignal.timeout` 0건) · 오프라인 감지 없음(`navigator.onLine` 0건) · 세션 만료가 입력한 평문 시크릿을 버린다(**안전 방향이나 재입력 부담**)(quality-bar EXC-05 · EXC-11 · EXC-19 P1) | UI 기획 · 프론트 구현 |
| 19 | **연결 테스트(EL-010)는 심만 있고 어댑터가 없다** — 연동 시 **어댑터 신설 + 화면 배선**(로딩·성공/실패 인라인 배너·재시도)이 **신규 요구사항으로 발생**한다. `OAuthProviderCard.tsx:217` 이 그 계획을 적어 뒀다. **어댑터 본문만 바꾸면 되는 다른 연동과 다르다** — 연동 산정에 반드시 포함할 것 | **UI 기획 · 백엔드 명세 (연동 산정)** |
| 20 | **제공자가 코드 상수 3종이라 화면에서 추가할 수 없다**(§5) — 의도된 부재(제공자마다 인증 흐름·SDK 가 다르다)이나 **명시된 근거가 코드에 없다**. Apple·GitHub 등을 추가하려면 코드를 고쳐야 한다는 사실이 문서에만 있다 | 아키텍처 (도메인 경계) |
</content>
