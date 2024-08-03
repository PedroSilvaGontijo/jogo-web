const socket = io("http://localhost:3000");

const gameContainer = document.getElementById("gameContainer");
const wordElement = document.getElementById("word");
const questionContainer = document.getElementById("questionContainer");
const questionInput = document.getElementById("questionInput");
const submitQuestionButton = document.getElementById("submitQuestion");
const answersContainer = document.getElementById("answersContainer");
const askedQuestionElement = document.getElementById("askedQuestion");
const answersElement = document.getElementById("answers");
const voteButton = document.getElementById("voteButton");
const scoresElement = document.getElementById("scores");
const countdownElement = document.getElementById("countdown");

let room = "default";
let playerName = localStorage.getItem("playerName");

if (playerName) {
  socket.emit("joinRoom", room, playerName);
  gameContainer.style.display = "block";
}

socket.on("playerJoined", (name) => {
  scoresElement.innerHTML += `<p>${name} entrou na sala!</p>`;
});

socket.on("updateScores", (scores) => {
  scoresElement.innerHTML = "<h3>Pontuações:</h3>";
  for (const [name, score] of Object.entries(scores)) {
    scoresElement.innerHTML += `<p>${name}: ${score}</p>`;
  }
});

socket.on("newWord", (word) => {
  wordElement.textContent = word;
});

socket.on("newQuestion", (question) => {
  questionContainer.style.display = "none";
  answersContainer.style.display = "block";
  askedQuestionElement.textContent = question;
  answersElement.innerHTML = ""; // Limpa as respostas anteriores
});

socket.on("submitAnswer", (answers) => {
  answersElement.innerHTML = "<h3>Respostas:</h3>";
  answers.forEach((answer) => {
    answersElement.innerHTML += `<p>${answer}</p>`;
  });
  voteButton.style.display = "block";
});

submitQuestionButton.addEventListener("click", () => {
  const question = questionInput.value;
  if (question) {
    socket.emit("submitQuestion", room, playerName, question);
    questionContainer.style.display = "none";
    answersContainer.style.display = "block";
  }
});

voteButton.addEventListener("click", () => {
  socket.emit("vote", room, playerName);
  voteButton.style.display = "none";
});

socket.on("endGame", (result) => {
  gameContainer.style.display = "none";
  if (result.winner) {
    scoresElement.innerHTML = `<h2>O vencedor é: ${result.winner}!</h2>`;
  } else {
    scoresElement.innerHTML = `<h2>O jogo terminou!</h2>`;
  }
});

socket.on("startCountdown", (time) => {
  countdownElement.style.display = "block";
  let countdown = time;
  countdownElement.textContent = `Iniciando em ${countdown} segundos...`;
  const countdownInterval = setInterval(() => {
    countdown--;
    countdownElement.textContent = `Iniciando em ${countdown} segundos...`;
    if (countdown <= 0) {
      clearInterval(countdownInterval);
      countdownElement.style.display = "none";
    }
  }, 1000);
});
