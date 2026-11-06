import RevealSoundNotice from './RevealSoundNotice';
import {CARD_REVEAL_PREFERENCES_KEY,normalizeCardRevealPreferences} from './card-reveal-preferences';
import {freshMatchProgress} from './replay-match';
import {freshPerformance,addPerformance,scoreNight,scoreVote,scoreInheritance,scorePredictions,type MatchPerformance} from './match-performance';
import {RANDOM_DEFAULTS_KEY,randomSetupPreferences,persistSetupPreferences} from './random-default-preferences';
import HoldButton from './HoldButton';
import {normalizeDiscussionMinutes} from './discussion-settings';
import {useMatchRecovery,useMatchState,useMatchRef,useRecoveryCommit} from './use-match-recovery';
import {RecoveryGate,RecoveryOptions,RecoveryStatus} from './RecoveryControls';
import OfflineNotice from './OfflineNotice';
import TurnHelp from './TurnHelp';
import SetupSettings from './SetupSettings';
import { HowToPlay,  RandomPickHelp } from './SetupHelp';
import './setup-guidance.css';
import { useFixedFooterSpace } from './use-fixed-footer-space';
import RoleRulebook from './RoleRulebook';
import {PackChoiceOverlay, PackChoices} from './PackTargeting';
import {TargetPortrait,RoleTargetMarker} from './TargetPortrait';
import PrivateInfo, { type PrivateInfoData } from './PrivateInfo';
import RoleCard from './RoleCard';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, Play, Settings as SettingsIcon, Shield, Timer, Moon, Sword } from 'lucide-react';
import { roles, turnRoleDescription, deal, resolveRandomRoles, tally, winner, resolveNight, resolveMutes, visitorsTo, expireThiefWatches, chooseThiefWatches, inheritThiefWatches, applyIllness, seerReading, applyInfections, settleGamblerBets, settleGamblerNightBets, resolveGamblerEscapes, collectGamblerDebts, mindFlayerWinner, regenerateParasite, intelligenceReport, applyThefts, canDetain, resolveDetentions, advanceHypnosis, canChefAct, celebrityReveals, limitedCelebrityReveals, disguiseMadmanCards, teamOfPlayer, sameTeamForChef, shuffle, strongWolfAttackAvailable, loneWolfAttackSucceeds, knownPlayerPackmates, packIdentity, canWolfTarget, type NightTrace, type Player, type Role, type Settings, type WinningSide, type Visit } from './werewolf-engine';
import PlayerSetup, { Avatar, readAvatars } from './PlayerSetup';
import JournalistEditor, { type Newspaper } from './JournalistEditor';
import RoleDetails from './RoleDetails';
import RandomRoleDetails from './RandomRoleDetails';
import { balancedDistribution, randomPowerWeight, type DistributionMode } from './distribution';
import { VoteResult, MatchResults } from './MatchResults';
import { MayorAbility, AssemblyAnnouncement } from './MayorAbility';
import { rolePower } from './role-power';
import { CELEBRITY_SKIN_KEY, validCelebritySkin, CHARMER_SKIN_KEY, validCharmerSkin, rolePicture, type CelebritySkin, type CharmerSkin } from './role-skins';
import { recordRankedMatch, winningPlayers } from './rankings';
import {winningHeadline} from './match-headline';
import { useGameFeedback } from './interaction-feedback';
import FeedbackSettings from './FeedbackSettings';
import { FEEDBACK_PREFERENCES_KEY, normalizeFeedbackPreferences } from './feedback-preferences';
import { MOTION_PREFERENCES_KEY, normalizeMotionPreference } from './motion-preferences';
import './werewolf.css';
import './motion.css';
import './accessibility.css';
import './gameplay-accessibility.css';

type Screen = 'home'|'rules'|'players'|'roles'|'nightIntro'|'pass'|'action'|'privateResult'|'morning'|'discussion'|'vote'|'voteResult'|'end'|'recovery';
const roleOrder: Role[] = ['werewolf','villager','madman','doctor','seer','chef','mayor','templar','muted','jester','necromancer','bodyguard','sheriff','serialkiller','survivor','visitor','psychic','celebrity','detective','instigator','strongwolf','sickman','lonewolf','wolfpup','journalist','raven','rabidwolf','whitewolf','gambler','mindflayer','intelligence','thief','police','hypnowolf','charmer'];
const roleTeams = ['village','wolf','neutral'] as const;
const displayRoleOrder = roleTeams.flatMap(team=>roleOrder.filter(role=>roles[role].team===team));
const emptyRoleCounts = (): Record<Role,number> => Object.fromEntries((Object.keys(roles) as Role[]).map(role=>[role,0])) as Record<Role,number>;
const passiveRoles: Role[] = ['villager','jester','celebrity','sickman'];
function read<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function save(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private browsing */ } }
export default function Werewolf() {
  const recovery=useMatchRecovery();
  const [screen,setScreen] = useMatchState<Screen>(recovery,'screen','home');
  const setupFooter=useRef<HTMLDivElement>(null);
  useFixedFooterSpace(setupFooter,screen==='roles');
  const morningFooter=useRef<HTMLDivElement>(null);
  useFixedFooterSpace(morningFooter,screen==='morning');
  const [roleBookOpen,setRoleBookOpen] = useState(false);
  const [detailRole,setDetailRole] = useState<Role | null>(null);
  const [distributionOpen,setDistributionOpen] = useState(false);
  const [detailRandom,setDetailRandom] = useState<'village'|'wolf'|'neutral' | null>(null);
  const [names,setNames] = useMatchState<string[]>(recovery,'names',() => read('werewolf.names', []));
  const [avatars,setAvatars] = useMatchState(recovery,'avatars',readAvatars);
  const [counts,setCounts] = useMatchState<Record<Role,number>>(recovery,'counts',emptyRoleCounts);
  const [randomCounts,setRandomCounts] = useMatchState(recovery,'randomCounts',{village:0,wolf:0,neutral:0});
  const [settings,setSettings] = useMatchState<Settings>(recovery,'settings',() => {const stored=randomSetupPreferences(read('werewolf.settings', {}),read(RANDOM_DEFAULTS_KEY,0));return {...stored,discussionMinutes:normalizeDiscussionMinutes(stored.discussionMinutes),manualDiscussionControls:stored.manualDiscussionControls!==false};});
  const [celebritySkin,setCelebritySkin] = useState<CelebritySkin>(() => validCelebritySkin(read(CELEBRITY_SKIN_KEY, 'default')));
  const [charmerSkin,setCharmerSkin] = useState<CharmerSkin>(() => validCharmerSkin(read(CHARMER_SKIN_KEY, 'default')));
  const [feedbackPreferences,setFeedbackPreferences] = useState(()=>normalizeFeedbackPreferences(read(FEEDBACK_PREFERENCES_KEY, {})));
  const [cardRevealPreferences,setCardRevealPreferences] = useState(()=>normalizeCardRevealPreferences(read(CARD_REVEAL_PREFERENCES_KEY,{}),settings.buttonSounds));
  const [feedbackOpen,setFeedbackOpen] = useState(false);
  const [motionPreference,setMotionPreference] = useState(()=>normalizeMotionPreference(read(MOTION_PREFERENCES_KEY,'system')));
  const disabledRandomRoles = Array.isArray(settings.disabledRandomRoles) ? settings.disabledRandomRoles : [];
  const toggleRandomRole = (role: Role) => setSettings(s=>{const old=Array.isArray(s.disabledRandomRoles)?s.disabledRandomRoles:[];return {...s,disabledRandomRoles:old.includes(role)?old.filter(r=>r!==role):[...old,role]};});
  const picture = (role: Role) => rolePicture(role, celebritySkin, charmerSkin);
  const [players,setPlayers] = useMatchState<Player[]>(recovery,'players',[]);
  // Stable dealt lineup: dead/blocked roles must not disappear from descriptions.
  const descriptionRoles = useMatchRef<Role[]>(recovery,'descriptionRoles',[]);
  const [round,setRound] = useMatchState(recovery,'round',1);
  const [queue,setQueue] = useMatchState<number[]>(recovery,'queue',[]);
  const [index,setIndex] = useMatchState(recovery,'index',0);
  const [selected,setSelected] = useMatchState<number[]>(recovery,'selected',[]);
  const [privateInfo,setPrivateInfo] = useMatchState<PrivateInfoData | null>(recovery,'privateInfo',null);
  const [turnInfo,setTurnInfo] = useMatchState<PrivateInfoData[]>(recovery,'turnInfo',[]);
  const seenPrivateEvents = useMatchRef<Set<string>>(recovery,'seenPrivateEvents',new Set());
  const [morningMuted,setMorningMuted] = useMatchState<number[]>(recovery,'morningMuted',[]);
  const muteAttempts = useMatchRef<Visit[]>(recovery,'muteAttempts',[]);
  const [morningBlocked,setMorningBlocked] = useMatchState<Player[]>(recovery,'morningBlocked',[]);
  const [enraged,setEnraged] = useMatchState(recovery,'enraged',false);
  const [enragedNext,setEnragedNext] = useMatchState(recovery,'enragedNext',false);
  const curses = useMatchRef<Record<number,number[]>>(recovery,'curses',{});
  const triggeredCurses = useMatchRef<number[]>(recovery,'triggeredCurses',[]);
  const mindParasites = useMatchRef<Record<number,number[]>>(recovery,'mindParasites',{});
  const [parasiteStock,setParasiteStock] = useMatchState<Record<number,number>>(recovery,'parasiteStock',{});
  const [mindWinner,setMindWinner] = useMatchState(recovery,'mindWinner','');
  const lovers = useMatchRef<Record<number,number>>(recovery,'lovers',{});
  const friendInitiators = useMatchRef<Set<number>>(recovery,'friendInitiators',new Set());
  const friendInbox = useMatchRef<{from:number;to:number;text:string;deliver:number;replyAllowed:boolean}[]>(recovery,'friendInbox',[]);
  const friendOutbox = useMatchRef<{from:number;to:number;text:string;replyAllowed:boolean}[]>(recovery,'friendOutbox',[]);
  const [friendDraft,setFriendDraft] = useMatchState(recovery,'friendDraft','');
  const [friendSent,setFriendSent] = useMatchState(recovery,'friendSent',false);
  const friendMessagesSent = useMatchRef<Set<number>>(recovery,'friendMessagesSent',new Set());
  const fakeDoctorSaves = useMatchRef<Record<number,number>>(recovery,'fakeDoctorSaves',{});
  const policeTargets = useMatchRef<Record<number,number>>(recovery,'policeTargets',{});
  const detectiveAttempts = useMatchRef<Visit[]>(recovery,'detectiveAttempts',[]);
  const provocationAttempts = useMatchRef<Visit[]>(recovery,'provocationAttempts',[]);
  const revivalAttempts = useMatchRef<Visit[]>(recovery,'revivalAttempts',[]);
  const mayorAttempts = useMatchRef<number[]>(recovery,'mayorAttempts',[]);
  const fakeMayorAttempts = useMatchRef<number[]>(recovery,'fakeMayorAttempts',[]);
  const parasiteAttempts = useMatchRef<Visit[]>(recovery,'parasiteAttempts',[]);
  const parasiteRegens = useMatchRef<{actor:number; amount:number}[]>(recovery,'parasiteRegens',[]);
  const curseAttempts = useMatchRef<Visit[]>(recovery,'curseAttempts',[]);
  const loverAttempts = useMatchRef<Visit[]>(recovery,'loverAttempts',[]);
  const newspaperAttempts = useMatchRef<{actor:number; paper:Newspaper}[]>(recovery,'newspaperAttempts',[]);
  const pendingReports = useMatchRef<Record<number,PrivateInfoData>>(recovery,'pendingReports',{});
  const [privateReports,setPrivateReports] = useMatchState<Record<number,PrivateInfoData>>(recovery,'privateReports',{});
  const nextFame = useMatchRef<Record<number,string[]>>(recovery,'nextFame',{});
  const policeChoices = useMatchRef<Record<number,number>>(recovery,'policeChoices',{});
  const [lastDetentions,setLastDetentions] = useMatchState<Record<number,number>>(recovery,'lastDetentions',{});
  const hypnosis = useMatchRef<Visit[]>(recovery,'hypnosis',[]);
  const hypnosisExpiry = useMatchRef<Record<number,number|null>>(recovery,'hypnosisExpiry',{});
  const [hypnoUsed,setHypnoUsed] = useMatchState<number[]>(recovery,'hypnoUsed',[]);
  const [corrupted,setCorrupted] = useMatchState<number[]>(recovery,'corrupted',[]);
  const [madmen,setMadmen] = useMatchState<number[]>(recovery,'madmen',[]);
  const [failedMayors,setFailedMayors] = useMatchState<number[]>(recovery,'failedMayors',[]);
  const thefts = useMatchRef<Visit[]>(recovery,'thefts',[]);
  const [stolenRoles,setStolenRoles] = useMatchState<Record<number,Role>>(recovery,'stolenRoles',{});
  const infections = useMatchRef<Visit[]>(recovery,'infections',[]);
  const gamblerBets = useMatchRef<Visit[]>(recovery,'gamblerBets',[]);
  const [gamblerCorrect,setGamblerCorrect] = useMatchState<Record<number,number>>(recovery,'gamblerCorrect',{});
  const [gamblerDebts,setGamblerDebts] = useMatchState<number[]>(recovery,'gamblerDebts',[]);
  const [gamblerReady,setGamblerReady] = useMatchState<number[]>(recovery,'gamblerReady',[]);
  const [nightEscapes,setNightEscapes] = useMatchState<string[]>(recovery,'nightEscapes',[]);
  const [converted,setConverted] = useMatchState<number[]>(recovery,'converted',[]);
  const wolfBallots = useMatchRef<{actor:number;target:number}[]>(recovery,'wolfBallots',[]);
  const [wolfVotes,setWolfVotes] = useMatchState<number[]>(recovery,'wolfVotes',[]);
  const [saves,setSaves] = useMatchState<number[]>(recovery,'saves',[]);
  const [lastSaves,setLastSaves] = useMatchState<Record<number,number>>(recovery,'lastSaves',{});
  const [currentSaves,setCurrentSaves] = useMatchState<Record<number,number>>(recovery,'currentSaves',{});
  const [mayors,setMayors] = useMatchState<number[]>(recovery,'mayors',[]);
  const [assembly,setAssembly] = useMatchState(recovery,'assembly',false);
  const [assemblyNames,setAssemblyNames] = useMatchState<string[]>(recovery,'assemblyNames',[]);
  const [assemblyAnnouncementOpen,setAssemblyAnnouncementOpen] = useMatchState(recovery,'assemblyAnnouncementOpen',false);
  const [templeUsed,setTempleUsed] = useMatchState<number[]>(recovery,'templeUsed',[]);
  const [guards,setGuards] = useMatchState<{actor:number;target:number}[]>(recovery,'guards',[]);
  const [bullets,setBullets] = useMatchState<{actor:number;target:number}[]>(recovery,'bullets',[]);
  const [sheriffUsed,setSheriffUsed] = useMatchState<number[]>(recovery,'sheriffUsed',[]);
  const nightVisits = useMatchRef<Visit[]>(recovery,'nightVisits',[]);
  const [previousVisits,setPreviousVisits] = useMatchState<Visit[]>(recovery,'previousVisits',[]);
  const [watchTargets,setWatchTargets] = useMatchState<Record<number,number>>(recovery,'watchTargets',{});
  const [provocations,setProvocations] = useMatchState<number[]>(recovery,'provocations',[]);
  const [instigatorUses,setInstigatorUses] = useMatchState<Record<number,number>>(recovery,'instigatorUses',{});
  const [celebrityFameUsed,setCelebrityFameUsed] = useMatchState<Record<number,number>>(recovery,'celebrityFameUsed',{});
  const [fame,setFame] = useMatchState<Record<number,string[]>>(recovery,'fame',{});
  const [sickLife,setSickLife] = useMatchState<Record<number,number>>(recovery,'sickLife',{});
  const [lone,setLone] = useMatchState<{actor:number;target:number}[]>(recovery,'lone',[]);
  const [strong,setStrong] = useMatchState<{actor:number;target:number}[]>(recovery,'strong',[]);
  const [serials,setSerials] = useMatchState<{actor:number;target:number}[]>(recovery,'serials',[]);
  const [visitors,setVisitors] = useMatchState<{actor:number;target:number}[]>(recovery,'visitors',[]);
  const [shields,setShields] = useMatchState<number[]>(recovery,'shields',[]);
  const [shieldUses,setShieldUses] = useMatchState<Record<number,number>>(recovery,'shieldUses',{});
  const [shots,setShots] = useMatchState<{actor:number;target:number}[]>(recovery,'shots',[]);
  const [newspapers,setNewspapers] = useMatchState<Newspaper[]>(recovery,'newspapers',[]);
  const [deaths,setDeaths] = useMatchState<Player[]>(recovery,'deaths',[]);
  const [ballots,setBallots] = useMatchState<(number|null)[]>(recovery,'ballots',[]);
  const [result,setResult] = useMatchState(recovery,'result','');
  const [won,setWon] = useMatchState<WinningSide|null>(recovery,'won',null);
  const [jesterWinner,setJesterWinner] = useMatchState(recovery,'jesterWinner','');
  const [revivals,setRevivals] = useMatchState<number[]>(recovery,'revivals',[]);
  const [revived,setRevived] = useMatchState<Player[]>(recovery,'revived',[]);
  const [necromancerUsed,setNecromancerUsed] = useMatchState<number[]>(recovery,'necromancerUsed',[]);
  const [seconds,setSeconds] = useMatchState(recovery,'seconds',60);
  const discussionDeadline = useMatchRef(recovery,'discussionDeadline',0);
  const performance=useMatchRef<MatchPerformance>(recovery,'performance',freshPerformance(false,true));
  const [rankingStatus,setRankingStatus] = useState('idle');
  const rankingRecorded = useMatchRef(recovery,'rankingRecorded',false);
  const [rankingError,setRankingError] = useMatchState(recovery,'rankingError',false);
  // Pass only already-public facts to audio; never an active role/action or secret result.
  const audioScreen=recovery.view.stage!==null?'recovery':screen==='morning'&&assemblyAnnouncementOpen?'announcement':screen;
  // Public round only: preserve the device preference, but never play/wait after Night 1.
  const [votedOutPreferences,setVotedOutPreferences]=useState(()=>normalizeCardRevealPreferences(read('werewolf.voted-out.v1',{}),cardRevealPreferences.enabled||settings.buttonSounds));
  useEffect(()=>{save('werewolf.voted-out.v1',votedOutPreferences);},[votedOutPreferences]);
  const [gameEndPreferences,setGameEndPreferences]=useState(()=>normalizeCardRevealPreferences(read('werewolf.game-end.v1',{}),votedOutPreferences.enabled||cardRevealPreferences.enabled||settings.buttonSounds));
  useEffect(()=>{save('werewolf.game-end.v1',gameEndPreferences);},[gameEndPreferences]);
  const [morningDeathPreferences,setMorningDeathPreferences]=useState(()=>normalizeCardRevealPreferences(read('werewolf.morning-death.v1',{}),gameEndPreferences.enabled||votedOutPreferences.enabled||cardRevealPreferences.enabled||settings.buttonSounds));
  useEffect(()=>{save('werewolf.morning-death.v1',morningDeathPreferences);},[morningDeathPreferences]);
  const firstNightRevealSounds=round===1&&cardRevealPreferences.enabled;
  const audioScene={key:`${audioScreen}:${round}:${index}`,screen:audioScreen,side:screen==='end'?won:null,hasDeaths:audioScreen==='morning'&&deaths.length>0,hasVictim:screen==='voteResult'&&tally(ballots)!==null,hasMvp:screen==='end'&&players.length>0,seconds:screen==='discussion'?seconds:0};
  const feedback=useGameFeedback({...feedbackPreferences,sounds:settings.sounds,buttonSounds:settings.buttonSounds,haptics:settings.haptics,scene:audioScene,privateInteraction:['pass','action','privateResult','vote'].includes(screen),sceneKey:audioScene.key,reveal:{...cardRevealPreferences,enabled:firstNightRevealSounds&&!feedbackOpen&&recovery.view.stage===null},morningDeath:{...morningDeathPreferences,enabled:morningDeathPreferences.enabled&&!feedbackOpen&&recovery.view.stage===null},gameEnd:{...gameEndPreferences,enabled:gameEndPreferences.enabled&&!feedbackOpen&&recovery.view.stage===null},votedOut:{...votedOutPreferences,enabled:votedOutPreferences.enabled&&!feedbackOpen&&recovery.view.stage===null},revealTurnKey:`${round}:${index}`});
  // A queued cross-tab write must never mark a later match as recorded.
  const rankingInFlight=useRef<symbol|null>(null);
  useEffect(() => {
    if(screen==='end' && rankingRecorded.current){setRankingStatus('saved');return;}
    if (screen !== 'end' || !won || rankingRecorded.current || rankingInFlight.current) return;
    const token=Symbol(),credit=recovery.credit(),matchId=recovery.id;
    const winners=winningPlayers(players,won,lovers.current,jesterWinner,mindWinner);
    let current=true;rankingInFlight.current=token;setRankingStatus('saving');
    const commit=()=>{
      try {
        recordRankedMatch(localStorage,players,winners,credit);
        if(current){rankingRecorded.current=true;setRankingError(false);setRankingStatus('saved');}
        if(matchId)recovery.finish(matchId);
      } catch { if(current){setRankingError(true);setRankingStatus('error');} }
      finally { if(rankingInFlight.current===token)rankingInFlight.current=null; }
    };
    if(window.navigator.locks?.request)void window.navigator.locks.request('werewolf.rankings-write',commit).catch(()=>{if(rankingInFlight.current===token)rankingInFlight.current=null;if(current){setRankingError(true);setRankingStatus('error');}});
    else commit();
    return()=>{current=false;if(rankingInFlight.current===token)rankingInFlight.current=null;};
  }, [screen,won,players,jesterWinner,mindWinner,recovery.view.scoreRetry]);
  // Each private turn starts at the top even if the previous player scrolled.
  useLayoutEffect(() => {
    window.scrollTo({top:0,behavior:'instant'});
    // Neutral, non-actionable focus: held Enter must never reveal the next card.
    const selector=screen==='pass'?'.player-pass h2':screen==='vote'?'.voter-heading h2':null;
    if(selector)document.querySelector<HTMLElement>(selector)?.focus({preventScroll:true});
  }, [screen,index]);
  useEffect(() => { save('werewolf.names',names); }, [names]);
  useEffect(() => { try {persistSetupPreferences(localStorage,settings);}catch{/* Storage-disabled play remains in memory. */} }, [settings]);
  useEffect(() => { save(FEEDBACK_PREFERENCES_KEY,feedbackPreferences); }, [feedbackPreferences]);
  useEffect(() => { save(CARD_REVEAL_PREFERENCES_KEY,cardRevealPreferences); }, [cardRevealPreferences]);
  useEffect(() => { save(MOTION_PREFERENCES_KEY,motionPreference); }, [motionPreference]);
  useEffect(() => { save(CELEBRITY_SKIN_KEY,celebritySkin); }, [celebritySkin]);
  useEffect(() => { save(CHARMER_SKIN_KEY,charmerSkin); }, [charmerSkin]);
  useEffect(() => {
    if (screen !== 'discussion') return;
    const update = () => {
      const remaining = Math.max(0,Math.ceil((discussionDeadline.current-Date.now())/1000));
      setSeconds(remaining);
      if (remaining === 0) {
        setQueue(players.filter(p => p.alive).map(p => p.id));
        setIndex(0); setBallots(provocations.filter(id=>players.some(p=>p.id===id&&p.alive)).flatMap(id=>[id,id])); setScreen('vote');
      }
    };
    update();
    const timer=setInterval(update,250);
    document.addEventListener('visibilitychange',update);
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange',update); };
  }, [screen,players,provocations]);
  const active = players.find(p => p.id === queue[index]);
  const safeFirstNight = round===1 && settings.firstNightSafe;
  const wolfVoteUnavailable = !!active && (active.role==='wolfpup' || active.role==='hypnowolf');
  const rabidInfectTurn = !!active && active.role==='rabidwolf' && settings.rabidCanInfect && (round===1 || enraged);
  const hypnoAvailable = !!active && active.role==='hypnowolf' && (settings.hypnoMaxUses===0 || hypnoUsed.filter(id=>id===active.id).length<settings.hypnoMaxUses);
  const rabidInactive = !!active && active.role==='rabidwolf' && round===1 && !settings.rabidCanInfect;
  const thiefDeathOnly = settings.thiefDeathOnly===true;
  const thiefWatchedPlayer = active?.role==='thief' && thiefDeathOnly ? players.find(p=>p.id===watchTargets[active.id] && p.alive && !p.escaped) : undefined;
  const thiefLocked = !!thiefWatchedPlayer && settings.thiefTargetMode==='persistent';
  const independentAttackInactive = !!active && ((active.role==='lonewolf' && round%settings.loneWolfInterval!==0) || (active.role==='serialkiller' && round%settings.serialKillerInterval!==0) || (active.role==='thief' && !thiefDeathOnly && round%settings.thiefAttackInterval!==0));
  const [passiveWaitUntil,setPassiveWaitUntil] = useMatchState(recovery,'passiveWaitUntil',0);
  const [passiveSeconds,setPassiveSeconds] = useMatchState(recovery,'passiveSeconds',0);
  useEffect(() => {
    const extra = active ? Number(settings.roleWaitSeconds?.[active.role]) || 0 : 0;
    const durations = [settings.allRolesWait ? Number(settings.allRolesWaitSeconds)||5 : 0, active && settings.passiveWait && passiveRoles.includes(active.role) ? Number(settings.passiveWaitSeconds)||5 : 0, Number.isFinite(extra) ? extra : 0];
    const duration = Math.max(0,Math.min(15,Math.floor(Math.max(...durations))));
    const restoredEnd=screen==='action'?recovery.consumeWait():null;
    if (screen !== 'action' || !active || duration === 0) { setPassiveWaitUntil(0); setPassiveSeconds(0); return; }
    const end = restoredEnd ?? Date.now() + duration*1000;
    setPassiveWaitUntil(end); setPassiveSeconds(Math.max(0,Math.ceil((end-Date.now())/1000)));
    const timer = setInterval(() => setPassiveSeconds(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250);
    return () => clearInterval(timer);
  }, [screen, active?.id, active?.role, settings.passiveWait, settings.passiveWaitSeconds, settings.allRolesWait, settings.allRolesWaitSeconds, settings.roleWaitSeconds]);
  const selectedCount = roleOrder.reduce((sum,r) => sum+counts[r],0) + randomCounts.village + randomCounts.wolf + randomCounts.neutral;
  const adjustRandom = (team: keyof typeof randomCounts, delta: number) => { setRandomCounts(current=>({...current,[team]:Math.max(0,Math.min(names.length,current[team]+delta))})); setResult(''); };
  const adjustRole = (role: Role, delta: number) => { setCounts(current=>({...current,[role]:Math.max(0,Math.min(names.length,current[role]+delta))})); setResult(''); };
  const changeSetting = <K extends keyof Settings,>(key: K, value: Settings[K]) => setSettings(s => ({...s,[key]:value}));
  function distributeRandomly(mode: DistributionMode) { try { const lineup=balancedDistribution(names.length,mode,0,settings.distributionFollowChances,settings.roleChances,Math.random,settings.distributionUniqueRoles,disabledRandomRoles,settings); setCounts(lineup); setRandomCounts({village:0,wolf:0,neutral:0}); setResult(''); } catch(e) { setResult((e as Error).message); } }
  function start():boolean {
    if(recovery.view.busy || rankingInFlight.current)return false;
    try {
      const resolved=resolveRandomRoles(counts,randomCounts,roleOrder,settings.randomFollowChances ? settings.roleChances : {},settings.randomUniqueRoles,Math.random,disabledRandomRoles,(role,resolved,remaining)=>randomPowerWeight(role,resolved,remaining,settings));
      const {players:p,madmen:chosenMadmen}=disguiseMadmanCards(deal(names,resolved));
      const fresh=freshMatchProgress(recovery.view.enabled);
      for(const [key,value] of Object.entries(fresh.state))recovery.setters[key](value);
      for(const [key,value] of Object.entries(fresh.refs))recovery.refs[key].current=value;
      recovery.begin();setRankingStatus('idle');setMadmen(chosenMadmen);setCorrupted(chosenMadmen);
      descriptionRoles.current=p.map(player=>player.role);setPlayers(p);
      setSickLife(Object.fromEntries(p.filter(x=>x.role==='sickman').map(x=>[x.id,settings.sickStartingNights])));
      beginNight(p,false,chosenMadmen,{});return true;
    }catch(e){setResult((e as Error).message);return false;}
  }
  async function startAgain(){
    if(!rankingRecorded.current || rankingInFlight.current || rankingError || recovery.view.busy)return;
    if(performance.current.recoveryEnabled){await recovery.enable();if(!recovery.view.enabled)return;}
    start();
  }
  function beginNight(p: Player[], rage = enragedNext, currentCorrupted = corrupted, currentFameUsed = celebrityFameUsed) { muteAttempts.current=[]; setMorningMuted([]); setEnraged(rage); setEnragedNext(false); setWatchTargets(previous=>expireThiefWatches(p,previous,thiefDeathOnly?settings.thiefTargetMode:'cycle')); nightVisits.current=[]; friendOutbox.current=[]; friendMessagesSent.current.clear(); setFriendSent(false); wolfBallots.current=[]; policeTargets.current={}; policeChoices.current={}; detectiveAttempts.current=[]; provocationAttempts.current=[]; revivalAttempts.current=[]; mayorAttempts.current=[]; fakeMayorAttempts.current=[]; parasiteAttempts.current=[]; parasiteRegens.current=[]; curseAttempts.current=[]; loverAttempts.current=[]; newspaperAttempts.current=[]; pendingReports.current={}; hypnosis.current=[]; fakeDoctorSaves.current={}; thefts.current=[]; infections.current=[]; gamblerBets.current=[]; triggeredCurses.current=[]; setProvocations([]); if(settings.celebrityFameNights===1 || settings.celebrityFameNights===2){
      const pending=nextFame.current;
      if(p.some(x=>x.alive && x.role==='police'))setFame(pending);
      else {
        // A Police death must not discard already-earned delayed fame. Avoid two fame assignments in one delivery night.
        const pendingNames=Object.values(pending).flat();
        const deferred=p.filter(x=>x.role==='celebrity' && pendingNames.includes(x.name)).map(x=>x.id);
        const generated=limitedCelebrityReveals(p,deferred,currentCorrupted,Math.random,settings.celebrityAudience,settings.celebrityFameNights,currentFameUsed);
        const combined={...generated.fame};for(const [id,names]of Object.entries(pending))combined[Number(id)]=[...(combined[Number(id)]||[]),...names];
        setFame(combined);setCelebrityFameUsed(generated.used);
      }
    }else setFame(p.some(x=>x.alive && x.role==='police') ? nextFame.current : celebrityReveals(p,[],currentCorrupted,Math.random,settings.celebrityAudience)); nextFame.current={}; setQueue(p.filter(x=>x.alive).map(x=>x.id)); setIndex(0); setSelected([]); setWolfVotes([]); setSaves([]); setCurrentSaves({}); setAssembly(false); setAssemblyNames([]); setAssemblyAnnouncementOpen(false); setShots([]); setGuards([]); setBullets([]); setSerials([]); setStrong([]); setLone([]); setVisitors([]); setShields([]); setNewspapers([]); setRevivals([]); setRevived([]); setScreen('nightIntro'); }
  function nextNightTurn(votes: number[], _protectedIds: number[], doctorSaves: Record<number,number>, _nextAssembly = assembly, nextShots = shots, nextRevivals = revivals, nextGuards = guards, nextBullets = bullets, extra = {serials,visitors,shields,strong}, nextLone = lone) {
    setSelected([]);
    if (index+1 < queue.length) { setIndex(index+1); setScreen('pass'); return; }
    // All choices were made before this dawn's new Friends bonds are committed.
    const actionFriends={...lovers.current};
    const detentions=resolveDetentions(Object.entries(policeTargets.current).map(([actor,target])=>({actor:Number(actor),target})));
    const blocked = new Set(detentions.blocked);
    const allowed = (id:number) => !blocked.has(id);
    const isAttempt = (id:number) => nightVisits.current.some(v=>v.actor===id);
    setLastDetentions(Object.fromEntries(Object.entries(policeChoices.current).filter(([actor])=>allowed(Number(actor)))));
    setPreviousVisits(nightVisits.current.filter(v=>allowed(v.actor)));
    setPrivateReports(Object.fromEntries(Object.entries(pendingReports.current).filter(([actor])=>allowed(Number(actor)))));
    if (players.some(p=>p.alive && p.role==='police')) {
      const generated=limitedCelebrityReveals(players,detentions.blocked,corrupted,Math.random,settings.celebrityAudience,settings.celebrityFameNights,celebrityFameUsed);
      nextFame.current=generated.fame;setCelebrityFameUsed(generated.used);
    }
    setNewspapers(newspaperAttempts.current.filter(a=>allowed(a.actor)).map(a=>a.paper));
    setProvocations(provocationAttempts.current.filter(a=>allowed(a.actor) && a.target>=0).map(a=>a.target));
    const nextWatches={...watchTargets};
    for(const p of players)if(p.alive && p.role==='detective')delete nextWatches[p.id];
    for(const action of detectiveAttempts.current)if(allowed(action.actor))nextWatches[action.actor]=action.target;
    const thiefWatches=thiefDeathOnly ? chooseThiefWatches(players,nextWatches,thefts.current,settings.thiefTargetMode,[...blocked,...corrupted]) : nextWatches;
    setTempleUsed(previous=>{ const copy=[...previous]; for (const id of blocked) if (isAttempt(id)) { const last=copy.lastIndexOf(id); if(last>=0) copy.splice(last,1); } return copy; });
    setSheriffUsed(previous=>{ const copy=[...previous]; for (const id of blocked) if (isAttempt(id)) { const last=copy.lastIndexOf(id); if(last>=0) copy.splice(last,1); } return copy; });
    setNecromancerUsed(previous=>{ const copy=[...previous]; for (const id of blocked) if (isAttempt(id)) { const last=copy.lastIndexOf(id); if(last>=0) copy.splice(last,1); } return copy; });
    setHypnoUsed(previous=>{const copy=[...previous];for(const id of blocked) if(hypnosis.current.some(a=>a.actor===id)){const last=copy.lastIndexOf(id);if(last>=0) copy.splice(last,1);}return copy;});
    setMayors(previous=>[...new Set([...previous,...mayorAttempts.current.filter(allowed)])]);
    setFailedMayors(previous=>[...new Set([...previous,...fakeMayorAttempts.current.filter(allowed)])]);
    setInstigatorUses(previous=>{
      const next={...previous};
      for (const a of provocationAttempts.current) if (!allowed(a.actor)) next[a.actor]=Math.max(0,(next[a.actor]||0)-1);
      return next;
    });
    setShieldUses(previous=>{
      const next={...previous};
      for (const id of extra.shields) if (!allowed(id) && players.some(p=>p.id===id && p.role==='survivor')) next[id]=Math.max(0,(next[id]||0)-1);
      return next;
    });
    setParasiteStock(previous=>{
      const next={...previous};
      for (const a of parasiteAttempts.current) if (!allowed(a.actor)) next[a.actor]=(next[a.actor] ?? 0)+1;
      for (const a of parasiteRegens.current) if (!allowed(a.actor)) next[a.actor]=Math.max(0,(next[a.actor] ?? 0)-a.amount);
      return next;
    });
    for (const a of parasiteAttempts.current) if (!allowed(a.actor)) mindParasites.current[a.actor]=(mindParasites.current[a.actor] || []).filter(id=>id!==a.target);
    for (const a of curseAttempts.current) if (!allowed(a.actor)) curses.current[a.actor]=(curses.current[a.actor] || []).filter(id=>id!==a.target);
    for (const a of loverAttempts.current) if (allowed(a.actor) && lovers.current[a.actor]===undefined && lovers.current[a.target]===undefined) {
      lovers.current={...lovers.current,[a.actor]:a.target,[a.target]:a.actor}; friendInitiators.current.add(a.actor);
    }
    // Letters are delivered only next night, after the bond and Police blocks resolve.
    friendInbox.current.push(...friendOutbox.current.filter(letter=>allowed(letter.from) && lovers.current[letter.from]===letter.to).map(letter=>({...letter,deliver:round+1})));
    friendOutbox.current=[];
    gamblerBets.current=gamblerBets.current.filter(a=>allowed(a.actor));
    const actualSaves=Object.fromEntries(Object.entries(doctorSaves).filter(([id])=>allowed(Number(id))));
    const actualAssembly=mayorAttempts.current.some(allowed);
    setAssembly(actualAssembly);
    setAssemblyAnnouncementOpen(actualAssembly);
    setAssemblyNames(mayorAttempts.current.filter(allowed).map(id=>players.find(p=>p.id===id)?.name || '').filter(Boolean));
    const actualRevivals=nextRevivals.filter(id=>revivalAttempts.current.some(a=>a.target===id && allowed(a.actor)));
    const successfulThefts: Visit[] = [];
    // Resolve after all turns so Police blocks and the current night's abilities
    // are considered without exposing hidden wolves during private turns.
    const loneAttacks=nextLone.filter(a=>allowed(a.actor) && players.some(p=>p.id===a.actor && loneWolfAttackSucceeds(p,players,round,settings,enraged,blocked,lovers.current)));
    const strongAttacks=extra.strong.filter(a=>allowed(a.actor) && players.some(p=>p.id===a.actor && (p.role!=='strongwolf' || strongWolfAttackAvailable(p,players,round,settings,enraged,blocked,lovers.current))));
    const trace:NightTrace={attacks:[],landed:[],doctorSaved:[],guarded:[],shielded:[],assemblySaved:[]};
    const nightResult = resolveNight(players, votes, Object.values(actualSaves), actualAssembly, nextShots.filter(a=>allowed(a.actor)), nextGuards.filter(a=>allowed(a.actor)), nextBullets.filter(a=>allowed(a.actor)), {
      trace,serials:extra.serials.filter(a=>allowed(a.actor)),visitors:extra.visitors.filter(a=>allowed(a.actor)),shields:extra.shields.filter(allowed),strong:strongAttacks,
      lone:loneAttacks,packVotes:wolfBallots.current.filter(a=>allowed(a.actor)),enraged,curses:curses.current,
      triggeredCurses:triggeredCurses.current.filter(allowed),thieves:thiefDeathOnly ? [] : thefts.current.filter(a=>allowed(a.actor)),successfulThefts,lovers:lovers.current,madmen:madmen.filter(id=>corrupted.includes(id)),visitorDangerousRoles:!safeFirstNight && settings.visitorDangerousRoles,visitorAttackedTarget:!safeFirstNight && settings.visitorAttackedTarget,bodyguardProtectAll:settings.bodyguardProtectAll,packAttackLimit:2,randomPackTies:settings.wolfRandomTies,ravenReflectAttackers:settings.ravenReflectAttackers
    });
    const afterDebts = collectGamblerDebts(nightResult,gamblerDebts,actualSaves);
    setGamblerDebts([]);
    const illness = applyIllness(afterDebts, actualSaves, sickLife, corrupted, settings.sickStartingNights, settings.sickDoctorBonus);
    const revivedPlayers = illness.players.map(p => actualRevivals.includes(p.id) ? {...p,alive:true} : p);
    const infectionResult = applyInfections(revivedPlayers, infections.current.filter(a=>allowed(a.actor)));
    const theftResult=thiefDeathOnly ? inheritThiefWatches(players,infectionResult.players,thiefWatches,[...blocked,...corrupted]) : {...applyThefts(players,infectionResult.players,successfulThefts),watches:thiefWatches};
    setWatchTargets(theftResult.watches);
    const survived = theftResult.players;
    const escapeResult = resolveGamblerEscapes(survived,gamblerReady,lovers.current);
    const updated = escapeResult.players;
    const effectiveMutes=resolveMutes(players,updated,muteAttempts.current,blocked,corrupted);
    setMorningMuted([...new Set(effectiveMutes.map(a=>a.target))]);
    setNightEscapes(escapeResult.escaped.map(id=>players.find(p=>p.id===id)?.name || '').filter(Boolean));
    // Escape eligibility above came from an earlier night/day. New successes wait another night.
    const nightBets=settleGamblerNightBets(players,updated,gamblerBets.current,gamblerCorrect,lovers.current,settings.gamblerPredictions);
    gamblerBets.current=nightBets.pending;
    setGamblerCorrect(nightBets.correct);
    setGamblerReady(nightBets.ready);
    const hypnosisResult=advanceHypnosis(updated,hypnosis.current.filter(a=>allowed(a.actor)),hypnosisExpiry.current,corrupted.filter(id=>madmen.includes(id)),round,settings.hypnoDuration);
    hypnosisExpiry.current=hypnosisResult.expires;setCorrupted(hypnosisResult.corrupted);
    setStolenRoles(previous=>({...previous,...theftResult.stolen}));
    setConverted(prev=>[...new Set([...prev,...infectionResult.converted])]);
    for (const p of updated) if (p.role==='sickman' && actualRevivals.includes(p.id)) illness.remaining[p.id]=settings.sickStartingNights;
    setSickLife(illness.remaining);
    setRevived(players.filter(p => !p.alive && updated.find(q => q.id === p.id)?.alive));
    const killed = players.filter(p => p.alive && !survived.find(q => q.id === p.id)?.alive);
    if (killed.some(p=>p.role==='wolfpup')) setEnragedNext(true);
    const mindWinnerId=mindFlayerWinner(updated,mindParasites.current,lovers.current);
    if (mindWinnerId !== null) setMindWinner(updated.find(p=>p.id===mindWinnerId)?.name || '');
    scoreNight(performance.current,{round,before:players,after:updated,combatDeaths:nightResult.filter(p=>!p.alive).map(p=>p.id),visits:nightVisits.current,blocked,corrupted,friends:actionFriends,trace,doctors:actualSaves,mutes:effectiveMutes,police:policeChoices.current,revivals:revivalAttempts.current,infections:infections.current,hypnosis:hypnosis.current.filter(a=>hypnosisResult.corrupted.includes(a.target)),parasites:parasiteAttempts.current,marks:curseAttempts.current,mayors:mayorAttempts.current.filter(allowed),stolen:theftResult.stolen});
    scorePredictions(performance.current,round,gamblerCorrect,nightBets.correct);
    const notify = settings.policeNotifyBlocked ? players.filter(p=>blocked.has(p.id)) : [];
    setMorningBlocked(notify);
    setPlayers(updated); setDeaths(killed); setLastSaves({...actualSaves,...Object.fromEntries(Object.entries(fakeDoctorSaves.current).filter(([id])=>allowed(Number(id))))}); setWon(mindWinnerId !== null ? 'mindflayer' : winner(updated,lovers.current)); setScreen('morning');
  }
  function showPrivateResult(actor: number, text: string, reportedRole?: Role, subjectIds: number[] = selected) {
    const role=players.find(p=>p.id===actor)?.role;
    const title=role==='seer' ? 'ROLE CHECK' : role==='psychic' ? 'TEAM RESULT' : role==='chef' ? (text.includes('different teams') ? 'DIFFERENT TEAMS' : 'SAME TEAM') : role==='intelligence' ? 'PLAYER REPORT' : role==='mindflayer' ? 'TINY CREATURE RESULT' : 'PRIVATE RESULT';
    const info:PrivateInfoData={title,text,people:subjectIds.flatMap(id=>{const p=players.find(person=>person.id===id);return p?[{id:p.id,name:p.name}]:[];}),shownRole:reportedRole,tone:role==='chef' ? (text.includes('different teams')?'red':'green') : 'default'};
    if (players.some(p=>p.alive && p.role==='police')) {
      pendingReports.current[actor]=info;
      nextNightTurn(wolfVotes,saves,currentSaves);
    } else {setPrivateInfo(info);setScreen('privateResult');}
  }
  function sendFriendMessage(from: number, to: number, text: string, replyAllowed: boolean) {
    const message=text.trim();
    // Consume the allowance synchronously, before React renders, to reject repeat taps.
    if (!message || friendMessagesSent.current.has(from)) return;
    friendMessagesSent.current.add(from);
    friendOutbox.current.push({from,to,text:message,replyAllowed});
    setFriendDraft('');setFriendSent(true);
  }
  function openPrivateTurn(player:Player) {
    const messages:PrivateInfoData[]=[];
    setFriendDraft('');setFriendSent(friendMessagesSent.current.has(player.id));
    const received=friendInbox.current.filter(letter=>letter.to===player.id && letter.deliver<=round);
    friendInbox.current=friendInbox.current.filter(letter=>letter.to!==player.id || letter.deliver>round);
    for (const letter of received) {
      const sender=players.find(p=>p.id===letter.from);
      if (!sender || lovers.current[player.id]!==sender.id) continue;
      messages.push({title:'PRIVATE MESSAGE',text:letter.text,people:[{id:sender.id,name:sender.name}],tone:'gold',...(letter.replyAllowed && sender.alive && !sender.escaped ? {replyTo:sender.id,replyName:sender.name} : {})});
    }

    if (privateReports[player.id]) messages.push({...privateReports[player.id],title:`PREVIOUS NIGHT · ${privateReports[player.id].title}`});
    for(const name of fame[player.id] || []) {
      const person=players.find(p=>p.name===name);
      messages.push({title:'CELEBRITY',text:`${name} is the Celebrity.`,people:person?[{id:person.id,name:person.name}]:[],shownRole:'celebrity',tone:'gold'});
    }
    if(player.role==='detective' && watchTargets[player.id]!==undefined) {
      const id=watchTargets[player.id], target=players.find(p=>p.id===id);
      const visits=corrupted.includes(player.id) ? [] : visitorsTo(previousVisits,id);
      const text=settings.detectiveShowNames ? `People who visited ${target?.name} last night: ${visits.map(visitor=>players.find(p=>p.id===visitor)?.name).filter(Boolean).join(', ') || 'None'}` : `${visits.length} ${visits.length===1?'person':'people'} visited ${target?.name} last night.`;
      if(!corrupted.includes(player.id))addPerformance(performance.current,`check:detective:${player.id}:${id}`,player.id,'check');
      messages.push({title:'WHO VISITED?',text,people:target?[{id:target.id,name:target.name}]:[]});
    }
    if(converted.includes(player.id) && !seenPrivateEvents.current.has(`converted:${player.id}`)) {
      messages.push({title:'YOUR NEW ROLE',text:lovers.current[player.id]!==undefined ? 'The Infecting Wolf turned you into a Werewolf. You are still on the Friends team.' : 'The Infecting Wolf turned you into a Werewolf. You are now on the Werewolf team.',people:[{id:player.id,name:player.name}],shownRole:'werewolf',tone:'red'});
      seenPrivateEvents.current.add(`converted:${player.id}`);
    }
    if(player.role==='lonewolf' && player.joinedPack && !seenPrivateEvents.current.has(`joined-pack:${player.id}`)) {
      messages.push({title:'YOUR WEREWOLF TEAM',text:'The Infecting Wolf found you. You are still the Lone Werewolf, but now you know the other Werewolves and they know you.',people:[{id:player.id,name:player.name}],shownRole:'lonewolf',tone:'red'});
      seenPrivateEvents.current.add(`joined-pack:${player.id}`);
    }
    if(stolenRoles[player.id] && !seenPrivateEvents.current.has(`stolen:${player.id}:${stolenRoles[player.id]}`)) {
      messages.push({title:'YOUR NEW ROLE',text:`You stole a role. You are now ${roles[stolenRoles[player.id]].name}.`,people:[{id:player.id,name:player.name}],shownRole:stolenRoles[player.id]});
      seenPrivateEvents.current.add(`stolen:${player.id}:${stolenRoles[player.id]}`);
    }
    if(player.role==='raven') {
      const marked=(curses.current[player.id] || []).flatMap(id=>{const p=players.find(person=>person.id===id && person.alive);return p?[{id:p.id,name:p.name}]:[];});
      messages.push({title:'YOUR MARKS',text:`Marked players: ${marked.map(p=>p.name).join(', ') || 'None'}.`,people:marked,shownRole:'raven'});
    }
    if(player.role==='mindflayer') {
      const marked=(mindParasites.current[player.id] || []).flatMap(id=>{const p=players.find(person=>person.id===id && person.alive);return p?[{id:p.id,name:p.name}]:[];});
      messages.push({title:'YOUR TINY CREATURES',text:`Tiny creatures left: ${parasiteStock[player.id] ?? settings.mindStartingParasites}. Players with a tiny creature: ${marked.map(p=>p.name).join(', ') || 'None'}.`,people:marked,shownRole:'mindflayer'});
    }
    if(player.role==='gambler') {
      messages.push({title:'YOUR GUESSES',text:`Correct guesses: ${gamblerCorrect[player.id] || 0} / ${settings.gamblerPredictions}.${gamblerDebts.includes(player.id) ? (descriptionRoles.current.includes('doctor') ? ' Wrong guess: you die tonight unless a Doctor saves you.' : ' Wrong guess: you die tonight.') : ''}${gamblerReady.includes(player.id) && lovers.current[player.id]===undefined ? ' If you live through tonight, you will leave and win in the morning.' : ''}`,shownRole:'gambler'});
    }
    if(player.role==='sickman') messages.push({title:'YOUR HEALTH',text:`Nights left without help: ${sickLife[player.id] ?? settings.sickStartingNights}`,shownRole:'sickman'});
    const friend=players.find(p=>p.id===lovers.current[player.id]);
    if(friend && !seenPrivateEvents.current.has(`friend:${player.id}:${friend.id}:${friend.alive}`)) {
      messages.push({title:'YOUR FRIEND',text:`${friend.name} is your friend. You are on the Friends team. ${friend.alive ? 'Your friend is alive.' : 'Your friend has died, but you can still win.'}`,people:[{id:friend.id,name:friend.name}],tone:'gold'});
      seenPrivateEvents.current.add(`friend:${player.id}:${friend.id}:${friend.alive}`);
    }
    setTurnInfo(messages);setScreen('action');
  }
  function completeAction() {
    let nextStrong=strong;
    if (!active || Date.now() < passiveWaitUntil) return;
    let votes=wolfVotes, protections=saves, doc=currentSaves;
    const skipWolf = wolfVoteUnavailable || wolfNoTargets || thiefLocked || independentAttackInactive || (['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief'].includes(active.role) && !(active.role==='thief' && thiefDeathOnly) && round === 1 && settings.firstNightSafe);
    const required = rabidInfectTurn && enraged ? specialTargetCount : ((['werewolf','wolfpup','whitewolf','hypnowolf'].includes(active.role) || (active.role==='rabidwolf' && round>1)) && enraged && !skipWolf) ? packTargetCount : active.role === 'chef' ? (canChefAct(players,active.id) ? 2 : 0) : (['villager','mayor','jester','survivor','celebrity','sickman','journalist','intelligence'].includes(active.role) || rabidInactive || whiteWolfNoTargets || (active.role === 'police' && !policeCanChoose) || (active.role === 'charmer' && !charmerCanChoose) || (active.role === 'mindflayer' && !mindCanPlace) || (active.role === 'raven' && players.every(p=>!p.alive || p.id===active.id || (curses.current[active.id] || []).includes(p.id))) || (active.role === 'necromancer' && (necromancerUsed.filter(id=>id===active.id).length >= settings.necromancerUses || players.every(p=>p.alive || p.escaped))) || (active.role === 'templar' && templeUsed.filter(id=>id===active.id).length >= settings.templarUses) || (active.role === 'sheriff' && !settings.sheriffEveryNight && sheriffUsed.includes(active.id)) || (active.role === 'instigator' && (instigatorUses[active.id] || 0) >= settings.instigatorMaxUses) || skipWolf ? 0 : 1);
    if (selected.length !== required) return;
    if (active.role==='police' && selected.length) {
      policeChoices.current[active.id]=selected[0];
      if (!corrupted.includes(active.id)) policeTargets.current[active.id]=selected[0];
      nightVisits.current.push({actor:active.id,target:selected[0]});
      nextNightTurn(votes,protections,doc); return;
    }
    if (active.role!=='gambler') for (const target of selected) nightVisits.current.push({actor:active.id,target});
    if (corrupted.includes(active.id)) {
      if (active.role==='seer') {
        const target=players.find(p=>p.id===selected[0]);
        const randomRole=shuffle((Object.keys(roles) as Role[]).filter(role=>role!=='madman'))[0];
        const reading=seerReading(randomRole,settings.seerShowExactRole);
        const displayed=settings.seerShowExactRole ? (Object.keys(roles) as Role[]).find(r=>roles[r].name===reading) : undefined;
        showPrivateResult(active.id,`${target?.name} is ${reading}.`,displayed); return;
      }
      if (active.role==='psychic') {
        const target=players.find(p=>p.id===selected[0]);
        const fake=shuffle(['village','wolf','neutral'])[0];
        showPrivateResult(active.id,`${target?.name} is on the ${fake==='wolf'?'Werewolf':fake==='village'?'Village':'Neutral'} team.`); return;
      }
      if (active.role==='chef' && selected.length===2) { showPrivateResult(active.id,Math.random()<0.5 ? 'These players are on the same team.' : 'These players are on different teams.'); return; }
      if (active.role==='intelligence' && round%settings.intelligenceInterval===0) {
        const names=shuffle(players.filter(p=>p.alive && p.id!==active.id)).slice(0,2).map(p=>p.name);
        showPrivateResult(active.id,names.length ? `${names.join(' and ')}: one of these players may be a Werewolf or play alone. This may be wrong.` : 'No other living players to report on.',undefined,players.filter(p=>names.includes(p.name)).map(p=>p.id)); return;
      }
      if (active.role==='doctor' && selected.length) fakeDoctorSaves.current[active.id]=selected[0];
      if (active.role==='detective' && selected.length) detectiveAttempts.current.push({actor:active.id,target:selected[0]});
      if (active.role==='templar' && selected.length) setTempleUsed([...templeUsed,active.id]);
      if (active.role==='sheriff' && selected.length) setSheriffUsed([...sheriffUsed,active.id]);
      if (active.role==='necromancer' && selected.length) setNecromancerUsed([...necromancerUsed,active.id]);
      if (active.role==='instigator' && selected.length) { provocationAttempts.current.push({actor:active.id,target:-1}); setInstigatorUses({...instigatorUses,[active.id]:(instigatorUses[active.id]||0)+1}); }
      nextNightTurn(votes,protections,doc); return;
    }
    if (active.role==='gambler') {
      gamblerBets.current.push({actor:active.id,target:selected[0]});
      const next=settings.gamblerBetProtection ? [...shields,active.id] : shields; setShields(next);
      nextNightTurn(votes,protections,doc,assembly,shots,revivals,guards,bullets,{serials,visitors,shields:next,strong}); return;
    }
    if (active.role==='muted' && selected.length) muteAttempts.current.push({actor:active.id,target:selected[0]});
    if (active.role==='charmer' && selected.length && charmerCanChoose) loverAttempts.current.push({actor:active.id,target:selected[0]});
    if (active.role==='mindflayer' && selected.length) {
      parasiteAttempts.current.push({actor:active.id,target:selected[0]});
      mindParasites.current = {...mindParasites.current,[active.id]:[...(mindParasites.current[active.id] || []),selected[0]]};
      setParasiteStock({...parasiteStock,[active.id]:(parasiteStock[active.id] ?? settings.mindStartingParasites)-1});
    }
    if (active.role==='raven' && selected.length) { curseAttempts.current.push({actor:active.id,target:selected[0]}); curses.current = {...curses.current,[active.id]:[...(curses.current[active.id] || []),selected[0]]}; }
    if (active.role==='detective') detectiveAttempts.current.push({actor:active.id,target:selected[0]});
    if (active.role==='instigator' && (instigatorUses[active.id]||0)<settings.instigatorMaxUses) { provocationAttempts.current.push({actor:active.id,target:selected[0]}); setInstigatorUses({...instigatorUses,[active.id]:(instigatorUses[active.id]||0)+1}); }
    if (rabidInfectTurn) for(const target of selected) infections.current.push({actor:active.id,target});
    if ((['werewolf','wolfpup','whitewolf','hypnowolf'].includes(active.role) || (active.role==='rabidwolf' && round>1 && !rabidInfectTurn)) && !skipWolf) {
      const betrayal=selected.filter(id=>lovers.current[active.id]!==undefined && players.some(p=>p.id===id && knownPlayerPackmates(active,p)));
      const ordinary=selected.filter(id=>!betrayal.includes(id));
      if (betrayal.length) { nextStrong=[...strong,...betrayal.map(target=>({actor:active.id,target}))]; setStrong(nextStrong); }
      votes=[...wolfVotes,...ordinary]; for(const target of ordinary) wolfBallots.current.push({actor:active.id,target}); setWolfVotes(votes);
    }
    if (active.role==='doctor') { protections=[...saves,selected[0]]; doc={...currentSaves,[active.id]:selected[0]}; setSaves(protections); setCurrentSaves(doc); }
    if (active.role==='lonewolf' && !skipWolf) { const next=[...lone,{actor:active.id,target:selected[0]}]; setLone(next); nextNightTurn(votes,protections,doc,assembly,shots,revivals,guards,bullets,{serials,visitors,shields,strong},next); return; }
    if (active.role==='strongwolf' && !skipWolf) { const next=[...strong,{actor:active.id,target:selected[0]}]; setStrong(next); nextNightTurn(votes,protections,doc,assembly,shots,revivals,guards,bullets,{serials,visitors,shields,strong:next}); return; }
    if (active.role==='thief' && !skipWolf && !thiefLocked) { thefts.current.push({actor:active.id,target:selected[0]}); nextNightTurn(votes,protections,doc); return; }
    if (active.role==='serialkiller' && !skipWolf) { const next=[...serials,{actor:active.id,target:selected[0]}]; setSerials(next); nextNightTurn(votes,protections,doc,assembly,shots,revivals,guards,bullets,{serials:next,visitors,shields,strong}); return; }
    if (active.role==='visitor') { const next=[...visitors,{actor:active.id,target:selected[0]}]; setVisitors(next); nextNightTurn(votes,protections,doc,assembly,shots,revivals,guards,bullets,{serials,visitors:next,shields,strong}); return; }
    if (active.role==='bodyguard') { const next=[...guards,{actor:active.id,target:selected[0]}]; setGuards(next); nextNightTurn(votes,protections,doc,assembly,shots,revivals,next); return; }
    if (active.role==='sheriff' && (settings.sheriffEveryNight || !sheriffUsed.includes(active.id)) && !skipWolf) { const next=[...bullets,{actor:active.id,target:selected[0]}]; setBullets(next); setSheriffUsed([...sheriffUsed,active.id]); nextNightTurn(votes,protections,doc,assembly,shots,revivals,guards,next); return; }
    if (active.role==='necromancer' && necromancerUsed.filter(id=>id===active.id).length < settings.necromancerUses && players.some(p=>!p.alive && !p.escaped)) { const next=[...revivals,selected[0]]; revivalAttempts.current.push({actor:active.id,target:selected[0]}); setRevivals(next); setNecromancerUsed([...necromancerUsed,active.id]); nextNightTurn(votes,protections,doc,assembly,shots,next); return; }
    if (active.role==='templar' && templeUsed.filter(id=>id===active.id).length < settings.templarUses && !skipWolf) { const next=[...shots,{actor:active.id,target:selected[0]}]; setShots(next); setTempleUsed([...templeUsed,active.id]); nextNightTurn(votes,protections,doc,assembly,next); return; }
    if (active.role==='intelligence' && round%settings.intelligenceInterval===0) {
      const candidates=intelligenceReport(players,active.id).map(id=>players.find(p=>p.id===id)?.name).filter(Boolean);
      showPrivateResult(active.id,candidates.length ? `${candidates.join(' and ')}: one of these players may be a Werewolf or play alone. This may be wrong.` : 'No other living players to report on.',undefined,players.filter(p=>candidates.includes(p.name)).map(p=>p.id)); return;
    }
    if (active.role==='psychic') { const target=players.find(p=>p.id===selected[0])!; const team=!settings.psychicShowFriends && teamOfPlayer(target,lovers.current)==='friends' ? 'neutral' : teamOfPlayer(target,lovers.current); const label=team==='wolf'?'Werewolf':team==='village'?'Village':team==='friends'?'Friends':'Neutral'; showPrivateResult(active.id,`${target.name} is on the ${label} team.`); return; }
    if (active.role==='seer') { const target=players.find(p=>p.id===selected[0])!; const reading=seerReading(target.role,settings.seerShowExactRole); const displayed=settings.seerShowExactRole ? (Object.keys(roles) as Role[]).find(r=>roles[r].name===reading) : undefined; showPrivateResult(active.id,`${target.name} is ${reading}.`,displayed); return; }
    if (active.role==='chef' && selected.length===2) { const [a,b]=selected.map(id=>players.find(p=>p.id===id)!); showPrivateResult(active.id,sameTeamForChef(a,b,lovers.current,settings.chefNeutralsTogether) ? 'These players are on the same team.' : 'These players are on different teams.'); return; }
    nextNightTurn(votes,protections,doc,assembly,shots,revivals,guards,bullets,{serials,visitors,shields,strong:nextStrong});
  }
  function recordVote(vote: number|null) {
    if(active)scoreVote(performance.current,round,active,players.find(p=>p.id===vote)||null,lovers.current);
    const next=[...ballots,vote,...(active && settings.mayorDoubleVote && mayors.includes(active.id) ? [vote] : [])]; setBallots(next); setSelected([]);
    if (index+1 < queue.length) {feedback.playBallot();setIndex(index+1);setScreen('vote');return;}
    const id=tally(next), victim=players.find(p=>p.id===id && p.alive);
    if(!victim)feedback.playBallot(); // A real elimination owns the immediate voted-out cue instead.
    const afterVote=players.map(p=>p.id===id ? {...p,alive:false} : p);
    const settled=settleGamblerBets(afterVote,id,gamblerBets.current,gamblerCorrect,lovers.current,settings.gamblerPredictions);
    setGamblerCorrect(settled.correct); setGamblerDebts(settled.indebted); setGamblerReady([...new Set([...gamblerReady,...settled.ready])]); gamblerBets.current=[];
    const inherited=thiefDeathOnly ? inheritThiefWatches(players,settled.players,watchTargets,corrupted) : {players:settled.players,stolen:{},watches:watchTargets};
    scoreInheritance(performance.current,round,'vote',inherited.stolen);
    scorePredictions(performance.current,round,gamblerCorrect,settled.correct,settled.indebted);
    setWatchTargets(inherited.watches);setStolenRoles(previous=>({...previous,...inherited.stolen}));
    setPlayers(inherited.players); if (victim?.role==='wolfpup') setEnragedNext(true);
    const mindWinnerId=mindFlayerWinner(inherited.players,mindParasites.current,lovers.current);
    if (mindWinnerId !== null) setMindWinner(inherited.players.find(p=>p.id===mindWinnerId)?.name || '');
    setWon(victim?.role==='jester' && lovers.current[victim.id]===undefined ? 'jester' : mindWinnerId !== null ? 'mindflayer' : winner(inherited.players,lovers.current)); if (victim?.role === 'jester' && lovers.current[victim.id]===undefined) setJesterWinner(victim.name);
    const announcement=victim ? `${victim.name} was voted out${settings.revealDead && !settings.hideVotedOutRoles ? ` — ${roles[victim.role].name}` : ''}.` : 'No one was voted out. The vote was tied or more players chose to skip.';
    setResult(announcement);
    setScreen('voteResult');
  }
  const canSelect = (p: Player) => !!active && !(active.role==='thief' && !thiefDeathOnly && lovers.current[active.id]===p.id) && !(active.role==='police' && !canDetain(players,active.id,p.id,settings.policeRepeatTarget ? {} : lastDetentions)) && !(active.role==='charmer' && lovers.current[p.id]!==undefined) && !(['werewolf','wolfpup','whitewolf','hypnowolf','rabidwolf','strongwolf','lonewolf','serialkiller','sheriff','templar','raven'].includes(active.role) && lovers.current[active.id]===p.id) && !(active.role==='mindflayer' && (mindParasites.current[active.id] || []).includes(p.id)) && !(active.role==='raven' && (curses.current[active.id] || []).includes(p.id)) && (active.role === 'necromancer' ? !p.alive && !p.escaped && !revivals.includes(p.id) : p.alive) && ((active.role === 'doctor' && settings.doctorSelfProtect) || p.id !== active.id) && canWolfTarget(packIdentity(active),packIdentity(p),settings.whiteWolfBetrayPack,lovers.current[active.id]!==undefined && (['werewolf','rabidwolf','strongwolf','whitewolf'].includes(active.role) || (active.role==='lonewolf' && active.joinedPack)) && !rabidInfectTurn) && !(active.role==='doctor' && !settings.doctorRepeatProtect && lastSaves[active.id]===p.id);
  const policeCanChoose = !!active && active.role==='police' && players.some(p=>canDetain(players,active.id,p.id,settings.policeRepeatTarget ? {} : lastDetentions));
  const charmerCanChoose = !!active && active.role==='charmer' && round>=settings.charmerFirstNight && lovers.current[active.id]===undefined && players.some(p=>p.alive && p.id!==active.id && lovers.current[p.id]===undefined);
  const messageRecipient = active?.role==='charmer' && settings.charmerMessages && (friendInitiators.current.has(active.id) || charmerCanChoose) ? (lovers.current[active.id] ?? (charmerCanChoose ? selected[0] : undefined)) : undefined;
  const messageFriend = players.find(p=>p.id===messageRecipient && p.alive && !p.escaped);
  const mindCanPlace = !!active && active.role==='mindflayer' && (parasiteStock[active.id] ?? settings.mindStartingParasites)>0 && players.some(p=>p.alive && p.id!==active.id && !(mindParasites.current[active.id] || []).includes(p.id));
  const whiteWolfNoTargets = !!active && active.role==='whitewolf' && !players.some(canSelect);
  const wolfNoTargets = !!active && ['werewolf','rabidwolf','strongwolf','lonewolf'].includes(active.role) && !players.some(canSelect);
  const packTargetCount = active && !wolfVoteUnavailable && enraged && (['werewolf','wolfpup','whitewolf','hypnowolf'].includes(active.role) || (active.role==='rabidwolf' && round>1)) ? Math.min(2, players.filter(canSelect).length) : 1;
  const specialTargetCount = active && enraged ? Math.min(2,players.filter(canSelect).length) : 1;
  const toggleTarget = (id: number) => { const max=active?.role==='chef'?2:(active?.role==='hypnowolf' || rabidInfectTurn)?specialTargetCount:packTargetCount; setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : max===1?[id]:s.length<max?[...s,id]:s); };
  const packView = !!active && knownPlayerPackmates(active,active);
  const packmates = active && packView ? players.filter(p=>p.alive && p.id!==active.id && knownPlayerPackmates(active,p)) : [];
  const packRoleName = (p:Player) => p.role==='whitewolf' && active?.role!=='whitewolf' ? 'Werewolf' : roles[p.role].name;
  // These are the choices already made this night, before simultaneous blocks resolve.
  // Lone Werewolf and all non-pack players never receive these markers.
  const wolfChoicesFor = (target:number) => !active || !packView ? [] : nightVisits.current.filter(v=>v.target===target && v.actor!==active.id).flatMap(v=>{
    const actor=players.find(p=>p.id===v.actor && p.alive);
    if(!actor || !knownPlayerPackmates(active,actor))return [];
    if(lovers.current[actor.id]!==undefined && players.some(p=>p.id===target && knownPlayerPackmates(actor,p)))return [];
    const action=actor.role==='hypnowolf' ? 'hypnotize' : actor.role==='rabidwolf' && (round===1 || enraged) && settings.rabidCanInfect ? 'infect' : 'attack';
    return [{actor,action}];
  });
  const targetGrid = (interactive:boolean) => <>{packView && <PackChoices key={`${round}:${active!.id}`} choices={players.flatMap(target=>[
    ...wolfChoicesFor(target.id).map(({actor,action})=>({actor:actor.name,number:actor.id+1,target:target.name,action})),
    ...(selected.includes(target.id)?[{actor:active!.name,number:active!.id+1,target:target.name,action:active!.role==='hypnowolf'?'hypnotize':rabidInfectTurn?'infect':'attack',own:true}]:[]),
  ])}/>}<div className="targets">{players.map(p=>{
    const isPack = !!active && packView && knownPlayerPackmates(active,p);
    const markers = wolfChoicesFor(p.id);
    const chosen = selected.includes(p.id);
    return <button key={p.id} aria-pressed={chosen} className={`target ${chosen?'selected':''} ${!p.alive?'dead':''} ${isPack?'wolf-teammate':''} ${packView?'wolf-target-card':''}`} disabled={!interactive || !canSelect(p)} onClick={()=>toggleTarget(p.id)}>
      <span className="target-number" aria-hidden="true">#{String(p.id+1).padStart(2,'0')}</span>
      <TargetPortrait name={p.name} avatars={avatars} alive={p.alive} escaped={p.escaped}>
        {packView ? <>
          {isPack && <span className="wolf-team-badge" aria-label={`${p.name} is ${packRoleName(p)}`}>WOLF</span>}
          <PackChoiceOverlay target={p.name} markers={markers} ownNumber={chosen?active!.id+1:undefined} ownRole={active!.role}/>
        </> : chosen && active && <RoleTargetMarker role={active.role}/>}
      </TargetPortrait>
      <strong>{p.name}</strong>
    </button>;
  })}</div></>;
  const packReadOnly = !!active && packView && (active.role==='wolfpup' || (active.role==='hypnowolf' && !hypnoAvailable) || (active.role!=='hypnowolf' && (rabidInactive || independentAttackInactive || whiteWolfNoTargets || wolfNoTargets || (safeFirstNight && ['werewolf','whitewolf','strongwolf'].includes(active.role)))));

  useEffect(()=>{if(recovery.view.stage!==null){feedback.stopPreview();setFeedbackOpen(false);}},[recovery.view.stage]);
  useRecoveryCommit(recovery,screen);
  if(recovery.view.stage!==null)return <RecoveryGate recovery={recovery}/>;
  const gameScreen = ['nightIntro','pass','action','privateResult','morning','discussion','vote','voteResult','end'].includes(screen);
  const backHome = () => { if (window.confirm('End this game and return to the menu?')) setScreen('home'); };
  const endWinnerIds=screen==='end'?winningPlayers(players,won || 'draw',lovers.current,jesterWinner,mindWinner):[];
  return <main data-motion={motionPreference} data-feedback-scope={['pass','action','privateResult','vote'].includes(screen)?'private':'public'} className={`app screen-${screen} ${screen==='home'?'home':['rules','players','roles'].includes(screen)?'menu': ['discussion','vote','voteResult','end'].includes(screen)?'day':'night'}`}>
    {(gameScreen || screen==='home') && <button type="button" className="game-settings-button feedback-open-icon" aria-label="SETTINGS" title={(recovery.fault||rankingError)?'Settings need attention':'Settings'} disabled={gameScreen && (turnInfo.length>0 || screen==='privateResult')} onClick={()=>setFeedbackOpen(true)}><SettingsIcon size={21} aria-hidden="true"/>{(recovery.fault||rankingError)&&<span className="settings-attention-dot" aria-hidden="true">!</span>}</button>}
    {gameScreen && <button type="button" className="game-rulebook-button" aria-label="Open role rulebook" onClick={()=>setRoleBookOpen(true)}><BookOpen size={21} aria-hidden="true"/></button>}
    {roleBookOpen && <RoleRulebook settings={settings} order={displayRoleOrder} onClose={()=>setRoleBookOpen(false)}/>}
    {feedbackOpen && <FeedbackSettings morningDeath={morningDeathPreferences} onMorningDeath={setMorningDeathPreferences} gameEnd={gameEndPreferences} onGameEnd={setGameEndPreferences} votedOut={votedOutPreferences} onVotedOut={setVotedOutPreferences} reveal={cardRevealPreferences} onReveal={setCardRevealPreferences} preferences={feedbackPreferences} motionPreference={motionPreference} onMotionChange={setMotionPreference} enabled={settings} onPreferences={setFeedbackPreferences} onEnabled={(key,value)=>setSettings(s=>({...s,[key]:value}))} onMute={()=>{feedback.stopPreview();setMorningDeathPreferences(p=>({...p,enabled:false}));setGameEndPreferences(p=>({...p,enabled:false}));setVotedOutPreferences(p=>({...p,enabled:false}));setCardRevealPreferences(p=>({...p,enabled:false}));setSettings(s=>({...s,sounds:false,buttonSounds:false,haptics:false}));setMotionPreference('reduced');}} onClose={()=>{feedback.stopPreview();setFeedbackOpen(false);}} onPreview={category=>{if(category==='effects')feedback.previewEffects();else feedback.previewHaptics();}}>{screen==='home' && <OfflineNotice/>}{!gameScreen && !recovery.view.active && <RecoveryOptions recovery={recovery}/>}{(gameScreen || recovery.view.active) && <RecoveryStatus recovery={recovery} scoreError={rankingError}/>}{gameScreen && !recovery.view.active && !recovery.view.notice && !rankingError && <p>Recovery is off for this match. Enable it in Settings before starting the next match.</p>}</FeedbackSettings>}
    <div className="shell">
      {screen!=='home' && screen!=='players' && screen!=='morning' && screen!=='voteResult' && screen!=='end' && <header className={screen==='roles'?'role-page-header':gameScreen?'game-header':undefined}><button className="back" aria-label="Go back" onClick={() => { if(screen==='rules') setScreen('home'); else if(screen==='roles') setScreen('players'); else backHome(); }}>‹</button><span>{screen==='rules'?'RULEBOOK':screen==='roles'?<><strong>CHOOSE ROLES</strong><small>Roles for {names.length} players</small></>:`WEREWOLF · NIGHT ${round}`}</span></header>}
      {screen==='home' && <div className="home-content"><h1 className="visually-hidden">WEREWOLF</h1><div className="home-buttons"><button className="home-button home-start" onClick={()=>setScreen('players')}><Play aria-hidden="true" size={19} fill="currentColor" strokeWidth={2}/><span>START GAME</span></button><button className="home-button home-rules" onClick={()=>setScreen('rules')}><BookOpen aria-hidden="true" size={19} fill="currentColor" strokeWidth={2}/><span>HOW TO PLAY</span></button><button className="home-button home-rules" onClick={()=>setRoleBookOpen(true)}><BookOpen aria-hidden="true" size={19}/><span>ROLE RULEBOOK</span></button></div></div>}
      {screen==='rules' && <div className="page"><HowToPlay/><button type="button" className="secondary" onClick={()=>setRoleBookOpen(true)}>ROLE RULEBOOK</button><button className="primary" onClick={()=>setScreen('home')}>GOT IT</button></div>}
      {screen==='roles' && detailRandom && <RandomRoleDetails team={detailRandom} settings={settings} onSetting={changeSetting} onClose={()=>setDetailRandom(null)}/>}
      {screen==='roles' && detailRole && <RoleDetails role={detailRole} roleList={displayRoleOrder} settings={settings} celebritySkin={celebritySkin} onCelebritySkinChange={setCelebritySkin} charmerSkin={charmerSkin} onCharmerSkinChange={setCharmerSkin} onSetting={changeSetting} onClose={()=>setDetailRole(null)}/>}
      {screen==='players' && <PlayerSetup onBack={()=>setScreen('home')} names={names} setNames={setNames} avatars={avatars} setAvatars={setAvatars} onContinue={()=>{setCounts(emptyRoleCounts());setRandomCounts({village:0,wolf:0,neutral:0});setResult('');setScreen('roles');}}/>}
      {screen==='roles' && <div className="page role-page">
        <SetupSettings settings={settings} onSetting={changeSetting} distributionOpen={distributionOpen} onToggleDistribution={()=>setDistributionOpen(open=>!open)} onDistribute={distributeRandomly}/>
        {([['village','VILLAGERS',Shield],['wolf','WEREWOLVES',Moon],['neutral','NEUTRALS',Sword]] as const).map(([team,label,Icon])=><section key={team} className={`role-section role-team-${team}`}><h3 className="section-title"><span className="section-icon"><Icon size={19}/></span><span>{label}</span><small>{roleOrder.filter(r=>roles[r].team===team).length} / {roleOrder.length} ROLES</small></h3><div className="role-grid"><div className="role-choice random-role-choice"><button type="button" className="role-info-button random-role-card" aria-label={`View random ${label} details`} onClick={()=>setDetailRandom(team)}><span className="role-card-badge"><Icon size={15}/></span><span className="random-role-art" aria-hidden="true">?</span><strong>RANDOM</strong></button><div className="stepper"><button aria-label={`Remove random ${label} role`} onClick={()=>adjustRandom(team,-1)}>−</button><span>{randomCounts[team]}</span><button aria-label={`Add random ${label} role`} onClick={()=>adjustRandom(team,1)}>+</button></div></div>{roleOrder.filter(r=>roles[r].team===team).map(r=><div className="role-choice" key={r}><RoleCard role={r} name={roles[r].name} picture={picture(r)} power={rolePower(r,settings)} icon={<Icon size={15}/>} excluded={disabledRandomRoles.includes(r)} onOpen={()=>setDetailRole(r)} onToggle={()=>toggleRandomRole(r)}/><div className="stepper"><button aria-label={`Remove ${roles[r].name}`} onClick={()=>adjustRole(r,-1)}>−</button><span>{counts[r]}</span><button aria-label={`Add ${roles[r].name}`} onClick={()=>adjustRole(r,1)}>+</button></div></div>)}</div></section>)}
        <RandomPickHelp unique={settings.randomUniqueRoles}/>
        <div ref={setupFooter} className="role-start-bar">{result && <p className="warning" role="alert" tabIndex={0}>{result}</p>}<button className="role-start-button" aria-label={`START GAME ${selectedCount} / ${names.length}`} disabled={selectedCount!==names.length || recovery.view.busy || (recovery.view.active && recovery.fault)} onClick={start}><span>▶ START</span><span className="role-start-count">{selectedCount} / {names.length} roles</span></button></div>
      </div>}
      {screen==='nightIntro' && <div className="center night-intro"><div className="modal"><div className="symbol">☾</div><h2>NIGHT {round} STARTED</h2><p>Everyone is sleeping. Pass the phone around so each player can use their role privately.</p><button className="primary" onClick={()=>setScreen('pass')}>CONTINUE →</button></div></div>}
      {screen==='pass' && active && <div className="center player-pass"><Avatar name={active.name} avatars={avatars} className="pass-avatar"/><h2 tabIndex={-1}>{active.name}</h2><p className="muted">Only this player should hold the phone before revealing. No peeking!</p><button className="primary" data-card-reveal="true" disabled={firstNightRevealSounds&&cardRevealPreferences.volume>0&&feedback.revealStatus.phase!=='ready'} onClick={()=>openPrivateTurn(active)}>◉ &nbsp; SHOW YOUR ROLE</button>{firstNightRevealSounds&&<RevealSoundNotice status={feedback.revealStatus} onRetry={feedback.retryRevealAudio} onWithoutSound={()=>openPrivateTurn(active)}/>}</div>}
      {screen==='action' && firstNightRevealSounds && feedback.revealStatus.phase==='blocked' && <RevealSoundNotice status={feedback.revealStatus} onRetry={feedback.retryRevealAudio}/>}
      {(screen==='action' || screen==='privateResult') && active && <div className={`page action action-team-${roles[active.role].team}`}><fieldset className="role-turn-content" disabled={passiveSeconds>0 || turnInfo.length>0 || screen==='privateResult'}><div className="role-art-frame"><img className="role-art" src={picture(active.role)} alt=""/><span className="role-power-game" role="img" aria-label={`Power ${rolePower(active.role,settings)} out of 10, estimated for current settings`}>{rolePower(active.role,settings)}</span></div><h2 className={roles[active.role].team==='wolf'?'red':'green'}>{roles[active.role].name}</h2><div className="panel description"><small>DESCRIPTION</small><p>{turnRoleDescription(active.role, settings,round,packmates.length,{matchRoles:descriptionRoles.current,hypnoUsesLeft:settings.hypnoMaxUses===0 ? undefined : Math.max(0,settings.hypnoMaxUses-hypnoUsed.filter(id=>id===active.id).length),voteMarkerUsesLeft:Math.max(0,settings.instigatorMaxUses-(instigatorUses[active.id]||0)),sickNightsLeft:sickLife[active.id] ?? settings.sickStartingNights,shieldsLeft:Math.max(0,settings.survivorShieldCount-(shieldUses[active.id]||0)),ravenMarkedCount:(curses.current[active.id]||[]).filter(id=>id!==lovers.current[active.id] && players.some(p=>p.id===id && p.alive)).length,friendAlive:players.some(p=>p.id===lovers.current[active.id] && p.alive && !p.escaped),friendMessageSent:friendMessagesSent.current.has(active.id),friendCanSend:friendInitiators.current.has(active.id)||charmerCanChoose,friendCanChoose:charmerCanChoose,gamblerCorrect:gamblerCorrect[active.id]||0,gamblerReady:gamblerReady.includes(active.id),gamblerDebt:gamblerDebts.includes(active.id),celebrityFameLeft:(settings.celebrityFameNights===1 || settings.celebrityFameNights===2)?Math.max(0,settings.celebrityFameNights-(celebrityFameUsed[active.id]||0)):undefined,tinyCreaturesLeft:parasiteStock[active.id] ?? settings.mindStartingParasites,enraged,joinedPack:active.joinedPack,hasFriend:lovers.current[active.id]!==undefined})}</p>{active.role==='doctor' && <details className="madman-explanation"><summary>WHEN MADMAN (CANNOT DO)?</summary><p>A Madman Doctor's protection does not work.</p></details>}{active.role==='mayor' && <details className="madman-explanation"><summary>WHEN MADMAN (CANNOT DO)?</summary><p>A Madman Mayor can try to declare an assembly, but it provides no protection and no public announcement.</p></details>}{active.role==='chef' && <details className="madman-explanation"><summary>WHEN MADMAN (CANNOT DO)?</summary><p>A Madman Chef may get a wrong answer about their guests.</p></details>}</div>{enraged && !wolfVoteUnavailable && !rabidInfectTurn && (['werewolf','wolfpup','whitewolf','hypnowolf'].includes(active.role) || (active.role==='rabidwolf' && round>1)) && <div className="panel">The Werewolves can attack more players: choose {packTargetCount} {packTargetCount===1?'target':'targets'} tonight.</div>}{stolenRoles[active.id] && <div className="panel">{lovers.current[active.id]!==undefined ? 'You stole this role. You stay on the Friends team.' : 'You stole this role and joined its team.'}</div>}{converted.includes(active.id) && <div className="panel">The Infecting Wolf turned you into a Werewolf. {lovers.current[active.id]!==undefined ? 'You are still on the Friends team.' : 'You are now on the Werewolf team.'}</div>}{privateReports[active.id] && <div className="panel"><small>PREVIOUS NIGHT REPORT</small><p>{privateReports[active.id].text}</p></div>}{active.role==='charmer' && settings.charmerMessages && messageFriend && !friendSent && !friendMessagesSent.current.has(active.id) && <section className="friend-message-compose" aria-label="Message your friend"><label htmlFor="friend-message">Message to {messageFriend.name}</label><textarea id="friend-message" value={friendDraft} onChange={event=>setFriendDraft(event.target.value)} placeholder="Write a private message" rows={3}/><p>One message per night. If you are not blocked, your living friend can read it next night and reply once in the popup. For a new friend, send it before completing your choice.</p><button type="button" disabled={!friendDraft.trim()} onClick={()=>sendFriendMessage(active.id,messageFriend.id,friendDraft,true)}>SEND MESSAGE</button></section>}{active.role==='charmer' && settings.charmerMessages && friendSent && <p className="friend-message-sent" role="status">Message ready for next night. You cannot send again tonight.</p>}{lovers.current[active.id] !== undefined && <div className="panel">Your friend: {players.find(p=>p.id===lovers.current[active.id])?.name}. You are on the Friends team. {players.find(p=>p.id===lovers.current[active.id])?.alive ? 'Your friend is alive.' : 'Your friend has died, but you can still win.'}</div>}{lovers.current[active.id] !== undefined && (['werewolf','rabidwolf','strongwolf','whitewolf'].includes(active.role) || (active.role==='lonewolf' && active.joinedPack)) && <div className="panel">You can attack Werewolves you know. They still see you as a teammate. You cannot attack your friend.</div>}{active.role==='chef' && !canChefAct(players,active.id) && <div className="panel">Not enough other living players to invite tonight.</div>}{active.role==='visitor' && safeFirstNight && <div className="panel">First-night safety prevents deaths from visiting tonight.</div>}{players.some(p=>p.alive && p.role==='police') && ['seer','psychic','chef','intelligence','mindflayer'].includes(active.role) && <div className="panel">Your result will appear on your next turn.</div>}{active.role==='intelligence' && <div className="panel">{round%settings.intelligenceInterval===0 ? 'Your player report is ready. It may be wrong.' : `No player report tonight. Reports come every ${settings.intelligenceInterval} ${settings.intelligenceInterval===1?'night':'nights'}.`}</div>}{active.role==='mindflayer' && <div className="panel">Tiny creatures left: {parasiteStock[active.id] ?? settings.mindStartingParasites}. Players with a tiny creature: {(mindParasites.current[active.id] || []).map(id=>players.find(p=>p.id===id)).filter(p=>p?.alive).map(p=>p!.name).join(', ') || 'None'}.</div>}{active.role==='gambler' && <div className="panel">Correct predictions: {gamblerCorrect[active.id] || 0} / {settings.gamblerPredictions}.{gamblerDebts.includes(active.id) ? (descriptionRoles.current.includes('doctor') ? ' Wrong guess: you die tonight unless a Doctor saves you.' : ' Wrong guess: you die tonight.') : ''}{gamblerReady.includes(active.id) && lovers.current[active.id]===undefined ? ' If you live through tonight, you will leave and win in the morning.' : ''}</div>}{(whiteWolfNoTargets || wolfNoTargets) && <div className="panel">There is no player you can attack tonight.</div>}{active.role==='charmer' && round<settings.charmerFirstNight && <div className="panel">You can choose a friend starting on night {settings.charmerFirstNight}.</div>}{active.role==='thief' && thiefDeathOnly && thiefWatchedPlayer && <div className="panel thief-watch">Watching: {thiefWatchedPlayer.name}. {thiefLocked ? 'Keep this target until they die.' : 'Keep this target or choose someone else tonight.'}</div>}{independentAttackInactive && <div className="panel">You cannot attack on your own tonight. Your attack is available every {active.role==='lonewolf' ? settings.loneWolfInterval : active.role==='serialkiller' ? settings.serialKillerInterval : settings.thiefAttackInterval} nights.</div>}{active.role==='rabidwolf' && (round===1 || rabidInfectTurn) && <div className="panel">{rabidInfectTurn ? `Choose ${specialTargetCount} ${specialTargetCount===1?'player':'players'} to turn into Werewolves tonight.` : 'You cannot turn anyone into a Werewolf tonight.'}</div>}{active.role==='sickman' && <div className="panel">Nights left without help: {sickLife[active.id] ?? settings.sickStartingNights}.</div>}{active.role==='detective' && watchTargets[active.id] !== undefined && corrupted.includes(active.id) && <div className="panel">Last night’s visitors to {players.find(p=>p.id===watchTargets[active.id])?.name}: {settings.detectiveShowNames ? 'None' : '0 visitors'}</div>}{active.role==='detective' && !corrupted.includes(active.id) && watchTargets[active.id] !== undefined && <div className="panel">Last night’s visitors to {players.find(p=>p.id===watchTargets[active.id])?.name}: {settings.detectiveShowNames ? visitorsTo(previousVisits,watchTargets[active.id]).map(id=>players.find(p=>p.id===id)?.name).filter(Boolean).join(', ') || 'None' : `${visitorsTo(previousVisits,watchTargets[active.id]).length} ${visitorsTo(previousVisits,watchTargets[active.id]).length===1?'visitor':'visitors'}`}</div>}{fame[active.id]?.length > 0 && <div className="panel">You recognize {fame[active.id].join(', ')} as a Celebrity.</div>}{packView && <div className="panel wolf-team-list"><small>YOUR TEAM</small>{packmates.length ? packmates.map(p=><div key={p.id}><span className={`wolf-team-key wolf-color-${p.id%8}`}>#{String(p.id+1).padStart(2,'0')}</span> <strong>{p.name}</strong> is {packRoleName(p)}</div>) : <div>You are the only living Werewolf you know.</div>}<p>Your claw mark and YOU tag mark your choice. The small count shows teammates’ choices. Open TEAM CHOICES for names and actions.</p></div>}{['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief'].includes(active.role) && !(active.role==='thief' && thiefDeathOnly) && !wolfVoteUnavailable && round===1 && settings.firstNightSafe && <div className="panel">No killing ability on the first night.{['werewolf','wolfpup','strongwolf','rabidwolf','whitewolf','hypnowolf'].includes(active.role) ? ' Meet your teammates.' : ''}</div>}{!['villager','mayor','jester','survivor','celebrity','sickman','journalist','intelligence'].includes(active.role) && !rabidInactive && !independentAttackInactive && !thiefLocked && !whiteWolfNoTargets && !wolfNoTargets && !(active.role==='police' && !policeCanChoose) && !(active.role==='charmer' && !charmerCanChoose) && !wolfVoteUnavailable && !(active.role==='chef' && !canChefAct(players,active.id)) && !(active.role==='mindflayer' && !mindCanPlace) && !(active.role==='raven' && players.every(p=>!p.alive || p.id===active.id || (curses.current[active.id] || []).includes(p.id))) && !(active.role==='necromancer' && (necromancerUsed.filter(id=>id===active.id).length >= settings.necromancerUses || players.every(p=>p.alive || p.escaped))) && !(active.role==='templar' && templeUsed.filter(id=>id===active.id).length >= settings.templarUses) && !(active.role==='sheriff' && !settings.sheriffEveryNight && sheriffUsed.includes(active.id)) && !(active.role==='instigator' && (instigatorUses[active.id]||0)>=settings.instigatorMaxUses) && !(['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief'].includes(active.role) && !(active.role==='thief' && thiefDeathOnly) && round===1 && settings.firstNightSafe) && <><p className="muted">{active.role==='muted' ? 'Choose a player to mute for the following day' : active.role==='chef' ? `Choose two players (${selected.length}/2)` : rabidInfectTurn && enraged ? `Choose ${specialTargetCount} players to turn into Werewolves (${selected.length}/${specialTargetCount})` : enraged && (['werewolf','wolfpup','whitewolf','hypnowolf'].includes(active.role) || (active.role==='rabidwolf' && round>1)) ? `Choose ${packTargetCount} targets (${selected.length}/${packTargetCount})` : active.role==='necromancer' ? 'Choose a dead player to revive' : active.role==='gambler' ? 'Bet on a living player: a death tonight or a vote-out tomorrow counts' : 'Choose a player'}</p>{targetGrid(true)}</>}{active.role==='hypnowolf' && hypnoAvailable && <><p className="muted">Choose {specialTargetCount} {specialTargetCount===1?'player':'players'} to hypnotize. It works on villagers starting in the next night.</p>{targetGrid(true)}</>}{packReadOnly && <><p className="muted">Your teammates’ choices tonight</p>{targetGrid(false)}</>}{active.role==='raven' && <div className="panel">Marked: {(curses.current[active.id] || []).map(id=>players.find(p=>p.id===id)).filter(p=>p?.alive).map(p=>p!.name).join(', ') || 'None'}</div>}{active.role==='raven' && (curses.current[active.id] || []).some(id=>players.some(p=>p.id===id && p.alive)) && <button className="secondary" onClick={()=>{triggeredCurses.current.push(active.id);nextNightTurn(wolfVotes,saves,currentSaves);}}>ACTIVATE CURSE</button>}{active.role==='survivor' && safeFirstNight && <div className="panel">Your shields are saved for later nights while first-night safety is on.</div>}{active.role==='survivor' && !safeFirstNight && (shieldUses[active.id] || 0) < settings.survivorShieldCount && <button className="secondary" onClick={()=>{const next=[...shields,active.id]; setShields(next); setShieldUses({...shieldUses,[active.id]:(shieldUses[active.id]||0)+1});nextNightTurn(wolfVotes,saves,currentSaves,assembly,shots,revivals,guards,bullets,{serials,visitors,shields:next,strong});}}>USE SHIELD ({settings.survivorShieldCount-(shieldUses[active.id]||0)} LEFT)</button>}{active.role==='survivor' && (shieldUses[active.id] || 0) >= settings.survivorShieldCount && <div className="panel">No shields remaining.</div>}{active.role==='mayor' && <MayorAbility safe={safeFirstNight} used={mayors.includes(active.id) || failedMayors.includes(active.id)} doubleVote={settings.mayorDoubleVote} onDeclare={()=>{if(Date.now()<passiveWaitUntil || turnInfo.length>0)return; if(corrupted.includes(active.id))fakeMayorAttempts.current.push(active.id);else mayorAttempts.current.push(active.id);nextNightTurn(wolfVotes,saves,currentSaves);}} onPass={completeAction}/>}{active.role==='sheriff' && !settings.sheriffEveryNight && sheriffUsed.includes(active.id) && <TurnHelp reason="shot-used"/>}{active.role==='necromancer' && (necromancerUsed.filter(id=>id===active.id).length >= settings.necromancerUses || players.every(p=>p.alive || p.escaped)) && <TurnHelp reason={necromancerUsed.filter(id=>id===active.id).length >= settings.necromancerUses?'revivals-used':'no-revival'}/>}{active.role==='instigator' && (instigatorUses[active.id]||0)>=settings.instigatorMaxUses && <TurnHelp reason="marks-used"/>}{active.role==='mindflayer' && (parasiteStock[active.id] ?? settings.mindStartingParasites)<=0 && <TurnHelp reason={settings.mindRegenPercent>0?'no-creatures':'no-regeneration'}/>}{active.role==='templar' && templeUsed.filter(id=>id===active.id).length >= settings.templarUses && <div className="panel">Your water has already been used.</div>}{active.role==='journalist' && <JournalistEditor key={active.id} allowDrawing={settings.journalistDrawing} onSubmit={paper=>{if(!corrupted.includes(active.id) && (paper.headline || paper.drawing)) newspaperAttempts.current.push({actor:active.id,paper}); nextNightTurn(wolfVotes,saves,currentSaves);}}/>}<p className="muted tip">Finish your turn and hide any private result before passing the phone.</p>{passiveSeconds > 0 && <div className="wait-card" role="status"><Timer aria-hidden="true"/><strong>{passiveSeconds}</strong><span>{passiveSeconds} seconds wait</span></div>}{active.role!=='journalist' && active.role!=='mindflayer' && active.role!=='hypnowolf' && active.role!=='mayor' && <button className="primary bottom" onClick={completeAction} disabled={passiveSeconds > 0 || (active.role==='chef'?canChefAct(players,active.id) && selected.length!==2:enraged && !wolfVoteUnavailable && (['werewolf','wolfpup','whitewolf','hypnowolf'].includes(active.role) || (active.role==='rabidwolf' && round>1)) && !(round===1&&settings.firstNightSafe)?selected.length!==packTargetCount:['villager','mayor','jester','survivor','celebrity','sickman','journalist','intelligence'].includes(active.role)||wolfVoteUnavailable||rabidInactive||independentAttackInactive||thiefLocked||whiteWolfNoTargets||wolfNoTargets||(active.role==='police' && !policeCanChoose)||(active.role==='charmer' && !charmerCanChoose)||(active.role==='raven' && players.every(p=>!p.alive || p.id===active.id || (curses.current[active.id] || []).includes(p.id)))||(active.role==='necromancer'&&(necromancerUsed.filter(id=>id===active.id).length >= settings.necromancerUses||players.every(p=>p.alive || p.escaped)))||(active.role==='templar'&&templeUsed.filter(id=>id===active.id).length >= settings.templarUses)||(active.role==='sheriff'&&!settings.sheriffEveryNight&&sheriffUsed.includes(active.id))||(active.role==='instigator'&&(instigatorUses[active.id]||0)>=settings.instigatorMaxUses)||(['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief'].includes(active.role) && !(active.role==='thief' && thiefDeathOnly)&&round===1&&settings.firstNightSafe)?false:selected.length!==1)}>{thiefLocked ? 'KEEP TARGET' : (active.role==='chef' && !canChefAct(players,active.id)) || ['villager','mayor','jester','survivor','celebrity','sickman','journalist','intelligence'].includes(active.role)||wolfVoteUnavailable||rabidInactive||independentAttackInactive||thiefLocked||whiteWolfNoTargets||wolfNoTargets||(active.role==='police' && !policeCanChoose)||(active.role==='charmer' && !charmerCanChoose)||(active.role==='raven' && players.every(p=>!p.alive || p.id===active.id || (curses.current[active.id] || []).includes(p.id)))||(active.role==='necromancer'&&(necromancerUsed.filter(id=>id===active.id).length >= settings.necromancerUses||players.every(p=>p.alive || p.escaped)))||(active.role==='templar'&&templeUsed.filter(id=>id===active.id).length >= settings.templarUses)||(active.role==='sheriff'&&!settings.sheriffEveryNight&&sheriffUsed.includes(active.id))||(active.role==='instigator'&&(instigatorUses[active.id]||0)>=settings.instigatorMaxUses)||(['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief'].includes(active.role) && !(active.role==='thief' && thiefDeathOnly)&&round===1&&settings.firstNightSafe)?(active.role==='intelligence' && round%settings.intelligenceInterval===0?'VIEW INTEL':'SKIP'):active.role==='thief' && thiefDeathOnly?'CHOOSE TARGET':active.role==='muted'?'MUTE PLAYER':'COMPLETE ACTION'}</button>}{active.role==='hypnowolf' && hypnoAvailable && <><button className="primary bottom" disabled={specialTargetCount===0 || selected.length!==specialTargetCount || passiveSeconds>0} onClick={()=>{for(const target of selected){hypnosis.current.push({actor:active.id,target});nightVisits.current.push({actor:active.id,target});}setHypnoUsed([...hypnoUsed,active.id]);nextNightTurn(wolfVotes,saves,currentSaves);}}>HYPNOTIZE</button><button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SAVE HYPNOSIS FOR LATER</button></>}{active.role==='hypnowolf' && !hypnoAvailable && <><div className="panel">Your hypnosis has been used.</div><button className="primary bottom" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SKIP</button></>}{active.role==='mindflayer' && mindCanPlace && <button className="primary bottom" disabled={selected.length!==1} onClick={completeAction}>PLACE TINY CREATURE</button>}{active.role==='mindflayer' && <button className="secondary" onClick={()=>{const before=parasiteStock[active.id] ?? settings.mindStartingParasites;const after=regenerateParasite(before,Math.random,settings.mindRegenPercent/100);parasiteRegens.current.push({actor:active.id,amount:after-before});setParasiteStock({...parasiteStock,[active.id]:after});showPrivateResult(active.id,after>before ? 'You got one tiny creature.' : 'You did not get a tiny creature tonight.');}}>SKIP AND TRY TO GET ONE</button>}{active.role==='muted' && <button className="secondary" disabled={passiveSeconds>0} onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SKIP MUTE</button>}{active.role==='police' && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SKIP BLOCK</button>}{active.role==='thief' && !thiefLocked && !independentAttackInactive && (thiefDeathOnly || !(round===1 && settings.firstNightSafe)) && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>{thiefDeathOnly ? (thiefWatchedPlayer?'KEEP TARGET':'SKIP CHOICE') : 'SKIP THEFT'}</button>}{active.role==='gambler' && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SKIP BET</button>}{active.role==='instigator' && (instigatorUses[active.id]||0)<settings.instigatorMaxUses && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SAVE FOR LATER</button>}{active.role==='necromancer' && necromancerUsed.filter(id=>id===active.id).length < settings.necromancerUses && players.some(p=>!p.alive && !p.escaped) && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SAVE REVIVAL FOR LATER</button>}{active.role==='sheriff' && (settings.sheriffEveryNight || !sheriffUsed.includes(active.id)) && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SAVE BULLET FOR LATER</button>}{active.role==='templar' && templeUsed.filter(id=>id===active.id).length < settings.templarUses && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SAVE WATER FOR LATER</button>}</fieldset></div>}
      {screen==='action' && turnInfo.length>0 && <PrivateInfo key={`${turnInfo.length}:${turnInfo[0].title}`} info={turnInfo[0]} avatars={avatars} picture={picture} onClose={()=>setTurnInfo(current=>current.slice(1))} onReply={turnInfo[0].replyTo!==undefined && active && !friendMessagesSent.current.has(active.id) ? text=>sendFriendMessage(active.id,turnInfo[0].replyTo!,text,false) : undefined} buttonLabel="OK · HIDE INFO"/>}
      {screen==='privateResult' && privateInfo && <PrivateInfo info={privateInfo} avatars={avatars} picture={picture} onClose={()=>{setPrivateInfo(null);nextNightTurn(wolfVotes,saves,currentSaves);}}/>}
      {screen==='morning' && <div className="morning-report" inert={assemblyAnnouncementOpen}>
        <h2 className={deaths.length?'morning-title death-title':'morning-title'}>{deaths.length ? `${deaths.length} ${deaths.length===1?'DEATH':'DEATHS'}` : 'NO ONE DIED'}</h2>
        {deaths.length===0 && <p className="morning-empty">No one was killed tonight.</p>}
        {deaths.length>0 && <p className="visually-hidden">{deaths.map(p=>`${p.name} died${settings.revealDead ? ` (${roles[p.role].name})` : ''}.`).join(' ')}</p>}
        <div className="morning-deaths">{deaths.map(p=><article className="morning-death" key={p.id} aria-label={`${p.name} died${settings.revealDead ? `, ${roles[p.role].name}` : ''}`}>
          <div className="morning-portraits"><div className="morning-victim"><Avatar name={p.name} avatars={avatars} className="morning-avatar"/><span className="morning-dead-mark" aria-hidden="true">✕</span><span className="morning-dead-badge">DEAD</span></div>{settings.revealDead && <div className={`morning-role morning-role-${roles[p.role].team}`}><img src={picture(p.role)} alt=""/><span>{roles[p.role].name}</span></div>}</div>
          <h3>{p.name}</h3>{settings.revealDead && <p>{roles[p.role].name}</p>}
        </article>)}</div>
        {morningMuted.length>0 && <section className="morning-news morning-muted" aria-label="Muted players"><h3>MUTED TODAY</h3>{morningMuted.map(id=><p key={id}>{players.find(p=>p.id===id)?.name} was muted.</p>)}<p>Cannot speak today, but can still vote. Silence ends tonight.</p></section>}
        {morningBlocked.length>0 && <div className="morning-news" aria-label="Blocked abilities"><h3>WHO WAS BLOCKED</h3>{morningBlocked.map(p=><p key={p.id}>{p.name}'s ability was blocked last night</p>)}</div>}
        {nightEscapes.length > 0 && <div className="morning-news"><p>{nightEscapes.join(', ')} left the village and won</p></div>}
        {newspapers.map((paper,i)=><article className="newspaper" key={i}><small>THE MORNING PAPER</small><h3>{paper.headline || 'The village news'}</h3>{paper.drawing && <img src={paper.drawing} alt="Newspaper drawing"/>}</article>)}
        {provocations.length > 0 && <div className="morning-news"><p>{provocations.map(id=>players.find(p=>p.id===id)?.name).filter(Boolean).join(', ')} {provocations.length===1?'starts':'start'} the vote with two votes against them</p></div>}
        {revived.length > 0 && <div className="morning-news"><p>{revived.map(p=>p.name).join(', ')} came back to life</p></div>}
        {assemblyNames.length > 0 && <div className="morning-news"><p>{assemblyNames.join(', ')} called an emergency meeting</p></div>}
        {audioScreen==='morning'&&audioScene.hasDeaths&&morningDeathPreferences.enabled&&(feedback.morningDeathNeedsRetry||feedback.morningDeathStatus.phase==='blocked')&&feedback.morningDeathStatus.phase!=='off'&&feedback.morningDeathStatus.problem!=='unsupported'&&<div role="status" className="panel"><p>{feedback.morningDeathStatus.phase==='ready'?'Morning death sound is ready. Tap to play.':feedback.morningDeathStatus.phase==='loading'?'Preparing morning death sound…':'Morning death sound could not play. Check your phone volume or retry.'}</p><button className="secondary" data-feedback-silent="true" onClick={feedback.retryMorningDeathAudio}>{feedback.morningDeathStatus.phase==='ready'?'PLAY MORNING DEATH SOUND':'RETRY MORNING DEATH SOUND'}</button></div>}
        <div ref={morningFooter} className="morning-footer"><p id="morning-next-step" className="morning-next-step">{won?'Next: match results.':'Next: discussion and voting.'}</p><HoldButton className="morning-ok" describedBy="morning-next-step" disabled={assemblyAnnouncementOpen} onComplete={()=>{if(won)setScreen('end');else {discussionDeadline.current=Date.now()+settings.discussionMinutes*60000;setSeconds(settings.discussionMinutes*60);setScreen('discussion');}}}/></div>
      </div>}
      {screen==='morning' && assemblyAnnouncementOpen && <AssemblyAnnouncement names={assemblyNames} avatars={avatars} onClose={()=>setAssemblyAnnouncementOpen(false)}/>}
      {screen==='discussion' && <div className="center discussion-screen"><div className="timer">{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</div><h2>DISCUSS YOUR SUSPECTS</h2><p>Who can you trust?</p>{morningMuted.length>0 && <section className="panel discussion-muted" aria-label="Muted players"><h3>MUTED TODAY</h3><p>{morningMuted.map(id=>players.find(p=>p.id===id)?.name).filter(Boolean).join(', ')} cannot speak today. They can still vote. Silence ends tonight.</p></section>}{settings.manualDiscussionControls!==false && <><button className="secondary" onClick={()=>{discussionDeadline.current=Math.max(discussionDeadline.current,Date.now())+60000;setSeconds(Math.ceil((discussionDeadline.current-Date.now())/1000));}}>+1 MINUTE</button><button className="primary" onClick={()=>{setQueue(players.filter(p=>p.alive).map(p=>p.id));setIndex(0);setBallots(provocations.filter(id=>players.some(p=>p.id===id&&p.alive)).flatMap(id=>[id,id]));setScreen('vote');}}>END DISCUSSION →</button></>}</div>}
      {screen==='vote' && active && <div className="page vote-page"><div className="voter-heading"><Avatar name={active.name} avatars={avatars} className="voter-avatar"/><div><h2 tabIndex={-1} aria-label={`${active.name}, who are you voting for?`}><span className="voter-name">{active.name}</span><span className="visually-hidden">, </span><span className="voter-question">Who are you voting for?</span></h2><p className="muted">Only {active.name} should hold the phone while voting.</p></div></div>{lovers.current[active.id] !== undefined && <div className="panel">Your friend is {players.find(p=>p.id===lovers.current[active.id])?.name}. You are on the Friends team.</div>}<div className="targets">{players.map(p=><button key={p.id} aria-pressed={selected[0]===p.id} className={`target ${selected[0]===p.id?'selected':''}`} disabled={!p.alive || p.id===active.id || lovers.current[active.id]===p.id} onClick={()=>setSelected([p.id])}><span className="target-number" aria-hidden="true">#{String(p.id+1).padStart(2,'0')}</span><TargetPortrait name={p.name} avatars={avatars} alive={p.alive} escaped={p.escaped}/><strong>{p.name}</strong></button>)}</div>{!settings.secretVotes && <p className="muted">Votes so far: {ballots.map(v=>v===null?'Skip':players.find(p=>p.id===v)?.name).join(', ') || 'None'}</p>}<button className="primary bottom" data-ballot-submit="true" disabled={!selected.length} onClick={()=>recordVote(selected[0])}>VOTE</button>{settings.allowSkip && <button className="secondary" data-ballot-submit="true" onClick={()=>recordVote(null)}>SKIP VOTE</button>}</div>}
      {screen==='end'&&gameEndPreferences.enabled&&(feedback.gameEndNeedsRetry||feedback.gameEndStatus.phase==='blocked')&&feedback.gameEndStatus.phase!=='off'&&feedback.gameEndStatus.problem!=='unsupported'&&<div role="status" className="panel"><p>{feedback.gameEndStatus.phase==='ready'?'Game-end sound is ready. Tap to play.':feedback.gameEndStatus.phase==='loading'?'Preparing game-end sound…':'Game-end sound could not play. Check your phone volume or retry.'}</p><button className="secondary" data-feedback-silent="true" onClick={feedback.retryGameEndAudio}>{feedback.gameEndStatus.phase==='ready'?'PLAY GAME-END SOUND':'RETRY GAME-END SOUND'}</button></div>}
      {screen==='voteResult' && votedOutPreferences.enabled&&audioScene.hasVictim&&(feedback.votedOutNeedsRetry||feedback.votedOutStatus.phase==='blocked')&&feedback.votedOutStatus.phase!=='off'&&feedback.votedOutStatus.problem!=='unsupported'&&<div role="status" className="panel"><p>{feedback.votedOutStatus.phase==='ready'?'Voted-out sound is ready. Tap to play.':feedback.votedOutStatus.phase==='loading'?'Preparing voted-out sound…':'Voted-out sound could not play. Check your phone volume or retry.'}</p><button className="secondary" data-feedback-silent="true" onClick={feedback.retryVotedOutAudio}>{feedback.votedOutStatus.phase==='ready'?'PLAY VOTED-OUT SOUND':'RETRY VOTED-OUT SOUND'}</button></div>}
      {screen==='voteResult' && <VoteResult victim={players.find(p=>p.id===tally(ballots))} votes={ballots.filter(id=>id===tally(ballots)).length} revealRole={settings.revealDead && !settings.hideVotedOutRoles} avatars={avatars} picture={picture} announcement={result} onContinue={()=>{if(won)setScreen('end');else {setRound(r=>r+1);beginNight(players);}}}/>}
      {screen==='end' && <MatchResults players={players} avatars={avatars} side={won} title={winningHeadline(players,won || 'draw',endWinnerIds,lovers.current)} winnerIds={endWinnerIds} madmen={madmen} corrupted={corrupted} round={round} rankingError={rankingError} performance={performance.current} restartDisabled={rankingStatus!=='saved' || recovery.view.busy} onRestart={()=>void startAgain()} onMenu={()=>setScreen('home')}/>}
    </div>
  </main>;
}
