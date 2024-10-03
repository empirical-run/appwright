# Appwright example

This is a sample project to demonstrate how to use Appwright. This uses mobile apps from Wikipedia 

- [Wikipedia Android app](https://github.com/wikimedia/apps-android-wikipedia) ([Apache 2.0 license](https://github.com/wikimedia/apps-android-wikipedia?tab=Apache-2.0-1-ov-file#readme))
- [Wikipedia iOS app](https://github.com/wikimedia/wikipedia-ios) ([MIT license](https://github.com/wikimedia/wikipedia-ios?tab=MIT-1-ov-file#readme))

## Usage

### Install dependencies

```sh
npm install
```

### Run the tests

To run the tests on Android emulator:

```sh
npx appwright test --project android
```

To run the tests on iOS simulator:

- Unzip the `wikipedia.zip` file

```sh
npm run extract:app
```
- Run the following command:

```sh
npx appwright test --project ios
```
