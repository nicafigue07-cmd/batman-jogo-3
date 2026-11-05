# Kaito Nami 0.7 — carregamento, travessia e combate

[Jogar em modo leve](https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.7&mode=light) · [Modo normal](https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.7)

Esta entrega é uma etapa do plano 1.0 enviado pelo jogador. Não é a conclusão das 17 fases nem uma afirmação de qualidade AAA. O jogador confirmou que a falha 3D persiste no seu aparelho, mas ainda não forneceu o código/diagnóstico, navegador ou dispositivo. Não afirmamos ter reproduzido ou resolvido essa falha específica.

## Auditoria e tecnologia

A revisão anterior inventariou e leu o legado do repositório inteiro (`AUDITORIA.json`). Nesta etapa foram relidos runtime, renderizador, sistemas, conteúdo, campanha, controlador, interface, build e testes ativos, comparados com o backup da versão 0.6. O legado permanece preservado. A aplicação ativa usa JavaScript sem dependências, WebGL 1/GLSL ES, instancing opcional ANGLE, geometria procedural e física própria (passos limitados, movimento com colisão subdividida, volumes retangulares/circulares e raio de câmera). O minimapa usa Canvas 2D; os sons são sintetizados por Web Audio. Não há download de modelos, texturas ou músicas de terceiros durante a inicialização. O build reúne tudo no HTML com caminhos relativos apropriados ao GitHub Pages.

## Etapa 1 — inicialização, progresso e diagnóstico

**Encontrado:** o modo leve e fallback de shader já existiam, mas o build executava os módulos em uma única sequência síncrona, sem indicação de trabalho concluído. Não havia segunda tentativa de criação do contexto sem antialias quando o normal era recusado, nem fallback automático após erro no primeiro desenho. Um título de erro presente, porém oculto no HTML, podia aparecer numa leitura textual do site; sua presença no HTML não comprova falha ao jogar.

**Implementado:** fila sequencial de módulos em tarefas separadas no build; contador de dez marcos reais, sem porcentagem por tempo; só chega ao fim após desenhar a primeira cena. Falha de módulo interrompe a fila e registra sua etapa. Tentativa adicional de contexto sem antialias. Erro GPU no primeiro quadro normal salva e reabre em modo leve; se o modo leve também falhar, mostra diagnóstico sem repetir o ciclo. Código, versão e etapa ficam visíveis no erro, com detalhes copiáveis; se a área de transferência for negada, os detalhes abrem para cópia manual. Watchdog não acusa falha enquanto a aba está oculta. Mensagem específica para JavaScript desativado. Mantidos shader seguro, recuperação de contexto e preservação de saves existentes.

**Arquivos:** `src/runtime.js`, `src/game.js`, `src/index.html`, `build.mjs`, `tests/startup.cjs`, `tests/bundle.cjs`, `tests/capture-frame.cjs`, `tests/smoke.cjs`.

**Testado:** 11 casos de inicialização; falhas injetadas de shader, módulo e primeiro frame; tentativa leve limitada; conservação da campanha; inicialização do HTML gerado normal/leve com WebGL simulado. Os shaders principal, seguro e instanciado compilam e ligam em Mesa/EGL nativo. Não há navegador interativo disponível nas ferramentas desta sessão.

**Como testar:** abra o link leve acima. Observe os marcos de carregamento, depois clique em Começar/Continuar. Se falhar, informe a linha com versão/código/etapa e copie os detalhes. Teste também modo normal e recuperação, após exportar o progresso pelo menu. A URL nova distingue esta entrega da versão 0.6 em cache.

**Pendente:** diagnóstico do aparelho do jogador; teste de Chrome, Firefox, Safari, celulares, GPU física e perda real de contexto. Não há garantia de execução se o navegador não disponibilizar WebGL.

## Etapa 2 — Surf de Maré, planeio e câmera

**Encontrado:** Surf Rápido já existia, com velocidade fixa e resposta de caminhada. Salto Aquático já dava impulso aéreo. A câmera já tinha suavização e colisões externas/internas.

**Implementado:** Surf de Maré como evolução funcional do Surf Rápido, mantendo o poder e seu desbloqueio. Aceleração e curvas suaves, até 16 unidades/s ao correr (mais bônus de evolução), salto impulsionado e onda/espuma procedural sob Kaito. Deslize de Névoa ao segurar Salto durante a queda, depois de desbloquear Salto Aquático: queda limitada por até dois segundos por salto, sem voo infinito, com consumo de maré. Campo de visão amplia suavemente com a velocidade e volta ao normal; Reduzir movimento mantém 60 graus. Dicas e comandos atualizados; sem copiar recursos de outros jogos.

**Arquivos:** `src/core.js`, `src/game.js`, `src/content.js`, `src/index.html`, `tests/traversal-combat.cjs`.

**Testado:** aceleração, curva, velocidade, colisão em alta velocidade, impulso do surf, gate de história do planeio, tempo máximo, aterrissagem e novo salto. O percurso automatizado das 20 missões passou em 219 segundos simulados, sem teleporte, edição de recursos ou recuperação de posição. Isso não representa duração humana de campanha. Capturado um quadro após ativar o poder pelo controlador e renderizado em EGL sem erro GL.

**Como testar:** após a missão 3, selecione Surf Rápido (tecla 3), use Q e corra com Shift. Espaço salta. Para planar, segure Espaço na descida após desbloquear Salto Aquático. No gamepad, A segura o salto e LB acelera; no toque, use Salto e alternância de Corrida. Reduzir movimento desativa a variação de FOV.

**Pendente:** corrida por paredes, superfícies de telhados, descida de edifícios, transposição automática de obstáculos e avaliação humana da sensação de movimento. Não introduzimos atalhos que atravessem paredes nem superfícies de telhado falsas.

## Etapa 3 — ataque básico, treino, feedback e roupas

**Encontrado:** já havia dez poderes, evolução, defesa, esquiva, inimigos variados e chefe com três fases. Faltava ataque próximo independente dos poderes e uma área para praticar sem avançar a história.

**Implementado:** F executa ataques próximos em três golpes temporizados, com alcance e direção reais, recuperação, impacto, interrupção de ataque inimigo e empurrão no final. Sem custo de maré; ataque aéreo recebe bônus; contra-ataque após escudo é consumido ao acertar. RT no gamepad e botão de toque executam o mesmo método. Atalho F remapeável e persistente. Um alvo azul no pátio da escola de Aonami registra impactos e energia restante, reiniciando após desativação, sem conceder XP infinito nem afetar missões. Indicador de sequência, poses de braços, sons sintetizados de ataque/impacto, passos e timbres por poder. Mochila permite equipar Clássica, Costa Dourada (10 missões) ou Guardião Azul (20), alterando a roupa renderizada e preservando identidade e mochila vermelha. Seleção validada e salva no formato existente.

**Arquivos:** `src/core.js`, `src/game.js`, `src/systems.js`, `src/index.html`, `src/content.js`, `tests/traversal-combat.cjs`, `tests/smoke.cjs`.

**Testado:** combo, alcance/direção, cooldown, custo zero, contra-ataque, conclusão real da missão de combate por ataques, bloqueio durante transporte/interior, treino sem recompensa repetível, desbloqueio e restauração de roupas. Os handlers reais de F e do menu de roupas também passaram no teste do controlador com DOM/WebGL simulados. Testes de teclado, toque e gamepad existentes continuam passando; controles físicos não foram testados.

**Como testar:** aproxime-se do alvo azul junto à escola, olhe para ele e pressione F três vezes com intervalos curtos. O alvo também tem barra de energia e reinicia após dois segundos. Em combate, ataques só atingem robôs próximos à frente. Abra I/Mochila e escolha uma roupa desbloqueada; reinicie para conferir a seleção.

**Pendente:** animações com esqueletos profissionais, câmera de chefes dedicada, dublagem, trilhas extensas, expressões faciais detalhadas e avaliação de equilíbrio com jogadores. Roupas atuais são variações de paleta do modelo procedural, não modelos de vestuário novos.

## Regressão e desempenho

`npm --prefix kaito-nami test` executa inicialização, controlador/menus, 18 regressões de sistemas, 6 testes novos de travessia/combate, percurso das 20 missões e o HTML gerado em ambos os modos. Tudo passou localmente; ver `TESTES-0.7.txt`. As mensagens de erro controladas no log são injeções intencionais de teste. O build não adiciona dependências de rede e mantém versões anteriores.

Renderização nativa de quadros normal, leve, instanciado e surf: sem erro GL. Normal/instanciado produziram imagens idênticas pixel a pixel. No quadro inicial capturado: 1053 draws normais ou 8 com instancing; modo leve 438 draws. Vértices submetidos: 102876 normal e 31908 leve. São contagens de um cenário, não medição de FPS, latência ou dispositivos. Os limites de 30/60 FPS existentes continuam sendo metas de temporização, sem certificação em hardware.

Reproduzir:

```sh
npm --prefix kaito-nami test
npm --prefix kaito-nami run build
LIBGL_ALWAYS_SOFTWARE=1 python3 kaito-nami/tests/shader-egl.py
LIBGL_ALWAYS_SOFTWARE=1 python3 kaito-nami/tests/shader-egl.py --safe
```

Python/EGL exigem as bibliotecas gráficas do sistema. A suíte Node não exige instalar dependências. O CI executa a suíte e compara o build com `index.html` e `jogar/Kaito-Nami.html` antes de considerar a validação concluída. Pacote de fontes: `jogar/Kaito-Nami-0.7.zip`.

## Estado das 17 fases do plano

| Fase | Entrega real e pendências |
|---|---|
| 1 Carregamento | Robustez, progresso e diagnóstico ampliados/testados; falha no aparelho original ainda não identificada. |
| 2 Movimento | Aceleração, saltos, esquiva e planeio; paredes/telhados/transposição ainda pendentes. |
| 3 Travessia | Surf e planeio funcionais; demais técnicas originais propostas ainda não implementadas. |
| 4 Câmera | Suavização, colisões, sensibilidade, diálogo, FOV e redução de movimento; combate/chefe dedicado pendente. |
| 5 Gráficos | Água, espuma, clima e LOD procedurais preservados; modelos/texturas profissionais e reflexos avançados pendentes. |
| 6 Aonami | Escola, loja, moradores, surf e alvo de treino jogáveis; aprofundar bairros e eventos pendente. |
| 7 Hikaru | Torre/elevador, bairros, trânsito e objetivos preservados; telhados exploráveis e interiores extras pendentes. |
| 8 Combate | Poderes, combos próximos, treino, impactos e chefes funcionais; polimento cinematográfico pendente. |
| 9 Kaito | Identidade e idade preservadas, paletas desbloqueáveis; novo modelo/expressões profissionais pendentes. |
| 10 História | 20 missões e saves retestados; expansão e cenas adicionais pendentes. |
| 11 Mundo vivo | Rotas/reação de trânsito e cidadãos existentes preservados; rotinas mais amplas e novos eventos pendentes. |
| 12 Evolução | XP, níveis, upgrades, objetivos e roupas; árvore ampliada de técnicas pendente. |
| 13 Áudio | Síntese original, música e efeitos separados, novos feedbacks; dublagem e trilhas extensas pendentes. |
| 14 Interface | Carregamento real, sequência, dicas, remapeamento e roupas; revisão visual maior pendente. |
| 15 Otimização | Fila de módulos, instancing, LOD, modo leve e limites; benchmark em hardware e frustum culling pendentes. |
| 16 Polimento | Saves, feedbacks e regressões; QA humano e acessibilidade em aparelhos pendentes. |
| 17 Entrega | Fontes/build/testes e atualização no Pages; validação multibrowser e no aparelho do jogador pendente. |

A prioridade seguinte continua sendo reproduzir a falha reportada no aparelho real; depois, polir a pequena área da escola de surf antes de expandir cidades. Nenhum sistema de campanha ou cidade foi apagado.
