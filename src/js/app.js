/* ALFATEL WEB 2030 — V4.1 PERFORMANCE
   JavaScript por demanda: solo se inicializa cada módulo cuando el usuario lo necesita. */
(function () {
  'use strict';

  var CONFIG = { telefono: '593982246998', endpoint: '/api/consulta' };
  var MENSAJES = {
    base: 'Hola ALFATEL, estoy en su página web y quisiera más información.',
    play: 'Hola ALFATEL, quiero información sobre ALFATEL PLAY.',
    camara: 'Hola ALFATEL, me interesa instalar una cámara ALFACAM.',
    negocio: 'Hola ALFATEL, necesito asesoría para la conectividad de mi negocio.',
    corporativo: 'Hola ALFATEL, necesito información sobre una solución corporativa o institucional.',
    empresarial: 'Hola ALFATEL, deseo hablar con un asesor empresarial sobre una solución de conectividad.',
    oficina: 'Hola ALFATEL, ¿cuál es el horario de atención en la oficina?',
    pagos: 'Hola ALFATEL, quiero consultar mis valores pendientes, formas de pago o información sobre convenios.',
    soporte: 'Hola ALFATEL, necesito soporte técnico para mi servicio de Internet. Por favor, ayúdenme con mi caso.',
    atencion: 'Hola ALFATEL, necesito ayuda de atención al cliente con mi servicio.',
    datos: 'Hola ALFATEL, mi cédula no aparece registrada y quiero actualizar mis datos.'
  };

  var drawer = document.getElementById('drawer');
  var modal = document.getElementById('clientModal');
  var clientReady = false;
  var pickerReady = false;
  var coverageReady = false;
  var lastFocus = null;
  var menuTrigger = document.querySelector('[data-menu][aria-controls="drawer"]');

  function abrirWhatsApp(texto) {
    window.open('https://wa.me/' + CONFIG.telefono + '?text=' + encodeURIComponent(texto), '_blank', 'noopener');
  }

  function setBodyLock(locked) {
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  function focusables(container) {
    if (!container) return [];
    return Array.prototype.slice.call(container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )).filter(function (el) {
      return !el.hidden && el.offsetParent !== null && !el.closest('[inert]');
    });
  }

  function setDrawerState(open, restoreFocus) {
    if (!drawer) return;
    if (!open && drawer.contains(document.activeElement) && menuTrigger) {
      menuTrigger.focus({ preventScroll: true });
    }
    drawer.classList.toggle('open', open);
    if (open) drawer.removeAttribute('inert');
    else drawer.setAttribute('inert', '');
    document.querySelectorAll('[data-menu][aria-controls="drawer"]').forEach(function (button) {
      button.setAttribute('aria-expanded', open ? 'true' : 'false');
      button.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    setBodyLock(open || (modal && modal.classList.contains('open')));
    if (open) {
      lastFocus = document.activeElement;
      window.setTimeout(function () {
        var first = focusables(drawer)[0];
        if (first) first.focus({ preventScroll: true });
      }, 30);
    } else if (restoreFocus && menuTrigger) {
      menuTrigger.focus({ preventScroll: true });
    }
  }

  function alternarMenu() {
    setDrawerState(!(drawer && drawer.classList.contains('open')), true);
  }

  function limpiarModal() {
    var ids = ['resultArea', 'successState', 'errorState'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    var form = document.getElementById('clientForm');
    if (form) form.reset();
  }

  function abrirModal(trigger) {
    if (!modal) return;
    if (!clientReady) initClient();
    lastFocus = trigger || document.activeElement;
    modal.removeAttribute('inert');
    modal.classList.add('open');
    setBodyLock(true);
    window.setTimeout(function () {
      var target = window.innerWidth > 768 ? document.getElementById('cedula') : modal.querySelector('.modal__x');
      if (target) target.focus({ preventScroll: true });
    }, 60);
  }

  function cerrarModal() {
    if (!modal) return;
    var restore = lastFocus;
    if (restore && document.contains(restore) && !restore.closest('[inert]')) restore.focus({ preventScroll: true });
    else if (menuTrigger) menuTrigger.focus({ preventScroll: true });
    modal.classList.remove('open');
    modal.setAttribute('inert', '');
    setBodyLock(drawer && drawer.classList.contains('open'));
    window.setTimeout(limpiarModal, 220);
  }

  function trapFocus(e, container) {
    if (e.key !== 'Tab' || !container) return;
    var items = focusables(container);
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* Un solo listener delegado reemplaza varios listeners globales. */
  document.addEventListener('click', function (e) {
    var modalBtn = e.target.closest('[data-modal]');
    if (modalBtn) {
      e.preventDefault();
      var esCierre = modalBtn.classList.contains('modal__x') || modalBtn.classList.contains('modal__bg');
      if (esCierre) {
        cerrarModal();
        return;
      }
      if (modalBtn.hasAttribute('data-menu') && drawer && drawer.classList.contains('open')) {
        setDrawerState(false, false);
        window.setTimeout(function () { abrirModal(menuTrigger); }, 80);
      } else {
        abrirModal(modalBtn);
      }
      return;
    }

    var menu = e.target.closest('[data-menu]');
    if (menu) { alternarMenu(); return; }

    var wa = e.target.closest('[data-wa]');
    if (wa) {
      e.preventDefault();
      abrirWhatsApp(MENSAJES[wa.dataset.wa] || MENSAJES.base);
      return;
    }

    var plan = e.target.closest('[data-plan-btn]');
    if (plan) {
      e.preventDefault();
      abrirWhatsApp('Hola ALFATEL, me interesa contratar el plan ' + plan.dataset.planBtn + '. ¿Me ayudan con los requisitos y la disponibilidad en mi sector?');
      return;
    }

    var opt = e.target.closest('.opt');
    if (opt) {
      if (!pickerReady) initPicker();
      handlePickerOption(opt);
    }
  });

  document.addEventListener('keydown', function (e) {
    if (modal && modal.classList.contains('open')) {
      if (e.key === 'Escape') cerrarModal();
      else trapFocus(e, modal);
      return;
    }
    if (drawer && drawer.classList.contains('open')) {
      if (e.key === 'Escape') setDrawerState(false, true);
      else trapFocus(e, drawer);
    }
  });

  /* Cobertura se activa únicamente al primer envío. */
  document.addEventListener('submit', function (e) {
    if (e.target && e.target.id === 'formCobertura') {
      e.preventDefault();
      if (!coverageReady) coverageReady = true;
      submitCoverage(e.target);
    }
  });

  function submitCoverage(form) {
    var canton = form.canton.value.trim();
    var sector = form.sector.value.trim();
    var ref = form.ref.value.trim();
    var tipo = form.tipo.value;
    if (!canton) { form.canton.focus(); return; }
    if (!sector) { form.sector.focus(); return; }
    var texto = 'Hola ALFATEL, quiero consultar la cobertura para mi ubicación.\n\n' +
      'Cantón: ' + canton + '\nSector o comunidad: ' + sector + '\nReferencia: ' + (ref || 'no indicada') +
      '\nServicio que necesito: ' + tipo;
    if (tipo.toLowerCase().indexOf('rural') !== -1) {
      texto += '\n\nPuedo enviar una foto del horizonte desde el lugar donde se instalaría la antena para facilitar la revisión de línea de vista.';
    }
    abrirWhatsApp(texto);
  }

  /* Recomendador: no consulta ni recorre el DOM durante la carga inicial. */
  var PLANES = {
    CONECTA: { n: 'CONECTA', precio: '$15', velocidad: '300 Mbps', k: 'HOGAR CONECTA (300 Mbps)' },
    AVANZA: { n: 'AVANZA', precio: '$20', velocidad: '500 Mbps', k: 'HOGAR AVANZA (500 Mbps)' },
    PLAY: { n: 'PLAY', precio: '$25', velocidad: '600 Mbps', k: 'HOGAR PLAY (600 Mbps + TV)' },
    PROTEGE: { n: 'PROTEGE', precio: '$25', velocidad: '600 Mbps', k: 'HOGAR PROTEGE (600 Mbps + cámara)' },
    TOTAL: { n: 'TOTAL', precio: '$30', velocidad: '600 Mbps', k: 'HOGAR TOTAL (600 Mbps + TV + cámara)' }
  };
  var eleccion = { gente: 'pocos', tv: 'no', cam: 'no' };
  var planActual = PLANES.CONECTA.k;

  function etiquetaPersonas(v) { return v === 'muchos' ? '5 o más personas' : (v === 'varios' ? '3 o 4 personas' : '1 o 2 personas'); }
  function construirExplicacion(id) {
    var personas = etiquetaPersonas(eleccion.gente).toLowerCase();
    var p = PLANES[id];
    if (id === 'TOTAL') return 'Ideal para ' + personas + ' que desean internet de alta capacidad, televisión por internet y protección para el hogar. Incluye ' + p.velocidad + ', ALFATEL PLAY y cámara ALFACAM por ' + p.precio + ' al mes.';
    if (id === 'PROTEGE') return 'Ideal para ' + personas + ' que desean internet de alta capacidad y proteger su hogar. Incluye ' + p.velocidad + ' y cámara ALFACAM por ' + p.precio + ' al mes, con monitoreo desde el celular.';
    if (id === 'PLAY') return 'Ideal para ' + personas + ' que disfrutan televisión y entretenimiento por internet. Incluye ' + p.velocidad + ' y ALFATEL PLAY por ' + p.precio + ' al mes.';
    if (id === 'AVANZA') return 'Recomendado para ' + personas + ' y varios dispositivos conectados al mismo tiempo. Incluye ' + p.velocidad + ' por ' + p.precio + ' al mes.';
    return 'Ideal para uno o dos usuarios que necesitan estudiar, trabajar y navegar todos los días. Incluye ' + p.velocidad + ' por ' + p.precio + ' al mes.';
  }
  function recomendar() {
    var id = eleccion.tv === 'si' && eleccion.cam === 'si' ? 'TOTAL' : eleccion.cam === 'si' ? 'PROTEGE' : eleccion.tv === 'si' ? 'PLAY' : eleccion.gente !== 'pocos' ? 'AVANZA' : 'CONECTA';
    var p = PLANES[id];
    var name = document.getElementById('pickName');
    var why = document.getElementById('pickWhy');
    var summary = document.getElementById('pickSummary');
    if (name) name.textContent = p.n;
    if (why) why.textContent = construirExplicacion(id);
    if (summary) {
      summary.replaceChildren.apply(summary, [etiquetaPersonas(eleccion.gente), eleccion.tv === 'si' ? 'Con ALFATEL PLAY' : 'Solo internet', eleccion.cam === 'si' ? 'Con ALFACAM' : 'Sin cámara por ahora'].map(function (text) {
        var span = document.createElement('span'); span.textContent = text; return span;
      }));
    }
    planActual = p.k;
    document.querySelectorAll('.plan[data-plan]').forEach(function (card) { card.classList.toggle('is-pick', card.dataset.plan === id); });
  }
  function handlePickerOption(opt) {
    var grupo = opt.closest('.opts');
    if (!grupo) return;
    grupo.querySelectorAll('.opt').forEach(function (o) { o.setAttribute('aria-pressed', o === opt ? 'true' : 'false'); });
    eleccion[grupo.dataset.group] = opt.dataset.v;
    recomendar();
  }
  function initPicker() {
    if (pickerReady) return;
    pickerReady = true;
    var reset = document.getElementById('pickerReset');
    if (reset) reset.addEventListener('click', function () {
      eleccion = { gente: 'pocos', tv: 'no', cam: 'no' };
      document.querySelectorAll('.opts').forEach(function (grupo) {
        var initial = grupo.dataset.group === 'gente' ? 'pocos' : 'no';
        grupo.querySelectorAll('.opt').forEach(function (o) { o.setAttribute('aria-pressed', o.dataset.v === initial ? 'true' : 'false'); });
      });
      recomendar();
    });
    var pick = document.getElementById('pickBtn');
    if (pick) pick.addEventListener('click', function () {
      abrirWhatsApp('Hola ALFATEL, me interesa contratar el plan ' + planActual + '. ¿Me ayudan con los requisitos y la disponibilidad en mi sector?');
    });
  }

  /* Zona clientes: se conecta al formulario solo al abrir el modal. */
  function initClient() {
    if (clientReady) return;
    clientReady = true;
    var datosCliente = null;
    var form = document.getElementById('clientForm');
    var pay = document.getElementById('btnPagar');
    function byId(id) { return document.getElementById(id); }
    function cargando(active) {
      byId('btnText').textContent = active ? 'Consultando…' : 'Consultar';
      byId('btnLoader').classList.toggle('hidden', !active);
      byId('btnIcon').classList.toggle('hidden', active);
      if (active) ['resultArea', 'successState', 'errorState'].forEach(function (id) { byId(id).classList.add('hidden'); });
    }
    function mostrarError(title, msg, button) {
      byId('resultArea').classList.remove('hidden'); byId('errorState').classList.remove('hidden');
      byId('errTitle').textContent = title; byId('errMsg').textContent = msg; byId('errBtn').style.display = button ? '' : 'none';
    }
    function mostrarResultado(d) {
      datosCliente = d;
      var deuda = Number(d.deuda || 0), pending = Number(d.facturasPendientes || 0), alDia = deuda <= 0.10;
      byId('resultArea').classList.remove('hidden'); byId('successState').classList.remove('hidden');
      byId('clientName').textContent = d.nombre || 'Cliente ALFATEL';
      byId('clientBalance').textContent = d.deudaFormateada || ('$' + deuda.toFixed(2));
      byId('clientInvoices').textContent = String(pending);
      var badge = byId('clientStatus'), status = byId('clientPaymentStatus'), avatar = document.querySelector('.res__av');
      badge.textContent = alDia ? 'AL DÍA' : 'PENDIENTE'; badge.style.background = alDia ? '#E4F6EA' : '#FDE8E8'; badge.style.color = alDia ? '#15803D' : '#B91C1C';
      status.textContent = alDia ? 'Al día' : 'Pago pendiente'; status.style.color = badge.style.color;
      if (avatar) { avatar.style.background = badge.style.background; avatar.style.color = badge.style.color; }
      byId('btnPagarTxt').textContent = alDia ? 'Escribirnos por WhatsApp' : 'Coordinar mi pago';
    }
    if (pay) pay.addEventListener('click', function () {
      if (!datosCliente) { abrirWhatsApp(MENSAJES.base); return; }
      var deuda = Number(datosCliente.deuda || 0);
      abrirWhatsApp(deuda > 0.10 ? 'Hola ALFATEL, quiero coordinar el pago de mi factura.\n\nTitular: ' + (datosCliente.nombre || '') + '\nCédula: ' + (datosCliente.cedula || '') + '\nValor pendiente: ' + (datosCliente.deudaFormateada || ('$' + deuda.toFixed(2))) + '\nFacturas pendientes: ' + (datosCliente.facturasPendientes || 0) : 'Hola ALFATEL, consulté mi estado y aparezco al día. Quisiera hacer una consulta.\n\nTitular: ' + (datosCliente.nombre || '') + '\nCédula: ' + (datosCliente.cedula || ''));
    });
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = byId('cedula').value.trim();
      if (!/^\d{6,13}$/.test(value)) { mostrarError('Revise la cédula', 'Ingrese solo los números de su cédula, sin puntos ni guiones.', false); return; }
      if (!byId('terms').checked) { byId('terms').focus(); return; }
      cargando(true);
      fetch(CONFIG.endpoint + '?cedula=' + encodeURIComponent(value)).then(function (r) {
        if (r.status === 404) { mostrarError('Cédula no registrada', 'No encontramos esta cédula en el sistema. Si usted es cliente, ayúdenos a actualizar sus datos.', true); return null; }
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(function (d) { if (d) mostrarResultado(d); }).catch(function () {
        mostrarError('No pudimos conectarnos', 'Hubo un problema al consultar. Intente de nuevo en unos minutos o escríbanos por WhatsApp.', true);
      }).finally(function () { cargando(false); });
    });
  }

  /* Animaciones y footer se activan al primer desplazamiento, no durante LCP. */
  var visualReady = false;
  function initVisuals() {
    if (visualReady) return;
    visualReady = true;
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { if (entry.isIntersecting) { entry.target.classList.add('in'); observer.unobserve(entry.target); } });
      }, { threshold: 0.08, rootMargin: '160px 0px -4% 0px' });
      document.querySelectorAll('.rv').forEach(function (el) { observer.observe(el); });
      var footer = document.querySelector('.foot--premium');
      if (footer) {
        var footerObserver = new IntersectionObserver(function (entries) { footer.classList.toggle('foot--active', entries[0].isIntersecting); }, { threshold: 0.25 });
        footerObserver.observe(footer);
      }
    } else document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('in'); });
  }
  window.addEventListener('scroll', initVisuals, { passive: true, once: true });
  window.addEventListener('pointerdown', initVisuals, { passive: true, once: true });

  var year = document.getElementById('anio');
  if (year) year.textContent = new Date().getFullYear();
})();
