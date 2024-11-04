import React, { useEffect, useState } from "react";
import {
  Button,
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ActivityIndicator,
} from "react-native";

import { Amplify } from "aws-amplify";
import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react-native";

import outputs from "./amplify_outputs.json";
import { fetchUserAttributes } from "aws-amplify/auth";
import { Schema } from "./amplify/data/resource";
import { generateClient } from "aws-amplify/data";

const client = generateClient<Schema>();

Amplify.configure(outputs);

const SignOutButton: React.FC = () => {
  const { signOut } = useAuthenticator();

  return (
    <View style={styles.signOutButton}>
      <Button title="Sign Out" onPress={signOut} />
    </View>
  );
};

type GameState = "idle" | "searching" | "found" | "quiz" | "error";

interface HomeScreenProps {
  username: string;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ username }) => {
  const [gameState, setGameState] = useState<GameState>("idle");
  const [currentQuestion, setCurrentQuestion] = useState<number>(-1);
  const [game, setGame] = useState<Schema["Game"]["type"]>();
  const handleSearchGame = async (): Promise<void> => {
    const currentGames = await client.models.Game.list({
      filter: {
        playerTwoId: {
          eq: "notAssigned",
        },
      },
    });

    if (currentGames.data.length > 0) {
      await client.models.Game.update({
        id: currentGames.data[0].id,
        playerTwoId: username,
      });
      setGameState("found");

      client.models.Game.observeQuery({
        filter: {
          id: {
            eq: currentGames.data[0].id,
          },
        },
      }).subscribe(async (game) => {
        if (game.items[0].questions.length > 0) {
          setGameState("quiz");
          setGame(game.items[0]);
        }
        if (game.items[0].currentQuestion !== currentQuestion) {
          setCurrentQuestion((game.items[0].currentQuestion ?? 0) + 1);
        }
      });
      const result = await client.generations.generateQuestions({
        description: "",
      });

      if (result.errors) {
        setGameState("error");
        return;
      }

      const updatedGame = await client.models.Game.update({
        id: currentGames.data[0].id,
        questions: result.data as Schema["Question"]["type"][],
      });

      if (updatedGame.data) {
        setGame(updatedGame.data);
      }
      // await client.models.Game.update({
      //   id: currentGames.data[0].id,
      //   questions: [
      //     {
      //       question: "Which country won the FIFA World Cup in 2022?",
      //       options: ["Brazil", "France", "Argentina", "Germany"],
      //       correctAnswer: "Argentina",
      //       category: "Soccer",
      //     },
      //     {
      //       question: "In which sport would you perform a 'slam dunk'?",
      //       options: ["Volleyball", "Tennis", "Basketball", "Cricket"],
      //       correctAnswer: "Basketball",
      //       category: "Basketball",
      //     },
      //     {
      //       question:
      //         "How many players are there on a standard ice hockey team?",
      //       options: ["5", "6", "7", "8"],
      //       correctAnswer: "6",
      //       category: "Ice Hockey",
      //     },
      //     {
      //       question:
      //         "In which Olympic sport might you use the 'Fosbury Flop' technique?",
      //       options: ["Swimming", "Diving", "High Jump", "Gymnastics"],
      //       correctAnswer: "High Jump",
      //       category: "Athletics",
      //     },
      //     {
      //       question:
      //         "Which Grand Slam tennis tournament is played on clay courts?",
      //       options: ["Wimbledon", "US Open", "Australian Open", "French Open"],
      //       correctAnswer: "French Open",
      //       category: "Tennis",
      //     },
      //   ],
      // });
    } else {
      setGameState("searching");
      const newGame = await client.models.Game.create({
        playerOneId: username,
        playerTwoId: "notAssigned",
        questions: [],
      });
      client.models.Game.observeQuery({
        filter: {
          id: {
            eq: newGame.data?.id,
          },
        },
      }).subscribe((game) => {
        if (game.items[0].questions.length > 0) {
          setGameState("quiz");
          setGame(game.items[0]);
        } else if (game.items[0].playerTwoId !== "notAssigned") {
          setGameState("found");
        }
        if (game.items[0].currentQuestion !== currentQuestion) {
          setCurrentQuestion((game.items[0].currentQuestion ?? 0) + 1);
        }
      });
    }
  };

  const renderContent = (): JSX.Element => {
    switch (gameState) {
      case "idle":
        return (
          <>
            <Text style={styles.welcomeText}>Welcome {username}!</Text>
            <Button title="Search Game" onPress={handleSearchGame} />
          </>
        );
      case "searching":
        return (
          <>
            <Text style={styles.quizText}>Searching for a game now</Text>
            <ActivityIndicator style={styles.activityIndicator} size="large" />
          </>
        );
      case "found":
        return (
          <>
            <Text style={styles.quizText}>
              Questions are getting generated now...
            </Text>
            <ActivityIndicator style={styles.activityIndicator} size="large" />
          </>
        );
      case "quiz":
        const question = game?.questions[currentQuestion];
        if (currentQuestion === game?.questions.length) {
          return (
            <>
              <Text style={styles.quizText}>Quiz is over!</Text>
              <Text style={styles.quizText}>
                {game?.playerOneScore === game?.playerTwoScore
                  ? "It's a tie!"
                  : (game?.playerOneScore ?? 0) > (game?.playerTwoScore ?? 0)
                  ? `${
                      game?.playerOneId === username ? "You" : game?.playerOneId
                    } won with ${game?.playerOneScore} points!`
                  : `${
                      game?.playerTwoId === username ? "You" : game?.playerTwoId
                    } won with ${game?.playerTwoScore} points!`}
              </Text>
            </>
          );
        }
        return (
          <>
            <Text>{question?.question}</Text>
            {question?.options.map((option) => (
              <Button
                key={option}
                title={option!}
                onPress={() => {
                  if (option === question.correctAnswer) {
                    if (game?.playerOneId === username) {
                      client.models.Game.update({
                        id: game!.id,
                        playerOneScore: (game?.playerOneScore ?? 0) + 10,
                        currentQuestion: currentQuestion,
                      });
                    } else {
                      client.models.Game.update({
                        id: game!.id,
                        playerTwoScore: (game?.playerTwoScore ?? 0) + 10,
                        currentQuestion: currentQuestion,
                      });
                    }
                  } else {
                    client.models.Game.update({
                      id: game!.id,
                      currentQuestion: currentQuestion,
                    });
                  }
                }}
              />
            ))}
          </>
        );
      case "error":
        return (
          <>
            <Text style={styles.welcomeText}>There is an error.</Text>
          </>
        );
      default:
        return <Text>Unknown state</Text>;
    }
  };

  return <View style={styles.contentContainer}>{renderContent()}</View>;
};

const App: React.FC = () => {
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const fetchUsername = async (): Promise<void> => {
      const userAttributes = await fetchUserAttributes();
      const fetchedUsername = userAttributes?.preferred_username ?? "";
      setUsername(fetchedUsername);
    };
    void fetchUsername();
  }, []);

  return (
    <Authenticator.Provider>
      <Authenticator>
        <SafeAreaView style={styles.container}>
          <SignOutButton />
          <HomeScreen username={username} />
        </SafeAreaView>
      </Authenticator>
    </Authenticator.Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  signOutButton: {
    alignSelf: "flex-end",
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  quizText: {
    fontSize: 16,
    marginBottom: 16,
  },
  activityIndicator: {
    padding: 16,
  },
});

export default App;
