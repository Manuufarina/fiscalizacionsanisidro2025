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

// Extracts CSV content from various payload shapes
function extractCSV(data, context) {
    let csvData = '';
    if (typeof data === 'string') {
        csvData = data;
    } else if (data && typeof data.csv === 'string') {
        csvData = data.csv;
    } else if (data && typeof data.data === 'string') {
        csvData = data.data;
    } else if (data?.data && typeof data.data.csv === 'string') {
        csvData = data.data.csv;
    } else if (context.rawRequest?.body) {
        const body = context.rawRequest.body;
        if (typeof body === 'string') {
            csvData = body;
        } else if (typeof body.csv === 'string') {
            csvData = body.csv;
        }
    }
    if (typeof csvData !== 'string' || csvData.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'No se proporcionaron datos CSV.');
    }
    return csvData;
}

exports.importFiscalesFromCSV = functions.https.onCall(async (data, context) => {
    try {
        const csvData = extractCSV(data, context);
        const records = parseCSVWithHeaders(csvData, ['escuela_id', 'dni']);
        const batch = admin.firestore().batch();
        records.forEach(rec => {
            const ref = admin.firestore().collection('fiscales').doc(rec.escuela_id);
            batch.set(ref, { dni: rec.dni });
        });
        await batch.commit();
        return { message: `${records.length} fiscales importados.` };
    } catch (error) {
        functions.logger.error('Error importando fiscales', { error: error.message });
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError('internal', 'Ocurrió un error inesperado al procesar su solicitud.');
    }
});

exports.importListasFromCSV = functions.https.onCall(async (data, context) => {
    try {
        const csvData = extractCSV(data, context);
        const records = parseCSVWithHeaders(csvData, ['id', 'nombre_lista']);
        const batch = admin.firestore().batch();
        records.forEach(rec => {
            batch.set(admin.firestore().collection('listas').doc(rec.id), { nombre_lista: rec.nombre_lista });
        });
        await batch.commit();
        return { message: `${records.length} listas importadas.` };
    } catch (error) {
        functions.logger.error('Error importando listas', { error: error.message });
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError('internal', 'Ocurrió un error inesperado al procesar su solicitud.');
    }
});

exports.importEscuelasFromCSV = functions.https.onCall(async (data, context) => {
    try {
        const csvData = extractCSV(data, context);
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
        return { message: `${records.length} escuelas importadas.` };
    } catch (error) {
        functions.logger.error('Error importando escuelas', { error: error.message });
        if (error instanceof functions.https.HttpsError) throw error;
        throw new functions.https.HttpsError('internal', 'Ocurrió un error inesperado al procesar su solicitud.');
    }
});

