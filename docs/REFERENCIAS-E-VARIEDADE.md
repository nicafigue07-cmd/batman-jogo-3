# Referências e variedade de jogo

O objetivo desta alteração é tornar **Batman — Sombras de Gotham** menos repetitivo: alternar objetivos, permitir uma abordagem furtiva e dar mais opções de travessia. A referência é a combinação de exploração, combate e atividades de **Marvel’s Spider-Man 2**. As mecânicas são adaptadas à capa, ao gancho e aos equipamentos do Batman; os cenários, personagens e efeitos deste protótipo são construídos proceduralmente.

## Base da comparação

Esta comparação usa conhecimento geral sobre os sistemas conhecidos de Marvel’s Spider-Man 2 e a leitura dos módulos deste repositório. A tentativa de consultar a [página oficial da PlayStation](https://www.playstation.com/en-us/games/marvels-spider-man-2/) recebeu **HTTP 403** neste ambiente. O link fica disponível para consulta pelo leitor; a página não foi usada como uma fonte acessada com sucesso. A comparação é seletiva e não representa uma análise de todo o jogo.

## O que inspira as mudanças

| Sistema em Marvel’s Spider-Man 2 | O que já existia neste protótipo | Adaptação nesta alteração |
| --- | --- | --- |
| Travessia que combina balanço, teias e Web Wings, com correntes de ar | Gancho entre telhados, salto, capa para planar e possibilidade de soltar o gancho mantendo impulso | Correntes de ar para apoiar o voo com a capa e criar escolhas de trajeto |
| Crimes pela cidade e atividades secundárias com objetivos próprios | Campanha com transmissores, escolta de refém, investigação, chefe e perseguição aérea | Patrulha com ocorrências de combate, resgate, desarme e interceptação; escolha variada de tipo e local |
| Furtividade, aproximações por cima e eliminações silenciosas | Fumaça, batarangue e acesso aos telhados | Agachamento, percepção gradual dos guardas e finalização silenciosa por trás |
| Combos, gadgets e habilidades especiais | Combo de três golpes, chute pesado, mergulho aéreo, batarangue com ricochete, fumaça e esquiva | A furtividade passa a oferecer outra maneira de abordar os encontros |
| Encontros com inimigos que exigem respostas diferentes | Vagalume, Pinguim, Charada, Bane e Morcego-Humano, com aparências e padrões próprios | As ocorrências curtas complementam as missões com vilões, ampliando a variedade entre elas |
| Progressão de habilidades e desbloqueio de trajes | XP, níveis, vitalidade crescente e armaduras com atributos próprios, salvos neste navegador | A patrulha oferece oportunidades adicionais de ganhar XP; os desbloqueios das armaduras continuam associados às missões existentes |

## Como a patrulha reduz a repetição

Cada ocorrência propõe uma ação diferente:

- **Combate:** neutralizar o grupo que ocupa a área.
- **Resgate:** liberar um civil e acompanhá-lo até a extração.
- **Desarme:** alcançar um dispositivo e concluir o desafio antes do fim do tempo.
- **Interceptação:** alcançar um mensageiro em movimento e interceptá-lo de perto.

O gerador procura evitar repetir os tipos e os locais recentes quando há alternativas disponíveis. O desempenho pode conceder bônus, enquanto uma ocorrência fracassada não concede sua recompensa de conclusão. Assim, a próxima atividade muda a tarefa, o percurso e a abordagem possível.

A furtividade acrescenta uma escolha ao combate: aproximar-se por trás, usar a cobertura dos prédios e observar a percepção dos guardas. A fumaça interrompe a detecção. Chefes continuam exigindo os confrontos próprios de suas missões.

## Diferenças que continuam fora desta alteração

| Recurso de Marvel’s Spider-Man 2 | Escopo atual de Sombras de Gotham |
| --- | --- |
| Alternância entre Peter Parker e Miles Morales, com poderes próprios | Um personagem jogável: Batman |
| Árvores de habilidades compartilhadas e específicas dos heróis | Progressão por XP, níveis e atributos das armaduras |
| Amplos conjuntos de poderes, gadgets e defesas, incluindo aparo | Conjunto menor de ataques, equipamentos e esquiva; aberturas específicas no confronto com Bane |
| Travessia com teias, Web Wings e recursos próprios dos dois protagonistas | Gancho, capa e correntes de ar adaptados à mobilidade do Batman |
| História longa com cenas cinematográficas, atuações e sequências elaboradas | Campanha curta com instruções em texto e objetivos jogáveis |
| Cidade com Manhattan, Queens e Brooklyn, trânsito e população urbana | Gotham procedural de tamanho limitado, com ruas, telhados e edifícios variados |
| Famílias de atividades como experimentos EMF, Mysteriums, bases de Caçadores e esconderijos do Prowler | Missões de investigação, resgate, transmissão e voo, além das ocorrências de patrulha |
| Estilos de cores para diferentes trajes e sistemas de apresentação elaborados | Armaduras com aparência e atributos próprios; sem um editor de estilos |
| Conjunto amplo de opções de acessibilidade, apresentação e recursos específicos de plataforma | Seleção de qualidade gráfica e controles de teclado, toque e gamepad no navegador |

Adicionar esses recursos exigiria novos sistemas, conteúdo e testes. Eles permanecem como possibilidades de evolução; não são entregas desta alteração.

## Arquivos envolvidos

- `src/missions.js`: as missões da campanha e seus objetivos.
- `src/combat.js`, `src/villains.js` e `src/progression.js`: ataques, vilões e evolução existentes.
- `src/patrol.js`: seleção das ocorrências e cálculo das recompensas.
- `src/stealth.js`: percepção dos guardas e condições da finalização silenciosa.
- `src/main.js`: integração dos sistemas à partida, controles e interface.

O jogo continua sendo uma experiência de navegador. Os controles com legendas PlayStation usam a Gamepad API; uma edição nativa para PS4 ou PS5 não faz parte deste trabalho.
