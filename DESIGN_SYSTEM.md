# Design system — Arena Leste

Tokens em `src/styles.css` usam OKLCH: fundo carvão, primária laranja inspirada na logo, superfícies quentes, texto claro, warning âmbar, erro vermelho e sucesso verde. O botão WhatsApp permanece verde para preservar o sinal visual reconhecível do canal. Barlow Condensed dá impacto aos títulos; Manrope prioriza leitura em textos e formulários.

O layout é mobile-first, usa alvos de toque de pelo menos 44px, contraste forte e `:focus-visible`. A bola de vôlei tem giro acionável por botão; a faixa superior e o ticker param ao receber hover. `prefers-reduced-motion` desativa animações e transições. Mapas e Reel oficial abrem de forma leve, sem carregar vídeo de terceiro no hero.
