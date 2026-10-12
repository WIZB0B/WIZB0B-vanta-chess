// Returns only the visitor's country code (from Netlify's edge location data), e.g.
// {"country":"US"}. The page calls it only after the player chooses "Detect my country";
// nothing is stored here and the IP address never leaves Netlify.
export default async (_request,context)=>new Response(JSON.stringify({country:context?.geo?.country?.code||null}),{
  headers:{'content-type':'application/json','cache-control':'no-store, private'},
});
export const config={path:'/api/geo'};
