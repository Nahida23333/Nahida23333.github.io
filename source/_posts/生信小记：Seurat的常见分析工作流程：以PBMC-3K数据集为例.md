---
title: 生信小记：Seurat的常见分析工作流程：以PBMC_3K数据集为例
date: 2025-03-28 10:02:28
categories: 
    - 生信分析
tags: 
    - 生信分析
    - R语言
    - Seurat
cover:
    /images/Seurat.png
---
# 更新日志
## 2025/4/26
1. 更正了“确认数据集维度”中，对肘部图意义解释的错误。
2. 修改了“执行非线性降维”引语中，对于PCA降维不足之处的表述。
3. 在“创建Seurat对象”中，新增对于读入文件的解释。
4. 修正了一些排版错误。

------------

在网上找了好几篇Seurat包的教程发现对新手都不太友好……遂自己写了一篇……

# 创建Seurat对象

我们将对10X Genomics免费提供的PBMC数据集进行分析，包括2700个由Illumina NextSeq测序平台测序的单细胞。我们的原始数据包括3个文件：`barcodes.tsv`、`genes.tsv`、`matrix.mtx`。分别用于存储每个单细胞的细胞条形码、基因的标识符和名称、存储基因表达数据。

## 数据的读取
`Read10X()`函数可以从10X cellranger pipeline的输出中读取数据，并形成一个唯一的分子识别（UMI）计数矩阵。矩阵中的每个值代表所测序的每个细胞中的每个特征（如基因）。对于h5文件格式的文件，可以用`Read10X_h5()`读取。 

> 10X Cell Ranger Pipeline 是 10X Genomics 公司开发的一套标准化生物信息分析工具，专门用于处理其单细胞测序平台（如 Chromium）生成的数据。它的核心功能是将原始的测序数据（fastq 文件）转化为可用于下游分析的基因表达矩阵。

> 分子识别（UMI）计数矩阵：在PCR扩增中，同一mRNA分子经PCR扩增后，会产生多个重度的测序片段，如不加干预会导致测得的mRNA表达量偏高。为了避免这种情况，我们在逆转录生成cDNA时会在每个mRNA分子上加上唯一的UMI序列和细胞Barcode（细胞条形码）。这时同一个mRNA经扩增后产生的多个重复序列的UMI完全相同，在数据分析时可以借此消除扩增重复而产生的偏差。

```
#install.packages("dplyr")
#install.packages("Seurat")
#install.packages("patchwork")
#安装R包的过程，如已安装可省略

library(dplyr)
library(Seurat)
library(patchwork)

pbmc.data <- Read10X(data.dir = "C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/filtered_gene_bc_matrices/hg19")

```

## Seurat对象的创建
在这一步中，我们将创建一个Seurat对象，用于储存我们读入的原始数据和分析结果（如PCA或聚类结果）。

```
pbmc <- CreateSeuratObject(counts = pbmc.data, project = "pbmc3k", min.cells = 3,min.features = 200)
pbmc
```

- 输出结果
```
> pbmc <- CreateSeuratObject(counts = pbmc.data, project = "pbmc3k", min.cells = 3,min.features = 200)
Warning: Feature names cannot have underscores ('_'), replacing with dashes ('-')
> pbmc
An object of class Seurat 
13714 features across 2700 samples within 1 assay 
Active assay: RNA (13714 features, 0 variable features)
 1 layer present: counts
```

# 标准预处理工作流程

## 质量控制（QC）和选择细胞进行进一步分析

单细胞测序计数高度复杂，在测序过程中，细胞死亡或破裂、空微珠（未捕获细胞的微珠，仅包括少量环境RNA）、双胞体或多胞体（两个或多个细胞被包裹到同一微滴中）、环境RNA污染等，都会为测序引入噪声和偏差。因此，我们需要对原始数据进行质量控制（QC）。

常用的质量控制指标包括：

- 细胞独特基因数量：低质量细胞中表达的基因数量很少，空微珠仅有少数环境RNA污染，因此检测到的基因数量偏低。同时，双胞体或多胞体中，单个微珠中包含了两个及两个以上的细胞，因此检测到的基因数量会偏高。
- 细胞内分子总数：细胞内分子总数和细胞独特基因数量密切相关，因此也可以借此筛除不合格的数据。
- 线粒体基因比例：即线粒体基因UMI占总UMI的比例。在死亡或破裂的细胞中，线粒体RNA泄露而更容易被捕获，其线粒体基因比例偏高；而在空微珠中，仅有少量污染的环境RNA，因此其线粒体基因比例偏低。

在这里，我们采用上述指标作为QC指标。其中，我们以“MT-”开头的所有基因的集合作为一组线粒体基因，利用`PercentageFeatureSet()`函数计算线粒体基因比例。然后，我们将QC指标进行可视化，借此筛选细胞。

```
#计算线粒体基因比例
pbmc[["percent.mt"]] <- PercentageFeatureSet(pbmc, pattern = "^MT-")
#可视化，自左向右为细胞独特基因数量、细胞内分子总数和线粒体基因比例。
VlnPlot(pbmc, features = c("nFeature_RNA", "nCount_RNA", "percent.mt"), ncol =3)
```
![](/images/PBMC3k/5d17b893-835a-45ef-977c-b9314b586731.png)

接下来，我们利用`FeatureScatter()`函数，生成并组合nCount_RNA和percent.mt，nCount_RNA和nFeature_RNA的散点图，有利于我们从多维视角，更精准地识别低质量细胞并确定合理的过滤标准。

| 模式特征 | 可能原因 |
| :----------: | :----------: |
| 低nCount_RNA和高percent.mt | 细胞破裂或死亡 |
| 高nCount_RNA和高nFeature_RNA | 双胞体或多胞体 |
| 低nCount_RNA和低nFeature_RNA | 空微珠或环境RNA污染 |

```
plot1 <- FeatureScatter(pbmc, feature1 = "nCount_RNA", feature2 = "percent.mt")
plot2 <- FeatureScatter(pbmc, feature1 = "nCount_RNA", feature2 = "nFeature_RNA")
plot1 + plot2
```
![](/images/PBMC3k/350f9624-71bf-4a93-8e1b-a7dfcdd544fd.png)

最后，我们根据下述标准，过滤低质量细胞。
- 基因数量（特征计数）超过2500或少于200。
- 线粒体计数大于5%。

```
pbmc <- subset(pbmc, subset = nFeature_RNA > 200 & nFeature_RNA < 2500 & percent.mt < 5)
```

# 数据标准化
由于测序技术的缺陷，每个细胞测序深度的差异难以保证完全相同。测序深度高的细胞所检测到的总UMI数（可以理解为总mRNA数）偏多，而测序深度浅的细胞所检测到的总UMI数偏少，而这种差异往往会掩盖真正的生物学表达差异。为了消除这种技术性偏差，一般情况下我们会使用一种全局缩放标准化方法"LogNormalize"（先叫它“对数标准化法”叭），该方法的原理是：将每个细胞的基因表达值除以该细胞基因的总表达量，再乘以缩放因子数（一般为10000），最后对结果进行对数转换得到标准化的表达量。

```
pbmc <- NormalizeData(pbmc, normalization.method = "LogNormalize", scale.factor = 10000)
#pbmc <- NormalizeData(pbmc) #简写版
```

对数标准化法通过消除细胞间总UMI数的差异，消除了测序深浅对分析结果造成的偏差。然而，细胞间总UMI数的差异并不一定（或者说并不全是）由测序深度的差异造成的，也有可能是细胞间“天然”的表达量差异。而忽略这种“天然”差异、一刀切地消除细胞间总UMI数的差异，也会对分析结果造成影响，产生偏差。为了更精准地分离上述偏差，可以使用Seurat包中的“SCTransform”法进行数据标准化，在本文不进一步展开。

# 识别高变基因
高变基因（Highly Variable Genes，HVGs）是指不同细胞之间表达差异显著的一类基因（这里需要和高表达基因作区分，高变基因侧重于“方差大”，而高表达基因则侧重于“均值大”）。鉴定高变基因有利于更加突出单细胞数据集中的生物信号。

在进行筛选之前，我们需要先理顺在前面步骤已经处理的和尚未处理的偏差。在质量控制这一步中，我们清除了低质量细胞，排除了破裂或死亡细胞、双胞体/多胞体等不合格细胞的影响；在数据标准化这一步中，我们消除了技术限制所带来的不同细胞间总UMI数的差异。尽管如此，由于技术限制，我们很难保证在单个细胞内不同mRNA均得到了同等水平的扩增，这也会对分析产生影响，尤其对于低表达基因，测序技术的偏差往往远大于其真实表达水平的差异。而对于中高表达基因，其真实表达水平的差异往往会远大于测序技术所带来的偏差，此时后者可以忽略。因此我们需要在消除上述技术偏差的前提下筛选高变基因。常用的方法有vst法、mean.var.plot法、dispersion法等，它们都是基于均值-方差关系（即表达量-表达差异关系）进行筛选的方法。此处选择vst法进行筛选。

```
pbmc <- FindVariableFeatures(pbmc, selection.method = "vst", nfeatures = 2000)
top10 <- head(VariableFeatures(pbmc), 10) #确定前10个高变基因

#可视化
plot1 <- VariableFeaturePlot(pbmc)
plot2 <- LabelPoints(plot = plot1, points = top10, repel = TRUE)
plot1 + plot2 #在运行这一步之前建议将右下角的plots窗口调至最大，否则很容易报错……也可以用ggsave()函数保存后打开查看
```

![](/images/PBMC3k/66818c4a-912c-4649-b4ab-6b7cde29a739.png)

# 数据缩放（Z-score标准化）
为了理解数据缩放的必要性，首先我们需要对PCA降维算法具有一些初步了解。

在测序之后，我们可以得到一组有n个基因表达水平的信息，这些基因之间相互影响，而我们需要找出这些基因之间的相互关系，确定不同细胞基因表达模式的不同。如果只有2个基因，我们会考虑使用一个二维的坐标系来表示不同的细胞，x轴、y轴分别表示两个基因的表达水平，而坐标系中的每个点则代表每一个细胞。如果两个点的距离越近，则说明这两个细胞的基因表达模式更加相近，两个细胞越有可能是同一种类的细胞（这时的图像比较直观）；如果有3个基因，那么就可以用三维的坐标系（还能用）；但测序结果中往往有许许多多个基因，这时候很难以图像的形式直观反映（许许多多维的图……怎么想都想不出来叭）。这时候我们需要对数据进行降维，去繁化简，将高维数据的特征反映在低维的图像上，从而为分析带来便利。

PCA算法的作用在于将一个$n$维的数据降低至$k$维的数据（$n＞k$），使得数据更加直观化。这$k$维中的每一维，我们称为主成分（PC），其反映了最能区分不同种类细胞的最主要差异（可以理解为，最能区分不同种类细胞的基因表达模式）。举个通俗的例子来说，一个城市的经济水平可以通过GDP、人均收入、消费水平、三大产业的比例等等许多指标反映（$n$维），这时候如果我们需要比较$m$个城市的经济水平，那我们手头上就有一个$n×m$的表格，一眼望过去难以直观对比不同城市的发展情况。通过PCA降维分析，我们总结出了几个最关键的因素：整体经济规模（对应GDP、人均收入、消费水平）、产业结构差异（对应三大产业分别的占比），等等等等（$k$维）。这一些我们总结出来的“最关键因素”也就是主成分。通过这种降维操作，我们将一个$n×m$的表格简化成为一个$n×k$的表格，比较起来就相对简单多了。我们将其对应至单细胞测序分析中，“城市经济水平”即对应“细胞基因表达模式”，“GDP、人均收入、消费水平、三大产业的比例”即对应“各个基因的表达水平”，“整体经济规模”“产业结构差异”则对应不同的基因表达水平的特定组合，这一组合可以反映不同细胞的总体基因表达模式的重要特征。

PCA的原理在此处不详细展开，但其核心为**协方差**的计算，这是我们现在需要关注的部分。协方差反映两个或多个因素之间的关联强度，简化版的协方差的计算公式为： $\text{Cov}(X,Y)=\frac{1}{n-1}\sum_{i=1}^{n}(x_i-\bar{X})(y_i-\bar{Y})$ 。在一个细胞中，不同基因的表达水平的数量级可能存在巨大差异，而这种数量级差异会对分析结果造成巨大影响。

举例来说，假设我们现在有`X`、`Y`两个基因的表达水平信息，如下：
| 基因`X` | 基因`Y` |
| :----------: | :----------: |
| 5 | 15 |
| 10 | 30 |
| 15 | 45 |

不难看出，两个基因的表达量呈完全正相关关系，此时直接计算两个基因之间的协方差，结果为25。

如果拿到的`X`、`Y`两个基因的表达水平信息如下：
| 基因`X` | 基因`Y` |
| :----------: | :----------: |
| 5 | 100 |
| 10 | 200 |
| 15 | 300 |

此时两个基因的表达水平仍然呈正相关关系，但如果直接计算两个基因之间的协方差，结果为500。

由上可见，两种情况中两个基因的关联强度都是一样强的（完全正相关）。但由于第二种情况中`Y`基因表达水平的数量级远远大于第一种情况，协方差的计算结果也出现了巨大的差异。这时如果直接进行比较，反而会得到“第二种情况中两种基因的关联强度远远大于第一种情况”的错误结论。因此，为了纠正这种情况，我们需要将数据“缩放”至同一数量级，在此基础上再进行降维分析。

Z-score标准化可以消除这种差异，其可以将每个变量的数据转换为均值为0、标准差为1的分布：$z=\frac{x-μ}{σ}$，其中$μ$为变量的均值，$σ$为变量的标准差。对上述两种情况的数据进行标准化之后，其结果一致如下：
| 基因`X`（标准化后） | 基因`Y`（标准化后） |
| :----------: | :----------: |
| -1 | -1 |
| 0 | 0 |
| 1 | 1 |

此时计算两个基因之间的协方差，结果均为1，表明它们具有相同的相关性模式。（有没有发现，标准化后的协方差其实就等于原始数据的相关系数！）

在Seurat包中，`ScaleData()`函数可以实现对数据的Z-score标准化，即①使每个基因的表达值偏倚，使得细胞间的平均表达为0；②对每个基因的表达值进行缩放，使得细胞间的方差为1。借此可以在保留协方差（即不同基因表达量之间的关系）的同时，将不同数量级表达水平的基因转化到同一水平，从而消除高表达基因的主导作用。

```
all.genes <- rownames(pbmc)
pbmc <- ScaleData(pbmc, features = all.genes)
```

# 执行线性降维
接下来，我们会对缩放后的数据进行PCA分析。默认情况下只会输入先前确定的HVGs，如需选择不同的子集，可以使用argument进行定义。

对于PCA分析的结果，Seurat包提供了多种可视化的方式，包括`VizDimReduction()`、`DimPlot()`和`DimHeatmap()`等。

```
pbmc <- RunPCA(pbmc, features = VariableFeatures(object = pbmc))
#检验并可视化PCA
print(pbmc[["pca"]], dims = 1:5, nfeatures = 5)
```
- 运行结果
```
> pbmc <- RunPCA(pbmc, features = VariableFeatures(object = pbmc))
PC_ 1 
Positive:  CST3, TYROBP, LST1, AIF1, FTL, FTH1, LYZ, FCN1, S100A9, TYMP 
	   FCER1G, CFD, LGALS1, S100A8, CTSS, LGALS2, SERPINA1, IFITM3, SPI1, CFP 
	   PSAP, IFI30, SAT1, COTL1, S100A11, NPC2, GRN, LGALS3, GSTP1, PYCARD 
Negative:  MALAT1, LTB, IL32, IL7R, CD2, B2M, ACAP1, CD27, STK17A, CTSW 
	   CD247, GIMAP5, AQP3, CCL5, SELL, TRAF3IP3, GZMA, MAL, CST7, ITM2A 
	   MYC, GIMAP7, HOPX, BEX2, LDLRAP1, GZMK, ETS1, ZAP70, TNFAIP8, RIC3 
PC_ 2 
Positive:  CD79A, MS4A1, TCL1A, HLA-DQA1, HLA-DQB1, HLA-DRA, LINC00926, CD79B, HLA-DRB1, CD74 
	   HLA-DMA, HLA-DPB1, HLA-DQA2, CD37, HLA-DRB5, HLA-DMB, HLA-DPA1, FCRLA, HVCN1, LTB 
	   BLNK, P2RX5, IGLL5, IRF8, SWAP70, ARHGAP24, FCGR2B, SMIM14, PPP1R14A, C16orf74 
Negative:  NKG7, PRF1, CST7, GZMB, GZMA, FGFBP2, CTSW, GNLY, B2M, SPON2 
	   CCL4, GZMH, FCGR3A, CCL5, CD247, XCL2, CLIC3, AKR1C3, SRGN, HOPX 
	   TTC38, APMAP, CTSC, S100A4, IGFBP7, ANXA1, ID2, IL32, XCL1, RHOC 
PC_ 3 
Positive:  HLA-DQA1, CD79A, CD79B, HLA-DQB1, HLA-DPB1, HLA-DPA1, CD74, MS4A1, HLA-DRB1, HLA-DRA 
	   HLA-DRB5, HLA-DQA2, TCL1A, LINC00926, HLA-DMB, HLA-DMA, CD37, HVCN1, FCRLA, IRF8 
	   PLAC8, BLNK, MALAT1, SMIM14, PLD4, P2RX5, IGLL5, LAT2, SWAP70, FCGR2B 
Negative:  PPBP, PF4, SDPR, SPARC, GNG11, NRGN, GP9, RGS18, TUBB1, CLU 
	   HIST1H2AC, AP001189.4, ITGA2B, CD9, TMEM40, PTCRA, CA2, ACRBP, MMD, TREML1 
	   NGFRAP1, F13A1, SEPT5, RUFY1, TSC22D1, MPP1, CMTM5, RP11-367G6.3, MYL9, GP1BA 
PC_ 4 
Positive:  HLA-DQA1, CD79B, CD79A, MS4A1, HLA-DQB1, CD74, HIST1H2AC, HLA-DPB1, PF4, SDPR 
	   TCL1A, HLA-DRB1, HLA-DPA1, HLA-DQA2, PPBP, HLA-DRA, LINC00926, GNG11, SPARC, HLA-DRB5 
	   GP9, AP001189.4, CA2, PTCRA, CD9, NRGN, RGS18, CLU, TUBB1, GZMB 
Negative:  VIM, IL7R, S100A6, IL32, S100A8, S100A4, GIMAP7, S100A10, S100A9, MAL 
	   AQP3, CD2, CD14, FYB, LGALS2, GIMAP4, ANXA1, CD27, FCN1, RBP7 
	   LYZ, S100A11, GIMAP5, MS4A6A, S100A12, FOLR3, TRABD2A, AIF1, IL8, IFI6 
PC_ 5 
Positive:  GZMB, NKG7, S100A8, FGFBP2, GNLY, CCL4, CST7, PRF1, GZMA, SPON2 
	   GZMH, S100A9, LGALS2, CCL3, CTSW, XCL2, CD14, CLIC3, S100A12, RBP7 
	   CCL5, MS4A6A, GSTP1, FOLR3, IGFBP7, TYROBP, TTC38, AKR1C3, XCL1, HOPX 
Negative:  LTB, IL7R, CKB, VIM, MS4A7, AQP3, CYTIP, RP11-290F20.3, SIGLEC10, HMOX1 
	   LILRB2, PTGES3, MAL, CD27, HN1, CD2, GDI2, CORO1B, ANXA5, TUBA1B 
	   FAM110A, ATP1A1, TRADD, PPA1, CCDC109B, ABRACL, CTD-2006K23.1, WARS, VMO1, FYB 
```

```
> #可视化PCA
> print(pbmc[["pca"]], dims = 1:5, nfeatures = 5)
PC_ 1 
Positive:  CST3, TYROBP, LST1, AIF1, FTL 
Negative:  MALAT1, LTB, IL32, IL7R, CD2 
PC_ 2 
Positive:  CD79A, MS4A1, TCL1A, HLA-DQA1, HLA-DQB1 
Negative:  NKG7, PRF1, CST7, GZMB, GZMA 
PC_ 3 
Positive:  HLA-DQA1, CD79A, CD79B, HLA-DQB1, HLA-DPB1 
Negative:  PPBP, PF4, SDPR, SPARC, GNG11 
PC_ 4 
Positive:  HLA-DQA1, CD79B, CD79A, MS4A1, HLA-DQB1 
Negative:  VIM, IL7R, S100A6, IL32, S100A8 
PC_ 5 
Positive:  GZMB, NKG7, S100A8, FGFBP2, GNLY 
Negative:  LTB, IL7R, CKB, VIM, MS4A7 
```

运用`VimDimLoadings()`进行可视化：
```
VizDimLoadings(pbmc, dims = 1:2, reduction = "pca")
```
![](/images/PBMC3k/63d37bf9-d9db-46fa-8ff1-2c982bbbab4d.png)

运用`DimPlot()`进行可视化：
```
DimPlot(pbmc, reduction = "pca") + NoLegend()
```
![](/images/PBMC3k/7e4ef846-01f8-4e06-aa11-3f2cd283937e.png)

运用`DimHeatmap()`进行可视化：
```
DimHeatmap(pbmc, dims = 1, cells = 500, balanced = TRUE)
```
![](/images/PBMC3k/5b8b49e9-3e72-488f-8997-9d43bfd0a338.png)
```
DimHeatmap(pbmc, dims = 1:15, cells = 500, balanced = TRUE)
```
![](/images/PBMC3k/e8dd52c6-b107-482d-a672-d553cecb4f17.png)

# 确认数据集的维度
在上一步中，我们通过PCA降维算法得到了若干个主成分。但如果我们选择全部的主成分进行下一步分析，一方面会导致计算量增大，不利于大数据集的分析；另一方面会导致过度细分细胞簇，不够直观。但反之，如果我们选择的主成分过少，则会导致细胞分簇的精度下降，不足以体现出不同种类细胞的生物学差异。因此，我们需要平衡二者，选择一个适当的主成分数量进行进一步分型。

肘部图可以通过计算并比较在选择不同数量的主成分进行聚类分簇后，每个细胞距离其所属簇中心的距离平方和（有资料称其为惯性、SSE），来确定选择主成分最佳数量。SSE数值越大，说明拟合的精度越低；反之亦然。

[//]: 前面我们提到，PCA算法的作用就是将一个$n$维的数据降维为一个$k$维的数据（$n＞k$）。在这一步中，我们的任务是确认$k$的值，也就是确认降维后数据的维度。在上一步中，我们通过PCA降维算法得到了若干个主成分。但每个主成分的重要程度并不一致，有些主成分的影响力显著，也有一些主成分的影响微乎其微。继续沿用上面的例子来说，我们在分析城市经济水平的时候，通过降维总结出了若干能反映城市经济水平的因素。但通过降维算法总结出的这些因素里面，除了“整体经济规模”“产业结构差异”这些影响力巨大的因素之外，还有“居民饮食结构”这些相对没有那么重要的因素。在分析的时候，显然我们需要抓主要矛盾，而搁置次要矛盾，否则的话我们永远无法找到问题的关键。

[//]: 如何确定哪些主成分的影响力巨大，必须重点考虑；哪些主成分的影响力偏弱，可以暂时搁置？我们可以先把不同的主成分的影响力用图像直观表示出来看看。

```
ElbowPlot(pbmc)
```
![](/images/PBMC3k/e628012a-65b9-4a83-bb9a-3f23d5647188.png)

[//]: 我们得到的图很像一个平放在桌面上的手臂，其中中间的几个点和手肘很类似，因此我们习惯将这种图称为“肘部图”（好像也有人叫“碎石图”，不过我还是觉得“肘部图”比较形象）。不难看出，在主成分9~10之后的主成分，其影响力比较小，因此我们可以将其暂时排除，只考虑前面的主成分。在这里，我们选择前十个主成分进行进一步分析。

通过上图我们不难看出，选择的主成分数量小于10之前，随着主成分数量的增加，SSE下降的非常快，说明精度随主成分数量的增加而迅速提升；但当选择的主成分数量超过10，SSE的下降速度反而变缓，说明性价比下降。因此，选择10个左右的主成分进行下一步分析比较适合。

值得一提的是，除了肘部图之外，我们还可以利用`JackStrawPlot()`函数对主成分进行筛选。但对于较大的数据集，其计算过程往往需要很长时间，因此肘部图仍然是最效率的选择。（为了得到下面这个图，我的电脑跑了三分钟，而肘部图几乎秒出……）

```
pbmc <- JackStraw(pbmc, num.replicate = 100)
pbmc <- ScoreJackStraw(pbmc, dims = 1:20)
JackStrawPlot(pbmc, dims = 1:15)
```
![](/images/PBMC3k/fff0fb76-be33-4e56-900c-05018665cfaf.png)

# 细胞聚类

在上面几步中，我们确认了不同细胞集群基因表达模式的主要变异方向，将$n×m$的表格降维到了$n×k$的表格。但是，我们还没有对降维后的数据进行分析，还没有确认“哪些细胞属于哪一类”。在这一步中，我们将会将降维后的数据划分为若干组（簇），每组代表一种潜在的细胞类型或状态，也就是细胞聚类。

细胞聚类分为领域图构建和聚类两步，前者通常用KNN算法（$K$-Nearest Neighbors）进行；而聚类则有多种方法，Seurat包中默认使用Louvain算法。大致原理如下：
- KNN算法（$K$-Nearest Neighbors）：通过测量降维后数据中每个细胞间的距离，找到距离每个细胞最近的$K$个细胞（这时我们称这些细胞为“邻居”），借此可以构建一个邻域图（其实就是一个拓扑图）。
- Louvain算法：在通过KNN算法构建领域图的基础上，根据细胞距离的远近将所有划分为不同的“社区（community）”（即不同的细胞集群）。

```
pbmc <- FindNeighbors(pbmc, dims = 1:10) #KNN算法
pbmc <- FindClusters(pbmc, resolution = 0.5) #Louvain算法
head(Idents(pbmc), 5) #了解前5个细胞分别属于哪些集群
```

- 运行结果：
```
> pbmc <- FindNeighbors(pbmc, dims = 1:10)
Computing nearest neighbor graph
Computing SNN
> pbmc <- FindClusters(pbmc, resolution = 0.5)
Modularity Optimizer version 1.3.0 by Ludo Waltman and Nees Jan van Eck

Number of nodes: 2638	
Number of edges: 95927	

Running Louvain algorithm...
0%   10   20   30   40   50   60   70   80   90   100%
[----|----|----|----|----|----|----|----|----|----|
**************************************************|
Maximum modularity in 10 random starts: 0.8728
Number of communities: 9
Elapsed time: 0 seconds
> head(Idents(pbmc), 5)
AAACATACAACCAC-1 AAACATTGAGCTAC-1 AAACATTGATCAGC-1 AAACCGTGCTTCCG-1 AAACCGTGTATGCG-1 
               2                3                2                1                6 
Levels: 0 1 2 3 4 5 6 7 8
```

# 执行非线性降维（UMAP/$t$-SNE）

PCA降维可以对细胞进行初步分群，但其分群还不够精确直观。PCA没有很直观的可视化方法将不同细胞簇很好地分开来。以下图为例，我们只能选取两个主成分进行可视化，但就像简单粗暴地把一个纸团拍扁，尽管保留了整体的轮廓，但有可能因为纸团在压缩过程中发生重叠，丢失了哪一边是顶部、哪一边是底部的信息。因此为了更好地鉴别各个细胞群，我们需要更加精细地处理这些数据。
![](/images/PBMC3k/25e225b7-051f-44c7-b2b2-2f9d688d9954.png)

在未经处理的高维数据中，我们想象用一个点来代表一个细胞。在高维空间中，同一种类细胞所代表的点之间的距离就会更近；非同类细胞之间的距离将会更远。依此原理，我们可以通过计算两两细胞间的距离，并根据点与点之间的距离生成一个二维图像。在高维空间中距离相近的两个点，在二维图像中距离也拉近；而在高维空间中距离较远的两个点，在二维图像中距离也会拉远，这就可以更好地反映出不同细胞群的区别。这就是UMAP和$t$-SNE算法的基本原理。

UMAP算法和$t$-SNE算法的思路总体相同，但存在一些细节上的差异。$t$-SNE算法会计算所有点与点之间的距离，并将其转化为$t$分布，结果就是在高维数据中两个距离较近的点，在降维后的数据中距离将会更近；而在高维数据中两个距离较远的点，在降维后的数据中距离也将拉远，会更有利于不同细胞集群的区分；而UMAP算法则只会计算距离某个点最近的$k$个点的距离（很像KNN算法），并且也不会对计算得到的距离进行$t$分布转化，因此通过UMAP算法降维后的图中，两点间距离会更有可比性。

此处以UMAP算法为例进行降维：
```
pbmc <- RunUMAP(pbmc, dims = 1:10)
DimPlot(pbmc, reduction = "umap")
```
![](/images/PBMC3k/5ed1c3ce-8162-464f-99ab-d1944882c09a.png)

此时可以用下面的代码保存该结果，在需要时不需要重新运行上面的计算（计算量太大了……）。
```
#检查output目录是否存在，若不存在则创建
if (!dir.exists("C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output")) {
  dir.create("C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output")
}
#保存
saveRDS(pbmc, file = "C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/pbmc_tutorial.rds")

#重新加载
library(Seurat) #加载Seurat包
pbmc_restored <- readRDS("C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/pbmc_tutorial.rds") #读取RDS文件
DimPlot(pbmc_restored, reduction = "umap") 
```
# 鉴定差异表达基因（DEGs）
Seurat包可以通过差异表达分析寻找不同细胞簇之间的表达基因，默认情况下其将会寻找所有上调和下调的基因。`FindAllMarkers()`函数会对所有细胞集群自动进行差异表达分析，我们也可以利用`FindMarkers()`函数对特定的细胞集群寻找。

```
cluster2.markers <- FindMarkers(pbmc, ident.1 = 2) #和其他所有细胞簇进行对比，寻找细胞簇2的差异表达基因
head(cluster2.markers, n = 5) #查看前5个差异表达基因
```
- 运行结果
```
> head(cluster2.markers, n = 5)
            p_val avg_log2FC pct.1 pct.2    p_val_adj
IL32 2.892340e-90  1.3070772 0.947 0.465 3.966555e-86
LTB  1.060121e-86  1.3312674 0.981 0.643 1.453850e-82
CD3D 8.794641e-71  1.0597620 0.922 0.432 1.206097e-66
IL7R 3.516098e-68  1.4377848 0.750 0.326 4.821977e-64
LDHB 1.642480e-67  0.9911924 0.954 0.614 2.252497e-63
```
- 结果解读：
	- p_val：原始p值（未校正的多重假设检验结果）
	- avg_log2FC：目标细胞簇与其他细胞簇的平均log2倍变化（正值表示上调）
	- pct.1：目标细胞簇中表达该基因的细胞比例
	- pct.2：其他细胞簇中表达该基因的细胞比例
	- p_val_adj：（利用Bonferroni或BH方法）校正后的p值


```
cluster5.markers <- FindMarkers(pbmc, ident.1 = 5, ident.2 = c(0, 3)) #和细胞簇0和细胞簇3对比，寻找细胞簇5的差异基因
head(cluster5.markers, n = 5) #查看前5个差异基因
```
- 运行结果
```
> head(cluster5.markers, n = 5)
                      p_val avg_log2FC pct.1 pct.2     p_val_adj
FCGR3A        8.246578e-205   6.794969 0.975 0.040 1.130936e-200
IFITM3        1.677613e-195   6.192558 0.975 0.049 2.300678e-191
CFD           2.401156e-193   6.015172 0.938 0.038 3.292945e-189
CD68          2.900384e-191   5.530330 0.926 0.035 3.977587e-187
RP11-290F20.3 2.513244e-186   6.297999 0.840 0.017 3.446663e-182
```


```
#和其他细胞簇对比，寻找每一个细胞簇的标志基因（设置仅寻找上调基因）
pbmc.markers <- FindAllMarkers(pbmc, only.pos = TRUE) #留意only.pos = TRUE，默认情况下上调基因和下调基因都会找出来，需要只寻找上调基因的时候需要特别设置
pbmc.markers %>%
  group_by(cluster) %>% #不同的细胞簇分组列出
  dplyr::filter(avg_log2FC > 1) #进一步筛选高变基因
```
- 运行结果
```
> pbmc.markers %>%
+   group_by(cluster) %>%
+   dplyr::filter(avg_log2FC > 1)
# A tibble: 7,019 × 7
# Groups:   cluster [9]
       p_val avg_log2FC pct.1 pct.2 p_val_adj cluster gene     
       <dbl>      <dbl> <dbl> <dbl>     <dbl> <fct>   <chr>    
 1 3.75e-112       1.21 0.912 0.592 5.14e-108 0       LDHB     
 2 9.57e- 88       2.40 0.447 0.108 1.31e- 83 0       CCR7     
 3 1.15e- 76       1.06 0.845 0.406 1.58e- 72 0       CD3D     
 4 1.12e- 54       1.04 0.731 0.4   1.54e- 50 0       CD3E     
 5 1.35e- 51       2.14 0.342 0.103 1.86e- 47 0       LEF1     
 6 1.94e- 47       1.20 0.629 0.359 2.66e- 43 0       NOSIP    
 7 2.81e- 44       1.53 0.443 0.185 3.85e- 40 0       PIK3IP1  
 8 6.27e- 43       1.99 0.33  0.112 8.60e- 39 0       PRKCQ-AS1
 9 1.16e- 40       2.70 0.2   0.04  1.59e- 36 0       FHIT     
10 1.34e- 34       1.96 0.268 0.087 1.84e- 30 0       MAL      
# ℹ 7,009 more rows
# ℹ Use `print(n = ...)` to see more rows
```

利用ROC检验，可以筛选出有统计学意义且生物学意义显著的差异表达基因。
```
cluster0.markers <- FindMarkers(pbmc, ident.1 = 0, logfc.threshold = 0.25, test.use = "roc", only.pos = TRUE)
#和其他细胞簇对比，寻找细胞簇0的标志基因（设置仅寻找上调基因）
#要求基因在细胞簇0中的表达量（log2倍数变化）至少比对照组高0.25
#使用ROC检验，返回值为1则代表该基因可以完美区分细胞簇0和其他细胞簇；返回值为0则代表该基因完全不能区分
```

我们可以用`VinPlot()`函数和`FeaturePlot()`函数来使得差异基因可视化。其中前者可以显示某个或某些基因在不同细胞集群的表达概率分布，后者可以在PCA或UMAP图上可视化表达特征基因。
```
VlnPlot(pbmc, features = c("MS4A1", "CD79A"))
```
![](/images/PBMC3k/dbca2fef-f403-4e7d-941f-d9a5e771f143.png)

```
VlnPlot(pbmc, features = c("NKG7", "PF4"), slot = "counts", log = TRUE)
# 使用未标准化的原始数据的对数进行可视化……
```
![](/images/PBMC3k/0b9bd5f6-28ba-4c58-88a0-f83f03a568c9.png)

```
FeaturePlot(pbmc, features = c("MS4A1", "GNLY", "CD3E", "CD14", "FCER1A", "FCGR3A", "LYZ", "PPBP", "CD8A"))
```
![](/images/PBMC3k/9cbb9020-3496-4b48-9113-2cbf5027418c.png)

通过`DoHeatmap()`函数，我们可以生成一个不同细胞簇标志基因在所有细胞簇表达水平差异的热图。
```
pbmc.markers %>%
  group_by(cluster) %>%
  dplyr::filter(avg_log2FC > 1) %>%	#筛选log2FC>1的基因
  slice_head(n = 10) %>%            #筛选每个细胞集群前10个特征基因
  ungroup() -> top10
DoHeatmap(pbmc, features = top10$gene) + NoLegend()
```
![](/images/PBMC3k/7f306674-ee41-499f-a50c-a15af612ab0e.png)

# 注释细胞类型

在上一步中，我们发掘出了每一个细胞簇的标志基因。基于现有的研究成果，我们可以将标志基因和细胞类型对应起来（如下表），然后给我们的图象进行标注。

| 细胞簇 | 标志基因 | 细胞类型 |
| :----------: | :----------: | :----------: |
| 0 | IL7R, CCR7 | Naive CD4+ T |
| 1 | CD14, LYZ | CD14+ Mono |
| 2 | IL7R, S100A4 | Memory CD4+ |
| 3 | MS4A1 | B |
| 4 | CD8A | CD8+ T |
| 5 | FCGR3A, MS4A7 | FCGR3A+ Mono |
| 6 | GNLY, NKG7 | NK |
| 7 | FCER1A, CST3 | DC |
| 8 | PPBP | Platelet |


```
new.cluster.ids <- c("Naive CD4 T", "CD14+ Mono", "Memory CD4 T", "B", "CD8 T", "FCGR3A+ Mono", "NK", "DC", "Platelet")
names(new.cluster.ids) <- levels(pbmc)
pbmc <- RenameIdents(pbmc, new.cluster.ids)
DimPlot(pbmc, reduction = "umap", label = TRUE, pt.size = 0.5) + NoLegend()
```
![](/images/PBMC3k/fc85338f-8024-45c6-8874-afd678b8e825.png)

导出最终的图片：
```
#install.packages("ggplot2")
library(ggplot2)
plot <- DimPlot(pbmc, reduction = "umap", label = TRUE, label.size = 4.5) + xlab("UMAP 1") + ylab("UMAP 2") + theme(axis.title = element_text(size = 18), legend.text = element_text(size = 18)) + guides(colour = guide_legend(override.aes = list(size = 10)))
#检查output/images目录是否存在，若不存在则创建
if (!dir.exists("C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/images")) {
  dir.create("C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/images")
}
ggsave(filename = "C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/images/pbmc3k_umap.jpg", height = 7, width = 12, plot = plot, quality = 50)
```

保存运算结果：
```
saveRDS(pbmc, file = "C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/pbmc3k_final.rds")
```

下班收工！！

# 完整代码

```
#install.packages("dplyr")
#install.packages("Seurat")
#install.packages("patchwork")

library(dplyr)
library(Seurat)
library(patchwork)

pbmc.data <- Read10X(data.dir = "C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/filtered_gene_bc_matrices/hg19")

pbmc <- CreateSeuratObject(counts = pbmc.data, project = "pbmc3k", min.cells = 3,min.features = 200)
pbmc

#计算线粒体基因比例
pbmc[["percent.mt"]] <- PercentageFeatureSet(pbmc, pattern = "^MT-")
#可视化
VlnPlot(pbmc, features = c("nFeature_RNA", "nCount_RNA", "percent.mt"), ncol =3)

plot1 <- FeatureScatter(pbmc, feature1 = "nCount_RNA", feature2 = "percent.mt")
plot2 <- FeatureScatter(pbmc, feature1 = "nCount_RNA", feature2 = "nFeature_RNA")
plot1 + plot2

pbmc <- subset(pbmc, subset = nFeature_RNA > 200 & nFeature_RNA < 2500 & percent.mt < 5)

pbmc <- NormalizeData(pbmc, normalization.method = "LogNormalize", scale.factor = 10000)
#pbmc <- NormalizeData(pbmc) #简写版

pbmc <- FindVariableFeatures(pbmc, selection.method = "vst", nfeatures = 2000)

#确定前10个高变基因
top10 <- head(VariableFeatures(pbmc), 10)

# 可视化
plot1 <- VariableFeaturePlot(pbmc)
plot2 <- LabelPoints(plot = plot1, points = top10, repel = TRUE)
plot1 + plot2

all.genes <- rownames(pbmc)
pbmc <- ScaleData(pbmc, features = all.genes)

pbmc <- RunPCA(pbmc, features = VariableFeatures(object = pbmc))

#检验并可视化PCA
print(pbmc[["pca"]], dims = 1:5, nfeatures = 5)

VizDimLoadings(pbmc, dims = 1:2, reduction = "pca")
DimPlot(pbmc, reduction = "pca") + NoLegend()
DimHeatmap(pbmc, dims = 1, cells = 500, balanced = TRUE)
DimHeatmap(pbmc, dims = 1:15, cells = 500, balanced = TRUE)

ElbowPlot(pbmc)
pbmc <- JackStraw(pbmc, num.replicate = 100)
pbmc <- ScoreJackStraw(pbmc, dims = 1:20)
JackStrawPlot(pbmc, dims = 1:15)

pbmc <- FindNeighbors(pbmc, dims = 1:10)
pbmc <- FindClusters(pbmc, resolution = 0.5)
#获取前5个集群的集落ID
head(Idents(pbmc), 5)

pbmc <- RunUMAP(pbmc, dims = 1:10)
DimPlot(pbmc, reduction = "umap")

#检查output目录是否存在，若不存在则创建
if (!dir.exists("C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output")) {
  dir.create("C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output")
}
saveRDS(pbmc, file = "C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/pbmc_tutorial.rds")

pbmc_restored <- readRDS("C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/pbmc_tutorial.rds") #读取RDS文件
DimPlot(pbmc_restored, reduction = "umap")


cluster2.markers <- FindMarkers(pbmc, ident.1 = 2)
head(cluster2.markers, n = 5)

cluster5.markers <- FindMarkers(pbmc, ident.1 = 5, ident.2 = c(0, 3))
head(cluster5.markers, n = 5)

#和其他细胞簇对比，寻找每一个细胞簇的标志基因（设置仅寻找上调基因）
pbmc.markers <- FindAllMarkers(pbmc, only.pos = TRUE)
pbmc.markers %>%
  group_by(cluster) %>%
  dplyr::filter(avg_log2FC > 1)

cluster0.markers <- FindMarkers(pbmc, ident.1 = 0, logfc.threshold = 0.25, test.use = "roc", only.pos = TRUE)
#和其他细胞簇对比，寻找细胞簇0的标志基因（设置仅寻找上调基因）
#要求基因在细胞簇0中的表达量（log2倍数变化）至少比对照组高0.25
#使用ROC检验，返回值为1则代表该基因可以完美区分细胞簇0和其他细胞簇；返回值为0则代表该基因完全不能区分

VlnPlot(pbmc, features = c("MS4A1", "CD79A"))

VlnPlot(pbmc, features = c("NKG7", "PF4"), slot = "counts", log = TRUE)
# 使用未标准化的原始数据的对数进行可视化

FeaturePlot(pbmc, features = c("MS4A1", "GNLY", "CD3E", "CD14", "FCER1A", "FCGR3A", "LYZ", "PPBP", "CD8A"))

pbmc.markers %>%
  group_by(cluster) %>%
  dplyr::filter(avg_log2FC > 1) %>% #筛选log2FC>1的基因
  slice_head(n = 10) %>%            #筛选每个细胞集群前10个特征基因
  ungroup() -> top10
DoHeatmap(pbmc, features = top10$gene) + NoLegend()

new.cluster.ids <- c("Naive CD4 T", "CD14+ Mono", "Memory CD4 T", "B", "CD8 T", "FCGR3A+ Mono", "NK", "DC", "Platelet")
names(new.cluster.ids) <- levels(pbmc)
pbmc <- RenameIdents(pbmc, new.cluster.ids)
DimPlot(pbmc, reduction = "umap", label = TRUE, pt.size = 0.5) + NoLegend()

#install.packages("ggplot2")
library(ggplot2)
plot <- DimPlot(pbmc, reduction = "umap", label = TRUE, label.size = 4.5) + xlab("UMAP 1") + ylab("UMAP 2") + theme(axis.title = element_text(size = 18), legend.text = element_text(size = 18)) + guides(colour = guide_legend(override.aes = list(size = 10)))
#检查output/images目录是否存在，若不存在则创建
if (!dir.exists("C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/images")) {
  dir.create("C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/images")
}
ggsave(filename = "C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/images/pbmc3k_umap.jpg", height = 7, width = 12, plot = plot, quality = 50)

saveRDS(pbmc, file = "C:/Users/86150/Downloads/pbmc3k_filtered_gene_bc_matrices/output/pbmc3k_final.rds")
```