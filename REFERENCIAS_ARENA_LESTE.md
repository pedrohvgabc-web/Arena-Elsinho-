# Referências oficiais da Arena Leste

Consulta realizada em 8 de novembro de 2026. O Instagram não permitiu inspecionar visualmente todos os vídeos; observações sobre Reels abaixo vêm somente das legendas públicas abertas pelos links.

## Fontes recomendadas

- Perfil oficial: [@arenalesteoficial](https://www.instagram.com/arenalesteoficial/). A bio observada identifica Arena Leste, mostra a Rua Jequié, 6820, Cuniã, e Av. Pinheiro Machado, 6706; apresenta destaques RESERVAS, MODALIDADES, LESTE 2 e HORÁRIOS. Usar como link para a rede social, não como fonte de uma grade de horários.
- Links oficiais: [beacons.ai/arenaleste](https://beacons.ai/arenaleste). A página lista destinos rotulados WhatsApp, Instagram, Unidade 01 Matriz e Unidade 02 Arena Leste 2. Os destinos não foram abertos/verificados, por isso o novo site usa o número e o perfil que o usuário forneceu, não URLs internas inferidas.
- Reel de estrutura: [DVd5VWMALKs](https://www.instagram.com/reel/DVd5VWMALKs/). A legenda menciona quadras cobertas e abertas, espaços de convivência e dois endereços. A reprodução não foi inspecionada e a legenda diz 6705 para a Unidade 2.
- Reel de endereços: [DQAAc3UAHEa](https://www.instagram.com/reel/DQAAc3UAHEa/). A legenda identifica Arena 1 em Rua Jequié, 6820, atrás da Academia de Sena; para a Arena 2 usa 6686 com Rua Daniela. A publicação é de 19/10/2025 e pode estar desatualizada.
- Reel de reservas: [DQ4cIE5gEvf](https://www.instagram.com/reel/DQ4cIE5gEvf/). A legenda convida a reservar e informa Rua Jequié, 6820; não fornece telefone ou caminho de reserva no texto observado.
- Anúncio da segunda unidade: [DJrxHPWpbyI](https://www.instagram.com/reel/DJrxHPWpbyI/). A legenda de 15/05/2025 anuncia a chegada da segunda unidade e fala em agendamento por WhatsApp; não confirma dados operacionais atuais.

## Itens não confirmados

- O destaque [HORÁRIOS](https://www.instagram.com/stories/highlights/17915974085942538/?hl=pt-br) exigiu login e não mostrou a grade. O site não publica horários até a Arena confirmar.
- O número da Av. Pinheiro Machado diverge entre a bio atual observada (6706), o Reel de estrutura (6705) e o Reel de endereços (6686). O site usa 6706 conforme a informação mais recente fornecida pelo usuário e explicita que o número/pino deve ser confirmado antes de sair.
- A geocodificação OpenStreetMap identificou a Rua Jequié como via em Cuniã, mas não localizou o número predial da Arena. Para Pinheiro Machado, retornou a via, não o lote 6706. Os marcadores do mapa são, portanto, buscas/endereço aproximados; o link “abrir no mapa” oferece a busca do endereço e a ressalva para confirmar pelo WhatsApp.
- Nenhuma foto de Reel foi copiada ou apresentada como foto real das instalações. A foto gerada para a primeira versão é ilustração esportiva provisória; aguardar o pack de fotos e a arte da camisa do usuário.

## Links consultados

- [Perfil Instagram](https://www.instagram.com/arenalesteoficial/)
- [Destaque de horários](https://www.instagram.com/stories/highlights/17915974085942538/?hl=pt-br)
- [Segunda unidade — DJrxHPWpbyI](https://www.instagram.com/reel/DJrxHPWpbyI/)
- [Endereços — DQAAc3UAHEa](https://www.instagram.com/reel/DQAAc3UAHEa/)
- [Reserva — DQ4cIE5gEvf](https://www.instagram.com/reel/DQ4cIE5gEvf/)
- [Estrutura — DVd5VWMALKs](https://www.instagram.com/reel/DVd5VWMALKs/)
- [Links oficiais Beacons](https://beacons.ai/arenaleste)
- OpenStreetMap Nominatim busca da Rua Jequié, Cuniã: https://nominatim.openstreetmap.org/search?q=Rua%20Jequi%C3%A9%206820%2C%20Cuni%C3%A3%2C%20Porto%20Velho%2C%20RO%2C%20Brazil&format=jsonv2&limit=3
- OpenStreetMap Nominatim busca de Av. Pinheiro Machado, 6706: https://nominatim.openstreetmap.org/search?q=Avenida%20Pinheiro%20Machado%206706%2C%20Porto%20Velho%2C%20RO%2C%20Brazil&format=jsonv2&limit=3

## Fontes técnicas da implementação

- [Render Blueprint Specification](https://render.com/docs/blueprint-spec): referência consultada para a sintaxe de `headers` e ordem de `routes` declarada no `render.yaml` do Static Site.
- [Render Redirects and Rewrites](https://render.com/docs/redirects-rewrites): referência consultada para preservar o proxy `/api/*` antes do fallback `/index.html`.
- O mapa incorporado usa uma URL de busca do próprio Google Maps (`maps.google.com/maps?q=…&output=embed`), não a Maps JavaScript API nem um token/chave de navegador. O endereço é apresentado como aproximado quando o geocodificador não localiza o número predial.
