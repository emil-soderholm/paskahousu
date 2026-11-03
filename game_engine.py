"""
Game engine for Paskahousu and Valepaskahousu.
Traditional Finnish card game engine supporting:
- Paskahousu (open / face-up)
- Valepaskahousu (bluff / face-down with challenge window)
"""

import random
import time
from typing import List, Dict, Optional, Tuple, Any

SUITS = ['S', 'H', 'D', 'C']  # Spades, Hearts, Diamonds, Clubs
RANKS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']

# Standard rank values for comparison in Paskahousu
# 3 is lowest (value 3), Ace is 14, 2 is special (value 15 or special handled)
RANK_VALUES = {
    '3': 3,
    '4': 4,
    '5': 5,
    '6': 6,
    '7': 7,
    '8': 8,
    '9': 9,
    '10': 10,
    'J': 11,
    'Q': 12,
    'K': 13,
    'A': 14,
    '2': 15,
}

COURT_RANKS = {'J', 'Q', 'K'}
NUMBER_RANKS = {'3', '4', '5', '6', '7', '8', '9'}

class Card:
    def __init__(self, suit: str, rank: str):
        self.suit = suit
        self.rank = rank

    @property
    def value(self) -> int:
        return RANK_VALUES[self.rank]

    def to_dict(self) -> Dict[str, str]:
        return {'suit': self.suit, 'rank': self.rank}

    @classmethod
    def from_dict(cls, data: Dict[str, str]) -> 'Card':
        return cls(data['suit'], data['rank'])

    def __repr__(self) -> str:
        return f"{self.rank}{self.suit}"

    def __eq__(self, other) -> bool:
        if isinstance(other, Card):
            return self.suit == other.suit and self.rank == other.rank
        return False


def create_deck() -> List[Card]:
    deck = [Card(suit, rank) for suit in SUITS for rank in RANKS]
    random.shuffle(deck)
    return deck


class GameRules:
    def __init__(
        self,
        mode: str = "valepaskahousu",       # "valepaskahousu", "paskahousu", or "arabia"
        court_min_rank: int = 7,             # 7 means J,Q,K can only be played on 7+ (or empty table). 0 = no restriction, 9 = 9+
        two_rule: str = "only_two",          # "only_two" (only 2 on 2) or "reset" (2 clears or allows any card next)
        empty_ten_ace: str = "next_pickup",  # "next_pickup" (traditional: 10/A on empty table forces next to pick up), or "forbidden"
        challenge_seconds: int = 8,          # Challenge window countdown in seconds
        hand_size: int = 5                   # Cards held while draw deck has cards
    ):
        self.mode = mode
        if mode == "arabia":
            self.hand_size = 3
            self.two_rule = "reset"
            self.court_min_rank = 0
            self.empty_ten_ace = "normal"
        else:
            self.hand_size = hand_size
            self.two_rule = two_rule
            self.court_min_rank = court_min_rank
            self.empty_ten_ace = empty_ten_ace
        self.challenge_seconds = challenge_seconds

    def to_dict(self) -> Dict[str, Any]:
        return {
            "mode": self.mode,
            "court_min_rank": self.court_min_rank,
            "two_rule": self.two_rule,
            "empty_ten_ace": self.empty_ten_ace,
            "challenge_seconds": self.challenge_seconds,
            "hand_size": self.hand_size
        }

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> 'GameRules':
        mode = d.get("mode", "valepaskahousu")
        default_hand_size = 3 if mode == "arabia" else 5
        default_two_rule = "reset" if mode == "arabia" else "only_two"
        default_court = 0 if mode == "arabia" else 7
        return cls(
            mode=mode,
            court_min_rank=int(d.get("court_min_rank", default_court)),
            two_rule=d.get("two_rule", default_two_rule),
            empty_ten_ace=d.get("empty_ten_ace", "normal" if mode == "arabia" else "next_pickup"),
            challenge_seconds=int(d.get("challenge_seconds", 8)),
            hand_size=int(d.get("hand_size", default_hand_size))
        )


class PlayedCardEntry:
    """Represents a card in the play pile."""
    def __init__(self, card: Card, declared_rank: str, player_id: str, face_down: bool = False):
        self.card = card
        self.declared_rank = declared_rank
        self.player_id = player_id
        self.face_down = face_down
        self.revealed = not face_down

    def to_dict(self, reveal_all: bool = False) -> Dict[str, Any]:
        if reveal_all or self.revealed:
            return {
                "card": self.card.to_dict(),
                "declared_rank": self.declared_rank,
                "player_id": self.player_id,
                "revealed": True
            }
        else:
            return {
                "card": None,
                "declared_rank": self.declared_rank,
                "player_id": self.player_id,
                "revealed": False
            }


class Player:
    def __init__(self, player_id: str, name: str, is_bot: bool = False, avatar: str = "🦊"):
        self.id = player_id
        self.name = name
        self.is_bot = is_bot
        self.avatar = avatar
        self.hand: List[Card] = []
        self.table_down: List[Card] = []  # Arabia: 3 blind face-down cards
        self.table_up: List[Card] = []    # Arabia: 3 open face-up cards
        self.has_played_first_turn: bool = False
        self.is_out: bool = False
        self.finish_rank: Optional[int] = None
        self.is_ready: bool = False
        self.connected: bool = True
        # Stats
        self.stats = {
            "bluffs_attempted": 0,
            "bluffs_successful": 0,
            "bluffs_caught": 0,
            "challenges_made": 0,
            "challenges_won": 0,
            "piles_cleared": 0,
            "cards_picked_up": 0
        }

    def sort_hand(self):
        # Sort hand primarily by rank value (3 up to 2), then by suit
        self.hand.sort(key=lambda c: (c.value, c.suit))

    def to_dict(self, include_hand: bool = False) -> Dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "is_bot": self.is_bot,
            "avatar": self.avatar,
            "card_count": len(self.hand),
            "hand": [c.to_dict() for c in self.hand] if include_hand else None,
            "table_down_count": len(self.table_down),
            "table_up": [c.to_dict() for c in self.table_up],
            "has_played_first_turn": self.has_played_first_turn,
            "is_out": self.is_out,
            "finish_rank": self.finish_rank,
            "is_ready": self.is_ready,
            "connected": self.connected,
            "stats": self.stats
        }


class ChallengeState:
    def __init__(
        self,
        player_id: str,
        played_cards: List[Card],
        declared_rank: str,
        ends_at: float,
        clears_on_pass: bool = False
    ):
        self.player_id = player_id
        self.played_cards = played_cards
        self.declared_rank = declared_rank
        self.ends_at = ends_at
        self.clears_on_pass = clears_on_pass
        self.votes: Dict[str, str] = {}  # player_id -> "pass" or "challenge"
        self.challenger_id: Optional[str] = None
        self.result: Optional[str] = None  # "liar_caught" or "honest"


class GameState:
    def __init__(self, room_id: str, rules: Optional[GameRules] = None):
        self.room_id = room_id
        self.rules = rules or GameRules()
        self.players: List[Player] = []
        self.draw_deck: List[Card] = []
        self.play_pile: List[PlayedCardEntry] = []
        self.dead_pile_count: int = 0
        self.current_player_idx: int = 0
        self.status: str = "LOBBY"  # LOBBY, PLAYING, CHALLENGE_WINDOW, REVEAL_PAUSE, GAME_OVER
        self.challenge_state: Optional[ChallengeState] = None
        self.reveal_info: Optional[Dict[str, Any]] = None
        self.last_action_info: Optional[Dict[str, Any]] = None
        self.history: List[Dict[str, Any]] = []
        self.winners: List[str] = []
        self.paskahousu_id: Optional[str] = None
        self.turn_number: int = 0
        self.first_kaato_done: bool = False

    def add_log(self, text_fi: str, text_en: str, log_type: str = "info"):
        entry = {
            "time": time.time(),
            "text_fi": text_fi,
            "text_en": text_en,
            "type": log_type
        }
        self.history.append(entry)
        if len(self.history) > 100:
            self.history.pop(0)

    def get_player(self, player_id: str) -> Optional[Player]:
        for p in self.players:
            if p.id == player_id:
                return p
        return None

    def active_players(self) -> List[Player]:
        return [p for p in self.players if not p.is_out]

    def current_player(self) -> Optional[Player]:
        if not self.players or self.status in ["LOBBY", "GAME_OVER"]:
            return None
        return self.players[self.current_player_idx]

    def get_top_pile_card(self) -> Optional[PlayedCardEntry]:
        if not self.play_pile:
            return None
        return self.play_pile[-1]

    def get_top_declared_rank(self) -> Optional[str]:
        top = self.get_top_pile_card()
        return top.declared_rank if top else None

    def start_game(self) -> bool:
        if len(self.players) < 2:
            return False

        self.draw_deck = create_deck()
        self.play_pile = []
        self.dead_pile_count = 0
        self.winners = []
        self.paskahousu_id = None
        self.challenge_state = None
        self.reveal_info = None
        self.last_action_info = None
        self.turn_number = 1
        self.first_kaato_done = False

        # Reset players
        for p in self.players:
            p.hand = []
            p.table_down = []
            p.table_up = []
            p.has_played_first_turn = False
            p.is_out = False
            p.finish_rank = None
            p.stats = {k: 0 for k in p.stats}

        if self.rules.mode == "arabia":
            # Arabia setup: 3 face-down, 3 face-up, 3 in hand
            for _ in range(3):
                for p in self.players:
                    if self.draw_deck:
                        p.table_down.append(self.draw_deck.pop())
            for _ in range(3):
                for p in self.players:
                    if self.draw_deck:
                        p.table_up.append(self.draw_deck.pop())
            for _ in range(3):
                for p in self.players:
                    if self.draw_deck:
                        p.hand.append(self.draw_deck.pop())

            for p in self.players:
                p.sort_hand()
                if p.is_bot:
                    self._bot_optimize_table_cards(p)
        else:
            # Deal cards (default 5 cards each)
            for _ in range(self.rules.hand_size):
                for p in self.players:
                    if self.draw_deck:
                        p.hand.append(self.draw_deck.pop())

            for p in self.players:
                p.sort_hand()

        # Starting player: the player with the lowest card (normally smallest 3, or smallest card)
        best_p_idx = 0
        best_min_val = 999
        for idx, p in enumerate(self.players):
            for c in p.hand:
                if c.value < best_min_val:
                    best_min_val = c.value
                    best_p_idx = idx

        self.current_player_idx = best_p_idx
        starter = self.players[self.current_player_idx]
        self.status = "PLAYING"

        if self.rules.mode == "arabia":
            mode_name = "Arabia"
        elif self.rules.mode == "valepaskahousu":
            mode_name = "Valepaskahousu"
        else:
            mode_name = "Paskahousu"

        self.add_log(
            f"Peli alkoi ({mode_name})! {starter.name} aloittaa pienimmällä kortilla.",
            f"Game started ({mode_name})! {starter.name} starts with the lowest card.",
            "start"
        )
        return True

    def _bot_optimize_table_cards(self, bot: Player):
        """Bots optimize their Arabia table_up cards by placing highest/action cards in table_up."""
        all_cards = bot.hand + bot.table_up

        def desirability(c: Card) -> int:
            if c.rank == '10':
                return 100  # 10 clears pile
            if c.rank == '2':
                return 90   # 2 resets pile
            if c.rank == 'A':
                return 80
            return c.value  # 3..K (3 to 13)

        all_cards.sort(key=desirability, reverse=True)
        bot.table_up = all_cards[:3]
        bot.hand = all_cards[3:]
        bot.sort_hand()

    def swap_table_card(self, player_id: str, hand_idx: int, table_up_idx: int) -> Dict[str, Any]:
        """Allows player to swap a card between hand and table_up before their first play."""
        if self.rules.mode != "arabia":
            return {"success": False, "error": "Korttien vaihto on käytössä vain Arabiassa / Swapping cards is only in Arabia"}
        player = self.get_player(player_id)
        if not player or player.is_out:
            return {"success": False, "error": "Pelaajaa ei löydy / Player not found"}
        if self.first_kaato_done:
            return {"success": False, "error": "Kortteja ei voi enää vaihtaa ensimmäisen kaadon jälkeen! / Cannot swap cards after first pile clear!"}
        if hand_idx < 0 or hand_idx >= len(player.hand):
            return {"success": False, "error": "Virheellinen käsikortti / Invalid hand card"}
        if table_up_idx < 0 or table_up_idx >= len(player.table_up):
            return {"success": False, "error": "Virheellinen pöytäkortti / Invalid table card"}

        player.hand[hand_idx], player.table_up[table_up_idx] = player.table_up[table_up_idx], player.hand[hand_idx]
        player.sort_hand()

        self.add_log(
            f"{player.name} vaihtoi kortin kädestään pöydälle.",
            f"{player.name} swapped a card between hand and table.",
            "swap"
        )
        return {"success": True}

    def validate_play(
        self,
        player_id: str,
        card_indices: List[int],
        declared_rank: str,
        source: str = "hand"
    ) -> Tuple[bool, str]:
        """
        Validates whether the player can play the specified cards and declaration.
        In Valepaskahousu, actual cards can be anything, but the declared_rank must be legal.
        In open Paskahousu and Arabia, actual cards must all equal declared_rank, and declared_rank must be legal.
        """
        if self.status != "PLAYING":
            return False, "Peli ei ole normaalissa vuorossa / Game not in normal turn phase"

        player = self.get_player(player_id)
        if not player or player.is_out:
            return False, "Pelaaja ei ole pelissä / Player not in game"

        if self.current_player() != player:
            return False, "Ei ole sinun vuorosi / Not your turn"

        if not card_indices:
            return False, "Valitse vähintään yksi kortti / Select at least one card"

        if source == "hand":
            if not player.hand:
                return False, "Kädessäsi ei ole kortteja / Hand is empty"
            if any(idx < 0 or idx >= len(player.hand) for idx in card_indices):
                return False, "Virheellinen korttivalinta / Invalid card selection"
            selected_cards = [player.hand[i] for i in card_indices]
        elif source == "table_up":
            if self.rules.mode != "arabia":
                return False, "Pöytäkortit ovat käytössä vain Arabiassa / Table cards only in Arabia"
            if len(player.hand) > 0 or len(self.draw_deck) > 0:
                return False, "Käsikortit ja pakka on pelattava ensin! / Hand and deck must be empty first!"
            if not player.table_up:
                return False, "Ei pöytäkortteja jäljellä / No table cards left"
            if any(idx < 0 or idx >= len(player.table_up) for idx in card_indices):
                return False, "Virheellinen pöytäkorttivalinta / Invalid table card selection"
            selected_cards = [player.table_up[i] for i in card_indices]
        else:
            return False, "Virheellinen korttilähde / Invalid source"

        # In open Paskahousu and Arabia, all selected cards must have the same rank as declared_rank
        if self.rules.mode in ["paskahousu", "arabia"]:
            first_rank = selected_cards[0].rank
            if any(c.rank != first_rank for c in selected_cards):
                return False, "Kaikkien pelattujen korttien on oltava samaa maata/arvoa / All played cards must have same rank"
            if declared_rank != first_rank:
                return False, "Tässä pelimuodossa ei voi valehdella / Cannot bluff in this mode"

        # Check declared rank legality against pile
        top_entry = self.get_top_pile_card()
        legal, reason = self.is_rank_legal_on_pile(declared_rank, top_entry)
        if not legal:
            # Special safeguard for Arabia: if player has ONLY court cards left, and the pile is empty,
            # allow them to play so the game never permanently deadlocks
            if self.rules.mode == "arabia" and not self.first_kaato_done and top_entry is None:
                available = player.hand if source == "hand" else player.table_up
                if available and all(c.rank in COURT_RANKS or c.rank == 'A' for c in available):
                    legal = True
            if not legal:
                return False, reason

        # Check empty table rule for 10 and Ace (only in standard Paskahousu/Valepaskahousu)
        if top_entry is None and self.rules.mode != "arabia":
            if self.rules.empty_ten_ace == "forbidden" and declared_rank in ['10', 'A']:
                return False, "Kymppiä tai Ässää ei voi lyödä tyhjään pöytään / 10 or Ace cannot be led to empty table"

        return True, "OK"

    def is_rank_legal_on_pile(self, rank: str, top_entry: Optional[PlayedCardEntry]) -> Tuple[bool, str]:
        """Checks if declared rank can legally be played on the current pile."""
        # Arabia specific rules
        if self.rules.mode == "arabia":
            # Court cards restriction: court cards (J, Q, K, A) cannot be played before the first kaato
            if not self.first_kaato_done and (rank in COURT_RANKS or rank == 'A'):
                return False, "Kuvakortteja (J, Q, K, A) saa pelata vasta ensimmäisen kaadon jälkeen! / Court cards (J, Q, K, A) can only be played after the first pile clear!"

            if top_entry is None:
                # Empty table: any valid card can be played
                return True, "OK"

            top_rank = top_entry.declared_rank

            # 2 can be played on ANY card
            if rank == '2':
                return True, "OK"
            # Any card can be played on 2 (2 resets the pile)
            if top_rank == '2':
                return True, "OK"
            # 10 can be played on ANY card (and clears the pile)
            if rank == '10':
                return True, "OK"
            # Standard comparison: rank >= top_rank
            top_val = RANK_VALUES[top_rank]
            cur_val = RANK_VALUES[rank]
            if cur_val < top_val:
                return False, f"Kortin arvon on oltava vähintään yhtä suuri kuin {top_rank}! / Card must be >= {top_rank}!"
            return True, "OK"

        if top_entry is None:
            # Empty table: any card can be played
            return True, "OK"

        top_rank = top_entry.declared_rank

        # Standard Paskahousu & Valepaskahousu rules:
        # Rule of 2 (Kakkonen):
        if top_rank == '2':
            if self.rules.two_rule == "only_two":
                if rank != '2':
                    return False, "Kakkosen päälle saa lyödä vain toisen kakkosen! / Only 2 can be played on 2!"
                return True, "OK"
            elif self.rules.two_rule == "reset":
                # Any card can be played on 2
                return True, "OK"

        # Playing a 2:
        if rank == '2':
            # 2 can be played on any card except 10 or Ace
            if top_rank in ['10', 'A']:
                return False, "Kakkosta ei voi pelata kympin tai ässän päälle / 2 cannot be played on 10 or Ace"
            return True, "OK"

        # Kaatokortit:
        # 10 kaataa numerot 3-9
        if rank == '10':
            if top_rank in NUMBER_RANKS:
                return True, "OK"
            elif top_rank == '10':
                return True, "OK"
            else:
                return False, "Kympillä voi kaataa vain numerokortteja (3-9)! / 10 can only clear number cards (3-9)!"

        # Ace kaataa kuvakortit (J, Q, K) ja Ässän
        if rank == 'A':
            if top_rank in COURT_RANKS or top_rank == 'A':
                return True, "OK"
            else:
                return False, "Ässällä voi kaataa vain kuvakortteja (J, Q, K) tai Ässän! / Ace can only clear court cards or Ace!"

        # Court card restriction (Seiskan sääntö):
        # J, Q, K can only be played on 7+ (or empty table)
        if rank in COURT_RANKS and self.rules.court_min_rank > 0:
            if top_rank in NUMBER_RANKS:
                top_num = int(top_rank)
                if top_num < self.rules.court_min_rank:
                    return False, f"Kuvakortteja saa lyödä vasta {self.rules.court_min_rank}:n päälle! / Court cards require {self.rules.court_min_rank}+!"

        # Standard number/court rank comparison: must be >= top_rank
        top_val = RANK_VALUES[top_rank]
        cur_val = RANK_VALUES[rank]

        # If top card is a court card, number cards cannot be played on it
        if top_rank in COURT_RANKS and rank in NUMBER_RANKS:
            return False, "Numerokorttia ei voi lyödä kuvakortin päälle (paitsi erikoiskortit) / Number cards cannot be played on court cards"

        if cur_val < top_val:
            return False, f"Kortin arvon on oltava vähintään yhtä suuri kuin {top_rank}! / Card must be >= {top_rank}!"

        return True, "OK"

    def will_move_clear_pile(self, declared_rank: str, cards_count: int) -> bool:
        """Determines if this declaration triggers a Kaato (pile clear)."""
        top_entry = self.get_top_pile_card()

        if self.rules.mode == "arabia":
            # In Arabia, 10 always clears the pile
            if declared_rank == '10':
                return True
            # 4 of a kind clears the pile
            consecutive_same = cards_count
            for entry in reversed(self.play_pile):
                if entry.declared_rank == declared_rank:
                    consecutive_same += 1
                else:
                    break
            if consecutive_same >= 4:
                return True
            return False

        # 10 clears number cards (3-9)
        if declared_rank == '10':
            if top_entry is not None and top_entry.declared_rank in NUMBER_RANKS:
                return True

        # Ace clears court cards or Ace
        if declared_rank == 'A':
            if top_entry is not None and (top_entry.declared_rank in COURT_RANKS or top_entry.declared_rank == 'A'):
                return True

        # Check 4 of a kind:
        consecutive_same = cards_count
        for entry in reversed(self.play_pile):
            if entry.declared_rank == declared_rank:
                consecutive_same += 1
            else:
                break
        if consecutive_same >= 4:
            return True

        return False

    def play_cards(
        self,
        player_id: str,
        card_indices: List[int],
        declared_rank: str,
        source: str = "hand"
    ) -> Dict[str, Any]:
        """
        Executes a card play action from hand or table_up.
        """
        valid, msg = self.validate_play(player_id, card_indices, declared_rank, source=source)
        if not valid:
            return {"success": False, "error": msg}

        player = self.get_player(player_id)
        player.has_played_first_turn = True

        # Extract cards in reverse index order so indices stay valid
        sorted_indices = sorted(card_indices, reverse=True)
        if source == "table_up":
            played_cards = [player.table_up.pop(i) for i in sorted_indices]
        else:
            played_cards = [player.hand.pop(i) for i in sorted_indices]

        # Check if player actually lied
        is_bluff = any(c.rank != declared_rank for c in played_cards)
        if is_bluff:
            player.stats["bluffs_attempted"] += 1

        top_before = self.get_top_pile_card()
        clears = self.will_move_clear_pile(declared_rank, len(played_cards))

        is_valepaska = (self.rules.mode == "valepaskahousu")

        # In Valepaskahousu: enter challenge window
        if is_valepaska:
            self.status = "CHALLENGE_WINDOW"
            ends_at = time.time() + self.rules.challenge_seconds
            self.challenge_state = ChallengeState(
                player_id=player_id,
                played_cards=played_cards,
                declared_rank=declared_rank,
                ends_at=ends_at,
                clears_on_pass=clears
            )
            # Add to play pile as face down
            for c in played_cards:
                self.play_pile.append(PlayedCardEntry(
                    card=c,
                    declared_rank=declared_rank,
                    player_id=player_id,
                    face_down=True
                ))

            qty_str = f"{len(played_cards)}x {declared_rank}"
            self.add_log(
                f"{player.name} löi {len(played_cards)} korttia ja väittää: '{qty_str}'!",
                f"{player.name} played {len(played_cards)} card(s) claiming '{qty_str}'!",
                "play"
            )

            self.last_action_info = {
                "type": "play_challenge_pending",
                "player_id": player_id,
                "count": len(played_cards),
                "declared_rank": declared_rank,
                "clears": clears
            }
            return {"success": True, "status": "challenge_pending"}

        else:
            # Open Paskahousu and Arabia: immediate resolution
            for c in played_cards:
                self.play_pile.append(PlayedCardEntry(
                    card=c,
                    declared_rank=declared_rank,
                    player_id=player_id,
                    face_down=False
                ))

            source_txt = " pöydästä" if source == "table_up" else ""
            source_txt_en = " from table" if source == "table_up" else ""
            qty_str = f"{len(played_cards)}x {declared_rank}"
            self.add_log(
                f"{player.name} löi{source_txt} {qty_str}.",
                f"{player.name} played{source_txt_en} {qty_str}.",
                "play"
            )

            # Check empty table 10/Ace pickup rule (not in Arabia)
            if self.rules.mode != "arabia" and top_before is None and declared_rank in ['10', 'A'] and self.rules.empty_ten_ace == "next_pickup":
                self._handle_empty_table_pickup(player)
                return {"success": True, "cleared": False, "pickup": True}

            # Check Kaato (clearing pile)
            if clears:
                self._clear_pile_kaatuu(player, declared_rank=declared_rank, cards_count=len(played_cards))
                return {"success": True, "cleared": True}

            # In Arabia: if player plays a 2, the same player gets to immediately play another card on top of the 2!
            if self.rules.mode == "arabia" and declared_rank == '2':
                # Realistic card drawing: hand is not refilled while turn continues,
                # unless hand is completely empty and draw deck has cards.
                if source == "hand" and len(player.hand) == 0 and self.draw_deck:
                    self._refill_hand(player)
                self._check_player_out(player)
                if self.status != "GAME_OVER":
                    if player.is_out:
                        self._advance_turn()
                    else:
                        self.add_log(
                            f"{player.name} löi kakkosen ja saa laittaa heti uuden kortin sen päälle!",
                            f"{player.name} played a 2 and gets to play another card on top immediately!",
                            "two_continue"
                        )
                return {"success": True, "cleared": False, "continue_turn": True}

            # Hand refill and advance turn
            if source == "hand":
                self._refill_hand(player)
            self._check_player_out(player)
            self._advance_turn()
            return {"success": True, "cleared": False}

    def play_blind_card(self, player_id: str, card_index: int = 0) -> Dict[str, Any]:
        """
        In Arabia, play a blind face-down card from table_down.
        Only allowed when hand, draw deck, and table_up are all empty.
        """
        if self.rules.mode != "arabia":
            return {"success": False, "error": "Sokkokortit ovat käytössä vain Arabiassa / Blind cards only in Arabia"}

        if self.status != "PLAYING":
            return {"success": False, "error": "Peli ei ole normaalissa vuorossa / Game not in normal turn"}

        player = self.get_player(player_id)
        if not player or player != self.current_player():
            return {"success": False, "error": "Ei sinun vuorosi / Not your turn"}

        if len(player.hand) > 0 or len(self.draw_deck) > 0:
            return {"success": False, "error": "Käsikortit ja pakka on pelattava ensin! / Hand and deck must be empty first!"}

        if len(player.table_up) > 0:
            return {"success": False, "error": "Pöytäkortit on pelattava ensin! / Table-up cards must be empty first!"}

        if not player.table_down:
            return {"success": False, "error": "Ei sokkokortteja jäljellä! / No blind cards left!"}

        if card_index < 0 or card_index >= len(player.table_down):
            card_index = 0

        card = player.table_down.pop(card_index)
        player.has_played_first_turn = True

        top_entry = self.get_top_pile_card()
        legal, _ = self.is_rank_legal_on_pile(card.rank, top_entry)

        if legal:
            # Legal! Card is played to pile face up
            self.play_pile.append(PlayedCardEntry(
                card=card,
                declared_rank=card.rank,
                player_id=player_id,
                face_down=False
            ))

            self.add_log(
                f"{player.name} käänsi sokkona pöydästä {card.rank}{card.suit} ja se sopi pöytään!",
                f"{player.name} flipped blind card {card.rank}{card.suit} and it fit the pile!",
                "flip_success"
            )

            clears = self.will_move_clear_pile(card.rank, 1)
            if clears:
                self._clear_pile_kaatuu(player, declared_rank=card.rank, cards_count=1)
                return {"success": True, "legal": True, "card": card.to_dict(), "cleared": True}

            # In Arabia: if blind card is a 2, player continues their turn!
            if card.rank == '2':
                self._check_player_out(player)
                if self.status != "GAME_OVER":
                    if player.is_out:
                        self._advance_turn()
                    else:
                        self.add_log(
                            f"{player.name} käänsi kakkosen ja saa jatkaa vuoroaan!",
                            f"{player.name} flipped a 2 and continues their turn!",
                            "two_continue"
                        )
                return {"success": True, "legal": True, "card": card.to_dict(), "cleared": False, "continue_turn": True}

            self._check_player_out(player)
            self._advance_turn()
            return {"success": True, "legal": True, "card": card.to_dict(), "cleared": False}

        else:
            # Not legal! Player picks up the pile plus this card
            pickup_cards = [entry.card for entry in self.play_pile] + [card]
            player.hand.extend(pickup_cards)
            player.sort_hand()
            player.stats["cards_picked_up"] += len(pickup_cards)
            self.play_pile = []

            self.add_log(
                f"{player.name} käänsi sokkona pöydästä {card.rank}{card.suit}, ei sopinut! {player.name} joutuu nostamaan pakan ({len(pickup_cards)} kpl)!",
                f"{player.name} flipped blind card {card.rank}{card.suit}, did not fit! {player.name} picks up pile ({len(pickup_cards)} cards)!",
                "flip_fail"
            )

            self._advance_turn()
            return {"success": True, "legal": False, "card": card.to_dict(), "picked_up": len(pickup_cards)}

    def _handle_empty_table_pickup(self, player: Player):
        """When 10 or Ace is played on empty table, next player picks it up."""
        self._refill_hand(player)
        self._check_player_out(player)
        if self.status == "GAME_OVER":
            return

        next_idx = self._next_player_idx(self.current_player_idx)
        victim = self.players[next_idx]

        # Victim picks up all cards in pile
        pickup_cards = [entry.card for entry in self.play_pile]
        victim.hand.extend(pickup_cards)
        victim.sort_hand()
        victim.stats["cards_picked_up"] += len(pickup_cards)
        self.play_pile = []

        self.add_log(
            f"Kortti tyhjään pöytään! {victim.name} joutuu nostamaan pakan ({len(pickup_cards)} kpl)!",
            f"Card to empty table! {victim.name} is forced to pick up the pile ({len(pickup_cards)} cards)!",
            "pickup"
        )

        # Turn passes to the player AFTER victim
        self.current_player_idx = self._next_player_idx(next_idx)

    def _clear_pile_kaatuu(self, player: Player, declared_rank: Optional[str] = None, cards_count: int = 1):
        """Pile clears (Kaatuu) to dead pile. The player plays again!"""
        self.first_kaato_done = True
        cleared_count = len(self.play_pile)
        self.dead_pile_count += cleared_count
        self.play_pile = []
        player.stats["piles_cleared"] += 1

        self.last_action_info = {
            "type": "kaato",
            "player_id": player.id,
            "player_name": player.name,
            "declared_rank": declared_rank,
            "cards_count": cards_count,
            "cleared_count": cleared_count
        }

        self.add_log(
            f"KAATUU! Pakka kaadettiin sivuun ({cleared_count} korttia). {player.name} saa uuden vuoron!",
            f"PILE CLEARED! ({cleared_count} cards discarded). {player.name} plays again!",
            "kaatuu"
        )

        # Realistic replenishment: cards are drawn at the end of the turn.
        # Only refill during kaato if hand became completely empty and draw deck has cards.
        if len(player.hand) == 0 and self.draw_deck:
            self._refill_hand(player)
        self._check_player_out(player)
        if self.status != "GAME_OVER":
            # If player went out after kaatuu, advance turn to next player
            if player.is_out:
                self._advance_turn()
            else:
                # Player gets another turn on empty table!
                pass

    def challenge_move(self, challenger_id: str) -> Dict[str, Any]:
        """
        A player challenges the current bluff.
        """
        if self.status != "CHALLENGE_WINDOW" or not self.challenge_state:
            return {"success": False, "error": "Ei aktiivista haastotilannetta / No active challenge"}

        challenger = self.get_player(challenger_id)
        if not challenger or challenger.is_out:
            return {"success": False, "error": "Challenger not active"}

        if challenger_id == self.challenge_state.player_id:
            return {"success": False, "error": "Et voi haastaa itseäsi! / Cannot challenge yourself!"}

        cs = self.challenge_state
        target_player = self.get_player(cs.player_id)
        challenger.stats["challenges_made"] += 1

        # Reveal the cards
        for entry in self.play_pile[-len(cs.played_cards):]:
            entry.revealed = True
            entry.face_down = False

        # Check if target player actually lied
        lied = any(c.rank != cs.declared_rank for c in cs.played_cards)

        self.status = "REVEAL_PAUSE"

        if lied:
            # LIAR CAUGHT!
            target_player.stats["bluffs_caught"] += 1
            challenger.stats["challenges_won"] += 1

            cards_to_pickup = [entry.card for entry in self.play_pile]
            target_player.hand.extend(cards_to_pickup)
            target_player.sort_hand()
            target_player.stats["cards_picked_up"] += len(cards_to_pickup)
            self.play_pile = []

            self.add_log(
                f"HAASTO! {challenger.name} haastoi: {target_player.name} VALEHTELI! {target_player.name} nostaa {len(cards_to_pickup)} korttia!",
                f"CHALLENGE! {challenger.name} challenged: {target_player.name} was LYING! {target_player.name} picks up {len(cards_to_pickup)} cards!",
                "bluff_caught"
            )

            self.reveal_info = {
                "type": "challenge_result",
                "lied": True,
                "challenger_name": challenger.name,
                "target_name": target_player.name,
                "target_id": target_player.id,
                "challenger_id": challenger.id,
                "declared_rank": cs.declared_rank,
                "actual_cards": [c.to_dict() for c in cs.played_cards],
                "pickup_count": len(cards_to_pickup),
                "winner_id": challenger.id,
                "loser_id": target_player.id
            }

            # Next turn goes to player after target_player
            self._refill_hand(target_player)
            self._check_player_out(target_player)
            self.current_player_idx = self._next_player_idx(self.players.index(target_player))

        else:
            # HONEST! CHALLENGER LOSES!
            target_player.stats["bluffs_successful"] += 1

            cards_to_pickup = [entry.card for entry in self.play_pile]
            challenger.hand.extend(cards_to_pickup)
            challenger.sort_hand()
            challenger.stats["cards_picked_up"] += len(cards_to_pickup)
            self.play_pile = []

            self.add_log(
                f"HAASTO! {challenger.name} haastoi: {target_player.name} PUHUI TOTTA! {challenger.name} joutuu nostamaan {len(cards_to_pickup)} korttia!",
                f"CHALLENGE! {challenger.name} challenged: {target_player.name} was HONEST! {challenger.name} picks up {len(cards_to_pickup)} cards!",
                "bluff_honest"
            )

            self.reveal_info = {
                "type": "challenge_result",
                "lied": False,
                "challenger_name": challenger.name,
                "target_name": target_player.name,
                "target_id": target_player.id,
                "challenger_id": challenger.id,
                "declared_rank": cs.declared_rank,
                "actual_cards": [c.to_dict() for c in cs.played_cards],
                "pickup_count": len(cards_to_pickup),
                "winner_id": target_player.id,
                "loser_id": challenger.id
            }

            # Honest player gets to lead again!
            self._refill_hand(target_player)
            self._check_player_out(target_player)
            if target_player.is_out:
                self._advance_turn()
            else:
                self.current_player_idx = self.players.index(target_player)

        self.challenge_state = None
        return {"success": True, "lied": lied}

    def pass_challenge(self, player_id: str) -> Dict[str, Any]:
        """A player indicates they believe / pass on challenging."""
        if self.status != "CHALLENGE_WINDOW" or not self.challenge_state:
            return {"success": False, "error": "No active challenge"}

        self.challenge_state.votes[player_id] = "pass"

        # Check if all other active players have passed
        other_active = [p for p in self.active_players() if p.id != self.challenge_state.player_id]
        if all(self.challenge_state.votes.get(p.id) == "pass" for p in other_active):
            return self.resolve_unchallenged()

        return {"success": True, "status": "waiting"}

    def resolve_unchallenged(self) -> Dict[str, Any]:
        """Called when challenge timer expires or everyone passes."""
        if self.status != "CHALLENGE_WINDOW" or not self.challenge_state:
            return {"success": False}

        cs = self.challenge_state
        player = self.get_player(cs.player_id)

        # Successful bluff or honest play without getting challenged
        is_bluff = any(c.rank != cs.declared_rank for c in cs.played_cards)
        if is_bluff:
            player.stats["bluffs_successful"] += 1

        top_before = None
        if len(self.play_pile) > len(cs.played_cards):
            top_before = self.play_pile[-(len(cs.played_cards) + 1)]

        # Check empty table 10/Ace pickup rule if unchallenged
        if top_before is None and cs.declared_rank in ['10', 'A'] and self.rules.empty_ten_ace == "next_pickup":
            self.challenge_state = None
            self.status = "PLAYING"
            self._handle_empty_table_pickup(player)
            return {"success": True, "cleared": False, "pickup": True}

        # Check Kaato (pile clears)
        if cs.clears_on_pass:
            self.first_kaato_done = True
            cleared_count = len(self.play_pile)
            self.dead_pile_count += cleared_count
            self.play_pile = []
            player.stats["piles_cleared"] += 1

            self.last_action_info = {
                "type": "kaato",
                "player_id": player.id,
                "player_name": player.name,
                "declared_rank": cs.declared_rank,
                "cards_count": len(cs.played_cards),
                "cleared_count": cleared_count
            }

            self.add_log(
                f"KAATUU! '{cs.declared_rank}' hyväksyttiin ja pakka kaatui ({cleared_count} korttia)! {player.name} saa uuden vuoron.",
                f"PILE CLEARED! '{cs.declared_rank}' accepted and pile cleared ({cleared_count} cards)! {player.name} plays again.",
                "kaatuu"
            )

            self.challenge_state = None
            self.status = "PLAYING"
            if len(player.hand) == 0 and self.draw_deck:
                self._refill_hand(player)
            self._check_player_out(player)
            if player.is_out:
                self._advance_turn()
            # If not out, player continues on empty table
            return {"success": True, "cleared": True}

        # Regular move accepted
        self.challenge_state = None
        self.status = "PLAYING"
        self._refill_hand(player)
        self._check_player_out(player)
        self._advance_turn()
        return {"success": True, "cleared": False}

    def flip_from_deck(self, player_id: str) -> Dict[str, Any]:
        """
        Draw a card from the deck to try to play it.
        If playable, auto-played. If not playable, player picks up the whole pile!
        """
        player = self.get_player(player_id)
        if not player or player != self.current_player():
            return {"success": False, "error": "Ei sinun vuorosi / Not your turn"}

        if self.status != "PLAYING":
            return {"success": False, "error": "Peli ei ole normaalissa vuorossa / Game not in normal turn"}

        if not self.draw_deck:
            return {"success": False, "error": "Nostopakka on tyhjä! / Draw deck is empty!"}

        card = self.draw_deck.pop()
        top_entry = self.get_top_pile_card()
        legal, _ = self.is_rank_legal_on_pile(card.rank, top_entry)

        if legal:
            # Automatically played face up!
            self.play_pile.append(PlayedCardEntry(
                card=card,
                declared_rank=card.rank,
                player_id=player_id,
                face_down=False
            ))

            self.add_log(
                f"{player.name} käänsi pakasta {card.rank}{card.suit} ja se sopi pöytään!",
                f"{player.name} flipped {card.rank}{card.suit} from deck and it fit the pile!",
                "flip_success"
            )

            # Check if this card clears the pile
            clears = self.will_move_clear_pile(card.rank, 1)
            if clears:
                self._clear_pile_kaatuu(player, declared_rank=card.rank, cards_count=1)
                return {"success": True, "fit": True, "card": card.to_dict(), "cleared": True}

            # In Arabia: if flipped card is 2, player continues their turn!
            if self.rules.mode == "arabia" and card.rank == '2':
                if len(player.hand) == 0 and self.draw_deck:
                    self._refill_hand(player)
                self._check_player_out(player)
                if self.status != "GAME_OVER":
                    if player.is_out:
                        self._advance_turn()
                    else:
                        self.add_log(
                            f"{player.name} käänsi pakasta kakkosen ja saa jatkaa vuoroaan!",
                            f"{player.name} flipped a 2 from deck and continues their turn!",
                            "two_continue"
                        )
                return {"success": True, "fit": True, "card": card.to_dict(), "cleared": False, "continue_turn": True}

            self._refill_hand(player)
            self._check_player_out(player)
            self._advance_turn()
            return {"success": True, "fit": True, "card": card.to_dict(), "cleared": False}

        else:
            # Does not fit! Must pick up pile plus this card
            pickup_cards = [entry.card for entry in self.play_pile] + [card]
            player.hand.extend(pickup_cards)
            player.sort_hand()
            player.stats["cards_picked_up"] += len(pickup_cards)
            self.play_pile = []

            self.add_log(
                f"{player.name} käänsi pakasta {card.rank}{card.suit}, ei sopinut! {player.name} nostaa pöydän ({len(pickup_cards)} kpl)!",
                f"{player.name} flipped {card.rank}{card.suit}, did not fit! {player.name} picks up pile ({len(pickup_cards)} cards)!",
                "flip_fail"
            )

            self._advance_turn()
            return {"success": True, "fit": False, "card": card.to_dict(), "picked_up": len(pickup_cards)}

    def pickup_pile(self, player_id: str) -> Dict[str, Any]:
        """Voluntarily pick up the entire pile."""
        player = self.get_player(player_id)
        if not player or player != self.current_player():
            return {"success": False, "error": "Ei sinun vuorosi / Not your turn"}

        if self.status != "PLAYING":
            return {"success": False, "error": "Peli ei ole normaalissa vuorossa / Game not in normal turn"}

        if not self.play_pile:
            return {"success": False, "error": "Pöytä on jo tyhjä! / Pile is already empty!"}

        pickup_cards = [entry.card for entry in self.play_pile]
        player.hand.extend(pickup_cards)
        player.sort_hand()
        player.stats["cards_picked_up"] += len(pickup_cards)
        self.play_pile = []

        self.add_log(
            f"{player.name} nosti pöydän käteensä ({len(pickup_cards)} kpl).",
            f"{player.name} voluntarily picked up the pile ({len(pickup_cards)} cards).",
            "pickup"
        )

        self._advance_turn()
        return {"success": True, "count": len(pickup_cards)}

    def dismiss_reveal(self) -> Dict[str, Any]:
        """Dismiss the challenge reveal pause screen."""
        if self.status == "REVEAL_PAUSE":
            self.status = "PLAYING"
            self.reveal_info = None
            return {"success": True}
        return {"success": False}

    def _refill_hand(self, player: Player):
        """Draw cards from deck until player has 5 cards or deck is empty."""
        while len(player.hand) < self.rules.hand_size and self.draw_deck:
            player.hand.append(self.draw_deck.pop())
        player.sort_hand()

    def _check_player_out(self, player: Player):
        """Check if player has emptied all their cards."""
        if self.rules.mode == "arabia":
            has_no_cards = (
                len(player.hand) == 0 and
                len(player.table_up) == 0 and
                len(player.table_down) == 0 and
                len(self.draw_deck) == 0
            )
        else:
            has_no_cards = (
                len(player.hand) == 0 and
                len(self.draw_deck) == 0
            )

        if has_no_cards and not player.is_out:
            player.is_out = True
            self.winners.append(player.id)
            player.finish_rank = len(self.winners)

            self.add_log(
                f"🎉 {player.name} pääsi eroon kaikista korteistaan ja sijoittui sijalle #{player.finish_rank}!",
                f"🎉 {player.name} discarded all cards and finished #{player.finish_rank}!",
                "winner"
            )

            # Check if game is over (only 1 player remaining with cards)
            active = self.active_players()
            if len(active) <= 1:
                self.status = "GAME_OVER"
                if len(active) == 1:
                    loser = active[0]
                    self.paskahousu_id = loser.id
                    loser.finish_rank = len(self.players)
                    self.add_log(
                        f"💩 PELI PÄÄTTYI! {loser.name} jäi viimeiseksi ja on virallinen PASKAHOUSU! 💩",
                        f"💩 GAME OVER! {loser.name} has cards left and is the PASKAHOUSU! 💩",
                        "game_over"
                    )
                else:
                    self.add_log("Peli päättyi!", "Game Over!", "game_over")

    def _next_player_idx(self, current_idx: int) -> int:
        n = len(self.players)
        for i in range(1, n + 1):
            idx = (current_idx + i) % n
            if not self.players[idx].is_out:
                return idx
        return current_idx

    def _advance_turn(self):
        if self.status == "GAME_OVER":
            return
        self.current_player_idx = self._next_player_idx(self.current_player_idx)
        self.turn_number += 1

    def to_client_state(self, client_player_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Serializes game state for a specific client player.
        Opponent hands are hidden (count only), unrevealed face-down cards are masked.
        """
        curr_p = self.current_player()
        top_entry = self.get_top_pile_card()

        challenge_data = None
        if self.challenge_state:
            cs = self.challenge_state
            p = self.get_player(cs.player_id)
            time_left = max(0.0, cs.ends_at - time.time())
            challenge_data = {
                "player_id": cs.player_id,
                "player_name": p.name if p else "",
                "cards_count": len(cs.played_cards),
                "declared_rank": cs.declared_rank,
                "ends_at": cs.ends_at,
                "time_left": time_left,
                "has_passed": cs.votes.get(client_player_id) == "pass",
                "can_challenge": (client_player_id != cs.player_id and client_player_id is not None),
                "clears_on_pass": cs.clears_on_pass
            }

        return {
            "room_id": self.room_id,
            "status": self.status,
            "rules": self.rules.to_dict(),
            "players": [p.to_dict(include_hand=(p.id == client_player_id)) for p in self.players],
            "current_player_id": curr_p.id if curr_p else None,
            "current_player_name": curr_p.name if curr_p else None,
            "draw_deck_count": len(self.draw_deck),
            "dead_pile_count": self.dead_pile_count,
            "play_pile": [entry.to_dict() for entry in self.play_pile],
            "top_declared_rank": top_entry.declared_rank if top_entry else None,
            "challenge": challenge_data,
            "reveal_info": self.reveal_info,
            "last_action_info": self.last_action_info,
            "history": self.history[-25:],
            "winners": self.winners,
            "paskahousu_id": self.paskahousu_id,
            "turn_number": self.turn_number,
            "first_kaato_done": self.first_kaato_done
        }
