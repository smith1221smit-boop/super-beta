import type { RawPlayerInfo } from '../../../dashboard/localPcobManager';

// Fields sourced from the local PCOB feed once it's connected and fresh.
// killNum is deliberately excluded: PCOB re-asserts killNum on every tick
// with no memory of an operator's manual +/-1 correction
// (matchDataController.tsx's kill buttons), so sourcing it locally would
// make that correction visibly revert within one local tick (~2s). Keeping
// it remote-only avoids that regression; every other vitals field has no
// such manual-override path.
const LOCAL_VITALS_FIELDS = ['health', 'liveState', 'bHasDied', 'isFiring', 'isOutsideBlueCircle'] as const;

// Pure, unit-testable merge: overlays local-PCOB vitals onto the
// remote/bootstrap-sourced matchData, matched by uId. Team metadata,
// points/rank, and everything not in LOCAL_VITALS_FIELDS always comes from
// remoteMatchData untouched. A player with no local entry yet (or one whose
// uId doesn't appear in this match's roster) simply keeps its remote value.
export function mergeLocalVitals(
  remoteMatchData: any,
  localVitalsByUid: Map<string, RawPlayerInfo>
): any {
  if (!remoteMatchData || localVitalsByUid.size === 0) return remoteMatchData;

  return {
    ...remoteMatchData,
    teams: (remoteMatchData.teams || []).map((team: any) => {
      if (!Array.isArray(team.players) || team.players.length === 0) return team;

      let teamChanged = false;
      const players = team.players.map((player: any) => {
        const key = player.uId !== undefined ? String(player.uId) : undefined;
        const local = key ? localVitalsByUid.get(key) : undefined;
        if (!local) return player;

        const patch: Record<string, any> = {};
        for (const field of LOCAL_VITALS_FIELDS) {
          if (local[field] !== undefined) patch[field] = local[field];
        }
        if (Object.keys(patch).length === 0) return player;

        teamChanged = true;
        return { ...player, ...patch };
      });

      return teamChanged ? { ...team, players } : team;
    }),
  };
}
