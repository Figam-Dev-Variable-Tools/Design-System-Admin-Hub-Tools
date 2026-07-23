/**
 * 행을 눌렀을 때 어디로 가는가 — 목록 표의 **행 목적지**를 이름 있는 개념으로 만든다.
 *
 * [왜 만들었나] 예전에는 `onEdit(item)` 하나가 세 가지 서로 다른 뜻을 겸했다:
 *
 *   - 17개 화면: `/:id/edit` 폼으로 간다        (이름 그대로)
 *   -  2개 화면: `/:id` **상세**로 간다          (ReviewListPage · MessageTemplateListPage)
 *   -  4개 화면: **모달**을 연다                 (3개 카테고리 화면 · LogoList)
 *
 * 이름이 동작을 말하지 않으니 세 가지가 한 prop 뒤에 섞였고, 그 결과가 전부 사용자에게 샜다:
 *
 *   1. **캡션이 거짓말을 했다.** CrudTable 은 23개 화면 전부에 "행을 누르면 해당 항목으로
 *      이동합니다" 를 읽어 줬다 — 모달을 여는 4개 화면은 **이동하지 않고**, 발송 완료된
 *      캠페인처럼 게이팅된 행은 **아무 일도 일어나지 않는다.**
 *   2. **조용한 무반응.** Email·Newsletter·SMS 는 `sendActionsFor(status).canEdit` 이 false 면
 *      onEdit 를 빈 함수로 넘겼다. 커서는 여전히 pointer 이고 캡션은 이동을 약속하는데
 *      눌러도 아무 일이 없다 — 사용자에게는 고장 난 화면이다.
 *   3. **형제 화면끼리 어긋났다.** 같은 `content/*` 목록인데 공지·FAQ 는 상세로 가고
 *      팝업·배너는 행 클릭이 아예 죽어 있다(연필 아이콘을 찾아야 한다).
 *
 * [설계] 목적지를 **판별 유니온**으로 만든다. 종류를 밝히지 않고는 만들 수 없으므로
 * 위 세 가지가 다시 한 이름 뒤에 숨지 못한다. 캡션 문장도 여기서 파생되어
 * **화면이 하는 일과 스크린리더가 듣는 말이 갈라질 수 없다.**
 *
 * `disabled` 는 조용한 무반응을 없애기 위한 것이다 — 행별로 '지금은 갈 수 없다' 를 밝히면
 * 표가 커서·캡션을 그에 맞게 바꾼다(빈 콜백을 넘겨 표를 속이지 않는다).
 */

/** 행을 눌렀을 때 갈 곳 */
export type RowTarget<T> =
  | {
      /** `/:id` 상세 화면으로 이동 */
      readonly kind: 'detail';
      readonly href: (item: T) => string;
      /** 이 행은 지금 갈 수 없다 — 이유를 주면 접근성 이름에 실린다 */
      readonly disabled?: (item: T) => string | false;
    }
  | {
      /** `/:id/edit` 폼으로 이동 */
      readonly kind: 'edit';
      readonly href: (item: T) => string;
      readonly disabled?: (item: T) => string | false;
    }
  | {
      /** 같은 화면에서 모달을 연다 — 이동하지 않는다 */
      readonly kind: 'modal';
      readonly open: (item: T) => void;
      readonly disabled?: (item: T) => string | false;
    }
  | {
      /** 행 클릭에 아무 의미가 없다 — 커서도 캡션도 그렇게 말한다 */
      readonly kind: 'none';
    };

/**
 * 캡션의 첫 문장 — **행 목적지에서 파생된다.**
 * 문장을 화면이 손으로 적지 않으므로 동작과 낭독이 갈라지지 않는다.
 */
export function rowTargetSentence<T>(target: RowTarget<T>, entityLabel: string): string {
  switch (target.kind) {
    case 'detail':
      return `${entityLabel} 목록 — 행을 누르면 상세 화면으로 이동해요.`;
    case 'edit':
      return `${entityLabel} 목록 — 행을 누르면 수정 화면으로 이동해요.`;
    case 'modal':
      // '이동' 이라고 말하지 않는다 — 실제로 이동하지 않는다
      return `${entityLabel} 목록 — 행을 누르면 편집 창이 열려요.`;
    case 'none':
      return `${entityLabel} 목록 — 조회 전용이에요.`;
  }
}

/**
 * 이 행을 활성화하는 콜백. 갈 수 없으면 `undefined` 를 돌려준다 —
 * 그러면 DS Table 이 `onActivate` 자체를 받지 않아 **커서가 pointer 가 되지 않는다.**
 * (빈 함수를 넘기면 표는 갈 수 있다고 믿고 어포던스를 그린다 — 그것이 조용한 무반응이었다.)
 */
export function rowActivator<T>(
  target: RowTarget<T>,
  item: T,
  navigate: (href: string) => void,
): (() => void) | undefined {
  if (target.kind === 'none') return undefined;
  if (target.disabled?.(item) !== undefined && target.disabled(item) !== false) return undefined;

  switch (target.kind) {
    case 'detail':
    case 'edit': {
      const href = target.href(item);
      return () => {
        navigate(href);
      };
    }
    case 'modal':
      return () => {
        target.open(item);
      };
  }
}

/** 이 행이 지금 갈 수 없는 이유 — 없으면 null */
export function rowDisabledReason<T>(target: RowTarget<T>, item: T): string | null {
  if (target.kind === 'none') return null;
  const reason = target.disabled?.(item);
  return reason === undefined || reason === false ? null : reason;
}
