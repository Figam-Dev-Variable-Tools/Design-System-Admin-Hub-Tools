// 회사 정보 — 주소 검색(카카오·다음 우편번호) 배선과 저장
//
// ─────────────────────────────────────────────────────────────────────────────
// 오시는 길과 **같은 부품·같은 규칙**을 쓴다(shared/address-search). 그래서 여기서 다시 묻는 것은
// '그 부품이 이 화면에도 제대로 이어졌는가' 다:
//   ① 주소 칸은 손으로 칠 수 없고(readOnly), 눌러야 검색이 열린다 — 키보드로도 열린다
//   ② 고른 주소가 폼에 들어가고, 건물명은 **비어 있는 상세주소에만** 제안된다
//   ③ 상세주소가 **저장 페이로드의 독립된 칸**으로 나간다(주소 한 줄에 섞이지 않는다)
//   ④ ③이 공허하지 않도록 — 주소가 비면 저장이 아예 불리지 않는다(대조군)
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider } from '../../../shared/ui';
import {
  resetAddressSearchAdapter,
  searchOk,
  setAddressSearchAdapter,
} from '../../../shared/address-search';
import type { AddressSearchAdapter, PostalAddress } from '../../../shared/address-search';
import { companyProfileStore } from './data-source';
import type { CompanyProfile } from './types';
import CompanyProfilePage from './CompanyProfilePage';

const PANGYO: PostalAddress = {
  zonecode: '13529',
  roadAddress: '경기 성남시 분당구 판교역로 166',
  jibunAddress: '경기 성남시 분당구 백현동 532',
  buildingName: '카카오 판교 아지트',
  userSelectedType: 'R',
};

const PICK_LABEL = '판교 주소 고르기';

const SEED: CompanyProfile = {
  companyName: '주식회사 예시플래닝',
  businessNumber: '123-45-67890',
  address: '서울특별시 예시구 가상대로 123',
  addressDetail: '예시타워 8층',
  ceoName: '홍길동',
  contact: '02-0000-0000',
  logoUrl: '/fixtures/placeholder-image.svg',
};

function fakeAdapter(): AddressSearchAdapter {
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
  };
}

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter>
          <CompanyProfilePage />
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

async function waitForForm(): Promise<HTMLInputElement> {
  return screen.findByLabelText<HTMLInputElement>(/^주소/, undefined, { timeout: 3000 });
}

const addressInput = () => screen.getByLabelText<HTMLInputElement>(/^주소/);
const detailInput = () => screen.getByLabelText<HTMLInputElement>(/^상세주소/);
const saveButton = () => screen.getByRole('button', { name: '저장' });

beforeEach(async () => {
  await companyProfileStore.save(SEED);
});

afterEach(() => {
  resetAddressSearchAdapter();
  vi.restoreAllMocks();
});

describe('회사 정보 — 주소는 검색으로만 고른다', () => {
  it('주소 칸은 읽기 전용이고, 눌러야 검색 모달이 열린다', async () => {
    const user = userEvent.setup();
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    expect(addressInput().readOnly).toBe(true);
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(addressInput());

    expect(await screen.findByRole('dialog')).not.toBeNull();
    expect(screen.getByRole('heading', { name: '주소 검색' })).not.toBeNull();
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

  it('주소 칸의 Enter 는 폼을 제출하지 않는다 — 모달을 연다', async () => {
    const user = userEvent.setup();
    const save = vi.spyOn(companyProfileStore, 'save');
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    addressInput().focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('dialog')).not.toBeNull();
    expect(save).not.toHaveBeenCalled();
  });

  it('주소를 고르면 모달이 닫히고 주소·상세주소가 채워진다', async () => {
    const user = userEvent.setup();
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

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
});

describe('회사 정보 — 상세주소는 별도 칸으로 저장된다', () => {
  it('검색으로 고른 주소와 손으로 적은 상세주소가 각각 저장된다', async () => {
    const user = userEvent.setup();
    const save = vi.spyOn(companyProfileStore, 'save');
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    await user.clear(detailInput());
    await user.click(addressInput());
    await user.click(await screen.findByRole('button', { name: PICK_LABEL }));
    await waitFor(() => {
      expect(addressInput().value).toBe(PANGYO.roadAddress);
    });
    await user.clear(detailInput());
    await user.type(detailInput(), '3층 301호');
    await user.click(saveButton());

    expect(await screen.findByText('회사 정보를 저장했어요.')).not.toBeNull();
    const payload = save.mock.calls[0]?.[0];
    expect(payload?.address).toBe(PANGYO.roadAddress);
    // 한 칸에 뭉쳐 넣지 않는다 — 상세주소는 자기 칸으로 나간다
    expect(payload?.addressDetail).toBe('3층 301호');
  });

  /* [대조군] 위 단언이 '어차피 늘 저장된다' 위에서 통과하는 것이 아님을 보인다. */
  it('주소가 비면 막힌다 — 저장이 불리지 않고 화면이 이유를 말한다', async () => {
    const user = userEvent.setup();
    await companyProfileStore.save({ ...SEED, address: '' });
    const save = vi.spyOn(companyProfileStore, 'save');
    setAddressSearchAdapter(fakeAdapter());
    renderPage();
    await waitForForm();

    await user.type(detailInput(), ' 802호');
    await user.click(saveButton());

    expect(await screen.findByText('주소를 입력하세요.')).not.toBeNull();
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByText('회사 정보를 저장했어요.')).toBeNull();
  });
});
