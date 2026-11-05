# Kaito Nami — Guardião das Marés · 0.6

Aventura 3D original, com Kaito como um menino japonês de 12 anos. Mantém 20 missões, Aonami, Hikaru, dez poderes, personagens, colecionáveis, 12 objetivos regionais, barco, torre com elevador e progresso salvo.

**Jogar online:** https://nicafigue07-cmd.github.io/batman-jogo-3/?v=0.6

**Controles:** WASD/setas movem; Shift corre; Espaço salta; Q usa poder; 1–0 selecionam; E interage; R esquiva; K abre habilidades; J diário; I mochila; M mapa; Esc pausa. Arraste a câmera e use a roda do mouse para zoom. Teclas principais são personalizáveis.

Também há controles de toque e gamepad padrão. Analógicos movem e giram; A salta/confirma, B esquiva/volta, X usa poder, Y interage, LB corre, RB troca poder e Start pausa. No menu, o direcional muda o foco. O mapeamento pode variar conforme controle/navegador.

**Novidades 0.6:** recuperação de contexto, shader seguro automático, modo leve sem antialias, aceleração/frenagem, salto com buffer, câmera com colisão nos interiores, níveis de detalhe e opção de 30/60 FPS.

**Sistemas preservados:** colisões/câmera e recuperação de saves; evolução de poderes; três tipos de robôs e três fases do chefe; diálogos e cenas em tempo real; aulas de surf; moradores e carros que cedem passagem; água e céu procedurais; opções de acessibilidade; instancing com fallback gráfico.

**Testes e build, a partir da raiz:**

```sh
npm --prefix kaito-nami test
npm --prefix kaito-nami run build
```

O build gera `output/Kaito-Nami.html`, independente e sem dependências de rede. O pacote ZIP inclui fontes, licença, testes e documentação. A pasta tem seu próprio `package.json` para funcionar junto ao código legado, sem alterar seu sistema de módulos.

Veja [relatório 0.6](kaito-nami/RELATORIO-0.6.md) para as mudanças por etapa, arquivos, testes, instruções e pendências. Esta é uma revisão do protótipo; não uma promessa de qualidade 10/10, de 60/30 FPS em todos os aparelhos ou de lançamento comercial autorizado.
