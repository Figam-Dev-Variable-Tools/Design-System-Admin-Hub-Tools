// 연동 카탈로그 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// ┌ ⚠ 이 카탈로그는 **AI 전용이 아니다** (2026-07-22) ─────────────────────────┐
// │ 한때는 그랬고, 그래서 화면 곳곳이 스스로를 'AI 프로바이더 진열대' 라 불렀다.
// │ 배송 분류(CJ대한통운)가 들어오면서 그 문장들은 **거짓이 됐고** 전부 고쳤다.
// │ 새 분류를 더할 때 같은 일이 반복되지 않도록: **화면의 낱말은 카탈로그가 담은
// │ 것 전체를 가리켜야 한다.** 'AI' 라고 적으려면 그 문장이 AI 항목에만 붙어야 한다.
// │ (내부 식별자에는 아직 `Ai` 접두사가 남아 있다 — 그 이름들은 이 폴더 밖
// │  src/wiring.ts 에서 import 되므로 이번 변경에 포함하지 않았다.)
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 이 파일이 존재하는 이유: **화면이 아니라 파이프라인을 만든다** ────────────────┐
// │ 목록을 JSX 로 손으로 나열하면 상태 판정도, 탭 집계도, '앱 설정' 이 어디로       │
// │ 가는지도 전부 마크업 속에 흩어진다.                                          │
// │                                                                          │
// │ 그래서 연동을 **데이터로** 모델링한다(Integration). 새 연동이 붙는 일은         │
// │ 카탈로그에 항목을 한 줄 더하는 일이 된다 — 화면은 손대지 않는다.                │
// │ ✔ 자격증명 저장 화면(`/settings/api-keys/:providerId`)이 그 예다: 7종이 **같은  │
// │ 화면 하나**를 쓰고, 각자 요구하는 칸은 아래 `credentials` 에서 나온다.          │
// │                                                                          │
// │ ✔ **빼는 일도 마찬가지로 한 곳에서 끝난다** — 아래 '무엇을 뺐나' 참고.          │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 무엇을 뺐나 — 13종 → 6종 (운영자 요구, 2026-07-22) ────────────────────────┐
// │ ① 모델 5종: Mistral AI · Perplexity · Cohere · DeepSeek · Groq              │
// │ ② 게이트웨이 분류 통째: OpenRouter · Together AI                            │
// │    → `gateway` 는 이제 **분류 축에 없다**. 그 분류에 있던 항목이 둘뿐이었고     │
// │      둘 다 빠졌으므로, 빈 탭을 남기는 대신 축에서 지웠다. 빈 탭은 '아직 안       │
// │      채웠나' 라는 잘못된 기대를 만든다.                                       │
// │                                                                          │
// │ 남은 것: openai · claude · gemini · grok(모델) + azure-openai ·             │
// │ amazon-bedrock(파운데이션 모델).                                            │
// │ 그 뒤 배송 분류와 cj-logistics 가 더해져 지금은 7종이다.                      │
// │                                                                          │
// │ ⚠ **이미 저장된 연동이 뺀 id 를 가리킬 수 있다** — 그 처리 방침은 아래           │
// │ `orphanedConnectionIds` 머리말에 있다. 조용히 사라지게 두지 않는다.            │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 자격증명은 '키 하나' 가 아니다 ────────────────────────────────────────────┐
// │ 각 항목이 **자기가 요구하는 자격증명의 모양**을 타입으로 들고 다닌다             │
// │ (credentials: readonly AiCredentialField[]).                              │
// │                                                                          │
// │ 'API 키 한 칸이면 되겠지' 로 폼을 만들면 Azure OpenAI(엔드포인트 + 배포명 +      │
// │ api-version)나 Amazon Bedrock(토큰 + 리전)에서 **저장은 되는데 호출이 실패하는** │
// │ 가장 진단하기 어려운 고장이 난다. 요구가 타입에 드러나 있으면 그 폼을 만들 수    │
// │ 없다 — 그것이 이 필드가 여기 있는 이유다.                                    │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 가짜 성공을 만들지 않는다 ─────────────────────────────────────────────────┐
// │ 상태(status)는 **지어내지 않고 해소한다**(resolveIntegrations) — 저장된        │
// │ 자격증명(./data-source.ts)에서만 나온다. 픽스처로 연동된 척 채우지 않는다:      │
// │ 아무것도 저장하지 않은 상태에서는 6/6 이 '연동 해제' 이고, **운영자가 실제로     │
// │ 저장해야** 완료가 된다.                                                     │
// │                                                                          │
// │ 같은 이유로 '앱 설정' 은 갈 곳이 있을 때만 활성이고, 없으면 **왜 못 가는지**를    │
// │ 말한 채 비활성이다 (settingsPath === null → settingsUnavailableReason).       │
// │ 지금은 6종 모두 갈 곳이 있으므로 전부 활성이다.                               │
// └──────────────────────────────────────────────────────────────────────────┘
import type { BrandMarkId } from '../../../shared/ui';
import { connectionIsUsable } from './ai-connections';
// 택배사의 정본은 배송 정책이다 — 이 카탈로그는 코드로 가리키기만 한다.
// (아래 CJ 항목의 `carrierCode` · shared/domain/carrier-integration.ts 머리말)
import type { AiConnection, AiCredentialField } from './ai-connections';
import { aiConnectionPath } from './paths';

/**
 * 분류 축 — **셋이다.**
 *
 * ┌ 식별자와 화면 문구는 **같은 낱말**이어야 한다 ────────────────────────────┐
 * │ 직전 기준에서는 그렇지 않았다: 식별자가 `cloud` 인데 화면은 '파운데이션 모델'  │
 * │ 이라 불렀다. 그러면 코드를 읽는 사람과 화면을 보는 사람이 **같은 분류를 다른   │
 * │ 이름으로 부르게 되고**, 버그 리포트('클라우드 탭이…')를 받은 사람이 화면에서   │
 * │ 그 탭을 찾지 못한다.                                                     │
 * │                                                                         │
 * │ 그래서 이번에 `cloud` → `foundation` 으로 개명했다. 안전한 개명인 근거:      │
 * │   · 이 식별자는 **탭 상태와 분류 비교에만** 쓰인다(아래 filterIntegrations).  │
 * │   · URL 에 실리지 않는다 — 주소는 `/settings/api-keys/:providerId` 뿐이고    │
 * │     그 자리에 들어가는 것은 분류가 아니라 항목 id 다(./paths.ts).            │
 * │   · 저장 문서에 실리지 않는다 — AiConnectionRecord 에 분류 칸이 없다.        │
 * │   · 백엔드 계약에 실리지 않는다 — TODO(backend) 의 어느 페이로드에도 없다.    │
 * │ 셋 다 확인한 뒤에 바꿨다. 하나라도 실렸다면 개명은 마이그레이션이 된다.        │
 * │                                                                         │
 * │ 새로 넣는 `shipping`('배송')도 같은 규칙을 따른다 — 식별자와 문구가 같은 말이다.│
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌ `gateway` 가 사라진 자리 ────────────────────────────────────────────────┐
 * │ 분류는 한때 셋이었다(모델 · 클라우드 · 게이트웨이). 게이트웨이에 있던 두 항목이 │
 * │ 카탈로그에서 빠지면서 **그 분류를 가진 항목이 0이 됐고**, 그래서 축에서도 지웠다.│
 * │ 유니온에 남겨 두면 `countIntegrations` 가 언제나 0 을 세고 탭이 '게이트웨이 (0)'│
 * │ 로 남는다 — 없는 것을 '아직 없는 것' 처럼 보이게 하는 화면이다.                │
 * │                                                                         │
 * │ 되살릴 일이 생기면 이 배열에 한 줄, 라벨 표에 한 줄이면 된다(탭은 파생된다).    │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export const INTEGRATION_CATEGORIES = ['model', 'foundation', 'shipping'] as const;

export type IntegrationCategory = (typeof INTEGRATION_CATEGORIES)[number];

/**
 * 화면에 나가는 분류 이름 — **식별자와 같은 낱말이다**(위 개명 절).
 *
 * ┌ 왜 '클라우드' 가 아니라 '파운데이션 모델' 인가 ───────────────────────────┐
 * │ 운영자 요구다: Azure OpenAI · Amazon Bedrock 을 **'클라우드' 라고 부르지     │
 * │ 않는다**. 두 항목이 파는 것은 클라우드 자원이 아니라 **그 위에서 부르는       │
 * │ 파운데이션 모델**이고, 화면의 낱말은 운영자가 사는 것을 가리켜야 한다.        │
 * │                                                                         │
 * │ 그런데 **분류 자체는 남긴다** — 두 항목을 `model` 로 합치지 않는다. 이 축이    │
 * │ 가르는 것은 이름이 아니라 **자격증명의 성격**이기 때문이다: 왼쪽은 키 한 칸이고 │
 * │ 오른쪽은 계정 안의 특정 리소스/리전에 매여 있어 키만으로는 어디로 보낼지를      │
 * │ 모른다(아래 `credentials`). 합치면 그 사실이 목록에서 사라진다.               │
 * │                                                                         │
 * │ ✔ 그래서 식별자도 `foundation` 이다 — 한때 `cloud` 였고 그때는 코드와 화면이  │
 * │ 다른 낱말로 같은 분류를 불렀다(위 개명 절이 그 정리의 근거를 담는다).          │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ┌ '배송' 은 AI 가 아니다 — 그런데 왜 같은 진열대에 있나 ─────────────────────┐
 * │ 이 화면이 모으는 것은 '**이 어드민이 밖으로 거는 연동**' 이지 AI 가 아니다.    │
 * │ 자격증명을 넣고 켜고 끄는 일의 모양이 같으면 같은 진열대에 서는 것이 맞다 —    │
 * │ 배송사 연동을 위해 두 번째 진열대를 만들면 운영자는 '연동은 어디서 하지' 라는  │
 * │ 질문에 두 곳을 뒤져야 한다.                                                │
 * │                                                                         │
 * │ ⚠ 대신 **택배사 자체를 여기서 정의하지 않는다.** 그 원장은 배송 정책          │
 * │ (/products/shipping)이고, 이 카탈로그는 아래 `carrierCode` 로 그것을 가리킬   │
 * │ 뿐이다(shared/domain/carrier-integration.ts 머리말에 방향과 근거).           │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
const CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  model: '모델',
  foundation: '파운데이션 모델',
  shipping: '배송',
};

export function integrationCategoryLabel(category: IntegrationCategory): string {
  return CATEGORY_LABEL[category];
}

/** 연동은 붙어 있거나 아니거나 둘 중 하나다 — '연동 중' 같은 중간 상태를 만들지 않는다 */
export type IntegrationStatus = 'connected' | 'disconnected';

/* ── 자격증명 조각 ───────────────────────────────────────────────────────────
 *
 * 여러 프로바이더가 같은 모양의 칸을 요구한다. 조각을 공유해 라벨과 힌트가 갈라지지 않게 한다
 * (한쪽만 고쳐지는 날이 오면 같은 칸이 두 이름으로 불린다). */

const API_KEY_FIELD: AiCredentialField = {
  key: 'apiKey',
  label: 'API 키',
  required: true,
  hint: '프로바이더 콘솔에서 발급한 키예요. 저장하면 다시 볼 수 없어요.',
};

/** 설명만 다른 키 칸 — 라벨은 공유하고 힌트만 갈아 끼운다 */
function apiKeyField(hint: string): AiCredentialField {
  return { ...API_KEY_FIELD, hint };
}

/**
 * 이 카탈로그가 **비밀 여부를 적지 않는다** — 그 답은 칸 이름 하나가 갖는다
 * (./ai-connections.ts 의 `CREDENTIAL_SECRECY`). 여기 적을 자리를 두면 같은 칸이
 * 한 항목에서는 비밀이고 다른 항목에서는 공개가 될 수 있고, 그 갈라짐은
 * **그 프로바이더에서만 평문이 저장 문서에 남는** 형태로 나타난다.
 */

/**
 * 프로바이더 기본 주소를 갈아 끼우는 칸 — **선택이고 공개다.**
 *
 * ┌ 왜 넷 모두에 두는가 ────────────────────────────────────────────────────┐
 * │ '교체가 정상 사용법' 인 곳이 실재하기 때문이다. xAI 공식 문서는 OpenAI       │
 * │ 클라이언트에 `base_url="https://api.x.ai/v1"` 을 끼워 쓰라고 안내하고,       │
 * │ Gemini 는 OpenAI 호환 엔드포인트(`/v1beta/openai/`)를 따로 연다.            │
 * │ (둘 다 2026-07 에 1차 문서에서 확인했다.)                                  │
 * │                                                                        │
 * │ 그리고 이 한 칸이 프록시·게이트웨이·리전 대응을 함께 흡수한다 — 그것들을      │
 * │ 위해 칸을 따로 만들면 같은 값이 세 이름으로 불린다.                          │
 * │                                                                        │
 * │ ⚠ 파운데이션 모델 2종에는 두지 않는다: 거기서 주소를 정하는 칸은 이미         │
 * │ `endpoint`(Azure) · `region`(Bedrock) 이고, 둘을 함께 두면 어느 쪽이 이기는지  │
 * │ 를 화면이 답할 수 없다.                                                    │
 * └────────────────────────────────────────────────────────────────────────┘
 */
function baseUrlField(hint: string): AiCredentialField {
  return { key: 'baseUrl', label: '베이스 URL', required: false, hint };
}

/**
 * 기본으로 부를 모델 — **자유 입력·선택·공개다. 카탈로그에 목록을 박지 않는다.**
 *
 * ┌ 선택지로 만들지 않은 근거 셋 (전부 1차 문서에서 확인, 2026-07) ────────────┐
 * │ ① **목록이 우리 배포보다 빨리 낡는다.** `claude-opus-4-1-20250805` 는 이미  │
 * │    deprecated 이고 2026-08-05 에 retire 된다 — 박아 두면 다음 달에 죽는다.  │
 * │ ② **표시명과 API id 가 다르다.** OpenAI 문서는 표시명 'GPT-5.6 Sol' 과 id  │
 * │    `gpt-5.6-sol` 을 함께 싣는다. 표시명을 박으면 **틀린 문자열을 카탈로그가  │
 * │    보증**하게 되고, 운영자는 우리가 확인했다고 믿는다.                       │
 * │ ③ **키마다 보이는 모델이 다르다.** 그래서 전역 카탈로그는 원리적으로 정확할   │
 * │    수 없다 — 정확한 목록은 그 키로 `GET /models` 를 불러야만 나온다          │
 * │    (아래 TODO(backend) 의 모델 목록 프록시가 그 자리다).                     │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌ 그래서 검증은 **경고 전용**이다 ─────────────────────────────────────────┐
 * │ 형식 정규식(`^gpt-`·`^claude-`)을 박으면 `o3` · `grok-build-0.1` ·         │
 * │ `veo-3.1-generate-preview` 가 전부 거절된다. 이 리포는 이미 같은 판단을      │
 * │ 내려 뒀다 — ./validation.ts 머리말('길이·문자셋·접두어를 검사하지 않는다'),   │
 * │ 그리고 같은 모양의 선례가 둘 있다(endpointWarning · regionWarning).         │
 * │ 그래서 modelIdWarning 도 **되묻기만 하고 저장을 막지 않는다.**              │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ⚠ 힌트의 예시에는 **확인 날짜를 함께 적는다.** 낡은 목록이라도 낡았다는 사실이
 * 함께 적혀 있으면 거짓말이 아니다 — 날짜 없이 적으면 '지금 유효한 목록' 으로 읽힌다.
 */
function defaultModelField(examples: string): AiCredentialField {
  return {
    key: 'defaultModel',
    label: '기본 모델',
    required: false,
    hint: `비우면 클라이언트 기본값으로 불러요. 표시명이 아니라 API 가 받는 id 를 넣어요. ${examples} (2026-07 확인분 — 모델 목록은 빠르게 낡아요. 지금 쓸 수 있는 id 는 프로바이더 콘솔에서 확인하세요.)`,
  };
}

/* ── 브랜드 로고 이미지 ───────────────────────────────────────────────────────
 *
 * ┌ 왜 이 둘만 이미지(PNG)인가 ──────────────────────────────────────────────┐
 * │ Azure OpenAI · Amazon Bedrock 은 **공식 SVG 를 1차 출처에서 확보하지 못했고**  │
 * │ 넘겨받은 자산이 PNG 였다. 벡터가 없다고 해서 비슷하게 그린 벡터로 대체하지      │
 * │ 않는다 — 그것이 이 화면의 로고 규약이다(./components/ServiceGlyph.tsx).       │
 * │ 래스터라도 **진짜 자산**이 지어낸 벡터보다 정직하다.                          │
 * │                                                                         │
 * │ 앱 자산으로 내려받아 둔다(apps/admin/public/brand/). 외부 CDN 을 그대로       │
 * │ 가리키면 런타임 의존이 하나 늘고, 그쪽이 죽으면 우리 목록에 깨진 이미지가 뜬다.  │
 * │ 참조는 이 앱의 기존 정적 자산 관례대로 **절대 경로 문자열**이다('/fixtures/…'). │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
const AZURE_OPENAI_LOGO = '/brand/azure-openai.png';
const AMAZON_BEDROCK_LOGO = '/brand/amazon-bedrock.png';
/**
 * CJ대한통운 — 운영자가 자산 주소를 지정해 넘겼다(2026-07-22).
 *
 * ⚠ 출처는 CJ 의 브랜드 킷이 아니라 **주식 정보 사이트가 종목코드(000120)로 호스팅하는 타일**이다.
 * 그 사실을 여기 적어 두는 이유: 나중에 '공식 자산으로 교체' 를 판단할 사람이 이 값을 공식으로
 * 오해하지 않게 하기 위해서다. 넘겨받은 진짜 자산이므로 벡터를 지어내는 것보다 정직하지만,
 * 1차 출처는 아니다.
 *
 * 이 파일이 가리키는 것은 언제나 **내려받아 앱에 둔 사본**이다(apps/admin/public/brand/) —
 * 외부 주소를 그대로 쓰면 그쪽이 죽는 날 우리 목록에 깨진 이미지가 뜬다.
 */
const CJ_LOGISTICS_LOGO = '/brand/cj-logistics.png';

/**
 * 카탈로그 항목 — **상태가 없는** 정적 메타데이터.
 *
 * 상태와 연동 시각은 여기 적지 않는다: 적는 순간 그것이 '사실' 처럼 보이고,
 * 아무도 확인하지 않은 채 화면에 나간다. 상태는 resolveIntegrations 가 근거에서 만든다.
 */
export interface IntegrationCatalogueEntry {
  readonly id: string;
  readonly name: string;
  /**
   * 마크도 로고 이미지도 없을 때 배지에 그리는 **짧은 표기**. 카탈로그 안에서 **유일해야 한다**.
   *
   * ┌ 왜 이름에서 자동으로 따지 않는가 ────────────────────────────────────┐
   * │ 첫 글자만 따면 6종이 3종으로 뭉갠다:                                   │
   * │   A × 3 (Anthropic · Azure · Amazon) · G × 2 (Gemini · Grok)          │
   * │ 기본 '모델' 탭에서 똑같은 G 배지 둘이 나란히 놓인다.                     │
   * │                                                                     │
   * │ 앞 두 글자로 늘리면 지금은 우연히 갈리지만(An·Az·Am·Ge·Gr), 그것은 지금  │
   * │ 목록의 우연이다 — 한때 Grok/Groq 가 'Gr'/'Gr' 로 같았다(둘 다 빠졌다).   │
   * │ 그래서 규칙을 짜내는 대신 **항목마다 사람이 정한다**. 필드가 필수라       │
   * │ 프로바이더를 더할 때 결정을 건너뛸 수 없고, 유일성은 테스트가 고정한다.    │
   * └─────────────────────────────────────────────────────────────────────┘
   *
   * 장식이므로 접근성 대상이 아니다(ServiceGlyph 가 aria-hidden 으로 그린다) —
   * 이름은 옆의 텍스트가 전한다. 순수하게 **눈으로 갈리게** 하는 것이 목적이다.
   */
  readonly glyph: string;
  readonly category: IntegrationCategory;
  readonly description: string;
  /**
   * 이 프로바이더를 쓰려면 무엇이 필요한가 — **키 하나로 끝나지 않는 곳이 있다.**
   * 저장 폼은 이 목록에서 만들어져야 한다(손으로 칸을 나열하면 요구와 폼이 갈라진다).
   */
  readonly credentials: readonly AiCredentialField[];
  /**
   * 자격증명 화면에 붙는 **이 프로바이더만의 주의사항**. 없으면 null.
   *
   * ┌ 왜 카탈로그가 갖는가 ────────────────────────────────────────────────┐
   * │ 여기 적히는 것은 대개 '**입력칸으로 만들지 않은 이유**' 다 — Anthropic 의 │
   * │ `anthropic-version`, OpenAI 의 조직 헤더처럼. 그 결정의 근거는 이미 이   │
   * │ 파일의 각 항목 주석에 있고, 운영자가 읽어야 할 문장은 그 주석의 요약이다.  │
   * │ 화면에 흩어 두면 주석과 문구가 갈라진다.                                │
   * │                                                                     │
   * │ **필수 필드다** — 프로바이더를 더할 때 '이 곳만의 함정이 있는가' 를 한 번  │
   * │ 은 묻게 만든다. 없으면 명시적으로 null 을 적는다(빠뜨림과 구분된다).      │
   * └─────────────────────────────────────────────────────────────────────┘
   */
  readonly connectionNotice: string | null;
  /**
   * '앱 설정' 이 갈 곳. 설정 화면이 아직 없으면 null 이고, 그때는 reason 이 왜인지 말한다.
   * (버튼을 지우지 않고 비활성으로 남기는 이유: 없는 게 아니라 '아직' 이라는 사실도 정보다.)
   */
  readonly settingsPath: string | null;
  /** settingsPath 가 null 일 때 버튼 옆에 붙는 이유. 경로가 있으면 null */
  readonly settingsUnavailableReason: string | null;
  /**
   * '연동 방법 안내' 가 여는 외부 문서. **1차 문서 주소를 실제로 확인한 것만 적는다.**
   * 확인하지 못했으면 null 이고, 그때 메뉴 항목은 지워지지 않고 비활성 + 이유로 남는다.
   *
   * [그럴듯한 주소를 지어 쓰지 않는다] 링크는 눌러 봐야 죽은 줄 안다. 죽은 '연동 방법 안내' 는
   * 없는 것보다 나쁘다 — 운영자는 우리가 확인했다고 믿고 눌렀다가 404 를 본다.
   */
  readonly guideUrl: string | null;
  /**
   * 사용량·요금·**한도**를 어디서 보는지 알려 주는 1차 문서(또는 콘솔) 주소. 확인하지 못했으면 null.
   *
   * ┌ 왜 값이 아니라 링크인가 — 숫자를 이 화면에 들이지 않는다 ────────────────┐
   * │ 조사해 보니 **네 곳이 고르지 않다**: 프로그램으로 읽을 수 있는 곳도 있고    │
   * │ 콘솔 화면뿐인 곳도 있다. 더 결정적인 것은 OpenAI 다 — 사용량은 일반 API 키로 │
   * │ 읽히지 않고 **더 강한 admin 키**를 따로 받아야 한다. 그것은 이 화면이       │
   * │ **비밀을 하나 더 받아야 한다**는 뜻이고, '받는 비밀을 늘리지 않는다' 는      │
   * │ 이 섹션의 규약과 정면으로 부딪친다.                                       │
   * │                                                                        │
   * │ 넷 중 둘만 숫자를 보여 주는 화면은 '왜 여기는 안 나오지' 를 만든다. 그래서   │
   * │ **아무 숫자도 들이지 않고 갈 곳만 가리킨다** — 그 자리의 정본은 각 콘솔이다. │
   * │                                                                        │
   * │ `guideUrl` 과 같은 규율이다: **확인한 주소만 싣는다.** 확인하지 못하면 null  │
   * │ 이고, 그때 화면은 링크를 지어내지 않고 문장만 남긴다.                       │
   * └────────────────────────────────────────────────────────────────────────┘
   */
  readonly rateLimitUrl: string | null;
  /**
   * 목록에 그릴 **타사 브랜드 마크(인라인 벡터)**. 확보하지 못했으면 null.
   *
   * ┌ 지금 전부 null 인 이유 — 그리고 곧 넷이 채워진다 ─────────────────────┐
   * │ OpenAI · Anthropic Claude · Google Gemini · Grok 의 검증된 공식 path 를   │
   * │ 확보했다(넷의 path·viewBox 가 서로 다르고 각자 viewBox 안에 들어맞는 것을  │
   * │ 실측으로 확인했다 — 예전에 넘겨받은 두 SVG 가 **path 데이터까지 같았던**   │
   * │ 사고가 있어 이번에는 붙이기 전에 쟀다).                                  │
   * │                                                                       │
   * │ 그런데 마크의 원본은 이 파일이 아니라 shared/ui/brand-marks.tsx 다        │
   * │ (두 화면이 같은 자산을 쓴다). 그 파일은 **지금 다른 작업자가 편집 중이라**  │
   * │ 이번 변경에 포함하지 않았고, 마크가 없으니 `BrandMarkId` 에도 아직 없다.   │
   * │                                                                       │
   * │ TODO(brand-marks): 마크 4종이 그 파일에 들어오면 아래 네 항목의            │
   * │   `brand: null` 을 각각 `'openai'` · `'claude'` · `'gemini'` · `'grok'`   │
   * │   으로 바꾸는 것만 남는다 — **한 항목당 한 줄**이고 다른 변경은 없다.       │
   * │   (테스트는 '카탈로그가 말하는 브랜드는 실제로 마크가 있는 것뿐이다' 로      │
   * │   불변식을 걸어 두었으므로 오타는 그때 잡힌다.)                           │
   * └───────────────────────────────────────────────────────────────────────┘
   */
  readonly brand: BrandMarkId | null;
  /**
   * 목록에 그릴 **브랜드 로고 이미지**의 앱 내 절대 경로. 없으면 null.
   *
   * `brand`(인라인 벡터)와 **동시에 채우지 않는다** — 둘 다 있으면 어느 쪽이 그려지는지
   * 카탈로그만 보고 알 수 없다. 벡터를 확보하면 이 칸을 비우고 그쪽으로 옮긴다.
   *
   * 지금 이 칸을 쓰는 것은 공식 SVG 를 확보하지 못한 셋뿐이다(위 로고 이미지 절).
   */
  readonly logoSrc: string | null;
  /**
   * 이 연동을 **켜면 앱에서 무엇이 달라지는가** — 달라지는 것이 아직 없으면 null.
   *
   * ┌ 왜 필요해졌나 ──────────────────────────────────────────────────────┐
   * │ 저장 확인 다이얼로그가 'AI 화면의 응답 모드가 다시 잠깁니다' 라고 말하고   │
   * │ 있었다. AI 6종에는 참이지만 배송 연동에는 **거짓**이다 — 그 화면은 켜고    │
   * │ 꺼도 AI 응답 모드와 아무 관계가 없다.                                  │
   * │                                                                    │
   * │ 문장을 화면에 하드코딩하면 항목이 늘 때마다 거짓말이 하나씩 는다. 그래서  │
   * │ **항목이 자기 결과를 말한다**. null 은 '아직 부르는 곳이 없다' 는 뜻이고,  │
   * │ 그때 확인 문구는 그 문장을 아예 넣지 않는다(없는 결과를 지어내지 않는다). │
   * └────────────────────────────────────────────────────────────────────┘
   */
  readonly enableEffect: string | null;
  /**
   * 이 연동이 가리키는 **배송 정책의 택배사 코드**(Carrier.code). 택배 연동이 아니면 null.
   *
   * ┌ 여기 택배사를 정의하지 않는다 ───────────────────────────────────────┐
   * │ 등록된 택배사의 원장은 배송 정책(/products/shipping)이다. 이 카탈로그가   │
   * │ 이름·추적 URL 을 자기 사실로 들고 있으면, 정책에서 택배사를 지운 뒤에도   │
   * │ 연동은 멀쩡해 보이고 **두 화면이 서로 다른 사실을 말한다.**              │
   * │                                                                    │
   * │ 그래서 코드 하나만 든다. 그 코드로 원장에게 묻는 일은 공통 층이 한다      │
   * │ (shared/domain/carrier-integration.ts) — 페이지끼리는 서로를 모른다.     │
   * │                                                                    │
   * │ ⚠ 이 값은 **CJ 가 정한 코드가 아니라 우리 어드민의 연결 키**다. 그래서    │
   * │ 화면이 이 문자열을 그대로 보여 준다 — 운영자가 배송 정책의 택배사 코드를  │
   * │ 이 값으로 맞춰야 두 곳이 같은 택배사를 가리킨다.                        │
   * └────────────────────────────────────────────────────────────────────┘
   */
  readonly carrierCode: string | null;
  /**
   * 계약하면 함께 열리는 **API 묶음** — 묶음이 없으면 null.
   *
   * 목록을 그리는 이유는 '무엇을 살 수 있는지' 를 보여 주기 위해서다. **부를 수 있다는 뜻이
   * 아니다** — 화면이 그 사실을 함께 적고, API 마다 버튼이나 상태를 붙이지 않는다.
   */
  readonly apiPackage: IntegrationApiPackage | null;
}

/** 한 연동이 계약으로 얻는 API 묶음 — 이름과 그 안의 API 들 */
export interface IntegrationApiPackage {
  readonly name: string;
  /**
   * API 이름들 — **넘겨받은 표기 그대로** 둔다(괄호 안의 (공통)/(일반) 구분 포함).
   * 우리가 다듬으면 운영자가 포털에서 같은 이름을 찾지 못한다.
   */
  readonly operations: readonly string[];
}

/** 화면이 그리는 것 — 카탈로그(정적) + 해소된 상태(동적) */
export interface Integration extends IntegrationCatalogueEntry {
  readonly status: IntegrationStatus;
  /**
   * 연동을 **시작한** 시각. 한 번도 연결된 적 없으면 null 이고 표는 `-` 를 그린다.
   *
   * 설정을 마지막으로 고친 시각으로 대신하지 않는다 — 그것은 다른 사실이고,
   * 옆에 '연동 시작일' 이라 적어 두면 거짓말이 된다.
   */
  readonly connectedAt: string | null;
}

/**
 * ✔ **자격증명 저장 화면이 생겼다** — 6종 전부가 `/settings/api-keys/:providerId` 로 간다
 * (BE-069 §7.5 #1 해소). 그래서 이 카탈로그에는 `settingsUnavailableReason` 이 하나도 없다.
 *
 * 필드는 남겨 둔다: 새 프로바이더가 화면 없이 먼저 카탈로그에 올라오는 날이 다시 올 수 있고,
 * 그때 **버튼을 지우지 않고 이유를 말한 채 비활성으로 남기는** 규약이 여기 그대로 있어야 한다.
 */
const HAS_SETTINGS = null;

/**
 * 한도 페이지 주소를 확인하지 못했다 — 그럴듯한 콘솔 주소를 지어내지 않는다.
 *
 * ('연동 방법 안내'(guideUrl) 쪽에도 같은 뜻의 상수가 있었지만 7종이 모두 확인된 주소를
 *  갖게 되어 쓰는 곳이 0이 됐다. 쓰지 않는 이름을 남겨 두면 다음 사람이 '아직 못 채운
 *  항목이 있나' 라고 읽는다 — 그때는 `guideUrl: null` 한 줄이면 된다.)
 */
const LIMITS_UNVERIFIED = null;

/** 공식 벡터를 확보하지 못해 아직 인라인 마크가 없다 — 위 `brand` 주석의 TODO 참고 */
const MARK_PENDING = null;

/** 인라인 벡터로 그린다 — 이미지 자산을 쓰지 않는다 */
const NO_LOGO_IMAGE = null;

/**
 * AI 연동 6종이 공유하는 '켜면 달라지는 것' — 여섯이 **같은 결과**를 낳으므로 한 문장을 쓴다.
 * (문장이 여섯 벌이면 그중 하나만 고쳐지는 날이 오고, 같은 일을 두 말로 부르게 된다.)
 */
const AI_RESPONSE_MODE_EFFECT =
  '켜 두는 동안 AI 화면이 이 연동을 응답에 써요 — 켜진 연동이 하나도 남지 않으면 응답 모드가 다시 잠겨요.';

/** 켜도 앱에서 아직 달라지는 것이 없다 — 부르는 곳이 생기면 그때 문장을 채운다 */
const NO_EFFECT_YET = null;

/** 택배사와 무관한 연동이다 — 배송 정책을 가리키지 않는다 */
const NOT_A_CARRIER = null;

/** 묶음으로 파는 API 목록을 확보하지 못했다 — 지어내지 않는다 */
const NO_API_PACKAGE = null;

// TODO(backend): GET /api/settings/integrations
//   서버가 연동별 { id, status, connectedAt } 을 돌려주면 아래 해소기의 갈래가 하나로 준다 —
//   카탈로그(이름·설명·자격증명 요구)는 그대로 프론트가 소유한다(문구는 화면의 것이다).
const INTEGRATION_CATALOGUE: readonly IntegrationCatalogueEntry[] = [
  /* ── 모델 제공자 — 우리가 직접 부르는 곳 ───────────────────────────────── */
  {
    id: 'openai',
    name: 'OpenAI',
    glyph: 'OA',
    category: 'model',
    description: 'GPT 계열 모델을 불러요. 글 생성·요약·분류 전반에 써요. 키 하나로 연동돼요.',
    /* ┌ 조직·프로젝트 ID 에 칸을 **주기로 판단을 뒤집었다** (2026-07 재조사) ────┐
     * │ 직전 기준은 '다중 조직 계정에서만 쓰는 선택 값이라 칸을 두지 않는다' 였다.  │
     * │ 그런데 1차 문서(developers.openai.com/api/reference/overview)는 이렇게    │
     * │ 적는다 — "If you belong to more than one organization **or access        │
     * │ projects through a legacy user API key**, pass a header to specify       │
     * │ which organization and project to use."                                 │
     * │                                                                        │
     * │ 즉 **이 값 없이는 연동이 아예 되지 않는 운영자가 실재한다.** 칸을 두는 비용은 │
     * │ 빈 칸 하나이고, 두지 않는 비용은 그 운영자가 이 화면으로는 연동할 수 없다는  │
     * │ 것이다. 비용이 이렇게 기울면 선택 칸을 두는 쪽이 맞다.                     │
     * │                                                                        │
     * │ **둘 다 비밀이 아니다** — 그것만으로는 아무 호출도 인증되지 않는다. 방증:    │
     * │ Anthropic 은 `anthropic-organization-id` 를 **모든 응답 헤더에** 실어      │
     * │ 돌려준다(같은 날 1차 문서에서 확인). 되돌려주는 값을 비밀이라 부를 수 없다.  │
     * │ (그래서 되읽을 수 있고, 폼이 저장된 값을 다시 보여 준다.)                  │
     * └────────────────────────────────────────────────────────────────────────┘ */
    credentials: [
      apiKeyField('OpenAI 대시보드의 API keys 에서 발급해요. `sk-` 로 시작해요.'),
      baseUrlField(
        '비우면 기본 주소(https://api.openai.com/v1)로 불러요. 프록시·게이트웨이를 거칠 때만 채워요.',
      ),
      defaultModelField('예: `gpt-5.6-sol` · `gpt-5.6-terra` · `gpt-5.6-luna`'),
      {
        key: 'organizationId',
        label: '조직 ID',
        required: false,
        hint: '`OpenAI-Organization` 헤더로 나가요. `org-` 로 시작해요. 다중 조직 계정이거나 레거시 사용자 API 키를 쓸 때만 필요해요.',
      },
      {
        key: 'projectId',
        label: '프로젝트 ID',
        required: false,
        hint: '`OpenAI-Project` 헤더로 나가요. `proj_` 로 시작해요. 위 조직 ID 와 같은 조건에서만 필요해요.',
      },
    ],
    /* [고친 문장] 예전 이 자리에는 '빈 값을 보내면 오히려 401 이 난다' 가 있었다.
     * 관찰일 수는 있으나 **1차 문서에서 확인되지 않았고**, 화면은 그것을 사실처럼 적고
     * 있었다. 확인한 것만 남긴다 — 우리가 하는 일('비어 있으면 헤더를 보내지 않는다')은
     * 우리 코드의 사실이므로 그대로 둔다. */
    connectionNotice:
      '조직·프로젝트 ID 는 선택이에요 — 다중 조직 계정이거나 레거시 사용자 API 키를 쓰면 필요해요(공식 문서 기준). 그때는 이 값이 없으면 연동되지 않아요. 둘 다 비밀이 아니라 계정 안에서 우리를 가리키는 식별자이므로 저장한 값을 다시 보여 줘요. 비어 있으면 해당 헤더를 보내지 않아요.',
    settingsPath: aiConnectionPath('openai'),
    settingsUnavailableReason: HAS_SETTINGS,
    guideUrl: 'https://developers.openai.com/api/reference/overview',
    // 사용량은 **일반 API 키로 읽히지 않는다**(더 강한 admin 키가 필요하다) — 그래서 링크만 둔다.
    // 콘솔 주소는 로그인 벽이라 확인할 수 없었고(403), 대신 그 콘솔로 데려가는 1차 문서를 싣는다.
    rateLimitUrl: 'https://developers.openai.com/api/docs/guides/rate-limits',
    brand: 'openai',
    logoSrc: NO_LOGO_IMAGE,
    enableEffect: AI_RESPONSE_MODE_EFFECT,
    carrierCode: NOT_A_CARRIER,
    apiPackage: NO_API_PACKAGE,
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    // 제품명 Claude 에서 딴다 — 회사(Anthropic)로 따면 Azure·Amazon 과 'A' 로 겹친다
    glyph: 'Cl',
    category: 'model',
    description:
      'Claude 모델을 불러요. 긴 문서 이해와 도구 사용에 강해요. 키와 함께 API 버전을 보내요.',
    /* ┌ [고친 문장] 'Anthropic 은 Bearer 를 쓰지 않는다' 는 **낡은 서술이었다** ──┐
     * │ 여기와 아래 connectionNotice 가 둘 다 그렇게 적고 있었다. 2026-07 에      │
     * │ 1차 문서(platform.claude.com/docs/en/api/overview)의 인증 헤더 표를 다시  │
     * │ 읽으니 이렇다:                                                          │
     * │   · `x-api-key`      → Required: **One of** `x-api-key` or `Authorization` │
     * │   · `Authorization`  → `Bearer <token>` (Workload Identity Federation 로   │
     * │                        받은 **단기 토큰**) · 역시 'One of' 쪽             │
     * │   · `anthropic-version` → Required: **Yes**                              │
     * │                                                                        │
     * │ 즉 Bearer 도 유효한 경로다. 그러니 '쓰지 않는다' 는 거짓이 됐다. 대신 우리가 │
     * │ 말할 수 있는 사실은 좁고 확실하다: **이 화면이 받는 것은 콘솔 API 키이고,   │
     * │ 우리 클라이언트는 그것을 `x-api-key` 로 보낸다.** WIF 단기 토큰은 이 화면이  │
     * │ 받는 종류의 값이 아니다(발급·갱신이 우리 몫이 아니다).                     │
     * │                                                                        │
     * │ **`anthropic-version` 필수는 여전히 사실이다** — 그리고 그것은 여전히      │
     * │ 입력 칸이 아니라 **코드 상수**다. 없는 입력을 요구하면 폼이 거짓말을 한다:   │
     * │ 운영자는 무엇을 넣을지 모르고, 틀리면 우리 잘못을 그가 뒤집어쓴다.          │
     * └────────────────────────────────────────────────────────────────────────┘ */
    credentials: [
      apiKeyField('Anthropic Console 의 API keys 에서 발급해요. `sk-ant-` 로 시작해요.'),
      baseUrlField(
        '비우면 기본 주소(https://api.anthropic.com)로 불러요. 프록시·게이트웨이를 거칠 때만 채워요.',
      ),
      defaultModelField('예: `claude-opus-4-8` · `claude-sonnet-5` · `claude-haiku-4-5`'),
    ],
    connectionNotice:
      '이 화면이 받는 것은 Anthropic Console 의 API 키이고, 우리 클라이언트는 그것을 `x-api-key` 헤더로 보내요. `anthropic-version` 은 공식 문서가 여전히 필수로 요구하는 헤더이지만 우리가 고정으로 보내는 상수라 입력칸이 없어요. (공식 표는 `x-api-key` 또는 `Authorization: Bearer` 중 하나를 요구해요 — 뒤쪽은 Workload Identity Federation 으로 받는 단기 토큰이라 이 화면이 받는 종류의 값이 아니에요.)',
    settingsPath: aiConnectionPath('claude'),
    settingsUnavailableReason: HAS_SETTINGS,
    // ⚠ 호스트를 `platform.claude.com` 으로 적는다. 옛 주소(docs.anthropic.com ·
    //   docs.claude.com)는 **301/302 로 옮겨 갔다** — 적어 두면 크로스호스트 리다이렉트가 되고,
    //   그런 링크는 언젠가 조용히 끊긴다. 확인한 최종 주소를 그대로 싣는 것이 규약이다.
    guideUrl: 'https://platform.claude.com/docs/en/api/overview',
    rateLimitUrl: 'https://platform.claude.com/docs/en/api/rate-limits',
    brand: 'claude',
    logoSrc: NO_LOGO_IMAGE,
    enableEffect: AI_RESPONSE_MODE_EFFECT,
    carrierCode: NOT_A_CARRIER,
    apiPackage: NO_API_PACKAGE,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    glyph: 'Gm',
    category: 'model',
    description:
      'Gemini 모델을 불러요. 이미지·문서를 함께 다룰 때 써요. Vertex AI 와는 다른 연동이에요.',
    /* ┌ [빠져 있던 함정을 채웠다] 헤더 이름이 다르다 ──────────────────────────┐
     * │ Gemini 네이티브 경로는 키를 **`x-goog-api-key`** 로 받는다               │
     * │ (ai.google.dev/gemini-api/docs/api-key 의 REST 예시, 2026-07 확인).       │
     * │ `Authorization: Bearer` 로 보내면 인증되지 않는다.                       │
     * │                                                                        │
     * │ 이것은 Anthropic 의 `x-api-key` 와 **정확히 같은 종류의 함정인데**, 직전    │
     * │ 기준에서는 경고가 Anthropic 에만 적혀 있었다. 그러면 화면이 '더 자주 터지는  │
     * │ 쪽' 을 말하지 않는 셈이 된다 — 대칭을 맞춘다.                             │
     * │                                                                        │
     * │ [Vertex AI 와 혼동하지 않는다] Vertex 는 프로젝트 id · 리전 · OAuth 를      │
     * │ 요구하는 **다른 제품**이다. 그 경고도 그대로 남긴다(둘 다 실재하는 헛디딤).  │
     * └────────────────────────────────────────────────────────────────────────┘ */
    credentials: [
      apiKeyField('Google AI Studio 에서 발급한 Gemini API 키예요.'),
      baseUrlField(
        '비우면 네이티브 엔드포인트로 불러요. OpenAI 호환 경로를 쓰려면 https://generativelanguage.googleapis.com/v1beta/openai/ 를 넣어요.',
      ),
      defaultModelField('예: `gemini-3.6-flash` · `gemini-3.5-flash-lite` · `gemini-2.5-pro`'),
    ],
    connectionNotice:
      'Gemini 네이티브 API 는 키를 `x-goog-api-key` 헤더로 받아요 — `Authorization: Bearer` 로 보내면 인증되지 않아요. 헤더 이름은 우리 클라이언트가 고정으로 보내는 상수라 입력칸이 없어요. OpenAI 호환 경로(/v1beta/openai/)를 쓰려면 베이스 URL 칸을 채우세요. Vertex AI 는 서비스 계정·프로젝트·리전을 요구하는 별개 연동이라 이 항목으로는 붙지 않아요 — 여기에 리전을 더해 대신할 수 없어요.',
    settingsPath: aiConnectionPath('gemini'),
    settingsUnavailableReason: HAS_SETTINGS,
    guideUrl: 'https://ai.google.dev/gemini-api/docs/api-key',
    rateLimitUrl: 'https://ai.google.dev/gemini-api/docs/rate-limits',
    brand: 'gemini',
    logoSrc: NO_LOGO_IMAGE,
    enableEffect: AI_RESPONSE_MODE_EFFECT,
    carrierCode: NOT_A_CARRIER,
    apiPackage: NO_API_PACKAGE,
  },
  {
    id: 'grok',
    // [회사명이 아니라 제품명을 쓴다] xAI 는 2026-02 SpaceX 에 인수돼 2026-07-06 SpaceXAI 로
    // 리브랜딩을 마쳤다. 회사명을 적으면 낡은 이름이 화면에 박히고, 새 이름이 맞는지도 아직
    // 확인되지 않았다 — 제품명 'Grok' 은 그 변화와 무관하게 참이다.
    name: 'Grok',
    // 'Gr' 가 아니라 **끝 글자**를 쓴다: 한때 Groq(Gq)가 같은 목록에 있었고 앞 두 글자로는
    // 갈리지 않았다. Groq 는 빠졌지만 규칙은 남긴다 — 표기는 이름에서 파생시키지 않는다.
    glyph: 'Gk',
    category: 'model',
    description: 'Grok 모델을 불러요. OpenAI 호환 형식이라 기존 호출부를 그대로 써요.',
    /* ┌ 베이스 URL 이 이 항목에서는 **곁가지가 아니다** ─────────────────────────┐
     * │ 공식 문서(docs.x.ai/docs/overview)가 안내하는 정상 사용법이 OpenAI          │
     * │ 클라이언트에 `base_url="https://api.x.ai/v1"` 을 갈아 끼우는 것이다.        │
     * │ 즉 여기서 주소 교체는 예외 구성이 아니라 **기본 시나리오**다.               │
     * └────────────────────────────────────────────────────────────────────────┘ */
    credentials: [
      apiKeyField('Grok API 콘솔에서 발급한 키예요.'),
      baseUrlField(
        '비우면 기본 주소(https://api.x.ai/v1)로 불러요. 공식 문서가 OpenAI 클라이언트에 이 주소를 끼워 쓰라고 안내하는 곳이에요.',
      ),
      defaultModelField('예: `grok-4.5` · `grok-4.3` · `grok-build-0.1`'),
    ],
    /* ┌ null 이었다 — 이제 채울 근거가 둘 생겼다 (2026-07 확인) ────────────────┐
     * │ ① Management API 는 **별도의 management key** 를 쓴다. 공식 문서가        │
     * │    "You need a management key in order to use this API" 라고 적고,       │
     * │    발급처도 다르다(console.x.ai 의 management keys). 즉 이 화면에 넣은     │
     * │    키로는 그 API 를 부를 수 없다 — 모르면 '키를 넣었는데 왜 401 인가' 가    │
     * │    된다.                                                                │
     * │ ② 회사·문서가 리브랜딩 중이라 **콘솔의 이름표가 흔들린다.** 그래서 화면이   │
     * │    'Grok API 콘솔' 이라 적어도 운영자가 다른 이름을 볼 수 있다. 제품명      │
     * │    Grok 은 그 변화와 무관하게 참이라 항목 이름은 그대로 둔다(위 name 주석). │
     * └────────────────────────────────────────────────────────────────────────┘ */
    connectionNotice:
      '이 화면이 받는 것은 추론용 API 키예요. 관리(Management) API 는 발급처가 다른 별도의 management key 를 요구하므로 이 키로는 부를 수 없어요 — 공식 문서가 그렇게 적어요. 그리고 회사·문서가 리브랜딩 중이라 콘솔의 메뉴 이름이 여기 적힌 것과 달라 보일 수 있어요. 발급하는 값 자체는 같아요.',
    settingsPath: aiConnectionPath('grok'),
    settingsUnavailableReason: HAS_SETTINGS,
    guideUrl: 'https://docs.x.ai/docs/overview',
    rateLimitUrl: 'https://docs.x.ai/docs/rate-limits',
    brand: 'grok',
    logoSrc: NO_LOGO_IMAGE,
    enableEffect: AI_RESPONSE_MODE_EFFECT,
    carrierCode: NOT_A_CARRIER,
    apiPackage: NO_API_PACKAGE,
  },

  /* ── 파운데이션 모델 — 키 하나로 되지 않는 곳 ───────────────────────────────
   *
   * 이 둘이 이 카탈로그에 자격증명 타입이 필요한 이유다. 자격증명이 '프로바이더' 가 아니라
   * **계정 안의 특정 리소스/리전**에 매여 있어, 키만 받아 두면 어디로 보낼지를 모른다.
   * (분류 id 와 화면 문구가 같은 낱말이다: `foundation` = '파운데이션 모델' — 위 개명 절.) */
  {
    id: 'azure-openai',
    name: 'Azure OpenAI',
    glyph: 'Az',
    category: 'foundation',
    description:
      '우리 Azure 구독 안에서 OpenAI 모델을 돌려요. 키 외에 리소스 주소와 배포명이 필요해요.',
    // 확인한 사실(learn.microsoft.com/azure/foundry/openai/api-version-lifecycle):
    //   · 호출 경로에 **모델명이 아니라 배포명**이 들어간다 — 여기서 틀리면 404 가 난다
    //   · 기존(dated) 표면은 api-version 질의 파라미터가 **필수**다
    //   · 2025-08 부터 여는 v1 표면은 api-version 을 요구하지 않고 배포명이 본문 model 로 옮겨간다
    //     (다만 일부 기능만 올라와 있어 기존 표면이 여전히 필요하다)
    // 그래서 api-version 을 **필수가 아닌 칸**으로 둔다 — v1 을 쓰면 비우고, 기존 표면이면 채운다.
    credentials: [
      apiKeyField('Azure 포털의 해당 OpenAI 리소스 > 키 및 엔드포인트에서 복사해요.'),
      {
        key: 'endpoint',
        label: '리소스 엔드포인트',
        required: true,
        hint: '예: https://내리소스이름.openai.azure.com',
      },
      {
        key: 'deployment',
        label: '배포명',
        required: true,
        hint: '모델명이 아니라 배포에 붙인 이름이에요. 다르면 호출이 404가 나요.',
      },
      {
        key: 'apiVersion',
        label: 'API 버전',
        required: false,
        hint: '기존(dated) 엔드포인트를 쓸 때만 채워요. 예: 2024-06-01. v1 엔드포인트는 비워요.',
      },
    ],
    connectionNotice:
      'API 버전을 비우면 v1 엔드포인트로, 채우면 기존(dated) 엔드포인트로 불러요. 선택이지만 아무래도 좋은 칸은 아니에요 — 이 칸의 유무가 어느 표면을 부를지를 갈라요.',
    settingsPath: aiConnectionPath('azure-openai'),
    settingsUnavailableReason: HAS_SETTINGS,
    guideUrl: 'https://learn.microsoft.com/en-us/azure/foundry/openai/api-version-lifecycle',
    // 한도·할당량은 Azure 구독의 배포별 TPM 설정이라 이 카탈로그가 가리킬 단일 주소가 없다
    rateLimitUrl: LIMITS_UNVERIFIED,
    // 공식 SVG 를 확보하지 못해 이미지로 그린다(위 로고 이미지 절) — 벡터를 지어내지 않았다
    brand: MARK_PENDING,
    logoSrc: AZURE_OPENAI_LOGO,
    enableEffect: AI_RESPONSE_MODE_EFFECT,
    carrierCode: NOT_A_CARRIER,
    apiPackage: NO_API_PACKAGE,
  },
  {
    id: 'amazon-bedrock',
    name: 'Amazon Bedrock',
    // Bedrock 에서 딴다 — Amazon 으로 따면 Azure 와 'A' 로 겹친다
    glyph: 'Br',
    category: 'foundation',
    description:
      '여러 회사의 모델을 AWS 계정 안에서 불러요. 자격증명이 리전에 묶여 있어 리전을 함께 지정해요.',
    // 확인한 사실(docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html):
    //   · 이제 베어러 토큰('Bedrock API key')이 SigV4 와 **함께** 제공된다(단기/장기 두 종류)
    //   · **리전은 여전히 별도로 필요하다** — 엔드포인트 호스트명에 박힌다
    //     (bedrock-runtime.<region>.amazonaws.com). 단기 키는 발급한 리전에서만 쓰인다
    //   · AWS 는 운영에 단기 키를, 탐색에만 장기 키를 권한다
    // 그래서 베어러 경로 기준으로도 **최소 두 칸**이다 — 키 한 칸짜리 폼으로는 못 만든다.
    credentials: [
      apiKeyField('Bedrock API 키(베어러 토큰)예요. 발급한 리전에서만 쓸 수 있어요.'),
      {
        key: 'region',
        label: '리전',
        required: true,
        hint: '예: us-east-1. 엔드포인트 주소에 들어가므로 키와 같은 리전이어야 해요.',
      },
    ],
    connectionNotice:
      '지금은 Bedrock API 키(베어러 토큰) 경로만 지원해요. SigV4(액세스 키·시크릿) 경로는 아직 없어요 — 자리는 있으나 이 화면이 받지 않아요.',
    settingsPath: aiConnectionPath('amazon-bedrock'),
    settingsUnavailableReason: HAS_SETTINGS,
    guideUrl: 'https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys.html',
    // 한도는 AWS 계정·리전별 서비스 할당량이라 역시 단일 주소가 없다 — 지어내지 않는다
    rateLimitUrl: LIMITS_UNVERIFIED,
    brand: MARK_PENDING,
    logoSrc: AMAZON_BEDROCK_LOGO,
    enableEffect: AI_RESPONSE_MODE_EFFECT,
    carrierCode: NOT_A_CARRIER,
    apiPackage: NO_API_PACKAGE,
  },

  /* ── 배송 — 택배사의 API 를 부르기 위한 자격증명 ─────────────────────────────
   *
   * ┌ 이것은 '어느 택배로 보내는가' 가 아니다 ─────────────────────────────────┐
   * │ 그 질문의 답은 배송 정책(/products/shipping)에 있고, 거기가 택배사 원장이다. │
   * │ 여기 있는 것은 **그 택배사의 API 를 부를 자격증명**이다 — 두 사실은 서로     │
   * │ 독립이라 한쪽만 있을 수 있다:                                            │
   * │   · 정책에만 있고 연동이 없다 → 손으로 송장을 받아 적는다(지금 전부 그렇다).  │
   * │   · 연동만 있고 정책에 없다   → 자격증명은 있는데 보낼 택배사가 목록에 없다.  │
   * │ 두 번째가 조용히 성립하지 않도록 상세 화면이 `carrierCode` 로 원장에게 묻고   │
   * │ 어긋나면 말한다(./components/CarrierPolicyCard.tsx).                      │
   * └─────────────────────────────────────────────────────────────────────────┘ */
  {
    id: 'cj-logistics',
    name: 'CJ대한통운',
    // 브랜드 표기 그대로 두 글자 — 카탈로그 안에서 유일하다(OA·Cl·Gm·Gk·Az·Br·CJ)
    glyph: 'CJ',
    category: 'shipping',
    description:
      '택배 운영 API로 예약 접수·운송장 발급·배송 추적을 불러요. 계약한 고객코드가 함께 필요해요.',
    /* ┌ 무엇을 확인했고 무엇을 확인하지 못했나 (2026-07-22 조사) ─────────────────┐
     * │ [확인됨] 오픈API 를 쓰기 전에 **기업고객 계약이 선행**되고, 계약이 끝나면    │
     * │   숫자 8자리 고객코드(주관고객번호 · CNPLUS 에서 조회)가 발급된다.          │
     * │   출처 둘이 독립적으로 같은 자릿수를 말한다(cafe24 지원 문서 · plto 가이드). │
     * │   → 그래서 아래 `customerCode` 는 **지어낸 칸이 아니다.**                  │
     * │                                                                        │
     * │ [미확인] 인증키의 정확한 이름 · 헤더 이름 · 별도 토큰 발급 절차의 유무.      │
     * │   openapi.cjlogistics.com 이 **해시(#) 라우트 SPA** 라 문서 본문이 서버에서 │
     * │   오지 않는다(받아 본 것은 IE11 지원 종료 공지뿐이다). 2차 출처에도 헤더    │
     * │   이름을 적은 곳이 없었다. **그래서 헤더 이름을 화면에 적지 않았다** —      │
     * │   추측한 헤더를 적으면 운영자는 그것이 확인된 사실이라고 믿는다.            │
     * │                                                                        │
     * │ [미확인] 테스트/운영 환경 분리 여부 → 환경 선택 칸을 두지 않았다.           │
     * │ [미확인] 우리가 CJ 쪽에 등록해 줄 값(콜백 주소 등)의 유무 → 아래 주의 참고.  │
     * └────────────────────────────────────────────────────────────────────────┘
     *
     * [가맹점코드·협력사코드를 칸으로 만들지 않은 이유] 재판매 솔루션(카페24 6자리 가맹점
     * 코드 · plto 협력사코드)이 요구하는 값으로는 확인했지만, **오픈API 가 그것을 요구하는지는
     * 확인하지 못했다.** 없는 입력을 요구하면 폼이 거짓말을 한다(Anthropic 의 anthropic-version
     * 을 칸으로 만들지 않은 것과 같은 판단) — 그래서 칸 대신 아래 안내로 말한다. */
    credentials: [
      apiKeyField('CJ대한통운 오픈API 포털에서 발급받은 인증키예요. 저장하면 다시 볼 수 없어요.'),
      {
        key: 'customerCode',
        label: '고객코드',
        required: true,
        // (비밀이 아니라는 판단은 이 항목이 아니라 칸 이름이 갖는다 — CREDENTIAL_SECRECY)
        hint: '기업고객 계약 후 발급되는 숫자 8자리예요(주관고객번호). CNPLUS 에서 조회해요.',
      },
    ],
    connectionNotice:
      '이 화면만으로는 연동되지 않아요 — CJ대한통운과 기업고객 계약을 맺고 오픈API 사용 승인을 받아야 고객코드와 인증키가 나와요. 인증키를 실제로 어느 헤더로 보내는지, 테스트 환경이 따로 있는지, 우리 쪽 수신 주소를 등록해야 하는지는 공개 문서에서 확인하지 못했어요(포털이 해시 라우트라 문서 본문을 읽을 수 없어요) — 확인하지 못한 것을 칸으로 만들지 않았어요. 재판매 솔루션이 함께 요구하는 가맹점코드·협력사코드도 오픈API 가 요구하는지 확인되지 않아 칸을 두지 않았어요.',
    settingsPath: aiConnectionPath('cj-logistics'),
    settingsUnavailableReason: HAS_SETTINGS,
    // 포털 첫 화면은 열리지만 **어느 API 문서인지는 해시에 담겨 서버로 가지 않는다.**
    // 그래도 이 주소는 실재하고 운영자가 로그인해 들어갈 입구가 맞으므로 싣는다.
    guideUrl: 'https://openapi.cjlogistics.com/',
    // 포털이 해시 라우트라 한도 문서의 주소를 얻을 수 없었다(위 조사 메모와 같은 이유)
    rateLimitUrl: LIMITS_UNVERIFIED,
    brand: MARK_PENDING,
    logoSrc: CJ_LOGISTICS_LOGO,
    // 켜도 앱에서 달라지는 것이 아직 없다 — 이 자격증명을 부르는 곳이 하나도 없다.
    // '배송 처리가 자동 접수된다' 같은 문장을 여기 적으면 그 순간 화면이 거짓말을 한다.
    enableEffect: NO_EFFECT_YET,
    /* 배송 정책의 택배사 코드와 맞춰야 하는 값 — **CJ 가 정한 코드가 아니라 우리 연결 키**다.
     * 영문 대문자·숫자·하이픈만 쓴다(배송 정책의 택배사 코드 규칙과 같은 문자 집합이라야
     * 운영자가 그대로 옮겨 적을 수 있다). */
    carrierCode: 'CJGLS',
    apiPackage: {
      // 운영자가 포털에서 직접 확인해 넘긴 묶음이다 — 이름도 목록도 손대지 않았다
      name: '(일반)택배 운영 API',
      operations: [
        '(공통) 상품 추적(운송장 번호 기준)',
        '(공통) 운송장 번호 생성',
        '(공통) 주소 정제',
        '(일반) 상품 추적(예약 정보 기준)',
        '(일반) 상품 추적(예약 정보 기준) 수신 여부 확정',
        '(일반) 예약 접수',
        '(일반) 예약 취소',
      ],
    },
  },
];

/** 카탈로그 전체 — 프로바이더 id 로 요구 자격증명을 찾을 때 쓴다 */
export function integrationCatalogue(): readonly IntegrationCatalogueEntry[] {
  return INTEGRATION_CATALOGUE;
}

/**
 * 카탈로그 + 저장된 자격증명 → 화면이 그릴 목록.
 *
 * 저장된 것이 없으면(오늘) 전 항목이 '연동 해제' 다 — **모르는 것과 아닌 것을 같게 취급하되,
 * 두 경우 모두 '된다' 고 말하지 않는다**는 점이 중요하다.
 *
 * ⚠ 카탈로그에 **없는** 저장 레코드는 여기서 조용히 지나간다(카탈로그를 돌기 때문이다).
 * 그것을 눈에 보이게 만드는 것이 아래 `orphanedConnectionIds` 다.
 */
export function resolveIntegrations(
  connections: readonly AiConnection[] = [],
): readonly Integration[] {
  return INTEGRATION_CATALOGUE.map((entry) => {
    const connection = connections.find((item) => item.providerId === entry.id);
    const connected = connectionIsUsable(entry.credentials, connection);

    return {
      ...entry,
      status: connected ? 'connected' : 'disconnected',
      // 연동 시작일은 저장된 연동이 들고 있다 — 없으면 null 이고 표는 '-' 를 그린다.
      connectedAt: connection?.connectedAt ?? null,
    };
  });
}

/**
 * 저장돼 있는데 **카탈로그에는 없는** 프로바이더 id — 오늘은 뺀 7종(mistral · perplexity ·
 * cohere · deepseek · groq · openrouter · together)이 여기 걸린다.
 *
 * ┌ 방침: 지우지 않는다. 대신 **말한다.** ────────────────────────────────────┐
 * │ ① **저장 문서를 프론트가 지우지 않는다.** 카탈로그에서 뺀 것은 이 화면의       │
 * │    결정이고, 저장된 자격증명은 운영자가 넣은 사실이다. '목록에서 빠졌으니       │
 * │    지운다' 는 되돌릴 수 없는 삭제를 아무도 누르지 않은 채 수행하는 것이다.      │
 * │    저장 경로도 이미 이 규약을 지킨다 — `connectionSavePayload` 는 **대상       │
 * │    프로바이더 자리만** 쓰고 나머지 레코드는 서버 값 그대로 둔다.               │
 * │                                                                         │
 * │ ② **그렇다고 조용히 두지도 않는다.** 화면에서만 사라지면 운영자는 자기가 넣은   │
 * │    키가 아직 살아 있는지, 그 프로바이더가 아직 호출되는지 알 수 없다.          │
 * │    목록 화면이 이 함수의 결과를 배너로 말한다(ApiKeysPage).                   │
 * │                                                                         │
 * │ ③ 상세 주소(`/settings/api-keys/mistral`)는 **이미 정직하다** — '이 화면이     │
 * │    아는 AI 프로바이더가 아닙니다' 와 돌아갈 길을 준다(AiConnectionPage).       │
 * │                                                                         │
 * │ TODO(backend): 진짜 정리는 서버가 할 일이다 — 카탈로그에서 빠진 프로바이더의    │
 * │   자격증명을 폐기할지, 남길지는 운영 정책이고 그때 **사람이 고른다.**           │
 * └─────────────────────────────────────────────────────────────────────────┘
 */
export function orphanedConnectionIds(connections: readonly AiConnection[]): readonly string[] {
  const known = new Set(INTEGRATION_CATALOGUE.map((entry) => entry.id));
  return connections
    .filter((connection) => !known.has(connection.providerId))
    .map((connection) => connection.providerId);
}

/* ── 탭 ──────────────────────────────────────────────────────────────────── */

/**
 * 탭은 **한 축이 아니다** — 앞의 셋은 분류, 다음 둘은 상태, 마지막이 전체다.
 *
 * 분류를 왼쪽에 두는 이유: 이 화면에서 운영자가 먼저 하는 일은 '어떤 종류를 붙일까' 이지
 * '무엇이 이미 붙어 있나' 가 아니다(오늘은 붙어 있는 것이 0이라 더욱 그렇다).
 *
 * 축이 섞여 있어도 **집계는 한 함수를 지난다**(filterIntegrations) — 탭마다 세는 규칙을
 * 따로 두면 '모델 (4)' 인데 행이 3개인 날이 온다.
 *
 * [분류 탭이 셋이 됐다] 게이트웨이가 빠져 한때 둘이었고, 배송이 들어오면서 다시 셋이다 —
 * '모델 (4)' · '파운데이션 모델 (2)' · '배송 (1)'. 항목이 하나뿐인 분류도 탭을 갖는다:
 * **빈 탭을 만들지 않는다**는 규칙은 0건을 금지하는 것이지 1건을 금지하는 것이 아니다.
 *
 * ⚠ 이 배열은 분류 축(INTEGRATION_CATEGORIES)에서 **손으로 옮겨 적은 것**이라 어긋날 수 있다.
 * 그 어긋남은 테스트가 잡는다(탭 목록을 분류 축에서 다시 도출해 비교한다) — 게이트웨이를 뺄 때
 * 실제로 '게이트웨이 (0)' 탭만 남을 뻔했던 자리다.
 */
export const INTEGRATION_TABS = [
  'model',
  'foundation',
  'shipping',
  'connected',
  'disconnected',
  'all',
] as const;

export type IntegrationTabId = (typeof INTEGRATION_TABS)[number];

const TAB_LABEL: Record<IntegrationTabId, string> = {
  // 분류 탭의 문구는 CATEGORY_LABEL 과 **같은 낱말이어야 한다** — 탭과 항목 부제가
  // 다른 이름으로 같은 분류를 부르면 운영자는 둘을 다른 것으로 읽는다.
  model: CATEGORY_LABEL.model,
  foundation: CATEGORY_LABEL.foundation,
  shipping: CATEGORY_LABEL.shipping,
  connected: '연동 완료',
  disconnected: '연동 해제',
  all: '전체',
};

/** @tds/ui Tabs 는 도메인을 모른다 — onChange 로 `string` 을 준다. 여기서 좁힌다 */
export function isIntegrationTabId(value: string): value is IntegrationTabId {
  return INTEGRATION_TABS.some((tab) => tab === value);
}

export function filterIntegrations(
  list: readonly Integration[],
  tab: IntegrationTabId,
): readonly Integration[] {
  switch (tab) {
    case 'all':
      return list;
    case 'connected':
    case 'disconnected':
      return list.filter((item) => item.status === tab);
    default:
      // 분류 탭 — 유니온이 분류 id 와 같은 문자열을 쓰므로 그대로 비교한다
      return list.filter((item) => item.category === tab);
  }
}

/**
 * 탭별 건수 — 라벨에 그대로 박힌다('모델 (4)').
 *
 * 각 탭의 건수를 따로 세면 필터와 집계가 어긋날 자리가 생긴다. 그래서 같은 필터를 통해 센다.
 * (분류 탭의 합은 전체와 같고, 상태 탭의 합도 전체와 같다 — 두 축이 각각 목록을 남김없이 나눈다.)
 */
export function countIntegrations(
  list: readonly Integration[],
): Readonly<Record<IntegrationTabId, number>> {
  const countOf = (tab: IntegrationTabId): number => filterIntegrations(list, tab).length;

  return {
    model: countOf('model'),
    foundation: countOf('foundation'),
    shipping: countOf('shipping'),
    connected: countOf('connected'),
    disconnected: countOf('disconnected'),
    all: countOf('all'),
  };
}

export interface IntegrationTabItem {
  readonly id: IntegrationTabId;
  readonly label: string;
}

/** Tabs 에 넘길 항목 — 라벨에 건수를 붙여 '모델 (4)' 로 만든다 */
export function integrationTabItems(list: readonly Integration[]): readonly IntegrationTabItem[] {
  const counts = countIntegrations(list);
  return INTEGRATION_TABS.map((tab) => ({
    id: tab,
    label: `${TAB_LABEL[tab]} (${String(counts[tab])})`,
  }));
}

/* ── AI 화면이 읽는 연동 상태는 ./data-source.ts 가 만든다 ────────────────────
 *
 * AI 에이전트 화면(pages/ai)은 응답 모드가 열리는지를 연동 상태에서 파생시킨다. 그 화면이
 * 설정 화면을 직접 import 하면 pages/ai → pages/settings 결합이 되고 축1 이 blocker 로 잡는다 —
 * 그래서 공통 층(shared/fixtures/ai-providers.ts)이 자리를 만들고 배선(src/wiring-ai.ts)이
 * 구현(`aiProviderStatuses`)을 꽂는다. 화면끼리는 끝까지 서로를 모른다.
 *
 * 그 구현이 **저장소를 읽어야** 하므로 이 파일이 아니라 ./data-source.ts 에 있다 —
 * 여기 두면 data-source ↔ integrations 순환이 된다(data-source.ts 의 해소 절 머리말). */
