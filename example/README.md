# Sample Appwright tests

This is a sample project to demonstrate how to use Appwright. We have used the [Wikipedia](https://en.wikipedia.org/wiki/Main_Page) app as the sample app.

## Setup

1. Install dependencies

```sh {"id":"01J8QHA99VRJ41X79VD2M5ETDC"}
npm install
```

2. Run the tests

To run the tests on Android:

```sh {"id":"01J8QHA99VRJ41X79VD4P9S89K"}
npx appwright test --project android
```

To run the tests on iOS:

Unzip the `wikipedia.zip` file and run the following command:

```sh {"id":"01J8QHA99VRJ41X79VD85VJA2M"}
npx appwright test --project ios
```
