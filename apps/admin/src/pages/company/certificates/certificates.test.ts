// 인증서/특허 화면의 동작 회귀 테스트 — 순서·필터(순수) + 폼 검증
import { describe, expect, it } from 'vitest';

import {
  byIssuedDateDesc,
  certKindLabel,
  certKindTone,
  certOrderAnnouncement,
  certReorderRefusal,
  filterCertificates,
  nextCertOrder,
  reorderCertificatesByIds,
  seedCertOrder,
  sortCertificates,
} from './types';
import type { CertItem } from './types';
import { certSchema } from './validation';
import type { CertFormValues } from './validation';

function itemOf(overrides: Partial<CertItem> & { id: string }): CertItem {
  return {
    name: '인증',
    issuer: '기관',
    issuedOn: '2023-01-01',
    kind: 'certificate',
    imageUrl: 'https://cdn.example.com/x.png',
    order: 1,
    ...overrides,
  };
}

const SAMPLE: readonly CertItem[] = [
  itemOf({ id: 'a', issuedOn: '2021-06-20', kind: 'certificate', order: 1 }),
  itemOf({ id: 'b', issuedOn: '2023-04-12', kind: 'certificate', order: 2 }),
  itemOf({ id: 'c', issuedOn: '2022-09-01', kind: 'patent', order: 3 }),
];

/**
 * [겨냥을 옮긴 단언] 예전에는 `sortCertificates` 가 발급일 내림차순이었고 이 단언이 그것을 지켰다.
 * 목록에 수동 순서가 생기면서 발급일 내림차순은 **목록 정렬이 아니라 최초 order 배정 규칙**이 됐다.
 * 규칙이 사라진 것이 아니므로 단언도 지우지 않고, 그 규칙이 지금 살고 있는 함수로 옮긴다.
 */
describe('byIssuedDateDesc — 발급일 내림차순(순수 · 최초 순서 배정용)', () => {
  it('최근 발급일이 위로 온다', () => {
    expect(byIssuedDateDesc(SAMPLE).map((x) => x.id)).toEqual(['b', 'c', 'a']);
  });

  it('seedCertOrder 는 그 순서로 order 를 1..n 으로 매긴다', () => {
    const seeded = seedCertOrder([
      {
        id: 'a',
        name: 'A',
        issuer: '기관',
        issuedOn: '2021-06-20',
        kind: 'certificate',
        imageUrl: '',
      },
      {
        id: 'b',
        name: 'B',
        issuer: '기관',
        issuedOn: '2023-04-12',
        kind: 'certificate',
        imageUrl: '',
      },
      { id: 'c', name: 'C', issuer: '기관', issuedOn: '2022-09-01', kind: 'patent', imageUrl: '' },
    ]);
    expect(seeded.map((x) => [x.id, x.order])).toEqual([
      ['b', 1],
      ['c', 2],
      ['a', 3],
    ]);
  });
});

describe('sortCertificates — 목록 정렬은 order 다(순수)', () => {
  it('order 오름차순으로 온다', () => {
    const list = [
      itemOf({ id: 'x', order: 3 }),
      itemOf({ id: 'y', order: 1 }),
      itemOf({ id: 'z', order: 2 }),
    ];
    expect(sortCertificates(list).map((x) => x.id)).toEqual(['y', 'z', 'x']);
  });

  /**
   * 이 화면에서 가장 틀리기 쉬운 자리 — **수동 순서와 발급일 규칙의 충돌**.
   * 아래 목록은 order 와 발급일이 정반대다. 목록이 발급일로 되돌아가면 운영자가 옮긴 행이
   * 다음 조회에서 제자리로 튀어 조작이 없던 일이 된다.
   */
  it('발급일이 최신이어도 order 가 뒤면 아래로 간다 (수동 순서가 이긴다)', () => {
    const list = [
      itemOf({ id: 'old', issuedOn: '2019-01-01', order: 1 }),
      itemOf({ id: 'new', issuedOn: '2025-12-31', order: 2 }),
    ];
    expect(sortCertificates(list).map((x) => x.id)).toEqual(['old', 'new']);
  });
});

describe('reorderCertificatesByIds — 순서 영속(순수)', () => {
  const list = [
    itemOf({ id: 'a', order: 1 }),
    itemOf({ id: 'b', order: 2 }),
    itemOf({ id: 'c', order: 3 }),
  ];

  it('orderedIds 순서대로 재배치하고 order 를 1..n 으로 다시 매긴다', () => {
    expect(reorderCertificatesByIds(list, ['c', 'a', 'b']).map((x) => [x.id, x.order])).toEqual([
      ['c', 1],
      ['a', 2],
      ['b', 3],
    ]);
  });

  it('목록에 없는 id 는 무시한다 (그 사이 삭제된 행)', () => {
    expect(reorderCertificatesByIds(list, ['ghost', 'b', 'a']).map((x) => x.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
  });

  it('nextCertOrder 는 최대 + 1 이다 — 새 항목은 발급일과 무관하게 맨 끝', () => {
    expect(nextCertOrder(list)).toBe(4);
    expect(nextCertOrder([])).toBe(1);
  });
});

describe('certReorderRefusal — 왜 순서를 못 바꾸는가(순수)', () => {
  const allowed = { canUpdate: true, filtered: false, count: 3 };

  it('조건이 맞으면 거부하지 않는다', () => {
    expect(certReorderRefusal(allowed)).toBeNull();
  });

  it('수정 권한이 없으면 권한을 사유로 말한다', () => {
    expect(certReorderRefusal({ ...allowed, canUpdate: false })).toContain('권한');
  });

  it('필터가 걸려 있으면 필터를 사유로 말한다 (조용히 끄지 않는다)', () => {
    const reason = certReorderRefusal({ ...allowed, filtered: true });
    expect(reason).not.toBeNull();
    expect(reason).toContain('필터');
  });

  it('1건뿐이면 바꿀 순서가 없다고 말한다', () => {
    expect(certReorderRefusal({ ...allowed, count: 1 })).toContain('2건 이상');
  });

  it('권한이 없으면서 필터도 걸렸다면 권한을 먼저 말한다 (필터를 풀어도 못 바꾼다)', () => {
    expect(certReorderRefusal({ canUpdate: false, filtered: true, count: 3 })).toContain('권한');
  });
});

describe('certOrderAnnouncement — 순서 변경 낭독(순수)', () => {
  const list = [
    itemOf({ id: 'a', name: '가족친화 인증', order: 1 }),
    itemOf({ id: 'b', name: '기업부설연구소 인정서', order: 2 }),
    itemOf({ id: 'c', name: '특허', order: 3 }),
  ];

  it('무엇이 몇 번째로 갔는지 말한다 (조사는 받침이 고른다)', () => {
    expect(certOrderAnnouncement(list, ['b', 'a', 'c'], 'a')).toBe(
      "'가족친화 인증'을 3건 중 2번째로 옮겼어요.",
    );
    expect(certOrderAnnouncement(list, ['b', 'a', 'c'], 'b')).toBe(
      "'기업부설연구소 인정서'를 3건 중 1번째로 옮겼어요.",
    );
  });

  it('모르는 id 면 아무 말도 만들지 않는다', () => {
    expect(certOrderAnnouncement(list, ['a', 'b', 'c'], 'ghost')).toBeNull();
  });
});

describe('filterCertificates — 구분 필터(순수)', () => {
  it('전체는 모두 돌려준다', () => {
    expect(filterCertificates(SAMPLE, 'all').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });

  it('인증서만', () => {
    expect(filterCertificates(SAMPLE, 'certificate').map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('특허만', () => {
    expect(filterCertificates(SAMPLE, 'patent').map((x) => x.id)).toEqual(['c']);
  });
});

describe('certKind 라벨·톤', () => {
  it('구분 라벨', () => {
    expect(certKindLabel('certificate')).toBe('인증서');
    expect(certKindLabel('patent')).toBe('특허');
  });

  it('톤은 인증서=info, 특허=success', () => {
    expect(certKindTone('certificate')).toBe('info');
    expect(certKindTone('patent')).toBe('success');
  });
});

function valuesOf(overrides: Partial<CertFormValues> = {}): CertFormValues {
  return {
    name: 'ISO 9001',
    issuer: '예시인증원',
    issuedOn: '2023-04-12',
    kind: 'certificate',
    imageUrl: 'https://cdn.example.com/x.png',
    ...overrides,
  };
}

function messageFor(values: CertFormValues, field: keyof CertFormValues): string | undefined {
  const result = certSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

describe('certSchema — 폼 검증', () => {
  it('정상 입력은 통과한다', () => {
    expect(certSchema.safeParse(valuesOf()).success).toBe(true);
  });

  it('명칭·발급기관이 비면 막는다', () => {
    expect(messageFor(valuesOf({ name: '' }), 'name')).toContain('입력');
    expect(messageFor(valuesOf({ issuer: '' }), 'issuer')).toContain('입력');
  });

  it('발급일 형식이 틀리면 막는다', () => {
    expect(messageFor(valuesOf({ issuedOn: '2023/04/12' }), 'issuedOn')).toContain('형식');
  });

  it('구분이 두 값이 아니면 막는다', () => {
    expect(messageFor(valuesOf({ kind: 'award' }), 'kind')).toContain('선택');
  });

  /**
   * [이미지는 폼에 남아 있다] 목록에서 이미지 **열**을 뺀 것이지 이미지를 뺀 것이 아니다.
   * 등록·수정 폼의 이미지 입력은 그대로이고, 그래서 이 필수 검증도 그대로다.
   */
  it('이미지가 비면 막는다 — 목록 열은 사라져도 폼 입력은 필수다', () => {
    expect(messageFor(valuesOf({ imageUrl: '' }), 'imageUrl')).toContain('이미지');
  });

  /**
   * [알려진 빚 — 계약이 아니다]
   * `blob:` 이 통과하는 것은 **바람직해서가 아니라** ImageUploadField 가 아직 업로드하지 않기
   * 때문이다. 그 필드가 낼 수 있는 값은 `blob:…` 과 `''` 뿐이라(URL 을 칠 입력이 없다) 여기서
   * http(s) 를 요구하면 폼이 영영 제출되지 않는다. 그래서 지금은 통과시킨다.
   * 이 단언을 '설계'로 읽지 말 것 — POST /api/uploads 가 붙으면 **이 테스트는 뒤집혀야 한다**
   * (blob: 는 거절되고 업로드 응답 URL 만 통과). 근거는 shared/crud/validation.ts 의
   * requiredImage 주석에 있다.
   */
  it('업로드 이음매가 없어 blob: 이 통과한다 — TODO(backend): POST /api/uploads 후 거절로 바뀐다', () => {
    expect(certSchema.safeParse(valuesOf({ imageUrl: 'blob:abc-123' })).success).toBe(true);
  });
});
