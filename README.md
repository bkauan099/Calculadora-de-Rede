# CalcRede: calculadora de sub-redes IPv4

Atividade ATV19/10 · Desenvolvimento de Sistemas Web (EECP0036) · UFMA · 2026.2
Aluno: Bruno Kauan Rodrigues Silva · Trilha **C** (sem API)

## O que o app faz

O usuário digita um endereço IPv4 com prefixo CIDR (ex.: `192.168.10.37/26`), clica em **Calcular** e vê:

- endereço de rede, máscara (decimal e binária) e broadcast;
- primeiro e último host utilizável e o total de hosts;
- histórico dos 5 últimos cálculos, salvo no `localStorage` (clicar em um item refaz o cálculo; há um botão para limpar).

Entradas vazias ou inválidas (`1.2.3`, `192.168.300.1/24`, `10.0.0.1/40`, letras) mostram uma mensagem explicando o erro, sem quebrar a página. Os prefixos `/31` (enlace ponto a ponto, RFC 3021) e `/32` (um único host) são tratados à parte.

**Não faz:** IPv6, divisão em várias sub-redes (VLSM), testes em rede real.

### Exemplo

| Entrada | Rede | Máscara | Broadcast | Hosts |
|---|---|---|---|---|
| `192.168.10.37/26` | 192.168.10.0 | 255.255.255.192 | 192.168.10.63 | 192.168.10.1 a .62 (62) |

## Como rodar

O app é só HTML, CSS e JavaScript, sem frameworks nem dependências.

```bash
git clone <url-deste-repositorio>
cd calcrede
python -m http.server 8000
```

Abra http://localhost:8000. Também funciona com a extensão Live Server do VS Code.

## Estrutura

```
index.html   página (header, main, form com label ligado ao campo, tabela de resultado)
style.css    estilos, com layout em coluna para telas de até 480px
app.js       validação, cálculo bit a bit, exibição e histórico
docs/        print da aba Rede
```

Fluxo em `app.js`: `calcular()` → `validarEntrada()` → `calcularSubrede()` → `mostrarResultado()` → `salvarHistorico()`.

## Segurança

- Todo texto vindo do usuário ou do `localStorage` entra na página com `textContent`; o código não usa `innerHTML`.
- O histórico lido do `localStorage` é revalidado item a item; se o JSON estiver corrompido, é descartado.
- Não há chave de API: o app não faz requisições externas.

## Aba Rede

![Aba Rede do navegador](docs/aba-rede.png)

O print mostra a requisição **GET** para `http://localhost:8000/`, com status **200 OK**, que carregou a página `index.html` a partir do servidor local (seguida de `style.css` e `app.js`, também com 200). Como o app é da trilha C, nenhuma outra requisição aparece ao clicar em Calcular: o cálculo acontece todo no navegador.

## Uso de IA

- **Ferramenta:** Claude (Anthropic). e seu auxilio no entendimento e tira duvidas de certas questões