import { MISSIONS, createCampaign, getCurrentMission, getCurrentObjective } from './missions.js';

const missionIndex = id => MISSIONS.findIndex(mission => mission.id === id);
const sameList = (a, b) => a.length === b.length && a.every((id, index) => id === b[index]);

/**
 * Read an objective checkpoint, not a character profile or a live combat save.
 * The completed list must match campaign order; a single mission has no prior
 * campaign missions. Returned arrays are detached from caller-owned data.
 */
export function parseCheckpoint(raw) {
  let data = raw;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return null; }
  }
  if (!data || typeof data !== 'object' || Array.isArray(data) || data.version !== 1 || data.finished === true) return null;
  const index = missionIndex(data.missionId);
  if (index < 0 || typeof data.objectiveId !== 'string') return null;
  const mission = MISSIONS[index];
  if (!mission.objectives.some(objective => objective.id === data.objectiveId)) return null;
  if (data.selectedMissionId !== null && data.selectedMissionId !== mission.id) return null;
  if (!Array.isArray(data.completedMissionIds)) return null;
  const expectedCompleted = data.selectedMissionId === null ? MISSIONS.slice(0, index).map(mission => mission.id) : [];
  if (!sameList(data.completedMissionIds, expectedCompleted)) return null;
  return {
    version: 1,
    selectedMissionId: data.selectedMissionId,
    missionId: mission.id,
    objectiveId: data.objectiveId,
    completedMissionIds: [...expectedCompleted],
  };
}

/** Capture the current objective. Finished and invalid campaigns have no checkpoint. */
export function makeCheckpoint(campaign) {
  if (!campaign || typeof campaign !== 'object' || campaign.finished !== false
      || !Number.isInteger(campaign.currentMissionIndex) || !Number.isInteger(campaign.objectiveIndex)) return null;
  const mission = getCurrentMission(campaign), objective = getCurrentObjective(campaign);
  if (!mission || !objective) return null;
  return parseCheckpoint({
    version: 1,
    selectedMissionId: campaign.missionId,
    missionId: mission.id,
    objectiveId: objective.id,
    completedMissionIds: campaign.completedMissionIds,
  });
}

/** Rebuild only mission progress; health, guards, XP, and armors remain the caller's responsibility. */
export function restoreCheckpoint(raw) {
  const checkpoint = parseCheckpoint(raw);
  if (!checkpoint) return null;
  const campaign = createCampaign({ missionId: checkpoint.selectedMissionId });
  campaign.currentMissionIndex = missionIndex(checkpoint.missionId);
  campaign.objectiveIndex = MISSIONS[campaign.currentMissionIndex].objectives.findIndex(objective => objective.id === checkpoint.objectiveId);
  campaign.completedMissionIds = [...checkpoint.completedMissionIds];
  for (const id of checkpoint.completedMissionIds) {
    campaign.objectiveCounts[id] = MISSIONS.find(mission => mission.id === id).objectives.length;
  }
  campaign.objectiveCounts[checkpoint.missionId] = campaign.objectiveIndex;
  return campaign;
}
