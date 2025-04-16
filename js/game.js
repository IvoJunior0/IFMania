let audioContext = new (window.AudioContext || window.webkitAudioContext)();
let buffer = null;

// Carregar o som uma vez.
fetch("./assets/hit.wav")
    .then(res => res.arrayBuffer())
    .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
    .then(decoded => buffer = decoded);

function tocarSom() {
    if (!buffer) return;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
}

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
const mapaStr = "2745|1,3431|0,4117|2,4803|3,5488|1,6174|2,6860|0,7546|0,7888|2,8060|1,8231|3,8574|2,8917|0,9260|1,9603|2,9946|3,10288|1,10631|0,10974|1,11146|2,11317|1,11488|2,11660|3,11831|0,12003|3,12174|0,12346|2,12517|3,12688|1,12860|2,13031|0|s:343";
const mapa = parseMapa(mapaStr);

// Elementos do HTML.
const audio = document.getElementById('musica');
const game = document.getElementById('game');
const menu = document.getElementById('menu');
const comboDiv = document.getElementById('combo');
const hitsound = document.getElementById('hit');
const hitImage = document.getElementById('maniahit');

// Variáveis principais e importantes (e algumas outras nem tanto).
const velocidade = 20;
const zonaDeAcerto = 540;
const offset = 2746;
let gamePause = false;
let combo = 0;

// Menor valor que a nota pode chegar
const topMax = 600;
const intervaloAnimacaoNota = 16;

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
            break;
        } else if (distancia <= 50) {
            acertou = true;
            combo++;
            hitImage.src = "./assets/skin/200.png";
            nota.remove();
            break;
        } else if (distancia <= 78) {
            acertou = true;
            combo++;
            hitImage.src = "./assets/skin/100.png";
            nota.remove();
            break;
        } else if (distancia <= 99) {
            acertou = true;
            combo++;
            hitImage.src = "./assets/skin/50.png";
            nota.remove();
            break;
        }
    }

    if (!acertou) {
        combo = 0;
        hitImage.src = "./assets/skin/miss.png";
    }

    comboDiv.innerHTML = combo;
}

//TODO: fzr isso funcionar dps
function pausarGame() {
    gamePause = true;
}

// Toda vez que QUALQUER tecla seja pressionada durante o jogo, vai acontecer alguma dessas coisas aqui de baixo.
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && menu.style.display !== 'none') {
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

function iniciarJogo() {
    menu.classList.add('transition');
    setTimeout(() => {
        menu.style.display = 'none';
    }, 600);
    game.classList.add('ativo');
    audio.play();
    comboDiv.innerHTML = combo;
    mapa.forEach(nota => {
        const coluna = document.querySelector(`.column[data-key="${nota.tecla}"]`);
        // Transformando o tempo em que a nota deve ser hitada no tempo em que ela aparece na tela.
        // Toda essa equação estranha é basicameente pra calcular (em milesegundos) o tempo em que a nota demora pra sair do topo da tela até o hitbox.
        nota.tempo -= (topMax / velocidade) * (intervaloAnimacaoNota / 1000) * 1000;
        criarNota(coluna, nota.tempo, nota.tecla);
    });
}