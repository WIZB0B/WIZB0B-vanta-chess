import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { OPENINGS, FAMOUS_GAMES } from '../src/content.js';

test('all opening study lines are legal from the initial position',()=>{
  for(const opening of OPENINGS){
    const game=new Chess();
    for(const san of opening.line){
      assert.doesNotThrow(()=>game.move(san),`${opening.name}: illegal move ${san}`);
    }
  }
});

test('all famous-game replays are legal move-by-move',()=>{
  for(const famous of FAMOUS_GAMES){
    const game=new Chess();
    for(const san of famous.moves){
      assert.doesNotThrow(()=>game.move(san),`${famous.title}: illegal move ${san}`);
    }
    assert.ok(game.history().length===famous.moves.length,`${famous.title}: replay length mismatch`);
  }
});
