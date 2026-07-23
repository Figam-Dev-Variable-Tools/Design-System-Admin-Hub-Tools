// 사이트 기본 설정 검증 규칙 (시스템 설정 섹션 소유 — 검증의 정본은 이 zod 스키마다)
//
// [화면은 규칙을 갖지 않는다] 입력을 막지 않고, 제출 시점에 스키마가 판정한다. 같은 규칙이
// 화면 세 곳에 흩어지지 않고, 백엔드가 붙어도 그대로 계약 검증에 쓴다 (customer-settings 선례).
//
// [파일 검증도 여기 산다] 확장자·용량·해상도 판정은 **순수 함수**다 — File 객체가 아니라 그 속성만
// 받는다(PickedFile). 그래서 테스트가 jsdom 의 File 을 흉내 내지 않고 규칙만 직접 부를 수 있다.
import * as z from 'zod/mini';

import { byteLengthOf } from '../../../shared/format';
import { optionalText, requiredText } from '../_shared/validation';

/* ── 길이 상한 ─────────────────────────────────────────────────────────────── */

/** 사이트 이름 — 브라우저 탭·소셜 공유 카드에 들어가는 자리라 짧게 못박는다 */
export const SITE_NAME_MAX = 20;

/** 사이트 설명 — 검색 결과 스니펫 길이를 넘기면 뒤가 잘린다 */
export const SITE_DESCRIPTION_MAX = 100;

/**
 * 메일·SMS 전용 이름 — **글자 수가 아니라 바이트다.**
 *
 * 이 이름은 문자 본문 앞에 접두로 붙는다. SMS 본문은 EUC-KR 기준 90byte 를 넘는 순간 LMS 로
 * 승격되므로(marketing/_shared/messaging), 접두사가 몇 바이트를 먹는지가 곧 본문에 남는 여유다.
 * 한글은 1자가 2byte 다 — '스페이스플래닝'(7자)은 14byte 를 가져간다.
 */
export const MESSAGING_NAME_MAX_BYTES = 40;

/* ── 파일 규칙 ─────────────────────────────────────────────────────────────── */

/** 파비콘 최소 변 길이(픽셀) — 이보다 작으면 탭에서 뭉갠다 */
export const FAVICON_MIN_EDGE = 16;

/** 파비콘 용량 상한 — 탭 아이콘 하나가 무거울 이유가 없다 */
export const FAVICON_MAX_BYTES = 100 * 1024;

/** 대표 이미지·비공개용 이미지 용량 상한 */
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** 파일에서 우리가 보는 속성만 — File 이 그대로 대입된다(테스트는 리터럴을 넘긴다) */
export interface PickedFile {
  readonly name: string;
  readonly size: number;
  readonly type: string;
}

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/* ── 파일 형식 판정 — 확장자 하나만 믿지 않는다 ─────────────────────────────────
 *
 * [왜 확장자만으로 부족한가] 확장자는 사용자가 자유롭게 바꾼다. `payload.svg` 를 `cover.png` 로
 * 고치면 확장자 검사만으로는 통과하고, 그렇게 들어온 SVG 는 스크립트를 품을 수 있다 — 이 화면이
 * SVG 를 목록에서 뺀 이유가 무력해진다.
 *
 * [왜 허용목록이 아니라 거부목록인가] 처음에는 MIME 을 좁게 허용하려 했으나 실제 파일을 거절했다.
 * `.ico` 의 MIME 은 브라우저·OS 마다 갈린다(image/x-icon · image/vnd.microsoft.icon · image/png ·
 * 빈 값). 신뢰할 만한 허용목록을 만들 수 없는 값으로 통과 조건을 세우면 정상 사용자가 막힌다.
 * 반면 **막아야 할 것은 좁고 분명하다** — 스크립트를 품을 수 있는 형식이다. 그래서 확장자로
 * 통과시키되, MIME 이 위험한 형식이라고 스스로 말하면 그때 거절한다.
 *
 * MIME 도 위조 가능하므로 이것은 1차 방어일 뿐이다. 최종 판정은 서버가 내용을 보고 해야 한다
 * (TODO(backend): 업로드 시 매직 넘버 검사).
 */
const DANGEROUS_MIME_PREFIXES: readonly string[] = ['image/svg', 'text/', 'application/'];

function hasDangerousDeclaredType(file: PickedFile): boolean {
  const declared = file.type.trim().toLowerCase();
  if (declared === '') return false;
  return DANGEROUS_MIME_PREFIXES.some((prefix) => declared.startsWith(prefix));
}

/** 위반이면 화면에 띄울 문구, 통과면 null */
export function faviconFileError(file: PickedFile): string | null {
  if (extensionOf(file.name) !== 'ico' || hasDangerousDeclaredType(file)) {
    return '파비콘은 ICO 파일만 올릴 수 있어요.';
  }
  if (file.size > FAVICON_MAX_BYTES) {
    return '파비콘 용량은 100KB 를 넘을 수 없어요.';
  }
  return null;
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif'] as const;

export function imageFileError(file: PickedFile): string | null {
  if (
    !IMAGE_EXTENSIONS.some((extension) => extension === extensionOf(file.name)) ||
    hasDangerousDeclaredType(file)
  ) {
    return 'PNG · JPG · GIF 파일만 올릴 수 있어요.';
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return '이미지 용량은 5MB 를 넘을 수 없어요.';
  }
  return null;
}

/** 해상도는 파일을 실제로 읽어야 알 수 있다 — 읽어 온 크기를 여기서 판정한다 */
export function faviconDimensionError(width: number, height: number): string | null {
  if (width < FAVICON_MIN_EDGE || height < FAVICON_MIN_EDGE) {
    return '파비콘은 가로·세로 16 이상이어야 해요.';
  }
  return null;
}

/* ── 값 스키마 ─────────────────────────────────────────────────────────────── */

/* ── 자산 URL — 스킴을 제한한다 ────────────────────────────────────────────────
 *
 * 이 URL 은 `<img src>` 로 그대로 나가고(AssetField.tsx), 대표 이미지는 **방문자에게 공유되는
 * 링크 카드**에도 실린다. 값이 서버에서 오더라도 화면이 무검증으로 믿으면, 저장 경로가 한 번
 * 뚫렸을 때 `javascript:` 나 제3자 추적 픽셀이 그대로 심긴다.
 *
 * 허용: 사이트 내부 경로(`/...`)와 https. 막음: 그 외 전부 — `javascript:`·`data:`·평문 http·
 * 프로토콜 상대(`//host`). data: 는 사람이 붙여 넣을 값이 아니고 허용하면 검사의 의미가 없어진다.
 */
export function isDisplayableAssetUrl(value: string): boolean {
  const url = value.trim();
  if (url === '') return true;
  // 프로토콜 상대(`//host`)는 내부 경로처럼 보이지만 외부로 나간다 — 먼저 거른다
  if (url.startsWith('//')) return false;
  if (url.startsWith('/')) return true;
  return url.toLowerCase().startsWith('https://');
}

/** 업로드된 자산 1건 — 파일명·용량(byte)·표시 URL */
const siteAssetSchema = z.nullable(
  z
    .object({
      name: z.string(),
      size: z.number(),
      url: z.string(),
    })
    .check((ctx) => {
      if (!isDisplayableAssetUrl(ctx.value.url)) {
        ctx.issues.push({
          code: 'custom',
          input: ctx.value.url,
          path: ['url'],
          message: '이미지 주소는 https 또는 사이트 내부 경로여야 해요.',
        });
      }
    }),
);

export type SiteAsset = z.infer<typeof siteAssetSchema>;

/** 공개 범위 — 사이트를 누가 볼 수 있는가 */
export const VISIBILITY_VALUES = ['public', 'private'] as const;

export type SiteVisibility = (typeof VISIBILITY_VALUES)[number];

/**
 * 비공개용 이미지를 지금 만질 수 있는가.
 *
 * 이 이미지는 **비공개 페이지에만** 그려진다. 전체 공개 상태에서 올려 봐야 아무도 보지 못한다 —
 * 그래서 화면은 블록을 숨기지 않고 **잠근다**(hide 가 아니라 disable):
 *   · 숨기면 '비공개로 바꾸면 무엇을 더 정해야 하는지' 를 미리 알 수 없다. 전환 후에야 새 입력이
 *     튀어나와 저장을 한 번 더 하게 만든다.
 *   · 잠그면 자리는 보이되 지금은 효과가 없다는 사실이 함께 읽힌다(안내 문구가 그렇게 말한다).
 * 이미 올려 둔 값은 **지우지 않는다** — 공개↔비공개를 오갈 때마다 이미지를 다시 올리게 하지 않는다.
 */
export function isPrivateImageEditable(visibility: SiteVisibility): boolean {
  return visibility === 'private';
}

export const siteSettingsSchema = z
  .object({
    siteName: requiredText(SITE_NAME_MAX, {
      missing: '사이트 이름을 입력하세요.',
      tooLong: `사이트 이름은 ${String(SITE_NAME_MAX)}자를 넘을 수 없어요.`,
    }),
    siteDescription: optionalText(
      SITE_DESCRIPTION_MAX,
      `사이트 설명은 ${String(SITE_DESCRIPTION_MAX)}자를 넘을 수 없어요.`,
    ),

    messagingNameEnabled: z.boolean(),
    messagingName: z.string(),

    /**
     * 사이트 주소 — 이 화면에서 **고치지 않는다**(도메인 연결은 별도 화면의 일이다).
     * OG 카드 미리보기가 '공유했을 때 어떤 주소로 보이는가' 를 그리려면 값이 필요해 폼에 싣고 다닌다.
     */
    siteUrl: z.string(),

    favicon: siteAssetSchema,
    ogImage: siteAssetSchema,

    visibility: z.enum(VISIBILITY_VALUES),
    privateImage: siteAssetSchema,

    copyProtection: z.boolean(),
    mobileZoomAllowed: z.boolean(),
    keepSignedIn: z.boolean(),
  })
  .check((ctx) => {
    const draft = ctx.value;

    // 전용 이름을 켜 놓고 비워 두면 발송 본문의 접두사가 사라진다 — 켰으면 값을 요구한다
    if (draft.messagingNameEnabled) {
      if (draft.messagingName.trim() === '') {
        ctx.issues.push({
          code: 'custom',
          input: draft.messagingName,
          path: ['messagingName'],
          message: '전용 이름을 켰다면 이름을 입력하세요. 끄면 사이트 이름이 그대로 쓰여요.',
        });
      } else if (byteLengthOf(draft.messagingName) > MESSAGING_NAME_MAX_BYTES) {
        // 글자 수가 아니라 바이트다 — 한글 1자 = 2byte (EUC-KR)
        ctx.issues.push({
          code: 'custom',
          input: draft.messagingName,
          path: ['messagingName'],
          message: `전용 이름은 ${String(MESSAGING_NAME_MAX_BYTES)}byte 를 넘을 수 없어요. 한글은 1자가 2byte 예요.`,
        });
      }
    }

    // 업로드가 중간에 끊기면 이름만 있고 주소가 빈 자산이 남을 수 있다 —
    // 비공개 상태에서 그런 값을 저장하면 방문자는 깨진 이미지를 본다. 저장 직전에 막는다.
    // (전체 공개면 이 이미지는 아무 데도 쓰이지 않으므로 판정하지 않는다 — 쓰지 않을 값을 막지 않는다.)
    if (
      isPrivateImageEditable(draft.visibility) &&
      draft.privateImage !== null &&
      draft.privateImage.url.trim() === ''
    ) {
      ctx.issues.push({
        code: 'custom',
        input: draft.privateImage,
        path: ['privateImage'],
        message: '비공개용 이미지를 다시 올려 주세요. 업로드가 끝나지 않았어요.',
      });
    }
  });

export type SiteSettingsValues = z.infer<typeof siteSettingsSchema>;
