---
title: "Pandas 入门：从零开始的数据处理"
date: 2026-03-25 10:00:00 +0800
categories: [Data Science, Python]
tags: [pandas, data-wrangling, tutorial]
---

## 为什么选择 Pandas

在数据科学的工作流中，数据清洗和预处理往往占据了 80% 的时间。Pandas 是 Python 生态中处理表格数据最强大的工具之一，它提供了高效、直观的 API 来完成这些任务。

## 基本数据结构

Pandas 有两个核心数据结构：

### Series

一维带标签的数组：

```python
import pandas as pd

s = pd.Series([1, 3, 5, 7], index=["a", "b", "c", "d"])
print(s)
```

### DataFrame

二维带标签的表格结构，也是最常用的：

```python
df = pd.DataFrame({
    "name": ["Alice", "Bob", "Charlie"],
    "age": [25, 30, 35],
    "city": ["Beijing", "Shanghai", "Guangzhou"]
})
```

## 常用操作

### 读取数据

```python
df = pd.read_csv("data.csv")
df = pd.read_excel("data.xlsx")
df = pd.read_json("data.json")
```

### 数据筛选

```python
# 条件筛选
df[df["age"] > 28]

# 多条件
df[(df["age"] > 25) & (df["city"] == "Beijing")]

# loc 和 iloc
df.loc[0:2, ["name", "age"]]
df.iloc[0:2, 0:2]
```

### 分组聚合

```python
df.groupby("city")["age"].mean()
df.groupby("city").agg({"age": ["mean", "max"], "name": "count"})
```

## 小结

Pandas 的学习曲线并不陡峭，但要用好它需要大量实践。建议从真实数据集开始练习，比如 Kaggle 上的入门数据集。

> 下一篇我们会聊聊如何用 Matplotlib 和 Seaborn 把数据可视化做得更好看。
