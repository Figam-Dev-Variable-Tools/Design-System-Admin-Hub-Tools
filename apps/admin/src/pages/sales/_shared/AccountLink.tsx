// 목록의 거래처 셀 — 계약·견적·프로젝트·상담 목록이 공유한다.
//
// 네 목록 모두 거래처를 **그냥 텍스트로** 찍고 있었다. 그래서 '이 거래처의 다른 계약은?' 이
// 화면에서 물어볼 수 없는 질문이었다 — 사이드바로 나가 거래처 목록을 다시 검색해야 했다.
// 이제 이름 자체가 거래처 상세로 가는 문이다.
//
// 링크는 DetailCellLink 를 쓴다: 행 클릭(마우스 전용)과 공존하며 DS Table 가드가 <a> 내부
// 클릭을 행 활성화에서 제외한다 (QuoteListPage 의 '원본 문의' 열이 이미 같은 구조다).
// 미등록 거래처는 링크가 아니라 **왜 링크가 없는지** 를 말한다 — 흐린 '(미등록)' 꼬리표.
import type { CSSProperties } from 'react';
import { cssVar } from '@tds/ui';

import { DetailCellLink } from '../../../shared/crud';
import { accountDetailPath, isRegisteredAccount } from './account-reference';
import type { AccountRef } from './account-reference';

const unregisteredStyle: CSSProperties = {
  color: cssVar('color.text.muted'),
};

interface AccountLinkProps {
  readonly account: AccountRef;
}

export function AccountLink({ account }: AccountLinkProps) {
  const label = account.accountName === '' ? '(이름 없음)' : account.accountName;

  if (!isRegisteredAccount(account)) {
    return <span style={unregisteredStyle}>{`${label} (미등록)`}</span>;
  }

  return (
    <DetailCellLink to={accountDetailPath(account.accountId)} ariaLabel={`${label} 거래처 상세`}>
      {label}
    </DetailCellLink>
  );
}
