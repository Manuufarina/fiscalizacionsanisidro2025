const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// --- CSV PARSER ---
// Detects whether the CSV uses commas or semicolons as delimiters.
// Still a simple parser, not robust for complex CSVs (e.g., with embedded commas).
function parseCSV(text, requiredHeaders = []) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'El CSV debe tener un encabezado y al menos una fila de datos.');
    }

    // Determine delimiter: default comma, but switch to semicolon if no commas are present
    const delimiter = lines[0].includes(';') && !lines[0].includes(',') ? ';' : ',';
    const header = lines[0].split(delimiter).map(h => h.trim());
    if (requiredHeaders.length > 0 && !requiredHeaders.every(h => header.includes(h))) {
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


// --- CLOUD FUNCTION: createUsersFromCSV ---
exports.createUsersFromCSV = functions.https.onCall(async (data, context) => {
    try {
        // Basic auth check: in a real app, you'd check if the caller is an admin
        // For now, we trust the security rule on the admin page itself.

        // Admit both {csv: "..."} or direct string payloads and remove UTF-8 BOM if present
        const rawCsv = (typeof data === 'string' ? data : data?.csv) || '';
        const csvData = rawCsv.replace(/^\uFEFF/, '');
        if (csvData.trim().length === 0) {
            throw new functions.https.HttpsError('invalid-argument', 'No se proporcionaron datos CSV.');
        }

        let parsedData;
        try {
            parsedData = parseCSV(csvData);
        } catch (error) {
            throw error; // Re-throw parsing errors to be caught by the main try-catch
        }

        const results = {
            successCount: 0,
            errorCount: 0,
            details: [], // Match client expectation for 'details'
        };

        for (const record of parsedData) {
            const { escuela_id, dni } = record;

            if (!escuela_id || !dni) {
                results.errorCount++;
                results.details.push(`Registro omitido: falta escuela_id o dni.`);
                continue;
            }

            const email = `escuela${escuela_id}@fiscal.app`;
            const password = dni;

            try {
                // 1. Create user in Firebase Auth
                const userRecord = await admin.auth().createUser({
                    email: email,
                    password: password,
                    displayName: `Fiscal Escuela ${escuela_id}`,
                });

                // 2. Create corresponding document in Firestore
                const fiscalDocRef = admin.firestore().collection('fiscales').doc(userRecord.uid);
                await fiscalDocRef.set({
                    escuela_id: escuela_id,
                    dni: dni,
                });

                results.successCount++;

            } catch (error) {
                results.errorCount++;
                let errorMessage = `Error creando usuario para escuela ${escuela_id}: ${error.message}`;
                if (error.code === 'auth/email-already-exists') {
                     errorMessage = `El usuario ${email} ya existe.`;
                }
                results.details.push(errorMessage);
                // Log individual user creation errors
                functions.logger.warn(`Failed to create user for escuela_id ${escuela_id}`, { error: error.message });
            }
        }

        if (results.errorCount > 0) {
            functions.logger.warn("Proceso de carga de CSV completado con errores.", {
                errors: results.details,
                totalErrors: results.errorCount,
                totalSuccess: results.successCount,
            });
        }

        return {
            message: `Proceso completado. ${results.successCount} usuarios creados, ${results.errorCount} errores.`,
            details: results.details,
            errorCount: results.errorCount,
        };
    } catch (error) {
        // Main catch block for unexpected errors.
        functions.logger.error("Error no manejado en createUsersFromCSV", {
            errorMessage: error.message,
            errorCode: error.code,
            errorStack: error.stack,
        });

        // Re-throw a generic error to the client to avoid leaking implementation details.
        if (error instanceof functions.https.HttpsError) {
            throw error; // If it's already a formatted HttpsError, rethrow it.
        }
        throw new functions.https.HttpsError('internal', 'Ocurrió un error inesperado al procesar su solicitud.');
    }
});

// --- CLOUD FUNCTION: importListasFromCSV ---
exports.importListasFromCSV = functions.https.onCall(async (data, context) => {
    const csvData = (data?.csv || '').replace(/^\uFEFF/, '');
    if (csvData.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'No se proporcionaron datos CSV.');
    }

    const parsed = parseCSV(csvData, ['id', 'nombre_lista']);
    const batch = admin.firestore().batch();

    parsed.forEach(row => {
        if (!row.id || !row.nombre_lista) return;
        const ref = admin.firestore().collection('listas').doc(row.id);
        batch.set(ref, { nombre_lista: row.nombre_lista });
    });

    await batch.commit();

    return { message: `${parsed.length} listas importadas.` };
});

// --- CLOUD FUNCTION: importEscuelasFromCSV ---
exports.importEscuelasFromCSV = functions.https.onCall(async (data, context) => {
    const csvData = (data?.csv || '').replace(/^\uFEFF/, '');
    if (csvData.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'No se proporcionaron datos CSV.');
    }

    const parsed = parseCSV(csvData, ['id', 'nombre', 'lat', 'lng', 'mesas']);
    const batch = admin.firestore().batch();

    parsed.forEach(row => {
        if (!row.id) return;
        const ref = admin.firestore().collection('escuelas').doc(row.id);
        batch.set(ref, {
            nombre: row.nombre,
            lat: parseFloat(row.lat),
            lng: parseFloat(row.lng),
            mesas: row.mesas.split(',').map(m => m.trim()).filter(Boolean),
        });
    });

    await batch.commit();

    return { message: `${parsed.length} escuelas importadas.` };
});
