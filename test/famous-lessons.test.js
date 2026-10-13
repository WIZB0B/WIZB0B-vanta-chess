import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { FAMOUS_GAMES } from '../src/content.js';
import {
  FAMOUS_LESSONS, FAMOUS_IDEAS, FAMOUS_ERAS, MOMENT_KINDS,
  famousLessonById, momentPosition, momentSide, checkAnswer, lessonScore, normaliseSan,
} from '../src/famous-lessons.js';

const ERA_IDS=FAMOUS_ERAS.map(era=>era.id);
const isText=value=>typeof value==='string'&&value.trim().length>0;
const legalSans=fen=>new Set(new Chess(fen).moves());

test('famous lessons: catalogue shape and unique ids',()=>{
  assert.ok(FAMOUS_LESSONS.length>=12,'expected a full catalogue of famous games');
  const ids=new Set();
  for(const lesson of FAMOUS_LESSONS){
    assert.match(lesson.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/,`${lesson.id}: id must be kebab-case`);
    assert.ok(!ids.has(lesson.id),`${lesson.id}: duplicate id`);
    ids.add(lesson.id);
    for(const key of ['title','white','black','event','opening','theme','intro'])assert.ok(isText(lesson[key]),`${lesson.id}: ${key} missing`);
    assert.ok(Number.isInteger(lesson.year)&&lesson.year>1800&&lesson.year<=2026,`${lesson.id}: year`);
    assert.ok(['1-0','0-1','1/2-1/2'].includes(lesson.result),`${lesson.id}: result`);
    assert.ok(ERA_IDS.includes(lesson.era),`${lesson.id}: unknown era ${lesson.era}`);
    assert.ok(Array.isArray(lesson.moves)&&lesson.moves.length>0,`${lesson.id}: moves`);
    assert.ok(isText(lesson.source?.title),`${lesson.id}: source title`);
    assert.match(lesson.source?.url||'',/^https:\/\/[^\s]+$/,`${lesson.id}: source url must be https`);
    assert.ok(lesson.moments.length>=4&&lesson.moments.length<=8,`${lesson.id}: 4-8 moments`);
  }
});

test('famous lessons: catalogue spans every era',()=>{
  for(const era of ERA_IDS)assert.ok(FAMOUS_LESSONS.some(lesson=>lesson.era===era),`no lesson in era ${era}`);
  for(const era of FAMOUS_ERAS){
    assert.ok(isText(era.label)&&isText(era.years)&&isText(era.blurb),`${era.id}: era copy`);
  }
});

test('famous lessons: every game replays legally and ends as its result says',()=>{
  for(const lesson of FAMOUS_LESSONS){
    const game=new Chess();
    for(const san of lesson.moves){
      let move;
      assert.doesNotThrow(()=>{move=game.move(san);},`${lesson.id}: illegal move ${san} at ply ${game.history().length}`);
      assert.equal(move.san,san,`${lesson.id}: ${san} is not chess.js SAN (${move.san})`);
    }
    if(game.isCheckmate()){
      const loser=game.turn();
      assert.equal(lesson.result,loser==='w'?'0-1':'1-0',`${lesson.id}: checkmate does not match result`);
    } else {
      // Resignation: the side to move at the end is the side that gave up, or the winner made the last move.
      assert.ok(lesson.result!=='1/2-1/2'||game.isDraw(),`${lesson.id}: drawn result must end drawn`);
      assert.ok(isText(lesson.ending),`${lesson.id}: a game that stops before mate must describe its ending`);
    }
  }
});

test('famous lessons: the five original famous games keep their move lists',()=>{
  const byFirstMoves=new Map(FAMOUS_LESSONS.map(lesson=>[lesson.moves.join(' '),lesson]));
  for(const famous of FAMOUS_GAMES){
    assert.ok(byFirstMoves.has(famous.moves.join(' ')),`${famous.title}: missing from FAMOUS_LESSONS or its moves differ`);
  }
});

test('famous lessons: every moment is in range, legal and self-consistent',()=>{
  for(const lesson of FAMOUS_LESSONS){
    let previous=-1;
    for(const moment of lesson.moments){
      const label=`${lesson.id} ply ${moment.ply}`;
      assert.ok(Number.isInteger(moment.ply)&&moment.ply>=0&&moment.ply<lesson.moves.length,`${label}: ply out of range`);
      assert.ok(moment.ply>previous,`${label}: moments must be in game order without repeats`);
      previous=moment.ply;
      assert.equal(moment.answer,lesson.moves[moment.ply],`${label}: answer must equal moves[ply]`);
      assert.ok(MOMENT_KINDS.includes(moment.kind),`${label}: unknown kind ${moment.kind}`);
      for(const key of ['prompt','hint','explain'])assert.ok(isText(moment[key]),`${label}: ${key} missing`);
      const legal=legalSans(momentPosition(Chess,lesson,moment));
      assert.ok(legal.has(moment.answer),`${label}: answer not legal`);
      assert.ok(Array.isArray(moment.accept),`${label}: accept must be an array`);
      for(const san of moment.accept){
        assert.ok(legal.has(san),`${label}: accepted move ${san} not legal`);
        assert.notEqual(san,moment.answer,`${label}: accept repeats the answer`);
      }
      assert.ok(moment.choices.length>=3&&moment.choices.length<=4,`${label}: 3-4 choices`);
      assert.equal(new Set(moment.choices).size,moment.choices.length,`${label}: duplicate choice`);
      assert.ok(moment.choices.includes(moment.answer),`${label}: choices must include the answer`);
      for(const san of moment.choices){
        assert.ok(legal.has(san),`${label}: choice ${san} not legal`);
        if(san!==moment.answer)assert.ok(!moment.accept.includes(san),`${label}: distractor ${san} is also accepted`);
      }
    }
  }
});

test('famous lessons: optional quiz questions are well formed',()=>{
  for(const lesson of FAMOUS_LESSONS){
    if(lesson.questions===undefined)continue;
    assert.ok(lesson.questions.length>=1&&lesson.questions.length<=3,`${lesson.id}: 1-3 questions`);
    for(const q of lesson.questions){
      assert.ok(isText(q.question)&&isText(q.explain),`${lesson.id}: question text`);
      assert.ok(q.options.length>=2&&new Set(q.options).size===q.options.length,`${lesson.id}: options`);
      assert.ok(q.options.includes(q.answer),`${lesson.id}: answer must be one of the options`);
    }
  }
});

test('famous ideas: a short list of follow-up features',()=>{
  assert.ok(FAMOUS_IDEAS.length>=3&&FAMOUS_IDEAS.length<=6);
  assert.equal(new Set(FAMOUS_IDEAS.map(idea=>idea.id)).size,FAMOUS_IDEAS.length);
  for(const idea of FAMOUS_IDEAS)assert.ok(isText(idea.id)&&isText(idea.title)&&isText(idea.description));
});

test('famousLessonById finds lessons and rejects unknown ids',()=>{
  const first=FAMOUS_LESSONS[0];
  assert.equal(famousLessonById(first.id),first);
  assert.equal(famousLessonById('no-such-game'),null);
  assert.equal(famousLessonById(undefined),null);
});

test('momentPosition returns the position before the master move',()=>{
  const opera=famousLessonById('opera-game');
  const fen=momentPosition(Chess,opera,{ply:0});
  assert.equal(fen,new Chess().fen());
  const last=opera.moments.at(-1);
  const game=new Chess(momentPosition(Chess,opera,last));
  assert.equal(game.turn(),momentSide(last));
  game.move(last.answer);
  assert.equal(game.isCheckmate(),last.ply===opera.moves.length-1);
  assert.throws(()=>momentPosition(Chess,opera,{ply:opera.moves.length}),RangeError);
  assert.throws(()=>momentPosition(Chess,opera,{ply:-1}),RangeError);
  assert.equal(momentSide({ply:0}),'w');
  assert.equal(momentSide({ply:1}),'b');
});

test('checkAnswer normalises notation and separates master moves from accepted alternatives',()=>{
  const lesson={id:'t',moves:['e4']};
  const moment={ply:0,answer:'Qxf7#',accept:['Rd8+'],choices:[]};
  assert.deepEqual(checkAnswer(lesson,moment,'Qxf7#'),{correct:true,accepted:false,best:'Qxf7#'});
  assert.deepEqual(checkAnswer(lesson,moment,' Qxf7!! '),{correct:true,accepted:false,best:'Qxf7#'});
  assert.deepEqual(checkAnswer(lesson,moment,'Rd8#'),{correct:true,accepted:true,best:'Qxf7#'});
  assert.deepEqual(checkAnswer(lesson,moment,'Qf6'),{correct:false,accepted:false,best:'Qxf7#'});
  assert.deepEqual(checkAnswer(lesson,moment,''),{correct:false,accepted:false,best:'Qxf7#'});
  assert.equal(checkAnswer(lesson,{ply:0,answer:'O-O-O',accept:[]},'0-0-0').correct,true);
  assert.equal(checkAnswer(lesson,{ply:0,answer:'b1=Q+',accept:[]},'b1Q').correct,true);
  assert.equal(normaliseSan('exf6 e.p.'),'exf6');
  for(const real of FAMOUS_LESSONS)for(const m of real.moments){
    assert.equal(checkAnswer(real,m,m.answer).correct,true);
    for(const san of m.accept)assert.equal(checkAnswer(real,m,san).accepted,true);
    for(const san of m.choices)if(san!==m.answer)assert.equal(checkAnswer(real,m,san).correct,false);
  }
});

test('lessonScore rewards unhinted answers and maps to 0-3 stars',()=>{
  assert.deepEqual(lessonScore([]),{score:0,max:0,stars:0});
  assert.deepEqual(lessonScore(),{score:0,max:0,stars:0});
  assert.deepEqual(lessonScore([{correct:true,hinted:false},{correct:true,hinted:false}]),{score:4,max:4,stars:3});
  assert.deepEqual(lessonScore([{correct:true,hinted:true},{correct:true,hinted:false}]),{score:3,max:4,stars:2});
  assert.deepEqual(lessonScore([{correct:true,hinted:true},{correct:false,hinted:true}]),{score:1,max:4,stars:0});
  assert.deepEqual(lessonScore([{correct:true,hinted:false},{correct:false,hinted:false},{correct:false,hinted:false}]),{score:2,max:6,stars:1});
  const six=Array.from({length:6},(_,i)=>({correct:true,hinted:i===0}));
  assert.deepEqual(lessonScore(six),{score:11,max:12,stars:3});
});
