# FORGE IA 3D PRO — versão 9

**Site:** https://nicafigue07-cmd.github.io/batman-jogo-3/forge-ia-3d/

A FORGE é um editor de protótipos 3D com Three.js. A parte gratuita funciona diretamente no navegador. O modo de geração por IA real exige um servidor e chave de API, que não são fornecidos pelo GitHub Pages.

## Ferramentas gratuitas

- Cenários de cidade, praia, floresta e base espacial; iluminação de dia, noite e pôr do sol.
- **Mapa ampliado:** 290 × 290 unidades, 6,25 vezes a área anterior (116 × 116). Bairros exteriores e estradas, trilhas de floresta, praias estendidas e postos espaciais construídos com instancing para preservar desempenho.
- **Campanha de 10 capítulos:** missões com objetivos e lore diferentes (coleta, corrida, entregas, resgates e exploração), botão “Próxima missão” e progresso salvo no navegador.
- O botão “📖 Criar campanha com 10 missões” reinicia a história. Para criar uma missão isolada, selecione um objetivo; isso desativa o modo campanha.
- **Chat local mais útil:** responde dúvidas sobre a missão, o mapa e os capítulos, sugere possibilidades e aceita pedidos como “crie uma campanha com 10 missões”. Continua sendo um interpretador de comandos, não uma IA generativa equivalente ao ChatGPT.
- **Visual v8:** água com ondas e variações de cor produzidas por shader, textura procedural de asfalto, nuvens em movimento, partículas ambientais, sombras suaves sob os personagens e avatar 3D mais arredondado com roupas e articulações.
- Qualidade gráfica ajustável: **Leve** (sem sombras dinâmicas), **Equilibrado** ou **Ultra** (maior resolução de sombras e pixels). Gráficos mais altos exigem mais da placa de vídeo.
- Os efeitos são gerados com Three.js; o site ainda não possui modelos 3D de qualidade AAA nem materiais fotográficos profissionais.
- Jogabilidade 3D com câmera, personagem que gira corretamente para a direção do deslocamento, sombras, minimapa, plataformas, portais e NPCs que respondem à tecla E.
- Corrida, salto, pausa e reinício de missão; as teclas ficam liberadas quando o navegador perde o foco.
- **Seis tipos de objetivo:** coletar cristais, coletar contra o tempo, passar por checkpoints na ordem, buscar/entregar encomendas, resgatar pessoas com a tecla E e descobrir lugares.
- Cada tipo possui marcador, progresso, descrição e condição própria de vitória. Os modos de resgate e entrega incluem interação, e os outros exigem alcançar objetivos.
- **Editor de objetos 3D**: árvores, casas, rochas, caixas, muros, torres, postes, portais e plataformas.
- Clique para adicionar, ligar o modo editar e arrastar os objetos; alterar posição, cor e tamanho, duplicar e excluir.
- Modelos de aventura urbana, parkour e exploração na praia.
- Desfazer/refazer; salvar e carregar; exportar e importar o projeto JSON.
- Exportar seu jogo HTML e jogar no navegador (internet necessária para carregar Three.js).
- Comandos locais em português, por exemplo: "adicione 5 casas", "crie uma corrida de 3 checkpoints", "faça um jogo de entregas", "resgate 3 pessoas na floresta", "descubra locais".
- No editor, escolha **Objetivo do jogo** e **Quantidade de objetivos** ou use os atalhos de Corrida, Entregas, Resgate e Exploração.

**Importante:** os comandos locais são regras, não um modelo generativo equivalente ao ChatGPT.

## Ativar modelo de IA real (opcional)

O backend Node.js 22+ está no arquivo forge-ia-3d/backend/server.mjs. Ele chama a OpenAI Responses API quando configurado.

1. Publique o backend em hospedagem Node.js HTTPS (não use apenas GitHub Pages).
2. Configure variáveis de ambiente privadas na hospedagem:
   - OPENAI_API_KEY: chave da API OpenAI. Nunca coloque no HTML ou no repositório.
   - FORGE_ACCESS_TOKEN: senha longa, diferente da chave da API.
   - OPENAI_MODEL: opcional, padrão gpt-6.1-sol.
   - PORT: opcional, padrão 8787.
3. Comando a executar a partir da raiz do repositório: node forge-ia-3d/backend/server.mjs
4. No estúdio, clique em **⚙ IA real** e informe a URL HTTPS terminada em /api/forge e a senha de acesso.
5. Use o chat para pedir mudanças de cenário, câmera, personagens e novos objetos.
6. Para pedir um minijogo HTML independente, clique em **🚀 Gerar um jogo novo com código de IA**. A prévia é exibida em iframe isolado, e o arquivo HTML pode ser baixado após teste.

A prévia utiliza iframe com sandbox e CSP restrita. Mesmo assim, confira todo código gerado pela IA antes de executá-lo fora do editor. Não compartilhe sua senha. O servidor inclui limite básico de requisições; para uso público também são necessários controle de custos e autenticação aprimorada.

**Custos:** a API pode gerar cobranças. Para menores de idade, qualquer configuração de serviços pagos deve ser feita com um responsável.

## Controles

| Controle | Função |
| --- | --- |
| W/A/S/D ou setas | Andar |
| Espaço | Pular |
| Shift | Correr |
| Arrastar mouse | Girar câmera |
| Rodinha do mouse | Zoom |
| E | Conversar com NPC próximo |
| P | Pausar ou continuar |
| R | Reiniciar missão |
| Ctrl+Z / Ctrl+Y | Desfazer/refazer no editor |
| Modo Editar | Selecionar e arrastar objetos |

## Testes automatizados

O fluxo de trabalho .github/workflows/testar-forge.yml verifica o backend com uma API OpenAI simulada e roda o estúdio em Chromium/Playwright com WebGL. O teste `tests/forge-campaign.mjs` percorre os dez capítulos e confere mapa, progresso, salvamento, reinício e comportamento do chat local. O teste `tests/forge-graphics.mjs` confere oceanos animados, materiais do solo, partículas, nuvens, sombras e perfis gráficos, gerando capturas por cenário. O teste de objetivos verifica a direção do rosto e vitórias em corrida, entregas, resgates e exploração. Abrange controles, cristal coletado, pausa, minimapa, edição de objetos, modelos de mundo, importar/exportar JSON e HTML, prévia de código gerado com servidor simulado e viewport mobile.

A FORGE não é um motor AAA nem substitui Unity ou Unreal. O modelo conectado ajuda a criar protótipos, mas a qualidade, os testes e a correção do código gerado ainda exigem revisão.
