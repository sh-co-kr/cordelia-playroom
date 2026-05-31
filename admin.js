import {
  ADMIN_SESSION_KEY,
  HISTORY_KEY,
  PRICES,
  STORAGE_KEY,
  STATUS_LABELS,
  closeSession,
  formatMoney,
  formatTime,
  loadHistory,
  loadRooms,
  maskContact,
  openSession,
  saveHistory,
  saveRooms,
  tickRooms
} from "./shared.js";

const app = document.querySelector("#admin-app");

const state = {
  authed: sessionStorage.getItem(ADMIN_SESSION_KEY) === "true",
  pin: "",
  rooms: loadRooms(),
  history: loadHistory(),
  selectedRoomId: "101",
  manualContact: "",
  manualDuration: "60",
  note: "",
  message: ""
};

function selectedRoom() {
  return state.rooms.find((room) => room.id === state.selectedRoomId) || state.rooms[0];
}

function refreshState() {
  state.rooms = loadRooms();
  state.history = loadHistory();
  if (!state.rooms.some((room) => room.id === state.selectedRoomId)) {
    state.selectedRoomId = state.rooms[0]?.id || "";
  }
}

function render() {
  refreshState();
  app.innerHTML = state.authed ? renderDashboard() : renderLogin();
  bindEvents();
}

function renderLogin() {
  return `
    <main class="admin-login">
      <section class="admin-login-card" aria-label="관리자 로그인">
        <h1 class="brand-title">Hotel Cordelia</h1>
        <p class="admin-kicker">Admin Dashboard</p>
        <input
          class="admin-pin"
          type="password"
          inputmode="numeric"
          maxlength="4"
          autocomplete="one-time-code"
          placeholder="••••"
          aria-label="관리자 PIN"
          value="${state.pin}"
        />
      </section>
    </main>
  `;
}

function renderDashboard() {
  const running = state.rooms.filter((room) => room.status === "running").length;
  const available = state.rooms.filter((room) => room.status === "available").length;
  const unavailable = state.rooms.length - running - available;
  const occupancy = Math.round((running / state.rooms.length) * 100);
  const todayRevenue = getTodayRevenue();

  return `
    <main class="admin-shell">
      <header class="admin-topbar">
        <div>
          <p class="admin-eyebrow">HOTEL CORDELIA</p>
          <h1 class="admin-title">플레이룸 관리</h1>
          <p class="admin-subtitle">실시간 객실 운영, 수동 입실, 이용 종료를 관리합니다.</p>
        </div>
        <div class="admin-actions">
          <a class="admin-link" href="./index.html">
            <span>사용자 화면</span>
          </a>
          <button class="admin-button" type="button" data-action="refresh">
            <span class="material-symbols-outlined" aria-hidden="true">refresh</span>
            <span>새로고침</span>
          </button>
          <button class="admin-button danger" type="button" data-action="reset">
            <span class="material-symbols-outlined" aria-hidden="true">restart_alt</span>
            <span>전체 초기화</span>
          </button>
          <button class="admin-button primary" type="button" data-action="logout">
            <span class="material-symbols-outlined" aria-hidden="true">logout</span>
            <span>로그아웃</span>
          </button>
        </div>
      </header>

      <section class="stats-grid" aria-label="운영 요약">
        ${renderStat("운영중", running, "실", "현재 이용 중인 플레이룸")}
        ${renderStat("예약가능", available, "실", "즉시 체크인 가능")}
        ${renderStat("관리 필요", unavailable, "실", "예약완료 또는 정비중", unavailable > 0 ? "danger" : "")}
        ${renderStat("오늘 매출", formatMoney(todayRevenue), "원", `가동률 ${occupancy}%`)}
      </section>

      <section class="dashboard-grid">
        <div>
          <section class="admin-panel">
            <div class="panel-header">
              <h2 class="panel-title">객실 현황</h2>
              <span class="panel-meta">총 ${state.rooms.length}실</span>
            </div>
            <div class="room-admin-grid">
              ${state.rooms.map(renderRoomCard).join("")}
            </div>
          </section>

          <section class="admin-panel table-panel">
            <div class="panel-header">
              <h2 class="panel-title">운영중 세션</h2>
              <span class="panel-meta">${running}건</span>
            </div>
            ${renderActiveTable()}
          </section>
        </div>

        <aside class="admin-panel detail-panel">
          <div class="panel-header">
            <h2 class="panel-title">선택 객실 제어</h2>
          </div>
          ${renderDetailPanel()}
        </aside>
      </section>

      <section class="admin-panel table-panel">
        <div class="panel-header">
          <h2 class="panel-title">최근 종료 내역</h2>
          <span class="panel-meta">최근 ${Math.min(state.history.length, 8)}건</span>
        </div>
        ${renderHistoryTable()}
      </section>
    </main>
  `;
}

function renderStat(label, value, unit, caption, tone = "") {
  return `
    <article class="stat-card ${tone ? `is-${tone}` : ""}">
      <span class="stat-label">${label}</span>
      <span class="stat-line">
        <span class="stat-value">${value}</span>
        <span class="stat-unit">${unit}</span>
      </span>
      <span class="stat-caption">${caption}</span>
    </article>
  `;
}

function renderRoomCard(room) {
  const selected = room.id === state.selectedRoomId ? " is-selected" : "";
  return `
    <article class="admin-room-card${selected}">
      <button class="room-card-main" type="button" data-select-room="${room.id}">
        <span class="room-card-head">
          <span class="room-admin-number">${room.id}호</span>
          ${renderStatus(room.status)}
        </span>
        <span class="room-admin-detail">
          ${roomFact("잔여", room.status === "running" ? `${room.remaining}분` : "-")}
          ${roomFact("연락처", maskContact(room.contact))}
          ${roomFact("요금", `${formatMoney(room.fee)}원`)}
        </span>
      </button>
      <div class="room-admin-actions">
        ${room.status === "running"
          ? `<button class="inline-action danger" type="button" data-action="end" data-room-id="${room.id}">종료</button>`
          : `<button class="inline-action" type="button" data-action="available" data-room-id="${room.id}">예약가능</button>`}
        <button class="inline-action" type="button" data-action="cleaning" data-room-id="${room.id}">정비중</button>
      </div>
    </article>
  `;
}

function roomFact(label, value) {
  return `<span><span>${label}</span><strong>${value}</strong></span>`;
}

function renderStatus(status) {
  return `<span class="status-pill is-${status}">${STATUS_LABELS[status]}</span>`;
}

function renderDetailPanel() {
  const room = selectedRoom();
  if (!room) return "";

  return `
    <div class="detail-body">
      <div class="detail-room-title">
        <strong>${room.id}호</strong>
        ${renderStatus(room.status)}
      </div>

      <dl class="detail-list">
        ${detailRow("연락처", maskContact(room.contact))}
        ${detailRow("이용 시간", room.duration ? `${room.duration}분` : "-")}
        ${detailRow("잔여 시간", room.status === "running" ? `${room.remaining}분` : "-")}
        ${detailRow("시작", formatTime(room.startedAt))}
        ${detailRow("종료 예정", formatTime(room.endsAt))}
        ${detailRow("요금", `${formatMoney(room.fee)}원`)}
      </dl>

      ${room.status === "available" ? renderManualCheckIn(room) : ""}

      <div class="detail-actions">
        ${room.status === "running"
          ? `
            <button class="admin-button primary action-block" type="button" data-action="extend" data-room-id="${room.id}">
              <span class="material-symbols-outlined" aria-hidden="true">timer</span>
              <span>30분 연장</span>
            </button>
            <button class="admin-button danger" type="button" data-action="end" data-room-id="${room.id}">이용 종료</button>
          `
          : `
            <button class="admin-button primary" type="button" data-action="available" data-room-id="${room.id}">예약가능</button>
            <button class="admin-button" type="button" data-action="reserved" data-room-id="${room.id}">예약완료</button>
          `}
        <button class="admin-button wide-action" type="button" data-action="cleaning" data-room-id="${room.id}">정비중으로 전환</button>
      </div>
      <div class="admin-message" aria-live="polite">${state.message}</div>
    </div>
  `;
}

function detailRow(label, value) {
  return `
    <div class="detail-row">
      <dt>${label}</dt>
      <dd>${value}</dd>
    </div>
  `;
}

function renderManualCheckIn(room) {
  const fee = PRICES[state.manualDuration] || 0;
  return `
    <form class="admin-form" data-manual-form="${room.id}" novalidate>
      <input
        class="admin-input manual-contact"
        type="tel"
        inputmode="numeric"
        placeholder="연락처"
        aria-label="수동 입실 연락처"
        value="${state.manualContact}"
      />
      <select class="admin-select manual-duration" aria-label="수동 입실 이용 시간">
        <option value="30" ${state.manualDuration === "30" ? "selected" : ""}>30분 / ${formatMoney(PRICES[30])}원</option>
        <option value="60" ${state.manualDuration === "60" ? "selected" : ""}>60분 / ${formatMoney(PRICES[60])}원</option>
        <option value="90" ${state.manualDuration === "90" ? "selected" : ""}>90분 / ${formatMoney(PRICES[90])}원</option>
        <option value="120" ${state.manualDuration === "120" ? "selected" : ""}>120분 / ${formatMoney(PRICES[120])}원</option>
      </select>
      <input
        class="admin-input manual-note"
        type="text"
        maxlength="40"
        placeholder="메모"
        aria-label="관리자 메모"
        value="${state.note}"
      />
      <button class="admin-button primary" type="submit">입실 처리 · ${formatMoney(fee)}원</button>
    </form>
  `;
}

function renderActiveTable() {
  const active = state.rooms.filter((room) => room.status === "running");
  const rows = active.length
    ? active
        .map(
          (room) => `
            <tr>
              <td data-label="객실">${room.id}호</td>
              <td data-label="연락처">${maskContact(room.contact)}</td>
              <td data-label="이용 시간">${room.duration}분</td>
              <td data-label="잔여">${room.remaining}분</td>
              <td data-label="종료 예정">${formatTime(room.endsAt)}</td>
              <td data-label="관리">
                <button class="inline-action danger" type="button" data-action="end" data-room-id="${room.id}">종료</button>
              </td>
            </tr>
          `
        )
        .join("")
    : `<tr><td class="empty-row" colspan="6">운영중인 세션이 없습니다.</td></tr>`;

  return `
    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>객실</th>
            <th>연락처</th>
            <th>이용 시간</th>
            <th>잔여</th>
            <th>종료 예정</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderHistoryTable() {
  const rows = state.history.slice(0, 8).length
    ? state.history
        .slice(0, 8)
        .map(
          (item) => `
            <tr>
              <td data-label="객실">${item.roomId}호</td>
              <td data-label="연락처">${maskContact(item.contact)}</td>
              <td data-label="이용">${item.duration || 0}분</td>
              <td data-label="요금">${formatMoney(item.fee)}원</td>
              <td data-label="종료">${formatTime(item.endedAt)}</td>
              <td data-label="처리">${item.actor === "user" ? "사용자" : "관리자"}</td>
            </tr>
          `
        )
        .join("")
    : `<tr><td class="empty-row" colspan="6">종료된 이용 내역이 없습니다.</td></tr>`;

  return `
    <div class="table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>객실</th>
            <th>연락처</th>
            <th>이용</th>
            <th>요금</th>
            <th>종료</th>
            <th>처리</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function bindEvents() {
  if (!state.authed) {
    const input = document.querySelector(".admin-pin");
    input.focus();
    input.addEventListener("input", (event) => {
      state.pin = event.target.value.replace(/\D/g, "").slice(0, 4);
      if (state.pin.length === 4) {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
        state.authed = true;
        state.pin = "";
      }
      render();
    });
    return;
  }

  document.querySelectorAll("[data-select-room]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRoomId = button.dataset.selectRoom;
      state.message = "";
      render();
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      handleAction(button.dataset.action, button.dataset.roomId);
    });
  });

  const manualForm = document.querySelector("[data-manual-form]");
  if (manualForm) {
    manualForm.addEventListener("submit", (event) => {
      event.preventDefault();
      handleManualCheckIn(manualForm.dataset.manualForm);
    });

    manualForm.querySelector(".manual-contact").addEventListener("input", (event) => {
      state.manualContact = event.target.value.replace(/\D/g, "").slice(0, 11);
      event.target.value = state.manualContact;
    });

    manualForm.querySelector(".manual-duration").addEventListener("change", (event) => {
      state.manualDuration = event.target.value;
      render();
    });

    manualForm.querySelector(".manual-note").addEventListener("input", (event) => {
      state.note = event.target.value.slice(0, 40);
    });
  }
}

function handleAction(action, roomId) {
  if (action === "logout") {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    state.authed = false;
    render();
    return;
  }

  if (action === "refresh") {
    render();
    return;
  }

  if (action === "reset") {
    if (confirm("모든 객실 상태와 종료 내역을 초기화할까요?")) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(HISTORY_KEY);
      state.message = "전체 상태를 초기화했습니다.";
      render();
    }
    return;
  }

  const room = state.rooms.find((item) => item.id === roomId);
  if (!room) return;

  if (action === "end") {
    endRoom(room, "available");
  }

  if (action === "extend" && room.status === "running") {
    room.remaining += 30;
    room.duration += 30;
    room.endsAt = new Date(new Date(room.endsAt || Date.now()).getTime() + 30 * 60_000).toISOString();
    state.message = `${room.id}호 이용 시간을 30분 연장했습니다.`;
  }

  if (action === "available") {
    setRoomStatus(room, "available");
  }

  if (action === "reserved") {
    setRoomStatus(room, "reserved");
  }

  if (action === "cleaning") {
    setRoomStatus(room, "cleaning");
  }

  saveRooms(state.rooms);
  render();
}

function handleManualCheckIn(roomId) {
  const room = state.rooms.find((item) => item.id === roomId);
  if (!room || room.status !== "available") return;

  if (state.manualContact.length < 8) {
    state.message = "연락처를 숫자로 입력해 주세요.";
    render();
    return;
  }

  openSession(room, {
    contact: state.manualContact,
    duration: state.manualDuration,
    note: state.note
  });
  state.message = `${room.id}호 입실 처리가 완료되었습니다.`;
  state.manualContact = "";
  state.note = "";
  saveRooms(state.rooms);
  render();
}

function endRoom(room, nextStatus) {
  if (room.status === "running") {
    const history = loadHistory();
    history.unshift(closeSession(room, "admin"));
    saveHistory(history);
  }

  room.status = nextStatus;
  state.message = `${room.id}호를 ${STATUS_LABELS[nextStatus]} 상태로 변경했습니다.`;
}

function setRoomStatus(room, status) {
  if (room.status === "running") {
    endRoom(room, status);
    return;
  }

  room.status = status;
  room.remaining = 0;
  room.contact = "";
  room.duration = 0;
  room.fee = 0;
  room.startedAt = "";
  room.endsAt = "";
  room.note = "";
  state.message = `${room.id}호를 ${STATUS_LABELS[status]} 상태로 변경했습니다.`;
}

function getTodayRevenue() {
  const today = new Date().toDateString();
  const closedRevenue = state.history
    .filter((item) => item.endedAt && new Date(item.endedAt).toDateString() === today)
    .reduce((sum, item) => sum + Number(item.fee || 0), 0);
  const activeRevenue = state.rooms
    .filter((room) => room.status === "running")
    .reduce((sum, room) => sum + Number(room.fee || 0), 0);

  return closedRevenue + activeRevenue;
}

setInterval(() => {
  state.rooms = loadRooms();
  if (tickRooms(state.rooms)) {
    saveRooms(state.rooms);
  }
  if (state.authed) {
    render();
  }
}, 60_000);

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === HISTORY_KEY) {
    render();
  }
});

render();
