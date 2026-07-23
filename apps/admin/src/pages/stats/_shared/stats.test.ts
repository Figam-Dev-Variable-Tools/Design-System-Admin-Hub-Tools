// 통계 엔진의 순수 로직 검증
//
// 여기 있는 것은 **눈으로 검증할 수 없는 것들**이다: 타임존 경계, 말일 보정, 0으로 나누기,
// 정렬 안정성, 페이지 경계 산술. 화면을 띄워 보는 것으로는 이 중 어느 것도 확인되지 않는다.
import { describe, expect, it } from 'vitest';

import { daysBetween } from '../../../shared/format';
import {
  comparePeriodOf,
  eachDay,
  formatPeriodLabel,
  isCompareMode,
  isPeriodPresetId,
  periodErrorOf,
  periodLength,
  resolvePreset,
} from './period';
import {
  deltaOf,
  formatDeltaPercent,
  formatDuration,
  formatMetric,
  formatPercentValue,
  formatWonValue,
  shareOf,
  withUnitSuffix,
} from './format';
import { clampPage, pageSlice, sortRows, totalPagesOf } from './table';
import type { StatsColumn } from './types';

// [서울 고정·달력 산술 자체의 단언은 shared/format.test.ts 로 옮겨갔다 — ERP-09]
// 이 파일에 있던 toSeoulDate/isCalendarDate/addDays 는 shared/format 한 벌로 수렴했다.
// 구현이 그리로 갔으니 그 구현을 지키는 단언도 그리로 간다 — 여기 남는 것은 **기간 모델**,
// 즉 공유 산술 위에 이 섹션이 얹은 것(기간 길이·프리셋·비교 기간)이다.

describe('period — 기간 길이 (서울 기준 달력 날짜 위에서)', () => {
  it('일수는 시작·종료를 모두 포함한다', () => {
    expect(daysBetween('2026-07-10', '2026-07-16')).toBe(6);
    expect(periodLength({ start: '2026-07-10', end: '2026-07-16' })).toBe(7);
    expect(periodLength({ start: '2026-07-16', end: '2026-07-16' })).toBe(1);
    expect(eachDay({ start: '2026-07-14', end: '2026-07-16' })).toEqual([
      '2026-07-14',
      '2026-07-15',
      '2026-07-16',
    ]);
  });
});

describe('period — 프리셋', () => {
  const today = '2026-07-16';

  it('최근 7일은 오늘을 포함한 7일이다', () => {
    expect(resolvePreset('last7', today)).toEqual({ start: '2026-07-10', end: today });
    expect(periodLength({ start: '2026-07-10', end: today })).toBe(7);
  });

  it('최근 30일도 오늘을 포함한다', () => {
    expect(resolvePreset('last30', today)).toEqual({ start: '2026-06-17', end: today });
    expect(periodLength({ start: '2026-06-17', end: today })).toBe(30);
  });

  it('오늘·어제', () => {
    expect(resolvePreset('today', today)).toEqual({ start: today, end: today });
    expect(resolvePreset('yesterday', today)).toEqual({ start: '2026-07-15', end: '2026-07-15' });
  });

  it('이번 달은 1일부터 오늘까지, 지난 달은 그 달 전체다', () => {
    expect(resolvePreset('thisMonth', today)).toEqual({ start: '2026-07-01', end: today });
    expect(resolvePreset('lastMonth', today)).toEqual({ start: '2026-06-01', end: '2026-06-30' });
  });

  it('31일에 지난 달을 물어도 말일이 밀리지 않는다', () => {
    // 3/31 의 '지난 달'은 2월이다 — 단순히 30일을 빼면 3월 초로 되돌아온다
    expect(resolvePreset('lastMonth', '2026-03-31')).toEqual({
      start: '2026-02-01',
      end: '2026-02-28',
    });
  });

  it('직접 입력에는 계산식이 없다', () => {
    expect(resolvePreset('custom', today)).toBeNull();
  });

  it('프리셋 id 타입가드', () => {
    expect(isPeriodPresetId('last7')).toBe(true);
    expect(isPeriodPresetId('last8')).toBe(false);
    expect(isPeriodPresetId(7)).toBe(false);
  });
});

describe('period — 비교 기간', () => {
  const period = { start: '2026-07-10', end: '2026-07-16' } as const;

  it('직전 기간은 같은 길이로 시작일 바로 앞에 붙는다', () => {
    const compare = comparePeriodOf(period, 'previous');
    expect(compare).toEqual({ start: '2026-07-03', end: '2026-07-09' });
    // 길이가 같아야 같은 x축에 겹칠 수 있다
    expect(periodLength(compare ?? period)).toBe(periodLength(period));
  });

  it('전년 동기는 날짜를 그대로 1년 당긴다', () => {
    expect(comparePeriodOf(period, 'lastYear')).toEqual({
      start: '2025-07-10',
      end: '2025-07-16',
    });
  });

  it('비교 안 함이면 비교 기간이 없다', () => {
    expect(comparePeriodOf(period, 'none')).toBeNull();
  });

  it('비교 기준 타입가드', () => {
    expect(isCompareMode('previous')).toBe(true);
    expect(isCompareMode('nope')).toBe(false);
  });
});

describe('period — 검증과 표시 (COMP-11)', () => {
  it('종료일이 시작일보다 빠르면 조용한 empty 가 아니라 오류다', () => {
    expect(periodErrorOf({ start: '2026-07-16', end: '2026-07-10' })).toContain('빠를 수 없어요');
  });

  it('같은 날은 유효하다', () => {
    expect(periodErrorOf({ start: '2026-07-16', end: '2026-07-16' })).toBe('');
  });

  it('형식이 깨지면 형식 오류로 말한다', () => {
    expect(periodErrorOf({ start: 'x', end: '2026-07-16' })).toContain('형식');
  });

  it('기간 라벨은 일수를 함께 말한다', () => {
    expect(formatPeriodLabel({ start: '2026-07-10', end: '2026-07-16' })).toBe(
      '2026.07.10 ~ 2026.07.16 (7일)',
    );
    expect(formatPeriodLabel({ start: '2026-07-16', end: '2026-07-16' })).toBe('2026.07.16');
  });
});

describe('format — 지표 표시', () => {
  it('금액은 숫자만 낸다 — 단위는 헤더가 갖는다 (ERP-07)', () => {
    expect(formatWonValue(1234000)).toBe('1,234,000');
    expect(formatWonValue(1234.6)).toBe('1,235');
  });

  it('헤더가 단위를 이름표로 갖는다', () => {
    expect(withUnitSuffix('순매출', 'won')).toBe('순매출 (원)');
    expect(withUnitSuffix('재방문율', 'percent')).toBe('재방문율 (%)');
    // 체류시간은 값 자체가 '3분 24초'라 헤더 단위가 없다
    expect(withUnitSuffix('평균 체류시간', 'seconds')).toBe('평균 체류시간');
  });

  it('체류시간은 분·초로 읽힌다', () => {
    expect(formatDuration(24)).toBe('24초');
    expect(formatDuration(204)).toBe('3분 24초');
    expect(formatDuration(0)).toBe('0초');
    expect(formatDuration(-5)).toBe('0초');
  });

  it('KPI 는 단위까지 붙인 완성형이다', () => {
    expect(formatMetric(1500, 'won')).toBe('1,500원');
    expect(formatMetric(12.34, 'percent')).toBe('12.3%');
    expect(formatMetric(1500, 'people')).toBe('1,500명');
    expect(formatMetric(1500, 'count')).toBe('1,500건');
  });

  it('비율은 소수 첫째 자리까지', () => {
    expect(formatPercentValue(12.34)).toBe('12.3');
    expect(formatPercentValue(12.36)).toBe('12.4');
    expect(formatPercentValue(0)).toBe('0.0');
  });

  it('경계값 12.35 는 12.3 이다 — toFixed 의 2진 부동소수 아티팩트', () => {
    // 12.35 는 2진수로 정확히 표현되지 않아 실제 저장값이 12.34999… 라서 내림된다.
    // '반올림이 틀렸다'는 버그 신고가 반복해서 들어오는 자리다 — 의도된 동작임을 못박는다.
    // 통계 표시에서 0.05%p 차이는 무의미하므로 보정하지 않는다(보정하면 합계와 어긋난다).
    expect(formatPercentValue(12.35)).toBe('12.3');
  });
});

describe('format — 증감 (delta)', () => {
  it('증가/감소/변동없음을 가른다', () => {
    expect(deltaOf(120, 100).direction).toBe('up');
    expect(deltaOf(80, 100).direction).toBe('down');
    expect(deltaOf(100, 100).direction).toBe('flat');
  });

  it('증감률은 직전 대비 비율이다', () => {
    expect(deltaOf(120, 100).percent).toBeCloseTo(20);
    expect(deltaOf(80, 100).percent).toBeCloseTo(-20);
  });

  it('직전이 0 이면 증감률이 정의되지 않는다 — 무한 %가 아니다', () => {
    const delta = deltaOf(5, 0);
    expect(delta.percent).toBeNull();
    expect(delta.direction).toBe('up');
    expect(formatDeltaPercent(delta)).toBe('—');
  });

  it('낮을수록 좋은 지표는 색이 뒤집힌다 — 탈퇴 급증이 초록이면 안 된다', () => {
    // 보통 지표: 증가 = 좋음
    expect(deltaOf(120, 100).tone).toBe('positive');
    expect(deltaOf(80, 100).tone).toBe('negative');
    // 이탈률·탈퇴·취소율: 증가 = 나쁨
    expect(deltaOf(120, 100, true).tone).toBe('negative');
    expect(deltaOf(80, 100, true).tone).toBe('positive');
  });

  it('변동 없음은 어느 쪽도 아니다', () => {
    expect(deltaOf(100, 100).tone).toBe('neutral');
    expect(deltaOf(100, 100, true).tone).toBe('neutral');
    expect(formatDeltaPercent(deltaOf(100, 100))).toBe('변동 없음');
  });

  it('화살표는 방향을 따른다', () => {
    expect(formatDeltaPercent(deltaOf(120, 100))).toBe('▲ 20.0%');
    expect(formatDeltaPercent(deltaOf(80, 100))).toBe('▼ 20.0%');
  });

  it('음수 기준값에서도 부호가 뒤집히지 않는다', () => {
    // 직전이 -100, 현재가 -50 → 50 증가. |직전| 로 나누므로 +50%
    expect(deltaOf(-50, -100).percent).toBeCloseTo(50);
    expect(deltaOf(-50, -100).direction).toBe('up');
  });
});

describe('format — 구성비', () => {
  it('전체가 0 이면 0 이다 — 0으로 나누지 않는다', () => {
    expect(shareOf(0, 0)).toBe(0);
    expect(shareOf(5, 0)).toBe(0);
  });

  it('점유율은 백분율이다', () => {
    expect(shareOf(25, 100)).toBe(25);
    expect(shareOf(1, 3)).toBeCloseTo(33.33, 1);
  });
});

/* ── 표 ─────────────────────────────────────────────────────────────────── */

interface Row {
  readonly id: string;
  readonly name: string;
  readonly count: number;
}

const rowOf = (id: string, name: string, count: number): Row => ({ id, name, count });

const columns: readonly StatsColumn<Row>[] = [
  {
    key: 'name',
    header: '이름',
    align: 'left',
    render: (row) => row.name,
    csv: (row) => row.name,
    sortValue: (row) => row.name,
  },
  {
    key: 'count',
    header: '수',
    align: 'right',
    render: (row) => String(row.count),
    csv: (row) => String(row.count),
    sortValue: (row) => row.count,
  },
  // 정렬 불가 컬럼 — sortValue 가 없다
  { key: 'note', header: '비고', align: 'left', render: () => '-', csv: () => '-' },
];

describe('table — 정렬 (ERP-04)', () => {
  const rows: readonly Row[] = [
    rowOf('a', '나나', 3),
    rowOf('b', '가가', 1),
    rowOf('c', '다다', 2),
  ];

  it('오름/내림차순', () => {
    expect(
      sortRows(rows, columns, { key: 'count', direction: 'asc' }).map((row) => row.id),
    ).toEqual(['b', 'c', 'a']);
    expect(
      sortRows(rows, columns, { key: 'count', direction: 'desc' }).map((row) => row.id),
    ).toEqual(['a', 'c', 'b']);
  });

  it('한국어는 가나다 순이다 — 코드포인트 순이 아니다', () => {
    expect(
      sortRows(rows, columns, { key: 'name', direction: 'asc' }).map((row) => row.name),
    ).toEqual(['가가', '나나', '다다']);
  });

  it('값이 같으면 원래 순서를 지킨다 (안정 정렬)', () => {
    const tied: readonly Row[] = [rowOf('x', '가', 1), rowOf('y', '가', 1), rowOf('z', '가', 1)];
    expect(
      sortRows(tied, columns, { key: 'count', direction: 'desc' }).map((row) => row.id),
    ).toEqual(['x', 'y', 'z']);
  });

  it('정렬 기준이 없거나 정렬 불가 컬럼이면 원본을 그대로 둔다', () => {
    expect(sortRows(rows, columns, null)).toBe(rows);
    expect(sortRows(rows, columns, { key: 'note', direction: 'asc' })).toBe(rows);
    expect(sortRows(rows, columns, { key: 'nope', direction: 'asc' })).toBe(rows);
  });

  it('원본 배열을 건드리지 않는다', () => {
    const original = [...rows];
    sortRows(rows, columns, { key: 'count', direction: 'asc' });
    expect(rows).toEqual(original);
  });
});

describe('table — 페이지 경계 (STATE-04 · ERP-05)', () => {
  it('전체 페이지 수는 최소 1이다 — 0건이어도 1페이지다', () => {
    expect(totalPagesOf(0, 25)).toBe(1);
    expect(totalPagesOf(25, 25)).toBe(1);
    expect(totalPagesOf(26, 25)).toBe(2);
    expect(totalPagesOf(50, 25)).toBe(2);
  });

  it('범위를 벗어난 페이지는 마지막 유효 페이지로 당긴다', () => {
    // 결과가 줄어 3페이지가 사라졌는데 3페이지에 남으면 false-empty 가 뜬다
    expect(clampPage(3, 10, 25)).toBe(1);
    expect(clampPage(0, 100, 25)).toBe(1);
    expect(clampPage(-1, 100, 25)).toBe(1);
    expect(clampPage(99, 100, 25)).toBe(4);
    expect(clampPage(2, 100, 25)).toBe(2);
  });

  it('페이지 슬라이스', () => {
    const rows = Array.from({ length: 7 }, (_, index) => rowOf(String(index), 'n', index));
    expect(pageSlice(rows, 1, 3).map((row) => row.id)).toEqual(['0', '1', '2']);
    expect(pageSlice(rows, 3, 3).map((row) => row.id)).toEqual(['6']);
    // 범위를 넘는 페이지는 마지막 페이지를 준다 — 빈 배열이 아니다
    expect(pageSlice(rows, 9, 3).map((row) => row.id)).toEqual(['6']);
  });

  // 가시 범위 표기(ERP-05)의 단언은 DS 로 옮겨졌다 — packages/ui Pagination.test.tsx 가
  // 같은 경계(0건·마지막 페이지·범위 밖 page·자릿수)를 더 촘촘히 지킨다. 사본을 지웠으므로
  // 여기서 같은 것을 두 번 단언하지 않는다.
});
