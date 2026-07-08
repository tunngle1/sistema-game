/* Настройки сайта — замените значения перед публикацией */

window.SITE_CONFIG = {
  /* Данные мероприятия */
  event: {
    date: '15 июля',
    time: '19:00–22:00',
    city: 'Москва',
    format: 'Офлайн',
    address: 'г. Москва, Волоколамское шоссе, д. 2, Бизнесцентр «Гидропроект»'
  },

  /* Форма регистрации → Telegram-бот (папка bot/, деплой отдельно на Vercel) */
  form: {
    endpoint: 'https://sistema-game-bot.vercel.app/api/register',
    successTitle: 'Спасибо!',
    successMessage: 'Заявка отправлена. Мы свяжемся с вами в Telegram в ближайшее время и подтвердим участие.'
  },

  /* Оплата — временно отключена, только заявка в Telegram */
  payment: {
    enabled: false,
    price: 5000,
    currency: '₽',
    label: 'Участие в игре «Система» · 15 июля · Москва',
    paymentUrl: '',
    successUrl: ''
  },

  /* Ссылки */
  links: {
    telegram: 'https://t.me/shkarovbiz',
    askTelegram: 'https://t.me/Shkarovbis',
    youtube: 'https://www.youtube.com/@ДмитрийШкаров-007',
    privacy: 'privacy.html',
    consentPd: 'legal/consent-pd.html',
    consentMailing: 'legal/consent-mailing.html',
    offer: 'legal/offer.html'
  },

  /* Изображения */
  images: {
    logo: 'assets/logo.png',
    author: 'assets/author.jpg',
    gameSession: 'assets/game-session.jpg'
  },

  /* ВИДЕО В СЕКЦИИ «ОБ ИГРЕ» — #about */
  aboutVideo: {
    videoUrl: 'https://rutube.ru/video/private/168d7227e8f6f182baa1dfe133d3f5b9/?p=C6NQTOzALh0wXHSTju6ZRA',
    videoId: '168d7227e8f6f182baa1dfe133d3f5b9',
    pepper: 'C6NQTOzALh0wXHSTju6ZRA'
  },

  /* ФОТО С ИГРЫ — секция #event-video */
  eventVideo: {
    title: 'Как проходит игра «Система»',
    subtitle: 'Офлайн в Москве · 15 июля, 19:00–22:00. Живой разбор — здоровье, отношения, деньги.',
    poster: 'assets/game-session.jpg'
  },

  /* ВИДЕООТЗЫВЫ — секция #reviews (Rutube embed) */
  reviews: [
    {
      name: 'Первый отзыв',
      role: 'Участник игры «Система»',
      quote: '',
      thumbnail: 'https://pic.rtbcdn.ru/video/2026-07-06/bb/31/bb3144148e50519bb8a72dfd28cda2b2.jpg',
      videoUrl: 'https://rutube.ru/play/embed/88ed18879dc9b40d935859af3b960da1/?p=c-XY3rcxROoE_u8JasEy_g',
      videoId: '88ed18879dc9b40d935859af3b960da1',
      pepper: 'c-XY3rcxROoE_u8JasEy_g'
    },
    {
      name: 'Второй отзыв',
      role: 'Участник игры «Система»',
      quote: '',
      thumbnail: 'https://pic.rtbcdn.ru/video/2026-07-06/fd/b5/fdb5bdd64c7c14f99a1e519ca6835154.jpg',
      videoUrl: 'https://rutube.ru/play/embed/32f51c3986c825cf2cf3dc8d1ee68ba1/?p=aSFBBlqe-1xIe1Sg-Vbgpg',
      videoId: '32f51c3986c825cf2cf3dc8d1ee68ba1',
      pepper: 'aSFBBlqe-1xIe1Sg-Vbgpg'
    },
    {
      name: 'Третий отзыв',
      role: 'Участник игры «Система»',
      quote: '',
      thumbnail: 'https://pic.rtbcdn.ru/video/2026-07-06/0f/b1/0fb1a255920702c22404e5f1182bc2c7.jpg',
      videoUrl: 'https://rutube.ru/play/embed/10b5b4ee3aa83195253a93fbcd900d3c/?p=vy0kHEmqTNAmKmQUe5XGZQ',
      videoId: '10b5b4ee3aa83195253a93fbcd900d3c',
      pepper: 'vy0kHEmqTNAmKmQUe5XGZQ'
    },
    {
      name: 'Четвёртый отзыв',
      role: 'Участник игры «Система»',
      quote: '',
      thumbnail: 'https://pic.rtbcdn.ru/video/2026-07-06/95/d6/95d6ed23973dcc4995d166bcf9225b55.jpg',
      videoUrl: 'https://rutube.ru/play/embed/fab9e5984d1c978a655e29563c47868e/?p=HAkQFPMOgQB64wjrWvtAew',
      videoId: 'fab9e5984d1c978a655e29563c47868e',
      pepper: 'HAkQFPMOgQB64wjrWvtAew'
    },
    {
      name: 'Пятый отзыв',
      role: 'Участник игры «Система»',
      quote: '',
      thumbnail: 'https://pic.rtbcdn.ru/video/2026-07-06/56/79/5679025bd677dcdd981bec1424509204.jpg',
      videoUrl: 'https://rutube.ru/play/embed/1041317faa5874ed8c56391a7a80cd90/?p=g2tXYEEu2EyIErxznZxy1A',
      videoId: '1041317faa5874ed8c56391a7a80cd90',
      pepper: 'g2tXYEEu2EyIErxznZxy1A'
    }
  ]
};
