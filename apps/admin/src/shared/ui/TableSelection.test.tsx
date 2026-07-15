// 순번 열 공통 셀 회귀 테스트 (A41) — 가운데 정렬 + 1-based 숫자 표기
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SeqCell, SeqHeaderCell } from './TableSelection';

describe('SeqHeaderCell — 순번 헤더', () => {
  it('헤더는 가운데 정렬이다', () => {
    render(
      <table>
        <thead>
          <tr>
            <SeqHeaderCell />
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByText('순번').style.textAlign).toBe('center');
  });
});

describe('SeqCell — 순번 셀', () => {
  it('가운데 정렬 + 천 단위 구분한 1-based 순번을 표기한다', () => {
    render(
      <table>
        <tbody>
          <tr>
            <SeqCell seq={1000} />
          </tr>
        </tbody>
      </table>,
    );
    const cell = screen.getByText('1,000');
    expect(cell.style.textAlign).toBe('center');
  });
});
