# Kaito Nami 0.8 — mira, câmera e circuito de Aonami

[Jogar em modo leve](https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.8&mode=light) · [Modo normal](https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.8)

O novo arquivo de requisitos mantém o plano original: referência de fluidez e liberdade de jogos de super-heróis, com identidade própria e mudanças progressivas. Esta entrega preserva a versão 0.7 e as 20 missões. Não é uma conclusão das 17 fases nem equivalência visual ou de produção a Marvel's Spider-Man 2.

## O que foi entregue desde a versão 0.6

A 0.7 adicionou carregamento por dez marcos reais, nova tentativa de contexto e primeiro frame em modo leve, Surf de Maré com aceleração e curvas, planeio curto, campo de visão dinâmico, ataques próximos em três golpes, alvo de treino, feedback sonoro e duas paletas de roupa desbloqueáveis. Seus arquivos, testes e pendências estão no [relatório 0.7](RELATORIO-0.7.md). A validação e o Pages dessa versão passaram antes de começar este conjunto.

A 0.8 avança nas próximas etapas abaixo. Não reescreve o motor nem troca os recursos originais por conteúdo de outro jogo. A arquitetura continua JavaScript/WebGL 1 com física própria, modelos procedurais, Canvas 2D e áudio sintetizado; o pacote é independente de downloads externos. A auditoria do legado permanece em `AUDITORIA.json`; todo o runtime ativo foi revisto e os backups anteriores preservados.

## Etapa 4 — mira e câmera de combate

**Encontrado:** a câmera já seguia Kaito e colidia com paredes, mas não oferecia marcação de inimigo ou enquadramento de combate. Os poderes dependiam inteiramente da direção de movimento.

**Implementado:** C marca/libera o robô vivo mais próximo, até 26 unidades, com verificação de linha de visão. Alvo morto, oculto por parede, fora de alcance ou durante transporte é liberado. Ataque e poder orientam Kaito para o alvo marcado antes de executar. A câmera acompanha suavemente o enquadramento do combate; chefes recebem distância e FOV extras. Rotação manual tem precedência e Reduzir movimento desativa ajustes automáticos. Mira exibida no cenário e HUD com vitalidade/fase do alvo. Botão de toque e R3 executam o mesmo comando. C torna-se reservado para impedir conflito com atalhos salvos.

**Arquivos:** `src/core.js`, `src/systems.js`, `src/game.js`, `src/index.html`, `tests/focus-course.cjs`, `tests/smoke.cjs`.

**Testado:** seleção, liberação, alcance, morte e parede; suavização equivalente com passos de 30/60 Hz; limites do enquadramento e acessibilidade. Handlers reais de C, toque e R3 simulados alteram alvo/HUD. Renderização nativa EGL de quadro com mira ativa passou sem erro GL.

**Como testar:** numa missão de combate, use C (ou R3/Mira no toque). O robô marcado recebe aro branco e indicador; F/Q orientam o ataque para ele. C novamente libera a mira. Ative Reduzir movimento nas opções para manter câmera e FOV manuais. A câmera continua limitada pelas paredes.

**Pendente:** testar conforto e equilíbrio com jogadores, navegadores e controles físicos; animações cinematográficas profissionais e variações mais elaboradas de chefe.

## Etapa 5 — circuito jogável na escola de Aonami

**Encontrado:** havia aula de surf e desafio sobre a água, mas faltava um percurso que combinasse aceleração, curva e salto.

**Implementado:** placa azul no pátio da escola inicia o circuito opcional Corrente Azul após concluir três missões. Cinco anéis ordenados atravessam praia e água; o segundo exige altura real de salto, e todos exigem Surf Rápido ativo. Cronômetro de 25 segundos começa no primeiro anel. HUD, minimapa, objetivo e diálogo indicam a sequência. A primeira conclusão concede um ponto de evolução; repetições melhoram recorde sem gerar pontos infinitos. Recorde e recompensa persistem no save compatível versão 5. Interagir novamente na placa cancela; falha permite tentar de novo. Viagem rápida não pode pular o percurso; derrota ou troca de cidade cancelam a tentativa.

**Arquivos:** `src/core.js`, `src/game.js`, `src/index.html`, `tests/focus-course.cjs`, `tests/smoke.cjs`, `tests/capture-frame.cjs`.

**Testado:** início por interação real, surf obrigatório, salto obrigatório, timeout, cancelamento, retorno, recorde, recompensa única e orçamento de upgrades restaurado. Um teste percorreu todo o circuito usando apenas os comandos de movimento, corrida, salto e ativação de surf, sem reposicionar Kaito entre anéis. Cenário com circuito ativo foi capturado pelo controlador e renderizado em EGL.

**Como testar:** perto da escola de surf, procure a placa azul com marcador dourado e pressione E/Interagir. Feche o diálogo, selecione Surf Rápido (3) e use Q. Shift acelera. Siga os anéis e salte antes do segundo. O relógio começa só no primeiro. A mochila mostra o melhor tempo. Os comandos equivalentes de toque e gamepad continuam disponíveis.

**Pendente:** mais circuitos, superfícies de telhado, corrida de parede, expansão de atividades/interiores e polimento artístico maior da escola/bairros. Esta etapa não acrescenta cidades vazias nem promete que Aonami inteira está finalizada.

## Correção adicional encontrada nos testes gráficos

O quadro do circuito revelou uma câmera quase colada em Kaito: os guarda-sóis eram volumes sólidos do chão até 4,4 m, embora só a cobertura e o poste devessem bloquear a câmera. Isso podia encobrir a cena sem erro de shader. Não atribuímos a essa descoberta a falha de inicialização reportada pelo jogador.

Agora o raio respeita altura mínima e máxima: cobertura entre aproximadamente 2,4 e 3,2 m, poste estreito até 2,6 m. Alturas da escola e loja também correspondem melhor à geometria renderizada. Um teste verifica passagem abaixo da cobertura e bloqueio na altura correta. O quadro anteriormente encoberto voltou a renderizar com cores e enquadramento válidos no teste nativo, sem remover a validação gráfica.

Arquivos: `src/core.js`, `src/systems.js`, `tests/focus-course.cjs`. Pendente: avaliar outros objetos e trajetórias de câmera em aparelhos reais.

## Validação da entrega

- `npm --prefix kaito-nami test`: inicialização, controlador, 18 regressões, 6 testes de travessia/combate, 7 de mira/circuito/câmera, todas as 20 missões por navegação e HTML gerado normal/leve.
- Campanha percorrida em 219 segundos simulados, sem teleporte, edição de recursos ou recuperação de posição. Não é duração de uma partida humana.
- Shaders normal, seguro e instanciado compilados/ligados em Mesa/EGL. Quadros normal, instanciado, leve, mira e circuito renderizados sem erro GL; os quadros inicial normal/instanciado comparados ficaram idênticos pixel a pixel.
- No quadro inicial antes da correção vertical da câmera: 1056 desenhos sem instancing, 8 com instancing e 441 no modo leve. São contagens pontuais, não benchmark de FPS nem comprovação das metas 30/60 em hardware.
- `TESTES-0.8.txt` contém a execução final da suíte. O CI também executa a suíte e compara o build aos arquivos publicados. As mensagens de erro injetadas nos testes são intencionais.

Não há testes reais de Chrome/Firefox/Safari, celular ou gamepad físico nesta sessão. Não recebemos o diagnóstico do aparelho em que o jogador ainda vê falha 3D. O carregamento ganhou proteção e diagnóstico nas entregas anteriores, mas essa falha específica segue sem causa confirmada. Se ocorrer, envie a versão/código/etapa mostrados na tela e o conteúdo de Copiar detalhes, junto com navegador e aparelho.

## Arquivos adicionais de entrega

`package.json` versão 0.8 e novo teste; `src/runtime.js` com versão de diagnóstico atualizada; `README.md`; este relatório; `TESTES-0.8.txt`; HTML independente em `index.html` e `jogar/Kaito-Nami.html`; ZIP com fontes/testes/licença em `jogar/Kaito-Nami-0.8.zip`. Arquivos legados e entregas anteriores permanecem preservados.

O quadro completo das 17 fases e suas pendências está no relatório 0.7. Esta etapa acrescenta mira, câmera de combate/chefe e circuito àquele quadro. Permanecem pendentes sobretudo corrida de paredes/telhados, modelos e animações profissionais, expansão narrativa e urbana, trilhas/dublagem e QA em aparelhos reais. A prioridade continua sendo a falha no aparelho do jogador antes de ampliar gráficos pesados.
