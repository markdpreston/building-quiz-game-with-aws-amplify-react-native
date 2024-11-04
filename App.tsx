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
    try {
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
        }).subscribe(async (observedGame) => {
          if (observedGame.items[0].questions.length > 0) {
            setGameState("quiz");
            setGame(observedGame.items[0]);
          }
          if (observedGame.items[0].currentQuestion !== currentQuestion) {
            setCurrentQuestion(
              (observedGame.items[0].currentQuestion ?? 0) + 1
            );
          }
        });

        const result = await client.generations.generateQuestions({
          description: "",
        });

        if (result.errors) {
          console.log(result.errors);
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
        }).subscribe((observedGame) => {
          if (observedGame.items[0].questions.length > 0) {
            setGameState("quiz");
            setGame(observedGame.items[0]);
          } else if (observedGame.items[0].playerTwoId !== "notAssigned") {
            setGameState("found");
          }
          if (observedGame.items[0].currentQuestion !== currentQuestion) {
            setCurrentQuestion(
              (observedGame.items[0].currentQuestion ?? 0) + 1
            );
          }
        });
      }
    } catch (error) {
      console.error("Error searching for game:", error);
      setGameState("error");
    }
  };

  const renderContent = (): JSX.Element => {
    switch (gameState) {
      case "idle":
        return (
          <View style={styles.gameContainer}>
            <Text style={styles.welcomeText}>Welcome {username}!</Text>
            <View style={styles.buttonContainer}>
              <Button
                title="Search Game"
                onPress={handleSearchGame}
                color="#eba74c"
              />
            </View>
          </View>
        );
      case "searching":
        return (
          <View style={styles.gameContainer}>
            <Text style={styles.quizText}>Searching for a game now</Text>
            <ActivityIndicator
              style={styles.activityIndicator}
              size="large"
              color="#eba74c"
            />
          </View>
        );
      case "found":
        return (
          <View style={styles.gameContainer}>
            <Text style={styles.quizText}>
              Questions are getting generated now...
            </Text>
            <ActivityIndicator
              style={styles.activityIndicator}
              size="large"
              color="#eba74c"
            />
          </View>
        );
      case "quiz":
        if (!game) return <Text style={styles.quizText}>Loading game...</Text>;

        const question = game.questions[currentQuestion];
        if (currentQuestion === game.questions.length) {
          return (
            <View style={styles.gameContainer}>
              <Text style={styles.quizText}>Quiz is over!</Text>
              <Text style={styles.resultText}>
                {game.playerOneScore === game.playerTwoScore
                  ? `It's a tie with ${game.playerOneScore}!`
                  : (game.playerOneScore ?? 0) > (game.playerTwoScore ?? 0)
                  ? `${
                      game.playerOneId === username ? "You" : game.playerOneId
                    } won with ${game.playerOneScore} points!`
                  : `${
                      game.playerTwoId === username ? "You" : game.playerTwoId
                    } won with ${game.playerTwoScore} points!`}
              </Text>
            </View>
          );
        }
        return (
          <View style={styles.gameContainer}>
            <Text style={styles.questionText}>{question?.question}</Text>
            <View style={styles.optionsContainer}>
              {question?.options.map((option) => (
                <View style={styles.optionButton} key={option}>
                  <Button
                    title={option}
                    color="#eba74c"
                    onPress={() => {
                      if (option === question.correctAnswer) {
                        if (game.playerOneId === username) {
                          client.models.Game.update({
                            id: game.id,
                            playerOneScore: (game.playerOneScore ?? 0) + 10,
                            currentQuestion,
                          });
                        } else {
                          client.models.Game.update({
                            id: game.id,
                            playerTwoScore: (game.playerTwoScore ?? 0) + 10,
                            currentQuestion,
                          });
                        }
                      } else {
                        client.models.Game.update({
                          id: game.id,
                          currentQuestion,
                        });
                      }
                    }}
                  />
                </View>
              ))}
            </View>
          </View>
        );
      case "error":
        return (
          <View style={styles.gameContainer}>
            <Text style={[styles.welcomeText, styles.errorText]}>
              There is an error.
            </Text>
          </View>
        );
      default:
        return <Text style={styles.quizText}>Unknown state</Text>;
    }
  };

  return <View style={styles.contentContainer}>{renderContent()}</View>;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  signOutButton: {
    alignSelf: "flex-end",
    margin: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  gameContainer: {
    width: "100%",
    alignItems: "center",
    padding: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
  },
  buttonContainer: {
    width: "80%",
    marginTop: 20,
  },
  quizText: {
    fontSize: 18,
    marginBottom: 16,
    color: "#333",
    textAlign: "center",
  },
  questionText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 24,
    textAlign: "center",
  },
  resultText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#eba74c",
    textAlign: "center",
  },
  optionsContainer: {
    width: "100%",
    marginTop: 20,
  },
  optionButton: {
    marginVertical: 8,
    width: "100%",
  },
  activityIndicator: {
    padding: 16,
  },
  errorText: {
    color: "red",
  },
});

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

export default App;
