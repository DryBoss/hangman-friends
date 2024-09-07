import { useState } from "react";

import WordGuesser from "../word-guesser/word-guesser";
import WordSelection from "../word-selection/Word-selection";
import ScoreBoard from "../scoreboard/scoreboard";

function Gameplay({ gameData }) {
  const turnDuration = gameData[0];
  const gameEndPoint = gameData[1];
  const players = gameData[2];

  const [currentSelector, setCurrentSelector] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [word, setWord] = useState([]);
  const [guessedLetters, setGuessedLetters] = useState([]);

  const [score, setScore] = useState(Array(players.length).fill(0));

  return Math.max(...score) < gameEndPoint ? (
    currentPlayer == currentSelector ? (
      <WordSelection
        players={players}
        currentSelector={currentSelector}
        setWord={setWord}
        currentPlayer={currentPlayer}
        setCurrentPlayer={setCurrentPlayer}
      />
    ) : (
      <WordGuesser
        players={players}
        currentPlayer={currentPlayer}
        setCurrentPlayer={setCurrentPlayer}
        word={word}
        guessedLetters={guessedLetters}
        turnDuration={turnDuration}
      />
    )
  ) : (
    <ScoreBoard />
  );
}

export default Gameplay;
