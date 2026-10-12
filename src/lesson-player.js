// The lesson player (round 13): steps through a course lesson (src/courses.js) or a famous
// game's "what would you play?" moments (src/famous-lessons.js). Pure state helpers; main.js
// draws the board and the panel.
//
// Course lesson run: {kind:'course', lessonId, step, ply, mistakes, hints, stepDone, answers}
//   - 'read' steps: shown, then Next.
//   - 'move' steps: the learner plays solution[0], solution[2]…; the opponent's replies
//     (solution[1], [3]…) play themselves. `accept[i]` lists other moves taken at index i.
//     A wrong move costs a mistake and is taken back; the learner tries again.
//   - 'quiz' steps: pick an option; a wrong pick costs a mistake.
// Famous run: {kind:'famous', lessonId, moment, results:[{correct, hinted}], answered}
export const LESSON_PROGRESS_KEY = 'vch.courseProgress';

export function newCourseRun(lesson) {
  return { kind: 'course', lessonId: lesson.id, step: 0, ply: 0, mistakes: 0, hints: 0, stepDone: false, answers: {} };
}
export function currentStep(lesson, run) { return lesson?.steps?.[run.step] || null; }
const sameMove = (played, wanted) => !!wanted && (played === wanted || (wanted.length === 4 && played === `${wanted}q`));
// Checks a learner move (UCI) on a 'move' step.
// -> {ok, alternative, reply, stepDone}; ok:false leaves the run unchanged but for the mistake.
export function playCourseMove(lesson, run, uci) {
  const step = currentStep(lesson, run);
  if (!step || step.type !== 'move' || run.stepDone) return { ok: false, reply: null, stepDone: false, alternative: false };
  const wanted = step.solution[run.ply];
  const accepted = (step.accept?.[run.ply] || []).some(m => sameMove(uci, m));
  if (!sameMove(uci, wanted) && !accepted) { run.mistakes++; return { ok: false, reply: null, stepDone: false, alternative: false }; }
  // An accepted alternative ends the line there (lessons only accept them on the last move).
  const reply = accepted ? null : step.solution[run.ply + 1] || null;
  run.ply += reply ? 2 : 1;
  run.stepDone = accepted || run.ply >= step.solution.length;
  return { ok: true, alternative: accepted && !sameMove(uci, wanted), reply, stepDone: run.stepDone };
}
// Quiz answer (index). -> {ok}
export function answerQuiz(lesson, run, index) {
  const step = currentStep(lesson, run);
  if (!step || step.type !== 'quiz' || run.stepDone) return { ok: false };
  const ok = Number(index) === Number(step.answer);
  if (ok) { run.stepDone = true; run.answers[run.step] = index; } else run.mistakes++;
  return { ok };
}
// Moves on to the next step. Read steps are done once shown. -> false at the end.
export function nextStep(lesson, run) {
  if (run.step + 1 >= lesson.steps.length) return false;
  run.step++; run.ply = 0; run.stepDone = currentStep(lesson, run).type === 'read';
  return true;
}
export function startRun(lesson) {
  const run = newCourseRun(lesson);
  run.stepDone = currentStep(lesson, run)?.type === 'read';
  return run;
}
// Stars for a finished lesson: 3 with no mistakes and no hints, 2 with up to two, else 1.
export function courseStars(run) {
  const slips = run.mistakes + run.hints;
  return slips === 0 ? 3 : slips <= 2 ? 2 : 1;
}

// Progress across lessons: {lessonId: {stars, at}}. Kept in this browser.
export function loadProgress(storage = globalThis.localStorage) {
  try { const v = JSON.parse(storage?.getItem(LESSON_PROGRESS_KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch { return {}; }
}
export function saveLessonResult(lessonId, stars, storage = globalThis.localStorage, now = Date.now()) {
  const all = loadProgress(storage), before = all[lessonId]?.stars || 0;
  all[lessonId] = { stars: Math.max(before, Math.max(1, Math.min(3, Number(stars) || 1))), at: now };
  try { storage?.setItem(LESSON_PROGRESS_KEY, JSON.stringify(all)); } catch {}
  return all;
}
// {done, total, stars} for a course (or a famous-games list keyed by id).
export function courseProgress(course, progress) {
  const ids = course.lessons.map(l => l.id), done = ids.filter(id => progress[id]);
  return { done: done.length, total: ids.length, stars: done.reduce((s, id) => s + (progress[id]?.stars || 0), 0) };
}
// The first lesson not yet done (or the first).
export function nextLesson(course, progress) {
  return course.lessons.find(l => !progress[l.id]) || course.lessons[0];
}

// Famous-game runs.
export function newFamousRun(lesson) { return { kind: 'famous', lessonId: lesson.id, moment: 0, results: [], answered: false, hinted: false }; }
export function recordFamousAnswer(run, correct) {
  if (run.answered) return run;
  run.answered = true; run.results.push({ correct: !!correct, hinted: !!run.hinted });
  return run;
}
export function nextMoment(lesson, run) {
  if (run.moment + 1 >= lesson.moments.length) return false;
  run.moment++; run.answered = false; run.hinted = false;
  return true;
}
