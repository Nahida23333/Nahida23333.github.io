---
title: 生信小记：Seurat包的数据可视化方法
date: 2025-03-29 20:36:24
categories: 
    - 生信分析
tags: 
    - 生信分析
    - R语言
    - Seurat
cover:
    /images/Seurat.png
---

在这篇教程中，我们会沿用[上一篇教程](https://nahida23333.github.io/2025/03/28/%E7%94%9F%E4%BF%A1%E5%B0%8F%E8%AE%B0%EF%BC%9ASeurat%E7%9A%84%E5%B8%B8%E8%A7%81%E5%88%86%E6%9E%90%E5%B7%A5%E4%BD%9C%E6%B5%81%E7%A8%8B%EF%BC%9A%E4%BB%A5PBMC-3K%E6%95%B0%E6%8D%AE%E9%9B%86%E4%B8%BA%E4%BE%8B/)处理好的数据来进行演示。

先做一些前期准备，安装并加载好R包，下载并加载好数据（或者直接运用上一篇教程中处理好的数据）。

```
install.packages(c("Seurat","patchwork","ggplot2","SeuratData"))

#下载SeuratData包时报错显示：package ‘SeuratData’ is not available for this version of R
#根据网络上给出的解决措施，改用下面的方法下载该R包
install.packages("remotes")
remotes::install_github("satijalab/seurat-data")
#运行后在下方Console栏中输入1并回车

library(Seurat)
library(patchwork)
library(ggplot2)
library(SeuratData)
SeuratData::InstallData("pbmc3k")

pbmc3k.final <- LoadData("pbmc3k", type = "pbmc3k.final") #加载处理后的数据集
pbmc3k.final$groups <- sample(c("group1", "group2"), size = ncol(pbmc3k.final), replace = TRUE)
#将所有细胞随机分为两组，模拟实验中的不同处理条件
#nol()用于获取细胞的数量（列数）
#sample()函数用于生成随机的分组标签，replace=true表示可以重复分发分组标签
#这里的分组仅为方便教学使用，没有生物学意义
features <- c("LYZ", "CCL5", "IL32", "PTPRCAP", "FCGR3A", "PF4")
pbmc3k.final
```

- 运行结果
```
An object of class Seurat 
13714 features across 2638 samples within 1 assay 
Active assay: RNA (13714 features, 2000 variable features)
 3 layers present: data, counts, scale.data
 2 dimensional reductions calculated: pca, umap
```

# 五种可视化标志基因的方法
## 山脊图（Ridge Plots）
山脊图可以反映在细胞集群中，某个基因的大体表达分布。
```
RidgePlot(pbmc3k.final, features = features, ncol = 2)
#ncol为列数的意思，也就是设置生成的图为两列。
```
![](/images/visualization_practice/157cf1a2-de59-465c-9dea-714a3cc3e2fd.png)

## 小提琴图（Violin Plots）
意义同上。
```
VlnPlot(pbmc3k.final, features = features)
```
![](/images/visualization_practice/3d169070-49fd-4bb6-8124-1c111723f266.png)

## 特征图（Feature Plots）
可以在降维后的图象中展示不同基因的表达情况。
```
FeaturePlot(pbmc3k.final, features = features)
```
![](/images/visualization_practice/ace5bfaf-5879-451e-be32-01f2a30a3c3d.png)

## 点图（Dot Plots）
在点图中，点的大小表示在细胞集群中，表达某个基因的细胞所占比例；而点的颜色深浅则代表在细胞集群中，某个基因的平均表达水平。
```
DotPlot(pbmc3k.final, features = features) + RotatedAxis()
#RotatedAxis()可以使得坐标轴标签旋转一定角度，防止坐标轴上的标签出现重叠的情况。
```
![](/images/visualization_practice/b2255275-d454-4fd1-9a46-1bde52498b55.png)

## 热图（Heatmap）
```
DoHeatmap(subset(pbmc3k.final, downsample = 100), features = features, size = 3)
#subset()函数可以从每个细胞集群中选择100个细胞进行展示，避免图象过于密集难以阅读。
#选择细胞的数量可以通过downsample这一参数进行调整。
```
![](/images/visualization_practice/f3c11f22-549a-4df0-a52d-b928b9d73b38.png)

# 在特征图上玩点新花样

我们可以经验性地设定颜色最深或最浅所代表的基因表达水平。
```
FeaturePlot(pbmc3k.final, features = "MS4A1") + FeaturePlot(pbmc3k.final, features = "MS4A1", min.cutoff = 1, max.cutoff = 3)
#上图为原始图象，下图为调整后的图象。
```
![](/images/visualization_practice/f692a65d-9590-405f-87c6-55f4b02bef0e.png)

也可以让软件计算第10百分位数（q10）和第90百分位数（q90），以此作为颜色显示的基准。这种方法特别适用于需要处理多个基因的数据的时候。

```
FeaturePlot(pbmc3k.final, features = c("MS4A1", "PTPRCAP"), min.cutoff = "q10", max.cutoff = "q90")
```
![](/images/visualization_practice/a40937fa-6638-4b4e-8b4a-19ef92a8008f.png)

如果我们想探究两个基因的共表达情况，我们可以这么做：
```
FeaturePlot(pbmc3k.final, features = c("MS4A1", "CD79A"), blend = TRUE)
```
![](/images/visualization_practice/8321c02a-7ea6-4802-9a4b-38c79e7bed50.png)

在实际的生信分析中，我们经常会遇到分组的情况（可能是健康人和患者的分组，也有可能是不同程度患者的分组，也有可能是不同疾病患者的分组）。这个时候我们需要对比不同组的同一基因的表达情况，可以这么做：
```
FeaturePlot(pbmc3k.final, features = c("MS4A1", "CD79A"), split.by = "groups")
```
![](/images/visualization_practice/702d76fc-b3b3-45a2-b4e7-fac73e58df88.png)

然后我尝试了大杂烩（
```
FeaturePlot(pbmc3k.final, features = c("MS4A1", "PTPRCAP"), min.cutoff = "q10", max.cutoff = "q90", blend = TRUE, split.by = "groups")
```
![](/images/visualization_practice/39eada2a-347c-4f0b-a052-8d885d416dd6.png)

# 可视化的进阶玩法

除了基因的表达水平之外，小提琴图还能显示其他变量在不同细胞簇中的分布情况。例如，通过下列代码，我们可以显示两个组中不同细胞簇的线粒体基因比例。
```
VlnPlot(pbmc3k.final, features = "percent.mt", split.by = "groups")
```
![](/images/visualization_practice/6deafa51-c47a-4e7c-885e-6096dbbb072c.png)

点图也能分组！
```
DotPlot(pbmc3k.final, features = features, split.by = "groups") + RotatedAxis()
```
![](/images/visualization_practice/a337a8ac-3cfb-4f88-8fa2-f24252cee8b1.png)

`DimPlot()`函数可以用来展示UMAP、$t$-SNE和PCA降维结果，展示的优先级为UMAP＞$t$-SNE＞PCA。也就是在没有进行任何设置的情况下，该函数默认展示经UMAP降维后的图象。
```
DimPlot(pbmc3k.final)
```
![](/images/visualization_practice/07091029-3688-4fb1-9b99-4e7cd9b1d44c.png)

如果需要展示PCA降维后的数据，我们需要将原始数据集进行备份，然后在备份数据集上删除UMAP分析结果。（如果还进行了$t$-SNE分析，则还需要删除$t$-SNE分析结果，否则会有限展示$t$-SNE分析结果）。
```
pbmc3k.final.no.umap <- pbmc3k.final
pbmc3k.final.no.umap[["umap"]] <- NULL
DimPlot(pbmc3k.final.no.umap) + RotatedAxis()
#似乎可以直接用DimPlot(pbmc3k.final, reduction = "pca") + RotatedAxis()直接指定展示PCA降维结果
```
![](/images/visualization_practice/e6970ec3-ba32-4343-90df-0dbd40581cc0.png)

在热图中，默认按照细胞簇进行分群，如果需要按照其他标准分群，可以更改$group.by$的参数。
```
DoHeatmap(pbmc3k.final, features = VariableFeatures(pbmc3k.final)[1:100], cells = 1:500, size = 4, angle = 90) + NoLegend()
#NoLegend()即删除图例。
```
![](/images/visualization_practice/Rplot01.png)

# 根据实际需要对图象进行个性化设置
## 增加标题
```
baseplot <- DimPlot(pbmc3k.final, reduction = "umap")
baseplot + labs(title = "Clustering of 2,700 PBMCs")
```
![](/images/visualization_practice/0e471aad-fce4-4ae6-bbc0-f75e236a25bd.png)
## 更改主题（此处改为PowerPoint主题）
```
remotes::install_github('sjessa/ggmin') #因为不是自带的主题……所以需要安装所需要的扩张包
baseplot + ggmin::theme_powerpoint()
```
![](/images/visualization_practice/7f442361-3c33-4b01-92e2-1516c17a2549.png)

```
baseplot + DarkTheme() #黑色主题是自带的，无需ggmin
```
![](/images/visualization_practice/4e80e797-0e37-4d83-863c-907f9483487f.png)

## 使用`FontSize()`调整字体大小
```
baseplot + FontSize(x.title = 20, y.title = 20) + NoLegend()
```
![](/images/visualization_practice/e42826ec-b12a-4975-a0e2-ee5fb5a292fe.png)

# 交互式绘图
对于任何ggplot2生成的图象，可以利用`HoverLocator()`函数生成一个可交互的图象。以下面的代码为例，所生成的特征图允许我们查看每一个细胞的`ident`、`PC_1`和`nFeature_RNA`。
```
plot <- FeaturePlot(pbmc3k.final, features = "MS4A1") #生成特殊图
HoverLocator(plot = plot, information = FetchData(pbmc3k.final, vars = c("ident", "PC_1", "nFeature_RNA")))
#Seurat包中的HoverLocator()函数可以为我们提供可视化功能
#FetchData()函数可以抓取pbmc3k.fianl中“ident（所属细胞簇）”“PC_1（主成分1）”“nFeature_RNA（细胞内基因种类数）”
```
<iframe 
  src="/html/MS4A1_Interactive.html" 
  width="100%" 
  height="600"
  frameborder="0"
  scrolling="no">
</iframe>

在R中生成交互式图象之后，如何把交互式图象上传到自己的Hexo博客仍然是一个比较困难的问题。对于不使用Hexo博客记录自己学习过程的朋友，这个问题无关紧要，可以跳过。不过如果你对我如何解决这个问题感兴趣，欢迎点[这里](https://nahida23333.github.io/2025/03/30/%E7%94%9F%E4%BF%A1%E5%B0%8F%E8%AE%B0%EF%BC%9A%E5%B0%86%E4%BA%A4%E4%BA%92%E5%BC%8F%E5%9B%BE%E8%B1%A1%E4%B8%8A%E4%BC%A0%E5%88%B0%E8%87%AA%E5%B7%B1%E7%9A%84Hexo%E5%8D%9A%E5%AE%A2/)进一步了解！

Seurat包还提供了一种可交互的方式，允许我们手动选择部分细胞进行进一步的分析。
```
pbmc3k.final <- RenameIdents(pbmc3k.final, DC = "CD14+ Mono")
plot <- DimPlot(pbmc3k.final, reduction = "umap")
select.cells <- CellSelector(plot = plot)
#在运行上一行之后，可以在图像中选中所需要的细胞，并点击图象右上角的“Done”完成选中

head(select.cells) #展示选中的细胞
```
这里因为懒得搞gif，所以直接搬运了[官方教程](https://satijalab.org/seurat/articles/visualization_vignette#interactive-plotting-features)上的gif图：

![](https://satijalab.org/seurat/articles/assets/pbmc_select.gif)

- 运行结果
```
> head(select.cells)
[1] "AAGATTACCGCCTT" "AATTACGAATTCCT" "ACGTGATGCCATGA" "ATGTAAACGGGATG" "CATATAGACTAAGC"
[6] "TTCAGTTGTCCTTA"
```

选择需要的细胞之后，可以将这些细胞定义为“新细胞簇”，进行进一步的分析。
```
Idents(pbmc3k.final, cells = select.cells) <- "NewCells"
# 将选中的细胞定义为新细胞集群。
newcells.markers <- FindMarkers(pbmc3k.final, ident.1 = "NewCells", ident.2 = "CD14+ Mono", min.diff.pct = 0.3, only.pos = TRUE)
# 以CD14+ Monocyte为参照，寻找新细胞集群中的差异表达基因。
# min.diff.pct为表达比例差异过滤阈值，值越大筛选出的差异表达基因越少、“含金量”更高
head(newcells.markers)
```

- 运行结果
```
> head(newcells.markers)
              p_val avg_log2FC pct.1 pct.2    p_val_adj
PRR11  5.012606e-26   7.530865 0.333 0.002 6.874288e-22
PIGB   8.223491e-20   6.540514 0.333 0.004 1.127770e-15
FCER1A 1.045325e-19   3.461827 1.000 0.055 1.433559e-15
TEX10  6.752791e-16   5.820948 0.333 0.006 9.260778e-12
PXMP2  1.206141e-11   4.056272 0.500 0.024 1.654102e-07
SH3RF1 1.297326e-11   4.669408 0.333 0.010 1.779153e-07
```

利用`CellSelector()`函数，我们还可以将选中的细胞自动标记为新的细胞集群（这里标记为`Selected`）。
```
levels(pbmc3k.final)#标记前
pbmc3k.final <- CellSelector(plot = plot, object = pbmc3k.final, ident = "selected")
levels(pbmc3k.final)#标记后
```

- 运行结果：
```
> levels(pbmc3k.final)
[1] "NewCells"     "CD14+ Mono"   "Naive CD4 T"  "Memory CD4 T" "B"            "CD8 T"       
[7] "FCGR3A+ Mono" "NK"           "Platelet"    
> pbmc3k.final <- CellSelector(plot = plot, object = pbmc3k.final, ident = "selected")

Listening on http://127.0.0.1:7788
> levels(pbmc3k.final)
 [1] "selected"     "NewCells"     "CD14+ Mono"   "Naive CD4 T"  "Memory CD4 T" "B"           
 [7] "CD8 T"        "FCGR3A+ Mono" "NK"           "Platelet"  
```

# 给点图也加点新花样

## 利用`LabelClusters()`函数标注细胞集群

```
plot <- DimPlot(pbmc3k.final, reduction = "pca") + NoLegend()
LabelClusters(plot = plot, id = "ident")
```
![](/images/visualization_practice/fb29ffc4-fc17-461d-8847-19e3baeb1e41.png)

## 通过设置`repel`参数避免标签的重叠

TopCells函数可以找出识别对特定主成分（PC）贡献最大的细胞。换句话来说，在前面我们确定了每个细胞簇的特征基因表达模式（主成分）。TopCells()函数可以找出这些细胞簇中特征基因表达模式最极端的细胞。例如说我们确认某个基因表达的上调是某个细胞簇的特征，TopCell()函数就可以找出该基因表达上调得最多的几个细胞。
```
LabelPoints(plot = plot, points = TopCells(object = pbmc3k.final[["pca"]]), repel = TRUE)
```
![](/images/visualization_practice/1b85ef43-8bf9-47bf-92c7-460de63bd9ab.png)

## 利用简单的“相加”一次绘制多个图
```
plot1 <- DimPlot(pbmc3k.final)
plot2 <- FeatureScatter(pbmc3k.final, feature1 = "LYZ", feature2 = "CCL5") #绘制两个基因在所有细胞中的表达量相关性散点图
plot1 + plot2 #合并图象
```
![](/images/visualization_practice/fcf4fbfb-db07-4999-8791-a7c3ee4e3ed1.png)

# 完整代码

```
install.packages(c("Seurat","patchwork","ggplot2","SeuratData"))

#下载SeuratData包时报错显示：package ‘SeuratData’ is not available for this version of R
#根据网络上给出的解决措施，改用下面的方法下载该R包
install.packages("remotes")
remotes::install_github("satijalab/seurat-data")
#运行后在下方Console栏中输入1并回车

library(Seurat)
library(patchwork)
library(ggplot2)
library(SeuratData)
SeuratData::InstallData("pbmc3k")

pbmc3k.final <- LoadData("pbmc3k", type = "pbmc3k.final") #加载处理后的数据集
pbmc3k.final$groups <- sample(c("group1", "group2"), size = ncol(pbmc3k.final), replace = TRUE)
#将所有细胞随机分为两组，模拟实验中的不同处理条件
#nol()用于获取细胞的数量（列数）
#sample()函数用于生成随机的分组标签，replace=true表示可以重复分发分组标签
#这里的分组仅为方便教学使用，没有生物学意义
features <- c("LYZ", "CCL5", "IL32", "PTPRCAP", "FCGR3A", "PF4")
pbmc3k.final

RidgePlot(pbmc3k.final, features = features, ncol = 2)
#ncol为列数的意思，也就是设置生成的图为两列。

VlnPlot(pbmc3k.final, features = features)

FeaturePlot(pbmc3k.final, features = features)

DotPlot(pbmc3k.final, features = features) + RotatedAxis()
#RotatedAxis()可以使得坐标轴标签旋转一定角度，防止坐标轴上的标签出现重叠的情况。

DoHeatmap(subset(pbmc3k.final, downsample = 100), features = features, size = 3)
#subset()函数可以从每个细胞集群中选择100个细胞进行展示，避免图象过于密集难以阅读。
#选择细胞的数量可以通过downsample这一参数进行调整。

FeaturePlot(pbmc3k.final, features = "MS4A1") + FeaturePlot(pbmc3k.final, features = "MS4A1", min.cutoff = 1, max.cutoff = 3)
#上图为原始图象，下图为调整后的图象

FeaturePlot(pbmc3k.final, features = c("MS4A1", "PTPRCAP"), min.cutoff = "q10", max.cutoff = "q90")

FeaturePlot(pbmc3k.final, features = c("MS4A1", "CD79A"), blend = TRUE)

FeaturePlot(pbmc3k.final, features = c("MS4A1", "CD79A"), split.by = "groups")

FeaturePlot(pbmc3k.final, features = c("MS4A1", "PTPRCAP"), min.cutoff = "q10", max.cutoff = "q90", blend = TRUE, split.by = "groups")

VlnPlot(pbmc3k.final, features = "percent.mt", split.by = "groups")

DotPlot(pbmc3k.final, features = features, split.by = "groups") + RotatedAxis()

DimPlot(pbmc3k.final)

pbmc3k.final.no.umap <- pbmc3k.final
pbmc3k.final.no.umap[["umap"]] <- NULL
DimPlot(pbmc3k.final.no.umap)

DimPlot(pbmc3k.final,reduction = "pca")

DoHeatmap(pbmc3k.final, features = VariableFeatures(pbmc3k.final)[1:100], cells = 1:500, size = 4, angle = 90) + NoLegend()
#NoLegend()即删除图例。

baseplot <- DimPlot(pbmc3k.final, reduction = "umap")
baseplot + labs(title = "Clustering of 2,700 PBMCs")

remotes::install_github('sjessa/ggmin')
baseplot + ggmin::theme_powerpoint()

baseplot + DarkTheme()

baseplot + FontSize(x.title = 20, y.title = 20) + NoLegend()

plot <- FeaturePlot(pbmc3k.final, features = "MS4A1") #生成特殊图
HoverLocator(plot = plot, information = FetchData(pbmc3k.final, vars = c("ident", "PC_1", "nFeature_RNA")))
#Seurat包中的HoverLocator()函数可以为我们提供可视化功能
#FetchData()函数可以抓取pbmc3k.fianl中“ident（所属细胞簇）”“PC_1（主成分1）”“nFeature_RNA（细胞内该基因转录RNA数量）”

pbmc3k.final <- RenameIdents(pbmc3k.final, DC = "CD14+ Mono")
plot <- DimPlot(pbmc3k.final, reduction = "umap")
select.cells <- CellSelector(plot = plot)
#在运行上一行之后，可以在图像中选中所需要的细胞，并点击图象右上角的“Done”完成选中

head(select.cells) #展示选中的细胞

Idents(pbmc3k.final, cells = select.cells) <- "NewCells"
# 将选中的细胞定义为新细胞集群。
newcells.markers <- FindMarkers(pbmc3k.final, ident.1 = "NewCells", ident.2 = "CD14+ Mono", min.diff.pct = 0.3, only.pos = TRUE)
# 以CD14+ Monocyte为参照，寻找新细胞集群中的差异表达基因。
# min.diff.pct为表达比例差异过滤阈值，值越大筛选出的差异表达基因越少、“含金量”更高
head(newcells.markers)

levels(pbmc3k.final)#标记前
pbmc3k.final <- CellSelector(plot = plot, object = pbmc3k.final, ident = "selected")
levels(pbmc3k.final)#标记后

plot <- DimPlot(pbmc3k.final, reduction = "pca") + NoLegend()
LabelClusters(plot = plot, id = "ident")

LabelPoints(plot = plot, points = TopCells(object = pbmc3k.final[["pca"]]), repel = TRUE)

plot1 <- DimPlot(pbmc3k.final)
plot2 <- FeatureScatter(pbmc3k.final, feature1 = "LYZ", feature2 = "CCL5") #绘制两个基因在所有细胞中的表达量相关性散点图
plot1 + plot2 #合并图象
```



