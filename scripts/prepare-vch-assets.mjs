import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=resolve('public/assets/generated');
const assets={
  'wk.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170923_ac7e310f-d46f-49c7-bded-ab528b8bc901.png',
  'wq.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170922_afa8eb8d-01e9-476e-9bc0-0766365295e9.png',
  'wr.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170922_29a63f89-b95b-42a7-881c-00b41e3614a7.png',
  'wb.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170922_a844eea1-3419-43b7-b608-a41ea1590c59.png',
  'wn.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170923_3a3af9b3-c766-4273-b503-ab4de5762fad.png',
  'wp.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170922_e6e88276-9725-4fb9-840d-7efc7e722c60.png',
  'bk.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170926_bdfe6a36-142d-42a5-b19b-ee82448a619d.png',
  'bq.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170926_bf2a0951-f37b-42e8-be82-f9d13e4d8baf.png',
  'br.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170926_60655c11-514e-46f4-9e00-f7682a11cce2.png',
  'bb.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170926_ad87786c-01af-421c-9523-962aac2d8173.png',
  'bn.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170927_d9d4475a-9cce-4a3e-8396-dd27e7547c65.png',
  'bp.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_170927_fcaa44cd-5f97-4e56-82e4-4d8d07f6dc68.png',
  'hero-knight.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_232839_ddd8cb8c-d6a5-4e2b-88b2-102726384587.png',
  'opening-card.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_232839_06a812fc-fe25-438f-8163-6c5d78819665.png',
  'famous-card.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_232840_37ea61f2-7b60-4c32-bcd2-b6662947e1f1.png',
  'review-card.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_232839_ff9a7250-062b-4407-810b-e9ca7d8fb1c2.png',
  'practice-card.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_232839_1474bd74-fe3f-4ae6-9324-b6023785aebb.png',
  'live-banner.png':'https://d8j0ntlcm91z4.cloudfront.net/user_3Jebk1qbWpRhC07VOrvPmXEiz8E/hf_20261003_232838_f5cd8889-7db2-4257-9f3b-0f818f144f0a.png',
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
console.log('Prepared VCH individual reference-matched pieces and wallpapers locally');
