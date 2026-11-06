// Public setup guidance only. These components never inspect dealt players or validate a match.
export function RosterHelp({deleteMode}:{deleteMode:boolean}) {
  return deleteMode ? <p className="setup-guidance">Removing a player here keeps their saved library profile.</p> : null;
}

export function PlayerCountHelp({count}:{count:number}) {
  const missing=4-count;
  return <p id="player-count-help" className="setup-count-help" role="status">{missing>0
    ? `Add ${missing} more ${missing===1?'player':'players'}.`
    : 'Next: choose one role per player.'}</p>;
}

export function RoleCountHelp({selected,players}:{selected:number;players:number}) {
  const difference=players-selected;
  return <p id="role-count-help" className="setup-count-help" role="status">{difference===0 ? 'Role count matches.'
    : difference>0 ? `Add ${difference} more ${difference===1?'role':'roles'}.`
    : `Remove ${-difference} ${difference===-1?'role':'roles'}.`}</p>;
}

export function RandomPickHelp({unique}:{unique:boolean}) {
  return <p className="muted random-pick-help">{unique
    ? 'Random cards do not repeat a role or pick one you added yourself.'
    : 'Random cards can repeat a role. Turn on One player per role in Random details to prevent this.'} Werewolves must be fewer than half of the players.</p>;
}

export function HowToPlay() {
  return <>
    <h2>THE RULEBOOK</h2>
    <div className="panel"><h3>Gather the players</h3><p>4–24 players share one phone. Add everyone, then choose one role per player. The game assigns the chosen roles secretly.</p></div>
    <div className="panel"><h3>Keep night turns private</h3><p>Pass the phone to the named player before revealing their role. Read the card, make any choices and acknowledge private messages. Hide your information before passing the phone. Do not show your screen to the group.</p></div>
    <div className="panel"><h3>Discuss, then vote</h3><p>In the morning, read the public news together and discuss who seems suspicious. Then pass the phone around so each living player can vote. A tied vote eliminates no one. Voting and role reveals follow your settings.</p></div>
    <div className="panel"><h3>Winning</h3><p>In a basic Village-versus-Werewolves game, the Village wins when no wolves remain. The Werewolves win when they equal or outnumber everyone else still alive. Other roles and Friends can change the winning conditions—follow your role card.</p></div>
    <div className="panel"><h3>Look up a role</h3><p>The Role Rulebook explains all 35 roles using your current settings. It is public reference only: it never shows who has a role. Opening it during a match does not pause the game.</p></div>
    <div className="panel"><h3>Keep the game open</h3><p>Refreshing loses the current match. Saved players, preferences and completed rankings do not restore an unfinished game.</p></div>
  </>;
}
