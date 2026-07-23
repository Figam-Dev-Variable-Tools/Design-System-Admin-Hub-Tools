// 운영진 그룹 = 발신 프로필 — **정본이 하나임**을 지키는 테스트
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나]
// 이 통합의 요점은 화면 두 개가 **같은 목록**을 본다는 것 하나다. 관리자 관리 화면에서 만든
// 그룹이 메시지 템플릿 편집기의 '발신 프로필' 셀렉트에 나타나야 하고, 지우면 두 곳에서 함께
// 사라져야 한다. 예전에는 두 화면이 각자의 하드코딩 배열을 읽어 서로를 몰랐다 — 그 상태에서도
// 각 화면의 단위 테스트는 전부 초록이었다. **어긋남은 두 소비자를 한 테스트에서 함께 봐야만
// 보인다.** 그래서 이 파일은 어댑터(admins/data-source)와 템플릿 저장소(message-templates/store)를
// 한 자리에서 읽는다.
//
// [왜 어댑터 레벨인가] 삭제 가드는 '서버가 거절한다' 는 계약이다(data-source.ts 머리말).
// 화면을 태워 확인하면 화면이 가드를 우회했을 때도 초록이 된다 — 계약은 계약이 사는 곳에서 본다.
// ─────────────────────────────────────────────────────────────────────────────
import { beforeEach, describe, expect, it } from 'vitest';

import { listSenderCapableAdminGroups } from '../../shared/fixtures/admin-groups';
import { wireDomains } from '../../wiring';
import {
  createAdminGroup,
  deleteAdminGroup,
  fetchAdminGroups,
  fetchAdminGroupUsage,
} from './data-source';

/** 어댑터는 전부 AbortSignal 을 받는다 — 취소하지 않는 테스트용 신호 */
function signal(): AbortSignal {
  return new AbortController().signal;
}

async function groupNames(): Promise<readonly string[]> {
  return (await fetchAdminGroups(signal())).map((group) => group.name);
}

function senderProfileNames(): readonly string[] {
  return listSenderCapableAdminGroups().map((profile) => profile.name);
}

beforeEach(() => {
  // failIfRequested 가 읽는 자리 — 다른 테스트가 남긴 ?fail= 이 새어 들어오지 않게 한다
  window.history.replaceState({}, '', '/users/admins');
});

// 삭제 가드는 발신 사용처 조회기를 요구한다 — 제품과 같은 배선을 건다(wiring.ts)
wireDomains();

describe('운영진 그룹 = 발신 프로필 — 정본이 하나다', () => {
  it('발신 자격을 켜고 만든 그룹은 좌측 목록과 발신 프로필 셀렉트에 **함께** 나타난다', async () => {
    await createAdminGroup(
      {
        name: '신규 발송센터',
        phoneNumbers: ['1588-1234'],
        emails: ['new@spaceplanning.ai'],
        usableAsSender: true,
      },
      signal(),
    );

    expect(await groupNames()).toContain('신규 발송센터');
    expect(senderProfileNames()).toContain('신규 발송센터');
  });

  it('발신 자격을 끈 그룹은 좌측 목록에만 있고 발신 프로필 셀렉트에는 **없다**', async () => {
    await createAdminGroup(
      {
        name: '조회 전용 그룹',
        phoneNumbers: [],
        emails: [],
        usableAsSender: false,
      },
      signal(),
    );

    // 목록은 하나로 합쳤다 — 그래서 좌측에는 뜬다
    expect(await groupNames()).toContain('조회 전용 그룹');
    // 그러나 발신 자격은 별개다 — 고르면 발신번호 후보가 0개인 항목이 드롭다운을 채우면 안 된다
    expect(senderProfileNames()).not.toContain('조회 전용 그룹');
  });

  it('발신번호·발신 이메일의 1:N 이 살아남는다 — 생성 폼이 대표값 1개만 받아도 배열이다', async () => {
    const created = await createAdminGroup(
      {
        name: '1대다 확인 그룹',
        phoneNumbers: ['02-577-1000'],
        emails: ['multi@spaceplanning.ai'],
        usableAsSender: true,
      },
      signal(),
    );

    expect(created.phoneNumbers).toEqual(['02-577-1000']);
    expect(created.emails).toEqual(['multi@spaceplanning.ai']);

    // 기존 프로필의 여러 값도 통합 뒤 그대로다 — 편집기의 둘째 셀렉트가 이 목록을 나열한다
    const brand = listSenderCapableAdminGroups().find(
      (profile) => profile.name === '스페이스플래닝 대표',
    );
    expect(brand?.phoneNumbers).toEqual(['1588-1234', '02-577-1000']);
    expect(brand?.emails).toEqual(['news@spaceplanning.ai', 'hello@spaceplanning.ai']);
  });

  it('같은 이름의 그룹은 거절한다 — 좌측 필터에서 어느 쪽을 고른 것인지 알 수 없게 된다', async () => {
    const draft = {
      name: '중복 검사 그룹',
      phoneNumbers: [],
      emails: [],
      usableAsSender: false,
    } as const;

    await createAdminGroup(draft, signal());
    await expect(createAdminGroup(draft, signal())).rejects.toThrow(
      '같은 이름의 그룹이 이미 있어요.',
    );

    // 대소문자·앞뒤 공백만 다른 것도 같은 이름이다
    await expect(
      createAdminGroup({ ...draft, name: '  중복 검사 그룹  ' }, signal()),
    ).rejects.toThrow('같은 이름의 그룹이 이미 있어요.');
  });

  it('삭제하면 좌측 목록과 발신 프로필 셀렉트에서 **함께** 사라진다', async () => {
    const created = await createAdminGroup(
      {
        name: '지울 발송센터',
        phoneNumbers: ['1666-0987'],
        emails: ['bye@spaceplanning.ai'],
        usableAsSender: true,
      },
      signal(),
    );
    expect(senderProfileNames()).toContain('지울 발송센터');

    await deleteAdminGroup(created.id, signal());

    expect(await groupNames()).not.toContain('지울 발송센터');
    expect(senderProfileNames()).not.toContain('지울 발송센터');
  });
});

describe('삭제 가드 — 고아를 만들지 않는다', () => {
  it('운영자가 남아 있는 그룹은 인원수와 해결 방법을 말하며 거절한다', async () => {
    // 'admin' 은 픽스처에서 운영자 3명이 속한 그룹이다
    const usage = await fetchAdminGroupUsage('admin', signal());
    expect(usage.adminCount).toBeGreaterThan(0);

    await expect(deleteAdminGroup('admin', signal())).rejects.toThrow(
      /운영자 3명이 속해 있어 삭제할 수 없어요/,
    );
    // 거절했으면 실제로 남아 있어야 한다 — 문구만 띄우고 지우는 일이 없게
    expect(await groupNames()).toContain('운영팀 admin');
  });

  it('발신 프로필로 쓰이는 그룹은 **걸린 템플릿 이름을 대며** 거절한다', async () => {
    // 'sp-brand' 는 '주문 완료 안내' · '월간 뉴스레터 기본형' 이 발신 프로필로 쓴다
    const usage = await fetchAdminGroupUsage('sp-brand', signal());
    expect(usage.adminCount).toBe(0);
    expect(usage.senderTemplateNames).toContain('주문 완료 안내');

    await expect(deleteAdminGroup('sp-brand', signal())).rejects.toThrow(
      /'주문 완료 안내'.*발신 프로필을 먼저 바꾼 뒤/s,
    );
    expect(senderProfileNames()).toContain('스페이스플래닝 대표');
  });

  it('막힐 이유가 없으면 지운다 — 가드가 모든 삭제를 막아 버리지 않는다', async () => {
    const created = await createAdminGroup(
      { name: '아무도 안 쓰는 그룹', phoneNumbers: [], emails: [], usableAsSender: false },
      signal(),
    );

    const usage = await fetchAdminGroupUsage(created.id, signal());
    expect(usage).toEqual({ adminCount: 0, senderTemplateNames: [] });

    await expect(deleteAdminGroup(created.id, signal())).resolves.toBeUndefined();
  });
});

describe('실패 경로 — 화면이 재시도를 띄울 수 있어야 한다', () => {
  it('?fail=createGroup 이면 생성이 실패한다 (모달이 오류를 띄우고 폼을 되돌려준다)', async () => {
    window.history.replaceState({}, '', '/users/admins?fail=createGroup');

    await expect(
      createAdminGroup(
        { name: '실패할 그룹', phoneNumbers: [], emails: [], usableAsSender: false },
        signal(),
      ),
    ).rejects.toThrow('요청을 처리하지 못했어요.');

    window.history.replaceState({}, '', '/users/admins');
    expect(await groupNames()).not.toContain('실패할 그룹');
  });

  it('?fail=deleteGroup 이면 삭제가 실패하고 그룹이 그대로 남는다 (확인 재클릭 = 재시도)', async () => {
    const created = await createAdminGroup(
      { name: '삭제 실패 그룹', phoneNumbers: [], emails: [], usableAsSender: false },
      signal(),
    );

    window.history.replaceState({}, '', '/users/admins?fail=deleteGroup');
    await expect(deleteAdminGroup(created.id, signal())).rejects.toThrow(
      '요청을 처리하지 못했어요.',
    );

    window.history.replaceState({}, '', '/users/admins');
    expect(await groupNames()).toContain('삭제 실패 그룹');

    // 그리고 재시도는 성공한다 — 실패가 상태를 망가뜨리지 않았다
    await expect(deleteAdminGroup(created.id, signal())).resolves.toBeUndefined();
  });

  it('취소된 요청은 AbortError 로 끝난다 — 모달을 닫으면 결과가 뒤늦게 튀어나오지 않는다', async () => {
    const controller = new AbortController();
    const pending = createAdminGroup(
      { name: '취소될 그룹', phoneNumbers: [], emails: [], usableAsSender: false },
      controller.signal,
    );
    controller.abort();

    await expect(pending).rejects.toThrow('요청이 취소되었어요.');
    expect(await groupNames()).not.toContain('취소될 그룹');
  });
});
