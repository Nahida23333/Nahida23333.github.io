---
title: 生信小记：scvi_tools的安装
date: 2025-08-20 18:34:51
categories: 
    - 生信分析
tags: 
    - 生信分析
    - R语言
    - Seurat
    - scvi
cover:
    /images/Seurat.png
---
使用scvi算法进行单细胞测序数据的整合，一方面需要`reticulate`包，另一方面则需要安装在conda环境中的`scvi-tools`包及其依赖项。前者可以通过`install.packages()`语句从CRAN中下载，而本文章将介绍如何从零开始安装`scvi-tools`。

参考教程如下：
- [Anaconda安装教程（2025年保姆级超详解）【附安装包+环境玩转指南】](https://zhuanlan.zhihu.com/p/1896552549621936802)
- 

# 安装Anaconda
打开[Anaconda官网](https://anaconda.com/app/)，点击右上角的“Free Download”，注册并登录后即可下载。
![](/images/scvi_tools/微信图片_20250820185105_13.png)

下载完成后打开安装包，可见如下界面。点击`Next >`。
![](/images/scvi_tools/2025-08-20_211639_273.png)

点击`I Agree`。
![](/images/scvi_tools/2025-08-20_211832_134.png)

点击`All users (requires admin privileges)`。
![](/images/scvi_tools/2025-08-20_212549_525.png)

选择存储位置时，强烈不建议存储在C盘，因为它安装完占用的空间不小。更改完存储路径后点击`Next >`。
![](/images/scvi_tools/2025-08-20_212325_229.png)

全勾选上再点`Next >`。我看的教程使用的是老版本，没有详细的介绍和推荐，因此我根据安装程序建议，全部勾选。
![](/images/scvi_tools/2025-08-20_212753_717.png)

完成安装。
![](/images/scvi_tools/2025-08-20_213631_625.png)
![](/images/scvi_tools/2025-08-20_213706_198.png)
![](/images/scvi_tools/2025-08-20_213731_715.png)

Win+R打开运行对话框，输入`sysdm.cpl`。
![](/images/scvi_tools/2025-08-20_215015_285.png)

依次点击`高级`—`环境变量`。
![](/images/scvi_tools/2025-08-20_215400_530.png)

单击用户变量这一栏的`Path`，点击`编辑`。
![](/images/scvi_tools/2025-08-20_215621_430.png)

点击新建，并依次添加如图所示的三个路径（以安装在D盘的software文件夹为例）：
![](/images/scvi_tools/2025-08-20_215820_650.png)

点击确定，直至上述窗口全部关闭。然后再次Win+R打开运行对话框，输入`cmd`以打开命令提示符。
![](/images/scvi_tools/2025-08-20_220030_204.png)

在新打开的窗口中输入`conda --version`，如返回版本号则说明配置成功。
![](/images/scvi_tools/2025-08-20_220217_405.png)


在Windows搜索栏中输入`cmd`，找到“命令提示符”，并点击`以管理员身份运行`。
![](/images/scvi_tools/20250820220722_14.png)

在新打开窗口中输入并回车，以切换清华镜像源。
```
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/free/
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/pkgs/main/
conda config --add channels https://mirrors.tuna.tsinghua.edu.cn/anaconda/cloud/conda-forge/
conda config --set show_channel_urls yes
```

# 安装scvi-tools
以管理员身份打开命令提示符，输入`conda create -n scvi-env python=3.12`并回车。

输入`conda init`并回车，运行完毕后关闭窗口，并重新以管理员身份打开。

输入`conda activate scvi-env`激活环境，然后输入`pip install -U scvi-tools`来快速安装scvi-tools。

输入`conda install -c conda-forge r-base r-essentials r-reticulate`并回车，运行之后scvi-tools即配置完成。

输入`conda info --envs`，获得scvi-env环境的绝对路径，输出如下：
```
(scvi-env) C:\Windows\System32>conda info --envs

# conda environments:
#
base                   D:\software\Anaconda
scvi-env             * D:\software\Anaconda\envs\scvi-env
```

复制scvi-env的路径备用。

# 其他依赖项安装
依旧在命令提示符中，安装scanpy：`pip install scanpy`。