import type { Role, Settings } from './werewolf-engine';

/** Subjective estimates, not win probabilities. ROLE_POWER is the default-rule baseline. */
export const ROLE_POWER: Record<Role, number> = {
  madman: 1, villager: 1, muted: 1, celebrity: 3, sickman: 2, journalist: 3,
  mayor: 7, doctor: 8, seer: 10, chef: 7, templar: 6,
  necromancer: 8, bodyguard: 6, sheriff: 6, visitor: 2, psychic: 8,
  detective: 6, instigator: 6, intelligence: 5, police: 8,
  werewolf: 7, wolfpup: 4, strongwolf: 8, lonewolf: 6, rabidwolf: 10, hypnowolf: 6,
  jester: 4, serialkiller: 10, survivor: 5, raven: 8, whitewolf: 7,
  gambler: 5, mindflayer: 7, thief: 8, charmer: 8,
};

/** Estimated strength under the chosen rules; points never change the abilities themselves. */
export function rolePower(role: Role, s: Settings): number {
  let change=0;
  switch(role) {
    case 'seer': change=s.seerShowExactRole?0:-2; break;
    case 'doctor': change=(s.doctorSelfProtect?0:-1)+(s.doctorRepeatProtect?1:0); break;
    case 'mayor': change=(s.mayorDoubleVote?0:-1)+(s.firstNightSafe?0:1); break;
    case 'chef': change=s.chefNeutralsTogether?0:1; break;
    case 'templar': change=Math.min(2,s.templarUses-1); break;
    case 'necromancer': change=Math.min(2,s.necromancerUses-1); break;
    case 'sheriff': change=s.sheriffEveryNight?2:0; break;
    case 'bodyguard': change=s.bodyguardProtectAll?1:0; break;
    case 'visitor': change=(!s.visitorDangerousRoles?1:0)+(!s.visitorAttackedTarget?1:0); break;
    case 'psychic': change=s.psychicShowFriends?0:-1; break;
    case 'detective': change=s.detectiveShowNames?0:-2; break;
    case 'instigator': change=Math.max(-2,Math.min(2,s.instigatorMaxUses-2)); break;
    case 'journalist': change=s.journalistDrawing?0:-1; break;
    case 'intelligence': change=s.intelligenceInterval===1?2:Math.max(-2,2-s.intelligenceInterval); break;
    case 'police': change=(s.policeRepeatTarget?1:0)+(s.policeNotifyBlocked?0:-1); break;
    case 'celebrity': change=Math.max(-1,Math.min(2,s.celebrityAudience-1)); break;
    case 'sickman': change=(s.sickStartingNights<=1?-1:s.sickStartingNights>=5?1:0)+(s.sickDoctorBonus>=4?1:s.sickDoctorBonus===0?-1:0); break;
    case 'lonewolf': change=1-Math.min(3,s.loneWolfInterval)+(s.rabidCanInfect?0:-1); break;
    case 'werewolf': change=s.wolfRandomTies?1:0; break;
    case 'wolfpup': change=(s.rabidCanInfect?0:-1)+(s.wolfRandomTies?1:0); break;
    case 'rabidwolf': change=(s.rabidCanInfect?0:-2)+(s.wolfRandomTies?1:0); break;
    case 'hypnowolf': change=(s.hypnoMaxUses===0?4:Math.max(0,Math.min(4,s.hypnoMaxUses-1)))+(s.hypnoDuration===0?0:-Math.max(1,6-s.hypnoDuration)); break;
    case 'survivor': change=Math.max(-2,Math.min(2,s.survivorShieldCount-3))+(s.firstNightSafe?0:1); break;
    case 'raven': change=s.ravenReflectAttackers?0:-2; break;
    case 'whitewolf': change=(s.whiteWolfBetrayPack?0:-1)+(s.wolfRandomTies?1:0)+(s.firstNightSafe?0:1); break;
    case 'gambler': change=(s.gamblerPredictions===1?1:s.gamblerPredictions>=3?-1:0)+(s.gamblerBetProtection?0:-1); break;
    case 'mindflayer': change=Math.max(-2,Math.min(2,s.mindStartingParasites-3))+(s.mindRegenPercent>=75?2:s.mindRegenPercent>=40?1:s.mindRegenPercent===0?-1:0); break;
    case 'serialkiller': change=1-Math.min(3,s.serialKillerInterval); break;
    case 'thief': change=1-Math.min(3,s.thiefAttackInterval); break;
    case 'charmer': change=1-Math.min(3,s.charmerFirstNight)+(s.charmerMessages?1:0); break;
  }
  // First-night safety affects attack roles, not non-lethal first-night infection.
  if (!s.firstNightSafe && ['werewolf','strongwolf','lonewolf','serialkiller','thief','sheriff','templar'].includes(role)) change++;
  return Math.max(1,Math.min(10,ROLE_POWER[role]+change));
}
