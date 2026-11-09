import re
R='/tmp/claude-1000/w/web/'
def rd(f): return open(R+f,encoding='utf8').read()
def wr(f,s): open(R+f,'w',encoding='utf8').write(s)
def rep(f,a,b,count=1):
    s=rd(f); assert a in s,(f,a[:60]); wr(f,s.replace(a,b,count))

# server summary en USD
rep('server.js',"const allPriced = catalog.products.map(p => p.clp).filter(Number.isFinite);","const allPriced = catalog.products.map(p => p.usd).filter(Number.isFinite);")

# index precios
rep('index.html','Desde $4.990 CLP','Desde US$4.99')
rep('index.html','Recomendado · $10.990 CLP','Recomendado · US$10.99')

FX_ES='''          <div class="fx-box" id="fx-box">
            <label for="fx-select">Ver precios aproximados en:</label>
            <select id="fx-select" name="fx-currency" aria-describedby="fx-note">
              <option value="USD">USD (precio real)</option>
              <option value="CLP">CLP · peso chileno</option>
              <option value="ARS">ARS · peso argentino</option>
              <option value="MXN">MXN · peso mexicano</option>
              <option value="COP">COP · peso colombiano</option>
              <option value="PEN">PEN · sol peruano</option>
              <option value="UYU">UYU · peso uruguayo</option>
              <option value="BOB">BOB · boliviano</option>
              <option value="BRL">BRL · real brasileño</option>
              <option value="EUR">EUR · euro</option>
              <option value="GBP">GBP · libra esterlina</option>
              <option value="CAD">CAD · dólar canadiense</option>
            </select>
            <p class="fx-note" id="fx-note">Los precios base son en <strong>USD</strong>. Las otras monedas son un valor <strong>estimado</strong>: el cobro real es en USD y el tipo de cambio lo define tu banco o Tebex. <span id="fx-updated"></span></p>
          </div>
'''
FX_EN=FX_ES.replace('Ver precios aproximados en:','Show approximate prices in:').replace('USD (precio real)','USD (actual price)') \
 .replace('CLP · peso chileno','CLP · Chilean peso').replace('ARS · peso argentino','ARS · Argentine peso').replace('MXN · peso mexicano','MXN · Mexican peso') \
 .replace('COP · peso colombiano','COP · Colombian peso').replace('PEN · sol peruano','PEN · Peruvian sol').replace('UYU · peso uruguayo','UYU · Uruguayan peso') \
 .replace('BOB · boliviano','BOB · Bolivian boliviano').replace('BRL · real brasileño','BRL · Brazilian real').replace('EUR · euro','EUR · euro') \
 .replace('GBP · libra esterlina','GBP · pound sterling').replace('CAD · dólar canadiense','CAD · Canadian dollar') \
 .replace('Los precios base son en <strong>USD</strong>. Las otras monedas son un valor <strong>estimado</strong>: el cobro real es en USD y el tipo de cambio lo define tu banco o Tebex.','Base prices are in <strong>USD</strong>. Other currencies are an <strong>estimate</strong>: the actual charge is in USD and the exchange rate is set by your bank or Tebex.')

# ES: insertar tras el header de catalogo
anchor_es='''          <!-- Pestañas de Categoría -->
'''
rep('store.html',anchor_es,FX_ES+anchor_es)
rep('store.html','<strong id="quote-total">$0 CLP</strong>','<strong id="quote-total">US$0.00</strong>')
rep('store-en.html','$0 CLP','US$0.00')
s=rd('store-en.html'); print('EN anchor:', s.count('<!-- Category Tabs -->'), s.count('store-tabs'))
