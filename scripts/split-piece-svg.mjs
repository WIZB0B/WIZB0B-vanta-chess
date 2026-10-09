// Splits a piece sheet SVG made of <symbol id="wk".."bp" viewBox="..."> into standalone
// files: node scripts/split-piece-svg.mjs <sheet.svg> <out-dir>
// Shared <defs> (gradients etc.) outside the symbols are copied into every file. The sheet
// is refused if it contains scripts, event handlers, foreign objects or external references.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const IDS=['wk','wq','wr','wb','wn','wp','bk','bq','br','bb','bn','bp'];

export function splitPieceSheet(source){
  if(/<script|<foreignObject|\son[a-z]+\s*=|(?:href|src)\s*=\s*["'](?!#)/i.test(source))throw new Error('sheet contains scripts, event handlers or external references');
  const symbols=new Map();
  for(const match of source.matchAll(/<symbol\b([^>]*)>([\s\S]*?)<\/symbol>/g)){
    const id=match[1].match(/\bid\s*=\s*["']([^"']+)["']/)?.[1];
    const viewBox=match[1].match(/\bviewBox\s*=\s*["']([^"']+)["']/)?.[1]||'0 0 100 100';
    if(id)symbols.set(id,{viewBox,body:match[2].trim()});
  }
  const withoutSymbols=source.replace(/<symbol\b[\s\S]*?<\/symbol>/g,'');
  const defs=[...withoutSymbols.matchAll(/<defs\b[^>]*>([\s\S]*?)<\/defs>/g)].map(m=>m[1].trim()).filter(Boolean).join('\n');
  const missing=IDS.filter(id=>!symbols.has(id));
  if(missing.length)throw new Error(`sheet is missing symbols: ${missing.join(', ')}`);
  return Object.fromEntries(IDS.map(id=>{
    const {viewBox,body}=symbols.get(id);
    return [id,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${defs?`<defs>${defs}</defs>`:''}${body}</svg>\n`];
  }));
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [sheet,outDir]=process.argv.slice(2);
  if(!sheet||!outDir){console.error('usage: node scripts/split-piece-svg.mjs <sheet.svg> <out-dir>');process.exit(1)}
  const files=splitPieceSheet(await readFile(sheet,'utf8'));
  await mkdir(outDir,{recursive:true});
  for(const [id,svg] of Object.entries(files))await writeFile(join(outDir,`${id}.svg`),svg);
  console.log(`wrote ${Object.keys(files).length} files to ${outDir}`);
}
