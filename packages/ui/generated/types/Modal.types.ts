// AUTO-GENERATED from contracts/Modal.contract.json@1.0.0 — DO NOT EDIT (pnpm codegen)
// 레벨: organism · 상태: beta

import type { ReactNode } from 'react';

/** 계약에 선언된 상호작용 상태 */
export type ModalState = 'open';

/**
 * 모달 다이얼로그 껍데기 — 딤(backdrop) + 가운데 정렬 다이얼로그 + 헤더(아이콘·제목·닫기) + 본문 슬롯 + 푸터 슬롯. 도메인을 모른다 — 무엇을 확인/입력받는지는 조립하는 쪽(ConfirmDialog·폼 모달)이 정한다 (ADR-0003).

[라이프사이클·a11y] role="dialog" + aria-modal + aria-labelledby(제목). 열릴 때 지정 요소(또는 첫 포커스 가능 요소)로 포커스를 옮기고, 닫히면 열기 직전 요소로 포커스를 복귀한다. 열려 있는 동안 배경 스크롤을 잠근다. Tab/Shift+Tab 은 다이얼로그 안에서 순환(포커스 트랩)하고, Esc·딤 클릭·닫기 버튼이 닫는다 (Esc 는 stopPropagation 으로 최상단 모달만 닫아 중첩을 보존한다).

[imperative props — 계약 밖 컴포넌트 경계] onClose(필수)·onSubmit(폼 모달)·initialFocusRef 는 명령형 배선이라 Figma Component Property 대응이 없다. Card 의 네이티브 속성 패스스루와 같은 원리로 **컴포넌트 경계**에서 받는다 — 계약 props(제목·아이콘·본문·푸터)는 디자인이 보는 표면만 기술한다.
 */
export interface ModalProps {
  /**
   * 다이얼로그 제목 — aria-labelledby 로 role=dialog 에 접근성 이름을 준다
   */
  title: string;
  /**
   * 제목 왼쪽 아이콘 슬롯 — 의도(생성/수정/삭제/이탈)를 색과 함께 이중으로 전달한다. 없으면 제목만 렌더
   * 허용 컴포넌트: Icon
   * @default null
   */
  icon?: ReactNode;
  /**
   * 본문 슬롯. 확인 문구·폼 필드 등 조립하는 쪽이 주입한다
   */
  children: ReactNode;
  /**
   * 푸터 슬롯 — 오른쪽 정렬된 액션 버튼들(취소/확인 등). 조립하는 쪽이 주입한다
   */
  footer: ReactNode;
}
