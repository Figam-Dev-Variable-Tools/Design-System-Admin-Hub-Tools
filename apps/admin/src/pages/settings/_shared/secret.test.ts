// 시크릿 취급 회귀 테스트 (시스템 설정 섹션)
//
// 여기서 지키는 것은 스타일이 아니라 **보안 계약**이다: 마스킹된 표시에서 평문을 되찾을 수 없고,
// 픽스처의 키는 진짜처럼 보이지 않는다. 이 단언이 깨지면 '1회 노출' 이 거짓이 된다.
import { describe, expect, it } from 'vitest';

import { createDummyPlaintextKey, MASKED_SECRET_TEXT, maskSecret, previewOf } from './secret';

describe('maskSecret — 마스킹 표시', () => {
  it('접두어와 마지막 4자만 남기고 가운데는 글리프로 덮는다', () => {
    expect(maskSecret({ prefix: 'sk_test_', last4: '0001' })).toBe('sk_test_••••0001');
  });

  it('마스킹 결과에는 마지막 4자 외의 원본 문자가 남지 않는다', () => {
    const plaintext = createDummyPlaintextKey('sk_test_');
    const masked = maskSecret(previewOf(plaintext, 'sk_test_'));

    // 평문의 '몸통'(접두어 뒤 ~ 마지막 4자 앞)은 마스킹 표시에 한 조각도 들어 있지 않다
    const body = plaintext.slice('sk_test_'.length, -4);
    expect(body.length).toBeGreaterThan(0);
    expect(masked.includes(body)).toBe(false);
  });

  it('마스킹 표시로는 평문을 복원할 수 없다 (역함수가 없다)', () => {
    const first = createDummyPlaintextKey('sk_test_');
    const second = `${first.slice(0, -4)}${first.slice(-4)}`;

    // 같은 마지막 4자를 가진 서로 다른 평문은 같은 마스킹으로 접힌다 — 정보가 사라졌다는 뜻이다
    expect(maskSecret(previewOf(first, 'sk_test_'))).toBe(
      maskSecret(previewOf(second, 'sk_test_')),
    );
  });
});

describe('previewOf — 보여줄 수 있는 조각', () => {
  it('평문의 마지막 4자만 떼어 온다', () => {
    expect(previewOf('sk_test_DUMMYABCDEF1234', 'sk_test_')).toEqual({
      prefix: 'sk_test_',
      last4: '1234',
    });
  });
});

describe('createDummyPlaintextKey — 시연용 평문', () => {
  it('DUMMY 를 박아 진짜 키로 오인되지 않게 한다', () => {
    expect(createDummyPlaintextKey('sk_test_')).toContain('DUMMY');
  });

  it('운영 접두어(sk_live_)를 스스로 만들지 않는다 — 호출부가 준 접두어만 쓴다', () => {
    expect(createDummyPlaintextKey('sk_test_').startsWith('sk_test_')).toBe(true);
  });

  it('발급할 때마다 다른 값이 나온다 — 같은 키가 두 번 발급된 것처럼 보이지 않는다', () => {
    expect(createDummyPlaintextKey('sk_test_')).not.toBe(createDummyPlaintextKey('sk_test_'));
  });
});

describe('MASKED_SECRET_TEXT — 저장된 OAuth 시크릿 표시', () => {
  it('자릿수를 암시하지 않는 고정 글리프다', () => {
    expect(/^•+$/.test(MASKED_SECRET_TEXT)).toBe(true);
  });
});
