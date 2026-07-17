// 리스트 행 앞머리 아이콘 (페이지 스코프)
//
// 카드 종류에 따라 아이콘이 바뀐다. 크기는 1em 기준이라 부모 font-size 를 따라간다.
import type { CSSProperties } from 'react';

import { BoxIcon, BriefcaseIcon, FileTextIcon, HeadsetIcon } from '../../../shared/icons';
import type { ListCardData } from '../types';

const iconStyle: CSSProperties = {
  flexShrink: 0,
  color: 'var(--tds-color-action-primary-default)',
};

export function RowIcon({ name }: { readonly name: ListCardData['icon'] }) {
  switch (name) {
    case 'order':
      return <BoxIcon style={iconStyle} />;
    case 'tag':
      return <FileTextIcon style={iconStyle} />;
    case 'question':
      return <HeadsetIcon style={iconStyle} />;
    case 'contract':
      return <BriefcaseIcon style={iconStyle} />;
  }
}
