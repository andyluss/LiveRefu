// 专注会话的纯逻辑：不碰 DOM / Three.js，便于 Node 测试。
export const DURATIONS = [1, 15, 25, 45];
export const DEFAULT_DURATION = 25;

export function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }

export function createSession(minutes = DEFAULT_DURATION) {
  const total = clamp(Number(minutes) || DEFAULT_DURATION, 1, 180) * 60;
  return {
    duration: total,
    remaining: total,
    elapsed: 0,
    running: false,
    completed: false,
    startedAt: null,
  };
}

export function startSession(session) {
  if (session.completed) return session;
  return { ...session, running: true, startedAt: session.startedAt ?? Date.now() };
}

export function pauseSession(session) {
  return { ...session, running: false };
}

export function resetSession(session) {
  return createSession(session.duration / 60);
}

export function tickSession(session, dtSeconds) {
  if (!session.running || session.completed) return session;
  const next = Math.max(0, session.remaining - Math.max(0, dtSeconds));
  return {
    ...session,
    remaining: next,
    elapsed: session.duration - next,
    running: next > 0,
    completed: next <= 0,
  };
}

export function progress(session) {
  return session.duration > 0 ? clamp(session.elapsed / session.duration, 0, 1) : 0;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function moodFor(progressValue) {
  if (progressValue <= 0) return 'arrive';
  if (progressValue < 0.55) return 'settle';
  if (progressValue < 0.9) return 'deep';
  return 'return';
}

export function recordSession(state, minutes, intention) {
  const sessions = [...(state.sessions ?? [])];
  sessions.unshift({
    minutes,
    intention: intention || '安静地坐一会儿',
    at: new Date().toISOString(),
  });
  return {
    ...state,
    sessions: sessions.slice(0, 12),
    totalMinutes: (state.totalMinutes ?? 0) + minutes,
    plantLevel: Math.min(4, (state.plantLevel ?? 0) + (minutes >= 10 ? 1 : 0)),
  };
}

export function loadState(raw) {
  if (!raw || typeof raw !== 'object') {
    return { sessions: [], totalMinutes: 0, plantLevel: 0, duration: DEFAULT_DURATION, intention: '', audio: { rain: .25, wind: .12, vinyl: .18, hum: .2, muted: false } };
  }
  return {
    sessions: Array.isArray(raw.sessions) ? raw.sessions.slice(0, 12) : [],
    totalMinutes: Number(raw.totalMinutes) || 0,
    plantLevel: clamp(Number(raw.plantLevel) || 0, 0, 4),
    duration: DURATIONS.includes(Number(raw.duration)) ? Number(raw.duration) : DEFAULT_DURATION,
    intention: typeof raw.intention === 'string' ? raw.intention.slice(0, 120) : '',
    audio: { rain: .25, wind: .12, vinyl: .18, hum: .2, muted: false, ...(raw.audio || {}) },
  };
}
