import { useEffect, useState } from "react";

import WordGuesser from "../word-guesser/word-guesser";
import WordSelection from "../word-selection/Word-selection";
import ScoreBoard from "../scoreboard/scoreboard";

function Gameplay({ gameData }) {
  const turnDuration = gameData[0];
  const gameEndPoint = gameData[1];
  const players = gameData[2];

  const [currentSelector, setCurrentSelector] = useState(players[0]);
  const [currentPlayer, setCurrentPlayer] = useState(players[0]);

  const [score, setScore] = useState(Array(players.length).fill(0));

  return Math.max(...score) < gameEndPoint ? (
    currentPlayer == currentSelector ? (
      <WordSelection />
    ) : (
      <WordGuesser />
    )
  ) : (
    <ScoreBoard />
  );
}

export default Gameplay;
