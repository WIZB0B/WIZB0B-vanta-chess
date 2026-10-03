import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve('public/assets/generated');
const assets={
  'pieces-white.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_013746_b815f309-1486-4808-9fd4-6f4b5a90fef5.png',
  'pieces-black.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_013748_e90a13cf-1728-4224-ae48-7e2de94cfd7f.png',
  'wallpaper-emerald.webp':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_013747_49b6077d-96e1-40c8-bf40-954f106c63d6_min.webp',
  'wallpaper-cobalt.webp':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_013747_18f6bf9f-2e8c-4a65-bdda-d4353ce87a75_min.webp',
  'wallpaper-burgundy.webp':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_013747_a6316e4d-6eb8-48ef-86aa-d437a58736a0_min.webp',
  'wallpaper-ivory.webp':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_013747_f91585d8-69c8-459b-8ef4-f175ea28315f_min.webp'
};
await mkdir(root,{recursive:true});
for(const [name,url] of Object.entries(assets)){
  let response;
  for(let attempt=0;attempt<3;attempt++){
    response=await fetch(url,{redirect:'follow'});
    if(response.ok)break;
    await new Promise(r=>setTimeout(r,300*(attempt+1)));
  }
  if(!response?.ok)throw new Error(`Failed to prepare ${name}: HTTP ${response?.status}`);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength<4096)throw new Error(`Prepared asset ${name} is unexpectedly small`);
  await writeFile(resolve(root,name),bytes);
}
console.log('Prepared VCH reference-matched pieces and wallpapers locally');
