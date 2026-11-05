"""
Unit tests for game_engine.py:
Tests rules, mechanics, kaato, card swaps, and win conditions for
Paskahousu, Valepaskahousu, and Arabia.
"""

import unittest
from game_engine import (
    Card, PlayedCardEntry, Player, GameState, GameRules,
    create_deck, RANK_VALUES, COURT_RANKS, NUMBER_RANKS
)


class TestCardAndDeck(unittest.TestCase):
    def test_deck_creation(self):
        deck = create_deck()
        self.assertEqual(len(deck), 52)
        unique_cards = {(c.suit, c.rank) for c in deck}
        self.assertEqual(len(unique_cards), 52)

    def test_rank_values(self):
        # 3 is lowest standard card (3), 2 is highest (15), Ace is 14
        self.assertEqual(RANK_VALUES['3'], 3)
        self.assertEqual(RANK_VALUES['10'], 10)
        self.assertEqual(RANK_VALUES['J'], 11)
        self.assertEqual(RANK_VALUES['Q'], 12)
        self.assertEqual(RANK_VALUES['K'], 13)
        self.assertEqual(RANK_VALUES['A'], 14)
        self.assertEqual(RANK_VALUES['2'], 15)


class TestPaskahousuRules(unittest.TestCase):
    def setUp(self):
        self.rules = GameRules(mode="paskahousu")
        self.game = GameState("TEST_PASKIS", self.rules)
        self.p1 = Player("p1", "Alice")
        self.p2 = Player("p2", "Bob")
        self.game.players = [self.p1, self.p2]
        self.game.start_game()

    def test_start_game(self):
        self.assertEqual(len(self.p1.hand), 5)
        self.assertEqual(len(self.p2.hand), 5)
        self.assertEqual(self.game.status, "PLAYING")
        self.assertEqual(len(self.game.draw_deck), 42)

    def test_legal_and_illegal_plays(self):
        curr = self.game.current_player()
        other = self.p2 if curr == self.p1 else self.p1

        # Clear hand and give known cards
        curr.hand = [Card("♠", "5"), Card("♥", "5")]
        # Play 5 on empty table
        res = self.game.play_cards(curr.id, [0], "5")
        self.assertTrue(res["success"])
        self.assertEqual(self.game.get_top_pile_card().declared_rank, "5")

        # Now it's other's turn; 4 should be illegal on 5
        other.hand = [Card("♦", "4"), Card("♣", "7")]
        res_fail = self.game.play_cards(other.id, [0], "4")
        self.assertFalse(res_fail["success"])

        # 7 should be legal on 5
        res_ok = self.game.play_cards(other.id, [1], "7")
        self.assertTrue(res_ok["success"])

    def test_ten_kaato_clears_number_cards(self):
        curr = self.game.current_player()
        curr.hand = [Card("♠", "7")]
        self.game.play_cards(curr.id, [0], "7")

        next_p = self.game.current_player()
        next_p.hand = [Card("♦", "10")]
        res = self.game.play_cards(next_p.id, [0], "10")
        self.assertTrue(res["success"])
        self.assertTrue(res.get("cleared"))
        self.assertEqual(len(self.game.play_pile), 0)
        self.assertTrue(self.game.first_kaato_done)
        # Player who kaatoi gets another turn!
        self.assertEqual(self.game.current_player(), next_p)

    def test_four_of_a_kind_kaato(self):
        curr = self.game.current_player()
        # Put 3 sixes on pile
        self.game.play_pile = [
            PlayedCardEntry(Card("♠", "6"), "6", "other"),
            PlayedCardEntry(Card("♥", "6"), "6", "other"),
            PlayedCardEntry(Card("♦", "6"), "6", "other"),
        ]
        curr.hand = [Card("♣", "6")]
        res = self.game.play_cards(curr.id, [0], "6")
        self.assertTrue(res["success"])
        self.assertTrue(res.get("cleared"))
        self.assertEqual(len(self.game.play_pile), 0)

    def test_voluntary_pickup(self):
        curr = self.game.current_player()
        # Cannot pickup empty pile
        res = self.game.pickup_pile(curr.id)
        self.assertFalse(res["success"])

        # Put a card in pile
        self.game.play_pile = [PlayedCardEntry(Card("♠", "8"), "8", "other")]
        initial_hand_size = len(curr.hand)
        res_ok = self.game.pickup_pile(curr.id)
        self.assertTrue(res_ok["success"])
        self.assertEqual(len(curr.hand), initial_hand_size + 1)
        self.assertEqual(len(self.game.play_pile), 0)


class TestValepaskahousuRules(unittest.TestCase):
    def setUp(self):
        self.rules = GameRules(mode="valepaskahousu", challenge_seconds=10)
        self.game = GameState("TEST_VALE", self.rules)
        self.p1 = Player("p1", "Alice")
        self.p2 = Player("p2", "Bob")
        self.game.players = [self.p1, self.p2]
        self.game.start_game()

    def test_bluff_and_caught(self):
        curr = self.game.current_player()
        other = self.p2 if curr == self.p1 else self.p1

        # Bluff: play 3s but claim "K"
        curr.hand = [Card("♠", "3")]
        res = self.game.play_cards(curr.id, [0], "K")
        self.assertTrue(res["success"])
        self.assertEqual(self.game.status, "CHALLENGE_WINDOW")

        # Other player challenges
        c_res = self.game.challenge_move(other.id)
        self.assertTrue(c_res["success"])
        self.assertTrue(c_res["lied"])
        # Liar (curr) picks up pile
        self.assertTrue(any(c.rank == "3" for c in curr.hand))

    def test_honest_challenge_penalizes_challenger(self):
        curr = self.game.current_player()
        other = self.p2 if curr == self.p1 else self.p1

        # Honest play: play King and declare King
        curr.hand = [Card("♠", "K")]
        self.game.play_cards(curr.id, [0], "K")

        # Other player mistakenly challenges
        c_res = self.game.challenge_move(other.id)
        self.assertTrue(c_res["success"])
        self.assertFalse(c_res["lied"])
        # Honest was cleared or unchallenged; challenger (other) picks up pile
        self.assertTrue(any(c.rank == "K" for c in other.hand))


class TestArabiaRules(unittest.TestCase):
    def setUp(self):
        self.rules = GameRules(mode="arabia")
        self.game = GameState("TEST_ARABIA", self.rules)
        self.p1 = Player("p1", "Alice")
        self.p2 = Player("p2", "Bob")
        self.game.players = [self.p1, self.p2]
        self.game.start_game()

    def test_arabia_deal(self):
        for p in [self.p1, self.p2]:
            self.assertEqual(len(p.hand), 3)
            self.assertEqual(len(p.table_up), 3)
            self.assertEqual(len(p.table_down), 3)

    def test_table_card_swap_before_first_kaato(self):
        # Swapping allowed before first kaato
        self.assertFalse(self.game.first_kaato_done)
        hand_card = self.p1.hand[0]
        table_card = self.p1.table_up[0]
        res = self.game.swap_table_card(self.p1.id, 0, 0)
        self.assertTrue(res["success"])
        self.assertIn(table_card, self.p1.hand)
        self.assertIn(hand_card, self.p1.table_up)

        # Swapping disallowed after first kaato
        self.game.first_kaato_done = True
        res2 = self.game.swap_table_card(self.p1.id, 0, 0)
        self.assertFalse(res2["success"])

    def test_court_cards_locked_until_first_kaato(self):
        self.assertFalse(self.game.first_kaato_done)
        curr = self.game.current_player()
        curr.hand = [Card("♠", "J"), Card("♥", "6")]

        # Playing Jack should fail when non-court card 6 is available
        res_jack = self.game.play_cards(curr.id, [0], "J")
        self.assertFalse(res_jack["success"])

        # Playing 6 is allowed
        res_six = self.game.play_cards(curr.id, [1], "6")
        self.assertTrue(res_six["success"])

    def test_two_resets_and_continues_turn(self):
        curr = self.game.current_player()
        curr.hand = [Card("♠", "2"), Card("♥", "4")]

        # Play 2
        res = self.game.play_cards(curr.id, [0], "2")
        self.assertTrue(res["success"])
        self.assertTrue(res.get("continue_turn"))
        # Same player continues
        self.assertEqual(self.game.current_player(), curr)
        # Hand is NOT refilled while turn continues (player still holds the 4)
        self.assertEqual(len(curr.hand), 1)
        self.assertEqual(curr.hand[0].rank, "4")

        # Now play the 4
        res2 = self.game.play_cards(curr.id, [0], "4")
        self.assertTrue(res2["success"])
        self.assertFalse(res2.get("continue_turn", False))
        # Turn ends, hand is refilled at end of turn
        self.assertNotEqual(self.game.current_player(), curr)
        self.assertEqual(len(curr.hand), 3)

    def test_kaato_defers_hand_refill_until_turn_ends(self):
        curr = self.game.current_player()
        self.game.play_pile.append(PlayedCardEntry(Card("♦", "7"), "7", "other", False))
        curr.hand = [Card("♠", "10"), Card("♥", "5"), Card("♦", "8")]

        # Play 10 to clear the pile
        res = self.game.play_cards(curr.id, [0], "10")
        self.assertTrue(res["success"])
        self.assertTrue(res.get("cleared"))
        # Player continues on empty table
        self.assertEqual(self.game.current_player(), curr)
        # Hand is NOT refilled yet because player still holds cards
        self.assertEqual(len(curr.hand), 2)

        # Player plays the 5 to empty table
        res2 = self.game.play_cards(curr.id, [0], "5")
        self.assertTrue(res2["success"])
        # Turn ends, turn advances and hand is refilled
        self.assertNotEqual(self.game.current_player(), curr)
        self.assertEqual(len(curr.hand), 3)

    def test_table_up_requires_empty_hand_and_deck(self):
        curr = self.game.current_player()
        curr.hand = [Card("♠", "4")]
        curr.table_up = [Card("♦", "8")]

        # Attempting table_up while hand has cards must fail
        res = self.game.play_cards(curr.id, [0], "8", source="table_up")
        self.assertFalse(res["success"])

        # When hand and deck are empty, table_up succeeds
        curr.hand = []
        self.game.draw_deck = []
        res_ok = self.game.play_cards(curr.id, [0], "8", source="table_up")
        self.assertTrue(res_ok["success"])

    def test_blind_card_play_and_action_info(self):
        curr = self.game.current_player()
        curr.hand = []
        self.game.draw_deck = []
        curr.table_up = []
        curr.table_down = [Card("♠", "5"), Card("♥", "9")]

        # Play blind card 5 on empty table -> legal
        res = self.game.play_blind_card(curr.id, 0)
        self.assertTrue(res["success"])
        self.assertTrue(res["legal"])
        self.assertEqual(res["card"]["rank"], "5")
        self.assertIsNotNone(self.game.last_action_info)
        self.assertEqual(self.game.last_action_info["type"], "blind_card")
        self.assertTrue(self.game.last_action_info["legal"])
        self.assertEqual(self.game.last_action_info["card"]["rank"], "5")

    def test_flip_from_deck_action_info(self):
        curr = self.game.current_player()
        self.game.draw_deck = [Card("♠", "7")]
        self.game.play_pile = [PlayedCardEntry(Card("♦", "5"), "5", "other", False)]

        res = self.game.flip_from_deck(curr.id)
        self.assertTrue(res["success"])
        self.assertTrue(res["fit"])
        self.assertIsNotNone(self.game.last_action_info)
        self.assertEqual(self.game.last_action_info["type"], "deck_flip")
        self.assertTrue(self.game.last_action_info["legal"])
        self.assertEqual(self.game.last_action_info["card"]["rank"], "7")


if __name__ == "__main__":
    unittest.main()
