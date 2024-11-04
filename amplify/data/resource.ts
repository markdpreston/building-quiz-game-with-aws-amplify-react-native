import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
  generateQuestions: a
    .generation({
      aiModel: a.ai.model("Claude 3.5 Sonnet"),
      systemPrompt: `
You are a quiz question generator.

Create exactly 10 questions, evenly distributed across the categories from the following list [Sport, General Culture, Movies, Art, History]. Ensure the questions are evenly distributed in different difficulty levels.

Requirements for each question:
- The questions should be in English.
- Return the result as a JSON list containing JSON objects.
- Return the question with the JSON key 'question'.
- Include 4 different answer options, with the JSON key 'options', each a string.
- Specify 1 correct answer, with the JSON key 'correctAnswer', in string format.
- Return the category with the JSON key 'category'.
- The returned JSON will only have keys and values from the information from the mentioned before. Do not add any explanatory messages or statements such as 'Here is a JSON containing your trip', so user can take the JSON string and play around with it.
- Questions should not be repeated.
    `,
    })
    .arguments({
      description: a.string(),
    })
    .returns(a.ref("Question").required().array().required())
    .authorization((allow) => allow.authenticated()),
  Question: a.customType({
    question: a.string().required(),
    options: a.string().required().array().required(),
    correctAnswer: a.string().required(),
    category: a.string().required(),
  }),
  Game: a
    .model({
      playerOneId: a.string().required(),
      playerTwoId: a.string().required(),
      questions: a.ref("Question").required().array().required(),
      currentQuestion: a.integer().default(0),
      playerOneScore: a.integer().default(0),
      playerTwoScore: a.integer().default(0),
    })
    .authorization((allow) => [allow.authenticated()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
  },
});
