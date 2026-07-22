/**
 * ============================================================
 *  BABY SHOWER · Massimo · Google Apps Script
 * ============================================================
 *
 *  ESTRUCTURA DE LAS HOJAS
 *  ───────────────────────
 *  Hoja "Regalos"
 *    A: regalo      — nombre del obsequio
 *    B: descripcion — descripción opcional
 *    C: cantidad    — cuántos aceptas (NO se toca nunca)
 *    D: reservados  — FÓRMULA: =ARRAYFORMULA(SI(E2:E<>"";SI.ERROR(CONTAR.SI(Reservas!$A:$A;E2:E);0);""))
 *    E: id          — FÓRMULA: =ARRAYFORMULA(SI(A2:A<>"";FILA(A2:A)-1;""))
 *
 *  Hoja "Reservas"  (el script la crea automáticamente)
 *    A: regalo_id  — ID del regalo (columna E de Regalos)
 *    B: regalo     — nombre del obsequio
 *    C: nombre     — nombre del invitado
 *    D: telefono   — teléfono del invitado
 *    E: fecha      — timestamp de la reserva
 *    F: device_id  — identificador único del dispositivo del invitado
 *
 *  LÓGICA
 *  ──────
 *  · GET ?deviceId=xxx  → devuelve regalos disponibles + reserva del device si existe
 *  · POST               → registra la reserva con el device_id
 *  · El script NUNCA modifica la hoja "Regalos"
 *  · disponibles = cantidad - reservados (la fórmula lo calcula)
 *  · Si disponibles = 0 → se oculta del formulario
 * ============================================================
 */

var SHEET_REGALOS  = "Regalos";
var SHEET_RESERVAS = "Reservas";

// Columnas en "Regalos" (base 0 para arrays)
var COL_REGALO     = 0; // A
var COL_DESC       = 1; // B
var COL_CANTIDAD   = 2; // C
var COL_RESERVADOS = 3; // D — fórmula, solo se lee
var COL_ID         = 4; // E — ID del regalo

// Columnas en "Reservas" (base 0 para arrays, base 1 para getRange/appendRow)
var RCOL_REGALO_ID = 0; // A
var RCOL_REGALO    = 1; // B
var RCOL_NOMBRE    = 2; // C
var RCOL_TELEFONO  = 3; // D
var RCOL_FECHA     = 4; // E
var RCOL_DEVICE_ID = 5; // F

// ── GET: regalos disponibles + reserva del dispositivo si existe ─────────────
function doGet(e) {
  var deviceId = e && e.parameter && e.parameter.deviceId ? e.parameter.deviceId : null;

  var ss           = SpreadsheetApp.getActiveSpreadsheet();
  var sheetRegalos = ss.getSheetByName(SHEET_REGALOS);
  var dataRegalos  = sheetRegalos.getDataRange().getValues();
  var regalos      = [];

  for (var i = 1; i < dataRegalos.length; i++) {
    var regalo      = dataRegalos[i][COL_REGALO];
    var descripcion = dataRegalos[i][COL_DESC];
    var cantidad    = Number(dataRegalos[i][COL_CANTIDAD])   || 0;
    var reservados  = Number(dataRegalos[i][COL_RESERVADOS]) || 0;
    var id          = dataRegalos[i][COL_ID];
    var disponibles = cantidad - reservados;

    if (!regalo || !id || disponibles <= 0) continue;

    regalos.push({
      id:          id,
      regalo:      String(regalo),
      descripcion: descripcion ? String(descripcion) : "",
      cantidad:    cantidad,
      reservados:  reservados,
      disponibles: disponibles
    });
  }

  // Busca si el dispositivo ya tiene una reserva
  var reserva = null;
  if (deviceId) {
    var sheetReservas = ss.getSheetByName(SHEET_RESERVAS);
    if (sheetReservas) {
      var dataReservas = sheetReservas.getDataRange().getValues();
      for (var j = 1; j < dataReservas.length; j++) {
        if (String(dataReservas[j][RCOL_DEVICE_ID]) === String(deviceId)) {
          reserva = {
            regalo:   String(dataReservas[j][RCOL_REGALO]),
            nombre:   String(dataReservas[j][RCOL_NOMBRE]),
            telefono: String(dataReservas[j][RCOL_TELEFONO]),
            fecha:    String(dataReservas[j][RCOL_FECHA])
          };
          break;
        }
      }
    }
  }

  return json({ success: true, regalos: regalos, reserva: reserva });
}

// ── POST: registra la reserva ─────────────────────────────────────────────────
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    var body     = JSON.parse(e.postData.contents);
    var regaloid = body.id;
    var nombre   = String(body.nombre   || "").trim();
    var telefono = String(body.telefono || "").trim();
    var deviceId = String(body.deviceId || "").trim();

    if (!regaloid || !nombre || !telefono || !deviceId) {
      return json({ success: false, message: "Faltan datos obligatorios." });
    }

    var ss    = SpreadsheetApp.getActiveSpreadsheet();

    // Verifica que el device no haya reservado ya (doble check server-side)
    var sheetReservas = obtenerOCrearReservas(ss);
    var dataReservas  = sheetReservas.getDataRange().getValues();
    for (var j = 1; j < dataReservas.length; j++) {
      if (String(dataReservas[j][RCOL_DEVICE_ID]) === String(deviceId)) {
        return json({ success: false, message: "Ya tienes un obsequio reservado desde este dispositivo." });
      }
    }

    // Busca el regalo y verifica disponibilidad
    var sheet      = ss.getSheetByName(SHEET_REGALOS);
    var data       = sheet.getDataRange().getValues();
    var regalo     = null;
    var cantidad   = 0;
    var reservados = 0;

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][COL_ID]) === String(regaloid)) {
        regalo     = String(data[i][COL_REGALO]);
        cantidad   = Number(data[i][COL_CANTIDAD])   || 0;
        reservados = Number(data[i][COL_RESERVADOS]) || 0;
        break;
      }
    }

    if (!regalo) {
      return json({ success: false, message: "Obsequio no encontrado." });
    }

    if (reservados >= cantidad) {
      return json({ success: false, message: "Este obsequio ya no tiene disponibilidad. Elige otro." });
    }

    // Agrega la reserva — el script NUNCA modifica la hoja Regalos
    sheetReservas.appendRow([
      regaloid,    // A: regalo_id
      regalo,      // B: regalo
      nombre,      // C: nombre
      telefono,    // D: telefono
      new Date(),  // E: fecha
      deviceId     // F: device_id
    ]);

    return json({ success: true, message: "¡Obsequio reservado! Gracias por acompañarnos 💙" });

  } catch (err) {
    return json({ success: false, message: "Error: " + err.message });
  } finally {
    lock.releaseLock();
  }
}

// ── Utilidades ────────────────────────────────────────────────────────────────

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function obtenerOCrearReservas(ss) {
  var sheet = ss.getSheetByName(SHEET_RESERVAS);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_RESERVAS);
    sheet.appendRow(["regalo_id", "regalo", "nombre", "telefono", "fecha", "device_id"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
