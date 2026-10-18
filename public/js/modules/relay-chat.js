/**
 * Module Boîte Morte Chiffrée (Zero-Knowledge Relay) & Guide de Migration Coordonnée
 * Coordonne les membres du cercle sans compte ni base de données nominative
 * Chiffrement symétrique de bout en bout AES-GCM (256-bit)
 */
import { state, t, showToast } from './state.js';
import { encryptMessage, decryptMessage, solveProofOfWork } from '../crypto.js';
import { formatLongevity } from './longevity.js';

let relayPollInterval = null;

/**
 * Récupère et déchiffre les paquets déposés sur le relais public pour un cercle
 */
export async function fetchAndDecryptRelayBlobs(circleHash, keyBytes) {
  if (!circleHash || !keyBytes) return [];

  try {
    const res = await fetch(`/api/relay/${circleHash}`);
    if (!res.ok) {
      console.warn('[Relais] Erreur HTTP lors de la récupération des paquets:', res.status);
      return [];
    }

    const data = await res.json();
    if (!data.blobs || !Array.isArray(data.blobs)) {
      return [];
    }

    const decryptedMessages = [];
    for (const blob of data.blobs) {
      try {
        const decryptedRaw = await decryptMessage(
          { iv: blob.iv, ciphertext: blob.ciphertext },
          keyBytes
        );

        let parsed;
        try {
          parsed = JSON.parse(decryptedRaw);
        } catch {
          parsed = { text: decryptedRaw };
        }

        decryptedMessages.push({
          id: blob.id,
          createdAt: blob.created_at,
          ...parsed
        });
      } catch (decErr) {
        // Paquet corrompu ou chiffré avec une autre clé
        console.warn('[Relais] Impossible de déchiffrer le paquet:', blob.id, decErr);
      }
    }

    // Tri chronologique
    decryptedMessages.sort((a, b) => {
      const timeA = a.timestamp || new Date(a.createdAt).getTime() || 0;
      const timeB = b.timestamp || new Date(b.createdAt).getTime() || 0;
      return timeA - timeB;
    });

    return decryptedMessages;
  } catch (err) {
    console.error('[Relais] Échec de la requête vers la boîte morte:', err);
    return [];
  }
}

/**
 * Dépose un nouveau message chiffré sur le relais pour le cercle
 */
export async function postEncryptedRelayMessage(circleHash, keyBytes, messagePayload) {
  if (!circleHash || !keyBytes) {
    throw new Error('Empreinte de cercle ou clé cryptographique manquante');
  }

  // 1. Chiffrement de bout en bout
  const serialized = typeof messagePayload === 'string' ? messagePayload : JSON.stringify(messagePayload);
  const encrypted = await encryptMessage(serialized, keyBytes);

  // 2. Preuve de travail légère anti-spam (Hashcash)
  const powNonce = await solveProofOfWork(circleHash, '00');

  // 3. Dépôt sur la boîte morte
  const res = await fetch(`/api/relay/${circleHash}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      iv: encrypted.iv,
      ciphertext: encrypted.ciphertext,
      pow_nonce: powNonce
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Erreur lors du dépôt du message chiffré');
  }

  return data;
}

/**
 * Rendu du mini-clavardage chiffré asynchrone (Zero-Knowledge Relay Chat)
 */
export async function renderRelayChat(containerEl, circleHash, keyBytes) {
  if (!containerEl || !circleHash || !keyBytes) return;

  const savedPseudo = (typeof localStorage !== 'undefined' && localStorage.getItem('pacte_my_pseudo')) || '';
  const defaultPseudo = savedPseudo || (state.lang === 'fr' ? 'Moi' : 'Me');

  containerEl.innerHTML = `
    <div class="relay-chat-card">
      <div class="relay-chat-header">
        <div class="relay-chat-title-group">
          <span class="relay-chat-icon" aria-hidden="true">🔒</span>
          <div>
            <h4 class="relay-chat-title">${t('relay_chat.title') || 'Boîte morte chiffrée (Zero-Knowledge)'}</h4>
            <p class="relay-chat-subtitle">${t('relay_chat.subtitle') || 'Coordination chiffrée de bout en bout (AES-GCM). Aucun compte requis.'}</p>
          </div>
        </div>
        <button type="button" class="btn-refresh-relay" id="btnRefreshRelay" title="Actualiser les messages">
          🔄
        </button>
      </div>

      <!-- Flux des messages déchiffrés -->
      <div class="relay-messages-stream" id="relayMessagesStream">
        <div class="relay-loading-placeholder">
          <span>⏳</span> <span>${state.lang === 'fr' ? 'Déchiffrement des messages sécurisés...' : 'Decrypting secure messages...'}</span>
        </div>
      </div>

      <!-- Suggestions d'actions rapides -->
      <div class="relay-quick-prompts">
        <button type="button" class="btn-quick-prompt" data-prompt="J'ai créé mon compte !">🎉 J'ai créé mon compte !</button>
        <button type="button" class="btn-quick-prompt" data-prompt="On ferme nos profils samedi ?">📅 On ferme nos profils samedi ?</button>
        <button type="button" class="btn-quick-prompt" data-prompt="J'ai exporté mes photos et archives.">📦 Archives exportées</button>
      </div>

      <!-- Formulaire d'envoi chiffré -->
      <form class="relay-input-form" id="relayInputForm">
        <input 
          type="text" 
          id="relayPseudoInput" 
          class="relay-pseudo-field" 
          placeholder="${state.lang === 'fr' ? 'Pseudo' : 'Name'}" 
          value="${defaultPseudo}"
          maxlength="20"
          title="Votre pseudo visible uniquement par vos proches"
        />
        <input 
          type="text" 
          id="relayTextInput" 
          class="relay-text-field" 
          placeholder="${t('relay_chat.placeholder') || 'Écrire un message chiffré à vos proches...'}"
          maxlength="500" 
          required 
          autocomplete="off"
        />
        <button type="submit" class="btn-relay-send" id="btnRelaySend">
          <span>Envoyer</span>
        </button>
      </form>
    </div>
  `;

  const streamEl = containerEl.querySelector('#relayMessagesStream');
  const formEl = containerEl.querySelector('#relayInputForm');
  const textInput = containerEl.querySelector('#relayTextInput');
  const pseudoInput = containerEl.querySelector('#relayPseudoInput');
  const refreshBtn = containerEl.querySelector('#btnRefreshRelay');

  // Chargement et affichage des messages
  async function loadAndDisplayMessages() {
    if (!streamEl) return;
    try {
      const messages = await fetchAndDecryptRelayBlobs(circleHash, keyBytes);
      if (messages.length === 0) {
        streamEl.innerHTML = `
          <div class="relay-empty-state">
            <span class="empty-icon">💬</span>
            <p>${t('relay_chat.empty') || 'Aucun message pour le moment. Déposez le premier mot pour coordonner le grand départ !'}</p>
          </div>
        `;
        return;
      }

      streamEl.innerHTML = messages.map(msg => {
        const author = msg.author || (state.lang === 'fr' ? 'Ami(e)' : 'Friend');
        const isMe = author.toLowerCase() === (pseudoInput.value || defaultPseudo).toLowerCase();
        const dateStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const text = (msg.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const handle = msg.handle ? `<div class="relay-handle-tag">🏷️ <strong>${msg.handle}</strong></div>` : '';

        return `
          <div class="relay-msg-bubble ${isMe ? 'is-me' : 'is-friend'}">
            <div class="relay-msg-header">
              <span class="relay-msg-author">${author}</span>
              <span class="relay-msg-time">${dateStr}</span>
            </div>
            <div class="relay-msg-body">${text}</div>
            ${handle}
          </div>
        `;
      }).join('');

      // Faire défiler vers le bas
      streamEl.scrollTop = streamEl.scrollHeight;
    } catch (err) {
      streamEl.innerHTML = `<p style="color:var(--accent-rose); font-size:0.85rem;">Erreur de déchiffrement : ${err.message}</p>`;
    }
  }

  // Chargement initial
  await loadAndDisplayMessages();

  // Écouteur d'actualisation manuelle
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('spinning');
      await loadAndDisplayMessages();
      setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
    });
  }

  // Écouteurs de suggestions rapides
  containerEl.querySelectorAll('.btn-quick-prompt').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (textInput && prompt) {
        textInput.value = prompt;
        textInput.focus();
      }
    });
  });

  // Soumission d'un message
  if (formEl) {
    formEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = textInput ? textInput.value.trim() : '';
      const author = pseudoInput ? pseudoInput.value.trim() : defaultPseudo;

      if (!text) return;

      const sendBtn = containerEl.querySelector('#btnRelaySend');
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = '...';
      }

      try {
        if (typeof localStorage !== 'undefined' && author) {
          localStorage.setItem('pacte_my_pseudo', author);
        }

        const payload = {
          type: 'chat',
          author: author || 'Ami',
          text,
          timestamp: Date.now()
        };

        await postEncryptedRelayMessage(circleHash, keyBytes, payload);

        if (textInput) textInput.value = '';
        await loadAndDisplayMessages();
        showToast(state.lang === 'fr' ? 'Message chiffré déposé !' : 'Encrypted message posted!');
      } catch (err) {
        alert(err.message || 'Erreur lors de l\'envoi');
      } finally {
        if (sendBtn) {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Envoyer';
        }
      }
    });
  }

  // Polling automatique discret toutes les 15 secondes
  if (relayPollInterval) clearInterval(relayPollInterval);
  relayPollInterval = setInterval(loadAndDisplayMessages, 15000);
}

/**
 * Rendu du Guide de Migration Coordonnée (déverrouillé au seuil)
 */
export function renderMigrationGuide(containerEl, leavingNetwork, circleHash, keyBytes) {
  if (!containerEl) return;

  const targetPlatform = leavingNetwork || (state.savedCircleData?.leavingNetworks?.[0]) || 'X / Twitter';

  // Instructions d'export selon la plateforme quittée
  let exportUrl = 'https://twitter.com/settings/download_your_data';
  let exportName = 'X / Twitter';
  let exportTip = 'Allez dans Réglages > Votre compte > Télécharger une archive de vos données.';

  if (targetPlatform.includes('Facebook')) {
    exportUrl = 'https://www.facebook.com/dyi';
    exportName = 'Facebook';
    exportTip = 'Allez dans Paramètres et confidentialité > Vos informations Facebook > Télécharger les informations du profil.';
  } else if (targetPlatform.includes('Instagram')) {
    exportUrl = 'https://www.instagram.com/download/request/';
    exportName = 'Instagram';
    exportTip = 'Allez dans Votre activité > Télécharger vos informations pour sauvegarder vos clichés.';
  } else if (targetPlatform.includes('LinkedIn')) {
    exportUrl = 'https://www.linkedin.com/mypreferences/d/download-my-data';
    exportName = 'LinkedIn';
    exportTip = 'Allez dans Préférences et confidentialité > Confidentialité des données > Obtenir une copie de vos données.';
  }

  // Filtrer les alternatives souveraines recommandées pour cette plateforme
  const matchedAlternatives = (state.alternatives || []).filter(alt => {
    if (targetPlatform.includes('X') || targetPlatform.includes('Twitter')) {
      return alt.category === 'microblogging';
    }
    if (targetPlatform.includes('Facebook')) {
      return alt.category === 'microblogging' || alt.category === 'forums';
    }
    if (targetPlatform.includes('Instagram')) {
      return alt.category === 'photos' || alt.category === 'microblogging';
    }
    if (targetPlatform.includes('WhatsApp')) {
      return alt.category === 'messaging';
    }
    if (targetPlatform.includes('LinkedIn')) {
      return alt.category === 'microblogging' || alt.category === 'forums';
    }
    return true;
  }).slice(0, 3);

  const altCardsHtml = matchedAlternatives.map(alt => {
    const longevityStr = alt.established ? formatLongevity(alt.established, state.lang) : '';
    const flag = alt.location?.province === 'QC' ? '⚜️ Québec' : '🍁 Canada';
    return `
      <div class="migration-alt-card">
        <div class="alt-top-row">
          <strong class="alt-name">${alt.name}</strong>
          <span class="alt-badge-loc">${flag} (${alt.location?.city || ''})</span>
        </div>
        <p class="alt-summary">${alt.description?.[state.lang] || alt.description?.fr || ''}</p>
        <div class="alt-badges-row">
          ${longevityStr ? `<span class="alt-longevity-badge">⏳ ${longevityStr}</span>` : ''}
          <span class="alt-privacy-badge">🔒 Loi 25 / PIPEDA</span>
        </div>
        <div class="alt-action-row">
          <a href="${alt.url}" target="_blank" rel="noopener noreferrer" class="btn-create-account">
            Créer mon compte sur ${alt.name} ↗
          </a>
        </div>
      </div>
    `;
  }).join('');

  containerEl.innerHTML = `
    <div class="migration-guide-container">
      <div class="migration-guide-header">
        <span class="migration-icon" aria-hidden="true">🚀</span>
        <div>
          <h3 class="migration-title">${t('migration.title') || 'Guide de bascule coordonnée'}</h3>
          <p class="migration-subtitle">
            ${t('migration.subtitle') || 'Félicitations, votre cercle a atteint sa masse critique ! Voici le plan en 3 étapes pour faire le saut ensemble sans laisser personne derrière.'}
          </p>
        </div>
      </div>

      <div class="migration-steps-list">
        <!-- ÉTAPE 1 -->
        <div class="migration-step-item">
          <div class="step-number">1</div>
          <div class="step-content">
            <h4>${t('migration.step1_title') || `Sauvegardez vos archives de ${exportName}`}</h4>
            <p>${exportTip}</p>
            <a href="${exportUrl}" target="_blank" rel="noopener noreferrer" class="btn-step-action">
              📦 Télécharger mon archive ${exportName} ↗
            </a>
          </div>
        </div>

        <!-- ÉTAPE 2 -->
        <div class="migration-step-item">
          <div class="step-number">2</div>
          <div class="step-content">
            <h4>${t('migration.step2_title') || 'Créez votre compte sur un réseau souverain local'}</h4>
            <p>Voici les instances ouvertes, auditées et pérennes recommandées pour remplacer ${exportName} :</p>
            <div class="migration-alternatives-grid">
              ${altCardsHtml}
            </div>
            <p style="margin-top:0.75rem; font-size:0.85rem;">
              <a href="/repertoire.html" class="link-directory">
                📖 Explorer toutes les autres options dans le répertoire complet &rarr;
              </a>
            </p>
          </div>
        </div>

        <!-- ÉTAPE 3 -->
        <div class="migration-step-item">
          <div class="step-number">3</div>
          <div class="step-content">
            <h4>${t('migration.step3_title') || 'Partagez votre nouvelle adresse avec vos proches'}</h4>
            <p>
              Indiquez votre nouvel identifiant (ex: <code>@monpseudo@qlub.ca</code>) dans la boîte morte chiffrée ci-dessous. Vos proches pourront vous retrouver et vous suivre instantanément !
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}
