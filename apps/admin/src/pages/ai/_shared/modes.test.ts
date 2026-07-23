// 응답 모드의 열림/잠김은 **연동 상태에서 파생된다** — 하드코딩이 아니다
//
// [무엇을 지키는가] 예전에는 '빠른/전문가/헤비' 가 코드에 `wired: false` 로 박혀 있었다.
// 그러면 설정에서 AI 프로바이더를 연동해도 영원히 잠겨 있고, 반대로 누가 그 값을 true 로
// 바꾸면 연동이 없는데도 열린다 — 둘 다 화면이 사실과 다른 말을 하는 상태다.
// 아래 테스트는 '연동 상태가 곧 잠금 상태' 임을 양방향으로 고정한다.
import { afterEach, describe, expect, it } from 'vitest';

import {
  registerAiProviderLookup,
  resetAiProviderLookup,
} from '../../../shared/fixtures/ai-providers';
import { enabledProviderNames, findMode, resolveResponseModes } from './modes';

afterEach(() => {
  resetAiProviderLookup();
});

/** 잠긴 모드 id — 순서에 의존하지 않게 id 로 본다 */
function lockedIds(): readonly string[] {
  return resolveResponseModes()
    .filter((mode) => !mode.available)
    .map((mode) => mode.id);
}

describe('resolveResponseModes — 연동이 없을 때 (fail-closed)', () => {
  it('조회기가 꽂히지 않았으면 모델이 필요한 세 모드가 잠긴다', () => {
    // 미배선 상태 — registerAiProviderLookup 을 부르지 않았다
    expect(lockedIds()).toEqual(['fast', 'expert', 'heavy']);
  });

  it('규칙 기반 조회는 연동과 무관하게 항상 열려 있다', () => {
    expect(findMode('rules').available).toBe(true);
    expect(findMode('rules').lockReason).toBeNull();
  });

  it('잠금 사유가 **무엇을 연동해야 하는지**를 이름으로 말한다', () => {
    const reason = findMode('fast').lockReason ?? '';
    // '미연결' 세 글자로는 관리자가 무엇을 해야 할지 알 수 없다
    for (const name of ['OpenAI', 'Claude', 'Gemini', 'Grok']) {
      expect(reason).toContain(name);
    }
    expect(reason).toContain('연동하면 열려요');
  });

  it('프로바이더가 등록됐지만 전부 꺼져 있으면 여전히 잠긴다', () => {
    registerAiProviderLookup(() => [
      { id: 'openai', label: 'OpenAI', enabled: false },
      { id: 'claude', label: 'Claude', enabled: false },
    ]);
    expect(lockedIds()).toEqual(['fast', 'expert', 'heavy']);
    expect(enabledProviderNames()).toEqual([]);
  });

  it('조회기가 던져도 잠긴 채로 수렴한다 — 설정 쪽 사고가 이 화면을 깨지 않는다', () => {
    registerAiProviderLookup(() => {
      throw new Error('설정을 읽지 못했어요');
    });
    expect(lockedIds()).toEqual(['fast', 'expert', 'heavy']);
    expect(findMode('rules').available).toBe(true);
  });
});

describe('resolveResponseModes — 연동이 있을 때', () => {
  it('프로바이더가 하나라도 켜지면 세 모드가 열린다', () => {
    registerAiProviderLookup(() => [
      { id: 'claude', label: 'Claude', enabled: true },
      { id: 'openai', label: 'OpenAI', enabled: false },
    ]);

    expect(lockedIds()).toEqual([]);
    for (const id of ['fast', 'expert', 'heavy'] as const) {
      expect(findMode(id).available).toBe(true);
      expect(findMode(id).lockReason).toBeNull();
    }
  });

  it('켜진 프로바이더의 표시명만 돌려준다', () => {
    registerAiProviderLookup(() => [
      { id: 'claude', label: 'Claude', enabled: true },
      { id: 'gemini', label: 'Gemini', enabled: true },
      { id: 'grok', label: 'Grok', enabled: false },
    ]);
    expect(enabledProviderNames()).toEqual(['Claude', 'Gemini']);
  });

  it('연동을 껐다 켜면 그때그때 반영된다 (호출 시점 조회)', () => {
    let on = false;
    registerAiProviderLookup(() => [{ id: 'claude', label: 'Claude', enabled: on }]);

    expect(lockedIds()).toEqual(['fast', 'expert', 'heavy']);
    on = true;
    // 모듈 로드 시점에 굳혔다면 여기서 여전히 잠겨 있을 것이다
    expect(lockedIds()).toEqual([]);
  });
});
