---
title: Fiji小记：使用宏对多张免疫荧光染色图象进行批量处理
date: 2026-05-01 14:53:26
categories: 
    - 生信分析
tags: 
    - 生信分析
    - 免疫荧光染色
    - Fiji
    - 宏（Macro）
    - ImageJ
cover:
    /images/FIJI.png
---

对多张免疫荧光染色图象进行处理时，使用Macro功能可以极大提高处理效率。本文章将演示：
- 批量分离通道并保存各通道图象；
- 批量调整各通道图象的亮度（Brightness）和对比度（Contrast），重新融合（Merge）为新的图象并保存融合后的图象；
- 批量测量各通道的平均荧光强度值。

本文参考了以下教程：
- [【Bilibili】用imagej来进行大批量处理图片，进行细胞免疫荧光处理](https://www.bilibili.com/video/BV1Cf4y1M7Fs/?spm_id_from=333.1007.top_right_bar_window_default_collection.content.click&vd_source=c1bfe2e5243093b9d13a3de35c0644a7)

# 建立`input`和`output`文件夹
在需要的地方建立`input`文件夹用于存储输入数据，也就是我们的原始图象；同时建立`output`文件夹，存储输出的数据。

# 编程
点击`Plugins-Macros-Record`，并输入以下内容：

```Java
// 批量处理免疫荧光图像
inputDir = "E:/医学/免疫荧光/20260430-A2-A4/input/";  // 存放.oir文件的文件夹
outputDir = "E:/医学/免疫荧光/20260430-A2-A4/output/"; // 输出结果的文件夹

// 获取文件夹内所有文件列表
fileList = getFileList(inputDir);

// 设置测量参数
run("Set Measurements...", "area mean min integrated area_fraction limit redirect=None decimal=3");

// 开启循环，逐个处理文件
for (i = 0; i < fileList.length; i++) {
    fileName = fileList[i];
    
    // 只处理.oir文件
    if (endsWith(fileName, ".oir")) {
        
        // 获取基本名称（去掉.oir扩展名）
        baseName = substring(fileName, 0, lastIndexOf(fileName, "."));
        
        // 打开文件并分离通道
        open(fileName);
        run("Split Channels");
        
        // 复制各通道用于后续调整亮度及对比度
        selectImage("C1-" + fileName);
        run("Duplicate...", " ");
        selectImage("C2-" + fileName);
        run("Duplicate...", " ");
        selectImage("C3-" + fileName);
        run("Duplicate...", " ");
        
        // 调整复制后图象的亮度及对比度
        // 通道1
        selectImage("C1-" + baseName + "-1.oir");
        // 这里用的是basename而非filename，如果用filename会出现两个oir后缀的情况，下同
        setMinAndMax(1185, 5145); 
        // 此处参数可根据实际情况调整
        // 建议先自己调一张图片（Ctrl+Shift+C），然后记下此时的Min值和Max值，下同
                
        // 通道2
        selectImage("C2-" + baseName + "-1.oir");
        setMinAndMax(1347, 2018);
                
        // 通道3
        selectImage("C3-" + baseName + "-1.oir");
        setMinAndMax(1007, 1267);
                
        print("已应用记录的参数到文件: " + fileName);
        
        // 合并通道
        run("Merge Channels...", "c1=[C1-" + baseName + "-1.oir] c2=[C2-" + baseName + "-1.oir] c3=[C3-" + baseName + "-1.oir] create keep");
        
        // 测量 C2 和 C3 通道的荧光强度
        selectImage("C2-" + baseName + "-1.oir");
        run("Measure");
        selectImage("C3-" + baseName + "-1.oir");
        run("Measure");
        
        // 保存测量结果
        saveAs("Results", outputDir + baseName + "_Results.csv");//
        run("Clear Results");
        
        // 将各通道转为 RGB 并保存
        // 保存原始通道
        selectImage("C1-" + fileName);
        run("RGB Color");
        saveAs("Tiff", outputDir + "C1_" + baseName + ".tif");

        selectImage("C2-" + fileName);
        run("RGB Color");
        saveAs("Tiff", outputDir + "C2_" + baseName + ".tif");

        selectImage("C3-" + fileName);
        run("RGB Color");
        saveAs("Tiff", outputDir + "C3_" + baseName + ".tif");

        // 保存调整后的通道
        selectImage("C1-" + baseName + "-1.oir");
        run("RGB Color");
        saveAs("Tiff", outputDir + "C1_" + baseName + "_adjusted.tif");
        
        selectImage("C2-" + baseName + "-1.oir");
        run("RGB Color");
        saveAs("Tiff", outputDir + "C2_" + baseName + "_adjusted.tif");
        
        selectImage("C3-" + baseName + "-1.oir");
        run("RGB Color");
        saveAs("Tiff", outputDir + "C3_" + baseName + "_adjusted.tif");
        
        // 保存合并后的 RGB 图像
        selectImage(baseName + "-1.oir");
        run("RGB Color");
        saveAs("Tiff", outputDir + baseName + "_Merged_RGB.tif");
        
        // 关闭所有窗口，准备处理下一张
        run("Close All");
        
        print("已处理: " + fileName + " (" + (i+1) + "/" + fileList.length + ")");
    }
}

// 提示完成
print("批量处理完成！共处理了 " + fileList.length + " 个文件。");
showMessage("处理完成", "共处理了 " + fileList.length + " 个文件。");
```

# 运行代码
`Ctrl+A`全选，随后点击`Run`运行，即可批量处理图片。