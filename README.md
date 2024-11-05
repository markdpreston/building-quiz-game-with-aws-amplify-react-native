## Building a Quiz Game with AWS Amplify Gen 2 and React Native

> This repository contains the app that is created through the blog post over [community.aws](https://community.aws/content/2oFXtL8vTeHWORWVkx8ak2gCgxf). For seeing a detailed explanation on how to build the app, check out the blog post.

### Requirements

Before you move forward, be sure to have:
- npm (Node Package Manager) installation
- An AWS Account configured for local development
  - Check out the [account configuration documentation](https://docs.amplify.aws/react/start/account-setup/) for detailed instructions.
- Expo CLI

### Running the project
For running the project, first you need to install the npm libraries by running:

```bash
npm install
```

Next, you can run the new sandbox environment by running:
```bash
npx ampx sandbox
```

Next, if you are running on **Android**, be sure to add the Android SDK location to the `android/local.properties` file:
```bash
sdk.dir=/path/to/your/Android/sdk
```

Lastly, you can run the applications on both iOS and Android by running:

```bash
npx expo run:ios # for iOS
npx expo run:android #for Android
```

### Cleaning up the resources
Be sure to clean up your resources once you are done with the testing. You can clean the resources by running:

```bash
npx ampx sandbox delete
```

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
