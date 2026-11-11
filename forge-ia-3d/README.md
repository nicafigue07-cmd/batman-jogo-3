# FORGE IA 3D PRO — versão 11

**Site:** https://nicafigue07-cmd.github.io/batman-jogo-3/forge-ia-3d/

A FORGE é um estúdio de criação de jogos 3D em Three.js, no navegador. Tem um modo local gratuito com comandos em português e um servidor opcional de IA generativa. O modo local não é equivalente ao ChatGPT e não escreve livremente código de jogos inéditos.

## Melhorias da versão 11

- **Conversa persistente:** ao recarregar o projeto, os últimos pedidos e respostas podem ser retomados.
- **Continuidade:** depois de 'adicione 2 casas', o pedido 'mais 3' acrescenta outras três casas.
- **Comandos que executam ações:** desfazer, refazer, salvar, carregar, reiniciar missão, ir para regiões do mapa.
- **Aprimorar mundo:** acrescenta alguns objetos e NPCs e detalhes visuais sem trocar o tipo de missão.
- **Diagnosticar jogo:** apresenta objetivos, personagens, mapa e recomendações específicas do estado atual.
- **Preservar progresso:** ao editar objetos ou fazer outras mudanças compatíveis no mesmo cenário e missão, o personagem não volta ao início e o progresso permanece.
- **Resgates com consequências:** os personagens resgatados são registrados como aliados e podem aparecer perto da base nas fases seguintes.
- **Herói jogável:** o Guardião Ruivo inspirado na imagem do usuário, com túnica verde, cabelos ruivos, capa vermelha, orelhas élficas e fada animada.
- **Diferenciação clara:** o modo de comandos local não é IA generativa; a geração de código exige um servidor configurado.

## Recursos de jogo já disponíveis

- Mapa de **640 × 640 unidades** com cidade, praia, floresta e base espacial, além de viagens rápidas.
- Campanha de **20 capítulos** com história e diário de missões.
- Seis objetivos: coleta de cristais, coleta contra o tempo, corrida por checkpoints, entregas, resgate de personagens e exploração.
- Água animada, sombras, vegetação, partículas, iluminação de dia/noite/pôr do sol, opções Leve, Equilibrado e Ultra.
- Editor 3D com casas, árvores, rochas, caixas, muros, torres, postes, portais e plataformas; seleção, arraste, redimensionamento, cores, duplicação e exclusão.
- Salvamento no navegador e exportação/importação de projeto JSON e de jogo HTML. O HTML ainda depende de internet para carregar Three.js.
- Controles: WASD/setas para andar, Espaço para pular, Shift para correr, E para interagir, P para pausar, R para reiniciar.

## Exemplos de comandos

- 'Crie um jogo de resgatar 5 pessoas na floresta.'
- 'Adicione 2 casas.' Depois, 'Mais 3.'
- 'Melhore tudo mantendo meu personagem e minhas missões.'
- 'Diagnosticar o jogo.'
- 'Salve o projeto.' / 'Desfazer.' / 'Refazer.'
- 'Crie uma campanha com 20 missões.'

## Ativar IA generativa real (opcional)

O servidor Node.js 22+ está em forge-ia-3d/backend/server.mjs e utiliza a OpenAI Responses API. GitHub Pages executa apenas a página estática, portanto o backend **não é automaticamente ativado**.

1. Um responsável ou administrador hospeda o backend em HTTPS.
2. Configure de forma privada no servidor as variáveis OPENAI_API_KEY, FORGE_ACCESS_TOKEN e, opcionalmente, OPENAI_MODEL (padrão gpt-6.1-sol) e PORT.
3. Execute, a partir da raiz do repositório: node forge-ia-3d/backend/server.mjs
4. No estúdio, abra ⚙ IA real e informe a URL HTTPS do servidor terminada em /api/forge e a senha de acesso. **Nunca coloque a chave privada no código público do site.**

A API pode gerar custos. Se você for menor de idade, peça a um responsável para configurar qualquer serviço pago. É necessário limitar custos, autenticar usuários e testar a qualidade dos jogos antes de publicar para outras pessoas.

## Testes automáticos

O workflow .github/workflows/testar-forge.yml executa testes de navegador com Chromium/Playwright e WebGL para controles, missões, 20 capítulos, desempenho visual, resgates e aliados, chat contextual, preservação de progresso, JSON e HTML. O servidor de IA é testado com uma resposta simulada para não gastar créditos.

**Limitações:** a FORGE não substitui Unity ou Unreal; o modelo 3D do herói é uma recriação estilizada e não uma cópia da ilustração; IA sem servidor não gera qualquer código 3D novo nem jogos AAA automaticamente.