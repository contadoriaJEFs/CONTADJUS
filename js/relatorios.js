// =====================================================================
// RELATÓRIOS – ALTERAÇÕES MANUAIS (Fase 1.7C2)
// =====================================================================

// =====================================================================
// FUNÇÕES AUXILIARES (consomem dados de diferencas.js)
// =====================================================================

function obterCompetenciasModificadasRelatorio() {
    // Esta função já existe em diferencas.js, mas se não estiver disponível globalmente, a implementamos aqui.
    if (typeof window.obterCompetenciasModificadas === 'function') {
        return window.obterCompetenciasModificadas();
    }
    // Fallback local (caso não esteja disponível)
    const competencias = new Set();
    for (const chave of Object.keys(dadosDiferencas.celulasEditadas)) {
        let comp;
        if (chave.startsWith('devido|')) {
            comp = chave.split('|')[1];
        } else {
            comp = chave.split('|')[0];
        }
        if (comp) competencias.add(comp);
    }
    return Array.from(competencias).sort((a, b) => {
        const [mesA, anoA] = a.split('/').map(Number);
        const [mesB, anoB] = b.split('/').map(Number);
        return (anoA * 12 + mesA) - (anoB * 12 + mesB);
    });
}

function obterValorOriginalDevido(comp) {
    // Recalcula o valor original do Benefício Devido para a competência
    const mes = parseInt(comp.split('/')[0], 10);
    const ano = parseInt(comp.split('/')[1], 10);
    const fracao = window.obterFracaoDevida ? window.obterFracaoDevida(mes, ano) : 1;
    const memoriaDevida = window.memoriaEvolucaoDevida || [];
    const rmiDevida = parseFloat(document.getElementById('rmi').value.replace(/\./g, '').replace(',', '.')) || 0;
    const valorIntegral = window.obterValorIntegral ? window.obterValorIntegral(memoriaDevida, comp, rmiDevida) : 0;
    return Math.round(valorIntegral * fracao * 100) / 100;
}

function obterValorOriginalRecebido(comp, benId) {
    // Recalcula o valor original do Benefício Recebido para a competência
    const mes = parseInt(comp.split('/')[0], 10);
    const ano = parseInt(comp.split('/')[1], 10);
    const beneficios = window.coletarBeneficiosRecebidosSimplificado ? window.coletarBeneficiosRecebidosSimplificado() : [];
    const ben = beneficios.find(b => b.id === benId);
    if (!ben) return 0;
    const fracao = window.obterFracaoRecebida ? window.obterFracaoRecebida(mes, ano, ben) : 1;
    const valorIntegral = window.obterValorIntegral ? window.obterValorIntegral(ben.memoria, comp, ben.rmi, ben.rmaFinal) : 0;
    return Math.round(valorIntegral * fracao * 100) / 100;
}

function formatarMoedaRelatorio(valor) {
    return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// =====================================================================
// GERAR RELATÓRIO
// =====================================================================

function gerarRelatorio(tipo) {
    const competencias = obterCompetenciasModificadasRelatorio();
    if (competencias.length === 0) {
        return '<p class="text-slate-400 text-center py-4">Nenhuma alteração manual encontrada.</p>';
    }

    const linhas = [];
    let countExternas = 0;
    let countInternas = 0;

    competencias.forEach(comp => {
        const just = dadosDiferencas.justificativas[comp];
        const justTexto = just && typeof just === 'object' ? just.texto : (typeof just === 'string' ? just : null);
        const incluirRel = just && typeof just === 'object' ? just.incluirNoRelatorio : false;

        // Filtro para relatório externo: só inclui se houver justificativa externa
        if (tipo === 'externo' && !incluirRel) return;

        const temJustificativaExterna = incluirRel && justTexto && justTexto.trim() !== '';

        if (temJustificativaExterna) countExternas++;
        else if (justTexto && justTexto.trim() !== '') countInternas++;

        // --- Benefício Devido ---
        const chaveDevido = 'devido|' + comp;
        const valorEditado = dadosDiferencas.celulasEditadas[chaveDevido];
        if (valorEditado !== undefined) {
            const valorOriginal = obterValorOriginalDevido(comp);
            const status = (tipo === 'interno') ? (temJustificativaExterna ? 'EXTERNO' : 'INTERNO') : '';
            linhas.push({
                comp,
                campo: 'Benefício Devido',
                valorOriginal,
                valorEditado,
                justificativa: justTexto || 'Justificativa não informada.',
                status,
                incluirRel
            });
        }

        // --- Benefícios Recebidos ---
        for (const chave of Object.keys(dadosDiferencas.celulasEditadas)) {
            if (chave.startsWith(comp + '|')) {
                const benId = chave.split('|')[1];
                const valorEditado = dadosDiferencas.celulasEditadas[chave];
                const valorOriginal = obterValorOriginalRecebido(comp, benId);
                // Buscar identificador do benefício (NB)
                const beneficios = window.coletarBeneficiosRecebidosSimplificado ? window.coletarBeneficiosRecebidosSimplificado() : [];
                const ben = beneficios.find(b => b.id === benId);
                const nomeBen = ben ? ('NB ' + ben.nb) : ('Benefício ' + benId);
                const status = (tipo === 'interno') ? (temJustificativaExterna ? 'EXTERNO' : 'INTERNO') : '';
                linhas.push({
                    comp,
                    campo: nomeBen,
                    valorOriginal,
                    valorEditado,
                    justificativa: justTexto || 'Justificativa não informada.',
                    status,
                    incluirRel
                });
            }
        }
    });

    // Se não houver linhas para exibir (externo sem justificativas)
    if (linhas.length === 0) {
        return '<p class="text-slate-400 text-center py-4">Nenhuma alteração com justificativa para relatório externo foi encontrada.</p>';
    }

    // Ordenar por competência
    linhas.sort((a, b) => {
        const [mesA, anoA] = a.comp.split('/').map(Number);
        const [mesB, anoB] = b.comp.split('/').map(Number);
        return (anoA * 12 + mesA) - (anoB * 12 + mesB);
    });

    // Construir HTML
    let html = '';
    let currentComp = '';
    linhas.forEach(item => {
        if (item.comp !== currentComp) {
            if (currentComp !== '') html += '<div class="relatorio-separador"></div>';
            currentComp = item.comp;
            html += `<div class="relatorio-item"><div class="font-bold text-slate-800">COMPETÊNCIA: ${item.comp}</div>`;
        }
        html += `
            <div class="ml-4 mt-2">
                <div><span class="campo">Campo Alterado:</span> ${item.campo}</div>
                <div><span class="campo">Valor Original Calculado:</span> ${formatarMoedaRelatorio(item.valorOriginal)}</div>
                <div><span class="campo">Valor Utilizado:</span> ${formatarMoedaRelatorio(item.valorEditado)}</div>
                <div><span class="campo">Justificativa:</span> ${item.justificativa}</div>
        `;
        if (tipo === 'interno') {
            const statusClass = item.status === 'EXTERNO' ? 'status-externo' : 'status-interno';
            html += `<div><span class="campo">Status:</span> <span class="${statusClass}">${item.status}</span></div>`;
        }
        html += `</div>`;
    });
    html += `</div>`; // fecha último item

    // Atualizar resumo
    atualizarResumoRelatorio(competencias, countExternas, countInternas);

    return html;
}

// =====================================================================
// RESUMO DAS ALTERAÇÕES
// =====================================================================

function atualizarResumoRelatorio(competencias, externas, internas) {
    const resumoDiv = document.getElementById('resumoRelatorio');
    if (!resumoDiv) return;
    if (competencias.length === 0) {
        resumoDiv.classList.add('hidden');
        return;
    }
    resumoDiv.classList.remove('hidden');
    document.getElementById('resumoCompetencias').textContent = competencias.length;
    document.getElementById('resumoExternas').textContent = externas;
    document.getElementById('resumoInternas').textContent = internas;
}

// =====================================================================
// EXIBIR RELATÓRIO NO PREVIEW
// =====================================================================

function exibirRelatorio() {
    const tipoRadio = document.querySelector('input[name="tipoRelatorio"]:checked');
    const tipo = tipoRadio ? tipoRadio.value : 'interno';
    const preview = document.getElementById('previewRelatorio');
    if (!preview) return;

    const html = gerarRelatorio(tipo);
    preview.innerHTML = html;
}

function imprimirRelatorio() {
    window.print();
}

// =====================================================================
// INICIALIZAÇÃO (substitui a função placeholder anterior)
// =====================================================================

// Esta função será chamada pelo DOMContentLoaded em app.js, se existir.
// Caso contrário, manteremos a função vazia ou apenas configuramos eventos.

function initRelatorios() {
    // Configurar eventos da Guia 7 (já estão nos botões inline)
    // Nada mais necessário.
}

// Para compatibilidade, manter a função antiga como alias
function visualizarRelatorio() {
    exibirRelatorio();
}

function gerarRelatorioCompleto() {
    exibirRelatorio();
}
// =====================================================================
// RELATÓRIOS PROFISSIONAIS — FASE 1
// Central de seleção + relatório próprio da Guia 2.
// Não reutiliza a impressão da tela e não altera motores de cálculo.
// =====================================================================

function relatorioEscaparHtml(valor) {
    return String(valor ?? '')
        .replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function relatorioValorMoeda(valor) {
    // Aceita números e valores monetários digitados no padrão brasileiro.
    // Ex.: "1.200,00" -> 1200; 1200 -> 1200.
    if (typeof valor === 'number' && Number.isFinite(valor)) {
        return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    const texto = String(valor ?? '').trim();
    if (!texto) return '0,00';
    const normalizado = texto.replace(/R\$\s*/g, '').replace(/\./g, '').replace(',', '.');
    const n = Number(normalizado);
    return (Number.isFinite(n) ? n : 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function relatorioCampo(id, fallback='') {
    const el = document.getElementById(id);
    return el && String(el.value || '').trim() ? String(el.value).trim() : fallback;
}

function obterSelecaoRelatorios() {
    return Array.from(document.querySelectorAll('#guia-relatorios input[type="checkbox"][data-relatorio-selecao], #guia-relatorios input[type="checkbox"]'))
        .filter(el => el.checked && !el.disabled)
        .map(el => el.value);
}

function atualizarDisponibilidadeRelatoriosPorTipoAcao() {
    const tipo = document.getElementById('tipoAcao')?.value || 'previdenciaria';
    const previdenciaria = tipo === 'previdenciaria';
    const idsPrevid = ['relatorioSelecionarEvolucao', 'relatorioSelecionarBeneficios'];

    idsPrevid.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        const option = input.closest('.relatorio-opcao');
        input.disabled = !previdenciaria;
        if (!previdenciaria) {
            input.checked = false;
            option?.classList.add('is-disabled');
        } else {
            option?.classList.remove('is-disabled');
        }
    });

    const aviso = document.getElementById('avisoRelatoriosTipoAcao');
    if (aviso) {
        if (!previdenciaria) {
            aviso.classList.remove('hidden');
            aviso.textContent = 'As seções 2 — Evolução Devida e 3 — Benefícios Recebidos ficam indisponíveis porque esta ação não é previdenciária.';
        } else {
            aviso.classList.add('hidden');
            aviso.textContent = '';
        }
    }
}

function atualizarNavegacaoPorTipoAcao() {
    const tipo = document.getElementById('tipoAcao')?.value || 'previdenciaria';
    const previdenciaria = tipo === 'previdenciaria';
    ['evolucao-devida', 'beneficios-recebidos'].forEach(nome => {
        const btn = document.querySelector(`#navGuias button[data-guia="${nome}"]`);
        if (!btn) return;
        btn.style.display = previdenciaria ? '' : 'none';
    });
    atualizarDisponibilidadeRelatoriosPorTipoAcao();
}

function selecionarTodosRelatorios() {
    atualizarDisponibilidadeRelatoriosPorTipoAcao();
    document.querySelectorAll('#guia-relatorios .relatorio-opcao input[type="checkbox"]:not(:disabled)').forEach(el => el.checked = true);
}

function limparSelecaoRelatorios() {
    document.querySelectorAll('#guia-relatorios .relatorio-opcao input[type="checkbox"]:not(:disabled)').forEach(el => el.checked = false);
}

function montarCabecalhoRelatorioProfissional() {
    const processo = relatorioCampo('processo', 'Não informado');
    const autor = relatorioCampo('autor', 'Não informado');
    const reu = relatorioCampo('reu', 'Não informado');
    const dataCalculo = relatorioCampo('dataCalculo', relatorioCampo('dataAtualizacao', 'Não informado'));

    return `
        <div class="documento-cabecalho">
            <div class="marca-relatorio">
                <img src="assets/contadjus-logo-relatorio.png" alt="ContadJus — Liquidação de Sentenças" class="logo-relatorio" width="150" height="97" style="width:150px!important;height:auto!important;max-width:150px!important;display:block!important;object-fit:contain!important;">
            </div>
            <div class="titulo-area-relatorio">
                <div class="titulo-documento">RELATÓRIO DE CÁLCULO JUDICIAL</div>
                <div class="subtitulo-documento">Evolução Previdenciária — RGPS / INSS</div>
                <div class="data-emissao">Emissão: ${relatorioEscaparHtml(dataCalculo)}</div>
            </div>
        </div>
        <div class="identificacao-relatorio">
            <div><strong>Número do processo:</strong> ${relatorioEscaparHtml(processo)}</div>
            <div><strong>Nome da parte:</strong> ${relatorioEscaparHtml(autor)}</div>
            <div><strong>Nome do réu:</strong> ${relatorioEscaparHtml(reu)}</div>
            <div><strong>Data do cálculo:</strong> ${relatorioEscaparHtml(dataCalculo)}</div>
        </div>`;
}

function gerarSecaoEvolucaoRelatorioProfissional() {
    const memoria = Array.isArray(window.memoriaEvolucaoDevida) ? window.memoriaEvolucaoDevida : [];
    if (!memoria.length) {
        return `
            <section class="secao-relatorio">
                <h2>Resultado da Evolução Previdenciária</h2>
                <p class="nota-relatorio">Não há memória de cálculo disponível. Realize o cálculo da evolução na Guia 2 antes de gerar este relatório.</p>
            </section>`;
    }

    const dib = document.getElementById('resDIB')?.textContent?.trim() || relatorioCampo('dib', '-');
    const rmi = document.getElementById('resRMI')?.textContent?.trim() || relatorioValorMoeda(relatorioCampo('rmi'));
    const dataFinal = document.getElementById('resDataFinal')?.textContent?.trim() || relatorioCampo('dataFinal', '-');
    const qtd = document.getElementById('resQtdReajustes')?.textContent?.trim() || '-';
    const rma = document.getElementById('resRMA')?.textContent?.trim() || 'R$ 0,00';

    const linhas = memoria.map(item => {
        const tipo = item.tipo || '-';
        const indice = item.indice === null || item.indice === undefined ? '-' : Number(item.indice).toFixed(4);
        const salario = relatorioValorMoeda(item.salarioMinimo);
        const teto = relatorioValorMoeda(item.teto);
        const teorico = relatorioValorMoeda(item.valorTeorico);
        const evoluido = relatorioValorMoeda(item.valorEvoluido);
        const final = relatorioValorMoeda(item.valorFinal);
        const status = item.status === 'LIMITADO_TETO' ? 'Teto' : item.status === 'SALARIO_MINIMO' ? 'Salário mínimo' : (item.status || 'Normal');
        return `<tr>
            <td>${relatorioEscaparHtml(item.competencia)}</td>
            <td>${relatorioEscaparHtml(tipo)}</td>
            <td class="num">${relatorioEscaparHtml(indice)}</td>
            <td class="num">R$ ${salario}</td>
            <td class="num">R$ ${teto}</td>
            <td>${relatorioEscaparHtml(status)}</td>
            <td class="num">R$ ${teorico}</td>
            <td class="num">R$ ${evoluido}</td>
            <td class="num"><strong>R$ ${final}</strong></td>
        </tr>`;
    }).join('');

    return `
        <section class="secao-relatorio">
            <h2>Resultado da Evolução Previdenciária</h2>
            <div class="quadro-resumo">
                <div class="item"><span class="rotulo">DIB considerada</span><span class="valor">${relatorioEscaparHtml(dib)}</span></div>
                <div class="item"><span class="rotulo">RMI base</span><span class="valor">${relatorioEscaparHtml(rmi)}</span></div>
                <div class="item"><span class="rotulo">Competência final</span><span class="valor">${relatorioEscaparHtml(dataFinal)}</span></div>
                <div class="item"><span class="rotulo">Reajustes aplicados</span><span class="valor">${relatorioEscaparHtml(qtd)}</span></div>
            </div>
            <div class="resultado-destaque">
                <span class="label">Renda Mensal Atualizada (RMA)</span>
                <span class="valor">${relatorioEscaparHtml(rma)}</span>
            </div>
            <h3 class="memoria-titulo-relatorio">MEMÓRIA DA EVOLUÇÃO DO BENEFÍCIO DEVIDO</h3>
            <table class="tabela-evolucao-relatorio">
                <colgroup>
                    <col class="col-competencia">
                    <col class="col-tipo">
                    <col class="col-indice">
                    <col class="col-salario">
                    <col class="col-teto">
                    <col class="col-status">
                    <col class="col-teorico">
                    <col class="col-evoluido">
                    <col class="col-final">
                </colgroup>
                <thead><tr>
                    <th>Competência</th><th>Tipo</th><th class="num">Índice</th><th class="num">Sal. mín.</th><th class="num">Teto</th><th>Status</th><th class="num">Vlr. teórico</th><th class="num">Vlr. evoluído</th><th class="num">Vlr. final</th>
                </tr></thead>
                <tbody>${linhas}</tbody>
            </table>
            <p class="nota-relatorio">Memória de cálculo reproduzida a partir dos resultados consolidados da Guia 2. Os motores de cálculo não são executados pelo relatório.</p>
        </section>`;
}


function obterBeneficiosRecebidosParaRelatorio() {
    try {
        if (typeof coletarBeneficiosRecebidos === 'function') {
            return coletarBeneficiosRecebidos();
        }
    } catch (e) {
        console.warn('[RELATÓRIO GUIA 3] Não foi possível coletar benefícios:', e);
    }
    return [];
}

function gerarTabelaMemoriaBeneficioRecebido(memoria) {
    const linhasMemoria = Array.isArray(memoria) ? memoria : [];
    if (!linhasMemoria.length) {
        return '<p class="nota-relatorio">Nenhuma memória de evolução disponível para este benefício.</p>';
    }

    const linhas = [...linhasMemoria].sort((a, b) => {
        const [ma, aa] = String(a.competencia || '').split('/').map(Number);
        const [mb, ab] = String(b.competencia || '').split('/').map(Number);
        return (aa * 100 + ma) - (ab * 100 + mb);
    }).map(item => {
        const tipo = item.tipo || '-';
        const indice = item.indice === null || item.indice === undefined ? '-' : Number(item.indice).toFixed(4);
        const indiceTeto = item.indiceTeto === null || item.indiceTeto === undefined ? '-' : Number(item.indiceTeto).toFixed(5);
        const status = item.status === 'LIMITADO_TETO' ? 'Teto' : item.status === 'SALARIO_MINIMO' ? 'Salário mínimo' : item.status === 'PISO' ? 'Piso' : (item.status || 'Normal');
        return `<tr>
            <td>${relatorioEscaparHtml(item.competencia || '-')}</td>
            <td>${relatorioEscaparHtml(tipo)}</td>
            <td class="num">${relatorioEscaparHtml(indice)}</td>
            <td class="num">R$ ${relatorioValorMoeda(item.salarioMinimo)}</td>
            <td class="num">R$ ${relatorioValorMoeda(item.teto)}</td>
            <td class="num">${relatorioEscaparHtml(indiceTeto)}</td>
            <td>${relatorioEscaparHtml(status)}</td>
            <td class="num">R$ ${relatorioValorMoeda(item.valorTeorico)}</td>
            <td class="num">R$ ${relatorioValorMoeda(item.valorEvoluido)}</td>
            <td class="num"><strong>R$ ${relatorioValorMoeda(item.valorFinal)}</strong></td>
        </tr>`;
    }).join('');

    return `<table class="tabela-evolucao-relatorio tabela-beneficio-recebido">
        <colgroup>
            <col class="col-competencia"><col class="col-tipo"><col class="col-indice">
            <col class="col-salario"><col class="col-teto"><col class="col-indice-teto">
            <col class="col-status"><col class="col-teorico"><col class="col-evoluido"><col class="col-final">
        </colgroup>
        <thead><tr>
            <th>Competência</th><th>Tipo</th><th class="num">Índice</th><th class="num">Sal. mín.</th>
            <th class="num">Teto</th><th class="num">Índ. teto</th><th>Status</th>
            <th class="num">Vlr. teórico</th><th class="num">Vlr. evoluído</th><th class="num">Vlr. final</th>
        </tr></thead>
        <tbody>${linhas}</tbody>
    </table>`;
}

function gerarSecaoBeneficiosRecebidosRelatorioProfissional(continuaEmNovaPagina = false) {
    const beneficios = obterBeneficiosRecebidosParaRelatorio();
    const calculados = beneficios.filter(b => b && b.resultado && Array.isArray(b.resultado.memoria) && b.resultado.memoria.length);

    if (!beneficios.length) {
        return `<section class="secao-relatorio secao-beneficios-recebidos ${continuaEmNovaPagina ? 'continua-em-pagina' : ''}">
            <h2>Resultado da Evolução do Benefício Recebido</h2>
            <p class="nota-relatorio">Nenhum benefício recebido foi cadastrado na Guia 3.</p>
        </section>`;
    }

    if (!calculados.length) {
        return `<section class="secao-relatorio secao-beneficios-recebidos ${continuaEmNovaPagina ? 'continua-em-pagina' : ''}">
            <h2>Resultado da Evolução do Benefício Recebido</h2>
            <p class="nota-relatorio">Não há memória de evolução disponível. Calcule pelo menos um benefício na Guia 3 antes de gerar este relatório.</p>
        </section>`;
    }

    let html = `<section class="secao-relatorio secao-beneficios-recebidos ${continuaEmNovaPagina ? 'continua-em-pagina' : ''}">
        <h2>Resultado da Evolução do Benefício Recebido</h2>`;

    calculados.forEach((beneficio, index) => {
        const resultado = beneficio.resultado;
        const identificador = beneficio.identificador || `BEN-${index + 1}`;
        const nb = beneficio.nb || 'Não informado';
        const especie = beneficio.especie || 'Não informada';
        const tipo = beneficio.tipo || 'Previdenciário';
        const dib = beneficio.dib || '-';
        const dip = beneficio.dip || '-';
        const dcb = beneficio.dcb || '-';
        const rmi = relatorioValorMoeda(beneficio.rmi);
        const rma = relatorioValorMoeda(resultado.rmaFinal);
        const qtd = resultado.qtdReajustes ?? '-';
        const ultimoReajuste = resultado.ultimoReajuste || '-';
        const ultimoIndice = resultado.ultimoIndice === null || resultado.ultimoIndice === undefined ? '-' : Number(resultado.ultimoIndice).toFixed(4);
        const status = resultado.statusFinal === 'LIMITADO_TETO' ? 'TETO' : resultado.statusFinal === 'SALARIO_MINIMO' ? 'SALÁRIO MÍNIMO' : resultado.statusFinal === 'PISO' ? 'PISO' : (resultado.statusFinal || 'NORMAL');

        html += `<div class="bloco-beneficio-relatorio">
            <div class="beneficio-identificacao-relatorio">
                <div><span class="rotulo">Identificador</span><strong>${relatorioEscaparHtml(identificador)}</strong></div>
                <div><span class="rotulo">NB</span><strong>${relatorioEscaparHtml(nb)}</strong></div>
                <div><span class="rotulo">Espécie</span><strong>${relatorioEscaparHtml(especie)}</strong></div>
                <div><span class="rotulo">Tipo</span><strong>${relatorioEscaparHtml(tipo)}</strong></div>
                <div><span class="rotulo">DIB</span><strong>${relatorioEscaparHtml(dib)}</strong></div>
                <div><span class="rotulo">DIP</span><strong>${relatorioEscaparHtml(dip)}</strong></div>
                <div><span class="rotulo">DCB</span><strong>${relatorioEscaparHtml(dcb)}</strong></div>
                <div><span class="rotulo">RMI base</span><strong>R$ ${rmi}</strong></div>
            </div>

            <div class="quadro-resumo quadro-resumo-beneficio">
                <div class="item"><span class="rotulo">Reajustes aplicados</span><span class="valor">${relatorioEscaparHtml(String(qtd))}</span></div>
                <div class="item"><span class="rotulo">Último reajuste</span><span class="valor">${relatorioEscaparHtml(ultimoReajuste)}</span></div>
                <div class="item"><span class="rotulo">Último índice</span><span class="valor">${relatorioEscaparHtml(ultimoIndice)}</span></div>
                <div class="item"><span class="rotulo">Status final</span><span class="valor">${relatorioEscaparHtml(status)}</span></div>
            </div>

            <div class="resultado-destaque">
                <span class="label">Renda Mensal Atualizada (RMA) — benefício recebido</span>
                <span class="valor">R$ ${rma}</span>
            </div>

            <h3 class="memoria-titulo-relatorio">MEMÓRIA DA EVOLUÇÃO DO BENEFÍCIO RECEBIDO</h3>
            ${gerarTabelaMemoriaBeneficioRecebido(resultado.memoria)}
        </div>`;
    });

    html += `<p class="nota-relatorio">Memória da evolução reproduzida a partir dos resultados consolidados da Guia 3. Os motores de cálculo não são executados pelo relatório.</p></section>`;
    return html;
}


function relatorioExtrairCelulaTabela(td) {
    if (!td) return '';
    const input = td.querySelector('input, textarea, select');
    if (input) {
        if (input.tagName === 'SELECT') {
            return input.options[input.selectedIndex]?.textContent?.trim() || '';
        }
        return String(input.value ?? '').trim();
    }
    return String(td.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function gerarTabelaDiferencasRelatorioProfissional() {
    const tabela = document.getElementById('tabelaDiferencas');
    const tbody = document.getElementById('corpoDiferencas');
    if (!tabela || !tbody) return '';

    const headers = Array.from(tabela.querySelectorAll('thead th'))
        .map(th => String(th.textContent || '').replace(/\s+/g, ' ').trim());
    const rows = Array.from(tbody.querySelectorAll('tr'))
        .filter(tr => tr.querySelectorAll('td').length > 1);

    if (!headers.length || !rows.length) return '';

    const headerHtml = headers.map((h, i) =>
        `<th class="${i === 0 ? '' : 'num'}">${relatorioEscaparHtml(h)}</th>`
    ).join('');

    const bodyHtml = rows.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        return `<tr>${cells.map((td, i) => {
            const valor = relatorioExtrairCelulaTabela(td);
            const classesOriginais = td.className || '';
            const destaque = /diferenca-devida|total-recebido/i.test(classesOriginais);
            return `<td class="${i === 0 ? '' : 'num'}${destaque ? ' destaque-diferenca' : ''}">${relatorioEscaparHtml(valor)}</td>`;
        }).join('')}</tr>`;
    }).join('');

    return `<div class="tabela-diferencas-relatorio-wrap">
        <table class="tabela-diferencas-relatorio">
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
        </table>
    </div>`;
}

function gerarSecaoDiferencasRelatorioProfissional(continuaEmNovaPagina = false) {
    const tabela = document.getElementById('tabelaDiferencas');
    const tbody = document.getElementById('corpoDiferencas');
    const temLinhas = !!tbody && Array.from(tbody.querySelectorAll('tr')).some(tr => tr.querySelectorAll('td').length > 1);

    const termoInicial = relatorioCampo('termoInicialDiferencas', '-');
    const competenciaFinal = relatorioCampo('dataFinal', '-');
    const modo = document.querySelector('input[name="modoCompensacao"]:checked')?.value === 'negativo'
        ? 'Permitir diferença negativa'
        : 'Limitar ao valor devido';

    const totalDevido = document.getElementById('totalDevido')?.textContent?.trim() || 'R$ 0,00';
    const totalRecebido = document.getElementById('totalRecebido')?.textContent?.trim() || 'R$ 0,00';
    const diferencaTotal = document.getElementById('diferencaTotal')?.textContent?.trim() || 'R$ 0,00';
    const qtdCompetencias = document.getElementById('qtdCompetencias')?.textContent?.trim() || '0';
    const qtdEditadas = document.getElementById('qtdEditadas')?.textContent?.trim() || '0';

    if (!temLinhas) {
        return `<section class="secao-relatorio secao-diferencas-relatorio ${continuaEmNovaPagina ? 'continua-em-pagina' : ''}">
            <h2>Resultado das Diferenças</h2>
            <p class="nota-relatorio">Não há diferenças calculadas disponíveis. Calcule as evoluções das Guias 2 e 3 e, em seguida, processe a Guia 4 antes de gerar este relatório.</p>
        </section>`;
    }

    return `<section class="secao-relatorio secao-diferencas-relatorio ${continuaEmNovaPagina ? 'continua-em-pagina' : ''}">
        <h2>Resultado das Diferenças</h2>

        <div class="quadro-resumo quadro-resumo-diferencas">
            <div class="item"><span class="rotulo">Termo inicial</span><span class="valor">${relatorioEscaparHtml(termoInicial)}</span></div>
            <div class="item"><span class="rotulo">Competência final</span><span class="valor">${relatorioEscaparHtml(competenciaFinal)}</span></div>
            <div class="item"><span class="rotulo">Modo de compensação</span><span class="valor valor-menor">${relatorioEscaparHtml(modo)}</span></div>
            <div class="item"><span class="rotulo">Competências</span><span class="valor">${relatorioEscaparHtml(qtdCompetencias)}</span></div>
        </div>

        <div class="quadro-totais-diferencas">
            <div class="total"><span>Valor devido</span><strong>${relatorioEscaparHtml(totalDevido)}</strong></div>
            <div class="total"><span>Valor recebido</span><strong>${relatorioEscaparHtml(totalRecebido)}</strong></div>
            <div class="total principal"><span>Diferença total</span><strong>${relatorioEscaparHtml(diferencaTotal)}</strong></div>
        </div>

        ${gerarTabelaDiferencasRelatorioProfissional()}

        <div class="rodape-diferencas-relatorio">
            <span>Competências analisadas: ${relatorioEscaparHtml(qtdCompetencias)}</span>
            <span>Células editadas manualmente: ${relatorioEscaparHtml(qtdEditadas)}</span>
        </div>
        <p class="nota-relatorio">Resultado reproduzido a partir da tabela consolidada da Guia 4. O relatório não executa novamente os motores de cálculo.</p>
    </section>`;
}

function gerarRelatorioFinal() {
    atualizarNavegacaoPorTipoAcao();
    const selecoes = obterSelecaoRelatorios();
    const preview = document.getElementById('previewRelatorio');
    if (!preview) return;

    if (!selecoes.length) {
        preview.innerHTML = '<div class="relatorio-placeholder">Nenhuma seção foi selecionada.</div>';
        return;
    }

    let html = montarCabecalhoRelatorioProfissional();
    const temEvolucao = selecoes.includes('evolucao-devida');
    const temBeneficios = selecoes.includes('beneficios-recebidos');
    const temDiferencas = selecoes.includes('diferencas');

    if (temEvolucao) html += gerarSecaoEvolucaoRelatorioProfissional();
    if (temBeneficios) html += gerarSecaoBeneficiosRecebidosRelatorioProfissional(temEvolucao);
    if (temDiferencas) html += gerarSecaoDiferencasRelatorioProfissional(temEvolucao || temBeneficios);

    const naoImplementadas = selecoes.filter(x => !['evolucao-devida', 'beneficios-recebidos', 'diferencas'].includes(x));
    if (naoImplementadas.length) {
        // Aviso apenas na interface. Não entra no documento impresso.
        html += `<div class="no-print relatorio-aviso"><strong>Fase 1:</strong> as seções selecionadas das Guias 5 a 8 ainda serão incorporadas às próximas fases.</div>`;
    }
    preview.innerHTML = html;
}

function imprimirRelatorioProfissional() {
    const preview = document.getElementById('previewRelatorio');
    if (!preview || preview.querySelector('.relatorio-placeholder')) {
        gerarRelatorioFinal();
    }
    const atual = document.getElementById('previewRelatorio');
    if (!atual) return;
    const portalAnterior = document.getElementById('relatorioImpressaoPortal');
    portalAnterior?.remove();
    const portal = document.createElement('div');
    portal.id = 'relatorioImpressaoPortal';
    // O preview possui a classe relatorio-documento no próprio container.
    // Ao copiar apenas o innerHTML para o portal de impressão essa classe era perdida,
    // fazendo todo o CSS profissional do relatório deixar de ser aplicado no PDF.
    portal.className = 'relatorio-documento';
    portal.innerHTML = atual.innerHTML;
    document.body.appendChild(portal);
    window.print();
    setTimeout(() => portal.remove(), 1000);
}

// Atualiza a disponibilidade sem interferir nos cálculos.
document.addEventListener('DOMContentLoaded', () => {
    atualizarNavegacaoPorTipoAcao();
});
