// =============================================
// ESTADO GLOBAL
// =============================================
let categorias = [];
let atividades = [];
let checklistItens = [];
let registros = [];
let usuarios = [];
let colmeias = [];
let vistorias = [];
let camposTexto = [];
let usuarioLogado = null;
let adminLiberado = false;
let categoriaAtual = null;
let atividadeAtual = null;
let colmeiaAtual = null;
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let diaSelecionado = null;

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

const LEGENDA_CAMPOS = {
    QTT: 'Número total de módulos',
    QVE: 'Número de módulos velhos ou deformados',
    QL: 'Número de módulos preenchidos',
    QVZ: 'Número de módulos vazios',
    QAL: 'Número de módulos contendo somente alimento (mel/pólen)',
    QCR: 'Número de ninhos de crias',
    POST: 'Condições da postura da rainha',
    MELG: 'Presença/Ausência de potes de pólen ou mel'
};

const ACOES = [
    { sigla: 'IA', descricao: 'Iniciar alimentação' },
    { sigla: 'A',  descricao: 'Alimentar' },
    { sigla: 'D',  descricao: 'Dividir' },
    { sigla: 'O',  descricao: 'Órfã' },
    { sigla: 'Z',  descricao: 'Zanganeira' },
    { sigla: 'CM', descricao: 'Colher mel' },
    { sigla: 'CP', descricao: 'Colher própolis' },
    { sigla: 'MA', descricao: 'Adicionar módulo' },
    { sigla: 'MR', descricao: 'Retirar módulo' },
    { sigla: 'QN', descricao: 'Módulo ninho' },
    { sigla: 'N',  descricao: 'Ninho' },
    { sigla: 'IS', descricao: 'Instalar suporte' },
    { sigla: 'L',  descricao: 'Limpar' },
    { sigla: 'CI', descricao: 'Ninho provisório isca' }
];

// =============================================
// INICIALIZAÇÃO
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    const sessao = localStorage.getItem('usuarioLogado');
    if (sessao) {
        usuarioLogado = JSON.parse(sessao);
        iniciarSistema();
    }
});

async function iniciarSistema() {
    document.getElementById('telaLogin').classList.add('hidden');
    document.getElementById('sistemaPrincipal').classList.remove('hidden');
    document.getElementById('nomeUsuarioMenu').textContent = `👤 ${usuarioLogado.nome}`;

    if (usuarioLogado.perfil === 'admin') {
        document.getElementById('menuAdmin').classList.remove('hidden');
    }

    await carregarTudo();
}

async function carregarTudo() {
    try {
        categorias     = await db.get('categorias');
        atividades     = await db.get('atividades');
        checklistItens = await db.get('checklist_itens');
        registros      = await db.get('registros');
        usuarios       = await db.get('usuarios');
        colmeias       = await db.get('colmeias');
        vistorias      = await db.get('vistorias');
        camposTexto    = await db.get('campos_texto');

        renderizarMenuCategorias();
        renderizarCalendarioGeral();
        renderizarResumoGeral();
        popularSelects();
    } catch(e) {
        mostrarToast('Erro ao conectar com o banco de dados', true);
        console.error(e);
    }
}

// =============================================
// LOGIN / CADASTRO
// =============================================
function mostrarCadastro() {
    document.getElementById('formLogin').classList.add('hidden');
    document.getElementById('formCadastro').classList.remove('hidden');
}

function mostrarLogin() {
    document.getElementById('formCadastro').classList.add('hidden');
    document.getElementById('formLogin').classList.remove('hidden');
}

async function fazerLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const senha = document.getElementById('loginSenha').value.trim();
    if (!email || !senha) { mostrarToast('Preencha email e senha', true); return; }
    try {
        const resultado = await db.query('usuarios', `email=eq.${encodeURIComponent(email)}&senha=eq.${encodeURIComponent(senha)}`);
        if (resultado.length === 0) { mostrarToast('Email ou senha incorretos', true); return; }
        usuarioLogado = resultado[0];
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));
        iniciarSistema();
    } catch(e) { mostrarToast('Erro ao fazer login', true); console.error(e); }
}

async function fazerCadastro() {
    const nome     = document.getElementById('cadastroNome').value.trim();
    const email    = document.getElementById('cadastroEmail').value.trim();
    const senha    = document.getElementById('cadastroSenha').value.trim();
    const confirma = document.getElementById('cadastroConfirma').value.trim();
    if (!nome || !email || !senha) { mostrarToast('Preencha todos os campos', true); return; }
    if (senha !== confirma) { mostrarToast('As senhas não coincidem', true); return; }
    if (senha.length < 4) { mostrarToast('A senha precisa ter pelo menos 4 caracteres', true); return; }
    try {
        const existente = await db.query('usuarios', `email=eq.${encodeURIComponent(email)}`);
        if (existente.length > 0) { mostrarToast('Este email já está cadastrado', true); return; }
        const novo = await db.inserir('usuarios', { nome, email, senha, perfil: 'usuario' });
        usuarioLogado = novo;
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));
        mostrarToast(`✅ Conta criada! Bem-vindo(a), ${nome}!`);
        iniciarSistema();
    } catch(e) { mostrarToast('Erro ao criar conta', true); console.error(e); }
}

function fazerLogout() {
    localStorage.removeItem('usuarioLogado');
    usuarioLogado = null;
    adminLiberado = false;
    document.getElementById('sistemaPrincipal').classList.add('hidden');
    document.getElementById('telaLogin').classList.remove('hidden');
    mostrarLogin();
}

// =============================================
// MENU E NAVEGAÇÃO
// =============================================
function renderizarMenuCategorias() {
    const container = document.getElementById('menuCategorias');
    container.innerHTML = categorias.map(cat => `
        <a href="#" class="menu-item" onclick="abrirCategoria('${cat.id}')">
            ${cat.imagem ? `<img src="${cat.imagem}" style="width:20px;height:20px;object-fit:cover;border-radius:3px">` : cat.icone} <span>${cat.nome}</span>
        </a>
    `).join('');
}

function mostrarTela(nome) {
    document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
    document.querySelectorAll('.menu-item').forEach(i => i.classList.remove('ativo'));
    const tela = document.getElementById(`tela-${nome}`);
    if (tela) tela.classList.add('ativa');
    if (nome === 'admin') { if (!adminLiberado) { mostrarModalSenha(); return; } renderizarAdmin(); }
    if (nome === 'dashboard') renderizarDashboard();
    if (nome === 'relatorios') carregarRelatorios();
    if (nome === 'colmeias') renderizarColmeias();
if (nome === 'acoes') { setTimeout(() => { const hoje = new Date(); const trinta = new Date(); trinta.setDate(hoje.getDate() - 30); document.getElementById('filtroAcoesDE').value = trinta.toISOString().split('T')[0]; document.getElementById('filtroAcoesATE').value = hoje.toISOString().split('T')[0]; gerarRelatorioAcoes(); }, 100); }
    if (nome === 'usuarios') renderizarUsuarios();
    if (nome === 'inicio') { renderizarCalendarioGeral(); renderizarResumoGeral(); }
}

function abrirCategoria(categoriaId) {
    categoriaAtual = categorias.find(c => c.id === categoriaId);
    if (!categoriaAtual) return;
    document.getElementById('tituloCategoriaAtual').textContent = `${categoriaAtual.icone} ${categoriaAtual.nome}`;
    const ativsCategoria = atividades.filter(a => a.categoria_id === categoriaId);
    const container = document.getElementById('listaAtividades');
    if (ativsCategoria.length === 0) {
        container.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;color:#999;padding:40px">Nenhuma atividade cadastrada.</div>`;
    } else {
        const hoje = new Date();
        container.innerHTML = ativsCategoria.map(at => {
            const regsEsteMes = registros.filter(r => {
                if (r.atividade_id !== at.id) return false;
                const d = new Date(r.data + 'T12:00:00');
                return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
            });
            return `<div class="card-atividade" onclick="abrirAtividade('${at.id}')">
                <h3>${at.nome}</h3>
                <div class="frequencia">🔄 ${at.frequencia || 'Frequência não definida'}</div>
                <div class="registros-mes">📝 ${regsEsteMes.length} registro(s) este mês</div>
            </div>`;
        }).join('');
    }
    mostrarTela('categoria');
}

function voltarParaCategoria() {
    if (categoriaAtual) abrirCategoria(categoriaAtual.id);
    else mostrarTela('inicio');
}

async function abrirAtividade(atividadeId) {
    atividadeAtual = atividades.find(a => a.id === atividadeId);
    if (!atividadeAtual) return;
    mesAtual = new Date().getMonth();
    anoAtual = new Date().getFullYear();
    diaSelecionado = null;
    document.getElementById('tituloAtividadeAtual').textContent = atividadeAtual.nome;
    document.getElementById('frequenciaAtual').textContent = `🔄 ${atividadeAtual.frequencia || ''}`;
    renderizarMiniCalendario();
    renderizarHistorico();
    document.getElementById('colunaFormulario').innerHTML = `
        <div class="card placeholder-formulario">
            <p>👆 Clique em um dia no calendário para registrar a atividade</p>
        </div>`;
    mostrarTela('atividade');
}

// =============================================
// CALENDÁRIO GERAL
// =============================================
function renderizarCalendarioGeral() {
    const corpo = document.getElementById('corpoCalendario');
    if (!corpo) return;
    if (categorias.length === 0) {
        corpo.innerHTML = `<tr><td colspan="13" class="loading"><span class="spinner"></span> Carregando...</td></tr>`;
        return;
    }
    corpo.innerHTML = categorias.map(cat => {
        const temAtividade = atividades.some(a => a.categoria_id === cat.id);
        const mesesHTML = Array.from({length: 12}, () =>
            `<td style="color:${temAtividade ? '#4caf50' : '#ccc'}">${temAtividade ? '✕' : '○'}</td>`
        ).join('');
        return `<tr class="linha-categoria" onclick="abrirCategoria('${cat.id}')">
            <td>${cat.icone} ${cat.nome}</td>${mesesHTML}
        </tr>`;
    }).join('');
}

function renderizarResumoGeral() {
    const container = document.getElementById('resumoGeral');
    if (!container) return;
    const hoje = new Date();
    const regsHoje = registros.filter(r => r.data === hoje.toISOString().split('T')[0]);
    const regsEsteMes = registros.filter(r => {
        const d = new Date(r.data + 'T12:00:00');
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    });
    container.innerHTML = `
        <div class="resumo-card"><div class="numero">${categorias.length}</div><div class="label">Categorias ativas</div></div>
        <div class="resumo-card"><div class="numero">${atividades.length}</div><div class="label">Atividades cadastradas</div></div>
        <div class="resumo-card"><div class="numero">${regsHoje.length}</div><div class="label">Registros hoje</div></div>
        <div class="resumo-card"><div class="numero">${regsEsteMes.length}</div><div class="label">Registros este mês</div></div>
    `;
}

// =============================================
// MINI CALENDÁRIO
// =============================================
function renderizarMiniCalendario() {
    const container = document.getElementById('miniCalendario');
    const titulo = document.getElementById('tituloMes');
    titulo.textContent = `${MESES[mesAtual]} ${anoAtual}`;
    const hoje = new Date();
    const primeiroDia = new Date(anoAtual, mesAtual, 1).getDay();
    const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate();
    const regsDoMes = registros.filter(r => {
        if (r.atividade_id !== atividadeAtual.id) return false;
        const d = new Date(r.data + 'T12:00:00');
        return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
    });
    const diasComRegistro = regsDoMes.map(r => parseInt(r.data.split('-')[2]));
    let html = DIAS_SEMANA.map(d => `<div class="cal-dia-header">${d}</div>`).join('');
    for (let i = 0; i < primeiroDia; i++) html += `<div class="cal-dia vazio"></div>`;
    for (let dia = 1; dia <= diasNoMes; dia++) {
        const temReg = diasComRegistro.includes(dia);
        const ehHoje = dia === hoje.getDate() && mesAtual === hoje.getMonth() && anoAtual === hoje.getFullYear();
        const ehSelecionado = dia === diaSelecionado;
        let classes = 'cal-dia';
        if (temReg) classes += ' tem-registro';
        if (ehHoje) classes += ' hoje';
        if (ehSelecionado) classes += ' selecionado';
        html += `<div class="${classes}" onclick="selecionarDia(${dia})">${dia}</div>`;
    }
    container.innerHTML = html;
}

function mudarMes(direcao) {
    mesAtual += direcao;
    if (mesAtual > 11) { mesAtual = 0; anoAtual++; }
    if (mesAtual < 0) { mesAtual = 11; anoAtual--; }
    diaSelecionado = null;
    renderizarMiniCalendario();
    document.getElementById('colunaFormulario').innerHTML = `
        <div class="card placeholder-formulario"><p>👆 Clique em um dia no calendário para registrar a atividade</p></div>`;
}

async function selecionarDia(dia) {
    diaSelecionado = dia;
    renderizarMiniCalendario();
    const dataStr = `${anoAtual}-${String(mesAtual + 1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    const dataExibicao = `${String(dia).padStart(2,'0')}/${String(mesAtual+1).padStart(2,'0')}/${anoAtual}`;
    const regExistente = registros.find(r => r.atividade_id === atividadeAtual.id && r.data === dataStr);
    const itens = checklistItens.filter(i => i.atividade_id === atividadeAtual.id);
    let respostasExistentes = {};
    if (regExistente) {
        try {
            const resps = await db.query('checklist_respostas', `registro_id=eq.${regExistente.id}`);
            resps.forEach(r => { respostasExistentes[r.item_id] = r.marcado; });
        } catch(e) { console.error(e); }
    }
    const camposDaAtividade = camposTexto.filter(c => c.atividade_id === atividadeAtual.id);
    let camposTextoHTML = '';
    if (camposDaAtividade.length > 0) {
        camposTextoHTML = camposDaAtividade.map(c => `
            <div class="form-campo">
                <label>${c.label}:</label>
                <input type="text" id="campo_texto_${c.id}" placeholder="${c.label}"
                    value="${regExistente && regExistente[`campo_${c.id}`] ? regExistente[`campo_${c.id}`] : ''}">
            </div>`).join('');
    }
    let checklistHTML = '';
    if (atividadeAtual.usa_checklist && itens.length > 0) {
        checklistHTML = `<div class="form-campo"><label>Checklist:</label>
            ${itens.map(item => `
                <div class="checklist-item">
                    <input type="checkbox" id="check_${item.id}" ${respostasExistentes[item.id] === true ? 'checked' : ''}>
                    <label for="check_${item.id}">${item.descricao}</label>
                </div>`).join('')}
        </div>`;
    }
    const colmeiasHTML = atividadeAtual.usa_colmeias ? `
        <div class="form-campo">
            <label>Colmeias atendidas:</label>
            <textarea rows="3" id="campoColmeias" placeholder="Ex: JAT-001, JAT-002">${regExistente ? regExistente.colmeias || '' : ''}</textarea>
        </div>` : '';
    document.getElementById('colunaFormulario').innerHTML = `
        <div class="card formulario-registro">
            <h3>📝 ${atividadeAtual.nome}</h3>
            <p style="font-size:13px;color:#888;margin-bottom:16px">${dataExibicao}</p>
            ${camposTextoHTML}
            ${checklistHTML}
            <div class="form-campo">
                <label>Responsável:</label>
                <input type="text" id="campoResponsavel" placeholder="Nome do responsável"
                    value="${regExistente ? regExistente.responsavel || '' : (usuarioLogado ? usuarioLogado.nome : '')}">
            </div>
            ${colmeiasHTML}
            <div class="form-campo">
                <label>Observações:</label>
                <textarea rows="3" id="campoObservacoes" placeholder="Observações">${regExistente ? regExistente.observacoes || '' : ''}</textarea>
            </div>
            <button class="btn-salvar" onclick="salvarRegistro('${dataStr}', '${regExistente ? regExistente.id : ''}')">
                💾 ${regExistente ? 'Atualizar Registro' : 'Salvar Registro'}
            </button>
            ${regExistente ? `<button class="btn-voltar" style="width:100%;margin-top:8px" onclick="excluirRegistro('${regExistente.id}')">🗑️ Excluir Registro</button>` : ''}
        </div>`;
}

async function salvarRegistro(dataStr, registroIdExistente) {
    const responsavel = document.getElementById('campoResponsavel').value.trim();
    const observacoes = document.getElementById('campoObservacoes')?.value.trim() || '';
    const colmeias_campo = document.getElementById('campoColmeias')?.value.trim() || '';
    if (!responsavel) { mostrarToast('Preencha o nome do responsável', true); return; }
    try {
        let registroId;
        if (registroIdExistente) {
            await db.atualizar('registros', registroIdExistente, { responsavel, observacoes, colmeias: colmeias_campo });
            registroId = registroIdExistente;
            const idx = registros.findIndex(r => r.id === registroIdExistente);
            if (idx !== -1) { registros[idx].responsavel = responsavel; registros[idx].observacoes = observacoes; }
        } else {
            const novoReg = await db.inserir('registros', {
                atividade_id: atividadeAtual.id, data: dataStr, responsavel,
                observacoes, colmeias: colmeias_campo,
                usuario_id: usuarioLogado ? usuarioLogado.id : null
            });
            registroId = novoReg.id;
            registros.push(novoReg);
        }
        const camposDaAtiv = camposTexto.filter(c => c.atividade_id === atividadeAtual.id);
        for (const campo of camposDaAtiv) {
            const valor = document.getElementById(`campo_texto_${campo.id}`)?.value || '';
            const respsExist = await db.query('campos_texto_respostas', `registro_id=eq.${registroId}&campo_id=eq.${campo.id}`);
            if (respsExist.length > 0) { await db.atualizar('campos_texto_respostas', respsExist[0].id, { valor }); }
            else { await db.inserir('campos_texto_respostas', { registro_id: registroId, campo_id: campo.id, valor }); }
        }
        const itens = checklistItens.filter(i => i.atividade_id === atividadeAtual.id);
        for (const item of itens) {
            const marcado = document.getElementById(`check_${item.id}`)?.checked || false;
            const respsExist = await db.query('checklist_respostas', `registro_id=eq.${registroId}&item_id=eq.${item.id}`);
            if (respsExist.length > 0) { await db.atualizar('checklist_respostas', respsExist[0].id, { marcado }); }
            else { await db.inserir('checklist_respostas', { registro_id: registroId, item_id: item.id, marcado }); }
        }
        renderizarMiniCalendario(); renderizarHistorico(); renderizarResumoGeral();
        mostrarToast('✅ Registro salvo com sucesso!');
    } catch(e) { mostrarToast('Erro ao salvar registro', true); console.error(e); }
}

async function excluirRegistro(registroId) {
    if (!confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
        await db.deletar('registros', registroId);
        registros = registros.filter(r => r.id !== registroId);
        diaSelecionado = null;
        renderizarMiniCalendario(); renderizarHistorico(); renderizarResumoGeral();
        document.getElementById('colunaFormulario').innerHTML = `
            <div class="card placeholder-formulario"><p>👆 Clique em um dia no calendário para registrar a atividade</p></div>`;
        mostrarToast('Registro excluído');
    } catch(e) { mostrarToast('Erro ao excluir registro', true); }
}

function renderizarHistorico() {
    const container = document.getElementById('listaHistorico');
    const regs = registros.filter(r => r.atividade_id === atividadeAtual.id)
        .sort((a, b) => b.data.localeCompare(a.data)).slice(0, 15);
    if (regs.length === 0) { container.innerHTML = '<div class="historico-vazio">Nenhum registro ainda.</div>'; return; }
    container.innerHTML = regs.map(r => {
        const [ano, mes, dia] = r.data.split('-');
        return `<div class="historico-item">
            <span class="historico-data">${dia}/${mes}/${ano}</span>
            <span class="historico-responsavel">${r.responsavel || '—'}</span>
        </div>`;
    }).join('');
}

// =============================================
// COLMEIAS
// =============================================
function renderizarColmeias(lista = null) {
    const container = document.getElementById('tabelaColmeias');
    const dados = lista || colmeias;
    if (dados.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:20px">Nenhuma colmeia cadastrada.</p>';
        return;
    }
    container.innerHTML = `
        <table class="tabela-colmeias">
            <thead><tr>
                <th>Código</th><th>Status</th><th>Nome Popular</th><th>Espécie</th>
                <th>Localização</th><th>Origem</th><th>Vistorias</th><th>Ações</th>
            </tr></thead>
            <tbody>${dados.map(c => {
                const vstColmeia = vistorias.filter(v => v.colmeia_id === c.id);
                return `<tr>
                    <td><b>${c.codigo}</b></td>
                    <td><span class="badge-status badge-${c.status || 'ativa'}">${c.status === 'inativa' ? 'Inativa' : 'Ativa'}</span></td>
                    <td>${c.nome_popular || '—'}</td>
                    <td>${c.especie || '—'}</td>
                    <td>${c.localizacao || '—'}</td>
                    <td>${c.origem || '—'}</td>
                    <td>${vstColmeia.length} vistoria(s)</td>
                    <td>
                        ${c.status === 'inativa'
                            ? `<button class="btn-editar" disabled style="opacity:0.4;cursor:not-allowed">🔍 Ver</button>
                               <button class="btn-editar" disabled style="opacity:0.4;cursor:not-allowed">📋 Vistoria</button>`
                            : `<button class="btn-editar" onclick="abrirDetalheColmeia('${c.id}')">🔍 Ver</button>
                               <button class="btn-editar" onclick="abrirVistoriaRapida('${c.id}')">📋 Vistoria</button>`}
                        <button class="btn-editar" onclick="editarColmeia('${c.id}')">✏️</button>
                        <button class="btn-excluir-tabela" onclick="excluirColmeia('${c.id}')">🗑️</button>
                    </td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
}

function filtrarColmeias() {
    const busca = document.getElementById('buscaColmeia').value.toLowerCase();
    const status = document.getElementById('filtroStatusColmeia').value;
    let filtradas = colmeias;
    if (busca) filtradas = filtradas.filter(c =>
        c.codigo?.toLowerCase().includes(busca) ||
        c.especie?.toLowerCase().includes(busca) ||
        c.nome_popular?.toLowerCase().includes(busca));
    if (status) filtradas = filtradas.filter(c => (c.status || 'ativa') === status);
    renderizarColmeias(filtradas);
}

function abrirFormColmeia() {
    document.getElementById('tituloFormColmeia').textContent = 'Nova Colmeia';
    document.getElementById('colmeiaEditandoId').value = '';
    document.getElementById('colmeiaCodigo').value = '';
    document.getElementById('colmeiaNomePopular').value = '';
    document.getElementById('colmeiaEspecie').value = '';
    document.getElementById('colmeiaLocalizacao').value = '';
    document.getElementById('colmeiaStatus').value = 'ativa';
    document.getElementById('colmeiaObservacoes').value = '';
    document.getElementById('formColmeia').classList.remove('hidden');
    document.getElementById('detalheColmeia').classList.add('hidden');
}

function editarColmeia(id) {
    const c = colmeias.find(x => x.id === id);
    if (!c) return;
    document.getElementById('tituloFormColmeia').textContent = 'Editar Colmeia';
    document.getElementById('colmeiaEditandoId').value = c.id;
    document.getElementById('colmeiaCodigo').value = c.codigo || '';
    document.getElementById('colmeiaNomePopular').value = c.nome_popular || '';
    document.getElementById('colmeiaEspecie').value = c.especie || '';
    document.getElementById('colmeiaLocalizacao').value = c.localizacao || '';
    document.getElementById('colmeiaOrigem').value = c.origem || '';
    document.getElementById('colmeiaStatus').value = c.status || 'ativa';
    document.getElementById('colmeiaObservacoes').value = c.observacoes || '';
    document.getElementById('formColmeia').classList.remove('hidden');
    document.getElementById('detalheColmeia').classList.add('hidden');
    document.getElementById('formColmeia').scrollIntoView({ behavior: 'smooth' });
}

function fecharFormColmeia() {
    document.getElementById('formColmeia').classList.add('hidden');
}

async function salvarColmeia() {
    const id = document.getElementById('colmeiaEditandoId').value;
    const dados = {
        codigo: document.getElementById('colmeiaCodigo').value.trim(),
        nome_popular: document.getElementById('colmeiaNomePopular').value.trim(),
        especie: document.getElementById('colmeiaEspecie').value.trim(),
        localizacao: document.getElementById('colmeiaLocalizacao').value.trim(),
        origem: document.getElementById('colmeiaOrigem')?.value.trim() || '',
        status: document.getElementById('colmeiaStatus').value,
        observacoes: document.getElementById('colmeiaObservacoes').value.trim()
    };
    if (!dados.codigo) { mostrarToast('Preencha o código da colmeia', true); return; }
    try {
        if (id) {
            await db.atualizar('colmeias', id, dados);
            const idx = colmeias.findIndex(c => c.id === id);
            if (idx !== -1) colmeias[idx] = { ...colmeias[idx], ...dados };
            mostrarToast('✅ Colmeia atualizada!');
        } else {
            const nova = await db.inserir('colmeias', dados);
            colmeias.push(nova);
            mostrarToast('✅ Colmeia cadastrada!');
        }
        fecharFormColmeia();
        renderizarColmeias();
    } catch(e) { mostrarToast('Erro ao salvar colmeia', true); console.error(e); }
}

async function excluirColmeia(id) {
    if (!confirm('Excluir esta colmeia?')) return;
    try {
        await db.deletar('colmeias', id);
        colmeias = colmeias.filter(c => c.id !== id);
        renderizarColmeias();
        mostrarToast('Colmeia excluída');
    } catch(e) { mostrarToast('Erro ao excluir colmeia', true); }
}

// =============================================
// DETALHE DA COLMEIA + VISTORIAS
// =============================================
function abrirDetalheColmeia(id) {
    colmeiaAtual = colmeias.find(c => c.id === id);
    if (!colmeiaAtual) return;

    document.getElementById('formColmeia').classList.add('hidden');
    const detalhe = document.getElementById('detalheColmeia');
    detalhe.classList.remove('hidden');

    const vstColmeia = vistorias.filter(v => v.colmeia_id === id)
        .sort((a, b) => b.data.localeCompare(a.data));

    detalhe.innerHTML = `
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <h3>🐝 ${colmeiaAtual.codigo} — ${colmeiaAtual.nome_popular || colmeiaAtual.especie || ''}</h3>
                <button onclick="document.getElementById('detalheColmeia').classList.add('hidden')">✕ Fechar</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:16px;font-size:13px">
                <div><b>Espécie:</b> ${colmeiaAtual.especie || '—'}</div>
                <div><b>Localização:</b> ${colmeiaAtual.localizacao || '—'}</div>
                <div><b>Status:</b> <span class="badge-status badge-${colmeiaAtual.status || 'ativa'}">${colmeiaAtual.status === 'inativa' ? 'Inativa' : 'Ativa'}</span></div>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                <h4>📋 Histórico de Vistorias (${vstColmeia.length})</h4>
                <button onclick="abrirFormVistoria('${id}')">➕ Nova Vistoria</button>
            </div>

            <div id="formVistoria" class="hidden" style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
                    <h4 id="tituloFormVistoria">Nova Vistoria</h4>
                    <button onclick="mostrarLegendaCampos()" style="background:#e3f2fd;color:#1565c0;padding:4px 10px;font-size:12px">? Legenda dos campos</button>
                </div>
                <input type="hidden" id="vistoriaEditandoId">
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:12px">
                    <div class="form-campo"><label>Data</label><input type="date" id="vistoriaData"></div>
                    <div class="form-campo"><label>QTT</label><input type="number" id="vistoriaQTT" placeholder="Total módulos" min="0"></div>
                    <div class="form-campo"><label>QVE</label><input type="number" id="vistoriaQVE" placeholder="Velhos/deformados" min="0"></div>
                    <div class="form-campo"><label>QL</label><input type="number" id="vistoriaQL" placeholder="Preenchidos" min="0"></div>
                    <div class="form-campo"><label>QVZ</label><input type="number" id="vistoriaQVZ" placeholder="Vazios" min="0"></div>
                    <div class="form-campo"><label>QAL (m/p)</label><input type="number" id="vistoriaQAL" placeholder="Com alimento" min="0"></div>
                    <div class="form-campo"><label>QCR</label><input type="number" id="vistoriaQCR" placeholder="Ninhos de crias" min="0"></div>
                    <div class="form-campo">
                        <label>POST</label>
                        <select id="vistoriaPOST">
                            <option value="">Selecione</option>
                            <option value="3">3 — Postura excelente/compacta</option>
                            <option value="2">2 — Postura média/falhada</option>
                            <option value="1">1 — Zanganeira</option>
                        </select>
                    </div>
                </div>
                <div class="form-campo"><label>MELG — Potes de pólen/mel</label>
                    <textarea id="vistoriaMELG" rows="2" placeholder="Descreva presença/ausência e condições"></textarea>
                </div>
                <div class="form-campo"><label>Observações</label>
                    <textarea id="vistoriaOBS" rows="2" placeholder="Observações sobre necessidades imediatas ou oportunas de multiplicação"></textarea>
                </div>
                <div class="form-campo">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                        <label>Ações Realizadas</label>
                        <button onclick="mostrarLegendaAcoes()" style="background:#e3f2fd;color:#1565c0;padding:4px 10px;font-size:12px">? Legenda</button>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px">
                        ${ACOES.map(a => `
                            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
                                <input type="checkbox" id="acao_${a.sigla}">
                                <b>${a.sigla}</b> ${a.descricao}
                            </label>`).join('')}
                    </div>
                </div>
                <div style="display:flex;gap:10px;margin-top:12px">
                    <button onclick="salvarVistoria('${id}')">💾 Salvar Vistoria</button>
                    <button class="btn-voltar" onclick="document.getElementById('formVistoria').classList.add('hidden')">Cancelar</button>
                </div>
            </div>

            ${vstColmeia.length === 0
                ? '<p style="color:#999;text-align:center;padding:20px">Nenhuma vistoria registrada ainda.</p>'
                : `<div style="overflow-x:auto">
                    <table class="tabela-colmeias">
                        <thead><tr>
                            <th>Data</th><th>QTT</th><th>QVE</th><th>QL</th>
                            <th>QVZ</th><th>QAL</th><th>QCR</th><th>POST</th>
                            <th>Ações</th><th></th>
                        </tr></thead>
                        <tbody>${vstColmeia.map(v => {
                            const [ano, mes, dia] = v.data.split('-');
                            const acoes = v.acoes ? JSON.parse(v.acoes).join(', ') : '—';
                            return `<tr>
                                <td><b>${dia}/${mes}/${ano}</b></td>
                                <td>${v.qtt ?? '—'}</td>
                                <td>${v.qve ?? '—'}</td>
                                <td>${v.ql ?? '—'}</td>
                                <td>${v.qvz ?? '—'}</td>
                                <td>${v.qal ?? '—'}</td>
                                <td>${v.qcr ?? '—'}</td>
                                <td>${v.post ? `${v.post}` : '—'}</td>
                                <td style="font-size:12px">${acoes}</td>
                                <td>
                                    <button class="btn-editar" onclick="editarVistoria('${v.id}','${id}')">✏️</button>
                                    <button class="btn-excluir-tabela" onclick="excluirVistoria('${v.id}','${id}')">🗑️</button>
                                </td>
                            </tr>`;
                        }).join('')}</tbody>
                    </table>
                </div>`}
        </div>`;

    detalhe.scrollIntoView({ behavior: 'smooth' });
}

function abrirFormVistoria(colmeiaId) {
    const form = document.getElementById('formVistoria');
    form.classList.remove('hidden');
    document.getElementById('tituloFormVistoria').textContent = 'Nova Vistoria';
    document.getElementById('vistoriaEditandoId').value = '';
    document.getElementById('vistoriaData').value = new Date().toISOString().split('T')[0];
    ['QTT','QVE','QL','QVZ','QAL','QCR'].forEach(f => document.getElementById(`vistoria${f}`).value = '');
    document.getElementById('vistoriaPOST').value = '';
    document.getElementById('vistoriaMELG').value = '';
    document.getElementById('vistoriaOBS').value = '';
    ACOES.forEach(a => { const el = document.getElementById(`acao_${a.sigla}`); if (el) el.checked = false; });
    form.scrollIntoView({ behavior: 'smooth' });
}

function editarVistoria(vistoriaId, colmeiaId) {
    const v = vistorias.find(x => x.id === vistoriaId);
    if (!v) return;
    const form = document.getElementById('formVistoria');
    form.classList.remove('hidden');
    document.getElementById('tituloFormVistoria').textContent = 'Editar Vistoria';
    document.getElementById('vistoriaEditandoId').value = v.id;
    document.getElementById('vistoriaData').value = v.data;
    document.getElementById('vistoriaQTT').value = v.qtt || '';
    document.getElementById('vistoriaQVE').value = v.qve || '';
    document.getElementById('vistoriaQL').value = v.ql || '';
    document.getElementById('vistoriaQVZ').value = v.qvz || '';
    document.getElementById('vistoriaQAL').value = v.qal || '';
    document.getElementById('vistoriaQCR').value = v.qcr || '';
    document.getElementById('vistoriaPOST').value = v.post || '';
    document.getElementById('vistoriaMELG').value = v.melg || '';
    document.getElementById('vistoriaOBS').value = v.observacoes || '';
    const acoesArr = v.acoes ? JSON.parse(v.acoes) : [];
    ACOES.forEach(a => { const el = document.getElementById(`acao_${a.sigla}`); if (el) el.checked = acoesArr.includes(a.sigla); });
    form.scrollIntoView({ behavior: 'smooth' });
}

async function salvarVistoria(colmeiaId) {
    const editandoId = document.getElementById('vistoriaEditandoId').value;
    const data = document.getElementById('vistoriaData').value;
    if (!data) { mostrarToast('Selecione a data da vistoria', true); return; }

    const acoesSelecionadas = ACOES.filter(a => document.getElementById(`acao_${a.sigla}`)?.checked).map(a => a.sigla);

    const dados = {
        colmeia_id: colmeiaId,
        data,
        qtt: parseInt(document.getElementById('vistoriaQTT').value) || null,
        qve: parseInt(document.getElementById('vistoriaQVE').value) || null,
        ql:  parseInt(document.getElementById('vistoriaQL').value)  || null,
        qvz: parseInt(document.getElementById('vistoriaQVZ').value) || null,
        qal: parseInt(document.getElementById('vistoriaQAL').value) || null,
        qcr: parseInt(document.getElementById('vistoriaQCR').value) || null,
        post: document.getElementById('vistoriaPOST').value || null,
        melg: document.getElementById('vistoriaMELG').value.trim() || null,
        observacoes: document.getElementById('vistoriaOBS').value.trim() || null,
        acoes: JSON.stringify(acoesSelecionadas),
        usuario_id: usuarioLogado ? usuarioLogado.id : null,
        responsavel: usuarioLogado ? usuarioLogado.nome : null
    };

    try {
        if (editandoId) {
            await db.atualizar('vistorias', editandoId, dados);
            const idx = vistorias.findIndex(v => v.id === editandoId);
            if (idx !== -1) vistorias[idx] = { ...vistorias[idx], ...dados };
            mostrarToast('✅ Vistoria atualizada!');
        } else {
            const nova = await db.inserir('vistorias', dados);
            vistorias.push(nova);
            mostrarToast('✅ Vistoria salva!');
        }
        abrirDetalheColmeia(colmeiaId);
    } catch(e) { mostrarToast('Erro ao salvar vistoria', true); console.error(e); }
}

async function excluirVistoria(vistoriaId, colmeiaId) {
    if (!confirm('Excluir esta vistoria?')) return;
    try {
        await db.deletar('vistorias', vistoriaId);
        vistorias = vistorias.filter(v => v.id !== vistoriaId);
        abrirDetalheColmeia(colmeiaId);
        mostrarToast('Vistoria excluída');
    } catch(e) { mostrarToast('Erro ao excluir vistoria', true); }
}

function mostrarLegendaCampos() {
    const html = Object.entries(LEGENDA_CAMPOS).map(([sigla, desc]) =>
        `<div style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px"><b>${sigla}</b> = ${desc}</div>`
    ).join('');
    mostrarModalInfo('📖 Legenda dos Campos', html);
}

function mostrarLegendaAcoes() {
    const html = ACOES.map(a =>
        `<div style="padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:13px"><b>${a.sigla}</b> = ${a.descricao}</div>`
    ).join('');
    mostrarModalInfo('📖 Legenda das Ações', html);
}

function mostrarModalInfo(titulo, conteudo) {
    let modal = document.getElementById('modalInfo');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalInfo';
        modal.className = 'modal';
        modal.innerHTML = `<div class="modal-box" style="max-width:420px">
            <h3 id="modalInfoTitulo"></h3>
            <div id="modalInfoConteudo" style="margin:12px 0;max-height:300px;overflow-y:auto"></div>
            <div class="modal-botoes"><button onclick="document.getElementById('modalInfo').classList.add('hidden')">Fechar</button></div>
        </div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('modalInfoTitulo').textContent = titulo;
    document.getElementById('modalInfoConteudo').innerHTML = conteudo;
    modal.classList.remove('hidden');
}

// =============================================
// RELATÓRIOS
// =============================================
function carregarRelatorios() {
    const sel = document.getElementById('filtroAtividade');
    sel.innerHTML = '<option value="">Todas</option>' +
        atividades.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
}

function gerarRelatorio() {
    const atividadeId = document.getElementById('filtroAtividade').value;
    const responsavel = document.getElementById('filtroResponsavel').value.trim().toLowerCase();
    const de = document.getElementById('filtroDe').value;
    const ate = document.getElementById('filtroAte').value;
    let regs = [...registros];
    if (atividadeId) regs = regs.filter(r => r.atividade_id === atividadeId);
    if (responsavel) regs = regs.filter(r => r.responsavel?.toLowerCase().includes(responsavel));
    if (de) regs = regs.filter(r => r.data >= de);
    if (ate) regs = regs.filter(r => r.data <= ate);
    regs.sort((a, b) => b.data.localeCompare(a.data));
    const container = document.getElementById('resultadoRelatorio');
    if (regs.length === 0) {
        container.innerHTML = `<div class="card" style="text-align:center;color:#999;padding:40px">Nenhum registro encontrado.</div>`;
        return;
    }
    container.innerHTML = `<div class="card">
        <p style="font-size:13px;color:#888;margin-bottom:12px">${regs.length} registro(s)</p>
        <div class="tabela-wrapper">
            <table class="tabela-relatorio">
                <thead><tr><th>Data</th><th>Atividade</th><th>Responsável</th><th>Colmeias</th><th>Observações</th></tr></thead>
                <tbody>${regs.map(r => {
                    const at = atividades.find(a => a.id === r.atividade_id);
                    const [ano, mes, dia] = r.data.split('-');
                    return `<tr><td>${dia}/${mes}/${ano}</td><td>${at ? at.nome : '—'}</td>
                        <td>${r.responsavel || '—'}</td><td>${r.colmeias || '—'}</td>
                        <td>${r.observacoes || '—'}</td></tr>`;
                }).join('')}</tbody>
            </table>
        </div>
    </div>`;
}

// =============================================
// DASHBOARD
// =============================================
function renderizarDashboard() {
    const hoje = new Date();
    const regsHoje = registros.filter(r => r.data === hoje.toISOString().split('T')[0]);
    const regsEsteMes = registros.filter(r => {
        const d = new Date(r.data + 'T12:00:00');
        return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
    });
    document.getElementById('resumoDashboard').innerHTML = `
        <div class="resumo-card"><div class="numero">${usuarios.length}</div><div class="label">Usuários cadastrados</div></div>
        <div class="resumo-card"><div class="numero">${registros.length}</div><div class="label">Total de registros</div></div>
        <div class="resumo-card"><div class="numero">${regsHoje.length}</div><div class="label">Registros hoje</div></div>
        <div class="resumo-card"><div class="numero">${regsEsteMes.length}</div><div class="label">Registros este mês</div></div>
    `;
    const porMes = {};
    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const chave = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        porMes[chave] = 0;
    }
    registros.forEach(r => { const chave = r.data.substring(0, 7); if (porMes[chave] !== undefined) porMes[chave]++; });
    const maxMes = Math.max(...Object.values(porMes), 1);
    document.getElementById('graficoMes').innerHTML = Object.entries(porMes).map(([mes, qtd]) => {
        const [ano, m] = mes.split('-');
        const label = `${MESES[parseInt(m)-1].substring(0,3)}/${ano.substring(2)}`;
        return `<div class="barra-grafico">
            <div class="barra-label">${label}</div>
            <div class="barra-fundo"><div class="barra-fill" style="width:${(qtd/maxMes)*100}%"></div></div>
            <div class="barra-valor">${qtd}</div>
        </div>`;
    }).join('');
    const porUsuario = {};
    registros.forEach(r => { const nome = r.responsavel || 'Sem nome'; porUsuario[nome] = (porUsuario[nome] || 0) + 1; });
    const topUsuarios = Object.entries(porUsuario).sort((a,b) => b[1]-a[1]).slice(0, 8);
    const maxUser = Math.max(...topUsuarios.map(u => u[1]), 1);
    document.getElementById('graficoUsuario').innerHTML = topUsuarios.length === 0
        ? '<p style="color:#999;font-size:13px">Nenhum registro ainda.</p>'
        : topUsuarios.map(([nome, qtd]) => `
            <div class="barra-grafico">
                <div class="barra-label">${nome}</div>
                <div class="barra-fundo"><div class="barra-fill" style="width:${(qtd/maxUser)*100}%"></div></div>
                <div class="barra-valor">${qtd}</div>
            </div>`).join('');
    const porAtividade = {};
    atividades.forEach(a => { porAtividade[a.id] = { nome: a.nome, qtd: 0 }; });
    regsEsteMes.forEach(r => { if (porAtividade[r.atividade_id]) porAtividade[r.atividade_id].qtd++; });
    const pendencias = Object.values(porAtividade).filter(a => a.qtd < 2).sort((a,b) => a.qtd - b.qtd);
    document.getElementById('listaPendencias').innerHTML = pendencias.length === 0
        ? '<p style="color:#4caf50;font-size:13px">✅ Todas as atividades estão em dia!</p>'
        : pendencias.map(a => `<div class="pendencia-item">
            <span>${a.nome}</span>
            <span style="color:${a.qtd === 0 ? '#c62828' : '#e65100'};font-weight:600">${a.qtd} registro(s) este mês</span>
        </div>`).join('');
    const ultimos = [...registros].sort((a,b) => b.data.localeCompare(a.data)).slice(0, 8);
    document.getElementById('ultimosRegistros').innerHTML = ultimos.length === 0
        ? '<p style="color:#999;font-size:13px">Nenhum registro ainda.</p>'
        : ultimos.map(r => {
            const at = atividades.find(a => a.id === r.atividade_id);
            const [ano, mes, dia] = r.data.split('-');
            return `<div class="historico-item">
                <span><b>${dia}/${mes}</b> — ${at ? at.nome : '?'}</span>
                <span class="historico-responsavel">${r.responsavel || '—'}</span>
            </div>`;
        }).join('');
}

// =============================================
// USUÁRIOS
// =============================================
function renderizarUsuarios() {
    const container = document.getElementById('tabelaUsuarios');
    if (usuarios.length === 0) { container.innerHTML = '<p style="color:#999;text-align:center;padding:20px">Nenhum usuário.</p>'; return; }
    container.innerHTML = `
        <table class="tabela-usuarios">
            <thead><tr><th>Nome</th><th>Email</th><th>Perfil</th><th>Cadastrado em</th><th>Ações</th></tr></thead>
            <tbody>${usuarios.map(u => {
                const data = new Date(u.criado_em).toLocaleDateString('pt-BR');
                return `<tr>
                    <td>${u.nome}</td><td>${u.email}</td>
                    <td><span class="badge-perfil badge-${u.perfil}">${u.perfil === 'admin' ? '👑 Admin' : '👤 Usuário'}</span></td>
                    <td>${data}</td>
                    <td>${u.perfil !== 'admin' ? `<button class="btn-editar" onclick="promoverAdmin('${u.id}')">👑 Tornar Admin</button>` : ''}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
}

async function promoverAdmin(id) {
    if (!confirm('Tornar este usuário administrador?')) return;
    try {
        await db.atualizar('usuarios', id, { perfil: 'admin' });
        const idx = usuarios.findIndex(u => u.id === id);
        if (idx !== -1) usuarios[idx].perfil = 'admin';
        renderizarUsuarios();
        mostrarToast('✅ Usuário promovido a administrador!');
    } catch(e) { mostrarToast('Erro ao promover usuário', true); }
}

// =============================================
// ADMINISTRAÇÃO
// =============================================
function mostrarModalSenha() {
    document.getElementById('modalSenha').classList.remove('hidden');
    setTimeout(() => document.getElementById('inputSenhaAdmin').focus(), 100);
}

function fecharModal() {
    document.getElementById('modalSenha').classList.add('hidden');
    document.getElementById('inputSenhaAdmin').value = '';
    mostrarTela('inicio');
}

function verificarSenha() {
    const senha = document.getElementById('inputSenhaAdmin').value;
    if (senha === SENHA_ADMIN) {
        adminLiberado = true;
        document.getElementById('modalSenha').classList.add('hidden');
        document.getElementById('inputSenhaAdmin').value = '';
        document.getElementById('menuAdmin').classList.remove('hidden');
        mostrarTela('admin');
        renderizarAdmin();
    } else {
        mostrarToast('Senha incorreta', true);
        document.getElementById('inputSenhaAdmin').value = '';
    }
}

document.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !document.getElementById('modalSenha').classList.contains('hidden')) verificarSenha();
});

function renderizarAdmin() {
    document.getElementById('listaCategorias').innerHTML = categorias.length === 0
        ? '<div style="color:#999;font-size:13px">Nenhuma categoria</div>'
        : categorias.map(c => `<div class="admin-item"><span>${c.icone} ${c.nome}</span><button class="btn-excluir" onclick="excluirCategoria('${c.id}')">🗑️</button></div>`).join('');
    document.getElementById('listaAtividadesAdmin').innerHTML = atividades.length === 0
        ? '<div style="color:#999;font-size:13px">Nenhuma atividade</div>'
        : atividades.map(a => {
            const cat = categorias.find(c => c.id === a.categoria_id);
            return `<div class="admin-item"><span>${cat ? cat.icone : ''} ${a.nome}</span><button class="btn-excluir" onclick="excluirAtividade('${a.id}')">🗑️</button></div>`;
        }).join('');
    const selCat = document.getElementById('categoriaNovaAtividade');
    selCat.innerHTML = '<option value="">Selecione a categoria</option>' +
        categorias.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('');
    const selAt = document.getElementById('atividadeChecklist');
    selAt.innerHTML = '<option value="">Selecione a atividade</option>' +
        atividades.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    const selCT = document.getElementById('atividadeCamposTexto');
    selCT.innerHTML = '<option value="">Selecione a atividade</option>' +
        atividades.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
}

async function adicionarCategoria() {
    const icone = document.getElementById('novoIconeCategoria').value.trim();
    const nome = document.getElementById('novoNomeCategoria').value.trim();
    if (!nome) { mostrarToast('Preencha o nome', true); return; }
    let imagemBase64 = null;
    const arquivoImagem = document.getElementById('novaImagemCategoria').files[0];
    if (arquivoImagem) {
        imagemBase64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.readAsDataURL(arquivoImagem);
        });
    }
    try {
        const nova = await db.inserir('categorias', { nome, icone, imagem: imagemBase64 || null });
        categorias.push(nova);
        document.getElementById('novoIconeCategoria').value = '';
        document.getElementById('novoNomeCategoria').value = '';
        renderizarAdmin(); renderizarMenuCategorias(); renderizarCalendarioGeral();
        mostrarToast(`✅ Categoria "${nome}" adicionada!`);
    } catch(e) { mostrarToast('Erro ao adicionar categoria', true); }
}

async function excluirCategoria(id) {
    if (!confirm('Excluir esta categoria?')) return;
    try {
        await db.deletar('categorias', id);
        categorias = categorias.filter(c => c.id !== id);
        atividades = atividades.filter(a => a.categoria_id !== id);
        renderizarAdmin(); renderizarMenuCategorias(); renderizarCalendarioGeral();
        mostrarToast('Categoria excluída');
    } catch(e) { mostrarToast('Erro ao excluir', true); }
}

async function adicionarAtividade() {
    const categoriaId = document.getElementById('categoriaNovaAtividade').value;
    const nome = document.getElementById('novoNomeAtividade').value.trim();
    const frequencia = document.getElementById('novaFrequencia').value.trim();
    const usaColmeias = document.getElementById('novaUsaColmeias').checked;
    const usaChecklist = document.getElementById('novaUsaChecklist').checked;
    if (!categoriaId) { mostrarToast('Selecione a categoria', true); return; }
    if (!nome) { mostrarToast('Preencha o nome', true); return; }
    try {
        const nova = await db.inserir('atividades', { categoria_id: categoriaId, nome, frequencia, usa_colmeias: usaColmeias, usa_checklist: usaChecklist });
        atividades.push(nova);
        document.getElementById('novoNomeAtividade').value = '';
        document.getElementById('novaFrequencia').value = '';
        renderizarAdmin(); renderizarCalendarioGeral();
        mostrarToast(`✅ Atividade "${nome}" adicionada!`);
    } catch(e) { mostrarToast('Erro ao adicionar atividade', true); }
}

async function excluirAtividade(id) {
    if (!confirm('Excluir esta atividade?')) return;
    try {
        await db.deletar('atividades', id);
        atividades = atividades.filter(a => a.id !== id);
        checklistItens = checklistItens.filter(i => i.atividade_id !== id);
        registros = registros.filter(r => r.atividade_id !== id);
        renderizarAdmin(); renderizarCalendarioGeral();
        mostrarToast('Atividade excluída');
    } catch(e) { mostrarToast('Erro ao excluir', true); }
}

function carregarChecklistAdmin() {
    const atividadeId = document.getElementById('atividadeChecklist').value;
    const container = document.getElementById('listaChecklistAdmin');
    if (!atividadeId) { container.innerHTML = ''; return; }
    const itens = checklistItens.filter(i => i.atividade_id === atividadeId);
    container.innerHTML = itens.length === 0
        ? '<div style="color:#999;font-size:13px">Nenhum item</div>'
        : itens.map(item => `<div class="admin-item"><span>${item.descricao}</span><button class="btn-excluir" onclick="excluirItemChecklist('${item.id}')">🗑️</button></div>`).join('');
}

async function adicionarItemChecklist() {
    const atividadeId = document.getElementById('atividadeChecklist').value;
    const descricao = document.getElementById('novoItemChecklist').value.trim();
    if (!atividadeId) { mostrarToast('Selecione a atividade', true); return; }
    if (!descricao) { mostrarToast('Preencha a descrição', true); return; }
    try {
        const novo = await db.inserir('checklist_itens', { atividade_id: atividadeId, descricao });
        checklistItens.push(novo);
        document.getElementById('novoItemChecklist').value = '';
        carregarChecklistAdmin();
        mostrarToast(`✅ Item adicionado!`);
    } catch(e) { mostrarToast('Erro ao adicionar item', true); }
}

async function excluirItemChecklist(id) {
    if (!confirm('Excluir este item?')) return;
    try {
        await db.deletar('checklist_itens', id);
        checklistItens = checklistItens.filter(i => i.id !== id);
        carregarChecklistAdmin();
        mostrarToast('Item excluído');
    } catch(e) { mostrarToast('Erro ao excluir item', true); }
}

// =============================================
// UTILITÁRIOS
// =============================================
function mostrarToast(msg, erro = false) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast' + (erro ? ' erro' : '');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

function popularSelects() { carregarRelatorios(); }

// =============================================
// CAMPOS DE TEXTO LIVRE
// =============================================
function carregarCamposTextoAdmin() {
    const atividadeId = document.getElementById('atividadeCamposTexto').value;
    const container = document.getElementById('listaCamposTextoAdmin');
    if (!atividadeId) { container.innerHTML = ''; return; }
    const campos = camposTexto.filter(c => c.atividade_id === atividadeId);
    container.innerHTML = campos.length === 0
        ? '<div style="color:#999;font-size:13px">Nenhum campo</div>'
        : campos.map(c => `<div class="admin-item"><span>${c.label}</span><button class="btn-excluir" onclick="excluirCampoTexto('${c.id}')">🗑️</button></div>`).join('');
}

async function adicionarCampoTexto() {
    const atividadeId = document.getElementById('atividadeCamposTexto').value;
    const label = document.getElementById('novoLabelCampoTexto').value.trim();
    if (!atividadeId) { mostrarToast('Selecione a atividade', true); return; }
    if (!label) { mostrarToast('Preencha o nome do campo', true); return; }
    try {
        const novo = await db.inserir('campos_texto', { atividade_id: atividadeId, label });
        camposTexto.push(novo);
        document.getElementById('novoLabelCampoTexto').value = '';
        carregarCamposTextoAdmin();
        mostrarToast('✅ Campo adicionado!');
    } catch(e) { mostrarToast('Erro ao adicionar campo', true); }
}

async function excluirCampoTexto(id) {
    if (!confirm('Excluir este campo?')) return;
    try {
        await db.deletar('campos_texto', id);
        camposTexto = camposTexto.filter(c => c.id !== id);
        carregarCamposTextoAdmin();
        mostrarToast('Campo excluído');
    } catch(e) { mostrarToast('Erro ao excluir campo', true); }
}
// =============================================
// RELATÓRIO DE AÇÕES
// =============================================
function gerarRelatorioAcoes() {
    const de  = document.getElementById('filtroAcoesDE').value;
    const ate = document.getElementById('filtroAcoesATE').value;

    let vstFiltradas = vistorias.filter(v => {
        const colmeia = colmeias.find(c => c.id === v.colmeia_id);
        if (!colmeia || colmeia.status === 'inativa') return false;
        if (de  && v.data < de)  return false;
        if (ate && v.data > ate) return false;
        return true;
    });

    const porAcao = {};
    ACOES.forEach(a => { porAcao[a.sigla] = { descricao: a.descricao, colmeias: [] }; });

    vstFiltradas.forEach(v => {
        const colmeia = colmeias.find(c => c.id === v.colmeia_id);
        if (!colmeia) return;
        const acoesDaVistoria = v.acoes ? JSON.parse(v.acoes) : [];
        acoesDaVistoria.forEach(sigla => {
            if (porAcao[sigla]) {
                if (!porAcao[sigla].colmeias.find(c => c.id === colmeia.id)) {
                    porAcao[sigla].colmeias.push(colmeia);
                }
            }
        });
    });

    const acoesComDados = ACOES.filter(a => porAcao[a.sigla].colmeias.length > 0);
    const container = document.getElementById('resultadoAcoes');

    if (acoesComDados.length === 0) {
        container.innerHTML = `<div class="card" style="text-align:center;color:#999;padding:40px">
            Nenhuma ação encontrada no período informado.
        </div>`;
        return;
    }

    const periodoTexto = de && ate
        ? `${de.split('-').reverse().join('/')} até ${ate.split('-').reverse().join('/')}`
        : de ? `A partir de ${de.split('-').reverse().join('/')}`
        : ate ? `Até ${ate.split('-').reverse().join('/')}`
        : 'Todos os períodos';

    container.innerHTML = `
        <div class="card" id="conteudoImpressaoAcoes">
            <div style="margin-bottom:20px">
                <h2 style="color:var(--verde-escuro);font-size:18px">Relatório de Ações — Colmeias</h2>
                <p style="font-size:13px;color:#888;margin-top:4px">Período: ${periodoTexto}</p>
            </div>
            ${acoesComDados.map(a => `
                <div class="acao-relatorio-item">
                    <div class="acao-relatorio-titulo">
                        <span class="acao-sigla">${a.sigla}</span>
                        <span class="acao-nome">${a.descricao}</span>
                        <span class="acao-count">${porAcao[a.sigla].colmeias.length} colmeia(s)</span>
                    </div>
                    <div class="acao-colmeias-lista">
                        ${porAcao[a.sigla].colmeias.map(c => `
                            <span class="tag-colmeia">
                                ${c.codigo}${c.nome_popular ? ` — ${c.nome_popular}` : ''}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>`;
}

function imprimirRelatorioAcoes() {
    const conteudo = document.getElementById('conteudoImpressaoAcoes');
    if (!conteudo) { mostrarToast('Gere o relatório primeiro', true); return; }

    const janela = window.open('', '_blank');
    janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <title>Relatório de Ações — Chácara Alternativa</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #222; }
                h2 { color: #1b5e20; margin-bottom: 4px; }
                p { font-size: 13px; color: #666; margin-bottom: 24px; }
                .acao-relatorio-item { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; overflow: hidden; }
                .acao-relatorio-titulo { display: flex; align-items: center; gap: 12px; background: #e8f5e9; padding: 10px 16px; }
                .acao-sigla { background: #1b5e20; color: white; padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
                .acao-nome { font-weight: 600; font-size: 14px; flex: 1; }
                .acao-count { font-size: 12px; color: #555; }
                .acao-colmeias-lista { padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 8px; }
                .tag-colmeia { background: #f1f8e9; border: 1px solid #c5e1a5; padding: 4px 12px; border-radius: 20px; font-size: 13px; }
                @media print { body { padding: 16px; } }
            </style>
        </head>
        <body>${conteudo.innerHTML}</body>
        </html>
    `);
    janela.document.close();
    janela.print();
}
function abrirVistoriaRapida(colmeiaId) {
    abrirDetalheColmeia(colmeiaId);
    setTimeout(() => abrirFormVistoria(colmeiaId), 300);
}
function abrirModalNovaVistoria() {
    const ativas = colmeias.filter(c => (c.status || 'ativa') === 'ativa');
    if (ativas.length === 0) { mostrarToast('Nenhuma colmeia ativa cadastrada', true); return; }
    const sel = document.getElementById('selectColmeiaVistoria');
    sel.value = '';
    const datalist = document.getElementById('listaColmeias');
    if (datalist) datalist.innerHTML = ativas.map(c => `<option value="${c.codigo}">${c.codigo} — ${c.nome_popular || c.especie || ''}</option>`).join('');
    document.getElementById('modalNovaVistoria').classList.remove('hidden');
}

function fecharModalNovaVistoria() {
    document.getElementById('modalNovaVistoria').classList.add('hidden');
    document.getElementById('selectColmeiaVistoria').value = '';
}

function confirmarNovaVistoria() {
    const inputVal = document.getElementById('selectColmeiaVistoria').value.trim();
    const colmeiaEncontrada = colmeias.find(c => c.codigo.toLowerCase() === inputVal.toLowerCase());
    const colmeiaId = colmeiaEncontrada ? colmeiaEncontrada.id : null;
    if (!colmeiaId) { mostrarToast('Colmeia não encontrada', true); return; }
    fecharModalNovaVistoria();
    mostrarTela('colmeias');
    setTimeout(() => {
        abrirDetalheColmeia(colmeiaId);
        setTimeout(() => abrirFormVistoria(colmeiaId), 400);
    }, 300);
}