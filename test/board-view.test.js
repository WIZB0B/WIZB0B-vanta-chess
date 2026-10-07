import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Chess } from 'chess.js';
import { arrowGeometry, arrowsSvg, brushFor, diffPosition, isKnightJump, isMoveLike, pieceTransform, positionMap, squareCoords, toggleShape } from '../src/board-view.js';

const main=await readFile(new URL('../src/main.js',import.meta.url),'utf8');
const css=await readFile(new URL('../src/style.css',import.meta.url),'utf8');
const layer=await readFile(new URL('../src/piece-layer.js',import.meta.url),'utf8');
const map=entries=>new Map(Object.entries(entries));

test('squares map to screen columns and rows in both orientations',()=>{
  assert.deepEqual(squareCoords('a1'),{col:0,row:7});
  assert.deepEqual(squareCoords('h8'),{col:7,row:0});
  assert.deepEqual(squareCoords('a1',true),{col:7,row:0});
  assert.equal(squareCoords('z9'),null);
  assert.equal(pieceTransform('d1'),'translate(300%,700%)');
  assert.equal(pieceTransform('h5'),'translate(700%,300%)');
  assert.equal(pieceTransform('h5',true),'translate(0%,400%)');
});

test('positionMap reads a chess.js board',()=>{
  const position=positionMap(new Chess().board());
  assert.equal(position.size,32);
  assert.equal(position.get('d1'),'wq');assert.equal(position.get('e8'),'bk');assert.equal(position.has('e4'),false);
});

test('a move keeps every other piece and slides one element',()=>{
  const before=new Chess();before.move('e4');before.move('d5');
  const after=new Chess(before.fen());const made=after.move('Qh5');
  const diff=diffPosition(positionMap(before.board()),positionMap(after.board()),{hint:made});
  assert.deepEqual(diff.moved,[{from:'d1',to:'h5'}]);
  assert.deepEqual(diff.added,[]);assert.deepEqual(diff.removed,[]);
  assert.equal(diff.kept.length,31);
  assert.equal(isMoveLike(diff),true);
});

test('captures, castling, en passant and promotion pair the right elements',()=>{
  // Capture: the capturing piece slides, the captured one is removed.
  let diff=diffPosition(map({e4:'wp',d5:'bp'}),map({d5:'wp'}));
  assert.deepEqual(diff.moved,[{from:'e4',to:'d5'}]);assert.deepEqual(diff.removed,['d5']);assert.equal(isMoveLike(diff),true);
  // Castling: king and rook both slide.
  diff=diffPosition(map({e1:'wk',h1:'wr'}),map({g1:'wk',f1:'wr'}));
  assert.deepEqual(diff.moved.sort((a,b)=>a.from.localeCompare(b.from)),[{from:'e1',to:'g1'},{from:'h1',to:'f1'}]);assert.equal(isMoveLike(diff),true);
  // En passant: pawn slides, the pawn beside it is removed.
  diff=diffPosition(map({e5:'wp',d5:'bp'}),map({d6:'wp'}));
  assert.deepEqual(diff.moved,[{from:'e5',to:'d6'}]);assert.deepEqual(diff.removed,['d5']);
  // Promotion: with the move as hint the pawn element slides and becomes the queen.
  diff=diffPosition(map({e7:'wp'}),map({e8:'wq'}),{hint:{from:'e7',to:'e8'}});
  assert.deepEqual(diff.moved,[{from:'e7',to:'e8'}]);assert.deepEqual(diff.added,[]);
  // Without a hint it would be a swap, which is not animated as a move.
  diff=diffPosition(map({e7:'wp'}),map({e8:'wq'}));
  assert.deepEqual(diff.added,['e8']);assert.deepEqual(diff.removed,['e7']);assert.equal(isMoveLike(diff),false);
});

test('identical knights pair with the nearest vanished one',()=>{
  const diff=diffPosition(map({b1:'wn',g1:'wn'}),map({b1:'wn',f3:'wn'}));
  assert.deepEqual(diff.moved,[{from:'g1',to:'f3'}]);assert.deepEqual(diff.kept,['b1']);
});

test('a new game or a jump through review snaps instead of animating',()=>{
  const start=positionMap(new Chess().board());
  const later=new Chess();for(const san of ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6'])later.move(san);
  assert.equal(isMoveLike(diffPosition(positionMap(later.board()),start)),false);
  assert.equal(isMoveLike(diffPosition(start,start)),false,'no change, nothing to animate');
});

test('arrows: straight arrows run centre to centre, knight arrows are L-shaped',()=>{
  const straight=arrowGeometry('e2','e4');
  assert.equal(straight.knight,false);assert.equal(straight.shaft.length,2);
  assert.equal(straight.shaft[0].x,4.5);assert.ok(straight.shaft[0].y<6.5&&straight.shaft[0].y>6,'starts just off the e2 centre');
  assert.equal(straight.head[0].x,4.5);assert.ok(Math.abs(straight.head[0].y-4.58)<.01,'tip stops just short of the e4 centre');
  const knight=arrowGeometry('g1','f3');
  assert.equal(knight.knight,true);assert.equal(knight.shaft.length,3);
  assert.deepEqual(knight.shaft[1],{x:6.5,y:5.5},'runs the two-square leg first, then turns');
  assert.equal(isKnightJump('b1','c3'),true);assert.equal(isKnightJump('b1','b3'),false);
  assert.equal(arrowGeometry('e2','e2'),null);
  const flipped=arrowGeometry('e2','e4',true);
  assert.equal(flipped.shaft[0].x,3.5);
});

test('arrow markup carries its colour; square marks are not drawn as arrows',()=>{
  const svg=arrowsSvg([{from:'e2',to:'e4',brush:'orange'},{from:'e5',brush:'red'}],{from:'g1',to:'f3',brush:'green'});
  assert.match(svg,/class="arrow arrow-orange" data-from="e2" data-to="e4"/);
  assert.match(svg,/class="arrow arrow-green arrow-draft" data-from="g1" data-to="f3" data-knight="true"/);
  assert.doesNotMatch(svg,/data-from="e5"/);
  assert.match(arrowsSvg([{from:'a1',to:'a3',brush:'<script>'}],null),/arrow-orange/,'unknown brushes fall back to the default');
});

test('toggling shapes: same shape removes, another colour recolours',()=>{
  let shapes=toggleShape([],{from:'e2',to:'e4',brush:'orange'});
  assert.equal(shapes.length,1);
  shapes=toggleShape(shapes,{from:'e2',to:'e4',brush:'green'});
  assert.deepEqual(shapes,[{from:'e2',to:'e4',brush:'green'}]);
  shapes=toggleShape(shapes,{from:'e2',to:'e4',brush:'green'});
  assert.deepEqual(shapes,[]);
  shapes=toggleShape(toggleShape([],{from:'e5',brush:'red'}),{from:'e5',to:'e6',brush:'orange'});
  assert.equal(shapes.length,2,'a mark and an arrow from the same square are different shapes');
});

test('colours: orange arrows and red squares by default, Shift/Ctrl/Alt change them',()=>{
  assert.equal(brushFor('arrow'),'orange');assert.equal(brushFor('square'),'red');
  assert.equal(brushFor('arrow',{shiftKey:true}),'green');assert.equal(brushFor('square',{shiftKey:true}),'green');
  assert.equal(brushFor('arrow',{ctrlKey:true}),'blue');assert.equal(brushFor('arrow',{metaKey:true}),'blue');
  assert.equal(brushFor('square',{altKey:true}),'yellow');
});

test('the board is layered: squares, one piece layer, the arrow layer, a drag layer',()=>{
  assert.match(main,/board\.replaceChildren\(pieceLayer,arrowLayer\)/);
  assert.match(main,/dragLayer\.className='drag-layer'/);
  assert.doesNotMatch(main,/board\.innerHTML=''/,'the board is no longer rebuilt on every render');
  assert.match(layer,/el\.style\.transform=pieceTransform\(square,this\.flipped\)/);
  assert.match(layer,/el\.style\.transition=`transform \$\{durationMs\}ms \$\{MOVE_EASING\}`/,'moves only transition transform');
  assert.match(layer,/el\.style\.transition=`opacity \$\{durationMs\}ms linear`/,'captures only fade opacity');
  assert.match(css,/\.piece-layer\{z-index:2\}/);assert.match(css,/\.arrow-layer\{z-index:3;/);
  assert.match(css,/\.drag-layer\{position:fixed;inset:0;z-index:120;pointer-events:none/);
  assert.match(css,/\.board-piece\.moving\{z-index:3\}/);
});

test('highlights switch instantly: squares never inherit the global button transition',()=>{
  assert.match(css,/button\{transition:background var\(--motion\)/,'the global rule this guards against');
  assert.match(css,/\.board \.square,\.board \.square:hover\{transition:none;transform:none\}/);
});

test('heavy work waits until the frame with the move is painted',()=>{
  // Local / computer moves: board first, then move list and sound, engine on a timer.
  assert.match(main,/render\(\{hint:made,instant:instantMoveAnimation\}\);afterBoardPaint\(\(\)=>\{updateMoves\(\);playTone\(\)\}\)/);
  // render() itself only updates the board synchronously; status, analysis and the
  // game-over check are deferred.
  const renderFn=main.slice(main.indexOf('function render(options){'),main.indexOf('function endText()'));
  assert.match(renderFn,/renderBoard\(options\);\n\s*if\(!statusScheduled\)\{statusScheduled=true;afterBoardPaint\(\(\)=>\{statusScheduled=false;renderStatus\(\)\}\)\}/);
  const status=main.slice(main.indexOf('function renderStatus(){'),main.indexOf('function render(options){'));
  assert.match(status,/scheduleAnalysis\(\)/);assert.match(status,/maybeShowGameOver\(\)/);
  // afterBoardPaint never depends on requestAnimationFrame alone (hidden tabs get no frames).
  assert.match(main,/if\(document\.hidden\)\{setTimeout\(run,0\);return\}\n\s*requestAnimationFrame\(\(\)=>setTimeout\(run,0\)\);setTimeout\(run,100\);/);
  // One AudioContext for the session instead of one per move.
  assert.match(main,/toneContext\?\?=new AudioContext\(\)/);
  assert.equal((main.match(/new AudioContext\(\)/g)||[]).length,1);
});

test('online moves still send coordinates and the expected version only',()=>{
  const start=main.indexOf('if(serverGameId&&!remote){'),end=main.indexOf('return}let made,localElapsedMs=null',start),body=main.slice(start,end);
  assert.match(body,/await api\.move\(moveGameId,expectedVersion,\{from:move\.from,to:move\.to,promotion:made\.promotion\|\|undefined,clientMoveAt\}\)/);
});

test('a premove in progress becomes a normal move when the opponent replies',()=>{
  const queued=main.slice(main.indexOf('function playQueuedPremove(){'),main.indexOf('async function clickSquare'));
  assert.match(queued,/if\(premoves\.selected&&color&&game\.turn\(\)===color&&!premoveBlocked\(\)&&game\.get\(premoves\.selected\)\?\.color===color\)\{\n\s*selected=premoves\.selected;premoves\.cancel\(\);render\(\);/);
  const drop=main.slice(main.indexOf('function finishPointerDrag('),main.indexOf('function cancelPointerDrag('));
  assert.match(drop,/const kind=dragKindFor\(drag\.from\);/,'the drop is judged by what the piece may do now, not when it was picked up');
  assert.match(drop,/if\(kind==='move'\)\{\n\s*if\(premoves\.selected\|\|premoves\.move\)premoves\.cancel\(\);/);
});

test('panels blur their backdrop only for see-through glass',()=>{
  assert.match(main,/function syncGlassBlur\(value\)\{document\.documentElement\.dataset\.glass=Number\(value\)<GLASS_BLUR_BELOW\?'clear':'solid'\}/);
  assert.match(main,/if\(input\.dataset\.theme==='--glass'\)syncGlassBlur\(value\)/);
  assert.match(css,/:root\[data-glass="solid"\] \.panel,:root\[data-glass="solid"\] \.game,:root\[data-glass="solid"\] \.topbar\{backdrop-filter:none;-webkit-backdrop-filter:none\}/);
});
