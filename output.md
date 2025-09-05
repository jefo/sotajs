  Финальная концепция: Паттерн "Семантических Выходных Портов"

  Философия:
  Каждый Use Case является обработчиком команды, который по завершении
  бизнес-операции сообщает о её результате через специфичный, семантически
  именованный выходной порт. DTO, передаваемый в этот порт, описывает исключительно
  бизнес-результат (например, "бронирование подтверждено с таким-то ID"), а не
  готовый к отображению UI-компонент. Вся логика по преобразованию этого
  бизнес-результата в сообщение, кнопки, форматирование и локализацию полностью
  инкапсулирована в Presentation Adapter.

  Ключевые отличия от предыдущей версии:

   1. Один Use Case — Множество Выходных Портов: Вместо одного общего presentationPort,
      каждый Use Case определяет собственный набор выходных портов, соответствующий его
      возможным исходам (например, bookingConfirmedPort, bookingFailedPort,
      stockNotAvailablePort).
   2. DTO — это Бизнес-Результат, а не UI: Слой приложения больше не работает с
      DialogComponentSchema. Он оперирует DTO, описывающими итог операции, как если бы
      он просто возвращал их через return.
   3. Presentation Adapter — это "Композитор" UI: Адаптер становится умнее. Он не просто
      рендерит готовый компонент, а получает DTO с бизнес-данными и на их основе создает
      сообщение для пользователя, применяя логику форматирования, локализации и выбора
      нужных UI-элементов.

  Обновленный жизненный цикл запроса

   1. Driving Adapter -> Use Case (с Command DTO).
   2. Use Case -> Data Port -> Rich Entity.
   3. Use Case вызывает действие у Rich Entity.
   4. Use Case -> Data Port (сохраняет новое состояние).
   5. Use Case формирует Business Outcome DTO (напр., { bookingId: '123', customerName:
      'John' }).
   6. Use Case вызывает семантический выходной порт, соответствующий результату: await
      bookingConfirmedPort(outcomeDto).
   7. Presentation Adapter, который реализует bookingConfirmedPort, получает outcomeDto.
   8. Presentation Adapter генерирует финальное сообщение ("Поздравляем, John! Ваше
      бронирование #123 подтверждено.") и отправляет его пользователю.

  Real-World Example: Подтверждение бронирования (Финальная версия)

  Шаг 1: Домен (Domain Layer)

  Без изменений. Dialog.entity.ts остается таким же надежным.

  Шаг 2: Приложение (Application Layer)

  Здесь происходят ключевые изменения в определении портов и логике Use Case.

    1 // src/application/ports/confirm-booking.outputs.ts
    2 import { z } from 'zod';
    3 import { createPort } from '@maxdev1/sotajs/lib/di';
    4
    5 // Схема DTO для успешного исхода
    6 export const BookingConfirmedOutputSchema = z.object({
    7   dialogId: z.string().uuid(),
    8   bookingId: z.string(),
    9   customerName: z.string(), // Добавим еще данных для примера
   10 });
   11 type BookingConfirmedOutput = z.infer<typeof BookingConfirmedOutputSchema
      >;
   12
   13 // Схема DTO для исхода с ошибкой
   14 export const BookingFailedOutputSchema = z.object({
   15   dialogId: z.string().uuid(),
   16   reason: z.string(),
   17 });
   18 type BookingFailedOutput = z.infer<typeof BookingFailedOutputSchema>;
   19
   20 // Семантически именованные порты для каждого исхода
   21 export const bookingConfirmedPort = createPort<(dto:
      BookingConfirmedOutput) => Promise<void>>();
   22 export const bookingFailedPort = createPort<(dto: BookingFailedOutput) =>
      Promise<void>>();

    1 // src/application/use-cases/confirm-booking.usecase.ts
    2 import { z } from 'zod';
    3 import { usePort } from '@maxdev1/sotajs/lib/di';
    4 import { Dialog } from '../../domain/dialog/dialog.entity';
    5 import { findDialogByIdPort, saveDialogPort } from
      '../ports/dialog-repository.port';
    6 // Импортируем наши новые, специфичные порты
    7 import { bookingConfirmedPort, bookingFailedPort } from
      '../ports/confirm-booking.outputs';
    8
    9 const ConfirmBookingInputSchema = z.object({ dialogId: z.string().uuid(),
      customerName: z.string() });
   10 type ConfirmBookingInput = z.infer<typeof ConfirmBookingInputSchema>;
   11
   12 export const confirmBookingUseCase = async (input: ConfirmBookingInput):
      Promise<void> => {
   13   const command = ConfirmBookingInputSchema.parse(input);
   14
   15   // Получаем все необходимые порты
   16   const findDialogById = usePort(findDialogByIdPort);
   17   const saveDialog = usePort(saveDialogPort);
   18   const bookingConfirmed = usePort(bookingConfirmedPort);
   19   const bookingFailed = usePort(bookingFailedPort);
   20
   21   const dialogState = await findDialogById(command.dialogId);
   22   if (!dialogState) {
   23     // Используем порт для вывода ошибки
   24     return await bookingFailed({ dialogId: command.dialogId, reason:
      'Dialog not found' });
   25   }
   26
   27   const dialog = Dialog.create(dialogState);
   28   const bookingId = `BK-${Date.now()}`;
   29
   30   try {
   31     dialog.actions.confirm({ bookingId });
   32     await saveDialog(dialog.state);
   33
   34     // Вызываем порт УСПЕШНОГО исхода с "сухими" бизнес-данными
   35     await bookingConfirmed({
   36       dialogId: dialog.state.id,
   37       bookingId: dialog.state.context.bookingId as string,
   38       customerName: command.customerName,
   39     });
   40   } catch (error: any) {
   41     // Используем порт для вывода ошибки бизнес-логики
   42     await bookingFailed({ dialogId: command.dialogId, reason: error.
      message });
   43   }
   44 };

  Шаг 3: Адаптер Представления (Adapters Layer)

  Адаптер теперь содержит логику композиции UI.

    1 // src/adapters/presentation/console.adapter.ts
    2
    3 // Обработчик для успешного подтверждения
    4 export const onBookingConfirmed = async (dto: { bookingId: string;
      customerName: string; }) => {
    5   // Логика форматирования и локализации находится здесь!
    6   const message = `✅ Поздравляем, ${dto.customerName}! Ваше бронирование
      #${dto.bookingId} подтверждено.`;
    7   console.log(message);
    8 };
    9
   10 // Обработчик для ошибки
   11 export const onBookingFailed = async (dto: { reason: string; }) => {
   12   const message = `❌ Ошибка: ${dto.reason}. Пожалуйста, попробуйте еще
      раз.`;
   13   console.log(message);
   14 };

  Шаг 4: Сборка приложения (Composition Root)

  Сборка становится более гранулярной: мы связываем каждый семантический порт с его
  конкретным обработчиком в адаптере.

    1 // src/main.ts
    2 import { setPortAdapter, resetDI } from '@maxdev1/sotajs/lib/di';
    3 import { bookingConfirmedPort, bookingFailedPort } from
      './application/ports/confirm-booking.outputs';
    4 import { onBookingConfirmed, onBookingFailed } from
      './adapters/presentation/console.adapter';
    5 // ...другие импорты...
    6 import { confirmBookingUseCase } from
      './application/use-cases/confirm-booking.usecase';
    7 import { findDialogByIdPort, saveDialogPort } from
      './application/ports/dialog-repository.port';
    8 import { findDialogByIdAdapter, saveDialogAdapter } from
      './adapters/persistence/in-memory-dialog.repository';
    9
   10
   11 // 1. Собираем приложение
   12 resetDI();
   13 // Связываем порты данных
   14 setPortAdapter(findDialogByIdPort, findDialogByIdAdapter);
   15 setPortAdapter(saveDialogPort, saveDialogAdapter);
   16
   17 // Связываем каждый семантический порт вывода с его обработчиком
   18 setPortAdapter(bookingConfirmedPort, onBookingConfirmed);
   19 setPortAdapter(bookingFailedPort, onBookingFailed);
   20
   21 // 2. Эмулируем запуск
   22 async function run() {
   23   console.log('Запускаем сценарий...');
   24   await confirmBookingUseCase({ dialogId: 'dialog-123', customerName:
      'Иван' });
   25 }
   26
   27 run();

  Заключение

  Эта финальная версия архитектуры является канонической. Она обеспечивает
  максимальную степень разделения ответственности:
   * Domain: Знает только о бизнес-правилах.
   * Application: Знает только о бизнес-сценариях и их исходах.
   * Adapters: Знают о внешнем мире (БД, Telegram, Console) и содержат всю логику по
     взаимодействию с ним, включая форматирование и композицию UI.

  Это делает систему невероятно гибкой: для поддержки нового канала (например, Web)
  нужно лишь добавить новый Presentation Adapter, который будет реализовывать те же
  семантические порты (bookingConfirmedPort и т.д.), и переключить их в main.ts, не
  затрагивая ядро приложения.
