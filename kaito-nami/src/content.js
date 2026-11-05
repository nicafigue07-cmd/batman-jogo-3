/* Original dialogue, tutorials and character introductions. MIT. */
(function(root){
  const introductions = {
    Ren: 'Seu amigo de infância. Vive para surfar e sempre percebe quando o mar muda.',
    Yuna: 'Curiosa e inventiva. Constrói sensores para ouvir sinais que ninguém mais nota.',
    Mika: 'Pesquisadora das correntes. Prefere uma pergunta honesta a uma resposta apressada.',
    Sora: 'Professor e mentor. Ensina Kaito a escutar a água antes de tentar guiá-la.',
    Kuroda: 'Diretor da Maré Zero. Queria prever tempestades e passou a acreditar que podia dominar o oceano.'
  };
  const dialogues = [
    ['Ren','Kaito! Você chegou. Eu ia entrar no mar, mas viu aquela onda azul? Ela está parada. Vamos olhar de perto?'],
    ['Kaito','Essa água… parece estar tentando me dizer alguma coisa.'],
    ['Ren','Você moveu a água sem tocar nela! Aqueles destroços estão prendendo a corrente. Consegue soltá-los?'],
    ['Surfista','Minha prancha ficou presa na corrente. Eu já estava cansado… obrigado por vir!'],
    ['Mika','Essas cargas não são lixo comum. São sensores de ressonância. A Maré Zero está medindo o mar — ou alterando alguma coisa nele.'],
    ['Yuna','Separei o ruído dos registros. Escuta: parece uma canção ao contrário. Se o sinal vem debaixo da ilha, Sora pode saber onde procurar.'],
    ['Sora','Você não precisa vencer a água, Kaito. Na nascente ela conserva uma memória antiga. Siga a corrente e escute.'],
    ['Yuna','Os fragmentos repetem a mesma frequência. Alguém ensinou uma máquina a imitar os corais de Aonami.'],
    ['Ren','Esses robôs estão recolhendo tudo! Desative os motores com água. Não deixe que levem as pistas.'],
    ['Yuna','O transmissor responde a uma antena em Hikaru. Já avisei a Mika. O barco do porto pode nos levar até lá.'],
    ['Mika','Bem-vindo a Hikaru! Linda, não é? Mas as luzes consomem cada vez mais energia do litoral. Vamos descobrir quem conectou as duas coisas.'],
    ['Yuna','Achei! A rede usa a frequência dos corais como chave. A transmissão principal sobe até a Torre Hikari.'],
    ['Yuna','Kuroda achava que estava prevendo as tempestades. Os dados mostram o contrário: o núcleo está criando novas. Precisamos desligar a transmissão.'],
    ['Yuna','O sinal está mudando de antena! Atravesse os anéis em ordem. Vou manter o canal aberto enquanto puder.'],
    ['Mika','Os sentinelas guardam o comando de drenagem. Quando os motores pararem, consigo interromper o bombeamento.'],
    ['Sora','Kuroda tentou proteger as cidades sem escutar quem vivia nelas. O núcleo já não obedece a ninguém. Ren precisa de você em Aonami.'],
    ['Ren','Kaito, a água chegou perto das casas. Estamos levando todo mundo para o abrigo. Volte assim que puder!'],
    ['Mika','A chuva que você controla pode acalmar a corrente ao redor do abrigo. Eu cuido dos moradores. Vá atrás do núcleo!'],
    ['Kuroda','Eu queria impedir que outra tempestade levasse alguém. Agora a máquina está piorando tudo… Kaito, por favor, ajude-me a desligá-la.'],
    ['Kaito','Ninguém protege o oceano sozinho. Vamos devolver o que foi tirado dele — juntos.']
  ];
  const tutorials = [
    'Mova-se com WASD ou o direcional. Perto de Ren, use Interagir (E). Arraste a tela para girar a câmera.',
    'Siga o losango azul no minimapa. O mapa completo fica na tecla M e no menu.',
    'Olhe para o destroço e use Onda de Impacto (Q). Aproxime-se até o indicador mostrar que está ao alcance.',
    'Novos poderes foram liberados! K abre habilidades; 1–0 selecionam. Surf Rápido também ajuda na travessia.',
    'Aproxime-se do terminal e use Interagir. Ao perder o caminho, consulte o diário (J).',
    'Locais descobertos liberam viagem rápida no mapa. Não é possível viajar durante um combate.',
    'Salto Aquático funciona no ar. Use-o para alcançar mais altura; Interagir aciona as trilhas de escalada.',
    'Ative Visão Oceânica para revelar as pistas. Depois, aproxime-se de cada fragmento e use Interagir.',
    'Evite as áreas vermelhas antes dos ataques. Escudo bloqueia; R esquiva. Após um bloqueio, contra-ataque com uma onda.',
    'No píer, use Interagir para embarcar. A campanha e seus itens continuam salvos na outra cidade.',
    'Bem-vindo a Hikaru. Mika aguarda perto da entrada do porto.',
    'Use Visão Oceânica junto ao laboratório. O marcador mostra a distância até o terminal.',
    'Entre na torre, use o elevador à direita e investigue o terminal do mirante. Volte ao térreo para sair.',
    'Atravesse os anéis na ordem. Se o tempo acabar, retorne ao primeiro. Surf Rápido dá uma vantagem.',
    'Os sentinelas têm comportamentos diferentes. Observe a área de ataque e use Redemoinho para abrir espaço.',
    'Habilidades podem evoluir no menu K. As melhorias usam pontos ganhos na campanha e nos objetivos de bairro.',
    'O barco permite retornar a Aonami. Viagem rápida funciona apenas dentro da cidade atual.',
    'Use Chuva Protetora perto do abrigo. Depois confira o próximo destino no mapa.',
    'O guardião muda de fase ao perder energia. Espere o sinal do ataque, saia da área e aproveite a abertura.',
    'Ative Grande Maré junto à onda azul para concluir a história. Depois, as duas cidades continuam abertas.'
  ];
  root.KaitoContent = {introductions, dialogues, tutorials};
  if(typeof module!=='undefined')module.exports=root.KaitoContent;
})(typeof window!=='undefined'?window:globalThis);
