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
let setores = [];           // NOVO
let usuarioLogado = null;
let adminLiberado = false;
let categoriaAtual = null;
let atividadeAtual = null;
let setorAtual = null;      // NOVO — setor selecionado na tela de categoria
let colmeiaAtual = null;
let mesAtual = new Date().getMonth();
let anoAtual = new Date().getFullYear();
let diaSelecionado = null;

// Estoque
let estoqueItens = [];
let estoqueMovimentacoes = [];
let categoriaSelecionadaEstoque = null;
let setorSelecionadoEstoque = null;  // NOVO

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

// Labels dos status de colmeia
const STATUS_COLMEIA = {
    boa:     'Boa',
    atencao: 'Atenção',
    critica: 'Crítica'
};

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
        setores        = await db.get('setores');          // NOVO
        estoqueItens          = await db.get('estoque_itens');
        estoqueMovimentacoes  = await db.get('estoque_movimentacoes');

        renderizarMenuCategorias();
        renderizarCalendarioGeral();
        renderizarResumoGeral();
        popularSelects();
        renderizarAlertaEstoque();
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
    if (nome === 'relatorios') {
        carregarRelatorios();
        setTimeout(() => {
            const hoje = new Date();
            const trinta = new Date();
            trinta.setDate(hoje.getDate() - 30);
            document.getElementById('filtroDe').value = trinta.toISOString().split('T')[0];
            document.getElementById('filtroAte').value = hoje.toISOString().split('T')[0];
            gerarRelatorio();
        }, 100);
    }
    if (nome === 'colmeias') renderizarColmeias();
    if (nome === 'acoes') {
        setTimeout(() => {
            const hoje = new Date();
            const trinta = new Date();
            trinta.setDate(hoje.getDate() - 30);
            document.getElementById('filtroAcoesDE').value = trinta.toISOString().split('T')[0];
            document.getElementById('filtroAcoesATE').value = hoje.toISOString().split('T')[0];
            gerarRelatorioAcoes();
        }, 100);
    }
    if (nome === 'usuarios') renderizarUsuarios();
    if (nome === 'estoque') {
        carregarEstoque().then(() => {
            renderizarAbasEstoque();
            renderizarTabelaEstoque();
        });
    }
    if (nome === 'inicio') { renderizarCalendarioGeral(); renderizarResumoGeral(); }
}

// =============================================
// CATEGORIA — COM SUPORTE A SETORES
// =============================================
function abrirCategoria(categoriaId) {
    categoriaAtual = categorias.find(c => c.id === categoriaId);
    if (!categoriaAtual) return;

    // Reseta setor selecionado
    setorAtual = null;

    document.getElementById('tituloCategoriaAtual').textContent =
        `${categoriaAtual.icone || ''} ${categoriaAtual.nome}`;

    const setoresDaCategoria = setores
        .filter(s => s.categoria_id === categoriaId)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    const containerAbas = document.getElementById('containerAbasSetor');
    const abasEl = document.getElementById('abasSetor');

    if (setoresDaCategoria.length > 0) {
        // Seleciona o primeiro setor por padrão
        setorAtual = setoresDaCategoria[0];
        containerAbas.classList.remove('hidden');
        abasEl.innerHTML = setoresDaCategoria.map(s => `
            <button class="aba-setor ${s.id === setorAtual.id ? 'ativa' : ''}"
                onclick="selecionarSetorCategoria('${s.id}')">
                ${s.icone || ''} ${s.nome}
            </button>
        `).join('');
    } else {
        containerAbas.classList.add('hidden');
        abasEl.innerHTML = '';
    }

    renderizarAtividadesCategoria();
    mostrarTela('categoria');
}

function selecionarSetorCategoria(setorId) {
    setorAtual = setores.find(s => s.id === setorId);
    // Atualiza abas
    document.querySelectorAll('#abasSetor .aba-setor').forEach(btn => {
        btn.classList.toggle('ativa', btn.onclick.toString().includes(setorId));
    });
    // Rerender abas com classe correta
    const setoresDaCategoria = setores
        .filter(s => s.categoria_id === categoriaAtual.id)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    document.getElementById('abasSetor').innerHTML = setoresDaCategoria.map(s => `
        <button class="aba-setor ${s.id === setorId ? 'ativa' : ''}"
            onclick="selecionarSetorCategoria('${s.id}')">
            ${s.icone || ''} ${s.nome}
        </button>
    `).join('');
    renderizarAtividadesCategoria();
}

function renderizarAtividadesCategoria() {
    if (!categoriaAtual) return;
    const container = document.getElementById('listaAtividades');
    const hoje = new Date();

    // Filtra atividades: se tem setores e setor selecionado, filtra por setor_id
    // Se a categoria não tem setores, mostra todas da categoria
    const setoresDaCategoria = setores.filter(s => s.categoria_id === categoriaAtual.id);
    let ativsCategoria;

    if (setoresDaCategoria.length > 0 && setorAtual) {
        // Mostra atividades do setor selecionado
        ativsCategoria = atividades.filter(a =>
            a.categoria_id === categoriaAtual.id && a.setor_id === setorAtual.id
        );
    } else {
        // Categoria sem setores: mostra todas
        ativsCategoria = atividades.filter(a => a.categoria_id === categoriaAtual.id);
    }

    if (ativsCategoria.length === 0) {
        const msg = setorAtual
            ? `Nenhuma atividade cadastrada para o setor <b>${setorAtual.nome}</b>.`
            : 'Nenhuma atividade cadastrada.';
        container.innerHTML = `<div class="card" style="grid-column:1/-1;text-align:center;color:#999;padding:40px">${msg}</div>`;
        return;
    }

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
// CALENDÁRIO GERAL — COM SUB-LINHAS DE SETOR
// =============================================
function renderizarCalendarioGeral() {
    const corpo = document.getElementById('corpoCalendario');
    if (!corpo) return;
    if (categorias.length === 0) {
        corpo.innerHTML = `<tr><td colspan="13" class="loading"><span class="spinner"></span> Carregando...</td></tr>`;
        return;
    }

    let html = '';

    categorias.forEach(cat => {
        const setoresDaCategoria = setores
            .filter(s => s.categoria_id === cat.id)
            .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

        if (setoresDaCategoria.length > 0) {
            // Linha de cabeçalho da categoria (não clicável, só título)
            html += `<tr class="linha-categoria-pai">
                <td colspan="13" style="background:var(--verde-suave);font-weight:700;color:var(--verde-escuro);padding-left:14px">
                    ${cat.icone || ''} ${cat.nome}
                </td>
            </tr>`;

            // Uma linha por setor
            setoresDaCategoria.forEach(setor => {
                const temAtividade = atividades.some(
                    a => a.categoria_id === cat.id && a.setor_id === setor.id
                );
                const mesesHTML = Array.from({length: 12}, () =>
                    `<td style="color:${temAtividade ? '#4caf50' : '#ccc'}">${temAtividade ? '✕' : '○'}</td>`
                ).join('');
                html += `<tr class="linha-setor" onclick="abrirCategoriaSetor('${cat.id}','${setor.id}')">
                    <td class="celula-setor">${setor.icone || '—'} ${setor.nome}</td>
                    ${mesesHTML}
                </tr>`;
            });

        } else {
            // Categoria sem setores — comportamento original
            const temAtividade = atividades.some(a => a.categoria_id === cat.id);
            const mesesHTML = Array.from({length: 12}, () =>
                `<td style="color:${temAtividade ? '#4caf50' : '#ccc'}">${temAtividade ? '✕' : '○'}</td>`
            ).join('');
            html += `<tr class="linha-categoria" onclick="abrirCategoria('${cat.id}')">
                <td>${cat.icone || ''} ${cat.nome}</td>${mesesHTML}
            </tr>`;
        }
    });

    corpo.innerHTML = html;
}

// Abre categoria já no setor correto
function abrirCategoriaSetor(categoriaId, setorId) {
    abrirCategoria(categoriaId);
    // Seleciona o setor após renderizar
    setTimeout(() => selecionarSetorCategoria(setorId), 50);
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
        // Apaga primeiro os dados dependentes (checklist e campos de texto),
        // já que o banco bloqueia a exclusão do registro pai enquanto eles existirem (erro 409/FK)
        const respsChecklist = await db.query('checklist_respostas', `registro_id=eq.${registroId}`);
        for (const r of respsChecklist) {
            await db.deletar('checklist_respostas', r.id);
        }
        const respsCampos = await db.query('campos_texto_respostas', `registro_id=eq.${registroId}`);
        for (const r of respsCampos) {
            await db.deletar('campos_texto_respostas', r.id);
        }

        await db.deletar('registros', registroId);
        registros = registros.filter(r => r.id !== registroId);
        diaSelecionado = null;
        renderizarMiniCalendario(); renderizarHistorico(); renderizarResumoGeral();
        document.getElementById('colunaFormulario').innerHTML = `
            <div class="card placeholder-formulario"><p>👆 Clique em um dia no calendário para registrar a atividade</p></div>`;
        mostrarToast('Registro excluído');
    } catch(e) { mostrarToast('Erro ao excluir registro', true); console.error(e); }
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
    // Ordena alfabeticamente por código
    const dados = (lista || colmeias).slice().sort((a, b) =>
        (a.codigo || '').localeCompare(b.codigo || '', 'pt-BR', { sensitivity: 'base' })
    );
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
                const status = c.status || 'boa';
                const label = STATUS_COLMEIA[status] || status;
                return `<tr>
                    <td><b>${c.codigo}</b></td>
                    <td><span class="badge-status badge-${status}">${label}</span></td>
                    <td>${c.nome_popular || '—'}</td>
                    <td>${c.especie || '—'}</td>
                    <td>${c.localizacao || '—'}</td>
                    <td>${c.origem || '—'}</td>
                    <td>${vstColmeia.length} vistoria(s)</td>
                    <td>
                        <button class="btn-editar" onclick="abrirDetalheColmeia('${c.id}')">🔍 Ver</button>
                        <button class="btn-editar" onclick="abrirVistoriaRapida('${c.id}')">📋 Vistoria</button>
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
    if (status) filtradas = filtradas.filter(c => (c.status || 'boa') === status);
    renderizarColmeias(filtradas);
}

function abrirFormColmeia() {
    document.getElementById('tituloFormColmeia').textContent = 'Nova Colmeia';
    document.getElementById('colmeiaEditandoId').value = '';
    document.getElementById('colmeiaCodigo').value = '';
    document.getElementById('colmeiaNomePopular').value = '';
    document.getElementById('colmeiaEspecie').value = '';
    document.getElementById('colmeiaLocalizacao').value = '';
    document.getElementById('colmeiaStatus').value = 'boa';
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
    document.getElementById('colmeiaStatus').value = c.status || 'boa';
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

    const statusAtual = colmeiaAtual.status || 'boa';
    const statusLabel = STATUS_COLMEIA[statusAtual] || statusAtual;

    detalhe.innerHTML = `
        <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <h3>🐝 ${colmeiaAtual.codigo} — ${colmeiaAtual.nome_popular || colmeiaAtual.especie || ''}</h3>
                <button onclick="document.getElementById('detalheColmeia').classList.add('hidden')">✕ Fechar</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:16px;font-size:13px">
                <div><b>Espécie:</b> ${colmeiaAtual.especie || '—'}</div>
                <div><b>Localização:</b> ${colmeiaAtual.localizacao || '—'}</div>
                <div><b>Status:</b> <span class="badge-status badge-${statusAtual}">${statusLabel}</span></div>
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
            await registrarSaidaEstoqueVistoria(nova.id, colmeiaId, acoesSelecionadas, dados.observacoes || '');
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
    // Categorias
    document.getElementById('listaCategorias').innerHTML = categorias.length === 0
        ? '<div style="color:#999;font-size:13px">Nenhuma categoria</div>'
        : categorias.map(c => `<div class="admin-item"><span>${c.icone || ''} ${c.nome}</span><span><button class="btn-editar" onclick="editarCategoria('${c.id}')">✏️</button><button class="btn-excluir" onclick="excluirCategoria('${c.id}')">🗑️</button></span></div>`).join('');

    // Atividades
    document.getElementById('listaAtividadesAdmin').innerHTML = atividades.length === 0
        ? '<div style="color:#999;font-size:13px">Nenhuma atividade</div>'
        : atividades.map(a => {
            const cat = categorias.find(c => c.id === a.categoria_id);
            const setor = setores.find(s => s.id === a.setor_id);
            const label = setor ? `${cat?.icone || ''} ${cat?.nome} › ${setor.icone || ''} ${setor.nome} — ${a.nome}`
                                : `${cat?.icone || ''} ${cat?.nome || '?'} — ${a.nome}`;
            return `<div class="admin-item"><span>${label}</span><span><button class="btn-editar" onclick="editarAtividade('${a.id}')">✏️</button><button class="btn-excluir" onclick="excluirAtividade('${a.id}')">🗑️</button></span></div>`;
        }).join('');

    // Selects de categoria
    const optsCat = '<option value="">Selecione a categoria</option>' +
        categorias.map(c => `<option value="${c.id}">${c.icone || ''} ${c.nome}</option>`).join('');
    document.getElementById('categoriaNovaAtividade').innerHTML = optsCat;
    document.getElementById('filtroCategoriaStor').innerHTML = optsCat;

    // Selects de atividade
    const optsAt = '<option value="">Selecione a atividade</option>' +
        atividades.map(a => `<option value="${a.id}">${a.nome}</option>`).join('');
    document.getElementById('atividadeChecklist').innerHTML = optsAt;
    document.getElementById('atividadeCamposTexto').innerHTML = optsAt;

    // Setores admin
    carregarSetoresAdmin();
}

// =============================================
// SETORES — ADMIN (com edição)
// =============================================
function carregarSetoresAdmin() {
    const categoriaId = document.getElementById('filtroCategoriaStor').value;
    const container = document.getElementById('listaSetoresAdmin');
    if (!categoriaId) { container.innerHTML = '<div style="color:#999;font-size:13px">Selecione uma categoria</div>'; return; }
    const setoresDaCategoria = setores
        .filter(s => s.categoria_id === categoriaId)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    container.innerHTML = setoresDaCategoria.length === 0
        ? '<div style="color:#999;font-size:13px">Nenhum setor nesta categoria</div>'
        : setoresDaCategoria.map(s => `
            <div class="admin-item">
                <span>${s.icone || ''} ${s.nome}</span>
                <span><button class="btn-editar" onclick="editarSetor('${s.id}')">✏️</button><button class="btn-excluir" onclick="excluirSetor('${s.id}')">🗑️</button></span>
            </div>`).join('');
}

function editarSetor(id) {
    const setor = setores.find(s => s.id === id);
    if (!setor) return;
    document.getElementById('setorEditandoId').value = setor.id;
    document.getElementById('novoIconeSetor').value = setor.icone || '';
    document.getElementById('novoNomeSetor').value = setor.nome || '';
    document.getElementById('tituloFormSetor').textContent = 'Editar Setor';
    document.getElementById('btnSalvarSetor').textContent = '💾 Salvar';
    document.getElementById('btnCancelarSetor').classList.remove('hidden');
}

function cancelarEdicaoSetor() {
    document.getElementById('setorEditandoId').value = '';
    document.getElementById('novoIconeSetor').value = '';
    document.getElementById('novoNomeSetor').value = '';
    document.getElementById('tituloFormSetor').textContent = 'Novo Setor';
    document.getElementById('btnSalvarSetor').textContent = '➕ Adicionar';
    document.getElementById('btnCancelarSetor').classList.add('hidden');
}

async function adicionarSetor() {
    const editandoId = document.getElementById('setorEditandoId').value;
    const categoriaId = document.getElementById('filtroCategoriaStor').value;
    const icone = document.getElementById('novoIconeSetor').value.trim();
    const nome  = document.getElementById('novoNomeSetor').value.trim();
    if (!categoriaId) { mostrarToast('Selecione a categoria', true); return; }
    if (!nome) { mostrarToast('Preencha o nome do setor', true); return; }
    try {
        if (editandoId) {
            await db.atualizar('setores', editandoId, { nome, icone });
            const idx = setores.findIndex(s => s.id === editandoId);
            if (idx !== -1) { setores[idx].nome = nome; setores[idx].icone = icone; }
            mostrarToast(`✅ Setor "${nome}" atualizado!`);
        } else {
            const ordemAtual = setores.filter(s => s.categoria_id === categoriaId).length;
            const novo = await db.inserir('setores', { categoria_id: categoriaId, nome, icone, ordem: ordemAtual });
            setores.push(novo);
            mostrarToast(`✅ Setor "${nome}" adicionado!`);
        }
        cancelarEdicaoSetor();
        carregarSetoresAdmin();
        atualizarSetoresNovaAtividade();
        renderizarCalendarioGeral();
    } catch(e) { mostrarToast('Erro ao salvar setor', true); console.error(e); }
}

async function excluirSetor(id) {
    const setor = setores.find(s => s.id === id);
    const atvsVinculadas = atividades.filter(a => a.setor_id === id).length;
    if (atvsVinculadas > 0) {
        mostrarToast(`Não é possível excluir: ${atvsVinculadas} atividade(s) vinculada(s) a este setor`, true);
        return;
    }
    if (!confirm(`Excluir setor "${setor?.nome}"?`)) return;
    try {
        await db.deletar('setores', id);
        setores = setores.filter(s => s.id !== id);
        if (document.getElementById('setorEditandoId').value === id) cancelarEdicaoSetor();
        carregarSetoresAdmin();
        atualizarSetoresNovaAtividade();
        renderizarCalendarioGeral();
        mostrarToast('Setor excluído');
    } catch(e) { mostrarToast('Erro ao excluir setor', true); }
}

// Atualiza o select de setor ao cadastrar nova atividade
function atualizarSetoresNovaAtividade() {
    const categoriaId = document.getElementById('categoriaNovaAtividade').value;
    const selSetor = document.getElementById('setorNovaAtividade');
    if (!categoriaId) { selSetor.classList.add('hidden'); return; }
    const setoresDaCategoria = setores.filter(s => s.categoria_id === categoriaId);
    if (setoresDaCategoria.length === 0) {
        selSetor.classList.add('hidden');
        return;
    }
    selSetor.classList.remove('hidden');
    selSetor.innerHTML = '<option value="">Sem setor (geral)</option>' +
        setoresDaCategoria
            .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
            .map(s => `<option value="${s.id}">${s.icone || ''} ${s.nome}</option>`).join('');
}

// =============================================
// CATEGORIAS — ADMIN (com edição)
// =============================================
function editarCategoria(id) {
    const cat = categorias.find(c => c.id === id);
    if (!cat) return;
    document.getElementById('categoriaEditandoId').value = cat.id;
    document.getElementById('novoIconeCategoria').value = cat.icone || '';
    document.getElementById('novoNomeCategoria').value = cat.nome || '';
    document.getElementById('tituloFormCategoria').textContent = 'Editar Categoria';
    document.getElementById('btnSalvarCategoria').textContent = '💾 Salvar';
    document.getElementById('btnCancelarCategoria').classList.remove('hidden');
    document.getElementById('listaCategorias').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelarEdicaoCategoria() {
    document.getElementById('categoriaEditandoId').value = '';
    document.getElementById('novoIconeCategoria').value = '';
    document.getElementById('novoNomeCategoria').value = '';
    document.getElementById('novaImagemCategoria').value = '';
    document.getElementById('tituloFormCategoria').textContent = 'Nova Categoria';
    document.getElementById('btnSalvarCategoria').textContent = '➕ Adicionar';
    document.getElementById('btnCancelarCategoria').classList.add('hidden');
}

async function adicionarCategoria() {
    const editandoId = document.getElementById('categoriaEditandoId').value;
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
        if (editandoId) {
            const dados = { nome, icone };
            if (imagemBase64) dados.imagem = imagemBase64;
            await db.atualizar('categorias', editandoId, dados);
            const idx = categorias.findIndex(c => c.id === editandoId);
            if (idx !== -1) categorias[idx] = { ...categorias[idx], ...dados };
            mostrarToast(`✅ Categoria "${nome}" atualizada!`);
        } else {
            const nova = await db.inserir('categorias', { nome, icone, imagem: imagemBase64 || null });
            categorias.push(nova);
            mostrarToast(`✅ Categoria "${nome}" adicionada!`);
        }
        cancelarEdicaoCategoria();
        renderizarAdmin(); renderizarMenuCategorias(); renderizarCalendarioGeral();
    } catch(e) { mostrarToast('Erro ao salvar categoria', true); console.error(e); }
}

async function excluirCategoria(id) {
    if (!confirm('Excluir esta categoria e todos seus setores e atividades?')) return;
    try {
        await db.deletar('categorias', id);
        categorias = categorias.filter(c => c.id !== id);
        atividades = atividades.filter(a => a.categoria_id !== id);
        setores    = setores.filter(s => s.categoria_id !== id);
        if (document.getElementById('categoriaEditandoId').value === id) cancelarEdicaoCategoria();
        renderizarAdmin(); renderizarMenuCategorias(); renderizarCalendarioGeral();
        mostrarToast('Categoria excluída');
    } catch(e) { mostrarToast('Erro ao excluir', true); }
}

function editarAtividade(id) {
    const a = atividades.find(x => x.id === id);
    if (!a) return;
    document.getElementById('atividadeEditandoId').value = a.id;
    document.getElementById('categoriaNovaAtividade').value = a.categoria_id || '';
    atualizarSetoresNovaAtividade();
    document.getElementById('setorNovaAtividade').value = a.setor_id || '';
    document.getElementById('novoNomeAtividade').value = a.nome || '';
    document.getElementById('novaFrequencia').value = a.frequencia || '';
    document.getElementById('novaUsaColmeias').checked = !!a.usa_colmeias;
    document.getElementById('novaUsaChecklist').checked = !!a.usa_checklist;
    document.getElementById('tituloFormAtividade').textContent = 'Editar Atividade';
    document.getElementById('btnSalvarAtividade').textContent = '💾 Salvar';
    document.getElementById('btnCancelarAtividade').classList.remove('hidden');
    document.getElementById('listaAtividadesAdmin').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function cancelarEdicaoAtividade() {
    document.getElementById('atividadeEditandoId').value = '';
    document.getElementById('categoriaNovaAtividade').value = '';
    document.getElementById('setorNovaAtividade').classList.add('hidden');
    document.getElementById('novoNomeAtividade').value = '';
    document.getElementById('novaFrequencia').value = '';
    document.getElementById('novaUsaColmeias').checked = false;
    document.getElementById('novaUsaChecklist').checked = true;
    document.getElementById('tituloFormAtividade').textContent = 'Nova Atividade';
    document.getElementById('btnSalvarAtividade').textContent = '➕ Adicionar';
    document.getElementById('btnCancelarAtividade').classList.add('hidden');
}

async function adicionarAtividade() {
    const editandoId  = document.getElementById('atividadeEditandoId').value;
    const categoriaId = document.getElementById('categoriaNovaAtividade').value;
    const setorId     = document.getElementById('setorNovaAtividade').value || null;
    const nome        = document.getElementById('novoNomeAtividade').value.trim();
    const frequencia  = document.getElementById('novaFrequencia').value.trim();
    const usaColmeias = document.getElementById('novaUsaColmeias').checked;
    const usaChecklist = document.getElementById('novaUsaChecklist').checked;
    if (!categoriaId) { mostrarToast('Selecione a categoria', true); return; }
    if (!nome) { mostrarToast('Preencha o nome', true); return; }
    const dados = {
        categoria_id: categoriaId,
        setor_id: setorId,
        nome, frequencia,
        usa_colmeias: usaColmeias,
        usa_checklist: usaChecklist
    };
    try {
        if (editandoId) {
            await db.atualizar('atividades', editandoId, dados);
            const idx = atividades.findIndex(a => a.id === editandoId);
            if (idx !== -1) atividades[idx] = { ...atividades[idx], ...dados };
            mostrarToast(`✅ Atividade "${nome}" atualizada!`);
        } else {
            const nova = await db.inserir('atividades', dados);
            atividades.push(nova);
            mostrarToast(`✅ Atividade "${nome}" adicionada!`);
        }
        cancelarEdicaoAtividade();
        renderizarAdmin(); renderizarCalendarioGeral();
    } catch(e) { mostrarToast('Erro ao salvar atividade', true); console.error(e); }
}

async function excluirAtividade(id) {
    if (!confirm('Excluir esta atividade?')) return;
    try {
        await db.deletar('atividades', id);
        atividades = atividades.filter(a => a.id !== id);
        checklistItens = checklistItens.filter(i => i.atividade_id !== id);
        registros = registros.filter(r => r.atividade_id !== id);
        if (document.getElementById('atividadeEditandoId').value === id) cancelarEdicaoAtividade();
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
        : itens.map(item => `<div class="admin-item"><span>${item.descricao}</span><span><button class="btn-editar" onclick="editarItemChecklist('${item.id}')">✏️</button><button class="btn-excluir" onclick="excluirItemChecklist('${item.id}')">🗑️</button></span></div>`).join('');
}

function editarItemChecklist(id) {
    const item = checklistItens.find(i => i.id === id);
    if (!item) return;
    document.getElementById('itemChecklistEditandoId').value = item.id;
    document.getElementById('novoItemChecklist').value = item.descricao || '';
    document.getElementById('tituloFormChecklist').textContent = 'Editar Item';
    document.getElementById('btnSalvarChecklist').textContent = '💾 Salvar';
    document.getElementById('btnCancelarChecklist').classList.remove('hidden');
}

function cancelarEdicaoChecklist() {
    document.getElementById('itemChecklistEditandoId').value = '';
    document.getElementById('novoItemChecklist').value = '';
    document.getElementById('tituloFormChecklist').textContent = 'Novo Item';
    document.getElementById('btnSalvarChecklist').textContent = '➕ Adicionar';
    document.getElementById('btnCancelarChecklist').classList.add('hidden');
}

async function adicionarItemChecklist() {
    const editandoId = document.getElementById('itemChecklistEditandoId').value;
    const atividadeId = document.getElementById('atividadeChecklist').value;
    const descricao = document.getElementById('novoItemChecklist').value.trim();
    if (!atividadeId) { mostrarToast('Selecione a atividade', true); return; }
    if (!descricao) { mostrarToast('Preencha a descrição', true); return; }
    try {
        if (editandoId) {
            await db.atualizar('checklist_itens', editandoId, { descricao });
            const idx = checklistItens.findIndex(i => i.id === editandoId);
            if (idx !== -1) checklistItens[idx].descricao = descricao;
            mostrarToast('✅ Item atualizado!');
        } else {
            const novo = await db.inserir('checklist_itens', { atividade_id: atividadeId, descricao });
            checklistItens.push(novo);
            mostrarToast('✅ Item adicionado!');
        }
        cancelarEdicaoChecklist();
        carregarChecklistAdmin();
    } catch(e) { mostrarToast('Erro ao salvar item', true); console.error(e); }
}

async function excluirItemChecklist(id) {
    if (!confirm('Excluir este item?')) return;
    try {
        await db.deletar('checklist_itens', id);
        checklistItens = checklistItens.filter(i => i.id !== id);
        if (document.getElementById('itemChecklistEditandoId').value === id) cancelarEdicaoChecklist();
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
// CAMPOS DE TEXTO LIVRE (com edição)
// =============================================
function carregarCamposTextoAdmin() {
    const atividadeId = document.getElementById('atividadeCamposTexto').value;
    const container = document.getElementById('listaCamposTextoAdmin');
    if (!atividadeId) { container.innerHTML = ''; return; }
    const campos = camposTexto.filter(c => c.atividade_id === atividadeId);
    container.innerHTML = campos.length === 0
        ? '<div style="color:#999;font-size:13px">Nenhum campo</div>'
        : campos.map(c => `<div class="admin-item"><span>${c.label}</span><span><button class="btn-editar" onclick="editarCampoTexto('${c.id}')">✏️</button><button class="btn-excluir" onclick="excluirCampoTexto('${c.id}')">🗑️</button></span></div>`).join('');
}

function editarCampoTexto(id) {
    const campo = camposTexto.find(c => c.id === id);
    if (!campo) return;
    document.getElementById('campoTextoEditandoId').value = campo.id;
    document.getElementById('novoLabelCampoTexto').value = campo.label || '';
    document.getElementById('tituloFormCampoTexto').textContent = 'Editar Campo';
    document.getElementById('btnSalvarCampoTexto').textContent = '💾 Salvar';
    document.getElementById('btnCancelarCampoTexto').classList.remove('hidden');
}

function cancelarEdicaoCampoTexto() {
    document.getElementById('campoTextoEditandoId').value = '';
    document.getElementById('novoLabelCampoTexto').value = '';
    document.getElementById('tituloFormCampoTexto').textContent = 'Novo Campo';
    document.getElementById('btnSalvarCampoTexto').textContent = '➕ Adicionar';
    document.getElementById('btnCancelarCampoTexto').classList.add('hidden');
}

async function adicionarCampoTexto() {
    const editandoId = document.getElementById('campoTextoEditandoId').value;
    const atividadeId = document.getElementById('atividadeCamposTexto').value;
    const label = document.getElementById('novoLabelCampoTexto').value.trim();
    if (!atividadeId) { mostrarToast('Selecione a atividade', true); return; }
    if (!label) { mostrarToast('Preencha o nome do campo', true); return; }
    try {
        if (editandoId) {
            await db.atualizar('campos_texto', editandoId, { label });
            const idx = camposTexto.findIndex(c => c.id === editandoId);
            if (idx !== -1) camposTexto[idx].label = label;
            mostrarToast('✅ Campo atualizado!');
        } else {
            const novo = await db.inserir('campos_texto', { atividade_id: atividadeId, label });
            camposTexto.push(novo);
            mostrarToast('✅ Campo adicionado!');
        }
        cancelarEdicaoCampoTexto();
        carregarCamposTextoAdmin();
    } catch(e) { mostrarToast('Erro ao salvar campo', true); console.error(e); }
}

async function excluirCampoTexto(id) {
    if (!confirm('Excluir este campo?')) return;
    try {
        await db.deletar('campos_texto', id);
        camposTexto = camposTexto.filter(c => c.id !== id);
        if (document.getElementById('campoTextoEditandoId').value === id) cancelarEdicaoCampoTexto();
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
        if (!colmeia) return false;
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
        <!DOCTYPE html><html lang="pt-BR"><head>
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
        </head><body>${conteudo.innerHTML}</body></html>
    `);
    janela.document.close();
    janela.print();
}

function abrirVistoriaRapida(colmeiaId) {
    abrirDetalheColmeia(colmeiaId);
    setTimeout(() => abrirFormVistoria(colmeiaId), 300);
}

function abrirModalNovaVistoria() {
    const ativas = colmeias.slice(); // todas as colmeias aparecem para vistoria
    if (ativas.length === 0) { mostrarToast('Nenhuma colmeia cadastrada', true); return; }
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

// =============================================
// ESTOQUE — COM SUPORTE A SETORES
// =============================================
async function carregarEstoque() {
    estoqueItens = await db.get('estoque_itens');
    estoqueMovimentacoes = await db.get('estoque_movimentacoes');
}

function renderizarAbasEstoque() {
    const container = document.getElementById('abasCategoriaEstoque');
    if (!container) return;
    container.innerHTML = categorias.map(cat => `
        <button class="aba-estoque ${categoriaSelecionadaEstoque?.id === cat.id ? 'ativa' : ''}"
            onclick="selecionarCategoriaEstoque('${cat.id}')">
            ${cat.icone || '📦'} ${cat.nome}
        </button>
    `).join('');
}

function selecionarCategoriaEstoque(categoriaId) {
    categoriaSelecionadaEstoque = categorias.find(c => c.id === categoriaId);
    setorSelecionadoEstoque = null;
    renderizarAbasEstoque();

    // Verifica se a categoria tem setores
    const setoresDaCategoria = setores
        .filter(s => s.categoria_id === categoriaId)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));

    const containerSetores = document.getElementById('containerAbasSetorEstoque');
    const abasSetorEl = document.getElementById('abasSetorEstoque');

    if (setoresDaCategoria.length > 0) {
        setorSelecionadoEstoque = setoresDaCategoria[0]; // seleciona o primeiro
        containerSetores.classList.remove('hidden');
        renderizarAbasSetorEstoque(setoresDaCategoria);
    } else {
        containerSetores.classList.add('hidden');
        abasSetorEl.innerHTML = '';
    }

    document.getElementById('tituloEstoqueCategoria').textContent =
        setorSelecionadoEstoque
            ? `${categoriaSelecionadaEstoque.icone || '📦'} ${categoriaSelecionadaEstoque.nome} › ${setorSelecionadoEstoque.icone || ''} ${setorSelecionadoEstoque.nome}`
            : `${categoriaSelecionadaEstoque.icone || '📦'} ${categoriaSelecionadaEstoque.nome}`;

    document.getElementById('btnNovoItemEstoque').classList.remove('hidden');
    fecharFormEstoque();
    renderizarTabelaEstoque();
}

function renderizarAbasSetorEstoque(setoresDaCategoria) {
    const abasSetorEl = document.getElementById('abasSetorEstoque');
    abasSetorEl.innerHTML = setoresDaCategoria.map(s => `
        <button class="aba-setor ${setorSelecionadoEstoque?.id === s.id ? 'ativa' : ''}"
            onclick="selecionarSetorEstoque('${s.id}')">
            ${s.icone || ''} ${s.nome}
        </button>
    `).join('');
}

function selecionarSetorEstoque(setorId) {
    setorSelecionadoEstoque = setores.find(s => s.id === setorId);
    const setoresDaCategoria = setores
        .filter(s => s.categoria_id === categoriaSelecionadaEstoque.id)
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    renderizarAbasSetorEstoque(setoresDaCategoria);
    document.getElementById('tituloEstoqueCategoria').textContent =
        `${categoriaSelecionadaEstoque.icone || '📦'} ${categoriaSelecionadaEstoque.nome} › ${setorSelecionadoEstoque.icone || ''} ${setorSelecionadoEstoque.nome}`;
    renderizarTabelaEstoque();
}

function renderizarTabelaEstoque() {
    const container = document.getElementById('tabelaEstoque');
    if (!categoriaSelecionadaEstoque) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px">Selecione uma categoria acima.</p>';
        return;
    }

    // Filtra por categoria e, se houver setor selecionado, por setor também
    let itens = estoqueItens.filter(i => i.categoria_id === categoriaSelecionadaEstoque.id);
    if (setorSelecionadoEstoque) {
        itens = itens.filter(i => i.setor_id === setorSelecionadoEstoque.id);
    }

    // Ordena por nome (alfabética, ignorando maiúsculas/minúsculas e acentos)
    itens = itens.slice().sort((a, b) =>
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' })
    );

    if (itens.length === 0) {
        container.innerHTML = '<p style="color:#999;text-align:center;padding:20px">Nenhum item cadastrado nesta categoria/setor.</p>';
        return;
    }
    container.innerHTML = `
        <table class="tabela-colmeias">
            <thead><tr>
                <th>Produto</th>
                <th>Unidade</th>
                <th>Qtd Atual</th>
                <th>Qtd Mínima</th>
                <th>Status</th>
                <th>Ações</th>
            </tr></thead>
            <tbody>${itens.map(item => {
                const abaixo = item.quantidade_atual <= item.quantidade_minima;
                return `<tr class="${abaixo ? 'estoque-baixo' : ''}">
                    <td><b>${item.nome}</b></td>
                    <td>${item.unidade || 'unid'}</td>
                    <td><b>${item.quantidade_atual}</b></td>
                    <td>${item.quantidade_minima}</td>
                    <td>${abaixo
                        ? '<span class="badge-status badge-critica">⚠️ Baixo</span>'
                        : '<span class="badge-status badge-boa">✅ OK</span>'}</td>
                    <td>
                        <button class="btn-editar" onclick="abrirModalEntrada('${item.id}')">📥 Entrada</button>
                        <button class="btn-editar" onclick="abrirModalSaida('${item.id}')">📤 Saída</button>
                        <button class="btn-editar" onclick="verHistoricoItem('${item.id}')">📋 Histórico</button>
                        <button class="btn-editar" onclick="editarItemEstoque('${item.id}')">✏️</button>
                        <button class="btn-excluir-tabela" onclick="excluirItemEstoque('${item.id}')">🗑️</button>
                    </td>
                </tr>`;
            }).join('')}</tbody>
        </table>`;
}

function abrirFormEstoque() {
    document.getElementById('tituloFormEstoque').textContent = 'Novo Item';
    document.getElementById('estoqueItemEditandoId').value = '';
    document.getElementById('estoqueItemNome').value = '';
    document.getElementById('estoqueItemQtdAtual').value = '0';
    document.getElementById('estoqueItemQtdMinima').value = '0';
    document.getElementById('estoqueItemUnidade').value = 'unid';
    document.getElementById('formEstoqueItem').classList.remove('hidden');
    document.getElementById('formEstoqueItem').scrollIntoView({ behavior: 'smooth' });
}

function fecharFormEstoque() {
    document.getElementById('formEstoqueItem').classList.add('hidden');
}

function editarItemEstoque(id) {
    const item = estoqueItens.find(i => i.id === id);
    if (!item) return;
    document.getElementById('tituloFormEstoque').textContent = 'Editar Item';
    document.getElementById('estoqueItemEditandoId').value = item.id;
    document.getElementById('estoqueItemNome').value = item.nome;
    document.getElementById('estoqueItemQtdAtual').value = item.quantidade_atual;
    document.getElementById('estoqueItemQtdMinima').value = item.quantidade_minima;
    document.getElementById('estoqueItemUnidade').value = item.unidade || 'unid';
    document.getElementById('formEstoqueItem').classList.remove('hidden');
    document.getElementById('formEstoqueItem').scrollIntoView({ behavior: 'smooth' });
}

async function salvarItemEstoque() {
    if (!categoriaSelecionadaEstoque) return;
    const id = document.getElementById('estoqueItemEditandoId').value;
    const dados = {
        categoria_id: categoriaSelecionadaEstoque.id,
        setor_id: setorSelecionadoEstoque ? setorSelecionadoEstoque.id : null,  // NOVO
        nome: document.getElementById('estoqueItemNome').value.trim(),
        quantidade_atual: parseFloat(document.getElementById('estoqueItemQtdAtual').value) || 0,
        quantidade_minima: parseFloat(document.getElementById('estoqueItemQtdMinima').value) || 0,
        unidade: document.getElementById('estoqueItemUnidade').value.trim() || 'unid'
    };
    if (!dados.nome) { mostrarToast('Preencha o nome do produto', true); return; }
    try {
        if (id) {
            await db.atualizar('estoque_itens', id, dados);
            const idx = estoqueItens.findIndex(i => i.id === id);
            if (idx !== -1) estoqueItens[idx] = { ...estoqueItens[idx], ...dados };
            mostrarToast('✅ Item atualizado!');
        } else {
            const novo = await db.inserir('estoque_itens', dados);
            estoqueItens.push(novo);
            mostrarToast('✅ Item cadastrado!');
        }
        fecharFormEstoque();
        renderizarTabelaEstoque();
        renderizarAlertaEstoque();
    } catch(e) { mostrarToast('Erro ao salvar item', true); console.error(e); }
}

async function excluirItemEstoque(id) {
    if (!confirm('Excluir este item do estoque?')) return;
    try {
        await db.deletar('estoque_itens', id);
        estoqueItens = estoqueItens.filter(i => i.id !== id);
        renderizarTabelaEstoque();
        renderizarAlertaEstoque();
        mostrarToast('Item excluído');
    } catch(e) { mostrarToast('Erro ao excluir item', true); }
}

function abrirModalEntrada(itemId) {
    document.getElementById('entradaItemId').value = itemId;
    document.getElementById('entradaQtd').value = '';
    document.getElementById('entradaMotivo').value = '';
    document.getElementById('entradaObservacao').value = '';
    document.getElementById('modalEntradaEstoque').classList.remove('hidden');
}

function fecharModalEntrada() {
    document.getElementById('modalEntradaEstoque').classList.add('hidden');
}

async function confirmarEntrada() {
    const itemId = document.getElementById('entradaItemId').value;
    const qtd = parseFloat(document.getElementById('entradaQtd').value);
    const motivo = document.getElementById('entradaMotivo').value.trim();
    const observacao = document.getElementById('entradaObservacao').value.trim();
    if (!qtd || qtd <= 0) { mostrarToast('Informe uma quantidade válida', true); return; }
    try {
        const item = estoqueItens.find(i => i.id === itemId);
        const novaQtd = (item.quantidade_atual || 0) + qtd;
        await db.atualizar('estoque_itens', itemId, { quantidade_atual: novaQtd });
        item.quantidade_atual = novaQtd;
        const mov = await db.inserir('estoque_movimentacoes', {
            item_id: itemId, tipo: 'entrada', quantidade: qtd, motivo: motivo || null,
            observacao: observacao || null,
            usuario_id: usuarioLogado ? usuarioLogado.id : null
        });
        estoqueMovimentacoes.push(mov);
        fecharModalEntrada();
        renderizarTabelaEstoque();
        renderizarAlertaEstoque();
        mostrarToast(`✅ Entrada de ${qtd} ${item.unidade} registrada!`);
    } catch(e) { mostrarToast('Erro ao registrar entrada', true); console.error(e); }
}

async function registrarSaidaEstoqueVistoria(vistoriaId, colmeiaId, acoesSelecionadas, observacao = '') {
    if (acoesSelecionadas.length === 0) return;
    const colmeia = colmeias.find(c => c.id === colmeiaId);
    const dataHoje = new Date().toLocaleDateString('pt-BR');
    const motivo = `Vistoria colmeia ${colmeia ? colmeia.codigo : colmeiaId} — ${dataHoje} — Ações: ${acoesSelecionadas.join(', ')}`;
    console.log('Saída automática registrada:', motivo);
}

function abrirModalSaida(itemId) {
    document.getElementById('saidaItemId').value = itemId;
    document.getElementById('saidaQtd').value = '';
    document.getElementById('saidaMotivo').value = '';
    document.getElementById('saidaObservacao').value = '';
    document.getElementById('modalSaidaEstoque').classList.remove('hidden');
}

function fecharModalSaida() {
    document.getElementById('modalSaidaEstoque').classList.add('hidden');
}

async function confirmarSaida() {
    const itemId = document.getElementById('saidaItemId').value;
    const qtd = parseFloat(document.getElementById('saidaQtd').value);
    const motivo = document.getElementById('saidaMotivo').value.trim();
    const observacao = document.getElementById('saidaObservacao').value.trim();
    if (!qtd || qtd <= 0) { mostrarToast('Informe uma quantidade válida', true); return; }
    try {
        const item = estoqueItens.find(i => i.id === itemId);
        if (qtd > item.quantidade_atual) { mostrarToast('Quantidade insuficiente em estoque', true); return; }
        const novaQtd = item.quantidade_atual - qtd;
        await db.atualizar('estoque_itens', itemId, { quantidade_atual: novaQtd });
        item.quantidade_atual = novaQtd;
        const mov = await db.inserir('estoque_movimentacoes', {
            item_id: itemId, tipo: 'saida', quantidade: qtd, motivo: motivo || null,
            observacao: observacao || null,
            usuario_id: usuarioLogado ? usuarioLogado.id : null
        });
        estoqueMovimentacoes.push(mov);
        fecharModalSaida();
        renderizarTabelaEstoque();
        renderizarAlertaEstoque();
        mostrarToast(`✅ Saída de ${qtd} ${item.unidade} registrada!`);
    } catch(e) { mostrarToast('Erro ao registrar saída', true); console.error(e); }
}

async function verHistoricoItem(itemId) {
    const item = estoqueItens.find(i => i.id === itemId);
    if (!item) return;
    document.getElementById('tituloHistoricoEstoque').textContent = `📋 Histórico — ${item.nome}`;
    try {
        const movs = await db.query('estoque_movimentacoes', `item_id=eq.${itemId}&order=criado_em.desc`);
        const lista = document.getElementById('listaHistoricoEstoque');
        if (movs.length === 0) {
            lista.innerHTML = '<p style="color:#999;text-align:center;padding:20px">Nenhuma movimentação registrada.</p>';
        } else {
            lista.innerHTML = movs.map(m => {
                const data = new Date(m.criado_em).toLocaleDateString('pt-BR');
                const hora = new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const cor = m.tipo === 'entrada' ? '#2e7d32' : '#c62828';
                const icone = m.tipo === 'entrada' ? '📥' : '📤';
                return `<div class="historico-mov-item">
                    <div style="display:flex;justify-content:space-between;align-items:center">
                        <span style="font-weight:600;color:${cor}">${icone} ${m.tipo === 'entrada' ? '+' : '-'}${m.quantidade} ${item.unidade}</span>
                        <span style="font-size:12px;color:#999">${data} ${hora}</span>
                    </div>
                    <div style="font-size:13px;color:#555;margin-top:4px">${m.motivo || '—'}</div>
                    ${m.observacao ? `<div style="font-size:12px;color:#888;margin-top:2px">📝 ${m.observacao}</div>` : ''}
                </div>`;
            }).join('');
        }
        document.getElementById('modalHistoricoEstoque').classList.remove('hidden');
    } catch(e) { mostrarToast('Erro ao carregar histórico', true); console.error(e); }
}

function fecharModalHistorico() {
    document.getElementById('modalHistoricoEstoque').classList.add('hidden');
}

function renderizarAlertaEstoque() {
    const container = document.getElementById('alertaEstoque');
    if (!container) return;
    const itensBaixos = estoqueItens
        .filter(i => i.quantidade_atual <= i.quantidade_minima)
        .slice()
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR', { sensitivity: 'base' }));
    if (itensBaixos.length === 0) { container.innerHTML = ''; return; }
    container.innerHTML = `
        <div class="card alerta-estoque-card">
            <h3>⚠️ Estoque Baixo</h3>
            <p style="font-size:13px;color:#888;margin-bottom:12px">${itensBaixos.length} item(s) abaixo da quantidade mínima</p>
            ${itensBaixos.map(item => {
                const cat = categorias.find(c => c.id === item.categoria_id);
                const setor = setores.find(s => s.id === item.setor_id);
                const label = setor
                    ? `${cat?.icone || '📦'} ${cat?.nome} › ${setor.icone || ''} ${setor.nome} — <b>${item.nome}</b>`
                    : `${cat?.icone || '📦'} ${cat?.nome || ''} — <b>${item.nome}</b>`;
                return `<div class="alerta-estoque-item">
                    <span>${label}</span>
                    <span style="color:#c62828;font-weight:600">${item.quantidade_atual} / ${item.quantidade_minima} ${item.unidade}</span>
                </div>`;
            }).join('')}
        </div>`;
}
