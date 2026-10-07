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
  {
    title:'The Opera Game', players:'Paul Morphy vs Duke Karl / Count Isouard', place:'Paris', year:1858, result:'1–0', opening:'Philidor Defense',
    lesson:'Development, king safety and a decisive attack on an uncastled king.',
    moves:['e4','e5','Nf3','d6','d4','Bg4','dxe5','Bxf3','Qxf3','dxe5','Bc4','Nf6','Qb3','Qe7','Nc3','c6','Bg5','b5','Nxb5','cxb5','Bxb5+','Nbd7','O-O-O','Rd8','Rxd7','Rxd7','Rd1','Qe6','Bxd7+','Nxd7','Qb8+','Nxb8','Rd8#']
  },
  {
    title:'The Immortal Game', players:'Adolf Anderssen vs Lionel Kieseritzky', place:'London', year:1851, result:'1–0', opening:"King's Gambit",
    lesson:'A classic attacking game built around development and spectacular material sacrifices.',
    moves:['e4','e5','f4','exf4','Bc4','Qh4+','Kf1','b5','Bxb5','Nf6','Nf3','Qh6','d3','Nh5','Nh4','Qg5','Nf5','c6','g4','Nf6','Rg1','cxb5','h4','Qg6','h5','Qg5','Qf3','Ng8','Bxf4','Qf6','Nc3','Bc5','Nd5','Qxb2','Bd6','Bxg1','e5','Qxa1+','Ke2','Na6','Nxg7+','Kd8','Qf6+','Nxf6','Be7#']
  },
  {
    title:'Game of the Century', players:'Donald Byrne vs Bobby Fischer', place:'New York', year:1956, result:'0–1', opening:'Grünfeld Defense',
    lesson:'Dynamic piece activity, tactical calculation and a famous queen sacrifice.',
    moves:['Nf3','Nf6','c4','g6','Nc3','Bg7','d4','O-O','Bf4','d5','Qb3','dxc4','Qxc4','c6','e4','Nbd7','Rd1','Nb6','Qc5','Bg4','Bg5','Na4','Qa3','Nxc3','bxc3','Nxe4','Bxe7','Qb6','Bc4','Nxc3','Bc5','Rfe8+','Kf1','Be6','Bxb6','Bxc4+','Kg1','Ne2+','Kf1','Nxd4+','Kg1','Ne2+','Kf1','Nc3+','Kg1','axb6','Qb4','Ra4','Qxb6','Nxd1','h3','Rxa2','Kh2','Nxf2','Re1','Rxe1','Qd8+','Bf8','Nxe1','Bd5','Nf3','Ne4','Qb8','b5','h4','h5','Ne5','Kg7','Kg1','Bc5+','Kf1','Ng3+','Ke1','Bb4+','Kd1','Bb3+','Kc1','Ne2+','Kb1','Nc3+','Kc1','Rc2#']
  },
  {
    title:"Kasparov's Immortal", players:'Garry Kasparov vs Veselin Topalov', place:'Wijk aan Zee', year:1999, result:'1–0', opening:'Pirc Defense',
    lesson:'A landmark king hunt showing initiative, calculation and coordinated attacking pieces.',
    moves:['e4','d6','d4','Nf6','Nc3','g6','Be3','Bg7','Qd2','c6','f3','b5','Nge2','Nbd7','Bh6','Bxh6','Qxh6','Bb7','a3','e5','O-O-O','Qe7','Kb1','a6','Nc1','O-O-O','Nb3','exd4','Rxd4','c5','Rd1','Nb6','g3','Kb8','Na5','Ba8','Bh3','d5','Qf4+','Ka7','Rhe1','d4','Nd5','Nbxd5','exd5','Qd6','Rxd4','cxd4','Re7+','Kb6','Qxd4+','Kxa5','b4+','Ka4','Qc3','Qxd5','Ra7','Bb7','Rxb7','Qc4','Qxf6','Kxa3','Qxa6+','Kxb4','c3+','Kxc3','Qa1+','Kd2','Qb2+','Kd1','Bf1','Rd2','Rd7','Rxd7','Bxc4','bxc4','Qxh8','Rd3','Qa8','c3','Qa4+','Ke1','f4','f5','Kc1','Rd2','Qa7']
  },
  {
    title:'Deep Blue – Game 6', players:'Deep Blue vs Garry Kasparov', place:'New York', year:1997, result:'1–0', opening:'Caro-Kann Defense',
    lesson:'A historically important human-vs-computer game decided by opening pressure and tactics.',
    moves:['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nd7','Ng5','Ngf6','Bd3','e6','N1f3','h6','Nxe6','Qe7','O-O','fxe6','Bg6+','Kd8','Bf4','b5','a4','Bb7','Re1','Nd5','Bg3','Kc8','axb5','cxb5','Qd3','Bc6','Bf5','exf5','Rxe7','Bxe7','c4']
  },
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
