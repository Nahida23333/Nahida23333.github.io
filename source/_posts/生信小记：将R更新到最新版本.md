---
title: 生信小记：将R更新到最新版本
date: 2025-03-07 22:55:20
categories: 
    - 生信分析
tags: 
    - 生信分析
    - R语言
---

在R中（注意，并非Rstudio！）输入并运行下列代码：

```
install.packages("installr")
library(installr)
options(timeout=10000) #此步不可或缺，否则会因超时报错：The setup files are corrupted. Please obtain a new copy of the program.
updateR(fast=TRUE,cran_mirror="https://mirrors.ustc.edu.cn/CRAN/")
```

即可解决。

运行结果：
```
> install.packages("installr")
试开URL’https://mirrors.bfsu.edu.cn/CRAN/bin/windows/contrib/4.3/installr_0.23.4.zip'
Content type 'application/zip' length 353315 bytes (345 KB)
downloaded 345 KB

程序包‘installr’打开成功，MD5和检查也通过

下载的二进制程序包在
        C:\Users\86150\AppData\Local\Temp\RtmpWMBY9s\downloaded_packages里

> library(installr)

Welcome to installr version 0.23.4

More information is available on the installr project website:
https://github.com/talgalili/installr/

Contact: <tal.galili@gmail.com>
Suggestions and bug-reports can be submitted at: https://github.com/talgalili/installr/issues

                        To suppress this message use:
                        suppressPackageStartupMessages(library(installr))

Warning message:
程辑包‘installr’是用R版本4.3.3 来建造的

> options(timeout=10000)
> updateR(fast=TRUE,cran_mirror="https://mirrors.ustc.edu.cn/CRAN/")
There is a newer version of R for you to download!

You are using R version:         4.3.1 (2023-06-16 ucrt)
And the latest R version is:     4.4.3 (2025-03-01)
Installing the newest version of R,
 please wait for the installer file to be download and executed.
 Be sure to click 'next' as needed...
试开URL’https://mirrors.ustc.edu.cn/CRAN/bin/windows/base/R-4.4.3-win.exe'
Content type 'application/octet-stream' length 88321384 bytes (84.2 MB)
downloaded 84.2 MB


The file was downloaded successfully into:
 C:\Users\86150\AppData\Local\Temp\RtmpWMBY9s/R-4.4.3-win.exe 

Running the installer now...

We can not seem to find the location of the new R you have installed.
The rest of the updating process is aborted, please take care to copy
your packages to the new R installation.
[1] TRUE
There were 22 warnings (use warnings() to see them)

```