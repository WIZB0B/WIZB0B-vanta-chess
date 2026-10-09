// Piece sets (Theme Studio). Vanta is the default. Each set's artwork:
// - vanta:       public/assets/vch/pieces/vanta-3d.png (6x2 sheet)
// - vanta-ink:   public/assets/vch/pieces/vanta-2d/{id}.svg
// - monarch:     public/assets/vch/pieces/vanta-premium-3d.png (6x2 sheet)
// - monarch-ink: public/assets/vch/pieces/vanta-premium-2d/{id}.svg
// - heritage:    the original Staunton pieces, public/assets/vch/pieces/3d/{id}.webp
export const PIECE_STYLES=[
  ['vanta','Vanta'],['vanta-ink','Vanta Ink'],
  ['monarch','Monarch'],['monarch-ink','Monarch Ink'],
  ['heritage','Heritage'],
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
  if(style==='vanta'||style==='vanta-ink')return `/assets/vch/pieces/vanta-2d/${name}.svg`;
  if(style==='monarch'||style==='monarch-ink')return `/assets/vch/pieces/vanta-premium-2d/${name}.svg`;
  return `/assets/vch/pieces/3d/${name}.webp`;
}
