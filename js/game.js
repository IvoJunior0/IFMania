// TODO: possivelmmente mudar isso dps
let mapa = [
    { tecla: 'a', tempo: 2745 },
    { tecla: 'l', tempo: 2745 },
    { tecla: 's', tempo: 3431 },
    { tecla: 'k', tempo: 4117 },
    { tecla: 'l', tempo: 4803 },
    { tecla: 'a', tempo: 5488 },
    { tecla: 's', tempo: 6174 },
    { tecla: 'k', tempo: 6860 },
    { tecla: 'l', tempo: 7546 },
];

const audio = document.getElementById('musica');
const game = document.getElementById('game');
const menu = document.getElementById('menu');
const velocidade = 10;

// Menor valor que a nota pode chegar
const topMax = 580;
const intervaloAnimacaoNota = 16;

function criarNota(coluna, tempoAparecimento) {
    setTimeout(() => {
        const nota = document.createElement('div');
        nota.classList.add('nota');
        nota.style.top = `${tempoAparecimento >= 0 ? '0' : ''}px`;
        coluna.appendChild(nota);
        animarNota(nota);
    }, tempoAparecimento);
}

function animarNota(nota) {
    let top = 0;
    const interval = setInterval(() => {
        top += velocidade;
        nota.style.top = top + 'px';

        if (top > topMax) {
            nota.remove();
            clearInterval(interval);
        }
    }, intervaloAnimacaoNota);
}

function verificarAcerto(coluna) {
    const notas = coluna.querySelectorAll('.nota');
    for (let nota of notas) {
        const top = parseInt(nota.style.top);
        if (top >= 480 && top <= 570) {
            nota.remove();
            break;
        }
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && menu.style.display !== 'none') {
        iniciarJogo();
    }

    const tecla = e.key.toLowerCase();
    const coluna = document.querySelector(`.column[data-key="${tecla}"]`);
    if (coluna) {
        verificarAcerto(coluna);
    }
});

function iniciarJogo() {
    //menu.style.display = 'none';
    menu.classList.add('transition');
    game.classList.add('ativo');
    audio.play();
    mapa.forEach(nota => {
        const coluna = document.querySelector(`.column[data-key="${nota.tecla}"]`);
        // Transformando o tempo em que a nota deve ser hitada no tempo em que ela aparece na tela.
        // Toda essa equação estranha é basicameente pra calcular (em milesegundos) o tempo em que a nota demora pra sair do topo da tela até o hitbox.
        nota.tempo -= (topMax/velocidade) * (intervaloAnimacaoNota / 1000) * 1000;
        criarNota(coluna, nota.tempo);
    });
}