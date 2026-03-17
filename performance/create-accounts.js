const bcrypt = require('bcrypt');

async function run() {
  const hash = await bcrypt.hash('Perf@Test2026', 12);
  console.log(hash);
}
run();
