// SeqCell · SeqHeaderCell — 동작 고정 테스트 (계약 비대상 표 조각)
//
// 헤더는 '순번' 문구, 셀은 1-based 숫자를 천 단위 구분으로 표기한다.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SeqCell, SeqHeaderCell } from './SeqCell';

describe('SeqHeaderCell', () => {
  it("헤더는 '순번' 문구를 그린다", () => {
    render(
      <table>
        <thead>
          <tr>
            <SeqHeaderCell />
          </tr>
        </thead>
      </table>,
    );
    expect(screen.getByRole('columnheader', { name: '순번' })).not.toBeNull();
  });
});

describe('SeqCell', () => {
  it('순번을 천 단위 구분으로 표기한다', () => {
    render(
      <table>
        <tbody>
          <tr>
            <SeqCell seq={1234} />
          </tr>
        </tbody>
      </table>,
    );
    expect(screen.getByRole('cell', { name: '1,234' })).not.toBeNull();
  });
});
