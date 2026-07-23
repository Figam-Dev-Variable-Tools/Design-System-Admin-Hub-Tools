// 오시는 길 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { topicParticle } from '../../../shared/format';

import { requiredText } from '../../../shared/crud';
import { ADDRESS_DETAIL_MAX_LENGTH, ADDRESS_MAX_LENGTH, TRANSIT_MAX_LENGTH } from './types';

const optionalText = (label: string, max: number) =>
  z.string().check(
    z.refine((value) => value.length <= max, {
      error: `${label}${topicParticle(label)} ${String(max)}자를 넘을 수 없어요.`,
    }),
  );

export const directionsSchema = z.object({
  address: requiredText('주소', ADDRESS_MAX_LENGTH),
  addressDetail: optionalText('상세주소', ADDRESS_DETAIL_MAX_LENGTH),
  transit: optionalText('교통편', TRANSIT_MAX_LENGTH),
});

export type DirectionsFormValues = z.infer<typeof directionsSchema>;
