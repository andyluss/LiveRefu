import test from 'node:test';
import assert from 'node:assert/strict';
import { createSession, startSession, pauseSession, resetSession, tickSession, progress, formatTime, moodFor, recordSession, loadState } from '../src/session.js';

test('session starts stopped at requested duration', () => {
  const s = createSession(25);
  assert.equal(s.duration, 1500);
  assert.equal(s.remaining, 1500);
  assert.equal(s.running, false);
  assert.equal(s.completed, false);
});

test('start, tick and pause', () => {
  let s = startSession(createSession(1));
  assert.equal(s.running, true);
  s = tickSession(s, 10);
  assert.equal(s.remaining, 50);
  assert.equal(s.elapsed, 10);
  s = pauseSession(s);
  assert.equal(s.running, false);
  s = tickSession(s, 10);
  assert.equal(s.remaining, 50);
});

test('completion is clamped and reports complete', () => {
  let s = startSession(createSession(1));
  s = tickSession(s, 99);
  assert.equal(s.remaining, 0);
  assert.equal(s.completed, true);
  assert.equal(s.running, false);
  assert.equal(progress(s), 1);
});

test('reset restores full duration', () => {
  let s = startSession(createSession(1));
  s = tickSession(s, 30);
  s = resetSession(s);
  assert.equal(s.remaining, 60);
  assert.equal(s.elapsed, 0);
});

test('format and moods', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(moodFor(0), 'arrive');
  assert.equal(moodFor(.6), 'deep');
  assert.equal(moodFor(1), 'return');
});

test('recordSession persists minutes and caps log', () => {
  let state = { sessions: [], totalMinutes: 0, plantLevel: 0 };
  state = recordSession(state, 25, '写 500 字');
  assert.equal(state.totalMinutes, 25);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.plantLevel, 1);
  for (let i = 0; i < 20; i++) state = recordSession(state, 1, 'x');
  assert.equal(state.sessions.length, 12);
  assert.equal(state.plantLevel, 1);
});

test('loadState tolerates bad/partial data', () => {
  const d = loadState(null);
  assert.equal(d.duration, 25);
  assert.deepEqual(d.sessions, []);
  assert.equal(d.scene, 'night');
  assert.equal(d.audio.track, 'night');
  assert.equal(d.audio.melody, .22);
  const p = loadState({ duration: 15, totalMinutes: 3, scene: 'rain', audio: { rain: .4, track: 'drift', melody: .5 } });
  assert.equal(p.duration, 15);
  assert.equal(p.audio.rain, .4);
  assert.equal(p.audio.muted, false);
  assert.equal(p.scene, 'rain');
  assert.equal(p.audio.track, 'drift');
  assert.equal(p.audio.melody, .5);
});
