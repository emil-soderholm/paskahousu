"""
Room manager for multiplayer Paskahousu and Valepaskahousu.
Manages active rooms, client sessions, WebSockets, background timers, and bot turns.
"""

import asyncio
import json
import random
import time
import uuid
from typing import Dict, List, Optional, Any
from game_engine import GameState, Player, GameRules
from bot_ai import BotAI, BOT_NAMES


class Room:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.game = GameState(room_id, GameRules())
        self.host_id: Optional[str] = None
        self.connections: Dict[str, Any] = {}  # player_id -> WebSocketConnection
        self.challenge_task: Optional[asyncio.Task] = None
        self.bot_turn_task: Optional[asyncio.Task] = None
        self.reveal_task: Optional[asyncio.Task] = None
        self.chat_history: List[Dict[str, Any]] = []

    def get_player(self, player_id: str) -> Optional[Player]:
        return self.game.get_player(player_id)

    async def broadcast(self, message: Dict[str, Any]):
        """Send message to all currently connected players in room."""
        for pid, conn in list(self.connections.items()):
            try:
                await conn.send_json(message)
            except Exception:
                pass

    async def broadcast_state(self):
        """Send personalized game state to each connected player."""
        for pid, conn in list(self.connections.items()):
            try:
                client_state = self.game.to_client_state(pid)
                msg = {
                    "type": "state_update",
                    "state": client_state,
                    "is_host": (pid == self.host_id),
                    "player_id": pid
                }
                await conn.send_json(msg)
            except Exception:
                pass

    async def add_chat(self, sender_name: str, sender_avatar: str, text: str):
        chat_entry = {
            "id": str(uuid.uuid4())[:8],
            "time": time.time(),
            "name": sender_name,
            "avatar": sender_avatar,
            "text": text[:200]
        }
        self.chat_history.append(chat_entry)
        if len(self.chat_history) > 50:
            self.chat_history.pop(0)

        await self.broadcast({
            "type": "chat_message",
            "message": chat_entry
        })

    def add_player(self, player_id: str, name: str, avatar: str, conn: Any) -> Player:
        existing = self.game.get_player(player_id)
        if existing:
            # Reconnection!
            existing.name = name
            existing.avatar = avatar
            existing.connected = True
            self.connections[player_id] = conn
            if not self.host_id:
                self.host_id = player_id
            return existing

        # New player
        player = Player(player_id, name, is_bot=False, avatar=avatar)
        self.game.players.append(player)
        self.connections[player_id] = conn

        if not self.host_id:
            self.host_id = player_id

        self.game.add_log(
            f"{name} liittyi huoneeseen.",
            f"{name} joined the room.",
            "join"
        )
        return player

    def remove_connection(self, player_id: str):
        if player_id in self.connections:
            del self.connections[player_id]

        player = self.game.get_player(player_id)
        if player:
            player.connected = False

        # If host left, elect new host if any human remains
        if self.host_id == player_id:
            human_players = [p for p in self.game.players if not p.is_bot and p.connected]
            self.host_id = human_players[0].id if human_players else None

    def add_bot(self) -> Optional[Player]:
        if self.game.status != "LOBBY":
            return None
        if len(self.game.players) >= 8:
            return None

        # Choose a name not already in players
        used_names = {p.name for p in self.game.players}
        available_bots = [b for b in BOT_NAMES if b["name"] not in used_names]
        bot_info = random.choice(available_bots) if available_bots else {
            "name": f"Botti {len(self.game.players) + 1}",
            "avatar": "🤖"
        }

        bot_id = f"bot_{uuid.uuid4().hex[:6]}"
        bot = Player(bot_id, bot_info["name"], is_bot=True, avatar=bot_info["avatar"])
        self.game.players.append(bot)
        self.game.add_log(
            f"Botti {bot.name} lisättiin peliin.",
            f"Bot {bot.name} added to the game.",
            "bot"
        )
        return bot

    def remove_bot(self, bot_id: str) -> bool:
        if self.game.status != "LOBBY":
            return False
        bot = self.game.get_player(bot_id)
        if bot and bot.is_bot:
            self.game.players.remove(bot)
            self.game.add_log(
                f"Botti {bot.name} poistettiin.",
                f"Bot {bot.name} removed.",
                "bot"
            )
            return True
        return False

    def update_rules(self, rules_dict: Dict[str, Any]):
        if self.game.status == "LOBBY":
            self.game.rules = GameRules.from_dict(rules_dict)
            mode_name = "Valepaskahousu" if self.game.rules.mode == "valepaskahousu" else "Paskahousu"
            self.game.add_log(
                f"Sääntöjä muutettiin: Pelimuoto = {mode_name}.",
                f"Rules updated: Game mode = {mode_name}.",
                "rules"
            )

    async def start_game(self) -> bool:
        self.cancel_tasks()
        success = self.game.start_game()
        if success:
            await self.broadcast_state()
            self.check_next_turn()
        return success

    async def restart_game(self) -> bool:
        self.cancel_tasks()
        self.game.status = "LOBBY"
        self.game.play_pile = []
        self.game.draw_deck = []
        self.game.dead_pile_count = 0
        self.game.challenge_state = None
        self.game.reveal_info = None
        self.game.last_action_info = None
        for p in self.game.players:
            p.hand = []
            p.is_out = False
            p.finish_rank = None
        await self.broadcast_state()
        return True

    def cancel_tasks(self):
        if self.challenge_task and not self.challenge_task.done():
            self.challenge_task.cancel()
        if self.bot_turn_task and not self.bot_turn_task.done():
            self.bot_turn_task.cancel()
        if self.reveal_task and not self.reveal_task.done():
            self.reveal_task.cancel()

    def check_next_turn(self):
        """Called whenever state changes to trigger bot turns, challenge timers, or reveals."""
        self.cancel_tasks()

        if self.game.status == "CHALLENGE_WINDOW":
            self.challenge_task = asyncio.create_task(self._run_challenge_timer())

        elif self.game.status == "REVEAL_PAUSE":
            self.reveal_task = asyncio.create_task(self._run_reveal_pause())

        elif self.game.status == "PLAYING":
            curr = self.game.current_player()
            if curr and curr.is_bot:
                self.bot_turn_task = asyncio.create_task(self._run_bot_turn(curr.id))

    async def _run_challenge_timer(self):
        """Manages the challenge countdown window and bot challenge decisions."""
        cs = self.game.challenge_state
        if not cs:
            return

        # Schedule bot challenge decisions with slight delays
        active_bots = [p for p in self.game.active_players() if p.is_bot and p.id != cs.player_id]
        bot_decision_tasks = [
            asyncio.create_task(self._handle_bot_challenge_decision(b))
            for b in active_bots
        ]

        try:
            while time.time() < cs.ends_at:
                if self.game.status != "CHALLENGE_WINDOW" or self.game.challenge_state != cs:
                    return
                await asyncio.sleep(0.5)

            # Timer expired without challenges!
            if self.game.status == "CHALLENGE_WINDOW" and self.game.challenge_state == cs:
                self.game.resolve_unchallenged()
                await self.broadcast_state()
                self.check_next_turn()

        except asyncio.CancelledError:
            pass
        finally:
            for t in bot_decision_tasks:
                if not t.done():
                    t.cancel()

    async def _handle_bot_challenge_decision(self, bot: Player):
        """A bot decides whether to challenge or pass after a human-like delay."""
        try:
            # Human-like delay: 1.5 to 3.5 seconds
            delay = random.uniform(1.5, 3.2)
            await asyncio.sleep(delay)

            if self.game.status != "CHALLENGE_WINDOW" or not self.game.challenge_state:
                return

            cs = self.game.challenge_state
            if cs.player_id == bot.id:
                return

            should_c = BotAI.should_challenge(self.game, bot)
            if should_c:
                self.game.challenge_move(bot.id)
                await self.broadcast_state()
                self.check_next_turn()
            else:
                self.game.pass_challenge(bot.id)
                await self.broadcast_state()
                # Check if this pass was the last one needed
                if self.game.status != "CHALLENGE_WINDOW":
                    self.check_next_turn()

        except asyncio.CancelledError:
            pass

    async def _run_reveal_pause(self):
        """Displays the dramatic card flip result for 3.5 seconds before resuming play."""
        try:
            await asyncio.sleep(3.5)
            if self.game.status == "REVEAL_PAUSE":
                self.game.dismiss_reveal()
                await self.broadcast_state()
                self.check_next_turn()
        except asyncio.CancelledError:
            pass

    async def _run_bot_turn(self, bot_id: str):
        """Executes a bot's play/flip/pickup turn after realistic thinking delay."""
        try:
            # Thinking delay: 1.2 to 2.2 seconds
            delay = random.uniform(1.2, 2.2)
            await asyncio.sleep(delay)

            curr = self.game.current_player()
            if not curr or curr.id != bot_id or self.game.status != "PLAYING":
                return

            move = BotAI.choose_move(self.game, curr)
            if move["action"] == "play":
                self.game.play_cards(curr.id, move["card_indices"], move["declared_rank"])
            elif move["action"] == "flip_deck":
                self.game.flip_from_deck(curr.id)
            elif move["action"] == "pickup":
                self.game.pickup_pile(curr.id)

            await self.broadcast_state()
            self.check_next_turn()

        except asyncio.CancelledError:
            pass


class RoomManager:
    def __init__(self):
        self.rooms: Dict[str, Room] = {}

    def get_or_create_room(self, room_id: str) -> Room:
        clean_id = room_id.upper().strip()
        if clean_id not in self.rooms:
            self.rooms[clean_id] = Room(clean_id)
        return self.rooms[clean_id]

    def create_room(self) -> Room:
        # Generate friendly 4-letter room code
        letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        for _ in range(50):
            code = "".join(random.choice(letters) for _ in range(4))
            if code not in self.rooms:
                room = Room(code)
                self.rooms[code] = room
                return room
        code = str(uuid.uuid4())[:4].upper()
        room = Room(code)
        self.rooms[code] = room
        return room

