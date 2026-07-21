// 상담 이력 동작 회귀 테스트 — 후속조치 대기·유형/대기 필터·검색·정렬(순수)
//   + 관련(견적·문의·계약) 링크 해소
import { describe, expect, it } from 'vitest';

import {
  consultationRelatedLink,
  consultOutcomeTone,
  filterConsultations,
  hasPendingFollowUp,
  searchConsultations,
  sortConsultations,
} from './types';
import type { Consultation } from './types';
import { consultationAdapter } from './data-source';

function consultOf(overrides: Partial<Consultation> & { id: string }): Consultation {
  return {
    accountId: 'acc-1',
    accountName: '(주)테스트',
    contactPerson: '홍길동',
    consultType: 'phone',
    topic: '상담 주제',
    consultedAt: '2026-07-14T10:00:00',
    consultant: '담당',
    content: '내용',
    outcome: 'neutral',
    followUpAction: '',
    followUpAt: '',
    followUpDone: false,
    relatedKind: '',
    relatedId: '',
    ...overrides,
  };
}

describe('hasPendingFollowUp — 후속조치 대기(순수)', () => {
  it('후속조치가 있고 미완료면 대기', () => {
    expect(
      hasPendingFollowUp(consultOf({ id: 'a', followUpAction: '회신', followUpDone: false })),
    ).toBe(true);
  });
  it('완료됐으면 대기 아님', () => {
    expect(
      hasPendingFollowUp(consultOf({ id: 'a', followUpAction: '회신', followUpDone: true })),
    ).toBe(false);
  });
  it('후속조치가 없으면 대기 아님', () => {
    expect(hasPendingFollowUp(consultOf({ id: 'a', followUpAction: '' }))).toBe(false);
  });
});

describe('consultOutcomeTone(순수)', () => {
  it('결과별 톤', () => {
    expect(consultOutcomeTone('positive')).toBe('success');
    expect(consultOutcomeTone('negative')).toBe('danger');
    expect(consultOutcomeTone('neutral')).toBe('neutral');
  });
});

describe('필터·검색·정렬(순수)', () => {
  const list = [
    consultOf({ id: 'a', consultType: 'phone', consultedAt: '2026-07-10T10:00:00' }),
    consultOf({
      id: 'b',
      consultType: 'visit',
      topic: '가나 미팅',
      followUpAction: '회신',
      followUpDone: false,
      consultedAt: '2026-07-14T10:00:00',
    }),
  ];

  it('유형 필터', () => {
    expect(filterConsultations(list, 'visit', false).map((c) => c.id)).toEqual(['b']);
    expect(filterConsultations(list, 'all', false)).toHaveLength(2);
  });
  it('후속조치 대기 필터', () => {
    expect(filterConsultations(list, 'all', true).map((c) => c.id)).toEqual(['b']);
  });
  it('주제 검색', () => {
    expect(searchConsultations(list, '가나').map((c) => c.id)).toEqual(['b']);
  });
  it('상담일시 내림차순 정렬', () => {
    expect(sortConsultations(list).map((c) => c.id)).toEqual(['b', 'a']);
  });
});

describe('consultationRelatedLink — 관련을 진짜 링크로 푼다(순수)', () => {
  // [회귀] 예전에는 `related: '견적 Q-20260710-001'` 이라는 **눌리지 않는 문장**이었다.
  // 주석은 그것을 '링크' 라 불렀지만 실제로는 아무 데도 가지 않았다.
  it('견적은 견적 상세로 간다 — 수정 폼이 아니다', () => {
    expect(consultationRelatedLink({ relatedKind: 'quote', relatedId: 'qt-1' })).toEqual({
      label: '견적 보기',
      to: '/sales/quotes/qt-1',
    });
  });

  it('문의는 문의 상세로 간다', () => {
    expect(consultationRelatedLink({ relatedKind: 'inquiry', relatedId: 'inq-3' })?.to).toBe(
      '/sales/inquiries/inq-3',
    );
  });

  it('계약은 아직 상세가 없어 유일한 조회 표면(수정 폼)으로 간다', () => {
    expect(consultationRelatedLink({ relatedKind: 'contract', relatedId: 'ct-2' })?.to).toBe(
      '/sales/contracts/ct-2/edit',
    );
  });

  it('연결이 없으면 null — 화면이 대체 문구를 쓴다', () => {
    expect(consultationRelatedLink({ relatedKind: '', relatedId: '' })).toBeNull();
  });

  it('반쪽 연결(종류만·id만)은 링크를 만들지 않는다 — 404 로 가는 링크가 된다', () => {
    expect(consultationRelatedLink({ relatedKind: 'quote', relatedId: '' })).toBeNull();
    expect(consultationRelatedLink({ relatedKind: '', relatedId: 'qt-1' })).toBeNull();
  });
});

describe('상담 시드의 관련 링크(회귀)', () => {
  it('세 시드가 각각 견적·계약·문의로 해소된다', async () => {
    const list = await consultationAdapter.fetchAll(new AbortController().signal);
    const resolved = list.map((item) => consultationRelatedLink(item)?.to ?? null);
    expect(resolved).toContain('/sales/quotes/qt-1');
    expect(resolved).toContain('/sales/contracts/ct-2/edit');
    expect(resolved).toContain('/sales/inquiries/inq-3');
  });
});
