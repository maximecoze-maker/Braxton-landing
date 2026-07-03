# Braxton — Guide de déploiement

## 0. Ce qui a été livré

```
braxton-landing/
├── index.html   → structure de la page (header, hero + formulaire, solutions, LTV, footer)
├── style.css    → tous les styles (couleurs, polices, responsive)
├── script.js    → logique du formulaire multi-étapes + menu mobile
└── assets/      → dossier vide, prêt pour vos images/logos
```

Couleurs et polices ont été extraites directement du site original (vert `#005F52`,
or `#DDA73C`, fond crème `#FBFAF9`, titres en **Montserrat**, texte en **Inter**) pour un rendu identique.

Contrairement à l'original, **le formulaire fonctionne correctement** : la navigation
entre les 3 étapes (coordonnées → projet → documentation) est opérationnelle, avec
validation des champs obligatoires. En revanche, l'étape finale ne fait pour l'instant
qu'afficher un message de succès local — elle n'envoie encore les données nulle part
(voir étape 3 ci-dessous, c'est la partie la plus importante à traiter avant la mise en ligne).

---

## Étape 1 — Vérifier le rendu en local

Double-cliquez sur `index.html` : il s'ouvre directement dans votre navigateur.
Parcourez la page, testez le formulaire jusqu'au bout, vérifiez sur mobile en
réduisant la fenêtre du navigateur.

Si vous voulez un rendu plus fidèle (avec rechargement automatique pendant que vous
éditez), installez l'extension **Live Server** dans VS Code, ou lancez un petit
serveur local :

```bash
cd braxton-landing
python -m http.server 8000
# puis ouvrez http://localhost:8000
```

---

## Étape 2 — Personnaliser le contenu

Avant d'aller plus loin, relisez `index.html` et adaptez si besoin :
- Textes (accroche, description des 3 solutions, plages de LTV)
- Liens `Mentions légales` / `Politique de confidentialité` (actuellement `href="#"` — à créer ou retirer)
- Logo : le logo actuel est recréé en SVG simple ; remplacez-le par votre vrai logo si vous en avez un fichier (déposez-le dans `assets/` et remplacez le `<svg>` dans le header/footer par une balise `<img>`)

---

## Étape 3 — Brancher le formulaire (le plus important)

Un site statique (HTML/CSS/JS seul) ne peut pas envoyer d'email ni écrire dans une
base de données par lui-même. Il faut un service qui reçoit les données du
formulaire. La solution la plus simple, gratuite et sans code serveur : **Formspree**.

1. Créez un compte sur [formspree.io](https://formspree.io) (gratuit jusqu'à 50 soumissions/mois)
2. Créez un nouveau formulaire → notez l'URL fournie, du type `https://formspree.io/f/xxxxxxx`
3. Ouvrez `script.js`, trouvez le bloc marqué `// TODO (see deployment guide, step 5)` dans le `form.addEventListener('submit', ...)`, et remplacez le `setTimeout(...)` par un vrai envoi :

```js
const payload = new FormData(form); // récupère tous les champs du formulaire

fetch('https://formspree.io/f/xxxxxxx', {
  method: 'POST',
  body: payload,
  headers: { 'Accept': 'application/json' }
})
  .then(() => {
    form.hidden = true;
    document.querySelector('.steps-bar').hidden = true;
    document.querySelector('.steps-track').hidden = true;
    formSuccess.hidden = false;
  })
  .catch(() => {
    btnNext.disabled = false;
    btnNext.textContent = 'Réessayer →';
  });
```

4. Testez : remplissez le formulaire en local et vérifiez que la soumission arrive bien dans votre tableau de bord Formspree (et par email).

*Alternative* : si vous avez déjà un CRM (HubSpot, Pipedrive...) ou voulez que les
leads tombent directement dans un tableur, Formspree propose aussi une intégration
Google Sheets/Zapier dans ses réglages — pas besoin de toucher au code une seconde fois.

---

## Étape 4 — Mettre le code sur GitHub (recommandé)

Ça vous permettra de redéployer en un clic à chaque modification, et de garder un historique.

```bash
cd braxton-landing
git init
git add .
git commit -m "Site Braxton - version initiale"
```

Créez ensuite un dépôt vide sur [github.com/new](https://github.com/new) (nommez-le par ex. `braxton-landing`), puis :

```bash
git remote add origin https://github.com/<votre-compte>/braxton-landing.git
git branch -M main
git push -u origin main
```

---

## Étape 5 — Déployer en ligne (gratuit)

**Option A — Netlify Drop (le plus rapide, sans compte GitHub)**
1. Allez sur [app.netlify.com/drop](https://app.netlify.com/drop)
2. Glissez-déposez le dossier `braxton-landing` entier dans la zone prévue
3. Netlify génère immédiatement une URL publique du type `https://random-name.netlify.app`

**Option B — Netlify connecté à GitHub (recommandé, redéploiement automatique)**
1. Créez un compte sur [netlify.com](https://netlify.com)
2. "Add new site" → "Import an existing project" → connectez votre compte GitHub → sélectionnez le dépôt `braxton-landing`
3. Aucune commande de build nécessaire (laissez "Build command" vide, "Publish directory" = `.`)
4. Cliquez "Deploy" → votre site est en ligne, et se redéploiera automatiquement à chaque `git push`

*Alternative équivalente : Vercel ou GitHub Pages fonctionnent aussi très bien pour du HTML statique, la logique est similaire.*

---

## Étape 6 — Brancher un nom de domaine

Si vous voulez un sous-domaine du type `partenaires.braxtonam.com` plutôt que
`random-name.netlify.app` :

1. Dans Netlify : Site settings → Domain management → "Add a domain"
2. Netlify vous donne un enregistrement DNS à créer (généralement un `CNAME`)
3. Ajoutez cet enregistrement chez votre registrar/hébergeur DNS actuel (là où `braxtonam.com` est géré)
4. Attendez la propagation DNS (de quelques minutes à 24h) — Netlify active alors automatiquement le certificat SSL (cadenas https)

---

## Checklist avant annonce publique

- [ ] Formulaire branché et testé (une vraie soumission arrive bien quelque part)
- [ ] Tous les liens `Mentions légales` / `Politique de confidentialité` pointent vers de vraies pages (ou sont retirés)
- [ ] Testé sur mobile (téléphone réel, pas seulement fenêtre réduite)
- [ ] Nom de domaine + HTTPS actif
- [ ] Titre d'onglet et meta description relus (déjà corrigés dans cette version : "Braxton Special Situation")
