import { readFileSync } from 'node:fs';

const netlifyConfigUrl=new URL('../netlify.toml',import.meta.url);

export function parseNetlifyHeaders(source){
  const match=String(source).match(/\[headers\.values\]\s*([\s\S]*?)(?=\n\[\[|\n\[[^h]|$)/);
  if(!match)throw new Error('Missing [headers.values] in netlify.toml');
  const headers={};
  for(const line of match[1].split(/\r?\n/)){
    const parsed=line.match(/^([A-Za-z0-9-]+)\s*=\s*"([^"]*)"\s*$/);
    if(parsed)headers[parsed[1]]=parsed[2];
  }
  if(!headers['Content-Security-Policy'])throw new Error('Missing Content-Security-Policy in netlify.toml');
  return headers;
}

export const securityHeaders=Object.freeze(parseNetlifyHeaders(readFileSync(netlifyConfigUrl,'utf8')));
