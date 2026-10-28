/*
 * CalcRede — calculadora de sub-redes IPv4 (trilha C, sem API).
 * Fluxo: calcular() -> validarEntrada() -> calcularSubrede() -> mostrarResultado() -> salvarHistorico()
 */

const CHAVE_HISTORICO = "calcrede.historico";
const MAX_HISTORICO = 5;

// Formato a.b.c.d/n: quatro grupos de 1 a 3 dígitos e um prefixo de 1 ou 2 dígitos.
const FORMATO_CIDR = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/;

// Referências aos elementos da página
const formulario = document.getElementById("form-calculo");
const campoEndereco = document.getElementById("campo-endereco");
const mensagem = document.getElementById("mensagem");
const resultadoVazio = document.getElementById("resultado-vazio");
const tabelaResultado = document.getElementById("tabela-resultado");
const legendaResultado = document.getElementById("legenda-resultado");
const corpoResultado = document.getElementById("corpo-resultado");
const listaHistorico = document.getElementById("lista-historico");
const botaoLimpar = document.getElementById("botao-limpar");

/* ---------- Validação ---------- */

/**
 * Confere o texto digitado. Retorna { ok: true, octetos, prefixo }
 * ou { ok: false, erro: "mensagem para o usuário" }.
 */
function validarEntrada(texto) {
  if (texto === "") {
    return { ok: false, erro: "Digite um endereço, por exemplo 192.168.10.37/26." };
  }

  const partes = FORMATO_CIDR.exec(texto);
  if (!partes) {
    return {
      ok: false,
      erro: "Formato inválido. Use quatro números separados por ponto e o prefixo, como 10.0.0.1/24.",
    };
  }

  const octetos = partes.slice(1, 5).map(Number);
  const prefixo = Number(partes[5]);

  const octetoRuim = octetos.find((octeto) => octeto > 255);
  if (octetoRuim !== undefined) {
    return { ok: false, erro: `Octeto inválido: ${octetoRuim} (use 0 a 255).` };
  }

  if (prefixo > 32) {
    return { ok: false, erro: `Prefixo inválido: /${prefixo} (use /0 a /32).` };
  }

  return { ok: true, octetos, prefixo };
}

/* ---------- Conversões ---------- */

function octetosParaNumero(octetos) {
  return ((octetos[0] << 24) | (octetos[1] << 16) | (octetos[2] << 8) | octetos[3]) >>> 0;
}

function numeroParaIp(numero) {
  return [24, 16, 8, 0].map((desloc) => (numero >>> desloc) & 255).join(".");
}

function numeroParaBinario(numero) {
  return [24, 16, 8, 0]
    .map((desloc) => ((numero >>> desloc) & 255).toString(2).padStart(8, "0"))
    .join(".");
}

function prefixoParaMascara(prefixo) {
  return prefixo === 0 ? 0 : (0xffffffff << (32 - prefixo)) >>> 0;
}

/* ---------- Cálculo ---------- */

function calcularSubrede(octetos, prefixo) {
  const ip = octetosParaNumero(octetos);
  const mascara = prefixoParaMascara(prefixo);
  const rede = (ip & mascara) >>> 0;
  const broadcast = (rede | ~mascara) >>> 0;

  let primeiroHost;
  let ultimoHost;
  let totalHosts;

  if (prefixo === 32) {
    // Um único endereço (rota de host)
    primeiroHost = ip;
    ultimoHost = ip;
    totalHosts = 1;
  } else if (prefixo === 31) {
    primeiroHost = rede;
    ultimoHost = broadcast;
    totalHosts = 2;
  } else {
    primeiroHost = rede + 1;
    ultimoHost = broadcast - 1;
    totalHosts = 2 ** (32 - prefixo) - 2;
  }

  return { ip, prefixo, mascara, rede, broadcast, primeiroHost, ultimoHost, totalHosts };
}

/* ---------- Exibição ---------- */

function mostrarErro(texto) {
  mensagem.textContent = texto;
  mensagem.classList.add("erro");
  campoEndereco.setAttribute("aria-invalid", "true");
}

function limparErro() {
  mensagem.textContent = "";
  mensagem.classList.remove("erro");
  campoEndereco.removeAttribute("aria-invalid");
}

// Cria uma linha <tr><th>rótulo</th><td>valor</td></tr> usando só textContent
function criarLinha(rotulo, valor) {
  const linha = document.createElement("tr");
  const celulaRotulo = document.createElement("th");
  const celulaValor = document.createElement("td");
  celulaRotulo.scope = "row";
  celulaRotulo.textContent = rotulo;
  celulaValor.textContent = valor;
  linha.append(celulaRotulo, celulaValor);
  return linha;
}

function mostrarResultado(entrada, sub) {
  const linhas = [
    ["Endereço de rede", `${numeroParaIp(sub.rede)}/${sub.prefixo}`],
    ["Máscara", numeroParaIp(sub.mascara)],
    ["Máscara em binário", numeroParaBinario(sub.mascara)],
    ["Broadcast", numeroParaIp(sub.broadcast)],
    ["Primeiro host", numeroParaIp(sub.primeiroHost)],
    ["Último host", numeroParaIp(sub.ultimoHost)],
    ["Hosts utilizáveis", sub.totalHosts.toLocaleString("pt-BR")],
  ];

  legendaResultado.textContent = entrada;
  corpoResultado.replaceChildren(...linhas.map(([rotulo, valor]) => criarLinha(rotulo, valor)));
  tabelaResultado.hidden = false;
  resultadoVazio.hidden = true;
}

/* ---------- Histórico (localStorage) ---------- */
function carregarHistorico() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_HISTORICO) || "[]");
    if (!Array.isArray(salvo)) return [];
    return salvo
      .filter((item) => typeof item === "string" && validarEntrada(item).ok)
      .slice(0, MAX_HISTORICO);
  } catch {
    return [];
  }
}

function gravarHistorico(lista) {
  try {
    localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(lista));
  } catch {
  }
}

// Coloca a entrada no topo, sem duplicar, mantendo no máximo 5 itens
function salvarHistorico(entrada) {
  const lista = carregarHistorico().filter((item) => item !== entrada);
  lista.unshift(entrada);
  gravarHistorico(lista.slice(0, MAX_HISTORICO));
  mostrarHistorico();
}

function mostrarHistorico() {
  const lista = carregarHistorico();
  const itens = lista.map((entrada) => {
    const item = document.createElement("li");
    const botao = document.createElement("button");
    botao.type = "button";
    botao.textContent = entrada;
    botao.addEventListener("click", () => {
      campoEndereco.value = entrada;
      calcular();
    });
    item.append(botao);
    return item;
  });
  listaHistorico.replaceChildren(...itens);
  botaoLimpar.disabled = lista.length === 0;
}

function limparHistorico() {
  try {
    localStorage.removeItem(CHAVE_HISTORICO);
  } catch {
  }
  mostrarHistorico();
}

/* ---------- Ação principal ---------- */

function calcular() {
  const entrada = campoEndereco.value.replace(/\s+/g, ""); // remove espaços
  const validacao = validarEntrada(entrada);

  if (!validacao.ok) {
    mostrarErro(validacao.erro);
    // Esconde o resultado anterior para não parecer que ele vale para a entrada errada
    tabelaResultado.hidden = true;
    resultadoVazio.hidden = false;
    campoEndereco.focus();
    return;
  }

  limparErro();
  const subrede = calcularSubrede(validacao.octetos, validacao.prefixo);
  mostrarResultado(entrada, subrede);
  salvarHistorico(entrada);
}

formulario.addEventListener("submit", (evento) => {
  evento.preventDefault(); // impede o recarregamento da página
  calcular();
});
botaoLimpar.addEventListener("click", limparHistorico);

mostrarHistorico();
