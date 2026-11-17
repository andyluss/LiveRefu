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
    deadline: null,
  };
}

// 开始/继续时记录绝对截止时间：计时不依赖 requestAnimationFrame。
export function startSession(session, now = Date.now()) {
  if (session.completed) return session;
  const remaining = Math.max(0, Number(session.remaining) || 0);
  return {
    ...session,
    running: true,
    startedAt: session.startedAt ?? now,
    deadline: now + remaining * 1000,
  };
}

// 按墙钟把剩余时间追平；后台标签页恢复时也能一次补上。
export function syncSession(session, now = Date.now()) {
  if (!session.running) return session;
  const deadline = Number.isFinite(session.deadline) ? session.deadline : now + Math.max(0, session.remaining) * 1000;
  const remaining = Math.max(0, (deadline - now) / 1000);
  return {
    ...session,
    remaining,
    elapsed: session.duration - remaining,
    deadline,
    running: remaining > 0,
    completed: remaining <= 0,
  };
}

export function pauseSession(session, now = Date.now()) {
  const paused = syncSession(session, now);
  return { ...paused, running: false, deadline: null };
}

export function resetSession(session) {
  return createSession(session.duration / 60);
}

// 纯步进接口保留给测试/工具；主循环用 syncSession + 绝对 deadline。
export function tickSession(session, dtSeconds) {
  if (!session.running || session.completed) return session;
  const dt = Math.max(0, dtSeconds);
  const next = Math.max(0, session.remaining - dt);
  return {
    ...session,
    remaining: next,
    elapsed: session.duration - next,
    deadline: Number.isFinite(session.deadline) ? session.deadline - dt * 1000 : null,
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
    return { sessions: [], totalMinutes: 0, plantLevel: 0, duration: DEFAULT_DURATION, intention: '', scene: 'night', audio: { rain: .25, wind: .12, vinyl: .18, hum: .2, melody: .22, track: 'night', muted: false } };
  }
  const audio = { rain: .25, wind: .12, vinyl: .18, hum: .2, melody: .22, track: 'night', muted: false, ...(raw.audio || {}) };
  audio.melody = clamp(Number(audio.melody) || .22, 0, 1);
  audio.track = ['night', 'rain', 'drift', 'dawn'].includes(audio.track) ? audio.track : 'night';
  return {
    sessions: Array.isArray(raw.sessions) ? raw.sessions.slice(0, 12) : [],
    totalMinutes: Number(raw.totalMinutes) || 0,
    plantLevel: clamp(Number(raw.plantLevel) || 0, 0, 4),
    duration: DURATIONS.includes(Number(raw.duration)) ? Number(raw.duration) : DEFAULT_DURATION,
    intention: typeof raw.intention === 'string' ? raw.intention.slice(0, 120) : '',
    scene: ['night', 'rain', 'dawn'].includes(raw.scene) ? raw.scene : 'night',
    audio,
  };
}
