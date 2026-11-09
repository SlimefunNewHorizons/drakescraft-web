import re
exec(open('/tmp/claude-1000/w/edit_main.py').read().split('# ---------------------------------------------------------------- catalogo')[0])

# ---- tabla comparativa (cifras de guia-rangos.html + precios del catalogo)
RANKS=[('Hércules',4.99,'—',3,3,'49×49',20),('Hestia',7.99,'—',5,4,'81×81',30),('Hermes',10.99,'Sí',6,5,'113×113',40),
('Hefesto',15.99,'Sí',8,7,'177×177',50),('Artemisa',22.99,'Sí',10,8,'241×241',60),('Afrodita',31.99,'Sí',12,10,'353×353',70),
('Zeus',44.99,'Sí',20,15,'481×481',80),('Thor',49.99,'Sí',25,20,'601×601',100),('Anubis',54.99,'Sí',30,25,'721×721',120),
('Poseidón',59.99,'Sí',35,30,'841×841',150),('Titán Japeto',49.99,'Sí',40,35,'1001×1001',200),('Titán Oceanus',59.99,'Sí',45,40,'1301×1301',250),
('Titán Hiperión',69.99,'Sí',50,45,'1601×1601',300),('Titán Cronos',79.99,'Sí',60,50,'2001×2001',400),('Titán Caos',89.99,'Sí',100,50,'2501×2501',500)]
def table(en):
    h=('Rank','USD / 30 days','/fly*','Homes','Vaults','Protection','Shops') if en else ('Rango','USD / 30 días','/fly*','Hogares','Bóvedas','Protección','Tiendas')
    rows=''.join(f'<tr><th scope="row">{n}</th><td>US${p:.2f}</td><td>{("Yes" if f=="Sí" and en else f)}</td><td>{ho}</td><td>{bo}</td><td>{pr}</td><td>{ti}</td></tr>' for n,p,f,ho,bo,pr,ti in RANKS)
    cap=('Rank comparison' if en else 'Comparativa de rangos')
    foot=('Each rank inherits the ones below. Passes last 30 days and do not renew by themselves. *<code>/fly</code> works in your protected regions and enabled areas, without energy or gems. Figures from the <a href="guia-rangos-en.html">Ranks Guide</a>; Hercules and Hestia include no <code>/fly</code>.' if en else
          'Cada rango hereda los de abajo. Duran 30 días y no se renuevan solos. *<code>/fly</code> funciona en tus regiones protegidas y zonas habilitadas, sin energía ni gemas. Cifras de la <a href="guia-rangos.html">Guía de Rangos</a>; Hércules y Hestia no incluyen <code>/fly</code>.')
    return f'''<details class="store-compare" id="comparativa">
            <summary>{cap}</summary>
            <div class="store-compare__scroll"><table class="store-compare__table"><caption class="visually-hidden">{cap}</caption><thead><tr>{"".join(f'<th scope="col">{x}</th>' for x in h)}</tr></thead><tbody>{rows}</tbody></table></div>
            <p class="store-compare__foot">{foot}</p>
          </details>'''

HOWTO_ES='''<div class="store-t2-notice" role="note">
            <strong>Temporada 2 en pruebas (solo staff).</strong> Apertura prevista: 18 de noviembre de 2026, por confirmar en Discord. Los pases de 30 días empiezan a correr al pagar, no al abrir el servidor: te recomendamos comprar desde la apertura.
          </div>
          <div class="store-howto" id="como-comprar">
            <h2>Cómo comprar y qué recibes</h2>
            <ol>
              <li><strong>Elige Java o Bedrock.</strong> En Bedrock tu nick lleva un punto delante (por ejemplo <code>.TuNick</code>); la tienda lo agrega sola.</li>
              <li><strong>Escribe tu nick exacto</strong>, con mayúsculas y minúsculas.</li>
              <li><strong>Paga en Tebex.</strong> Los precios base y el cobro son en dólares (USD); las otras monedas son solo una estimación.</li>
              <li><strong>Entra al servidor.</strong> La entrega es automática, normalmente entre 1 y 5 minutos tras el pago; si estabas desconectado, llega cuando entres.</li>
            </ol>
            <p><strong>Qué recibes:</strong> lo que dice cada tarjeta, nada más. Los rangos son pases de 30 días sin renovación automática. Lo que dice «temporada», y lo que en Tebex figura como «permanente» o «vitalicio» (Anti-AFK, bóvedas, homes, Economía Premium, Conocimiento de Slimefun), dura hasta el cierre de la temporada en que lo compras, igual que en los <a href="terms.html">términos</a>.</p>
            <p><strong>Si no llegó:</strong> abre un ticket en <a href="https://discord.gg/rv3vtXZTk7" target="_blank" rel="noopener">Discord</a> con tu nick y el ID de transacción de Tebex. Lo reentregamos, lo pasamos a tu cuenta correcta o lo compensamos en el juego (<a href="terms.html#seccion-2">términos, sección 2</a>). Más ayuda en <a href="support.html">Soporte de compras</a>.</p>
          </div>
          '''+table(False)

HOWTO_EN='''<div class="store-t2-notice" role="note">
            <strong>Season 2 is in testing (staff only).</strong> Planned opening: November 18, 2026, to be confirmed on Discord. 30-day passes start counting when you pay, not when the server opens, so we recommend buying from the opening date.
          </div>
          <div class="store-howto" id="how-to-buy">
            <h2>How to buy and what you get</h2>
            <ol>
              <li><strong>Pick Java or Bedrock.</strong> On Bedrock your username starts with a dot (for example <code>.YourName</code>); the store adds it for you.</li>
              <li><strong>Type your exact username</strong>, case-sensitive.</li>
              <li><strong>Pay on Tebex.</strong> Base prices and the actual charge are in US dollars (USD); other currencies are only an estimate.</li>
              <li><strong>Join the server.</strong> Delivery is automatic, normally 1 to 5 minutes after payment; if you were offline it arrives when you join.</li>
            </ol>
            <p><strong>What you get:</strong> what each card says, nothing more. Ranks are 30-day passes with no automatic renewal. Anything marked "season", and anything Tebex labels "permanent" or "lifetime" (Anti-AFK, vaults, homes, Premium Economy, Slimefun Knowledge), lasts until the end of the season in which you buy it, as stated in the <a href="terms-en.html">terms</a>.</p>
            <p><strong>If it did not arrive:</strong> open a ticket on <a href="https://discord.gg/rv3vtXZTk7" target="_blank" rel="noopener">Discord</a> with your username and the Tebex transaction ID. We will redeliver it, move it to the right account or compensate you in-game (<a href="terms-en.html#seccion-2">terms, section 2</a>). More help in <a href="support-en.html">Purchase Support</a>.</p>
          </div>
          '''+table(True)

# ---- FAQ ES
def faq(items, en):
    out=[]
    for i,(q,a) in enumerate(items):
        out.append(f'''          <details class="faq-item" name="store-faq"{" open" if i==0 else ""}>
            <summary class="faq-question">
              <span>{q}</span>
              <span class="faq-toggle" aria-hidden="true"></span>
            </summary>
            <div class="faq-answer">
              <p>{a}</p>
            </div>
          </details>
''')
    head=('WE ANSWER YOUR QUESTIONS','Store Frequently Asked Questions','Everything you need to know about deliveries, platforms, passes and security before acquiring your upgrade.') if en else ('RESOLVEMOS TUS DUDAS','Preguntas frecuentes de la tienda','Entrega, plataformas, duración de los pases y qué ventajas de juego se venden, antes de comprar.')
    return f'''    <section class="store-faq-section" id="faq">
      <div class="container">
        <div class="store-section-header">
          <div>
            <span class="eyebrow-accent">{head[0]}</span>
            <h2>{head[1]}</h2>
          </div>
          <p class="section-desc">{head[2]}</p>
        </div>
        <div class="faq-list">
{"".join(out)}        </div>
      </div>
    </section>

'''
FAQ_ES=faq([
('¿Cómo y cuándo llega mi compra?','La entrega es <strong>automática</strong> vía Tebex y Odysseia. Al confirmarse el pago, rangos, kits o Dragmas se aplican en el servidor normalmente entre <strong>1 y 5 minutos</strong>. Si estás conectado los recibes en vivo; si no, se acreditan al entrar. Si pasan 30 minutos sin novedad, abre un ticket en Discord con tu nick y el ID de transacción de Tebex.'),
('¿Cuánto duran los pases «permanentes» (como Anti-AFK) y los rangos?','Los rangos son pases de <strong>30 días</strong>, sin renovación automática. Lo marcado «temporada», y lo que en Tebex figura como «permanente» o «vitalicio» (Pase Anti-AFK, bóvedas, homes, Economía Premium, Conocimiento de Slimefun), dura <strong>hasta el cierre de la temporada en la que lo compras</strong> y se extingue con su cierre o reseteo. Lo comprado en la T1 terminó con la T1; lo de la T2 dura hasta el fin de la T2. Nada es de por vida. Detalle en los <a href="terms.html#seccion-2">términos</a>.'),
('¿Los rangos se renuevan solos?','<strong>No.</strong> No hay suscripciones ni cobros sorpresa. Cada rango es un único pase de 30 días; al vencer decides si compras otro.'),
('¿Puedo comprar desde Bedrock (móvil, Win10 o consolas)?','<strong>Sí.</strong> En el selector de plataforma elige <strong>Bedrock</strong>: la tienda antepone el punto a tu nick (por ejemplo <code>.TuNick</code>) para que la integración con Geyser entregue la compra a tu cuenta Bedrock. Si compras directamente en Tebex o con el comando <code>/buy</code>, recuerda escribir el punto tú mismo.'),
('¿Mi rango vale en todas las modalidades?','Tu rango y tus Dragmas te acompañan, pero los inventarios y las subastas son independientes por modalidad y el Laboratorio es creativo, sin comercio (ver la <a href="guia.html#modalidades">guía</a>). Los límites de bóvedas, homes y protecciones por modalidad no están detallados: si te importa para una modalidad concreta, pregunta en Discord antes de comprar.'),
('¿El /fly de los rangos tiene límite o gasta energía?','No gasta energía, combustible, baterías ni dinero. El <code>/fly</code> de los rangos y de los pases de vuelo funciona <strong>en tus regiones protegidas y zonas donde esté habilitado</strong>, mientras dure el pase (30 días en los rangos, incluidos los Titanes).'),
('¿Qué pasa si me equivoqué de nick?','No pierdes la compra. Abre un ticket en <a href="https://discord.gg/rv3vtXZTk7" target="_blank" rel="noopener">Discord</a> con tu recibo de Tebex y el staff la transfiere a tu cuenta correcta, sin costo.'),
('¿Es pay-to-win?','La tienda vende comodidad y cosméticos, pero también ventajas de juego, y es mejor decirlo claro: Dragmas por dinero real, kits de equipo, habilidades de rango, Keep Inventory (desde Zeus), conservación de EXP (desde Artemisa), <code>/ultragod</code> (Titán Caos), pase SFMaster temporal (24 h en Poseidón, 72 h en Titán Caos) y el Conocimiento Total de Slimefun. Cada tarjeta detalla lo que incluye. Los Dragmas también se ganan jugando.'),
('¿Por qué los precios están en dólares?','Tebex cobra en dólares (USD). La conversión a otras monedas que ves en la tienda es solo una <strong>estimación</strong> con tasas públicas: el cobro real es en USD y el tipo de cambio lo define tu banco o Tebex. Tebex es el vendedor registrado (Merchant of Record) y puede aplicar impuestos según tu país.'),
],False)
FAQ_EN_EXTRA=[
('Is the store pay-to-win?','The store sells convenience and cosmetics, but also gameplay advantages, and we would rather say so plainly: Dragmas for real money, equipment kits, rank abilities, Keep Inventory (from Zeus), XP retention (from Artemis), <code>/ultragod</code> (Titan Chaos), a temporary SFMaster pass (24 h with Poseidon, 72 h with Titan Chaos) and Total Slimefun Knowledge. Each card lists what it includes. Dragmas can also be earned by playing.'),
('Why are prices in US dollars?','Tebex charges in US dollars (USD). The conversion to other currencies shown in the store is only an <strong>estimate</strong> from public rates: the real charge is in USD and your bank or Tebex sets the exchange rate. Tebex is the Merchant of Record and may apply taxes depending on your country.'),
]

# ---- ES store.html
f='store.html'
rep(f,'''activación instantánea en el servidor. Todas las compras son
                definitivas y procesadas por la pasarela segura de Tebex.''','''entrega automática en el servidor. Son productos digitales, no
                reembolsables en dinero (si algo falla, lo resolvemos en el
                juego), procesados por la pasarela segura de Tebex.''')
rep(f,'<strong>Activación Inmediata</strong>','<strong>Entrega Automática</strong>')
rep(f,'⚡ DrakesCraft T2 · Purpur 26.2 · Seis modalidades activas (ViaVersion 1.20 a 26.x + Bedrock)','⚡ DrakesCraft T2 · Purpur 26.2 · Seis modalidades · T2 en pruebas, solo staff (ViaVersion 1.20 a 26.x + Bedrock)')
# EULA ribbon: tras el bloque de features (antes de cerrar el contenedor izquierdo)
rep(f,'''          <div class="store-section-header">
            <div>
              <span class="eyebrow-accent">CATÁLOGO OFICIAL</span>''',HOWTO_ES+'''
          <div class="store-compliance-ribbon">
            <span class="ribbon-tag">AVISO</span>
            <p>NO ES UN PRODUCTO OFICIAL DE MINECRAFT. NO ESTÁ APROBADO NI ASOCIADO A MOJANG NI MICROSOFT. Pagos procesados por Tebex Limited.</p>
          </div>
          <div class="store-section-header">
            <div>
              <span class="eyebrow-accent">CATÁLOGO OFICIAL</span>''')
rep(f,'Todas las transacciones son finales, voluntarias y de entrega digital inmediata.','Son productos digitales de entrega inmediata: no se reembolsan en dinero, pero si algo falla lo resolvemos en el juego (ver términos). Precios base en USD; otras monedas son estimaciones.')
rep(f,'''                    <button
                      class="btn btn-primary btn-checkout-submit"''','''                    <label class="checkout-age">
                      <input type="checkbox" id="age-confirm" name="age" required />
                      <span>Tengo 14 años o más (o autorización de mi tutor) y acepto los <a href="terms.html" target="_blank" rel="noopener">Términos del Servicio</a> y la entrega digital inmediata. No es un producto oficial de Minecraft.</span>
                    </label>
                    <button
                      class="btn btn-primary btn-checkout-submit"''')
rep(f,'''              Tu rango, empleos, habilidades y Dragmas te siguen entre todas las
              modalidades.''','''              Tu rango y tus Dragmas te acompañan; los inventarios y las
              subastas son independientes por modalidad.''')
rep(f,'<section class="store-team-section" id="equipo">',FAQ_ES+'    <section class="store-team-section" id="equipo">')
rep(f,'<li><a href="#catalogo"','<li><a href="#catalogo"',must=False)

# ---- EN store-en.html
f='store-en.html'
fx_en=open(R+'store.html',encoding='utf8').read()
m=re.search(r'          <div class="fx-box" id="fx-box">.*?          </div>\n',fx_en,re.S)
FX_ES=m.group(0)
tr=[('Ver precios aproximados en:','Show approximate prices in:'),('USD (precio real)','USD (actual price)'),('peso chileno','Chilean peso'),('peso argentino','Argentine peso'),('peso mexicano','Mexican peso'),('peso colombiano','Colombian peso'),('sol peruano','Peruvian sol'),('peso uruguayo','Uruguayan peso'),('boliviano','Bolivian boliviano'),('real brasileño','Brazilian real'),('libra esterlina','pound sterling'),('dólar canadiense','Canadian dollar'),
('Los precios base son en <strong>USD</strong>. Las otras monedas son un valor <strong>estimado</strong>: el cobro real es en USD y el tipo de cambio lo define tu banco o Tebex.','Base prices are in <strong>USD</strong>. Other currencies are an <strong>estimate</strong>: the actual charge is in USD and the exchange rate is set by your bank or Tebex.')]
FX_EN=FX_ES
for a,b in tr: FX_EN=FX_EN.replace(a,b)
FX_EN=FX_EN.replace('<option value="BOB">BOB · Bolivian boliviano Bolivian boliviano','<option value="BOB">BOB · Bolivian boliviano')
rep(f,'        <!-- Category Tabs -->',FX_EN+'        <!-- Category Tabs -->')
rep(f,'<!-- Legal Disclaimer and Terms Banner -->',HOWTO_EN.replace('\n          ','\n        ')+'\n\n        <!-- Legal Disclaimer and Terms Banner -->')
rep(f,'Final price and currency are shown in Tebex checkout.','Prices are in USD; other currencies are only estimates. The final price and currency are shown in Tebex checkout.')
rep(f,'''                <div class="checkout-eula-notice">
                  <small>By proceeding you confirm you are 14 or older (or have parental consent) and accept the <a href="terms-en.html" target="_blank" rel="noopener">Terms of Service</a> and immediate digital delivery policy. NOT AN OFFICIAL MINECRAFT PRODUCT.</small>
                </div>''','''                <label class="checkout-age">
                  <input type="checkbox" id="age-confirm" name="age" required>
                  <span>I am 14 or older (or have parental consent) and I accept the <a href="terms-en.html" target="_blank" rel="noopener">Terms of Service</a> and the immediate digital delivery policy. Not an official Minecraft product.</span>
                </label>''')
rep(f,"permanently active for your rank duration (or for life in Titans).","for as long as your pass lasts (30 days for ranks, Titans included), in your protected regions and in areas where it is enabled.")
rep(f,"is <strong>unlimited free flight</strong> in all areas where it's enabled,","is <strong>free flight</strong> in your protected regions and in areas where it is enabled,")
rep(f,'<p><strong>Yes.</strong> DrakesCraft has a synchronized global permissions and economy network. Your VIP rank, progress multipliers, and Dragmas balance follow you across <strong>Slimefun, Classic, SkyBlock and OneBlock</strong>.</p>','<p>Your rank and your Dragmas go with you, but inventories and auctions are independent per game mode, and the Lab is creative-only with no trading (see the <a href="guia.html#modalidades">guide</a>). Per-mode limits for vaults, homes and protections are not itemized: if it matters for a specific mode, ask on Discord before buying.</p>')
rep(f,'(such as the <strong>Permanent Anti-AFK Pass</strong>, extra vaults, and seasonal ranks)','(such as the <strong>Permanent Anti-AFK Pass</strong>, extra vaults and homes, Premium Economy and Slimefun Knowledge; Tebex may label them "permanent" or "lifetime", but nothing is for life)')
s=rd(f)
extra=''.join(faq(FAQ_EN_EXTRA,True).split('<div class="faq-list">')[1].split('        </div>\n      </div>')[0:1])
# insertar antes del cierre de faq-list
idx=s.index('<div class="faq-list">'); end=s.index('        </div>\n      </div>\n    </section>',idx)
s=s[:end]+extra.replace(' open>','>')+s[end:]
wr(f,s)
print('ok')
