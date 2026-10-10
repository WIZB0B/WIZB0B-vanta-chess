// Country flags (flag-icons, MIT). Vite emits each flag as its own file; a page only loads
// the flags it shows.
const files=import.meta.glob('/node_modules/flag-icons/flags/4x3/*.svg',{query:'?url',import:'default',eager:true});
export const FLAG_URL=Object.fromEntries(Object.entries(files)
  .map(([path,url])=>[path.match(/([a-z-]+)\.svg$/)?.[1]?.toUpperCase(),url])
  .filter(([code])=>/^[A-Z]{2}$/.test(code||'')));
let names=null;
export function countryName(code){
  try{names??=new Intl.DisplayNames(['en'],{type:'region'});return names.of(code)||code}catch{return code}
}
// Every flag we can draw, as [code, name], sorted by name; codes the browser can't name
// (special regions) are left out.
export function countryList(){
  return Object.keys(FLAG_URL).map(code=>[code,countryName(code)]).filter(([code,name])=>name&&name!==code).sort((a,b)=>a[1].localeCompare(b[1]));
}
