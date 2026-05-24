# text_transfer（本地原型）

这是一个本地可跑的原型：前端（`index.html`/`styles.css`/`script.js`）通过后端代理调用大模型完成“课文 → 小说”的风格化改写（风格 prompt 来自 `server/styles/*.md`）。

## 重要：不要提交密钥（非常重要）

- 真实密钥放在 `server/config.yaml`（已在 `.gitignore` 忽略，不会被 `git add .` 提交）。
- 上传到 GitHub 前请再次确认：仓库里没有任何真实 `api_key`、截图、日志等敏感信息。

## 运行（Windows，本地）

1. 复制配置模板并填写：将 `server/config.example.yaml` 复制为 `server/config.yaml`，填写 `base_url` / `model` / `api_key`
2. 双击运行：`run.bat`（或用 PowerShell 运行 `run.ps1`）

浏览器访问：`http://127.0.0.1:8000/`

## 运行（Docker，可打包部署）

1. 准备 `server/config.yaml`（同上，确保不提交）
2. 构建并运行：
   - `docker compose up --build`

浏览器访问：`http://127.0.0.1:8000/`
