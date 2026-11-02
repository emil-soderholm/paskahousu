/**
 * Multiplayer Paskahousu & Valepaskahousu Web Application.
 * Full client-side game logic, WebSocket management, sound effects, animations, and i18n.
 */

// Multi-language strings (Finnish & English)
const I18N = {
  fi: {
    appTitle: "Valepaskahousu",
    tagline: "Perinteinen suomalainen korttipeli",
    createRoom: "Luo uusi pelihuone",
    joinRoom: "Liity koodilla",
    roomCode: "Huonekoodi",
    yourName: "Nimimerkkisi",
    chooseAvatar: "Valitse hahmo",
    enterGame: "Siirry huoneeseen",
    waitingPlayers: "Odotetaan pelaajia...",
    startGame: "Aloita peli",
    addBot: "+ Lisää botti",
    copyLink: "Kopioi kutsulinkki",
    linkCopied: "Linkki kopioitu leikepöydälle!",
    rulesHeading: "Huoneen säännöt",
    gameMode: "Pelimuoto",
    modeValepaska: "Valepaskahousu (Valehtelu sallittu)",
    modeAvopaska: "Paskahousu (Avopeli)",
    modeArabia: "Arabia (Arabialainen)",
    tableCardsTitle: "Pöytäkortit",
    swapHint: "💡 Voit vaihtaa kortteja kädestä pöytään ennen siirtoasi!",
    courtRule: "Seiskan sääntö (Kuvakortit)",
    court7: "Vain 7 tai suuremman päälle (Normaali)",
    court9: "Vain 9 tai suuremman päälle (Tiukka)",
    courtFree: "Saa lyödä minkä vain päälle (Vapaa)",
    twoRule: "Kakkosen sääntö",
    twoOnlyTwo: "Vain toinen 2 päälle (Perinteinen)",
    twoReset: "Kakkonen nollaa pinon (Vapaa)",
    emptyTenAce: "Kymppi/Ässä tyhjään pöytään",
    emptyPickup: "Seuraava joutuu nostamaan",
    emptyForbidden: "Kielletty tyhjään pöytään",
    challengeTime: "Haastoaika",
    playCards: "Pelaa valitut kortit",
    flipDeck: "Käännä pakasta",
    pickupPile: "Nosta pöytä",
    pass: "Uskon 👍",
    challenge: "HAASTA! ⚡",
    claimedCards: "väittää lyöneensä:",
    deckCount: "Pakka",
    clearedCount: "Kaadettu",
    bluffModalTitle: "Mitä väität pelaavasi?",
    bluffModalSubtitle: "Voit kertoa totuuden tai valehdella pokalla naamalla!",
    confirmPlay: "Lyö pöytään",
    cancel: "Peruuta",
    liarCaught: "VALEHTELI! 🤥",
    honestPlayer: "PUHUI TOTTA! 😇",
    gameOver: "Peli Päättynyt!",
    paskahousuTitle: "Pelin häviäjä ja PASKAHOUSU:",
    playAgain: "Pelaa uudelleen",
    chatPlaceholder: "Kirjoita viesti...",
    send: "Lähetä",
    turnYou: "Sinun vuorosi!",
    turnOther: "Vuorossa: ",
    noCardsSelected: "Valitse kortit ensin!",
    emptyPile: "Pöytä on tyhjä",
    cardsSelected: "korttia valittu",
    leaveGame: "Poistu",
    leaveTitle: "Haluatko poistua pelistä?",
    leaveSubtitle: "Poistutaan takaisin päävalikkoon.",
    confirmLeave: "Kyllä, poistu"
  },
  en: {
    appTitle: "Valepaskahousu",
    tagline: "Classic Finnish Bluffing Card Game",
    createRoom: "Create Game Room",
    joinRoom: "Join With Code",
    roomCode: "Room Code",
    yourName: "Your Nickname",
    chooseAvatar: "Choose Avatar",
    enterGame: "Enter Room",
    waitingPlayers: "Waiting for players...",
    startGame: "Start Game",
    addBot: "+ Add Bot",
    copyLink: "Copy Invite Link",
    linkCopied: "Link copied to clipboard!",
    rulesHeading: "Room Rules",
    gameMode: "Game Mode",
    modeValepaska: "Valepaskahousu (Bluffing / Face-down)",
    modeAvopaska: "Paskahousu (Open / Face-up)",
    modeArabia: "Arabia (Palace / Shithead)",
    tableCardsTitle: "Table Cards",
    swapHint: "💡 You can swap cards between hand and table before your turn!",
    courtRule: "Court Card Rule (J, Q, K)",
    court7: "Only on 7+ (Standard)",
    court9: "Only on 9+ (Strict)",
    courtFree: "On any card (Free)",
    twoRule: "Rule of 2s",
    twoOnlyTwo: "Only 2 on 2 (Standard)",
    twoReset: "2 resets the pile (Free)",
    emptyTenAce: "10/Ace to Empty Table",
    emptyPickup: "Next player picks up",
    emptyForbidden: "Forbidden on empty table",
    challengeTime: "Challenge Timer",
    playCards: "Pelaa valitut kortit",
    flipDeck: "Flip From Deck",
    pickupPile: "Pick Up Pile",
    pass: "Believe 👍",
    challenge: "CHALLENGE! ⚡",
    claimedCards: "claims playing:",
    deckCount: "Deck",
    clearedCount: "Cleared",
    bluffModalTitle: "What do you claim to play?",
    bluffModalSubtitle: "Tell the truth or pull off a ruthless bluff!",
    confirmPlay: "Play To Table",
    cancel: "Cancel",
    liarCaught: "LIAR CAUGHT! 🤥",
    honestPlayer: "WAS HONEST! 😇",
    gameOver: "Game Over!",
    paskahousuTitle: "The official PASKAHOUSU (Loser):",
    playAgain: "Play Again",
    chatPlaceholder: "Type message...",
    send: "Send",
    turnYou: "Your turn!",
    turnOther: "Turn: ",
    noCardsSelected: "Select cards first!",
    emptyPile: "Pile is empty",
    cardsSelected: "card(s) selected",
    leaveGame: "Leave",
    leaveTitle: "Leave game?",
    leaveSubtitle: "Return to the main menu.",
    confirmLeave: "Yes, leave"
  }
};

class GameApp {
  constructor() {
    this.lang = localStorage.getItem('valepaska_lang') || 'fi';
    this.playerId = localStorage.getItem('valepaska_pid') || '';
    this.playerName = localStorage.getItem('valepaska_pname') || 'Pelaaja';
    this.playerAvatar = localStorage.getItem('valepaska_pavatar') || '🦊';
    this.roomId = '';
    this.ws = null;
    this.state = null;
    this.isHost = false;

    this.selectedCardIndices = new Set();
    this.selectedTableUpIndices = new Set();
    this.selectedHandSwapIndex = null;
    this.selectedTableSwapIndex = null;
    this.bluffDeclaredRank = '3';
    this.challengeInterval = null;

    this.initDOM();
    this.initMusic();
    this.initURLParams();
    this.applyLanguage();
  }

  t(key) {
    return (I18N[this.lang] && I18N[this.lang][key]) || (I18N['fi'][key] || key);
  }

  setLanguage(lang) {
    this.lang = lang;
    localStorage.setItem('valepaska_lang', lang);
    this.applyLanguage();
    if (this.state) {
      this.render();
    }
  }

  applyLanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && this.t(key)) {
        el.textContent = this.t(key);
      }
    });

    document.querySelectorAll('[data-i18n-ph]').forEach(el => {
      const key = el.getAttribute('data-i18n-ph');
      if (key && this.t(key)) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    const langBtn = document.getElementById('langToggleBtn');
    if (langBtn) {
      langBtn.textContent = this.lang === 'fi' ? '🇫🇮 FI' : '🇬🇧 EN';
    }
  }

  initURLParams() {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      const input = document.getElementById('joinRoomCodeInput');
      if (input) input.value = roomParam.toUpperCase();
    }
  }

  initDOM() {
    // Nickname input
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) {
      nameInput.value = this.playerName;
      nameInput.addEventListener('input', (e) => {
        this.playerName = e.target.value.trim() || 'Pelaaja';
        localStorage.setItem('valepaska_pname', this.playerName);
      });
    }

    // Avatar picker buttons
    document.querySelectorAll('.avatar-btn').forEach(btn => {
      if (btn.getAttribute('data-avatar') === this.playerAvatar) {
        btn.classList.add('selected');
      }
      btn.addEventListener('click', () => {
        document.querySelectorAll('.avatar-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.playerAvatar = btn.getAttribute('data-avatar');
        localStorage.setItem('valepaska_pavatar', this.playerAvatar);
      });
    });

    // Create room button
    document.getElementById('createRoomBtn').addEventListener('click', () => this.handleCreateRoom());

    // Join room button
    document.getElementById('joinRoomBtn').addEventListener('click', () => {
      const input = document.getElementById('joinRoomCodeInput');
      const code = input ? input.value.trim().toUpperCase() : '';
      if (code) {
        this.connectToRoom(code);
      }
    });

    // Language toggle
    document.getElementById('langToggleBtn').addEventListener('click', () => {
      this.setLanguage(this.lang === 'fi' ? 'en' : 'fi');
    });

    // Leave game modal & button
    const leaveBtn = document.getElementById('leaveGameBtn');
    const leaveModal = document.getElementById('leaveModal');
    const confirmLeaveBtn = document.getElementById('confirmLeaveBtn');
    const cancelLeaveBtn = document.getElementById('cancelLeaveBtn');

    if (leaveBtn && leaveModal) {
      leaveBtn.addEventListener('click', () => {
        leaveModal.classList.add('active');
      });

      if (cancelLeaveBtn) {
        cancelLeaveBtn.addEventListener('click', () => {
          leaveModal.classList.remove('active');
        });
      }

      if (confirmLeaveBtn) {
        confirmLeaveBtn.addEventListener('click', () => {
          leaveModal.classList.remove('active');
          this.handleLeaveGame();
        });
      }
    }

    // Sound toggle
    const soundBtn = document.getElementById('soundToggleBtn');
    if (soundBtn) {
      soundBtn.textContent = window.sounds.muted ? '🔇' : '🔊';
      soundBtn.addEventListener('click', () => {
        const isMuted = window.sounds.toggleMute();
        soundBtn.textContent = isMuted ? '🔇' : '🔊';
      });
    }

    // Chat drawer toggle
    const chatToggle = document.getElementById('chatToggleBtn');
    const chatDrawer = document.getElementById('chatDrawer');
    if (chatToggle && chatDrawer) {
      chatToggle.addEventListener('click', () => {
        chatDrawer.classList.toggle('open');
      });
      document.getElementById('closeChatBtn').addEventListener('click', () => {
        chatDrawer.classList.remove('open');
      });
    }

    // Chat form
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    if (chatForm && chatInput) {
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if (text) {
          this.sendWS({ type: 'chat', text });
          chatInput.value = '';
        }
      });
    }

    // Floating emotes
    document.querySelectorAll('.emote-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emote = btn.textContent.trim();
        this.sendWS({ type: 'chat', text: emote });
        window.sounds.playPop();
      });
    });

    // Copy room link
    const copyBtn = document.getElementById('copyRoomLinkBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        let urlText = window.location.href;
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('room', this.roomId);
          urlText = url.toString();
        } catch (e) {}

        navigator.clipboard.writeText(urlText).then(() => {
          copyBtn.textContent = this.t('linkCopied');
          setTimeout(() => {
            copyBtn.textContent = this.t('copyLink');
          }, 2000);
        });
      });
    }

    // Lobby actions
    document.getElementById('startGameBtn').addEventListener('click', () => {
      this.sendWS({ type: 'start_game' });
    });

    document.getElementById('addBotBtn').addEventListener('click', () => {
      this.sendWS({ type: 'add_bot' });
    });

    // House rules controls
    const bindRuleSelect = (elemId, key) => {
      const el = document.getElementById(elemId);
      if (el) {
        el.addEventListener('change', () => {
          if (this.isHost && this.state) {
            const rules = { ...this.state.rules };
            rules[key] = el.value;
            this.sendWS({ type: 'update_rules', rules });
          }
        });
      }
    };
    bindRuleSelect('ruleGameMode', 'mode');
    bindRuleSelect('ruleCourt', 'court_min_rank');
    bindRuleSelect('ruleTwo', 'two_rule');
    bindRuleSelect('ruleEmptyTen', 'empty_ten_ace');

    // In-game bottom action buttons
    document.getElementById('playCardsBtn').addEventListener('click', () => this.handlePlayClick());
    document.getElementById('flipDeckBtn').addEventListener('click', () => {
      this.sendWS({ type: 'flip_deck' });
    });
    document.getElementById('pickupPileBtn').addEventListener('click', () => {
      this.sendWS({ type: 'pickup_pile' });
    });

    // Challenge actions
    document.getElementById('challengeBtn').addEventListener('click', () => {
      this.sendWS({ type: 'challenge' });
    });
    document.getElementById('passBtn').addEventListener('click', () => {
      this.sendWS({ type: 'pass_challenge' });
    });

    // Bluff modal rank selection buttons
    document.querySelectorAll('.rank-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rank-choice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.bluffDeclaredRank = btn.getAttribute('data-rank');
      });
    });

    document.getElementById('confirmBluffPlayBtn').addEventListener('click', () => {
      this.executePlayCards(this.bluffDeclaredRank);
      document.getElementById('bluffModal').classList.remove('active');
    });

    document.getElementById('cancelBluffPlayBtn').addEventListener('click', () => {
      document.getElementById('bluffModal').classList.remove('active');
    });

    // Game over replay
    document.getElementById('playAgainBtn').addEventListener('click', () => {
      this.sendWS({ type: 'restart_game' });
    });
  }

  initMusic() {
    this.musicPlayer = document.getElementById('bgMusicPlayer');
    const musicBtn = document.getElementById('musicToggleBtn');
    const volumeSlider = document.getElementById('musicVolumeSlider');
    const widget = document.querySelector('.music-widget');

    if (!this.musicPlayer) return;

    // Load saved volume (default 0.35)
    const savedVol = localStorage.getItem('valepaska_music_vol');
    if (savedVol !== null) {
      this.musicPlayer.volume = parseFloat(savedVol);
      if (volumeSlider) volumeSlider.value = savedVol;
    } else {
      this.musicPlayer.volume = 0.35;
      if (volumeSlider) volumeSlider.value = '0.35';
    }

    const updateUI = () => {
      const isPlaying = !this.musicPlayer.paused;
      if (widget) widget.classList.toggle('playing', isPlaying);
      if (musicBtn) musicBtn.textContent = isPlaying ? '🎶' : '🎵';
    };

    if (musicBtn) {
      musicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.musicPlayer.paused) {
          this.musicPlayer.play().then(() => {
            localStorage.setItem('valepaska_music_on', 'true');
            updateUI();
          }).catch(e => {
            console.warn('Musiikin toisto vaatii tiedoston static/music.mp3:', e);
          });
        } else {
          this.musicPlayer.pause();
          localStorage.setItem('valepaska_music_on', 'false');
          updateUI();
        }
      });
    }

    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.musicPlayer.volume = val;
        localStorage.setItem('valepaska_music_vol', val.toString());
      });
      volumeSlider.addEventListener('click', (e) => e.stopPropagation());
    }

    // Default to true: Lost in the Fire plays automatically!
    const shouldPlay = localStorage.getItem('valepaska_music_on') !== 'false';

    const tryAutoPlay = () => {
      if (shouldPlay && this.musicPlayer.paused) {
        const playPromise = this.musicPlayer.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            localStorage.setItem('valepaska_music_on', 'true');
            updateUI();
          }).catch(() => {
            // Browser autoplay restricted: auto-start on very first interaction!
            const onFirstGesture = () => {
              if (localStorage.getItem('valepaska_music_on') !== 'false' && this.musicPlayer.paused) {
                this.musicPlayer.play().then(() => {
                  localStorage.setItem('valepaska_music_on', 'true');
                  updateUI();
                }).catch(() => {});
              }
            };
            ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
              window.addEventListener(evt, onFirstGesture, { once: true, capture: true });
            });
          });
        }
      }
    };

    // Attempt immediate playback on page open
    tryAutoPlay();

    this.musicPlayer.addEventListener('play', updateUI);
    this.musicPlayer.addEventListener('pause', updateUI);
  }

  getApiBase() {
    const params = new URLSearchParams(window.location.search);
    const serverParam = params.get('server') || localStorage.getItem('valepaska_server_url');
    if (serverParam) {
      if (serverParam.startsWith('http://') || serverParam.startsWith('https://')) {
        return `${serverParam.replace(/\/$/, '')}/api/`;
      }
      const proto = (serverParam.includes('localhost') || serverParam.includes('127.0.0.1')) ? 'http:' : 'https:';
      return `${proto}//${serverParam.replace(/\/$/, '')}/api/`;
    }
    if (window.location.protocol === 'file:' || !window.location.host) {
      return 'http://localhost:8000/api/';
    }
    const basePath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
    return `${window.location.origin}${basePath}/api/`;
  }

  getWebSocketUrl() {
    const params = new URLSearchParams(window.location.search);
    const serverParam = params.get('server') || localStorage.getItem('valepaska_server_url');
    if (serverParam) {
      let clean = serverParam.trim();
      if (clean.startsWith('http://')) clean = 'ws://' + clean.slice(7);
      if (clean.startsWith('https://')) clean = 'wss://' + clean.slice(8);
      if (!clean.startsWith('ws://') && !clean.startsWith('wss://')) {
        const proto = (clean.includes('localhost') || clean.includes('127.0.0.1')) ? 'ws:' : 'wss:';
        clean = `${proto}//${clean}`;
      }
      return clean.endsWith('/ws') ? clean : `${clean.replace(/\/$/, '')}/ws`;
    }

    if (window.location.protocol === 'file:' || !window.location.host) {
      return 'ws://localhost:8000/ws';
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const basePath = window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
    return `${protocol}//${window.location.host}${basePath}/ws`;
  }

  async handleCreateRoom() {
    try {
      const endpoint = this.getApiBase() + 'create_room';
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.room_id) {
        this.connectToRoom(data.room_id);
        return;
      }
    } catch (e) {
      console.warn('API create_room failed, generating local code:', e);
    }
    // Fallback: generate local 4-letter code
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += letters[Math.floor(Math.random() * letters.length)];
    this.connectToRoom(code);
  }

  connectToRoom(roomId) {
    this.roomId = roomId.toUpperCase();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', this.roomId);
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}

    const wsUrl = this.getWebSocketUrl();

    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (e) {}
    }

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error('Failed to construct WebSocket:', err);
      alert((this.lang === 'fi')
        ? `Yhteysvirhe: Ei voitu yhdistää osoitteeseen ${wsUrl}. Varmista että palvelin on käynnissä (python3 server.py)!`
        : `Connection error: Could not connect to ${wsUrl}. Make sure server is running (python3 server.py)!`);
      return;
    }

    this.ws.onopen = () => {
      // Send join room message
      this.sendWS({
        type: 'join_room',
        room_id: this.roomId,
        player_id: this.playerId,
        name: this.playerName,
        avatar: this.playerAvatar
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error('WS Parse Error', e);
      }
    };

    this.ws.onclose = () => {
      console.warn('WS disconnected. Attempting to reconnect in 2.5s...');
      this.reconnectTimer = setTimeout(() => {
        if (this.roomId) {
          this.connectToRoom(this.roomId);
        }
      }, 2500);
    };

    this.ws.onerror = (err) => {
      console.error('WS error:', err);
    };
  }

  sendWS(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  handleMessage(msg) {
    if (msg.type === 'joined_room') {
      this.playerId = msg.player_id;
      this.isHost = msg.is_host;
      localStorage.setItem('valepaska_pid', this.playerId);
      const codeDisplay = document.getElementById('roomCodeDisplay');
      if (codeDisplay) codeDisplay.textContent = msg.room_id;
      const headerCode = document.getElementById('headerRoomCode');
      if (headerCode) headerCode.textContent = msg.room_id;
    } else if (msg.type === 'state_update') {
      const oldState = this.state;
      this.state = msg.state;
      this.isHost = msg.is_host;
      this.handleStateAudio(oldState, this.state);
      this.render();
    } else if (msg.type === 'chat_message') {
      this.appendChatMessage(msg.message);
    } else if (msg.type === 'error') {
      alert(msg.message);
    }
  }

  handleStateAudio(oldState, newState) {
    if (!oldState) return;

    // Challenge window opened
    if (newState.status === 'CHALLENGE_WINDOW' && oldState.status !== 'CHALLENGE_WINDOW') {
      window.sounds.playChallengeAlert();
    }

    // Reveal pause (challenge result)
    if (newState.status === 'REVEAL_PAUSE' && oldState.status !== 'REVEAL_PAUSE') {
      if (newState.reveal_info) {
        if (newState.reveal_info.lied) {
          window.sounds.playLiarCaught();
        } else {
          window.sounds.playHonestFanfare();
        }
      }
    }

    // Pile cleared (Kaatuu)
    if (newState.dead_pile_count > oldState.dead_pile_count) {
      window.sounds.playKaatuu();
    }

    // Normal play
    if (newState.play_pile.length > oldState.play_pile.length) {
      window.sounds.playCardSnap();
    }

    // Pickup
    if (newState.play_pile.length === 0 && oldState.play_pile.length > 0 && newState.status === 'PLAYING') {
      window.sounds.playPickup();
    }

    // Game Over
    if (newState.status === 'GAME_OVER' && oldState.status !== 'GAME_OVER') {
      window.sounds.playToiletFlush();
    }
  }

  render() {
    if (!this.state) return;

    // Switch screen depending on status
    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');

    lobbyScreen.classList.remove('active');
    gameScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');

    if (this.state.status === 'LOBBY') {
      lobbyScreen.classList.add('active');
      this.renderLobby();
    } else if (this.state.status === 'GAME_OVER') {
      gameScreen.classList.add('active');
      gameOverScreen.classList.add('active');
      this.renderGameTable();
      this.renderGameOver();
    } else {
      gameScreen.classList.add('active');
      this.renderGameTable();
    }
  }

  handleLeaveGame() {
    this.sendWS({ type: 'leave_room' });
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.onclose = null;
        this.ws.onerror = null;
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    this.roomId = '';
    this.state = null;
    this.selectedCardIndices.clear();

    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('room');
      window.history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
    } catch (e) {}

    const lobbyScreen = document.getElementById('lobbyScreen');
    const gameScreen = document.getElementById('gameScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    if (lobbyScreen) lobbyScreen.classList.add('active');
    if (gameScreen) gameScreen.classList.remove('active');
    if (gameOverScreen) gameOverScreen.classList.remove('active');

    const joinSec = document.getElementById('joinOrCreateSection');
    const waitSec = document.getElementById('roomWaitingSection');
    const headerCode = document.getElementById('headerRoomCode');
    const leaveBtn = document.getElementById('leaveGameBtn');

    if (joinSec) joinSec.style.display = 'block';
    if (waitSec) waitSec.style.display = 'none';
    if (headerCode) headerCode.style.display = 'none';
    if (leaveBtn) leaveBtn.style.display = 'none';
  }

  renderLobby() {
    const joinSec = document.getElementById('joinOrCreateSection');
    const waitSec = document.getElementById('roomWaitingSection');
    const headerCode = document.getElementById('headerRoomCode');
    const leaveBtn = document.getElementById('leaveGameBtn');

    if (this.state && this.state.room_id) {
      if (joinSec) joinSec.style.display = 'none';
      if (waitSec) waitSec.style.display = 'block';
      if (headerCode) {
        headerCode.style.display = 'flex';
        headerCode.textContent = this.state.room_id;
      }
      if (leaveBtn) leaveBtn.style.display = 'flex';
    } else {
      if (joinSec) joinSec.style.display = 'block';
      if (waitSec) waitSec.style.display = 'none';
      if (headerCode) headerCode.style.display = 'none';
      if (leaveBtn) leaveBtn.style.display = 'none';
    }

    // Show lobby room code
    const codeDisplay = document.getElementById('roomCodeDisplay');
    if (codeDisplay) codeDisplay.textContent = this.state.room_id;

    // Host controls visibility
    document.getElementById('startGameBtn').style.display = this.isHost ? 'block' : 'none';
    document.getElementById('addBotBtn').style.display = this.isHost ? 'block' : 'none';

    // Disable rule inputs for non-host
    ['ruleGameMode', 'ruleCourt', 'ruleTwo', 'ruleEmptyTen'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = !this.isHost;
    });

    if (this.state.rules) {
      const r = this.state.rules;
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
      };
      setVal('ruleGameMode', r.mode);
      setVal('ruleCourt', r.court_min_rank);
      setVal('ruleTwo', r.two_rule);
      setVal('ruleEmptyTen', r.empty_ten_ace);
    }

    // Render players in lobby
    const container = document.getElementById('lobbyPlayersGrid');
    container.innerHTML = '';
    this.state.players.forEach(p => {
      const chip = document.createElement('div');
      chip.className = 'player-lobby-chip';
      if (p.id === this.playerId) chip.style.borderColor = 'var(--gold)';

      chip.innerHTML = `
        <span class="player-chip-avatar">${p.avatar}</span>
        <div>
          <span class="player-chip-name">${p.name}</span>
          ${p.id === this.state.players[0]?.id ? '<span class="player-chip-badge">HOST</span>' : ''}
          ${p.is_bot ? '<span class="player-chip-badge">BOT</span>' : ''}
        </div>
        ${this.isHost && p.is_bot ? `<button class="remove-bot-btn" data-bot-id="${p.id}">✖</button>` : ''}
      `;
      container.appendChild(chip);
    });

    // Attach bot removal listeners
    container.querySelectorAll('.remove-bot-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const botId = btn.getAttribute('data-bot-id');
        this.sendWS({ type: 'remove_bot', bot_id: botId });
      });
    });
  }

  renderGameTable() {
    const me = this.state.players.find(p => p.id === this.playerId);
    const opponents = this.state.players.filter(p => p.id !== this.playerId);
    const isMyTurn = (this.state.current_player_id === this.playerId && this.state.status === 'PLAYING');

    // 1. Render Opponents
    const oppArea = document.getElementById('opponentsArea');
    oppArea.innerHTML = '';
    opponents.forEach(p => {
      const seat = document.createElement('div');
      seat.className = 'opponent-seat';
      if (this.state.current_player_id === p.id && this.state.status === 'PLAYING') {
        seat.classList.add('active');
      }

      let speechHtml = '';
      if (this.state.challenge && this.state.challenge.player_id === p.id) {
        speechHtml = `
          <div class="speech-bubble">
            ${this.state.challenge.cards_count}x ${this.state.challenge.declared_rank}!
          </div>
        `;
      }

      // In Arabia, render opponent's table cards
      let oppTableHtml = '';
      if (this.state.rules.mode === 'arabia') {
        oppTableHtml = '<div class="opp-table-cards">';
        for (let s = 0; s < 3; s++) {
          const upCard = (p.table_up && p.table_up[s]) || null;
          const hasDown = (p.table_down_count && s < p.table_down_count);
          if (upCard || hasDown) {
            oppTableHtml += `<div class="opp-table-slot">`;
            if (hasDown) {
              oppTableHtml += `<div class="opp-down-badge">🂠</div>`;
            }
            if (upCard) {
              const cardEl = createCardElement(upCard);
              oppTableHtml += cardEl.outerHTML;
            }
            oppTableHtml += `</div>`;
          }
        }
        oppTableHtml += '</div>';
      }

      seat.innerHTML = `
        <div class="opponent-avatar-box">
          ${p.avatar}
          <div class="opponent-cards-badge">🂠 ${p.card_count}</div>
        </div>
        <div class="opponent-name">${p.name}</div>
        <div class="opponent-status-tag">
          ${p.is_out ? `🏆 #${p.finish_rank}` : (this.state.current_player_id === p.id ? (this.lang === 'fi' ? 'VUOROSSA' : 'TURN') : '')}
        </div>
        ${oppTableHtml}
        ${speechHtml}
      `;
      oppArea.appendChild(seat);
    });

    // 2. Render Deck
    const deckCountEl = document.getElementById('deckCountBadge');
    if (deckCountEl) {
      deckCountEl.textContent = `${this.state.draw_deck_count} ${this.t('deckCount').toLowerCase()}`;
    }

    // 3. Render Cleared Counter
    const deadCountEl = document.getElementById('deadCountBadge');
    if (deadCountEl) {
      deadCountEl.textContent = `${this.state.dead_pile_count} ${this.t('clearedCount').toLowerCase()}`;
    }

    // 4. Render Discard Pile
    const pileArea = document.getElementById('playPileArea');
    pileArea.innerHTML = '';

    if (this.state.play_pile.length === 0) {
      pileArea.innerHTML = `
        <div class="pile-empty-slot">
          <span>${this.t('emptyPile')}</span>
        </div>
      `;
    } else {
      // Display top declared rank tag
      if (this.state.top_declared_rank) {
        const topTag = document.createElement('div');
        topTag.className = 'top-declared-tag';
        topTag.textContent = `${this.lang === 'fi' ? 'Pöydässä' : 'Top'}: ${this.state.top_declared_rank}`;
        pileArea.appendChild(topTag);
      }

      // Display pile size tag
      const sizeTag = document.createElement('div');
      sizeTag.className = 'pile-size-tag';
      sizeTag.textContent = `${this.state.play_pile.length} kpl`;
      pileArea.appendChild(sizeTag);

      // Render visible stacked cards (show up to top 5 cards for realism)
      const visibleCount = Math.min(this.state.play_pile.length, 5);
      const startIdx = this.state.play_pile.length - visibleCount;

      for (let i = startIdx; i < this.state.play_pile.length; i++) {
        const entry = this.state.play_pile[i];
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'pile-card-wrapper';

        // Deterministic slight angle rotation based on card index
        const angle = ((i * 37) % 25) - 12;
        const offsetX = ((i * 19) % 16) - 8;
        const offsetY = ((i * 23) % 16) - 8;
        cardWrapper.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${angle}deg)`;

        const cardEl = createCardElement(entry.card, {
          faceDown: !entry.revealed
        });
        cardWrapper.appendChild(cardEl);
        pileArea.appendChild(cardWrapper);
      }
    }

    // 5. Render Challenge Banner
    const challengeBanner = document.getElementById('challengeBanner');
    if (this.state.challenge && this.state.status === 'CHALLENGE_WINDOW') {
      challengeBanner.style.display = 'flex';
      const c = this.state.challenge;
      document.getElementById('challengeClaimDisplay').textContent = `${c.cards_count}x ${c.declared_rank}`;
      document.getElementById('challengePlayerName').textContent = `${c.player_name} ${this.t('claimedCards')}`;

      // Show/hide challenge and pass buttons for this client
      const canChallenge = c.can_challenge && !c.has_passed;
      document.getElementById('challengeBtn').style.display = canChallenge ? 'block' : 'none';
      document.getElementById('passBtn').style.display = canChallenge ? 'block' : 'none';

      // Update timer bar animation
      this.updateChallengeTimer(c.ends_at);
    } else {
      challengeBanner.style.display = 'none';
      if (this.challengeInterval) {
        clearInterval(this.challengeInterval);
        this.challengeInterval = null;
      }
    }

    // 6. Render Reveal Screen
    const revealOverlay = document.getElementById('revealOverlay');
    if (this.state.status === 'REVEAL_PAUSE' && this.state.reveal_info) {
      revealOverlay.style.display = 'flex';
      const r = this.state.reveal_info;
      const verdictEl = document.getElementById('revealVerdict');
      verdictEl.className = `reveal-verdict ${r.lied ? 'lied' : 'honest'}`;
      verdictEl.textContent = r.lied ? this.t('liarCaught') : this.t('honestPlayer');

      const detailsEl = document.getElementById('revealDetails');
      if (r.lied) {
        detailsEl.textContent = `${r.target_name} ${this.lang === 'fi' ? 'jäi kiinni valheesta ja nostaa pöydän!' : 'was caught bluffing and picks up the pile!'}`;
      } else {
        detailsEl.textContent = `${r.challenger_name} ${this.lang === 'fi' ? 'haastoi väärin ja joutuu nostamaan pöydän!' : 'challenged incorrectly and picks up the pile!'}`;
      }

      // Render actual cards revealed
      const cardsRow = document.getElementById('revealedCardsRow');
      cardsRow.innerHTML = '';
      r.actual_cards.forEach(c => {
        const el = createCardElement(c);
        cardsRow.appendChild(el);
      });
    } else {
      revealOverlay.style.display = 'none';
    }

    // 7. Render Player's Table Cards (Arabia)
    const tableCardsContainer = document.getElementById('playerTableCardsContainer');
    const tableCardSlots = document.getElementById('tableCardSlots');
    const swapHintTag = document.getElementById('swapHintTag');

    if (this.state.rules.mode === 'arabia' && me) {
      if (tableCardsContainer) tableCardsContainer.style.display = 'flex';
      if (tableCardSlots) tableCardSlots.innerHTML = '';

      const canSwap = !me.has_played_first_turn && (me.hand && me.hand.length > 0) && (me.table_up && me.table_up.length > 0);
      if (swapHintTag) {
        swapHintTag.style.display = canSwap ? 'inline-block' : 'none';
      }

      const isPhaseTableUp = (!me.hand || me.hand.length === 0) && this.state.draw_deck_count === 0 && (me.table_up && me.table_up.length > 0);
      const isPhaseBlind = (!me.hand || me.hand.length === 0) && this.state.draw_deck_count === 0 && (!me.table_up || me.table_up.length === 0) && (me.table_down_count > 0);

      for (let s = 0; s < 3; s++) {
        const slotEl = document.createElement('div');
        slotEl.className = 'table-card-slot';

        const hasDown = (me.table_down_count && s < me.table_down_count);
        const upCard = (me.table_up && me.table_up[s]) || null;

        if (hasDown) {
          const downWrap = document.createElement('div');
          downWrap.className = 'table-slot-down';
          const downCardEl = createCardElement(null, { faceDown: true });
          downWrap.appendChild(downCardEl);
          slotEl.appendChild(downWrap);

          // If in blind phase and it's my turn, allow clicking blind card to flip it
          if (isPhaseBlind && !upCard && isMyTurn) {
            slotEl.classList.add('blind-active');
            slotEl.title = this.lang === 'fi' ? 'Käännä sokkokortti pöytään!' : 'Flip blind card to pile!';
            slotEl.addEventListener('click', () => {
              window.sounds.playPop();
              this.sendWS({
                type: 'play_blind_card',
                card_index: s
              });
            });
          }
        }

        if (upCard) {
          const upWrap = document.createElement('div');
          upWrap.className = 'table-slot-up';
          const isSelected = this.selectedTableUpIndices.has(s) || (this.selectedTableSwapIndex === s);
          if (isSelected) upWrap.classList.add('selected');

          const cardEl = createCardElement(upCard);
          upWrap.appendChild(cardEl);
          slotEl.appendChild(upWrap);

          upWrap.addEventListener('click', (e) => {
            e.stopPropagation();

            // Swapping with hand card before first play
            if (canSwap) {
              if (this.selectedHandSwapIndex !== null) {
                this.sendWS({
                  type: 'swap_table_card',
                  hand_idx: this.selectedHandSwapIndex,
                  table_idx: s
                });
                this.selectedHandSwapIndex = null;
                this.selectedTableSwapIndex = null;
                this.selectedCardIndices.clear();
                window.sounds.playPop();
                return;
              } else {
                this.selectedTableSwapIndex = (this.selectedTableSwapIndex === s) ? null : s;
                window.sounds.playPop();
                this.render();
                return;
              }
            }

            // Phase 2: Playing from table_up
            if (isPhaseTableUp && isMyTurn) {
              if (this.selectedTableUpIndices.has(s)) {
                this.selectedTableUpIndices.delete(s);
              } else {
                if (this.selectedTableUpIndices.size > 0) {
                  const firstIdx = Array.from(this.selectedTableUpIndices)[0];
                  const firstRank = me.table_up[firstIdx].rank;
                  if (upCard.rank !== firstRank) {
                    this.selectedTableUpIndices.clear();
                  }
                }
                this.selectedTableUpIndices.add(s);
              }
              window.sounds.playPop();
              this.render();
            }
          });
        }

        if (tableCardSlots) tableCardSlots.appendChild(slotEl);
      }
    } else {
      if (tableCardsContainer) tableCardsContainer.style.display = 'none';
    }

    // 8. Render My Hand
    const handContainer = document.getElementById('handCardsContainer');
    handContainer.innerHTML = '';
    if (me && me.hand) {
      me.hand.forEach((card, idx) => {
        const isSelected = this.selectedCardIndices.has(idx) || (this.selectedHandSwapIndex === idx);
        const cardEl = createCardElement(card, {
          selected: isSelected
        });

        // Set card z-index order
        cardEl.style.zIndex = idx + 10;

        cardEl.addEventListener('click', () => {
          const canSwap = this.state.rules.mode === 'arabia' && me && !me.has_played_first_turn && me.table_up && me.table_up.length > 0;
          if (canSwap && this.selectedTableSwapIndex !== null) {
            this.sendWS({
              type: 'swap_table_card',
              hand_idx: idx,
              table_idx: this.selectedTableSwapIndex
            });
            this.selectedTableSwapIndex = null;
            this.selectedHandSwapIndex = null;
            this.selectedCardIndices.clear();
            window.sounds.playPop();
            return;
          }

          if (canSwap && !isMyTurn) {
            this.selectedHandSwapIndex = (this.selectedHandSwapIndex === idx) ? null : idx;
            this.selectedCardIndices.clear();
            if (this.selectedHandSwapIndex !== null) {
              this.selectedCardIndices.add(idx);
            }
            window.sounds.playPop();
            this.render();
            return;
          }

          if (!isMyTurn) return;

          if (canSwap) {
            this.selectedHandSwapIndex = (this.selectedHandSwapIndex === idx) ? null : idx;
          }

          if (this.selectedCardIndices.has(idx)) {
            this.selectedCardIndices.delete(idx);
            if (this.selectedHandSwapIndex === idx) this.selectedHandSwapIndex = null;
          } else {
            // In open Paskahousu & Arabia, cards played together must share the same rank
            if ((this.state.rules.mode === 'paskahousu' || this.state.rules.mode === 'arabia') && this.selectedCardIndices.size > 0) {
              const firstIdx = Array.from(this.selectedCardIndices)[0];
              const firstRank = me.hand[firstIdx].rank;
              if (card.rank !== firstRank) {
                this.selectedCardIndices.clear();
              }
            }
            this.selectedCardIndices.add(idx);
          }
          window.sounds.playPop();
          this.render();
        });

        handContainer.appendChild(cardEl);
      });
    }

    // Show leave button during game
    const leaveBtn = document.getElementById('leaveGameBtn');
    if (leaveBtn) leaveBtn.style.display = 'flex';

    // 9. Update Action Buttons
    const playBtn = document.getElementById('playCardsBtn');
    const playBtnText = document.getElementById('playCardsBtnText');
    const flipBtn = document.getElementById('flipDeckBtn');
    const pickupBtn = document.getElementById('pickupPileBtn');

    const hasTableUpSelected = this.selectedTableUpIndices.size > 0;
    const hasHandSelected = this.selectedCardIndices.size > 0;
    const isBlindPhase = (this.state.rules.mode === 'arabia' && me && (!me.hand || me.hand.length === 0) && this.state.draw_deck_count === 0 && (!me.table_up || me.table_up.length === 0) && (me.table_down_count > 0));

    playBtn.disabled = !isMyTurn || (!hasHandSelected && !hasTableUpSelected);
    const selectedCount = hasTableUpSelected ? this.selectedTableUpIndices.size : this.selectedCardIndices.size;
    const baseText = this.t('playCards');
    const label = selectedCount > 0 ? `${baseText} (${selectedCount})` : (isBlindPhase ? (this.lang === 'fi' ? 'Käännä sokkokortti 👆' : 'Flip blind card 👆') : baseText);
    if (playBtnText) {
      playBtnText.textContent = label;
    } else {
      playBtn.textContent = label;
    }

    flipBtn.disabled = !isMyTurn || this.state.draw_deck_count === 0 || hasTableUpSelected;
    pickupBtn.disabled = !isMyTurn || this.state.play_pile.length === 0;

    // Turn indicator in bottom area
    const turnLabel = document.getElementById('currentTurnLabel');
    if (turnLabel) {
      if (isMyTurn) {
        turnLabel.textContent = this.t('turnYou');
        turnLabel.style.color = 'var(--gold)';
      } else {
        turnLabel.textContent = `${this.t('turnOther')}${this.state.current_player_name || ''}`;
        turnLabel.style.color = 'var(--text-muted)';
      }
    }
  }

  updateChallengeTimer(endsAt) {
    if (this.challengeInterval) clearInterval(this.challengeInterval);

    const timerFill = document.getElementById('challengeTimerFill');
    const totalTime = this.state.rules.challenge_seconds || 8;

    this.challengeInterval = setInterval(() => {
      const now = Date.now() / 1000;
      const remaining = Math.max(0, endsAt - now);
      const pct = (remaining / totalTime) * 100;

      if (timerFill) {
        timerFill.style.width = `${pct}%`;
      }

      if (remaining <= 0) {
        clearInterval(this.challengeInterval);
        this.challengeInterval = null;
      }
    }, 100);
  }

  handlePlayClick() {
    const me = this.state.players.find(p => p.id === this.playerId);
    if (!me) return;

    if (this.selectedTableUpIndices.size > 0) {
      if (!me.table_up) return;
      const selectedCards = Array.from(this.selectedTableUpIndices).map(i => me.table_up[i]);
      const declaredRank = selectedCards[0].rank;
      this.executePlayCards(declaredRank, 'table_up');
      return;
    }

    if (this.selectedCardIndices.size === 0) return;
    if (!me.hand) return;

    const selectedCards = Array.from(this.selectedCardIndices).map(i => me.hand[i]);

    if (this.state.rules.mode === 'paskahousu' || this.state.rules.mode === 'arabia') {
      // In Open Paskahousu and Arabia, declared rank is the actual rank of the cards
      const declaredRank = selectedCards[0].rank;
      this.executePlayCards(declaredRank, 'hand');
    } else {
      // In Valepaskahousu, open the Bluff Declaration Modal!
      this.openBluffModal(selectedCards);
    }
  }

  openBluffModal(selectedCards) {
    const modal = document.getElementById('bluffModal');
    modal.classList.add('active');

    // Pre-select the honest rank by default for player's convenience
    const defaultRank = selectedCards[0].rank;
    this.bluffDeclaredRank = defaultRank;

    document.querySelectorAll('.rank-choice-btn').forEach(btn => {
      const r = btn.getAttribute('data-rank');
      btn.classList.toggle('selected', r === defaultRank);
    });

    document.getElementById('bluffModalQty').textContent = `${selectedCards.length}x`;
  }

  executePlayCards(declaredRank, source = 'hand') {
    let indices;
    if (source === 'table_up') {
      indices = Array.from(this.selectedTableUpIndices);
      this.selectedTableUpIndices.clear();
    } else {
      indices = Array.from(this.selectedCardIndices);
      this.selectedCardIndices.clear();
    }

    this.sendWS({
      type: 'play_cards',
      card_indices: indices,
      declared_rank: declaredRank,
      source: source
    });
  }

  renderGameOver() {
    const list = document.getElementById('gameWinnersList');
    list.innerHTML = '';

    // Render podium
    this.state.winners.forEach((wid, idx) => {
      const p = this.state.players.find(pl => pl.id === wid);
      if (p) {
        const row = document.createElement('div');
        row.className = 'winner-row';
        row.innerHTML = `
          <span class="winner-rank">#${idx + 1} 🏆</span>
          <span>${p.avatar} ${p.name}</span>
          <span>${p.stats?.bluffs_successful || 0} ${this.lang === 'fi' ? 'bluffia onnistui' : 'bluffs succeeded'}</span>
        `;
        list.appendChild(row);
      }
    });

    // Render the Paskahousu
    const loser = this.state.players.find(p => p.id === this.state.paskahousu_id);
    const loserNameEl = document.getElementById('paskahousuLoserName');
    if (loser && loserNameEl) {
      loserNameEl.textContent = `${loser.avatar} ${loser.name}`;
    }

    // Host replay button visibility
    document.getElementById('playAgainBtn').style.display = this.isHost ? 'block' : 'none';
  }

  appendChatMessage(msg) {
    const box = document.getElementById('chatMessagesBox');
    if (!box) return;

    const item = document.createElement('div');
    item.className = 'chat-item';
    item.innerHTML = `
      <span class="chat-item-sender">${msg.avatar} ${msg.name}:</span>
      <span>${msg.text}</span>
    `;
    box.appendChild(item);
    box.scrollTop = box.scrollHeight;
    window.sounds.playPop();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new GameApp();
});
