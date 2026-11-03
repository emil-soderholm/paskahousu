"""
Unit tests for bot_ai.py:
Tests bot decision making, challenging, bluffing, Arabia table card handling,
and end-to-end full game simulations across all 3 game modes.
"""

import unittest
from game_engine import GameState, Player, Card, GameRules, PlayedCardEntry
from bot_ai import BotAI


class TestBotAIDecisions(unittest.TestCase):
    def test_paskahousu_legal_ranks_empty_table(self):
        # When empty_ten_ace is forbidden, 10 and A cannot be led
        rules_forbidden = GameRules(mode="paskahousu", empty_ten_ace="forbidden")
        game_f = GameState("TEST", rules_forbidden)
        legal_f = BotAI.get_legal_ranks_for_pile(game_f)
        self.assertNotIn("10", legal_f)
        self.assertNotIn("A", legal_f)
        self.assertIn("3", legal_f)
        self.assertIn("7", legal_f)
        self.assertIn("K", legal_f)

        # When empty_ten_ace is next_pickup, 10 and A can be led
        rules_pickup = GameRules(mode="paskahousu", empty_ten_ace="next_pickup")
        game_p = GameState("TEST", rules_pickup)
        legal_p = BotAI.get_legal_ranks_for_pile(game_p)
        self.assertIn("10", legal_p)
        self.assertIn("A", legal_p)

    def test_bot_chooses_legal_rank_and_never_none(self):
        rules = GameRules(mode="paskahousu")
        game = GameState("TEST", rules)
        bot = Player("bot1", "Sirpa", is_bot=True)
        bot.hand = [Card("♠", "4"), Card("♥", "6"), Card("♦", "10")]
        game.players = [bot, Player("p2", "Bob")]
        game.status = "PLAYING"

        move = BotAI.choose_move(game, bot)
        self.assertEqual(move["action"], "play")
        self.assertIsNotNone(move["declared_rank"])
        self.assertIn(move["declared_rank"], ["4", "6"])

    def test_arabia_empty_pile_never_picks_up(self):
        rules = GameRules(mode="arabia")
        game = GameState("TEST", rules)
        bot = Player("bot1", "Sirpa", is_bot=True)
        bot.hand = []
        bot.table_up = [Card("♠", "J"), Card("♥", "Q"), Card("♦", "K")]
        bot.table_down = [Card("♣", "3")]
        game.draw_deck = []
        game.play_pile = []
        game.players = [bot, Player("p2", "Bob")]
        game.status = "PLAYING"

        move = BotAI.choose_move(game, bot)
        # Must NOT choose pickup because pile is empty!
        self.assertNotEqual(move["action"], "pickup")
        self.assertEqual(move["action"], "play")
        self.assertEqual(move.get("source"), "table_up")

    def test_arabia_blind_flip_when_table_up_empty(self):
        rules = GameRules(mode="arabia")
        game = GameState("TEST", rules)
        bot = Player("bot1", "Sirpa", is_bot=True)
        bot.hand = []
        bot.table_up = []
        bot.table_down = [Card("♣", "7")]
        game.draw_deck = []
        game.play_pile = []
        game.players = [bot, Player("p2", "Bob")]
        game.status = "PLAYING"

        move = BotAI.choose_move(game, bot)
        self.assertEqual(move["action"], "play_blind")
        self.assertEqual(move.get("card_index"), 0)


class TestBotSimulations(unittest.TestCase):
    def _run_simulation_batch(self, mode: str, count: int = 3):
        for g in range(count):
            rules = GameRules(mode=mode)
            game = GameState(f"SIM_{mode}_{g}", rules)
            game.players = [
                Player("b1", "Pekka", is_bot=True),
                Player("b2", "Jari", is_bot=True),
                Player("b3", "Sirpa", is_bot=True)
            ]
            self.assertTrue(game.start_game())

            turns = 0
            max_turns = 1000
            while game.status in ["PLAYING", "CHALLENGE_WINDOW", "REVEAL_PAUSE"] and turns < max_turns:
                turns += 1
                if game.status == "CHALLENGE_WINDOW":
                    cs = game.challenge_state
                    active_bots = [b for b in game.active_players() if b.is_bot and b.id != cs.player_id]
                    challenged = False
                    for b in active_bots:
                        if BotAI.should_challenge(game, b):
                            game.challenge_move(b.id)
                            challenged = True
                            break
                        else:
                            game.pass_challenge(b.id)
                    if not challenged and game.status == "CHALLENGE_WINDOW":
                        game.resolve_unchallenged()
                    continue

                if game.status == "REVEAL_PAUSE":
                    game.dismiss_reveal()
                    continue

                curr = game.current_player()
                if not curr:
                    break

                move = BotAI.choose_move(game, curr)
                res = {"success": False}
                if move["action"] == "play":
                    res = game.play_cards(curr.id, move["card_indices"], move["declared_rank"], source=move.get("source", "hand"))
                elif move["action"] == "play_blind":
                    res = game.play_blind_card(curr.id, move.get("card_index", 0))
                elif move["action"] == "flip_deck":
                    res = game.flip_from_deck(curr.id)
                elif move["action"] == "pickup":
                    res = game.pickup_pile(curr.id)

                if not res.get("success"):
                    if game.play_pile:
                        game.pickup_pile(curr.id)
                    elif game.draw_deck:
                        game.flip_from_deck(curr.id)
                    elif game.rules.mode == "arabia" and curr.table_down and not curr.table_up and not curr.hand:
                        game.play_blind_card(curr.id, 0)
                    else:
                        game._advance_turn()

                if game.status == "GAME_OVER":
                    break

            self.assertTrue(game.status == "GAME_OVER" or len(game.winners) >= 1, f"{mode} game {g} reached turn limit {max_turns}")

    def test_paskahousu_full_simulations(self):
        self._run_simulation_batch("paskahousu", 3)

    def test_valepaskahousu_full_simulations(self):
        self._run_simulation_batch("valepaskahousu", 3)

    def test_arabia_full_simulations(self):
        self._run_simulation_batch("arabia", 3)


if __name__ == "__main__":
    unittest.main()
