# 🃏 Pudotuspelit

Moderni, responsiivinen ja nollarivinen moninpelisovellus suomalaisille suosikkikorttipeleille: **Paskahousu**, **Valepaskahousu** ja **Arabia**.

Pelaa reaaliajassa kavereiden kanssa puhelimella, tabletilla tai tietokoneella, tai harjoittele älykkäitä AI-botteja vastaan!

---

## 🚀 Pika-aloitus / Paikallinen ajo

Peli ei vaadi ulkoisia kirjastoja tai pakettiasennuksia – pelkkä **Python 3** (3.8+) riittää!

### 1. Käynnistä palvelin
```bash
python3 server.py
```

Palvelin tulostaa terminaaliin liittymisosoitteet:
```
============================================================
 🃏 TUUTAN JA EMAILIN PELIHUONE MULTIPLAYER SERVER 🃏
============================================================
 * Local:   http://localhost:8000
 * Network: http://192.168.1.x:8000  <-- Jaa kavereille samassa Wi-Fi-verkossa!
============================================================
```

### 2. Avaa selaimessa
* Avaa tietokoneella tai puhelimella: `http://localhost:8000` (tai lähiverkon IP).

---

## ☁️ Tuotanto & Julkaisu (Render.com)

Koko projekti on suunniteltu pyörimään suoraan **Render.com** -pilvipalvelussa:

* **Palvelintyyppi:** Web Service (Python)
* **Käynnistyskomento:** `python3 server.py`
* **Ympäristömuuttujat:** `PORT=10000` (Render asettaa tämän automaattisesti)
* **Määritystiedosto:** [`render.yaml`](render.yaml) automatisoi asetukset suoraan koodivarastosta.

Kun koodi yhdistetään GitHubin `main`-haaraan, Render päivittää ja käynnistää palvelun automaattisesti.

---

## 🎮 Pelimuodot & Säännöt

### Korttien yleinen arvojärjestys
$$\text{3 – 4 – 5 – 6 – 7 – 8 – 9 – 10 – J – Q – K – A} \quad (\text{2 on erikoiskortti})$$

* **Kaadot:**
  * **Kymppi (10):** Kaataa numerokortit (3–9) sivuun (Arabiassa kaataa aina).
  * **Ässä (A):** Kaataa kuvakortit (J, Q, K) ja Ässän sivuun (avopelissä ja valepaskassa).
  * **Neloset (4 samaa):** Neljä samanarvoista korttia peräkkäin kaataa pakan automaattisesti sivuun!
* **Paskahousun kruunaus:** Pelaaja, jolle jää viimeisenä kortteja käteen tai pöytään, häviää ja on virallinen **PASKAHOUSU**! 💩

---

### 1. Arabia
Arabia on taktinen ja vauhdikas pelimuoto, jossa jokaisella pelaajalla on 3 piilokorttia, 3 avointa pöytäkorttia ja käsikortit.

1. **Aloitusvaihto:** Ennen pelin ensimmäistä kaatoa pelaajat saavat vapaasti vaihtaa käsikorttejaan omien avointen pöytäkorttiensa kanssa.
2. **Kuvakorttien lukitus:** Kuvakortteja (J, Q, K, A) **ei saa** pelata ennen kuin pelin ensimmäinen kaato (kympillä tai 4 samalla) on tapahtunut!
3. **Kakkonen (2):** Kakkosen saa lyödä minkä tahansa kortin päälle, se nollaa pöydän ja **pelaaja saa heti jatkaa vuoroaan** uudella kortilla.
4. **Korttien loppuminen:**
   * Ensin pelataan käsikortit (nostopakasta täydennetään 3 korttiin asti niin kauan kuin pakkaa riittää).
   * Pakan ja käsikorttien loputtua pelataan 3 avointa pöytäkorttia.
   * Viimeisenä käännetään 3 sokkokorttia pöydästä yksi kerrallaan. Jos sokkokortti ei sovi pöytään, pelaaja joutuu nostamaan koko pinon ja kortin käteensä.

---

### 2. Valepaskahousu (Valepaska)
Valepaskassa kortit lyödään pöytään **kuvapuoli alaspäin**.

1. Vuorossa oleva valitsee 1–4 korttia ja ilmoittaa ääneen väitteensä (esim. *"Kaksi kasia"* tai *"Yksi rouva"*).
2. Väitteen täytyy olla laillinen pöytään nähden, mutta **kortit saavat olla täyttä valetta**!
3. Muille pelaajille avautuu **haastoikkuna**:
   * **Haasto (⚡):** Kuka tahansa voi haastaa väitteen.
     * Jos pelaaja **valehteli**: Valehtelija nostaa koko pakan käteensä!
     * Jos pelaaja **puhui totta**: Haastaja nostaa koko pakan rangaistukseksi, ja rehellinen pelaaja saa uuden vuoron tyhjään pöytään.
   * **Passaus (👍):** Jos kukaan ei haasta, kortit jäävät pinoon ja peli jatkuu.

---

### 3. Paskahousu (Avopeli)
Kaikki kortit pelataan avoimesti kuvapuoli ylöspäin.
* Pöytään on lyötävä aina vähintään yhtä suuri tai yhtä monta samaa korttia kuin edellinen.
* Jos sopivaa korttia ei ole:
  * **Käännä pakasta:** Pelaaja kääntää nostopakan päällimmäisen kortin. Jos se sopii, se pelataan automaattisesti; jos ei sovi, pelaaja nostaa pöydän ja käännetyn kortin.
  * **Nosta pöytä:** Pelaaja voi nostaa pakan vapaaehtoisesti käteensä.

---

## ✨ Ominaisuudet

* 📱 **Mobile-First käyttöliittymä:** Hiottu toimimaan sulavasti puhelimilla (pysty- ja vaakatilassa), tableteilla ja tietokoneilla.
* 🤖 **Älykkäät AI-botit:** Pekka, Jari, Sirpa, Matti, Kerttu, Teemu, Sanna ja Ville pelaavat ihmismäisesti, bluffaavat ja haastavat todennäköisyyksien mukaan.
* 🎵 **Musiikkisoitin:** 13 kappaleen The Weeknd & Swedish House Mafia -soitin taustamusiikille (oletuksena *Lost in the Fire*). Omat äänenvoimakkuus- ja kappalevalikot.
* 🔊 **Web Audio API -äänet:** Autenttiset korttiäänet, haastohälytykset, summerit, fanfaarit ja ikoninen Paskahousun vesivessan huuhtelu.
* 💬 **Reaaliaikainen chat & pika-reaktiot:** 💩, 🤥, 😂, 🔥, 👀, 👍.
* ⚙️ **Säädettävät kotisäännöt:** Kakkossääntö, tyhjän pöydän kymppisääntö, seiskan sääntö ja haastoajan pituus.

---

## 🧪 Testaus & Laadunvarmistus (CI/CD)

Projektissa on kattava automaattinen testipatteristo (`unittest`), joka varmistaa sääntömoottorin toiminnan, kaadot, bottien tekoälyn ja suorittaa kymmeniä simulaatiopelejä:

### Aja testit paikallisesti:
```bash
python3 -m unittest discover -s tests -p "test_*.py" -v
```

### GitHub Actions -testiputki:
Projektin [`.github/workflows/ci.yml`](.github/workflows/ci.yml) ajaa testit automaattisesti jokaisen pushin ja Pull Requestin yhteydessä:
* Testaa Python-versiot **3.10, 3.11 ja 3.12**.
* Tarkistaa syntaksin (`py_compile`).
* Varmistaa staattisten tiedostojen ja linkitysten eheyden.

---

## 🛠 Tiedostorakenne

```
Pelihuone/
├── .github/workflows/ci.yml # GitHub Actions automaattinen testiputki
├── server.py              # Pure Python 3 async HTTP + WebSocket palvelin
├── game_engine.py         # Sääntömoottori (Paskahousu, Valepaska, Arabia)
├── room_manager.py        # Moninpelihuoneet, bottien vuorot ja synkronointi
├── bot_ai.py              # Tekoälylogiikka ja pelisimulaatiot
├── render.yaml            # Render.com -palvelinmääritys
├── tests/                 # Automaattiset yksikkö- ja simulaatiotestit
│   ├── test_game_engine.py # Sääntö- ja mekaniikkatestit
│   ├── test_bot_ai.py     # Tekoäly- ja simulaatiotestit
│   └── test_server.py     # Palvelin- ja tiedostoeheystestit
├── static/
│   ├── index.html         # Pelin käyttöliittymä
│   ├── style.css          # Kasinohuopateema ja animaatiot
│   ├── app.js             # Client-logiikka, WebSockets, musiikkisoitin
│   ├── cards.js           # SVG-vektori pelikortit
│   ├── audio.js           # Ääniefektit
│   └── *.m4a              # Taustamusiikkiraidat (AAC)
└── README.md              # Tämä ohjetiedosto
```

Hauskoja pelihetkiä Pudotuspeleissä! 🃏🔥
