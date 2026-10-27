/**
 * Module Boîte Morte Chiffrée (Zero-Knowledge Relay) & Guide de Migration Coordonnée
 * Coordonne les membres du cercle sans compte ni base de données nominative
 * Chiffrement symétrique de bout en bout AES-GCM (256-bit)
 */
import { state, t, showToast } from './state.js';
import { encryptMessage, decryptMessage, solveProofOfWork, deriveNeighborhoodCredentials } from '../crypto.js';
import { formatLongevity } from './longevity.js';
import { resolveLocationInput } from './geo.js';

let relayPollInterval = null;
let neighborhoodPollInterval = null;

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

  const savedPseudo = (typeof localStorage !== 'undefined' && localStorage.getItem('pacte_my_pseudo')) || state.savedCircleData?.pseudo || '';
  const defaultPseudo = savedPseudo;

  containerEl.innerHTML = `
    <div class="relay-chat-card">
      <div class="relay-chat-header">
        <div class="relay-chat-title-group">
          <span class="relay-chat-icon" aria-hidden="true">🔒</span>
          <div>
            <h4 class="relay-chat-title">${t('relay_chat.title') || 'Messages privés du groupe'}</h4>
            <p class="relay-chat-subtitle">${t('relay_chat.subtitle') || 'Visible uniquement par les personnes ayant le lien de votre groupe.'}</p>
          </div>
        </div>
        <button type="button" class="btn-refresh-relay" id="btnRefreshRelay" title="Actualiser les messages">
          🔄
        </button>
      </div>

      <!-- Flux des messages déchiffrés -->
      <div class="relay-messages-stream" id="relayMessagesStream">
        <div class="relay-loading-placeholder">
          <span>⏳</span> <span>${state.lang === 'fr' ? 'Chargement des messages...' : 'Loading messages...'}</span>
        </div>
      </div>

      <!-- Suggestions d'actions rapides -->
      <div class="relay-quick-prompts">
        <button type="button" class="btn-quick-prompt" data-prompt="J'ai créé mon compte !">🎉 J'ai créé mon compte !</button>
        <button type="button" class="btn-quick-prompt" data-prompt="On ferme nos profils samedi ?">📅 On ferme nos profils samedi ?</button>
        <button type="button" class="btn-quick-prompt" data-prompt="J'ai exporté mes photos et archives.">📦 Archives exportées</button>
      </div>

      <!-- Formulaire d'envoi chiffré avec profil source pour transférer l'identité -->
      <form class="relay-input-form" id="relayInputForm">
        <input 
          type="text" 
          id="relayPseudoInput" 
          class="relay-pseudo-field" 
          placeholder="${state.lang === 'fr' ? 'Votre prénom' : 'Your name'}" 
          value="${defaultPseudo}"
          maxlength="35"
          required
          title="Votre prénom ou pseudo visible par vos proches"
        />
        <input 
          type="text" 
          id="relayTextInput" 
          class="relay-text-field" 
          placeholder="${t('relay_chat.placeholder') || 'Écrire un message à vos amis...'}"
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
            <p>${t('relay_chat.empty') || 'Aucun message pour le moment. Laissez un premier mot à vos amis !'}</p>
          </div>
        `;
        return;
      }

      streamEl.innerHTML = messages.map(msg => {
        const author = msg.author || (state.lang === 'fr' ? 'Ami(e)' : 'Friend');
        const currentMyName = (pseudoInput?.value || defaultPseudo || '').trim().toLowerCase();
        const isMe = Boolean(currentMyName) && author.toLowerCase() === currentMyName;
        const dateStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
        const text = (msg.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const handle = msg.handle ? `<div class="relay-handle-tag">🏷️ <strong>${msg.handle}</strong></div>` : '';

        // Badge du profil source vérifié (ex: facebook.com/rngadam, instagram.com/rngadam, etc.)
        let sourceBadge = '';
        if (msg.sourceProfile) {
          const raw = String(msg.sourceProfile).trim();
          const cleanDisplay = raw.replace(/^https?:\/\/(www\.)?/, '');
          const isUrl = /^https?:\/\//i.test(raw);
          const href = isUrl ? raw : `https://${raw}`;
          sourceBadge = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="relay-source-profile-tag" title="Profil vérifié sur la plateforme source">🔗 ${cleanDisplay}</a>`;
        }

        return `
          <div class="relay-msg-bubble ${isMe ? 'is-me' : 'is-friend'}">
            <div class="relay-msg-header">
              <span class="relay-msg-author">${author}</span>
              ${sourceBadge}
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

        const savedSourceProfile = state.savedCircleData?.sourceProfile || (typeof localStorage !== 'undefined' && localStorage.getItem('pacte_my_source_profile')) || null;

        const payload = {
          type: 'chat',
          author: author || 'Ami',
          sourceProfile: savedSourceProfile,
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
            <h4>${t('migration.step3_title') || 'Transférez votre réputation & échangez vos nouveaux identifiants'}</h4>
            <p>
              Pour faire suivre votre audience et votre réputation, annoncez votre nouveau compte souverain à votre cercle. Vos proches pourront s'abonner et vous suivre instantanément !
            </p>

            <form class="migration-handle-form" id="migrationHandleForm" style="display:flex; gap:0.5rem; flex-wrap:wrap; margin:0.85rem 0;">
              <input 
                type="text" 
                id="migrationNewHandleInput" 
                class="input-field" 
                placeholder="Votre nouvelle adresse (ex: @monpseudo@qlub.ca)" 
                required 
                style="flex:1; min-width:240px; padding:0.5rem 0.75rem;"
              />
              <button type="submit" class="btn-create-account" id="btnPublishMigrationHandle" style="border:none; cursor:pointer; padding:0.55rem 1rem; font-size:0.85rem;">
                📢 Annoncer mon profil
              </button>
            </form>

            <div class="migration-identity-bridge" id="migrationIdentityBridge"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  const handleForm = containerEl.querySelector('#migrationHandleForm');
  const handleInput = containerEl.querySelector('#migrationNewHandleInput');
  const bridgeContainer = containerEl.querySelector('#migrationIdentityBridge');

  async function updateIdentityBridge() {
    if (!bridgeContainer || !circleHash || !keyBytes) return;
    try {
      const messages = await fetchAndDecryptRelayBlobs(circleHash, keyBytes);
      const mappings = [];
      const seen = new Set();
      for (const msg of messages) {
        if (msg.handle && !seen.has(msg.handle)) {
          seen.add(msg.handle);
          mappings.push({
            author: msg.author,
            sourceProfile: msg.sourceProfile,
            handle: msg.handle
          });
        }
      }

      if (mappings.length > 0) {
        bridgeContainer.innerHTML = `
          <div class="identity-bridge-box" style="background:var(--bg-surface); border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:0.75rem; margin-top:0.75rem;">
            <strong style="font-size:0.85rem; color:var(--text-main); display:block; margin-bottom:0.5rem;">
              👥 Passerelle des membres prêts à basculer :
            </strong>
            <div style="display:flex; flex-direction:column; gap:0.4rem;">
              ${mappings.map(m => {
                const source = m.sourceProfile ? `<span class="source-tag" style="color:var(--text-muted); font-size:0.78rem;">🔗 ${m.sourceProfile.replace(/^https?:\/\/(www\.)?/, '')}</span> ➡️` : '';
                return `
                  <div style="display:flex; align-items:center; gap:0.5rem; font-size:0.82rem; flex-wrap:wrap;">
                    <strong>${m.author}</strong>
                    ${source}
                    <code style="background:var(--accent-emerald-bg); color:var(--accent-emerald); padding:0.15rem 0.4rem; border-radius:4px; font-weight:700;">${m.handle}</code>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }
    } catch (e) {
      console.warn('[Bridge] Erreur chargement pont d\'identités:', e);
    }
  }

  updateIdentityBridge();

  if (handleForm && handleInput) {
    handleForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newHandle = handleInput.value.trim();
      if (!newHandle) return;

      const btn = containerEl.querySelector('#btnPublishMigrationHandle');
      if (btn) btn.disabled = true;

      try {
        const savedSourceProfile = state.savedCircleData?.sourceProfile || (typeof localStorage !== 'undefined' && localStorage.getItem('pacte_my_source_profile')) || null;
        const savedPseudo = (typeof localStorage !== 'undefined' && localStorage.getItem('pacte_my_pseudo')) || 'Un ami';

        await postEncryptedRelayMessage(circleHash, keyBytes, {
          type: 'handle_exchange',
          author: savedPseudo,
          sourceProfile: savedSourceProfile,
          handle: newHandle,
          text: `Mon nouveau profil souverain est créé : ${newHandle} ! Vous pouvez me suivre dès maintenant.`,
          timestamp: Date.now()
        });

        handleInput.value = '';
        showToast(state.lang === 'fr' ? 'Profil souverain partagé dans le cercle !' : 'Sovereign handle shared with circle!');
        await updateIdentityBridge();
      } catch (err) {
        alert(err.message || 'Erreur lors de la publication');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }
}

/**
 * Rendu du groupe social géolocalisé de quartier (Zero-Knowledge)
 * Permet aux voisins d'un même secteur (RTA/FSA) de communiquer,
 * coordonner leur départ et échanger leurs identifiants vers des plateformes souveraines.
 */
export async function renderNeighborhoodGroupChat(containerEl, rawFsa = 'H2T') {
  if (!containerEl) return;

  const resolved = resolveLocationInput(rawFsa);
  const fsa = resolved.fsa || 'H2T';
  const cityName = resolved.city || 'Quartier local';

  const { circleHash, keyBytes } = await deriveNeighborhoodCredentials(fsa);

  const savedPseudo = (typeof localStorage !== 'undefined' && localStorage.getItem('pacte_my_pseudo')) || state.savedCircleData?.pseudo || '';
  const defaultPseudo = savedPseudo;

  containerEl.innerHTML = `
    <div class="neighborhood-group-card">
      <div class="neighborhood-group-header">
        <div class="neighborhood-title-group">
          <span class="neighborhood-header-icon" aria-hidden="true">📍</span>
          <div>
            <div class="neighborhood-badge-row">
              <span class="fsa-badge">${fsa}</span>
              <span class="city-badge">${cityName}</span>
              <span class="zk-badge">🔒 Espace local privé</span>
            </div>
            <h4 class="neighborhood-title">${t('circle_widget.neighborhood_title') || 'Espace local de quartier'} (${fsa})</h4>
            <p class="neighborhood-subtitle">${t('circle_widget.neighborhood_subtitle') || 'Découvrez les voisins de votre secteur et partagez vos comptes sur les réseaux libres.'}</p>
          </div>
        </div>
        <button type="button" class="btn-refresh-relay" id="btnRefreshNeighborhood" title="Actualiser les messages">
          🔄
        </button>
      </div>

      <!-- Annuaire des identifiants souverains partagés dans le quartier -->
      <div class="neighborhood-handles-box">
        <div class="handles-box-header">
          <h5 class="handles-title">🌐 ${t('circle_widget.neighborhood_directory_title') || 'Comptes libres partagés dans le quartier'}</h5>
          <span class="handles-count" id="neighborhoodHandlesCount">0 profil</span>
        </div>
        
        <div class="neighborhood-handles-list" id="neighborhoodHandlesList">
          <div class="handles-empty-state">
            <span>⏳</span> <span>Chargement des profils du quartier...</span>
          </div>
        </div>

        <!-- Formulaire de partage d'identifiant souverain (replié par défaut) -->
        <details class="share-handle-accordion" id="shareHandleAccordion">
          <summary class="btn-open-share-handle">
            <span>➕</span> <strong>${t('circle_widget.share_handle_heading') || 'Partager mon compte libre avec mes voisins'}</strong>
          </summary>
          <form class="share-handle-form" id="neighborhoodShareHandleForm">
            <p class="share-handle-desc">${t('circle_widget.share_handle_desc') || 'Annoncez votre compte Mastodon, Pixelfed ou salon Matrix local pour que vos voisins puissent vous suivre et échanger :'}</p>
            
            <div class="share-handle-row">
              <select id="neighborhoodPlatformSelect" class="input-select" style="max-width: 220px; font-size: 0.85rem;">
                <option value="Mastodon">🐘 Mastodon / Fédiverse</option>
                <option value="Matrix">💬 Salon Matrix / Chat</option>
                <option value="Pixelfed">📸 Pixelfed / Photos</option>
                <option value="Lemmy">📌 Lemmy / Forum</option>
                <option value="Autre">🌐 Autre adresse souveraine</option>
              </select>
              <input 
                type="text" 
                id="neighborhoodHandleInput" 
                class="input-field" 
                placeholder="${t('circle_widget.share_handle_address_placeholder') || 'ex: @alice@qlub.ca ou #quartier:chat.quebec'}" 
                required 
                style="flex: 1; min-width: 220px;"
              />
            </div>

            <div class="share-handle-row" style="margin-top: 0.5rem;">
              <input 
                type="text" 
                id="neighborhoodNoteInput" 
                class="input-field" 
                placeholder="${t('circle_widget.share_handle_note_placeholder') || 'Un mot pour vos voisins (ex: Habitant du Plateau, au plaisir d\'échanger !)'}" 
                maxlength="140"
                style="flex: 1; min-width: 200px;"
              />
              <button type="submit" class="btn-share-handle-submit" id="btnSubmitNeighborhoodHandle">
                ${t('circle_widget.share_handle_submit') || '📢 Partager avec mes voisins'}
              </button>
            </div>
          </form>
        </details>
      </div>

      <!-- Discussion locale entre voisins -->
      <div class="neighborhood-chat-section">
        <h5 class="neighborhood-chat-heading">💬 ${t('circle_widget.neighborhood_chat_title') || 'Discussion locale entre voisins'}</h5>

        <!-- Flux des messages du quartier -->
        <div class="relay-messages-stream neighborhood-stream" id="neighborhoodMessagesStream">
          <div class="relay-loading-placeholder">
            <span>⏳</span> <span>Déchiffrement des échanges du quartier...</span>
          </div>
        </div>

        <!-- Suggestions de coordination de proximité -->
        <div class="relay-quick-prompts">
          <button type="button" class="btn-neighborhood-prompt" data-prompt="☕ Rencontre café numérique dans le quartier ce samedi ?">☕ Café numérique</button>
          <button type="button" class="btn-neighborhood-prompt" data-prompt="💬 Qui a un salon Matrix pour notre coin ?">💬 Salon Matrix</button>
          <button type="button" class="btn-neighborhood-prompt" data-prompt="❓ Quel serveur Mastodon me conseillez-vous ?">❓ Conseil Mastodon</button>
        </div>

        <!-- Formulaire d'envoi de message au quartier -->
        <form class="relay-input-form" id="neighborhoodChatForm">
          <input 
            type="text" 
            id="neighborhoodPseudoInput" 
            class="relay-pseudo-field" 
            placeholder="${state.lang === 'fr' ? 'Votre prénom' : 'Your name'}" 
            value="${defaultPseudo}"
            maxlength="35"
            required
            title="Votre prénom ou pseudo visible par vos voisins"
          />
          <input 
            type="text" 
            id="neighborhoodTextInput" 
            class="relay-text-field" 
            placeholder="${t('circle_widget.neighborhood_chat_placeholder') || 'Écrire un message chiffré aux voisins du secteur...'}"
            maxlength="500" 
            required 
            autocomplete="off"
          />
          <button type="submit" class="btn-relay-send" id="btnNeighborhoodSend">
            <span>Envoyer</span>
          </button>
        </form>
      </div>
    </div>
  `;

  const handlesListEl = containerEl.querySelector('#neighborhoodHandlesList');
  const handlesCountEl = containerEl.querySelector('#neighborhoodHandlesCount');
  const streamEl = containerEl.querySelector('#neighborhoodMessagesStream');
  const shareFormEl = containerEl.querySelector('#neighborhoodShareHandleForm');
  const chatFormEl = containerEl.querySelector('#neighborhoodChatForm');
  const textInput = containerEl.querySelector('#neighborhoodTextInput');
  const pseudoInput = containerEl.querySelector('#neighborhoodPseudoInput');
  const refreshBtn = containerEl.querySelector('#btnRefreshNeighborhood');

  // Chargement et affichage des messages et annuaires
  async function loadAndDisplayNeighborhoodData() {
    try {
      const messages = await fetchAndDecryptRelayBlobs(circleHash, keyBytes);

      // 1. Filtrer les identifiants souverains partagés
      const handleMsgs = messages.filter(m => m.type === 'neighborhood_handle' || m.sovereignHandle || (m.handle && m.platform));
      
      if (handlesCountEl) {
        handlesCountEl.textContent = `${handleMsgs.length} profil${handleMsgs.length > 1 ? 's' : ''}`;
      }

      if (handlesListEl) {
        if (handleMsgs.length === 0) {
          handlesListEl.innerHTML = `
            <div class="handles-empty-state">
              <span>🌱</span>
              <p>${t('circle_widget.neighborhood_directory_empty') || 'Aucun profil partagé pour l\'instant. Soyez le premier citoyen à annoncer votre profil !'}</p>
            </div>
          `;
        } else {
          handlesListEl.innerHTML = handleMsgs.map(item => {
            const platform = item.platform || 'Mastodon';
            const handle = item.sovereignHandle || item.handle || '';
            const author = item.author || (state.lang === 'fr' ? 'Voisin(e)' : 'Neighbor');
            const note = item.note ? `<p class="handle-note">« ${item.note.replace(/</g, '&lt;').replace(/>/g, '&gt;')} »</p>` : '';
            const dateStr = item.timestamp ? new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';

            let icon = '🐘';
            if (platform.includes('Matrix')) icon = '💬';
            else if (platform.includes('Pixelfed')) icon = '📸';
            else if (platform.includes('Lemmy')) icon = '📌';
            else if (platform.includes('Autre')) icon = '🌐';

            // Lien cliquable si web ou matrix
            let linkHtml = `<strong>${handle}</strong>`;
            if (/^https?:\/\//i.test(handle)) {
              linkHtml = `<a href="${handle}" target="_blank" rel="noopener noreferrer" class="handle-link">${handle} ↗</a>`;
            } else if (/^@[\w.-]+@[\w.-]+$/i.test(handle)) {
              const [ , user, domain ] = handle.split('@');
              linkHtml = `<a href="https://${domain}/@${user}" target="_blank" rel="noopener noreferrer" class="handle-link">${handle} ↗</a>`;
            }

            let sourceBadge = '';
            if (item.sourceProfile) {
              const raw = String(item.sourceProfile).trim();
              const clean = raw.replace(/^https?:\/\/(www\.)?/, '');
              const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
              sourceBadge = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="relay-source-profile-tag" title="Ex-profil commercial">🔗 ${clean}</a>`;
            }

            return `
              <div class="neighborhood-handle-card">
                <div class="handle-card-top">
                  <span class="platform-pill ${platform.toLowerCase()}">${icon} ${platform}</span>
                  ${sourceBadge}
                  <span class="handle-date">${dateStr}</span>
                </div>
                <div class="handle-card-address">${linkHtml}</div>
                ${note}
                <div class="handle-card-author">Partagé par <strong>${author}</strong></div>
              </div>
            `;
          }).join('');
        }
      }

      // 2. Afficher la boîte de discussion locale
      if (streamEl) {
        if (messages.length === 0) {
          streamEl.innerHTML = `
            <div class="relay-empty-state">
              <span class="empty-icon">💬</span>
              <p>${t('circle_widget.neighborhood_empty_chat') || `Bienvenue dans l'espace de quartier ${fsa} ! Envoyez un premier message pour briser la glace avec vos voisins.`}</p>
            </div>
          `;
        } else {
          streamEl.innerHTML = messages.map(msg => {
            const author = msg.author || (state.lang === 'fr' ? 'Voisin(e)' : 'Neighbor');
            const currentMyName = (pseudoInput?.value || defaultPseudo || '').trim().toLowerCase();
            const isMe = Boolean(currentMyName) && author.toLowerCase() === currentMyName;
            const dateStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            const text = (msg.text || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');

            let extraTag = '';
            if (msg.type === 'neighborhood_handle' || msg.sovereignHandle) {
              extraTag = `<div class="relay-handle-tag">🏷️ Profil partagé : <strong>${msg.sovereignHandle || msg.handle}</strong> (${msg.platform || 'Souverain'})</div>`;
            }

            let sourceBadge = '';
            if (msg.sourceProfile) {
              const raw = String(msg.sourceProfile).trim();
              const cleanDisplay = raw.replace(/^https?:\/\/(www\.)?/, '');
              const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
              sourceBadge = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="relay-source-profile-tag" title="Profil vérifié sur la plateforme source">🔗 ${cleanDisplay}</a>`;
            }

            return `
              <div class="relay-msg-bubble ${isMe ? 'is-me' : 'is-friend'}">
                <div class="relay-msg-header">
                  <span class="relay-msg-author">${author}</span>
                  ${sourceBadge}
                  <span class="relay-msg-time">${dateStr}</span>
                </div>
                <div class="relay-msg-body">${text}</div>
                ${extraTag}
              </div>
            `;
          }).join('');

          streamEl.scrollTop = streamEl.scrollHeight;
        }
      }
    } catch (err) {
      if (streamEl) {
        streamEl.innerHTML = `<p style="color:var(--accent-rose); font-size:0.85rem;">Erreur de déchiffrement : ${err.message}</p>`;
      }
    }
  }

  // Chargement initial
  await loadAndDisplayNeighborhoodData();

  // Actualisation manuelle
  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      refreshBtn.classList.add('spinning');
      await loadAndDisplayNeighborhoodData();
      setTimeout(() => refreshBtn.classList.remove('spinning'), 500);
    });
  }

  // Écouteurs pour les prompts de quartier
  containerEl.querySelectorAll('.btn-neighborhood-prompt').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      if (textInput && prompt) {
        textInput.value = prompt;
        textInput.focus();
      }
    });
  });

  // Soumission de partage d'identifiant souverain
  if (shareFormEl) {
    shareFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const platformSelect = containerEl.querySelector('#neighborhoodPlatformSelect');
      const handleInput = containerEl.querySelector('#neighborhoodHandleInput');
      const noteInput = containerEl.querySelector('#neighborhoodNoteInput');
      const submitBtn = containerEl.querySelector('#btnSubmitNeighborhoodHandle');

      const platform = platformSelect ? platformSelect.value : 'Mastodon';
      const handle = handleInput ? handleInput.value.trim() : '';
      const note = noteInput ? noteInput.value.trim() : '';
      const author = pseudoInput ? pseudoInput.value.trim() : defaultPseudo;

      if (!handle) return;
      if (submitBtn) submitBtn.disabled = true;

      try {
        if (typeof localStorage !== 'undefined' && author) {
          localStorage.setItem('pacte_my_pseudo', author);
        }

        const savedSourceProfile = state.savedCircleData?.sourceProfile || (typeof localStorage !== 'undefined' && localStorage.getItem('pacte_my_source_profile')) || null;

        await postEncryptedRelayMessage(circleHash, keyBytes, {
          type: 'neighborhood_handle',
          author,
          platform,
          sovereignHandle: handle,
          note: note || null,
          sourceProfile: savedSourceProfile,
          text: `J'ai partagé mon profil ${platform} (${handle}) avec les voisins du secteur !`,
          timestamp: Date.now()
        });

        if (handleInput) handleInput.value = '';
        if (noteInput) noteInput.value = '';
        showToast(state.lang === 'fr' ? 'Profil souverain partagé avec vos voisins !' : 'Sovereign handle shared with neighbors!');
        await loadAndDisplayNeighborhoodData();
      } catch (err) {
        alert(err.message || 'Erreur lors du partage');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // Soumission de message dans la discussion locale
  if (chatFormEl) {
    chatFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = textInput ? textInput.value.trim() : '';
      const author = pseudoInput ? pseudoInput.value.trim() : defaultPseudo;

      if (!text) return;

      const sendBtn = containerEl.querySelector('#btnNeighborhoodSend');
      if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.textContent = '...';
      }

      try {
        if (typeof localStorage !== 'undefined' && author) {
          localStorage.setItem('pacte_my_pseudo', author);
        }

        const savedSourceProfile = state.savedCircleData?.sourceProfile || (typeof localStorage !== 'undefined' && localStorage.getItem('pacte_my_source_profile')) || null;

        await postEncryptedRelayMessage(circleHash, keyBytes, {
          type: 'chat',
          author,
          sourceProfile: savedSourceProfile,
          text,
          timestamp: Date.now()
        });

        if (textInput) textInput.value = '';
        await loadAndDisplayNeighborhoodData();
        showToast(state.lang === 'fr' ? 'Message de quartier déposé !' : 'Neighborhood message posted!');
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

  // Polling automatique discret toutes les 20 secondes
  if (neighborhoodPollInterval) clearInterval(neighborhoodPollInterval);
  neighborhoodPollInterval = setInterval(loadAndDisplayNeighborhoodData, 20000);
}
