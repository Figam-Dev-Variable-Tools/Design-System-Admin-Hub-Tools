// PgProviderPage — PG 한 곳의 자격증명 (라우트: /settings/payment/:target)
// 시스템 설정 섹션 소유 — apps/admin/src/pages/settings/payment/**
//
// ┌ 왜 별도 라우트인가 ──────────────────────────────────────────────────────┐
// │ 붙일 수 있는 대상이 일곱이고 PG 마다 받아야 할 값이 2~5개씩 다르다. 한 화면에  │
// │ 다 펼치면 '지금 무엇을 채워야 하는가' 가 보이지 않는다. 소셜 로그인 설정이     │
// │ 같은 이유로 목록/상세로 갈렸고(../oauth), 이 화면은 그 구조를 그대로 따른다.   │
// └──────────────────────────────────────────────────────────────────────────┘
//
// ┌ 이 화면의 저장은 **연동 설정만** 쓴다 ────────────────────────────────────┐
// │ 마스터 스위치(PG 결제 사용)와 문의 전환 안내 문구는 목록 화면의 것이다 —      │
// │ 저장 페이로드를 **서버가 준 최신 문서**에서 만들고 연결·모드·결제수단·계약     │
// │ 상태만 폼 값으로 갈아 끼운다(connectionSavePayload). 보이지도 않는 값을        │
// │ 조용히 쓰는 '저장' 은 기능이 아니라 결함이다.                                │
// │                                                                          │
// │ 동시 편집은 revision 이 막는다: 그 사이 누가 무엇을 바꿨든 저장은 409 로 걸리고 │
// │ 충돌 다이얼로그가 뜬다(덮어쓰기는 사람이 고른다).                             │
// └──────────────────────────────────────────────────────────────────────────┘
//
// [검증 범위] 이 대상만 본다(pgTargetScopedSchema). 다른 화면의 값까지 검증하면 **보이지도
// 않고 고칠 수도 없는 오류**가 저장을 막는다 — 근거는 ./validation.ts.
//
// [비밀] 저장된 비밀은 화면에 채워지지 않는다 — 저장 여부만 알고 `••••` 로 표시한다.
// [미저장 이탈] SettingsFormShell 의 가드가 세 경로(브라우저 이탈·앱 내 링크·뒤로가기)를 막는다.
//   '목록으로' 는 그래서 **버튼이 아니라 링크(<Link>)** 다: 가드는 앵커 클릭을 가로챈다.
//   navigate() 로 프로그램 이동하면 그 가드를 그냥 지나쳐 입력이 조용히 사라진다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';

import { cssVar, typography } from '@tds/ui';

import { isAbort } from '../../../shared/async';
import { zodResolver } from '../../../shared/form/zodResolver';
import {
  Alert,
  Button,
  checkboxStyle,
  ConfirmDialog,
  errorTextStyle,
  fieldLabelStyle,
  FormField,
  formRowStyle,
  hintStyle,
  Icon,
  SelectField,
  useToast,
} from '../../../shared/ui';
import { useRouteWritePermissions } from '../../../shared/permissions/RequirePermission';
import { DEFAULT_PAYMENT_SETTINGS } from '../../../shared/commerce/payment-settings';
import type { PaymentSettings } from '../../../shared/commerce/payment-settings';
import {
  connectionTarget,
  isPgTargetId,
  PG_CONTRACT_STATUS_HINT,
  PG_WEBHOOK_REGISTRATION_TEXT,
  pgConsoleInputs,
  pgLabel,
  pgMeta,
} from '../../../shared/commerce/pg-catalog';
import type { PaymentMethod, PgTargetId } from '../../../shared/commerce/pg-catalog';
import { ConflictDialog } from '../_shared/ConflictDialog';
import { formatAuditAt } from '../_shared/diff';
import { copyToClipboard } from '../_shared/secret';
import { useSaveSettings, useSettingsQuery, useSubmitLock } from '../_shared/queries';
import { SettingsFormShell } from '../_shared/SettingsFormShell';
import { isSettingsConflict } from '../_shared/store';
import type { AuditInfo, Revisioned } from '../_shared/store';
import { PgCredentialFields } from './components/PgCredentialFields';
import { PgMark } from './components/PgMark';
import { paymentDivergedLabels, paymentSettingsKey, paymentSettingsStore } from './data-source';
import { PAYMENT_LIST_PATH } from './paths';
import {
  CONTRACT_STATUS_OPTIONS,
  methodOptionsFor,
  MODE_OPTIONS,
  normalizeAfterSave,
  toPaymentFormValuesFor,
  toPgConnection,
} from './types';
import { pgTargetScopedSchema } from './validation';
import type { PaymentSettingsValues } from './validation';

const READ_ONLY_NOTICE =
  '조회 권한만 있어요. 결제 설정을 바꾸려면 시스템 설정 수정 권한이 필요해요.';

/* ── 스타일 ────────────────────────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.4'),
};

/** '목록으로' — 앱의 다른 상세 화면과 같은 모양 */
const backLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  alignSelf: 'flex-start',
  gap: cssVar('space.2'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.label.md.font-size'),
  lineHeight: cssVar('typography.label.md.line-height'),
  textDecoration: 'none',
};

/**
 * 화면 제목 — 브랜드 마크 + PG 이름.
 * `<h2>` 다: 앱 헤더가 이미 `<h1>결제 설정</h1>` 을 그린다(shared/layout/AppHeader).
 */
const titleStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  color: cssVar('color.text.default'),
  ...typography('typography.title.md'),
};

const notFoundRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: cssVar('space.3'),
  flexWrap: 'wrap',
};

const groupStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  minWidth: 0,
};

/**
 * 결제수단 목록 — **한 줄에 하나**.
 *
 * 예전에는 `auto-fill` 여러 열이었다. 그런데 항목마다 내용 폭이 크게 다르다: '신용·체크카드' 는
 * 이름뿐이고 나머지 넷에는 '계약 필요' 꼬리표가 붙는다. 열 폭은 모두 같으므로(`1fr`) 꼬리표가
 * 붙은 항목이 열을 넘치거나 이름이 눌렸고, 줄마다 오른쪽 끝이 들쭉날쭉했다.
 *
 * 다섯 줄뿐이라 한 열로 펴는 비용이 거의 없다. 꼬리표는 줄 오른쪽에 모은다(methodTagStyle).
 */
const methodListStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr)',
  gap: cssVar('space.2'),
  marginTop: 0,
  marginBottom: 0,
  marginLeft: 0,
  marginRight: 0,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
  listStyle: 'none',
};

/**
 * 결제수단 한 줄 — **고를 수 있는 것처럼 보이게** 한다.
 *
 * 예전에는 체크박스와 글자만 나란한 평평한 줄이었다. 다섯 줄이 여백 없이 붙어 있어 어디까지가
 * 한 항목인지 눈으로 끊기지 않았고, 켠 것과 끈 것의 차이가 **체크 표시 하나**뿐이었다.
 * 줄마다 테두리와 표면을 주면 누를 수 있는 대상이라는 것이 형태로 드러나고, 켠 줄은 테두리
 * 색까지 달라져 **한눈에 몇 개를 켰는지** 보인다(색만으로 말하지 않는다 — 체크 표시가 그대로다).
 */
function methodItemStyle(checked: boolean, isDisabled: boolean): CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: cssVar('space.3'),
    minWidth: 0,
    boxSizing: 'border-box',
    paddingTop: cssVar('space.3'),
    paddingBottom: cssVar('space.3'),
    paddingLeft: cssVar('space.3'),
    paddingRight: cssVar('space.3'),
    borderStyle: 'solid',
    borderWidth: cssVar('border-width.thin'),
    borderColor: checked ? cssVar('color.action.primary.default') : cssVar('color.border.default'),
    borderRadius: cssVar('radius.md'),
    background: checked ? cssVar('color.surface.raised') : cssVar('color.surface.default'),
    cursor: isDisabled ? 'not-allowed' : 'pointer',
  };
}

/** 수단 이름 — 길어져도 꼬리표를 밀어내지 않는다(꼬리표는 줄 오른쪽 고정) */
const methodNameStyle: CSSProperties = {
  minWidth: 0,
  overflowWrap: 'anywhere',
};

/**
 * '사전 계약 필요' 꼬리표 — 체크는 됐는데 결제창에 안 뜨는 사고를 막는다.
 *
 * `marginLeft: auto` 로 줄 오른쪽에 붙인다. 이름 길이가 제각각이라(‘신용·체크카드’ ↔ ‘가상계좌’)
 * 이름 바로 뒤에 두면 꼬리표가 줄마다 다른 자리에서 시작해, 넷이 같은 조건이라는 사실이 보이지
 * 않는다. 오른쪽에 모으면 **한 열로 정렬되어** 어느 수단이 계약을 요구하는지 훑어보면 안다.
 *
 * 알약 모양인 이유: 글자만 두면 줄 오른쪽의 회색 글씨가 **값처럼** 읽힌다(‘계좌이체 = 계약 필요’).
 * 테두리를 둘러 표식임을 드러낸다. StatusBadge 를 쓰지 않는 것은 이것이 **상태가 아니라 조건**
 * 이기 때문이다 — 넷 중 넷에 경고 톤 배지가 붙으면 읽는 사람은 무언가 잘못됐다고 읽는다.
 */
const methodTagStyle: CSSProperties = {
  marginLeft: 'auto',
  flexShrink: 0,
  paddingTop: cssVar('space.1'),
  paddingBottom: cssVar('space.1'),
  paddingLeft: cssVar('space.2'),
  paddingRight: cssVar('space.2'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.subtle'),
  borderRadius: cssVar('radius.full'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: '1',
  whiteSpace: 'nowrap',
};

/** 웹훅 안내 — **읽기 전용 카드**다. 등록은 각 PG 콘솔에서 한다 */
const noticeCardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: cssVar('space.2'),
  paddingTop: cssVar('space.3'),
  paddingBottom: cssVar('space.3'),
  paddingLeft: cssVar('space.4'),
  paddingRight: cssVar('space.4'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.subtle'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.muted'),
  fontSize: cssVar('typography.caption.md.font-size'),
  lineHeight: cssVar('typography.caption.md.line-height'),
};

const noticeTitleStyle: CSSProperties = {
  color: cssVar('color.text.default'),
  fontWeight: cssVar('typography.label.md.font-weight'),
};

/** 복사해 갈 주소 한 줄 — 값과 복사 버튼을 나란히 */
const consoleInputRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: cssVar('space.3'),
  minWidth: 0,
};

/**
 * 우리가 알려 주는 주소의 표시칸.
 *
 * `<input readOnly>` 가 아니라 **`<output>`** 이다: FormField 는 항상 `<label htmlFor>` 를
 * 그리는데 `<span>` 은 labelable 요소가 아니라 **고아 라벨**이 되고, `<input readOnly>` 로 두면
 * 편집 컨트롤로 읽혀 '여기에 뭔가 넣어야 하나' 로 오해된다. `<output>` 은 labelable 이면서
 * 편집 컨트롤이 아닌 유일한 선택이다(../oauth 의 iOS URL 스키마와 같은 판단).
 *
 * 고정폭이라야 `0/O`·`1/l` 이 구분된다 — 한 글자만 달라도 통보가 오지 않는 값이다.
 */
const consoleInputValueStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflowWrap: 'anywhere',
  paddingTop: cssVar('space.2'),
  paddingBottom: cssVar('space.2'),
  paddingLeft: cssVar('space.3'),
  paddingRight: cssVar('space.3'),
  borderStyle: 'solid',
  borderWidth: cssVar('border-width.thin'),
  borderColor: cssVar('color.border.default'),
  borderRadius: cssVar('radius.md'),
  background: cssVar('color.surface.raised'),
  color: cssVar('color.text.default'),
  fontFamily: cssVar('typography.code.md.font-family'),
  fontSize: cssVar('typography.code.md.font-size'),
  lineHeight: cssVar('typography.code.md.line-height'),
};

/* ── 저장 페이로드 ─────────────────────────────────────────────────────────── */

/**
 * 이 화면이 실제로 보낼 문서 — **연동 설정만** 폼 값으로 갈아 끼운다.
 * 마스터 스위치와 안내 문구는 서버 값 그대로다(파일 머리말).
 */
export function connectionSavePayload(
  server: PaymentSettings,
  form: PaymentSettingsValues,
): PaymentSettings {
  return {
    ...server,
    connection: toPgConnection(form.connection),
    mode: form.mode,
    methods: [...form.methods],
    contractStatus: form.contractStatus,
  };
}

/** 저장 확인 문구 — PG 를 **갈아타는** 저장이면 그 사실을 앞세운다 */
function saveConfirmMessage(
  target: PgTargetId,
  server: PaymentSettings,
  next: PaymentSettings,
): string {
  const label = pgLabel(target);
  const before = connectionTarget(server.connection);

  if (before !== target) {
    return `결제 연동을 ${pgLabel(before)}에서 ${label}(으)로 바꿔요. ${pgLabel(before)}에 넣어 둔 값은 더 이상 쓰이지 않아요.${
      server.usePg ? ' PG 결제가 켜져 있어 고객 화면이 즉시 이 PG 로 바뀌어요.' : ''
    } 저장할까요?`;
  }

  if (!server.usePg) {
    return `${label} 연동 설정을 저장해요. PG 결제 사용이 꺼져 있어 고객 화면은 지금 그대로 문의하기예요. 저장할까요?`;
  }

  return `${label} 연동 설정을 저장해요. ${
    next.mode === 'test'
      ? '테스트 모드라 결제창은 열리지만 실제 결제는 일어나지 않아요.'
      : '운영 모드라 고객의 결제가 실제로 승인돼요.'
  } 저장할까요?`;
}

/* ── 화면 ──────────────────────────────────────────────────────────────────── */

const DEFAULT_FORM_VALUES: PaymentSettingsValues = toPaymentFormValuesFor(
  DEFAULT_PAYMENT_SETTINGS,
  'toss',
);

/**
 * RHF 의 오류 트리에서 이 화면이 쓸 문구만 꺼낸다.
 *
 * `connection.publicValues.<key>` 처럼 **동적 키**라 타입으로 미리 셀 수 없다 — 캐스트로
 * 뭉개는 대신 unknown 에서 좁혀 꺼낸다. 없으면 없는 대로 비어 있는 표다.
 */
function collectCredentialErrors(source: unknown): Readonly<Record<string, string>> {
  const collected: Record<string, string> = {};
  if (typeof source !== 'object' || source === null) return collected;

  for (const bucket of ['publicValues', 'secretInputs'] as const) {
    const group: unknown = Reflect.get(source, bucket);
    if (typeof group !== 'object' || group === null) continue;

    for (const key of Object.keys(group)) {
      const entry: unknown = Reflect.get(group, key);
      if (typeof entry !== 'object' || entry === null) continue;

      const message: unknown = Reflect.get(entry, 'message');
      if (typeof message === 'string') collected[`${bucket}.${key}`] = message;
    }
  }

  return collected;
}

export default function PgProviderPage() {
  const { target: rawTarget = '' } = useParams<{ target: string }>();
  const toast = useToast();
  const { canUpdate } = useRouteWritePermissions();

  /**
   * 주소창에서 온 문자열을 좁힌다 — 여기가 유일한 관문이다.
   * 좁히지 못하면 `null` 이고, 그때 화면은 빈 껍데기가 아니라 '없는 PG' 를 말한다.
   */
  const target: PgTargetId | null = isPgTargetId(rawTarget) ? rawTarget : null;

  const { data, isFetching, error, refetch } = useSettingsQuery(
    paymentSettingsKey,
    paymentSettingsStore,
  );
  const save = useSaveSettings(paymentSettingsKey, paymentSettingsStore);
  const saving = save.isPending;
  const lock = useSubmitLock();

  /** 검증 스키마는 **이 대상에 매인다** — target 이 바뀌면 스키마도 바뀐다 */
  const resolver = useMemo(() => zodResolver(pgTargetScopedSchema(target ?? 'toss')), [target]);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<PaymentSettingsValues>({ resolver, defaultValues: DEFAULT_FORM_VALUES });

  const [pending, setPending] = useState<PaymentSettings | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<Revisioned<PaymentSettings> | null>(null);
  /** '변경 중' 인 비밀들 — 화면 상태이지 저장값이 아니다 */
  const [changingSecrets, setChangingSecrets] = useState<ReadonlySet<string>>(new Set());

  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => () => controllerRef.current?.abort(), []);

  useEffect(() => {
    if (data === undefined || target === null) return;
    reset(toPaymentFormValuesFor(data.value, target));
    setChangingSecrets(new Set());
  }, [data, reset, target]);

  const values = watch();

  const loading = isFetching && data === undefined;
  const audit: AuditInfo | null = data?.audit ?? null;
  const disabled = saving || loading || !canUpdate;
  const server = data?.value ?? DEFAULT_PAYMENT_SETTINGS;

  /* ── 저장 ───────────────────────────────────────────────────────────────── */

  const runSave = useCallback(
    (next: PaymentSettings, force: boolean) => {
      const revision = data?.revision;
      if (revision === undefined) return;
      if (!lock.acquire()) return; // [EXC-08]

      setSaveError(null);
      const controller = new AbortController();
      controllerRef.current = controller;

      save.mutate(
        { value: next, expectedRevision: revision, force, signal: controller.signal },
        {
          onSuccess: () => {
            lock.release();
            if (controller.signal.aborted) return;
            // 저장한 순간 평문 비밀은 화면에서 사라진다 — 새 기준선은 '저장됨 + 빈 입력' 이다
            reset(normalizeAfterSave(next));
            setChangingSecrets(new Set());
            setPending(null);
            setConflict(null);
            toast.success(
              target === null
                ? '결제 설정을 저장했어요.'
                : `${pgLabel(target)} 연동 설정을 저장했어요.`,
            );
          },
          onError: (cause: unknown) => {
            lock.release();
            if (isAbort(cause) || controller.signal.aborted) return; // [EXC-09]
            if (isSettingsConflict(cause)) {
              setPending(null);
              setConflict(cause.latest as Revisioned<PaymentSettings>);
              return;
            }
            setSaveError('결제 설정을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.');
          },
        },
      );
    },
    [data?.revision, lock, reset, save, target, toast],
  );

  const onValid = useCallback(
    (form: PaymentSettingsValues) => {
      const latest = data?.value;
      if (latest === undefined) return;
      setSaveError(null);
      // 연동 설정만 갈아 끼운다 — 스위치와 문구는 서버 값 그대로다(파일 머리말)
      setPending(connectionSavePayload(latest, form));
    },
    [data?.value],
  );

  const confirmSave = useCallback(() => {
    if (pending === null) return;
    runSave(pending, false);
  }, [pending, runSave]);

  const cancelSave = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setSaveError(null);
    setPending(null);
  }, [lock, save]);

  const reloadLatest = useCallback(() => {
    const latest = conflict;
    if (latest === null || target === null) return;
    reset(toPaymentFormValuesFor(latest.value, target));
    setChangingSecrets(new Set());
    setConflict(null);
    void refetch();
    toast.success('최신 결제 설정을 불러왔어요.');
  }, [conflict, refetch, reset, target, toast]);

  const overwrite = useCallback(() => {
    const latest = data?.value;
    if (latest === undefined) return;
    runSave(connectionSavePayload(latest, getValues()), true);
  }, [data?.value, getValues, runSave]);

  const closeConflict = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    save.reset();
    lock.release();
    setConflict(null);
  }, [lock, save]);

  /** 무엇이 갈라졌는지 — 이 화면이 쓰는 것(연동 설정)만 짚는다 */
  const conflictFields = useMemo(() => {
    if (conflict === null) return [];
    const mine = connectionSavePayload(server, getValues());
    return paymentDivergedLabels(mine, conflict.value).filter(
      (label) => label !== '문의 전환 안내 문구' && label !== 'PG 결제 사용',
    );
  }, [conflict, getValues, server]);

  /* ── 결제수단 다중 선택 — 선택지 자체가 PG 에서 파생된다 ────────────────── */

  const toggleMethod = useCallback(
    (method: PaymentMethod, checked: boolean) => {
      if (target === null) return;
      const current = getValues('methods');
      // 순서를 카탈로그 순서로 되맞춘다 — 켰다 껐다 한 순서가 저장 값에 남지 않게 한다
      const next = methodOptionsFor(target)
        .filter((option) => (option.id === method ? checked : current.includes(option.id)))
        .map((option) => option.id);

      setValue('methods', next, { shouldDirty: true, shouldValidate: true });
    },
    [getValues, setValue, target],
  );

  const startChangingSecret = useCallback((key: string) => {
    setChangingSecrets((prev) => new Set(prev).add(key));
  }, []);

  const cancelChangingSecret = useCallback(
    (key: string) => {
      // 입력하던 새 값을 버린다 — 저장된 기존 값이 그대로 유지된다
      const path: `connection.secretInputs.${string}` = `connection.secretInputs.${key}`;
      setValue(path, '', { shouldDirty: true, shouldValidate: true });
      setChangingSecrets((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    [setValue],
  );

  /** 복사 — 실패를 삼키지 않는다(보안 컨텍스트가 아니면 클립보드 API 가 없다) */
  const copyAddress = useCallback(
    (value: string) => {
      void copyToClipboard(value).then((ok) => {
        if (ok) {
          toast.success('주소를 복사했어요.');
          return;
        }
        toast.error('클립보드를 쓸 수 없어요. 값을 직접 선택해 복사해 주세요.');
      });
    },
    [toast],
  );

  const backLink = (
    <Link to={PAYMENT_LIST_PATH} style={backLinkStyle} className="tds-ui-link tds-ui-focusable">
      <Icon name="chevron-left" />
      목록으로
    </Link>
  );

  /* ── 알 수 없는 대상 — 빈 화면을 내놓지 않는다 ──────────────────────────── */
  if (target === null) {
    return (
      <div style={pageStyle}>
        {backLink}
        <Alert tone="danger">
          <div style={notFoundRowStyle}>
            <span>&lsquo;{rawTarget}&rsquo;은(는) 이 화면이 아는 결제 서비스가 아니에요.</span>
            <Link to={PAYMENT_LIST_PATH} className="tds-ui-link tds-ui-focusable">
              결제 서비스 목록으로 돌아가기
            </Link>
          </div>
        </Alert>
      </div>
    );
  }

  // 위 가드를 지났으므로 target 은 아는 대상이다
  const meta = pgMeta(target);
  const label = meta.label;
  /**
   * 주소는 **오리진에서 파생**한다 — 손으로 적어 두면 도메인이 바뀌는 날 조용히 낡는다.
   * 브라우저 밖(테스트·SSR)에서도 안전하게 빈 오리진으로 떨어진다.
   */
  const consoleInputs = pgConsoleInputs(
    target,
    typeof window === 'undefined' ? '' : window.location.origin,
  );
  const methodsErrorId = `payment-${target}-methods-error`;
  const methodsError = (errors.methods as { message?: string } | undefined)?.message;
  const credentialErrors = collectCredentialErrors(errors.connection);
  const switching = connectionTarget(server.connection) !== target;

  return (
    <>
      <div style={pageStyle}>
        {backLink}

        <h2 style={titleStyle}>
          <PgMark target={target} size={cssVar('space.7')} />
          {label}
        </h2>

        <SettingsFormShell
          cardTitle="연동 설정"
          description={`${label}에서 발급받은 값을 넣어요. 필수 값이 하나라도 비어 있으면 결제창이 열리지 않고 구매·후원 버튼은 문의하기로 남아요.`}
          loading={loading}
          loadFailed={error !== null}
          onRetry={() => void refetch()}
          serverError={
            saveError !== null && pending === null && conflict === null ? saveError : null
          }
          saving={saving}
          dirty={isDirty}
          canUpdate={canUpdate}
          readOnlyNotice={READ_ONLY_NOTICE}
          unsavedMessage={`${label} 연동 설정에 저장하지 않은 변경 사항이 있어요. 이 화면을 벗어나면 입력한 내용이 사라져요.`}
          audit={audit}
          warning={
            loading ? null : (
              <>
                {/* PG 를 갈아타는 저장이 되는 자리다 — 저장 전에 그 사실을 말한다 */}
                {switching && (
                  <Alert tone="warning">
                    지금 연동된 결제 서비스는{' '}
                    <strong>{pgLabel(connectionTarget(server.connection))}</strong>예요. 이 화면을
                    저장하면 <strong>{label}</strong>(으)로 갈아타요.
                  </Alert>
                )}

                {/* 마스터 스위치는 목록 화면의 것이다 — 여기서 켤 수 없다는 사실을 숨기지 않는다 */}
                {!values.usePg && (
                  <Alert tone="info">
                    PG 결제 사용이 꺼져 있어 값을 넣어 두어도 고객 화면은 문의하기로 남아요. 실제로
                    쓰려면{' '}
                    <Link to={PAYMENT_LIST_PATH} className="tds-ui-link tds-ui-focusable">
                      결제 설정 목록
                    </Link>
                    에서 &lsquo;PG 결제 사용&rsquo;을 켜세요.
                  </Alert>
                )}

                {/* 자격증명이 아닌 준비물 — 값을 다 넣고도 결제가 안 되는 이유는 대개 여기 있다 */}
                {meta.consoleNotice !== null && <Alert tone="info">{meta.consoleNotice}</Alert>}
              </>
            )
          }
          onSubmit={(event) => void handleSubmit(onValid)(event)}
        >
          {/* ── 자격증명 — 무엇을 그릴지는 카탈로그가 정한다 ─────────────── */}
          <PgCredentialFields
            target={target}
            register={register}
            disabled={disabled}
            usePg={values.usePg}
            publicValues={values.connection.publicValues}
            storedSecrets={values.connection.storedSecrets}
            changingSecrets={changingSecrets}
            errors={credentialErrors}
            onChangeSecretStart={startChangingSecret}
            onChangeSecretCancel={cancelChangingSecret}
          />

          {/* ── 연동 모드 · 계약 상태 ────────────────────────────────────── */}
          <div style={formRowStyle}>
            <FormField
              htmlFor={`payment-${target}-mode`}
              label="연동 모드"
              required
              hint={
                values.mode === 'test'
                  ? `테스트 모드에서는 결제창이 열려도 실제 결제가 일어나지 않아요. ${meta.environmentNote}`
                  : `운영 모드에서는 고객의 결제가 실제로 승인돼요. ${meta.environmentNote}`
              }
            >
              <SelectField
                id={`payment-${target}-mode`}
                disabled={disabled}
                value={values.mode}
                onChange={(event) => {
                  const next = MODE_OPTIONS.find((option) => option.id === event.target.value);
                  if (next === undefined) return;
                  setValue('mode', next.id, { shouldDirty: true, shouldValidate: true });
                }}
              >
                {MODE_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </FormField>

            <FormField
              htmlFor={`payment-${target}-contract`}
              label="계약 상태"
              required
              // 지어낸 상태를 사실처럼 보이지 않게 — 이 값이 어디서 왔는지 화면이 밝힌다
              hint={`${PG_CONTRACT_STATUS_HINT[values.contractStatus]} PG 에 계약 상태를 물어볼 방법이 없어, 이 값은 운영자가 직접 골라 적어 두는 메모예요 — 실제 심사 결과와 다를 수 있어요.`}
            >
              <SelectField
                id={`payment-${target}-contract`}
                disabled={disabled}
                value={values.contractStatus}
                onChange={(event) => {
                  const next = CONTRACT_STATUS_OPTIONS.find(
                    (option) => option.id === event.target.value,
                  );
                  if (next === undefined) return;
                  setValue('contractStatus', next.id, {
                    shouldDirty: true,
                    shouldValidate: true,
                  });
                }}
              >
                {CONTRACT_STATUS_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </SelectField>
            </FormField>
          </div>

          {/* ── 결제수단 — 이 PG 가 실제로 띄울 수 있는 것만 그린다 ────────── */}
          <div style={groupStyle}>
            <span style={fieldLabelStyle}>
              결제수단
              <span aria-hidden="true"> *</span>
            </span>

            {/* 묶음 이름이 필수를 싣는다 — 개별 체크박스가 아니라 '고르는 행위' 가 필수다 (A11Y-11) */}
            <ul
              style={methodListStyle}
              role="group"
              aria-label="결제수단 (필수)"
              {...(methodsError === undefined ? {} : { 'aria-describedby': methodsErrorId })}
            >
              {methodOptionsFor(target).map((option) => {
                const checked = values.methods.includes(option.id);
                return (
                  <li key={option.id}>
                    <label style={methodItemStyle(checked, disabled)}>
                      <input
                        type="checkbox"
                        className="tds-ui-check tds-ui-focusable"
                        style={checkboxStyle}
                        checked={checked}
                        disabled={disabled}
                        onChange={(event) => {
                          toggleMethod(option.id, event.target.checked);
                        }}
                      />
                      <span style={methodNameStyle}>{option.label}</span>
                      {option.contractRequired && <span style={methodTagStyle}>계약 필요</span>}
                    </label>
                  </li>
                );
              })}
            </ul>

            {methodsError === undefined ? (
              <p style={hintStyle}>
                {label}가 지원하는 수단만 보여요. &lsquo;계약 필요&rsquo; 로 표시된 수단은 PG 계약에
                그 수단이 들어 있어야 결제창에 실제로 떠요 — 체크만 해서는 뜨지 않아요.
              </p>
            ) : (
              <p id={methodsErrorId} role="alert" style={errorTextStyle}>
                {methodsError}
              </p>
            )}
          </div>

          {/* ── 우리가 PG 콘솔에 **넣어 줘야 하는** 주소 ─────────────────────
              위 자격증명과 **방향이 반대다**: 저것은 PG 에서 받아 오는 값이라 입력칸이고,
              이것은 우리가 알려 주는 값이라 **읽고 복사하는 값**이다. 같은 모양으로 그리면
              운영자는 이 칸도 어딘가에서 받아 와 채워야 하는 줄 알고 콘솔을 뒤진다.
              등록 자체도 여기서 하지 않는다 — 이니시스는 아예 셀프서비스가 아니다. */}
          <div style={groupStyle}>
            <span style={fieldLabelStyle}>{label} 콘솔에 등록할 주소</span>

            {/* 지어낸 주소를 되는 척 내놓지 않는다 — 아직 서버에 없다는 사실을 먼저 말한다 */}
            <Alert tone="warning">
              아래 주소는 <strong>아직 서버에 없어요.</strong> 지금 등록하면 통보가 404 로 떨어져요.
              백엔드 연동 후 열려요.
            </Alert>

            {consoleInputs.map((input) => (
              <FormField
                key={input.key}
                htmlFor={`payment-${target}-console-${input.key}`}
                label={input.label}
                hint={input.note}
              >
                <span style={consoleInputRowStyle}>
                  <output
                    id={`payment-${target}-console-${input.key}`}
                    style={consoleInputValueStyle}
                  >
                    {input.path}
                  </output>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      copyAddress(input.path);
                    }}
                  >
                    복사
                  </Button>
                </span>
              </FormField>
            ))}

            <div style={noticeCardStyle}>
              <span style={noticeTitleStyle}>등록은 어디서 하나</span>
              <span>{PG_WEBHOOK_REGISTRATION_TEXT[meta.webhookRegistration]}</span>
              <span>
                통보를 받아 주문 상태를 바꾸는 일은 서버가 해요. 이 화면에서 등록하거나 시험 발송할
                수 있는 것은 없어요.
              </span>
            </div>
          </div>

          {/* ── '연결 테스트' 버튼을 두지 않는 이유 ────────────────────────
              브라우저에서 PG 를 부르려면 시크릿이 브라우저로 내려와야 하고, 그 순간
              '평문은 화면에 오지 않는다' 는 이 화면의 규약이 통째로 거짓이 된다. */}
          <p style={hintStyle}>
            자격증명이 맞는지 확인하는 일은 서버가 결제창 세션을 만들어 봐야 알 수 있어요. 이
            화면에는 &lsquo;연결 테스트&rsquo; 버튼이 없어요 — 브라우저에서 확인하려면 시크릿이
            브라우저로 내려와야 하기 때문이에요.
          </p>
        </SettingsFormShell>
      </div>

      {pending !== null && (
        <ConfirmDialog
          intent="update"
          title={`${label} 연동 설정 저장`}
          message={saveConfirmMessage(target, server, pending)}
          busy={saving}
          error={saveError}
          onConfirm={confirmSave}
          onCancel={cancelSave}
        />
      )}

      {conflict !== null && (
        <ConflictDialog
          subject={`${label} 연동 설정`}
          latestBy={conflict.audit.updatedBy}
          latestAt={formatAuditAt(conflict.audit.updatedAt)}
          divergedFields={conflictFields}
          busy={saving}
          error={saveError}
          onReload={reloadLatest}
          onOverwrite={overwrite}
          onClose={closeConflict}
        />
      )}
    </>
  );
}
