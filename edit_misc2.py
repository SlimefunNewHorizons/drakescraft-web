exec(open('/tmp/claude-1000/w/edit_main.py').read().split('# ---------------------------------------------------------------- catalogo')[0])
import re
# anchor EN



rep('guia-rangos.html','Pases de 30 días solo para identificarte con prefijo visual en el chat. <strong>No incluyen kit, objetos ni Slimefun.</strong>','Pases de 30 días con prefijo visual en el chat, un kit único (se entrega al comprar) y 15.000 ₯ de bienvenida. <strong>No incluyen materiales de endgame ni Slimefun.</strong>')
rep('guia-rangos-en.html','30-day cosmetic passes to identify yourself with a visual chat badge. <strong>Do not include kits, items, or Slimefun.</strong>','30-day passes with a chat badge, a one-time kit (delivered on purchase) and 15,000 ₯ welcome Dragmas. <strong>They do not include endgame materials or Slimefun.</strong>')

# ---- apoya
for f,a,b in [('apoya.html','puertos a 1.21.11','puertos a Purpur 26.2'),('apoya.html','adaptaciones a 1.21.11','adaptaciones a Purpur 26.2'),('apoya-en.html','ports to 1.21.11','ports to Purpur 26.2')]:
    rep(f,a,b,0,must=False)
rep('apoya.html','''<h3>🛡️ Sin Ventajas In-Game</h3>
            <p>
              No da objetos, ni dinero, ni rangos con ventajas injustas. Quien
              patrocina juega bajo las mismas reglas y retos que el resto.
            </p>''','''<h3>🛡️ El patrocinio no da ventajas</h3>
            <p>
              El patrocinio de GitHub Sponsors no da objetos, dinero ni rangos.
              La Tienda es aparte: vende rangos y paquetes, algunos con ventajas
              de juego que cada tarjeta detalla.
            </p>''')
rep('apoya-en.html','<h3>🛡️ No In-Game Advantages</h3>\n          <p>It gives no items, money, or unfair-advantage ranks. Sponsors play under the same rules and challenges as everyone else.</p>','<h3>🛡️ Sponsorship gives no advantages</h3>\n          <p>GitHub Sponsors gives no items, money or ranks. The Store is separate: it sells ranks and packs, some with gameplay advantages that each card details.</p>')
rep('apoya-en.html','<span><b>BALANCE</b> 0% Pay-to-Win</span>','<span><b>SPONSORSHIP</b> No in-game perks</span>')

# ---- metricas
rep('metricas.html','dedicado en Chile.','dedicado de juego en Dallas (EE. UU.).',1,must=False)
s=rd('metricas.html')
s=re.sub(r'clúster\s+dedicado en Chile\.','servidor de juego dedicado en Dallas (EE. UU.).',s)
wr('metricas.html',s)
rep('metricas-en.html','a dedicated server cluster in Chile.','a dedicated game server in Dallas (USA).')

# ---- hero.svg
rep('assets/hero.svg','IP: PLAY.DRAKESCRAFT.CL (PORT: 25565 / BEDROCK: 19132)','IP: MC.DRAKESCRAFT.CL')

# ---- privacidad: tabla publica de jugadores
rep('privacidad.html','<li>Seguridad: detección de multicuentas, ataques y abusos.</li></ul>','<li>Seguridad: detección de multicuentas, ataques y abusos.</li><li>Mostrar en la página de <a href="/metricas.html">Métricas</a> una tabla pública de la comunidad (jugador, país aproximado, días, desde cuándo, última conexión y horario habitual), sin IP ni datos privados.</li></ul>')
s=rd('privacidad-en.html')
i=s.index('Security')
print('privacidad-en ctx:', re.findall(r'<li>[^<]*(?:abuse|attacks)[^<]*</li></ul>',s)[:1])
wr('privacidad-en.html',s)
