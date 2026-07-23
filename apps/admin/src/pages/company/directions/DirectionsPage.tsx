// DirectionsPage — 오시는 길 (라우트: /company/directions)
//
// 단일 문서 폼(주소·상세주소·교통편).
//
// [주소는 검색으로 고른다 — 직접 타이핑하지 않는다]
// 주소 칸을 누르면 카카오(다음) 우편번호 서비스를 담은 모달이 열린다. 그래서 주소 입력은
// **readOnly** 다. 자유 입력을 함께 열어 두면 사람이 우편번호 체계에 없는 주소를 적어 넣을 수 있고,
// 그러면 홈페이지에 실제로 찾아갈 수 없는 주소가 뜬다 — 화면 어디에도 틀렸다는 표시가 없는 채로.
// 고칠 것이 있으면 다시 검색하거나 상세주소에 적는다.
//
// [a11y] '누르면 열린다' 를 클릭에만 걸지 않았다. 읽기 전용 입력은 포커스를 받으므로 Enter·Space
// 로도 열리고, 옆의 '주소 검색' 버튼이 스크린리더에 보이는 정식 트리거다. (입력도 되고 클릭하면
// 모달도 뜨는 형태를 택하지 않은 이유는 위 문단 — 그리고 그 형태는 키보드 사용자에게 '여기서
// 무엇을 해야 하는가' 를 절대 알려주지 못한다.)
//
// [좌표와 지도는 없다 — 무엇을 잃었는지 적어 둔다]
// 예전에는 위도·경도 칸과 지도 미리보기가 있었다. 운영자 판단으로 둘 다 걷었다. 근거와 대가:
//   · 좌표는 **주소에서 파생되는 값**이다. 함께 저장하면 둘이 어긋나는 순간이 반드시 오고, 그때
//     어느 쪽이 진실인지 아무도 모른다. 저장하지 않으면 그 문제 자체가 생기지 않는다.
//   · 지도를 그리려면 카카오 JavaScript 앱 키가 필요했다. 키가 없는 동안 화면에는 '키를 등록하라'
//     는 배너만 떠 있었고, 운영자에게 그 자리는 아무 값도 주지 않았다.
//   · **잃은 것**: 지오코딩이 주는 점은 '주소의 대표점' 이라 실제 출입구·주차장 입구와 다를 수 있는데,
//     그 차이를 표현할 수단(핀 미세조정)이 사라졌다. 운영자가 받아들인 손실이다. 대신 그 안내는
//     사람이 읽는 문장으로 남는다 — 아래 '교통편' 에 "정문은 건물 뒤편" 같은 말을 적을 수 있다.
//   · 홈페이지(고객 화면)가 지도를 그린다면 **주소 문자열로 직접 지오코딩**해야 한다. 우리는 좌표를
//     내려보내지 않는다 — 저장 페이로드에 그 칸이 없다(types.ts).
//
// TODO(backend): 이 문서의 조회·저장만 남는다(data-source.ts). 주소 검색은 브라우저 스크립트라
// 백엔드도 앱 키도 필요 없다.
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { controlStyle, errorIdOf, FormField, hintStyle, useToast } from '../../../shared/ui';
import { DocumentFormShell, useDocumentQuery, useSaveDocument } from '../../../shared/crud';
import { AddressField, selectedAddressOf } from '../../../shared/address-search';
import type { PostalAddress } from '../../../shared/address-search';
import { directionsKey, directionsStore } from './data-source';
import { ADDRESS_DETAIL_MAX_LENGTH, ADDRESS_MAX_LENGTH, TRANSIT_MAX_LENGTH } from './types';
import { directionsSchema } from './validation';
import type { DirectionsFormValues } from './validation';
import { cssVar } from '@tds/ui';

const UNSAVED_MESSAGE =
  '오시는 길에 아직 저장하지 않은 내용이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.';

const textareaStyle = (invalid: boolean): CSSProperties => ({
  ...controlStyle(invalid),
  minHeight: `calc(${cssVar('space.6')} * 3)`,
  resize: 'vertical',
});

const EMPTY: DirectionsFormValues = {
  address: '',
  addressDetail: '',
  transit: '',
};

export default function DirectionsPage() {
  const toast = useToast();
  const { data, isFetching, error, refetch } = useDocumentQuery(directionsKey, directionsStore);
  const save = useSaveDocument(directionsKey, directionsStore);
  const saving = save.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<DirectionsFormValues>({
    resolver: zodResolver(directionsSchema),
    defaultValues: EMPTY,
  });

  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (data === undefined) return;
    reset(data);
  }, [data, reset]);

  const loading = isFetching && data === undefined;
  const disabled = saving || loading;

  const onAddressSelected = (address: PostalAddress) => {
    setValue('address', selectedAddressOf(address), { shouldDirty: true, shouldValidate: true });

    /* 건물명은 **상세주소가 비어 있을 때만** 제안한다. 이미 '8층 802호' 라고 적어 둔 사람의 입력을
       검색 한 번으로 덮으면, 되돌릴 방법이 없는 손실이다. */
    if (address.buildingName !== '' && getValues('addressDetail').trim() === '') {
      setValue('addressDetail', address.buildingName, { shouldDirty: true });
    }
  };

  const onValid = (values: DirectionsFormValues) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;

    save.mutate(
      { input: values, signal: controller.signal },
      {
        onSuccess: () => {
          reset(values);
          toast.success('오시는 길을 저장했어요.');
        },
        onError: (cause: unknown) => {
          if (isAbort(cause)) return;
          setServerError('저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
        },
      },
    );
  };

  return (
    <DocumentFormShell
      cardTitle="오시는 길"
      description="별표(*)는 꼭 입력해야 하는 항목이에요. 주소는 '주소 검색'으로 찾아서 골라요."
      loading={loading}
      loadFailed={error !== null}
      onRetry={() => void refetch()}
      serverError={serverError}
      saving={saving}
      dirty={isDirty}
      unsavedMessage={UNSAVED_MESSAGE}
      onSubmit={(event) => void handleSubmit(onValid)(event)}
    >
      <AddressField
        id="dir-address"
        field={register('address')}
        error={errors.address?.message}
        disabled={disabled}
        maxLength={ADDRESS_MAX_LENGTH}
        onSelect={onAddressSelected}
      />

      <FormField
        htmlFor="dir-address-detail"
        label="상세주소"
        error={errors.addressDetail?.message}
        hint="건물명·층·호수 등 (선택)"
      >
        <input
          id="dir-address-detail"
          type="text"
          className="tds-ui-input tds-ui-focusable"
          style={controlStyle(errors.addressDetail !== undefined)}
          maxLength={ADDRESS_DETAIL_MAX_LENGTH}
          placeholder="예: 예시타워 8층"
          disabled={disabled}
          aria-invalid={errors.addressDetail !== undefined}
          aria-describedby={
            errors.addressDetail !== undefined ? errorIdOf('dir-address-detail') : undefined
          }
          {...register('addressDetail')}
        />
      </FormField>

      <FormField
        htmlFor="dir-transit"
        label="교통편"
        error={errors.transit?.message}
        hint="지하철·버스·주차 안내 등 (선택). 정문 위치처럼 주소만으로는 찾기 어려운 안내도 여기에 적어 주세요."
      >
        <textarea
          id="dir-transit"
          className="tds-ui-input tds-ui-focusable"
          style={textareaStyle(errors.transit !== undefined)}
          rows={5}
          maxLength={TRANSIT_MAX_LENGTH}
          placeholder="예: 지하철 2호선 예시역 3번 출구 도보 5분"
          disabled={disabled}
          aria-invalid={errors.transit !== undefined}
          aria-describedby={errors.transit !== undefined ? errorIdOf('dir-transit') : undefined}
          {...register('transit')}
        />
      </FormField>

      <p style={hintStyle}>
        주소 검색은 카카오(다음) 우편번호 서비스를 그대로 써요. 따로 설정할 것은 없어요.
      </p>
    </DocumentFormShell>
  );
}
