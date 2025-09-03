const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Generic CSV parser that ensures required headers are present
function parseCSVWithHeaders(text, requiredHeaders) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'El CSV debe tener un encabezado y al menos una fila de datos.');
    }

    const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
    const header = lines[0].split(delimiter).map(h => h.trim());
    if (!requiredHeaders.every(h => header.includes(h))) {
        throw new functions.https.HttpsError('invalid-argument', `El encabezado del CSV debe contener las columnas: ${requiredHeaders.join(', ')}.`);
    }

    return lines.slice(1).map(line => {
        const values = line.split(delimiter);
        return header.reduce((obj, h, i) => {
            obj[h] = values[i] ? values[i].trim().replace(/"/g, '') : '';
            return obj;
        }, {});
    });
}

// Extracts CSV content from an HTTP request
function extractCSVFromRequest(req) {
    let csvData = '';
    if (typeof req.body === 'string') {
        csvData = req.body;
    } else if (req.body && typeof req.body.csv === 'string') {
        csvData = req.body.csv;
    } else if (req.body && req.body.data && typeof req.body.data === 'string') {
        // soporte para llamadas estilo onCall: { data: "csv" }
        csvData = req.body.data;
    } else if (
        req.body &&
        req.body.data &&
        typeof req.body.data.csv === 'string'
    ) {
        // soporte para llamadas estilo onCall: { data: { csv: "..." } }
        csvData = req.body.data.csv;
    } else if (req.rawBody) {
        csvData = req.rawBody.toString();
    }
    if (typeof csvData !== 'string' || csvData.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'No se proporcionaron datos CSV.');
    }
    return csvData;
}

// Simple CORS wrapper
function withCors(handler) {
    return async (req, res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            return res.status(204).send('');
        }
        try {
            await handler(req, res);
        } catch (error) {
            functions.logger.error('Error procesando CSV', { error: error.message });
            if (error instanceof functions.https.HttpsError) {
                return res.status(400).json({ error: error.message });
            }
            return res.status(500).json({ error: 'Ocurrió un error inesperado al procesar su solicitud.' });
        }
    };
}

exports.createUsersFromCSV = functions.https.onRequest(withCors(async (req, res) => {
    const csvData = extractCSVFromRequest(req);
    const records = parseCSVWithHeaders(csvData, ['escuela_id', 'dni']);
    const batch = admin.firestore().batch();
    records.forEach(rec => {
        const ref = admin.firestore().collection('fiscales').doc(rec.escuela_id);
        batch.set(ref, { dni: rec.dni });
    });
    await batch.commit();
    res.json({ message: `${records.length} fiscales importados.` });
}));

// Alias for backwards compatibility with old endpoint name
exports.importFiscalesFromCSV = exports.createUsersFromCSV;

exports.importListasFromCSV = functions.https.onRequest(withCors(async (req, res) => {
    const csvData = extractCSVFromRequest(req);
    const records = parseCSVWithHeaders(csvData, ['id', 'nombre_lista']);
    const batch = admin.firestore().batch();
    records.forEach(rec => {
        batch.set(admin.firestore().collection('listas').doc(rec.id), { nombre_lista: rec.nombre_lista });
    });
    await batch.commit();
    res.json({ message: `${records.length} listas importadas.` });
}));

exports.importEscuelasFromCSV = functions.https.onRequest(withCors(async (req, res) => {
    const csvData = extractCSVFromRequest(req);
    const records = parseCSVWithHeaders(csvData, ['id', 'nombre', 'lat', 'lng', 'mesas']);
    const batch = admin.firestore().batch();
    records.forEach(rec => {
        batch.set(admin.firestore().collection('escuelas').doc(rec.id), {
            nombre: rec.nombre,
            lat: parseFloat(rec.lat),
            lng: parseFloat(rec.lng),
            mesas: rec.mesas.split(',').map(m => m.trim())
        });
    });
    await batch.commit();
    res.json({ message: `${records.length} escuelas importadas.` });
}));

