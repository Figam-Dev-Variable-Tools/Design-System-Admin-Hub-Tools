// 우편번호 서비스 응답 → 우리 모델. 외부 스크립트 없이 검증되는 순수 변환만 다룬다.
import { describe, expect, it } from 'vitest';

import { selectedAddressOf, toPostalAddress } from './contract';

describe('toPostalAddress — 콜백 데이터는 우리 타입 검사를 거친 적이 없다', () => {
  it('공식 가이드의 필드를 그대로 옮긴다', () => {
    expect(
      toPostalAddress({
        zonecode: '13529',
        address: '경기 성남시 분당구 판교역로 166',
        roadAddress: '경기 성남시 분당구 판교역로 166',
        jibunAddress: '경기 성남시 분당구 백현동 532',
        buildingName: '카카오 판교 아지트',
        userSelectedType: 'R',
        apartment: 'N',
      }),
    ).toEqual({
      zonecode: '13529',
      roadAddress: '경기 성남시 분당구 판교역로 166',
      jibunAddress: '경기 성남시 분당구 백현동 532',
      buildingName: '카카오 판교 아지트',
      userSelectedType: 'R',
    });
  });

  it('빠진 칸은 undefined 가 아니라 빈 문자열이 된다 — 주소 칸에 "undefined" 가 들어가지 않는다', () => {
    const address = toPostalAddress({ roadAddress: '서울 중구 세종대로 110' });
    expect(address.buildingName).toBe('');
    expect(address.zonecode).toBe('');
  });

  it('객체가 아닌 것이 와도 빈 주소로 수렴한다', () => {
    expect(toPostalAddress(null).roadAddress).toBe('');
    expect(toPostalAddress('서울').jibunAddress).toBe('');
  });

  it('userSelectedType 은 R/J 둘뿐이다 — 모르는 값은 도로명으로 본다', () => {
    expect(toPostalAddress({ userSelectedType: 'J' }).userSelectedType).toBe('J');
    expect(toPostalAddress({ userSelectedType: 'X' }).userSelectedType).toBe('R');
  });
});

describe('selectedAddressOf — 사용자가 고른 표기를 존중한다', () => {
  const both = {
    zonecode: '13529',
    roadAddress: '경기 성남시 분당구 판교역로 166',
    jibunAddress: '경기 성남시 분당구 백현동 532',
    buildingName: '',
  } as const;

  it('도로명을 골랐으면 도로명을 쓴다', () => {
    expect(selectedAddressOf({ ...both, userSelectedType: 'R' })).toBe(both.roadAddress);
  });

  it('지번을 골랐으면 지번을 쓴다', () => {
    expect(selectedAddressOf({ ...both, userSelectedType: 'J' })).toBe(both.jibunAddress);
  });

  it('고른 쪽이 비어 있으면 다른 쪽으로 넘어간다 — 빈 주소를 저장하지 않는다', () => {
    expect(selectedAddressOf({ ...both, roadAddress: '', userSelectedType: 'R' })).toBe(
      both.jibunAddress,
    );
  });
});
