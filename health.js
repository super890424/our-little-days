// ==========================================================
// 🌱 Our Little Days｜健康日記
// ==========================================================

const HEALTH_API_URL =
  "https://script.google.com/macros/s/AKfycbwEJGlmngyKuU571HDdigsJUvqkUk6LsTwLAnIfj0bFah6LrUkdoLELZiRK9vN-GMlU/exec";

const HEALTH_TOKEN_KEY = "veggie-baby-token";
const HEALTH_AUTHOR_KEY = "health-diary-author";

// ==========================================================
// 👤 身份設定
// ==========================================================

const HEALTH_AUTHORS = {
  BIG: {
    icon: "🐕",
    name: "大朋友",
    waterTarget: 2000,
  },

  SMALL: {
    icon: "💃",
    name: "小朋友",
    waterTarget: 2000,
  },
};

// ==========================================================
// 🌱 健康項目最高分
// ==========================================================
//
// 蔬菜 2
// 水果 1
// 蛋白質 1
// 運動 2
// 喝水 3
// 睡眠 1
//
// 總分 10
// ==========================================================

const HEALTH_MAX_SCORE = 10;

let currentAuthor = localStorage.getItem(HEALTH_AUTHOR_KEY) || "SMALL";

let selectedDate = new Date();
let currentMonth = new Date();

let healthRecords = [];

let healthForm = {
  veggie: 0,
  fruit: 0,
  protein: 0,
  exercise: 0,
  water: 0,
  sleep: 0,
};

// ==========================================================
// 🔐 Token
// ==========================================================

function getHealthToken() {
  return sessionStorage.getItem(HEALTH_TOKEN_KEY) || "";
}

// ==========================================================
// 📅 日期
// ==========================================================

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMonth(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function formatDisplayDate(dateString) {
  const parts = dateString.split("-");

  if (parts.length !== 3) {
    return dateString;
  }

  return `${parts[0]} 年 ${Number(parts[1])} 月 ${Number(parts[2])} 日`;
}

// ==========================================================
// 👤 身份 UI
// ==========================================================

function updateAuthorUI() {
  const buttons = document.querySelectorAll(".health-identity-button");

  buttons.forEach(function (button) {
    const isActive = button.dataset.author === currentAuthor;

    button.classList.toggle("active", isActive);
  });

  const author = HEALTH_AUTHORS[currentAuthor];

  if (!author) {
    return;
  }

  // 更新目前身份
  const currentAuthorElement = document.getElementById("current-health-author");

  if (currentAuthorElement) {
    currentAuthorElement.textContent = `${author.icon} ${author.name}`;
  }

  // 更新喝水目標
  const target = document.getElementById("health-water-target");

  if (target) {
    target.textContent = `今天的目標：${author.waterTarget} ml`;
  }
}

// ==========================================================
// 🌐 GET
// ==========================================================

async function getHealthMonth(month) {
  const token = getHealthToken();

  if (!token) {
    throw new Error("LOGIN_REQUIRED");
  }

  const query = new URLSearchParams();

  query.set("action", "healthMonth");
  query.set("month", month);
  query.set("token", token);
  query.set("t", Date.now());

  const response = await fetch(HEALTH_API_URL + "?" + query.toString());

  if (!response.ok) {
    throw new Error("HTTP " + response.status);
  }

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "健康日記讀取失敗");
  }

  return Array.isArray(data.records) ? data.records : [];
}

// ==========================================================
// 📤 POST｜健康日記
// ==========================================================

async function saveHealthRecord(payload) {
  const token = getHealthToken();

  if (!token) {
    throw new Error("LOGIN_REQUIRED");
  }

  payload.token = token;

  const formData = new URLSearchParams();

  formData.append("payload", JSON.stringify(payload));

  await fetch(HEALTH_API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
    },
    body: formData.toString(),
  });

  // 給 Apps Script 時間寫入 Google Sheet
  await new Promise(function (resolve) {
    setTimeout(resolve, 1200);
  });

  return true;
}

// ==========================================================
// 🔍 找目前日期＋身份的紀錄
// ==========================================================

function getSelectedRecord() {
  const date = formatDate(selectedDate);

  return (
    healthRecords.find(function (record) {
      return (
        record.date === date &&
        String(record.author).toUpperCase() === currentAuthor
      );
    }) || null
  );
}

// ==========================================================
// 🧮 水分分數
// ==========================================================
//
// 每個人的目標不同：
//
// BIG   1500 ml
// SMALL 2000 ml
//
// >= 目標       3 分
// >= 75% 目標   2 分
// >= 50% 目標   1 分
// < 50%        0 分
// ==========================================================

function calculateWaterScore(amount) {
  const author = HEALTH_AUTHORS[currentAuthor];

  if (!author) {
    return 0;
  }

  const water = Number(amount) || 0;
  const target = author.waterTarget;

  if (water >= target) {
    return 3;
  }

  if (water >= target * 0.75) {
    return 2;
  }

  if (water >= target * 0.5) {
    return 1;
  }

  return 0;
}

// ==========================================================
// 🧮 計算總分
// ==========================================================

function calculateHealthScore() {
  return (
    Number(healthForm.veggie) +
    Number(healthForm.fruit) +
    Number(healthForm.protein) +
    Number(healthForm.exercise) +
    calculateWaterScore(healthForm.water) +
    Number(healthForm.sleep)
  );
}

// ==========================================================
// 🟢 狀態
// ==========================================================

function getHealthStatus(score) {
  if (score >= 8) {
    return {
      icon: "🟢",
      text: "今天超棒",
    };
  }

  if (score >= 4) {
    return {
      icon: "🟡",
      text: "普通的一天",
    };
  }

  return {
    icon: "🔵",
    text: "待加強",
  };
}

// ==========================================================
// 📊 更新分數 UI
// ==========================================================

function updateHealthStatus() {
  const score = calculateHealthScore();

  const scoreElement = document.getElementById("health-score");

  const statusElement = document.getElementById("health-status");

  if (scoreElement) {
    scoreElement.textContent = score;
  }

  if (statusElement) {
    const status = getHealthStatus(score);

    statusElement.textContent = `${status.icon} ${status.text}`;
  }

  updateTaskScores();
}

// ==========================================================
// 📊 更新每項分數
// ==========================================================

function updateTaskScores() {
  const veggieScore = document.getElementById("health-veggie-score");

  const fruitScore = document.getElementById("health-fruit-score");

  const proteinScore = document.getElementById("health-protein-score");

  const exerciseScore = document.getElementById("health-exercise-score");

  const waterScore = document.getElementById("health-water-score");

  const sleepScore = document.getElementById("health-sleep-score");

  if (veggieScore) {
    veggieScore.textContent = `${healthForm.veggie} / 2`;
  }

  if (fruitScore) {
    fruitScore.textContent = `${healthForm.fruit} / 1`;
  }

  if (proteinScore) {
    proteinScore.textContent = `${healthForm.protein} / 1`;
  }

  if (exerciseScore) {
    exerciseScore.textContent = `${healthForm.exercise} / 2`;
  }

  if (waterScore) {
    waterScore.textContent = `${calculateWaterScore(healthForm.water)} / 3`;
  }

  if (sleepScore) {
    sleepScore.textContent = `${healthForm.sleep} / 1`;
  }
}

// ==========================================================
// 🎨 更新選項按鈕
// ==========================================================

function updateOptionButtons() {
  const buttons = document.querySelectorAll(".health-option");

  buttons.forEach(function (button) {
    const field = button.dataset.field;
    const value = Number(button.dataset.value);

    const active = Number(healthForm[field]) === value;

    button.classList.toggle("active", active);
  });
}

// ==========================================================
// 📝 載入目前日期紀錄
// ==========================================================

function loadSelectedRecord() {
  const record = getSelectedRecord();

  if (!record) {
    healthForm = {
      veggie: 0,
      fruit: 0,
      protein: 0,
      exercise: 0,
      water: 0,
      sleep: 0,
    };

    renderForm();
    return;
  }

  healthForm = {
    veggie: Number(record.veggie) || 0,
    fruit: Number(record.fruit) || 0,
    protein: Number(record.protein) || 0,
    exercise: Number(record.exercise) || 0,
    water: Number(record.water) || 0,
    sleep: Number(record.sleep) || 0,
  };

  renderForm();
}

// ==========================================================
// 🎨 Render 表單
// ==========================================================

function renderForm() {
  const waterElement = document.getElementById("health-water");

  if (waterElement) {
    waterElement.textContent = healthForm.water;
  }

  updateOptionButtons();
  updateHealthStatus();
}

// ==========================================================
// 📅 顯示目前日期
// ==========================================================

function renderSelectedDate() {
  const element = document.getElementById("health-selected-date");

  if (!element) {
    return;
  }

  element.textContent = formatDisplayDate(formatDate(selectedDate));
}

// ==========================================================
// 📅 日期切換
// ==========================================================

function setupDateButtons() {
  const previous = document.getElementById("health-prev-date");

  const next = document.getElementById("health-next-date");

  if (previous) {
    previous.addEventListener("click", function () {
      selectedDate = new Date(selectedDate);
      selectedDate.setDate(selectedDate.getDate() - 1);

      currentMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
      );

      renderSelectedDate();
      renderCalendar();
      loadSelectedRecord();
    });
  }

  if (next) {
    next.addEventListener("click", function () {
      selectedDate = new Date(selectedDate);
      selectedDate.setDate(selectedDate.getDate() + 1);

      currentMonth = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        1,
      );

      renderSelectedDate();
      renderCalendar();
      loadSelectedRecord();
    });
  }
}

// ==========================================================
// 👤 身份切換
// ==========================================================

function setupAuthorButtons() {
  document
    .querySelectorAll(".health-identity-button")
    .forEach(function (button) {
      button.addEventListener("click", async function () {
        const nextAuthor = button.dataset.author;

        if (!HEALTH_AUTHORS[nextAuthor]) {
          return;
        }

        currentAuthor = nextAuthor;

        localStorage.setItem(HEALTH_AUTHOR_KEY, currentAuthor);

        updateAuthorUI();

        await loadCurrentMonth();
      });
    });
}

// ==========================================================
// 🥬 健康選項
// ==========================================================

function setupHealthOptions() {
  document.querySelectorAll(".health-option").forEach(function (button) {
    button.addEventListener("click", function () {
      const field = button.dataset.field;

      const value = Number(button.dataset.value);

      if (!(field in healthForm)) {
        return;
      }

      healthForm[field] = value;

      updateOptionButtons();
      updateHealthStatus();
    });
  });
}

// ==========================================================
// 💧 喝水
// ==========================================================

function setupWaterButtons() {
  const minus = document.getElementById("health-water-minus");

  const plus = document.getElementById("health-water-plus");

  if (minus) {
    minus.addEventListener("click", function () {
      healthForm.water = Math.max(0, Number(healthForm.water) - 100);

      renderForm();
    });
  }

  if (plus) {
    plus.addEventListener("click", function () {
      healthForm.water = Number(healthForm.water) + 100;

      renderForm();
    });
  }
}

// ==========================================================
// 💾 儲存
// ==========================================================

async function handleSave() {
  const button = document.getElementById("health-save-button");

  const date = formatDate(selectedDate);

  if (button) {
    button.disabled = true;
    button.textContent = "正在記錄 ☁️";
  }

  try {
    await saveHealthRecord({
      action: "addHealthDiary",

      date: date,

      author: currentAuthor,

      veggie: Number(healthForm.veggie),
      fruit: Number(healthForm.fruit),
      protein: Number(healthForm.protein),
      exercise: Number(healthForm.exercise),
      water: Number(healthForm.water),
      sleep: Number(healthForm.sleep),
    });

    await loadCurrentMonth();

    alert("今天的健康日記已經記下來了 🌱");
  } catch (error) {
    console.error("健康日記儲存失敗：", error);

    if (error.message === "LOGIN_REQUIRED") {
      window.location.href = "index.html";
      return;
    }

    if (error.message === "SAVE_NOT_CONFIRMED") {
      alert(
        "POST 已送出，但重新讀取時找不到這筆資料 😢\n\n" +
          "請確認 Apps Script 是否部署最新版。",
      );
    } else {
      alert("健康日記儲存失敗 😢\n\n" + "錯誤：" + (error.message || error));
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "儲存今天的健康日記 🌱";
    }
  }
}

// ==========================================================
// 💾 儲存按鈕
// ==========================================================

function setupSaveButton() {
  const button = document.getElementById("health-save-button");

  if (!button) {
    return;
  }

  button.addEventListener("click", handleSave);
}

// ==========================================================
// 📅 月曆
// ==========================================================

function renderCalendar() {
  const title = document.getElementById("health-calendar-title");

  const grid = document.getElementById("health-calendar-grid");

  if (!title || !grid) {
    return;
  }

  const year = currentMonth.getFullYear();

  const month = currentMonth.getMonth();

  title.textContent = `${year} 年 ${month + 1} 月`;

  grid.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 前面的空白
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");

    empty.className = "health-calendar-day empty";

    grid.appendChild(empty);
  }

  // 每一天
  for (let day = 1; day <= daysInMonth; day++) {
    const button = document.createElement("button");

    button.type = "button";

    button.className = "health-calendar-day";

    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (formatDate(selectedDate) === dateString) {
      button.classList.add("selected");
    }

    const record = healthRecords.find(function (item) {
      return (
        item.date === dateString &&
        String(item.author).toUpperCase() === currentAuthor
      );
    });

    const number = document.createElement("div");

    number.className = "health-calendar-day-number";

    number.textContent = day;

    button.appendChild(number);

    if (record) {
      const status = getRecordStatus(record);

      if (status) {
        const statusElement = document.createElement("div");

        statusElement.className = "health-calendar-status";

        statusElement.textContent = status.icon;

        button.appendChild(statusElement);
      }
    }

    button.addEventListener("click", function () {
      selectedDate = new Date(year, month, day);

      renderSelectedDate();
      renderCalendar();
      loadSelectedRecord();
    });

    grid.appendChild(button);
  }
}

// ==========================================================
// 📊 計算資料庫紀錄的分數
// ==========================================================

function getRecordScore(record) {
  const author = HEALTH_AUTHORS[String(record.author).toUpperCase()];

  if (!author) {
    return 0;
  }

  return (
    (Number(record.veggie) || 0) +
    (Number(record.fruit) || 0) +
    (Number(record.protein) || 0) +
    (Number(record.exercise) || 0) +
    calculateWaterScoreForAuthor(
      Number(record.water) || 0,
      author.waterTarget,
    ) +
    (Number(record.sleep) || 0)
  );
}

function calculateWaterScoreForAuthor(amount, target) {
  if (amount >= target) {
    return 3;
  }

  if (amount >= target * 0.75) {
    return 2;
  }

  if (amount >= target * 0.5) {
    return 1;
  }

  return 0;
}

function getRecordStatus(record) {
  if (!record) {
    return null;
  }

  const score = getRecordScore(record);

  return {
    score: score,
    ...getHealthStatus(score),
  };
}

// ==========================================================
// 📊 月統計
// ==========================================================

function renderMonthlySummary() {
  const summary = {
    BIG: {
      good: 0,
      normal: 0,
      rest: 0,
      totalScore: 0,
      days: 0,
    },
    SMALL: {
      good: 0,
      normal: 0,
      rest: 0,
      totalScore: 0,
      days: 0,
    },
  };

  healthRecords.forEach(function (record) {
    const author = String(record.author || "").toUpperCase();

    if (!summary[author]) {
      return;
    }

    const status = getRecordStatus(record);

    if (!status) {
      return;
    }

    summary[author].days++;
    summary[author].totalScore += status.score;

    if (status.text === "今天超棒") {
      summary[author].good++;
    } else if (status.text === "普通的一天") {
      summary[author].normal++;
    } else {
      summary[author].rest++;
    }
  });

  // ==========================================================
  // 🐕 大朋友
  // ==========================================================

  const bigAverage =
    summary.BIG.days > 0
      ? (summary.BIG.totalScore / summary.BIG.days).toFixed(1)
      : "0.0";

  const bigAverageElement = document.getElementById("health-big-average");

  const bigGoodElement = document.getElementById("health-big-good");

  const bigNormalElement = document.getElementById("health-big-normal");

  const bigRestElement = document.getElementById("health-big-rest");

  if (bigAverageElement) {
    bigAverageElement.textContent = bigAverage;
  }

  if (bigGoodElement) {
    bigGoodElement.textContent = summary.BIG.good;
  }

  if (bigNormalElement) {
    bigNormalElement.textContent = summary.BIG.normal;
  }

  if (bigRestElement) {
    bigRestElement.textContent = summary.BIG.rest;
  }

  // ==========================================================
  // 💃 小朋友
  // ==========================================================

  const smallAverage =
    summary.SMALL.days > 0
      ? (summary.SMALL.totalScore / summary.SMALL.days).toFixed(1)
      : "0.0";

  const smallAverageElement = document.getElementById("health-small-average");

  const smallGoodElement = document.getElementById("health-small-good");

  const smallNormalElement = document.getElementById("health-small-normal");

  const smallRestElement = document.getElementById("health-small-rest");

  if (smallAverageElement) {
    smallAverageElement.textContent = smallAverage;
  }

  if (smallGoodElement) {
    smallGoodElement.textContent = summary.SMALL.good;
  }

  if (smallNormalElement) {
    smallNormalElement.textContent = summary.SMALL.normal;
  }

  if (smallRestElement) {
    smallRestElement.textContent = summary.SMALL.rest;
  }
}

// ==========================================================
// 📅 月份切換
// ==========================================================

function setupMonthButtons() {
  const previous = document.getElementById("health-prev-month");

  const next = document.getElementById("health-next-month");

  if (previous) {
    previous.addEventListener("click", async function () {
      currentMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1,
      );

      await loadCurrentMonth();
    });
  }

  if (next) {
    next.addEventListener("click", async function () {
      currentMonth = new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1,
      );

      await loadCurrentMonth();
    });
  }
}

// ==========================================================
// 🌐 載入月份
// ==========================================================

async function loadCurrentMonth() {
  try {
    healthRecords = await getHealthMonth(formatMonth(currentMonth));

    renderCalendar();
    renderMonthlySummary();
    loadSelectedRecord();
  } catch (error) {
    console.error("健康日記載入失敗：", error);

    if (error.message === "LOGIN_REQUIRED") {
      window.location.href = "index.html";

      return;
    }

    console.error(error);
  }
}

// ==========================================================
// 🚀 啟動
// ==========================================================

document.addEventListener("DOMContentLoaded", async function () {
  if (!getHealthToken()) {
    window.location.href = "index.html";

    return;
  }

  renderSelectedDate();
  updateAuthorUI();

  setupAuthorButtons();
  setupDateButtons();
  setupHealthOptions();
  setupWaterButtons();
  setupSaveButton();
  setupMonthButtons();

  await loadCurrentMonth();
});
