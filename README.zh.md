<div align="center">

# Design-System-Admin-Hub-Tools

[KR](README.md) · [EN](README.en.md) · [JP](README.ja.md) · **CN**

全域覆盖韩式 **B2C** / **B2C + Company** 服务管理后台的 Admin 平台<br />
从 Contract · Token 单一源头出发，**React · Storybook · Figma 四方 100% 同步**

</div>

---

## 背景

韩国的 B2C 服务，即便公司不同，后台的画面清单也几乎一致。会员与权限、商品与分类、优惠券·积分、评价、换货·退货、预约·申请、客服工单、营销投放、公告·FAQ·条款。而一旦挂上公司介绍站点（**B2C + Company**），企业信息·发展历程·认证证书·ESG·合作伙伴·作品集·成功案例，以及客户·合同·报价·项目这类销售画面便会原样跟来。

问题在于：这些画面每个项目都要从零重做一遍。同样的列表表格、同样的筛选栏、同样的删除确认弹窗——每次都略有出入。这样堆出来的后台，画面越多，彼此越不相像。

本仓库正是把这种重复**一次性**做对并固化下来的产物。它在同一套设计系统之上实现韩式 B2C / B2C + Company 真正需要的管理画面**全域**，并且不靠人工检查、而是靠**流水线与门禁**来强制这份一致性。

### 覆盖什么

| 领域 | 管理画面 |
| --- | --- |
| **仪表盘** | 指标摘要 · 待办 · 趋势图表 |
| **会员 · 运营** | 会员 / 会员详情 · 管理员 · 权限(角色) · 客户设置 · 登录历史 |
| **商品** (B2C) | 商品 · 分类 · 优惠券 · 评价 · 换货/退货 · 配送政策 · 积分政策 |
| **预约 · 申请** (B2C) | 预约 · 申请单 · 咨询预约 · 日程日历 |
| **客服中心** (B2C) | 工单 · 咨询类型 · 回复模板 · FAQ 策展 · 资料库 |
| **营销** (B2C) | 活动 · 促销 · 电子报 · SMS · 邮件 · 投放模板 |
| **内容** (通用) | 公告 · FAQ · 弹窗 · 横幅 · 服务条款 · 隐私政策 (含版本历史) |
| **企业** (Company) | 公司信息 · CEO 致辞 · 交通指引 · 合作伙伴 · 客户单位 · 发展历程 · 认证证书 · ESG |
| **作品集** (Company) | 作品集 · 分类 · 成功案例 |
| **销售** (Company) | 客户 · 合同 · 报价 · 咨询 · 项目 · 洽谈历史 |

列表/详情/新建/编辑成套配齐，填充画面的组件全部出自 `@tds/ui` 这一个来源 —— atoms 12 · molecules 21 · organisms 5，契约 **38 种**。

---

## 快速开始

> 要求：**Node ≥ 20** · **pnpm 9.15**

```bash
pnpm install
pnpm codegen              # 契约/Token → 生成类型 · argTypes · figma.json · CSS
pnpm gate:precheck        # 契约 + 所有权 + 命名 + 四方一致 (提交评审前必做)
pnpm dev:admin            # Admin 应用
pnpm sb                   # Storybook (:6006)
```

---

## 规格

画面在动手做之前先以文档固定下来。`specs/` 中共 **196 件** —— 以画面编号为轴，三类文档成对存在，按画面放置于 `specs/<板块>/<子项>/`（例如 `specs/users/members/`）。

| 文档 | 件数 | 固定了什么 |
| --- | --- | --- |
| **FS** 功能规格书 | **70**（`FS-001`~`FS-070`） | 对画面元素全量编号（`FS-001-EL-008`）。§4 异常规格把 元素 × **7 轴**（空状态 · 加载 · 失败 · 校验 · 无权限 · 竞争 · 批量）**不留空格地**填满 |
| **BE** 后端功能规格书 | **70**（`BE-001`~`BE-070`） | 端点 · 通用错误信封 · 认证/权限模型。§5 异常矩阵覆盖 **9 轴**（400 校验 · 401 认证 · 403 vs 404 · 404 对象不存在 · 409 冲突 · 422 状态违规 · 429 过载 · 500 错误 · 超时） |
| **NFR** 非功能规格书 | **56**（`NFR-015`~`NFR-070`） | 把 `quality-bar.md` 的 **P0 30 件对该画面全量裁定**。先用 `适用` 轴（`直接` / `继承` / `N/A`）筛出该表面是否真实存在，再补上性能预算 · 可用性 · 数据留存 |

### 正本 —— [`specs/quality-bar.md`](specs/quality-bar.md)

9 个维度（STATE · TOKEN · COMP · FEEDBACK · A11Y · MOTION · IA · ERP · EXC） · 需求 **100 件**，其中 **P0 30 件必须全量满足**。每个批次都以本文档作为 acceptance criteria。NFR 不复述需求文字，**只按 ID 引用** —— 正本只存在于一处。

### BE 不是"已经实现的"，而是"将要实现的"

**后端尚不存在。** `BE-*` 是给后端开发者实现的规格，依据是代码中埋下的 `// TODO(backend)` 接缝。**没有 FS 元素作依据的端点一律不造** —— 每个端点都引用作为自身依据的 FS 元素编号，没有依据的则连同理由留在 §1「范围之外」。`openapi/openapi.yaml` 也是同样的性质 —— 是文档，不是服务端。

---

## 门禁检查

### 检查存在，不等于检查在起作用

这是本仓库付出最贵代价学到的原则。**门禁只接受后者作为证据。**

实际发现的 **空洞通过(vacuous pass)** 4 例 —— 全都亮着绿灯，全都什么也没保证。

| 什么 | 怎么撒的谎 | 处理 |
| --- | --- | --- |
| `pnpm test` | `--passWithNoTests` → **测试 0 件也亮绿灯** | 移除该 flag —— 现有测试 **152 件** |
| Storybook play function **62 件** | `expect` **0 个** · spy **0 个** → **不可能失败的检查** | 注入断言 |
| `bundle-size` CI job | 没有 dist 也亮绿灯 | 不复活而是先**移除** → 等到真的能测量之后再**恢复**，并纳入 `verify:all`(`perf:gate`) ([ADR-0009](docs/adr/0009-ci-and-code-quality-gates.md)) |
| `tools/vrt` | 基准图 0 张 → 「0 次比较中 0 次失败 → **PASS**」 | 前提缺失时 `NOT_VERIFIED` (exit 2) —— 已登记 **501 张**基准图，现在真的在比对像素 |

**在空集上为真的命题什么也证明不了。** 无法测量不等于通过 —— 前提不存在时，工具给出的不是绿灯，而是 `NOT_VERIFIED`。

### 命令

```bash
pnpm validate:contracts   # 契约 Schema 验证
pnpm boundary:check       # 所有权边界 (与 CODEOWNERS 同一规则)
pnpm contract-test        # 四方一致
pnpm coverage:check       # 契约 states · blockedWhen · FS 异常轴 (并非行覆盖率 %)
pnpm quality:check        # 整洁代码 6 轴 (blocker 1 件 → 阻断 PR)
pnpm naming:check         # 命名规则
pnpm lint && pnpm format:check
pnpm test                 # 只有带断言的测试才算测试
pnpm verify:all           # 以上全部 + codegen 可复现性 + tsc --noEmit + 包体积预算
pnpm verify:full          # verify:all + E2E
```

---

## 仓库结构

产品表面如下 —— 这不是仓库全部顶层目录的完整列举。

```
├── contracts/              组件契约 38 种(SSOT) + schemas/
├── tokens/                 tokens.json (W3C DTCG, 3 层)
├── packages/ui/            @tds/ui — atoms/molecules/organisms/templates · foundations/ · generated/(禁止修改)
├── apps/admin/             React Admin 应用
├── specs/                  画面规格 196 件 — FS-*(元素全量编号 + 异常 7 轴) · BE-*(异常 9 轴) · NFR-*(P0 30 全量裁定) · quality-bar.md
├── openapi/                OpenAPI 3.1 Schema (文档 — 不是服务端)
├── e2e/                    Playwright 场景 (测试名引用 FS 元素编号)
├── tools/
│   ├── codegen/            契约/Token → 四处生成流水线
│   ├── boundary/           生成 CODEOWNERS + 所有权/reads 作用域检查
│   ├── contract-test/      四方一致验证
│   ├── test-coverage/      契约 states · blockedWhen · FS 异常轴覆盖 (并非行覆盖率 %)
│   ├── code-quality/       整洁代码 6 轴 (耦合·泄漏·重复·复杂度·死代码·分层)
│   ├── vrt/                Visual Regression (基准图 501 张)
│   ├── drift/              Design Drift 监控
│   ├── a11y/               无障碍审计
│   ├── perf/               性能预算审计
│   ├── reuse-guard/        阻断重复组件
│   ├── naming-guard/       强制命名规则
│   └── figma-plugin/       Contract/Token → Figma 自动生成
├── docs/
│   ├── adr/                架构决策记录 (0001~0010)
│   ├── architecture/       前端规约 · 审计记录
│   ├── plan/               计划文档
│   ├── figma/              Figma 规格镜像 + 检查
│   ├── tds/                设计系统文档
│   └── _templates/         标准文档 + 门禁检查清单
└── reports/                验证产物 (门禁输入 — 机器生成，排除格式化)
```

pnpm workspace：`packages/*` · `apps/*` · `tools/*` · `e2e`。

---

## 库清单

选型标准只有一条 —— **不自己造。** 已有标准答案的问题(表单状态、服务端缓存、Schema 验证、路由)一律用经过验证的库，本仓库只把叠在其上的**契约 · Token · 门禁**保持为自有部分。

### 运行时 —— `apps/admin`

| 库 | 版本 | 职责 | 选型理由 |
| --- | --- | --- | --- |
| `react` · `react-dom` | ^18.3 | UI 渲染 | 并发渲染 · 生态 |
| `react-router-dom` | ^6.28 | 路由 | 路由数组是 [App.tsx](apps/admin/src/App.tsx) 的单一源头 —— 侧边栏死链由代码检出 |
| `@tanstack/react-query` | ^5.101 | 服务端状态 (查询 · 缓存 · 失效) | 包裹 `data-source` 适配器背后的 fixture。后端接上后画面代码原样不动 |
| `zustand` | ^5.0 | 客户端全局状态 | 无样板代码的极小 store —— 服务端状态由 Query 接管，因此作用域很窄 |
| `react-hook-form` | ^7.81 | 表单状态 | 基于非受控，大型表单下重渲染最少 |
| `zod` | ^4.4 | Schema 验证 | RHF resolver + 运行时边界验证。类型从 Schema 推导 |
| `axios` | ^1.18 | HTTP 客户端 (实例 + 拦截器) | 真实网络调用 **0 次** —— 把 fixture 插进 `adapter` 扩展点，让**拦截器真正承载负荷**。若留作脚手架就成了死代码。后端接上那天，只删掉 `adapter` 那一行 |

### 设计系统 —— `packages/ui`

| 库 | 版本 | 职责 | 选型理由 |
| --- | --- | --- | --- |
| `@radix-ui/react-dialog` | 1.1.19 | `Modal` · `ConfirmDialog` 的焦点陷阱 · 滚动锁 | 手写焦点陷阱产生过 3 个真实缺陷。对话框的无障碍不是该自己造的问题 |
| `@tiptap/*`（`core` · `react` · `pm` · `starter-kit` · `extension-image`） | 3.28.0 | `RichTextField` 的编辑器内核 | 基于 ProseMirror —— 文档模型是 Schema 而非 DOM |
| `dompurify` | 3.4.12 | 编辑器 HTML 消毒 | XSS 边界。不自己造 |

| 工具 | 版本 | 职责 |
| --- | --- | --- |
| `storybook` · `@storybook/react-vite` | ^8.6 | 组件文档 · 状态目录 (评审门禁的证据) |
| `@storybook/addon-interactions` · `@storybook/test` | ^8.6 | play function —— **有断言才算检查** |
| `@storybook/addon-a11y` | ^8.6 | 故事粒度的无障碍检查 |
| `@storybook/addon-essentials` | ^8.6 | controls · viewport · docs |

设计值不来自库，而来自 [tokens/tokens.json](tokens/tokens.json) —— **W3C DTCG** 格式，3 层(primitive → semantic → component)，light/dark 模式记录在 `$extensions['tds.modes']` 中。

### 构建 · 类型

| 工具 | 版本 | 职责 |
| --- | --- | --- |
| `vite` | ^5.4 | 开发服务器 · 打包 (与 Storybook builder 共用) |
| `typescript` | ^5.6 | `strict` · `pnpm -r exec tsc --noEmit` 已纳入 `verify:all` |
| `pnpm` | 9.15 | workspace · `workspace:*` 内部链接 |
| `node` | ≥ 20 | 由 `engines` 锁定 |
| `openapi-typescript` | ^7.13 | `openapi.yaml` → 类型。用于适配器边界的双向编译验证 (**不是服务端**) |

### 质量

| 工具 | 版本 | 职责 |
| --- | --- | --- |
| `vitest` · `jsdom` | ^2.1 · ^25 | 单元/组件测试 (**禁止** `--passWithNoTests`) |
| `@testing-library/react` · `user-event` · `jest-dom` | ^16 · ^14 · ^6 | 以用户视角而非实现细节来检查 |
| `@playwright/test` | 1.61.1 | E2E —— 测试名引用 `FS-NNN` 元素编号 |
| `eslint` (flat) · `typescript-eslint` | ^9.17 · ^8.18 | lint 基座 |
| `eslint-plugin-react` · `react-hooks` · `jsx-a11y` · `import-x` | — | 无障碍 · Hook 规则 · 阻断 deep import |
| `eslint-config-prettier` | ^10.1 | 消除格式规则冲突 |
| `prettier` | ^3.9 | 格式化 (`format:check` 即门禁) |
| `husky` | ^9.1 | 提交钩子 |

lint 之上还叠了本仓库特有的自定义规则 —— **禁止硬编码 hex/px**(`no-restricted-syntax`)、**禁止 `@tds/ui` deep import**(`no-restricted-imports`)。拦你的不是规矩，是构建。
