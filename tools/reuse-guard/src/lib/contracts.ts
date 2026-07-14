/**
 * 계약 경량 로더 — contracts/*.contract.json 에서 유사도 비교에 필요한 필드만 읽는다.
 * check 모드(src/index.ts)와 scan 모드(src/scan.ts)가 공유한다.
 */
import path from 'node:path';
import { readJson, walkFiles } from './fsutil.ts';

export interface ContractLite {
  name: string;
  version: string;
  level: string | null;
  status: string | null;
  propNames: string[];
  relPath: string;
}

/** contracts/ 직하 *.contract.json 에서 비교에 필요한 필드만 읽는다. */
export function loadContractLites(root: string): ContractLite[] {
  const rels = walkFiles(path.join(root, 'contracts')).filter(
    (r) => !r.includes('/') && r.endsWith('.contract.json'),
  );
  const out: ContractLite[] = [];
  for (const rel of rels) {
    try {
      const doc = readJson<Record<string, unknown>>(path.join(root, 'contracts', rel));
      const name = typeof doc['name'] === 'string' ? doc['name'] : null;
      if (!name) continue;
      const props = doc['props'];
      out.push({
        name,
        version: typeof doc['version'] === 'string' ? doc['version'] : 'unknown',
        level: typeof doc['level'] === 'string' ? doc['level'] : null,
        status: typeof doc['status'] === 'string' ? doc['status'] : null,
        propNames:
          props && typeof props === 'object' && !Array.isArray(props) ? Object.keys(props) : [],
        relPath: `contracts/${rel}`,
      });
    } catch {
      // 파싱 불가 계약은 비교에서 제외 — 계약 무결성은 validate:contracts / contract-test 의 몫
      console.warn(`[reuse-guard] 경고: contracts/${rel} 파싱 실패 — 비교에서 제외`);
    }
  }
  return out;
}
