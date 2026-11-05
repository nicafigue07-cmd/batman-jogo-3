# Kaito Nami 0.6 — correções verificáveis

Jogar: https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.6

Modo leve: https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.6&mode=light

## Escopo e auditoria

Revisados os arquivos da implementação Kaito (runtime, renderizador, sistemas, conteúdo, campanha, controlador, interface, build e testes) e o inventário do repositório legado antes das mudanças. Backup local anterior às alterações. O legado foi preservado; esta atualização modifica a aplicação independente em `kaito-nami/` e seus artefatos publicados. As 20 missões, duas cidades, personagens, poderes, atividades e saves versão 5 continuam presentes. Não há modelos, texturas, importações ou bibliotecas externas necessários para iniciar: o build contém código e geometria procedural no próprio HTML, evitando caminhos absolutos incompatíveis com GitHub Pages.

O erro histórico de ligação de shaders foi reproduzido na revisão anterior: precisão diferente entre uniformes compartilhados. A precisão explícita corrigida continua testada. Não recebemos novos logs do navegador do jogador; não atribuímos toda falha atual àquela causa. Nesta revisão encontramos outras lacunas concretas: o modo leve ainda pedia antialias e usava o shader completo; a restauração do contexto não oferecia recuperação automática; a colisão da câmera encurtava apenas os eixos horizontais.

## Etapa 1 — inicialização e recuperação

Implementado: contexto sem antialias no modo leve, preferência de baixo consumo, shader simplificado de iluminação/neblina e fallback automático quando o shader principal falha. O modo compatível evita instancing, céu/nuvens redundantes e efeitos caros. Logs classificam criação do contexto, compilação, ligação, geometria, primeiro frame, perda de contexto, exceções e tempo excedido. Diagnóstico copiável e tentativas normal/leve preservam o progresso. Perda de contexto salva e pausa; restauração permite uma recarga automática por sessão, evitando loop. A opção leve funciona por URL mesmo se o armazenamento estiver bloqueado. Falhas de alocação de buffers são explícitas.

Arquivos: `src/runtime.js`, `src/renderer.js`, `src/game.js`, `src/index.html`, `tests/startup.cjs`, `tests/smoke.cjs`, `tests/shader-egl.py`.

Testado: 7 casos automatizados de inicialização/recuperação; falha injetada no fragment shader principal passa pelo controlador real e inicia com o shader seguro. Compilação/ligação nativa EGL dos shaders normal, instanciado e seguro passou. O teste de erro intencional escreve uma mensagem controlada no console do teste.

Como testar: iniciar normalmente; depois abrir o link leve. No painel de erro, copiar diagnóstico e tentar novamente. Em navegador com ferramentas WebGL, perder/restaurar contexto e verificar manutenção do progresso. Pendente: reprodução do problema no navegador/aparelho original com seu diagnóstico real.

## Etapa 2 — movimentação e câmera

Implementado: aceleração/frenagem dependentes do tempo, inércia aérea, salto com buffer curto, esquiva na direção do comando e bloqueio durante deslocamentos de transporte. Velocidade é limitada pela colisão efetiva e zerada nas transições relevantes. A câmera encurta o raio completo (incluindo altura) diante de obstáculos e usa paredes com alturas dos andares no interior da torre. Sensibilidade, zoom, suavização e enquadramento de diálogo existentes foram preservados. Atalhos configuráveis agora aceitam apenas teclas que o carregamento consegue restaurar.

Arquivos: `src/core.js`, `src/systems.js`, `src/game.js`, `tests/improvements.cjs`.

Testado: 18 casos de melhorias, incluindo aceleração independente do passo de tempo, frenagem, salto, esquiva e câmera interna/externa; controles, colisões, elevador, escalada e transições na suíte de regressão. O percurso automatizado concluiu as 20 missões em 245 segundos simulados, sem teleportar, editar recursos ou acionar recuperação de posição. Isso não equivale ao tempo de uma partida humana.

Como testar: andar/correr/parar, saltar próximo da aterrissagem, esquivar de lado; aproximar a câmera de paredes nos dois andares da torre; atravessar de barco com objetivo em outra cidade. O indicador agora aponta para o barco quando o objetivo fica na outra cidade. Pendente: avaliação humana da sensação dos comandos e de obstáculos não cobertos pelos percursos.

## Etapa 3 — gráficos e desempenho

Implementado: níveis de detalhe de esferas e cones, geometrias compartilhadas e perfis de 30/60 FPS selecionáveis e persistentes. O modo leve escolhe 30 FPS, menor distância, sem clima/sombras e shader simples. Preservados água animada, espuma, materiais procedurais, clima opcional e qualidades existentes. Não foram adicionados recursos artísticos externos nem prometida qualidade AAA.

Arquivos: `src/game.js`, `src/systems.js`, `src/index.html`, `src/renderer.js`, `tests/capture-frame.cjs`, `tests/smoke.cjs`.

Testado: renderização nativa Mesa/EGL do primeiro cenário normal e leve sem erro GL. No quadro capturado, o caminho normal executa 1049 draws sem instancing ou 8 com instancing, produzindo imagens pixel a pixel idênticas. O modo leve executa 434 draws e submete 31452 vértices, contra 101652 no quadro normal. São contagens desse quadro, não benchmarks de FPS ou garantia para todos os cenários. Não há teste em GPU física, Chrome, Firefox, Safari, celular ou controle físico neste ambiente.

Como testar: trocar baixa/média/alta e limites 30/60 nas configurações; reiniciar e conferir persistência; comparar distância e resposta durante caminhada/combatе. Pendente: medições em equipamentos modestos e ajustes por navegador. O limite de FPS não garante que o aparelho alcance o valor escolhido.

## Campanha, cidades, combate e interface preservados

A suíte testa todos os 20 objetivos, poderes, upgrades, chefes/fases, NPCs, atividades de surf, loja, salvamento/recuperação/importação/exportação, mapa, torre, viagens, 12 objetivos regionais, menus, teclado, toque e gamepad simulados. Esses sistemas já existentes foram mantidos; não são apresentados como conteúdo novo nesta versão. Não adicionamos novas missões, cidades ou cinematográficas nesta etapa. Melhorias artísticas extensas, rotinas mais elaboradas e expansão narrativa seguem pendentes.

## Comandos de reprodução

```sh
npm --prefix kaito-nami test
npm --prefix kaito-nami run build
LIBGL_ALWAYS_SOFTWARE=1 python3 kaito-nami/tests/shader-egl.py
LIBGL_ALWAYS_SOFTWARE=1 python3 kaito-nami/tests/shader-egl.py --safe
```

Os dois últimos exigem Python e bibliotecas EGL/GLES do sistema. Os testes Node não exigem pacotes externos. O CI executa a suíte Node e compara o HTML gerado com os dois arquivos publicados. `TESTES-0.6.txt` registra a execução local. Testes com WebGL simulado validam lógica e comandos; a renderização nativa complementa-os e não substitui validação em navegadores reais.

Entrega: HTML independente em `index.html` e `jogar/Kaito-Nami.html`; pacote com fontes em `jogar/Kaito-Nami-0.6.zip`. Versões anteriores permanecem no repositório. Para testar sem arriscar o progresso, exporte-o pelo menu antes de começar uma partida nova; apagar progresso continua exigindo confirmação.
