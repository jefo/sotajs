## Использование нескольких портов
```ts
const db = usePorts(saveUserPort, loadUserPort);
const llm = usePorts(extractDataPort, formatDataPort)

// конструируется объект на выходе у usePorts
db.saveUser();
db.loadUser();


llm.extractData(data);
llm.formatData(data);

```

## Проблема с путями
- ИИ часто ошибается с относительными путями. Перевести на # путь