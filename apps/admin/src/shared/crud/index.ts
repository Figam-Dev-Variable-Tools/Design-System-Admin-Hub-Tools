// 선언적 CRUD 프레임워크 배럴 (A41 소유 — apps/admin/src/shared/crud/**)
//
// **섹션은 반드시 여기서만 import 한다** (개별 파일 직접 import 금지 — shared/ui 규약과 동일).
//   허용: import { useCrudList, CrudListShell } from '../../shared/crud';
//   금지: import { useCrudList } from '../../shared/crud/useCrudList';
//
// [무엇인가] 도메인을 모르는 CRUD 스캐폴드다. config(resource·컬럼·adapter·검증)만 주입하면
// 목록 / 등록·수정 폼 / 삭제·일괄 삭제가 완성된다. 기업 관리(연혁·인증서·ESG·파트너사)가 이 위에
// 서 있고, 이후 섹션(포트폴리오·상품·영업·고객센터·마케팅·예약)이 같은 방식으로 재사용한다.
//
// [config 주입 3계층]
//   1) 데이터    createCrudAdapter<TItem, TDraft>({ scope, seed, build, patch, sort })
//                → 픽스처를 CRUD 로 흉내 내는 어댑터. 실연동은 각 섹션 data-source.ts 의 // TODO(backend).
//   2) 목록      useCrudList({ resource, adapter, entityLabel, nameOf }) + <CrudListShell columns=… />
//                → 조회·선택·단건/일괄 삭제·확인 다이얼로그·툴바 슬롯. 컬럼만 주입한다.
//   3) 폼        useCrudForm({ resource, adapter, schema, empty, toInput, toValues, … })
//                + <FormPageShell> → 로딩·에러·저장·미저장 이탈 가드. 필드(children)만 주입한다.
//
// [확장 포인트]
//   - 커스텀 컬럼 렌더 : CrudColumn<T>.render 로 배지·토글 스위치·요약 등 무엇이든 그린다.
//   - 필터            : 페이지가 visibleItems 를 계산해 넘긴다(좌측 필터 패널·검색은 페이지 소유).
//   - 행 인라인 액션  : 컬럼 render 안에서 페이지가 쥔 뮤테이션(useCrudUpdate 등)을 호출한다.
//   - 저수준 훅        : 모달형 화면(로고·카테고리)은 useCrudListQuery/Create/Update/Delete 를 직접 조립한다.
//
// [제네릭 타입] 모든 표면이 <TItem extends { id: string }, TDraft> 로 열려 있어 항목/입력 타입을
// 섹션이 자유롭게 정한다. 프레임워크는 id 만 알 뿐 필드는 모른다 — 그래서 어떤 섹션에도 맞는다.

// ── 데이터 계층 (어댑터 · 저수준 훅) ─────────────────────────────────────────
export {
  createCrudAdapter,
  createStoreAdapter,
  useCrudCreate,
  useCrudDelete,
  useCrudItem,
  useCrudListQuery,
  useCrudUpdate,
} from './crud';
export type { CrudAdapter } from './crud';

// 단일 문서형(회사 정보·CEO 인사말·오시는 길 등 — 목록 없이 문서 1건)
export { createDocumentStore, useDocumentQuery, useSaveDocument } from './document';
export { DocumentFormShell } from './DocumentFormShell';

// ── 목록 계층 ────────────────────────────────────────────────────────────────
export { useCrudList } from './useCrudList';
export { CrudListShell } from './CrudListShell';
export type { CrudColumn, EmptyContext } from './CrudTable';
// 목록에서 바로 한 행을 갱신(노출 토글 등)
export { useCrudRowUpdate } from './useCrudRowUpdate';

/**
 * 조회 상태(page·filter·keyword·sort)의 단일 원천 = URL (IA-13) + 선택 해제/페이지 보정(STATE-04)
 * + IME 안전 검색(COMP-10). 목록 화면은 useState 로 이 상태를 들지 않는다 — 들면 Back·새로고침·
 * 링크 공유가 전부 깨진다.
 */
export { useListState } from './useListState';
export type { ListState, ListStateConfig } from './useListState';
/** 검색창 하나만 필요한 화면용 (URL 상태가 필요 없을 때) */
export { useDebouncedSearch } from './useDebouncedSearch';

// ── 폼 계층 ──────────────────────────────────────────────────────────────────
export { useCrudForm } from './useCrudForm';
export { FormPageShell } from './FormPageShell';

// ── 공용 조각 (검증 · 필터 좁히기 · 개발용 실패/지연 재현) ──────────────────
export { optionalHttpUrl, requiredImage, requiredText } from './validation';
export { parseFilter } from './parseFilter';
export { submitButtonLabel } from './submitButtonLabel';
export { failIfRequested, LATENCY_MS } from './dev';
