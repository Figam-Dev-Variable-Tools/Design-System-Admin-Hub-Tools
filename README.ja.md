<div align="center">

# Design-System-Admin-Hub-Tools

[KR](README.md) · [EN](README.en.md) · **JP** · [CN](README.zh.md)

韓国型 **B2C** / **B2C + Company** サービスの管理画面を全域でカバーするアドミンプラットフォーム<br />
Contract · Token の単一原点から **React · Storybook · Figma 四者 100% 同期**

</div>

---

## 背景

韓国の B2C サービスは、会社が違ってもアドミンの画面リストはほぼ同じだ。会員と権限、商品とカテゴリ、クーポン・ポイント、レビュー、交換・返品、予約・申込、カスタマーセンターのチケット、マーケティング配信、お知らせ・FAQ・利用規約。ここに会社紹介サイトが加わった瞬間（**B2C + Company**）、企業情報・沿革・認証書・ESG・パートナー・ポートフォリオ・成功事例、そして取引先・契約・見積・プロジェクトといった営業画面がそのまま付いてくる。

問題は、これらの画面がプロジェクトごとに最初から作り直されることだ。同じ一覧テーブルを、同じフィルターバーを、同じ削除確認ポップアップを — 毎回少しずつ違う形で。そうして作られたアドミンは、画面数が増えるほど互いに似なくなる。

このリポジトリは、その繰り返しを **一度** きちんと作り切って固定した成果物である。韓国型 B2C / B2C + Company が実際に必要とする管理画面の **全域** を単一のデザインシステム上で実装し、その一貫性を人のレビューではなく **パイプラインとゲートで** 強制する。

### 何をカバーするか

| ドメイン | 管理画面 |
| --- | --- |
| **ダッシュボード** | 指標サマリー · やること · 推移チャート |
| **会員 · 運用** | 会員 / 会員詳細 · 管理者 · 権限（ロール） · 顧客設定 · ログイン履歴 |
| **商品** (B2C) | 商品 · カテゴリ · クーポン · レビュー · 交換/返品 · 配送ポリシー · ポイントポリシー |
| **予約 · 申込** (B2C) | 予約 · 申込書 · 相談予約 · スケジュールカレンダー |
| **カスタマーセンター** (B2C) | チケット · 問い合わせ種別 · 返信テンプレート · FAQ キュレーション · 資料室 |
| **マーケティング** (B2C) | イベント · プロモーション · ニュースレター · SMS · メール · 配信テンプレート |
| **コンテンツ** (共通) | お知らせ · FAQ · ポップアップ · バナー · 利用規約 · プライバシーポリシー（バージョン履歴を含む） |
| **企業** (Company) | 会社情報 · CEO 挨拶 · アクセス · パートナー · 顧客企業 · 沿革 · 認証書 · ESG |
| **ポートフォリオ** (Company) | ポートフォリオ · カテゴリ · 成功事例 |
| **営業** (Company) | 取引先 · 契約 · 見積 · 問い合わせ · プロジェクト · 商談履歴 |

一覧/詳細/登録/編集が一式で揃っており、画面を構成するコンポーネントはすべて `@tds/ui` ひとつから出てくる — atoms 12 · molecules 21 · organisms 5、契約 **38 種**。

---

## クイックスタート

> 要件: **Node ≥ 20** · **pnpm 9.15**

```bash
pnpm install
pnpm codegen              # 契約/トークン → 型 · argTypes · figma.json · CSS を生成
pnpm gate:precheck        # 契約 + 命名 + 四者一致 + カバレッジ + クリーンコード (レビュー依頼前に必須)
pnpm dev:admin            # Admin アプリ
pnpm sb                   # Storybook (:6006)
```

---

## 仕様

画面は作る前に文書として固定される。`specs/` に **196 件** — 画面番号を軸に 3 種類が対をなし、文書は `specs/<セクション>/<下位>/` に画面ごとに置かれる（例: `specs/users/members/`）。

| 文書 | 件数 | 何を固定するか |
| --- | --- | --- |
| **FS** 機能仕様書 | **70**（`FS-001`~`FS-070`） | 画面の要素を全数ナンバリングする（`FS-001-EL-008`）。§4 例外仕様は 要素 × **7 軸**（空状態 · ローディング · 失敗 · バリデーション · 権限なし · 競合 · 大量）を**空欄なしで**埋める |
| **BE** バックエンド機能仕様書 | **70**（`BE-001`~`BE-070`） | エンドポイント · 共通エラーエンベロープ · 認証/権限モデル。§5 例外マトリクスは **9 軸**（400 検証 · 401 認証 · 403 vs 404 · 404 対象なし · 409 衝突 · 422 状態違反 · 429 過負荷 · 500 エラー · タイムアウト） |
| **NFR** 非機能仕様書 | **56**（`NFR-015`~`NFR-070`） | `quality-bar.md` の **P0 30 件をその画面に全数判定**する。`適用` 軸（`直接` / `継承` / `N/A`）で表面の実在をまず選り分け、性能予算 · 可用性 · データ保存を加える |

### 正本 — [`specs/quality-bar.md`](specs/quality-bar.md)

9 次元（STATE · TOKEN · COMP · FEEDBACK · A11Y · MOTION · IA · ERP · EXC） · 要求 **100 件**、うち **P0 30 件は全量充足が必須**だ。すべてのバッチがこの文書を acceptance criteria とする。NFR は要求の文言を再記述せず **ID でのみ参照**する — 正本は一箇所にだけ存在する。

### BE は「実装されたもの」ではなく「実装するもの」だ

**バックエンドはまだない。** `BE-*` はバックエンド開発者が実装する仕様であり、コードに埋めた `// TODO(backend)` を根拠に書かれた。**根拠となる FS 要素のないエンドポイントは作らない** — すべてのエンドポイントが自らの根拠 FS 要素番号を引用し、根拠のないものは §1「範囲外」に理由とともに残す。`openapi/openapi.yaml` も同じ性格だ — 文書であってサーバーではない。

---

## ゲート検査

### 検査が存在することと、検査が機能することは別だ

このリポで最も高い代償を払って学んだ原則である。**ゲートは後者だけを証拠として受け取る。**

実際に発見された **空虚な通過（vacuous pass）** 4 件 — すべて青信号を灯しており、すべて何も保証していなかった。

| 何が | どう嘘をついたか | 処理 |
| --- | --- | --- |
| `pnpm test` | `--passWithNoTests` → **テスト 0 件で青信号** | フラグを除去 — 現在テスト **152 件** |
| Storybook play function **62 件** | `expect` **0 個** · スパイ **0 個** → **失敗し得ない検査** | 断言を注入 |
| `bundle-size` CI job | dist なしで青信号 | 蘇生させず **除去** → 実際に測れるようになってから **復元**し `verify:all`(`perf:gate`) に編入（[ADR-0009](docs/adr/0009-ci-and-code-quality-gates.md)） |
| `tools/vrt` | 基準画像 0 件 → 「比較 0 件中 失敗 0 件 → **PASS**」 | 前提がなければ `NOT_VERIFIED`（exit 2） — 基準画像 **501 件**を登録し、実際にピクセルを比較する |

**空集合の上で真な命題は何も証明しない。** 測定不能は通過ではない — 前提がなければツールは青信号の代わりに `NOT_VERIFIED` を出す。

### コマンド

```bash
pnpm validate:contracts   # 契約スキーマ検証
pnpm contract-test        # 四者一致
pnpm coverage:check       # 契約 states · blockedWhen · FS 例外軸 (行 % ではない)
pnpm quality:check        # クリーンコード 6 軸 (blocker 1 件 → PR 遮断)
pnpm naming:check         # 命名規則
pnpm lint && pnpm format:check
pnpm test                 # 断言のあるテストだけをテストとして数える
pnpm verify:all           # 上記すべて + codegen 再現性 + tsc --noEmit + バンドル予算
pnpm verify:full          # verify:all + E2E
```

---

## リポジトリ構造

プロダクト表面は以下のとおりだ — リポジトリのすべてのトップレベルディレクトリを列挙したものではない。

```
├── contracts/              コンポーネント契約 38 種(SSOT) + schemas/
├── tokens/                 tokens.json (W3C DTCG, 3 階層)
├── packages/ui/            @tds/ui — atoms/molecules/organisms/templates · foundations/ · generated/(修正禁止)
├── apps/admin/             React Admin アプリ
├── specs/                  画面仕様 196 件 — FS-*(要素の全数ナンバリング + 例外 7 軸) · BE-*(例外 9 軸) · NFR-*(P0 30 全数判定) · quality-bar.md
├── openapi/                OpenAPI 3.1 スキーマ (ドキュメント — サーバーではない)
├── e2e/                    Playwright シナリオ (テスト名が FS 要素番号を引用)
├── tools/
│   ├── codegen/            契約/トークン → 4 箇所への生成パイプライン
│   ├── contract-test/      四者一致検証
│   ├── test-coverage/      契約 states · blockedWhen · FS 例外軸カバレッジ (行 % ではない)
│   ├── code-quality/       クリーンコード 6 軸 (結合·漏洩·重複·複雑度·デッドコード·レイヤー)
│   ├── vrt/                Visual Regression (基準画像 501 件)
│   ├── drift/              Design Drift 監視
│   ├── a11y/               アクセシビリティ監査
│   ├── perf/               パフォーマンス予算監査
│   ├── reuse-guard/        重複コンポーネント遮断
│   ├── naming-guard/       命名規則の強制
│   └── figma-plugin/       Contract/Token → Figma 自動生成
├── docs/
│   ├── adr/                アーキテクチャ決定記録 (0001~0010)
│   ├── architecture/       フロントエンド規約 · 監査記録
│   ├── plan/               計画文書
│   ├── figma/              Figma スペックミラー + レビュー
│   ├── tds/                デザインシステム文書
│   └── _templates/         標準文書 + ゲートチェックリスト
└── reports/                検証成果物 (ゲート入力 — 機械生成、フォーマッター除外)
```

pnpm workspace: `packages/*` · `apps/*` · `tools/*` · `e2e`。

---

## ライブラリ仕様

選定基準はひとつだ — **自作しない。** 標準がある問題（フォーム状態、サーバーキャッシュ、スキーマ検証、ルーティング）は実績あるライブラリを使い、このリポはその上に載る **契約 · トークン · ゲート** だけを固有に保つ。

### ランタイム — `apps/admin`

| ライブラリ | バージョン | 役割 | 選定理由 |
| --- | --- | --- | --- |
| `react` · `react-dom` | ^18.3 | UI レンダリング | 並行レンダー · エコシステム |
| `react-router-dom` | ^6.28 | ルーティング | ルート配列が [App.tsx](apps/admin/src/App.tsx) の単一原点 — サイドバーのデッドリンクをコードが検出 |
| `@tanstack/react-query` | ^5.101 | サーバー状態 (取得 · キャッシュ · 無効化) | `data-source` アダプターの背後の fixture を包む。バックエンドが繋がっても画面コードはそのまま |
| `zustand` | ^5.0 | クライアントグローバル状態 | ボイラープレートのない最小ストア — サーバー状態は Query が引き受けるので範囲が狭い |
| `react-hook-form` | ^7.81 | フォーム状態 | 非制御ベース、大型フォームで再レンダー最小 |
| `zod` | ^4.4 | スキーマ検証 | RHF resolver + ランタイム境界検証。型はスキーマから推論 |
| `axios` | ^1.18 | HTTP クライアント（インスタンス + インターセプター） | 実際のネットワーク呼び出しは **0 件**だ — `adapter` 拡張点に fixture を挿し、**インターセプターに荷重をかけている**。スキャフォールドのまま置けば死んだコードになる。バックエンドが繋がる日に `adapter` の 1 行だけを消す |

### デザインシステム — `packages/ui`

| ライブラリ | バージョン | 役割 | 選定理由 |
| --- | --- | --- | --- |
| `@radix-ui/react-dialog` | 1.1.19 | `Modal` · `ConfirmDialog` のフォーカストラップ · スクロールロック | 手書きのフォーカストラップが実在の欠陥 3 件を生んだ。ダイアログのアクセシビリティは自作する問題ではない |
| `@tiptap/*`（`core` · `react` · `pm` · `starter-kit` · `extension-image`） | 3.28.0 | `RichTextField` のエディタコア | ProseMirror ベース — 文書モデルが DOM ではなくスキーマだ |
| `dompurify` | 3.4.12 | エディタ HTML のサニタイズ | XSS 境界。自作しない |

| ツール | バージョン | 役割 |
| --- | --- | --- |
| `storybook` · `@storybook/react-vite` | ^8.6 | コンポーネント文書 · 状態カタログ (レビューゲートの証拠) |
| `@storybook/addon-interactions` · `@storybook/test` | ^8.6 | play function — **断言があってはじめて検査として数える** |
| `@storybook/addon-a11y` | ^8.6 | ストーリー単位のアクセシビリティ検査 |
| `@storybook/addon-essentials` | ^8.6 | controls · viewport · docs |

デザイン値はライブラリではなく [tokens/tokens.json](tokens/tokens.json) — **W3C DTCG** フォーマット、3 階層（primitive → semantic → component）、light/dark モードは `$extensions['tds.modes']` に記録する。

### ビルド · 型

| ツール | バージョン | 役割 |
| --- | --- | --- |
| `vite` | ^5.4 | 開発サーバー · バンドル (Storybook builder 共有) |
| `typescript` | ^5.6 | `strict` · `pnpm -r exec tsc --noEmit` が `verify:all` に含まれる |
| `pnpm` | 9.15 | workspace · `workspace:*` 内部リンク |
| `node` | ≥ 20 | `engines` で固定 |
| `openapi-typescript` | ^7.13 | `openapi.yaml` → 型。アダプター境界の双方向コンパイル検証用 (**サーバーではない**) |

### 品質

| ツール | バージョン | 役割 |
| --- | --- | --- |
| `vitest` · `jsdom` | ^2.1 · ^25 | ユニット/コンポーネントテスト (`--passWithNoTests` **禁止**) |
| `@testing-library/react` · `user-event` · `jest-dom` | ^16 · ^14 · ^6 | 実装ではなくユーザー視点で検査 |
| `@playwright/test` | 1.61.1 | E2E — テスト名が `FS-NNN` 要素番号を引用 |
| `eslint` (flat) · `typescript-eslint` | ^9.17 · ^8.18 | Lint 基盤 |
| `eslint-plugin-react` · `react-hooks` · `jsx-a11y` · `import-x` | — | アクセシビリティ · フックルール · deep import 遮断 |
| `eslint-config-prettier` | ^10.1 | フォーマット規則の衝突除去 |
| `prettier` | ^3.9 | フォーマット (`format:check` がゲート) |
| `husky` | ^9.1 | コミットフック |

Lint にはこのリポ固有のカスタムルールが載っている — **ハードコード hex/px 禁止**（`no-restricted-syntax`）、**`@tds/ui` deep import 禁止**（`no-restricted-imports`）。ルールではなくビルドが止める。
