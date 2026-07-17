// 이용 시간(시작/종료)의 필수 여부와 오류 지목
//
// ─────────────────────────────────────────────────────────────────────────────
// [무엇을 지키나 — 한 구조가 낳은 두 결함]
// 예전 코드는 '이용 시간' 하나의 FormField 안에 래퍼 <div> 를 두고 시작·종료 <input type="time">
// 두 개를 넣었다. 그 구조가 두 가지를 동시에 망가뜨렸다:
//
//   ① **required 가 AT 에 닿지 않았다** (A11Y-11). FormField 는 required 를 자식 컨트롤의
//      aria-required 로 주입하지만(withAriaRequired) 자식이 래퍼 <div> 라 대상이 아니었다 —
//      그리고 그것은 FormField 의 버그가 아니다. 래퍼에 aria-required 를 얹는 것은 거짓 시맨틱이라
//      **의도적으로** 거부한다. 별표는 aria-hidden 이므로 스크린리더 사용자에게 이 필드가 필수임을
//      알리는 경로가 **0개**였다.
//
//   ② **두 입력이 같은 오류를 가리켰다.** 둘 다 aria-invalid={timeError !== undefined} 와
//      aria-describedby={errorIdOf('rsv-start')} 를 받았다. 그래서 **종료 시각만 틀려도 시작 시각이
//      함께 무효로 표시되고, 시작 시각에 포커스하면 남의 오류('종료 시각은 시작 시각보다 늦어야
//      합니다')를 자기 설명으로 읽었다.**
//
// 시작/종료를 각자의 FormField 로 나누면 둘 다 사라진다 — 각자 라벨·오류 <p>·주입 대상을 갖는다.
// 이 파일은 그 구조가 되돌아가는 것을 막는다.
//
// [왜 스키마가 아니라 화면을 태우나] 여기서 망가졌던 것은 **화면이 오류를 어느 컨트롤에
// 붙였는가**다. 스키마만 테스트하면 영원히 초록이다. 실제로 제출을 일으켜 DOM 을 봐야 잡힌다.
//
// [이 주석이 한때 틀렸다 — 스키마도 옳지 않았다] 예전엔 "검증 규칙(reservation-validation)은
// 옳았다 — 시각 오류를 startTime/endTime 각각의 path 로 낸다" 고 적혀 있었다. 그것은 **순서**
// 분기에만 참이었다. **형식** 분기는 어느 쪽이 틀려도 path:['startTime'] 로만 냈다. 그런데 이
// 파일의 테스트는 전부 형식이 옳은 값(14:00/13:00)만 넣어 그 분기를 한 번도 태우지 않았으므로,
// 틀린 전제와 결함이 나란히 살아남았다. 이제 형식 분기(빈 종료 시각)도 여기서 태운다.
// ─────────────────────────────────────────────────────────────────────────────
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ToastProvider } from '../../shared/ui';
import ReservationFormPage from './ReservationFormPage';

function renderNewForm() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={['/reservations/new']}>
          <Routes>
            <Route path="/reservations/new" element={<ReservationFormPage />} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  );
}

/**
 * 스키마의 시각 규칙까지 **도달시키기** 위한 최소 입력.
 *
 * reservationSchema 의 시각 검사는 z.object(…).check(…) 체인으로 얹혀 있어 **앞이 통과해야** 닿는다:
 * 고객명/연락처(requiredText)가 비면 객체 shape 에서 걸리고, 방문 날짜가 비면 그 앞 .check(날짜)가
 * 걸려 시각 .check 가 실행되지 않는다. 그러면 이 테스트는 '오류가 없어서' 통과하는 공허한 테스트가
 * 된다 — 실제로 확인했다(채우기 전에는 시각 오류 자체가 렌더되지 않았다). 그래서 앞선 칸을 채운다.
 */
function fillFieldsBeforeTime() {
  fireEvent.change(screen.getByLabelText(/고객명/), { target: { value: '김테스트' } });
  fireEvent.change(screen.getByLabelText(/연락처/), { target: { value: '010-1234-5678' } });
  fireEvent.change(screen.getByLabelText(/방문 날짜/), { target: { value: '2026-08-01' } });
}

/** 접근성 이름으로 두 시각 입력을 집는다 — id 가 아니라 사용자가 보는 이름으로 찾는다 */
function timeInputs() {
  return {
    start: screen.getByLabelText(/시작 시각/) as HTMLInputElement,
    end: screen.getByLabelText(/종료 시각/) as HTMLInputElement,
  };
}

describe('ReservationFormPage — 이용 시간의 required 가 AT 에 닿는다 (A11Y-11)', () => {
  it('시작·종료 두 입력 모두 aria-required 를 갖는다 (FormField 주입 결과)', () => {
    renderNewForm();
    const { start, end } = timeInputs();
    expect(start.getAttribute('aria-required')).toBe('true');
    expect(end.getAttribute('aria-required')).toBe('true');
  });

  it('두 입력이 서로 다른 컨트롤이고 각자 자기 라벨을 갖는다', () => {
    renderNewForm();
    const { start, end } = timeInputs();
    expect(start).not.toBe(end);
    expect(start.type).toBe('time');
    expect(end.type).toBe('time');
  });
});

describe('ReservationFormPage — 형식 오류도 틀린 그 칸에 붙는다', () => {
  /**
   * [왜 이 축이 비어 있었나] 위 두 테스트는 **둘 다 형식이 옳은** 값(14:00/13:00)을 넣어 순서
   * 규칙만 태운다. 그래서 형식 분기는 한 번도 실행되지 않았고, 거기 있던 결함이 살아남았다:
   * 형식 검사는 시작·종료 중 **어느 쪽이 틀려도** path:['startTime'] 로만 오류를 냈다.
   *
   * 비어 있는 종료 시각이 그 분기의 가장 흔한 입력이다 — '' 는 /^\d{2}:\d{2}$/ 를 통과하지 못한다.
   * 즉 사용자가 종료 시각을 안 채우고 제출하면, 제대로 채운 **시작 시각**이 빨개지고 정작 비어 있는
   * 종료 시각은 조용했다. (FS-037 은 이것을 '잔여(경미)' 로 적으며 `<input type="time">` 이 형식
   * 위반을 대개 막는다고 했지만, 그 논거는 **오타**를 막을 뿐 **빈 값**은 막지 못한다.)
   */
  it('종료 시각만 비어 있으면 종료만 무효다 — 시작이 대신 빨개지지 않는다', async () => {
    renderNewForm();
    const { start, end } = timeInputs();

    fillFieldsBeforeTime();
    fireEvent.change(start, { target: { value: '14:00' } });
    fireEvent.change(end, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /등록|저장/ }));

    await waitFor(() => {
      expect(end.getAttribute('aria-invalid')).toBe('true');
    });
    // 제대로 채운 칸은 무효가 아니다 — 고치기 전에는 여기가 'true' 였다
    expect(start.getAttribute('aria-invalid')).toBe('false');
  });

  it('시작 시각만 비어 있으면 시작만 무효다', async () => {
    renderNewForm();
    const { start, end } = timeInputs();

    fillFieldsBeforeTime();
    fireEvent.change(start, { target: { value: '' } });
    fireEvent.change(end, { target: { value: '15:00' } });
    fireEvent.click(screen.getByRole('button', { name: /등록|저장/ }));

    await waitFor(() => {
      expect(start.getAttribute('aria-invalid')).toBe('true');
    });
    expect(end.getAttribute('aria-invalid')).toBe('false');
  });
});

describe('ReservationFormPage — 각 시각 입력이 자기 오류를 가리킨다', () => {
  it('종료 ≤ 시작이면 종료만 무효다 — 시작은 남의 오류를 뒤집어쓰지 않는다', async () => {
    renderNewForm();
    const { start, end } = timeInputs();

    fillFieldsBeforeTime();
    // 시각 형식은 둘 다 유효하되 순서가 뒤집힌 값 — 스키마가 endTime path 로만 오류를 낸다
    fireEvent.change(start, { target: { value: '14:00' } });
    fireEvent.change(end, { target: { value: '13:00' } });
    fireEvent.click(screen.getByRole('button', { name: /등록|저장/ }));

    const alert = await screen.findByText(/종료 시각은 시작 시각보다 늦어야 합니다/);

    // 오류를 낸 쪽만 무효 — 이 두 줄이 고치기 전 코드에서 실패한다
    expect(end.getAttribute('aria-invalid')).toBe('true');
    expect(start.getAttribute('aria-invalid')).toBe('false');

    // 그리고 종료의 설명이 **그 오류 <p>** 를 가리킨다
    expect(end.getAttribute('aria-describedby')).toBe(alert.id);
    expect(start.getAttribute('aria-describedby')).toBeNull();
  });

  it('시작·종료의 오류 <p> id 가 서로 다르다 — 한 id 를 공유하지 않는다', async () => {
    renderNewForm();
    const { start, end } = timeInputs();

    fillFieldsBeforeTime();
    fireEvent.change(start, { target: { value: '14:00' } });
    fireEvent.change(end, { target: { value: '13:00' } });
    fireEvent.click(screen.getByRole('button', { name: /등록|저장/ }));

    await waitFor(() => {
      expect(end.getAttribute('aria-describedby')).not.toBeNull();
    });
    // 예전 구조에서는 둘 다 errorIdOf('rsv-start') 였다
    expect(end.getAttribute('aria-describedby')).not.toBe('rsv-start-error');
    expect(end.getAttribute('aria-describedby')).toBe('rsv-end-error');
  });
});
