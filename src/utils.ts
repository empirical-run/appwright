import test from "@playwright/test";

export function boxedStep(
  target: Function,
  context: ClassMethodDecoratorContext,
) {
  return function replacementMethod(...args: any) {
    //@ts-ignore
    const path = this.selector ? `("${this.selector}")` : "";
    const argsString = args.length
      ? "(" +
        Array.from(args)
          .map((a) => JSON.stringify(a))
          .join(" , ") +
        ")"
      : "";
    const name = `${context.name as string}${path}${argsString}`;
    return test.step(
      name,
      async () => {
        // @ts-ignore
        return await target.call(this, ...args);
      },
      { box: true },
    ); // Note the "box" option here.
  };
}
