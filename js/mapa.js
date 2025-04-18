const preempt = 1000; // tempo que leva pra nota chegar (ms)
const topMax = 600; // altura da tela
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

let audioContext, audioBuffer, audioSource;
let startTimeAudio = 0;

async function carregarMusica(url) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const resposta = await fetch(url);
    const arrayBuffer = await resposta.arrayBuffer();
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
}

function tocarMusica() {
    audioSource = audioContext.createBufferSource();
    audioSource.buffer = audioBuffer;
    audioSource.connect(audioContext.destination);
    startTimeAudio = audioContext.currentTime * 1000;
    audioSource.start(0);
}

function getTempoAtual() {
    return (audioContext.currentTime * 1000) - startTimeAudio;
}

function spawnNota(notaInfo) {
    const coluna = document.getElementById(`coluna${notaInfo.coluna}`);
    const nota = document.createElement('div');
    nota.classList.add('nota');
    coluna.appendChild(nota);

    function mover() {
        const tempoAtual = getTempoAtual();
        const tempoRestante = notaInfo.tempo - tempoAtual;
        const progresso = 1 - (tempoRestante / preempt);
        const top = progresso * topMax;

        if (progresso >= 1) {
            nota.remove();
            return;
        }

        nota.style.top = `${top}px`;
        requestAnimationFrame(mover);
    }
    requestAnimationFrame(mover);
}

function loopSpawn() {
    const tempoAtual = getTempoAtual();
    for (const nota of mapa) {
        if (!nota.criada && tempoAtual >= nota.tempo - preempt) {
            nota.criada = true;
            spawnNota(nota);
        }
    }
    requestAnimationFrame(loopSpawn);
}

(async () => {
    await carregarMusica('./musica.mp3'); // coloque sua musica.mp3 na mesma pasta
    tocarMusica();
    loopSpawn();
})();