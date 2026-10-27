/**
 * Jauge visuelle de masse critique, messages de partage prêts à l'emploi et carillon de célébration
 */
import { state, t, showToast } from './state.js';

/**
 * Rendu visuel et intuitif de la jauge de masse critique
 */
export function renderCriticalMassGauge(currentCount, targetCount, isUnlocked) {
  const percent = Math.min(100, Math.round((currentCount / targetCount) * 100));
  const needed = Math.max(0, targetCount - currentCount);

  let statusText = '';
  const status1 = t('circle_widget.gauge_status_1');
  const template1 = (status1 && status1 !== 'circle_widget.gauge_status_1') 
    ? status1 
    : `Déjà 1 personne sur {target} prête à faire le saut (plus que {needed} !)`;

  const statusProgress = t('circle_widget.gauge_status_progress');
  const templateProgress = (statusProgress && statusProgress !== 'circle_widget.gauge_status_progress')
    ? statusProgress
    : `Déjà {current} personnes sur {target} prêtes (plus que {needed} !)`;

  const statusUnlocked = t('circle_widget.gauge_status_unlocked');
  const templateUnlocked = (statusUnlocked && statusUnlocked !== 'circle_widget.gauge_status_unlocked')
    ? statusUnlocked
    : 'Masse critique atteinte ! Vous pouvez faire le saut ensemble.';

  if (isUnlocked) {
    statusText = templateUnlocked;
  } else if (currentCount === 1) {
    statusText = template1.replace('{target}', targetCount).replace('{needed}', needed);
  } else {
    statusText = templateProgress.replace('{current}', currentCount).replace('{target}', targetCount).replace('{needed}', needed);
  }

  const avatars = [];
  const displayLimit = Math.min(targetCount, 21);
  for (let i = 0; i < displayLimit; i++) {
    const isJoined = i < currentCount;
    const isMe = i === 0;
    const label = isMe ? (t('circle_widget.avatar_me') || 'Moi') : (isJoined ? (t('circle_widget.avatar_friend') || 'Ami') : '');
    const avatarClass = isJoined ? (isMe ? 'gauge-avatar joined is-me' : 'gauge-avatar joined') : 'gauge-avatar waiting';
    const icon = isJoined ? (isMe ? '👤' : '👥') : '⏳';

    avatars.push(`
      <div class="${avatarClass}" title="${isJoined ? (isMe ? 'Vous êtes engagé(e)' : 'Ami engagé') : 'En attente d\'un ami'}">
        <span class="avatar-icon">${icon}</span>
        <span class="avatar-label">${label}</span>
      </div>
    `);
  }

  return `
    <div class="critical-gauge-container ${isUnlocked ? 'unlocked' : ''}">
      <div class="critical-gauge-header">
        <span class="gauge-title"><strong>${t('circle_widget.gauge_title') || 'Progression vers le départ collectif'}</strong></span>
        <span class="gauge-percent"><strong>${percent}%</strong></span>
      </div>
      
      <div class="gauge-bar-track">
        <div class="gauge-bar-fill" style="width: ${percent}%;"></div>
      </div>

      <div class="gauge-avatars-row">
        ${avatars.join('')}
      </div>

      <p class="gauge-status-text ${isUnlocked ? 'unlocked' : ''}">
        ${isUnlocked ? '🎉 ' : '⏳ '}<strong>${statusText}</strong>
      </p>
    </div>
  `;
}

/**
 * Génère un message d'invitation concret et prêt à l'envoi
 */
export function getReadyInviteMessage(inviteUrl, targetCount = 13, networks = null) {
  let netText = 'la Big Tech';
  if (networks && networks.length > 0) {
    const netList = Array.isArray(networks) ? networks : Array.from(networks);
    if (netList.includes('X / Twitter')) {
      netText = 'X';
    } else if (netList.includes('Facebook')) {
      netText = 'Facebook';
    } else if (netList.includes('Instagram')) {
      netText = 'Instagram';
    } else {
      netText = netList[0];
    }
  }

  if (state.lang === 'en') {
    return `Hey! As soon as ${targetCount} of us sign up, we're leaving ${netText} together. Join my group here: ${inviteUrl}`;
  }
  return `Salut ! Dès qu'on est ${targetCount} à s'inscrire, on quitte ${netText} ensemble. Rejoins mon groupe ici : ${inviteUrl}`;
}

/**
 * Génère le message ciblé pour publication sociale sur la plateforme d'origine
 * (Format officiel requis pour le recrutement et la validation sociale)
 */
export function getSocialShareMessage(inviteUrl, targetCount = 13, networks = null) {
  if (state.lang === 'en') {
    return `I signed the pledge to switch to an open network as soon as there are ${targetCount} of us in my circle. Join my departure here: ${inviteUrl}`;
  }
  return `J’ai signé le pacte pour basculer vers un réseau libre dès qu’on est ${targetCount} dans mon cercle. Rejoignez mon départ ici : ${inviteUrl}`;
}

/**
 * Rendu de la boîte de partage avec boutons ciblés vers la plateforme d'origine et messageries privées
 */
export function renderReadyShareBox(inviteUrl, targetCount, leavingNetworks, prefix = 'widget') {
  const message = getReadyInviteMessage(inviteUrl, targetCount, leavingNetworks);
  const socialMessage = getSocialShareMessage(inviteUrl, targetCount, leavingNetworks);

  const netList = Array.isArray(leavingNetworks) ? leavingNetworks : (leavingNetworks ? Array.from(leavingNetworks) : []);
  const isLeavingFb = netList.some(n => /Facebook/i.test(n));
  const isLeavingLi = netList.some(n => /LinkedIn/i.test(n));
  const isLeavingX = netList.some(n => /X|Twitter/i.test(n)) || (!isLeavingFb && !isLeavingLi);

  let originPlatformBtn = '';
  if (isLeavingX) {
    originPlatformBtn = `
      <button type="button" class="btn-share-social twitter" id="${prefix}BtnTwitter">
        <span>🐦</span> <span>${t('circle_widget.btn_share_x') || 'Publier mon pacte sur X'}</span>
      </button>
    `;
  }
  if (isLeavingFb) {
    originPlatformBtn += `
      <button type="button" class="btn-share-social facebook" id="${prefix}BtnFacebook">
        <span>👥</span> <span>${t('circle_widget.btn_share_fb') || 'Partager sur Facebook'}</span>
      </button>
    `;
  }
  if (isLeavingLi) {
    originPlatformBtn += `
      <button type="button" class="btn-share-social linkedin" id="${prefix}BtnLinkedIn">
        <span>💼</span> <span>${t('circle_widget.btn_share_li') || 'Partager sur LinkedIn'}</span>
      </button>
    `;
  }

  return `
    <div class="ready-share-box">
      <div class="ready-share-header">
        <strong>📣 ${t('circle_widget.share_ready_title') || 'Publiez votre appel de départ ou envoyez-le directement :'}</strong>
      </div>
      <div class="ready-share-bubble">
        <p id="${prefix}ShareBubbleText">${socialMessage}</p>
      </div>

      <!-- Actions de diffusion sociale ciblée & messageries -->
      <div class="ready-share-actions">
        ${originPlatformBtn}
        <button type="button" class="btn-share-social whatsapp" id="${prefix}BtnWhatsApp">
          <span>💬</span> <span>WhatsApp</span>
        </button>
        <button type="button" class="btn-share-social sms" id="${prefix}BtnSMS">
          <span>📱</span> <span>SMS</span>
        </button>
        <button type="button" class="btn-share-social copy" id="${prefix}BtnCopyMessage">
          <span>📋</span> <span>${t('circle_widget.btn_copy_message') || 'Copier le message'}</span>
        </button>
        <button type="button" class="btn-share-social link-only" id="${prefix}BtnCopyLink">
          <span>🔗</span> <span>${t('circle_widget.btn_copy_link') || 'Copier le lien'}</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * Attache les écouteurs pour la boîte de partage (X, Facebook, LinkedIn, SMS, WhatsApp)
 */
export function attachShareBoxListeners(prefix, inviteUrl, message, customSocialMsg = null) {
  if (typeof document === 'undefined') return;

  const socialMsg = customSocialMsg || message;

  // Bouton Twitter / X
  const btnTwitter = document.getElementById(`${prefix}BtnTwitter`);
  if (btnTwitter) {
    btnTwitter.onclick = () => {
      const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(socialMsg)}`;
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    };
  }

  // Bouton Facebook
  const btnFb = document.getElementById(`${prefix}BtnFacebook`);
  if (btnFb) {
    btnFb.onclick = () => {
      const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}&quote=${encodeURIComponent(socialMsg)}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    };
  }

  // Bouton LinkedIn
  const btnLi = document.getElementById(`${prefix}BtnLinkedIn`);
  if (btnLi) {
    btnLi.onclick = () => {
      const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(inviteUrl)}`;
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    };
  }

  const btnWa = document.getElementById(`${prefix}BtnWhatsApp`);
  if (btnWa) {
    btnWa.onclick = () => {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(socialMsg)}`, '_blank');
    };
  }

  const btnSms = document.getElementById(`${prefix}BtnSMS`);
  if (btnSms) {
    btnSms.onclick = () => {
      window.location.href = `sms:?&body=${encodeURIComponent(socialMsg)}`;
    };
  }

  const btnCopyMsg = document.getElementById(`${prefix}BtnCopyMessage`);
  if (btnCopyMsg) {
    btnCopyMsg.onclick = async () => {
      try {
        await navigator.clipboard.writeText(socialMsg);
        showToast(t('circle_widget.message_copied') || 'Message complet copié ! Prêt à coller.');
      } catch {
        showToast('Erreur copie presse-papier');
      }
    };
  }

  const btnCopyLnk = document.getElementById(`${prefix}BtnCopyLink`);
  if (btnCopyLnk) {
    btnCopyLnk.onclick = async () => {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        showToast(t('circle_widget.link_copied') || 'Lien copié dans le presse-papier !');
      } catch {
        showToast('Erreur copie presse-papier');
      }
    };
  }
}

/**
 * Joue un carillon harmonique de célébration civique via la Web Audio API (Do-Mi-Sol-Do)
 */
export function playCelebrationChime() {
  if (typeof window === 'undefined') return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.2, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.5);
    });
  } catch (err) {
    console.warn('[Audio] Carillon audio non disponible:', err);
  }
}

/**
 * Déclenche la célébration de déblocage du seuil : carillon audio, notification locale et toast persistant
 */
export async function triggerThresholdCelebration(savedCircle, currentCount, targetCount) {
  playCelebrationChime();

  const title = t('circle_widget.unlocked_title') || '🎉 Masse critique atteinte !';
  const body = (t('circle_widget.celebration_toast') || '🎉 Masse critique atteinte ! Votre cercle de {count} personnes est complet. Vous pouvez faire le saut ensemble !').replace('{count}', targetCount);

  // Notification bureau native si autorisée
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        if (reg && reg.showNotification) {
          reg.showNotification(title, {
            body,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            vibrate: [200, 100, 200],
            data: { url: '/#souverainete-active' }
          });
        } else {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      } else {
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    } catch (e) {
      console.warn('[Push] Erreur affichage notification locale:', e);
    }
  }

  showToast(`${title}\n${body}`, 10000);

  // Mémoriser la célébration pour ne pas rejouer le carillon à chaque cycle de 15s
  if (savedCircle) {
    savedCircle.celebrated = true;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pacte_my_circle', JSON.stringify(savedCircle));
    }
    state.savedCircleData = savedCircle;
  }
}
