# Sample Appwright tests

This is a sample project to demonstrate how to use Appwright. We have used the [Wikipedia](https://en.wikipedia.org/wiki/Main_Page) app as the sample app.

## Setup

1. Install dependencies

```sh
npm install
```

2. Run the tests

To run the tests on Android:

```sh
npx appwright test --project android
```

To run the tests on iOS:

- Unzip the `wikipedia.zip` file

```sh
npm run extract:app
```
- Run the following command:

```sh
npx appwright test --project ios
```
