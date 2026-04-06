import { BRAWLERS, ROLES, poolNameFromIndex, randomChoice, shuffle, supabase, initSupabase } from './supabase.js';

const state = {
  pools: [],
  players: [],
  matches: [],
  votes: [],
  pairings: [],
  selectedWinner: null,
};

const el = (id) => document.getElementById(id);
const notice = (message, tone = 'violet') => {
  const box = el('notice');
  box.className = `rounded-2xl border px-4 py-3 ${tone === 'red' ? 'border-red-500/30 bg-red-500/10 text-red-100' : 'border-violet-500/30 bg-violet-500/10 text-violet-100'}`;
  box.textContent = message;
  box.classList.remove('hidden');
  clearTimeout(window.__noticeTimer);
  window.__noticeTimer = setTimeout(() => box.classList.add('hidden'), 3500);
};

const byRole = (role) => state.players.filter((p) => p.role === role && p.available !== false);
const semiPros = () => byRole(ROLES.SEMI_PRO);
const availablePools = () => state.pools.filter((p) => p.active !== false);
const eligibleMvp = () => state.players.filter((p) => p.role === ROLES.SEMI_PRO && p.mvp_eligible);

async function fetchData() {
  if (!supabase) await initSupabase();
  const [{ data: pools }, { data: players }, { data: matches }, { data: votes }] = await Promise.all([
    supabase.from('pools').select('*').order('created_at', { ascending: true }),
    supabase.from('players').select('*').order('name', { ascending: true }),
    supabase.from('match_results').select('*').order('created_at', { ascending: false }),
    supabase.from('mvp_votes').select('*'),
  ]);
  state.pools = pools ?? [];
  state.players = players ?? [];
  state.matches = matches ?? [];
  state.votes = votes ?? [];
  if (!state.selectedWinner) {
    state.selectedWinner = state.matches.find((m) => m.winner_player_id)?.winner_player_id ?? null;
  }
  renderAll();
}

function renderCounters() {
  el('countPools').textContent = state.pools.length;
  el('countSemiPros').textContent = semiPros().length;
  el('countVotes').textContent = state.votes.length;
}

function renderPools() {
  const root = el('poolsList');
  root.innerHTML = '';
  if (!state.pools.length) {
    root.innerHTML = '<p class="text-slate-400 text-sm">No pools created yet.</p>';
    return;
  }
  state.pools.forEach((pool) => {
    const members = state.players.filter((p) => p.pool_id === pool.id).map((p) => p.name).join(', ') || 'Empty';
    root.insertAdjacentHTML('beforeend', `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div class="flex items-center justify-between gap-2">
          <h3 class="font-semibold">${pool.name}</h3>
          <span class="text-xs px-2 py-1 rounded-full bg-white/10">${pool.semi_pro_count ?? 0}/${pool.capacity_semi_pro ?? 2} Semi-Pro</span>
        </div>
        <p class="text-sm text-slate-400 mt-2">${members}</p>
      </div>
    `);
  });
}

function renderTeams() {
  const root = el('teamsList');
  root.innerHTML = '';
  const teams = state.pools.map((pool) => {
    const poolPlayers = state.players.filter((p) => p.pool_id === pool.id);
    return {
      pool,
      pro: poolPlayers.find((p) => p.role === ROLES.PRO)?.name ?? 'Pending',
      semi: poolPlayers.find((p) => p.role === ROLES.SEMI_PRO)?.name ?? 'Pending',
      casual: poolPlayers.find((p) => p.role === ROLES.CASUAL)?.name ?? 'Pending',
    };
  });
  if (!teams.length) {
    root.innerHTML = '<p class="text-slate-400 text-sm">Teams will appear after pool assignment.</p>';
    return;
  }
  teams.forEach(({ pool, pro, semi, casual }) => {
    root.insertAdjacentHTML('beforeend', `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm space-y-1">
        <div class="flex items-center justify-between"><strong>${pool.name}</strong><span class="text-xs text-slate-400">Team</span></div>
        <p>Pro: ${pro}</p>
        <p>Semi-Pro: ${semi}</p>
        <p>Casual: ${casual}</p>
      </div>
    `);
  });
}

function renderMatches() {
  const root = el('matchesList');
  root.innerHTML = '';
  if (!state.matches.length) {
    root.innerHTML = '<p class="text-slate-400 text-sm">No match results recorded yet.</p>';
    return;
  }
  state.matches.forEach((m) => {
    const winner = state.players.find((p) => p.id === m.winner_player_id)?.name ?? 'Unknown';
    const loser = state.players.find((p) => p.id === m.loser_player_id)?.name ?? 'Unknown';
    root.insertAdjacentHTML('beforeend', `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
        <p class="font-semibold">${winner} defeated ${loser}</p>
        <p class="text-slate-400">Winner Brawler pick: ${m.coin_toss_pick_first ?? 'N/A'} · Winner: ${m.coin_toss_winner_name ?? 'N/A'}</p>
      </div>
    `);
  });
}

function renderDraftLists() {
  const root = el('draftLists');
  root.innerHTML = '';
  [ROLES.PRO, ROLES.CASUAL].forEach((role) => {
    const players = byRole(role).map((p) => p.name).join(', ') || 'None available';
    root.insertAdjacentHTML('beforeend', `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
        <p class="font-semibold mb-1">${role}</p>
        <p class="text-slate-400">${players}</p>
      </div>
    `);
  });
}

function renderPairings() {
  const root = el('pairingsList');
  root.innerHTML = '';
  const players = shuffle(semiPros());
  state.pairings = [];
  for (let i = 0; i < players.length; i += 2) {
    const p1 = players[i];
    const p2 = players[i + 1];
    if (!p1 || !p2) break;
    state.pairings.push({ p1, p2 });
    const tpl = document.importNode(el('pairingTemplate').content, true);
    tpl.querySelector('.match-title').textContent = `${p1.name} vs ${p2.name}`;
    const btns = tpl.querySelectorAll('.player-btn');
    btns[0].textContent = p1.name;
    btns[1].textContent = p2.name;
    const winnerSelect = tpl.querySelector('.winner-select');
    const loserSelect = tpl.querySelector('.loser-select');
    [p1, p2].forEach((p) => {
      winnerSelect.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name}</option>`);
      loserSelect.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name}</option>`);
    });
    btns[0].addEventListener('click', () => { winnerSelect.value = p1.id; loserSelect.value = p2.id; });
    btns[1].addEventListener('click', () => { winnerSelect.value = p2.id; loserSelect.value = p1.id; });
    tpl.querySelector('.coin-btn').addEventListener('click', () => {
      const first = randomChoice(BRAWLERS);
      const winner = Math.random() > 0.5 ? p1 : p2;
      notice(`${winner.name} wins the coin toss and picks first: ${first}`);
    });
    tpl.querySelector('.save-match').addEventListener('click', async () => {
      const winnerId = winnerSelect.value;
      const loserId = loserSelect.value;
      if (!winnerId || !loserId || winnerId === loserId) return notice('Select a valid winner and loser.', 'red');
      const winner = state.players.find((p) => p.id === winnerId);
      const loser = state.players.find((p) => p.id === loserId);
      await supabase.from('match_results').insert({
        semi_pro_left_id: p1.id,
        semi_pro_right_id: p2.id,
        winner_player_id: winnerId,
        loser_player_id: loserId,
        coin_toss_winner_player_id: winnerId,
        coin_toss_winner_name: winner?.name ?? null,
        coin_toss_pick_first: randomChoice(BRAWLERS),
        winner_brawler_pick: randomChoice(BRAWLERS),
        loser_brawler_pick: randomChoice(BRAWLERS),
      });
      await supabase.from('players').update({ mvp_eligible: true, available: false }).eq('id', winnerId);
      await supabase.from('players').update({ available: false }).eq('id', loserId);
      notice('Match saved and MVP eligibility updated.');
      await fetchData();
    });
    root.appendChild(tpl);
  }
  if (!state.pairings.length) {
    root.innerHTML = '<p class="text-slate-400 text-sm">Need at least 2 Semi-Pro players to create pairings.</p>';
  }
}

function renderWinnerPanel() {
  const root = el('winnerPanel');
  root.innerHTML = '';
  const latestWinner = state.players.find((p) => p.id === state.selectedWinner) ?? state.players.find((p) => p.mvp_eligible);
  if (!latestWinner) {
    root.innerHTML = '<p class="text-slate-400 text-sm">Save a match result first to unlock winner pool assignment.</p>';
    return;
  }
  const tpl = document.importNode(el('winnerTemplate').content, true);
  tpl.querySelector('.winner-name').textContent = latestWinner.name;
  const winnerPool = tpl.querySelector('.winner-pool');
  const loserPool = tpl.querySelector('.loser-pool');
  const pools = availablePools();
  pools.forEach((pool) => {
    winnerPool.insertAdjacentHTML('beforeend', `<option value="${pool.id}">${pool.name}</option>`);
    loserPool.insertAdjacentHTML('beforeend', `<option value="${pool.id}">${pool.name}</option>`);
  });
  tpl.querySelector('.save-pool').addEventListener('click', async () => {
    const winnerPoolId = winnerPool.value;
    const loserPoolId = loserPool.value;
    if (!winnerPoolId || !loserPoolId) return notice('Select two pools.', 'red');
    if (winnerPoolId === loserPoolId) return notice('Winner and loser must be assigned to different pools.', 'red');
    const winnerPoolRecord = state.pools.find((p) => p.id === winnerPoolId);
    if ((winnerPoolRecord?.semi_pro_count ?? 0) >= (winnerPoolRecord?.capacity_semi_pro ?? 2)) {
      return notice('Winner pool is already at Semi-Pro capacity.', 'red');
    }
    const updateWinner = await supabase.from('players').update({ pool_id: winnerPoolId }).eq('id', latestWinner.id);
    if (updateWinner.error) return notice(updateWinner.error.message, 'red');
    await supabase.from('team_assignments').upsert({ pool_id: winnerPoolId, player_id: latestWinner.id, role: ROLES.SEMI_PRO });
    notice('Winner assigned to pool. Draft the Pro and Casual team members next.');
    await fetchData();
  });
  root.appendChild(tpl);
}

function renderEligibleList() {
  const root = el('eligibleList');
  root.innerHTML = '';
  const list = eligibleMvp();
  if (!list.length) {
    root.innerHTML = '<p class="text-slate-400 text-sm">No MVP-eligible Semi-Pro winners yet.</p>';
    return;
  }
  list.forEach((p) => {
    root.insertAdjacentHTML('beforeend', `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-3">
        <div>
          <p class="font-semibold">${p.name}</p>
          <p class="text-xs text-slate-400">Eligible for MVP vote</p>
        </div>
        <button class="vote-now px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-sm font-semibold" data-id="${p.id}">Vote</button>
      </div>
    `);
  });
  root.querySelectorAll('.vote-now').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelector('[data-tab="mvp"]').click();
    const target = document.querySelector(`[data-candidate="${btn.dataset.id}"]`);
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
}

function renderMvpVotes() {
  const root = el('mvpCandidates');
  root.innerHTML = '';
  const eligible = eligibleMvp();
  if (!eligible.length) {
    root.innerHTML = '<p class="text-slate-400 text-sm">No eligible MVP candidates yet.</p>';
    return;
  }
  const voteCounts = new Map();
  state.votes.forEach((vote) => voteCounts.set(vote.player_id, (voteCounts.get(vote.player_id) ?? 0) + 1));
  const winner = [...voteCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  eligible.forEach((p) => {
    const count = voteCounts.get(p.id) ?? 0;
    root.insertAdjacentHTML('beforeend', `
      <div class="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3" data-candidate="${p.id}">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h3 class="font-bold">${p.name}</h3>
            <p class="text-xs text-slate-400">Semi-Pro winner</p>
          </div>
          <span class="text-xs px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/20">${count} votes</span>
        </div>
        <button class="cast-vote w-full px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold" data-id="${p.id}">Cast Vote</button>
      </div>
    `);
  });
  root.querySelectorAll('.cast-vote').forEach((btn) => btn.addEventListener('click', async () => {
    await supabase.from('mvp_votes').insert({ player_id: btn.dataset.id, voter_label: 'web-user' });
    notice('Vote recorded.');
    await fetchData();
  }));
  if (winner) {
    const [winnerId, votes] = winner;
    const player = state.players.find((p) => p.id === winnerId);
    if (player) {
      root.insertAdjacentHTML('afterbegin', `
        <div class="md:col-span-2 xl:col-span-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-yellow-100">
          <p class="font-black text-lg">MVP of the Day: ${player.name}</p>
          <p class="text-sm">${votes} votes · Wins a Brawl Pass!</p>
        </div>
      `);
    }
  }
}

function renderAll() {
  renderCounters();
  renderPools();
  renderTeams();
  renderMatches();
  renderDraftLists();
  renderPairings();
  renderWinnerPanel();
  renderEligibleList();
  renderMvpVotes();
}

function setTab(tab) {
  const sections = { admin: el('adminSection'), draft: el('draftSection'), mvp: el('mvpSection') };
  Object.entries(sections).forEach(([key, section]) => section.classList.toggle('hidden', key !== tab));
  document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.toggle('bg-violet-600', btn.dataset.tab === tab));
}

async function createPools(count) {
  const existing = state.pools.length;
  const rows = Array.from({ length: count }, (_, i) => ({
    name: poolNameFromIndex(existing + i),
    capacity_semi_pro: 2,
    active: true,
  }));
  const { error } = await supabase.from('pools').insert(rows);
  if (error) return notice(error.message, 'red');
  notice(`${count} pool(s) created.`);
  await fetchData();
}

async function assignRandomDraft(role, playerId, poolId) {
  const { error } = await supabase.from('players').update({ pool_id: poolId, available: false }).eq('id', playerId);
  if (error) return notice(error.message, 'red');
  await supabase.from('team_assignments').upsert({ pool_id: poolId, player_id: playerId, role });
  notice(`${role} drafted successfully.`);
  await fetchData();
}

function wireEvents() {
  document.querySelectorAll('.tab-btn').forEach((btn) => btn.addEventListener('click', () => setTab(btn.dataset.tab)));
  el('poolForm').addEventListener('submit', (e) => {
    e.preventDefault();
    createPools(Number(el('poolCount').value || 1));
  });
  el('addPoolBtn').addEventListener('click', () => createPools(1));
  el('refreshBtn').addEventListener('click', fetchData);
  el('pairBtn').addEventListener('click', renderPairings);
  el('loadWinnerBtn').addEventListener('click', () => {
    const latest = state.matches.find((m) => m.winner_player_id);
    state.selectedWinner = latest?.winner_player_id ?? null;
    renderWinnerPanel();
  });
  el('spinProBtn').addEventListener('click', async () => {
    const player = randomChoice(byRole(ROLES.PRO));
    if (!player) return notice('No available Pro players to spin.', 'red');
    const pool = availablePools().find((p) => (state.players.filter((x) => x.pool_id === p.id).length < 3)) ?? availablePools()[0];
    if (!pool) return notice('No available pool for Pro assignment.', 'red');
    el('wheelResult').textContent = `Pro selected: ${player.name}`;
    await assignRandomDraft(ROLES.PRO, player.id, pool.id);
  });
  el('spinCasualBtn').addEventListener('click', async () => {
    const player = randomChoice(byRole(ROLES.CASUAL));
    if (!player) return notice('No available Casual players to spin.', 'red');
    const pool = availablePools().find((p) => (state.players.filter((x) => x.pool_id === p.id).length < 3)) ?? availablePools()[0];
    if (!pool) return notice('No available pool for Casual assignment.', 'red');
    el('wheelResult').textContent = `Casual selected: ${player.name}`;
    await assignRandomDraft(ROLES.CASUAL, player.id, pool.id);
  });
  el('refreshMvpBtn').addEventListener('click', fetchData);
}

async function bootstrap() {
  wireEvents();
  setTab('admin');
  try {
    await fetchData();
  } catch (error) {
    notice(error.message, 'red');
  }
}

bootstrap();