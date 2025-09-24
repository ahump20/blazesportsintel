export async function refresh({ asOf, dataDir }) { 
  console.log("🏈 Texas HS Football: Ready");
  return { teams: 6, metadata: { league: "tx_hs_fb", asOf } };
}
