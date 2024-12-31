const API_BASE_URL = 'http://localhost:3001/api'; // Your API base URL

// Global variables to store the current game state
let currentTrack = null;
let nextTrack = null;
let streak = 0;
let highScore = getCookie('highScore') ? parseInt(getCookie('highScore')) : 0; // Retrieve from cookie

// UI Elements
const artist1Name = document.getElementById('artist1-name');
const artist1Image = document.getElementById('artist1-image');
const artist2Name = document.getElementById('artist2-name');
const artist2Image = document.getElementById('artist2-image');
const resultDiv = document.getElementById('result');
const streakDiv = document.getElementById('streak');
const highScoreDiv = document.getElementById('high-score');
const longerButton = document.getElementById('longer');
const shorterButton = document.getElementById('shorter');
const gameOverScreen = document.getElementById('game-over-screen');
const finalStreak = document.getElementById('final-streak');
const finalHighScore = document.getElementById('final-high-score');
const retryButton = document.getElementById('retry-button');


// Start the game
window.onload = () => {
  loadGame();
};

// Fetch tracks for the given artist
async function fetchAllTracks(artistId) {
  try {
    const response = await fetch(`${API_BASE_URL}/artist/${artistId}/all-tracks`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching tracks:', error);
    return [];
  }
}

// Helper function to get track duration in seconds
const getTrackDuration = (track) => {
  if (track.duration) {
    return Math.round(track.duration / 1000); // Convert milliseconds to seconds
  }
  return 'N/A'; // If no duration, return 'N/A'
};

// Load a new game (choose two tracks)
async function loadGame() {
  // Hide the Game Over screen if visible
  gameOverScreen.style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';

  // Reset result text and enable buttons
  resultDiv.style.display = 'none';

  // Set high score text
  highScoreDiv.textContent = `High Score: ${highScore}`;
  streakDiv.textContent = `Current Streak: ${streak}`;

  const artistId = '4DiZJ3Gg7B1EWeKoQO36Ae'; // Hardcoded for the artist you mentioned

  const tracks = await fetchAllTracks(artistId);
  if (tracks.length < 2) {
    console.error('Not enough tracks fetched');
    return;
  }

  // Select two random tracks
  currentTrack = tracks[Math.floor(Math.random() * tracks.length)];
  nextTrack = tracks[Math.floor(Math.random() * tracks.length)];

  // Update UI with track details
  artist1Name.textContent = currentTrack.name;
  artist1Image.src = currentTrack.albumImage;
  artist2Name.textContent = nextTrack.name;
  artist2Image.src = nextTrack.albumImage;

  resultDiv.style.display = 'none'; // Hide previous result
}

// Disable the game buttons
function disableButtons() {
  longerButton.disabled = true;
  shorterButton.disabled = true;
}

function enableButtons() {
  setTimeout(() => {
    longerButton.disabled = false;
    shorterButton.disabled = false;
  }, 1100);
}


// Check if the player's guess is correct
function checkGuess(guess) {
  // Disable buttons after a guess
  disableButtons();

  // Check if the guess is correct
  const isCorrect = guess === 'longer' ? nextTrack.duration > currentTrack.duration : nextTrack.duration < currentTrack.duration;

  // Update streak
  if (isCorrect) {
    streak++;
  } else {
    showGameOver();
    streak = 0;
  }

  // Update the high score
  if (streak > highScore) {
    highScore = streak;
    setCookie('highScore', highScore, 365);
  }

  // Update the UI with the results
  highScoreDiv.textContent = `High Score: ${highScore}`;
  streakDiv.textContent = `Current Streak: ${streak}`;
  resultDiv.style.display = 'block';
  resultDiv.textContent = isCorrect ? 'Correct!' : 'Wrong!';

  // Wait for 2 seconds before loading new tracks (or in this case showing game over)
  setTimeout(() => {
    if (isCorrect) {
      loadGame();
      enableButtons();
    }
  }, 2000);
}


function showGameOver() {
  // Set the final streak and high score
  finalStreak.textContent = streak; // Set the current streak
  finalHighScore.textContent = highScore; // Set the high score

  // Hide the game container and show the Game Over screen
  document.getElementById('game-container').style.display = 'none';
  gameOverScreen.style.display = 'flex'; // Show the Game Over screen
}


retryButton.addEventListener('click', () => {
  // Reset the game state (you can add more reset functionality here)
  streak = 0;
  loadGame(); // Reload the game
  enableButtons();

  // Hide the game over screen and show the game container again
  gameOverScreen.style.display = 'none';
  document.getElementById('game-container').style.display = 'flex';
});


// Button event listeners
longerButton.addEventListener('click', () => {
  checkGuess('longer');
});
shorterButton.addEventListener('click', () => {
  checkGuess('shorter');
});

// Cookie helper functions
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/`;
}

function getCookie(name) {
  const nameEq = `${name}=`;
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i].trim();
    if (c.indexOf(nameEq) === 0) {
      return c.substring(nameEq.length, c.length);
    }
  }
  return '';
}
