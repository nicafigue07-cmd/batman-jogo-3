# Kaito Nami — Ondas da Aventura

Aventura 3D para navegador com **Kaito Nami**, um menino japonês de 12 anos, de Okinawa. Divertido, corajoso, inteligente, curioso e protetor dos amigos, ele explora ruas e telhados com sua mochila vermelha, um gancho e uma prancha personalizada. A interface é em português e os modelos, efeitos e sons são procedurais, sem arquivos de outros jogos.

Kaito tem cabelo preto curto e bagunçado, rosto infantil, óculos esportivos estilo Juliete com lentes vermelhas, camiseta azul larga com uma onda, bermuda florida e chinelos. A prancha substitui a antiga capa na travessia aérea. Veja a [ficha do personagem](docs/KAITO-NAMI.md).

A cidade e os cinco casos da base anterior continuam disponíveis. A origem em Okinawa descreve o personagem; o mapa urbano atual não foi substituído por um mapa de Okinawa.

## Jogar

A edição independente funciona sem instalar Node.js:

1. Baixe o pacote do jogo e extraia os arquivos.
2. Abra o HTML do jogo no Chrome, Edge, Firefox ou Safari com WebGL 2.
3. Escolha **Jogar campanha**, **Patrulha livre** ou **Escolher missão**.

No computador, também é possível abrir o navegador, pressionar **Ctrl + O** e selecionar o HTML baixado. O pacote de compartilhamento usa `jogar.html` como entrada. [Download público do pacote](https://github.com/nicafigue07-cmd/batman-jogo-3/raw/refs/heads/main/jogar.zip): esse endereço oferece a versão que estiver publicada no repositório. Cada pessoa joga sua própria partida; não há multiplayer.

Para uma página pública que abra o jogo diretamente, veja [PUBLICAR.md](PUBLICAR.md). Um link de download e uma página hospedada têm fluxos de abertura diferentes.

## Campanha e patrulha

Explore uma cidade noturna com chuva, edifícios de sete estilos, ruas e telhados acessíveis, carros e pedestres. Siga o marcador do objetivo atual e use **F** perto dele para interagir.

| Caso | Terreno e vilão | Objetivo |
| --- | --- | --- |
| Silêncio na frequência | Telhados · Vagalume | Liberar três transmissores e sincronizar seus pulsos. |
| Resgate na Rua do Mercado | Ruas · Pinguim | Libertar o civil e acompanhá-lo até a extração. |
| Rastros na noite | Ruas · Charada | Analisar pistas com o scanner e reconstruir sequências A/B/C. |
| Último sinal | Telhado · Bane | Evitar os golpes pesados e aproveitar a abertura da defesa. |
| Prancha contra o medo | Céu e telhado · Morcego-Humano | Planar por três anéis dourados e alcançar o telhado final. |

Na missão aérea, atravesse cada anel com a prancha em modo de planar. Usar o gancho dentro do anel não conta. Quatro correntes de ar azuis ajudam a ganhar sustentação e velocidade fora do percurso obrigatório.

A **Patrulha livre** alterna entre emboscada, resgate com escolta, bomba com desarme cronometrado e perseguição de um mensageiro. O gerador evita os dois últimos tipos e locais quando há opções. Cada conclusão concede XP, com bônus por não sofrer dano e por abordagem silenciosa; falhas não concedem a recompensa. **Próximo chamado** continua a sequência.

Os capangas têm três perfis: combatente, brutamontes e atirador. Os avisos mostram a preparação dos ataques. Na patrulha, agachar reduz a detecção; paredes e fumaça bloqueiam a visão. Aproxime-se por trás de um guarda não alertado, a até três metros, para uma finalização silenciosa.

## Combate, foco e travessia

**J** executa um combo de três golpes, **K** aplica o chute pesado e **L** inicia um mergulho no ar. O **disco de resgate (Q)** ricocheteia entre guardas; a **fumaça (Z)** atordoa inimigos próximos.

Use **X** para aparar no instante do ataque. Um aparo confirmado impede o dano, concede foco e pode abrir um contra-ataque; o aparo perfeito tem uma janela menor e efeito mais forte. Acertos e finalizações silenciosas também geram foco. Com **100 de foco**, use **B** junto de um inimigo vulnerável para a finalização especial. A tentativa sem foco ou sem alvo não consome recursos.

Pressione **E** para conectar o gancho ao telhado indicado. Repita para soltar mantendo impulso ou use **Espaço** para sair planando sobre a prancha. Perto da chegada, **E** prepara o próximo telhado. As animações de caminhar, planar, defender e atacar acompanham o novo personagem.

## Evolução e equipamentos

Kaito começa no nível 1. Os níveis seguintes chegam com 100, 250, 450 e 700 XP; cada nível acrescenta 10 pontos à vitalidade máxima, até 140. O HUD mostra a porcentagem da vitalidade disponível. As primeiras conclusões de missão concedem 120, 140, 160, 220 e 180 XP, respectivamente; repetições concedem 30 XP.

Abra os equipamentos com **T**. Os cinco conjuntos mantêm os atributos e identificadores da versão anterior, preservando os desbloqueios:

| Conjunto | Como liberar | Efeito |
| --- | --- | --- |
| Aventureiro | Desde o início | Defesa e dano padrão; gancho a 48 m/s. |
| Kit de exploração | Silêncio na frequência | 15% menos dano recebido; gancho a 62 m/s. |
| Kit de resgate | Resgate na Rua do Mercado | 25% menos dano recebido; gancho a 48 m/s. |
| Kit de investigação | Rastros na noite | Scanner de 40 m e análise em 1 s; o padrão é 24 m e 2 s. |
| Kit reforçado | Último sinal | 40% menos dano recebido e dano corpo a corpo 2; gancho a 44 m/s. |

A roupa principal, a mochila, os óculos e a prancha de Kaito permanecem reconhecíveis. Os kits acrescentam equipamentos e atributos. A missão aérea concede XP e registra sua conclusão, sem alterar os cinco desbloqueios acima.

Há **nove habilidades**, em três ramos com requisitos sequenciais:

- **Combate:** mais foco por acerto, janela de aparo maior e mais dano corpo a corpo.
- **Travessia:** prancha mais rápida, gancho mais rápido e sustentação maior nas correntes.
- **Investigação:** scanner de maior alcance, detecção mais lenta e recuperação extra ao concluir objetivos.

Cada habilidade custa um ponto. Os pontos ganhos são `(nível − 1) + metade inteira das missões distintas concluídas`, até seis pontos com os níveis e cinco missões atuais. Aprender habilidades não gasta XP. Os pontos permitem escolher entre os ramos, sem aprender todas as nove habilidades ao mesmo tempo.

## Dificuldade e salvamento

Escolha a dificuldade na introdução ou na pausa:

| Dificuldade | Dano recebido | Velocidade dos inimigos | Prazo das ocorrências | Aparo |
| --- | --- | --- | --- | --- |
| História | 55% do padrão | 85% | 140% | Janela ampliada |
| Equilibrado | Padrão | Padrão | Padrão | Padrão |
| Cavaleiro | 130% do padrão | 110% | 85% | Janela menor |

A dificuldade não altera as recompensas de XP. Sua preferência fica salva no navegador.

XP, missões concluídas, equipamento e habilidades são locais a cada navegador. **Continuar missão** retoma o último objetivo salvo da campanha. Esse ponto de retomada reinicia o encontro do objetivo; não é uma gravação exata da posição, vida e inimigos no meio do combate. Começar a patrulha livre não apaga o ponto da campanha.

Os formatos anteriores de progresso foram mantidos: trocar o protagonista não apaga XP, equipamentos liberados ou habilidades. Se o armazenamento estiver bloqueado, o HUD informa **Sessão sem salvamento**. O progresso não sincroniza entre dispositivos.

## Controles

| Entrada no PC | Ação |
| --- | --- |
| W, A, S, D | Mover |
| Arrastar o mouse ou usar setas | Girar/inclinar a câmera |
| Espaço | Pular; segurar no ar para planar na prancha; sair do gancho planando; sincronizar pulsos |
| E | Conectar, soltar ou encadear o gancho |
| J / K / L | Combo / chute pesado / mergulho aéreo |
| X / B | Aparo / finalização especial com 100 de foco |
| Q / Z | Disco de resgate / fumaça |
| Shift | Esquiva e janela de aparo |
| C / V | Agachar / finalização silenciosa na patrulha |
| F / R | Interagir / scanner |
| M / T | Painel de missões / equipamentos e habilidades |
| H / Esc | Ajuda / pausa |

No tablet, os **13 botões de ação** e os quatro direcionais ficam na tela. Arraste a cidade para girar a câmera e segure **Pular / prancha** para planar. O modo Tablet mantém esses controles visíveis mesmo com um mouse conectado. Os menus ajustam-se às orientações horizontal e vertical.

| Entrada no controle PlayStation | Ação |
| --- | --- |
| Analógicos L / R | Mover / câmera |
| ✕ | Pular e segurar para planar |
| ○ | Esquivar e aparar no instante |
| □ / △ | Combo / chute pesado |
| R1 / L1 | Gancho / disco de resgate |
| L2 / R2 | Fumaça / interagir |
| Direcional ↑ / ↓ | Scanner / mergulho |
| Direcional ← / → | Equipamentos / missões |
| L3 / R3 | Agachar / finalização silenciosa ou especial com foco completo |
| Options | Pausar/continuar |
| Direcional, ✕ e ○ nos menus | Navegar, confirmar e voltar |

Conecte um controle compatível ao computador ou tablet e pressione um botão para o navegador reconhecê-lo. O modo usa a Gamepad API padrão. Os controles foram verificados por simulação; não houve teste com um controle Sony físico, um PS4 ou um PS5. Os arquivos HTML são uma edição de navegador, não um aplicativo nativo instalável no console.

## Gráficos, cidade e som

As opções **Leve**, **Equilibrado** e **Cinematográfico** controlam detalhes, sombras e brilho. A resolução interna pode diminuir temporariamente para ajudar a manter a fluidez, preservando a qualidade selecionada e o progresso. As malhas rígidas dos personagens são agrupadas por material; as colisões e animações continuam independentes dessa otimização.

A cidade tem carros e residentes procedurais, com contagem ajustada à qualidade. Eles dão movimento ao cenário; não há novas interações de trânsito ou simulação física de atropelamento. A câmera verifica continuamente os obstáculos para evitar atravessar paredes.

O som é ativado pelo botão de áudio. Chuva, vento, drones discretos e pulsação de combate são sintetizados no navegador. Nenhum áudio começa antes da ativação do usuário, e nenhum arquivo de música precisa ser baixado.

## Desenvolvimento, build e empacotamento

Requisitos: Node.js 20.19+ na linha 20, ou 22.12+; npm; navegador moderno com WebGL 2. Na primeira instalação, é necessário acesso ao registro npm.

```sh
npm ci
npm run dev
```

Abra o endereço informado pelo Vite. Para compilar e verificar a lógica:

```sh
npm test
npm run build
```

O build fica em `dist/`. `npm run preview` serve a versão compilada.

```sh
npm run build:portable
npm run build:share
```

O primeiro comando cria HTMLs independentes, incluindo as edições PC, Tablet e Controle PlayStation. O segundo acrescenta o ZIP de compartilhamento e exige Python 3 apenas para gerar esse pacote. A nova edição usa o nome **Kaito Nami**; o ZIP mantém `jogar.html` como entrada. Todos os recursos necessários para jogar estão dentro do HTML.

## Validação

A base da atualização de jogabilidade contém 23 grupos de testes unitários: campanha, progressão, habilidades, checkpoints, dificuldade, combate, IA, furtividade, voo, gancho, física, câmera, simulação, cenário, moradores, gráficos e recursos visuais. A substituição de personagem acrescenta verificações específicas de Kaito. Use `npm test` para executar o conjunto atual completo.

Os testes de navegador precisam de Chromium e de um servidor ativo, por padrão na porta 5173. Defina `CHROMIUM_PATH` para outra instalação e `GOTHAM_URL` para outra URL.

```sh
npm run test:smoke
node tests/upgrade-smoke.mjs
node tests/combat-upgrade-smoke.mjs
node tests/variety-smoke.mjs
node tests/patrol-playthrough.mjs
```

Os fluxos cobrem missões de rua e voo, teclado/mouse, toque e gamepad simulado, save antigo, compra de habilidade, retomada de missão, aparos reais por comandos do navegador, consumo de foco e as quatro ocorrências de patrulha. As capturas ficam em `test-results/`. O sucesso desses testes não representa verificação de hardware físico ou de um console nativo.

A troca para Kaito deve ser conferida novamente na build final, incluindo aparência, animações, UI e arquivo portátil. O projeto continua uma aventura de escopo reduzido: cidade finita, personagens estilizados e cinco missões.
