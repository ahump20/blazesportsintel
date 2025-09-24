export async function refresh({ asOf, dataDir }) { 
  console.log("⚾ Perfect Game TX: Ready");
  return { teams: 20, metadata: { league: "pg_tx", asOf } };
}
