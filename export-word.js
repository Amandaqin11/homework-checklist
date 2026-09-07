function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDateLabel(dateKey) {
  const date = new Date(`${dateKey}T00:00:00`);
  const weekNames = ["日", "一", "二", "三", "四", "五", "六"];
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 星期${weekNames[date.getDay()]}`;
}

function checkboxSymbol(done) {
  return done ? "☑" : "☐";
}

export function buildWordHtml({ dateKey, groups }) {
  const allItems = groups.flatMap((group) => group.items);
  const doneCount = allItems.filter((item) => item.done).length;
  const title = `作业清单 - ${formatDateLabel(dateKey)}`;

  const groupSections = groups.map((group) => {
    const teacherLabel = group.teacher ? `${escapeHtml(group.teacher)}老师` : "未分类";
    const subjectLabel = group.subject ? `（${escapeHtml(group.subject)}）` : "";

    const rows = group.items.map((item, index) => `
      <tr>
        <td style="width:48px;text-align:center;">${index + 1}</td>
        <td>${escapeHtml(item.text)}</td>
        <td style="width:72px;text-align:center;font-size:16pt;">${checkboxSymbol(item.done)}</td>
      </tr>
    `).join("");

    return `
      <h2 style="font-size:14pt;margin:18px 0 8px;">${teacherLabel}${subjectLabel}</h2>
      <table border="1" cellspacing="0" cellpadding="8" style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#eef2ff;">
            <th style="width:48px;">序号</th>
            <th>任务内容</th>
            <th style="width:72px;">完成情况</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }).join("");

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(title)}</title>
        <style>
          @page { size: A4; margin: 2cm; }
          body { font-family: "Microsoft YaHei", "PingFang SC", SimSun, sans-serif; color: #111827; }
          h1 { font-size: 20pt; margin: 0 0 8px; }
          .meta { color: #4b5563; margin-bottom: 18px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">完成进度：${doneCount} / ${allItems.length}</p>
        ${groupSections || "<p>今日暂无任务。</p>"}
      </body>
    </html>
  `;
}

export function downloadWordDocument({ dateKey, groups }) {
  if (!groups.length) {
    throw new Error("今日还没有任务，无法导出。");
  }

  const html = buildWordHtml({ dateKey, groups });
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `作业清单_${dateKey}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
