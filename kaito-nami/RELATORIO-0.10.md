# Kaito Nami 0.10 — bairros, arenas, skins e dano progressivo

[Jogar em modo leve](https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.10&mode=light) · [Modo normal](https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.10)

## Referência solicitada

Consultei as descrições oficiais da [PlayStation sobre novidades de Spider-Man 2](https://www.playstation.com/en-ph/games/marvels-spider-man-2/whats-new-in-marvels-spider-man-2/) e a [apresentação oficial de gameplay](https://blog.playstation.com/2023/05/24/marvels-spider-man-2-gameplay-revealed/). As referências relevantes são travessia aérea, defesa no tempo certo, evolução, estilos de trajes e atividades urbanas. Em Kaito, essas ideias são adaptadas a poderes marítimos e personagens próprios. Não importei modelos, mapas, músicas, história ou personagens da Marvel.

Não foi implementado literalmente tudo de Spider-Man 2. Esta entrega cobre as mudanças concretas pedidas: mais prédios físicos, luta fora da praia, uma skin por missão, crescimento de dano e nova verificação do início 3D. Troca entre dois heróis, rede completa de gadgets/furtividade, produção cinematográfica e o conjunto integral de sistemas daquele jogo não estão presentes.

## 1. Mais prédios e exploração fora da praia

**Encontrado:** já existiam bairros nas duas cidades, telhados físicos e travessia de parede, mas havia grandes intervalos vazios entre as regiões.

**Implementado:** 31 prédios adicionais, sendo 15 em Aonami e 16 em Hikaru, com avenidas de acesso. O mesmo registro determina posição, dimensões, altura renderizada, colisão no chão e superfície do telhado. Os prédios de Hikaru também entram no sistema de equipamentos e câmera dos telhados. Colocação evita sobrepor os obstáculos existentes. Nenhuma missão, bairro, personagem ou prédio anterior foi removido. Os identificadores antigos de telhados permanecem estáveis para saves da versão 0.9.

**Arquivos:** `src/core.js`, `src/game.js`, `tests/expansion.cjs`.

**Testado:** todos os 31 novos prédios bloqueiam caminhada no chão; cada superfície tem correspondência com o registro visual e restaura save em altura. Testes antigos de subida/queda/câmera continuam passando. As 20 missões foram percorridas novamente com navegação real, sem teleporte, edição de recursos ou recuperação de posição; tempo simulado de 222 segundos, não duração de partida humana.

**Como testar:** use WASD/setas e Shift para seguir as estradas para o interior de Aonami. M abre o mapa; os bairros não ficam restritos à praia. Após desbloquear a travessia de parede, Corrida + Salto junto a fachadas planas permite explorar os telhados. Hikaru continua ligada à campanha e ao barco do porto.

**Pendente:** nem todos os prédios têm interiores; os modelos continuam procedurais. Não há simulação de demolição ou motor de corpos rígidos para derrubar edifícios.

## 2. Inimigos e novas arenas

**Implementado:** duas arenas opcionais, Treino do Centro em Aonami e Sentinelas da Avenida em Hikaru. São grupos reais de três/quatro robôs com os comportamentos existentes de batedor rápido, atirador e sentinela. Vitalidade escala com progresso. Após a terceira missão, Interagir junto ao marcador vermelho inicia a luta. A primeira vitória em cada arena rende um ponto de evolução; repetir não gera pontos infinitos. A missão principal permanece intacta. Há objetivo, instruções e marcadores no HUD/minimapa.

Estado da arena e vitalidade dos robôs são salvos. Interagir novamente na placa cancela. Avançar na campanha ou trocar de cidade encerra a arena, impedindo que substitua inimigos obrigatórios ou siga indevidamente o barco.

**Defesa aquática:** G, LT no gamepad ou botão Defesa no toque abre uma janela de 0,3 s, com recarga de 1,1 s. Acertar o momento do impacto bloqueia dano, interrompe o robô e concede contra-ataque. Apertar cedo demais não protege depois que a janela expira. Mantidos F para combos, Q para poderes, R para esquiva e C para mira.

**Arquivos:** `src/core.js`, `src/game.js`, `src/systems.js`, `src/index.html`, `tests/expansion.cjs`, `tests/smoke.cjs`.

**Testado:** ambas as arenas foram vencidas usando movimento, mira e ataques, sem modificar recursos ou posições durante a luta. Também foram testados início, cancelamento, HP salvo/restaurado, recompensa única, isolamento da campanha e troca de cidade. Defesa valida desbloqueio, timing, expiração, recarga e contra-ataque. Os handlers reais de interação, G e LT foram exercitados com DOM/gamepad simulados. Quadros com robôs e prédios foram renderizados em EGL.

**Como testar:** após concluir três missões, abra M e procure os pontos vermelhos. Vá ao centro de Aonami ou à avenida de Hikaru, use Interagir na placa e feche o diálogo. Posicione-se perto dos robôs, mire com C e ataque com F/Q. Use G pouco antes de receber o impacto indicado. Para cancelar, volte à placa e use Interagir.

**Pendente:** outros tipos de inimigo e encontros mais elaborados, furtividade e testes humanos de equilíbrio. As arenas reutilizam três comportamentos já existentes; não são personagens da Marvel.

## 3. Uma skin por missão e evolução do dano

**Implementado:** vinte novas skins originais, uma liberada a cada missão concluída. Incluem paletas próprias e quatro padrões de detalhes geométricos (faixa, gola, braceletes e adorno), preservando Kaito como menino japonês de 12 anos e sua mochila vermelha. Não são vinte modelos 3D esqueléticos novos. As três roupas antigas permanecem: há 23 opções no total, incluindo a roupa inicial. Skins são cosméticas e o progresso antigo libera automaticamente as correspondentes às missões já concluídas.

A Mochila mostra nomes, bloqueios por missão e seleção; a escolha persiste no save. O modelo renderizado usa as cores e detalhes escolhidos. Ao concluir uma missão, um aviso informa a skin liberada.

O bônus de dano passa a ser `max(0, missões concluídas - 3) + 2 × (nível - 1)`. Aplica-se ao ataque próximo e aos poderes ofensivos, somado aos bônus de combo, contra-ataque e upgrades. Não depende da skin equipada. Custos e cooldowns dos poderes foram preservados. O inventário mostra o bônus atual.

**Arquivos:** `src/core.js`, `src/game.js`, `tests/expansion.cjs`, `tests/traversal-combat.cjs`, `tests/smoke.cjs`.

**Testado:** desbloqueio/bloqueio e restauração de cada uma das vinte skins; compatibilidade das roupas antigas; aumento do bônus por missão e impacto efetivo; handler real da mochila equipa e salva a nova skin. Capturado/renderizado um quadro com skin desbloqueada, além do cenário urbano usando outra skin.

**Como testar:** conclua uma missão, abra I/Mochila e procure a skin com o nome correspondente. Equipe-a, volte ao jogo e reinicie para conferir a seleção. Consulte o bônus de dano na mochila e compare ataques antes/depois de avançar a campanha.

**Pendente:** novos modelos de vestuário completos, física de tecidos e animações próprias por traje.

## 4. O cenário 3D inicia?

**Nos testes disponíveis, sim:** o HTML gerado concluiu a fila de carregamento e o primeiro frame normal/leve nos testes de controlador com WebGL simulado. Os shaders foram compilados/ligados e os comandos executados pelo renderizador nativo Mesa/EGL, sem erro GL. Foram renderizados quadros inicial normal, inicial leve, arena urbana normal/instanciada/leve e skin desbloqueada.

Na arena capturada, o caminho normal sem instancing usou 2280 chamadas, o instanciado oito e o leve 672. As imagens normal e instanciada foram idênticas pixel a pixel. São contagens de um quadro, não benchmark de FPS. Nenhuma promessa de 30/60 FPS em todos os aparelhos.

Isso não é um teste em Chrome/Firefox/Safari nem uma confirmação de execução no aparelho do jogador. A falha antes reportada ainda não veio acompanhada de navegador, dispositivo ou diagnóstico. Se persistir, a tela tem versão, código/etapa e Copiar detalhes para investigação. Não afirmo ter resolvido uma causa que não foi reproduzida nesse aparelho.

**Arquivos/testes:** `tests/startup.cjs`, `tests/smoke.cjs`, `tests/bundle.cjs`, `tests/capture-frame.cjs`, `tests/render-native.py`, `tests/shader-egl.py`; `src/runtime.js` foi atualizado para diagnóstico 0.10.0.

## Validação e entrega

A suíte completa passou: inicialização/recuperação, controlador/menus, regressões de colisão/câmera/controles, travessia/combate, mira/circuito, verticalidade/ciclo, sete novos casos de expansão, percurso das vinte missões e HTML gerado normal/leve. O log está em `TESTES-0.10.txt`; erros controlados no log são injeções intencionais. Sem testes em dispositivos físicos.

```sh
npm --prefix kaito-nami test
npm --prefix kaito-nami run build
```

O CI roda essa suíte e compara o build com `index.html` e `jogar/Kaito-Nami.html`. O HTML continua independente de rede. Fontes, testes, licença e relatórios estão em `jogar/Kaito-Nami-0.10.zip`. `package.json`, READMEs e documentação foram atualizados; os arquivos legados e todas as versões anteriores foram preservados.
