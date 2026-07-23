// 오시는 길 — 주소 검색(카카오·다음 우편번호) 배선과 저장
//
// ─────────────────────────────────────────────────────────────────────────────
// [테스트는 카카오를 부르지 않는다]
// jsdom 에는 네트워크도 스크립트도 없다. 화면이 스크립트를 직접 불렀다면 여기서 `window.kakao`
// 전역을 통째로 흉내 내야 했을 것이고, 그 가짜는 진짜보다 커지면서도 **진짜가 바뀌면 아무것도
// 알려주지 않는다**. 그래서 경계를 shared/address-search 의 어댑터 함수 하나로 좁혀 두었고,
// 여기서는 그것만 갈아 낀다. 화면 코드에는 테스트를 위한 분기가 한 줄도 없다.
//
// [무엇을 못 박나]
//   ① 좌표 없이 **실제로 저장되는가** — 그리고 그 단언이 공허하지 않은가(대조군 둘)
//   ② 저장 페이로드에 위도·경도가 없다 (모델에서 사라졌다)
//   ③ 화면에 좌표 칸도 지도도 없다
//   ④ 주소를 고르면 폼 값이 실제로 채워지는가 (주소 · 상세주소)
//   ⑤ 검색 위젯의 로딩 / 실패가 서로 다른 화면인가
//   ⑥ 모달을 키보드만으로 열고 닫을 수 있고 초점이 돌아오는가
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import {
  resetAddressSearchAdapter,
  searchFailed,
  searchOk,
  setAddressSearchAdapter,
} from '../../../shared/address-search';
import type {
  AddressSearchAdapter,
  AddressSearchResult,
  PostalAddress,
} from '../../../shared/address-search';
import { directionsStore } from './data-source';
import type { Directions } from './types';
import DirectionsPage from './DirectionsPage';

/** 우편번호 서비스가 실제로 돌려주는 모양 (공식 가이드의 oncomplete 예시 값) */
const PANGYO: PostalAddress = {
  zonecode: '13529',
  roadAddress: '경기 성남시 분당구 판교역로 166',
  jibunAddress: '경기 성남시 분당구 백현동 532',
  buildingName: '카카오 판교 아지트',
  userSelectedType: 'R',
};

/** 검색 위젯 안의 '이 주소를 고른다' 를 흉내 내는 버튼 — 실제 위젯도 iframe 안의 클릭이다 */
const PICK_LABEL = '판교 주소 고르기';

const SEED: Directions = {
  address: '서울특별시 예시구 가상대로 123',
  addressDetail: '예시타워 8층',
  transit: '2호선 예시역 도보 5분',
};

function deferred<T>() {
  let settle: (value: T) => void = () => undefined;
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, settle };
}

function fakeAdapter(overrides: Partial<AddressSearchAdapter> = {}): AddressSearchAdapter {
  return {
    embedAddressSearch: (host, onSelect) => {
      const pick = document.createElement('button');
      pick.type = 'button';
      pick.textContent = PICK_LABEL;
      pick.addEventListener('click', () => {
        onSelect(PANGYO);
      });
      host.replaceChildren(pick);
      return Promise.resolve(
        searchOk(() => {
          host.replaceChildren();
        }),
      );
    },
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        {/* 이탈 가드(useNavigate)가 라우터를 요구한다 */}
        <MemoryRouter>
          <DirectionsPage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/** 첫 조회(픽스처 지연)가 끝나 폼이 실제로 그려질 때까지 기다린다 */
async function waitForForm(): Promise<HTMLInputElement> {
  return screen.findByLabelText<HTMLInputElement>(/^주소/, undefined, { timeout: 3000 });
}

const addressInput = () => screen.getByLabelText<HTMLInputElement>(/^주소/);
const detailInput = () => screen.getByLabelText<HTMLInputElement>(/^상세주소/);
const saveButton = () => screen.getByRole('button', { name: '저장' });

/* 픽스처 저장소는 모듈 하나짜리 싱글턴이라 테스트 사이로 값이 샌다 — 매번 같은 자리에서 시작한다.
   (save 스파이는 각 테스트가 직접 건다: 무엇이 저장됐는지가 이 파일의 주된 관심사다.) */
beforeEach(async () => {
  await directionsStore.save(SEED);
});

afterEach(() => {
  resetAddressSearchAdapter();
  vi.restoreAllMocks();
});

describe('오시는 길 — 좌표 없이 저장된다', () => {
  it('주소·상세주소·교통편만으로 저장이 끝까지 간다 (저장 호출 + 성공 토스트)', async () => {
    const user = userEvent.setup();
    const save = vi.spyOn(directionsStore, 'save');
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    await user.type(detailInput(), ' 802호');
    await user.click(saveButton());

    expect(await screen.findByText('오시는 길을 저장했어요.')).not.toBeNull();
    expect(save).toHaveBeenCalledTimes(1);
    // 페이로드에 좌표가 없다 — 저장되는 것은 주소·상세주소·교통편 셋뿐이다
    expect(Object.keys(save.mock.calls[0]?.[0] ?? {})).toEqual([
      'address',
      'addressDetail',
      'transit',
    ]);
  });

  /* [대조군 ①] 위 단언이 '어차피 늘 저장된다' 위에서 통과하는 것이 아님을 보인다.
     주소가 비면 zod 가 막고 저장은 **한 번도 불리지 않는다**. */
  it('주소가 비면 막힌다 — 저장이 불리지 않고 화면이 이유를 말한다', async () => {
    const user = userEvent.setup();
    await directionsStore.save({ ...SEED, address: '' });
    const save = vi.spyOn(directionsStore, 'save');
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    await user.type(detailInput(), ' 802호');
    await user.click(saveButton());

    expect(await screen.findByText('주소를 입력하세요.')).not.toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByText('오시는 길을 저장했어요.')).toBeNull();
  });

  /* [대조군 ②] 성공 토스트가 저장소의 결과를 실제로 반영하는지 — 저장이 실패하면 성공을 흉내 내지
     않는다. 이것이 없으면 '저장됐다' 단언은 화면이 늘 같은 문장을 그리는 것으로도 통과한다. */
  it('저장소가 실패하면 성공 토스트 대신 실패 배너가 뜬다', async () => {
    const user = userEvent.setup();
    vi.spyOn(directionsStore, 'save').mockRejectedValue(new Error('boom'));
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    await user.type(detailInput(), ' 802호');
    await user.click(saveButton());

    expect(await screen.findByText(/저장하지 못했어요/)).not.toBeNull();
    expect(screen.queryByText('오시는 길을 저장했어요.')).toBeNull();
  });
});

describe('오시는 길 — 좌표와 지도는 화면에 없다', () => {
  it('위도·경도 칸도, 지도 자리도, 앱 키 안내도 그리지 않는다', async () => {
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    expect(screen.queryByLabelText(/^위도/)).toBeNull();
    expect(screen.queryByLabelText(/^경도/)).toBeNull();
    expect(screen.queryByText(/지도/)).toBeNull();
    expect(screen.queryByText(/앱 키/)).toBeNull();
  });
});

describe('오시는 길 — 주소 검색 모달', () => {
  it('주소 칸을 누르면 주소 검색 모달이 열린다', async () => {
    const user = userEvent.setup();
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(addressInput());

    expect(await screen.findByRole('dialog')).not.toBeNull();
    expect(screen.getByRole('heading', { name: '주소 검색' })).not.toBeNull();
  });

  it('검색 위젯을 심는 동안과 심지 못했을 때를 다르게 말한다', async () => {
    const user = userEvent.setup();
    const pending = deferred<AddressSearchResult<() => void>>();
    setAddressSearchAdapter(fakeAdapter({ embedAddressSearch: () => pending.promise }));
    renderPage();
    await waitForForm();
    await user.click(addressInput());

    expect(await screen.findByText('주소 검색을 여는 중이에요…')).not.toBeNull();

    pending.settle(searchFailed('unreachable'));

    expect(await screen.findByText(/주소 검색을 불러오지 못했어요/)).not.toBeNull();
    expect(screen.queryByText('주소 검색을 여는 중이에요…')).toBeNull();
    expect(
      within(screen.getByRole('dialog')).getByRole('button', { name: '다시 시도' }),
    ).not.toBeNull();
  });

  it('주소를 고르면 모달이 닫히고 주소·상세주소가 채워진다', async () => {
    const user = userEvent.setup();
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    // 상세주소를 비워 두면 건물명 제안이 들어온다
    await user.clear(detailInput());
    await user.click(addressInput());
    await user.click(await screen.findByRole('button', { name: PICK_LABEL }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(addressInput().value).toBe(PANGYO.roadAddress);
    expect(detailInput().value).toBe(PANGYO.buildingName);
  });

  it('상세주소가 이미 있으면 건물명이 그것을 덮지 않는다', async () => {
    const user = userEvent.setup();
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    await user.clear(detailInput());
    await user.type(detailInput(), '8층 802호');
    await user.click(addressInput());
    await user.click(await screen.findByRole('button', { name: PICK_LABEL }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(detailInput().value).toBe('8층 802호');
  });

  it('키보드만으로 열고 닫을 수 있고, 닫히면 초점이 주소 칸으로 돌아온다', async () => {
    const user = userEvent.setup();
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    addressInput().focus();
    await user.keyboard('{Enter}');
    const dialog = await screen.findByRole('dialog');

    dialog.focus();
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(document.activeElement).toBe(addressInput());
  });

  it('검색으로 고른 주소가 그대로 저장된다', async () => {
    const user = userEvent.setup();
    const save = vi.spyOn(directionsStore, 'save');
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    await user.click(addressInput());
    await user.click(await screen.findByRole('button', { name: PICK_LABEL }));
    await waitFor(() => {
      expect(addressInput().value).toBe(PANGYO.roadAddress);
    });
    await user.click(saveButton());

    await waitFor(() => {
      expect(save).toHaveBeenCalledTimes(1);
    });
    expect(save.mock.calls[0]?.[0].address).toBe(PANGYO.roadAddress);
  });
});
