---
title: Fiji小记：批量进行多张免疫荧光图象的共表达分析
date: 2026-05-02 16:02:44
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

宏（Macro）指将一系列命令或操作组织在一起，作为一个独立的命令来执行特定任务。对多张免疫荧光染色图象进行共定位分析时，使用Macro功能可以极大提高处理效率。本文章将演示如何使用Macro测量不同通道表达区域及共表达区域的面积。

# 原理

对单张图片进行测量时，我们的步骤大致如下：
1. 打开图片，分离通道；
2. 对需要进行共定位分析的通道分别进行：①调整threshold至合适区间，点击Apply；②点击`Edit-Section-Create Section`选中表达区域；③`Ctrl+M`测量表达区域面积；
3. 点击Process-Image Calculator，Image1和Image2分别选择两张通道的图片，Operation选择“AND”，然后点击OK，生成两张照片的叠加图。
4. 选中叠加后的图片，点击`Edit-Section-Create Section`选中共表达区域;
5. `Ctrl+M`测量共表达区域的面积。

使用宏可以自动进行上述操作进行分析，借此可以实现对多张图象的快速处理。

# 准备工作
## 建立文件夹
在所需要的地方分别建立输入及输出文件夹，本文章中将输入文件夹命名为`input`，将输出文件夹命名为`output_coexpression`。
## 确定合适的Threshold模式
点击`Image-Adjust-Auto Threshold`，软件会生成多张按照不同Threshold模式调整后的预览图。每张预览图的正中下方边缘写有该图片所选择的Threshold模式；选择自己觉得最合适的预览图，并记下这张图所使用的模式。

本篇文章将使用`RenyiEntropy`模式进行调整。
# 宏
点击`Plugins-Macros-Record`，在弹出窗口内输入以下代码：
```Java
// 批量处理免疫荧光图像
inputDir = "E:/医学/免疫荧光/20260430-A2-A4/input/";  // 存放.oir文件的文件夹
outputDir = "E:/医学/免疫荧光/20260430-A2-A4/output_coexpression/"; // 输出结果的文件夹

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
        
        selectImage("C2-" + baseName + ".oir");
        setMinAndMax(1347, 2018);
        setAutoThreshold("RenyiEntropy dark no-reset"); //调整Threshold模式至RenyiEntropy
        run("Convert to Mask"); //点击Apply
        run("Create Selection"); //Edit-Selection-Create Selection
        run("Measure"); //Ctrl+M
                
        // 通道3
        selectImage("C3-" + baseName + ".oir");
        setMinAndMax(1007, 1267);
        setAutoThreshold("RenyiEntropy dark no-reset");
        run("Convert to Mask");
        run("Create Selection");
        run("Measure");
                
        print("已应用记录的参数到文件: " + fileName);
        
        imageCalculator("AND create", "C2-" + baseName + ".oir","C3-" + baseName + ".oir"); //Process-Image Calculator
        selectImage("Result of " + "C2-" + baseName + ".oir");
        run("Create Selection");
        run("Measure");

        // 保存测量结果
        saveAs("Results", outputDir + baseName + "_Results.csv");//
        run("Clear Results");

        // 关闭所有窗口，准备处理下一张
        run("Close All");
        
        print("已处理: " + fileName + " (" + (i+1) + "/" + fileList.length + ")");
    }
}

// 提示完成
print("批量处理完成！共处理了 " + fileList.length + " 个文件。");
showMessage("处理完成", "共处理了 " + fileList.length + " 个文件。");
```

`Ctrl+A`全选，然后点击`Run`即可。