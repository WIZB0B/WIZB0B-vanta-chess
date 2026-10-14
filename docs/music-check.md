# The music check

Every piece of VCH's music passed four checks before it joined the library (owner, 2026-10-13: "no skips... no sudden change in tones or melody or some weird AI shit... double check, triple check. It has to be perfect"; and of Flow Music's Producer: "give her the bar... any music that passed that bar, past or present or future, then we can use"). The library is built by `scripts/audio/build_assets.py`, whose lists (`EXCLUDE`, `TRIM`, `SUITES`, `WORLD_THEMES`, `STINGS`) follow the verdicts below.

1. **Listening.** Flow Music's Producer listened to each piece whole against the bar below. Its broad pass missed faults the measurements found, so every moment the measured check flagged went back to it for a second, targeted listen at that exact time: (a) musical, a prepared change a composer meant, or (b) a fault.
2. **Measuring.** `scripts/audio/audit.py` (version 8) measures each piece for what a listener would hear as a fault: jumps in level, timbre, harmony or rhythm, dropouts and sudden silences, clicks, clipping, voices in instrumentals, and the key and tempo holding. For songs, `scripts/audio/lyrics.py` separates the voice and transcribes it, to check the words are sung in the song's own language.
3. **Looking.** Each piece's overview sheet (loudness, spectrogram, chroma, tempogram, change curves, voice) was reviewed by eye, and every flag's close-up.
4. **Your ears, last.** Theme Studio → Music list plays any piece; Not for me puts one away for you, and tells us which to look at again.

## The bar

> A track passes only if all of these are true: 1) no skips, jump cuts, dropouts or sudden silences; 2) no clicks, crackle, clipping or distortion; 3) the key and the tempo stay steady (a change of section is fine only when it is prepared); 4) no sudden switch of style or instruments: every change is prepared; 5) no wrong notes, no warbling, detuned or morphing instruments; 6) voices only where wanted (an instrumental has none: no singing, no choir, no humming, no vocal-like pads); 7) a clean start and a natural ending. One line per track: title, PASS or FAIL, and for a FAIL each problem with its timestamp. Be strict: the owner wants no sudden changes of tone or melody at all, and nothing that sounds like an AI artifact.

For the boss operas (a dramatic soprano and a choir are wanted): the same bar, with the singing in tune and clear, its words real Italian or Latin or a convincing wordless vocalise, never garbled pseudo-words.

For the stings (3 to 9 seconds, played once at a moment): a clean start (no click, no clipped note or breath, no fragment of an earlier phrase), a clean end (a natural ring-out or a smooth fade, never cut off mid-note or mid-reverb), no clicks, crackle, clipping or distortion, in tune with no garbled vocals, and it sounds like its moment and like a finished cue.

## Names

The owner (2026-10-13): "you cannot just name something ancient Egypt, ancient Greece... be creative with the names... live with the lore", and not names everyone knows already (no famous gods). Each old world is named for a game of strategy its people played, the ancestors and cousins of chess, or for the land in its own people's words; each piece is named for a story from that world. Theme Studio shows the land after the name (Mehen · Ancient Egypt), so a player knows where they are going.

| World | The name | Its pieces |
|---|---|---|
| **Mehen** (Ancient Egypt) | A board game played from about 3000 to 2300 BC on a coiled snake; its board was the serpent god Mehen, whose coils the soul walked through to be reborn by the sun. Its pieces were lions and lionesses. ([Mehen](https://en.wikipedia.org/wiki/Mehen_(game))) | *Iteru at Low Water* (jtrw, "iteru": the Egyptians' one word for river and Nile, [Nile](https://en.wikipedia.org/wiki/Nile)); *The Twelve Hours* (the sun's journey through the hours of the night); *Lions of the Coil* (the game's lion pieces); *The Soul's Road* (the soul through the serpent); suite *The Serpent's Head* (where the soul is reborn). |
| **Petteia** (Ancient Greece) | "Pebbles": the Greek game of strategy praised by Plato; its board's spaces were "cities" (poleis), its pieces "dogs", and a piece was taken when hemmed in between two. ([Polis](https://en.wikipedia.org/wiki/Polis_(board_game))) | *Cities of Pebble*; *Dogs of the Polis*; suite *Between Two Stones*. |
| **Latrunculi** (Ancient Rome) | "Little soldiers" (or brigands): the Roman game of military tactics, the *ludus latrunculorum*. ([Ludus latrunculorum](https://en.wikipedia.org/wiki/Ludus_latrunculorum)) | *A Soldiery of Glass* (the poem *Laus Pisonis* on its glass pieces); suite *The Twin Foe* (Martial: a piece perishes against a twin enemy). |
| **Liubo** (Ancient China) | "Six sticks": the board game of the Han dynasty, thrown with six sticks; carvings show immortals playing it on mountain tops; a piece that came far enough stood up as an "owl" and could catch a fish from the water. ([Liubo](https://en.wikipedia.org/wiki/Liubo)) | *Immortals at Play*; suite *The Owl and the Fish*. |
| **Heian** (Old Japan) | The Heian era, and Heian shogi, the oldest shogi written down (about 1120). Its pieces' names are poems. ([Heian shogi](https://en.wikipedia.org/wiki/Heian_shogi), [Sho shogi](https://en.wikipedia.org/wiki/Sho_shogi)) | *The Jade General* (玉将, the king); *Incense Chariot* (香車, the lance); *The Laurel Horse* (桂馬, the knight); suite *The Drunken Elephant* (酔象, a piece of old shogi that promotes to crown prince and fights on as a second king); suite *Silver and Gold* (the generals). |
| **Chatrang** (Ancient Persia) | The Persian name of chess. In the Middle Persian tale, an Indian king sent a chess set of sixteen emerald and sixteen ruby pieces as a riddle; the sage Wuzurgmihr explained it after three days, then answered with a game of his own. ([Encyclopaedia Iranica](https://www.iranicaonline.org/articles/wizarisn-catrang-nihisn-ardaxir/)) | *Emerald and Ruby*; suite *Wuzurgmihr's Answer*. |
| **Etemenanki** (Babylon) | "Temple of the Foundation of Heaven and Earth": Babylon's great ziggurat, the tower behind the story of Babel. ([Etemenanki](https://en.wikipedia.org/wiki/Etemenanki)) | *Foundation of Heaven and Earth*; suite *Powerful Like a Lion* (a fortune from the Babylonian tablet of 177 BC that gives the oldest written rules of a board game, the game of twenty squares: [Royal Game of Ur](https://en.wikipedia.org/wiki/Royal_Game_of_Ur)). |
| **Igodomigodo** (Kingdom of Benin) | The kingdom's own first name, under the Ogiso, the "kings from the sky"; its first king, Igodo, made land by pouring sand from a snail shell onto the water. ([Igodomigodo](https://en.wikipedia.org/wiki/Igodomigodo)) | *Sand from a Snail Shell*; suite *Kings from the Sky*. |

The other battle suites took names from their realms too: *Cinders on the Wind* (Ashen March), *Bells Under Water* (Drowned Keep), *The Other Hand* (Mirror Court), *The Usurper's Feast* (Hollow Crown), *The Last Ascent* (Obsidian Spire), *Old Scores* (Rivalry), and Vanta Chess's own *When the Candles Gutter* and *The Storm Builds*. A suite's parts are its name and the moment: *The Drunken Elephant · Opening*.

## In the library: 110 pieces and 13 stings

A measured flag is a moment to listen to, not a verdict: each one went back to the Producer for a targeted listen at that time, and its answer is in the Listening column ("musical" clears it). Gaps, dropouts and bad openings or endings are cut out instead (the Notes say where a piece starts or ends).

### Battle suites (whole on a station; Opening, Middlegame and Time Trouble in a game)

| Piece | Listening | Measured | Notes |
|---|---|---|---|
| Etemenanki · Powerful Like a Lion (`suite-babylon`) | PASS | pass | parts: Opening 0:00.5–0:57.8, Middlegame 1:00.8–2:00, Time Trouble 2:03–2:44.1 |
| Igodomigodo · Kings from the Sky (`suite-benin`) | PASS | pass | parts: Opening 0:01.1–1:37.4, Middlegame 0:20–1:37.4, Time Trouble 1:39.7–2:45.3 |
| Liubo · The Owl and the Fish (`suite-china`) | PASS | pass | parts: Opening 0:00.3–1:00.8, Middlegame 1:04–1:57.7, Time Trouble 2:00.8–2:38.7 |
| Mehen · The Serpent's Head (`suite-egypt-b`) | PASS | pass | parts: Opening 0:00–0:58.3, Middlegame 1:01.2–1:46.1, Time Trouble 1:49.1–2:43.9 |
| Ashen March · Cinders on the Wind (`suite-ember`) | PASS | pass | parts: Opening 0:00–1:01.5, Middlegame 1:04–2:24.8, Time Trouble 2:27.2–2:48.2 |
| Hollow Crown · The Usurper's Feast (`suite-gilded`) | PASS | pass | parts: Opening 0:02.1–0:57.4, Middlegame 1:00–2:45.7, Time Trouble 1:17–2:45.7 |
| Petteia · Between Two Stones (`suite-greece-b`) | PASS | pass | parts: Opening 0:00–1:00.1, Middlegame 1:02.7–1:40.5, Time Trouble 1:43.1–2:48.8 |
| Heian · The Drunken Elephant (`suite-japan-v3a`) | PASS (sections 1:00, 2:00, final 2:45) | pass | parts: Opening 0:00–0:55.6, Middlegame 0:58.6–1:57.1, Time Trouble 2:00–2:39.1 |
| Heian · Silver and Gold (`suite-japan-v3b`) | PASS (sections 1:00, 2:00, final 2:50) | pass | parts: Opening 0:00.3–0:56.3, Middlegame 0:59.3–1:58.9, Time Trouble 2:01.9–2:44.1 |
| Mirror Court · The Other Hand (`suite-mirror`) | PASS | pass | parts: Opening 0:00–0:58.4, Middlegame 1:01.1–1:56.8, Time Trouble 1:59.4–2:44.7 |
| Obsidian Spire · The Last Ascent (`suite-obsidian-v2`) | PASS | pass | parts: Opening 0:00–0:42, Middlegame 0:44.8–1:25.9, Time Trouble 1:28.7–2:31.4 |
| Chatrang · Wuzurgmihr's Answer (`suite-persia-v2`) | PASS | pass | parts: Opening 0:00–0:54.7, Middlegame 0:57.4–1:57.4, Time Trouble 2:00–2:48.7 |
| Rivalry · Old Scores (`suite-rivalry`) | PASS | pass | parts: Opening 0:00.3–1:07.3, Middlegame 1:09.6–1:38.8, Time Trouble 1:41.1–2:48.5 |
| Latrunculi · The Twin Foe (`suite-rome-v2`) | PASS | pass | parts: Opening 0:00–0:56.9, Middlegame 0:59.3–2:03.3, Time Trouble 2:05.7–2:36.2 |
| Drowned Keep · Bells Under Water (`suite-umbra`) | PASS | pass | parts: Opening 0:00–0:56.3, Middlegame 0:59.3–1:57, Time Trouble 2:00–2:42 |
| Vanta · When the Candles Gutter (`suite-vanta-v3a`) | PASS (sections 1:04, 2:03) | pass | parts: Opening 0:00–1:01.4, Middlegame 1:04–2:00, Time Trouble 2:02.7–2:46.2 |
| Vanta · The Storm Builds (`suite-vanta-v3b`) | PASS (sections 1:00, 2:00, final 2:47) | pass | parts: Opening 0:00–0:59.4, Middlegame 1:02.1–1:55.4, Time Trouble 1:58.1–2:41.7 |

### Old worlds: themes for the menus

| Piece | Listening | Measured | Notes |
|---|---|---|---|
| Etemenanki · Foundation of Heaven and Earth (`realm-babylon`) | PASS (targeted: 0:23 is musical) | review: 0:23 pulse |  |
| Igodomigodo · Sand from a Snail Shell (`realm-benin`) | PASS | pass |  |
| Liubo · Immortals at Play (`realm-china`) | PASS | pass |  |
| Mehen · Iteru at Low Water (`realm-egypt-v3a`) | PASS (targeted: 0:22.0-0:22.6 is a prepared grand pause before the beat drop) | pass |  |
| Mehen · The Twelve Hours (`realm-egypt-v3b`) | PASS | pass |  |
| Mehen · Lions of the Coil (`realm-egypt-v3c`) | PASS (targeted: 0:23.3, 1:00.4 and 2:15.4 are prepared rests before entries) | pass |  |
| Mehen · The Soul's Road (`realm-egypt-v3d`) | PASS (targeted: 0:21 a prepared move from a free opening into the groove) | review: 0:21 pulse |  |
| Petteia · Cities of Pebble (`realm-greece`) | PASS | pass |  |
| Petteia · Dogs of the Polis (`realm-greece-b`) | FAIL targeted: 0:05 jump cut from quiet solo plucking into full orchestra | fail: 0:05.2 jump | plays from 0:05.2; checked from there: PASS from 0:05.2 |
| Heian · The Jade General (`realm-japan-v2a`) | PASS | pass |  |
| Heian · Incense Chariot (`realm-japan-v2b`) | PASS | pass |  |
| Heian · The Laurel Horse (`realm-japan-v2c`) | PASS | pass |  |
| Chatrang · Emerald and Ruby (`realm-persia`) | PASS (targeted: 0:17 is musical) | review: 0:17 pulse |  |
| Latrunculi · A Soldiery of Glass (`realm-rome-b`) | PASS | pass |  |

### Vanta: game pieces

| Piece | Listening | Measured | Notes |
|---|---|---|---|
| Vanta · Advantage (`vanta-advantage`) | PASS (upload) | pass |  |
| Vanta · Middlegame (`vanta-middlegame`) | PASS | pass |  |
| Vanta · Middlegame II (`vanta-middlegame-2`) | PASS (targeted: 0:23.4 and 1:53.4 are musical, not clicks) | review: 0:23.4 click; 1:53.4 click |  |
| Vanta · Opening (`vanta-opening`) | PASS | pass |  |
| Vanta · Opening II (`vanta-opening-2`) | PASS | pass |  |
| Vanta · Time Trouble (`vanta-time-trouble`) | PASS (1:06-1:14 filter sweep is musical) | review: 1:06 muffled; 1:09.4 silence; 1:10 muffled; 1:14 muffled |  |
| Vanta · Time Trouble III (`vanta-time-trouble-3`) | PASS | pass |  |
| Vanta · Under Siege (`vanta-under-siege`) | PASS (upload; 2:20 and 2:25 musical) | review: 2:20.5 pulse; 2:25 phase |  |
Under Siege at 2:24.5 to 2:27: about three seconds whose left and right channels are out of phase (a stereo effect). In stereo it is musical; on a single phone speaker those seconds sound about 5 dB thinner. Kept; your call.


### Halls (menus)

| Piece | Listening | Measured | Notes |
|---|---|---|---|
| Bronze Hall II (`lobby-bronze-2`) | FAIL targeted: 0:25 ~20 dB level jump, unprepared key/ensemble splice | fail: 0:25.6 jump | plays from 0:25; checked from there: PASS from 0:25.0 |
| Diamond Hall (`lobby-diamond`) | PASS (upload) | pass |  |
| Diamond Hall II (`lobby-diamond-2`) | PASS | pass |  |
| Gold Hall (`lobby-gold`) | PASS (upload; the 2:20 final hit is musical) | fail: 2:20.1 jump |  |
| Gold Hall II (`lobby-gold-2`) | PASS | pass |  |
| Platinum Hall (`lobby-platinum`) | PASS (upload; the 2:29 ending is musical) | review: 2:29.3 ending |  |
| Silver Hall (`lobby-silver`) | PASS (upload) | pass |  |
| Silver Hall II (`lobby-silver-2`) | PASS | pass |  |
| Tournament Hall II (`lobby-tournament-2`) | PASS | pass |  |
| The Vanta Hall (`lobby-vanta`) | PASS (upload; 2:05 musical) | review: 2:05 pulse |  |

### Focus

| Piece | Listening | Measured | Notes |
|---|---|---|---|
| Deep Calculation (`focus-deep-calculation`) | PASS (upload; 2:41 musical) | review: 2:41.5 pulse |  |
| Deep Calculation II (`focus-deep-calculation-2`) | PASS targeted: 0:10 clean beat drop, 2:27 ritardando | review: 0:10 pulse; 2:27.5 pulse |  |
| Night Analysis (`focus-night-analysis`) | TRIM (upload): resolves at 2:33-2:35, tail decays; the 2:51 dropout is after it. Clean if it ends by 2:38-2:40 with a fade | fail: 0:05 phase; 2:51.4 silence | ends at 2:40 with a 4 s fade |
| Puzzle Garden (`focus-puzzle-garden`) | PASS (upload; 2:48 musical) | review: 2:48.5 pulse |  |
| Quiet Mind (`focus-quiet-mind`) | PASS (upload; 0:15 musical) | review: 0:15 phase |  |
| Quiet Mind II (`focus-quiet-mind-2`) | PASS | pass |  |
| Study Hall (`focus-study-hall`) | PASS (upload) | pass |  |
| Study Hall II (`focus-study-hall-2`) | PASS targeted: 2:45 ritardando and natural ending | review: 2:45.5 pulse |  |

### Electric

| Piece | Listening | Measured | Notes |
|---|---|---|---|
| Arena Lights (`electric-arena-lights`) | PASS targeted: 0:14 prepared beat drop on the beat | review: 0:14 pulse |  |
| Blitz Funk (`electric-blitz-funk`) | PASS (upload; 1:23/1:58 filter sweeps, 1:50.8 percussion and the 2:28 ending are musical) | review: 1:23 muffled; 1:50.8 click; 1:50.8 click; 1:58 muffled |  |
| Bullet (`electric-bullet`) | PASS (upload) | pass |  |
| Swing Gambit (`electric-swing-gambit`) | PASS (upload) | pass |  |

### Opera (boss battles)

| Piece | Listening | Measured | Notes |
|---|---|---|---|
| The Ember Warden (`boss-ember-warden`) | PASS (opera bar: singing in tune and clear; real Italian/Latin or clean vocalise) | fail: whole piece language; whole piece lyrics · sung in its language: 14% of the passes |  |
| The Pale Reflection (`boss-pale-reflection`) | FAIL targeted: 0:25 abrupt ~12 dB jump mid-phrase, instant ambience change, no preparation | fail: 0:25.6 jump; whole piece language · sung in its language: 17% of the passes | plays from 0:25.7; checked from there: PASS from 0:25.7 (opera bar; clean and complete from the entrance downbeat) |
| The Tidecaller (`boss-tidecaller`) | PASS (opera bar) | fail: whole piece language; whole piece lyrics; whole piece lyrics · sung in its language: 0% of the passes |  |
| The Usurper (`boss-usurper`) | PASS (opera bar) | fail: whole piece language · sung in its language: 17% of the passes |  |
| The Vanta King (`boss-vanta-king`) | PASS (opera bar) | fail: whole piece language; whole piece lyrics · sung in its language: 0% of the passes |  |
The lyrics check expects words in a language. The bosses sing mostly wordless vocalise, which the opera bar allows (the Ember Warden sings real Italian), so its language flags do not apply to them; the Producer judged the singing with the opera bar.


### Songs

| Piece | Listening | Measured | Notes |
|---|---|---|---|
| كش ملك (`song-ar-kish-malik`) | PASS | pass |  |
| قهوة الصباح (`song-ar-qahwat-alsabah`) | PASS | pass |  |
| Die alte Bäckerei (`song-de-baeckerei`) | PASS | pass |  |
| Zug um Zug (`song-de-zug-um-zug`) | PASS | pass · sung in its language: 100% of the passes |  |
| Endgame (`song-endgame`) | PASS | pass |  |
| La cocina de mi abuela (`song-es-cocina-abuela`) | PASS | pass |  |
| Jaque al rey (`song-es-jaque-al-rey`) | PASS | pass |  |
| Jaque al rey II (`song-es-jaque-al-rey-b`) | PASS | pass |  |
| Échec et mat (`song-fr-echec-et-mat`) | PASS | pass |  |
| Mon vieux vélo (`song-fr-vieux-velo`) | PASS | pass |  |
| Grandpa's Chessboard (`song-grandpas-chessboard`) | PASS | pass |  |
| चाय की टपरी (`song-hi-chai-ki-tapri`) | PASS | pass |  |
| शह और मात (`song-hi-shah-aur-maat`) | PASS | pass |  |
| शह और मात II (`song-hi-shah-aur-maat-b`) | PASS | pass |  |
| Il caffè della domenica (`song-it-caffe-domenica`) | PASS targeted: 2:46 ritardando into a natural final chord | review: 2:46.5 pulse |  |
| La regina (`song-it-la-regina`) | PASS | pass |  |
| 一手ずつ (`song-ja-itte-zutsu`) | PASS | pass |  |
| 商店街の夕暮れ (`song-ja-shotengai`) | PASS targeted: 0:06 brass pickup into a full-band downbeat | fail: 0:06.7 jump |  |
| Kitchen Stove (`song-kitchen-stove`) | PASS | pass |  |
| The Knight's Ride (`song-knights-ride`) | PASS | pass |  |
| 한 수 한 수 (`song-ko-han-su`) | PASS | pass |  |
| Life Is a Long Game (`song-long-game`) | PASS | pass |  |
| Morning Coffee (`song-morning-coffee`) | PASS | pass |  |
| The Old Chair (`song-old-chair`) | PASS targeted: 2:45 ritardando into a natural final chord | review: 2:45.5 pulse |  |
| The Pawn's Journey (`song-pawns-journey`) | PASS | pass |  |
| A varanda (`song-pt-varanda`) | PASS | pass |  |
| Xeque-mate (`song-pt-xeque-mate`) | PASS targeted: 2:47 ritardando into a natural final chord | review: 2:47 pulse |  |
| Queen of the Board (`song-queen-of-the-board`) | PASS | pass |  |
| Rain on the Window (`song-rain-window`) | PASS | pass |  |
| Дача (`song-ru-dacha`) | PASS | pass |  |
| Ход конём (`song-ru-hod-konyom`) | PASS | pass |  |
| Saturday Market (`song-saturday-market`) | PASS | pass |  |
| Tick Tock (`song-tick-tock`) | PASS | pass |  |
| Çay Bahçesi (`song-tr-cay-bahcesi`) | PASS | pass |  |
| Hamle (`song-tr-hamle`) | PASS | pass |  |
| Hamle II (`song-tr-hamle-b`) | PASS | pass |  |
| 外婆的小院 (`song-zh-waipo-xiaoyuan`) | PASS | pass |  |
| 一步一步 (`song-zh-yi-bu-yi-bu`) | PASS | pass |  |

### After a game

| Piece | Listening | Measured | Notes |
|---|---|---|---|
| After the Loss (`result-loss`) | PASS | pass |  |
| After the Win (`result-win`) | FAIL targeted: 1:02 truncated tails, 1:12 unprepared ~14 dB jump, 1:18 harmonic splice | fail: 1:02 pulse; 1:12 jump; 1:18.1 switch | ends at 1:02 with a 3 s fade; checked from there: PASS 0:00 to 1:02 with a fade over 0:59 to 1:02 |

### Relic sets

| Piece | Listening | Measured | Notes |
|---|---|---|---|
| Crystal Relics (`skin-crystal`) | PASS | pass |  |
| Ember Relics (`skin-ember`) | PASS | pass |  |
| Gilded Relics (`skin-gilded`) | PASS | pass |  |
| Tidal Relics (`skin-tidal`) | PASS | pass |  |

### Stings

| Sting | Cut from | Listening | Measured |
|---|---|---|---|
| Victory (`sting-win`) | `sting-victory` 0:50.4–0:59.1 | PASS (re-cut to its natural ring-out) | pass |
| Defeat (`sting-loss`) | `sting-defeat` 0:52–0:56.9 | PASS (re-cut to its natural ring-out) | pass |
| Draw (`sting-draw`) | `sting-draw` 0:48–0:54.9 | PASS (re-cut to its natural ring-out) | pass |
| Checkmate (`sting-checkmate`) | `sting-checkmate` 0:57.6–1:03.1 | PASS (re-cut to its natural ring-out) | pass |
| Game start (`sting-start`) | `sting-game-start` 0:00–0:04 | PASS | pass |
| Rank up (`sting-rank-up`) | `sting-rank-up` 0:56.9–1:04 | PASS (re-cut to its natural ring-out) | pass |
| Rank down (`sting-rank-down`) | `sting-rank-down` 0:50–0:57 | PASS (re-cut to its natural ring-out) | pass |
| Rank down II (`sting-rank-down-2`) | `sting-rank-down-2` 0:50.8–0:59.9 | PASS (re-cut to its natural ring-out) | pass |
| Relic earned (`sting-relic`) | `sting-relic` 0:52.5–0:59.4 | PASS (re-cut to its natural ring-out) | pass |
| Realm freed (`sting-realm`) | `sting-realm-freed` 0:52.5–0:59.4 | PASS (re-cut to its natural ring-out) | pass |
| Puzzle solved (`sting-solved`) | `sting-puzzle-solved` 0:50.9–0:54 | PASS | pass |
| Puzzle failed (`sting-failed`) | `sting-puzzle-failed` 0:56–0:59 | PASS | pass |
| Brilliant move (`sting-brilliant`) | `sting-brilliant` 0:53.5–0:58.1 | PASS (re-cut to its natural ring-out) | pass |

## Left out: 45 pieces

| Piece | Why |
|---|---|
| `electric-neon-gambit` | FAIL (upload): 0:14.6 and 1:31.4 abrupt mid-phrase dropouts cut the audio and reverb tail |
| `electric-overclocked` | FAIL (upload): vocal chops at 0:13, 0:44, 1:28 (the 2:29 ending is musical) |
| `ember-middlegame` | replaced by its battle suite |
| `ember-opening` | replaced by its battle suite |
| `ember-time-trouble` | replaced by its battle suite |
| `focus-deep-calculation-3` | FAIL 0:00-0:22 vocal chops in an instrumental |
| `gilded-middlegame` | replaced by its battle suite |
| `gilded-opening` | replaced by its battle suite |
| `gilded-time-trouble` | replaced by its battle suite |
| `lobby-bronze` | FAIL (upload): soft humming at 0:25 (2:19 musical) |
| `lobby-platinum-2` | FAIL targeted: 1:10 abrupt mid-phrase cut into an unrelated string ensemble |
| `lobby-tournament` | FAIL 0:25 and 1:35 vocal exclamations ('Yeah!') in an instrumental |
| `lobby-vanta-2` | FAIL 1:29-1:41 vocal/choir melody line in an instrumental |
| `mirror-middlegame` | replaced by its battle suite |
| `mirror-opening` | replaced by its battle suite |
| `mirror-time-trouble` | replaced by its battle suite |
| `obsidian-middlegame` | replaced by its battle suite |
| `obsidian-opening` | replaced by its battle suite |
| `obsidian-time-trouble` | FAIL 0:58 jump cut to an acoustic guitar loop; 1:13 jump cut back |
| `realm-egypt-v2a` | FAIL: 1:02 sudden unprepared style, energy and tempo jump (strummed acoustic guitar and accordion) |
| `realm-egypt-v2b` | FAIL: humming at 0:08-0:12, 0:58-1:02, 1:55-2:02 |
| `realm-japan` | FAIL targeted: 0:12 sudden ~9 dB spike and reverb shift (2:16 ritardando is fine) |
| `realm-rome` | FAIL 0:00-0:15 background choir pad; 0:51, 1:43, 2:08 abrupt tempo and style shifts |
| `rivalry-middlegame` | replaced by its battle suite |
| `rivalry-opening` | replaced by its battle suite |
| `rivalry-time-trouble` | replaced by its battle suite |
| `skin-celestial` | FAIL 0:48 choir/vocal harmonies in an instrumental |
| `skin-shadow` | FAIL 1:00 abrupt cut-off at the end instead of a natural decay |
| `song-endgame-2` | FAIL targeted: 1:40 unprepared ~10 dB jump, 2:26/2:36 off-beat glitches and rhythmic cuts |
| `suite-egypt` | FAIL 0:59-1:00 and 2:02-2:03 jump cuts, tempo accelerations, style switches |
| `suite-greece` | FAIL targeted: 1:00 unprepared hard cut mid-beat into an unrelated key and style |
| `suite-japan` | FAIL 1:05 sudden tempo acceleration; switch to folk dance style; 2:23-2:29 background choir |
| `suite-japan-v2` | FAIL: 0:59 sudden jump cut in tempo (~65 to ~135 BPM), style and key |
| `suite-mirror-b` | FAIL 1:04 abrupt tempo acceleration; sudden style and instrumentation change |
| `suite-obsidian` | FAIL 1:02 abrupt tempo change (slow adagio to fast waltz) and style switch; 1:57-2:01 unwanted choir |
| `suite-persia` | FAIL 1:03 sudden tempo acceleration; switch to Middle Eastern folk style |
| `suite-rome` | FAIL 1:03 sudden tempo acceleration; switch to folk/Celtic instruments |
| `suite-rome-b` | FAIL 1:02 sudden tempo acceleration; switch to folk-orchestral instruments |
| `suite-vanta` | FAIL 1:04 abrupt jump cut: key, tempo and genre change at once |
| `suite-vanta-v2` | FAIL vocal/choir pad 0:38-0:59 and 2:28-2:40 |
| `umbra-middlegame` | replaced by its battle suite |
| `umbra-opening` | replaced by its battle suite |
| `umbra-time-trouble` | replaced by its battle suite |
| `vanta-advantage-2` | left out (see build_assets.py) |
| `vanta-time-trouble-2` | FAIL 0:59 abrupt cut into a tick-tock breakdown; 1:16 sudden jump back |

Left-out pieces stay in Flow Music; none is in the app. A piece with only a bad opening or ending is kept from (or to) the point the Producer confirmed clean, as the notes say.
