const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const questions = require('./questions');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let rooms = {};

// Função para embaralhar perguntas
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

io.on('connection', (socket) => {
    console.log('Um jogador se conectou:', socket.id);

    socket.on('joinRoom', (room, playerName) => {
        socket.join(room);
        if (!rooms[room]) {
            rooms[room] = { players: [], scores: {}, currentQuestion: 0, responses: {}, quizStarted: false };
        }
        rooms[room].players.push({ id: socket.id, name: playerName });
        rooms[room].scores[playerName] = 0; // Armazena a pontuação pelo nome

        socket.to(room).emit('playerJoined', playerName);
        io.to(room).emit('updateScores', rooms[room].scores);

        // Embaralha as perguntas quando a sala é criada
        if (rooms[room].players.length === 1) {
            rooms[room].shuffledQuestions = shuffleArray([...questions]); // Embaralha as perguntas
            // Inicia o cronômetro de 30 segundos
            setTimeout(() => {
                startQuiz(room);
            }, 15000); // 15 segundos
        }
    });

    socket.on('answer', (room, playerName, answer) => {
        // Verifica se a sala e a pergunta atual existem
        if (rooms[room] && rooms[room].currentQuestion < rooms[room].shuffledQuestions.length) {
            const correctAnswer = rooms[room].shuffledQuestions[rooms[room].currentQuestion].correctAnswer;

            // Armazena a resposta do jogador
            rooms[room].responses[playerName] = answer;

            // Verifica se o jogador acertou
            if (answer === correctAnswer) {
                rooms[room].scores[playerName]++; // Adiciona ponto ao jogador usando o nome
                // Verifica se o jogador alcançou 10 pontos
                if (rooms[room].scores[playerName] === 10) {
                    io.to(room).emit('endQuiz', playerName); // Encerra o quiz e declara o campeão
                    delete rooms[room]; // Remove a sala após o término
                    return; // Para não processar mais a resposta
                }
            }

            // Notifica todos os jogadores sobre a resposta
            io.to(room).emit('updateScores', rooms[room].scores);

            // Verifica se todos responderam
            if (Object.keys(rooms[room].responses).length === rooms[room].players.length) {
                rooms[room].currentQuestion++; // Avança para a próxima pergunta
                rooms[room].responses = {}; // Reseta as respostas para a próxima pergunta
                if (rooms[room].currentQuestion < rooms[room].shuffledQuestions.length) {
                    io.to(room).emit('newQuestion', rooms[room].shuffledQuestions[rooms[room].currentQuestion]);
                } else {
                    io.to(room).emit('endQuiz', null); // Se não houver mais perguntas, termina o quiz
                    delete rooms[room]; // Remove a sala após o término
                }
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('Um jogador se desconectou:', socket.id);
        // Remover o jogador da sala e atualizar as informações
        for (const room in rooms) {
            const playerIndex = rooms[room].players.findIndex(player => player.id === socket.id);
            if (playerIndex !== -1) {
                const playerName = rooms[room].players[playerIndex].name; // Obtém o nome do jogador
                rooms[room].players.splice(playerIndex, 1);
                delete rooms[room].scores[playerName]; // Remove a pontuação pelo nome
                delete rooms[room].responses[playerName]; // Remove a resposta do jogador
                io.to(room).emit('updateScores', rooms[room].scores);
                if (rooms[room].players.length === 0) {
                    delete rooms[room]; // Remove a sala se não houver mais jogadores
                }
                break;
            }
        }
    });
});

function startQuiz(room) {
    rooms[room].quizStarted = true; // Indica que o quiz começou
    io.to(room).emit('newQuestion', rooms[room].shuffledQuestions[0]);
}

server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
