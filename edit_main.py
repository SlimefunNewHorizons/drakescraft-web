import re
R='/tmp/claude-1000/w/web/'
def rd(f): return open(R+f,encoding='utf8').read()
def wr(f,s): open(R+f,'w',encoding='utf8').write(s)
def rep(f,a,b,count=1,must=True):
    s=rd(f)
    if a not in s:
        if must: raise SystemExit(f'NO MATCH {f}: {a[:70]}')
        return
    wr(f,s.replace(a,b) if count==0 else s.replace(a,b,count))

# ---------------------------------------------------------------- catalogo
C='catalog/store-catalog.js'
pairs=[
 ('portátiles y seguras en cualquier mundo','portátiles y seguras'),
 ('Vuelo permanente <code>/fly</code> ilimitado en todo el Survival (¡sin baterías ni gemas!)','<code>/fly</code> mientras dure el pase, en tus protecciones y zonas habilitadas (¡sin baterías ni gemas!)'),
 ('🪽 ¡Vuelo Permanente <code>/fly</code> libre e ilimitado en todo el Survival! Olvídate de recargar energía o perder gemas','🪽 <code>/fly</code> durante los 30 días del pase, en tus protecciones y zonas habilitadas, sin recargar energía ni gastar gemas'),
 ('🪽 Vuelo Permanente <code>/fly</code> ilimitado en todo el Survival sin requerir ítems ni energía','🪽 <code>/fly</code> mientras dure el pase, en tus protecciones y zonas habilitadas, sin ítems ni energía'),
 ('🪽 Vuelo Permanente <code>/fly</code> ilimitado en todo el Survival','🪽 <code>/fly</code> mientras dure el pase, en tus protecciones y zonas habilitadas (sin energía ni gemas)'),
 ('hereda vuelo <code>/fly</code> permanente','hereda el <code>/fly</code> de Hermes'),
 ('con herencia total y vuelo <code>/fly</code> permanente','con herencia total y <code>/fly</code> (en tus protecciones y zonas habilitadas)'),
 ('vuelo ilimitado <code>/fly</code>','<code>/fly</code>'),
 ('vuelo <code>/fly</code>,','<code>/fly</code>,'),
 ('vuelo /fly,','/fly,'),
 ('El rango y el kit funcionan en las tres modalidades','El rango y el kit aplican según la modalidad (ver la FAQ de la tienda)'),
 ('Keep Inventory permanente (nunca pierdes tus ítems al morir)','Keep Inventory mientras dure el pase (no pierdes tus ítems al morir)'),
 ('⚡ Keep Inventory Permanente: ¡Conserva todo tu inventario y equipamiento al morir en cualquier mundo!','⚡ Keep Inventory mientras dure el pase: conservas inventario y equipamiento al morir (ventaja de juego)'),
 # Economia Premium / Slimefun / Anti-AFK / bovedas / vuelo
 ("badge: 'Permanente'","badge: 'Temporada'"),
 ('Beneficios comerciales permanentes: 25 tiendas, <code>/sell</code>, prefijo exclusivo y chat con color.','Beneficios comerciales durante toda la temporada: más tiendas QuickShop, <code>/sell</code>, prefijo exclusivo y chat con color.'),
 ('Hasta 25 tiendas QuickShop (el jugador base tiene 10)','Más tiendas QuickShop que el jugador base (el número exacto está en verificación; consúltalo en Discord antes de comprar)'),
 ('Distinción permanente en el chat con prefijo [Economía Premium]','Distinción en el chat con prefijo [Economía Premium] durante la temporada'),
 ('Permanente: no caduca ni se renueva; no cambia los impuestos de QuickShop','Vigente durante toda la temporada en curso (en Tebex puede figurar como "permanente"); no se renueva ni cambia los impuestos de QuickShop'),
 ('Ahorra semanas de farmeo: desbloqueo permanente instantáneo de todas las investigaciones de Slimefun.','Ahorra semanas de farmeo: desbloqueo instantáneo de todas las investigaciones de Slimefun durante la temporada en curso. Es un atajo de progresión.'),
 ('Desbloqueo inmediato y permanente de todas las ramas de investigación de Slimefun','Desbloqueo inmediato de todas las ramas de investigación de Slimefun, vigente hasta el cierre de la temporada en curso'),
 ('Desbloqueos permanentes de investigación sin entregar objetos ni permisos de administración.','Desbloqueo de investigaciones de Slimefun durante la temporada en curso, sin entregar objetos ni permisos de administración.'),
 ('Pase Anti-AFK Vitalicio (Temporada)','Pase Anti-AFK de Temporada'),
 ('Inmunidad a la expulsión por inactividad prolongada en todos los mundos','Inmunidad a la expulsión por inactividad prolongada (en Tebex puede figurar como "Anti-AFK Vitalicio": dura la temporada, no es de por vida)'),
 ('Acceso permanente a 10 bóvedas virtuales privadas completas','Acceso, durante toda la temporada en curso, a 10 bóvedas virtuales privadas completas'),
 ('10 bóvedas virtuales privadas (<code>/pv 1-10</code>).','10 bóvedas virtuales privadas (<code>/pv 1-10</code>) durante toda la temporada en curso.'),
 ('Vuelo creativo libre con <code>/fly</code> durante una semana completa en todo el Survival.','<code>/fly</code> durante una semana completa dentro de tus regiones protegidas.'),
 ('Vuelo libre ilimitado con el comando <code>/fly</code> durante 7 días continuos','<code>/fly</code> sin límite de uso durante 7 días continuos, dentro de tus regiones protegidas'),
 ('Vuelo libre ilimitado con <code>/fly</code> durante 30 días exactos (720 horas)','<code>/fly</code> sin límite de uso durante 30 días exactos (720 horas), dentro de tus regiones protegidas'),
 ('Duración acumulable si compras más de uno','Los días empiezan a contar desde el pago'),
 ('Un mes completo de vuelo libre con <code>/fly</code> para construir y explorar a tu ritmo.','Un mes completo de <code>/fly</code> dentro de tus regiones protegidas para construir y explorar a tu ritmo.'),
 ('¡Ideal para proyectos grandes! 7 días de vuelo creativo libre,','¡Ideal para proyectos grandes! 7 días de <code>/fly</code> en tus protecciones,'),
 ('7 días exactos de VUELO LIBRE desde la compra para construir a cualquier altura','7 días exactos de <code>/fly</code> desde la compra, dentro de tus regiones protegidas'),
 (' y 4 homes (<code>/sethome</code>) mientras dure el rol',''),
 ("'Pases temporales de vuelo libre /fly y pases Anti-AFK sin expulsión por inactividad.'","'Pases temporales de /fly dentro de tus regiones protegidas. Los pases Anti-AFK están en Utilidad.'"),
 ("'Resumen de lo que trae cada línea de rango.'","'Kits sueltos de las líneas Hermes y Zeus. Ojo: cada rango ya incluye el kit de su línea; no compres ambos.'"),
 ("'Dragmas de plata y beneficios de economía.'","'Dragmas, homes, bóvedas, Anti-AFK y Economía Premium. Lo marcado \"Temporada\" dura hasta el cierre de la temporada en que lo compras.'"),
 ("'La línea superior de rangos mensuales: equipo, protecciones y habilidades de escala primordial.'","'La línea superior de rangos: pases de 30 días sin renovación automática, con equipo, protecciones y habilidades de escala primordial.'"),
 ("currency: 'CLP',","currency: 'USD',"),
]
for a,b in pairs: rep(C,a,b,0)
# SFMaster y cross-sell
s=rd(C)
def add_inc(pid, text):
    global s
    m=re.search(r"\{ id: '"+re.escape(pid)+r"',.*?includes: \[(.*?)\] \}",s,re.S)
    assert m,pid
    inc=m.group(1)
    new=inc.rstrip()+", '"+text+"'"
    s=s[:m.start(1)]+new+s[m.end(1):]
add_inc('poseidon','🔑 Pase SFMaster de 24 horas incluido: reclamo temporal de objetos de Slimefun (ventaja de progresión; límite de 32 reclamos por hora según la configuración publicada)')
add_inc('titan-caos','🔑 Pase SFMaster de 72 horas incluido: reclamo temporal de objetos de Slimefun (ventaja de progresión; límite de 48 reclamos por hora según la configuración publicada)')
add_inc('kit-hermes','Si compras el rango Hermes (o superior), el kit Hermes ya viene incluido: no compres ambos')
add_inc('kit-zeus','Si compras el rango Zeus (o superior), el kit Zeus ya viene incluido: no compres ambos')
# orden de categorias
cats=re.search(r"categories: \[\n(.*?)\n  \],\n  products",s,re.S)
lines=cats.group(1).split('\n')
by={re.search(r"id: '([^']+)'",l).group(1):l.rstrip(',') for l in lines}
order=['monthly','titans','protection','utility','passes','slimefun','roles','kits','crates','boosters','christmas']
assert set(order)==set(by),set(by)^set(order)
s=s[:cats.start(1)]+',\n'.join(by[k] for k in order)+s[cats.end(1):]
s=s.replace("updatedAt: '2026-09-15'","updatedAt: '2026-11-09'")
wr(C,s)
