/**
 * Esse código tá um caos.
 * Uma outra hora eu organizo ele e deixo cometado.
 * Por enquanto, quero fazer ele ser minimamente funcional.
 */
// Lidando com o audio e efeitos sonoros
let audioContext;
let audioBuffer;
let audioSource;
let startTimeAudio = 0;

async function carregarMusica(url) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();

    const resposta = await fetch(url);
    const arrayBuffer = await resposta.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
}

function tocarMusica() {
    if (!audioBuffer || !audioContext) return;

    audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(audioContext.destination);

    startTimeAudio = audioContext.currentTime * 1000; // tempo em milissegundos
    audioSource.start(0);
}

// Main Game
function parseOsuFile(osuText, totalLanes = 4) {
    const lines = osuText.split('\n');
    const hitObjectsIndex = lines.findIndex(line => line.trim() === '[HitObjects]');
    if (hitObjectsIndex === -1) {
        console.error('Seção [HitObjects] não encontrada.');
        return [];
    }

    const teclaMap = ['a', 's', 'k', 'l']; // mapear lanes para teclas

    const notas = [];
    for (let i = hitObjectsIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(',');
        const x = parseInt(parts[0]);
        const tempo = parseInt(parts[2]);
        const tipoRaw = parseInt(parts[3]);

        const teclaIndex = Math.floor((x / 512) * totalLanes);
        const tecla = teclaMap[teclaIndex] || 'a'; // fallback pra 'a'

        // Nota normal
        if ((tipoRaw & 128) === 0) {
            notas.push({
                tecla,
                tempo,
                tipo: 'normal',
            });
        } else {
            // Nota longa (LN), converter head e tail em duas notas normais
            const duracao = parseInt(parts[5]);

            // Head
            notas.push({
                tecla,
                tempo,
                tipo: 'normal',
            });

            // Tail
            // notas.push({
            //     tecla,
            //     tempo: duracao,
            //     tipo: 'normal',
            // });
        }
    }

    return notas;
}

let mapa = []

// Elementos do HTML.
const game = document.getElementById('game');
const menu = document.getElementById('menu');
const comboDiv = document.getElementById('combo');
const hitImage = document.getElementById('maniahit');
const accuracyDiv = document.getElementById('acc');
const scoreDiv = document.getElementById('pontuacao');
const beatline = document.getElementById('beatline');
const progressBar = document.getElementById('progress-bar');

// Esse slider é do formulário, não o slider long note.
const slider = document.getElementById("slider");
const valor = document.getElementById("valorSlider");

// TEMPO: 686ms
// Variáveis principais e importantes (e algumas outras nem tanto).
let gameStarted = false;
let gamePause = false;

let combo = 0;
let acertosQtd = [0, 0, 0, 0, 0, 0]; // Cada index representa os misses, 50, 100, 200, 300 e 320 respectivamente.
let hitsQtdTotal = 0;

let pontuacaoTotal = 0;
let precisao = 100;
let score = 0;
// TODO: Fazer isso funcionar dps.
let pp = null;

let startTime = null;
let notasParaSpawnar = [];
const DELAY_INICIO_MS = 1750;

// Variaveis sobre o mapa
// TODO: quando tiver mais mapas, trocar isso por algo definitivamente melhor e menos preguiçoso.
let offset = 2746;
const durationMs = 141133;
let bpm = 175;
const beatInterval = 60000 / bpm;

const playfieldHeight = game.offsetHeight;
const intervaloAnimacaoNota = 16;
const zonaDeAcerto = playfieldHeight - 90;

const playfields = {
    "a": document.getElementById("playfield-a"),
    "s": document.getElementById("playfield-s"),
    "k": document.getElementById("playfield-k"),
    "l": document.getElementById("playfield-l")
};
/**
 * [0] - Estado da tecla pressionada.
 * [1] - Tipo da tecla (normal ou slider)
 * [2] - Hit time (em ms)
 * [3] - End time (em ms)
 * [4] - Se a header do slider (se for um slider) foi acertada.
 * [5] - Se soltou antes do tempo
 */
const keyStates = {
    "a": [false, "tipo", 0, 0, false],
    "s": [false, "tipo", 0, 0, false],
    "k": [false, "tipo", 0, 0, false],
    "l": [false, "tipo", 0, 0, false]
};

let scrollVelocity = 0.94;
// Não me perguntem porque isso funciona não porque tem essa equação maluca.
// Ela funciona e isso importa
let preempt = (playfieldHeight / (scrollVelocity * (1000/47))) * (intervaloAnimacaoNota / 1000) * 1000;
let mapEndTime = null;

slider.addEventListener("input", () => {
    valor.textContent = slider.value;
    scrollVelocity = slider.value;
    preempt = (playfieldHeight / (scrollVelocity * (1000/47))) * (intervaloAnimacaoNota / 1000) * 1000;
});
function formatarScore(score) {
    return String(score).padStart(8, '0');
}

function getTempoAtual() {
    return (audioContext.currentTime * 1000) - startTimeAudio;
}

function calcularMetricas() {
    pontuacaoTotal = acertosQtd[1] * 50 + acertosQtd[2] * 100 + acertosQtd[3] * 200 + acertosQtd[4] * 300 + acertosQtd[5] * 300;
    precisao = (pontuacaoTotal / (hitsQtdTotal * 300)) * 100;

    comboDiv.innerHTML = combo;
    accuracyDiv.innerHTML = `${precisao.toFixed(2)}%`;
    scoreDiv.innerHTML = formatarScore(score);
}

function verificarAcerto(coluna, tecla) {
    if (getTempoAtual() < offset - 200) { return; }
    const notas = coluna.querySelectorAll('.nota');
    let acertou = false;
    let considerarInput = false;

    for (let nota of notas) {
        const top = parseInt(nota.style.top);
        const differenceCoefficient = 20;
        const scrollSpeedTolerance = Math.abs((scrollVelocity - 0.94) * differenceCoefficient);
        const distancia = Math.abs(top - zonaDeAcerto);
        if (top <= 175) considerarInput = false;

        if (!nota.classList.contains('acertada') && keyStates[tecla][1] === 'normal') {  // Verifica se a nota já foi acertada
            if (distancia <= 45 + differenceCoefficient) {
                acertou = true;
                considerarInput = true;
                combo++;
                hitImage.src = "";
                nota.classList.add('acertada'); // Marca a nota como acertada
                nota.remove();
                acertosQtd[5]++;
                hitsQtdTotal++;
                score += 320;
                break;
            } else if (distancia <= 60 + differenceCoefficient) {
                acertou = true;
                considerarInput = true;
                combo++;
                hitImage.src = "./assets/skin/300.png";
                nota.classList.add('acertada');
                nota.remove();
                acertosQtd[4]++;
                hitsQtdTotal++;
                score += 300;
                break;
            } else if (distancia <= 75 + differenceCoefficient) {
                acertou = true;
                considerarInput = true;
                combo++;
                hitImage.src = "./assets/skin/200.png";
                nota.classList.add('acertada');
                nota.remove();
                acertosQtd[3]++;
                hitsQtdTotal++;
                score += 200;
                break;
            } else if (distancia <= 90 + differenceCoefficient) {
                acertou = true;
                considerarInput = true;
                combo++;
                hitImage.src = "./assets/skin/100.png";
                nota.classList.add('acertada');
                nota.remove();
                acertosQtd[2]++;
                hitsQtdTotal++;
                score += 100;
                break;
            } else if (distancia <= 125 + differenceCoefficient) {
                acertou = true;
                considerarInput = true;
                combo++;
                hitImage.src = "./assets/skin/50.png";
                nota.classList.add('acertada');
                nota.remove();
                acertosQtd[1]++;
                hitsQtdTotal++;
                score += 50;
                break;
            }
        } else if (!nota.classList.contains('acertada') && keyStates[tecla][1] === 'slider') {
            if (keyStates[tecla][2] <= getTempoAtual() <= keyStates[tecla][2] + 200 && keyStates[tecla][0]) {
                keyStates[tecla][4] = true;
                console.log("segurando");
            }
        }
    }

    if (!considerarInput) {
        return;
    }

    if (!acertou) {
        combo = 0;
        hitImage.src = "./assets/skin/miss.png";
        acertosQtd[0]++;
        hitsQtdTotal++;
    }

    calcularMetricas();
}

function soltarLN(coluna, tecla) {
    if (keyStates[tecla][1] == 'normal' && !keyStates[tecla][4]) {
    }
    const endtime = keyStates[tecla][3];
    const notas = coluna.querySelectorAll('.nota');
    for (let nota of notas) {
    }
    keyStates[tecla][4] = false;
}

//TODO: fzr isso funcionar dps
function pausarGame() {
    gamePause = true;
}

document.addEventListener('keydown', (e) => {
    const tecla = e.key.toLowerCase();
    if (tecla == "escape" && menu.style.display === 'none') {
        pausarGame();
    } else {
        const coluna = document.querySelector(`.column[data-key="${tecla}"]`);
        if (coluna && !keyStates[tecla][0]) {
            keyStates[tecla][0] = true;
            verificarAcerto(coluna, tecla);
            // console.log(keyStates[tecla]);
        }
    }
});
document.addEventListener('keyup', (e) => {
    const tecla = e.key.toLowerCase();
    if (keyStates[tecla] && gameStarted) {
        const coluna = document.querySelector(`.column[data-key="${tecla}"]`);
        keyStates[tecla][0] = false;
        soltarLN(coluna, tecla);
        // console.log(keyStates[tecla]);
    }
});

function spawnarBeatLine() {
    const totalBeats = Math.floor(durationMs / beatInterval);
}

function spawnNota(coluna, notaInfo) {
    let tamanhoLN = 0;
    let tempoLN = 0;
    const nota = document.createElement('div');
    nota.classList.add('nota');
    if (notaInfo.tecla === 's' || notaInfo.tecla === 'k') nota.classList.add('nota1'); // dar uma cor diferente
    if (notaInfo.tipo === 'slider') {
        tempoLN = notaInfo.duracao - notaInfo.tempoOriginal
        tamanhoLN = (tempoLN * scrollVelocity) + 100; // + 50 pelo tamanho das notas normais.
        nota.style.height = `${tamanhoLN}px`;
        nota.style.transform = 'translateY(-100%)';
    } else {
        nota.style.transform = 'translateY(-100%)';
    }

    coluna.appendChild(nota);
    const spawnTime = notaInfo.tempo;

    function mover() {
        if (gamePause) return;
        const tempoAtual = getTempoAtual();
        const tempoRestante = tempoAtual - spawnTime;
        const progresso = tempoRestante / (preempt + tempoLN);  // 0→1
        // Antes do tempo de hitar a nota.
        // if (progresso < 0) {
        //     console.log("progresso negativo")
        //     requestAnimationFrame(mover);
        //     return;
        // }
        // Depois do tempo de hitar a nota.
        if (progresso >= 1) {
            if (!nota.classList.contains('acertada')) {  // Se a nota não foi acertada
                combo = 0;
                hitImage.src = "./assets/skin/miss.png";
                acertosQtd[0]++;
                hitsQtdTotal++;
                calcularMetricas();
            }
            nota.remove();
            return;
        }
        const top = progresso * (playfieldHeight + tamanhoLN);
        nota.style.top = `${top}px`;
        keyStates[notaInfo.tecla][1] = notaInfo.tipo;
        keyStates[notaInfo.tecla][2] = notaInfo.tempoOriginal;
        if (notaInfo.tipo === 'slider') {
            keyStates[notaInfo.tecla][3] = notaInfo.duracao;
        } else {
            keyStates[notaInfo.tecla][3] = notaInfo.tempoOriginal;
        }

        requestAnimationFrame(mover);
    }
    requestAnimationFrame(mover);
}

function gameLoop(timestamp) {
    if (gamePause) return;

    const tempoAtual = getTempoAtual(); // em ms
    progressBar.value = (tempoAtual / mapEndTime) * 100;

    for (const nota of notasParaSpawnar) {
        if (!nota.criada && tempoAtual >= nota.tempo) {
            const coluna = document.querySelector(`.column[data-key="${nota.tecla}"]`);
            console.log(preempt)
            spawnNota(coluna, nota);
            nota.criada = true;
        }
    }

    requestAnimationFrame(gameLoop);
}

async function iniciarJogo(musica, dificuldade) {
    gameStarted = true;
    menu.classList.add('transition');
    setTimeout(() => {
        menu.style.display = 'none';
    }, 600);
    game.classList.add('ativo');

    // Importando as notas da dificuldade.
    fetch(`./maps/${musica.title}/${musica.artist} - ${musica.title} (${musica.creator}) [${dificuldade}].osu`)
        .then(res => res.text())
        .then(osuText => {
            mapa = parseOsuFile(osuText, 4); // 4 lanes
            mapEndTime = mapa[mapa.length-1].tempo;
        });

    carregarMusica(`./maps/${musica.title}/song.mp3`).then(() => {
        document.body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url("./maps/${encodeURIComponent(musica.title)}/bg.jpg")`;

        scoreDiv.innerHTML = formatarScore(score);
        comboDiv.innerHTML = combo;
        accuracyDiv.innerHTML = `${precisao.toFixed(2)}%`;
        bpm = musica.bpm;
        offset = musica.offset;

        startTime = performance.now();

        notasParaSpawnar = mapa.map(nota => {
            const tempoAjustado = nota.tempo - preempt;
            /**
             *  tempo -> Tempo (em ms) que a nota deve aparecer na tela.
             *  tempoOriginal -> Tempo (em ms) em que a nota deve ser pressionada.
            */
            return { ...nota, tempo: tempoAjustado, criada: false, tempoOriginal: nota.tempo };
        });
        setTimeout(() => {
            tocarMusica();
            startTime = performance.now();
            requestAnimationFrame(gameLoop);
        }, DELAY_INICIO_MS);
        //tocarMusica();
        spawnarBeatLine();
        //requestAnimationFrame(gameLoop);
    });
}

const songData = [
    {
        title: "ETERNAL DRAIN",
        artist: "Colorful Sounds Port",
        difficulties: ["Beginner", "Normal", "Hyper", "Another", "Black Another", "Eternal"],
        bpm: 149,
        offset: 4802,
        creator: "Wh1teh"
    },
    {
        title: "HELIX",
        artist: "ESTi",
        difficulties: ["NM", "HD", "MX"],
        bpm: 175,
        offset: 2746,
        creator: "xeona"
    },
    {
        title: "ANiMA",
        artist: "xi",
        difficulties: ["Lv.4", "Lv.9", "Lv.15", "Lv.20", "Lv.24", "lv.30"],
        bpm: 184,
        offset: 1321,
        creator: "Kuo Kyoka"
    }, {
        title: "Metal Crusher",
        artist: "toby fox",
        difficulties: ["Beginner", "Easy", "Normal", "Hard", "Hyper", "Insane", "It's Showtime!"],
        bpm: 116,
        offset: 32,
        creator: "Lumpita"
    }, {
        title: "iLLness LiLin",
        artist: "Kaneko Chiharu",
        difficulties: ["BASIC", "NOVICE", "ADVANCED", "EXHAUST", "MAXIMUM", "HEAVENLY"],
        bpm: 280,
        offset: 930,
        creator: "Fresh Chicken"
    }, {
        title: "Final Boss",
        artist: "Thaehan",
        difficulties: ["First Stage", "Second Stage", "Third Stage", "Final Stage"],
        bpm: 130,
        offset: 100,
        creator: "AHHHHHHHHHHHHHH"
    }
];

const songList = document.getElementById("songList");

songData.forEach((song, index) => {
    const songEl = document.createElement("div");
    songEl.className = "song";
    songEl.innerHTML = `
      <div class="song-title">${song.title}</div>
      <div class="song-artist">${song.artist}</div>
    `;

    const diffList = document.createElement("div");
    diffList.className = "difficulty-list";
    diffList.style.display = "none"; // começa fechado

    song.difficulties.forEach((diff, i) => {
        const diffEl = document.createElement("div");
        diffEl.className = "difficulty";
        diffEl.textContent = diff;
        diffEl.style.animationDelay = `${i * 0.1}s`; // atraso crescente
        diffEl.addEventListener("click", () => {
            iniciarJogo(song, diff);
        });
        diffList.appendChild(diffEl);
    });

    songEl.appendChild(diffList);
    songList.appendChild(songEl);

    songEl.addEventListener("click", (e) => {
        // Evita que o clique em uma dificuldade abra/feche o acordeão
        if (e.target.classList.contains("difficulty")) return;
        const isVisible = diffList.style.display === "block";
        // Fecha todos os outros
        document.querySelectorAll(".difficulty-list").forEach(el => {
            el.style.display = "none";
        });
        // Abre só o atual (se estava fechado)
        diffList.style.display = isVisible ? "none" : "block";
    });
});

/**
 * Easter egg que aparece no console.
 * Tem alguns links de contato de alguns efeitos no texto usando css básico.
 * Essa arte do Badtz Maru foi feita usando ASCII ART.
 */
console.log(
    `%c
                   @@@@          @@@@             
                 @@@@@@@      @@@@@@@             
                @@@@@@@@@    @@@@@@@@             
    @@@@@@@     @@@@@@@@@  @@@@@@@@@@   @@@@@@@   
    @@@@@@@@@  @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@   
     @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@   
     @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@    
      @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@    
      @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@     
       @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@      
      @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@     
      @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@     
     @@@@       @@@    @@@@    @@@       @@@@@    
     @@@               @@@@               @@@@    
     @@@               @@@@              @@@@@    
     @@@@              @@@@              @@@@@    
     @@@@@           @@@@@@@@          @@@@@@     
      @@@@@@      @@@@      @@@@@   @@@@@@@@      
       @@@@@@@@@@@@@         @@@@@@@@@@@@@@       
        @@@@@@@@@@@@         @@@@@@@@@@@@@        
        @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@        
     @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@     
   @@@@@@@@@@@@@@@@@@@@@    @@@@@@@@@@@@@@@@@@@   
  @@@@@@@@@@@@@@@@@@            @@@@@@@@@@@@@@@@  
                                                  
 __     __        _            __  __             _                 
\\ \\   / /__ _ __| |_ _____  _|  \\/  | __ _ _ __ (_) __ _         
 \\ \\ / / _ \\ '__| __/ _ \\ \\/ / |\\/| |/ _\` | '_ \\| |/ _\` |  
  \\ V /  __/ |  | ||  __/>  <| |  | | (_| | | | | | (_| |          
   \\_/ \\___|_|   \\__\\___/_/\\_\\_|  |_|\__,_|_| |_|_|\\__,_|\n`,
    "font-family: monospace; background: linear-gradient(90deg, #ff00cc, #3333ff);-webkit-background-clip: text;-webkit-text-fill-color: transparent;font-weight: bold;"
);
console.log(`%cOlá :) É um prazer encontrar-lo por aqui, entuasiasta de HTML!

Este projeto foi criado apenas por diversão e para fazer alguns testes — nada muito sério por enquanto (eu acho).
MAAAAS... se você curtiu e quer trocar uma ideia ou acompanhar meus outros trabalhos, aqui estão meus links:

😺: https://github.com/IvoJunior0
🧑‍💼: https://www.linkedin.com/in/ivo-junior-a934a8312/
📸: https://www.instagram.com/ivo_jr.s/

Valeu por passar aqui! 👌`, "color: green");