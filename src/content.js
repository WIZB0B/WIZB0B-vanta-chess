export const OPENINGS = [
  { name:'Ruy Lopez', eco:'C60', line:['e4','e5','Nf3','Nc6','Bb5'], idea:'Pressure the c6-knight and prepare a long strategic fight for the center.' },
  { name:'Italian Game', eco:'C50', line:['e4','e5','Nf3','Nc6','Bc4'], idea:'Fast development aimed at f7 with flexible d3 or c3-d4 plans.' },
  { name:'Sicilian Defense', eco:'B20', line:['e4','c5'], idea:'Black creates an asymmetrical position and fights for d4 from the flank.' },
  { name:'French Defense', eco:'C00', line:['e4','e6','d4','d5'], idea:'Black builds a resilient center and challenges White’s e4 pawn immediately.' },
  { name:'Caro-Kann Defense', eco:'B10', line:['e4','c6','d4','d5'], idea:'A solid defense designed to develop the light bishop before closing the pawn chain.' },
  { name:"Queen's Gambit", eco:'D06', line:['d4','d5','c4'], idea:'White offers the c-pawn to gain central space and pressure d5.' },
  { name:"King's Indian Defense", eco:'E60', line:['d4','Nf6','c4','g6','Nc3','Bg7'], idea:'Black allows White space and prepares a dynamic kingside counterattack.' },
  { name:'English Opening', eco:'A10', line:['c4'], idea:'A flexible flank opening that controls d5 and can transpose into many systems.' },
  { name:'Réti Opening', eco:'A04', line:['Nf3'], idea:'Develop first, delay the central pawn commitment, and pressure the center from afar.' },
  { name:'London System', eco:'D02', line:['d4','d5','Nf3','Nf6','Bf4'], idea:'A dependable setup with Bf4, e3, c3 and a stable central structure.' },
];

export const FAMOUS_GAMES = [
  { title:'The Opera Game', players:'Paul Morphy vs Duke Karl / Count Isouard', place:'Paris', year:1858, result:'1–0', opening:'Philidor Defense', lesson:'Development, king safety and a decisive attack on an uncastled king.' },
  { title:'The Immortal Game', players:'Adolf Anderssen vs Lionel Kieseritzky', place:'London', year:1851, result:'1–0', opening:"King's Gambit", lesson:'A classic attacking game built around development and spectacular material sacrifices.' },
  { title:'Game of the Century', players:'Donald Byrne vs Bobby Fischer', place:'New York', year:1956, result:'0–1', opening:'Grünfeld Defense', lesson:'Dynamic piece activity, tactical calculation and a famous queen sacrifice.' },
  { title:"Kasparov's Immortal", players:'Garry Kasparov vs Veselin Topalov', place:'Wijk aan Zee', year:1999, result:'1–0', opening:'Pirc / Modern structure', lesson:'A landmark king hunt showing initiative, calculation and coordinated attacking pieces.' },
  { title:'Deep Blue – Game 6', players:'Deep Blue vs Garry Kasparov', place:'New York', year:1997, result:'1–0', opening:'Caro-Kann Defense', lesson:'A historically important human-vs-computer game decided by opening pressure and tactics.' },
];

export const LESSONS = [
  { title:'Opening principles', level:'Beginner', body:'Fight for the center, develop knights and bishops quickly, castle early, and avoid moving the same piece repeatedly without a concrete reason.' },
  { title:'Tactical vision', level:'Beginner–Intermediate', body:'Train forcing moves first: checks, captures and threats. Look for forks, pins, skewers, discovered attacks and overloaded defenders.' },
  { title:'Pawn structures', level:'Intermediate', body:'Pawn structure defines the long-term plan. Identify pawn breaks, weak squares, open files, backward pawns and good versus bad bishops.' },
  { title:'Endgame essentials', level:'Intermediate', body:'Activate the king, create passed pawns, place rooks behind passers, and learn the key opposition and basic rook-endgame positions.' },
  { title:'Calculation discipline', level:'Advanced', body:'Build a candidate-move list, calculate forcing lines to a stable endpoint, then compare resulting positions instead of stopping at the first attractive move.' },
];

export function detectOpening(history=[]) {
  let best=null;
  for (const opening of OPENINGS) {
    if (opening.line.length>history.length) continue;
    const matches=opening.line.every((move,index)=>String(history[index]||'').replace(/[+#?!]/g,'')===move);
    if (matches && (!best || opening.line.length>best.line.length)) best=opening;
  }
  return best;
}
