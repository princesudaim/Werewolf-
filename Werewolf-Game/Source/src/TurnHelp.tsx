import './turn-flow.css';

const messages = {
  'shot-used': 'Your shot has already been used. Choose SKIP to finish your turn.',
  'revivals-used': 'No revivals left. Choose SKIP to finish your turn.',
  'no-revival': 'No dead player is available to revive. Choose SKIP to finish your turn.',
  'marks-used': 'No vote marks left. Choose SKIP to finish your turn.',
  'no-regeneration': 'No tiny creatures left. Regeneration is off; use the skip button to finish your turn.',
  'no-creatures': 'No tiny creatures left. You can skip and try to get one.',
} as const;

/** Presentation only. The parent projects an already-visible state; never pass hidden role/block data. */
export default function TurnHelp({reason}:{reason:keyof typeof messages}) {
  return <p className="panel turn-help">{messages[reason]}</p>;
}
