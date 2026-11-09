exec(open('/tmp/claude-1000/w/edit_main.py').read().split('# ---------------------------------------------------------------- catalogo')[0])
import re
# anchor EN


# ---- terms.html (ES)
f='terms.html'
s=rd(f)
# normalizar saltos de linea del bloque para reemplazos robustos
def flex(a):  # patron tolerante a espacios/saltos
    return re.compile(r'(?:\s|<[^>]+>)+'.join(re.escape(w) for w in a.split()))
def frep(a,b):
    global s
    p=flex(a); assert p.search(s),a[:60]; s=p.sub(lambda m:b,s,count=1)
frep('realizar cualquier compra/donación en la','realizar cualquier compra en la')
frep('3. Protección ante Donaciones y Pagos de Alto Monto','3. Protección ante Pagos de Alto Monto')
s=s.replace('3. Protección ante Donaciones y Pagos de Alto Monto','3. Protección ante Pagos de Alto Monto')
frep('Realizar donaciones elevadas','Realizar pagos elevados')
frep('"donación accidental"','"compra accidental"')
frep('Las compras y donaciones son aportes voluntarios destinados al sostenimiento, licencias y mantenimiento del hardware del servidor.','Las compras de la tienda son productos digitales de entrega inmediata; lo que se paga financia el hardware, las licencias y el mantenimiento del servidor. (El patrocinio voluntario de la página Apoya es aparte y sí es una donación.)')
frep('No se realizarán reembolsos bajo ninguna circunstancia por descontento, cambios de opinión, pérdida de interés, inactividad del jugador o decisiones personales.','No se reembolsa dinero por descontento, cambios de opinión, pérdida de interés, inactividad del jugador o decisiones personales, porque el producto se entrega y activa de inmediato. Lo que sí hacemos es resolver en el juego cualquier problema con tu compra, como se detalla a continuación y en la sección 5 de la versión en inglés. Esto se entiende sin perjuicio de los derechos irrenunciables que la ley chilena reconoce al consumidor.')
frep('Todas las transacciones en DrakesCraft son finales y estrictamente no reembolsables','Las compras en DrakesCraft son finales y <strong>no se reembolsan en dinero')
frep('Todos los aportes económicos son donaciones voluntarias para la infraestructura y mantenimiento del servidor.','Las compras de la tienda son pagos por productos digitales; los aportes voluntarios de la página Apoya son donaciones para la infraestructura y el mantenimiento del servidor.')
frep('2. Naturaleza de los Bienes y Política Estricta de NO Reembolso','2. Naturaleza de los Bienes, Vigencia Estacional y Política de No Reembolso')
s=s.replace('2. Naturaleza de los Bienes, Vigencia Estacional y Política Estricta de NO Reembolso','2. Naturaleza de los Bienes, Vigencia Estacional y Política de No Reembolso')
# bullets de entrega / no llego / nick / disputa: se agregan al final de la lista de la seccion 2
m=re.search(r'Pases y Rangos Temporales \(30 días\):.*?</li>',s,re.S)
assert m
add='''
                <li>
                  <strong>Entrega:</strong> automática tras el pago confirmado, normalmente entre 1 y 5 minutos. Si pasan 30 minutos y no llegó, abre un ticket en Discord con tu nick y el ID de transacción de Tebex.
                </li>
                <li>
                  <strong>No llegó, llegó incompleto o pagaste con un nick equivocado:</strong> con tu recibo, el staff reentrega la compra, la transfiere a tu cuenta correcta o la compensa en el juego. Si la falla fue de la infraestructura de DrakesCraft, la compensación incluye un beneficio adicional.
                </li>
                <li>
                  <strong>Antes de una disputa:</strong> escríbenos primero; los problemas de entrega se resuelven en el juego. Lo que dice la sección 4 aplica a quien abre una disputa bancaria igualmente, sin haber consultado.
                </li>
                <li>
                  <strong>Precios y moneda:</strong> los precios base son en dólares (USD) y el cobro lo procesa Tebex, el vendedor registrado. Las conversiones a otras monedas que muestra la tienda son estimaciones; el tipo de cambio lo define tu banco o Tebex.
                </li>'''
s=s[:m.end()]+add+s[m.end():]
wr(f,s)

# ---- guia-rangos: roles
rep('guia-rangos.html','Pases de 30 días solo para identificarte con prefijo visual en el chat. No incluyen kit, objetos ni Slimefun.','Pases de 30 días con prefijo visual en el chat, un kit único de herramientas (se entrega al comprar) y 15.000 ₯ de bienvenida. No incluyen materiales de endgame ni Slimefun.')
rep('guia-rangos-en.html','30-day cosmetic passes to identify yourself with a visual chat badge. Do not include kits, items, or Slimefun.','30-day passes with a chat badge, a one-time tool kit (delivered on purchase) and 15,000 ₯ welcome Dragmas. They do not include endgame materials or Slimefun.')

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
