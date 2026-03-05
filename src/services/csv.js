const { parse } = require('csv-parse');

function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const records = [];

    const parser = parse({
      trim: true,
      skip_empty_lines: true,
      relax_column_count: true,
    });

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        const phone = record[0]?.trim();
        if (phone && phone.length > 0) {
          records.push(phone);
        }
      }
    });

    parser.on('error', (err) => reject(err));
    parser.on('end', () => resolve(records));

    parser.write(buffer);
    parser.end();
  });
}

module.exports = { parseCSV };
