// Reçoit la soumission du formulaire du site et crée une ligne dans la base
// Notion "Dealflow Braxton AM", assignée à Jean-Baptiste (Responsable).
// Nécessite la variable d'environnement Netlify NOTION_TOKEN (token d'intégration interne Notion,
// avec la base Dealflow partagée avec cette intégration).

const NOTION_DB_ID = 'bfc5f1ab-d583-4111-8448-3ac256b49fe4';
const JB_USER_ID = '302d872b-594c-8198-9412-0002b8cb136b';

// Mappe la typologie du formulaire vers les options existantes de "Classe d'actif"
const TYPOLOGIE_MAP = {
  'Résidentiel': 'Résidentiel',
  'Bureau': 'Bureau',
  'Commerce': 'Retail',
  'Logistique / Activité': 'Logistique',
  'Hôtellerie': 'Hôtellerie',
  'Mixte': 'Mixte',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    console.error('NOTION_TOKEN manquant dans les variables d\'environnement Netlify');
    return { statusCode: 500, body: JSON.stringify({ error: 'Notion non configuré' }) };
  }

  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalide' }) };
  }

  const {
    prenom = '', nom = '', email = '', telephone = '',
    secteur = '', besoin = '', typologie = '', valorisation = '',
    besoinLibre = '',
  } = data;

  const nomComplet = `${prenom} ${nom}`.trim() || 'Lead site web';
  const titre = secteur ? `${nomComplet} — ${secteur}` : nomComplet;

  const commentaireLines = [
    'Source : formulaire braxton-lab.netlify.app',
    email && `Email : ${email}`,
    telephone && `Téléphone : ${telephone}`,
    secteur && `Vous êtes : ${secteur}`,
    besoin && `Besoin principal : ${besoin}`,
    typologie && `Typologie d'actif : ${typologie}`,
    besoinLibre && `Description du besoin : ${besoinLibre}`,
  ].filter(Boolean).join('\n');

  const properties = {
    'Actif': { title: [{ text: { content: titre.slice(0, 200) } }] },
    'Commentaire': { rich_text: [{ text: { content: commentaireLines.slice(0, 2000) } }] },
    'Statut': { status: { name: 'À analyser' } },
    'Responsable': { people: [{ id: JB_USER_ID }] },
  };

  if (valorisation) {
    const n = Number(String(valorisation).replace(/[^\d.]/g, ''));
    if (!Number.isNaN(n) && n > 0) properties['Deal Size'] = { number: n };
  }

  const classe = TYPOLOGIE_MAP[typologie];
  if (classe) properties["Classe d'actif"] = { select: { name: classe } };

  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DB_ID },
        properties,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Notion API error', res.status, errText);
      // TEMP debug: renvoie le detail de l'erreur Notion dans la reponse pour diagnostiquer
      // sans acces au dashboard. A retirer une fois que l'integration fonctionne.
      return { statusCode: 502, body: JSON.stringify({ error: 'Notion a refusé la création', status: res.status, detail: errText }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error('Erreur réseau vers Notion', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Erreur serveur' }) };
  }
};
