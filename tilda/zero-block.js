(function () {
  'use strict';

  var config = window.SITE_CONFIG || {};
  var payment = config.payment || {};
  var reviews = config.reviews || [];
  var links = config.links || {};

  /* ---- Init config values on page ---- */
  function formatPrice(price) {
    return Number(price).toLocaleString('ru-RU');
  }

  function initPricing() {
    if (!payment.enabled) return;

    var priceStr = formatPrice(payment.price || 0) + ' ' + (payment.currency || '₽');

    var els = {
      priceDisplay: document.getElementById('priceDisplay'),
      currencyDisplay: document.getElementById('currencyDisplay'),
      priceLabel: document.getElementById('priceLabel'),
      modalPrice: document.getElementById('modalPrice'),
      modalPriceConfirm: document.getElementById('modalPriceConfirm')
    };

    if (els.priceDisplay) els.priceDisplay.textContent = formatPrice(payment.price || 0);
    if (els.currencyDisplay) els.currencyDisplay.textContent = payment.currency || '₽';
    if (els.priceLabel) els.priceLabel.textContent = payment.label || '';
    if (els.modalPrice) els.modalPrice.textContent = priceStr;
    if (els.modalPriceConfirm) els.modalPriceConfirm.textContent = priceStr;
  }

  /* ---- Reviews grid ---- */
  function getYouTubeThumb(url) {
    var match = url.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (match) return 'https://img.youtube.com/vi/' + match[1] + '/hqdefault.jpg';
    return '';
  }

  function renderReviews() {
    var grid = document.getElementById('reviewsGrid');
    if (!grid || !reviews.length) return;

    grid.innerHTML = reviews.map(function (review, i) {
      var thumb = review.thumbnail || getYouTubeThumb(review.videoUrl) || '';
      var thumbStyle = thumb ? 'background-image:url(' + thumb + ')' : '';

      return (
        '<article class="review-card reveal" data-video-index="' + i + '">' +
          '<div class="review-card__video" style="' + thumbStyle + '">' +
            '<button class="review-card__play" aria-label="Смотреть отзыв ' + review.name + '">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
            '</button>' +
          '</div>' +
          '<div class="review-card__body">' +
            '<p class="review-card__quote">«' + review.quote + '»</p>' +
            '<p class="review-card__name">' + review.name + '</p>' +
            '<p class="review-card__role">' + review.role + '</p>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    grid.querySelectorAll('.review-card').forEach(function (card) {
      card.addEventListener('click', function () {
        var idx = parseInt(card.getAttribute('data-video-index'), 10);
        openVideoModal(reviews[idx]);
      });
    });

    observeReveals(grid.querySelectorAll('.reveal'));
  }

  /* ---- Video modal ---- */
  var videoModal = document.getElementById('videoModal');
  var videoFrame = document.getElementById('videoFrame');
  var videoInfo = document.getElementById('videoInfo');

  function openVideoModal(review) {
    if (!review || !videoModal) return;

    if (!review.videoUrl) {
      videoFrame.src = '';
      videoInfo.innerHTML = '<strong>' + review.name + '</strong> — видео скоро будет добавлено';
      videoModal.classList.add('open');
      videoModal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      return;
    }

    videoFrame.src = review.videoUrl + (review.videoUrl.indexOf('?') > -1 ? '&' : '?') + 'autoplay=1';
    videoInfo.innerHTML = '<strong>' + review.name + '</strong> — ' + review.role;
    videoModal.classList.add('open');
    videoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    if (!videoModal) return;
    videoModal.classList.remove('open');
    videoModal.setAttribute('aria-hidden', 'true');
    videoFrame.src = '';
    document.body.style.overflow = '';
  }

  document.querySelectorAll('[data-video-close]').forEach(function (el) {
    el.addEventListener('click', closeVideoModal);
  });

  /* ---- Registration modal ---- */
  var modal = document.getElementById('modal');
  var form = document.getElementById('regForm');
  var step1 = document.getElementById('modalStep1');
  var step2 = document.getElementById('modalStep2');
  var stepDev = document.getElementById('modalStepDev');
  var payBtn = document.getElementById('payBtn');
  var savedFormData = null;

  function resetModal() {
    if (step1) step1.hidden = false;
    if (step2) step2.hidden = true;
    if (stepDev) stepDev.hidden = true;
    if (form) {
      form.reset();
      form.hidden = false;
    }
    savedFormData = null;
  }

  function openModal() {
    resetModal();
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    resetModal();
  }

  document.querySelectorAll('[data-modal-open]').forEach(function (btn) {
    btn.addEventListener('click', openModal);
  });

  document.querySelectorAll('[data-modal-close]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (modal && modal.classList.contains('open')) closeModal();
      if (videoModal && videoModal.classList.contains('open')) closeVideoModal();
    }
  });

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      savedFormData = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        telegram: form.telegram.value.trim()
      };

      /* TILDA: здесь отправка в Tilda Forms / webhook / CRM */
      console.log('Registration:', savedFormData);

      step1.hidden = true;

      if (payment.enabled && payment.paymentUrl) {
        step2.hidden = false;
      } else {
        stepDev.hidden = false;
      }
    });
  }

  if (payBtn) {
    payBtn.addEventListener('click', function () {
      if (!payment.paymentUrl) return;

      var url = payment.paymentUrl;
      var params = new URLSearchParams();

      if (savedFormData) {
        if (savedFormData.name) params.set('name', savedFormData.name);
        if (savedFormData.phone) params.set('phone', savedFormData.phone);
        if (savedFormData.telegram) params.set('telegram', savedFormData.telegram);
      }

      if (payment.successUrl) params.set('success_url', payment.successUrl);

      var qs = params.toString();
      if (qs) url += (url.indexOf('?') > -1 ? '&' : '?') + qs;

      window.location.href = url;
    });
  }

  /* ---- Footer / links from config ---- */
  function initLinks() {
    if (links.telegram) {
      document.querySelectorAll('a[href="https://t.me/"]').forEach(function (a) {
        a.href = links.telegram;
      });
    }
  }

  /* ---- Mobile menu ---- */
  var burger = document.getElementById('burger');
  var mobileMenu = document.getElementById('mobileMenu');

  if (burger && mobileMenu) {
    burger.addEventListener('click', function () {
      burger.classList.toggle('active');
      mobileMenu.classList.toggle('open');
    });

    mobileMenu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        burger.classList.remove('active');
        mobileMenu.classList.remove('open');
      });
    });
  }

  /* ---- Header scroll ---- */
  var header = document.getElementById('header');

  window.addEventListener('scroll', function () {
    if (!header) return;
    if (window.scrollY > 40) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
  }, { passive: true });

  /* ---- Reveal on scroll ---- */
  function observeReveals(elements) {
    var els = elements || document.querySelectorAll('.reveal');

    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      els.forEach(function (el) { observer.observe(el); });
    } else {
      els.forEach(function (el) { el.classList.add('visible'); });
    }
  }

  /* ---- Phone mask ---- */
  var phoneInput = document.querySelector('input[name="phone"]');
  if (phoneInput) {
    phoneInput.addEventListener('input', function () {
      var digits = this.value.replace(/\D/g, '');
      if (digits.startsWith('8')) digits = '7' + digits.slice(1);
      if (!digits.startsWith('7')) digits = '7' + digits;

      var formatted = '+7';
      if (digits.length > 1) formatted += ' (' + digits.slice(1, 4);
      if (digits.length >= 4) formatted += ') ' + digits.slice(4, 7);
      if (digits.length >= 7) formatted += '-' + digits.slice(7, 9);
      if (digits.length >= 9) formatted += '-' + digits.slice(9, 11);

      this.value = formatted;
    });
  }

  /* ---- Event video (видео с мероприятия) ---- */
  function initEventVideo() {
    var ev = config.eventVideo || {};
    var images = config.images || {};

    var titleEl = document.getElementById('eventVideoTitle');
    var subtitleEl = document.getElementById('eventVideoSubtitle');
    var posterImg = document.getElementById('eventVideoPosterImg');
    var playBtn = document.getElementById('eventVideoPlay');
    var poster = document.getElementById('eventVideoPoster');
    var embedWrap = document.getElementById('eventVideoEmbed');

    if (titleEl && ev.title) titleEl.textContent = ev.title;
    if (subtitleEl && ev.subtitle) subtitleEl.textContent = ev.subtitle;

    var posterSrc = ev.poster || images.gameSession || 'assets/game-session.jpg';
    if (posterImg) posterImg.src = posterSrc;

    if (playBtn && poster && embedWrap) {
      playBtn.addEventListener('click', function () {
        if (!ev.videoUrl) {
          openVideoModal({
            name: 'Игра «Система»',
            role: 'Видео с мероприятия',
            videoUrl: ''
          });
          if (videoInfo) {
            videoInfo.innerHTML = 'Видео с игры будет добавлено в <code>config.js → eventVideo.videoUrl</code>';
          }
          return;
        }
        poster.hidden = true;
        embedWrap.hidden = false;
        embedWrap.innerHTML = '<iframe src="' + ev.videoUrl + '?autoplay=1" title="' + (ev.title || 'Видео с игры') + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
      });
    }
  }

  /* ---- Images from config ---- */
  function initImages() {
    var images = config.images || {};
    if (images.logo) {
      ['logoHeader', 'logoCta', 'logoFooter'].forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.src = images.logo;
      });
    }
    if (images.author) {
      var authorPhoto = document.getElementById('authorPhoto');
      if (authorPhoto) authorPhoto.src = images.author;
    }
  }

  /* ---- Init ---- */
  initPricing();
  renderReviews();
  initLinks();
  initImages();
  initEventVideo();
  observeReveals();
})();
