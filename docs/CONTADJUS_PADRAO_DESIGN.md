# CONTADJUS — PADRÃO OFICIAL DE DESIGN

**Versão:** 1.1 — B83  
**Data:** 25/08/2026  
**Status:** documento permanente do projeto

## 1. Regra-mãe

O **relatório da B79 da Guia 2** é o **MASTER VISUAL** dos relatórios ContadJus.

Novas guias e novas seções devem adaptar seu conteúdo a esse padrão. Não se deve redesenhar o relatório aprovado para acomodar uma nova guia.

> **B79 é a referência visual. Novos relatórios expandem o padrão; não o substituem.**

## 2. Identidade visual

- Azul institucional: `#002b66`
- Ciano/teal: `#00a8b5`
- Teal alternativo: `#008080`
- Grafite: `#475569`
- Texto: `#1e293b`
- Fundo claro: `#f8fafc`
- Bordas: `#cbd5e1`
- Zebra de tabela: `#f1f5f9`

## 3. Estrutura do relatório

1. Logo ContadJus e identificação do documento.
2. Linha divisória ciano.
3. Quadro de identificação processual.
4. Título de seção em azul com linha ciano.
5. Quadro de parâmetros.
6. Destaque moderado da RMA.
7. Título da memória.
8. Tabela institucional.
9. Nota técnica discreta.

## 4. Guia 2

Título da seção: **Resultado da Evolução Previdenciária**.

Memória oficial: **MEMÓRIA DA EVOLUÇÃO DO BENEFÍCIO DEVIDO**.

A aparência da B79 deve ser preservada quando somente a Guia 2 for selecionada.

## 5. Guia 3

A Guia 3 é outra evolução previdenciária e deve utilizar a mesma linguagem visual da Guia 2.

Título da seção: **Resultado da Evolução do Benefício Recebido**.

Memória oficial: **MEMÓRIA DA EVOLUÇÃO DO BENEFÍCIO RECEBIDO**.

Os dados próprios da Guia 3 podem variar, mas não a identidade visual.

## 6. Guia 4 — Diferenças

A Guia 4 passa a integrar o relatório profissional e deve utilizar a mesma linguagem visual das Guias 2 e 3.

Estrutura obrigatória:

1. título **Resultado das Diferenças**;
2. quadro de parâmetros (termo inicial, competência final, modo de compensação e quantidade de competências);
3. quadro de totais (devido, recebido e diferença total);
4. tabela consolidada das diferenças, preservando as colunas efetivamente exibidas na Guia 4;
5. nota técnica informando que o relatório reproduz resultados consolidados e não reexecuta os motores.

A tabela deve manter cabeçalho azul institucional `#002b66`, texto branco, bordas discretas, zebra `#f1f5f9` e valores de diferença destacados em azul institucional.

## 7. PDF e impressão

A impressão deve reproduzir o modelo B79 em A4, com:

- margens e proporções equivalentes ao modelo aprovado;
- logo proporcional;
- tipografia legível;
- tabelas dentro das margens;
- cores institucionais preservadas;
- quebra de página controlada;
- Guia 3 em nova página quando a Guia 2 também estiver selecionada.

A prévia da Guia 8 e o PDF devem representar o mesmo documento, com adaptação apenas às dimensões do papel.

## 8. Separação entre visual e motor

Alterações de design não devem modificar:

- motores de cálculo;
- fórmulas;
- IDs existentes;
- vínculos entre guias;
- JSON;
- importação/exportação;
- regras previdenciárias.

## 9. Nomenclatura

Não utilizar novamente **MEMÓRIA DE CÁLCULO COMPLETA** para as evoluções previdenciárias.

Usar:

- Guia 2: **MEMÓRIA DA EVOLUÇÃO DO BENEFÍCIO DEVIDO**
- Guia 3: **MEMÓRIA DA EVOLUÇÃO DO BENEFÍCIO RECEBIDO**

## 10. Regra para futuras versões

Antes de alterar qualquer relatório, comparar visualmente a saída com a B79. Se uma mudança fizer o relatório parecer pertencer a outro sistema, ela deve ser rejeitada ou revista.
