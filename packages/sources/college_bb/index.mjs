export async function refresh({ asOf, dataDir }) { 
  console.log("⚾ College Baseball: Ready");
  return { teams: 100, metadata: { league: "college_bb", asOf } };
}
