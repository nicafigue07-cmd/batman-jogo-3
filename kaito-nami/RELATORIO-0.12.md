# Kaito Nami 0.12 — estabilidade e fluidez

Jogar: https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.12&mode=light

Esta entrega implementa uma etapa verificável do plano. Preserva campanha, cidades, personagens, poderes, arenas, roupas, progresso e acessibilidade. Não declara o projeto inteiro concluído nem equivalência a um jogo comercial de grande orçamento.

## Revisão inicial e bugs críticos

O inventário anterior do repositório, código legado e dependências está em AUDITORIA.json e nos relatórios anteriores. Nesta etapa foram revisados os seis módulos ativos, a página, o build e a suíte existente, com backup anterior à edição. A bateria da 0.11 passou antes das mudanças. O jogo ativo usa WebGL 1, geometria procedural e áudio sintetizado; não carrega modelos ou texturas externos. O HTML gerado incorpora os módulos e não depende de caminhos absolutos ou downloads para funcionar em um subdiretório do GitHub Pages. O código legado permanece preservado.

Encontrado: limitar o delta de cada quadro a 50 ms fazia a simulação perder tempo abaixo de 20 FPS. Encontrado também: o impulso sobrescrevia a velocidade do surf, reduzindo sua aceleração. Não foi reproduzida uma nova falha de shader nesta etapa; os caminhos gráficos normal, instanciado e leve compilaram e ligaram no EGL/Mesa. A antiga falha do aparelho do jogador ainda exige o diagnóstico daquele navegador para confirmar sua causa.

Implementado: passo fixo de 1/60 s antes do limite de desenho. Renderizar a 30 FPS não reduz a frequência da física quando o navegador continua fornecendo quadros. Cada atualização aceita no máximo oito passos; travamentos longos descartam e registram o excesso para evitar uma recuperação que congele a interface. Isso não garante 60 FPS. Pausa e diálogos não acumulam física para depois.

Arquivos: src/systems.js, src/game.js. Testes: baseline e npm test; testes novos com movimento e salto equivalentes a cadências sintéticas de 15, 30 e 60 Hz, além de travamento longo com recuperação limitada. Um teste do controle completo confirmou deslocamento e tempo de mundo idênticos com limites de desenho em 30/60 FPS. Como verificar: comparar corrida/saltos com limite 30/60 nas configurações. Pendente: medições em hardware e navegadores reais.

## Movimento e câmera

Implementado: tolerância de 100 ms para saltar logo depois de sair de uma borda, sem permitir saltos extras no ar; mistura gradual da postura visual ao entrar/sair da água; passada específica de corrida na parede e postura curta de surf. Preservados aceleração, desaceleração, aterrissagem, escalada, planeio e câmera com verificação de obstáculos e busca de órbita livre. Não foi criado um novo conjunto de animações esqueléticas profissionais.

Arquivos: src/core.js, src/game.js. Testes: salto na borda, rejeição de segundo salto aéreo e regressões existentes de câmera, parede, teto, degraus, prédios, móveis, telhados e trem. Como verificar: andar para fora de um telhado baixo e tocar Salto imediatamente; experimentar a câmera perto de paredes e guarda-sóis. Pendente: avaliação manual da sensação de controle em toque/gamepad físicos e refinamento artístico.

## Travessia aquática

Implementado: Surf Rápido continua após os oito segundos originais enquanto Corrida estiver pressionada, houver movimento, energia e o personagem estiver fora de interiores. A sustentação consome 10 de energia/s, além da regeneração existente de 7/s: perda líquida de 3/s. Ao soltar, a curta reserva restante termina em até 160 ms. Energia insuficiente encerra a habilidade e impede reativação automática infinita pela regeneração. O impulso agora usa a maior velocidade aplicável e não diminui o surf. Descrição da habilidade e HUD explicam o estado de sustentação. Mantidos desbloqueios e circuitos existentes.

Arquivos: src/core.js, src/game.js. Testes: surf com impulso, quinze segundos de sustentação, liberação do comando e esgotamento sem pulsos infinitos. Como verificar: selecionar Surf Rápido (3), usar Q, mover e segurar Shift/LB/Corrida no toque; observar a barra de maré e soltar o comando. Pendente: trajetos novos e análise de equilíbrio com jogadores.

## Combate

Implementado: entrada antecipada de ataque nos últimos 120 ms da recarga, com reserva de comando de 180 ms; permite encadear o próximo golpe sem exigir o instante exato e rejeita apertos muito antecipados. Pausa e diálogos limpam a reserva. A defesa tem prioridade visual sobre a névoa no HUD. Mantidos poderes, inimigos, chefes, mira, reações, arenas, recompensas e evolução de dano.

Arquivos: src/core.js, src/game.js. Testes: sequência real de dois golpes com entrada antecipada, rejeição de spam antecipado e regressões de combate, defesa, missão de luta e salvamento. Como verificar: usar F/RT/Ataque próximo ao fim da recarga do golpe anterior. Pendente: novas animações, outros padrões de chefe e avaliação manual do equilíbrio.

## Desempenho e diagnóstico

Implementado: histórico circular de até 120 intervalos de desenho, FPS calculado pela duração das amostras, p95 do tempo de quadro e duração do trabalho JavaScript desde o último desenho. Pausas acima de um segundo são contadas separadamente. O diagnóstico registra tempo até o primeiro quadro pronto e etapas de carregamento. A opção Exportar desempenho baixa JSON com essas medidas, tamanho do canvas, qualidade, limite, chamadas de desenho, instancing e tempo de simulação descartado. Memória JS aparece somente quando performance.memory está disponível; caso contrário informa indisponível. Não mede memória da GPU nem tempo de GPU. O arquivo é baixado localmente, sem envio de telemetria.

Arquivos: src/runtime.js, src/systems.js, src/game.js, src/index.html. Testes: relógio controlado de inicialização, janela limitada de amostras, cálculo de FPS/p95, memória opcional e acionamento real do botão de exportação com progresso preservado. Como verificar: jogar alguns minutos, abrir configurações e Exportar desempenho. Pendente: coleta em computador/celular reais; não há números de FPS de hardware para declarar nesta entrega.

## Resultados executados

- npm test: êxito, 76 casos node:test mais verificações de integração, UI e percurso da campanha. Log completo: TESTES-0.12.txt.
- As 20 missões foram percorridas pela simulação, sem teletransporte ou edição de recursos: 186 segundos simulados, zero recuperações. Não é uma partida manual nem um tempo esperado para jogadores. Outros testes de sistemas usam fixtures explícitas para exercitar situações isoladas.
- Controles de teclado, toque e gamepad foram acionados em ambiente DOM/WebGL simulado, incluindo menus, poderes, mira, defesa, roupas, exportação/importação e salvamento. Isso não substitui periféricos e navegadores reais.
- Build independente iniciou pela fila de tarefas e desenhou a primeira cena nas qualidades normal e leve, com WebGL simulado.
- shader-egl.py e --safe: compilação e ligação aprovadas. Capturas do build reproduzidas no EGL/Mesa por software, inspecionadas: cena inicial normal com 166 chamadas, leve com 148, instanciada com oito. Imagens normal e instanciada idênticas pixel a pixel. São contagens da cena inicial; não FPS e não custos de todo o mundo.
- Pacote ZIP verificado por CRC e cópias publicadas comparadas com o HTML gerado.

## Arquivos alterados nesta etapa

src/runtime.js, src/systems.js, src/core.js, src/game.js, src/index.html; package.json; tests/startup.cjs, tests/smoke.cjs, tests/fluidity.cjs; README.md da raiz e da pasta do jogo; RELATORIO-0.12.md e TESTES-0.12.txt. Artefatos gerados: index.html, jogar/Kaito-Nami.html, output/Kaito-Nami.html e jogar/Kaito-Nami-0.12.zip. src/renderer.js e src/content.js foram preservados.

## O que continua pendente no plano amplo

Aonami e Hikaru mantêm atividades e sistemas existentes; não receberam novos bairros nesta etapa. As vinte missões passaram nos testes e não foram substituídas, mas novos diálogos/cenas e missões secundárias ainda exigem trabalho próprio. Materiais, animações e expressões continuam procedurais e simples. Reflexos avançados, arte detalhada, novos chefes e polimento comparável às referências não estão concluídos. Chrome, Firefox, Safari, Android/iOS, áudio percebido, gamepads físicos e desempenho em aparelhos modestos ainda precisam de testes interativos. A prioridade seguinte é usar medições reais para orientar ajustes e validar controles/câmera antes de ampliar conteúdo.
