// 목록형 화면의 등록/수정 폼 컨트롤러 훅 (앱 공용 선언적 CRUD 프레임워크)
//
// 연혁·인증서·ESG 의 등록/수정 폼(:id 유무로 갈린다)이 같은 배선을 쓴다: 수정이면 상세를 불러와
// 폼을 채우고, 저장하면 목록으로 돌아가며 토스트를 띄운다. 검증 규칙의 정본은 각 화면의 zod 스키마다.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useForm } from 'react-hook-form';
import type { DefaultValues, FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import type { ZodMiniType } from 'zod/mini';

import { isAbort } from '../async';
import { objectParticle } from '../format';
import {
  isConflict,
  isHttpError,
  isNotFound,
  isUnprocessable,
  referenceOf,
} from '../errors/http-error';
import { zodResolver } from '../form/zodResolver';
import { useToast } from '../ui';
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

/** 상세 조회 실패의 갈래 — 404 와 5xx 는 복구 수단이 다르다 (EXC-12) */
export type LoadFailure = 'not-found' | 'error';

interface CrudFormController<T, Values extends FieldValues> {
  readonly form: UseFormReturn<Values>;
  readonly isEdit: boolean;
  readonly saving: boolean;
  /** 수정 진입 시 상세 로딩 중 */
  readonly loadingDetail: boolean;
  /**
   * 수정 진입 시 상세 조회 실패 — **왜** 실패했는지까지 말한다 (EXC-12).
   * 'not-found' → '목록으로' 만 (재시도해도 없다) · 'error' → '다시 시도' + '목록으로'
   */
  readonly loadFailure: LoadFailure | null;
  readonly retryLoad: () => void;
  readonly serverError: string | null;
  /** 5xx 등 예상외 실패의 참조 코드 — 운영자가 신고에 붙인다 (EXC-20) */
  readonly errorReference: string | null;
  /** 409/412 — 사용자 입력을 보존한 채 이 다이얼로그를 띄운다 (EXC-04) */
  readonly conflict: ConflictState | null;
  readonly submit: (event: FormEvent<HTMLFormElement>) => void;
  readonly isDirty: boolean;
  /**
   * 서버에서 불러온 원본 — 등록 화면이거나 아직 도착 전이면 undefined.
   *
   * [왜 폼 값이 아니라 원본이 필요한가] '저장된 상태' 를 근거로 편집을 막아야 하는 화면이 있다
   * (예: 카카오 승인이 끝난 알림톡 템플릿). 판단을 폼 값으로 하면 사용자가 그 필드를 되돌리는
   * 것만으로 잠금이 풀린다 — 잠금의 근거는 화면이 아니라 서버가 갖고 있어야 한다.
   */
  readonly loaded: T | undefined;
}

export interface ConflictState {
  readonly message: string;
  /** 서버의 최신본을 다시 불러와 폼을 덮는다 — 내 입력은 버린다 */
  readonly reload: () => void;
  /** 다이얼로그만 닫는다 — 입력은 그대로 남아 사용자가 이어서 편집한다 */
  readonly dismiss: () => void;
}

export function useCrudForm<T extends { id: string }, Input, Values extends FieldValues>(
  config: CrudFormConfig<T, Input, Values>,
): CrudFormController<T, Values> {
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
  const [errorReference, setErrorReference] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictState | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  /**
   * [EXC-08] 동기 제출 잠금.
   *
   * `disabled={saving}` 만으로는 부족하다: RHF 는 **비동기 검증**을 먼저 돌리므로 첫 클릭 후
   * `saving` 이 true 가 되어 버튼이 실제로 disabled 되기까지 한 틈이 있다. 그 사이의 빠른
   * 두 번째 Enter/클릭은 두 번째 요청을 만든다 — 금액·생성·발송에서는 그것이 이중 지급이다.
   * ref 는 **렌더를 기다리지 않으므로** 그 틈을 닫는다. LoginPage 가 같은 이유로 같은 패턴을 쓴다.
   */
  const submitLockRef = useRef(false);

  /**
   * [EXC-08] 제출 시도 단위 멱등키 — **mutationFn 밖**에서 만든다.
   *
   * mutationFn 안에서 만들면 재시도마다 새 키가 생기고 서버는 두 요청을 별개 거래로 본다.
   * 키를 여기(ref)에 두면 '확인' 재클릭이 **같은 키**를 재사용해 서버가 최초 응답을 재생한다.
   * 성공하면 버린다 — 다음 제출은 새 거래다. (useAddPointHistory 가 이 패턴의 정본이다.)
   *
   * [키는 이제 실제로 어댑터에 도달한다]
   * 예전에는 이 키를 만들고 **반환값을 버렸다** — `CrudAdapter.create/update` 시그니처에 키가
   * 앉을 자리가 없었기 때문이다. 그래서 이 주석이 약속하는 '재시도가 같은 키를 재사용한다'는
   * 어디에서도 일어나지 않았다. 이제 WriteContext.idempotencyKey 로 전달된다.
   * TODO(backend): 이 키는 `Idempotency-Key` 헤더로 나간다 (BE-004-EP-03).
   */
  const idempotencyKeyRef = useRef<string | null>(null);
  const takeIdempotencyKey = (): string => {
    const key = idempotencyKeyRef.current ?? crypto.randomUUID();
    idempotencyKeyRef.current = key;
    return key;
  };

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

  /**
   * [EXC-12] 404 와 5xx 를 가른다.
   * 예전에는 `loadFailed = error !== null` 하나로 뭉개, 삭제된 :id 로 들어와도 '다시 시도' 를
   * 권했다 — 재시도해도 영원히 없다.
   */
  const loadError = isEdit ? detailQuery.error : null;
  const loadFailure: LoadFailure | null =
    loadError === null || loadError === undefined
      ? null
      : isNotFound(loadError)
        ? 'not-found'
        : 'error';

  const retryLoad = useCallback(() => {
    void detailQuery.refetch();
  }, [detailQuery]);

  /* ── 저장 ────────────────────────────────────────────────────────────────── */

  const { setError, setFocus } = form;

  const handleWriteError = useCallback(
    (cause: unknown) => {
      // [EXC-09] 취소는 실패가 아니다 — 토스트도 배너도 없다
      if (isAbort(cause)) return;

      // [EXC-04] 409/412 — 덮어쓰지 않고 입력을 보존한 채 충돌을 알린다.
      // 성공 토스트도, 목록 이동도 없다 (유령 저장 금지).
      if (isConflict(cause)) {
        setConflict({
          message: isHttpError(cause)
            ? cause.message
            : '다른 사용자가 먼저 변경했습니다. 최신 내용을 확인해 주세요.',
          reload: () => {
            setConflict(null);
            // 서버 최신본으로 폼을 덮는다 — detail 쿼리가 도착하면 위 effect 가 reset 한다
            void detailQuery.refetch();
          },
          dismiss: () => setConflict(null),
        });
        return;
      }

      // [EXC-07] 422 — 폼 레벨 배너가 아니라 그 입력에 인라인 에러를 꽂고 포커스를 옮긴다
      if (isUnprocessable(cause) && isHttpError(cause) && cause.violations.length > 0) {
        for (const violation of cause.violations) {
          setError(violation.field as FieldPath<Values>, {
            type: 'server',
            message: violation.message,
          });
        }
        const first = cause.violations[0];
        if (first !== undefined) setFocus(first.field as FieldPath<Values>);
        return;
      }

      setServerError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setErrorReference(referenceOf(cause));
    },
    [detailQuery, setError, setFocus],
  );

  const onValid = (values: Values) => {
    // [EXC-08] 동기 잠금 — 두 번째 제출이 여기서 멈춘다
    if (submitLockRef.current) return;
    submitLockRef.current = true;

    setServerError(null);
    setErrorReference(null);
    const controller = new AbortController();
    controllerRef.current = controller;
    const input = config.toInput(values);
    // 재시도가 같은 키를 재사용하도록 제출 **시도** 단위로 잡아 variables 에 싣는다
    const idempotencyKey = takeIdempotencyKey();

    const onSettled = () => {
      submitLockRef.current = false;
    };

    const onSuccess = (verb: string) => () => {
      if (controller.signal.aborted) return;
      // 성공했으니 이 거래는 끝났다 — 다음 제출은 새 키를 받는다
      idempotencyKeyRef.current = null;
      // ERP-13 — '공지사항을 저장했습니다' / '카테고리를 저장했습니다'
      toast.success(`${config.entityLabel}${objectParticle(config.entityLabel)} ${verb}했습니다.`);
      navigate(config.listPath, { replace: true });
    };

    if (isEdit && id !== undefined) {
      update.mutate(
        { id, input, signal: controller.signal, idempotencyKey },
        { onSuccess: onSuccess('저장'), onError: handleWriteError, onSettled },
      );
      return;
    }

    create.mutate(
      { input, signal: controller.signal, idempotencyKey },
      { onSuccess: onSuccess('등록'), onError: handleWriteError, onSettled },
    );
  };

  /**
   * [A11Y-13] 검증 실패 시 첫 invalid 필드로 포커스를 옮긴다.
   * 없으면 사용자는 폼 맨 위로 되짚어 올라가며 어디가 틀렸는지 찾아야 한다.
   * RHF 의 `shouldFocusError` 기본값이 이미 이 일을 하지만, onInvalid 를 명시해 **계약으로**
   * 고정한다(그 기본값이 바뀌어도 동작이 유지된다).
   */
  const onInvalid = () => {
    submitLockRef.current = false;
  };

  return {
    form,
    isEdit,
    saving,
    loadingDetail,
    loadFailure,
    retryLoad,
    serverError,
    errorReference,
    conflict,
    submit: (event) => void form.handleSubmit(onValid, onInvalid)(event),
    isDirty: form.formState.isDirty,
    loaded,
  };
}
