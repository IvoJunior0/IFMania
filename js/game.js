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
function parseMapa(str) {
    const teclas = ['a', 's', 'k', 'l'];
    return str.split(',').map(par => {
        const partes = par.split('|');
        const tempo = +partes[0];
        const tecla = teclas[+partes[1]];

        // Verifica se é slider
        if (partes[2]?.startsWith('s:')) {
            const duracao = +partes[2].split(':')[1];
            return {
                tecla,
                tempo,
                tipo: 'slider',
                duracao
            };
        }

        // Nota comum
        return {
            tecla,
            tempo,
            tipo: 'normal'
        };
    });
}
// FIXME: Esse é só o de Helix, dps criar outros arquivos com as notas e os ms de cada nota.
const mapaStr = "2745|1,3088|2,3088|3,3431|0,4117|2,4803|3,5488|1,6174|2,6860|0,7546|0,7888|2,8060|1,8231|3,8574|2,8917|0,9260|1,9603|2,9946|3,10288|1,10631|0,10974|1,11146|2,11317|1,11488|2,11660|3,11831|0,12003|3,12174|0,12346|2,12517|3,12688|1,12860|2,13031|0|s:13374,13374|3,13717|1,14060|3,14403|0,14746|2,15088|3,15431|0,15774|2,16117|1,16460|0,16803|3,17146|1,17488|2,17831|3,18174|0,18517|3,18860|1,19031|2,19203|3,19546|0,19888|2,20231|1,20574|3,20917|2,21603|0,21946|3,22288|2,22631|1,22974|2,23317|0,23660|3,24003|0,24346|2,24688|2,25031|0,25374|1,25717|3,26060|2,26231|1,26403|2,26574|1,26746|3,26917|0,27088|3,27260|0,27431|2,27774|1,27946|2,28288|0,28460|2,28803|0,28974|1,29146|3,29317|2,29488|1,29660|0,29831|3,30003|2,30174|1|s:30860,30860|3|s:31584,32231|1,32917|1,33260|2,33431|1,33774|1,33946|2,34288|0,34460|1,34631|2,34803|3,34974|1,35146|3,35317|1,35488|3,35660|0|s:36003,36174|2|s:36517,36688|3|s:37031,37031|1,37374|0,37546|2,37717|0,37888|2,38060|1,38231|3,38403|0|s:38746,38917|3|s:39260,39431|1|s:39774,39774|2,40117|3,40288|0,40460|3,40631|0,40803|2,40974|1,41146|2,41488|3,41660|0,42003|2,42346|2,42517|3,42688|2,42860|1,43031|0,43203|2,43374|3,43546|1,43717|2,43888|0|s:44231,44403|1|s:44746,44917|0|s:45260,45260|3,45431|1,45603|0,45774|2,45946|3,46117|0,46288|1,46460|0,46631|1|s:46974,47146|0|s:47488,47660|3|s:48003,48003|2,48174|0,48346|1,48517|0,48688|1,48860|0,49031|3,49203|0,49374|3|s:49717,49888|0|s:50231,50403|0|s:50746,50746|2,50917|1,51088|2,51260|0,51431|1,51603|1,51774|0,51946|0,52117|3|s:52460,52460|0|s:52631,52974|1,53317|0|s:53488,53488|2,53660|0,53831|1,54003|2,54174|1|s:54860,54860|2";
const mapa = parseMapa(mapaStr);

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

    for (let nota of notas) {
        const top = parseInt(nota.style.top);
        const distancia = Math.abs(top - zonaDeAcerto);
        
        // TODO: distancia variar dependendo da dificuldade.
        if (!nota.classList.contains('acertada')) {  // Verifica se a nota já foi acertada
            if (distancia <= 45) {
                acertou = true;
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
                combo++;
                hitImage.src = "./assets/skin/50.png";
                nota.classList.add('acertada');
                nota.remove();
                acertosQtd[1]++;
                hitsQtdTotal++;
                score += 50;
                break;
            }
        }
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
    console.log(totalBeats);
}

function spawnNota(coluna, notaInfo) {
    let tamanhoLN = 0;
    let tempoLN = 0;
    const nota = document.createElement('div');
    nota.classList.add('nota');
    if (notaInfo.tecla === 's' || notaInfo.tecla === 'k') nota.classList.add('nota1'); // dar uma cor diferente
    if (notaInfo.tipo === 'slider') {
        tempoLN = notaInfo.duracao - notaInfo.tempoOriginal
        tamanhoLN = (tempoLN * scrollVelocity) + 50; // + 50 pelo tamanho das notas normais.
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
        if (progresso < 0) {
            // ainda não chegou a hora de aparecer
            requestAnimationFrame(mover);
            return;
        }
        // passou da hora
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
        // posição em px, 0 no topo → topMax no hit zone
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