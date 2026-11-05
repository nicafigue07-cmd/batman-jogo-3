# Batman — Sombras de Gotham

Protótipo 3D de fã para navegador, inspirado na exploração vertical e no combate de jogos de super-heróis. Gotham, personagens e efeitos são construídos proceduralmente com Three.js, sem modelos, músicas ou imagens extraídos de outros jogos. Experiência não oficial, com interface em português.

## A patrulha

Explore uma cidade noturna com chuva, prédios com sete estilos de arquitetura e silhuetas diferentes, ruas e telhados acessíveis. Salte entre edifícios, use o gancho e abra a capa para planar. O protótipo inclui combos corpo a corpo, chute pesado, mergulho aéreo, fumaça, batarangue com ricochete, esquiva, integridade do traje, câmera controlável, minimapa, controles de toque e gamepad.

Jogue as cinco missões em campanha ou escolha uma no painel **Escolher missão**. Cada uma tem seu próprio vilão:

| Missão | Terreno e vilão | Objetivo |
| --- | --- | --- |
| Silêncio na frequência | Telhados · Vagalume | Invadir três transmissores, sincronizar os pulsos com Espaço ou o botão do desafio e enfrentar o sabotador. |
| Resgate na Rua do Mercado | Ruas · Pinguim | Enfrentar os criminosos, libertar o refém no chão e acompanhá-lo até a extração. Interagir novamente quando ele chegar. |
| Rastros na noite | Ruas · Charada | Ativar o scanner nas áreas de busca, analisar duas evidências, repetir suas frequências A/B/C e encontrar o Charada. |
| Último sinal | Telhado da Torre de controle · Bane | Esquivar dos golpes pesados, atacar durante a abertura e desligar o terminal final. |
| Asas contra o medo | Céu e telhado · Morcego-Humano | Planar por três anéis dourados em ordem, pousar no telhado marcado e deter o vilão. |

Siga o marcador do objetivo atual. Perto dele, pressione **F** para desativar, resgatar ou coletar. Nas missões terrestres, desça à rua; na investigação, use **R** para encontrar as pistas. Na missão aérea, mantenha a capa aberta ao atravessar cada anel: cruzá-lo usando o gancho não conta. O HUD mostra terreno, vilão, vida do chefe e avanço dos objetivos; o painel também pode ser aberto com **M** durante a patrulha.

## Patrulha livre e variedade

Escolha **Patrulha livre** na tela inicial ou no painel **M**. Cada rodada sorteia um local e uma ocorrência: emboscada, civil com escolta, bomba com desarme cronometrado ou perseguição de um mensageiro. Os dois últimos tipos e locais são evitados quando há opções suficientes. Ao terminar, **Continuar patrulha** apresenta outra ocorrência. O relatório concede XP apenas na conclusão, com bônus por não receber dano e por abordagem silenciosa; falhas não concedem XP. O XP usa o mesmo progresso da campanha, preservando os desbloqueios de armaduras pelas cinco missões.

Na patrulha livre, **C** alterna o agachamento e reduz a distância de detecção dos guardas. Paredes e fumaça bloqueiam a visão; o alerta aumenta gradualmente. Aproxime-se por trás de um guarda não alertado, a até três metros, e use **V** para uma finalização silenciosa. No controle, clique **L3** para agachar e **R3** para finalizar. Os chefes da campanha mantêm seus combates próprios.

Quatro correntes de ar azuis aparecem no mapa. Entre nelas com a capa aberta para ganhar sustentação e velocidade; elas ficam fora dos três anéis dourados da missão aérea. Veja a [comparação de sistemas com Marvel’s Spider-Man 2](docs/REFERENCIAS-E-VARIEDADE.md) e o escopo das adaptações.

## Combate e travessia

Pressione **J** em sequência para executar o combo de três golpes, use **K** para o chute pesado e **L** para um mergulho quando estiver no ar. O **batarangue (Q)** ricocheteia entre guardas; a **bomba de fumaça (Z)** atordoa inimigos próximos. O HUD informa o estado do combo e quando as habilidades estão disponíveis novamente.

O indicador do gancho mostra o telhado selecionado. Pressione **E** para conectar, repita para soltar mantendo o impulso ou use **Espaço** durante a travessia para sair planando. Perto da chegada, **E** permite encadear o próximo telhado.

## XP, níveis e armaduras

As missões concedem XP e liberam trajes com aparência e atributos próprios. O personagem começa no nível 1; os próximos níveis chegam com 100, 250, 450 e 700 XP. Cada nível acima do primeiro acrescenta 10 pontos à vitalidade máxima: 100, 110, 120, 130 e 140. O indicador de integridade no HUD mostra a porcentagem da vitalidade disponível. A primeira conclusão de cada missão concede sua recompensa completa; repetições concedem 30 XP.

Abra o arsenal com **T**, pelo botão na tela ou pelos menus de início, pausa e conclusão. Os cinco trajes são:

| Armadura | Como liberar | Característica |
| --- | --- | --- |
| Vigilante | Disponível desde o início | Traje e atributos padrão. |
| Tática | Concluir Silêncio na frequência | Gancho mais rápido e 15% menos dano recebido. |
| Resgate | Concluir Resgate na Rua do Mercado | 25% menos dano recebido. |
| Detetive | Concluir Rastros na noite | Scanner com alcance de 40 m e análise em 1 s; o padrão é 24 m e 2 s. |
| Blindada | Concluir Último sinal | 40% menos dano recebido e dobro do dano corpo a corpo; gancho mais lento. |

**Asas contra o medo** concede XP e registra sua conclusão; os cinco trajes continuam vinculados aos desbloqueios acima.

XP, missões concluídas e traje equipado são guardados localmente neste navegador. Se o navegador bloquear o armazenamento, o HUD informa **Sessão sem salvamento**; nesse caso, a progressão permanece apenas durante a sessão. O salvamento é local e não sincroniza entre navegadores ou dispositivos.

## Requisitos e instalação

- Node.js 20.19+ na linha 20, ou 22.12+.
- Navegador moderno com WebGL 2 habilitado.
- npm e acesso ao registro de pacotes na primeira instalação.

Na pasta do repositório:

```sh
npm ci
npm run dev
```

Abra no navegador o endereço e a porta informados pelo Vite. Clique em **Jogar campanha** para a campanha ou **Patrulha livre** para ocorrências variadas ou em **Escolher missão** para selecionar um caso. O jogo não exige conta, API ou configuração de credenciais.

## PC, tablet e controle PlayStation

Na tela inicial, escolha **Automático**, **PC · teclado e mouse**, **Tablet · toque** ou **Controle · PlayStation**. Automático acompanha os dispositivos disponíveis; Tablet mantém os botões de toque visíveis mesmo em um aparelho com mouse conectado. No tablet, a orientação horizontal dá mais espaço para a cidade e os controles; os menus também se ajustam à orientação vertical.

O modo Controle usa a Gamepad API do navegador com o mapeamento padrão. Conecte um DualShock 4, DualSense ou outro controle compatível ao computador ou tablet, abra o jogo e pressione um botão. O indicador da tela inicial mostra se o navegador reconheceu o controle. A compatibilidade depende do navegador e da conexão do dispositivo; os controles físicos de PS4 e PS5 não foram verificados neste ambiente.

Esta é uma versão de navegador com controles PlayStation. Um aplicativo nativo para PS4 ou PS5 depende do SDK, acesso de desenvolvedor e publicação da Sony; os arquivos HTML não são executáveis instaláveis nesses consoles.

## Teclado e mouse

| Entrada | Ação |
| --- | --- |
| W, A, S, D | Mover |
| Arrastar o mouse | Girar a câmera |
| Setas | Girar/inclinar a câmera pelo teclado |
| Espaço | Pular; segurar no ar para planar; sair do gancho planando; sincronizar pulsos no desafio |
| E | Conectar o gancho; repetir para soltar ou encadear outro telhado na chegada |
| J | Executar a sequência de três golpes do combo |
| K | Aplicar chute pesado |
| L | Fazer um mergulho aéreo; exige estar no ar |
| Q | Lançar batarangue com ricochete |
| Z | Usar bomba de fumaça para atordoar guardas próximos |
| Shift | Esquivar |
| C | Agachar/levantar; reduz a detecção na patrulha livre |
| V | Finalização silenciosa por trás de guarda não alertado da patrulha |
| F | Interagir com o objetivo próximo: desativar, resgatar ou coletar |
| R | Ativar/desativar o modo detetive para analisar evidências |
| M | Abrir/fechar o painel de missões |
| T | Abrir/fechar o arsenal de armaduras |
| H | Abrir/fechar ajuda |
| Esc | Pausar/continuar |

Em dispositivos de toque, use os onze botões de ação na tela e arraste a área do jogo para mover a câmera. Segure **Pular / capa** no ar para planar e use **Esquiva** para evitar ataques. **Chute**, **Mergulho** e **Fumaça** têm seus próprios botões. Os desafios possuem botões de sincronização e de frequências; os botões **R** e **T** do HUD dão acesso ao scanner e ao arsenal. O botão de áudio ativa os efeitos sonoros sintetizados.

## Controle PlayStation

Os nomes abaixo seguem o layout do DualShock 4 e do DualSense. O jogo também aceita controles com mapeamento padrão equivalente.

| Entrada | Ação |
| --- | --- |
| Analógico esquerdo | Mover |
| Analógico direito | Girar/inclinar a câmera |
| ✕ | Pular; segurar no ar para planar; sair do gancho planando |
| ○ | Esquivar |
| □ / △ | Combo / chute pesado |
| R1 / L1 | Gancho / batarangue |
| L2 / R2 | Fumaça / interagir |
| Direcional ↑ / ↓ | Scanner / mergulho aéreo |
| Direcional ← / → | Arsenal / painel de missões |
| L3 / R3 | Agachar / finalização por trás na patrulha livre |
| Options | Pausar/continuar |
| Direcional nos menus | Navegar entre os botões |
| ✕ / ○ nos menus | Confirmar / voltar |
| ✕ no transmissor | Sincronizar o pulso |
| Direcional ← / ↑ / → no desafio de frequências | Frequência A / B / C |

## Detalhes gráficos

Escolha **Leve**, **Equilibrado** ou **Cinematográfico** na tela inicial ou no menu de pausa. Leve prioriza fluidez; Cinematográfico exibe mais detalhes da cidade. Equilibrado é a configuração inicial. A preferência gráfica é salva separadamente neste navegador; trocar a qualidade não reinicia XP, níveis, missões concluídas ou armaduras.

## Build e validação

```sh
npm run build
npm test
```

O build de produção é gerado em `dist/`. Para verificá-lo, execute `npm run preview` e abra o endereço informado pelo Vite.

Para gerar uma versão portátil em um único arquivo:

```sh
npm run build:portable
```

Os arquivos incluem o jogo, os estilos e todos os recursos. Você pode baixá-los e abri-los diretamente em um navegador com WebGL 2, sem instalar Node.js nem iniciar um servidor para jogar:

| Arquivo em `dist/` | Modo inicial |
| --- | --- |
| `Batman-Sombras-de-Gotham.html` | Automático |
| `Batman-Sombras-de-Gotham-PC.html` | Teclado e mouse |
| `Batman-Sombras-de-Gotham-Tablet.html` | Botões de toque |
| `Batman-Sombras-de-Gotham-Controle-PlayStation.html` | Gamepad com legendas PlayStation |

Todas as edições contêm as mesmas cinco missões e permitem trocar o modo pela tela inicial. As edições específicas usam o atributo `data-platform` no elemento HTML para selecionar os controles iniciais.

O teste de navegador exige Chromium instalado e o servidor de desenvolvimento já em execução na porta 5173. Em outro terminal, na mesma pasta:

```sh
npm run test:smoke
```

Por padrão, o teste procura Chromium em `/usr/bin/chromium`. Defina `CHROMIUM_PATH` para usar outra instalação. A variável opcional `GOTHAM_URL` permite apontar para outra porta ou servidor. O comando executa os testes de terreno e plataformas em sequência: resgate terrestre e escolta, três anéis com a capa, confronto aéreo, teclado/mouse, toque e gamepad padrão simulado. As capturas ficam em `test-results/`. O mapeamento de controle foi validado por simulação; nenhum PS4/PS5 ou controle Sony físico foi testado.

## Estrutura

- `src/main.js`: fluxo da missão, controles, combate, câmera e HUD.
- `src/world.js`: cidade, personagens e animações procedurais.
- `src/villains.js`: aparência e atributos dos cinco vilões.
- `src/physics.js`: colisões e seleção de alvos do gancho.
- `src/missions.js` e `src/objectives.js`: campanha, objetivos e elementos das missões.
- `src/activities.js`: desafios de sincronização e sequências de frequências.
- `src/progression.js`: XP, níveis, atributos e desbloqueio de armaduras.
- `src/style.css` e `index.html`: interface e controles de toque.
- `scripts/package-portable.mjs`: empacotamento do HTML portátil.
- `tests/`: testes de física e verificação funcional no navegador.

Esta versão é uma base jogável de escopo reduzido: a cidade é finita, os modelos são estilizados e a campanha contém cinco missões.

## Compartilhar com amigos

[Baixe o jogo para compartilhar](https://github.com/nicafigue07-cmd/batman-jogo-3/raw/refs/heads/main/jogar.zip). Extraia e abra **jogar.html** no navegador.

A versão independente `jogar.zip` contém o jogo completo em um HTML, sem downloads de modelos ou dependências ao jogar. Baixe, extraia e abra `jogar.html` em um navegador com WebGL. Cada pessoa joga sua própria partida; não há multiplayer. Para jogar diretamente em um site, o projeto inclui um workflow GitHub Pages. Veja [PUBLICAR.md](PUBLICAR.md) para o estado e a ativação da hospedagem.

Validação das novidades: `node tests/variety-smoke.mjs` verifica controles por teclado/toque, transições e preservação do progresso no navegador; `node tests/patrol-playthrough.mjs` exercita as quatro ocorrências por entradas reais. Use `GOTHAM_URL` para apontar para um servidor diferente de `http://127.0.0.1:5173`.
