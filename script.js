document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Mobile nav (no-op si absent de la page) ---------- */
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.querySelector('.main-nav');
  navToggle?.addEventListener('click', () => {
    mainNav?.classList.toggle('open');
  });

  /* ---------- Bandeau cookies (widget Calendly) — affiché une fois, mémorisé en localStorage ---------- */
  const COOKIE_NOTICE_KEY = 'braxton_cookie_notice_dismissed';
  try {
    if (!localStorage.getItem(COOKIE_NOTICE_KEY)) {
      const notice = document.createElement('div');
      notice.className = 'cookie-notice';
      notice.innerHTML = `
        <p>Ce site intègre le widget de prise de rendez-vous Calendly, susceptible de déposer des cookies. En savoir plus dans notre <a href="confidentialite.html">politique de confidentialité</a>.</p>
        <button type="button" class="cookie-notice-ok">Compris</button>
      `;
      document.body.appendChild(notice);
      notice.querySelector('.cookie-notice-ok').addEventListener('click', () => {
        try { localStorage.setItem(COOKIE_NOTICE_KEY, '1'); } catch (err) {}
        notice.remove();
      });
    }
  } catch (err) {
    // localStorage indisponible (navigation privée stricte, etc.) : on n'affiche pas le bandeau plutôt que de le réafficher en boucle.
  }

  /* ---------- "Planifier un appel" / "Prendre RDV" -> Calendly popup ----------
     Page-agnostic : s'applique partout où un .calendly-cta existe. */
  document.querySelectorAll('.calendly-cta').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.Calendly) {
        window.Calendly.initPopupWidget({ url: 'https://calendly.com/maxime-braxtonam/30min' });
      } else {
        // Calendly script not loaded yet (slow connection) — fall back to opening in a new tab.
        window.open('https://calendly.com/maxime-braxtonam/30min', '_blank');
      }
    });
  });

  /* ============================================================
     FORMULAIRE FINANCEMENT (financement.html uniquement)
     ============================================================ */
  const form = document.getElementById('multiStepForm');
  if (form) {
    const steps = Array.from(form.querySelectorAll('.form-step'));
    const stepIndicators = Array.from(document.querySelectorAll('.step-item'));
    const progressBar = document.getElementById('stepsProgress');
    const btnBack = document.getElementById('btnBack');
    const btnNext = document.getElementById('btnNext');
    const stepHint = document.getElementById('stepHint');
    const formSuccess = document.getElementById('formSuccess');
    const totalSteps = steps.length;
    let currentStep = 1;

    // Présélection du "besoin" depuis les CTA des cartes solutions
    // (ex: financement.html?besoin=dette#leadForm)
    const BESOIN_MAP = {
      dette: 'Financement rapide (Dette / Substitution banque)',
      equity: "J'ai la dette bancaire, je cherche l'apport (Quasi-fonds propres)",
      portage: "J'ai un besoin de trésorerie urgent (Portage foncier)",
    };
    const besoinParam = new URLSearchParams(location.search).get('besoin');
    if (besoinParam && BESOIN_MAP[besoinParam]) {
      const besoinSelect = document.getElementById('besoin');
      if (besoinSelect) besoinSelect.value = BESOIN_MAP[besoinParam];
    }

    function showStep(n) {
      steps.forEach(s => s.classList.toggle('active', Number(s.dataset.step) === n));
      stepIndicators.forEach(el => {
        const idx = Number(el.dataset.stepIndicator);
        el.classList.toggle('active', idx === n);
        el.classList.toggle('done', idx < n);
      });
      progressBar.style.width = (n / totalSteps * 100) + '%';
      btnBack.hidden = n === 1;
      btnNext.textContent = n === totalSteps
        ? 'Soumettre mon projet (Réponse sous 48h)'
        : (n === 1 ? 'Démarrer mon étude →' : 'Continuer →');
      stepHint.textContent = `Étape ${n} sur ${totalSteps} — Cela prend moins de 2 minutes`;
    }

    function validateStep(n) {
      const stepEl = steps.find(s => Number(s.dataset.step) === n);
      const fields = stepEl.querySelectorAll('input[required], select[required]');
      for (const field of fields) {
        if (!field.value) {
          field.reportValidity();
          return false;
        }
      }
      return true;
    }

    btnBack.addEventListener('click', () => {
      if (currentStep > 1) {
        currentStep -= 1;
        showStep(currentStep);
      }
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!validateStep(currentStep)) return;

      if (currentStep < totalSteps) {
        currentStep += 1;
        showStep(currentStep);
        return;
      }

      // Final step: submit to Formspree.
      const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdaryoyo';
      btnNext.disabled = true;
      btnNext.textContent = 'Envoi en cours...';

      // Crée en parallèle la ligne correspondante dans la base Dealflow (Notion),
      // assignée à JB. Ne bloque jamais l'envoi du formulaire si ça échoue.
      const formData = new FormData(form);
      const dealflowPayload = Object.fromEntries(formData.entries());
      delete dealflowPayload.fileUpload; // fichier géré par Formspree, pas par Notion
      dealflowPayload.offre = 'financement'; // tag pour trier les leads (A) vs (B)
      fetch('/.netlify/functions/dealflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealflowPayload),
      }).catch((err) => console.error('Dealflow sync failed', err));

      fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      })
        .then((response) => {
          if (!response.ok) throw new Error('Submission failed');
          form.hidden = true;
          document.querySelector('.steps-bar').hidden = true;
          document.querySelector('.steps-track').hidden = true;
          formSuccess.hidden = false;
          formSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .catch(() => {
          btnNext.disabled = false;
          btnNext.textContent = 'Réessayer →';
        });
    });

    showStep(currentStep);

    /* ---------- File dropzone ---------- */
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileUpload');
    const dropzoneText = document.getElementById('dropzoneText');

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) dropzoneText.textContent = fileInput.files[0].name;
    });

    ['dragenter', 'dragover'].forEach(evt =>
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); })
    );
    ['dragleave', 'drop'].forEach(evt =>
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); })
    );
    dropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer.files[0];
      if (file) {
        fileInput.files = e.dataTransfer.files;
        dropzoneText.textContent = file.name;
      }
    });
  }

  /* ============================================================
     FORMULAIRE BRAXTON LAB (lab.html uniquement)
     ============================================================ */
  const labForm = document.getElementById('labForm');
  if (labForm) {
    const labSuccess = document.getElementById('labFormSuccess');
    const labSubmitBtn = document.getElementById('labSubmitBtn');

    labForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fields = labForm.querySelectorAll('input[required], select[required], textarea[required]');
      for (const field of fields) {
        if (!field.value) { field.reportValidity(); return; }
      }

      const FORMSPREE_ENDPOINT = 'https://formspree.io/f/mdaryoyo';
      labSubmitBtn.disabled = true;
      labSubmitBtn.textContent = 'Envoi en cours...';

      const formData = new FormData(labForm);
      // Tag distinct pour trier les leads (A) financement vs (B) partenariat entrepreneurial
      formData.append('_subject', 'Nouvelle demande — Braxton Lab (partenariat entrepreneurial)');
      formData.append('offre', 'lab');

      const dealflowPayload = Object.fromEntries(formData.entries());
      delete dealflowPayload.deck; // fichier gere par Formspree, pas par Notion
      fetch('/.netlify/functions/dealflow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dealflowPayload),
      }).catch((err) => console.error('Dealflow sync failed', err));

      fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
      })
        .then((response) => {
          if (!response.ok) throw new Error('Submission failed');
          labForm.hidden = true;
          labSuccess.hidden = false;
          labSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        })
        .catch(() => {
          labSubmitBtn.disabled = false;
          labSubmitBtn.textContent = 'Réessayer →';
        });
    });
  }

  /* ============================================================
     FAQ accordion (lab.html)
     ============================================================ */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const btn = item.querySelector('.faq-question');
    btn?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(o => { if (o !== item) o.classList.remove('open'); });
      item.classList.toggle('open', !isOpen);
    });
  });
});
