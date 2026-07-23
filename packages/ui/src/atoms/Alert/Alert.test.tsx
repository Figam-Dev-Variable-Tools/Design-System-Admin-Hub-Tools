// Alert — 계약 검증 테스트 (contracts/Alert.contract.json@1.1.0)
//
//   states[]         default
//   루트 요소        <div> — 블록 자식(<div>·<Button>)을 받아도 레이아웃이 붕괴하지 않는다
//   events.onClose   핸들러가 있을 때만 닫기(×) 버튼이 나타난다 (blockedWhen 없음)
//   ref              forwardRef<HTMLDivElement> — 제출 실패 시 배너로 포커스 이동
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Alert } from './Alert';

describe('Alert — 계약 states[]', () => {
  it('Alert: default 상태 — tone=danger 는 role=alert + aria-live=assertive 로 즉시 통지한다', () => {
    render(<Alert>비밀번호가 올바르지 않아요</Alert>);
    const alert = screen.getByRole('alert');

    expect(alert.textContent).toContain('비밀번호가 올바르지 않아요');
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(alert.getAttribute('tabindex')).toBe('-1');
  });

  it('Alert: default 상태 — tone=info|success|warning 은 role=status + aria-live=polite 로 대기 통지한다', () => {
    render(<Alert tone="success">저장되었어요</Alert>);
    const status = screen.getByRole('status');

    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('Alert: default 상태 — 색상만으로 의미를 전달하지 않는다 (tone 별 아이콘을 텍스트와 함께 렌더 · WCAG 1.4.1)', () => {
    const { container } = render(<Alert tone="warning">확인이 필요해요</Alert>);
    const icon = container.querySelector('.tds-alert__icon');

    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('Alert — 루트는 블록 컨테이너(<div>) 다', () => {
  it('Alert: 루트가 <div> 라 블록 자식(<div> + 버튼 2개)을 배너 안에 담을 수 있다 (<p> 루트는 무효 마크업이다)', () => {
    render(
      <Alert tone="danger">
        <div data-testid="actions">
          <button type="button">재시도</button>
          <button type="button">목록으로</button>
        </div>
      </Alert>,
    );
    const alert = screen.getByRole('alert');

    // 루트 태그 자체를 못박는다 — <p> 로 되돌리면 이 단언이 실패한다.
    // (<p> 안의 <div> 는 무효 마크업이다: React 는 validateDOMNesting 경고를 내고, HTML 파서를 타는
    //  경로 — SSR/hydration · dangerouslySetInnerHTML — 에서는 <p> 가 먼저 닫혀 블록이 배너 밖으로 나간다.)
    expect(alert.tagName).toBe('DIV');
    expect(alert.contains(screen.getByTestId('actions'))).toBe(true);
    expect(alert.querySelectorAll('button')).toHaveLength(2);
  });
});

describe('Alert — 계약 events.onClose (핸들러의 유무가 해제 가능 여부다)', () => {
  it('Alert: onClose 를 주면 닫기 버튼이 나타나고 클릭 시 발화한다 (aria-label="안내 닫기")', async () => {
    const onClose = vi.fn();
    render(
      <Alert tone="info" onClose={onClose}>
        회원 등급 정책이 변경되었어요.
      </Alert>,
    );

    await userEvent.click(screen.getByRole('button', { name: '안내 닫기' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Alert: onClose 가 없으면 닫기 버튼이 나타나지 않는다 (별도 boolean prop 을 두지 않는다)', () => {
    render(<Alert tone="info">회원 등급 정책이 변경되었어요.</Alert>);

    expect(screen.queryByRole('button', { name: '안내 닫기' })).toBeNull();
  });
});

describe('Alert — forwardRef (제출 실패 시 배너로 포커스 이동)', () => {
  it('Alert: ref 가 배너 요소를 가리켜 호출부가 프로그래매틱 포커스를 옮길 수 있다 (tabIndex=-1)', () => {
    function Harness() {
      const ref = useRef<HTMLDivElement>(null);
      return (
        <>
          <Alert ref={ref}>이메일 또는 비밀번호가 올바르지 않아요</Alert>
          <button
            type="button"
            onClick={() => {
              ref.current?.focus();
            }}
          >
            에러로 이동
          </button>
        </>
      );
    }
    render(<Harness />);

    screen.getByRole('button', { name: '에러로 이동' }).click();

    expect(document.activeElement).toBe(screen.getByRole('alert'));
  });
});
