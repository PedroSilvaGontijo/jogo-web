const socket = io("http://localhost:3000");

const quizContainer = document.getElementById("quizContainer");
const questionElement = document.getElementById("question");
const optionsElement = document.getElementById("options");
const nextButton = document.getElementById("nextButton");
const scoresElement = document.getElementById("scores");
const countdownElement = document.getElementById("countdown");

let room = "default";
let playerName = localStorage.getItem("playerName");

if (playerName) {
  socket.emit("joinRoom", room, playerName);
  quizContainer.style.display = "block";
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

socket.on("newQuestion", (question) => {
  questionElement.textContent = question.question;
  optionsElement.innerHTML = "";
  question.options.forEach((option) => {
    const button = document.createElement("button");
    button.textContent = option;
    button.addEventListener("click", () => {
      socket.emit("answer", room, playerName, option);
      optionsElement.childNodes.forEach((btn) => (btn.disabled = true));
    });
    optionsElement.appendChild(button);
  });
  nextButton.style.display = "none";
});

socket.on("questionAnswered", () => {
  nextButton.style.display = "block";
});

nextButton.addEventListener("click", () => {
  socket.emit("nextQuestion", room);
  nextButton.style.display = "none";
});

socket.on("endQuiz", (champion) => {
  quizContainer.style.display = "none";
  if (champion) {
    scoresElement.innerHTML = `<h2>O campeão é: ${champion}!</h2>`;
  } else {
    scoresElement.innerHTML = `<h2>O quiz terminou!</h2>`;
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
