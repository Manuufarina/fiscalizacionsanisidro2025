const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// --- CSV PARSER ---
// A simple parser, not robust for complex CSVs (e.g., with commas in values)
function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
        throw new functions.https.HttpsError('invalid-argument', 'El CSV debe tener un encabezado y al menos una fila de datos.');
    }
    const header = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['escuela_id', 'dni'];
    if (!requiredHeaders.every(h => header.includes(h))) {
        throw new functions.https.HttpsError('invalid-argument', `El encabezado del CSV debe contener las columnas: ${requiredHeaders.join(', ')}.`);
    }

    return lines.slice(1).map(line => {
        const values = line.split(',');
        return header.reduce((obj, h, i) => {
            obj[h] = values[i] ? values[i].trim().replace(/"/g, '') : '';
            return obj;
        }, {});
    });
}


// --- CLOUD FUNCTION: createUsersFromCSV ---
exports.createUsersFromCSV = functions.https.onCall(async (data, context) => {
    // Basic auth check: in a real app, you'd check if the caller is an admin
    // For now, we trust the security rule on the admin page itself.

    const csvData = data.csv;
    if (!csvData) {
        throw new functions.https.HttpsError('invalid-argument', 'No se proporcionaron datos CSV.');
    }

    let parsedData;
    try {
        parsedData = parseCSV(csvData);
    } catch (error) {
        throw error; // Re-throw parsing errors
    }

    const results = {
        successCount: 0,
        errorCount: 0,
        errors: [],
    };

    for (const record of parsedData) {
        const { escuela_id, dni } = record;

        if (!escuela_id || !dni) {
            results.errorCount++;
            results.errors.push(`Registro omitido: falta escuela_id o dni.`);
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
            // If user already exists, try to update Firestore anyway
            if (error.code === 'auth/email-already-exists') {
                 errorMessage = `El usuario ${email} ya existe.`;
                 // Optional: you could try to find the user and update their Firestore doc
            }
            results.errors.push(errorMessage);
        }
    }

    if (results.errorCount > 0) {
        console.error("Errores durante la carga:", results.errors);
    }

    return {
        message: `Proceso completado. ${results.successCount} usuarios creados, ${results.errorCount} errores.`,
        details: results.errors,
    };
});
