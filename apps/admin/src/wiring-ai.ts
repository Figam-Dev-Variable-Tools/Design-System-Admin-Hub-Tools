// AI 에이전트 도메인 배선 — 질의 가능한 도메인의 제공자를 꽂는다
//
// [무엇을 꽂는가] 두 가지다 — 도메인이 **무슨 값으로 걸리는가**(각 도메인의 `*_OPTIONS`)와
// 그 도메인의 **행을 어떻게 거르고 표로 만드는가**(제공자). 둘 다 정본이 각 화면에 있고
// AI 화면은 자리만 갖는다(pages/ai/_shared/domains.ts · execute.ts).
//
// [왜 wiring.ts 와 분리했나] 배선의 이유는 같지만(서로 모르는 도메인을 합성 지점에서 잇는다)
// **비용이 다르다.** 이 파일은 상품·문의·프로그램 스토어를 통째로 끌어온다. wiring.ts 안에 두면
// `wireDomains()` 를 부르는 쪽 — 운영자 그룹 테스트(pages/admins/*.test.tsx) — 이 자기와
// 무관한 두 도메인의 픽스처까지 매번 적재하게 되고, 그만큼 느려진다(실제로 그 테스트가
// 병렬 실행에서 시간 초과로 넘어갔다). 배선은 필요한 곳만 지불하면 된다.
//
// [왜 pages/ai 안이 아닌가] 상품·문의·프로그램 데이터는 각 화면이 소유한다. AI 화면이 그 스토어를
// 직접 import 하면 pages/ai → pages/products 결합이 된다(code-quality 축1). AI 화면은 슬롯만 알고
// (pages/ai/_shared/execute.ts), 구현은 두 도메인을 모두 아는 이 파일이 넣는다 —
// 관리자 그룹 ↔ 메시지 템플릿이 이미 쓰는 것과 같은 패턴이다(wiring.ts 머리말).
//
// [회원은 여기 없다] 회원 표본은 shared/fixtures 에 있어 결합이 없다 —
// pages/ai/_shared/provider-members.ts 가 스스로 등록한다.
import { registerDomainFieldValues } from './pages/ai/_shared/domains';
import { registerDomainProvider, resolvePeriod, withinRange } from './pages/ai/_shared/execute';
import { createSimpleProvider, equalsValue } from './pages/ai/_shared/provider-simple';
import { registerAiProviderLookup } from './shared/fixtures/ai-providers';
import { aiProviderStatuses } from './pages/settings/api-keys/data-source';
import { finalPrice, listProducts } from './pages/products/_shared/store';
import { SALE_STATUS_OPTIONS, saleStatusLabel } from './pages/products/items/types';
import { listTickets } from './pages/support/_shared/store';
import {
  TICKET_PRIORITY_OPTIONS,
  TICKET_STATUS_OPTIONS,
  ticketPriorityLabel,
  ticketStatusLabel,
} from './pages/support/_shared/domain';
import { fundingRate, listPrograms } from './pages/programs/_shared/store';
import { PROGRAM_STATUS_OPTIONS, programStatusLabel } from './pages/programs/types';
import { formatNumber } from './shared/format';

/**
 * `@멘션` 질의가 값으로 걸 수 있는 목록을 각 도메인의 정본에서 꽂는다.
 *
 * [무엇이 달라졌나] 예전에는 AI 화면이 처리상태 5종·우선순위 4종을 **다시 타이핑해** 갖고 있었고
 * (pages/ai/_shared/domains.ts), 이 파일도 판매상태 라벨 표를 한 벌 더 갖고 있었다. 고객센터가
 * 상태를 하나 늘리거나 라벨을 고치면 AI 만 옛 어휘로 남는다 — 화면은 멀쩡히 도는데 사용자가
 * 읽은 말로는 질의가 걸리지 않는 종류의 어긋남이라 아무도 알아채지 못한다.
 *
 * 지금은 각 도메인의 `*_OPTIONS` 를 **그대로** 넘긴다. 라벨을 여기서 다시 적는 자리는 없다.
 * (별칭 — '중지' 같은 사용자 어휘 — 만 AI 화면이 갖는다. 그건 도메인의 사실이 아니라 말버릇이다.)
 */
export function wireAiDomainValues(): void {
  registerDomainFieldValues('products', 'saleStatus', SALE_STATUS_OPTIONS);
  registerDomainFieldValues('tickets', 'status', TICKET_STATUS_OPTIONS);
  registerDomainFieldValues('tickets', 'priority', TICKET_PRIORITY_OPTIONS);
  registerDomainFieldValues('programs', 'status', PROGRAM_STATUS_OPTIONS);
}

/**
 * AI 질의 도메인 제공자를 꽂는다 — 여러 번 불러도 결과가 같다(멱등).
 *
 * 호출 지점은 App.tsx 한 곳이다. 화면 단위 테스트는 자기가 필요한 도메인만 등록하면 된다.
 */
/**
 * AI 모델 프로바이더 연동 상태를 꽂는다 — 응답 모드의 잠금이 여기서 풀린다.
 *
 * ✔ **연동 카탈로그에 AI 프로바이더가 생겨 이제 실제로 꽂는다.** 정본은 시스템 설정의
 * 연동 저장소(pages/settings/api-keys/data-source.ts)가 갖고, 그쪽이 저장된 자격증명에서
 * 상태를 해소해(`aiProviderStatuses`) 핵심 4종(OpenAI · Claude · Gemini · Grok)만 넘겨준다.
 *
 * [조회기는 한 벌뿐이다] 계약은 shared/fixtures/ai-providers.ts 가 정의한다 — 설정 화면과
 * AI 화면이 서로를 모르는 채로 같은 사실을 읽는 **유일한** 통로다
 * (축1: pages/ai → pages/settings 직접 import 금지). 두 번째 조회기를 만들지 않는다.
 *
 * [처음에는 전부 잠겨 있다 — 그리고 그것이 옳다] 저장된 연동이 0건이면 네 프로바이더 모두
 * `enabled: false` 다. 배선이 없을 때와 결과는 같지만 **이유가 다르다**: '모르는 상태' 가
 * 아니라 '확인한 결과 없음' 이다.
 *
 * ✔ **이제 그 잠금이 실제로 풀린다.** 자격증명 저장 화면(/settings/api-keys/:providerId)에서
 * 프로바이더를 켜고 키를 저장하면 `aiProviderStatuses` 가 곧바로 `enabled: true` 를 돌려주고
 * /ai/chat 의 '빠른 · 전문가 · 헤비' 가 열린다 — 모드가 조회 시점에 해소되기 때문이다
 * (pages/ai/_shared/modes.ts 의 resolveResponseModes).
 *
 * ⚠ `enabled === true` 는 '자격증명이 갖춰졌다' 이지 '방금 호출해 확인했다' 가 아니다 —
 * 실제 연결 검증은 서버가 해야 하고(ai-connections.ts 의 verify 심) 아직 없다.
 */
function wireAiProviders(): void {
  registerAiProviderLookup(aiProviderStatuses);
}

export function wireAiDomains(): void {
  wireAiProviders();
  wireAiDomainValues();

  registerDomainProvider(
    'products',
    createSimpleProvider({
      columns: ['상품명', '상품코드', '카테고리', '판매상태', '판매가'],
      rows: listProducts,
      matches: (product, condition) => {
        const status = equalsValue(condition, 'saleStatus');
        if (status !== null) return product.saleStatus === status;
        const displayed = equalsValue(condition, 'displayed');
        if (displayed !== null) return product.displayed === (displayed === 'true');
        // 상품에는 기간으로 걸 날짜가 없다 — 파서가 이미 걸러 여기 오지 않는다
        return true;
      },
      toRow: (product) => ({
        id: product.id,
        cells: [
          product.name,
          product.code,
          product.categoryLabel,
          // 표시명도 상품 도메인이 준다 — 위 wireAiDomainValues 와 같은 이유로 사본을 두지 않는다
          saleStatusLabel(product.saleStatus),
          `${formatNumber(finalPrice(product.pricing))}원`,
        ],
        href: `/products/${product.id}/edit`,
      }),
      listUrl: () => '/products',
    }),
  );

  registerDomainProvider(
    'tickets',
    createSimpleProvider({
      columns: ['문의번호', '제목', '유형', '우선순위', '처리상태', '접수일'],
      rows: listTickets,
      matches: (ticket, condition, now) => {
        const status = equalsValue(condition, 'status');
        if (status !== null) return ticket.status === status;
        const priority = equalsValue(condition, 'priority');
        if (priority !== null) return ticket.priority === priority;
        if (condition.kind === 'period' && condition.fieldId === 'receivedAt') {
          return withinRange(ticket.receivedAt, resolvePeriod(condition.period, now));
        }
        return true;
      },
      toRow: (ticket) => ({
        id: ticket.id,
        cells: [
          ticket.ticketNo,
          ticket.title,
          ticket.categoryLabel,
          ticketPriorityLabel(ticket.priority),
          ticketStatusLabel(ticket.status),
          ticket.receivedAt.slice(0, 10),
        ],
        href: `/support/tickets/${ticket.id}`,
      }),
      listUrl: () => '/support/tickets',
    }),
  );

  /*
    프로그램(후원형 펀딩).

    [왜 늦게 붙었나] 모듈이 생긴 뒤에도 이 배선이 없어서 '@프로그램' 은 '모르는 도메인' 으로
    거절됐다 — 앱에 있는 화면을 앱의 조수만 몰랐다.

    [열이 여섯인 이유] 펀딩 목록에서 사람이 실제로 훑는 축이다: 무엇을(제목·창작자) · 어디에
    속하고(카테고리) · 지금 어떤 단계이며(진행상태) · 얼마를 목표로 얼마나 모였는가(달성률).
    달성률은 저장된 값이 아니라 목표·모금액에서 계산한다 — 파생값을 필드로 두지 않는다는
    저장소의 규칙을 여기서도 지킨다(programs/_shared/store.ts 머리말).

    [기간은 두 필드다] 오픈일·마감일 모두 걸 수 있다. 어느 쪽인지는 파서가 필드로 지목해 주고,
    지목이 없으면 오픈일이다(domains.ts 의 defaultPeriodFieldId).
  */
  registerDomainProvider(
    'programs',
    createSimpleProvider({
      columns: ['프로그램명', '카테고리', '창작자', '진행상태', '목표금액', '달성률'],
      rows: listPrograms,
      matches: (program, condition, now) => {
        const status = equalsValue(condition, 'status');
        if (status !== null) return program.status === status;
        if (condition.kind === 'present' && condition.fieldId === 'pledgedAmount') {
          return program.pledgedAmount > 0;
        }
        if (condition.kind === 'period') {
          const range = resolvePeriod(condition.period, now);
          if (condition.fieldId === 'startDate') return withinRange(program.startDate, range);
          if (condition.fieldId === 'endDate') return withinRange(program.endDate, range);
        }
        return true;
      },
      toRow: (program) => ({
        id: program.id,
        cells: [
          program.title,
          program.categoryLabel,
          program.creator,
          programStatusLabel(program.status),
          `${formatNumber(program.goalAmount)}원`,
          `${formatNumber(fundingRate(program.goalAmount, program.pledgedAmount))}%`,
        ],
        href: `/programs/${program.id}`,
      }),
      listUrl: () => '/programs',
    }),
  );
}
