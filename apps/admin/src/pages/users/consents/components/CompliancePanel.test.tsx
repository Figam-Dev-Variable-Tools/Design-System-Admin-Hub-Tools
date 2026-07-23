// 재동의·파기 탭이 '모름' 을 '없음' 으로 그리지 않는다 (pages/users/consents/**)
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나 — 재현 경로를 고정한다]
// 예전에는 페이지가 `events={eventsQuery.data ?? []}` 로 넘겼다. 그래서 이력이 **아직 안 왔거나
// 조회에 실패한** 상태에서도 이 패널이 '모든 동의가 시행 중인 버전 기준입니다' ·
// '보관 기간이 지난 이력이 없습니다' 라는 **완결된 문장**을 그렸다. 운영자는 그것을 읽고 개정
// 공지를 보내지 않고 파기 기한을 넘긴다.
//
// [왜 순수 테스트만으로는 부족한가] `historyStateOf` 는 rules.test.ts 가 전수로 덮는다. 그러나
// 그 술어를 **패널이 실제로 소비하는지**는 렌더해야만 보인다 — 예전 버그는 규칙이 아니라
// 소비처에 있었다(규칙은 애초에 불려지지도 않았다).
// ─────────────────────────────────────────────────────────────────────────────
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CompliancePanel } from './CompliancePanel';
import type { ConsentEvent, ConsentItemDef } from '../types';

const TODAY = '2026-07-22';

const MARKETING: ConsentItemDef = {
  id: 'marketing-email',
  label: '광고성 정보 수신 동의 (이메일)',
  description: '',
  purpose: 'marketing',
  necessity: 'optional',
  termsTypeId: 'marketing',
  retentionMonths: 12,
};

const ITEMS: readonly ConsentItemDef[] = [MARKETING];

/** 진짜 0건과 구분되는 '무언가 있는' 이력 — 준비 완료 분기가 실제로 계산을 도는지 본다 */
const EVENTS: readonly ConsentEvent[] = [
  {
    id: 'cev-001',
    occurredAt: '2026-01-02T03:04:05.000Z',
    subjectId: 'mb-1',
    subjectLabel: '홍길동',
    itemId: MARKETING.id,
    action: 'granted',
    termsVersion: 'v1.0',
    source: 'signup',
  },
];

/** 이 화면의 '대상 없음' 문장들 — 모름 상태에서는 하나도 나오면 안 된다 */
const NO_TARGET_SENTENCES = [
  '모든 동의가 시행 중인 버전 기준이에요.',
  '보관 기간이 지난 이력이 없어요.',
];

describe('CompliancePanel — 이력의 세 상태를 가른다', () => {
  it('조회 중에는 대상 없음을 말하지 않는다', () => {
    const { container } = render(
      <CompliancePanel items={ITEMS} events={null} loading onRetry={vi.fn()} today={TODAY} />,
    );

    expect(screen.getByLabelText('동의 이력을 불러오는 중')).toBeTruthy();
    for (const sentence of NO_TARGET_SENTENCES) {
      expect(container.textContent).not.toContain(sentence);
    }
  });

  it('조회에 실패하면 판정하지 못했다고 말하고 재시도를 준다 — 0건이라고 하지 않는다', () => {
    const onRetry = vi.fn();
    const { container } = render(
      <CompliancePanel
        items={ITEMS}
        events={null}
        loading={false}
        onRetry={onRetry}
        today={TODAY}
      />,
    );

    expect(container.textContent).toContain('판정하지 못했어요');
    expect(container.textContent).toContain('대상이 없다는 뜻이 아니에요');
    for (const sentence of NO_TARGET_SENTENCES) {
      expect(container.textContent).not.toContain(sentence);
    }

    screen.getByRole('button', { name: '다시 시도' }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('이력을 읽었으면 그때만 대상 수를 말한다', () => {
    const { container } = render(
      <CompliancePanel
        items={ITEMS}
        events={EVENTS}
        loading={false}
        onRetry={vi.fn()}
        today={TODAY}
      />,
    );

    expect(container.textContent).toContain('보관 기간이 지난 이력이 없어요.');
    expect(container.textContent).not.toContain('불러오지 못해');
  });

  it('진짜 0건도 읽은 것이다 — 빈 이력은 실패가 아니다', () => {
    const { container } = render(
      <CompliancePanel items={ITEMS} events={[]} loading={false} onRetry={vi.fn()} today={TODAY} />,
    );

    expect(container.textContent).toContain('보관 기간이 지난 이력이 없어요.');
  });
});
