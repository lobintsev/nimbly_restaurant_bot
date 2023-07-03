import fs from 'fs/promises';
import { Low } from 'lowdb';

class JSONFile {
  constructor(filename) {
    this.filename = filename;
  }

  async read() {
    // Read file contents
    let data = await fs.readFile(this.filename, 'utf-8');
    // Parse and return data
    return JSON.parse(data);
  }

  async write(data) {
    // Stringify and write data
    await fs.writeFile(this.filename, JSON.stringify(data, null, 2));
  }
}

const defaultData = { users: [], messages: [] };  // Modify this according to your needs
const adapter = new JSONFile('db.json');
const db = new Low(adapter, defaultData);

export async function readData() {
  await db.read();  // Read the data from the file
  return db.data;
}

export async function writeData(data) {
  db.data = data;  // Set the data in the LowDB instance
  await db.write();  // Write the data to the file
}

export default db;