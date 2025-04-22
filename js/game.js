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

        let tipo = 'normal';
        let duracao = null;

        if ((tipoRaw & 128) > 0) { // nota longa (slider)
            tipo = 'slider';
            duracao = parseInt(parts[5]);
        }

        const nota = {
            tecla,
            tempo,
            tipo,
        };

        if (duracao !== null) {
            nota.duracao = duracao;
        }

        notas.push(nota);
    }

    return notas;
}

let mapa = []
fetch(`./maps/Helix/ESTi - HELIX (xeona) [S.Star's 4K NM].osu`)
    .then(res => res.text())
    .then(osuText => {
        mapa = parseOsuFile(osuText, 4); // 4 lanes 
    });


// Elementos do HTML.
const game = document.getElementById('game');
const menu = document.getElementById('menu');
const comboDiv = document.getElementById('combo');
const hitImage = document.getElementById('maniahit');
const accuracyDiv = document.getElementById('acc');
const scoreDiv = document.getElementById('pontuacao');
const beatline = document.getElementById('beatline');

// TEMPO: 686ms
// Variáveis principais e importantes (e algumas outras nem tanto).
const velocidade = 20;
const zonaDeAcerto = 520;
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

// Variaveis sobre o mapa
// TODO: quando tiver mais mapas, trocar isso por algo definitivamente melhor e menos preguiçoso.
const offset = 2746;
const durationMs = 141133;
const bpm = 175;
const beatInterval = 60000 / bpm;

const playfieldHeight = 600;
const intervaloAnimacaoNota = 16;
const playfields = {
    "a": document.getElementById("playfield-a"),
    "s": document.getElementById("playfield-s"),
    "k": document.getElementById("playfield-k"),
    "l": document.getElementById("playfield-l")
};
// Tecla, tipo da nota e o tempo dela.
const keyStates = {
    "a": [false, "tipo", 0],
    "s": [false, "tipo", 0],
    "k": [false, "tipo", 0],
    "l": [false, "tipo", 0]
};

let preempt = (playfieldHeight / velocidade) * (intervaloAnimacaoNota / 1000) * 1000;
const scrollVelocity = playfieldHeight / 686 // 686 é o tempo em ms que a nota sai do começo e vai até o fim.

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
        const distancia = Math.abs(top - zonaDeAcerto);
        if (top <= 175) considerarInput = false;

        if (!nota.classList.contains('acertada')) {  // Verifica se a nota já foi acertada
            if (distancia <= 45) {
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
            } else if (distancia <= 55) {
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
            } else if (distancia <= 70) {
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
            } else if (distancia <= 87) {
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
            } else if (distancia <= 105) {
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
            if (keyStates[tecla][0]) console.log(keyStates[tecla][2])
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

//TODO: fzr isso funcionar dps
function pausarGame() {
    gamePause = true;
}

// Toda vez que QUALQUER tecla seja pressionada durante o jogo, vai acontecer alguma dessas coisas aqui de baixo.
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && menu.style.display !== 'none' && !gameStarted) {
        iniciarJogo();
        return;
    }
    // tocarSom();
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
        keyStates[tecla][0] = false;
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
        nota.style.marginTop = `${-tamanhoLN}px`;
    } else {
        nota.style.top = `0px`;
    }

    coluna.appendChild(nota);
    const spawnTime = notaInfo.tempo;

    let top = 0;
    function mover() {
        if (gamePause) return;
        const tempoAtual = getTempoAtual();
        const tempoRestante = tempoAtual - spawnTime;
        const progresso = tempoRestante / (preempt + tempoLN);  // 0→1
        // Antes do tempo de hitar a nota.
        if (progresso < 0) {
            requestAnimationFrame(mover);
            return;
        }
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

        requestAnimationFrame(mover);
    }
    requestAnimationFrame(mover);
}

function gameLoop(timestamp) {
    if (gamePause) return;

    const tempoAtual = getTempoAtual(); // em ms

    for (const nota of notasParaSpawnar) {
        if (!nota.criada && tempoAtual >= nota.tempo) {
            const coluna = document.querySelector(`.column[data-key="${nota.tecla}"]`);
            spawnNota(coluna, nota);
            nota.criada = true;
        }
    }

    requestAnimationFrame(gameLoop);
}

async function iniciarJogo() {
    gameStarted = true;
    menu.classList.add('transition');
    setTimeout(() => {
        menu.style.display = 'none';
    }, 600);
    game.classList.add('ativo');

    carregarMusica('./musica.mp3').then(() => {
        tocarMusica();

        scoreDiv.innerHTML = formatarScore(score);
        comboDiv.innerHTML = combo;
        accuracyDiv.innerHTML = `${precisao.toFixed(2)}%`;

        startTime = performance.now();

        notasParaSpawnar = mapa.map(nota => {
            const tempoAjustado = nota.tempo - preempt;
            /**
             *  tempo -> Tempo (em ms) que a nota deve aparecer na tela.
             *  tempoOriginal -> Tempo (em ms) em que a nota deve ser pressionada.
             */
            return { ...nota, tempo: tempoAjustado, criada: false, tempoOriginal: nota.tempo };
        });
        spawnarBeatLine();
        requestAnimationFrame(gameLoop);
    });
}

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
console.log(`%cOlá, é um prazer encontrar-lo por aqui, entuasiasta de HTML!

Este projeto foi criado apenas por diversão e para fazer alguns testes — nada muito sério por enquanto (eu acho).
MAAAAS... se você curtiu e quer trocar uma ideia ou acompanhar meus outros trabalhos, aqui estão meus links:

😺: https://github.com/IvoJunior0
🧑‍💼: https://www.linkedin.com/in/ivo-junior-a934a8312/
📸: https://www.instagram.com/ivo_jr.s/

Valeu por passar aqui! 👌`, "color: green");