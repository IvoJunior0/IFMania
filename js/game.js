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
const mapaStr = "2745|1,3431|0,4117|2,4803|3,5488|1,6174|2,6860|0,7546|0,7888|2,8060|1,8231|3,8574|2,8917|0,9260|1,9603|2,9946|3,10288|1,10631|0,10974|1,11146|2,11317|1,11488|2,11660|3,11831|0,12003|3,12174|0,12346|2,12517|3,12688|1,12860|2,13031|0|s:13374,13717|1,14060|3,14403|0,14746|2,15088|3,15431|0,15774|2,16117|1,16460|0,16803|3,17146|1,17488|2,17831|3,18174|0,18517|3,18860|1,19031|2,19203|3,19546|0,19888|2,20231|1,20574|3,20917|2,21603|0,21946|3,22288|2,22631|1,22974|2,23317|0,23660|3,24003|0,24346|2,24688|2,25031|0,25374|1,25717|3,26060|2,26231|1,26403|2,26574|1,26746|3,26917|0,27088|3,27260|0,27431|2,27774|1,27946|2,28288|0,28460|2,28803|0,28974|1,29146|3,29317|2,29488|1,29660|0,29831|3,30003|2";
const mapa = parseMapa(mapaStr);

// Elementos do HTML.
const game = document.getElementById('game');
const menu = document.getElementById('menu');
const comboDiv = document.getElementById('combo');
const hitImage = document.getElementById('maniahit');
const accuracyDiv = document.getElementById('acc');
const beatline = document.getElementById('beatline');

// TEMPO: 686ms
// Variáveis principais e importantes (e algumas outras nem tanto).
const velocidade = 20;
const zonaDeAcerto = 540;
let gameStarted = false;
let gamePause = false;

let combo = 0;
let acertosQtd = [0, 0, 0, 0, 0, 0]; // Cada index representa os misses, 50, 100, 200, 300 e 320 respectivamente.
let hitsQtdTotal = 0;

let pontuacaoTotal = 0;
let precisao = 100;

let startTime = null;
let notasParaSpawnar = [];

// Variaveis sobre o mapa
// TODO: quando tiver mais mapas, trocar isso por algo definitivamente melhor e menos preguiçoso.
const offset = 2746;
const beatmapTotalTime = 141133;
const bpm = 175;

// Menor valor que a nota pode chegar
const topMax = 600;
const intervaloAnimacaoNota = 16;

const preempt = (topMax / velocidade) * (intervaloAnimacaoNota / 1000) * 1000;
const scrollVelocity = topMax / 686 // 686 é o tempo em ms que a nota sai do começo e vai até o fim

function getTempoAtual() {
    return (audioContext.currentTime * 1000) - startTimeAudio;
}

function criarNota(coluna, tempoAparecimento, tecla) {
    setTimeout(() => {
        const nota = document.createElement('div');
        nota.classList.add('nota');
        if (tecla === 's' || tecla === 'k') nota.classList.add('nota1');
        nota.style.top = `${tempoAparecimento >= 0 ? '0' : ''}px`;
        coluna.appendChild(nota);
        animarNota(nota);
    }, tempoAparecimento);
}

function animarNota(nota) {
    let top = 0;
    function animarNota() {
        top += velocidade;
        nota.style.top = top + 'px';
    
        if (top > topMax) {
            nota.remove();
            return;
        }
    
        requestAnimationFrame(animarNota);
    }
    requestAnimationFrame(animarNota);
}

function verificarAcerto(coluna) {
    const notas = coluna.querySelectorAll('.nota');
    let acertou = false;

    for (let nota of notas) {
        const top = parseInt(nota.style.top);
        const distancia = Math.abs(top - zonaDeAcerto);

        // TODO: distancia variar dependendo da dificuldade.
        if (distancia <= 30) {
            acertou = true;
            combo++;
            hitImage.src = "./assets/skin/300.png";
            nota.remove();
            acertosQtd[5]++;
            //pontuacaoTotal += acertosQtd[5] * 320;
            hitsQtdTotal++;
            break;
        } else if (distancia <= 40) {
            acertou = true;
            combo++;
            hitImage.src = "./assets/skin/300.png";
            nota.remove();
            acertosQtd[4]++;
            //pontuacaoTotal += acertosQtd[4] * 300;
            hitsQtdTotal++;
            break;
        } else if (distancia <= 55) {
            acertou = true;
            combo++;
            hitImage.src = "./assets/skin/200.png";
            nota.remove();
            acertosQtd[3]++;
            //pontuacaoTotal += acertosQtd[3] * 200;
            hitsQtdTotal++;
            break;
        } else if (distancia <= 72) {
            acertou = true;
            combo++;
            hitImage.src = "./assets/skin/100.png";
            nota.remove();
            acertosQtd[2]++;
            //pontuacaoTotal += acertosQtd[2] * 100;
            hitsQtdTotal++;
            break;
        } else if (distancia <= 90) {
            acertou = true;
            combo++;
            hitImage.src = "./assets/skin/50.png";
            nota.remove();
            acertosQtd[1]++;
            //pontuacaoTotal += acertosQtd[1] * 50;
            hitsQtdTotal++;
            break;
        }
    }

    if (!acertou) {
        combo = 0;
        hitImage.src = "./assets/skin/miss.png";
        acertosQtd[0]++;
        hitsQtdTotal++;
    }

    pontuacaoTotal = acertosQtd[1] * 50 + acertosQtd[2] * 100 + acertosQtd[3] * 200 + acertosQtd[4] * 300 + acertosQtd[5] * 300;
    precisao = (pontuacaoTotal / (hitsQtdTotal * 300)) * 100;

    comboDiv.innerHTML = combo;
    accuracyDiv.innerHTML = `${precisao.toFixed(2)}%`;
}

//TODO: fzr isso funcionar dps
function pausarGame() {
    gamePause = true;
}

// Toda vez que QUALQUER tecla seja pressionada durante o jogo, vai acontecer alguma dessas coisas aqui de baixo.
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && menu.style.display !== 'none' && !gameStarted) {
        iniciarJogo();
    }
    // tocarSom();
    const tecla = e.key.toLowerCase();
    if (tecla == "escape" && menu.style.display === 'none') {
        pausarGame();
    } else {
        const coluna = document.querySelector(`.column[data-key="${tecla}"]`);
        if (coluna) { verificarAcerto(coluna); }
    }
});

document.addEventListener('keyup', (e) => {
    if (gameStarted) {}
});

function spawnarBeatLine() {
    let bottom = 0;
    function animarBeatline() {
        bottom -= velocidade;
        beatline.style.bottom = bottom + 'px';
    
        if (bottom > topMax) {
            beatline.remove();
            console.log("foi");
            return;
        }
    
        requestAnimationFrame(animarBeatline);
    }
    requestAnimationFrame(animarBeatline);
}

function spawnNota(coluna, notaInfo) {
    const nota = document.createElement('div');
    nota.classList.add('nota');
    if (notaInfo.tecla === 's' || notaInfo.tecla === 'k') nota.classList.add('nota1'); // dar uma cor diferente
    if (notaInfo.tipo === 'slider') {
        const duracao = (notaInfo.duracao - notaInfo.tempoOriginal) * scrollVelocity;

        // const sliderSize = Math.round((duracao / preempt) * topMax);
        nota.style.height = `${duracao}px`;
        nota.style.top = `0px`;
    } else {
        nota.style.top = `0px`;
    }

    coluna.appendChild(nota);
    const spawnTime = notaInfo.tempo - preempt;

    let top = 0;
    function mover() {
        if (gamePause) return;
        top += velocidade;
        nota.style.top = `${top}px`;

        if (top > topMax) {
            nota.remove();
            return;
        }
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
    await carregarMusica('./musica.mp3');
    tocarMusica();
    comboDiv.innerHTML = combo;

    startTime = Math.round(performance.now());

    notasParaSpawnar = mapa.map(nota => {
        const tempoAjustado = nota.tempo - preempt;
        return { ...nota, tempo: tempoAjustado, criada: false, tempoOriginal: nota.tempo };
    });
    requestAnimationFrame(gameLoop);
    // mapa.forEach(nota => {
    //     const coluna = document.querySelector(`.column[data-key="${nota.tecla}"]`);
    //     // Transformando o tempo em que a nota deve ser hitada no tempo em que ela aparece na tela.
    //     // Toda essa equação estranha é basicameente pra calcular (em milesegundos) o tempo em que a nota demora pra sair do topo da tela até o hitbox.
    //     nota.tempo -= (topMax / velocidade) * (intervaloAnimacaoNota / 1000) * 1000;
    //     criarNota(coluna, nota.tempo, nota.tecla);
    // });
}