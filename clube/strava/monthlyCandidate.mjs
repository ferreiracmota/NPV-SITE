// Cálculo isolado NPV — SEM uso da API do Strava, sem gravação e sem crédito real.
// A finalidade é validar regras com dados simulados, até revisão da política e autorização expressa.
export function summarizeCandidateMonth(activities, {year, month, pointsPerKm, eligibleSportTypes, memberOfNpvClub} = {}) {
  if (!Array.isArray(activities)) throw new TypeError('activities must be an array');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new TypeError('invalid year');
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new TypeError('invalid month');
  if (!Number.isFinite(pointsPerKm) || pointsPerKm < 0 || pointsPerKm > 100000) throw new TypeError('invalid pointsPerKm');
  if (!Array.isArray(eligibleSportTypes) || eligibleSportTypes.length === 0 || eligibleSportTypes.some(s => typeof s !== 'string' || !s.trim())) throw new TypeError('eligibleSportTypes required');
  const period = `${year}-${String(month).padStart(2, '0')}`;
  if (memberOfNpvClub !== true) return {period, eligibleActivities: 0, totalKm: 0, candidatePoints: 0, status: 'club_not_verified'};
  const accepted = new Set(eligibleSportTypes);
  const seen = new Set();
  let totalMeters = 0;
  let eligibleActivities = 0;
  for (const activity of activities) {
    if (!activity || (typeof activity.id !== 'number' && typeof activity.id !== 'string')) continue;
    const activityId = String(activity.id);
    if (!activityId || seen.has(activityId)) continue;
    seen.add(activityId);
    if (activity.manual === true) continue;
    if (typeof activity.start_date_local !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(activity.start_date_local)) continue;
    if (activity.start_date_local.slice(0, 7) !== period) continue;
    if (!accepted.has(activity.sport_type)) continue;
    if (typeof activity.distance !== 'number' || !Number.isFinite(activity.distance) || activity.distance <= 0) continue;
    totalMeters += activity.distance;
    eligibleActivities += 1;
  }
  // Piso aplicado uma só vez ao total mensal, não a cada atividade.
  const totalKm = Math.round((totalMeters / 1000) * 100) / 100;
  const candidatePoints = Math.floor((totalMeters / 1000) * pointsPerKm + 1e-9);
  return {period, eligibleActivities, totalKm, candidatePoints, status: 'simulation_only'};
}
