/* Настройки сайта — замените значения перед публикацией */

window.SITE_CONFIG = {
  /* Оплата */
  payment: {
    enabled: true,
    price: 15000,
    currency: '₽',
    label: 'Участие в игре «Система» · 18 июля',
    /* Вставьте ссылку на оплату: YooKassa, Tinkoff, Prodamus, Tilda Pay и т.д. */
    paymentUrl: '',
    /* successUrl — куда вернуть после оплаты (опционально) */
    successUrl: ''
  },

  /* Ссылки */
  links: {
    telegram: 'https://t.me/',
    privacy: 'privacy.html',
    offer: 'privacy.html#offer'
  },

  /* Изображения */
  images: {
    logo: 'assets/logo.png',               /* фирменный логотип */
    author: 'assets/author.jpg',
    gameSession: 'assets/game-session.jpg'
  },

  /*
    ВИДЕО С СОБЫТИЯ — одно главное видео, показывает атмосферу игры
    Вставляется в секцию «Посмотри, как проходит игра» (#event-video)
    YouTube: https://www.youtube.com/embed/VIDEO_ID
  */
  eventVideo: {
    title: 'Как проходит игра «Система»',
    subtitle: '2,5 часа живого разбора — здоровье, отношения, деньги',
    videoUrl: '', /* ← сюда embed-ссылка на видео с мероприятия */
    poster: 'assets/game-session.jpg'
  },

  /*
    ВИДЕООТЗЫВЫ — отзывы участников после игры
    Вставляются в секцию «Видеоотзывы участников» (#reviews)
  */
  reviews: [
    {
      name: 'Алексей М.',
      role: 'Собственник производственной компании',
      quote: 'За 2,5 часа увидел связи, на которые не обращал внимание 10 лет.',
      videoUrl: '', /* YouTube: https://www.youtube.com/embed/ВАШ_ID */
      thumbnail: ''
    },
    {
      name: 'Елена К.',
      role: 'CEO IT-стартапа',
      quote: 'Не ожидала такой глубины. Ушла с конкретным планом на квартал.',
      videoUrl: '',
      thumbnail: ''
    },
    {
      name: 'Игорь В.',
      role: 'Предприниматель, 15 лет в бизнесе',
      quote: 'Системный взгляд на жизнь — то, чего не хватало в консультациях.',
      videoUrl: '',
      thumbnail: ''
    }
  ]
};
