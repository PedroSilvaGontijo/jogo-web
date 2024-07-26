const socket = io();

let playerName; // Armazena o nome do jogador
let room = 'quizRoom'; // Nome fixo da sala para todos os jogadores
let playerScore = 0; // Armazena a pontuação do jogador

// Função para mostrar a tela de quiz
function showQuizScreen() {
    document.getElementById('quizContainer').style.display = 'block';
    document.getElementById('playerInputContainer').style.display = 'none';
}

// Evento de clique para entrar no jogo
document.getElementById('joinButton').onclick = () => {
    playerName = document.getElementById('playerInput').value;
    if (playerName) {
        socket.emit('joinRoom', room, playerName);
        showQuizScreen();
    } else {
        alert('Por favor, insira seu nome.');
    }
};

// Evento para quando um jogador entrar na sala
socket.on('playerJoined', (playerId) => {
    console.log(`Jogador ${playerId} entrou na sala.`);
});

// Atualiza a pontuação exibida
socket.on('updateScores', (scores) => {
    const scoreBoard = document.getElementById('scores');
    // Formata a exibição das pontuações usando os nomes dos jogadores
    scoreBoard.innerHTML = 'Pontuações:<br>' + JSON.stringify(scores, null, 2);
});

// Mostra uma nova pergunta
socket.on('newQuestion', (question) => {
    document.getElementById('question').innerText = question.question;
    const optionsContainer = document.getElementById('options');
    optionsContainer.innerHTML = ''; // Limpa as opções anteriores

    // Adiciona as opções de resposta
    question.options.forEach(option => {
        const button = document.createElement('button');
        button.innerText = option;
        button.onclick = () => {
            // Desabilita todos os botões de resposta
            disableOptions(optionsContainer);
            socket.emit('answer', room, playerName, option); // Envia a resposta para o servidor
        };
        optionsContainer.appendChild(button);
    });
    document.getElementById('nextButton').style.display = 'none'; // Esconde o botão de próxima pergunta
});

// Função para desabilitar as opções de resposta
function disableOptions(container) {
    const buttons = container.getElementsByTagName('button');
    for (let button of buttons) {
        button.disabled = true; // Desabilita o botão
    }
}

// Exibe o botão para passar para a próxima pergunta
socket.on('questionAnswered', () => {
    document.getElementById('nextButton').style.display = 'block';
});

// Função para passar para a próxima pergunta
document.getElementById('nextButton').onclick = () => {
    socket.emit('nextQuestion', room);
};

// Evento para encerrar o quiz
socket.on('endQuiz', (winner) => {
    if (winner) {
        alert(`Quiz terminado! O campeão é ${winner}!`);
    } else {
        alert('Quiz terminado! Não há mais perguntas.');
    }
    resetQuiz();
});

// Função para reiniciar o quiz
function resetQuiz() {
    document.getElementById('quizContainer').style.display = 'none';
    document.getElementById('playerInputContainer').style.display = 'block';
    document.getElementById('playerInput').value = ''; // Limpa o campo de entrada
    document.getElementById('scores').innerHTML = '';
    playerScore = 0; // Reinicia a pontuação do jogador
}
