// Famous-game lessons: "what would you play here?" courses built on well-documented master games.
//
// Data and pure helpers only (no DOM, no network). Every move list is SAN exactly as chess.js 1.4
// prints it, and test/famous-lessons.test.js replays each game and checks every moment. Each
// moment's answer, accepted alternatives and multiple-choice distractors were checked with
// Stockfish 19 (depth 20, MultiPV); where the master's move is not the engine's choice the moment
// is marked kind:'continuation' and the explanation says so.
//
// Moment fields:
//   ply     index into moves; the learner sees the position BEFORE moves[ply] and plays moves[ply]
//   answer  the move the master actually played (=== moves[ply])
//   accept  other moves that also earn credit: moves the engine rates as good as the answer or better;
//           for 'continuation' moments, the engine's own top choices
//   choices 3-4 legal options for multiple-choice mode; always includes the answer, never an accept move
//   kind    'best-move' (find the strongest move), 'plan' (the right idea in a calm position),
//           'defence' (meet a threat), 'continuation' (guess the master's move; not the engine's top choice)

export const MOMENT_KINDS = ['best-move','plan','defence','continuation'];

export const FAMOUS_ERAS = [
  { id:'Romantic', label:'Romantic era', years:'1840s–1880s', blurb:'Gambits, open lines and bold sacrifices. Attackers ruled because defence was not yet well understood.' },
  { id:'Classical', label:'Classical era', years:'1880s–1930s', blurb:'Positional rules took hold: sound development, pawn structure and attacks that are prepared before they are launched.' },
  { id:'Soviet', label:'Soviet era', years:'1940s–1980s', blurb:'The Soviet school combined deep preparation with dynamic play and dominated world chess, with Fischer as the great challenger.' },
  { id:'Modern', label:'Modern era', years:'1990s–2000s', blurb:'Databases, deep opening work and fearless calculation by a new generation of professionals.' },
  { id:'Engine age', label:'Engine age', years:'1997 onwards', blurb:'Computers beat the world champion and became every player’s coach, raising the level of precision at the top.' },
];

export const FAMOUS_LESSONS = [
  {
    id:'immortal-game', title:'The Immortal Game', white:'Adolf Anderssen', black:'Lionel Kieseritzky',
    event:'London (casual game)', year:1851, result:'1-0', opening:'King’s Gambit Accepted, Bishop’s Gambit', era:'Romantic',
    theme:'Active pieces and open lines can outweigh a mountain of material.',
    intro:'Anderssen played this friendly game during the first international tournament, in London, and it became the signature attacking game of the Romantic era. He gives up a bishop, both rooks and finally his queen, yet three minor pieces mate a king whose army has barely moved. Engines have since found holes in some of the sacrifices, so it teaches daring and accuracy at the same time.',
    ending:'Anderssen mates with 23.Be7#. Kieseritzky is reported to have resigned a little earlier; the mating finish is the version usually published.',
    moves:['e4','e5','f4','exf4','Bc4','Qh4+','Kf1','b5','Bxb5','Nf6','Nf3','Qh6','d3','Nh5','Nh4','Qg5','Nf5','c6','g4','Nf6','Rg1','cxb5','h4','Qg6','h5','Qg5','Qf3','Ng8','Bxf4','Qf6','Nc3','Bc5','Nd5','Qxb2','Bd6','Bxg1','e5','Qxa1+','Ke2','Na6','Nxg7+','Kd8','Qf6+','Nxf6','Be7#'],
    moments:[
      { ply:6, kind:'defence', prompt:'Black’s queen checks from h4. How should Anderssen answer the check?', answer:'Kf1', accept:[], choices:['g3','Kf1','Ke2'],
        hint:'Blocking with a pawn would open lines around your own king.',
        explain:'Kf1 gives up castling, but the king is safe for now and Nf3 will soon hit the queen with gain of time. Blocking with g3 lets Black take fxg3 and tear the kingside open, and Ke2 leaves the king standing in the middle of the board.' },
      { ply:22, kind:'best-move', prompt:'The black queen on g5 is short of squares, and the rook on g1 guards g4. What did Anderssen play to chase her?', answer:'h4', accept:[], choices:['Qf3','h4','Nc3','Nd2'],
        hint:'Attack the queen with the humblest piece you have.',
        explain:'12.h4 kicks the queen while the g4-pawn stays protected by the rook. After 12...Qg6 13.h5 she is pushed back again, and every pawn move gains White more room on the kingside. Engines rate it far above the alternatives.' },
      { ply:26, kind:'plan', prompt:'The queen is back on g5. Which move brings a new attacker into play and threatens to trap her?', answer:'Qf3', accept:[], choices:['Nc3','e5','Qf3','Nd2'],
        hint:'Prepare Bxf4. Where would your queen help most?',
        explain:'14.Qf3 brings the queen to the kingside and prepares Bxf4, after which the black queen would have almost nowhere to go. Kieseritzky retreated his knight to g8 just to free f6 for her.' },
      { ply:34, kind:'continuation', prompt:'Black’s queen has taken on b2 and threatens to grab the a1-rook with check. What did Anderssen play?', answer:'Bd6', accept:['Re1','d4'], choices:['Rb1','Bd6','Nxg7+','e5'],
        hint:'He ignored both rooks and used his bishop to cut the black king off.',
        explain:'18.Bd6!? offers both rooks to keep the black king boxed in. It is the most famous move of the game, but engines prefer the calmer 18.Re1 or 18.d4, which keep a winning attack without the gamble. After 18.Bd6 Black could have held by taking the a1-rook with check at once instead of 18...Bxg1.' },
      { ply:38, kind:'defence', prompt:'Black has taken the a1-rook with check. Where should the white king go?', answer:'Ke2', accept:[], choices:['Kg2','Qd1','Ke2'],
        hint:'Blocking with the queen gives her away. Which king square keeps the attack alive?',
        explain:'20.Ke2 is the only good move: the king leaves the back rank, where the black queen and the g1-bishop could keep checking it, and all of White’s attackers stay in place. Engines show that after Kg2 Black gets the upper hand, and Qd1 simply gives away the queen.' },
      { ply:40, kind:'best-move', prompt:'White is down two rooks and a bishop. Find the move that forces mate.', answer:'Nxg7+', accept:[], choices:['Nc7+','Nxg7+','Nf6+','Bc7'],
        hint:'Start with a check that puts a knight where it controls e8.',
        explain:'21.Nxg7+ drives the king to d8 and leaves a knight on g7 guarding e8. Now 22.Qf6+ and 23.Be7 is mate. The tempting fork 21.Nc7+ wins a rook but lets Black off the hook.' },
      { ply:42, kind:'best-move', prompt:'Mate in two. How does Anderssen finish?', answer:'Qf6+', accept:[], choices:['Be7+','Qf6+','Ne6+','Bc7+'],
        hint:'The knight on g8 is the piece that could capture on e7. Lure it away.',
        explain:'22.Qf6+ forces 22...Nxf6, pulling the g8-knight away from e7. Then 23.Be7 is mate, delivered by minor pieces while most of Black’s army watches.' },
      { ply:44, kind:'best-move', prompt:'Finish the game.', answer:'Be7#', accept:[], choices:['Nxf6','Be7#','exf6','Ne6+'],
        hint:'The bishop gives the last check; the knights cover the escape squares.',
        explain:'23.Be7 is mate. The d5-knight covers c7 and protects the bishop, the g7-knight covers e8, and Black’s own bishop and pawn block c8 and d7.' },
    ],
    questions:[
      { question:'Which white pieces took part in the final mate?', options:['Two knights and a bishop','Queen and rook','Rook and bishop','Bishop and pawn'], answer:'Two knights and a bishop',
        explain:'The bishop on e7 gives check, the knight on d5 covers c7 and protects the bishop, and the knight on g7 covers e8.' },
      { question:'Why did Black lose despite winning so much material?', options:['His pieces never developed and his king had no shelter','He lost on time','His pawn structure was ruined','He castled into the attack'], answer:'His pieces never developed and his king had no shelter',
        explain:'Black captured two rooks and a bishop, but most of his queenside pieces were still at home, while every remaining white piece was aimed at his king.' },
    ],
    source:{ title:'Immortal Game (Wikipedia)', url:'https://en.wikipedia.org/wiki/Immortal_Game' },
  },
  {
    id:'evergreen-game', title:'The Evergreen Game', white:'Adolf Anderssen', black:'Jean Dufresne',
    event:'Berlin (casual game)', year:1852, result:'1-0', opening:'Evans Gambit', era:'Romantic',
    theme:'Open files, a quiet rook move and a queen sacrifice ending in double check.',
    intro:'A year after the Immortal Game, Anderssen produced a second masterpiece in a friendly game in Berlin. He gambits a pawn, opens lines against the black king and finishes with a queen sacrifice and a double check. Engines show that Black could have defended at one point, which makes the decisive mistake easy to study.',
    ending:'Anderssen mates with 24.Bxe7#.',
    moves:['e4','e5','Nf3','Nc6','Bc4','Bc5','b4','Bxb4','c3','Ba5','d4','exd4','O-O','d3','Qb3','Qf6','e5','Qg6','Re1','Nge7','Ba3','b5','Qxb5','Rb8','Qa4','Bb6','Nbd2','Bb7','Ne4','Qf5','Bxd3','Qh5','Nf6+','gxf6','exf6','Rg8','Rad1','Qxf3','Rxe7+','Nxe7','Qxd7+','Kxd7','Bf5+','Ke8','Bd7+','Kf8','Bxe7#'],
    moments:[
      { ply:16, kind:'plan', prompt:'Black’s queen sits on f6, eyeing f2 and c3. What is White’s most energetic move?', answer:'e5', accept:[], choices:['Bg5','e5','Bxf7+','Nbd2'],
        hint:'A central pawn can attack the queen and take space at the same time.',
        explain:'9.e5 hits the queen and grabs space, so White keeps the initiative the gambit pawn paid for. Quieter moves such as Bg5 or Nbd2 give Black time to finish developing, and Bxf7+ just gives away a bishop.' },
      { ply:24, kind:'defence', prompt:'Black’s rook on b8 attacks the white queen on b5. Where should she go?', answer:'Qa4', accept:[], choices:['Qxb8','Qc5','Qa4','Qb3'],
        hint:'Find the square where the queen is safe and attacks something at the same time.',
        explain:'13.Qa4 is the only good square: the queen is out of the rook’s reach and attacks the bishop on a5, so Black must spend another move on it. On c5 she is chased by ...Bb6 and soon lost, Qb3 walks into the rook, and Qxb8 gives her up for a rook.' },
      { ply:30, kind:'best-move', prompt:'Black’s queen on f5 attacks the knight on e4, and the pawn on d3 still cramps White. What is the strongest move?', answer:'Bxd3', accept:[], choices:['Nf6+','Bxd3','Bxf7+','Nd6+'],
        hint:'One capture solves both problems.',
        explain:'16.Bxd3 wins the troublesome pawn and defends the e4-knight in one move, and the bishop now points at the black kingside. The flashy knight checks and Bxf7+ only lose material.' },
      { ply:32, kind:'continuation', prompt:'Anderssen now starts a long combination. What did he play?', answer:'Nf6+', accept:['Ng3','Rad1'], choices:['Re3','Nf6+','Qxa7','Bd6'],
        hint:'A knight sacrifice with check opens the g-file and lets the e5-pawn advance.',
        explain:'17.Nf6+ gxf6 18.exf6 opens lines and plants a pawn next to the black king. Engines prefer the quiet 17.Ng3 or 17.Rad1, which keep a large advantage; after the sacrifice, accurate defence would have held the balance. Black had to find that defence, and he did not.' },
      { ply:36, kind:'plan', prompt:'Black’s queen and rook are aiming at g2. What did Anderssen play?', answer:'Rad1', accept:['Be4','Qd1'], choices:['Rad1','Rxe7+','Nh4','Bxh7'],
        hint:'Bring your last inactive piece to the d-file, behind the bishop.',
        explain:'19.Rad1 brings the last white piece into play and sets up discovered attacks on the d-file. With best play the position is about level: Black could have defended with 19...Bd4!, but Dufresne’s natural 19...Qxf3 lost to the finish. Engines rate 19.Be4 a shade higher.' },
      { ply:38, kind:'best-move', prompt:'Black has taken on f3 and threatens Qxg2 mate. Find White’s only way to win.', answer:'Rxe7+', accept:[], choices:['Be4','Rxe7+','Qe4','Bg6'],
        hint:'Start with a check, so Black never gets time for his own mate.',
        explain:'20.Rxe7+ removes a defender with check. After 20...Nxe7 the d-file opens for the queen sacrifice and the bishops. Defensive tries such as Be4 or Qe4 fail, and anything slow runs into mate on g2.' },
      { ply:40, kind:'best-move', prompt:'Black still threatens mate on g2. Find the forced mate in four.', answer:'Qxd7+', accept:[], choices:['Be4','Qxd7+','Qe4','Qg4'],
        hint:'Remove the d7-pawn, whatever it costs, so the rook on d1 can join in.',
        explain:'21.Qxd7+! Kxd7 drags the king onto the d-file. Then 22.Bf5+ is a double check from bishop and rook, and after 22...Ke8 23.Bd7+ Kf8 24.Bxe7 is mate.' },
      { ply:42, kind:'best-move', prompt:'The king has taken the queen on d7. Every bishop move uncovers a check from the d1-rook. Which one mates by force?', answer:'Bf5+', accept:[], choices:['Bb5+','Be2+','Bf5+','Bc2+'],
        hint:'Make it a double check, and choose the diagonal that also covers e6.',
        explain:'22.Bf5+ is a double check, so the king has to move, and from f5 the bishop also covers e6. After 22...Ke8 23.Bd7+ Kf8 24.Bxe7 is mate. 22.Bb5+ is a double check too, but the king slips out via e6.' },
    ],
    questions:[
      { question:'Which tactical device made 22.Bf5+ decisive?', options:['Double check','Pin','Skewer','Zugzwang'], answer:'Double check',
        explain:'The bishop gives check from f5 and uncovers the rook on d1 at the same time. Against a double check the king must move; blocking or capturing cannot stop both checks.' },
      { question:'Was Anderssen’s combination sound against perfect defence?', options:['No: 19...Bd4 would have held the balance','Yes: every black move loses','No: Black was winning after 17.Nf6+'], answer:'No: 19...Bd4 would have held the balance',
        explain:'Engines show 19...Bd4 neutralises the attack, but Dufresne chose 19...Qxf3 and was mated. A combination does not need to be perfect to succeed, but checking the defence is always worth the time.' },
    ],
    source:{ title:'Evergreen Game (Wikipedia)', url:'https://en.wikipedia.org/wiki/Evergreen_Game' },
  },
  {
    id:'opera-game', title:'The Opera Game', white:'Paul Morphy', black:'Duke Karl of Brunswick and Count Isouard',
    event:'Paris, at the opera (consultation game)', year:1858, result:'1-0', opening:'Philidor Defence', era:'Romantic',
    theme:'Develop with tempo, open lines and punish a king left in the centre.',
    intro:'Paul Morphy played this game in a box at the Paris opera house against the Duke of Brunswick and Count Isouard, who consulted together. It is the classic lesson in development: Morphy brings a new piece into play with almost every move, opens lines with sacrifices and mates with his last two pieces, while Black’s king’s bishop and rook never leave their starting squares.',
    ending:'Morphy mates with 17.Rd8#.',
    moves:['e4','e5','Nf3','d6','d4','Bg4','dxe5','Bxf3','Qxf3','dxe5','Bc4','Nf6','Qb3','Qe7','Nc3','c6','Bg5','b5','Nxb5','cxb5','Bxb5+','Nbd7','O-O-O','Rd8','Rxd7','Rxd7','Rd1','Qe6','Bxd7+','Nxd7','Qb8+','Nxb8','Rd8#'],
    moments:[
      { ply:12, kind:'best-move', prompt:'Morphy leads in development. Which queen move creates two threats at once?', answer:'Qb3', accept:[], choices:['Nc3','Qb3','Bxf7+','Bg5'],
        hint:'Look at f7 and b7.',
        explain:'7.Qb3 attacks f7, together with the c4-bishop, and b7 at the same time. Black defended f7 with 7...Qe7, which blocks his own bishop and leaves b7 hanging. Simple developing moves are fine but far less forcing.' },
      { ply:18, kind:'best-move', prompt:'Black has played 9...b5, attacking the bishop. What did Morphy play?', answer:'Nxb5', accept:[], choices:['Bxb5','Nxb5','Qxb5','Bxf6'],
        hint:'Keep the initiative: a sacrifice opens lines towards the uncastled king.',
        explain:'10.Nxb5! gives a knight for two pawns but rips open the lines towards e8. After 10...cxb5 11.Bxb5+ the black king is stuck in the centre and White’s pieces flood in. Retreating or trading lets Black catch up in development, and Qxb5 drops the queen to the c6-pawn.' },
      { ply:22, kind:'plan', prompt:'Black has blocked the check with the knight on d7. How does White bring another piece into the attack?', answer:'O-O-O', accept:[], choices:['O-O','O-O-O','Bxd7+','c3'],
        hint:'One move tucks the king away and puts a rook on the open d-file.',
        explain:'12.O-O-O castles and places the rook straight on the d-file, where it attacks the pinned knight on d7. Every white piece is now in play, while Black’s king is still on e8.' },
      { ply:24, kind:'best-move', prompt:'The knight on d7 is pinned and attacked twice. What did Morphy play?', answer:'Rxd7', accept:[], choices:['Bxd7+','Rxd7','Qc4','Rhe1'],
        hint:'Give up the exchange to remove a key defender.',
        explain:'13.Rxd7! Rxd7 14.Rd1 gives back material to keep the pin and bring the second rook in. The black pieces stay tied to d7 and cannot untangle.' },
      { ply:26, kind:'best-move', prompt:'Morphy has given up a rook on d7. How does he keep the pressure on the pinned rook?', answer:'Rd1', accept:[], choices:['Bxd7+','Rd1','Bxf6','Qc4'],
        hint:'Bring the last piece to the open file.',
        explain:'14.Rd1 attacks the pinned rook a second time. Black cannot add enough defenders, and the pin decides the game.' },
      { ply:30, kind:'best-move', prompt:'Mate in two! Which move forces it?', answer:'Qb8+', accept:[], choices:['Qxe6+','Qb8+','Rxd7','Qb5'],
        hint:'Sacrifice the queen to drag the knight away from d8.',
        explain:'16.Qb8+! Nxb8 17.Rd8# — the knight must take the queen, and the rook mates on d8, protected by the bishop on g5.' },
      { ply:32, kind:'best-move', prompt:'Finish the game.', answer:'Rd8#', accept:[], choices:['Rd5','Rd8#','Rd7','Bd8'],
        hint:'The bishop on g5 protects the square in front of the king.',
        explain:'17.Rd8 is mate: the bishop on g5 protects the rook and covers e7, the rook itself covers d7, and Black’s own bishop and pawn block f8 and f7.' },
    ],
    questions:[
      { question:'Why was 3...Bg4 followed by 4...Bxf3 a poor idea for Black?', options:['White recaptured with the queen and gained time','It lost a pawn by force','It let White castle at once','It weakened Black’s king'], answer:'White recaptured with the queen and gained time',
        explain:'After 5.Qxf3 White’s queen is developed with tempo and Black has given up a bishop for a knight. White is ahead in development, which Morphy exploits brilliantly.' },
      { question:'Which principle does 12.O-O-O show best?', options:['Castle while bringing a rook to an open file','Keep the king in the centre in open positions','Trade queens when ahead','Push the pawns in front of your king'], answer:'Castle while bringing a rook to an open file',
        explain:'Castling queenside tucks the king away and lands the rook on the d-file, where it hits the pinned knight immediately.' },
    ],
    source:{ title:'Opera Game (Wikipedia)', url:'https://en.wikipedia.org/wiki/Opera_Game' },
  },
  {
    id:'reti-tartakower-1910', title:'Réti’s Mate', white:'Richard Réti', black:'Savielly Tartakower',
    event:'Vienna (casual game)', year:1910, result:'1-0', opening:'Caro-Kann Defence', era:'Classical',
    theme:'A king left on the open d-file falls to a queen sacrifice and a double check.',
    intro:'One of the most famous short games ever played. Tartakower, who later became a leading grandmaster and writer, grabs a knight while his king is still in the centre, and Réti punishes him with a queen sacrifice, a double check and a mate by the bishop. The final pattern is still taught as Réti’s mate.',
    ending:'The earliest printings end with 10.Bg5+ and Black resigning; Tartakower’s own version adds 10...Kc7 11.Bd8#, the form usually shown.',
    moves:['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nf6','Qd3','e5','dxe5','Qa5+','Bd2','Qxe5','O-O-O','Nxe4','Qd8+','Kxd8','Bg5+','Kc7','Bd8#'],
    moments:[
      { ply:12, kind:'defence', prompt:'Black checks from a5 and also eyes the e5-pawn. How should White answer the check?', answer:'Bd2', accept:[], choices:['Nc3','Bd2','c3','Qd2'],
        hint:'Block with a piece that develops and prepares castling.',
        explain:'7.Bd2 blocks the check with a developing move. Black wins the pawn back with 7...Qxe5, but White gains time to castle queenside. Nc3 allows ...Qxe5 with check and a queen trade, and c3 or Qd2 do nothing for development.' },
      { ply:14, kind:'plan', prompt:'The black queen on e5 pins the knight on e4 against the white king. What did Réti play?', answer:'O-O-O', accept:[], choices:['Nf3','O-O-O','f3','Qd8+'],
        hint:'Unpin the knight by moving the king, and bring a rook to the d-file.',
        explain:'8.O-O-O takes the king off the e-file, so the knight is no longer pinned, and puts a rook on the d-file facing the black king. It also sets a trap. The queen sacrifice Qd8+ does not work yet: without the rook on d1 the bishop check that follows is not a double check. Nf3 simply loses the knight.' },
      { ply:16, kind:'best-move', prompt:'Tartakower has grabbed the knight with 8...Nxe4. Mate in three!', answer:'Qd8+', accept:[], choices:['Re1','Qd8+','Qxe4','Qd7+'],
        hint:'Put the queen where the king has to take it.',
        explain:'9.Qd8+! Kxd8 forces the king onto the d-file, in line with the rook on d1. Then 10.Bg5+ is a double check, and after 10...Kc7 11.Bd8 is mate.' },
      { ply:18, kind:'best-move', prompt:'The king has taken the queen on d8. Every bishop check also uncovers the rook on d1. Which one mates next move?', answer:'Bg5+', accept:[], choices:['Bf4+','Bg5+','Ba5+','Bc3+'],
        hint:'Look for a double check in which the bishop also covers e7.',
        explain:'10.Bg5+ is a double check from bishop and rook, and the bishop also covers e7. After 10...Kc7 11.Bd8 is mate, and 10...Ke8 allows 11.Rd8#. Ba5+ is a double check too, but the king escapes to e7.' },
      { ply:20, kind:'best-move', prompt:'Finish with mate.', answer:'Bd8#', accept:[], choices:['Rd7+','Bd8#','Nf3','Be3'],
        hint:'The bishop can land where the queen was sacrificed.',
        explain:'11.Bd8 is mate. The rook on d1 protects the bishop and covers d6 and d7, the bishop covers b6, and Black’s own pieces block the remaining squares. This bishop-and-rook pattern is known as Réti’s mate.' },
    ],
    questions:[
      { question:'What was Black’s decisive mistake?', options:['8...Nxe4, grabbing the knight with the king still on e8','6...Qa5+, giving a check','5...e5, offering a pawn','1...c6, choosing the Caro-Kann'], answer:'8...Nxe4, grabbing the knight with the king still on e8',
        explain:'After 8...Nxe4 White’s queen and rook line up on the d-file against the king, and the sacrifice on d8 forces mate. 8...Be7, getting ready to castle, would have kept Black in the game.' },
    ],
    source:{ title:'Réti v Tartakower, Vienna, 1910 (Edward Winter, Chess Notes)', url:'https://www.chesshistory.com/winter/extra/retitartakower.html' },
  },
  {
    id:'capablanca-marshall-1918', title:'The Marshall Attack Unveiled', white:'José Raúl Capablanca', black:'Frank Marshall',
    event:'New York, Manhattan Chess Club masters tournament', year:1918, result:'1-0', opening:'Ruy Lopez, Marshall Attack', era:'Classical',
    theme:'Take the gambit pawn, defend calmly, then let the extra material decide.',
    intro:'A well-known story says Marshall saved this pawn sacrifice for years, waiting to spring it on Capablanca. Capablanca took the pawn, defended precisely through a fierce kingside attack, walked his king to safety and then won with his extra material. The gambit survived too: the Marshall Attack is still a respected weapon at the highest level.',
    ending:'After 36.Bxf7+ Marshall resigned: the b-pawn promotes and mate follows.',
    moves:['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','O-O','c3','d5','exd5','Nxd5','Nxe5','Nxe5','Rxe5','Nf6','Re1','Bd6','h3','Ng4','Qf3','Qh4','d4','Nxf2','Re2','Bg4','hxg4','Bh2+','Kf1','Bg3','Rxf2','Qh1+','Ke2','Bxf2','Bd2','Bh4','Qh3','Rae8+','Kd3','Qf1+','Kc2','Bf2','Qf3','Qg1','Bd5','c5','dxc5','Bxc5','b4','Bd6','a4','a5','axb5','axb4','Ra6','bxc3','Nxc3','Bb4','b6','Bxc3','Bxc3','h6','b7','Re3','Bxf7+'],
    moments:[
      { ply:18, kind:'plan', prompt:'Marshall has offered a pawn with 8...d5. After the exchanges on d5, what did Capablanca play?', answer:'Nxe5', accept:[], choices:['Bxd5','Nxe5','Ng5','Rxe5'],
        hint:'Material is worth taking when you can see no immediate danger.',
        explain:'10.Nxe5 accepts the gambit: Capablanca took the pawn and trusted his defence, and this is still the main line today. Declining is playable but a little weaker, while tricks such as Ng5, Bxd5 or Rxe5 only lose material.' },
      { ply:28, kind:'plan', prompt:'Black’s queen and knight are gathering around the white king. Which move develops and blunts the attack?', answer:'d4', accept:[], choices:['hxg4','d4','Re4','Qxf7+'],
        hint:'Open the diagonal of the c1-bishop while taking control of the centre.',
        explain:'15.d4 frees the c1-bishop and takes control of e5 and c5. Engines rate it well above everything else. Grabbing the knight with hxg4 opens the h-file for Black’s queen, and Qxf7+ just gives away the queen.' },
      { ply:30, kind:'defence', prompt:'Marshall’s knight has jumped into f2. How should Capablanca defend?', answer:'Re2', accept:[], choices:['Kf1','Re2','g3','Rf1'],
        hint:'Attack the intruder and cover your second rank at the same time.',
        explain:'16.Re2! attacks the knight on f2 and guards the second rank. Taking the knight at once with Qxf2 is playable but clearly weaker, and moving the king or weakening the kingside with g3 lets Black’s pieces in.' },
      { ply:32, kind:'best-move', prompt:'Marshall has played 16...Bg4, attacking the queen and offering the bishop. What did Capablanca play?', answer:'hxg4', accept:[], choices:['Qxf2','hxg4','Rxf2','Bg5'],
        hint:'Take the gift. Your king will be checked, but it has a way out.',
        explain:'17.hxg4 grabs the bishop. Black gets a run of checks, but the white king walks to safety and the extra material stays. 17.Qxf2 would leave White worse.' },
      { ply:44, kind:'defence', prompt:'Black checks with 22...Rae8+. Where should the king go?', answer:'Kd3', accept:[], choices:['Be6','Kd3','Be3','Kf3'],
        hint:'Only one square survives. Blocking costs a piece.',
        explain:'23.Kd3! walks towards the queenside, where the king will be safe. Blocking on e6 or e3 loses a piece, and Kf3 runs into ...Qf1 mate.' },
      { ply:50, kind:'plan', prompt:'The white king has reached c2. How does Capablanca complete his regrouping?', answer:'Bd5', accept:[], choices:['a4','Bd5','Qd5','Bxf7+'],
        hint:'Put the bishop on the strongest central square.',
        explain:'26.Bd5 centralises the bishop, eyeing f7 and the queenside while covering key squares near the white king. With everything protected, White can start using the extra material.' },
      { ply:64, kind:'best-move', prompt:'White has a passed b-pawn. What is the strongest move?', answer:'b6', accept:[], choices:['Bxf7+','b6','Rf6','Na4'],
        hint:'Passed pawns must be pushed.',
        explain:'33.b6 pushes the passed pawn closer to promotion, and Black’s pieces are too far away to stop it. The sacrifice on f7 or slow knight moves let Black back into the game.' },
      { ply:70, kind:'best-move', prompt:'The pawn is on b7. Find the fastest win.', answer:'Bxf7+', accept:[], choices:['Qxf7+','Bxf7+','Qxe3','b8=Q'],
        hint:'Drag away the rook that guards b8.',
        explain:'36.Bxf7+! wins at once: after 36...Rxf7 37.b8=Q+ the f8-rook has been pulled away from the promotion square, and White’s new queen joins the attack. Marshall resigned. Queening immediately runs into ...Rxb8.' },
    ],
    questions:[
      { question:'What was the main idea behind Marshall’s pawn sacrifice?', options:['A fast attack on the white king while White’s queenside pieces were undeveloped','To win the pawn back immediately','To force a draw by repetition','To trade queens early'], answer:'A fast attack on the white king while White’s queenside pieces were undeveloped',
        explain:'Black gives a pawn for quick development and pressure against h2, f2 and the white king. Capablanca defended accurately, but the gambit itself became a major opening.' },
    ],
    source:{ title:'Capablanca vs Marshall, New York 1918 (chessgames.com)', url:'https://www.chessgames.com/perl/chessgame?gid=1095025' },
  },
  {
    id:'botvinnik-capablanca-1938', title:'Botvinnik’s Bishop Offer', white:'Mikhail Botvinnik', black:'José Raúl Capablanca',
    event:'AVRO tournament, Rotterdam', year:1938, result:'1-0', opening:'Nimzo-Indian Defence', era:'Soviet',
    theme:'A rolling pawn centre, a passed pawn and a sacrifice that deflects the queen.',
    intro:'At AVRO 1938, one of the strongest tournaments of its time, the young Soviet champion Botvinnik met the former world champion Capablanca. Botvinnik let Black win a queenside pawn, pushed his central pawns forward and crowned the attack with 30.Ba3, a bishop offer that pulls Black’s queen away from the defence. The game became a model of how to use a pawn centre.',
    ending:'After 41.Kh5 Capablanca resigned: the white king has escaped the checks and the e-pawn will promote.',
    moves:['d4','Nf6','c4','e6','Nc3','Bb4','e3','d5','a3','Bxc3+','bxc3','c5','cxd5','exd5','Bd3','O-O','Ne2','b6','O-O','Ba6','Bxa6','Nxa6','Bb2','Qd7','a4','Rfe8','Qd3','c4','Qc2','Nb8','Rae1','Nc6','Ng3','Na5','f3','Nb3','e4','Qxa4','e5','Nd7','Qf2','g6','f4','f5','exf6','Nxf6','f5','Rxe1','Rxe1','Re8','Re6','Rxe6','fxe6','Kg7','Qf4','Qe8','Qe5','Qe7','Ba3','Qxa3','Nh5+','gxh5','Qg5+','Kf8','Qxf6+','Kg8','e7','Qc1+','Kf2','Qc2+','Kg3','Qd3+','Kh4','Qe4+','Kxh5','Qe2+','Kh4','Qe4+','g4','Qe1+','Kh5'],
    moments:[
      { ply:34, kind:'plan', prompt:'Black’s knight would like to land on e4. How does Botvinnik prepare his central advance?', answer:'f3', accept:[], choices:['Re2','f3','Nh5','f4'],
        hint:'Take e4 away from the knight and get ready to push your e-pawn.',
        explain:'18.f3 stops ...Ne4 and prepares e3–e4, so the pawn centre can roll forward. Quiet moves elsewhere let Black settle his pieces, and f4 gives the e4-square to the black knight for good.' },
      { ply:36, kind:'plan', prompt:'Black’s knight has reached b3 and the a4-pawn is about to fall. What did Botvinnik play?', answer:'e4', accept:[], choices:['a5','e4','f4','Qxb3'],
        hint:'Ignore the queenside and push in the centre.',
        explain:'19.e4! gives up the a4-pawn to start the central advance. The pawns roll on with e5 and f4–f5, driving Black’s pieces back while his queenside play is too slow. Grabbing the knight with Qxb3 loses the queen to ...cxb3.' },
      { ply:46, kind:'best-move', prompt:'White’s pawns stand on d4 and f4. How does Botvinnik keep the attack rolling?', answer:'f5', accept:[], choices:['h3','f5','Rxe8+','Re5'],
        hint:'Push the f-pawn again to open lines near the king.',
        explain:'24.f5! hits g6 and opens lines towards the black king; Black has to trade rooks and cannot stop the pawns. Slower moves give Black time to bring his queen back.' },
      { ply:50, kind:'best-move', prompt:'Where does White’s rook belong?', answer:'Re6', accept:[], choices:['fxg6','Re6','Rxe8+','Re5'],
        hint:'Invade on the open file, attacking the f6-knight.',
        explain:'26.Re6! plants the rook deep in Black’s half, attacking the f6-knight and supporting the f-pawn. After 26...Rxe6 27.fxe6 White has a passed pawn on e6 that becomes the hero of the game.' },
      { ply:54, kind:'best-move', prompt:'White has a passed pawn on e6. What is the strongest queen move?', answer:'Qf4', accept:[], choices:['Qe3','Qf4','Nf5+','Qxf6+'],
        hint:'Head for the dark squares around the king and support the pawn.',
        explain:'28.Qf4 eyes c7 and e5, supports the e-pawn and keeps the black king under pressure. Engines rate it far above every other move.' },
      { ply:58, kind:'best-move', prompt:'The famous moment. Black’s queen guards e7 and the f6-knight. What did Botvinnik play?', answer:'Ba3', accept:[], choices:['h4','Ba3','Nh5+','Qxf6+'],
        hint:'Offer a piece to lure the black queen away from e7.',
        explain:'30.Ba3!! offers the bishop. After 30...Qxa3 the queen has left the defence, and 31.Nh5+! gxh5 32.Qg5+ Kf8 33.Qxf6+ wins the knight and frees the e-pawn. Declining does not help Black either. Playing Nh5+ first, while the queen still guards e7, does not work.' },
      { ply:60, kind:'best-move', prompt:'Capablanca has taken the bishop with 30...Qxa3. Now strike!', answer:'Nh5+', accept:[], choices:['Qc7+','Nh5+','e7','Qxf6+'],
        hint:'A knight sacrifice with check opens the g-file.',
        explain:'31.Nh5+! gxh5 32.Qg5+ Kf8 33.Qxf6+ removes the knight that guards the promotion square, and the e-pawn is ready to run. Quieter moves let Black’s queen return.' },
      { ply:72, kind:'defence', prompt:'Black is checking to save the game. Where should the white king go?', answer:'Kh4', accept:[], choices:['Kf4','Kh4','Qf3'],
        hint:'Walk towards the black pawns, where the checks run out.',
        explain:'37.Kh4! heads for h5, where the king escapes the checks and even picks up a pawn. Kf4 allows a perpetual check, and Qf3 trades queens into an endgame that Black wins.' },
    ],
    questions:[
      { question:'What role did the e-pawn play in Botvinnik’s win?', options:['It became a passed pawn that tied Black down and decided the game','It was sacrificed to open the e-file','It blocked Black’s bishop','It was lost early in the middlegame'], answer:'It became a passed pawn that tied Black down and decided the game',
        explain:'From 27.fxe6 onwards the passed e-pawn kept Black’s queen and knight busy, and the sacrifices on a3 and h5 were designed to clear its path to e8.' },
    ],
    source:{ title:'Botvinnik versus Capablanca, AVRO 1938 (Wikipedia)', url:'https://en.wikipedia.org/wiki/Botvinnik_versus_Capablanca,_AVRO_1938' },
  },
  {
    id:'game-of-the-century', title:'The Game of the Century', white:'Donald Byrne', black:'Bobby Fischer',
    event:'Rosenwald Memorial, New York', year:1956, result:'0-1', opening:'Grünfeld Defence', era:'Soviet',
    theme:'Piece activity and a famous queen sacrifice by a 13-year-old.',
    intro:'Thirteen-year-old Bobby Fischer, playing Black against one of America’s leading masters, sacrificed his queen on move 17 to unleash his minor pieces. A windmill of checks collected material, and Fischer’s pieces then hunted the white king down to mate. The game announced a future world champion.',
    ending:'Fischer mates with 41...Rc2#.',
    moves:['Nf3','Nf6','c4','g6','Nc3','Bg7','d4','O-O','Bf4','d5','Qb3','dxc4','Qxc4','c6','e4','Nbd7','Rd1','Nb6','Qc5','Bg4','Bg5','Na4','Qa3','Nxc3','bxc3','Nxe4','Bxe7','Qb6','Bc4','Nxc3','Bc5','Rfe8+','Kf1','Be6','Bxb6','Bxc4+','Kg1','Ne2+','Kf1','Nxd4+','Kg1','Ne2+','Kf1','Nc3+','Kg1','axb6','Qb4','Ra4','Qxb6','Nxd1','h3','Rxa2','Kh2','Nxf2','Re1','Rxe1','Qd8+','Bf8','Nxe1','Bd5','Nf3','Ne4','Qb8','b5','h4','h5','Ne5','Kg7','Kg1','Bc5+','Kf1','Ng3+','Ke1','Bb4+','Kd1','Bb3+','Kc1','Ne2+','Kb1','Nc3+','Kc1','Rc2#'],
    moments:[
      { ply:21, kind:'best-move', prompt:'Byrne’s queen on c5 and bishop on g5 look active. What did the young Fischer play?', answer:'Na4', accept:[], choices:['Nbd7','Na4','Nxe4','Re8'],
        hint:'Attack the knight that defends e4, even if your own knight can be taken.',
        explain:'11...Na4!! attacks the c3-knight, the only defender of the e4-pawn. Taking with 12.Nxa4 allows ...Nxe4 with a crushing attack, so Byrne played 12.Qa3, and after 12...Nxc3 13.bxc3 Nxe4 Fischer won the e-pawn and opened the centre anyway.' },
      { ply:25, kind:'best-move', prompt:'The c3-knight is gone. What is Black’s best move now?', answer:'Nxe4', accept:[], choices:['Qd6','Nxe4','h6','Nd5'],
        hint:'Take the pawn that has lost its defender.',
        explain:'13...Nxe4 wins the central pawn and opens lines towards the white king, which is still in the centre. When Byrne grabbed the exchange with 14.Bxe7, Fischer ignored it and kept the initiative with 14...Qb6.' },
      { ply:29, kind:'best-move', prompt:'White has just developed with 15.Bc4. How does Fischer keep up the pressure?', answer:'Nxc3', accept:[], choices:['Rfe8','Nxc3','Bxf3','Nxf2'],
        hint:'Grab a pawn and attack the rook on d1.',
        explain:'15...Nxc3 wins a pawn and attacks the rook on d1, gaining time while the white king is still on e1. Engines rate it as the strongest move.' },
      { ply:33, kind:'best-move', prompt:'Black’s queen on b6 is attacked by the bishop on c5. Instead of moving her, what did Fischer play?', answer:'Be6', accept:[], choices:['Nb5','Be6','Qxc5','Nxd1'],
        hint:'Leave the queen and attack the c4-bishop, with checks ready on the a6–f1 diagonal.',
        explain:'17...Be6!! is the famous queen sacrifice. If 18.Bxb6, Black starts a windmill of checks with 18...Bxc4+ and collects far more material than the queen is worth. Byrne took the queen; 18.Qxc3 was a better try, but Black stays clearly on top either way.' },
      { ply:35, kind:'best-move', prompt:'Byrne has taken the queen with 18.Bxb6. Now what?', answer:'Bxc4+', accept:[], choices:['axb6','Bxc4+','Nxd1','Nb5'],
        hint:'Check first. Taking back on b6 can wait.',
        explain:'18...Bxc4+ starts the windmill: knight and bishop take turns giving check, picking up material while the white king can only shuffle between f1 and g1. Recapturing on b6 at once would leave Black simply a queen down.' },
      { ply:37, kind:'best-move', prompt:'The white king has gone to g1. Keep the windmill turning.', answer:'Ne2+', accept:[], choices:['Nxd1','Ne2+','Bxd4','axb6'],
        hint:'A knight check, which then lets the c4-bishop check too.',
        explain:'19...Ne2+ 20.Kf1 Nxd4+ 21.Kg1 Ne2+ 22.Kf1 Nc3+ 23.Kg1: the knight checks, then steps away to uncover checks from the c4-bishop, grabbing the d4-pawn and returning to c3 to attack the d1-rook. Only then does Fischer recapture on b6.' },
      { ply:81, kind:'best-move', prompt:'Mate in one. Finish the game.', answer:'Rc2#', accept:['Ba3#'], choices:['Ra8','Rc2#','Ra7','Rb2'],
        hint:'The rook can reach the second rank right next to the king.',
        explain:'41...Rc2 is mate: the rook is protected by the bishop on b3, and the knight on c3 covers b1 and d1. 41...Ba3 is also mate.' },
    ],
    questions:[
      { question:'How old was Bobby Fischer when he played this game?', options:['13','16','19','11'], answer:'13',
        explain:'Fischer was 13. The game made him famous, and two years later he became the youngest grandmaster of his time.' },
      { question:'What is a windmill in chess?', options:['A series of checks and discovered checks that wins material while the king shuffles back and forth','A rook manoeuvre along the seventh rank','A queen sacrifice that forces stalemate','A pawn chain pointing at the king'], answer:'A series of checks and discovered checks that wins material while the king shuffles back and forth',
        explain:'After 18...Bxc4+ the white king could only move between f1 and g1, while Fischer’s knight gave checks or uncovered checks from the bishop, picking up material each time.' },
    ],
    source:{ title:'The Game of the Century (Wikipedia)', url:'https://en.wikipedia.org/wiki/The_Game_of_the_Century_(chess)' },
  },
  {
    id:'fischer-spassky-1972-g6', title:'Fischer’s Queen’s Gambit', white:'Bobby Fischer', black:'Boris Spassky',
    event:'World Championship, Reykjavík (game 6)', year:1972, result:'1-0', opening:'Queen’s Gambit Declined, Tartakower Variation', era:'Soviet',
    theme:'Target the weak pawns, open a second front and break through on the f-file.',
    intro:'Fischer almost always opened with 1.e4, so 1.c4 in game 6 surprised everyone. He steered into a solid Queen’s Gambit, left Spassky with weak central pawns, then advanced e4, f4 and e5 and switched to a kingside attack. Spassky is said to have joined the applause at the end, and the win gave Fischer the lead in the match for the first time.',
    ending:'After 41.Qf4 Spassky resigned: White’s rook, queen and e-pawn are too strong.',
    moves:['c4','e6','Nf3','d5','d4','Nf6','Nc3','Be7','Bg5','O-O','e3','h6','Bh4','b6','cxd5','Nxd5','Bxe7','Qxe7','Nxd5','exd5','Rc1','Be6','Qa4','c5','Qa3','Rc8','Bb5','a6','dxc5','bxc5','O-O','Ra7','Be2','Nd7','Nd4','Qf8','Nxe6','fxe6','e4','d4','f4','Qe7','e5','Rb8','Bc4','Kh8','Qh3','Nf8','b3','a5','f5','exf5','Rxf5','Nh7','Rcf1','Qd8','Qg3','Re7','h4','Rbb7','e6','Rbc7','Qe5','Qe8','a4','Qd8','R1f2','Qe8','R2f3','Qd8','Bd3','Qe8','Qe4','Nf6','Rxf6','gxf6','Rxf6','Kg8','Bc4','Kh8','Qf4'],
    moments:[
      { ply:36, kind:'plan', prompt:'Black’s bishop on e6 guards the d5-pawn and the light squares. What did Fischer play?', answer:'Nxe6', accept:[], choices:['f4','Nxe6','Bxa6','Qxc5'],
        hint:'Trade off the piece that holds Black’s centre together.',
        explain:'19.Nxe6 fxe6 removes Black’s good bishop and leaves the central pawns as targets, so the e4 break gains force. Grabbing a pawn with Bxa6 or Qxc5 loses material, and engines rate f4 far worse.' },
      { ply:40, kind:'plan', prompt:'Black has answered 20.e4 with 20...d4, closing the centre. How does Fischer open a new front?', answer:'f4', accept:[], choices:['Bc4','f4','Bxa6','Qxc5'],
        hint:'Prepare e5, gaining space and opening the f-file for your rooks.',
        explain:'21.f4 prepares e5, which cramps Black, and opens the f-file for the rooks. Engines rate it almost a pawn better than the alternatives; snatching pawns on a6 or c5 loses material.' },
      { ply:44, kind:'best-move', prompt:'The e5-pawn now cramps Black. Where does Fischer’s bishop belong?', answer:'Bc4', accept:[], choices:['f5','Bc4','Bxa6','Qxc5'],
        hint:'Aim it at the weak e6-pawn.',
        explain:'23.Bc4 targets the backward e6-pawn and controls d5. With the queen coming to h3 next, e6 comes under heavy fire and Black has no counterplay.' },
      { ply:60, kind:'plan', prompt:'White’s rooks control the f-file. How does Fischer make the most of his e-pawn?', answer:'e6', accept:[], choices:['Qxg7+','e6','Rf8+','Rf6'],
        hint:'Push the pawn to cut Black’s position in two.',
        explain:'31.e6 creates a protected passed pawn deep in Black’s camp, backed by the c4-bishop, and cuts the black rooks off from the kingside. Engines rate it as the strongest plan. The flashy checks on g7 and f8 lose material.' },
      { ply:74, kind:'best-move', prompt:'Black has brought his knight to f6 to defend. Find the breakthrough.', answer:'Rxf6', accept:[], choices:['Qe1','Rxf6','Qg4','Rxc5'],
        hint:'Give up a rook to remove the last defender of the king.',
        explain:'38.Rxf6! gxf6 39.Rxf6 removes the knight that guards the king and leaves Black facing queen, rook, bishop and the e-pawn. Slower moves give Black time to untangle.' },
    ],
    questions:[
      { question:'Why was Fischer’s first move a surprise?', options:['He almost always opened with 1.e4','It was his first game of the match','Spassky had never faced 1.c4','It broke the match rules'], answer:'He almost always opened with 1.e4',
        explain:'Fischer was famous for his loyalty to 1.e4. Switching to 1.c4 and a Queen’s Gambit took the game into positions Spassky had not expected.' },
      { question:'What was the main target of White’s middlegame play?', options:['The weak e6-pawn and the black king','Black’s a-pawn','Black’s queen on the back rank','The d4-pawn'], answer:'The weak e6-pawn and the black king',
        explain:'After 19.Nxe6 fxe6 and the e4-e5 advance, Fischer aimed bishop, rooks and queen at e6 and the kingside, then broke through on the f-file.' },
    ],
    source:{ title:'World Chess Championship 1972, game 6 (Wikipedia)', url:'https://en.wikipedia.org/wiki/World_Chess_Championship_1972' },
  },
  {
    id:'karpov-kasparov-1985-g16', title:'The Octopus Knight', white:'Anatoly Karpov', black:'Garry Kasparov',
    event:'World Championship, Moscow (game 16)', year:1985, result:'0-1', opening:'Sicilian Defence, Kasparov Gambit', era:'Soviet',
    theme:'One knight planted on d3 can paralyse a whole army.',
    intro:'Kasparov sacrificed a pawn in the opening and planted a knight on d3, deep in White’s camp. No white pawn could ever attack it, and for almost twenty moves it cut Karpov’s position in two while Black built up on the queenside. Kasparov won the match a few weeks later and became the youngest world champion up to that time.',
    ending:'After 40...Re1+ Karpov resigned: mate follows.',
    moves:['e4','c5','Nf3','e6','d4','cxd4','Nxd4','Nc6','Nb5','d6','c4','Nf6','N1c3','a6','Na3','d5','cxd5','exd5','exd5','Nb4','Be2','Bc5','O-O','O-O','Bf3','Bf5','Bg5','Re8','Qd2','b5','Rad1','Nd3','Nab1','h6','Bh4','b4','Na4','Bd6','Bg3','Rc8','b3','g5','Bxd6','Qxd6','g3','Nd7','Bg2','Qf6','a3','a5','axb4','axb4','Qa2','Bg6','d6','g4','Qd2','Kg7','f3','Qxd6','fxg4','Qd4+','Kh1','Nf6','Rf4','Ne4','Qxd3','Nf2+','Rxf2','Bxd3','Rfd2','Qe3','Rxd3','Rc1','Nb2','Qf2','Nd2','Rxd1+','Nxd1','Re1+'],
    moments:[
      { ply:15, kind:'continuation', prompt:'Kasparov had prepared a surprise for this position. What did he play?', answer:'d5', accept:['Qa5','Be7','b6'], choices:['Nxe4','d5','b5','a5'],
        hint:'He gave up a central pawn to open lines while White’s knight sits on a3.',
        explain:'8...d5!? is a pawn sacrifice prepared for the match: Black opens the centre while the a3-knight is out of play. Engines slightly prefer solid moves such as 8...Qa5, 8...Be7 or 8...b6, which also earn credit here, and White later found better ways to meet the gambit; in this game it gave Black lasting activity.' },
      { ply:19, kind:'plan', prompt:'White has won a pawn on d5. Which move keeps Black’s compensation?', answer:'Nb4', accept:['Bxa3'], choices:['Na5','Nb4','Nxd5','Ne7'],
        hint:'Send a knight towards squares deep in White’s camp.',
        explain:'10...Nb4 attacks d5 and eyes d3 and c2, so the knight can jump into the heart of White’s position. Engines rate 10...Bxa3, wrecking White’s queenside pawns, as about equal. Retreats such as ...Ne7 or ...Na5 are passive, and ...Nxd5 simply loses a piece.' },
      { ply:31, kind:'plan', prompt:'Find the outpost that gave this game its nickname.', answer:'Nd3', accept:['Qd6','h6','Bd6'], choices:['Nc2','Nd3','Nxa2','Bxf2+'],
        hint:'A square in White’s half that no white pawn can ever attack, guarded by the f5-bishop.',
        explain:'16...Nd3! plants the knight where White cannot easily challenge it: no pawn can attack d3, and the bishop on f5 protects it. From d3 it hits b2, f2, c1 and e1 and splits White’s position in two. Engines rate a few quiet moves about equal, but this knight set the course of the whole game.' },
      { ply:35, kind:'best-move', prompt:'White plans to bring the b1-knight round to challenge d3. What is Black’s strongest move?', answer:'b4', accept:[], choices:['Bd6','b4','Rc8','Nxf2'],
        hint:'Kick the c3-knight before it can help.',
        explain:'18...b4 drives the c3-knight to the edge, so White has even fewer pieces able to fight the d3-knight. Engines rate it clearly best.' },
      { ply:47, kind:'best-move', prompt:'Black’s queen is on d6. Where does it work best?', answer:'Qf6', accept:[], choices:['Qe5','Qf6','N7e5','Nxf2'],
        hint:'Line the queen up on the long diagonal towards the white queenside.',
        explain:'24...Qf6 puts the queen on the long diagonal towards b2 and a1 and supports the coming ...a5 break on the queenside. White’s pieces stay tied up.' },
      { ply:49, kind:'best-move', prompt:'White has just played 25.a3 to challenge the b4-pawn. How does Black keep the bind?', answer:'a5', accept:[], choices:['bxa3','a5','Nf4','Bg4'],
        hint:'Support the b4-pawn with another pawn.',
        explain:'25...a5! supports the b4-pawn and keeps White’s knights boxed in. Taking on a3 releases the pressure and lets White’s pieces back into the game; engines rate it more than three pawns worse.' },
      { ply:67, kind:'best-move', prompt:'Karpov has just taken the d3-knight with his queen. What did Kasparov play?', answer:'Nf2+', accept:[], choices:['Qxd3','Nf2+','Nxg3+','Qe5'],
        hint:'A knight check comes before recapturing.',
        explain:'34...Nf2+! forks king and queen. After 35.Rxf2 Bxd3 Black has won a lot of material. The natural recapture 34...Qxd3 is good, but far less decisive.' },
      { ply:75, kind:'best-move', prompt:'Mate is near. Find the move that ends the game fastest.', answer:'Qf2', accept:[], choices:['Qe2','Qf2','Qg5','Qe1+'],
        hint:'A quiet queen move prepares a rook check on the first rank.',
        explain:'38...Qf2! threatens to break through on the first rank, and White cannot cover all the entry squares. Two moves later Karpov resigned.' },
    ],
    questions:[
      { question:'Why was the knight on d3 so strong?', options:['No white pawn could attack it and Black kept it protected','It gave check to the white king','No white piece could ever capture it','It controlled the long diagonal'], answer:'No white pawn could attack it and Black kept it protected',
        explain:'With White’s c- and e-pawns gone, only a piece could challenge the d3-knight, and Black kept it well protected. It tied White’s pieces down for almost twenty moves.' },
    ],
    source:{ title:'World Chess Championship 1985, game 16 (Wikipedia)', url:'https://en.wikipedia.org/wiki/World_Chess_Championship_1985' },
  },
  {
    id:'short-timman-1991', title:'Short’s King Walk', white:'Nigel Short', black:'Jan Timman',
    event:'Tilburg (Interpolis tournament)', year:1991, result:'1-0', opening:'Alekhine Defence, Modern Variation', era:'Modern',
    theme:'When the opponent’s pieces are tied down, even the king can join the attack.',
    intro:'Short tied Timman’s pieces down with his queen and rooks around the black king, but he still needed one more attacker to give mate. With queens still on the board he marched his own king from g1 up to g5, heading for h6 to support mate on g7. Timman could only watch.',
    ending:'After 34.Kg5 Timman resigned: the king is heading for h6, and mate on g7 cannot be stopped for long.',
    moves:['e4','Nf6','e5','Nd5','d4','d6','Nf3','g6','Bc4','Nb6','Bb3','Bg7','Qe2','Nc6','O-O','O-O','h3','a5','a4','dxe5','dxe5','Nd4','Nxd4','Qxd4','Re1','e6','Nd2','Nd5','Nf3','Qc5','Qe4','Qb4','Bc4','Nb6','b3','Nxc4','bxc4','Re8','Rd1','Qc5','Qh4','b6','Be3','Qc6','Bh6','Bh8','Rd8','Bb7','Rad1','Bg7','R8d7','Rf8','Bxg7','Kxg7','R1d4','Rae8','Qf6+','Kg8','h4','h5','Kh2','Rc8','Kg3','Rce8','Kf4','Bc8','Kg5'],
    moments:[
      { ply:44, kind:'plan', prompt:'White’s queen on h4 eyes the kingside. How does Short weaken Black’s dark squares?', answer:'Bh6', accept:[], choices:['Bg5','Bh6','Rd4','Bd4'],
        hint:'Challenge the bishop that guards them.',
        explain:'23.Bh6 challenges Black’s fianchettoed bishop. Timman kept it with 23...Bh8, but there it is shut in and the squares around his king are weaker. Quieter moves such as Bg5 or Rd4 let Black regroup.' },
      { ply:48, kind:'plan', prompt:'Short’s rook has reached d8. What is the most natural way to increase the pressure?', answer:'Rad1', accept:[], choices:['Rxa8','Rad1','Rxe8+','Bg7'],
        hint:'Double on the open file.',
        explain:'25.Rad1 brings the second rook to the d-file. Black cannot challenge both rooks, and soon one of them lands on the seventh rank. Trading on a8 or e8 releases the pressure.' },
      { ply:50, kind:'best-move', prompt:'Black’s bishop has returned to g7. What is White’s strongest rook move?', answer:'R8d7', accept:[], choices:['R8d4','R8d7','Rxa8','Bxg7'],
        hint:'The seventh rank is the best place for a rook.',
        explain:'26.R8d7 lands on the seventh rank, attacking c7 and f7 and tying Black’s pieces to their defence. Trades on a8 or g7 let Black off the hook.' },
      { ply:54, kind:'plan', prompt:'White’s pieces dominate. How does Short bring his last rook into the attack?', answer:'R1d4', accept:[], choices:['Rxc7','R1d4','Rxf7+','Qxh7+'],
        hint:'A rook on the fourth rank protects the queen and can swing towards the king.',
        explain:'28.R1d4 lifts the rook to the fourth rank, where it guards the queen and is ready to join the attack. Grabbing c7 or sacrificing on f7 or h7 throws the advantage away.' },
      { ply:60, kind:'plan', prompt:'Black is tied up, but White needs one more attacker for mate on g7. What did Short play?', answer:'Kh2', accept:['Qf4','Rd2'], choices:['Rxc7','Kh2','Qxf7+','Rxf7'],
        hint:'Your king is safe. Use it.',
        explain:'31.Kh2! starts the king walk: Black’s pieces are so busy that White’s king can travel to h6 and support Qg7 mate. Engines rate Qf4 or Rd2 as just as strong, but the king march is the clearest plan. Captures on c7 or f7 throw the advantage away.' },
      { ply:64, kind:'best-move', prompt:'The white king is on g3. What is the next step?', answer:'Kf4', accept:[], choices:['c3','Kf4','Qxf7+','Ng5'],
        hint:'Keep marching towards h6.',
        explain:'33.Kf4! continues the march to g5 and h6, after which Qg7 is mate. Black has no useful checks, because his pieces are tied to c7, f7 and the back rank.' },
      { ply:66, kind:'best-move', prompt:'One more step. Where does the king go?', answer:'Kg5', accept:[], choices:['Re7','Kg5','Qxf7+','Rxf7'],
        hint:'Head for h6.',
        explain:'34.Kg5, and Timman resigned. The king will reach h6, and Qg7 mate cannot be stopped for long.' },
    ],
    questions:[
      { question:'Why could Short’s king walk up the board safely?', options:['Black’s pieces were tied to defence and could not give checks','The queens had been traded','Black had no pieces left','It was a pawn endgame'], answer:'Black’s pieces were tied to defence and could not give checks',
        explain:'With queens on the board a king walk is usually dangerous, but Black’s queen, rooks and bishop were all busy defending c7, f7 and the back rank.' },
    ],
    source:{ title:'Short vs Timman, Tilburg 1991 (chessgames.com)', url:'https://www.chessgames.com/perl/chessgame?gid=1124533' },
  },
  {
    id:'deep-blue-kasparov-1997-g6', title:'Deep Blue Wins the Match', white:'Deep Blue', black:'Garry Kasparov',
    event:'IBM rematch, New York (game 6)', year:1997, result:'1-0', opening:'Caro-Kann Defence', era:'Engine age',
    theme:'A knight sacrifice on e6 keeps the enemy king in the centre for good.',
    intro:'The sixth and final game of the 1997 rematch decided the first match a reigning world champion lost to a computer under tournament conditions. Kasparov played 7...h6, an inaccuracy in a known line, and Deep Blue answered with the standard knight sacrifice on e6. Black’s king never found shelter, and Kasparov resigned after only 19 moves.',
    ending:'After 19.c4 Kasparov resigned: his king is stuck in the open and his pieces cannot hold the position together.',
    moves:['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Nd7','Ng5','Ngf6','Bd3','e6','N1f3','h6','Nxe6','Qe7','O-O','fxe6','Bg6+','Kd8','Bf4','b5','a4','Bb7','Re1','Nd5','Bg3','Kc8','axb5','cxb5','Qd3','Bc6','Bf5','exf5','Rxe7','Bxe7','c4'],
    moments:[
      { ply:14, kind:'best-move', prompt:'Black has just played 7...h6, attacking the knight on g5. What did Deep Blue play?', answer:'Nxe6', accept:[], choices:['Ne4','Nxe6','Nxf7','Nh3'],
        hint:'Sacrifice the attacked knight on a square next to the black king.',
        explain:'8.Nxe6! gives up the knight for a pawn but rips open the position around the black king before it can castle. Retreating with Ne4 is safe but harmless, and the other sacrifice on f7 does not work.' },
      { ply:16, kind:'plan', prompt:'With 8...Qe7 Black pins the e6-knight against the white king. What is White’s best move?', answer:'O-O', accept:[], choices:['d5','O-O','Kf1','Be3'],
        hint:'Get your king off the e-file and let Black take the knight.',
        explain:'9.O-O! steps out of the pin. After 9...fxe6 10.Bg6+ the black king has to go to d8 and loses the right to castle, which is worth more than the piece. Propping up the knight with d5, or unpinning with Kf1, hands the initiative back.' },
      { ply:18, kind:'best-move', prompt:'Black has taken the knight with 9...fxe6. How does White keep the king in the centre?', answer:'Bg6+', accept:[], choices:['c4','Bg6+','Re1','Bxh6'],
        hint:'Give a check from a square next to the king.',
        explain:'10.Bg6+ forces the king to d8 (blocking with ...Qf7 drops the queen), so Black can never castle. Quieter moves let Black consolidate; engines rate them almost two pawns worse.' },
      { ply:20, kind:'plan', prompt:'The black king has been driven to d8. How should White continue?', answer:'Bf4', accept:[], choices:['Bf4','Re1','Bxh6','Ne5'],
        hint:'Develop the last minor piece onto the diagonal that leads to c7 and b8.',
        explain:'11.Bf4 develops with purpose: the bishop controls c7 and b8, so the black king cannot run to the queenside. Engines rate it clearly best.' },
      { ply:26, kind:'best-move', prompt:'The knight on d5 attacks the bishop on f4. Where should the bishop go?', answer:'Bg3', accept:[], choices:['Be5','Bg3','axb5','Bd2'],
        hint:'Stay on the same diagonal.',
        explain:'14.Bg3 keeps the bishop on the h2–b8 diagonal, still watching c7 and b8. Swapping it on e5, retreating to d2 or opening the a-file first lets Black breathe.' },
      { ply:32, kind:'best-move', prompt:'Find the bishop sacrifice that opens the e-file towards Black’s queen.', answer:'Bf5', accept:[], choices:['Be4','Bf5','Be5','Qe2'],
        hint:'If the e6-pawn captures, the rook on e1 sees the queen.',
        explain:'17.Bf5! exf5 18.Rxe7 Bxe7 gives up bishop and rook but wins Black’s queen, and the black king is still exposed. Engines rate it clearly better than any quiet move.' },
      { ply:34, kind:'best-move', prompt:'Kasparov has taken the bishop with 17...exf5. Follow up!', answer:'Rxe7', accept:[], choices:['c4','Rxe7','Qxf5','Re5'],
        hint:'The e-file is open.',
        explain:'18.Rxe7 captures the queen. After 18...Bxe7 White has queen for rook and bishop, and the black king is still in danger.' },
      { ply:36, kind:'best-move', prompt:'Find the pawn break that finishes the game.', answer:'c4', accept:[], choices:['Qxf5','c4','Be5','Ne5'],
        hint:'Attack the d5-knight and open lines towards the king on c8.',
        explain:'19.c4! attacks the d5-knight and opens the c-file towards the black king. Kasparov resigned rather than face the attack.' },
    ],
    questions:[
      { question:'Why was 7...h6 a mistake?', options:['It allowed the knight sacrifice on e6','It lost a pawn by force','It blocked Black’s bishop','It weakened the queenside'], answer:'It allowed the knight sacrifice on e6',
        explain:'The sacrifice 8.Nxe6 was a known idea in this line: it breaks open the position around the black king before Black can castle.' },
      { question:'Why is this game historically important?', options:['It decided the first match a reigning world champion lost to a computer','It was the first game a computer ever won','It was a World Championship game','Kasparov played it blindfolded'], answer:'It decided the first match a reigning world champion lost to a computer',
        explain:'Deep Blue won the six-game match 3½–2½ with this win. Computers had beaten strong players before, but never a reigning champion in a match at classical time controls.' },
    ],
    source:{ title:'Deep Blue versus Garry Kasparov (Wikipedia)', url:'https://en.wikipedia.org/wiki/Deep_Blue_versus_Garry_Kasparov' },
  },
  {
    id:'kasparov-topalov-1999', title:'Kasparov’s Immortal', white:'Garry Kasparov', black:'Veselin Topalov',
    event:'Hoogovens tournament, Wijk aan Zee', year:1999, result:'1-0', opening:'Pirc Defence', era:'Modern',
    theme:'A rook sacrifice launches a king hunt across the whole board.',
    intro:'With 24.Rxd4!! Kasparov gave up a rook to drag Topalov’s king out of its shelter on a7. The king was chased across the board all the way to d1, deep in White’s half, and Kasparov had to calculate a long series of checks and quiet moves to make the hunt work. It is often called the finest game of the modern era.',
    ending:'After 44.Qa7 Topalov resigned: queen against rook, with White’s pawns ready to advance.',
    moves:['e4','d6','d4','Nf6','Nc3','g6','Be3','Bg7','Qd2','c6','f3','b5','Nge2','Nbd7','Bh6','Bxh6','Qxh6','Bb7','a3','e5','O-O-O','Qe7','Kb1','a6','Nc1','O-O-O','Nb3','exd4','Rxd4','c5','Rd1','Nb6','g3','Kb8','Na5','Ba8','Bh3','d5','Qf4+','Ka7','Rhe1','d4','Nd5','Nbxd5','exd5','Qd6','Rxd4','cxd4','Re7+','Kb6','Qxd4+','Kxa5','b4+','Ka4','Qc3','Qxd5','Ra7','Bb7','Rxb7','Qc4','Qxf6','Kxa3','Qxa6+','Kxb4','c3+','Kxc3','Qa1+','Kd2','Qb2+','Kd1','Bf1','Rd2','Rd7','Rxd7','Bxc4','bxc4','Qxh8','Rd3','Qa8','c3','Qa4+','Ke1','f4','f5','Kc1','Rd2','Qa7'],
    moments:[
      { ply:46, kind:'best-move', prompt:'Topalov has just played 23...Qd6. Kasparov found one of the most famous moves ever played. What was it?', answer:'Rxd4', accept:[], choices:['Nc6+','Rxd4','Qxd6','c4'],
        hint:'Give up a rook to open lines towards the black king.',
        explain:'24.Rxd4!! cxd4 25.Re7+ pulls the king out: after 25...Kb6 26.Qxd4+ Kxa5 27.b4+ it is dragged up the board. Engines confirm it as White’s best move, although Topalov could have defended better by declining the rook with 24...Kb6.' },
      { ply:48, kind:'best-move', prompt:'Topalov has taken the rook with 24...cxd4. Continue the attack.', answer:'Re7+', accept:[], choices:['Qxd4+','Re7+','Nc6+','Qxd6'],
        hint:'Check from the seventh rank.',
        explain:'25.Re7+ drives the king to b6, where it runs into Qxd4+ and b4+. Taking on d4 with the queen first lets Black block with ...Qb6 and the attack fizzles.' },
      { ply:52, kind:'best-move', prompt:'The black king has captured the knight on a5. Keep it moving!', answer:'b4+', accept:[], choices:['Qc3+','b4+','Rxf7','Be6'],
        hint:'A pawn check drives the king even further forward.',
        explain:'27.b4+ forces 27...Ka4, pulling the king deeper into White’s camp, where the queen and rook can keep hunting it. A queen check on c3 lets the king run back to b6.' },
      { ply:54, kind:'continuation', prompt:'The black king is stranded on a4. What did Kasparov play?', answer:'Qc3', accept:['Ra7'], choices:['Rxf7','Qc3','Bf5','Qe3'],
        hint:'A quiet queen move that threatens mate on b3.',
        explain:'28.Qc3 threatens Qb3 mate and keeps the king boxed in. Topalov answered 28...Qxd5, and the hunt went on with 29.Ra7. Deep engine analysis shows that 28.Ra7 straight away was much stronger, winning outright; after 28.Qc3 White’s edge is far smaller, and Topalov later missed chances to defend. Grabbing f7 or other slow moves let Black consolidate.' },
      { ply:60, kind:'best-move', prompt:'Black’s queen has come to c4. Which capture keeps the attack going?', answer:'Qxf6', accept:[], choices:['Qxc4','Qxf6','Rc7','Ra7'],
        hint:'Remove a defender rather than trading queens.',
        explain:'31.Qxf6 wins the knight and keeps queens on the board for the hunt. Trading queens with Qxc4 throws away the attack, and engines rate the rook moves as losing.' },
      { ply:64, kind:'best-move', prompt:'The black king has taken on b4. How does Kasparov keep driving it forward?', answer:'c3+', accept:[], choices:['Bd7','c3+','Qf6','Rd7'],
        hint:'Another pawn check.',
        explain:'33.c3+! Kxc3 34.Qa1+ continues the chase: the king is forced up to d2 and d1, right into White’s back rank. Slower moves give Black time to use his extra material.' },
      { ply:70, kind:'best-move', prompt:'The black king has reached d1. Find the quiet move that sets up the win.', answer:'Bf1', accept:[], choices:['Ra7','Bf1','Qa3','Rc7'],
        hint:'Attack the black queen with your bishop.',
        explain:'36.Bf1! attacks the queen on c4. Topalov hit back with 36...Rd2, attacking White’s queen, and 37.Rd7! answered that. This quiet bishop move is the only way to keep the advantage; everything else loses.' },
      { ply:72, kind:'best-move', prompt:'Black has counter-attacked with 36...Rd2. How does White break the defence?', answer:'Rd7', accept:[], choices:['Bxc4','Rd7','Qxd2+','Be2+'],
        hint:'Pin the d2-rook against the black king.',
        explain:'37.Rd7! pins the d2-rook against the king on d1. After 37...Rxd7 38.Bxc4 bxc4 39.Qxh8 White has won a lot of material and reaches a winning ending.' },
    ],
    questions:[
      { question:'What made Kasparov’s king hunt possible?', options:['Long, precise calculation of checks and quiet moves after the rook sacrifice','Black had no pieces left to defend','The game was played at blitz speed','Black’s king was already in the centre'], answer:'Long, precise calculation of checks and quiet moves after the rook sacrifice',
        explain:'The attack needed accurate moves for more than a dozen turns, including quiet ones like 36.Bf1. Without them Black’s extra material would have decided. Engines show Black missed defences along the way, which is why checking every reply matters.' },
    ],
    source:{ title:'Kasparov’s Immortal (Wikipedia)', url:'https://en.wikipedia.org/wiki/Kasparov%27s_Immortal' },
  },
  {
    id:'polgar-kasparov-2002', title:'Polgár Beats Kasparov', white:'Judit Polgár', black:'Garry Kasparov',
    event:'Russia vs Rest of the World, Moscow (rapid)', year:2002, result:'1-0', opening:'Ruy Lopez, Berlin Defence', era:'Modern',
    theme:'In a queenless middlegame, space and active rooks beat the bishop pair.',
    intro:'Judit Polgár, the strongest female player in history, beat the world number one for the first time in this rapid game. Kasparov chose the solid Berlin endgame, but Polgár gained space on the kingside, planted a knight on f5 and doubled her rooks on the seventh rank. Her win helped the Rest of the World team beat Russia.',
    ending:'Kasparov resigned after 42...Kc8: White’s rooks rule the seventh rank and her extra pawn will decide.',
    moves:['e4','e5','Nf3','Nc6','Bb5','Nf6','O-O','Nxe4','d4','Nd6','Bxc6','dxc6','dxe5','Nf5','Qxd8+','Kxd8','Nc3','h6','Rd1+','Ke8','h3','Be7','Ne2','Nh4','Nxh4','Bxh4','Be3','Bf5','Nd4','Bh7','g4','Be7','Kg2','h5','Nf5','Bf8','Kf3','Bg6','Rd2','hxg4+','hxg4','Rh3+','Kg2','Rh7','Kg3','f6','Bf4','Bxf5','gxf5','fxe5','Re1','Bd6','Bxe5','Kd7','c4','c5','Bxd6','cxd6','Re6','Rah8','Rexd6+','Kc8','R2d5','Rh3+','Kg2','Rh2+','Kf3','R2h3+','Ke4','b6','Rc6+','Kb8','Rd7','Rh2','Ke3','Rf8','Rcc7','Rxf5','Rb7+','Kc8','Rdc7+','Kd8','Rxg7','Kc8'],
    moments:[
      { ply:30, kind:'plan', prompt:'The queens are off and Black has the bishop pair. How does Polgár gain space?', answer:'g4', accept:[], choices:['Rac1','g4','Nxc6','Bxh6'],
        hint:'Advance a kingside pawn to take squares from Black’s bishops.',
        explain:'16.g4 gains space and takes squares away from Black’s bishops; with Kg2 and Nf5 to follow, White builds a kingside clamp. Engines rate it clearly best. Grabbing on c6 or h6 simply loses a piece.' },
      { ply:34, kind:'plan', prompt:'Black has just played 17...h5. Where should White’s knight go?', answer:'Nf5', accept:[], choices:['Kg3','Nf5','f4','Nf3'],
        hint:'Find an outpost that attacks the bishop on e7.',
        explain:'18.Nf5 plants the knight on a strong square, hitting the e7-bishop and pressing on g7 and d6. Black eventually had to give up a bishop for it.' },
      { ply:46, kind:'plan', prompt:'Black’s f-pawn is challenging e5. How does Polgár keep control of the centre?', answer:'Bf4', accept:[], choices:['Nxg7+','Bf4','Bxa7','exf6'],
        hint:'Support e5 with a developing move.',
        explain:'24.Bf4 protects e5 and gets ready to recapture there. After 24...Bxf5 25.gxf5 fxe5 26.Re1 Bd6 27.Bxe5 the bishop lands on e5 and dominates. Exchanging on f6 releases the tension, and Nxg7+ or Bxa7 just lose material.' },
      { ply:50, kind:'best-move', prompt:'Black has won the e5-pawn. How does White win it back on her terms?', answer:'Re1', accept:[], choices:['Bxe5','Re1','Kg4','Rd8+'],
        hint:'Bring the second rook to the e-file.',
        explain:'26.Re1 attacks e5 again and prepares Bxe5 with a dominant bishop. Taking at once with Bxe5 lets Black trade a pair of rooks on the d-file and ease the defence.' },
      { ply:54, kind:'plan', prompt:'White’s bishop on e5 faces Black’s bishop on d6. What is the best way to make progress?', answer:'c4', accept:[], choices:['Bxd6','c4','Rxd6+','f6'],
        hint:'Gain space on the queenside first.',
        explain:'28.c4 takes space and fixes Black’s queenside pawns. After 28...c5 29.Bxd6 cxd6 the d6-pawn is a weak target for White’s rooks, which is exactly what happened. Trading on d6 at once is less effective, and Rxd6+ loses material.' },
      { ply:58, kind:'best-move', prompt:'Black has a weak pawn on d6. How does Polgár attack it?', answer:'Re6', accept:[], choices:['f4','Re6','Rxd6+','Re7+'],
        hint:'Invade with the rook on the open e-file.',
        explain:'30.Re6 attacks d6 a second time and uses the e-file to break into Black’s position. Engines rate it about three pawns better than anything else. Taking on d6 at once gives up a rook for a pawn.' },
      { ply:76, kind:'best-move', prompt:'Polgár’s rooks stand on d7 and c6. How does she finish the job?', answer:'Rcc7', accept:[], choices:['f4','Rcc7','Rxa7','Rxc5'],
        hint:'Two rooks on the seventh rank.',
        explain:'39.Rcc7! doubles the rooks on the seventh rank. They threaten checks and the a7- and g7-pawns, while the black king is stuck on the back rank.' },
      { ply:78, kind:'best-move', prompt:'Kasparov has grabbed the f5-pawn. Now cash in!', answer:'Rb7+', accept:[], choices:['f3','Rb7+','Rxa7','Rd8+'],
        hint:'Start with a check on b7.',
        explain:'40.Rb7+ Kc8 41.Rdc7+ Kd8 42.Rxg7: the rooks collect pawns with checks while the black king stays trapped on the back rank. Kasparov resigned soon afterwards.' },
    ],
    questions:[
      { question:'Why is this game a landmark?', options:['It was Polgár’s first win against Kasparov, then the world number one','It was a World Championship game','Kasparov lost on time in a winning position','It was the first rapid game ever played'], answer:'It was Polgár’s first win against Kasparov, then the world number one',
        explain:'Polgár, the strongest female player in history, had never beaten Kasparov before. Beating the world number one was a milestone for women’s chess.' },
      { question:'What did Polgár use to outplay the bishop pair?', options:['Space, a strong knight and active rooks','A material advantage from the opening','A direct attack on Black’s king','A faster queenside pawn majority'], answer:'Space, a strong knight and active rooks',
        explain:'The Berlin endgame gives Black two bishops, but Polgár’s kingside space, her knight on f5 and later her rooks on the seventh rank were worth more.' },
    ],
    source:{ title:'Raymond Keene, “Mental sport”, The Spectator Australia (2018)', url:'https://www.spectator.com.au/2018/07/mental-sport/' },
  },
  {
    id:'anand-carlsen-2013-g9', title:'Race to Promote', white:'Viswanathan Anand', black:'Magnus Carlsen',
    event:'World Championship, Chennai (game 9)', year:2013, result:'0-1', opening:'Nimzo-Indian Defence, Sämisch Variation', era:'Engine age',
    theme:'Opposite-wing attacks: count the tempi, and check every forcing reply before you strike.',
    intro:'Trailing in the match and needing to win, Anand attacked on the kingside while Carlsen raced a queenside pawn towards promotion. The race went to the wire: Carlsen queened with check, and after Anand’s 28.Nf1 the quiet 28...Qe1 stopped the attack and left White lost. A draw in game 10 then made Carlsen world champion.',
    ending:'After 28...Qe1 Anand resigned: his attack has been stopped and Black is far ahead in material.',
    moves:['d4','Nf6','c4','e6','Nc3','Bb4','f3','d5','a3','Bxc3+','bxc3','c5','cxd5','exd5','e3','c4','Ne2','Nc6','g4','O-O','Bg2','Na5','O-O','Nb3','Ra2','b5','Ng3','a5','g5','Ne8','e4','Nxc1','Qxc1','Ra6','e5','Nc7','f4','b4','axb4','axb4','Rxa6','Nxa6','f5','b3','Qf4','Nc7','f6','g6','Qh4','Ne8','Qh6','b2','Rf4','b1=Q+','Nf1','Qe1'],
    moments:[
      { ply:31, kind:'best-move', prompt:'Carlsen’s knight has been sitting on b3 since move 12, and White has just played 16.e4. What did Carlsen play?', answer:'Nxc1', accept:[], choices:['Nxd4','Nxc1','Nd2','dxe4'],
        hint:'Remove a piece that would help White’s kingside attack.',
        explain:'16...Nxc1 trades the b3-knight for White’s dark-squared bishop, an important attacker for the coming kingside push. Engines rate it as Black’s best; grabbing on d4 or wandering to d2 loses the knight.' },
      { ply:48, kind:'best-move', prompt:'Anand to move. Black has just played 24...g6 to keep lines closed. How does White continue the attack?', answer:'Qh4', accept:[], choices:['Bxd5','Qh4','e6','Qe4'],
        hint:'Bring the queen towards h6 and the dark squares near the black king.',
        explain:'25.Qh4 heads for h6, where queen and f6-pawn would threaten mate on g7. It is White’s only good move; the alternatives lose time while Black’s b-pawn runs.' },
      { ply:49, kind:'defence', prompt:'White threatens Qh6 and mate on g7. How does Carlsen defend?', answer:'Ne8', accept:[], choices:['b2','Ne8','Ne6','Qxf6'],
        hint:'Bring the knight back to guard g7.',
        explain:'25...Ne8 brings the knight back to cover g7 and attack f6. Pushing ...b2 at once is too slow, and grabbing the f6-pawn with the queen loses her to gxf6.' },
      { ply:51, kind:'best-move', prompt:'White’s queen has reached h6. What does Carlsen play?', answer:'b2', accept:[], choices:['Bg4','b2','Qa5','Qxf6'],
        hint:'Push the passed pawn: it comes with a threat of its own.',
        explain:'26...b2! puts the pawn one step from queening, so White must react to it. Engines rate every other move as clearly worse.' },
      { ply:53, kind:'best-move', prompt:'White threatens Rh4 and Qxh7 mate. What now?', answer:'b1=Q+', accept:[], choices:['Qxf6','b1=Q+','b1=R+','Bg4'],
        hint:'Promote, and make sure it comes with check.',
        explain:'27...b1=Q+ promotes with check, so White has no time for his own threat. Promoting to a rook also gives check but is far too weak, and every other move loses.' },
      { ply:55, kind:'defence', prompt:'Anand has blocked the check with 28.Nf1. Find the move that stops White’s attack.', answer:'Qe1', accept:[], choices:['Bg4','Qe1','Qxf1+','Qxf6'],
        hint:'Put a queen on the diagonal that guards h4.',
        explain:'28...Qe1! pins the f1-knight and watches h4, so Rh4 can be met by ...Qxh4. White’s attack is over, and Anand resigned. Blocking with 28.Bf1 instead of Nf1 would have kept the game balanced.' },
    ],
    questions:[
      { question:'Which move would have kept Anand in the game at move 28?', options:['28.Bf1','28.Nf1','28.Kf2','28.Rf1'], answer:'28.Bf1',
        explain:'Engines show that blocking with the bishop holds the balance. After 28.Nf1 the reply 28...Qe1 covers h4 and the attack collapses.' },
      { question:'In a race of attacks on opposite wings, what usually decides?', options:['Speed, and forcing moves such as checks that gain time','Keeping all pawns on their starting squares','Trading queens early','Castling on the same side as the opponent'], answer:'Speed, and forcing moves such as checks that gain time',
        explain:'Anand attacked on the kingside and Carlsen raced his b-pawn. Carlsen’s promotion came with check, and that tempo decided the game.' },
    ],
    source:{ title:'World Chess Championship 2013, game 9 (Wikipedia)', url:'https://en.wikipedia.org/wiki/World_Chess_Championship_2013' },
  },
];

export const FAMOUS_IDEAS = [
  { id:'guess-every-move', title:'Guess every move',
    description:'Play through a whole game from the winner’s side and guess each move before it is revealed. A running score gives full points for the master’s move, partial points for moves the engine rates as nearly as good, and shows how many moves in a row you matched.' },
  { id:'take-over', title:'Take over from the critical moment',
    description:'At any lesson moment, switch to playing the position out against Stockfish. Can you win from the master’s side, or save the game for the side that lost? A short engine verdict at the end shows how well you converted.' },
  { id:'three-way-compare', title:'You vs the master vs the engine',
    description:'After each answer, show three arrows on the board: your move, the master’s move and Stockfish’s choice, with an evaluation for each. Moments like Anderssen’s 18.Bd6 or Dufresne’s 19...Qxf3 show that famous moves are not always the best ones.' },
  { id:'find-the-turning-point', title:'Find the turning point',
    description:'Hide the evaluation graph and ask the learner which move lost the game, for example 7...h6 in Deep Blue–Kasparov or 28.Nf1 in Anand–Carlsen. Reveal the engine graph afterwards to show the swing.' },
  { id:'era-course-path', title:'A course through chess history',
    description:'Unlock the lessons era by era, Romantic to Engine age, with stars from each lesson adding up to an era badge. A short recap card per era explains how chess thinking changed, from gambits and sacrifices to engine-checked preparation.' },
];

/** Strip check/mate marks and annotation glyphs so 'Qxf7+!!' and 'Qxf7' compare equal. */
export function normaliseSan(san){
  return String(san??'')
    .trim()
    .replace(/\s*e\.p\.$/i,'')
    .replace(/[+#!?]+/g,'')
    .replace(/^0-0-0$/,'O-O-O')
    .replace(/^0-0$/,'O-O')
    .replace(/^([a-h](?:x[a-h])?[18])([QRBN])$/,'$1=$2')
    .trim();
}

/** Look up a lesson by id; null when unknown. */
export function famousLessonById(id){
  return FAMOUS_LESSONS.find(lesson=>lesson.id===id)||null;
}

/** 'w' or 'b': the side the learner plays at this moment (also the side to move on the board). */
export function momentSide(moment){
  return Number(moment?.ply)%2===0?'w':'b';
}

/**
 * FEN of the position before moves[moment.ply], i.e. the position the learner has to solve.
 * `Chess` is the chess.js constructor, passed in so this module has no imports.
 */
export function momentPosition(Chess,lesson,moment){
  const ply=Number(moment?.ply);
  if(!Number.isInteger(ply)||ply<0||ply>=lesson.moves.length)throw new RangeError(`moment ply ${moment?.ply} is outside ${lesson.id}`);
  const game=new Chess();
  for(let index=0;index<ply;index++)game.move(lesson.moves[index]);
  return game.fen();
}

/**
 * Compare the learner's move with the master's.
 *   correct  – the move earns credit (the master's move or an engine-approved alternative)
 *   accepted – it was one of the alternatives in `accept`, not the move actually played
 *   best     – the master's move (SAN) to reveal afterwards
 */
export function checkAnswer(lesson,moment,san){
  const played=normaliseSan(san);
  const exact=played!==''&&played===normaliseSan(moment.answer);
  const accepted=!exact&&played!==''&&(moment.accept||[]).some(move=>normaliseSan(move)===played);
  return {correct:exact||accepted,accepted,best:moment.answer};
}

/**
 * Score a finished lesson from [{correct, hinted}]. Each moment is worth 2 points: 2 for a
 * correct answer without the hint, 1 with it, 0 when missed. Stars: 3 at 90 %+, 2 at 60 %+,
 * 1 at 30 %+, otherwise 0.
 */
export function lessonScore(results=[]){
  const list=Array.isArray(results)?results:[];
  const max=list.length*2;
  const score=list.reduce((sum,result)=>sum+(result?.correct?(result.hinted?1:2):0),0);
  const ratio=max?score/max:0;
  const stars=ratio>=0.9?3:ratio>=0.6?2:ratio>=0.3?1:0;
  return {score,max,stars};
}
