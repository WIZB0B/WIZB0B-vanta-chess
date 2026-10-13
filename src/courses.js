// The Learn library: interactive courses built from classic, public-domain chess teaching and the
// FIDE Laws of Chess, written in VCH's own words (nothing is copied from the sources).
//
// Course → lessons → steps. A step is one of:
//  { type:'read', text, fen?, arrows?:[['e2','e4']], marks?:['d5'] }   explanation, with an optional diagram
//  { type:'move', fen, prompt, solution:['uci', 'reply', 'uci', ...], accept?:{ index:['uci'] }, hint, explain }
//      a puzzle: the side to move in `fen` is the learner. Even indexes of `solution` are the learner's
//      moves, odd indexes the opponent's replies, played automatically. `accept` lists other moves that
//      are just as good at that index (only ever at the learner's last move, so the line stays legal).
//  { type:'quiz', question, options:[...], answer, explain }            `answer` is an index into `options`
// Moves are UCI (e2e4, e7e8q; castling is the king's move, e1g1). Every FEN loads in chess.js, every
// solution is legal in order (test/courses.test.js), and every learner move was checked with Stockfish 19
// to be the best move, a mate as fast as the best, or clearly winning when the best move is.

export const COURSE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const SOURCES = {
  fide: { title: 'FIDE Laws of Chess (in force from 1 January 2023)', author: 'FIDE', year: 2023, url: 'https://handbook.fide.com/chapter/e012023', note: 'The official rules: how the pieces move, check and checkmate, castling, en passant and promotion.' },
  fideDraws: { title: 'FIDE Laws of Chess, Article 9: The drawn game', author: 'FIDE Rules Commission', year: 2023, url: 'https://rcc.fide.com/article9/', note: 'Repetition, the 50-move and 75-move rules, and dead positions, as they apply over the board.' },
  fide960: { title: 'FIDE Laws of Chess, Guidelines II: Chess960 rules', author: 'FIDE Rules Commission', year: 2023, url: 'https://rcc.fide.com/guidelinesii/', note: 'How Chess960 start positions are built and how castling works from them.' },
  capablanca: { title: 'Chess Fundamentals', author: 'José Raúl Capablanca', year: 1921, url: 'https://www.gutenberg.org/ebooks/33870', note: 'Public domain (Project Gutenberg #33870). Basic mates, king and pawn endings and the opposition, and general advice on openings and the middlegame.' },
  laskerStrategy: { title: 'Chess Strategy', author: 'Edward Lasker', year: 1915, url: 'https://www.gutenberg.org/ebooks/5614', note: 'Public domain (Project Gutenberg #5614, the 1915 English edition). Development, the centre, combinations, pawn structure and endgames.' },
  laskerMastership: { title: 'Chess and Checkers: The Way to Mastership', author: 'Edward Lasker', year: 1918, url: 'https://www.gutenberg.org/ebooks/4913', note: 'Public domain (Project Gutenberg #4913). The moves and rules explained for beginners, with first principles of play.' },
  opera: { title: 'Opera Game', author: 'Wikipedia contributors', year: 2026, url: 'https://en.wikipedia.org/wiki/Opera_Game', note: 'Background to Morphy vs the Duke of Brunswick and Count Isouard, Paris 1858. The moves are a matter of record.' },
  matePatterns: { title: 'Checkmate pattern', author: 'Wikipedia contributors', year: 2026, url: 'https://en.wikipedia.org/wiki/Checkmate_pattern', note: 'Names and history of the classic mating patterns (Arabian, Anastasia’s, smothered and others).' },
  boden: { title: 'Boden’s Mate', author: 'Wikipedia contributors', year: 2026, url: 'https://en.wikipedia.org/wiki/Boden\'s_Mate', note: 'The pattern and the game Schulder vs Boden, London 1853.' },
  legal: { title: 'Légal Trap', author: 'Wikipedia contributors', year: 2026, url: 'https://en.wikipedia.org/wiki/Legal_Trap', note: 'The trap attributed to Légal (Paris, 1750) and its usual move order.' },
  lucena: { title: 'Lucena position', author: 'Wikipedia contributors', year: 2026, url: 'https://en.wikipedia.org/wiki/Lucena_position', note: 'The winning method in rook and pawn against rook, and the history of its name.' },
  philidor: { title: 'Philidor position', author: 'Wikipedia contributors', year: 2026, url: 'https://en.wikipedia.org/wiki/Philidor_position', note: 'The drawing method in rook and pawn against rook, published by Philidor in 1777.' },
  crazyhouse: { title: 'Crazyhouse', author: 'Wikipedia contributors', year: 2026, url: 'https://en.wikipedia.org/wiki/Crazyhouse', note: 'General background on the drop variant. The exact rules here are VCH’s own (supabase/functions/chess/crazyhouse.js).' },
  darkChess: { title: 'Dark chess', author: 'Wikipedia contributors', year: 2026, url: 'https://en.wikipedia.org/wiki/Dark_chess', note: 'General background on fog-of-war chess. The exact vision rules here are VCH’s own (src/vanta-dark.js).' },
};

export const COURSES = [
  // ---------------------------------------------------------------------------------------------
  {
    id: 'rules-and-first-steps', title: 'Rules and first steps', level: 'Beginner', minutes: 30,
    summary: 'How every piece moves, what check and checkmate mean, the three special moves, and every way a game can be drawn, including exactly how VCH applies each rule.',
    sources: [SOURCES.fide, SOURCES.fideDraws, SOURCES.laskerMastership],
    lessons: [
      {
        id: 'rules-and-first-steps/board-and-pieces', title: 'The board and the pieces',
        goal: 'Set up the board the right way round and move each piece the way the rules allow.',
        steps: [
          { type: 'read', fen: START, marks: ['a1', 'h1'], text: 'The board has 64 squares: eight files named a to h and eight ranks numbered 1 to 8. Turn it so each player has a light square in the right-hand corner, which makes a1 a dark square. White starts on ranks 1 and 2, Black on ranks 7 and 8, and each queen begins on a square of her own colour.' },
          { type: 'quiz', question: 'Sitting behind the white pieces, which square is in your right-hand corner?', options: ['a1, a dark square', 'h1, a light square', 'h8, a light square'], answer: 1, explain: 'Remember "light on the right": h1 is light and a1, in the other corner, is dark. If the square on your right is dark, the board is turned the wrong way.' },
          { type: 'read', fen: '4k3/8/8/8/3N4/8/8/4K3 w - - 0 1', marks: ['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5'], text: 'Rooks slide any distance along ranks and files, bishops along diagonals, and the queen can do either. The king steps one square in any direction. The knight jumps in an L, two squares one way and one to the side, and it is the only piece that may pass over others. Pawns walk straight ahead, one square at a time or two on their first move, but capture one square diagonally forward.' },
          { type: 'move', fen: '7k/8/5r2/1p6/4N3/1P6/8/K7 w - - 0 1', prompt: 'White to play: your knight can capture the black rook. Find the jump.', solution: ['e4f6'], hint: 'From e4, count two squares in one direction and then one to the side.', explain: 'Nxf6 wins a whole rook. The rook stood on one of the eight squares the knight reaches with its L-shaped jump.' },
          { type: 'move', fen: '7k/7p/7q/8/8/8/PP6/K1B5 w - - 0 1', prompt: 'White to play: the black queen stands on your bishop’s diagonal. Take her.', solution: ['c1h6'], hint: 'A bishop travels along a diagonal as far as the way is clear.', explain: 'Bxh6 removes the queen. The bishop went all the way from c1 to h6 because every square on the way was empty. Any other move would have left the queen free to attack your bishop and your king.' },
          { type: 'move', fen: 'k7/8/8/3q4/4P3/8/7P/K7 w - - 0 1', prompt: 'White to play: one of your pawns can win the queen.', solution: ['e4d5'], hint: 'Pawns move straight ahead, but they do not capture that way.', explain: 'exd5 wins the queen. The pawn could not take anything in front of it, but it captures one square diagonally forward, and the queen stood exactly there.' },
          { type: 'quiz', question: 'Which piece can jump over other pieces?', options: ['The queen', 'The knight', 'The rook'], answer: 1, explain: 'Only the knight jumps. Every other piece is stopped by the first piece in its path, whichever colour it is.' },
        ],
      },
      {
        id: 'rules-and-first-steps/check-and-mate', title: 'Check, checkmate and stalemate',
        goal: 'Get out of check, give checkmate, and avoid stalemating your opponent by accident.',
        steps: [
          { type: 'read', text: 'A king under attack is in check, and the check must be answered at once in one of three ways: move the king to a safe square, put a piece in the way, or capture the attacker. You may never make a move that leaves your own king in check. When none of the three answers exists, the king is checkmated and the game is over.' },
          { type: 'quiz', question: 'A knight is checking your king. Which way out of check can never work?', options: ['Moving the king', 'Blocking the check', 'Capturing the knight'], answer: 1, explain: 'A knight jumps, so there is no square between it and your king to block. You have to move the king or capture the knight.' },
          { type: 'move', fen: '6k1/pp3ppp/8/8/2B5/8/PP1Q1PPP/4r1K1 w - - 0 1', prompt: 'White to play: the rook on e1 is checking you. Two moves answer the check; choose the better one.', solution: ['d2e1'], hint: 'Blocking saves the king. Capturing saves the king and wins something too.', explain: 'Qxe1 captures the checking rook and leaves White a queen ahead. Blocking with Bf1 would also stop the check, but the rook would stay on the board.' },
          { type: 'move', fen: '4k3/8/4K3/8/8/8/8/7Q w - - 0 1', prompt: 'White to play: checkmate in one move.', solution: ['h1h8'], accept: { 0: ['h1a8'] }, hint: 'Your king already covers d7, e7 and f7. Check along the back rank.', explain: 'Qh8 checks along the eighth rank and also covers d8 and f8, while your king takes away the seventh-rank squares. Black has no move: checkmate. Qa8 mates in the same way.' },
          { type: 'read', fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1', marks: ['g8', 'g7', 'h7'], text: 'Stalemate is the trap on the other side. If the player to move has no legal move but is not in check, the game ends at once as a draw, however much material the other side has. While you are winning, leave the losing king a square to move to until you are ready to mate.' },
          { type: 'quiz', question: 'In the position above it is Black’s move. What is the result?', options: ['White wins by checkmate', 'A draw by stalemate', 'Black must pass the move'], answer: 1, explain: 'The black king is not in check, but g8, g7 and h7 are all covered and Black has nothing else to move. That is stalemate, a draw. Passing is never allowed in chess.' },
          { type: 'move', fen: '7k/5K2/8/8/8/8/8/6Q1 w - - 0 1', prompt: 'White to play: mate in one, and do not stalemate. (Qg6 would leave Black without a move: a draw.)', solution: ['g1g7'], accept: { 0: ['g1g8', 'g1h1', 'g1h2'] }, hint: 'Give a check that leaves the king nowhere to go.', explain: 'Qg7 is mate: the queen is protected by your king and every square around h8 is covered. Qg8, Qh1 and Qh2 mate as well. Qg6, by contrast, takes away every square without giving check, which is stalemate.' },
        ],
      },
      {
        id: 'rules-and-first-steps/special-moves', title: 'Castling, en passant and promotion',
        goal: 'Use the three special moves and know exactly when each is allowed.',
        steps: [
          { type: 'read', fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1', arrows: [['e1', 'g1'], ['h1', 'f1']], text: 'Castling moves the king and a rook in one turn. The king goes two squares toward the rook, and the rook jumps to the square the king crossed. It is allowed only if neither piece has moved yet, every square between them is empty, the king is not in check, and the king does not pass through or land on a square the opponent attacks.' },
          { type: 'quiz', question: 'Your king is not in check, but a black bishop attacks f1. May you castle kingside?', options: ['Yes, only the square the king lands on matters', 'No, the king may not pass over an attacked square', 'Yes, as long as the rook has not moved'], answer: 1, explain: 'The king may not start in check, cross an attacked square or finish on one. Castling kingside, it crosses f1, so it has to wait. The rook, on the other hand, may be attacked or cross attacked squares.' },
          { type: 'move', fen: '3q4/8/8/3k4/8/8/PP6/R3K3 w Q - 0 1', prompt: 'White to play: castle queenside. The rook lands on d1 with check, and the queen behind the king falls.', solution: ['e1c1'], accept: { 0: ['a1d1'] }, hint: 'Move the king two squares toward the rook on a1.', explain: 'After O-O-O the rook arrives on d1 and checks along the d-file. Once the black king steps aside, Rxd8 wins the queen. Here Rd1+ does the same job, so it is accepted too.' },
          { type: 'read', fen: '7k/8/8/3pP3/8/8/8/1K6 w - d6 0 2', arrows: [['e5', 'd6']], marks: ['d5'], text: 'En passant ("in passing") is a special pawn capture. When a pawn moves two squares from its starting square and lands right beside an enemy pawn, that enemy pawn may capture it as if it had moved only one square. It must be done on the very next move or the chance is gone.' },
          { type: 'move', fen: '7k/8/8/3pP3/8/8/8/1K6 w - d6 0 2', prompt: 'White to play: Black has just played d7-d5. Capture en passant.', solution: ['e5d6'], hint: 'Your e5 pawn captures diagonally onto the square the black pawn skipped over.', explain: 'exd6 removes the d-pawn and leaves a passed pawn that the king on h8 can no longer catch. Pushing e6 instead lets the king get back in time, and the black d-pawn would still be alive.' },
          { type: 'move', fen: '7k/P7/6K1/8/8/8/8/8 w - - 0 1', prompt: 'White to play: promote the pawn with checkmate.', solution: ['a7a8q'], accept: { 0: ['a7a8r'] }, hint: 'A pawn that reaches the last rank becomes a new piece of your choice.', explain: 'a8=Q checks along the eighth rank and your king on g6 covers g7 and h7, so it is mate. A rook mates here too. A pawn may become a queen, rook, bishop or knight, whatever is already on the board.' },
          { type: 'quiz', question: 'Why would a player ever promote to a knight instead of a queen?', options: ['Knights are worth more than queens in endings', 'A knight can give a check, or avoid a stalemate, that a queen cannot', 'The rules require it on the a- and h-files'], answer: 1, explain: 'A queen is nearly always best, but a knight moves differently. Now and then only a knight gives the check you need, or a new queen would leave the opponent without a legal move: stalemate.' },
        ],
      },
      {
        id: 'rules-and-first-steps/draws', title: 'How games are drawn',
        goal: 'Know every way a game can be drawn and how VCH applies each rule.',
        steps: [
          { type: 'read', text: 'Besides stalemate and agreement, three rules draw a game: the same position occurring three times, neither side having enough material to checkmate, and the fifty-move rule. The fifty-move rule counts moves by both players: when each side has made fifty moves in a row (a hundred moves on the board) without any capture and without any pawn move, the game can be drawn. Under the FIDE Laws a player must claim it, and after seventy-five such moves by each side the game ends without a claim. A checkmate on the final move still wins.' },
          { type: 'quiz', question: 'How many moves without a capture or a pawn move does the fifty-move rule need?', options: ['Fifty in total, twenty-five by each player', 'Fifty by each player, a hundred moves on the board', 'Fifty by the player who is ahead'], answer: 1, explain: 'Both players make fifty moves each, so the count covers a hundred moves on the board. Any capture or pawn move starts the count again from zero.' },
          { type: 'read', text: 'In VCH you never have to claim. The game is drawn automatically on the fiftieth move by each side, and the same goes for threefold repetition and for positions in which neither side can mate. That is true online and against the computer, including Vanta Dark and Blackout Blitz: there the fifty-move countdown is hidden, because it would give away moves you cannot see, but it keeps running. In other games the status line shows the countdown once thirty of the fifty moves have passed. Crazyhouse is the exception: with captured pieces always coming back, it uses neither repetition nor the fifty-move rule.' },
          { type: 'quiz', question: 'When is a game drawn by repetition?', options: ['When the same move is played three times in a row', 'When the same position appears three times, with the same player to move and the same castling and en passant rights', 'After three checks in a row'], answer: 1, explain: 'It is the position that counts, not the moves, and the three occurrences need not be in a row. Over the board a player claims it (a fifth occurrence ends the game anyway); VCH draws the game as soon as the third one appears.' },
          { type: 'quiz', question: 'Which of these can never end in checkmate, so VCH declares a draw straight away?', options: ['King and rook against king', 'King and knight against king', 'King and two pawns against king'], answer: 1, explain: 'A lone knight, like a lone bishop, cannot mate a bare king even with the opponent’s help, so the game is drawn. A rook mates without trouble, and pawns can still promote.' },
          { type: 'move', fen: 'k7/p1Q5/P7/8/8/7P/4q1P1/7K b - - 0 1', prompt: 'Black to play: White threatens Qb7 mate and you cannot stop it. Save the game anyway.', solution: ['e2g2'], accept: { 0: ['e2f1', 'e2e1', 'e2d1'] }, hint: 'Your king has no legal move. What happens if your queen disappears?', explain: 'Qxg2+ throws the queen away on purpose. After Kxg2 the black king has no legal move and is not in check: stalemate, a draw. The checks from f1, e1 and d1 also hold, because the queen can keep checking until White takes her.' },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------------------------
  {
    id: 'opening-principles', title: 'Opening principles', level: 'Beginner', minutes: 30,
    summary: 'Fight for the centre, develop with purpose, keep the queen back and the king safe, and learn from Morphy’s Opera Game and a classic trap.',
    sources: [SOURCES.capablanca, SOURCES.laskerStrategy, SOURCES.laskerMastership, SOURCES.opera],
    lessons: [
      {
        id: 'opening-principles/centre', title: 'Fight for the centre',
        goal: 'Explain why the four central squares matter and claim them with your first moves.',
        steps: [
          { type: 'read', fen: START, marks: ['d4', 'e4', 'd5', 'e5'], text: 'The squares d4, e4, d5 and e5 are the centre. A piece there reaches more of the board than the same piece on the edge, and central pawns take good squares away from enemy pieces. That is why nearly every sound opening begins by putting a pawn in the middle or aiming pieces at it.' },
          { type: 'move', fen: START, prompt: 'White to play: put a pawn in the centre with your first move.', solution: ['e2e4'], accept: { 0: ['d2d4'] }, hint: 'Choose the king’s pawn or the queen’s pawn and use the two-square step.', explain: '1.e4 occupies a central square and opens lines for the queen and the king’s bishop. 1.d4 does the same on the other wing, and it is accepted too.' },
          { type: 'move', fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1', prompt: 'Black to play: claim your own share of the centre with a pawn, mirroring White.', solution: ['e7e5'], hint: 'Answer like for like.', explain: '1...e5 stops White from simply taking the whole centre with d4 and frees the black bishop and queen. Other good replies exist, such as 1...c5 or 1...e6, but they follow different plans.' },
          { type: 'quiz', question: 'Why is a knight on e4 usually better placed than a knight on a4?', options: ['It is closer to the enemy king', 'It controls up to eight squares instead of four', 'Knights on the edge cannot capture'], answer: 1, explain: 'From the centre a knight reaches eight squares; from the rim, at most four. Hence the old saying "a knight on the rim is dim".' },
        ],
      },
      {
        id: 'opening-principles/develop', title: 'Develop your pieces',
        goal: 'Bring knights and bishops out quickly, toward the centre and with a purpose.',
        steps: [
          { type: 'read', text: 'Development means moving pieces off their starting squares to places where they work. A useful order is knights first, then bishops, then castling, and only later the queen and rooks. Every opening move should develop a piece, fight for the centre, or both, and it is even better when it creates a threat as well.' },
          { type: 'move', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2', prompt: 'White to play: develop a piece and attack the e5 pawn at the same time.', solution: ['g1f3'], hint: 'Which knight move hits e5?', explain: '2.Nf3 brings a knight toward the centre and threatens Nxe5, so Black has to spend the next move on defence.' },
          { type: 'move', fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', prompt: 'Black to play: defend e5 with a developing move.', solution: ['b8c6'], hint: 'Defend with a piece that needed to come out anyway.', explain: '2...Nc6 protects the pawn and develops a knight toward the centre. Defending with 2...d6 also works, but it shuts in the bishop on f8.' },
          { type: 'quiz', question: 'Which pieces does the classical advice say to develop first?', options: ['The queen and the rooks', 'The knights', 'The rook’s pawns'], answer: 1, explain: 'Knights usually come out first: their best squares (f3, c3, f6, c6) are ready from the start and they need no pawn moves to get out. Bishops often wait a move to see which diagonal suits them best.' },
        ],
      },
      {
        id: 'opening-principles/queen-early', title: 'Keep the queen back',
        goal: 'Defend against an early queen raid and punish it by gaining time.',
        steps: [
          { type: 'read', text: 'The queen is your strongest piece, which is exactly why bringing her out early is risky: every time a smaller piece attacks her she has to move again, and each of those moves is a free developing move for the opponent. The exception is a queen move that makes a threat the opponent cannot meet comfortably.' },
          { type: 'move', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', prompt: 'White to play: Black’s last move attacked your queen but forgot about f7. Mate in one.', solution: ['h5f7'], hint: 'Queen and bishop both aim at the same square next to the black king.', explain: 'Qxf7 is checkmate, the "Scholar’s Mate". The queen is protected by the bishop on c4, so the king can neither take her nor escape.' },
          { type: 'move', fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3', prompt: 'Black to play: White threatens Qxf7 mate. Stop it with a move that also attacks the queen.', solution: ['g7g6'], hint: 'Can a pawn block the queen’s path to f7 and attack her at the same time?', explain: '3...g6 closes the h5-f7 diagonal and attacks the queen, which has to move again. 3...Qe7 or 3...Qf6 would also guard f7, but without gaining any time. A careless move such as 3...Nf6 would allow Qxf7 mate.' },
          { type: 'move', fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 1 4', prompt: 'Black to play: from f3 the queen eyes f7 again. Block her line and develop a piece in one move.', solution: ['g8f6'], hint: 'A knight can stand between the queen and f7.', explain: '4...Nf6 develops and blocks the f-file. White’s queen has now moved twice to achieve nothing, while Black is close to castling.' },
          { type: 'quiz', question: 'What is the main danger of bringing the queen out on move two?', options: ['She can be trapped at once', 'The opponent develops with gain of time by attacking her', 'It is against the rules before castling'], answer: 1, explain: 'Each attack on the queen forces her to move again, so the opponent’s development comes for free. Bring her out early only for a concrete reason.' },
        ],
      },
      {
        id: 'opening-principles/king-safety', title: 'Castle early',
        goal: 'Get your king out of the centre before the position opens up.',
        steps: [
          { type: 'read', text: 'The king is safest behind a wall of unmoved pawns, away from the central files that open up in the middlegame. Castling does that in one move and brings a rook toward the centre as well. Early moves of the f-pawn, or of the pawns in front of a castled king, leave holes and open lines that an opponent can use.' },
          { type: 'move', fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2', prompt: 'Black to play: White has pushed the f- and g-pawns. Mate in one.', solution: ['d8h4'], hint: 'Look at the diagonal from your queen to the white king.', explain: 'Qh4 is mate after only two moves by White, the shortest game possible. With f3 and g4 White opened the e1-h4 diagonal, nothing can block on g3 or f2, and the king has no square.' },
          { type: 'move', fen: 'r1bqk2r/ppp2ppp/2np1n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R w KQkq - 0 6', prompt: 'White to play: your kingside knight and bishop are developed. Finish the job and tuck the king away.', solution: ['e1g1'], hint: 'The king moves two squares toward the rook on h1.', explain: '6.O-O puts the king behind the f-, g- and h-pawns and brings the h1 rook toward the centre. With the kingside pieces already out, there is no reason to wait.' },
          { type: 'quiz', question: 'After castling kingside, which habit most often creates lasting weaknesses?', options: ['Developing the queen’s knight', 'Pushing the g- and h-pawns forward without a reason', 'Bringing a rook to the centre'], answer: 1, explain: 'Pawns cannot move back. Advancing the pawns in front of your king opens lines and leaves squares that no pawn will ever guard again, so do it only for a concrete purpose.' },
        ],
      },
      {
        id: 'opening-principles/opera-game', title: 'Morphy’s lesson: time and development',
        goal: 'See how a lead in development turns into a winning attack.',
        steps: [
          { type: 'read', fen: 'rn1qkb1r/ppp2ppp/5n2/4p3/2B1P3/5Q2/PPP2PPP/RNB1K2R w KQkq - 2 7', text: 'In 1858, in a box at the Paris opera, Paul Morphy played a casual game against two allies, the Duke of Brunswick and Count Isouard. They spent their early moves on a pawn and on trading a bishop for a knight, while Morphy kept developing with threats. It is still one of the clearest lessons on why time matters in the opening.' },
          { type: 'move', fen: 'rn1qkb1r/ppp2ppp/5n2/4p3/2B1P3/5Q2/PPP2PPP/RNB1K2R w KQkq - 2 7', prompt: 'White to play: one queen move attacks two unprotected pawns at once.', solution: ['f3b3'], hint: 'Find a square from which the queen hits both f7 and b7.', explain: '7.Qb3 attacks b7 and joins the bishop against f7. Black cannot meet both threats comfortably; the allies chose 7...Qe7, which guards f7 but blocks their own bishop on f8.' },
          { type: 'quiz', question: 'Why is 7...Qe7 an uncomfortable answer for Black?', options: ['It loses the queen at once', 'It blocks the f8 bishop, so Black’s kingside stays undeveloped', 'It allows a back-rank mate'], answer: 1, explain: 'The queen on e7 defends, but the f8 bishop can no longer come out and Black cannot castle soon. Morphy used the extra time to bring everything into play.' },
          { type: 'read', text: 'Morphy went on giving material to keep the initiative: a knight on b5, then the exchange on d7, and finally his queen, mating on d8 at move 17 while most of Black’s pieces were still at home. You can replay the whole game under Famous Games, and its final combination is one of the exercises in the Calculation course.' },
        ],
      },
      {
        id: 'opening-principles/traps', title: 'Traps that punish greed',
        goal: 'Spot opening traps in which grabbing material costs more than it gains.',
        steps: [
          { type: 'read', text: 'Many opening traps follow the same pattern: a player takes a pawn or piece that looks free, and the capture leaves a queen, a bishop or the king short of safe squares. Before you take, ask what your opponent can do next.' },
          { type: 'move', fen: 'r1bqkbnr/2p2ppp/p2p4/1p6/3QP3/1B6/PPP2PPP/RNB1K2R b KQkq - 0 8', prompt: 'Black to play: White’s queen has just taken a pawn on d4. Trap the bishop on b3.', solution: ['c7c5', 'd4c3', 'c5c4'], hint: 'Pawns on a6, b5 and c4 would leave the bishop without a square. Start with a gain of time against the queen.', explain: '8...c5 attacks the queen, and after 9.Qc3 the pawn goes on to c4. The bishop on b3 has no safe square left and will be lost. This pattern is known as the Noah’s Ark trap.' },
          { type: 'quiz', question: 'In that trap, what was White’s real mistake?', options: ['Developing the bishop to a4 and then b3', 'Taking on d4 with the queen, which let Black gain time against her while the bishop ran out of squares', 'Not castling on move one'], answer: 1, explain: 'With the queen on d4, ...c5 came with gain of time, and ...c4 followed before the bishop could get out. The bishop needed an escape route before White went pawn-hunting.' },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------------------------
  {
    id: 'tactics', title: 'Tactics', level: 'Intermediate', minutes: 40,
    summary: 'Forks, pins, skewers, discovered attacks, double check, removing and deflecting defenders, and the weak back rank, each with positions to solve.',
    sources: [SOURCES.laskerStrategy, SOURCES.capablanca, SOURCES.laskerMastership],
    lessons: [
      {
        id: 'tactics/forks', title: 'Forks',
        goal: 'Attack two targets with one move so that only one can be saved.',
        steps: [
          { type: 'read', fen: 'r3k3/1p3ppp/8/3N4/8/8/PP3PPP/6K1 w - - 0 1', arrows: [['d5', 'c7']], marks: ['e8', 'a8'], text: 'A fork is one move that attacks two things at once. The opponent can usually save only one of them, so you win the other. Knights are natural forkers because their attack cannot be blocked, but pawns, queens and even kings can fork too. Loose pieces and the king make the best targets.' },
          { type: 'move', fen: 'r3k3/1p3ppp/8/3N4/8/8/PP3PPP/6K1 w - - 0 1', prompt: 'White to play: fork the king and the rook.', solution: ['d5c7', 'e8d7', 'c7a8'], hint: 'From which square does the knight attack both e8 and a8?', explain: 'Nc7+ checks the king and attacks the rook at the same time. The king has to move, and Nxa8 collects the rook.' },
          { type: 'move', fen: '6k1/pp3ppp/2n1b3/8/2PP4/8/PP3PPP/3R2K1 w - - 0 1', prompt: 'White to play: a pawn can attack two black pieces at once.', solution: ['d4d5'], hint: 'Look for a pawn move that hits both c6 and e6.', explain: 'd5 attacks the knight and the bishop together. Taking with ...Bxd5 does not help, because cxd5 renews the attack on the knight, so Black loses a piece for a pawn.' },
          { type: 'move', fen: 'r7/p1b2ppk/7p/8/8/8/PP2QPPP/6K1 w - - 0 1', prompt: 'White to play: give a check that also attacks the rook on a8.', solution: ['e2e4'], hint: 'One square lies on the diagonal to h7 and on the long diagonal to a8.', explain: 'Qe4+ checks along the diagonal to h7 and attacks a8 along the other. However Black meets the check, Qxa8 follows.' },
          { type: 'quiz', question: 'Why is a knight fork that includes the king especially strong?', options: ['The king is worth the most points', 'A knight check cannot be blocked, so the opponent must spend the move on the king', 'Knights can fork only kings'], answer: 1, explain: 'The opponent has to answer the check first, and the only answers are moving the king or capturing the knight. The second target is then lost.' },
        ],
      },
      {
        id: 'tactics/pins-and-skewers', title: 'Pins and skewers',
        goal: 'Use a line piece to freeze a defender, or to force a valuable piece out of the way.',
        steps: [
          { type: 'read', text: 'A pin attacks a piece that cannot move without exposing something more valuable behind it. When that something is the king, moving is illegal (an absolute pin); otherwise moving is legal but loses material (a relative pin). A skewer is the reverse: the more valuable piece stands in front, it has to move, and you take what was behind it.' },
          { type: 'move', fen: '4k3/pp4pp/3p4/4n3/8/8/PP3PPP/4R1K1 w - - 0 1', prompt: 'White to play: the knight on e5 is pinned to its king. Attack it.', solution: ['f2f4'], hint: 'A pinned piece cannot run away. Bring a pawn up to hit it.', explain: 'f4 attacks the knight, which cannot move because the rook on e1 would then check the king. Even after the king steps off the e-file, fxe5 wins a piece for a pawn.' },
          { type: 'quiz', question: 'A bishop pins a knight to a queen, not to the king. May the knight move?', options: ['No, it is illegal', 'Yes, but the queen behind it can then be captured', 'Only if it gives check'], answer: 1, explain: 'Only a pin against the king makes moving illegal. In a relative pin the knight may move, and occasionally that is worth it, for instance if it gives mate.' },
          { type: 'move', fen: '6q1/p7/4k3/8/8/8/PP6/1K3B2 w - - 0 1', prompt: 'White to play: check the king and win what stands behind it.', solution: ['f1c4'], hint: 'King and queen are on the same diagonal.', explain: 'Bc4+ checks along the a2-g8 diagonal. The king must step aside, and the bishop takes the queen on g8.' },
          { type: 'quiz', question: 'What is the difference between a pin and a skewer?', options: ['A pin uses a knight, a skewer uses a rook', 'In a pin the more valuable piece is behind; in a skewer it is in front', 'There is no difference'], answer: 1, explain: 'Both work along a line. In a pin the front piece is stuck guarding the bigger one behind it; in a skewer the bigger piece in front is forced to move and exposes the one behind.' },
        ],
      },
      {
        id: 'tactics/discovered-attacks', title: 'Discovered attacks and double check',
        goal: 'Move one piece to unleash another, and know that only a king move answers a double check.',
        steps: [
          { type: 'read', text: 'In a discovered attack one piece moves out of a line and uncovers an attack by the piece behind it. Two pieces now threaten at once, the one that moved and the one uncovered. When the uncovered attack is a check, the moving piece is free to do almost anything, even capture a defended piece, because the opponent must answer the check first.' },
          { type: 'move', fen: '1r2k3/p4ppp/8/4B3/8/8/1q3PPP/4R1K1 w - - 0 1', prompt: 'White to play: your bishop stands between your rook and the black king. Move it with profit.', solution: ['e5b2'], hint: 'The bishop can capture something big while the rook gives check.', explain: 'Bxb2+ takes the queen and uncovers check from the rook on e1. Black must deal with the check, so the rook on b8 never gets the chance to recapture: the bishop simply retreats next move.' },
          { type: 'read', text: 'A double check is a discovered check in which the piece that moves gives check as well. Two checks cannot both be blocked, and both checkers cannot be captured in one move, so the king itself must move. That makes double check one of the most forcing moves in chess.' },
          { type: 'move', fen: 'rnb1kb1r/pp3ppp/2p5/4q3/4n3/3Q4/PPPB1PPP/2KR1BNR w kq - 0 9', prompt: 'White to play: mate in three, starting with a queen sacrifice. (Réti vs Tartakower, Vienna 1910)', solution: ['d3d8', 'e8d8', 'd2g5', 'd8c7', 'g5d8'], hint: 'After the king takes on d8, a bishop move checks it twice.', explain: '9.Qd8+! Kxd8 10.Bg5+ is a double check from the bishop and the rook on d1, so the king must move. After 10...Kc7, 11.Bd8 is mate; 10...Ke8 would allow 11.Rd8 mate.' },
          { type: 'quiz', question: 'You are in double check. Which answer can be legal?', options: ['Blocking one of the checks', 'Capturing one of the checking pieces with another piece', 'Moving the king'], answer: 2, explain: 'Blocking or capturing deals with only one of the two attackers. Only a king move (which may itself capture one of the checkers) can answer both.' },
        ],
      },
      {
        id: 'tactics/defenders', title: 'Removing and deflecting defenders',
        goal: 'Win by capturing, or luring away, the piece that holds the position together.',
        steps: [
          { type: 'read', text: 'Look at what each enemy piece is guarding. If one piece defends something important, you can capture it (removing the defender) or force it to go somewhere else (deflection, or a decoy when you lure it onto a bad square). Either way, whatever it protected is now yours.' },
          { type: 'move', fen: '5rk1/ppq2pp1/5n2/6B1/8/3B3Q/PP3PPP/5RK1 w - - 0 1', prompt: 'White to play: the knight on f6 is the only guard of h7. Remove it.', solution: ['g5f6'], hint: 'Your queen on h3 and your bishop on d3 both aim at h7.', explain: 'Bxf6 eliminates the defender. If 1...gxf6, Qh7 is mate, and Black’s other replies only delay the end: White mates within a few moves.' },
          { type: 'move', fen: '7k/ppq2ppp/8/6N1/8/7P/PP3PP1/3R2K1 w - - 0 1', prompt: 'White to play: lure the queen onto d8, then fork king and queen.', solution: ['d1d8', 'c7d8', 'g5f7', 'h8g8', 'f7d8'], hint: 'A check on the back rank that can only be answered by capturing.', explain: 'Rd8+ leaves Black no choice but 1...Qxd8, because nothing can block and the king cannot move. Then Nxf7+ forks the king on h8 and the queen on d8, and Nxd8 wins the queen for the rook, leaving White a piece up.' },
          { type: 'quiz', question: 'A black rook on d8 must defend both the back rank and a bishop on d4. What is that rook called?', options: ['A pinned piece', 'An overloaded defender', 'A battery'], answer: 1, explain: 'A piece with two jobs is overloaded. Attack one of its duties, and when it responds, the other one collapses.' },
        ],
      },
      {
        id: 'tactics/back-rank', title: 'The weak back rank',
        goal: 'Exploit, and avoid, a king trapped behind its own pawns.',
        steps: [
          { type: 'read', text: 'A castled king with its three pawns unmoved is sheltered from most attacks, but it has no escape square. If its back rank is left unguarded, a rook or queen check there is mate. Many games are lost this way, which is why players often make "luft" (air), a pawn move such as h3 that gives the king a square.' },
          { type: 'move', fen: '4r1k1/pb1q1ppp/8/8/8/4R3/PP3PPP/4Q1K1 w - - 0 1', prompt: 'White to play: mate in two. The black rook is the only guard of the back rank.', solution: ['e3e8', 'd7e8', 'e1e8'], hint: 'Your rook and queen are lined up on the e-file.', explain: 'Rxe8+ removes the guard, Black has to recapture with 1...Qxe8, and 2.Qxe8 is mate: the black king is shut in by its own pawns.' },
          { type: 'quiz', question: 'What is the simplest way to rule out a back-rank mate against your own king?', options: ['Keep both rooks on the seventh rank', 'Give the king an escape square, for example with h3 or g3, when there is time', 'Never castle'], answer: 1, explain: 'One quiet pawn move gives the king a square and removes the danger for good. Do it at a calm moment, before the opponent’s heavy pieces arrive.' },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------------------------
  {
    id: 'checkmate-patterns', title: 'Checkmate patterns', level: 'Intermediate', minutes: 35,
    summary: 'Back-rank, Arabian, smothered, Anastasia’s and Boden’s mates, Légal’s trap and the Greek gift: patterns that strong players recognise at a glance.',
    sources: [SOURCES.matePatterns, SOURCES.boden, SOURCES.legal, SOURCES.capablanca, SOURCES.laskerStrategy],
    lessons: [
      {
        id: 'checkmate-patterns/back-rank-and-arabian', title: 'Back-rank and Arabian mates',
        goal: 'Mate a king on the edge with a rook supported by a queen or a knight.',
        steps: [
          { type: 'read', fen: '7k/7R/5N2/8/8/8/8/6K1 b - - 0 1', marks: ['g8', 'g7'], text: 'Two of the most common mates use a rook. In the back-rank mate the king is shut in by its own pawns and a rook or queen checks along the last rank. In the Arabian mate, one of the oldest recorded patterns, a knight and a rook trap a king in the corner: the rook checks from the next square and the knight both protects it and covers the escape square.' },
          { type: 'move', fen: '3r2k1/p4ppp/1q6/3Q4/8/8/P4PPP/3R2K1 w - - 0 1', prompt: 'White to play: mate in two on the back rank.', solution: ['d5d8', 'b6d8', 'd1d8'], hint: 'Your queen and rook are lined up on the d-file.', explain: 'Qxd8+ Qxd8 Rxd8 is mate. The black rook was defended once and attacked twice; after the exchanges nothing is left to cover the eighth rank.' },
          { type: 'move', fen: '7k/R7/5N2/8/8/8/8/6K1 w - - 0 1', prompt: 'White to play: mate in one with rook and knight.', solution: ['a7h7'], hint: 'The knight already guards g8 and h7.', explain: 'Rh7 is the Arabian mate. The rook checks from right next to the king, the knight on f6 protects it, and the rook also covers g7.' },
          { type: 'quiz', question: 'In the Arabian mate, what protects the rook that gives check?', options: ['The king', 'The knight', 'A pawn'], answer: 1, explain: 'The knight guards the rook and the escape square g8 at the same time. That double duty is the whole pattern.' },
        ],
      },
      {
        id: 'checkmate-patterns/smothered', title: 'Smothered mate',
        goal: 'Mate a king that is surrounded by its own pieces using a single knight.',
        steps: [
          { type: 'read', fen: '6rk/5Npp/8/8/8/8/1q3PPP/6K1 b - - 1 4', marks: ['g8', 'g7', 'h7'], text: 'A smothered mate happens when a king is hemmed in by its own pieces and a knight checks it. A knight check cannot be blocked, so it is mate on the spot. The classic route uses a queen sacrifice to force an enemy rook onto the king’s last free square; the sequence is often called Philidor’s Legacy.' },
          { type: 'move', fen: 'r6k/6pp/8/6N1/2Q5/8/1q3PPP/6K1 w - - 0 1', prompt: 'White to play: mate in four with knight checks and a queen sacrifice.', solution: ['g5f7', 'h8g8', 'f7h6', 'g8h8', 'c4g8', 'a8g8', 'h6f7'], hint: 'Begin with a knight check on f7, then use the queen’s diagonal to g8.', explain: 'Nf7+ Kg8, Nh6+ (a double check from knight and queen) Kh8, and Qg8+! forces Rxg8. Now Nf7 is mate: the king is smothered by its own rook and pawns. If Black plays Kf8 instead of Kh8, Qf7 mates at once.' },
          { type: 'quiz', question: 'Why does the queen sacrifice on g8 work?', options: ['It wins the rook', 'It forces the rook onto g8, taking away the king’s last free square', 'It stalemates Black'], answer: 1, explain: 'Before the sacrifice, g8 was the king’s escape. After ...Rxg8 the king is boxed in by its own pieces and the knight mates alone.' },
        ],
      },
      {
        id: 'checkmate-patterns/anastasia-and-boden', title: 'Anastasia’s and Boden’s mates',
        goal: 'Recognise two mating nets: knight and rook on the edge, and two crossing bishops.',
        steps: [
          { type: 'read', text: 'In Anastasia’s mate a knight on e7 (e2 when Black mates) covers g8 and g6, and a rook or queen mates along the h-file against a king stuck on h7 behind its g-pawn. The name comes from Wilhelm Heinse’s 1803 novel Anastasia und das Schachspiel.' },
          { type: 'move', fen: '5r1k/ppq1Nppp/8/7Q/8/4R3/PP3PPP/6K1 w - - 0 1', prompt: 'White to play: mate in two. Sacrifice first, then swing the rook across.', solution: ['h5h7', 'h8h7', 'e3h3'], hint: 'Open the h-file by giving up your queen on h7.', explain: 'Qxh7+! Kxh7 is forced, because the knight covers g8. Then Rh3 is mate: the knight on e7 takes away g6 and g8, and the black pawn on g7 blocks the last square.' },
          { type: 'read', text: 'Boden’s mate uses two bishops on crossing diagonals against a king that has castled queenside, usually after a sacrifice rips open its pawn cover. It is named after Samuel Boden, who mated this way in London in 1853.' },
          { type: 'move', fen: '2k1rb1r/ppp3pp/2n2q2/3B1b2/5P2/2P1BQ2/PP1N1P1P/2KR3R b - - 0 14', prompt: 'Black to play: mate in two with a queen sacrifice and two bishops. (Schulder vs Boden, London 1853)', solution: ['f6c3', 'b2c3', 'f8a3'], hint: 'Break open the white king’s shelter with a capture on c3.', explain: '14...Qxc3+! 15.bxc3 Ba3 is mate. The bishop on a3 checks along the diagonal to c1, and the bishop on f5 covers b1 and c2, the only squares the king could use.' },
          { type: 'quiz', question: 'What do Boden’s mate positions usually have in common?', options: ['A king castled queenside, with a sacrifice that tears open the pawns in front of it', 'A king in the centre with no pawns left', 'Two knights working together'], answer: 0, explain: 'The bishops attack from both sides along crossing diagonals. A sacrifice on c3 or c6 is the typical way to remove the pawn that was shielding the king.' },
        ],
      },
      {
        id: 'checkmate-patterns/legal-trap', title: 'Légal’s mate',
        goal: 'Break a pin that is not really a pin and finish with three minor pieces.',
        steps: [
          { type: 'read', text: 'Légal’s mate is named after the French player Sire de Légal, who is said to have won with it in Paris in 1750. White seems to blunder the queen by moving a pinned knight; if Black grabs the queen, the three remaining minor pieces deliver mate.' },
          { type: 'move', fen: 'rn1qkbnr/ppp2p1p/3p2p1/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5', prompt: 'White to play: your f3 knight is pinned to the queen. Move it anyway, and punish Black if the queen is taken.', solution: ['f3e5', 'g4d1', 'c4f7', 'e8e7', 'c3d5'], hint: 'Take the e5 pawn with the pinned knight. If Black takes the queen, look at f7.', explain: '5.Nxe5! Bxd1? 6.Bxf7+ Ke7 7.Nd5 is mate, delivered by a bishop and two knights. Black should have played 5...dxe5 6.Qxg4, when White has simply won a pawn.' },
          { type: 'quiz', question: 'Why was the knight on f3 free to move?', options: ['Because knights cannot be pinned', 'Because the piece behind it was the queen, not the king, so the pin was only relative', 'Because it was White’s fifth move'], answer: 1, explain: 'A relative pin makes a move costly, not illegal. Here the cost (the queen) bought checkmate.' },
          { type: 'quiz', question: 'After 5.Nxe5, which reply keeps Black in the game?', options: ['5...Bxd1, taking the queen', '5...dxe5, accepting the loss of a pawn after 6.Qxg4', '5...Ke7'], answer: 1, explain: 'Taking the knight first and letting White take the bishop costs only a pawn. Grabbing the queen loses the king.' },
        ],
      },
      {
        id: 'checkmate-patterns/greek-gift', title: 'The Greek gift',
        goal: 'Recognise when the bishop sacrifice on h7 works against a castled king.',
        steps: [
          { type: 'read', fen: 'r1bq1rk1/pppn1ppp/2n1p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQ1RK1 w - - 0 8', arrows: [['d3', 'h7'], ['f3', 'g5'], ['d1', 'h5']], text: 'The Greek gift is the sacrifice Bxh7+ against a king castled on g8, followed by Ng5+ and Qh5. It tends to work when a white pawn on e5 has driven the defending knight away from f6, the white knight can land on g5 safely, and the queen reaches the h-file before Black can bring help.' },
          { type: 'move', fen: 'r1bq1rk1/pppn1ppp/2n1p3/3pP3/1b1P4/2NB1N2/PPP2PPP/R1BQ1RK1 w - - 0 8', prompt: 'White to play: offer the Greek gift and follow it up.', solution: ['d3h7', 'g8h7', 'f3g5', 'h7g8', 'd1h5'], hint: 'Sacrifice on h7 with check, then bring the knight and the queen.', explain: '8.Bxh7+! Kxh7 9.Ng5+ Kg8 10.Qh5 threatens Qh7 mate. Black’s best defence is to give up the queen for the knight on g5, and White comes out with a winning material advantage.' },
          { type: 'quiz', question: 'Which of these makes the Greek gift much less likely to work?', options: ['A white pawn on e5', 'A black knight able to reach f6 or f8 to cover h7', 'White’s queen still on d1'], answer: 1, explain: 'The whole idea is that h7 has no defender left. A knight that can return to f6 or f8 usually refutes the sacrifice.' },
          { type: 'quiz', question: 'What should you check before sacrificing on h7?', options: ['Only that the bishop can reach h7', 'That the knight and queen can follow up in time and the defender cannot easily cover h7', 'That you are ahead on the clock'], answer: 1, explain: 'The sacrifice costs a piece. It pays only if the follow-up is fast and Black has no easy defence; calculate the main replies before you start.' },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------------------------
  {
    id: 'endgame-essentials', title: 'Endgame essentials', level: 'Intermediate', minutes: 40,
    summary: 'The basic mates, the opposition, the square of the pawn, the Lucena and Philidor positions, and the outside passed pawn.',
    sources: [SOURCES.capablanca, SOURCES.laskerStrategy, SOURCES.lucena, SOURCES.philidor],
    lessons: [
      {
        id: 'endgame-essentials/basic-mates', title: 'Mating with queen or rook',
        goal: 'Force mate with a lone queen or rook, without stalemating.',
        steps: [
          { type: 'read', fen: '8/8/8/4k3/8/8/8/4K2Q w - - 0 1', text: 'With king and queen against king, use the queen to shrink the enemy king’s box, keeping a knight’s move away from it, then bring your own king up and mate on the edge. With a rook it takes longer: cut the king off along a rank or file, walk your king up, and give a check only when the two kings face each other.' },
          { type: 'move', fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1', prompt: 'White to play: the kings face each other. Mate with the rook.', solution: ['a1a8'], hint: 'Check along the back rank.', explain: 'Ra8 is mate. Your king covers d7, e7 and f7 and the rook covers the whole eighth rank.' },
          { type: 'move', fen: '7k/R7/5K2/8/8/8/8/8 w - - 0 1', prompt: 'White to play: mate in two. Bring the king, not a check.', solution: ['f6g6', 'h8g8', 'a7a8'], hint: 'The rook already keeps the king on the back rank. Where should your king stand?', explain: 'After Kg6 the black king’s only move is Kg8, straight in front of your king, and then Ra8 is mate. Checking first with Ra8 would take the rook off the seventh rank and let the king out to h7.' },
          { type: 'quiz', question: 'With king and queen against king, what most often throws away the win?', options: ['Running out of checks', 'Stalemating the defending king', 'The fifty-move rule'], answer: 1, explain: 'With the defending king boxed in a corner, a careless queen move takes its last square without giving check. Always make sure the king has a move until you mate.' },
          { type: 'quiz', question: 'Where can a lone rook and king mate a bare king?', options: ['Only in a corner', 'On any edge of the board', 'Anywhere on the board'], answer: 1, explain: 'The rook needs the edge to cut off the king’s retreat, but any edge will do, not just a corner. In the middle of the board there are always escape squares.' },
        ],
      },
      {
        id: 'endgame-essentials/opposition', title: 'The opposition',
        goal: 'Use the opposition to win, or to hold, king and pawn endings.',
        steps: [
          { type: 'read', fen: '8/4k3/8/4K3/4P3/8/8/8 b - - 0 1', marks: ['d6', 'e6', 'f6'], text: 'When two kings stand on the same file with one square between them, the player who does not have to move holds the opposition: the other king must give way. In king and pawn endings this decides everything, because the attacking king wants to reach a key square in front of its pawn (here d6, e6 or f6). In this diagram it is Black to move, so White has the opposition and wins.' },
          { type: 'move', fen: '8/4k3/8/3K4/4P3/8/8/8 w - - 0 1', prompt: 'White to play and win: take the opposition.', solution: ['d5e5'], hint: 'Put your king straight in front of the black king, one square apart, and make Black move.', explain: 'Ke5 takes the opposition. Black has to give way, the white king walks onto d6, e6 or f6, and the pawn promotes. Pushing e5 at once would let Black hold the draw.' },
          { type: 'move', fen: '8/4k3/8/3K4/4P3/8/8/8 b - - 0 1', prompt: 'Same position, but Black to play: hold the draw.', solution: ['e7d7'], hint: 'Now you are the one who can take the opposition.', explain: 'Kd7 takes the opposition and keeps the white king out of c6, d6 and e6. Whenever White steps sideways, mirror the move. A careless move such as Kf6 lets White in and loses.' },
          { type: 'move', fen: '8/3k4/8/8/3KP3/8/8/8 w - - 0 1', prompt: 'White to play and win. Which king move takes the opposition?', solution: ['d4d5'], hint: 'Face the black king on the d-file.', explain: 'Kd5 faces the black king with one square between. Whichever way Black steps, the white king goes past on the other side toward the key squares d6, e6 and f6. Pushing the pawn first would throw the win away.' },
          { type: 'quiz', question: 'King and pawn against king: which pawn can the defender often hold even when the attacking king is in front of it?', options: ['A centre pawn', 'A rook’s pawn (on the a- or h-file)', 'A knight’s pawn'], answer: 1, explain: 'With a rook’s pawn, a defending king that reaches the corner in front of it cannot be driven out, and attempts to shut it in tend to end in stalemate.' },
        ],
      },
      {
        id: 'endgame-essentials/square-of-the-pawn', title: 'The square of the pawn',
        goal: 'Tell at a glance whether a king can catch a passed pawn.',
        steps: [
          { type: 'read', fen: '8/8/8/8/P7/5k2/8/7K b - - 0 1', marks: ['a4', 'e4', 'e8', 'a8'], text: 'Picture a square running from the pawn to its promotion square, the same length along the rank toward the defending king. If that king can step into the square on its move, it catches the pawn; if not, the pawn queens. A pawn on its starting square counts as one square further on, because of its two-square step.' },
          { type: 'move', fen: '8/8/8/8/P7/5k2/8/7K b - - 0 1', prompt: 'Black to play: only one king move catches the a-pawn.', solution: ['f3e4'], hint: 'Step into the square a4-e4-e8-a8.', explain: 'Ke4 enters the square, and the king reaches the pawn just in time (for example a5 Kd5, a6 Kc6, a7 Kb7). Every other move stays outside the square and the pawn promotes.' },
          { type: 'quiz', question: 'A white pawn is on c4, White to move, and the black king stands on h6 with nothing else on the board but the white king far away. Does Black catch the pawn?', options: ['Yes', 'No', 'Only if the pawn stops on c5'], answer: 1, explain: 'After 1.c5 the square runs from c5 to f8, and from h6 the king can only reach the g-file, outside it. If Black were to move first, 1...Kg5 would step into the square of the c4 pawn (c4 to g8) and catch it.' },
          { type: 'quiz', question: 'Why must you be careful when the pawn is still on its starting square?', options: ['It cannot move yet', 'It can advance two squares at once, so it is effectively one move closer than it looks', 'It cannot be captured'], answer: 1, explain: 'The double step saves the pawn a move, so count it as if it already stood one square further up the board.' },
        ],
      },
      {
        id: 'endgame-essentials/lucena', title: 'The Lucena position: build a bridge',
        goal: 'Win the most important rook-and-pawn ending.',
        steps: [
          { type: 'read', fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1', text: 'In the Lucena position the attacking king stands in front of its own pawn on the seventh rank, the defending king is cut off on another file, and the defending rook waits to check. The winning method is called building a bridge: put your rook on the fourth rank, walk the king out, and use the rook to block the checks. It is named after Luis Ramírez de Lucena, although the position is not actually in his book of 1497.' },
          { type: 'quiz', question: 'What is White’s plan in the diagram?', options: ['Bring the king out at once', 'Check the black king one more file away, then lift the rook to the fourth rank', 'Offer a rook trade straight away'], answer: 1, explain: 'Rd1+ drives the king further off, and after ...Ke7, Rd4 prepares the bridge. The king then comes out, and when the checks run out along the b-file, the rook blocks on b4.' },
          { type: 'move', fen: '8/1P2k3/8/1K6/3R4/8/1r6/8 w - - 0 7', prompt: 'White to play: the black rook checks again. Block it, and the pawn will promote.', solution: ['d4b4'], hint: 'This is why the rook went to the fourth rank.', explain: 'Rb4 blocks the check and is protected by the king. Black has run out of useful checks, and b8=Q follows.' },
          { type: 'quiz', question: 'Why does it matter that the defending king is cut off from the pawn?', options: ['If it stood next to the pawn, it could stop the attacking king from coming out', 'It must be in a corner', 'It does not matter'], answer: 0, explain: 'The method needs the attacking king to step out from in front of the pawn. A defending king nearby would block that, and the position would be a draw.' },
        ],
      },
      {
        id: 'endgame-essentials/philidor', title: 'The Philidor position',
        goal: 'Hold a rook ending a pawn down with the third-rank defence.',
        steps: [
          { type: 'read', fen: '3k4/7R/1r6/3PK3/8/8/8/8 w - - 0 1', text: 'In 1777 François-André Danican Philidor showed how the defender draws when the defending king reaches the square in front of the pawn. Keep the rook on your third rank (the sixth for Black) so the attacking king cannot come forward. As soon as the pawn steps onto that rank, the king loses its cover: drop the rook to the first rank and check from behind.' },
          { type: 'quiz', question: 'In the diagram, what is the black rook doing on the sixth rank?', options: ['Attacking the pawn', 'Keeping the white king off the sixth rank', 'Preparing to trade rooks'], answer: 1, explain: 'If the white king reached d6 or e6, White would threaten mate on the back rank and win. From b6 the rook keeps it out.' },
          { type: 'move', fen: '3k4/7R/1r1P4/4K3/8/8/8/8 b - - 0 1', prompt: 'Black to play: the pawn has stepped onto your third rank. Switch to checks from behind.', solution: ['b6b1'], accept: { 0: ['b6b2', 'b6b3', 'b6b4'] }, hint: 'The white king no longer has any shelter. Go down the b-file.', explain: '...Rb1 (b2, b3 or b4 also hold) gets ready to check the king from behind. With the pawn on d6 no longer shielding it, the king cannot escape the checks without giving up the pawn. Staying on the sixth rank with ...Ra6 would lose to Ke6 and mate threats on the back rank.' },
          { type: 'quiz', question: 'If the defending king cannot reach the square in front of the pawn, what usually happens?', options: ['It is still a simple draw with the third-rank defence', 'The attacker often wins, for example by reaching a Lucena position', 'The game is drawn at once'], answer: 1, explain: 'Philidor’s defence depends on the king blocking the pawn. Cut off from it, the defender is often lost.' },
        ],
      },
      {
        id: 'endgame-essentials/outside-passer', title: 'The outside passed pawn',
        goal: 'Use a passed pawn far from the other pawns to drag the enemy king away.',
        steps: [
          { type: 'read', fen: '8/8/4k3/P6p/4K2P/8/8/8 w - - 0 1', text: 'A passed pawn on the far side of the board, away from the other pawns, is a huge asset in king and pawn endings. The defending king has to go and stop it, and while it is busy, your king eats the pawns it left behind.' },
          { type: 'move', fen: '8/8/4k3/P6p/4K2P/8/8/8 w - - 0 1', prompt: 'White to play: the kings face each other. Use the a-pawn.', solution: ['a5a6'], hint: 'Make the black king choose between the a-pawn and the h-pawn.', explain: '1.a6 wins at once: the black king is outside the square of the pawn and cannot catch it. Had it been closer, it would still have had to run to the a-file, while the white king marched to g5 and took the h5 pawn.' },
          { type: 'quiz', question: 'Why is an outside passed pawn so strong in king and pawn endings?', options: ['It promotes faster than other pawns', 'It drags the defending king away from the remaining pawns', 'It can never be captured'], answer: 1, explain: 'The defending king cannot be in two places at once. Stopping the outside pawn costs it the pawns on the other wing.' },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------------------------
  {
    id: 'strategy', title: 'Strategy', level: 'Advanced', minutes: 35,
    summary: 'Pawn structure, outposts and weak squares, open files and the seventh rank, good and bad bishops, and the initiative.',
    sources: [SOURCES.laskerStrategy, SOURCES.capablanca, SOURCES.opera],
    lessons: [
      {
        id: 'strategy/pawn-structure', title: 'Pawn structure',
        goal: 'Judge pawn weaknesses and strengths, and turn a pawn majority into a passed pawn.',
        steps: [
          { type: 'read', text: 'Pawns cannot move backwards, so every pawn move changes the position for good. An isolated pawn has no neighbours to protect it; doubled pawns block each other; a backward pawn has fallen behind its neighbours and cannot be supported. A passed pawn, with no enemy pawn in front of it or on the files beside it, is a strength that grows as the pieces come off.' },
          { type: 'quiz', question: 'A pawn on d4 has no friendly pawns on the c- or e-files. What is it called?', options: ['A passed pawn', 'An isolated pawn', 'A backward pawn'], answer: 1, explain: 'It is isolated: no pawn can ever defend it, and the square in front of it (d5) makes a fine base for enemy pieces. In return it gives space and open files, so it is not always a weakness.' },
          { type: 'quiz', question: 'Which is usually true of doubled pawns?', options: ['They are stronger than ordinary pawns', 'They cannot defend each other and the front pawn blocks the one behind', 'The rules do not allow them'], answer: 1, explain: 'Two pawns on one file control fewer squares than two pawns side by side, and in an ending they can be hard to turn into a passed pawn.' },
          { type: 'move', fen: '7k/ppp5/8/PPP5/8/8/8/7K w - - 0 1', prompt: 'White to play: three pawns against three, yet White can force a queen. Find the breakthrough.', solution: ['b5b6', 'a7b6', 'c5c6', 'b7c6', 'a5a6'], hint: 'Sacrifice the middle pawn first.', explain: '1.b6! If 1...axb6 2.c6! bxc6 3.a6 and the a-pawn runs through; if 1...cxb6 2.a6! bxa6 3.c6 does the same. The black king is too far away to help.' },
          { type: 'quiz', question: 'Why does a passed pawn become stronger as pieces are exchanged?', options: ['Pawns gain points in the ending', 'With fewer pieces left, there are fewer defenders able to stop it', 'Passed pawns move two squares at a time in the ending'], answer: 1, explain: 'In the middlegame a piece can blockade it cheaply. In an ending, stopping it may tie down the king or a rook, leaving the rest of the board to you.' },
        ],
      },
      {
        id: 'strategy/outposts', title: 'Outposts and weak squares',
        goal: 'Find squares the enemy pawns can no longer guard and put pieces on them.',
        steps: [
          { type: 'read', fen: 'rnbq1rk1/1p2bppp/p2p1n2/4p3/4P3/1NN5/PPP1BPPP/R1BQ1RK1 w - - 4 9', marks: ['d5'], text: 'A weak square, or hole, is one the opponent can no longer cover with a pawn. A hole in the enemy camp that one of your pawns supports is an outpost, the ideal home for a knight, because no pawn can chase it away. In this Sicilian structure, d5 is such a square for White.' },
          { type: 'quiz', question: 'In the diagram, why is d5 a weak square for Black?', options: ['No black pawn can attack it any more: the c-pawn is gone and the e-pawn has gone past it', 'It is on the d-file', 'A white pawn already stands there'], answer: 0, explain: 'Only the c- and e-pawns could ever cover d5. One was exchanged on d4 and the other is on e5, so Black must guard d5 with pieces alone.' },
          { type: 'quiz', question: 'Which piece usually gains the most from an outpost?', options: ['A knight', 'The king', 'A rook’s pawn'], answer: 0, explain: 'A knight is a short-range piece that needs a stable, advanced square. On an outpost it cannot be driven away by pawns and often outplays a bishop.' },
          { type: 'quiz', question: 'How do weak squares usually appear in a camp?', options: ['Through pawn moves, which can never be taken back', 'Through queen trades', 'Through castling'], answer: 0, explain: 'Every pawn advance leaves squares behind it that the pawn will never guard again. Provoking such advances is a common way to create targets.' },
        ],
      },
      {
        id: 'strategy/open-files', title: 'Open files and the seventh rank',
        goal: 'Put rooks where they have room, and use the seventh rank.',
        steps: [
          { type: 'read', text: 'Rooks need open files, with no pawns on them, to get into the game. The usual plan is to take an open file, double the rooks on it if needed, and then break into the seventh rank (the second for Black). From there a rook attacks pawns from the side and hems the enemy king in on its back rank.' },
          { type: 'quiz', question: 'What is a half-open file?', options: ['A file with no pawns at all', 'A file with only enemy pawns on it, seen from your side', 'A file shared by two rooks'], answer: 1, explain: 'A half-open file lets your rook press against an enemy pawn, often a weak one, while your own pawn is gone from that file.' },
          { type: 'quiz', question: 'Why is a rook on the seventh rank so strong?', options: ['It can never be attacked there', 'It attacks pawns still on their starting squares and can hem the king in on the back rank', 'It counts as two rooks'], answer: 1, explain: 'Pawns on their home squares can only be defended by pieces, and a rook on the seventh often ties several of them down at once. Two rooks there are often decisive.' },
          { type: 'quiz', question: 'Both sides want the only open file. Who usually gets it?', options: ['Whoever moves a rook there first, ideally with support so the rook cannot simply be exchanged off', 'Always the player with the queen', 'Nobody, open files stay empty'], answer: 0, explain: 'Getting there first matters, but so does being able to hold it. Doubling rooks, or covering the entry squares, keeps the file yours.' },
        ],
      },
      {
        id: 'strategy/bishops', title: 'Good and bad bishops',
        goal: 'Judge a bishop by its own pawns and plan around it.',
        steps: [
          { type: 'read', fen: 'rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3', marks: ['c8', 'e6', 'd5'], text: 'A bishop whose own pawns stand on its colour is called bad: they block its diagonals and leave the squares of the other colour weak. A good bishop has its pawns on the other colour. In this French Defence structure the black pawns on e6 and d5 stand on light squares, which hems in the bishop on c8.' },
          { type: 'quiz', question: 'In the diagram, which black bishop is the "bad" one?', options: ['The one on f8, on dark squares', 'The one on c8, on light squares', 'Neither of them'], answer: 1, explain: 'The pawns on d5 and e6 sit on light squares and block the c8 bishop’s natural diagonals. Black often tries to trade it off, for example with ...b6 and ...Ba6, or to bring it out through d7.' },
          { type: 'quiz', question: 'Your only bishop runs on dark squares. In an ending, where should your pawns usually stand?', options: ['On dark squares, next to the bishop', 'On light squares, so the bishop stays free and the pawns guard the other colour', 'It never matters'], answer: 1, explain: 'Pawns on light squares do the light-square work the bishop cannot do, and leave its diagonals open.' },
          { type: 'quiz', question: 'In an open position, two bishops against bishop and knight are usually...', options: ['An advantage for the side with the bishops', 'A disadvantage', 'Exactly equal'], answer: 0, explain: 'Together the bishops cover both colours at long range. The more open the position, the stronger the bishop pair tends to be.' },
        ],
      },
      {
        id: 'strategy/initiative', title: 'The initiative',
        goal: 'Keep making threats so your opponent has no time for plans of their own.',
        steps: [
          { type: 'read', text: 'The side that keeps creating threats has the initiative: the opponent must answer them instead of following their own plans. Development and space create it, and checks, captures and threats keep it going. Giving up a pawn for a lasting initiative is often a good bargain; giving up the initiative to win a pawn often is not.' },
          { type: 'quiz', question: 'You are well ahead in development, but your opponent has an extra pawn. What is usually right?', options: ['Slow down and consolidate first', 'Open the position and create threats before the opponent catches up', 'Trade queens immediately'], answer: 1, explain: 'A lead in development is temporary. Use it while it lasts, by opening lines toward the uncastled or less defended king.' },
          { type: 'move', fen: 'rn2kb1r/p3qppp/2p2n2/1p2p1B1/2B1P3/1QN5/PPP2PPP/R3K2R w KQkq - 0 10', prompt: 'White to play: Black’s last move, ...b5, attacks your bishop. Keep the initiative instead of retreating. (Morphy, Paris 1858)', solution: ['c3b5'], hint: 'Black’s king is still in the centre. Which capture opens lines toward it?', explain: '10.Nxb5! gives a knight for two pawns. After 10...cxb5 11.Bxb5+ the king is checked and stuck in the centre while every white piece joins the attack, which is how Morphy won. Retreating the bishop would have given Black time to finish development.' },
          { type: 'quiz', question: 'Which of these moves best keeps the initiative?', options: ['A quiet pawn move on the far wing', 'A developing move that also attacks something', 'Retreating a piece to safety'], answer: 1, explain: 'A move that develops and threatens at the same time forces a reply, so you stay one step ahead.' },
          { type: 'quiz', question: 'What tends to happen to the initiative if you stop making threats?', options: ['It stays with you forever', 'It passes to the opponent, who gets time to finish development and counterattack', 'The game is drawn'], answer: 1, explain: 'The initiative is a matter of time. Every move you spend without a threat is a move the opponent can use.' },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------------------------
  {
    id: 'calculation', title: 'Calculation', level: 'Advanced', minutes: 30,
    summary: 'Candidate moves, forcing moves first, the blunder check, and following a line to its end, practised on famous finishes.',
    sources: [SOURCES.laskerStrategy, SOURCES.capablanca, SOURCES.opera],
    lessons: [
      {
        id: 'calculation/candidate-moves', title: 'Candidate moves',
        goal: 'List the serious options before calculating any of them.',
        steps: [
          { type: 'read', text: 'Before diving into one line, list the moves worth considering: the candidates. Start with every check, capture and threat for both sides, then add the natural improving moves. Calculating three candidates a little is better than calculating one very deeply, because the best move is often not the first one you notice.' },
          { type: 'quiz', question: 'What should your list of candidate moves always include?', options: ['Only the first move you thought of', 'All checks, captures and threats, for you and for your opponent', 'Only pawn moves'], answer: 1, explain: 'Forcing moves change the position most and are the easiest to miss for both sides. Add the quiet improving moves afterwards.' },
          { type: 'move', fen: '7k/8/4K3/8/2Q5/8/8/8 w - - 0 1', prompt: 'White to play: mate in two. The first move is not a check.', solution: ['e6f7', 'h8h7', 'c4h4'], hint: 'Checks only chase the king. Take away its squares instead.', explain: 'Kf7! leaves the black king a single move, Kh7, and then Qh4 is mate. Starting with a check only lets the king run, and a careless queen move could even stalemate it. Including quiet moves among your candidates is what finds this.' },
          { type: 'quiz', question: 'You have found a good move. What should you do before playing it?', options: ['Play it at once to save time', 'Look for an even better one among your other candidates', 'Offer a draw'], answer: 1, explain: 'A classic piece of advice: when you see a good move, look for a better one. A quick check of the other candidates often finds it.' },
        ],
      },
      {
        id: 'calculation/forcing-moves', title: 'Forcing moves first',
        goal: 'Calculate checks, captures and threats first, because they limit the replies.',
        steps: [
          { type: 'read', text: 'Checks, captures and threats leave the opponent few answers, so they are the easiest lines to calculate all the way to the end. Look at them first, for both sides, including the ones that seem absurd at first sight, such as giving up the queen.' },
          { type: 'move', fen: '4kb1r/p2n1ppp/4q3/4p1B1/4P3/1Q6/PPP2PPP/2KR4 w k - 0 16', prompt: 'White to play: mate in two. Start with the most forcing move on the board, even though it gives away the queen. (Morphy, Paris 1858)', solution: ['b3b8', 'd7b8', 'd1d8'], hint: 'A queen check on b8 can be answered in only one way.', explain: '16.Qb8+! Nxb8 17.Rd8 mate. The knight is forced to take, which clears d8 for the rook, protected by the bishop on g5.' },
          { type: 'move', fen: 'r1b1k1nr/p2p1ppp/n2B4/1p1NPN1P/6P1/3P1Q2/P1P1K3/q5b1 w kq - 2 21', prompt: 'White to play: mate in three, though White has already given up both rooks and a bishop. (Anderssen vs Kieseritzky, London 1851)', solution: ['f5g7', 'e8d8', 'f3f6', 'g8f6', 'd6e7'], hint: 'Begin with a knight check that captures a pawn, then give up the queen.', explain: '21.Nxg7+ Kd8 22.Qf6+! Nxf6 23.Be7 mate. Every white move was a check, so Black never had time to use the extra material.' },
          { type: 'quiz', question: 'Why are forcing moves easier to calculate than quiet ones?', options: ['They are always good', 'They leave the opponent only a few legal or sensible replies', 'The engine shows them first'], answer: 1, explain: 'After a check there may be only one or two answers, so the tree of variations stays small and you can see to the end.' },
        ],
      },
      {
        id: 'calculation/blunder-check', title: 'The blunder check',
        goal: 'Ask what the opponent can do after your move, every single move.',
        steps: [
          { type: 'read', fen: '4r1k1/pp3ppp/8/8/4q3/1Q6/P4PPP/2R3K1 w - - 0 1', marks: ['b7', 'e1'], text: 'Before you touch a piece, ask: "If I play this, what is my opponent’s most forcing reply?" Most blunders are one-move oversights: a piece left hanging, a back rank left open, a check that wins something. Here White would love to take the pawn on b7 with the queen.' },
          { type: 'quiz', question: 'What happens if White plays Qxb7 in the diagram?', options: ['White wins a pawn safely', 'Black mates with ...Qe1+ and ...Rxe1', 'Black wins the rook on c1 but no more'], answer: 1, explain: 'The rook on c1 is the only guard of White’s back rank. Once the queen leaves, ...Qe1+ forces Rxe1 and ...Rxe1 is mate. With luft (h3 or g3) first, that mate would not exist.' },
          { type: 'move', fen: '4r1k1/pQ3ppp/8/8/4q3/8/P4PPP/2R3K1 b - - 0 1', prompt: 'Black to play: White has just grabbed b7. Punish it: mate in two.', solution: ['e4e1', 'c1e1', 'e8e1'], hint: 'The white king has no escape square. Check on the back rank.', explain: '...Qe1+! forces Rxe1, and ...Rxe1 is mate. White’s rook was the only guard of the first rank.' },
          { type: 'quiz', question: 'Which question is at the heart of a blunder check?', options: ['What is my opponent’s most forcing reply after my move?', 'How many pieces do I have left?', 'Can I castle next move?'], answer: 0, explain: 'Checks, captures and threats against you come first. If none of them hurts, the move is probably safe.' },
        ],
      },
      {
        id: 'calculation/to-the-end', title: 'See it to the end',
        goal: 'Follow a forcing line to its final position before you start it.',
        steps: [
          { type: 'read', text: 'A combination is only as good as the position it ends in. Calculate until you reach something you can judge with confidence: mate, a clear material gain, or an ending you know is won. If a line fizzles out halfway, keep looking or choose a quieter move.' },
          { type: 'quiz', question: 'You see a sacrifice that leads to a position you cannot assess. What is the sensible approach?', options: ['Play it, sacrifices are always good', 'Compare it with a solid alternative and choose the line whose end you can judge', 'Resign'], answer: 1, explain: 'If you cannot evaluate where a line leads, you are gambling. A safe move you understand is often the better practical choice.' },
          { type: 'move', fen: '3r4/4k3/8/P6p/4K2P/8/8/3R4 w - - 0 1', prompt: 'White to play: trading rooks leads to a king and pawn ending. Work out who wins it before you decide.', solution: ['d1d8'], hint: 'After the trade, which black pawn is left unprotected, and how far is the black king from your a-pawn?', explain: 'Rxd8 Kxd8 leaves a won pawn ending: the black king must run to stop the a-pawn, and meanwhile the white king goes Kf5, Kg5 and takes h5, after which the h-pawn queens. Keeping the rooks would make the win much harder. You can only choose the trade with confidence if you see that final position first.' },
          { type: 'quiz', question: 'When can you stop calculating a line?', options: ['After two moves, whatever happens', 'When you reach a position you can evaluate clearly, such as mate, a material gain or a known ending', 'When you get tired'], answer: 1, explain: 'The stopping point is a position you understand. Before that, keep following the forcing moves.' },
        ],
      },
    ],
  },
  // ---------------------------------------------------------------------------------------------
  {
    id: 'vch-variants', title: 'VCH variants', level: 'Intermediate', minutes: 25,
    summary: 'How Crazyhouse, Vanta Dark, Blackout Blitz and Freestyle 960 work in VCH, and how to play each of them well.',
    sources: [SOURCES.fide960, SOURCES.crazyhouse, SOURCES.darkChess],
    lessons: [
      {
        id: 'vch-variants/crazyhouse-drops', title: 'Crazyhouse: drops and the pocket',
        goal: 'Understand how captured pieces come back into play.',
        steps: [
          { type: 'read', text: 'In Crazyhouse every piece you capture changes colour and goes into your pocket. On any later turn, instead of moving a piece, you may drop one from your pocket onto any empty square. Pawns may not be dropped on the first or last rank, and a promoted piece goes back into the capturer’s pocket as a plain pawn. In VCH you play Crazyhouse online, with its own rating.' },
          { type: 'quiz', question: 'You capture a knight in Crazyhouse. What happens to it?', options: ['It leaves the game', 'It goes into your pocket as your own knight, ready to drop', 'It goes back to your opponent’s pocket'], answer: 1, explain: 'Captured pieces switch sides. That is why a capture in Crazyhouse is really a double gain: the opponent loses the piece and you gain one to drop.' },
          { type: 'quiz', question: 'Where may you drop a pawn?', options: ['On any empty square, including the first and last ranks', 'On any empty square except the first and last ranks', 'Only on its original file'], answer: 1, explain: 'A pawn can never be dropped onto the first or last rank, so it cannot appear already promoted or stuck where it could never move.' },
          { type: 'quiz', question: 'Your opponent promoted a pawn to a queen and you capture that queen. What goes into your pocket?', options: ['A queen', 'A pawn', 'Nothing'], answer: 1, explain: 'A promoted piece remembers that it was a pawn. When it is captured, the capturer gets a pawn, not a queen.' },
          { type: 'quiz', question: 'Can a drop give check, or even checkmate?', options: ['No, drops may never give check', 'Yes, a drop can give check and can even mate', 'Only pawn drops can give check'], answer: 1, explain: 'A drop is a normal move in every other way. A knight dropped next to a boxed-in king is a classic Crazyhouse mate.' },
        ],
      },
      {
        id: 'vch-variants/crazyhouse-safety', title: 'Crazyhouse: king safety and tempo',
        goal: 'Value pieces in hand and keep your king covered.',
        steps: [
          { type: 'read', text: 'Because captured pieces come back, material matters less than in normal chess and time matters more. A piece in hand can land beside the enemy king in a single move, so open lines and holes around your king are far more dangerous. Keep your king sheltered by pawns, and be careful about trades that hand your opponent attacking pieces.' },
          { type: 'quiz', question: 'Why is checkmate easier to deliver in Crazyhouse than in normal chess?', options: ['Kings move more slowly', 'Pieces in hand can be dropped straight next to the king', 'Checks cannot be blocked'], answer: 1, explain: 'An attacker does not have to bring pieces across the board; they can be dropped exactly where they are needed.' },
          { type: 'quiz', question: 'You are in check, your king has no safe square, but you hold a knight in your pocket. When is it not checkmate?', options: ['Never', 'When dropping a piece between the checker and your king blocks the check', 'Only if the checking piece is a pawn'], answer: 1, explain: 'In VCH’s Crazyhouse a check you can block with a drop is not mate. A check from a knight or a pawn, or from a piece right next to the king, cannot be blocked that way.' },
          { type: 'quiz', question: 'Which drawing rules does VCH’s Crazyhouse leave out?', options: ['Stalemate', 'Threefold repetition and the fifty-move rule', 'Checkmate'], answer: 1, explain: 'With pieces always returning, repetition and the fifty-move count are not used in Crazyhouse. Stalemate still ends the game as a draw.' },
        ],
      },
      {
        id: 'vch-variants/vanta-dark', title: 'Vanta Dark: playing in the fog',
        goal: 'Play normal chess when you can see only what your pieces see.',
        steps: [
          { type: 'read', text: 'Vanta Dark uses the normal rules, but you see only your own pieces and the squares they could move to. A sliding piece sees up to and including the first piece in its way. A pawn sees the squares straight ahead only while they are empty, and its diagonal squares only when there is something there to take. When you are in check, the checking pieces are shown; the opponent’s moves appear as "?" in the move list; and the whole board is revealed when the game ends. You play it against the computer, which plays in the dark too: it sees only what its pieces see and remembers where it last saw yours.' },
          { type: 'quiz', question: 'Your pawn stands on e4, the square e5 in front of it is dark, and none of your other pieces can see e5. What does that tell you?', options: ['Nothing, e5 is simply empty', 'An enemy piece is standing on e5, because your pawn sees e5 only while it is empty', 'Your pawn has been captured'], answer: 1, explain: 'If e5 were empty your pawn would light it up, and your own pieces are always visible. A dark square right in front of your pawn means an enemy piece is blocking it.' },
          { type: 'quiz', question: 'Why are knights good scouts in Vanta Dark?', options: ['They see through other pieces', 'They see every square they could jump to, whatever stands there, and their view cannot be blocked', 'They may move twice'], answer: 1, explain: 'A knight lights up all of its jump squares at once, and a piece in between does not cut its view as it would for a bishop, rook or queen.' },
          { type: 'quiz', question: 'What is the main danger to your king in Vanta Dark?', options: ['Being mated by a piece you never saw coming', 'Running out of time', 'Losing castling rights'], answer: 0, explain: 'You only see an attacker when one of your pieces can see its square. Keep pieces near your king so the squares around it stay lit.' },
          { type: 'quiz', question: 'Does the fifty-move rule still apply in Vanta Dark?', options: ['No', 'Yes. The countdown is hidden, but the game is still drawn automatically after fifty moves each with no capture or pawn move', 'Only if both players agree'], answer: 1, explain: 'The rules are the normal ones. Only the countdown in the status line is hidden, because it would tell you about moves you cannot see.' },
        ],
      },
      {
        id: 'vch-variants/blackout-blitz', title: 'Blackout Blitz: lights out',
        goal: 'Plan ahead so you can play two moves blind.',
        steps: [
          { type: 'read', text: 'Blackout Blitz is a three-minute game against the computer. After every four of your moves, your next two are played blind: the pieces vanish from the board, though the squares still work and the last move’s squares still glow, and the move list goes dark until the lights come back. The computer goes blind on the same rhythm and plays from the board it remembers.' },
          { type: 'quiz', question: 'Which of your moves are played in the dark?', options: ['Moves 4 and 5, 9 and 10, and so on', 'Moves 5 and 6, then 11 and 12, then 17 and 18, and so on', 'Every other move'], answer: 1, explain: 'The rhythm is four moves with the lights on, then two blind: lights on for moves 1 to 4, dark for 5 and 6, on again for 7 to 10, and so on.' },
          { type: 'quiz', question: 'How should you use your fourth move, the last one before the lights go out?', options: ['For a wild attacking move', 'For a solid move that leaves nothing hanging, with a clear plan for the next two moves', 'To offer a draw'], answer: 1, explain: 'You will have to play the next two moves from memory. Go into the dark with a safe position and a plan you can carry out without looking.' },
          { type: 'quiz', question: 'What can still help you during a blackout?', options: ['Nothing at all', 'Your memory of the position and the glowing squares of the last move', 'The engine evaluation bar'], answer: 1, explain: 'There is no evaluation in the dark, but the last move’s squares still glow, which shows where the computer just moved.' },
        ],
      },
      {
        id: 'vch-variants/freestyle-960', title: 'Freestyle 960',
        goal: 'Handle a shuffled back rank from the very first move.',
        steps: [
          { type: 'read', text: 'Freestyle starts from one of the 960 Chess960 positions: the back-rank pieces are shuffled, with the bishops on opposite colours and the king somewhere between the two rooks, and Black mirrors White. Against the computer, Freestyle is played without castling. In online games castling follows the Chess960 rule: king and rook finish on the same squares as in normal castling (g and f on the short side, c and d on the long side), however far they had to travel. Online Freestyle has its own rating.' },
          { type: 'quiz', question: 'Which rule does every Freestyle starting position follow?', options: ['The queen always starts on d1', 'The bishops stand on opposite colours and the king stands between the rooks', 'The knights always start next to the king'], answer: 1, explain: 'Those two conditions, plus Black mirroring White, give exactly 960 possible starting positions.' },
          { type: 'quiz', question: 'In an online Freestyle game you castle on the short side. Where do your king and rook end up?', options: ['On each other’s starting squares', 'King on g1 and rook on f1, as in normal chess', 'King on h1 and rook on g1'], answer: 1, explain: 'Wherever they start, castling leaves the king and rook on the usual castled squares. If one of them already stands there, it simply stays put.' },
          { type: 'quiz', question: 'With no opening theory to rely on, what should guide your first moves in Freestyle?', options: ['Normal opening theory, move by move', 'The usual principles: fight for the centre, develop, watch for undefended pawns, and get the king safe', 'Bringing the queen out at once'], answer: 1, explain: 'The principles still work. Look out for pieces that start on unusual diagonals: some positions have a pawn or a square under attack from the very first move.' },
        ],
      },
    ],
  },
];

export function courseById(id) {
  return COURSES.find(c => c.id === id) || null;
}
// Lesson ids are 'course-id/lesson-id'.
export function lessonById(id) {
  const courseId = String(id || '').split('/')[0];
  return courseById(courseId)?.lessons.find(l => l.id === id) || null;
}
// localStorage key for a lesson's (or a course's) progress.
export function lessonProgressKey(id) {
  return 'vch.course.' + id;
}
export function courseStats(courses = COURSES) {
  let lessons = 0, steps = 0, interactive = 0;
  for (const c of courses) for (const l of c.lessons) {
    lessons++;
    for (const s of l.steps) { steps++; if (s.type === 'move' || s.type === 'quiz') interactive++; }
  }
  return { courses: courses.length, lessons, steps, interactive };
}
