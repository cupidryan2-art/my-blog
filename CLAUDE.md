# CLAUDE.md — Claude / 子 agent 工作规则

先读 `AGENTS.md`（硬性禁止、技术栈、SVG 规则）。本文件补充"怎么工作"的规则，来自一次多 agent 并行优化中真实出现的问题；两者冲突时以更严格的为准。

## 1. 声称"已修复 / 已验证"之前，必须跑 `scripts/verify.sh`

- 命令：`bash scripts/verify.sh`。它依次做：数据检查 → Pages 生产构建 → `check-site.rb` → htmlproofer → Vercel 构建与检查 → 浏览器 smoke。
- **新增文件必须先 `git add <路径>`**，否则不会进入验证快照（脚本只复制 tracked/staged 文件）。
- 回复里必须**原样附上** `==== VERIFY SUMMARY ====` 汇总表和最后的 `RESULT:` 行，不能只写"已通过"。
- `RESULT` 的含义：
  - `PASSED`（退出码 0）：全部步骤都跑了且通过。只有这时才能说"已验证"。
  - `FAILED`（1）：有步骤失败。先修，不要提交，也不要说"已修复"。
  - `INCOMPLETE`（2）：没失败，但有必需步骤在当前环境跑不了（如拦了 `cdn.jsdelivr.net`、没有浏览器）。**不得说"已验证"**，要如实写出哪一步没跑、为什么。
- 子 agent 的自述不算证据。主 agent 必须自己读 `git diff` 并跑 `verify.sh`，不能只转述子 agent 的报告。
- 例外：只改 `AGENTS.md`、`CLAUDE.md` 等不发布的文档可免跑，但要说明。
- 环境提示：本地构建需要 UTF-8 locale（脚本已自动设置）；gems 用 `Gemfile.lock` 锁定版本，需要时可设 `BUNDLE_PATH` 装到仓库外；不得改 `Gemfile` 增删 gem。

## 2. 未验证的假设必须标注"未验证"

- 凡是没有实际运行、没有读源码/文档核对过的结论，必须写"未验证"，并写明怎么验证。
- 第三方行为（Chirpy、jekyll-seo-tag、Vercel、GitHub Pages）要查对应**版本**的源码或文档，不凭记忆。本次教训：
  - 凭记忆写的 `_includes/head-custom.html` 在 Chirpy 7.5.0 里根本不会被引入，真正的钩子是 `metadata-hook.html`。
  - 根目录 `robots.txt` 会与主题自带的 `assets/robots.txt` 冲突；覆盖主题文件要用同路径（`assets/robots.txt`、`assets/404.html`）。
  - Chirpy 的 `refactor-content` 会把 `<img>` 包进 `<a class="img-link">` 并追加 `loading="lazy"`，不能依赖 `nextElementSibling` 之类的 DOM 邻接关系。
  - `compress_html` 的 `endings: all` 会去掉 `</head>` 等闭合标签，解析产物时别依赖它们。
  - 站内图片路径不要手写 baseurl（Chirpy 会补，手写会变成 `/my-blog/my-blog/`）。
- 区分"本站的问题"和"第三方/环境的问题"：`cdn.jsdelivr.net`、Twikoo、Google Fonts 的网络失败单独报告，不算本站失败，也不能被当作通过。

## 3. 改动前先说明会动哪些文件；并行任务不得改同一文件

- 动手前先列出将**修改 / 新增 / 删除**的文件。超出清单的文件，先说明再改。
- 并行任务由主 agent 先分配，**文件集合必须互不相交**。共享文件（如 `_sass/custom-style.scss`、`_config.yml`、`_includes/metadata-hook.html`）只能归一个任务，或者串行处理。
- 子 agent 只改自己被授权的文件；发现需要改别人的文件，就在报告里提出，不要自己动。
- 子 agent 不 `git commit` / `git push`，由主 agent 在审查后统一提交。
- 审查（reviewer）只读；它提出的问题由主 agent 修复，修完重新跑 `verify.sh`。

## 4. 不发布的文件

`AGENTS.md`、`CLAUDE.md`、`README.md`、`scripts/`、`.github/` 等不得出现在站点产物里。`CLAUDE.md` 已加入 `_config.yml` 的 `exclude`，并由 `scripts/check-site.rb` 守卫；新增类似文件时两处都要同步。
