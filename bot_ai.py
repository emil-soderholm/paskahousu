"""
AI Bot Player for Paskahousu and Valepaskahousu.
Simulates human-like thinking, bluffing, and risk-calculated challenging.
"""

import random
import time
from typing import List, Dict, Optional, Tuple, Any
from game_engine import GameState, Player, Card, RANK_VALUES, COURT_RANKS, NUMBER_RANKS

BOT_NAMES = [
    {"name": "Pekka", "avatar": "🧔‍♂️"},
    {"name": "Jari", "avatar": "😎"},
    {"name": "Sirpa", "avatar": "👩‍🦰"},
    {"name": "Matti", "avatar": "🤠"},
    {"name": "Kerttu", "avatar": "👵"},
    {"name": "Teemu", "avatar": "🏒"},
    {"name": "Sanna", "avatar": "💁‍♀️"},
    {"name": "Ville", "avatar": "🧢"}
]


class BotAI:
    @staticmethod
    def get_legal_ranks_for_pile(game: GameState, bot: Optional[Player] = None) -> List[str]:
        top = game.get_top_pile_card()
        candidates = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2']
        legal = []
        for r in candidates:
            ok, _ = game.is_rank_legal_on_pile(r, top)
            if ok:
                if top is None and game.rules.empty_ten_ace == "forbidden" and r in ['10', 'A']:
                    continue
                legal.append(r)

        # In Arabia, if top is None and bot only holds court cards, allow court cards on empty table to prevent stall
        if game.rules.mode == "arabia" and not game.first_kaato_done and top is None and bot:
            available = bot.hand if bot.hand else bot.table_up
            if available and all(c.rank in COURT_RANKS or c.rank == 'A' for c in available):
                for r in ['J', 'Q', 'K', 'A']:
                    if r not in legal:
                        legal.append(r)

        return legal

    @staticmethod
    def choose_move(game: GameState, bot: Player) -> Dict[str, Any]:
        """
        Decides the bot's turn action.
        Supports Arabia, Valepaskahousu, and open Paskahousu.
        """
        top_entry = game.get_top_pile_card()
        pile_size = len(game.play_pile)

        # Arabia mode
        if game.rules.mode == "arabia":
            # 1. Play from Hand if hand has cards
            if bot.hand:
                rank_to_indices: Dict[str, List[int]] = {}
                for idx, card in enumerate(bot.hand):
                    rank_to_indices.setdefault(card.rank, []).append(idx)

                legal_ranks = BotAI.get_legal_ranks_for_pile(game, bot)
                held_legal = [r for r in legal_ranks if r in rank_to_indices]

                if held_legal:
                    chosen_rank = BotAI._pick_best_honest_rank(game, held_legal, pile_size, bot=bot)
                    return {
                        "action": "play",
                        "source": "hand",
                        "card_indices": rank_to_indices[chosen_rank],
                        "declared_rank": chosen_rank
                    }
                else:
                    if game.draw_deck:
                        return {"action": "flip_deck"}
                    elif game.play_pile:
                        return {"action": "pickup"}
                    else:
                        first_card = bot.hand[0]
                        indices = [i for i, c in enumerate(bot.hand) if c.rank == first_card.rank]
                        return {
                            "action": "play",
                            "source": "hand",
                            "card_indices": indices,
                            "declared_rank": first_card.rank
                        }

            # 2. Hand is empty, but draw deck has cards -> Flip from Deck
            if not bot.hand and game.draw_deck:
                return {"action": "flip_deck"}

            # 3. Hand is empty & draw deck is empty -> Play from Table Up
            if not bot.hand and not game.draw_deck and bot.table_up:
                up_rank_to_indices: Dict[str, List[int]] = {}
                for idx, card in enumerate(bot.table_up):
                    up_rank_to_indices.setdefault(card.rank, []).append(idx)

                legal_ranks = BotAI.get_legal_ranks_for_pile(game, bot)
                held_legal = [r for r in legal_ranks if r in up_rank_to_indices]

                if held_legal:
                    chosen_rank = BotAI._pick_best_honest_rank(game, held_legal, pile_size, bot=bot)
                    return {
                        "action": "play",
                        "source": "table_up",
                        "card_indices": up_rank_to_indices[chosen_rank],
                        "declared_rank": chosen_rank
                    }
                else:
                    if game.play_pile:
                        return {"action": "pickup"}
                    else:
                        # Pile is empty! Play lowest card from table_up
                        card = min(bot.table_up, key=lambda c: c.value)
                        indices = [i for i, c in enumerate(bot.table_up) if c.rank == card.rank]
                        return {
                            "action": "play",
                            "source": "table_up",
                            "card_indices": indices,
                            "declared_rank": card.rank
                        }

            # 4. Hand, Deck, and Table Up are empty -> Blind flip from Table Down
            if not bot.hand and not game.draw_deck and not bot.table_up and bot.table_down:
                return {
                    "action": "play_blind",
                    "card_index": 0
                }

            if game.play_pile:
                return {"action": "pickup"}
            if game.draw_deck:
                return {"action": "flip_deck"}
            return {"action": "pickup"}

        # Group cards in bot's hand by rank
        rank_to_indices: Dict[str, List[int]] = {}
        for idx, card in enumerate(bot.hand):
            rank_to_indices.setdefault(card.rank, []).append(idx)

        legal_ranks = BotAI.get_legal_ranks_for_pile(game, bot)

        # Check which legal ranks the bot ACTUALLY holds
        held_legal_ranks = [r for r in legal_ranks if r in rank_to_indices]

        is_valepaska = (game.rules.mode == "valepaskahousu")

        # In Open Paskahousu: cannot bluff
        if not is_valepaska:
            # If the only legal card is 2 on a single-card pile, save the 2 and flip deck or pickup
            has_other_cards = any(c.rank != '2' for c in bot.hand)
            if held_legal_ranks == ['2'] and has_other_cards and len(game.play_pile) == 1:
                if game.draw_deck:
                    return {"action": "flip_deck"}
                elif game.play_pile:
                    return {"action": "pickup"}

            if held_legal_ranks:
                chosen_rank = BotAI._pick_best_honest_rank(game, held_legal_ranks, pile_size, bot=bot)
                indices = rank_to_indices[chosen_rank]
                return {
                    "action": "play",
                    "source": "hand",
                    "card_indices": indices,
                    "declared_rank": chosen_rank
                }
            else:
                # No legal cards in hand
                if game.draw_deck:
                    return {"action": "flip_deck"}
                elif game.play_pile:
                    return {"action": "pickup"}
                else:
                    first_card = bot.hand[0]
                    indices = [i for i, c in enumerate(bot.hand) if c.rank == first_card.rank]
                    return {
                        "action": "play",
                        "source": "hand",
                        "card_indices": indices,
                        "declared_rank": first_card.rank
                    }

        # In Valepaskahousu: can bluff or play honest
        if held_legal_ranks:
            # Bot has legal cards. Decides whether to be honest (80%) or bluff (20%)
            bluff_roll = random.random()
            if bluff_roll > 0.22 or pile_size >= 6:
                # Play honest
                chosen_rank = BotAI._pick_best_honest_rank(game, held_legal_ranks, pile_size, bot=bot)
                indices = rank_to_indices[chosen_rank]
                return {
                    "action": "play",
                    "source": "hand",
                    "card_indices": indices,
                    "declared_rank": chosen_rank
                }
            else:
                # Tactical bluff: play 1 or 2 trash cards, declare a strong or clearing rank
                return BotAI._generate_bluff(game, bot, legal_ranks, rank_to_indices)
        else:
            # Bot has NO legal cards!
            # It must either bluff, flip from deck, or pick up
            if pile_size > 7 and game.draw_deck and random.random() < 0.35:
                # Pile is scary large, try deck flip instead of risking bluff
                return {"action": "flip_deck"}

            if pile_size > 10 and not game.draw_deck and random.random() < 0.4:
                return {"action": "pickup"}

            # Bluff!
            return BotAI._generate_bluff(game, bot, legal_ranks, rank_to_indices)

    @staticmethod
    def _pick_best_honest_rank(game: GameState, held_legal_ranks: List[str], pile_size: int, bot: Optional[Player] = None) -> str:
        # In Arabia, 10 is kaato, 2 is reset, Ace is normal high rank
        if game.rules.mode == "arabia":
            normal = [r for r in held_legal_ranks if r not in ['2', '10']]
            kaato = [r for r in held_legal_ranks if r == '10']
            twos = [r for r in held_legal_ranks if r == '2']

            # If pile has 3+ cards, Kaato is tempting!
            if kaato and pile_size >= 3:
                return kaato[0]

            # If top card is high (>= J) and bot holds a 2, playing 2 lets bot play low cards right after!
            p = bot or game.current_player()
            top_entry = game.get_top_pile_card()
            top_rank = top_entry.declared_rank if top_entry else None
            if p and twos and top_rank and top_rank != '2' and RANK_VALUES.get(top_rank, 0) >= 11:
                has_lower_cards = any(c.value < RANK_VALUES[top_rank] and c.rank not in ['2', '10'] for c in p.hand)
                if has_lower_cards and random.random() < 0.75:
                    return '2'

            # Otherwise prefer normal lowest card
            if normal:
                normal.sort(key=lambda r: RANK_VALUES[r])
                return normal[0]

            # If only kaato or twos left
            if twos:
                return '2'
            if kaato:
                return kaato[0]

            return held_legal_ranks[0]
        else:
            # Standard Paskahousu & Valepaskahousu
            normal = [r for r in held_legal_ranks if r not in ['2', '10', 'A']]
            kaato = [r for r in held_legal_ranks if r in ['10', 'A']]
            twos = [r for r in held_legal_ranks if r == '2']

            # If pile has 3+ cards, Kaato is tempting!
            if kaato and pile_size >= 3:
                return kaato[0]

            # Otherwise prefer normal lowest card
            if normal:
                normal.sort(key=lambda r: RANK_VALUES[r])
                return normal[0]

            # If only kaato or twos left
            if twos:
                return '2'
            if kaato:
                return kaato[0]

            return held_legal_ranks[0]

    @staticmethod
    def _generate_bluff(
        game: GameState,
        bot: Player,
        legal_ranks: List[str],
        rank_to_indices: Dict[str, List[int]]
    ) -> Dict[str, Any]:
        """Chooses 1 or 2 cards to play and a believable declared rank."""
        if not legal_ranks:
            # Fallback if somehow no ranks legal
            return {"action": "pickup"}

        # Find worst cards to dump (e.g. 3, 4, 5 if pile is high)
        sorted_hand_indices = sorted(range(len(bot.hand)), key=lambda i: bot.hand[i].value)
        num_cards_to_bluff = 1
        if len(bot.hand) >= 3 and random.random() < 0.3:
            num_cards_to_bluff = 2

        card_indices = sorted_hand_indices[:num_cards_to_bluff]

        # Choose a believable declared rank
        top = game.get_top_pile_card()
        if top is None:
            # Start of round: claim 3 or 4
            declared_rank = random.choice([r for r in ['3', '4', '5'] if r in legal_ranks] or legal_ranks)
        else:
            # Pile exists: pick lowest legal rank, or if pile is large, maybe bluff a 10 or Ace
            normal_legal = [r for r in legal_ranks if r not in ['2', '10', 'A']]
            if normal_legal:
                normal_legal.sort(key=lambda r: RANK_VALUES[r])
                # Pick lowest or second lowest
                declared_rank = normal_legal[0] if len(normal_legal) == 1 or random.random() < 0.7 else normal_legal[1]
            elif '10' in legal_ranks and len(game.play_pile) >= 3 and random.random() < 0.5:
                declared_rank = '10'
            elif 'A' in legal_ranks and len(game.play_pile) >= 3 and random.random() < 0.5:
                declared_rank = 'A'
            elif '2' in legal_ranks:
                declared_rank = '2'
            else:
                declared_rank = legal_ranks[0]

        return {
            "action": "play",
            "card_indices": card_indices,
            "declared_rank": declared_rank
        }

    @staticmethod
    def should_challenge(game: GameState, bot: Player) -> bool:
        """
        Decides whether the bot should challenge during a CHALLENGE_WINDOW.
        Uses counting of known cards and risk/reward.
        Bots are relaxed and only challenge when mathematically certain or under strong suspicion.
        """
        cs = game.challenge_state
        if not cs or cs.player_id == bot.id:
            return False

        declared_rank = cs.declared_rank
        claimed_count = len(cs.played_cards)
        pile_size = len(game.play_pile)

        # 1. Definite card counting: how many of declared_rank are in bot's hand?
        in_hand = sum(1 for c in bot.hand if c.rank == declared_rank)

        # In standard 52-card deck, there are only 4 of each rank
        if in_hand + claimed_count > 4:
            # 100% mathematically impossible -> definite lie!
            return True

        if in_hand == 3 and claimed_count >= 2:
            return True

        if in_hand == 4:
            return True

        # 2. Relaxed human-like suspicion calculation
        # Players in casual games believe each other most of the time
        suspicion = 0.04  # Baseline: 4%

        # Playing 1 card is normal and almost never challenged
        if claimed_count == 1:
            suspicion += 0.02
        elif claimed_count == 2:
            suspicion += 0.06
        elif claimed_count >= 3:
            suspicion += 0.16

        # If bot holds 2 of that rank, slight suspicion
        if in_hand == 2:
            suspicion += 0.08

        # If claiming Kaatokortti (10 or Ace): small suspicion bump
        if declared_rank in ['10', 'A']:
            suspicion += 0.05

        # Target player's card count: if opponent has only 0 cards left and is claiming to finish:
        target_player = game.get_player(cs.player_id)
        if target_player and len(target_player.hand) == 0:
            suspicion += 0.14

        # Pile size risk: picking up a big pile is dangerous!
        # The larger the pile, the less likely anyone wants to risk challenging
        risk_penalty = min(0.20, (pile_size / 15.0) * 0.20)
        adjusted_suspicion = max(0.02, suspicion - risk_penalty)

        # Cap non-certain challenge rate so bots don't gang up
        adjusted_suspicion = min(0.18, adjusted_suspicion)

        roll = random.random()
        return roll < adjusted_suspicion

