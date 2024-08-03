const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const questions = require("./questions.js");
const words = require("./words.js");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let quizRoom = {
  players: {},
  scores: {},
  questions: questions,
  currentQuestion: 0,
};

let calangoRoom = {
  players: {},
  scores: {},
  currentWord: "",
  calango: "",
  attempts: 0,
  maxAttempts: 5,
  words: words,
  responses: {},
  votes: {},
};

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  socket.on("joinRoom", (room, playerName) => {
    socket.join(room);
    if (room === "quizRoom") {
      quizRoom.players[socket.id] = playerName;
      quizRoom.scores[playerName] = 0;
      io.to(room).emit("playerJoined", playerName);
      if (Object.keys(quizRoom.players).length === 1) {
        io.to(room).emit(
          "newQuestion",
          quizRoom.questions[quizRoom.currentQuestion]
        );
      }
    } else if (room === "calangoRoom") {
      calangoRoom.players[socket.id] = playerName;
      calangoRoom.scores[playerName] = 0;
      io.to(room).emit("playerJoined", playerName);
      if (Object.keys(calangoRoom.players).length === 1) {
        startCalangoGame(room);
      }
    }
  });

  socket.on("answer", (room, playerName, answer) => {
    if (room === "quizRoom") {
      const currentQuestion = quizRoom.questions[quizRoom.currentQuestion];
      if (currentQuestion.correctOption === answer) {
        quizRoom.scores[playerName]++;
      }
      io.to(room).emit("updateScores", quizRoom.scores);
      io.to(room).emit("questionAnswered");
    }
  });

  socket.on("nextQuestion", (room) => {
    if (room === "quizRoom") {
      quizRoom.currentQuestion++;
      if (quizRoom.currentQuestion < quizRoom.questions.length) {
        io.to(room).emit(
          "newQuestion",
          quizRoom.questions[quizRoom.currentQuestion]
        );
      } else {
        const champion = Object.keys(quizRoom.scores).reduce((a, b) =>
          quizRoom.scores[a] > quizRoom.scores[b] ? a : b
        );
        io.to(room).emit("endQuiz", champion);
      }
    }
  });

  socket.on("submitQuestion", (room, playerName, question) => {
    if (room === "calangoRoom") {
      io.to(room).emit("newQuestion", question);
    }
  });

  socket.on("submitAnswer", (room, playerName, answer) => {
    if (room === "calangoRoom") {
      calangoRoom.responses[playerName] = answer;
      if (
        Object.keys(calangoRoom.responses).length ===
        Object.keys(calangoRoom.players).length - 1
      ) {
        io.to(room).emit("displayResponses", calangoRoom.responses);
        calangoRoom.responses = {};
      }
    }
  });

  socket.on("vote", (room, playerName, votedPlayer) => {
    if (room === "calangoRoom") {
      if (!calangoRoom.votes[votedPlayer]) {
        calangoRoom.votes[votedPlayer] = 0;
      }
      calangoRoom.votes[votedPlayer]++;
      if (
        Object.keys(calangoRoom.votes).length ===
        Object.keys(calangoRoom.players).length - 1
      ) {
        const calango = Object.keys(calangoRoom.votes).reduce((a, b) =>
          calangoRoom.votes[a] > calangoRoom.votes[b] ? a : b
        );
        if (calango === calangoRoom.calango) {
          io.to(room).emit("calangoRevealed", true, calango);
          resetCalangoGame(room);
        } else {
          io.to(room).emit("calangoRevealed", false, calangoRoom.calango);
          calangoRoom.attempts++;
          if (calangoRoom.attempts >= calangoRoom.maxAttempts) {
            io.to(room).emit("gameOver", calangoRoom.calango);
            resetCalangoGame(room);
          } else {
            io.to(room).emit("nextRound");
          }
        }
        calangoRoom.votes = {};
      }
    }
  });

  socket.on("disconnect", () => {
    handleDisconnect(socket);
  });
});

function startCalangoGame(room) {
  calangoRoom.currentWord =
    calangoRoom.words[Math.floor(Math.random() * calangoRoom.words.length)];
  const players = Object.keys(calangoRoom.players);
  calangoRoom.calango = players[Math.floor(Math.random() * players.length)];
  calangoRoom.attempts = 0;
  io.to(room).emit("calangoAssigned", calangoRoom.calango);
  io.to(room).emit("newWord", calangoRoom.currentWord);
}

function resetCalangoGame(room) {
  calangoRoom.currentWord = "";
  calangoRoom.calango = "";
  calangoRoom.attempts = 0;
  calangoRoom.responses = {};
  calangoRoom.votes = {};
  io.to(room).emit("resetGame");
}

function handleDisconnect(socket) {
  let playerName;

  if (quizRoom.players[socket.id]) {
    playerName = quizRoom.players[socket.id];
    delete quizRoom.players[socket.id];
    delete quizRoom.scores[playerName];
    io.to("quizRoom").emit("playerLeft", playerName);
  }

  if (calangoRoom.players[socket.id]) {
    playerName = calangoRoom.players[socket.id];
    delete calangoRoom.players[socket.id];
    delete calangoRoom.scores[playerName];
    io.to("calangoRoom").emit("playerLeft", playerName);

    if (calangoRoom.calango === socket.id) {
      resetCalangoGame("calangoRoom");
    }
  }
}

server.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
