// A VIDA presa no chão de verdade, dentro do navegador (iPhone e Android), com o rastreamento (SLAM) do 8th Wall Engine.
// Protótipo de 14/10/2026 — captures/ra_real/slam/. Tudo numa aba só: câmera, VIDA, voz, “Fique aqui” tracejado e a foto
// (3-2-1 → a própria página tira a foto da tela inteira: câmera + VIDA, pelo XR8.CanvasScreenshot).
import * as T from 'three'
import { GLTFLoader } from './vendor/three/addons/loaders/GLTFLoader.js'

// o módulo three.js do 8th Wall procura window.THREE (um objeto mutável)
window.THREE = Object.assign({}, T)

const Q = new URLSearchParams(location.search)
const MIDIA = new URL('../media/', import.meta.url)
// altura suposta do celular (m): no modo 'responsive' o 8th Wall põe a câmera nessa altura e o chão em y = 0
const ALTURA = Number(Q.get('altura')) || 1.4
const ESCALA = Q.get('escala') === 'absoluta' ? 'absolute' : 'responsive'
const FALAS = {
  ola: { src: 'audio/vida-ola.mp3', clip: 'fala-ola', texto: 'Olá! Eu sou a Vida, personagem da Semad. Quer tirar uma foto comigo?' },
  vem: { src: 'audio/vida-vem.mp3', clip: 'fala-vem', texto: 'Oba! Vem aqui pro meu ladinho!' },
  contagem: { src: 'audio/vida-contagem.mp3', clip: 'foto-contagem', texto: 'Preparados? Três... dois... um... Xiiis!' },
  ficou: { src: 'audio/vida-ficou.mp3', clip: 'fala-ficou', texto: 'Ficou demais! Obrigada!' },
}
const XIS = 8.6 // s dentro da fala da contagem: a foto sai aí
const ehIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const $ = (id) => document.getElementById(id)
const cv = $('ra')
const estado = { rastreio: 'parado', motivo: '', colocada: false, falando: null, ocupado: false, toque: null }
window.__slam = { estado }

// ---------- áudio (um <audio> por fala; liberado no toque de “Começar”) ----------
const audios = {}
for (const [k, f] of Object.entries(FALAS)) { const a = new Audio(new URL(f.src, MIDIA).href); a.preload = 'auto'; audios[k] = a }
function liberaAudio () {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback' } catch (e) {}
  for (const a of Object.values(audios)) {
    a.muted = true
    const p = a.play(); if (p && p.then) p.then(() => { a.pause(); a.currentTime = 0; a.muted = false }, () => { a.muted = false })
  }
}

// ---------- modelo ----------
const modelo = new Promise((ok, erro) => new GLTFLoader().load(new URL('3d/ar/vida.glb', MIDIA).href, ok, undefined, erro))
let vida = null, mixer = null, acoes = {}, acaoAtual = null, sombra = null, luz = null, fique = null
const relogio = new T.Timer()

function troca (acao, seg = 0.3) {
  if (!acao || acao === acaoAtual) return
  acao.enabled = true; acao.setEffectiveWeight(1)
  if (acaoAtual) acaoAtual.crossFadeTo(acao, seg, false)
  acao.play(); acaoAtual = acao
}
function laco (nome, seg = 0.4) {
  const a = acoes[nome]; if (!a) return
  if (a !== acaoAtual) { a.reset(); a.setLoop(T.LoopRepeat, Infinity) }
  troca(a, seg)
}

// ---------- “Fique aqui”: círculo tracejado no chão, pegadas, trilha pontilhada e o letreiro ----------
function rotulo (texto) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = 'rgba(0,0,0,.55)'; g.beginPath(); g.roundRect(8, 8, 496, 112, 56); g.fill()
  g.fillStyle = '#fff'; g.font = '700 64px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(texto, 256, 68)
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace
  const s = new T.Sprite(new T.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(0.6, 0.15, 1); s.renderOrder = 10
  return s
}
function criaFique () {
  const g = new T.Group(); g.visible = false
  const branco = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthWrite: false, side: T.DoubleSide })
  const anel = new T.Group(); const n = 26, r = 0.32
  for (let i = 0; i < n; i++) {
    const d = new T.Mesh(new T.PlaneGeometry(0.075, 0.03), branco); const a = (i / n) * Math.PI * 2
    d.rotation.x = -Math.PI / 2; d.rotation.z = -a; d.position.set(Math.cos(a) * r, 0.006, Math.sin(a) * r); anel.add(d)
  }
  g.add(anel); g.userData.anel = anel
  const pe = new T.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthWrite: false })
  for (const sx of [-0.08, 0.08]) { const p = new T.Mesh(new T.CircleGeometry(0.05, 20), pe); p.scale.set(0.8, 1.9, 1); p.rotation.x = -Math.PI / 2; p.position.set(sx, 0.007, 0); g.add(p) }
  const r1 = rotulo('Fique aqui'); r1.position.set(0, 1.25, 0); g.add(r1)
  const trilha = new T.Group(); g.add(trilha); g.userData.trilha = trilha
  return g
}
function mostraFique (ver) {
  if (!fique || !vida) return
  if (!ver) { fique.visible = false; return }
  const { camera } = XR8.Threejs.xrScene()
  const dir = new T.Vector3(); camera.getWorldDirection(dir); dir.y = 0; dir.normalize()
  const direita = new T.Vector3(-dir.z, 0, dir.x) // direita da tela, no chão
  fique.position.copy(vida.position).addScaledVector(direita, 0.8 * vida.scale.x); fique.position.y = vida.position.y
  // trilha pontilhada: de um passo à frente de quem segura o celular até o círculo
  const trilha = fique.userData.trilha; trilha.clear()
  const ini = new T.Vector3(camera.position.x, vida.position.y, camera.position.z).addScaledVector(dir, 0.6)
  const fim = fique.position.clone(); const lado = fim.clone().sub(ini); const dist = lado.length()
  const ponto = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false })
  const nP = Math.max(3, Math.floor((dist - 0.35) / 0.14))
  for (let i = 0; i < nP; i++) { const p = new T.Mesh(new T.CircleGeometry(0.022, 12), ponto); p.rotation.x = -Math.PI / 2; p.position.copy(ini).addScaledVector(lado, i / nP).sub(fique.position); p.position.y = 0.006; trilha.add(p) }
  fique.visible = true
}

// ---------- colocar a VIDA no chão ----------
const chaoRaio = new T.Raycaster()
const planoChao = new T.Plane(new T.Vector3(0, 1, 0), 0)
function pontoNoChao (xn, yn) {
  const { camera } = XR8.Threejs.xrScene()
  chaoRaio.setFromCamera(new T.Vector2(xn * 2 - 1, -(yn * 2 - 1)), camera)
  const p = new T.Vector3()
  if (!chaoRaio.ray.intersectPlane(planoChao, p)) return null
  return p
}
function colocar (xn, yn, origem = 'toque') {
  if (!vida) return false
  const { camera } = XR8.Threejs.xrScene()
  let p = pontoNoChao(xn, yn)
  const cam = new T.Vector3(camera.position.x, 0, camera.position.z)
  // nunca longe demais nem colada: entre 0,9 e 3 m de quem segura o celular
  if (!p || p.distanceTo(cam) > 3) {
    const d = new T.Vector3(); camera.getWorldDirection(d); d.y = 0; d.normalize()
    p = (p && p.distanceTo(cam) > 3) ? cam.clone().add(p.clone().sub(cam).setLength(2.2)) : cam.clone().addScaledVector(d, 2.0)
  }
  if (p.distanceTo(cam) < 0.9) p = cam.clone().add(p.clone().sub(cam).setLength(0.9))
  vida.position.copy(p)
  vida.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z) // de frente para quem olha
  sombra.position.set(p.x, p.y + 0.001, p.z)
  luz.position.set(p.x + 1.2, p.y + 3, p.z + 0.8); luz.target.position.copy(p)
  if (!estado.colocada) { vida.scale.setScalar(0.01); estado.surge = 0 }
  vida.visible = true; sombra.visible = true
  estado.colocada = true
  estado.toque = { origem, xn, yn, p: p.toArray(), tHit: (() => { try { return XR8.XrController.hitTest(xn, yn, ['FEATURE_POINT', 'ESTIMATED_SURFACE', 'DETECTED_SURFACE']).map((h) => h.type) } catch (e) { return [] } })() }
  if (fique && fique.visible) mostraFique(true)
  return true
}
window.__slam.colocar = colocar

// ---------- falas: voz + clipe sincronizado + legenda ----------
let legendaTempo = null
function legenda (txt) { const l = $('legenda'); clearTimeout(legendaTempo); if (!txt) { l.hidden = true; return } l.textContent = txt; l.hidden = false }
function falar (nome, aoTempo) {
  const f = FALAS[nome], a = audios[nome], acao = acoes[f.clip]
  return new Promise((ok) => {
    let acabou = false
    const fim = () => { if (acabou) return; acabou = true; estado.falando = null; legendaTempo = setTimeout(() => legenda(''), 900); ok() }
    if (acao) { acao.reset(); acao.setLoop(T.LoopOnce, 1); acao.clampWhenFinished = true; acao.timeScale = 1; troca(acao, 0.25) }
    legenda(f.texto)
    estado.falando = { nome, a, acao, aoTempo, t0: performance.now(), dur: acao ? acao.getClip().duration : 6 }
    a.currentTime = 0
    a.onended = fim
    const p = a.play(); if (p && p.catch) p.catch(() => { /* sem som: o clipe e a legenda seguem sozinhos */ })
    setTimeout(fim, (estado.falando.dur + 1.5) * 1000)
  })
}
function sincronizaFala () {
  const f = estado.falando; if (!f) return
  const tVoz = (!f.a.paused && f.a.currentTime > 0) ? f.a.currentTime : (performance.now() - f.t0) / 1000
  if (f.acao && !f.a.paused) { const d = tVoz - f.acao.time; f.acao.timeScale = Math.min(1.15, Math.max(0.85, 1 + d * 1.5)) }
  if (f.aoTempo) f.aoTempo(tVoz)
}

// ---------- foto (mesma aba): 3-2-1 → captura da tela inteira (câmera + VIDA) ----------
const espera = (ms) => new Promise((r) => setTimeout(r, ms))
let fotoArquivo = null, fotoUrl = null
async function tirarFoto () {
  const b64 = await XR8.CanvasScreenshot.takeScreenshot()
  const img = new Image(); img.src = 'data:image/jpeg;base64,' + b64
  await img.decode()
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight
  const g = c.getContext('2d'); g.drawImage(img, 0, 0)
  // assinatura em duas linhas: a frase e as contas do Instagram (@semadgoias · @studio.amb), que numa linha só se
  // sobrepunham na foto estreita do celular
  const h = Math.round(Math.min(c.height * 0.04, c.width * 0.06))
  g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(0, c.height - h * 2.6, c.width, h * 2.6)
  g.fillStyle = '#fff'; g.textBaseline = 'middle'; g.textAlign = 'left'
  g.font = `600 ${h * 0.7}px system-ui, sans-serif`
  g.fillText('Eu e a VIDA • Expedição Parques GO', h * 0.6, c.height - h * 1.75, c.width - h * 1.2)
  g.font = `500 ${h * 0.58}px system-ui, sans-serif`
  g.fillText('@semadgoias · @studio.amb', h * 0.6, c.height - h * 0.8, c.width - h * 1.2)
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.95))
  const d = new Date(), z = (n) => String(n).padStart(2, '0')
  fotoArquivo = new File([blob], `foto-com-a-vida-${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}-${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.jpg`, { type: 'image/jpeg' })
  if (fotoUrl) URL.revokeObjectURL(fotoUrl)
  fotoUrl = URL.createObjectURL(blob)
  window.__slam.ultimaFoto = { largura: c.width, altura: c.height, bytes: blob.size }
  return fotoUrl
}
// legenda para o Instagram: nenhum site marca contas sozinho — ela vai para a área de transferência e a pessoa só cola
const LEGENDA = 'Eu e a VIDA na Expedição Parques GO! 🌿 @semadgoias @studio.amb #ExpediçãoParquesGO'
function copiaLegenda () {
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(LEGENDA).then(() => aviso('Legenda com @semadgoias e @studio.amb copiada — é só colar no Instagram.'), () => {}) } catch (e) {}
}
function baixar () { const a = document.createElement('a'); a.href = fotoUrl; a.download = fotoArquivo.name; document.body.appendChild(a); a.click(); a.remove() }
async function compartilhar () {
  copiaLegenda()
  if (navigator.canShare && navigator.canShare({ files: [fotoArquivo] })) { try { await navigator.share({ files: [fotoArquivo], text: LEGENDA }) } catch (e) {} return true }
  return false
}
function mostraPrevia () {
  $('previa-img').src = fotoUrl
  $('previa').hidden = false
  if (ehIOS) {
    $('salvar').textContent = 'Salvar na galeria'
    $('previa-aviso').textContent = 'Toque em “Salvar na galeria” e depois em “Salvar imagem”. Ou toque e segure a foto.'
  } else {
    baixar() // Android: baixa sozinha (cada foto nasce de um toque)
    $('salvar').textContent = 'Baixar de novo'
    $('previa-aviso').textContent = 'Foto salva — está na Galeria (pasta Download).'
  }
  $('compartilhar').hidden = !(navigator.canShare && navigator.canShare({ files: [fotoArquivo] }))
}
async function sequenciaFoto () {
  if (estado.ocupado || !estado.colocada) return
  estado.ocupado = true; $('barra').hidden = true
  mostraFique(true)
  await falar('vem')
  aviso('Fique no círculo tracejado, ao lado da VIDA')
  laco('idle', 0.4)
  await espera(2600)
  aviso('')
  let tiro = null
  const num = $('numero')
  const dispara = () => { if (tiro) return; mostraFique(false); num.hidden = true; tiro = tirarFoto() }
  await falar('contagem', (t) => {
    const n = t < 3.1 ? -1 : t < 4.6 ? 3 : t < 6.6 ? 2 : t < 8.4 ? 1 : 0
    if (n > 0) { num.textContent = String(n); num.hidden = false } else if (n === 0) { num.textContent = 'Xis!'; num.hidden = false }
    if (t >= XIS) dispara()
  })
  dispara()
  num.hidden = true
  laco('foto-pose', 0.45)
  try { await tiro; mostraPrevia() } catch (e) { aviso('Não deu para tirar a foto. Tente de novo.') }
  await falar('ficou')
  laco('idle', 0.7)
  estado.ocupado = false
}

// sem câmera ou sem movimento o rastreamento do chão não roda: avisa e oferece o caminho de hoje (VIDA presa à tela)
function semMovimento () {
  aviso('Sem permissão de movimento, a VIDA não fica presa no chão. Toque em Recarregar e aceite.')
  window.__slam.semMovimento = true
}

// ---------- avisos ----------
let avisoAtual = ''
function aviso (txt) { if (txt === avisoAtual) return; avisoAtual = txt; const a = $('aviso'); a.textContent = txt; a.hidden = !txt }

// ---------- módulo do pipeline do 8th Wall ----------
function moduloVida () {
  return {
    name: 'vida',
    onStart: async () => {
      const { scene, camera, renderer } = XR8.Threejs.xrScene()
      renderer.outputColorSpace = T.SRGBColorSpace
      renderer.shadowMap.enabled = true; renderer.shadowMap.type = T.PCFShadowMap
      scene.add(new T.HemisphereLight(0xffffff, 0x8a7a60, 2.2))
      luz = new T.DirectionalLight(0xffffff, 1.6); luz.castShadow = true
      luz.shadow.mapSize.set(1024, 1024); Object.assign(luz.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.1, far: 8 })
      scene.add(luz, luz.target)
      sombra = new T.Mesh(new T.PlaneGeometry(3, 3), new T.ShadowMaterial({ opacity: 0.38 })); sombra.rotation.x = -Math.PI / 2; sombra.receiveShadow = true; sombra.visible = false
      scene.add(sombra)
      fique = criaFique(); scene.add(fique)
      camera.position.set(0, ALTURA, 0)
      XR8.XrController.updateCameraProjectionMatrix({ origin: camera.position, facing: camera.quaternion })
      const gltf = await modelo
      vida = gltf.scene; vida.visible = false
      vida.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; if (o.name === 'RA_chao' || (o.parent && o.parent.name === 'RA_chao')) o.visible = false } })
      const chao = vida.getObjectByName('RA_chao'); if (chao) chao.visible = false
      scene.add(vida)
      mixer = new T.AnimationMixer(vida)
      for (const c of gltf.animations) acoes[c.name] = mixer.clipAction(c)
      laco('idle', 0)
      window.__slam.vida = vida
      $('carregando').textContent = ''
    },
    onUpdate: ({ processCpuResult }) => {
      const r = processCpuResult && processCpuResult.reality
      relogio.update(); const dt = Math.min(relogio.getDelta(), 0.1)
      if (r) { estado.rastreio = r.trackingStatus; estado.motivo = r.trackingReason }
      if (mixer) { sincronizaFala(); mixer.update(dt) }
      if (fique && fique.visible) { fique.userData.anel.rotation.y += dt * 0.6 }
      if (vida && estado.colocada && vida.scale.x < 1) { estado.surge += dt; const k = Math.min(1, estado.surge / 0.45); vida.scale.setScalar(Math.max(0.01, 1 - Math.pow(1 - k, 3))) }
      // primeira vez com o chão firme: ela aparece no chão à frente (um pouco abaixo do meio da tela) e diz “Olá”
      if (vida && !estado.colocada && estado.rastreio === 'NORMAL') {
        colocar(0.5, 0.72, 'auto')
        setTimeout(() => { if (!estado.falando && !estado.ocupado) falar('ola') }, 900)
        $('barra').hidden = false
      }
      if (!estado.colocada) aviso(estado.rastreio === 'NORMAL' ? 'Carregando a VIDA…' : 'Aponte para o chão e mova o celular devagar')
      else if (estado.rastreio !== 'NORMAL' && !estado.ocupado) aviso(estado.motivo === 'TOO_MUCH_MOTION' ? 'Mais devagar…' : 'Aponte de novo para o chão')
      else if (!estado.ocupado) aviso('')
    },
    onRender: () => {
      if (window.__slamGancho) { const x = XR8.Threejs.xrScene(); window.__slamGancho({ gl: x.renderer.getContext(), canvas: cv, camera: x.camera, vida, estado }) }
    },
    onException: (e) => { aviso('Não foi possível abrir a câmera. ' + ((e && e.message) || '')); window.__slam.erro = String((e && (e.message || e.type)) || e) },
  }
}

function ajustaCanvas () {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr)
}
addEventListener('resize', ajustaCanvas)

function iniciar () {
  ajustaCanvas()
  XR8.XrController.configure({ scale: ESCALA })
  XR8.CanvasScreenshot.configure({ maxDimension: 2048, jpgCompression: 92 })
  XR8.addCameraPipelineModules([
    XR8.GlTextureRenderer.pipelineModule(),
    XR8.Threejs.pipelineModule(),
    XR8.XrController.pipelineModule(),
    XR8.CanvasScreenshot.pipelineModule(),
    moduloVida(),
  ])
  XR8.run({ canvas: cv, allowedDevices: XR8.XrConfig.device().ANY })
}

// ---------- botões ----------
const xrPronto = new Promise((r) => { if (window.XR8) r(); else addEventListener('xrloaded', r, { once: true }) })
xrPronto.then(() => { if ($('carregando').textContent === 'Carregando…') $('carregando').textContent = '' })
$('comecar').addEventListener('click', () => {
  liberaAudio() // dentro do toque: destrava o som (iPhone)
  // iPhone: o pedido de movimento tem de sair DESTE toque (o XR8.run pede de novo e já recebe "granted")
  for (const E of [window.DeviceMotionEvent, window.DeviceOrientationEvent]) {
    if (E && typeof E.requestPermission === 'function') E.requestPermission().then((r) => { if (r !== 'granted') semMovimento() }, () => {})
  }
  $('entrada').hidden = true
  aviso('Abrindo a câmera…')
  // o XR8.run pede câmera e movimento; no iPhone o pedido de movimento precisa deste toque
  xrPronto.then(iniciar)
})
cv.addEventListener('click', (e) => {
  if (!estado.colocada || estado.ocupado) return
  colocar(e.clientX / innerWidth, e.clientY / innerHeight)
})
$('ouvir').addEventListener('click', () => { if (!estado.ocupado && !estado.falando) falar('ola') })
$('foto').addEventListener('click', () => sequenciaFoto())
$('frente').addEventListener('click', () => colocar(0.5, 0.72, 'frente'))
$('salvar').addEventListener('click', async () => { if (ehIOS) { if (!(await compartilhar())) baixar() } else baixar() })
$('compartilhar').addEventListener('click', () => compartilhar())
$('outra').addEventListener('click', () => { $('previa').hidden = true; $('barra').hidden = false })
