// 발행 예약 회귀 테스트 — '예약' 은 저장되지 않고 시간에서 나온다
//
// [무엇을 못 박는가] 이 도메인의 사고는 하나뿐이다: 파생 상태를 저장해 시간이 흘러도 갱신되지
// 않는 것. 그래서 **같은 레코드가 시각에 따라 다른 답을 준다**는 사실을 먼저 못 박는다.
import { describe, expect, it } from 'vitest';

import {
  canSavePublishSchedule,
  effectivePublishStatus,
  isPublishAtFormat,
  isPubliclyVisible,
  isStoredPublishStatus,
  PUBLISH_AT_INVALID,
  PUBLISH_AT_NOT_PUBLISHED,
  publishScheduleBlock,
  publishStatusLabel,
} from './publish-schedule';
import type { PublishSchedule } from './publish-schedule';

const BEFORE = new Date('2026-07-01T00:00:00');
const AFTER = new Date('2026-09-01T00:00:00');

const scheduled: PublishSchedule = { status: 'published', publishAt: '2026-08-01T09:00' };

describe('effectivePublishStatus', () => {
  it('예약 시각 전에는 예약, 지난 뒤에는 발행 — 저장값은 하나다', () => {
    expect(effectivePublishStatus(scheduled, BEFORE)).toBe('scheduled');
    expect(effectivePublishStatus(scheduled, AFTER)).toBe('published');
  });

  it('공개 일시가 비면 즉시 발행이다', () => {
    expect(effectivePublishStatus({ status: 'published', publishAt: '' }, BEFORE)).toBe(
      'published',
    );
  });

  it('초안·보관은 예약 시각이 남아 있어도 되살아나지 않는다', () => {
    expect(effectivePublishStatus({ status: 'draft', publishAt: '2026-01-01T00:00' }, AFTER)).toBe(
      'draft',
    );
    expect(
      effectivePublishStatus({ status: 'archived', publishAt: '2026-01-01T00:00' }, AFTER),
    ).toBe('archived');
  });

  it('형식이 깨진 시각은 예약으로 읽지 않는다 — 영원히 예약중인 글을 만들지 않는다', () => {
    expect(effectivePublishStatus({ status: 'published', publishAt: '내일' }, BEFORE)).toBe(
      'published',
    );
  });
});

describe('isPubliclyVisible', () => {
  it('예약중은 아직 보이지 않고, 시각이 지나면 보인다', () => {
    expect(isPubliclyVisible(scheduled, BEFORE)).toBe(false);
    expect(isPubliclyVisible(scheduled, AFTER)).toBe(true);
  });
});

describe('publishScheduleBlock', () => {
  it('빈 공개 일시는 언제나 통과한다', () => {
    expect(publishScheduleBlock({ status: 'draft', publishAt: '' })).toBeNull();
  });

  it('형식이 틀리면 막는다', () => {
    expect(publishScheduleBlock({ status: 'published', publishAt: '2026-13-99' })).toBe(
      PUBLISH_AT_INVALID,
    );
  });

  it('초안에 예약 시각을 붙이려 하면 막는다 — 예약되지 않을 값을 저장하지 않는다', () => {
    expect(publishScheduleBlock({ status: 'draft', publishAt: '2026-08-01T09:00' })).toBe(
      PUBLISH_AT_NOT_PUBLISHED,
    );
    expect(canSavePublishSchedule({ status: 'draft', publishAt: '2026-08-01T09:00' })).toBe(false);
  });

  it('발행 + 미래 시각은 통과한다', () => {
    expect(canSavePublishSchedule(scheduled)).toBe(true);
  });
});

describe('형식·타입가드·라벨', () => {
  it('isPublishAtFormat 은 분 단위 ISO 만 받는다', () => {
    expect(isPublishAtFormat('2026-08-01T09:00')).toBe(true);
    expect(isPublishAtFormat('2026-08-01')).toBe(false);
    expect(isPublishAtFormat('2026-02-31T09:00')).toBe(false);
  });

  it('isStoredPublishStatus 는 파생 상태(scheduled)를 저장값으로 받지 않는다', () => {
    expect(isStoredPublishStatus('published')).toBe(true);
    expect(isStoredPublishStatus('scheduled')).toBe(false);
    expect(isStoredPublishStatus(null)).toBe(false);
  });

  it('라벨은 한 벌뿐이다', () => {
    expect(publishStatusLabel('scheduled')).toBe('예약');
  });
});
