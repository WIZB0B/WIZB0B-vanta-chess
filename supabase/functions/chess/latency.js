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
