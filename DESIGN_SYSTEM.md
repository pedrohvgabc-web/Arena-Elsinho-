# Design system — Arena Leste

## Direção visual

Reprodução fiel da direção visual enviada no ZIP: paleta, Barlow/JetBrains, navegação, hero audiovisual, fita rolante, reveal, bola e hierarquia de cartaz. A estrutura HTML/CSS foi portada para React; a persistência e as ações continuam ligadas às server functions e ao Neon. A home tem fundo papel quente e faixa audiovisual escura; o torneio usa o vídeo de demonstração real e a contagem regressiva, além da arte existente.

## Paleta principal

| Token         | Cor       | Uso                                                              |
| ------------- | --------- | ---------------------------------------------------------------- |
| Papel quente  | `#FFF9F2` | Fundo principal                                                  |
| Superfície    | `#FFFFFF` | Formulários e painéis                                            |
| Tinta         | `#1A1210` | Texto principal; também funciona como texto escuro sobre laranja |
| Taupe         | `#6B5F57` | Texto secundário com contraste suficiente sobre papel            |
| Laranja Arena | `#DF4F07` | Ação e assinatura de marca                                       |
| Azul campanha | `#2457D6` | Novembro Azul, sempre com texto branco                           |

Verde fica restrito ao link de WhatsApp e estados de sucesso. Estados de erro/alerta usam tons semânticos acessíveis independentes da paleta institucional. O azul semântico de superfícies leves mantém texto escuro; o azul de campanha é uma superfície própria.
Para texto institucional pequeno sobre papel, branco e superfícies suaves, usar o tom derivado `#AD4306` (mínimo de 4,7:1 nas superfícies do tema). O laranja assinatura `#DF4F07` permanece nos botões com texto escuro e em títulos grandes sobre fundos escuros.

## Tipografia e composição

Barlow Condensed 800/itálica em títulos e números expressivos; Barlow em leitura, botões e formulários; JetBrains Mono em metadados compactos, horários e códigos. Usar tamanhos fluidos, títulos com `text-wrap: balance`, parágrafos com largura confortável e alinhamento predominantemente à esquerda.

No hero, a filmagem da Arena e a bola interativa formam o foco; abaixo, as unidades aparecem em linhas editoriais acompanhadas de mapa. O bloco Novembro Azul segue o arranjo original do ZIP: vídeo de jogo, faixa/CTA, premiação e countdown até 28/11/2026 às 15h. No celular, o conteúdo adapta a largura sem perder hierarquia, os módulos viram uma navegação horizontal e alvos de toque mantêm pelo menos 44 px.

## Movimento e performance

O clipe do hero foi aparado para excluir a abertura com contato antigo; usa poster imediato, `preload="none"`, sem áudio e playback quando visível. O vídeo de campanha usa a filmagem original de 60 fps sem a tarja azul inserida que encobria a ação; título, data e CTA permanecem como elementos da interface, fora do arquivo de vídeo. O poster também vem de um quadro original sem a tarja. Preservar o intro, a bola e o CTA que acompanha o cursor conforme o material original; carregar vídeo sob demanda e respeitar movimento reduzido/economia de dados.

Preservar a bola giratória acionada pelo usuário, os feedbacks úteis, o ribbon do torneio e as microinterações existentes. Em `prefers-reduced-motion`, manter poster estático e conteúdo completo. Não fazer informação depender de animação; manter `:focus-visible`, navegação por teclado e textos legíveis sem JavaScript ou vídeo.
