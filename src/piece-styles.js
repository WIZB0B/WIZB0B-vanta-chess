// Piece style choices (Theme Studio). Vanta 3D / 2D are the v2 sets and the default;
// Vanta Classic is the original sprite sheet, kept as an option.
export const PIECE_STYLES=[
  ['vanta-3d','Vanta 3D'],['vanta-2d','Vanta 2D'],
  ['vanta-classic-3d','Vanta Classic 3D'],['vanta-classic-2d','Vanta Classic 2D'],
  ['staunton-3d','Staunton 3D'],['staunton-2d','Staunton 2D'],
];
export const DEFAULT_PIECE_STYLE='vanta-3d';
const known=new Set(PIECE_STYLES.map(([value])=>value));

export function normalizePieceStyle(value){
  if(value==='3d')return 'vanta-3d';
  if(value==='2d')return 'vanta-2d';
  return known.has(value)?value:DEFAULT_PIECE_STYLE;
}

// Runs once per saved theme: choices saved before the v2 sets existed ('vanta-3d' /
// 'vanta-2d' meant the sprite then, '3d' / '2d' even earlier) move to the v2 sets, and
// pieceSetVersion records that it ran, so a later Classic choice is never overridden.
export const PIECE_SET_VERSION=2;
export function migratePieceStyle(theme){
  if(Number(theme.pieceSetVersion)>=PIECE_SET_VERSION)return normalizePieceStyle(theme.pieceStyle);
  theme.pieceSetVersion=PIECE_SET_VERSION;
  return normalizePieceStyle(theme.pieceStyle);
}

export function pieceStyleOptions(){return PIECE_STYLES.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}

// Single-piece image for portraits and menu art (the 3D sheet can't be used in an <img>).
export function pieceAssetFor(style,name){
  if(style==='vanta-2d')return `/assets/vch/pieces/vanta-2d/${name}.svg`;
  return `/assets/vch/pieces/${style.endsWith('2d')?'2d':'3d'}/${name}.webp`;
}
