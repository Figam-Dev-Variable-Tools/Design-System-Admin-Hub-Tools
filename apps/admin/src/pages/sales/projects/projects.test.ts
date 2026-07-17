// 프로젝트 동작 회귀 테스트 — 단계 기본확률·가중예상매출·마일스톤 진척·필터(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import {
  defaultProbability,
  filterProjects,
  milestoneProgress,
  searchProjects,
  sortProjects,
  toProjectInput,
  weightedRevenue,
} from './types';
import type { Milestone, Project } from './types';
import { projectSchema } from './validation';
import type { ProjectFormValues } from './validation';

function projectOf(overrides: Partial<Project> & { id: string }): Project {
  return {
    name: '프로젝트',
    accountName: '(주)테스트',
    stage: 'proposal',
    probability: 50,
    expectedRevenue: 10000000,
    startAt: '2026-07-01',
    endAt: '2026-09-30',
    ownerName: '담당',
    progress: 30,
    milestones: [],
    deliverables: [],
    lostReason: '',
    note: '',
    ...overrides,
  };
}

describe('파이프라인 계산(순수)', () => {
  it('단계 기본 확률', () => {
    expect(defaultProbability('lead')).toBe(10);
    expect(defaultProbability('negotiation')).toBe(70);
    expect(defaultProbability('won')).toBe(100);
    expect(defaultProbability('lost')).toBe(0);
  });
  it('가중 예상매출 = 예상매출 × 확률/100', () => {
    expect(weightedRevenue({ expectedRevenue: 10000000, probability: 70 })).toBe(7000000);
  });
  it('마일스톤 진척 = 완료/전체(%)', () => {
    const milestones: readonly Milestone[] = [
      { id: 'a', name: 'A', dueDate: '2026-07-10', done: true },
      { id: 'b', name: 'B', dueDate: '2026-08-10', done: false },
    ];
    expect(milestoneProgress(milestones)).toBe(50);
    expect(milestoneProgress([])).toBe(0);
  });
});

describe('필터·검색·정렬·변환(순수)', () => {
  const list = [
    projectOf({ id: 'a', stage: 'proposal', name: '가프로젝트', endAt: '2026-09-30' }),
    projectOf({ id: 'b', stage: 'lost', accountName: '나상사', endAt: '2026-06-30' }),
  ];
  it('단계 필터', () => {
    expect(filterProjects(list, 'lost').map((p) => p.id)).toEqual(['b']);
    expect(filterProjects(list, 'all')).toHaveLength(2);
  });
  it('프로젝트명·거래처 검색', () => {
    expect(searchProjects(list, '나상사').map((p) => p.id)).toEqual(['b']);
  });
  it('종료일 오름차순 정렬(임박 우선)', () => {
    expect(sortProjects(list).map((p) => p.id)).toEqual(['b', 'a']);
  });
  it('toProjectInput 은 id 를 뺀다', () => {
    expect(toProjectInput(projectOf({ id: 'a' }))).not.toHaveProperty('id');
  });
});

function valuesOf(overrides: Partial<ProjectFormValues> = {}): ProjectFormValues {
  return {
    name: 'ERP 구축',
    accountName: '(주)테스트',
    stage: 'negotiation',
    probability: '70',
    expectedRevenue: '42000000',
    startAt: '2026-07-01',
    endAt: '2026-10-31',
    ownerName: '이영업',
    progress: '40',
    milestones: [],
    deliverables: [],
    lostReason: '',
    note: '',
    ...overrides,
  };
}

function messageFor(values: ProjectFormValues, path: string): string | undefined {
  const result = projectSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path.join('.') === path)?.message;
}

describe('projectSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(projectSchema.safeParse(valuesOf()).success).toBe(true);
  });
  it('프로젝트명이 비면 막는다', () => {
    expect(messageFor(valuesOf({ name: '' }), 'name')).toContain('입력');
  });
  it('확률이 100을 넘으면 막는다', () => {
    expect(messageFor(valuesOf({ probability: '150' }), 'probability')).toContain('0~100');
  });
  it('종료일이 시작일보다 빠르면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-10-31', endAt: '2026-07-01' }), 'endAt')).toContain(
      '빠를',
    );
  });
  it('실주인데 사유가 없으면 막는다', () => {
    expect(messageFor(valuesOf({ stage: 'lost', lostReason: '' }), 'lostReason')).toContain('실주');
  });
  it('마일스톤 이름이 비면 막는다', () => {
    expect(
      messageFor(
        valuesOf({ milestones: [{ id: 'm1', name: '', dueDate: '2026-08-01', done: false }] }),
        'milestones',
      ),
    ).toContain('이름');
  });
  // [회귀] 여기 있던 사본 isRealDate 는 형식만 보고 실재 여부를 보지 않아 2026-02-31 을
  // 통과시켰다(Date 가 3/3 으로 굴린 뒤 !Number.isNaN 이 참). 정본 isCalendarDate 로 수렴해 막는다.
  it('달력에 없는 날짜(2026-02-31)를 주면 막는다', () => {
    expect(messageFor(valuesOf({ startAt: '2026-02-31' }), 'startAt')).toContain('YYYY-MM-DD');
  });
});
