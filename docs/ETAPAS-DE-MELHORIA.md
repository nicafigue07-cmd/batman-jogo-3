# Desenvolvimento em etapas — Kaito Nami

Base de referência: 4e15a98. Esta entrega cobre uma rodada incremental nas cinco etapas: **Fundação, Movimentação, Combate, Cidades e Polimento**. Os sistemas e salvamentos existentes foram mantidos. Não declara concluídos os 72 objetivos do plano.

## Etapa 01 — Fundação

Código analisado: `main.js`, `physics.js`, `camera.js`, `simulation.js`, `adventure.js` e consultas de colisão.

Concluído nesta rodada:

- Temporizadores de combate, esquiva, combo e impulso continuam avançando no mar.
- Atualização da aventura acompanha os mesmos subpassos da física, em vez de um passo grande por frame.
- Projéteis usam a primeira interseção contínua com o personagem; tiros rápidos não dependem de atingir exatamente a posição final do frame.
- Golpes, jatos e ricochetes não selecionam inimigos através de paredes.
- Controles de câmera por setas e movimento por analógico funcionam no mar.
- Escape fecha mapa/foto, e a aproximação da foto não altera permanentemente a câmera de jogo.
- Carregamento legível, diagnóstico de abertura, resolução adaptativa e colisão contínua da câmera existentes foram preservados.

Validação: suíte Node, teste de consultas de colisão e `adventure-smoke.mjs`, incluindo recarga de combate enquanto o personagem está no mar.

## Etapa 02 — Movimentação, primeira rodada

Código analisado antes da alteração: travessia antiga em `main.js`, plano de gancho em `grapple.js`, entrada de controle e rig do Kaito. A onda E e o tentáculo antigo continuam disponíveis.

Concluído:

- **Shift segurado:** corrida mais rápida com aceleração/desaceleração existentes; o toque ainda esquiva.
- **U segurado e solto:** salto carregado. A velocidade de corrida também acrescenta impulso ao salto normal.
- **Y:** prende/solta um tentáculo de água com gravidade, direção pelo WASD e limite de comprimento. Ele tem balanço físico, não segue uma curva pré-calculada.
- **Espaço durante o balanço:** solta preservando a velocidade e passa para a prancha enquanto Espaço permanece segurado.
- Colisão do balanço passa pelo mesmo solver do personagem; um bloqueio libera o tentáculo em vez de puxar Kaito através da parede.
- Aterrissagem com flexão curta e preparação visual do salto carregado.
- No controle: **L2 + R3** alterna balanço; **L2 + L3** inicia a carga e repetir executa o salto. **L2 + R2** alterna mergulho.
- O painel da aventura oferece botões de balanço, carga por toque e mergulho.

Validação: `water-tether.test.js` testa comprimento, velocidade de soltura, entradas inválidas e limite de impulso. `traversal-stage-smoke.mjs` usa teclado real para carga, balanço e transição à prancha.

Ainda pendentes nesta etapa: parkour completo para diferentes obstáculos, corrida horizontal nas paredes com animações específicas e mais transições/acrobacias. A escalada simples e o salto sobre caixas existentes não equivalem a um sistema completo de parkour.

## Etapa 03 — Combate, primeira rodada

Código analisado: seleção de alvos, `useAttack`, IA de inimigos, parry e poderes da aventura.

- **I** lança um capanga próximo para permitir ataques aéreos. Possui recarga própria; chefes não são levantados.
- A gravidade devolve o inimigo ao piso/telhado original; não é uma posição suspensa permanente.
- O terceiro golpe leve ativa um jato se houver energia e o poder estiver disponível. Seu custo e recarga normais continuam valendo.
- No controle, **L2 + direcional para cima** executa lançamento; o painel também tem um botão.
- `air-combat.test.js` verifica a subida/queda e entradas inválidas; `air-combat-smoke.mjs` verifica lançamento, recarga, combo aéreo e consumo de energia no terceiro golpe.

Pendentes: repertório mais amplo de combos, cobertura/distrações próprias e chefes com pontos fracos elaborados.

## Etapa 04 — Cidades, primeira rodada

Código analisado: grupos de cenário por cidade, interação F, colisões, câmera e estação.

- **Nami Surf Lab**, em x -215, z -165: porta acessível e F dentro da loja abre equipamentos/habilidades.
- Parque compacto e passagem coberta em Neo Tóquio.
- Volumes de teto têm altura inferior própria: personagem e câmera podem passar por baixo, e o salto é bloqueado pela laje.
- Os volumes exclusivos acompanham a cidade ativa; mudar de cidade não deixa paredes invisíveis no mapa anterior.
- A troca de cidade cancela balanços e cargas antigos.
- `city-locations.test.js` verifica passagem pela porta, bloqueio de paredes e teto, passagem pelo túnel e câmera. `city-polish-smoke.mjs` entra na loja com controles normais e abre o equipamento.

Pendentes: bairros com malhas urbanas independentes, mais interiores, comércio com economia própria e maior variedade de missões. As duas cidades ainda compartilham a base urbana principal.

## Etapa 05 — Polimento, primeira rodada

Código analisado: câmera, áudio procedural, painel de acessibilidade e qualidade gráfica.

- Opção manual **Reduzir movimento da câmera**, com preferência salva: reduz tremor, mudanças automáticas de campo de visão e giro de enquadramento.
- Sons procedurais específicos para cada poder, mantendo o áudio opcional e sem downloads externos.
- Ajuda/atalhos e indicações do salto carregado e balanço atualizados.
- Testes de exportação de foto, fechamento dos modos por Escape e interação em interiores.

Pendentes: expressões faciais, dublagem, reflexos completos, remapeamento amplo de controles e testes prolongados em equipamentos reais.

## Como verificar

```sh
npm test
npm run build:share
node tests/traversal-stage-smoke.mjs
node tests/air-combat-smoke.mjs
node tests/city-polish-smoke.mjs
node tests/adventure-smoke.mjs
node tests/controls-round2-smoke.mjs
node tests/story-complete-smoke.mjs
```

Os testes de navegador usam Chromium com renderização por software. Não demonstram desempenho ou compatibilidade de um console físico. Os arquivos independentes são gerados em `dist/`; `jogar.zip` é o download compartilhável.

## Segunda rodada — travessia, controles e desempenho

- Corrida vertical e lateral em fachadas enquanto segura o salto, com consumo de energia e verificação do espaço para subir ao telhado.
- Prancha com mergulho acelerado e sustentação conforme a direção da câmera.
- Pedestres e veículos distantes deixam de ser desenhados; suas rotas continuam preservadas. A distância varia com a qualidade gráfica.
- Teclas remapeáveis com detecção de conflitos, preferência salva e tutorial interativo de movimento, salto, onda e mapa. O controle mantém o esquema padrão.
- Três pinturas de prancha, com desbloqueios por cristais, preservando roupa, mochila e lentes do protagonista.
- Cinco condições climáticas, incluindo tempestade e neblina, com preferência salva; ambiente sonoro procedural varia por cidade e clima.
- Correção da saída do oceano: o limite da superfície impedia alcançar o ponto de retorno à praia.
- Testes adicionais para fachadas, passagem segura, proximidade, cores da roupa, teclas e preferências. O teste `story-complete-smoke.mjs` percorre os seis capítulos com comandos reais, incluindo o retorno do mergulho, o trem, o telhado e o chefe.

Ainda pendentes: mapas urbanos inteiramente distintos, expressões faciais, furtividade completa, chefes com pontos fracos elaborados, remapeamento dos botões do controle e validação em consoles físicos. Esta rodada não conclui todos os 72 itens do plano.
