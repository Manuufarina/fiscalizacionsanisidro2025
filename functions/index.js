const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors")({ origin: true });

admin.initializeApp();

// --- CSV PARSER ---
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        throw new Error('El CSV debe tener un encabezado y al menos una fila de datos.');
    }
    const header = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['escuela_id', 'dni'];
    if (!requiredHeaders.every(h => header.includes(h))) {
        throw new Error(`El encabezado del CSV debe contener las columnas: ${requiredHeaders.join(', ')}.`);
    }

    return lines.slice(1).map(line => {
        const values = line.split(',');
        return header.reduce((obj, h, i) => {
            obj[h] = values[i] ? values[i].trim().replace(/"/g, '') : '';
            return obj;
        }, {});
    });
}

// --- CLOUD FUNCTION: createUsersFromCSV (now an onRequest function) ---
exports.createUsersFromCSV = functions.https.onRequest((req, res) => {
    // Wrap the function with CORS
    cors(req, res, async () => {
        // We only accept POST requests
        if (req.method !== 'POST') {
            return res.status(405).send('Method Not Allowed');
        }

        const csvData = req.body.csv;
        if (!csvData) {
            return res.status(400).json({ message: 'No se proporcionaron datos CSV.' });
        }

        let parsedData;
        try {
            parsedData = parseCSV(csvData);
        } catch (error) {
            return res.status(400).json({ message: error.message });
        }

        const results = {
            successCount: 0,
            errorCount: 0,
            details: [], // Renamed from 'errors' to match client expectation
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
            }
        }

        if (results.errorCount > 0) {
            console.error("Errores durante la carga:", results.details);
        }

        // Send the response
        res.status(200).json({
            message: `Proceso completado. ${results.successCount} usuarios creados, ${results.errorCount} errores.`,
            errorCount: results.errorCount,
            details: results.details,
        });
    });
});
