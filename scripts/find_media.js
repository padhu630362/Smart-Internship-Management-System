import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/LENOVO/.gemini/antigravity/brain/33a14269-b3df-4cb8-9bdf-a4bd34b96a6b/.system_generated/logs/transcript.jsonl')
});

rl.on('line', (line) => {
  if (line.includes('"media"')) {
    try {
      const obj = JSON.parse(line);
      if (obj.media && obj.media.length > 0) {
        console.log(`step ${obj.step_index} (${obj.created_at}):`, JSON.stringify(obj.media));
      }
    } catch (e) {}
  }
});

