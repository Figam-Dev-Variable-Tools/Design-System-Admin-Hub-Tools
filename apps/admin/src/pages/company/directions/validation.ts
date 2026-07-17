// 오시는 길 폼 검증 규칙 (검증의 정본은 이 zod 스키마다)
import * as z from 'zod/mini';

import { objectParticle, topicParticle } from '../../../shared/format';

import { requiredText } from '../../../shared/crud';
import { ADDRESS_DETAIL_MAX_LENGTH, ADDRESS_MAX_LENGTH, TRANSIT_MAX_LENGTH } from './types';

/** 좌표 한 축 — 비면 막고, 숫자가 아니거나 범위를 벗어나면 막는다 */
function coordinate(label: string, limit: number) {
  return z.string().check(
    z.refine((value) => value.trim() !== '', {
      error: `${label}${objectParticle(label)} 입력하세요.`,
    }),
    z.refine((value) => /^-?\d+(\.\d+)?$/.test(value.trim()), {
      error: `${label}${topicParticle(label)} 숫자여야 합니다.`,
    }),
    z.refine(
      (value) => {
        const n = Number(value.trim());
        return Number.isFinite(n) && Math.abs(n) <= limit;
      },
      {
        error: `${label}${topicParticle(label)} -${String(limit)} ~ ${String(limit)} 범위여야 합니다.`,
      },
    ),
  );
}

const optionalText = (label: string, max: number) =>
  z.string().check(
    z.refine((value) => value.length <= max, {
      error: `${label}${topicParticle(label)} ${String(max)}자를 넘을 수 없습니다.`,
    }),
  );

export const directionsSchema = z.object({
  address: requiredText('주소', ADDRESS_MAX_LENGTH),
  addressDetail: optionalText('상세주소', ADDRESS_DETAIL_MAX_LENGTH),
  latitude: coordinate('위도', 90),
  longitude: coordinate('경도', 180),
  transit: optionalText('교통편', TRANSIT_MAX_LENGTH),
});

export type DirectionsFormValues = z.infer<typeof directionsSchema>;
