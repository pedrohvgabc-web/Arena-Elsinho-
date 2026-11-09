# Design system — Arena Leste

## Direção visual
Editorial esportivo de clube de areia, adaptado do material do usuário: vídeo real da Arena, fotografia de quadra e hierarquia de cartaz de campeonato. A home tem fundo papel quente e uma faixa audiovisual escura; o restante privilegia linhas editoriais e respiro, sem uma coleção de cartões idênticos. A arte oficial existente do Torneio Novembro Azul segue como peça principal da campanha.

## Paleta principal

| Token | Cor | Uso |
|---|---|---|
| Papel quente | `#FFF9F2` | Fundo principal |
| Superfície | `#FFFFFF` | Formulários e painéis |
| Tinta | `#1A1210` | Texto principal; também funciona como texto escuro sobre laranja |
| Taupe | `#6B5F57` | Texto secundário com contraste suficiente sobre papel |
| Laranja Arena | `#DF4F07` | Ação e assinatura de marca |
| Azul campanha | `#2457D6` | Novembro Azul, sempre com texto branco |

Verde fica restrito ao link de WhatsApp e estados de sucesso. Estados de erro/alerta usam tons semânticos acessíveis independentes da paleta institucional. O azul semântico de superfícies leves mantém texto escuro; o azul de campanha é uma superfície própria.
Para texto institucional pequeno sobre papel, branco e superfícies suaves, usar o tom derivado `#AD4306` (mínimo de 4,7:1 nas superfícies do tema). O laranja assinatura `#DF4F07` permanece nos botões com texto escuro e em títulos grandes sobre fundos escuros.

## Tipografia e composição
Barlow Condensed 800/itálica em títulos e números expressivos; Barlow em leitura, botões e formulários; JetBrains Mono em metadados compactos, horários e códigos. Usar tamanhos fluidos, títulos com `text-wrap: balance`, parágrafos com largura confortável e alinhamento predominantemente à esquerda.

No hero, a filmagem da Arena e a bola interativa formam o foco; abaixo, as unidades aparecem em linhas editoriais acompanhadas de mapa. A campanha mantém a arte existente. No celular, as ações aparecem antes do conteúdo secundário, os módulos viram uma navegação horizontal e alvos de toque mantêm pelo menos 44 px.

## Movimento e performance
O clipe do hero é o principal movimento: foi aparado para excluir a abertura que mostra contatos antigos; usa poster imediato, `preload="none"`, sem áudio e playback sob observação de visibilidade. O clipe específico do torneio não é publicado, pois a placa com telefone antigo persiste nos planos abertos e um corte que a oculta prejudica o enquadramento do atleta. Não mostrar cortina de carregamento nem botão de cursor infinito.

Preservar a bola giratória acionada pelo usuário, os feedbacks úteis, o ribbon do torneio e as microinterações existentes. Em `prefers-reduced-motion`, manter poster estático e conteúdo completo. Não fazer informação depender de animação; manter `:focus-visible`, navegação por teclado e textos legíveis sem JavaScript ou vídeo.
