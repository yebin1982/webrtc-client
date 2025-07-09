# 帮助文档

**开始**

#### 角色:

你是一位经验丰富的前端开发专家，尤其擅长使用原生 JavaScript、HTML5 和 CSS3 构建移动优先的 Web 应用。你对 WebRTC 技术栈（包括 `getUserMedia`、`RTCPeerConnection`）有深入的理解，并清楚如何实现与信令服务器的交互。

#### 任务:

你的任务是设计并编写一个纯前端的 WebRTC 视频推流客户端。这个应用将作为一个单页面 Web 应用（SPA）在移动设备的浏览器上运行。它能调用设备的摄像头，并将视频流推送到用户指定的服务器。SPA 应由一个 `index.html` 文件组成，通过外部的 `style.css` 和 `app.js` 文件提供样式和逻辑。

#### 核心功能需求:

**摄像头访问与视频预览:**

- 应用启动后，应立即请求访问用户的摄像头权限。
- 成功获取权限后，在页面上显示一个 `<video>` 元素，实时预览摄像头捕捉的画面（静音预览）。
- 需要支持切换前后摄像头（如果设备支持），默认使用前置摄像头。

**WebRTC 推流:**

- 实现一个 `RTCPeerConnection` 实例。
- 将从 `getUserMedia` 获取的本地视频流 (`MediaStream`) 的轨道 (`MediaStreamTrack`) 添加到 `RTCPeerConnection` 中。
- **信令交互:** 应用需生成一个 SDP (`Session Description Protocol`) offer，并通过 HTTP POST 请求发送到用户配置的信令服务器地址。应用需处理服务器返回的 SDP answer 以建立连接。作为纯推流客户端，主要负责发起连接。

**配置界面 (Settings Page):**

- 主界面需包含一个明显的“设置”按钮。
- 点击后，弹出一个居中的模态窗口作为设置页面。
- **服务器设置:**
  - 服务器地址 (Server URL): 用于信令交互的 HTTP/HTTPS 或 WebSocket (WSS) 地址。
  - 用户名 (Username): 可选，用于服务器认证。
  - 密码 (Password): 可选，用于服务器认证。
- **串流参数设置:**
  - 分辨率 (Resolution): 提供下拉选项，例如 `640x480`、`1280x720`、`1920x1080`。
  - 帧率 (Framerate): 提供下拉选项，例如 `15`、`24`、`30`。
  - 摄像头 (Camera): 提供下拉选项，例如 `前置 (Front)`、`后置 (Rear)`。
- **操作按钮:**
  - “保存”按钮：保存当前设置并关闭设置页面。
  - “取消”按钮：不保存更改并关闭设置页面。

**配置持久化:**

- 所有设置页面中的参数（服务器地址、认证信息、视频参数等）必须使用 `localStorage` 进行本地持久化存储。
- 应用加载时，自动从 `localStorage` 读取上次保存的配置并应用。

#### 技术栈与实现细节:

**语言:** 使用原生 JavaScript (ES6+)，不依赖任何前端框架（如 React、Vue、Angular）。

**结构:** 将代码清晰分离到三个文件中：

- **`index.html`:** 包含所有必要的 HTML 元素结构，包括视频预览和设置页面的模态框结构。
- **`style.css`:** 负责应用的样式，采用移动优先的响应式设计。视频元素应尽量占满屏幕，设置按钮悬浮在视频之上，设置页面设计为居中的模态框。
- **`app.js`:** 包含所有 JavaScript 逻辑，使用 ES6 模块或类组织代码。

**`app.js` 内部结构建议:**

- **UI 模块:** 负责 DOM 操作，例如显示/隐藏设置页面、更新按钮状态。
- **Config 模块:** 负责 `localStorage` 的读写操作（`saveSettings`、`loadSettings`），并提供默认配置（如分辨率 `1280x720`、帧率 `30`、前置摄像头）。
- **WebRTC 模块:** 封装 `getUserMedia` 和 `RTCPeerConnection` 的核心逻辑，包含 `startStream()` 和 `stopStream()` 方法。`startStream` 使用从 Config 模块加载的参数初始化。
- **Signaling 模块:** 负责与服务器通信，使用 `fetch` API 发送 SDP offer 并获取 answer，采用 `async` 函数实现。

#### 用户体验 (UX):

- 提供清晰的状态指示，例如“正在连接…”、“推流中”、“连接断开”。
- 优雅处理错误（如摄像头权限失败、信令服务器连接失败），并显示友好的提示信息。

#### 输出要求:

请生成上述应用的完整源代码，包含以下三个文件：

- **`index.html`**
- **`style.css`**
- **`app.js`**

代码需整洁、注释清晰，尤其在 `app.js` 中对 WebRTC 关键步骤（创建 `PeerConnection`、添加轨道、创建 Offer、设置描述、信令交互）提供详尽注释。每个文件内容应独立，确保三个文件组合成一个完整的 SPA。

**结束**
