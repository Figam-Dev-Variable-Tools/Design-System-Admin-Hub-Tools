/**
 * 계약 적재 — contracts/*.contract.json 의 states[] 와 events.*.blockedWhen 을 전수 나열한다.
 *
 * 계약은 SSOT 다. states 가 비어 있으면 **대조 불가**이며, 대조 불가는 통과가 아니다
 * (SKILL 에스컬레이션: "계약에 states 가 비어 있어 대조 불가 → A18 경유 A19").
 */
import { CONTRACTS_DIR } from '../thresholds.ts';
import { readText, walkFiles } from './fsutil.ts';

export interface BlockedWhenCell {
  event: string;
  /** 차단 조건 (예: 'disabled' · 'loading') */
  condition: string;
}

export interface Contract {
  name: string;
  file: string;
  states: string[];
  blockedWhen: BlockedWhenCell[];
  /** 대조 불가 사유 — 있으면 blocker (측정 불가 ≠ 통과) */
  unmeasurable: string | null;
}

export function loadContracts(root: string): Contract[] {
  const files = walkFiles(root, CONTRACTS_DIR, ['.contract.json']).filter(
    (f) => !f.includes('/schemas/') && !f.includes('/review/'),
  );

  return files.map((file) => {
    const raw = JSON.parse(readText(root, file)) as {
      name?: string;
      states?: unknown;
      events?: Record<string, { blockedWhen?: unknown }>;
    };
    const name = raw.name ?? (file.split('/').pop() ?? file).replace('.contract.json', '');
    const states = Array.isArray(raw.states) ? raw.states.map(String) : [];
    const blockedWhen: BlockedWhenCell[] = Object.entries(raw.events ?? {}).flatMap(
      ([event, def]) =>
        Array.isArray(def?.blockedWhen)
          ? def.blockedWhen.map((c) => ({ event, condition: String(c) }))
          : [],
    );

    // 계약이 상태를 선언하지 않으면 "상태가 없다"가 아니라 "잴 수 없다"이다.
    const unmeasurable =
      states.length === 0
        ? '계약에 states[] 가 비어 있다 — 상태 커버리지를 대조할 수 없다 (A18 경유 A19에 계약 보완 요청)'
        : null;

    return { name, file, states, blockedWhen, unmeasurable };
  });
}
