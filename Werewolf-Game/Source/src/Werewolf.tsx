import RoleRulebook from './RoleRulebook';
import PrivateInfo, { type PrivateInfoData } from './PrivateInfo';
import RoleCard from './RoleCard';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, Play, Settings as SettingsIcon, Shuffle, Eye, EyeOff, SkipForward, Shield, Timer, Volume2, Vibrate, Moon, Sword, Check, Minus } from 'lucide-react';
import { roles, defaults, turnRoleDescription, deal, resolveRandomRoles, tally, winner, resolveNight, visitorsTo, applyIllness, seerReading, applyInfections, settleGamblerBets, settleGamblerNightBets, resolveGamblerEscapes, collectGamblerDebts, mindFlayerWinner, regenerateParasite, intelligenceReport, applyThefts, canDetain, resolveDetentions, advanceHypnosis, canChefAct, celebrityReveals, disguiseMadmanCards, teamOfPlayer, sameTeamForChef, shuffle, strongWolfAttackAvailable, loneWolfAttackSucceeds, knownPlayerPackmates, packIdentity, canWolfTarget, type Player, type Role, type Settings, type WinningSide, type Visit } from './werewolf-engine';
import PlayerSetup, { Avatar, readAvatars } from './PlayerSetup';
import JournalistEditor, { type Newspaper } from './JournalistEditor';
import RoleDetails from './RoleDetails';
import RandomRoleDetails from './RandomRoleDetails';
import SettingsNumberInput from './SettingsNumberInput';
import { balancedDistribution, randomPowerWeight, type DistributionMode } from './distribution';
import { VoteResult, MatchResults } from './MatchResults';
import { MayorAbility, AssemblyAnnouncement } from './MayorAbility';
import { rolePower } from './role-power';
import { CELEBRITY_SKIN_KEY, validCelebritySkin, CHARMER_SKIN_KEY, validCharmerSkin, rolePicture, type CelebritySkin, type CharmerSkin } from './role-skins';
import { RANKINGS_KEY, readRankings, updateRankings, winningPlayers } from './rankings';
import { useInteractionFeedback } from './interaction-feedback';
import './werewolf.css';

type Screen = 'home'|'rules'|'players'|'roles'|'nightIntro'|'pass'|'action'|'privateResult'|'morning'|'discussion'|'vote'|'voteResult'|'end';
const roleOrder: Role[] = ['werewolf','villager','madman','doctor','seer','chef','mayor','templar','muted','jester','necromancer','bodyguard','sheriff','serialkiller','survivor','visitor','psychic','celebrity','detective','instigator','strongwolf','sickman','lonewolf','wolfpup','journalist','raven','rabidwolf','whitewolf','gambler','mindflayer','intelligence','thief','police','hypnowolf','charmer'];
const roleTeams = ['village','wolf','neutral'] as const;
const displayRoleOrder = roleTeams.flatMap(team=>roleOrder.filter(role=>roles[role].team===team));
const emptyRoleCounts = (): Record<Role,number> => Object.fromEntries((Object.keys(roles) as Role[]).map(role=>[role,0])) as Record<Role,number>;
const passiveRoles: Role[] = ['villager','muted','jester','celebrity','sickman'];
function read<T>(key: string, fallback: T): T { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } }
function save(key: string, value: unknown) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private browsing */ } }
export default function Werewolf() {
  const [screen,setScreen] = useState<Screen>('home');
  const [roleBookOpen,setRoleBookOpen] = useState(false);
  const [detailRole,setDetailRole] = useState<Role | null>(null);
  const [distributionOpen,setDistributionOpen] = useState(false);
  const [detailRandom,setDetailRandom] = useState<'village'|'wolf'|'neutral' | null>(null);
  const [names,setNames] = useState<string[]>(() => read('werewolf.names', []));
  const [avatars,setAvatars] = useState(readAvatars);
  const [counts,setCounts] = useState<Record<Role,number>>(emptyRoleCounts);
  const [randomCounts,setRandomCounts] = useState({village:0,wolf:0,neutral:0});
  const [settings,setSettings] = useState<Settings>(() => ({...defaults,...read('werewolf.settings', {})}));
  const [celebritySkin,setCelebritySkin] = useState<CelebritySkin>(() => validCelebritySkin(read(CELEBRITY_SKIN_KEY, 'default')));
  const [charmerSkin,setCharmerSkin] = useState<CharmerSkin>(() => validCharmerSkin(read(CHARMER_SKIN_KEY, 'default')));
  useInteractionFeedback(settings.buttonSounds,settings.haptics);
  const disabledRandomRoles = Array.isArray(settings.disabledRandomRoles) ? settings.disabledRandomRoles : [];
  const toggleRandomRole = (role: Role) => setSettings(s=>{const old=Array.isArray(s.disabledRandomRoles)?s.disabledRandomRoles:[];return {...s,disabledRandomRoles:old.includes(role)?old.filter(r=>r!==role):[...old,role]};});
  const picture = (role: Role) => rolePicture(role, celebritySkin, charmerSkin);
  const audio = useRef<HTMLAudioElement | null>(null);
  const soundOn = settings.sounds || settings.buttonSounds;
  const audioPhase = ['nightIntro','pass','action','privateResult'].includes(screen) ? 'night' : ['morning','discussion'].includes(screen) ? 'day' : null;
  function playPhase(phase: string) {
    try {
      const player=audio.current || new Audio();
      audio.current=player;
      if (player.dataset.phase !== phase) { player.src=`./werewolf/audio/${phase}.mp3`; player.dataset.phase=phase; }
      player.loop=true; player.volume=0.45;
      const playback=player.play();
      playback?.catch(()=>{}); // Mobile browsers can require another tap before audio may play.
    } catch { /* Playback is optional and must never block the game. */ }
  }
  useEffect(() => {
    if (settings.sounds && audioPhase) playPhase(audioPhase);
    else audio.current?.pause();
  }, [audioPhase,settings.sounds]);
  useEffect(() => () => { audio.current?.pause(); }, []);
  const [players,setPlayers] = useState<Player[]>([]);
  // Stable dealt lineup: dead/blocked roles must not disappear from descriptions.
  const descriptionRoles = useRef<Role[]>([]);
  const [round,setRound] = useState(1);
  const [queue,setQueue] = useState<number[]>([]);
  const [index,setIndex] = useState(0);
  const [selected,setSelected] = useState<number[]>([]);
  const [privateInfo,setPrivateInfo] = useState<PrivateInfoData | null>(null);
  const [turnInfo,setTurnInfo] = useState<PrivateInfoData[]>([]);
  const seenPrivateEvents = useRef<Set<string>>(new Set());
  const [morningBlocked,setMorningBlocked] = useState<Player[]>([]);
  const [enraged,setEnraged] = useState(false);
  const [enragedNext,setEnragedNext] = useState(false);
  const curses = useRef<Record<number,number[]>>({});
  const triggeredCurses = useRef<number[]>([]);
  const mindParasites = useRef<Record<number,number[]>>({});
  const [parasiteStock,setParasiteStock] = useState<Record<number,number>>({});
  const [mindWinner,setMindWinner] = useState('');
  const lovers = useRef<Record<number,number>>({});
  const friendInitiators = useRef<Set<number>>(new Set());
  const friendInbox = useRef<{from:number;to:number;text:string;deliver:number;replyAllowed:boolean}[]>([]);
  const friendOutbox = useRef<{from:number;to:number;text:string;replyAllowed:boolean}[]>([]);
  const [friendDraft,setFriendDraft] = useState('');
  const [friendSent,setFriendSent] = useState(false);
  const friendMessagesSent = useRef<Set<number>>(new Set());
  const fakeDoctorSaves = useRef<Record<number,number>>({});
  const policeTargets = useRef<Record<number,number>>({});
  const detectiveAttempts = useRef<Visit[]>([]);
  const provocationAttempts = useRef<Visit[]>([]);
  const revivalAttempts = useRef<Visit[]>([]);
  const mayorAttempts = useRef<number[]>([]);
  const fakeMayorAttempts = useRef<number[]>([]);
  const parasiteAttempts = useRef<Visit[]>([]);
  const parasiteRegens = useRef<{actor:number; amount:number}[]>([]);
  const curseAttempts = useRef<Visit[]>([]);
  const loverAttempts = useRef<Visit[]>([]);
  const newspaperAttempts = useRef<{actor:number; paper:Newspaper}[]>([]);
  const pendingReports = useRef<Record<number,PrivateInfoData>>({});
  const [privateReports,setPrivateReports] = useState<Record<number,PrivateInfoData>>({});
  const nextFame = useRef<Record<number,string[]>>({});
  const policeChoices = useRef<Record<number,number>>({});
  const [lastDetentions,setLastDetentions] = useState<Record<number,number>>({});
  const hypnosis = useRef<Visit[]>([]);
  const hypnosisExpiry = useRef<Record<number,number|null>>({});
  const [hypnoUsed,setHypnoUsed] = useState<number[]>([]);
  const [corrupted,setCorrupted] = useState<number[]>([]);
  const [madmen,setMadmen] = useState<number[]>([]);
  const [failedMayors,setFailedMayors] = useState<number[]>([]);
  const thefts = useRef<Visit[]>([]);
  const [stolenRoles,setStolenRoles] = useState<Record<number,Role>>({});
  const infections = useRef<Visit[]>([]);
  const gamblerBets = useRef<Visit[]>([]);
  const [gamblerCorrect,setGamblerCorrect] = useState<Record<number,number>>({});
  const [gamblerDebts,setGamblerDebts] = useState<number[]>([]);
  const [gamblerReady,setGamblerReady] = useState<number[]>([]);
  const [nightEscapes,setNightEscapes] = useState<string[]>([]);
  const [converted,setConverted] = useState<number[]>([]);
  const wolfBallots = useRef<{actor:number;target:number}[]>([]);
  const [wolfVotes,setWolfVotes] = useState<number[]>([]);
  const [saves,setSaves] = useState<number[]>([]);
  const [lastSaves,setLastSaves] = useState<Record<number,number>>({});
  const [currentSaves,setCurrentSaves] = useState<Record<number,number>>({});
  const [mayors,setMayors] = useState<number[]>([]);
  const [assembly,setAssembly] = useState(false);
  const [assemblyNames,setAssemblyNames] = useState<string[]>([]);
  const [assemblyAnnouncementOpen,setAssemblyAnnouncementOpen] = useState(false);
  const [templeUsed,setTempleUsed] = useState<number[]>([]);
  const [guards,setGuards] = useState<{actor:number;target:number}[]>([]);
  const [bullets,setBullets] = useState<{actor:number;target:number}[]>([]);
  const [sheriffUsed,setSheriffUsed] = useState<number[]>([]);
  const nightVisits = useRef<Visit[]>([]);
  const [previousVisits,setPreviousVisits] = useState<Visit[]>([]);
  const [watchTargets,setWatchTargets] = useState<Record<number,number>>({});
  const [provocations,setProvocations] = useState<number[]>([]);
  const [instigatorUses,setInstigatorUses] = useState<Record<number,number>>({});
  const [fame,setFame] = useState<Record<number,string[]>>({});
  const [sickLife,setSickLife] = useState<Record<number,number>>({});
  const [lone,setLone] = useState<{actor:number;target:number}[]>([]);
  const [strong,setStrong] = useState<{actor:number;target:number}[]>([]);
  const [serials,setSerials] = useState<{actor:number;target:number}[]>([]);
  const [visitors,setVisitors] = useState<{actor:number;target:number}[]>([]);
  const [shields,setShields] = useState<number[]>([]);
  const [shieldUses,setShieldUses] = useState<Record<number,number>>({});
  const [shots,setShots] = useState<{actor:number;target:number}[]>([]);
  const [newspapers,setNewspapers] = useState<Newspaper[]>([]);
  const [deaths,setDeaths] = useState<Player[]>([]);
  const [ballots,setBallots] = useState<(number|null)[]>([]);
  const [result,setResult] = useState('');
  const [won,setWon] = useState<WinningSide|null>(null);
  const [jesterWinner,setJesterWinner] = useState('');
  const [revivals,setRevivals] = useState<number[]>([]);
  const [revived,setRevived] = useState<Player[]>([]);
  const [necromancerUsed,setNecromancerUsed] = useState<number[]>([]);
  const [seconds,setSeconds] = useState(180);
  const discussionDeadline = useRef(0);
  const rankingRecorded = useRef(false);
  const [rankingError,setRankingError] = useState(false);
  useEffect(() => {
    if (screen !== 'end' || !won || rankingRecorded.current) return;
    rankingRecorded.current = true;
    try {
      const next=updateRankings(readRankings(),players,winningPlayers(players,won,lovers.current,jesterWinner,mindWinner));
      localStorage.setItem(RANKINGS_KEY,JSON.stringify(next));
    } catch { setRankingError(true); }
  }, [screen,won,players,jesterWinner,mindWinner]);
  // Each private turn starts at the top even if the previous player scrolled.
  useLayoutEffect(() => { window.scrollTo({top:0,behavior:'instant'}); }, [screen,index]);
  useEffect(() => { save('werewolf.names',names); }, [names]);
  useEffect(() => { save('werewolf.settings',settings); }, [settings]);
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
  const independentAttackInactive = !!active && ((active.role==='lonewolf' && round%settings.loneWolfInterval!==0) || (active.role==='serialkiller' && round%settings.serialKillerInterval!==0) || (active.role==='thief' && round%settings.thiefAttackInterval!==0));
  const [passiveWaitUntil,setPassiveWaitUntil] = useState(0);
  const [passiveSeconds,setPassiveSeconds] = useState(0);
  useEffect(() => {
    const extra = active ? Number(settings.roleWaitSeconds?.[active.role]) || 0 : 0;
    const durations = [settings.allRolesWait ? Number(settings.allRolesWaitSeconds)||5 : 0, active && settings.passiveWait && passiveRoles.includes(active.role) ? Number(settings.passiveWaitSeconds)||5 : 0, Number.isFinite(extra) ? extra : 0];
    const duration = Math.max(0,Math.min(15,Math.floor(Math.max(...durations))));
    if (screen !== 'action' || !active || duration === 0) { setPassiveWaitUntil(0); setPassiveSeconds(0); return; }
    const end = Date.now() + duration*1000;
    setPassiveWaitUntil(end); setPassiveSeconds(duration);
    const timer = setInterval(() => setPassiveSeconds(Math.max(0, Math.ceil((end - Date.now()) / 1000))), 250);
    return () => clearInterval(timer);
  }, [screen, active?.id, active?.role, settings.passiveWait, settings.passiveWaitSeconds, settings.allRolesWait, settings.allRolesWaitSeconds, settings.roleWaitSeconds]);
  const selectedCount = roleOrder.reduce((sum,r) => sum+counts[r],0) + randomCounts.village + randomCounts.wolf + randomCounts.neutral;
  const adjustRandom = (team: keyof typeof randomCounts, delta: number) => { setRandomCounts(current=>({...current,[team]:Math.max(0,Math.min(names.length,current[team]+delta))})); setResult(''); };
  const adjustRole = (role: Role, delta: number) => { setCounts(current=>({...current,[role]:Math.max(0,Math.min(names.length,current[role]+delta))})); setResult(''); };
  const changeSetting = <K extends keyof Settings,>(key: K, value: Settings[K]) => setSettings(s => ({...s,[key]:value}));
  function distributeRandomly(mode: DistributionMode) { try { const lineup=balancedDistribution(names.length,mode,0,settings.distributionFollowChances,settings.roleChances,Math.random,settings.distributionUniqueRoles,disabledRandomRoles,settings); setCounts(lineup); setRandomCounts({village:0,wolf:0,neutral:0}); setResult(''); } catch(e) { setResult((e as Error).message); } }
  function start() { try { const resolved=resolveRandomRoles(counts,randomCounts,roleOrder,settings.randomFollowChances ? settings.roleChances : {},settings.randomUniqueRoles,Math.random,disabledRandomRoles,(role,resolved,remaining)=>randomPowerWeight(role,resolved,remaining,settings)); const {players:p,madmen:chosenMadmen}=disguiseMadmanCards(deal(names,resolved)); rankingRecorded.current=false; seenPrivateEvents.current.clear(); setTurnInfo([]); setPrivateInfo(null); setRankingError(false); setMadmen(chosenMadmen); descriptionRoles.current=p.map(player=>player.role); setPlayers(p); setRound(1); setLastSaves({}); setMayors([]); setTempleUsed([]); setNecromancerUsed([]); setSheriffUsed([]); setShieldUses({}); setSickLife(Object.fromEntries(p.filter(x=>x.role==='sickman').map(x=>[x.id,settings.sickStartingNights]))); setWatchTargets({}); setPreviousVisits([]); setInstigatorUses({}); setJesterWinner(''); lovers.current={}; friendInitiators.current.clear(); friendInbox.current=[]; friendOutbox.current=[]; setFriendDraft(''); setFriendSent(false); setPrivateReports({}); nextFame.current={}; setLastDetentions({}); setHypnoUsed([]); hypnosisExpiry.current={}; setCorrupted(chosenMadmen); setFailedMayors([]); setStolenRoles({}); setMindWinner(''); mindParasites.current={}; setParasiteStock({}); setConverted([]); setGamblerCorrect({}); setGamblerDebts([]); setGamblerReady([]); setNightEscapes([]); curses.current={}; setEnragedNext(false); beginNight(p,false,chosenMadmen); } catch (e) { setResult((e as Error).message); } }
  function beginNight(p: Player[], rage = enragedNext, currentCorrupted = corrupted) { setEnraged(rage); setEnragedNext(false); nightVisits.current=[]; friendOutbox.current=[]; friendMessagesSent.current.clear(); setFriendSent(false); wolfBallots.current=[]; policeTargets.current={}; policeChoices.current={}; detectiveAttempts.current=[]; provocationAttempts.current=[]; revivalAttempts.current=[]; mayorAttempts.current=[]; fakeMayorAttempts.current=[]; parasiteAttempts.current=[]; parasiteRegens.current=[]; curseAttempts.current=[]; loverAttempts.current=[]; newspaperAttempts.current=[]; pendingReports.current={}; hypnosis.current=[]; fakeDoctorSaves.current={}; thefts.current=[]; infections.current=[]; gamblerBets.current=[]; triggeredCurses.current=[]; setProvocations([]); setFame(p.some(x=>x.alive && x.role==='police') ? nextFame.current : celebrityReveals(p,[],currentCorrupted,Math.random,settings.celebrityAudience)); nextFame.current={}; setQueue(p.filter(x=>x.alive).map(x=>x.id)); setIndex(0); setSelected([]); setWolfVotes([]); setSaves([]); setCurrentSaves({}); setAssembly(false); setAssemblyNames([]); setAssemblyAnnouncementOpen(false); setShots([]); setGuards([]); setBullets([]); setSerials([]); setStrong([]); setLone([]); setVisitors([]); setShields([]); setNewspapers([]); setRevivals([]); setRevived([]); setScreen('nightIntro'); }
  function nextNightTurn(votes: number[], _protectedIds: number[], doctorSaves: Record<number,number>, _nextAssembly = assembly, nextShots = shots, nextRevivals = revivals, nextGuards = guards, nextBullets = bullets, extra = {serials,visitors,shields,strong}, nextLone = lone) {
    setSelected([]);
    if (index+1 < queue.length) { setIndex(index+1); setScreen('pass'); return; }
    const detentions=resolveDetentions(Object.entries(policeTargets.current).map(([actor,target])=>({actor:Number(actor),target})));
    const blocked = new Set(detentions.blocked);
    const allowed = (id:number) => !blocked.has(id);
    const isAttempt = (id:number) => nightVisits.current.some(v=>v.actor===id);
    setLastDetentions(Object.fromEntries(Object.entries(policeChoices.current).filter(([actor])=>allowed(Number(actor)))));
    setPreviousVisits(nightVisits.current.filter(v=>allowed(v.actor)));
    setPrivateReports(Object.fromEntries(Object.entries(pendingReports.current).filter(([actor])=>allowed(Number(actor)))));
    if (players.some(p=>p.alive && p.role==='police')) nextFame.current=celebrityReveals(players,detentions.blocked,corrupted,Math.random,settings.celebrityAudience);
    setNewspapers(newspaperAttempts.current.filter(a=>allowed(a.actor)).map(a=>a.paper));
    setProvocations(provocationAttempts.current.filter(a=>allowed(a.actor) && a.target>=0).map(a=>a.target));
    setWatchTargets(previous=>{
      const next={...previous};
      for (const p of players) if (p.alive && p.role==='detective') delete next[p.id];
      for (const action of detectiveAttempts.current) if (allowed(action.actor)) next[action.actor]=action.target;
      return next;
    });
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
    const nightResult = resolveNight(players, votes, Object.values(actualSaves), actualAssembly, nextShots.filter(a=>allowed(a.actor)), nextGuards.filter(a=>allowed(a.actor)), nextBullets.filter(a=>allowed(a.actor)), {
      serials:extra.serials.filter(a=>allowed(a.actor)),visitors:extra.visitors.filter(a=>allowed(a.actor)),shields:extra.shields.filter(allowed),strong:strongAttacks,
      lone:loneAttacks,packVotes:wolfBallots.current.filter(a=>allowed(a.actor)),enraged,curses:curses.current,
      triggeredCurses:triggeredCurses.current.filter(allowed),thieves:thefts.current.filter(a=>allowed(a.actor)),successfulThefts,lovers:lovers.current,madmen:madmen.filter(id=>corrupted.includes(id)),visitorDangerousRoles:!safeFirstNight && settings.visitorDangerousRoles,visitorAttackedTarget:!safeFirstNight && settings.visitorAttackedTarget,bodyguardProtectAll:settings.bodyguardProtectAll,packAttackLimit:2,randomPackTies:settings.wolfRandomTies,ravenReflectAttackers:settings.ravenReflectAttackers
    });
    const afterDebts = collectGamblerDebts(nightResult,gamblerDebts,actualSaves);
    setGamblerDebts([]);
    const illness = applyIllness(afterDebts, actualSaves, sickLife, corrupted, settings.sickStartingNights, settings.sickDoctorBonus);
    const revivedPlayers = illness.players.map(p => actualRevivals.includes(p.id) ? {...p,alive:true} : p);
    const infectionResult = applyInfections(revivedPlayers, infections.current.filter(a=>allowed(a.actor)));
    const theftResult=applyThefts(players,infectionResult.players,successfulThefts);
    const survived = theftResult.players;
    const escapeResult = resolveGamblerEscapes(survived,gamblerReady,lovers.current);
    const updated = escapeResult.players;
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
      messages.push({title:'YOUR GUESSES',text:`Correct guesses: ${gamblerCorrect[player.id] || 0} / ${settings.gamblerPredictions}.${gamblerDebts.includes(player.id) ? ' People you owe money to are coming tonight. A Doctor must save you.' : ''}${gamblerReady.includes(player.id) ? ' If you live through tonight, you will leave and win in the morning.' : ''}`,shownRole:'gambler'});
    }
    if(player.role==='sickman') messages.push({title:'YOUR HEALTH',text:`You can live ${sickLife[player.id] ?? settings.sickStartingNights} more nights without a Doctor.`,shownRole:'sickman'});
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
    const skipWolf = wolfVoteUnavailable || wolfNoTargets || independentAttackInactive || (['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief'].includes(active.role) && round === 1 && settings.firstNightSafe);
    const required = rabidInfectTurn && enraged ? specialTargetCount : ((['werewolf','wolfpup','whitewolf','hypnowolf'].includes(active.role) || (active.role==='rabidwolf' && round>1)) && enraged && !skipWolf) ? packTargetCount : active.role === 'chef' ? (canChefAct(players,active.id) ? 2 : 0) : (['villager','muted','mayor','jester','survivor','celebrity','sickman','journalist','intelligence'].includes(active.role) || rabidInactive || whiteWolfNoTargets || (active.role === 'police' && !policeCanChoose) || (active.role === 'charmer' && !charmerCanChoose) || (active.role === 'mindflayer' && !mindCanPlace) || (active.role === 'raven' && players.every(p=>!p.alive || p.id===active.id || (curses.current[active.id] || []).includes(p.id))) || (active.role === 'necromancer' && (necromancerUsed.filter(id=>id===active.id).length >= settings.necromancerUses || players.every(p=>p.alive || p.escaped))) || (active.role === 'templar' && templeUsed.filter(id=>id===active.id).length >= settings.templarUses) || (active.role === 'sheriff' && !settings.sheriffEveryNight && sheriffUsed.includes(active.id)) || (active.role === 'instigator' && (instigatorUses[active.id] || 0) >= settings.instigatorMaxUses) || skipWolf ? 0 : 1);
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
    if (active.role==='thief' && !skipWolf) { thefts.current.push({actor:active.id,target:selected[0]}); nextNightTurn(votes,protections,doc); return; }
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
    const next=[...ballots,vote,...(active && settings.mayorDoubleVote && mayors.includes(active.id) ? [vote] : [])]; setBallots(next); setSelected([]);
    if (index+1 < queue.length) {setIndex(index+1);setScreen('vote');return;}
    const id=tally(next), victim=players.find(p=>p.id===id && p.alive);
    const afterVote=players.map(p=>p.id===id ? {...p,alive:false} : p);
    const settled=settleGamblerBets(afterVote,id,gamblerBets.current,gamblerCorrect,lovers.current,settings.gamblerPredictions);
    setGamblerCorrect(settled.correct); setGamblerDebts(settled.indebted); setGamblerReady([...new Set([...gamblerReady,...settled.ready])]); gamblerBets.current=[];
    setPlayers(settled.players); if (victim?.role==='wolfpup') setEnragedNext(true);
    const mindWinnerId=mindFlayerWinner(settled.players,mindParasites.current,lovers.current);
    if (mindWinnerId !== null) setMindWinner(settled.players.find(p=>p.id===mindWinnerId)?.name || '');
    setWon(victim?.role==='jester' && lovers.current[victim.id]===undefined ? 'jester' : mindWinnerId !== null ? 'mindflayer' : winner(settled.players,lovers.current)); if (victim?.role === 'jester' && lovers.current[victim.id]===undefined) setJesterWinner(victim.name);
    const announcement=victim ? `${victim.name} was voted out${settings.revealDead ? ` — ${roles[victim.role].name}` : ''}.` : 'No one was voted out. The vote was tied or more players chose to skip.';
    setResult(announcement);
    setScreen('voteResult');
  }
  const canSelect = (p: Player) => !!active && !(active.role==='police' && !canDetain(players,active.id,p.id,settings.policeRepeatTarget ? {} : lastDetentions)) && !(active.role==='charmer' && lovers.current[p.id]!==undefined) && !(['werewolf','wolfpup','whitewolf','hypnowolf','rabidwolf','strongwolf','lonewolf','serialkiller','sheriff','templar','thief','raven'].includes(active.role) && lovers.current[active.id]===p.id) && !(active.role==='mindflayer' && (mindParasites.current[active.id] || []).includes(p.id)) && !(active.role==='raven' && (curses.current[active.id] || []).includes(p.id)) && (active.role === 'necromancer' ? !p.alive && !p.escaped && !revivals.includes(p.id) : p.alive) && ((active.role === 'doctor' && settings.doctorSelfProtect) || p.id !== active.id) && canWolfTarget(packIdentity(active),packIdentity(p),settings.whiteWolfBetrayPack,lovers.current[active.id]!==undefined && (['werewolf','rabidwolf','strongwolf','whitewolf'].includes(active.role) || (active.role==='lonewolf' && active.joinedPack)) && !rabidInfectTurn) && !(active.role==='doctor' && !settings.doctorRepeatProtect && lastSaves[active.id]===p.id);
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
  const targetGrid = (interactive:boolean) => <div className="targets">{players.map(p=>{
    const isPack = !!active && packView && knownPlayerPackmates(active,p);
    const markers = wolfChoicesFor(p.id);
    const chosen = selected.includes(p.id);
    return <button key={p.id} className={`target ${chosen?'selected':''} ${!p.alive?'dead':''} ${isPack?'wolf-teammate':''} ${packView?'wolf-target-card':''}`} disabled={!interactive || !canSelect(p)} onClick={()=>toggleTarget(p.id)}>
      <span className="target-number" aria-hidden="true">#{String(p.id+1).padStart(2,'0')}</span>
      {isPack && <span className="wolf-team-badge" aria-label={`${p.name} is ${packRoleName(p)}`}>WOLF</span>}
      {markers.length>0 && <span className="wolf-target-count" aria-label={`${markers.length} teammate ${markers.length===1?'choice':'choices'}`}>♟ {markers.length}</span>}
      <Avatar name={p.name} avatars={avatars} className="target-avatar"/>
      {(markers.length>0 || (packView && chosen)) && <span className="wolf-choice-markers">{markers.map(({actor,action})=><span key={actor.id} className={`wolf-choice wolf-color-${actor.id%8}`} title={`${actor.name} chose this player to ${action}`} aria-label={`${actor.name} chose ${p.name} to ${action}`}>#{String(actor.id+1).padStart(2,'0')} {action==='attack'?'A':action==='hypnotize'?'H':'I'}</span>)}{packView && chosen && <span className={`wolf-choice wolf-color-${active!.id%8}`} aria-label={`Your choice: ${p.name}`}>#{String(active!.id+1).padStart(2,'0')} YOU</span>}</span>}
      <strong>{p.name}</strong>{!p.alive && <small>{p.escaped ? 'ESCAPED' : 'DEAD'}</small>}
    </button>;
  })}</div>;
  const packReadOnly = !!active && packView && (active.role==='wolfpup' || (active.role==='hypnowolf' && !hypnoAvailable) || (active.role!=='hypnowolf' && (rabidInactive || independentAttackInactive || whiteWolfNoTargets || wolfNoTargets || (safeFirstNight && ['werewolf','whitewolf','strongwolf'].includes(active.role)))));

  const gameScreen = ['nightIntro','pass','action','privateResult','morning','discussion','vote','voteResult','end'].includes(screen);
  const backHome = () => { if (window.confirm('End this game and return to the menu?')) setScreen('home'); };
  return <main className={`app screen-${screen} ${screen==='home'?'home':['rules','players','roles'].includes(screen)?'menu': ['discussion','vote','voteResult','end'].includes(screen)?'day':'night'}`}>
    {gameScreen && <button type="button" className="game-rulebook-button" aria-label="Open role rulebook" onClick={()=>setRoleBookOpen(true)}><BookOpen size={21} aria-hidden="true"/></button>}
    {roleBookOpen && <RoleRulebook settings={settings} order={displayRoleOrder} onClose={()=>setRoleBookOpen(false)}/>}
    <div className="shell">
      {screen!=='home' && screen!=='players' && screen!=='morning' && screen!=='voteResult' && screen!=='end' && <header className={screen==='roles'?'role-page-header':gameScreen?'game-header':undefined}><button className="back" aria-label="Go back" onClick={() => { if(screen==='rules') setScreen('home'); else if(screen==='roles') setScreen('players'); else backHome(); }}>‹</button><span>{screen==='rules'?'RULEBOOK':screen==='roles'?<><strong>CHOOSE ROLES</strong><small>Roles for {names.length} players</small></>:`WEREWOLF · NIGHT ${round}`}</span>{(audioPhase || screen==='vote') && <button className="sound-control" aria-label={soundOn?'Mute game sounds':'Enable game sounds'} aria-pressed={soundOn} onClick={()=>{const enabled=!soundOn;if (enabled && audioPhase) playPhase(audioPhase); else audio.current?.pause();setSettings(s=>({...s,sounds:enabled,buttonSounds:enabled}));}}>{soundOn?'♫ ON':'♫ OFF'}</button>}</header>}
      {screen==='home' && <div className="home-content"><h1 className="visually-hidden">WEREWOLF</h1><div className="home-buttons"><button className="home-button home-start" onClick={()=>setScreen('players')}><Play aria-hidden="true" size={19} fill="currentColor" strokeWidth={2}/><span>START GAME</span></button><button className="home-button home-rules" onClick={()=>setScreen('rules')}><BookOpen aria-hidden="true" size={19} fill="currentColor" strokeWidth={2}/><span>HOW TO PLAY</span></button><button className="home-button home-rules" onClick={()=>setRoleBookOpen(true)}><BookOpen aria-hidden="true" size={19}/><span>ROLE RULEBOOK</span></button></div></div>}
      {screen==='rules' && <div className="page"><h2>THE RULEBOOK</h2><div className="panel"><h3>Gather the players</h3><p>4–24 players share one phone. Keep your role secret and pass the phone when prompted.</p></div><div className="panel"><h3>Choose your roles</h3><p>Select one role per player. The game randomly assigns the chosen roles.</p></div><div className="panel"><h3>Night, discussion and voting</h3><p>Each player privately takes a turn at night. In the morning, discuss the news, then pass the phone around to vote. If there is a tie, no one is voted out.</p></div><div className="panel"><h3>Winning</h3><p>The village wins when all werewolves are gone. Werewolves win when they equal or outnumber the remaining villagers.</p></div><div className="panel"><h3>Current edition</h3><p>A Madman card becomes a secret village disguise until the game ends. This playable reconstruction includes Werewolf, Villager, Madman, Doctor, Seer, Chef, Mayor, Wolf Hunter, Muted, Jester, Necromancer, Bodyguard, Sheriff, Serial Killer, Visitor, Survivor, Team Checker, Celebrity, Detective, Vote Marker, Strong Werewolf, Sick Man, Lone Werewolf, Wolf Pup, News Maker, Raven, Infecting Wolf, White Werewolf, Gambler, Mind Flayer, Intelligence Chief, Thief, Police, Hypnotizer Wolf and Friends Maker. Other original roles and settings are not yet implemented.</p></div><button className="primary" onClick={()=>setScreen('home')}>GOT IT</button></div>}
      {screen==='roles' && detailRandom && <RandomRoleDetails team={detailRandom} settings={settings} onSetting={changeSetting} onClose={()=>setDetailRandom(null)}/>}
      {screen==='roles' && detailRole && <RoleDetails role={detailRole} roleList={displayRoleOrder} settings={settings} celebritySkin={celebritySkin} onCelebritySkinChange={setCelebritySkin} charmerSkin={charmerSkin} onCharmerSkinChange={setCharmerSkin} onSetting={changeSetting} onClose={()=>setDetailRole(null)}/>}
      {screen==='players' && <PlayerSetup onBack={()=>setScreen('home')} names={names} setNames={setNames} avatars={avatars} setAvatars={setAvatars} onContinue={()=>{setCounts(emptyRoleCounts());setRandomCounts({village:0,wolf:0,neutral:0});setResult('');setScreen('roles');}}/>}
      {screen==='roles' && <div className="page role-page">
        <details className="role-settings-panel" open><summary><SettingsIcon size={20}/> GAME SETTINGS</summary>
          <div className="role-settings-list">
            <button type="button" className="distribution-button" aria-expanded={distributionOpen} aria-controls="distribution-options" onClick={()=>setDistributionOpen(open=>!open)}><Shuffle size={18} aria-hidden="true"/> RANDOM DISTRIBUTION <span aria-hidden="true">{distributionOpen?'⌃':'⌄'}</span></button>
            {distributionOpen && <div id="distribution-options" className="distribution-options">
              <p>Choose a point-based lineup. Easy favors stronger Villagers; Hard favors stronger Werewolves. Neutral roles are included for 5 or more players. Estimates are not guaranteed win rates.</p>
              <div className="distribution-modes">{([['easy','EASY','Favors Villagers'],['balanced','BALANCED','Even matchup'],['hard','HARD','Favors Werewolves']] as const).map(([mode,title,description])=><button key={mode} type="button" className={`distribution-mode distribution-mode-${mode}`} onClick={()=>distributeRandomly(mode)}><strong>{title}</strong><small>{description}</small></button>)}</div>
              <label className="setting-row distribution-chance-setting"><span className="setting-copy"><strong>Distribution follows role chances</strong><small>Use the sliders in role settings. A 0% role is excluded; other values are chances compared with each other.</small></span><span className="setting-check"><input type="checkbox" aria-label="Distribution follows role chances" checked={settings.distributionFollowChances} onChange={e=>changeSetting('distributionFollowChances',e.target.checked)}/><span className="setting-check-visual" aria-hidden="true"><Check className="setting-check-on" size={18}/><Minus className="setting-check-off" size={18}/></span></span></label>
              <label className="setting-row distribution-chance-setting"><span className="setting-copy"><strong>One player per role</strong><small>Automatic distribution assigns each role at most once.</small></span><span className="setting-check"><input type="checkbox" aria-label="One player per distribution role" checked={settings.distributionUniqueRoles} onChange={e=>changeSetting('distributionUniqueRoles',e.target.checked)}/><span className="setting-check-visual" aria-hidden="true"><Check className="setting-check-on" size={18}/><Minus className="setting-check-off" size={18}/></span></span></label>
            </div>}
            {([
              ['revealDead',"Show dead player’s role",'Display the roles of players who die.',Eye],
              ['secretVotes','Secret voting','Hide vote counts on the voting screen.',EyeOff],
              ['allowSkip','Allow skip vote','Players can pass without voting for anyone.',SkipForward],
              ['firstNightSafe','No first night kill','Attacks and dangerous visits cannot kill on the first night. Some other abilities still work.',Shield],
              ['passiveWait','Wait time for passive roles','Players with no night action must wait before skipping.',Timer],
              ['allRolesWait','Wait time for every role','All players must wait before completing their turn.',Timer],
              ['sounds','Background music','Play music at night and in the morning.',Volume2],
              ['buttonSounds','Button sounds','Play a short sound when you tap.',Volume2],
              ['haptics','Button vibration','A short vibration when you tap. Works on supported phones.',Vibrate]
            ] as const).map(([key,label,description,Icon])=><label className="setting-row" key={key}><span className="setting-icon"><Icon size={20}/></span><span className="setting-copy"><strong>{label}</strong><small>{description}</small></span><span className="setting-check"><input type="checkbox" aria-label={label} checked={settings[key]} onChange={e=>changeSetting(key,e.target.checked)}/><span className="setting-check-visual" aria-hidden="true"><Check className="setting-check-on" size={18}/><Minus className="setting-check-off" size={18}/></span></span></label>)}
            {settings.passiveWait && <label className="wait-duration"><span>{settings.passiveWaitSeconds || 5} seconds</span><input type="range" aria-label="Passive role wait seconds" min="1" max="15" step="1" value={settings.passiveWaitSeconds || 5} onChange={e=>changeSetting('passiveWaitSeconds',Number(e.target.value))}/></label>}
            {settings.allRolesWait && <label className="wait-duration"><span>{settings.allRolesWaitSeconds || 5} seconds</span><input type="range" aria-label="Every role wait seconds" min="1" max="15" step="1" value={settings.allRolesWaitSeconds || 5} onChange={e=>changeSetting('allRolesWaitSeconds',Number(e.target.value))}/></label>}
            <div className="setting-row number-setting"><span className="setting-icon"><Timer size={20}/></span><span className="setting-copy"><strong>Discussion minutes</strong><small>Time for the village to discuss.</small></span><SettingsNumberInput label="Discussion minutes" min={1} max={15} value={settings.discussionMinutes} onChange={value=>changeSetting('discussionMinutes',value)}/></div>

          </div>
        </details>
        <p className="role-hold-hint">Hold a role for ½ second to remove it from random picks. Hold again to bring it back. You can still add it yourself.</p>{([['village','VILLAGERS',Shield],['wolf','WEREWOLVES',Moon],['neutral','NEUTRALS',Sword]] as const).map(([team,label,Icon])=><section key={team} className={`role-section role-team-${team}`}><h3 className="section-title"><span className="section-icon"><Icon size={19}/></span><span>{label}</span><small>{roleOrder.filter(r=>roles[r].team===team).length} / {roleOrder.length} ROLES</small></h3><div className="role-grid"><div className="role-choice random-role-choice"><button type="button" className="role-info-button random-role-card" aria-label={`View random ${label} details`} onClick={()=>setDetailRandom(team)}><span className="role-card-badge"><Icon size={15}/></span><span className="random-role-art" aria-hidden="true">?</span><strong>RANDOM</strong></button><div className="stepper"><button aria-label={`Remove random ${label} role`} onClick={()=>adjustRandom(team,-1)}>−</button><span>{randomCounts[team]}</span><button aria-label={`Add random ${label} role`} onClick={()=>adjustRandom(team,1)}>+</button></div></div>{roleOrder.filter(r=>roles[r].team===team).map(r=><div className="role-choice" key={r}><RoleCard role={r} name={roles[r].name} picture={picture(r)} power={rolePower(r,settings)} icon={<Icon size={15}/>} excluded={disabledRandomRoles.includes(r)} onOpen={()=>setDetailRole(r)} onToggle={()=>toggleRandomRole(r)}/><div className="stepper"><button aria-label={`Remove ${roles[r].name}`} onClick={()=>adjustRole(r,-1)}>−</button><span>{counts[r]}</span><button aria-label={`Add ${roles[r].name}`} onClick={()=>adjustRole(r,1)}>+</button></div></div>)}</div></section>)}
        <p className="muted">Select exactly one role per player. Random cards choose a role from their team when the game starts; duplicates are possible. Werewolves must be fewer than half of the players.</p>
        <div className="role-start-bar">{result && <p className="warning" role="alert">{result}</p>}<button className="role-start-button" aria-label={`START GAME ${selectedCount} / ${names.length}`} disabled={selectedCount!==names.length} onClick={start}>{selectedCount===names.length && <span>▶ &nbsp; START GAME &nbsp;</span>}<span className="role-start-count">{selectedCount} / {names.length} roles selected</span></button></div>
      </div>}
      {screen==='nightIntro' && <div className="center night-intro"><div className="modal"><div className="symbol">☾</div><h2>NIGHT {round} STARTED</h2><p>Everyone is sleeping. Pass the phone around so each player can use their role privately.</p><button className="primary" onClick={()=>setScreen('pass')}>CONTINUE →</button></div></div>}
      {screen==='pass' && active && <div className="center player-pass"><Avatar name={active.name} avatars={avatars} className="pass-avatar"/><h2>{active.name}</h2><p className="muted">Pass the phone to this player. No peeking!</p><button className="primary" onClick={()=>openPrivateTurn(active)}>◉ &nbsp; SHOW YOUR ROLE</button></div>}
      {(screen==='action' || screen==='privateResult') && active && <div className={`page action action-team-${roles[active.role].team}`}><fieldset className="role-turn-content" disabled={passiveSeconds>0 || turnInfo.length>0 || screen==='privateResult'}><div className="role-art-frame"><img className="role-art" src={picture(active.role)} alt=""/><span className="role-power-game" aria-label={`Power ${rolePower(active.role,settings)} out of 10, estimated for current settings`}>{rolePower(active.role,settings)}</span></div><h2 className={roles[active.role].team==='wolf'?'red':'green'}>{roles[active.role].name}</h2><div className="panel description"><small>DESCRIPTION</small><p>{turnRoleDescription(active.role, settings,round,packmates.length,{matchRoles:descriptionRoles.current,hypnoUsesLeft:settings.hypnoMaxUses===0 ? undefined : Math.max(0,settings.hypnoMaxUses-hypnoUsed.filter(id=>id===active.id).length),enraged,joinedPack:active.joinedPack,hasFriend:lovers.current[active.id]!==undefined})}</p>{active.role==='doctor' && <details className="madman-explanation"><summary>WHEN MADMAN (CANNOT DO)?</summary><p>A Madman Doctor's protection does not work.</p></details>}{active.role==='mayor' && <details className="madman-explanation"><summary>WHEN MADMAN (CANNOT DO)?</summary><p>A Madman Mayor can try to declare an assembly, but it provides no protection and no public announcement.</p></details>}{active.role==='chef' && <details className="madman-explanation"><summary>WHEN MADMAN (CANNOT DO)?</summary><p>A Madman Chef may get a wrong answer about their guests.</p></details>}</div>{enraged && !wolfVoteUnavailable && !rabidInfectTurn && (['werewolf','wolfpup','whitewolf','hypnowolf'].includes(active.role) || (active.role==='rabidwolf' && round>1)) && <div className="panel">The Werewolves can attack more players: choose {packTargetCount} {packTargetCount===1?'target':'targets'} tonight.</div>}{stolenRoles[active.id] && <div className="panel">You stole this role and joined its team.</div>}{converted.includes(active.id) && <div className="panel">The Infecting Wolf turned you into a Werewolf. {lovers.current[active.id]!==undefined ? 'You are still on the Friends team.' : 'You are now on the Werewolf team.'}</div>}{privateReports[active.id] && <div className="panel"><small>PREVIOUS NIGHT REPORT</small><p>{privateReports[active.id].text}</p></div>}{active.role==='charmer' && settings.charmerMessages && messageFriend && !friendSent && !friendMessagesSent.current.has(active.id) && <section className="friend-message-compose" aria-label="Message your friend"><label htmlFor="friend-message">Message to {messageFriend.name}</label><textarea id="friend-message" value={friendDraft} onChange={event=>setFriendDraft(event.target.value)} placeholder="Write a private message" rows={3}/><p>One message per night. If you are not blocked, your living friend can read it next night and reply once in the popup. For a new friend, send it before completing your choice.</p><button type="button" disabled={!friendDraft.trim()} onClick={()=>sendFriendMessage(active.id,messageFriend.id,friendDraft,true)}>SEND MESSAGE</button></section>}{active.role==='charmer' && settings.charmerMessages && friendSent && <p className="friend-message-sent" role="status">Message ready for next night. You cannot send again tonight.</p>}{lovers.current[active.id] !== undefined && <div className="panel">Your friend: {players.find(p=>p.id===lovers.current[active.id])?.name}. You are on the Friends team. {players.find(p=>p.id===lovers.current[active.id])?.alive ? 'Your friend is alive.' : 'Your friend has died, but you can still win.'}</div>}{lovers.current[active.id] !== undefined && (['werewolf','rabidwolf','strongwolf','whitewolf'].includes(active.role) || (active.role==='lonewolf' && active.joinedPack)) && <div className="panel">You can attack Werewolves you know. They still see you as a teammate. You cannot attack your friend.</div>}{active.role==='chef' && !canChefAct(players,active.id) && <div className="panel">Not enough other living players to invite tonight.</div>}{active.role==='visitor' && safeFirstNight && <div className="panel">First-night safety prevents deaths from visiting tonight.</div>}{players.some(p=>p.alive && p.role==='police') && ['seer','psychic','chef','intelligence','mindflayer'].includes(active.role) && <div className="panel">Your result will appear on your next turn.</div>}{active.role==='intelligence' && <div className="panel">{round%settings.intelligenceInterval===0 ? 'Your player report is ready. It may be wrong.' : `No player report tonight. Reports come every ${settings.intelligenceInterval} ${settings.intelligenceInterval===1?'night':'nights'}.`}</div>}{active.role==='mindflayer' && <div className="panel">Tiny creatures left: {parasiteStock[active.id] ?? settings.mindStartingParasites}. Players with a tiny creature: {(mindParasites.current[active.id] || []).map(id=>players.find(p=>p.id===id)).filter(p=>p?.alive).map(p=>p!.name).join(', ') || 'None'}.</div>}{active.role==='gambler' && <div className="panel">Correct predictions: {gamblerCorrect[active.id] || 0} / {settings.gamblerPredictions}.{gamblerDebts.includes(active.id) ? ' People you owe money to are coming tonight. A Doctor must save you.' : ''}{gamblerReady.includes(active.id) ? ' If you live through tonight, you will leave and win in the morning.' : ''}</div>}{(whiteWolfNoTargets || wolfNoTargets) && <div className="panel">There is no player you can attack tonight.</div>}{active.role==='charmer' && round<settings.charmerFirstNight && <div className="panel">You can choose a friend starting on night {settings.charmerFirstNight}.</div>}{independentAttackInactive && <div className="panel">You cannot attack on your own tonight. Your attack is available every {active.role==='lonewolf' ? settings.loneWolfInterval : active.role==='serialkiller' ? settings.serialKillerInterval : settings.thiefAttackInterval} nights.</div>}{active.role==='rabidwolf' && (round===1 || rabidInfectTurn) && <div className="panel">{rabidInfectTurn ? `Choose ${specialTargetCount} ${specialTargetCount===1?'player':'players'} to turn into Werewolves tonight.` : 'You cannot turn anyone into a Werewolf tonight.'}</div>}{active.role==='sickman' && <div className="panel">Nights remaining without a Doctor visit: {sickLife[active.id] ?? settings.sickStartingNights}.</div>}{active.role==='detective' && watchTargets[active.id] !== undefined && corrupted.includes(active.id) && <div className="panel">Last night’s visitors to {players.find(p=>p.id===watchTargets[active.id])?.name}: {settings.detectiveShowNames ? 'None' : '0 visitors'}</div>}{active.role==='detective' && !corrupted.includes(active.id) && watchTargets[active.id] !== undefined && <div className="panel">Last night’s visitors to {players.find(p=>p.id===watchTargets[active.id])?.name}: {settings.detectiveShowNames ? visitorsTo(previousVisits,watchTargets[active.id]).map(id=>players.find(p=>p.id===id)?.name).filter(Boolean).join(', ') || 'None' : `${visitorsTo(previousVisits,watchTargets[active.id]).length} ${visitorsTo(previousVisits,watchTargets[active.id]).length===1?'visitor':'visitors'}`}</div>}{fame[active.id]?.length > 0 && <div className="panel">You recognize {fame[active.id].join(', ')} as a Celebrity.</div>}{packView && <div className="panel wolf-team-list"><small>YOUR TEAM</small>{packmates.length ? packmates.map(p=><div key={p.id}><span className={`wolf-team-key wolf-color-${p.id%8}`}>#{String(p.id+1).padStart(2,'0')}</span> <strong>{p.name}</strong> is {packRoleName(p)}</div>) : <div>You are the only living Werewolf you know.</div>}<p>Numbers mark each teammate’s choice. A = attack, H = hypnotize, I = infect.</p></div>}{['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief'].includes(active.role) && !wolfVoteUnavailable && round===1 && settings.firstNightSafe && <div className="panel">No killing ability on the first night.{['werewolf','wolfpup','strongwolf','rabidwolf','whitewolf','hypnowolf'].includes(active.role) ? ' Meet your teammates.' : ''}</div>}{!['villager','muted','mayor','jester','survivor','celebrity','sickman','journalist','intelligence'].includes(active.role) && !rabidInactive && !independentAttackInactive && !whiteWolfNoTargets && !wolfNoTargets && !(active.role==='police' && !policeCanChoose) && !(active.role==='charmer' && !charmerCanChoose) && !wolfVoteUnavailable && !(active.role==='chef' && !canChefAct(players,active.id)) && !(active.role==='mindflayer' && !mindCanPlace) && !(active.role==='raven' && players.every(p=>!p.alive || p.id===active.id || (curses.current[active.id] || []).includes(p.id))) && !(active.role==='necromancer' && (necromancerUsed.filter(id=>id===active.id).length >= settings.necromancerUses || players.every(p=>p.alive || p.escaped))) && !(active.role==='templar' && templeUsed.filter(id=>id===active.id).length >= settings.templarUses) && !(active.role==='sheriff' && !settings.sheriffEveryNight && sheriffUsed.includes(active.id)) && !(active.role==='instigator' && (instigatorUses[active.id]||0)>=settings.instigatorMaxUses) && !(['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief'].includes(active.role) && round===1 && settings.firstNightSafe) && <><p className="muted">{active.role==='chef' ? `Choose two players (${selected.length}/2)` : rabidInfectTurn && enraged ? `Choose ${specialTargetCount} players to turn into Werewolves (${selected.length}/${specialTargetCount})` : enraged && (['werewolf','wolfpup','whitewolf','hypnowolf'].includes(active.role) || (active.role==='rabidwolf' && round>1)) ? `Choose ${packTargetCount} targets (${selected.length}/${packTargetCount})` : active.role==='necromancer' ? 'Choose a dead player to revive' : active.role==='gambler' ? 'Bet on a living player: a death tonight or a vote-out tomorrow counts' : 'Choose a player'}</p>{targetGrid(true)}</>}{active.role==='hypnowolf' && hypnoAvailable && <><p className="muted">Choose {specialTargetCount} {specialTargetCount===1?'player':'players'} to hypnotize. It works on villagers starting in the next night.</p>{targetGrid(true)}</>}{packReadOnly && <><p className="muted">Your teammates’ choices tonight</p>{targetGrid(false)}</>}{active.role==='raven' && <div className="panel">Marked: {(curses.current[active.id] || []).map(id=>players.find(p=>p.id===id)).filter(p=>p?.alive).map(p=>p!.name).join(', ') || 'None'}</div>}{active.role==='raven' && (curses.current[active.id] || []).some(id=>players.some(p=>p.id===id && p.alive)) && <button className="secondary" onClick={()=>{triggeredCurses.current.push(active.id);nextNightTurn(wolfVotes,saves,currentSaves);}}>ACTIVATE CURSE</button>}{active.role==='survivor' && safeFirstNight && <div className="panel">Your shields are saved for later nights while first-night safety is on.</div>}{active.role==='survivor' && !safeFirstNight && (shieldUses[active.id] || 0) < settings.survivorShieldCount && <button className="secondary" onClick={()=>{const next=[...shields,active.id]; setShields(next); setShieldUses({...shieldUses,[active.id]:(shieldUses[active.id]||0)+1});nextNightTurn(wolfVotes,saves,currentSaves,assembly,shots,revivals,guards,bullets,{serials,visitors,shields:next,strong});}}>USE SHIELD ({settings.survivorShieldCount-(shieldUses[active.id]||0)} LEFT)</button>}{active.role==='survivor' && (shieldUses[active.id] || 0) >= settings.survivorShieldCount && <div className="panel">No shields remaining.</div>}{active.role==='mayor' && <MayorAbility safe={safeFirstNight} used={mayors.includes(active.id) || failedMayors.includes(active.id)} doubleVote={settings.mayorDoubleVote} onDeclare={()=>{if(Date.now()<passiveWaitUntil || turnInfo.length>0)return; if(corrupted.includes(active.id))fakeMayorAttempts.current.push(active.id);else mayorAttempts.current.push(active.id);nextNightTurn(wolfVotes,saves,currentSaves);}} onPass={completeAction}/>}{active.role==='templar' && templeUsed.filter(id=>id===active.id).length >= settings.templarUses && <div className="panel">Your water has already been used.</div>}{active.role==='journalist' && <JournalistEditor key={active.id} allowDrawing={settings.journalistDrawing} onSubmit={paper=>{if(!corrupted.includes(active.id) && (paper.headline || paper.drawing)) newspaperAttempts.current.push({actor:active.id,paper}); nextNightTurn(wolfVotes,saves,currentSaves);}}/>}<p className="muted tip">Pass the phone to the next player after completing your action.</p>{passiveSeconds > 0 && <div className="wait-card" role="status"><Timer aria-hidden="true"/><strong>{passiveSeconds}</strong><span>{passiveSeconds} seconds wait</span></div>}{active.role!=='journalist' && active.role!=='mindflayer' && active.role!=='hypnowolf' && active.role!=='mayor' && <button className="primary bottom" onClick={completeAction} disabled={passiveSeconds > 0 || (active.role==='chef'?canChefAct(players,active.id) && selected.length!==2:enraged && !wolfVoteUnavailable && (['werewolf','wolfpup','whitewolf','hypnowolf'].includes(active.role) || (active.role==='rabidwolf' && round>1)) && !(round===1&&settings.firstNightSafe)?selected.length!==packTargetCount:['villager','muted','mayor','jester','survivor','celebrity','sickman','journalist','intelligence'].includes(active.role)||wolfVoteUnavailable||rabidInactive||independentAttackInactive||whiteWolfNoTargets||wolfNoTargets||(active.role==='police' && !policeCanChoose)||(active.role==='charmer' && !charmerCanChoose)||(active.role==='raven' && players.every(p=>!p.alive || p.id===active.id || (curses.current[active.id] || []).includes(p.id)))||(active.role==='necromancer'&&(necromancerUsed.filter(id=>id===active.id).length >= settings.necromancerUses||players.every(p=>p.alive || p.escaped)))||(active.role==='templar'&&templeUsed.filter(id=>id===active.id).length >= settings.templarUses)||(active.role==='sheriff'&&!settings.sheriffEveryNight&&sheriffUsed.includes(active.id))||(active.role==='instigator'&&(instigatorUses[active.id]||0)>=settings.instigatorMaxUses)||(['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief'].includes(active.role)&&round===1&&settings.firstNightSafe)?false:selected.length!==1)}>{(active.role==='chef' && !canChefAct(players,active.id)) || ['villager','muted','mayor','jester','survivor','celebrity','sickman','journalist','intelligence'].includes(active.role)||wolfVoteUnavailable||rabidInactive||independentAttackInactive||whiteWolfNoTargets||wolfNoTargets||(active.role==='police' && !policeCanChoose)||(active.role==='charmer' && !charmerCanChoose)||(active.role==='raven' && players.every(p=>!p.alive || p.id===active.id || (curses.current[active.id] || []).includes(p.id)))||(active.role==='necromancer'&&(necromancerUsed.filter(id=>id===active.id).length >= settings.necromancerUses||players.every(p=>p.alive || p.escaped)))||(active.role==='templar'&&templeUsed.filter(id=>id===active.id).length >= settings.templarUses)||(active.role==='sheriff'&&!settings.sheriffEveryNight&&sheriffUsed.includes(active.id))||(active.role==='instigator'&&(instigatorUses[active.id]||0)>=settings.instigatorMaxUses)||(['werewolf','wolfpup','whitewolf','hypnowolf','strongwolf','lonewolf','sheriff','templar','serialkiller','thief'].includes(active.role)&&round===1&&settings.firstNightSafe)?(active.role==='intelligence' && round%settings.intelligenceInterval===0?'VIEW INTEL':'SKIP'):'COMPLETE ACTION'}</button>}{active.role==='hypnowolf' && hypnoAvailable && <><button className="primary bottom" disabled={specialTargetCount===0 || selected.length!==specialTargetCount || passiveSeconds>0} onClick={()=>{for(const target of selected){hypnosis.current.push({actor:active.id,target});nightVisits.current.push({actor:active.id,target});}setHypnoUsed([...hypnoUsed,active.id]);nextNightTurn(wolfVotes,saves,currentSaves);}}>HYPNOTIZE</button><button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SAVE HYPNOSIS FOR LATER</button></>}{active.role==='hypnowolf' && !hypnoAvailable && <><div className="panel">Your hypnosis has been used.</div><button className="primary bottom" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SKIP</button></>}{active.role==='mindflayer' && mindCanPlace && <button className="primary bottom" disabled={selected.length!==1} onClick={completeAction}>PLACE TINY CREATURE</button>}{active.role==='mindflayer' && <button className="secondary" onClick={()=>{const before=parasiteStock[active.id] ?? settings.mindStartingParasites;const after=regenerateParasite(before,Math.random,settings.mindRegenPercent/100);parasiteRegens.current.push({actor:active.id,amount:after-before});setParasiteStock({...parasiteStock,[active.id]:after});showPrivateResult(active.id,after>before ? 'You got one tiny creature.' : 'You did not get a tiny creature tonight.');}}>SKIP AND TRY TO GET ONE</button>}{active.role==='police' && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SKIP BLOCK</button>}{active.role==='thief' && !independentAttackInactive && !(round===1 && settings.firstNightSafe) && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SKIP THEFT</button>}{active.role==='gambler' && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SKIP BET</button>}{active.role==='instigator' && (instigatorUses[active.id]||0)<settings.instigatorMaxUses && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SAVE FOR LATER</button>}{active.role==='necromancer' && necromancerUsed.filter(id=>id===active.id).length < settings.necromancerUses && players.some(p=>!p.alive && !p.escaped) && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SAVE REVIVAL FOR LATER</button>}{active.role==='sheriff' && (settings.sheriffEveryNight || !sheriffUsed.includes(active.id)) && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SAVE BULLET FOR LATER</button>}{active.role==='templar' && templeUsed.filter(id=>id===active.id).length < settings.templarUses && <button className="secondary" onClick={()=>nextNightTurn(wolfVotes,saves,currentSaves)}>SAVE WATER FOR LATER</button>}</fieldset></div>}
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
        {morningBlocked.length>0 && <div className="morning-news" aria-label="Blocked abilities"><h3>WHO WAS BLOCKED</h3>{morningBlocked.map(p=><p key={p.id}>{p.name}'s ability was blocked last night</p>)}</div>}
        {nightEscapes.length > 0 && <div className="morning-news"><p>{nightEscapes.join(', ')} left the village and won</p></div>}
        {newspapers.map((paper,i)=><article className="newspaper" key={i}><small>THE MORNING PAPER</small><h3>{paper.headline || 'The village news'}</h3>{paper.drawing && <img src={paper.drawing} alt="Newspaper drawing"/>}</article>)}
        {provocations.length > 0 && <div className="morning-news"><p>{provocations.map(id=>players.find(p=>p.id===id)?.name).filter(Boolean).join(', ')} {provocations.length===1?'starts':'start'} the vote with two votes against them</p></div>}
        {revived.length > 0 && <div className="morning-news"><p>{revived.map(p=>p.name).join(', ')} came back to life</p></div>}
        {assemblyNames.length > 0 && <div className="morning-news"><p>{assemblyNames.join(', ')} called an emergency meeting</p></div>}
        <div className="morning-footer"><button className="morning-ok" disabled={assemblyAnnouncementOpen} aria-label="CONTINUE →" onClick={()=>{if(won)setScreen('end');else {discussionDeadline.current=Date.now()+settings.discussionMinutes*60000;setSeconds(settings.discussionMinutes*60);setScreen('discussion');}}}>OK</button></div>
      </div>}
      {screen==='morning' && assemblyAnnouncementOpen && <AssemblyAnnouncement names={assemblyNames} avatars={avatars} onClose={()=>setAssemblyAnnouncementOpen(false)}/>}
      {screen==='discussion' && <div className="center discussion-screen"><div className="timer">{String(Math.floor(seconds/60)).padStart(2,'0')}:{String(seconds%60).padStart(2,'0')}</div><h2>DISCUSS YOUR SUSPECTS</h2><p>Who can you trust?</p><button className="secondary" onClick={()=>{discussionDeadline.current=Math.max(discussionDeadline.current,Date.now())+60000;setSeconds(Math.ceil((discussionDeadline.current-Date.now())/1000));}}>+1 MINUTE</button><button className="primary" onClick={()=>{setQueue(players.filter(p=>p.alive).map(p=>p.id));setIndex(0);setBallots(provocations.filter(id=>players.some(p=>p.id===id&&p.alive)).flatMap(id=>[id,id]));setScreen('vote');}}>END DISCUSSION →</button></div>}
      {screen==='vote' && active && <div className="page vote-page"><div className="voter-heading"><Avatar name={active.name} avatars={avatars} className="voter-avatar"/><div><h2>{active.name}, who are you voting for?</h2><p className="muted">Pass the phone to {active.name} to vote.</p></div></div>{lovers.current[active.id] !== undefined && <div className="panel">Your friend is {players.find(p=>p.id===lovers.current[active.id])?.name}. You are on the Friends team.</div>}<div className="targets">{players.map(p=><button key={p.id} className={`target ${selected[0]===p.id?'selected':''}`} disabled={!p.alive || p.id===active.id || lovers.current[active.id]===p.id} onClick={()=>setSelected([p.id])}><span className="target-number" aria-hidden="true">#{String(p.id+1).padStart(2,'0')}</span><Avatar name={p.name} avatars={avatars} className="target-avatar"/><strong>{p.name}</strong>{!p.alive && <small>{p.escaped ? 'ESCAPED' : 'DEAD'}</small>}</button>)}</div>{!settings.secretVotes && <p className="muted">Votes so far: {ballots.map(v=>v===null?'Skip':players.find(p=>p.id===v)?.name).join(', ') || 'None'}</p>}<button className="primary bottom" disabled={!selected.length} onClick={()=>recordVote(selected[0])}>VOTE</button>{settings.allowSkip && <button className="secondary" onClick={()=>recordVote(null)}>SKIP VOTE</button>}</div>}
      {screen==='voteResult' && <VoteResult victim={players.find(p=>p.id===tally(ballots))} votes={ballots.filter(id=>id===tally(ballots)).length} revealRole={settings.revealDead} avatars={avatars} picture={picture} announcement={result} onContinue={()=>{if(won)setScreen('end');else {setRound(r=>r+1);beginNight(players);}}}/>}
      {screen==='end' && <MatchResults players={players} avatars={avatars} side={won} title={won==='wolf'?'WEREWOLVES WIN':won==='jester'?`${jesterWinner.toUpperCase()} THE JESTER WINS`:won==='serialkiller'?'SERIAL KILLER WINS':won==='raven'?'RAVEN WINS':won==='whitewolf'?'WHITE WEREWOLF WINS':won==='mindflayer'?`${mindWinner.toUpperCase()} THE MIND FLAYER WINS`:won==='friends'?'THE FRIENDS WIN':won==='wolf-friends'?'FRIENDS AND WEREWOLVES WIN':won==='draw'?'NO SURVIVORS':'VILLAGE WINS'} winnerIds={winningPlayers(players,won || 'draw',lovers.current,jesterWinner,mindWinner)} madmen={madmen} corrupted={corrupted} round={round} rankingError={rankingError} onMenu={()=>setScreen('home')}/>}
    </div>
  </main>;
}
