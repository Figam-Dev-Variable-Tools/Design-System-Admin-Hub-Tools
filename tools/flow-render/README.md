# @tds/flow-render — 플로우 차트 렌더 생성기

`docs/flow/mmd/**/*.mmd`(정본) → `docs/flow/html/**/*.html`(렌더).

| 명령                | 하는 일                                                              | 종료 코드            |
| ------------------- | -------------------------------------------------------------------- | -------------------- |
| `pnpm flow:render`  | 전건 렌더 + 목차(`index.html`) 갱신 + 정본이 사라진 고아 html 제거    | 0                    |
| `pnpm flow:check`   | 산출물이 정본과 일치하는지만 확인 (쓰지 않는다)                      | 0 최신 / 1 표류 있음 |

## 왜 이 도구가 있나

플로우 차트의 정본은 `.mmd` 하나인데, **그 렌더를 도는 스크립트가 리포에 등록돼 있지 않았다.**
그래서 표류했다 — 2026-07-22 실측으로 html 이 아예 없는 `.mmd` 10건, 정본보다 낡은 html 다수,
`.mmd` 가 지워졌는데 남아 있던 고아 html 3건. `tds-pages.json` 이 `codegen:check` 밖에 있던 것과
같은 계열의 공백이라, `nav-sync` 처럼 **신선도 검사**를 붙여 막는다.

## 왜 mmdc 가 아니라 클라이언트 렌더인가

기존 html 은 `@mermaid-js/mermaid-cli`(mmdc)가 뽑은 SVG 를 구워 넣은 것이었다. mmdc 는 puppeteer 가
내려받는 Chromium 을 띄워야 하는데 이 환경에서 기동하지 않는다 — 렌더가 **브라우저 설치 여부에
인질로 잡혀 있었다.** 그래서 SVG 를 굽지 않고, mermaid 번들과 `.mmd` 원문을 페이지에 실어
**열릴 때 브라우저가 그리게** 한다. 생성기는 문자열 조립뿐이라 Node 만 있으면 돌고, 출력에
타임스탬프도 난수 id 도 없다 — 두 번 돌리면 바이트가 같다. `--check` 가 성립하는 근거다.

## 왜 mermaid 를 `_assets/` 로 빼는가

`mermaid.min.js` 는 3.4MB 다. 83개 페이지에 인라인하면 `docs/flow/html/**` 만 290MB 가 된다.
대신 **같은 트리 안의 사본 1부**(`docs/flow/html/_assets/mermaid.min.js`)를 고전 `<script src>` 로
부른다. `file://` 페이지에서 상대 경로 고전 스크립트 로드는 브라우저가 허용하므로(막히는 것은
fetch/XHR 과 ES module 이다) CDN·네트워크 의존 없이 디스크에서 그대로 열린다. 원문도 fetch 하지
않고 페이지 안(`<pre class="mermaid">`)에 심는 이유가 같다.

## 손대면 안 되는 것

- `docs/flow/mmd/**` — 정본. 이 도구는 읽기만 한다.
- `docs/flow/html/**` — 전부 산출물. 손으로 고치면 다음 렌더가 되돌린다(`.prettierignore` 에도 등록).
