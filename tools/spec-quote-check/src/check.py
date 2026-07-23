"""명세 문서의 인용문과 그 출처가 실제 코드와 맞는지 전수 대조한다.

문서는 인용마다 `문구` — `경로:줄` 로 출처를 남기도록 규약돼 있다(B0 규약 4).
그 규약 덕분에 문구가 바뀌어도 기계로 따라잡을 수 있다.

세 가지를 본다.

  ① 낡음        문구가 코드에 없다 — 문구 정리로 바뀌었는데 문서가 못 따라간 자리.
  ② 모호한 출처  파일명만 적었다. 이 리포에는 `validation.ts`·`types.ts`·`data-source.ts`
                 같은 이름이 수십 개씩 있어 어느 것인지 특정되지 않는다.
  ③ 없는 줄      줄 번호가 그 파일의 실제 길이를 넘는다.

②③ 을 따로 보는 이유: 실제로 `로고를 등록하세요. — validation.ts:68` 이라 적힌 인용이 있었는데
그 파일은 13줄짜리였고 그 문장도 없었다(문장은 공용 헬퍼가 라벨에서 조립했다). ① 만 보면
문구가 우연히 맞는 한 그런 허구 출처는 영원히 안 걸린다.

[왜 단순 포함 검사로는 오탐이 쏟아지는가]
코드의 문구는 대부분 템플릿 리터럴이다:

    `닉네임은 ${String(ADMIN_NICKNAME_MAX_LENGTH)}자를 넘을 수 없어요.`

문서는 사람이 읽는 형태(`닉네임은 30자를 넘을 수 없어요.`)로 적으므로 통째로는 안 맞는다.
보간 자리(숫자·영문 상수·자리표시자)를 걷어낸 **고정 조각**으로 대조한다. 조각이 짧으면 우연히
맞을 수 있어 길이 하한을 두고, 미달이면 '낡음' 으로 단정하지 않고 판정 보류로 뺀다 —
잘못된 고발이 침묵보다 나쁘다.
"""

import glob
import io
import os
import re
import sys
from collections import defaultdict

sys.stdout.reconfigure(encoding="utf-8")

QUOTE_RE = re.compile(r"`([^`\n]{2,160})`\s*—\s*`([^`\n]+?):(\d+)`")
CODE_ROOTS = ("apps/admin/src", "packages/ui/src", "packages/ui/pages")

INTERPOLATED = re.compile(
    r"\{[^}]*\}"  # 문서 표기의 자리표시자 {엔티티}
    r"|\$\{[^}]*\}"  # 코드의 템플릿 식
    r"|…"
    r"|\d+"  # 숫자 상수 (60자 · 5MB · 3년)
    r"|[A-Za-z][A-Za-z0-9./:·]*"  # 영문 토큰 (PNG · https:// · MB)
)
MIN_FRAGMENT = 5


def code_files() -> dict[str, str]:
    files = {}
    for root in CODE_ROOTS:
        for dirpath, _, filenames in os.walk(root):
            for name in filenames:
                if name.endswith((".ts", ".tsx")):
                    path = os.path.join(dirpath, name).replace(os.sep, "/")
                    try:
                        files[path] = io.open(path, encoding="utf-8").read()
                    except OSError:
                        pass
    return files


def squeeze(text: str) -> str:
    return re.sub(r"\s+", "", text)


def fragments(quote: str) -> list[str]:
    return [f for f in (p.strip() for p in INTERPOLATED.split(quote)) if len(f) >= MIN_FRAGMENT]


def main() -> int:
    files = code_files()
    blob = squeeze("\n".join(files.values()))
    line_counts = {p: t.count("\n") + 1 for p, t in files.items()}
    by_basename: dict[str, list[str]] = defaultdict(list)
    for path in files:
        by_basename[path.rsplit("/", 1)[-1]].append(path)

    docs = sorted(
        glob.glob("docs/FSD/**/*.md", recursive=True)
        + glob.glob("docs/NFRS/**/*.md", recursive=True)
    )

    total = skipped = 0
    stale: list[tuple[str, str, str, str]] = []
    ambiguous: list[tuple[str, str, int]] = []
    bad_line: list[tuple[str, str, str, int, int]] = []

    for doc in docs:
        text = io.open(doc, encoding="utf-8").read()
        for match in QUOTE_RE.finditer(text):
            total += 1
            quote, src, line = match.group(1), match.group(2), int(match.group(3))

            # ② 모호한 출처 — 파일명만 적었고 그 이름을 가진 파일이 둘 이상
            candidates = by_basename.get(src.rsplit("/", 1)[-1], [])
            if "/" not in src and len(candidates) > 1:
                ambiguous.append((doc, src, len(candidates)))
            # ③ 없는 줄 — 경로가 특정될 때만 잴 수 있다
            resolved = files.get(src) is not None
            target = src if resolved else (candidates[0] if len(candidates) == 1 else None)
            if target is not None and line > line_counts[target]:
                bad_line.append((doc, quote, target, line, line_counts[target]))

            # ① 낡음
            parts = fragments(quote)
            if not parts:
                skipped += 1
            elif not all(squeeze(part) in blob for part in parts):
                stale.append((doc, quote, src, str(line)))

    def short(path: str) -> str:
        return path.replace(os.sep, "/").replace("docs/", "")

    print("인용 %d건 · 낡음 %d · 모호한 출처 %d · 없는 줄 %d · 판정 보류 %d"
          % (total, len(stale), len(ambiguous), len(bad_line), skipped))

    if bad_line:
        print("\n── 없는 줄을 가리킨다 (가장 무겁다) ──")
        for doc, quote, target, line, count in bad_line:
            print("  [%s] %s:%d 은 없다 (그 파일은 %d줄)" % (short(doc), target, line, count))
            print("      «%s»" % quote[:70])

    if stale:
        print("\n── 문구가 코드에 없다 ──")
        for doc, quote, src, line in stale:
            print("  [%s] «%s»  <-  %s:%s" % (short(doc), quote[:70], src, line))

    if ambiguous:
        print("\n── 파일명만 적어 특정되지 않는다 (상위 20) ──")
        counted: dict[tuple[str, str], int] = defaultdict(int)
        for doc, src, n in ambiguous:
            counted[(short(doc), src)] += 1
        for (doc, src), n in sorted(counted.items(), key=lambda kv: -kv[1])[:20]:
            same = len(by_basename[src.rsplit("/", 1)[-1]])
            print("  [%s] %s ×%d  (같은 이름 %d개)" % (doc, src, n, same))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
