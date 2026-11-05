/**
 * High quality SVG vector card renderer for Paskahousu.
 * Generates crisp, modern playing cards with suits, ranks, court card art, and card backs.
 */

const SUIT_SYMBOLS = {
  S: '♠',
  H: '♥',
  D: '♦',
  C: '♣'
};

const SUIT_NAMES_FI = {
  S: 'Pata',
  H: 'Hertta',
  D: 'Ruutu',
  C: 'Risti'
};

const SUIT_NAMES_EN = {
  S: 'Spades',
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs'
};

const RANK_LABELS = {
  '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', '10': '10',
  'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A', '2': '2'
};

const COURT_ICONS = {
  'J': '⚔️',
  'Q': '👑',
  'K': '🤴',
  'A': '⭐',
  '2': '⚡',
  '10': '💥'
};

function isRedSuit(suit) {
  return suit === 'H' || suit === 'D';
}

function createCardElement(card, options = {}) {
  const el = document.createElement('div');
  el.className = 'playing-card';

  if (options.faceDown) {
    el.classList.add('card-back');
    el.innerHTML = `
      <div class="card-inner">
        <div class="card-back-pattern">
          <div class="card-back-logo">🃏</div>
        </div>
      </div>
    `;
    return el;
  }

  const suit = card.suit || 'S';
  const rank = card.rank || '3';
  const isRed = isRedSuit(suit);
  const symbol = SUIT_SYMBOLS[suit] || '♠';

  el.classList.add(isRed ? 'suit-red' : 'suit-black');
  if (options.selected) el.classList.add('selected');
  if (options.playable) el.classList.add('playable');
  if (options.unplayable) el.classList.add('unplayable');

  el.innerHTML = `
    <div class="card-inner">
      <span class="card-rank">${rank}</span>
      <span class="card-suit">${symbol}</span>
      ${options.badge ? `<div class="card-badge">${options.badge}</div>` : ''}
    </div>
  `;

  return el;
}

