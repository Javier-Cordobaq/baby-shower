import { useState, useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { APPS_SCRIPT_URL } from "./config.js";

const DEVICE_KEY = "massimo_device_id";

function getOrCreateDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function lanzarConfeti() {
  const colores = ["#5aa9e6", "#a5d8f3", "#ffffff", "#cce8f7", "#90cef0"];
  confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: colores });
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors: colores }), 250);
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors: colores }), 400);
}

export default function BabyShower() {
  const deviceId = useRef(getOrCreateDeviceId());

  const [regalos, setRegalos] = useState([]);
  const [seleccionado, setSeleccionado] = useState(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [reserva, setReserva] = useState(null);   // reserva existente del servidor
  const [confirmado, setConfirmado] = useState(false); // reserva recién hecha

  useEffect(() => {
    cargarDatos();
  }, []);

  // Confeti solo en reserva nueva, no al recargar
  useEffect(() => {
    if (confirmado) lanzarConfeti();
  }, [confirmado]);

  async function cargarDatos() {
    setCargando(true);
    try {
      const url = `${APPS_SCRIPT_URL}?deviceId=${encodeURIComponent(deviceId.current)}`;
      const res  = await fetch(url);
      const data = await res.json();

      setRegalos(data.regalos || []);

      if (data.reserva) {
        setReserva(data.reserva); // ya reservó desde este dispositivo
      }
    } catch {
      setFeedback({ tipo: "error", texto: "No se pudo cargar la lista. Revisa la conexión." });
    } finally {
      setCargando(false);
    }
  }

  async function confirmarObsequio() {
    if (!seleccionado) {
      setFeedback({ tipo: "error", texto: "Escoge un obsequio primero." });
      return;
    }
    if (!nombre.trim() || !telefono.trim()) {
      setFeedback({ tipo: "error", texto: "Por favor completa tu nombre y teléfono." });
      return;
    }

    setEnviando(true);
    setFeedback(null);
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        body: JSON.stringify({
          id:       seleccionado,
          nombre:   nombre.trim(),
          telefono: telefono.trim(),
          deviceId: deviceId.current,
        }),
      });
      const data = await res.json();

      if (data.success) {
        const regaloElegido = regalos.find((r) => r.id === seleccionado);
        setReserva({ nombre: nombre.trim(), regalo: regaloElegido?.regalo || "" });
        setConfirmado(true);
      } else {
        setFeedback({ tipo: "error", texto: data.message || "Este obsequio ya no está disponible. Elige otro." });
        cargarDatos();
        setSeleccionado(null);
      }
    } catch {
      setFeedback({ tipo: "error", texto: "Hubo un error al enviar. Inténtalo de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  // ── Pantalla: ya tiene reserva (nueva o de visita anterior) ──────────────
  if (reserva) {
    return (
      <div className="page">
        <div className="form-wrapper">
          <div className="card card-confirm">
            <div className="confirm-icon">{confirmado ? "🎉" : "💙"}</div>
            <h2>¡{confirmado ? "Gracias" : "Hola"}, {reserva.nombre}!</h2>
            <p className="confirm-text">
              {confirmado ? "Tu obsequio" : "Ya tienes reservado"}{" "}
              <strong>{reserva.regalo}</strong>{" "}
              {confirmado ? "quedó reservado." : "en nuestra lista."}
              <br />¡Nos vemos en el baby shower de Massimo! 💙
            </p>
            <button className="btn-link" onClick={() => { setReserva(null); setConfirmado(false); cargarDatos(); }}>
              ¿No fuiste tú? Haz clic aquí
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Formulario principal ─────────────────────────────────────────────────
  return (
    <div className="page">
      <div className="form-wrapper">
        <div className="card card-header">
          <div className="header-image">🍼💙🧸</div>
          <div className="header-body">
            <h1>Lista de deseos de Massimo</h1>
            <p className="header-desc">
              La llegada de Massimo está cada vez más cerca y nos llena de
              felicidad compartir este momento contigo.
              <br /><br />
              Elige uno de los obsequios de nuestra lista. Cada regalo puede ser
              reservado por una sola persona.
              <br /><br />
              ¡Gracias por acompañarnos y por hacer parte de esta nueva aventura! 💙
            </p>
          </div>
        </div>

        <div className="card">
          <label className="question-title">
            Escoge tu obsequio <span className="required">*</span>
          </label>
          {cargando ? (
            <div className="loading">Cargando obsequios…</div>
          ) : regalos.length === 0 ? (
            <div className="loading">No hay obsequios disponibles por ahora.</div>
          ) : (
            <div className="opciones">
              {regalos.map((r) => {
                const activo = seleccionado === r.id;
                const pocos  = r.disponibles === 1;
                return (
                  <label key={r.id} className={"opcion" + (activo ? " opcion-activa" : "")}>
                    <input
                      type="radio"
                      name="regalo"
                      checked={activo}
                      onChange={() => setSeleccionado(r.id)}
                    />
                    <span className="opcion-radio" aria-hidden="true" />
                    <span className="opcion-texto">
                      <span className="opcion-nombre">{r.regalo}</span>
                      {r.descripcion && <span className="opcion-desc">{r.descripcion}</span>}
                      {r.disponibles != null && (
                        <span className={"opcion-disp" + (pocos ? " pocos" : "")}>
                          {r.disponibles === 1 ? "Último disponible" : `${r.disponibles} disponibles`}
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <label className="question-title">
            Tu nombre <span className="required">*</span>
          </label>
          <input
            className="input-line"
            placeholder="Tu respuesta"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </div>

        <div className="card">
          <label className="question-title">
            Tu teléfono <span className="required">*</span>
          </label>
          <input
            className="input-line"
            placeholder="Tu respuesta"
            value={telefono}
            inputMode="tel"
            onChange={(e) => setTelefono(e.target.value)}
          />
        </div>

        {feedback && (
          <div className={"feedback feedback-" + feedback.tipo}>{feedback.texto}</div>
        )}

        <div className="acciones">
          <button className="btn-primary" onClick={confirmarObsequio} disabled={enviando || cargando}>
            {enviando ? "Enviando…" : "Confirmar obsequio"}
          </button>
          <span className="hint">* Obligatorio</span>
        </div>

        <footer className="footer">Hecho con 💙 para el baby shower de Massimo</footer>
      </div>
    </div>
  );
}
