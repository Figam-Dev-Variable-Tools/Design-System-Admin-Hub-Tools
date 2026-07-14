/**
 * contracts/ 직하의 *.contract.json 로더.
 * schemas/, review/ 하위는 계약이 아니므로 제외한다.
 * JSON 파싱 실패는 "검증 불가 = 불일치"로 취급할 수 있도록 오류 목록으로 반환한다.
 */
import path from 'node:path';
import { readJson, walkFiles } from './fsutil.ts';
import type { Contract } from './types.ts';

export interface LoadedContract {
  contract: Contract;
  /** 리포 루트 기준 POSIX 상대경로 (예: contracts/Button.contract.json) */
  relPath: string;
}

export interface ContractLoadError {
  relPath: string;
  message: string;
}

export interface ContractLoadResult {
  contracts: LoadedContract[];
  errors: ContractLoadError[];
}

export function loadContracts(root: string): ContractLoadResult {
  const rels = walkFiles(path.join(root, 'contracts')).filter(
    (r) => !r.includes('/') && r.endsWith('.contract.json'),
  );
  const contracts: LoadedContract[] = [];
  const errors: ContractLoadError[] = [];

  for (const rel of rels) {
    const relPath = `contracts/${rel}`;
    try {
      const contract = readJson<Contract>(path.join(root, 'contracts', rel));
      if (typeof contract.name !== 'string' || typeof contract.version !== 'string') {
        errors.push({ relPath, message: '계약에 name/version 필드가 없어 검증할 수 없습니다.' });
        continue;
      }
      contracts.push({ contract, relPath });
    } catch (e) {
      errors.push({ relPath, message: `JSON 파싱 실패 — ${(e as Error).message}` });
    }
  }
  return { contracts, errors };
}
