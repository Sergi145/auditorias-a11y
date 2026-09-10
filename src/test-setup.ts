// IndexedDB no existe en el entorno jsdom de los tests unitarios; Dexie lo
// necesita en cuanto se inyecta DatabaseService (ver src/app/core/database.ts).
import 'fake-indexeddb/auto';
