# Design system — Arena Leste

## Direção visual
Estética editorial esportiva de clube de praia ao entardecer. O hero usa a foto leve de vôlei já presente no projeto, hierarquia assimétrica e a bola interativa existente como assinatura. O restante da interface mantém fundos contidos, boa leitura e menos cartões repetidos.

## Tokens de cor

- Fundo carvão azulado: `#121820`
- Superfície ardósia: `#1C2530`
- Texto/areia clara: `#F4F1E8`
- Laranja proprietário: `#F27432`
- Azul secundário acessível derivado da identidade: `#218DB9`
- Texto secundário: `#A9B5C1`
- Verde fica restrito ao sinal visual do WhatsApp e estados de sucesso.

## Tipografia e composição
Manter Barlow Condensed em títulos e Manrope em leitura, botões e formulários. A hierarquia deve ser compacta, de alto contraste e responsiva, com conteúdo alinhado à esquerda no hero, texto curto e alvos de toque de pelo menos 44 px. O fluxo de reserva usa etapas claras no celular e resumo fixo apenas em desktop.

## Movimento e acessibilidade
Preservar todas as animações e transições já implementadas: bola giratória acionada pelo usuário, ribbon e ticker em marquee, reveal, jelly, pop e hover existentes. Não mudar seus keyframes nem a lógica de `motion.tsx`; respeitar `prefers-reduced-motion`, foco visível, contraste e navegação por teclado. Usar carregamento prioritário apenas para a imagem do hero e lazy loading para imagens abaixo da dobra.
