# Assertions

Appwright provides a set of built-in assertions that you can use to verify the state of your app.

## expect

The `expect` function is used to make assertions on the state of your app.

```ts
const clipboardText = await device.getClipboardText();
expect(clipboardText).toBe("Hello, world!");
```

## toBeVisible

The `toBeVisible` assertion checks if an element is visible on the screen.

```ts
  await expect(device.getByText('Login')).toBeVisible();
```
