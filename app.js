const HABITS = [
  {
    id: "vitamin-d",
    group: "morning",
    name: "D-vitamin",
    moment: "Reggel",
    detail: "A reggeli rutin része",
    glyph: "D",
    color: "#9a6a00",
    soft: "#f8eccb",
  },
  {
    id: "magnesium-am",
    group: "morning",
    name: "Magnézium",
    moment: "Reggel",
    detail: "Reggeli adag",
    glyph: "Mg",
    color: "#3f649f",
    soft: "#e6eefc",
  },
  {
    id: "zinc",
    group: "midday",
    name: "Cink",
    moment: "Napközben",
    detail: "Napközbeni adag",
    glyph: "Zn",
    color: "#8e513f",
    soft: "#fae9e3",
  },
  {
    id: "magnesium-pm",
    group: "evening",
    name: "Magnézium",
    moment: "Este",
    detail: "Esti adag",
    glyph: "Mg",
    color: "#5c4a92",
    soft: "#eee9fa",
  },
  {
    id: "fruit",
    group: "fruit",
    name: "Gyümölcs",
    moment: "Bármikor",
    detail: "Legalább egy adag",
    glyph: "●",
    color: "#426f3a",
    soft: "#e6f2df",
  },
];

const GROUPS = [
  {
    id: "morning",
    label: "Reggeli",
    note: "A nap indítása",
    color: "#8a650f",
    wash: "rgba(231, 185, 79, 0.075)",
    line: "rgba(154, 106, 0, 0.28)",
  },
  {
    id: "midday",
    label: "Napközben",
    note: "Déli ritmus",
    color: "#9a503b",
    wash: "rgba(240, 138, 108, 0.07)",
    line: "rgba(154, 80, 59, 0.25)",
  },
  {
    id: "evening",
    label: "Esti",
    note: "Napzáró rutin",
    color: "#5c4a92",
    wash: "rgba(132, 167, 239, 0.075)",
    line: "rgba(92, 74, 146, 0.24)",
  },
  {
    id: "fruit",
    label: "Gyümölcs",
    note: "Minden nap",
    color: "#426f3a",
    wash: "rgba(146, 189, 162, 0.095)",
    line: "rgba(66, 111, 58, 0.25)",
  },
];

const DAY_NAMES = ["Hét", "Ked", "Sze", "Csü", "Pén", "Szo", "Vas"];
const STORAGE_KEY = "ritmus-vitamin-tracker-v1";
const today = stripTime(new Date());

let state = loadState();
let activeView = "week";
let currentWeekStart = startOfWeek(today);
let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedMobileDate = new Date(today);
let dialogDate = null;
let toastTimer = null;

const elements = {
  weekTab: document.querySelector("#weekTab"),
  monthTab: document.querySelector("#monthTab"),
  weekView: document.querySelector("#weekView"),
  monthView: document.querySelector("#monthView"),
  periodPrev: document.querySelector("#periodPrev"),
  periodNext: document.querySelector("#periodNext"),
  periodLabel: document.querySelector("#periodLabel"),
  trackerTable: document.querySelector("#trackerTable"),
  mobileDayView: document.querySelector("#mobileDayView"),
  weekSummary: document.querySelector("#weekSummary"),
  progressOrbit: document.querySelector("#progressOrbit"),
  heroProgressValue: document.querySelector("#heroProgressValue"),
  completedCount: document.querySelector("#completedCount"),
  monthTitle: document.querySelector("#monthTitle"),
  monthPercent: document.querySelector("#monthPercent"),
  calendarGrid: document.querySelector("#calendarGrid"),
  saveState: document.querySelector("#saveState"),
  toast: document.querySelector("#toast"),
  dayDialog: document.querySelector("#dayDialog"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogProgress: document.querySelector("#dialogProgress"),
  dialogHabits: document.querySelector("#dialogHabits"),
  dialogClose: document.querySelector("#dialogClose"),
};

init();

function init() {
  document.querySelector("#footerYear").textContent = new Date().getFullYear();

  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  elements.periodPrev.addEventListener("click", () => movePeriod(-1));
  elements.periodNext.addEventListener("click", () => movePeriod(1));
  elements.periodLabel.addEventListener("click", jumpToCurrentPeriod);
  elements.dialogClose.addEventListener("click", () => elements.dayDialog.close());
  elements.dayDialog.addEventListener("click", (event) => {
    if (event.target === elements.dayDialog) elements.dayDialog.close();
  });

  document.addEventListener("keydown", (event) => {
    if (elements.dayDialog.open) return;
    if (event.key === "ArrowLeft" && (event.altKey || event.metaKey)) movePeriod(-1);
    if (event.key === "ArrowRight" && (event.altKey || event.metaKey)) movePeriod(1);
  });

  render();
}

function loadState() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  elements.saveState.classList.add("is-saving");
  elements.saveState.querySelector("span:last-child").textContent = "Mentés…";
  window.setTimeout(() => {
    elements.saveState.classList.remove("is-saving");
    elements.saveState.querySelector("span:last-child").textContent = "Mentve helyben";
  }, 420);
}

function setView(view) {
  activeView = view;
  const weekActive = view === "week";

  elements.weekTab.classList.toggle("is-active", weekActive);
  elements.monthTab.classList.toggle("is-active", !weekActive);
  elements.weekTab.setAttribute("aria-selected", String(weekActive));
  elements.monthTab.setAttribute("aria-selected", String(!weekActive));
  elements.weekView.classList.toggle("is-active", weekActive);
  elements.monthView.classList.toggle("is-active", !weekActive);
  elements.weekView.hidden = !weekActive;
  elements.monthView.hidden = weekActive;

  render();
}

function movePeriod(direction) {
  if (activeView === "week") {
    currentWeekStart = addDays(currentWeekStart, direction * 7);
    selectedMobileDate = addDays(currentWeekStart, clamp(dayIndex(selectedMobileDate), 0, 6));
  } else {
    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1);
  }
  render();
}

function jumpToCurrentPeriod() {
  if (activeView === "week") {
    currentWeekStart = startOfWeek(today);
    selectedMobileDate = new Date(today);
  } else {
    currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  render();
}

function render() {
  if (activeView === "week") {
    renderWeek();
  } else {
    renderMonth();
  }
}

function renderWeek() {
  const dates = Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index));
  const completed = dates.reduce((total, date) => total + completedForDate(date), 0);
  const total = dates.length * HABITS.length;
  const percent = Math.round((completed / total) * 100);

  elements.periodLabel.textContent = formatWeekRange(dates[0], dates[6]);
  elements.heroProgressValue.textContent = `${percent}%`;
  elements.completedCount.textContent = `${completed} / ${total}`;
  elements.progressOrbit.style.background = `conic-gradient(var(--ink) ${percent * 3.6}deg, rgba(23, 33, 27, 0.09) 0deg)`;

  renderWeekSummary(dates, completed, total);
  renderTable(dates);
  renderMobileDay(dates);
}

function renderWeekSummary(dates, completed, total) {
  const completeDays = dates.filter((date) => completedForDate(date) === HABITS.length).length;
  const fruitDays = dates.filter((date) => isComplete(date, "fruit")).length;
  const bestDay = dates.reduce(
    (best, date) => (completedForDate(date) > best.score ? { date, score: completedForDate(date) } : best),
    { date: dates[0], score: completedForDate(dates[0]) },
  );

  elements.weekSummary.innerHTML = `
    <div class="summary-item">
      <div class="summary-icon" aria-hidden="true">✓</div>
      <div><strong>${completed} jelölés</strong><span>${total - completed} van még hátra ezen a héten</span></div>
    </div>
    <div class="summary-item">
      <div class="summary-icon" aria-hidden="true">◎</div>
      <div><strong>${completeDays} teljes nap</strong><span>${completeDays ? "Szép, stabil ritmus" : "Az első teljes nap már közel van"}</span></div>
    </div>
    <div class="summary-item">
      <div class="summary-icon" aria-hidden="true">●</div>
      <div><strong>${fruitDays} gyümölcsös nap</strong><span>Legjobb: ${DAY_NAMES[dayIndex(bestDay.date)]} · ${bestDay.score}/5</span></div>
    </div>
  `;
}

function renderTable(dates) {
  const checkIcon = checkSvg();
  let html = `<div class="table-cell table-header corner">NAPI RUTIN</div>`;

  html += dates
    .map(
      (date, index) => `
        <div class="table-cell table-header day-heading ${sameDay(date, today) ? "is-today" : ""}">
          <strong>${DAY_NAMES[index]}</strong>
          <span>${date.getMonth() + 1}. ${date.getDate()}.</span>
        </div>
      `,
    )
    .join("");

  for (const [habitIndex, habit] of HABITS.entries()) {
    const group = getGroup(habit.group);
    const isGroupStart = habitIndex === 0 || HABITS[habitIndex - 1].group !== habit.group;
    const groupClasses = `habit-row-cell group-${group.id} ${isGroupStart ? "group-start" : ""}`;
    const sharedStyle = `${groupStyle(group)};--habit-color:${habit.color};--habit-soft:${habit.soft}`;

    html += `
      <div class="table-cell habit-label ${groupClasses}" style="${sharedStyle}">
        <span class="habit-glyph" aria-hidden="true">${habit.glyph}</span>
        <span class="habit-copy">
          <strong>${habit.name}</strong>
          <span class="moment-label"><i aria-hidden="true"></i>${group.label}</span>
        </span>
      </div>
    `;

    html += dates
      .map((date) => {
        const checked = isComplete(date, habit.id);
        return `
          <div class="table-cell check-cell ${groupClasses} ${sameDay(date, today) ? "is-today" : ""}" style="${groupStyle(group)}">
            <button
              class="check-button ${checked ? "is-checked" : ""}"
              type="button"
              role="checkbox"
              aria-checked="${checked}"
              aria-label="${habit.name}, ${habit.moment}, ${formatFullDate(date)}"
              data-date="${dateKey(date)}"
              data-habit="${habit.id}"
            >${checkIcon}</button>
          </div>
        `;
      })
      .join("");
  }

  elements.trackerTable.innerHTML = html;
  elements.trackerTable.querySelectorAll("[data-habit]").forEach((button) => {
    button.addEventListener("click", () => toggleHabit(parseDateKey(button.dataset.date), button.dataset.habit));
  });
}

function renderMobileDay(dates) {
  if (!dates.some((date) => sameDay(date, selectedMobileDate))) {
    selectedMobileDate = new Date(dates[0]);
  }

  elements.mobileDayView.innerHTML = `
    <div class="mobile-days" aria-label="Válassz napot">
      ${dates
        .map(
          (date, index) => `
            <button class="mobile-day-tab ${sameDay(date, selectedMobileDate) ? "is-selected" : ""}" type="button" data-mobile-date="${dateKey(date)}">
              <span>${DAY_NAMES[index]}</span><strong>${date.getDate()}</strong>
            </button>
          `,
        )
        .join("")}
    </div>
    <div class="mobile-habit-groups">
      ${GROUPS.map((group) => `
        <section class="mobile-habit-group" style="${groupStyle(group)}" aria-labelledby="mobile-group-${group.id}">
          ${groupTitleTemplate(group, `mobile-group-${group.id}`)}
          <div class="mobile-habit-list">
            ${habitsForGroup(group.id).map((habit) => mobileHabitTemplate(selectedMobileDate, habit)).join("")}
          </div>
        </section>
      `).join("")}
    </div>
  `;

  elements.mobileDayView.querySelectorAll("[data-mobile-date]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedMobileDate = parseDateKey(button.dataset.mobileDate);
      renderMobileDay(dates);
    });
  });

  elements.mobileDayView.querySelectorAll("[data-mobile-habit]").forEach((button) => {
    button.addEventListener("click", () => toggleHabit(selectedMobileDate, button.dataset.mobileHabit));
  });
}

function mobileHabitTemplate(date, habit) {
  const checked = isComplete(date, habit.id);
  return `
    <button class="mobile-habit" type="button" data-mobile-habit="${habit.id}" aria-pressed="${checked}">
      <span class="habit-glyph" style="--habit-color:${habit.color};--habit-soft:${habit.soft}" aria-hidden="true">${habit.glyph}</span>
      <span class="mobile-habit-copy"><strong>${habit.name}</strong><span>${habit.moment} · ${habit.detail}</span></span>
      <span class="check-button ${checked ? "is-checked" : ""}">${checkSvg()}</span>
    </button>
  `;
}

function renderMonth() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const first = new Date(year, month, 1);
  const gridStart = startOfWeek(first);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthDates = Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1));
  const monthDone = monthDates.reduce((sum, date) => sum + completedForDate(date), 0);
  const monthTotal = daysInMonth * HABITS.length;
  const percent = Math.round((monthDone / monthTotal) * 100);

  elements.periodLabel.textContent = currentMonth.toLocaleDateString("hu-HU", { year: "numeric", month: "long" });
  elements.monthTitle.textContent = currentMonth.toLocaleDateString("hu-HU", { year: "numeric", month: "long" });
  elements.monthPercent.textContent = `${percent}%`;

  elements.calendarGrid.innerHTML = Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const score = completedForDate(date);
    const outside = date.getMonth() !== month;
    return `
      <button
        class="calendar-day ${outside ? "is-outside" : ""} ${sameDay(date, today) ? "is-today" : ""} ${score === HABITS.length ? "is-complete" : ""}"
        type="button"
        data-calendar-date="${dateKey(date)}"
        aria-label="${formatFullDate(date)}, ${score} az 5 szokásból teljesítve"
      >
        <span class="calendar-number">${date.getDate()}</span>
        <span class="mini-checks" aria-hidden="true">${HABITS.map((habit) => `<i class="${isComplete(date, habit.id) ? "is-done" : ""}"></i>`).join("")}</span>
        <span class="calendar-score">${score}/5</span>
      </button>
    `;
  }).join("");

  elements.calendarGrid.querySelectorAll("[data-calendar-date]").forEach((button) => {
    button.addEventListener("click", () => openDayDialog(parseDateKey(button.dataset.calendarDate)));
  });
}

function openDayDialog(date) {
  dialogDate = date;
  renderDialog();
  elements.dayDialog.showModal();
}

function renderDialog() {
  if (!dialogDate) return;
  const completed = completedForDate(dialogDate);
  const percent = Math.round((completed / HABITS.length) * 100);
  elements.dialogTitle.textContent = dialogDate.toLocaleDateString("hu-HU", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  elements.dialogProgress.innerHTML = `
    <div class="dialog-progress-track"><div class="dialog-progress-fill" style="--progress:${percent / 100}"></div></div>
    <div class="dialog-progress-copy"><span>Napi haladás</span><strong>${completed} / ${HABITS.length}</strong></div>
  `;

  elements.dialogHabits.innerHTML = GROUPS.map((group) => `
    <section class="dialog-habit-group" style="${groupStyle(group)}" aria-labelledby="dialog-group-${group.id}">
      ${groupTitleTemplate(group, `dialog-group-${group.id}`)}
      <div class="dialog-habit-list">
        ${habitsForGroup(group.id).map((habit) => {
          const checked = isComplete(dialogDate, habit.id);
          return `
            <button class="dialog-habit" type="button" data-dialog-habit="${habit.id}" aria-pressed="${checked}">
              <span class="habit-glyph" style="--habit-color:${habit.color};--habit-soft:${habit.soft}" aria-hidden="true">${habit.glyph}</span>
              <span class="dialog-habit-copy"><strong>${habit.name}</strong><span>${habit.detail}</span></span>
              <span class="check-button ${checked ? "is-checked" : ""}">${checkSvg()}</span>
            </button>
          `;
        }).join("")}
      </div>
    </section>
  `).join("");

  elements.dialogHabits.querySelectorAll("[data-dialog-habit]").forEach((button) => {
    button.addEventListener("click", () => {
      toggleHabit(dialogDate, button.dataset.dialogHabit, false);
      renderDialog();
      renderMonth();
    });
  });
}

function toggleHabit(date, habitId, rerender = true) {
  const key = dateKey(date);
  const dayState = new Set(state[key] || []);
  const isAdding = !dayState.has(habitId);

  if (isAdding) dayState.add(habitId);
  else dayState.delete(habitId);

  if (dayState.size) state[key] = [...dayState];
  else delete state[key];

  saveState();
  showToast(isAdding ? "✓ Bejelölve és mentve" : "Jelölés visszavonva");
  if (rerender) render();
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = setTimeout(() => elements.toast.classList.remove("is-visible"), 1400);
}

function isComplete(date, habitId) {
  return (state[dateKey(date)] || []).includes(habitId);
}

function completedForDate(date) {
  return (state[dateKey(date)] || []).filter((id) => HABITS.some((habit) => habit.id === id)).length;
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const copy = stripTime(date);
  const offset = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - offset);
  return copy;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function dayIndex(date) {
  return (date.getDay() + 6) % 7;
}

function sameDay(a, b) {
  return dateKey(a) === dateKey(b);
}

function formatWeekRange(start, end) {
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.getFullYear()}. ${shortMonth(start)} ${start.getDate()}. — ${end.getFullYear()}. ${shortMonth(end)} ${end.getDate()}.`;
  }
  if (start.getMonth() !== end.getMonth()) {
    return `${shortMonth(start)} ${start.getDate()}. — ${shortMonth(end)} ${end.getDate()}.`;
  }
  return `${start.getFullYear()}. ${shortMonth(start)} ${start.getDate()}–${end.getDate()}.`;
}

function shortMonth(date) {
  return date.toLocaleDateString("hu-HU", { month: "short" }).replace(".", "");
}

function formatFullDate(date) {
  return date.toLocaleDateString("hu-HU", { year: "numeric", month: "long", day: "numeric", weekday: "long" });
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getGroup(groupId) {
  return GROUPS.find((group) => group.id === groupId);
}

function habitsForGroup(groupId) {
  return HABITS.filter((habit) => habit.group === groupId);
}

function groupStyle(group) {
  return `--group-color:${group.color};--group-wash:${group.wash};--group-line:${group.line}`;
}

function groupTitleTemplate(group, id) {
  return `
    <div class="routine-group-title" id="${id}">
      <span class="routine-group-dot" aria-hidden="true"></span>
      <strong>${group.label}</strong>
      <small>${group.note}</small>
    </div>
  `;
}

function checkSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" /></svg>`;
}
