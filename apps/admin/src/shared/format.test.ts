// 조사(助詞) 헬퍼의 규칙 고정 (ERP-13 — A40 소유 · apps/admin/src/shared/format.ts)
//
// [왜 이 파일이 있나] 이 규칙은 세 곳(logs/josa.ts · notifications/_shared/notification.ts ·
// @tds/ui Empty)이 각자 구현하고 있었다. 두 사본을 shared/format 으로 수렴하면서 각 사본이
// 지키던 경계 조건(한글 아님 · 빈 문자열 · ㄹ 받침)을 여기 한 벌로 모은다 — 사본이 사라져도
// 그 사본이 알고 있던 사실은 남아야 한다.
import { describe, expect, it } from 'vitest';

import { directionParticle, objectParticle, topicParticle } from './format';

describe('조사(助詞) — 받침으로 고른다 (ERP-13)', () => {
  it('목적격: 받침이 있으면 "을", 없으면 "를"', () => {
    expect(objectParticle('기록')).toBe('을'); // ㄱ 받침
    expect(objectParticle('알림')).toBe('을'); // ㅁ 받침
    expect(objectParticle('템플릿')).toBe('을'); // ㅅ 받침
    expect(objectParticle('메시지')).toBe('를'); // 받침 없음
    expect(objectParticle('관리자 로그')).toBe('를');
  });

  it('보조사: 받침이 있으면 "은", 없으면 "는"', () => {
    expect(topicParticle('본문')).toBe('은');
    expect(topicParticle('제목')).toBe('은');
    expect(topicParticle('메시지')).toBe('는');
  });

  it('한글이 아니면 받침 없음으로 본다 — "API를" 이 "API을" 보다 자연스럽다', () => {
    expect(objectParticle('API')).toBe('를');
    expect(objectParticle('SMS')).toBe('를');
    expect(topicParticle('API')).toBe('는');
  });

  it('빈 문자열에도 죽지 않는다', () => {
    expect(objectParticle('')).toBe('를');
    expect(topicParticle('')).toBe('는');
    expect(directionParticle('')).toBe('로');
  });

  it('방향격: ㄹ 받침은 받침 없음처럼 "로" 를 쓴다 (서울으로 가 아니라 서울로)', () => {
    expect(directionParticle('서울')).toBe('로'); // ㄹ 받침 — 예외
    expect(directionParticle('종결')).toBe('로'); // ㄹ 받침 — 예외
    expect(directionParticle('답변완료')).toBe('로'); // 받침 없음
    expect(directionParticle('접수')).toBe('로'); // 받침 없음
    expect(directionParticle('보류중')).toBe('으로'); // ㅇ 받침
    expect(directionParticle('반려됨')).toBe('으로'); // ㅁ 받침
  });
});
