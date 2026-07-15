// 목록형 화면의 등록/수정 폼 컨트롤러 훅 (A41 소유 — apps/admin/src/pages/company/**)
//
// 연혁·인증서·ESG 의 등록/수정 폼(:id 유무로 갈린다)이 같은 배선을 쓴다: 수정이면 상세를 불러와
// 폼을 채우고, 저장하면 목록으로 돌아가며 토스트를 띄운다. 검증 규칙의 정본은 각 화면의 zod 스키마다.
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import type { DefaultValues, FieldValues, UseFormReturn } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import type { ZodMiniType } from 'zod/mini';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import { useToast } from '../../../shared/ui';
import { useCrudCreate, useCrudItem, useCrudUpdate } from './crud';
import type { CrudAdapter } from './crud';

interface CrudFormConfig<T extends { id: string }, Input, Values extends FieldValues> {
  readonly resource: string;
  readonly adapter: CrudAdapter<T, Input>;
  readonly entityLabel: string;
  readonly listPath: string;
  readonly schema: ZodMiniType<Values, unknown>;
  readonly empty: DefaultValues<Values>;
  /** 폼 값 → 어댑터 입력 */
  readonly toInput: (values: Values) => Input;
  /** 불러온 항목 → 폼 값 */
  readonly toValues: (item: T) => Values;
}

interface CrudFormController<Values extends FieldValues> {
  readonly form: UseFormReturn<Values>;
  readonly isEdit: boolean;
  readonly saving: boolean;
  /** 수정 진입 시 상세 로딩 중 */
  readonly loadingDetail: boolean;
  /** 수정 진입 시 상세 조회 실패 */
  readonly loadFailed: boolean;
  readonly serverError: string | null;
  readonly submit: (event: FormEvent<HTMLFormElement>) => void;
  readonly isDirty: boolean;
}

export function useCrudForm<T extends { id: string }, Input, Values extends FieldValues>(
  config: CrudFormConfig<T, Input, Values>,
): CrudFormController<Values> {
  const { id } = useParams<{ id: string }>();
  const isEdit = id !== undefined;
  const navigate = useNavigate();
  const toast = useToast();

  const form = useForm<Values>({
    resolver: zodResolver(config.schema),
    defaultValues: config.empty,
  });

  const detailQuery = useCrudItem(config.resource, config.adapter, id ?? '');
  const create = useCrudCreate(config.resource, config.adapter);
  const update = useCrudUpdate(config.resource, config.adapter);
  const saving = create.isPending || update.isPending;

  const [serverError, setServerError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  // 편집 대상이 도착하면 폼을 채운다. toValues 는 렌더마다 새로 올 수 있어 ref 로 고정한다
  // (효과는 loaded 가 바뀔 때만 다시 돈다 — form.reset 은 안정된 참조다).
  const toValuesRef = useRef(config.toValues);
  toValuesRef.current = config.toValues;
  const loaded = detailQuery.data;
  const { reset } = form;
  useEffect(() => {
    if (loaded === undefined) return;
    reset(toValuesRef.current(loaded));
  }, [loaded, reset]);

  const loadingDetail = isEdit && detailQuery.isFetching && detailQuery.data === undefined;
  const loadFailed = isEdit && detailQuery.error !== null;

  const onValid = (values: Values) => {
    setServerError(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    const input = config.toInput(values);

    const onError = (cause: unknown) => {
      if (isAbort(cause)) return;
      setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    };

    if (isEdit && id !== undefined) {
      update.mutate(
        { id, input, signal: controller.signal },
        {
          onSuccess: () => {
            toast.success(`${config.entityLabel}을(를) 저장했습니다.`);
            navigate(config.listPath, { replace: true });
          },
          onError,
        },
      );
      return;
    }

    create.mutate(
      { input, signal: controller.signal },
      {
        onSuccess: () => {
          toast.success(`${config.entityLabel}을(를) 등록했습니다.`);
          navigate(config.listPath, { replace: true });
        },
        onError,
      },
    );
  };

  return {
    form,
    isEdit,
    saving,
    loadingDetail,
    loadFailed,
    serverError,
    submit: (event) => void form.handleSubmit(onValid)(event),
    isDirty: form.formState.isDirty,
  };
}
