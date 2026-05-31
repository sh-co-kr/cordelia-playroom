export const STORAGE_KEY = "cordelia-playroom-state";
export const HISTORY_KEY = "cordelia-playroom-history";
export const ADMIN_SESSION_KEY = "cordelia-admin-session";

export const ROOM_IDS = ["101", "102", "103", "104", "105", "106"];

export const PRICES = {
  30: 0,
  60: 0,
  90: 0,
  120: 0
};

export const STATUS_LABELS = {
  available: "예약가능",
  running: "운영중",
  reserved: "예약완료",
  cleaning: "정비중"
};

export function createInitialRooms() {
  return ROOM_IDS.map((id, index) => ({
    id,
    status: index === 0 ? "running" : "available",
    remaining: 0,
    contact: "",
    duration: 0,
    fee: 0,
    startedAt: "",
    endsAt: "",
    note: ""
  }));
}

export function normalizeRoom(room, index) {
  const fallback = createInitialRooms()[index];
  const status = STATUS_LABELS[room?.status] ? room.status : fallback.status;
  const duration = Number(room?.duration || 0);
  const remaining = Number.isFinite(Number(room?.remaining))
    ? Math.max(0, Number(room.remaining))
    : fallback.remaining;

  return {
    id: ROOM_IDS[index],
    status,
    remaining,
    contact: String(room?.contact || ""),
    duration,
    fee: Number(room?.fee || PRICES[duration] || 0),
    startedAt: String(room?.startedAt || ""),
    endsAt: String(room?.endsAt || ""),
    note: String(room?.note || "")
  };
}

export function loadRooms() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) {
      return ROOM_IDS.map((_, index) => normalizeRoom(saved[index], index));
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }

  return createInitialRooms();
}

export function saveRooms(rooms) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

export function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(HISTORY_KEY));
    if (Array.isArray(saved)) {
      return saved.slice(0, 80);
    }
  } catch {
    localStorage.removeItem(HISTORY_KEY);
  }

  return [];
}

export function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 80)));
}

export function formatMoney(value) {
  return new Intl.NumberFormat("ko-KR").format(Number(value || 0));
}

export function formatTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function maskContact(contact) {
  const digits = String(contact || "").replace(/\D/g, "");
  if (digits.length < 8) return "-";
  return `${digits.slice(0, 3)}-${digits.slice(3, -4).replace(/\d/g, "*")}-${digits.slice(-4)}`;
}

export function tickRooms(rooms) {
  let changed = false;
  rooms.forEach((room) => {
    if (room.status === "running" && room.remaining > 0) {
      room.remaining -= 1;
      changed = true;
    }
  });
  return changed;
}

export function openSession(room, details) {
  const duration = Number(details.duration);
  const startedAt = new Date();
  const endsAt = new Date(startedAt.getTime() + duration * 60_000);

  room.status = "running";
  room.remaining = duration;
  room.contact = String(details.contact || "").replace(/\D/g, "");
  room.duration = duration;
  room.fee = Number(PRICES[duration] || 0);
  room.startedAt = startedAt.toISOString();
  room.endsAt = endsAt.toISOString();
  room.note = String(details.note || "");
}

export function closeSession(room, actor = "admin") {
  const closedAt = new Date().toISOString();
  const historyItem = {
    id: `${room.id}-${Date.now()}`,
    roomId: room.id,
    contact: room.contact,
    duration: room.duration,
    fee: room.fee,
    startedAt: room.startedAt,
    endedAt: closedAt,
    actor
  };

  room.status = "available";
  room.remaining = 0;
  room.contact = "";
  room.duration = 0;
  room.fee = 0;
  room.startedAt = "";
  room.endsAt = "";
  room.note = "";

  return historyItem;
}
