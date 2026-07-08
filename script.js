(function () {
  'use strict';

  var config = window.SITE_CONFIG || {};
  var payment = config.payment || {};
  var event = config.event || {};
  var reviews = config.reviews || [];
  var links = config.links || {};

  /* ---- Init config values on page ---- */
  function formatPrice(price) {
    return Number(price).toLocaleString('ru-RU');
  }

  function initPricing() {
    var modalPriceTag = document.querySelector('#modalStep1 .modal__price-tag');
    var pricingSecure = document.querySelector('.pricing__secure');
    var priceEl = document.querySelector('.pricing__price');
    var priceNote = document.getElementById('priceLabel');

    if (!payment.enabled) {
      if (priceEl) priceEl.hidden = true;
      if (priceNote) priceNote.hidden = true;
      if (modalPriceTag) modalPriceTag.hidden = true;
      if (pricingSecure) pricingSecure.hidden = true;
      return;
    }

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
  function toEmbedUrl(url, videoId, pepper) {
    if (videoId && pepper) {
      return 'https://rutube.ru/play/embed/' + videoId + '/?p=' + encodeURIComponent(pepper);
    }

    if (!url) return '';

    var privateMatch = url.match(/rutube\.ru\/video\/private\/([a-f0-9]+)\/?\?(?:.*&)?p=([^&]+)/i);
    if (privateMatch) {
      return 'https://rutube.ru/play/embed/' + privateMatch[1] + '/?p=' + encodeURIComponent(privateMatch[2]);
    }

    var publicMatch = url.match(/rutube\.ru\/video\/([a-f0-9]+)/i);
    if (publicMatch && url.indexOf('/play/embed/') === -1) {
      return 'https://rutube.ru/play/embed/' + publicMatch[1] + '/';
    }

    return url;
  }

  function rutubeCommand(frame, type, data) {
    if (!frame || !frame.contentWindow) return;
    try {
      var payload = { type: type };
      if (data !== undefined) payload.data = data;
      frame.contentWindow.postMessage(JSON.stringify(payload), '*');
    } catch (err) { /* iframe may not be ready yet */ }
  }

  function rutubePlay(frame, unmuted) {
    rutubeCommand(frame, 'player:play');
    rutubeCommand(frame, unmuted ? 'player:unMute' : 'player:mute');
  }

  function buildVideoSrc(url, muted, videoId, pepper) {
    var embed = toEmbedUrl(url, videoId, pepper);
    if (!embed) return '';

    var params = ['autoplay=1'];
    if (muted) {
      params.push('mute=1', 'autostartmute=true');
    }

    return embed + (embed.indexOf('?') > -1 ? '&' : '?') + params.join('&');
  }

  function getYouTubeThumb(url) {
    var match = url.match(/embed\/([a-zA-Z0-9_-]+)/);
    if (match && url.indexOf('rutube') === -1) {
      return 'https://img.youtube.com/vi/' + match[1] + '/hqdefault.jpg';
    }
    return '';
  }

  function renderReviews() {
    var grid = document.getElementById('reviewsGrid');
    if (!grid || !reviews.length) return;

    grid.innerHTML = reviews.map(function (review, i) {
      var thumb = review.thumbnail || getYouTubeThumb(review.videoUrl) || '';

      return (
        '<article class="review-card review-card--shorts reveal" data-video-index="' + i + '">' +
          '<div class="review-card__video">' +
            (thumb
              ? '<img class="review-card__thumb" src="' + thumb + '" alt="' + review.name + '" loading="lazy">'
              : '') +
            '<button class="review-card__play" aria-label="Смотреть: ' + review.name + '">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
            '</button>' +
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
    loadReviewThumbnails();
  }

  /* Подгрузка обложек с Rutube API, если не заданы в config */
  function loadReviewThumbnails() {
    reviews.forEach(function (review, i) {
      if (review.thumbnail || !review.videoId) return;

      var apiUrl = 'https://rutube.ru/api/video/' + review.videoId + '/';
      if (review.pepper) apiUrl += '?p=' + review.pepper;

      fetch(apiUrl)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          if (!data.thumbnail_url) return;
          var card = document.querySelector('.review-card[data-video-index="' + i + '"]');
          if (!card) return;
          var video = card.querySelector('.review-card__video');
          var existing = card.querySelector('.review-card__thumb');
          if (existing) {
            existing.src = data.thumbnail_url;
          } else if (video) {
            var img = document.createElement('img');
            img.className = 'review-card__thumb';
            img.src = data.thumbnail_url;
            img.alt = review.name;
            img.loading = 'lazy';
            video.insertBefore(img, video.firstChild);
          }
          if (data.title && review.name.indexOf('отзыв') === -1) {
            var nameEl = card.querySelector('.review-card__name');
            if (nameEl) nameEl.textContent = data.title;
          }
        })
        .catch(function () {});
    });
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

    videoFrame.src = buildVideoSrc(review.videoUrl);
    videoInfo.innerHTML = '<strong>' + review.name + '</strong> — ' + review.role;
    videoModal.classList.add('modal--shorts', 'open');
    videoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    if (!videoModal) return;
    videoModal.classList.remove('open', 'modal--shorts');
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
  var formConfig = config.form || {};
  var formError = document.getElementById('formError');

  function resetModal() {
    if (step1) step1.hidden = false;
    if (step2) step2.hidden = true;
    if (stepDev) stepDev.hidden = true;
    if (form) {
      form.reset();
      form.hidden = false;
    }
    savedFormData = null;
    if (formError) {
      formError.textContent = '';
      formError.hidden = true;
    }
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

  function showFormStepAfterSubmit() {
    if (step1) step1.hidden = true;
    if (step2) step2.hidden = true;

    if (payment.enabled && payment.paymentUrl) {
      goToPayment();
      return;
    }

    if (stepDev) {
      var successTitle = formConfig.successTitle || 'Спасибо!';
      var successMessage = formConfig.successMessage || 'Заявка отправлена. Мы свяжемся с вами в ближайшее время.';

      var titleEl = stepDev.querySelector('.modal__title');
      var subtitleEl = stepDev.querySelector('.modal__subtitle');
      if (titleEl) titleEl.textContent = successTitle;
      if (subtitleEl) subtitleEl.textContent = successMessage;

      stepDev.hidden = false;
    }
  }

  function buildPaymentUrl() {
    if (!payment.paymentUrl) return '';

    var url = payment.paymentUrl;
    var params = new URLSearchParams();

    if (savedFormData) {
      if (savedFormData.name) params.set('name', savedFormData.name);
      if (savedFormData.phone) params.set('phone', savedFormData.phone);
      if (savedFormData.telegram) params.set('telegram', savedFormData.telegram);
    }

    if (payment.successUrl) params.set('success_url', payment.successUrl);

    var qs = params.toString();
    return qs ? url + (url.indexOf('?') > -1 ? '&' : '?') + qs : url;
  }

  function goToPayment() {
    var url = buildPaymentUrl();
    if (!url) return false;
    window.location.href = url;
    return true;
  }

  function showFormError(message) {
    if (!formError) return;
    formError.textContent = message;
    formError.hidden = false;
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (formError) {
        formError.textContent = '';
        formError.hidden = true;
      }

      savedFormData = {
        name: form.name.value.trim(),
        phone: form.phone.value.trim(),
        telegram: form.telegram.value.trim(),
        consentMailing: !!(form.consent_mailing && form.consent_mailing.checked)
      };

      var endpoint = formConfig.endpoint;
      if (!endpoint) {
        showFormStepAfterSubmit();
        return;
      }

      var submitBtn = form.querySelector('button[type="submit"]');
      var btnText = submitBtn ? submitBtn.textContent : '';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка…';
      }

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: savedFormData.name,
          phone: savedFormData.phone,
          telegram: savedFormData.telegram,
          consentMailing: savedFormData.consentMailing,
          event: {
            date: event.date,
            time: event.time,
            city: event.city,
            format: event.format,
            price: payment.price,
            currency: payment.currency
          }
        })
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok || !result.data.ok) {
            throw new Error(result.data.error || 'submit_failed');
          }

          if (payment.enabled && payment.paymentUrl) {
            if (submitBtn) submitBtn.textContent = 'Переход к оплате…';
            goToPayment();
            return;
          }

          showFormStepAfterSubmit();
        })
        .catch(function () {
          showFormError('Не удалось отправить заявку. Попробуйте ещё раз или напишите в Telegram.');
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = btnText;
          }
        });
    });
  }

  if (payBtn) {
    payBtn.addEventListener('click', function () {
      goToPayment();
    });
  }

  /* ---- Footer / links from config ---- */
  function initLinks() {
    var tg = document.getElementById('linkTelegram');
    if (tg && links.telegram) tg.href = links.telegram;

    var ask = document.getElementById('linkAskQuestion');
    if (ask && links.askTelegram) ask.href = links.askTelegram;

    var yt = document.getElementById('linkYoutube');
    if (yt && links.youtube) yt.href = links.youtube;
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

  /* ---- Event info ---- */
  function initEvent() {
    if (!event.date) return;

    var dateCity = event.date + (event.city ? ' · ' + event.city : '');
    var timeFormat = [event.time, event.format].filter(Boolean).join(' · ');

    var headerDate = document.getElementById('headerDate');
    if (headerDate) {
      var svg = headerDate.querySelector('svg');
      headerDate.textContent = '';
      if (svg) headerDate.appendChild(svg);
      headerDate.appendChild(document.createTextNode(' ' + dateCity));
    }

    var heroMeta = document.getElementById('heroMeta');
    if (heroMeta) {
      var items = [event.date, event.time];
      if (event.address) items.push(event.address);
      else if (event.city && event.format) items.push(event.city + ' · ' + event.format);
      else if (event.city || event.format) items.push(event.city || event.format);
      if (event.address && event.format) items.push(event.format);
      heroMeta.innerHTML = items.map(function (item) {
        return '<span class="hero__meta-item">' + item + '</span>';
      }).join('');
    }

    var ctaDate = document.getElementById('ctaDate');
    if (ctaDate) ctaDate.textContent = event.date;

    var ctaSeats = document.getElementById('ctaSeats');
    if (ctaSeats) {
      var ctaParts = [event.time, event.format].filter(Boolean);
      if (event.address) ctaParts.unshift(event.address);
      else if (event.city) ctaParts.unshift(event.city);
      ctaSeats.textContent = ctaParts.join(' · ');
    }

    var modalSubtitle = document.getElementById('modalSubtitle');
    if (modalSubtitle) {
      var parts = ['«Система»', event.date, event.city, event.time ? event.time.split('–')[0] : ''].filter(Boolean);
      modalSubtitle.textContent = parts.join(' · ');
    }

    var pricingDesc = document.getElementById('pricingDesc');
    if (pricingDesc && event.city) {
      var location = event.address || event.city;
      var desc = 'Места ограничены. ' + event.format + ' — ' + location + ', ' + event.date + ', ' + event.time + '.';
      pricingDesc.textContent = payment.enabled
        ? desc + ' После регистрации — оплата и подтверждение участия.'
        : desc + ' Оставьте заявку — мы свяжемся с вами и подтвердим участие.';
    }

    var pricingLocation = document.getElementById('pricingLocation');
    if (pricingLocation && event.address) pricingLocation.textContent = event.address;

    document.title = document.title.replace(/· \d+ июля[^·]*/, '· ' + event.date + (event.city ? ' · ' + event.city : ''));
  }

  /* ---- About video (секция #about) ---- */
  function initAboutVideo() {
    var av = config.aboutVideo || {};
    var frame = document.getElementById('aboutVideoFrame');
    var player = document.getElementById('aboutVideo');

    if (!frame || (!av.videoUrl && !av.videoId)) return;

    var embedSrc = buildVideoSrc(av.videoUrl, true, av.videoId, av.pepper);
    var playerReady = false;

    function onPlayerMessage(event) {
      if (event.origin !== 'https://rutube.ru') return;

      try {
        var message = JSON.parse(event.data);
        if (message.type === 'player:ready') {
          playerReady = true;
          rutubePlay(frame, false);
        }
      } catch (err) { /* ignore non-JSON messages */ }
    }

    window.addEventListener('message', onPlayerMessage);

    frame.src = embedSrc;

    if (player) {
      player.addEventListener('click', function () {
        if (player.classList.contains('is-unmuted')) return;

        rutubePlay(frame, true);
        player.classList.add('is-unmuted');
      });
    }
  }

  /* ---- Event photo (секция #event-video) ---- */
  function initEventVideo() {
    var ev = config.eventVideo || {};
    var images = config.images || {};

    var titleEl = document.getElementById('eventVideoTitle');
    var subtitleEl = document.getElementById('eventVideoSubtitle');
    var posterImg = document.getElementById('eventVideoPosterImg');

    if (titleEl && ev.title) titleEl.textContent = ev.title;
    if (subtitleEl && ev.subtitle) subtitleEl.textContent = ev.subtitle;

    var posterSrc = ev.poster || images.gameSession || 'assets/game-session.jpg';
    if (posterImg) posterImg.src = posterSrc;
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
  initEvent();
  renderReviews();
  initLinks();
  initImages();
  initAboutVideo();
  initEventVideo();
  observeReveals();
})();
