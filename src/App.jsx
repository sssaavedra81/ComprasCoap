import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, LogOut, Plus, ExternalLink,
  Settings, Check, X, RefreshCw, ChevronLeft, Lock,
  UtensilsCrossed, Archive, ClipboardList
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
];

const DEFAULT_CONFIG = {
  cicloAtual: 1,
  cicloInicioEm: todayISO(),
  adminPin: '0000',
  diretorPin: '0000',
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
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=IBM+Plex+Sans:wght@400;500;600&display=swap');

      .coap-app {
        --bg: #EDEAE1;
        --surface: #FFFFFF;
        --surface-alt: #F7F4EC;
        --ink: #20281F;
        --ink-soft: #5B6358;
        --primary: #2F5D46;
        --primary-dark: #1F4433;
        --accent: #B9862F;
        --info: #3B6E8F;
        --danger: #A6432B;
        --danger-dark: #7C3220;
        --pending: #8A7B5E;
        --border: #D8D2C2;

        font-family: 'IBM Plex Sans', system-ui, sans-serif;
        color: var(--ink);
        background: var(--bg);
        min-height: 100vh;
        width: 100%;
        box-sizing: border-box;
        line-height: 1.45;
      }
      .coap-app *, .coap-app *::before, .coap-app *::after { box-sizing: border-box; }
      .coap-app h1, .coap-app h2, .coap-app h3 {
        font-family: 'Fraunces', Georgia, serif;
        font-weight: 600;
        color: var(--ink);
        margin: 0;
      }
      .coap-app button { font-family: inherit; cursor: pointer; }
      .coap-app input, .coap-app select, .coap-app textarea {
        font-family: inherit;
        font-size: 14px;
        color: var(--ink);
      }
      .coap-shell { max-width: 1080px; margin: 0 auto; padding: 22px 18px 60px; }

      .coap-topbar {
        display: flex; align-items: center; justify-content: space-between;
        gap: 12px; padding-bottom: 16px; margin-bottom: 20px;
        border-bottom: 1px solid var(--border); flex-wrap: wrap;
      }
      .coap-brand { display: flex; align-items: baseline; gap: 10px; }
      .coap-brand h1 { font-size: 22px; letter-spacing: -0.01em; }
      .coap-brand span { font-size: 12.5px; color: var(--ink-soft); }
      .coap-who { display: flex; align-items: center; gap: 10px; font-size: 13.5px; color: var(--ink-soft); flex-wrap: wrap; }
      .coap-who b { color: var(--ink); font-weight: 600; }
      .coap-iconbtn {
        display: inline-flex; align-items: center; gap: 6px;
        background: transparent; border: 1px solid var(--border);
        padding: 7px 11px; border-radius: 3px; font-size: 13px; color: var(--ink);
      }
      .coap-iconbtn:hover { border-color: var(--ink-soft); }

      .coap-login-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
      .coap-login-card { width: 100%; max-width: 420px; }
      .coap-login-hero { margin-bottom: 26px; }
      .coap-login-hero h1 { font-size: 30px; margin-bottom: 6px; }
      .coap-login-hero p { color: var(--ink-soft); font-size: 14.5px; margin: 0; }
      .coap-roles { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 22px; }
      .coap-role-tab {
        flex: 1; background: none; border: none; padding: 10px 4px;
        font-size: 13.5px; color: var(--ink-soft); border-bottom: 2px solid transparent;
        margin-bottom: -1px;
      }
      .coap-role-tab.active { color: var(--primary-dark); border-bottom-color: var(--primary); font-weight: 600; }
      .coap-field { margin-bottom: 14px; }
      .coap-field label { display: block; font-size: 12.5px; color: var(--ink-soft); margin-bottom: 5px; }
      .coap-field input, .coap-field select, .coap-field textarea {
        width: 100%; padding: 9px 4px; background: transparent;
        border: none; border-bottom: 1.5px solid var(--border); outline: none;
      }
      .coap-field input:focus, .coap-field select:focus, .coap-field textarea:focus {
        border-bottom-color: var(--primary);
      }
      .coap-field textarea { resize: vertical; min-height: 64px; }
      .coap-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 7px;
        background: var(--primary); color: #fff; border: none;
        padding: 10px 18px; border-radius: 3px; font-size: 14px; font-weight: 500;
      }
      .coap-btn:hover { background: var(--primary-dark); }
      .coap-btn.full { width: 100%; }
      .coap-btn.secondary { background: transparent; color: var(--primary-dark); border: 1px solid var(--primary); }
      .coap-btn.secondary:hover { background: var(--surface-alt); }
      .coap-btn.ghost { background: transparent; color: var(--ink-soft); border: 1px solid var(--border); }
      .coap-btn.danger { background: var(--danger); }
      .coap-btn.danger:hover { background: var(--danger-dark); }
      .coap-btn:disabled { opacity: .5; cursor: default; }
      .coap-hint { font-size: 12px; color: var(--ink-soft); margin-top: 14px; }

      .coap-stats { display: flex; border: 1px solid var(--border); background: var(--surface); margin-bottom: 22px; flex-wrap: wrap; }
      .coap-stat { flex: 1; min-width: 120px; padding: 14px 16px; border-right: 1px solid var(--border); }
      .coap-stat:last-child { border-right: none; }
      .coap-stat b { display: block; font-size: 24px; font-family: 'Fraunces', serif; font-weight: 600; }
      .coap-stat span { font-size: 12px; color: var(--ink-soft); }

      .coap-tabs { display: flex; gap: 4px; margin-bottom: 16px; flex-wrap: wrap; }
      .coap-tab {
        background: transparent; border: 1px solid var(--border); color: var(--ink-soft);
        padding: 7px 13px; border-radius: 3px; font-size: 13px; display:flex; align-items:center; gap:6px;
      }
      .coap-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }

      .coap-panel { background: var(--surface); border: 1px solid var(--border); padding: 18px; margin-bottom: 18px; }
      .coap-panel h2 { font-size: 17px; margin-bottom: 14px; }
      .coap-row-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px; }

      .coap-filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px,1fr)); gap: 10px 14px; margin-bottom: 16px; }
      .coap-filters .coap-field { margin-bottom: 0; }

      .coap-table-wrap { overflow-x: auto; border: 1px solid var(--border); background: var(--surface); }
      table.coap-table { width: 100%; border-collapse: collapse; font-size: 13.5px; min-width: 760px; }
      table.coap-table th {
        text-align: left; padding: 10px 12px; font-size: 11.5px; color: var(--ink-soft);
        border-bottom: 1px solid var(--border); font-weight: 600; white-space: nowrap;
      }
      table.coap-table td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
      table.coap-table tr:last-child td { border-bottom: none; }
      .coap-empty { padding: 26px 12px; text-align: center; color: var(--ink-soft); font-size: 13.5px; }

      .coap-badge {
        display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px 3px 7px;
        font-size: 11.5px; font-weight: 500; border-left: 3px solid; white-space: nowrap;
      }
      .st-pendente { border-color: var(--pending); background: #F1EEE4; color: #5f5540; }
      .st-aprovada { border-color: var(--info); background: #E9F0F4; color: #2c5470; }
      .st-reprovada { border-color: var(--danger); background: #F5E9E5; color: var(--danger-dark); }
      .st-comprada { border-color: var(--accent); background: #F6EEDD; color: #856323; }
      .st-entregue { border-color: var(--primary); background: #E7EFE9; color: var(--primary-dark); }
      .pr-planejada { border-color: var(--ink-soft); background: #EFEDE7; color: var(--ink-soft); }
      .pr-proxima { border-color: var(--info); background: #E9F0F4; color: #2c5470; }
      .pr-urgente { border-color: var(--danger); background: #F5E9E5; color: var(--danger-dark); }
      .pr-vencido { border-color: var(--danger-dark); background: #F1DCD5; color: var(--danger-dark); font-weight: 600; }

      .coap-link { color: var(--info); text-decoration: underline; font-size: 12.5px; display: inline-flex; align-items: center; gap: 4px; }
      .coap-actions-cell { display: flex; gap: 6px; flex-wrap: wrap; }
      .coap-mini-btn {
        border: 1px solid var(--border); background: transparent; color: var(--ink);
        padding: 4px 9px; font-size: 12px; border-radius: 3px; display: inline-flex; align-items: center; gap: 4px;
      }
      .coap-mini-btn:hover { background: var(--surface-alt); }
      .coap-mini-btn.approve { border-color: var(--primary); color: var(--primary-dark); }
      .coap-mini-btn.reject { border-color: var(--danger); color: var(--danger-dark); }

      .coap-obs { font-size: 12px; color: var(--ink-soft); margin-top: 4px; }

      .coap-req-list { display: flex; flex-direction: column; gap: 10px; }
      .coap-req-card { border: 1px solid var(--border); background: var(--surface); padding: 13px 15px; }
      .coap-req-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
      .coap-req-card-top strong { font-size: 14.5px; }
      .coap-req-meta { font-size: 12.5px; color: var(--ink-soft); }

      .coap-bar-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 12.5px; }
      .coap-bar-label { width: 130px; flex-shrink: 0; color: var(--ink-soft); }
      .coap-bar-track { flex: 1; background: var(--surface-alt); height: 8px; }
      .coap-bar-fill { background: var(--primary); height: 8px; }
      .coap-bar-count { width: 24px; text-align: right; color: var(--ink-soft); }

      .coap-toast {
        position: fixed; bottom: 22px; left: 50%; transform: translateX(-50%);
        background: var(--ink); color: #fff; padding: 10px 18px; border-radius: 3px;
        font-size: 13.5px; z-index: 50;
      }

      .coap-modal-bg {
        position: fixed; inset: 0; background: rgba(32,40,31,0.45);
        display: flex; align-items: center; justify-content: center; padding: 20px; z-index: 40;
      }
      .coap-modal { background: var(--surface); max-width: 480px; width: 100%; padding: 22px; max-height: 88vh; overflow-y: auto; }
      .coap-modal h2 { font-size: 18px; margin-bottom: 4px; }
      .coap-modal .coap-modal-sub { font-size: 13px; color: var(--ink-soft); margin-bottom: 16px; }
      .coap-modal-foot { display: flex; gap: 10px; margin-top: 18px; }

      .coap-back { display: inline-flex; align-items: center; gap: 5px; background: none; border: none; color: var(--ink-soft); font-size: 13px; margin-bottom: 14px; padding: 0; }

      .coap-settings-block { margin-bottom: 22px; }
      .coap-settings-block h3 { font-size: 14.5px; margin-bottom: 10px; }
      .coap-user-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--border); font-size: 13.5px; }
      .coap-user-row .name { width: 110px; font-weight: 500; }
      .coap-user-row .setor { flex: 1; color: var(--ink-soft); }
      .coap-user-row input { width: 70px; padding: 4px 6px; border: 1px solid var(--border); }

      @media (max-width: 560px) {
        .coap-stat { min-width: 45%; }
        .coap-who { width: 100%; justify-content: space-between; }
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
        <span style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Carregando…</span>
      </div>
    </div>
  );
}

/* ---------- login ---------- */

function LoginScreen({ users, onLoginSolicitante, onLoginAdmin, onLoginDiretor }) {
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
    } else {
      const ok = onLoginDiretor(pin.trim());
      if (ok === false) setErro('PIN incorreto.');
    }
  }

  return (
    <div className="coap-app">
      <GlobalStyle />
      <div className="coap-login-wrap">
        <div className="coap-login-card">
          <div className="coap-login-hero">
            <h1>Compras COAP</h1>
            <p>Colégio Adventista de Paulínia — registro e acompanhamento de solicitações de compra.</p>
          </div>
          <div className="coap-roles">
            <button type="button" className={`coap-role-tab ${role === 'solicitante' ? 'active' : ''}`} onClick={() => { setRole('solicitante'); setErro(''); }}>Sou solicitante</button>
            <button type="button" className={`coap-role-tab ${role === 'admin' ? 'active' : ''}`} onClick={() => { setRole('admin'); setErro(''); }}>Administrador</button>
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
            <button className="coap-btn full" type="submit"><Lock size={15} /> Entrar</button>
          </form>
          <p className="coap-hint">PIN padrão: 0000. Depois do primeiro acesso, altere o seu PIN dentro do sistema.</p>
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

function FormCompra({ onCancel, onSubmit }) {
  const [material, setMaterial] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [atividadeProjeto, setAtividadeProjeto] = useState('');
  const [link, setLink] = useState('');
  const [dataLimite, setDataLimite] = useState('');
  const [observacoesSolicitante, setObservacoesSolicitante] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!material || !quantidade || !atividadeProjeto || !dataLimite) return;
    onSubmit({
      tipo: 'compra', material, quantidade: Number(quantidade), atividadeProjeto,
      link, dataLimite, observacoesSolicitante,
    });
  }

  return (
    <div className="coap-panel">
      <button className="coap-back" onClick={onCancel}><ChevronLeft size={15} /> Voltar</button>
      <h2>Nova solicitação de compra</h2>
      <form onSubmit={submit}>
        <div className="coap-field">
          <label>Material solicitado</label>
          <input value={material} onChange={e => setMaterial(e.target.value)} required />
        </div>
        <div className="coap-field">
          <label>Quantidade</label>
          <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} required />
        </div>
        <div className="coap-field">
          <label>Atividade / projeto em que será usado</label>
          <input value={atividadeProjeto} onChange={e => setAtividadeProjeto(e.target.value)} required />
        </div>
        <div className="coap-field">
          <label>Link para compra on-line (se tiver)</label>
          <input value={link} onChange={e => setLink(e.target.value)} placeholder="https://" />
        </div>
        <div className="coap-field">
          <label>Data limite — quando precisa ter o material em mãos</label>
          <input type="date" value={dataLimite} onChange={e => setDataLimite(e.target.value)} required />
        </div>
        <div className="coap-field">
          <label>Observações (opcional)</label>
          <textarea value={observacoesSolicitante} onChange={e => setObservacoesSolicitante(e.target.value)} />
        </div>
        <button className="coap-btn" type="submit"><Check size={15} /> Enviar solicitação</button>
      </form>
    </div>
  );
}

/* ---------- formulário: nova reunião / capacitação ---------- */

function FormReuniao({ onCancel, onSubmit }) {
  const [assunto, setAssunto] = useState('');
  const [dataHorario, setDataHorario] = useState('');
  const [participantes, setParticipantes] = useState('');
  const [cardapioSugestao, setCardapioSugestao] = useState('');
  const [observacoesSolicitante, setObservacoesSolicitante] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!assunto || !dataHorario || !participantes) return;
    onSubmit({
      tipo: 'reuniao', assunto, dataHorario, participantes: Number(participantes),
      cardapioSugestao, observacoesSolicitante,
    });
  }

  return (
    <div className="coap-panel">
      <button className="coap-back" onClick={onCancel}><ChevronLeft size={15} /> Voltar</button>
      <h2>Nova reunião, capacitação ou treinamento</h2>
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
        <button className="coap-btn" type="submit"><Check size={15} /> Enviar solicitação</button>
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
          <button className="coap-btn" disabled={!novoPin} onClick={() => { onSave(novoPin.trim()); onClose(); }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- visão do solicitante ---------- */

function RequesterView({ session, requests, config, onLogout, onRefresh, onAdd, onChangePin }) {
  const [tela, setTela] = useState('lista');
  const [showPin, setShowPin] = useState(false);
  const [aba, setAba] = useState('compra');

  const minhas = requests.filter(r => r.solicitante === session.name);
  const minhasCompras = minhas.filter(r => r.tipo === 'compra').sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  const minhasReunioes = minhas.filter(r => r.tipo === 'reuniao').sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));

  return (
    <div className="coap-shell">
      <div className="coap-topbar">
        <div className="coap-brand"><h1>Compras COAP</h1><span>ciclo nº {config.cicloAtual}</span></div>
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
            <button className="coap-btn" onClick={() => setTela('compra')}><Plus size={15} /> Nova solicitação de compra</button>
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
                    <strong>{r.material} ({r.quantidade})</strong>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <PrioridadeBadge dataLimite={r.dataLimite} />
                      <StatusBadge status={r.status} />
                    </div>
                  </div>
                  <div className="coap-req-meta">{r.atividadeProjeto} · necessário até {formatDateBR(r.dataLimite)}</div>
                  {r.link && <a className="coap-link" href={r.link} target="_blank" rel="noreferrer"><ExternalLink size={11} /> link de compra</a>}
                  {r.observacaoAdmin && <div className="coap-obs">Observação da administração: {r.observacaoAdmin}</div>}
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
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tela === 'compra' && (
        <FormCompra
          onCancel={() => setTela('lista')}
          onSubmit={data => { onAdd({ ...data, solicitante: session.name, setor: session.setor }); setTela('lista'); }}
        />
      )}
      {tela === 'reuniao' && (
        <FormReuniao
          onCancel={() => setTela('lista')}
          onSubmit={data => { onAdd({ ...data, solicitante: session.name, setor: session.setor }); setTela('lista'); }}
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

/* ---------- tabela de solicitações (admin / diretor) ---------- */

function TabelaCompras({ items, somenteLeitura, onApprove, onReject, onPurchase, onDeliver }) {
  const [rejeitando, setRejeitando] = useState(null);
  const [obs, setObs] = useState('');

  if (items.length === 0) return <div className="coap-empty">Nenhuma solicitação encontrada com esse filtro.</div>;

  return (
    <div className="coap-table-wrap">
      <table className="coap-table">
        <thead>
          <tr>
            <th>Solicitante</th><th>Setor</th><th>Material</th><th>Qtd.</th><th>Atividade</th>
            <th>Data limite</th><th>Prioridade</th><th>Situação</th>{!somenteLeitura && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(r => (
            <React.Fragment key={r.id}>
              <tr>
                <td>{r.solicitante}</td>
                <td>{r.setor}</td>
                <td>{r.material}{r.link && <> · <a className="coap-link" href={r.link} target="_blank" rel="noreferrer"><ExternalLink size={11} /> link</a></>}</td>
                <td>{r.quantidade}</td>
                <td>{r.atividadeProjeto}</td>
                <td>{formatDateBR(r.dataLimite)}</td>
                <td><PrioridadeBadge dataLimite={r.dataLimite} /></td>
                <td><StatusBadge status={r.status} />{r.observacaoAdmin && <div className="coap-obs">{r.observacaoAdmin}</div>}</td>
                {!somenteLeitura && (
                  <td>
                    <div className="coap-actions-cell">
                      {r.status === 'pendente' && <>
                        <button className="coap-mini-btn approve" onClick={() => onApprove(r.id)}><Check size={12} /> Aprovar</button>
                        <button className="coap-mini-btn reject" onClick={() => setRejeitando(r.id)}><X size={12} /> Reprovar</button>
                      </>}
                      {r.status === 'aprovada' && <button className="coap-mini-btn" onClick={() => onPurchase(r.id)}>Marcar comprado</button>}
                      {r.status === 'comprada' && <button className="coap-mini-btn" onClick={() => onDeliver(r.id)}>Marcar entregue</button>}
                    </div>
                  </td>
                )}
              </tr>
              {rejeitando === r.id && (
                <tr>
                  <td colSpan={9}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0' }}>
                      <input placeholder="Motivo da reprovação" value={obs} onChange={e => setObs(e.target.value)} style={{ flex: 1, padding: 6, border: '1px solid var(--border)' }} />
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
    </div>
  );
}

function TabelaReunioes({ items, somenteLeitura, onApprove, onReject, onPurchase, onDeliver }) {
  const [rejeitando, setRejeitando] = useState(null);
  const [obs, setObs] = useState('');

  if (items.length === 0) return <div className="coap-empty">Nenhuma reunião ou capacitação encontrada.</div>;

  return (
    <div className="coap-table-wrap">
      <table className="coap-table">
        <thead>
          <tr>
            <th>Solicitante</th><th>Setor</th><th>Assunto</th><th>Data / horário</th>
            <th>Participantes</th><th>Cardápio sugerido</th><th>Prazo</th><th>Situação</th>{!somenteLeitura && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {items.map(r => (
            <React.Fragment key={r.id}>
              <tr>
                <td>{r.solicitante}</td>
                <td>{r.setor}</td>
                <td>{r.assunto}</td>
                <td>{formatDateTimeBR(r.dataHorario)}</td>
                <td>{r.participantes}</td>
                <td style={{ maxWidth: 200 }}>{r.cardapioSugestao || '—'}</td>
                <td><EventoBadge dataHorario={r.dataHorario} /></td>
                <td><StatusBadge status={r.status} />{r.observacaoAdmin && <div className="coap-obs">{r.observacaoAdmin}</div>}</td>
                {!somenteLeitura && (
                  <td>
                    <div className="coap-actions-cell">
                      {r.status === 'pendente' && <>
                        <button className="coap-mini-btn approve" onClick={() => onApprove(r.id)}><Check size={12} /> Aprovar</button>
                        <button className="coap-mini-btn reject" onClick={() => setRejeitando(r.id)}><X size={12} /> Reprovar</button>
                      </>}
                      {r.status === 'aprovada' && <button className="coap-mini-btn" onClick={() => onPurchase(r.id)}>Marcar comprado</button>}
                      {r.status === 'comprada' && <button className="coap-mini-btn" onClick={() => onDeliver(r.id)}>Marcar entregue</button>}
                    </div>
                  </td>
                )}
              </tr>
              {rejeitando === r.id && (
                <tr>
                  <td colSpan={9}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0' }}>
                      <input placeholder="Motivo da reprovação" value={obs} onChange={e => setObs(e.target.value)} style={{ flex: 1, padding: 6, border: '1px solid var(--border)' }} />
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
    </div>
  );
}

/* ---------- painel de configurações (admin) ---------- */

function PainelConfig({ users, config, onChangeUserPin, onChangeConfigPin }) {
  const [pins, setPins] = useState({});
  const [adminPin, setAdminPin] = useState('');
  const [diretorPin, setDiretorPin] = useState('');

  return (
    <div className="coap-panel">
      <div className="coap-settings-block">
        <h3>PINs dos solicitantes</h3>
        {users.map(u => (
          <div className="coap-user-row" key={u.name}>
            <span className="name">{u.name}</span>
            <span className="setor">{u.setor}</span>
            <input placeholder="novo PIN" value={pins[u.name] || ''} onChange={e => setPins({ ...pins, [u.name]: e.target.value })} />
            <button className="coap-mini-btn" disabled={!pins[u.name]} onClick={() => { onChangeUserPin(u.name, pins[u.name]); setPins({ ...pins, [u.name]: '' }); }}>Salvar</button>
          </div>
        ))}
      </div>
      <div className="coap-settings-block">
        <h3>PIN do administrador</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="novo PIN" value={adminPin} onChange={e => setAdminPin(e.target.value)} style={{ padding: 6, border: '1px solid var(--border)', width: 100 }} />
          <button className="coap-mini-btn" disabled={!adminPin} onClick={() => { onChangeConfigPin('adminPin', adminPin); setAdminPin(''); }}>Salvar</button>
        </div>
      </div>
      <div className="coap-settings-block">
        <h3>PIN do diretor</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="novo PIN" value={diretorPin} onChange={e => setDiretorPin(e.target.value)} style={{ padding: 6, border: '1px solid var(--border)', width: 100 }} />
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

/* ---------- visão admin / diretor (compartilhada) ---------- */

function PainelGestao({ session, requests, users, config, onLogout, onRefresh, actions, somenteLeitura }) {
  const [aba, setAba] = useState('compras');
  const [filtros, setFiltros] = useState({ setor: '', solicitante: '', status: '' });

  const setores = [...new Set(users.map(u => u.setor))];
  const solicitantes = [...new Set(users.map(u => u.name))];

  const comprasCiclo = requests.filter(r => r.tipo === 'compra' && r.ciclo === config.cicloAtual);
  const reunioesTodas = requests.filter(r => r.tipo === 'reuniao');
  const historico = requests.filter(r => r.tipo === 'compra' && r.ciclo !== config.cicloAtual)
    .sort((a, b) => b.ciclo - a.ciclo || b.criadoEm.localeCompare(a.criadoEm));

  const comprasFiltradas = aplicaFiltros(comprasCiclo, filtros).sort((a, b) => a.dataLimite.localeCompare(b.dataLimite));
  const reunioesFiltradas = aplicaFiltros(reunioesTodas, filtros).sort((a, b) => a.dataHorario.localeCompare(b.dataHorario));

  return (
    <div className="coap-shell">
      <div className="coap-topbar">
        <div className="coap-brand"><h1>Compras COAP</h1><span>ciclo nº {config.cicloAtual} · desde {formatDateBR(config.cicloInicioEm)}</span></div>
        <div className="coap-who">
          <span><b>{somenteLeitura ? 'Diretor' : 'Administrador'}</b></span>
          <button className="coap-iconbtn" onClick={onRefresh}><RefreshCw size={13} /> Atualizar</button>
          {!somenteLeitura && <button className="coap-iconbtn" onClick={actions.encerrarCiclo}><Archive size={13} /> Encerrar ciclo</button>}
          <button className="coap-iconbtn" onClick={onLogout}><LogOut size={13} /> Sair</button>
        </div>
      </div>

      <StatStrip compras={comprasCiclo} reunioes={reunioesTodas} />

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
            onApprove={actions.approve} onReject={actions.reject} onPurchase={actions.purchase} onDeliver={actions.deliver} />
        </>
      )}

      {aba === 'reunioes' && (
        <>
          <Filtros filtros={filtros} setFiltros={setFiltros} setores={setores} solicitantes={solicitantes} mostrarStatus />
          <TabelaReunioes items={reunioesFiltradas} somenteLeitura={somenteLeitura}
            onApprove={actions.approve} onReject={actions.reject} onPurchase={actions.purchase} onDeliver={actions.deliver} />
        </>
      )}

      {aba === 'historico' && (
        <div className="coap-table-wrap">
          {historico.length === 0 ? <div className="coap-empty">Ainda não há ciclos encerrados.</div> : (
            <table className="coap-table">
              <thead>
                <tr><th>Ciclo</th><th>Solicitante</th><th>Setor</th><th>Material</th><th>Qtd.</th><th>Data limite</th><th>Situação</th></tr>
              </thead>
              <tbody>
                {historico.map(r => (
                  <tr key={r.id}>
                    <td>{r.ciclo}</td><td>{r.solicitante}</td><td>{r.setor}</td><td>{r.material}</td>
                    <td>{r.quantidade}</td><td>{formatDateBR(r.dataLimite)}</td><td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {aba === 'config' && !somenteLeitura && (
        <PainelConfig users={users} config={config} onChangeUserPin={actions.changeUserPin} onChangeConfigPin={actions.changeConfigPin} />
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
    if (!u) { u = SEED_USERS; await saveShared('coap-users', u); }
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
  function logout() { setSession(null); }

  function addRequest(data) {
    const req = {
      id: uid(), criadoEm: new Date().toISOString(), ciclo: config.cicloAtual,
      status: 'pendente', observacaoAdmin: '', ...data,
    };
    persistRequests([...requests, req]);
    showToast('Solicitação enviada');
  }

  function updateRequest(id, patch) {
    persistRequests(requests.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }

  const actions = {
    approve: id => updateRequest(id, { status: 'aprovada', aprovadoEm: new Date().toISOString() }),
    reject: (id, obs) => updateRequest(id, { status: 'reprovada', observacaoAdmin: obs, aprovadoEm: new Date().toISOString() }),
    purchase: id => updateRequest(id, { status: 'comprada', compradoEm: new Date().toISOString() }),
    deliver: id => updateRequest(id, { status: 'entregue', entregueEm: new Date().toISOString() }),
    encerrarCiclo: () => {
      if (!window.confirm(`Isso arquiva o ciclo atual (nº ${config.cicloAtual}) e inicia um novo. O histórico continua disponível para consulta. Confirmar?`)) return;
      persistConfig({ ...config, cicloAtual: config.cicloAtual + 1, cicloInicioEm: todayISO() });
      showToast('Novo ciclo iniciado');
    },
    changeUserPin: (name, pin) => { persistUsers(users.map(u => (u.name === name ? { ...u, pin } : u))); showToast('PIN atualizado'); },
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
      />
    );
  }

  return (
    <div className="coap-app">
      <GlobalStyle />
      {session.role === 'solicitante' && (
        <RequesterView
          session={session} requests={requests} config={config}
          onLogout={logout} onRefresh={refreshAll} onAdd={addRequest}
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
      {toast && <div className="coap-toast">{toast}</div>}
    </div>
  );
}
