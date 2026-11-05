# Kaito Nami — revisão 0.5

Esta entrega melhora o protótipo existente. As 20 missões, os personagens, as duas cidades, os dez poderes, os colecionáveis, os 12 objetivos regionais, a viagem entre cidades e os saves anteriores foram preservados. Não é uma certificação de qualidade “10/10”.

## Revisão inicial e preservação

O inventário do repositório e seus arquivos legados foram lidos a partir do commit `4346fe960df2a09779c733ee0586070d9edb2329`. A entrada publicada foi comparada com a fonte modular de Kaito, que é incorporada em um HTML independente. A auditoria com hashes está em `AUDITORIA.json`. Os arquivos legados permanecem na árvore do Git sem exclusões; o README anterior também foi preservado em `docs/README-ANTERIOR.md`. Foi feita cópia de segurança local antes das alterações.

Os testes anteriores de Kaito passaram antes da implementação, incluindo a compilação/link dos shaders em EGL/OpenGL ES. No projeto legado, dez arquivos de testes passaram; quatro não puderam carregar porque a dependência `three` não está instalada no executor. Eles não foram declarados aprovados nem alterados para esconder a ausência da dependência.

## Etapas, evidências e limites

| Etapa | Encontrado e implementado | Arquivos principais | Verificação e como experimentar | Ainda falta |
|---|---|---|---|---|
| 1. Correções | Colisões circulares incompletas, saves em posições presas, possível estado de pistas sem saída e interação ambígua na torre. Adicionados retângulos com margem, movimento em subpassos, despenetração, recuperação de save, preservação de vitalidade dos robôs, preferência pelo terminal próximo e erros recuperáveis visíveis. | `systems.js`, `core.js`, `runtime.js`, `game.js` | Testes de regressão; caminhar nas quinas da escola; subir na torre, aproximar-se do terminal e pressionar E; recarregar durante combate. | Console e recuperação de contexto ainda precisam de teste completo em navegadores e GPUs reais. |
| 2. Gráficos | Água com ondulação maior, espuma costeira, brilho e reflexão simplificada do céu; céu em gradiente, nuvens, materiais procedurais, fachadas nas quatro faces e telhados variados. Sombras de contato e chuva opcionais. | `game.js`, `renderer.js`, `index.html` | Shaders compilados e ligados nos dois caminhos gráficos; cenas de Aonami e Hikaru renderizadas em EGL por software e inspecionadas. Alternar baixa/média/alta e sombras/clima. | Não há reflexos geométricos da cidade, sombras físicas com penumbra, texturas artísticas finais ou pós-processamento de produção. |
| 3. Kaito | Identidade infantil preservada. Acrescentados estados de movimento, resposta a impacto, pouso, inclinação da esquiva, poses de poder e transição de passos/orientação por interpolação. Câmera com altura, zoom, sensibilidade, proteção contra obstáculos e opção de reduzir movimento. | `core.js`, `game.js`, `systems.js` | Andar, correr, saltar, pousar, esquivar e alternar poderes; teste de câmera perto de paredes e teste de velocidade do controle a 30/60 Hz. | Modelo, rig e expressões faciais continuam simples e procedurais. |
| 4. Cidades | Moradores têm percursos e falas contextuais. Carros agora param para Kaito e moradores. A escola oferece uma aula de surf real, com anéis, exigência de prancha/poder e recompensa. Centro Neon recebeu construções; fachadas, coberturas e sinalização ganharam variedade. | `core.js`, `game.js` | Interagir perto da porta da escola após a missão 3; atravessar os três anéis com Surf Rápido; aproximar-se de um carro; conversar com moradores. | Mais interiores, rotinas de cidade mais profundas e atividades em outros telhados. |
| 5. Poderes e combate | Efeitos distintos para os dez poderes, impactos nos robôs, evolução com pontos reais e redução de custo/recarga. Batedores, sentinelas e robôs de alcance; chefe com três fases. Ataques têm área fixa de aviso e graça após dano, evitando acúmulo instantâneo de golpes. | `core.js`, `game.js` | K permite evoluir poderes. Pontos vêm da campanha, bairros e primeira aula. Observar os sinais antes de atacar. Custos, recargas, upgrades, tipos e fases passaram nos testes. | Ajuste fino de dificuldade e sensações precisa de jogadores reais. |
| 6. Campanha | Todas as missões e os objetivos preservados. Diálogos originais foram separados das instruções, personagens têm apresentações, há cenas simples com enquadramento de câmera e faixas cinematográficas. Todas podem ser fechadas imediatamente ou desativadas nas opções. | `content.js`, `core.js`, `game.js` | Teste percorreu as 20 missões usando movimento, colisões e recursos normais, sem teletransporte ou edição de energia/vitalidade. Incluiu torre, anéis, barcos, combate e final. | Direção cinematográfica, vozes e animação facial de qualidade final. |
| 7. Interface | Recuperação de erros com modo leve, opções validadas, tutoriais por missão, sensibilidade, textos maiores, contraste, redução de movimento, clima/sombras e indicador de desempenho. Menus aceitam confirmação e navegação por gamepad. Confirmação de apagar progresso mantida. | `index.html`, `runtime.js`, `game.js`, `systems.js` | Abrir opções, K, J, I e M; experimentar controles de toque/gamepad e exportar/importar save. Os callbacks reais foram exercitados em DOM simulado. | Layout e acessibilidade precisam de revisão manual em diferentes telas/leitores. |
| 8. Desempenho | Agrupamento de instâncias via `ANGLE_instanced_arrays`, com fallback comum; buffers reutilizados, modelos estáticos em cache limitado, corte por distância, partículas conforme qualidade e limite de pixels de renderização. | `renderer.js`, `game.js` | Na cena inicial capturada: 1.049 chamadas comuns contra 6 agrupadas. Ambas executadas em EGL e comparadas, com diferença média por canal inferior a 0,001 em escala 0–255. Ajustar distância de 40 a 140 e exibir contador nas opções. | Não foram medidos 60 FPS em computador nem 30 FPS em celular reais. O teste de comandos não certifica esses alvos. |
| 9. Testes | Acrescentados regressões, percurso integral, testes de callbacks de teclado/toque/gamepad, importação/exportação, qualidade, shaders normais/agrupados e renderização de cenas. | `tests/` | `npm --prefix kaito-nami test`; teste gráfico e comparação descritos abaixo. | Navegador real, dispositivos de toque/gamepad físicos e testes humanos de longa duração. |
| 10. Entrega | Fonte modular, testes, documentação, HTML independente e ZIP preparados. A atualização online usa o mesmo endereço, preservando o armazenamento do navegador. | `build.mjs`, `package.json`, relatório e entradas publicadas | Abrir o link da revisão; testar o save anterior antes de iniciar uma nova campanha. | Aprovação de lançamento comercial, distribuição Steam e QA final. |

## Testes reproduzíveis

Na raiz do repositório:

```sh
npm --prefix kaito-nami test
npm --prefix kaito-nami run build
MESA_SHADER_CACHE_DISABLE=true LIBGL_ALWAYS_SOFTWARE=1 python3 kaito-nami/tests/shader-egl.py
```

O teste gráfico usa Mesa/EGL no Linux. A renderização nativa de imagens também usa Pillow. Não é um teste de navegador.

```sh
node kaito-nami/tests/capture-frame.cjs /tmp/kaito-frame.json
MESA_SHADER_CACHE_DISABLE=true LIBGL_ALWAYS_SOFTWARE=1 python3 kaito-nami/tests/render-native.py /tmp/kaito-frame.json /tmp/kaito-frame.png
KAITO_FRAME_INSTANCED=1 node kaito-nami/tests/capture-frame.cjs /tmp/kaito-batch.json
MESA_SHADER_CACHE_DISABLE=true LIBGL_ALWAYS_SOFTWARE=1 python3 kaito-nami/tests/render-native.py /tmp/kaito-batch.json /tmp/kaito-batch.png
```

O teste de percurso usa um navegador lógico de caminhos e chama as regras reais de movimento e interação. Ele não escreve na posição de Kaito nem modifica vitalidade/energia. O resultado é evidência de que os gatilhos são alcançáveis sob essas regras; não substitui um jogador completando a campanha no navegador.

## Limite desta validação

Não havia ferramenta de navegador controlável nesta sessão. Os testes de interface usam DOM simulado; os testes gráficos executam shaders e comandos reais em EGL por software. Não foi afirmado que o console do navegador está livre de erros, que o gamepad físico foi testado ou que os alvos de FPS foram atingidos.

A água reflete um céu procedural, não os prédios. As sombras são aproximações de contato. Nenhuma funcionalidade existente foi substituída por um botão sem ação: moradores, trânsito, aula, upgrades e opções descritos acima têm lógica implementada e testes correspondentes. Elementos cenográficos anteriores, como barcos distantes e parte dos pedestres de fundo, permanecem cenográficos.

Os efeitos visuais dos poderes continuam animando durante cenas da história, sem avançar IA, dano ou energia. Essa separação tem um teste de regressão específico.
