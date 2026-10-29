document.addEventListener('DOMContentLoaded', () => {
    const bolo = document.querySelector('.bolo');
    const gato = document.querySelector('.gato');
    const moeda = document.getElementById('moeda');
    const gameBoard = document.getElementById('game-board');
    const hudPlayerName = document.getElementById('hud-player-name');
    const scoreDisplay = document.getElementById('score-display');
    const jumpTip = document.getElementById('jump-tip');

    const startModal = document.getElementById('start-modal');
    const startForm = document.getElementById('start-form');
    const playerInput = document.getElementById('player-input');
    const btnViewRanking = document.getElementById('btn-view-ranking');

    const gameoverModal = document.getElementById('gameover-modal');
    const finalScoreValue = document.getElementById('final-score-value');
    const saveStatusMsg = document.getElementById('save-status-msg');
    const rankingBody = document.getElementById('ranking-body');
    const btnRestart = document.getElementById('btn-restart');
    const btnChangePlayer = document.getElementById('btn-change-player');

    let currentPlayer = '';
    let score = 0;
    let isPlaying = false;
    let gameLoop = null;
    let scoreLoop = null;

    // Controla se a moeda atual já foi coletada na rodada
    let moedaColetada = false;

    const savedName = localStorage.getItem('gato_jump_player');
    if (savedName && playerInput) {
        playerInput.value = savedName;
    }

    function startGame() {
        clearInterval(gameLoop);
        clearInterval(scoreLoop);

        resetElements();

        isPlaying = true;
        score = 0;
        scoreDisplay.textContent = '0';
        hudPlayerName.textContent = currentPlayer || 'Jogador';

        gameBoard.classList.add('running');

        // Incremento contínuo de pontos por tempo
        scoreLoop = setInterval(() => {
            if (isPlaying) {
                score += 1;
                scoreDisplay.textContent = score;
            }
        }, 100);

        // Loop principal de física (colisão com obstáculo e coleta de moeda)
        gameLoop = setInterval(() => {
            checkCollision();
            checkCoinCollection();
        }, 10);
    }

    function resetElements() {
        bolo.style.animation = '';
        bolo.style.left = '';

        gato.src = 'assets/gato.gif';
        gato.style.animation = '';
        gato.style.bottom = '0px';
        gato.style.width = '';
        gato.style.marginLeft = '';
        gato.classList.remove('jump');

        if (moeda) {
            moeda.style.animation = '';
            moeda.style.display = 'flex';
            moedaColetada = false;
        }

        if (jumpTip) {
            jumpTip.style.opacity = '1';
        }
    }

    function jump() {
        if (!isPlaying) return;
        if (gato.classList.contains('jump')) return;

        gato.classList.add('jump');

        if (jumpTip) {
            jumpTip.style.opacity = '0';
        }

        setTimeout(() => {
            gato.classList.remove('jump');
        }, 500);
    }

    // Checa colisão fatal com o bolo
    function checkCollision() {
        if (!isPlaying) return;

        const boloPosition = bolo.offsetLeft;
        const gatoPosition = +window.getComputedStyle(gato).bottom.replace('px', '');

        if (boloPosition <= 120 && boloPosition > 0 && gatoPosition <= 70) {
            triggerGameOver(boloPosition, gatoPosition);
        }
    }

    // Checa se o personagem cruzou com a moeda para coletá-la
    function checkCoinCollection() {
        if (!isPlaying || moedaColetada || !moeda) return;

        const moedaPosition = moeda.offsetLeft;
        const gatoPosition = +window.getComputedStyle(gato).bottom.replace('px', '');

        // Reseta a permissão de coleta quando a moeda reaparece na direita
        if (moedaPosition > gameBoard.offsetWidth - 60) {
            moedaColetada = false;
            moeda.style.display = 'flex';
        }

        // Posição de colisão entre o gato e a moeda
        if (moedaPosition <= 120 && moedaPosition >= 50 && gatoPosition >= 70) {
            moedaColetada = true;
            moeda.style.display = 'none'; // Esconde a moeda coletada
            
            // Bônus de pontuação ao coletar
            score += 10;
            scoreDisplay.textContent = score;
        }
    }

    function triggerGameOver(boloPosition, gatoPosition) {
        isPlaying = false;
        clearInterval(gameLoop);
        clearInterval(scoreLoop);

        gameBoard.classList.remove('running');

        bolo.style.animation = 'none';
        bolo.style.left = `${boloPosition}px`;

        if (moeda) {
            const moedaPos = moeda.offsetLeft;
            moeda.style.animation = 'none';
            moeda.style.left = `${moedaPos}px`;
        }

        gato.style.animation = 'none';
        gato.style.bottom = `${gatoPosition}px`;
        gato.src = 'assets/game-over.png';
        gato.style.width = '75px';
        gato.style.marginLeft = '50px';

        finalScoreValue.textContent = score;
        saveStatusMsg.textContent = 'Salvando pontuação no banco...';
        saveStatusMsg.style.color = '#ffcc00';

        gameoverModal.classList.add('active');

        saveScore(currentPlayer, score);
    }

    function saveScore(playerName, finalScore) {
        fetch('salvar_ranking.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: playerName,
                pontos: finalScore
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                saveStatusMsg.textContent = 'Pontuação registrada no banco!';
                saveStatusMsg.style.color = '#10b981';
                if (data.ranking) {
                    renderRanking(data.ranking, playerName, finalScore);
                }
            } else {
                saveStatusMsg.textContent = '⚠️ ' + (data.message || 'Erro ao registrar.');
                saveStatusMsg.style.color = '#ef4444';
            }
        })
        .catch(err => {
            console.error('Erro na requisição:', err);
            saveStatusMsg.textContent = '⚠️ Erro ao conectar ao servidor Laragon.';
            saveStatusMsg.style.color = '#ef4444';
        });
    }

    function fetchRanking() {
        fetch('obter_ranking.php')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.ranking) {
                    renderRanking(data.ranking);
                }
            })
            .catch(err => console.error('Erro ao buscar ranking:', err));
    }

    function renderRanking(list, highlightName = null, highlightScore = null) {
        if (!rankingBody) return;
        rankingBody.innerHTML = '';

        if (!list || list.length === 0) {
            rankingBody.innerHTML = '<tr><td colspan="3" class="loading-cell">Nenhuma pontuação gravada ainda. Jogue para ser o 1º!</td></tr>';
            return;
        }

        let highlighted = false;

        list.forEach((item, index) => {
            const tr = document.createElement('tr');

            if (!highlighted && highlightName && item.nome === highlightName && parseInt(item.pontos, 10) === highlightScore) {
                tr.classList.add('highlight-current');
                highlighted = true;
            }

            let medal = `${index + 1}º`;
            if (index === 0) medal = '🥇 1º';
            else if (index === 1) medal = '🥈 2º';
            else if (index === 2) medal = '🥉 3º';

            tr.innerHTML = `
                <td class="ranking-pos">${medal}</td>
                <td><strong>${escapeHtml(item.nome)}</strong></td>
                <td>${parseInt(item.pontos, 10)} pts</td>
            `;

            rankingBody.appendChild(tr);
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    startForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameValue = playerInput.value.trim();
        if (!nameValue) {
            playerInput.focus();
            return;
        }

        currentPlayer = nameValue;
        localStorage.setItem('gato_jump_player', currentPlayer);

        startModal.classList.remove('active');
        startGame();
    });

    btnViewRanking.addEventListener('click', () => {
        fetchRanking();
        finalScoreValue.textContent = '---';
        saveStatusMsg.textContent = '';
        startModal.classList.remove('active');
        gameoverModal.classList.add('active');
    });

    btnRestart.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        if (!currentPlayer) {
            startModal.classList.add('active');
            playerInput.focus();
        } else {
            startGame();
        }
    });

    btnChangePlayer.addEventListener('click', () => {
        gameoverModal.classList.remove('active');
        resetElements();
        startModal.classList.add('active');
        playerInput.value = '';
        playerInput.focus();
    });

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.key === ' ' || e.code === 'ArrowUp') {
            if (isPlaying) {
                e.preventDefault();
                jump();
            }
        }
    });
});