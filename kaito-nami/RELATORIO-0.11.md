# Kaito Nami 0.11 — revisão de colisões e inimigos praianos

[Jogar em modo leve](https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.11&mode=light) · [Modo normal](https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.11)

## Referência e limite do que foi visto

O link enviado foi identificado como [EU FIZ 100% DE SPIDER-MAN 2 e FOI INSANO!!](https://youtu.be/3V2wRCnqhEs). A ferramenta conseguiu obter o título, mas não as cenas nem a transcrição; a primeira consulta foi limitada pelo YouTube. Não assisti ao vídeo inteiro e não afirmo que reproduzi tudo que aparece nele.

Depois do pedido para comparar os jogos do Homem-Aranha, consultei descrições oficiais de [Spider-Man Remastered](https://www.playstation.com/en-us/games/marvels-spider-man-remastered/), [Miles Morales](https://www.playstation.com/en-us/games/marvels-spider-man-miles-morales/) e [Spider-Man 2](https://www.playstation.com/en-us/games/marvels-spider-man-2/). A comparação foi desses três títulos modernos, não de todos os jogos da franquia ou de seus playthroughs. Foram usadas referências de travessia, combate, progressão e camuflagem; Kaito, sua história e seus recursos continuam originais.

## 1. Causa reproduzida: cenário desenhado sem colisão

A revisão encontrou decoração e geometria fora do catálogo físico: prédios de fundo, cadeiras, postes, caixas, partes da torre, rochas e elementos da linha elevada. Havia também descarte de colisões no interior da torre. Isso permitia atravessar objetos, embora os prédios principais já tivessem colisão.

A versão 0.10 foi executada separadamente a partir do backup para comparar os mesmos comandos com a 0.11. Em 80 passos de 0,025 s:

| Caso controlado | Posição Z final na 0.10 | Posição Z final na 0.11 | Resultado |
|---|---:|---:|---|
| Correr na direção do prédio de fundo | 55,670 | 43,079 | Agora para antes da face do prédio. |
| Correr contra a cadeira da praia | 9,330 | 20,674 | Agora para na cadeira, sem cruzá-la. |
| Correr contra o terminal da torre | 5,000 | 2,670 | Agora para antes do móvel e ainda pode interagir. |

São reproduções específicas do problema, não uma garantia matemática de inexistência de qualquer bug no mundo inteiro.

### Implementado

- Catálogo de 131 volumes físicos de cenário, incluindo elementos no chão e acima dele. Os objetos convertidos usam os mesmos dados de dimensões/posição para desenho e física; alguns elementos existentes preservam o desenho original e recebem um volume explícito correspondente.
- Colisões de corpo com alturas mínimas/máximas, para permitir passar por baixo de estruturas elevadas e bloquear a parte realmente sólida.
- Teste de contato da cabeça na subida, evitando atravessar cobertura de guarda-sol e tabuleiro elevado do trem.
- Retângulos girados respeitados nas colisões e na correção de sobreposição, incluindo cadeiras e destroços.
- Colisões nos móveis/porta do elevador e paredes da torre; terminal e elevador continuam utilizáveis.
- Apoio sobre píeres, móveis e outras superfícies registradas; visual dos pés acompanha o apoio em vez de ficar submerso dentro da madeira.
- Limites finitos de altura para carros, palmeiras, placas e destroços, evitando paredes invisíveis infinitas acima deles.
- Separação do corpo de Kaito em relação aos personagens principais ao ar livre e aos robôs próximos. Multidões de fundo e efeitos visuais não viraram obstáculos sólidos indiscriminados.
- Ataques próximos/ondas e ataques inimigos verificam obstruções no caminho. A Grande Maré mantém seu comportamento especial de área.
- Transições antigas de escalada agora fazem subida, deslocamento por cima do obstáculo e descida, em vez de mudar a posição apenas no instante final.

**Arquivos:** `src/core.js`, `src/systems.js`, `src/game.js`, novo `tests/scenery-physics.cjs`.

### Trem e estruturas elevadas

A inspeção revelou que a linha antiga na coordenada Z=34 cruzava um prédio existente. A linha, seus pilares e os vagões foram reposicionados para uma faixa livre em Z=43. O trem não foi apagado. Os vagões têm colisão e apoio dinâmico: Kaito sobre o teto acompanha o deslocamento e pode salvar/restaurar a posição. A torre externa Hikari também recebeu apoio físico na cobertura, preservando o interior/elevador existentes.

### Testado e como testar

Doze casos novos cobrem corrida/surf/esquiva contra prédio, cruzamento rápido de cada volume de chão registrado, retângulos girados, cadeira, cobertura do guarda-sol, móvel e porta da torre, passagem por baixo do trilho, contato com o teto, apoio/transporte/save no vagão, reparo de posições inválidas, bloqueio de ataques, corpos dos personagens e escalada por cima da rocha.

Para conferir no jogo: corra, use surf e esquive contra cadeiras, postes e prédios. Na torre, caminhe contra o terminal e use E a uma distância normal. Tente saltar sob um guarda-sol. A passagem sob a linha elevada de Hikaru permanece livre; subir no vagão exige chegar à altura do teto usando a travessia disponível. Salve/exporte antes de testar posições arriscadas.

**Limites:** os volumes são uma aproximação por retângulos, círculos e intervalos verticais, não uma malha física exata de todos os triângulos. Vegetação leve, partículas e multidões decorativas têm tratamento próprio. Não implementei física de demolição, tecido ou hidrodinâmica completa. Há casos que ainda exigem QA humano, especialmente superfícies inclinadas, cantos combinados e aparelhos distintos.

## 2. Kaito preservado e robôs com identidade praiana

Kaito mantém modelo, idade, cabelo, óculos, mochila, skins e história. Os robôs existentes receberam equipamento praiano/mergulhador:

- Batedor: máscara, snorkel e nadadeiras.
- Atirador: chapéu de palha e equipamento aquático.
- Sentinela: cores de resgate e boia ao redor do corpo.
- Guardião do núcleo: detalhes de coral e boia maior, mantendo as fases do chefe.

Os três comportamentos, arenas, recompensas, habilidades e campanha foram preservados. São modelos procedurais com novos detalhes visuais, não cópias de vilões da Marvel nem novos modelos esqueléticos profissionais.

**Arquivo:** `src/game.js`. **Verificação:** renderização nativa da arena com os três estilos e névoa; imagens com/sem instancing foram idênticas. O modo leve usa menos segmentos nos detalhes. **Como testar:** após a terceira missão, use os marcadores vermelhos do mapa para iniciar uma arena e compare os três equipamentos.

## 3. Adaptação original de furtividade

A Visão Oceânica continua revelando pistas por dez segundos e também cria uma névoa de cinco segundos. Robôs comuns a mais de cinco unidades perdem o rastro, cancelam o ataque anunciado e retornam ao ponto de patrulha. Robôs próximos e chefes continuam detectando Kaito. Ataques de Kaito desfazem a névoa; não é invencibilidade nem troca de personagem.

É uma adaptação marítima da ideia de camuflagem, não uma reprodução do poder de Miles. Custos, desbloqueio e recarga antigos da Visão Oceânica foram mantidos.

**Arquivos:** `src/core.js`, `src/game.js`, `src/content.js`, `tests/scenery-physics.cjs`. **Testado:** perda de detecção distante, reação próxima, chefes não enganados e cancelamento ao atacar. **Como testar:** quando Visão Oceânica estiver liberada, selecione-a com 8 e use Q; observe robôs distantes. Aproxime-se ou ataque para comparar a reação. O texto do poder e a dica explicam o comportamento.

## 4. Revisão final e entrega

A suíte completa passou após as correções: inicialização/recuperação, interface e controles simulados, salvamento, progressão/skins, combate, mira, circuitos, verticalidade, arenas, as doze regressões novas e navegação das vinte missões. A campanha foi concluída em 223 segundos simulados, sem teleportar, alterar recursos ou acionar recuperação de posição. Isso não representa tempo de uma partida humana. O log está em `TESTES-0.11.txt`.

O HTML gerado iniciou nos testes normal/leve com WebGL simulado. Os shaders e os comandos gráficos foram executados em Mesa/EGL nativo sem erro GL: quadro inicial normal, inicial leve, arena com equipamentos praianos/névoa, arena instanciada/leve e jogador sobre o trem. A arena capturada teve 842 chamadas sem instancing, nove com instancing e 362 no modo leve; os quadros normal/instanciado foram idênticos pixel a pixel. São contagens de um quadro, não certificação de FPS.

Não houve teste em navegador interativo, dispositivo móvel ou gamepad físico. Portanto, não afirmo certeza absoluta em todos os aparelhos nem reprodução integral do vídeo inacessível.

```sh
npm --prefix kaito-nami test
npm --prefix kaito-nami run build
```

O build é independente de rede; `index.html` e `jogar/Kaito-Nami.html` devem coincidir com `output/Kaito-Nami.html`, verificado pelo CI. Fontes, testes, licença e documentação em `jogar/Kaito-Nami-0.11.zip`. Arquivos anteriores e saves versão 5 preservados. Foram atualizados também `src/runtime.js` (versão de diagnóstico), `package.json`, READMEs e documentação.

## Pendências do pedido amplo

Não assisti nem repliquei todos os jogos do Homem-Aranha. Continuam pendentes o conjunto integral de sistemas dessa franquia, identificação exata das cenas desejadas no vídeo, produção artística/cinemática profissional, gadgets/furtividade mais elaborados, mais interiores e testes de conforto/desempenho em aparelhos reais. Esta entrega corrige as falhas de colisão reproduzidas e acrescenta os recursos originais descritos acima; não declara o plano inteiro finalizado.
