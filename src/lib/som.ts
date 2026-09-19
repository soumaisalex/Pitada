let contextoAudio: AudioContext | null = null;

function obterContexto(): AudioContext {
  if (!contextoAudio) {
    contextoAudio = new AudioContext();
  }
  return contextoAudio;
}

export function tocarSomVenda() {
  try {
    const ctx = obterContexto();
    const agora = ctx.currentTime;

    [523.25, 783.99].forEach((frequencia, i) => {
      const oscilador = ctx.createOscillator();
      const ganho = ctx.createGain();
      oscilador.type = "sine";
      oscilador.frequency.value = frequencia;
      ganho.gain.setValueAtTime(0.0001, agora + i * 0.12);
      ganho.gain.exponentialRampToValueAtTime(0.3, agora + i * 0.12 + 0.02);
      ganho.gain.exponentialRampToValueAtTime(0.0001, agora + i * 0.12 + 0.3);
      oscilador.connect(ganho);
      ganho.connect(ctx.destination);
      oscilador.start(agora + i * 0.12);
      oscilador.stop(agora + i * 0.12 + 0.3);
    });
  } catch {
    // Se o navegador bloquear áudio automático, seguimos sem som — o item
    // ainda aparece no feed visualmente.
  }
}
