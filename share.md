# 基于L站大佬的开源项目VIBE了一款AI驱动的流程图工具

> 让画图像聊天一样简单，30 秒生成专业流程图

## 这是什么？

**FlowPilot** 是一个 AI 驱动的流程图工具，基于 [next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io) 二次开发。

**核心能力：**
- 💬 **对话式生成** - 用自然语言描述需求，AI 实时生成 draw.io 图表
- 🎨 **风格可控** - 配置画图偏好（手绘风/正式风/草稿风），一次设定全局生效
- 🏆 **多模型对比** - 最多 5 个大模型同时生成，选最满意的
- 🎯 **模板库** - 内置企业级模板（架构图/时序图/客户旅程...），一键套用
- ✨ **自动优化** - AI 校准布局，自动对齐节点、整理连线
- 📊 **PPT 生成** - 从需求到成品 PPT，15 分钟搞定

---

## 一、为什么需要 FlowPilot？

### 传统画流程图的痛点

如果你也有这些困扰：

❌ **来回切换太繁琐**
- 在 ChatGPT/Claude 生成 XML → 复制 → 粘贴到 draw.io → 看效果 → 不满意 → 重新生成
- 一个图要跳转 10 次+

❌ **无法实时预览**
- 只能粘贴完才知道效果
- 改个细节要重新生成整个图

❌ **不知道哪个模型更好**
- GPT-4 画架构图好？Claude 画流程图好？
- 每次都要试，浪费时间和 token

❌ **做 PPT 太痛苦**
- 10 页 PPT = 10 个图 = 手动重复 10 次
- 导出、粘贴、调整大小...耗时 1-2 小时

### FlowPilot 的解决方案

✅ **一个界面搞定所有流程**
- 左边对话，右边实时预览
- 改需求 → 立即看效果

✅ **风格配置一次，全局生效**
- 不用每次都说"用泳道图"、"草稿风格"
- 配置偏好后，所有图自动遵守

✅ **多模型对比，选最好的**
- 5 个模型同时生成
- 逐个预览，点击采用

✅ **PPT 生成器**
- 输入主题 → AI 生成大纲 → 并行生成图表 → 导出 PPT
- 15 分钟完成

---

## 二、核心功能展示

### 功能 1：对话式生成 + 实时预览

**基础能力：**
- 自然语言描述需求，AI 生成 draw.io XML
- 右侧实时预览，无需手动粘贴
- 支持图片上传，AI 看图画图
- 历史版本管理，随时回滚

![image|690x372](upload://pCCi11pxV3kiL4zSUJ6SCrOO18i.jpeg)

**使用场景：**
- 技术方案评审：画系统架构图
- 述职答辩：画业务流程图
- 写文档材料：画时序图、状态机图

---

### 功能 2：FlowPilot Brief - 风格配置

**问题：** 每次都要重复描述"用泳道图"、"草稿风格"、"单页内"...

**解决：** 配置一次，全局生效

![image|690x351](upload://lM0XIpRSKg74R8dfnDpTHVhQIOL.jpeg)

**配置项：**

**① 任务模式**
- 空白起稿 - 从零构建
- 结构整理 - 保持内容，只调布局
- 讲解拆解 - 总结逻辑，给改进建议

**② 视觉调性**
- 产品规范 - 中性灰 + 微配色，企业级质感
- 创意手稿 - 自由排线 + 手写注释
- 汇报精简 - 干净、适合幻灯片
- 草稿手绘 - 粗描边 + 淡手绘色块

**③ 关注重点**
- 泳道清晰 - 强化跨角色交互
- 数据流动 - 标记输入输出
- 叙事节奏 - 突出阶段和关键节点

**④ 图表类型**
- 系统时序 / 业务活动 / 组件依赖 / 状态机 / 部署拓扑 / 思维导图 / 旅程图 / 甘特图

**⑤ 设计护栏**
- 单屏锁定（800×600 内）
- 保持命名（不改现有节点）
- 高对比标注（关键步骤突出）

**使用效果：**
选"草稿手绘 + 泳道清晰 + 单屏锁定"后，所有图都自动遵守这些偏好

![d831eb32ca74c07bb012fb123466d27b|652x500](upload://u8sJAMFJggwcIIHw1BwHW4QjgBl.jpeg)


---

### 功能 3：流程图样板间 - 一键套用模板

**问题：** 不知道画啥、缺灵感、从零描述需求麻烦

**解决：** 内置企业级模板，一键生成

![image|318x499](upload://mDJ3qjJRhG1dDTRoWPTJ91WURs4.jpeg)

**内置模板：**

| 模板 | 适用场景 | 组合 |
|------|---------|------|
| 手绘战略蓝本 | 策略工作坊、产品规划 | 客户旅程 + 思维导图 |
| 企业级组件样板 | 架构评审、技术方案 | 三层组件 + 部署拓扑 |
| 客户成功续约剧本 | CSM 团队、续约策略 | 旅程 + 机会矩阵 |
| 应急指挥闭环 | SRE 战情室、故障复盘 | 时间轴 + 指挥链 |

**使用方式：** 点击模板 → 自动生成完整图表

![image|690x341](upload://wXlvicUr4jNGMLw912UILBHzmaU.jpeg)


---

### 功能 4：AI 校准舱 - 自动整理布局 ✨

**问题：** AI 画的图经常节点乱、连线交叉、超出边界

**解决：** 一键整理，保持内容不变，优化排版

![image|311x499](upload://6oqX9e9EW9DdiREt0TZIh4BbzWp.jpeg)

**工作原理：**
- 读取 XML，分析布局问题
- 对齐网格、调整间距、优化连线
- 控制在单页内，强调主流程

![be7aa9b6b2d8f7b09b692abd1465e3e0|690x329](upload://lJxbp6bJ0nTAy7IkhxBDHBN4fX2.jpeg)


---

### 功能 5：模型对比生成 - 5 个模型同时 PK 🏆

**问题：** 不知道哪个模型更适合我的需求

**解决：** 同时用多个模型生成，对比选最好的

![image|690x356](upload://sWianK5467VTJEG2Qf34dAmaAYy.jpeg)

**使用方式：**
1. 配置 5 个模型（GPT-4o、Claude-3.5、国产模型...）
2. 发送需求："画一个订单流程图"
3. 5 个模型同时生成
4. 逐个预览，点击"采用"最满意的
5. 自动创建分支，继续迭代

**真实体验：**
- **Claude** - 叙事性最强，适合述职/汇报
- **GPT-4** - 规范性最好，适合技术方案
- **国产模型** - 成本低，进步很快

![b8c56f7f708f6fcd2a4b05aa8ee711aa|690x313](upload://mqeGVGlq7xUuhv9wL6KnczOsy03.jpeg)


---

### 功能 6：PPT 生成器(BETA) - 15 分钟完成 PPT

**问题：** 做 PPT 要想大纲、逐页画图、手动导出粘贴，**耗时 1-2 小时**

**解决：** AI 生成 PPT，从构思到成品 15 分钟

![image|690x359](upload://oPeL9VTtNHEyktz9LNTR3aJ3nJ0.jpeg)

**工作流程：**

**Step 1 - 填写 Brief**
- 主题：产品路线图 Q1 2024
- 受众：管理层 / 团队 / 客户
- 目标：汇报 / 培训 / 推介
- 语气：正式 / 平衡 / 激情
- 页数：5-15 页

**Step 2 - AI 生成蓝图**
- 故事弧（整体叙事逻辑）
- 主题指南（配色、字体、图标）
- 每页大纲（标题、要点、视觉提示、与上页衔接）

**Step 3 - 编辑大纲**
- 修改标题、要点
- 拖拽排序
- 锁定配色

**Step 4 - 并行生成**
- 3-4 个并发请求
- 实时显示进度
- 失败可单独重试

**Step 5 - 导出**
- 下载 draw.io XML（ZIP）
- 或导出 .pptx 文件

**真实案例：**
![c1980e2ec0e2d5adb8484d3ed4b7c813|548x500](upload://mUDGUjXlVeElEzKu0xB7hltoYtM.jpeg)
![46cf80a46352e3e676f16393642b50f9|529x500](upload://qWDHUqEUhKuYmZkeEdO6dWOKTIz.jpeg)


---

### 功能 7：第三方模型配置 🔧

**支持：**
- 公司内部大模型
- OpenRouter 聚合 API
- 自建 OpenAI 代理
- 所有 OpenAI 兼容协议

![image|690x355](upload://jA7PVCc3EtitvKCcZpDV1idlNzs.jpeg)

**特点：**
- 支持多个 API 接口
- 一个接口挂载多个模型
- 数据仅存浏览器本地

---

## 三、实际效果展示

### 示例 1：画图
![image|690x494, 50%](upload://1sUPpRWjhIOCpRvhXtiEIl3Z2W.jpeg)

![image|662x500, 50%](upload://c6UqqOCol923nQlxLyEZUiK66tp.jpeg)
![image|644x500, 50%](upload://dg5aoyWJgINv9i3BGpdw4N4EFbp.jpeg)
![image|658x500, 50%](upload://9NUYPdKMV8iFdjUHBPmHZgdzTvN.jpeg)
![image|658x500, 50%](upload://kSjwlwQVLwvyx79sZiulS3wLS5b.jpeg)
![image|690x452, 50%](upload://uj95WDASbSSbhjGsc11VFVirN8q.jpeg)


---

### 示例 2：PPT（BETA）
![87ff5b97b7a4c590ac0986c06d748c26|689x462, 50%](upload://woK01ewwz0UA4X4TClQxgi1xFBB.png)
![34eb056e4e1df19b56f0463996c1f73d|689x490, 50%](upload://9SH13QQFVQNI2KC2NcbW2kuO2go.png)
![d3418bb68e0cc7745687391887ae1ab0|673x500, 50%](upload://2a1YFqUiYsiBWpGWlpUwLkC29hZ.jpeg)

![e4c0c79581720c38e64de28e1ad877db|670x500, 50%](upload://zuRxH8fj1MyADr9435PKOFVv1u6.png)




---

## 四、快速开始

### 方式 1：在线体验

访问 Demo 站点：[[flowPilot]](https://flow-pilot-lime.vercel.app/)

### 使用步骤：

**Step 1 - 配置模型**
- 点击右上角"模型配置"
- 添加 API Key（OpenAI、Claude、或自定义）

**Step 2 - 配置偏好**
- 点击"FlowBrief"
- 选择任务模式、视觉调性、关注重点

**Step 3 - 开始创作**
- 方式 1：直接对话描述需求
- 方式 2：点击"模板"一键生成
- 方式 3：点击"PPT 工作室"生成 PPT

**Step 4 - 多模型对比（可选）**
- 点击"模型对比"
- 配置要对比的模型
- 同时生成，选最满意的

---

## 五、背后的故事（VIBE CODING 实践）

### 为什么做这个工具？

作为互联网程序员，**述职、答辩、写材料**是家常便饭，每次都要画图。

之前的工作流：
1. Claude 生成 XML → 复制 → draw.io 粘贴 → 看效果 → 不满意 → 重新生成
2. **循环往复，一个图 5 分钟+**

某天在 L 站看到 [@DayuanJiang](https://github.com/DayuanJiang) 的 [next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io)，解决了"实时预览"的痛点。

**当场 Fork，准备开搞。**

### 为什么继续改造？

一开始只想让它支持公司内部大模型。

用 CODEX 5 分钟搞定后，意识到：**AI 编程效率已经高到离谱了。**

既然都改到这里，不如做成真正的产品，解决所有画图痛点。

---

## 六、未来计划
暂无、vibe 图一乐

---

## 致谢

- **[@DayuanJiang](https://github.com/DayuanJiang)** - 感谢提供优质基础框架 🫡
- **Codex、Cursor** - AI 编程工具改变开发方式
---

## 相关链接

- **原项目**：https://github.com/DayuanJiang/next-ai-draw-io

---

*"想法到实现的距离，从未如此之近。"*
