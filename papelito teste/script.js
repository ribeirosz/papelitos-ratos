'use strict';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'papelitos-save';

const ROUNDS = [
    { title: 'Descrição Livre', rule: 'Fale o que quiser para sua equipe adivinhar, <b>exceto</b> a palavra do papel.' },
    { title: 'Uma Palavra', rule: 'Você pode dizer <b>apenas UMA palavra</b> para dar a dica.' },
    { title: 'Mímica', rule: 'Só gestos! <b>Nenhum som</b> e nenhuma palavra.' },
    { title: 'Apenas Som', rule: 'Só <b>sons e ruídos</b>. Nada de palavras nem gestos.' }
];

let S = newState();
let timerId = null;
let turnEnd = 0;

function newState() {
    return {
        teams: [{ name: '', players: [], score: 0, next: 0 }, { name: '', players: [], score: 0, next: 0 }],
        cfg: { time: 60, wpp: 3, rounds: 3 },
        entryOrder: [], entryIdx: 0,
        allWords: [], pot: [], round: 0, teamIdx: 0, turnPoints: 0, player: ''
    };
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function show(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $(id).classList.add('active');
    window.scrollTo(0, 0);
}

function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} }

/* ---------- TELA 1: SETUP ---------- */
function renderRoster() {
    [0, 1].forEach((t) => {
        const box = $(`team${t + 1}-players`);
        box.innerHTML = '';
        S.teams[t].players.forEach((name, i) => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.textContent = name;
            const x = document.createElement('button');
            x.type = 'button';
            x.textContent = '×';
            x.setAttribute('aria-label', 'Remover ' + name);
            x.onclick = () => { S.teams[t].players.splice(i, 1); renderRoster(); };
            chip.appendChild(x);
            box.appendChild(chip);
        });
    });
}

function addPlayer() {
    const input = $('player-input');
    const name = input.value.trim();
    if (!name) return;
    S.teams[Number($('player-team-select').value)].players.push(name);
    input.value = '';
    input.focus();
    renderRoster();
}

$('btn-add-player').onclick = addPlayer;
$('player-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') addPlayer(); });

$('btn-start-words').onclick = () => {
    if (!S.teams[0].players.length || !S.teams[1].players.length) {
        alert('Cada equipe precisa de pelo menos 1 jogador.');
        return;
    }
    S.teams[0].name = $('team1-name').value.trim() || 'Equipe 1';
    S.teams[1].name = $('team2-name').value.trim() || 'Equipe 2';
    S.cfg = {
        time: Number($('turn-time').value),
        wpp: Number($('words-per-player').value),
        rounds: Number($('total-rounds').value)
    };
    // Intercala jogadores das duas equipes no cadastro
    const order = [];
    const max = Math.max(S.teams[0].players.length, S.teams[1].players.length);
    for (let i = 0; i < max; i++) {
        [0, 1].forEach((t) => {
            if (S.teams[t].players[i]) order.push({ team: t, name: S.teams[t].players[i] });
        });
    }
    S.entryOrder = order;
    S.entryIdx = 0;
    S.allWords = [];
    renderWordEntry();
    show('screen-words');
};

$('btn-resume').onclick = () => {
    try {
        S = JSON.parse(localStorage.getItem(SAVE_KEY));
        showReady();
    } catch (e) {
        alert('Não foi possível carregar a partida salva.');
        clearSave();
    }
};

/* ---------- TELA 2: CADASTRO DE PALAVRAS ---------- */
function renderWordEntry() {
    const p = S.entryOrder[S.entryIdx];
    $('word-entry-team').textContent = S.teams[p.team].name;
    $('word-entry-player').textContent = 'Vez de: ' + p.name;
    const box = $('word-inputs-container');
    box.innerHTML = '';
    for (let i = 0; i < S.cfg.wpp; i++) {
        const inp = document.createElement('input');
        inp.type = 'text';
        inp.className = 'word-input';
        inp.placeholder = `Palavra ${i + 1}`;
        inp.autocomplete = 'off';
        box.appendChild(inp);
    }
    box.firstChild.focus();
    $('btn-submit-words').textContent =
        S.entryIdx === S.entryOrder.length - 1 ? 'Confirmar e Começar o Jogo' : 'Confirmar Palavras e Próximo';
}

$('btn-submit-words').onclick = () => {
    const inputs = [...document.querySelectorAll('.word-input')];
    const words = inputs.map((i) => i.value.trim());
    if (words.some((w) => !w)) {
        alert('Preencha todas as palavras.');
        return;
    }
    S.allWords.push(...words);
    S.entryIdx++;
    if (S.entryIdx < S.entryOrder.length) {
        renderWordEntry();
    } else {
        S.round = 0;
        S.teamIdx = 0;
        S.pot = shuffle(S.allWords);
        showReady();
    }
};

/* ---------- TELA 3: PREPARAR TURNO ---------- */
function showReady() {
    const t = S.teams[S.teamIdx];
    S.player = t.players[t.next % t.players.length];
    const r = ROUNDS[S.round];
    $('sb-team1-name').textContent = S.teams[0].name;
    $('sb-team2-name').textContent = S.teams[1].name;
    $('sb-team1-score').textContent = S.teams[0].score;
    $('sb-team2-score').textContent = S.teams[1].score;
    $('sb-pot-count').textContent = S.pot.length;
    $('ready-round-badge').textContent = `RODADA ${S.round + 1} DE ${S.cfg.rounds}`;
    $('ready-round-title').textContent = r.title;
    $('ready-round-rule').innerHTML = r.rule;
    $('ready-team-name').textContent = t.name;
    $('ready-player-name').textContent = S.player;
    save();
    show('screen-ready');
}

/* ---------- TELA 4: JOGO ---------- */
$('btn-start-turn').onclick = () => {
    S.turnPoints = 0;
    $('play-round-indicator').textContent = 'Rodada ' + (S.round + 1);
    $('play-team-indicator').textContent = S.teams[S.teamIdx].name;
    show('screen-play');
    renderWord();
    turnEnd = Date.now() + S.cfg.time * 1000;
    tick();
    clearInterval(timerId);
    timerId = setInterval(tick, 200);
};

function tick() {
    const left = Math.max(0, Math.ceil((turnEnd - Date.now()) / 1000));
    $('timer-display').textContent = left;
    $('timer-display').classList.toggle('low', left <= 10);
    if (left <= 0) endTurn('Tempo Esgotado!', 'A palavra atual voltou para o pote.');
}

function renderWord() {
    $('current-word-display').textContent = S.pot[0];
    $('play-pot-remaining').textContent = S.pot.length;
    $('turn-hits').textContent = S.turnPoints;
}

$('btn-correct').onclick = () => {
    S.pot.shift();
    S.teams[S.teamIdx].score++;
    S.turnPoints++;
    if (S.pot.length === 0) {
        const last = S.round === S.cfg.rounds - 1;
        endTurn('Rodada concluída!', last ? 'Fim da partida!' : 'O pote esvaziou. Vem aí a próxima rodada.', true);
    } else {
        renderWord();
    }
};

$('btn-foul').onclick = () => endTurn('Queimou a regra!', 'A palavra voltou para o pote e o turno acabou.');

/* ---------- TELA 5: RESUMO ---------- */
function endTurn(title, subtitle, potEmpty = false) {
    clearInterval(timerId);
    S.teams[S.teamIdx].next++;
    $('summary-title').textContent = title;
    $('summary-subtitle').textContent = subtitle;
    $('summary-turn-points').textContent = '+' + S.turnPoints;
    $('sum-team1-name').textContent = S.teams[0].name;
    $('sum-team2-name').textContent = S.teams[1].name;
    $('sum-team1-score').textContent = S.teams[0].score;
    $('sum-team2-score').textContent = S.teams[1].score;

    let gameOver = false;
    if (potEmpty) {
        if (S.round >= S.cfg.rounds - 1) {
            gameOver = true;
        } else {
            S.round++;
            S.pot = shuffle(S.allWords);
        }
    }
    S.teamIdx = 1 - S.teamIdx;

    if (gameOver) {
        const [a, b] = S.teams;
        const result = a.score === b.score ? 'Empate!' : `🏆 ${(a.score > b.score ? a : b).name} venceu!`;
        $('summary-title').textContent = result;
        $('summary-subtitle').textContent = 'Fim da partida. Obrigado por jogar!';
        clearSave();
    } else {
        save();
    }
    $('btn-next-turn').hidden = gameOver;
    $('btn-restart').hidden = !gameOver;
    show('screen-summary');
}

$('btn-next-turn').onclick = showReady;
$('btn-restart').onclick = () => location.reload();

/* ---------- INÍCIO ---------- */
if (localStorage.getItem(SAVE_KEY)) $('btn-resume').hidden = false;
renderRoster();