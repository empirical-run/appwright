# Vision methods

Appwright provides a set of built-in methods to tap or extract information from the screen. These methods use LLM Capabilities to perform actions on the screen.

## Extract information from the screen

The `query` method allows you to extract information from the screen based on a prompt. Ensure the `OPENAI_API_KEY` environment variable is set to authenticate the API request.

```ts
const text = await device.beta.query("Extract the contact details present in the footer");
```

By default, the `query` method returns a string. You can also specify a Zod schema to get the response in a specific format.

```ts
const isLoginButtonVisible = await device.beta.query(
      `Is the login button visible on the screen?`,
      {
        responseFormat: z.boolean(),
      },
    );
```

By default, the `query` method extracts information from the current screen. You can also specify a screenshot to perform operation on a specific screenshot.

```ts
const text = await device.beta.query(
      `Extract contact details present in the footer`,
      {
        screenshot: "screenshot.png",
      },
    );
```

By default, the `query` method uses the `gpt-4o-mini` model. You can also specify a different model.

```ts
const text = await device.beta.query(
      `Extract contact details present in the footer`,
      {
        model: "gpt-4o",
      },
    );
```

## Tap on the screen

The `tap` method allows you to tap on the screen based on a prompt. Ensure the `EMPIRICAL_API_KEY` environment variable is set to authenticate the API request.

```ts
await device.beta.tap("point at the 'Login' button.");
```
