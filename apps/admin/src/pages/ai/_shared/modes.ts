// 응답 모드 — 참조 디자인의 '모델 선택'에 해당하는 자리
//
// [무엇이 모드를 여는가] '빠른 / 전문가 / 헤비' 는 **언어 모델의 사고량**을 고르는 축이다.
// 사고할 주체가 없으면 셋 다 같은 코드로 가므로, 고를 수 있게 두면 관리자는 방금 고른 것이
// 답을 바꿨다고 믿게 된다. 그래서 열림 여부를 하드코딩하지 않고 **AI 모델 연동 상태에서
// 파생**시킨다 — 설정 화면에서 프로바이더를 연동하면 실제로 열린다.
//
// [규칙 기반 조회는 연동과 무관하다] 그 모드는 로컬 픽스처를 조건으로 거르는 결정적 조회다.
// 모델이 없어도 동작하고, 있어도 동작이 달라지지 않는다 — 그래서 `requiresProvider: false` 다.
// 연동이 하나도 없을 때 **유일하게 남는 동작하는 모드**이기도 하다.
//
// [결합 없음] 연동 상태는 공통 층(shared/fixtures/ai-providers.ts)에서 읽는다. 설정 화면을
// 직접 import 하지 않는다(축1). 미배선이면 fail-closed = 연동 없음이다.
import {
  AI_PROVIDER_CATALOG,
  AI_PROVIDER_SETTINGS_PATH,
  enabledAiProviders,
} from '../../../shared/fixtures/ai-providers';

export type ResponseModeId = 'rules' | 'fast' | 'expert' | 'heavy';

/** 모드의 **정적** 정의 — 연동 상태와 무관한 사실만 갖는다 */
export interface ResponseMode {
  readonly id: ResponseModeId;
  readonly label: string;
  /**
   * 입력줄 트리거에 보이는 짧은 이름 — 한 줄 알약 안에서 자리를 적게 쓴다.
   * 스크린리더에는 짧은 이름이 아니라 `label` 전체가 읽힌다(ModePicker 의 aria-label).
   */
  readonly shortLabel: string;
  readonly description: string;
  /** true 면 AI 모델 연동이 있어야 열린다 */
  readonly requiresProvider: boolean;
}

/** 연동 상태를 반영한 모드 — 화면은 이것만 본다 */
export interface ResolvedResponseMode extends ResponseMode {
  /** 지금 고를 수 있는가 */
  readonly available: boolean;
  /** 고를 수 없는 이유 — 열려 있으면 null */
  readonly lockReason: string | null;
}

/** 연동 없이도 항상 동작하는 유일한 모드 */
export const RULES_MODE: ResponseMode = {
  id: 'rules',
  label: '규칙 기반 조회',
  shortLabel: '규칙 기반',
  description: '멘션한 데이터를 조건으로 걸러 실제 행을 돌려준다',
  requiresProvider: false,
};

export const RESPONSE_MODES: readonly ResponseMode[] = [
  RULES_MODE,
  {
    id: 'fast',
    label: '빠른',
    shortLabel: '빠른',
    description: '빠른 응답',
    requiresProvider: true,
  },
  {
    id: 'expert',
    label: '전문가',
    shortLabel: '전문가',
    description: '깊게 생각',
    requiresProvider: true,
  },
  {
    id: 'heavy',
    label: '헤비',
    shortLabel: '헤비',
    description: '전문가 팀',
    requiresProvider: true,
  },
];

export const DEFAULT_MODE_ID: ResponseModeId = 'rules';

/** 설정 화면 경로 — 잠금 안내가 여기로 보낸다 */
export { AI_PROVIDER_SETTINGS_PATH };

/**
 * 잠금 사유 — **무엇을 연동해야 열리는지**를 이름으로 말한다.
 * '미연결' 세 글자만으로는 관리자가 무엇을 해야 할지 알 수 없다.
 */
function lockReasonText(): string {
  const names = AI_PROVIDER_CATALOG.map((provider) => provider.label).join(' · ');
  return `${names} 중 하나를 연동하면 열려요.`;
}

/**
 * 지금의 연동 상태로 모드를 푼다.
 *
 * 호출 시점에 조회한다(모듈 로드 시점이 아니라) — 설정 화면에서 연동을 켜고 돌아오면
 * 다시 렌더될 때 열려 있어야 한다. 상수로 굳히면 새로고침해야 반영된다.
 */
export function resolveResponseModes(): readonly ResolvedResponseMode[] {
  const enabled = enabledAiProviders();
  const hasProvider = enabled.length > 0;
  const reason = lockReasonText();

  return RESPONSE_MODES.map((mode) => {
    const available = !mode.requiresProvider || hasProvider;
    return { ...mode, available, lockReason: available ? null : reason };
  });
}

/** 연동된 프로바이더 표시명 — 열린 모드의 설명에 '무엇으로 도는지'를 덧붙일 때 쓴다 */
export function enabledProviderNames(): readonly string[] {
  return enabledAiProviders().map((provider) => provider.label);
}

export function findMode(id: ResponseModeId): ResolvedResponseMode {
  const resolved = resolveResponseModes();
  return (
    resolved.find((mode) => mode.id === id) ??
    resolved[0] ?? { ...RULES_MODE, available: true, lockReason: null }
  );
}
