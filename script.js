const panels = [...document.querySelectorAll(".phone")];
const dockButtons = [...document.querySelectorAll("[data-show]")];
const lessonText = document.querySelector("#lessonText");
const counter = document.querySelector("#counter");
const disabledToggle = document.querySelector("#disabledToggle");
const startBtn = document.querySelector("#startBtn");
const againBtn = document.querySelector("#againBtn");
const regenBtn = document.querySelector("#regenBtn");
const copyBtn = document.querySelector("#copyBtn");
const toast = document.querySelector("#toast");
const progressFill = document.querySelector("#progressFill");
const progressValue = document.querySelector("#progressValue");
const styleCards = document.querySelector("#styleCards");
const storyOutput = document.querySelector("#storyOutput");

let progressTimer;
let rewriteAbortController;

const builtInStyleMeta = {
  劲爆玩梗: { icon: "bomb", subtitle: "网络热梗 脑洞大开" },
  热血玄幻: { icon: "flame", subtitle: "逆天改命 荣耀十足" },
  悬疑推理: { icon: "ring", subtitle: "层层反转 烧脑带感" },
  甜宠恋爱: { icon: "heart", subtitle: "甜宠互动 温馨治愈" },
};

function showPanel(name) {
  panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === name);
  });
  dockButtons.forEach((button) => {
    button.classList.toggle("is-current", button.dataset.show === name);
  });

  if (name === "loading") {
    animateProgress();
  } else {
    clearInterval(progressTimer);
  }

  if (window.innerWidth > 900) {
    const panel = panels.find((item) => item.dataset.panel === name);
    panel?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }
}

function animateProgress() {
  clearInterval(progressTimer);
  let value = 44;
  progressFill.style.width = `${value}%`;
  progressValue.textContent = `${value}%`;

  progressTimer = setInterval(() => {
    value = Math.min(value + Math.round(Math.random() * 7) + 2, 92);
    progressFill.style.width = `${value}%`;
    progressValue.textContent = `${value}%`;

    if (value >= 92) {
      clearInterval(progressTimer);
    }
  }, 420);
}

function updateCounter() {
  counter.textContent = `${lessonText.value.length}/2000`;
}

function setDisabledState(disabled) {
  document.body.classList.toggle("demo-disabled", disabled);
  document.querySelectorAll("button, textarea, input[type='radio']").forEach((control) => {
    if (control === disabledToggle || control.classList.contains("dock-btn")) return;
    control.disabled = disabled;
  });
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1400);
}

function getSelectedStyleId() {
  return document.querySelector("input[name='style']:checked")?.value ?? "";
}

function renderStyleCards(styles) {
  if (!styleCards) return;
  styleCards.innerHTML = "";

  const prefer = styles.find((item) => item.id === "劲爆玩梗")?.id ?? styles[0]?.id;

  styles.forEach((style) => {
    const label = document.createElement("label");
    label.className = "style-card";

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "style";
    input.value = style.id;
    input.checked = style.id === prefer;

    const meta = builtInStyleMeta[style.id] ?? {};
    const iconClass = meta.icon ?? "bomb";
    const icon = document.createElement("span");
    icon.className = `icon ${iconClass}`;
    icon.setAttribute("aria-hidden", "true");
    if (iconClass === "bomb") {
      const i = document.createElement("i");
      icon.appendChild(i);
    }

    const strong = document.createElement("strong");
    strong.textContent = style.name;

    label.appendChild(input);
    label.appendChild(icon);
    label.appendChild(strong);

    if (meta.subtitle) {
      const small = document.createElement("small");
      small.textContent = meta.subtitle;
      label.appendChild(small);
    }

    styleCards.appendChild(label);
  });
}

async function loadStyles() {
  try {
    const resp = await fetch("/api/styles", { headers: { Accept: "application/json" } });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error("No styles");
    renderStyleCards(data);
  } catch {
    renderStyleCards(Object.keys(builtInStyleMeta).map((name) => ({ id: name, name })));
    showToast("未连接后端，已启用本地演示风格");
  }
}

async function rewriteOnce() {
  const text = lessonText.value.trim();
  if (!text) {
    showToast("请先输入课文内容");
    return;
  }
  const styleId = getSelectedStyleId();
  if (!styleId) {
    showToast("请选择风格");
    return;
  }

  rewriteAbortController?.abort();
  rewriteAbortController = new AbortController();

  showPanel("loading");

  try {
    const resp = await fetch("/api/rewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ text, style_id: styleId }),
      signal: rewriteAbortController.signal,
    });

    if (!resp.ok) {
      let detail = "";
      try {
        const data = await resp.json();
        detail = typeof data?.detail === "string" ? data.detail : "";
      } catch {
        detail = "";
      }
      throw new Error(detail || `请求失败（${resp.status}）`);
    }

    const data = await resp.json();
    const output = typeof data?.text === "string" ? data.text : "";
    if (!output) throw new Error("模型未返回文本");
    if (storyOutput) storyOutput.textContent = output;

    showPanel("result");
  } catch (err) {
    if (err?.name === "AbortError") return;
    showToast(err?.message || "转换失败");
    showPanel("input");
  }
}

dockButtons.forEach((button) => {
  button.addEventListener("click", () => showPanel(button.dataset.show));
});

lessonText.addEventListener("input", updateCounter);

startBtn.addEventListener("click", rewriteOnce);
againBtn.addEventListener("click", () => showPanel("input"));
regenBtn.addEventListener("click", rewriteOnce);

copyBtn.addEventListener("click", async () => {
  const text = storyOutput?.textContent?.trim() ?? "";
  if (!text) {
    showToast("暂无可复制内容");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    showToast("已复制全文");
  } catch {
    showToast("复制功能需要浏览器授权");
  }
});

disabledToggle.addEventListener("change", (event) => {
  setDisabledState(event.target.checked);
});

styleCards?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest?.(".style-card");
  if (!card) return;
  const input = card.querySelector("input[type='radio']");
  if (input) input.checked = true;
});

updateCounter();
loadStyles();
