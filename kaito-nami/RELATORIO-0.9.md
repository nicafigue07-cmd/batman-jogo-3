# Kaito Nami 0.9 — exploração vertical, áudio, ciclo diário e otimização

[Jogar em modo leve](https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.9&mode=light) · [Modo normal](https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.9)

Esta atualização implementa novas pendências do plano, preservando os sistemas existentes. Não declara concluídas todas as 17 fases, nem equipara os gráficos procedurais à produção de um jogo AAA. Os relatórios 0.7/0.8 registram as etapas anteriores e o estado geral do plano.

## Etapa 6 — paredes, apoio em telhados e descida

**Encontrado:** o movimento usava colisões horizontais e altura de salto, mas não havia superfícies físicas nos telhados. Apenas deixar Kaito subir visualmente produziria pisos falsos e saves inválidos.

**Implementado:** catálogo compartilhado de alturas, paredes, coberturas e equipamentos; apoio real, aterrissagem e queda ao sair da borda. Há telhados planos de 19 prédios em Aonami e 44 em Hikaru, além das superfícies dos equipamentos e degraus de treino. Não inclui todos os telhados inclinados ou a cobertura decorativa da Torre Hikari. As fachadas de fundo que receberam telhados também receberam colisões no chão.

Corrida aquática vertical: após desbloquear Corrida das Marés, aproximar-se de uma parede plana segurando Corrida + Salto produz subida real, limitada a três segundos (a evolução de Salto Aquático amplia o tempo). Soltar Corrida e segurar Salto permite deslizar pela parede; tocar Salto novamente sem Corrida dá impulso para fora, com custo de quatro pontos de maré e cooldown. Movimento lateral acompanha os comandos. Não atravessa a parede nem teleporta ao topo.

Há degraus de treino perto da praia que o controlador sobe automaticamente em incrementos pequenos. Animações procedurais de apoio/corrida, água junto à parede e indicador de altitude acompanham a simulação. A câmera segue a altura completa de Kaito. O save guarda uma superfície identificada e validada; carregar em um telhado restaura a posição em altura. Um save no ar pode retomar na superfície válida abaixo, ou numa posição segura no chão; não retoma um salto em andamento.

**Arquivos:** `src/core.js`, `src/game.js`, `src/index.html`, `src/content.js`, `tests/vertical.cjs`.

**Testado:** cada um dos três telhados com sensores foi alcançado da rua por movimento/corrida/salto reais, sem editar posição ou altura durante a subida. Testes cobrem apoio, borda, queda, bloqueio contra parede, impulso, descida, limite de história, degraus e roundtrip de save em altura. Todas as 20 missões continuam concluíveis por navegação automatizada.

**Como testar:** depois de desbloquear Corrida das Marés, vá a um prédio de telhado plano em Hikaru. Segure Shift + Espaço e mova-se contra a parede. Solte os botões ao alcançar a cobertura. Para descer, aproxime-se da borda e segure Salto junto à parede; sem parede, o planeio curto existente continua funcionando. No toque, ative Corrida e segure Salto; no gamepad, LB + A. Telhados altos podem exigir evolução de Salto Aquático ou uma rota por coberturas menores.

**Pendente:** animações esqueléticas profissionais, superfícies inclinadas completas, escalada livre de toda geometria, cobertura da torre e avaliação humana de todas as bordas/rotas. As interações do chão não são acionadas do alto do telhado; ataque próximo não atinge robôs no chão a mais de três metros de altura.

## Etapa 7 — exploração vertical com recompensa

**Implementado:** missão secundária dos três sensores de Yuna nos telhados baixos do centro de Hikaru. Cada sensor tem posição em altura, objeto visível e interação E/Interagir. A mochila mostra a contagem. Recolher os três concede um ponto de evolução uma única vez. Progresso validado e persistente no formato de save existente, sem substituir as 20 missões principais.

**Arquivos:** `src/core.js`, `src/game.js`, `src/content.js`, `tests/vertical.cjs`.

**Testado:** acesso físico aos três telhados, interação na altura certa, recompensa, proteção contra repetição e restauração do orçamento de upgrades. O teste não afirma ter percorrido toda a cidade continuamente entre os três: cada acesso começa numa posição válida da rua próxima ao respectivo prédio.

**Como testar:** após chegar a Hikaru, procure os marcadores dourados nos três prédios baixos próximos ao centro/entrada. Suba, aproxime-se do sensor na borda frontal e pressione Interagir. Consulte I/Mochila. Reinicie e confira a contagem.

**Pendente:** desafios verticais maiores, novos interiores e expansão narrativa extensa.

## Etapa 8 — áudio, leitura de diálogos e ciclo diário

**Implementado:** novas sequências musicais sintetizadas originais para praia, cidade, combate, chefe, tempestade, diálogo e encerramento. Música e efeitos continuam separados. Leitura opcional do texto dos diálogos pela síntese de voz do navegador, em português solicitado, com volume independente, cancelamento ao fechar/pausar e tratamento de indisponibilidade. É acessibilidade por voz do navegador, não dublagem produzida para os personagens. A qualidade/disponibilidade da voz depende do aparelho.

Ciclo de oito minutos de tempo ativo para um dia completo, relógio no HUD, iluminação/céu variáveis nas duas cidades, janelas e postes com material emissivo mais aparente à noite. É emissão visual; os postes não projetam iluminação física nem sombras volumétricas. A opção Ciclo de dia e noite pode ser desligada, mantendo o visual fixo por cidade. O tempo é salvo e restaurado. Cidadãos retornam ao ponto de descanso do bairro à noite; não fingimos que entram em casas com interiores inexistentes.

**Arquivos:** `src/systems.js`, `src/core.js`, `src/game.js`, `src/index.html`, `tests/vertical.cjs`, `tests/smoke.cjs`.

**Testado:** relógio/ciclo de luz, retorno noturno, preferências e limites de volume. Com API de voz simulada, o controlador envia o diálogo real, idioma, volume salvo e cancelamento. Shaders principal/seguro/instanciado compilam/ligam em Mesa/EGL com o novo material. Um quadro noturno em telhado foi renderizado e inspecionado.

**Como testar:** ative música nas opções. Ative Ler diálogos em voz alta e ajuste o volume de leitura; converse com Ren. Se o navegador não oferecer síntese de voz, a opção informa indisponibilidade. Observe o relógio e a passagem do tempo; desative o ciclo para visual fixo. O ciclo só avança com a simulação, não enquanto o menu está pausado.

**Pendente:** trilhas gravadas/produzidas mais extensas, dublagem própria, expressões faciais sincronizadas, luzes físicas e testes auditivos em aparelhos reais.

## Etapa 9 — descarte fora da visão e câmera em espaços apertados

**Implementado:** extração dos seis planos da câmera em armazenamento reutilizado e descarte conservador de objetos inteiramente fora da visão. O volume inclui rotação/tamanho; mar e céu têm tratamento próprio. Instancing, distância configurável, LOD e modo leve existentes continuam disponíveis.

A validação do telhado revelou que um equipamento atrás de Kaito podia encobrir o enquadramento. Agora, se a câmera ficar perto demais, procura um ângulo livre ao redor do personagem, mantendo teste de colisão em todos os candidatos. Evita iniciar a partida com a câmera dentro da mochila. A restauração no telhado também corrige eventuais sobreposições com equipamentos.

**Arquivos:** `src/systems.js`, `src/core.js`, `src/game.js`, `tests/vertical.cjs`, `tests/capture-frame.cjs`, `tests/bundle.cjs`, `tests/smoke.cjs`.

**Testado:** volumes dentro/fora/intersectando o campo de visão; armazenamento reutilizado; busca de câmera sem cruzar o obstáculo. Na cena inicial capturada, 1059 desenhos sem descarte passaram a 166 com descarte; as imagens nativas foram idênticas pixel a pixel. O modo instanciado desenhou o mesmo quadro em oito chamadas, também com imagem idêntica. O modo leve capturado teve 148 chamadas. São contagens dessa cena, não medição de FPS/latência ou garantia de 30/60 FPS.

**Como testar:** compare baixa/média/alta e ative o contador de FPS/desenhos. Gire a câmera; o número de objetos enviados varia com a visão. Em cima de um telhado, aproxime-se dos equipamentos e confira o ajuste de enquadramento. Reduzir movimento continua disponível.

**Pendente:** benchmarks em GPU física e aparelhos modestos, verificação de outros casos de câmera e otimização guiada por perfil de navegadores.

## Validação e entrega

`npm --prefix kaito-nami test` passou: inicialização, controlador/menus, 18 regressões, 6 testes de travessia/combate, 7 de mira/circuito, 7 novos de verticalidade/ciclo/câmera, navegação da campanha e pacote HTML normal/leve. O percurso das 20 missões levou 222 segundos simulados, sem teleportar, editar recursos ou acionar recuperação. Não equivale à duração de uma partida humana.

Compilação/ligação de shaders e renderização nativa Mesa/EGL passaram para normal, instanciado, leve e telhado noturno. Culling e instancing preservaram a imagem exata da cena inicial. Não foram testados Chrome/Firefox/Safari, celulares, vozes ou controles físicos neste ambiente. Mensagens de erro controladas na suíte são injeções intencionais de falhas. O log final está em `TESTES-0.9.txt`.

Build: `npm --prefix kaito-nami run build`. HTML independente em `index.html` e `jogar/Kaito-Nami.html`, sem dependências de rede. ZIP com fontes, testes, licença e relatórios: `jogar/Kaito-Nami-0.9.zip`. O CI executa a suíte e compara ambos os HTML publicados ao build. Nenhum arquivo legado, missão ou entrega anterior foi apagado. Também foram atualizados `package.json`, `src/runtime.js` (versão de diagnóstico) e os READMEs.

## O que ainda falta do plano maior

Os relatórios anteriores continuam válidos para recursos preservados. Nesta versão foram implementadas várias pendências funcionais de paredes/telhados, exploração, áudio, ciclo diário e otimização. Permanecem modelos e texturas profissionais, animações esqueléticas/expressões/cenas extensas, expansão completa das cidades/interiores/história, luzes e reflexos avançados, trilha/dublagem produzidas e QA real em diferentes equipamentos. Não há como certificar essas partes apenas com os testes automatizados disponíveis.

A falha 3D reportada no aparelho do jogador continua sem diagnóstico fornecido. As proteções de inicialização das versões anteriores permanecem testadas, mas não declaramos corrigida essa falha específica. Se reaparecer, a tela mostra versão, código e etapa, com Copiar detalhes para identificar a causa real.
