// Player portraits: a picture when the player has one, a VCH portrait (a piece on a toned
// medallion, see supabase/functions/chess/profile-rules.js) when they chose one, otherwise an
// empty silhouette.
import { isPortraitPreset } from '../supabase/functions/chess/profile-rules.js';
export { PORTRAIT_PRESETS, PORTRAIT_PIECES, PORTRAIT_TONES, isPortraitPreset, cleanBio, BIO_MAX, cleanDisplayName, isDisplayName } from '../supabase/functions/chess/profile-rules.js';
const PIECE_NAMES={k:'King',q:'Queen',r:'Rook',b:'Bishop',n:'Knight',p:'Pawn'};
// Dark tones carry an ivory piece, light tones an ink one.
const LIGHT_TONES=new Set(['gold','ivory']);
export function presetMarkup(id){
  if(!isPortraitPreset(id))return '';
  const [piece,tone]=id.split('-'),color=LIGHT_TONES.has(tone)?'b':'w';
  return `<span class="portrait-preset tone-${tone}"><img src="/assets/vch/pieces/vanta-2d/${color}${piece}.svg" alt="" decoding="async"></span>`;
}
export const presetLabel=id=>isPortraitPreset(id)?`${PIECE_NAMES[id[0]]} · ${id.split('-')[1]}`:'';
export const SILHOUETTE=`<svg class="portrait-silhouette" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="15" r="7.2"/><path d="M6.5 36.5c1.2-8 6.6-12.4 13.5-12.4s12.3 4.4 13.5 12.4"/></svg>`;
export function isAvatarData(value){return /^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(String(value||''))}
// Draws `el` as a portrait. `label` is the accessible name; `initials` is used for bots.
export function setPortrait(el,{avatar=null,preset=null,initials=null,label=''}={}){
  if(!el)return;
  if(avatar&&!isAvatarData(avatar))avatar=null;
  const chosen=!avatar&&isPortraitPreset(preset)?preset:null;
  const key=avatar?`img:${avatar.length}:${avatar.slice(-24)}`:chosen?`preset:${chosen}`:initials?`txt:${initials}`:'empty';
  if(el.dataset.portrait===key)return;el.dataset.portrait=key;
  el.classList.toggle('has-picture',!!avatar||!!chosen);el.classList.toggle('is-empty',!avatar&&!chosen&&!initials);
  if(avatar){el.innerHTML='';const img=document.createElement('img');img.src=avatar;img.alt='';el.append(img)}
  else if(chosen)el.innerHTML=presetMarkup(chosen);
  else if(initials)el.textContent=initials;
  else el.innerHTML=SILHOUETTE;
  if(label)el.setAttribute('aria-label',label);
}
// A picked image -> a square 128px data: image small enough for the profile (<= 48000 chars).
export async function avatarFromFile(file,{size=128,max=48000}={}){
  if(!file||!/^image\//.test(file.type))throw new Error('Choose an image file.');
  if(file.size>12*1024*1024)throw new Error('That image is too large.');
  const bitmap=await createImageBitmap(file);
  const side=Math.min(bitmap.width,bitmap.height),sx=(bitmap.width-side)/2,sy=(bitmap.height-side)/2;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingQuality='high';ctx.drawImage(bitmap,sx,sy,side,side,0,0,size,size);bitmap.close?.();
  for(const [type,q] of [['image/webp',.85],['image/webp',.7],['image/jpeg',.82],['image/jpeg',.65],['image/jpeg',.5]]){
    const url=canvas.toDataURL(type,q);
    if(url.startsWith(`data:${type}`)&&url.length<=max)return url;
  }
  throw new Error('Could not make that picture small enough.');
}
