import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, LogOut, Plus, ExternalLink,
  Settings, Check, X, RefreshCw, ChevronLeft, Lock,
  UtensilsCrossed, Archive, ClipboardList, Calendar, ShoppingCart, Pencil, Eye
} from 'lucide-react';

/* ---------- dados iniciais ---------- */

const SEED_USERS = [
  { name: 'Alexandre', setor: 'Direção', pin: '0000' },
  { name: 'Thiago', setor: 'Vice Direção', pin: '0000' },
  { name: 'Karen', setor: 'Coordenação 1', pin: '0000' },
  { name: 'Ana Paula', setor: 'Coordenação 2', pin: '0000' },
  { name: 'Luehy', setor: 'Orientação 1', pin: '0000' },
  { name: 'Charlene', setor: 'Orientação 2', pin: '0000' },
  { name: 'Letícia', setor: 'Orientação 2', pin: '0000' },
  { name: 'Miriã', setor: 'Orientação 2', pin: '0000' },
  { name: 'Katiane', setor: 'Orientação 3', pin: '0000' },
  { name: 'Alice', setor: 'Secretaria', pin: '0000' },
  { name: 'Elivelto', setor: 'Capelania', pin: '0000' },
  { name: 'Alan', setor: 'TI', pin: '0000' },
  { name: 'Alex', setor: 'Disciplinar', pin: '0000' },
];

const DEFAULT_CONFIG = {
  cicloAtual: 1,
  cicloInicioEm: todayISO(),
  adminPin: '0000',
  diretorPin: '0000',
  assistentePin: '0000',
};

const STATUS_LABELS = {
  pendente: 'Aguardando aprovação',
  aprovada: 'Aprovada',
  reprovada: 'Reprovada',
  comprada: 'Comprada',
  entregue: 'Entregue',
};

const STATUS_CLASS = {
  pendente: 'st-pendente',
  aprovada: 'st-aprovada',
  reprovada: 'st-reprovada',
  comprada: 'st-comprada',
  entregue: 'st-entregue',
};

const PRIORIDADE_CLASS = {
  'Planejada': 'pr-planejada',
  'Próxima compra': 'pr-proxima',
  'Urgente': 'pr-urgente',
  'Prazo vencido': 'pr-vencido',
};

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const APP_VERSION = '1.2';
const APP_DEVELOPER = 'Daniel Saavedra';

/* ---------- utilitários ---------- */

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDateBR(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function formatDateTimeBR(iso) {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (isNaN(dt)) return '—';
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  const hh = String(dt.getHours()).padStart(2, '0');
  const mm = String(dt.getMinutes()).padStart(2, '0');
  return `${d}/${m}/${y} às ${hh}h${mm}`;
}

function formatDateLongBR(input) {
  const d = typeof input === 'string' ? new Date(input + 'T00:00:00') : input;
  if (isNaN(d)) return '—';
  return `${d.getDate()} de ${MESES[d.getMonth()]}`;
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Próxima quarta-feira em que uma nova solicitação pode entrar,
 *  já considerando o corte de terça-feira às 12h. */
function proximaQuartaValida() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = today.getDay();
  const diff = (3 - day + 7) % 7;
  const nextWed = new Date(today);
  nextWed.setDate(today.getDate() + diff);
  const cutoff = new Date(nextWed);
  cutoff.setDate(nextWed.getDate() - 1);
  cutoff.setHours(12, 0, 0, 0);
  if (now > cutoff) nextWed.setDate(nextWed.getDate() + 7);
  return nextWed;
}

/** Quarta-feira mais próxima de hoje (sem considerar o corte) —
 *  usada para o admin ver "o que comprar hoje/nesta quarta". */
function quartaMaisProxima() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = today.getDay();
  const diff = (3 - day + 7) % 7;
  const wed = new Date(today);
  wed.setDate(today.getDate() + diff);
  return wed;
}

/** Itens aprovados/comprados desta quarta-feira, para a tela de checklist. */
function itensParaComprarNestaQuarta(requests, cicloAtual) {
  const wedAtual = quartaMaisProxima();
  const wedAtualISO = toISODate(wedAtual);
  const itens = requests
    .filter(r => r.tipo === 'compra' && r.ciclo === cicloAtual && (r.status === 'aprovada' || r.status === 'comprada') && r.quartaAlvo === wedAtualISO)
    .sort((a, b) => a.material.localeCompare(b.material));
  return { wedAtual, itens };
}

function calcPrioridade(dataLimiteStr) {
  if (!dataLimiteStr) return 'Planejada';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(dataLimiteStr + 'T00:00:00');
  const proxQuarta = proximaQuartaValida();
  if (limite < hoje) return 'Prazo vencido';
  if (limite < proxQuarta) return 'Urgente';
  const fimJanela = new Date(proxQuarta);
  fimJanela.setDate(proxQuarta.getDate() + 6);
  if (limite >= proxQuarta && limite <= fimJanela) return 'Próxima compra';
  return 'Planejada';
}

function diasParaEvento(dataHorarioStr) {
  if (!dataHorarioStr) return null;
  const evento = new Date(dataHorarioStr);
  const now = new Date();
  return Math.ceil((evento - now) / (1000 * 60 * 60 * 24));
}

function rotuloEvento(dataHorarioStr) {
  const dias = diasParaEvento(dataHorarioStr);
  if (dias === null) return { texto: '—', urgente: false };
  if (dias < 0) return { texto: 'Data passada', urgente: true };
  if (dias <= 2) return { texto: 'Compra no dia do evento', urgente: true };
  if (dias === 0) return { texto: 'Hoje', urgente: true };
  return { texto: `Faltam ${dias} dia${dias === 1 ? '' : 's'}`, urgente: false };
}

/* ---------- armazenamento (via função serverless do Netlify) ---------- */

async function loadShared(key) {
  try {
    const res = await fetch(`/api/data?key=${encodeURIComponent(key)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

async function saveShared(key, value) {
  try {
    const res = await fetch(`/api/data?key=${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(value),
    });
    return res.ok;
  } catch (e) {
    console.error('erro ao salvar', key, e);
    return false;
  }
}

/* ---------- estilo global ---------- */

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

      .coap-app {
        --bg: #F4F6FA;
        --surface: #FFFFFF;
        --surface-alt: #EEF1F8;
        --ink: #16213D;
        --ink-soft: #5C657D;
        --primary: #0A1E4E;
        --primary-dark: #061336;
        --primary-soft: #E7EAF5;
        --accent: #F5B700;
        --accent-dark: #C98A00;
        --accent-soft: #FDF1CE;
        --info: #2C5697;
        --danger: #C4432B;
        --danger-dark: #93301D;
        --pending: #8A7F63;
        --border: #DBE0EC;

        font-family: 'Inter', system-ui, sans-serif;
        color: var(--ink);
        background: var(--bg);
        min-height: 100vh;
        width: 100%;
        box-sizing: border-box;
        line-height: 1.45;
      }
      .coap-app *, .coap-app *::before, .coap-app *::after { box-sizing: border-box; }
      .coap-app h1, .coap-app h2, .coap-app h3 {
        font-family: 'Poppins', system-ui, sans-serif;
        font-weight: 700;
        color: var(--ink);
        margin: 0;
      }
      .coap-app button { font-family: inherit; cursor: pointer; }
      .coap-app input, .coap-app select, .coap-app textarea {
        font-family: inherit;
        font-size: 14px;
        color: var(--ink);
      }
      .coap-shell { max-width: 1100px; margin: 0 auto; padding: 20px 18px 60px; }

      /* topo */
      .coap-topbar {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; padding: 10px 0 16px; margin-bottom: 20px;
        border-bottom: 3px solid var(--accent); flex-wrap: wrap;
      }
      .coap-brand { display: flex; align-items: center; gap: 12px; }
      .coap-logo { height: 46px; width: auto; display: block; }
      .coap-brand-text h1 { font-size: 18px; letter-spacing: -0.01em; color: var(--primary); }
      .coap-brand-text span { font-size: 12px; color: var(--ink-soft); }
      .coap-who { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--ink-soft); flex-wrap: wrap; }
      .coap-who b { color: var(--ink); font-weight: 600; }
      .coap-iconbtn {
        display: inline-flex; align-items: center; gap: 6px;
        background: var(--surface); border: 1px solid var(--border);
        padding: 7px 11px; border-radius: 7px; font-size: 13px; color: var(--primary);
      }
      .coap-iconbtn:hover { border-color: var(--primary); background: var(--primary-soft); }

      /* login */
      .coap-login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: linear-gradient(180deg, var(--primary) 0%, var(--primary) 220px, var(--bg) 220px); position: relative; }
      .coap-version-footer { position: fixed; bottom: 12px; left: 16px; font-size: 11px; line-height: 1.5; color: var(--ink-soft); opacity: 0.65; }
      .coap-login-card { width: 100%; max-width: 420px; background: var(--surface); border-radius: 16px; padding: 30px 28px; box-shadow: 0 18px 40px rgba(10,30,78,0.18); }
      .coap-login-logo { height: 90px; width: auto; display: block; margin: 0 auto 16px; }
      .coap-login-hero { margin-bottom: 22px; text-align: center; }
      .coap-login-hero p { color: var(--ink-soft); font-size: 13.5px; margin: 0; }
      .coap-roles { display: flex; background: var(--surface-alt); border-radius: 9px; padding: 3px; margin-bottom: 22px; }
      .coap-role-tab {
        flex: 1; background: none; border: none; padding: 9px 4px;
        font-size: 13px; color: var(--ink-soft); border-radius: 7px; font-weight: 500;
      }
      .coap-role-tab.active { color: var(--primary); background: var(--surface); box-shadow: 0 1px 4px rgba(10,30,78,0.14); font-weight: 700; }
      .coap-field { margin-bottom: 14px; }
      .coap-field label { display: block; font-size: 12.5px; color: var(--ink-soft); margin-bottom: 5px; font-weight: 500; }
      .coap-field input, .coap-field select, .coap-field textarea {
        width: 100%; padding: 10px 11px; background: var(--surface-alt);
        border: 1.5px solid transparent; border-radius: 8px; outline: none;
      }
      .coap-field input:focus, .coap-field select:focus, .coap-field textarea:focus {
        border-color: var(--primary); background: var(--surface);
      }
      .coap-field textarea { resize: vertical; min-height: 64px; }
      .coap-item-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
      .coap-item-row-fields { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
      .coap-item-row-fields input { flex: 1; min-width: 110px; padding: 9px 10px; background: var(--surface-alt); border: 1.5px solid transparent; border-radius: 8px; outline: none; }
      .coap-item-row-fields input:focus { border-color: var(--primary); background: var(--surface); }
      .coap-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 7px;
        background: var(--primary); color: #fff; border: none;
        padding: 11px 18px; border-radius: 8px; font-size: 14px; font-weight: 600;
      }
      .coap-btn:hover { background: var(--primary-dark); }
      .coap-btn.full { width: 100%; }
      .coap-btn.accent { background: var(--accent); color: var(--primary-dark); }
      .coap-btn.accent:hover { background: var(--accent-dark); color: #fff; }
      .coap-btn.secondary { background: transparent; color: var(--primary); border: 1.5px solid var(--primary); }
      .coap-btn.secondary:hover { background: var(--primary-soft); }
      .coap-btn.ghost { background: transparent; color: var(--ink-soft); border: 1px solid var(--border); }
      .coap-btn.danger { background: var(--danger); }
      .coap-btn.danger:hover { background: var(--danger-dark); }
      .coap-btn:disabled { opacity: .5; cursor: default; }
      .coap-hint { font-size: 12px; color: var(--ink-soft); margin-top: 14px; text-align: center; }

      /* aviso de corte */
      .coap-info-banner {
        display: flex; align-items: flex-start; gap: 10px;
        background: var(--accent-soft); border: 1px solid var(--accent); border-radius: 10px;
        padding: 12px 14px; margin-bottom: 18px; font-size: 13.5px; color: var(--primary-dark);
      }
      .coap-info-banner svg { flex-shrink: 0; margin-top: 2px; color: var(--accent-dark); }

      .coap-warn-banner {
        display: flex; align-items: flex-start; gap: 10px;
        background: #FBEAE4; border: 1px solid var(--danger); border-radius: 10px;
        padding: 12px 14px; margin-bottom: 14px; font-size: 13.5px; color: var(--danger-dark);
      }
      .coap-warn-banner svg { flex-shrink: 0; margin-top: 2px; color: var(--danger); }

      /* faixa de estatísticas */
      .coap-stats { display: flex; border: 1px solid var(--border); background: var(--surface); margin-bottom: 22px; flex-wrap: wrap; border-radius: 12px; overflow: hidden; }
      .coap-stat { flex: 1; min-width: 120px; padding: 14px 16px; border-right: 1px solid var(--border); }
      .coap-stat:last-child { border-right: none; }
      .coap-stat b { display: block; font-size: 25px; font-family: 'Poppins', sans-serif; font-weight: 700; color: var(--primary); }
      .coap-stat span { font-size: 11.5px; color: var(--ink-soft); }

      /* abas */
      .coap-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
      .coap-tab {
        background: var(--surface); border: 1px solid var(--border); color: var(--ink-soft);
        padding: 8px 14px; border-radius: 8px; font-size: 13px; display:flex; align-items:center; gap:6px; font-weight: 500;
      }
      .coap-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }

      /* cartão / seção */
      .coap-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 18px; margin-bottom: 18px; }
      .coap-panel h2 { font-size: 16.5px; margin-bottom: 14px; }
      .coap-row-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }

      /* painel de compras da semana */
      .coap-shop-panel { border-radius: 12px; padding: 18px; margin-bottom: 16px; border: 1px solid var(--border); }
      .coap-shop-panel.destaque { background: var(--primary); color: #fff; border-color: var(--primary); }
      .coap-shop-panel.destaque h2 { color: #fff; }
      .coap-shop-panel.destaque .coap-shop-sub { color: #C9D3EC; }
      .coap-shop-title { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
      .coap-shop-sub { font-size: 12.5px; color: var(--ink-soft); margin-bottom: 14px; }
      .coap-shop-item {
        display: flex; justify-content: space-between; align-items: center; gap: 10px;
        padding: 9px 0; border-bottom: 1px solid rgba(255,255,255,0.15);
      }
      .coap-shop-panel:not(.destaque) .coap-shop-item { border-bottom: 1px solid var(--border); }
      .coap-shop-item:last-child { border-bottom: none; }
      .coap-shop-item-info strong { display: block; font-size: 13.5px; }
      .coap-shop-item-info span { font-size: 12px; opacity: 0.8; }
      .coap-shop-empty { font-size: 13px; opacity: 0.85; padding: 6px 0; }

      /* checklist do modo compras */
      .coap-check-list { display: flex; flex-direction: column; }
      .coap-check-item { display: flex; align-items: center; gap: 14px; padding: 13px 8px; border-bottom: 1px solid var(--border); cursor: pointer; }
      .coap-check-item:last-child { border-bottom: none; }
      .coap-check-item input[type="checkbox"] { width: 25px; height: 25px; accent-color: var(--primary); flex-shrink: 0; cursor: pointer; }
      .coap-check-info { display: flex; flex-direction: column; gap: 2px; }
      .coap-check-info strong { font-size: 15px; }
      .coap-check-info span { font-size: 12.5px; color: var(--ink-soft); display: flex; align-items: center; gap: 4px; }
      .coap-check-item.checked { background: var(--surface-alt); border-radius: 8px; }
      .coap-check-item.checked .coap-check-info strong, .coap-check-item.checked .coap-check-info span { text-decoration: line-through; color: var(--ink-soft); }

      /* filtros */
      .coap-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 10px 14px; margin-bottom: 16px; }
      .coap-filters .coap-field { margin-bottom: 0; }

      /* tabela */
      .coap-table-wrap { overflow-x: auto; border: 1px solid var(--border); background: var(--surface); border-radius: 12px; }
      table.coap-table { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 760px; }
      table.coap-table th {
        text-align: left; padding: 10px 12px; font-size: 11px; color: var(--ink-soft);
        border-bottom: 1px solid var(--border); font-weight: 600; white-space: nowrap; text-transform: uppercase; letter-spacing: .03em;
      }
      table.coap-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
      table.coap-table tr:last-child td { border-bottom: none; }
      .coap-empty { padding: 26px 12px; text-align: center; color: var(--ink-soft); font-size: 13.5px; }

      /* selos */
      .coap-badge {
        display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px 3px 7px;
        font-size: 11.5px; font-weight: 600; border-radius: 6px; white-space: nowrap;
      }
      .st-pendente { background: #EFEBDF; color: #6B6146; }
      .st-aprovada { background: var(--primary-soft); color: var(--primary); }
      .st-reprovada { background: #F6E4DE; color: var(--danger-dark); }
      .st-comprada { background: var(--accent-soft); color: var(--accent-dark); }
      .st-entregue { background: #DCEBE0; color: #1F6B3A; }
      .pr-planejada { background: #EFF1F6; color: var(--ink-soft); }
      .pr-proxima { background: var(--primary-soft); color: var(--info); }
      .pr-urgente { background: #F6E4DE; color: var(--danger-dark); }
      .pr-vencido { background: var(--danger-dark); color: #fff; font-weight: 700; }

      .coap-link { color: var(--info); text-decoration: underline; font-size: 12.5px; display: inline-flex; align-items: center; gap: 4px; }
      .coap-actions-cell { display: flex; gap: 6px; flex-wrap: wrap; }
      .coap-mini-btn {
        border: 1px solid var(--border); background: var(--surface); color: var(--ink);
        padding: 5px 10px; font-size: 12px; border-radius: 6px; display: inline-flex; align-items: center; gap: 4px; font-weight: 500;
      }
      .coap-mini-btn:hover { background: var(--surface-alt); }
      .coap-mini-btn.approve { border-color: var(--primary); color: var(--primary); }
      .coap-mini-btn.reject { border-color: var(--danger); color: var(--danger-dark); }

      .coap-obs { font-size: 12px; color: var(--ink-soft); margin-top: 4px; }

      /* cards de solicitação (visão do solicitante) */
      .coap-req-list { display: flex; flex-direction: column; gap: 10px; }
      .coap-req-card { border: 1px solid var(--border); background: var(--surface); padding: 13px 15px; border-radius: 10px; }
      .coap-req-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
      .coap-req-card-top strong { font-size: 14.5px; }
      .coap-req-meta { font-size: 12.5px; color: var(--ink-soft); }
      .coap-req-alvo { font-size: 12px; color: var(--primary); font-weight: 600; margin-top: 4px; }

      /* barras por setor */
      .coap-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 12.5px; }
      .coap-bar-label { width: 130px; flex-shrink: 0; color: var(--ink-soft); }
      .coap-bar-track { flex: 1; background: var(--surface-alt); height: 8px; border-radius: 4px; }
      .coap-bar-fill { background: var(--accent); height: 8px; border-radius: 4px; }
      .coap-bar-count { width: 24px; text-align: right; color: var(--ink-soft); }

      /* toast */
      .coap-toast {
        position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%);
        background: var(--primary); color: #fff; padding: 10px 18px; border-radius: 8px;
        font-size: 13.5px; z-index: 50; box-shadow: 0 8px 24px rgba(10,30,78,0.3);
      }

      /* modal */
      .coap-modal-bg {
        position: fixed; inset: 0; background: rgba(10,20,50,0.5);
        display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 40;
      }
      .coap-modal { background: var(--surface); max-width: 480px; width: 100%; padding: 22px; max-height: 88vh; overflow-y: auto; border-radius: 14px; }
      .coap-modal h2 { font-size: 18px; margin-bottom: 4px; }
      .coap-modal .coap-modal-sub { font-size: 13px; color: var(--ink-soft); margin-bottom: 16px; }
      .coap-modal-foot { display: flex; gap: 10px; margin-top: 18px; }
      .coap-detail-list { display: flex; flex-direction: column; gap: 9px; font-size: 13.5px; margin-bottom: 6px; }
      .coap-detail-list strong { color: var(--ink-soft); font-weight: 600; margin-right: 4px; }

      .coap-back { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; color: var(--ink-soft); font-size: 13px; margin-bottom: 14px; padding: 0; }

      .coap-settings-block { margin-bottom: 22px; }
      .coap-settings-block h3 { font-size: 14.5px; margin-bottom: 10px; }
      .coap-user-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 13.5px; flex-wrap: wrap; }
      .coap-user-row .name { width: 110px; font-weight: 600; }
      .coap-user-row .setor { flex: 1; color: var(--ink-soft); }
      .coap-user-row input { width: 70px; padding: 5px 7px; border: 1px solid var(--border); border-radius: 6px; }

      @media (max-width: 560px) {
        .coap-stat { min-width: 45%; }
        .coap-who { width: 100%; justify-content: space-between; }
        .coap-logo { height: 36px; }
      }

      /* tabelas viram cartões no celular */
      @media (max-width: 700px) {
        .coap-table-wrap { overflow-x: visible; border: none; background: none; }
        table.coap-table { min-width: 0; width: 100%; border-collapse: separate; border-spacing: 0 10px; }
        table.coap-table thead { display: none; }
        table.coap-table, table.coap-table tbody, table.coap-table tr { display: block; width: 100%; }
        table.coap-table tr { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 4px 14px; }
        table.coap-table td { display: block; border: none; padding: 7px 0; }
        table.coap-table td[data-label]::before {
          content: attr(data-label); display: block; font-size: 10.5px; text-transform: uppercase;
          letter-spacing: .05em; color: var(--ink-soft); margin-bottom: 2px; font-weight: 600;
        }
      }
    `}</style>
  );
}

/* ---------- tela de carregamento ---------- */

function LoadingScreen() {
  return (
    <div className="coap-app">
      <GlobalStyle />
      <div className="coap-login-wrap">
        <span style={{ color: '#fff', fontSize: 14 }}>Carregando…</span>
      </div>
    </div>
  );
}

/* ---------- login ---------- */

function LoginScreen({ users, onLoginSolicitante, onLoginAdmin, onLoginDiretor, onLoginAssistente }) {
  const [role, setRole] = useState('solicitante');
  const [nome, setNome] = useState('');
  const [pin, setPin] = useState('');
  const [erro, setErro] = useState('');

  function submit(e) {
    e.preventDefault();
    setErro('');
    if (role === 'solicitante') {
      if (!nome) { setErro('Selecione seu nome.'); return; }
      const ok = onLoginSolicitante(nome, pin.trim());
      if (ok === false) setErro('PIN incorreto.');
    } else if (role === 'admin') {
      const ok = onLoginAdmin(pin.trim());
      if (ok === false) setErro('PIN incorreto.');
    } else if (role === 'diretor') {
      const ok = onLoginDiretor(pin.trim());
      if (ok === false) setErro('PIN incorreto.');
    } else {
      const ok = onLoginAssistente(pin.trim());
      if (ok === false) setErro('PIN incorreto.');
    }
  }

  return (
    <div className="coap-app">
      <GlobalStyle />
      <div className="coap-login-wrap">
        <div className="coap-login-card">
          <div className="coap-login-hero">
            <img src="/logo.png" alt="Colégio Adventista de Paulínia" className="coap-login-logo" />
            <p>Compras COAP — registro e acompanhamento de solicitações de compra</p>
          </div>
          <div className="coap-roles">
            <button type="button" className={`coap-role-tab ${role === 'solicitante' ? 'active' : ''}`} onClick={() => { setRole('solicitante'); setErro(''); }}>Solicitante</button>
            <button type="button" className={`coap-role-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => { setRole('admin'); setErro(''); }}>Administrador</button>
            <button type="button" className={`coap-role-tab ${role === 'assistente' ? 'active' : ''}`} onClick={() => { setRole('assistente'); setErro(''); }}>Compras</button>
            <button type="button" className={`coap-role-tab ${role === 'diretor' ? 'active' : ''}`} onClick={() => { setRole('diretor'); setErro(''); }}>Diretor</button>
          </div>
          <form onSubmit={submit}>
            {role === 'solicitante' && (
              <div className="coap-field">
                <label>Seu nome</label>
                <select value={nome} onChange={e => setNome(e.target.value)}>
                  <option value="">Selecione…</option>
                  {users.map(u => <option key={u.name} value={u.name}>{u.name} — {u.setor}</option>)}
                </select>
              </div>
            )}
            <div className="coap-field">
              <label>PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value)} placeholder="0000" />
            </div>
            {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 12 }}>{erro}</div>}
            <button className="coap-btn accent full" type="submit"><Lock size={15} /> Entrar</button>
          </form>
          <p className="coap-hint">PIN padrão: 0000. Depois do primeiro acesso, altere o seu PIN dentro do sistema.</p>
        </div>
        <div className="coap-version-footer">
          <div>v{APP_VERSION}</div>
          <div>Desenvolvido por: {APP_DEVELOPER}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------- selos ---------- */

function StatusBadge({ status }) {
  return <span className={`coap-badge ${STATUS_CLASS[status]}`}>{STATUS_LABELS[status]}</span>;
}

function PrioridadeBadge({ dataLimite }) {
  const p = calcPrioridade(dataLimite);
  return <span className={`coap-badge ${PRIORIDADE_CLASS[p]}`}>{p}</span>;
}

function EventoBadge({ dataHorario }) {
  const { texto, urgente } = rotuloEvento(dataHorario);
  return <span className={`coap-badge ${urgente ? 'pr-urgente' : 'pr-proxima'}`}>{texto}</span>;
}

/* ---------- formulário: nova compra ---------- */

function FormCompra({ onCancel, onSubmit, initial }) {
  const [itens, setItens] = useState(
    initial ? [{ material: initial.material, quantidade: String(initial.quantidade), link: initial.link || '' }]
      : [{ material: '', quantidade: '', link: '' }]
  );
  const [atividadeProjeto, setAtividadeProjeto] = useState(initial?.atividadeProjeto || '');
  const [dataLimite, setDataLimite] = useState(initial?.dataLimite || '');
  const [observacoesSolicitante, setObservacoesSolicitante] = useState(initial?.observacoesSolicitante || '');

  const alvo = proximaQuartaValida();
  const alvoISO = toISODate(alvo);
  const prazoImpossivel = dataLimite !== '' && dataLimite < alvoISO;
  const itensValidos = itens.every(it => it.material.trim() && it.quantidade);
  const podeEnviar = itensValidos && atividadeProjeto && dataLimite && !prazoImpossivel;

  function atualizarItem(idx, campo, valor) {
    setItens(itens.map((it, i) => (i === idx ? { ...it, [campo]: valor } : it)));
  }

  function adicionarItem() {
    setItens([...itens, { material: '', quantidade: '', link: '' }]);
  }

  function removerItem(idx) {
    setItens(itens.filter((_, i) => i !== idx));
  }

  function submit(e) {
    e.preventDefault();
    if (!podeEnviar) return;
    const grupoId = itens.length > 1 ? uid() : undefined;
    const dados = itens.map((it, idx) => ({
      tipo: 'compra', material: it.material.trim(), quantidade: Number(it.quantidade), link: it.link,
      atividadeProjeto, dataLimite, observacoesSolicitante, quartaAlvo: alvoISO,
      ...(grupoId ? { grupoId, grupoIndex: idx + 1, grupoTotal: itens.length } : {}),
    }));
    onSubmit(dados);
  }

  return (
    <div className="coap-panel">
      <button className="coap-back" onClick={onCancel}><ChevronLeft size={15} /> Voltar</button>
      <h2>{initial ? 'Editar solicitação de compra' : 'Nova solicitação de compra'}</h2>
      <div className="coap-info-banner">
        <Calendar size={16} />
        <span>
          {initial ? 'Salvando agora, sua' : 'Enviando agora, sua'} solicitação entra na compra de <strong>quarta-feira, {formatDateLongBR(alvo)}</strong>.
          As compras fecham toda <strong>terça-feira às 12h</strong> — pedidos enviados depois desse horário entram automaticamente na semana seguinte.
        </span>
      </div>
      <form onSubmit={submit}>
        <div className="coap-field">
          <label>Atividade / projeto em que será usado</label>
          <input value={atividadeProjeto} onChange={e => setAtividadeProjeto(e.target.value)} required placeholder="Ex.: Spelling Bee" />
        </div>
        <div className="coap-field">
          <label>Data limite — quando precisa ter o material em mãos</label>
          <input type="date" value={dataLimite} onChange={e => setDataLimite(e.target.value)} required />
        </div>

        {!initial && itens.length > 1 && (
          <p className="coap-modal-sub">Data limite e atividade valem para todos os itens abaixo. Cada item vira uma solicitação própria, aparecendo separado na lista de compras.</p>
        )}

        {itens.map((it, idx) => (
          <div className="coap-item-row" key={idx}>
            <div className="coap-item-row-fields">
              <input placeholder="Material solicitado" value={it.material} onChange={e => atualizarItem(idx, 'material', e.target.value)} required />
              <input placeholder="Quantidade" type="number" min="1" value={it.quantidade} onChange={e => atualizarItem(idx, 'quantidade', e.target.value)} required />
              <input placeholder="Link (opcional)" value={it.link} onChange={e => atualizarItem(idx, 'link', e.target.value)} />
            </div>
            {!initial && itens.length > 1 && (
              <button type="button" className="coap-mini-btn reject" onClick={() => removerItem(idx)}><X size={12} /></button>
            )}
          </div>
        ))}

        {!initial && (
          <button type="button" className="coap-btn secondary" style={{ marginBottom: 18 }} onClick={adicionarItem}>
            <Plus size={14} /> Adicionar outro item deste mesmo pedido
          </button>
        )}

        {prazoImpossivel && (
          <div className="coap-warn-banner">
            <X size={16} />
            <span>
              Não é possível registrar com essa data: <strong>{formatDateBR(dataLimite)}</strong> é anterior à próxima compra do ciclo normal
              (<strong>quarta-feira, {formatDateLongBR(alvo)}</strong>). Escolha {formatDateBR(alvoISO)} ou uma data posterior.
              Para uma emergência real que não pode esperar, fale diretamente com a administração.
            </span>
          </div>
        )}
        <div className="coap-field">
          <label>Observações (opcional)</label>
          <textarea value={observacoesSolicitante} onChange={e => setObservacoesSolicitante(e.target.value)} />
        </div>
        <button className="coap-btn accent" type="submit" disabled={!podeEnviar}><Check size={15} /> {initial ? 'Salvar alterações' : itens.length > 1 ? `Enviar ${itens.length} itens` : 'Enviar solicitação'}</button>
      </form>
    </div>
  );
}

/* ---------- formulário: nova reunião / capacitação ---------- */

function FormReuniao({ onCancel, onSubmit, initial }) {
  const [assunto, setAssunto] = useState(initial?.assunto || '');
  const [dataHorario, setDataHorario] = useState(initial?.dataHorario || '');
  const [participantes, setParticipantes] = useState(initial ? String(initial.participantes) : '');
  const [cardapioSugestao, setCardapioSugestao] = useState(initial?.cardapioSugestao || '');
  const [observacoesSolicitante, setObservacoesSolicitante] = useState(initial?.observacoesSolicitante || '');

  function submit(e) {
    e.preventDefault();
    if (!assunto || !dataHorario || !participantes) return;
    onSubmit([{
      tipo: 'reuniao', assunto, dataHorario, participantes: Number(participantes),
      cardapioSugestao, observacoesSolicitante,
    }]);
  }

  return (
    <div className="coap-panel">
      <button className="coap-back" onClick={onCancel}><ChevronLeft size={15} /> Voltar</button>
      <h2>{initial ? 'Editar reunião, capacitação ou treinamento' : 'Nova reunião, capacitação ou treinamento'}</h2>
      <p className="coap-modal-sub">A alimentação desse tipo de solicitação é comprada fresca, no próprio dia do evento — por isso ela não segue o ciclo semanal de compras.</p>
      <form onSubmit={submit}>
        <div className="coap-field">
          <label>Do que se trata</label>
          <input value={assunto} onChange={e => setAssunto(e.target.value)} required />
        </div>
        <div className="coap-field">
          <label>Data e horário</label>
          <input type="datetime-local" value={dataHorario} onChange={e => setDataHorario(e.target.value)} required />
        </div>
        <div className="coap-field">
          <label>Quantidade total de participantes (inclua equipe de apoio, como TI)</label>
          <input type="number" min="1" value={participantes} onChange={e => setParticipantes(e.target.value)} required />
        </div>
        <div className="coap-field">
          <label>Sugestão de cardápio (o setor responsável pode ajustar)</label>
          <textarea value={cardapioSugestao} onChange={e => setCardapioSugestao(e.target.value)} />
        </div>
        <div className="coap-field">
          <label>Observações (opcional)</label>
          <textarea value={observacoesSolicitante} onChange={e => setObservacoesSolicitante(e.target.value)} />
        </div>
        <button className="coap-btn accent" type="submit"><Check size={15} /> {initial ? 'Salvar alterações' : 'Enviar solicitação'}</button>
      </form>
    </div>
  );
}

/* ---------- modal: alterar PIN ---------- */

function PinModal({ onClose, onSave }) {
  const [novoPin, setNovoPin] = useState('');
  return (
    <div className="coap-modal-bg" onClick={onClose}>
      <div className="coap-modal" onClick={e => e.stopPropagation()}>
        <h2>Alterar PIN</h2>
        <p className="coap-modal-sub">Escolha um PIN novo para o seu acesso.</p>
        <div className="coap-field">
          <label>Novo PIN</label>
          <input type="password" inputMode="numeric" maxLength={6} value={novoPin} onChange={e => setNovoPin(e.target.value)} />
        </div>
        <div className="coap-modal-foot">
          <button className="coap-btn secondary" onClick={onClose}>Cancelar</button>
          <button className="coap-btn accent" disabled={!novoPin} onClick={() => { onSave(novoPin.trim()); onClose(); }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- modal: detalhes completos de uma solicitação ---------- */

function DetalhesModal({ request, onClose }) {
  const r = request;
  return (
    <div className="coap-modal-bg" onClick={onClose}>
      <div className="coap-modal" onClick={e => e.stopPropagation()}>
        <h2>{r.tipo === 'compra' ? r.material : r.assunto}</h2>
        <p className="coap-modal-sub">Solicitado por {r.solicitante} · {r.setor} · registrado em {formatDateTimeBR(r.criadoEm)}</p>
        <div className="coap-detail-list">
          {r.tipo === 'compra' ? (
            <>
              <div><strong>Quantidade:</strong> {r.quantidade}</div>
              <div><strong>Atividade / projeto:</strong> {r.atividadeProjeto}</div>
              <div><strong>Data limite:</strong> {formatDateBR(r.dataLimite)}</div>
              {r.quartaAlvo && <div><strong>Compra prevista:</strong> quarta-feira, {formatDateLongBR(r.quartaAlvo)}</div>}
              <div><strong>Link de compra:</strong> {r.link ? <a className="coap-link" href={r.link} target="_blank" rel="noreferrer"><ExternalLink size={11} /> {r.link}</a> : '—'}</div>
              {r.grupoTotal > 1 && <div><strong>Pedido com múltiplos itens:</strong> item {r.grupoIndex} de {r.grupoTotal}</div>}
            </>
          ) : (
            <>
              <div><strong>Data e horário:</strong> {formatDateTimeBR(r.dataHorario)}</div>
              <div><strong>Participantes:</strong> {r.participantes}</div>
              <div><strong>Cardápio sugerido:</strong> {r.cardapioSugestao || '—'}</div>
            </>
          )}
          <div><strong>Observações do solicitante:</strong> {r.observacoesSolicitante || '—'}</div>
          {r.motivoUrgencia && <div><strong>Motivo da urgência:</strong> {r.motivoUrgencia}</div>}
          <div><strong>Situação:</strong> <StatusBadge status={r.status} /></div>
          <div><strong>Observação da administração:</strong> {r.observacaoAdmin || '—'}</div>
          {r.aprovadoEm && <div><strong>Avaliado em:</strong> {formatDateTimeBR(r.aprovadoEm)}</div>}
          {r.compradoEm && <div><strong>Comprado em:</strong> {formatDateTimeBR(r.compradoEm)}</div>}
          {r.entregueEm && <div><strong>Entregue em:</strong> {formatDateTimeBR(r.entregueEm)}</div>}
        </div>
        <div className="coap-modal-foot">
          <button className="coap-btn secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- visão do solicitante ---------- */

function RequesterView({ session, requests, config, onLogout, onRefresh, onAdd, onEdit, onChangePin }) {
  const [tela, setTela] = useState('lista');
  const [editando, setEditando] = useState(null);
  const [showPin, setShowPin] = useState(false);
  const [aba, setAba] = useState('compra');

  const minhas = requests.filter(r => r.solicitante === session.name);
  const minhasCompras = minhas.filter(r => r.tipo === 'compra').sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const minhasReunioes = minhas.filter(r => r.tipo === 'reuniao').sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  function abrirEdicao(r) {
    setEditando(r);
    setTela(r.tipo);
  }

  function fecharFormulario() {
    setTela('lista');
    setEditando(null);
  }

  return (
    <div className="coap-shell">
      <div className="coap-topbar">
        <div className="coap-brand">
          <img src="/logo.png" alt="Colégio Adventista de Paulínia" className="coap-logo" />
          <div className="coap-brand-text"><h1>Compras COAP</h1><span>ciclo nº {config.cicloAtual}</span></div>
        </div>
        <div className="coap-who">
          <span><b>{session.name}</b> · {session.setor}</span>
          <button className="coap-iconbtn" onClick={() => setShowPin(true)}><Lock size={13} /> PIN</button>
          <button className="coap-iconbtn" onClick={onRefresh}><RefreshCw size={13} /> Atualizar</button>
          <button className="coap-iconbtn" onClick={onLogout}><LogOut size={13} /> Sair</button>
        </div>
      </div>

      {tela === 'lista' && (
        <>
          <div className="coap-row-actions">
            <button className="coap-btn accent" onClick={() => setTela('compra')}><Plus size={15} /> Nova solicitação de compra</button>
            <button className="coap-btn secondary" onClick={() => setTela('reuniao')}><Plus size={15} /> Nova reunião / capacitação</button>
          </div>

          <div className="coap-tabs">
            <button className={`coap-tab ${aba === 'compra' ? 'active' : ''}`} onClick={() => setAba('compra')}><ShoppingBag size={14} /> Minhas compras ({minhasCompras.length})</button>
            <button className={`coap-tab ${aba === 'reuniao' ? 'active' : ''}`} onClick={() => setAba('reuniao')}><UtensilsCrossed size={14} /> Minhas reuniões ({minhasReunioes.length})</button>
          </div>

          {aba === 'compra' && (
            <div className="coap-req-list">
              {minhasCompras.length === 0 && <div className="coap-panel coap-empty">Nenhuma solicitação de compra ainda.</div>}
              {minhasCompras.map(r => (
                <div key={r.id} className="coap-req-card">
                  <div className="coap-req-card-top">
                    <strong>{r.material} ({r.quantidade}){r.grupoTotal > 1 && <span className="coap-obs"> · item {r.grupoIndex}/{r.grupoTotal}</span>}</strong>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <PrioridadeBadge dataLimite={r.dataLimite} />
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="coap-req-meta">{r.atividadeProjeto} · necessário até {formatDateBR(r.dataLimite)}</div>
                  {(r.status === 'pendente' || r.status === 'aprovada') && r.quartaAlvo && (
                    <div className="coap-req-alvo">Compra prevista: quarta-feira, {formatDateLongBR(r.quartaAlvo)}</div>
                  )}
                  {r.motivoUrgencia && <div className="coap-obs">Motivo da urgência: {r.motivoUrgencia}</div>}
                  {r.link && <a className="coap-link" href={r.link} target="_blank" rel="noreferrer"><ExternalLink size={11} /> link de compra</a>}
                  {r.observacaoAdmin && <div className="coap-obs">Observação da administração: {r.observacaoAdmin}</div>}
                  {r.status === 'pendente' && (
                    <button className="coap-mini-btn" style={{ marginTop: 8 }} onClick={() => abrirEdicao(r)}><Pencil size={12} /> Editar</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {aba === 'reuniao' && (
            <div className="coap-req-list">
              {minhasReunioes.length === 0 && <div className="coap-panel coap-empty">Nenhuma reunião ou capacitação registrada ainda.</div>}
              {minhasReunioes.map(r => (
                <div key={r.id} className="coap-req-card">
                  <div className="coap-req-card-top">
                    <strong>{r.assunto}</strong>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <EventoBadge dataHorario={r.dataHorario} />
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="coap-req-meta">{formatDateTimeBR(r.dataHorario)} · {r.participantes} participantes</div>
                  {r.cardapioSugestao && <div className="coap-obs">Cardápio sugerido: {r.cardapioSugestao}</div>}
                  {r.observacaoAdmin && <div className="coap-obs">Observação da administração: {r.observacaoAdmin}</div>}
                  {r.status === 'pendente' && (
                    <button className="coap-mini-btn" style={{ marginTop: 8 }} onClick={() => abrirEdicao(r)}><Pencil size={12} /> Editar</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tela === 'compra' && (
        <FormCompra
          initial={editando}
          onCancel={fecharFormulario}
          onSubmit={lista => {
            if (editando) { onEdit(editando.id, lista[0]); } else { onAdd(lista.map(data => ({ ...data, solicitante: session.name, setor: session.setor }))); }
            fecharFormulario();
          }}
        />
      )}
      {tela === 'reuniao' && (
        <FormReuniao
          initial={editando}
          onCancel={fecharFormulario}
          onSubmit={lista => {
            if (editando) { onEdit(editando.id, lista[0]); } else { onAdd(lista.map(data => ({ ...data, solicitante: session.name, setor: session.setor }))); }
            fecharFormulario();
          }}
        />
      )}

      {showPin && <PinModal onClose={() => setShowPin(false)} onSave={pin => onChangePin(session.name, pin)} />}
    </div>
  );
}

/* ---------- faixa de estatísticas ---------- */

function StatStrip({ compras, reunioes }) {
  const pendentes = compras.filter(r => r.status === 'pendente').length;
  const aprovadas = compras.filter(r => r.status === 'aprovada').length;
  const compradas = compras.filter(r => r.status === 'comprada').length;
  const entregues = compras.filter(r => r.status === 'entregue').length;
  const reunioesPendentes = reunioes.filter(r => r.status === 'pendente').length;
  return (
    <div className="coap-stats">
      <div className="coap-stat"><b>{compras.length}</b><span>Total no ciclo</span></div>
      <div className="coap-stat"><b>{pendentes}</b><span>Aguardando aprovação</span></div>
      <div className="coap-stat"><b>{aprovadas}</b><span>Aprovadas, aguardando compra</span></div>
      <div className="coap-stat"><b>{compradas}</b><span>Compradas</span></div>
      <div className="coap-stat"><b>{entregues}</b><span>Entregues</span></div>
      <div className="coap-stat"><b>{reunioesPendentes}</b><span>Reuniões pendentes</span></div>
    </div>
  );
}

function BarrasPorSetor({ compras }) {
  const porSetor = {};
  compras.forEach(r => { porSetor[r.setor] = (porSetor[r.setor] || 0) + 1; });
  const entradas = Object.entries(porSetor).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entradas.map(e => e[1]));
  if (entradas.length === 0) return <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Sem solicitações neste ciclo.</p>;
  return (
    <div>
      {entradas.map(([setor, count]) => (
        <div className="coap-bar-row" key={setor}>
          <div className="coap-bar-label">{setor}</div>
          <div className="coap-bar-track"><div className="coap-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
          <div className="coap-bar-count">{count}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- painel "o que comprar" ---------- */

function PainelListaDeCompras({ titulo, subtitulo, itens, destaque, onPurchase }) {
  return (
    <div className={`coap-shop-panel ${destaque ? 'destaque' : ''}`}>
      <div className="coap-shop-title">
        <ShoppingCart size={17} />
        <h2>{titulo}</h2>
      </div>
      <div className="coap-shop-sub">{subtitulo}</div>
      {itens.length === 0 && <div className="coap-shop-empty">Nada aprovado com essa data ainda.</div>}
      {itens.map(r => (
        <div className="coap-shop-item" key={r.id}>
          <div className="coap-shop-item-info">
            <strong>{r.material} — {r.quantidade}</strong>
            <span>{r.solicitante} · {r.setor}{r.link && <> · <a className="coap-link" style={{ color: 'inherit' }} href={r.link} target="_blank" rel="noreferrer">link</a></>}</span>
          </div>
          {onPurchase && <button className="coap-mini-btn" onClick={() => onPurchase(r.id)}>Marcar comprado</button>}
        </div>
      ))}
    </div>
  );
}

/* ---------- tabela de solicitações (admin / diretor) ---------- */

function TabelaCompras({ items, somenteLeitura, onApprove, onReject, onPurchase, onDeliver, onDelete }) {
  const [rejeitando, setRejeitando] = useState(null);
  const [obs, setObs] = useState('');
  const [detalhando, setDetalhando] = useState(null);

  if (items.length === 0) return <div className="coap-empty">Nenhuma solicitação encontrada com esse filtro.</div>;

  return (
    <div className="coap-table-wrap">
      <table className="coap-table">
        <thead>
          <tr>
            <th>Solicitante</th><th>Setor</th><th>Material</th><th>Qtd.</th><th>Atividade</th>
            <th>Data limite</th><th>Prioridade</th><th>Situação</th><th></th>{!somenteLeitura && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(r => (
            <React.Fragment key={r.id}>
              <tr>
                <td data-label="Solicitante">{r.solicitante}</td>
                <td data-label="Setor">{r.setor}</td>
                <td data-label="Material">{r.material}{r.grupoTotal > 1 && <span className="coap-obs"> ({r.grupoIndex}/{r.grupoTotal})</span>}</td>
                <td data-label="Qtd.">{r.quantidade}</td>
                <td data-label="Atividade">{r.atividadeProjeto}</td>
                <td data-label="Data limite">{formatDateBR(r.dataLimite)}</td>
                <td data-label="Prioridade"><PrioridadeBadge dataLimite={r.dataLimite} /></td>
                <td data-label="Situação"><StatusBadge status={r.status} /></td>
                <td data-label="">
                  <button className="coap-mini-btn" onClick={() => setDetalhando(r)}><Eye size={12} /> Detalhes</button>
                </td>
                {!somenteLeitura && (
                  <td data-label="Ações">
                    <div className="coap-actions-cell">
                      {r.status === 'pendente' && <>
                        <button className="coap-mini-btn approve" onClick={() => onApprove(r.id)}><Check size={12} /> Aprovar</button>
                        <button className="coap-mini-btn reject" onClick={() => setRejeitando(r.id)}><X size={12} /> Reprovar</button>
                      </>}
                      {r.status === 'aprovada' && <button className="coap-mini-btn" onClick={() => onPurchase(r.id)}>Marcar comprado</button>}
                      {r.status === 'comprada' && <button className="coap-mini-btn" onClick={() => onDeliver(r.id)}>Marcar entregue</button>}
                      <button className="coap-mini-btn reject" onClick={() => onDelete(r.id, `${r.material} (${r.solicitante})`)}><X size={12} /> Excluir</button>
                    </div>
                  </td>
                )}
              </tr>
              {rejeitando === r.id && (
                <tr>
                  <td colSpan={10}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0' }}>
                      <input placeholder="Motivo da reprovação" value={obs} onChange={e => setObs(e.target.value)} style={{ flex: 1, padding: 6, border: '1px solid var(--border)', borderRadius: 6 }} />
                      <button className="coap-mini-btn reject" onClick={() => { onReject(r.id, obs); setRejeitando(null); setObs(''); }}>Confirmar</button>
                      <button className="coap-mini-btn" onClick={() => setRejeitando(null)}>Cancelar</button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {detalhando && <DetalhesModal request={detalhando} onClose={() => setDetalhando(null)} />}
    </div>
  );
}

function TabelaReunioes({ items, somenteLeitura, onApprove, onReject, onPurchase, onDeliver, onDelete }) {
  const [rejeitando, setRejeitando] = useState(null);
  const [obs, setObs] = useState('');
  const [detalhando, setDetalhando] = useState(null);

  if (items.length === 0) return <div className="coap-empty">Nenhuma reunião ou capacitação encontrada.</div>;

  return (
    <div className="coap-table-wrap">
      <table className="coap-table">
        <thead>
          <tr>
            <th>Solicitante</th><th>Setor</th><th>Assunto</th><th>Data / horário</th>
            <th>Participantes</th><th>Cardápio sugerido</th><th>Prazo</th><th>Situação</th><th></th>{!somenteLeitura && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(r => (
            <React.Fragment key={r.id}>
              <tr>
                <td data-label="Solicitante">{r.solicitante}</td>
                <td data-label="Setor">{r.setor}</td>
                <td data-label="Assunto">{r.assunto}</td>
                <td data-label="Data / horário">{formatDateTimeBR(r.dataHorario)}</td>
                <td data-label="Participantes">{r.participantes}</td>
                <td data-label="Cardápio sugerido" style={{ maxWidth: 200 }}>{r.cardapioSugestao || '—'}</td>
                <td data-label="Prazo"><EventoBadge dataHorario={r.dataHorario} /></td>
                <td data-label="Situação"><StatusBadge status={r.status} /></td>
                <td data-label="">
                  <button className="coap-mini-btn" onClick={() => setDetalhando(r)}><Eye size={12} /> Detalhes</button>
                </td>
                {!somenteLeitura && (
                  <td data-label="Ações">
                    <div className="coap-actions-cell">
                      {r.status === 'pendente' && <>
                        <button className="coap-mini-btn approve" onClick={() => onApprove(r.id)}><Check size={12} /> Aprovar</button>
                        <button className="coap-mini-btn reject" onClick={() => setRejeitando(r.id)}><X size={12} /> Reprovar</button>
                      </>}
                      {r.status === 'aprovada' && <button className="coap-mini-btn" onClick={() => onPurchase(r.id)}>Marcar comprado</button>}
                      {r.status === 'comprada' && <button className="coap-mini-btn" onClick={() => onDeliver(r.id)}>Marcar entregue</button>}
                      <button className="coap-mini-btn reject" onClick={() => onDelete(r.id, `${r.assunto} (${r.solicitante})`)}><X size={12} /> Excluir</button>
                    </div>
                  </td>
                )}
              </tr>
              {rejeitando === r.id && (
                <tr>
                  <td colSpan={10}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0' }}>
                      <input placeholder="Motivo da reprovação" value={obs} onChange={e => setObs(e.target.value)} style={{ flex: 1, padding: 6, border: '1px solid var(--border)', borderRadius: 6 }} />
                      <button className="coap-mini-btn reject" onClick={() => { onReject(r.id, obs); setRejeitando(null); setObs(''); }}>Confirmar</button>
                      <button className="coap-mini-btn" onClick={() => setRejeitando(null)}>Cancelar</button>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {detalhando && <DetalhesModal request={detalhando} onClose={() => setDetalhando(null)} />}
    </div>
  );
}

/* ---------- painel de configurações (admin) ---------- */

function PainelConfig({ users, config, onChangeUserPin, onChangeUserSetor, onAddUser, onRemoveUser, onChangeConfigPin }) {
  const [pins, setPins] = useState({});
  const [setores, setSetores] = useState({});
  const [novoNome, setNovoNome] = useState('');
  const [novoSetor, setNovoSetor] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [diretorPin, setDiretorPin] = useState('');
  const [assistentePin, setAssistentePin] = useState('');

  return (
    <div className="coap-panel">
      <div className="coap-settings-block">
        <h3>Solicitantes</h3>
        {users.map(u => (
          <div className="coap-user-row" key={u.name}>
            <span className="name">{u.name}</span>
            <input
              value={setores[u.name] ?? u.setor}
              onChange={e => setSetores({ ...setores, [u.name]: e.target.value })}
              onBlur={() => { if ((setores[u.name] ?? u.setor) !== u.setor) onChangeUserSetor(u.name, setores[u.name]); }}
              style={{ flex: 1, minWidth: 110, padding: 5, border: '1px solid var(--border)', borderRadius: 6 }}
            />
            <input placeholder="novo PIN" value={pins[u.name] || ''} onChange={e => setPins({ ...pins, [u.name]: e.target.value })} />
            <button className="coap-mini-btn" disabled={!pins[u.name]} onClick={() => { onChangeUserPin(u.name, pins[u.name]); setPins({ ...pins, [u.name]: '' }); }}>Salvar PIN</button>
            <button className="coap-mini-btn reject" onClick={() => onRemoveUser(u.name)}><X size={12} /> Excluir</button>
          </div>
        ))}
        <div className="coap-user-row" style={{ marginTop: 10, borderBottom: 'none' }}>
          <input placeholder="Nome do novo solicitante" value={novoNome} onChange={e => setNovoNome(e.target.value)} style={{ flex: 1, minWidth: 140, padding: 6, border: '1px solid var(--border)', borderRadius: 6 }} />
          <input placeholder="Setor" value={novoSetor} onChange={e => setNovoSetor(e.target.value)} style={{ flex: 1, minWidth: 110, padding: 6, border: '1px solid var(--border)', borderRadius: 6 }} />
          <button className="coap-btn accent" disabled={!novoNome.trim() || !novoSetor.trim()} onClick={() => { onAddUser(novoNome, novoSetor); setNovoNome(''); setNovoSetor(''); }}><Plus size={14} /> Adicionar</button>
        </div>
      </div>
      <div className="coap-settings-block">
        <h3>PIN do administrador</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="novo PIN" value={adminPin} onChange={e => setAdminPin(e.target.value)} style={{ padding: 6, border: '1px solid var(--border)', width: 100, borderRadius: 6 }} />
          <button className="coap-mini-btn" disabled={!adminPin} onClick={() => { onChangeConfigPin('adminPin', adminPin); setAdminPin(''); }}>Salvar</button>
        </div>
      </div>
      <div className="coap-settings-block">
        <h3>PIN da assistente de compras (Jessika)</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="novo PIN" value={assistentePin} onChange={e => setAssistentePin(e.target.value)} style={{ padding: 6, border: '1px solid var(--border)', width: 100, borderRadius: 6 }} />
          <button className="coap-mini-btn" disabled={!assistentePin} onClick={() => { onChangeConfigPin('assistentePin', assistentePin); setAssistentePin(''); }}>Salvar</button>
        </div>
      </div>
      <div className="coap-settings-block">
        <h3>PIN do diretor</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="novo PIN" value={diretorPin} onChange={e => setDiretorPin(e.target.value)} style={{ padding: 6, border: '1px solid var(--border)', width: 100, borderRadius: 6 }} />
          <button className="coap-mini-btn" disabled={!diretorPin} onClick={() => { onChangeConfigPin('diretorPin', diretorPin); setDiretorPin(''); }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- filtros compartilhados ---------- */

function Filtros({ filtros, setFiltros, setores, solicitantes, mostrarStatus }) {
  return (
    <div className="coap-filters">
      <div className="coap-field">
        <label>Setor</label>
        <select value={filtros.setor} onChange={e => setFiltros({ ...filtros, setor: e.target.value })}>
          <option value="">Todos</option>
          {setores.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="coap-field">
        <label>Solicitante</label>
        <select value={filtros.solicitante} onChange={e => setFiltros({ ...filtros, solicitante: e.target.value })}>
          <option value="">Todos</option>
          {solicitantes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {mostrarStatus && (
        <div className="coap-field">
          <label>Situação</label>
          <select value={filtros.status} onChange={e => setFiltros({ ...filtros, status: e.target.value })}>
            <option value="">Todas</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

function aplicaFiltros(items, filtros) {
  return items.filter(r =>
    (!filtros.setor || r.setor === filtros.setor) &&
    (!filtros.solicitante || r.solicitante === filtros.solicitante) &&
    (!filtros.status || r.status === filtros.status)
  );
}

/* ---------- tela de compras (modo checklist) ---------- */

function ModoCompras({ itens, wedAtual, onTogglePurchased, onClose, closeLabel, onRefresh }) {
  const porSetor = {};
  itens.forEach(r => { (porSetor[r.setor] = porSetor[r.setor] || []).push(r); });
  const setores = Object.keys(porSetor).sort();
  const compradosCount = itens.filter(r => r.status === 'comprada').length;

  return (
    <div className="coap-shell">
      <div className="coap-topbar">
        <div className="coap-brand-text">
          <h1>Lista de compras</h1>
          <span>quarta-feira, {formatDateLongBR(wedAtual)} · {compradosCount} de {itens.length} já comprados</span>
        </div>
        <div className="coap-who">
          {onRefresh && <button className="coap-iconbtn" onClick={onRefresh}><RefreshCw size={13} /> Atualizar</button>}
          <button className="coap-iconbtn" onClick={onClose}><ChevronLeft size={13} /> {closeLabel || 'Voltar ao painel'}</button>
        </div>
      </div>

      {itens.length === 0 && <div className="coap-panel coap-empty">Nada aprovado para essa data ainda.</div>}

      {setores.map(setor => (
        <div className="coap-panel" key={setor}>
          <h2>{setor}</h2>
          <div className="coap-check-list">
            {porSetor[setor].map(r => (
              <label className={`coap-check-item ${r.status === 'comprada' ? 'checked' : ''}`} key={r.id}>
                <input type="checkbox" checked={r.status === 'comprada'} onChange={() => onTogglePurchased(r)} />
                <div className="coap-check-info">
                  <strong>{r.material} — {r.quantidade}</strong>
                  <span>{r.solicitante}{r.link && <> · <a className="coap-link" href={r.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}><ExternalLink size={11} /> link</a></>}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- visão da assistente de compras ---------- */

function AssistenteView({ requests, config, actions, onLogout, onRefresh }) {
  const { wedAtual, itens } = itensParaComprarNestaQuarta(requests, config.cicloAtual);
  return (
    <ModoCompras
      itens={itens}
      wedAtual={wedAtual}
      onTogglePurchased={r => (r.status === 'comprada' ? actions.revertPurchase(r.id) : actions.purchase(r.id))}
      onClose={onLogout}
      closeLabel="Sair"
      onRefresh={onRefresh}
    />
  );
}

/* ---------- visão admin / diretor (compartilhada) ---------- */

function PainelGestao({ session, requests, users, config, onLogout, onRefresh, actions, somenteLeitura }) {
  const [aba, setAba] = useState('compras');
  const [filtros, setFiltros] = useState({ setor: '', solicitante: '', status: '' });
  const [modoCompras, setModoCompras] = useState(false);

  const setores = [...new Set(users.map(u => u.setor))];
  const solicitantes = [...new Set(users.map(u => u.name))];

  const comprasCiclo = requests.filter(r => r.tipo === 'compra' && r.ciclo === config.cicloAtual);
  const reunioesCiclo = requests.filter(r => r.tipo === 'reuniao' && r.ciclo === config.cicloAtual);

  const historicoCompras = requests.filter(r => r.tipo === 'compra' && r.ciclo !== config.cicloAtual)
    .sort((a, b) => b.ciclo - a.ciclo || b.criadoEm.localeCompare(a.criadoEm));
  const historicoReunioes = requests.filter(r => r.tipo === 'reuniao' && r.ciclo !== config.cicloAtual)
    .sort((a, b) => b.ciclo - a.ciclo || b.criadoEm.localeCompare(a.criadoEm));

  const comprasFiltradas = aplicaFiltros(comprasCiclo, filtros).sort((a, b) => a.dataLimite.localeCompare(b.dataLimite));
  const reunioesFiltradas = aplicaFiltros(reunioesCiclo, filtros).sort((a, b) => a.dataHorario.localeCompare(b.dataHorario));

  const wedAtual = quartaMaisProxima();
  const wedAtualISO = toISODate(wedAtual);
  const wedProxima = new Date(wedAtual);
  wedProxima.setDate(wedAtual.getDate() + 7);
  const wedProximaISO = toISODate(wedProxima);

  const listaDestaQuarta = comprasCiclo.filter(r => r.status === 'aprovada' && r.quartaAlvo === wedAtualISO);
  const listaProximaSemana = comprasCiclo.filter(r => r.status === 'aprovada' && r.quartaAlvo === wedProximaISO);
  const pendentesDestaQuarta = comprasCiclo.filter(r => r.status === 'pendente' && r.quartaAlvo === wedAtualISO).length;
  const itensModoCompras = itensParaComprarNestaQuarta(requests, config.cicloAtual).itens;

  if (modoCompras) {
    return (
      <ModoCompras
        itens={itensModoCompras}
        wedAtual={wedAtual}
        onTogglePurchased={r => (r.status === 'comprada' ? actions.revertPurchase(r.id) : actions.purchase(r.id))}
        onClose={() => setModoCompras(false)}
      />
    );
  }

  return (
    <div className="coap-shell">
      <div className="coap-topbar">
        <div className="coap-brand">
          <img src="/logo.png" alt="Colégio Adventista de Paulínia" className="coap-logo" />
          <div className="coap-brand-text"><h1>Compras COAP</h1><span>ciclo nº {config.cicloAtual} · desde {formatDateBR(config.cicloInicioEm)}</span></div>
        </div>
        <div className="coap-who">
          <span><b>{somenteLeitura ? 'Diretor' : 'Administrador'}</b></span>
          <button className="coap-iconbtn" onClick={onRefresh}><RefreshCw size={13} /> Atualizar</button>
          {!somenteLeitura && <button className="coap-iconbtn" onClick={() => setModoCompras(true)}><ShoppingCart size={13} /> Lista de compras</button>}
          {!somenteLeitura && <button className="coap-iconbtn" onClick={actions.encerrarCiclo}><Archive size={13} /> Encerrar ciclo</button>}
          <button className="coap-iconbtn" onClick={onLogout}><LogOut size={13} /> Sair</button>
        </div>
      </div>

      <StatStrip compras={comprasCiclo} reunioes={reunioesCiclo} />

      <PainelListaDeCompras
        titulo={`Comprar nesta quarta-feira, ${formatDateLongBR(wedAtual)}`}
        subtitulo={pendentesDestaQuarta > 0
          ? `${pendentesDestaQuarta} solicitação(ões) para essa data ainda aguardando aprovação.`
          : 'Todas as solicitações dessa data já foram avaliadas.'}
        itens={listaDestaQuarta}
        destaque
        onPurchase={somenteLeitura ? null : actions.purchase}
      />

      <PainelListaDeCompras
        titulo={`Fila da próxima semana, ${formatDateLongBR(wedProxima)}`}
        subtitulo="Solicitações já aprovadas para a semana seguinte."
        itens={listaProximaSemana}
      />

      <div className="coap-panel">
        <h2>Solicitações por setor, neste ciclo</h2>
        <BarrasPorSetor compras={comprasCiclo} />
      </div>

      <div className="coap-tabs">
        <button className={`coap-tab ${aba === 'compras' ? 'active' : ''}`} onClick={() => setAba('compras')}><ShoppingBag size={14} /> Compras</button>
        <button className={`coap-tab ${aba === 'reunioes' ? 'active' : ''}`} onClick={() => setAba('reunioes')}><UtensilsCrossed size={14} /> Reuniões e capacitações</button>
        <button className={`coap-tab ${aba === 'historico' ? 'active' : ''}`} onClick={() => setAba('historico')}><ClipboardList size={14} /> Histórico de ciclos</button>
        {!somenteLeitura && <button className={`coap-tab ${aba === 'config' ? 'active' : ''}`} onClick={() => setAba('config')}><Settings size={14} /> Configurações</button>}
      </div>

      {aba === 'compras' && (
        <>
          <Filtros filtros={filtros} setFiltros={setFiltros} setores={setores} solicitantes={solicitantes} mostrarStatus />
          <TabelaCompras items={comprasFiltradas} somenteLeitura={somenteLeitura}
            onApprove={actions.approve} onReject={actions.reject} onPurchase={actions.purchase} onDeliver={actions.deliver} onDelete={actions.remove} />
        </>
      )}

      {aba === 'reunioes' && (
        <>
          <Filtros filtros={filtros} setFiltros={setFiltros} setores={setores} solicitantes={solicitantes} mostrarStatus />
          <TabelaReunioes items={reunioesFiltradas} somenteLeitura={somenteLeitura}
            onApprove={actions.approve} onReject={actions.reject} onPurchase={actions.purchase} onDeliver={actions.deliver} onDelete={actions.remove} />
        </>
      )}

      {aba === 'historico' && (
        <>
          <div className="coap-panel">
            <h2>Compras arquivadas</h2>
            <div className="coap-table-wrap">
              {historicoCompras.length === 0 ? <div className="coap-empty">Ainda não há ciclos de compras encerrados.</div> : (
                <table className="coap-table">
                  <thead>
                    <tr><th>Ciclo</th><th>Solicitante</th><th>Setor</th><th>Material</th><th>Qtd.</th><th>Data limite</th><th>Situação</th>{!somenteLeitura && <th>Ações</th>}</tr>
                  </thead>
                  <tbody>
                    {historicoCompras.map(r => (
                      <tr key={r.id}>
                        <td data-label="Ciclo">{r.ciclo}</td><td data-label="Solicitante">{r.solicitante}</td><td data-label="Setor">{r.setor}</td><td data-label="Material">{r.material}</td>
                        <td data-label="Qtd.">{r.quantidade}</td><td data-label="Data limite">{formatDateBR(r.dataLimite)}</td><td data-label="Situação"><StatusBadge status={r.status} /></td>
                        {!somenteLeitura && <td data-label="Ações"><button className="coap-mini-btn reject" onClick={() => actions.remove(r.id, `${r.material} (${r.solicitante})`)}><X size={12} /> Excluir</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          <div className="coap-panel">
            <h2>Reuniões e capacitações arquivadas</h2>
            <div className="coap-table-wrap">
              {historicoReunioes.length === 0 ? <div className="coap-empty">Ainda não há ciclos de reuniões encerrados.</div> : (
                <table className="coap-table">
                  <thead>
                    <tr><th>Ciclo</th><th>Solicitante</th><th>Setor</th><th>Assunto</th><th>Data / horário</th><th>Situação</th>{!somenteLeitura && <th>Ações</th>}</tr>
                  </thead>
                  <tbody>
                    {historicoReunioes.map(r => (
                      <tr key={r.id}>
                        <td data-label="Ciclo">{r.ciclo}</td><td data-label="Solicitante">{r.solicitante}</td><td data-label="Setor">{r.setor}</td><td data-label="Assunto">{r.assunto}</td>
                        <td data-label="Data / horário">{formatDateTimeBR(r.dataHorario)}</td><td data-label="Situação"><StatusBadge status={r.status} /></td>
                        {!somenteLeitura && <td data-label="Ações"><button className="coap-mini-btn reject" onClick={() => actions.remove(r.id, `${r.assunto} (${r.solicitante})`)}><X size={12} /> Excluir</button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {aba === 'config' && !somenteLeitura && (
        <PainelConfig users={users} config={config} onChangeUserPin={actions.changeUserPin} onChangeUserSetor={actions.changeUserSetor} onAddUser={actions.addUser} onRemoveUser={actions.removeUser} onChangeConfigPin={actions.changeConfigPin} />
      )}
    </div>
  );
}

/* ---------- aplicativo principal ---------- */

export default function App() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState(SEED_USERS);
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [requests, setRequests] = useState([]);
  const [session, setSession] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    let u = await loadShared('coap-users');
    if (!u) {
      u = SEED_USERS;
      await saveShared('coap-users', u);
    } else {
      const existentes = new Set(u.map(x => x.name));
      const faltando = SEED_USERS.filter(s => !existentes.has(s.name));
      if (faltando.length > 0) {
        u = [...u, ...faltando];
        await saveShared('coap-users', u);
      }
    }
    let c = await loadShared('coap-config');
    if (!c) { c = DEFAULT_CONFIG; await saveShared('coap-config', c); }
    let r = await loadShared('coap-requests');
    if (!r) { r = []; await saveShared('coap-requests', r); }
    setUsers(u); setConfig(c); setRequests(r);
    setLoading(false);
  }

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function refreshAll() {
    const r = await loadShared('coap-requests');
    if (r) setRequests(r);
    const u = await loadShared('coap-users');
    if (u) setUsers(u);
    const c = await loadShared('coap-config');
    if (c) setConfig(c);
    showToast('Dados atualizados');
  }

  async function persistRequests(next) { setRequests(next); await saveShared('coap-requests', next); }
  async function persistUsers(next) { setUsers(next); await saveShared('coap-users', next); }
  async function persistConfig(next) { setConfig(next); await saveShared('coap-config', next); }

  function handleLoginSolicitante(nome, pin) {
    const u = users.find(x => x.name === nome);
    if (!u || u.pin !== pin) return false;
    setSession({ role: 'solicitante', name: u.name, setor: u.setor });
  }
  function handleLoginAdmin(pin) {
    if (pin !== config.adminPin) return false;
    setSession({ role: 'admin' });
  }
  function handleLoginDiretor(pin) {
    if (pin !== config.diretorPin) return false;
    setSession({ role: 'diretor' });
  }
  function handleLoginAssistente(pin) {
    if (pin !== config.assistentePin) return false;
    setSession({ role: 'assistente' });
  }
  function logout() { setSession(null); }

  function addRequest(dataList) {
    const now = new Date().toISOString();
    const novos = dataList.map(data => ({
      id: uid(), criadoEm: now, ciclo: config.cicloAtual,
      status: 'pendente', observacaoAdmin: '', ...data,
    }));
    persistRequests([...requests, ...novos]);
    showToast(novos.length > 1 ? `${novos.length} itens enviados` : 'Solicitação enviada');
  }

  function editOwnRequest(id, data) {
    persistRequests(requests.map(r => (r.id === id ? { ...r, ...data } : r)));
    showToast('Solicitação atualizada');
  }

  function updateRequest(id, patch) {
    persistRequests(requests.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }

  function deleteRequest(id) {
    persistRequests(requests.filter(r => r.id !== id));
    showToast('Solicitação excluída');
  }

  const actions = {
    approve: id => updateRequest(id, { status: 'aprovada', aprovadoEm: new Date().toISOString() }),
    reject: (id, obs) => updateRequest(id, { status: 'reprovada', observacaoAdmin: obs, aprovadoEm: new Date().toISOString() }),
    purchase: id => updateRequest(id, { status: 'comprada', compradoEm: new Date().toISOString() }),
    revertPurchase: id => updateRequest(id, { status: 'aprovada', compradoEm: null }),
    deliver: id => updateRequest(id, { status: 'entregue', entregueEm: new Date().toISOString() }),
    remove: (id, descricao) => {
      if (!window.confirm(`Excluir definitivamente "${descricao}"? Essa ação não pode ser desfeita.`)) return;
      deleteRequest(id);
    },
    encerrarCiclo: () => {
      if (!window.confirm(`Isso arquiva o ciclo atual (nº ${config.cicloAtual}) — compras E reuniões — e inicia um novo ciclo. O histórico continua disponível para consulta. Confirmar?`)) return;
      persistConfig({ ...config, cicloAtual: config.cicloAtual + 1, cicloInicioEm: todayISO() });
      showToast('Novo ciclo iniciado');
    },
    changeUserPin: (name, pin) => { persistUsers(users.map(u => (u.name === name ? { ...u, pin } : u))); showToast('PIN atualizado'); },
    changeUserSetor: (name, setor) => { persistUsers(users.map(u => (u.name === name ? { ...u, setor } : u))); showToast('Setor atualizado'); },
    addUser: (name, setor) => {
      const nomeLimpo = name.trim();
      if (!nomeLimpo || !setor.trim()) return;
      if (users.some(u => u.name.toLowerCase() === nomeLimpo.toLowerCase())) { showToast('Já existe um solicitante com esse nome'); return; }
      persistUsers([...users, { name: nomeLimpo, setor: setor.trim(), pin: '0000' }]);
      showToast('Solicitante adicionado');
    },
    removeUser: name => {
      if (!window.confirm(`Excluir "${name}" da lista de solicitantes? O histórico de pedidos dele(a) continua registrado, mas ele(a) não poderá mais entrar no sistema.`)) return;
      persistUsers(users.filter(u => u.name !== name));
      showToast('Solicitante excluído');
    },
    changeConfigPin: (field, pin) => { persistConfig({ ...config, [field]: pin }); showToast('PIN atualizado'); },
  };

  if (loading) return <LoadingScreen />;

  if (!session) {
    return (
      <LoginScreen
        users={users}
        onLoginSolicitante={handleLoginSolicitante}
        onLoginAdmin={handleLoginAdmin}
        onLoginDiretor={handleLoginDiretor}
        onLoginAssistente={handleLoginAssistente}
      />
    );
  }

  return (
    <div className="coap-app">
      <GlobalStyle />
      {session.role === 'solicitante' && (
        <RequesterView
          session={session} requests={requests} config={config}
          onLogout={logout} onRefresh={refreshAll} onAdd={addRequest} onEdit={editOwnRequest}
          onChangePin={actions.changeUserPin}
        />
      )}
      {session.role === 'admin' && (
        <PainelGestao
          session={session} requests={requests} users={users} config={config}
          onLogout={logout} onRefresh={refreshAll} actions={actions} somenteLeitura={false}
        />
      )}
      {session.role === 'diretor' && (
        <PainelGestao
          session={session} requests={requests} users={users} config={config}
          onLogout={logout} onRefresh={refreshAll} actions={actions} somenteLeitura={true}
        />
      )}
      {session.role === 'assistente' && (
        <AssistenteView
          requests={requests} config={config} actions={actions}
          onLogout={logout} onRefresh={refreshAll}
        />
      )}
      {toast && <div className="coap-toast">{toast}</div>}
    </div>
  );
}
