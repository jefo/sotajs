## Trqansform Code

```ts
// TODO: БЫЛО
const telegramPresenter = usePort(telegramOutPort);
const telegramPresenterError = usePort(telegramErrorOutPort);
/
await telegramPresenter(renderedView);
await telegramPresenterError({ message: error.message });

// TODO: СТАЛО
sendCommand(telegramOutPort, renderedView).catch(telegramErrorOutPort, {
  message: error.message,
});
```
