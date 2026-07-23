// 카카오 템플릿 — 순수 규칙 테스트 (알림톡 · 브랜드 메시지)
//
// 겨누는 것은 **화면을 봐서는 알 수 없는 규칙**들이다. 이 규칙을 어기면 화면은 멀쩡하고 카카오가
// 반려하거나 발송을 거부한다 — 그 간극을 여기서 닫는다:
//   1) 글자 수로 센다(바이트 아님) · 알림톡은 버튼명이 본문에 합산된다
//   2) 치환변수 40개 상한 · 변수만으로 구성 금지 · 변수마다 예시값
//   3) 버튼 — 개수·유형·이름 길이·이름에 변수 금지·AC 는 채널추가형/복합형에서만
//   4) 발송 이력 잠금 (승인 취소로도 풀리지 않는다)
//   5) 브랜드 메시지 발송 시간대 08:00~20:50 · 유형이 정하는 본문 상한
import { describe, expect, it } from 'vitest';

import { byteLengthOf } from '../_shared/messaging';
import {
  AC_BUTTON_NAME,
  ALIMTALK_BODY_MAX,
  ALIMTALK_BUTTON_NAME_MAX,
  ALIMTALK_CHANNEL_ADD_GUIDE,
  ALIMTALK_EMPHASIS_TITLE_MAX,
  ALIMTALK_EMPHASIS_TITLE_TRUNCATE,
  ALIMTALK_EXTRA_INFO_MAX,
  ALIMTALK_ITEM_LIST_BODY_MAX,
  ALIMTALK_ITEM_LIST_MAX,
  ALIMTALK_ITEM_LIST_MIN,
  ALIMTALK_ITEM_NAME_MAX,
  BRAND_CAROUSEL_CARD_MAX,
  BRAND_CAROUSEL_CARD_MIN,
  BRAND_LIST_ITEM_MAX,
  BRAND_LIST_ITEM_MIN,
  BRAND_MESSAGE_BODY_MAX,
  BRAND_MESSAGE_BUTTON_NAME_MAX,
  BRAND_WIDE_IMAGE_BUTTON_MAX,
  KAKAO_BUTTON_MAX,
  alimtalkBillableLength,
  alimtalkBodyError,
  alimtalkBodyMaxOf,
  alimtalkHighlightTitleMax,
  alimtalkLockReasonOf,
  alimtalkVariableBearingText,
  allowsChannelAddButton,
  brandMessageBodyError,
  buttonCountMaxOf,
  buttonError,
  buttonNameMaxOf,
  buttonsError,
  cardsError,
  emphasisTitleError,
  emphasisTruncationWarning,
  extraInfoError,
  isBrandMessageSendableAt,
  itemHeaderError,
  itemsError,
  kakaoCharCount,
  listItemsError,
  missingVariableSamples,
  variableTokensOf,
} from './kakao';
import type { AlimtalkLengthParts, BrandCarouselCard, KakaoButton } from './kakao';

/** 테스트용 버튼 — 필요한 필드만 덮어쓴다 */
function button(overrides: Partial<KakaoButton> = {}): KakaoButton {
  return {
    id: 'b1',
    type: 'WL',
    name: '자세히 보기',
    linkMobile: 'https://m.example.com',
    linkPc: '',
    ...overrides,
  };
}

/* ── 1. 글자 수 — 바이트가 아니다 ─────────────────────────────────────────────── */

describe('카카오는 글자 수로 센다 (SMS 의 바이트와 다른 축)', () => {
  it('한글 한 글자는 1자다 — EUC-KR 바이트로는 2인 그 글자다', () => {
    expect(kakaoCharCount('가')).toBe(1);
    // 같은 문자열을 SMS 규칙으로 재면 2 다. 두 축이 실제로 다르다는 것을 여기서 못박는다.
    expect(byteLengthOf('가')).toBe(2);
  });

  it('한글 100자는 100자다 — 바이트(200)와 섞이면 상한이 절반으로 잘못 걸린다', () => {
    const body = '가'.repeat(100);
    expect(kakaoCharCount(body)).toBe(100);
    expect(byteLengthOf(body)).toBe(200);
  });

  it('이모지 한 개는 1자다 — String.length(코드 단위)는 2로 세므로 그것을 쓰지 않는다', () => {
    expect('🙂'.length).toBe(2);
    expect(kakaoCharCount('🙂')).toBe(1);
  });
});

/* ── 2. 알림톡 — 1,000자에 무엇이 합산되는가 ──────────────────────────────────── */

/**
 * 글자 수 셈의 조각 묶음 — 필요한 것만 덮어쓴다.
 *
 * 기본값은 '기본형 + 강조 없음' 이라, 아무것도 덮지 않으면 **본문과 버튼명만** 세는 종전 규칙과
 * 같은 결과가 나온다. 그 위에 유형을 하나씩 켜 보며 합산이 늘어나는지를 본다.
 */
function parts(overrides: Partial<AlimtalkLengthParts> = {}): AlimtalkLengthParts {
  return {
    body: '',
    emphasisType: 'none',
    emphasisTitle: '',
    emphasisSubtitle: '',
    itemHeader: '',
    itemHighlightTitle: '',
    itemHighlightDescription: '',
    items: [],
    messageType: 'basic',
    extraInfo: '',
    buttons: [],
    ...overrides,
  };
}

describe('알림톡 본문 길이 — 합산 대상', () => {
  it('버튼이 없으면 본문 글자 수 그대로다', () => {
    expect(alimtalkBillableLength(parts({ body: '가'.repeat(10) }))).toBe(10);
  });

  it('버튼명 글자 수가 더해진다 — 심사가 세는 값과 카운터가 세는 값이 같아야 한다', () => {
    const buttons = [button({ name: '자세히' }), button({ id: 'b2', name: '배송조회' })];
    // 본문 10 + '자세히'(3) + '배송조회'(4)
    expect(alimtalkBillableLength(parts({ body: '가'.repeat(10), buttons }))).toBe(17);
  });

  it('강조표기형이면 제목·보조문구도 합산된다', () => {
    const value = parts({
      body: '가'.repeat(10),
      emphasisType: 'title',
      emphasisTitle: '나'.repeat(5),
      emphasisSubtitle: '다'.repeat(3),
    });
    expect(alimtalkBillableLength(value)).toBe(18);
  });

  it('유형이 쓰지 않는 조각은 세지 않는다 — 화면에 보이지도 않는 글자로 카운터가 넘치면 안 된다', () => {
    // 강조 유형을 되돌려도 값은 폼에 남는다(편집기는 표시만 가른다). 그 값은 셈에서 빠져야 한다.
    const value = parts({
      body: '가'.repeat(10),
      emphasisType: 'none',
      emphasisTitle: '나'.repeat(50),
      emphasisSubtitle: '다'.repeat(50),
    });
    expect(alimtalkBillableLength(value)).toBe(10);
  });

  it('부가정보형이면 부가정보가 합산된다', () => {
    const value = parts({
      body: '가'.repeat(10),
      messageType: 'extra-info',
      extraInfo: '나'.repeat(7),
    });
    expect(alimtalkBillableLength(value)).toBe(17);
  });

  it('채널추가형은 **고정 안내 문구**의 길이가 유형만으로 잡힌다 (값이 아니라 유형이 정한다)', () => {
    const value = parts({ body: '가'.repeat(10), messageType: 'channel-add' });
    expect(alimtalkBillableLength(value)).toBe(10 + kakaoCharCount(ALIMTALK_CHANNEL_ADD_GUIDE));
  });

  it('아이템리스트형이면 헤더·하이라이트·행이 모두 합산된다', () => {
    const value = parts({
      body: '가'.repeat(10),
      emphasisType: 'item-list',
      itemHeader: '나'.repeat(4),
      items: [
        { id: 'i1', name: '주문번호', description: '12345' },
        { id: 'i2', name: '금액', description: '1000' },
      ],
    });
    // 10 + 4 + (4+5) + (2+4)
    expect(alimtalkBillableLength(value)).toBe(29);
  });

  it('본문만으로는 상한 안이지만 버튼명을 더하면 넘는 경우를 막는다', () => {
    const body = '가'.repeat(ALIMTALK_BODY_MAX - 2);
    // 본문 998자는 그 자체로는 통과한다
    expect(alimtalkBodyError(parts({ body }))).toBeNull();
    // 버튼명 4자를 더하면 1,002자가 되어 반려 대상이다 — 여기서 막지 않으면 카카오가 막는다
    expect(alimtalkBodyError(parts({ body, buttons: [button({ name: '배송조회' })] }))).toContain(
      String(ALIMTALK_BODY_MAX),
    );
  });

  it('정확히 상한이면 통과한다 (경계는 포함이다)', () => {
    expect(alimtalkBodyError(parts({ body: '가'.repeat(ALIMTALK_BODY_MAX) }))).toBeNull();
  });

  it('아이템리스트형은 상한이 700자다 — 같은 본문이 다른 강조 유형에서는 통과한다', () => {
    const body = '가'.repeat(ALIMTALK_ITEM_LIST_BODY_MAX + 1);
    expect(alimtalkBodyMaxOf('item-list')).toBe(ALIMTALK_ITEM_LIST_BODY_MAX);
    expect(alimtalkBodyError(parts({ body }))).toBeNull();
    expect(
      alimtalkBodyError(
        parts({
          body,
          emphasisType: 'item-list',
          items: [
            { id: 'i1', name: '항목', description: '값' },
            { id: 'i2', name: '항목', description: '값' },
          ],
        }),
      ),
    ).toContain(String(ALIMTALK_ITEM_LIST_BODY_MAX));
  });
});

/* ── 3. 치환변수 ──────────────────────────────────────────────────────────────── */

describe('알림톡 치환변수', () => {
  it('40개까지 쓸 수 있다', () => {
    expect(alimtalkBodyError(parts({ body: `안내 ${'#{이름}'.repeat(40)}` }))).toBeNull();
  });

  it('41개는 막는다 — 초과는 반려 사유다', () => {
    expect(alimtalkBodyError(parts({ body: `안내 ${'#{이름}'.repeat(41)}` }))).toContain('40');
  });

  it('변수만으로 이뤄진 본문은 막는다 — 심사자가 무엇이 발송될지 알 수 없다', () => {
    expect(alimtalkBodyError(parts({ body: '#{이름}#{주문번호}' }))).toContain('치환변수만으로');
  });

  it('변수 사이에 글자가 하나라도 있으면 변수 전용이 아니다', () => {
    expect(alimtalkBodyError(parts({ body: '#{이름}님 #{주문번호}' }))).toBeNull();
  });

  it('길이보다 변수 전용을 먼저 알린다 — 길이를 고쳐도 그 본문은 여전히 반려된다', () => {
    expect(alimtalkBodyError(parts({ body: '#{이름}'.repeat(300) }))).toContain('치환변수만으로');
  });

  it('본문에 쓰인 서로 다른 변수를 등장 순서대로 뽑는다 (중복은 한 번)', () => {
    expect(variableTokensOf('#{이름}님 #{주문번호} #{이름}')).toEqual(['#{이름}', '#{주문번호}']);
  });

  it('예시값이 빠진 변수를 집어낸다 — 카카오는 변수마다 예시값을 요구한다', () => {
    const body = '#{이름}님 #{주문번호}';
    expect(missingVariableSamples(body, { '#{이름}': '홍길동' })).toEqual(['#{주문번호}']);
    // 공백만 적은 것은 적지 않은 것이다
    expect(missingVariableSamples(body, { '#{이름}': '홍길동', '#{주문번호}': '  ' })).toEqual([
      '#{주문번호}',
    ]);
    expect(
      missingVariableSamples(body, { '#{이름}': '홍길동', '#{주문번호}': '20260716-0001' }),
    ).toEqual([]);
  });

  it('강조 제목·아이템값에 쓴 변수도 예시값 대상이다 — 본문만 훑으면 그 줄이 통째로 빠진다', () => {
    const text = alimtalkVariableBearingText(
      parts({
        body: '#{이름}님 안녕하세요',
        emphasisType: 'item-list',
        itemHeader: '#{쿠폰명} 안내',
        items: [{ id: 'i1', name: '주문번호', description: '#{주문번호}' }],
      }),
    );
    expect(variableTokensOf(text)).toEqual(['#{이름}', '#{쿠폰명}', '#{주문번호}']);
    // 본문 변수만 채우면 나머지 둘이 빠진 것으로 잡힌다
    expect(missingVariableSamples(text, { '#{이름}': '홍길동' })).toEqual([
      '#{쿠폰명}',
      '#{주문번호}',
    ]);
  });

  it('**변수를 쓸 수 없는 자리**는 예시값 대상이 아니다 — 지워야 할 글자를 채우라고 요구하지 않는다', () => {
    /* 보조문구·항목명·부가정보에는 애초에 변수를 쓸 수 없다(각각 emphasisTitleError ·
       itemsError · extraInfoError 가 막는다). 여기까지 예시값을 물으면 서로 반대되는 두 오류가
       같은 글자를 두고 다툰다. */
    const text = alimtalkVariableBearingText(
      parts({
        body: '안내드려요',
        emphasisType: 'title',
        emphasisTitle: '제목',
        emphasisSubtitle: '#{이름}',
        messageType: 'extra-info',
        extraInfo: '#{주문번호}',
      }),
    );
    expect(variableTokensOf(text)).toEqual([]);
  });
});

/* ── 3-2. 유형별 필드 규칙 ─────────────────────────────────────────────────────
 *
 * 화면을 봐서는 알 수 없고 카카오가 반려로만 알려 주는 규칙들이다. */

describe('강조표기형 — 제목과 보조문구는 함께여야 한다', () => {
  it('둘 다 있으면 통과한다', () => {
    expect(emphasisTitleError('배송이 시작되었어요', '주문 안내')).toBeNull();
  });

  it('제목만 있으면 막는다 — 제작가이드가 단독 사용을 금지한다', () => {
    expect(emphasisTitleError('배송이 시작되었어요', '')).toContain('보조문구');
  });

  it('보조문구만 있어도 막는다', () => {
    expect(emphasisTitleError('', '주문 안내')).toContain('제목');
  });

  it('보조문구에는 치환변수를 쓸 수 없다', () => {
    expect(emphasisTitleError('제목', '#{이름}님')).toContain('치환변수');
  });

  it('말줄임은 **막지 않고 경고만** 한다 — 카카오는 받아 주고 안드로이드에서만 잘린다', () => {
    const long = '가'.repeat(ALIMTALK_EMPHASIS_TITLE_TRUNCATE + 1);
    // 저장은 통과한다
    expect(emphasisTitleError(long, '보조')).toBeNull();
    // 대신 경고가 나온다
    expect(emphasisTruncationWarning(long, '보조')).toContain('말줄임');
    // 상한(50자) 안이면 경고도 오류도 없다
    expect(emphasisTruncationWarning('가'.repeat(10), '나'.repeat(10))).toBeNull();
  });

  it('입력 상한(50자)을 넘으면 그때는 막는다 — 경고와 차단은 다른 선이다', () => {
    expect(emphasisTitleError('가'.repeat(ALIMTALK_EMPHASIS_TITLE_MAX + 1), '보조')).toContain(
      String(ALIMTALK_EMPHASIS_TITLE_MAX),
    );
  });
});

describe('아이템리스트형 — 행 개수와 두 칸', () => {
  const item = (name: string, description: string) => ({ id: name, name, description });

  it('2~10개까지 넣을 수 있다', () => {
    expect(itemsError([item('가', '1'), item('나', '2')])).toBeNull();
  });

  it('1개는 막는다 — 표가 되지 않는다', () => {
    expect(itemsError([item('가', '1')])).toContain(String(ALIMTALK_ITEM_LIST_MIN));
  });

  it('11개는 막는다', () => {
    const many = Array.from({ length: ALIMTALK_ITEM_LIST_MAX + 1 }, (_, index) =>
      item(`n${String(index)}`, 'v'),
    );
    expect(itemsError(many)).toContain(String(ALIMTALK_ITEM_LIST_MAX));
  });

  it('항목명은 6자까지다 — 표의 왼쪽 열이라 짧다', () => {
    expect(itemsError([item('가'.repeat(7), '값'), item('나', '값')])).toContain(
      String(ALIMTALK_ITEM_NAME_MAX),
    );
  });

  it('항목명에는 치환변수를 쓸 수 없다 — 표의 머리글이 발송마다 달라지면 안 된다', () => {
    expect(itemsError([item('#{이름}', '값'), item('나', '값')])).toContain('치환변수');
  });

  it('어느 행이 문제인지 말한다 — 다섯 행 중 무엇을 고칠지가 사라지면 안 된다', () => {
    expect(itemsError([item('가', '1'), item('', '2')])).toContain('아이템 2');
  });

  it('하이라이트 상한은 **썸네일이 있으면 줄어든다** — 썸네일이 글자 자리를 빼앗는다', () => {
    expect(alimtalkHighlightTitleMax(false)).toBe(30);
    expect(alimtalkHighlightTitleMax(true)).toBe(21);

    const title = '가'.repeat(25);
    // 썸네일이 없으면 통과하는 같은 글자가
    expect(itemHeaderError('', title, '', false)).toBeNull();
    // 썸네일을 붙이는 순간 넘친다
    expect(itemHeaderError('', title, '', true)).toContain(String(alimtalkHighlightTitleMax(true)));
  });
});

describe('부가정보 — 고정 안내를 담는 자리다', () => {
  it('500자까지 쓸 수 있다', () => {
    expect(extraInfoError('가'.repeat(ALIMTALK_EXTRA_INFO_MAX))).toBeNull();
    expect(extraInfoError('가'.repeat(ALIMTALK_EXTRA_INFO_MAX + 1))).toContain(
      String(ALIMTALK_EXTRA_INFO_MAX),
    );
  });

  it('치환변수를 쓸 수 없다 — 발송마다 달라지면 이 유형을 고른 뜻이 사라진다', () => {
    expect(extraInfoError('주문 #{주문번호} 안내')).toContain('치환변수');
  });

  it('비면 막는다 — 부가정보형인데 부가정보가 없으면 기본형과 같다', () => {
    expect(extraInfoError('   ')).toContain('부가정보');
  });
});

/* ── 4. 버튼 ──────────────────────────────────────────────────────────────────── */

describe('카카오 버튼 규칙', () => {
  it(`${String(KAKAO_BUTTON_MAX)}개까지 넣을 수 있다`, () => {
    const buttons = Array.from({ length: KAKAO_BUTTON_MAX }, (_, index) =>
      button({ id: `b${String(index)}` }),
    );
    expect(buttonsError(buttons, { kind: 'alimtalk', messageType: 'basic' })).toBeNull();
  });

  it('개수를 넘기면 막는다', () => {
    const buttons = Array.from({ length: KAKAO_BUTTON_MAX + 1 }, (_, index) =>
      button({ id: `b${String(index)}` }),
    );
    expect(buttonsError(buttons, { kind: 'alimtalk', messageType: 'basic' })).toContain(
      String(KAKAO_BUTTON_MAX),
    );
  });

  it(`알림톡 버튼명은 ${String(ALIMTALK_BUTTON_NAME_MAX)}자까지다`, () => {
    expect(
      buttonError(button({ name: '가'.repeat(ALIMTALK_BUTTON_NAME_MAX) }), {
        kind: 'alimtalk',
        messageType: 'basic',
      }),
    ).toBeNull();
    expect(
      buttonError(button({ name: '가'.repeat(ALIMTALK_BUTTON_NAME_MAX + 1) }), {
        kind: 'alimtalk',
        messageType: 'basic',
      }),
    ).toContain(String(ALIMTALK_BUTTON_NAME_MAX));
  });

  it('브랜드 메시지도 기본은 14자다 — 짧아지는 것은 **채널이 아니라 유형**이 정한다', () => {
    /* [옛 규칙과 무엇이 달라졌나] 종전에는 '알림톡 14자 · 브랜드 메시지 8자' 로 채널이 상한을
       갈랐다. 실제 규격은 그렇지 않다 — 브랜드 메시지의 텍스트·이미지형도 14자이고, 8자로 줄어드는
       것은 버튼이 **가로로 나란히 놓이는** 와이드 이미지형뿐이다(kakao.ts buttonNameMaxOf 머리말).
       그래서 이 테스트는 '채널이 같아도 유형이 다르면 답이 다르다' 를 못박는다. */
    const name = '가'.repeat(BRAND_MESSAGE_BUTTON_NAME_MAX + 1);
    expect(buttonError(button({ name }), { kind: 'alimtalk', messageType: 'basic' })).toBeNull();
    expect(buttonError(button({ name }), { kind: 'brandmessage', bodyType: 'text' })).toBeNull();
    expect(
      buttonError(button({ name }), { kind: 'brandmessage', bodyType: 'wide-image' }),
    ).toContain(String(BRAND_MESSAGE_BUTTON_NAME_MAX));
  });

  it('버튼명에는 치환변수를 쓸 수 없다 — 심사가 본 적 없는 글자가 발송된다', () => {
    expect(
      buttonError(button({ name: '#{쿠폰명}' }), { kind: 'alimtalk', messageType: 'basic' }),
    ).toContain('치환변수');
    expect(
      buttonError(button({ name: '#{이름}님' }), { kind: 'alimtalk', messageType: 'basic' }),
    ).toContain('치환변수');
  });

  it('버튼명이 비면 막는다', () => {
    expect(
      buttonError(button({ name: '  ' }), { kind: 'alimtalk', messageType: 'basic' }),
    ).toContain('버튼명');
  });

  it('웹링크·앱링크는 모바일 링크가 있어야 한다', () => {
    expect(
      buttonError(button({ type: 'WL', linkMobile: '' }), {
        kind: 'alimtalk',
        messageType: 'basic',
      }),
    ).toContain('모바일 링크');
    expect(
      buttonError(button({ type: 'AL', linkMobile: '' }), {
        kind: 'alimtalk',
        messageType: 'basic',
      }),
    ).toContain('모바일 링크');
  });

  it('링크를 쓰지 않는 유형은 링크가 비어도 통과한다', () => {
    expect(
      buttonError(button({ type: 'DS', name: '배송조회', linkMobile: '' }), {
        kind: 'alimtalk',
        messageType: 'basic',
      }),
    ).toBeNull();
    expect(
      buttonError(button({ type: 'BK', name: '상담하기', linkMobile: '' }), {
        kind: 'alimtalk',
        messageType: 'basic',
      }),
    ).toBeNull();
  });
});

describe('채널추가(AC) 버튼 — 메시지 유형이 가른다', () => {
  const ac = button({ type: 'AC', name: AC_BUTTON_NAME, linkMobile: '' });

  it('채널추가형·복합형에서만 쓸 수 있다', () => {
    expect(allowsChannelAddButton('channel-add')).toBe(true);
    expect(allowsChannelAddButton('complex')).toBe(true);
    expect(allowsChannelAddButton('basic')).toBe(false);
    expect(allowsChannelAddButton('extra-info')).toBe(false);
  });

  it('기본형에 넣으면 막는다', () => {
    expect(buttonError(ac, { kind: 'alimtalk', messageType: 'basic' })).toContain('채널추가형');
  });

  it('부가정보형에도 넣을 수 없다', () => {
    expect(buttonError(ac, { kind: 'alimtalk', messageType: 'extra-info' })).toContain(
      '채널추가형',
    );
  });

  it('채널추가형·복합형에서는 통과한다', () => {
    expect(buttonError(ac, { kind: 'alimtalk', messageType: 'channel-add' })).toBeNull();
    expect(buttonError(ac, { kind: 'alimtalk', messageType: 'complex' })).toBeNull();
  });

  it('이름은 카카오가 고정한다 — 다른 이름이면 막는다', () => {
    expect(
      buttonError(
        { ...ac, name: '채널 추가하기' },
        { kind: 'alimtalk', messageType: 'channel-add' },
      ),
    ).toContain(AC_BUTTON_NAME);
  });

  it('브랜드 메시지에는 메시지 유형 축이 없어 유형 제약을 걸지 않는다', () => {
    expect(buttonError(ac, { kind: 'brandmessage', bodyType: 'text' })).toBeNull();
  });
});

/* ── 5. 발송 이력 잠금 ────────────────────────────────────────────────────────── */

describe('알림톡 수정 잠금 — 사유가 셋이고 길이 서로 다르다', () => {
  it('한 번이라도 발송됐으면 잠긴다', () => {
    expect(alimtalkLockReasonOf('approved', true)).toBe('sent');
  });

  it('발송 이력은 승인 상태보다 세다 — 승인을 취소해도 잠금이 풀리지 않는다', () => {
    expect(alimtalkLockReasonOf('draft', true)).toBe('sent');
    expect(alimtalkLockReasonOf('rejected', true)).toBe('sent');
  });

  it('검수중은 잠긴다 — 심사 대상과 제출본이 어긋나면 안 된다', () => {
    expect(alimtalkLockReasonOf('inspecting', false)).toBe('review');
  });

  it('승인만 되고 발송 전이면 잠기지만 되돌릴 수 있는 잠금이다', () => {
    expect(alimtalkLockReasonOf('approved', false)).toBe('approved');
  });

  it('미제출·반려는 잠기지 않는다 — 고쳐서 다시 내라는 상태다', () => {
    expect(alimtalkLockReasonOf('draft', false)).toBeNull();
    expect(alimtalkLockReasonOf('rejected', false)).toBeNull();
  });
});

/* ── 6. 브랜드 메시지 ─────────────────────────────────────────────────────────── */

describe('브랜드 메시지 발송 가능 시간 (08:00~20:50)', () => {
  it('08:00 부터 보낼 수 있다 (경계 포함)', () => {
    expect(isBrandMessageSendableAt(8, 0)).toBe(true);
  });

  it('07:59 는 보낼 수 없다', () => {
    expect(isBrandMessageSendableAt(7, 59)).toBe(false);
  });

  it('20:50 까지 보낼 수 있다 (경계 포함)', () => {
    expect(isBrandMessageSendableAt(20, 50)).toBe(true);
  });

  it('20:51 은 보낼 수 없다 — 법정 야간(21시)보다 이른 카카오의 마감이다', () => {
    expect(isBrandMessageSendableAt(20, 51)).toBe(false);
    // 21시 기준으로 판정했다면 통과했을 시각이다. 그 차이가 이 규칙을 따로 둔 이유다.
    expect(isBrandMessageSendableAt(20, 55)).toBe(false);
  });

  it('한낮은 보낼 수 있고 한밤은 보낼 수 없다', () => {
    expect(isBrandMessageSendableAt(13, 30)).toBe(true);
    expect(isBrandMessageSendableAt(23, 0)).toBe(false);
    expect(isBrandMessageSendableAt(3, 0)).toBe(false);
  });
});

describe('브랜드 메시지 본문 상한 — 유형이 정한다', () => {
  it('기본 텍스트형이 가장 길고 와이드 이미지형이 가장 짧다', () => {
    expect(BRAND_MESSAGE_BODY_MAX.text).toBe(1300);
    expect(BRAND_MESSAGE_BODY_MAX['wide-image']).toBe(76);
  });

  it('같은 본문이 텍스트형에서는 통과하고 와이드 이미지형에서는 막힌다', () => {
    /* [옛 규칙과 무엇이 달라졌나] 종전에는 이미지형 상한을 400자로 두어 '텍스트 통과 / 이미지 차단'
       이 성립했다. API 표면의 실제 규격은 텍스트형·이미지형이 **둘 다 1,300자**다 — 글자가 줄어드는
       것은 이미지가 말풍선을 통째로 차지하는 와이드형부터다(kakao.ts 브랜드 메시지 머리말). */
    const body = '가'.repeat(BRAND_MESSAGE_BODY_MAX['wide-image'] + 1);
    expect(brandMessageBodyError(body, 'text')).toBeNull();
    expect(brandMessageBodyError(body, 'image')).toBeNull();
    expect(brandMessageBodyError(body, 'wide-image')).toContain(
      String(BRAND_MESSAGE_BODY_MAX['wide-image']),
    );
  });

  it('상한 경계는 포함이다', () => {
    expect(
      brandMessageBodyError('가'.repeat(BRAND_MESSAGE_BODY_MAX['wide-image']), 'wide-image'),
    ).toBeNull();
  });

  it('빈 본문은 막는다', () => {
    expect(brandMessageBodyError('   ', 'text')).toContain('본문');
  });

  it('알림톡과 달리 변수 전용 본문을 막지 않는다 — 심사가 없어 그 반려 사유가 없다', () => {
    expect(brandMessageBodyError('#{이름}', 'text')).toBeNull();
  });

  it('텍스트형과 이미지형은 같은 1,300자다 — 이미지가 붙는다고 글자가 줄지 않는다', () => {
    /* 이 둘이 같은 것이 오타처럼 보이지만 API 표면의 규격이 그렇다(kakao.ts 브랜드 메시지 머리말).
       글자가 줄어드는 것은 이미지가 말풍선을 통째로 차지하는 **와이드형부터**다. */
    expect(BRAND_MESSAGE_BODY_MAX.image).toBe(BRAND_MESSAGE_BODY_MAX.text);
    expect(BRAND_MESSAGE_BODY_MAX['wide-image']).toBeLessThan(BRAND_MESSAGE_BODY_MAX.image);
  });
});

/* ── 7. 브랜드 메시지 — 카드형 · 유형이 정하는 버튼 규칙 ─────────────────────── */

describe('와이드 리스트형 — 항목 3~4개', () => {
  const listItem = (id: string) => ({ id, title: `제목 ${id}`, imageFileName: `${id}.jpg` });

  it('3개면 통과한다', () => {
    expect(listItemsError([listItem('a'), listItem('b'), listItem('c')])).toBeNull();
  });

  it('2개는 막는다 — 카카오가 리스트로 그리지 않는다', () => {
    expect(listItemsError([listItem('a'), listItem('b')])).toContain(String(BRAND_LIST_ITEM_MIN));
  });

  it('5개는 막는다', () => {
    const many = Array.from({ length: BRAND_LIST_ITEM_MAX + 1 }, (_, i) =>
      listItem(`x${String(i)}`),
    );
    expect(listItemsError(many)).toContain(String(BRAND_LIST_ITEM_MAX));
  });

  it('이미지가 빠진 항목을 집어낸다 — 어느 항목인지도 말한다', () => {
    const items = [listItem('a'), { id: 'b', title: '제목', imageFileName: '' }, listItem('c')];
    expect(listItemsError(items)).toContain('항목 2');
  });
});

describe('캐러셀형 — 카드 2~6장, 카드마다 버튼', () => {
  const card = (id: string, overrides: Partial<BrandCarouselCard> = {}): BrandCarouselCard => ({
    id,
    header: '헤더',
    body: '카드 본문이에요.',
    imageFileName: `${id}.jpg`,
    buttons: [
      { id: `${id}-b`, type: 'WL', name: '보기', linkMobile: 'https://m.example.com', linkPc: '' },
    ],
    ...overrides,
  });

  it('2장이면 통과한다', () => {
    expect(cardsError([card('a'), card('b')])).toBeNull();
  });

  it('1장은 막는다 — 넘길 것이 없으면 캐러셀이 아니다', () => {
    expect(cardsError([card('a')])).toContain(String(BRAND_CAROUSEL_CARD_MIN));
  });

  it('7장은 막는다', () => {
    const many = Array.from({ length: BRAND_CAROUSEL_CARD_MAX + 1 }, (_, i) =>
      card(`c${String(i)}`),
    );
    expect(cardsError(many)).toContain(String(BRAND_CAROUSEL_CARD_MAX));
  });

  it('버튼이 없는 카드를 막는다 — 눌러도 아무 데도 가지 않는 카드가 된다', () => {
    expect(cardsError([card('a'), card('b', { buttons: [] })])).toContain('카드 2');
  });

  it('카드 안의 버튼도 규칙을 받는다 — 3개는 막힌다(카드당 최대 2개)', () => {
    const three = card('a').buttons[0];
    if (three === undefined) throw new Error('fixture');
    const overloaded = card('b', {
      buttons: [three, { ...three, id: 'x2' }, { ...three, id: 'x3' }],
    });
    expect(cardsError([card('a'), overloaded])).toContain('카드 2');
  });
});

describe('버튼 상한은 **놓이는 자리**가 정한다', () => {
  it('알림톡·브랜드 텍스트형은 5개 14자', () => {
    expect(buttonCountMaxOf({ kind: 'alimtalk', messageType: 'basic' })).toBe(KAKAO_BUTTON_MAX);
    expect(buttonNameMaxOf({ kind: 'brandmessage', bodyType: 'text' })).toBe(
      ALIMTALK_BUTTON_NAME_MAX,
    );
  });

  it('와이드 이미지형만 2개 8자다 — 버튼이 가로로 나란히 놓여 한 칸이 절반이다', () => {
    expect(buttonCountMaxOf({ kind: 'brandmessage', bodyType: 'wide-image' })).toBe(
      BRAND_WIDE_IMAGE_BUTTON_MAX,
    );
    expect(buttonNameMaxOf({ kind: 'brandmessage', bodyType: 'wide-image' })).toBe(
      BRAND_MESSAGE_BUTTON_NAME_MAX,
    );

    // 같은 이름이 텍스트형에서는 통과하고 와이드 이미지형에서는 막힌다
    const name = '가'.repeat(BRAND_MESSAGE_BUTTON_NAME_MAX + 1);
    expect(buttonError(button({ name }), { kind: 'brandmessage', bodyType: 'text' })).toBeNull();
    expect(
      buttonError(button({ name }), { kind: 'brandmessage', bodyType: 'wide-image' }),
    ).toContain(String(BRAND_MESSAGE_BUTTON_NAME_MAX));
  });

  it('채널추가 버튼은 가장 위여야 한다 — 두 번째 자리면 반려된다', () => {
    const ac = button({ id: 'ac', type: 'AC', name: AC_BUTTON_NAME, linkMobile: '' });
    const wl = button({ id: 'wl' });
    const context = { kind: 'alimtalk', messageType: 'channel-add' } as const;

    expect(buttonsError([ac, wl], context)).toBeNull();
    expect(buttonsError([wl, ac], context)).toContain('가장 위');
  });
});
