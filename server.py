"""
Multiplayer Paskahousu & Valepaskahousu Server.
Pure Python 3 standard library async HTTP and RFC 6455 WebSocket server.
No external dependencies required!
"""

import asyncio
import base64
import hashlib
import json
import mimetypes
import os
import socket
import struct
import sys
import urllib.parse
from typing import Optional, Tuple, Dict, Any

from room_manager import RoomManager, Room

WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

room_manager = RoomManager()


class WebSocketConnection:
    def __init__(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        self.reader = reader
        self.writer = writer
        self.closed = False
        self.player_id: Optional[str] = None
        self.room_id: Optional[str] = None

    async def send_text(self, text: str):
        if self.closed or self.writer.is_closing():
            return
        payload = text.encode("utf-8")
        length = len(payload)
        if length <= 125:
            header = bytes([0x81, length])
        elif length <= 65535:
            header = bytes([0x81, 126]) + struct.pack(">H", length)
        else:
            header = bytes([0x81, 127]) + struct.pack(">Q", length)

        try:
            self.writer.write(header + payload)
            await self.writer.drain()
        except Exception:
            self.closed = True

    async def send_json(self, data: Dict[str, Any]):
        await self.send_text(json.dumps(data))

    async def send_pong(self, payload: bytes):
        if self.closed or self.writer.is_closing():
            return
        header = bytes([0x8A, len(payload)])
        try:
            self.writer.write(header + payload)
            await self.writer.drain()
        except Exception:
            pass

    async def receive_message(self) -> Optional[str]:
        """Reads one complete unmasked WebSocket text frame."""
        while not self.closed:
            try:
                first_two = await self.reader.readexactly(2)
            except (asyncio.IncompleteReadError, ConnectionResetError, BrokenPipeError):
                self.closed = True
                return None

            b1, b2 = first_two[0], first_two[1]
            fin = (b1 & 0x80) != 0
            opcode = b1 & 0x0F
            is_masked = (b2 & 0x80) != 0
            payload_len = b2 & 0x7F

            if payload_len == 126:
                ext_bytes = await self.reader.readexactly(2)
                payload_len = struct.unpack(">H", ext_bytes)[0]
            elif payload_len == 127:
                ext_bytes = await self.reader.readexactly(8)
                payload_len = struct.unpack(">Q", ext_bytes)[0]

            mask_key = None
            if is_masked:
                mask_key = await self.reader.readexactly(4)

            raw_payload = await self.reader.readexactly(payload_len)

            if is_masked and mask_key:
                payload = bytes(b ^ mask_key[i % 4] for i, b in enumerate(raw_payload))
            else:
                payload = raw_payload

            if opcode == 0x8:  # Connection close
                self.closed = True
                return None
            elif opcode == 0x9:  # Ping
                await self.send_pong(payload)
                continue
            elif opcode == 0xA:  # Pong
                continue
            elif opcode == 0x1:  # Text frame
                return payload.decode("utf-8", errors="replace")

        return None

    def close(self):
        self.closed = True
        try:
            self.writer.close()
        except Exception:
            pass


async def handle_websocket_session(ws: WebSocketConnection):
    current_room: Optional[Room] = None
    player_id: Optional[str] = None

    try:
        while not ws.closed:
            raw_msg = await ws.receive_message()
            if raw_msg is None:
                break

            try:
                data = json.loads(raw_msg)
            except Exception:
                continue

            msg_type = data.get("type")

            if msg_type == "join_room":
                r_id = data.get("room_id", "").strip().upper()
                name = data.get("name", "Pelaaja").strip() or "Pelaaja"
                avatar = data.get("avatar", "🦊")
                p_id = data.get("player_id", "").strip()
                if not p_id:
                    import uuid
                    p_id = f"p_{uuid.uuid4().hex[:8]}"

                current_room = room_manager.get_or_create_room(r_id)
                player_id = p_id
                ws.player_id = p_id
                ws.room_id = r_id

                player = current_room.add_player(p_id, name, avatar, ws)

                # Send welcome response
                await ws.send_json({
                    "type": "joined_room",
                    "room_id": r_id,
                    "player_id": p_id,
                    "is_host": (p_id == current_room.host_id)
                })

                await current_room.broadcast_state()

            elif not current_room or not player_id:
                continue

            elif msg_type == "update_rules":
                if current_room.host_id == player_id:
                    current_room.update_rules(data.get("rules", {}))
                    await current_room.broadcast_state()

            elif msg_type == "add_bot":
                if current_room.host_id == player_id:
                    current_room.add_bot()
                    await current_room.broadcast_state()

            elif msg_type == "remove_bot":
                if current_room.host_id == player_id:
                    current_room.remove_bot(data.get("bot_id", ""))
                    await current_room.broadcast_state()

            elif msg_type == "start_game":
                if current_room.host_id == player_id:
                    await current_room.start_game()

            elif msg_type == "restart_game":
                if current_room.host_id == player_id:
                    await current_room.restart_game()

            elif msg_type == "play_cards":
                card_indices = data.get("card_indices", [])
                declared_rank = data.get("declared_rank", "")
                res = current_room.game.play_cards(player_id, card_indices, declared_rank)
                if not res.get("success"):
                    await ws.send_json({"type": "error", "message": res.get("error", "Virhe")})
                else:
                    await current_room.broadcast_state()
                    current_room.check_next_turn()

            elif msg_type == "challenge":
                res = current_room.game.challenge_move(player_id)
                if not res.get("success"):
                    await ws.send_json({"type": "error", "message": res.get("error", "Virhe")})
                else:
                    await current_room.broadcast_state()
                    current_room.check_next_turn()

            elif msg_type == "pass_challenge":
                res = current_room.game.pass_challenge(player_id)
                await current_room.broadcast_state()
                current_room.check_next_turn()

            elif msg_type == "flip_deck":
                res = current_room.game.flip_from_deck(player_id)
                if not res.get("success"):
                    await ws.send_json({"type": "error", "message": res.get("error", "Virhe")})
                else:
                    await current_room.broadcast_state()
                    current_room.check_next_turn()

            elif msg_type == "pickup_pile":
                res = current_room.game.pickup_pile(player_id)
                if not res.get("success"):
                    await ws.send_json({"type": "error", "message": res.get("error", "Virhe")})
                else:
                    await current_room.broadcast_state()
                    current_room.check_next_turn()

            elif msg_type == "dismiss_reveal":
                current_room.game.dismiss_reveal()
                await current_room.broadcast_state()
                current_room.check_next_turn()

            elif msg_type == "chat":
                player = current_room.get_player(player_id)
                if player:
                    text = data.get("text", "").strip()
                    if text:
                        await current_room.add_chat(player.name, player.avatar, text)

    finally:
        if current_room and player_id:
            current_room.remove_connection(player_id)
            await current_room.broadcast_state()
        ws.close()


async def handle_client(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    try:
        # Read HTTP request header up to \r\n\r\n exactly
        try:
            header_bytes = await reader.readuntil(b"\r\n\r\n")
        except (asyncio.IncompleteReadError, asyncio.LimitOverrunError):
            writer.close()
            return

        if not header_bytes:
            writer.close()
            return

        header_text = header_bytes.decode("utf-8", errors="replace")
        lines = header_text.split("\r\n")
        req_line = lines[0].split()
        if len(req_line) < 2:
            writer.close()
            return

        method, raw_path = req_line[0], req_line[1]
        parsed_url = urllib.parse.urlparse(raw_path)
        path = parsed_url.path

        # Parse headers into dict
        headers: Dict[str, str] = {}
        for line in lines[1:]:
            if ": " in line:
                k, v = line.split(": ", 1)
                headers[k.lower()] = v.strip()

        # Check for WebSocket Upgrade
        if headers.get("upgrade", "").lower() == "websocket":
            ws_key = headers.get("sec-websocket-key")
            if not ws_key:
                writer.write(b"HTTP/1.1 400 Bad Request\r\n\r\n")
                await writer.drain()
                writer.close()
                return

            # Compute Sec-WebSocket-Accept
            accept_raw = hashlib.sha1((ws_key + WS_GUID).encode("utf-8")).digest()
            accept_b64 = base64.b64encode(accept_raw).decode("utf-8")

            handshake_resp = (
                "HTTP/1.1 101 Switching Protocols\r\n"
                "Upgrade: websocket\r\n"
                "Connection: Upgrade\r\n"
                f"Sec-WebSocket-Accept: {accept_b64}\r\n\r\n"
            )
            writer.write(handshake_resp.encode("utf-8"))
            await writer.drain()

            ws_conn = WebSocketConnection(reader, writer)
            await handle_websocket_session(ws_conn)
            return

        # Normal HTTP request
        if method != "GET":
            writer.write(b"HTTP/1.1 405 Method Not Allowed\r\n\r\n")
            await writer.drain()
            writer.close()
            return

        # API endpoint to generate a new room code
        if path == "/api/create_room" or path.endswith("/api/create_room"):
            room = room_manager.create_room()
            resp_body = json.dumps({"room_id": room.room_id}).encode("utf-8")
            resp = (
                f"HTTP/1.1 200 OK\r\n"
                f"Content-Type: application/json; charset=utf-8\r\n"
                f"Content-Length: {len(resp_body)}\r\n"
                f"Access-Control-Allow-Origin: *\r\n\r\n"
            ).encode("utf-8") + resp_body
            writer.write(resp)
            await writer.drain()
            writer.close()
            return

        # Serve static files
        if path == "/" or path == "":
            file_name = "index.html"
        else:
            file_name = path.lstrip("/")

        file_path = os.path.normpath(os.path.join(STATIC_DIR, file_name))
        # Prevent directory traversal
        if not file_path.startswith(STATIC_DIR) or not os.path.isfile(file_path):
            # Fallback to index.html for SPA routes
            file_path = os.path.join(STATIC_DIR, "index.html")

        if os.path.isfile(file_path):
            mime_type, _ = mimetypes.guess_type(file_path)
            mime_type = mime_type or "application/octet-stream"
            with open(file_path, "rb") as f:
                content = f.read()

            resp = (
                f"HTTP/1.1 200 OK\r\n"
                f"Content-Type: {mime_type}\r\n"
                f"Content-Length: {len(content)}\r\n"
                f"Cache-Control: no-cache\r\n"
                f"Connection: close\r\n\r\n"
            ).encode("utf-8") + content
            writer.write(resp)
            await writer.drain()
        else:
            writer.write(b"HTTP/1.1 404 Not Found\r\n\r\n404 Not Found")
            await writer.drain()

    except Exception:
        pass
    finally:
        try:
            writer.close()
        except Exception:
            pass


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


async def main():
    port = int(os.environ.get("PORT", 8000))
    host = "0.0.0.0"

    server = await asyncio.start_server(handle_client, host, port)
    local_ip = get_local_ip()

    print("=" * 60)
    print(" 🃏 PASKAHOUSU & VALEPASKAHOUSU MULTIPLAYER SERVER 🃏")
    print("=" * 60)
    print(f" * Local:   http://localhost:{port}")
    if local_ip != "127.0.0.1":
        print(f" * Network: http://{local_ip}:{port}  <-- Share this with friends on same Wi-Fi!")
    print("=" * 60)
    print("Server running. Press Ctrl+C to stop.")

    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped.")
