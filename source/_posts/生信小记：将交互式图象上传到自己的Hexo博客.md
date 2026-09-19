---
title: 生信小记：将交互式图象上传到自己的Hexo博客
date: 2025-03-30 15:50:28
categories: 
    - 生信分析
tags: 
    - 生信分析
    - R语言
    - Hexo博客
---

在[上一篇教程](https://nahida23333.github.io/2025/03/29/%E7%94%9F%E4%BF%A1%E5%B0%8F%E8%AE%B0%EF%BC%9ASeurat%E5%8C%85%E7%9A%84%E6%95%B0%E6%8D%AE%E5%8F%AF%E8%A7%86%E5%8C%96%E6%96%B9%E6%B3%95/)中，我们生成了一个可交互的图象。在本篇教程中将会介绍如何将此类可交互图象上传至自己的Hexo博客。

# 以`.html`格式导出交互式图象

在R中运行以下代码，图象会以'.html'格式默认保存在R项目文件夹中。

```
# 安装必要包
if (!require("plotly")) install.packages("plotly")
if (!require("htmlwidgets")) install.packages("htmlwidgets")

library(plotly)
library(htmlwidgets)

# 一次性获取所有需要的数据
meta_data <- FetchData(pbmc3k.final, vars = c("ident", "PC_1", "nFeature_RNA"))

# 转换为plotly对象时直接绑定数据
interactive_plot <- plotly::ggplotly(
  plot + 
    aes(text = paste(
      "Ident:", meta_data$ident, "\n",
      "PC1:", round(meta_data$PC_1, 2), "\n",
      "Genes:", meta_data$nFeature_RNA
    )),
  tooltip = "text"
)

# 保存交互式图表
htmlwidgets::saveWidget(
  widget = interactive_plot,
  file = "MS4A1_Interactive.html",
  title = "MS4A1 Expression Interactive Plot"
)
```

# 在`hexo/source`文件夹中新建`html`文件夹

就像新建`images`文件夹来存储博客中的图片一样，我们可以新建`html`文件夹用来存储上述`.html`格式的交互式图象。

新建好文件夹之后，记得将R项目文件夹中的`MS4A1_Interactive.html`拷贝至`html`文件夹内。

# 修改根目录`.config.yml`配置文件

用记事本打开`hexo`根目录下的`config.yml`文件，将下面这段：

```
# Directory
source_dir: source
public_dir: public
tag_dir: tags
archive_dir: archives
category_dir: categories
code_dir: downloads/code
i18n_dir: :lang
skip_render:
```

修改为：

```
# Directory
source_dir: source
public_dir: public
tag_dir: tags
archive_dir: archives
category_dir: categories
code_dir: downloads/code
i18n_dir: :lang
skip_render:
  - "html/**"  # 跳过渲染指定目录
```

这是因为Hexo默认会使用Nunjucks模板引擎处理所有HTML文件。而Plotly生成的HTML文件中包含类似`{{……}}`的JavaScript模板语法，这会被Nunjucks误认为是模板变量，导致解析失败。（看不懂没关系，改掉就可以）

# 在博客文章`.md`文件中插入交互式图象

在文章中需要的地方插入下列`html`代码：

```
<iframe 
  src="/html/MS4A1_Interactive.html" 
  width="100%" 
  height="600"
  frameborder="0"
  scrolling="no">
</iframe>
```

在这之后，hexo三连（`hexo clean`、`hexo g`、`hexo d`）就可以啦！

<iframe 
  src="/html/MS4A1_Interactive.html" 
  width="100%" 
  height="600"
  frameborder="0"
  scrolling="no">
</iframe>