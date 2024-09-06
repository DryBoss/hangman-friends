import { useState } from "react";
import CreateGame from "./components/create-game/Create-game";
import Gameplay from "./components/gameplay/Gameplay";

function App() {
  const [currentScreen, setCurrentScreen] = useState("CreateGame");

  let [gameData, setGameData] = useState([]);

  return (
    <>
      {currentScreen == "CreateGame" ? (
        <CreateGame
          setCurrentScreen={setCurrentScreen}
          setGameData={setGameData}
        />
      ) : (
        <Gameplay gameData={gameData} />
      )}
    </>
  );
}

export default App;
