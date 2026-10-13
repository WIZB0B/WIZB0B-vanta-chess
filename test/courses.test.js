import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { COURSES, COURSE_LEVELS, courseById, courseStats, lessonById, lessonProgressKey } from '../src/courses.js';

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SQUARE = /^[a-h][1-8]$/;
const UCI = /^[a-h][1-8][a-h][1-8][qrbn]?$/;
const lessons = COURSES.flatMap(c => c.lessons.map(l => ({ course: c, lesson: l })));
const steps = lessons.flatMap(({ course, lesson }) => lesson.steps.map((step, i) => ({ course, lesson, step, where: `${lesson.id} step ${i}` })));
const moveSteps = steps.filter(s => s.step.type === 'move');
const text = v => typeof v === 'string' && v.trim().length > 0;

// A FEN that chess.js accepts and that is a real position: the side not to move is not in check.
function position(fen, where) {
  let c;
  assert.doesNotThrow(() => { c = new Chess(fen); }, `${where}: FEN does not load: ${fen}`);
  const p = fen.split(' ');
  const other = new Chess([p[0], p[1] === 'w' ? 'b' : 'w', p[2], '-', p[4], p[5]].join(' '), { skipValidation: true });
  assert.ok(!other.inCheck(), `${where}: the side not to move is in check: ${fen}`);
  return c;
}
const play = (c, uci) => c.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
function playable(c, uci, where) {
  assert.match(uci, UCI, `${where}: not a UCI move: ${uci}`);
  let m = null;
  try { m = play(c, uci); } catch { m = null; }
  assert.ok(m, `${where}: illegal move ${uci} in ${c.fen()}`);
  return m;
}

test('courses: levels and the course list', () => {
  assert.deepEqual(COURSE_LEVELS, ['Beginner', 'Intermediate', 'Advanced']);
  assert.ok(Array.isArray(COURSES) && COURSES.length >= 6, 'a library of courses');
  for (const c of COURSES) {
    assert.match(c.id, KEBAB, `course id ${c.id}`);
    assert.ok(text(c.title) && text(c.summary), `${c.id}: title and summary`);
    assert.ok(COURSE_LEVELS.includes(c.level), `${c.id}: level ${c.level}`);
    assert.ok(Number.isInteger(c.minutes) && c.minutes > 0, `${c.id}: minutes`);
    assert.ok(c.lessons.length >= 4 && c.lessons.length <= 6, `${c.id}: ${c.lessons.length} lessons`);
  }
});

test('courses: every course cites at least one source with an https URL', () => {
  for (const c of COURSES) {
    assert.ok(Array.isArray(c.sources) && c.sources.length > 0, `${c.id}: sources`);
    assert.ok(c.sources.some(s => /^https:\/\//.test(s.url)), `${c.id}: needs an https source`);
    for (const s of c.sources) {
      assert.ok(text(s.title) && text(s.author) && text(s.note), `${c.id}: source fields for ${s.title}`);
      assert.ok(Number.isInteger(s.year), `${c.id}: source year for ${s.title}`);
      assert.doesNotThrow(() => new URL(s.url), `${c.id}: source URL ${s.url}`);
      assert.match(s.url, /^https:\/\//, `${c.id}: source URL must be https: ${s.url}`);
    }
  }
});

test('courses: ids are unique and lesson ids are course-id/lesson-id', () => {
  const courseIds = COURSES.map(c => c.id);
  assert.equal(new Set(courseIds).size, courseIds.length, 'course ids are unique');
  const lessonIds = lessons.map(({ lesson }) => lesson.id);
  assert.equal(new Set(lessonIds).size, lessonIds.length, 'lesson ids are unique');
  for (const { course, lesson } of lessons) {
    const [head, tail, extra] = lesson.id.split('/');
    assert.equal(head, course.id, `${lesson.id}: starts with its course id`);
    assert.match(tail || '', KEBAB, `${lesson.id}: lesson part`);
    assert.equal(extra, undefined, `${lesson.id}: one slash only`);
    assert.ok(text(lesson.title) && text(lesson.goal), `${lesson.id}: title and goal`);
    assert.ok(lesson.steps.length >= 3 && lesson.steps.length <= 7, `${lesson.id}: ${lesson.steps.length} steps`);
  }
});

test('courses: step shapes', () => {
  for (const { step, where } of steps) {
    assert.ok(['read', 'move', 'quiz'].includes(step.type), `${where}: type ${step.type}`);
    if (step.type === 'read') {
      assert.ok(text(step.text), `${where}: text`);
      if (step.fen !== undefined) position(step.fen, where);
      for (const a of step.arrows || []) assert.ok(a.length === 2 && a.every(s => SQUARE.test(s)), `${where}: arrow ${a}`);
      for (const m of step.marks || []) assert.match(m, SQUARE, `${where}: mark ${m}`);
    } else if (step.type === 'move') {
      for (const k of ['prompt', 'hint', 'explain']) assert.ok(text(step[k]), `${where}: ${k}`);
      assert.ok(Array.isArray(step.solution) && step.solution.length % 2 === 1, `${where}: the solution ends on the learner's move`);
    } else {
      assert.ok(text(step.question) && text(step.explain), `${where}: question and explanation`);
      assert.ok(Array.isArray(step.options) && step.options.length >= 2 && step.options.every(text), `${where}: options`);
      assert.equal(new Set(step.options).size, step.options.length, `${where}: options are distinct`);
      assert.ok(Number.isInteger(step.answer) && step.answer >= 0 && step.answer < step.options.length, `${where}: answer in range`);
    }
  }
});

test('courses: every FEN loads and every solution is legal move by move', () => {
  for (const { step, where } of moveSteps) {
    const c = position(step.fen, where);
    const side = step.fen.split(' ')[1];
    if (/White to play/.test(step.prompt)) assert.equal(side, 'w', `${where}: prompt says White`);
    else if (/Black to play/.test(step.prompt)) assert.equal(side, 'b', `${where}: prompt says Black`);
    else assert.fail(`${where}: the prompt should say who is to play`);
    for (const [i, uci] of step.solution.entries()) {
      assert.ok(!c.isGameOver(), `${where}: the game is already over before move ${i}`);
      playable(c, uci, `${where} move ${i}`);
    }
  }
});

test('courses: accepted alternatives are legal, distinct and only on the learner’s last move', () => {
  for (const { step, where } of moveSteps) {
    if (!step.accept) continue;
    const last = step.solution.length - 1;
    for (const [key, moves] of Object.entries(step.accept)) {
      const i = Number(key);
      assert.equal(i, last, `${where}: accept is only allowed at the last move (index ${last}), got ${key}`);
      assert.ok(Array.isArray(moves) && moves.length > 0, `${where}: accept list`);
      const before = new Chess(step.fen);
      step.solution.slice(0, i).forEach(m => play(before, m));
      for (const alt of moves) {
        assert.notEqual(alt, step.solution[i], `${where}: accept repeats the solution`);
        playable(new Chess(before.fen()), alt, `${where} accept ${alt}`);
      }
    }
  }
});

test('courses: "mate in N" prompts have N learner moves and end in checkmate', () => {
  const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  let mates = 0;
  for (const { step, where } of moveSteps) {
    const m = step.prompt.match(/mate in (one|two|three|four|five|\d)/i);
    if (!m) continue;
    mates++;
    const n = WORDS[m[1].toLowerCase()] || Number(m[1]);
    assert.equal(step.solution.length, 2 * n - 1, `${where}: mate in ${n} needs ${2 * n - 1} plies`);
    const c = new Chess(step.fen);
    step.solution.forEach(u => play(c, u));
    assert.ok(c.isCheckmate(), `${where}: the line should end in checkmate`);
    for (const alt of step.accept?.[step.solution.length - 1] || []) {
      const a = new Chess(step.fen);
      step.solution.slice(0, -1).forEach(u => play(a, u));
      play(a, alt);
      assert.ok(a.isCheckmate(), `${where}: accepted ${alt} should mate too`);
    }
  }
  assert.ok(mates >= 10, 'plenty of mating exercises');
});

test('courses: at least half of the steps are interactive', () => {
  const all = courseStats();
  assert.ok(all.interactive * 2 >= all.steps, `${all.interactive} of ${all.steps}`);
  for (const c of COURSES) {
    const s = courseStats([c]);
    assert.ok(s.interactive * 2 >= s.steps, `${c.id}: ${s.interactive} of ${s.steps}`);
  }
});

test('courses: lookup helpers and stats', () => {
  const first = COURSES[0], lesson = first.lessons[0];
  assert.equal(courseById(first.id), first);
  assert.equal(courseById('no-such-course'), null);
  assert.equal(lessonById(lesson.id), lesson);
  assert.equal(lessonById(`${first.id}/no-such-lesson`), null);
  assert.equal(lessonById('nothing'), null);
  assert.equal(lessonById(undefined), null);
  assert.equal(lessonProgressKey(lesson.id), `vch.course.${lesson.id}`);
  assert.deepEqual(courseStats([]), { courses: 0, lessons: 0, steps: 0, interactive: 0 });
  const one = courseStats([first]);
  assert.equal(one.courses, 1);
  assert.equal(one.lessons, first.lessons.length);
  assert.equal(one.steps, first.lessons.reduce((n, l) => n + l.steps.length, 0));
  const all = courseStats();
  assert.equal(all.courses, COURSES.length);
  assert.equal(all.lessons, lessons.length);
  assert.equal(all.steps, steps.length);
  assert.equal(all.interactive, steps.filter(s => s.step.type !== 'read').length);
});
