---
title: "用 Jekyll + GitHub Pages 搭建个人博客"
date: 2026-03-28 14:00:00 +0800
categories: [Tools, Blog]
tags: [jekyll, github-pages, tutorial]
---

## 为什么选择 Jekyll

静态博客生成器有很多选择：Hugo、Hexo、Gatsby……但 Jekyll 有一个独特的优势：它是 GitHub Pages 的原生支持方案，配置简单，部署零成本。

## 技术栈

这个博客使用的技术栈：

| 组件 | 选择 |
|------|------|
| 静态生成器 | Jekyll |
| 主题 | Chirpy（定制） |
| 部署 | GitHub Pages + Actions |
| 评论 | 暂未启用 |

## 搭建过程

### 1. 初始化项目

基于 Chirpy 主题的 starter 模板创建仓库，然后根据需要修改配置：

```yaml
title: Qlog
tagline: "Data Science · XMUM"
```

### 2. 风格定制

Chirpy 本身已经是一个很优秀的主题，但我希望更简洁一些：

- **配色**：黑白灰为主，辅以低饱和度蓝色作为点缀
- **字体**：无衬线字体，干净利落
- **布局**：大量留白，减少视觉噪音

### 3. 部署

通过 GitHub Actions 自动构建和部署：

```yaml
on:
  push:
    branches: ["main"]
```

每次 push 到 main 分支，Actions 会自动构建 Jekyll 站点并部署到 GitHub Pages。

## 写作流程

写一篇新文章只需要：

1. 在 `_posts/` 目录下创建 Markdown 文件
2. 文件名格式：`YYYY-MM-DD-title.md`
3. 添加 front matter（标题、分类、标签）
4. 写内容，push

就是这么简单。

## 总结

一个好的博客系统应该让你专注于写作本身，而不是折腾工具。Jekyll + Chirpy + GitHub Pages 的组合恰好做到了这一点。
