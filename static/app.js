/**
 * Multiplayer Paskahousu & Valepaskahousu Web Application.
 * Finnish-only, Mobile-First client architecture.
 */

// Finnish strings dictionary
const FI_STRINGS = {
  appTitle: "Pudotuspelit",
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
  copyLink: "Kopioi linkki",
  linkCopied: "Linkki kopioitu!",
  rulesHeading: "Pelisäännöt",
  gameMode: "Pelimuoto",
  modeValepaska: "Valepaskahousu (Valehtelu)",
  modeAvopaska: "Paskahousu (Avopeli)",
  modeArabia: "Arabia (Arabialainen)",
  tableCardsTitle: "Pöytäkortit",
  swapHint: "💡 Vaihto sallittu 1. kaatoon asti",
  courtRule: "Seiskan sääntö (Kuvakortit)",
  court7: "Vain 7+ päälle",
  court9: "Vain 9+ päälle",
  courtFree: "Kaikkien päälle",
  twoRule: "Kakkosen sääntö",
  twoOnlyTwo: "Vain toinen 2 päälle",
  twoReset: "Kakkonen nollaa pinon",
  emptyTenAce: "10 / Ässä tyhjään pöytään",
  emptyPickup: "Seuraava nostaa",
  emptyForbidden: "Kielletty tyhjään",
  playCards: "Pelaa kortit",
  flipDeck: "Käännä pakasta",
  pickupPile: "Nosta pöytä",
  pass: "Uskon 👍",
  challenge: "HAASTA! ⚡",
  claimedCards: "väittää lyöneensä:",
  deckCount: "pakka",
  clearedCount: "kaadettu",
  bluffModalTitle: "Mitä väität pelaavasi?",
  bluffModalSubtitle: "Puhu totta tai bluffaa pokalla naamalla!",
  confirmPlay: "Lyö pöytään",
  cancel: "Peruuta",
  liarCaught: "VALEHTELI! 🤥",
  honestPlayer: "PUHUI TOTTA! 😇",
  gameOver: "Peli Päättynyt!",
  paskahousuTitle: "Pelin häviäjä ja virallinen PASKAHOUSU:",
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
  leaveSubtitle: "Poistut takaisin päävalikkoon.",
  confirmLeave: "Kyllä, poistu"
};

class GameApp {
  constructor() {
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
    this._lastActionId = null;
    this._blindTimeout = null;

    this.initDOM();
    this.initMusic();
    this.initURLParams();
  }

  t(key) {
    return FI_STRINGS[key] || key;
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
    const createBtn = document.getElementById('createRoomBtn');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.handleCreateRoom());
    }

    // Join room button
    const joinBtn = document.getElementById('joinRoomBtn');
    if (joinBtn) {
      joinBtn.addEventListener('click', () => {
        const input = document.getElementById('joinRoomCodeInput');
        const code = input ? input.value.trim().toUpperCase() : '';
        if (code) {
          this.connectToRoom(code);
        }
      });
    }

    const joinCodeInput = document.getElementById('joinRoomCodeInput');
    if (joinCodeInput) {
      joinCodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const code = joinCodeInput.value.trim().toUpperCase();
          if (code) this.connectToRoom(code);
        }
      });
    }

    // Header logo click: prompt to leave game / return to main menu
    const logoGroup = document.getElementById('headerLogoGroup') || document.querySelector('.logo-group');
    if (logoGroup) {
      logoGroup.addEventListener('click', () => {
        if (this.roomId || (this.state && this.state.status !== 'LOBBY')) {
          const leaveModal = document.getElementById('leaveModal');
          if (leaveModal) {
            leaveModal.classList.add('active');
          } else {
            this.handleLeaveGame();
          }
        } else {
          window.location.href = window.location.pathname;
        }
      });
    }

    // Header Room Code Pill click to copy
    const headerRoomCode = document.getElementById('headerRoomCode');
    if (headerRoomCode) {
      headerRoomCode.addEventListener('click', () => {
        if (!this.roomId) return;
        let urlText = window.location.href;
        try {
          const url = new URL(window.location.href);
          url.searchParams.set('room', this.roomId);
          urlText = url.toString();
        } catch (e) {}

        navigator.clipboard.writeText(urlText).then(() => {
          const textEl = headerRoomCode.querySelector('.room-pill-text');
          const orig = textEl ? textEl.textContent : headerRoomCode.textContent;
          if (textEl) textEl.textContent = 'Kopioitu! ✓';
          setTimeout(() => {
            if (textEl) textEl.textContent = orig;
          }, 2000);
        });
      });
    }

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
    const unreadDot = document.getElementById('chatUnreadDot');
    if (chatToggle && chatDrawer) {
      chatToggle.addEventListener('click', () => {
        chatDrawer.classList.toggle('open');
        if (chatDrawer.classList.contains('open') && unreadDot) {
          unreadDot.style.display = 'none';
        }
      });
      const closeChat = document.getElementById('closeChatBtn');
      if (closeChat) {
        closeChat.addEventListener('click', () => {
          chatDrawer.classList.remove('open');
        });
      }
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

    // Table quick chat FAB & form
    const tableQuickChatForm = document.getElementById('tableQuickChatForm');
    const tableQuickChatInput = document.getElementById('tableQuickChatInput');
    const tableChatBar = document.getElementById('tableChatBar');
    const toggleTableChatBtn = document.getElementById('toggleTableChatBtn');

    if (toggleTableChatBtn && tableChatBar) {
      toggleTableChatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        tableChatBar.classList.toggle('mobile-open');
        if (tableChatBar.classList.contains('mobile-open') && tableQuickChatInput) {
          setTimeout(() => tableQuickChatInput.focus(), 150);
        }
      });
    }

    // Close table chat popover on outside click
    document.addEventListener('click', (e) => {
      if (tableChatBar && tableChatBar.classList.contains('mobile-open')) {
        if (!tableChatBar.contains(e.target)) {
          tableChatBar.classList.remove('mobile-open');
        }
      }
    });

    // Deselect cards when clicking or tapping anywhere outside cards and controls
    document.addEventListener('click', (e) => {
      const hasSelection = (
        this.selectedCardIndices.size > 0 ||
        this.selectedTableUpIndices.size > 0 ||
        this.selectedHandSwapIndex !== null ||
        this.selectedTableSwapIndex !== null
      );
      if (!hasSelection) return;

      const isCardOrControl = e.target.closest(
        '.playing-card, .table-slot-up, .table-slot-down, .table-slot, ' +
        '.action-btn, .action-buttons-dock, button, input, textarea, select, ' +
        '.modal-overlay, .modal, .modal-content, .chat-panel, .table-chat-bar, ' +
        '.table-chat-popover, .app-header, .music-player, .deck-station, #playPileArea'
      );

      if (!isCardOrControl) {
        this.selectedCardIndices.clear();
        this.selectedTableUpIndices.clear();
        this.selectedHandSwapIndex = null;
        this.selectedTableSwapIndex = null;
        this.render();
      }
    });

    if (tableQuickChatForm && tableQuickChatInput) {
      tableQuickChatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = tableQuickChatInput.value.trim();
        if (text) {
          this.sendWS({ type: 'chat', text });
          tableQuickChatInput.value = '';
          tableQuickChatInput.blur();
          if (tableChatBar) tableChatBar.classList.remove('mobile-open');
        }
      });
    }

    document.querySelectorAll('.emote-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const emote = btn.textContent.trim();
        this.sendWS({ type: 'chat', text: emote });
        window.sounds.playPop();
        if (tableChatBar) tableChatBar.classList.remove('mobile-open');
      });
    });

    // Center play pile click & drag/drop to play
    const playPileArea = document.getElementById('playPileArea');
    if (playPileArea) {
      playPileArea.addEventListener('click', () => {
        const isMyTurn = (this.state && this.state.current_player_id === this.playerId && this.state.status === 'PLAYING');
        if (!isMyTurn) return;

        const hasHandSelected = this.selectedCardIndices.size > 0;
        const hasTableUpSelected = this.selectedTableUpIndices.size > 0;
        if (hasHandSelected || hasTableUpSelected) {
          window.sounds.playPop();
          this.handlePlayClick();
        }
      });

      playPileArea.addEventListener('dragover', (e) => {
        const isMyTurn = (this.state && this.state.current_player_id === this.playerId && this.state.status === 'PLAYING');
        if (!isMyTurn) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        playPileArea.classList.add('drag-over');
      });

      playPileArea.addEventListener('dragleave', () => {
        playPileArea.classList.remove('drag-over');
      });

      playPileArea.addEventListener('drop', (e) => {
        e.preventDefault();
        playPileArea.classList.remove('drag-over');

        const isMyTurn = (this.state && this.state.current_player_id === this.playerId && this.state.status === 'PLAYING');
        if (!isMyTurn) return;

        const dataStr = e.dataTransfer.getData('text/plain') || '';
        if (dataStr.startsWith('hand:')) {
          const idx = parseInt(dataStr.replace('hand:', ''), 10);
          if (!isNaN(idx) && !this.selectedCardIndices.has(idx)) {
            const me = this.state.players.find(p => p.id === this.playerId);
            if (me && me.hand && me.hand[idx]) {
              const card = me.hand[idx];
              if (this.state.rules.mode === 'paskahousu' || this.state.rules.mode === 'arabia') {
                if (this.selectedCardIndices.size > 0) {
                  const firstIdx = Array.from(this.selectedCardIndices)[0];
                  if (me.hand[firstIdx].rank !== card.rank) {
                    this.selectedCardIndices.clear();
                  }
                }
              }
              this.selectedCardIndices.add(idx);
            }
          }
        } else if (dataStr.startsWith('table_up:')) {
          const s = parseInt(dataStr.replace('table_up:', ''), 10);
          if (!isNaN(s)) {
            this.selectedTableUpIndices.add(s);
          }
        }

        const hasHandSelected = this.selectedCardIndices.size > 0;
        const hasTableUpSelected = this.selectedTableUpIndices.size > 0;
        if (hasHandSelected || hasTableUpSelected) {
          window.sounds.playPop();
          this.handlePlayClick();
        }
      });
    }

    // Draw deck click to flip
    const drawDeckArea = document.getElementById('drawDeckArea');
    if (drawDeckArea) {
      drawDeckArea.addEventListener('click', () => {
        const isMyTurn = (this.state && this.state.current_player_id === this.playerId && this.state.status === 'PLAYING');
        if (isMyTurn && this.state.draw_deck_count > 0 && this.selectedTableUpIndices.size === 0) {
          window.sounds.playPop();
          this.sendWS({ type: 'flip_deck' });
        }
      });
    }

    // Copy room link button in waiting room
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
          copyBtn.textContent = 'Linkki kopioitu! ✓';
          setTimeout(() => {
            copyBtn.textContent = '📋 Kopioi linkki';
          }, 2000);
        });
      });
    }

    // Lobby actions
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.sendWS({ type: 'start_game' });
      });
    }

    const addBotBtn = document.getElementById('addBotBtn');
    if (addBotBtn) {
      addBotBtn.addEventListener('click', () => {
        this.sendWS({ type: 'add_bot' });
      });
    }

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
    const playCardsBtn = document.getElementById('playCardsBtn');
    if (playCardsBtn) {
      playCardsBtn.addEventListener('click', () => this.handlePlayClick());
    }

    const flipDeckBtn = document.getElementById('flipDeckBtn');
    if (flipDeckBtn) {
      flipDeckBtn.addEventListener('click', () => {
        this.sendWS({ type: 'flip_deck' });
      });
    }

    const pickupPileBtn = document.getElementById('pickupPileBtn');
    if (pickupPileBtn) {
      pickupPileBtn.addEventListener('click', () => {
        this.sendWS({ type: 'pickup_pile' });
      });
    }

    // Challenge actions
    const challengeBtn = document.getElementById('challengeBtn');
    if (challengeBtn) {
      challengeBtn.addEventListener('click', () => {
        this.sendWS({ type: 'challenge' });
      });
    }

    const passBtn = document.getElementById('passBtn');
    if (passBtn) {
      passBtn.addEventListener('click', () => {
        this.sendWS({ type: 'pass_challenge' });
      });
    }

    // Bluff modal rank selection buttons
    document.querySelectorAll('.rank-choice-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.rank-choice-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.bluffDeclaredRank = btn.getAttribute('data-rank');
      });
    });

    const confirmBluffBtn = document.getElementById('confirmBluffPlayBtn');
    if (confirmBluffBtn) {
      confirmBluffBtn.addEventListener('click', () => {
        this.executePlayCards(this.bluffDeclaredRank);
        document.getElementById('bluffModal').classList.remove('active');
      });
    }

    const cancelBluffBtn = document.getElementById('cancelBluffPlayBtn');
    if (cancelBluffBtn) {
      cancelBluffBtn.addEventListener('click', () => {
        document.getElementById('bluffModal').classList.remove('active');
      });
    }

    // Game over replay
    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        this.sendWS({ type: 'restart_game' });
      });
    }
  }

  /* ==========================================================================
     BACKGROUND MUSIC PLAYER & PLAYLIST
     ========================================================================== */
  initMusic() {
    this.musicPlayer = document.getElementById('bgMusicPlayer');
    if (!this.musicPlayer) return;

    this.playlist = [
      {
        id: 'lost_in_the_fire',
        title: 'Lost in the Fire',
        artist: 'Gesaffelstein & The Weeknd',
        file: 'music.m4a',
        fallback: 'music.mp3'
      },
      {
        id: 'blinding_lights',
        title: 'Blinding Lights',
        artist: 'The Weeknd',
        file: 'blinding_lights.m4a',
        fallback: 'blinding_lights.mp3'
      },
      {
        id: 'starboy',
        title: 'Starboy',
        artist: 'The Weeknd ft. Daft Punk',
        file: 'starboy.m4a'
      },
      {
        id: 'wake_me_up',
        title: 'Wake Me Up',
        artist: 'The Weeknd',
        file: 'wake_me_up.m4a'
      },
      {
        id: 'timeless',
        title: 'Timeless',
        artist: 'The Weeknd & Playboi Carti',
        file: 'timeless.m4a'
      },
      {
        id: 'moth_to_a_flame',
        title: 'Moth To A Flame',
        artist: 'Swedish House Mafia & The Weeknd',
        file: 'moth_to_a_flame.m4a'
      },
      {
        id: 'save_your_tears',
        title: 'Save Your Tears',
        artist: 'The Weeknd',
        file: 'save_your_tears.m4a'
      },
      {
        id: 'the_hills',
        title: 'The Hills',
        artist: 'The Weeknd',
        file: 'the_hills.m4a'
      },
      {
        id: 'cant_feel_my_face',
        title: "Can't Feel My Face",
        artist: 'The Weeknd',
        file: 'cant_feel_my_face.m4a'
      },
      {
        id: 'die_for_you',
        title: 'Die For You',
        artist: 'The Weeknd',
        file: 'die_for_you.m4a'
      },
      {
        id: 'heartless',
        title: 'Heartless',
        artist: 'The Weeknd',
        file: 'heartless.m4a'
      },
      {
        id: 'pretty',
        title: 'Pretty',
        artist: 'The Weeknd',
        file: 'pretty.m4a'
      },
      {
        id: 'kiss_land',
        title: 'Kiss Land',
        artist: 'The Weeknd',
        file: 'kiss_land.m4a'
      }
    ];

    const savedTrackId = localStorage.getItem('valepaska_selected_track');
    let initialIndex = this.playlist.findIndex(t => t.id === savedTrackId);
    if (initialIndex === -1) initialIndex = 0;
    this.currentTrackIndex = initialIndex;

    const savedVolume = localStorage.getItem('valepaska_music_volume');
    this.musicVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.35;
    this.musicPlayer.volume = this.musicVolume;

    const savedMuted = localStorage.getItem('valepaska_music_muted') === 'true';
    this.musicPlayer.muted = savedMuted;
    this.musicPlayer.loop = false;

    // Load initial track
    this.loadAndPlayTrack(this.currentTrackIndex, false);

    // Auto-advance to next track when track ends
    this.musicPlayer.addEventListener('ended', () => {
      this.playNextTrack(true);
    });

    // Auto play on first user interaction
    const startAudioOnInteraction = () => {
      if (this.musicPlayer && this.musicPlayer.paused && !this.musicPlayer.muted) {
        this.musicPlayer.play().then(() => {
          this.updateMusicUI();
        }).catch(() => {});
      }
      window.removeEventListener('click', startAudioOnInteraction);
      window.removeEventListener('keydown', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
    };
    window.addEventListener('click', startAudioOnInteraction);
    window.addEventListener('keydown', startAudioOnInteraction);
    window.addEventListener('touchstart', startAudioOnInteraction);

    // Modal controls wiring
    const musicMenuBtn = document.getElementById('musicMenuBtn');
    const musicMenuModal = document.getElementById('musicMenuModal');
    const closeMusicMenuBtn = document.getElementById('closeMusicMenuBtn');

    if (musicMenuBtn && musicMenuModal) {
      musicMenuBtn.addEventListener('click', () => {
        musicMenuModal.classList.add('active');
        this.renderMusicPlaylist();
        this.updateMusicUI();
      });
    }

    if (closeMusicMenuBtn && musicMenuModal) {
      closeMusicMenuBtn.addEventListener('click', () => {
        musicMenuModal.classList.remove('active');
      });
    }

    const playPauseBtn = document.getElementById('musicPlayPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        this.toggleMusicPlayPause();
      });
    }

    const prevBtn = document.getElementById('musicPrevBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        this.playPrevTrack(true);
      });
    }

    const nextBtn = document.getElementById('musicNextBtn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        this.playNextTrack(true);
      });
    }

    const volSlider = document.getElementById('musicModalVolumeSlider');
    if (volSlider) {
      volSlider.value = this.musicVolume;
      volSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.musicVolume = val;
        this.musicPlayer.volume = val;
        this.musicPlayer.muted = (val === 0);
        localStorage.setItem('valepaska_music_volume', val);
        this.updateMusicUI();
      });
    }

    // Music Progress / Seek Bar Controls
    const progressBar = document.getElementById('musicProgressBar');
    const currentTimeEl = document.getElementById('musicCurrentTime');
    const durationEl = document.getElementById('musicDuration');
    let isScrubbing = false;

    const formatTime = (secs) => {
      if (isNaN(secs) || secs < 0) return '0:00';
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    this.musicPlayer.addEventListener('timeupdate', () => {
      if (!isScrubbing && progressBar && this.musicPlayer.duration) {
        progressBar.value = (this.musicPlayer.currentTime / this.musicPlayer.duration) * 100;
      }
      if (currentTimeEl) {
        currentTimeEl.textContent = formatTime(this.musicPlayer.currentTime);
      }
    });

    const updateDuration = () => {
      if (durationEl && this.musicPlayer.duration) {
        durationEl.textContent = formatTime(this.musicPlayer.duration);
      }
    };

    this.musicPlayer.addEventListener('loadedmetadata', updateDuration);
    this.musicPlayer.addEventListener('durationchange', updateDuration);

    if (progressBar) {
      progressBar.addEventListener('input', (e) => {
        isScrubbing = true;
        if (currentTimeEl && this.musicPlayer.duration) {
          const previewSec = (parseFloat(e.target.value) / 100) * this.musicPlayer.duration;
          currentTimeEl.textContent = formatTime(previewSec);
        }
      });

      progressBar.addEventListener('change', (e) => {
        isScrubbing = false;
        if (this.musicPlayer.duration) {
          this.musicPlayer.currentTime = (parseFloat(e.target.value) / 100) * this.musicPlayer.duration;
        }
      });
    }

    this.musicPlayer.addEventListener('play', () => this.updateMusicUI());
    this.musicPlayer.addEventListener('pause', () => this.updateMusicUI());

    this.renderMusicPlaylist();
    this.updateMusicUI();
  }

  playPrevTrack(autoplay = true) {
    if (!this.playlist || this.playlist.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.playlist.length) % this.playlist.length;
    this.loadAndPlayTrack(this.currentTrackIndex, autoplay);
  }

  playNextTrack(autoplay = true) {
    if (!this.playlist || this.playlist.length === 0) return;
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
    this.loadAndPlayTrack(this.currentTrackIndex, autoplay);
  }

  toggleMusicPlayPause() {
    if (!this.musicPlayer) return;
    if (this.musicPlayer.paused) {
      this.musicPlayer.play().then(() => {
        this.updateMusicUI();
      }).catch(e => console.warn('Music play failed:', e));
    } else {
      this.musicPlayer.pause();
      this.updateMusicUI();
    }
  }

  loadAndPlayTrack(index, autoplay = true) {
    if (!this.playlist || !this.playlist[index] || !this.musicPlayer) return;
    this.currentTrackIndex = index;
    const track = this.playlist[index];
    localStorage.setItem('valepaska_selected_track', track.id);

    this.musicPlayer.pause();
    this.musicPlayer.loop = false;
    let sources = `<source src="${track.file}" type="audio/mp4">`;
    if (track.fallback && track.fallback !== track.file) {
      sources += `\n      <source src="${track.fallback}" type="audio/mpeg">`;
    }
    this.musicPlayer.innerHTML = sources;
    this.musicPlayer.load();

    const progressBar = document.getElementById('musicProgressBar');
    if (progressBar) progressBar.value = 0;
    const currentTimeEl = document.getElementById('musicCurrentTime');
    if (currentTimeEl) currentTimeEl.textContent = '0:00';
    const durationEl = document.getElementById('musicDuration');
    if (durationEl) durationEl.textContent = '0:00';

    if (autoplay) {
      this.musicPlayer.play().then(() => {
        this.updateMusicUI();
      }).catch(e => {
        console.warn('Autoplay blocked:', e);
        this.updateMusicUI();
      });
    } else {
      this.updateMusicUI();
    }

    this.renderMusicPlaylist();
  }

  updateMusicUI() {
    if (!this.musicPlayer || !this.playlist) return;
    const track = this.playlist[this.currentTrackIndex] || this.playlist[0];
    const isPlaying = !this.musicPlayer.paused;

    const headerTrackTitle = document.getElementById('headerTrackTitle');
    if (headerTrackTitle) headerTrackTitle.textContent = track.title;

    const modalTitle = document.getElementById('modalTrackTitle');
    if (modalTitle) modalTitle.textContent = track.title;

    const modalArtist = document.getElementById('modalTrackArtist');
    if (modalArtist) modalArtist.textContent = track.artist;

    const musicPill = document.getElementById('musicMenuBtn');
    if (musicPill) {
      musicPill.classList.toggle('playing', isPlaying);
    }

    const eq = document.getElementById('musicEqualizer');
    if (eq) {
      eq.classList.toggle('playing', isPlaying);
    }

    const playPauseBtn = document.getElementById('musicPlayPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.textContent = isPlaying ? '⏸' : '▶';
    }
  }

  renderMusicPlaylist() {
    const container = document.getElementById('musicPlaylistContainer');
    if (!container || !this.playlist) return;
    container.innerHTML = '';
    const isPlaying = this.musicPlayer && !this.musicPlayer.paused;

    this.playlist.forEach((track, idx) => {
      const isCurrent = (idx === this.currentTrackIndex);
      const row = document.createElement('div');
      row.className = `playlist-track-row ${isCurrent ? 'active' : ''}`;
      row.innerHTML = `
        <div class="track-row-left">
          <span class="track-play-icon">${isCurrent && isPlaying ? '🎶' : (isCurrent ? '⏸' : '▶')}</span>
          <div class="track-info">
            <span class="track-name">${track.title}</span>
            <span class="track-sub">${track.artist}</span>
          </div>
        </div>
        ${isCurrent ? `<span class="track-badge">${isPlaying ? 'Soi nyt' : 'Valittu'}</span>` : ''}
      `;

      row.addEventListener('click', () => {
        this.loadAndPlayTrack(idx, true);
      });

      container.appendChild(row);
    });
  }

  /* ==========================================================================
     API & WEBSOCKET NETWORKING
     ========================================================================== */
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
    // Fallback local code
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
      alert(`Yhteysvirhe: Ei voitu yhdistää osoitteeseen ${wsUrl}. Varmista että palvelin on käynnissä!`);
      return;
    }

    this.ws.onopen = () => {
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
      console.warn('WS disconnected. Reconnecting in 2.5s...');
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
      if (headerCode) {
        const text = headerCode.querySelector('.room-pill-text');
        if (text) text.textContent = msg.room_id;
        else headerCode.textContent = msg.room_id;
      }

      if (msg.chat_history && Array.isArray(msg.chat_history)) {
        const box = document.getElementById('chatMessagesBox');
        if (box && box.children.length === 0) {
          msg.chat_history.forEach(m => this.appendChatMessage(m));
        }
      }
    } else if (msg.type === 'state_update') {
      const oldState = this.state;
      this.state = msg.state;
      this.isHost = msg.is_host;

      // Always clear Arabia swap state on updates
      this.selectedHandSwapIndex = null;
      this.selectedTableSwapIndex = null;

      // Clear card selections if not my turn or if hand changed
      const me = this.state.players.find(p => p.id === this.playerId);
      const isMyTurn = (this.state.current_player_id === this.playerId && this.state.status === 'PLAYING');
      if (!isMyTurn || !me || !me.hand) {
        this.selectedCardIndices.clear();
        this.selectedTableUpIndices.clear();
      } else {
        // Prevent sticky card selection bug
        for (const idx of Array.from(this.selectedCardIndices)) {
          if (idx >= me.hand.length) {
            this.selectedCardIndices.delete(idx);
          }
        }
      }

      this.handleStateAudio(oldState, this.state);
      this.render();
    } else if (msg.type === 'chat_message') {
      this.handleChatMessage(msg.message);
    } else if (msg.type === 'error') {
      alert(msg.message);
    }
  }

  handleStateAudio(oldState, newState) {
    if (!oldState) return;

    if (newState.status === 'CHALLENGE_WINDOW' && oldState.status !== 'CHALLENGE_WINDOW') {
      window.sounds.playChallengeAlert();
    }

    if (newState.status === 'REVEAL_PAUSE' && oldState.status !== 'REVEAL_PAUSE') {
      if (newState.reveal_info) {
        if (newState.reveal_info.lied) {
          window.sounds.playLiarCaught();
        } else {
          window.sounds.playHonestFanfare();
        }
      }
    }

    if (newState.last_action_info && newState.last_action_info.action_id && newState.last_action_info.action_id !== this._lastActionId) {
      this._lastActionId = newState.last_action_info.action_id;
      if (newState.last_action_info.type === 'blind_card' || newState.last_action_info.type === 'deck_flip') {
        this.showCardRevealCelebration(newState.last_action_info);
      }
    }

    if (newState.dead_pile_count > oldState.dead_pile_count) {
      window.sounds.playKaatuu();
      if (!newState.last_action_info || (newState.last_action_info.type !== 'blind_card' && newState.last_action_info.type !== 'deck_flip')) {
        this.showKaatoCelebration(newState.last_action_info);
      }
    }

    if (newState.play_pile.length > oldState.play_pile.length) {
      window.sounds.playCardSnap();
    }

    if (newState.play_pile.length === 0 && oldState.play_pile.length > 0 && newState.status === 'PLAYING') {
      window.sounds.playPickup();
    }

    if (newState.status === 'GAME_OVER' && oldState.status !== 'GAME_OVER') {
      window.sounds.playToiletFlush();
    }
  }

  showKaatoCelebration(info) {
    const kaatoOverlay = document.getElementById('kaatoOverlay');
    if (!kaatoOverlay) return;

    const feltTable = document.querySelector('.felt-table-wrapper');
    const deadPile = document.getElementById('deadPileArea');

    // Trigger table screen shake
    if (feltTable) {
      feltTable.classList.remove('table-shake');
      void feltTable.offsetWidth; // trigger reflow
      feltTable.classList.add('table-shake');
      setTimeout(() => feltTable.classList.remove('table-shake'), 600);
    }

    // Trigger dead pile fire flash
    if (deadPile) {
      deadPile.classList.remove('kaato-impact');
      void deadPile.offsetWidth; // trigger reflow
      deadPile.classList.add('kaato-impact');
      setTimeout(() => deadPile.classList.remove('kaato-impact'), 1400);
    }

    const titleEl = document.getElementById('kaatoTitle');
    const detailsEl = document.getElementById('kaatoDetails');
    const subDetailsEl = document.getElementById('kaatoSubDetails');
    const iconEl = document.getElementById('kaatoIcon');

    let titleText = 'KAATUU! 🔥';
    let detailsText = 'Pöytä kaadettiin sivuun!';
    let subText = 'Uusi vuoro aloittajalle puhtaalta pöydältä';
    let icon = '🔥';

    if (info && info.type === 'kaato') {
      const pName = info.player_name || 'Pelaaja';
      const rank = info.declared_rank;
      const count = info.cards_count || 1;
      const cleared = info.cleared_count ? ` (${info.cleared_count} korttia)` : '';

      if (count >= 4) {
        titleText = 'NELOSET KAATAA! 💥';
        icon = '💥';
        detailsText = `${pName} löi 4x samaa korttia ja kaatoi pöydän${cleared}!`;
      } else if (rank === '10') {
        titleText = 'KYMPPI KAATAA! 🔥';
        icon = '🔟';
        detailsText = `${pName} kaatoi pöydän kympillä${cleared}!`;
      } else if (rank === 'A') {
        titleText = 'ÄSSÄ KAATAA! ⚡';
        icon = '🅰️';
        detailsText = `${pName} kaatoi pöydän ässällä${cleared}!`;
      } else {
        titleText = 'KAATUU! 🔥';
        icon = '🔥';
        detailsText = `${pName} kaatoi pöydän${cleared}!`;
      }
      subText = `Vuoro jatkuu — ${pName} aloittaa puhtaalta pöydältä!`;
    }

    if (titleEl) titleEl.textContent = titleText;
    if (detailsEl) detailsEl.textContent = detailsText;
    if (subDetailsEl) subDetailsEl.textContent = subText;
    if (iconEl) iconEl.textContent = icon;

    kaatoOverlay.style.display = 'flex';
    kaatoOverlay.classList.remove('fade-out');
    kaatoOverlay.classList.add('animate-in');

    if (this._kaatoTimeout) clearTimeout(this._kaatoTimeout);
    this._kaatoTimeout = setTimeout(() => {
      kaatoOverlay.classList.add('fade-out');
      setTimeout(() => {
        kaatoOverlay.style.display = 'none';
        kaatoOverlay.classList.remove('animate-in', 'fade-out');
      }, 400);
    }, 2000);
  }

  showCardRevealCelebration(info) {
    const blindOverlay = document.getElementById('blindCardOverlay');
    if (!blindOverlay) return;

    const feltTable = document.querySelector('.felt-table-wrapper');
    const deadPile = document.getElementById('deadPileArea');

    const previewEl = document.getElementById('blindCardPreview');
    const titleEl = document.getElementById('blindTitle');
    const detailsEl = document.getElementById('blindDetails');
    const subDetailsEl = document.getElementById('blindSubDetails');
    const iconEl = document.getElementById('blindIcon');

    blindOverlay.classList.remove('legal', 'illegal');
    if (info.legal) {
      blindOverlay.classList.add('legal');
    } else {
      blindOverlay.classList.add('illegal');
    }

    // Play sounds & effects
    if (info.legal) {
      if (info.cleared) {
        window.sounds.playKaatuu();
        if (deadPile) {
          deadPile.classList.remove('kaato-impact');
          void deadPile.offsetWidth;
          deadPile.classList.add('kaato-impact');
          setTimeout(() => deadPile.classList.remove('kaato-impact'), 1400);
        }
      } else {
        window.sounds.playHonestFanfare();
      }
    } else {
      window.sounds.playLiarCaught();
    }

    if (feltTable) {
      feltTable.classList.remove('table-shake');
      void feltTable.offsetWidth;
      feltTable.classList.add('table-shake');
      setTimeout(() => feltTable.classList.remove('table-shake'), 600);
    }

    // Render the revealed card preview
    if (previewEl && info.card) {
      previewEl.innerHTML = '';
      const cardEl = createCardElement(info.card);
      previewEl.appendChild(cardEl);
    }

    const pName = info.player_name || 'Pelaaja';
    const cardRank = (info.card && info.card.rank) || '';
    const suitSym = (info.card && SUIT_SYMBOLS[info.card.suit]) || '';
    const isDeck = info.type === 'deck_flip';
    const sourceText = isDeck ? 'pakasta' : 'sokkona pöydästä';

    let titleText = isDeck ? 'PAKASTA KÄÄNNETTY! 🂠' : 'SOKKOKORTTI! 🃏';
    let detailsText = `${pName} käänsi ${sourceText}: ${cardRank}${suitSym}`;
    let subText = '';
    let icon = isDeck ? '🂠' : '🃏';

    if (info.legal) {
      if (info.cleared) {
        titleText = isDeck ? 'PAKASTA KAATUI! 🔥' : 'SOKKOKAATO! 🔥';
        icon = '🔥';
        subText = `Kortti kaatoi pöydän! ${pName} aloittaa puhtaalta pöydältä.`;
      } else if (info.continues) {
        titleText = isDeck ? 'PAKASTA KAKKONEN! ⚡' : 'SOKKOKAKKONEN! ⚡';
        icon = '⚡';
        subText = `Kakkosella saa jatkaa — ${pName} lyö heti uuden kortin!`;
      } else {
        titleText = isDeck ? 'PAKASTA SOPI! ✨' : 'SOKKOKORTTI SOPI! ✨';
        icon = '✨';
        subText = `Kortti sopi pöytään! Vuoro siirtyy.`;
      }
    } else {
      titleText = 'EI SOPIVA! 💥';
      icon = '💥';
      const count = info.picked_up || 1;
      subText = `Ei sopinut pöytään! ${pName} joutuu nostamaan ${count} korttia.`;
    }

    if (titleEl) titleEl.textContent = titleText;
    if (detailsEl) detailsEl.textContent = detailsText;
    if (subDetailsEl) subDetailsEl.textContent = subText;
    if (iconEl) iconEl.textContent = icon;

    blindOverlay.style.display = 'flex';
    blindOverlay.classList.remove('fade-out');
    blindOverlay.classList.add('animate-in');

    if (this._blindTimeout) clearTimeout(this._blindTimeout);
    this._blindTimeout = setTimeout(() => {
      blindOverlay.classList.add('fade-out');
      setTimeout(() => {
        blindOverlay.style.display = 'none';
        blindOverlay.classList.remove('animate-in', 'fade-out');
      }, 400);
    }, 2500);
  }

  showBlindCardCelebration(info) {
    this.showCardRevealCelebration(info);
  }

  /* ==========================================================================
     RENDER ENGINE
     ========================================================================== */
  render() {
    if (!this.state) return;

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
        const text = headerCode.querySelector('.room-pill-text');
        if (text) text.textContent = this.state.room_id;
        else headerCode.textContent = this.state.room_id;
      }
      if (leaveBtn) leaveBtn.style.display = 'flex';
    } else {
      if (joinSec) joinSec.style.display = 'block';
      if (waitSec) waitSec.style.display = 'none';
      if (headerCode) headerCode.style.display = 'none';
      if (leaveBtn) leaveBtn.style.display = 'none';
    }

    const codeDisplay = document.getElementById('roomCodeDisplay');
    if (codeDisplay) codeDisplay.textContent = this.state.room_id;

    // Host controls
    const startBtn = document.getElementById('startGameBtn');
    const addBotBtn = document.getElementById('addBotBtn');
    if (startBtn) startBtn.style.display = this.isHost ? 'flex' : 'none';
    if (addBotBtn) addBotBtn.style.display = this.isHost ? 'flex' : 'none';

    // Disable rules for non-host
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

    // Players in lobby
    const container = document.getElementById('lobbyPlayersGrid');
    if (container) {
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
          ${this.isHost && p.is_bot ? `<button class="remove-bot-btn" data-bot-id="${p.id}" title="Poista botti">✖</button>` : ''}
        `;
        container.appendChild(chip);
      });

      container.querySelectorAll('.remove-bot-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const botId = btn.getAttribute('data-bot-id');
          this.sendWS({ type: 'remove_bot', bot_id: botId });
        });
      });
    }
  }

  renderGameTable() {
    const me = this.state.players.find(p => p.id === this.playerId);
    const opponents = this.state.players.filter(p => p.id !== this.playerId);
    const isMyTurn = (this.state.current_player_id === this.playerId && this.state.status === 'PLAYING');

    // 1. Render Opponents
    const oppArea = document.getElementById('opponentsArea');
    if (oppArea) {
      oppArea.innerHTML = '';
      opponents.forEach(p => {
        const seat = document.createElement('div');
        seat.className = 'opponent-seat';
        if (this.state.current_player_id === p.id && this.state.status === 'PLAYING') {
          seat.classList.add('active');
        }

        let oppTableHtml = '';
        if (this.state.rules.mode === 'arabia') {
          oppTableHtml = '<div class="opp-table-cards-section">';
          oppTableHtml += `<div class="opp-table-cards-label">Pöytä</div>`;
          oppTableHtml += '<div class="opp-table-cards">';
          for (let s = 0; s < 3; s++) {
            const upCard = (p.table_up && p.table_up[s]) || null;
            const hasDown = (p.table_down_count && s < p.table_down_count);
            if (upCard || hasDown) {
              oppTableHtml += `<div class="opp-table-slot">`;
              if (hasDown && upCard) {
                oppTableHtml += `<div class="opp-down-layer"></div>`;
              }
              if (upCard) {
                const isRed = isRedSuit(upCard.suit);
                const suitSym = SUIT_SYMBOLS[upCard.suit] || upCard.suit;
                oppTableHtml += `
                  <div class="opp-mini-card ${isRed ? 'suit-red' : 'suit-black'}" title="${upCard.rank} ${SUIT_NAMES_FI[upCard.suit] || ''}">
                    <span class="opp-mini-rank">${upCard.rank}</span>
                    <span class="opp-mini-suit">${suitSym}</span>
                  </div>
                `;
              } else if (hasDown) {
                oppTableHtml += `
                  <div class="opp-mini-card opp-mini-card-back" title="Kääntämätön pöytäkortti">
                    🂠
                  </div>
                `;
              }
              oppTableHtml += `</div>`;
            }
          }
          oppTableHtml += '</div></div>';
        }

        seat.innerHTML = `
          <div class="table-bubble-anchor" id="bubbleAnchor-${p.id}"></div>
          <div class="opponent-seat-inner">
            <div class="opponent-identity">
              <div class="opponent-avatar-box">
                ${p.avatar}
                <div class="opponent-cards-badge">🂠 ${p.card_count}</div>
              </div>
              <div class="opponent-name">${p.name}</div>
              <div class="opponent-status-tag">
                ${p.is_out ? `🏆 #${p.finish_rank}` : (this.state.current_player_id === p.id ? 'VUOROSSA' : '')}
              </div>
            </div>
            ${oppTableHtml}
          </div>
        `;
        oppArea.appendChild(seat);
      });
    }

    // 2. Render Deck Counter
    const deckCountEl = document.getElementById('deckCountBadge');
    if (deckCountEl) {
      deckCountEl.textContent = `${this.state.draw_deck_count} pakka`;
    }

    // 3. Render Cleared Counter
    const deadCountEl = document.getElementById('deadCountBadge');
    if (deadCountEl) {
      deadCountEl.textContent = `${this.state.dead_pile_count} kaadettu`;
    }

    // 4. Render Discard / Play Pile
    const pileArea = document.getElementById('playPileArea');
    if (pileArea) {
      pileArea.innerHTML = '';
      const hasSelection = (this.selectedCardIndices.size > 0 || this.selectedTableUpIndices.size > 0);
      if (isMyTurn && hasSelection) {
        pileArea.classList.add('can-play-here');
        pileArea.title = 'Pelaa valitut kortit pöytään klikkaamalla tai vetämällä!';
      } else {
        pileArea.classList.remove('can-play-here');
        pileArea.title = '';
      }

      if (this.state.play_pile.length === 0) {
        pileArea.innerHTML = `
          <div class="pile-placeholder">
            <span class="pile-empty-icon">🂠</span>
            <span class="pile-empty-text">Pöytä on tyhjä</span>
          </div>
        `;
      } else {
        if (this.state.top_declared_rank) {
          const topTag = document.createElement('div');
          topTag.className = 'top-declared-tag';
          topTag.textContent = `Pöydässä: ${this.state.top_declared_rank}`;
          pileArea.appendChild(topTag);
        }

        const sizeTag = document.createElement('div');
        sizeTag.className = 'pile-size-tag';
        sizeTag.textContent = `${this.state.play_pile.length} kpl`;
        pileArea.appendChild(sizeTag);

        const visibleCount = Math.min(this.state.play_pile.length, 5);
        const startIdx = this.state.play_pile.length - visibleCount;

        for (let i = startIdx; i < this.state.play_pile.length; i++) {
          const entry = this.state.play_pile[i];
          const cardWrapper = document.createElement('div');
          cardWrapper.className = 'pile-card-wrapper';

          const angle = ((i * 37) % 24) - 12;
          const offsetX = ((i * 19) % 14) - 7;
          const offsetY = ((i * 23) % 14) - 7;
          cardWrapper.style.transform = `translate(${offsetX}px, ${offsetY}px) rotate(${angle}deg)`;

          const cardEl = createCardElement(entry.card, {
            faceDown: !entry.revealed
          });
          cardWrapper.appendChild(cardEl);
          pileArea.appendChild(cardWrapper);
        }
      }
    }

    // 5. Render Challenge Banner
    const challengeBanner = document.getElementById('challengeBanner');
    if (this.state.challenge && this.state.status === 'CHALLENGE_WINDOW') {
      challengeBanner.style.display = 'flex';
      const c = this.state.challenge;
      document.getElementById('challengeClaimDisplay').textContent = `${c.cards_count}x ${c.declared_rank}`;
      document.getElementById('challengePlayerName').textContent = `${c.player_name} ${this.t('claimedCards')}`;

      const canChallenge = c.can_challenge && !c.has_passed;
      document.getElementById('challengeBtn').style.display = canChallenge ? 'block' : 'none';
      document.getElementById('passBtn').style.display = canChallenge ? 'block' : 'none';

      this.updateChallengeTimer(c.ends_at);
    } else {
      challengeBanner.style.display = 'none';
      if (this.challengeInterval) {
        clearInterval(this.challengeInterval);
        this.challengeInterval = null;
      }
    }

    // 6. Render Reveal Overlay
    const revealOverlay = document.getElementById('revealOverlay');
    if (this.state.status === 'REVEAL_PAUSE' && this.state.reveal_info) {
      revealOverlay.style.display = 'flex';
      const r = this.state.reveal_info;
      const verdictEl = document.getElementById('revealVerdict');
      verdictEl.className = `reveal-verdict-title ${r.lied ? 'lied' : 'honest'}`;
      verdictEl.textContent = r.lied ? this.t('liarCaught') : this.t('honestPlayer');

      const detailsEl = document.getElementById('revealDetails');
      if (r.lied) {
        detailsEl.textContent = `${r.target_name} jäi kiinni valheesta ja nostaa pöydän!`;
      } else {
        detailsEl.textContent = `${r.challenger_name} haastoi väärin ja joutuu nostamaan pöydän!`;
      }

      const cardsRow = document.getElementById('revealedCardsRow');
      cardsRow.innerHTML = '';
      r.actual_cards.forEach(c => {
        const el = createCardElement(c);
        cardsRow.appendChild(el);
      });
    } else {
      revealOverlay.style.display = 'none';
    }

    // 7. Render Player Table Cards (Arabia)
    const tableCardsContainer = document.getElementById('playerTableCardsContainer');
    const tableCardSlots = document.getElementById('tableCardSlots');
    const swapHintTag = document.getElementById('swapHintTag');

    if (this.state.rules.mode === 'arabia' && me) {
      if (tableCardsContainer) tableCardsContainer.style.display = 'flex';
      if (tableCardSlots) tableCardSlots.innerHTML = '';

      const canSwap = !this.state.first_kaato_done && (me.hand && me.hand.length > 0) && (me.table_up && me.table_up.length > 0);
      if (swapHintTag) {
        swapHintTag.style.display = !this.state.first_kaato_done ? 'inline-block' : 'none';
        if (canSwap) {
          swapHintTag.textContent = '💡 Vaihto sallittu & kuvat (J, Q, K, A) lukittu 1. kaatoon asti';
        } else {
          swapHintTag.textContent = '🔒 Kuvat (J, Q, K, A) lukittu 1. kaatoon asti';
        }
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

          if (isPhaseBlind && !upCard && isMyTurn) {
            slotEl.classList.add('blind-active');
            slotEl.title = 'Käännä sokkokortti pöytään!';
            slotEl.addEventListener('click', (e) => {
              e.stopPropagation();
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
          if (isPhaseTableUp && isMyTurn) {
            cardEl.setAttribute('draggable', 'true');
            cardEl.addEventListener('dragstart', (e) => {
              if (!this.selectedTableUpIndices.has(s)) {
                if (this.selectedTableUpIndices.size > 0) {
                  const firstIdx = Array.from(this.selectedTableUpIndices)[0];
                  if (me.table_up[firstIdx].rank !== upCard.rank) {
                    this.selectedTableUpIndices.clear();
                  }
                }
                this.selectedTableUpIndices.add(s);
              }
              e.dataTransfer.setData('text/plain', `table_up:${s}`);
              e.dataTransfer.effectAllowed = 'move';
              cardEl.classList.add('is-dragging');
              const pile = document.getElementById('playPileArea');
              if (pile) pile.classList.add('can-play-here');
            });
            cardEl.addEventListener('dragend', () => {
              cardEl.classList.remove('is-dragging');
              const pile = document.getElementById('playPileArea');
              if (pile) pile.classList.remove('drag-over');
            });
          }
          upWrap.appendChild(cardEl);
          slotEl.appendChild(upWrap);

          upWrap.addEventListener('click', (e) => {
            e.stopPropagation();

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

    // 8. Render Player Hand Cards
    const handContainer = document.getElementById('handCardsContainer');
    if (handContainer) {
      handContainer.innerHTML = '';
      if (me && me.hand) {
        me.hand.forEach((card, idx) => {
          const isSelected = this.selectedCardIndices.has(idx) || (this.selectedHandSwapIndex === idx);
          const cardEl = createCardElement(card, {
            selected: isSelected
          });

          cardEl.style.zIndex = idx + 10;
          cardEl.setAttribute('data-hand-index', idx);

          if (isMyTurn) {
            cardEl.setAttribute('draggable', 'true');

            cardEl.addEventListener('dragstart', (e) => {
              if (!this.selectedCardIndices.has(idx)) {
                if (this.state.rules.mode === 'paskahousu' || this.state.rules.mode === 'arabia') {
                  if (this.selectedCardIndices.size > 0) {
                    const firstIdx = Array.from(this.selectedCardIndices)[0];
                    if (me.hand[firstIdx].rank !== card.rank) {
                      this.selectedCardIndices.clear();
                    }
                  }
                }
                this.selectedCardIndices.add(idx);
              }
              e.dataTransfer.setData('text/plain', `hand:${idx}`);
              e.dataTransfer.effectAllowed = 'move';
              cardEl.classList.add('is-dragging');
              const pile = document.getElementById('playPileArea');
              if (pile) pile.classList.add('can-play-here');
            });

            cardEl.addEventListener('dragend', () => {
              cardEl.classList.remove('is-dragging');
              const pile = document.getElementById('playPileArea');
              if (pile) pile.classList.remove('drag-over');
            });

            // Touch swipe-up to play
            let touchStartY = null;
            let touchStartX = null;
            cardEl.addEventListener('touchstart', (e) => {
              if (!isMyTurn) return;
              const touch = e.touches[0];
              touchStartY = touch.clientY;
              touchStartX = touch.clientX;
            }, { passive: true });

            cardEl.addEventListener('touchend', (e) => {
              if (!isMyTurn || touchStartY === null) return;
              const touch = e.changedTouches[0];
              const diffY = touchStartY - touch.clientY;
              const diffX = Math.abs(touchStartX - touch.clientX);
              if (diffY > 60 && diffY > diffX) {
                if (!this.selectedCardIndices.has(idx)) {
                  if (this.state.rules.mode === 'paskahousu' || this.state.rules.mode === 'arabia') {
                    if (this.selectedCardIndices.size > 0) {
                      const firstIdx = Array.from(this.selectedCardIndices)[0];
                      if (me.hand[firstIdx].rank !== card.rank) {
                        this.selectedCardIndices.clear();
                      }
                    }
                  }
                  this.selectedCardIndices.add(idx);
                }
                window.sounds.playPop();
                this.handlePlayClick();
              }
              touchStartY = null;
              touchStartX = null;
            }, { passive: true });
          }

          cardEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const canSwap = this.state.rules.mode === 'arabia' && me && !this.state.first_kaato_done && (me.hand && me.hand.length > 0) && (me.table_up && me.table_up.length > 0);
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
    }

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

    if (playBtn) {
      playBtn.disabled = !isMyTurn || (!hasHandSelected && !hasTableUpSelected);
      const selectedCount = hasTableUpSelected ? this.selectedTableUpIndices.size : this.selectedCardIndices.size;
      const isMobile = window.innerWidth <= 480;
      const baseText = isMobile ? 'Pelaa' : this.t('playCards');
      const label = selectedCount > 0 ? `${baseText} (${selectedCount})` : (isBlindPhase ? (isMobile ? 'Sokkokortti 👆' : 'Käännä sokkokortti 👆') : baseText);
      if (playBtnText) {
        playBtnText.textContent = label;
      } else {
        playBtn.textContent = label;
      }
    }

    if (flipBtn) {
      flipBtn.disabled = !isMyTurn || this.state.draw_deck_count === 0 || hasTableUpSelected;
    }

    if (pickupBtn) {
      pickupBtn.disabled = !isMyTurn || this.state.play_pile.length === 0;
    }

    // Turn indicator
    const turnLabel = document.getElementById('currentTurnLabel');
    if (turnLabel) {
      if (isMyTurn) {
        turnLabel.textContent = this.t('turnYou');
        turnLabel.style.color = 'var(--gold)';
        turnLabel.style.borderColor = 'var(--border-gold)';
      } else {
        turnLabel.textContent = `${this.t('turnOther')}${this.state.current_player_name || ''}`;
        turnLabel.style.color = 'var(--text-muted)';
        turnLabel.style.borderColor = 'var(--border-subtle)';
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
      const declaredRank = selectedCards[0].rank;

      // In Arabia: Court cards locked until first pile clear
      if (this.state.rules.mode === 'arabia' && !this.state.first_kaato_done && ['J', 'Q', 'K', 'A'].includes(declaredRank)) {
        this.showTableBubble({
          player_id: this.playerId,
          name: this.playerName,
          avatar: '🔒',
          text: 'Kuvakortteja (J, Q, K, A) saa pelata vasta 1. kaadon jälkeen!'
        });
        window.sounds.playPop();
        return;
      }

      this.executePlayCards(declaredRank, 'hand');
    } else {
      this.openBluffModal(selectedCards);
    }
  }

  openBluffModal(selectedCards) {
    const modal = document.getElementById('bluffModal');
    if (!modal) return;
    modal.classList.add('active');

    const defaultRank = selectedCards[0].rank;
    this.bluffDeclaredRank = defaultRank;

    document.querySelectorAll('.rank-choice-btn').forEach(btn => {
      const r = btn.getAttribute('data-rank');
      btn.classList.toggle('selected', r === defaultRank);
    });

    const qtyEl = document.getElementById('bluffModalQty');
    if (qtyEl) qtyEl.textContent = `${selectedCards.length}x`;
  }

  executePlayCards(declaredRank, source = 'hand') {
    let indices;
    if (source === 'table_up') {
      indices = Array.from(this.selectedTableUpIndices);
    } else {
      indices = Array.from(this.selectedCardIndices);
    }
    this.selectedTableUpIndices.clear();
    this.selectedCardIndices.clear();
    this.selectedHandSwapIndex = null;
    this.selectedTableSwapIndex = null;

    this.sendWS({
      type: 'play_cards',
      card_indices: indices,
      declared_rank: declaredRank,
      source: source
    });
  }

  renderGameOver() {
    const list = document.getElementById('gameWinnersList');
    if (list) {
      list.innerHTML = '';
      this.state.winners.forEach((wid, idx) => {
        const p = this.state.players.find(pl => pl.id === wid);
        if (p) {
          const row = document.createElement('div');
          row.className = 'winner-row';
          row.innerHTML = `
            <span class="winner-rank">#${idx + 1} 🏆</span>
            <span>${p.avatar} ${p.name}</span>
            <span>${p.stats?.bluffs_successful || 0} bluffia onnistui</span>
          `;
          list.appendChild(row);
        }
      });
    }

    const loser = this.state.players.find(p => p.id === this.state.paskahousu_id);
    const loserNameEl = document.getElementById('paskahousuLoserName');
    if (loser && loserNameEl) {
      loserNameEl.textContent = `${loser.avatar} ${loser.name}`;
    }

    const playAgainBtn = document.getElementById('playAgainBtn');
    if (playAgainBtn) {
      playAgainBtn.style.display = this.isHost ? 'flex' : 'none';
    }
  }

  handleChatMessage(msg) {
    this.appendChatMessage(msg);
    this.showTableBubble(msg);

    const chatDrawer = document.getElementById('chatDrawer');
    const unreadDot = document.getElementById('chatUnreadDot');
    if (chatDrawer && !chatDrawer.classList.contains('open') && unreadDot) {
      unreadDot.style.display = 'block';
    }
  }

  showTableBubble(msg) {
    const isMe = (msg.player_id === this.playerId || (msg.name === this.playerName && msg.avatar === this.playerAvatar));
    let anchor = isMe 
      ? document.getElementById('myBubbleAnchor') 
      : (msg.player_id ? document.getElementById(`bubbleAnchor-${msg.player_id}`) : null);

    if (!anchor && !isMe) {
      const seats = document.querySelectorAll('.opponent-seat');
      for (const s of seats) {
        if (s.querySelector('.opponent-name')?.textContent === msg.name) {
          anchor = s.querySelector('.table-bubble-anchor');
          break;
        }
      }
    }

    if (!anchor) return;

    const emojiRegex = /^(\p{Extended_Pictographic}|\u200d|\ufe0f|\s)+$/u;
    const isEmoteOnly = emojiRegex.test(msg.text.trim()) && msg.text.trim().length <= 16;

    anchor.innerHTML = '';

    const bubble = document.createElement('div');
    bubble.className = `floating-table-bubble ${isEmoteOnly ? 'emote-only' : ''} ${isMe ? 'my-bubble' : ''}`;

    if (isEmoteOnly) {
      bubble.innerHTML = `<span class="table-bubble-emote">${msg.text}</span>`;
    } else {
      const escDiv = document.createElement('div');
      escDiv.textContent = msg.text;
      bubble.innerHTML = `
        <span class="table-bubble-sender">${msg.avatar} ${msg.name}</span>
        <span class="table-bubble-text">${escDiv.innerHTML}</span>
      `;
    }

    anchor.appendChild(bubble);
    window.sounds.playPop();

    setTimeout(() => {
      bubble.classList.add('fading-out');
      setTimeout(() => {
        if (bubble.parentNode === anchor) {
          anchor.removeChild(bubble);
        }
      }, 400);
    }, 4200);
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
