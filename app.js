import { parseScreenshotText, createGroup } from "./parser.js";
import { downloadWordDocument } from "./export-word.js";

const STORAGE_KEY = "homework-checklist-data-v1";

const els = {
  todayLabel: document.getElementById("todayLabel"),
  progressCard: document.getElementById("progressCard"),
  progressFill: document.getElementById("progressFill"),
  progressText: document.getElementById("progressText"),
  imageInput: document.getElementById("imageInput"),
  uploadArea: document.getElementById("uploadArea"),
  previewWrap: document.getElementById("previewWrap"),
  previewImage: document.getElementById("previewImage"),
  clearImageBtn: document.getElementById("clearImageBtn"),
  recognizeBtn: document.getElementById("recognizeBtn"),
  manualAddBtn: document.getElementById("manualAddBtn"),
  ocrStatus: document.getElementById("ocrStatus"),
  reviewCard: document.getElementById("reviewCard"),
  toggleRawTextBtn: document.getElementById("toggleRawTextBtn"),
  rawText: document.getElementById("rawText"),
  teacherInput: document.getElementById("teacherInput"),
  subjectInput: document.getElementById("subjectInput"),
  reviewItems: document.getElementById("reviewItems"),
  addReviewItemBtn: document.getElementById("addReviewItemBtn"),
  cancelReviewBtn: document.getElementById("cancelReviewBtn"),
  confirmReviewBtn: document.getElementById("confirmReviewBtn"),
  checklistEmpty: document.getElementById("checklistEmpty"),
  checklistGroups: document.getElementById("checklistGroups"),
  exportWordBtn: document.getElementById("exportWordBtn"),
  historyList: document.getElementById("historyList"),
  clearHistoryBtn: document.getElementById("clearHistoryBtn"),
};

let selectedImageFile = null;
let reviewDraftItems = [];

function todayKey() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatTodayLabel() {
  const now = new Date();
  const weekNames = ["日", "一", "二", "三", "四", "五", "六"];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 周${weekNames[now.getDay()]}`;
}

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : { days: {} };
  } catch {
    return { days: {} };
  }
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getTodayGroups() {
  const store = loadStore();
  return store.days[todayKey()]?.groups ?? [];
}

function setTodayGroups(groups) {
  const store = loadStore();
  const key = todayKey();
  store.days[key] = {
    date: key,
    groups,
    updatedAt: new Date().toISOString(),
  };
  saveStore(store);
}

function setStatus(message, type = "") {
  els.ocrStatus.textContent = message;
  els.ocrStatus.className = `status-text${type ? ` ${type}` : ""}`;
}

function updateProgress(groups) {
  const items = groups.flatMap((group) => group.items);
  if (!items.length) {
    els.progressCard.hidden = true;
    return;
  }

  const doneCount = items.filter((item) => item.done).length;
  const percent = Math.round((doneCount / items.length) * 100);

  els.progressCard.hidden = false;
  els.progressFill.style.width = `${percent}%`;
  els.progressText.textContent = `已完成 ${doneCount} / ${items.length}`;
}

function renderReviewItems() {
  els.reviewItems.innerHTML = "";

  reviewDraftItems.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "review-item";

    const label = document.createElement("span");
    label.className = "review-index";
    label.textContent = `${index + 1}.`;

    const input = document.createElement("textarea");
    input.value = item.text;
    input.placeholder = "任务内容";
    input.rows = Math.min(4, Math.max(2, Math.ceil(item.text.length / 24)));
    input.addEventListener("input", () => {
      reviewDraftItems[index].text = input.value;
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "btn btn-danger btn-sm";
    removeBtn.textContent = "删除";
    removeBtn.addEventListener("click", () => {
      reviewDraftItems.splice(index, 1);
      renderReviewItems();
    });

    row.append(label, input, removeBtn);
    els.reviewItems.appendChild(row);
  });
}

function openReviewPanel(parsed) {
  els.reviewCard.hidden = false;
  els.teacherInput.value = parsed.teacher || "";
  els.subjectInput.value = parsed.subject || "";
  els.rawText.textContent = parsed.rawText || "";
  els.rawText.hidden = true;

  reviewDraftItems = parsed.items.length
    ? parsed.items.map((item) => ({ ...item }))
    : [{ id: crypto.randomUUID(), text: "", done: false, order: 1 }];

  renderReviewItems();
  els.reviewCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeReviewPanel() {
  els.reviewCard.hidden = true;
  reviewDraftItems = [];
}

function renderChecklist() {
  const groups = getTodayGroups();

  els.checklistEmpty.hidden = groups.length > 0;
  els.checklistGroups.innerHTML = "";

  groups.forEach((group) => {
    const block = document.createElement("section");
    block.className = "group-block";

    const title = document.createElement("div");
    title.className = "group-title";

    const heading = document.createElement("h3");
    const teacherLabel = group.teacher ? `${group.teacher}老师` : "未分类";
    const subjectLabel = group.subject ? ` · ${group.subject}` : "";
    heading.textContent = `${teacherLabel}${subjectLabel}`;

    const meta = document.createElement("span");
    meta.className = "group-meta";
    const doneCount = group.items.filter((item) => item.done).length;
    meta.textContent = `${doneCount}/${group.items.length}`;

    const actions = document.createElement("div");
    actions.className = "group-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger btn-sm";
    deleteBtn.textContent = "删除组";
    deleteBtn.addEventListener("click", () => {
      const nextGroups = getTodayGroups().filter((entry) => entry.id !== group.id);
      setTodayGroups(nextGroups);
      renderAll();
    });

    title.append(heading, meta, actions);
    actions.appendChild(deleteBtn);
    block.appendChild(title);

    group.items.forEach((item, index) => {
      const row = document.createElement("label");
      row.className = "task-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.done;
      checkbox.addEventListener("change", () => {
        const nextGroups = getTodayGroups().map((entry) => {
          if (entry.id !== group.id) {
            return entry;
          }
          return {
            ...entry,
            items: entry.items.map((current) =>
              current.id === item.id ? { ...current, done: checkbox.checked } : current
            ),
          };
        });
        setTodayGroups(nextGroups);
        renderAll();
      });

      const text = document.createElement("span");
      text.className = `task-text${item.done ? " done" : ""}`;
      text.textContent = `${index + 1}. ${item.text}`;

      row.append(checkbox, text);
      block.appendChild(row);
    });

    els.checklistGroups.appendChild(block);
  });

  updateProgress(groups);
}

function renderHistory() {
  const store = loadStore();
  const entries = Object.values(store.days)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14);

  els.historyList.innerHTML = "";

  if (!entries.length) {
    els.historyList.innerHTML = `<p class="muted">暂无历史记录</p>`;
    return;
  }

  entries.forEach((entry) => {
    const itemCount = entry.groups.flatMap((group) => group.items).length;
    const row = document.createElement("div");
    row.className = "history-item";

    const info = document.createElement("div");
    info.innerHTML = `<strong>${entry.date}</strong><div class="muted">${itemCount} 条任务</div>`;

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "btn btn-secondary btn-sm";
    openBtn.textContent = entry.date === todayKey() ? "今天" : "打开";
    openBtn.addEventListener("click", () => {
      if (entry.date !== todayKey()) {
        alert("当前版本默认编辑“今日清单”。历史日期可在导出 Word 时选择对应日期文件。");
      }
      renderAll();
    });

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.className = "btn btn-primary btn-sm";
    exportBtn.textContent = "导出";
    exportBtn.addEventListener("click", () => {
      try {
        downloadWordDocument({ dateKey: entry.date, groups: entry.groups });
      } catch (error) {
        alert(error.message);
      }
    });

    actions.append(openBtn, exportBtn);
    row.append(info, actions);
    els.historyList.appendChild(row);
  });
}

function renderAll() {
  els.todayLabel.textContent = formatTodayLabel();
  renderChecklist();
  renderHistory();
}

function resetImageSelection() {
  selectedImageFile = null;
  els.imageInput.value = "";
  els.previewWrap.hidden = true;
  els.previewImage.removeAttribute("src");
  els.recognizeBtn.disabled = true;
  setStatus("");
}

function handleImageSelected(file) {
  if (!file) {
    return;
  }

  selectedImageFile = file;
  els.previewWrap.hidden = false;
  els.previewImage.src = URL.createObjectURL(file);
  els.recognizeBtn.disabled = false;
  setStatus("图片已准备好，点击“识别文字”开始。");
}

async function recognizeImage() {
  if (!selectedImageFile) {
    setStatus("请先选择一张截图。", "error");
    return;
  }

  els.recognizeBtn.disabled = true;
  setStatus("正在识别，请稍候…");

  try {
    const result = await Tesseract.recognize(selectedImageFile, "chi_sim+eng", {
      logger: (message) => {
        if (message.status === "recognizing text") {
          const percent = Math.round((message.progress || 0) * 100);
          setStatus(`正在识别… ${percent}%`);
        }
      },
    });

    const text = result.data.text?.trim();
    if (!text) {
      setStatus("没有识别到文字，请换一张更清晰的截图，或改用手动添加。", "error");
      openReviewPanel({ teacher: "", subject: "", items: [], rawText: "" });
      return;
    }

    const parsed = parseScreenshotText(text);
    openReviewPanel(parsed);
    setStatus(`识别完成，共找到 ${parsed.items.length} 条任务，请确认后加入清单。`, "success");
  } catch (error) {
    console.error(error);
    setStatus("识别失败，请重试或改用手动添加。", "error");
  } finally {
    els.recognizeBtn.disabled = false;
  }
}

function confirmReview() {
  const items = reviewDraftItems
    .map((item, index) => ({
      ...item,
      text: item.text.trim(),
      order: index + 1,
      done: false,
    }))
    .filter((item) => item.text);

  if (!items.length) {
    alert("请至少填写一条任务。");
    return;
  }

  const group = createGroup({
    teacher: els.teacherInput.value.trim(),
    subject: els.subjectInput.value.trim(),
    items,
  });

  setTodayGroups([...getTodayGroups(), group]);
  closeReviewPanel();
  resetImageSelection();
  renderAll();
  setStatus("已加入今日清单。", "success");
}

els.imageInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  handleImageSelected(file);
});

els.clearImageBtn.addEventListener("click", resetImageSelection);
els.recognizeBtn.addEventListener("click", recognizeImage);

els.manualAddBtn.addEventListener("click", () => {
  openReviewPanel({ teacher: "", subject: "", items: [], rawText: "" });
});

els.addReviewItemBtn.addEventListener("click", () => {
  reviewDraftItems.push({
    id: crypto.randomUUID(),
    text: "",
    done: false,
    order: reviewDraftItems.length + 1,
  });
  renderReviewItems();
});

els.cancelReviewBtn.addEventListener("click", closeReviewPanel);
els.confirmReviewBtn.addEventListener("click", confirmReview);

els.toggleRawTextBtn.addEventListener("click", () => {
  els.rawText.hidden = !els.rawText.hidden;
});

els.exportWordBtn.addEventListener("click", () => {
  try {
    downloadWordDocument({
      dateKey: todayKey(),
      groups: getTodayGroups(),
    });
  } catch (error) {
    alert(error.message);
  }
});

els.clearHistoryBtn.addEventListener("click", () => {
  if (!confirm("确定清空所有历史记录吗？")) {
    return;
  }
  saveStore({ days: {} });
  renderAll();
});

renderAll();
