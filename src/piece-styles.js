// Piece sets (Theme Studio). Vanta is the default. Each set's artwork:
// - vanta:       public/assets/vch/pieces/vanta-3d.png (6x2 sheet, 2x) + vanta-3d-1x.png
// - regal:       public/assets/vch/pieces/vanta-regal.png (6x2 sheet of 224x280 cells, 2x) + vanta-regal-1x.png
// - vanta-ink:   public/assets/vch/pieces/vanta-2d/{id}.svg
// - monarch:     public/assets/vch/pieces/vanta-premium-3d.png (6x2 sheet, 2x) + vanta-premium-3d-1x.png
// - monarch-ink: public/assets/vch/pieces/vanta-premium-2d/{id}.svg
// - heritage:    the original Staunton pieces, public/assets/vch/pieces/3d/{id}.webp
// Monarch, Monarch Ink and Heritage are hidden for now: their slender pieces fill too little
// of a square to read clearly. Anyone who had picked one moves to Vanta.
// Regal is a set rendered from slightly above, like a real 3D board: its pieces stand a
// quarter of a square taller than their square and overlap the square behind them.
export const PIECE_STYLES=[
  ['vanta','Vanta'],['vanta-ink','Vanta Ink'],['regal','Regal'],
];
export const DEFAULT_PIECE_STYLE='vanta';
const known=new Set(PIECE_STYLES.map(([value])=>value));

export function normalizePieceStyle(value){
  return known.has(value)?value:DEFAULT_PIECE_STYLE;
}

// Runs once per saved theme: every choice saved before these sets existed moves to Vanta,
// and pieceSetVersion records that it ran, so any later choice is kept.
export const PIECE_SET_VERSION=3;
export function migratePieceStyle(theme){
  if(Number(theme.pieceSetVersion)>=PIECE_SET_VERSION)return normalizePieceStyle(theme.pieceStyle);
  theme.pieceSetVersion=PIECE_SET_VERSION;
  return DEFAULT_PIECE_STYLE;
}

export function pieceStyleOptions(){return PIECE_STYLES.map(([value,label])=>`<option value="${value}">${label}</option>`).join('')}

// Single-piece image for portraits and menu art. A sheet can't be used in an <img>, so Vanta
// and Monarch show their Ink vectors there.
export function pieceAssetFor(style,name){
  if(style==='vanta'||style==='vanta-ink'||style==='regal')return `/assets/vch/pieces/vanta-2d/${name}.svg`;
  if(style==='monarch'||style==='monarch-ink')return `/assets/vch/pieces/vanta-premium-2d/${name}.svg`;
  return `/assets/vch/pieces/3d/${name}.webp`;
}
