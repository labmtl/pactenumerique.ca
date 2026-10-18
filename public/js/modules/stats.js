/**
 * Tableau de bord national et statistiques territoriales
 */
import { state } from './state.js';

/**
 * Chargement des statistiques territoriales depuis l'API
 */
export async function loadTerritoryStats() {
  if (typeof fetch === 'undefined') return;

  try {
    const res = await fetch('/api/stats/territory');
    if (!res.ok) return;

    const data = await res.json();

    // Compteurs héro
    if (typeof document !== 'undefined') {
      const nationalCounter = document.getElementById('counterNational');
      if (nationalCounter) {
        nationalCounter.textContent = Number(data.total_national || 0).toLocaleString();
      }

      // Jauges par province
      renderProvinceStats(data.provinces || {});

      // Top RTA / FSA
      renderFsaStats(data.fsa_top || []);
    }
  } catch (err) {
    console.warn('Erreur chargement stats territoriales:', err);
  }
}

/**
 * Affiche la répartition par province
 */
export function renderProvinceStats(provinces) {
  if (typeof document === 'undefined') return;

  const container = document.getElementById('provinceStatsList');
  if (!container) return;

  const entries = Object.entries(provinces).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    container.innerHTML = `<p style="color:var(--text-dim);font-size:0.9rem;">${state.lang === 'fr' ? 'Soyez les premiers à vous engager dans votre province !' : 'Be the first to commit in your province!'}</p>`;
    return;
  }

  const max = Math.max(...entries.map(e => e[1]), 10);
  container.innerHTML = entries.map(([prov, count]) => {
    const pct = Math.min(Math.round((count / max) * 100), 100);
    return `
      <div class="stat-item">
        <div class="stat-header">
          <span>${prov}</span>
          <span><strong>${count}</strong> ${state.lang === 'fr' ? 'signataires' : 'signers'}</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Affiche le palmarès des quartiers (FSA)
 */
export function renderFsaStats(fsaList) {
  if (typeof document === 'undefined') return;

  const container = document.getElementById('fsaStatsList');
  if (!container) return;

  if (fsaList.length === 0) {
    container.innerHTML = `<p style="color:var(--text-dim);font-size:0.9rem;">${state.lang === 'fr' ? 'Aucun quartier actif pour le moment. Signez pour mobiliser le vôtre !' : 'No active neighborhoods yet. Sign to mobilize yours!'}</p>`;
    return;
  }

  container.innerHTML = fsaList.slice(0, 7).map(item => {
    const threshold = item.target_threshold || 100;
    const pct = Math.min(Math.round((item.signers_count / threshold) * 100), 100);
    return `
      <div class="stat-item">
        <div class="stat-header">
          <span>Quartier <strong>${item.fsa}</strong> (${item.province})</span>
          <span>${item.signers_count} / ${threshold} (${pct}%)</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width: ${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}
