import { useState } from "react";

import WordGuesser from "./../word-guesser/Word-guesser";
import WordSelection from "./../word-selection/Word-selection";
import ScoreBoard from "./../scoreboard/Scoreboard";

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
      word.length == 0 ? (
        <WordSelection
          players={players}
          currentSelector={currentSelector}
          setWord={setWord}
          currentPlayer={currentPlayer}
          setCurrentPlayer={setCurrentPlayer}
        />
      ) : (
        setCurrentPlayer((currentPlayer + 1) % players.length)
      )
    ) : (
      <WordGuesser
        players={players}
        currentSelector={currentSelector}
        setCurrentSelector={setCurrentSelector}
        currentPlayer={currentPlayer}
        setCurrentPlayer={setCurrentPlayer}
        word={word}
        setWord={setWord}
        guessedLetters={guessedLetters}
        setGuessedLetters={setGuessedLetters}
        turnDuration={turnDuration}
      />
    )
  ) : (
    <ScoreBoard />
  );
}

export default Gameplay;
