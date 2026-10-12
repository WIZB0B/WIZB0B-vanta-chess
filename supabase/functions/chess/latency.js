export const MAX_NETWORK_COMPENSATION_MS=300;

function asTime(value){
  if(typeof value==='number'&&Number.isFinite(value))return value;
  const parsed=Date.parse(String(value||''));
  return Number.isFinite(parsed)?parsed:NaN;
}

export function calculateMoveTiming({clientMoveAt,lastMoveAt,serverReceivedAt=Date.now()}={}){
  const serverMs=asTime(serverReceivedAt);
  const receivedMs=Number.isFinite(serverMs)?serverMs:Date.now();
  const clientMs=asTime(clientMoveAt);
  const lastMs=asTime(lastMoveAt);
  const rawTransit=Number.isFinite(clientMs)?receivedMs-clientMs:0;
  const networkCompensationMs=Math.round(Math.max(0,Math.min(MAX_NETWORK_COMPENSATION_MS,rawTransit)));
  const elapsedMs=Number.isFinite(lastMs)?Math.max(0,receivedMs-lastMs):0;
  const chargedElapsedMs=Math.max(0,elapsedMs-networkCompensationMs);
  return {
    clientMoveAt:Number.isFinite(clientMs)?new Date(clientMs).toISOString():null,
    serverReceivedAt:new Date(receivedMs).toISOString(),
    networkCompensationMs,
    elapsedMs,
    chargedElapsedMs,
    serverReceivedMs:receivedMs,
  };
}

// Lag compensation has a budget per player per game (security review M2): the client's own
// timestamp can claim up to MAX_NETWORK_COMPENSATION_MS a move, but no more than 5% of the
// starting clock in total (between 1 and 5 seconds). Past the budget, moves are charged in full.
export const LAG_QUOTA_SHARE=0.05,LAG_QUOTA_MIN_MS=1000,LAG_QUOTA_MAX_MS=5000;
export function lagQuotaMs(baseMs){return Math.round(Math.max(LAG_QUOTA_MIN_MS,Math.min(LAG_QUOTA_MAX_MS,Number(baseMs||0)*LAG_QUOTA_SHARE)))}
// Compensation already given to `color` in this game (stored on each move).
export function lagUsed(history,color){return (Array.isArray(history)?history:[]).reduce((sum,m)=>sum+(m?.color===color?Math.max(0,Number(m?.network_compensation_ms)||0):0),0)}
export function applyLagQuota(timing,used,baseMs){
  const left=Math.max(0,lagQuotaMs(baseMs)-Math.max(0,Number(used)||0));
  if(timing.networkCompensationMs<=left)return timing;
  return {...timing,networkCompensationMs:left,chargedElapsedMs:Math.max(0,timing.elapsedMs-left)};
}
