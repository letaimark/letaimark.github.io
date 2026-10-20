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
    glyph: lucideAppleIcon(),
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
const PENDING_STORAGE_KEY = "ritmus-vitamin-pending-v1";
const MIGRATION_STORAGE_PREFIX = "ritmus-vitamin-migrated";
const CLOUD_CAPABLE = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
const today = stripTime(new Date());

let state = loadState();
let pendingChanges = loadPendingChanges();
let activeView = "week";
let currentWeekStart = startOfWeek(today);
let currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedMobileDate = new Date(today);
let dialogDate = null;
let toastTimer = null;
let supabaseClient = null;
let currentUser = null;
let household = null;
let realtimeChannel = null;
let cloudReady = false;
let authChangeSubscription = null;
let isFlushingCloud = false;

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
  mobileProgressValue: document.querySelector("#mobileProgressValue"),
  mobileProgressLabel: document.querySelector("#mobileProgressLabel"),
  mobileProgressCount: document.querySelector("#mobileProgressCount"),
  calendarGrid: document.querySelector("#calendarGrid"),
  saveState: document.querySelector("#saveState"),
  toast: document.querySelector("#toast"),
  dayDialog: document.querySelector("#dayDialog"),
  dialogTitle: document.querySelector("#dialogTitle"),
  dialogProgress: document.querySelector("#dialogProgress"),
  dialogHabits: document.querySelector("#dialogHabits"),
  dialogClose: document.querySelector("#dialogClose"),
  cloudGate: document.querySelector("#cloudGate"),
  loginPanel: document.querySelector("#loginPanel"),
  loginForm: document.querySelector("#loginForm"),
  emailInput: document.querySelector("#emailInput"),
  householdPanel: document.querySelector("#householdPanel"),
  createHouseholdButton: document.querySelector("#createHouseholdButton"),
  joinHouseholdForm: document.querySelector("#joinHouseholdForm"),
  inviteCodeInput: document.querySelector("#inviteCodeInput"),
  cloudMessage: document.querySelector("#cloudMessage"),
  accountButton: document.querySelector("#accountButton"),
  accountDialog: document.querySelector("#accountDialog"),
  accountClose: document.querySelector("#accountClose"),
  accountEmail: document.querySelector("#accountEmail"),
  householdName: document.querySelector("#householdName"),
  inviteCode: document.querySelector("#inviteCode"),
  copyInviteButton: document.querySelector("#copyInviteButton"),
  signOutButton: document.querySelector("#signOutButton"),
  dataNotice: document.querySelector("#dataNotice"),
};

init();

async function init() {
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

  elements.loginForm.addEventListener("submit", handleLoginSubmit);
  elements.createHouseholdButton.addEventListener("click", createHousehold);
  elements.joinHouseholdForm.addEventListener("submit", joinHousehold);
  elements.accountButton.addEventListener("click", openAccountDialog);
  elements.accountClose.addEventListener("click", () => elements.accountDialog.close());
  elements.accountDialog.addEventListener("click", (event) => {
    if (event.target === elements.accountDialog) elements.accountDialog.close();
  });
  elements.copyInviteButton.addEventListener("click", copyInviteLink);
  elements.signOutButton.addEventListener("click", signOut);
  window.addEventListener("online", () => {
    if (cloudReady) flushPendingChanges();
  });

  render();

  if (CLOUD_CAPABLE) {
    await initializeCloud();
  } else {
    setSaveStatus("Mentve helyben", "local");
  }
}

function loadState(storageKey = STORAGE_KEY) {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadPendingChanges() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PENDING_STORAGE_KEY));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLocalState() {
  const storageKey = household ? `${STORAGE_KEY}-${household.id}` : STORAGE_KEY;
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function savePendingChanges() {
  localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pendingChanges));
}

function setSaveStatus(message, mode = "saved") {
  elements.saveState.classList.toggle("is-saving", mode === "saving");
  elements.saveState.classList.toggle("is-offline", mode === "offline");
  elements.saveState.classList.toggle("is-cloud", mode === "cloud");
  elements.saveState.querySelector("span:last-child").textContent = message;
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
  elements.mobileProgressValue.textContent = `${percent}%`;
  elements.mobileProgressLabel.textContent = "Heti haladás";
  elements.mobileProgressCount.textContent = `${completed} / ${total} teljesítve`;

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
      <div class="summary-icon" aria-hidden="true">${lucideAppleIcon()}</div>
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
  elements.mobileProgressValue.textContent = `${percent}%`;
  elements.mobileProgressLabel.textContent = "Havi haladás";
  elements.mobileProgressCount.textContent = `${monthDone} / ${monthTotal} teljesítve`;

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

  saveLocalState();

  if (cloudReady) {
    queueCloudChange(key, habitId, isAdding);
    setSaveStatus("Szinkronizálás…", "saving");
    flushPendingChanges();
    showToast(isAdding ? "✓ Bejelölve · szinkronizálás" : "Jelölés visszavonva");
  } else {
    setSaveStatus("Mentve helyben", "local");
    showToast(isAdding ? "✓ Bejelölve és mentve" : "Jelölés visszavonva");
  }

  if (rerender) render();
}

async function initializeCloud() {
  const config = globalThis.RITMUS_SUPABASE_CONFIG;

  if (!globalThis.supabase?.createClient) {
    try {
      await loadSupabaseLibrary();
    } catch {
      setSaveStatus("Felhő nem elérhető", "offline");
      elements.dataNotice.textContent = "A felhő nem érhető el; az adatok átmenetileg ezen az eszközön maradnak.";
      return;
    }
  }

  if (!config?.url || !config?.publishableKey || !globalThis.supabase?.createClient) {
    setSaveStatus("Felhő nem elérhető", "offline");
    elements.dataNotice.textContent = "A felhő nem érhető el; az adatok átmenetileg ezen az eszközön maradnak.";
    return;
  }

  supabaseClient = globalThis.supabase.createClient(config.url, config.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    showCloudGate("login");
    setCloudMessage(humanizeError(error), "error");
  } else {
    await handleSession(data.session);
  }

  const authListener = supabaseClient.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => handleSession(session), 0);
  });
  authChangeSubscription = authListener.data.subscription;
}

function loadSupabaseLibrary() {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.crossOrigin = "anonymous";
    script.onload = resolve;
    script.onerror = reject;
    document.head.append(script);
  });
}

async function handleSession(session) {
  const nextUserId = session?.user?.id || null;
  if (nextUserId === currentUser?.id && household) return;

  currentUser = session?.user || null;
  cloudReady = false;

  if (!currentUser) {
    household = null;
    stopRealtime();
    elements.accountButton.hidden = true;
    elements.dataNotice.textContent = "Jelentkezz be a közös szinkronizáláshoz.";
    setSaveStatus("Belépés szükséges", "offline");
    showCloudGate("login");
    return;
  }

  setSaveStatus("Kapcsolódás…", "saving");
  const membership = await loadMembership();

  if (!membership) {
    const inviteFromUrl = new URLSearchParams(location.search).get("invite");
    if (inviteFromUrl) {
      elements.inviteCodeInput.value = normalizeInviteCode(inviteFromUrl);
      await joinHousehold();
      return;
    }

    showCloudGate("household");
    setSaveStatus("Tracker választása", "offline");
    return;
  }

  await connectToHousehold(membership);
}

async function loadMembership() {
  const { data, error } = await supabaseClient
    .from("household_members")
    .select("household_id, household:households(id, name, invite_code)")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) {
      showCloudGate("household");
      setCloudMessage("Az adatbázis még nincs beállítva. Futtasd le a supabase-setup.sql fájlt a Supabase SQL Editorban.", "error");
    } else {
      setCloudMessage(humanizeError(error), "error");
    }
    return null;
  }

  return data?.household || null;
}

async function connectToHousehold(nextHousehold) {
  household = nextHousehold;
  elements.cloudGate.hidden = true;
  elements.accountButton.hidden = false;
  elements.accountEmail.textContent = currentUser.email || "Bejelentkezett felhasználó";
  elements.householdName.textContent = household.name;
  elements.inviteCode.textContent = household.invite_code.toUpperCase();
  elements.dataNotice.textContent = "Közös, valós időben szinkronizált adatok.";
  setCloudMessage("");

  await migrateLocalStateOnce();
  await loadRemoteState();
  subscribeToRealtime();
  cloudReady = true;
  setSaveStatus("Szinkronizálva", "cloud");
  await flushPendingChanges();
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  if (!supabaseClient) return;

  const email = elements.emailInput.value.trim();
  if (!email) return;

  setFormBusy(elements.loginForm, true);
  setCloudMessage("Küldjük a belépési linket…");

  const { error } = await supabaseClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: cloudRedirectUrl(),
    },
  });

  setFormBusy(elements.loginForm, false);
  if (error) {
    setCloudMessage(humanizeError(error), "error");
    return;
  }

  setCloudMessage("Elküldtük. Nyisd meg az e-mailben kapott linket ezen az eszközön.", "success");
}

async function createHousehold() {
  if (!supabaseClient || !currentUser) return;
  elements.createHouseholdButton.disabled = true;
  setCloudMessage("A közös tracker létrehozása…");

  const { data, error } = await supabaseClient.rpc("create_household", { p_name: "Közös ritmus" });
  elements.createHouseholdButton.disabled = false;

  if (error) {
    setCloudMessage(humanizeError(error), "error");
    return;
  }

  const createdHousehold = Array.isArray(data) ? data[0] : data;
  if (createdHousehold) await connectToHousehold(createdHousehold);
}

async function joinHousehold(event) {
  event?.preventDefault?.();
  if (!supabaseClient || !currentUser) return;

  const inviteCode = normalizeInviteCode(elements.inviteCodeInput.value || new URLSearchParams(location.search).get("invite"));
  if (!inviteCode) {
    setCloudMessage("Írd be a 12 karakteres meghívókódot.", "error");
    return;
  }

  setFormBusy(elements.joinHouseholdForm, true);
  setCloudMessage("Csatlakozás a közös trackerhez…");
  const { data, error } = await supabaseClient.rpc("join_household", { p_invite_code: inviteCode });
  setFormBusy(elements.joinHouseholdForm, false);

  if (error) {
    setCloudMessage(humanizeError(error), "error");
    return;
  }

  const joinedHousehold = Array.isArray(data) ? data[0] : data;
  if (joinedHousehold) {
    removeInviteFromUrl();
    await connectToHousehold(joinedHousehold);
  }
}

async function signOut() {
  if (!supabaseClient) return;
  elements.accountDialog.close();
  stopRealtime();
  cloudReady = false;
  household = null;
  currentUser = null;
  state = loadState();
  render();
  await supabaseClient.auth.signOut();
  showCloudGate("login");
}

async function migrateLocalStateOnce() {
  const migrationKey = `${MIGRATION_STORAGE_PREFIX}-${household.id}`;
  if (localStorage.getItem(migrationKey) === "1") return;

  const changes = [];
  for (const [habitDate, habits] of Object.entries(state)) {
    for (const habitId of habits) {
      if (!HABITS.some((habit) => habit.id === habitId)) continue;
      changes.push({ householdId: household.id, habitDate, habitId, checked: true, updatedAt: new Date().toISOString() });
    }
  }

  for (const change of changes) {
    const { error } = await sendCloudChange(change);
    if (error) {
      setSaveStatus("Helyi adatok várakoznak", "offline");
      return;
    }
  }

  localStorage.setItem(migrationKey, "1");
}

async function loadRemoteState() {
  const { data, error } = await supabaseClient
    .from("habit_checks")
    .select("habit_date, habit_id, is_checked")
    .eq("household_id", household.id)
    .eq("is_checked", true);

  if (error) {
    setSaveStatus("Szinkronhiba", "offline");
    showToast(humanizeError(error));
    return;
  }

  const remoteState = {};
  for (const row of data || []) {
    if (!remoteState[row.habit_date]) remoteState[row.habit_date] = [];
    remoteState[row.habit_date].push(row.habit_id);
  }

  state = remoteState;
  saveLocalState();
  render();
}

function subscribeToRealtime() {
  stopRealtime();
  realtimeChannel = supabaseClient
    .channel(`habit-checks-${household.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "habit_checks",
        filter: `household_id=eq.${household.id}`,
      },
      (payload) => {
        const row = payload.new || payload.old;
        if (!row?.habit_date || !row?.habit_id) return;
        applyCloudRow(row);
      },
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") setSaveStatus("Szinkronizálva", "cloud");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setSaveStatus("Kapcsolódás…", "offline");
    });
}

function stopRealtime() {
  if (supabaseClient && realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
  realtimeChannel = null;
}

function applyCloudRow(row) {
  const dayState = new Set(state[row.habit_date] || []);
  if (row.is_checked) dayState.add(row.habit_id);
  else dayState.delete(row.habit_id);

  if (dayState.size) state[row.habit_date] = [...dayState];
  else delete state[row.habit_date];

  saveLocalState();
  render();
  if (elements.dayDialog.open) renderDialog();
}

function queueCloudChange(habitDate, habitId, checked) {
  const changeKey = `${household.id}:${habitDate}:${habitId}`;
  pendingChanges[changeKey] = {
    householdId: household.id,
    habitDate,
    habitId,
    checked,
    updatedAt: new Date().toISOString(),
  };
  savePendingChanges();
}

async function flushPendingChanges() {
  if (isFlushingCloud) return;

  if (!cloudReady || !navigator.onLine || !household) {
    if (Object.keys(pendingChanges).length) setSaveStatus("Szinkronra vár", "offline");
    return;
  }

  const changes = Object.entries(pendingChanges)
    .filter(([, change]) => !change.householdId || change.householdId === household.id)
    .sort(([, a], [, b]) => a.updatedAt.localeCompare(b.updatedAt));
  if (!changes.length) {
    setSaveStatus("Szinkronizálva", "cloud");
    return;
  }

  isFlushingCloud = true;
  setSaveStatus("Szinkronizálás…", "saving");
  let hadError = false;

  for (const [changeKey, change] of changes) {
    const { error } = await sendCloudChange(change);
    if (error) {
      hadError = true;
      break;
    }
    if (pendingChanges[changeKey]?.updatedAt === change.updatedAt) delete pendingChanges[changeKey];
    savePendingChanges();
  }

  if (hadError) {
    setSaveStatus("Szinkronra vár", "offline");
  } else {
    const hasMoreCurrentChanges = Object.values(pendingChanges).some(
      (change) => !change.householdId || change.householdId === household.id,
    );
    if (!hasMoreCurrentChanges) {
      await loadRemoteState();
      setSaveStatus("Szinkronizálva", "cloud");
    }
  }

  isFlushingCloud = false;
  if (!hadError && Object.values(pendingChanges).some((change) => !change.householdId || change.householdId === household.id)) {
    flushPendingChanges();
  }
}

function sendCloudChange(change) {
  return supabaseClient.rpc("set_habit_check", {
    p_household_id: change.householdId || household.id,
    p_habit_date: change.habitDate,
    p_habit_id: change.habitId,
    p_is_checked: change.checked,
    p_updated_at: change.updatedAt,
  });
}

function showCloudGate(view) {
  elements.cloudGate.hidden = false;
  elements.loginPanel.hidden = view !== "login";
  elements.householdPanel.hidden = view !== "household";
  if (view === "login") window.setTimeout(() => elements.emailInput.focus(), 40);
}

function setCloudMessage(message, type = "") {
  elements.cloudMessage.textContent = message;
  elements.cloudMessage.className = `cloud-message${type ? ` is-${type}` : ""}`;
}

function setFormBusy(form, busy) {
  form.querySelectorAll("input, button").forEach((control) => {
    control.disabled = busy;
  });
}

function openAccountDialog() {
  if (!household) return;
  elements.accountEmail.textContent = currentUser?.email || "Bejelentkezett felhasználó";
  elements.householdName.textContent = household.name;
  elements.inviteCode.textContent = household.invite_code.toUpperCase();
  elements.accountDialog.showModal();
}

async function copyInviteLink() {
  if (!household) return;
  const inviteUrl = new URL(location.href);
  inviteUrl.search = "";
  inviteUrl.hash = "";
  inviteUrl.searchParams.set("invite", household.invite_code);

  try {
    await navigator.clipboard.writeText(inviteUrl.toString());
    showToast("Meghívólink kimásolva");
    elements.copyInviteButton.textContent = "Kimásolva ✓";
    window.setTimeout(() => {
      elements.copyInviteButton.textContent = "Meghívólink másolása";
    }, 1600);
  } catch {
    showToast(`Meghívókód: ${household.invite_code.toUpperCase()}`);
  }
}

function cloudRedirectUrl() {
  const redirectUrl = new URL(location.href);
  redirectUrl.hash = "";
  return redirectUrl.toString();
}

function normalizeInviteCode(value) {
  return String(value || "").trim().replace(/\s+/g, "").toLowerCase();
}

function removeInviteFromUrl() {
  const url = new URL(location.href);
  url.searchParams.delete("invite");
  history.replaceState({}, "", url);
}

function humanizeError(error) {
  const message = String(error?.message || "Ismeretlen hiba.");
  if (/rate limit/i.test(message)) return "Túl sok próbálkozás történt. Várj egy percet, majd próbáld újra.";
  if (/invalid login|email not confirmed/i.test(message)) return "A belépés nem sikerült. Ellenőrizd az e-mail-címet.";
  if (/fetch|network/i.test(message)) return "Nincs hálózati kapcsolat. A változás helyben megmarad.";
  return message;
}

function isMissingSchemaError(error) {
  return error?.code === "42P01" || /schema cache|does not exist|Could not find the table/i.test(error?.message || "");
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

function lucideAppleIcon() {
  return `
    <svg class="lucide lucide-apple" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 4-8 4-8s-1-4-4-4-2.5 1-4 1-2.5-1-4-1-4 2-4 6 1 7 4 7c1.25 0 2.5-1.06 4-1.06Z" />
      <path d="M10 2c1 .5 2 2 2 5" />
    </svg>
  `;
}

function checkSvg() {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" /></svg>`;
}
