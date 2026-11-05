"""
Unit and smoke tests for room_manager.py, server.py, and static assets.
Ensures room state is valid, WebSocket payloads serialize cleanly,
and all static assets referenced in index.html exist on disk.
"""

import os
import re
import py_compile
import unittest
from room_manager import RoomManager, Room
from game_engine import GameRules, Player


class TestRoomManager(unittest.TestCase):
    def setUp(self):
        self.rm = RoomManager()

    def test_room_lifecycle(self):
        room = self.rm.get_or_create_room("TEST")
        self.assertIsNotNone(room)
        self.assertEqual(room.room_id, "TEST")

        # Add player
        p1 = Player("u1", "HostUser")
        room.game.players.append(p1)
        room.host_id = "u1"

        # Add bot
        b1 = Player("b1", "Bot1", is_bot=True)
        room.game.players.append(b1)

        self.assertEqual(len(room.game.players), 2)
        self.assertEqual(room.get_player("u1"), p1)
        self.assertEqual(room.get_player("b1"), b1)

    def test_state_json_serializability(self):
        import json
        room = self.rm.get_or_create_room("SER1")
        p1 = Player("u1", "Alice")
        p2 = Player("u2", "Bob", is_bot=True)
        room.game.players = [p1, p2]
        room.game.start_game()

        # Generate state dict for player
        state_dict = {
            "type": "game_state",
            "room_id": room.room_id,
            "rules": room.game.rules.to_dict(),
            "status": room.game.status,
            "players": [p.to_dict(include_hand=(p.id == "u1")) for p in room.game.players],
            "current_player_idx": room.game.current_player_idx,
            "play_pile": [e.to_dict() for e in room.game.play_pile],
            "dead_pile_count": room.game.dead_pile_count,
            "draw_deck_count": len(room.game.draw_deck),
            "history": room.game.history[-10:],
            "winners": room.game.winners,
            "paskahousu_id": room.game.paskahousu_id,
            "first_kaato_done": room.game.first_kaato_done
        }

        # Must serialize to JSON without error
        serialized = json.dumps(state_dict)
        self.assertIsInstance(serialized, str)
        deserialized = json.loads(serialized)
        self.assertEqual(deserialized["room_id"], "SER1")


class TestStaticAssets(unittest.TestCase):
    def setUp(self):
        self.root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        self.static_dir = os.path.join(self.root_dir, "static")

    def test_core_files_exist(self):
        core_files = ["index.html", "style.css", "app.js", "audio.js", "cards.js"]
        for fname in core_files:
            fpath = os.path.join(self.static_dir, fname)
            self.assertTrue(os.path.isfile(fpath), f"Missing core static file: {fname}")

    def test_html_referenced_assets_exist(self):
        index_path = os.path.join(self.static_dir, "index.html")
        with open(index_path, "r", encoding="utf-8") as f:
            html = f.read()

        # Find all src="..." and href="..."
        patterns = [
            r'src=["\']([^"\']+)["\']',
            r'href=["\']([^"\']+\.(?:css|png|jpg|jpeg|ico|json|m4a|mp3))(?:\?[^"\']*)?["\']'
        ]

        found_refs = []
        for pat in patterns:
            for match in re.finditer(pat, html):
                ref = match.group(1).split("?")[0]
                if not ref.startswith("http") and not ref.startswith("//") and not ref.startswith("#"):
                    found_refs.append(ref)

        self.assertGreater(len(found_refs), 0)
        for ref in found_refs:
            full_path = os.path.join(self.static_dir, ref)
            self.assertTrue(os.path.isfile(full_path), f"Referenced asset not found: {ref} (at {full_path})")


class TestSyntaxCompilation(unittest.TestCase):
    def test_all_python_files_compile(self):
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        py_files = []
        for root, dirs, files in os.walk(root_dir):
            if ".git" in root or "__pycache__" in root or ".venv" in root:
                continue
            for f in files:
                if f.endswith(".py"):
                    py_files.append(os.path.join(root, f))

        self.assertGreater(len(py_files), 0)
        for py_file in py_files:
            try:
                py_compile.compile(py_file, doraise=True)
            except py_compile.PyCompileError as e:
                self.fail(f"Syntax error in {py_file}: {e}")

    def test_all_javascript_files_syntax(self):
        root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        static_dir = os.path.join(root_dir, "static")
        js_files = [
            os.path.join(static_dir, f)
            for f in os.listdir(static_dir)
            if f.endswith(".js")
        ]
        self.assertGreater(len(js_files), 0)

        for js_file in js_files:
            with open(js_file, "r", encoding="utf-8") as f:
                content = f.read()

            # Verify balanced braces, brackets, and parentheses
            in_str = None
            in_block_comment = False
            stack = []
            for line_no, line in enumerate(content.splitlines(), 1):
                i = 0
                while i < len(line):
                    if in_block_comment:
                        if line[i:i+2] == "*/":
                            in_block_comment = False
                            i += 2
                            continue
                        i += 1
                        continue
                    if in_str:
                        if line[i:i+2] == "\\\\":
                            i += 2
                            continue
                        if line[i] == in_str:
                            in_str = None
                        i += 1
                        continue
                    if line[i:i+2] == "/*":
                        in_block_comment = True
                        i += 2
                        continue
                    if line[i:i+2] == "//":
                        break
                    ch = line[i]
                    if ch in ('"', "'", "`"):
                        in_str = ch
                        i += 1
                        continue
                    if ch in "({[":
                        stack.append((ch, line_no, i))
                    elif ch in ")}]":
                        if not stack:
                            self.fail(f"Unmatched closing '{ch}' in {js_file} at line {line_no}:{i}")
                        expected = {"(": ")", "{": "}", "[": "]"}[stack[-1][0]]
                        if ch != expected:
                            self.fail(f"Mismatched closing '{ch}' (expected '{expected}') in {js_file} at line {line_no}:{i}")
                        stack.pop()
                    i += 1

            self.assertEqual(len(stack), 0, f"Unclosed brackets in {js_file}: {stack}")


if __name__ == "__main__":
    unittest.main()

