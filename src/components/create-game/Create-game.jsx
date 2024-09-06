import { useState } from "react";

import styles from "./Create-game.module.css";

function CreateGame() {
  const [turnDuration, setTurnDuration] = useState(30);
  const [gameEndPoint, setGameEndPoint] = useState(10);

  const [players, setPlayers] = useState(["player 1", "player 2"]);

  return (
    <div className={styles.createGame}>
      <h1>Hangman friends</h1>
      <div className={styles.gameRange}>
        Turn Duration
        <br />
        <span onClick={() => setTurnDuration(turnDuration - 5)}>-</span>{" "}
        {turnDuration}{" "}
        <span onClick={() => setTurnDuration(turnDuration + 5)}>+</span>
      </div>
      <div className={styles.gameRange}>
        Game End Point
        <br />
        <span onClick={() => setGameEndPoint(gameEndPoint - 1)}>-</span>{" "}
        {gameEndPoint}{" "}
        <span onClick={() => setGameEndPoint(gameEndPoint + 1)}>+</span>
      </div>
      <div className={styles.players}></div>
    </div>
  );
}

export default CreateGame;
