# 🃏 Paskahousu & Valepaskahousu – Moninpeli (Multiplayer)

A modern, responsive, zero-dependency multiplayer web game for the iconic Finnish card games **Paskahousu** (Open) and **Valepaskahousu** (Bluff / Cheat).

Play in real-time with your friends across mobile phones, tablets, and computers, or practice with smart AI bots!

---

## 🚀 Pika-aloitus / Quick Start

Peli ei vaadi mitään ulkoisia kirjastoja tai asennuksia – pelkkä **Python 3** (3.8+) riittää!

### 1. Käynnistä palvelin (Start the server)
```bash
python3 server.py
```

Palvelin tulostaa terminaaliin liittymisosoitteet:
```
============================================================
 🃏 PASKAHOUSU & VALEPASKAHOUSU MULTIPLAYER SERVER 🃏
============================================================
 * Local:   http://localhost:8000
 * Network: http://192.168.1.45:8000  <-- Jaa tämä kavereille samassa Wi-Fi-verkossa!
============================================================
```

### 2. Avaa selaimessa (Open in browser)
* **Sinä:** Avaa `http://localhost:8000`
* **Kaverit samassa Wi-Fi-verkossa:** Avaa kännykällä tai koneella osoite `http://<sinun-ip>:8000` (esim. `http://192.168.1.45:8000`).
* **Kaverit internetin yli:** Voit jakaa pelin ilmaiseksi esim. [ngrok](https://ngrok.com/) tai [Cloudflare Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) kautta:
  ```bash
  ngrok http 8000
  ```
  ja jaat ngrok-osoitteen kavereillesi!

---

## 🎮 Ominaisuudet / Features

* 🃏 **Kaksi pelimuotoa:** Valepaskahousu (bluffaus / nurinpäin) ja perinteinen avoin Paskahousu.
* 👥 **Moninpeli huonejärjestelmällä:** Luo huone, jaa 4-kirjaiminen koodi tai suora kutsulinkki.
* 🤖 **Älykkäät AI-botit:** Lisää huoneeseen botteja (Pekka, Jari, Sirpa, Matti...) testausta varten tai täydentämään vajaata peliporukkaa.
* ⚙️ **Mukautettavat kotisäännöt:**
  * Seiskan sääntö (Kuvakortit 7+, 9+ tai vapaa)
  * Kakkosen sääntö (Vain toinen 2 päälle tai kakkonen nollaa pinon)
  * Kymppi tyhjään pöytään (Seuraava joutuu nostamaan tai kielletty)
  * Haastoaika (sekunteina)
* 🔊 **Web Audio API -äänet:** Autenttiset korttiäänet, haastohälytys, kiinnijäämissummeri, voittotörähdys ja legendaarinen Paskahousun vesivessan huuhtelu!
* 💬 **Reaaliaikainen chat ja pika-reaktiot:** 💩, 🤥, 😂, 🔥, 👀.
* 🌐 **Kaksikielinen (FI / EN):** Vaihda suomen ja englannin välillä yläpalkin napista.
* 📱 **Täysin responsiivinen:** Toimii puhelimilla (pysty ja vaaka), tableteilla ja tietokoneilla.

---

## 📜 Pelin Säännöt / Game Rules

### Korttien arvojärjestys
Paskahousussa normaali arvojärjestys pienimmästä suurimpaan:
$$\text{3 – 4 – 5 – 6 – 7 – 8 – 9 – 10 – J – Q – K – A} \quad (\text{2 on erikoiskortti})$$

* **Kakkonen (2):** Voi lyödä minkä tahansa kortin päälle (paitsi kympin ja ässän). Kakkosen päälle saa lyödä vain toisen kakkosen (tai kotisäännöistä riippuen se nollaa pinon).
* **Kymppi (10):** Kaatokortti numeroille (3–9). Kaataa pakan sivuun!
* **Ässä (A):** Kaatokortti kuvakorteille (J, Q, K) ja ässälle. Kaataa pakan sivuun!
* **Neljä samaa (Neloset):** Neljä samannumeroista korttia peräkkäin kaataa aina pakan automaattisesti!
* **Seiskan sääntö:** Kuvakortteja (J, Q, K) ei saa lyödä seiskaa pienempien korttien päälle.

---

### 1. Valepaskahousu (Valepaska)
Valepaskassa kortit lyödään pöytään **kuvapuoli alaspäin**.

1. Vuorossa oleva valitsee kädestään 1–4 korttia ja ilmoittaa ääneen, mitä kortteja väittää lyövänsä (esim. *"Kaksi kasia"* tai *"Yksi rouva"*).
2. Väitteen täytyy olla sääntöjen mukainen, mutta **kortit saavat olla täyttä valetta**!
3. Muille pelaajille avautuu **haastoikkuna**:
   * **Haasto! (⚡):** Kuka tahansa voi haastaa väitteen.
     * Jos pelaaja **valehteli**: Valehtelija joutuu nostamaan **koko pöytäpakan** käteensä! Vuoro siirtyy valehtelijasta seuraavalle.
     * Jos pelaaja **puhui totta**: Haastaja joutuu nostamaan **koko pöytäpakan** rangaistukseksi! Rehellinen pelaaja saa jatkaa vuoroaan ja lyödä tyhjään pöytään.
   * **Uskon (👍):** Jos kukaan ei haasta, kortit jäävät piiloon ja vuoro jatkuu. Jos ilmoitettu siirto oli kaatokortti (kymppi, ässä tai neloset), pakka kaatuu sivuun ja pelaaja saa uuden vuoron!
4. Vuoron päätteeksi käsi täydennetään nostopakasta aina 5 korttiin asti.

---

### 2. Paskahousu (Avopeli)
Perinteisessä avopaskahousussa kaikki kortit pelataan avoimesti kuvapuoli ylöspäin.
* Seuraavan pelaajan on lyötävä vähintään yhtä suuri kortti kuin edellinen.
* Jos sopivaa korttia ei ole tai sitä ei halua pelata:
  * **Käännä pakasta:** Pelaaja kääntää nostopakan päällimmäisen kortin. Jos se sopii, se pelataan automaattisesti. Jos ei sovi, pelaaja joutuu nostamaan koko pinon ja käännetyn kortin käteensä.
  * **Nosta pöytä:** Pelaaja voi vapaaehtoisesti nostaa pakan käteensä.
* Pakka kaatuu kympillä, ässällä tai neljällä samalla, jolloin kaataja saa lyödä uudelleen tyhjään pöytään.

---

### 👑 Voittaminen ja Paskahousun kruunaus
* Pelaaja, joka pääsee ensimmäisenä eroon kaikista korteistaan (kun nostopakka on loppunut), on **Voittaja (#1)**!
* Peli jatkuu muiden kesken, kunnes vain **yhdellä pelaajalla** on kortteja kädessä.
* Viimeinen kortteja pitelevä pelaaja häviää ja on virallinen **PASKAHOUSU**! 💩👖

---

## 🏫 Koulun / yliopiston `public_html` -kansiossa hostaus

Voit hostata peliä koulusi tai yliopistosi kotisivutilassa (`~/public_html/`) kahdella erinomaisella tavalla:

### Tapa 1: Staattinen frontend `public_html` + ilmainen pilvibackend (Suositeltavin tapa)
Koulun `public_html` -hakemistoa pyörittävä palvelin (usein Apache) tarjoilee staattiset tiedostot suoraan HTTPS:n yli. Koska moninpeli tarvitsee aktiivisen WebSocket-palvelimen, helpoin ja vakain tapa on:

1. Kopioi `static/`-kansion sisältö koulun palvelimelle, esim. `~/public_html/valepaska/`:
   ```bash
   scp -r static/* kayttaja@koulupalvelin.fi:~/public_html/valepaska/
   ```
2. Laita `server.py` pyörimään ilmaiseksi pilveen (esim. ilmainen **Render.com**, **Railway** tai omalla koneellasi `ngrok`):
   * Renderissä: Uusi *Web Service* -> yhdistä repo tai kansio -> Start command: `python3 server.py`. Saat osoitteen, esim. `https://valepaskahousu.onrender.com`.
3. Nyt voit avata pelin koulusi osoitteesta suoraan parametrilla:
   `https://users.koulupalvelin.fi/~kayttaja/valepaska/?server=valepaskahousu.onrender.com`
   Tai voit asettaa palvelinosoitteen suoraan käyttöliittymän ⚙️-napista!

### Tapa 2: Python-palvelin koulun shell-koneella + `.htaccess` -proxy
Jos koulussasi on SSH-pääsy shell-palvelimeen (kuten monissa suomalaisissa yliopistoissa ja korkeakouluissa):
1. Kirjaudu SSH:lla koulun palvelimelle ja käynnistä taustaprosessi:
   ```bash
   screen -S paskahousu python3 server.py --port 8989
   # Irrottaudu screenistä painamalla: Ctrl+A, sitten D
   ```
2. Laita `~/public_html/valepaska/.htaccess` -tiedostoon:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTP:Upgrade} websocket [NC]
   RewriteCond %{HTTP:Connection} upgrade [NC]
   RewriteRule ^ws(.*)$ ws://localhost:8989/ws$1 [P,L]
   RewriteRule ^api/(.*)$ http://localhost:8989/api/$1 [P,L]
   ```
   Nyt koulun Apache-palvelin ohjaa WebSocket- ja API-pyynnöt suoraan taustalla pyörivälle Python-palvelimellesi!

---

## 🛠 Tiedostorakenne / Architecture

```
Pelihuone/
├── .github/workflows/ci.yml # GitHub Actions automaattinen CI/testausputki
├── server.py              # Pure Python 3 async HTTP + RFC 6455 WebSocket palvelin
├── game_engine.py         # Paskahousun, Valepaskan ja Arabian sääntömoottori
├── room_manager.py        # Moninpelihuoneet, pelaajasessiot, ajastimet ja viestintä
├── bot_ai.py              # Ihmismäiset AI-botit ja simulaatiot
├── tests/                 # Kattava automaattitestipatteristo (unittest)
│   ├── test_game_engine.py # Sääntöjen, korttien ja kaatojen yksikkötestit
│   ├── test_bot_ai.py     # Botin päätöksenteon ja simulaatiopelien testit
│   └── test_server.py     # Huonehallinnan ja staattisten tiedostojen eheystestit
├── static/
│   ├── index.html         # Pelin käyttöliittymä (Lobby, pelipöytä, haastoruudut)
│   ├── style.css          # Kasinohuopateema, korttianimaatiot, responsiivisuus
│   ├── app.js             # Client-logiikka, WebSockets, korttien valinta
│   ├── cards.js           # SVG-vektori pelikorttigeneraattori
│   └── audio.js           # Web Audio API ääniefektit (ei riippuvuuksia)
└── README.md              # Tämä ohjetiedosto
```

---

## 🧪 Testaus ja Laadunvarmistus / Testing & CI

Projektissa on automaattinen testipatteristo (`unittest`), joka testaa sääntömoottorin, bottien tekoälyn ja suorittaa kymmeniä simulaatiopelejä:

```bash
# Aja kaikki testit paikallisesti:
python3 -m unittest discover -s tests -p "test_*.py" -v
```

GitHub Actions -putki (`.github/workflows/ci.yml`) ajaa nämä testit automaattisesti aina kun koodia pushataan `main`- tai `test*`-haaroihin sekä ennen kuin Pull Request yhdistetään `main`-haaraan.

Hauskoja pelihetkiä kavereiden kanssa! 🃏🔥

