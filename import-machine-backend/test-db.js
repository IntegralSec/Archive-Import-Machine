const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/import-machine.db');

console.log('Checking database tables...');

db.all('SELECT name FROM sqlite_master WHERE type="table"', (err, rows) => {
  if (err) {
    console.error('Error getting tables:', err);
  } else {
    console.log('Tables found:', rows);
    
    // Check configurations table
    db.all('SELECT * FROM configurations LIMIT 5', (err, configs) => {
      if (err) {
        console.error('Error getting configurations:', err);
      } else {
        console.log('Configurations found:', configs);
      }
      
      // Check users table
      db.all('SELECT id, username, email, role FROM users LIMIT 5', (err, users) => {
        if (err) {
          console.error('Error getting users:', err);
        } else {
          console.log('Users found:', users);
        }
        db.close();
      });
    });
  }
});
