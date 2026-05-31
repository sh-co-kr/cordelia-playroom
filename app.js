import {
  PRICES,
  STORAGE_KEY,
  STATUS_LABELS,
  formatMoney,
  loadRooms,
  openSession,
  saveRooms,
  tickRooms
} from "./shared.js";

const app = document.querySelector("#app");
const USER_PIN = "0220";

const state = {
  screen: "login",
  pin: "",
  rooms: loadRooms(),
  selectedRoomId: "",
  contact: "",
  duration: "",
  agreed: false,
  message: "",
  messageType: "error"
};

function selectedRoom() {
  return state.rooms.find((room) => room.id === state.selectedRoomId);
}

function render() {
  app.innerHTML =
    state.screen === "login" ? renderLoginView() : renderUserView();
  bindEvents();
}

function renderLoginView() {
  const dots = Array.from({ length: 4 }, (_, index) => {
    const filled = index < state.pin.length ? " is-filled" : "";
    return `<span class="pin-dot${filled}" aria-hidden="true"></span>`;
  }).join("");

  return `
    <main class="phone-shell login-view">
      <h1 class="brand-title">Hotel Cordelia</h1>
      <div class="brand-kicker">HOTEL & RESORT</div>
      <div class="brand-rule" aria-hidden="true"></div>
      <p class="login-subtitle">플레이룸 이용 시스템</p>
      <button class="pin-button" type="button" aria-label="입장 코드 입력">
        <span class="pin-dots">${dots}</span>
      </button>
      <div class="login-message" aria-live="polite">${state.message}</div>
      <input
        class="pin-input"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="4"
        aria-label="입장 코드"
        value="${state.pin}"
      />
    </main>
  `;
}

function roomLabel(room) {
  const isRunning = room.status === "running";
  const status = STATUS_LABELS[room.status] || STATUS_LABELS.available;
  const minutes = Math.max(0, room.remaining);

  return `
    <span>
      <span class="room-number">${room.id}호</span>
      <span class="room-status">${status}</span>
      ${isRunning ? `<span class="room-time">${minutes}분 남음</span>` : ""}
    </span>
  `;
}

function renderUserView() {
  const fee = PRICES[state.duration] ?? 0;
  const messageClass =
    state.messageType === "success"
      ? "form-message is-success"
      : "form-message";

  const roomTiles = state.rooms
    .map((room) => {
      const statusClass = ` is-${room.status}`;
      const selected = room.id === state.selectedRoomId ? " is-selected" : "";
      const disabled = room.status !== "available" ? "disabled" : "";
      return `
        <button
          class="room-tile${statusClass}${selected}"
          type="button"
          data-room-id="${room.id}"
          aria-pressed="${room.id === state.selectedRoomId}"
          ${disabled}
        >
          ${roomLabel(room)}
        </button>
      `;
    })
    .join("");

  return `
    <main class="phone-shell management-view">
      <h1 class="screen-title">Cordelia Playroom</h1>
      <section class="room-grid" aria-label="플레이룸 현황">
        ${roomTiles}
      </section>
      <form class="form-stack" novalidate>
        <input
          class="field contact-field"
          type="tel"
          inputmode="numeric"
          autocomplete="tel"
          placeholder="연락처 (숫자만)"
          aria-label="연락처"
          value="${state.contact}"
        />
        <label class="select-wrap" aria-label="이용 시간">
          <select class="duration-field">
            <option value="" ${state.duration === "" ? "selected" : ""}>이용 시간 선택</option>
            <option value="30" ${state.duration === "30" ? "selected" : ""}>30분</option>
            <option value="60" ${state.duration === "60" ? "selected" : ""}>60분</option>
            <option value="90" ${state.duration === "90" ? "selected" : ""}>90분</option>
            <option value="120" ${state.duration === "120" ? "selected" : ""}>120분</option>
          </select>
        </label>
      </form>
      <div class="fee-panel" aria-live="polite">요금: ${formatMoney(fee)}원</div>
      <div class="notice">
        <strong>[이용 안내]</strong> 금연 및 외부 음식 반입 금지입니다. 기물 파손 시 변상이 청구됩니다.
      </div>
      <label class="check-row">
        <input class="agree-field" type="checkbox" ${state.agreed ? "checked" : ""} />
        <span>이용 수칙 동의</span>
      </label>
      <div class="action-stack">
        <button class="primary-action" type="button">체크인 시작</button>
        <button class="secondary-action" type="button">로그아웃</button>
      </div>
      <div class="${messageClass}" aria-live="polite">${state.message}</div>
    </main>
  `;
}

function bindEvents() {
  if (state.screen === "login") {
    const pinButton = document.querySelector(".pin-button");
    const pinInput = document.querySelector(".pin-input");
    pinButton.addEventListener("click", () => pinInput.focus());
    pinInput.addEventListener("input", (event) => {
      state.pin = event.target.value.replace(/\D/g, "").slice(0, 4);
      if (state.pin.length === 4 && state.pin === USER_PIN) {
        setTimeout(() => {
          state.screen = "user";
          state.pin = "";
          state.message = "";
          render();
        }, 160);
      } else if (state.pin.length === 4) {
        state.pin = "";
        state.message = "입장 코드가 일치하지 않습니다.";
        render();
      } else {
        state.message = "";
        render();
      }
    });
    pinInput.focus();
    return;
  }

  document.querySelectorAll(".room-tile").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedRoomId = button.dataset.roomId;
      state.message = "";
      render();
    });
  });

  document.querySelector(".contact-field").addEventListener("input", (event) => {
    state.contact = event.target.value.replace(/\D/g, "").slice(0, 11);
    event.target.value = state.contact;
  });

  document
    .querySelector(".duration-field")
    .addEventListener("change", (event) => {
      state.duration = event.target.value;
      render();
    });

  document.querySelector(".agree-field").addEventListener("change", (event) => {
    state.agreed = event.target.checked;
  });

  document.querySelector(".primary-action").addEventListener("click", () => {
    startCheckIn();
  });

  document.querySelector(".secondary-action").addEventListener("click", () => {
    state.screen = "login";
    state.pin = "";
    state.message = "";
    render();
  });
}

function startCheckIn() {
  const room = selectedRoom();
  if (!room) {
    setMessage("체크인할 객실을 선택해 주세요.", "error");
    return;
  }

  if (room.status !== "available") {
    setMessage(`${room.id}호는 현재 이용할 수 없습니다.`, "error");
    return;
  }

  if (state.contact.length < 8) {
    setMessage("연락처를 숫자로 입력해 주세요.", "error");
    return;
  }

  if (!state.duration) {
    setMessage("이용 시간을 선택해 주세요.", "error");
    return;
  }

  if (!state.agreed) {
    setMessage("이용 수칙 동의가 필요합니다.", "error");
    return;
  }

  openSession(room, {
    contact: state.contact,
    duration: state.duration
  });
  state.message = `${room.id}호 체크인이 시작되었습니다.`;
  state.messageType = "success";
  state.selectedRoomId = "";
  state.contact = "";
  state.duration = "";
  state.agreed = false;
  saveRooms(state.rooms);
  render();
}

function setMessage(text, type) {
  state.message = text;
  state.messageType = type;
  render();
}

setInterval(() => {
  state.rooms = loadRooms();
  if (tickRooms(state.rooms)) {
    saveRooms(state.rooms);
  }

  if (state.screen === "user") {
    render();
  }
}, 60_000);

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) {
    state.rooms = loadRooms();
    render();
  }
});

render();
