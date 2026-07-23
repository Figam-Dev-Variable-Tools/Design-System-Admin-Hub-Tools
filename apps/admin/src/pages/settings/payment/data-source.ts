// 결제(PG) 설정 데이터 소스 (시스템 설정 섹션 소유 — apps/admin/src/pages/settings/**)
//
// [이 화면의 저장은 화면 밖을 바꾼다] 다른 설정 문서와 달리 이 값은 **상품·프로그램 화면이 읽는다**
// (shared/commerce/payment-settings). 그래서 저장소는 revision 문서 한 벌을 들고 있는 데서 그치지
// 않고, 저장이 **성공한 뒤에** 공용 상태에 그 값을 써 넣는다 — 그 한 줄이 없으면 설정 화면에서는
// 저장됐는데 상품 카드의 버튼은 그대로인, 가장 설명하기 어려운 어긋남이 생긴다.
//
// 실패·409 에서는 쓰지 않는다: 거절된 저장이 판매 방식을 바꾸면 화면이 말한 것과 앱이 하는 일이
// 갈라진다.
//
// [실패/충돌 재현]
//   /settings/payment?fail=load      → 조회 실패 (인라인 배너 + 다시 시도)
//   /settings/payment?fail=save      → 저장 실패 (확인 다이얼로그 안 danger 배너)
//   /settings/payment?fail=conflict  → 저장이 409 (동시 편집 충돌 다이얼로그)
import {
  readPaymentSettings,
  writePaymentSettings,
} from '../../../shared/commerce/payment-settings';
import type { PaymentSettings } from '../../../shared/commerce/payment-settings';
import {
  connectionPublicValue,
  connectionTarget,
  pgLabel,
  pgMeta,
} from '../../../shared/commerce/pg-catalog';
import type { PgConnection } from '../../../shared/commerce/pg-catalog';
import { createRevisionedStore } from '../_shared/store';
import type { RevisionedStore } from '../_shared/store';

export const paymentSettingsKey = ['settings', 'payment'] as const;

/** `?fail=` 스위치의 스코프 */
const SCOPE = 'payment';

/** 지연·실패·409 재현과 revision 관리는 공용 저장소가 그대로 한다 — 여기서 다시 만들지 않는다 */
const revisioned = createRevisionedStore<PaymentSettings>(SCOPE, readPaymentSettings(), {
  updatedBy: '박관리',
  updatedAt: '2026-07-16T01:20:00.000Z',
});

// TODO(backend): GET /api/settings/payment · PUT /api/settings/payment (If-Match: <revision>)
//   응답: 200 → { value, revision, audit } / 409·412 → 동시 편집 충돌 / 422 → 필드 검증 실패
//   ⚠ 비밀 필드의 **값은 응답에 실리지 않는다** — `storedSecrets` 처럼 이름 목록만 온다.
//     PUT 의 비밀은 '새로 넣은 값' 만 보내고, 빈 문자열이면 서버가 기존 값을 유지한다.
//     계약의 전문은 shared/commerce/payment-settings.ts 의 TODO(backend) 에 적혀 있다.
export const paymentSettingsStore: RevisionedStore<PaymentSettings> = {
  peek: revisioned.peek,

  fetch: (signal) => revisioned.fetch(signal),

  async save(input, signal) {
    const saved = await revisioned.save(input, signal);
    // 저장이 성립한 뒤에만 판매 방식을 바꾼다(파일 머리말)
    writePaymentSettings(saved.value);
    return saved;
  },
};

/* ── 충돌 비교 ─────────────────────────────────────────────────────────────── */

/**
 * 충돌 다이얼로그가 짚을 항목 — 이 문서는 **평면이 아니라서** 공용 divergedLabels 를 쓸 수 없다.
 *
 * `connection` 이 판별 합집합이라 얕은 비교로는 '연결이 달라졌다' 밖에 말할 수 없다. 운영자가
 * 알아야 하는 것은 그보다 구체적이다: 어떤 PG 로 바뀌었는가, 어느 칸이 달라졌는가, 비밀이
 * 새로 저장됐는가. 그래서 이 화면이 자기 비교기를 갖는다(../_shared/diff.ts 머리말이 그러라고
 * 적어 두었다: "중첩이 생기면 그 화면이 자기 비교기를 갖는 편이 낫다").
 */
function connectionDivergedLabels(mine: PgConnection, theirs: PgConnection): readonly string[] {
  const mineTarget = connectionTarget(mine);
  const theirsTarget = connectionTarget(theirs);

  if (mineTarget !== theirsTarget) {
    return [`연동 PG (${pgLabel(mineTarget)} ↔ ${pgLabel(theirsTarget)})`];
  }

  const diverged: string[] = [];
  for (const field of pgMeta(mineTarget).credentials) {
    if (field.visibility === 'secret') continue; // 값이 없으니 비교할 것도 없다
    if (connectionPublicValue(mine, field.key) !== connectionPublicValue(theirs, field.key)) {
      diverged.push(field.label);
    }
  }

  return diverged;
}

/** 두 문서가 갈린 항목들 — 충돌 다이얼로그가 그대로 나열한다 */
export function paymentDivergedLabels(
  mine: PaymentSettings,
  theirs: PaymentSettings,
): readonly string[] {
  const diverged: string[] = [];

  if (mine.usePg !== theirs.usePg) diverged.push('PG 결제 사용');
  diverged.push(...connectionDivergedLabels(mine.connection, theirs.connection));
  if (mine.mode !== theirs.mode) diverged.push('연동 모드');
  if (mine.methods.join(',') !== theirs.methods.join(',')) diverged.push('결제수단');
  if (mine.contractStatus !== theirs.contractStatus) diverged.push('계약 상태');
  if (mine.inquiryGuide !== theirs.inquiryGuide) diverged.push('문의 전환 안내 문구');

  return diverged;
}
