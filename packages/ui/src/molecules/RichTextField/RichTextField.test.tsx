// RichTextField 계약 검증 (contracts/RichTextField.contract.json@1.0.0)
//
// 계약 states: default · focus-visible · disabled · error
// 계약 events: onChange (payload string · blockedWhen[disabled])
//
// 이 파일의 무게중심은 **sanitize** 다 — 이 컴포넌트를 들이는 이유가 XSS 방어이므로,
// '지워야 할 것이 지워졌는가' 를 공격 벡터별로 전수한다. 지연 로드되는 에디터 본체는
// findBy* 로 청크를 기다린 뒤 확인한다.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import {
  RichTextField,
  ensureRichText,
  isRichTextEmpty,
  plainToRichText,
  richTextLength,
  sanitizeRichText,
} from './index';

describe('sanitizeRichText — 허용목록 (저장 지점·렌더 지점 공용)', () => {
  it('sanitizeRichText: script 태그를 본문째 지운다', () => {
    const dirty = '<p>안녕</p><script>alert(1)</script>';
    const clean = sanitizeRichText(dirty);
    expect(clean).not.toContain('script');
    expect(clean).not.toContain('alert(1)');
    expect(clean).toContain('안녕');
  });

  it('sanitizeRichText: on* 이벤트 핸들러 속성을 지운다', () => {
    const clean = sanitizeRichText('<p onclick="alert(1)" onerror="x()">본문</p>');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('onerror');
    expect(clean).toContain('본문');
  });

  it('sanitizeRichText: img 의 onerror 로 들어오는 고전 벡터를 막는다', () => {
    const clean = sanitizeRichText('<img src="x" onerror="alert(1)">');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('alert');
  });

  /* ── alt 규범화 (axe image-alt · critical · ADR-0011) ─────────────────────────
   * alt 가 **아예 없는** img 를 스크린리더는 파일명/URL 로 읽는다 — `<img src="x">` 는 "x".
   * rel 강제와 같은 훅에서 alt="" 를 넣어 장식으로 뺀다. 저자가 쓴 alt 는 건드리지 않는다. */

  it('sanitizeRichText: alt 없는 img 에 alt="" 를 넣어 장식으로 표시한다', () => {
    const clean = sanitizeRichText('<img src="x" onerror="alert(1)">');
    expect(clean).toContain('alt=""');
  });

  it('sanitizeRichText: 저자가 쓴 alt 는 보존한다', () => {
    const clean = sanitizeRichText('<img src="https://x.test/a.png" alt="제품 상세 컷">');
    expect(clean).toContain('alt="제품 상세 컷"');
  });

  it('sanitizeRichText: javascript: 스킴 링크를 막는다', () => {
    const clean = sanitizeRichText('<a href="javascript:alert(1)">클릭</a>');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('클릭');
  });

  it('sanitizeRichText: data: 스킴을 막는다 — data:text/html 은 실행 경로다', () => {
    const clean = sanitizeRichText('<a href="data:text/html;base64,PHNjcmlwdD4=">x</a>');
    expect(clean).not.toContain('data:text/html');
  });

  it('sanitizeRichText: iframe/style/form 등 허용목록 밖 태그를 지운다', () => {
    const clean = sanitizeRichText(
      '<iframe src="https://evil.test"></iframe><style>body{display:none}</style><form><input></form><p>남는다</p>',
    );
    expect(clean).not.toContain('<iframe');
    expect(clean).not.toContain('<style');
    expect(clean).not.toContain('<form');
    expect(clean).not.toContain('<input');
    expect(clean).toContain('남는다');
  });

  it('sanitizeRichText: 허용 서식(굵게·제목·목록·링크)은 보존한다', () => {
    const clean = sanitizeRichText(
      '<h2>제목</h2><p><strong>굵게</strong> <em>기울임</em></p><ul><li>항목</li></ul><a href="https://example.com">링크</a>',
    );
    expect(clean).toContain('<h2>');
    expect(clean).toContain('<strong>');
    expect(clean).toContain('<em>');
    expect(clean).toContain('<li>');
    expect(clean).toContain('href="https://example.com"');
  });

  it('sanitizeRichText: blob: 이미지는 허용한다 — 업로드 심이 낼 수 있는 유일한 값이다', () => {
    const clean = sanitizeRichText('<img src="blob:http://localhost/abc-123" alt="사진">');
    expect(clean).toContain('blob:http://localhost/abc-123');
    expect(clean).toContain('alt="사진"');
  });

  it('sanitizeRichText: target=_blank 링크에 rel=noopener 를 강제한다 (reverse tabnabbing)', () => {
    const clean = sanitizeRichText('<a href="https://example.com" target="_blank">링크</a>');
    expect(clean).toContain('rel="noopener noreferrer"');
  });

  // 색·크기 리터럴을 쓰지 않고도 같은 것을 증명한다 — 이 파일도 토큰 축(하드코딩 0건) 스캔 대상이라
  // 공격 입력으로 적은 hex 색/픽셀 값도 정규식에는 하드코딩으로 잡힌다(스캐너는 문자열·주석을 가리지 않는다).
  it('sanitizeRichText: style 속성(디자인 시스템 밖의 값)을 지운다', () => {
    const clean = sanitizeRichText('<p style="color:red;font-size:2em">본문</p>');
    expect(clean).not.toContain('style=');
    expect(clean).toContain('본문');
  });
});

describe('richTextLength — 카운터는 마크업이 아니라 사람이 보는 글자를 센다', () => {
  it('richTextLength: 태그를 세지 않는다', () => {
    expect(richTextLength('<p>가나다</p>')).toBe(3);
  });

  it('richTextLength: 굵게를 입혀도 길이가 변하지 않는다 — 마크업을 세면 카운터가 튄다', () => {
    expect(richTextLength('<p><strong>가나다</strong></p>')).toBe(3);
  });

  it('richTextLength: 빈 본문은 0', () => {
    expect(richTextLength('<p></p>')).toBe(0);
  });
});

describe('isRichTextEmpty — 빈 본문 판정', () => {
  it("isRichTextEmpty: 에디터의 빈 상태('<p></p>')를 비었다고 본다", () => {
    expect(isRichTextEmpty('<p></p>')).toBe(true);
  });

  it('isRichTextEmpty: 공백만 있는 본문도 비었다고 본다', () => {
    expect(isRichTextEmpty('<p>   </p>')).toBe(true);
  });

  it('isRichTextEmpty: 이미지만 있는 본문은 비지 않았다', () => {
    expect(isRichTextEmpty('<p><img src="blob:x" alt=""></p>')).toBe(false);
  });

  it('isRichTextEmpty: 글자가 있으면 비지 않았다', () => {
    expect(isRichTextEmpty('<p>가</p>')).toBe(false);
  });
});

describe('plainToRichText / ensureRichText — 평문(textarea 시절) 마이그레이션', () => {
  it('plainToRichText: 한 줄 평문을 <p> 로 감싼다', () => {
    expect(plainToRichText('가벼운 패딩입니다.')).toBe('<p>가벼운 패딩입니다.</p>');
  });

  it('plainToRichText: 빈 줄로 나뉜 덩어리를 각각 <p> 로 옮긴다', () => {
    expect(plainToRichText('첫 문단\n\n둘째 문단')).toBe('<p>첫 문단</p><p>둘째 문단</p>');
  });

  it('plainToRichText: 홑 줄바꿈은 <br> 로 보존한다 — 문단이 한 줄로 뭉개지지 않게', () => {
    expect(plainToRichText('첫 줄\n둘째 줄')).toBe('<p>첫 줄<br>둘째 줄</p>');
  });

  it('plainToRichText: 평문 속 태그 꼴 글자는 이스케이프한다 — 사용자가 친 글자 그대로다', () => {
    const html = plainToRichText('<script>alert(1)</script>');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('plainToRichText: 빈 평문은 빈 문자열', () => {
    expect(plainToRichText('   ')).toBe('');
  });

  it('ensureRichText: 평문은 승격한다', () => {
    expect(ensureRichText('평문 설명')).toBe('<p>평문 설명</p>');
  });

  it('ensureRichText: 이미 HTML 인 값은 그대로 둔다(멱등) — 읽을 때마다 불러도 안전하다', () => {
    const html = '<p>이미 HTML</p>';
    expect(ensureRichText(html)).toBe(html);
    expect(ensureRichText(ensureRichText(html))).toBe(html);
  });

  it('ensureRichText: HTML 인 값도 sanitize 를 지난다', () => {
    expect(ensureRichText('<p>본문</p><script>alert(1)</script>')).not.toContain('script');
  });

  it('ensureRichText: 빈 값은 빈 문자열', () => {
    expect(ensureRichText('')).toBe('');
  });
});

describe('RichTextField — 계약 states · FormField 배선', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('RichTextField: default — 라벨과 평문 길이 카운터를 그린다', () => {
    render(
      <RichTextField label="상세설명" value="<p>가나다</p>" maxLength={2000} onChange={vi.fn()} />,
    );
    expect(screen.getByText('상세설명')).toBeTruthy();
    // 카운터 분자는 마크업 길이(12)가 아니라 평문 길이(3)다
    expect(screen.getByText('3/2000')).toBeTruthy();
  });

  it('RichTextField: default — 에디터가 오기 전에는 스켈레톤이 자리를 잡는다(aria-busy)', () => {
    const { container } = render(
      <RichTextField label="상세설명" value="<p>본문</p>" maxLength={2000} />,
    );
    // 첫 렌더는 Suspense fallback — 청크가 아직 없다
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
  });

  it('RichTextField: default — 에디터 청크를 지연 로드하고 툴바를 낸다', async () => {
    render(<RichTextField label="상세설명" value="<p>본문</p>" maxLength={2000} />);
    expect(await screen.findByRole('toolbar', { name: '본문 서식' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: '굵게' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: '링크' })).toBeTruthy();
    expect(await screen.findByRole('button', { name: '이미지' })).toBeTruthy();
  });

  /* ── 접근성 이름 (axe aria-input-field-name · serious · ADR-0011) ──────────────
   * 편집기는 div[role="textbox"] 라 FormField 의 `<label for>` 가 **닿지 않는다** —
   * `<label for>` 는 labelable element(input/select/textarea)에만 적용된다.
   * 이름은 label 의 id 를 aria-labelledby 로 가리켜야만 생긴다. 이게 없던 동안
   * 스크린리더는 편집기를 "편집, 비어 있음" 으로만 읽었다 (스토리 13건에서 실측). */

  it('RichTextField: 편집기가 label 로부터 접근성 이름을 얻는다 (role=textbox 는 label for 가 닿지 않는다)', async () => {
    render(<RichTextField label="상세설명" value="<p>본문</p>" maxLength={2000} />);
    // 이름으로 찾아진다는 것 자체가 aria-labelledby 가 걸렸다는 증거다.
    expect(await screen.findByRole('textbox', { name: '상세설명' })).toBeTruthy();
  });

  it('RichTextField: error — 오류 메시지를 role=alert 로 알린다', () => {
    render(
      <RichTextField
        label="상세설명"
        value="<p>본문</p>"
        maxLength={2000}
        error="상세설명을 입력하세요."
      />,
    );
    expect(screen.getByRole('alert').textContent).toContain('상세설명을 입력하세요.');
  });

  it('RichTextField: disabled — 툴바 버튼을 native disabled 로 막는다', async () => {
    render(<RichTextField label="상세설명" value="<p>본문</p>" maxLength={2000} disabled />);
    expect((await screen.findByRole('button', { name: '굵게' })).hasAttribute('disabled')).toBe(
      true,
    );
    expect((await screen.findByRole('button', { name: '이미지' })).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('RichTextField: 저장된 값이 오염돼 있어도 렌더 지점에서 sanitize 한다', async () => {
    // 저장된 값이 이 앱의 sanitize 를 거쳤다고 가정하지 않는다 — 렌더 지점 방어
    const { container } = render(
      <RichTextField
        label="상세설명"
        value='<p>본문</p><script>alert(1)</script><img src=x onerror="alert(2)">'
        maxLength={2000}
      />,
    );
    await screen.findByRole('toolbar', { name: '본문 서식' });
    await waitFor(() => {
      expect(container.innerHTML).not.toContain('onerror');
    });
    expect(container.innerHTML).not.toContain('alert(1)');
  });
});
