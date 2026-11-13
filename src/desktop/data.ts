export type Message = {
  author: string;
  text: string;
  time: string;
  mine?: boolean;
};

export const initialMessages: Message[] = [
  {
    author: 'Даша',
    text: 'Штаб, мы на месте. Начинаем осмотр территории.',
    time: '10:42',
  },
  {
    author: 'Артём',
    text: 'Нашли папку с документами поискового отряда. Передадим фотографии.',
    time: '10:44',
  },
  {
    author: 'Штаб',
    text: 'Принято. Сначала проверим материалы в архиве.',
    time: '10:45',
    mine: true,
  },
];

export const archiveRecords = [
  {
    code: 'Д-07/1975',
    title: 'Папка поискового отряда',
    description: 'Материалы расследования, начатого в 1975 году',
    tag: 'На изучении',
  },
  {
    code: 'П-1942/Ф',
    title: 'Федотов Иван Андреевич',
    description: 'Предварительная карточка пропавшего без вести',
    tag: 'Требует сверки',
  },
  {
    code: 'ПИСЬМО/01',
    title: 'Письмо семье',
    description: 'Личный документ. Оригинал требует восстановления',
    tag: 'На реставрации',
  },
];