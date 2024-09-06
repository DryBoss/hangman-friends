import { useState } from "react";

import RunRound from "../run-round/runRound";
import ScoreBoard from "../scoreboard/scoreboard";

function Gameplay({ gameData }) {
  const turnDuration = gameData[0];
  const gameEndPoint = gameData[1];
  const players = gameData[2];

  const [score, setScore] = useState(Array(players.length).fill(0));

  while (Math.max(...score) < gameEndPoint) {
    for (let i = 0; i < players.length; i++) {
      return <RunRound />;
    }
  }
  return <ScoreBoard />;
}

export default Gameplay;
