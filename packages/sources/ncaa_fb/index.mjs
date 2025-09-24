export async function refresh({ asOf, dataDir }) { 
  console.log("🏈 NCAA Football: Ready");
  return { teams: 130, metadata: { league: "ncaa_fb", asOf } };
}
